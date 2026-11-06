import unittest
from check_translation_correspondence import structure, differences


class ReviewGateTests(unittest.TestCase):
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
