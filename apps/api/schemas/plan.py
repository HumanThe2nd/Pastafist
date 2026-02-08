from __future__ import annotations

from datetime import date, datetime, timezone

from pydantic import BaseModel, ConfigDict, Field

from .onboarding import OnboardingPreferences


class SchemaModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Quantity(SchemaModel):
    amount: float = Field(gt=0)
    unit: str = Field(min_length=1)


class IngredientPriceLink(SchemaModel):
    price: float = Field(ge=0)
    buyUrl: str


def _default_price_links() -> list[IngredientPriceLink]:
    return []


class Ingredient(SchemaModel):
    id: str
    name: str
    imageUrl: str | None = None
    priceLinks: list[IngredientPriceLink] = Field(default_factory=_default_price_links)


class IngredientQuantity(SchemaModel):
    ingredient: Ingredient
    quantity: Quantity


class Meal(SchemaModel):
    id: str
    title: str
    ingredientIds: list[str]


class ShoppingList(SchemaModel):
    id: str
    items: list[IngredientQuantity]


MealScheduleEntry = tuple[Meal, date]
ShoppingScheduleEntry = tuple[ShoppingList, date]


def _default_meal_schedule() -> list[MealScheduleEntry]:
    return []


def _default_shopping_schedule() -> list[ShoppingScheduleEntry]:
    return []


class PlanPayload(SchemaModel):
    id: str
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    preferences: OnboardingPreferences
    mealSchedule: list[MealScheduleEntry] = Field(default_factory=_default_meal_schedule)
    shoppingSchedule: list[ShoppingScheduleEntry] = Field(default_factory=_default_shopping_schedule)
