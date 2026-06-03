# 멀티 에이전트 (Agent Gate)

여러 AI(Cursor / Kimi 등)가 동시에 작업할 때 파일 충돌 및 빌드 게이트를 조율합니다.

| 항목 | 값 |
|------|-----|
| 서버 | `http://localhost:8765` (`agent-gate` 레포에서 `docker compose up -d`) |
| Workspace ID | `manual-web` (`.agent-gate/workspace.toml`) |
| 대시보드 | http://localhost:8765/?workspace_id=manual-web |
| 빌드 인식 | 대시보드 **「빌드 인식 설정」** — `docker restart` 등을 빌드로 셀지 워크스페이스별로 지정 |

## 훅 재설치

```powershell
powershell -File path\to\agent-gate\scripts\install-agent-gate-hooks.ps1 -Target both
```

## 관련 파일

- `.agent-gate/workspace.toml` — 워크스페이스 설정
- `.cursor/hooks.json` — Cursor 훅 설정
