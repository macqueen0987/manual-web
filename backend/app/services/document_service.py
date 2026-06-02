from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.paths import resolve_doc_path, to_stored_doc_path
from app.models.document import Document
from app.models.version import Version
from app.schemas.document import DocumentCreate, DocumentUpdate

settings = get_settings()


def get_documents(db: Session, version_id: int):
    return (
        db.query(Document)
        .filter(Document.version_id == version_id, Document.parent_id == None)
        .order_by(Document.sort_order)
        .all()
    )


def get_document(db: Session, document_id: int):
    return db.query(Document).filter(Document.id == document_id).first()


def get_document_by_slug(db: Session, version_id: int, slug: str):
    return db.query(Document).filter(Document.version_id == version_id, Document.slug == slug).first()


def build_tree(documents: list[Document]) -> list[dict]:
    result = []
    for doc in documents:
        item = {
            "id": doc.id,
            "version_id": doc.version_id,
            "parent_id": doc.parent_id,
            "title": doc.title,
            "slug": doc.slug,
            "file_path": doc.file_path,
            "sort_order": doc.sort_order,
            "created_at": doc.created_at,
            "updated_at": doc.updated_at,
            "children": build_tree(doc.children) if hasattr(doc, "children") else [],
        }
        result.append(item)
    return result


def create_document(db: Session, obj_in: DocumentCreate, product_slug: str, version_slug: str):
    # Determine file path
    docs_dir = Path(settings.DOCS_DIR) / product_slug / version_slug
    docs_dir.mkdir(parents=True, exist_ok=True)

    # Build file path based on parent if exists
    if obj_in.parent_id:
        parent = get_document(db, obj_in.parent_id)
        parent_dir = resolve_doc_path(parent.file_path).parent
        file_path = parent_dir / f"{obj_in.slug}.md"
    else:
        file_path = docs_dir / f"{obj_in.slug}.md"

    file_path.write_text(obj_in.content or "", encoding="utf-8")
    stored_path = to_stored_doc_path(file_path)

    db_obj = Document(
        version_id=obj_in.version_id,
        parent_id=obj_in.parent_id,
        title=obj_in.title,
        slug=obj_in.slug,
        file_path=stored_path,
        sort_order=obj_in.sort_order,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_document(db: Session, db_obj: Document, obj_in: DocumentUpdate, product_slug: str, version_slug: str):
    update_data = obj_in.model_dump(exclude_unset=True)
    content = update_data.pop("content", None)

    # Update file content if provided
    if content is not None:
        resolve_doc_path(db_obj.file_path).write_text(content, encoding="utf-8")

    # Update parent
    if "parent_id" in update_data:
        db_obj.parent_id = update_data.pop("parent_id")

    # Update other fields
    for field, value in update_data.items():
        setattr(db_obj, field, value)

    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete_document(db: Session, db_obj: Document):
    file_path = resolve_doc_path(db_obj.file_path)
    if file_path.exists():
        file_path.unlink()

    db.delete(db_obj)
    db.commit()
    return db_obj


def read_document_content(db_obj: Document) -> str:
    file_path = resolve_doc_path(db_obj.file_path)
    if not file_path.exists():
        return ""
    return file_path.read_text(encoding="utf-8")
