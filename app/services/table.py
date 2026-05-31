from sqlalchemy.orm import Session
from app.repositories.table import TableRepository
from app.repositories.guest_members import GuestMemberRepository
from app.schemas.table import TableCreate


class TableService:
    def __init__(self, db: Session):
        self.table_repo = TableRepository(db)
        self.member_repo = GuestMemberRepository(db)

    def create_table(self, table_data: TableCreate):
        return self.table_repo.create(table_data)

    def get_wedding_tables(self, wedding_id: int):
        return self.table_repo.get_by_wedding(wedding_id)

    def get_table_available_seats(self, table_id: int) -> int:
        """Հաշվում է սեղանի ազատ տեղերի քանակը"""
        table = self.table_repo.get_by_id(table_id)
        if not table:
            return 0
        seated_count = self.member_repo.count_seated_at_table(table_id)
        return table.capacity - seated_count

    def delete_table(self, table_id: int):
        return self.table_repo.delete(table_id)