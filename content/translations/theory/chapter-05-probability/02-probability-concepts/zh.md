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

*概率论形式化了不确定性，并提供了在其中推理的规则。本文件涵盖了样本空间、事件、概率公理、条件概率、独立性、贝叶斯定理以及生成模型和判别模型背后的数学框架。*

- 概率将一个事件赋值为0到1之间的数字，衡量其发生的可能性有多大。

- 0的概率表示不可能发生，1的概率表示必然发生，0.5表示掷硬币的结果是平局。

- 存在两种主要解释。**频率主义**观点认为概率是长期相对频率：抛一枚公平的硬币10,000次，正面出现大约50%。

- **贝叶斯主义**观点认为概率是一个信念程度：你可能会说明天有70%的可能性下雨，尽管明天只发生一次。

- 两种解释使用相同的数学规则。区别在于哲学上，但对机器学习来说很重要。频率主义方法给你点估计值。贝叶斯方法给你参数的完整分布。

- **样本空间** $S$是实验所有可能结果的集合。抛硬币：$S = \{H, T\}$。掷骰子：$S = \{1, 2, 3, 4, 5, 6\}$。

- 一个事件是样本空间中的任何子集。"掷出偶数"是一个事件 $A = \{2, 4, 6\}$，它是 $S$ 的子集。

- 当所有结果都等概率时，事件的概率简单地计数（见文件 01）：

$$P(A) = \frac{|A|}{|S|} = \frac{\text{favourable outcomes}}{\text{total outcomes}}$$
- 对于偶数示例：$P(\text{even}) = \frac{3}{6} = 0.5$。

![Venn图显示事件A和B在样本空间S中的情况，包括交集和补集](../images/venn_diagram.svg)


- **事件的补集** $A$，用 $A'$ 或 $A^c$ 表示，是 $S$ 中不包含 $A$ 的一切。由于每个结果要么在 $A$ 中要么不在：

