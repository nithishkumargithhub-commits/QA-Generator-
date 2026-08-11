import secrets
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import User, Classroom, ClassroomMember, Assignment, QuizSession, Quiz
from app.schemas.features import ClassroomCreate, ClassroomOut, ClassroomJoin, AssignmentCreate, AssignmentOut

router = APIRouter(prefix="/classrooms", tags=["Classrooms & LMS"])

@router.post("/", response_model=ClassroomOut)
async def create_classroom(
    payload: ClassroomCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    code = secrets.token_hex(3).upper() # 6-char unique code
    cls = Classroom(
        teacher_id=current_user.id,
        name=payload.name,
        code=code,
        description=payload.description
    )
    db.add(cls)
    await db.commit()
    await db.refresh(cls)
    return cls

@router.get("/", response_model=List[ClassroomOut])
async def list_classrooms(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch classrooms owned or joined
    res = await db.execute(
        select(Classroom).where(Classroom.teacher_id == current_user.id)
    )
    teacher_classes = res.scalars().all()
    
    mem_res = await db.execute(
        select(ClassroomMember).where(ClassroomMember.student_id == current_user.id)
    )
    member_records = mem_res.scalars().all()
    joined_ids = [m.classroom_id for m in member_records]
    
    joined_classes = []
    if joined_ids:
        j_res = await db.execute(select(Classroom).where(Classroom.id.in_(joined_ids)))
        joined_classes = j_res.scalars().all()

    all_cls = list({c.id: c for c in (teacher_classes + joined_classes)}.values())
    return all_cls

@router.post("/join", response_model=ClassroomOut)
async def join_classroom(
    payload: ClassroomJoin,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    res = await db.execute(select(Classroom).where(Classroom.code == payload.code.upper()))
    cls = res.scalar_one_or_none()
    if not cls:
        raise HTTPException(status_code=404, detail="Classroom with code not found.")

    # Check already member
    m_res = await db.execute(
        select(ClassroomMember).where(
            and_(ClassroomMember.classroom_id == cls.id, ClassroomMember.student_id == current_user.id)
        )
    )
    if m_res.scalar_one_or_none():
        return cls

    mem = ClassroomMember(classroom_id=cls.id, student_id=current_user.id)
    db.add(mem)
    await db.commit()
    return cls

@router.post("/assignments", response_model=AssignmentOut)
async def create_assignment(
    payload: AssignmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ass = Assignment(
        classroom_id=payload.classroom_id,
        quiz_id=payload.quiz_id,
        title=payload.title,
        due_date=payload.due_date
    )
    db.add(ass)
    await db.commit()
    await db.refresh(ass)
    return ass

@router.get("/{classroom_id}/assignments", response_model=List[AssignmentOut])
async def list_assignments(
    classroom_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    res = await db.execute(select(Assignment).where(Assignment.classroom_id == classroom_id))
    return res.scalars().all()
