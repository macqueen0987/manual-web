from datetime import datetime

from pydantic import BaseModel, Field


class DocumentBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=255, pattern=r"^[a-zA-Z0-9._-]+$")
    sort_order: int = 0


class DocumentCreate(BaseModel):
    version_id: int
    title: str = Field(..., min_length=1, max_length=255)
    slug: str | None = Field(
        None,
        min_length=1,
        max_length=255,
        pattern=r"^[a-zA-Z0-9._-]+$",
        description="Omit to auto-generate from title",
    )
    sort_order: int | None = None
    parent_id: int | None = None
    content: str = ""
    locale: str | None = None


class DocumentReposition(BaseModel):
    parent_id: int | None = None
    sort_order: int = Field(..., ge=0)


class DocumentUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    content: str | None = None
    sort_order: int | None = None
    parent_id: int | None = None
    locale: str | None = None


class DocumentOut(DocumentBase):
    id: int
    version_id: int
    parent_id: int | None
    file_path: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DocumentTreeOut(DocumentOut):
    children: list["DocumentTreeOut"] = []

    class Config:
        from_attributes = True
