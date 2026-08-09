import math
import unittest

from exercise_information import cross_entropy, entropy, kl_divergence, perplexity


class InformationTests(unittest.TestCase):
    def test_entropy_fair_coin(self):
        self.assertAlmostEqual(entropy([0.5, 0.5]), 1.0)

    def test_cross_entropy_identical(self):
        self.assertAlmostEqual(cross_entropy([0.5, 0.5], [0.5, 0.5]), 1.0)

    def test_kl_identity(self):
        self.assertAlmostEqual(kl_divergence([0.5, 0.5], [0.5, 0.5]), 0.0)

    def test_perplexity(self):
        self.assertAlmostEqual(perplexity(math.log(10)), 10.0)


if __name__ == "__main__":
    unittest.main()
