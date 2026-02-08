from __future__ import annotations

import hashlib
import json
import logging
import os
from datetime import date, datetime, timedelta, timezone
from typing import Any, Mapping, Sequence
from uuid import uuid4

from fastapi import HTTPException, status

from recipes_lib import AllrecipesBackend, RecipeClient
from schemas import Ingredient, Meal, OnboardingPreferences, PlanPayload, Quantity, ShoppingList
from scraper_lib.cache import DatabaseLike, ScrapeCache, is_stale
from services.matching_service import match_ingredients, sort_price_links
from services.pricing_service import enrich_price_links
from services.llm_service import LLMPlanner

logger = logging.getLogger(__name__)


def plan_doc_to_payload(plan_doc: Mapping[str, Any]) -> PlanPayload:
    plan_id = plan_doc.get("_id")
    if plan_id is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Plan document is missing database id",
        )

    payload = dict(plan_doc)
    payload["id"] = str(plan_id)
    payload.pop("_id", None)
    return PlanPayload.model_validate(payload)


def _default_quantity() -> Quantity:
    return Quantity(amount=1, unit="unit")


def _build_shopping_list(ingredients: list[Ingredient]) -> ShoppingList:
    items = [
        {
            "ingredient": sort_price_links(ing).model_dump(),
            "quantity": _default_quantity().model_dump(),
        }
        for ing in ingredients
    ]
    return ShoppingList.model_validate({"id": str(uuid4()), "items": items})


def _aggregate_shopping_list(meal_ingredients: list[list[Ingredient]]) -> ShoppingList:
    bucket: dict[str, Ingredient] = {}
    for ing_list in meal_ingredients:
        for ing in ing_list:
            bucket.setdefault(ing.id, ing)
    return _build_shopping_list(list(bucket.values()))


