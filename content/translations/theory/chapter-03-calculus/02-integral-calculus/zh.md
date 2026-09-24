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

*积分学通过区间累积量，将局部速率转换为总和。本文件涵盖了定积分和不定积分、微积分基本定理、积分技巧以及在机器学习中应用概率密度和期望值的领域。*

- 微分告诉我们某个点的速度变化率。积分则相反：它将许多极小的部分累加起来，计算出总和。

- 如果导数回答“如何快？”，那么积分回答“如何多？”

- 积分的最简单理解是曲线下的**面积**。如果你绘制一个函数 $f(x)$ 并在 x 轴上从 $x = a$ 到 $x = b$ 区域内填充阴影，积分给出该区域的有符号面积。

![积分计算曲线下的面积通过累加细长矩形](../images/area_under_curve.svg)


- **为什么“有符号”？**高于 x 轴的部分贡献正面积，低于 x 轴的部分贡献负面积。这在物理上是有意义的：如果 $f(x)$ 表示速度，积分给出净位移（向前减去向后），而不是总距离。

- 计算这个面积时，想象将区域切成 $n$ 精细的垂直矩形，每个矩形宽度为 $\Delta x$。矩形的高度是该切片中某个点的函数值。将它们加起来：

$$\text{Area} \approx \sum_{i=1}^{n} f(x_i^\ast) \, \Delta x$$
- 当我们使矩形越来越薄（$n \to \infty$、$\Delta x \to 0$），和变得精确。这个极限过程定义了**定积分**：

$$\int_a^b f(x)\, dx = \lim_{n \to \infty} \sum_{i=1}^{n} f(x_i^\ast) \, \Delta x$$
- $\int$ 符号是一个 elongated "S" 表示“和”。$dx$ 提醒我们，我们在 x 轴上沿切片无限微小地进行求和。

- **不定积分**（或**原函数**）是一个函数 $F(x)$，其导数为 $f(x)$。我们写：

$$\int f(x)\, dx = F(x) + C$$
- $+ C$ 是**常数积分**。由于任何常数的导数为零，有无穷多个原函数只相差一个常数。例如，$\int 2x\, dx = x^2 + C$，因为 $x^2 + 7$ 或 $x^2 - 3$ 的导数仍然为 $2x$。

- **微积分基本定理**是连接微分和积分的桥梁。它有两部分：

- **第一部分**：如果 $F(x)$ 是 $f(x)$ 的原函数，那么定积分等于在端点处 $F$ 的差值：

$$\int_a^b f(x)\, dx = F(b) - F(a)$$
- 这非常实用。而不是计算极限和（很难），我们找到一个原函数并评估它在两个点（通常容易）。

- **第二部分**：如果我们定义 $F(x) = \int_a^x f(t)\, dt$，那么 $F'(x) = f(x)$。微分和积分是逆操作，它们相互抵消。

- 例如，要计算 $\int_1^3 x^2\, dx$：$x^2$ 的原函数是 $\frac{x^3}{3}$。因此 $\int_1^3 x^2\, dx = \frac{27}{3} - \frac{1}{3} = \frac{26}{3} \approx 8.67$.

- 就像微分有规则一样，积分也有相应的规则，它们逆向它们:

| 函数 | 积分 | 条件 |
|---|---|---| $x^n$ | $\frac{x^{n+1}}{n+1} + C$ | $n \neq -1$ |
| $\frac{1}{x}$ | $\ln\|x\| + C$ |
| $e^x$ | $e^x + C$ | |
| $a^x$ | $\frac{a^x}{\ln a} + C$ |
| $\sin x$ | $-\cos x + C$ |
| $\cos x$ | $\sin x + C$ |
| $k$（常量） | $kx + C$ |

- 向量加法/减法规则同样适用：$\int [f(x) \pm g(x)]\, dx = \int f(x)\, dx \pm \int g(x)\, dx$. 常数可以提取出来：$\int k\, f(x)\, dx = k \int f(x)\, dx$.

- 当一个函数过于复杂无法直接积分时，我们有简化它的技术方法。

- **u-substitution** 是链式法则的逆向操作。如果你发现一个复合函数 $f(g(x))$ 乘以 $g'(x)$，将 $u = g(x)$ 替换为 $du = g'(x)\, dx$，积分会简化。

- 例如：$\int 2x \cos(x^2)\, dx$。然后 $u = x^2$，接着 $du = 2x\, dx$。积分变为 $\int \cos(u)\, du = \sin(u) + C = \sin(x^2) + C$。

- **分部积分法** 是微分法则的逆向。如果被积函数是两个函数的乘积：

$$\int u\, dv = uv - \int v\, du$$
- 选择 $u$ 和 $dv$ 战略上，以确保剩余整数 $\int v\, du$ 更简单。选择常用口诀。 $u$ 是 LIATE：对数、反三角、代数、三角、指数（选择） $u$ 从早期类别中。

- 例如：$\int x\, e^x\, dx$。让 $u = x$（代数）和 $dv = e^x\, dx$。那么 $du = dx$ 和 $v = e^x$。所以：$\int x\, e^x\, dx = x\, e^x - \int e^x\, dx = x\, e^x - e^x + C = e^x(x - 1) + C$.

- 在 ML 中，积分在概率论中出现（通过计算密度函数的概率），在期望值（连续分布的加权平均）中出现，并用于计算 ROC 曲线下的面积。虽然我们在实践中很少手动进行积分，但理解积分的意义有助于解释这些量的含义.

## 编程任务（使用 CoLab 或笔记本）

1. 使用 Riemann 和法近似 $\int_0^1 x^2\, dx$。与精确答案 $\frac{1}{3}$ 进行比较.
```python
import jax.numpy as jnp

for n in [10, 100, 1000, 10000]:
    x = jnp.linspace(0, 1, n, endpoint=False)
    dx = 1.0 / n
    area = jnp.sum(x**2 * dx)
    print(f"n={n:5d}  approx: {area:.6f}  exact: {1/3:.6f}")
```

2. 数值验证基本定理的积分。定义 $F(x) = \int_0^x t^2\, dt = \frac{x^3}{3}$ 并检查其导数（通过 `jax.grad` 计算）是否等于 $x^2$.
```python
import jax
import jax.numpy as jnp

F = lambda x: x**3 / 3
dF = jax.grad(F)

for x in [0.5, 1.0, 2.0, 3.0]:
    print(f"x={x:.1f}  F'(x)={dF(x):.4f}  x^2={x**2:.4f}")
```

3. 可视化 $f(x) = \sin(x)$ 从 $0$ 到 $\pi$ 的面积。使用 `plt.fill_between` 来着色该区域，并通过 Riemann 和法计算其数值.
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
