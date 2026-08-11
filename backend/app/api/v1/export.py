from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.export_service import export_service

router = APIRouter(prefix="/export", tags=["Multi-Format Export"])

@router.get("/quiz/{quiz_id}/moodle")
async def export_moodle(quiz_id: str, db: AsyncSession = Depends(get_db)):
    xml_data = await export_service.export_moodle_xml(db, quiz_id)
    return Response(content=xml_data, media_type="application/xml", headers={
        "Content-Disposition": f"attachment; filename=quiz_{quiz_id}_moodle.xml"
    })

@router.get("/quiz/{quiz_id}/csv")
async def export_csv(quiz_id: str, db: AsyncSession = Depends(get_db)):
    csv_data = await export_service.export_csv(db, quiz_id)
    return Response(content=csv_data, media_type="text/csv", headers={
        "Content-Disposition": f"attachment; filename=quiz_{quiz_id}.csv"
    })

@router.get("/quiz/{quiz_id}/qti")
async def export_qti(quiz_id: str, db: AsyncSession = Depends(get_db)):
    qti_data = await export_service.export_qti_xml(db, quiz_id)
    return Response(content=qti_data, media_type="application/xml", headers={
        "Content-Disposition": f"attachment; filename=quiz_{quiz_id}_qti.xml"
    })

@router.get("/quiz/{quiz_id}/pdf")
async def export_pdf(quiz_id: str, db: AsyncSession = Depends(get_db)):
    pdf_bytes = await export_service.generate_pdf_exam(db, quiz_id)
    return Response(content=pdf_bytes, media_type="application/pdf", headers={
        "Content-Disposition": f"attachment; filename=Exam_Paper_{quiz_id}.pdf"
    })
