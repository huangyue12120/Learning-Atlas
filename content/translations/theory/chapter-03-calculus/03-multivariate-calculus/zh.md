---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 03 - calculus/03. multivariate calculus.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: c5d61d7e68490b647953977bc7cfc5a858f5d19e5d4c936062619b07b046785b
status: reviewed
---
# 多变量微积分

*多变量微积分将导数和积分扩展到多个变量的函数上，这是机器学习模型中数百万参数所必需的。本文件涵盖了偏导数、梯度、雅可比矩阵、海塞矩阵以及使得反向传播可能的多元链式法则。*

- 直到目前为止，我们的函数都只接受一个输入 $x$ 并产生一个输出 $f(x)$。但在机器学习中，我们几乎从未工作于单个变量。

- 考虑一个有两个变量的函数，例如 $f(x, y) = x^2 + y^2$。这个定义了一个在三维空间中的表面，形状类似于碗。我们想知道：如果我们稍微移动一下 $x$ 而保持 $y$ 固定， $f$ 怎么变化？这就是一个 **偏导数**。

- **偏导数**是 $f$ 关于 $x$ 的导数，用 $\frac{\partial f}{\partial x}$ 表示。它将其他所有变量视为常数，并按照正常方式对 $x$ 进行微分。

- 对于 $f(x, y) = x^2y + 3x - 2y$:

$$\frac{\partial f}{\partial x} = 2xy + 3 \qquad \frac{\partial f}{\partial y} = x^2 - 2$$
- 为了计算 $\frac{\partial f}{\partial x}$，我们将 $y$ 视为常数。因此，$x^2y$ 对 $2xy$ 求导，$3x$ 对 $3$ 求导，$-2y$ 对 $0$ 求导。

- 为了计算 $\frac{\partial f}{\partial y}$，我们将 $x$ 视为常数。因此，$x^2y$ 对 $x^2$ 求导，$3x$ 对 $0$ 求导，$-2y$ 对 $-2$ 求导。

- 几何上，对 $x$ 求偏导数相当于在固定 $y$ 值的情况下，用一个与 $xz$ 平行的平面切开三维表面，并找到切线的斜率。

![部分导数：通过固定一个变量切片表面](../images/partial_derivative.svg)


- 梯度将所有偏导数收集到一个向量中：

$$\nabla f = \left(\frac{\partial f}{\partial x_1}, \frac{\partial f}{\partial x_2}, \ldots, \frac{\partial f}{\partial x_n}\right)$$
- 对于 $f(x, y) = x^2 + y^2$： $\nabla f(x, y) = (2x, 2y)$。 在点 $(1, 2)$： $\nabla f(1, 2) = (2, 4)$.

- 梯度有两个关键属性：

    - **方向**: 它指向最大增加的方向。想象一个山上的徒步者。他们当前位置的梯度指向直上，沿着最陡峭的路径。

    - **大小**: $\|\nabla f\|$给出沿该最陡峭方向的增加速率。较大的梯度意味着地形陡峭；较小的梯度意味着它几乎平坦。

![梯度向量指向山顶，垂直于等高线](../images/gradient_contour.svg)


- 由于梯度指向 uphill，沿着相反方向（$-\nabla f$）向下走，朝更低值的方向。这个简单的想法是 **梯度下降** 的基础，我们将在后续章节中详细探讨。现在的关键 takeaway是，梯度告诉你哪个方向是“上”以及爬坡的陡峭程度。

- **方向导数**是偏导数的推广。它不是询问“$f$在$x$轴上的变化如何？”，而是询问“$f$在任何方向$\mathbf{u}$上的变化如何？”它通过梯度与单位向量的点积来计算。

$$D_{\mathbf{u}} f = \nabla f \cdot \mathbf{u}$$
- 对 $f(x, y) = x^2 + y^2$ 在 $(1, 2)$ 在方向上 $\mathbf{v} = (3, 4)$首先归一化以获取 $\mathbf{u} = (3/5, 4/5)$然后 $D_{\mathbf{u}} f = (2, 4) \cdot (3/5, 4/5) = 6/5 + 16/5 = 22/5$。

- 偏导数是方向导数的特例，方向沿着坐标轴。如果在某个方向上的方向导数为零，则函数在这个方向上在这个点处是平坦的。

- **等高线**（或水平曲线）连接函数值相同的点。对于 $f(x, y) = x^2 + y^2$，等高线是中心在原点的圆：$x^2 + y^2 = c$ 对于不同的 $c$ 值。