$$P(A') = 1 - P(A)$$
- 补集通常更容易。而不是计算至少出现一个正面的5次硬币翻转的方式，计数没有出现任何正面的方式并减去：$P(\text{at least one head}) = 1 - P(\text{all tails}) = 1 - (0.5)^5 = 0.969$。

- 两个事件是**互斥的**（不相交）如果它们不可能同时发生：$A \cap B = \emptyset$。掷出2和掷出5骰子是一个单个骰子上的事件，是互斥的。

- **互斥事件的加法规则**很简单：

$$P(A \cup B) = P(A) + P(B) \quad \text{(if } A \cap B = \emptyset\text{)}$$
- 当事件可以重叠时，需要使用**一般加法规则**来避免重复计数交集：

$$P(A \cup B) = P(A) + P(B) - P(A \cap B)$$
- 这与计数中的 inclusion-exclusion 原则相似。上面的 Venn 图显示了为什么：紫色区域（交集）在 $P(A)$ 中被计算一次，在 $P(B)$ 中又被计算一次，所以我们减去它一次。

- **联合概率** $P(A \cap B)$是两个事件 $A$ 和 $B$ 同时发生的概率。在一副牌中，$P(\text{red} \cap \text{king}) = \frac{2}{52}$ 因为有2张红国王。

- 边际概率是单个事件的概率，与其他事件无关。$P(\text{red}) = \frac{26}{52} = 0.5$是一个边际概率。如果你有一个涉及两个变量的联合分布，可以通过对另一个变量进行求和（或积分）来得到边际。

- **条件概率**回答：已知 $B$ 已经发生，求 $A$ 的概率。我们缩小样本空间从 $S$ 到 $B$，然后问 $B$ 也属于 $A$ 的比例是多少：

$$P(A | B) = \frac{P(A \cap B)}{P(B)}, \quad P(B) > 0$$
![条件概率通过从S缩小到B来表示](../images/conditional_probability.svg)


- 示例：你抽了一张牌，有人告诉你它是红色的。那么它是什么概率是国王？有26张红色的牌，其中2张是国王，所以 $P(\text{king} | \text{red}) = \frac{2}{26} = \frac{1}{13}$。使用公式： $P(\text{king} \cap \text{red}) / P(\text{red}) = \frac{2/52}{26/52} = \frac{1}{13}$.

- 两个事件 **互斥** 如果知道其中一个发生告诉你 nothing关于另一个。正式地:

$$P(A \cap B) = P(A) \cdot P(B)$$
- 等价地，$P(A | B) = P(A)$。掷两枚不同的硬币是独立事件。不放回抽取两张卡片不是独立的（第一次抽卡改变了剩余的）。

- 独立性是一个巨大的简化。对于独立事件，联合概率可以分解为乘积形式，这使得计算变得可行。许多机器学习模型假设特征之间是独立的（例如朴素贝叶斯），正是由于这个简化。

- **向量乘积规则**对于任何两个事件重新排列条件概率公式：

$$P(A \cap B) = P(A | B) \cdot P(B) = P(B | A) \cdot P(A)$$
- 对于独立事件，这简化为$P(A \cap B) = P(A) \cdot P(B)$，因为条件等于边际。

- 贝叶斯定理是概率论中最重要和基础的定理之一，它允许你反转条件概率的方向：

$$P(A | B) = \frac{P(B | A) \cdot P(A)}{P(B)}$$
- 这个定理直接从将 $P(A \cap B)$ 写两次开始：一次是 $P(B|A) \cdot P(A) = P(A|B) \cdot P(B)$，然后解出 $P(A|B)$。

![贝叶斯定理的组成部分：后验、似然、先验和证据](../images/bayes_components.svg)


- 每个组件都有一个名称：
    - **Prior** $P(A)$：你看到证据之前最初的信念
    - **Likelihood** $P(B|A)$：假设 $A$ 为真时，证据出现的概率
    - **Evidence** $P(B)$：看到证据的总概率，作为归一化因子
    - **Posterior** $P(A|B)$：你看到证据后更新后的信念

- 让我们通过经典的医学诊断案例来工作。假设一种疾病影响了人口的1%。用于检测该疾病的测试非常准确：它正确地识别出95%的病人（敏感性）和正确地识别出90%的健康人（特异性）。

- 你测试阳性。你实际上患有该病的概率是多少？

- 有疾病：$D$，检测阳性：$+$。
    - 前提：$P(D) = 0.01$
    - 可能性：$P(+ | D) = 0.95$
    - 错误率：$P(+ | D') = 0.10$

- 我们需要 $P(+)$。根据全概率定律：

$$P(+) = P(+ | D) \cdot P(D) + P(+ | D') \cdot P(D')$$
$$= 0.95 \times 0.01 + 0.10 \times 0.99 = 0.0095 + 0.099 = 0.1085$$
- 现在应用贝叶斯定理：

$$P(D | +) = \frac{P(+ | D) \cdot P(D)}{P(+)} = \frac{0.95 \times 0.01}{0.1085} \approx 0.088$$
- 尽管测试的准确率为95%，但阳性结果仅给你8.8%的概率患有疾病。这取决于先验信息。因为该病罕见，大多数阳性结果都是假阳性。这是机器学习中分类问题中的一个重要洞察：当类别不平衡时，单纯依靠准确性是误导性的。

- 法律上的全概率定律将样本空间分为互斥且完备的事件 $B_1, B_2, \ldots, B_n$，并表示任何事件 $A$ 为：

$$P(A) = \sum_{i=1}^{n} P(A | B_i) \cdot P(B_i)$$
- 这正是我们在医疗例子中计算 $P(+)$ 时使用的：我们将人口分为“有病”和“无病”。

- 事件数量的链式概率规则，一般化了乘法规则。

$$P(A_1 \cap A_2 \cap \cdots \cap A_n) = P(A_1) \cdot P(A_2 | A_1) \cdot P(A_3 | A_1 \cap A_2) \cdots P(A_n | A_1 \cap \cdots \cap A_{n-1})$$
- 每个因素都依赖于之前的所有内容。这是自回归语言模型的基础：句子的概率是每个单词在所有先前单词条件下的概率乘积。

- **条件独立性**意味着两个事件在第三个事件给定的情况下是独立的。 $A$ 和 $B$ 在 $C$ 给定的情况下是条件独立的，如果：

$$P(A \cap B | C) = P(A | C) \cdot P(B | C)$$
- 事件可以同时依赖和独立，或者反之亦然。例如，两个学生的考试成绩可能相关（都取决于考试的难度），但在已知考试难度的情况下，他们的成绩是独立的。

- 条件独立性是贝叶斯网络等图模型的关键假设。它允许你将复杂的联合分布分解为可管理的部分，从而使得推理计算起来更加可行。

## 编程任务（使用 CoLab 或笔记本）

1. 模拟医疗诊断问题。生成100,000个人群，应用疾病预估值和测试准确性，并验证贝叶斯定理给出正确的后验概率。
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

2. 通过模拟验证加法规则。生成已知概率的随机事件A和B，并检查$P(A \cup B) = P(A) + P(B) - P(A \cap B)$是否成立。
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

3. 演示条件概率随证据变化。模拟掷两颗骰子并计算$P(\text{sum} = 7)$，然后$P(\text{sum} = 7 | \text{first die} = 3)$。
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

4. 将贝叶斯定理实现为函数，并使用它迭代更新信念。从均匀先验开始，根据每次抛硬币的结果进行更新。
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
