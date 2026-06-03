"""HTTP client for Manual Web API (used by MCP server)."""

from __future__ import annotations

import os
from typing import Any

import httpx

DEFAULT_API_URL = "http://localhost:8000"


class ManualWebError(Exception):
    pass


class ManualWebClient:
    def __init__(self, base_url: str | None = None) -> None:
        self.base_url = (base_url or os.environ.get("MANUAL_WEB_API_URL", DEFAULT_API_URL)).rstrip("/")
        self._token: str | None = None

    def login(self) -> None:
        email = os.environ.get("MANUAL_WEB_EMAIL")
        password = os.environ.get("MANUAL_WEB_PASSWORD")
        if not email or not password:
            raise ManualWebError(
                "Set MANUAL_WEB_EMAIL and MANUAL_WEB_PASSWORD env vars for write operations."
            )
        res = httpx.post(
            f"{self.base_url}/api/auth/login",
            json={"email": email, "password": password},
            timeout=30,
        )
        if res.status_code != 200:
            raise ManualWebError(f"Login failed ({res.status_code}): {res.text}")
        self._token = res.json()["access_token"]

    def _headers(self, auth: bool) -> dict[str, str]:
        if not auth:
            return {}
        if not self._token:
            self.login()
        return {"Authorization": f"Bearer {self._token}"}

    def _request(self, method: str, path: str, *, auth: bool = False, **kwargs: Any) -> Any:
        res = httpx.request(
            method,
            f"{self.base_url}{path}",
            headers=self._headers(auth),
            timeout=60,
            **kwargs,
        )
        if res.status_code >= 400:
            raise ManualWebError(f"{method} {path} → {res.status_code}: {res.text}")
        if res.status_code == 204 or not res.content:
            return None
        return res.json()

    def list_products(self) -> list[dict]:
        return self._request("GET", "/api/products")

    def list_versions(self, product_slug: str) -> list[dict]:
        return self._request("GET", f"/api/products/{product_slug}/versions")

    def resolve_version_id(self, product_slug: str, version_slug: str = "latest") -> int:
        versions = self.list_versions(product_slug)
        for v in versions:
            if version_slug == "latest" and v.get("is_latest"):
                return v["id"]
            if v.get("slug") == version_slug:
                return v["id"]
        raise ManualWebError(f"Version '{version_slug}' not found for product '{product_slug}'")

    def list_document_tree(self, product_slug: str, version_slug: str = "latest") -> list[dict]:
        return self._request(
            "GET",
            f"/api/products/{product_slug}/versions/{version_slug}/documents",
        )

    def flatten_tree(self, tree: list[dict]) -> list[dict]:
        out: list[dict] = []
        for node in tree:
            out.append(node)
            out.extend(self.flatten_tree(node.get("children") or []))
        return out

    def find_doc_by_slug(self, product_slug: str, slug: str, version_slug: str = "latest") -> dict | None:
        for doc in self.flatten_tree(self.list_document_tree(product_slug, version_slug)):
            if doc.get("slug") == slug:
                return doc
        return None

    def get_document(self, product_slug: str, doc_slug: str, version_slug: str = "latest") -> dict:
        return self._request(
            "GET",
            f"/api/products/{product_slug}/versions/{version_slug}/documents/{doc_slug}",
        )

    def create_document(
        self,
        *,
        version_id: int,
        title: str,
        slug: str,
        content: str = "",
        parent_id: int | None = None,
        sort_order: int = 0,
    ) -> dict:
        return self._request(
            "POST",
            "/api/documents",
            auth=True,
            json={
                "version_id": version_id,
                "title": title,
                "slug": slug,
                "content": content,
                "parent_id": parent_id,
                "sort_order": sort_order,
            },
        )

    def update_document(
        self,
        document_id: int,
        *,
        title: str | None = None,
        content: str | None = None,
        sort_order: int | None = None,
        parent_id: int | None = None,
    ) -> dict:
        payload: dict[str, Any] = {}
        if title is not None:
            payload["title"] = title
        if content is not None:
            payload["content"] = content
        if sort_order is not None:
            payload["sort_order"] = sort_order
        if parent_id is not None:
            payload["parent_id"] = parent_id
        return self._request("PUT", f"/api/documents/{document_id}", auth=True, json=payload)

    def upsert_document(
        self,
        product_slug: str,
        *,
        title: str,
        slug: str,
        content: str,
        parent_slug: str | None = None,
        version_slug: str = "latest",
        sort_order: int = 0,
    ) -> dict:
        version_id = self.resolve_version_id(product_slug, version_slug)
        parent_id = None
        if parent_slug:
            parent = self.find_doc_by_slug(product_slug, parent_slug, version_slug)
            if not parent:
                parent = self.upsert_document(
                    product_slug,
                    title=parent_slug.replace("-", " ").title(),
                    slug=parent_slug,
                    content=f"# {parent_slug.replace('-', ' ').title()}\n",
                    parent_slug=None,
                    version_slug=version_slug,
                    sort_order=0,
                )
            parent_id = parent["id"]

        existing = self.find_doc_by_slug(product_slug, slug, version_slug)
        if existing:
            return self.update_document(existing["id"], title=title, content=content, parent_id=parent_id)

        return self.create_document(
            version_id=version_id,
            title=title,
            slug=slug,
            content=content,
            parent_id=parent_id,
            sort_order=sort_order,
        )
