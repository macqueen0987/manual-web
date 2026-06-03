"""Application factory — shared by production entrypoint and tests."""

from contextlib import asynccontextmanager
from pathlib import Path
from typing import Callable

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1 import auth, documents, media, products, search, setup, site, versions
from app.core.config import get_settings
from app.db.migrate import run_migrations
from app.db.session import SessionLocal
from app.middleware.logging import RequestLoggingMiddleware
from app.services import search_service

settings = get_settings()


def init_dirs() -> None:
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.DOCS_DIR).mkdir(parents=True, exist_ok=True)


def init_db() -> None:
    run_migrations()


def init_search_index() -> None:
    db = SessionLocal()
    try:
        search_service.ensure_fts_populated(db)
    finally:
        db.close()


@asynccontextmanager
async def default_lifespan(app: FastAPI):
    init_dirs()
    init_db()
    init_search_index()
    yield


@asynccontextmanager
async def noop_lifespan(app: FastAPI):
    yield


def register_routes(app: FastAPI) -> None:
    app.include_router(setup.router, prefix="/api/setup", tags=["setup"])
    app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
    app.include_router(products.router, prefix="/api/products", tags=["products"])
    app.include_router(versions.router, prefix="/api", tags=["versions"])
    app.include_router(documents.router, prefix="/api", tags=["documents"])
    app.include_router(media.router, prefix="/api", tags=["media"])
    app.include_router(search.router, prefix="/api", tags=["search"])
    app.include_router(site.router, prefix="/api/site", tags=["site"])

    @app.get("/health")
    def health_check():
        return {"status": "ok"}


def create_app(
    *,
    lifespan: Callable | None = None,
    mount_uploads: bool = True,
) -> FastAPI:
    app = FastAPI(
        title="Manual Web API",
        version="0.1.0",
        lifespan=lifespan or default_lifespan,
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
    if mount_uploads:
        app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR, html=False), name="uploads")
    register_routes(app)
    return app
