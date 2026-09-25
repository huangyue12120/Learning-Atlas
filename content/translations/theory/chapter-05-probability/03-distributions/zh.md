---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 05 - probability/03. distributions.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 1e051833fd2dde6957d8c2bc859d0dd7075bd09518aae0632904c0a039c75efa
status: reviewed
---
# 概率分布

*概率分布描述随机结果在可能取值上的分布。本文介绍机器学习和统计学中常见的离散与连续分布，包括伯努利、二项、泊松、正态（高斯）、指数和贝塔分布，并说明其公式、直观含义及在损失函数、先验分布和噪声模型中的应用。*

- 第 4 章介绍了随机变量、PMF、PDF 和 CDF。这里列出机器学习和统计学中常见的概率分布，并介绍每种分布的直观含义、公式、均值和方差。

- 简要回顾三个核心函数（完整定义见第 4 章）：
    - **概率质量函数（PMF）** $P(X = x)$：给出离散随机变量取每个值的概率，对应条形图中的柱高。
    - **概率密度函数（PDF）** $f(x)$：给出连续随机变量在每个点的密度；曲线在两个值之间的面积就是落入该区间的概率。
    - **累积分布函数（CDF）** $F(x) = P(X \le x)$：给出不超过 $x$ 的累积概率。它随 $x$ 增大而单调不减，取值介于 0 和 1 之间。

- 概率分布的**支持集**是随机变量可能取值的集合：离散情形包括 PMF 非零的取值；连续情形包括 PDF 非零的区域及其边界。例如，骰子的支持集是 $\{1,2,3,4,5,6\}$，正态分布的支持集是所有实数 $(-\infty, \infty)$。**编者注：**原文将支持集简化为 PMF 或 PDF 为正的取值；连续分布的边界点即使密度为零，也可能属于支持集。

- 概率分布分为两类：离散分布（可能结果可数，用 PMF 描述）和连续分布（可能结果不可数，用 PDF 描述）。

- **伯努利分布**是最简单的分布。一次试验有两个结果：成功（1）的概率为 $p$，失败（0）的概率为 $1-p$，其中 $0 \le p \le 1$。

$$P(X = x) = p^x (1 - p)^{1-x}, \quad x \in \{0, 1\}$$
- 均值：$E[X] = p$。方差：$\text{Var}(X) = p(1-p)$。

- 每次抛硬币、二分类预测或其他二元试验都可以用伯努利分布建模。在机器学习中，sigmoid 函数的输出通常作为伯努利分布的参数 $p$。

- **二项分布**：统计 $n$ 次相互独立、成功概率均为 $p$ 的伯努利试验中的成功次数，其中 $n$ 为非负整数且 $0 \le p \le 1$。

$$P(X = k) = \binom{n}{k} p^k (1-p)^{n-k}, \quad k = 0, 1, \ldots, n$$
- $\binom{n}{k}$ 是文件 01 中介绍的二项式系数，用于计算在 $n$ 次试验中安排 $k$ 次成功的方式数。

- 均值：$E[X] = np$。方差：$\text{Var}(X) = np(1-p)$。

![伯努利作为单个条形图与二项分布作为计数的分布比较](../images/bernoulli_binomial.svg)


- 示例：抛一枚有偏硬币（$p = 0.7$）八次。恰好得到 6 次正面的概率为 $\binom{8}{6}(0.7)^6(0.3)^2 = 28 \times 0.1176 \times 0.09 \approx 0.296$。

- **泊松分布**：在给定平均速率 $\lambda$ 的情况下，统计固定时间间隔或空间区域内的事件数，其中 $\lambda\ge 0$。当事件稀少且相互独立时，它很有用。

$$P(X = k) = \frac{\lambda^k e^{-\lambda}}{k!}, \quad k = 0, 1, 2, \ldots$$
- 均值：$E[X] = \lambda$。方差：$\text{Var}(X) = \lambda$。均值等于方差是泊松分布的一个特征。

- 示例：每小时的电子邮件数量（$\lambda = 5$）、每页的拼写错误数、每秒的服务器请求数。在机器学习中，泊松回归用于对计数数据建模，因为线性模型可能预测出负数。

- 当 $n \to \infty$、$p \to 0$ 且 $np = \lambda$ 保持不变时，二项分布 $(n,p)$ 收敛于泊松分布 $(\lambda)$。这就是泊松分布适合描述大总体中稀有事件的原因。

