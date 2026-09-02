---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 05 - probability/05. information theory.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 8d2c18d291775e88e92e471f6b485aee0ce8d0d88b24df1cb2ca448b9a671fc4
status: reviewed
---
# 信息论

*信息论量化信息量、惊奇度以及概率分布之间的差异。本篇涵盖熵、交叉熵、KL 散度、互信息和自信息量；这些概念支撑着机器学习中使用的各种分类损失函数、VAE 目标和数据压缩方案。*

- 信息论由 Claude Shannon 于 1948 年创立，为量化信息提供了数学框架。它回答这样的问题：一个事件发生时应该有多惊讶？一条消息携带多少信息？两个概率分布有多大差异？

- 这些问题听起来很抽象，但它们是机器学习损失函数、数据压缩和通信系统的基础。分类中最常见的损失函数——交叉熵损失——就直接来自信息论。

- 先从最简单的问题开始：一个事件携带多少信息？

- **自信息量**（也称惊奇度）衡量一个事件有多出乎意料。如果极可能发生的事情发生了，你几乎没有获得新信息；如果罕见的事情发生了，你就会学到很多。

- 如果你住在沙漠里，有人告诉你天气晴朗，这没什么信息量；如果他告诉你正在下雪，那就非常有信息量。自信息量把这种直觉形式化为：

$$I(x) = \log_2 \frac{1}{p(x)} = -\log_2 p(x)$$

- 使用 $\log_2$ 时，单位是 **bit**。一次公平抛硬币的自信息量为 $-\log_2(0.5) = 1$ bit。概率为 $1/8$ 的事件，其自信息量为 $\log_2(8) = 3$ bit。

- 为什么使用对数，而不直接使用 $1/p$？有三个原因：
    - 确定发生的事件（$p = 1$）应该带来零信息：$\log(1) = 0$，而 $1/1 = 1$。
    - 独立事件的信息量应该可以相加：$\log(1/p_1 p_2) = \log(1/p_1) + \log(1/p_2)$。
    - 我们希望函数平滑且性质良好。$1/p$ 会爆炸式增长，而 $\log(1/p)$ 增长得更温和。

- **熵**是自信息量的期望，也就是从一个分布中采样一个事件时平均获得的信息量。它衡量分布的不确定性或“不可预测性”：

$$H(X) = E[I(X)] = -\sum_{x} p(x) \log_2 p(x)$$

![柱状图显示高概率事件的自信息量低，反之亦然；熵是加权平均值](../images/surprisal_entropy.svg)

- 公平硬币的熵为 $H = -0.5\log_2(0.5) - 0.5\log_2(0.5) = 1$ bit，即最大不确定性。

- 偏置为 $p = 0.9$ 的硬币，其熵为 $H = -0.9\log_2(0.9) - 0.1\log_2(0.1) \approx 0.469$ bit。不确定性更低，因此熵也更低。

- 确定性事件（$p = 1$）的熵为 $H = 0$，完全没有不确定性。

- 当所有结果等可能时，熵达到最大值。对于 $n$ 个等可能结果，$H = \log_2 n$。公平骰子的熵为 $\log_2 6 \approx 2.585$ bit。

- 熵的实际意义在于**压缩**。Shannon 信源编码定理指出，在不丢失信息的情况下，不能把数据压缩到低于其熵率。每个像素都等可能的图像（最大熵）无法被压缩；大部分像素都是白色的图像（低熵）则很容易压缩。

- 先快速感受一下量级：一个灰度像素（256 个取值）的最大熵是 8 bit。一张 1080p 灰度图像最多包含 $1920 \times 1080 \times 8 \approx 16.6$ million bit。真实图像的熵要低得多，因为相邻像素存在相关性，这正是 JPEG 压缩有效的原因。

- 对于连续随机变量，离散求和会变成积分。**微分熵**为：

$$h(X) = -\int_{-\infty}^{\infty} f(x) \log f(x)\, dx$$

- 方差为 $\sigma^2$ 的高斯分布，其微分熵为 $h = \frac{1}{2}\log_2(2\pi e \sigma^2)$。在所有具有相同方差的分布中，高斯分布的熵最大。这也是高斯分布在建模中如此常见的原因之一：除了给定的均值和方差之外，它做出的额外假设最少。

