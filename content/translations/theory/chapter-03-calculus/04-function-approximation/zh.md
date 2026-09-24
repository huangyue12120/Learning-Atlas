---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 03 - calculus/04. function approximation.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: bfcce007ae7e93ffbde47ba03512db504e57e6716c76b88e7af3d34309e1499e
status: reviewed
---
# 函数逼近

*函数逼近用更简单的函数替换复杂函数，这些函数足够接近以实用。本文件涵盖了线性化、泰勒级数、多项式逼近、傅里叶级数以及神经网络可以学习任意映射的普遍逼近定理，这是神经网络理论的基础。*

- 许多我们遇到的问题过于复杂，无法直接处理。例如，在纸上计算 $e^{0.1}$、预测卫星轨迹等都涉及没有简单公式解答的函数。

- **函数近似**用一个简单的函数替换一个复杂的函数，这个简单函数在我们关心的区域足够接近复杂函数。

- 最自然的近似是多项式。多项式只是 $x$ 的幂次方的和，系数，它们很容易评估、微分和积分。

- 但为什么多项式作为近似器如此有效？考虑每个幂次项的作用。 $x$ 有助于

    - 常数项 $a_0$ 设置基准值。
    - $a_1 x$ 项添加斜率。
    - $a_2 x^2$ 项添加曲率。
    - 每个更高次幂捕捉函数形状的更精细细节。

![每个多项式项都增加一层细节，使融合更加深入。](../images/polynomial_buildup.svg)


- 通过选择合适的系数，我们可以逐个匹配函数在某一点的值、斜率、曲率和更高阶行为。

- 当有足够的项时，多项式可以模仿几乎任何光滑函数。

- 问题变成了：如何找到正确的系数？

- **线性化**是最简单的近似法。在点 $x = a$ 处，我们用其切线线替换函数：

$$L(x) = f(a) + f'(a)(x - a)$$
- 这是第一阶泰勒近似。它说：从已知值 $f(a)$ 开始，然后通过斜率乘以与 $a$ 之间的距离进行调整。

- 例如，线性化 $\sin(x)$ 在 $x = 0$：$f(0) = 0$、$f'(0) = \cos(0) = 1$，因此 $L(x) = x$。接近零时，$\sin(x) \approx x$。试一试：$\sin(0.1) = 0.0998\ldots \approx 0.1$。

- 但线性化在接近 $a$ 时效果很好，但距离越远，近似就会失效。为了做得更好，我们需要包括更高阶的项。

- 泰勒级数表示函数为一个无限多项式和，每个都捕捉了函数在某点附近行为的更细微细节。 $a$当然可以，请提供您需要翻译的英文文本。

$$f(x) = \sum_{n=0}^{\infty} \frac{f^{(n)}(a)}{n!}(x - a)^n = f(a) + f'(a)(x-a) + \frac{f''(a)}{2!}(x-a)^2 + \frac{f'''(a)}{3!}(x-a)^3 + \cdots$$
![泰勒级数：添加更多项可以得到更好的逼近。](../images/taylor_approximation.svg)


- 每一项都添加一个修正。第一个项匹配值，第二个项匹配斜率，第三个项匹配曲率，依此类推。我们包含的项越多，近似度越准确。

- 分母中的 $n!$ 不是随意的。当你对 $(x - a)^n$ 进行精确的 $n$ 次微分时，你会得到 $n!$。阶乘会消去这个项，确保 Taylor 多项式的 $n$ 阶导数等于原函数在 $x = a$ 处的 $n$ 阶导数。

- 一个 **马夸林级数** 只是中心在 $a = 0$ 的泰勒级数。

$$f(x) = \sum_{n=0}^{\infty} \frac{f^{(n)}(0)}{n!} x^n$$
- 一些著名的麦克劳林级数：

$$e^x = 1 + x + \frac{x^2}{2!} + \frac{x^3}{3!} + \cdots$$
$$\sin x = x - \frac{x^3}{3!} + \frac{x^5}{5!} - \frac{x^7}{7!} + \cdots$$
$$\cos x = 1 - \frac{x^2}{2!} + \frac{x^4}{4!} - \frac{x^6}{6!} + \cdots$$
- 注意 $\sin x$ 只有奇次幂（它是奇函数），而 $\cos x$ 只有偶次幂（它是偶函数）。交替的符号导致近似值围绕真实值上下波动，从两边收敛。

- 让我们使用四个项来近似 $e^{0.5}$：$1 + 0.5 + \frac{0.25}{2} + \frac{0.125}{6} = 1 + 0.5 + 0.125 + 0.02083 \approx 1.6458$。真实值是 $1.6487\ldots$，因此四项已经给了我们三个正确的小数位。

- 不是每个泰勒级数都收敛于 everywhere。**收敛半径**告诉我们，当级数在中心 $a$ 外部时，它给出的值是有效的。在该范围内，通过添加更多项，我们可以使多项式近似度尽可能准确。超出这个范围，级数发散。