- **几何分布**：计算直到第一次成功为止的试验次数，其中 $0<p\le 1$。“我抛多少次硬币才能得到第一个正面？”

$$P(X = k) = (1-p)^{k-1} p, \quad k = 1, 2, 3, \ldots$$
- 均值：$E[X] = 1/p$。方差：$\text{Var}(X) = (1-p)/p^2$。

- 几何分布具有**无记忆性**：再等待 $k$ 次试验才成功的概率，不取决于此前已经等待了多少次。这使它在离散分布中很特殊。

- **负二项分布**：几何分布的推广，统计直到第 $r$ 次成功所需的试验次数，其中 $r$ 为正整数且 $0<p\le 1$（几何分布是 $r=1$ 时的特殊情形）。

$$P(X = k) = \binom{k-1}{r-1} p^r (1-p)^{k-r}, \quad k = r, r+1, r+2, \ldots$$
- 均值：$E[X] = r/p$。方差：$\text{Var}(X) = r(1-p)/p^2$。

- 负二项分布也常用于对过度离散的计数数据建模（方差大于均值）；标准泊松分布要求方差等于均值，无法描述这类过度离散。

- 现在我们进入连续分布。

- **均匀分布**：区间 $[a, b]$（$a<b$）内的所有值等概率。PDF 是一个平坦的矩形。

$$f(x) = \frac{1}{b - a}, \quad a \le x \le b$$
- 均值：$E[X] = \frac{a+b}{2}$。方差：$\text{Var}(X) = \frac{(b-a)^2}{12}$。

- 随机数生成器通常以 Uniform(0,1) 样本为起点；其他分布可以通过变换这些均匀样本生成。

- **正态（高斯）分布**：统计学中最重要的分布之一。在满足中心极限定理条件时，许多独立同分布、方差有限的随机变量的样本均值会随样本量增加而趋近正态分布，无论原始分布是什么形状。**编者注：**原文把这一结论简化为独立随机变量的平均值趋于正态；实际还需满足适当条件，例如同分布且方差有限。

$$f(x) = \frac{1}{\sigma\sqrt{2\pi}} \exp\!\left(-\frac{(x - \mu)^2}{2\sigma^2}\right)$$
- 均值：$E[X] = \mu$。方差：$\text{Var}(X) = \sigma^2$。

- **标准正态分布**的 $\mu = 0$、$\sigma = 1$。任何正态变量 $X$ 都可以通过 $Z = (X - \mu)/\sigma$ 标准化为标准正态变量 $Z$。

![钟形曲线及按 68-95-99.7 经验法则标出的区域](../images/normal_empirical.svg)


- 对正态分布，**经验法则**（68-95-99.7 法则）指出：
    - 约 68% 的数据落在均值的 $\pm 1\sigma$ 范围内；
    - 约 95% 的数据落在均值的 $\pm 2\sigma$ 范围内；
    - 约 99.7% 的数据落在均值的 $\pm 3\sigma$ 范围内。

- 在机器学习中，正态分布几乎无处不在：权重初始化、数据增强中的噪声以及 MSE 损失背后的假设（隐式地假设误差服从高斯分布），以及变分自编码器中的重参数化技巧。

- **指数分布**：对泊松过程中事件之间的时间间隔建模。如果事件以速率 $\lambda>0$ 到达，等待时间服从 Exponential$(\lambda)$ 分布。

$$f(x) = \lambda e^{-\lambda x}, \quad x \ge 0$$
- 均值：$E[X] = 1/\lambda$。方差：$\text{Var}(X) = 1/\lambda^2$。

- 与离散变量的几何分布一样，指数分布也具有**无记忆性**：$P(X > s + t \mid X > s) = P(X > t)$。再等待 $t$ 个时间单位的概率，不取决于此前已经等待了多久。

- **伽马分布**是指数分布的推广。它描述泊松过程中直到第 $\alpha$ 个事件发生所需的时间（指数分布对应 $\alpha = 1$）。公式中的 $\alpha,\beta>0$。

$$f(x) = \frac{\beta^\alpha}{\Gamma(\alpha)} x^{\alpha - 1} e^{-\beta x}, \quad x > 0$$
- $\alpha$ 是形状参数，$\beta$ 是速率参数；二者共同决定分布的形状和尺度。$\Gamma(\alpha)$ 是伽马函数，它把阶乘推广到实数：对于正整数，$\Gamma(n) = (n-1)!$。

