from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_user
from app.db.session import get_db
from app.models.product import Product
from app.models.user import User
from app.models.version import Version
from app.schemas.version import VersionCreate, VersionOut, VersionPublish
from app.services import product_service, version_service

router = APIRouter()


@router.get("/products/{product_slug}/versions", response_model=list[VersionOut])
def list_versions(product_slug: str, db: Session = Depends(get_db)):
    product = product_service.get_product_by_slug(db, product_slug)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return version_service.get_versions(db, product.id)


@router.get("/products/{product_slug}/versions/{version_slug}", response_model=VersionOut)
def get_version(product_slug: str, version_slug: str, db: Session = Depends(get_db)):
    product = product_service.get_product_by_slug(db, product_slug)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    version = version_service.get_version_by_slug(db, product.id, version_slug)
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")
    return version


@router.post("/versions", response_model=VersionOut, status_code=status.HTTP_201_CREATED)
def create_version(
    request: VersionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    product = product_service.get_product(db, request.product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    existing = version_service.get_version_by_slug(db, request.product_id, request.slug)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Version with this slug already exists for this product",
        )
    return version_service.create_version(db, request)


@router.post("/products/{product_slug}/versions/publish", response_model=VersionOut)
def publish_latest_version(
    product_slug: str,
    request: VersionPublish,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    product = product_service.get_product_by_slug(db, product_slug)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    try:
        return version_service.publish_latest(db, product.id, product.slug, request)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/versions/{version_id}")
def delete_version(
    version_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    version = version_service.get_version(db, version_id)
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")
    product = product_service.get_product(db, version.product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    try:
        version_service.delete_version(db, version, product.slug)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return {"message": "Version deleted successfully"}
