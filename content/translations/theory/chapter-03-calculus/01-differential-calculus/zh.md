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

*本篇将微分学放回 AI 工程语境，保留源文中的定义、公式、代码、图示和实践边界，便于逐项核对。*

* 差异微积分捕捉瞬间变化速率. 此文件涵盖了限制,衍生物,分化规则,链条规则(后向传播的基础),以及通通 ML* 使用的常见衍生物.

- 在前几章中,我们学会了如何将数据作为向量来表示,并用矩阵来转换. 但是,许多现实世界的现象并不是静止的。汽车加速,股价起起伏起伏,神经网络的损失会随着重量的更新而变化. ** Calculus**是变化的数学.

- 算术问了两个问题:现在东西变了多快? (分出相去微积分)而后所积取之多? (内相微分. 本节论述"多快"问题.

- 想象一下你在开车 看你的行驶速度表 它读作60km/h. 这个数字不是你们整个旅程的平均速度;这是你们在这个准确瞬间的速度。不同的微积分给我们提供了计算这种瞬间变化速度的工具.

- 但首先,让我们重温直线的等式:$y = mx + b$.

- 这是两个量之间最简单的关系.

    - $b$是**y-intercept**,该线横过Y轴(起始值当$x = 0$).
    - $m$变化率:每增加1个单位$x$, $y$变化情况$m$.
- 若为$m = 3$,线会陡起;$m = 0$,线为平;如果$m = -2$,线倒下。

- 坡度计算为$m = \frac{\Delta y}{\Delta x} = \frac{y_2 - y_1}{x_2 - x_1}$,“有多少”的比例$y$改为: "多少"$x$变".

![图示](../images/line_equation.svg)

- 一旦你发现$m$财务报告和已审计财务报表$b$你可以计算$y$用于任何$x$.

- 例如,如果$m = 2$财务报告和已审计财务报表$b = 3$,然后在$x = 5$: $y = 2(5) + 3 = 13$.

- 这两个参数完全决定了线条,预测任何输出只是插入.

- 对于一行直线,坡道在各地都是一样的.

- 这种想法超越了界限。任何函数都是一种将输入映射到输出的规则,一旦你知道它的公式(其参数和形状),就可以计算输出用于任何输入并绘制结果.

- $y = x^2$以抛物论,$y = \sin(x)$挥起一波$y = e^x$使指数增长。每种公式都定义了特定的曲线,自在地读取一个函数作为形状对接下来的一切至关重要.

- 对于一行直线,坡道在各地都是一样的. 但最有趣的功能是被弯曲的,因此坡度因地而异. 计算让我们找到曲线上任何一点的坡度。

- 我们还需要**限制**的概念。一个限制描述的是,当一个函数的投入越来越接近某个目标,而不一定达到这个目标时,它的价值是什么。

$$\lim_{x \to a} f(x) = L$$

- 写道:"如.$x$方针$a$, $f(x)$方针$L$"你觉得呢?" 该函数不需要实际等同$L$时间$x = a$。。。它只是需要任意接近。

- 举例来说,拿$f(x) = \frac{x^2 - 1}{x - 1}$。。。如果你插进去$x = 1$直接,你会得到$\frac{0}{0}$,则未定义。

- 但尝试接近1的值:$f(0.9) = 1.9$, $f(0.99) = 1.99$, $f(1.01) = 2.01$。。。产出显然朝2走去。

- 从代数上看,我们可以看到原因: 将数字因素作为$(x-1)(x+1)$中,取消$(x-1)$条件,我们得到$f(x) = x + 1$对所有国家的$x \neq 1$。。。这么说$x \to 1$, $f(x) \to 2$.

- 该函数有一个孔$x = 1$,但限制仍然存在。

- 极限是微积分中其他所有事物的基础。

- 函数的衍生**$f(x)$一点上$x = a$测量瞬间变化的速度。从几何角度来说,它是正线到曲线的坡度。

![图示](../images/tangent_line.svg)

- 为了计算出这个坡度,我们先从曲线上的两个分数开始计算出穿过它们的线的坡度(一条**secant line**). 然后我们把第二点 更接近第一点, 看看离分线的坡度是怎样的。这是**大小商数**:

$$f'(a) = \lim_{h \to 0} \frac{f(a + h) - f(a)}{h}$$

![图示](../images/difference_quotient.svg)

- 数字$f(a+h) - f(a)$是输出的变化。分母$h$是输入的变化。其比值为相距很小的平均变化率. 作为$h \to 0$,这个平均值成为瞬间速率。

- 例如,让$f(x) = x^2$。。。时$x = 3$:

$$f'(3) = \lim_{h \to 0} \frac{(3+h)^2 - 9}{h} = \lim_{h \to 0} \frac{9 + 6h + h^2 - 9}{h} = \lim_{h \to 0} (6 + h) = 6$$

- 这么说吧$x = 3$,函数$x^2$以每单位投入6个产出单位的速度增长。

- 如果存在此限制,则某一函数在某一点为**可区分**。要做到这一点,功能必须是连续(不跳出),平滑(不尖角),并在环绕点的相邻地上定义.

- 如果你能画出曲线而不举起你的笔 和没有任何的怪事, 它可能就不同了。

- 每次从限制定义中计算出衍生物都会很乏味。幸运的是,少数规则让我们迅速区分几乎所有职能。

- ** 恒定规则**:一个常数的衍生值为0. 若为$f(x) = 5$,则$f'(x) = 0$。。。平地线有零坡.

- ** 权力规则**:区别对待的工作马。降出者并减一:

$$\frac{d}{dx} x^n = n x^{n-1}$$

- 例如:$\frac{d}{dx} x^3 = 3x^2$。。。立方体变成四相体. 这对于任何真正的解答者都有效,包括负数和分数:$\frac{d}{dx} x^{-1} = -x^{-2}$财务报告和已审计财务报表$\frac{d}{dx} \sqrt{x} = \frac{d}{dx} x^{1/2} = \frac{1}{2}x^{-1/2}$.

- ** Sum/Diffection 规则**:按术语区分。

$$\frac{d}{dx}[f(x) \pm g(x)] = f'(x) \pm g'(x)$$

- **出产规则**:当两个函数相乘时,输出输出输出输出输出输出输出输出输出输出输出输出输出输出出入输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出输出出 相反:

$$\frac{d}{dx}[f(x) \cdot g(x)] = f'(x)g(x) + f(x)g'(x)$$

- 认为:"初二相变之率,外加后一相变之快". 举例来说,$\frac{d}{dx}[x^2 \sin x] = 2x \sin x + x^2 \cos x$.

- 乘法规则**:函数比例:

$$\frac{d}{dx}\left[\frac{f(x)}{g(x)}\right] = \frac{f'(x)g(x) - f(x)g'(x)}{[g(x)]^2}$$

- 一个有用的元音:"低d-高去-高D-,在下方的正方形上".

- ** 钱规则**:对ML最重要的规则. 当由函数组成(一个在另一个内部)时,衍生出物是沿链的衍生出物的产物:

$$\frac{d}{dx} f(g(x)) = f'(g(x)) \cdot g'(x)$$

- 把它当成剥洋葱 分化出外相函数(使内相函数不受影响),再由内相函数的衍生出相乘.

![图示](../images/chain_rule.svg)

- 举例来说,$\frac{d}{dx} (3x + 1)^5 = 5(3x+1)^4 \cdot 3 = 15(3x+1)^4$。。。外部功能为$(\cdot)^5$内在的,$3x+1$.

- 链式规则是神经网络中**回向传播**的数学基础. 深层网络是一个由构成的功能组成的长链. 为了计算损失在每一重量上的变化,我们从输出层回向输入反复应用了链规则,将每个步骤的本地衍生物相乘.

- 这是你们将遇到的最常见的衍生物。每一个都可以从极限定义中推导出来,但通过心知肚明可以节省时间:

|Function|Derivative|Notes|
|---|---|---|
|$e^x$|$e^x$|The only function that is its own derivative|
|$a^x$|$a^x \ln a$|Generalises the exponential|
|$\ln x$|$\frac{1}{x}$|The natural logarithm|
|$\log_a x$|$\frac{1}{x \ln a}$|General logarithm|
|$\sin x$|$\cos x$| |
|$\cos x$|$-\sin x$|Note the negative sign|
|$\tan x$|$\sec^2 x$| |

- 指数函数$e^x$是显著的:它是唯一一个等于自身衍生物的函数。这就是为什么$e$从软马克斯活化到概率分布。

- ** L'Hopital's Rule** 处理的限度,产生不确定的形式,如$\frac{0}{0}$或 为$\frac{\infty}{\infty}$。。。当直接替换给出了其中一种形式时,可以分别取出分母和分母的衍生物并再次尝试限制:

$$\lim_{x \to a} \frac{f(x)}{g(x)} = \lim_{x \to a} \frac{f'(x)}{g'(x)}$$

- 条件:两者兼有$f$财务报告和已审计财务报表$g$附近必须不同$a$,以及$g'(x) \neq 0$相邻$a$(除可能在$a$报告提交日期 最初的限制必须给出不确定的形式。

- 例如:$\lim_{x \to 0} \frac{\sin x}{x}$。。。直接替换给$\frac{0}{0}$。。。适用医院规则:$\lim_{x \to 0} \frac{\cos x}{1} = 1$。。。这个限制是根本性的,它出现在信号处理和Fourier分析中.

- 如果结果仍然不确定,您可以反复应用该规则. 比如说,$\lim_{x \to 0} \frac{1 - \cos x}{x^2}$给$\frac{0}{0}$。。。第一个应用程序 :$\lim_{x \to 0} \frac{\sin x}{2x}$继续$\frac{0}{0}$。。。第二个应用程序 :$\lim_{x \to 0} \frac{\cos x}{2} = \frac{1}{2}$.

- 如果两种功能是不同的,它们的和相,差相,出产相,组成相,和商相(分母为非零相)也是不同的. 这就是为什么我们可以有把握地区分复杂表达方式和简单的表达方式。

## 编程任务（使用 Colab 或 notebook）


1. 可视化共同功能. 绘图$x^2$, $\sin(x)$,以及$e^x$并肩建立直觉,以了解不同公式如何产生不同的形状。尝试改变参数(例如.$2x^2$, $\sin(2x)$)和观察曲线的变化。
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

2. 使用 JAX 的自动区分来计算衍生物$f(x) = x^3 - 2x + 1$在几个点。比较分析衍生工具$f'(x) = 3x^2 - 2$.
```python
import jax
import jax.numpy as jnp

f = lambda x: x**3 - 2*x + 1
df = jax.grad(f)

for x in [0.0, 1.0, 2.0, -1.0]:
    print(f"x={x:5.1f}  autodiff: {df(x):.4f}  analytical: {3*x**2 - 2:.4f}")
```

2. 用数字验证链条规则。定义$f(x) = \sin(x^2)$,通过`jax.grad`,并与分析结果进行比较$2x\cos(x^2)$.
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

3. 视取出相. 绘图$f(x) = x^3 - 3x$及其衍生工具$f'(x) = 3x^2 - 3$在同一图上。通知何处$f'(x) = 0$与山峰和山谷相对应$f$.
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
