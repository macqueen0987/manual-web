"""Product/version bootstrap: latest dir, index.md, and index document row."""

from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.paths import to_stored_doc_path
from app.models.document import Document
from app.models.product import Product
from app.models.version import Version

settings = get_settings()


def ensure_latest_version(db: Session, product: Product) -> Version:
    latest = (
        db.query(Version)
        .filter(Version.product_id == product.id, Version.is_latest == True)
        .first()
    )
    if latest:
        return latest

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
    return latest


def ensure_index_document(db: Session, product: Product, version: Version) -> Document:
    docs_dir = Path(settings.DOCS_DIR) / product.slug / "latest"
    docs_dir.mkdir(parents=True, exist_ok=True)
    index_path = docs_dir / "index.md"

    existing = (
        db.query(Document)
        .filter(Document.version_id == version.id, Document.slug == "index")
        .first()
    )
    if existing:
        if not index_path.exists():
            index_path.write_text(
                f"# {product.name}\n\nWelcome to the documentation.\n",
                encoding="utf-8",
            )
        return existing

    if not index_path.exists():
        index_path.write_text(
            f"# {product.name}\n\nWelcome to the documentation.\n",
            encoding="utf-8",
        )

    doc = Document(
        version_id=version.id,
        parent_id=None,
        title="Home",
        slug="index",
        file_path=to_stored_doc_path(index_path),
        sort_order=0,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def bootstrap_product(db: Session, product: Product) -> None:
    version = ensure_latest_version(db, product)
    ensure_index_document(db, product, version)
