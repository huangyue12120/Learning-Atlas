import unittest
from exercise_fourier import dft
class FourierTests(unittest.TestCase):
 def test_dc(self): self.assertEqual(dft([1, 1, 1, 1])[0], 4)
if __name__ == '__main__': unittest.main()
