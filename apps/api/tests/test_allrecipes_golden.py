from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

from recipes_lib.backends.allrecipes import AllrecipesBackend


class FakeAllrecipesPage:
    def __init__(self, json_ld: str) -> None:
        self._json_ld = json_ld

    async def goto(self, _url: str, **_kwargs: object) -> None:
        return None

    async def eval_on_selector(self, _selector: str, _script: str) -> str:
        return self._json_ld

    async def close(self) -> None:
        return None


def test_allrecipes_json_ld_golden(monkeypatch: pytest.MonkeyPatch) -> None:
    fixture_path = Path(__file__).parent / "fixtures" / "allrecipes_recipe.json"
    json_ld = fixture_path.read_text(encoding="utf-8")

    backend = AllrecipesBackend()
    page = FakeAllrecipesPage(json_ld)

    async def fake_new_page() -> FakeAllrecipesPage:
        return page

    monkeypatch.setattr(backend, "new_page", fake_new_page)
    meal = asyncio.run(backend.get_meal("https://www.allrecipes.com/recipe/12345/sheet-pan-lemon-chicken/"))

    assert meal is not None
    assert meal.meal.title == "Sheet Pan Lemon Chicken"
    assert meal.source_url == "https://www.allrecipes.com/recipe/12345/sheet-pan-lemon-chicken/"
    assert meal.image_url == "https://images.media-allrecipes.com/userphotos/960x0/1234567.jpg"
    assert "1 lb chicken breast" in meal.ingredients_raw
