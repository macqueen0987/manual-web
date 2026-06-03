"""HTTP tests for auth refresh and logout."""

from tests.api_helpers import TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, seed_admin_user


def _login(api_client, db):
    seed_admin_user(db)
    res = api_client.post(
        "/api/auth/login",
        json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD},
    )
    assert res.status_code == 200
    return res.json()


def test_refresh_token_success(api_client, db):
    tokens = _login(api_client, db)
    res = api_client.post("/api/auth/refresh", json={"token": tokens["refresh_token"]})
    assert res.status_code == 200
    body = res.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["refresh_token"] != tokens["refresh_token"]


def test_refresh_invalid_token_401(api_client):
    res = api_client.post("/api/auth/refresh", json={"token": "not-a-valid-token"})
    assert res.status_code == 401


def test_logout_revokes_refresh_token(api_client, db):
    tokens = _login(api_client, db)
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    logout = api_client.post(
        "/api/auth/logout",
        headers=headers,
        json={"token": tokens["refresh_token"]},
    )
    assert logout.status_code == 200

    refresh = api_client.post("/api/auth/refresh", json={"token": tokens["refresh_token"]})
    assert refresh.status_code == 401


def test_logout_without_body_revokes_all(api_client, db):
    tokens = _login(api_client, db)
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    logout = api_client.post("/api/auth/logout", headers=headers)
    assert logout.status_code == 200

    refresh = api_client.post("/api/auth/refresh", json={"token": tokens["refresh_token"]})
    assert refresh.status_code == 401
