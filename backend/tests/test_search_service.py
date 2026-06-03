"""FTS search indexes and returns only published, public-catalog documents."""

from pathlib import Path

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.core.product_visibility import ADMIN_ONLY_CATEGORY
from app.db.base import Base
from app.models.document import Document
from app.models.product import Product
from app.models.version import Version
from app.services import document_service, search_service


@pytest.fixture
def search_db(monkeypatch, tmp_path):
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(engine, "connect")
    def _pragma(dbapi_conn, _):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    docs_root = tmp_path / "docs"
    docs_root.mkdir()
    monkeypatch.setattr(document_service.settings, "DOCS_DIR", str(docs_root))
    monkeypatch.setattr(search_service, "engine", engine)

    try:
        yield session, docs_root
    finally:
        session.close()


def _write_doc(docs_root: Path, product_slug: str, version_slug: str, slug: str, body: str):
    d = docs_root / product_slug / version_slug
    d.mkdir(parents=True, exist_ok=True)
    path = d / f"{slug}.md"
    path.write_text(body, encoding="utf-8")
    return f"{product_slug}/{version_slug}/{slug}.md"


def test_search_excludes_unpublished_and_admin_only_category(search_db):
    db, docs_root = search_db

    public_product = Product(name="Public", slug="pub", category="Blue")
    db.add(public_product)
    db.flush()

    latest = Version(
        product_id=public_product.id,
        name="latest",
        slug="latest",
        is_latest=True,
        is_published=False,
    )
    published = Version(
        product_id=public_product.id,
        name="2026.01.01",
        slug="2026.01.01",
        is_published=True,
    )
    db.add_all([latest, published])
    db.flush()

    _write_doc(docs_root, "pub", "latest", "draft-only", "# SecretDraft\n\nalpha keyword")
    draft_doc = Document(
        version_id=latest.id,
        title="Draft",
        slug="draft-only",
        file_path="pub/latest/draft-only.md",
        sort_order=0,
    )
    _write_doc(docs_root, "pub", "2026.01.01", "visible", "# Visible\n\nalpha keyword published")
    pub_doc = Document(
        version_id=published.id,
        title="Visible",
        slug="visible",
        file_path="pub/2026.01.01/visible.md",
        sort_order=0,
    )
    db.add_all([draft_doc, pub_doc])

    internal = Product(name="Internal", slug="internal", category=ADMIN_ONLY_CATEGORY)
    db.add(internal)
    db.flush()
    internal_ver = Version(
        product_id=internal.id,
        name="2026.02.01",
        slug="2026.02.01",
        is_published=True,
    )
    db.add(internal_ver)
    db.flush()
    _write_doc(docs_root, "internal", "2026.02.01", "secret", "# Secret\n\nalpha internal")
    db.add(
        Document(
            version_id=internal_ver.id,
            title="Secret",
            slug="secret",
            file_path="internal/2026.02.01/secret.md",
            sort_order=0,
        )
    )
    db.commit()

    search_service.rebuild_fts_index(db)
    hits = search_service.search_documents(db, "alpha")

    assert len(hits) == 1
    assert hits[0]["slug"] == "visible"
    assert hits[0]["product_slug"] == "pub"
    assert hits[0]["version_slug"] == "2026.01.01"


def test_sync_document_skips_unpublished(search_db):
    db, docs_root = search_db
    product = Product(name="P", slug="p", category=None)
    db.add(product)
    db.flush()
    latest = Version(
        product_id=product.id,
        name="latest",
        slug="latest",
        is_latest=True,
        is_published=False,
    )
    db.add(latest)
    db.flush()
    _write_doc(docs_root, "p", "latest", "x", "# X\n\nfindme")
    doc = Document(
        version_id=latest.id,
        title="X",
        slug="x",
        file_path="p/latest/x.md",
        sort_order=0,
    )
    db.add(doc)
    db.commit()

    search_service.sync_document(db, doc.id)
    hits = search_service.search_documents(db, "findme")
    assert hits == []
