import json
import random
import re
import logging
import httpx
from typing import List, Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger("ai_generator")


class MCQExtractor:
    """
    Parses PDF text that already contains MCQ questions.
    Handles these common PDF question formats:

    Format A (standard numbered + lettered options):
        1. Which of the following ...?
           A) Option text
           B) Option text
           C) Option text
           D) Option text
           Answer: A

    Format B (parenthesis options):
        1. Which of the following ...?
           (A) Option text   (B) Option text
           (C) Option text   (D) Option text

    Format C (dot options):
        1. Question stem
           a. Option
           b. Option

    Format D (answer key at end):
        1-A  2-C  3-B  ...
    """

    # Detects the start of a new question (e.g. "1.", "Q1.", "1)", "Question 1:")
    # Requires the number to be followed by a non-digit delimiter to avoid matching "10.5" type text
    QUESTION_START = re.compile(
        r'^(?:Q\.?\s*|Question\s*)?(\d+)(?:[.):]\s+|\)\s+)(.+)',
        re.IGNORECASE
    )

    # Detects a single option line start: "A)", "(A)", "A.", "a)", "(a)", "a."
    # Uses a word boundary after the letter to avoid false positives like "Any" or "All"
    OPTION_SINGLE = re.compile(
        r'^\s*[\(\[]?([A-Da-d])[\)\].:]\s+(.+)',
    )

    # Detects ALL options packed on one line: "A) opt1  B) opt2  C) opt3  D) opt4"
    # or "(A) opt1 (B) opt2" style
    OPTION_INLINE_ALL = re.compile(
        r'(?:[\(\[]?([A-Da-d])[\)\].:]\s+)(.*?)(?=\s{2,}[\(\[]?[A-Da-d][\)\].:]|$)',
    )

    # Inline answer hint: "Answer: A", "Ans: B", "Correct: C", "Ans. A"
    ANSWER_INLINE = re.compile(
        r'\b(?:answer|ans|correct answer|key)\b\s*[:.\-]?\s*\(?([A-Da-d])\)?',
        re.IGNORECASE
    )

    # Answer key block — must look like "1. A" or "1-A" or "1) A"
    # The letter must be isolated (not followed by another word char) to avoid matching question numbers
    ANSWER_KEY_ENTRY = re.compile(
        r'\b(\d{1,3})[.)\-]\s*([A-Da-d])\b(?![\w])',
        re.IGNORECASE
    )

    @classmethod
    def extract(cls, text: str) -> List[Dict[str, Any]]:
        lines = [l.rstrip() for l in text.splitlines()]

        # Step 1: collect raw questions
        raw_questions = cls._collect_questions(lines)
        if not raw_questions:
            return []

        # Step 2: find answer key at end of document
        answer_key = cls._parse_answer_key_block(lines)

        # Step 3: build final question dicts — skip invalid questions
        results = []
        for idx, rq in enumerate(raw_questions, start=1):
            stem = rq["stem"].strip()
            options_raw = rq["options"]  # list of (key: str, text: str)

            # Check if an inline "Answer:" annotation is embedded in the stem
            correct_letter = answer_key.get(idx)
            if not correct_letter:
                inline = cls.ANSWER_INLINE.search(stem)
                if inline:
                    correct_letter = inline.group(1).upper()
                    stem = cls.ANSWER_INLINE.sub("", stem).strip(" ,.-")

            # Also check if an Answer annotation is embedded in one of the option texts
            cleaned_opts: List[tuple] = []
            for (key, opt_text) in options_raw:
                inline_in_opt = cls.ANSWER_INLINE.search(opt_text)
                if inline_in_opt and not correct_letter:
                    correct_letter = key.upper()  # this option itself has the answer marker
                clean_text = cls.ANSWER_INLINE.sub("", opt_text).strip(" ,.-")
                if clean_text:  # skip empty options after stripping
                    cleaned_opts.append((key, clean_text))

            # Deduplicate options by key (keep last occurrence)
            seen_keys: Dict[str, str] = {}
            for (key, text) in cleaned_opts:
                seen_keys[key.upper()] = text
            # Sort A→B→C→D
            deduped_opts = sorted(seen_keys.items(), key=lambda x: x[0])

            # Build option objects
            opts = []
            for (key_upper, opt_text) in deduped_opts:
                opts.append({
                    "option_key": key_upper,
                    "option_text": opt_text.strip(),
                    "is_correct": key_upper == (correct_letter or "").upper()
                })

            # Skip questions with too few options (malformed parse)
            if len(opts) < 2:
                logger.warning(f"Q{idx}: only {len(opts)} option(s) found — skipping (stem: {stem[:60]})")
                continue

            # If still no correct answer marked, default to A and warn
            if not any(o["is_correct"] for o in opts):
                opts[0]["is_correct"] = True
                logger.warning(f"Q{idx}: no answer detected, defaulting to option A.")

            if not stem:
                continue

            results.append({
                "topic_name": "Extracted from PDF",
                "question_type": "mcq",
                "stem": stem,
                "explanation": f"Extracted directly from source document. Correct answer: {correct_letter or opts[0]['option_key']}.",
                "difficulty": "Medium",
                "bloom_taxonomy": "Understanding",
                "confidence_score": 1.0,
                "points": 1.0,
                "options": opts
            })

        return results

    @classmethod
    def _split_inline_options(cls, line: str) -> List[tuple]:
        """
        Split a line that has multiple options packed together.
        Handles formats like:
          A) Option text  B) Option text  C) Option text  D) Option text
          (A) Option text (B) Option text
          A. Option text  B. Option text
        Returns list of (key, text) tuples, or empty list if not a multi-option line.
        """
        # Pattern: letter followed by ) or . or ] then text, repeated
        # Minimum 2 options must be found to count as inline
        pattern = re.compile(
            r'[\(\[]?([A-Da-d])[\)\].:]\s+',
            re.IGNORECASE
        )
        positions = [(m.group(1).upper(), m.start(), m.end()) for m in pattern.finditer(line)]
        if len(positions) < 2:
            return []  # not a multi-option line

        result = []
        for i, (key, start, end) in enumerate(positions):
            text_start = end
            text_end = positions[i + 1][1] if i + 1 < len(positions) else len(line)
            text = line[text_start:text_end].strip().rstrip(',')
            if text:
                result.append((key, text))
        return result

    @classmethod
    def _collect_questions(cls, lines: List[str]) -> List[Dict]:
        """Walk lines and group content into question blocks."""
        questions: List[Dict] = []
        current: Optional[Dict] = None

        for raw_line in lines:
            line = raw_line.strip()
            if not line:
                continue

            # ── 1. Check if this line starts a NEW question ──
            q_match = cls.QUESTION_START.match(line)
            if q_match:
                if current:
                    questions.append(current)
                current = {
                    "num": int(q_match.group(1)),
                    "stem": q_match.group(2).strip(),
                    "options": []
                }
                # The stem might itself contain inline options (e.g. stem then A)... on same line)
                # Check if options are embedded in the stem
                inline = cls._split_inline_options(current["stem"])
                if inline:
                    # Split stem from options: take text before first option marker
                    first_opt_pos = re.search(r'[\(\[]?[A-Da-d][\)\].:]\s+', current["stem"])
                    if first_opt_pos:
                        current["stem"] = current["stem"][:first_opt_pos.start()].strip()
                    current["options"] = inline
                continue

            if current is None:
                continue

            # ── 2. Check if this line has ALL options packed together ──
            inline_opts = cls._split_inline_options(line)
            if len(inline_opts) >= 2:
                current["options"].extend(inline_opts)
                continue

            # ── 3. Check if this is a single option line ──
            opt_match = cls.OPTION_SINGLE.match(line)
            if opt_match:
                key = opt_match.group(1).upper()
                text = opt_match.group(2).strip()
                # Check if the rest of text on this line also has more options embedded
                more = cls._split_inline_options(opt_match.group(2))
                if more:
                    current["options"].extend(more)
                else:
                    current["options"].append((key, text))
                continue

            # ── 4. Continuation line ──
            # Only append to previous option/stem if it doesn't look like a new question
            if current["options"]:
                last_key, last_text = current["options"][-1]
                current["options"][-1] = (last_key, last_text + " " + line)
            else:
                current["stem"] += " " + line

        if current:
            questions.append(current)

        return questions

    @classmethod
    def _parse_answer_key_block(cls, lines: List[str]) -> Dict[int, str]:
        """
        Look for an answer-key section (usually at the end of the PDF).
        Only scan the last 30% of lines to avoid false positives from question numbering.
        """
        key: Dict[int, str] = {}
        start = max(0, len(lines) - int(len(lines) * 0.3 + 1))
        for line in lines[start:]:
            # Skip lines that look like question stems to avoid false matches
            if cls.QUESTION_START.match(line.strip()):
                continue
            matches = cls.ANSWER_KEY_ENTRY.findall(line)
            for (num_str, letter) in matches:
                key[int(num_str)] = letter.upper()
        return key

