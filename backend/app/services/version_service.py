import shutil
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.paths import remap_version_in_path
from app.models.document import Document
from app.models.version import Version
from app.schemas.version import VersionCreate, VersionPublish, VersionUpdate

settings = get_settings()


def get_versions(db: Session, product_id: int, skip: int = 0, limit: int = 100):
    return (
        db.query(Version)
        .filter(Version.product_id == product_id)
        .order_by(Version.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_versions_for_viewer(
    db: Session,
    product_id: int,
    *,
    include_unpublished: bool = False,
    skip: int = 0,
    limit: int = 100,
):
    query = db.query(Version).filter(Version.product_id == product_id)
    if not include_unpublished:
        query = query.filter(Version.is_published == True)
    return query.order_by(Version.created_at.desc()).offset(skip).limit(limit).all()


def version_visible_to_public(version: Version) -> bool:
    return bool(version.is_published)


def get_version_by_slug_for_viewer(
    db: Session,
    product_id: int,
    slug: str,
    *,
    include_unpublished: bool = False,
):
    version = get_version_by_slug(db, product_id, slug)
    if not version:
        return None
    if include_unpublished or version_visible_to_public(version):
        return version
    return None


def get_version_by_slug(db: Session, product_id: int, slug: str):
    """Resolve version by slug; ``latest`` maps to the row with ``is_latest=True``."""
    if slug == "latest":
        return get_latest_version(db, product_id)
    return db.query(Version).filter(Version.product_id == product_id, Version.slug == slug).first()


def get_latest_version(db: Session, product_id: int):
    return (
        db.query(Version)
        .filter(Version.product_id == product_id, Version.is_latest == True)
        .first()
    )


def get_version(db: Session, version_id: int):
    return db.query(Version).filter(Version.id == version_id).first()


def clone_documents_between_versions(
    db: Session,
    source_version_id: int,
    target_version_id: int,
    product_slug: str,
    from_slug: str,
    to_slug: str,
) -> None:
    docs = db.query(Document).filter(Document.version_id == source_version_id).all()
    id_map: dict[int, int] = {}
    remaining = list(docs)

    while remaining:
        progressed = False
        for doc in list(remaining):
            if doc.parent_id is not None and doc.parent_id not in id_map:
                continue

            new_path = remap_version_in_path(doc.file_path, product_slug, from_slug, to_slug)

            new_doc = Document(
                version_id=target_version_id,
                parent_id=id_map.get(doc.parent_id) if doc.parent_id else None,
                title=doc.title,
                slug=doc.slug,
                file_path=new_path,
                sort_order=doc.sort_order,
            )
            db.add(new_doc)
            db.flush()
            id_map[doc.id] = new_doc.id
            remaining.remove(doc)
            progressed = True

        if not progressed and remaining:
            raise ValueError("Circular or broken document parent references")

    db.commit()


def create_version(db: Session, obj_in: VersionCreate, product_slug: str):
    if obj_in.slug == "latest":
        raise ValueError("Cannot create a version with slug 'latest'")

    if obj_in.base_version_id:
        source = get_version(db, obj_in.base_version_id)
        if not source or source.product_id != obj_in.product_id:
            raise ValueError("Base version not found for this product")
        source_slug = "latest" if source.is_latest else source.slug
    else:
        source = get_latest_version(db, obj_in.product_id)
        if not source:
            raise ValueError("No latest version found")
        source_slug = "latest"

    source_dir = Path(settings.DOCS_DIR) / product_slug / source_slug
    target_dir = Path(settings.DOCS_DIR) / product_slug / obj_in.slug

    if target_dir.exists():
        shutil.rmtree(target_dir)
    if source_dir.exists():
        shutil.copytree(source_dir, target_dir)
    else:
        target_dir.mkdir(parents=True, exist_ok=True)

    db_obj = Version(
        product_id=obj_in.product_id,
        name=obj_in.name,
        slug=obj_in.slug,
        base_version_id=source.id,
        is_latest=False,
        is_published=False,
        snapshot_path=str(target_dir),
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)

    clone_documents_between_versions(
        db, source.id, db_obj.id, product_slug, source_slug, obj_in.slug
    )
    db.refresh(db_obj)
    return db_obj


def publish_latest(db: Session, product_id: int, product_slug: str, obj_in: VersionPublish):
    latest = get_latest_version(db, product_id)
    if not latest:
        raise ValueError("No latest version found for product")

    existing = get_version_by_slug(db, product_id, obj_in.slug)
    if existing:
        raise ValueError("Version with this slug already exists")

    latest_dir = Path(settings.DOCS_DIR) / product_slug / "latest"
    snapshot_dir = Path(settings.DOCS_DIR) / product_slug / obj_in.slug

    if snapshot_dir.exists():
        shutil.rmtree(snapshot_dir)

    if latest_dir.exists():
        shutil.copytree(latest_dir, snapshot_dir)
    else:
        snapshot_dir.mkdir(parents=True, exist_ok=True)

    published = Version(
        product_id=product_id,
        name=obj_in.name,
        slug=obj_in.slug,
        is_published=True,
        is_latest=False,
        snapshot_path=str(snapshot_dir),
        base_version_id=latest.id,
        published_at=datetime.now(timezone.utc),
    )
    db.add(published)
    db.commit()
    db.refresh(published)

    clone_documents_between_versions(
        db, latest.id, published.id, product_slug, "latest", obj_in.slug
    )
    db.refresh(published)
    return published


def publish_existing_version(db: Session, db_obj: Version) -> Version:
    """Mark a non-latest snapshot as published (visible to readers)."""
    if db_obj.is_published:
        raise ValueError("Version is already published")
    if db_obj.is_latest:
        raise ValueError("Use publish_latest to snapshot the working copy")
    db_obj.is_published = True
    db_obj.published_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def unpublish_version(db: Session, db_obj: Version) -> Version:
    """Hide a published snapshot from public readers."""
    if not db_obj.is_published:
        raise ValueError("Version is not published")
    if db_obj.is_latest:
        raise ValueError("Cannot unpublish the working copy")
    db_obj.is_published = False
    db_obj.published_at = None
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_version(db: Session, db_obj: Version, obj_in: VersionUpdate) -> Version:
    """Update display metadata. Working copy slug stays ``latest``."""
    update_data = obj_in.model_dump(exclude_unset=True)
    if not update_data:
        return db_obj
    if "name" in update_data:
        db_obj.name = update_data["name"]
    db.commit()
    db.refresh(db_obj)
    return db_obj


def delete_version(db: Session, db_obj: Version, product_slug: str):
    if db_obj.is_latest:
        raise ValueError("Cannot delete the latest working version")

    if db_obj.snapshot_path:
        snapshot_dir = Path(db_obj.snapshot_path)
        if snapshot_dir.exists():
            shutil.rmtree(snapshot_dir)
    version_dir = Path(settings.DOCS_DIR) / product_slug / db_obj.slug
    latest_dir = Path(settings.DOCS_DIR) / product_slug / "latest"
    if version_dir.exists() and version_dir.resolve() != latest_dir.resolve():
        shutil.rmtree(version_dir)

    db.delete(db_obj)
    db.commit()
    return db_obj
