"""Seed demo products for landing page (Blue / beSRT categories).

Usage (Docker):
  docker compose exec backend python scripts/seed_demo_products.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import get_settings
from app.core.paths import to_stored_doc_path
from app.db.session import SessionLocal
from app.models.document import Document
from app.models.product import Product
from app.models.version import Version
from app.schemas.product import ProductCreate
from app.services.bootstrap_service import bootstrap_product
from app.services.product_service import create_product

settings = get_settings()

DEMO_PRODUCTS: list[dict] = [
    {
        "name": "BlueFit",
        "slug": "bluefit",
        "category": "Blue",
        "sort_order": 0,
        "description": "피트니스·웨어러블 연동 제품 매뉴얼",
    },
    {
        "name": "BlueTit",
        "slug": "bluetit",
        "category": "Blue",
        "sort_order": 1,
        "description": "모바일 앱 및 디바이스 설정 가이드",
    },
    {
        "name": "BlueGuard",
        "slug": "blueguard",
        "category": "Blue",
        "sort_order": 2,
        "description": "보안·알림·가족 보호 기능 문서",
    },
    {
        "name": "beSRT Studio",
        "slug": "besrt-studio",
        "category": "beSRT",
        "sort_order": 0,
        "description": "시나리오 설계 및 테스트 스튜디오",
    },
    {
        "name": "beSRT Administrator",
        "slug": "besrt-administrator",
        "category": "beSRT",
        "sort_order": 1,
        "description": "운영·배포·테넌트 관리자 가이드",
    },
    {
        "name": "beSRT Runner",
        "slug": "besrt-runner",
        "category": "beSRT",
        "sort_order": 2,
        "description": "런타임 에이전트 설치 및 실행 문서",
    },
]


def index_content(name: str, description: str, category: str) -> str:
    return f"""# {name}

{description}

**제품군:** {category}

## 시작하기

이 문서는 데모용 샘플 홈 페이지입니다. 관리자 로그인 후 에디터에서 내용을 수정할 수 있습니다.
"""


def upsert_product(db, spec: dict) -> Product:
    product = db.query(Product).filter(Product.slug == spec["slug"]).first()
    if product:
        product.name = spec["name"]
        product.description = spec["description"]
        product.category = spec["category"]
        product.sort_order = spec["sort_order"]
        product.is_active = True
        db.commit()
        db.refresh(product)
        print(f"  ↻ updated {spec['slug']}")
        return product

    product = create_product(
        db,
        ProductCreate(
            name=spec["name"],
            slug=spec["slug"],
            description=spec["description"],
            category=spec["category"],
            sort_order=spec["sort_order"],
        ),
    )
    print(f"  + created {spec['slug']}")
    return product


def refresh_index(db, product: Product, spec: dict) -> None:
    bootstrap_product(db, product)
    version = (
        db.query(Version)
        .filter(Version.product_id == product.id, Version.is_latest == True)
        .first()
    )
    if not version:
        return

    from app.core.paths import localized_doc_path
    from app.services.document_service import DEFAULT_LOCALE

    content = index_content(spec["name"], spec["description"], spec["category"])
    index_base = Path(settings.DOCS_DIR) / product.slug / "latest" / "index.md"
    index_path = localized_doc_path(index_base, DEFAULT_LOCALE)
    index_path.parent.mkdir(parents=True, exist_ok=True)
    index_path.write_text(content, encoding="utf-8")

    doc = (
        db.query(Document)
        .filter(Document.version_id == version.id, Document.slug == "index")
        .first()
    )
    if doc:
        doc.title = "Home"
        doc.file_path = to_stored_doc_path(index_base)
        db.commit()


def normalize_latest_names(db) -> None:
    """Rename legacy working-copy rows still labeled ``latest``."""
    rows = (
        db.query(Version)
        .filter(Version.is_latest == True, Version.name == "latest")
        .all()
    )
    for version in rows:
        version.name = "작업 중"
    if rows:
        db.commit()
        print(f"  ↻ renamed {len(rows)} working copy row(s) to 작업 중")


def main() -> None:
    db = SessionLocal()
    try:
        normalize_latest_names(db)
        print("Seeding demo products (Blue / beSRT)…\n")
        for spec in DEMO_PRODUCTS:
            product = upsert_product(db, spec)
            refresh_index(db, product, spec)
        print(f"\nDone — {len(DEMO_PRODUCTS)} products ready for landing preview.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