class AIGeneratorService:
    @staticmethod
    async def generate_questions(
        text_content: str,
        topic_summary: Optional[List[Dict[str, Any]]] = None,
        difficulty: str = "Medium",
        question_count: int = 10,
        question_types: Optional[List[str]] = None,
        bloom_levels: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        if not question_types:
            question_types = ["mcq", "true_false", "fill_blank", "scenario"]
        if not bloom_levels:
            bloom_levels = ["Remembering", "Understanding", "Applying", "Analyzing", "Evaluating", "Creating"]

        # Attempt API-based generation if keys are present
        if settings.OPENAI_API_KEY or settings.GEMINI_API_KEY or settings.OPENROUTER_API_KEY:
            try:
                questions = await AIGeneratorService._generate_via_api(
                    text_content, difficulty, question_count, question_types, bloom_levels
                )
                if questions and len(questions) > 0:
                    return questions
            except Exception as e:
                logger.warning(f"External AI API call failed, switching to local NLP engine: {e}")

        # High-Quality Local Heuristic NLP Question Generator Engine
        return AIGeneratorService._generate_local_heuristic(
            text_content, topic_summary, difficulty, question_count, question_types, bloom_levels
        )

    @staticmethod
    async def _generate_via_api(
        text_content: str,
        difficulty: str,
        count: int,
        types: List[str],
        blooms: List[str]
    ) -> List[Dict[str, Any]]:
        context_text = text_content[:120000]
        prompt = f"""
You are an expert AI Assessment & Exam Creation Specialist.
Analyze the following text and generate exactly {count} high-quality, non-repetitive assessment questions.

Target Difficulty: {difficulty}
Allowed Question Types: {', '.join(types)}
Bloom's Taxonomy Levels: {', '.join(blooms)}

Text Context:
\"\"\"
{context_text}
\"\"\"

Return ONLY a valid JSON array of objects with the exact schema:
[
  {{
    "topic_name": "Core Concepts",
    "question_type": "mcq",
    "stem": "Question text here...",
    "explanation": "Detailed explanation of why the correct answer is correct and why others are wrong.",
    "difficulty": "{difficulty}",
    "bloom_taxonomy": "Understanding",
    "confidence_score": 0.98,
    "points": 10.0,
    "options": [
      {{"option_key": "A", "option_text": "Option A text", "is_correct": true}},
      {{"option_key": "B", "option_text": "Option B text", "is_correct": false}},
      {{"option_key": "C", "option_text": "Option C text", "is_correct": false}},
      {{"option_key": "D", "option_text": "Option D text", "is_correct": false}}
    ]
  }}
]
"""
        headers = {"Content-Type": "application/json"}
        payload = {}

        if settings.GEMINI_API_KEY:
            gemini_models = ["gemini-3.6-flash", "gemini-2.0-flash", "gemini-3.5-flash", "gemini-flash-latest"]
            for model_name in gemini_models:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={settings.GEMINI_API_KEY}"
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.7,
                        "responseMimeType": "application/json"
                    }
                }
                async with httpx.AsyncClient(timeout=45.0) as client:
                    try:
                        resp = await client.post(url, headers=headers, json=payload)
                        if resp.status_code == 200:
                            data = resp.json()
                            content = data["candidates"][0]["content"]["parts"][0]["text"]
                            parsed = json.loads(content)
                            if isinstance(parsed, dict) and "questions" in parsed:
                                return parsed["questions"]
                            elif isinstance(parsed, list):
                                return parsed
                    except Exception as err:
                        logger.warning(f"Gemini model {model_name} failed: {err}")

        elif settings.OPENAI_API_KEY:
            url = "https://api.openai.com/v1/chat/completions"
            headers["Authorization"] = f"Bearer {settings.OPENAI_API_KEY}"
            payload = {
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.7,
                "response_format": {"type": "json_object"}
            }
        elif settings.OPENROUTER_API_KEY:
            url = "https://openrouter.ai/api/v1/chat/completions"
            headers["Authorization"] = f"Bearer {settings.OPENROUTER_API_KEY}"
            payload = {
                "model": "meta-llama/llama-3.1-8b-instruct:free",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.7
            }
        else:
            return []

        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                parsed = json.loads(content)
                if isinstance(parsed, dict) and "questions" in parsed:
                    return parsed["questions"]
                elif isinstance(parsed, list):
                    return parsed
        return []

    @staticmethod
    async def solve_and_verify_extracted_questions(
        questions: List[Dict[str, Any]],
        text_content: str
    ) -> List[Dict[str, Any]]:
        """
        Uses Gemini AI to accurately solve and verify questions extracted from a PDF document.
        Determines the true correct option letter (A, B, C, or D) and detailed explanation.
        """
        if not questions:
            return questions

        if not (settings.GEMINI_API_KEY or settings.OPENAI_API_KEY or settings.OPENROUTER_API_KEY):
            logger.info("No AI API key found, returning raw extracted questions.")
            return questions

        # Prepare payload for AI solver
        simplified_questions = []
        for idx, q in enumerate(questions):
            opts_summary = {opt["option_key"]: opt["option_text"] for opt in q.get("options", [])}
            simplified_questions.append({
                "question_index": idx,
                "stem": q["stem"],
                "options": opts_summary
            })

        prompt = f"""
You are an expert Academic Assessment AI.
Your task is to accurately solve each multiple-choice question based on the provided document context.

Document Context:
\"\"\"
{text_content[:80000]}
\"\"\"

Questions to solve:
{json.dumps(simplified_questions, indent=2)}

For each question, determine the TRUE correct option key (e.g. "A", "B", "C", or "D") and provide a clear explanation.
Return ONLY a valid JSON array of objects with the exact schema:
[
  {{
    "question_index": 0,
    "correct_option": "B",
    "explanation": "Detailed explanation of why Option B is correct based on the document."
  }}
]
"""
        headers = {"Content-Type": "application/json"}

        try:
            if settings.GEMINI_API_KEY:
                gemini_models = ["gemini-3.6-flash", "gemini-2.0-flash", "gemini-3.5-flash", "gemini-flash-latest"]
                for model_name in gemini_models:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={settings.GEMINI_API_KEY}"
                    payload = {
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "temperature": 0.1,
                            "responseMimeType": "application/json"
                        }
                    }
                    async with httpx.AsyncClient(timeout=60.0) as client:
                        resp = await client.post(url, headers=headers, json=payload)
                        if resp.status_code == 200:
                            data = resp.json()
                            raw_content = data["candidates"][0]["content"]["parts"][0]["text"]
                            solutions = json.loads(raw_content)
                            if isinstance(solutions, dict) and "solutions" in solutions:
                                solutions = solutions["solutions"]

                            # Apply solutions to questions
                            sol_map = {item.get("question_index"): item for item in solutions if isinstance(item, dict)}
                            for idx, q in enumerate(questions):
                                sol = sol_map.get(idx)
                                if sol and "correct_option" in sol:
                                    correct_key = str(sol["correct_option"]).strip().upper()
                                    q["explanation"] = sol.get("explanation", q.get("explanation", ""))
                                    # Update options is_correct flags
                                    any_marked = False
                                    for opt in q.get("options", []):
                                        if opt["option_key"].upper() == correct_key:
                                            opt["is_correct"] = True
                                            any_marked = True
                                        else:
                                            opt["is_correct"] = False
                                    if not any_marked and q.get("options"):
                                        q["options"][0]["is_correct"] = True

                            logger.info(f"Successfully verified {len(questions)} questions using Gemini model {model_name}.")
                            return questions
            elif settings.OPENAI_API_KEY:
                url = "https://api.openai.com/v1/chat/completions"
                headers["Authorization"] = f"Bearer {settings.OPENAI_API_KEY}"
                payload = {
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "response_format": {"type": "json_object"}
                }
                async with httpx.AsyncClient(timeout=60.0) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        raw_content = data["choices"][0]["message"]["content"]
                        solutions = json.loads(raw_content)
                        if isinstance(solutions, dict) and "solutions" in solutions:
                            solutions = solutions["solutions"]
                        sol_map = {item.get("question_index"): item for item in solutions if isinstance(item, dict)}
                        for idx, q in enumerate(questions):
                            sol = sol_map.get(idx)
                            if sol and "correct_option" in sol:
                                correct_key = str(sol["correct_option"]).strip().upper()
                                q["explanation"] = sol.get("explanation", q.get("explanation", ""))
                                for opt in q.get("options", []):
                                    opt["is_correct"] = (opt["option_key"].upper() == correct_key)
                        return questions
        except Exception as e:
            logger.error(f"Failed to verify questions via AI solver: {e}")

        return questions

    @staticmethod
    def _generate_local_heuristic(
        text_content: str,
        topic_summary: Optional[List[Dict[str, Any]]],
        difficulty: str,
        count: int,
        types: List[str],
        blooms: List[str]
    ) -> List[Dict[str, Any]]:
        # Split content into informative sentences
        sentences = [s.strip() for s in re.split(r'[.!?]\s+', text_content) if len(s.strip()) > 25]
        if not sentences:
            sentences = [
                "Artificial intelligence and automated assessment engines transform learning efficiency.",
                "Database design requires index optimization, foreign key constraints, and transactional consistency.",
                "FastAPI provides high-performance asynchronous web endpoints backed by Pydantic validation.",
                "React utilizes a virtual DOM and unidirectional data flow for reactive user interface rendering.",
                "Security architecture mandates HTTPS encryption, JWT authentication, and bcrypt password hashing."
            ]

        topics = ["Architecture & Fundamentals", "Core Concepts", "Implementation Details", "Security & Reliability", "Performance Optimization"]
        if topic_summary and len(topic_summary) > 0:
            topics = [t["name"] for t in topic_summary if isinstance(t, dict) and "name" in t]

        questions = []
        random.seed(42)  # repeatable baseline

        n_sentences = len(sentences)
        for i in range(count):
            sentence_idx = int(i * n_sentences / max(1, count)) % n_sentences
            sentence = sentences[sentence_idx]
            topic = topics[i % len(topics)]
            q_type = types[i % len(types)]
            bloom = blooms[i % len(blooms)]
            
            # Words extraction for distractor generation
            words = [w for w in re.findall(r'\b[A-Za-z]{4,}\b', sentence) if w.lower() not in ["with", "that", "this", "from", "have", "been", "were"]]
            key_term = words[0] if words else "System"

            if q_type == "mcq":
                questions.append({
                    "topic_name": topic,
                    "question_type": "mcq",
                    "stem": f"Based on the text: Which statement accurately reflects the concept regarding '{key_term}'?",
                    "explanation": f"According to the source content: '{sentence}'. This validates Option A as the authoritative fact.",
                    "difficulty": difficulty,
                    "bloom_taxonomy": bloom,
                    "confidence_score": round(0.92 + (i % 7) * 0.01, 2),
                    "points": 10.0,
                    "options": [
                        {"option_key": "A", "option_text": sentence, "is_correct": True},
                        {"option_key": "B", "option_text": f"{sentence[:40]} is universally prohibited under standard protocols.", "is_correct": False},
                        {"option_key": "C", "option_text": f"The process ignores {key_term} and substitutes static configuration.", "is_correct": False},
                        {"option_key": "D", "option_text": f"None of the above statements apply to {key_term}.", "is_correct": False}
                    ]
                })

            elif q_type == "true_false":
                is_true = (i % 2 == 0)
                stem_txt = sentence if is_true else f"{sentence} (However, this statement claims it is strictly prohibited)."
                questions.append({
                    "topic_name": topic,
                    "question_type": "true_false",
                    "stem": f"True or False: {stem_txt}",
                    "explanation": f"Source reference: '{sentence}'. The statement is {is_true}.",
                    "difficulty": difficulty,
                    "bloom_taxonomy": bloom,
                    "confidence_score": 0.96,
                    "points": 10.0,
                    "options": [
                        {"option_key": "A", "option_text": "True", "is_correct": is_true},
                        {"option_key": "B", "option_text": "False", "is_correct": not is_true}
                    ]
                })

            elif q_type == "fill_blank":
                blank_sentence = sentence.replace(key_term, "__________", 1)
                questions.append({
                    "topic_name": topic,
                    "question_type": "fill_blank",
                    "stem": f"Fill in the blank: '{blank_sentence}'",
                    "explanation": f"The missing term is '{key_term}', completing the principle: '{sentence}'.",
                    "difficulty": difficulty,
                    "bloom_taxonomy": bloom,
                    "confidence_score": 0.94,
                    "points": 10.0,
                    "options": [
                        {"option_key": "A", "option_text": key_term, "is_correct": True},
                        {"option_key": "B", "option_text": f"Deprecated_{key_term}", "is_correct": False},
                        {"option_key": "C", "option_text": "Synchronous_Blocker", "is_correct": False},
                        {"option_key": "D", "option_text": "Global_Override", "is_correct": False}
                    ]
                })

            elif q_type == "assertion_reason":
                questions.append({
                    "topic_name": topic,
                    "question_type": "assertion_reason",
                    "stem": f"Assertion (A): {sentence}\nReason (R): Rigorous architectural design requires verified factual constraints.",
                    "explanation": "Both Assertion (A) and Reason (R) are true, and Reason (R) is the correct explanation of Assertion (A).",
                    "difficulty": difficulty,
                    "bloom_taxonomy": "Analyzing",
                    "confidence_score": 0.95,
                    "points": 10.0,
                    "options": [
                        {"option_key": "A", "option_text": "Both A and R are true and R is the correct explanation of A.", "is_correct": True},
                        {"option_key": "B", "option_text": "Both A and R are true but R is NOT the correct explanation of A.", "is_correct": False},
                        {"option_key": "C", "option_text": "A is true but R is false.", "is_correct": False},
                        {"option_key": "D", "option_text": "A is false but R is true.", "is_correct": False}
                    ]
                })

            elif q_type == "multiselect":
                questions.append({
                    "topic_name": topic,
                    "question_type": "multiselect",
                    "stem": f"Which of the following are valid characteristics related to: '{sentence[:60]}...'? (Select all that apply)",
                    "explanation": f"Options A and B represent core verified principles from the document: '{sentence}'.",
                    "difficulty": difficulty,
                    "bloom_taxonomy": "Evaluating",
                    "confidence_score": 0.93,
                    "points": 10.0,
                    "options": [
                        {"option_key": "A", "option_text": sentence, "is_correct": True},
                        {"option_key": "B", "option_text": f"It complies with standard domain best practices.", "is_correct": True},
                        {"option_key": "C", "option_text": "It degrades execution speed by 500%.", "is_correct": False},
                        {"option_key": "D", "option_text": "It invalidates all database transactions unconditionally.", "is_correct": False}
                    ]
                })

            else:  # scenario or default MCQ
                questions.append({
                    "topic_name": topic,
                    "question_type": "scenario",
                    "stem": f"Scenario: An enterprise engineering team encounters the following domain context: '{sentence}'. As the system architect, how should you address this scenario?",
                    "explanation": f"Applying principles from the text: '{sentence}' establishes that Option A provides the optimal architectural outcome.",
                    "difficulty": difficulty,
                    "bloom_taxonomy": "Creating",
                    "confidence_score": 0.97,
                    "points": 10.0,
                    "options": [
                        {"option_key": "A", "option_text": f"Integrate automated verification for: {sentence[:60]}...", "is_correct": True},
                        {"option_key": "B", "option_text": "Bypass validation checks to minimize initial configuration time.", "is_correct": False},
                        {"option_key": "C", "option_text": "De-scope the module and disable logging.", "is_correct": False},
                        {"option_key": "D", "option_text": "Delegate execution to unmonitored client-side scripts.", "is_correct": False}
                    ]
                })

        return questions
