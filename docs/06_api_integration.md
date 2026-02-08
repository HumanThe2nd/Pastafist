# API Integration Plan

## Existing Endpoints
- [x] /preferences
- [x] /plans/generate
- [x] /plans
- [x] /plans/latest
- [x] /dashboard/bootstrap

## Required Service Modules
- [x] services/planner_service.py (plan generation, diet/allergy filters, pricing enrichment, budget check, optional LLM order)
- [x] repositories/ingredients_repo.py
- [x] repositories/meals_repo.py
- [x] services/matching_service.py
- [x] services/pricing_service.py
- [x] services/llm_service.py (OpenAI-backed ordering with deterministic fallback)
- [x] jobs/scrape_jobs.py

## /plans/generate Flow
1. Save preferences.
2. Pull candidate meals.
3. Build plan with planner and LLM assistance.
4. Match ingredients to store results (priceLinks).
5. Compute shopping list and cost.
6. Store and return PlanPayload.

## /dashboard/bootstrap Flow
- If a plan exists, return it.
- Otherwise call the same flow as /plans/generate.

## New Endpoints To Consider
- /meals/search
- /ingredients/search
- /plans/{id}/refresh

## Validation Rules
- Always validate stored plans with PlanPayload.
- Always validate preferences with OnboardingPreferences.
- Reject unknown ingredient references.

## Background Jobs
- [ ] Nightly store scraping for common queries.
- [ ] Daily meal refresh for top meals.
- [ ] Weekly nutrition cache refresh.
