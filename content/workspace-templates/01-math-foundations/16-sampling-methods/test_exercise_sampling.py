import unittest
from exercise_sampling import categorical, estimate_pi, inverse_exponential
class SamplingTests(unittest.TestCase):
 def test_inverse(self): self.assertAlmostEqual(inverse_exponential(0.5, 1), 0.69314718056, places=8)
 def test_categorical(self): self.assertEqual(categorical([0.2, 0.8], 0.3), 1)
 def test_pi(self): self.assertEqual(estimate_pi(1, lambda: 0.5), 4)
if __name__ == '__main__': unittest.main()
