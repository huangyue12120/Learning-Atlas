---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 04 - statistics/03. sampling.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 5d0f6c44422854b60f9027fa8411be8c54e78f08e827e9f0e5216e39e0f9f56d
status: reviewed
---
# 抽样

*抽样决定我们如何收集数据，也影响结论的质量。本文件介绍随机、分层、整群和系统抽样、抽样分布、大数定律和自助法；这些方法用于机器学习中的训练/测试划分和数据集整理。*

- 在理想的世界里，你想要测量你关心的群体中的每一个成员。但在现实生活中，这几乎不可能。你无法对每个选民进行调查、测试每个灯泡或扫描每个病人。因此，你需要抽取一个**样本**并使用它来了解整个群体。

- **总体**是你要研究的完整个体或项目的集合。**样本**是你实际观察到的子集。

- **参数**是一个描述总体（例如，一个国家所有成年人的平均身高）的数字。

- **统计量**是从你的样本中计算出来的数字（例如，你测量的500个人的平均身高）。统计量用于估计参数。

- 你的结论的质量完全取决于你选择样本的方式。一个偏倚的样本会导致无论分析多么复杂的结果都是偏倚的。

- **抽样框**是你实际从其中抽取样本的个体列表。理想情况下，它完美匹配总体，但在实践中存在缺口。

- 例如，如果你通过电话调查人们，你错过了没有电话的人。抽样框和总体之间的差异称为**覆盖误差**。

- **抽样误差**是样本统计量与总体参数之间自然的偏差。

- 即使一个完全随机的样本也不会完全匹配总体。更大的样本会减少抽样误差。

- 抽样方法有两种主要类别：概率抽样和非概率抽样。

- **概率抽样**意味着每个个体都有已知的、非零的概率被选中。这允许你量化不确定性并推广结果。

- **简单随机抽样**：每个个体都有相等的机会被选中，每个大小为 $n$ 的可能样本也同样可能被抽到。想象把每个人的名字放进帽子里盲抽。

- **分层抽样**：根据共同特征（例如年龄组、地区）将总体分成互不重叠的层，再从每层随机抽样。这样能确保每层都有代表；若层内差异较小、层间差异较大，还能降低估计方差。

- **整群抽样**：根据地理分布将总体分成若干群，随机抽取部分群，再调查所选群中的所有个体。这适用于地理上分散的总体，例如抽取若干学校并调查校内所有学生，而不是逐个抽取学生。

- **系统抽样**：随机选择一个起点，然后从列表中每隔 $k$ 个个体抽取一个。例如从第 7 个人开始，每隔 10 人抽取一次（7、17、27……）。这种方法易于实施，但如果列表隐藏着周期模式，可能引入偏差。

![三种概率抽样方法：简单随机抽样、分层抽样和整群抽样](../images/sampling_methods.svg)


- **非概率抽样**不会给每个个体一个已知的非零入样概率。结果不能严格推广，但这类方法通常更快、成本更低。

- **便利抽样**：选择最容易接触到的人。在购物中心调查很方便，但会漏掉不去那里购物的人。

- **配额抽样**类似于分层抽样，但没有随机性。研究人员通过填满配额（例如 50 名男性和 50 名女性），从各群体中选择容易接触的个体。

- **滚雪球抽样**从少数参与者开始，请他们招募其他人。它适用于难以接触的总体（例如研究罕见疾病），但会严重偏向关系网络更广的个体。

- 更换样本后，统计量会不会变化？通常会。**抽样分布**是某个统计量（如样本均值）在所有相同样本量的可能样本中形成的分布。

- 考虑从30个人中抽取1,000个不同的样本，并计算每个样本的平均身高。这些1,000个平均值形成一个分布。有些会略高于真实总体平均值，有些会略低于，大多数会集中在真实值附近。

- **标准误**是抽样分布的标准差：

$$SE = \frac{\sigma}{\sqrt{n}}$$
- 标准误随 $n$ 增大而减小。样本越大，估计通常越精确；样本量增加到原来的 4 倍，标准误减半。**编者注：**若总体标准差 $\sigma$ 未知，通常用样本标准差估计。

- **中心极限定理（CLT）**是统计学的重要结果之一。在独立同分布且方差有限等条件下，无论总体分布形状如何，样本量增大时，样本均值的分布会趋近正态分布。

![中心极限定理：偏态总体产生近似正态分布的样本均值](../images/central_limit_theorem.svg)


- 更精确地说，若 $X_1, X_2, \ldots, X_n$ 是来自均值为 $\mu$、方差为有限值 $\sigma^2$ 的同一分布的独立观测，则随着 $n$ 增大：

$$\bar{X} \approx \text{Normal}\!\left(\mu, \frac{\sigma^2}{n}\right)$$
- 中心极限定理为许多推断方法提供了依据。样本足够大时，即使总体分布不是正态分布，也可以用正态分布近似样本均值的分布。

- 多大算“足够大”？一个常见经验是 $n \ge 30$，但这取决于总体偏离正态分布的程度。对于高度偏斜的总体，可能需要更大的样本；对于大致对称的总体，甚至 $n = 10$ 也可能足够。

- **大数定律**指出，在独立同分布且期望有限等条件下，样本均值随样本量增大而趋近总体均值。**编者注：**原文简介提到大数定律，正文原先没有说明。

- **自助法（bootstrap）**从已有样本中有放回地重复抽样，并反复计算统计量，以估计统计量的抽样分布和不确定性。**编者注：**原文简介提到自助法，正文原先没有介绍。

- 中心极限定理有三个关键条件：
    - **独立性**：每个观测点不能影响其他观测点
    - **有限方差**：总体方差必须存在（排除一些奇异分布）
    - **相同分布**：所有观测点都来自相同的分布

## 编程任务（使用 Colab 或笔记本）

1. 通过可视化展示 CLT：从高度偏斜的分布中抽取样本，计算样本均值，并观察均值的直方图逐渐变为钟形曲线。
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

2. 比较简单随机抽样与分层抽样的差异。创建一个具有不同组别的总体，并展示分层抽样在估计中的方差更低。
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

3. 探讨样本量对标准误的影响。绘制标准误随样本量的变化，并核对 $1/\sqrt{n}$ 的关系。
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
