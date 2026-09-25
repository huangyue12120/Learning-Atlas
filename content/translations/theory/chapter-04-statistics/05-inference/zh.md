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

*统计推断超越了“是/否”决策，通过估计总体参数来量化不确定性。本文件涵盖置信区间、点估计与区间估计、最大似然估计、矩估计法和回归分析，它们是从原始数据走向机器学习预测模型的桥梁。*

**编者注：**导语提到最大似然估计、矩估计法和回归分析，但正文没有展开这些内容。

- 假设检验给出“是/否”的决策：拒绝或未能拒绝。但很多时候，你需要的是更有信息量的结果——待估参数的一个合理范围，这正是**置信区间**提供的。

- **点估计**是从样本计算出的单个数值，例如样本均值 $\bar{x}$。它是总体参数的最佳猜测，但单独使用时无法反映估计有多精确。

- **置信区间**以点估计为中心，给出一个反映不确定性的范围：

$$\text{CI} = \bar{x} \pm \text{ME}$$
- **误差幅度（ME）**取决于三个因素：所需的置信水平、数据的变异性和样本量：

$$\text{ME} = z^\ast \cdot \frac{\sigma}{\sqrt{n}}$$
- $z^\ast$ 是与所需置信水平对应的正态分布临界值。置信水平为 95% 时，$z^\ast = 1.96$；为 99% 时，$z^\ast = 2.576$。

![点估计加上两边的误差范围，形成一个区间。](../images/confidence_interval.svg)


- **95% 置信区间** 意味着：如果你重复实验多次并每次构建一个区间，大约有 95% 这些区间会包含真实的总体参数。它并不意味着在特定的区间内参数的概率是 95%。参数是固定的；区间是变化的。

- **实际例子**：你测量了 50 个人的高度，并发现 $\bar{x} = 170$ cm 与 $\sigma = 8$ cm。构造一个 95% 置信区间。

$$\text{ME} = 1.96 \cdot \frac{8}{\sqrt{50}} = 1.96 \cdot 1.131 = 2.22 \text{ cm}$$
$$\text{CI} = [170 - 2.22, \; 170 + 2.22] = [167.78, \; 172.22]$$
- 可以说，我们对“总体平均身高位于 167.78 到 172.22 cm 之间”有 95% 的置信度。

- 当 $\sigma$ 未知（通常是这种情况）时，使用样本标准差 $s$ 和 t 分布代替：

$$\text{CI} = \bar{x} \pm t^\ast_{n-1} \cdot \frac{s}{\sqrt{n}}$$
- 区间越宽，置信度越高但估计精度越低；区间越窄，估计精度越高但置信度越低。增加样本量可以在不降低置信度的情况下缩小区间。

- **功效分析**用于在实验开始前规划样本量：要以指定的检验功效检出给定大小的效应，需要多少样本？

- 上一篇提到，检验功效为 $1 - \beta$，即在 $H_0$ 为假时正确拒绝它的概率。常见目标是 80% 的检验功效。

- 对于显著性水平 $\alpha$ 和检验功效 $1-\beta$，用 z 检验检测差异 $\delta$ 所需的样本量为：

$$n = \left(\frac{(z_{\alpha/2} + z_{\beta}) \cdot \sigma}{\delta}\right)^2$$
- 例如，检测平均身高相差 2 厘米（$\sigma = 8$），显著性水平 $\alpha = 0.05$、检验功效为 80%（$z_{0.025} = 1.96$, $z_{0.20} = 0.84$）时：

$$n = \left(\frac{(1.96 + 0.84) \cdot 8}{2}\right)^2 = \left(\frac{22.4}{2}\right)^2 = 11.2^2 \approx 126$$
- 按上式计算，每组大约需要 126 人。**编者注：**该公式适用于单样本均值检验。若比较两个等样本组，标准误为 $\sigma\sqrt{2/n}$，每组所需样本量应在公式结果上乘以 2；因此原文的 126 人/组与 80% 检验功效不符。

- 功效分析可以避免两种常见问题：样本量过小，检不出真实效应（检验功效不足）；或样本量远超所需，浪费资源。

