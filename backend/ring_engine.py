"""
backend/ring_engine.py

The core logic layer. Bridges a user message + ring identity into an
actual Ollama completion, managing conversation history along the way.

This module knows about:
  - Ring configs  (via config.py)
  - Conversation history  (via ConversationManager)
  - The Ollama streaming API  (via ollama_client.py)

It does NOT know about WebSockets. It communicates purely through
the on_token callback, keeping it fully testable in isolation.
"""

import sys
from typing import Callable, Awaitable

from backend import config
from backend import ollama_client
from backend.conversation import ConversationManager


async def process_message(
    ring_id: str,
    user_message: str,
    conversation_manager: ConversationManager,
    on_token: Callable[[str | None], Awaitable[None]],
) -> str:
    """
    Process a user message through the specified ring's personality.

    Steps
    -----
    1. Fetch the ring's config (model, temperature, system_prompt, etc.)
    2. Build the full messages list:
           [system_prompt] + [conversation history] + [new user message]
    3. Record the user message in conversation history
    4. Stream the completion via ollama_client, forwarding each token
       to on_token as it arrives
    5. Record the completed assistant response in conversation history
    6. Return the full response string

    Parameters
    ----------
    ring_id              : One of the 10 ring IDs (e.g. "ars_goetia")
    user_message         : The raw text from the user
    conversation_manager : Session-scoped history store
    on_token             : Async callback. Receives each token string, or
                           None to signal a failure mid-stream.

    Returns
    -------
    Full assistant response string, or "" on failure.
    """

    # ── 1. Fetch ring config ──────────────────────────────────────────────────
    try:
        ring_cfg = config.get_ring_config(ring_id)
    except KeyError as exc:
        print(f"[ring_engine] {exc}", file=sys.stderr)
        await on_token(None)
        return ""

    model         = ring_cfg["model"]
    temperature   = ring_cfg["temperature"]
    top_p         = ring_cfg["top_p"]
    top_k         = ring_cfg["top_k"]
    system_prompt = ring_cfg["system_prompt"]

    # ── 2. Build the messages list ────────────────────────────────────────────
    # System prompt is always injected fresh — never stored in history.
    messages: list[dict] = [
        {"role": "system", "content": system_prompt}
    ]

    # Append existing conversation history for this ring
    history = conversation_manager.get_history(ring_id)
    messages.extend(history)

    # Append the new user message
    messages.append({"role": "user", "content": user_message})

    # ── 3. Record user message in history (before streaming starts) ───────────
    conversation_manager.add_message(ring_id, "user", user_message)

    # ── 4. Stream the completion ──────────────────────────────────────────────
    full_response = await ollama_client.stream_completion(
        model=model,
        messages=messages,
        temperature=temperature,
        top_p=top_p,
        top_k=top_k,
        on_token=on_token,
    )

    # ── 5. Record the assistant response in history ───────────────────────────
    if full_response:
        conversation_manager.add_message(ring_id, "assistant", full_response)
    else:
        # Stream failed — remove the user message we just added to keep
        # history consistent (don't leave an orphaned user turn).
        conversation_manager.clear(ring_id)
        print(
            f"[ring_engine] Stream failed for ring '{ring_id}'. History cleared.",
            file=sys.stderr,
        )

    # ── 6. Return full response ───────────────────────────────────────────────
    return full_response
