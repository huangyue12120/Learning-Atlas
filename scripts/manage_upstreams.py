#!/usr/bin/env python3
"""Check or synchronize the tracked upstream submodules without publishing changes."""

from __future__ import annotations

import argparse
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class Submodule:
    name: str
    path: Path
    branch: str


def run(*args: str, capture: bool = False) -> str:
    completed = subprocess.run(
        args,
        cwd=ROOT,
        check=True,
        text=True,
        stdout=subprocess.PIPE if capture else None,
    )
    return completed.stdout.strip() if capture else ""


def tracked_submodules() -> list[Submodule]:
    entries = run("git", "config", "-f", ".gitmodules", "--get-regexp", r"^submodule\..*\.path$", capture=True)
    modules: list[Submodule] = []
    for entry in entries.splitlines():
        key, relative_path = entry.split(maxsplit=1)
        name = key.removeprefix("submodule.").removesuffix(".path")
        branch = run("git", "config", "-f", ".gitmodules", "--get", f"submodule.{name}.branch", capture=True)
        if not branch:
            raise ValueError(f"{name}: missing tracked branch in .gitmodules")
        modules.append(Submodule(name, ROOT / relative_path, branch))
    return modules


def compare(module: Submodule, fetch: bool) -> bool:
    if fetch:
        run("git", "-C", str(module.path), "fetch", "--quiet", "origin", module.branch)
    current = run("git", "-C", str(module.path), "rev-parse", "HEAD", capture=True)
    target = run("git", "-C", str(module.path), "rev-parse", f"origin/{module.branch}", capture=True)
    if current == target:
        print(f"CURRENT {module.name}: {current[:12]} ({module.branch})")
        return False
    commits = run("git", "-C", str(module.path), "log", "--oneline", f"{current}..{target}", capture=True)
    print(f"UPDATE {module.name}: {current[:12]} -> {target[:12]} ({module.branch})")
    if commits:
        print(commits)
    return True


def validate() -> None:
    run(sys.executable, "scripts/check_translation_correspondence.py")
    run(sys.executable, "scripts/check_source_fingerprints.py")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="fetch and report whether tracked branches have new commits")
    parser.add_argument("--sync", action="store_true", help="move submodules to their tracked branches, then run content checks")
    parser.add_argument("--no-fetch", action="store_true", help="compare against local remote-tracking refs only")
    parser.add_argument("--fail-on-update", action="store_true", help="return a nonzero status when --check finds updates")
    args = parser.parse_args()
    if args.check == args.sync:
        parser.error("choose exactly one of --check or --sync")
    if args.no_fetch and args.sync:
        parser.error("--no-fetch is only valid with --check")

    modules = tracked_submodules()
    if args.sync:
        run("git", "submodule", "sync", "--recursive")
        run("git", "submodule", "update", "--init", "--recursive")
        run("git", "submodule", "update", "--remote", "--checkout", "--recursive")
        print("Submodules synchronized. Reviewing versioned content against the new source snapshots:")
        validate()
        return 0

    has_update = False
    for module in modules:
        has_update = compare(module, fetch=not args.no_fetch) or has_update
    return 2 if has_update and args.fail_on_update else 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (subprocess.CalledProcessError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
