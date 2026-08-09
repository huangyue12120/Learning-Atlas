import unittest

from exercise_stochastic import stationary_distribution


class StochasticExerciseTests(unittest.TestCase):
    def test_stationary_distribution(self):
        transition = [[0.9, 0.1], [0.3, 0.7]]
        result = stationary_distribution(transition)
        self.assertAlmostEqual(result[0], 0.75, places=3)
        self.assertAlmostEqual(result[1], 0.25, places=3)


if __name__ == "__main__":
    unittest.main()
