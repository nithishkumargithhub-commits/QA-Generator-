from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.schemas.user import UserOut, UserUpdate
from app.models.models import User
from app.api.deps import get_current_user, get_current_admin

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserOut)
async def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserOut)
async def update_current_user(
    req: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if req.full_name is not None:
        current_user.full_name = req.full_name
    if req.email is not None:
        current_user.email = req.email
    await db.commit()
    await db.refresh(current_user)
    return current_user

@router.get("", response_model=List[UserOut])
async def list_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    stmt = select(User).order_by(User.created_at.desc())
    res = await db.execute(stmt)
    return res.scalars().all()