- **蒙特卡洛方法**使用随机采样来解决难以或不可能用解析法解决的问题。核心思想：如果无法精确计算，就模拟多次并使用结果作为近似值。

- 这个名称来自蒙特卡洛赌场，体现了随机性在其中扮演的角色。这些方法是机器学习中的主力工具，可用于估计积分、评估模型不确定性和近似复杂分布。

- 蒙特卡洛方法的一般步骤：
    - 定义可能输入的域
    - 从该域中随机生成输入
    - 在每个输入上评估函数
    - 合并结果（平均、计数等）

- 经典例子是估算 $\pi$。设一个边长为 2、中心位于原点的正方形，内切一个半径为 1 的圆。正方形面积为 4，圆面积为 $\pi$。

![正方形内嵌圆，随机点按内部/外部着色](../images/monte_carlo_pi.svg)


- 在正方形内均匀抽样。落入圆内的点所占比例近似于 $\pi/4$：

$$\pi \approx 4 \times \frac{\text{圆内点数}}{\text{点总数}}$$
- 当且仅当 $x^2 + y^2 \le 1$ 时，点 $(x, y)$ 位于圆内。生成的点越多，估计值就越接近 $\pi$ 的真实值。

- 蒙特卡洛方法也常用于机器学习：
    - **蒙特卡洛 dropout**：启用 Dropout 运行推理多次以估计预测不确定性
    - **MCMC（马尔可夫链蒙特卡洛）**：在贝叶斯模型中从复杂后验分布中采样
    - **策略梯度方法**：通过采样轨迹来估计强化学习中的梯度

- **因子分析**用于发现能够解释观测变量间相关性的潜在因子。例如，10 道人格问卷题目可能由 3 个潜在特质解释：外向性、宜人性和尽责性。

- 模型假设，每个观测变量 $x_i$ 都是少数潜在因子 $f_j$ 的线性组合，再加上噪声：

$$x_i = \lambda_{i1} f_1 + \lambda_{i2} f_2 + \ldots + \lambda_{ik} f_k + \epsilon_i$$
- $\lambda$ 称为因子载荷，表示各观测变量与相应因子的关联强度。这与第 2 章介绍的矩阵分解直接相关；因子分析也与特征值分解和 SVD 密切相关。

- **实验设计**是设计一个实验的艺术，以便能够得出有效的结论。糟糕的设计即使有大量数据也毫无用处。

- 一个设计良好的实验的关键组件：
    - **独立变量（IV）**：你操纵的变量（例如药物剂量、模型架构）
    - **因变量（DV）**：你测量的变量（例如恢复时间、准确率）
    - **控制组**：不接受治疗（或安慰剂），提供一个基准进行比较
    - **随机分配**：参与者被随机分配到组中，这平衡了你没有测量的混淆变量

- **常见的实验设计**：
    - **完全随机设计**：将受试者随机分配到各处理组；各组具有可比性时，这种设计简单有效。
    - **随机区组设计**：先按某种因素（如年龄）将受试者分成区组，再在每个区组内随机分配治疗。这会减少区组因素造成的变异性，思想上类似于分层抽样。
    - **因子设计**：同时考察多个自变量。一个 $2 \times 3$ 因子设计中，一个变量有 2 个水平，另一个变量有 3 个水平，共形成 6 种处理组合。这样可以检测**交互作用**，即一个变量的效应是否随另一个变量的水平而变化。
    - **交叉设计**：每个受试者按顺序接受所有治疗（治疗之间有洗脱期）。每个人都作为自己的对照，从而减少个体差异的影响。

- 在机器学习实验中，这些原则同样有用。比较模型时，应控制随机种子、数据集划分和硬件。**编者注：**交叉验证和消融研究可与交叉设计、因子设计作类比，但不等同于这些统计实验设计。

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

3. 进行简单的功效分析：给定效应大小和标准差，计算所需的样本量，并通过模拟验证。**编者注：**此处代码沿用原文的单样本公式，却用来比较两个样本组；由于缺少系数 2，模拟结果达不到设定的 0.80 检验功效。
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
