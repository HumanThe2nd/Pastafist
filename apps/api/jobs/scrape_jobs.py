from __future__ import annotations

import asyncio
from typing import Iterable

from pymongo.asynchronous.database import AsyncDatabase

from recipes_lib import AllrecipesBackend, RecipeClient
from scraper_lib.cache import ScrapeCache, utc_now


async def ingest_allrecipes(db: AsyncDatabase, *, queries: Iterable[str], per_query: int = 10) -> int:
    cache = ScrapeCache(db)
    inserted = 0
    async with AllrecipesBackend() as backend:
        client: RecipeClient = RecipeClient(backend=backend, cache=cache)
        meals_collection = db.get_collection("meals")
        for query in queries:
            meals = await client.fetch_meals(query, limit=per_query)
            for scraped in meals:
                doc = {
                    "_id": scraped.meal.id,
                    "meal": scraped.meal.model_dump(),
                    "ingredients_raw": scraped.ingredients_raw,
                    "nutrition": scraped.nutrition,
                    "source_url": scraped.source_url,
                    "image_url": scraped.image_url,
                    "scraped_at": utc_now(),
                }
                result = await meals_collection.update_one({"_id": scraped.meal.id}, {"$set": doc}, upsert=True)
                if result.upserted_id is not None:
                    inserted += 1
    return inserted


if __name__ == "__main__":  # pragma: no cover
    import os
    from pymongo import AsyncMongoClient

    mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    mongo_db = os.getenv("MONGODB_DB", "college")

    async def _run() -> None:
        client: AsyncMongoClient = AsyncMongoClient(mongo_uri)
        try:
            db = client.get_database(mongo_db)
            count = await ingest_allrecipes(db, queries=["chicken", "vegetarian", "pasta"], per_query=5)
            print(f"Inserted {count} meals")
        finally:
            await client.close()

    asyncio.run(_run())
