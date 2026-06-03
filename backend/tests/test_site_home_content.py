"""Tests for app/services/site_service.py and home content API."""

import json

import pytest

from app.models.site_content import SiteContent
from app.schemas.site import HomeContent, HomeLocaleContent, MAX_SHOWCASE_SLOTS, ShowcaseSlot
from app.services import site_service
from tests.api_helpers import TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, seed_admin_user


def test_get_home_content_defaults_when_empty(db):
    content = site_service.get_home_content(db)
    defaults = site_service.default_home_content()
    assert content.en.hero_tagline == defaults.en.hero_tagline
    assert content.ko.hero_tagline == defaults.ko.hero_tagline
    assert len(content.en.showcase_slots) == len(defaults.en.showcase_slots)


def test_get_home_content_roundtrip(db, monkeypatch):
    orphan_calls: list[tuple] = []
    monkeypatch.setattr(
        site_service.media_service,
        "delete_orphan_uploads",
        lambda *args, **kwargs: orphan_calls.append((args, kwargs)),
    )

    custom = HomeContent(
        en=HomeLocaleContent(
            hero_tagline="English hero",
            showcase_slots=[
                ShowcaseSlot(
                    id="alpha",
                    title="Alpha",
                    tagline="Tag",
                    detail="Detail",
                    primary_product_slug="alpha",
                )
            ],
        ),
        ko=HomeLocaleContent(
            hero_tagline="한국어 히어로",
            showcase_slots=[
                ShowcaseSlot(
                    id="beta",
                    title="Beta",
                    tagline="태그",
                    detail="설명",
                    primary_product_slug="beta",
                )
            ],
        ),
    )
    saved = site_service.save_home_content(db, custom)
    loaded = site_service.get_home_content(db)

    assert saved.en.hero_tagline == "English hero"
    assert loaded.ko.hero_tagline == "한국어 히어로"
    assert loaded.en.showcase_slots[0].id == "alpha"
    assert orphan_calls


def test_get_home_content_invalid_json_fallback(db):
    db.add(SiteContent(key="home", data="{not-json"))
    db.commit()

    content = site_service.get_home_content(db)
    defaults = site_service.default_home_content()
    assert content.en.hero_tagline == defaults.en.hero_tagline


def test_coerce_category_intros_migration(db):
    raw = {
        "en": {
            "hero_tagline": "Hero",
            "category_intros": {
                "Blue": {"tagline": "Fitness", "detail": "Docs", "primary_product_slug": "bluefit"},
                "Blue Pro": {"tagline": "Pro", "detail": "Pro docs"},
            },
        },
        "ko": {"hero_tagline": "히어로"},
    }
    db.add(SiteContent(key="home", data=json.dumps(raw)))
    db.commit()

    content = site_service.get_home_content(db)
    assert content.en.hero_tagline == "Hero"
    assert len(content.en.showcase_slots) >= 1
    assert content.en.showcase_slots[0].title == "Blue"


def test_prepare_for_save_strips_quick_links(db, monkeypatch):
    monkeypatch.setattr(site_service.media_service, "delete_orphan_uploads", lambda *a, **k: None)

    content = HomeContent(
        en=HomeLocaleContent(
            hero_tagline="Hero",
            quick_link_columns=[
                {
                    "title": "Links",
                    "links": [{"path": "/x", "title": "X", "description": "Y"}],
                }
            ],
        ),
        ko=HomeLocaleContent(hero_tagline="히어로"),
    )
    saved = site_service.save_home_content(db, content)
    assert saved.en.quick_link_columns == []


def test_save_caps_showcase_slots(db, monkeypatch):
    monkeypatch.setattr(site_service.media_service, "delete_orphan_uploads", lambda *a, **k: None)

    slots = [
        ShowcaseSlot(id=f"slot-{i}", title=f"Slot {i}", tagline="", detail="")
        for i in range(MAX_SHOWCASE_SLOTS + 2)
    ]
    content = HomeContent(
        en=HomeLocaleContent(hero_tagline="Hero", showcase_slots=slots),
        ko=HomeLocaleContent(hero_tagline="히어로"),
    )
    saved = site_service.save_home_content(db, content)
    assert len(saved.en.showcase_slots) == MAX_SHOWCASE_SLOTS


def test_get_home_public(api_client, db):
    res = api_client.get("/api/site/home")
    assert res.status_code == 200
    data = res.json()
    assert "en" in data and "ko" in data


def test_put_home_requires_admin(api_client, db, monkeypatch):
    monkeypatch.setattr(site_service.media_service, "delete_orphan_uploads", lambda *a, **k: None)

    body = site_service.default_home_content().model_dump(mode="json")
    assert api_client.put("/api/site/home", json=body).status_code == 401

    seed_admin_user(db)
    login = api_client.post(
        "/api/auth/login",
        json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD},
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    res = api_client.put("/api/site/home", headers=headers, json=body)
    assert res.status_code == 200
    assert res.json()["en"]["hero_tagline"]
