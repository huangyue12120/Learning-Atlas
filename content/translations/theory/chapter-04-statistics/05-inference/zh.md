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

*统计推断从有限样本对总体作出带不确定性的判断。本篇覆盖估计量、置信区间、假设检验、p 值、统计功效和样本量规划，并强调把结论与实验设计联系起来。*


* 统计推论超越了以量化的不确定性估计人口参数的 " 是 " / " 不 " 决定。此文件涵盖置信间隔,点和相距估计,最大概率估计,瞬间方法,回归分析,原始数据与ML预测模型的桥梁. *

- 假想测试会给你一个是/否的决定:拒绝或不拒绝. 但是,你常常想要一些 更加信息化的东西, 一系列合理的值 对于你正在估计的参数。这是** 信心间隔** 提供的。

- 一个**点估计**是从你的样本中计算出来的单一数字,就像样本的意思一样$\bar{x}$。。。这是你对人口参数的最佳猜测, 但靠它本身却无法理解 估计的精确度。

- ** 自信间隔** 将这个点的估算用一个反映不确定性的范围来包裹. 它的形式是:

$$\text{CI} = \bar{x} \pm \text{ME}$$

- 误差(ME)**的差分度取决于三件事:你希望有多自信,数据中有多少可变性,以及你的样本有多大:

$$\text{ME} = z^\ast \cdot \frac{\sigma}{\sqrt{n}}$$

- 给$z^\ast$是符合您所期望的信心水平的正常分布的关键值。对于95%的信心,$z^\ast = 1.96$。。。99%的信心,$z^\ast = 2.576$.

![信任间隔:任何一方有误差的点估计](../images/confidence_interval.svg)

- 一个**95%的置信间隔**意味着:如果你多次重复实验,并且每次建立间隔,这些间隔中大约95%会包含真实的人口参数. 这并不意味着参数在这个特定间隔时间里有95%的概率. 参数是固定的;间隔是不同的.

- ** 工作实例**:你测量50人的高度并找到$\bar{x} = 170$cm 与 时间$\sigma = 8$cm. (中文(简体)). 构造95%的置信间隔。

$$\text{ME} = 1.96 \cdot \frac{8}{\sqrt{50}} = 1.96 \cdot 1.131 = 2.22 \text{ cm}$$

$$\text{CI} = [170 - 2.22, \; 170 + 2.22] = [167.78, \; 172.22]$$

- 95%的自信可以说,真正的平均高度在167.78到172.22厘米之间.

- 何时$\sigma$未知(通常情况),使用样本标准偏差$s$而T分配:

$$\text{CI} = \bar{x} \pm t^\ast_{n-1} \cdot \frac{s}{\sqrt{n}}$$

- 更宽广的间隔比较自信,但不太精确. 更狭小的间隔比较精确,但不那么自信. 可以通过增加样本大小来缩小间隔而不失去信心.

- ** 能量分析** 帮助您在运行前计划一个实验. 问题是:我需要多大的样本才能检测到一定大小且具有特定功率的效果?

- 从上一个文件中召回权力 =$1 - \beta$,正确拒绝虚假的概率$H_0$。。。一个共同的目标是80%的功率.

- Z测试检测差异所需的样本大小$\delta$具有意义$\alpha$权力$1-\beta$即:

$$n = \left(\frac{(z_{\alpha/2} + z_{\beta}) \cdot \sigma}{\delta}\right)^2$$

