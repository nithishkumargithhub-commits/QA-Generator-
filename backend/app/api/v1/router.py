from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.documents import router as documents_router
from app.api.v1.quizzes import router as quizzes_router
from app.api.v1.sessions import router as sessions_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.admin import router as admin_router
from app.api.v1.audit import router as audit_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(documents_router)
api_router.include_router(quizzes_router)
api_router.include_router(sessions_router)
api_router.include_router(analytics_router)
api_router.include_router(admin_router)
api_router.include_router(audit_router)
