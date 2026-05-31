from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Literal
from app.schemas.guest_members import GuestMemberResponse


class GuestBase(BaseModel):
    display_name: str
    total_count: int = Field(1, ge=1, description="Հյուրերի քանակը պետք է լինի առնվազն 1")
    side: Literal['bride', 'groom', 'mutual']
    status: Literal['pending', 'confirmed', 'declined'] = 'pending'


# Հյուր ստեղծելու համար (Արամ, 6 հոգի)
class GuestCreate(GuestBase):
    wedding_id: int


# Հատուկ սխեմա՝ հյուրերին միավորելու (Merge) հարցման համար
class GuestsMergeRequest(BaseModel):
    guest_ids: List[int]
    new_display_name: str


# Պատասխանի համար (իր մեջ ներառում է նաև անդամներին)
class GuestResponse(GuestBase):
    id: int
    wedding_id: int
    created_at: datetime
    members: List[GuestMemberResponse] = [] # Ավտոմատ կբերի բոլոր աթոռները

    class Config:
        from_attributes = True