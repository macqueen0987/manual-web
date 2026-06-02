from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin_user, get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.document import DocumentCreate, DocumentOut, DocumentTreeOut, DocumentUpdate
from app.services import document_service, product_service, version_service

router = APIRouter()


@router.get("/products/{product_slug}/versions/{version_slug}/documents")
def list_documents(
    product_slug: str,
    version_slug: str,
    db: Session = Depends(get_db),
):
    product = product_service.get_product_by_slug(db, product_slug)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    version = version_service.get_version_by_slug(db, product.id, version_slug)
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")

    docs = document_service.get_documents(db, version.id)
    tree = document_service.build_tree(docs)
    return tree


@router.get("/products/{product_slug}/versions/{version_slug}/documents/{doc_slug}")
def get_document(
    product_slug: str,
    version_slug: str,
    doc_slug: str,
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

    content = document_service.read_document_content(doc)
    return {
        "id": doc.id,
        "version_id": doc.version_id,
        "parent_id": doc.parent_id,
        "title": doc.title,
        "slug": doc.slug,
        "file_path": doc.file_path,
        "sort_order": doc.sort_order,
        "content": content,
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

    existing = document_service.get_document_by_slug(db, request.version_id, request.slug)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document with this slug already exists in this version",
        )

    version_slug = "latest" if version.is_latest else version.slug
    return document_service.create_document(db, request, product.slug, version_slug)


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
    return document_service.update_document(db, doc, request, product.slug, version_slug)


@router.delete("/documents/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    doc = document_service.get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    document_service.delete_document(db, doc)
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

    if new_parent_id is not None:
        parent = document_service.get_document(db, new_parent_id)
        if not parent:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent document not found")
        if parent.version_id != doc.version_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot move document to a different version",
            )

    doc.parent_id = new_parent_id
    db.commit()
    db.refresh(doc)
    return {"message": "Document moved successfully"}
