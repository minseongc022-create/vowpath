"""Multi-provider LLM client — local Ollama first (free), then cheap cloud APIs."""

from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import dataclass
from typing import Any

import httpx

logger = logging.getLogger("oracle.llm")


@dataclass
class LLMResponse:
    text: str
    provider: str
    model: str
    latency_ms: int
    ok: bool = True
    error: str | None = None


@dataclass
class LLMStatus:
    available: bool
    provider: str
    model: str
    mode_ko: str
    detail: str


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def configured_providers() -> list[dict[str, str]]:
    """Ordered provider cascade: free local → free/cheap cloud."""
    providers: list[dict[str, str]] = []

    ollama_host = _env("ORACLE_OLLAMA_HOST", "http://127.0.0.1:11434")
    # Prefer quality model for trading decisions (7B). Override with ORACLE_LLM_MODEL.
    ollama_model = _env("ORACLE_LLM_MODEL", "qwen2.5:7b-instruct")
    providers.append(
        {
            "name": "ollama",
            "base_url": f"{ollama_host.rstrip('/')}/v1",
            "api_key": "ollama",
            "model": ollama_model,
            "kind": "openai",
        }
    )

    if _env("GROQ_API_KEY"):
        providers.append(
            {
                "name": "groq",
                "base_url": "https://api.groq.com/openai/v1",
                "api_key": _env("GROQ_API_KEY"),
                "model": _env("GROQ_MODEL", "llama-3.3-70b-versatile"),
                "kind": "openai",
            }
        )

    if _env("GEMINI_API_KEY") or _env("GOOGLE_API_KEY"):
        key = _env("GEMINI_API_KEY") or _env("GOOGLE_API_KEY")
        model = _env("GEMINI_MODEL", "gemini-2.0-flash")
        providers.append(
            {
                "name": "gemini",
                "base_url": (
                    "https://generativelanguage.googleapis.com/v1beta/openai"
                ),
                "api_key": key,
                "model": model,
                "kind": "openai",
            }
        )

    if _env("OPENROUTER_API_KEY"):
        providers.append(
            {
                "name": "openrouter",
                "base_url": "https://openrouter.ai/api/v1",
                "api_key": _env("OPENROUTER_API_KEY"),
                "model": _env("OPENROUTER_MODEL", "openrouter/free"),
                "kind": "openai",
            }
        )

    if _env("OPENAI_API_KEY"):
        providers.append(
            {
                "name": "openai",
                "base_url": _env("OPENAI_BASE_URL", "https://api.openai.com/v1"),
                "api_key": _env("OPENAI_API_KEY"),
                "model": _env("OPENAI_MODEL", "gpt-4.1-mini"),
                "kind": "openai",
            }
        )

    # Prefer cloud free/fast if ORACLE_LLM_PROVIDER set
    prefer = _env("ORACLE_LLM_PROVIDER").lower()
    if prefer:
        providers.sort(key=lambda p: 0 if p["name"] == prefer else 1)
    return providers


def probe_status() -> LLMStatus:
    for p in configured_providers():
        try:
            if p["name"] == "ollama":
                host = _env("ORACLE_OLLAMA_HOST", "http://127.0.0.1:11434").rstrip("/")
                with httpx.Client(trust_env=False, timeout=3.0) as client:
                    r = client.get(f"{host}/api/tags")
                    if r.status_code != 200:
                        continue
                    models = [m.get("name", "") for m in r.json().get("models", [])]
                    want = p["model"]
                    if not any(want in m or m.startswith(want.split(":")[0]) for m in models):
                        # still try — ollama may pull on demand
                        pass
                return LLMStatus(
                    True,
                    "ollama",
                    p["model"],
                    "ORACLE PRIME · 로컬 최고급 AI",
                    f"모델 {p['model']} · 이중검증 · 월 ₩0",
                )
            # lightweight models list / noop for cloud
            return LLMStatus(
                True,
                p["name"],
                p["model"],
                f"클라우드 AI ({p['name']})",
                f"모델 {p['model']}",
            )
        except Exception as exc:
            logger.debug("provider %s unavailable: %s", p["name"], exc)
            continue
    return LLMStatus(False, "none", "", "AI 두뇌 대기", "Ollama/클라우드 키 없음")


def chat(
    messages: list[dict[str, str]],
    *,
    temperature: float = 0.15,
    max_tokens: int = 1200,
    json_mode: bool = True,
) -> LLMResponse:
    last_err = "no providers"
    for p in configured_providers():
        t0 = time.perf_counter()
        try:
            if p["name"] == "ollama":
                # Native Ollama chat is more reliable for format=json
                host = _env("ORACLE_OLLAMA_HOST", "http://127.0.0.1:11434").rstrip("/")
                payload: dict[str, Any] = {
                    "model": p["model"],
                    "messages": messages,
                    "stream": False,
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens,
                    },
                }
                if json_mode:
                    payload["format"] = "json"
                with httpx.Client(trust_env=False, timeout=180.0) as client:
                    r = client.post(f"{host}/api/chat", json=payload)
                    r.raise_for_status()
                    data = r.json()
                    text = (data.get("message") or {}).get("content") or ""
                ms = int((time.perf_counter() - t0) * 1000)
                if text.strip():
                    return LLMResponse(text.strip(), p["name"], p["model"], ms, True)
                last_err = "empty ollama response"
                continue

            headers = {
                "Authorization": f"Bearer {p['api_key']}",
                "Content-Type": "application/json",
            }
            if p["name"] == "openrouter":
                headers["HTTP-Referer"] = "https://github.com/project-oracle"
                headers["X-Title"] = "Project Oracle"
            body: dict[str, Any] = {
                "model": p["model"],
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            if json_mode:
                body["response_format"] = {"type": "json_object"}
            with httpx.Client(trust_env=False, timeout=90.0) as client:
                r = client.post(f"{p['base_url']}/chat/completions", headers=headers, json=body)
                r.raise_for_status()
                data = r.json()
                text = data["choices"][0]["message"]["content"]
            ms = int((time.perf_counter() - t0) * 1000)
            return LLMResponse(text.strip(), p["name"], p["model"], ms, True)
        except Exception as exc:
            last_err = str(exc)
            logger.warning("LLM provider %s failed: %s", p["name"], exc)
            continue
    return LLMResponse("", "none", "", 0, False, last_err)


def parse_json_object(text: str) -> dict[str, Any] | None:
    text = text.strip()
    if not text:
        return None
    try:
        data = json.loads(text)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            try:
                data = json.loads(text[start : end + 1])
                return data if isinstance(data, dict) else None
            except json.JSONDecodeError:
                return None
    return None
