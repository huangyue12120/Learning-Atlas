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

*本篇将概率概念放回 AI 工程语境，保留源文中的定义、公式、代码、图示和实践边界，便于逐项核对。*

*概率理论将不确定性形式化,并提供了其中的推理规则. 此文件涵盖样本空间,事件,概率的等分法,有条件的概率,独立,贝叶斯定理,和常客对等. 贝叶斯人的解释,ML中每个遗传和歧视性模型背后的数学框架. *

- 概率为事件分配了从0到1之间的数字,以衡量它发生的可能性.

- 0的概率表示不可能,1表示确定,而0.5表示一分硬币掷出.

- 有两种主要解释. ** 常客** 观点说概率是长期相对频率:翻出一万回公平硬币,头部大约会出现50%的时间.

- 贝耶斯**的观点认为概率是某种程度的信念:你可能说,明天有70%的下雨机会,尽管明天只有一次。

- 两种解释都使用相同的数学规则. 区别在于哲学,但在ML中却很重要. 常态方法给你点数估计. 贝叶斯方法让你在参数上完全分布.

- **样本空间**$S$是一个实验的所有可能结果的集合。翻转硬币 :$S = \{H, T\}$。。。滚出死地:$S = \{1, 2, 3, 4, 5, 6\}$.

- 活动**是样本空间的任何子集。"旋转平分数字"是事件$A = \{2, 4, 6\}$,这是$S$.

- 当所有结果同样可能发生时,事件概率只是计算(从文件01):

$$P(A) = \frac{|A|}{|S|} = \frac{\text{favourable outcomes}}{\text{total outcomes}}$$

- 偶数的例子:$P(\text{even}) = \frac{3}{6} = 0.5$.

![图示](../images/venn_diagram.svg)

- 事件**的配合**$A$,写入$A'$或 为$A^c$,是所有的东西在$S$不在那个$A$。。。因为每个结果都是$A$是否为:

