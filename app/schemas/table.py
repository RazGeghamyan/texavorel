from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal


class TableBase(BaseModel):
    table_number: str
    category: Literal['presidium', 'rectangle', 'double_rectangle', 'round']
    capacity: int = Field(..., gt=0, description="Աթոռների քանակը պետք է մեծ լինի 0-ից")


# Ստեղծելու համար
class TableCreate(TableBase):
    wedding_id: int


# Պատասխանի (Response) համար
class TableResponse(TableBase):
    id: int
    wedding_id: int
    created_at: datetime

    class Config:
        from_attributes = True