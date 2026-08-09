import unittest

from exercise_optimization import exponential_learning_rate, gradient_descent_step, momentum_step


class OptimizationTests(unittest.TestCase):
    def test_gradient_descent(self):
        self.assertEqual(gradient_descent_step([2.0, -1.0], [3.0, -4.0], 0.1), [1.7, -0.6])

    def test_momentum(self):
        params, velocity = momentum_step([1.0], [2.0], [0.5], 0.1, 0.9)
        self.assertAlmostEqual(velocity[0], 2.45)
        self.assertAlmostEqual(params[0], 0.755)

    def test_decay(self):
        self.assertAlmostEqual(exponential_learning_rate(0.1, 2), 0.1 * 0.999 ** 2)


if __name__ == "__main__":
    unittest.main()
