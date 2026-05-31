from sqlalchemy.orm import Session
from app.models.wedding import Wedding
from app.schemas.wedding import WeddingCreate


class WeddingRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, wedding_data: WeddingCreate) -> Wedding:
        db_wedding = Wedding(title=wedding_data.title)
        self.db.add(db_wedding)
        self.db.commit()
        self.db.refresh(db_wedding)
        return db_wedding

    def get_by_id(self, wedding_id: int) -> Wedding | None:
        return self.db.query(Wedding).filter(Wedding.id == wedding_id).first()