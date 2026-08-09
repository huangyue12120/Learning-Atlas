import unittest
from exercise_convex import is_convex_1d, newton_1d
class ConvexTests(unittest.TestCase):
 def test_convex(self): self.assertTrue(is_convex_1d(lambda x: 2, [-1,0,1]))
 def test_newton(self): self.assertAlmostEqual(newton_1d(lambda x: 10*x+3, lambda x: 10, 0, 1), -0.3)
if __name__ == '__main__': unittest.main()
