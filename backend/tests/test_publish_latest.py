"""publish_latest: snapshot working copy to a published version."""

from pathlib import Path

import pytest

from app.models.document import Document
from app.models.product import Product
from app.models.version import Version
from app.schemas.version import VersionPublish
from app.services import document_service, version_service


@pytest.fixture
def publish_paths(monkeypatch, tmp_path):
    docs_root = tmp_path / "docs"
    monkeypatch.setattr(version_service.settings, "DOCS_DIR", str(docs_root))
    monkeypatch.setattr(document_service.settings, "DOCS_DIR", str(docs_root))
    return docs_root


def _seed_latest(db, product_slug: str = "demo-pub"):
    product = Product(name="Demo", slug=product_slug, description=None)
    db.add(product)
    db.flush()
    latest = Version(
        product_id=product.id,
        name="작업 중",
        slug="latest",
        is_latest=True,
        is_published=False,
    )
    db.add(latest)
    db.flush()
    return product, latest


def test_publish_latest_creates_published_snapshot(db, publish_paths):
    docs_root = publish_paths
    product, latest = _seed_latest(db)

    latest_dir = docs_root / product.slug / "latest"
    latest_dir.mkdir(parents=True)
    (latest_dir / "guide.md").write_text("# Guide\n\nBody\n", encoding="utf-8")

    doc = Document(
        version_id=latest.id,
        parent_id=None,
        title="Guide",
        slug="guide",
        file_path=f"{product.slug}/latest/guide.md",
        sort_order=0,
    )
    db.add(doc)
    db.commit()

    published = version_service.publish_latest(
        db,
        product.id,
        product.slug,
        VersionPublish(name="2026.06.03", slug="f4a15ed7"),
    )

    assert published.is_published is True
    assert published.is_latest is False
    assert published.slug == "f4a15ed7"
    assert published.name == "2026.06.03"
    assert published.base_version_id == latest.id

    snapshot_dir = docs_root / product.slug / "f4a15ed7"
    assert snapshot_dir.is_dir()
    assert (snapshot_dir / "guide.md").read_text(encoding="utf-8") == "# Guide\n\nBody\n"

    cloned = db.query(Document).filter(Document.version_id == published.id).all()
    assert len(cloned) == 1
    assert cloned[0].slug == "guide"
    assert cloned[0].file_path == f"{product.slug}/f4a15ed7/guide.md"

    latest_docs = db.query(Document).filter(Document.version_id == latest.id).all()
    assert len(latest_docs) == 1
    assert latest_docs[0].slug == "index"
    assert not (latest_dir / "guide.md").exists()


def test_publish_latest_rejects_duplicate_slug(db, publish_paths):
    docs_root = publish_paths
    product, latest = _seed_latest(db, "demo-dup")
    (docs_root / product.slug / "latest").mkdir(parents=True)

    version_service.publish_latest(
        db,
        product.id,
        product.slug,
        VersionPublish(name="A", slug="snap-a"),
    )

    with pytest.raises(ValueError, match="already exists"):
        version_service.publish_latest(
            db,
            product.id,
            product.slug,
            VersionPublish(name="B", slug="snap-a"),
        )
