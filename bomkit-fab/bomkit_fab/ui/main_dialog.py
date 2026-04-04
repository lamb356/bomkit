from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any
import webbrowser

import importlib.util

wx_spec = importlib.util.find_spec("wx")
if wx_spec is not None:
    import wx  # type: ignore
    WX_AVAILABLE = True
else:  # pragma: no cover
    WX_AVAILABLE = False

    class _WxObject:
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            self._label = kwargs.get("label", "")
            self._sizer = None

        def Bind(self, *args: Any, **kwargs: Any) -> None:
            return None

        def SetSizer(self, sizer: Any) -> None:
            self._sizer = sizer

        def Layout(self) -> None:
            return None

        def SetLabel(self, value: str) -> None:
            self._label = value

        def GetLabel(self) -> str:
            return self._label

        def ShowModal(self) -> int:
            return 0

    class _WxSizer:
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            self.children: list[Any] = []

        def Add(self, child: Any, *args: Any, **kwargs: Any) -> None:
            self.children.append(child)

        def AddStretchSpacer(self, *args: Any, **kwargs: Any) -> None:
            return None

    class _WxModule:
        Dialog = _WxObject
        Panel = _WxObject
        Button = _WxObject
        StaticText = _WxObject
        BoxSizer = _WxSizer
        EVT_BUTTON = object()
        EXPAND = 0
        ALL = 0
        VERTICAL = 0
        HORIZONTAL = 1
        ALIGN_CENTER_VERTICAL = 0
        ALIGN_RIGHT = 0
        DEFAULT_DIALOG_STYLE = 0
        RESIZE_BORDER = 0
        OK = 0
        ICON_INFORMATION = 0
        ICON_ERROR = 0
        ID_ANY = -1

        @staticmethod
        def MessageBox(*args: Any, **kwargs: Any) -> int:
            return 0

        @staticmethod
        def LaunchDefaultBrowser(url: str) -> bool:
            try:
                return bool(webbrowser.open(url))
            except Exception:
                return False

    wx = _WxModule()  # type: ignore

from bomkit_fab.bom_exporter import BOMLine, export_bom
from bomkit_fab.cost_estimator import estimate_loading_fees
from bomkit_fab.cpl_exporter import export_cpl
from bomkit_fab.field_resolver import resolve_lcsc
from bomkit_fab.ui.parts_table import (
    PartsTable,
    STATUS_ALL,
    STATUS_DNP,
    STATUS_RESOLVED,
    STATUS_UNRESOLVED,
    build_parts_table_rows,
)


@dataclass(slots=True)
class DialogSummary:
    total_parts: int
    resolved_count: int
    unresolved_count: int
    dnp_count: int
    excluded_count: int
    bom_line_count: int
    basic_count: int
    preferred_extended_count: int
    extended_count: int
    not_found_count: int
    unknown_count: int
    total_loading_fee_usd: float
    status_message: str


def _build_bom_lines(components: list[Any]) -> tuple[list[BOMLine], dict[str, int]]:
    grouped: dict[tuple[str, str, str], list[str]] = {}
    summary = {
        "resolved_count": 0,
        "unresolved_count": 0,
        "dnp_count": 0,
        "excluded_count": 0,
    }

    for component in components or []:
        if bool(getattr(component, "exclude_from_bom", False)):
            summary["excluded_count"] += 1
            continue
        if bool(getattr(component, "is_dnp", False)):
            summary["dnp_count"] += 1
            continue

        lcsc_part = str(resolve_lcsc(component) or "").strip()
        if lcsc_part:
            summary["resolved_count"] += 1
        else:
            summary["unresolved_count"] += 1
        key = (
            str(getattr(component, "value", "") or "").strip(),
            str(getattr(component, "footprint", "") or "").strip(),
            lcsc_part,
        )
        grouped.setdefault(key, []).append(str(getattr(component, "reference", "") or "").strip())

    bom_lines = [
        BOMLine(comment=value, designators=sorted(designators), footprint=footprint, lcsc_part_number=lcsc_part)
        for (value, footprint, lcsc_part), designators in sorted(grouped.items())
    ]
    return bom_lines, summary


def build_dialog_summary(components: list[Any], parts_db: dict[str, Any] | None = None) -> DialogSummary:
    bom_lines, summary = _build_bom_lines(components)
    estimate = estimate_loading_fees(bom_lines, parts_db)
    return DialogSummary(
        total_parts=len(components or []),
        resolved_count=summary["resolved_count"],
        unresolved_count=summary["unresolved_count"],
        dnp_count=summary["dnp_count"],
        excluded_count=summary["excluded_count"],
        bom_line_count=len(bom_lines),
        basic_count=estimate.basic_count,
        preferred_extended_count=estimate.preferred_extended_count,
        extended_count=estimate.extended_count,
        not_found_count=estimate.not_found_count,
        unknown_count=estimate.unknown_count,
        total_loading_fee_usd=estimate.total_loading_fee_usd,
        status_message=estimate.status_message,
    )


