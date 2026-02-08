from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Sequence

from openai import AsyncOpenAI
from openai.types.chat import ChatCompletionMessageParam

from schemas import Meal, OnboardingPreferences

logger = logging.getLogger(__name__)


def _strip_json_fence(content: str) -> str:
    text = content.strip()
    if not text.startswith("```"):
        return text

    lines = text.splitlines()
    if lines:
        lines = lines[1:]
    if lines and lines[-1].strip() == "```":
        lines = lines[:-1]
    return "\n".join(lines).strip()


class LLMPlanner:
    def __init__(self, model: str | None = None, api_key: str | None = None) -> None:
        api_key = api_key or os.getenv("OPENAI_API_KEY") or os.getenv("GROQ_API_KEY")
        self.timeout_sec = max(float(os.getenv("LLM_TIMEOUT_SEC", "8")), 0.1)
        self.max_retries = max(int(os.getenv("LLM_MAX_RETRIES", "0")), 0)
        self.enabled = os.getenv("PLANNER_ENABLE_LLM", "true").lower() == "true"
        self.client: AsyncOpenAI | None
        configured_base_url = os.getenv("OPENAI_BASE_URL") or os.getenv("LLM_BASE_URL")
        is_groq_key = bool(api_key and api_key.startswith("gsk_"))
        if is_groq_key:
            configured_base_url = configured_base_url or os.getenv("GROQ_BASE_URL") or "https://api.groq.com/openai/v1"
            self.model = model or os.getenv("GROQ_MODEL") or os.getenv("OPENAI_MODEL") or "llama-3.1-8b-instant"
        else:
            self.model = model or os.getenv("OPENAI_MODEL") or "gpt-4o-mini"
        if not api_key or not self.enabled:
            self.client = None
            return
        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url=configured_base_url,
            timeout=self.timeout_sec,
            max_retries=self.max_retries,
        )

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
            logger.warning(
                "llm_request_start model=%s candidates=%s limit=%s timeout_sec=%.1f",
                self.model,
                len(candidates),
                limit,
                self.timeout_sec,
            )
            response_coro = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
            )
            resp = await asyncio.wait_for(response_coro, timeout=self.timeout_sec)
            content = resp.choices[0].message.content or ""
            data = json.loads(_strip_json_fence(content))
            ids: list[object] | None = None
            if isinstance(data, list):
                ids = data
            elif isinstance(data, dict):
                candidate_ids = data.get("meal_ids") or data.get("meals") or data.get("ids")
                if isinstance(candidate_ids, list):
                    ids = candidate_ids
            if ids is None:
                raise ValueError("LLM did not return list of ids")
            logger.warning("llm_request_ok model=%s selected=%s", self.model, len(ids))
            return [str(x) for x in ids][:limit]
        except Exception as exc:
            logger.warning("llm_request_fallback reason=%s", exc.__class__.__name__)
            # Never block plan generation on LLM availability.
            return [m.id for m in candidates[:limit]]
