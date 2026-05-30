"""
backend/config.py

Loads and validates rings_config.json at startup.
Exposes get_ring_config(ring_id) and get_all_rings().
Uses pathlib so the path is always relative to this file,
regardless of where brain.py is launched from.
"""

import json
import sys
from pathlib import Path

# ── Location ──────────────────────────────────────────────────────────────────
_CONFIG_PATH = Path(__file__).parent / "rings_config.json"

# ── Required keys every ring entry must have ──────────────────────────────────
_REQUIRED_KEYS = {
    "display_name",
    "archetype",
    "model",
    "temperature",
    "top_p",
    "top_k",
    "context_window",
    "system_prompt",
}

# ── Internal store (populated once at import time) ────────────────────────────
_rings: dict = {}


def _load() -> dict:
    """Parse rings_config.json and validate its structure. Raises on any error."""
    if not _CONFIG_PATH.exists():
        raise FileNotFoundError(
            f"[config] rings_config.json not found at: {_CONFIG_PATH}\n"
            "Make sure the file exists inside the backend/ directory."
        )

    try:
        with _CONFIG_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"[config] rings_config.json is malformed JSON: {exc}"
        ) from exc

    if not isinstance(data, dict) or len(data) == 0:
        raise ValueError(
            "[config] rings_config.json must be a non-empty JSON object."
        )

    for ring_id, cfg in data.items():
        missing = _REQUIRED_KEYS - cfg.keys()
        if missing:
            raise ValueError(
                f"[config] Ring '{ring_id}' is missing required keys: {missing}"
            )

    return data


# Load once at import time so errors surface immediately on startup.
try:
    _rings = _load()
    print(f"[config] Loaded {len(_rings)} ring profiles from rings_config.json")
except (FileNotFoundError, ValueError) as exc:
    print(f"FATAL: {exc}", file=sys.stderr)
    sys.exit(1)


# ── Public API ────────────────────────────────────────────────────────────────

def get_ring_config(ring_id: str) -> dict:
    """
    Return the config dict for a single ring.
    Raises KeyError with a helpful message if ring_id is unknown.
    """
    if ring_id not in _rings:
        available = ", ".join(_rings.keys())
        raise KeyError(
            f"[config] Unknown ring_id '{ring_id}'. "
            f"Available rings: {available}"
        )
    return _rings[ring_id]


def get_all_rings() -> dict:
    """Return the full ring config dictionary (ring_id → config)."""
    return dict(_rings)
