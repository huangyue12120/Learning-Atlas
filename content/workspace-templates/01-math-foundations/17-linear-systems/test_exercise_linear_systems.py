import unittest
from exercise_linear_systems import gaussian_solve
class LinearSystemTests(unittest.TestCase):
 def test_solve(self): self.assertEqual(gaussian_solve([[2,1],[1,-1]],[5,1]), [2,1])
if __name__ == '__main__': unittest.main()
