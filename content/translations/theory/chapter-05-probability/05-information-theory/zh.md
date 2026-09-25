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

*信息论用于量化信息、不确定性以及概率分布之间的差异。本文介绍熵、交叉熵、KL 散度、互信息和自信息，这些概念构成机器学习分类损失、VAE 目标和数据压缩方法的基础。*

- 信息论由 Claude Shannon 于 1948 年创立，为我们提供了量化信息的数学框架。它回答这样的问题：一个事件会让你多么惊讶？一条消息携带多少信息？两个概率分布有多大差异？

- 这些问题听起来很抽象，但它们是机器学习损失函数、数据压缩和通信系统的基础。分类中最常用的损失函数——交叉熵损失——就直接来自信息论。

- 从最简单的问题开始：一个事件携带多少信息？

- **自信息**（surprisal，也称 self-information）衡量事件所含的信息量，也可理解为事件发生时带来的意外程度。高概率事件提供的信息较少，罕见事件则提供更多信息。

- 如果你住在沙漠里，有人告诉你天气晴朗，这条消息并不令人意外；如果对方告诉你正在下雪，就会带来更多信息。自信息用下面的公式描述这种直觉：

$$I(x) = \log_2 \frac{1}{p(x)} = -\log_2 p(x)$$
- 使用 $\log_2$ 时，单位是**比特**。公平硬币的一次抛掷结果含有 $-\log_2(0.5) = 1$ 比特的自信息；概率为 $1/8$ 的事件含有 $\log_2(8) = 3$ 比特的自信息。

- 为什么不是 $1/p$ 而是用对数？有三个原因：
    - 确定事件（$p = 1$）应当提供零信息：$\log_2(1) = 0$，而 $1/1 = 1$。
    - 独立事件的信息量应相加：$\log_2\frac{1}{p_1p_2} = \log_2\frac{1}{p_1} + \log_2\frac{1}{p_2}$。
    - 对数是平滑且增长较慢的函数；相比之下，$1/p$ 会随 $p$ 趋近于 0 而发散。

- **熵**是自信息的期望值，也就是从某个分布抽取结果时平均获得的信息量。它衡量分布的不确定性或“不可预测性”：

$$H(X) = E[I(X)] = -\sum_{x} p(x) \log_2 p(x)$$
![条形图展示高概率事件的自信息较少、低概率事件的自信息较多；熵是加权平均值](../images/surprisal_entropy.svg)


- 一枚公平硬币的熵为 $H = -0.5\log_2(0.5) - 0.5\log_2(0.5) = 1$ 比特，即最大不确定性。

- 一枚正面概率为 $p = 0.9$ 的有偏硬币，其熵为 $H = -0.9\log_2(0.9) - 0.1\log_2(0.1) \approx 0.469$ 比特。不确定性较低，因此熵也较低。

- 一个确定性事件（$p = 1$）的熵为 $H = 0$，完全没有不确定性。

- 当所有结果等概率时，熵达到最大。对于 $n$ 个等概率结果，$H = \log_2 n$。公平骰子的熵为 $\log_2 6 \approx 2.585$ 比特。

- 熵的实际意义之一是**压缩**。香农源编码定理指出，在无损压缩中，长序列的平均码长不能低于其熵率。像素值均匀分布且整体没有可利用结构的图像难以压缩；大部分为白色、因而熵较低的图像则更容易压缩。**编者注：**单个像素取值均匀本身不足以推出整幅图像无法压缩，还需考虑像素之间的相关性。

- 粗略感受一下量级：一个灰度像素（256 个取值）的最大熵为 8 比特。一张 1080p 灰度图像最多有 $1920 \times 1080 \times 8 \approx 16.6$ 百万比特。真实图像的熵低得多，因为相邻像素存在相关性，这正是 JPEG 压缩有效的原因。

- 对于连续随机变量，离散求和变为积分。**差分熵**为：

$$h(X) = -\int_{-\infty}^{\infty} f(x) \log_2 f(x)\, dx$$

**编者注：**原文未注明此处对数的底数，但后文高斯差分熵公式使用 $\log_2$；这里统一采用底数 2，因此差分熵以比特计。

- 方差为 $\sigma^2$ 的高斯分布，其差分熵为 $h = \frac{1}{2}\log_2(2\pi e \sigma^2)$。在所有方差相同的分布中，高斯分布的熵最大。这也是高斯分布在建模中如此常见的原因之一：除指定的均值和方差外，它作出的假设最少。

