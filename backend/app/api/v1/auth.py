from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.auth import LoginRequest, RegisterRequest, PasswordResetRequest, RefreshTokenRequest, Token
from app.schemas.user import UserOut
from app.services.auth_service import AuthService
from app.api.deps import get_current_user
from app.models.models import User

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
async def login(req: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    user = await AuthService.authenticate_user(db, req.username, req.password)
    tokens = await AuthService.create_user_tokens(db, user)
    
    # Set HTTP-only refresh cookie
    response.set_cookie(
        key="refresh_token",
        value=tokens["refresh_token"],
        httponly=True,
        max_age=30 * 24 * 3600,
        samesite="lax",
        secure=False
    )
    return tokens

@router.post("/register", response_model=UserOut)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user = await AuthService.register_user(db, req)
    return user

@router.post("/refresh", response_model=Token)
async def refresh_token(req: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    tokens = await AuthService.refresh_access_token(db, req.refresh_token)
    return tokens

@router.post("/reset-password")
async def reset_password(req: PasswordResetRequest, db: AsyncSession = Depends(get_db)):
    # Password reset flow
    from app.core.security import get_password_hash
    from sqlalchemy import select
    stmt = select(User).where(User.email == req.email)
    res = await db.execute(stmt)
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User with this email does not exist.")
    user.hashed_password = get_password_hash(req.new_password)
    await db.commit()
    return {"message": "Password successfully reset."}

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await AuthService.logout_all_devices(db, current_user.id)
    return {"message": "Successfully logged out from all devices."}

@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
