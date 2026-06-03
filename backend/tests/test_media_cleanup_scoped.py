"""Scoped orphan cleanup API (all products / one product / one version)."""

from pathlib import Path

import pytest

from app.services import media_service
from tests.api_helpers import TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, seed_admin_user


@pytest.fixture
def isolated_uploads(monkeypatch, tmp_path):
    uploads_root = tmp_path / "uploads"
    docs_root = tmp_path / "docs"
    uploads_root.mkdir(parents=True, exist_ok=True)
    docs_root.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(media_service.settings, "UPLOAD_DIR", str(uploads_root))
    monkeypatch.setattr(media_service.settings, "DOCS_DIR", str(docs_root))
    return uploads_root, docs_root


def _orphan_file(uploads_root: Path, product: str, version: str, name: str) -> Path:
    d = uploads_root / product / version
    d.mkdir(parents=True, exist_ok=True)
    path = d / name
    path.write_bytes(b"x")
    return path


def test_delete_orphan_uploads_scoped_all_products(isolated_uploads):
    uploads_root, _ = isolated_uploads
    _orphan_file(uploads_root, "alpha", "v1", "a.png")
    _orphan_file(uploads_root, "beta", "latest", "b.png")

    deleted = media_service.delete_orphan_uploads_scoped()
    assert len(deleted) == 2
    assert not (uploads_root / "alpha" / "v1" / "a.png").is_file()
    assert not (uploads_root / "beta" / "latest" / "b.png").is_file()


def test_delete_orphan_uploads_scoped_one_product(isolated_uploads):
    uploads_root, _ = isolated_uploads
    _orphan_file(uploads_root, "alpha", "v1", "a.png")
    _orphan_file(uploads_root, "alpha", "v2", "b.png")
    kept_other = _orphan_file(uploads_root, "beta", "v1", "c.png")

    deleted = media_service.delete_orphan_uploads_scoped(product_slug="alpha")
    assert len(deleted) == 2
    assert not (uploads_root / "alpha" / "v1" / "a.png").is_file()
    assert kept_other.is_file()


def test_cleanup_orphans_api_all_products(api_client, db, tmp_path):
    uploads_root = tmp_path / "uploads"
    seed_admin_user(db)
    login = api_client.post(
        "/api/auth/login",
        json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD},
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    _orphan_file(uploads_root, "p1", "latest", "one.png")
    _orphan_file(uploads_root, "p2", "v1", "two.png")

    res = api_client.post("/api/media/cleanup-orphans", headers=headers)
    assert res.status_code == 200
    assert res.json()["count"] == 2
