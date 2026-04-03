from __future__ import annotations

from dataclasses import dataclass
from functools import cmp_to_key
from typing import Any
import webbrowser

try:
    import wx  # type: ignore
    WX_AVAILABLE = True
except ImportError:  # pragma: no cover
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

        def SetMinSize(self, *args: Any, **kwargs: Any) -> None:
            return None

        def SetLabel(self, value: str) -> None:
            self._label = value

        def GetLabel(self) -> str:
            return self._label

    class _WxListCtrl(_WxObject):
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            super().__init__(*args, **kwargs)
            self.columns: list[str] = []
            self.rows: list[list[str]] = []
            self.item_data: dict[int, int] = {}

        def InsertColumn(self, index: int, heading: str, format: int = 0, width: int = -1) -> None:
            if index >= len(self.columns):
                self.columns.extend([""] * (index - len(self.columns) + 1))
            self.columns[index] = heading

        def DeleteAllItems(self) -> None:
            self.rows = []
            self.item_data = {}

        def InsertItem(self, index: int, text: str) -> int:
            if index > len(self.rows):
                index = len(self.rows)
            self.rows.insert(index, [text])
            return index

        def SetItem(self, index: int, column: int, text: str) -> None:
            row = self.rows[index]
            if column >= len(row):
                row.extend([""] * (column - len(row) + 1))
            row[column] = text

        def SetItemData(self, index: int, data: int) -> None:
            self.item_data[index] = data

        def GetItemData(self, index: int) -> int:
            return self.item_data.get(index, index)

        def GetItemCount(self) -> int:
            return len(self.rows)

        def GetFirstSelected(self) -> int:
            return -1

        def SetColumnWidth(self, *args: Any, **kwargs: Any) -> None:
            return None

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
        ListCtrl = _WxListCtrl
        Button = _WxObject
        StaticText = _WxObject
        BoxSizer = _WxSizer
        EVT_LIST_COL_CLICK = object()
        EVT_LIST_ITEM_ACTIVATED = object()
        EVT_BUTTON = object()
        LC_REPORT = 1
        LC_SINGLE_SEL = 2
        BORDER_THEME = 4
        LIST_FORMAT_LEFT = 0
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

try:
    from ..field_resolver import resolve_lcsc
    from ..jlcpcb_classifier import classify
except ImportError:  # pragma: no cover
    from field_resolver import resolve_lcsc
    from jlcpcb_classifier import classify


STATUS_ALL = "All"
STATUS_RESOLVED = "Resolved"
STATUS_UNRESOLVED = "Unresolved"
STATUS_DNP = "DNP"
STATUS_EXCLUDED = "Excluded"


@dataclass(slots=True)
class PartsTableRow:
    reference: str
    value: str
    footprint: str
    lcsc_part: str
    status: str
    assembly_tier: str
    component: Any | None = None

    def as_columns(self) -> list[str]:
        return [
            self.reference,
            self.value,
            self.footprint,
            self.lcsc_part,
            self.status,
            self.assembly_tier,
        ]


def _normalize_text(value: Any) -> str:
    return str(value or "").strip()


def _component_status(component: Any, lcsc_part: str) -> str:
    if bool(getattr(component, "is_dnp", False)):
        return STATUS_DNP
    if bool(getattr(component, "exclude_from_bom", False)) or bool(getattr(component, "exclude_from_board", False)):
        return STATUS_EXCLUDED
    return STATUS_RESOLVED if lcsc_part else STATUS_UNRESOLVED


def build_parts_table_rows(components: list[Any], parts_db: dict[str, Any] | None = None) -> list[PartsTableRow]:
    rows: list[PartsTableRow] = []
    for component in sorted(components or [], key=lambda item: _normalize_text(getattr(item, "reference", ""))):
        lcsc_part = _normalize_text(resolve_lcsc(component) or "")
        status = _component_status(component, lcsc_part)
        assembly_tier = classify(lcsc_part, parts_db) if lcsc_part else ""
        rows.append(
            PartsTableRow(
                reference=_normalize_text(getattr(component, "reference", "")),
                value=_normalize_text(getattr(component, "value", "")),
                footprint=_normalize_text(getattr(component, "footprint", "")),
                lcsc_part=lcsc_part,
                status=status,
                assembly_tier=assembly_tier,
                component=component,
            )
        )
    return rows


