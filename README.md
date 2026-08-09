# Enterprise AI QA Generator & Assessment Platform

A production-grade, enterprise-level AI-powered QA Generator and Assessment Platform optimized for 10,000+ concurrent users, educational institutions, coaching centers, and corporate training platforms.

---

## Admin Credentials Configuration

Configure your initial admin username and password via environment variables:
- **`DEFAULT_ADMIN_USERNAME`**: `admin`
- **`DEFAULT_ADMIN_PASSWORD`**: Set via environment variable in production

---

## Tech Stack & Architecture

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, TanStack React Query v5, Zustand, Framer Motion, Recharts, Lucide React.
- **Backend**: FastAPI (Python 3.12 async architecture), SQLAlchemy 2.0 Async, PostgreSQL / SQLite dual-driver fallback, JWT Authentication with bcrypt password hashing, slowapi rate limiting, custom security middleware.
- **Document Engine**: Multi-format parsing (PDF via PyMuPDF/fitz, DOCX, PPTX, TXT, OCR fallback via Pillow/Tesseract), chapter detection, topic segmentation.
- **AI Question Engine**: Supports API integrations (OpenAI / Gemini / OpenRouter) and built-in offline NLP heuristic question generator (MCQ, True/False, Fill in Blank, Match, Assertion-Reason, Multi-Select, Scenario) with Bloom's Taxonomy classification and confidence scoring.
- **Adaptive Quiz Engine**: Sub-100ms instant feedback payload, keyboard shortcuts (1-4/A-D, Enter, F to flag), adaptive weak-topic remediation, PDF report generation, and commercial LMS admin control panel.

---

## Quick Start (Local Run)

### 1. Install & Start Backend (FastAPI)

```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload --port 8000
```
- Interactive API Docs (OpenAPI / Swagger): `http://localhost:8000/api/v1/docs`

### 2. Install & Start Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```
- Application Web Interface: `http://localhost:5173`

---

## Docker Deployment

To launch full stack with PostgreSQL, Redis, FastAPI, and React:

```bash
docker-compose up --build -d
```

---

## Features Summary

- **Multi-Format Document Parsing**: PDF, DOCX, PPTX, TXT, PNG, JPG, JPEG with OCR capability.
- **Sub-100ms Answer Feedback**: Real-time evaluation returning answer correctness, explanations, topic mastery %, and revision concepts.
- **Adaptive Learning Engine**: Dynamically weights weak topics for subsequent quizzes.
- **Enterprise LMS Dashboard**: User management, status toggling, CSV exports, security audit logs, daily/monthly analytics charts.
