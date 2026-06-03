# Manual Web

**버전별 제품 매뉴얼을 웹으로 열람·편집·발행하는 셀프호스트 문서 플랫폼**

Product documentation you can version, publish, and brand — without building a CMS from scratch.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Docker](https://img.shields.io/badge/Run-Docker-2496ED?logo=docker&logoColor=white)](./docs/getting-started.md)
[![Stack](https://img.shields.io/badge/Backend-FastAPI-009688)](./spec.md)
[![Stack](https://img.shields.io/badge/Frontend-React_18-61DAFB)](./spec.md)

---

## 목차

- [소개](#소개)
- [주요 기능](#주요-기능)
- [빠른 시작](#빠른-시작)
- [사이트 브랜딩](#사이트-브랜딩-env)
- [문서](#문서)
- [개발](#개발)
- [라이선스](#라이선스)

---

## 소개

Manual Web은 **제품군 → 버전 → 문서 트리** 구조로 매뉴얼을 관리합니다. 독자는 공개된 버전만 검색·열람하고, 관리자는 브라우저에서 마크다운을 수정한 뒤 스냅샷으로 발행합니다.

```
독자 · 관리자  →  React (Vite)  →  FastAPI  →  SQLite + 파일 저장소
                      ↑
              MCP 서버 (선택) — AI가 문서 가져오기·동기화
```

| 대상 | 할 수 있는 일 |
|------|----------------|
| **독자** | 제품·버전별 문서 탐색, 전체 검색, 다국어(ko/en) 콘텐츠 |
| **관리자** | 듀얼 에디터 편집, 미디어 업로드, 버전 발행, 홈 쇼케이스·제품 관리 |
| **운영** | Docker Compose로 dev/prod 기동, `.env`로 브랜드·홈 히어로 교체 |

첫 실행 시 웹 **설정 마법사**(`/setup`)로 관리자와 첫 제품을 만들면 바로 사용할 수 있습니다.

---

## 주요 기능

| | |
|---|---|
| **버전 발행** | `latest`에서 편집 후 스냅샷 버전으로 고정·배포 |
| **문서 편집** | Markdown + WYSIWYG, TOC, GFM·알림 블록, 안전한 HTML 삽입 |
| **검색** | 발행 버전 대상 SQLite FTS5 |
| **미디어** | 이미지·동영상·PDF·ZIP 업로드 및 본문 삽입 |
| **인증** | JWT(Access/Refresh), 관리자 전용 API |
| **커스터마이징** | `.env` + HTML 파일로 로고·제목·홈 히어로 변경 (프론트 재빌드 불필요) |
| **MCP (선택)** | Cursor 등 AI 에이전트가 API로 문서 import·관리 |

---

## 빠른 시작

### 요구 사항

- [Docker](https://docs.docker.com/get-docker/) · [Docker Compose](https://docs.docker.com/compose/)

### 1. 클론 및 환경 변수

```bash
git clone <repository-url> manual-web
cd manual-web
cp .env.example .env   # 필요 시 SECRET_KEY, CORS 등 수정
```

### 2. 개발 서버 기동

```bash
docker compose -f docker-compose.dev.yml up -d
```

| 서비스 | URL |
|--------|-----|
| 웹 UI | http://localhost:5173 |
| API | http://localhost:8000 |
| API 문서 (dev) | http://localhost:8000/docs |

브라우저에서 **http://localhost:5173/setup** 으로 접속해 관리자 계정과 첫 제품을 만듭니다.

### 3. 프로덕션 (LAN / nginx)

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

기본 포트는 `.env`의 `FRONTEND_PORT`(기본 80)입니다. 상세 절차는 [docs/getting-started.md](./docs/getting-started.md)를 참고하세요.

### MCP 서버 (선택)

```bash
docker compose -f docker-compose.dev.yml --profile mcp up -d mcp
```

---

## 사이트 브랜딩 (`.env`)

배포 환경마다 **이름·로고·홈 상단**만 바꿀 때 코드를 건드리지 않습니다. 값은 백엔드 컨테이너 경로 기준이며, 변경 후 아래처럼 재시작합니다.

```bash
docker compose -f docker-compose.dev.yml restart backend
```

### 헤더 · 탭 제목

| 변수 | 설명 |
|------|------|
| `SITE_BRAND_TITLE` | 헤더·브라우저 탭 제목 (기본: `Manual Web`) |
| `SITE_BRAND_LOGO_LETTER` | 로고 없을 때 아이콘 글자 |
| `SITE_BRAND_LOGO_PATH` | 로고 파일 경로 또는 `https://` URL |

로컬 파일은 `data/uploads` 밖에 있어도 기동 시 `uploads/_site/brand/`로 복사되어 `/uploads/…`로 제공됩니다.

### 홈 상단 HTML 템플릿

| 변수 | 설명 |
|------|------|
| `SITE_HOME_HERO_HTML_PATH` | 공통 HTML (UTF-8, `<section>` 전체) |
| `SITE_HOME_HERO_HTML_PATH_KO` / `_EN` | 로케일별 override |

미설정 시 공개 홈에 설정 안내 문구가 표시됩니다. HTML은 서버에서 sanitize 후 노출됩니다.

**예시 파일:** [branding/home-hero.ko.example.html](./branding/home-hero.ko.example.html)

**파일 마운트 예시** — `docker-compose.dev.yml`의 `backend.volumes`에 추가:

```yaml
- ./branding:/app/data/branding:ro
```

```env
SITE_BRAND_TITLE=우리 매뉴얼
SITE_BRAND_LOGO_PATH=/app/data/branding/logo.png
SITE_HOME_HERO_HTML_PATH_KO=/app/data/branding/home-hero.ko.html
```

전체 변수: [.env.example](./.env.example)

---

## 문서

| 문서 | 내용 |
|------|------|
| [spec.md](./spec.md) | 기능·API·데이터 모델 상세 스펙 |
| [docs/getting-started.md](./docs/getting-started.md) | 환경 설정, 테스트, MCP 연동 |
| [docs/checklist.md](./docs/checklist.md) | 릴리스·배포 수동 점검 |

---

## 개발

### 기술 스택

| Backend | Frontend | 기타 |
|---------|----------|------|
| Python 3.11+, FastAPI | React 18, Vite, TypeScript | JWT · bcrypt |
| SQLAlchemy 2.0, Alembic | Tailwind CSS, Zustand | SQLite FTS5 |
| | MD + Toast UI 에디터 | Docker Compose |

### 디렉터리

```
manual-web/
├── backend/     # FastAPI, Alembic, pytest
├── frontend/    # React SPA
├── mcp/         # MCP 서버 (선택)
├── branding/    # 로고·홈 히어로 HTML 예시
├── docs/
├── docker-compose.dev.yml
└── docker-compose.prod.yml
```

### 테스트

```bash
docker compose -f docker-compose.dev.yml exec backend pytest -q
docker compose -f docker-compose.dev.yml exec frontend npm test -- --run
```

---

## 라이선스

[MIT License](./LICENSE)
