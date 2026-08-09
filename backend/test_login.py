import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        # Test login
        resp = await client.post(
            "http://127.0.0.1:8000/api/v1/auth/login",
            json={"username": "Nithish52", "password": "Nithish@5252"}
        )
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")

asyncio.run(main())
