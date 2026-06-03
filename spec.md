# Manual Web - 프로젝트 스펙

> Reference: https://docs.uipath.com  
> Goal: 다양한 제품의 버전별 매뉴얼을 웹으로 제공하고, 관리자가 실시간으로 WYSIWYG 편집 및 버전 관리할 수 있는 시스템

---

## 1. 프로젝트 개요

**Manual Web**은 날짜/버전 기반으로 제품 매뉴얼을 제공하는 문서화 플랫폼이다.  
모든 매뉴얼 콘텐츠는 마크다운 파일로 디스크에 영속화되며, 관리자는 웹 기반 마크다운 에디터(MD + 미리보기)로 실시간 편집할 수 있다.  
버전 발행 기능을 통해 특정 시점의 매뉴얼 전체를 스냅샷으로 보관하고, 독자는 원하는 버전의 문서를 열어볼 수 있다.

---

## 2. 핵심 결정사항

| 영역 | 선택 | 근거 |
|------|------|------|
| 백엔드 프레임워크 | **FastAPI** (Python) | 고성능, 비동기, 자동 API 문서(Swagger), SQLAlchemy 연동 우수 |
| 프론트엔드 | **React 18 + Vite + TypeScript** | 빠른 HMR, 타입 안정성, 풍부한 에코시스템 |
| 상태 관리 | **Zustand** | 보일러플레이트 최소화, 비동기 미들웨어 지원 |
| 스타일링 | **Tailwind CSS** (shadcn/ui는 Phase 4) | 빠른 UI 개발; 컴포넌트 라이브러리는 점진 도입 |
| DB | **SQLite** (현재) → **PostgreSQL** (향후) | SQLAlchemy로 추상화하여 마이그레이션 용이 |
| ORM | **SQLAlchemy 2.0** + **Alembic** | DB 독립성, 마이그레이션 관리 |
| 인증 | **JWT Access Token + Refresh Token** | 무상태 인증, 모바일/데스크톱 공용 |
| 에디터 (현재) | **@uiw/react-md-editor** | 마크다운 편집·미리보기, 이미지 업로드 연동 (MVP) |
| 에디터 (향후) | **Toast UI Editor (WYSIWYG)** | `package.json`에 의존성만 존재·미사용; Phase 4 전환 검토 |
| 마크다운 렌더링 | **react-markdown + remark/rehype 플러그인** | TOC 자동 생성, 코드 하이라이트, 깨끗한 HTML 출력 |
| 버전 관리 | **DB 메타데이터 + 파일 시스템 스냅샷** | Git 의존성 제거, 단순한 복사/압축 기반, 롤백 용이 |
| 초기 설정 | **Setup Wizard** (첫 실행 시) | 별도 설정 파일 없이 웹 UI로 관리자 계정 및 첫 제품 생성 |

---

## 3. 기능 요구사항 (Functional Requirements)

> 체크: `[x]` 완료 · `[~]` 부분 구현 · `[ ]` 미구현

### 3.1 사용자 인증 (Auth)
- [x] **로그인**: 이메일/비밀번호로 JWT Access + Refresh Token 발급 (현재 localStorage; HttpOnly는 향후)
- [x] **토큰 갱신**: `POST /api/auth/refresh` body `{ "token": "..." }` 또는 `{ "refresh_token": "..." }` + axios 인터셉터
- [x] **로그아웃**: Refresh Token DB 폐기 + 클라이언트 삭제
- [~] **권한 관리**: `is_superuser`로 Admin API 보호 (`deps.get_current_admin_user`); Viewer 역할 없음. **미발행 버전·latest 공개 열람 제한**은 스펙 정의됨·**미구현** (현재는 전 버전 공개 API)
- [x] **초기 설정 마법사**: `/setup` → 관리자 + 첫 제품 + `latest` 버전 + `index.md` + `documents` 행 생성

### 3.2 제품 관리 (Product) — 관리자 전용
- [x] **제품 생성**: 제품명, slug, 설명, 표시 순서 + `latest` bootstrap
- [x] **제품 수정**: Admin 대시보드 모달 + `PUT /api/products/{id}` (별도 `/edit` 라우트 없음)
- [x] **제품 삭제**: DB cascade + `data/docs`, `data/uploads` 디렉터리 삭제
- [x] **제품 목록 조회**: 공개 API

