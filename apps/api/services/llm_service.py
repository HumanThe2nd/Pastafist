from __future__ import annotations

import json
import os
from typing import Sequence

from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam

from schemas import Meal, OnboardingPreferences


class LLMPlanner:
    def __init__(self, model: str | None = None, api_key: str | None = None) -> None:
        api_key = api_key or os.getenv("OPENAI_API_KEY") or os.getenv("GROQ_API_KEY")
        self.client: AsyncOpenAI | None
        configured_base_url = os.getenv("OPENAI_BASE_URL") or os.getenv("LLM_BASE_URL")
        is_groq_key = bool(api_key and api_key.startswith("gsk_"))
        if is_groq_key:
            configured_base_url = configured_base_url or os.getenv("GROQ_BASE_URL") or "https://api.groq.com/openai/v1"
            self.model = model or os.getenv("GROQ_MODEL") or os.getenv("OPENAI_MODEL") or "llama-3.1-8b-instant"
        else:
            self.model = model or os.getenv("OPENAI_MODEL") or "gpt-4o-mini"
        if not api_key:
            self.client = None
            return
        self.client = AsyncOpenAI(api_key=api_key, base_url=configured_base_url)

    async def pick_meal_ids(self, candidates: Sequence[Meal], preferences: OnboardingPreferences, limit: int) -> list[str]:
        if self.client is None:
            # Fallback to deterministic top-k
            return [m.id for m in candidates[:limit]]

        meals_json = [
            {"id": m.id, "title": m.title, "ingredientIds": m.ingredientIds}
            for m in candidates
        ]
        system_msg = (
            "You select meals that fit user preferences. "
            "Return a JSON array of meal ids only."
        )
        user_msg = {
            "preferences": preferences.model_dump(),
            "candidates": meals_json,
            "limit": limit,
        }
        messages: list[ChatCompletionMessageParam] = [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": json.dumps(user_msg)},
        ]
        try:
            resp = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
            )
            content = resp.choices[0].message.content or ""
            data = json.loads(content)
            ids = data.get("meal_ids") or data.get("meals") or data.get("ids")
            if not isinstance(ids, list):
                raise ValueError("LLM did not return list of ids")
            return [str(x) for x in ids][:limit]
        except Exception:
            # Never block plan generation on LLM availability.
            return [m.id for m in candidates[:limit]]
