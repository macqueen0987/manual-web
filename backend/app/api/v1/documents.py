from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.document import (
    DocumentCreate,
    DocumentOut,
    DocumentReposition,
    DocumentTreeOut,
    DocumentUpdate,
)
from app.services import document_service, product_service, version_service

router = APIRouter()


@router.get("/products/{product_slug}/versions/{version_slug}/documents")
def list_documents(
    product_slug: str,
    version_slug: str,
    locale: str | None = Query(None, description="Content locale for localized titles"),
    db: Session = Depends(get_db),
):
    product = product_service.get_product_by_slug(db, product_slug)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    version = version_service.get_version_by_slug(db, product.id, version_slug)
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")

    docs = document_service.get_documents(db, version.id)
    tree = document_service.build_tree(docs, locale=locale)
    return tree


@router.get("/products/{product_slug}/versions/{version_slug}/documents/{doc_slug}")
def get_document(
    product_slug: str,
    version_slug: str,
    doc_slug: str,
    locale: str | None = Query(None, description="Content locale, e.g. ko, en"),
    db: Session = Depends(get_db),
):
    product = product_service.get_product_by_slug(db, product_slug)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    version = version_service.get_version_by_slug(db, product.id, version_slug)
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")
    doc = document_service.get_document_by_slug(db, version.id, doc_slug)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    content = document_service.read_document_content(doc, locale=locale)
    resolved_locale = locale or document_service.DEFAULT_LOCALE
    display_title = document_service.document_display_title(doc, locale)
    return {
        "id": doc.id,
        "version_id": doc.version_id,
        "parent_id": doc.parent_id,
        "title": display_title,
        "canonical_title": doc.title,
        "slug": doc.slug,
        "file_path": doc.file_path,
        "sort_order": doc.sort_order,
        "content": content,
        "locale": resolved_locale,
        "locale_available": document_service.content_locale_available(doc, locale),
        "created_at": doc.created_at,
        "updated_at": doc.updated_at,
    }


@router.post("/documents", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
def create_document(
    request: DocumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    version = version_service.get_version(db, request.version_id)
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")
    product = product_service.get_product(db, version.product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    slug = request.slug or document_service.generate_slug_from_title(
        db, request.version_id, request.title
    )
    existing = document_service.get_document_by_slug(db, request.version_id, slug)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document with this slug already exists in this version",
        )
    request = request.model_copy(update={"slug": slug})

    version_slug = "latest" if version.is_latest else version.slug
    doc = document_service.create_document(
        db, request, product.slug, version_slug, locale=request.locale
    )
    return doc


@router.put("/documents/{document_id}", response_model=DocumentOut)
def update_document(
    document_id: int,
    request: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    doc = document_service.get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    version = version_service.get_version(db, doc.version_id)
    product = product_service.get_product(db, version.product_id)
    version_slug = "latest" if version.is_latest else version.slug
    doc = document_service.update_document(
        db, doc, request, product.slug, version_slug, locale=request.locale
    )
    return doc


@router.delete("/documents/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    doc = document_service.get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    try:
        document_service.delete_document(db, doc)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"message": "Document deleted successfully"}


@router.post("/documents/{document_id}/move")
def move_document(
    document_id: int,
    new_parent_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    doc = document_service.get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    sort_order = document_service.next_sort_order(db, doc.version_id, new_parent_id)
    try:
        document_service.reposition_document(db, doc, new_parent_id, sort_order)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"message": "Document moved successfully"}


@router.post("/documents/{document_id}/reposition")
def reposition_document(
    document_id: int,
    request: DocumentReposition,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    doc = document_service.get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    try:
        document_service.reposition_document(db, doc, request.parent_id, request.sort_order)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"message": "Document repositioned successfully"}
