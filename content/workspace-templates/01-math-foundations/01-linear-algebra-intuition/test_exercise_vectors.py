import unittest

from exercise_vectors import Matrix, Vector


class VectorExerciseTests(unittest.TestCase):
    def test_dot_product(self):
        self.assertEqual(Vector([1, 2, 3]).dot(Vector([4, 5, 6])), 32)

    def test_dot_product_rejects_different_dimensions(self):
        with self.assertRaises(ValueError):
            Vector([1, 2]).dot(Vector([1, 2, 3]))

    def test_normalize_returns_a_unit_vector(self):
        unit = Vector([3, 4]).normalize()
        self.assertAlmostEqual(unit.components[0], 0.6)
        self.assertAlmostEqual(unit.components[1], 0.8)
        self.assertAlmostEqual(unit.magnitude(), 1.0)

    def test_normalize_rejects_the_zero_vector(self):
        with self.assertRaises(ValueError):
            Vector([0, 0]).normalize()

    def test_projection(self):
        projection = Vector([3, 4]).project_onto(Vector([1, 0]))
        self.assertEqual(projection.components, [3, 0])

    def test_matrix_vector_multiplication(self):
        result = Matrix([[0, -1], [1, 0]]).multiply_vector(Vector([3, 1]))
        self.assertEqual(result.components, [-1, 3])

    def test_matrix_vector_multiplication_rejects_bad_shape(self):
        with self.assertRaises(ValueError):
            Matrix([[1, 0], [0, 1]]).multiply_vector(Vector([1, 2, 3]))


if __name__ == "__main__":
    unittest.main()