- **互信息**衡量知道一个变量后能告诉你多少关于另一个变量的信息。它表示观测到 $Y$ 后关于 $X$ 的不确定性减少了多少：

$$I(X; Y) = H(X) - H(X|Y) = H(Y) - H(Y|X)$$

- 等价地：

$$I(X; Y) = \sum_{x,y} p(x,y) \log_2 \frac{p(x,y)}{p(x) p(y)}$$

- 如果 $X$ 和 $Y$ 相互独立，则 $p(x,y) = p(x)p(y)$，互信息为零。二者依赖性越强，互信息越高。

- 在机器学习中，互信息用于特征选择（选择与目标具有高 MI 的特征）、信息瓶颈方法和聚类质量评估。

- **交叉熵**衡量使用针对分布 $q$ 优化的编码来编码来自分布 $p$ 的事件时，平均所需的 bit 数：

$$H(p, q) = -\sum_{x} p(x) \log_2 q(x)$$

- 如果 $q$ 与 $p$ 完全匹配，交叉熵就等于熵：$H(p, p) = H(p)$。如果 $q$ 是一个糟糕的近似，交叉熵会更高，多出来的 bit 来自二者的不匹配。

- 这正是交叉熵成为机器学习分类标准损失函数的原因。真实标签定义 $p$（一个独热分布），模型预测的概率定义 $q$。最小化交叉熵会推动 $q$ 接近 $p$：

$$\mathcal{L} = -\sum_{c} y_c \log \hat{y}_c$$

- 对于真实类别为 $c$ 的单个样本，这会简化为 $\mathcal{L} = -\log \hat{y}_c$。这个损失就是在模型预测下真实类别的自信息量。如果模型为正确类别分配了高概率，损失就低。

- **KL 散度**（Kullback-Leibler divergence，也称相对熵）衡量一个分布与另一个分布相差多少：

$$D_{\text{KL}}(p \| q) = \sum_{x} p(x) \log \frac{p(x)}{q(x)} = H(p, q) - H(p)$$

- KL 散度是使用分布 $q$ 而不是真实分布 $p$ 时产生的“额外成本”。它总是非负的（$D_{\text{KL}} \ge 0$），且只有在 $p = q$ 时才等于零。

![分布 p 和 q；二者之间的差距表示 KL 散度](../images/kl_divergence.svg)

- KL 散度不具有对称性：$D_{\text{KL}}(p \| q) \ne D_{\text{KL}}(q \| p)$。这种不对称性很重要。$D_{\text{KL}}(p \| q)$ 会惩罚 $q$ 在 $p$ 概率较高的位置赋予低概率的行为（因为 $\log(p/q)$ 会变得很大）；$D_{\text{KL}}(q \| p)$ 惩罚的则相反。

- 这种不对称性带来了两种近似风格：
    - 最小化 $D_{\text{KL}}(p \| q)$ 会产生**矩匹配**行为：$q$ 覆盖 $p$ 的所有众数，但可能过于分散。
    - 最小化 $D_{\text{KL}}(q \| p)$ 会产生**寻峰**行为：$q$ 集中于 $p$ 的一个众数，但可能错过其他众数。变分推断使用的就是这种方式。

- 由于相对于模型而言 $H(p)$ 是常数，最小化交叉熵 $H(p, q)$ 等价于最小化 $D_{\text{KL}}(p \| q)$。因此使用交叉熵损失时，也是在最小化真实分布与预测分布之间的 KL 散度。

- KL 散度在**贝叶斯更新**中发挥核心作用。后验 $P(\theta | D)$ 是与观测数据一致、且在 KL 散度意义下最接近先验 $P(\theta)$ 的分布。每个新观测都会更新后验，减少关于 $\theta$ 的不确定性。

- 在变分自编码器（VAE）中，损失函数包含两项：重建损失（交叉熵）和 KL 散度项，后者将潜空间正则化，使其保持接近标准正态分布。

- 总结起来：熵告诉你一个分布的内在不确定性，交叉熵告诉你模型对现实的近似程度，KL 散度告诉你二者之间的差距。这三个量构成了现代机器学习优化的基础。

