from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

router = APIRouter(tags=["Frontend Pages"])
templates = Jinja2Templates(directory="templates")

@router.get("/", response_class=HTMLResponse)
def get_home_page(request: Request):
    """Գլխավոր էջը, որտեղ կլինի հարսանիք ընտրելը կամ ստեղծելը"""
    return templates.TemplateResponse("index.html", {"request": request})

@router.get("/wedding/{wedding_id}/manage", response_class=HTMLResponse)
def get_wedding_manage_page(wedding_id: int, request: Request):
    """Հիմնական էջը, որտեղ կատարվելու է հյուրերի լրացումը և նստեցումը"""
    return templates.TemplateResponse("manage.html", {"request": request, "wedding_id": wedding_id})