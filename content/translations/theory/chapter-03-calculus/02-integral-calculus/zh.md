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

*积分学把局部变化率累积成区间总量。本文件介绍定积分、不定积分、微积分基本定理、积分方法，以及积分在机器学习概率密度和期望值中的应用。*

- 导数描述函数在某点的瞬时变化率。积分则把许多微小量累加起来，求出区间总量。

- 如果导数回答“变化有多快？”，那么积分回答“总量有多少？”。

- 积分最直观的解释是曲线下的**有符号面积**。绘制函数 $f(x)$，再填充曲线与 x 轴之间从 $x=a$ 到 $x=b$ 的区域，定积分就给出该区域的有符号面积。

![积分通过累加窄矩形计算曲线下的面积](../images/area_under_curve.svg)


- **为什么“有符号”？**高于 x 轴的部分贡献正面积，低于 x 轴的部分贡献负面积。这在物理上是有意义的：如果 $f(x)$ 表示速度，积分给出净位移（向前减去向后），而不是总距离。

- 计算面积时，可以把区域切成 $n$ 个窄的垂直矩形，每个矩形的宽度为 $\Delta x$，高度取自该小区间内某一点的函数值。把这些矩形的面积相加：

$$\text{面积} \approx \sum_{i=1}^{n} f(x_i^\ast) \, \Delta x$$
- 当我们使矩形越来越薄（$n \to \infty$、$\Delta x \to 0$），和变得精确。这个极限过程定义了**定积分**：

$$\int_a^b f(x)\, dx = \lim_{n \to \infty} \sum_{i=1}^{n} f(x_i^\ast) \, \Delta x$$
- $\int$ 符号是一个拉长的 “S”，表示“求和”。$dx$ 提醒我们，我们沿着 x 轴对无限薄的切片进行求和。

- 若 $F(x)$ 的导数为 $f(x)$，就称 $F$ 为 $f$ 的**原函数**。所有原函数之间只差一个常数；不定积分表示这族原函数：

$$\int f(x)\, dx = F(x) + C$$
- $+ C$ 是**积分常数**。由于任何常数的导数为零，有无穷多个原函数只相差一个常数。例如，$\int 2x\, dx = x^2 + C$，因为 $x^2 + 7$ 或 $x^2 - 3$ 的导数仍然为 $2x$。

- **微积分基本定理**是连接微分和积分的桥梁。它有两部分：

- **第一部分**：如果 $F(x)$ 是 $f(x)$ 的原函数，那么定积分等于在端点处 $F$ 的差值：

$$\int_a^b f(x)\, dx = F(b) - F(a)$$
- 这非常实用：我们不必计算很难的和的极限，只需找到一个原函数并在两个端点求值（通常很容易）。

- **第二部分**：定义 $F(x) = \int_a^x f(t)\, dt$。当 $f$ 在 $x$ 处连续时，$F'(x) = f(x)$。在适当条件下，求导与积分互为逆运算。**编者注：**原文省略了此处的连续性条件。

- 例如，要计算 $\int_1^3 x^2\, dx$：$x^2$ 的原函数是 $\frac{x^3}{3}$。因此 $\int_1^3 x^2\, dx = \frac{27}{3} - \frac{1}{3} = \frac{26}{3} \approx 8.67$.

- 就像微分有规则一样，积分也有相应的逆运算规则：

| 函数 | 积分 | 条件 |
|---|---|---|
| $x^n$ | $\frac{x^{n+1}}{n+1} + C$ | $n \neq -1$，且 $x^n$ 有定义 |
| $\frac{1}{x}$ | $\ln\lvert x\rvert + C$ | $x \neq 0$ |
| $e^x$ | $e^x + C$ | — |
| $a^x$ | $\frac{a^x}{\ln a} + C$ | $a>0$ 且 $a\neq1$ |
| $\sin x$ | $-\cos x + C$ | — |
| $\cos x$ | $\sin x + C$ | — |
| $k$（常量） | $kx + C$ | — |

- 和差规则同样适用：$\int [f(x) \pm g(x)]\, dx = \int f(x)\, dx \pm \int g(x)\, dx$。常数可以提取出来：$\int k\, f(x)\, dx = k \int f(x)\, dx$。

- 当一个函数过于复杂无法直接积分时，我们有简化它的技术方法。

- **u 代换**是链式法则的逆运算。如果你发现一个复合函数 $f(g(x))$ 乘以 $g'(x)$，就令 $u = g(x)$，于是 $du = g'(x)\, dx$，积分会简化。

- 例如：$\int 2x \cos(x^2)\, dx$。令 $u = x^2$，则 $du = 2x\, dx$。积分变为 $\int \cos(u)\, du = \sin(u) + C = \sin(x^2) + C$。

- **分部积分法** 是微分法则的逆向。如果被积函数是两个函数的乘积：

$$\int u\, dv = uv - \int v\, du$$
- 有策略地选择 $u$ 和 $dv$，确保剩余积分 $\int v\, du$ 比原积分更简单。选择 $u$ 的常用口诀是 **LIATE**：对数函数（Logarithmic）、反三角函数（Inverse trig）、代数函数（Algebraic）、三角函数（Trigonometric）、指数函数（Exponential），优先从排列靠前的类别中选择。

- 例如：$\int x\, e^x\, dx$。让 $u = x$（代数）和 $dv = e^x\, dx$。那么 $du = dx$ 和 $v = e^x$。所以：$\int x\, e^x\, dx = x\, e^x - \int e^x\, dx = x\, e^x - e^x + C = e^x(x - 1) + C$.

- 在机器学习中，积分用于计算概率密度对应的概率、连续分布的期望值和 ROC 曲线下面积。虽然实践中很少手工求积分，理解积分仍有助于解释这些量。

## 编程任务（使用 Colab 或笔记本）

1. 用黎曼和近似计算 $\int_0^1 x^2\, dx$，并与精确值 $\frac{1}{3}$ 比较。
```python
import jax.numpy as jnp

for n in [10, 100, 1000, 10000]:
    x = jnp.linspace(0, 1, n, endpoint=False)
    dx = 1.0 / n
    area = jnp.sum(x**2 * dx)
    print(f"n={n:5d}  approx: {area:.6f}  exact: {1/3:.6f}")
```

2. 用数值方法验证微积分基本定理。定义 $F(x) = \int_0^x t^2\, dt = \frac{x^3}{3}$，再用 `jax.grad` 计算 $F'(x)$，检查结果是否等于 $x^2$。
```python
import jax
import jax.numpy as jnp

F = lambda x: x**3 / 3
dF = jax.grad(F)

for x in [0.5, 1.0, 2.0, 3.0]:
    print(f"x={x:.1f}  F'(x)={dF(x):.4f}  x^2={x**2:.4f}")
```

3. 绘制 $f(x) = \sin(x)$ 在 $0$ 到 $\pi$ 之间的曲线，用 `plt.fill_between` 填充曲线下方区域，再用黎曼和估算面积。
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