class PartsTable(wx.ListCtrl):
    COLUMNS = [
        ("Ref", 110),
        ("Value", 180),
        ("Footprint", 180),
        ("LCSC#", 120),
        ("Status", 110),
        ("Assembly Tier", 150),
    ]

    def __init__(self, parent: Any, rows: list[PartsTableRow] | None = None) -> None:
        style = getattr(wx, "LC_REPORT", 0) | getattr(wx, "LC_SINGLE_SEL", 0) | getattr(wx, "BORDER_THEME", 0)
        super().__init__(parent, style=style)
        self.all_rows: list[PartsTableRow] = list(rows or [])
        self.visible_rows: list[PartsTableRow] = []
        self.current_filter = STATUS_ALL
        self.sort_column = 0
        self.sort_ascending = True
        self._build_columns()
        if hasattr(self, "Bind"):
            self.Bind(getattr(wx, "EVT_LIST_COL_CLICK", object()), self._on_column_click)
            self.Bind(getattr(wx, "EVT_LIST_ITEM_ACTIVATED", object()), self._on_item_activated)
        self.refresh_rows()

    def _build_columns(self) -> None:
        list_format = getattr(wx, "LIST_FORMAT_LEFT", 0)
        for index, (label, width) in enumerate(self.COLUMNS):
            self.InsertColumn(index, label, format=list_format, width=width)
            try:
                self.SetColumnWidth(index, width)
            except Exception:
                pass

    def set_rows(self, rows: list[PartsTableRow]) -> None:
        self.all_rows = list(rows)
        self.refresh_rows()

    def set_filter(self, status: str) -> None:
        self.current_filter = status or STATUS_ALL
        self.refresh_rows()

    def sort_by_column(self, column: int) -> None:
        if column == self.sort_column:
            self.sort_ascending = not self.sort_ascending
        else:
            self.sort_column = column
            self.sort_ascending = True
        self.refresh_rows()

    def refresh_rows(self) -> None:
        filtered = [row for row in self.all_rows if self._matches_filter(row)]
        filtered.sort(key=cmp_to_key(self._compare_rows))
        self.visible_rows = filtered
        self.DeleteAllItems()
        for index, row in enumerate(self.visible_rows):
            values = row.as_columns()
            item_index = self.InsertItem(index, values[0])
            for column, value in enumerate(values[1:], start=1):
                self.SetItem(item_index, column, value)
            try:
                self.SetItemData(item_index, index)
            except Exception:
                pass

    def get_row(self, index: int) -> PartsTableRow | None:
        if 0 <= index < len(self.visible_rows):
            return self.visible_rows[index]
        return None

    def open_lcsc_for_row(self, row: PartsTableRow | None) -> bool:
        if row is None or not row.lcsc_part:
            return False
        url = f"https://www.lcsc.com/product-detail/{row.lcsc_part}.html"
        try:
            launcher = getattr(wx, "LaunchDefaultBrowser", None)
            if callable(launcher):
                return bool(launcher(url))
            return bool(webbrowser.open(url))
        except Exception:
            return False

    def _matches_filter(self, row: PartsTableRow) -> bool:
        if self.current_filter == STATUS_ALL:
            return True
        return row.status == self.current_filter

    def _compare_rows(self, left: PartsTableRow, right: PartsTableRow) -> int:
        left_value = self._column_value(left, self.sort_column)
        right_value = self._column_value(right, self.sort_column)
        if left_value < right_value:
            result = -1
        elif left_value > right_value:
            result = 1
        else:
            result = 0
        return result if self.sort_ascending else -result

    def _column_value(self, row: PartsTableRow, column: int) -> tuple[str, str]:
        values = row.as_columns()
        value = values[column] if 0 <= column < len(values) else ""
        return (value.lower(), value)

    def _on_column_click(self, event: Any) -> None:
        column = getattr(event, "GetColumn", lambda: 0)()
        self.sort_by_column(int(column))
        skipper = getattr(event, "Skip", None)
        if callable(skipper):
            skipper()

    def _on_item_activated(self, event: Any) -> None:
        index = getattr(event, "GetIndex", lambda: -1)()
        self.open_lcsc_for_row(self.get_row(int(index)))
        skipper = getattr(event, "Skip", None)
        if callable(skipper):
            skipper()


__all__ = [
    "PartsTable",
    "PartsTableRow",
    "STATUS_ALL",
    "STATUS_RESOLVED",
    "STATUS_UNRESOLVED",
    "STATUS_DNP",
    "STATUS_EXCLUDED",
    "WX_AVAILABLE",
    "build_parts_table_rows",
    "wx",
]
