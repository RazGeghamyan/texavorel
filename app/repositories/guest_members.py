from sqlalchemy.orm import Session
from app.models.guest_members import GuestMember
from typing import List, Optional


class GuestMemberRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_bulk(self, members: List[GuestMember]):
        """Միանգամից մի քանի աթոռ/անդամ ավելացնելու համար (Bulk Insert)"""
        self.db.add_all(members)
        self.db.commit()

    def get_by_guest_id(self, guest_id: int) -> List[GuestMember]:
        return self.db.query(GuestMember).filter(GuestMember.guest_id == guest_id).all()

    def get_unseated_by_wedding(self, wedding_id: int) -> List[GuestMember]:
        """Վերադարձնում է այն անդամներին, ովքեր դեռ սեղանին նստեցված չեն (table_id IS NULL)"""
        from app.models.guest import Guest
        return (
            self.db.query(GuestMember)
            .join(Guest)
            .filter(Guest.wedding_id == wedding_id, GuestMember.table_id.is_(None))
            .all()
        )

    def update_seating(self, member_id: int, table_id: Optional[int]) -> GuestMember | None:
        """Նստեցնում է անդամին սեղանի մոտ կամ հանում է սեղանից (table_id=None)"""
        member = self.db.query(GuestMember).filter(GuestMember.id == member_id).first()
        if member:
            member.table_id = table_id
            self.db.commit()
            self.db.refresh(member)
        return member

    def update_name(self, member_id: int, first_name: str) -> GuestMember | None:
        """Փոխում է անդամի անունը, երբ 'Արամի հյուր 1'-ը դառնում է կոնկրետ անուն"""
        member = self.db.query(GuestMember).filter(GuestMember.id == member_id).first()
        if member:
            member.first_name = first_name
            self.db.commit()
            self.db.refresh(member)
        return member

    def count_seated_at_table(self, table_id: int) -> int:
        """Հաշվում է, թե տվյալ սեղանի շուրջ արդեն քանի աթոռ է զբաղված"""
        return self.db.query(GuestMember).filter(GuestMember.table_id == table_id).count()