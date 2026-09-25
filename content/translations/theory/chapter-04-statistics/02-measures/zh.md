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
# 统计量

*统计量用单一数值概括数据的离散程度、位置、形状和变量间关联。本文件介绍方差、标准差、四分位数、偏度、峰度、相关系数和 z 分数，可用于机器学习中的探索性数据分析和特征工程。**编者注：**原文简介还列出协方差，但正文没有展开。*

- 在上一个文件中，我们介绍了作为总结统计量的一组矩。这里将介绍由它们导出的实用工具：描述离散程度、位置、形状和关联性的指标。

- **离散程度**回答了一个问题：数据有多分散？两个班级的平均考试成绩可能相同，但数据的离散程度大不相同。

![两个分布，均值相同但标准差不同](../images/variance_spread.svg)


- 窄（蓝色）分布的方差低：大多数值紧密围绕均值聚集。宽（红色）分布的方差高：值散布得更远。

- **方差**是偏离均值的平方的平均值。平方可以避免正负偏差相互抵消。

$$\sigma^2 = \frac{1}{N} \sum_{i=1}^{N} (x_i - \mu)^2$$
- 当处理样本（而不是整个总体）时，我们除以 $N - 1$ 而不是 $N$。这个修正（称为贝塞尔修正）考虑到了样本倾向于低估真实变异性的事实：

$$s^2 = \frac{1}{N-1} \sum_{i=1}^{N} (x_i - \bar{x})^2$$
- 标准差是方差的平方根：$\sigma = \sqrt{\sigma^2}$。它把度量单位恢复为原始单位：如果数据以厘米计，方差的单位是平方厘米，标准差的单位则回到厘米。

- **平均绝对偏差（MAD）**是一个更简单的替代方案。它对每个偏差取绝对值，而不是平方：

$$\text{MAD} = \frac{1}{N} \sum_{i=1}^{N} |x_i - \mu|$$
- 平均绝对偏差不像方差那样平方放大大偏差，因此受极端值的影响相对较小。方差则更便于数学推导和机器学习优化。**编者注：**此处 MAD 指平均绝对偏差；有些资料用 MAD 表示中位数绝对偏差，两者定义不同。

- **位置**回答的是一个不同的问题：某个特定值相对于其他数据的位置在哪里？

- 四分位数把排序后的数据分成四部分。Q1、Q2、Q3 分别对应第 25、50、75 百分位数；Q2 就是中位数。

- **四分位距（IQR）**是 $Q3 - Q1$。它描述中间 50% 数据的离散程度，并忽略极端值。

![箱线图显示 Q1、中位数、Q3、IQR、须和离群点](../images/quartiles_boxplot.svg)


- 箱线图是统计学中最有用的可视化之一。箱体从 Q1 延伸到 Q3，中间的线是中位数；须延伸到最极端的非离群值，须外的点就是离群值。

- 百分位数推广了四分位数的概念。第 $p$ 百分位数是使得 $p\%$ 的观测值不超过它的值。Q1 是第 25 百分位数，中位数是第 50 百分位数，Q3 是第 75 百分位数。

- **z 分数（z-score）**表示一个值与均值相差多少个标准差：

$$z = \frac{x - \mu}{\sigma}$$
- $z=2$ 表示该值比均值高 2 个标准差；$z=-1.5$ 表示低 1.5 个标准差。**标准化**会把数据缩放到均值为 0、标准差为 1，常用于机器学习中的特征缩放；它不会让数据自动服从正态分布。

- 分布的**形状**描述中心和离散程度之外的特征。

- **偏度**（上一章介绍的标准化三阶中心矩）衡量分布的不对称程度。对称分布（如正态分布）的偏度为零。正偏度通常表示右尾较长（如收入分布）；负偏度通常表示左尾较长（如退休年龄）。

$$\text{Skewness} = \frac{1}{N} \sum_{i=1}^{N} \left(\frac{x_i - \mu}{\sigma}\right)^3$$
- **峰度**（标准化的第四个矩）衡量尾部的密集程度。正态分布的峰度为3。具有更重尾部（更容易出现异常值）的分布峰度大于3。

$$\text{Kurtosis} = \frac{1}{N} \sum_{i=1}^{N} \left(\frac{x_i - \mu}{\sigma}\right)^4$$
- 相关性衡量两个变量关联的方向和强度。对皮尔逊相关而言，它描述线性关系：一个变量升高时，另一个变量是否也倾向升高或降低？

![](../images/correlation_scatter.svg)


- **皮尔逊相关系数**（$r$）衡量线性关联，取值从 $-1$（完全负相关）到 $+1$（完全正相关）。$r=0$ 表示没有线性关联，不排除变量间存在非线性关系。

$$r = \frac{\sum_{i=1}^{N} (x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\sum (x_i - \bar{x})^2} \cdot \sqrt{\sum (y_i - \bar{y})^2}}$$
- 如果你还记得第1章中的点积，皮尔逊相关系数本质上是$\mathbf{x}$和$\mathbf{y}$的均值中心版本之间的余弦相似度。

- **斯皮尔曼相关系数**（$\rho$）衡量单调关联。它先对原始值排序，再对秩计算皮尔逊相关系数。这种方法对离群点较稳健，即使关系是非线性的，只要始终单调递增或递减，也能发挥作用。

- 对于会连乘的数值（例如连续增长率），应使用**几何平均数**。若投资先增长 10%、再增长 20%、最后增长 30%，平均增长因子不能用增长率的算术平均值计算：

$$\bar{x}_{\text{geo}} = \left(\prod_{i=1}^{N} x_i\right)^{1/N}$$
- 对于增长率，首先将百分比转换为因子（例如 1.10、1.20、1.30），然后计算几何平均数，最后减去 1。

- **指数移动平均（EMA）**给予近期观测值更高的权重。与窗口内各点权重相同的简单移动平均不同，EMA 使旧观测值的权重按指数衰减：

$$\text{EMA}_t = \alpha \cdot x_t + (1 - \alpha) \cdot \text{EMA}_{t-1}$$
- 平滑因子 $\alpha$（介于 0 和 1 之间）控制旧观测值权重衰减的速度。$\alpha$ 越高，EMA 对近期变化越敏感；$\alpha$ 越低，曲线越平滑。Adam 等优化器和批归一化都使用 EMA。

- 异常检测识别数据点与其余数据的显著差异。两种常见方法：
    - IQR 方法：如果一个点低于 $Q1 - 1.5 \times \text{IQR}$ 或高于 $Q3 + 1.5 \times \text{IQR}$，则视为异常。
    - **Z 分数方法**：如果一个点满足 $|z| > 3$（距均值超过 3 个标准差），则视为离群点。

- IQR 方法不要求数据服从正态分布，因此在偏态数据上通常更稳健。z 分数方法适用于近似正态的数据；分布高度偏斜时可能失效。

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

3. 分别用 IQR 和 z 分数检测异常值，再比较它们在偏态数据上的结果。
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
