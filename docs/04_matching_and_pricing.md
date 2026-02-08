# Ingredient Matching And Pricing

## Goals
- [~] Match meal ingredients to store products (name-normalize + ensure stored; multi-store prices aggregated when available).
- [~] Group similar products and sort by price (multi-store prices deduped, top-5 cheapest kept; price-per-unit sorting using size parsed from name).
- [~] Produce a shopping list that respects budget and travel radius (budget check implemented; store lookup used to restrict pricing backends when matches are found).

## Normalization Pipeline
1. Lowercase and strip punctuation.
2. Remove quantities and units from ingredient strings.
3. Remove descriptors like "fresh", "chopped", "organic".
4. Map common aliases to the existing `Ingredient.id`.
5. Tokenize and store tokens for matching.

## Similarity Scoring
- Exact token match is highest priority.
- Fuzzy string match is second priority.
- Category match boosts score.
- Brand words reduce score.

## Grouping Algorithm (high fidelity)
- Normalize names: lowercase, strip punctuation, drop quantities/units and descriptors (“fresh”, “chopped”, “organic”, store brands), singularize nouns, sort tokens → `norm_key` (in-memory).
- If a scrape yields UPC/GTIN or store product code, group by that first; otherwise use `norm_key`.
- Merge candidates when token Jaccard ≥ 0.7 and fuzzy ratio ≥ 80; for cross-key merges require stricter thresholds (e.g., Jaccard ≥ 0.8 and fuzzy ≥ 88).
- Reject merges on conflicting tokens (e.g., “beef” vs “chicken”, “almond” vs “peanut”).
- Separate groups if price_per_unit differs by >5× to avoid bad substitutions.

## Grouping Rules
- Group by `Ingredient.id` (normalized name).
- Keep 5 to 10 cheapest products per group.

## Price Per Unit
- If size and unit are known, compute price_per_unit.
- If size is unknown, use price only and label as unknown unit.
- Prefer price_per_unit for sorting.

## Budget Enforcement
1. Estimate total cost using cheapest products per group.
2. If over budget, substitute cheaper recipes or reduce servings.
3. Recompute shopping list and verify constraints.

## Travel Radius
- Filter store locations by distance from user location.
- If store location is missing, allow but mark as low confidence.
- Prefer stores within radius when picking products.

## Output For Frontend
- For each ingredient, return grouped products sorted by price.
- Include unit sizes and price_per_unit.
- Provide a summary cost estimate.
