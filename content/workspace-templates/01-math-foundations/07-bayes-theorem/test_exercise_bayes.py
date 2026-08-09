import unittest

from exercise_bayes import bayes, beta_update, laplace_probability, probability_b_better


class BayesTests(unittest.TestCase):
    def test_medical_posterior(self):
        self.assertAlmostEqual(bayes(0.0001, 0.99, 0.01), 0.009803, places=5)

    def test_laplace_smoothing(self):
        self.assertAlmostEqual(laplace_probability(0, 10, 5), 1 / 15)
        self.assertAlmostEqual(laplace_probability(3, 10, 5), 4 / 15)

    def test_beta_update(self):
        self.assertEqual(beta_update(1, 1, 7, 3), (8, 4))

    def test_monte_carlo_comparison(self):
        self.assertEqual(probability_b_better([0.1, 0.3, 0.4], [0.2, 0.2, 0.5]), 2 / 3)


if __name__ == "__main__":
    unittest.main()
