from __future__ import annotations

from dataclasses import dataclass
import logging
from time import perf_counter
from typing import Any

from schemas import Ingredient

from .backends.base import Backend
from .cache import CacheEntry, ScrapeCache, is_stale, utc_now

logger = logging.getLogger(__name__)


def _encode_ingredient(ingredient: Ingredient) -> dict[str, Any]:
    return ingredient.model_dump()


def _decode_ingredient(data: dict[str, Any]) -> Ingredient:
    return Ingredient.model_validate(data)


def _encode_ingredient_list(items: list[Ingredient]) -> list[dict[str, Any]]:
    return [item.model_dump() for item in items]


def _decode_ingredient_list(items: list[dict[str, Any]]) -> list[Ingredient]:
    return [Ingredient.model_validate(item) for item in items]


@dataclass(frozen=True)
class CachePolicy:
    max_age_days: int = 7


class BackendClient:
    def __init__(self, *, backend: Backend, cache: ScrapeCache, policy: CachePolicy | None = None) -> None:
        self._backend = backend
        self._cache = cache
        self._policy = policy or CachePolicy()

    async def fetch_ingredients(self, query: str) -> list[Ingredient]:
        key = f"{self._backend.name}:search:{query.strip().lower()}"
        cached = await self._cache.get(key)
        cached_items = self._decode_cached_list(cached)
        if (
            cached is not None
            and cached_items is not None
            and not is_stale(cached.scraped_at, max_age_days=self._policy.max_age_days)
        ):
            return cached_items

        started = perf_counter()
        stale_fallback = False
        try:
            items = await self._backend.fetch_ingredients(query)
            latency_ms = (perf_counter() - started) * 1000
            await self._cache.record_scrape_observation(
                backend=self._backend.name,
                operation="search",
                success=True,
                latency_ms=latency_ms,
            )
        except Exception:
            latency_ms = (perf_counter() - started) * 1000
            if cached_items is not None:
                stale_fallback = True
                logger.warning(
                    "Serving stale ingredient cache for backend=%s query=%s after scrape failure",
                    self._backend.name,
                    query,
                )
                await self._cache.record_scrape_observation(
                    backend=self._backend.name,
                    operation="search",
                    success=False,
                    latency_ms=latency_ms,
                    stale_fallback=stale_fallback,
                )
                return cached_items
            await self._cache.record_scrape_observation(
                backend=self._backend.name,
                operation="search",
                success=False,
                latency_ms=latency_ms,
                stale_fallback=stale_fallback,
            )
            raise

        await self._cache.set(key, _encode_ingredient_list(items), scraped_at=utc_now())
        return items

    async def get_ingredient_info(self, ingredient_id: str) -> Ingredient:
        key = f"{self._backend.name}:ingredient:{ingredient_id}"
        cached = await self._cache.get(key)
        cached_item = self._decode_cached_item(cached)
        if (
            cached is not None
            and cached_item is not None
            and not is_stale(cached.scraped_at, max_age_days=self._policy.max_age_days)
        ):
            return cached_item

        started = perf_counter()
        stale_fallback = False
        try:
            item = await self._backend.get_ingredient_info(ingredient_id)
            latency_ms = (perf_counter() - started) * 1000
            await self._cache.record_scrape_observation(
                backend=self._backend.name,
                operation="ingredient",
                success=True,
                latency_ms=latency_ms,
            )
        except Exception:
            latency_ms = (perf_counter() - started) * 1000
            if cached_item is not None:
                stale_fallback = True
                logger.warning(
                    "Serving stale ingredient cache for backend=%s ingredient_id=%s after scrape failure",
                    self._backend.name,
                    ingredient_id,
                )
                await self._cache.record_scrape_observation(
                    backend=self._backend.name,
                    operation="ingredient",
                    success=False,
                    latency_ms=latency_ms,
                    stale_fallback=stale_fallback,
                )
                return cached_item
            await self._cache.record_scrape_observation(
                backend=self._backend.name,
                operation="ingredient",
                success=False,
                latency_ms=latency_ms,
                stale_fallback=stale_fallback,
            )
            raise

        await self._cache.set(key, _encode_ingredient(item), scraped_at=utc_now())
        return item

    @staticmethod
    def _decode_cached_list(cached: CacheEntry | None) -> list[Ingredient] | None:
        if cached is None or not isinstance(cached.payload, list):
            return None
        payload: list[dict[str, Any]] = [item for item in cached.payload if isinstance(item, dict)]
        return _decode_ingredient_list(payload)

    @staticmethod
    def _decode_cached_item(cached: CacheEntry | None) -> Ingredient | None:
        if cached is None or not isinstance(cached.payload, dict):
            return None
        payload: dict[str, Any] = {str(k): v for k, v in cached.payload.items()}
        return _decode_ingredient(payload)
