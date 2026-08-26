#!/usr/bin/env python3
"""Check Chinese practice translation coverage in published upstream phases."""

from __future__ import annotations

import argparse
import hashlib
import subprocess
import sys
from dataclasses import dataclass
from datetime import date
from pathlib import Path, PurePosixPath

from manage_upstreams import ROOT, Submodule, tracked_submodules
from report_upstream_changes import Artifact, load_artifacts


REPOSITORY = "ai-engineering-from-scratch"


@dataclass(frozen=True)
class MissingTranslation:
    source_path: str
    expected_path: str
    phase: str


def find_module() -> Submodule:
    for module in tracked_submodules():
        if module.name == REPOSITORY:
            return module
    raise RuntimeError(f"tracked submodule not found: {REPOSITORY}")


def phase_key(source_path: str) -> str | None:
    parts = PurePosixPath(source_path).parts
    if len(parts) < 2 or parts[0] != "phases":
        return None
    return "/".join(parts[:2])


def expected_translation_path(source_path: str) -> str | None:
    parts = PurePosixPath(source_path).parts
    if len(parts) < 4 or parts[0] != "phases":
        return None
    return f"content/translations/practice/{parts[1]}/{parts[2]}/zh.md"


def practice_translation_sources(artifacts: list[Artifact]) -> dict[str, list[Artifact]]:
    result: dict[str, list[Artifact]] = {}
    for artifact in artifacts:
        if artifact.repository != REPOSITORY or artifact.kind != "practice translation":
            continue
        result.setdefault(artifact.source_path, []).append(artifact)
    return result


def missing_translations(module: Submodule, artifacts: list[Artifact]) -> tuple[set[str], list[MissingTranslation]]:
    source_map = practice_translation_sources(artifacts)
    active_phases = {
        phase
        for source_path in source_map
        if (phase := phase_key(source_path)) is not None
    }
    missing: list[MissingTranslation] = []
    for source in sorted(module.path.glob("phases/*/*/docs/en.md")):
        source_path = source.relative_to(module.path).as_posix()
        phase = phase_key(source_path)
        expected = expected_translation_path(source_path)
        if phase not in active_phases or expected is None or source_path in source_map:
            continue
        missing.append(MissingTranslation(source_path, expected, phase))
    return active_phases, missing


def render_report(module: Submodule, revision: str, active_phases: set[str], missing: list[MissingTranslation]) -> str:
    if not missing:
        return (
            "# 中文实践译文覆盖报告\n\n"
            f"截至 `{revision}`，已进入中文学习范围的 {len(active_phases)} 个 Phase 均没有发现缺失的实践译文。"
        )

    missing_paths = "\n".join(item.source_path for item in missing)
    digest = hashlib.sha256(missing_paths.encode("utf-8")).hexdigest()[:16]
    key = f"{module.name}:{revision}:missing:{digest}"
    lines = [
        "# 中文实践译文覆盖待处理",
        "",
        f"<!-- translation-coverage-key: {key} -->",
        "",
        f"检测日期：{date.today().isoformat()}",
        f"上游 revision：`{revision}`",
        "",
        f"检查范围：已有中文实践译文的 {len(active_phases)} 个 Phase。尚未进入中文学习范围的 Phase 不在本报告中。",
        "",
        "下列上游课程原文位于已开放 Phase，但没有对应的中文实践译文：",
        "",
        "| Phase | 上游原文 | 建议的中文路径 |",
        "| --- | --- | --- |",
    ]
    for item in missing:
        lines.append(f"| `{item.phase}` | `{item.source_path}` | `{item.expected_path}` |")
    lines.extend(
        [
            "",
            "建议为每个条目创建中文改编，补齐来源 `revision` / `sha256`，完成结构对应检查后再接入阅读器。",
        ]
    )
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("translation-coverage-report.md"),
        help="Markdown output path (default: translation-coverage-report.md)",
    )
    parser.add_argument(
        "--fail-on-missing",
        action="store_true",
        help="return exit code 2 when an active published phase is missing translations",
    )
    args = parser.parse_args()
    try:
        module = find_module()
        revision = subprocess_revision(module)
        active_phases, missing = missing_translations(module, load_artifacts())
        report = render_report(module, revision, active_phases, missing)
        output = args.output if args.output.is_absolute() else ROOT / args.output
        output.write_text(report + "\n", encoding="utf-8")
        print(f"Checked {len(active_phases)} published phases: {len(missing)} missing translations")
        return 2 if missing and args.fail_on_missing else 0
    except (OSError, RuntimeError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1


def subprocess_revision(module: Submodule) -> str:
    completed = subprocess.run(
        ["git", "-C", str(module.path), "rev-parse", "HEAD"],
        cwd=ROOT,
        check=True,
        text=True,
        stdout=subprocess.PIPE,
    )
    return completed.stdout.strip()


if __name__ == "__main__":
    raise SystemExit(main())
