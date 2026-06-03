import hashlib
import re
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.paths import resolve_doc_path, to_stored_doc_path
from app.models.document import Document
from app.schemas.document import DocumentCreate, DocumentUpdate

settings = get_settings()
DEFAULT_LOCALE = "en"
SUPPORTED_LOCALES = {"en", "ko"}


def resolve_localized_path(base_path: Path, locale: str | None) -> Path:
    """Resolve localized markdown file if present, else default path."""
    if not locale or locale == DEFAULT_LOCALE:
        return base_path

    in_locale_dir = base_path.parent / locale / base_path.name
    if in_locale_dir.is_file():
        return in_locale_dir

    suffixed = base_path.with_name(f"{base_path.stem}.{locale}{base_path.suffix}")
    if suffixed.is_file():
        return suffixed

    return base_path


def localized_write_path(base_path: Path, locale: str | None) -> Path:
    """Target path for writing content (creates locale subdir when needed)."""
    if not locale or locale == DEFAULT_LOCALE:
        return base_path
    target = base_path.parent / locale / base_path.name
    target.parent.mkdir(parents=True, exist_ok=True)
    return target


def extract_title_from_markdown(content: str) -> str | None:
    for line in content.splitlines():
        match = re.match(r"^#\s+(.+)$", line.strip())
        if match:
            return match.group(1).strip()
    return None


def sync_markdown_title(content: str, title: str) -> str:
    lines = content.splitlines()
    for index, line in enumerate(lines):
        if re.match(r"^#\s+", line.strip()):
            lines[index] = f"# {title}"
            return "\n".join(lines)
    trimmed = content.lstrip("\n")
    if trimmed:
        return f"# {title}\n\n{trimmed}"
    return f"# {title}\n"


def document_display_title(doc: Document, locale: str | None = None) -> str:
    if locale and locale != DEFAULT_LOCALE and content_locale_available(doc, locale):
        content = read_document_content(doc, locale)
        heading = extract_title_from_markdown(content)
        if heading:
            return heading
    return doc.title


def slugify_title(title: str) -> str:
    slug = title.lower().strip()
    slug = re.sub(r"\s+", "-", slug)
    slug = re.sub(r"[^a-z0-9._-]", "", slug)
    if slug:
        return slug
    digest = hashlib.sha256(title.encode("utf-8")).hexdigest()[:8]
    return f"page-{digest}"


def unique_slug(db: Session, version_id: int, base: str, exclude_id: int | None = None) -> str:
    slug = base
    suffix = 2
    while True:
        existing = get_document_by_slug(db, version_id, slug)
        if not existing or (exclude_id is not None and existing.id == exclude_id):
            return slug
        slug = f"{base}-{suffix}"
        suffix += 1


def generate_slug_from_title(db: Session, version_id: int, title: str) -> str:
    return unique_slug(db, version_id, slugify_title(title))


def get_siblings(db: Session, version_id: int, parent_id: int | None) -> list[Document]:
    query = db.query(Document).filter(Document.version_id == version_id)
    if parent_id is None:
        query = query.filter(Document.parent_id.is_(None))
    else:
        query = query.filter(Document.parent_id == parent_id)
    return query.order_by(Document.sort_order, Document.id).all()


def next_sort_order(db: Session, version_id: int, parent_id: int | None) -> int:
    siblings = get_siblings(db, version_id, parent_id)
    if not siblings:
        return 0
    return max(s.sort_order for s in siblings) + 1


def collect_descendant_ids(db: Session, doc_id: int) -> set[int]:
    ids: set[int] = set()
    stack = [doc_id]
    while stack:
        current = stack.pop()
        children = db.query(Document).filter(Document.parent_id == current).all()
        for child in children:
            if child.id in ids:
                continue
            ids.add(child.id)
            stack.append(child.id)
    return ids


def reposition_document(
    db: Session,
    doc: Document,
    parent_id: int | None,
    sort_order: int,
) -> Document:
    if parent_id is not None:
        if parent_id == doc.id:
            raise ValueError("Cannot move a document under itself")
        parent = get_document(db, parent_id)
        if not parent:
            raise ValueError("Parent document not found")
        if parent.version_id != doc.version_id:
            raise ValueError("Cannot move document to a different version")
        if parent_id in collect_descendant_ids(db, doc.id):
            raise ValueError("Cannot move a document under its own descendant")

    siblings = [s for s in get_siblings(db, doc.version_id, parent_id) if s.id != doc.id]
    index = min(sort_order, len(siblings))
    siblings.insert(index, doc)
    doc.parent_id = parent_id
    for i, sibling in enumerate(siblings):
        sibling.sort_order = i
    db.commit()
    db.refresh(doc)
    return doc


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


def _sorted_children(doc: Document) -> list[Document]:
    if not hasattr(doc, "children") or not doc.children:
        return []
    return sorted(doc.children, key=lambda d: (d.sort_order, d.id))


