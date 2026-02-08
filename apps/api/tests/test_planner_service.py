from __future__ import annotations

import asyncio
from typing import Any, Iterable

import pytest

from recipes_lib.types import ScrapedMeal
from schemas import Ingredient, IngredientPriceLink, Meal, OnboardingPreferences
from services import planner_service


class InMemoryCollection:
    def __init__(self) -> None:
        self.docs: dict[str, dict[str, Any]] = {}

    async def find_one(self, query: dict[str, Any]) -> dict[str, Any] | None:
        key = query.get("_id")
        if not isinstance(key, str):
            return None
        return self.docs.get(key)

    async def update_one(self, query: dict[str, Any], update: dict[str, Any], upsert: bool = False) -> None:
        key = query.get("_id")
        if not isinstance(key, str):
            return
        if key not in self.docs:
            if not upsert:
                return
            self.docs[key] = {"_id": key}
        if "$set" in update:
            payload = update["$set"]
            if isinstance(payload, dict):
                self.docs[key].update(payload)


class InMemoryDatabase:
    def __init__(self) -> None:
        self._collections: dict[str, InMemoryCollection] = {
            "ingredients": InMemoryCollection(),
            "scrape_cache": InMemoryCollection(),
            "ops_metrics": InMemoryCollection(),
        }

    def get_collection(self, name: str) -> InMemoryCollection:
        if name not in self._collections:
            self._collections[name] = InMemoryCollection()
        return self._collections[name]


class FakeAllrecipesBackend:
    async def __aenter__(self) -> "FakeAllrecipesBackend":
        return self

    async def __aexit__(self, _exc_type: object, _exc: object, _tb: object) -> None:
        return None


class FakeRecipeClient:
    def __init__(self, *, backend: Any, cache: Any) -> None:
        self._backend = backend
        self._cache = cache

    async def fetch_meals(self, query: str, limit: int = 10) -> list[ScrapedMeal]:
        meals = [
            ScrapedMeal(
                meal=Meal(id="meal-1", title="Meal 1", ingredientIds=["rice", "beans"]),
                ingredients_raw=["rice", "beans"],
                nutrition={"calories": "400"},
                source_url="https://allrecipes.com/meal-1",
                image_url="https://img/meal1.jpg",
            ),
            ScrapedMeal(
                meal=Meal(id="meal-2", title="Meal 2", ingredientIds=["chickpeas", "tomato"]),
                ingredients_raw=["chickpeas", "tomato"],
                nutrition={"calories": "420"},
                source_url="https://allrecipes.com/meal-2",
                image_url="https://img/meal2.jpg",
            ),
        ]
        return meals[:limit]


def _prefs() -> OnboardingPreferences:
    return OnboardingPreferences(
        budget=100.0,
        mealsPerDay=1,
        travelRadiusMeters=0,
        dietType="vegetarian",
        allergies=[],
        macroFocus="balanced",
        location=(44.0, -76.0),
        shoppingFrequency=2,
    )


async def _fake_match_ingredients(_collection: Any, raw_names: Iterable[str]) -> list[Ingredient]:
    return [
        Ingredient(
            id=name.replace(" ", "-"),
            name=name,
            imageUrl=None,
            priceLinks=[],
        )
        for name in raw_names
    ]


class FakeLLMPlanner:
    calls = 0

    async def pick_meal_ids(self, candidates: list[Meal], _preferences: OnboardingPreferences, limit: int) -> list[str]:
        FakeLLMPlanner.calls += 1
        ids = [meal.id for meal in candidates]
        return list(reversed(ids))[:limit]


def test_generate_plan_payload_caches_llm_order(monkeypatch: pytest.MonkeyPatch) -> None:
    db = InMemoryDatabase()
    FakeLLMPlanner.calls = 0

    async def fake_enrich_price_links(
        _db: Any,
        ingredients: Iterable[Ingredient],
        allowed_backends: set[str] | None = None,
    ) -> list[Ingredient]:
        enriched: list[Ingredient] = []
        _ = allowed_backends
        for idx, ingredient in enumerate(ingredients):
            ingredient.priceLinks = [
                IngredientPriceLink(price=1.0 + idx, buyUrl=f"https://store/{ingredient.id}")
            ]
            enriched.append(ingredient)
        return enriched

    monkeypatch.setattr(planner_service, "AllrecipesBackend", FakeAllrecipesBackend)
    monkeypatch.setattr(planner_service, "RecipeClient", FakeRecipeClient)
    monkeypatch.setattr(planner_service, "match_ingredients", _fake_match_ingredients)
    monkeypatch.setattr(planner_service, "enrich_price_links", fake_enrich_price_links)
    monkeypatch.setattr(planner_service, "LLMPlanner", FakeLLMPlanner)

    first_plan = asyncio.run(planner_service.generate_plan_payload(db, _prefs()))
    second_plan = asyncio.run(planner_service.generate_plan_payload(db, _prefs()))

    assert FakeLLMPlanner.calls == 1
    assert first_plan.mealSchedule[0][0].id == "meal-2"
    assert second_plan.mealSchedule[0][0].id == "meal-2"


def test_generate_plan_payload_allows_partial_pricing(monkeypatch: pytest.MonkeyPatch) -> None:
    db = InMemoryDatabase()

    async def fake_enrich_partial(
        _db: Any,
        ingredients: Iterable[Ingredient],
        allowed_backends: set[str] | None = None,
    ) -> list[Ingredient]:
        enriched: list[Ingredient] = []
        _ = allowed_backends
        for idx, ingredient in enumerate(ingredients):
            ingredient.priceLinks = []
            if idx % 2 == 0:
                ingredient.priceLinks = [
                    IngredientPriceLink(price=2.0 + idx, buyUrl=f"https://store/{ingredient.id}")
                ]
            enriched.append(ingredient)
        return enriched

    monkeypatch.setattr(planner_service, "AllrecipesBackend", FakeAllrecipesBackend)
    monkeypatch.setattr(planner_service, "RecipeClient", FakeRecipeClient)
    monkeypatch.setattr(planner_service, "match_ingredients", _fake_match_ingredients)
    monkeypatch.setattr(planner_service, "enrich_price_links", fake_enrich_partial)
    monkeypatch.setattr(planner_service, "LLMPlanner", FakeLLMPlanner)

    budgeted = _prefs()
    budgeted.budget = 3.0
    plan = asyncio.run(planner_service.generate_plan_payload(db, budgeted))
    assert len(plan.shoppingSchedule) == 1
