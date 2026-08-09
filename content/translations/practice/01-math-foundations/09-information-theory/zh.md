---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/01-math-foundations/09-information-theory/docs/en.md
  revision: 7157ca74a135fad2165f680ec4b4e592f075ec21
  sha256: 56e2b277862358e636e71058ac13e9cd31366d39105702aa91570844e1e38953
status: reviewed
---

# 信息论

> 信息论度量惊奇。损失函数建立在它之上。

**类型：** 学习
**语言：** Python
**前置课程：** 第 1 阶段，第 06 课（概率）
**预计时间：** 约 60 分钟

## 学习目标

- 从零计算熵、交叉熵和 KL 散度，并解释它们之间的关系
- 推导为什么最小化交叉熵损失等价于最大化对数似然
- 计算特征与目标之间的互信息，以对特征重要性进行排序
- 将困惑度解释为语言模型从中选择的有效词表大小

## 问题

你在训练的每个分类模型中都会调用 `CrossEntropyLoss()`。你在每篇语言模型论文中都会看到“困惑度”。你会在 VAE、蒸馏和 RLHF 中读到 KL 散度。这些并不是彼此割裂的概念，而是同一个思想的不同表现形式。

信息论为你提供了推理不确定性、压缩和预测的语言。Claude Shannon 于 1948 年发明了信息论，用于解决通信问题。事实证明，训练神经网络也是一个通信问题：模型试图通过由已学习权重构成的含噪信道传递正确标签。

本课将从零构建每个公式，让你了解它们从何而来以及为什么有效。

## 概念

### 信息量（惊奇）

当低概率事件发生时，它携带的信息更多。硬币正面朝上？并不意外。中彩票？非常意外。

概率为 p 的事件，其信息量为：

```
I(x) = -log(p(x))
```

以 2 为底的对数给出 bits。自然对数给出 nats。思想相同，单位不同。

```
Event              Probability    Surprise (bits)
Fair coin heads    0.5            1.0
Rolling a 6        0.167          2.58
1-in-1000 event    0.001          9.97
Certain event      1.0            0.0
```

必然事件携带的信息量为零，因为你早已知道它会发生。

### 熵（平均惊奇）

熵是一个分布所有可能结果的期望惊奇。

```
H(P) = -sum( p(x) * log(p(x)) )  for all x
```

对于二元变量，公平硬币具有最大熵：1 bit。偏置硬币（99% 为正面）的熵很低：0.08 bits。你已经知道大概会发生什么，所以每次抛掷几乎不会告诉你任何信息。

```
Fair coin:    H = -(0.5 * log2(0.5) + 0.5 * log2(0.5)) = 1.0 bit
Biased coin:  H = -(0.99 * log2(0.99) + 0.01 * log2(0.01)) = 0.08 bits
```

熵衡量分布中不可约的不确定性。你无法将数据压缩到低于这个下限。

### 交叉熵（你每天都在使用的损失函数）

交叉熵衡量这样的平均惊奇：事件实际上来自分布 P，你却使用分布 Q 来编码它们。

```
H(P, Q) = -sum( p(x) * log(q(x)) )  for all x
```

P 是真实分布（标签）。Q 是模型的预测。如果 Q 与 P 完全匹配，交叉熵就等于熵。任何失配都会使它变大。

在分类中，P 是 one-hot 向量（真实类别的概率为 1，其他类别都为 0）。交叉熵因此简化为：

```
H(P, Q) = -log(q(true_class))
```

这就是分类任务的完整交叉熵损失公式：最大化正确类别的预测概率。

### KL 散度（分布之间的距离）

KL 散度衡量使用 Q 代替 P 会带来多少额外惊奇。

```
D_KL(P || Q) = sum( p(x) * log(p(x) / q(x)) )  for all x
             = H(P, Q) - H(P)
```

