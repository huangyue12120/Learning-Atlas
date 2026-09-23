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

*本篇将统计量放回 AI 工程语境，保留源文中的定义、公式、代码、图示和实践边界，便于逐项核对。*

* 统计计量方法以单一数字汇总数据,记录分布、位置、形状和关联。该文件涵盖差异、标准偏差、四分法、skewness、kurtosis、同源性、相关性和z分数、探索性数据分析工具包和ML的特征工程。*

- 在前一个档案中,我们把瞬间作为简要统计的一族。在这里,我们整理出它们所产生的实用工具:分散、位置、形状和联系的度量。

- ** 分散** 回答问题:数据如何分散? 两个教室的平均测试分数可以相同,但差幅差分很大.

![图示](../images/variance_spread.svg)

- 狭义(蓝色)的分布有低差异:大多数值组紧绕正值. 宽(红色)分布差异很大:数值更分散。

- ** 变化** 是平均平方距离平均值。我们正向避免正向和负向的偏差 相互抵消。

$$\sigma^2 = \frac{1}{N} \sum_{i=1}^{N} (x_i - \mu)^2$$

- 当与样本(不是全部人口)合作时,我们按$N - 1$改为$N$。。。这种更正(被称作"贝塞尔的更正")说明一个样本往往低估了真实可变性:

$$s^2 = \frac{1}{N-1} \sum_{i=1}^{N} (x_i - \bar{x})^2$$

- ** 标准偏差** 是差异的平方根 :$\sigma = \sqrt{\sigma^2}$。。。它将测量结果带回原单位. 如果您的数据为厘米, 差异为厘米$^2$,但标准偏差在cm.

- ** “绝对偏离”** 是一个比较简单的备选办法。而不是纠缠,取每个偏差的绝对值:

$$\text{MAD} = \frac{1}{N} \sum_{i=1}^{N} |x_i - \mu|$$

- MAD比差异更强,因为它不会通过挤压而扩大大的偏差。然而,差异在数学上更为方便(它在证明和ML最优化中分解良好).

- ** 观点** 回答一个不同的问题:与其他数据相比,具体值位于何处?

- uartiles** 将分类数据分为四个等分部分。Q1(25%)是数据下降25%的数值. Q2为中位数(第50百分位). Q3为75%.

- ** 间距(IQR)**$Q3 - Q1$。。。它捕捉了中间50%数据的传播,忽略了极端.

![图示](../images/quartiles_boxplot.svg)

- 盒式地圖是统计中最有用的可视化之一. 框跨出Q1到Q3,内部的线是中位数,胡子延伸至最极端的非输出值,而胡子以外的点是输出值.

- ** 百分数** 泛指四分数。该$p$- 百分位数是下方的值$p\%$观察的下降。Q1为25%,中位数为50;而Q3为75.

- **z-score** 告诉你一个值从平均值中有多少标准差:

$$z = \frac{x - \mu}{\sigma}$$

- z分数为2表示值为2个标准差高于正数. 一个Z分数$-1.5$表示下方为1.5个标准差. 这又被称作**标准化**,在ML中被大量用于特征缩放,因为它将任何分布都转换为有平均值0和标准偏差1.

- ** 形状** 描述一个分布在中心外并扩散的几何.

- ** Skewness**(从上个文件起的标准第3分)测量不对称。完全对称的分布,像正常曲线一样,具有零的扭曲性. 正滑行指更长的右尾(如. 收入分配。负斯克活性指更长的左尾(例如. 退休年龄)。

$$\text{Skewness} = \frac{1}{N} \sum_{i=1}^{N} \left(\frac{x_i - \mu}{\sigma}\right)^3$$

- ** Kurtosis**(标准为第4分秒)测量尾部重力. 正常分布为克多斯分出3. 有较重尾巴(更容易出局)的分布有大于3.

$$\text{Kurtosis} = \frac{1}{N} \sum_{i=1}^{N} \left(\frac{x_i - \mu}{\sigma}\right)^4$$

- ** 校正** 衡量两个变量之间关系的强度和取向。它回答:当一个变量上升时,另一个变量倾向于上升,下降,还是什么都不做?

![图示](../images/correlation_scatter.svg)

- ** 皮尔逊关系** ($r$* 措施 *线性*协会。范围从$-1$(完美负)$0$(无)改为$+1$(完美阳性).

$$r = \frac{\sum_{i=1}^{N} (x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\sum (x_i - \bar{x})^2} \cdot \sqrt{\sum (y_i - \bar{y})^2}}$$

- 如果你记得第一章的点产品 皮尔逊关联性基本上是 以平分为中心的版本之间的同心相似性$\mathbf{x}$财务报告和已审计财务报表$\mathbf{y}$.

- ** 斯皮尔曼关系** ($\rho$* 措施 * 运动*协会。与其使用生值,不如先对其进行分级,再计算出皮尔逊在分级上的关联. 这使得它变得强大到超越,即使在关系非线性时也起作用,只要这种关系在不断增加或减少.

- ** 数值相乘时,如增长率,几何平均值为适当平均值。如果你的投资增长10%,那么20%,然后是30%,平均增长系数不是这些增长率的算术平均值。相反:

$$\bar{x}_{\text{geo}} = \left(\prod_{i=1}^{N} x_i\right)^{1/N}$$

- 对于具体增长率,先将百分比换算为系数(1.10、1.20和1.30),计算几何平均值后再减去系数1。

- ** 责任移动平均值** 对最近观测结果给予更多重视。与窗口中所有点均匀加权的简单移动平均值不同,EMA衰变指数化:

$$\text{EMA}_t = \alpha \cdot x_t + (1 - \alpha) \cdot \text{EMA}_{t-1}$$

- 平滑因素$\alpha$(0到1之间)控制了老的观测失去影响力的速度. 高级$\alpha$表示对最近的变化反应更迅速,较低$\alpha$意思是比较平滑 在ML中,EMA被用在亚当等选取器和分批正常化运行统计中.

- ** 外部探测** 发现的数据点与其它数据点相去甚远。两种常见的方法:
    - ** IQR 方法**:如果一个点低于$Q1 - 1.5 \times \text{IQR}$或以上$Q3 + 1.5 \times \text{IQR}$
    - **Z分数方法**:如果$|z| > 3$(超过3个标准偏差与平均值差分)

- IQR方法由于不假设正常分布而更强. Z分数方法在数据大致正常时效果良好,但当分布严重扭曲时可能失败.

## 编程任务（使用 Colab 或 notebook）


1. 计算一个数据集的差异、标准偏差和MAD,并进行比较。观察加一极外出者后会如何.
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

2. 计算出皮尔逊和斯皮尔曼两个变量之间的关联. 实验不同的关系。
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

3. 使用IQR和z分数方法进行外部检测,然后根据扭曲的数据比较结果。
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

4. 计算和绘制带有不同平滑因素的有声数据的指数移动平均值。
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
