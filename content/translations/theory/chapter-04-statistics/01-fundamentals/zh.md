---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 04 - statistics/01. fundamentals.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 5dc7e55d4737fdcc4825b22f0589fe4a4c27d8d2f8209f9e1f0bf47e2af7ca47
status: reviewed
---
# 统计学基础

*统计学提供了描述数据和量化不确定性的语言。本文件涵盖了分布、随机变量、PMF、PDF、CDF、期望值、方差、矩和中心极限定理，这些是所有机器学习评估指标和损失函数的基础概念。*

- -统计学是学习数据的科学。你收集观察结果，总结它们，并得出结论，通常是对无法直接测量的事物做出判断。

- -想象一下，你想知道一个国家中每个成年人的平均身高。你不能测量每个人，所以你测量一个样本并使用统计学来做出关于整个群体的 informed猜测。

- -有两条主要分支：
    - **描述性统计**：总结你已经有的数据（平均值、图表、表格）
    - **推断性统计**：使用样本来声称一个更大的群体

- -统计学的基础是**分布**，它描述了值是如何分散的。一切其他概念，如平均值、测试、预测和流程都从理解分布开始。

- -一个**频率分布**计算数据中每个值（或范围）出现的次数。例如，将考试分数放入桶中并计数学生在每个桶中的数量。结果是直方图。

- 一个**概率分布**用概率替换原始计数。而不是“12名学生在70到80之间得分”，它说“有0.24的概率在70到80之间得分”。当数据连续时，直方图条形变为平滑曲线。

![频率分布的直方图与概率分布的光滑曲线](../images/distribution_types.svg)


- 左边的直方图是基于你收集的实际数据构建的。右边的平滑曲线是一个数学模型，描述了数据背后模式。一个是 empirical 的，另一个是理论性的。

- 为了用分布进行数学运算，我们需要一种方法来分配数字到结果。这就是随机变量做的事情。

- 随机变量是一个函数，它将实验的每个结果映射为一个实数。掷硬币：结果是“正面”或“反面”，但随机变量 $X$ 将其转换为 $X(\text{heads}) = 1$ 和 $X(\text{tails}) = 0$。现在我们可以进行算术运算。

![](../images/random_variable.svg)


- 一个**离散**随机变量取有限个值：10次翻硬币时的正面数量、骰子的掷出结果、每小时收到的电子邮件数量。

- 一个**连续**随机变量可以在区间内取任何值：你的确切身高、下一次公交车到达的时间、中午的温度。

- 区别很重要，因为它改变了我们如何计算概率。对于离散变量，我们求和。对于连续变量，我们积分（回想第3章中的积分）。

- 对于一个离散随机变量，**概率质量函数 (PMF)** 给出每个特定值的概率：

$$P(X = x) = p(x), \quad \text{where } \sum_{x} p(x) = 1$$
- 对于一个连续随机变量（使用第3章中的积分）：

$$P(a \le X \le b) = \int_a^b f(x)\, dx, \quad \text{where } \int_{-\infty}^{\infty} f(x)\, dx = 1$$
- 现在我们有了分配的数字，最自然的问题是：我们期望平均值是多少？

- **期望值**（或预期值）是所有可能值的加权平均值，其中权重是概率。想象一下它是一个分布的“重心”。

- 如果你多次掷一个公平骰子，你的平均掷出结果会收敛到3.5。这是期望值，即使你永远无法实际掷出3.5。

- 对于离散随机变量：

$$E[X] = \sum_{x} x \cdot p(x)$$
- 对于连续随机变量（使用第3章中的积分）：

$$E[X] = \int_{-\infty}^{\infty} x \cdot f(x)\, dx$$
- 例如，一个公平六面骰子的 $p(x) = 1/6$ 对应于 $x = 1, 2, 3, 4, 5, 6$。

$$E[X] = 1 \cdot \tfrac{1}{6} + 2 \cdot \tfrac{1}{6} + 3 \cdot \tfrac{1}{6} + 4 \cdot \tfrac{1}{6} + 5 \cdot \tfrac{1}{6} + 6 \cdot \tfrac{1}{6} = \frac{21}{6} = 3.5$$
- 期望值线性，这意味着 $E[aX + b] = aE[X] + b$。这个属性极其有用，并在机器学习损失函数中频繁出现。

- 期望值告诉我们中心，但它说 nothing关于值的分布如何。为了描述分布的完整形状，我们需要**矩**。

- 一个矩是 $X$ 的期望值的幂。第 $k$ 次**原始矩**为：

$$\mu_k' = E[X^k]$$
- 第一个原始时刻（$k = 1$）只是均值：$\mu_1' = E[X] = \mu$.

- 原始时刻是从零开始测量的。我们经常关心相对于均值的偏差。第 $k$ 个 **中心时刻** 中心化了测量:

$$\mu_k = E[(X - \mu)^k]$$
- 第一个中心时刻总是为零（均值上方和下方的偏差相互抵消）。第二个中心时刻是 **方差**.

- 为了在不同尺度上比较分布，我们通过除以适当的标准差的幂次来 **标准化**：$\sigma$.

$$\tilde{\mu}_k = \frac{\mu_k}{\sigma^k}$$
- 每个时刻都捕捉到分布形状的不同方面：

![带注释的钟形曲线，说明每个时刻捕捉的内容：均值（中心）、方差（扩散）、偏斜度（不对称性）、峰度（尾部重量）](../images/moments_shape.svg)


