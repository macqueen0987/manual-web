"""HTTP client for Manual Web API (used by MCP server)."""

from __future__ import annotations

import mimetypes
import os
from pathlib import Path
from typing import Any

import httpx

DEFAULT_API_URL = "http://localhost:8000"


class ManualWebError(Exception):
    pass


class ManualWebClient:
    def __init__(
        self,
        base_url: str | None = None,
        *,
        http_client: httpx.Client | Any | None = None,
    ) -> None:
        self.base_url = (base_url or os.environ.get("MANUAL_WEB_API_URL", DEFAULT_API_URL)).rstrip("/")
        self._token: str | None = None
        self._http_client = http_client

    def login(self) -> None:
        email = os.environ.get("MANUAL_WEB_EMAIL") or os.environ.get("MCP_ADMIN_EMAIL")
        password = os.environ.get("MANUAL_WEB_PASSWORD") or os.environ.get("MCP_ADMIN_PASSWORD")
        if not email or not password:
            raise ManualWebError(
                "Set MANUAL_WEB_EMAIL and MANUAL_WEB_PASSWORD env vars for write operations."
            )
        login_url = f"{self.base_url}/api/auth/login"
        payload = {"email": email, "password": password}
        if self._http_client is not None:
            res = self._http_client.post(login_url, json=payload)
        else:
            res = httpx.post(login_url, json=payload, timeout=30)
        if res.status_code != 200:
            raise ManualWebError(f"Login failed ({res.status_code}): {res.text}")
        self._token = res.json()["access_token"]

    def _clear_auth(self) -> None:
        self._token = None

    def _headers(self, auth: bool) -> dict[str, str]:
        if not auth:
            return {}
        if not self._token:
            self.login()
        return {"Authorization": f"Bearer {self._token}"}

    def _should_retry_auth(self, res: httpx.Response, *, auth: bool) -> bool:
        if not auth:
            return False
        if res.status_code in (401, 403):
            return True
        # Optional-admin routes treat invalid tokens as anonymous → 404 for unpublished "latest".
        if res.status_code == 404 and "Version not found" in res.text:
            return True
        return False

    def _http_request(
        self,
        method: str,
        url: str,
        *,
        headers: dict[str, str],
        timeout: float = 60,
        **kwargs: Any,
    ) -> httpx.Response:
        if self._http_client is not None:
            return self._http_client.request(method, url, headers=headers, **kwargs)
        return httpx.request(method, url, headers=headers, timeout=timeout, **kwargs)

    def _request(
        self,
        method: str,
        path: str,
        *,
        auth: bool = False,
        _auth_retry: bool = False,
        **kwargs: Any,
    ) -> Any:
        url = f"{self.base_url}{path}"
        headers = self._headers(auth)
        res = self._http_request(method, url, headers=headers, **kwargs)
        if not _auth_retry and self._should_retry_auth(res, auth=auth):
            self._clear_auth()
            self.login()
            return self._request(method, path, auth=auth, _auth_retry=True, **kwargs)
        if res.status_code >= 400:
            raise ManualWebError(f"{method} {path} → {res.status_code}: {res.text}")
        if res.status_code == 204 or not res.content:
            return None
        return res.json()

    def list_products(self) -> list[dict]:
        return self._request("GET", "/api/products")

    def list_versions(self, product_slug: str, *, auth: bool = False) -> list[dict]:
        return self._request("GET", f"/api/products/{product_slug}/versions", auth=auth)

    def list_versions_admin(self, product_slug: str) -> list[dict]:
        """Includes latest / unpublished when authenticated as admin."""
        return self.list_versions(product_slug, auth=True)

    def resolve_version_id(self, product_slug: str, version_slug: str = "latest") -> int:
        versions = self.list_versions_admin(product_slug)
        for v in versions:
            if version_slug == "latest" and v.get("is_latest"):
                return v["id"]
            if v.get("slug") == version_slug:
                return v["id"]
        raise ManualWebError(f"Version '{version_slug}' not found for product '{product_slug}'")

    def list_document_tree(
        self, product_slug: str, version_slug: str = "latest", *, auth: bool = True
    ) -> list[dict]:
        return self._request(
            "GET",
            f"/api/products/{product_slug}/versions/{version_slug}/documents",
            auth=auth,
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

    def get_document(
        self, product_slug: str, doc_slug: str, version_slug: str = "latest", *, auth: bool = True
    ) -> dict:
        return self._request(
            "GET",
            f"/api/products/{product_slug}/versions/{version_slug}/documents/{doc_slug}",
            auth=auth,
        )

    def create_document(
        self,
        *,
        version_id: int,
        title: str,
        slug: str,
        content: str = "",
        parent_id: int | None = None,
        sort_order: int | None = None,
    ) -> dict:
        payload: dict[str, Any] = {
            "version_id": version_id,
            "title": title,
            "slug": slug,
            "content": content,
            "parent_id": parent_id,
        }
        if sort_order is not None:
            payload["sort_order"] = sort_order
        return self._request("POST", "/api/documents", auth=True, json=payload)

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

    def delete_document(self, document_id: int) -> dict:
        return self._request("DELETE", f"/api/documents/{document_id}", auth=True)

    def upsert_document(
        self,
        product_slug: str,
        *,
        title: str,
        slug: str,
        content: str,
        parent_slug: str | None = None,
        version_slug: str = "latest",
        sort_order: int | None = None,
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

    def upload_media(
        self,
        file_path: str | Path,
        product_slug: str,
        version_slug: str = "latest",
    ) -> dict:
        path = Path(file_path).expanduser().resolve()
        if not path.is_file():
            raise ManualWebError(f"File not found: {path}")
        mime, _ = mimetypes.guess_type(path.name)
        url = f"{self.base_url}/api/upload"
        params = {"product_slug": product_slug, "version_slug": version_slug}

        def _post_upload() -> httpx.Response:
            headers = self._headers(True)
            with path.open("rb") as fh:
                files = {"file": (path.name, fh, mime or "application/octet-stream")}
                return self._http_request("POST", url, headers=headers, params=params, files=files, timeout=120)

        res = _post_upload()
        if self._should_retry_auth(res, auth=True):
            self._clear_auth()
            self.login()
            res = _post_upload()
        if res.status_code >= 400:
            raise ManualWebError(f"POST /api/upload → {res.status_code}: {res.text}")
        return res.json()

    def list_media(
        self,
        product_slug: str | None = None,
        version_slug: str | None = None,
        *,
        orphans_only: bool = False,
    ) -> dict:
        params: dict[str, Any] = {}
        if product_slug:
            params["product_slug"] = product_slug
        if version_slug:
            params["version_slug"] = version_slug
        if orphans_only:
            params["orphans_only"] = True
        return self._request("GET", "/api/media", auth=True, params=params)

    def delete_media(self, media_id: str) -> dict:
        mid = media_id.strip().lstrip("/")
        if mid.startswith("uploads/"):
            mid = mid[len("uploads/") :]
        return self._request("DELETE", f"/api/media/{mid}", auth=True)

    def cleanup_orphan_media(self, product_slug: str, version_slug: str = "latest") -> dict:
        return self._request(
            "POST",
            "/api/media/cleanup-orphans",
            auth=True,
            params={"product_slug": product_slug, "version_slug": version_slug},
        )