def build_tree(documents: list[Document], locale: str | None = None) -> list[dict]:
    result = []
    for doc in documents:
        item = {
            "id": doc.id,
            "version_id": doc.version_id,
            "parent_id": doc.parent_id,
            "title": document_display_title(doc, locale),
            "slug": doc.slug,
            "file_path": doc.file_path,
            "sort_order": doc.sort_order,
            "created_at": doc.created_at,
            "updated_at": doc.updated_at,
            "locale_available": content_locale_available(doc, locale),
            "children": build_tree(_sorted_children(doc), locale),
        }
        result.append(item)
    return result


def create_document(
    db: Session,
    obj_in: DocumentCreate,
    product_slug: str,
    version_slug: str,
    locale: str | None = None,
):
    slug = obj_in.slug or generate_slug_from_title(db, obj_in.version_id, obj_in.title)
    sort_order = (
        obj_in.sort_order
        if obj_in.sort_order is not None
        else next_sort_order(db, obj_in.version_id, obj_in.parent_id)
    )

    docs_dir = Path(settings.DOCS_DIR) / product_slug / version_slug
    docs_dir.mkdir(parents=True, exist_ok=True)

    if obj_in.parent_id:
        parent = get_document(db, obj_in.parent_id)
        parent_dir = resolve_doc_path(parent.file_path).parent
        file_path = parent_dir / f"{slug}.md"
    else:
        file_path = docs_dir / f"{slug}.md"

    content = obj_in.content or ""
    if obj_in.title and not extract_title_from_markdown(content):
        content = sync_markdown_title(content, obj_in.title)

    write_path = localized_write_path(file_path, locale)
    write_path.write_text(content, encoding="utf-8")

    if locale and locale != DEFAULT_LOCALE:
        stored_path = to_stored_doc_path(file_path)
    else:
        stored_path = to_stored_doc_path(write_path)

    db_obj = Document(
        version_id=obj_in.version_id,
        parent_id=obj_in.parent_id,
        title=obj_in.title,
        slug=slug,
        file_path=stored_path,
        sort_order=sort_order,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    from app.services import search_service

    search_service.sync_document(db, db_obj.id)
    return db_obj


def update_document(
    db: Session,
    db_obj: Document,
    obj_in: DocumentUpdate,
    product_slug: str,
    version_slug: str,
    locale: str | None = None,
):
    update_data = obj_in.model_dump(exclude_unset=True)
    content = update_data.pop("content", None)
    title = update_data.pop("title", None)
    req_locale = update_data.pop("locale", None)
    active_locale = req_locale or locale

    base_path = resolve_doc_path(db_obj.file_path)
    is_default_locale = not active_locale or active_locale == DEFAULT_LOCALE

    if content is not None or (title and not is_default_locale):
        body = content if content is not None else read_document_content(db_obj, active_locale)
        if title:
            body = sync_markdown_title(body, title)
        write_path = localized_write_path(base_path, active_locale)
        write_path.write_text(body, encoding="utf-8")
    elif title and is_default_locale:
        default_content = read_document_content(db_obj, DEFAULT_LOCALE)
        if default_content:
            resolve_doc_path(db_obj.file_path).write_text(
                sync_markdown_title(default_content, title),
                encoding="utf-8",
            )

    if title and is_default_locale:
        db_obj.title = title

    if "parent_id" in update_data:
        new_parent_id = update_data.pop("parent_id")
        if new_parent_id != db_obj.parent_id:
            sort_order = next_sort_order(db, db_obj.version_id, new_parent_id)
            reposition_document(db, db_obj, new_parent_id, sort_order)
            db.refresh(db_obj)

    for field, value in update_data.items():
        setattr(db_obj, field, value)

    db.commit()
    db.refresh(db_obj)
    from app.services import search_service

    search_service.sync_document(db, db_obj.id)
    return db_obj


def delete_document(db: Session, db_obj: Document):
    child = db.query(Document).filter(Document.parent_id == db_obj.id).first()
    if child:
        raise ValueError("Cannot delete a document that has child pages")

    base_path = resolve_doc_path(db_obj.file_path)
    if base_path.exists():
        base_path.unlink()

    for locale in SUPPORTED_LOCALES - {DEFAULT_LOCALE}:
        localized = resolve_localized_path(base_path, locale)
        if localized.is_file() and localized != base_path:
            localized.unlink()
        loc_dir = base_path.parent / locale
        if loc_dir.is_dir() and not any(loc_dir.iterdir()):
            loc_dir.rmdir()

    db.delete(db_obj)
    db.commit()
    from app.services import search_service

    search_service.remove_document(db_obj.id)
    return db_obj


def read_document_content(db_obj: Document, locale: str | None = None) -> str:
    file_path = resolve_localized_path(resolve_doc_path(db_obj.file_path), locale)
    if not file_path.exists():
        return ""
    return file_path.read_text(encoding="utf-8")


def content_locale_available(db_obj: Document, locale: str | None) -> bool:
    if not locale or locale == DEFAULT_LOCALE:
        return True
    localized = resolve_localized_path(resolve_doc_path(db_obj.file_path), locale)
    default = resolve_doc_path(db_obj.file_path)
    return localized != default and localized.is_file()
