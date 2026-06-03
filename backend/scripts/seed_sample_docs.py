"""Seed sample documentation for demo / UI testing.

Usage (Docker):
  docker compose -f docker-compose.dev.yml exec backend python scripts/seed_sample_docs.py
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
from app.services.bootstrap_service import bootstrap_product

settings = get_settings()

SAMPLE_PAGES: list[dict] = [
    {
        "slug": "index",
        "title": "Home",
        "parent_slug": None,
        "sort_order": 0,
        "content": """# UiPath Studio

UiPath Studio는 자동화 워크플로를 설계·디버그·배포하는 통합 개발 환경입니다.

## 이 문서에서 다루는 내용

- **Getting started** — 설치, 라이선스, 첫 프로젝트
- **Process modeling** — BPMN 기반 프로세스 모델링 개요
- **Publishing** — Orchestrator로 패키지 발행

## 빠른 링크

| 작업 | 문서 |
|------|------|
| Studio 설치 | [Installation](./getting-started/installation) |
| 프로세스 모델링 | [Process modeling](./process-modeling) |
| 패키지 발행 | [Publish and deploy](./publishing) |

> 샘플 콘텐츠입니다. MCP `import_markdown_directory`로 기존 마크다운을 일괄 가져올 수 있습니다.

## 텍스트 색상 (HTML)

클래스 태그:

- <span class="doc-color-red">빨간색</span>
- <span class="doc-color-blue">파란색</span>
- <span class="doc-color-green">초록색</span>
- <span class="doc-color-muted">회색</span>

형광 강조 (`mark`):

- <mark>기본 노란 형광</mark>
- <mark class="doc-mark-amber">노란 배경</mark>
- <mark class="doc-mark-sky">하늘색 배경</mark>

인라인 `style` (색상만 허용):

- <span style="color: #7c3aed">보라색</span>
- <span style="color: rgb(180, 83, 9)">주황색</span>
""",
    },
    {
        "slug": "getting-started",
        "title": "Getting started",
        "parent_slug": None,
        "sort_order": 1,
        "content": """# Getting started

Studio를 처음 사용하는 경우 아래 순서를 따르세요.

## Overview

1. [Installation](./installation) — 시스템 요구사항 확인 후 설치
2. [Configuration](./configuration) — 테넌트 연결 및 기본 설정
3. 첫 **Agentic Process** 프로젝트 생성

## Prerequisites

- Windows 10/11 또는 지원되는 Windows Server
- .NET Desktop Runtime (설치 가이드 참조)
- Automation Cloud 테넌트 (또는 온프레미스 Orchestrator)

## Next steps

설치가 끝나면 **Process modeling** 문서로 이동해 BPMN 캔버스 사용법을 익히세요.
""",
    },
    {
        "slug": "installation",
        "title": "Installation",
        "parent_slug": "getting-started",
        "sort_order": 0,
        "content": """# Installation

## System requirements

- 64-bit OS, 8 GB RAM 이상 권장
- SSD 10 GB 여유 공간
- 인터넷 연결 (라이선스·업데이트)

## Install Studio

