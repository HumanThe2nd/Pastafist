from __future__ import annotations

import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase

from routes.health import router as health_router
from routes.plans import router as plans_router
from routes.preferences import router as preferences_router

MongoDoc = Any
DEFAULT_WEB_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
WEB_ORIGINS = [
    origin.strip()
    for origin in os.getenv("WEB_ORIGINS", DEFAULT_WEB_ORIGINS).split(",")
    if origin.strip()
]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    mongo_db = os.getenv("MONGODB_DB", "college")
    client: AsyncMongoClient[MongoDoc] = AsyncMongoClient(mongo_uri)
    database: AsyncDatabase[MongoDoc] = client.get_database(mongo_db)
    app.state.db = database
    try:
        yield
    finally:
        await client.close()


app = FastAPI(
    title="PastAfist API",
    summary="FastAPI backend for onboarding preferences and generated grocery plans.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=WEB_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(preferences_router)
app.include_router(plans_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