### 3.3 버전 관리 (Version)
- [x] **버전 생성** (Admin): base 버전(또는 latest)에서 파일·문서 메타 복사 (`is_published=false`)
- [x] **버전 발행 (Publish)** (Admin): `POST /api/products/{product_slug}/versions/publish` → `is_published=true`
- [x] **버전 전환**: 공개 UI 버전 드롭다운 + URL
- [~] **버전 목록 조회**: 공개 API (현재 전 버전 반환; 아래 **가시성** 규칙 미적용)
- [ ] **버전 가시성 (미발행본)**:
  - **독자(비로그인·일반)**: `is_published=true`인 버전만 목록·URL·문서·검색 결과에 노출
  - **관리자** (`is_superuser`, JWT): `latest`·미발행 스냅샷(`is_published=false`) 포함 **전 버전** 열람·버전 선택기 표시 (미발행은 "초안" 등으로 구분 표시)
  - 미발행 버전 URL 직접 접근 시 비관리자 → **404** (또는 발행 버전으로 리다이렉트 정책 중 택일)

> **버전 파일 구조 예시:**
```
data/docs/
├── {product_slug}/
│   ├── latest/              # 현재 작업 중 (가변)
│   │   ├── index.md
│   │   ├── getting-started/
│   │   │   ├── installation.md
│   │   │   └── configuration.md
│   │   └── api-reference/
│   │       └── endpoints.md
│   ├── 2026.05.01/          # 발행된 버전 (불변)
│   ├── 2026.04.01/          # 발행된 버전 (불변)
│   └── ...
```

### 3.4 문서 관리 (Document / Page) — 관리자 전용
- [x] **문서 생성**: MD 에디터 + 마크다운 파일 기록
- [x] **문서 수정**: MD 에디터, 디스크 저장
- [x] **문서 삭제**: 파일 + DB (에디터 UI)
- [x] **문서 이동**: 에디터에서 `PUT /api/documents/{id}` (`parent_id`); `POST .../move` API는 있으나 FE 미사용; DnD 미구현
- [x] **문서 목록 조회**: 트리 구조 (공개 API)

### 3.5 미디어 첨부 (Media)
- [x] **이미지 업로드**: 버튼·붙여넣기(`image/*`만) → `POST /api/upload` → 마크다운 삽입
- [~] **동영상·파일 업로드 (백엔드만)**: `media.py`에서 `.mp4`, `.pdf`, `.zip` 확장자 허용; 에디터 UI·embed 없음
- [ ] **동영상 첨부**: YouTube/Vimeo embed 또는 업로드 후 플레이어 마크다운 UX
- [ ] **파일 첨부**: PDF/ZIP 업로드 버튼 및 다운로드 링크 삽입 UX
- [ ] **미디어 관리**: `GET/DELETE /api/media` 및 관리 UI (현재 `POST /upload`만 구현)

> **미디어 저장 경로:**
```
data/uploads/{product_slug}/{version_or_latest}/{uuid}.{ext}
```

### 3.6 문서 열람 (Public View)
- [x] **제품 홈**: `index.md` 자동 로드
- [x] **버전 선택기**: 상단 드롭다운
- [~] **버전 선택 범위**: 독자는 **발행된 버전만**; 관리자 로그인 시 미발행·latest 포함 (§3.3 가시성 — **미구현**)
- [x] **사이드바 네비게이션**: 트리 + 하이라이트
- [x] **문서 렌더링**: 마크다운 + 코드 하이라이트 + **TOC 우측 고정** (xl+)
- [~] **검색**: 제목·본문 LIKE 스캔 API + UI (미발행 버전 제외 — **미구현**)
- [x] **반응형**: 모바일 사이드바 토글

---

## 4. 비기능 요구사항 (Non-Functional Requirements)

