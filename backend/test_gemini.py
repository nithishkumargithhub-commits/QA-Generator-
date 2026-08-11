import asyncio
import httpx
from dotenv import load_dotenv
import os

load_dotenv()
key = os.getenv("GEMINI_API_KEY")

async def test_solve():
    models_to_try = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-3.6-flash", "gemini-2.5-flash-lite", "gemini-flash-latest"]
    headers = {"Content-Type": "application/json"}
    prompt = """You are an expert tutor. Solve this multiple choice question accurately:
Question: What is the capital of France?
Option A: Berlin
Option B: Madrid
Option C: Paris
Option D: Rome

Return ONLY a valid JSON object:
{"correct_option": "C", "explanation": "Paris is the capital and largest city of France."}"""

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json"
        }
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        for m in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={key}"
            try:
                resp = await client.post(url, headers=headers, json=payload)
                print(f"Model {m} -> Status: {resp.status_code}")
                if resp.status_code == 200:
                    print(f"SUCCESS with {m}!\nResponse: {resp.text}")
                    break
            except Exception as e:
                print(f"Model {m} error: {e}")

if __name__ == "__main__":
    asyncio.run(test_solve())

