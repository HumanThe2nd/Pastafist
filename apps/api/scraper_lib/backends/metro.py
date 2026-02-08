from __future__ import annotations

from schemas import Ingredient, IngredientPriceLink

from .base import PlaywrightBackend


class MetroBackend(PlaywrightBackend):
    name = "metro"
    base_url = "https://www.metro.ca"

    async def fetch_ingredients(self, query: str) -> list[Ingredient]:
        page = await self.new_page()
        try:
            items: list[Ingredient] = []
            page_number = 1
            while True:
                url = (
                    "https://www.metro.ca/en/online-grocery/themed-baskets/"
                    f"your-savings-start-here/value-pack-page-{page_number}"
                )
                await self.goto(page, url, wait_until="commit", timeout=30_000)

                cookie_button = page.locator("#onetrust-accept-btn-handler")
                try:
                    if await cookie_button.is_visible():
                        await cookie_button.click()
                except Exception:
                    pass

                await page.wait_for_timeout(3000)

                empty_message = page.get_by_text(
                    "We found 0 results that match the criteria you selected."
                )
                if await empty_message.is_visible():
                    break

                products = page.locator(".default-product-tile.tile-product.item-addToCart")
                count = await products.count()
                for idx in range(count):
                    product = products.nth(idx)
                    product_name = await product.get_attribute("data-product-name")
                    if not product_name:
                        continue

                    if query and query.lower() not in product_name.lower():
                        continue

                    discount_price = await product.get_attribute("data-discount-price")
                    image_url = None
                    try:
                        image_url = await product.locator(
                            "div.pt__visual a picture img"
                        ).evaluate("img => img.currentSrc || img.src || null")
                    except Exception:
                        image_url = None

                    price_links: list[IngredientPriceLink] = []
                    if discount_price:
                        try:
                            price_value = float(discount_price)
                            price_links.append(
                                IngredientPriceLink.model_validate(
                                    {"price": price_value, "buyUrl": page.url}
                                )
                            )
                        except ValueError:
                            pass

                    items.append(
                        Ingredient(
                            id=product_name,
                            name=product_name,
                            imageUrl=image_url,
                            priceLinks=price_links,
                        )
                    )

                page_number += 1

            return items
        finally:
            await page.close()

    async def get_ingredient_info(self, ingredient_id: str) -> Ingredient:
        items = await self.fetch_ingredients(query=ingredient_id)
        for item in items:
            if item.id == ingredient_id:
                return item
        raise ValueError(f"Ingredient not found: {ingredient_id}")
