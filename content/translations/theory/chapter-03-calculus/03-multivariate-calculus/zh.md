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
# 多元微积分

*多元微积分把导数和积分推广到多元函数，是分析含有数百万个参数的机器学习模型所需的工具。本文件介绍偏导数、梯度、雅可比矩阵、Hessian 矩阵和多元链式法则。*

- 此前的函数只接收一个输入 $x$，并产生一个输出 $f(x)$。机器学习中的函数往往依赖多个变量。

- 以二元函数 $f(x, y) = x^2 + y^2$ 为例，它描述了三维空间中的碗状曲面。如果保持 $y$ 不变、稍微改变 $x$，$f$ 会如何变化？偏导数描述的就是这种变化。

- $f$ 对 $x$ 的**偏导数**记作 $\frac{\partial f}{\partial x}$。求偏导时，把其他变量视为常数，再对 $x$ 求导。

- 对于 $f(x, y) = x^2y + 3x - 2y$:

$$\frac{\partial f}{\partial x} = 2xy + 3 \qquad \frac{\partial f}{\partial y} = x^2 - 2$$
- 求 $\frac{\partial f}{\partial x}$ 时，把 $y$ 视为常数：$x^2y$ 求导得 $2xy$，$3x$ 求导得 $3$，$-2y$ 求导得 $0$。

- 求 $\frac{\partial f}{\partial y}$ 时，把 $x$ 视为常数：$x^2y$ 求导得 $x^2$，$3x$ 求导得 $0$，$-2y$ 求导得 $-2$。

- 几何上，对 $x$ 求偏导相当于固定 $y$，用一个平行于 $xz$ 平面的平面截取该曲面，再求截面曲线的斜率。

![部分导数：通过固定一个变量切片表面](../images/partial_derivative.svg)


- 梯度将所有偏导数收集到一个向量中：

$$\nabla f = \left(\frac{\partial f}{\partial x_1}, \frac{\partial f}{\partial x_2}, \ldots, \frac{\partial f}{\partial x_n}\right)$$
- 对于 $f(x, y) = x^2 + y^2$： $\nabla f(x, y) = (2x, 2y)$。 在点 $(1, 2)$： $\nabla f(1, 2) = (2, 4)$.

- 梯度有两个重要性质：

    - **方向**：梯度指向函数值增长最快的方向。

    - **模长**：$\|\nabla f\|$ 表示函数沿最陡方向的最大增长率。模长越大，函数在该处变化越快。

![梯度向量指向山顶，垂直于等高线](../images/gradient_contour.svg)


- 梯度指向函数增大的方向，因此沿相反方向（$-\nabla f$）移动就会朝更低的函数值前进。这个想法构成 **梯度下降** 的基础：梯度告诉你上坡方向以及上升的陡峭程度。

- **方向导数**把偏导数推广到任意单位方向，用来描述函数沿该方向的变化率；它等于梯度与该单位向量的点积：

$$D_{\mathbf{u}} f = \nabla f \cdot \mathbf{u}$$
- 对于 $f(x, y) = x^2 + y^2$，在点 $(1, 2)$ 沿 $\mathbf{v} = (3, 4)$ 的方向，先归一化得到 $\mathbf{u} = (3/5, 4/5)$，于是 $D_{\mathbf{u}} f = (2, 4) \cdot (3/5, 4/5) = 6/5 + 16/5 = 22/5$。

- 偏导数是方向导数的特例，方向沿着坐标轴。如果在某个方向上的方向导数为零，则函数在这个方向上在这个点处是平坦的。

- **等高线**（或水平曲线）连接函数值相同的点。对于 $f(x, y) = x^2 + y^2$，等高线是中心在原点的圆：$x^2 + y^2 = c$ 对于不同的 $c$ 值。

- 等高线不会交叉（一个点不能有两个不同的函数值）。

- 在梯度非零处，梯度垂直于等高线，并指向函数值增大的方向。

- 紧密排列的等高线表示陡峭地形；间距较大的线条表示平缓斜坡。

- 目前，我们的函数只产生一个输出。但许多函数会产生多个输出。函数 $\mathbf{F}: \mathbb{R}^n \to \mathbb{R}^m$ 接受 $n$ 个输入并产生 $m$ 个输出。**雅可比矩阵**组织了此类向量值函数的所有偏导数：

```math
J = \begin{bmatrix} \frac{\partial f_1}{\partial x_1} & \cdots & \frac{\partial f_1}{\partial x_n} \\ \vdots & \ddots & \vdots \\ \frac{\partial f_m}{\partial x_1} & \cdots & \frac{\partial f_m}{\partial x_n} \end{bmatrix}
```

- 雅可比矩阵的每一行是一个输出分量的梯度。对于一个有 3 个输入和 2 个输出的函数，雅可比矩阵是一个 $2 \times 3$ 矩阵。

- 雅可比矩阵将导数推广到向量值函数。

- 与标量函数的导数告诉你输出如何随输入变化不同，雅可比矩阵告诉你每个输出如何随每个输入变化。

