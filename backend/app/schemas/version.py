from datetime import datetime

from pydantic import BaseModel, Field


class VersionBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=255, pattern=r"^[a-zA-Z0-9._-]+$")


class VersionCreate(VersionBase):
    product_id: int
    base_version_id: int | None = None


class VersionOut(VersionBase):
    id: int
    product_id: int
    is_published: bool
    is_latest: bool
    snapshot_path: str | None
    base_version_id: int | None
    published_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


class VersionUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)


class VersionPublish(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=255, pattern=r"^[a-zA-Z0-9._-]+$")