- 均值：$E[X] = \alpha/\beta$。方差：$\text{Var}(X) = \alpha/\beta^2$。

- **贝塔分布**：定义在区间 $[0, 1]$ 上，常用于对概率、比例和比率建模；其参数满足 $\alpha,\beta>0$。

$$f(x) = \frac{x^{\alpha - 1}(1 - x)^{\beta - 1}}{B(\alpha, \beta)}, \quad 0 \le x \le 1$$
- 分母 $B(\alpha, \beta) = \frac{\Gamma(\alpha)\Gamma(\beta)}{\Gamma(\alpha + \beta)}$ 是贝塔函数，也是归一化常数。

- 均值：$E[X] = \frac{\alpha}{\alpha + \beta}$。方差：$\text{Var}(X) = \frac{\alpha\beta}{(\alpha+\beta)^2(\alpha+\beta+1)}$。

- 贝塔分布是伯努利和二项分布似然的共轭先验。这意味着，如果先验是贝塔分布、数据服从伯努利分布，后验也会是贝塔分布，从而可以解析地进行贝叶斯更新。我们将在文件 04 中使用这一点。

![四种常见的分布形状：均匀、指数、贝塔和泊松](../images/common_distributions.svg)


- **卡方分布**（$\chi^2$）：如果将 $k$ 个独立标准正态随机变量分别平方再求和，结果服从自由度为 $k$ 的 $\chi^2$ 分布，其中 $k$ 为正整数。

$$f(x) = \frac{1}{2^{k/2}\Gamma(k/2)} x^{k/2 - 1} e^{-x/2}, \quad x > 0$$
- 均值：$E[X] = k$。方差：$\text{Var}(X) = 2k$。

- $\chi^2$ 分布实际上是伽马分布的一个特例，对应 $\alpha = k/2$、$\beta = 1/2$。它出现在第 4 章介绍的卡方检验、拟合优度检验以及方差置信区间的计算中。

- **学生 t 分布**：形状类似正态分布，但尾部更厚。当用小样本估计正态总体的均值、且总体方差未知时，会得到 t 分布。

$$f(x) = \frac{\Gamma\!\left(\frac{\nu+1}{2}\right)}{\sqrt{\nu\pi}\,\Gamma\!\left(\frac{\nu}{2}\right)} \left(1 + \frac{x^2}{\nu}\right)^{-(\nu+1)/2}$$
- 参数 $\nu>0$ 是自由度。当 $\nu \to \infty$ 时，t 分布收敛于标准正态分布；当 $\nu$ 较小时，较厚的尾部会给极端值更高的概率，反映小样本带来的额外不确定性。

- 均值：$E[X] = 0$（当 $\nu > 1$ 时）。方差：$\text{Var}(X) = \frac{\nu}{\nu - 2}$（当 $\nu > 2$ 时）。

- t 分布用于 t 检验（第 4 章）；在贝叶斯推断中，对未知方差积分消去后，它也会作为边际分布出现。

- 总结关键分布：

| 分布 | 类型 | 支持集 | 均值 | 方差 |
|---|---|---|---|---|
| 伯努利分布 $(p)$ | 离散 | $\{0,1\}$ | $p$ | $p(1-p)$ |
| 二项分布 $(n,p)$ | 离散 | $\{0,\ldots,n\}$ | $np$ | $np(1-p)$ |
| 泊松分布 $(\lambda)$ | 离散 | $\{0,1,2,\ldots\}$ | $\lambda$ | $\lambda$ |
| 几何分布 $(p)$ | 离散 | $\{1,2,3,\ldots\}$ | $1/p$ | $(1-p)/p^2$ |
| 均匀分布 $(a,b)$ | 连续 | $[a,b]$ | $(a+b)/2$ | $(b-a)^2/12$ |
| 正态分布 $(\mu,\sigma^2)$ | 连续 | $(-\infty,\infty)$ | $\mu$ | $\sigma^2$ |
| 指数分布 $(\lambda)$ | 连续 | $[0,\infty)$ | $1/\lambda$ | $1/\lambda^2$ |
| 伽马分布 $(\alpha,\beta)$ | 连续 | $(0,\infty)$ | $\alpha/\beta$ | $\alpha/\beta^2$ |
| 贝塔分布 $(\alpha,\beta)$ | 连续 | $[0,1]$ | $\alpha/(\alpha+\beta)$ | 见上文 |
| $\chi^2(k)$ | 连续 | $(0,\infty)$ | $k$ | $2k$ |
| 学生 t 分布 $(\nu)$ | 连续 | $(-\infty,\infty)$ | $0$（$\nu>1$） | $\nu/(\nu-2)$（$\nu>2$） |

