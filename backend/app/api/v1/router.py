from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.documents import router as documents_router
from app.api.v1.quizzes import router as quizzes_router
from app.api.v1.sessions import router as sessions_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.admin import router as admin_router
from app.api.v1.audit import router as audit_router
from app.api.v1.tutor import router as tutor_router
from app.api.v1.flashcards import router as flashcards_router
from app.api.v1.cat import router as cat_router
from app.api.v1.classrooms import router as classrooms_router
from app.api.v1.certificates import router as certificates_router
from app.api.v1.export import router as export_router
from app.api.v1.study_plans import router as study_plans_router
from app.api.v1.live import router as live_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(documents_router)
api_router.include_router(quizzes_router)
api_router.include_router(sessions_router)
api_router.include_router(analytics_router)
api_router.include_router(admin_router)
api_router.include_router(audit_router)
api_router.include_router(tutor_router)
api_router.include_router(flashcards_router)
api_router.include_router(cat_router)
api_router.include_router(classrooms_router)
api_router.include_router(certificates_router)
api_router.include_router(export_router)
api_router.include_router(study_plans_router)
api_router.include_router(live_router)
