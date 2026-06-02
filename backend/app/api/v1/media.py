import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.api.deps import get_current_admin_user
from app.core.config import get_settings
from app.models.user import User

router = APIRouter()
settings = get_settings()


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_admin_user),
):
    # Validate file type and size
    allowed_extensions = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".mp4", ".pdf", ".zip"}
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed: {', '.join(allowed_extensions)}",
        )

    # Generate unique filename
    unique_name = f"{uuid.uuid4()}{file_ext}"
    upload_path = Path(settings.UPLOAD_DIR) / unique_name

    # Save file
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:  # 50MB limit
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 50MB limit",
        )

    upload_path.write_bytes(content)

    return {
        "filename": file.filename,
        "url": f"/uploads/{unique_name}",
        "size": len(content),
    }
