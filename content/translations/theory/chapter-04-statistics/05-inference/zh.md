---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 04 - statistics/05. inference.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 50e266074e0cd1c8582c93b8daa5977398c080b11ee0c36bb037fbf5e6120097
status: reviewed
---
# 统计推断

*统计推断超越了 yes/no 决策，通过估计总体参数来量化不确定性。本文件涵盖了置信区间、点估计和区间估计、最大似然估计、方法矩和回归分析，这些是机器学习中从原始数据到预测模型的桥梁。*

- 假设检验给你一个 yes/no 决策：拒绝或不拒绝。但通常你想要更详细的信息，即估计的参数范围。这就是 **置信区间** 提供的。

- **点估计** 是从样本中计算出的一个单个数字，比如样本均值 $\bar{x}$。它是你对总体参数的最佳猜测，但单独来看它没有意义，因为它没有反映估计的精确程度。

- **置信区间** 包裹了这个点估计，并反映了不确定性。它的形式如下：

$$\text{CI} = \bar{x} \pm \text{ME}$$
- **边际误差 (ME)** 依赖于三个因素：你想要多自信、数据的变异性和样本的大小：

$$\text{ME} = z^\ast \cdot \frac{\sigma}{\sqrt{n}}$$
- $z^\ast$ 是匹配你所需信心水平的正态分布中的临界值。对于 95% 的信心，$z^\ast = 1.96$。对于 99% 的信心，$z^\ast = 2.576$。

![点估计加上两边的误差范围，形成一个区间。](../images/confidence_interval.svg)


- **95% 置信区间** 意味着：如果你重复实验多次并每次构建一个区间，大约有 95% 这些区间会包含真实的总体参数。它并不意味着在特定的区间内参数的概率是 95%。参数是固定的；区间是变化的。

- **实际例子**：你测量了 50 个人的高度，并发现 $\bar{x} = 170$ cm 与 $\sigma = 8$ cm。构造一个 95% 置信区间。

$$\text{ME} = 1.96 \cdot \frac{8}{\sqrt{50}} = 1.96 \cdot 1.131 = 2.22 \text{ cm}$$
$$\text{CI} = [170 - 2.22, \; 170 + 2.22] = [167.78, \; 172.22]$$
- 你可以说，以 95% 的信心认为真实的平均身高在 167.78 到 172.22 cm 之间。

- 当 $\sigma$ 未知（通常是这种情况）时，使用样本标准差 $s$ 和 t 分布代替：

$$\text{CI} = \bar{x} \pm t^\ast_{n-1} \cdot \frac{s}{\sqrt{n}}$$
- 更宽的区间更可靠但不精确。更窄的区间更精确但不可靠。通过增加样本量，可以缩小区间而不失去信心。

- **功率分析**帮助你在开始实验之前规划它。问题是如何确定需要多大的样本才能检测出给定大小的效果，以达到指定的功率？

- 回想上一个文件中，功率为 $1 - \beta$，拒绝错误 $H_0$ 的概率。通常目标是 80% 功率。

- 检测差异的z-test所需的样本量 $\delta$，显著性 $\alpha$ 和功效 $1-\beta$ 是：

$$n = \left(\frac{(z_{\alpha/2} + z_{\beta}) \cdot \sigma}{\delta}\right)^2$$
- 例如，检测平均身高（$\sigma = 8$）的2厘米差异，显著性 $\alpha = 0.05$ 和80%的功效（$z_{0.025} = 1.96$, $z_{0.20} = 0.84$）：

$$n = \left(\frac{(1.96 + 0.84) \cdot 8}{2}\right)^2 = \left(\frac{22.4}{2}\right)^2 = 11.2^2 \approx 126$$
- 每组大约需要126人。

- 功率分析可以防止两种常见的错误：实验太小无法检测到真实效果（不足），或浪费资源在不必要的大型实验上（过度）。

- **蒙特卡洛方法**使用随机采样来解决难以或不可能用解析法解决的问题。核心思想：如果无法精确计算，就模拟多次并使用结果作为近似值。

