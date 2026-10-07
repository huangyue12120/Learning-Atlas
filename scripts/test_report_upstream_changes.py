"""Regression checks for GitHub-sized reports and complete review artifacts."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

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


if __name__ == "__main__":
    unittest.main()
