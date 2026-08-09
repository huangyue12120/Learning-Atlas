---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/01-math-foundations/06-probability-and-distributions/docs/en.md
  revision: 7157ca74a135fad2165f680ec4b4e592f075ec21
  sha256: 6af905cb9c5318be55d10a25d9ba18b2dc253d8b8fe6b5b4cc32fe243d2e47f8
status: reviewed
---

# 概率与分布

> 概率是 AI 表达不确定性的语言。

**类型：** 学习
**语言：** Python
**前置课程：** Phase 1，第 01–04 课
**预计用时：** 约 75 分钟

## 学习目标

- 从零实现 Bernoulli、categorical、Poisson、均匀分布和正态分布的 PMF 与 PDF
- 计算期望和方差，并用中心极限定理解释高斯分布为何占据主导地位
- 使用数值稳定技巧（减去最大 logit）构建 softmax 和 log-softmax 函数
- 从 logits 计算交叉熵损失，并将其与负对数似然联系起来

## 问题

一个分类器输出 `[0.03, 0.91, 0.06]`。一个语言模型从 50,000 个候选词中选择下一个词。一个扩散模型通过从学到的分布中采样来生成图像。这些都是概率在实际发挥作用。

模型做出的每一次预测都是一个概率分布。每个损失函数都衡量预测分布与真实分布相差多远。每一步训练都会调整参数，使一个分布更像另一个分布。没有概率，你无法读懂任何一篇机器学习论文，无法调试任何一个模型，也无法理解训练损失为什么会变成 NaN。

## 概念

### 事件、样本空间与概率

样本空间 S 是所有可能结果的集合。事件是样本空间的一个子集。概率将事件映射为 0 到 1 之间的数。

```text
抛硬币：
  S = {H, T}
  P(H) = 0.5,  P(T) = 0.5

掷一次骰子：
  S = {1, 2, 3, 4, 5, 6}
  P(even) = P({2, 4, 6}) = 3/6 = 0.5
```

三条公理定义了整个概率论：
1. 对任意事件 A，P(A) >= 0
2. P(S) = 1（总会有某个结果发生）
3. 当 A 和 B 不可能同时发生时，P(A or B) = P(A) + P(B)

其他一切（贝叶斯定理、期望、分布）都可以从这三条规则推出。

### 条件概率与独立性

P(A|B) 是在 B 已经发生的条件下 A 发生的概率。

```text
P(A|B) = P(A and B) / P(B)

示例：一副扑克牌
  P(King | Face card) = P(King and Face card) / P(Face card)
                      = (4/52) / (12/52)
                      = 4/12 = 1/3
```

如果知道一个事件是否发生并不能提供另一个事件的任何信息，那么这两个事件相互独立：

```text
独立：      P(A|B) = P(A)
等价于：    P(A and B) = P(A) * P(B)
```

多次抛硬币相互独立。无放回抽牌则不独立。

### 概率质量函数与概率密度函数

离散随机变量具有概率质量函数（PMF）。每个结果都有一个可以直接读出的具体概率。

```text
PMF: P(X = k)

公平骰子：
  P(X = 1) = 1/6
  P(X = 2) = 1/6
  ...
  P(X = 6) = 1/6

  所有概率之和 = 1
```

连续随机变量具有概率密度函数（PDF）。单个点上的密度不是概率。概率来自对某一区间内的密度进行积分。

```text
PDF: f(x)

P(a <= X <= b) = integral of f(x) from a to b

f(x) 可以大于 1（它是密度，不是概率）
integral from -inf to +inf of f(x) dx = 1
```

这一区别在机器学习中很重要。分类输出是 PMF（离散选择）。VAE 的潜在空间使用 PDF（连续变量）。

### 常见分布

**Bernoulli：** 一次试验，两种结果。用于建模二分类。

```text
P(X = 1) = p
P(X = 0) = 1 - p
均值 = p，方差 = p(1-p)
```

**Categorical：** 一次试验，k 种结果。用于建模多分类（softmax 输出）。

```text
P(X = i) = p_i，其中 p_i 之和 = 1
示例：P(cat) = 0.7,  P(dog) = 0.2,  P(bird) = 0.1
```

