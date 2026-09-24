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

*信息论通过量化信息、惊讶和概率分布之间的差异来定量信息。这个文件涵盖了熵、交叉熵、KL散度、互信息和惊讶的概念，这些概念是ML中几乎所有的分类损失函数、VAE目标和数据压缩方案背后的基础。*

- 信息论由 Claude Shannon 在1948年创立，为我们提供了一个数学框架来定量信息。它回答了诸如：你对一个事件感到惊讶吗？一条消息传递了多少信息？两个概率分布之间有多不同？的问题。*

- 这些问题听起来抽象，但它们是机器学习损失函数、数据压缩和通信系统的基础。交叉熵损失，分类中最常见的损失函数，直接来自信息论。

- 从最简单的问题开始：一个事件携带多少信息？

- **惊喜**（也称为自信息）衡量事件的意外程度。如果某事非常可能发生，你几乎学不到什么。如果某事罕见发生，你会学到很多。

- 如果你在沙漠里，有人告诉你它晴朗，这并不太有帮助。如果他们告诉你它下雪了，那真是太有帮助了。突发性（surprise）形式化了这种直觉：

$$I(x) = \log_2 \frac{1}{p(x)} = -\log_2 p(x)$$
- 单位是 **比特** 时，我们使用 $\log_2$。一个公平的硬币翻转有 $-\log_2(0.5) = 1$ 比特的惊喜值。概率为 $1/8$ 的事件有 $\log_2(8) = 3$ 比特的惊喜值。

- 为什么不是 $1/p$ 而是用对数？有三个原因：
    - 某个事件（$p = 1$）应该给出零信息：$\log(1) = 0$，但 $1/1 = 1$ 不行。
    - 独立事件应该具有加性信息：$\log(1/p_1 p_2) = \log(1/p_1) + \log(1/p_2)$。
    - 我们希望一个平滑、行为良好的函数。$1/p$ 发散；$\log(1/p)$ 增长缓慢。

- **熵**是预期惊喜，从分布中采样事件的平均信息量。它衡量了分布的不确定性或“不可预测性”：

$$H(X) = E[I(X)] = -\sum_{x} p(x) \log_2 p(x)$$
![二维空间中的向量](../images/surprisal_entropy.svg)


- 一枚公平的硬币有 $H = -0.5\log_2(0.5) - 0.5\log_2(0.5) = 1$ 位熵。最大不确定性。

- 一个带有 $p = 0.9$ 的偏置硬币有 $H = -0.9\log_2(0.9) - 0.1\log_2(0.1) \approx 0.469$ 位熵。不太不确定，所以熵较少。

- 一个确定性事件（$p = 1$）具有熵 $H = 0$。没有任何不确定性。

- 熵在所有结果等概率时最大。对于 $n$ 等概率的结果，熵为 $H = \log_2 n$。一个公平的骰子有 $\log_2 6 \approx 2.585$ 位熵。

- 信息熵的实用意义是 **压缩**。香农的信息编码定理表明，你无法将数据压缩到低于其信息率以下而不丢失信息。一个每个像素都等概率出现（最大熵）的图像不能被压缩。一个大部分是白色（低熵）的图像可以很好地压缩。

- 对于一个快速的尺度感：灰度像素（256个值）的最大熵是8位。一个1080p灰度图像最多有$1920 \times 1080 \times 8 \approx 16.6$百万位。真实图像的熵较低，因为相邻像素是相关的，这就是为什么JPEG压缩有效的原因。

- 对于连续随机变量，离散和变为积分。 **差分熵** 是：

$$h(X) = -\int_{-\infty}^{\infty} f(x) \log f(x)\, dx$$
- 一个 variance为 $\sigma^2$ 的高斯分布的差分熵为 $h = \frac{1}{2}\log_2(2\pi e \sigma^2)$。在具有相同方差的所有分布中，高斯分布的熵最大。这是 Gaussian 在建模中最常见原因之一：它对指定均值和方差做出的假设最少。

- 互信息度量了知道一个变量多少能告诉你另一个变量的信息。当你观察到$Y$时，关于$X$的不确定性减少了：

$$I(X; Y) = H(X) - H(X|Y) = H(Y) - H(Y|X)$$
- 等价地：

