from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel

class DocumentOut(BaseModel):
    id: str
    user_id: str
    filename: str
    file_size: int
    mime_type: str
    status: str
    extracted_text: Optional[str] = None
    topic_summary: Optional[List[Any]] = None
    chapter_count: int
    topic_count: int
    created_at: datetime

    class Config:
        from_attributes = True

class FileVersionOut(BaseModel):
    id: str
    file_id: str
    version_number: int
    changes_summary: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
