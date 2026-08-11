from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import User
from app.schemas.features import CertificateOut
from app.services.certificate_service import certificate_service

router = APIRouter(prefix="/certificates", tags=["PDF Certificates"])

@router.post("/issue/{session_id}", response_model=CertificateOut)
async def issue_certificate(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        cert = await certificate_service.get_or_create_certificate(db, user_id=current_user.id, session_id=session_id)
        return cert
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

@router.get("/download/{code}")
async def download_certificate(
    code: str,
    db: AsyncSession = Depends(get_db)
):
    try:
        pdf_bytes = await certificate_service.generate_certificate_pdf(db, certificate_code=code)
        return Response(content=pdf_bytes, media_type="application/pdf", headers={
            "Content-Disposition": f"inline; filename=Certificate_{code}.pdf"
        })
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))

@router.get("/verify/{code}")
async def verify_certificate(
    code: str,
    db: AsyncSession = Depends(get_db)
):
    try:
        pdf_bytes = await certificate_service.generate_certificate_pdf(db, certificate_code=code)
        return {"status": "valid", "code": code, "message": "Certificate is authentic and verified."}
    except ValueError:
        return {"status": "invalid", "code": code, "message": "Certificate not found or expired."}
