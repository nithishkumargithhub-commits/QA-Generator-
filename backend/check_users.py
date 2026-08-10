import asyncio
from app.core.database import AsyncSessionLocal
from app.models.models import User
from app.core.security import get_password_hash, verify_password
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as session:
        for uname, pwd in [("Nithish52", "Nithish@5252"), ("admin", "AdminSecret123!")]:
            res = await session.execute(select(User).where(User.username == uname))
            user = res.scalars().first()
            if user:
                user.is_active = True
                user.is_suspended = False
                ok = verify_password(pwd, user.hashed_password)
                print(f"{uname}: EXISTS, password_ok={ok}, active={user.is_active}, suspended={user.is_suspended}, role={user.role}")
                if not ok:
                    # Fix the password
                    user.hashed_password = get_password_hash(pwd)
                    print(f"  -> Password for {uname} has been FIXED.")

            else:
                print(f"{uname}: NOT FOUND - creating now...")
                new_user = User(
                    username=uname,
                    email=f"{uname.lower()}@qamaster.com",
                    hashed_password=get_password_hash(pwd),
                    full_name=uname,
                    role="Admin",
                    is_active=True,
                    is_suspended=False
                )
                session.add(new_user)
        
        await session.commit()
        print("Done.")

asyncio.run(main())
