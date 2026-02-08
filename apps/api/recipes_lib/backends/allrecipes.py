from __future__ import annotations

import json
from typing import Any
from urllib.parse import quote, urlsplit, urlunsplit

from schemas import Ingredient, Meal

from ..types import ScrapedMeal
from .base import PlaywrightRecipeBackend, RecipeBackend


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


class AllrecipesBackend(PlaywrightRecipeBackend, RecipeBackend):
    name = "allrecipes"
    base_url = "https://www.allrecipes.com"
    recipes_az_url = "https://www.allrecipes.com/recipes-a-z-6735880"
    max_category_pages = 3

    async def __aenter__(self) -> "AllrecipesBackend":
        await self._ensure_context()
        return self

    async def fetch_meals(self, query: str, limit: int = 10) -> list[ScrapedMeal]:
        crawl_limit = max(limit * 2, min(limit + 4, 16))
        recipe_urls_from_search = await self._collect_recipe_urls_from_search(query=query, limit=crawl_limit)
        recipe_urls_from_az = await self._collect_recipe_urls_from_az(query=query, limit=crawl_limit)
        recipe_urls = _dedupe_keep_order(recipe_urls_from_search + recipe_urls_from_az)
        if not recipe_urls:
            raise RuntimeError(
                "Allrecipes produced 0 recipe URLs "
                f"(query={query!r}, az_urls={len(recipe_urls_from_az)}, search_urls={len(recipe_urls_from_search)})"
            )

        results: list[ScrapedMeal] = []
        for url in recipe_urls:
            meal = await self._fetch_single(url)
            if meal is not None:
                results.append(meal)
            if len(results) >= limit:
                break
        if not results:
            raise RuntimeError(
                "Allrecipes recipe pages could not be parsed into meals "
                f"(query={query!r}, candidate_urls={len(recipe_urls)})"
            )
        return results

    async def get_meal(self, meal_url: str) -> ScrapedMeal | None:
        return await self._fetch_single(meal_url)

    # Unused for recipes, implemented to satisfy PlaywrightBackend abstract methods.
    async def fetch_ingredients(self, query: str) -> list[Ingredient]:
        return []

    async def get_ingredient_info(self, ingredient_id: str) -> Ingredient:
        raise ValueError("Ingredient info not supported in Allrecipes backend")

    async def _collect_recipe_urls_from_search(self, *, query: str, limit: int) -> list[str]:
        search_url = f"{self.base_url}/search?q={quote(query)}"
        page = await self.new_page()
        try:
            await self.goto(page, search_url, wait_until="domcontentloaded", timeout=12_000)
            await page.wait_for_timeout(500)
            links_raw = await page.eval_on_selector_all(
                'a[href*="/recipe/"]',
                "els => [...new Set(els.map(e => e.href))]",
            )
            if not isinstance(links_raw, list):
                return []
            links = [str(url) for url in links_raw if isinstance(url, str) and _is_recipe_url(url)]
            return _dedupe_keep_order(links)[:limit]
        finally:
            await page.close()

    async def _collect_recipe_urls_from_az(self, *, query: str, limit: int) -> list[str]:
        page = await self.new_page()
        try:
            await self.goto(page, self.recipes_az_url, wait_until="domcontentloaded", timeout=12_000)
            await page.wait_for_timeout(500)
            categories_raw = await page.eval_on_selector_all(
                '[id^="mntl-link-list__item_"] > a[href]',
                "els => els.map(el => ({ href: el.href, text: (el.textContent || '').trim() }))",
            )
            if not isinstance(categories_raw, list):
                return []

            query_norm = query.strip().lower()
            category_links: list[str] = []
            for item in categories_raw:
                if not isinstance(item, dict):
                    continue
                href = item.get("href")
                text = item.get("text")
                if not isinstance(href, str):
                    continue
                if query_norm:
                    haystack = f"{href.lower()} {(text.lower() if isinstance(text, str) else '')}"
                    if query_norm not in haystack:
                        continue
                category_links.append(href)

            category_links = _dedupe_keep_order(category_links)
        finally:
            await page.close()

        if not category_links:
            return []

        recipe_links: list[str] = []
        for category_url in category_links[: self.max_category_pages]:
            if len(recipe_links) >= limit:
                break
            extracted = await self._extract_recipe_urls_from_category(category_url)
            recipe_links.extend(extracted)
            recipe_links = _dedupe_keep_order(recipe_links)

        return recipe_links[:limit]

    async def _extract_recipe_urls_from_category(self, category_url: str) -> list[str]:
        page = await self.new_page()
        try:
            await self.goto(page, category_url, wait_until="domcontentloaded", timeout=12_000)
            await page.wait_for_timeout(500)

            links_raw = await page.eval_on_selector_all(
                '[id^="mntl-card-list-items_"] a[href*="/recipe/"]',
                "els => [...new Set(els.map(e => e.href))]",
            )
            if not isinstance(links_raw, list) or not links_raw:
                links_raw = await page.eval_on_selector_all(
                    'a[href*="/recipe/"]',
                    "els => [...new Set(els.map(e => e.href))]",
                )
                if not isinstance(links_raw, list):
                    return []

            links = [str(url) for url in links_raw if isinstance(url, str) and _is_recipe_url(url)]
            return _dedupe_keep_order(links)
        finally:
            await page.close()

    async def _fetch_single(self, url: str) -> ScrapedMeal | None:
        page = await self.new_page()
        try:
            await self.goto(page, url, wait_until="domcontentloaded", timeout=12_000)
            await page.wait_for_timeout(400)

            data: dict[str, Any] | None = None
            json_ld_scripts = await page.eval_on_selector_all(
                'script[type="application/ld+json"]',
                "els => els.map(el => el?.textContent || '')",
            )
            if isinstance(json_ld_scripts, list):
                for raw_script in json_ld_scripts:
                    if not isinstance(raw_script, str) or not raw_script.strip():
                        continue
                    try:
                        parsed = json.loads(raw_script)
                    except Exception:
                        continue
                    recipe_node = _extract_recipe_node(parsed)
                    if recipe_node is not None:
                        data = recipe_node
                        break

            if data is None:
                title_raw = await page.eval_on_selector("h1", "el => el?.textContent")
                ingredients_raw = await page.eval_on_selector_all(
                    '[id^="mm-recipes-structured-ingredients_"]',
                    "els => els.map(el => (el.textContent || '').trim()).filter(Boolean)",
                )
                if not isinstance(title_raw, str) or not title_raw.strip():
                    return None
                if not isinstance(ingredients_raw, list):
                    return None
                ingredient_lines = [line for line in ingredients_raw if isinstance(line, str) and line.strip()]
                if not ingredient_lines:
                    return None

                image_url = await page.eval_on_selector(
                    'meta[property="og:image"]',
                    "el => el?.getAttribute('content')",
                )

                meal = Meal(
                    id=_norm_id(url),
                    title=title_raw.strip(),
                    ingredientIds=[_norm_id(line) for line in ingredient_lines],
                )
                return ScrapedMeal(
                    meal=meal,
                    ingredients_raw=ingredient_lines,
                    nutrition=None,
                    source_url=url,
                    image_url=image_url if isinstance(image_url, str) else None,
                )

            name = data.get("name")
            ingredients_raw = _normalize_ingredients(data.get("recipeIngredient"))
            if not isinstance(name, str) or not name.strip() or not ingredients_raw:
                return None

            ingredient_ids = [_norm_id(item) for item in ingredients_raw]
            meal = Meal(id=_norm_id(url), title=name.strip(), ingredientIds=ingredient_ids)
            nutrition = data.get("nutrition") if isinstance(data.get("nutrition"), dict) else None
            image_url = _extract_image_url(data.get("image"))

            return ScrapedMeal(
                meal=meal,
                ingredients_raw=ingredients_raw,
                nutrition=nutrition,
                source_url=url,
                image_url=image_url,
            )
        finally:
            await page.close()
