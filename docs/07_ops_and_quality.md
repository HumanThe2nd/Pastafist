# Ops And Quality

## Testing
- [x] Unit tests for parsers (size parsing).
- [x] Integration tests for each scraper backend (Metro, FoodBasics, Costco, Walmart).
- [x] Golden file tests for meal extraction (Allrecipes).
- [~] End to end test for /plans/generate (scrape -> match -> price -> budget -> plan).  
  Service-level flow tests are implemented in `apps/api/tests/test_planner_service.py`; route-level full-stack test is still pending.

## Monitoring
- [x] Log scrape failures with store and URL.
- [x] Track scrape latency and success rate.
- [x] Monitor cache hit rate and data freshness.

## Performance
- [x] Batch ingredient queries per store.
- [x] Cache by query and by ingredient id.
- [x] Avoid repeated LLM calls by caching plans.

## Compliance
- [~] Add a configurable user agent string (set in Playwright backend; needs per-store validation).
- [x] Implement backoff when blocked (retry wrapper on page.goto).
- [ ] Respect robots rules and site terms (manual review per store still needed).

## Security
- [x] Store API keys in environment variables (OPENAI_API_KEY expected).
- [x] Never log keys or full LLM prompts.

## Operational Runbook
- [x] If scraping fails, serve cached data and flag stale.
- [x] If LLM fails, use deterministic fallback.
- [x] If pricing data is missing, show partial lists.
