#!/usr/bin/env python3
"""Verify every versioned Learning Atlas source fingerprint against its pinned upstream file."""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REPOSITORIES = {
    "ai-engineering-from-scratch": ROOT / "ai-engineering-from-scratch",
    "maths-cs-ai-compendium": ROOT / "maths-cs-ai-compendium",
}
FIELD = re.compile(r"^  (?P<key>repository|path|sha256):\s*(?P<value>.+?)\s*$", re.MULTILINE)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_from_block(block: str, display: Path) -> tuple[str, str, str]:
    fields = {match["key"]: match["value"] for match in FIELD.finditer(block)}
    missing = {"repository", "path", "sha256"} - fields.keys()
    if missing:
        raise ValueError(f"{display}: missing source fields: {', '.join(sorted(missing))}")
    return fields["repository"], fields["path"], fields["sha256"]


def verify(repository: str, relative_path: str, expected: str, display: Path) -> str | None:
    root = REPOSITORIES.get(repository)
    if root is None:
        return f"{display}: unknown repository {repository}"
    source = root / relative_path
    if not source.is_file():
        return f"{display}: source does not exist: {source}"
    actual = digest(source)
    if actual != expected:
        return f"{display}: sha256 differs (expected {expected}, actual {actual})"
    return None


def yaml_sources(path: Path, labels: tuple[str, ...]) -> list[tuple[str, str, str]]:
    document = path.read_text(encoding="utf-8")
    sources = []
    for label in labels:
        match = re.search(rf"^{label}:\n([\s\S]*?)(?=^[a-z][a-z-]*:|\Z)", document, re.MULTILINE)
        if not match:
            raise ValueError(f"{path}: missing {label} block")
        sources.append(source_from_block(match.group(1), path))
    return sources


def main() -> int:
    failures: list[str] = []
    checked = 0
    for path in sorted((ROOT / "content/translations").glob("**/zh.md")):
        try:
            repository, source_path, expected = yaml_sources(path, ("source",))[0]
            failure = verify(repository, source_path, expected, path.relative_to(ROOT))
            checked += 1
            if failure:
                failures.append(failure)
        except ValueError as error:
            failures.append(str(error))
    for path in sorted((ROOT / "content/assessments").glob("**/zh.json")):
        try:
            document = json.loads(path.read_text(encoding="utf-8"))
            source = document.get("source", {})
            failure = verify(source.get("repository", ""), source.get("path", ""), source.get("sha256", ""), path.relative_to(ROOT))
            checked += 1
            if failure:
                failures.append(failure)
        except (OSError, json.JSONDecodeError, AttributeError) as error:
            failures.append(f"{path.relative_to(ROOT)}: {error}")
    for path in sorted((ROOT / "content/theory-links").glob("**/*.yaml")):
        try:
            for repository, source_path, expected in yaml_sources(path, ("practice", "theory")):
                failure = verify(repository, source_path, expected, path.relative_to(ROOT))
                checked += 1
                if failure:
                    failures.append(failure)
        except ValueError as error:
            failures.append(str(error))
    if failures:
        print("FAIL")
        print("\n".join(failures))
        return 1
    print(f"PASS {checked} source fingerprints")
    return 0


if __name__ == "__main__":
    sys.exit(main())
