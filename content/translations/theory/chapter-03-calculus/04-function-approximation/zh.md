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

*函数逼近用较简单的函数近似复杂函数，使结果在关注的区域内足够准确。本文件介绍线性化、泰勒级数、多项式逼近、傅里叶级数和通用逼近定理；该定理说明，在一定条件下，神经网络可以逼近任意连续函数。*

- 许多我们遇到的问题过于复杂，无法直接处理。例如，在纸上计算 $e^{0.1}$、预测卫星轨迹等都涉及没有简单公式解答的函数。

- **函数逼近**用一个简单的函数替换一个复杂的函数，这个简单函数在我们关心的区域足够接近复杂函数。

- 最自然的近似是多项式。多项式只是带有系数的 $x$ 的幂次和，易于求值、求导和积分。

- 但为什么多项式作为近似器如此有效？考虑每个幂次项的作用。

    - 常数项 $a_0$ 设置基准值。
    - $a_1 x$ 项添加斜率。
    - $a_2 x^2$ 项添加曲率。
    - 每个更高次幂捕捉函数形状的更精细细节。

![每个多项式项都为逼近增加一层细节](../images/polynomial_buildup.svg)


- 选择合适的系数后，可以逐项匹配函数在某一点的函数值、斜率、曲率和更高阶导数。

- 在给定的有限区间内，多项式可以逼近许多光滑函数；逼近精度取决于区间和所选多项式。

- 问题变成了：如何找到正确的系数？

- **线性化**是最简单的近似法。在点 $x = a$ 处，我们用其切线替换函数：

$$L(x) = f(a) + f'(a)(x - a)$$
- 这是第一阶泰勒近似。它说：从已知值 $f(a)$ 开始，然后通过斜率乘以与 $a$ 之间的距离进行调整。

- 例如，线性化 $\sin(x)$ 在 $x = 0$：$f(0) = 0$、$f'(0) = \cos(0) = 1$，因此 $L(x) = x$。接近零时，$\sin(x) \approx x$。试一试：$\sin(0.1) = 0.0998\ldots \approx 0.1$。

- 线性化在 $x$ 接近 $a$ 时效果较好；离 $a$ 越远，误差通常越大。要提高精度，可以加入更高阶的项。

- 泰勒级数用无穷多个多项式项之和表示函数，每一项都补充函数在点 $a$ 附近的细节：

$$f(x) = \sum_{n=0}^{\infty} \frac{f^{(n)}(a)}{n!}(x - a)^n = f(a) + f'(a)(x-a) + \frac{f''(a)}{2!}(x-a)^2 + \frac{f'''(a)}{3!}(x-a)^3 + \cdots$$
![泰勒级数：在收敛范围内，增加项数可以改善逼近](../images/taylor_approximation.svg)


- 每一项都会增加一项修正：第一项匹配函数值，第二项匹配斜率，第三项匹配曲率，后续项匹配更高阶导数。增加项数通常能提高收敛范围内的逼近精度。

- 分母中的 $n!$ 不是随意的。当你对 $(x - a)^n$ 进行精确的 $n$ 次微分时，你会得到 $n!$。阶乘会消去这个因子，确保泰勒多项式的 $n$ 阶导数等于原函数在 $x = a$ 处的 $n$ 阶导数。

- 一个 **麦克劳林级数** 只是中心在 $a = 0$ 的泰勒级数。

$$f(x) = \sum_{n=0}^{\infty} \frac{f^{(n)}(0)}{n!} x^n$$
- 一些著名的麦克劳林级数：

$$e^x = 1 + x + \frac{x^2}{2!} + \frac{x^3}{3!} + \cdots$$
$$\sin x = x - \frac{x^3}{3!} + \frac{x^5}{5!} - \frac{x^7}{7!} + \cdots$$
$$\cos x = 1 - \frac{x^2}{2!} + \frac{x^4}{4!} - \frac{x^6}{6!} + \cdots$$
- 注意 $\sin x$ 只有奇次幂（它是奇函数），而 $\cos x$ 只有偶次幂（它是偶函数）。交替的符号导致近似值围绕真实值上下波动，从两边收敛。

