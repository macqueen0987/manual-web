import json

from sqlalchemy.orm import Session

from app.models.site_content import SiteContent
from app.services import media_service
from app.schemas.site import (
    HomeContent,
    HomeLocaleContent,
    MAX_SHOWCASE_SLOTS,
    ShowcaseSlot,
    slugify_slot_id,
)

HOME_KEY = "home"


def _default_slots_en() -> list[ShowcaseSlot]:
    return [
        ShowcaseSlot(
            id="blue",
            title="Blue",
            tagline="Fitness and wearable product documentation",
            detail=(
                "The Blue family covers guides for fitness, mobile apps, and family safety "
                "products—installation, configuration, and day-to-day use."
            ),
            primary_product_slug="bluefit",
        ),
        ShowcaseSlot(
            id="besrt",
            title="beSRT",
            tagline="Scenario design and test studio products",
            detail=(
                "The beSRT family documents scenario design, operations, deployment, "
                "and runtime agents across the automation lifecycle."
            ),
            primary_product_slug="besrt-studio",
        ),
    ]


def _default_slots_ko() -> list[ShowcaseSlot]:
    return [
        ShowcaseSlot(
            id="blue",
            title="Blue",
            tagline="피트니스·웨어러블 연동 제품군 문서",
            detail=(
                "Blue 제품군은 피트니스, 모바일 앱, 가족 보호 등 웨어러블·헬스케어 연동 제품의 "
                "설치·설정·운영 가이드를 제공합니다."
            ),
            primary_product_slug="bluefit",
        ),
        ShowcaseSlot(
            id="besrt",
            title="beSRT",
            tagline="시나리오 설계 및 테스트 스튜디오 제품군",
            detail=(
                "beSRT 제품군은 시나리오 설계, 운영·배포, 런타임 실행까지 "
                "엔드투엔드 자동화 문서를 한곳에서 제공합니다."
            ),
            primary_product_slug="besrt-studio",
        ),
    ]


def default_home_content() -> HomeContent:
    return HomeContent(
        en=HomeLocaleContent(
            hero_tagline=(
                "Find guides, release notes, and API references across all products and versions."
            ),
            quick_link_columns=[],
            showcase_slots=_default_slots_en(),
        ),
        ko=HomeLocaleContent(
            hero_tagline="모든 제품과 버전의 가이드, 릴리스 노트, API 참조를 한곳에서 찾아보세요.",
            quick_link_columns=[],
            showcase_slots=_default_slots_ko(),
        ),
    )


def _migrate_intros_to_slots(intros: dict) -> list[ShowcaseSlot]:
    slots: list[ShowcaseSlot] = []
    seen_ids: set[str] = set()
    for title, intro in intros.items():
        if not str(title).strip():
            continue
        slot_id = slugify_slot_id(str(title))
        if slot_id in seen_ids:
            slot_id = f"{slot_id}-{len(seen_ids)}"
        seen_ids.add(slot_id)
        data = intro if isinstance(intro, dict) else intro.model_dump()
        slots.append(
            ShowcaseSlot(
                id=slot_id,
                title=str(title),
                tagline=data.get("tagline", ""),
                detail=data.get("detail", ""),
                image_url=data.get("image_url"),
                primary_product_slug=data.get("primary_product_slug"),
            )
        )
        if len(slots) >= MAX_SHOWCASE_SLOTS:
            break
    return slots


def _coerce_locale(raw: dict) -> HomeLocaleContent:
    hero = raw.get("hero_tagline", "")
    quick = raw.get("quick_link_columns") or []

    if raw.get("showcase_slots") is not None:
        slots = raw.get("showcase_slots") or []
    elif raw.get("category_intros"):
        slots = _migrate_intros_to_slots(raw["category_intros"])
    else:
        slots = []

    return HomeLocaleContent(
        hero_tagline=hero,
        quick_link_columns=quick,
        showcase_slots=slots[:MAX_SHOWCASE_SLOTS],
    )


def _coerce_home_content(raw: dict) -> HomeContent:
    return HomeContent(
        en=_coerce_locale(raw.get("en") or {}),
        ko=_coerce_locale(raw.get("ko") or {}),
    )


def _prepare_for_save(content: HomeContent) -> HomeContent:
    def prep(loc: HomeLocaleContent) -> HomeLocaleContent:
        return HomeLocaleContent(
            hero_tagline=loc.hero_tagline,
            quick_link_columns=[],
            showcase_slots=loc.showcase_slots[:MAX_SHOWCASE_SLOTS],
        )

    return HomeContent(en=prep(content.en), ko=prep(content.ko))


def get_home_content(db: Session) -> HomeContent:
    row = db.query(SiteContent).filter(SiteContent.key == HOME_KEY).first()
    if not row:
        return default_home_content()
    try:
        raw = json.loads(row.data)
        return _coerce_home_content(raw)
    except (json.JSONDecodeError, ValueError, TypeError):
        return default_home_content()


def save_home_content(db: Session, content: HomeContent) -> HomeContent:
    prepared = _prepare_for_save(content)
    payload = prepared.model_dump(mode="json")
    data = json.dumps(payload, ensure_ascii=False)
    row = db.query(SiteContent).filter(SiteContent.key == HOME_KEY).first()
    if row:
        row.data = data
    else:
        row = SiteContent(key=HOME_KEY, data=data)
        db.add(row)
    db.commit()
    db.refresh(row)
    media_service.delete_orphan_uploads(
        media_service.SITE_MEDIA_PRODUCT_SLUG,
        media_service.SITE_MEDIA_VERSION_SLUG,
        db=db,
    )
    return _coerce_home_content(json.loads(row.data))
