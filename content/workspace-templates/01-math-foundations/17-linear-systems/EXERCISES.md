# 线性方程组：练习指南

从 `exercise_linear_systems.py` 开始，实现带部分主元选取的高斯消元和回代。

## 练习

1. 实现 `back_substitute(u, c)`，从上三角系统中逐行求解。
2. 实现 `gaussian_solve(a, b)`，在消元前交换绝对值最大的主元行，并保持右端向量同步交换。
3. 增加奇异矩阵和近零主元测试，明确函数应抛出什么错误或返回什么结果。

## 运行与验证

在本工作区根目录运行：

```bash
python3 -m unittest -v test_exercise_linear_systems.py
```

然后用 `reference_linear_systems.py` 比较高斯消元、LU、QR 和 Cholesky 在不同矩阵条件数下的适用场景。
