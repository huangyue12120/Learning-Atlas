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

*微分学研究瞬时变化率。本文件介绍极限、导数、求导法则、链式法则（反向传播的基础）和机器学习中常用的导数公式。*

- 在前几章中，我们学习了如何用向量表示数据并使用矩阵进行变换。但许多现实世界的现象并不是静止的。汽车加速、股票价格波动、神经网络损失随着权重更新而变化。**微积分**是描述变化的数学。

- 微积分提出两个问题：现在变化得有多快？（微分学）以及一段时间内累积了多少？（积分学）。本节关注“有多快”这个问题。

- 像你驾驶时看速度表一样，它读数为 60 km/h。这个数字不是整个旅程的平均速度；而是此刻的速度。微分学提供了计算这种瞬时变化率的工具。

- 但首先，请回顾一下直线方程：$y = mx + b$。

- 这是两个量之间最简单的关系。

    - $b$ 是 **y 轴截距**，即直线与 y 轴的交点（$x=0$ 时的起始值）。
    - $m$ 是 **斜率**，表示变化率：对于每增加 1 单位的 $x$，$y$ 变化为 $m$。
- 如果 $m = 3$，线上升迅速；如果 $m = 0$，线水平；如果 $m = -2$，线下降。

- 斜率计算为 $m = \frac{\Delta y}{\Delta x} = \frac{y_2 - y_1}{x_2 - x_1}$，即 $y$ 变化量与 $x$ 变化量的比率。

![直线方程：b 是 y 轴截距，m 是斜率（纵向变化量除以横向变化量）](../images/line_equation.svg)


- 一旦你知道了 $m$ 和 $b$，你就可以根据任何 $x$ 计算出 $y$。

- 例如，如果 $m = 2$ 和 $b = 3$，则在 $x = 5$： $y = 2(5) + 3 = 13$。

- 两个参数完全决定了这条线，预测任何输出只是简单地代入。

- 这个想法适用于直线以外的任何函数。任何函数都是一个将输入映射到输出的规则，一旦你知道其公式（参数和形状），你就可以计算出任何输入并绘制结果。

- $y = x^2$ 给出抛物线，$y = \sin(x)$ 给出波形，$y = e^x$ 给出指数增长。每个公式都定义了一条特定的曲线；理解这些公式所表达的形状，对于后续内容至关重要。

- 对于一条直线，斜率在任何一点都相同。但大多数有趣的函数是弯曲的，因此斜率在不同点上变化。微积分为我们提供了一种方法来找到曲线上的任意一点的斜率。

- 我们还需要了解“极限”的概念。极限描述了当函数的输入越来越接近某个目标时，函数值会趋向于什么，但并不一定达到该目标。

$$\lim_{x \to a} f(x) = L$$
- 这意味着：当 $x$ 接近 $a$ 时，$f(x)$ 接近 $L$。这个函数不需要在 $x = a$ 精确等于 $L$。它只需要尽可能接近。

- 例如，$f(x) = \frac{x^2 - 1}{x - 1}$。如果直接代入 $x = 1$，会得到未定义的 $\frac{0}{0}$。

- 试取接近 1 的数值：$f(0.9) = 1.9$，$f(0.99) = 1.99$，$f(1.01) = 2.01$。函数值逐渐接近 2。

- 将分子因式分解为 $(x-1)(x+1)$ 并约去 $(x-1)$ 后，对所有 $x \neq 1$ 都有 $f(x) = x + 1$。因此，当 $x$ 趋近于 1 时，$f(x)$ 趋近于 2。

- 函数在 $x = 1$ 处存在一个洞，但极限仍然存在。

- 微积分中的许多重要结论都建立在极限之上。

- 函数 $f(x)$ 在点 $x = a$ 处的导数测量的是瞬时变化率。几何上，它是曲线在该点处切线的斜率。

![导数是曲线在某点切线的斜率](../images/tangent_line.svg)


- 要计算曲线上某点的斜率，可以先取曲线上两点，计算过这两点的直线（**割线**）的斜率；再让第二点逐渐靠近第一点，观察割线斜率的极限。这就是**差商**：

$$f'(a) = \lim_{h \to 0} \frac{f(a + h) - f(a)}{h}$$
![h变小时，割线接近切线](../images/difference_quotient.svg)


- 分子 $f(a+h) - f(a)$ 是输出的变化量，分母 $h$ 是输入的变化量。两者之比表示微小区间内的平均变化率。当 $h \to 0$ 时，平均变化率趋于瞬时变化率。

