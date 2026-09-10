#!/usr/bin/env python3
"""Validate rich contextual-theory cards and their practice anchors."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
THEORY_LINKS = ROOT / "content" / "theory-links"
PUBLISHED_PHASES = {f"{number:02d}" for number in range(17)}
CARD_BLOCK = re.compile(r"^card:\r?\n(?P<body>[\s\S]*?)(?=^theory:)", re.MULTILINE)
PLACEHOLDER = re.compile(r"(?:TODO|TBD|FIXME|待补|占位|稍后完善)", re.IGNORECASE)
SCALAR_FIELDS = ("context", "intuition", "application", "check_question")
PRACTICE_ANCHOR = re.compile(r"^    slug:\s*([a-z0-9-]+)\s*$", re.MULTILINE)
TRANSLATION_ANCHOR = re.compile(
    r"^#{1,6}[ \t]+[^\n]*?<!--\s*learning-atlas:\s*([a-z0-9-]+)\s*-->[ \t]*$",
    re.MULTILINE,
)


def quoted_scalar(block: str, key: str) -> str | None:
    match = re.search(rf'^  {key}:\s*("(?:[^"\\]|\\.)*")\s*$', block, re.MULTILINE)
    if not match:
        return None
    try:
        value = json.loads(match.group(1))
    except json.JSONDecodeError:
        return None
    return value.strip() if isinstance(value, str) else None


def key_points(block: str) -> list[str] | None:
    match = re.search(r"^  key_points:\r?\n(?P<items>(?:    - .*?(?:\r?\n|$))+)", block, re.MULTILINE)
    if not match:
        return None
    values: list[str] = []
    for line in match["items"].splitlines():
        item = re.fullmatch(r'    -\s*("(?:[^"\\]|\\.)*")\s*', line)
        if not item:
            return None
        try:
            value = json.loads(item.group(1))
        except json.JSONDecodeError:
            return None
        if not isinstance(value, str):
            return None
        values.append(value.strip())
    return values


def normalized(value: str) -> str:
    return re.sub(r"[\W_]+", "", value, flags=re.UNICODE).lower()


def validate_practice_anchor(path: Path, document: str, required: bool) -> list[str]:
    if not required:
        return []
    parts = path.relative_to(THEORY_LINKS).parts
    if len(parts) < 2:
        return ["cannot derive practice translation path"]
    anchor_match = PRACTICE_ANCHOR.search(document)
    if not anchor_match:
        return ["missing practice.anchor.slug"]
    translation = ROOT / "content" / "translations" / "practice" / parts[0] / parts[1] / "zh.md"
    if not translation.is_file():
        return [f"practice translation does not exist: {translation.relative_to(ROOT)}"]
    anchors = TRANSLATION_ANCHOR.findall(translation.read_text(encoding="utf-8"))
    slug = anchor_match.group(1)
    count = anchors.count(slug)
    if count != 1:
        return [f"practice anchor {slug!r} must appear on exactly one translated heading (found {count})"]
    return []


def validate(path: Path) -> list[str]:
    document = path.read_text(encoding="utf-8")
    status = re.search(r"^status:\s*(\S+)\s*$", document, re.MULTILINE)
    phase = path.relative_to(THEORY_LINKS).parts[0].split("-", 1)[0]
    required = status is not None and status.group(1) == "approved" and phase in PUBLISHED_PHASES
    errors = validate_practice_anchor(path, document, required)
    match = CARD_BLOCK.search(document)
    if not match:
        return [*errors, "missing card block"] if required else errors
    card = match["body"]
    has_rich_field = any(re.search(rf"^  {key}:", card, re.MULTILINE) for key in (*SCALAR_FIELDS, "key_points"))
    if not required and not has_rich_field:
        return errors

    values = {key: quoted_scalar(card, key) for key in SCALAR_FIELDS}
    for key, value in values.items():
        if value is None:
            errors.append(f"{key} must be a valid double-quoted string")
        elif len(value) < (10 if key == "check_question" else 18):
            errors.append(f"{key} is too short to carry useful learning content")
        elif PLACEHOLDER.search(value):
            errors.append(f"{key} contains placeholder text")
    points = key_points(card)
    if points is None:
        errors.append("key_points must be a double-quoted YAML list")
    else:
        if not 2 <= len(points) <= 4:
            errors.append("key_points must contain 2 to 4 items")
        if len({normalized(point) for point in points}) != len(points):
            errors.append("key_points contains duplicate items")
        for index, point in enumerate(points, start=1):
            if len(point) < 8:
                errors.append(f"key_points item {index} is too short")
            if PLACEHOLDER.search(point):
                errors.append(f"key_points item {index} contains placeholder text")
    question = values.get("check_question")
    if question and not question.endswith(("？", "?")):
        errors.append("check_question must end with a question mark")
    summary_match = re.search(r"^  summary:\s*(.+?)\s*$", card, re.MULTILINE)
    if summary_match:
        summary = summary_match.group(1).strip().strip('"\'')
        for key in ("context", "intuition", "application"):
            value = values.get(key)
            if value and normalized(value) == normalized(summary):
                errors.append(f"{key} merely repeats summary")
    return errors


def main() -> int:
    failures: list[str] = []
    checked = 0
    for path in sorted(THEORY_LINKS.glob("**/*.yaml")):
        errors = validate(path)
        phase = path.relative_to(THEORY_LINKS).parts[0].split("-", 1)[0]
        document = path.read_text(encoding="utf-8")
        if phase in PUBLISHED_PHASES and re.search(r"^status:\s*approved\s*$", document, re.MULTILINE):
            checked += 1
        if errors:
            display = path.relative_to(ROOT)
            failures.extend(f"{display}: {error}" for error in errors)
    if failures:
        print("FAIL")
        print("\n".join(failures))
        return 1
    print(f"PASS {checked} published theory cards with rich content")
    return 0


if __name__ == "__main__":
    sys.exit(main())
