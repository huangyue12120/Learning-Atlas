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

*概率分布描述了随机结果如何在可能值之间分布。本文件列出了最常见的离散和连续分布；伯努利、二项式、泊松、高斯、指数、贝塔等，给出了每个分布的公式、直观理解以及机器学习应用（损失函数、先验概率、噪声模型）*

- 在第4章中我们介绍了随机变量、PMF、PDF和CDF。在这里，我们将列出在ML和统计中遇到的重要概率分布，并给出每个分布的直观理解、公式、均值和方差。

- 快速回顾三个核心函数（见第4章以获取完整定义）：
    - **PMF** $P(X = x)$：给出每个离散结果的概率。条形图中的柱子。
    - **PDF** $f(x)$：给出连续变量在每个点的密度。曲线之间两个点之间的面积是概率。
    - **CDF** $F(x) = P(X \le x)$：到$x$的累积概率。总是从0到1，永不减少。

- 概率分布的**支持集**是PMF或PDF为正的值集合。对于掷骰子，支持集是$\{1,2,3,4,5,6\}$。对于高斯分布，支持集是所有实数$(-\infty, \infty)$。

- 概率分布分为两个家族：离散（计数结果，使用PMF）和连续（不可计数结果，使用PDF）。

- **伯努利分布**是最简单的分布。单次试验有两个结果：成功（1）的概率为$p$，失败（0）的概率为$1-p$。

$$P(X = x) = p^x (1 - p)^{1-x}, \quad x \in \{0, 1\}$$
- 均值：$E[X] = p$。方差：$\text{Var}(X) = p(1-p)$。

- 每次抛硬币、每次二分类或每次二元结果都是伯努利试验。在机器学习中，sigmoid函数的输出恰好是伯努利分布参数$p$。

- **二项分布**：在 $n$ 个独立的伯努利试验中，每个试验的概率为 $p$，计算成功次数。

$$P(X = k) = \binom{n}{k} p^k (1-p)^{n-k}, \quad k = 0, 1, \ldots, n$$
- $\binom{n}{k}$ 是文件 01 中的二项式系数，用于计算在 $k$ 次试验中获得 $n$ 次成功的方式数。

- 平均值：$E[X] = np$。方差：$\text{Var}(X) = np(1-p)$。

![伯努利作为单个条形图与二项分布作为计数的分布比较](../images/bernoulli_binomial.svg)


- 示例：抛一个偏置硬币（$p = 0.7$）八次。恰好得到六次正面的概率是 $\binom{8}{6}(0.7)^6(0.3)^2 = 28 \times 0.1176 \times 0.09 \approx 0.296$.

- **泊松分布**：在固定时间间隔或空间内事件的数量，给定已知的平均速率 $\lambda$。当事件稀少且独立时非常有用.

$$P(X = k) = \frac{\lambda^k e^{-\lambda}}{k!}, \quad k = 0, 1, 2, \ldots$$
- 平均值： $E[X] = \lambda$。方差： $\text{Var}(X) = \lambda$。平均值等于方差，这是一个显著的特性.

- 示例：每小时电子邮件数量（$\lambda = 5$），每页错误次数，每秒服务器请求次数。在机器学习中，泊松回归模型用于预测负数计数的数据集.

- 当 $n \to \infty$ 和 $p \to 0$ 保持不变，且 $np = \lambda$ 常数时，二项式 $(n,p)$ 收敛到泊松 $(\lambda)$。这就是为什么泊松在大人口中处理稀有事件非常有效的原因。

- **几何分布**：计算直到第一次成功为止的试验次数。"我抛多少次硬币才能得到我的第一个正面？"

$$P(X = k) = (1-p)^{k-1} p, \quad k = 1, 2, 3, \ldots$$
- 平均值：$E[X] = 1/p$。方差：$\text{Var}(X) = (1-p)/p^2$。

- 几何分布是**无记忆的**：等待的时间长度与之前已经发生的事件无关。 $k$ 多次试验成功并不取决于你已经等待了多少次。这使得它在离散分布中特别。

- 负二项分布：几何分布的推广，计数直到出现指定次数。 $r$-成功（几何是特殊情况） $r=1$)

