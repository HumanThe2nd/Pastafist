from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from schemas import Meal


@dataclass(frozen=True)
class ScrapedMeal:
    meal: Meal
    ingredients_raw: list[str]
    nutrition: dict[str, Any] | None
    source_url: str
    image_url: str | None = None
