from pydantic import BaseModel
from datetime import datetime
from typing import Optional


# Base Schema ընդհանուր դաշտերի համար
class WeddingBase(BaseModel):
    title: str


# Օգտագործվում է նոր հարսանիք ստեղծելուց (POST Request)
class WeddingCreate(WeddingBase):
    pass


# Օգտագործվում է տվյալները վերադարձնելուց (Response)
class WeddingResponse(WeddingBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True