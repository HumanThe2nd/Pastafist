from __future__ import annotations

from datetime import date, datetime, timezone
from typing import TypeAlias

from beanie import Document
from pydantic import Field

from schemas import (
    OnboardingPreferences,
    Meal,
    ShoppingList,
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class PreferencesDocument(Document):
    updatedAt: datetime = Field(default_factory=utc_now)
    payload: OnboardingPreferences

    class Settings:
        name = "preferences"


class PlanDocument(Document):
    createdAt: datetime = Field(default_factory=utc_now)
    preferences: OnboardingPreferences
    mealSchedule: list[tuple[Meal, date]] = Field(default_factory=list)
    shoppingSchedule: list[tuple[ShoppingList, date]] = Field(default_factory=list)

    class Settings:
        name = "plans"


DocumentModel: TypeAlias = type[PreferencesDocument] | type[PlanDocument]
DOCUMENT_MODELS: tuple[DocumentModel, ...] = (PreferencesDocument, PlanDocument)