1. [UiPath Portal](https://cloud.uipath.com)에서 **Resource Center** 열기
2. **UiPath Studio** 설치 프로그램 다운로드
3. 마법사를 따라 설치 — 기본 옵션으로 충분

## Verify

Studio 실행 후 **Sign in** → 테넌트 선택 → 홈 화면이 보이면 완료.

```powershell
# CLI 확인 (선택)
uipath --version
```
""",
    },
    {
        "slug": "configuration",
        "title": "Configuration",
        "parent_slug": "getting-started",
        "sort_order": 1,
        "content": """# Configuration

## Connect to tenant

1. Studio → **Preferences** → **General**
2. **Sign in**으로 Automation Cloud 계정 연결
3. 기본 **Orchestrator folder** 지정 (Personal Workspace 등)

## Project defaults

| 설정 | 권장값 |
|------|--------|
| Language | C# 또는 VB (팀 표준) |
| Compile | Enable |
| Auto-save | 2 min |

## Troubleshooting

- **로그인 실패**: 프록시/방화벽에서 `*.uipath.com` 허용
- **NuGet 복원 오류**: `%USERPROFILE%\\.nuget\\packages` 캐시 삭제 후 재시도
""",
    },
    {
        "slug": "process-modeling",
        "title": "Process modeling",
        "parent_slug": None,
        "sort_order": 2,
        "content": """# Process modeling

Maestro / Agentic Process는 BPMN 2.0 기반 모델링 캔버스를 사용합니다.

## Core elements

- **Start event** — 프로세스 시작, 입력 인자 정의
- **Tasks** — Service, User, Script 등
- **Gateways** — 분기 (`Exclusive gateway`)
- **End events** — 명시적 종료 권장

## Simple routing example

```javascript
// Gateway condition (Expression editor)
vars.path == "A"
vars.path != "A"  // Not A route
```

## Best practices

1. 각 분기마다 별도 **End event**를 두어 실행 경로 추적
2. 타이머·메시지 이벤트는 이름을 명확히 (`Delay`, `Wait for approval`)
3. 디버그 전 **Validation** 패널 경고 해결

자세한 튜토리얼은 [UiPath Maestro — Simple process](https://docs.uipath.com/maestro/automation-cloud/latest/user-guide/how-to-simple-process)를 참고하세요.
""",
    },
    {
        "slug": "publishing",
        "title": "Publish and deploy",
        "parent_slug": None,
        "sort_order": 3,
        "content": """# Publish and deploy

## Publish from Studio

1. 프로젝트에서 **Publish** 선택
2. **Location** — Orchestrator Personal Workspace Feed 등
3. 버전 메모 입력 후 **Publish**

## Deploy to Orchestrator

발행 후 Orchestrator **Automations → Processes**에서 패키지가 표시됩니다.

## Runtime management

- **Maestro → Process instances**에서 실행 중 인스턴스 모니터링
- 실패 시 **Global variables** 수정 후 **Retry**
- 프로세스 정의 변경 시 **Migrate instance**로 새 버전 적용

## Versioning tips

- `latest` 작업 버전과 발행 스냅샷(`2026.05.01` 등)을 구분
- Manual Web에서도 동일 패턴: `latest` 편집 → **Publish**로 고정 버전 생성
""",
    },
]


def upsert_document(
    db,
    version: Version,
    product: Product,
    *,
    slug: str,
    title: str,
    parent_id: int | None,
    sort_order: int,
    content: str,
) -> Document:
    docs_dir = Path(settings.DOCS_DIR) / product.slug / "latest"
    docs_dir.mkdir(parents=True, exist_ok=True)

    from app.core.paths import localized_doc_path, normalize_base_doc_path
    from app.services.document_service import DEFAULT_LOCALE

    if parent_id:
        parent = db.query(Document).filter(Document.id == parent_id).first()
        parent_base = normalize_base_doc_path(Path(settings.DOCS_DIR) / parent.file_path)
        file_path = parent_base.parent / f"{slug}.md"
    else:
        file_path = docs_dir / f"{slug}.md"

    write_path = localized_doc_path(file_path, DEFAULT_LOCALE)
    write_path.parent.mkdir(parents=True, exist_ok=True)
    write_path.write_text(content, encoding="utf-8")
    stored = to_stored_doc_path(file_path)

    doc = (
        db.query(Document)
        .filter(Document.version_id == version.id, Document.slug == slug)
        .first()
    )
    if doc:
        doc.title = title
        doc.parent_id = parent_id
        doc.sort_order = sort_order
        doc.file_path = stored
    else:
        doc = Document(
            version_id=version.id,
            parent_id=parent_id,
            title=title,
            slug=slug,
            file_path=stored,
            sort_order=sort_order,
        )
        db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def main() -> None:
    db = SessionLocal()
    try:
        product = db.query(Product).filter(Product.slug == "uipath-studio").first()
        if not product:
            print("No product 'uipath-studio' found — run /setup first.")
            return

        bootstrap_product(db, product)
        version = (
            db.query(Version)
            .filter(Version.product_id == product.id, Version.is_latest == True)
            .first()
        )
        if not version:
            print("No latest version found.")
            return

        by_slug: dict[str, Document] = {}
        for page in SAMPLE_PAGES:
            parent_id = None
            if page["parent_slug"]:
                parent = by_slug.get(page["parent_slug"])
                if not parent:
                    parent = (
                        db.query(Document)
                        .filter(
                            Document.version_id == version.id,
                            Document.slug == page["parent_slug"],
                        )
                        .first()
                    )
                if parent:
                    parent_id = parent.id

            doc = upsert_document(
                db,
                version,
                product,
                slug=page["slug"],
                title=page["title"],
                parent_id=parent_id,
                sort_order=page["sort_order"],
                content=page["content"],
            )
            by_slug[page["slug"]] = doc
            print(f"  ✓ {page['slug']} ({page['title']})")

        print(f"\nSeeded {len(SAMPLE_PAGES)} pages for {product.slug}/latest")
    finally:
        db.close()


if __name__ == "__main__":
    main()
