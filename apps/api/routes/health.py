from __future__ import annotations

from typing import Any, cast

from fastapi import APIRouter, Query, Request
from pymongo.asynchronous.database import AsyncDatabase

router = APIRouter()


@router.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ops/metrics")
async def get_ops_metrics(
    request: Request,
    prefix: str | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
) -> dict[str, list[dict[str, Any]]]:
    db = cast(AsyncDatabase[Any], request.app.state.db)
    collection = db.get_collection("ops_metrics")
    query = {"_id": {"$regex": f"^{prefix}"}} if prefix else {}
    docs = await collection.find(query).sort("_id", 1).limit(limit).to_list(limit)
    metrics = [{"id": str(doc.get("_id")), **{k: v for k, v in doc.items() if k != "_id"}} for doc in docs]
    return {"metrics": metrics}
