import unittest

from exercise_tensors import attention_shapes, broadcast_shape, reshape_size


class TensorTests(unittest.TestCase):
    def test_broadcast(self):
        self.assertEqual(broadcast_shape((8, 1, 6, 1), (7, 1, 5)), (8, 7, 6, 5))
        self.assertEqual(broadcast_shape((3, 1), (1, 4)), (3, 4))

    def test_attention_shapes(self):
        result = attention_shapes(2, 8, 64, 4)
        self.assertEqual(result["qkv"], (2, 8, 64))
        self.assertEqual(result["split"], (2, 4, 8, 16))
        self.assertEqual(result["scores"], (2, 4, 8, 8))
        self.assertEqual(result["output"], (2, 8, 64))

    def test_size(self):
        self.assertEqual(reshape_size((2, 3, 4)), 24)


if __name__ == "__main__":
    unittest.main()
