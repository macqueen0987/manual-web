import shutil
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.paths import remap_version_in_path
from app.models.document import Document
from app.models.version import Version
from app.schemas.version import VersionCreate, VersionPublish

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


def get_version_by_slug(db: Session, product_id: int, slug: str):
    return db.query(Version).filter(Version.product_id == product_id, Version.slug == slug).first()


def get_latest_version(db: Session, product_id: int):
    return (
        db.query(Version)
        .filter(Version.product_id == product_id, Version.is_latest == True)
        .first()
    )


def get_version(db: Session, version_id: int):
    return db.query(Version).filter(Version.id == version_id).first()


def create_version(db: Session, obj_in: VersionCreate):
    db_obj = Version(
        product_id=obj_in.product_id,
        name=obj_in.name,
        slug=obj_in.slug,
        base_version_id=obj_in.base_version_id,
        is_latest=False,
        is_published=False,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def _clone_documents_to_snapshot(
    db: Session,
    source_version_id: int,
    target_version_id: int,
    product_slug: str,
    snapshot_slug: str,
):
    docs = db.query(Document).filter(Document.version_id == source_version_id).all()
    id_map: dict[int, int] = {}
    remaining = list(docs)

    while remaining:
        progressed = False
        for doc in list(remaining):
            if doc.parent_id is not None and doc.parent_id not in id_map:
                continue

            new_path = remap_version_in_path(
                doc.file_path, product_slug, "latest", snapshot_slug
            )

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

    _clone_documents_to_snapshot(db, latest.id, published.id, product_slug, obj_in.slug)
    db.refresh(published)
    return published


def delete_version(db: Session, db_obj: Version, product_slug: str):
    if db_obj.is_latest:
        raise ValueError("Cannot delete the latest working version")

    if db_obj.snapshot_path:
        snapshot_dir = Path(db_obj.snapshot_path)
        if snapshot_dir.exists():
            shutil.rmtree(snapshot_dir)
    version_dir = Path(settings.DOCS_DIR) / product_slug / db_obj.slug
    if version_dir.exists() and version_dir != Path(settings.DOCS_DIR) / product_slug / "latest":
        shutil.rmtree(version_dir)

    db.delete(db_obj)
    db.commit()
    return db_obj