- **互信息**衡量知道一个变量能告诉你多少另一个变量的信息。当观察到 $Y$ 时，关于 $X$ 的不确定性减少了：

$$I(X; Y) = H(X) - H(X|Y) = H(Y) - H(Y|X)$$
- 等价地：

$$I(X; Y) = \sum_{x,y} p(x,y) \log_2 \frac{p(x,y)}{p(x) p(y)}$$
- 如果 $X$ 和 $Y$ 独立，即 $p(x,y) = p(x)p(y)$，互信息为零。它们依赖越强，互信息越高。

- 在机器学习中，互信息用于特征选择（选择与目标具有高互信息的特征）、信息瓶颈方法以及聚类质量评估。

- **交叉熵**衡量使用针对分布 $q$ 优化的编码来表示来自分布 $p$ 的事件时，平均需要多少比特。

$$H(p, q) = -\sum_{x} p(x) \log_2 q(x)$$
- 如果 $p$ 完美匹配 $q$，交叉熵等于熵：$H(p, p) = H(p)$。如果 $q$ 是一个糟糕的近似值，交叉熵更高。额外的比特来自不匹配之处。

- 这正是为什么交叉熵在 ML 中作为分类任务的标准损失函数使用的原因。真实标签定义 $p$（一种独热分布），而模型的预测概率定义 $q$。最小化交叉熵促使 $q$ 接近 $p$：

$$\mathcal{L} = -\sum_{c} y_c \log \hat{y}_c$$

**编者注：**该损失中的对数底数取决于实现。使用 $\log_2$ 时以比特计；使用自然对数时以纳特计，数值相差一个常数因子，但最小化结果相同。
- 对于单个样本，若真实类别为 $c$，损失简化为 $\mathcal{L} = -\log \hat{y}_c$。这个损失就是模型预测下真实类别的自信息量；模型给正确类别的概率越高，损失越低。

- **KL 散度**（Kullback–Leibler divergence，也称相对熵）衡量两个概率分布之间的差异：

$$D_{\text{KL}}(p \| q) = \sum_{x} p(x) \log_2 \frac{p(x)}{q(x)} = H(p, q) - H(p)$$

**编者注：**原文此处只写了 $\log$，而熵和交叉熵公式使用 $\log_2$。为保持单位及等式一致，这里采用底数 2。
- KL 散度可以理解为用分布 $q$ 代替真实分布 $p$ 所付出的“额外代价”。它总是非负（$D_{\text{KL}} \ge 0$），且只有 $p = q$ 时才等于零。

![两个分布 p 和 q，其间的间隙表示 KL 散度](../images/kl_divergence.svg)


- KL 散度不具有对称性：$D_{\text{KL}}(p \| q) \ne D_{\text{KL}}(q \| p)$。这种不对称很重要。$D_{\text{KL}}(p \| q)$ 会惩罚 $q$ 在 $p$ 概率较高处给出低概率的情况（因为 $\log(p/q)$ 会变得很大）；$D_{\text{KL}}(q \| p)$ 则惩罚相反的情况。

- 这种不对称导致两种近似方法：
    - 最小化 $D_{\text{KL}}(p \| q)$ 产生**模式覆盖**行为：$q$ 会覆盖 $p$ 的所有模式，但可能过于分散。
    - 最小化 $D_{\text{KL}}(q \| p)$ 产生 **模式寻求** 行为：$q$ 集中在一个 $p$ 模式上，但可能遗漏其他。这就是变分推理使用的做法。

**编者注：**模式覆盖和模式寻求是常见近似分布族下的典型倾向，具体表现取决于近似族和优化目标。

- 由于 $H(p)$ 对模型是常数，最小化交叉熵 $H(p, q)$ 等价于最小化 $D_{\text{KL}}(p \| q)$。这就是为什么我们可以使用交叉熵损失，并知道我们也在最小化真分布和预测分布之间的 KL 散度。

- KL 散度在**贝叶斯更新**中发挥重要作用。观测数据通过似然与先验共同确定后验 $P(\theta | D)$。**编者注：**原文将后验概括为“与数据一致且离先验最近的分布”，一般情况下并不准确；只有在特定优化表述中，贝叶斯更新才可写成包含 KL 项的最小化问题。

- 在变分自编码器（VAE）中，损失函数包含两项：重建损失（交叉熵）和 KL 散度项，后者用于正则化潜在空间，使其接近标准正态分布。

- 三个量可以这样联系起来：熵表示分布本身的不确定性，交叉熵表示模型逼近真实分布的程度，KL 散度表示两者之间的差异。它们构成现代机器学习优化的重要基础。

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
