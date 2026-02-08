from __future__ import annotations

from datetime import datetime, timezone
from typing import TypeAlias

from beanie import Document
from pydantic import Field

from schemas import (
    GroceryListItem,
    GroceryRunGroup,
    OnboardingPreferences,
    PlanMeal,
    PlanSummary,
    TripPlan,
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def empty_grocery_runs() -> list[GroceryRunGroup]:
    return []


class PreferencesDocument(Document):
    updatedAt: datetime = Field(default_factory=utc_now)
    payload: OnboardingPreferences

    class Settings:
        name = "preferences"


class PlanDocument(Document):
    createdAt: datetime = Field(default_factory=utc_now)
    preferences: OnboardingPreferences
    summary: PlanSummary
    meals: list[PlanMeal]
    groceryList: list[GroceryListItem]
    groceryRuns: list[GroceryRunGroup] = Field(default_factory=empty_grocery_runs)
    tripPlan: TripPlan | None = None

    class Settings:
        name = "plans"


DocumentModel: TypeAlias = type[PreferencesDocument] | type[PlanDocument]
DOCUMENT_MODELS: tuple[DocumentModel, ...] = (PreferencesDocument, PlanDocument)
