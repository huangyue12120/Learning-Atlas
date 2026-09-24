---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 03 - calculus/01. differential calculus.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 5026e325536c7c906a5f26aacae1af74d82ccd0b0c1dcc335a59bb5fa7e35b8f
status: reviewed
---
# 微分学

*微分学捕捉瞬时变化的速度。本文件涵盖了极限、导数、微分规则、链式法则（反向传播的基础）以及机器学习中常用的常见导数。*

- 在前几章中，我们学习了如何用向量表示数据并使用矩阵进行变换。但许多现实世界的现象并不是静止的。汽车加速、股票价格波动、神经网络损失随着权重更新而变化。**微积分**是描述变化的数学。

- 微积分提出两个问题：现在 something正在以多快的速度改变？（微分学）和它在一段时间内累积了多少？（积分学）。本节关注“多快”这个问题。

- 像你驾驶时看速度表一样，它读数为 60 km/h。这个数字不是整个旅程的平均速度；而是此刻的速度。微分学提供了计算这种瞬时变化率的工具。

- 但首先，请回顾一下直线方程：$y = mx + b$。

- 这是两个量之间最简单的关系。

    - $b$ 是 **y轴截距**，即线在 y 轴上的交点（当 $x = 0$ 增加时的起始值）。
    - $m$ 是 **斜率**，表示变化率：对于每增加 1 单位的 $x$，$y$ 变化为 $m$。
- 如果 $m = 3$，线上升迅速；如果 $m = 0$，线水平；如果 $m = -2$，线下降。

- 斜率计算为 $m = \frac{\Delta y}{\Delta x} = \frac{y_2 - y_1}{x_2 - x_1}$，即 $y$ 变化量与 $x$ 变化量的比率。

![直线方程：b是y截距，m是斜率（上坡除以下坡）](../images/line_equation.svg)


- 一旦你知道了 $m$ 和 $b$，你就可以根据任何 $x$ 计算出 $y$。

- 例如，如果 $m = 2$ 和 $b = 3$，则在 $x = 5$： $y = 2(5) + 3 = 13$。

- 两个参数完全决定了这条线，预测任何输出只是简单地代入。

- 直线的斜率在任何地方都相同。

- 这个想法适用于直线以外的任何函数。任何函数都是一个将输入映射到输出的规则，一旦你知道其公式（参数和形状），你就可以计算出任何输入并绘制结果。

- $y = x^2$给出抛物线，$y = \sin(x)$给出波形，$y = e^x$给出指数增长。每个公式定义一个特定的曲线，能够读作形状对于后续的所有内容至关重要。

- 对于一条直线，斜率在任何一点都相同。但大多数有趣的函数是弯曲的，因此斜率在不同点上变化。微积分为我们提供了一种方法来找到曲线上的任意一点的斜率。

- 我们还需要了解“极限”的概念。极限描述了当函数的输入越来越接近某个目标时，函数值会趋向于什么，但并不一定达到该目标。

$$\lim_{x \to a} f(x) = L$$
- 这意味着：当 $x$ 接近 $a$ 时，$f(x)$ 接近 $L$。这个函数不需要在 $x = a$ 精确等于 $L$。它只需要尽可能接近。

- 例如，比如 $f(x) = \frac{x^2 - 1}{x - 1}$。如果直接输入 $x = 1$，会得到 $\frac{0}{0}$，这个值是未定义的。

- 但尝试接近1的值：$f(0.9) = 1.9$，$f(0.99) = 1.99$，$f(1.01) = 2.01$。输出明显向2靠近。

- 数学上，我们可以看到原因：将分子因式分解为 $(x-1)(x+1)$，消去 $(x-1)$ 项，我们得到 $f(x) = x + 1$ 对于所有 $x \neq 1$。因此，作为 $x \to 1$，$f(x) \to 2$。

- 函数在 $x = 1$ 处存在一个洞，但仍然有限制。

- 限制是微积分中一切的基础。

- 函数 $f(x)$ 在点 $x = a$ 处的导数测量的是瞬时变化率。几何上，它是曲线在该点处切线的斜率。

![导数是曲线在某点切线的斜率](../images/tangent_line.svg)


- 计算这个斜率，我们从曲线上的两个点开始，并计算通过它们的直线（一个“切线”）。然后我们将第二个点向第一个点移动得越来越近，并观察切线的斜率如何变化。这就是“差商”：

