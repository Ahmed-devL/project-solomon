"""
backend/ws_handlers.py

WebSocket message router and handler dispatcher.

Receives parsed JSON dicts from brain.py's message loop and dispatches
them to the correct handler based on the "event" field.

Supported events
----------------
  ring_selected      — Activate a ring; respond with its config
  user_message       — Run generation through ring_engine; stream tokens back
  abort_generation   — Set cancellation flag; halt current stream
  clear_history      — Wipe conversation history for a specific ring

Protocol (outbound events sent to the frontend)
-------
  { "event": "status",       "state": "idle" | "thinking" | "error" | "ollama_offline" }
  { "event": "ring_config",  "ring_id": "...", "config": { ... } }
  { "event": "token_stream", "token": "...", "done": false }
  { "event": "token_stream", "token": "",    "done": true  }
  { "event": "models",       "list": ["model1", ...] }
  { "event": "error",        "message": "..." }
"""

import json
import sys
from typing import Any

from backend import config
from backend import ollama_client
from backend import ring_engine
from backend.conversation import ConversationManager


# ── Session State ─────────────────────────────────────────────────────────────
# A simple dict that lives at module scope acts as per-handler session state.
# brain.py creates a fresh ConversationManager per connection, so state is
# naturally scoped to each WebSocket session without needing a class wrapper.

class _SessionState:
    """Mutable state for one WebSocket connection's lifetime."""

    def __init__(self) -> None:
        self.active_ring_id: str | None = None
        self.abort_requested: bool = False


# ── Public Entry Point ────────────────────────────────────────────────────────

async def handle_message(
    data: dict,
    websocket: Any,
    conversation_manager: ConversationManager,
    session: "_SessionState | None" = None,
) -> None:
    """
    Route an incoming parsed JSON message to the correct handler.

    Parameters
    ----------
    data                 : Parsed JSON dict from the WebSocket message
    websocket            : The active websockets connection object
    conversation_manager : Session-scoped ConversationManager
    session              : Mutable session state. brain.py creates one per
                           connection and passes it here on every call.
    """
    # brain.py passes session; allow None for backward compat in tests
    if session is None:
        session = _SessionState()

    event = data.get("event")

    try:
        if event == "ring_selected":
            await _handle_ring_selected(data, websocket, session)

        elif event == "user_message":
            await _handle_user_message(data, websocket, conversation_manager, session)

        elif event == "abort_generation":
            await _handle_abort(websocket, session)

        elif event == "clear_history":
            await _handle_clear_history(data, websocket, conversation_manager)

        else:
            await _send(websocket, {
                "event": "error",
                "message": f"Unknown event type: '{event}'"
            })

    except Exception as exc:
        # Top-level safety net — never let a handler crash the server
        print(f"[ws_handlers] Unhandled exception in event '{event}': {exc}", file=sys.stderr)
        try:
            await _send(websocket, {
                "event": "error",
                "message": "Internal server error. Check brain.py logs."
            })
        except Exception:
            pass  # WebSocket may already be closed; silently discard


# ── Handlers ──────────────────────────────────────────────────────────────────

async def _handle_ring_selected(
    data: dict,
    websocket: Any,
    session: _SessionState,
) -> None:
    """
    Store the selected ring and respond with its config.
    Also sends the list of installed Ollama models so the frontend
    can offer model overrides without an extra round-trip.
    """
    ring_id = data.get("ring_id", "")

    try:
        ring_cfg = config.get_ring_config(ring_id)
    except KeyError as exc:
        await _send(websocket, {"event": "error", "message": str(exc)})
        return

    session.active_ring_id = ring_id
    session.abort_requested = False  # Reset abort when switching rings

    # Send the ring's config to the frontend
    await _send(websocket, {
        "event": "ring_config",
        "ring_id": ring_id,
        "config": ring_cfg,
    })

    # Opportunistically send current model list
    models = await ollama_client.list_models()
    await _send(websocket, {"event": "models", "list": models})

    print(f"[ws_handlers] Ring selected: {ring_cfg['display_name']} ({ring_id})")


async def _handle_user_message(
    data: dict,
    websocket: Any,
    conversation_manager: ConversationManager,
    session: _SessionState,
) -> None:
    """
    Trigger a streaming generation through ring_engine.
    Streams tokens back to the frontend as they arrive.
    """
    ring_id = data.get("ring_id") or session.active_ring_id
    content = data.get("content", "").strip()

    if not ring_id:
        await _send(websocket, {
            "event": "error",
            "message": "No ring selected. Send a 'ring_selected' event first."
        })
        return

    if not content:
        await _send(websocket, {
            "event": "error",
            "message": "Message content cannot be empty."
        })
        return

    # Reset abort flag for the new generation
    session.abort_requested = False

    # Tell the frontend we're working
    await _send(websocket, {"event": "status", "state": "thinking"})

    # ── Token callback ────────────────────────────────────────────────────────
    async def on_token(token: str | None) -> None:
        """
        Called by ring_engine for each streamed token.
        - token is a non-empty string: forward it to the frontend
        - token is None: signal a stream failure
        """
        if session.abort_requested:
            # Caller (ollama_client) checks nothing here; we just stop forwarding.
            # The stream will naturally drain; we silently discard remaining tokens.
            return

        if token is None:
            # Stream failure — notify frontend
            await _send(websocket, {
                "event": "error",
                "message": "Ollama stream failed. Is Ollama running in WSL?"
            })
            return

        await _send(websocket, {
            "event": "token_stream",
            "token": token,
            "done": False,
        })

    # ── Run generation ────────────────────────────────────────────────────────
    await ring_engine.process_message(
        ring_id=ring_id,
        user_message=content,
        conversation_manager=conversation_manager,
        on_token=on_token,
    )

    # Only send the completion signal if we weren't aborted
    if not session.abort_requested:
        await _send(websocket, {"event": "token_stream", "token": "", "done": True})

    await _send(websocket, {"event": "status", "state": "idle"})


async def _handle_abort(websocket: Any, session: _SessionState) -> None:
    """
    Set the abort flag. The on_token callback will stop forwarding tokens.
    The Ollama HTTP stream continues draining internally (httpx doesn't
    support mid-stream cancellation easily), but the frontend sees nothing.
    """
    session.abort_requested = True
    await _send(websocket, {"event": "status", "state": "idle"})
    print("[ws_handlers] Generation aborted by client.")


async def _handle_clear_history(
    data: dict,
    websocket: Any,
    conversation_manager: ConversationManager,
) -> None:
    """Clear conversation history for the specified ring."""
    ring_id = data.get("ring_id", "")

    if not ring_id:
        await _send(websocket, {
            "event": "error",
            "message": "clear_history requires a 'ring_id' field."
        })
        return

    conversation_manager.clear(ring_id)
    await _send(websocket, {"event": "status", "state": "idle"})
    print(f"[ws_handlers] History cleared for ring: {ring_id}")


# ── Utility ───────────────────────────────────────────────────────────────────

async def _send(websocket: Any, payload: dict) -> None:
    """Serialize payload to JSON and send over the WebSocket."""
    await websocket.send(json.dumps(payload))
