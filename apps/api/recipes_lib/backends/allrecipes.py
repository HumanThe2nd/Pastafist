from __future__ import annotations

import asyncio
import html as html_lib
import json
import re
from typing import Any
from urllib.parse import quote, urljoin, urlsplit, urlunsplit

import requests

from schemas import Ingredient, Meal

from ..types import ScrapedMeal
from .base import PlaywrightRecipeBackend, RecipeBackend


_RECIPE_HREF_RE = re.compile(r"""href=["'](?P<href>[^"']*?/recipe/[^"']+)["']""", re.IGNORECASE)
_CATEGORY_ITEM_RE = re.compile(
    r"""id=["']mntl-link-list__item_\d+-\d+["'][^>]*>\s*<a[^>]*href=["'](?P<href>[^"']+)["']""",
    re.IGNORECASE,
)
_JSON_LD_RE = re.compile(
    r"""<script[^>]*type=["']application/ld\+json["'][^>]*>(?P<body>.*?)</script>""",
    re.IGNORECASE | re.DOTALL,
)
_DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


def _norm_id(text: str) -> str:
    cleaned = "".join(ch for ch in text.lower() if ch.isalnum() or ch.isspace())
    tokens = " ".join(cleaned.split())
    return tokens.replace(" ", "-")


def _normalize_url(url: str) -> str:
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))


def _is_recipe_url(url: str) -> bool:
    return "/recipe/" in url


