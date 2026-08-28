# 面向 AI 的复数：练习指南

从 `exercise_complex.py` 开始，实现复数乘法和用欧拉公式进行旋转。

## 练习

1. 实现 `multiply(z1, z2)`，分别用 Python 复数运算和实部/虚部公式核对结果。
2. 实现 `rotate(z, theta)`，使复数乘以 `exp(iθ)`；测试旋转 90°、180° 和 360°。
3. 检查浮点误差：比较旋转后模长与原模长，并解释为什么结果可能只有近似相等。

## 运行与验证

在本工作区根目录运行：

```bash
python3 -m unittest -v test_exercise_complex.py
```

然后对照 `reference_complex_numbers.py`，把单位根与离散傅里叶变换中的旋转因子联系起来。
