---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 03 - calculus/02. integral calculus.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 1469d2910133e25ad64b9eb5b90311d52fabb89ec1d6b6c7d2c8d2262bb25af9
status: reviewed
---
# 积分学

*积分把局部变化累积为面积、总量和概率。本篇从定积分与微积分基本定理出发，连接数值积分、期望以及机器学习中的损失和累计量。*


* 综合微积分每隔一段时间积累出数量,使当地比率回落为总数。该文件涵盖明确和无限期的组成部分、计算的基本定理、集成技术以及ML的概率密度和预期值应用。

- 分化告诉我们一个点的变化速度. 融合则相反:它积累出许多小块来计算一个总数.

- 如果衍生词回答"多快?",整体回答"多少".

- 考虑融合的最简单方式是作为曲线下的**区域**. 如果您绘制函数$f(x)$并遮蔽曲线和x轴之间的区域$x = a$改为$x = b$,组成部分给出了该地的已签字区域。

![组合通过相接的细长矩来计算曲线下的区域](../images/area_under_curve.svg)

- 为什么"签名"? x轴以上的地区贡献正区,下行地区贡献正区. 这在物理上是有道理的:$f(x)$表示速度,组成部分给出净位移(向前倒数),而不是总相距.

- 为了计算这个区域,想象一下把这个区域切成$n$细长的垂直矩形,每个宽度$\Delta x$。。。每个矩形的高度是该片中某一点的函数值. 总结一下:

$$\text{Area} \approx \sum_{i=1}^{n} f(x_i^\ast) \, \Delta x$$

- 当我们使矩形变薄而变薄时(在平地上),$n \to \infty$, $\Delta x \to 0$),总和变为精确. 这一限制程序界定了**固定的组成部分**:

$$\int_a^b f(x)\, dx = \lim_{n \to \infty} \sum_{i=1}^{n} f(x_i^\ast) \, \Delta x$$

- 该$\int$符号是"sum"的缩写"S". 该$dx$提醒我们 我们沿着X轴 将无穷的薄片相接

- ** 无限期的组成部分**(或** 反卷积**)是一种功能。$F(x)$其衍生物是$f(x)$。。。我们写道:

$$\int f(x)\, dx = F(x) + C$$

- 该$+ C$是**一体化的连续性**。由于任何常数的衍生物为零,因此有无限多的抗衍生物只因常数而有差异. 举例来说,$\int 2x\, dx = x^2 + C$,因为衍生物$x^2 + 7$或 为$x^2 - 3$还在$2x$.

- ** Calculus的基本定理**是连接分化和融合的桥梁. 它有两个部分:

- ** 第1编**:如果$F(x)$是一种抗减退剂$f(x)$,那么确定的组成部分等于$F$在终点:

$$\int_a^b f(x)\, dx = F(b) - F(a)$$

- 这是非常实际的。与其计算一个金额的限度(这很困难),我们发现一种抗衍生剂,并在两个点上加以评价(通常很容易).

- ** 第2部分**:如果我们界定$F(x) = \int_a^x f(t)\, dt$,则$F'(x) = f(x)$。。。分化和融合是反向操作,它们相互抵消.

- 例如计算$\int_1^3 x^2\, dx$: 对$x^2$实值$\frac{x^3}{3}$。。。这么说$\int_1^3 x^2\, dx = \frac{27}{3} - \frac{1}{3} = \frac{26}{3} \approx 8.67$.

- 与区别有规则一样,融合也有相应的规则来扭转这种差异:

|Function|Integral|Condition|
|---|---|---|
|$x^n$|$\frac{x^{n+1}}{n+1} + C$|$n \neq -1$|
|$\frac{1}{x}$|$\ln\|x\| + C$| |
|$e^x$|$e^x + C$| |
|$a^x$|$\frac{a^x}{\ln a} + C$| |
|$\sin x$|$-\cos x + C$| |
|$\cos x$|$\sin x + C$| |
|$k$ (constant)|$kx + C$| |

- ** 和/歧义规则** 继续适用:$\int [f(x) \pm g(x)]\, dx = \int f(x)\, dx \pm \int g(x)\, dx$。。。常数可以抽出:$\int k\, f(x)\, dx = k \int f(x)\, dx$.

- 当一个功能过于复杂,无法直接整合时,我们有简化它的技术.

- **u-取而代之**是链式规则倒置. 如果发现复合函数$f(g(x))$乘号为$g'(x)$替换$u = g(x)$这样$du = g'(x)\, dx$,整体简化。

- 例如:$\int 2x \cos(x^2)\, dx$。。。让$u = x^2$,这样$du = 2x\, dx$。。。组成部分变成$\int \cos(u)\, du = \sin(u) + C = \sin(x^2) + C$.

- ** 按部分合并**是产品规则的倒数。如果整数是两个函数的产物:

$$\int u\, dv = uv - \int v\, du$$

- 选择$u$财务报告和已审计财务报表$dv$战略,使剩余的整体$\int v\, du$比原作简单 用于选择的常用元音$u$a 表示数为**LIATE**:对数、倒三角、代数、三角、指向(取出)$u$(从先前的类别)

- 例如:$\int x\, e^x\, dx$。。。让$u = x$(代数)和$dv = e^x\, dx$。。。礛$du = dx$财务报告和已审计财务报表$v = e^x$。。。这么说吧:$\int x\, e^x\, dx = x\, e^x - \int e^x\, dx = x\, e^x - e^x + C = e^x(x - 1) + C$.

- 在ML中,集成出现在概率理论(通过集成密度函数计算概率),预期值(加权平均值相对于连续分布),以及ROC曲线下的区域计算. 虽然我们在实践中很少采用手工方式进行整合,但理解整合意味着什么有助于解释这些数量。

## 编程任务（使用 Colab 或 notebook）



1. 数值近似$\int_0^1 x^2\, dx$使用一个Riemann和 与越来越多的矩形。和准确的答案比较$\frac{1}{3}$.
```python
import jax.numpy as jnp

for n in [10, 100, 1000, 10000]:
    x = jnp.linspace(0, 1, n, endpoint=False)
    dx = 1.0 / n
    area = jnp.sum(x**2 * dx)
    print(f"n={n:5d}  approx: {area:.6f}  exact: {1/3:.6f}")
```

2. 数字验证计算的基本定理。定义$F(x) = \int_0^x t^2\, dt = \frac{x^3}{3}$并检查其衍生物(通过`jax.grad`等于()$x^2$.
```python
import jax
import jax.numpy as jnp

F = lambda x: x**3 / 3
dF = jax.grad(F)

for x in [0.5, 1.0, 2.0, 3.0]:
    print(f"x={x:.1f}  F'(x)={dF(x):.4f}  x^2={x**2:.4f}")
```

3. 视线区域$f(x) = \sin(x)$从$0$改为$\pi$。。。使用`plt.fill_between`用里曼的和数来计算
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt

x = jnp.linspace(0, jnp.pi, 500)
y = jnp.sin(x)

plt.plot(x, y, color="purple", linewidth=2)
plt.fill_between(x, y, alpha=0.2, color="purple")
plt.title(f"Area = {jnp.sum(jnp.sin(x) * (jnp.pi / 500)):.4f}  (exact: 2.0)")
plt.show()
```
