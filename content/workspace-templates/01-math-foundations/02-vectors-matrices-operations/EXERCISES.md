# 向量、矩阵与运算：Python 练习

先运行只读参考实现，确认你能解释每段输出：

```bash
python matrices.py
```

然后只编辑 `exercise_matrices.py`，依次实现以下行为：

1. `Matrix.matmul`：在内侧维度相等时计算矩阵乘法；否则抛出 `ValueError`。
2. `Matrix.add_bias`：本练习刻意只实现神经网络常用的行偏置，即把形状为 `(1, n)` 的偏置加到 `(m, n)` 输出的每一行；上游参考实现还展示了列偏置广播。
3. `Matrix.inverse_2x2`：按二维逆矩阵公式实现；奇异矩阵应抛出 `ValueError`。
4. `relu`：逐元素把负数变为零。

每完成一项都运行：

```bash
python -m unittest -v test_exercise_matrices.py
```

首次运行失败是预期行为。不要修改测试；需要比较实现时，可阅读只读参考文件 `matrices.py`。
