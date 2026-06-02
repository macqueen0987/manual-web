from sqlalchemy.orm import Session

from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate
from app.services.bootstrap_service import bootstrap_product


def get_products(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Product).filter(Product.is_active == True).order_by(Product.sort_order).offset(skip).limit(limit).all()


def get_product_by_slug(db: Session, slug: str):
    return db.query(Product).filter(Product.slug == slug).first()


def get_product(db: Session, product_id: int):
    return db.query(Product).filter(Product.id == product_id).first()


def create_product(db: Session, obj_in: ProductCreate):
    db_obj = Product(
        name=obj_in.name,
        slug=obj_in.slug,
        description=obj_in.description,
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
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete_product(db: Session, db_obj: Product):
    db.delete(db_obj)
    db.commit()
    return db_obj
