import logging
import time
from typing import Optional, Any

logger = logging.getLogger(__name__)

class InMemoryCache:
    """Fallback cache layer if Redis server is not reachable."""
    def __init__(self):
        self._store = {}

    async def get(self, key: str) -> Optional[Any]:
        item = self._store.get(key)
        if not item:
            return None
        val, exp = item
        if exp and time.time() > exp:
            del self._store[key]
            return None
        return val

    async def set(self, key: str, value: Any, expire: Optional[int] = None):
        exp_time = time.time() + expire if expire else None
        self._store[key] = (value, exp_time)

    async def delete(self, key: str):
        self._store.pop(key, None)

    async def exists(self, key: str) -> bool:
        return (await self.get(key)) is not None

cache_backend = InMemoryCache()

async def get_cache():
    return cache_backend
