from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from pymongo.asynchronous.database import AsyncDatabase

from schemas import OnboardingPreferences


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


async def save_latest_preferences(db: AsyncDatabase, preferences: OnboardingPreferences) -> OnboardingPreferences:
    collection = db.get_collection("preferences")
    latest = await collection.find().sort("updatedAt", -1).limit(1).to_list(1)
    now = utc_now()
    payload = preferences.model_dump()
    if not latest:
        await collection.insert_one({"payload": payload, "updatedAt": now})
        return preferences

    latest_doc = latest[0]
    await collection.update_one(
        {"_id": latest_doc["_id"]},
        {"$set": {"payload": payload, "updatedAt": now}},
    )
    return preferences


async def get_latest_preferences_or_404(db: AsyncDatabase) -> OnboardingPreferences:
    collection = db.get_collection("preferences")
    latest = await collection.find().sort("updatedAt", -1).limit(1).to_list(1)
    if not latest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No saved onboarding preferences",
        )
    payload = latest[0].get("payload")
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Saved preferences payload is missing",
        )
    return OnboardingPreferences.model_validate(payload)