**均匀分布：** 所有结果等可能。用于随机初始化。

```text
离散：P(X = k) = 1/n，其中 k 属于 {1, ..., n}
连续：f(x) = 1/(b-a)，其中 x 属于 [a, b]
```

**正态（高斯）分布：** 钟形曲线。由均值（mu）和方差（sigma^2）参数化。

```text
f(x) = (1 / sqrt(2*pi*sigma^2)) * exp(-(x - mu)^2 / (2*sigma^2))

标准正态分布：mu = 0, sigma = 1
  68% 的数据位于 1 个 sigma 内
  95% 位于 2 个 sigma 内
  99.7% 位于 3 个 sigma 内
```

**Poisson：** 固定区间内稀有事件的计数。用于建模事件发生率。

```text
P(X = k) = (lambda^k * e^(-lambda)) / k!
均值 = lambda，方差 = lambda
```

### 期望与方差

期望是结果的加权平均值。

```text
离散：E[X] = sum of x_i * P(X = x_i)
连续：E[X] = integral of x * f(x) dx
```

方差衡量数据围绕均值的离散程度。

```text
Var(X) = E[(X - E[X])^2] = E[X^2] - (E[X])^2
标准差 = sqrt(Var(X))
```

在机器学习中，期望表现为损失函数（数据分布上的平均损失）。方差反映模型的稳定性。梯度方差高意味着训练噪声大。

### 联合分布与边缘分布

联合分布 P(X, Y) 同时描述两个随机变量。

联合 PMF 示例（X = 天气，Y = 雨伞）：

| | Y=0（没带伞） | Y=1（带伞） | 边缘分布 P(X) |
|---|---|---|---|
| X=0（晴） | 0.40 | 0.10 | P(X=0) = 0.50 |
| X=1（雨） | 0.05 | 0.45 | P(X=1) = 0.50 |
| **边缘分布 P(Y)** | P(Y=0) = 0.45 | P(Y=1) = 0.55 | 1.00 |

边缘分布通过对另一个变量求和得到：

```text
P(X = x) = 对所有 y 的 P(X = x, Y = y) 求和
```

上表的行合计与列合计就是边缘分布。

### 正态分布为何无处不在

中心极限定理：许多独立随机变量的和（或平均值）会收敛到正态分布，无论原始分布是什么。

```text
掷 1 个骰子：      均匀分布（平坦）
2 个骰子的平均值： 三角形（中间高）
30 个骰子的平均值：几乎完美的钟形曲线

这适用于任何初始分布。
```

这就是以下现象的原因：
- 测量误差近似服从正态分布（由许多微小的独立来源组成）
- 神经网络的权重初始化使用正态分布
- SGD 中的梯度噪声近似服从正态分布（许多样本梯度之和）
- 对于给定的均值和方差，正态分布是最大熵分布

### 对数概率

原始概率会造成数值问题。许多小概率相乘会很快下溢为零。

```text
P(sentence) = P(word1) * P(word2) * ... * P(word_n)
            = 0.01 * 0.003 * 0.02 * ...
            -> 0.0（约 30 项后下溢）
```

对数概率解决了这个问题。乘法变为加法。

```text
log P(sentence) = log P(word1) + log P(word2) + ... + log P(word_n)
                = -4.6 + -5.8 + -3.9 + ...
                -> 有限数值（不会下溢）
```

规则：
- log(a * b) = log(a) + log(b)
- 对数概率始终 <= 0（因为 0 < P <= 1）
- 越负表示可能性越低
- 交叉熵损失是正确类别概率的负对数

### softmax 作为概率分布

神经网络输出原始分数（logits）。softmax 将它们转换为有效的概率分布。

```text
softmax(z_i) = exp(z_i) / sum(exp(z_j) for all j)

性质：
  - 所有输出都在 (0, 1) 内
  - 所有输出之和为 1
  - 保持输入的相对顺序
  - exp() 会放大 logits 之间的差异
```

softmax 技巧：在取指数之前减去最大 logit，以防止溢出。

```text
z = [100, 101, 102]
exp(102) = overflow

z_shifted = z - max(z) = [-2, -1, 0]
exp(0) = 1  (safe)

结果相同，不会溢出。
```

