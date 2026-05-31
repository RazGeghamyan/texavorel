from sqlalchemy.orm import Session
from app.models.table import Table
from app.schemas.table import TableCreate
from typing import List


class TableRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, table_data: TableCreate) -> Table:
        db_table = Table(
            wedding_id=table_data.wedding_id,
            table_number=table_data.table_number,
            category=table_data.category,
            capacity=table_data.capacity
        )
        self.db.add(db_table)
        self.db.commit()
        self.db.refresh(db_table)
        return db_table

    def get_by_wedding(self, wedding_id: int) -> List[Table]:
        return self.db.query(Table).filter(Table.wedding_id == wedding_id).all()

    def get_by_id(self, table_id: int) -> Table | None:
        return self.db.query(Table).filter(Table.id == table_id).first()

    def delete(self, table_id: int) -> bool:
        db_table = self.get_by_id(table_id)
        if db_table:
            self.db.delete(db_table)
            self.db.commit()
            return True
        return False