from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.rate_limit import rate_limit
from app.db.session import get_db
from app.models.product import Product
from app.models.user import User
from app.models.version import Version
from app.schemas.setup import SetupInitRequest
from app.services.auth_service import create_user
from app.services.product_service import create_product

router = APIRouter()


@router.get("/status")
def get_setup_status(
    db: Session = Depends(get_db),
    _rate: None = rate_limit(max_calls=60, window_seconds=60, scope="setup_status"),
):
    user_count = db.query(User).count()
    product_count = db.query(Product).count()
    return {"is_setup_complete": user_count > 0 and product_count > 0}


@router.post("/init")
def setup_init(
    body: SetupInitRequest,
    db: Session = Depends(get_db),
    _rate: None = rate_limit(max_calls=5, window_seconds=3600, scope="setup_init"),
):
    user_count = db.query(User).count()
    if user_count > 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Setup already completed",
        )

    admin_user = create_user(db, body.admin, is_superuser=True)
    db_product = create_product(db, body.product)
    latest_version = (
        db.query(Version)
        .filter(Version.product_id == db_product.id, Version.is_latest == True)
        .first()
    )

    return {
        "message": "Setup completed successfully",
        "admin_id": admin_user.id,
        "product_id": db_product.id,
        "version_id": latest_version.id if latest_version else None,
    }
