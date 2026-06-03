"""Products in category 「미공개」 are visible only to authenticated admins."""

from fastapi import HTTPException, status

from app.models.product import Product
from app.models.user import User

ADMIN_ONLY_CATEGORY = "미공개"


def normalize_category(category: str | None) -> str | None:
    if category is None:
        return None
    trimmed = category.strip()
    return trimmed or None


def is_admin_only_category(category: str | None) -> bool:
    return normalize_category(category) == ADMIN_ONLY_CATEGORY


def is_public_catalog_product(product: Product) -> bool:
    return bool(product.is_active) and not is_admin_only_category(product.category)


def require_product_for_viewer(
    product: Product | None,
    admin: User | None,
) -> Product:
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    if admin is not None:
        return product
    if not is_public_catalog_product(product):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product
