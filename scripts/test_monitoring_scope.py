"""Keep the monitored scope aligned with the reader and check coverage detection."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import check_translation_coverage as coverage
from manage_upstreams import Submodule
from published_scope import PUBLISHED_PRACTICE_PHASES, expected_adaptation, server_phase_slugs
from report_upstream_changes import Artifact


class PublishedScopeTests(unittest.TestCase):
    def test_monitoring_scope_matches_reader_phases(self) -> None:
        self.assertEqual(server_phase_slugs(), PUBLISHED_PRACTICE_PHASES)

    def test_expected_adaptation_paths(self) -> None:
        self.assertEqual(
            expected_adaptation("phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/quiz.json"),
            ("assessment", "content/assessments/practice/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/zh.json"),
        )
        self.assertIsNone(expected_adaptation("phases/19-capstone-projects/01-terminal-native-coding-agent/docs/en.md"))
        self.assertEqual(
            expected_adaptation("phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/code/main.py"),
            ("workspace guide", "content/workspace-templates/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/EXERCISES.md"),
        )
        self.assertIsNone(expected_adaptation("phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/code/tests/test_main.py"))
        self.assertIsNone(expected_adaptation("phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/code/main.ts"))


class CoverageTests(unittest.TestCase):
    def test_reports_missing_translation_and_assessment(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for lesson in ("01-done", "02-new", "03-typescript"):
                lesson_dir = root / "phases/13-tools-and-protocols" / lesson
                (lesson_dir / "docs").mkdir(parents=True)
                (lesson_dir / "code").mkdir()
                (lesson_dir / "docs/en.md").write_text("# Lesson\n", encoding="utf-8")
                (lesson_dir / "quiz.json").write_text("{}", encoding="utf-8")
                for name in (("main.ts",) if lesson == "03-typescript" else ("main.py", "lab.py")):
                    (lesson_dir / "code" / name).write_text("", encoding="utf-8")
            staged = root / "phases/19-capstone-projects/01-staged/docs"
            staged.mkdir(parents=True)
            (staged / "en.md").write_text("# Staged\n", encoding="utf-8")
            module = Submodule("ai-engineering-from-scratch", root, "main")
            recorded = [
                Artifact("t", "practice translation", "ai-engineering-from-scratch",
                         "phases/13-tools-and-protocols/01-done/docs/en.md", "r", "s"),
                Artifact("a", "assessment", "ai-engineering-from-scratch",
                         "phases/13-tools-and-protocols/01-done/quiz.json", "r", "s"),
            ]
            recorded += [
                Artifact("t3", "practice translation", "ai-engineering-from-scratch",
                         "phases/13-tools-and-protocols/03-typescript/docs/en.md", "r", "s"),
                Artifact("a3", "assessment", "ai-engineering-from-scratch",
                         "phases/13-tools-and-protocols/03-typescript/quiz.json", "r", "s"),
            ]
            guides = {"content/workspace-templates/13-tools-and-protocols/01-done/EXERCISES.md"}
            active, missing = coverage.missing_translations(module, recorded, exists=guides.__contains__)
        self.assertEqual(active, {"phases/13-tools-and-protocols"})
        self.assertEqual(
            [(item.kind, item.source_path) for item in missing],
            [
                ("practice translation", "phases/13-tools-and-protocols/02-new/docs/en.md"),
                ("assessment", "phases/13-tools-and-protocols/02-new/quiz.json"),
                # One guide gap per lesson, even with two Python files; TypeScript-only code needs none.
                ("workspace guide", "phases/13-tools-and-protocols/02-new/code/"),
            ],
        )


if __name__ == "__main__":
    unittest.main()