## 编程任务（使用 Colab 或笔记本）

1. 绘制 $n=20$、不同 $p$ 值下的二项分布 PMF。观察分布形状如何从右偏，经对称变为左偏。**编者注：**代码按 $p=0.2, 0.5, 0.8$ 的顺序绘图；原文把两侧偏态的方向写反了。
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt
from math import comb

n = 20
ks = jnp.arange(0, n + 1)

fig, axes = plt.subplots(1, 3, figsize=(12, 4), sharey=True)
for ax, p, color in zip(axes, [0.2, 0.5, 0.8], ["#e74c3c", "#3498db", "#27ae60"]):
    pmf = jnp.array([comb(n, int(k)) * p**k * (1-p)**(n-k) for k in ks])
    ax.bar(ks, pmf, color=color, alpha=0.7)
    ax.set_title(f"Binomial(n={n}, p={p})")
    ax.set_xlabel("k")
axes[0].set_ylabel("P(X = k)")
plt.tight_layout()
plt.show()
```

2. 验证泊松分布对二项分布的近似。设 $n = 1000$、$p = 0.003$，比较二项分布 $(n, p)$ 与泊松分布 $(\lambda = np)$。
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt
from math import comb, factorial, exp

n, p = 1000, 0.003
lam = n * p
ks = jnp.arange(0, 15)

binom_pmf = jnp.array([comb(n, int(k)) * p**k * (1-p)**(n-k) for k in ks])
poisson_pmf = jnp.array([lam**k * exp(-lam) / factorial(int(k)) for k in ks])

plt.figure(figsize=(8, 4))
plt.bar(ks - 0.15, binom_pmf, width=0.3, color="#3498db", alpha=0.7, label=f"Binomial({n},{p})")
plt.bar(ks + 0.15, poisson_pmf, width=0.3, color="#e74c3c", alpha=0.7, label=f"Poisson({lam})")
plt.xlabel("k")
plt.ylabel("P(X = k)")
plt.title("Poisson approximation to Binomial")
plt.legend()
plt.show()
```

3. 从正态分布中采样并验证经验法则。计算落在 1、2 和 3 个标准差内的样本比例。
```python
import jax
import jax.numpy as jnp

key = jax.random.PRNGKey(42)
mu, sigma = 5.0, 2.0
samples = mu + sigma * jax.random.normal(key, shape=(100_000,))

for k in [1, 2, 3]:
    within = jnp.abs(samples - mu) <= k * sigma
    print(f"Within {k}σ: {within.mean():.4f} (expected: {[0.6827, 0.9545, 0.9973][k-1]:.4f})")
```

4. 探索贝塔分布如何随 $\alpha$ 和 $\beta$ 变化。绘制几种分布形状，观察它们如何从均匀分布变为偏斜分布或集中分布。**编者注：**按常用偏度定义，$\mathrm{Beta}(2,5)$ 右偏，$\mathrm{Beta}(5,2)$ 左偏；原文代码中的图例把两者标反。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

x = jnp.linspace(0.01, 0.99, 200)

def beta_pdf(x, a, b):
    # Unnormalised for shape comparison
    return x**(a-1) * (1-x)**(b-1)

plt.figure(figsize=(10, 5))
params = [(1,1,"Uniform"), (2,5,"Left skew"), (5,2,"Right skew"),
          (5,5,"Symmetric"), (0.5,0.5,"U-shape")]
colors = ["#999", "#e74c3c", "#3498db", "#27ae60", "#9b59b6"]

for (a, b, label), color in zip(params, colors):
    y = beta_pdf(x, a, b)
    y = y / jnp.trapezoid(y, x)  # normalise
    plt.plot(x, y, label=f"α={a}, β={b} ({label})", color=color, linewidth=2)

plt.xlabel("x")
plt.ylabel("Density")
plt.title("Beta distribution shapes")
plt.legend()
plt.grid(alpha=0.3)
plt.show()
```
