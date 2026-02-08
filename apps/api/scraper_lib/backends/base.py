from __future__ import annotations

import asyncio
import logging
import os
from abc import ABC, abstractmethod
from contextlib import AbstractAsyncContextManager
from types import TracebackType
from typing import Type

from playwright.async_api import Browser, BrowserContext, Page, Playwright, async_playwright

from schemas import Ingredient

logger = logging.getLogger(__name__)


class Backend(ABC):
    name: str

    @abstractmethod
    async def fetch_ingredients(self, query: str) -> list[Ingredient]:
        raise NotImplementedError

    @abstractmethod
    async def get_ingredient_info(self, ingredient_id: str) -> Ingredient:
        raise NotImplementedError


class PlaywrightBackend(Backend, AbstractAsyncContextManager["PlaywrightBackend"]):
    def __init__(self, *, headless: bool = True, timeout_ms: int = 30_000, user_agent: str | None = None) -> None:
        self._headless = headless
        self._timeout_ms = timeout_ms
        self._user_agent = user_agent or os.getenv("SCRAPER_USER_AGENT", "PastAfistScraper")
        self._pw: Playwright | None = None
        self._browser: Browser | None = None
        self._context: BrowserContext | None = None

    async def __aenter__(self) -> "PlaywrightBackend":
        await self._ensure_context()
        return self

    async def __aexit__(
        self,
        exc_type: Type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        await self.close()

    async def close(self) -> None:
        if self._context is not None:
            await self._context.close()
            self._context = None
        if self._browser is not None:
            await self._browser.close()
            self._browser = None
        if self._pw is not None:
            await self._pw.stop()
            self._pw = None

    async def new_page(self) -> Page:
        context = await self._ensure_context()
        page = await context.new_page()
        page.set_default_timeout(self._timeout_ms)
        return page

    async def _ensure_context(self) -> BrowserContext:
        if self._context is None:
            self._pw = await async_playwright().start()
            self._browser = await self._pw.firefox.launch(headless=self._headless)
            self._context = await self._browser.new_context(user_agent=self._user_agent)
        return self._context

    async def goto(self, page: Page, url: str, *, retries: int = 3, **kwargs) -> None:
        delay = 0.5
        for attempt in range(retries):
            try:
                await page.goto(url, **kwargs)
                return
            except Exception as exc:
                logger.warning(
                    "Scrape navigation failure backend=%s url=%s attempt=%d/%d error=%s",
                    self.name,
                    url,
                    attempt + 1,
                    retries,
                    exc.__class__.__name__,
                )
                if attempt == retries - 1:
                    raise
                await asyncio.sleep(delay)
                delay *= 2
