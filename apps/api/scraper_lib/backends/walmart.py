from __future__ import annotations

from schemas import Ingredient, IngredientPriceLink

from .base import PlaywrightBackend


class WalmartBackend(PlaywrightBackend):
    name = "walmart"
    base_url = "https://www.walmart.ca"

    async def fetch_ingredients(self, query: str) -> list[Ingredient]:
        search_url = f"{self.base_url}/search?q={query}"
        page = await self.new_page()
        items: list[Ingredient] = []
        try:
            await self.goto(page, search_url, wait_until="domcontentloaded")
            cards = page.locator("div.product div.css-1pndypt")
            count = await cards.count()
            for idx in range(count):
                card = cards.nth(idx)
                name = await card.get_attribute("data-automation-title")
                price_text = await card.get_attribute("data-automation-price-raw")
                link = await card.get_attribute("data-automation-product-link")
                image = await card.get_attribute("data-automation-image-src")
                if not name or not price_text:
                    continue
                try:
                    price_val = float(price_text)
                except ValueError:
                    continue
                buy_url = self.base_url + link if link else search_url
                price_links = [IngredientPriceLink.model_validate({"price": price_val, "buyUrl": buy_url})]
                items.append(
                    Ingredient(
                        id=name,
                        name=name,
                        imageUrl=image,
                        priceLinks=price_links,
                    )
                )
            return items
        finally:
            await page.close()

    async def get_ingredient_info(self, ingredient_id: str) -> Ingredient:
        results = await self.fetch_ingredients(ingredient_id)
        for item in results:
            if item.id == ingredient_id:
                return item
        raise ValueError(f"Ingredient not found: {ingredient_id}")
