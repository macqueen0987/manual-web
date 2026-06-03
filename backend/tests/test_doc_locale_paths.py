from pathlib import Path

import pytest

from app.core.paths import localized_doc_path, normalize_base_doc_path


def test_normalize_base_doc_path_strips_locale_dir():
    path = Path("bluefit/latest/ko/index.md")
    assert normalize_base_doc_path(path) == Path("bluefit/latest/index.md")


def test_localized_doc_path():
    base = Path("bluefit/latest/index.md")
    assert localized_doc_path(base, "en") == Path("bluefit/latest/en/index.md")
    assert localized_doc_path(base, "ko") == Path("bluefit/latest/ko/index.md")


@pytest.fixture
def docs_tmp(tmp_path, monkeypatch):
    monkeypatch.setenv("DOCS_DIR", str(tmp_path))
    from app.core.config import get_settings

    get_settings.cache_clear()
    yield tmp_path
    get_settings.cache_clear()


def test_content_locale_per_folder(docs_tmp, monkeypatch):
    from app.models.document import Document
    from app.services import document_service

    from app.core import paths as paths_module

    monkeypatch.setattr(document_service.settings, "DOCS_DIR", str(docs_tmp))
    monkeypatch.setattr(paths_module.settings, "DOCS_DIR", str(docs_tmp))

    base = docs_tmp / "p" / "latest" / "page.md"
    ko_file = base.parent / "ko" / "page.md"
    ko_file.parent.mkdir(parents=True)
    ko_file.write_text("# KO", encoding="utf-8")

    doc = Document(
        id=1,
        version_id=1,
        parent_id=None,
        title="Page",
        slug="page",
        file_path="p/latest/page.md",
        sort_order=0,
    )
    assert document_service.content_locale_available(doc, "ko") is True
    assert document_service.content_locale_available(doc, "en") is False
    assert document_service.resolve_localized_path(base, "ko").read_text() == "# KO"