- 名称来源于蒙特卡洛赌场，这是一种对随机性的致敬。这些方法在机器学习中是工作horse，用于估计积分、评估模型不确定性以及近似复杂分布等任务。

- 通用蒙特卡洛方法：
    - 定义可能输入的域
    - 从该域中随机生成输入
    - 在每个输入上评估函数
    - 合并结果（平均、计数等）

- 经典例子是估算 $\pi$。想象一个边长为2的正方形，中心位于原点，其中有一个半径为1的圆。正方形的面积为4，而圆的面积为 $\pi$.

![正方形内嵌圆，随机点按内部/外部着色](../images/monte_carlo_pi.svg)


- 以均匀分布在正方形中随机丢弃点。落入圆内的点的比例近似于 $\pi/4$:

$$\pi \approx 4 \times \frac{\text{points inside circle}}{\text{total points}}$$
- 一个点 $(x, y)$ 在圆内如果 $x^2 + y^2 \le 1$。 抛掷的点越多，你的估计就越接近 $\pi$ 的真实值。

- 在机器学习中，蒙特卡洛方法出现在：
    - **蒙特卡洛 dropout**：启用 Dropout 运行推理多次以估计预测不确定性
    - **MCMC（马尔可夫链蒙特卡洛）**：在贝叶斯模型中从复杂后验分布中采样
    - **策略梯度方法**：通过采样轨迹来估计强化学习中的梯度

- **因子分析**是一种技术，用于发现隐藏（潜在）变量，这些变量解释了观测变量之间的相关性。如果10项人格调查问题可以由3个基础特质（外向、合群、自律）解释，因子分析就找到了这些特质。

- 模型假设每个观察变量 $x_i$ 是几个潜在因素 $f_j$ 的线性组合，再加上噪声。

$$x_i = \lambda_{i1} f_1 + \lambda_{i2} f_2 + \ldots + \lambda_{ik} f_k + \epsilon_i$$
- $\lambda$值被称为因子载荷，它们告诉你每个观察变量与每个因素之间的关系强度。这直接连接到第2章的矩阵分解；因子分析与特征值分解和SVD密切相关。

- **实验设计**是设计一个实验的艺术，以便能够得出有效的结论。糟糕的设计即使有大量数据也毫无用处。

- 一个设计良好的实验的关键组件：
    - **独立变量（IV）**：你操纵的变量（例如药物剂量、模型架构）
    - **依赖变量（DV）**：你测量的变量（例如恢复时间、准确性）
    - **控制组**：不接受治疗（或安慰剂），提供一个基准进行比较
    - **随机分配**：参与者被随机分配到组中，这平衡了你没有测量的混淆变量

- **常见的实验设计**：
    - **完全随机分配设计**：受试者被随机分配到治疗组。简单且有效，当组之间可比时。
    - **随机分块设计**：首先将受试者按某种因素（如年龄）分组，然后在每个组内随机分配治疗。这减少了由分组因素带来的 variability，类似于分层抽样。
    - **因子设计**：同时测试多个自变量。一个 $2 \times 3$ 因子设计有 2 个水平的变量和 3 个另一个变量的水平，总共产生 6 种治疗组合。这允许你检测 **交互作用**，即一种变量的效果取决于另一种变量的水平。
    - **交叉设计**：每个受试者按顺序接受所有治疗（在每次治疗之间有洗out期）。每个人都是自己的控制对象，减少了个体差异的影响。

- 在机器学习实验中，这些原则至关重要。在比较模型时，你应该控制随机种子、数据集分割和硬件。交叉验证是一种交叉设计。Ablation研究，其中你逐个移除一个组件，遵循因子设计的逻辑。

## 编程任务（使用 CoLab 或笔记本）

