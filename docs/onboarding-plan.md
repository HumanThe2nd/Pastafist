# Onboarding Plan (MVP)

## Goals
- Collect only what is needed to generate plans: budget, meal cadence, cooking time, diet, travel, location.
- Keep defaults prefilled so users can proceed quickly.
- Save locally by default (no login required).

## Flow (4 steps)
1. **Welcome**
   - Single CTA: `Start onboarding`.

2. **Constraints**
   - Weekly budget (`CAD` default).
   - Meals per day.
   - Cooking time per meal (minutes).
   - Travel radius (minutes).

3. **Diet**
   - Diet type (`none`, vegetarian, vegan, etc.).
   - Allergies (multi-select).
   - Calorie goal (optional).

4. **Stores**
   - Location.
   - Preferred stores (multi-select).
   - Local save note (informational only, no toggle).

## Defaults
- Budget: `65 CAD` per week
- Meals per day: `2`
- Cooking time per meal: `25` minutes
- Travel radius: `15` minutes
- Diet: `none`
- Allergies: none
- Servings: `1`
- Travel mode: `walk`

## Components (current)
- `Stepper`
- `Button`
- `InputField`
- `TagSelect`
- `OnboardingLayout`

## Data Model (matches `OnboardingPreferences`)
- `budget`
- `currency`
- `budgetPeriod`
- `mealsPerDay`
- `timePerMeal`
- `travelRadiusMinutes`
- `travelMode`
- `servings`
- `dietType`
- `allergies[]`
- `exclusions[]`
- `macroFocus`
- `calorieGoal?`
- `gender?`
- `location?`
- `preferredStores[]`

## Next Build
- Persist onboarding data locally (SQLite on client).
- Send preferences to server `POST /plans/generate`.
- Render plan result views (summary, meals, grocery list, store options).
