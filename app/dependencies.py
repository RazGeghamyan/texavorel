from fastapi import Depends
from sqlalchemy.orm import Session
from core.database import get_db

# 1. Ներմուծում ենք Ռեպոզիտորիաները
from app.repositories.wedding import WeddingRepository
from app.repositories.table import TableRepository
from app.repositories.guest import GuestRepository
from app.repositories.guest_members import GuestMemberRepository

# 2. Ներմուծում ենք Սերվիսները
from app.services.wedding import WeddingService
from app.services.table import TableService
from app.services.guest import GuestService
from app.services.guest_members import GuestMemberService


# --- Dependency Functions ---

def get_wedding_service(db: Session = Depends(get_db)):
    repo = WeddingRepository(db)
    return WeddingService(db) # Քանի որ մեր սերվիսի մեջ db-ն էլ էր պետք, փոխանցում ենք db-ն


def get_table_service(db: Session = Depends(get_db)):
    return TableService(db)


def get_guest_service(db: Session = Depends(get_db)):
    return GuestService(db)


def get_guest_member_service(db: Session = Depends(get_db)):
    return GuestMemberService(db)