交叉熵等于熵加 KL 散度。由于训练期间真实分布的熵是常量，最小化交叉熵就等同于最小化 KL 散度。你正在把模型分布推向真实分布。

KL 散度不对称：D_KL(P || Q) != D_KL(Q || P)。它并不是真正的距离度量。

### 互信息

互信息衡量知道一个变量能告诉你多少关于另一个变量的信息。

```
I(X; Y) = H(X) - H(X|Y)
        = H(X) + H(Y) - H(X, Y)
```

如果 X 和 Y 独立，互信息为零。知道其中一个不会告诉你任何关于另一个的信息。如果它们完全相关，互信息就等于任一变量的熵。

在特征选择中，特征与目标之间的互信息高，意味着这个特征有用；互信息低，则意味着它是噪声。

### 条件熵

H(Y|X) 衡量观察 X 之后，关于 Y 还剩下多少不确定性。

```
H(Y|X) = H(X,Y) - H(X)
```

两种极端情况：

- 如果 X 完全决定 Y，那么 H(Y|X) = 0。知道 X 就消除了关于 Y 的全部不确定性。例如：X = 摄氏温度，Y = 华氏温度。
- 如果 X 没有告诉你任何关于 Y 的信息，那么 H(Y|X) = H(Y)。知道 X 完全不会减少你的不确定性。例如：X = 抛硬币结果，Y = 明天的天气。

条件熵总是非负，并且不超过 H(Y)：

```
0 <= H(Y|X) <= H(Y)
```

在机器学习中，条件熵会出现在决策树里。每次分裂时，算法都会选择使 H(Y|X) 最小的特征 X，也就是能消除最多标签 Y 不确定性的特征。

### 联合熵

H(X,Y) 是 X 和 Y 的联合分布整体的熵。

```
H(X,Y) = -sum sum p(x,y) * log(p(x,y))   for all x, y
```

关键性质：

```
H(X,Y) <= H(X) + H(Y)
```

当 X 和 Y 独立时等号成立。如果它们共享信息，联合熵就小于各自熵之和。“缺少”的那部分熵恰好就是互信息。

```mermaid
graph TD
    subgraph "Information Venn Diagram"
        direction LR
        HX["H(X)"]
        HY["H(Y)"]
        MI["I(X;Y)<br/>Mutual<br/>Information"]
        HXgY["H(X|Y)<br/>= H(X) - I(X;Y)"]
        HYgX["H(Y|X)<br/>= H(Y) - I(X;Y)"]
        HXY["H(X,Y) = H(X) + H(Y) - I(X;Y)"]
    end

    HXgY --- MI
    MI --- HYgX
    HX -.- HXgY
    HX -.- MI
    HY -.- MI
    HY -.- HYgX
    HXY -.- HXgY
    HXY -.- MI
    HXY -.- HYgX
```

这些关系为：

- H(X,Y) = H(X) + H(Y|X) = H(Y) + H(X|Y)
- I(X;Y) = H(X) - H(X|Y) = H(Y) - H(Y|X)
- H(X,Y) = H(X) + H(Y) - I(X;Y)

### 互信息（深入理解）

互信息 I(X;Y) 量化知道一个变量会让另一个变量的不确定性减少多少。

```
I(X;Y) = H(X) - H(X|Y)
       = H(Y) - H(Y|X)
       = H(X) + H(Y) - H(X,Y)
       = sum sum p(x,y) * log(p(x,y) / (p(x) * p(y)))
```

性质：

- I(X;Y) >= 0 始终成立。观察某个事物不会让你损失信息。
- 当且仅当 X 和 Y 独立时，I(X;Y) = 0。
- I(X;Y) = I(Y;X)。互信息是对称的，这一点不同于 KL 散度。
- I(X;X) = H(X)。一个变量与自身共享全部信息。

**用于特征选择的互信息。** 在机器学习中，你希望特征能够提供有关目标的信息。互信息为特征排序提供了一种有原则的方法：

