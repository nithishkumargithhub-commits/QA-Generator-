import xml.etree.ElementTree as ET
from xml.dom import minidom
import csv
import io
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import Quiz, Question

class ExportService:
    async def export_moodle_xml(self, db: AsyncSession, quiz_id: str) -> str:
        res = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
        quiz = res.scalar_one_or_none()
        if not quiz:
            raise ValueError("Quiz not found.")

        quiz_element = ET.Element("quiz")

        for q in quiz.questions:
            question_el = ET.SubElement(quiz_element, "question", type="multichoice")
            name_el = ET.SubElement(question_el, "name")
            text_el = ET.SubElement(name_el, "text")
            text_el.text = q.stem[:50]

            qtext_el = ET.SubElement(question_el, "questiontext", format="html")
            qtext_content = ET.SubElement(qtext_el, "text")
            qtext_content.text = f"<p>{q.stem}</p>"

            exp_el = ET.SubElement(question_el, "generalfeedback", format="html")
            exp_text = ET.SubElement(exp_el, "text")
            exp_text.text = f"<p>{q.explanation or ''}</p>"

            for opt in q.options:
                fraction = "100" if opt.is_correct else "0"
                ans_el = ET.SubElement(question_el, "answer", fraction=fraction, format="html")
                ans_text = ET.SubElement(ans_el, "text")
                ans_text.text = opt.option_text

        xml_str = minidom.parseString(ET.tostring(quiz_element)).toprettyxml(indent="  ")
        return xml_str

    async def export_csv(self, db: AsyncSession, quiz_id: str) -> str:
        res = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
        quiz = res.scalar_one_or_none()
        if not quiz:
            raise ValueError("Quiz not found.")

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Question Stem", "Question Type", "Difficulty", "Option A", "Option B", "Option C", "Option D", "Correct Option", "Explanation"])

        for q in quiz.questions:
            options_dict = {opt.option_key: opt.option_text for opt in q.options}
            correct_keys = [opt.option_key for opt in q.options if opt.is_correct]
            correct_str = ",".join(correct_keys)

            writer.writerow([
                q.stem,
                q.question_type,
                q.difficulty,
                options_dict.get("A", ""),
                options_dict.get("B", ""),
                options_dict.get("C", ""),
                options_dict.get("D", ""),
                correct_str,
                q.explanation or ""
            ])

        return output.getvalue()

    async def export_qti_xml(self, db: AsyncSession, quiz_id: str) -> str:
        res = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
        quiz = res.scalar_one_or_none()
        if not quiz:
            raise ValueError("Quiz not found.")

        assessment = ET.Element("assessmentItem", {
            "xmlns": "http://www.imsglobal.org/xsd/imsqti_v2p1",
            "title": quiz.title,
            "identifier": quiz.id
        })

        for q in quiz.questions:
            item = ET.SubElement(assessment, "item", identifier=q.id, title=q.stem[:30])
            body = ET.SubElement(item, "itemBody")
            p = ET.SubElement(body, "p")
            p.text = q.stem

            choice_interaction = ET.SubElement(body, "choiceInteraction", responseIdentifier="RESPONSE", shuffle="true")
            for opt in q.options:
                simple_choice = ET.SubElement(choice_interaction, "simpleChoice", identifier=opt.option_key)
                simple_choice.text = opt.option_text

        xml_str = minidom.parseString(ET.tostring(assessment)).toprettyxml(indent="  ")
        return xml_str

    async def generate_pdf_exam(self, db: AsyncSession, quiz_id: str) -> bytes:
        res = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
        quiz = res.scalar_one_or_none()
        if not quiz:
            raise ValueError("Quiz not found.")

        # Try to use ReportLab if available, or generate clean HTML-printable buffer
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib import colors

            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
            styles = getSampleStyleSheet()
            story = []

            title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], fontSize=18, textColor=colors.HexColor('#1E293B'))
            story.append(Paragraph(f"EXAM PAPER: {quiz.title}", title_style))
            story.append(Paragraph(f"Time Limit: {quiz.time_limit_minutes} mins | Total Marks: {quiz.total_marks} | Passing: {quiz.passing_score}%", styles['Normal']))
            story.append(Spacer(1, 12))
            story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1')))
            story.append(Spacer(1, 12))

            for idx, q in enumerate(quiz.questions, 1):
                q_text = f"<b>Q{idx}. {q.stem}</b> ({q.points} pts)"
                story.append(Paragraph(q_text, styles['Normal']))
                story.append(Spacer(1, 6))

                for opt in q.options:
                    opt_text = f"&nbsp;&nbsp;&nbsp;&nbsp;[{opt.option_key}] {opt.option_text}"
                    story.append(Paragraph(opt_text, styles['Normal']))

                story.append(Spacer(1, 10))

            # Add Answer Key Section
            story.append(Spacer(1, 20))
            story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#2563EB')))
            story.append(Spacer(1, 10))
            story.append(Paragraph("<b>--- ANSWER KEY & EXPLANATIONS ---</b>", styles['Heading2']))
            story.append(Spacer(1, 10))

            for idx, q in enumerate(quiz.questions, 1):
                correct_opt = ", ".join([o.option_key for o in q.options if o.is_correct])
                ans_text = f"<b>Q{idx}:</b> Correct Answer: <b>{correct_opt}</b><br/><i>Explanation:</i> {q.explanation or 'N/A'}"
                story.append(Paragraph(ans_text, styles['Normal']))
                story.append(Spacer(1, 6))

            doc.build(story)
            pdf_bytes = buffer.getvalue()
            buffer.close()
            return pdf_bytes
        except ImportError:
            # Simple text/HTML fallback buffer if ReportLab is missing
            html_content = f"<html><body><h1>EXAM PAPER: {quiz.title}</h1><hr/>"
            for idx, q in enumerate(quiz.questions, 1):
                html_content += f"<p><b>Q{idx}. {q.stem}</b></p><ul>"
                for opt in q.options:
                    html_content += f"<li>[{opt.option_key}] {opt.option_text}</li>"
                html_content += "</ul>"
            html_content += "</body></html>"
            return html_content.encode('utf-8')

export_service = ExportService()
