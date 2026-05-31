from fastapi import APIRouter, Depends
from typing import List, Optional
from app.schemas.guest_members import GuestMemberResponse
from app.services.guest_members import GuestMemberService
from app.dependencies import get_guest_member_service  # <-- Օգտագործում ենք նոր դիպենդենսին

router = APIRouter(prefix="/api/v1/guest-members", tags=["Guest Members"])

@router.put("/{member_id}/seat", response_model=GuestMemberResponse)
def seat_member(
    member_id: int,
    table_id: Optional[int] = None,
    service: GuestMemberService = Depends(get_guest_member_service)
):
    """Նստեցնում է անդամին սեղանի մոտ։ Եթե table_id չի ուղարկվում, հանում է սեղանից։"""
    return service.seat_member(member_id, table_id)

@router.put("/{member_id}/name", response_model=GuestMemberResponse)
def update_member_name(
    member_id: int,
    first_name: str,
    service: GuestMemberService = Depends(get_guest_member_service)
):
    """Թարմացնում է անհատական աթոռի անունը (Խմբագրման/Split-ի ժամանակ)"""
    return service.update_member_name(member_id, first_name)

@router.get("/wedding/{wedding_id}/unseated", response_model=List[GuestMemberResponse])
def get_unseated_members(
    wedding_id: int,
    service: GuestMemberService = Depends(get_guest_member_service)
):
    """Վերադարձնում է միայն այն անդամներին, ովքեր դեռ սեղան չունեն"""
    return service.get_unseated_members(wedding_id)