- 当变换的输入和输出维数相同时，雅可比矩阵是方阵；它的行列式衡量局部面积或体积的缩放倍数。**编者注：**非方阵雅可比没有行列式。

- 如果行列式为 2，小区域的面积就会翻倍。如果为 0，则变换会把空间压缩到更低维度（回想矩阵章节：零行列式意味着变换奇异且不可逆）。

- 当多个变换组合时（一个接一个），整体映射的雅可比是各个雅可比的乘积。我们将看到这个想法在后续章节中变得至关重要。

- 梯度捕捉一阶信息（斜率），而 **Hessian 矩阵**捕捉二阶信息（曲率）。

- 对于标量函数 $f(x_1, \ldots, x_n)$，Hessian 矩阵是由所有二阶偏导数构成的 $n \times n$ 矩阵。

```math
H = \begin{bmatrix} \frac{\partial^2 f}{\partial x_1^2} & \frac{\partial^2 f}{\partial x_1 \partial x_2} & \cdots \\ \frac{\partial^2 f}{\partial x_2 \partial x_1} & \frac{\partial^2 f}{\partial x_2^2} & \cdots \\ \vdots & \vdots & \ddots \end{bmatrix}
```

- 对于 $f(x, y) = x^3 + 2xy^2 - y^3$，梯度是 $(3x^2 + 2y^2,\; 4xy - 3y^2)$，Hessian 矩阵为：

```math
H = \begin{bmatrix} 6x & 4y \\ 4y & 4x - 6y \end{bmatrix}
```

- 对角线元素（$6x$ 和 $4x - 6y$）分别表示沿 $x$ 和 $y$ 方向移动时，相应方向的斜率如何变化。

- 非对角线元素（$4y$）表示沿一个方向移动时，另一个方向的斜率如何变化。

- **Clairaut 定理**保证，对于具有连续二阶导数的函数，混合偏导数相等：$\frac{\partial^2 f}{\partial x \partial y} = \frac{\partial^2 f}{\partial y \partial x}$。

- 这意味着 Hessian 矩阵是对称矩阵；实对称矩阵的特征值为实数，属于不同特征值的特征向量彼此正交。

- Hessian 矩阵描述函数在临界点（梯度为零）附近的形状：

    - 如果 $H$ 是正定的（所有特征值为正），点是局部最小值，表面在每个方向上都向上弯曲，就像一个碗。
    - 如果 $H$ 是负定的（所有特征值为负），点是局部最大值，表面向下弯曲，就像一个倒置的碗。
    - 如果 $H$ 既有正特征值也有负特征值，点是鞍点，表面在某些方向上向上弯曲、在其他方向上向下弯曲，就像山口。

- 多元链式法则将链式法则扩展到多个变量的函数。如果 $z = f(x, y)$ 是 $x = g(t)$ 和 $y = h(t)$ 的函数，那么：

$$\frac{dz}{dt} = \frac{\partial f}{\partial x}\frac{dx}{dt} + \frac{\partial f}{\partial y}\frac{dy}{dt}$$
- 每个从 $t$ 到 $z$ 的路径贡献一个项：该路径的偏导数乘以中间变量对 $t$ 的导数。

- 例如，如果 $z = x^2 y + 3x - y^2$、$x = \cos(t)$ 和 $y = \sin(t)$：

$$\frac{dz}{dt} = (2xy + 3)(-\sin t) + (x^2 - 2y)(\cos t)$$
- 除了手动计算导数外，还有三种方法：

    - **数值微分**：对于 $f'(x) \approx \frac{f(x+h) - f(x-h)}{2h}$，使用小的 $h$ 进行近似计算。简单但噪声大且不准确。
    - **符号微分**：通过代数规则对表达式进行微分，产生精确的公式。可能会生成非常大的表达式。
    - **自动微分（autodiff）**：沿运算链应用链式法则，高效计算导数的数值。JAX、PyTorch 和 TensorFlow 都使用自动微分。它不靠有限差分近似，也不会像符号微分那样展开成庞大表达式；结果仅受浮点舍入误差影响。

## 编程任务（使用 Colab 或笔记本）

1. 用 `jax.grad` 计算 $f(x, y) = x^2 y + 3x - 2y$ 在点 $(1, 2)$ 处的梯度。函数有两个标量参数，可用 `argnums` 分别计算对 $x$ 和 $y$ 的偏导数。**编者注：**原文称 $f$ 接受向量输入，与示例代码不符。
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

3. 使用 `jax.hessian` 计算 $f(x, y) = x^3 + 2xy^2 - y^3$ 的 Hessian 矩阵，然后验证它是否对称。
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

4. 从头编写一个最小的自动微分引擎。
    - 每个 `Var` 保存自身的值，以及如何沿链式法则向后传播梯度。
    - 尝试加入除法、幂运算等操作。
    - 自动微分是 JAX、PyTorch 等框架的重要机制。**编者注：**NumPy 本身不提供自动微分；原文将它与 JAX、PyTorch 并列不准确。
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
