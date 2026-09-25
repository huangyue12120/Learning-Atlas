---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 05 - probability/02. probability concepts.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: b1e9e26c552f860a7aa4c7e281f7a76e2e1f4bc61a0f05891f5f7ff8b2519ab7
status: reviewed
---
# 概率概念

*概率论为不确定性建模，并提供在不确定情形下进行推理的规则。本文介绍样本空间、事件、概率公理、条件概率、独立性、贝叶斯定理、全概率定律，以及频率主义与贝叶斯主义对概率的不同解释，为机器学习中的生成模型和判别模型提供数学基础。*

- 概率将一个事件赋值为0到1之间的数字，衡量其发生的可能性有多大。

- 概率为 0 表示事件不可能发生，概率为 1 表示事件必然发生；概率为 0.5 表示事件有一半的机会发生，例如公平硬币正面朝上的概率。

- 对概率有两种主要解释。**频率主义**观点认为，概率是长期相对频率：抛一枚公平硬币 10,000 次，正面大约会出现 50%。

- **贝叶斯主义**观点把概率视为信念程度：例如，可以认为明天下雨的概率是 70%，尽管明天只会发生一次。

- 两种解释使用相同的数学规则，差别在于概率的含义；这一区别对机器学习也很重要。频率主义方法给出点估计，贝叶斯方法则给出参数的完整分布。

- **样本空间** $S$是实验所有可能结果的集合。抛硬币：$S = \{H, T\}$。掷骰子：$S = \{1, 2, 3, 4, 5, 6\}$。

- **事件**是样本空间的任意子集。“掷出偶数”就是事件 $A = \{2, 4, 6\}$，且 $A \subseteq S$。

- 当所有结果都等概率时，事件的概率简单地计数（见文件 01）：

$$P(A) = \frac{|A|}{|S|} = \frac{\text{有利结果数}}{\text{结果总数}}$$
- 对于偶数示例：$P(\text{偶数}) = \frac{3}{6} = 0.5$。

![Venn图显示事件A和B在样本空间S中的情况，包括交集和补集](../images/venn_diagram.svg)


- 事件 $A$ 的**补集**是 $S$ 中不属于 $A$ 的所有结果，记作 $A'$ 或 $A^c$。由于每个结果要么属于 $A$，要么不属于：

