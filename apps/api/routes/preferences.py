from __future__ import annotations

from typing import Any, cast

from fastapi import APIRouter, Depends, Request
from pymongo.asynchronous.database import AsyncDatabase

from schemas import OnboardingPreferences

from services.preferences_service import get_latest_preferences_or_404, save_latest_preferences

router = APIRouter()


def get_db(request: Request) -> AsyncDatabase:
    return cast(AsyncDatabase[Any], request.app.state.db)


@router.get("/preferences", response_model=OnboardingPreferences)
async def get_preferences(db: AsyncDatabase = Depends(get_db)) -> OnboardingPreferences:
    return await get_latest_preferences_or_404(db)


@router.put("/preferences", response_model=OnboardingPreferences)
async def put_preferences(preferences: OnboardingPreferences, db: AsyncDatabase = Depends(get_db)) -> OnboardingPreferences:
    return await save_latest_preferences(db, preferences)
