import math
import unittest

from exercise_transformations import det_2x2, eigenvalues_2x2, mat_mul, mat_vec_mul, rotation_2d


class TransformationExerciseTests(unittest.TestCase):
    def test_rotation_90_degrees(self):
        result = mat_vec_mul(rotation_2d(math.pi / 2), [1, 0])
        self.assertAlmostEqual(result[0], 0, places=9)
        self.assertAlmostEqual(result[1], 1, places=9)

    def test_matrix_vector_multiplication(self):
        self.assertEqual(mat_vec_mul([[2, 0], [0, 3]], [4, 5]), [8, 15])

    def test_matrix_vector_rejects_bad_shape(self):
        with self.assertRaises(ValueError):
            mat_vec_mul([[1, 2]], [1])

    def test_composition_order(self):
        rotation = [[0, -1], [1, 0]]
        scale = [[2, 0], [0, 0.5]]
        self.assertEqual(mat_vec_mul(mat_mul(scale, rotation), [1, 0]), [0, 0.5])
        self.assertEqual(mat_vec_mul(mat_mul(rotation, scale), [1, 0]), [0, 2])

    def test_matrix_multiply_rejects_bad_shape(self):
        with self.assertRaises(ValueError):
            mat_mul([[1, 2]], [[1, 2]])

    def test_determinant(self):
        self.assertEqual(det_2x2([[4, 7], [2, 6]]), 10)

    def test_eigenvalues(self):
        self.assertEqual(set(eigenvalues_2x2([[2, 1], [1, 2]])), {1, 3})


if __name__ == "__main__":
    unittest.main()