- 一个 **幂级数** 的一般形式为 $\sum_{n=0}^{\infty} a_n (x - c)^n$。泰勒级数是幂级数，其中系数由导数确定。其他幂级数可能由某些其他规则定义。 **比值测试** 确定收敛性：计算 $\lim_{n \to \infty} \left|\frac{a_{n+1}}{a_n}\right|$。如果这个极限是 $L$，半径 of 收敛为 $R = 1/L$。

- 在 $n$ 个项之后截断泰勒级数时，我们会引入误差。**拉格朗日余项**界定了这个误差：

$$R_n(x) = \frac{f^{(n+1)}(c)}{(n+1)!}(x-a)^{n+1}$$
- 这些 $c$ 是一个未知点，位于 $a$ 和 $x$ 之间。我们不知道 $c$ 的确切值，但我们可以经常用 $|f^{(n+1)}(c)|$ 来得到最坏情况的误差估计。分母中的 $(n+1)!$ 长得非常快，因此随着添加更多项（对于在收敛半径内的函数），误差迅速缩小。

- 对于多变量函数，泰勒展开包括混合偏导数。二阶近似 $f(\mathbf{x})$ 在点 $\mathbf{a}$ 围绕时是：

$$f(\mathbf{x}) \approx f(\mathbf{a}) + \nabla f(\mathbf{a})^T (\mathbf{x} - \mathbf{a}) + \frac{1}{2} (\mathbf{x} - \mathbf{a})^T H(\mathbf{a}) (\mathbf{x} - \mathbf{a})$$
- 第一项是值，第二项使用梯度（如我们在多元微积分中看到的向量），第三项使用 Hess 矩阵（它捕捉曲率）。这直接将我们的矩阵章节与微积分连接起来：Hess 是一个二阶导数矩阵，描述了函数表面形状。

- 这个多变量二阶近似是 Newton 方法和其他二阶优化技术的基础，我们在下一个文件中会看到。

- 除了多项式外，还有其他值得了解的逼近方法：

    - **样条插值**：使用许多低度多项式拼接在一起，光滑地连接。这避免了高次多项式产生的野振荡。
    - **傅里叶级数**：用正弦和余弦的和来逼近周期函数。在信号处理和音频中至关重要。
    - **神经网络**：通用函数逼近器。有足够的神经元，它们可以任意准确地逼近连续函数。这是深度学习的理论依据。

- 一个函数被称为“良好行为”如果它具有使近似可靠的属性：连续（无跳跃），可微分（无尖角），光滑（所有阶导数存在），和有界（输出保持有限）。

- 多项式、指数函数和三角函数都是良好的行为。函数越良好，使用较少的泰勒项进行好的近似所需的项数就越少。

## 编程任务（使用 CoLab 或笔记本）

1. 使用不断增加的泰勒项逼近 $e^x$，并可视化近似如何改进。
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt

x = jnp.linspace(-2, 3, 300)
plt.plot(x, jnp.exp(x), "k-", linewidth=2, label="eˣ (exact)")

colors = ["#e74c3c", "#3498db", "#27ae60", "#9b59b6"]
for n, color in zip([1, 2, 4, 8], colors):
    approx = sum(x**k / jnp.array(float(jnp.prod(jnp.arange(1, k+1)) if k > 0 else 1))
                 for k in range(n+1))
    plt.plot(x, approx, color=color, linestyle="--", label=f"{n} terms")

plt.ylim(-2, 15)
plt.legend()
plt.title("Taylor approximation of eˣ")
plt.show()
```

2. 计算用不同数量的泰勒项逼近 $\sin(1)$ 的拉格朗日余项，以界定了误差。
```python
import jax.numpy as jnp

x = 1.0
exact = jnp.sin(x)

taylor = 0.0
for n in range(8):
    sign = (-1)**n
    factorial = float(jnp.prod(jnp.arange(1, 2*n+2)))
    taylor += sign * x**(2*n+1) / factorial
    error = abs(exact - taylor)
    bound = x**(2*n+3) / float(jnp.prod(jnp.arange(1, 2*n+4)))
    print(f"terms={n+1}  approx={taylor:.10f}  error={error:.2e}  bound={bound:.2e}")
```

3. 比较线性化和二阶泰勒近似在 $\cos(x)$ 点附近的 $x = 0$ 处的准确性。将两者与真函数一起绘制，并观察每个范围内的准确度。
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt

x = jnp.linspace(-3, 3, 300)
plt.plot(x, jnp.cos(x), "k-", linewidth=2, label="cos(x)")
plt.plot(x, jnp.ones_like(x), "--", color="#e74c3c", label="linear: 1")
plt.plot(x, 1 - x**2/2, "--", color="#3498db", label="quadratic: 1 - x²/2")
plt.plot(x, 1 - x**2/2 + x**4/24, "--", color="#27ae60", label="4th order")
plt.ylim(-2, 2)
plt.legend()
plt.title("Taylor approximations of cos(x)")
plt.show()
```
