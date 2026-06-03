"""Automatic orphan upload cleanup after document writes."""

from pathlib import Path

import pytest

from app.core.config import get_settings
from app.models.document import Document
from app.models.product import Product
from app.models.version import Version
from app.schemas.document import DocumentUpdate
from app.services import document_service, media_service

settings = get_settings()


@pytest.fixture
def doc_paths(monkeypatch, tmp_path):
    docs_root = tmp_path / "docs"
    uploads_root = tmp_path / "uploads"
    monkeypatch.setattr(document_service.settings, "DOCS_DIR", str(docs_root))
    monkeypatch.setattr(media_service.settings, "DOCS_DIR", str(docs_root))
    monkeypatch.setattr(media_service.settings, "UPLOAD_DIR", str(uploads_root))
    return docs_root, uploads_root


def test_update_document_deletes_orphan_upload(db, doc_paths):
    docs_root, uploads_root = doc_paths
    product = Product(name="Demo", slug="demo", description=None)
    db.add(product)
    db.flush()
    version = Version(
        product_id=product.id,
        name="v1",
        slug="v1",
        is_latest=False,
        is_published=True,
    )
    db.add(version)
    db.flush()

    docs_dir = docs_root / "demo" / "v1"
    docs_dir.mkdir(parents=True)
    md_path = docs_dir / "page.md"
    md_path.write_text("# Page\n", encoding="utf-8")

    upload_dir = uploads_root / "demo" / "v1"
    upload_dir.mkdir(parents=True)
    kept = upload_dir / "kept.png"
    orphan = upload_dir / "orphan.png"
    kept.write_bytes(b"1")
    orphan.write_bytes(b"2")

    doc = Document(
        version_id=version.id,
        parent_id=None,
        title="Page",
        slug="page",
        file_path="demo/v1/page.md",
        sort_order=0,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    body = f"# Page\n\n![x](/uploads/demo/v1/{kept.name})\n"
    document_service.update_document(
        db,
        doc,
        DocumentUpdate(content=body),
        product_slug="demo",
        version_slug="v1",
    )

    assert kept.is_file()
    assert not orphan.is_file()


def test_delete_document_triggers_orphan_cleanup(db, doc_paths):
    docs_root, uploads_root = doc_paths
    product = Product(name="Demo", slug="demo2", description=None)
    db.add(product)
    db.flush()
    version = Version(
        product_id=product.id,
        name="Latest",
        slug="latest",
        is_latest=True,
        is_published=False,
    )
    db.add(version)
    db.flush()

    docs_dir = docs_root / "demo2" / "latest"
    docs_dir.mkdir(parents=True)
    (docs_dir / "only.md").write_text(
        "# Only\n\n![i](/uploads/demo2/latest/ref.png)\n",
        encoding="utf-8",
    )

    upload_dir = uploads_root / "demo2" / "latest"
    upload_dir.mkdir(parents=True)
    (upload_dir / "ref.png").write_bytes(b"1")
    orphan = upload_dir / "unused.png"
    orphan.write_bytes(b"2")

    doc = Document(
        version_id=version.id,
        parent_id=None,
        title="Only",
        slug="only",
        file_path="demo2/latest/only.md",
        sort_order=0,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    document_service.delete_document(
        db, doc, product_slug="demo2", version_slug="latest"
    )

    assert not orphan.is_file()
    assert not (upload_dir / "ref.png").is_file()
