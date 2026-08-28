# 随机过程：练习指南

从 `exercise_stochastic.py` 开始，实现平稳分布、Metropolis–Hastings 和前向扩散。

## 练习

1. 实现 `stationary_distribution(transition_matrix)`，用幂迭代求 row-stochastic 转移矩阵的平稳分布。
2. 实现 log-space 的 `metropolis_hastings`，返回样本和接受率，并用不同提议标准差比较混合效果。
3. 实现 `diffusion_forward`，按线性 beta schedule 给一维信号逐步加入高斯噪声；固定随机种子以便复现。

## 运行与验证

在本工作区根目录运行：

```bash
python3 -m unittest -v test_exercise_stochastic.py
```

再对照 `reference_stochastic.py`，解释马尔可夫链的平稳分布、采样接受率和扩散过程之间的联系。
