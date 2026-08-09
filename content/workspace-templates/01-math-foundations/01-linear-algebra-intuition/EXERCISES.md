# 线性代数直觉：Python 练习

先运行参考实现，确认你能读懂本课的主要输出：

```bash
python vectors.py
```

然后只编辑 `exercise_vectors.py`，依次完成以下函数：

1. `Vector.dot`：检查维度相同后计算点积。
2. `Vector.magnitude` 与 `Vector.normalize`：零向量归一化时抛出 `ValueError`。
3. `Vector.project_onto`：使用 `proj_b(a) = (a·b / b·b)b`，并处理零向量方向。
4. `Matrix.multiply_vector`：验证形状后实现矩阵乘向量。

每完成一项就运行：

```bash
python -m unittest -v test_exercise_vectors.py
```

首次运行会失败，这是正常的：测试给出了本课需要建立的可观察行为。不要修改测试；如需比较思路，可阅读只读参考实现 `vectors.py`。