1. 对每个特征 X_i，计算 I(X_i; Y)，其中 Y 是目标变量。
2. 按 MI 分数对特征排序。
3. 保留前 k 个特征。

这种方法适用于特征与目标之间的任何关系：线性、非线性、单调或非单调。相关性只能捕捉线性关系，MI 则能捕捉所有关系。

| 方法 | 能检测的关系 | 计算成本 | 能处理类别变量？ |
|--------|---------|-------------------|---------------------|
| Pearson 相关系数 | 线性关系 | O(n) | 否 |
| Spearman 相关系数 | 单调关系 | O(n log n) | 否 |
| 互信息 | 任何统计依赖关系 | 使用分箱时为 O(n log n) | 是 |

### 标签平滑与交叉熵

标准分类使用硬目标：[0, 0, 1, 0]。真实类别的概率为 1，其他所有类别的概率为 0。标签平滑将它们替换成软目标：

```
soft_target = (1 - epsilon) * hard_target + epsilon / num_classes
```

当 epsilon = 0.1 且有 4 个类别时：

- 硬目标： [0, 0, 1, 0]
- 软目标： [0.025, 0.025, 0.925, 0.025]

从信息论的角度看，标签平滑增加了目标分布的熵。硬 one-hot 目标的熵为 0，不存在不确定性；软目标的熵为正。

它之所以有帮助，是因为：

- 防止模型将 logits 推向极端值（要在交叉熵下完美匹配 one-hot 目标，需要无限大的 logits）
- 起到正则化作用：模型不能有 100% 的置信度
- 改善校准：预测概率能更好地反映真实的不确定性
- 减小训练行为与推理行为之间的差距

使用标签平滑时，交叉熵损失变为：

```
L = (1 - epsilon) * CE(hard_target, prediction) + epsilon * H_uniform(prediction)
```

第二项会惩罚远离均匀分布的预测，也就是直接正则化置信度。

### 为什么交叉熵是分类损失

三种视角，得出同一个结论。

**信息论视角。** 交叉熵衡量使用模型分布而非真实分布会浪费多少 bits。最小化交叉熵，会让模型成为现实最高效的编码器。

**最大似然视角。** 对于 N 个真实类别为 y_i 的训练样本：

```
Likelihood     = product( q(y_i) )
Log-likelihood = sum( log(q(y_i)) )
Negative log-likelihood = -sum( log(q(y_i)) )
```

最后一行就是交叉熵损失。最小化交叉熵 = 最大化模型下训练数据的似然。

**梯度视角。** 交叉熵相对于 logits 的梯度就是 (predicted - true)。它简洁、稳定且计算快速，因此与 softmax 完美搭配。

### Bits 与 Nats

两者唯一的区别是对数的底。

```
log base 2   -> bits      (information theory tradition)
log base e   -> nats      (machine learning convention)
log base 10  -> hartleys  (rarely used)
```

1 nat = 1/ln(2) bits = 1.4427 bits。PyTorch 和 TensorFlow 默认使用自然对数（nats）。

### 困惑度

困惑度是交叉熵的指数。它表示模型无法确定的、等概率选择的有效数量。

```
Perplexity = 2^H(P,Q)   (if using bits)
Perplexity = e^H(P,Q)   (if using nats)
```

困惑度为 50 的语言模型，平均而言就像它必须从 50 个可能的下一个 token 中均匀选择一样困惑。困惑度越低越好。

GPT-2 在常见基准上实现了约 30 的困惑度。在具有充分代表性的领域中，现代模型的困惑度已降至个位数。

```figure
entropy-kl
```

## 动手构建

### 第 1 步：信息量与熵

