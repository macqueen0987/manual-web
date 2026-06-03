from app.core.product_visibility import (
    ADMIN_ONLY_CATEGORY,
    is_admin_only_category,
    is_public_catalog_product,
)
from app.models.product import Product


def test_admin_only_category_exact():
    assert is_admin_only_category("미공개")
    assert is_admin_only_category("  미공개  ")
    assert not is_admin_only_category("Blue")
    assert not is_admin_only_category(None)


def test_public_catalog_product():
    public = Product(
        id=1,
        name="BlueFit",
        slug="bluefit",
        is_active=True,
        category="Blue",
        sort_order=0,
    )
    private = Product(
        id=2,
        name="Internal",
        slug="internal",
        is_active=True,
        category=ADMIN_ONLY_CATEGORY,
        sort_order=0,
    )
    assert is_public_catalog_product(public)
    assert not is_public_catalog_product(private)
