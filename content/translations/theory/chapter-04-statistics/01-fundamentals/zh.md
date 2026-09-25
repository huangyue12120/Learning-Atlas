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

*统计学提供了描述数据和量化不确定性的语言。本文件介绍分布、随机变量、PMF、PDF、CDF、期望值、方差、矩和中心极限定理；这些概念支撑许多机器学习评估指标和损失函数的统计分析。*

- 统计学是从数据中学习的科学。你收集观测结果、总结它们并得出结论，通常是对无法直接测量的事物作出判断。

- 想象一下，你想知道一个国家中每个成年人的平均身高。你无法测量每个人，因此测量一个样本，并用统计学对总体作出有依据的推断。

- 有两条主要分支：
    - **描述性统计**：总结你已经有的数据（平均值、图表、表格）
    - **推断性统计**：使用样本对更大的总体作出推断

- 统计学的基础是**分布**，它描述数值如何散布。平均值、检验、预测和其他概念都建立在对分布的理解之上。

- **频数分布**统计数据中每个值（或数值范围）出现的次数。例如，将考试分数分箱，并统计每个箱中有多少名学生；结果就是直方图。

- **概率分布**用概率替代原始计数。它不再说“12 名学生的分数在 70 到 80 之间”，而是说“分数落在 70 到 80 之间的概率为 0.24”。连续变量的概率分布可以用平滑密度曲线描述。

![频数分布的直方图与概率分布的平滑曲线](../images/distribution_types.svg)


- 左侧直方图汇总你收集的实际数据，是经验分布；右侧平滑曲线是描述数据背后模式的理论分布。**编者注：**连续数据不会让直方图柱形自动变成曲线。

- 为了用分布进行数学运算，我们需要一种方法来分配数字到结果。这就是随机变量做的事情。

- 随机变量是一个函数，它将实验的每个结果映射为一个实数。掷硬币：结果是“正面”或“反面”，但随机变量 $X$ 将其转换为 $X(\text{heads}) = 1$ 和 $X(\text{tails}) = 0$。现在我们可以进行算术运算。

![](../images/random_variable.svg)


- 一个**离散**随机变量取可数集合中的值：10 次抛硬币得到的正面数、掷骰子的结果、每小时收到的电子邮件数。

- 一个**连续**随机变量可以在区间内取任何值：你的确切身高、下一次公交车到达的时间、中午的温度。

- 离散变量的概率通过求和计算；连续变量的概率通过积分计算（见第 3 章）。

- 对于离散随机变量，**概率质量函数（PMF）**给出每个取值的概率：

$$P(X = x) = p(x), \quad \text{其中 } \sum_{x} p(x) = 1$$
- 对于连续随机变量，**概率密度函数（PDF）**给出各处的概率密度。单个精确值的概率为 0；区间 $[a,b]$ 的概率由下式积分得到（见第 3 章）：

$$P(a \le X \le b) = \int_a^b f(x)\, dx, \quad \text{其中 } \int_{-\infty}^{\infty} f(x)\, dx = 1$$
- **累积分布函数（CDF）**定义为 $F_X(x)=P(X\leq x)$，表示随机变量不超过 $x$ 的概率。**编者注：**原文简介和编程任务提到 CDF，正文没有定义。
- 有了数值结果，接下来可以问：平均而言，我们期望得到什么值？

- **期望（或期望值）**是所有可能取值的加权平均，权重由各取值的概率决定。它可以看作分布的“重心”。

- 多次掷公平骰子时，平均点数会随次数增加而趋近 3.5。3.5 是期望值，但单次掷骰不会得到这个结果。

- 对于离散随机变量：

$$E[X] = \sum_{x} x \cdot p(x)$$
- 对于连续随机变量（使用第3章中的积分）：

$$E[X] = \int_{-\infty}^{\infty} x \cdot f(x)\, dx$$
- 例如，一个公平六面骰子的 $p(x) = 1/6$ 对应于 $x = 1, 2, 3, 4, 5, 6$。

$$E[X] = 1 \cdot \tfrac{1}{6} + 2 \cdot \tfrac{1}{6} + 3 \cdot \tfrac{1}{6} + 4 \cdot \tfrac{1}{6} + 5 \cdot \tfrac{1}{6} + 6 \cdot \tfrac{1}{6} = \frac{21}{6} = 3.5$$
- 期望具有线性性质：$E[aX+b]=aE[X]+b$。这条性质常用于推导机器学习中的损失函数。

