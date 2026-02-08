from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict


class SchemaModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class PlanSummary(SchemaModel):
    id: str
    periodLabel: str
    totalCost: str
    meals: int
    avgCookTime: str
    storesCompared: int
    savings: str
    nextRunInDays: float


class PlanMeal(SchemaModel):
    id: str
    day: str
    slot: str
    title: str
    ingredientCount: int


class StoreOption(SchemaModel):
    store: str
    unitPrice: str
    quantity: str
    purchaseUrl: str


class GroceryListItem(SchemaModel):
    id: str
    name: str
    totalNeeded: str
    bestStore: str
    purchased: bool
    storeOptions: list[StoreOption]


class GroceryRunStatus(StrEnum):
    CURRENT = "current"
    LATER = "later"
    PURCHASED = "purchased"


class GroceryRunGroup(SchemaModel):
    id: str
    label: str
    subtitle: str | None = None
    status: GroceryRunStatus
    items: list[GroceryListItem]
    runDate: str | None = None


LatLng = tuple[float, float]


class TripTimelineStep(SchemaModel):
    id: str
    time: str
    label: str
    detail: str | None = None
    stopId: str | None = None


class TripStop(SchemaModel):
    id: str
    store: str
    address: str
    eta: str
    lat: float
    lng: float


class TripPlan(SchemaModel):
    id: str
    runLabel: str
    runDate: str
    window: str
    timeline: list[TripTimelineStep]
    stops: list[TripStop]
    route: list[LatLng]
