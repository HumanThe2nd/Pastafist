from __future__ import annotations

from typing import Any, cast

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict
from pymongo.asynchronous.database import AsyncDatabase

from schemas import OnboardingPreferences, PlanPayload
from .plan_list_response import PlanListResponse
from services.planner_service import generate_plan_payload, plan_doc_to_payload
from services.preferences_service import get_latest_preferences_or_404, save_latest_preferences

router = APIRouter()


class DashboardBootstrapRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    preferences: OnboardingPreferences | None = None
    forceRefresh: bool = False


def get_db(request: Request) -> AsyncDatabase:
    return cast(AsyncDatabase[Any], request.app.state.db)


def parse_object_id(value: str, *, label: str) -> ObjectId:
    try:
        return ObjectId(value)
    except (InvalidId, ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {label}: {value}",
        ) from exc


async def _create_and_store_plan(db: AsyncDatabase, preferences: OnboardingPreferences) -> PlanPayload:
    generated = await generate_plan_payload(db, preferences)
    plans = db.get_collection("plans")
    payload = generated.model_dump(exclude={"id"}, mode="json")
    result = await plans.insert_one(payload)
    payload["_id"] = result.inserted_id
    return plan_doc_to_payload(payload)


@router.post("/plans/generate", response_model=PlanPayload, status_code=status.HTTP_201_CREATED)
async def post_generate_plan(preferences: OnboardingPreferences, db: AsyncDatabase = Depends(get_db)) -> PlanPayload:
    await save_latest_preferences(db, preferences)
    return await _create_and_store_plan(db, preferences)


@router.post("/dashboard/bootstrap", response_model=PlanPayload)
async def dashboard_bootstrap(request: DashboardBootstrapRequest, db: AsyncDatabase = Depends(get_db)) -> PlanPayload:
    bootstrap_preferences: OnboardingPreferences | None = request.preferences

    if request.preferences is not None:
        preferences = await save_latest_preferences(db, request.preferences)
        bootstrap_preferences = preferences
        if request.forceRefresh:
            return await _create_and_store_plan(db, preferences)

    plans = db.get_collection("plans")
    latest_plan = await plans.find().sort("createdAt", -1).limit(1).to_list(1)
    if latest_plan:
        return plan_doc_to_payload(latest_plan[0])

    if bootstrap_preferences is None:
        bootstrap_preferences = await get_latest_preferences_or_404(db)

    return await _create_and_store_plan(db, bootstrap_preferences)


@router.get("/plans", response_model=PlanListResponse)
async def list_plans(limit: int = Query(default=20, ge=1, le=200), db: AsyncDatabase = Depends(get_db)) -> PlanListResponse:
    plans = db.get_collection("plans")
    docs = await plans.find().sort("createdAt", -1).limit(limit).to_list(limit)
    return PlanListResponse(plans=[plan_doc_to_payload(plan) for plan in docs])


@router.get("/plans/latest", response_model=PlanPayload)
async def get_latest_plan(db: AsyncDatabase = Depends(get_db)) -> PlanPayload:
    plans = db.get_collection("plans")
    latest = await plans.find().sort("createdAt", -1).limit(1).to_list(1)
    if not latest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No plans found")
    return plan_doc_to_payload(latest[0])


@router.get("/plans/{plan_id}", response_model=PlanPayload)
async def get_plan(plan_id: str, db: AsyncDatabase = Depends(get_db)) -> PlanPayload:
    plans = db.get_collection("plans")
    object_id = parse_object_id(plan_id, label="plan id")
    plan = await plans.find_one({"_id": object_id})
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Plan {plan_id} not found")
    return plan_doc_to_payload(plan)


@router.delete("/plans/{plan_id}", response_description="Delete a plan")
async def delete_plan(plan_id: str, db: AsyncDatabase = Depends(get_db)) -> Response:
    plans = db.get_collection("plans")
    object_id = parse_object_id(plan_id, label="plan id")
    result = await plans.delete_one({"_id": object_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Plan {plan_id} not found")

    return Response(status_code=status.HTTP_204_NO_CONTENT)
