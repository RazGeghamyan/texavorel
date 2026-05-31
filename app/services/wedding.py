from sqlalchemy.orm import Session
from app.repositories.wedding import WeddingRepository
from app.schemas.wedding import WeddingCreate


class WeddingService:
    def __init__(self, db: Session):
        self.wedding_repo = WeddingRepository(db)

    def create_wedding(self, wedding_data: WeddingCreate):
        return self.wedding_repo.create(wedding_data)

    def get_wedding(self, wedding_id: int):
        return self.wedding_repo.get_by_id(wedding_id)