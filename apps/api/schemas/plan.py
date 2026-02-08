from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field

from .dashboard import GroceryListItem, GroceryRunGroup, PlanMeal, PlanSummary, TripPlan
from .onboarding import OnboardingPreferences


class SchemaModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class GeneratePlanRequest(SchemaModel):
    preferences: OnboardingPreferences


class PlanPayload(SchemaModel):
    id: str
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    preferences: OnboardingPreferences
    summary: PlanSummary
    meals: list[PlanMeal]
    groceryList: list[GroceryListItem]
    groceryRuns: list[GroceryRunGroup] = Field(default_factory=list)
    tripPlan: TripPlan | None = None


class GeneratePlanResponse(SchemaModel):
    plan: PlanPayload
