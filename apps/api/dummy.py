from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from schemas.onboarding import OnboardingPreferences
from schemas.plan import (
    Ingredient,
    IngredientPriceLink,
    IngredientQuantity,
    Meal,
    PlanPayload,
    Quantity,
    ShoppingList,
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def q(amount: float, unit: str) -> Quantity:
    return Quantity(amount=amount, unit=unit)


def iq(ingredient: Ingredient, amount: float, unit: str) -> IngredientQuantity:
    return IngredientQuantity(ingredient=ingredient.model_copy(deep=True), quantity=q(amount, unit))


def link(price: float, buy_url: str) -> IngredientPriceLink:
    return IngredientPriceLink(price=price, buyUrl=buy_url)


INGREDIENTS: list[Ingredient] = [
    Ingredient(
        id="chicken",
        name="Chicken thighs",
        imageUrl="https://images.example/chicken.jpg",
        priceLinks=[
            link(8.99, "https://metro.example/chicken"),
            link(11.40, "https://costco.example/chicken"),
        ],
    ),
    Ingredient(
        id="tortillas",
        name="Tortillas",
        imageUrl="https://images.example/tortillas.jpg",
        priceLinks=[
            link(2.49, "https://metro.example/tortillas"),
            link(2.79, "https://nofrills.example/tortillas"),
        ],
    ),
    Ingredient(
        id="spinach",
        name="Baby spinach",
        imageUrl="https://images.example/spinach.jpg",
        priceLinks=[
            link(2.20, "https://farmboy.example/spinach"),
            link(2.55, "https://loblaws.example/spinach"),
        ],
    ),
    Ingredient(
        id="tofu",
        name="Firm tofu",
        imageUrl="https://images.example/tofu.jpg",
        priceLinks=[
            link(2.99, "https://loblaws.example/tofu"),
            link(3.29, "https://farmboy.example/tofu"),
        ],
    ),
    Ingredient(
        id="rice",
        name="Rice",
        imageUrl="https://images.example/rice.jpg",
        priceLinks=[
            link(4.99, "https://walmart.example/rice"),
            link(17.99, "https://costco.example/rice"),
        ],
    ),
    Ingredient(
        id="salmon",
        name="Salmon fillet",
        imageUrl="https://images.example/salmon.jpg",
        priceLinks=[
            link(10.99, "https://metro.example/salmon"),
            link(18.99, "https://costco.example/salmon"),
        ],
    ),
    Ingredient(
        id="tomatoes",
        name="Cherry tomatoes",
        imageUrl="https://images.example/tomatoes.jpg",
        priceLinks=[
            link(3.49, "https://loblaws.example/tomatoes"),
            link(3.99, "https://walmart.example/tomatoes"),
        ],
    ),
    Ingredient(
        id="chickpeas",
        name="Chickpeas",
        imageUrl="https://images.example/chickpeas.jpg",
        priceLinks=[
            link(1.29, "https://farmboy.example/chickpeas"),
            link(1.38, "https://walmart.example/chickpeas"),
        ],
    ),
]
INGREDIENT_BY_ID: dict[str, Ingredient] = {ingredient.id: ingredient for ingredient in INGREDIENTS}

MEAL_TEMPLATES: list[tuple[str, list[tuple[str, Quantity]]]] = [
    ("Chicken wraps", [("chicken", q(600, "g")), ("tortillas", q(6, "count")), ("spinach", q(120, "g"))]),
    ("Miso tofu bowls", [("tofu", q(400, "g")), ("rice", q(300, "g")), ("spinach", q(100, "g"))]),
    ("Salmon rice bowl", [("salmon", q(400, "g")), ("rice", q(300, "g")), ("tomatoes", q(150, "g"))]),
    ("Chickpea pasta", [("chickpeas", q(2, "can")), ("tomatoes", q(200, "g")), ("spinach", q(100, "g"))]),
]


def build_meals_and_demands(
    preferences: OnboardingPreferences,
) -> tuple[list[tuple[Meal, date]], dict[date, dict[str, Quantity]]]:
    start = utc_now().date()
    multiplier = 1.0
    meal_schedule: list[tuple[Meal, date]] = []
    day_demands: dict[date, dict[str, Quantity]] = {}
    meal_index = 0

    for day_offset in range(7):
        current_day = start + timedelta(days=day_offset)
        day_bucket = day_demands.setdefault(current_day, {})
        slot_count = max(1, preferences.mealsPerDay)
        for _slot in range(slot_count):
            title, base_items = MEAL_TEMPLATES[meal_index % len(MEAL_TEMPLATES)]
            ingredient_ids = [ingredient_id for ingredient_id, _ in base_items]
            meal = Meal(
                id=f"meal-{meal_index + 1}",
                title=title,
                ingredientIds=ingredient_ids,
            )
            meal_schedule.append((meal, current_day))
            for ingredient_id, base_quantity in base_items:
                scaled_amount = round(base_quantity.amount * multiplier, 2)
                previous = day_bucket.get(ingredient_id)
                if previous is None:
                    day_bucket[ingredient_id] = q(scaled_amount, base_quantity.unit)
                else:
                    day_bucket[ingredient_id] = q(round(previous.amount + scaled_amount, 2), base_quantity.unit)
            meal_index += 1

    return meal_schedule, day_demands


def build_shopping(
    preferences: OnboardingPreferences,
    day_demands: dict[date, dict[str, Quantity]],
) -> list[tuple[ShoppingList, date]]:
    interval_days = max(1.0, preferences.shoppingFrequency)
    if not day_demands:
        return []

    all_days = sorted(day_demands)
    run_starts: list[date] = []
    cursor = all_days[0]
    while cursor <= all_days[-1]:
        run_starts.append(cursor)
        cursor = (datetime.combine(cursor, datetime.min.time()) + timedelta(days=interval_days)).date()

    shopping_schedule: list[tuple[ShoppingList, date]] = []
    for run_index, run_start in enumerate(run_starts):
        run_end = run_starts[run_index + 1] if run_index + 1 < len(run_starts) else all_days[-1] + timedelta(days=1)
        items_by_ingredient: dict[str, Quantity] = {}
        for day in all_days:
            if run_start <= day < run_end:
                for ingredient_id, quantity in day_demands[day].items():
                    previous = items_by_ingredient.get(ingredient_id)
                    if previous is None:
                        items_by_ingredient[ingredient_id] = q(quantity.amount, quantity.unit)
                    else:
                        items_by_ingredient[ingredient_id] = q(round(previous.amount + quantity.amount, 2), quantity.unit)

        if items_by_ingredient:
            items = [
                iq(
                    INGREDIENT_BY_ID[ingredient_id],
                    items_by_ingredient[ingredient_id].amount,
                    items_by_ingredient[ingredient_id].unit,
                )
                for ingredient_id in sorted(items_by_ingredient)
            ]
            shopping_list = ShoppingList(id=f"list-{run_index + 1}", items=items)
            shopping_schedule.append((shopping_list, run_start))

    return shopping_schedule


def build_dummy_plan(preferences: OnboardingPreferences) -> PlanPayload:
    meal_schedule, day_demands = build_meals_and_demands(preferences)
    shopping_schedule = build_shopping(preferences, day_demands)
    return PlanPayload(
        id=f"plan-{utc_now().date().isoformat()}",
        createdAt=utc_now(),
        preferences=preferences.model_copy(deep=True),
        mealSchedule=meal_schedule,
        shoppingSchedule=shopping_schedule,
    )
