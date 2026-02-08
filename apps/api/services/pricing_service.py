from __future__ import annotations

from typing import Iterable

from schemas import Ingredient, IngredientPriceLink
from scraper_lib import BackendClient
from scraper_lib.backends import CostcoBackend, FoodBasicsBackend, MetroBackend, WalmartBackend
from scraper_lib.cache import DatabaseLike, ScrapeCache
from services.matching_service import sort_price_links


def _dedupe_price_links(price_links: list[IngredientPriceLink], *, limit: int = 5) -> list[IngredientPriceLink]:
    seen: dict[str, IngredientPriceLink] = {}
    for price_link in price_links:
        if price_link.buyUrl not in seen or price_link.price < seen[price_link.buyUrl].price:
            seen[price_link.buyUrl] = price_link
    return sorted(seen.values(), key=lambda link: link.price)[:limit]


async def enrich_price_links(
    db: DatabaseLike,
    ingredients: Iterable[Ingredient],
    allowed_backends: set[str] | None = None,
) -> list[Ingredient]:
    cache = ScrapeCache(db)
    enriched: list[Ingredient] = []
    collection = db.get_collection("ingredients")

    backends = [
        ("metro", MetroBackend),
        ("foodbasics", FoodBasicsBackend),
        ("costco", CostcoBackend),
        ("walmart", WalmartBackend),
    ]

    ingredient_list = list(ingredients)
    unresolved = [ingredient for ingredient in ingredient_list if not ingredient.priceLinks]
    price_links_by_id: dict[str, list[IngredientPriceLink]] = {ingredient.id: [] for ingredient in unresolved}

    for backend_name, backend_cls in backends:
        if allowed_backends and backend_name not in allowed_backends:
            continue

        if not unresolved:
            break

        async with backend_cls() as backend:
            client = BackendClient(backend=backend, cache=cache)
            for ingredient in unresolved:
                products = await client.fetch_ingredients(ingredient.name)
                if products and products[0].priceLinks:
                    price_links_by_id[ingredient.id].extend(
                        IngredientPriceLink.model_validate(pl.model_dump()) for pl in products[0].priceLinks
                    )

    for ingredient in ingredient_list:
        if not ingredient.priceLinks:
            ingredient.priceLinks = _dedupe_price_links(price_links_by_id.get(ingredient.id, []))
        ingredient = sort_price_links(ingredient)
        enriched.append(ingredient)
        await collection.update_one({"id": ingredient.id}, {"$set": ingredient.model_dump()}, upsert=True)

    return enriched
