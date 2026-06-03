import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from starlette.testclient import TestClient

from app.core.config import get_settings
from app.db.base import Base
from app.db.session import get_db
from app.factory import create_app, noop_lifespan
from app.models import Document, Product, RefreshToken, User, Version  # noqa: F401
from app.models.site_content import SiteContent  # noqa: F401
from app.core import rate_limit as rate_limit_module
from app.services import document_service, media_service, search_service, version_service


@pytest.fixture(autouse=True)
def _reset_rate_limit_buckets():
    """MCP/API tests share one IP; clear in-memory login buckets between cases."""
    rate_limit_module._buckets.clear()
    yield
    rate_limit_module._buckets.clear()


@pytest.fixture()
def db(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, _connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    monkeypatch.setattr(search_service, "engine", engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def api_app(db, monkeypatch, tmp_path):
    """FastAPI app bound to the in-memory DB (no Alembic / file DB on startup)."""
    engine = db.get_bind()
    TestSession = sessionmaker(bind=engine, autocommit=False, autoflush=False)

    import app.db.session as session_module

    monkeypatch.setattr(session_module, "engine", engine)
    monkeypatch.setattr(session_module, "SessionLocal", TestSession)

    docs_root = tmp_path / "docs"
    uploads_root = tmp_path / "uploads"
    docs_root.mkdir()
    uploads_root.mkdir()
    settings = get_settings()
    monkeypatch.setattr(settings, "DOCS_DIR", str(docs_root))
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(uploads_root))
    monkeypatch.setattr(document_service.settings, "DOCS_DIR", str(docs_root))
    monkeypatch.setattr(media_service.settings, "DOCS_DIR", str(docs_root))
    monkeypatch.setattr(media_service.settings, "UPLOAD_DIR", str(uploads_root))
    monkeypatch.setattr(version_service.settings, "DOCS_DIR", str(docs_root))

    application = create_app(lifespan=noop_lifespan, mount_uploads=True)

    def override_get_db():
        session = TestSession()
        try:
            yield session
        finally:
            session.close()

    application.dependency_overrides[get_db] = override_get_db
    yield application
    application.dependency_overrides.clear()


@pytest.fixture()
def api_client(api_app):
    with TestClient(api_app) as client:
        yield client


def _ensure_mcp_on_path() -> None:
    import sys
    from pathlib import Path

    tests_dir = Path(__file__).resolve().parent
    for candidate in (tests_dir.parents[1] / "mcp", Path("/mcp"), tests_dir / "mcp"):
        if (candidate / "client.py").is_file():
            root = str(candidate)
            if root not in sys.path:
                sys.path.insert(0, root)
            return
    pytest.skip("mcp package not found (mount ./mcp:/mcp in Docker)")


@pytest.fixture()
def mcp_http(api_app):
    _ensure_mcp_on_path()
    with TestClient(api_app, base_url="http://testserver") as http:
        yield http


@pytest.fixture()
def mcp_client(mcp_http, monkeypatch):
    _ensure_mcp_on_path()
    from client import ManualWebClient  # noqa: E402

    from tests.api_helpers import TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD

    monkeypatch.setenv("MANUAL_WEB_EMAIL", TEST_ADMIN_EMAIL)
    monkeypatch.setenv("MANUAL_WEB_PASSWORD", TEST_ADMIN_PASSWORD)
    return ManualWebClient(base_url="http://testserver", http_client=mcp_http)
