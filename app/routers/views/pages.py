from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from core.database import get_db
from app.repositories.wedding import WeddingRepository

router = APIRouter(tags=["Frontend Pages"])
templates = Jinja2Templates(directory="templates")


@router.get("/", response_class=HTMLResponse)
def get_home_page(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


def _get_wedding_or_raise(slug: str, token: str, db: Session):
    """Slug + token ստուգում — shared helper desktop/mobile route-երի համար։"""
    repo    = WeddingRepository(db)
    wedding = repo.get_by_slug(slug)
    if not wedding:
        raise HTTPException(status_code=404, detail="Հարսանիք չի գտնվել")
    import secrets
    if not secrets.compare_digest(wedding.token, token):
        raise HTTPException(status_code=403, detail="Մուտքն արգելված է")
    return wedding


@router.get("/wedding/{slug}/{token}/manage", response_class=HTMLResponse)
def get_wedding_manage_page(
    slug: str,
    token: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Desktop կառավարման էջ։
    Manage.html-ի <head>-ում JS redirect կա → mobile օգտ. ավտոմատ
    կուղղվեն /mobile-manage-ի վրա։
    """
    wedding = _get_wedding_or_raise(slug, token, db)
    return templates.TemplateResponse("manage.html", {
        "request":       request,
        "wedding_id":    wedding.id,
        "wedding_token": wedding.token,
    })


@router.get("/wedding/{slug}/{token}/mobile-manage", response_class=HTMLResponse)
def get_wedding_mobile_manage_page(
    slug: str,
    token: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Mobile կառավարման էջ (3-tab, bottom-nav, touch-friendly)։
    Նույն token logic — security անփոփոխ։
    """
    wedding = _get_wedding_or_raise(slug, token, db)
    return templates.TemplateResponse("mobile-manage.html", {
        "request":       request,
        "wedding_id":    wedding.id,
        "wedding_token": wedding.token,
    })