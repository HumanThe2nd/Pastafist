from __future__ import annotations

import asyncio
from datetime import timedelta
from typing import Any

import pytest

from scraper_lib.cache import utc_now
from services.store_locator import _store_lookup_cache_key, fetch_stores


class FakeCollection:
    def __init__(self, doc: dict[str, Any] | None = None) -> None:
        self.doc = doc
        self.updated_docs: list[tuple[dict[str, Any], dict[str, Any], bool]] = []

    async def find_one(self, _query: dict[str, Any]) -> dict[str, Any] | None:
        return self.doc

    async def update_one(self, query: dict[str, Any], update: dict[str, Any], upsert: bool = False) -> None:
        self.updated_docs.append((query, update, upsert))
        if "$set" in update:
            payload = update["$set"]
            if self.doc is None:
                self.doc = {"_id": query.get("_id")}
            self.doc.update(payload)


class FakeDatabase:
    def __init__(self, cache_doc: dict[str, Any] | None = None) -> None:
        self.scrape_cache = FakeCollection(cache_doc)
        self.ops_metrics = FakeCollection()

    def get_collection(self, name: str) -> FakeCollection:
        if name == "scrape_cache":
            return self.scrape_cache
        if name == "ops_metrics":
            return self.ops_metrics
        raise AssertionError(f"Unexpected collection requested: {name}")


def test_fetch_stores_cache_hit_uses_cached_payload(monkeypatch: pytest.MonkeyPatch) -> None:
    key = _store_lookup_cache_key(44.0, -76.0, 5000)
    db = FakeDatabase(
        cache_doc={
            "_id": key,
            "payload": [{"name": "Cached Store"}],
            "scraped_at": utc_now(),
        }
    )

    async def inline_to_thread(func: Any, *args: Any, **kwargs: Any) -> Any:
        return func(*args, **kwargs)

    def fail_post(*_args: object, **_kwargs: object) -> Any:
        raise AssertionError("requests.post should not be called when cache is fresh")

    monkeypatch.setattr("services.store_locator.asyncio.to_thread", inline_to_thread)
    monkeypatch.setattr("services.store_locator.requests.post", fail_post)
    stores = asyncio.run(fetch_stores(db, lat=44.0, lng=-76.0, radius_m=5000))
    assert stores == [{"name": "Cached Store"}]


def test_fetch_stores_stale_fallback_on_lookup_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    key = _store_lookup_cache_key(44.0, -76.0, 5000)
    db = FakeDatabase(
        cache_doc={
            "_id": key,
            "payload": [{"name": "Stale Store"}],
            "scraped_at": utc_now() - timedelta(days=30),
        }
    )

    async def inline_to_thread(func: Any, *args: Any, **kwargs: Any) -> Any:
        return func(*args, **kwargs)

    def fail_post(*_args: object, **_kwargs: object) -> Any:
        raise RuntimeError("network down")

    monkeypatch.setattr("services.store_locator.asyncio.to_thread", inline_to_thread)
    monkeypatch.setattr("services.store_locator.requests.post", fail_post)
    stores = asyncio.run(fetch_stores(db, lat=44.0, lng=-76.0, radius_m=5000))
    assert stores == [{"name": "Stale Store"}]
