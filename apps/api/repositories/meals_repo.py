from __future__ import annotations

from pymongo.asynchronous.database import AsyncDatabase

from schemas import Meal


def _collection(db: AsyncDatabase):
    return db.get_collection("meals")


async def save_meal(db: AsyncDatabase, meal: Meal, raw: dict) -> None:
    doc = {"_id": meal.id, "meal": meal.model_dump(), **raw}
    await _collection(db).update_one({"_id": meal.id}, {"$set": doc}, upsert=True)


async def list_meals(db: AsyncDatabase, limit: int = 50) -> list[Meal]:
    docs = await _collection(db).find().limit(limit).to_list(limit)
    return [Meal.model_validate(doc["meal"]) for doc in docs if "meal" in doc]
