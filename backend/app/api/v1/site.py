from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.site import HomeContent, HomeHeroTemplate, SiteBranding
from app.services import brand_service, hero_template_service, site_service

router = APIRouter()


@router.get("/branding", response_model=SiteBranding)
def get_site_branding():
    return brand_service.get_site_branding()


@router.get("/home-hero", response_model=HomeHeroTemplate)
def get_home_hero_template(locale: str | None = Query(None)):
    return hero_template_service.get_home_hero_template(locale or "")


@router.get("/home", response_model=HomeContent)
def get_home_content(db: Session = Depends(get_db)):
    return site_service.get_home_content(db)


@router.put("/home", response_model=HomeContent)
def update_home_content(
    body: HomeContent,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin_user),
):
    return site_service.save_home_content(db, body)
