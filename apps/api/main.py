from __future__ import annotations

import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from beanie import PydanticObjectId
from beanie.odm.utils.init import Initializer
from bson.errors import InvalidId
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict
from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase

from dummy import build_dummy_plan
from models import DOCUMENT_MODELS, PlanDocument, PreferencesDocument
from schemas import (
    OnboardingPreferences,
    PlanPayload,
)


class ApiModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class PlanListResponse(ApiModel):
    plans: list[PlanPayload]


class DashboardBootstrapRequest(ApiModel):
    preferences: OnboardingPreferences | None = None


MongoDoc = dict[str, object]
IS_DUMMY = True
DEFAULT_WEB_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
WEB_ORIGINS = [
    origin.strip()
    for origin in os.getenv("WEB_ORIGINS", DEFAULT_WEB_ORIGINS).split(",")
    if origin.strip()
]


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

app.add_middleware(
    CORSMiddleware,
    allow_origins=WEB_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
        mealSchedule=plan_doc.mealSchedule,
        shoppingSchedule=plan_doc.shoppingSchedule,
    )


async def generate_plan_payload(preferences: OnboardingPreferences) -> PlanPayload:
    if IS_DUMMY:
        return build_dummy_plan(preferences)

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Live plan generation is not implemented yet. Set IS_DUMMY = True for dummy mode.",
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


async def get_latest_preferences_or_404() -> OnboardingPreferences:
    latest = await PreferencesDocument.find_all().sort("-updatedAt").first_or_none()
    if latest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No saved onboarding preferences",
        )
    return latest.payload


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/preferences", response_model=OnboardingPreferences)
async def get_preferences() -> OnboardingPreferences:
    return await get_latest_preferences_or_404()


@app.put("/preferences", response_model=OnboardingPreferences)
async def put_preferences(preferences: OnboardingPreferences) -> OnboardingPreferences:
    return await save_latest_preferences(preferences)


@app.post("/plans/generate", response_model=PlanPayload, status_code=status.HTTP_201_CREATED)
async def post_generate_plan(preferences: OnboardingPreferences) -> PlanPayload:
    await save_latest_preferences(preferences)
    generated = await generate_plan_payload(preferences)

    plan_doc = PlanDocument(
        createdAt=generated.createdAt,
        preferences=generated.preferences,
        mealSchedule=generated.mealSchedule,
        shoppingSchedule=generated.shoppingSchedule,
    )
    await plan_doc.insert()

    return plan_doc_to_payload(plan_doc)


@app.post("/dashboard/bootstrap", response_model=PlanPayload)
async def dashboard_bootstrap(request: DashboardBootstrapRequest) -> PlanPayload:
    latest_plan = await PlanDocument.find_all().sort("-createdAt").first_or_none()
    if latest_plan is not None:
        return plan_doc_to_payload(latest_plan)

    if request.preferences is not None:
        preferences = await save_latest_preferences(request.preferences)
    else:
        preferences = await get_latest_preferences_or_404()

    generated = await generate_plan_payload(preferences)
    plan_doc = PlanDocument(
        createdAt=generated.createdAt,
        preferences=generated.preferences,
        mealSchedule=generated.mealSchedule,
        shoppingSchedule=generated.shoppingSchedule,
    )
    await plan_doc.insert()
    return plan_doc_to_payload(plan_doc)


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
