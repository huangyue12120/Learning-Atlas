import unittest
from pathlib import Path
import re
from check_translation_correspondence import structure, differences


class ReviewGateTests(unittest.TestCase):
    def test_known_review_terminology_does_not_return_in_prose(self):
        content = Path(__file__).resolve().parents[1] / "content"
        failures = []
        for path in content.rglob("*"):
            if not path.is_file() or path.suffix not in {".md", ".json", ".yaml"}: continue
            prose = re.sub(r"```.*?```", "", path.read_text(encoding="utf-8"), flags=re.S)
            if re.search(r"奖励(?:黑客|劫持)|自主\s+agent\b|研究代理", prose, re.I): failures.append(str(path.relative_to(content)))
        self.assertEqual(failures, [], "Use the reviewed glossary terms in prose; preserve code identifiers")

    def test_reviewed_translation_rejects_pending_marker(self):
        source = "# 标题\n"
        translation = "---\nstatus: reviewed\n---\n# 标题\n\n> 原文，待中文复核\n"
        self.assertTrue(any("pending Chinese review" in error for error in differences(structure(source), structure(translation), translation)))

    def test_reviewed_translation_without_marker_passes(self):
        source = "# 标题\n"
        translation = "---\nstatus: reviewed\n---\n# 标题\n\n> 已复核说明\n"
        self.assertEqual(differences(structure(source), structure(translation), translation), [])


if __name__ == "__main__":
    unittest.main()
