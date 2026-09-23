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

*函数逼近用简单、可计算的函数表示复杂关系。本篇覆盖 Taylor 展开、Fourier 展开、样条、基函数和神经网络逼近，并说明逼近误差与泛化之间的联系。*


*功能近似用更简单的功能来取代复杂的功能,这些功能相近到足够有用. 这个文件涵盖线性化,泰勒系列,多名近似相,傅里叶系列,以及通用近似定理,神经网络为何可以学习任意绘图的理论骨干. *

- 我们遇到的许多功能过于复杂,无法直接与之合作。计算$e^{0.1}$在纸上,预测卫星的轨迹等等。全部包含没有简单的闭合式答案的函数。

- ** 功能相近** 用一个“足够接近”我们所关心的区域的更简单的函数取代了复杂的函数。

- 最自然的近似是多名相. 波利诺密尔只是权力的集合$x$并易于评估、区分和整合。

- 但是,为什么多名制的功能 和近似性一样好呢? 想想每个力量$x$贡献。

    - 常数$a_0$设置基线值。
    - 该$a_1 x$术语添加了坡度。
    - 该$a_2 x^2$术语增加了曲率。
    - 每个更高的功率捕捉到关于函数形状的更细细的细节.

![每个多名词在近似值中添加了又一层细节](../images/polynomial_buildup.svg)

- 通过选择正确的系数,我们可以匹配一个函数的值,坡度,曲率,以及一个点的更高顺序的行为,一个点一个地.

- 有了足够的条件,多名制可以模仿几乎任何平滑的功能.

- 问题是:我们如何找到正确的系数?

- ** 学习**是最简单的近似。接近一点$x = a$,我们用其正线替换此功能:

$$L(x) = f(a) + f'(a)(x - a)$$

- 这是第一顺序**Taylor近似**。上面写着:从已知值开始$f(a)$,然后按坡度乘以距离$a$.

- 例如,线性化$\sin(x)$时间$x = 0$: $f(0) = 0$, $f'(0) = \cos(0) = 1$,这样$L(x) = x$。。。接近0, 已经接近0,$\sin(x) \approx x$。。。试试看:$\sin(0.1) = 0.0998\ldots \approx 0.1$.

- 但线性化很接近$a$。。。更远地走去,近似会分崩离析. 为了做得更好,我们列入了更高顺序的术语。

- ** Taylor 系列** 代表了一种功能,作为无限的多名词的总和,每个函数在某个点附近捕捉到关于函数行为的更细微的细节.$a$:

$$f(x) = \sum_{n=0}^{\infty} \frac{f^{(n)}(a)}{n!}(x - a)^n = f(a) + f'(a)(x-a) + \frac{f''(a)}{2!}(x-a)^2 + \frac{f'''(a)}{3!}(x-a)^3 + \cdots$$

![泰勒系列:增加更多名词给出了更好的近似.](../images/taylor_approximation.svg)

- 每届任期都增加一个更正. 第一个名词与值相匹配,第二个名词与坡度相匹配,第三个名词与曲率相匹配等. 我们包括的词汇越多,近似值准确的区域就越大.

- 该$n!$在分母中不是任意的。当你分辨$(x - a)^n$没错$n$# 时间,你得到#$n!$。。。要素取消,确保$n$-泰勒的多名衍生物等于$n$- 原始函数的第1个衍生词:$x = a$.

- **Maclaurin系列**只是泰勒系列,其中心是$a = 0$:

$$f(x) = \sum_{n=0}^{\infty} \frac{f^{(n)}(0)}{n!} x^n$$

- 一些著名的麦克劳林系列:

$$e^x = 1 + x + \frac{x^2}{2!} + \frac{x^3}{3!} + \cdots$$

$$\sin x = x - \frac{x^3}{3!} + \frac{x^5}{5!} - \frac{x^7}{7!} + \cdots$$

$$\cos x = 1 - \frac{x^2}{2!} + \frac{x^4}{4!} - \frac{x^6}{6!} + \cdots$$

