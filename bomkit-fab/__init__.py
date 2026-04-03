from __future__ import annotations

import sys
from pathlib import Path

MODULE_DIR = Path(__file__).resolve().parent
path_text = str(MODULE_DIR)
if path_text not in sys.path:
    sys.path.insert(0, path_text)

try:
    from .plugin import BOMKitFab, PCBNEW_AVAILABLE, register_plugin
except ImportError:  # pragma: no cover - direct file import fallback
    from plugin import BOMKitFab, PCBNEW_AVAILABLE, register_plugin

REGISTERED_PLUGIN = None
try:
    REGISTERED_PLUGIN = register_plugin()
except Exception:  # pragma: no cover - keep import safe outside KiCad
    REGISTERED_PLUGIN = None

__all__ = [
    "BOMKitFab",
    "PCBNEW_AVAILABLE",
    "REGISTERED_PLUGIN",
    "register_plugin",
]