```python
import math

def information_content(p, base=2):
    if p <= 0 or p > 1:
        return float('inf') if p <= 0 else 0.0
    return -math.log(p) / math.log(base)

def entropy(probs, base=2):
    return sum(
        p * information_content(p, base)
        for p in probs if p > 0
    )

fair_coin = [0.5, 0.5]
biased_coin = [0.99, 0.01]
fair_die = [1/6] * 6

print(f"Fair coin entropy:   {entropy(fair_coin):.4f} bits")
print(f"Biased coin entropy: {entropy(biased_coin):.4f} bits")
print(f"Fair die entropy:    {entropy(fair_die):.4f} bits")
```

### 第 2 步：交叉熵与 KL 散度

```python
def cross_entropy(p, q, base=2):
    total = 0.0
    for pi, qi in zip(p, q):
        if pi > 0:
            if qi <= 0:
                return float('inf')
            total += pi * (-math.log(qi) / math.log(base))
    return total

def kl_divergence(p, q, base=2):
    return cross_entropy(p, q, base) - entropy(p, base)

true_dist = [0.7, 0.2, 0.1]
good_model = [0.6, 0.25, 0.15]
bad_model = [0.1, 0.1, 0.8]

print(f"Entropy of true dist:     {entropy(true_dist):.4f} bits")
print(f"CE (good model):          {cross_entropy(true_dist, good_model):.4f} bits")
print(f"CE (bad model):           {cross_entropy(true_dist, bad_model):.4f} bits")
print(f"KL divergence (good):     {kl_divergence(true_dist, good_model):.4f} bits")
print(f"KL divergence (bad):      {kl_divergence(true_dist, bad_model):.4f} bits")
```

### 第 3 步：作为分类损失的交叉熵

```python
def softmax(logits):
    max_logit = max(logits)
    exps = [math.exp(z - max_logit) for z in logits]
    total = sum(exps)
    return [e / total for e in exps]

def cross_entropy_loss(true_class, logits):
    probs = softmax(logits)
    return -math.log(probs[true_class])

logits = [2.0, 1.0, 0.1]
true_class = 0

probs = softmax(logits)
loss = cross_entropy_loss(true_class, logits)

print(f"Logits:      {logits}")
print(f"Softmax:     {[f'{p:.4f}' for p in probs]}")
print(f"True class:  {true_class}")
print(f"Loss:        {loss:.4f} nats")
print(f"Perplexity:  {math.exp(loss):.2f}")
```

### 第 4 步：交叉熵等于负对数似然

```python
import random

random.seed(42)

n_samples = 1000
n_classes = 3
true_labels = [random.randint(0, n_classes - 1) for _ in range(n_samples)]
model_logits = [[random.gauss(0, 1) for _ in range(n_classes)] for _ in range(n_samples)]

ce_loss = sum(
    cross_entropy_loss(label, logits)
    for label, logits in zip(true_labels, model_logits)
) / n_samples

nll = -sum(
    math.log(softmax(logits)[label])
    for label, logits in zip(true_labels, model_logits)
) / n_samples

print(f"Cross-entropy loss:      {ce_loss:.6f}")
print(f"Negative log-likelihood: {nll:.6f}")
print(f"Difference:              {abs(ce_loss - nll):.2e}")
```

### 第 5 步：互信息

```python
def mutual_information(joint_probs, base=2):
    rows = len(joint_probs)
    cols = len(joint_probs[0])

    margin_x = [sum(joint_probs[i][j] for j in range(cols)) for i in range(rows)]
    margin_y = [sum(joint_probs[i][j] for i in range(rows)) for j in range(cols)]

    mi = 0.0
    for i in range(rows):
        for j in range(cols):
            pxy = joint_probs[i][j]
            if pxy > 0:
                mi += pxy * math.log(pxy / (margin_x[i] * margin_y[j])) / math.log(base)
    return mi

independent = [[0.25, 0.25], [0.25, 0.25]]
dependent = [[0.45, 0.05], [0.05, 0.45]]

print(f"MI (independent): {mutual_information(independent):.4f} bits")
print(f"MI (dependent):   {mutual_information(dependent):.4f} bits")
```

## 实际使用

