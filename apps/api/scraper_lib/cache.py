from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Protocol


class DatabaseLike(Protocol):
    def get_collection(self, name: str) -> Any: ...


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def to_aware_utc(value: datetime) -> datetime:
    # PyMongo can return naive datetimes depending on codec options.
    # Treat naive timestamps as UTC for cache-age calculations.
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def is_stale(scraped_at: datetime, *, max_age_days: int = 7) -> bool:
    return utc_now() - to_aware_utc(scraped_at) >= timedelta(days=max_age_days)


@dataclass(frozen=True)
class CacheEntry:
    key: str
    payload: Any
    scraped_at: datetime


class ScrapeCache:
    def __init__(self, database: DatabaseLike, *, collection_name: str = "scrape_cache") -> None:
        self._collection = database.get_collection(collection_name)
        self._metrics = database.get_collection("ops_metrics")

    async def get(self, key: str) -> CacheEntry | None:
        doc = await self._collection.find_one({"_id": key})
        if doc is None:
            await self._record_cache_observation(key, hit=False, stale=False)
            return None
        scraped_at = doc.get("scraped_at")
        if not isinstance(scraped_at, datetime):
            scraped_at = utc_now()
        scraped_at = to_aware_utc(scraped_at)
        stale = is_stale(scraped_at)
        age_seconds = max((utc_now() - scraped_at).total_seconds(), 0.0)
        await self._record_cache_observation(key, hit=True, stale=stale, age_seconds=age_seconds)
        return CacheEntry(
            key=key,
            payload=doc.get("payload"),
            scraped_at=scraped_at,
        )

    async def set(self, key: str, payload: Any, *, scraped_at: datetime | None = None) -> None:
        await self._collection.update_one(
            {"_id": key},
            {"$set": {"payload": payload, "scraped_at": scraped_at or utc_now()}},
            upsert=True,
        )

    async def record_scrape_observation(
        self,
        *,
        backend: str,
        operation: str,
        success: bool,
        latency_ms: float,
        stale_fallback: bool = False,
    ) -> None:
        metric_id = f"scrape:{backend}:{operation}"
        update_doc = {
            "$inc": {
                "attempts": 1,
                "successes": 1 if success else 0,
                "failures": 0 if success else 1,
                "latencyMsTotal": max(latency_ms, 0.0),
                "staleFallbacks": 1 if stale_fallback else 0,
            },
            "$set": {"updatedAt": utc_now()},
        }
        try:
            await self._metrics.update_one({"_id": metric_id}, update_doc, upsert=True)
        except Exception:
            # Metrics are best-effort and must never break the request path.
            return

    async def _record_cache_observation(
        self,
        key: str,
        *,
        hit: bool,
        stale: bool,
        age_seconds: float | None = None,
    ) -> None:
        source, key_type = self._cache_dimensions(key)
        metric_id = f"cache:{source}:{key_type}"
        update_doc = {
            "$inc": {
                "requests": 1,
                "hits": 1 if hit else 0,
                "misses": 0 if hit else 1,
                "staleHits": 1 if hit and stale else 0,
                "freshHits": 1 if hit and not stale else 0,
                "ageSecondsTotal": age_seconds if age_seconds is not None else 0.0,
            },
            "$set": {"updatedAt": utc_now()},
        }
        try:
            await self._metrics.update_one({"_id": metric_id}, update_doc, upsert=True)
        except Exception:
            # Metrics are best-effort and must never break the request path.
            return

    @staticmethod
    def _cache_dimensions(key: str) -> tuple[str, str]:
        parts = key.split(":", 2)
        source = parts[0] if parts else "unknown"
        key_type = parts[1] if len(parts) > 1 else "unknown"
        return source, key_type
