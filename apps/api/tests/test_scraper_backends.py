from __future__ import annotations

import asyncio
import re
from typing import Any

import pytest

from scraper_lib.backends.costco import CostcoBackend
from scraper_lib.backends.foodbasics import FoodBasicsBackend
from scraper_lib.backends.metro import MetroBackend
from scraper_lib.backends.walmart import WalmartBackend


class FakeCard:
    def __init__(self, attrs: dict[str, str | None]) -> None:
        self._attrs = attrs

    async def get_attribute(self, name: str) -> str | None:
        return self._attrs.get(name)


class FakeSimpleLocator:
    def __init__(self, cards: list[FakeCard]) -> None:
        self._cards = cards

    async def count(self) -> int:
        return len(self._cards)

    def nth(self, index: int) -> FakeCard:
        return self._cards[index]


class FakeSimplePage:
    def __init__(self, cards: list[FakeCard]) -> None:
        self._cards = cards

    def locator(self, _selector: str) -> FakeSimpleLocator:
        return FakeSimpleLocator(self._cards)

    async def close(self) -> None:
        return None


class FakeMetroImageLocator:
    def __init__(self, image_url: str | None) -> None:
        self._image_url = image_url

    async def evaluate(self, _script: str) -> str | None:
        return self._image_url


class FakeMetroProduct:
    def __init__(self, attrs: dict[str, str | None], image_url: str | None = None) -> None:
        self._attrs = attrs
        self._image_url = image_url

    async def get_attribute(self, name: str) -> str | None:
        return self._attrs.get(name)

    def locator(self, _selector: str) -> FakeMetroImageLocator:
        return FakeMetroImageLocator(self._image_url)


class FakeMetroCookieButton:
    async def is_visible(self) -> bool:
        return False

    async def click(self) -> None:
        return None


class FakeVisibleLabel:
    def __init__(self, visible: bool) -> None:
        self._visible = visible

    async def is_visible(self) -> bool:
        return self._visible


class FakeMetroProductsLocator:
    def __init__(self, products: list[FakeMetroProduct]) -> None:
        self._products = products

    async def count(self) -> int:
        return len(self._products)

    def nth(self, index: int) -> FakeMetroProduct:
        return self._products[index]


class FakeMetroPage:
    def __init__(self, pages: list[list[FakeMetroProduct]]) -> None:
        self._pages = pages
        self._page_index = 0
        self.url = "https://www.metro.ca"

    def set_page_number(self, page_number: int) -> None:
        self._page_index = max(min(page_number - 1, len(self._pages) - 1), 0)
        self.url = f"https://www.metro.ca/page/{page_number}"

    def locator(self, selector: str) -> Any:
        if selector == "#onetrust-accept-btn-handler":
            return FakeMetroCookieButton()
        if selector == ".default-product-tile.tile-product.item-addToCart":
            return FakeMetroProductsLocator(self._pages[self._page_index])
        raise AssertionError(f"Unexpected selector: {selector}")

    def get_by_text(self, _text: str) -> FakeVisibleLabel:
        return FakeVisibleLabel(visible=len(self._pages[self._page_index]) == 0)

    async def wait_for_timeout(self, _ms: int) -> None:
        return None

    async def close(self) -> None:
        return None


def test_foodbasics_backend_parser(monkeypatch: pytest.MonkeyPatch) -> None:
    backend = FoodBasicsBackend()
    page = FakeSimplePage(
        cards=[
            FakeCard(
                {
                    "data-name": "Milk 2 L",
                    "data-price": "5.49",
                    "data-product-url": "/en/milk",
                    "data-image-src": "https://img/milk.jpg",
                }
            )
        ]
    )

    async def fake_new_page() -> FakeSimplePage:
        return page

    async def fake_goto(_page: FakeSimplePage, _url: str, **_kwargs: object) -> None:
        return None

    monkeypatch.setattr(backend, "new_page", fake_new_page)
    monkeypatch.setattr(backend, "goto", fake_goto)
    items = asyncio.run(backend.fetch_ingredients("milk"))
    assert len(items) == 1
    assert items[0].name == "Milk 2 L"
    assert items[0].priceLinks[0].price == 5.49


def test_costco_backend_parser(monkeypatch: pytest.MonkeyPatch) -> None:
    backend = CostcoBackend()
    page = FakeSimplePage(
        cards=[
            FakeCard(
                {
                    "data-product-title": "Eggs 30 pack",
                    "data-price": "9.99",
                    "data-product-url": "/eggs",
                    "data-src": "https://img/eggs.jpg",
                }
            )
        ]
    )

    async def fake_new_page() -> FakeSimplePage:
        return page

    async def fake_goto(_page: FakeSimplePage, _url: str, **_kwargs: object) -> None:
        return None

    monkeypatch.setattr(backend, "new_page", fake_new_page)
    monkeypatch.setattr(backend, "goto", fake_goto)
    items = asyncio.run(backend.fetch_ingredients("eggs"))
    assert len(items) == 1
    assert items[0].name == "Eggs 30 pack"
    assert items[0].priceLinks[0].price == 9.99


def test_walmart_backend_parser(monkeypatch: pytest.MonkeyPatch) -> None:
    backend = WalmartBackend()
    page = FakeSimplePage(
        cards=[
            FakeCard(
                {
                    "data-automation-title": "Bananas 1 kg",
                    "data-automation-price-raw": "1.89",
                    "data-automation-product-link": "/bananas",
                    "data-automation-image-src": "https://img/banana.jpg",
                }
            )
        ]
    )

    async def fake_new_page() -> FakeSimplePage:
        return page

    async def fake_goto(_page: FakeSimplePage, _url: str, **_kwargs: object) -> None:
        return None

    monkeypatch.setattr(backend, "new_page", fake_new_page)
    monkeypatch.setattr(backend, "goto", fake_goto)
    items = asyncio.run(backend.fetch_ingredients("banana"))
    assert len(items) == 1
    assert items[0].name == "Bananas 1 kg"
    assert items[0].priceLinks[0].price == 1.89


def test_metro_backend_parser(monkeypatch: pytest.MonkeyPatch) -> None:
    backend = MetroBackend()
    page = FakeMetroPage(
        pages=[
            [
                FakeMetroProduct(
                    {
                        "data-product-name": "Rice 1kg",
                        "data-discount-price": "4.99",
                    },
                    image_url="https://img/rice.jpg",
                )
            ],
            [],
        ]
    )

    async def fake_new_page() -> FakeMetroPage:
        return page

    async def fake_goto(_page: FakeMetroPage, url: str, **_kwargs: object) -> None:
        match = re.search(r"value-pack-page-(\d+)", url)
        page_number = int(match.group(1)) if match else 1
        page.set_page_number(page_number)

    monkeypatch.setattr(backend, "new_page", fake_new_page)
    monkeypatch.setattr(backend, "goto", fake_goto)
    items = asyncio.run(backend.fetch_ingredients("rice"))
    assert len(items) == 1
    assert items[0].name == "Rice 1kg"
    assert items[0].priceLinks[0].price == 4.99
