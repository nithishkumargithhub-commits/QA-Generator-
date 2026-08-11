import logging
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import UploadedFile
from app.services.ai_generator import ai_generator

logger = logging.getLogger("rag_tutor_service")

class RAGTutorService:
    async def answer_question(
        self,
        db: AsyncSession,
        user_query: str,
        document_id: Optional[str] = None,
        question_stem: Optional[str] = None,
        selected_option: Optional[str] = None,
    ) -> Dict[str, Any]:
        document_text = ""
        source_section = None

        if document_id:
            res = await db.execute(select(UploadedFile).where(UploadedFile.id == document_id))
            doc = res.scalar_one_or_none()
            if doc and doc.extracted_text:
                document_text = doc.extracted_text[:4000] # Use top text chunk as context
                source_section = f"Source Document: {doc.filename}"

        # Construct prompt for AI Tutor
        prompt_parts = ["You are an expert AI Study Assistant and Tutor."]
        if document_text:
            prompt_parts.append(f"DOCUMENT CONTEXT:\n{document_text}\n---")
        if question_stem:
            prompt_parts.append(f"QUESTION IN FOCUS:\n{question_stem}")
        if selected_option:
            prompt_parts.append(f"SELECTED OPTION / CHOICE:\n{selected_option}")

        prompt_parts.append(f"USER QUERY:\n{user_query}")
        prompt_parts.append(
            "Instructions: Provide a clear, encouraging, and detailed response. "
            "Use markdown formatting with bullet points, bold key terms, and line breaks for readability. "
            "If asking for a step-by-step explanation, break down the logic systematically. "
            "If asking why an option is right/wrong, clearly contrast the core concepts."
        )

        full_prompt = "\n\n".join(prompt_parts)

        # Call AI generator or fallback
        if ai_generator.is_api_available():
            try:
                answer = await ai_generator._call_llm_api(full_prompt)
                return {
                    "answer": answer,
                    "context_used": document_text[:300] + "..." if document_text else None,
                    "source_section": source_section
                }
            except Exception as e:
                logger.error(f"Error calling LLM API in RAG Tutor: {e}")

        # Intelligent Heuristic Fallback Answer
        heuristic_answer = self._generate_heuristic_answer(user_query, question_stem, selected_option)
        return {
            "answer": heuristic_answer,
            "context_used": document_text[:300] + "..." if document_text else None,
            "source_section": source_section
        }

    def _generate_heuristic_answer(
        self,
        user_query: str,
        question_stem: Optional[str],
        selected_option: Optional[str]
    ) -> str:
        q_lower = user_query.lower()
        if "analogy" in q_lower:
            return (
                "### 💡 Real-World Analogy\n\n"
                "Think of this concept like an **assembly line in a factory**:\n"
                "- Each step must process input correctly before passing it downstream.\n"
                "- If one component fails or receives invalid input, the output becomes corrupted.\n\n"
                "In this question, understanding how key components interact prevents unexpected errors!"
            )
        elif "why" in q_lower or "wrong" in q_lower or "incorrect" in q_lower:
            return (
                "### 🔍 Choice Breakdown & Analysis\n\n"
                "Here is why the option logic works this way:\n\n"
                "1. **Core Concept Match:** The correct answer directly addresses the fundamental requirement stated in the question stem.\n"
                "2. **Distractor Identification:** Plausible-sounding choices often use correct terminology out of context or over-generalize conditions.\n"
                "3. **Elimination Strategy:** Always verify if the choice satisfies ALL criteria mentioned in the problem, rather than just part of it."
            )
        else:
            return (
                f"### 📘 Tutor Explanation\n\n"
                f"Regarding your query: *\"{user_query}\"*\n\n"
                "Here is the step-by-step breakdown:\n"
                "1. **Identify the Core Principle:** Locate the primary rule or definition involved.\n"
                "2. **Analyze the Context:** Review how variables or conditions interact in this specific scenario.\n"
                "3. **Synthesize the Conclusion:** Combine the principle with the context to reach the logically sound outcome."
            )

rag_tutor_service = RAGTutorService()
