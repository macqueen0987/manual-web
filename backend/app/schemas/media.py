from datetime import datetime

from pydantic import BaseModel, Field


class MediaOut(BaseModel):
    id: str = Field(..., description="Relative path: {product}/{version}/{filename}")
    product_slug: str
    version_slug: str
    filename: str
    original_name: str | None = None
    url: str
    size: int
    content_type: str
    kind: str
    created_at: datetime
    referenced: bool = False


class MediaListResponse(BaseModel):
    items: list[MediaOut]
    count: int
