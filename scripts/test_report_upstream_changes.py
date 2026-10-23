"""Regression checks for GitHub-sized reports and complete review artifacts."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))

import report_upstream_changes as report
from manage_upstreams import Submodule


class ReportSizeTests(unittest.TestCase):
    def setUp(self) -> None:
        for name, value in (("git_text", ""), ("blob", b"source"), ("diff", "+新增中文内容")):
            patcher = patch.object(report, name, return_value=value)
            patcher.start()
            self.addCleanup(patcher.stop)

    def snapshot(self, name: str = "ai-engineering-from-scratch", count: int = 1) -> report.Snapshot:
        module = Submodule(name, report.ROOT / name, "main")
        paths = [f"phases/01-foundations/{number:04d}-lesson/README.md" for number in range(count)]
        changes = tuple(report.Change("M", path, path) for path in paths)
        return report.Snapshot(module, "a" * 40, "b" * 40, changes)

    def artifact(self, snapshot: report.Snapshot) -> report.Artifact:
        return report.Artifact(
            "content/translations/practice/lesson/zh.md", "practice translation",
            snapshot.module.name, snapshot.changes[0].new_path, snapshot.base, "c" * 64,
        )

    def test_no_updates_does_not_require_review(self) -> None:
        result = report.render_report([], [])
        self.assertIn("<!-- upstream-freshness-relevant: false -->", result)

    def test_small_report_keeps_file_and_fingerprint_tables(self) -> None:
        snapshot = self.snapshot()
        result = report.render_report([snapshot], [self.artifact(snapshot)])
        self.assertIn("### 原文改动文件", result)
        self.assertIn("### SHA-256 指纹影响", result)
        self.assertIn("<!-- upstream-freshness-relevant: true -->", result)
        self.assertNotIn(report.TRUNCATION_NOTICE, result)

    def test_large_file_list_keeps_every_upstream_and_review_marker(self) -> None:
        snapshots = [self.snapshot(count=1_000), self.snapshot("maths-cs-ai-compendium", count=1_000)]
        result = report.render_report(snapshots, [self.artifact(snapshots[0])])
        self.assertLessEqual(len((result + "\n").encode("utf-8")), report.MAX_REPORT_BYTES)
        self.assertIn("<!-- upstream-freshness-relevant: true -->", result)
        for snapshot in snapshots:
            self.assertIn(f"{snapshot.module.name}:{snapshot.base}:{snapshot.target}", result)
            self.assertIn(f"{report.UPSTREAM_URLS[snapshot.module.name]}/compare/{snapshot.base}...{snapshot.target}", result)
        self.assertIn("upstream-source-report", result)

    def test_large_unlinked_report_does_not_require_review(self) -> None:
        result = report.render_report([self.snapshot(count=1_000)], [])
        self.assertIn("<!-- upstream-freshness-relevant: false -->", result)
        self.assertLessEqual(len((result + "\n").encode("utf-8")), report.MAX_REPORT_BYTES)

    def test_full_report_preserves_last_file_and_long_unicode_diff(self) -> None:
        snapshot = self.snapshot(count=1_000)
        content = "+中文差异\n" * 5_000
        with patch.object(report, "diff", side_effect=lambda *args: content if args[-1] == snapshot.changes[-1] else ""):
            result = report.render_report([snapshot], [self.artifact(snapshot)], max_bytes=None)
        self.assertIn(snapshot.changes[-1].display_path, result)
        self.assertIn(content, result)
        self.assertNotIn(report.TRUNCATION_NOTICE, result)

    def test_unicode_diff_budget_preserves_utf8_and_closed_fences(self) -> None:
        snapshot = self.snapshot(count=4)
        with patch.object(report, "diff", return_value="+中文差异\n" * 5_000):
            result = report.render_report([snapshot], [self.artifact(snapshot)])
        payload = (result + "\n").encode("utf-8")
        self.assertLessEqual(len(payload), report.MAX_REPORT_BYTES)
        self.assertGreater(len(payload), report.MAX_REPORT_BYTES - 1_000)
        self.assertEqual(payload.decode("utf-8"), result + "\n")
        self.assertEqual(result.count("````") % 2, 0)
        self.assertIn("diff 已截断", result)

    def test_cli_writes_bounded_body_and_complete_artifact(self) -> None:
        snapshot = self.snapshot(count=1_000)
        with tempfile.TemporaryDirectory() as directory:
            body = Path(directory) / "issue.md"
            full = Path(directory) / "full.md"
            with (
                patch.object(report, "tracked_submodules", return_value=[snapshot.module]),
                patch.object(report, "snapshot", return_value=snapshot),
                patch.object(report, "load_artifacts", return_value=[self.artifact(snapshot)]),
                patch("sys.argv", ["report", "--output", str(body), "--full-output", str(full)]),
            ):
                self.assertEqual(report.main(), 0)
            self.assertLessEqual(len(body.read_bytes()), report.MAX_REPORT_BYTES)
            self.assertGreater(len(full.read_bytes()), report.MAX_REPORT_BYTES)
            self.assertIn(snapshot.changes[-1].display_path, full.read_text(encoding="utf-8"))
            self.assertEqual(body.read_bytes().decode("utf-8").count("````") % 2, 0)


class AdaptationGapTests(unittest.TestCase):
    def setUp(self) -> None:
        for name, value in (("git_text", ""), ("blob", b"source"), ("diff", "+new lesson")):
            patcher = patch.object(report, name, return_value=value)
            patcher.start()
            self.addCleanup(patcher.stop)

    def snapshot(self, *changes: tuple[str, str]) -> report.Snapshot:
        module = Submodule("ai-engineering-from-scratch", report.ROOT / "ai-engineering-from-scratch", "main")
        return report.Snapshot(
            module, "a" * 40, "b" * 40,
            tuple(report.Change(status, path, None if status == "D" else path) for status, path in changes),
        )

    def test_new_lesson_in_published_phase_requires_review(self) -> None:
        lesson = "phases/13-tools-and-protocols/99-new-lesson"
        snapshot = self.snapshot(("A", f"{lesson}/docs/en.md"), ("A", f"{lesson}/quiz.json"), ("A", f"{lesson}/code/main.py"))
        gaps = report.adaptation_gaps(snapshot, {})
        self.assertEqual([gap.kind for gap in gaps], ["practice translation", "assessment", "workspace guide"])
        self.assertEqual(gaps[0].expected_path, "content/translations/practice/13-tools-and-protocols/99-new-lesson/zh.md")
        result = report.render_report([snapshot], [])
        self.assertIn("<!-- upstream-freshness-relevant: true -->", result)
        self.assertIn("### 已开放 Phase 中缺少中文适配的上游课程", result)

    def test_new_lesson_in_staged_phase_is_not_a_review_trigger(self) -> None:
        snapshot = self.snapshot(("A", "phases/19-capstone-projects/99-new-capstone/docs/en.md"))
        self.assertEqual(report.adaptation_gaps(snapshot, {}), [])
        self.assertIn("<!-- upstream-freshness-relevant: false -->", report.render_report([snapshot], []))

    def test_translated_or_deleted_lesson_is_not_a_gap(self) -> None:
        path = "phases/13-tools-and-protocols/01-the-tool-interface/docs/en.md"
        artifact = report.Artifact("content/translations/practice/x/zh.md", "practice translation",
                                   "ai-engineering-from-scratch", path, "a" * 40, "c" * 64)
        modified = self.snapshot(("M", path))
        self.assertEqual(report.adaptation_gaps(modified, report.artifact_index([artifact])), [])
        self.assertEqual(report.adaptation_gaps(self.snapshot(("D", path)), {}), [])

    def test_existing_workspace_guide_is_not_a_gap(self) -> None:
        lesson = "phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch"
        snapshot = self.snapshot(("M", f"{lesson}/code/main.py"), ("M", f"{lesson}/code/lab.py"))
        self.assertEqual(report.adaptation_gaps(snapshot, {}), [])
        missing = self.snapshot(("A", "phases/13-tools-and-protocols/99-new/code/main.py"),
                                ("A", "phases/13-tools-and-protocols/99-new/code/lab.py"))
        self.assertEqual(len(report.adaptation_gaps(missing, {})), 1)

    def test_new_theory_note_is_listed_but_not_a_review_trigger(self) -> None:
        module = Submodule("maths-cs-ai-compendium", report.ROOT / "maths-cs-ai-compendium", "main")
        snapshot = report.Snapshot(module, "a" * 40, "b" * 40, (
            report.Change("A", "chapter 01 - vectors/09. new note.md", "chapter 01 - vectors/09. new note.md"),
            report.Change("A", "chapter 01 - vectors/images/new.svg", "chapter 01 - vectors/images/new.svg"),
        ))
        self.assertEqual(report.new_theory_notes(snapshot, {}), ["chapter 01 - vectors/09. new note.md"])
        result = report.render_report([snapshot], [])
        self.assertIn("### 新增理论笔记（仅供参考）", result)
        self.assertIn("<!-- upstream-freshness-relevant: false -->", result)

    def test_truncated_summary_keeps_gap_table(self) -> None:
        filler = [("M", f"site/file-{number:04d}.js") for number in range(3_000)]
        snapshot = self.snapshot(*filler, ("A", "phases/13-tools-and-protocols/99-new-lesson/docs/en.md"))
        with patch.object(report, "diff", return_value="+x\n" * 100):
            result = report.render_report([snapshot], [])
        self.assertLessEqual(len((result + "\n").encode("utf-8")), report.MAX_REPORT_BYTES)
        self.assertIn("缺少中文适配：1", result)
        self.assertIn("99-new-lesson/docs/en.md", result)
        self.assertIn("<!-- upstream-freshness-relevant: true -->", result)


if __name__ == "__main__":
    unittest.main()