$$f'(a) = \lim_{h \to 0} \frac{f(a + h) - f(a)}{h}$$
![h变小时，割线接近切线](../images/difference_quotient.svg)


- 分子 $f(a+h) - f(a)$ 是输出的变化量。分母 $h$ 是输入的变化量。它们的比率是微小区间内的平均变化率。作为 $h \to 0$，这个平均值成为瞬时变化率。

- 例如，如 $f(x) = x^2$。在 $x = 3$：

$$f'(3) = \lim_{h \to 0} \frac{(3+h)^2 - 9}{h} = \lim_{h \to 0} \frac{9 + 6h + h^2 - 9}{h} = \lim_{h \to 0} (6 + h) = 6$$
- 在 $x = 3$ 处，函数 $x^2$ 的输出每增加一个单位，输入也相应增加 6 单位。

- 一个函数在某一点可微分，如果这个极限存在。这需要该函数在该点连续（无跳跃），光滑（无尖角）且在该点周围定义。

- 如果你可以用笔平滑地画出曲线而没有中断或尖角，那么很可能在那里可微分。

- 计算函数的导数时，每次都使用极限定义会很繁琐。幸运的是，有一些规则可以让我们几乎快速地对任何函数进行求导。

- **常数规则**：常数的导数为零。如果 $f(x) = 5$，那么 $f'(x) = 0$。一条水平线的斜率为零。

- **幂法则**：微分的基石。将指数向下移动并减少一个:

$$\frac{d}{dx} x^n = n x^{n-1}$$
- 例如：$\frac{d}{dx} x^3 = 3x^2$。立方变为二次。这适用于任何实数指数，包括负数和分数：$\frac{d}{dx} x^{-1} = -x^{-2}$和$\frac{d}{dx} \sqrt{x} = \frac{d}{dx} x^{1/2} = \frac{1}{2}x^{-1/2}$.

- **和差法则**：逐项求导。

$$\frac{d}{dx}[f(x) \pm g(x)] = f'(x) \pm g'(x)$$
- **乘积法则**：当两个函数相乘时，其导数不是简单地是这两个函数的乘积。而是：

$$\frac{d}{dx}[f(x) \cdot g(x)] = f'(x)g(x) + f(x)g'(x)$$
- 将其视为“第一个函数的变化率乘以第二个，加上第一个函数乘以第二个函数的变化率。”例如，$\frac{d}{dx}[x^2 \sin x] = 2x \sin x + x^2 \cos x$。

- **商法则**：对于两个函数的比率：

$$\frac{d}{dx}\left[\frac{f(x)}{g(x)}\right] = \frac{f'(x)g(x) - f(x)g'(x)}{[g(x)]^2}$$
- 一个有用的口诀：“低乘高减高乘低，除以下面的平方。”

- **链式法则**：在ML中最重要的规则。当函数被嵌套（一个在另一个内部）时，导数是沿着链的导数之积：

$$\frac{d}{dx} f(g(x)) = f'(g(x)) \cdot g'(x)$$
- 将它想象成剥洋葱。首先，区分外层函数（保持内层函数不变），然后乘以内层函数的导数。

![链式法则：对外层求导，乘以内层的导数](../images/chain_rule.svg)


- 例如，$\frac{d}{dx} (3x + 1)^5 = 5(3x+1)^4 \cdot 3 = 15(3x+1)^4$。外层函数是$(\cdot)^5$，内层函数是$3x+1$。

- 链式法则在神经网络的 **反向传播** 中是基础。深度网络是由多个函数组成的长链。为了计算每个权重如何影响损失，我们从输出层逐层向输入应用链式法则，并在每一步乘以局部导数。

- 以下是最常见的导数，它们都可以通过极限定义推导出来，但熟记这些导数可以节省时间：

| 函数 | 导数 | 说明 |
|---|---|---| $e^x$ | $e^x$ | 是其自身的导数的唯一函数 |
| $a^x$ | $a^x \ln a$ | 一般化了指数函数 |
| $\ln x$ | $\frac{1}{x}$ | 自然对数 |
| $\log_a x$ | $\frac{1}{x \ln a}$ | 通用对数函数 |
| $\sin x$ | $\cos x$ | |
| $\cos x$ | $-\sin x$ | 注意负号 |
| $\tan x$ | $\sec^2 x$ | |

- 指数函数 $e^x$ 特别引人注目：它是唯一一个等于其导数的函数。这就是为什么 $e$ 出现在 ML 中，从 softmax 激活到概率分布等地方 everywhere。

