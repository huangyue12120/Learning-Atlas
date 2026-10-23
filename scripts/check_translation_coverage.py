#!/usr/bin/env python3
"""Check Chinese practice translation coverage in published upstream phases."""

from __future__ import annotations

import argparse
import hashlib
import subprocess
import sys
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date
from pathlib import Path

from manage_upstreams import ROOT, Submodule, tracked_submodules
from published_scope import PRACTICE_REPOSITORY, PUBLISHED_PRACTICE_PHASES, expected_adaptation, phase_key
from report_upstream_changes import Artifact, load_artifacts


REPOSITORY = PRACTICE_REPOSITORY


@dataclass(frozen=True)
class MissingTranslation:
    source_path: str
    expected_path: str
    phase: str
    kind: str = "practice translation"


def find_module() -> Submodule:
    for module in tracked_submodules():
        if module.name == REPOSITORY:
            return module
    raise RuntimeError(f"tracked submodule not found: {REPOSITORY}")


def recorded_sources(artifacts: list[Artifact]) -> set[tuple[str, str]]:
    """Return ``(kind, source path)`` pairs that already have a local adaptation."""

    return {
        (artifact.kind, artifact.source_path)
        for artifact in artifacts
        if artifact.repository == REPOSITORY and artifact.kind in {"practice translation", "assessment"}
    }


def local_file_exists(relative_path: str) -> bool:
    return (ROOT / relative_path).is_file()


def missing_translations(
    module: Submodule,
    artifacts: list[Artifact],
    exists: Callable[[str], bool] = local_file_exists,
) -> tuple[set[str], list[MissingTranslation]]:
    """List published upstream lessons without a Chinese translation, assessment or workspace guide.

    Translations and assessments are matched through their recorded source path.
    Workspace guides carry no source fingerprint, so a guide counts as present
    when its file exists for a lesson whose ``code/`` has a top-level ``.py``.
    """

    recorded = recorded_sources(artifacts)
    active_phases = {phase for phase in PUBLISHED_PRACTICE_PHASES if (module.path / phase).is_dir()}
    candidates = [
        *module.path.glob("phases/*/*/docs/en.md"),
        *module.path.glob("phases/*/*/quiz.json"),
        *module.path.glob("phases/*/*/code/*.py"),
    ]
    missing: dict[tuple[str, str], MissingTranslation] = {}
    for source in sorted(candidates):
        source_path = source.relative_to(module.path).as_posix()
        phase = phase_key(source_path)
        expected = expected_adaptation(source_path)
        if phase not in active_phases or expected is None:
            continue
        kind, expected_path = expected
        if kind == "workspace guide":
            if exists(expected_path):
                continue
            source_path = source_path.rsplit("/", 1)[0] + "/"
        elif (kind, source_path) in recorded:
            continue
        missing.setdefault((kind, expected_path), MissingTranslation(source_path, expected_path, phase, kind))
    order = {"practice translation": 0, "assessment": 1, "workspace guide": 2}
    return active_phases, sorted(missing.values(), key=lambda item: (order[item.kind], item.source_path))


def render_report(module: Submodule, revision: str, active_phases: set[str], missing: list[MissingTranslation]) -> str:
    if not missing:
        return (
            "# 中文实践译文覆盖报告\n\n"
            f"截至 `{revision}`，已进入中文学习范围的 {len(active_phases)} 个 Phase 均没有发现缺失的实践译文、中文测验或练习指南。"
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
        "下列上游课程原文、测验或 Python 实作位于已开放 Phase，但没有对应的中文改编：",
        "",
        "| 类型 | Phase | 上游原文 | 建议的中文路径 |",
        "| --- | --- | --- | --- |",
    ]
    labels = {"practice translation": "实践译文", "assessment": "中文测验", "workspace guide": "练习指南"}
    for item in missing:
        lines.append(f"| {labels[item.kind]} | `{item.phase}` | `{item.source_path}` | `{item.expected_path}` |")
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
        help="Markdown output path; prints the report to stdout when omitted",
    )
    parser.add_argument(
        "--fail-on-missing",
        action="store_true",
        help="return exit code 2 when an active published phase is missing translations, assessments or workspace guides",
    )
    args = parser.parse_args()
    try:
        module = find_module()
        revision = subprocess_revision(module)
        active_phases, missing = missing_translations(module, load_artifacts())
        report = render_report(module, revision, active_phases, missing)
        if args.output:
            output = args.output if args.output.is_absolute() else ROOT / args.output
            output.write_text(report + "\n", encoding="utf-8")
        else:
            print(report)
        counts = {kind: sum(item.kind == kind for item in missing) for kind in ("practice translation", "assessment", "workspace guide")}
        print(
            f"Checked {len(active_phases)} published phases: {len(missing)} missing adaptations "
            f"({counts['practice translation']} practice translations, {counts['assessment']} assessments, "
            f"{counts['workspace guide']} workspace guides)"
        )
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
