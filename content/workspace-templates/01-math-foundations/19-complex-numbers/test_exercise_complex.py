import unittest
from exercise_complex import multiply, rotate
class ComplexTests(unittest.TestCase):
 def test_multiply(self): self.assertEqual(multiply(3+2j, 1+4j), -5+14j)
 def test_rotation(self): self.assertAlmostEqual(rotate(1+0j, 3.141592653589793/2).imag, 1)
if __name__ == '__main__': unittest.main()
