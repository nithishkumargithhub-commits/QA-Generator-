import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_quiz_generation_and_session():
    # 1. Login
    login_resp = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "AdminSecret123!"
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Generate Quiz
    gen_payload = {
        "title": "Computer Science Basics",
        "difficulty": "Medium",
        "question_count": 5,
        "question_types": ["mcq", "true_false", "fill_blank", "scenario"],
        "time_limit_minutes": 15,
        "passing_score": 70.0,
        "mode": "Standard"
    }
    gen_resp = client.post("/api/v1/quizzes/generate", json=gen_payload, headers=headers)
    assert gen_resp.status_code == 200
    quiz_data = gen_resp.json()
    assert "id" in quiz_data
    assert len(quiz_data["questions"]) == 5

    # 3. Start Session
    sess_resp = client.post("/api/v1/sessions/start", json={"quiz_id": quiz_data["id"]}, headers=headers)
    assert sess_resp.status_code == 200
    sess_data = sess_resp.json()
    assert sess_data["status"] == "in_progress"

    # 4. Instant Answer Evaluation
    q_id = quiz_data["questions"][0]["id"]
    ans_resp = client.post(f"/api/v1/sessions/{sess_data['id']}/answer", json={
        "question_id": q_id,
        "selected_options": ["A"],
        "response_time_seconds": 3.5
    }, headers=headers)
    assert ans_resp.status_code == 200
    fb = ans_resp.json()
    assert "is_correct" in fb
    assert "explanation" in fb
