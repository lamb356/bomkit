from __future__ import annotations

import os
import sys

plugin_dir = os.path.dirname(os.path.abspath(__file__))
if plugin_dir not in sys.path:
    sys.path.insert(0, plugin_dir)

from bomkit_fab.plugin import BOMKitFab, PCBNEW_AVAILABLE, register_plugin

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
