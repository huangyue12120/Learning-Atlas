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

*概率分布描述随机结果如何分布在可能的取值上。本篇汇总机器学习和统计学中最重要的离散与连续分布，包括伯努利、二项、泊松、高斯、指数、贝塔等，并为每种分布给出公式、直觉、均值、方差和机器学习中的应用（损失函数、先验、噪声模型）。*

- 第 4 章介绍了随机变量、PMF、PDF 和 CDF。本篇汇总你将在机器学习和统计学中遇到的最重要的概率分布，并为每种分布给出直觉、公式、均值和方差。

- 三个核心函数快速回顾（完整定义见第 4 章）：
    - **PMF** $P(X = x)$：给出每个离散结果的概率，也就是柱状图中的柱高。
    - **PDF** $f(x)$：给出连续变量在每个点处的密度。曲线在两个点之间的面积就是该区间的概率。
    - **CDF** $F(x) = P(X \le x)$：累积到 $x$ 为止的概率。它始终从 0 递增到 1，且不会下降。

- 一个分布的**支持集**是 PMF 或 PDF 为正的所有取值组成的集合。掷骰子时，支持集是 $\{1,2,3,4,5,6\}$；正态分布的支持集则是所有实数 $(-\infty, \infty)$。

- 分布清楚地分为两类：离散分布（结果可数，使用 PMF）和连续分布（结果不可数，使用 PDF）。

- **伯努利分布**：最简单的分布。一次试验有两个结果：以概率 $p$ 成功（1），以概率 $1-p$ 失败（0）。

$$P(X = x) = p^x (1 - p)^{1-x}, \quad x \in \{0, 1\}$$

- 均值：$E[X] = p$。方差：$\text{Var}(X) = p(1-p)$。

- 每次抛硬币、每个是/否分类、每个二元结果，都是一次伯努利试验。在机器学习中，sigmoid 函数的输出正好就是伯努利分布的参数 $p$。

- **二项分布**：统计 $n$ 次相互独立的伯努利试验中成功的次数，每次试验的成功概率都相同，均为 $p$。

$$P(X = k) = \binom{n}{k} p^k (1-p)^{n-k}, \quad k = 0, 1, \ldots, n$$

- 第 01 篇中的二项式系数 $\binom{n}{k}$ 统计了在 $n$ 次试验中安排 $k$ 次成功的方式数。

- 均值：$E[X] = np$。方差：$\text{Var}(X) = np(1-p)$。

![伯努利分布表现为单个柱状图，二项分布表现为成功次数上的分布](../images/bernoulli_binomial.svg)

- 例：将一枚有偏硬币（$p = 0.7$）抛 8 次。恰好得到 6 次正面的概率为 $\binom{8}{6}(0.7)^6(0.3)^2 = 28 \times 0.1176 \times 0.09 \approx 0.296$。

- **泊松分布**：在已知平均速率 $\lambda$ 的情况下，统计固定时间或空间区间内发生的事件数。当事件稀少且相互独立时很有用。

$$P(X = k) = \frac{\lambda^k e^{-\lambda}}{k!}, \quad k = 0, 1, 2, \ldots$$

- 均值：$E[X] = \lambda$。方差：$\text{Var}(X) = \lambda$。均值等于方差，这是它的标志性性质。

- 例子包括每小时收到的邮件数（$\lambda = 5$）、每页的错字数、每秒的服务器请求数。在机器学习中，泊松回归用于建模计数数据，此时线性模型可能会预测出负数。

- 当 $n \to \infty$、$p \to 0$，同时保持 $np = \lambda$ 不变时，Binomial$(n,p)$ 会收敛到 Poisson$(\lambda)$。这就是泊松分布适合描述大总体中稀有事件的原因。

- **几何分布**：统计直到第一次成功所需的试验次数。“在第一次得到正面之前，我要抛多少次硬币？”

$$P(X = k) = (1-p)^{k-1} p, \quad k = 1, 2, 3, \ldots$$

- 均值：$E[X] = 1/p$。方差：$\text{Var}(X) = (1-p)/p^2$。

- 几何分布具有**无记忆性**：再等待 $k$ 次试验才成功的概率，不取决于你已经等待了多少次。这使它在离散分布中很特别。

- **负二项分布**：将几何分布推广为统计直到第 $r$ 次成功所需的试验次数（几何分布是 $r=1$ 的特殊情况）。