- 等高线不会交叉（一个点不能有两个不同的函数值）。

- 梯度总是与等高线垂直，指向数值较高的方向。

- 紧密排列的等高线表示陡峭地形；间距较大的线条表示平缓斜坡。

- 目前，我们的函数只产生一个输出。但许多函数会产生多个输出。函数 $\mathbf{F}: \mathbb{R}^n \to \mathbb{R}^m$ 接受 $n$ 个输入并产生 $m$ 个输出。**雅可比矩阵**组织了此类向量值函数的所有偏导数：

```math
J = \begin{bmatrix} \frac{\partial f_1}{\partial x_1} & \cdots & \frac{\partial f_1}{\partial x_n} \\ \vdots & \ddots & \vdots \\ \frac{\partial f_m}{\partial x_1} & \cdots & \frac{\partial f_m}{\partial x_n} \end{bmatrix}
```

- 每一行是输出组件的梯度。对于一个有3个输入和2个输出的函数，雅可比是一个$2 \times 3$矩阵。

- 约翰逊矩阵将导数推广到向量值函数。

- 与标量函数的导数告诉你输出如何随输入变化不同，雅可比矩阵告诉你每个输出如何随每个输入变化。

- 矩阵的行列式衡量了局部变换如何拉伸或压缩空间。

- 如果行列式为2，小区域面积翻倍。如果为0，则变换将空间压缩到更低维度（回想我们关于矩阵的章节，零行列式意味着奇异、不可逆的变换）。

- 当多个变换组合时（一个接一个），整体映射的雅可比是各个雅可比的乘积。我们将看到这个想法在后续章节中变得至关重要。

- 当梯度捕捉到第一阶信息（斜率）时，**海塞矩阵**捕捉到第二阶信息（曲率）。

- 对于标量函数 $f(x_1, \ldots, x_n)$，Hessian 是所有二阶偏导数构成的 $n \times n$ 矩阵。

```math
H = \begin{bmatrix} \frac{\partial^2 f}{\partial x_1^2} & \frac{\partial^2 f}{\partial x_1 \partial x_2} & \cdots \\ \frac{\partial^2 f}{\partial x_2 \partial x_1} & \frac{\partial^2 f}{\partial x_2^2} & \cdots \\ \vdots & \vdots & \ddots \end{bmatrix}
```

- 对于 $f(x, y) = x^3 + 2xy^2 - y^3$，梯度是 $(3x^2 + 2y^2,\; 4xy - 3y^2)$，Hessian矩阵为：

```math
H = \begin{bmatrix} 6x & 4y \\ 4y & 4x - 6y \end{bmatrix}
```

- 对角线元素（$6x$ 和 $4x - 6y$告诉您如何计算斜率。 $x$-方向随移动而变化 $x$和类似的情况一样， $y$。

- 对角线以外的元素（$4y$）告诉你在某个方向上斜率的变化，随着你移动到另一个方向。

- Clairaut定理保证了对于具有连续二阶导数的函数，混合偏导数相等：$\frac{\partial^2 f}{\partial x \partial y} = \frac{\partial^2 f}{\partial y \partial x}$。

- 这意味着海塞矩阵是正交的，这（正如我们在矩阵章节中看到的）保证了实特征值和正交特征向量。

- 环境变量（Environment Variables）用于存储和管理应用程序运行时的配置信息。

    - 如果 $H$ 是正定的（所有特征值为正），点是局部最小值，表面在每个方向上都向上弯曲，就像一个碗。
    - 如果 $H$ 是负定的（所有特征值为负），点是局部最大值，表面向下弯曲，就像一个倒置的碗。
    - 如果 $H$ 既有正特征值也有负特征值，点是鞍点，表面在某些方向上向上弯曲，在其他方向上向下弯曲，就像一座山峰。

- 多变量链式法则将链式法则扩展到多个变量的函数。如果 $z = f(x, y)$ 是 $x = g(t)$ 和 $y = h(t)$ 的函数，那么：

$$\frac{dz}{dt} = \frac{\partial f}{\partial x}\frac{dx}{dt} + \frac{\partial f}{\partial y}\frac{dy}{dt}$$
- 每个从 $t$ 到 $z$ 的路径贡献一个项：该路径的偏导数乘以中间变量对 $t$ 的导数。

- 例如，如果 $z = x^2 y + 3x - y^2$、$x = \cos(t)$ 和 $y = \sin(t)$：