- [~] **확장성**: SQLAlchemy ORM·Alembic 적용됨; PostgreSQL 전환·운영 설정은 미착수
- [ ] **성능**: 정적 파일(이미지, CSS, JS)은 CDN 없이도 브라우저 캐싱 활용. 마크다운 파일은 메모리 캐싱(선택적)
- [x] **보안**: bcrypt, JWT, CORS, 업로드 확장자/50MB 제한
- [ ] **백업**: `data/` 디렉토리 전체를 주기적으로 백업하면 모든 콘텐츠 + DB 복원 가능 (운영 가이드만)
- [x] **로깅**: API 요청 메서드·경로·상태·소요(ms) 미들웨어

---

## 5. 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Browser)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Public Docs │  │ Admin Editor │  │   Setup Wizard   │  │
│  │  (React)     │  │  (React)     │  │   (React)        │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
└─────────┼────────────────┼───────────────────┼────────────┘
          │                │                   │
          └────────────────┴───────────────────┘
                           │ HTTPS / REST + JWT
┌──────────────────────────┼──────────────────────────────────┐
│                          ▼                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              FastAPI (Python 3.11+)                    │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐  │  │
│  │  │  Auth   │ │ Product │ │ Version │ │  Document   │  │  │
│  │  │  API    │ │  API    │ │  API    │ │   API       │  │  │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └──────┬──────┘  │  │
│  │       └───────────┴───────────┴─────────────┘          │  │
│  │                          │                             │  │
│  │  ┌───────────────────────┴───────────────────────┐     │  │
│  │  │           Services (Business Logic)            │     │  │
│  │  │  - AuthService (JWT)                           │     │  │
│  │  │  - ProductService                              │     │  │
│  │  │  - VersionService (Snapshot)                   │     │  │
│  │  │  - DocumentService (File I/O)                  │     │  │
│  │  │  - MediaService (Upload/Download)              │     │  │
│  │  └───────────────────────┬───────────────────────┘     │  │
│  │                          │                             │  │
│  │  ┌───────────────────────┴───────────────────────┐     │  │
│  │  │              SQLAlchemy ORM (2.0)              │     │  │
│  │  └───────────────────────┬───────────────────────┘     │  │
│  └──────────────────────────┼──────────────────────────────┘  │
│                             │                                 │
│  ┌──────────────────────────┼──────────────────────────────┐  │
│  │  data/                   │                               │  │
│  │  ├── app.db (SQLite)     │                               │  │
│  │  ├── docs/               │                               │  │
│  │  │   └── {product}/{ver}/│  ← Markdown Files            │  │
│  │  └── uploads/            │                               │  │
│  │      └── {product}/...   │  ← Media Files               │  │
│  └──────────────────────────┴──────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

---

## 6. DB 스키마 (SQLite → 확장 가능)

### 6.1 `users`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | |
| email | VARCHAR(255) UQ | |
| hashed_password | VARCHAR(255) | bcrypt |
| full_name | VARCHAR(255) | |
| is_active | BOOLEAN | 기본 true |
| is_superuser | BOOLEAN | 기본 false |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### 6.2 `products`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | |
| name | VARCHAR(255) | 제품명 |
| slug | VARCHAR(255) UQ | URL용 (예: `uipath-studio`) |
| description | TEXT | 설명 |
| sort_order | INTEGER | 표시 순서 |
| is_active | BOOLEAN | |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### 6.3 `versions`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | |
| product_id | INTEGER FK | |
| name | VARCHAR(255) | 버전명 (예: `2026.05.01`) |
| slug | VARCHAR(255) | URL용 (예: `2026-05-01`) |
| is_published | BOOLEAN | 발행 여부; **false**면 독자에게 숨김, 관리자는 열람 가능 (§3.3) |
| is_latest | BOOLEAN | 현재 작업 중 여부 (제품당 1개만 true) |
| snapshot_path | VARCHAR(500) | 스냅샷 디렉토리 경로 (발행 시) |
| base_version_id | INTEGER FK NULL | 복사한 기준 버전 |
| published_at | DATETIME NULL | 발행 일시 |
| created_at | DATETIME | |

