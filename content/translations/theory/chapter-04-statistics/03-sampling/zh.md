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
# 抽样方法决定了我们如何收集数据，直接控制了我们得出的每一个结论的质量。本文件涵盖了随机、分层、集群和系统性抽样、抽样分布、大数定律和自助法等方法，这些方法在机器学习中的训练/测试分割和数据集整理中至关重要。

- 在理想的世界里，你想要测量你关心的群体中的每一个成员。但在现实生活中，这几乎不可能。你无法对每个选民进行调查、测试每个灯泡或扫描每个病人。因此，你需要抽取一个**样本**并使用它来了解整个群体。

- **总体**是你要研究的完整个体或项目的集合。**样本**是你实际观察到的子集。

- **参数**是一个描述总体（例如，一个国家所有成年人的平均身高）的数字。

- **统计量**是从你的样本中计算出来的数字（例如，你测量的500个人的平均身高）。统计量用于估计参数。

- 你的结论的质量完全取决于你选择样本的方式。一个偏倚的样本会导致无论分析多么复杂的结果都是偏倚的。

- **抽样框**是你实际从其中抽取样本的个体列表。理想情况下，它完美匹配总体，但在实践中存在缺口。

- 例如，如果你通过电话调查人们，你错过了没有电话的人。抽样框和总体之间的差异称为**覆盖误差**。

- **抽样误差**是样本统计量与总体参数之间自然的偏差。

- 即使一个完全随机的样本也不会完全匹配总体。更大的样本会减少抽样误差。

- 任何一种概率抽样方法都会导致总体参数和样本统计量之间的偏差，但这种偏差可以通过量化不确定性并推广结果来管理。

- 抽样方法有两种主要类别：概率抽样和非概率抽样。

- **概率抽样**意味着每个个体都有已知的、非零的概率被选中。这允许你量化不确定性并推广结果。

- **简单随机抽样**：每个个体有相等的机会被选中，每种可能大小为$n$的样本都是 equally可能的。想象一下把每个人的名字放在一个篮子里并随机抽取。

- **分层抽样**：根据一个共享特征（例如年龄组、地区）将总体分成非重叠的群体（层次），然后从每个层次中随机采样。这保证了每个群体都有代表，并且在层次之间减少差异时，可以降低方差。

- **集群抽样**：根据地理分布将总体分成组（簇），随机选择一些簇，然后包括这些簇中的所有人。这种方法适用于地理上分散的群体，例如在某个地区对整个学校进行采样而不是每个学生单独进行采样。

- **系统性抽样**：从列表中随机选择一个开始点，然后每隔$k$个个体选择一个。例如，从第7个人开始，然后每10个人（7、17、27...）。简单易行，但可能会引入偏差，如果列表中有隐藏的模式。

![Three probability sampling methods side by side: simple random, stratified, and cluster](../images/sampling_methods.svg)


- **非概率抽样**不给每个个体一个已知的概率被选中。结果不能严格推广，但这些方法通常更快且成本更低。

- **便利性抽样**：选择最容易接触到的人。在购物中心进行调查是方便的，但忽略了那些不购物的人。

- **quota抽样**类似于分层抽样，但没有随机性。研究人员通过填写配额（例如50名男性和50名女性）来选择每个群体中的个体。

- **滚雪球抽样**从几个参与者开始，并要求他们招募其他人。适用于难以接触的群体（例如研究罕见疾病），但高度偏向于连接的个体。

- 一旦你有了抽样方法，一个自然的问题就会出现：如果我取了不同的样本，我会得到不同的统计量吗？几乎肯定会。**抽样分布**是统计量（如样本均值）在所有相同大小的可能样本中的分布。

- 考虑从30个人中抽取1,000个不同的样本，并计算每个样本的平均身高。这些1,000个平均值形成一个分布。有些会略高于真实总体平均值，有些会略低于，大多数会集中在真实值附近。

- 标准误差是这个抽样分布的标准差：

$$SE = \frac{\sigma}{\sqrt{n}}$$
- 请注意，标准误差随着 $n$ 的增长而减小。样本越大，估计越精确。将样本大小增加四倍会将标准误差减半。

- 统计学中最重要的一点是 **中心极限定理 (CLT)**。它说：无论原始总体的形状如何，随着样本大小的增加，样本均值的分布都会趋近于正态分布。

![CLT: a skewed population produces normally distributed sample means](../images/central_limit_theorem.svg)


- 更精确地说，如果 $X_1, X_2, \ldots, X_n$ 是独立观察结果来自任何具有平均值 $\mu$ 和有限方差 $\sigma^2$ 的分布，则随着 $n$ 增加：

$$\bar{X} \approx \text{Normal}\!\left(\mu, \frac{\sigma^2}{n}\right)$$
- 中心极限定理（CLT）是大多数推断统计学工作的基础。它允许我们在样本足够大时，使用正态分布作为近似值，即使原始数据不是正态分布的。

- 多大算是“足够大”？一个常见的标准是 $n \ge 30$，但这取决于人口的非正态性。对于高度偏斜分布，可能需要更多。对于大致对称的人口，甚至 $n = 10$ 也可以足够了。

- 中心极限定理有三个关键条件：
    - **独立性**：每个观测点不能影响其他观测点
    - **有限方差**：总体方差必须存在（排除一些奇异分布）
    - **相同分布**：所有观测点都来自相同的分布

## 编程任务（使用 CoLab 或 笔记本）

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

3. 探讨样本大小对标准误的影响。绘制标准误差随样本大小的变化图，并确认 $1/\sqrt{n}$ 关系。
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
