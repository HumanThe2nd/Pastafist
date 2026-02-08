# Pastafist
 Monorepo

## Quick start

- Docker: `docker compose up --build`
- Web: http://localhost:5173
- API: http://localhost:8000

## Docker dev (hot reload)

- First run: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build`
- Next runs: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up`
- Code changes in `apps/api` and `apps/web` live-reload without rebuilding.

## LLM provider

- API reads `apps/api/.env` for LLM settings.
- Groq keys (`gsk_...`) are supported via OpenAI-compatible API:
  - `GROQ_API_KEY`
  - `GROQ_MODEL` (example: `llama-3.1-8b-instant`)

## Local dev (no Docker)

- Web: `cd apps/web && npm install && npm run dev -- --host 0.0.0.0 --port 5173`
- API: `cd apps/api && uv sync && uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000`
