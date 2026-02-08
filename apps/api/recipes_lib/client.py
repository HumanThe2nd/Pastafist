from __future__ import annotations

from dataclasses import dataclass
import logging
from time import perf_counter
from typing import Any

from schemas import Meal

from scraper_lib.cache import CacheEntry, ScrapeCache, is_stale, utc_now

from .backends.base import RecipeBackend
from .types import ScrapedMeal

logger = logging.getLogger(__name__)

def _encode_scraped(meal: ScrapedMeal) -> dict[str, Any]:
    return {
        "meal": meal.meal.model_dump(),
        "ingredients_raw": meal.ingredients_raw,
        "nutrition": meal.nutrition,
        "source_url": meal.source_url,
        "image_url": meal.image_url,
    }


def _decode_scraped(data: dict[str, Any]) -> ScrapedMeal:
    meal = Meal.model_validate(data["meal"])
    return ScrapedMeal(
        meal=meal,
        ingredients_raw=list(data.get("ingredients_raw", [])),
        nutrition=data.get("nutrition"),
        source_url=data.get("source_url", ""),
        image_url=data.get("image_url"),
    )


@dataclass(frozen=True)
class CachePolicy:
    max_age_days: int = 7


class RecipeClient:
    def __init__(self, *, backend: RecipeBackend, cache: ScrapeCache, policy: CachePolicy | None = None) -> None:
        self._backend = backend
        self._cache = cache
        self._policy = policy or CachePolicy()

    async def fetch_meals(self, query: str, limit: int = 10) -> list[ScrapedMeal]:
        key = f"{self._backend.name}:search:{query.strip().lower()}:{limit}"
        logger.warning("recipe_fetch_start backend=%s query=%s limit=%s", self._backend.name, query, limit)
        cached = await self._cache.get(key)
        cached_meals = self._decode_cached_meals(cached)
        if (
            cached is not None
            and cached_meals is not None
            and len(cached_meals) > 0
            and not is_stale(cached.scraped_at, max_age_days=self._policy.max_age_days)
        ):
            logger.warning(
                "recipe_fetch_cache_hit backend=%s query=%s count=%s",
                self._backend.name,
                query,
                len(cached_meals),
            )
            return cached_meals

        started = perf_counter()
        try:
            meals = await self._backend.fetch_meals(query, limit=limit)
            if not meals:
                raise RuntimeError(f"Recipe backend returned no meals for query={query!r} limit={limit}")
            latency_ms = (perf_counter() - started) * 1000
            await self._cache.record_scrape_observation(
                backend=self._backend.name,
                operation="recipe_search",
                success=True,
                latency_ms=latency_ms,
            )
            logger.warning(
                "recipe_fetch_ok backend=%s query=%s count=%s elapsed_ms=%.0f",
                self._backend.name,
                query,
                len(meals),
                latency_ms,
            )
        except Exception:
            latency_ms = (perf_counter() - started) * 1000
            if cached_meals:
                logger.warning(
                    "Serving stale recipe cache for backend=%s query=%s after scrape failure",
                    self._backend.name,
                    query,
                )
                await self._cache.record_scrape_observation(
                    backend=self._backend.name,
                    operation="recipe_search",
                    success=False,
                    latency_ms=latency_ms,
                    stale_fallback=True,
                )
                return cached_meals
            logger.warning(
                "recipe_fetch_error backend=%s query=%s elapsed_ms=%.0f",
                self._backend.name,
                query,
                latency_ms,
            )
            await self._cache.record_scrape_observation(
                backend=self._backend.name,
                operation="recipe_search",
                success=False,
                latency_ms=latency_ms,
            )
            raise

        await self._cache.set(key, [_encode_scraped(m) for m in meals], scraped_at=utc_now())
        return meals

    async def get_meal(self, meal_url: str) -> ScrapedMeal | None:
        key = f"{self._backend.name}:meal:{meal_url}"
        cached = await self._cache.get(key)
        cached_meal = self._decode_cached_meal(cached)
        if (
            cached is not None
            and cached_meal is not None
            and not is_stale(cached.scraped_at, max_age_days=self._policy.max_age_days)
        ):
            return cached_meal

        started = perf_counter()
        try:
            meal = await self._backend.get_meal(meal_url)
            latency_ms = (perf_counter() - started) * 1000
            await self._cache.record_scrape_observation(
                backend=self._backend.name,
                operation="recipe_get",
                success=True,
                latency_ms=latency_ms,
            )
        except Exception:
            latency_ms = (perf_counter() - started) * 1000
            if cached_meal is not None:
                logger.warning(
                    "Serving stale recipe cache for backend=%s meal_url=%s after scrape failure",
                    self._backend.name,
                    meal_url,
                )
                await self._cache.record_scrape_observation(
                    backend=self._backend.name,
                    operation="recipe_get",
                    success=False,
                    latency_ms=latency_ms,
                    stale_fallback=True,
                )
                return cached_meal
            await self._cache.record_scrape_observation(
                backend=self._backend.name,
                operation="recipe_get",
                success=False,
                latency_ms=latency_ms,
            )
            raise

        if meal is None:
            return None
        await self._cache.set(key, _encode_scraped(meal), scraped_at=utc_now())
        return meal

    @staticmethod
    def _decode_cached_meals(cached: CacheEntry | None) -> list[ScrapedMeal] | None:
        if cached is None or not isinstance(cached.payload, list):
            return None
        payload: list[dict[str, Any]] = [item for item in cached.payload if isinstance(item, dict)]
        return [_decode_scraped(item) for item in payload]

    @staticmethod
    def _decode_cached_meal(cached: CacheEntry | None) -> ScrapedMeal | None:
        if cached is None or not isinstance(cached.payload, dict):
            return None
        payload: dict[str, Any] = {str(k): v for k, v in cached.payload.items()}
        return _decode_scraped(payload)
