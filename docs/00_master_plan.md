# PastAfist Reality Plan

## Goals
- Replace dummy plans with real meals, real ingredients, and real prices.
- Use onboarding preferences to drive meal selection, pricing, and schedules.
- Make everything the frontend displays backed by scraped data in MongoDB.

## Constraints
- Scraping must be respectful and rate limited.
- Data must be validated before storing or returning.
- The system must work if a data source is temporarily unavailable.

## Architecture Overview
- Store scrapers (Metro, Food Basics, Costco, Walmart) producing `Ingredient` entries with `priceLinks`.
- Meal ingestion from recipe sites mapped directly into the existing `Meal` schema (no extra recipe model).
- Normalization layer to map meal ingredient strings to `Ingredient` ids.
- Pricing layer to select cheapest matching `priceLinks` and compute totals.
- Planner layer that builds `PlanPayload` using onboarding preferences.
- API layer to expose plans, meals, ingredients, and preferences.

## Implementation Phases
1. [x] Collections for ingredients (with price links), meals, preferences, plans, and scrape cache.
2. [~] Grocery scraping backends per store with caching and retries (Metro active; others stubbed).
3. [x] Meal ingestion driver for recipe sites that outputs `Meal` + ingredient text (Allrecipes).
4. [~] Ingredient normalization, grouping, and pricing rules (basic name-normalize & store implemented; price-based grouping pending store data).
5. [~] Meal planning engine with LLM-assisted selection constrained to known meals (LLM ordering and deterministic fallback are live; nutrition scoring/estimation still pending).
6. [~] API integration and background jobs for scheduled refresh (endpoints use real scrape; ingest job exists but not scheduled).
7. [ ] Validation, monitoring, and performance tuning.

## Definition Of Done
- /plans/generate returns a real plan with priced ingredients.
- Preferences materially influence recipe selection and budget.
- Ingredient lists show grouped, price-sorted products.
- Data is scraped, cached, and refreshed on a schedule.
- Errors are logged and endpoints degrade gracefully.