$$I(X; Y) = \sum_{x,y} p(x,y) \log_2 \frac{p(x,y)}{p(x) p(y)}$$
- 如果 $X$ 和 $Y$ 独立，$p(x,y) = p(x)p(y)$ 的互信息为零。它们越相关，互信息越高。

- 在机器学习中，互信息用于特征选择（选择与目标具有高互信息的特征），在信息瓶颈方法中，以及在评估聚类质量时使用。

- **交叉熵**衡量使用优化后的分布 $q$ 编码事件的平均比特数，该分布与 $p$ 匹配。

$$H(p, q) = -\sum_{x} p(x) \log_2 q(x)$$
- 如果 $p$ 完美匹配 $q$，交叉熵等于熵：$H(p, p) = H(p)$。如果 $q$ 是一个糟糕的近似值，交叉熵更高。额外的比特来自不匹配之处。

- 这正是为什么交叉熵在 ML 中作为分类任务的标准损失函数使用的原因。真实标签定义 $p$（一种独热分布），而模型的预测概率定义 $q$。最小化交叉熵促使 $q$ 接近 $p$：

$$\mathcal{L} = -\sum_{c} y_c \log \hat{y}_c$$
- 对于一个单样本，如果真实类别是 $c$，那么简化为 $\mathcal{L} = -\log \hat{y}_c$。损失是模型预测下真实类别的 surprisal。如果模型对正确类别赋予高概率，则损失较低。

- KL散度（Kullback-Leibler散度，也称为相对熵）衡量一个分布与另一个分布之间的差异：

$$D_{\text{KL}}(p \| q) = \sum_{x} p(x) \log \frac{p(x)}{q(x)} = H(p, q) - H(p)$$
- KL divergence is the "extra cost" of using distribution $q$ instead of the true distribution $p$. It is always non-negative ($D_{\text{KL}} \ge 0$) and equals zero only when $p = q$.

![两个分布 p 和 q，它们之间的间隙代表 KL 分散度](../images/kl_divergence.svg)


- KL divergence is not symmetric: $D_{\text{KL}}(p \| q) \ne D_{\text{KL}}(q \| p)$. This asymmetry matters. $D_{\text{KL}}(p \| q)$ penalises $q$ for placing low probability where $p$ has high probability (because $\log(p/q)$ blows up). $D_{\text{KL}}(q \| p)$ penalises the reverse.

- 这种不对称导致两种近似方法：
    - 最小化 $D_{\text{KL}}(p \| q)$ 产生 **模匹配** 行为：$q$ 覆盖所有 $p$ 的模式，但可能过于分散。
    - 最小化 $D_{\text{KL}}(q \| p)$ 产生 **模寻求** 行为：$q$ 集中在一个 $p$ 模式上，但可能遗漏其他。这就是变分推理使用的做法。

- 由于 $H(p)$ 对模型是常数，最小化交叉熵 $H(p, q)$ 等价于最小化 $D_{\text{KL}}(p \| q)$。这就是为什么我们可以使用交叉熵损失，并知道我们也在最小化真分布和预测分布之间的 KL 散度。

- KL散度在贝叶斯更新中扮演着核心角色。后验 $P(\theta | D)$ 是与观测数据一致的分布，其 KL 散度与先验 $P(\theta)$ 最接近。每次新观察都会更新后验，从而减少关于 $\theta$ 的不确定性。

- 在变分自编码器（VAEs）中，损失函数有两个项：重建损失（交叉熵）和一个KL散度项，该项用于使潜在空间保持接近标准正态分布。

- 将一切联系起来：熵告诉你分布的内在不确定性，交叉熵告诉你模型如何逼近现实，而KL散度告诉你两个之间的差距。这三个量构成了现代机器学习优化的基础。

## 编程任务（使用 CoLab 或笔记本）

1. 计算各种分布的熵，并验证在给定可能结果数量时，均匀分布具有最大熵。
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

2. 计算真分布与几个近似分布之间的交叉熵和KL散度。验证 $D_{\text{KL}}(p \| q) = H(p, q) - H(p)$。
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

3. 显示KL散度不对称性，通过计算两个不同分布的KL散度 $D_{\text{KL}}(p \| q)$ 和 $D_{\text{KL}}(q \| p)$。
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

4. 在训练过程中模拟交叉熵损失。创建一个“真”的独热标签，并展示随着模型预测概率提高，损失如何下降。
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