def format_cost_summary(summary: DialogSummary) -> str:
    text = (
        f"Parts: {summary.total_parts} | Resolved: {summary.resolved_count} | "
        f"Unresolved: {summary.unresolved_count} | DNP: {summary.dnp_count} | Excluded: {summary.excluded_count}\n"
        f"BOM lines: {summary.bom_line_count} | Basic: {summary.basic_count} | "
        f"Preferred Extended: {summary.preferred_extended_count} | Extended: {summary.extended_count} | "
        f"Not Found: {summary.not_found_count} | Unknown: {summary.unknown_count}\n"
        f"Estimated extended loading fees: ${summary.total_loading_fee_usd:.2f}"
    )
    if summary.status_message:
        text = f"{text}\n{summary.status_message}"
    return text


class BOMKitDialog(wx.Dialog):
    DEFAULT_SIZE = (900, 600)

    def __init__(
        self,
        parent: Any | None = None,
        components: list[Any] | None = None,
        output_dir: str | Path | None = None,
        parts_db: dict[str, Any] | None = None,
        rotations_db: list[Any] | None = None,
        board_name: str = "board",
        title: str = "BOMKit",
    ) -> None:
        style = getattr(wx, "DEFAULT_DIALOG_STYLE", 0) | getattr(wx, "RESIZE_BORDER", 0)
        super().__init__(parent, title=title, size=self.DEFAULT_SIZE, style=style)
        self.components = list(components or [])
        self.output_dir = Path(output_dir or Path.cwd())
        self.parts_db = parts_db
        self.rotations_db = list(rotations_db or [])
        self.board_name = board_name or "board"
        self.filter_buttons: dict[str, Any] = {}

        self.parts_rows = build_parts_table_rows(self.components, self.parts_db)
        self.parts_table = PartsTable(self, self.parts_rows)
        self.cost_summary_text = wx.StaticText(self, label="")
        self.export_button = wx.Button(self, label="Export BOM + CPL")

        self._build_ui()
        self._bind_events()
        self.set_filter(STATUS_ALL)
        self.update_cost_summary()

    def _build_ui(self) -> None:
        root = wx.BoxSizer(getattr(wx, "VERTICAL", 0))

        toolbar = wx.BoxSizer(getattr(wx, "HORIZONTAL", 1))
        for label in (STATUS_ALL, STATUS_RESOLVED, STATUS_UNRESOLVED, STATUS_DNP):
            button = wx.Button(self, label=label)
            self.filter_buttons[label] = button
            toolbar.Add(button, 0, getattr(wx, "ALL", 0), 4)

        toolbar.AddStretchSpacer(1)
        toolbar.Add(self.export_button, 0, getattr(wx, "ALL", 0), 4)

        root.Add(toolbar, 0, getattr(wx, "EXPAND", 0) | getattr(wx, "ALL", 0), 8)
        root.Add(self.parts_table, 1, getattr(wx, "EXPAND", 0) | getattr(wx, "ALL", 0), 8)
        root.Add(self.cost_summary_text, 0, getattr(wx, "EXPAND", 0) | getattr(wx, "ALL", 0), 8)

        self.SetSizer(root)
        self.Layout()

    def _bind_events(self) -> None:
        for label, button in self.filter_buttons.items():
            button.Bind(getattr(wx, "EVT_BUTTON", object()), lambda event, status=label: self.set_filter(status))
        self.export_button.Bind(getattr(wx, "EVT_BUTTON", object()), self.on_export)

    def set_filter(self, status: str) -> None:
        self.parts_table.set_filter(status)

    def update_cost_summary(self) -> None:
        summary = build_dialog_summary(self.components, self.parts_db)
        self.cost_summary_text.SetLabel(format_cost_summary(summary))
        self.Layout()

    def on_export(self, event: Any | None = None) -> tuple[Path, Path] | None:
        try:
            self.output_dir.mkdir(parents=True, exist_ok=True)
            bom_path = self.output_dir / f"{self.board_name}_BOM_JLCPCB.csv"
            cpl_path = self.output_dir / f"{self.board_name}_CPL_JLCPCB.csv"
            bom_result = export_bom(self.components, bom_path)
            cpl_result = export_cpl(self.components, cpl_path, self.rotations_db)
            message = (
                f"BOM exported to: {bom_path}\n"
                f"CPL exported to: {cpl_path}\n\n"
                f"Resolved BOM lines: {bom_result.resolved_count}\n"
                f"Unresolved BOM lines: {bom_result.unresolved_count}\n"
                f"CPL exported parts: {cpl_result.exported_count}"
            )
            if cpl_result.warnings:
                message = f"{message}\n\nWarnings:\n" + "\n".join(cpl_result.warnings)
            wx.MessageBox(message, "Export complete", getattr(wx, "OK", 0) | getattr(wx, "ICON_INFORMATION", 0))
            self.update_cost_summary()
            return bom_path, cpl_path
        except Exception as exc:
            wx.MessageBox(
                f"Failed to export BOM/CPL files:\n{exc}",
                "Export failed",
                getattr(wx, "OK", 0) | getattr(wx, "ICON_ERROR", 0),
            )
            return None


__all__ = [
    "BOMKitDialog",
    "DialogSummary",
    "WX_AVAILABLE",
    "build_dialog_summary",
    "format_cost_summary",
    "wx",
]
