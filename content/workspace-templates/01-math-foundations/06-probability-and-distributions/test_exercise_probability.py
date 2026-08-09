import math
import unittest
from exercise_probability import bernoulli_pmf, cross_entropy_loss, expected_value, softmax, variance
class ProbabilityTests(unittest.TestCase):
 def test_bernoulli(self): self.assertEqual([bernoulli_pmf(k,.7) for k in (0,1)],[.3,.7])
 def test_expected(self): self.assertEqual(expected_value([1,2,3],[.2,.3,.5]),2.3)
 def test_variance(self): self.assertAlmostEqual(variance([1,2,3],[.2,.3,.5]),.61)
 def test_softmax_sums_one(self): self.assertAlmostEqual(sum(softmax([2,1,.1])),1)
 def test_softmax_large_logits(self): self.assertAlmostEqual(sum(softmax([100,101,102])),1)
 def test_cross_entropy(self): self.assertAlmostEqual(cross_entropy_loss([2,1,.1],0),-math.log(softmax([2,1,.1])[0]))
if __name__ == '__main__': unittest.main()
