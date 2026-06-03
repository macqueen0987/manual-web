from datetime import datetime

from pydantic import BaseModel, Field


class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=255, pattern=r"^[a-z0-9-]+$")
    description: str | None = None
    category: str | None = Field(None, max_length=128)
    icon_url: str | None = Field(None, max_length=512)
    sort_order: int = 0
    is_active: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    category: str | None = Field(None, max_length=128)
    icon_url: str | None = Field(None, max_length=512)
    sort_order: int | None = None
    is_active: bool | None = None


class ProductOut(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime
    has_public_docs: bool = False

    class Config:
        from_attributes = True
