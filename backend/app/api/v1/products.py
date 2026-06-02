from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_user, get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.product import ProductCreate, ProductOut, ProductUpdate
from app.services import product_service

router = APIRouter()


@router.get("", response_model=list[ProductOut])
def list_products(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    return product_service.get_products(db, skip=skip, limit=limit)


@router.get("/{slug}", response_model=ProductOut)
def get_product(slug: str, db: Session = Depends(get_db)):
    product = product_service.get_product_by_slug(db, slug)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


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
