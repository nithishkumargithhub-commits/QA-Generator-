import secrets
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.models import LiveSession
from app.services.live_multiplayer_ws import live_ws_manager

router = APIRouter(prefix="/live", tags=["Live Multiplayer"])

@router.post("/rooms/create/{quiz_id}")
async def create_live_room(
    quiz_id: str,
    db: AsyncSession = Depends(get_db)
):
    code = secrets.token_hex(3).upper() # 6-char room code
    session = LiveSession(
        host_id="host_user",
        quiz_id=quiz_id,
        room_code=code,
        status="waiting"
    )
    db.add(session)
    await db.commit()
    return {"room_code": code, "status": "waiting"}

@router.websocket("/ws/{room_code}")
async def live_multiplayer_ws(websocket: WebSocket, room_code: str, username: str = "Player"):
    await live_ws_manager.connect(websocket, room_code, username)
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "SUBMIT_ANSWER":
                points = data.get("points", 100)
                await live_ws_manager.add_score(room_code, websocket, points)
            elif msg_type == "START_GAME":
                await live_ws_manager.broadcast_to_room(room_code, {"type": "GAME_STARTED"})
            elif msg_type == "NEXT_QUESTION":
                await live_ws_manager.broadcast_to_room(room_code, {
                    "type": "NEXT_QUESTION",
                    "question_index": data.get("question_index", 0)
                })
    except WebSocketDisconnect:
        live_ws_manager.disconnect(websocket, room_code)
