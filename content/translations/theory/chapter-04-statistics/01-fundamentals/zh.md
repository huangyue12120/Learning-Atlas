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

*统计学基础帮助我们从数据描述分布、估计不确定性并理解随机性。本篇介绍总体与样本、描述统计、概率模型、期望、方差和常见抽样直觉。*


* 统计为描述数据和量化不确定性提供了语言。此文件涵盖了分布,随机变量,PMF,PDF,CDF,期望,差异,瞬间,以及中央限制定理,支撑每个ML评价度量和损失函数的概念. *

- 统计学是从数据中学习的科学. 你收集观察,总结, 并得出结论, 经常关于一些你无法直接测量的东西。

- 想象一下你想知道一个国家每个成年人的平均身高. 你无法衡量每个人,所以你测量一个样本,并用统计来对全体人口作出知情的猜测.

- 主要有两大分支:
    - ** 描述性统计**:你已有的汇总数据(平均数、图表)
    - ** 参考统计**:使用样本对较大群体提出索赔

- 统计数据的构成部分是**分配**,这是对数值如何分布的说明。其他一切,均分,测试,预测,从理解分布流出.

- ** 频率分布** 计算您数据中每个值(或数值范围)的频率。想想把考试分数分数分到垃圾桶中,并计算每个垃圾桶里有多少学生倒下. 结果是直方图.

- ** 概率分配** 以概率取代生数。与其"12名学生得分在70到80分之间",它表示"有0.24的概率在70到80分之间". 直方图条在数据连续时成为平滑曲线.

![作为直方图的频率分布与作为平滑曲线的概率分布](../images/distribution_types.svg)

- 左侧的直方图是根据你收集的实际数据构建的. 右侧的平滑曲线是一个数学模型来描述数据背后的规律. 一个是经验论,另一个是理论论.

- 为了在数学上处理分布问题,我们需要一种方法来分配结果的数字。这正是一个随机变量所做的。

- 一个随机变量是一个函数,它将实验的每个结果映射到一个真实的数字. 翻转一分硬币:结果为"头"或"尾",但随机可变$X$转换为$X(\text{heads}) = 1$财务报告和已审计财务报表$X(\text{tails}) = 0$。。。现在可以算算了

![随机可变映射结果(coin, die) 到数字行](../images/random_variable.svg)

- 一个**discrete ** 随机可变的值会取出一组可计数的值:10个翻转中头数,一死一活卷,一个小时后收到的电子邮件数.

- 一个**连续**随机变量可以在一个间隔中取出任何值:你准确的高度,直到下一班车到达的时间,中午的温度.

- 区别很重要,因为它改变了我们计算概率的方式。对于离散变量,我们进行汇总。对于连续变量,我们加以整合(回顾第3章的组成部分)。

- 对于一个离散的随机变量,**概率质量函数(PMF)**给出了每个具体值的概率:

$$P(X = x) = p(x), \quad \text{where } \sum_{x} p(x) = 1$$

- 对于一个连续的随机变量,**概率密度函数 (PDF) ** 给出了在一个范围内坠入的概率. 任何单一精确值的概率为零;只有间隔有正概率:

$$P(a \le X \le b) = \int_a^b f(x)\, dx, \quad \text{where } \int_{-\infty}^{\infty} f(x)\, dx = 1$$

- 既然我们可以为结果分配数字,最自然的问题是:我们平均期望什么价值?

- ** 估计**(或预期值)是所有可能数值的加权平均值,其中加权为概率。把它想成分布的"重心".

- 如果你翻出一个集市死了很多次, 你的平均卷会合到3.5。这是预期值,尽管你永远不能实际卷出3.5。

- 对于离散随机变量:

$$E[X] = \sum_{x} x \cdot p(x)$$

- 对于一个连续随机变量(使用第3章的组成部分):

$$E[X] = \int_{-\infty}^{\infty} x \cdot f(x)\, dx$$

- 举例来说,一个六面体的死亡$p(x) = 1/6$(单位:千美元)$x = 1, 2, 3, 4, 5, 6$.

$$E[X] = 1 \cdot \tfrac{1}{6} + 2 \cdot \tfrac{1}{6} + 3 \cdot \tfrac{1}{6} + 4 \cdot \tfrac{1}{6} + 5 \cdot \tfrac{1}{6} + 6 \cdot \tfrac{1}{6} = \frac{21}{6} = 3.5$$