- **中心极限定理**指出，在独立同分布且方差有限等条件下，样本均值经过中心化和标准化后，会随样本量增加而趋近标准正态分布。**编者注：**原文简介列出该定理，但正文没有展开。

- 期望描述分布的中心，但不反映数值的离散程度。**矩**可以概括分布的中心、离散程度和尾部特征；矩本身未必能唯一确定整个分布。

- 矩是随机变量 $X$ 的幂的期望。第 $k$ 个**原始矩**定义为：

$$\mu_k' = E[X^k]$$
- 一阶原始矩（$k = 1$）就是均值：$\mu_1' = E[X] = \mu$。

- 原始矩以 0 为基准。若关心数值相对均值的偏差，可看第 $k$ 个**中心矩**：

$$\mu_k = E[(X - \mu)^k]$$
- 一阶中心矩总是 0（均值上下的偏差相互抵消）。二阶中心矩就是**方差**。

- 为了比较不同尺度上的分布，我们将中心矩除以标准差 $\sigma$ 的相应幂次进行**标准化**：

$$\tilde{\mu}_k = \frac{\mu_k}{\sigma^k}$$
- 常用的矩概括分布形状的不同方面：

![带注释的钟形曲线，说明每个矩捕捉的内容：均值（中心）、方差（离散程度）、偏度（不对称性）、峰度（尾部权重）](../images/moments_shape.svg)


- **一阶原始矩（均值）**：分布的中心，也可看作平衡点。
- **二阶中心矩（方差）**：数值围绕均值的离散程度。方差越大，分布通常越宽。
- **三阶标准化中心矩（偏度）**：描述分布的不对称程度。对称分布的偏度为零，但偏度为零不一定表示分布对称。
- **四阶标准化中心矩（峰度）**：描述尾部重量；峰度越高，通常表示尾部越重。

- 让我们用一个具体的数据集计算四个矩：$X = \{2, 4, 4, 4, 5, 5, 7, 9\}$。

- **步骤 1：均值**（一阶原始矩）

$$\mu = \frac{2 + 4 + 4 + 4 + 5 + 5 + 7 + 9}{8} = \frac{40}{8} = 5$$
- **步骤 2：方差**（二阶中心矩）。从每个值中减去均值，平方后取平均：

$$\sigma^2 = \frac{(2{-}5)^2 + (4{-}5)^2 + (4{-}5)^2 + (4{-}5)^2 + (5{-}5)^2 + (5{-}5)^2 + (7{-}5)^2 + (9{-}5)^2}{8}$$
$$= \frac{9 + 1 + 1 + 1 + 0 + 0 + 4 + 16}{8} = \frac{32}{8} = 4$$
- **标准差**是 $\sigma = \sqrt{4} = 2$。

- **步骤 3：偏度**（标准化的三阶中心矩）。将偏差立方后取平均，再除以 $\sigma^3$：

$$\tilde{\mu}_3 = \frac{1}{8} \cdot \frac{(-3)^3 + (-1)^3 + (-1)^3 + (-1)^3 + 0^3 + 0^3 + 2^3 + 4^3}{2^3}$$
$$= \frac{1}{8} \cdot \frac{-27 -1 -1 -1 + 0 + 0 + 8 + 64}{8} = \frac{42}{64} = 0.656$$
- 正偏度意味着右尾更长，这符合 9 超过均值的事实。

- **步骤 4：峰度**（标准化的四阶中心矩）。将偏差提升到 4 次方：

$$\tilde{\mu}_4 = \frac{1}{8} \cdot \frac{(-3)^4 + (-1)^4 + (-1)^4 + (-1)^4 + 0^4 + 0^4 + 2^4 + 4^4}{2^4}$$
$$= \frac{1}{8} \cdot \frac{81 + 1 + 1 + 1 + 0 + 0 + 16 + 256}{16} = \frac{356}{128} = 2.781$$
- 正态分布的峰度为 3（称为“中峰”）。这个数据集的峰度为 2.781，接近 3，但单凭峰度不能断定尾部接近正态分布。大于 3（“尖峰”）表示尾部较重；小于 3（“扁峰”）表示尾部较轻。**超额峰度**等于峰度减 3，因此此处为 $-0.219$。

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

2. 计算工作示例中数据集的四个矩（均值、方差、偏度、峰度），然后修改数据并观察每个矩如何变化。
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

3. 并排绘制公平骰子的 PMF 和 CDF。改变概率，观察分布形状如何变化。
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
