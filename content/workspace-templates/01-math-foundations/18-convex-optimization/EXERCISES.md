# 凸优化：练习指南

从 `exercise_convex.py` 开始，完成一维凸性判定和牛顿法更新。

## 练习

1. 实现 `is_convex_1d(second_derivative, points)`，确认所有采样点的二阶导数非负时返回 `True`。
2. 实现 `newton_1d(gradient, hessian, x0, steps)`，逐步应用 `x <- x - gradient(x) / hessian(x)`。
3. 在二次函数和非凸函数上比较牛顿法与梯度下降；记录初值、步数和 Hessian 为零时的行为。

## 运行与验证

在本工作区根目录运行：

```bash
python3 -m unittest -v test_exercise_convex.py
```

再对照 `reference_convex.py`，说明局部二阶信息为什么可能加速收敛，也可能在非凸区域造成不稳定步长。
