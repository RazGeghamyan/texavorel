from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.schemas.table import TableCreate, TableResponse
from app.services.table import TableService
from app.dependencies import get_table_service  # <-- Օգտագործում ենք նոր դիպենդենսին

router = APIRouter(prefix="/api/v1/tables", tags=["Tables"])

@router.post("/", response_model=TableResponse)
def create_table(
    table_data: TableCreate,
    service: TableService = Depends(get_table_service)
):
    return service.create_table(table_data)

@router.get("/wedding/{wedding_id}", response_model=List[TableResponse])
def get_wedding_tables(
    wedding_id: int,
    service: TableService = Depends(get_table_service)
):
    return service.get_wedding_tables(wedding_id)

@router.get("/{table_id}/available-seats")
def get_available_seats(
    table_id: int,
    service: TableService = Depends(get_table_service)
):
    seats = service.get_table_available_seats(table_id)
    return {"table_id": table_id, "available_seats": seats}

@router.delete("/{table_id}")
def delete_table(
    table_id: int,
    service: TableService = Depends(get_table_service)
):
    if not service.delete_table(table_id):
        raise HTTPException(status_code=404, detail="Table not found")
    return {"message": "Table deleted successfully"}