# Getting Started

> 제품 매뉴얼 웹 앱의 로컬 개발 및 배포 가이드입니다.  
> 기능 스펙은 루트 [`spec.md`](../spec.md)를 참고하세요.

---

## 사전 준비

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/)

---

## 빠른 시작

### 개발 환경

```bash
docker compose -f docker-compose.dev.yml up -d
```

| 서비스 | 주소 |
|--------|------|
| 프론트엔드 | http://localhost:5173 |
| API | http://localhost:8000 |

### 배포 환경 (LAN / nginx)

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

| 서비스 | 주소 |
|--------|------|
| 프론트엔드 | http://localhost (`FRONTEND_PORT`) |
| API | http://localhost:8000 |

> 루트에 `.env`를 두면 Compose가 자동으로 읽습니다.  
> `cp .env.example .env` 후 필요한 값을 수정하세요.

---

## 환경 설정

최초 실행 시 아래 조건을 만족해야 체크리스트 및 E2E 점검이 가능합니다.

1. **초기 설정 완료** — `GET /api/setup/status` → `is_setup_complete: true`
2. **발행된 버전**이 있는 제품 1개 이상  
   예: `uipath-studio` / `2026.05.01`. 시드만 쓴 Blue 제품은 `latest`만 있으면 공개 문서가 비어 보일 수 있습니다.
3. **관리자 계정** — Admin 체크리스트 점검용

---

## 테스트

### 단위 테스트 (백엔드)

```bash
docker compose -f docker-compose.dev.yml exec backend pytest -q
```

### 프론트엔드 테스트

```bash
docker compose -f docker-compose.dev.yml exec frontend npm test -- --run
```

### API + MCP 통합 테스트

```bash
docker compose -f docker-compose.dev.yml exec backend pytest tests/test_mcp_markdown_media.py tests/test_mcp_api.py tests/test_mcp_tools.py -q
```

---

## MCP 컨테이너 (선택)

`docker compose -f docker-compose.dev.yml up -d`만으로는 **MCP가 올라가지 않습니다** (`profiles: mcp`).

```bash
# 기본 서비스 먼저 기동
docker compose -f docker-compose.dev.yml up -d

# MCP 추가 기동
docker compose -f docker-compose.dev.yml --profile mcp up -d mcp
```

- 첫 기동 시 `mcp/ensure_setup.py`가 DB가 비어 있으면 `/api/setup/init`으로 **MCP 전용 관리자 + 제품**을 생성합니다 (`.env`의 `MCP_ADMIN_*`).
- SSE 엔드포인트: `http://localhost:8001/sse`
- Cursor 설정 예시: [`.cursor/mcp.json.example`](../.cursor/mcp.json.example)
- 로컬 `.md` import 경로는 컨테이너 기준 `/workspace/...` (저장소 루트 마운트)
- 미디어 도구: `upload_media`, `upload_media_directory`, `list_media`, `delete_media`, `cleanup_orphan_media`
  - import 시 `upload_local_images=true`(기본)면 md 옆 상대 경로 이미지를 자동 업로드합니다.
