from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from schemas import PlanPayload


class PlanListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    plans: list[PlanPayload]