- 例如,检测平均高度差分2厘米($\sigma = 8$与$\alpha = 0.05$80%的动力($z_{0.025} = 1.96$, $z_{0.20} = 0.84$):

$$n = \left(\frac{(1.96 + 0.84) \cdot 8}{2}\right)^2 = \left(\frac{22.4}{2}\right)^2 = 11.2^2 \approx 126$$

- 你每组需要大约126人

- 动力分析可以防止两个常见的错误:运行一个实验太小而无法检测出实际效果(动力不足),或者将资源浪费在远远超出必要的实验上(能量过剩).

- **蒙特卡洛方法** 使用随机抽样来解决难以或无法分析解决的问题. 核心思想:如果你不能精确计算某事,那么要模拟多次,然后用结果作为近似.

- 名字出自蒙特卡洛赌场,指向随机作用. 这些方法在ML中是用于诸如估计组件,评价模型不确定性,以及近似于复杂分布等任务的工作马.

- 蒙特卡洛通用食谱:
    - 定义可能输入的领域
    - 从该域生成随机输入
    - 在每个输入上评价一个函数
    - 汇总结果(平均、计算等)

- 一个典型的例子是估计$\pi$。。。想象出一个有侧长2的正方形,以原生地为中心,内部刻有一圈半径一. 广场面积为4个,圆形面积为:$\pi$.

![平方有被刻入的圆形, 随机点由内外颜色](../images/monte_carlo_pi.svg)

- 在正方形中统一投放随机点。在圆圈内降落的分数 大约是$\pi/4$:

$$\pi \approx 4 \times \frac{\text{points inside circle}}{\text{total points}}$$

- 一点$(x, y)$位于圆内,如果$x^2 + y^2 \le 1$。。。投出点数越多,估计值就越接近真实值$\pi$.

- 在ML中,蒙特卡洛方法出现在:
    - ** Montte Carlo辍学**:多次推论,使辍学能够估计预测不确定性
    - ** MCMC(Markov chain Monte Carlo)**:贝叶斯模型中复杂的后期分布样本
    - ** 政策梯度方法**:通过取样轨迹估计强化学习的梯度

- ** 因素分析**是一种发现隐藏(相对)变量的技术,用以解释所观测到的变量之间的关联性。如果10个性调查问题可以用3个基本特征(外向,可接受,自觉)来解释,则因子分析会发现这些特征.

- 模型假设每个观察到的变量$x_i$是由一些潜在因素组成的线性组合$f_j$外加噪声 :

$$x_i = \lambda_{i1} f_1 + \lambda_{i2} f_2 + \ldots + \lambda_{ik} f_k + \epsilon_i$$

- 该$\lambda$值称为**要素加载**,并告诉你每个观察到的变量与每个因素的关系有多紧密。这直接连接到从第二章分解出来的矩阵分解;因子分析与等离子分解和SVD密切相关.

- **实验性设计**是构建实验的艺术,以便你得出有效的结论. 设计不当甚至会使一个大数据集变得无用.

- 设计良好的试验的关键组成部分:
    - ** 独立变量(IV)**:你操控的东西(例如. 药物剂量,模型结构)
    - ** 依赖变量(DV)**:你测量的(例如. 恢复时间、准确性)
    - ** 控制组**:未接受治疗(或安慰剂),为比较提供了基线
    - ** 随机分派**:参与者被随机分配到组中,这些组平衡了您没有测量的困惑变量

- ** 共同实验设计**:
    - ** 完全随机设计**:课题随机划入处理组. 当组类具有可比性时,简单而有效。
    - ** 随机区块设计**:学科首先被分组为区块(如: 然后随机分配到每个区块内的治疗。这减少了阻断因子的可变性,在精神上类似于分层取样.
    - ** 图像设计**:同时测试多位IV. A 类$2 \times 3$阶乘设计有2个等分1个变分3个等分,给出了6个处理组合. 这使得您可以检测到 ** 交互**,其中一个变量的效果取决于另一个变量的级别.
    - ** 交叉设计**:每个主体按顺序接受所有处理(在两者之间有冲洗期)。每个主体都充当自己的控制,减少个人差异的影响.

- 在ML实验中,这些原则至关重要. 在比较模型时,您应该控制随机种子,数据集分拆和硬件. 交叉验证是交叉设计的一种. 分解研究,即一次去除一个组件,遵循因子设计逻辑.

## 编程任务（使用 Colab 或 notebook)



1. 构造高度示例95%的置信间隔,然后用不同的置信水平和样本大小进行实验.
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
    print(f"{conf*100:.0f}% CI: [{lower:.2f}, {upper:.2f}]  (ME = {me:.2f})")
```

2. 估计数$\pi$使用蒙特卡洛模拟。绘制估计值如何在增加点数时汇合。
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

3. 进行简单的功率分析:对于给定的效果大小和标准偏差,计算所需的样本大小并通过模拟验证.
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

4. 可视化置信间隔宽度如何随样本大小而变化. 这表明为什么收集更多的数据能提供更准确的估计数。
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