def _dedupe_keep_order(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        normalized = _normalize_url(item)
        if normalized in seen:
            continue
        seen.add(normalized)
        out.append(normalized)
    return out


def _extract_recipe_node(payload: Any) -> dict[str, Any] | None:
    if isinstance(payload, dict):
        type_field = payload.get("@type")
        if isinstance(type_field, str) and type_field == "Recipe":
            return payload
        if isinstance(type_field, list) and "Recipe" in type_field:
            return payload
        graph = payload.get("@graph")
        if isinstance(graph, list):
            for item in graph:
                found = _extract_recipe_node(item)
                if found is not None:
                    return found
        return None
    if isinstance(payload, list):
        for item in payload:
            found = _extract_recipe_node(item)
            if found is not None:
                return found
    return None


def _normalize_ingredients(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        return []
    result: list[str] = []
    for item in raw:
        if isinstance(item, str):
            text = item.strip()
            if text:
                result.append(text)
    return result


def _extract_image_url(raw: Any) -> str | None:
    if isinstance(raw, str):
        return raw
    if isinstance(raw, list):
        for item in raw:
            if isinstance(item, str):
                return item
            if isinstance(item, dict):
                candidate = item.get("url")
                if isinstance(candidate, str):
                    return candidate
    if isinstance(raw, dict):
        candidate = raw.get("url")
        if isinstance(candidate, str):
            return candidate
    return None


def _fetch_html(url: str, timeout_seconds: float) -> str:
    response = requests.get(url, headers=_DEFAULT_HEADERS, timeout=timeout_seconds)
    response.raise_for_status()
    return response.text


def _extract_recipe_urls(html: str, base_url: str) -> list[str]:
    urls: list[str] = []
    for match in _RECIPE_HREF_RE.finditer(html):
        href = html_lib.unescape(match.group("href")).strip()
        full_url = urljoin(base_url, href)
        if _is_recipe_url(full_url):
            urls.append(full_url)
    return _dedupe_keep_order(urls)


def _extract_category_urls(html: str, base_url: str, query: str) -> list[str]:
    urls: list[str] = []
    for match in _CATEGORY_ITEM_RE.finditer(html):
        href = html_lib.unescape(match.group("href")).strip()
        full_url = urljoin(base_url, href)
        if "/recipes/" in full_url:
            urls.append(full_url)
    urls = _dedupe_keep_order(urls)
    if not query:
        return urls
    query_norm = query.strip().lower()
    matched = [url for url in urls if query_norm in url.lower()]
    return matched or urls


def _extract_json_ld_payloads(html: str) -> list[Any]:
    payloads: list[Any] = []
    for match in _JSON_LD_RE.finditer(html):
        raw = html_lib.unescape(match.group("body")).strip()
        if not raw:
            continue
        try:
            payloads.append(json.loads(raw))
        except Exception:
            continue
    return payloads


class AllrecipesBackend(PlaywrightRecipeBackend, RecipeBackend):
    name = "allrecipes"
    base_url = "https://www.allrecipes.com"
    recipes_az_url = "https://www.allrecipes.com/recipes-a-z-6735880"
    max_category_pages = 2
    request_timeout_seconds = 12.0

    async def __aenter__(self) -> "AllrecipesBackend":
        # This backend intentionally uses direct HTTP fetches for speed/reliability.
        return self

    async def fetch_meals(self, query: str, limit: int = 10) -> list[ScrapedMeal]:
        target_limit = max(1, min(limit, 5))
        candidate_urls = await asyncio.to_thread(self._collect_recipe_urls, query, target_limit)
        if not candidate_urls:
            raise RuntimeError(
                f"Allrecipes produced 0 recipe URLs (query={query!r})"
            )

        results: list[ScrapedMeal] = []
        for url in candidate_urls:
            meal = await self._fetch_single(url)
            if meal is not None:
                results.append(meal)
            if len(results) >= target_limit:
                break

        if not results:
            raise RuntimeError(
                f"Allrecipes recipe pages could not be parsed into meals (query={query!r}, candidate_urls={len(candidate_urls)})"
            )
        return results

    async def get_meal(self, meal_url: str) -> ScrapedMeal | None:
        return await self._fetch_single(meal_url)

    async def fetch_ingredients(self, query: str) -> list[Ingredient]:
        return []

    async def get_ingredient_info(self, ingredient_id: str) -> Ingredient:
        raise ValueError("Ingredient info not supported in Allrecipes backend")

    def _collect_recipe_urls(self, query: str, target_limit: int) -> list[str]:
        search_url = f"{self.base_url}/search?q={quote(query)}"
        search_html = _fetch_html(search_url, self.request_timeout_seconds)
        links = _extract_recipe_urls(search_html, self.base_url)

        if len(links) < target_limit:
            az_html = _fetch_html(self.recipes_az_url, self.request_timeout_seconds)
            categories = _extract_category_urls(az_html, self.base_url, query)
            for category_url in categories[: self.max_category_pages]:
                category_html = _fetch_html(category_url, self.request_timeout_seconds)
                links.extend(_extract_recipe_urls(category_html, self.base_url))
                links = _dedupe_keep_order(links)
                if len(links) >= target_limit * 2:
                    break

        return _dedupe_keep_order(links)[: max(target_limit * 2, target_limit)]

    async def _fetch_single(self, url: str) -> ScrapedMeal | None:
        try:
            html = await asyncio.to_thread(_fetch_html, url, self.request_timeout_seconds)
        except Exception:
            return None

        recipe_data: dict[str, Any] | None = None
        for payload in _extract_json_ld_payloads(html):
            recipe_node = _extract_recipe_node(payload)
            if recipe_node is not None:
                recipe_data = recipe_node
                break

        if not isinstance(recipe_data, dict):
            return None

        name = recipe_data.get("name")
        ingredients_raw = _normalize_ingredients(recipe_data.get("recipeIngredient"))
        if not isinstance(name, str) or not name.strip() or not ingredients_raw:
            return None

        meal = Meal(
            id=_norm_id(url),
            title=name.strip(),
            ingredientIds=[_norm_id(item) for item in ingredients_raw],
        )
        nutrition = recipe_data.get("nutrition") if isinstance(recipe_data.get("nutrition"), dict) else None
        image_url = _extract_image_url(recipe_data.get("image"))
        return ScrapedMeal(
            meal=meal,
            ingredients_raw=ingredients_raw,
            nutrition=nutrition,
            source_url=url,
            image_url=image_url,
        )
