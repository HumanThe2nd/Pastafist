from __future__ import annotations

from schemas import Ingredient, IngredientPriceLink

from .base import PlaywrightBackend


class FoodBasicsBackend(PlaywrightBackend):
    name = "foodbasics"
    base_url = "https://www.foodbasics.ca"

    async def fetch_ingredients(self, query: str) -> list[Ingredient]:
        search_url = f"{self.base_url}/search?searchTerm={query}"
        page = await self.new_page()
        items: list[Ingredient] = []
        try:
            await self.goto(page, search_url, wait_until="domcontentloaded")
            product_cards = page.locator("div.product-item")
            count = await product_cards.count()
            for idx in range(count):
                card = product_cards.nth(idx)
                name = await card.get_attribute("data-name")
                price_text = await card.get_attribute("data-price")
                link = await card.get_attribute("data-product-url")
                image = await card.get_attribute("data-image-src")
                if not name or not price_text:
                    continue
                try:
                    price_val = float(price_text)
                except ValueError:
                    continue
                price_links = [
                    IngredientPriceLink.model_validate({"price": price_val, "buyUrl": self.base_url + link})
                ] if link else [
                    IngredientPriceLink.model_validate({"price": price_val, "buyUrl": search_url})
                ]
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
