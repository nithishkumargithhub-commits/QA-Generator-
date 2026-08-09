import asyncio
from app.core.database import init_db
from app.main import seed_default_admin

async def main():
    print("Initializing DB...")
    await init_db()
    print("Seeding Default Admin user...")
    await seed_default_admin()
    print("Seeding complete.")

if __name__ == "__main__":
    asyncio.run(main())
