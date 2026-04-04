from __future__ import annotations

from pathlib import Path
from typing import Any


class SExpressionParseError(ValueError):
    """Raised when a KiCad S-expression file cannot be parsed."""


def _tokenize(text: str) -> list[str]:
    tokens: list[str] = []
    i = 0
    length = len(text)

    while i < length:
        ch = text[i]

        if ch.isspace():
            i += 1
            continue

        if ch == ";":
            while i < length and text[i] not in "\r\n":
                i += 1
            continue

        if ch in "()":
            tokens.append(ch)
            i += 1
            continue

        if ch == '"':
            i += 1
            value_chars: list[str] = []
            while i < length:
                cur = text[i]
                if cur == "\\":
                    i += 1
                    if i >= length:
                        raise SExpressionParseError("Unterminated escape sequence in string literal")
                    value_chars.append(text[i])
                    i += 1
                    continue
                if cur == '"':
                    i += 1
                    break
                value_chars.append(cur)
                i += 1
            else:
                raise SExpressionParseError("Unterminated string literal")
            tokens.append("".join(value_chars))
            continue

        start = i
        while i < length and not text[i].isspace() and text[i] not in "();":
            i += 1
        tokens.append(text[start:i])

    return tokens


def _parse_tokens(tokens: list[str]) -> list[Any]:
    index = 0

    def parse_expr() -> Any:
        nonlocal index
        if index >= len(tokens):
            raise SExpressionParseError("Unexpected end of token stream")

        token = tokens[index]
        if token == "(":
            index += 1
            result: list[Any] = []
            while index < len(tokens) and tokens[index] != ")":
                result.append(parse_expr())
            if index >= len(tokens):
                raise SExpressionParseError("Missing closing parenthesis")
            index += 1
            return result

        if token == ")":
            raise SExpressionParseError("Unexpected closing parenthesis")

        index += 1
        return token

    expressions: list[Any] = []
    while index < len(tokens):
        expressions.append(parse_expr())

    return expressions


def _find_first(block: list[Any], head: str) -> list[Any] | None:
    for item in block[1:]:
        if isinstance(item, list) and item and item[0] == head:
            return item
    return None


def _find_all(block: list[Any], head: str) -> list[list[Any]]:
    return [item for item in block[1:] if isinstance(item, list) and item and item[0] == head]


def _coerce_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _extract_text(block: list[Any], text_type: str) -> str:
    for item in _find_all(block, "fp_text"):
        if len(item) >= 3 and item[1] == text_type:
            return str(item[2])
    return ""


def _extract_properties(block: list[Any]) -> dict[str, str]:
    properties: dict[str, str] = {}
    for prop in _find_all(block, "property"):
        if len(prop) >= 3:
            properties[str(prop[1])] = str(prop[2])
    return properties


def _extract_footprint_name(block: list[Any]) -> str:
    raw_name = str(block[1]) if len(block) > 1 else ""
    return raw_name.split(":")[-1]


def _extract_layer(block: list[Any]) -> str:
    layer_node = _find_first(block, "layer")
    layer_value = str(layer_node[1]) if layer_node and len(layer_node) > 1 else ""
    return "Bottom" if layer_value.startswith("B.") else "Top"


def _extract_position(block: list[Any]) -> tuple[float, float, float]:
    at_node = _find_first(block, "at")
    if not at_node:
        return 0.0, 0.0, 0.0

    x = _coerce_float(at_node[1], 0.0) if len(at_node) > 1 else 0.0
    y = _coerce_float(at_node[2], 0.0) if len(at_node) > 2 else 0.0
    rotation = _coerce_float(at_node[3], 0.0) if len(at_node) > 3 else 0.0
    return x, y, rotation


def _extract_attributes(block: list[Any], properties: dict[str, str]) -> tuple[bool, bool, bool]:
    attr_nodes = _find_all(block, "attr")
    attr_tokens = {
        str(token).lower()
        for node in attr_nodes
        for token in node[1:]
        if isinstance(token, str)
    }

    def prop_truthy(name: str) -> bool:
        value = properties.get(name)
        if value is None:
            value = properties.get(name.upper())
        if value is None:
            return False
        return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}

    is_dnp = "dnp" in attr_tokens or prop_truthy("DNP")
    exclude_from_bom = "exclude_from_bom" in attr_tokens or prop_truthy("exclude_from_bom")
    exclude_from_board = (
        "exclude_from_board" in attr_tokens
        or "exclude_from_pos_files" in attr_tokens
        or prop_truthy("exclude_from_board")
    )
    return is_dnp, exclude_from_bom, exclude_from_board


def parse_kicad_pcb(filepath: str) -> list[dict[str, Any]]:
    text = Path(filepath).read_text(encoding="utf-8")
    expressions = _parse_tokens(_tokenize(text))
    if len(expressions) != 1 or not isinstance(expressions[0], list):
        raise SExpressionParseError("Expected a single top-level KiCad S-expression")

    root = expressions[0]
    if not root or root[0] != "kicad_pcb":
        raise SExpressionParseError("Root node is not kicad_pcb")

    components: list[dict[str, Any]] = []
    for item in root[1:]:
        if not (isinstance(item, list) and item and item[0] == "footprint"):
            continue

        properties = _extract_properties(item)
        reference = properties.get("Reference") or _extract_text(item, "reference")
        value = properties.get("Value") or _extract_text(item, "value")
        pos_x_mm, pos_y_mm, rotation_deg = _extract_position(item)
        is_dnp, exclude_from_bom, exclude_from_board = _extract_attributes(item, properties)

        component = {
            "reference": reference or "",
            "value": value or "",
            "footprint": _extract_footprint_name(item),
            "pos_x_mm": pos_x_mm,
            "pos_y_mm": pos_y_mm,
            "rotation_deg": rotation_deg,
            "layer": _extract_layer(item),
            "fields": properties,
            "is_dnp": is_dnp,
            "exclude_from_bom": exclude_from_bom,
            "exclude_from_board": exclude_from_board,
        }
        components.append(component)

    return components