### 6.4 `documents`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | |
| version_id | INTEGER FK | |
| parent_id | INTEGER FK NULL | 계층 구조 |
| title | VARCHAR(255) | |
| slug | VARCHAR(255) | URL용 파일명 |
| file_path | VARCHAR(500) | 실제 마크다운 파일 경로 |
| sort_order | INTEGER | |
| created_at | DATETIME | |
| updated_at | DATETIME | |

> **제약**: `(version_id, slug)` 복합 유니크.  
> 파일 내용은 DB에 저장하지 않고 `file_path`를 통해 파일 시스템에서 읽는다.  
> `file_path`는 `data/docs/` 기준 **상대 경로** (예: `{product_slug}/latest/index.md`).

### 6.5 `refresh_tokens` (선택적 블랙리스트 관리)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | |
| user_id | INTEGER FK | |
| token_hash | VARCHAR(255) | 토큰 해시 |
| expires_at | DATETIME | |
| created_at | DATETIME | |

---

## 7. API 엔드포인트 개요

### Auth
- `POST /api/auth/login` → Access + Refresh Token
- `POST /api/auth/refresh` → body `{ "token": "<refresh>" }` (또는 `refresh_token`) → 새 Access + Refresh Token
- `POST /api/auth/logout` → Refresh Token 폐기
- `GET /api/auth/me` → 현재 사용자 정보

### Setup (첫 실행 시만)
- `GET /api/setup/status` → 설정 완료 여부
- `POST /api/setup/init` → body `SetupInitRequest`: `{ "admin": UserCreate, "product": ProductCreate }`

### Product
- `GET /api/products` → 제품 목록 (공개)
- `GET /api/products/{slug}` → 제품 상세 (공개)
- `POST /api/products` → 제품 생성 (Admin)
- `PUT /api/products/{id}` → 제품 수정 (Admin)
- `DELETE /api/products/{id}` → 제품 삭제 (Admin)

### Version
- `GET /api/products/{product_slug}/versions` → 버전 목록 (비관리자: `is_published=true`만; 관리자 Bearer: 전체 — **미구현**, 현재 전체 공개)
- `GET /api/products/{product_slug}/versions/{version_slug}` → 버전 상세 (미발행·latest는 관리자만 — **미구현**)
- `POST /api/versions` → 버전 생성 (Admin)
- `POST /api/products/{product_slug}/versions/publish` → **latest** 스냅샷 발행 (Admin)
- `DELETE /api/versions/{id}` → 버전 삭제 (Admin)

### Document
- `GET /api/products/{product_slug}/versions/{version_slug}/documents` → 문서 트리 (발행 버전만 공개; 관리자는 미발행·latest — **미구현**)
- `GET /api/products/{product_slug}/versions/{version_slug}/documents/{doc_slug}` → 문서 내용 (동일 가시성 규칙 — **미구현**)
- `POST /api/documents` → 문서 생성 (Admin)
- `PUT /api/documents/{id}` → 문서 수정 (Admin)
- `DELETE /api/documents/{id}` → 문서 삭제 (Admin)
- `POST /api/documents/{id}/move` → 문서 이동 (Admin; FE는 `PUT` + `parent_id` 사용)
- `PUT /api/documents/{id}` → 제목·본문·`parent_id`·`sort_order` (Admin)

### Media
- `POST /api/upload` → 파일 업로드 (Admin) → `{url}` 반환 — **구현됨**
- `GET /api/media` → 업로드 목록 (Admin) — **미구현**
- `DELETE /api/media/{id}` → 파일 삭제 (Admin) — **미구현**

### Search
- `GET /api/search?q={query}&product={slug}` → 풀텍스트 검색 (발행 버전만 — **미구현**)

---

## 8. 프론트엔드 페이지 구조

