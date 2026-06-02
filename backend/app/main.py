from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1 import auth, documents, media, products, search, setup, versions
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import engine

settings = get_settings()


def init_db():
    Base.metadata.create_all(bind=engine)


def init_dirs():
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.DOCS_DIR).mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_dirs()
    init_db()
    yield


app = FastAPI(
    title="Manual Web API",
    version="0.1.0",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://frontend:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# API Routers
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
