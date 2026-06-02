# Manual Web - 프로젝트 스펙

> Reference: https://docs.uipath.com  
> Goal: 다양한 제품의 버전별 매뉴얼을 웹으로 제공하고, 관리자가 실시간으로 WYSIWYG 편집 및 버전 관리할 수 있는 시스템

---

## 1. 프로젝트 개요

**Manual Web**은 날짜/버전 기반으로 제품 매뉴얼을 제공하는 문서화 플랫폼이다.  
모든 매뉴얼 콘텐츠는 마크다운 파일로 디스크에 영속화되며, 관리자는 웹 기반 WYSIWYG 에디터로 실시간 편집할 수 있다.  
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
| 에디터 (향후) | **Toast UI Editor (WYSIWYG)** | 스펙 목표; Phase 4에서 전환 검토 |
| 마크다운 렌더링 | **react-markdown + remark/rehype 플러그인** | TOC 자동 생성, 코드 하이라이트, 깨끗한 HTML 출력 |
| 버전 관리 | **DB 메타데이터 + 파일 시스템 스냅샷** | Git 의존성 제거, 단순한 복사/압축 기반, 롤백 용이 |
| 초기 설정 | **Setup Wizard** (첫 실행 시) | 별도 설정 파일 없이 웹 UI로 관리자 계정 및 첫 제품 생성 |

---

## 3. 기능 요구사항 (Functional Requirements)

### 3.1 사용자 인증 (Auth)
- [x] **로그인**: 이메일/비밀번호로 JWT Access + Refresh Token 발급 (현재 localStorage; HttpOnly는 향후)
- [x] **토큰 갱신**: `POST /api/auth/refresh` body `{ "token": "..." }` 또는 `{ "refresh_token": "..." }` + axios 인터셉터
- [ ] **로그아웃**: Refresh Token 서버 폐기 (현재 클라이언트 삭제만)
- [ ] **권한 관리**: 관리자(Admin) / 읽기 전용(Viewer) 역할 구분 (초기에는 Admin만)
- [x] **초기 설정 마법사**: `/setup` → 관리자 + 첫 제품 + `latest` 버전 + `index.md` + `documents` 행 생성

### 3.2 제품 관리 (Product) — 관리자 전용
- [ ] **제품 생성**: 제품명, slug (URL용), 설명, 표시 순서 설정
- [ ] **제품 수정**: 메타데이터 변경
- [ ] **제품 삭제**: 하위 버전 및 모든 문서 함께 삭제 (soft delete 고려)
- [ ] **제품 목록 조회**: 공개 API, 로그인 불필요

### 3.3 버전 관리 (Version) — 관리자 전용
- [ ] **버전 생성**: 버전명 (예: `2026.05.01`, `v2.1.0`, `latest`), 기준 버전(base version) 선택 가능 (복사하여 시작) — API만, 파일 복사 미구현
- [x] **버전 발행 (Publish)**: `POST /api/products/{product_slug}/versions/publish` — `latest/` `copytree` + 문서 `file_path`를 `{product}/{snapshot}/...`로 클론. `latest`는 계속 편집 가능
- [ ] **버전 전환**: `latest`에서 특정 발행 버전으로 전환하여 과거 문서 열람
- [ ] **버전 목록 조회**: 공개 API

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
- [ ] **문서 생성**: 제목, 슬러그, 부모 문서(계층 구조), 콘텐츠(WYSIWYG)
- [ ] **문서 수정**: 실시간 WYSIWYG 편집. 저장 시 마크다운 파일로 디스크에 기록
- [ ] **문서 삭제**: 파일 시스템 및 DB 메타데이터 동시 삭제
- [ ] **문서 이동**: 드래그 앤 드롭 또는 선택 방식으로 계층 구조 변경
- [ ] **문서 목록 조회**: 트리 구조로 반환 (공개 API)

### 3.5 미디어 첨부 (Media)
- [ ] **이미지 업로드**: 에디터 내 이미지 드래그 앤 드롭 또는 붙여넣기 → 서버 업로드 → 마크다운 `![alt](url)` 삽입
- [ ] **동영상 첨부**: 외부 URL (YouTube, Vimeo) 임베드 또는 직접 업로드 (mp4 등)
- [ ] **파일 첨부**: PDF, ZIP 등 다운로드 링크 생성
- [ ] **미디어 관리**: 업로드된 파일 목록 조회, 삭제 (미사용 파일 정리 기능은 향후)

> **미디어 저장 경로:**
```
data/uploads/{product_slug}/{version_or_latest}/{uuid}.{ext}
```

