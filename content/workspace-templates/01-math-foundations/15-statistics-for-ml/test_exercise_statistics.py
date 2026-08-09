import unittest

from exercise_statistics import mean, percentile, pearson_correlation, sample_variance


class StatisticsTests(unittest.TestCase):
    def test_mean(self):
        self.assertEqual(mean([1, 2, 3]), 2)

    def test_sample_variance(self):
        self.assertEqual(sample_variance([1, 2, 3]), 1)

    def test_pearson(self):
        self.assertAlmostEqual(pearson_correlation([1, 2, 3], [2, 4, 6]), 1)

    def test_percentile(self):
        self.assertEqual(percentile([1, 2, 3, 4], 50), 2.5)


if __name__ == "__main__":
    unittest.main()