$$P(A') = 1 - P(A)$$
- 补集通常更容易。与其直接计算 5 次抛掷中至少出现一次正面的概率，不如计算一次正面也没有的概率再用 1 减去：$P(\text{至少一次正面}) = 1 - P(\text{全为反面}) = 1 - (0.5)^5 = 0.969$。

- 如果两个事件不可能同时发生，它们就是**互斥的**（不相交）：$A \cap B = \emptyset$。在一次掷骰中，掷出 2 和掷出 5 是互斥事件。

- **互斥事件的加法规则**很简单：

$$P(A \cup B) = P(A) + P(B) \quad \text{（当 } A \cap B = \emptyset\text{）}$$
- 当事件可以重叠时，需要使用**一般加法规则**来避免重复计数交集：

$$P(A \cup B) = P(A) + P(B) - P(A \cap B)$$
- 这与计数中的容斥原理相似。上面的 Venn 图显示了为什么：紫色区域（交集）在 $P(A)$ 中被计算一次，在 $P(B)$ 中又被计算一次，所以我们减去它一次。

- **联合概率** $P(A \cap B)$ 是两个事件 $A$ 和 $B$ 同时发生的概率。在一副牌中，$P(\text{红牌} \cap \text{国王}) = \frac{2}{52}$，因为有两张红色国王。

- **边际概率**是单个事件的概率，不论其他事件如何。$P(\text{红牌}) = \frac{26}{52} = 0.5$ 就是边际概率。如果有两个变量的联合分布，可以对另一个变量求和（或积分）得到边际分布。

- **条件概率**回答这样一个问题：已知 $B$ 已发生，$A$ 发生的概率是多少？此时把样本空间从 $S$ 缩小到 $B$，再看 $B$ 中有多少结果也属于 $A$：

$$P(A | B) = \frac{P(A \cap B)}{P(B)}, \quad P(B) > 0$$
![条件概率通过从S缩小到B来表示](../images/conditional_probability.svg)


- 示例：你抽了一张牌，有人告诉你它是红色的。它是国王的概率是多少？26 张红牌中有 2 张国王，所以 $P(\text{国王} \mid \text{红牌}) = \frac{2}{26} = \frac{1}{13}$。使用公式：$P(\text{国王} \cap \text{红牌}) / P(\text{红牌}) = \frac{2/52}{26/52} = \frac{1}{13}$。

- 如果知道一个事件是否发生，不会改变另一个事件的概率，那么这两个事件**相互独立**。形式化地：

$$P(A \cap B) = P(A) \cdot P(B)$$
- 等价地，$P(A | B) = P(A)$。两次分别抛掷硬币的结果相互独立；不放回地抽两张牌则不独立，因为第一次抽牌会改变剩余牌的组成。

- 独立性是一个巨大的简化。对于独立事件，联合概率可以分解为乘积形式，这使得计算变得可行。许多机器学习模型假设特征之间是独立的（例如朴素贝叶斯），正是由于这个简化。

- **乘法规则**可将任意两个事件的条件概率公式改写为：

$$P(A \cap B) = P(A | B) \cdot P(B) = P(B | A) \cdot P(A)$$
- 对于独立事件，由于条件概率等于边际概率，上式简化为 $P(A \cap B) = P(A) \cdot P(B)$。

- **贝叶斯定理**是概率论的重要结论，也是贝叶斯机器学习的基础。它可以根据 $P(B|A)$ 推算反向条件概率 $P(A|B)$：

$$P(A | B) = \frac{P(B | A) \cdot P(A)}{P(B)}$$
- 这个定理直接从将 $P(A \cap B)$ 写两次开始：一次是 $P(B|A) \cdot P(A) = P(A|B) \cdot P(B)$，然后解出 $P(A|B)$。

![贝叶斯定理的组成部分：后验、似然、先验和证据](../images/bayes_components.svg)


- 每个组件都有一个名称：
    - **先验概率（prior）** $P(A)$：看到证据前对 $A$ 的初始信念
    - **似然（likelihood）** $P(B|A)$：假设 $A$ 为真时观察到证据 $B$ 的概率
    - **证据（evidence）** $P(B)$：观察到证据 $B$ 的总概率，作为归一化因子
    - **后验概率（posterior）** $P(A|B)$：看到证据后更新的信念

- 看一个经典的医学诊断例子。假设一种疾病影响总体的 1%。某检测的敏感度为 95%，特异度为 90%。**编者注：**原文把 95% 的敏感度称为“准确率”；按给定的患病率和特异度计算，总准确率约为 90.05%。

- 检测结果为阳性。实际患病的概率是多少？

- 令 $D$ 表示患病，$+$ 表示检测阳性。
    - 先验：$P(D) = 0.01$
    - 似然：$P(+ | D) = 0.95$
    - 假阳性率：$P(+ | D') = 0.10$

- 我们需要 $P(+)$。根据全概率定律：

$$P(+) = P(+ | D) \cdot P(D) + P(+ | D') \cdot P(D')$$
$$= 0.95 \times 0.01 + 0.10 \times 0.99 = 0.0095 + 0.099 = 0.1085$$
- 现在应用贝叶斯定理：

$$P(D | +) = \frac{P(+ | D) \cdot P(D)}{P(+)} = \frac{0.95 \times 0.01}{0.1085} \approx 0.088$$
- 尽管检测的敏感度为 95%，阳性结果对应的实际患病概率只有约 8.8%。这是因为先验患病率很低，大多数阳性结果仍是假阳性。这对机器学习分类问题也很重要：类别不平衡时，单看准确率可能产生误导。

- **全概率定律**将样本空间划分为互斥且完备的事件 $B_1, B_2, \ldots, B_n$，并将任意事件 $A$ 表示为：

$$P(A) = \sum_{i=1}^{n} P(A | B_i) \cdot P(B_i)$$
- 这正是我们在医疗例子中计算 $P(+)$ 时使用的：我们将总体分为“有病”和“无病”。

- **概率的链式法则**将乘法规则推广到任意多个事件。

$$P(A_1 \cap A_2 \cap \cdots \cap A_n) = P(A_1) \cdot P(A_2 | A_1) \cdot P(A_3 | A_1 \cap A_2) \cdots P(A_n | A_1 \cap \cdots \cap A_{n-1})$$
- 每个因子都以此前发生的所有事件为条件。这是自回归语言模型的基础：句子的概率是每个词在给定所有前序词时的概率之积。

- **条件独立性**意味着两个事件在第三个事件给定的情况下是独立的。 $A$ 和 $B$ 在 $C$ 给定的情况下是条件独立的，如果：

$$P(A \cap B | C) = P(A | C) \cdot P(B | C)$$
- 事件可能边际相关但条件独立，反之亦然。例如，两个学生的考试成绩可能相关（都取决于考试难度），但在给定考试难度后，它们彼此独立。

- 条件独立性是贝叶斯网络等图模型的关键假设。它允许你将复杂的联合分布分解为可管理的部分，从而使得推理计算起来更加可行。

## 编程任务（使用 CoLab 或笔记本）

1. 模拟医疗诊断问题。生成一个由 100,000 人组成的人群，按患病率和检测性能模拟检测结果，并验证贝叶斯定理给出的后验概率。
```python
import jax
import jax.numpy as jnp

key = jax.random.PRNGKey(42)
n = 100_000

# Generate population
k1, k2 = jax.random.split(key)
has_disease = jax.random.bernoulli(k1, p=0.01, shape=(n,))

# Generate test results
k3, k4 = jax.random.split(k2)
# Sensitivity: P(+|D) = 0.95, Specificity: P(-|D') = 0.90
test_positive = jnp.where(
    has_disease,
    jax.random.bernoulli(k3, p=0.95, shape=(n,)),
    jax.random.bernoulli(k4, p=0.10, shape=(n,))
)

# Among those who tested positive, what fraction actually has the disease?
positives = test_positive.astype(bool)
true_positives = (has_disease & positives).sum()
total_positives = positives.sum()

print(f"Total positive tests: {total_positives}")
print(f"True positives: {true_positives}")
print(f"P(Disease | Positive) = {true_positives / total_positives:.4f}")
print(f"Bayes' formula:         {0.95 * 0.01 / 0.1085:.4f}")
```

2. 通过模拟验证加法规则。生成概率已知且存在交集的随机事件 $A$ 和 $B$，检查 $P(A \cup B) = P(A) + P(B) - P(A \cap B)$ 是否成立。**编者注：**原文代码用两个独立随机数分别生成 $A$、$B$，所以交集概率约为 $0.4 \times 0.6 = 0.24$，并非代码注释所说的“值小于 0.4”。
```python
import jax
import jax.numpy as jnp

key = jax.random.PRNGKey(0)
n = 200_000
k1, k2 = jax.random.split(key)

# Events: A = value < 0.4, B = value < 0.6 (overlap at < 0.4)
vals_a = jax.random.uniform(k1, shape=(n,))
vals_b = jax.random.uniform(k2, shape=(n,))

A = vals_a < 0.4
B = vals_b < 0.6

p_a = A.mean()
p_b = B.mean()
p_a_and_b = (A & B).mean()
p_a_or_b = (A | B).mean()

print(f"P(A) = {p_a:.4f}")
print(f"P(B) = {p_b:.4f}")
print(f"P(A ∩ B) = {p_a_and_b:.4f}")
print(f"P(A ∪ B) simulated = {p_a_or_b:.4f}")
print(f"P(A) + P(B) - P(A∩B) = {p_a + p_b - p_a_and_b:.4f}")
```

3. 演示条件概率如何随已知信息而变化。模拟掷两颗骰子，计算 $P(\text{sum} = 7)$，再计算 $P(\text{sum} = 7 | \text{first die} = 3)$。
```python
import jax
import jax.numpy as jnp

key = jax.random.PRNGKey(1)
n = 500_000
k1, k2 = jax.random.split(key)

d1 = jax.random.randint(k1, shape=(n,), minval=1, maxval=7)
d2 = jax.random.randint(k2, shape=(n,), minval=1, maxval=7)
total = d1 + d2

# Unconditional
p_sum7 = (total == 7).mean()
print(f"P(sum=7) = {p_sum7:.4f} (exact: {6/36:.4f})")

# Conditional on first die = 3
mask = d1 == 3
p_sum7_given_d1_3 = (total[mask] == 7).mean()
print(f"P(sum=7 | d1=3) = {p_sum7_given_d1_3:.4f} (exact: {1/6:.4f})")
```

4. 将贝叶斯定理实现为函数，并用它逐步更新信念。从硬币偏置的均匀先验开始，根据每次抛掷的结果更新分布。
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt

def bayes_update(prior, likelihood):
    """Multiply prior by likelihood and normalise."""
    posterior = prior * likelihood
    return posterior / posterior.sum()

# Discretise possible bias values
theta = jnp.linspace(0, 1, 200)
prior = jnp.ones_like(theta)  # uniform prior
prior = prior / prior.sum()

# Observed flips: 1=heads, 0=tails
flips = [1, 1, 0, 1, 1, 1, 0, 1, 0, 1]

plt.figure(figsize=(10, 5))
plt.plot(theta, prior, "--", color="#999", label="prior")

for i, flip in enumerate(flips):
    likelihood = theta if flip == 1 else (1 - theta)
    prior = bayes_update(prior, likelihood)
    if i in [0, 2, 4, 9]:
        plt.plot(theta, prior, label=f"after {i+1} flips", linewidth=2)

plt.xlabel("Coin bias θ")
plt.ylabel("Belief (normalised)")
plt.title("Bayesian updating: belief about coin bias")
plt.legend()
plt.grid(alpha=0.3)
plt.show()
```
