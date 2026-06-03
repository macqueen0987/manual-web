"""Public vs admin version visibility (Phase 3 §3.3)."""

from app.models.product import Product
from app.models.version import Version
from app.services import version_service


def _product(db) -> Product:
    product = Product(name="Test", slug="test-product", description=None, sort_order=0)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def _version(
    db,
    product_id: int,
    *,
    slug: str,
    is_latest: bool = False,
    is_published: bool = False,
) -> Version:
    version = Version(
        product_id=product_id,
        name=slug,
        slug=slug,
        is_latest=is_latest,
        is_published=is_published,
    )
    db.add(version)
    db.commit()
    db.refresh(version)
    return version


def test_public_viewer_sees_only_published_versions(db):
    product = _product(db)
    _version(db, product.id, slug="latest", is_latest=True, is_published=False)
    _version(db, product.id, slug="2026.01.01", is_published=True)

    public = version_service.get_versions_for_viewer(db, product.id, include_unpublished=False)
    assert len(public) == 1
    assert public[0].slug == "2026.01.01"


def test_admin_viewer_sees_all_versions(db):
    product = _product(db)
    _version(db, product.id, slug="latest", is_latest=True, is_published=False)
    _version(db, product.id, slug="2026.01.01", is_published=True)

    all_versions = version_service.get_versions_for_viewer(db, product.id, include_unpublished=True)
    assert len(all_versions) == 2


def test_get_version_by_slug_for_viewer_blocks_unpublished(db):
    product = _product(db)
    _version(db, product.id, slug="latest", is_latest=True, is_published=False)

    assert version_service.get_version_by_slug_for_viewer(
        db, product.id, "latest", include_unpublished=False
    ) is None
    assert version_service.get_version_by_slug_for_viewer(
        db, product.id, "latest", include_unpublished=True
    ) is not None


def test_publish_existing_version_marks_snapshot_public(db):
    product = _product(db)
    _version(db, product.id, slug="latest", is_latest=True, is_published=False)
    draft = _version(db, product.id, slug="2026.06.02-draft", is_published=False)

    from app.services import version_service

    published = version_service.publish_existing_version(db, draft)
    assert published.is_published is True
    assert published.published_at is not None


def test_unpublish_version_hides_from_public(db):
    product = _product(db)
    _version(db, product.id, slug="latest", is_latest=True, is_published=False)
    published = _version(db, product.id, slug="2026.05.01", is_published=True)

    from app.services import version_service

    version_service.unpublish_version(db, published)
    assert published.is_published is False
    assert published.published_at is None


def test_public_viewer_never_sees_latest_even_if_published_flag_set(db):
    """Working copy must stay admin-only even when is_published is wrongly true."""
    product = _product(db)
    _version(
        db,
        product.id,
        slug="2026.05.01",
        is_latest=True,
        is_published=True,
    )
    _version(db, product.id, slug="2026.06.03", is_published=True)

    public = version_service.get_versions_for_viewer(db, product.id, include_unpublished=False)
    assert len(public) == 1
    assert public[0].slug == "2026.06.03"

    assert version_service.get_version_by_slug_for_viewer(
        db, product.id, "latest", include_unpublished=False
    ) is None
    assert version_service.get_version_by_slug_for_viewer(
        db, product.id, "2026.05.01", include_unpublished=False
    ) is None


def test_repair_working_copy_flags(db):
    product = _product(db)
    broken = _version(
        db,
        product.id,
        slug="2026.05.01",
        is_latest=True,
        is_published=True,
    )
    assert broken.is_published is True
    fixed = version_service.repair_working_copy_flags(db)
    assert fixed == 1
    db.refresh(broken)
    assert broken.is_published is False


def test_get_version_by_slug_for_viewer_allows_published(db):
    product = _product(db)
    _version(db, product.id, slug="2026.02.01", is_published=True)

    assert version_service.get_version_by_slug_for_viewer(
        db, product.id, "2026.02.01", include_unpublished=False
    ) is not None


def test_delete_version_snapshot(db):
    product = _product(db)
    _version(db, product.id, slug="latest", is_latest=True, is_published=False)
    draft = _version(db, product.id, slug="2026.06.02-draft", is_published=False)

    version_service.delete_version(db, draft, product.slug)
    remaining = version_service.get_versions(db, product.id)
    assert len(remaining) == 1
    assert remaining[0].is_latest is True


def test_reset_working_copy_clears_documents(db):
    from app.models.document import Document

    product = _product(db)
    latest = _version(db, product.id, slug="latest", is_latest=True, is_published=False)
    db.add(
        Document(
            version_id=latest.id,
            parent_id=None,
            title="Extra",
            slug="extra",
            file_path=f"{product.slug}/latest/extra.md",
            sort_order=1,
        )
    )
    db.commit()

    version_service.delete_version(db, latest, product.slug, product=product)
    docs = db.query(Document).filter(Document.version_id == latest.id).all()
    assert len(docs) == 1
    assert docs[0].slug == "index"
