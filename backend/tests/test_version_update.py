from app.models.product import Product
from app.models.version import Version
from app.schemas.version import VersionUpdate
from app.services.version_service import update_version


def _product(db) -> Product:
    product = Product(name="Test", slug="test-version-update", description=None, sort_order=0)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def test_update_latest_display_name(db):
    product = _product(db)
    latest = Version(
        product_id=product.id,
        name="latest",
        slug="latest",
        is_latest=True,
        is_published=False,
    )
    db.add(latest)
    db.commit()
    db.refresh(latest)

    updated = update_version(db, latest, VersionUpdate(name="작업 중"))
    assert updated.name == "작업 중"
    assert updated.slug == "latest"
    assert updated.is_latest is True
