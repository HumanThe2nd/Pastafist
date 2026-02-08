import asyncio

import pytest

from services.llm_service import LLMPlanner
from schemas import Meal, OnboardingPreferences


def test_llm_planner_no_key_returns_deterministic():
    planner = LLMPlanner(api_key=None)
    meals = [Meal(id=str(i), title=f"m{i}", ingredientIds=[]) for i in range(3)]
    prefs = OnboardingPreferences(
        budget=10,
        mealsPerDay=2,
        travelRadiusMeters=0,
        dietType="vegetarian",
        allergies=[],
        macroFocus="balanced",
        location=(0.0, 0.0),
        shoppingFrequency=1,
    )

    ids = asyncio.run(planner.pick_meal_ids(meals, prefs, limit=2))
    assert ids == ["0", "1"]
