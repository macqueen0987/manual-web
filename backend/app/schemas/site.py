import re

from pydantic import BaseModel, Field, field_validator

MAX_SHOWCASE_SLOTS = 4


class HomeQuickLink(BaseModel):
    path: str = Field(..., max_length=512)
    title: str = Field(..., max_length=256)
    description: str = Field(..., max_length=512)


class HomeQuickLinkColumn(BaseModel):
    title: str = Field(..., max_length=128)
    links: list[HomeQuickLink] = Field(default_factory=list)


class ShowcaseSlot(BaseModel):
    id: str = Field(..., min_length=1, max_length=64, pattern=r"^[a-z0-9-]+$")
    title: str = Field(..., max_length=128)
    tagline: str = Field("", max_length=256)
    detail: str = Field("", max_length=2000)
    image_url: str | None = Field(None, max_length=512)
    primary_product_slug: str | None = Field(None, max_length=255)


class HomeLocaleContent(BaseModel):
    hero_tagline: str = Field(..., max_length=512)
    quick_link_columns: list[HomeQuickLinkColumn] = Field(default_factory=list)
    showcase_slots: list[ShowcaseSlot] = Field(default_factory=list)

    @field_validator("showcase_slots")
    @classmethod
    def cap_showcase_slots(cls, slots: list[ShowcaseSlot]) -> list[ShowcaseSlot]:
        return slots[:MAX_SHOWCASE_SLOTS]


class HomeContent(BaseModel):
    en: HomeLocaleContent
    ko: HomeLocaleContent


def slugify_slot_id(name: str) -> str:
    base = name.lower().strip().replace(" ", "-")
    base = re.sub(r"[^a-z0-9-]", "", base)
    return base or "slot"
