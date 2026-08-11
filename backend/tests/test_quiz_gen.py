import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_quiz_generation_and_session():
    with TestClient(app) as client:
        # Register user
        client.post("/api/v1/auth/register", json={
            "username": "admin",
            "email": "admin_quiz_test@example.com",
            "password": "AdminSecret123!",
            "full_name": "Admin Tester"
        })
        # 1. Login
        login_resp = client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "AdminSecret123!"
        })

        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Generate Quiz with 10 questions
        gen_payload = {
            "title": "Computer Science & Architecture Basics",
            "difficulty": "Medium",
            "question_count": 10,
            "question_types": ["mcq", "true_false", "fill_blank", "scenario"],
            "time_limit_minutes": 15,
            "passing_score": 70.0,
            "mode": "Standard"
        }
        gen_resp = client.post("/api/v1/quizzes/generate", json=gen_payload, headers=headers)
        assert gen_resp.status_code == 200
        quiz_data = gen_resp.json()
        assert "id" in quiz_data
        questions = quiz_data.get("questions", [])
        assert len(questions) > 0

        # Assert correct options are not all 'A'
        correct_keys = []
        for q in questions:
            for opt in q.get("options", []):
                if opt.get("is_correct"):
                    correct_keys.append(opt.get("option_key"))
        
        # Verify that options are distributed across A, B, C, D
        assert len(correct_keys) == len(questions)
        unique_keys = set(correct_keys)
        assert len(unique_keys) > 1, f"Correct answer keys should vary across options, but got: {correct_keys}"

        # 3. Start Session
        sess_resp = client.post("/api/v1/sessions/start", json={"quiz_id": quiz_data["id"]}, headers=headers)
        assert sess_resp.status_code == 200
        sess_data = sess_resp.json()
        assert sess_data["status"] == "in_progress"

        # 4. Instant Answer Evaluation test
        first_q = questions[0]
        q_id = first_q["id"]
        true_correct = [o["option_key"] for o in first_q["options"] if o["is_correct"]]
        wrong_opts = [o["option_key"] for o in first_q["options"] if not o["is_correct"]]

        # Submit correct answer (lowercase to test case-insensitivity)
        ans_resp = client.post(f"/api/v1/sessions/{sess_data['id']}/answer", json={
            "question_id": q_id,
            "selected_options": [true_correct[0].lower()],
            "response_time_seconds": 3.5
        }, headers=headers)
        assert ans_resp.status_code == 200
        fb = ans_resp.json()
        assert fb["is_correct"] is True
        assert fb["explanation"]

        # Submit wrong answer if wrong options exist
        if wrong_opts:
            ans_resp_wrong = client.post(f"/api/v1/sessions/{sess_data['id']}/answer", json={
                "question_id": q_id,
                "selected_options": [wrong_opts[0]],
                "response_time_seconds": 2.0
            }, headers=headers)
            assert ans_resp_wrong.status_code == 200
            fb_wrong = ans_resp_wrong.json()
            assert fb_wrong["is_correct"] is False


