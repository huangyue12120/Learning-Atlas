import unittest
import numpy as np

from exercise_svd import compression_ratio, pseudoinverse, reconstruct, truncated_reconstruction


class SVDTests(unittest.TestCase):
    def test_reconstruct(self):
        U = np.eye(2)
        S = np.array([3., 2.])
        Vt = np.eye(2)
        np.testing.assert_allclose(reconstruct(U, S, Vt), np.diag(S))

    def test_ratio(self):
        self.assertAlmostEqual(compression_ratio(10, 20, 2), 2 * 31 / 200)

    def test_rank_one(self):
        A = np.array([[1., 2.], [2., 4.]])
        np.testing.assert_allclose(truncated_reconstruction(A, 1), A)

    def test_pseudoinverse(self):
        A = np.array([[1., 1.], [2., 1.], [3., 1.]])
        np.testing.assert_allclose(pseudoinverse(A) @ np.array([3., 5., 6.]), np.linalg.lstsq(A, [3., 5., 6.], rcond=None)[0])


if __name__ == "__main__":
    unittest.main()
