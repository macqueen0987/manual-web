import hashlib
import re
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.services import media_service
from app.core.paths import (
    localized_doc_path,
    normalize_base_doc_path,
    resolve_doc_path,
    to_stored_doc_path,
)
from app.models.document import Document
from app.schemas.document import DocumentCreate, DocumentUpdate

settings = get_settings()
DEFAULT_LOCALE = settings.DEFAULT_LOCALE
SUPPORTED_LOCALES = {"en", "ko"}


def effective_locale(locale: str | None) -> str:
    if locale and locale in SUPPORTED_LOCALES:
        return locale
    return DEFAULT_LOCALE


def resolve_localized_path(base_path: Path, locale: str | None) -> Path:
    """Read path: ``version/{locale}/page.md``, with legacy root fallback."""
    base = normalize_base_doc_path(base_path)
    loc = effective_locale(locale)
    localized = localized_doc_path(base, loc)
    if localized.is_file():
        return localized
    if base.is_file():
        return base
    legacy_suffix = base.with_name(f"{base.stem}.{loc}{base.suffix}")
    if legacy_suffix.is_file():
        return legacy_suffix
    return localized


def localized_write_path(base_path: Path, locale: str | None) -> Path:
    """Write path: always ``version/{locale}/page.md`` (no root files)."""
    base = normalize_base_doc_path(base_path)
    target = localized_doc_path(base, effective_locale(locale))
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
    if locale and content_locale_available(doc, locale):
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
    result: list[dict] = []
    stack: list[tuple[Document, list[dict]]] = []

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
            "children": [],
        }
        result.append(item)
        stack.append((doc, item["children"]))

    while stack:
        parent_doc, children_list = stack.pop()
        for child in _sorted_children(parent_doc):
            child_item = {
                "id": child.id,
                "version_id": child.version_id,
                "parent_id": child.parent_id,
                "title": document_display_title(child, locale),
                "slug": child.slug,
                "file_path": child.file_path,
                "sort_order": child.sort_order,
                "created_at": child.created_at,
                "updated_at": child.updated_at,
                "locale_available": content_locale_available(child, locale),
                "children": [],
            }
            children_list.append(child_item)
            stack.append((child, child_item["children"]))

    return result


def cleanup_orphan_uploads_for_version(
    db: Session,
    product_slug: str,
    version_slug: str,
) -> None:
    """Remove uploads under this product/version not referenced in stored markdown."""
    media_service.delete_orphan_uploads(product_slug, version_slug, db=db)


def _neutral_file_path(
    docs_dir: Path,
    parent: Document | None,
    slug: str,
) -> Path:
    if parent:
        parent_base = normalize_base_doc_path(resolve_doc_path(parent.file_path))
        return parent_base.parent / f"{slug}.md"
    return docs_dir / f"{slug}.md"


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

    parent = get_document(db, obj_in.parent_id) if obj_in.parent_id else None
    file_path = _neutral_file_path(docs_dir, parent, slug)

    content = obj_in.content or ""
    if obj_in.title and not extract_title_from_markdown(content):
        content = sync_markdown_title(content, obj_in.title)

    write_path = localized_write_path(file_path, locale)
    write_path.write_text(content, encoding="utf-8")

    db_obj = Document(
        version_id=obj_in.version_id,
        parent_id=obj_in.parent_id,
        title=obj_in.title,
        slug=slug,
        file_path=to_stored_doc_path(file_path),
        sort_order=sort_order,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    from app.services import search_service

    search_service.sync_document(db, db_obj.id)
    cleanup_orphan_uploads_for_version(db, product_slug, version_slug)
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
    active_locale = effective_locale(req_locale or locale)

    base_path = normalize_base_doc_path(resolve_doc_path(db_obj.file_path))

    if content is not None or title:
        body = content if content is not None else read_document_content(db_obj, active_locale)
        if title:
            body = sync_markdown_title(body, title)
        write_path = localized_write_path(base_path, active_locale)
        write_path.write_text(body, encoding="utf-8")

    if title and active_locale == DEFAULT_LOCALE:
        db_obj.title = title

    if "parent_id" in update_data:
        new_parent_id = update_data.pop("parent_id")
        if new_parent_id != db_obj.parent_id:
            sort_order = next_sort_order(db, db_obj.version_id, new_parent_id)
            reposition_document(db, db_obj, new_parent_id, sort_order)
            db.refresh(db_obj)

    allowed_fields = {"title", "sort_order"}
    for field, value in update_data.items():
        if field in allowed_fields:
            setattr(db_obj, field, value)

    db.commit()
    db.refresh(db_obj)
    from app.services import search_service

    search_service.sync_document(db, db_obj.id)
    cleanup_orphan_uploads_for_version(db, product_slug, version_slug)
    return db_obj


def _unlink_doc_files(base_path: Path) -> None:
    base = normalize_base_doc_path(base_path)
    if base.is_file():
        base.unlink()
    legacy_suffixes = [
        base.with_name(f"{base.stem}.{loc}{base.suffix}") for loc in SUPPORTED_LOCALES
    ]
    for path in legacy_suffixes:
        if path.is_file():
            path.unlink()
    for loc in SUPPORTED_LOCALES:
        localized = localized_doc_path(base, loc)
        if localized.is_file():
            localized.unlink()
        loc_dir = base.parent / loc
        if loc_dir.is_dir() and not any(loc_dir.iterdir()):
            loc_dir.rmdir()


def delete_document(
    db: Session,
    db_obj: Document,
    *,
    product_slug: str,
    version_slug: str,
):
    child = db.query(Document).filter(Document.parent_id == db_obj.id).first()
    if child:
        raise ValueError("Cannot delete a document that has child pages")

    _unlink_doc_files(resolve_doc_path(db_obj.file_path))

    db.delete(db_obj)
    db.commit()
    from app.services import search_service

    search_service.remove_document(db_obj.id)
    cleanup_orphan_uploads_for_version(db, product_slug, version_slug)
    return db_obj


def read_document_content(db_obj: Document, locale: str | None = None) -> str:
    file_path = resolve_localized_path(resolve_doc_path(db_obj.file_path), locale)
    if not file_path.exists():
        return ""
    return file_path.read_text(encoding="utf-8")


def content_locale_available(db_obj: Document, locale: str | None) -> bool:
    loc = effective_locale(locale)
    base = normalize_base_doc_path(resolve_doc_path(db_obj.file_path))
    localized = localized_doc_path(base, loc)
    if localized.is_file():
        return True
    if loc == DEFAULT_LOCALE and base.is_file():
        return True
    return base.with_name(f"{base.stem}.{loc}{base.suffix}").is_file()