$$P(A') = 1 - P(A)$$

- 补充往往是比较容易的路线。而不是在5个硬币翻转中计算至少一个头的方法,而是计算一个没有头和去掉的方法:$P(\text{at least one head}) = 1 - P(\text{all tails}) = 1 - (0.5)^5 = 0.969$.

- 如果两个事件不能同时发生,$A \cap B = \emptyset$。。。翻出一分一分 一分一分一分 一分一分是互相排斥的

- ** 对相互排斥的事件的补充规则** 是直接的:

$$P(A \cup B) = P(A) + P(B) \quad \text{(if } A \cap B = \emptyset\text{)}$$

- 当事件可以重叠时,您需要 ** 一般添加规则** 以避免重复计算相交点:

$$P(A \cup B) = P(A) + P(B) - P(A \cap B)$$

- 这反映了包容-排斥原则与计数的相仿. 上面的文恩图显示了为什么:紫色区域(交接区)一次被计算在内.$P(A)$并再次进入$P(B)$,所以我们减去一次。

- ** 共同概率**$P(A \cap B)$是两种可能性$A$财务报告和已审计财务报表$B$发生。在一张牌上$P(\text{red} \cap \text{king}) = \frac{2}{52}$因为有两个红色的国王

- ** 边概率** 是指不论其它事件,单个事件的概率.$P(\text{red}) = \frac{26}{52} = 0.5$是一个边缘概率。如果在两个变量上有一个联合分布,边缘通过相接(或相融合)得到,以相接于另一个变量.

- ** 有条件的概率** 答案:鉴于$B$已经发生, 什么是概率$A$? ? 吗? 我们缩小样本空间 从$S$降为$B$,并询问$B$也属于$A$:

$$P(A | B) = \frac{P(A \cap B)}{P(B)}, \quad P(B) > 0$$

![图示](../images/conditional_probability.svg)

- 例子:你画一张牌,有人告诉你它是红色的。是什么可能性是国王? 红牌有26张,其中2张是王牌,所以$P(\text{king} | \text{red}) = \frac{2}{26} = \frac{1}{13}$。。。使用公式 :$P(\text{king} \cap \text{red}) / P(\text{red}) = \frac{2/52}{26/52} = \frac{1}{13}$.

- 有两个事件是独立** 如果知道其中之一 告诉你没有关于另一个。形式上:

$$P(A \cap B) = P(A) \cdot P(B)$$

- 同样,$P(A | B) = P(A)$。。。翻出两枚分币是独立事件. 不更换而绘制出两张牌是不独立的(第一张画会改变所剩的).

- 独立是一个大规模的简化. 对于独立事件,联合概率系数会转化为产品,这使得计算具有可拉动性. 许多ML模型在特征之间假定独立(例如. 纳伊夫·贝耶斯)正是因为这种简化.

- 任何两种事件的**乘法**重排条件概率公式:

$$P(A \cap B) = P(A | B) \cdot P(B) = P(B | A) \cdot P(A)$$

- 对于独立活动,这种简化为:$P(A \cap B) = P(A) \cdot P(B)$因为条件等于边际。

- ** Bayes'定理** 是概率中最重要的结果之一,也是Bayesian ML的基础. 它允许您反转一个条件概率的方向 :

$$P(A | B) = \frac{P(B | A) \cdot P(A)}{P(B)}$$

- 定理直接从文字中遵循$P(A \cap B)$两种方式:$P(B|A) \cdot P(A) = P(A|B) \cdot P(B)$,然后解析$P(A|B)$.

![图示](../images/bayes_components.svg)

- 每个组件都有一个名称:
    - ** 优先事项**$P(A)$: 在看到证据之前你最初的信念
    - ** 类似情况**$P(B|A)$:假设证据的可能性如何$A$真实
    - ** 证据**$P(B)$:看到证据的总概率,作为正常人
    - ** 后边**$P(A|B)$: 您看到证据后更新的信念

- 让我们通过典型的医学诊断例子。假设疾病影响到1%的人口。对疾病的检测准确度为95%:正确识别95%的病人(敏感度),正确识别90%的健康人(特异性)。

- 你测试阳性。你实际患上这种疾病的可能性有多大?

- 让$D$得了这种病,$+$=检测呈阳性。
    - ưμ㼯A$P(D) = 0.01$
    - 可能性:$P(+ | D) = 0.95$
    - 假正率 :$P(+ | D') = 0.10$

- 我们需要$P(+)$。。。根据总概率法:

$$P(+) = P(+ | D) \cdot P(D) + P(+ | D') \cdot P(D')$$
$$= 0.95 \times 0.01 + 0.10 \times 0.99 = 0.0095 + 0.099 = 0.1085$$

- 现在应用贝叶斯定理:

$$P(D | +) = \frac{P(+ | D) \cdot P(D)}{P(+)} = \frac{0.95 \times 0.01}{0.1085} \approx 0.088$$

- 尽管测试是"95%准确",但一个阳性结果只给你大约8.8%的患病机会. 之前的事很严重 由于该病很罕见,所以大多数阳性结果都是假阳性. 这对于ML中的任何分类问题都是至关重要的见解:当分类不平衡时,仅准确性就会产生误导.

- 完全概率法** 将样本空间分割为相互排斥的、详尽无遗的事件$B_1, B_2, \ldots, B_n$并表达任何事件$A$作为:

$$P(A) = \sum_{i=1}^{n} P(A | B_i) \cdot P(B_i)$$

- 这正是我们以前计算过的$P(+)$在医学的例子:我们把人口分成"有病"和"没有病".

- ** 概率链规则** 将乘法规则概括到任何事件:

$$P(A_1 \cap A_2 \cap \cdots \cap A_n) = P(A_1) \cdot P(A_2 | A_1) \cdot P(A_3 | A_1 \cap A_2) \cdots P(A_n | A_1 \cap \cdots \cap A_{n-1})$$

- 每一个因素都对以前的一切有影响 这是自递性语言模型的中枢:句子的概率是每个单词所有前言的概率的产物.

- ** 有条件的独立** 意味着两个事件是独立的,仅次于第三个事件。$A$财务报告和已审计财务报表$B$有条件独立$C$若:

$$P(A \cap B | C) = P(A | C) \cdot P(B | C)$$

- 事件可以略有依赖,但有条件独立,反之亦然。例如,两个学生的考试分数可能相互关联(两者都取决于考试难度),但考虑到考试难度,他们的分数是独立的.

- 有条件的独立是贝叶斯网络等图形模型背后的关键假设. 它让你把复杂的联合分布分解成可控块,使推论在计算上可行.

## 编程任务（使用 Colab 或 notebook）


1. 模拟医学诊断问题. 产生10万人人口,应用疾病流行和测试准确性,并验证贝叶斯定理给出正确的后导.
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

2. 通过模拟验证附加规则。生成已知概率和重叠的随机事件A和B,然后检查$P(A \cup B) = P(A) + P(B) - P(A \cap B)$.
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

3. 证明有条件的概率随证据而改变. 模拟两个骰子并计算$P(\text{sum} = 7)$,则$P(\text{sum} = 7 | \text{first die} = 3)$.
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

4. 将贝叶斯定理作为函数执行,并用它来迭代地更新信仰. 以硬币偏好之前的制服开始,并在观察了每个翻转后更新.
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
