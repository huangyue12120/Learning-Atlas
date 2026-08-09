import math
import unittest

from exercise_distances import cosine_similarity, edit_distance, jaccard_similarity, l1_distance, l2_distance


class DistanceTests(unittest.TestCase):
    def test_norm_distances(self):
        self.assertEqual(l1_distance([1, 2, 3], [4, 0, 6]), 8)
        self.assertAlmostEqual(l2_distance([1, 2, 3], [4, 0, 6]), math.sqrt(22))

    def test_cosine(self):
        self.assertAlmostEqual(cosine_similarity([1, 2], [2, 4]), 1)

    def test_jaccard(self):
        self.assertAlmostEqual(jaccard_similarity({"cat", "dog"}, {"cat", "fish"}), 1 / 3)

    def test_edit(self):
        self.assertEqual(edit_distance("kitten", "sitting"), 3)


if __name__ == "__main__":
    unittest.main()
