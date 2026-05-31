from sqlalchemy.orm import Session
from app.repositories.guest_members import GuestMemberRepository
from app.repositories.table import TableRepository
from fastapi import HTTPException
from typing import Optional


class GuestMemberService:
    def __init__(self, db: Session):
        self.member_repo = GuestMemberRepository(db)
        self.table_repo = TableRepository(db)

    def seat_member(self, member_id: int, table_id: Optional[int]):
        """Նստեցնում է կոնկրետ անդամին/աթոռը սեղանի մոտ (ստուգելով ազատ տեղերը)"""
        if table_id is not None:
            # 1. Ստուգում ենք՝ արդյո՞ք սեղանը գոյություն ունի
            table = self.table_repo.get_by_id(table_id)
            if not table:
                raise HTTPException(status_code=404, detail="Table not found")

            # 2. Ստուգում ենք ազատ տեղերի քանակը
            seated_count = self.member_repo.count_seated_at_table(table_id)
            if seated_count >= table.capacity:
                raise HTTPException(status_code=400, detail="Այս սեղանի շուրջ ազատ աթոռ չկա։")

        # 3. Եթե ամեն ինչ OK է (կամ table_id-ն None է՝ այսինքն հանում ենք սեղանից), թարմացնում ենք
        return self.member_repo.update_seating(member_id, table_id)

    def update_member_name(self, member_id: int, first_name: str):
        """Թույլ է տալիս անհատապես փոխել աթոռի վրայի անունը (Split-ից հետո խմբագրելու համար)"""
        return self.member_repo.update_name(member_id, first_name)

    def get_unseated_members(self, wedding_id: int):
        """Վերադարձնում է միայն այն հյուրերին, ովքեր դեռ սեղան չունեն (Չնստեցվածներ)"""
        return self.member_repo.get_unseated_by_wedding(wedding_id)