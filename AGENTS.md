# AGENTS.md

## Cursor Cloud specific instructions

Manual Web is a **Docker Compose–first** project: backend (FastAPI) + frontend (Vite). SQLite and file storage live under `backend/data/` (gitignored).

### Docker daemon

Cloud VMs may not have Docker running at session start. If `docker` fails, start the daemon once per VM (not in the update script):

```bash
sudo dockerd > /tmp/dockerd.log 2>&1 &
```

Use `sudo docker compose …` if your user is not in the `docker` group yet.

### First-time / fresh clone

1. `cp .env.example .env` (Compose reads root `.env`; already gitignored).
2. **Create data dirs before starting backend** — otherwise the backend crashes on `StaticFiles` mount:
   ```bash
   mkdir -p backend/data/uploads backend/data/docs
   ```
   If Compose created `backend/data` as root, fix ownership: `sudo chown -R "$(whoami)" backend/data`.
3. Start dev stack (see [README.md](./README.md)):
   ```bash
   sudo docker compose -f docker-compose.dev.yml up -d --build
   ```

| Service | URL |
|---------|-----|
| Web UI | http://localhost:5173 |
| API (direct) | http://localhost:8000 |
| Setup wizard | http://localhost:5173/setup |
| Health | http://localhost:8000/health |

Frontend Vite proxies `/api` and `/uploads` to `http://backend:8000` **inside the compose network** — do not point the proxy at `localhost:8000` when running via `docker-compose.dev.yml`.

The frontend container runs `npm install` on first start (see `frontend/entrypoint.sh`); `frontend_node_modules` is a named volume.

### Tests (run inside containers)

```bash
sudo docker compose -f docker-compose.dev.yml exec -T backend pytest -q
sudo docker compose -f docker-compose.dev.yml exec -T frontend npm test -- --run
```

- Backend: **118 tests** pass (in-memory SQLite in pytest).
- Frontend: many unit tests pass; **14 test files fail to load** because `frontend/src/lib/utils.ts` and `frontend/src/lib/notify.ts` are imported via `@/lib/*` but not present in the repo — pre-existing, not required for running the dev app.

### E2E / hello-world checklist

Per [docs/getting-started.md](./docs/getting-started.md):

1. Complete `/setup` (admin + first product) → `GET /api/setup/status` → `is_setup_complete: true`.
2. Create a doc in `latest`, then **publish** a version snapshot (public readers only see published versions).
3. Public doc URL pattern: `http://localhost:5173/{productSlug}/{versionSlug}/{docSlug}` (locale is store-driven, not a `/ko/` path prefix).

### Rebuild after dependency manifest changes

If `backend/requirements.txt` or `frontend/package.json` change, rebuild images:

```bash
sudo docker compose -f docker-compose.dev.yml up -d --build
```

Restart only: `sudo docker compose -f docker-compose.dev.yml restart backend frontend`.

### Optional MCP profile

```bash
sudo docker compose -f docker-compose.dev.yml --profile mcp up -d mcp
```

SSE: http://localhost:8001/sse — not needed for core app dev.
