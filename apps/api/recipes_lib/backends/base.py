from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Protocol

from scraper_lib.backends.base import PlaywrightBackend

from ..types import ScrapedMeal


class RecipeBackend(Protocol):
    name: str

    async def fetch_meals(self, query: str, limit: int = 10) -> list[ScrapedMeal]: ...

    async def get_meal(self, meal_url: str) -> ScrapedMeal | None: ...

    async def fetch_ingredients(self, query: str) -> list: ...  # minimal for PlaywrightBackend compatibility
    async def get_ingredient_info(self, ingredient_id: str): ...  # minimal for PlaywrightBackend compatibility


class PlaywrightRecipeBackend(PlaywrightBackend, ABC):
    @abstractmethod
    async def fetch_meals(self, query: str, limit: int = 10) -> list[ScrapedMeal]:
        raise NotImplementedError

    @abstractmethod
    async def get_meal(self, meal_url: str) -> ScrapedMeal | None:
        raise NotImplementedError
