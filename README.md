# Pastafist
 Monorepo

## Quick start

- Docker: `docker compose up --build`
- Web: http://localhost:5173
- API: http://localhost:8000

## Local dev (no Docker)

- Web: `npm install` then `npm run dev:web`
- API: `pip install -r apps/api/requirements.txt` then `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
