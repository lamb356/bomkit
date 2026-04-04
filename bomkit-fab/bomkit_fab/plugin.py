from __future__ import annotations

import importlib.util
from pathlib import Path
from typing import Any

PACKAGE_DIR = Path(__file__).resolve().parent
PLUGIN_ROOT = PACKAGE_DIR.parent

PCBNEW_AVAILABLE = False
PCBNEW_IMPORT_ERROR: Exception | None = None

pcbnew_spec = importlib.util.find_spec("pcbnew")
if pcbnew_spec is not None:
    import pcbnew  # type: ignore

    PCBNEW_AVAILABLE = hasattr(pcbnew, "ActionPlugin")
else:  # pragma: no cover - exercised outside KiCad
    exc = ModuleNotFoundError("pcbnew")
    PCBNEW_IMPORT_ERROR = exc

    class _FallbackActionPlugin:
        def register(self) -> None:
            return None

    class _FallbackPcbnew:
        ActionPlugin = _FallbackActionPlugin

        @staticmethod
        def GetBoard() -> None:
            return None

        @staticmethod
        def GetBoardFilename() -> str:
            return ""

    pcbnew = _FallbackPcbnew()  # type: ignore

from bomkit_fab.board_adapter import load_from_pcbnew
from bomkit_fab.rotations import load_rotation_database
from bomkit_fab.ui.main_dialog import BOMKitDialog


DEFAULT_ICON = str(PLUGIN_ROOT / "icon.png")
DEFAULT_ROTATIONS = PLUGIN_ROOT / "rotations.csv"


def _board_path_from_board(board: Any) -> Path | None:
    for getter_name in ("GetFileName", "GetFilename"):
        getter = getattr(board, getter_name, None)
        if getter is None:
            continue
        try:
            candidate = getter()
        except Exception:
            continue
        if candidate:
            return Path(str(candidate))

    get_board_filename = getattr(pcbnew, "GetBoardFilename", None)
    if callable(get_board_filename):
        try:
            candidate = get_board_filename()
        except Exception:
            candidate = ""
        if candidate:
            return Path(str(candidate))

    return None


class BOMKitFab(pcbnew.ActionPlugin):
    def defaults(self) -> None:
        self.name = "BOMKit Fab"
        self.category = "Manufacturing"
        self.description = "Generate JLCPCB-ready BOM + CPL with rotation correction"
        self.show_toolbar_button = True
        self.icon_file_name = DEFAULT_ICON

    def Run(self) -> Any:
        if not PCBNEW_AVAILABLE:
            raise RuntimeError("pcbnew is unavailable; BOMKit Fab must run inside KiCad pcbnew.")

        board = pcbnew.GetBoard()
        if board is None:
            raise RuntimeError("No KiCad board is currently loaded.")

        components = load_from_pcbnew(board)
        board_path = _board_path_from_board(board)
        output_dir = board_path.parent if board_path is not None else Path.cwd()
        board_name = board_path.stem if board_path is not None else "board"
        rotations_db = load_rotation_database(DEFAULT_ROTATIONS, output_dir if board_path is not None else None)

        dialog = BOMKitDialog(
            parent=None,
            components=components,
            output_dir=output_dir,
            rotations_db=rotations_db,
            board_name=board_name,
            title="BOMKit Fab",
        )
        self._dialog = dialog
        dialog.ShowModal()
        destroy = getattr(dialog, "Destroy", None)
        if callable(destroy):
            destroy()
        return dialog


def register_plugin() -> BOMKitFab:
    plugin = BOMKitFab()
    plugin.defaults()
    if PCBNEW_AVAILABLE:
        plugin.register()
    return plugin


__all__ = [
    "BOMKitFab",
    "DEFAULT_ICON",
    "DEFAULT_ROTATIONS",
    "PCBNEW_AVAILABLE",
    "PCBNEW_IMPORT_ERROR",
    "pcbnew",
    "register_plugin",
]
