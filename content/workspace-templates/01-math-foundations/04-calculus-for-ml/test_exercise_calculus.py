import unittest

from exercise_calculus import gradient_descent_1d, hessian_2d, numerical_derivative, numerical_gradient


class CalculusExerciseTests(unittest.TestCase):
    def test_central_difference(self):
        self.assertAlmostEqual(numerical_derivative(lambda x: x ** 2, 3.0), 6.0, places=5)

    def test_gradient(self):
        gradient = numerical_gradient(lambda p: p[0] ** 2 + 3 * p[0] * p[1] + p[1] ** 2, [1.0, 2.0])
        self.assertAlmostEqual(gradient[0], 8.0, places=5)
        self.assertAlmostEqual(gradient[1], 7.0, places=5)

    def test_gradient_has_one_value_per_input(self):
        self.assertEqual(len(numerical_gradient(lambda p: sum(x ** 2 for x in p), [1, 2, 3])), 3)

    def test_gradient_descent_reaches_minimum(self):
        x, history = gradient_descent_1d(lambda x: x ** 2, lambda x: 2 * x, 5.0, steps=80)
        self.assertLess(abs(x), 1e-6)
        self.assertEqual(len(history), 80)

    def test_hessian_of_bowl(self):
        result = hessian_2d(lambda x, y: x ** 2 + y ** 2, 0.0, 0.0)
        self.assertAlmostEqual(result[0][0], 2.0, places=3)
        self.assertAlmostEqual(result[1][1], 2.0, places=3)

    def test_hessian_of_saddle(self):
        result = hessian_2d(lambda x, y: x ** 2 - y ** 2, 0.0, 0.0)
        self.assertAlmostEqual(result[0][0], 2.0, places=3)
        self.assertAlmostEqual(result[1][1], -2.0, places=3)


if __name__ == "__main__":
    unittest.main()