$$P(X = k) = \binom{k-1}{r-1} p^r (1-p)^{k-r}, \quad k = r, r+1, r+2, \ldots$$
- 平均值：$E[X] = r/p$。方差：$\text{Var}(X) = r(1-p)/p^2$。

- 负二项式分布同样在实践中用于拟合过分散计数数据（其中方差大于均值），而泊松分布则无法处理。

- 现在我们进入连续分布。

- **均匀分布**：区间 $[a, b]$ 内的所有值等概率。PDF 是一个平坦的矩形。

$$f(x) = \frac{1}{b - a}, \quad a \le x \le b$$
- 平均值：$E[X] = \frac{a+b}{2}$。方差：$\text{Var}(X) = \frac{(b-a)^2}{12}$。

- 随机数生成器以（0,1）作为其初始点。其他分布是通过变换这些均匀样本生成的。

- **正态（高斯）分布**：统计学中最重要的一种分布。它自然地从中心极限定理（见第4章）产生：许多独立随机变量的平均值趋向于一个正态分布，无论原始分布如何。

$$f(x) = \frac{1}{\sigma\sqrt{2\pi}} \exp\!\left(-\frac{(x - \mu)^2}{2\sigma^2}\right)$$
- 平均值：$E[X] = \mu$。方差：$\text{Var}(X) = \sigma^2$。

- 标准正态的平均值为 $\mu = 0$，标准差为 $\sigma = 1$。任何正态变量 $X$ 可以通过 $Z = (X - \mu)/\sigma$ 标准化为标准正态 $Z$。

![带有68-95-99.7 empirical规则区域填充的钟形曲线](../images/normal_empirical.svg)


- 根据经验法则（68-95-99.7法则），大约有68%的数据落在平均值的 $\pm 1\sigma$ 范围内。
- 大约有95%的数据落在平均值的 $\pm 2\sigma$ 范围内。
- 大约有99.7%的数据落在平均值的 $\pm 3\sigma$ 范围内。

- 在机器学习中，正态分布几乎无处不在：权重初始化、数据增强中的噪声以及 MSE 损失背后的假设（隐式地假设误差服从高斯分布），以及变分自编码器中的重参数化技巧。

- **指数分布**：模型泊松过程之间的事件间隔时间。如果事件以 $\lambda$ 的速率发生，等待时间则遵循指数 $(\lambda)$ 分布。

$$f(x) = \lambda e^{-\lambda x}, \quad x \ge 0$$
- 平均值： $E[X] = 1/\lambda$。方差： $\text{Var}(X) = 1/\lambda^2$。

- 和几何分布类似，指数分布是 **无记忆的**： $P(X > s + t | X > s) = P(X > t)$。等待另一个 $t$ 单位的时间与你已经等待了多长时间无关。

- 伽马分布是指数分布的推广。它描述了在泊松过程（指数是$\alpha = 1$）中，直到第$\alpha$个事件为止的时间间隔。

$$f(x) = \frac{\beta^\alpha}{\Gamma(\alpha)} x^{\alpha - 1} e^{-\beta x}, \quad x > 0$$
- $\alpha$（形状）控制形状，$\beta$（速率）控制缩放。$\Gamma(\alpha)$是伽马函数，它将阶乘扩展到实数：$\Gamma(n) = (n-1)!$用于正整数。

- 平均值: $E[X] = \alpha/\beta$. 方差: $\text{Var}(X) = \alpha/\beta^2$.

- **贝塔分布**: 定义在区间 $[0, 1]$，非常适合建模概率、比例和速率等.

$$f(x) = \frac{x^{\alpha - 1}(1 - x)^{\beta - 1}}{B(\alpha, \beta)}, \quad 0 \le x \le 1$$
- 分母 $B(\alpha, \beta) = \frac{\Gamma(\alpha)\Gamma(\beta)}{\Gamma(\alpha + \beta)}$ 是贝塔函数，是一个归一化常数.

- 平均值：$E[X] = \frac{\alpha}{\alpha + \beta}$。方差：$\text{Var}(X) = \frac{\alpha\beta}{(\alpha+\beta)^2(\alpha+\beta+1)}$。

