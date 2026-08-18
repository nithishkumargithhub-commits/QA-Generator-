import logging
import httpx
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, delete

from app.models.models import User, GoogleClassroomAssignment, Quiz, Question, QuestionOption
from app.services.ai_generator import ai_generator, AIGeneratorService

logger = logging.getLogger("gcr_service")

class GCRService:
    BASE_URL = "https://classroom.googleapis.com/v1"

    @classmethod
    def is_real_oauth_token(cls, api_key: str) -> bool:
        """Returns True only if the key is a real Google OAuth access token."""
        return api_key.startswith("ya29.") or api_key.startswith("Bearer ")

    @classmethod
    async def verify_and_fetch_courses(cls, api_key: str) -> List[Dict[str, Any]]:
        """
        Validates the user's OAuth Bearer token against Google Classroom REST API.
        Returns empty list if the token is not a real OAuth token or the API call fails.
        No mock/fallback data is ever returned — only real courses from the user's account.
        """
        # Non-OAuth tokens (gmail_login, app_user, etc.) cannot call the Google API
        if not cls.is_real_oauth_token(api_key):
            logger.info(f"Non-OAuth credential provided — skipping Google API call.")
            return []

        headers = {"Authorization": f"Bearer {api_key}" if not api_key.startswith("Bearer ") else api_key}
        url = f"{cls.BASE_URL}/courses?courseStates=ACTIVE"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    courses = data.get("courses", [])
                    logger.info(f"Fetched {len(courses)} real courses from Google Classroom API.")
                    return courses
                else:
                    logger.warning(f"GCR API returned status {resp.status_code}: {resp.text[:200]}")
                    return []
        except Exception as e:
            logger.error(f"Failed to connect to Google Classroom API: {e}")
            return []

    @classmethod
    async def fetch_coursework(cls, api_key: str, course_id: str) -> List[Dict[str, Any]]:
        """
        Fetches real coursework (homework assignments) for a given course ID.
        Returns empty list on failure — no mock data.
        """
        if not cls.is_real_oauth_token(api_key):
            return []

        headers = {"Authorization": f"Bearer {api_key}" if not api_key.startswith("Bearer ") else api_key}
        url = f"{cls.BASE_URL}/courses/{course_id}/courseWork?orderBy=updateTime+desc"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("courseWork", [])
                else:
                    logger.warning(f"Coursework API returned {resp.status_code} for course {course_id}: {resp.text[:200]}")
                    return []
        except Exception as e:
            logger.error(f"Error fetching coursework for course {course_id}: {e}")
            return []

    @classmethod
    async def fetch_student_submissions(cls, api_key: str, course_id: str, coursework_id: str) -> Dict[str, Any]:
        """
        Fetches the student's own submission state for a specific coursework item.
        """
        if not cls.is_real_oauth_token(api_key):
            return {}

        headers = {"Authorization": f"Bearer {api_key}" if not api_key.startswith("Bearer ") else api_key}
        url = f"{cls.BASE_URL}/courses/{course_id}/courseWork/{coursework_id}/studentSubmissions?states=STUDENT_UNSUBMITTED&states=TURNED_IN&states=RETURNED"

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    submissions = resp.json().get("studentSubmissions", [])
                    if submissions:
                        return submissions[0]  # Return the user's own submission
        except Exception as e:
            logger.warning(f"Could not fetch submissions for {coursework_id}: {e}")
        return {}

    @classmethod
    async def fetch_google_user_email(cls, api_key: str) -> Optional[str]:
        """
        Fetches the authenticated user's Gmail address from Google UserInfo API.
        Handles gmail_login: prefix for direct Gmail+Password logins.
        """
        # Handle gmail_login:email:password format from direct Gmail login
        if api_key.startswith("gmail_login:"):
            parts = api_key.split(":", 2)
            if len(parts) >= 2 and parts[1]:
                return parts[1]  # The Gmail address entered by the user
            return None

        # Only real OAuth tokens can fetch user info from Google
        if not cls.is_real_oauth_token(api_key):
            return None

        headers = {"Authorization": f"Bearer {api_key}" if not api_key.startswith("Bearer ") else api_key}
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get("https://www.googleapis.com/oauth2/v3/userinfo", headers=headers)
                if resp.status_code == 200:
                    email = resp.json().get("email")
                    if email:
                        return email
                # Fallback: Try Google Classroom Profile
                resp2 = await client.get(f"{cls.BASE_URL}/userProfiles/me", headers=headers)
                if resp2.status_code == 200:
                    email = resp2.json().get("emailAddress")
                    if email:
                        return email
        except Exception as e:
            logger.warning(f"Could not fetch Google user email: {e}")
        return None

    @classmethod
    async def sync_user_gcr_data(
        cls,
        db: AsyncSession,
        user_id: str,
        api_key: str,
        clear_existing: bool = True
    ) -> List[GoogleClassroomAssignment]:
        """
        Synchronizes user's Google Classroom assignments from the real Google API.
        Always clears existing data first to prevent stale/old account data from showing.
        """
        # Always clear existing assignments to prevent old account data from persisting
        await db.execute(delete(GoogleClassroomAssignment).where(GoogleClassroomAssignment.user_id == user_id))
        await db.commit()

        # Update user's GCR credentials and email first
        user_res = await db.execute(select(User).where(User.id == user_id))
        u = user_res.scalar_one_or_none()
        if u:
            u.gcr_api_key = api_key
            u.gcr_connected_at = datetime.now(timezone.utc)
            user_email = await cls.fetch_google_user_email(api_key)
            u.gcr_user_email = user_email
            await db.commit()

        # Fetch real courses from Google Classroom API
        courses = await cls.verify_and_fetch_courses(api_key)

        if not courses:
            logger.info(f"No courses returned for user {user_id}. Nothing to sync.")
            return []

        synced_assignments = []

        for course in courses[:10]:  # Process up to 10 courses
            c_id = str(course.get("id"))
            c_name = course.get("name", "Google Classroom")
            works = await cls.fetch_coursework(api_key, c_id)

            for w in works:
                w_id = str(w.get("id"))
                title = w.get("title", "Homework Assignment")
                desc = w.get("description", "")
                max_pts = float(w.get("maxPoints", 0.0))
                link = w.get("alternateLink", "https://classroom.google.com")

                # Fetch real submission state for this coursework
                submission = await cls.fetch_student_submissions(api_key, c_id, w_id)
                sub_state = submission.get("state", w.get("submissionState", "ASSIGNED"))

                # Parse Due Date
                due_dt = None
                due_info = w.get("dueDate")
                if due_info and isinstance(due_info, dict):
                    y = due_info.get("year", datetime.now().year)
                    m = due_info.get("month", 1)
                    d = due_info.get("day", 1)
                    t_info = w.get("dueTime", {})
                    h = t_info.get("hours", 23)
                    mi = t_info.get("minutes", 59)
                    try:
                        due_dt = datetime(y, m, d, h, mi, tzinfo=timezone.utc)
                    except ValueError:
                        due_dt = None

                new_item = GoogleClassroomAssignment(
                    user_id=user_id,
                    gcr_course_id=c_id,
                    gcr_coursework_id=w_id,
                    course_name=c_name,
                    title=title,
                    description=desc,
                    due_date=due_dt,
                    max_points=max_pts,
                    submission_state=sub_state,
                    alternate_link=link
                )
                db.add(new_item)
                synced_assignments.append(new_item)

        await db.commit()
        logger.info(f"Synced {len(synced_assignments)} real assignments for user {user_id}")
        return synced_assignments

    @classmethod
    async def generate_quiz_from_assignment(cls, db: AsyncSession, user_id: str, assignment_id: str) -> Quiz:
        """
        Generates an AI practice exam from Google Classroom homework details.
        """
        res = await db.execute(
            select(GoogleClassroomAssignment).where(
                and_(
                    GoogleClassroomAssignment.id == assignment_id,
                    GoogleClassroomAssignment.user_id == user_id
                )
            )
        )
        ass = res.scalar_one_or_none()
        if not ass:
            raise ValueError("Google Classroom assignment not found.")

        content_for_ai = f"Assignment Title: {ass.title}\nCourse: {ass.course_name}\n\nInstructions & Details:\n{ass.description or ass.title}"

        # Generate 5 targeted questions via AI Generator
        raw_questions = await AIGeneratorService.generate_questions(
            text_content=content_for_ai,
            difficulty="Medium",
            question_count=5,
            question_types=["mcq", "true_false", "scenario"]
        )

        # Create Quiz Record
        quiz = Quiz(
            creator_id=user_id,
            title=f"Practice Prep: {ass.title[:60]}",
            description=f"Automated AI preparation quiz generated from Google Classroom homework: {ass.course_name}.",
            difficulty_level="Medium",
            question_count=len(raw_questions),
            time_limit_minutes=15,
            mode="Practice"
        )
        db.add(quiz)
        await db.commit()
        await db.refresh(quiz)

        # Add Questions
        for idx, q_data in enumerate(raw_questions, start=1):
            q_obj = Question(
                quiz_id=quiz.id,
                order_index=idx,
                stem=q_data.get("stem", f"Question {idx}"),
                explanation=q_data.get("explanation", ""),
                difficulty=q_data.get("difficulty", "Medium"),
                question_type=q_data.get("question_type", "mcq"),
                points=float(q_data.get("points", 10.0))
            )
            db.add(q_obj)
            await db.commit()
            await db.refresh(q_obj)

            for opt_data in q_data.get("options", []):
                opt_obj = QuestionOption(
                    question_id=q_obj.id,
                    option_key=opt_data.get("option_key", "A"),
                    option_text=opt_data.get("option_text", ""),
                    is_correct=bool(opt_data.get("is_correct", False))
                )
                db.add(opt_obj)

        await db.commit()
        await db.refresh(quiz)
        return quiz

gcr_service = GCRService()