def _build_meal_schedule(meals: list[Meal], meals_per_day: int) -> list[tuple[Meal, date]]:
    schedule: list[tuple[Meal, date]] = []
    today = datetime.now(timezone.utc).date()
    for idx, meal in enumerate(meals):
        day = today + timedelta(days=idx // max(meals_per_day, 1))
        schedule.append((meal, day))
    return schedule


def _build_shopping_schedule(shopping_list: ShoppingList, start_date: date) -> list[tuple[ShoppingList, date]]:
    return [(shopping_list, start_date)]


def _llm_cache_key(meals: Sequence[Meal], preferences: OnboardingPreferences, limit: int) -> str:
    payload = {
        "meal_ids": [meal.id for meal in meals],
        "limit": limit,
        "preferences": preferences.model_dump(),
    }
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()
    return f"llm:meal_order:{digest}"


_ALLERGEN_TOKENS = {
    "peanuts": {"peanut"},
    "tree nuts": {"almond", "walnut", "pecan", "cashew", "pistachio", "hazelnut"},
    "dairy": {"milk", "cheese", "butter", "yogurt", "cream"},
    "eggs": {"egg"},
    "soy": {"soy", "tofu", "edamame", "soybean"},
    "gluten": {"wheat", "barley", "rye", "gluten"},
}

_DIET_EXCLUDE = {
    "vegetarian": {"chicken", "beef", "pork", "lamb", "fish", "shrimp", "bacon"},
    "vegan": {"chicken", "beef", "pork", "lamb", "fish", "shrimp", "bacon", "milk", "cheese", "butter", "yogurt", "cream", "egg", "honey"},
    "pescatarian": {"chicken", "beef", "pork", "lamb", "bacon"},
    "halal": {"pork", "bacon"},
    "kosher": {"pork", "bacon", "shellfish"},
    "keto": set(),
    "gluten-free": {"wheat", "barley", "rye", "gluten"},
    "dairy-free": {"milk", "cheese", "butter", "yogurt", "cream"},
}


def _contains_any(text: str, needles: set[str]) -> bool:
    lowered = text.lower()
    return any(tok in lowered for tok in needles)


def _meal_allowed(ingredients_raw: Sequence[str], prefs: OnboardingPreferences) -> bool:
    for allergy in prefs.allergies:
        tokens = _ALLERGEN_TOKENS.get(allergy, set())
        if tokens and any(_contains_any(ing, tokens) for ing in ingredients_raw):
            return False

    exclude = _DIET_EXCLUDE.get(prefs.dietType, set())
    if exclude and any(_contains_any(ing, exclude) for ing in ingredients_raw):
        return False

    return True


async def generate_plan_payload(db: DatabaseLike, preferences: OnboardingPreferences) -> PlanPayload:
    logger.warning("planner_stage=start")
    cache = ScrapeCache(db)
    ingredients_collection = db.get_collection("ingredients")

    allowed_backends: set[str] | None = None

    # Optional travel-radius precheck (does not yet filter products by store)
    if preferences.travelRadiusMeters > 0 and preferences.location:
        logger.warning("planner_stage=store_lookup_start")
        from services.store_locator import fetch_stores

        stores = await fetch_stores(
            db,
            lat=preferences.location[0],
            lng=preferences.location[1],
            radius_m=preferences.travelRadiusMeters,
        )
        if not stores:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No stores found within travel radius",
            )
        # map brands/operators/names to backend names
        brand_map = {
            "walmart": "walmart",
            "costco": "costco",
            "metro": "metro",
            "food basics": "foodbasics",
        }
        allowed_backends = set()
        for store in stores:
            text = " ".join(
                str(v).lower()
                for v in [store.get("brand"), store.get("operator"), store.get("name")]
                if v
            )
            for key, backend_name in brand_map.items():
                if key in text:
                    allowed_backends.add(backend_name)
        logger.warning("planner_stage=store_lookup_done stores=%s", len(stores))

    async with AllrecipesBackend() as backend:
        logger.warning("planner_stage=recipe_fetch_start")
        client = RecipeClient(backend=backend, cache=cache)
        try:
            scraped = await client.fetch_meals(query="dinner", limit=5)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Allrecipes scrape failed: {exc.__class__.__name__}: {exc}",
            ) from exc
    logger.warning("planner_stage=recipe_fetch_done meals=%s", len(scraped))

    if not scraped:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No meals available from source; check scraper diagnostics and /ops/metrics",
        )

    scraped = [s for s in scraped if _meal_allowed(s.ingredients_raw, preferences)]
    if not scraped:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No meals satisfy diet/allergy filters",
        )

    meal_ingredients: list[list[Ingredient]] = []
    meals: list[Meal] = []
    logger.warning("planner_stage=match_ingredients_start")
    for item in scraped:
        meals.append(item.meal)
        ing_list = await match_ingredients(ingredients_collection, item.ingredients_raw)
        meal_ingredients.append(ing_list)
    logger.warning("planner_stage=match_ingredients_done meals=%s", len(meals))

    unique_ings = {ing.id: ing for ing_list in meal_ingredients for ing in ing_list}
    enable_price_scraping = os.getenv("PLANNER_ENABLE_PRICE_SCRAPING", "false").lower() == "true"
    if enable_price_scraping:
        logger.warning("planner_stage=pricing_start ingredients=%s", len(unique_ings))
        priced_ings_list = await enrich_price_links(db, unique_ings.values(), allowed_backends=allowed_backends)
        priced_ings = {ing.id: ing for ing in priced_ings_list}
        meal_ingredients = [[priced_ings[ing.id] for ing in ing_list] for ing_list in meal_ingredients]
        logger.warning("planner_stage=pricing_done")
    else:
        logger.warning("planner_stage=pricing_skipped")

    horizon_days = max(1, int(preferences.shoppingFrequency))
    meals_needed = max(1, preferences.mealsPerDay * horizon_days)

    def meal_cost(ings: list[Ingredient]) -> tuple[float, int]:
        priced_total = 0.0
        missing_prices = 0
        for ing in ings:
            if ing.priceLinks:
                priced_total += ing.priceLinks[0].price
            else:
                missing_prices += 1
        return priced_total, missing_prices

    meal_cost_pairs = [(*meal_cost(ings), meal, ings) for meal, ings in zip(meals, meal_ingredients)]
    meal_cost_pairs.sort(key=lambda row: (row[1], row[0]))
    selected = meal_cost_pairs[:meals_needed]
    if not selected:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="No meals after pricing")

    total_cost = sum(cost for cost, _, _, _ in selected)
    missing_prices = sum(missing for _, missing, _, _ in selected)
    if preferences.budget and missing_prices == 0 and total_cost > preferences.budget:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Plan exceeds budget: estimated {total_cost:.2f} > budget {preferences.budget:.2f}",
        )

    meals = [meal for _, _, meal, _ in selected]
    meal_ingredients = [ings for _, _, _, ings in selected]

    shopping_list = _aggregate_shopping_list(meal_ingredients)

    planner = LLMPlanner()
    try:
        logger.warning("planner_stage=llm_start")
        llm_key = _llm_cache_key(meals, preferences, limit=len(meals))
        cached_order = await cache.get(llm_key)
        if (
            cached_order is not None
            and not is_stale(cached_order.scraped_at, max_age_days=7)
            and isinstance(cached_order.payload, list)
        ):
            ordered_ids = [str(item) for item in cached_order.payload]
        else:
            ordered_ids = await planner.pick_meal_ids(meals, preferences, limit=len(meals))
            await cache.set(llm_key, ordered_ids)

        id_to_meal = {m.id: m for m in meals}
        id_to_ings = {m.id: ings for m, ings in zip(meals, meal_ingredients)}
        meals = [id_to_meal[mid] for mid in ordered_ids if mid in id_to_meal]
        meal_ingredients = [id_to_ings[mid] for mid in ordered_ids if mid in id_to_ings]
        logger.warning("planner_stage=llm_done")
    except HTTPException:
        pass

    meal_schedule = _build_meal_schedule(meals, preferences.mealsPerDay)
    shopping_schedule = _build_shopping_schedule(
        shopping_list, meal_schedule[0][1] if meal_schedule else datetime.now(timezone.utc).date()
    )

    return PlanPayload(
        id=str(uuid4()),
        preferences=preferences,
        mealSchedule=meal_schedule,
        shoppingSchedule=shopping_schedule,
    )
