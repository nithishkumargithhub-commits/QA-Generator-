import logging
from typing import Dict, List, Set, Any
from fastapi import WebSocket

logger = logging.getLogger("live_multiplayer_ws")

class LiveMultiplayerManager:
    def __init__(self):
        # Room code -> set of active WebSocket connections
        self.rooms: Dict[str, Set[WebSocket]] = {}
        # Room code -> participant metadata dict {ws: {"username": str, "score": int}}
        self.participants: Dict[str, Dict[WebSocket, Dict[str, Any]]] = {}

    async def connect(self, websocket: WebSocket, room_code: str, username: str):
        await websocket.accept()
        if room_code not in self.rooms:
            self.rooms[room_code] = set()
            self.participants[room_code] = {}

        self.rooms[room_code].add(websocket)
        self.participants[room_code][websocket] = {"username": username, "score": 0}

        # Broadcast updated participant list to all in room
        await self.broadcast_leaderboard(room_code)

    def disconnect(self, websocket: WebSocket, room_code: str):
        if room_code in self.rooms:
            self.rooms[room_code].discard(websocket)
            if websocket in self.participants.get(room_code, {}):
                del self.participants[room_code][websocket]

            if not self.rooms[room_code]:
                del self.rooms[room_code]
                if room_code in self.participants:
                    del self.participants[room_code]

    async def broadcast_to_room(self, room_code: str, message: Dict[str, Any]):
        if room_code in self.rooms:
            for connection in list(self.rooms[room_code]):
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to WS connection: {e}")

    async def add_score(self, room_code: str, websocket: WebSocket, points: int):
        if room_code in self.participants and websocket in self.participants[room_code]:
            self.participants[room_code][websocket]["score"] += points
            await self.broadcast_leaderboard(room_code)

    async def broadcast_leaderboard(self, room_code: str):
        if room_code in self.participants:
            leaderboard = [
                {"username": p["username"], "score": p["score"]}
                for p in self.participants[room_code].values()
            ]
            leaderboard.sort(key=lambda x: x["score"], reverse=True)

            await self.broadcast_to_room(room_code, {
                "type": "LEADERBOARD_UPDATE",
                "leaderboard": leaderboard,
                "player_count": len(leaderboard)
            })

live_ws_manager = LiveMultiplayerManager()
