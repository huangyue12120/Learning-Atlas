import unittest
import numpy as np

from exercise_pca import center, inverse_transform, project, reconstruction_mse


class PCATests(unittest.TestCase):
    def test_center(self):
        centered, mean = center(np.array([[1., 3.], [3., 5.]]))
        np.testing.assert_allclose(mean, [2., 4.])
        np.testing.assert_allclose(centered.mean(axis=0), [0., 0.])

    def test_projection_and_inverse(self):
        X = np.array([[1., 2.], [3., 4.]])
        components = np.eye(2)
        reduced = project(X, components)
        np.testing.assert_allclose(inverse_transform(reduced, components, np.zeros(2)), X)

    def test_mse(self):
        self.assertAlmostEqual(reconstruction_mse(np.array([1., 3.]), np.array([2., 1.])), 2.5)


if __name__ == "__main__":
    unittest.main()
