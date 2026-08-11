import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status
from app.models.models import User, RefreshToken, ActivityLog
from app.schemas.auth import LoginRequest, RegisterRequest, PasswordResetRequest
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, decode_token
from app.core.config import settings

logger = logging.getLogger("auth_service")

class AuthService:
    @staticmethod
    async def authenticate_user(db: AsyncSession, username: str, password: str) -> User:
        clean_user = username.strip()
        stmt = select(User).where(
            (func.lower(User.username) == clean_user.lower()) |
            (func.lower(User.email) == clean_user.lower())
        )
        result = await db.execute(stmt)
        user = result.scalars().first()
        
        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password."
            )
        
        if user.is_suspended:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been suspended. Please contact the administrator."
            )
            
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User account is disabled."
            )
            
        user.last_login_at = datetime.now(timezone.utc)
        await db.commit()
        return user

    @staticmethod
    async def register_user(db: AsyncSession, req: RegisterRequest) -> User:
        clean_username = req.username.strip()
        clean_email = req.email.strip().lower()
        clean_name = (req.full_name or clean_username).strip()

        # Check existing username/email (case-insensitive)
        stmt = select(User).where(
            (func.lower(User.username) == clean_username.lower()) |
            (func.lower(User.email) == clean_email.lower())
        )
        result = await db.execute(stmt)
        if result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username or email is already registered."
            )
            
        hashed = get_password_hash(req.password)
        new_user = User(
            username=clean_username,
            email=clean_email,
            hashed_password=hashed,
            full_name=clean_name,
            role="Student"  # Security: Public signups are always Student accounts. Admin status must be granted by an Admin.
        )
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        return new_user

    @staticmethod
    async def create_user_tokens(db: AsyncSession, user: User) -> dict:
        access_token = create_access_token(user.id, role=user.role)
        refresh_token_str = create_refresh_token(user.id)
        
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        rf_token = RefreshToken(
            user_id=user.id,
            token=refresh_token_str,
            expires_at=expires_at
        )
        db.add(rf_token)
        await db.commit()
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token_str,
            "token_type": "bearer"
        }

    @staticmethod
    async def refresh_access_token(db: AsyncSession, refresh_token_str: str) -> dict:
        payload = decode_token(refresh_token_str)
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token.")
            
        user_id = payload.get("sub")
        stmt = select(RefreshToken).where(
            RefreshToken.token == refresh_token_str,
            RefreshToken.is_revoked == False
        )
        result = await db.execute(stmt)
        stored_token = result.scalars().first()
        
        if not stored_token:
            raise HTTPException(status_code=401, detail="Refresh token has been revoked or expired.")
            
        stmt_user = select(User).where(User.id == user_id)
        res_user = await db.execute(stmt_user)
        user = res_user.scalars().first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found.")
            
        new_access_token = create_access_token(user.id, role=user.role)
        return {
            "access_token": new_access_token,
            "refresh_token": refresh_token_str,
            "token_type": "bearer"
        }

    @staticmethod
    async def logout_all_devices(db: AsyncSession, user_id: str):
        stmt = select(RefreshToken).where(RefreshToken.user_id == user_id)
        result = await db.execute(stmt)
        tokens = result.scalars().all()
        for t in tokens:
            t.is_revoked = True
        await db.commit()
