from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class SchemaModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class DietType(StrEnum):
    NONE = "none"
    VEGETARIAN = "vegetarian"
    VEGAN = "vegan"
    PESCATARIAN = "pescatarian"
    HALAL = "halal"
    KOSHER = "kosher"
    KETO = "keto"
    GLUTEN_FREE = "gluten-free"
    DAIRY_FREE = "dairy-free"
    OTHER = "other"


class MacroFocus(StrEnum):
    BALANCED = "balanced"
    HIGH_PROTEIN = "high-protein"
    LOW_CARB = "low-carb"
    HIGH_FIBER = "high-fiber"


class TravelMode(StrEnum):
    WALK = "walk"
    BIKE = "bike"
    TRANSIT = "transit"
    DRIVE = "drive"


class Gender(StrEnum):
    FEMALE = "female"
    MALE = "male"
    NON_BINARY = "non-binary"
    PREFER_NOT_TO_SAY = "prefer-not-to-say"


class BudgetPeriod(StrEnum):
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"


class ShoppingFrequency(StrEnum):
    EVERY_OTHER_DAY = "every_other_day"
    TWICE_WEEKLY = "twice_weekly"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"


class StepId(StrEnum):
    WELCOME = "welcome"
    CONSTRAINTS = "constraints"
    DIET = "diet"
    STORES = "stores"


class ShoppingFrequencyOption(SchemaModel):
    value: ShoppingFrequency
    label: str


SHOPPING_INTERVAL_DAYS: dict[ShoppingFrequency, float] = {
    ShoppingFrequency.EVERY_OTHER_DAY: 2.0,
    ShoppingFrequency.TWICE_WEEKLY: 3.5,
    ShoppingFrequency.WEEKLY: 7.0,
    ShoppingFrequency.BIWEEKLY: 14.0,
    ShoppingFrequency.MONTHLY: 30.0,
}


SHOPPING_FREQUENCY_OPTIONS: list[ShoppingFrequencyOption] = [
    ShoppingFrequencyOption(value=ShoppingFrequency.EVERY_OTHER_DAY, label="Every other day"),
    ShoppingFrequencyOption(value=ShoppingFrequency.TWICE_WEEKLY, label="Twice weekly"),
    ShoppingFrequencyOption(value=ShoppingFrequency.WEEKLY, label="Weekly"),
    ShoppingFrequencyOption(value=ShoppingFrequency.BIWEEKLY, label="Biweekly"),
    ShoppingFrequencyOption(value=ShoppingFrequency.MONTHLY, label="Monthly"),
]


class BudgetPreferences(SchemaModel):
    budget: float = Field(gt=0)
    currency: str = Field(min_length=1)
    budgetPeriod: BudgetPeriod
    mealsPerDay: int = Field(ge=1)
    timePerMeal: int = Field(ge=1)
    travelRadiusMinutes: int = Field(ge=0)
    travelMode: TravelMode
    servings: int = Field(ge=1)


class NutritionPreferences(SchemaModel):
    dietType: DietType
    allergies: list[str]
    exclusions: list[str]
    macroFocus: MacroFocus
    calorieGoal: float | None = None


class ProfilePreferences(SchemaModel):
    gender: Gender | None = None
    location: str | None = None
    preferredStores: list[str]
    shoppingFrequency: ShoppingFrequency


class OnboardingPreferences(BudgetPreferences, NutritionPreferences, ProfilePreferences):
    pass


defaultPreferences = OnboardingPreferences(
    budget=65,
    currency="CAD",
    budgetPeriod=BudgetPeriod.WEEKLY,
    mealsPerDay=2,
    timePerMeal=25,
    travelRadiusMinutes=15,
    travelMode=TravelMode.WALK,
    servings=1,
    dietType=DietType.NONE,
    allergies=[],
    exclusions=[],
    macroFocus=MacroFocus.BALANCED,
    calorieGoal=None,
    gender=None,
    location=None,
    preferredStores=[],
    shoppingFrequency=ShoppingFrequency.WEEKLY,
)


class StepDefinition(SchemaModel):
    id: StepId
    title: str
    description: str
