# Data Models And Storage

## Core Collections
- [x] preferences
- [x] plans
- [x] meals (shape: `Meal`, plus raw_ingredients: list[str], optional nutrition dict)
- [x] ingredients (shape: `Ingredient`; priceLinks holds store/price URLs)
- [x] scrape_cache (already exists, keep raw store/recipe payloads)
- [ ] nutrition_cache (optional, for estimated macros)

## Plan Model (plans)
- createdAt: datetime
- preferences: OnboardingPreferences
- mealSchedule: list[{meal_id: str, date: date}]
- shoppingSchedule: list[{shopping_list_id: str, date: date}]
- costSummary: {estimated_total: float, per_day: float} | None

## Onboarding Preferences Used In Planning
- budget
- mealsPerDay
- travelRadiusMeters
- dietType
- allergies
- macroFocus
- location
- shoppingFrequency

## Indexes
- meals: source + source_id (unique)
- meals: diet_tags (if present)
- ingredients: id (normalized name) unique
- plans: createdAt
- preferences: updatedAt

## Storage Notes
- Keep raw scraped payloads only in scrape_cache for debugging.
- Every collection should include scraped_at or updatedAt timestamps.
- Do not return raw scraped data directly to the frontend.
