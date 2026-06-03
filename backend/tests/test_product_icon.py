"""Product home card icon_url field."""

from tests.api_helpers import (
    TEST_ADMIN_EMAIL,
    TEST_ADMIN_PASSWORD,
    seed_admin_user,
    seed_product_with_versions,
)


def test_product_icon_url_roundtrip(api_client, db):
    seed_admin_user(db)
    product, _, _ = seed_product_with_versions(db, slug="icon-prod")
    login = api_client.post(
        "/api/auth/login",
        json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD},
    )
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    icon = "/uploads/icon-prod/_icon/abc.png"
    res = api_client.put(
        f"/api/products/{product.id}",
        json={"icon_url": icon},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["icon_url"] == icon

    listed = api_client.get("/api/products", headers=headers)
    row = next(p for p in listed.json() if p["slug"] == "icon-prod")
    assert row["icon_url"] == icon

    clear = api_client.put(
        f"/api/products/{product.id}",
        json={"icon_url": None},
        headers=headers,
    )
    assert clear.status_code == 200
    assert clear.json()["icon_url"] is None
