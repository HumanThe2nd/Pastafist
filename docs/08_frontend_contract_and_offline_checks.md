# Frontend Contract And Offline Checks

## Verification Run (Latest)
- [x] `apps/api`: `uv run mypy .` passes.
- [x] `apps/api`: `uv run pytest -q` passes (`17 passed`).
- [x] `apps/web`: `npm run lint` passes.
- [x] `apps/web`: `npm run build` passes.

## Backend -> Frontend Contract Coverage
- [x] `POST /dashboard/bootstrap` consumed by frontend (`apps/web/src/utils/dashboardApi.ts`).
- [x] Plan payload fields used by adapter:
  `id`, `createdAt`, `preferences`, `mealSchedule`, `shoppingSchedule`.
- [x] Frontend `OnboardingPreferences` union values match backend literals.
- [x] Shopping list item rendering uses backend `priceLinks` and handles empty prices.
- [~] Full frontend usage of all backend capabilities is partial:
  frontend uses plan + pricing + schedule data, but does not expose ops metrics endpoint in UI.

## IndexedDB / Offline Persistence
- [x] Onboarding preferences persisted in IndexedDB (`onboarding.preferences`) with localStorage fallback.
- [x] Dashboard state persisted in IndexedDB.
- [x] Dashboard cache now keyed by preferences fingerprint (`dashboard.state:<preferences-json>`),
  so changing onboarding no longer reuses stale plans from prior preferences.
- [x] Cached dashboard data is rendered immediately, then refreshed from API in background.
- [x] API refresh failure now preserves cached data and shows a visible warning banner.
- [x] No-cache + API failure path handled safely (empty dashboard state + warning).

## Frontend Hardening Added
- [x] Preferences are sanitized before save/submit to backend contract shape.
- [x] `ApiError` typing fixed for strict `exactOptionalPropertyTypes`.
- [x] Hook lint issues in onboarding fixed without disabling rules.

## Highest Priority Remaining Tasks
- [ ] Add route-level frontend integration test for bootstrap flow (component + mocked API).
- [ ] Surface `/ops/metrics` in an internal admin panel to monitor scrape health from UI.
- [ ] Add user-facing stale-data badge when dashboard data comes from fallback cache.
