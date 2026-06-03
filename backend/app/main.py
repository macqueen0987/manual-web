import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1 import auth, documents, media, products, search, setup, versions
from app.core.config import get_settings
from app.db.migrate import run_migrations
from app.db.session import SessionLocal
from app.middleware.logging import RequestLoggingMiddleware
from app.services import search_service

settings = get_settings()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)


def init_db():
    try:
        run_migrations()
    except Exception as exc:
        logging.getLogger(__name__).error(
            "Alembic migration failed (%s); not falling back to create_all on startup",
            exc,
        )
        raise


def init_dirs():
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.DOCS_DIR).mkdir(parents=True, exist_ok=True)


def init_search_index():
    db = SessionLocal()
    try:
        search_service.ensure_fts_populated(db)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_dirs()
    init_db()
    init_search_index()
    yield


app = FastAPI(
    title="Manual Web API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(setup.router, prefix="/api/setup", tags=["setup"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(versions.router, prefix="/api", tags=["versions"])
app.include_router(documents.router, prefix="/api", tags=["documents"])
app.include_router(media.router, prefix="/api", tags=["media"])
app.include_router(search.router, prefix="/api", tags=["search"])


@app.get("/health")
def health_check():
    return {"status": "ok"}
