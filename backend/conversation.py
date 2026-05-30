"""
backend/conversation.py

Per-session, per-ring conversation history manager.
Each ring maintains its own independent message history for the lifetime
of a WebSocket connection (i.e., one Solomon session).

History is stored as a list of OpenAI-compatible message dicts:
    {"role": "user" | "assistant", "content": "..."}

System prompts are NOT stored here — they are injected fresh on every
call by ring_engine.py, so the personality is always applied correctly
even after a history trim.
"""

# ── Constants ─────────────────────────────────────────────────────────────────
_MAX_MESSAGES = 20   # If history exceeds this, drop the oldest 2 messages
_DROP_COUNT   = 2    # Number of oldest messages to drop when trimming


class ConversationManager:
    """Manages conversation history for all rings within a single session."""

    def __init__(self, context_window: int = 8192):
        # ring_id → list of {"role": ..., "content": ...}
        self._history: dict[str, list[dict]] = {}
        self._context_window = context_window  # Reserved for future token-count trimming

    # ── History access ────────────────────────────────────────────────────────

    def get_history(self, ring_id: str) -> list[dict]:
        """
        Return the message history for ring_id.
        Automatically trims if the history is too long before returning.
        Returns an empty list if no history exists yet.
        """
        history = self._history.get(ring_id, [])
        history = self._trim(history)
        self._history[ring_id] = history
        return list(history)  # Return a copy — caller must not mutate the store

    def add_message(self, ring_id: str, role: str, content: str) -> None:
        """
        Append a message to ring_id's history.

        Parameters
        ----------
        ring_id : The ring whose history to update
        role    : "user" or "assistant"
        content : The message text
        """
        if ring_id not in self._history:
            self._history[ring_id] = []

        self._history[ring_id].append({"role": role, "content": content})

    # ── History management ────────────────────────────────────────────────────

    def clear(self, ring_id: str) -> None:
        """Clear conversation history for a specific ring."""
        self._history.pop(ring_id, None)

    def clear_all(self) -> None:
        """Clear all conversation history across all rings."""
        self._history.clear()

    # ── Private helpers ───────────────────────────────────────────────────────

    @staticmethod
    def _trim(history: list[dict]) -> list[dict]:
        """
        If history exceeds _MAX_MESSAGES, drop the oldest _DROP_COUNT messages.
        This prevents context windows from growing unbounded.

        Note: We drop pairs (user + assistant) to avoid orphaned role entries,
        but _DROP_COUNT = 2 already handles this correctly for turn-based chat.
        """
        while len(history) > _MAX_MESSAGES:
            history = history[_DROP_COUNT:]
        return history
