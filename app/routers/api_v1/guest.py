from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.schemas.guest import GuestCreate, GuestResponse, GuestsMergeRequest
from app.services.guest import GuestService
from app.dependencies import get_guest_service  # <-- Օգտագործում ենք նոր դիպենդենսին

router = APIRouter(prefix="/api/v1/guests", tags=["Guests"])

@router.post("/", response_model=GuestResponse)
def create_guest(
    guest_data: GuestCreate,
    service: GuestService = Depends(get_guest_service)
):
    return service.create_guest_with_members(guest_data)

@router.get("/wedding/{wedding_id}", response_model=List[GuestResponse])
def get_wedding_guests(
    wedding_id: int,
    service: GuestService = Depends(get_guest_service)
):
    return service.get_wedding_guests(wedding_id)

@router.post("/wedding/{wedding_id}/merge", response_model=GuestResponse)
def merge_guests(
    wedding_id: int,
    merge_data: GuestsMergeRequest,
    service: GuestService = Depends(get_guest_service)
):
    return service.merge_guests(wedding_id, merge_data)

@router.delete("/{guest_id}")
def delete_guest(
    guest_id: int,
    service: GuestService = Depends(get_guest_service)
):
    if not service.delete_guest(guest_id):
        raise HTTPException(status_code=404, detail="Guest not found")
    return {"message": "Guest deleted successfully"}