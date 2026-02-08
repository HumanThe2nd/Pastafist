from __future__ import annotations

import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Callable

from beanie import PydanticObjectId
from beanie.odm.utils.init import Initializer
from bson.errors import InvalidId
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict
from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase

from models import DOCUMENT_MODELS, PlanDocument, PreferencesDocument
from schemas import (
    GeneratePlanRequest,
    GeneratePlanResponse,
    OnboardingPreferences,
    PlanPayload,
    SHOPPING_FREQUENCY_OPTIONS,
    SHOPPING_INTERVAL_DAYS,
    ShoppingFrequency,
    ShoppingFrequencyOption,
    defaultPreferences,
)


class ApiModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class OnboardingMetaResponse(ApiModel):
    defaultPreferences: OnboardingPreferences
    shoppingFrequencyOptions: list[ShoppingFrequencyOption]
    shoppingIntervalDays: dict[ShoppingFrequency, float]


class PlanListResponse(ApiModel):
    plans: list[PlanPayload]


ScraperGenerateFn = Callable[
    [OnboardingPreferences],
    object,
]
MongoDoc = dict[str, object]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@asynccontextmanager
async def lifespan(_: FastAPI):
    mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    mongo_db = os.getenv("MONGODB_DB", "college")
    client: AsyncMongoClient[MongoDoc] = AsyncMongoClient(mongo_uri)
    database: AsyncDatabase[MongoDoc] = client.get_database(mongo_db)
    await Initializer(database=database, document_models=DOCUMENT_MODELS)
    try:
        yield
    finally:
        await client.close()


app = FastAPI(
    title="PastAfist API",
    summary="FastAPI backend for onboarding preferences and generated grocery plans.",
    lifespan=lifespan,
)


def parse_object_id(value: str, *, label: str) -> PydanticObjectId:
    try:
        return PydanticObjectId(value)
    except (InvalidId, ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {label}: {value}",
        ) from exc


def plan_doc_to_payload(plan_doc: PlanDocument) -> PlanPayload:
    if plan_doc.id is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Plan document is missing database id",
        )

    return PlanPayload(
        id=str(plan_doc.id),
        createdAt=plan_doc.createdAt,
        preferences=plan_doc.preferences,
        summary=plan_doc.summary,
        meals=plan_doc.meals,
        groceryList=plan_doc.groceryList,
        groceryRuns=plan_doc.groceryRuns,
        tripPlan=plan_doc.tripPlan,
    )

async def generate_plan_payload(preferences: OnboardingPreferences) -> PlanPayload:
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Scraper returned an unsupported plan payload shape",
    )


async def save_latest_preferences(preferences: OnboardingPreferences) -> OnboardingPreferences:
    latest = await PreferencesDocument.find_all().sort("-updatedAt").first_or_none()
    if latest is None:
        latest = PreferencesDocument(payload=preferences, updatedAt=utc_now())
        await latest.insert()
        return latest.payload

    latest.payload = preferences
    latest.updatedAt = utc_now()
    await latest.save()
    return latest.payload


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/onboarding/meta", response_model=OnboardingMetaResponse)
async def onboarding_meta() -> OnboardingMetaResponse:
    return OnboardingMetaResponse(
        defaultPreferences=defaultPreferences,
        shoppingFrequencyOptions=SHOPPING_FREQUENCY_OPTIONS,
        shoppingIntervalDays=SHOPPING_INTERVAL_DAYS,
    )


@app.get("/preferences", response_model=OnboardingPreferences)
async def get_preferences() -> OnboardingPreferences:
    latest = await PreferencesDocument.find_all().sort("-updatedAt").first_or_none()
    if latest is None:
        return defaultPreferences
    return latest.payload


@app.put("/preferences", response_model=OnboardingPreferences)
async def put_preferences(preferences: OnboardingPreferences) -> OnboardingPreferences:
    return await save_latest_preferences(preferences)


@app.post("/plans/generate", response_model=GeneratePlanResponse, status_code=status.HTTP_201_CREATED)
async def post_generate_plan(request: GeneratePlanRequest) -> GeneratePlanResponse:
    await save_latest_preferences(request.preferences)
    generated = await generate_plan_payload(request.preferences)

    plan_doc = PlanDocument(
        createdAt=generated.createdAt,
        preferences=generated.preferences,
        summary=generated.summary,
        meals=generated.meals,
        groceryList=generated.groceryList,
        groceryRuns=generated.groceryRuns,
        tripPlan=generated.tripPlan,
    )
    await plan_doc.insert()

    return GeneratePlanResponse(plan=plan_doc_to_payload(plan_doc))


@app.get("/plans", response_model=PlanListResponse)
async def list_plans(limit: int = Query(default=20, ge=1, le=200)) -> PlanListResponse:
    plans = await PlanDocument.find_all().sort("-createdAt").limit(limit).to_list()
    return PlanListResponse(plans=[plan_doc_to_payload(plan) for plan in plans])


@app.get("/plans/latest", response_model=PlanPayload)
async def get_latest_plan() -> PlanPayload:
    latest = await PlanDocument.find_all().sort("-createdAt").first_or_none()
    if latest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No plans found")
    return plan_doc_to_payload(latest)


@app.get("/plans/{plan_id}", response_model=PlanPayload)
async def get_plan(plan_id: str) -> PlanPayload:
    object_id = parse_object_id(plan_id, label="plan id")
    plan = await PlanDocument.get(object_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Plan {plan_id} not found")
    return plan_doc_to_payload(plan)


@app.delete("/plans/{plan_id}", response_description="Delete a plan")
async def delete_plan(plan_id: str) -> Response:
    object_id = parse_object_id(plan_id, label="plan id")
    plan = await PlanDocument.get(object_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Plan {plan_id} not found")

    await plan.delete()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
