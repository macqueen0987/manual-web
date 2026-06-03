import logging
import re

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import engine
from app.models.document import Document
from app.models.product import Product
from app.models.version import Version
from app.core.product_visibility import ADMIN_ONLY_CATEGORY
from app.services.document_service import read_document_content

logger = logging.getLogger(__name__)

FTS_DDL = """
CREATE VIRTUAL TABLE IF NOT EXISTS document_fts USING fts5(
    title,
    content,
    document_id UNINDEXED,
    version_id UNINDEXED,
    product_id UNINDEXED
)
"""

PUBLIC_VERSION_FILTER = (Version.is_published == True) & (Version.is_latest == False)


def ensure_fts() -> None:
    with engine.begin() as conn:
        conn.execute(text(FTS_DDL))


def _visible_documents_query(db: Session):
    return (
        db.query(Document)
        .join(Version, Document.version_id == Version.id)
        .join(Product, Version.product_id == Product.id)
        .filter(PUBLIC_VERSION_FILTER)
        .filter(
            (Product.category.is_(None))
            | (Product.category != ADMIN_ONLY_CATEGORY)
        )
    )


def rebuild_fts_index(db: Session) -> None:
    ensure_fts()
    docs = _visible_documents_query(db).all()
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM document_fts"))
        for doc in docs:
            content = read_document_content(doc)
            conn.execute(
                text(
                    "INSERT INTO document_fts "
                    "(title, content, document_id, version_id, product_id) "
                    "VALUES (:title, :content, :doc_id, :version_id, :product_id)"
                ),
                {
                    "title": doc.title,
                    "content": content,
                    "doc_id": doc.id,
                    "version_id": doc.version_id,
                    "product_id": doc.version.product_id,
                },
            )
    logger.info("Search FTS index rebuilt (%d documents)", len(docs))


def ensure_fts_populated(db: Session) -> None:
    ensure_fts()
    with engine.connect() as conn:
        count = conn.execute(text("SELECT count(*) FROM document_fts")).scalar() or 0
    if count == 0:
        rebuild_fts_index(db)


def sync_document(db: Session, doc_id: int) -> None:
    ensure_fts()
    doc = db.query(Document).filter(Document.id == doc_id).first()
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM document_fts WHERE document_id = :id"), {"id": doc_id})
        if not doc:
            return
        version = doc.version
        product = version.product if version else None
        if (
            not version
            or not version.is_published
            or version.is_latest
            or not product
            or (product.category or "").strip() == ADMIN_ONLY_CATEGORY
        ):
            return
        content = read_document_content(doc)
        conn.execute(
            text(
                "INSERT INTO document_fts "
                "(title, content, document_id, version_id, product_id) "
                "VALUES (:title, :content, :doc_id, :version_id, :product_id)"
            ),
            {
                "title": doc.title,
                "content": content,
                "doc_id": doc.id,
                "version_id": doc.version_id,
                "product_id": version.product_id,
            },
        )


def remove_document(doc_id: int) -> None:
    ensure_fts()
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM document_fts WHERE document_id = :id"), {"id": doc_id})


def escape_fts_query(q: str) -> str:
    words = re.findall(r"\S+", q.strip())
    if not words:
        return '""'
    return " AND ".join(f'"{word.replace('"', '""')}"*' for word in words)


def search_documents(db: Session, q: str, product_slug: str | None = None) -> list[dict]:
    ensure_fts()
    fts_q = escape_fts_query(q)
    sql = """
        SELECT
            d.id,
            d.title,
            d.slug,
            p.slug AS product_slug,
            p.name AS product_name,
            v.slug AS version_slug,
            v.name AS version_name,
            snippet(document_fts, 1, '…', '…', '…', 32) AS excerpt
        FROM document_fts
        JOIN documents d ON d.id = document_fts.document_id
        JOIN versions v ON v.id = document_fts.version_id
        JOIN products p ON p.id = document_fts.product_id
        WHERE document_fts MATCH :fts_q
          AND v.is_published = 1
          AND v.is_latest = 0
          AND (trim(p.category) IS NULL OR trim(p.category) != :admin_only_category)
    """
    params: dict = {"fts_q": fts_q, "admin_only_category": ADMIN_ONLY_CATEGORY}
    if product_slug:
        sql += " AND p.slug = :product_slug"
        params["product_slug"] = product_slug
    sql += " ORDER BY bm25(document_fts) LIMIT 50"

    with engine.connect() as conn:
        rows = conn.execute(text(sql), params).mappings().all()
    return [dict(row) for row in rows]
