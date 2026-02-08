from __future__ import annotations

import re

from typing import Any, Iterable

from pymongo.asynchronous.collection import AsyncCollection

from schemas import Ingredient, IngredientPriceLink


def _norm_tokens(text: str) -> list[str]:
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower())
    tokens = [t for t in cleaned.split() if t]
    return tokens


def _norm_id(text: str) -> str:
    return "-".join(_norm_tokens(text))


_SIZE_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(kg|g|lb|lbs|oz|l|ml)", re.IGNORECASE)


_UNIT_TO_GRAMS = {
    "kg": 1000.0,
    "g": 1.0,
    "lb": 453.592,
    "lbs": 453.592,
    "oz": 28.3495,
}

_UNIT_TO_ML = {
    "l": 1000.0,
    "ml": 1.0,
}


def _parse_size(name: str) -> float | None:
    match = _SIZE_RE.search(name)
    if not match:
        return None
    value = float(match.group(1))
    unit = match.group(2).lower()
    if unit in _UNIT_TO_GRAMS:
        return value * _UNIT_TO_GRAMS[unit]
    if unit in _UNIT_TO_ML:
        return value * _UNIT_TO_ML[unit]
    return None


def _sort_price_links(ingredient_name: str, links: list[IngredientPriceLink]) -> list[IngredientPriceLink]:
    size = _parse_size(ingredient_name)

    def key(link: IngredientPriceLink) -> float:
        if size and size > 0:
            return link.price / size
        return link.price

    return sorted(links, key=key)


async def ensure_ingredient(collection: AsyncCollection[Any], raw_name: str, price_links: list[dict[str, Any]] | None = None) -> Ingredient:
    norm_id = _norm_id(raw_name)
    doc = await collection.find_one({"id": norm_id})
    if doc:
        data = {k: v for k, v in doc.items() if k != "_id"}
        ingredient = Ingredient.model_validate(data)
        ingredient.priceLinks = _sort_price_links(ingredient.name, ingredient.priceLinks)
        return ingredient

    links = []
    if price_links:
        for pl in price_links:
            try:
                links.append(IngredientPriceLink.model_validate(pl))
            except Exception:
                continue

    ingredient = Ingredient(id=norm_id, name=raw_name, imageUrl=None, priceLinks=links)
    await collection.update_one({"id": norm_id}, {"$set": ingredient.model_dump()}, upsert=True)
    return ingredient


def sort_price_links(ingredient: Ingredient) -> Ingredient:
    ingredient.priceLinks = _sort_price_links(ingredient.name, list(ingredient.priceLinks))
    return ingredient


async def match_ingredients(collection: AsyncCollection[Any], raw_names: Iterable[str]) -> list[Ingredient]:
    results: list[Ingredient] = []
    for name in raw_names:
        ing = await ensure_ingredient(collection, name)
        results.append(sort_price_links(ing))
    return results
