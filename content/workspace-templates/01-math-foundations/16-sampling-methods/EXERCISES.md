# 抽样方法：练习指南

从 `exercise_sampling.py` 开始，完成逆变换抽样、离散抽样和蒙特卡洛估计。

## 练习

1. 实现 `inverse_exponential(u, rate)`，验证 `u=0.5`、`rate=1` 时结果约为 `0.693147`。
2. 实现 `categorical(probabilities, u)`，用累积概率区间返回类别索引，并检查概率和不为 1 时的边界行为。
3. 实现 `estimate_pi(samples, rng)`，用单位正方形中的随机点估计 π；比较不同样本量下的误差。

## 运行与验证

在本工作区根目录运行：

```bash
python3 -m unittest -v test_exercise_sampling.py
```

再对照 `reference_sampling.py`，思考逆 CDF、拒绝抽样和 MCMC 在方差与计算成本上的取舍。