- 例如，如 $f(x) = x^2$。在 $x = 3$：

$$f'(3) = \lim_{h \to 0} \frac{(3+h)^2 - 9}{h} = \lim_{h \to 0} \frac{9 + 6h + h^2 - 9}{h} = \lim_{h \to 0} (6 + h) = 6$$
- 在 $x = 3$ 处，输入每增加 1 个单位，函数 $x^2$ 的输出约增加 6 个单位。

- 如果差商极限存在，函数就在该点可微。此时函数在该点连续，并且在该点附近有定义。该点若有尖角，通常不可微。**编者注：**可微不要求函数在整个邻域内处处光滑。

- 如果你可以用笔平滑地画出曲线而没有中断或尖角，那么很可能在那里可微分。

- 计算函数的导数时，每次都使用极限定义会很繁琐。幸运的是，有一些规则可以让我们几乎快速地对任何函数进行求导。

- **常数规则**：常数的导数为零。如果 $f(x) = 5$，那么 $f'(x) = 0$。一条水平线的斜率为零。

- **幂法则**：微分的基石。将指数向下移动并减少一个:

$$\frac{d}{dx} x^n = n x^{n-1}$$
- 例如：$\frac{d}{dx} x^3 = 3x^2$，三次幂求导后成为二次式。这些公式在函数有定义且可微的区间内成立；指数可以是负数或分数：$\frac{d}{dx} x^{-1} = -x^{-2}$，$\frac{d}{dx} \sqrt{x} = \frac{d}{dx} x^{1/2} = \frac{1}{2}x^{-1/2}$.

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
- 先对外层函数求导，同时保留内层表达式；再乘以内层函数的导数。

![链式法则：对外层求导，乘以内层的导数](../images/chain_rule.svg)


- 例如，$\frac{d}{dx} (3x + 1)^5 = 5(3x+1)^4 \cdot 3 = 15(3x+1)^4$。外层函数是$(\cdot)^5$，内层函数是$3x+1$。

- 链式法则在神经网络的 **反向传播** 中是基础。深度网络是由多个函数组成的长链。为了计算每个权重如何影响损失，我们从输出层逐层向输入应用链式法则，并在每一步乘以局部导数。

- 以下是最常见的导数，它们都可以通过极限定义推导出来，但熟记这些导数可以节省时间：

| 函数 | 导数 | 说明 |
|---|---|---|
| $e^x$ | $e^x$ | 导数等于自身 |
| $a^x$ | $a^x \ln a$ | 指数函数的一般形式（$a>0$） |
| $\ln x$ | $\frac{1}{x}$ | 自然对数 |
| $\log_a x$ | $\frac{1}{x \ln a}$ | 以 $a$ 为底的对数（$a>0$ 且 $a\neq1$，$x>0$） |
| $\sin x$ | $\cos x$ | |
| $\cos x$ | $-\sin x$ | 注意负号 |
| $\tan x$ | $\sec^2 x$ | |

- 指数函数 $e^x$ 的导数等于自身。机器学习中的 softmax 和概率分布等公式也会用到 $e$。**编者注：**满足 $f'=f$ 的函数包括 $Ce^x$（$C$ 为常数），因此原文“唯一一个”的说法不准确。

- **洛必达法则** 处理产生不定式形式（如 $\frac{0}{0}$ 或 $\frac{\infty}{\infty}$）的极限。当直接代入给出这些形式时，你可以分别对分子和分母求导，并再次尝试极限：

$$\lim_{x \to a} \frac{f(x)}{g(x)} = \lim_{x \to a} \frac{f'(x)}{g'(x)}$$
- 条件：$f$ 和 $g$ 必须在 $a$ 附近可微，且 $g'(x) \neq 0$（$a$ 点本身可以例外）；原极限必须是 $0/0$ 或 $\infty/\infty$。**编者注：**还需检查导数之比的极限存在（有限或无穷），才能据此求原极限。

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

3. 通过数值方法验证链式法则。定义 $f(x) = \sin(x^2)$，用 `jax.grad` 计算导数，并与解析结果 $2x\cos(x^2)$ 比较。
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

4. 可视化导数。在同一张图上绘制 $f(x) = x^3 - 3x$ 和其导数 $f'(x) = 3x^2 - 3$。注意 $f'(x) = 0$ 对应 $f$ 的峰值和谷值。
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
