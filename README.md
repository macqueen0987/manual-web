# Manual Web

> 버전 기반 제품 매뉴얼을 웹으로 제공하고, 관리자가 실시간으로 마크다운을 편집·발행할 수 있는 문서화 플랫폼

---

## ✨ Features

- 📝 **버전 기반 매뉴얼 관리** — 날짜/버전 단위로 제품 문서를 발행하고 독자에게 제공
- 🖊️ **실시간 마크다운 에디터** — 관리자가 웹에서 직접 문서를 작성·수정 (MD + WYSIWYG 듀얼 에디터)
- 🏷️ **버전 발행 (Snapshot)** — 특정 시점의 매뉴얼 전체를 스냅샷으로 보관·배포
- 🔍 **풀텍스트 검색** — 발행된 버전 대상 SQLite FTS5 기반 검색
- 🖼️ **미디어 첨부** — 이미지, 동영상, PDF, ZIP 업로드 및 삽입
- 🔐 **JWT 인증 + 관리자 권한** — 로그인·토큰 갱신·관리자 전용 API 보호
- 🧙 **초기 설정 마법사** — 첫 실행 시 웹 UI로 관리자 계정 및 첫 제품 생성
- 📱 **반응형 레이아웃** — 모바일 사이드바 토글 + TOC 고정

---

## 🚀 Quick Start

```bash
# 1. 환경 변수 복사
cp .env.example .env

# 2. 개발 환경 기동
docker compose -f docker-compose.dev.yml up -d

# 3. 브라우저에서 확인
# 프론트엔드  → http://localhost:5173
# API (Swagger) → http://localhost:8000/docs
```

> 최초 접속 시 `/setup`에서 관리자 계정과 첫 제품을 생성하세요.

### 배포

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

자세한 내용은 [docs/getting-started.md](./docs/getting-started.md)를 참고하세요.

---

## 🏗️ Tech Stack

| 영역 | 기술 |
|------|------|
| Backend | Python 3.11+, FastAPI, SQLAlchemy 2.0, Alembic |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| State | Zustand |
| Editor | `@uiw/react-md-editor`, `@toast-ui/react-editor` |
| DB | SQLite (현재) → PostgreSQL (향후 확장) |
| Auth | JWT (Access + Refresh Token), bcrypt |
| Search | SQLite FTS5 |
| DevOps | Docker, Docker Compose |

---

## 📁 Project Structure

```
manual-web/
├── backend/          # FastAPI 애플리케이션
│   ├── app/          # API, 서비스, 모델, 스키마
│   ├── alembic/      # DB 마이그레이션
│   ├── data/         # SQLite DB, 문서, 업로드 파일
│   └── tests/        # pytest 테스트
├── frontend/         # React 애플리케이션
│   ├── src/          # 컴포넌트, 페이지, 스토어
│   └── public/
├── mcp/              # MCP(Model Context Protocol) 서버 (선택)
├── docs/             # 프로젝트 문서
├── docker-compose.dev.yml
└── docker-compose.prod.yml
```

---

## 📚 Documentation

| 문서 | 설명 |
|------|------|
| [spec.md](./spec.md) | 상세 기능 스펙 및 아키텍처 |
| [docs/getting-started.md](./docs/getting-started.md) | 개발 환경 구성, 테스트, MCP 가이드 |
| [docs/agent-gate.md](./docs/agent-gate.md) | 멀티 에이전트 충돌 방지 설정 |
| [docs/checklist.md](./docs/checklist.md) | 릴리스 전·배포 후 수동 점검 체크리스트 |

---

## 🧪 Testing

```bash
# 백엔드
docker compose -f docker-compose.dev.yml exec backend pytest -q

# 프론트엔드
docker compose -f docker-compose.dev.yml exec frontend npm test -- --run
```

---

## 🤝 Multi-Agent (Agent Gate)

여러 AI(Cursor / Kimi)가 동시에 작업할 때 파일 충돌 및 빌드 게이트를 조율합니다.

- 대시보드: http://localhost:8765/?workspace_id=manual-web
- 상세 설정: [docs/agent-gate.md](./docs/agent-gate.md)

---

## 📄 License

이 프로젝트는 [MIT License](./LICENSE)를 따릅니다.
