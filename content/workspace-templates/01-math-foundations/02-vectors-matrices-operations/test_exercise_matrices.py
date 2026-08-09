import unittest

from exercise_matrices import Matrix, relu


class MatrixExerciseTests(unittest.TestCase):
    def test_matmul(self):
        result = Matrix([[1, 2], [3, 4]]).matmul(Matrix([[5, 6], [7, 8]]))
        self.assertEqual(result.data, [[19, 22], [43, 50]])

    def test_matmul_rejects_incompatible_shapes(self):
        with self.assertRaises(ValueError):
            Matrix([[1, 2]]).matmul(Matrix([[1, 2]]))

    def test_add_bias_broadcasts_one_row(self):
        result = Matrix([[1, 2, 3], [4, 5, 6]]).add_bias(Matrix([[10, 20, 30]]))
        self.assertEqual(result.data, [[11, 22, 33], [14, 25, 36]])

    def test_add_bias_rejects_wrong_shape(self):
        with self.assertRaises(ValueError):
            Matrix([[1, 2], [3, 4]]).add_bias(Matrix([[1], [2]]))

    def test_inverse_2x2(self):
        inverse = Matrix([[4, 7], [2, 6]]).inverse_2x2()
        self.assertEqual(inverse.data, [[0.6, -0.7], [-0.2, 0.4]])

    def test_inverse_rejects_singular_matrix(self):
        with self.assertRaises(ValueError):
            Matrix([[1, 2], [2, 4]]).inverse_2x2()

    def test_relu(self):
        self.assertEqual(relu(Matrix([[-2, 0, 3]])).data, [[0, 0, 3]])


if __name__ == "__main__":
    unittest.main()
