from sqlalchemy.orm import Session
from app.repositories.guest import GuestRepository
from app.repositories.guest_members import GuestMemberRepository
from app.models.guest_members import GuestMember
from app.schemas.guest import GuestCreate, GuestsMergeRequest
from fastapi import HTTPException


class GuestService:
    def __init__(self, db: Session):
        self.guest_repo = GuestRepository(db)
        self.member_repo = GuestMemberRepository(db)

    def create_guest_with_members(self, guest_data: GuestCreate):
        """Ստեղծում է հյուրին (օր.՝ Արամ 6 հոգի) և ավտոմատ բացում 6 աթոռ"""
        # 1. Ստեղծում ենք հիմնական հրավերը (Guest)
        db_guest = self.guest_repo.create(guest_data)

        # 2. Ավտոմատ պատրաստում ենք անդամների (աթոռների) ցուցակը
        members_to_create = []
        for i in range(db_guest.total_count):
            # Առաջին տողին տալիս ենք հիմնական անունը, մնացածին թողնում ենք դատարկ (NULL)
            name = db_guest.display_name if i == 0 else None
            member = GuestMember(guest_id=db_guest.id, first_name=name, table_id=None)
            members_to_create.append(member)

        # 3. Պահպանում ենք բոլոր աթոռները բազայում (Bulk Insert)
        self.member_repo.create_bulk(members_to_create)

        return db_guest

    def merge_guests(self, wedding_id: int, merge_data: GuestsMergeRequest):
        """Միավորում է առանձին հյուրերին մեկ ընտանիքի մեջ (Merge)"""
        total_seats = 0
        side = "mutual"
        status = "pending"

        # 1. Ստուգում ենք հին հյուրերի գոյությունը և հաշվում աթոռների ընդհանուր քանակը
        for g_id in merge_data.guest_ids:
            old_guest = self.guest_repo.get_by_id(g_id)
            if not old_guest or old_guest.wedding_id != wedding_id:
                raise HTTPException(status_code=404, detail=f"Guest with ID {g_id} not found")
            total_seats += old_guest.total_count
            side = old_guest.side  # Վերցնում ենք վերջինի կողմը որպես default
            status = old_guest.status

        # 2. Ստեղծում ենք նոր ընդհանուր հրավերը (օր.՝ Մանուկյան ընտանիք)
        new_guest_schema = GuestCreate(
            wedding_id=wedding_id,
            display_name=merge_data.new_display_name,
            total_count=total_seats,
            side=side,
            status=status
        )
        new_guest = self.guest_repo.create(new_guest_schema)

        # 3. Հին հյուրերի բոլոր աթոռները (GuestMembers) կապում ենք նոր խմբի ID-ի հետ
        for g_id in merge_data.guest_ids:
            old_members = self.member_repo.get_by_guest_id(g_id)
            for member in old_members:
                # Եթե անունը դատարկ էր, կարող ենք թողնել դատարկ, կամ թարմացնել
                member.guest_id = new_guest.id

            # 4. Ջնջում ենք հին հրավերը (cascade-ը չի աշխատի, քանի որ ID-ն արդեն փոխեցինք)
            self.guest_repo.delete(g_id)

        self.guest_repo.db.commit()
        return new_guest

    def get_wedding_guests(self, wedding_id: int):
        return self.guest_repo.get_by_wedding(wedding_id)

    def delete_guest(self, guest_id: int):
        return self.guest_repo.delete(guest_id)