from sqlalchemy.orm import Session
from app.models.guest import Guest
from app.schemas.guest import GuestCreate
from typing import List


class GuestRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, guest_data: GuestCreate) -> Guest:
        db_guest = Guest(
            wedding_id=guest_data.wedding_id,
            display_name=guest_data.display_name,
            total_count=guest_data.total_count,
            side=guest_data.side,
            status=guest_data.status
        )
        self.db.add(db_guest)
        self.db.commit()
        self.db.refresh(db_guest)
        return db_guest

    def get_by_id(self, guest_id: int) -> Guest | None:
        return self.db.query(Guest).filter(Guest.id == guest_id).first()

    def get_by_wedding(self, wedding_id: int) -> List[Guest]:
        return self.db.query(Guest).filter(Guest.wedding_id == wedding_id).all()

    def update_total_count(self, guest_id: int, new_count: int) -> Guest | None:
        db_guest = self.get_by_id(guest_id)
        if db_guest:
            db_guest.total_count = new_count
            self.db.commit()
            self.db.refresh(db_guest)
        return db_guest

    def delete(self, guest_id: int) -> bool:
        db_guest = self.get_by_id(guest_id)
        if db_guest:
            self.db.delete(db_guest)
            self.db.commit()
            return True
        return False