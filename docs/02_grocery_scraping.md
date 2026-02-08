# Grocery Scraping Plan

## Goals
- Scrape product name, price, size, image, and URL.
- Normalize output into the existing `Ingredient` schema (price goes in `priceLinks`).
- Cache results to reduce load and protect against outages.

## Existing Structure
- scraper_lib/backends/base.py defines Backend and PlaywrightBackend.
- scraper_lib/backends/metro.py is a working example.
- scraper_lib/client.py and cache.py handle caching and freshness.

## New Backends
- [~] Metro backend (active, used for pricing enrichment).
- [~] Food Basics backend (implemented; needs validation against live site).
- [~] Costco backend (implemented; needs validation against live site).
- [~] Walmart backend (implemented; needs validation against live site).

## Implementation Steps
1. Identify the search or browse pages for each store.
2. Build a per-store parser that extracts:
   - product name
   - price
   - image URL
   - product URL
   - size and unit when visible
3. Normalize each result into `Ingredient` with `priceLinks`.
4. Use ScrapeCache to cache results per query.
5. Add rate limiting and retry with exponential backoff.
6. Record scrape failures with enough context for debugging.

## Food Basics Strategy
- Start with Playwright, similar to Metro.
- Reuse cookie handling and pagination logic.
- Use data attributes when possible to reduce DOM brittleness.

## Costco Strategy
- Expect more bot protection.
- Use Playwright with headless false during development.
- Implement a fallback path that uses cached data when blocked.

## Walmart Strategy
- Use search pages with query parameters.
- Parse product cards for price, size, and unit price.
- Deduplicate products by store_product_id.

## Data Quality Rules
- Reject items with missing name or price.
- Parse size from name when present (g/kg/ml/l/oz/lb) for price-per-unit sorting; leave unknown sizes null.
- Compute price_per_unit from size and price when size is parsed.
- Cache store lookups and note source (OSM Overpass).

## Scheduling
- Nightly full refresh for common ingredients.
- On-demand scrape when a query is missing or stale.
- Keep historical prices for future price trend features.
