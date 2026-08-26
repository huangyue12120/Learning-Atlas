#!/usr/bin/env python3
"""Reject tracked learner data, local state, private keys, and common tokens."""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FORBIDDEN_COMPONENTS = {
    ".cache",
    ".idea",
    ".ipynb_checkpoints",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    ".venv",
    "__pycache__",
    "htmlcov",
    "learning-artifacts",
    "learning-notes",
    "node_modules",
    "notebooks",
    "personal-code",
    "scratch",
    "workspaces",
}
FORBIDDEN_SUFFIXES = {
    ".db",
    ".duckdb",
    ".ipynb",
    ".jks",
    ".key",
    ".log",
    ".p12",
    ".pem",
    ".pfx",
    ".sqlite",
    ".sqlite3",
}
FORBIDDEN_NAMES = {
    "credentials.json",
    "secrets.json",
    "service-account.json",
}
SECRET_PATTERNS = (
    ("private key", re.compile(rb"-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----")),
    ("GitHub token", re.compile(rb"\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b")),
    ("GitHub fine-grained token", re.compile(rb"\bgithub_pat_[A-Za-z0-9_]{22,}\b")),
    ("OpenAI-style token", re.compile(rb"\bsk-[A-Za-z0-9]{20,}\b")),
    ("AWS access key", re.compile(rb"\bAKIA[0-9A-Z]{16}\b")),
    ("Google API key", re.compile(rb"\bAIza[0-9A-Za-z_-]{30,}\b")),
    ("Slack token", re.compile(rb"\bxox[baprs]-[A-Za-z0-9-]{20,}\b")),
)


def tracked_paths() -> list[Path]:
    completed = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=ROOT,
        check=True,
        stdout=subprocess.PIPE,
    )
    return [ROOT / relative for relative in completed.stdout.decode("utf-8").split("\0") if relative]


def path_findings(path: Path) -> list[str]:
    relative = path.relative_to(ROOT)
    components = set(relative.parts)
    findings: list[str] = []
    if components & FORBIDDEN_COMPONENTS:
        findings.append("local cache, workspace, or learner-data path")
    if "apps" in components and "local-learning" in components and "data" in components:
        findings.append("local learning database/data path")
    if relative.name.startswith(".env") and relative.name != ".env.example":
        findings.append("environment file")
    if relative.name in FORBIDDEN_NAMES:
        findings.append("credential file")
    if relative.suffix.lower() in FORBIDDEN_SUFFIXES:
        findings.append(f"forbidden local-state suffix {relative.suffix}")
    return findings


def content_findings(path: Path) -> list[str]:
    if not path.is_file() or path.stat().st_size > 2_000_000:
        return []
    raw = path.read_bytes()
    if b"\0" in raw[:8_192]:
        return []
    findings: list[str] = []
    for label, pattern in SECRET_PATTERNS:
        match = pattern.search(raw)
        if match:
            line = raw.count(b"\n", 0, match.start()) + 1
            findings.append(f"line {line}: possible {label}")
    return findings


def main() -> int:
    findings: list[str] = []
    for path in tracked_paths():
        relative = path.relative_to(ROOT).as_posix()
        findings.extend(f"{relative}: {finding}" for finding in path_findings(path))
        findings.extend(f"{relative}: {finding}" for finding in content_findings(path))
    if findings:
        print("FAIL")
        print("\n".join(f"- {finding}" for finding in findings))
        return 1
    print("PASS repository hygiene")
    return 0


if __name__ == "__main__":
    sys.exit(main())
