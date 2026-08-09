import unittest

from exercise_autodiff import Value


class AutodiffExerciseTests(unittest.TestCase):
    def test_add_gradients(self):
        x, y = Value(2), Value(3); z = x + y; z.backward()
        self.assertEqual((z.data, x.grad, y.grad), (5.0, 1.0, 1.0))

    def test_multiply_gradients(self):
        x, y = Value(2), Value(3); z = x * y; z.backward()
        self.assertEqual((x.grad, y.grad), (3.0, 2.0))

    def test_relu_positive(self):
        x = Value(2); y = x.relu(); y.backward(); self.assertEqual(x.grad, 1.0)

    def test_relu_negative(self):
        x = Value(-2); y = x.relu(); y.backward(); self.assertEqual((y.data, x.grad), (0.0, 0.0))

    def test_shared_value_accumulates(self):
        x = Value(3); y = x * x + x; y.backward(); self.assertEqual(x.grad, 7.0)

    def test_chain_rule(self):
        x = Value(2); y = (x * x).relu(); y.backward(); self.assertEqual(x.grad, 4.0)


if __name__ == "__main__":
    unittest.main()
