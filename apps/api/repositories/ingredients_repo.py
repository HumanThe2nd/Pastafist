from __future__ import annotations

from typing import Iterable

from pymongo.asynchronous.database import AsyncDatabase

from schemas import Ingredient


def _collection(db: AsyncDatabase):
    return db.get_collection("ingredients")


async def upsert_many(db: AsyncDatabase, ingredients: Iterable[Ingredient]) -> None:
    col = _collection(db)
    for ing in ingredients:
        await col.update_one({"id": ing.id}, {"$set": ing.model_dump()}, upsert=True)


async def find_by_ids(db: AsyncDatabase, ids: list[str]) -> list[Ingredient]:
    col = _collection(db)
    docs = await col.find({"id": {"$in": ids}}).to_list(len(ids))
    return [Ingredient.model_validate({k: v for k, v in doc.items() if k != "_id"}) for doc in docs]
