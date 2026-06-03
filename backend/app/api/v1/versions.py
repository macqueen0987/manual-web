from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_user, get_optional_admin_user
from app.core.product_visibility import require_product_for_viewer
from app.db.session import get_db
from app.models.product import Product
from app.models.user import User
from app.models.version import Version
from app.schemas.version import VersionCreate, VersionOut, VersionPublish, VersionUpdate
from app.models.document import Document
from app.services import product_service, search_service, version_service

router = APIRouter()


@router.get("/products/{product_slug}/versions", response_model=list[VersionOut])
def list_versions(
    product_slug: str,
    db: Session = Depends(get_db),
    admin: User | None = Depends(get_optional_admin_user),
):
    product = product_service.get_product_by_slug(db, product_slug)
    product = require_product_for_viewer(product, admin)
    return version_service.get_versions_for_viewer(
        db, product.id, include_unpublished=admin is not None
    )


@router.get("/products/{product_slug}/versions/{version_slug}", response_model=VersionOut)
def get_version(
    product_slug: str,
    version_slug: str,
    db: Session = Depends(get_db),
    admin: User | None = Depends(get_optional_admin_user),
):
    product = product_service.get_product_by_slug(db, product_slug)
    product = require_product_for_viewer(product, admin)
    version = version_service.get_version_by_slug_for_viewer(
        db, product.id, version_slug, include_unpublished=admin is not None
    )
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
    try:
        return version_service.create_version(db, request, product.slug)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


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


@router.put("/versions/{version_id}", response_model=VersionOut)
def update_version(
    version_id: int,
    request: VersionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    version = version_service.get_version(db, version_id)
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")
    if not request.model_dump(exclude_unset=True):
        return version
    return version_service.update_version(db, version, request)


@router.post("/versions/{version_id}/publish", response_model=VersionOut)
def publish_version_snapshot(
    version_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    version = version_service.get_version(db, version_id)
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")
    try:
        published = version_service.publish_existing_version(db, version)
        docs = db.query(Document).filter(Document.version_id == published.id).all()
        for doc in docs:
            search_service.sync_document(db, doc.id)
        return published
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/versions/{version_id}/unpublish", response_model=VersionOut)
def unpublish_version_snapshot(
    version_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    version = version_service.get_version(db, version_id)
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")
    try:
        unpublished = version_service.unpublish_version(db, version)
        docs = db.query(Document).filter(Document.version_id == unpublished.id).all()
        for doc in docs:
            search_service.remove_document(doc.id)
        return unpublished
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
        version_service.delete_version(db, version, product.slug, product=product)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return {"message": "Version deleted successfully"}