$$P(X = k) = \binom{k-1}{r-1} p^r (1-p)^{k-r}, \quad k = r, r+1, r+2, \ldots$$

- 均值：$E[X] = r/p$。方差：$\text{Var}(X) = r(1-p)/p^2$。

- 实际中也会用负二项分布建模过度离散的计数数据（即方差超过均值），这是泊松分布无法处理的情况。

- 接下来转向连续分布。

- **均匀分布**：区间 $[a, b]$ 中的所有取值都同样可能。它的 PDF 是一块高度不变的矩形。

$$f(x) = \frac{1}{b - a}, \quad a \le x \le b$$

- 均值：$E[X] = \frac{a+b}{2}$。方差：$\text{Var}(X) = \frac{(b-a)^2}{12}$。

- 随机数生成器通常以 Uniform(0,1) 样本作为起点，其他分布则通过变换这些均匀样本生成。

- **正态（高斯）分布**：统计学中最重要的分布。它自然地出现在中心极限定理中（见第 4 章）：无论原始分布是什么，许多相互独立的随机变量的平均值都会趋近于正态分布。

$$f(x) = \frac{1}{\sigma\sqrt{2\pi}} \exp\!\left(-\frac{(x - \mu)^2}{2\sigma^2}\right)$$

- 均值：$E[X] = \mu$。方差：$\text{Var}(X) = \sigma^2$。

- **标准正态分布**满足 $\mu = 0$、$\sigma = 1$。任意正态变量 $X$ 都可以用 $Z = (X - \mu)/\sigma$ 标准化为标准正态变量 $Z$。

![标出了 68-95-99.7 经验法则区域的钟形曲线](../images/normal_empirical.svg)

- **经验法则**（68-95-99.7 法则）指出：
    - 约 68% 的数据落在均值的 $\pm 1\sigma$ 范围内
    - 约 95% 落在 $\pm 2\sigma$ 范围内
    - 约 99.7% 落在 $\pm 3\sigma$ 范围内

- 在机器学习中，正态分布无处不在：权重初始化、数据增强中的噪声、MSE 损失背后的假设（它隐含地假设误差服从高斯分布），以及变分自编码器中的重参数化技巧。

- **指数分布**：建模泊松过程中事件之间的时间间隔。如果事件以速率 $\lambda$ 到达，那么它们之间的等待时间服从 Exponential$(\lambda)$。

$$f(x) = \lambda e^{-\lambda x}, \quad x \ge 0$$

- 均值：$E[X] = 1/\lambda$。方差：$\text{Var}(X) = 1/\lambda^2$。

- 与离散变量的几何分布一样，指数分布也具有**无记忆性**：$P(X > s + t | X > s) = P(X > t)$。再等待 $t$ 个时间单位的概率，不取决于你已经等待了多久。

- **伽马分布**：指数分布的推广。它建模泊松过程中直到第 $\alpha$ 个事件发生所需的时间（指数分布对应 $\alpha = 1$）。

$$f(x) = \frac{\beta^\alpha}{\Gamma(\alpha)} x^{\alpha - 1} e^{-\beta x}, \quad x > 0$$

- 这里 $\alpha$（形状参数）控制分布形状，$\beta$（速率参数）控制尺度。$\Gamma(\alpha)$ 是伽马函数，它把阶乘推广到了实数：对正整数有 $\Gamma(n) = (n-1)!$。

- 均值：$E[X] = \alpha/\beta$。方差：$\text{Var}(X) = \alpha/\beta^2$。

- **贝塔分布**：定义在区间 $[0, 1]$ 上，非常适合建模概率、比例和速率。

$$f(x) = \frac{x^{\alpha - 1}(1 - x)^{\beta - 1}}{B(\alpha, \beta)}, \quad 0 \le x \le 1$$

- 分母 $B(\alpha, \beta) = \frac{\Gamma(\alpha)\Gamma(\beta)}{\Gamma(\alpha + \beta)}$ 是贝塔函数，也就是归一化常数。

- 均值：$E[X] = \frac{\alpha}{\alpha + \beta}$。方差：$\text{Var}(X) = \frac{\alpha\beta}{(\alpha+\beta)^2(\alpha+\beta+1)}$。

