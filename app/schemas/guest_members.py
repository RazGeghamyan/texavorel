from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class GuestMemberBase(BaseModel):
    first_name: Optional[str] = None
    table_id: Optional[int] = None


# Անդամի տվյալները թարմացնելու համար (օրինակ՝ անունը փոխել կամ սեղանին նստեցնել)
class GuestMemberUpdate(BaseModel):
    first_name: Optional[str] = None
    table_id: Optional[int] = None


class GuestMemberResponse(GuestMemberBase):
    id: int
    guest_id: int
    created_at: datetime

    class Config:
        from_attributes = True