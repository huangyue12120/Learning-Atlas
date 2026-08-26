#!/usr/bin/env python3
"""Generate a review-ready Markdown report for upstream source changes."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from datetime import date
from pathlib import Path

from manage_upstreams import ROOT, Submodule, tracked_submodules


UPSTREAM_URLS = {
    "ai-engineering-from-scratch": "https://github.com/rohitg00/ai-engineering-from-scratch",
    "maths-cs-ai-compendium": "https://github.com/HenryNdubuaku/maths-cs-ai-compendium",
}
FRONT_MATTER = re.compile(r"\A---\r?\n(?P<body>.*?)\r?\n---\r?\n", re.DOTALL)
SOURCE_BLOCK = re.compile(
    r"^(?P<label>source|practice|theory):\s*\n(?P<body>[\s\S]*?)(?=^[a-z][a-z0-9-]*:\s*$|\Z)",
    re.MULTILINE,
)
FIELD = re.compile(r"^\s{2}(?P<key>repository|path|revision|sha256):\s*(?P<value>.*?)\s*$", re.MULTILINE)
MAX_REPORT_BYTES = 60_000
MAX_DIFF_PER_FILE_CHARS = 12_000
MAX_COMMIT_LINES = 30
TRUNCATION_NOTICE = "\n\n> Issue 正文中的 diff 已达到大小上限或单文件上限；请使用各上游 compare 链接查看未展示部分。"
OUTPUT_TRAILING_NEWLINE = "\n"


@dataclass(frozen=True)
class Artifact:
    path: str
    kind: str
    repository: str
    source_path: str
    revision: str
    sha256: str


@dataclass(frozen=True)
class Change:
    status: str
    old_path: str | None
    new_path: str | None

    @property
    def display_path(self) -> str:
        if self.old_path and self.new_path and self.old_path != self.new_path:
            return f"{self.old_path} → {self.new_path}"
        return self.new_path or self.old_path or "(unknown path)"

    @property
    def paths(self) -> tuple[str, ...]:
        return tuple(path for path in (self.old_path, self.new_path) if path)


@dataclass(frozen=True)
class Snapshot:
    module: Submodule
    base: str
    target: str
    changes: tuple[Change, ...]


def git(module: Path, *arguments: str, check: bool = True) -> bytes:
    completed = subprocess.run(
        ["git", "-C", str(module), *arguments],
        cwd=ROOT,
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if check and completed.returncode != 0:
        detail = completed.stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(f"git {' '.join(arguments)} failed: {detail}")
    return completed.stdout


def git_text(module: Path, *arguments: str) -> str:
    return git(module, *arguments).decode("utf-8", errors="replace").strip()


def source_fields(block: str) -> dict[str, str]:
    return {match["key"]: match["value"].strip().strip('"') for match in FIELD.finditer(block)}


def add_artifact(artifacts: list[Artifact], path: Path, kind: str, label: str, document: str) -> None:
    match = next((candidate for candidate in SOURCE_BLOCK.finditer(document) if candidate["label"] == label), None)
    if not match:
        return
    fields = source_fields(match.group("body"))
    required = {"repository", "path"}
    if not required.issubset(fields):
        return
    artifacts.append(
        Artifact(
            path=path.relative_to(ROOT).as_posix(),
            kind=kind,
            repository=fields["repository"],
            source_path=fields["path"],
            revision=fields.get("revision", "unknown"),
            sha256=fields.get("sha256", ""),
        )
    )


def load_artifacts() -> list[Artifact]:
    artifacts: list[Artifact] = []
    translation_root = ROOT / "content" / "translations"
    for path in sorted(translation_root.glob("**/zh.md")):
        document = path.read_text(encoding="utf-8")
        front_matter = FRONT_MATTER.match(document)
        if front_matter:
            kind = "practice translation" if "/practice/" in path.as_posix() else "theory translation"
            add_artifact(artifacts, path, kind, "source", front_matter.group("body"))

    for path in sorted((ROOT / "content" / "assessments").glob("**/zh.json")):
        try:
            source = json.loads(path.read_text(encoding="utf-8")).get("source", {})
        except (OSError, json.JSONDecodeError, AttributeError):
            continue
        if not isinstance(source, dict) or not source.get("repository") or not source.get("path"):
            continue
        artifacts.append(
            Artifact(
                path=path.relative_to(ROOT).as_posix(),
                kind="assessment",
                repository=str(source["repository"]),
                source_path=str(source["path"]),
                revision=str(source.get("revision", "unknown")),
                sha256=str(source.get("sha256", "")),
            )
        )

    for path in sorted((ROOT / "content" / "theory-links").glob("**/*.yaml")):
        document = path.read_text(encoding="utf-8")
        add_artifact(artifacts, path, "theory link / practice", "practice", document)
        add_artifact(artifacts, path, "theory link / theory", "theory", document)
    return artifacts


def parse_changes(output: bytes) -> tuple[Change, ...]:
    parts = output.decode("utf-8", errors="replace").split("\0")
    changes: list[Change] = []
    index = 0
    while index < len(parts):
        status = parts[index]
        index += 1
        if not status:
            continue
        code = status[:1]
        if code in {"R", "C"}:
            if index + 1 >= len(parts):
                raise RuntimeError(f"incomplete rename record: {status}")
            changes.append(Change(status, parts[index], parts[index + 1]))
            index += 2
        else:
            if index >= len(parts):
                raise RuntimeError(f"missing path for change record: {status}")
            path = parts[index]
            index += 1
            changes.append(Change(status, path, None if code == "D" else path))
    return tuple(changes)


def snapshot(module: Submodule) -> Snapshot | None:
    base = git_text(module.path, "rev-parse", "HEAD")
    target = git_text(module.path, "rev-parse", f"origin/{module.branch}")
    if base == target:
        return None
    changes = parse_changes(git(module.path, "diff", "--name-status", "--find-renames", "-z", base, target))
    return Snapshot(module, base, target, changes)


def blob(module: Path, revision: str, path: str) -> bytes | None:
    result = subprocess.run(
        ["git", "-C", str(module), "show", f"{revision}:{path}"],
        cwd=ROOT,
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    return result.stdout if result.returncode == 0 else None


def digest(value: bytes | None) -> str:
    return hashlib.sha256(value).hexdigest() if value is not None else ""


def diff(module: Path, base: str, target: str, change: Change) -> str:
    paths = [path for path in change.paths]
    return git(
        module,
        "diff",
        "--no-ext-diff",
        "--find-renames",
        "--unified=12",
        base,
        target,
        "--",
        *paths,
    ).decode("utf-8", errors="replace").strip()


def markdown_cell(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", " ")


def artifact_index(artifacts: list[Artifact]) -> dict[tuple[str, str], list[Artifact]]:
    index: dict[tuple[str, str], list[Artifact]] = {}
    for artifact in artifacts:
        index.setdefault((artifact.repository, artifact.source_path), []).append(artifact)
    return index


def changed_artifacts(snapshot: Snapshot, index: dict[tuple[str, str], list[Artifact]]) -> list[Artifact]:
    result: dict[tuple[str, str], Artifact] = {}
    for change in snapshot.changes:
        for path in change.paths:
            for artifact in index.get((snapshot.module.name, path), []):
                result[(artifact.path, artifact.kind)] = artifact
    return sorted(result.values(), key=lambda artifact: (artifact.path, artifact.kind))


def diagnosis(module: Submodule, snapshot: Snapshot, artifact: Artifact) -> tuple[str, str]:
    current = blob(module.path, snapshot.base, artifact.source_path)
    target = blob(module.path, snapshot.target, artifact.source_path)
    current_hash = digest(current)
    target_hash = digest(target)
    if target is None:
        return "原文在目标 revision 中已删除", target_hash
    if artifact.sha256 and current_hash != artifact.sha256:
        return "锁定快照已有 SHA-256 漂移", target_hash
    if artifact.sha256 and target_hash != artifact.sha256:
        return "确认 SHA-256 漂移，需要更新并人工复核", target_hash
    return "目标文件内容未造成已记录指纹漂移", target_hash


def render_snapshot(snapshot: Snapshot, index: dict[tuple[str, str], list[Artifact]]) -> tuple[str, str, int]:
    module = snapshot.module
    linked = changed_artifacts(snapshot, index)
    linked_by_source: dict[str, list[Artifact]] = {}
    for artifact in linked:
        linked_by_source.setdefault(artifact.source_path, []).append(artifact)

    compare_url = f"{UPSTREAM_URLS.get(module.name, '')}/compare/{snapshot.base}...{snapshot.target}"
    lines = [
        f"## `{module.name}`",
        "",
        f"- 锁定 revision：`{snapshot.base}`",
        f"- 上游 `{module.branch}`：`{snapshot.target}`",
        f"- 对比：{compare_url}",
        "",
        "### 原文改动文件",
        "",
        "| 状态 | 上游文件 | 关联的本地内容 |",
        "| --- | --- | --- |",
    ]
    for change in snapshot.changes:
        references: list[str] = []
        for path in change.paths:
            references.extend(
                f"`{artifact.path}`（{artifact.kind}）"
                for artifact in linked_by_source.get(path, [])
            )
        unique_references = list(dict.fromkeys(references))
        lines.append(
            f"| `{markdown_cell(change.status)}` | `{markdown_cell(change.display_path)}` | "
            f"{'; '.join(unique_references) if unique_references else '无已记录的中文内容关联'} |"
        )

    if linked:
        lines.extend(
            [
                "",
                "### SHA-256 指纹影响",
                "",
                "| 本地内容 | 原文路径 | 已记录 revision | 已记录 SHA-256 | 目标 SHA-256 | 判断 |",
                "| --- | --- | --- | --- | --- | --- |",
            ]
        )
        for artifact in linked:
            result, target_hash = diagnosis(module, snapshot, artifact)
            lines.append(
                f"| `{artifact.path}`（{artifact.kind}） | `{markdown_cell(artifact.source_path)}` | "
                f"`{artifact.revision}` | `{artifact.sha256 or '未记录'}` | "
                f"`{target_hash or '文件不存在'}` | {result} |"
            )
    else:
        lines.extend(
            [
                "",
                "> 当前上游提交没有命中已记录的译文、测验或理论关联来源；仍需确认是否新增课程、"
                "改动了尚未接入的内容，或仅改动了生成文件。",
            ]
        )

    commits = git_text(module.path, "log", "--format=%h%x09%ad%x09%s", "--date=short", f"{snapshot.base}..{snapshot.target}")
    commit_lines = commits.splitlines()
    if len(commit_lines) > MAX_COMMIT_LINES:
        remaining = len(commit_lines) - MAX_COMMIT_LINES
        commit_lines = [
            *commit_lines[:MAX_COMMIT_LINES],
            f"... 另有 {remaining} 个提交，请打开上方 compare 链接查看。",
        ]
    lines.extend(["", "### 上游提交", "", "```text", "\n".join(commit_lines) or "（无提交摘要）", "```"])
    return "\n".join(lines), module.name, len(linked)


def render_report(snapshots: list[Snapshot], artifacts: list[Artifact]) -> str:
    if not snapshots:
        return "# 上游原文更新待审核\n\n当前没有检测到领先于锁定快照的上游提交。"

    key = ";".join(f"{item.module.name}:{item.base}:{item.target}" for item in snapshots)
    index = artifact_index(artifacts)
    sections: list[str] = []
    for item in snapshots:
        section, _, _ = render_snapshot(item, index)
        sections.append(section)

    lines = [
        "# 上游原文更新待审核",
        "",
        f"<!-- upstream-freshness-key: {key} -->",
        "",
        f"检测日期：{date.today().isoformat()}",
        "",
        "上游分支已经领先于 Learning Atlas 当前锁定的 submodule revision。"
        "本 Issue 只记录事实和待审核范围，不会自动覆盖中文内容或自动批准理论关联。",
        "",
        "如果下表出现“确认 SHA-256 漂移”，说明目标 revision 的英文原文已不同于本地内容元数据中记录的指纹；"
        "请逐项更新译文、测验或理论关联，并完成人工复核后再同步 submodule 指针。",
        "",
        *sections,
        "",
        "## 建议处理顺序",
        "",
        "1. 阅读上游对比链接和下方 diff，确认改动是否影响学习语义。",
        "2. 更新受影响的中文内容及其 `revision` / `sha256`，保留结构对应关系。",
        "3. 运行 `python3 scripts/check_translation_correspondence.py`、"
        "`python3 scripts/check_source_fingerprints.py` 和应用测试。",
        "4. 通过验证后关闭本 Issue；上游 freshness workflow 的失败本身不代表网络或权限故障。",
    ]

    report = "\n".join(lines)
    detail_prefix = "\n\n## 具体位置与内容差异\n\n"
    detail_budget = MAX_REPORT_BYTES - len(
        (report + detail_prefix + TRUNCATION_NOTICE + OUTPUT_TRAILING_NEWLINE).encode("utf-8")
    )
    details: list[str] = []
    details_truncated = False
    for item in snapshots:
        index_for_item = artifact_index(artifacts)
        ordered_changes = sorted(
            item.changes,
            key=lambda change: not any(index_for_item.get((item.module.name, path)) for path in change.paths),
        )
        for change in ordered_changes:
            paths = change.paths
            should_include = any(
                path.startswith("phases/") or path.startswith("chapter ")
                for path in paths
            ) or any(index_for_item.get((item.module.name, path)) for path in paths)
            if not should_include or detail_budget <= 0:
                if should_include:
                    details_truncated = True
                continue
            content = diff(item.module.path, item.base, item.target, change)
            if not content:
                continue
            if len(content) > MAX_DIFF_PER_FILE_CHARS:
                content = content[:MAX_DIFF_PER_FILE_CHARS]
                details_truncated = True
            candidate = (
                f"### `{item.module.name}` · `{change.display_path}`\n\n"
                f"````diff\n{content}\n````"
            )
            candidate_bytes = len(candidate.encode("utf-8"))
            separator_bytes = 2 if details else 0
            if candidate_bytes + separator_bytes <= detail_budget:
                details.append(candidate)
                detail_budget -= candidate_bytes + separator_bytes
                continue
            details_truncated = True
            if detail_budget <= 1_000:
                continue
            heading = f"### `{item.module.name}` · `{change.display_path}`\n\n````diff\n"
            footer = "\n... diff 已截断；请打开上方 compare 链接查看完整内容。\n````"
            content_budget = detail_budget - separator_bytes - len((heading + footer).encode("utf-8"))
            if content_budget > 0:
                shortened = content.encode("utf-8")[:content_budget].decode("utf-8", errors="ignore")
                details.append(heading + shortened + footer)
                detail_budget = 0
    if details:
        report += detail_prefix + "\n\n".join(details)
    if details_truncated:
        report += TRUNCATION_NOTICE
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("upstream-report.md"),
        help="Markdown output path (default: upstream-report.md)",
    )
    args = parser.parse_args()
    try:
        modules = tracked_submodules()
        snapshots = [item for module in modules if (item := snapshot(module))]
        report = render_report(snapshots, load_artifacts())
        output = args.output if args.output.is_absolute() else ROOT / args.output
        output.write_text(report + "\n", encoding="utf-8")
        if snapshots:
            print(f"Wrote upstream change report: {output}")
        else:
            print("No upstream changes found; wrote an empty review report.")
        return 0
    except (OSError, RuntimeError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