### 3.6 문서 열람 (Public View)
- [ ] **제품 홈**: 제품별 랜딩 페이지 (README/index.md 렌더링)
- [ ] **버전 선택기**: 상단 드롭다운으로 버전 전환
- [ ] **사이드바 네비게이션**: 좌측 트리 메뉴 (UIPath Docs 스타일), 현재 문서 하이라이트
- [ ] **문서 렌더링**: 마크다운 → HTML, TOC(Table of Contents) 우측 고정, 코드 블록 하이라이트
- [ ] **검색**: 제품 내 문서 제목 + 콘텐츠 풀텍스트 검색 (SQLite FTS 또는 단순 LIKE, 향후 Elasticsearch 고려)
- [ ] **반응형**: 모바일에서 사이드바 토글

---

## 4. 비기능 요구사항 (Non-Functional Requirements)

- [ ] **확장성**: SQLAlchemy로 DB 추상화. 향후 PostgreSQL로 교체 시 설정값만 변경
- [ ] **성능**: 정적 파일(이미지, CSS, JS)은 CDN 없이도 브라우저 캐싱 활용. 마크다운 파일은 메모리 캐싱(선택적)
- [ ] **보안**: 비밀번호 bcrypt 해싱, JWT secret 분리, CORS 설정, 파일 업로드 확장자/크기 제한
- [ ] **백업**: `data/` 디렉토리 전체를 주기적으로 백업하면 모든 콘텐츠 + DB 복원 가능
- [ ] **로깅**: API 요청/응답, 에러 스택트레이스 기록

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
| is_published | BOOLEAN | 발행 여부 |
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
- `GET /api/products/{product_slug}/versions` → 버전 목록 (공개)
- `GET /api/products/{product_slug}/versions/{version_slug}` → 버전 상세 (공개)
- `POST /api/versions` → 버전 생성 (Admin)
- `POST /api/products/{product_slug}/versions/publish` → **latest** 스냅샷 발행 (Admin)
- `DELETE /api/versions/{id}` → 버전 삭제 (Admin)

### Document
- `GET /api/products/{product_slug}/versions/{version_slug}/documents` → 문서 트리 (공개)
- `GET /api/products/{product_slug}/versions/{version_slug}/documents/{doc_slug}` → 문서 내용 (공개)
- `POST /api/documents` → 문서 생성 (Admin)
- `PUT /api/documents/{id}` → 문서 수정 (Admin)
- `DELETE /api/documents/{id}` → 문서 삭제 (Admin)
- `POST /api/documents/{id}/move` → 문서 이동 (Admin)

### Media
- `POST /api/upload` → 파일 업로드 (Admin) → `{url}` 반환
- `GET /api/media` → 업로드 목록 (Admin)
- `DELETE /api/media/{id}` → 파일 삭제 (Admin)

### Search
- `GET /api/search?q={query}&product={slug}` → 풀텍스트 검색

---

## 8. 프론트엔드 페이지 구조

| 경로 | 설명 | 접근 |
|------|------|------|
| `/setup` | 초기 설정 마법사 | Public (미설정 시에만) |
| `/login` | 관리자 로그인 | Public |
| `/admin` | 관리자 대시보드 (제품/버전/문서 관리) | Admin |
| `/admin/products/{slug}/edit` | 제품 설정 | Admin |
| `/admin/products/{slug}/{version}/editor` | 마크다운 에디터 | Admin |
| `/admin/products/{slug}/{version}/editor/{doc_slug}` | 특정 문서 편집 (딥링크) | Admin |
| `/` | 랜딩 (제품 목록) | Public |
| `/{product_slug}` | 제품 홈 (`latest`, `index` 문서) | Public |
| `/{product_slug}/{doc_slug}` | latest 버전의 문서 (버전 slug와 구분: 버전 목록에 있으면 버전 홈) | Public |
| `/{product_slug}/{version}` | 특정 버전 홈 | Public |
| `/{product_slug}/{version}/{doc_slug}` | 문서 열람 | Public |

---

## 9. 파일/디렉토리 구조

