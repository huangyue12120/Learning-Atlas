import hashlib
import json
from pathlib import Path
import re
import tomllib
import unittest
from assessment_review import plain, sections, tokens

ROOT = Path(__file__).resolve().parents[1]


class FollowupToolTests(unittest.TestCase):
    def test_base_environment_and_lock_only_require_lightweight_direct_dependencies(self):
        project = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))["project"]
        direct = {re.split(r"[<>=]", value)[0] for value in project["dependencies"]}
        self.assertEqual(direct, {"marimo", "matplotlib", "numpy"})
        optional = project["optional-dependencies"]
        self.assertTrue(any(value.startswith("torch") for value in optional["deep-learning"]))
        self.assertTrue(any(value.startswith("jax") for value in optional["math"]))
        lock = tomllib.loads((ROOT / "uv.lock").read_text(encoding="utf-8"))
        package = next(package for package in lock["package"] if package["name"] == project["name"])
        self.assertEqual(project["version"], package["version"])
        self.assertEqual(direct, {dependency["name"] for dependency in package["dependencies"]})

    def test_document_split_preserves_archived_content_and_resolves_local_links(self):
        manifest = json.loads((ROOT / "docs/archive-split-manifest.json").read_text(encoding="utf-8"))
        self.assertGreater(len(manifest), 40)
        for entry in manifest:
            path = ROOT / entry["destination"]
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), entry["sha256"], str(path))
            for href in re.findall(r"\]\(([^)\s]+)\)", path.read_text(encoding="utf-8")):
                if not re.match(r"\w+:|#|/", href):
                    self.assertTrue((path.parent / href.split("#")[0]).resolve().exists(), f"{path}: {href}")

    def test_candidates_ignore_fences_and_keep_stable_theory_heading_anchors(self):
        document = '## 概念 <!-- learning-atlas: concept -->\n\n这里是可以用于回看的正文证据，不能直接据此宣布语义审核完成。\n\n```text\n## 伪标题\n```\n\n## 概念\n\n另一段足够长的正文用于验证重复标题。'
        result = sections(document)
        self.assertEqual([row["headingId"] for row in result], ["concept", "概念"])
        self.assertEqual(len(result[0]["paragraphs"]), 1)
        self.assertIn("向量", tokens("向量空间"))
        self.assertEqual(plain('`v1` 与 **v2**'), 'v1与v2')

    def test_reviewed_evidence_can_address_code_and_tables_but_never_a_different_section(self):
        document = '## 命令\n\n```python\n## 这不是新小节\nprint(torch.cuda.is_available())\n```\n\n## 术语\n\n| 名称 | 含义 |\n| --- | --- |\n| VRAM | GPU 上独立于系统 RAM 的显存 |\n'
        parts = sections(document)
        self.assertEqual([part['headingId'] for part in parts], ['命令', '术语'])
        self.assertIn('torch.cuda.is_available()', parts[0]['source'])
        self.assertNotIn('GPU 上独立', parts[0]['source'])
        self.assertIn('GPU 上独立', parts[1]['source'])


if __name__ == "__main__":
    unittest.main()
