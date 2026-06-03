# Manual Web — 수동 점검 체크리스트

E2E 자동화 대신 릴리스 전·배포 후에 사람이 확인할 항목입니다.  
기능 스펙은 루트 [`spec.md`](../spec.md)를 참고하세요.

| 문서 | 대상 |
|------|------|
| [checklist-public.md](./checklist-public.md) | 비로그인·일반 독자 (홈, 문서 열림, 검색, 로그인) |
| [checklist-admin.md](./checklist-admin.md) | 관리자 (`is_superuser`, `/admin` 이하) |

---

## 사전 준비

```bash
docker compose -f docker-compose.dev.yml up -d
# 프론트: http://localhost:5173  · API: http://localhost:8000
```

배포(LAN/nginx):

```bash
docker compose -f docker-compose.prod.yml up --build -d
# 프론트: http://localhost (FRONTEND_PORT)  · API: http://localhost:8000
```

- Setup이 완료된 환경 (`GET /api/setup/status` → `is_setup_complete: true`)
- **발행된 버전**이 있는 제품 1개 이상 (예: `uipath-studio` / `2026.05.01`). 시드만 쓴 Blue 제품은 `latest`만 있으면 공개 문서가 비어 보일 수 있음
- 관리자 계정 (Admin 체크리스트용)

---

## 자동 검증 (선택)

Docker 안에서 단위 테스트만 빠르게 돌릴 때:

```bash
docker compose -f docker-compose.dev.yml exec backend pytest -q
docker compose -f docker-compose.dev.yml exec frontend npm test -- --run
```

### API + MCP 통합 테스트

- `tests/test_api_integration.py` — `TestClient` + in-memory SQLite (`app.factory.create_app`)
- `tests/test_mcp_api.py` — `mcp/client.py` + `TestClient` (compose가 `./mcp:/mcp` 마운트)

```bash
docker compose -f docker-compose.dev.yml exec backend pytest tests/test_mcp_markdown_media.py tests/test_mcp_api.py tests/test_mcp_tools.py -q
```

### MCP 컨테이너 (선택, 수동 기동)

`docker compose -f docker-compose.dev.yml up -d`만으로는 **MCP가 올라가지 않습니다** (`profiles: mcp`).

```bash
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml --profile mcp up -d mcp
```

- 첫 기동 시 `mcp/ensure_setup.py`가 DB가 비어 있으면 `/api/setup/init`으로 **MCP 전용 관리자 + 제품** 생성 (`.env`의 `MCP_ADMIN_*`)
- SSE: `http://localhost:8001/sse` — Cursor 설정은 [`.cursor/mcp.json.example`](../.cursor/mcp.json.example)
- 로컬 `.md` import 경로는 컨테이너 기준 `/workspace/...` (저장소 루트 마운트)
- 미디어: `upload_media`, `upload_media_directory`, `list_media`, `delete_media`, `cleanup_orphan_media` — import 시 `upload_local_images=true`(기본)면 md 옆 상대 경로 이미지 자동 업로드

---

## 사용 방법

체크리스트의 `[ ]` 항목을 `[x]`로 바꿔가며 기록하면 됩니다.

각 체크리스트 하단 **「E2E 2026-06-03」** 열은 관리자 로그인 상태로 브라우저 점검한 결과입니다. 일반 페이지는 **로그아웃·시크릿** 후 해당 열을 다시 채우세요.
