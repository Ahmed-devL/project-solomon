"""
backend/ollama_client.py

All HTTP communication with a locally running Ollama instance.
This is the ONLY file in the project that knows Ollama exists.
Swap this file to point at any other LLM API without touching anything else.

Ollama API reference:
  GET  http://localhost:11434          → health check
  GET  http://localhost:11434/api/tags → list installed models
  POST http://localhost:11434/api/chat → chat completion (streaming)
"""

import json
import sys
from typing import Callable, Awaitable

import httpx

# ── Constants ─────────────────────────────────────────────────────────────────
OLLAMA_BASE_URL = "http://localhost:11434"
CONNECT_TIMEOUT = 5.0    # seconds — fail fast if Ollama isn't running
READ_TIMEOUT    = 120.0  # seconds — generous for slow local models


# ── Health Check ──────────────────────────────────────────────────────────────

async def check_ollama_alive() -> bool:
    """
    Ping Ollama's root endpoint.
    Returns True if reachable, False for any network/connection error.
    Never raises.
    """
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(CONNECT_TIMEOUT)) as client:
            response = await client.get(OLLAMA_BASE_URL)
            return response.status_code == 200
    except Exception as exc:
        print(f"[ollama_client] Ollama not reachable: {exc}", file=sys.stderr)
        return False


# ── Model Discovery ───────────────────────────────────────────────────────────

async def list_models() -> list[str]:
    """
    Fetch the list of locally installed Ollama model names.
    Returns an empty list on any failure.
    """
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(CONNECT_TIMEOUT)) as client:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            response.raise_for_status()
            data = response.json()
            return [m["name"] for m in data.get("models", [])]
    except Exception as exc:
        print(f"[ollama_client] Failed to list models: {exc}", file=sys.stderr)
        return []


# ── Streaming Chat Completion ─────────────────────────────────────────────────

async def stream_completion(
    model: str,
    messages: list[dict],
    temperature: float,
    top_p: float,
    top_k: int,
    on_token: Callable[[str | None], Awaitable[None]],
) -> str:
    """
    Stream a chat completion from Ollama.

    Parameters
    ----------
    model       : Ollama model name, e.g. "qwen2.5:1.5b"
    messages    : OpenAI-compatible list of {"role": ..., "content": ...} dicts
    temperature : Sampling temperature
    top_p       : Nucleus sampling probability
    top_k       : Top-k sampling limit
    on_token    : Async callback called with each token string as it arrives.
                  Called with None to signal a failure or stream end.

    Returns
    -------
    Full concatenated response string, or empty string on failure.
    """
    payload = {
        "model": model,
        "messages": messages,
        "stream": True,
        "options": {
            "temperature": temperature,
            "top_p": top_p,
            "top_k": top_k,
        },
    }

    full_response = ""

    try:
        timeout = httpx.Timeout(connect=CONNECT_TIMEOUT, read=READ_TIMEOUT, write=10.0, pool=5.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream("POST", f"{OLLAMA_BASE_URL}/api/chat", json=payload) as response:
                response.raise_for_status()

                async for line in response.aiter_lines():
                    if not line.strip():
                        continue

                    try:
                        chunk = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    # Ollama streams {"message": {"content": "..."}, "done": false}
                    token = chunk.get("message", {}).get("content", "")
                    if token:
                        full_response += token
                        await on_token(token)

                    # When done:true arrives the stream is complete
                    if chunk.get("done", False):
                        break

    except httpx.ConnectError as exc:
        print(f"[ollama_client] Connection error during stream: {exc}", file=sys.stderr)
        await on_token(None)  # Signal failure to the caller
        return ""

    except httpx.TimeoutException as exc:
        print(f"[ollama_client] Timeout during stream: {exc}", file=sys.stderr)
        await on_token(None)
        return ""

    except Exception as exc:
        print(f"[ollama_client] Unexpected error during stream: {exc}", file=sys.stderr)
        await on_token(None)
        return ""

    return full_response
