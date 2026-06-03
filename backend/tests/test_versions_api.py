"""HTTP tests for app/api/v1/versions.py."""

from tests.api_helpers import (
    TEST_ADMIN_EMAIL,
    TEST_ADMIN_PASSWORD,
    seed_admin_user,
    seed_document,
    seed_product_with_versions,
)


def _admin_headers(api_client, db):
    seed_admin_user(db)
    login = api_client.post(
        "/api/auth/login",
        json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD},
    )
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_get_version_public_published(api_client, db):
    product, _, _ = seed_product_with_versions(db, slug="ver-get")
    res = api_client.get(f"/api/products/{product.slug}/versions/pub-01")
    assert res.status_code == 200
    assert res.json()["slug"] == "pub-01"


def test_get_version_public_unpublished_404(api_client, db):
    product, _, _ = seed_product_with_versions(db, slug="ver-get")
    res = api_client.get(f"/api/products/{product.slug}/versions/latest")
    assert res.status_code == 404


def test_get_version_admin_sees_latest(api_client, db):
    headers = _admin_headers(api_client, db)
    product, _, _ = seed_product_with_versions(db, slug="ver-get")
    res = api_client.get(
        f"/api/products/{product.slug}/versions/latest",
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["slug"] == "latest"


def test_get_version_unknown_slug_404(api_client, db):
    product, _, _ = seed_product_with_versions(db, slug="ver-get")
    res = api_client.get(f"/api/products/{product.slug}/versions/missing")
    assert res.status_code == 404


def test_list_versions_admin_only_product_404_public(api_client, db):
    from app.models.product import Product

    product = Product(
        name="Hidden",
        slug="hidden-prod",
        description=None,
        category="미공개",
        is_active=True,
    )
    db.add(product)
    db.commit()

    res = api_client.get("/api/products/hidden-prod/versions")
    assert res.status_code == 404


def test_create_version_201(api_client, db, tmp_path):
    headers = _admin_headers(api_client, db)
    product, latest, _ = seed_product_with_versions(db, slug="ver-create")
    res = api_client.post(
        "/api/versions",
        headers=headers,
        json={
            "product_id": product.id,
            "base_version_id": latest.id,
            "name": "Draft copy",
            "slug": "draft-copy",
        },
    )
    assert res.status_code == 201
    assert res.json()["slug"] == "draft-copy"


def test_create_version_duplicate_slug_400(api_client, db):
    headers = _admin_headers(api_client, db)
    product, latest, _ = seed_product_with_versions(db, slug="ver-dup")
    res = api_client.post(
        "/api/versions",
        headers=headers,
        json={
            "product_id": product.id,
            "base_version_id": latest.id,
            "name": "Dup",
            "slug": "pub-01",
        },
    )
    assert res.status_code == 400


def test_create_version_missing_product_404(api_client, db):
    headers = _admin_headers(api_client, db)
    res = api_client.post(
        "/api/versions",
        headers=headers,
        json={"product_id": 99999, "name": "X", "slug": "x"},
    )
    assert res.status_code == 404


def test_create_version_requires_auth(api_client, db):
    product, latest, _ = seed_product_with_versions(db, slug="ver-auth")
    res = api_client.post(
        "/api/versions",
        json={
            "product_id": product.id,
            "base_version_id": latest.id,
            "name": "Draft",
            "slug": "draft",
        },
    )
    assert res.status_code == 401


def test_update_version_empty_body_noop(api_client, db):
    headers = _admin_headers(api_client, db)
    product, latest, _ = seed_product_with_versions(db, slug="ver-update")
    before = latest.name
    res = api_client.put(f"/api/versions/{latest.id}", headers=headers, json={})
    assert res.status_code == 200
    assert res.json()["name"] == before


def test_publish_snapshot_syncs_search(api_client, db, monkeypatch):
    from app.models.version import Version
    from app.services import search_service

    headers = _admin_headers(api_client, db)
    product, _, _ = seed_product_with_versions(db, slug="ver-pub")
    draft = Version(
        product_id=product.id,
        name="Draft",
        slug="draft-pub",
        is_published=False,
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    seed_document(
        db,
        version_id=draft.id,
        title="Page",
        slug="page",
        file_path=f"{product.slug}/{draft.slug}/page.md",
    )

    sync_calls: list[int] = []
    monkeypatch.setattr(
        search_service,
        "sync_document",
        lambda _db, doc_id: sync_calls.append(doc_id),
    )

    res = api_client.post(f"/api/versions/{draft.id}/publish", headers=headers)
    assert res.status_code == 200
    assert sync_calls


def test_unpublish_removes_search(api_client, db, monkeypatch):
    from app.services import search_service

    headers = _admin_headers(api_client, db)
    product, _, published = seed_product_with_versions(db, slug="ver-unpub")
    seed_document(
        db,
        version_id=published.id,
        title="Visible",
        slug="visible",
        file_path=f"{product.slug}/{published.slug}/visible.md",
    )

    remove_calls: list[int] = []
    monkeypatch.setattr(
        search_service,
        "remove_document",
        lambda doc_id: remove_calls.append(doc_id),
    )

    res = api_client.post(f"/api/versions/{published.id}/unpublish", headers=headers)
    assert res.status_code == 200
    assert remove_calls


def test_delete_version_200(api_client, db, tmp_path):
    from app.models.version import Version

    headers = _admin_headers(api_client, db)
    product, _, _ = seed_product_with_versions(db, slug="ver-del")
    draft = Version(
        product_id=product.id,
        name="Draft",
        slug="draft-del",
        is_published=False,
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)

    res = api_client.delete(f"/api/versions/{draft.id}", headers=headers)
    assert res.status_code == 200
    assert "deleted" in res.json()["message"].lower()
