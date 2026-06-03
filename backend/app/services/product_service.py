import shutil
from pathlib import Path

from sqlalchemy import case, func, or_
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.product_visibility import ADMIN_ONLY_CATEGORY, normalize_category
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate
from app.schemas.product import ProductOut
from app.services import version_service
from app.services.bootstrap_service import bootstrap_product


def product_to_out(db: Session, product: Product) -> ProductOut:
    has_public = version_service.count_public_versions(db, product.id) > 0
    return ProductOut.model_validate(product).model_copy(
        update={"has_public_docs": has_public}
    )

settings = get_settings()


def _public_catalog_filter():
    """Exclude admin-only category 「미공개」 from public listings."""
    return or_(
        Product.category.is_(None),
        func.trim(Product.category) != ADMIN_ONLY_CATEGORY,
    )


def get_products(db: Session, skip: int = 0, limit: int = 100, *, include_admin_only: bool = False):
    category_rank = case((Product.category.is_(None), 1), else_=0)
    q = db.query(Product).filter(Product.is_active == True)
    if not include_admin_only:
        q = q.filter(_public_catalog_filter())
    return (
        q.order_by(category_rank, Product.category, Product.sort_order, Product.name)
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_product_by_slug(db: Session, slug: str):
    return db.query(Product).filter(Product.slug == slug).first()


def get_product(db: Session, product_id: int):
    return db.query(Product).filter(Product.id == product_id).first()


def create_product(db: Session, obj_in: ProductCreate):
    category = normalize_category(obj_in.category)
    icon_url = (obj_in.icon_url or "").strip() or None
    db_obj = Product(
        name=obj_in.name,
        slug=obj_in.slug,
        description=obj_in.description,
        category=category or None,
        icon_url=icon_url,
        sort_order=obj_in.sort_order,
        is_active=obj_in.is_active,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    bootstrap_product(db, db_obj)
    return db_obj


def update_product(db: Session, db_obj: Product, obj_in: ProductUpdate):
    update_data = obj_in.model_dump(exclude_unset=True)
    if "category" in update_data:
        update_data["category"] = normalize_category(update_data["category"])
    if "icon_url" in update_data:
        raw = update_data["icon_url"]
        update_data["icon_url"] = (raw or "").strip() or None
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete_product(db: Session, db_obj: Product):
    docs_dir = Path(settings.DOCS_DIR) / db_obj.slug
    uploads_dir = Path(settings.UPLOAD_DIR) / db_obj.slug
    if docs_dir.exists():
        shutil.rmtree(docs_dir)
    if uploads_dir.exists():
        shutil.rmtree(uploads_dir)

    db.delete(db_obj)
    db.commit()
    return db_obj