- **1st moment (均值)**：分布的中心。平衡点。
- **2nd moment (方差)**：围绕均值值的分散程度。方差越大，范围越广。
- **3rd moment (偏度)**：分布是否向左或右倾斜。零偏度表示对称。
- **4th moment (峰度)**：尾部的重量。峰度越高，极端 outlier越多。

- 让我们通过一个具体的数据集来工作，处理四个时刻：$X = \{2, 4, 4, 4, 5, 5, 7, 9\}$.

- **步骤 1: 平均值**（第一个原始时刻）

$$\mu = \frac{2 + 4 + 4 + 4 + 5 + 5 + 7 + 9}{8} = \frac{40}{8} = 5$$
- **步骤 2: 方差**（第二个中心时刻）。从每个值中减去平均值，平方，然后取平均值：

$$\sigma^2 = \frac{(2{-}5)^2 + (4{-}5)^2 + (4{-}5)^2 + (4{-}5)^2 + (5{-}5)^2 + (5{-}5)^2 + (7{-}5)^2 + (9{-}5)^2}{8}$$
$$= \frac{9 + 1 + 1 + 1 + 0 + 0 + 4 + 16}{8} = \frac{32}{8} = 4$$
- **标准差**是 $\sigma = \sqrt{4} = 2$。

- **步骤 3：偏度**（标准化的第三个中心矩）。立方偏差，平均值除以 $\sigma^3$：

$$\tilde{\mu}_3 = \frac{1}{8} \cdot \frac{(-3)^3 + (-1)^3 + (-1)^3 + (-1)^3 + 0^3 + 0^3 + 2^3 + 4^3}{2^3}$$
$$= \frac{1}{8} \cdot \frac{-27 -1 -1 -1 + 0 + 0 + 8 + 64}{8} = \frac{42}{64} = 0.656$$
- 正偏度意味着右尾更长，这符合 9 超过均值的事实。

- **步骤 4：峰度**（标准化的第四个中心矩）。将偏差提升到 4 次方：

$$\tilde{\mu}_4 = \frac{1}{8} \cdot \frac{(-3)^4 + (-1)^4 + (-1)^4 + (-1)^4 + 0^4 + 0^4 + 2^4 + 4^4}{2^4}$$
$$= \frac{1}{8} \cdot \frac{81 + 1 + 1 + 1 + 0 + 0 + 16 + 256}{16} = \frac{356}{128} = 2.781$$
- 正态分布的峰度为3（称为“中峰”）。我们的值2.781接近，暗示尾部大致正常。大于3（“尖峰”）表示尾部更重；小于3（“扁峰”）表示尾部更轻。一些公式报告**超额峰度**通过减去3来计算，因此我们的超额峰度为$-0.219$。

## 编程任务（使用 Colab 或笔记本）

1. 计算一个已加载骰子的期望值，其中面6的概率为0.3，其余面的概率均等。通过模拟100,000次掷骰来验证。
```python
import jax
import jax.numpy as jnp

# Loaded die: face 6 has p=0.3, others share 0.7 equally
probs = jnp.array([0.14, 0.14, 0.14, 0.14, 0.14, 0.30])
faces = jnp.array([1, 2, 3, 4, 5, 6])

# Analytical expected value
ev = jnp.sum(faces * probs)
print(f"Expected value (formula): {ev:.4f}")

# Simulation
key = jax.random.PRNGKey(42)
rolls = jax.random.choice(key, faces, shape=(100_000,), p=probs)
print(f"Expected value (simulation): {rolls.mean():.4f}")
```

2. 计算工作示例中数据集的所有四个矩形（均值、方差、偏斜度、峰度），然后修改数据并观察每个矩形如何变化。
```python
import jax.numpy as jnp

x = jnp.array([2, 4, 4, 4, 5, 5, 7, 9], dtype=jnp.float32)

mean = jnp.mean(x)
variance = jnp.mean((x - mean) ** 2)
std = jnp.sqrt(variance)
skewness = jnp.mean(((x - mean) / std) ** 3)
kurtosis = jnp.mean(((x - mean) / std) ** 4)

print(f"Mean:     {mean:.3f}")
print(f"Variance: {variance:.3f}")
print(f"Std Dev:  {std:.3f}")
print(f"Skewness: {skewness:.3f}")
print(f"Kurtosis: {kurtosis:.3f}")
print(f"Excess K: {kurtosis - 3:.3f}")
```

3. 可视化一个公平骰子掷出的PMF和CDF，尝试改变概率以观察形状的变化。
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt

faces = jnp.array([1, 2, 3, 4, 5, 6])
pmf = jnp.ones(6) / 6  # fair die; try changing these!
cdf = jnp.cumsum(pmf)

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 4))

ax1.bar(faces, pmf, color="#3498db", alpha=0.8)
ax1.set_title("PMF")
ax1.set_xlabel("Face")
ax1.set_ylabel("P(X = x)")
ax1.set_ylim(0, 0.5)

ax2.step(faces, cdf, where="mid", color="#e74c3c", linewidth=2)
ax2.set_title("CDF")
ax2.set_xlabel("Face")
ax2.set_ylabel("P(X ≤ x)")
ax2.set_ylim(0, 1.1)

plt.tight_layout()
plt.show()
```
