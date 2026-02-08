from __future__ import annotations

import asyncio
import logging
from time import perf_counter
from typing import Any

import requests
from fastapi import HTTPException, status

from scraper_lib.cache import DatabaseLike, ScrapeCache, is_stale, utc_now

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
logger = logging.getLogger(__name__)


def _store_lookup_cache_key(lat: float, lng: float, radius_m: int) -> str:
    return f"osm:stores:{lat:.4f}:{lng:.4f}:{radius_m}"


def _decode_store_payload(payload: Any) -> list[dict[str, Any]] | None:
    if not isinstance(payload, list):
        return None
    stores: list[dict[str, Any]] = []
    for item in payload:
        if isinstance(item, dict):
            stores.append({str(k): v for k, v in item.items()})
    return stores


async def fetch_stores(db: DatabaseLike, *, lat: float, lng: float, radius_m: int) -> list[dict[str, Any]]:
    """Fetch nearby grocery stores via Overpass."""
    cache = ScrapeCache(db)
    key = _store_lookup_cache_key(lat, lng, radius_m)
    cached = await cache.get(key)
    cached_stores = _decode_store_payload(cached.payload) if cached is not None else None
    if cached is not None and cached_stores is not None and not is_stale(cached.scraped_at, max_age_days=7):
        return cached_stores

    query = f"""
    [out:json][timeout:25];
    (
    node["shop"~"supermarket|grocery|convenience"](around:{radius_m},{lat},{lng});
    way["shop"~"supermarket|grocery|convenience"](around:{radius_m},{lat},{lng});
    relation["shop"~"supermarket|grocery|convenience"](around:{radius_m},{lat},{lng});
    node["amenity"="marketplace"](around:{radius_m},{lat},{lng});
    );
    out center tags;
    """

    started = perf_counter()
    try:
        resp = await asyncio.to_thread(requests.post, OVERPASS_URL, data=query, timeout=25)
        resp.raise_for_status()
        data = resp.json()
        latency_ms = (perf_counter() - started) * 1000
        await cache.record_scrape_observation(
            backend="osm",
            operation="store_lookup",
            success=True,
            latency_ms=latency_ms,
        )
    except Exception as exc:
        latency_ms = (perf_counter() - started) * 1000
        if cached_stores is not None:
            logger.warning(
                "Serving stale store cache for lat=%s lng=%s radius_m=%s after lookup failure",
                lat,
                lng,
                radius_m,
            )
            await cache.record_scrape_observation(
                backend="osm",
                operation="store_lookup",
                success=False,
                latency_ms=latency_ms,
                stale_fallback=True,
            )
            return cached_stores
        await cache.record_scrape_observation(
            backend="osm",
            operation="store_lookup",
            success=False,
            latency_ms=latency_ms,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Store lookup failed: {exc}",
        ) from exc

    stores: list[dict[str, Any]] = []
    for el in data.get("elements", []):
        tags = el.get("tags", {})
        plat = el.get("lat") or el.get("center", {}).get("lat")
        plng = el.get("lon") or el.get("center", {}).get("lon")
        if plat is None or plng is None:
            continue
        stores.append(
            {
                "name": tags.get("name", "Unknown Store"),
                "lat": plat,
                "lng": plng,
                "brand": tags.get("brand"),
                "operator": tags.get("operator"),
                "source": "OpenStreetMap",
            }
        )

    await cache.set(key, stores, scraped_at=utc_now())
    return stores