- **洛必达法则** 处理产生不定式形式（如 $\frac{0}{0}$ 或 $\frac{\infty}{\infty}$）的极限。当直接代入给出这些形式时，你可以分别对分子和分母求导，并再次尝试极限：

$$\lim_{x \to a} \frac{f(x)}{g(x)} = \lim_{x \to a} \frac{f'(x)}{g'(x)}$$
- 条件： $f$ 和 $g$ 在 $a$ 处必须可微，且 $g'(x) \neq 0$ 在 $a$ 处（除了可能的 $a$ 本身）也必须可微。原始极限必须给出不定式形式。

- 例如： $\lim_{x \to 0} \frac{\sin x}{x}$。直接代入得到 $\frac{0}{0}$。应用洛必达法则： $\lim_{x \to 0} \frac{\cos x}{1} = 1$。这个极限非常基础，它在信号处理和傅里叶分析中出现。

- 你可以重复应用规则，直到结果仍然不确定。例如，$\lim_{x \to 0} \frac{1 - \cos x}{x^2}$会变成$\frac{0}{0}$。第一次应用：$\lim_{x \to 0} \frac{\sin x}{2x}$，仍然$\frac{0}{0}$。第二次应用：$\lim_{x \to 0} \frac{\cos x}{2} = \frac{1}{2}$。

- 如果两个函数可微，它们的和、差、积、复合以及商（当分母不为零时）也是可微的。这就是为什么我们可以自信地对由简单部分构建的复杂表达式进行求导的原因。

## 编程任务（使用 Colab 或笔记本）

1. 画出常见的函数。将 $x^2$、$\sin(x)$ 和 $e^x$ 一起绘制，以直观地理解不同公式产生的形状。尝试改变参数（例如 $2x^2$ 和 $\sin(2x)$），观察曲线如何变化。
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt

x = jnp.linspace(-3, 3, 300)

fig, axes = plt.subplots(1, 3, figsize=(12, 3))
axes[0].plot(x, x**2, color="#e74c3c")
axes[0].set_title("x²  (parabola)")
axes[1].plot(x, jnp.sin(x), color="#3498db")
axes[1].set_title("sin(x)  (wave)")
axes[2].plot(x, jnp.exp(x), color="#27ae60")
axes[2].set_title("eˣ  (exponential)")
for ax in axes:
    ax.axhline(0, color="gray", linewidth=0.5)
    ax.axvline(0, color="gray", linewidth=0.5)
plt.tight_layout()
plt.show()
```

2. 使用JAX的自动微分功能计算$f(x) = x^3 - 2x + 1$在多个点上的导数。与分析导数$f'(x) = 3x^2 - 2$进行比较。
```python
import jax
import jax.numpy as jnp

f = lambda x: x**3 - 2*x + 1
df = jax.grad(f)

for x in [0.0, 1.0, 2.0, -1.0]:
    print(f"x={x:5.1f}  autodiff: {df(x):.4f}  analytical: {3*x**2 - 2:.4f}")
```

2. 通过数值方法验证链式法则。定义 $f(x) = \sin(x^2)$，计算其导数 via `jax.grad`，并与解析结果 $2x\cos(x^2)$ 进行比较。
```python
import jax
import jax.numpy as jnp

f = lambda x: jnp.sin(x**2)
df = jax.grad(f)

for x in [0.5, 1.0, 2.0]:
    auto = df(x)
    analytical = 2*x * jnp.cos(x**2)
    print(f"x={x:.1f}  autodiff: {auto:.6f}  analytical: {analytical:.6f}")
```

3. 可视化导数。在同一张图上绘制 $f(x) = x^3 - 3x$ 和其导数 $f'(x) = 3x^2 - 3$。注意 $f'(x) = 0$ 对应 $f$ 的峰值和谷值。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

f = lambda x: x**3 - 3*x
# jax.grad works on scalars; jax.vmap vectorises it to operate on an array of inputs at once
df = jax.vmap(jax.grad(f))

x = jnp.linspace(-2.5, 2.5, 200)
plt.plot(x, jax.vmap(f)(x), label="f(x)")
plt.plot(x, df(x), label="f'(x)", linestyle="--")
plt.axhline(0, color="gray", linewidth=0.5)
plt.legend()
plt.title("A function and its derivative")
plt.show()
```