- 请注意:$\sin x$仅具有奇异能力(这是一个奇异功能)和$\cos x$甚至只有权力(这是偶数函数). 交替的标志导致近似值在正值上相绕,从两侧会合.

- 来,我们来做个大概的$e^{0.5}$使用四个术语:$1 + 0.5 + \frac{0.25}{2} + \frac{0.125}{6} = 1 + 0.5 + 0.125 + 0.02083 \approx 1.6458$。。。真正的价值是$1.6487\ldots$四个词已经给我们三个正确的小数位数

- 并不是每个泰勒系列都聚集在各地. 交汇的光线告诉我们离中心有多远$a$该系列给出了有效的结果。在这个半径内,可以通过增加更多术语来使多名近似性达到我们想要的准确度. 在它之外,系列有分歧。

- 一个**功率系列**是一般形式:$\sum_{n=0}^{\infty} a_n (x - c)^n$。。。Taylor系列是功率系列,其中系数由衍生物决定. 其他权力系列可能由其他一些规则来定义。** ratio测试**确定趋同:计算$\lim_{n \to \infty} \left|\frac{a_{n+1}}{a_n}\right|$。。。如果这个限制是$L$,趋同的半径是$R = 1/L$.

- 当我们在之后中断一个泰勒系列$n$条件,我们犯了一个错误。** Lagrange 所剩** 将这个错误限定为:

$$R_n(x) = \frac{f^{(n+1)}(c)}{(n+1)!}(x-a)^{n+1}$$

- 给$c$是一个未知的点$a$财务报告和已审计财务报表$x$。。。我们不知道$c$没错,但我们常常可以捆绑$|f^{(n+1)}(c)|$要获取最坏情况错误估计。该$(n+1)!$在分母中生长极快,因此在我们增加更多术语(对于在收缩半径范围内的函数)时,误差会迅速收缩.

- 对于多变量的函数,泰勒扩展包括混合部分衍生物. 第二顺序近似$f(\mathbf{x})$环绕一个点$\mathbf{a}$即:

$$f(\mathbf{x}) \approx f(\mathbf{a}) + \nabla f(\mathbf{a})^T (\mathbf{x} - \mathbf{a}) + \frac{1}{2} (\mathbf{x} - \mathbf{a})^T H(\mathbf{a}) (\mathbf{x} - \mathbf{a})$$

- 第一个术语是值,第二个术语使用梯度(一个向量,我们在多变量微积分中看到),第三个术语使用黑森矩阵(它捕获曲率). 这把我们的矩阵分会直接连接到微积分: 黑森是描述函数表面形状的第二个衍生物的矩阵.

- 这种多变的二等相近是牛顿方法和其他二等相优化技术的基础,我们将在下个文件中看到.

- 除了多名之外,还有其他的近似方法值得了解:

    - ** Spline interpliation**:不使用一个高分多音,而是使用许多低分多相接而成的平稳相接. 这避免了高等多诺米能产生的野生振荡.
    - ** 4个系列**:大约周期性函数为正弦和余弦之和。在信号处理和音频方面至关重要。
    - ** 神经网络**:通用功能近似. 如果神经元足够多,它们可以将任何连续的功能相近到任意的精确. 这就是深层次学习的理论依据.

- 一个函数如果具有使近似性变得可靠的属性,则被称作"良好行为":连续性(无跳跃),相异性(无锐角),平滑性(所有订单的衍生物存在),和定界性(输出会保持有限度).

- 多诺分数,指数和三角函数都表现良好. 表现得越好 一个功能是,泰勒术语 你需要一个很好的近似。

## 编程任务（使用 Colab 或 notebook)



1. 大约$e^x$使用越来越多的泰勒名词,并直观地描述近似性如何改善.
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

2. 计算 Lagrange 剩余值以约束近似错误$\sin(1)$和不同的泰勒条款。
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

3. 比较线性化与四相式泰勒近似$\cos(x)$相邻$x = 0$。。。在真函数相并列的相近图上标出,并观察每个相并准确的区域.
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
