from fastapi import APIRouter, Depends, HTTPException
from app.schemas.wedding import WeddingCreate, WeddingResponse
from app.services.wedding import WeddingService
from app.dependencies import get_wedding_service  # <-- Օգտագործում ենք նոր դիպենդենսին

router = APIRouter(prefix="/api/v1/weddings", tags=["Weddings"])

@router.post("/", response_model=WeddingResponse)
def create_wedding(
    wedding_data: WeddingCreate,
    service: WeddingService = Depends(get_wedding_service)  # <-- Ստանում ենք պատրաստի սերվիսը
):
    return service.create_wedding(wedding_data)

@router.get("/{wedding_id}", response_model=WeddingResponse)
def get_wedding(
    wedding_id: int,
    service: WeddingService = Depends(get_wedding_service)
):
    wedding = service.get_wedding(wedding_id)
    if not wedding:
        raise HTTPException(status_code=404, detail="Wedding not found")
    return wedding