## 编程任务（使用 CoLab 或 notebook）

1. 计算多个分布的熵，并验证对于给定数量的结果，均匀分布具有最大熵。
```python
import jax.numpy as jnp

def entropy(p):
    """Compute entropy in bits. Filter out zero-probability events."""
    p = p[p > 0]
    return -jnp.sum(p * jnp.log2(p))

# Fair die
fair = jnp.ones(6) / 6
print(f"Fair die entropy:   {entropy(fair):.4f} bits (max = log2(6) = {jnp.log2(6.):.4f})")

# Loaded die
loaded = jnp.array([0.1, 0.1, 0.1, 0.1, 0.1, 0.5])
print(f"Loaded die entropy: {entropy(loaded):.4f} bits")

# Deterministic
det = jnp.array([0.0, 0.0, 0.0, 0.0, 0.0, 1.0])
print(f"Deterministic:      {entropy(det):.4f} bits")

# Fair coin
coin = jnp.array([0.5, 0.5])
print(f"Fair coin entropy:  {entropy(coin):.4f} bits")
```

2. 计算真实分布与多个近似分布之间的交叉熵和 KL 散度。验证 $D_{\text{KL}}(p \| q) = H(p, q) - H(p)$。
```python
import jax.numpy as jnp

def cross_entropy(p, q):
    return -jnp.sum(p * jnp.log2(jnp.clip(q, 1e-10, 1.0)))

def kl_divergence(p, q):
    mask = p > 0
    return jnp.sum(jnp.where(mask, p * jnp.log2(p / jnp.clip(q, 1e-10, 1.0)), 0.0))

def entropy(p):
    p = p[p > 0]
    return -jnp.sum(p * jnp.log2(p))

p = jnp.array([0.4, 0.3, 0.2, 0.1])  # true distribution

for name, q in [("perfect match", p),
                ("slight mismatch", jnp.array([0.35, 0.30, 0.25, 0.10])),
                ("big mismatch", jnp.array([0.1, 0.1, 0.1, 0.7]))]:
    h_p = entropy(p)
    h_pq = cross_entropy(p, q)
    kl = kl_divergence(p, q)
    print(f"{name:20s}: H(p)={h_p:.4f}, H(p,q)={h_pq:.4f}, "
          f"KL={kl:.4f}, H(p,q)-H(p)={h_pq-h_p:.4f}")
```

3. 对两个不同的分布分别计算 $D_{\text{KL}}(p \| q)$ 和 $D_{\text{KL}}(q \| p)$，展示 KL 散度并不对称。
```python
import jax.numpy as jnp

def kl_div(p, q):
    mask = p > 0
    return float(jnp.sum(jnp.where(mask, p * jnp.log2(p / jnp.clip(q, 1e-10, 1.0)), 0.0)))

p = jnp.array([0.9, 0.1])
q = jnp.array([0.5, 0.5])

print(f"D_KL(p || q) = {kl_div(p, q):.4f}")
print(f"D_KL(q || p) = {kl_div(q, p):.4f}")
print(f"Not the same! KL divergence is asymmetric.")
```

4. 模拟训练过程中的交叉熵损失。创建一个“真实”的独热标签，展示随着模型预测概率变好，损失如何下降。
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt

# True label: class 2 out of 4
true_label = jnp.array([0, 0, 1, 0])

# Simulate improving predictions
steps = []
losses = []
for confidence in jnp.linspace(0.25, 0.99, 50):
    # Model becomes more confident in class 2
    remaining = (1 - confidence) / 3
    pred = jnp.array([remaining, remaining, confidence, remaining])
    loss = -jnp.sum(true_label * jnp.log(jnp.clip(pred, 1e-10, 1.0)))
    steps.append(float(confidence))
    losses.append(float(loss))

plt.figure(figsize=(8, 4))
plt.plot(steps, losses, color="#e74c3c", linewidth=2)
plt.xlabel("Model confidence in true class")
plt.ylabel("Cross-entropy loss")
plt.title("Cross-entropy loss decreases as predictions improve")
plt.grid(alpha=0.3)
plt.show()
```