$$\frac{dz}{dt} = (2xy + 3)(-\sin t) + (x^2 - 2y)(\cos t)$$
- 除了手动计算导数外，还有三种方法：

    - **数值微分**：对于 $f'(x) \approx \frac{f(x+h) - f(x-h)}{2h}$，使用小的 $h$ 进行近似计算。简单但噪声大且不准确。
    - **符号微分**：通过代数规则对表达式进行微分，产生精确的公式。可能会生成非常大的表达式。
    - **自动微分（autodiff）**：跟踪操作链并高效地计算精确导数。这是 JAX、pyTorch 和 TensorFlow 使用的方法。它给出精确的数值结果（而不是近似值），并且不会产生臃肿的符号表达式。

## 编程任务（使用 Colab 或笔记本）

1. 计算 $f(x, y) = x^2 y + 3x - 2y$ 在点 $(1, 2)$ 处的梯度，使用 `jax.grad`。由于 $f$ 接受向量输入，使用 `jax.grad` 与 `argnums`。
```python
import jax
import jax.numpy as jnp

def f(x, y):
    return x**2 * y + 3*x - 2*y

df_dx = jax.grad(f, argnums=0)
df_dy = jax.grad(f, argnums=1)

x, y = 1.0, 2.0
print(f"∂f/∂x = {df_dx(x, y):.4f}  (expected: {2*x*y + 3:.4f})")
print(f"∂f/∂y = {df_dy(x, y):.4f}  (expected: {x**2 - 2:.4f})")
```

2. 计算向量值函数的雅可比矩阵，使用 `jax.jacobian`。与手动计算进行比较。
```python
import jax
import jax.numpy as jnp

def F(x):
    return jnp.array([x[0]**2 + x[1], x[0] * x[1]**2])

J = jax.jacobian(F)
x = jnp.array([1.0, 2.0])
print(f"Jacobian at (1,2):\n{J(x)}")
# Expected: [[2*x[0], 1], [x[1]**2, 2*x[0]*x[1]]] = [[2, 1], [4, 4]]
```

3. 计算Hessian矩阵 $f(x, y) = x^3 + 2xy^2 - y^3$ 使用 `jax.hessian` 然后验证它是否对称。
```python
import jax
import jax.numpy as jnp

def f(xy):
    x, y = xy[0], xy[1]
    return x**3 + 2*x*y**2 - y**3

H = jax.hessian(f)
point = jnp.array([1.0, 2.0])
hess = H(point)
print(f"Hessian:\n{hess}")
print(f"Symmetric: {jnp.allclose(hess, hess.T)}")
# Expected: [[6x, 4y], [4y, 4x-6y]] = [[6, 8], [8, -8]]
```

4. 构建一个从头开始的最小自动微分引擎。
    - 每个 `Var` 跟踪其值和如何通过链式法则向后传播梯度。
    - 尝试扩展它以包含更多操作（除法、幂等数等）。
    - 这是 JAX、PyTorch 和 Numpy 设计的基础。
```python
class Var:
    def __init__(self, val, children=(), backward_fn=None):
        self.val = val
        self.grad = 0.0
        self.children = children
        self.backward_fn = backward_fn

    def __add__(self, other):
        out = Var(self.val + other.val, children=(self, other))
        def _backward():
            self.grad += out.grad    # d(a+b)/da = 1
            other.grad += out.grad   # d(a+b)/db = 1
        out.backward_fn = _backward
        return out

    def __mul__(self, other):
        out = Var(self.val * other.val, children=(self, other))
        def _backward():
            self.grad += other.val * out.grad  # d(a*b)/da = b
            other.grad += self.val * out.grad  # d(a*b)/db = a
        out.backward_fn = _backward
        return out

    def backward(self):
        # topological sort then propagate gradients
        # we will go through this in data structures and algorithms
        order, visited = [], set()
        def topo(v):
            if v not in visited:
                visited.add(v)
                for c in v.children:
                    topo(c)
                order.append(v)
        topo(self)
        self.grad = 1.0
        for v in reversed(order):
            if v.backward_fn:
                v.backward_fn()

# f(x, y) = x*x*y + x  at (3, 2)
x = Var(3.0)
y = Var(2.0)
f = x * x * y + x       # = 3*3*2 + 3 = 21

f.backward()
print(f"f = {f.val}")           # 21.0
print(f"df/dx = {x.grad}")     # 2*x*y + 1 = 13.0
print(f"df/dy = {y.grad}")     # x*x = 9.0
```
