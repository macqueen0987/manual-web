from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.site import HomeContent
from app.services import site_service

router = APIRouter()


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
