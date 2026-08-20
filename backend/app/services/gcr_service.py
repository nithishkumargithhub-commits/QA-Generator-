import logging
import httpx
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, delete

from app.models.models import User, GoogleClassroomAssignment, Quiz, Question, QuestionOption
from app.services.ai_generator import ai_generator, AIGeneratorService

from app.core.config import settings

logger = logging.getLogger("gcr_service")

class GCRService:
    BASE_URL = "https://classroom.googleapis.com/v1"
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

    @classmethod
    def is_real_oauth_token(cls, api_key: str) -> bool:
        """Returns True only if the key is a real Google OAuth access token."""
        return bool(api_key) and (api_key.startswith("ya29.") or api_key.startswith("Bearer "))

    @classmethod
    async def exchange_code_for_tokens(cls, code: str, redirect_uri: str) -> Dict[str, Any]:
        """
        Exchanges Google OAuth authorization code for access_token and refresh_token.
        """
        client_id = (settings.GOOGLE_CLIENT_ID or "").strip()
        client_secret = (settings.GOOGLE_CLIENT_SECRET or "").strip()
        clean_redirect = (redirect_uri or "").strip()

        if not client_id or not client_secret:
            raise ValueError("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not configured in backend environment.")

        payload = {
            "code": code.strip(),
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": clean_redirect,
            "grant_type": "authorization_code"
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(cls.TOKEN_URL, data=payload)
            if resp.status_code == 200:
                return resp.json()
            else:
                logger.error(f"OAuth token exchange failed ({resp.status_code}): {resp.text}")
                raise ValueError(f"Google OAuth token exchange failed: {resp.text}")

    @classmethod
    async def refresh_access_token(cls, refresh_token: str) -> Optional[str]:
        """
        Refreshes access token using Google refresh_token.
        """
        client_id = (settings.GOOGLE_CLIENT_ID or "").strip()
        client_secret = (settings.GOOGLE_CLIENT_SECRET or "").strip()

        if not refresh_token or not client_id or not client_secret:
            return None

        payload = {
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token.strip(),
            "grant_type": "refresh_token"
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(cls.TOKEN_URL, data=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("access_token")
                else:
                    logger.warning(f"Failed to refresh token: {resp.status_code} - {resp.text}")
                    return None
        except Exception as e:
            logger.error(f"Error refreshing Google access token: {e}")
            return None

    @classmethod
    async def verify_and_fetch_courses(cls, api_key: str) -> List[Dict[str, Any]]:
        """
        Fetches all courses (ACTIVE or enrolled) from Google Classroom API.
        """
        if not api_key:
            return []
        headers = {"Authorization": f"Bearer {api_key}" if not api_key.startswith("Bearer ") else api_key}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Query active courses
                resp = await client.get(f"{cls.BASE_URL}/courses?courseStates=ACTIVE", headers=headers)
                if resp.status_code == 200:
                    courses = resp.json().get("courses", [])
                    if courses:
                        return courses
                
                # Fallback: query without courseStates filter
                resp_all = await client.get(f"{cls.BASE_URL}/courses", headers=headers)
                if resp_all.status_code == 200:
                    return resp_all.json().get("courses", [])
                else:
                    logger.warning(f"Failed to fetch courses: {resp_all.status_code} - {resp_all.text}")
                    return []
        except Exception as e:
            logger.error(f"Error fetching Google Classroom courses: {e}")
            return []

    @classmethod
    async def fetch_coursework(cls, api_key: str, course_id: str) -> List[Dict[str, Any]]:
        """
        Fetches coursework items for a given course ID from Google Classroom API.
        """
        if not api_key or not course_id:
            return []
        headers = {"Authorization": f"Bearer {api_key}" if not api_key.startswith("Bearer ") else api_key}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{cls.BASE_URL}/courses/{course_id}/courseWork", headers=headers)
                if resp.status_code == 200:
                    return resp.json().get("courseWork", [])
                else:
                    logger.warning(f"Failed to fetch coursework for course {course_id}: {resp.status_code}")
                    return []
        except Exception as e:
            logger.error(f"Error fetching coursework for course {course_id}: {e}")
            return []

    @classmethod
    async def fetch_student_submissions(cls, api_key: str, course_id: str, coursework_id: str) -> Dict[str, Any]:
        """
        Fetches student submission state for a given coursework from Google Classroom API.
        """
        if not api_key or not course_id or not coursework_id:
            return {}
        headers = {"Authorization": f"Bearer {api_key}" if not api_key.startswith("Bearer ") else api_key}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{cls.BASE_URL}/courses/{course_id}/courseWork/{coursework_id}/studentSubmissions",
                    headers=headers
                )
                if resp.status_code == 200:
                    subs = resp.json().get("studentSubmissions", [])
                    return subs[0] if subs else {}
                return {}
        except Exception as e:
            logger.error(f"Error fetching student submission: {e}")
            return {}

    @classmethod
    async def fetch_google_user_profile(cls, api_key: str) -> Dict[str, Optional[str]]:
        """
        Fetches the authenticated user's email and stable Google 'sub' ID.
        """
        if not cls.is_real_oauth_token(api_key):
            return {"email": None, "sub": None}

        headers = {"Authorization": f"Bearer {api_key}" if not api_key.startswith("Bearer ") else api_key}
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(cls.USERINFO_URL, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    return {
                        "email": data.get("email"),
                        "sub": data.get("sub")
                    }
                resp2 = await client.get(f"{cls.BASE_URL}/userProfiles/me", headers=headers)
                if resp2.status_code == 200:
                    data2 = resp2.json()
                    return {
                        "email": data2.get("emailAddress"),
                        "sub": data2.get("id")
                    }
        except Exception as e:
            logger.warning(f"Could not fetch Google user profile: {e}")
        return {"email": None, "sub": None}

    @classmethod
    async def fetch_google_user_email(cls, api_key: str) -> Optional[str]:
        profile = await cls.fetch_google_user_profile(api_key)
        return profile.get("email")

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

        # Fetch user details
        user_res = await db.execute(select(User).where(User.id == user_id))
        u = user_res.scalar_one_or_none()

        active_key = api_key
        if u and getattr(u, "gcr_refresh_token", None):
            # Test key or attempt refresh if needed
            test_courses = await cls.verify_and_fetch_courses(active_key)
            if not test_courses:
                new_access_token = await cls.refresh_access_token(u.gcr_refresh_token)
                if new_access_token:
                    logger.info(f"Refreshed expired Google access token for user {user_id}")
                    active_key = new_access_token
                    u.gcr_api_key = new_access_token
                    await db.commit()

        if u:
            u.gcr_api_key = active_key
            u.gcr_connected_at = datetime.now(timezone.utc)
            profile = await cls.fetch_google_user_profile(active_key)
            if profile.get("email"):
                u.gcr_user_email = profile.get("email")
            if profile.get("sub"):
                u.gcr_sub_id = profile.get("sub")
            await db.commit()

        # Fetch real courses from Google Classroom API
        courses = await cls.verify_and_fetch_courses(active_key)

        if not courses:
            logger.info(f"No courses returned for user {user_id}. Nothing to sync.")
            return []

        synced_assignments = []

        for course in courses[:15]:  # Process up to 15 courses
            c_id = str(course.get("id"))
            c_name = course.get("name", "Google Classroom")
            c_link = course.get("alternateLink", f"https://classroom.google.com/c/{c_id}")
            works = await cls.fetch_coursework(active_key, c_id)

            if not works:
                # Add course entry so the course itself is listed and practice quizzes can be generated
                new_course_item = GoogleClassroomAssignment(
                    user_id=user_id,
                    gcr_course_id=c_id,
                    gcr_coursework_id=f"course-{c_id}",
                    course_name=c_name,
                    title=f"Course: {c_name}",
                    description=course.get("description", course.get("section", "Active Google Classroom course")),
                    due_date=None,
                    max_points=100.0,
                    submission_state="ACTIVE",
                    alternate_link=c_link
                )
                db.add(new_course_item)
                synced_assignments.append(new_course_item)
            else:
                for w in works:
                    w_id = str(w.get("id"))
                    title = w.get("title", "Homework Assignment")
                    desc = w.get("description", "")
                    max_pts = float(w.get("maxPoints", 100.0))
                    link = w.get("alternateLink", c_link)

                    # Fetch real submission state for this coursework
                    submission = await cls.fetch_student_submissions(active_key, c_id, w_id)
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
