import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status

from app.api.deps import get_current_admin_user
from app.models.user import User
from app.schemas.media import MediaListResponse, MediaOut
from app.services import media_service

router = APIRouter()


@router.post("/upload", response_model=MediaOut)
async def upload_file(
    file: UploadFile = File(...),
    product_slug: str = Query(..., min_length=1),
    version_slug: str = Query("latest", min_length=1),
    current_user: User = Depends(get_current_admin_user),
):
    file_ext = media_service.validate_extension(file.filename or "")
    content = await file.read()
    unique_name = f"{uuid.uuid4()}{file_ext}"
    meta = media_service.save_upload(
        content=content,
        original_filename=file.filename or unique_name,
        product_slug=product_slug,
        version_slug=version_slug,
        stored_name=unique_name,
    )
    return MediaOut(**meta)


@router.get("/media", response_model=MediaListResponse)
def list_uploaded_media(
    product_slug: str | None = Query(None, min_length=1),
    version_slug: str | None = Query(None, min_length=1),
    orphans_only: bool = Query(False, description="Only files not referenced in any document"),
    current_user: User = Depends(get_current_admin_user),
):
    items = media_service.list_media(
        product_slug=product_slug,
        version_slug=version_slug,
        orphans_only=orphans_only,
    )
    return MediaListResponse(items=[MediaOut(**m) for m in items], count=len(items))


@router.delete("/media/{media_id:path}")
def delete_uploaded_media(
    media_id: str,
    current_user: User = Depends(get_current_admin_user),
):
    if ".." in Path(media_id).parts:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid media path")
    media_service.delete_media(media_id)
    return {"message": "Media deleted successfully"}


@router.post("/media/cleanup-orphans")
def cleanup_orphan_uploads(
    product_slug: str = Query(..., min_length=1),
    version_slug: str = Query("latest", min_length=1),
    current_user: User = Depends(get_current_admin_user),
):
    deleted = media_service.delete_orphan_uploads(product_slug, version_slug)
    return {"deleted": deleted, "count": len(deleted)}