- 贝塔分布是伯努利和二项式似然的共轭先验。这意味着如果您的先验是贝塔，并且您的数据是伯努利，后验也是贝塔，这使得贝叶斯更新分析上可解。我们将使用此在文件 04 中。

![四种常见的分布形状：均匀、指数、贝塔和泊松](../images/common_distributions.svg)


- **卡方分布**（$\chi^2$）：如果从 $k$ 个独立的标准正态随机变量中取平方和，结果遵循一个 $\chi^2$ 分布，其自由度为 $k$。

$$f(x) = \frac{1}{2^{k/2}\Gamma(k/2)} x^{k/2 - 1} e^{-x/2}, \quad x > 0$$
- 平均值：$E[X] = k$。方差：$\text{Var}(X) = 2k$。

- $\chi^2$的分布实际上是Gamma分布的一个特殊案例，其中$\alpha = k/2$和$\beta = 1/2$起作用。它在第4章中的卡方检验、拟合优度检验以及计算方差置信区间时出现。

- **t分布**：类似于正态分布，但尾部更重。它在估计一个未知方差的正态分布总体的均值时出现。

$$f(x) = \frac{\Gamma\!\left(\frac{\nu+1}{2}\right)}{\sqrt{\nu\pi}\,\Gamma\!\left(\frac{\nu}{2}\right)} \left(1 + \frac{x^2}{\nu}\right)^{-(\nu+1)/2}$$
- 参数 $\nu$（nu）是自由度。随着 $\nu \to \infty$ 的增加，t 分布收敛到标准正态分布。当 $\nu$ 很小时，尾部更重，极端值的概率更大，反映了小样本带来的额外不确定性。

- 平均值：$E[X] = 0$（对应 $\nu > 1$）。方差：$\text{Var}(X) = \frac{\nu}{\nu - 2}$（对应 $\nu > 2$）。

- t分布用于t检验（第4章）和在贝叶斯推理中作为未知方差的边际分布出现。

- 总结关键分布：

| 分布 | 类型 | 支持 | 均值 | 方差 |
|---|---|---|---|---| 伯努利 $(p)$ | 离散 | $\{0,1\}$ | $p$ | $p(1-p)$ |
| 二项式 $(n,p)$ | 离散 | $\{0,\ldots,n\}$ | $np$ | $np(1-p)$ |
| 泊松分布 $(\lambda)$ | 离散 $\{0,1,2,\ldots\}$ | $\lambda$ | $\lambda$ |
| 几何 $(p)$ | 离散 | $\{1,2,3,\ldots\}$ | $1/p$ | $(1-p)/p^2$
| 均匀 $(a,b)$ | 连续 | $[a,b]$ | $(a+b)/2$ | $(b-a)^2/12$ |
| 正常 $(\mu,\sigma^2)$ | 持续 | $(-\infty,\infty)$ | $\mu$ | $\sigma^2$ |
| 指数$(\lambda)$ 连续的 $[0,\infty)$ | $1/\lambda$ | $1/\lambda^2$ |
| 伽马$(\alpha,\beta)$ 连续的 $(0,\infty)$ | $\alpha/\beta$ | $\alpha/\beta^2$ |
| Beta$(\alpha,\beta)$ | 连续 | $[0,1]$ | $\alpha/(\alpha+\beta)$ | 见上方 |
| $\chi^2(k)$ | 连续 | $(0,\infty)$ | $k$ | $2k$ |
| 学生 $t(\nu)$ 连续的 $(-\infty,\infty)$ | $0$ | $\nu/(\nu-2)$ |

## 编程任务（使用 CoLab 或 笔记本）

1. 绘制 $n=20$ 的二项 PMF 对于多个 $p$ 值。观察形状从左偏移到对称再到右偏移的变化。
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

2. 验证泊松近似于二项式。设置 $n = 1000$, $p = 0.003$ 和比较二项式 $(n, p)$ 与泊松 $(\lambda = np)$.
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

3. 从正态分布中采样并验证经验法则。计算样本中有多少落在 1, 2 和 3 标准差内.
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

4. 探索贝塔分布，通过改变 $\alpha$ 和 $\beta$ 来变化。绘制几种形状，并观察分布从均匀到偏斜再到集中如何变化.
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
