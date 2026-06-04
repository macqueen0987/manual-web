"""Document list API returns nested children and parent_slug."""

from tests.api_helpers import (
    TEST_ADMIN_EMAIL,
    TEST_ADMIN_PASSWORD,
    seed_admin_user,
    seed_product_with_versions,
)


def test_list_documents_nested_tree(api_client, db):
    seed_admin_user(db)
    product, latest, _ = seed_product_with_versions(db, slug="tree-prod")
    login = api_client.post(
        "/api/auth/login",
        json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD},
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    parent = api_client.post(
        "/api/documents",
        headers=headers,
        json={
            "version_id": latest.id,
            "title": "Parent",
            "slug": "parent-page",
            "content": "# Parent\n",
        },
    )
    assert parent.status_code in (200, 201)
    parent_id = parent.json()["id"]

    child = api_client.post(
        "/api/documents",
        headers=headers,
        json={
            "version_id": latest.id,
            "title": "Child",
            "slug": "child-page",
            "parent_id": parent_id,
            "content": "# Child\n",
        },
    )
    assert child.status_code in (200, 201)

    tree = api_client.get(
        f"/api/products/{product.slug}/versions/latest/documents",
        headers=headers,
    )
    assert tree.status_code == 200
    nodes = tree.json()
    assert len(nodes) == 1
    root = nodes[0]
    assert root["slug"] == "parent-page"
    assert root["parent_slug"] is None
    assert len(root["children"]) == 1
    assert root["children"][0]["slug"] == "child-page"
    assert root["children"][0]["parent_slug"] == "parent-page"
    assert root["children"][0]["children"] == []