1. 构建一个95%置信区间来估计身高示例，然后尝试不同置信水平和样本大小。
```python
import jax.numpy as jnp

x_bar = 170.0    # sample mean
sigma = 8.0      # population std (known)
n = 50           # sample size

# Critical values for common confidence levels
z_stars = {0.90: 1.645, 0.95: 1.960, 0.99: 2.576}

for conf, z_star in z_stars.items():
    me = z_star * (sigma / jnp.sqrt(n))
    lower, upper = x_bar - me, x_bar + me
    print(f"{conf*100:.0f}% CI: [{lower:.2f}, {upper:.2f}](ME = {me:.2f})")
```

2. 使用蒙特卡洛模拟估算$\pi$。观察随着点数增加时估计如何收敛。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

key = jax.random.PRNGKey(42)

# Generate random points in [-1, 1] x [-1, 1]
n_points = 100_000
k1, k2 = jax.random.split(key)
x = jax.random.uniform(k1, shape=(n_points,), minval=-1, maxval=1)
y = jax.random.uniform(k2, shape=(n_points,), minval=-1, maxval=1)

# Check which points are inside the unit circle
inside = (x**2 + y**2) <= 1.0
cumulative_inside = jnp.cumsum(inside)
counts = jnp.arange(1, n_points + 1)
pi_estimates = 4.0 * cumulative_inside / counts

plt.figure(figsize=(10, 4))
plt.plot(pi_estimates, color="#3498db", alpha=0.7, linewidth=0.5)
plt.axhline(y=jnp.pi, color="#e74c3c", linestyle="--", label=f"π = {jnp.pi:.6f}")
plt.xlabel("Number of points")
plt.ylabel("Estimate of π")
plt.title("Monte Carlo estimation of π")
plt.legend()
plt.ylim(2.8, 3.5)
plt.show()

print(f"Final estimate: {pi_estimates[-1]:.6f}")
print(f"True value:     {jnp.pi:.6f}")
print(f"Error:          {abs(pi_estimates[-1] - jnp.pi):.6f}")
```

3. 进行简单功效分析：给定效应大小和标准差，计算所需的样本大小，并通过模拟验证。
```python
import jax
import jax.numpy as jnp

# Parameters
delta = 2.0      # effect size (difference in means)
sigma = 8.0      # population std
alpha = 0.05
power_target = 0.80

# Analytical sample size
z_alpha = 1.96   # two-tailed, alpha=0.05
z_beta = 0.84    # power=0.80
n_required = ((z_alpha + z_beta) * sigma / delta) ** 2
print(f"Required n per group: {n_required:.0f}")

# Verify by simulation
key = jax.random.PRNGKey(7)
n = int(jnp.ceil(n_required))
n_sims = 5000
rejections = 0

for _ in range(n_sims):
    key, k1, k2 = jax.random.split(key, 3)
    group_a = jax.random.normal(k1, shape=(n,)) * sigma + 50
    group_b = jax.random.normal(k2, shape=(n,)) * sigma + 50 + delta
    pooled_se = jnp.sqrt(2 * sigma**2 / n)
    z = (group_b.mean() - group_a.mean()) / pooled_se
    p = 2 * (1 - __import__("jax").scipy.stats.norm.cdf(jnp.abs(z)))
    if p <= alpha:
        rejections += 1

print(f"Simulated power: {rejections/n_sims:.3f}")
print(f"Target power:    {power_target:.3f}")
```

4. 可视化样本大小与置信区间宽度的关系。这展示了收集更多数据可以提供更精确估计的原因。
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt

sigma = 8.0
z_star = 1.96  # 95% confidence

sample_sizes = jnp.array([10, 20, 30, 50, 100, 200, 500, 1000], dtype=jnp.float32)
margins = z_star * sigma / jnp.sqrt(sample_sizes)

plt.figure(figsize=(8, 4))
plt.bar([str(int(n)) for n in sample_sizes], margins, color="#3498db", alpha=0.7)
plt.xlabel("Sample size")
plt.ylabel("Margin of error (cm)")
plt.title("95% CI margin of error shrinks with larger samples")
plt.show()
```
