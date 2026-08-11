import io
import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.models import Certificate, QuizSession, Quiz, User

class CertificateService:
    async def get_or_create_certificate(
        self,
        db: AsyncSession,
        user_id: str,
        session_id: str
    ) -> Certificate:
        # Check existing certificate
        res = await db.execute(
            select(Certificate).where(and_(Certificate.user_id == user_id, Certificate.session_id == session_id))
        )
        existing = res.scalar_one_or_none()
        if existing:
            return existing

        # Check session
        session_res = await db.execute(
            select(QuizSession).where(and_(QuizSession.id == session_id, QuizSession.user_id == user_id))
        )
        session = session_res.scalar_one_or_none()
        if not session or session.percentage < 70.0:
            raise ValueError("Certificate eligible only for completed passing quiz sessions (score >= 70%).")

        code = f"CERT-{uuid.uuid4().hex[:8].upper()}"
        cert = Certificate(
            user_id=user_id,
            quiz_id=session.quiz_id,
            session_id=session.id,
            certificate_code=code,
            score_percentage=session.percentage,
            issued_at=datetime.now(timezone.utc)
        )
        db.add(cert)
        await db.commit()
        await db.refresh(cert)
        return cert

    async def generate_certificate_pdf(self, db: AsyncSession, certificate_code: str) -> bytes:
        res = await db.execute(select(Certificate).where(Certificate.certificate_code == certificate_code))
        cert = res.scalar_one_or_none()
        if not cert:
            raise ValueError("Certificate code invalid or not found.")

        user_res = await db.execute(select(User).where(User.id == cert.user_id))
        user = user_res.scalar_one_or_none()

        quiz_res = await db.execute(select(Quiz).where(Quiz.id == cert.quiz_id))
        quiz = quiz_res.scalar_one_or_none()

        recipient = user.full_name or user.username if user else "Valued Learner"
        quiz_title = quiz.title if quiz else "Assessment Examination"

        try:
            from reportlab.lib.pagesizes import letter, landscape
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib import colors

            buffer = io.BytesIO()
            doc = SimpleDocTemplate(
                buffer, pagesize=landscape(letter),
                rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
            )
            styles = getSampleStyleSheet()
            story = []

            title_style = ParagraphStyle(
                'CertTitle', parent=styles['Heading1'],
                fontSize=28, textColor=colors.HexColor('#1E3A8A'),
                alignment=1, spaceAfter=20
            )
            sub_style = ParagraphStyle(
                'CertSub', parent=styles['Normal'],
                fontSize=14, textColor=colors.HexColor('#475569'),
                alignment=1, spaceAfter=15
            )
            name_style = ParagraphStyle(
                'CertName', parent=styles['Heading1'],
                fontSize=24, textColor=colors.HexColor('#0F172A'),
                alignment=1, spaceAfter=15
            )

            story.append(Spacer(1, 20))
            story.append(Paragraph("🏆 CERTIFICATE OF ACHIEVEMENT 🏆", title_style))
            story.append(Paragraph("This is proudly presented to", sub_style))
            story.append(Paragraph(f"<u><b>{recipient}</b></u>", name_style))
            story.append(Paragraph(f"For successfully passing the assessment: <b>{quiz_title}</b>", sub_style))
            story.append(Paragraph(f"Achieving a score of <b>{cert.score_percentage:.1f}%</b> on {cert.issued_at.strftime('%B %d, %Y')}", sub_style))

            story.append(Spacer(1, 25))
            code_text = f"Verification Code: <b>{cert.certificate_code}</b>"
            story.append(Paragraph(code_text, ParagraphStyle('Code', parent=styles['Normal'], alignment=1, fontSize=11, textColor=colors.HexColor('#2563EB'))))

            doc.build(story)
            pdf_bytes = buffer.getvalue()
            buffer.close()
            return pdf_bytes
        except ImportError:
            html = f"<h1>CERTIFICATE OF ACHIEVEMENT</h1><h2>Presented to {recipient}</h2><p>Score: {cert.score_percentage:.1f}%</p><p>Code: {cert.certificate_code}</p>"
            return html.encode('utf-8')

certificate_service = CertificateService()
