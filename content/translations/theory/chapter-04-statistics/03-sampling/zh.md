---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 04 - statistics/03. sampling.md
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 5d0f6c44422854b60f9027fa8411be8c54e78f08e827e9f0e5216e39e0f9f56d
status: reviewed
---

# 抽样

*抽样决定我们如何收集数据，也直接决定每一个结论的质量。本笔记涵盖随机抽样、分层抽样、整群抽样与系统抽样、抽样分布、大数定律和 bootstrap；这些方法是机器学习中训练/测试划分与数据集整理的基础。*

- 理想情况下，你会测量所关心群体中的每一位成员。但在实践中，这几乎不可能。你无法调查每一位选民、测试每一个灯泡或扫描每一位患者。因此，你抽取一个**样本**，并用它了解整体。

- **总体（population）**是你想研究的完整个体或项目集合。**样本（sample）**是你实际观察到的子集。

- **参数（parameter）**是描述总体的数值（例如一个国家所有成年人的真实平均身高）。

- **统计量（statistic）**是根据样本计算出的数值（例如你测得的 500 人的平均身高）。统计量用于估计参数。

- 结论的质量完全取决于你如何选择样本。无论分析多么复杂，有偏样本都会导致有偏结论。

- **抽样框（sampling frame）**是实际从中抽取样本的所有个体清单。理想情况下，它与总体完全一致，但实践中常有缺口。

- 例如，若你通过电话调查，就会漏掉没有电话的人。抽样框与总体之间的差异称为**覆盖误差（coverage error）**。

- **抽样误差（sampling error）**是样本统计量与总体参数之间自然出现的差异。

- 即使完全随机的样本也不会与总体完全一致。更大的样本会降低抽样误差。

- 抽样大致分为两类：概率抽样与非概率抽样。

- **概率抽样（probability sampling）**意味着总体中每个成员被选中的概率已知且非零。它使你能够量化不确定性并将结果推广出去。

- **简单随机抽样（simple random sampling）**：每个个体被选中的机会相同，任何大小为 $n$ 的可能样本出现的概率也相同。可以把每个名字放进帽子里，盲抽出来。

- **分层抽样（stratified sampling）**：按共同特征（如年龄组、地区）将总体划分为不重叠的组（层），再从每一层随机抽样。它保证各组都有代表；当各层彼此不同时，还能降低方差。

- **整群抽样（cluster sampling）**：把总体划分为组（群），随机选出一些群，再纳入选中群中的全部成员。当总体在地理上分散时，这很实用，例如抽取整所学校，而不是在一个学区内分散抽取学生个体。

- **系统抽样（systematic sampling）**：随机选一个起点，然后从清单中每隔 $k$ 个选择一人。例如从第 7 人开始，此后每隔 10 人选择一人（7、17、27、……）。它实现简单，但若清单存在隐藏模式，可能引入偏差。

![三种概率抽样方法并列：简单随机、分层与整群](../images/sampling_methods.svg)

- **非概率抽样（non-probability sampling）**不会让每位成员拥有已知的入选概率。结果无法被严格推广，但这些方法通常更快、更便宜。

- **便利抽样（convenience sampling）**：选择最容易接触到的人。在购物中心调查人群很方便，却会遗漏不去购物的人。

- **配额抽样（quota sampling）**：类似分层抽样，但没有随机性。研究者从每层容易接触到的人中挑选，以填满配额（如 50 名男性和 50 名女性）。

- **滚雪球抽样（snowball sampling）**：从少数参与者开始，请他们招募其他人。它适合难以接触的人群（如研究罕见疾病），但会强烈偏向彼此有联系的人。

- 确定抽样方法后，一个自然的问题是：如果换一份样本，我会得到不同的统计量吗？几乎肯定会。**抽样分布（sampling distribution）**是在所有同样大小的可能样本上，某个统计量（如样本均值）的分布。

- 想象抽取 1,000 份各含 30 人的不同样本，并计算每一份的平均身高。这 1,000 个均值构成一个分布。有些会略高于真实总体均值，有些会略低，大部分会聚集在真实值周围。

- 这个抽样分布的标准差称为**标准误（standard error）**：

$$SE = \frac{\sigma}{\sqrt{n}}$$

- 注意，随着 $n$ 增大，标准误会缩小。更大的样本给出更精确的估计。将样本量增加到四倍，标准误会减半。

- 统计学中最重要的结果之一是**中心极限定理（Central Limit Theorem, CLT）**。它指出：无论原始总体的形状如何，随着样本量增加，样本均值的分布会趋近正态分布。

![CLT：偏斜总体也会产生近似正态的样本均值分布](../images/central_limit_theorem.svg)