- 期望是线性的,意思$E[aX + b] = aE[X] + b$。。。这种财产极为有用,经常出现在ML损失功能中.

- 期望告诉我们中心,但它没有说价值的分布。为了描述一个分布的全貌,我们需要**分秒**.

- 片刻就是对$X$。。。该$k$- 时间是:

$$\mu_k' = E[X^k]$$

- 初生时分($k = 1$) 仅是恶道:$\mu_1' = E[X] = \mu$.

- 原始瞬间从零度度量. 我们往往关心偏离恶行。该$k$- 第1项** 中点**

$$\mu_k = E[(X - \mu)^k]$$

- 第一个中心时刻总是零(在平均取消额上下显示). 第二个中心时刻是**变相**.

- 为了比较不同尺度的分布,我们通过除去标准偏差的适当功率,** 实现标准化**$\sigma$:

$$\tilde{\mu}_k = \frac{\mu_k}{\sigma^k}$$

- 每分秒都捕捉到分布形状的不同方面:

![铃声曲线附加了每分秒所捕获的:正(中心),差分(扩展),相克(不对称),克托斯(尾重)](../images/moments_shape.svg)

- ** 第1分(Mean)**:分布中心所在. 平衡点。
- ** 第2分(变化)**:平均值的分布如何。较大差异意味着更大的差异。
- ** 第3分(Skewness)**:分布是向左还是向右倾. 零相克指对称.
- ** 第4分 (Kurtosis)**:尾巴多重. 高克多斯症意味着更极端的外出者.

- 让我们在四个时刻努力建立具体的数据集:$X = \{2, 4, 4, 4, 5, 5, 7, 9\}$.

- ** 第1步:平均值**(第1起生地)

$$\mu = \frac{2 + 4 + 4 + 4 + 5 + 5 + 7 + 9}{8} = \frac{40}{8} = 5$$

- ** 第2步:差异**(第2个中心时刻)。将平均值从每个值平方减去:

$$\sigma^2 = \frac{(2{-}5)^2 + (4{-}5)^2 + (4{-}5)^2 + (4{-}5)^2 + (5{-}5)^2 + (5{-}5)^2 + (7{-}5)^2 + (9{-}5)^2}{8}$$

$$= \frac{9 + 1 + 1 + 1 + 0 + 0 + 4 + 16}{8} = \frac{32}{8} = 4$$

- 标准偏差**是$\sigma = \sqrt{4} = 2$.

- ** 第3步:滑动**(标准化的第3个中心时刻)。立方体偏移,平均,除以$\sigma^3$:

$$\tilde{\mu}_3 = \frac{1}{8} \cdot \frac{(-3)^3 + (-1)^3 + (-1)^3 + (-1)^3 + 0^3 + 0^3 + 2^3 + 4^3}{2^3}$$

$$= \frac{1}{8} \cdot \frac{-27 -1 -1 -1 + 0 + 0 + 8 + 64}{8} = \frac{42}{64} = 0.656$$

- 正滑指右尾更长,这有道理,因为9远高于正差.

- ** 第4步:库尔托西斯**(标准的第4个中心时刻)。将偏差提升到第四电源:

$$\tilde{\mu}_4 = \frac{1}{8} \cdot \frac{(-3)^4 + (-1)^4 + (-1)^4 + (-1)^4 + 0^4 + 0^4 + 2^4 + 4^4}{2^4}$$

$$= \frac{1}{8} \cdot \frac{81 + 1 + 1 + 1 + 0 + 0 + 16 + 256}{16} = \frac{356}{128} = 2.781$$

- 正常的分布有3克特氏(被称作"mesokurtic"). 我们的2.781值接近,表明尾巴大致正常. 数值高于3 ("去皮克")信号更重的尾;低于3 ("白克")信号更轻的尾. 某些公式报告**夸克多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多斯多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多尔多$-0.219$.

## 编程任务（使用 Colab 或 notebook)



1. 在面额为6有概率0.3且所有其他面额均匀分享所余概率的情况下,计算所装载的死因的预期值. 以相模出十万卷为验.
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

2. 计算所有四个瞬间(平均,差分,skewness,kurtosis)从工作示例中计算数据集,然后修改数据并观察每个瞬间的变化.
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

3. 并肩观望PMF和CDF,以获得一个公平的死亡卷. 尝试改变概率,看看形状如何变化.
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
