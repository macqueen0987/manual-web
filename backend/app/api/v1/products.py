from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_user, get_optional_admin_user
from app.models.user import User
from app.core.product_visibility import require_product_for_viewer
from app.db.session import get_db
from app.schemas.product import ProductCreate, ProductOut, ProductUpdate
from app.schemas.version import VersionOut
from app.services import product_service, version_service

router = APIRouter()


@router.get("", response_model=list[ProductOut])
def list_products(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    admin: User | None = Depends(get_optional_admin_user),
):
    products = product_service.get_products(
        db, skip=skip, limit=limit, include_admin_only=admin is not None
    )
    return [product_service.product_to_out(db, p) for p in products]


@router.get("/with-versions")
def list_products_with_versions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    products = product_service.get_products(db, include_admin_only=True)
    return [
        {
            "product": ProductOut.model_validate(product),
            "versions": [
                VersionOut.model_validate(version)
                for version in version_service.get_versions(db, product.id)
            ],
        }
        for product in products
    ]


@router.get("/{slug}", response_model=ProductOut)
def get_product(
    slug: str,
    db: Session = Depends(get_db),
    admin: User | None = Depends(get_optional_admin_user),
):
    product = product_service.get_product_by_slug(db, slug)
    product = require_product_for_viewer(product, admin)
    return product_service.product_to_out(db, product)


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    request: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    existing = product_service.get_product_by_slug(db, request.slug)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product with this slug already exists",
        )
    return product_service.create_product(db, request)


@router.put("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    request: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    product = product_service.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product_service.update_product(db, product, request)


@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    product = product_service.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    product_service.delete_product(db, product)
    return {"message": "Product deleted successfully"}