```
manual-web/
├── spec.md                     # ← 본 파일
├── README.md
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py             # FastAPI 앱 진입점
│   │   ├── core/
│   │   │   ├── config.py       # Pydantic Settings
│   │   │   ├── security.py     # JWT, bcrypt
│   │   │   └── constants.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── product.py
│   │   │   ├── version.py
│   │   │   └── document.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── product.py
│   │   │   ├── version.py
│   │   │   └── document.py
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── deps.py         # 의존성 주입 (DB 세션, 현재 유저)
│   │   │   ├── v1/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── auth.py
│   │   │   │   ├── setup.py
│   │   │   │   ├── products.py
│   │   │   │   ├── versions.py
│   │   │   │   ├── documents.py
│   │   │   │   ├── media.py
│   │   │   │   └── search.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   ├── product_service.py
│   │   │   ├── version_service.py
│   │   │   ├── document_service.py
│   │   │   └── media_service.py
│   │   └── db/
│   │       ├── __init__.py
│   │       ├── base.py         # SQLAlchemy Base
│   │       └── session.py      # Engine + SessionLocal
│   ├── alembic/                # 마이그레이션
│   ├── data/                   # .gitignore
│   │   ├── app.db
│   │   ├── docs/               # 마크다운 파일
│   │   └── uploads/            # 이미지/동영상
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api/
│   │   │   └── client.ts       # axios 인스턴스 + 인터셉터
│   │   ├── components/
│   │   │   ├── ui/             # shadcn/ui 컴포넌트
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   └── VersionSelector.tsx
│   │   │   ├── editor/
│   │   │   │   └── ToastEditor.tsx
│   │   │   └── docs/
│   │   │       ├── MarkdownRenderer.tsx
│   │   │       └── TableOfContents.tsx
│   │   ├── pages/
│   │   │   ├── SetupPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── AdminPage.tsx
│   │   │   ├── EditorPage.tsx
│   │   │   ├── ProductHomePage.tsx
│   │   │   └── DocumentPage.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useProduct.ts
│   │   │   └── useDocument.ts
│   │   ├── stores/
│   │   │   └── authStore.ts
│   │   └── types/
│   │       └── index.ts
│   ├── public/
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
└── docker-compose.yml
```

---

## 10. 버전 발행 (Snapshot) 프로세스

1. 관리자가 Admin에서 **latest** 옆 "Publish snapshot" 클릭 (이름·slug 입력)
2. 백엔드가 `data/docs/{product}/latest` → `data/docs/{product}/{slug}` **전체 복사** (`shutil.copytree`)
3. DB에 **새** `versions` 레코드 (`is_published=true`, `is_latest=false`, `snapshot_path` 기록)
4. `latest`의 `documents` 행을 복제해 발행 버전용 `file_path`를 스냅샷 경로로 갱신
5. `latest` 디렉터리·버전은 그대로 편집 가능
6. 독자는 발행 버전 slug로 조회 시 스냅샷 경로의 파일·메타데이터 사용

> **최적화**: 파일 수가 많아질 경우 `tar.gz` 압축 후 조회 시 임시 해제 고려. 초기에는 단순 복사로 시작.

---

## 11. 개발 단계 (Roadmap)

### Phase 1: Foundation
- [x] 프로젝트 스캐폴딩 (FastAPI + React + Tailwind)
- [~] DB 모델 (`create_all`; Alembic revision 파일은 미작성)
- [x] 초기 설정 마법사 API + UI
- [x] JWT 인증 (로그인/토큰 갱신; 서버 로그아웃·HttpOnly는 미완)

### Phase 2: Core Features
- [x] 제품 CRUD API + Admin UI (생성 시 `latest`·`index` bootstrap)
- [x] 버전 발행 API + Admin UI / [ ] base 버전 복사로 신규 버전 생성
- [x] 문서 트리 CRUD API + MD 에디터 UI
- [~] 이미지 업로드 (`/api/upload`) / [ ] Toast UI WYSIWYG
- [x] 마크다운 파일 I/O 연동

### Phase 3: Public View
- [x] 제품/버전 선택 UI + URL 라우팅
- [x] 사이드바 네비게이션 + 문서 렌더링 (코드 하이라이트)
- [ ] TOC (우측 고정)
- [x] 반응형 레이아웃 (모바일 사이드바)

### Phase 4: Polish
- [ ] 풀텍스트 검색
- [ ] 동영상/파일 첨부
- [ ] 미디어 관리 페이지
- [ ] 에러 처리, 로딩 상태, 낙관적 업데이트
- [ ] Docker compose 배포

---

## 12. 확장성 로드맵 (Future)

- [ ] **DB 마이그레이션**: SQLite → PostgreSQL (동일 SQLAlchemy 설정으로 전환)
- [ ] **캐싱 레이어**: Redis 도입 (세션, 토큰 블랙리스트, 검색 인덱스)
- [ ] **검색 엔진**: Meilisearch 또는 Elasticsearch 연동
- [ ] **i18n**: 다국어 지원 (영문/국문)
- [ ] **SSO**: Google Workspace / Azure AD 연동
- [ ] **Git 연동**: 선택적으로 Git Push로 버전 발행