log-softmax 将 softmax 与对数结合起来，以保证数值稳定性。PyTorch 在内部使用它来计算交叉熵损失。

### 采样

采样意味着从一个分布中抽取随机值。在机器学习中：
- Dropout 随机采样要置零的神经元
- 数据增强采样随机变换
- 语言模型从预测分布中采样下一个 token
- 扩散模型采样噪声并逐步去噪

从任意分布中采样需要逆变换采样、拒绝采样或重参数化技巧（用于 VAE）等技术。

```figure
gaussian-pdf
```

## 动手实现

### 步骤 1：概率基础

```python
import math
import random

def factorial(n):
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result

def combinations(n, k):
    return factorial(n) // (factorial(k) * factorial(n - k))

def conditional_probability(p_a_and_b, p_b):
    return p_a_and_b / p_b

p_king_given_face = conditional_probability(4/52, 12/52)
print(f"P(King | Face card) = {p_king_given_face:.4f}")
```

### 步骤 2：从零实现 PMF 与 PDF

```python
def bernoulli_pmf(k, p):
    return p if k == 1 else (1 - p)

def categorical_pmf(k, probs):
    return probs[k]

def poisson_pmf(k, lam):
    return (lam ** k) * math.exp(-lam) / factorial(k)

def uniform_pdf(x, a, b):
    if a <= x <= b:
        return 1.0 / (b - a)
    return 0.0

def normal_pdf(x, mu, sigma):
    coeff = 1.0 / (sigma * math.sqrt(2 * math.pi))
    exponent = -0.5 * ((x - mu) / sigma) ** 2
    return coeff * math.exp(exponent)
```

### 步骤 3：期望与方差

```python
def expected_value(values, probabilities):
    return sum(v * p for v, p in zip(values, probabilities))

def variance(values, probabilities):
    mu = expected_value(values, probabilities)
    return sum(p * (v - mu) ** 2 for v, p in zip(values, probabilities))

die_values = [1, 2, 3, 4, 5, 6]
die_probs = [1/6] * 6
mu = expected_value(die_values, die_probs)
var = variance(die_values, die_probs)
print(f"Die: E[X] = {mu:.4f}, Var(X) = {var:.4f}, SD = {var**0.5:.4f}")
```

### 步骤 4：从分布中采样

```python
def sample_bernoulli(p, n=1):
    return [1 if random.random() < p else 0 for _ in range(n)]

def sample_categorical(probs, n=1):
    cumulative = []
    total = 0
    for p in probs:
        total += p
        cumulative.append(total)
    samples = []
    for _ in range(n):
        r = random.random()
        for i, c in enumerate(cumulative):
            if r <= c:
                samples.append(i)
                break
    return samples

def sample_normal_box_muller(mu, sigma, n=1):
    samples = []
    for _ in range(n):
        u1 = random.random()
        u2 = random.random()
        z = math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)
        samples.append(mu + sigma * z)
    return samples
```

### 步骤 5：softmax 与对数概率

```python
def softmax(logits):
    max_logit = max(logits)
    shifted = [z - max_logit for z in logits]
    exps = [math.exp(z) for z in shifted]
    total = sum(exps)
    return [e / total for e in exps]

def log_softmax(logits):
    max_logit = max(logits)
    shifted = [z - max_logit for z in logits]
    log_sum_exp = max_logit + math.log(sum(math.exp(z) for z in shifted))
    return [z - log_sum_exp for z in logits]

def cross_entropy_loss(logits, target_index):
    log_probs = log_softmax(logits)
    return -log_probs[target_index]
```

### 步骤 6：中心极限定理演示

```python
def demonstrate_clt(dist_fn, n_samples, n_averages):
    averages = []
    for _ in range(n_averages):
        samples = [dist_fn() for _ in range(n_samples)]
        averages.append(sum(samples) / len(samples))
    return averages
```

### 步骤 7：可视化

```python
import matplotlib.pyplot as plt

xs = [mu + sigma * (i - 500) / 100 for i in range(1001)]
ys = [normal_pdf(x, mu, sigma) for x, mu, sigma in ...]
plt.plot(xs, ys)
```

包含所有可视化内容的完整实现在 `code/probability.py` 中。