以下使用 NumPy 实现相同的概念，也是你在实践中会采用的方式：

```python
import numpy as np

def np_entropy(p):
    p = np.asarray(p, dtype=float)
    mask = p > 0
    result = np.zeros_like(p)
    result[mask] = p[mask] * np.log(p[mask])
    return -result.sum()

def np_cross_entropy(p, q):
    p, q = np.asarray(p, dtype=float), np.asarray(q, dtype=float)
    mask = p > 0
    return -(p[mask] * np.log(q[mask])).sum()

def np_kl_divergence(p, q):
    return np_cross_entropy(p, q) - np_entropy(p)

true = np.array([0.7, 0.2, 0.1])
pred = np.array([0.6, 0.25, 0.15])
print(f"Entropy:    {np_entropy(true):.4f} nats")
print(f"Cross-ent:  {np_cross_entropy(true, pred):.4f} nats")
print(f"KL div:     {np_kl_divergence(true, pred):.4f} nats")
```

你已经从零构建了 `torch.nn.CrossEntropyLoss()` 内部所做的事情。现在你知道训练期间损失为什么会下降：以浪费信息的 nats 为单位衡量，模型的预测分布正在接近真实分布。

## 练习

1. 假设英文字母表的 26 个字母服从均匀分布，计算其熵。然后使用字母的实际频率估计熵。哪个更高？为什么？

2. 对于一个真实类别为 1、模型输出 logits [5.0, 2.0, 0.5] 的样本，手动计算交叉熵损失，然后使用你的 `cross_entropy_loss` 函数验证。什么样的 logits 会得到零损失？

3. 证明 KL 散度不对称。选择两个分布 P 和 Q，计算 D_KL(P || Q) 与 D_KL(Q || P)，并解释它们为什么不同。

4. 构建一个函数，计算一系列 token 预测的困惑度。给定一个由 (true_token_index, predicted_logits) 对组成的列表，返回该序列的困惑度。

## 关键术语

| 术语 | 人们常说的含义 | 实际含义 |
|------|----------------|----------------------|
| 信息量 | “惊奇” | 编码一个事件所需的 bits（或 nats）数：-log(p) |
| 熵 | “随机性” | 一个分布所有结果的平均惊奇，衡量不可约的不确定性。 |
| 交叉熵 | “损失函数” | 使用模型分布 Q 编码来自真实分布 P 的事件时的平均惊奇。 |
| KL 散度 | “分布之间的距离” | 使用 Q 代替 P 所浪费的额外 bits。等于交叉熵减熵，且不对称。 |
| 互信息 | “X 和 Y 有多相关” | 知道 Y 后，关于 X 的不确定性减少量。为零意味着二者独立。 |
| Softmax | “将 logits 转换为概率” | 取指数并归一化，将任意实数向量映射为有效的概率分布。 |
| 困惑度 | “模型有多困惑” | 交叉熵的指数。模型在每一步从中选择的有效词表大小。 |
| Bits | “Shannon 的单位” | 使用以 2 为底的对数衡量的信息。1 bit 能消除一次公平硬币抛掷的不确定性。 |
| Nats | “机器学习的单位” | 使用自然对数衡量的信息。PyTorch 和 TensorFlow 默认使用此单位。 |
| 负对数似然 | “NLL 损失” | 对 one-hot 标签而言与交叉熵损失相同。最小化它会最大化正确预测的概率。 |

## 延伸阅读

- [Shannon 1948：A Mathematical Theory of Communication](https://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy/entropy.pdf)——原始论文，至今仍易于阅读
- [Visual Information Theory（Chris Olah）](https://colah.github.io/posts/2015-09-Visual-Information/)——关于熵和 KL 散度的最佳可视化解释
- [PyTorch CrossEntropyLoss 文档](https://pytorch.org/docs/stable/generated/torch.nn.CrossEntropyLoss.html)——框架如何实现你刚刚构建的内容
