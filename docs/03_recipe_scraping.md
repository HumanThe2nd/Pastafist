# Meal Ingestion (Recipe Sites)

## Goals
- [x] Build a recipe-site driver that emits `Meal` objects (id, title, ingredientIds) plus raw ingredient strings.
- [~] Extract nutrition when available; estimate when missing (captured when present; estimation pending).
- [~] Normalize ingredients for matching to store products (name-based normalize/live ensure; richer matching pending).

## Target Source
- allrecipes.com — rich JSON-LD, broad coverage, consistent ingredient lists.

### Allrecipes specifics
- JSON-LD: `script[type="application/ld+json"]` with `@type == "Recipe"`; keys: `name`, `recipeIngredient` (list[str]), `recipeInstructions` (can be list of objects with `text`), `image`, `recipeYield`, `nutrition` (`calories`, `proteinContent`, `carbohydrateContent`, `fatContent`).
- Fallback selectors (when JSON-LD partial):
  - title: `h1[data-testid="recipe-title"]`
  - ingredients: `ul[data-testid="ingredients"] li` or `.ingredients-item`
  - steps: `ol[data-testid="instructions"] li` or `.instructions-section li`
  - servings: `div[data-testid="recipe-servings"] input[value]` or `#recipe-adjust-servings`
  - image: `img[data-testid="lead-image"]` or first `img` inside `figure[data-testid="image"]`
  - nutrition fallback: `div.partial.recipe-nutrition-section` text parse
- Build `meal_id` as stable hash of source + recipe URL.

### Images
- Prefer JSON-LD `image` array/string; fall back to lead image selector above.
- Downloading is optional; store the absolute URL in `Meal.imageUrl`.
- If multiple sizes are present, pick the first URL containing `/960x0/` or the highest-resolution `srcset` entry.

## Driver Structure
- Create a `recipes_lib` module parallel to `scraper_lib`.
- Base interface: `fetch_meals(query) -> list[Meal]` plus raw ingredient strings, `get_meal(meal_id)`.
- Each recipe source gets its own backend class (one per domain above).

## Extraction Strategy
1. Prefer JSON-LD with @type Recipe (all listed sites expose this).
2. If JSON-LD is missing or partial, fall back to HTML selectors (title: h1; ingredients: `.ingredient` or `li` under `ingredients`; steps: `ol li` under `instructions`).
3. Parse ingredient strings into name, quantity, unit; keep raw strings.
4. Extract nutrition when available on the page (common keys: calories, protein, fat, carbs).

## Validation
- Validate into `Meal` for id/title/ingredientIds.
- Reject records missing title or ingredient list.
- Tag diet/allergens from ingredients.

## Caching
- Store raw recipe payloads + parsed meal in MongoDB (meals collection) with scraped_at.
- Use scrape_cache for query-level caching (keyed by domain + query).
- Refresh stale meals on a rolling schedule.

## Rate Limiting & Hygiene
- Max 1 request/sec per domain, small random jitter.
- Respect robots.txt and back off on 429/403; serve cached data when blocked.
- Use a descriptive user agent and avoid fetching images.

## Recipe Site Onboarding Checklist
- Verify allowed scraping and robots rules.
- Add selectors for title, image, ingredients, steps, nutrition.
- Add unit tests with saved HTML fixtures.
- Confirm rate limiting and pagination.

## Output Fields (stored on meal doc)
- title, url, image_url
- servings (if present)
- ingredients_raw (list[str])
- ingredients_parsed (name, quantity, unit) for mapping to `Ingredient` ids
- nutrition (calories/protein/carbs/fat) when available or estimated
- diet_tags
- scraped_at
