from app.core.security import verify_password
from app.models.user import User
from tests.api_helpers import TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, seed_admin_user


def test_change_password_requires_auth(api_client):
    res = api_client.post(
        "/api/auth/change-password",
        json={
            "current_password": TEST_ADMIN_PASSWORD,
            "new_password": "new-password-32chars-minimum!!",
        },
    )
    assert res.status_code == 401


def test_change_password_wrong_current(api_client, db):
    seed_admin_user(db)
    login = api_client.post(
        "/api/auth/login",
        json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD},
    )
    token = login.json()["access_token"]
    res = api_client.post(
        "/api/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "current_password": "wrong-password-32chars-minimum!!",
            "new_password": "new-password-32chars-minimum!!",
        },
    )
    assert res.status_code == 400
    assert "incorrect" in res.json()["detail"].lower()


def test_change_password_success(api_client, db):
    seed_admin_user(db)
    login = api_client.post(
        "/api/auth/login",
        json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD},
    )
    token = login.json()["access_token"]
    new_password = "new-password-32chars-minimum!!"
    res = api_client.post(
        "/api/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={"current_password": TEST_ADMIN_PASSWORD, "new_password": new_password},
    )
    assert res.status_code == 200

    db.expire_all()
    user = db.query(User).filter(User.email == TEST_ADMIN_EMAIL).first()
    assert verify_password(new_password, user.hashed_password)
    assert not verify_password(TEST_ADMIN_PASSWORD, user.hashed_password)

    relogin = api_client.post(
        "/api/auth/login",
        json={"email": TEST_ADMIN_EMAIL, "password": new_password},
    )
    assert relogin.status_code == 200
