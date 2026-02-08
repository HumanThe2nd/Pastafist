# Meal Planning And LLM Integration

## Goals
- [~] Build real meal plans from scraped meals and product pricing (meals via Allrecipes; Metro/multi-store pricing, price-per-unit pending).
- [~] Respect onboarding preferences and constraints (diet/allergy filters and budget check in place).
- [x] Use LLM output only after hard filters and validation (OpenAI installed; key required at runtime).

## Hard Filters From Preferences
- dietType: filter meals by tags and ingredient blacklist.
- allergies: remove any meal containing allergens.
- mealsPerDay: plan length and daily slot count.
- shoppingFrequency: plan horizon in days.
- budget: cap total shopping list cost.

## Nutrition Handling
- Use nutrition from meal scrape when present.
- If missing, estimate from ingredients using a nutrition dataset.
- Keep a nutrition_cache collection for estimates.

## Planner Flow
1. Fetch candidate meals for the plan horizon.
2. Filter by diet and allergies.
3. Score by macroFocus using nutrition.
4. Build a draft plan with variety constraints.
5. Match ingredients to products and compute cost.
6. If over budget, replan with cheaper meals.

## LLM Role
- Select and order meals from the candidate pool.
- Generate a short rationale and optional substitutions.
- Never invent ingredients or meals not in the candidate pool.

## LLM Prompt Inputs
- Candidate meals with nutrition and tags.
- User preferences and budget.
- Required output schema for a plan.

## Output Validation
- Validate LLM output against PlanPayload.
- Reject and retry if any meal id is unknown.
- Enforce diet and allergy constraints after validation.

## OpenAI API Usage (Example)
- Use the OpenAI SDK and set OPENAI_API_KEY in the environment.
- Request structured output with a JSON schema matching the plan.
- Keep model name configurable via an env var.

## Failure Modes
- If the LLM fails, fall back to deterministic selection.
- If nutrition is missing, use conservative estimates.
