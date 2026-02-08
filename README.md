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

## Local dev (no Docker)

- Web: `cd apps/web && npm install && npm run dev -- --host 0.0.0.0 --port 5173`
- API: `cd apps/api && uv sync && uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000`