| 경로 | 설명 | 접근 |
|------|------|------|
| `/setup` | 초기 설정 마법사 | Public (미설정 시에만) |
| `/login` | 관리자 로그인 | Public |
| `/admin` | 관리자 대시보드 (제품/버전/문서 관리) | Admin |
| `/admin` (제품 선택 → Edit 모달) | 제품 설정 (`PUT /api/products/{id}`) | Admin |
| `/admin/products/{slug}/{version}/editor` | 마크다운 에디터 | Admin |
| `/admin/products/{slug}/{version}/editor/{doc_slug}` | 특정 문서 편집 (딥링크) | Admin |
| `/` | 랜딩 (제품 목록) | Public |
| `/{product_slug}` | 제품 홈 (기본: **최신 발행** 버전의 `index`; latest 직접 노출 안 함 — **미구현**) | Public |
| `/{product_slug}/{doc_slug}` | 기본 발행 버전의 문서 (버전 slug와 구분: 버전 목록에 있으면 버전 홈) | Public |
| `/{product_slug}/{version}` | 특정 **발행** 버전 홈; 관리자는 미발행·latest URL 접근 가능 | Public / Admin(미발행) |
| `/{product_slug}/{version}/{doc_slug}` | 문서 열람 (동일) | Public / Admin(미발행) |

---

## 9. 파일/디렉토리 구조

> 아래는 **현재 코드베이스** 기준. 취소선·`(planned)` 항목은 스펙 목표이나 아직 없음.

```
manual-web/
├── spec.md
├── docker-compose.yml
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI; OpenAPI 비활성; /uploads 정적 마운트
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── security.py         # JWT, bcrypt
│   │   │   └── paths.py            # 문서 상대 경로 헬퍼
│   │   ├── middleware/
│   │   │   └── logging.py          # 요청 로깅
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── product.py
│   │   │   ├── version.py
│   │   │   ├── document.py
│   │   │   └── refresh_token.py
│   │   ├── schemas/                # auth, product, version, document, setup, user
│   │   ├── api/
│   │   │   ├── deps.py             # get_current_user, get_current_admin_user
│   │   │   └── v1/
│   │   │       ├── auth.py
│   │   │       ├── setup.py
│   │   │       ├── products.py
│   │   │       ├── versions.py
│   │   │       ├── documents.py
│   │   │       ├── media.py        # POST /upload 만
│   │   │       └── search.py
│   │   ├── services/
│   │   │   ├── auth_service.py
│   │   │   ├── refresh_token_service.py
│   │   │   ├── bootstrap_service.py
│   │   │   ├── product_service.py
│   │   │   ├── version_service.py
│   │   │   └── document_service.py
│   │   └── db/
│   │       ├── base.py
│   │       ├── session.py
│   │       └── migrate.py          # Alembic + legacy stamp
│   ├── alembic/versions/001_initial_schema.py
│   ├── data/                       # .gitignore
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.tsx                # 앱 진입점
│   │   ├── App.tsx
│   │   ├── api/client.ts           # axios + localStorage JWT
│   │   ├── stores/authStore.ts
│   │   ├── utils/markdown.ts
│   │   ├── components/
│   │   │   ├── layout/Sidebar.tsx
│   │   │   ├── docs/TableOfContents.tsx
│   │   │   └── admin/              # AdminLayout, Modal, Toast, DocTreeNav
│   │   └── pages/
│   │       ├── SetupPage.tsx
│   │       ├── LoginPage.tsx
│   │       ├── HomePage.tsx
│   │       ├── AdminPage.tsx
│   │       ├── EditorPage.tsx      # @uiw/react-md-editor
│   │       └── ProductPage.tsx     # react-markdown + 검색 UI
│   ├── package.json                # @toast-ui/react-editor: 미사용 의존성
│   └── vite.config.ts
└── (planned) backend/tests/, frontend/components/ui/, hooks/
```

---

## 10. 버전 발행 (Snapshot) 프로세스

1. 관리자가 Admin에서 **latest** 옆 "Publish snapshot" 클릭 (이름·slug 입력)
2. 백엔드가 `data/docs/{product}/latest` → `data/docs/{product}/{slug}` **전체 복사** (`shutil.copytree`)
3. DB에 **새** `versions` 레코드 (`is_published=true`, `is_latest=false`, `snapshot_path` 기록)
4. `latest`의 `documents` 행을 복제해 발행 버전용 `file_path`를 스냅샷 경로로 갱신
5. `latest` 디렉터리·버전은 그대로 편집 가능
6. 독자는 **발행된** 버전 slug로 조회 시 스냅샷 경로의 파일·메타데이터 사용
7. **가시성**: `is_published=false`인 버전(작업 중 `latest`, Admin에서 생성만 한 스냅샷)은 **관리자만** 목록·열람. 발행(`publish`) 전까지 독자·검색·공개 URL에 노출하지 않음 (§3.3)

