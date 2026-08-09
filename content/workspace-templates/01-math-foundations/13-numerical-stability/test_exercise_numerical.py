import math
import unittest

from exercise_numerical import clip_by_norm, cross_entropy, logsumexp, stable_softmax


class NumericalTests(unittest.TestCase):
    def test_softmax_large_logits(self):
        result = stable_softmax([1000., 1001., 1002.])
        self.assertAlmostEqual(sum(result), 1.)
        self.assertGreater(result[2], result[1])

    def test_logsumexp(self):
        self.assertAlmostEqual(logsumexp([1000., 1001.]), 1001 + math.log1p(math.exp(-1)))

    def test_cross_entropy(self):
        self.assertAlmostEqual(cross_entropy(1, [0., 1., 0.]), -math.log(stable_softmax([0., 1., 0.])[1]))

    def test_clip_norm(self):
        clipped = clip_by_norm([3., 4.], 2.)
        self.assertAlmostEqual(math.sqrt(sum(g * g for g in clipped)), 2.)


if __name__ == "__main__":
    unittest.main()