- 用四项近似 $e^{0.5}$：$1 + 0.5 + \frac{0.25}{2} + \frac{0.125}{6} = 1 + 0.5 + 0.125 + 0.02083 \approx 1.6458$。真实值约为 $1.6487$。**编者注：**两者的小数点后前两位相同，第三位不同；原文所说“三位小数正确”不准确。

- 泰勒级数不一定处处收敛。**收敛半径**给出级数以中心 $a$ 为基点的收敛范围：在半径内级数收敛，在半径外发散。**编者注：**收敛不一定意味着级数等于原函数；还需满足泰勒余项趋于零等条件。

- **幂级数**的一般形式为 $\sum_{n=0}^{\infty} a_n (x - c)^n$。泰勒级数是系数由导数确定的幂级数。可用**比值判别法**检查收敛性：计算 $\lim_{n \to \infty} \left|\frac{a_{n+1}}{a_n}\right|$。若极限为 $L$，收敛半径为 $R = 1/L$。**编者注：**该公式要求极限存在；若极限不存在，比值判别法不能直接确定收敛半径。

- 将泰勒级数截断为 $n$ 阶多项式时会产生误差，**拉格朗日余项**可用于界定误差：

$$R_n(x) = \frac{f^{(n+1)}(c)}{(n+1)!}(x-a)^{n+1}$$
- 这里的 $c$ 是位于 $a$ 和 $x$ 之间的某个未知点。若能界定 $|f^{(n+1)}(c)|$，就能得到最坏情况误差估计。**编者注：**该余项公式要求函数在 $a$ 与 $x$ 之间具有足够阶数的导数；$R_n$ 对应截断到 $n$ 阶，通常保留 $n+1$ 项。

- 对于多元函数，泰勒展开还包含混合偏导数。$f(\mathbf{x})$ 在 $\mathbf{a}$ 附近的二阶近似为：

$$f(\mathbf{x}) \approx f(\mathbf{a}) + \nabla f(\mathbf{a})^T (\mathbf{x} - \mathbf{a}) + \frac{1}{2} (\mathbf{x} - \mathbf{a})^T H(\mathbf{a}) (\mathbf{x} - \mathbf{a})$$
- 第一项是函数值，第二项使用梯度（如多元微积分章节所述），第三项使用 Hessian 矩阵（它捕捉曲率）。这直接将矩阵章节与微积分连接起来：Hessian 是由二阶导数组成的矩阵，描述函数曲面的形状。

- 这种多元二阶近似是牛顿法等二阶优化方法的基础，下一篇会继续介绍。

- 除了多项式外，还有其他值得了解的逼近方法：

    - **样条插值**：使用许多低次多项式拼接在一起，并使连接处保持光滑。这可以避免高次多项式产生剧烈振荡。
    - **傅里叶级数**：用正弦和余弦的和来逼近周期函数。在信号处理和音频中至关重要。
    - **神经网络**：通用函数逼近器。在紧致定义域上，满足条件的网络和非线性激活函数可以任意精确地逼近连续函数。**编者注：**原文省略了网络结构、激活函数和定义域等前提。

- 本节把有助于逼近的性质概括为“性质良好”：连续（没有跳跃）、可微（没有尖角）、光滑（各阶导数存在）和有界（输出有限）。这些描述是直观概括，不是严格的充要条件。

- 多项式、指数函数和三角函数都光滑；泰勒逼近的误差还取决于所选区间和项数。**编者注：**有界性取决于定义域，例如 $e^x$ 在整个实数域上无界。

## 编程任务（使用 Colab 或笔记本）

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

**编者注：**这段代码中的 $n$ 表示最高幂次，因此实际包含 $n+1$ 项；图例标作 $n$ terms。

2. 用不同数量的泰勒项近似 $\sin(1)$，并计算拉格朗日余项给出的误差上界。
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

3. 比较 $\cos(x)$ 在 $x=0$ 附近的线性近似和二阶泰勒近似。将它们与原函数绘在一起，观察各自在什么范围内较准确。
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