> **최적화**: 파일 수가 많아질 경우 `tar.gz` 압축 후 조회 시 임시 해제 고려. 초기에는 단순 복사로 시작.

---

## 11. 개발 단계 (Roadmap)

체크 표기: `[x]` 완료 · `[~]` 부분 · `[ ]` 미착수  
**마지막 코드 대조**: 2026-06-03

### 구현 현황 요약 (코드 기준)

| Phase | 진행률 | 비고 |
|-------|--------|------|
| 1 Foundation | ~80% | HttpOnly 쿠키 미구현 |
| 2 Core | ~75% | MD 에디터 완료; Toast 의존성만 설치 |
| 3 Public | ~95% | MVP 공개 열람 완료 |
| 4 Polish | ~45% | 검색·Docker OK; 미디어·전역 UX 미완 |
| **합계** | **~72%** | Roadmap 항목 13/18 완료 + 2 부분 |

### Phase 1: Foundation
- [x] 프로젝트 스캐폴딩 (FastAPI + React + Tailwind)
- [x] DB 모델 + Alembic `001` initial + legacy DB stamp (`db/migrate.py`)
- [x] 초기 설정 마법사 API + UI
- [x] JWT 인증 (로그인/갱신/서버 로그아웃·`refresh_tokens` 테이블)
- [ ] HttpOnly 쿠키 (현재 `localStorage` + Bearer)

### Phase 2: Core Features
- [x] 제품 CRUD API + Admin UI (제품 수정은 `/admin` 모달)
- [x] 버전 발행 + base/latest 복사로 신규 버전 (`version_service.publish_latest`)
- [x] 문서 트리 CRUD + MD 에디터 (삭제·`parent_id` 이동)
- [x] 이미지 업로드 (product/version 경로, 붙여넣기)
- [x] 마크다운 파일 I/O 연동
- [ ] Toast UI WYSIWYG (`@toast-ui/react-editor` 미연동; `@uiw/react-md-editor` 사용 중)

### Phase 3: Public View
- [x] 제품/버전 선택 UI + URL 라우팅 (`ProductPage.resolveVersionAndDoc`)
- [x] 사이드바 + 문서 렌더링 + TOC (`ProductPage` + `TableOfContents`, xl+)
- [x] 반응형 레이아웃 (모바일 사이드바 토글)
- [ ] **미발행 버전 가시성**: API·공개 UI·검색에서 `is_published=false` / `latest` 제외; 관리자 JWT 시 전 버전 열람 (§3.3)

### Phase 4: Polish
- [x] 풀텍스트 검색 (기본 LIKE, `ProductPage` UI)
- [~] 동영상/파일 첨부 (업로드 API 확장자만; embed·에디터 UX 없음)
- [ ] 미디어 관리 페이지 (`GET/DELETE /api/media` 없음)
- [~] 에러 처리, 로딩 상태 (페이지별·Toast 알림; 전역 바운더리·낙관적 업데이트 없음)
- [x] Docker compose 배포

### 테스트·품질 (로드맵 외)
- [ ] `backend/tests/` 자동화 테스트 없음

---

## 12. 확장성 로드맵 (Future)

- [ ] **DB 마이그레이션**: SQLite → PostgreSQL (동일 SQLAlchemy 설정으로 전환)
- [ ] **캐싱 레이어**: Redis 도입 (세션, 토큰 블랙리스트, 검색 인덱스)
- [ ] **검색 엔진**: Meilisearch 또는 Elasticsearch 연동
- [ ] **i18n**: 다국어 지원 (영문/국문)
- [ ] **SSO**: Google Workspace / Azure AD 연동
- [ ] **Git 연동**: 선택적으로 Git Push로 버전 발행
