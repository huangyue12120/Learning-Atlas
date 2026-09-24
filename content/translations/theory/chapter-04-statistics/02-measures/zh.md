---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 04 - statistics/02. measures.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 29e10b28a00e6fa718e372322b07cefb3f829689c921f548c135bf2189db2e48
status: reviewed
---
# 统计指标

*统计指标用单一数字总结数据，以捕捉分布、位置、形状和关联。本文件涵盖了方差、标准差、四分位数、偏度、峰度、协方差、相关系数和z分数，这些工具是机器学习中探索性数据分析和特征工程的必备工具。*

- 在上一个文件中我们介绍了矩作为一组总结统计量。在这里我们将从它们中 unpack出实用工具：描述分散、位置、形状和关联的指标。

- **分散**回答了问题：数据有多分散？两个班级可以有相同的平均考试成绩，但非常不同的分布。

![两个分布，均值相同但标准差不同](../images/variance_spread.svg)


- 窄（蓝色）分布的方差低：大多数值紧密围绕均值聚集。宽（红色）分布的方差高：值散布得更远。

- 方差是平均值的平方距离。我们平方以避免正负偏差相互抵消。

$$\sigma^2 = \frac{1}{N} \sum_{i=1}^{N} (x_i - \mu)^2$$
- 当处理样本（而不是整个总体）时，我们除以 $N - 1$ 而不是 $N$。这个修正（称为贝塞尔修正）考虑到了样本倾向于低估真实变异性的事实：

$$s^2 = \frac{1}{N-1} \sum_{i=1}^{N} (x_i - \bar{x})^2$$
- 标准差是方差的平方根： $\sigma = \sqrt{\sigma^2}$它将度量恢复到原始单位。如果你的数据是厘米，方差也是厘米。$^2$但标准差又回到了厘米。

- **绝对偏差（MAD）** 是一个更简单的替代方案。取每个偏差的绝对值，而不是平方：

$$\text{MAD} = \frac{1}{N} \sum_{i=1}^{N} |x_i - \mu|$$
- MAD（中位数绝对偏差）比方差更抗离群点，因为它不会放大异常值的平方。然而，方差在数学证明和机器学习优化方面更为方便（它分解得较为容易）。

- **位置**回答的是一个不同的问题：某个特定值相对于其他数据的位置在哪里？

- 四分位数将排序后的数据分成四等份。Q1（25百分位）是小于该值的25%的数据。Q2是中位数（50百分位）。Q3是75百分位。

- 中位数（IQR）是 $Q3 - Q1$。它捕捉了中间 50% 数据的范围，忽略极端值。

![](../images/quartiles_boxplot.svg)


- 盒子图是统计学中最有用的可视化之一。盒子从Q1到Q3，中间的线是中位数，延长线到最极端非异常值，超出延长线的点是异常值。

- 百分位数一般化四分位数。第 $p$ 百分位的值是小于等于 $p\%$ 的观察值数量的下限。Q1 是 25 百分位，中位数是 50 百分位，Q3 是 75 百分位。

- 标准分数（z-score）告诉你一个值与平均数之间的标准差数量：

$$z = \frac{x - \mu}{\sigma}$$
- 一个z分数为2意味着该值比平均值高2个标准差。一个z分数为$-1.5$意味着它比平均值低1.5个标准差。这被称为**标准化**，在机器学习中广泛用于特征缩放，因为它将任何分布转换为均值为0和标准差为1的格式。

- 形状描述了分布的几何特征，除了中心和范围之外。

- **偏度**（上一个文件中的3阶矩标准化）衡量不对称性。完全对称的分布，如正态曲线，偏度为零。正值偏度意味着右尾更长（例如收入分布）。负值偏度意味着左尾更长（例如退休年龄）。

$$\text{Skewness} = \frac{1}{N} \sum_{i=1}^{N} \left(\frac{x_i - \mu}{\sigma}\right)^3$$
- **峰度**（标准化的第四个矩）衡量尾部的密集程度。正态分布的峰度为3。具有更重尾部（更容易出现异常值）的分布峰度大于3。

$$\text{Kurtosis} = \frac{1}{N} \sum_{i=1}^{N} \left(\frac{x_i - \mu}{\sigma}\right)^4$$
- 相关性衡量两个变量之间关系的强度和方向。它回答：当一个变量上升时，另一个变量是否会上升、下降或保持不变？

![](../images/correlation_scatter.svg)


- 皮尔逊相关系数（$r$）衡量的是线性关联。它从$-1$（完全负相关）到$0$（没有关系）再到$+1$（完全正相关）。

$$r = \frac{\sum_{i=1}^{N} (x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\sum (x_i - \bar{x})^2} \cdot \sqrt{\sum (y_i - \bar{y})^2}}$$
- 如果你还记得第1章中的点积，皮尔逊相关系数本质上是$\mathbf{x}$和$\mathbf{y}$的均值中心版本之间的余弦相似度。

- **相关系数**（$\rho$）用于测量单调关系。它首先对原始值进行排名，然后在排名上计算皮尔逊相关系数。这种方法对异常值具有鲁棒性，并且即使关系是非线性的，只要它是单调递增或递减的，也能有效工作。

- 平均数是当值相乘时的合适平均值，例如增长率。如果你的投资增长了10%，然后增长了20%，最后增长了30%，那么这些增长率的算术平均数并不是这些增长率的平均因子。相反：

