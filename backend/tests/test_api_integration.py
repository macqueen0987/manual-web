"""HTTP API integration tests (in-memory DB via TestClient)."""

import pytest

from tests.api_helpers import (
    TEST_ADMIN_EMAIL,
    TEST_ADMIN_PASSWORD,
    seed_admin_user,
    seed_document,
    seed_product_with_versions,
)


def test_health(api_client):
    res = api_client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_setup_status_empty(api_client):
    res = api_client.get("/api/setup/status")
    assert res.status_code == 200
    assert res.json()["is_setup_complete"] is False


def test_setup_status_complete(api_client, db):
    seed_admin_user(db)
    seed_product_with_versions(db)
    res = api_client.get("/api/setup/status")
    assert res.status_code == 200
    assert res.json()["is_setup_complete"] is True


def test_auth_me_unauthorized(api_client):
    assert api_client.get("/api/auth/me").status_code == 401


def test_login_and_me(api_client, db):
    seed_admin_user(db)
    login = api_client.post(
        "/api/auth/login",
        json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    me = api_client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == TEST_ADMIN_EMAIL
    assert me.json()["is_superuser"] is True


def test_public_versions_only_published(api_client, db):
    seed_product_with_versions(db, slug="vis-prod")
    res = api_client.get("/api/products/vis-prod/versions")
    assert res.status_code == 200
    slugs = {v["slug"] for v in res.json()}
    assert slugs == {"pub-01"}


def test_admin_versions_include_latest(api_client, db):
    seed_admin_user(db)
    seed_product_with_versions(db, slug="vis-prod")
    login = api_client.post(
        "/api/auth/login",
        json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD},
    )
    token = login.json()["access_token"]
    res = api_client.get(
        "/api/products/vis-prod/versions",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    slugs = {v["slug"] for v in res.json()}
    assert "latest" in slugs
    assert "pub-01" in slugs


def test_create_document_requires_auth(api_client, db):
    _, latest, _ = seed_product_with_versions(db, slug="doc-prod")
    res = api_client.post(
        "/api/documents",
        json={
            "version_id": latest.id,
            "title": "New",
            "slug": "new-page",
            "content": "# New\n",
        },
    )
    assert res.status_code == 401


def test_create_and_read_document(api_client, db, tmp_path):
    seed_admin_user(db)
    product, latest, _ = seed_product_with_versions(db, slug="doc-flow")
    login = api_client.post(
        "/api/auth/login",
        json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD},
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    create = api_client.post(
        "/api/documents",
        headers=headers,
        json={
            "version_id": latest.id,
            "title": "Guide",
            "slug": "guide",
            "content": "# Guide\n\nHello API\n",
        },
    )
    assert create.status_code in (200, 201)
    doc_id = create.json()["id"]

    tree = api_client.get(
        f"/api/products/{product.slug}/versions/latest/documents",
        headers=headers,
    )
    assert tree.status_code == 200

    def _slugs(nodes):
        out = []
        for n in nodes:
            out.append(n["slug"])
            out.extend(_slugs(n.get("children") or []))
        return out

    assert "guide" in _slugs(tree.json())

    read = api_client.get(
        f"/api/products/{product.slug}/versions/latest/documents/guide",
        headers=headers,
    )
    assert read.status_code == 200
    assert "Hello API" in read.json()["content"]

    update = api_client.put(
        f"/api/documents/{doc_id}",
        headers=headers,
        json={"content": "# Guide\n\nUpdated\n"},
    )
    assert update.status_code == 200


def test_search_published_only(api_client, db, tmp_path):
    from app.services import search_service

    product, latest, published = seed_product_with_versions(db, slug="search-prod")
    docs_root = tmp_path / "docs"
    (docs_root / "search-prod" / "latest").mkdir(parents=True)
    (docs_root / "search-prod" / "pub-01").mkdir(parents=True)
    (docs_root / "search-prod" / "latest" / "draft.md").write_text(
        "# Draft\n\nsecretkeyword\n", encoding="utf-8"
    )
    (docs_root / "search-prod" / "pub-01" / "visible.md").write_text(
        "# Visible\n\nsecretkeyword published\n", encoding="utf-8"
    )
    seed_document(
        db,
        version_id=latest.id,
        title="Draft",
        slug="draft",
        file_path="search-prod/latest/draft.md",
    )
    seed_document(
        db,
        version_id=published.id,
        title="Visible",
        slug="visible",
        file_path="search-prod/pub-01/visible.md",
    )
    search_service.rebuild_fts_index(db)

    res = api_client.get("/api/search", params={"q": "secretkeyword"})
    assert res.status_code == 200
    results = res.json()["results"]
    assert len(results) == 1
    assert results[0]["slug"] == "visible"