- 贝塔分布是伯努利和二项似然的共轭先验。这意味着，如果先验是贝塔分布、数据来自伯努利分布，那么后验也仍然是贝塔分布，从而可以解析地进行贝叶斯更新。第 04 篇会用到这一点。

![四种常见分布形状：均匀、指数、贝塔和泊松](../images/common_distributions.svg)

- **卡方分布**（$\chi^2$）：如果取 $k$ 个相互独立的标准正态随机变量并将它们的平方相加，结果就服从自由度为 $k$ 的 $\chi^2$ 分布。

$$f(x) = \frac{1}{2^{k/2}\Gamma(k/2)} x^{k/2 - 1} e^{-x/2}, \quad x > 0$$

- 均值：$E[X] = k$。方差：$\text{Var}(X) = 2k$。

- $\chi^2$ 分布其实是伽马分布的特殊情况，对应 $\alpha = k/2$、$\beta = 1/2$。它会出现在假设检验（第 4 章的卡方检验）、拟合优度检验以及方差置信区间的计算中。

- **学生 t 分布**：外形类似正态分布，但尾部更重。当你用小样本估计正态总体的均值，且总体方差未知时，就会出现这种分布。

$$f(x) = \frac{\Gamma\!\left(\frac{\nu+1}{2}\right)}{\sqrt{\nu\pi}\,\Gamma\!\left(\frac{\nu}{2}\right)} \left(1 + \frac{x^2}{\nu}\right)^{-(\nu+1)/2}$$

- 参数 $\nu$（nu）是自由度。当 $\nu \to \infty$ 时，t 分布收敛到标准正态分布。$\nu$ 较小时，更重的尾部会给极端值分配更高概率，反映小样本带来的额外不确定性。

- 均值：$E[X] = 0$（当 $\nu > 1$）。方差：$\text{Var}(X) = \frac{\nu}{\nu - 2}$（当 $\nu > 2$）。

- t 分布用于 t 检验（第 4 章），在贝叶斯推断中，对未知方差进行积分消去后也会作为边缘分布出现。

- 关键分布总结如下：

| 分布 | 类型 | 支持集 | 均值 | 方差 |
|---|---|---|---|---|
| Bernoulli$(p)$ | 离散 | $\{0,1\}$ | $p$ | $p(1-p)$ |
| Binomial$(n,p)$ | 离散 | $\{0,\ldots,n\}$ | $np$ | $np(1-p)$ |
| Poisson$(\lambda)$ | 离散 | $\{0,1,2,\ldots\}$ | $\lambda$ | $\lambda$ |
| Geometric$(p)$ | 离散 | $\{1,2,3,\ldots\}$ | $1/p$ | $(1-p)/p^2$ |
| Uniform$(a,b)$ | 连续 | $[a,b]$ | $(a+b)/2$ | $(b-a)^2/12$ |
| Normal$(\mu,\sigma^2)$ | 连续 | $(-\infty,\infty)$ | $\mu$ | $\sigma^2$ |
| Exponential$(\lambda)$ | 连续 | $[0,\infty)$ | $1/\lambda$ | $1/\lambda^2$ |
| Gamma$(\alpha,\beta)$ | 连续 | $(0,\infty)$ | $\alpha/\beta$ | $\alpha/\beta^2$ |
| Beta$(\alpha,\beta)$ | 连续 | $[0,1]$ | $\alpha/(\alpha+\beta)$ | 见上文 |
| $\chi^2(k)$ | 连续 | $(0,\infty)$ | $k$ | $2k$ |
| Student's $t(\nu)$ | 连续 | $(-\infty,\infty)$ | $0$ | $\nu/(\nu-2)$ |

## 编程任务（使用 CoLab 或 notebook）

1. 对 $n=20$ 取多个不同的 $p$，绘制二项分布的 PMF。观察分布形状如何从左偏变为对称，再变为右偏。
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

2. 验证泊松分布对二项分布的近似。设置 $n = 1000$、$p = 0.003$，比较 Binomial$(n, p)$ 与 Poisson$(\lambda = np)$。
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

3. 从正态分布中采样并验证经验法则。统计落在 1、2、3 个标准差以内的样本比例。
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

4. 通过改变 $\alpha$ 和 $\beta$ 探索贝塔分布。绘制几种形状，观察分布如何从均匀变为偏斜，再变为集中。
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