$$\bar{x}_{\text{geo}} = \left(\prod_{i=1}^{N} x_i\right)^{1/N}$$
- 对于增长率，首先将百分比转换为因子（例如 1.10、1.20、1.30），然后计算几何平均数，最后减去 1。

- **指数移动平均数 (EMA)** 给予最近观察点更多的权重。与简单移动平均数不同，EMA 按指数方式衰减旧观测点的影响：

$$\text{EMA}_t = \alpha \cdot x_t + (1 - \alpha) \cdot \text{EMA}_{t-1}$$
- 平滑因子 $\alpha$（介于 0 和 1 之间）控制旧观测点失去影响力的速度。较高的 $\alpha$ 表示对近期变化更敏感，较低的 $\alpha$ 表示更平滑。在机器学习中，EMA 用于优化器如 Adam 中，并在批归一化中的运行统计信息中使用。

- 异常检测识别数据点与其余数据的显著差异。两种常见方法：
    - IQR方法：如果一个点低于$Q1 - 1.5 \times \text{IQR}$或高于$Q3 + 1.5 \times \text{IQR}$，则为异常。
    - Z-score方法：如果一个点的Z分数（超过3个标准差）大于$|z| > 3$，则为异常。

- 中位数法更稳健，因为它不假设数据服从正态分布。z分法在数据大致服从正态时工作良好，但在分布极度偏斜时可能会失败。

## 编程任务（使用 Colab 或笔记本）

1. 计算数据集的方差、标准差和 MAD，并进行比较。观察当添加极端异常值时会发生什么情况。
```python
import jax.numpy as jnp

data = jnp.array([4, 8, 6, 5, 3, 7, 9, 5, 6, 7], dtype=jnp.float32)

mean = jnp.mean(data)
variance = jnp.var(data)
std = jnp.std(data)
mad = jnp.mean(jnp.abs(data - mean))

print("Original data:")
print(f"  Variance: {variance:.3f}, Std: {std:.3f}, MAD: {mad:.3f}")

# Add an outlier and recompute
data_outlier = jnp.append(data, 100.0)
mean2 = jnp.mean(data_outlier)
print(f"\nWith outlier (100):")
print(f"  Variance: {jnp.var(data_outlier):.3f}, Std: {jnp.std(data_outlier):.3f}, MAD: {jnp.mean(jnp.abs(data_outlier - mean2)):.3f}")
```

2. 计算两个变量之间的皮尔逊相关系数和斯皮尔曼相关系数。尝试不同的关系。
```python
import jax
import jax.numpy as jnp

# Perfect linear relationship
x = jnp.array([1, 2, 3, 4, 5, 6, 7, 8], dtype=jnp.float32)
y = 2 * x + 1  # try changing this!

def pearson(a, b):
    a_c = a - jnp.mean(a)
    b_c = b - jnp.mean(b)
    return jnp.sum(a_c * b_c) / (jnp.sqrt(jnp.sum(a_c**2)) * jnp.sqrt(jnp.sum(b_c**2)))

def spearman(a, b):
    rank_a = jnp.argsort(jnp.argsort(a)).astype(jnp.float32)
    rank_b = jnp.argsort(jnp.argsort(b)).astype(jnp.float32)
    return pearson(rank_a, rank_b)

print(f"Pearson r:  {pearson(x, y):.4f}")
print(f"Spearman ρ: {spearman(x, y):.4f}")
```

3. 实现基于IQR和z-score方法的异常检测，并在 skewed数据上进行比较。
```python
import jax.numpy as jnp

data = jnp.array([2, 3, 3, 4, 5, 5, 5, 6, 6, 7, 50], dtype=jnp.float32)

# IQR method
q1, q3 = jnp.percentile(data, 25), jnp.percentile(data, 75)
iqr = q3 - q1
lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
iqr_outliers = data[(data < lower) | (data > upper)]
print(f"IQR bounds: [{lower:.1f}, {upper:.1f}]")
print(f"IQR outliers: {iqr_outliers}")

# Z-score method
z_scores = (data - jnp.mean(data)) / jnp.std(data)
z_outliers = data[jnp.abs(z_scores) > 3]
print(f"\nZ-scores: {z_scores}")
print(f"Z-score outliers (|z| > 3): {z_outliers}")
```

4. 计算并绘制不同平滑因子下的指数移动平均线，处理噪声数据。
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt

# Generate noisy data
key = __import__("jax").random.PRNGKey(0)
noise = __import__("jax").random.normal(key, shape=(50,))
signal = jnp.linspace(0, 5, 50) + noise

def ema(data, alpha):
    result = jnp.zeros_like(data)
    result = result.at[0].set(data[0])
    for t in range(1, len(data)):
        result = result.at[t].set(alpha * data[t] + (1 - alpha) * result[t - 1])
    return result

plt.figure(figsize=(10, 4))
plt.plot(signal, "o", alpha=0.3, label="raw data", color="#999")
for alpha, color in [(0.1, "#e74c3c"), (0.3, "#3498db"), (0.7, "#27ae60")]:
    plt.plot(ema(signal, alpha), label=f"α={alpha}", color=color, linewidth=2)
plt.legend()
plt.title("EMA with different smoothing factors")
plt.show()
```