- 更精确地说，若 $X_1, X_2, \ldots, X_n$ 是来自某个均值为 $\mu$、方差有限且为 $\sigma^2$ 的分布的独立观测，则当 $n$ 增大时：

$$\bar{X} \approx \text{Normal}\!\left(\mu, \frac{\sigma^2}{n}\right)$$

- CLT 使大多数统计推断成为可能。即使底层数据并非正态，只要样本量足够大，它也让我们能把正态分布作为近似。

- “足够大”到底多大？常见经验法则是 $n \ge 30$，但这取决于总体偏离正态的程度。对高度偏斜的分布，你可能需要更大的样本；对大致对称的总体，即使 $n = 10$ 也可能足够。

- CLT 有三个关键条件：
    - **独立性（independence）**：每个观测不应影响其他观测
    - **有限方差（finite variance）**：总体方差必须存在（这排除某些特殊分布）
    - **同分布（identical distribution）**：所有观测都来自同一个分布

## 编程任务（使用 CoLab 或 notebook）

1. 以可视方式演示 CLT：从高度偏斜的分布中抽样，计算样本均值，并观察均值直方图如何逐渐成为钟形。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

key = jax.random.PRNGKey(0)

# Exponential distribution (very skewed)
population = jax.random.exponential(key, shape=(100_000,))

fig, axes = plt.subplots(1, 4, figsize=(14, 3))
sample_sizes = [1, 5, 30, 100]

for ax, n in zip(axes, sample_sizes):
    keys = jax.random.split(key, 2000)
    means = jnp.array([jax.random.choice(k, population, shape=(n,)).mean() for k in keys])
    ax.hist(means, bins=40, color="#3498db", alpha=0.7, density=True)
    ax.set_title(f"n = {n}")
    ax.set_xlim(0, 4)

fig.suptitle("CLT: sample means become normal as n increases", fontsize=13)
plt.tight_layout()
plt.show()
```

2. 比较简单随机抽样与分层抽样。创建由不同群体构成的总体，并说明分层抽样的估计方差更低。
```python
import jax
import jax.numpy as jnp

key = jax.random.PRNGKey(42)

# Population: two distinct groups
group_a = jax.random.normal(key, shape=(500,)) + 10   # mean ~10
key, subkey = jax.random.split(key)
group_b = jax.random.normal(subkey, shape=(500,)) + 20  # mean ~20
population = jnp.concatenate([group_a, group_b])

# Simple random sampling: 1000 trials, sample size 20
srs_means = []
for i in range(1000):
    key, subkey = jax.random.split(key)
    sample = jax.random.choice(subkey, population, shape=(20,), replace=False)
    srs_means.append(sample.mean())
srs_means = jnp.array(srs_means)

# Stratified sampling: 10 from each group
strat_means = []
for i in range(1000):
    key, k1, k2 = jax.random.split(key, 3)
    s_a = jax.random.choice(k1, group_a, shape=(10,), replace=False)
    s_b = jax.random.choice(k2, group_b, shape=(10,), replace=False)
    strat_means.append(jnp.concatenate([s_a, s_b]).mean())
strat_means = jnp.array(strat_means)

print(f"Simple Random - Mean: {srs_means.mean():.3f}, Std: {srs_means.std():.3f}")
print(f"Stratified    - Mean: {strat_means.mean():.3f}, Std: {strat_means.std():.3f}")
print(f"Stratified sampling reduced variance by {(1 - strat_means.var()/srs_means.var())*100:.1f}%")
```

3. 探索样本量如何影响标准误。绘制标准误随样本量变化的曲线，并验证 $1/\sqrt{n}$ 关系。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

key = jax.random.PRNGKey(7)
population = jax.random.normal(key, shape=(50_000,)) * 10 + 50

sample_sizes = [5, 10, 20, 50, 100, 200, 500, 1000]
std_errors = []

for n in sample_sizes:
    means = []
    for _ in range(500):
        key, subkey = jax.random.split(key)
        sample = jax.random.choice(subkey, population, shape=(n,))
        means.append(sample.mean())
    std_errors.append(jnp.array(means).std())

plt.figure(figsize=(8, 4))
plt.plot(sample_sizes, std_errors, "o-", color="#e74c3c", label="Observed SE")
theoretical = population.std() / jnp.sqrt(jnp.array(sample_sizes, dtype=jnp.float32))
plt.plot(sample_sizes, theoretical, "--", color="#3498db", label="σ/√n (theoretical)")
plt.xlabel("Sample size (n)")
plt.ylabel("Standard error")
plt.legend()
plt.title("Standard error shrinks with larger samples")
plt.show()
```