## 使用它

借助 NumPy 和 SciPy，上述所有内容都可以用单行代码完成：

```python
import numpy as np
from scipy import stats

normal = stats.norm(loc=0, scale=1)
samples = normal.rvs(size=10000)
print(f"Mean: {np.mean(samples):.4f}, Std: {np.std(samples):.4f}")
print(f"P(X < 1.96) = {normal.cdf(1.96):.4f}")

logits = np.array([2.0, 1.0, 0.1])
from scipy.special import softmax, log_softmax
probs = softmax(logits)
log_probs = log_softmax(logits)
print(f"Softmax: {probs}")
print(f"Log-softmax: {log_probs}")
```

你已经从零构建了这些内容。现在你知道这些库调用在做什么了。

## 练习

1. 为指数分布实现逆变换采样。采样 10,000 个值，并将直方图与真实 PDF 比较，以验证实现。

2. 为两枚偏骰构建联合分布表。计算边缘分布，并检查两枚骰子是否相互独立。

3. 一个五分类分类器输出 logits `[2.0, 0.5, -1.0, 3.0, 0.1]`，正确类别的索引为 3。计算其交叉熵损失，然后使用 PyTorch 的 `nn.CrossEntropyLoss` 验证答案。

4. 编写一个函数：接收一组对数概率，返回最可能的序列、总对数概率以及等价的原始概率。用一个包含 50 个词、每个词概率均为 0.01 的句子测试它。

## 关键术语

| 术语 | 人们常说的含义 | 实际含义 |
|------|----------------|---------|
| 样本空间 | “所有可能性” | 实验中每一种可能结果所构成的集合 S |
| PMF | “概率函数” | 给出每个离散结果确切概率的函数，所有概率之和为 1 |
| PDF | “概率曲线” | 连续变量的密度函数。对某一区间积分可得到概率 |
| 条件概率 | “给定某件事时的概率” | P(A\|B) = P(A and B) / P(B)。它是贝叶斯思维和贝叶斯定理的基础 |
| 独立性 | “它们互不影响” | P(A and B) = P(A) * P(B)。知道其中一个事件不会提供另一个事件的任何信息 |
| 期望 | “平均值” | 所有结果按概率加权后的总和。损失函数就是一个期望 |
| 方差 | “分散程度” | 与均值之差的平方的期望。方差高 = 估计噪声大且不稳定 |
| 正态分布 | “钟形曲线” | f(x) = (1/sqrt(2*pi*sigma^2)) * exp(-(x-mu)^2/(2*sigma^2))。由于中心极限定理而无处不在 |
| 中心极限定理 | “平均值会变成正态分布” | 无论来源分布是什么，许多独立样本的均值都会收敛到正态分布 |
| 联合分布 | “两个变量放在一起” | P(X, Y) 描述 X 和 Y 各种结果组合的概率 |
| 边缘分布 | “把另一个变量求和消掉” | P(X) = sum_y P(X, Y)。从联合分布中恢复一个变量的分布 |
| 对数概率 | “概率的对数” | log P(x)。将乘积转换为和，防止长序列发生数值下溢 |
| Softmax | “将分数转为概率” | softmax(z_i) = exp(z_i) / sum(exp(z_j))。将实数值 logits 映射为有效的概率分布 |
| 交叉熵 | “损失函数” | -sum(p_true * log(p_predicted))。衡量两个分布之间的差异，越低越好 |
| Logits | “原始模型输出” | softmax 之前未经归一化的分数，其名称源自 logistic 函数 |
| 采样 | “抽取随机值” | 按照概率分布生成数值，也就是模型生成输出的方式 |

## 延伸阅读

- [3Blue1Brown：中心极限定理究竟是什么？](https://www.youtube.com/watch?v=zeJD6dqJ5lo)——直观证明平均值为何会变成正态分布
- [Stanford CS229 概率复习](https://cs229.stanford.edu/section/cs229-prob.pdf)——涵盖本文全部内容及更多知识的简明参考资料
- [Log-Sum-Exp 技巧](https://gregorygundersen.com/blog/2020/02/09/log-sum-exp/)——数值稳定性为何重要，以及如何实现它
