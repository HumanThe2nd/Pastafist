from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class SchemaModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


DietType = Literal[
    "vegetarian",
    "vegan",
    "pescatarian",
    "halal",
    "kosher",
    "keto",
    "gluten-free",
    "dairy-free",
]
MacroFocus = Literal["balanced", "high-protein", "low-carb", "high-fiber"]
Allergy = Literal["peanuts", "tree nuts", "dairy", "eggs", "soy", "gluten"]
LatLng = tuple[float, float]

class OnboardingPreferences(SchemaModel):
    budget: float = Field(gt=0)
    mealsPerDay: int = Field(ge=1)
    travelRadiusMeters: int = Field(ge=0)
    dietType: DietType
    allergies: list[Allergy]
    macroFocus: MacroFocus
    location: LatLng
    shoppingFrequency: float = Field(gt=0, le=365)
