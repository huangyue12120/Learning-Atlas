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

*多元微积分把导数和积分推广到含有多个变量的函数；机器学习模型有数百万个参数，因此这项工具不可或缺。本篇介绍偏导数、梯度、雅可比矩阵、海森矩阵，以及使反向传播成为可能的多变量链式法则。*

- 到目前为止，我们的函数都接收单个输入 $x$ 并产生单个输出 $f(x)$。但在机器学习中，我们几乎从不只处理一个变量。

- 考虑一个含两个变量的函数，例如 $f(x, y) = x^2 + y^2$。它在三维空间中定义了一个碗形曲面。我们想知道：保持 $y$ 不变，只让 $x$ 轻微变化时，$f$ 会怎样变化？这就是**偏导数**要回答的问题。

- $f$ 关于 $x$ 的**偏导数**写作 $\frac{\partial f}{\partial x}$；计算时把其他变量视为常数，再像平常一样对 $x$ 求导。

- 对于 $f(x, y) = x^2y + 3x - 2y$：

$$\frac{\partial f}{\partial x} = 2xy + 3 \qquad \frac{\partial f}{\partial y} = x^2 - 2$$

- 计算 $\frac{\partial f}{\partial x}$ 时把 $y$ 当作常数，因此 $x^2y$ 的导数是 $2xy$，$3x$ 的导数是 $3$，而 $-2y$ 的导数是 $0$。

- 计算 $\frac{\partial f}{\partial y}$ 时把 $x$ 当作常数，因此 $x^2y$ 的导数是 $x^2$，$3x$ 的导数是 $0$，而 $-2y$ 的导数是 $-2$。

- 从几何上看，关于 $x$ 求偏导就像用一张平行于 $xz$ 平面的平面（固定某个 $y$ 值）切开三维曲面，再求所得曲线的斜率。

![偏导数：保持一个变量不变来切开曲面](../images/partial_derivative.svg)

- **梯度**把所有偏导数收集成一个向量：

$$\nabla f = \left(\frac{\partial f}{\partial x_1}, \frac{\partial f}{\partial x_2}, \ldots, \frac{\partial f}{\partial x_n}\right)$$

- 对于 $f(x, y) = x^2 + y^2$，有 $\nabla f(x, y) = (2x, 2y)$。在点 $(1, 2)$ 处，$\nabla f(1, 2) = (2, 4)$。

- 梯度有两个关键性质：

    - **方向**：它指向函数增大最快的方向。想象登山者站在山上，所在位置的梯度正好指向沿最陡路径直线上坡的方向。

    - **大小**：$\|\nabla f\|$ 给出沿最陡方向增加的速率。梯度很大意味着地形陡峭，梯度很小意味着地形接近平坦。

![梯度向量指向上坡方向，并垂直于等高线](../images/gradient_contour.svg)

- 既然梯度指向上坡方向，沿相反方向（$-\nabla f$）移动就会下坡，朝向更小的函数值。这个简单想法是**梯度下降**的基础；梯度下降是我们将在后续章节详细研究的优化技术。现在只要记住：梯度告诉你“上方”在哪里，以及上坡有多陡。

- **方向导数**把偏导数推广到任意方向。它不再问“沿 $x$ 轴移动时 $f$ 如何变化”，而是问“沿任意方向 $\mathbf{u}$ 移动时 $f$ 如何变化”。它等于梯度与单位向量的点积：

$$D_{\mathbf{u}} f = \nabla f \cdot \mathbf{u}$$

- 对于 $f(x, y) = x^2 + y^2$，在 $(1, 2)$ 处沿 $\mathbf{v} = (3, 4)$ 的方向计算方向导数：先归一化得到 $\mathbf{u} = (3/5, 4/5)$，然后 $D_{\mathbf{u}} f = (2, 4) \cdot (3/5, 4/5) = 6/5 + 16/5 = 22/5$。

- 偏导数是方向导数的特殊情况，此时方向沿着某个坐标轴。如果某个方向上的方向导数为零，就表示函数在该点沿这个方向是平坦的。

- **等高线**（或水平曲线）连接函数值相同的点。对于 $f(x, y) = x^2 + y^2$，等高线是以原点为中心的圆：不同的 $c$ 对应 $x^2 + y^2 = c$。

- 等高线不会彼此相交（同一个点不可能有两个不同的函数值）。

- 梯度总是垂直于等高线，并从低值指向高值。

- 等高线靠得很近表示地形陡峭，间距较大表示坡度平缓。

- 到目前为止，我们的函数都产生单个输出。但许多函数会产生多个输出。函数 $\mathbf{F}: \mathbb{R}^n \to \mathbb{R}^m$ 接收 $n$ 个输入并产生 $m$ 个输出。**雅可比矩阵**组织了这种向量值函数的所有偏导数：

```math
J = \begin{bmatrix} \frac{\partial f_1}{\partial x_1} & \cdots & \frac{\partial f_1}{\partial x_n} \\ \vdots & \ddots & \vdots \\ \frac{\partial f_m}{\partial x_1} & \cdots & \frac{\partial f_m}{\partial x_n} \end{bmatrix}
```

- 雅可比矩阵的每一行都是一个输出分量的梯度。对于有 3 个输入和 2 个输出的函数，雅可比矩阵是 $2 \times 3$ 矩阵。

- 雅可比矩阵把导数推广到了向量值函数。

- 正如标量函数的导数告诉你单位输入变化会带来多少输出变化，雅可比矩阵告诉你每个输出相对于每个输入如何变化。

- **雅可比矩阵的行列式**衡量变换在局部把空间拉伸或压缩了多少。

- 如果行列式为 2，足够小的区域面积会加倍；如果为 0，变换会把空间压扁到更低维（回顾矩阵章节：零行列式意味着奇异、不可逆的变换）。

- 当多个变换组合起来（一个变换的输出送入下一个变换）时，整体映射的雅可比矩阵就是各个雅可比矩阵的乘积。我们会看到，这个思想在后续章节中变得非常核心。

- 梯度捕获一阶信息（斜率），而**海森矩阵**捕获二阶信息（曲率）。

- 对于标量函数 $f(x_1, \ldots, x_n)$，海森矩阵是由全部二阶偏导数组成的 $n \times n$ 矩阵：

```math
H = \begin{bmatrix} \frac{\partial^2 f}{\partial x_1^2} & \frac{\partial^2 f}{\partial x_1 \partial x_2} & \cdots \\ \frac{\partial^2 f}{\partial x_2 \partial x_1} & \frac{\partial^2 f}{\partial x_2^2} & \cdots \\ \vdots & \vdots & \ddots \end{bmatrix}
```

- 对于 $f(x, y) = x^3 + 2xy^2 - y^3$，梯度是 $(3x^2 + 2y^2,\; 4xy - 3y^2)$，海森矩阵是：

```math
H = \begin{bmatrix} 6x & 4y \\ 4y & 4x - 6y \end{bmatrix}
```

- 对角线元素（$6x$ 和 $4x - 6y$）告诉你沿 $x$ 方向的斜率随 $x$ 移动如何变化，沿 $y$ 方向也同理。

- 非对角线元素（$4y$）告诉你沿一个方向的斜率随另一个方向移动如何变化。

- **克莱罗定理**保证：对于二阶导数连续的函数，混合偏导数相等：$\frac{\partial^2 f}{\partial x \partial y} = \frac{\partial^2 f}{\partial y \partial x}$。

- 这意味着海森矩阵是对称的，而这又保证它拥有实特征值和正交特征向量（正如矩阵章节所见）。

- 海森矩阵告诉我们临界点（梯度为零）附近函数的形状：

    - 如果 $H$ 正定（所有特征值为正），该点是**局部最小值**；曲面在每个方向都向上弯曲，像一个碗。
    - 如果 $H$ 负定（所有特征值为负），该点是**局部最大值**；曲面向下弯曲，像倒扣的碗。
    - 如果 $H$ 同时有正、负特征值，该点是**鞍点**；曲面在某些方向向上、另一些方向向下，就像山口。

- **多元链式法则**把链式法则推广到多变量函数。如果 $z = f(x, y)$，其中 $x = g(t)$、$y = h(t)$，那么：

$$\frac{dz}{dt} = \frac{\partial f}{\partial x}\frac{dx}{dt} + \frac{\partial f}{\partial y}\frac{dy}{dt}$$

- 从 $t$ 到 $z$ 的每条路径都会贡献一项：沿该路径的偏导数乘以中间变量相对于 $t$ 的导数。

- 例如，如果 $z = x^2 y + 3x - y^2$，$x = \cos(t)$，$y = \sin(t)$：

$$\frac{dz}{dt} = (2xy + 3)(-\sin t) + (x^2 - 2y)(\cos t)$$

- 除了手算导数，还可以使用三种方法：

    - **数值微分**：对较小的 $h$，用 $f'(x) \approx \frac{f(x+h) - f(x-h)}{2h}$ 近似。它简单，但有噪声且不够准确。
    - **符号微分**：代数地应用求导规则，产生精确公式。表达式的大小可能呈指数增长。
    - **自动微分（autodiff）**：跟踪运算链，高效地计算精确导数。JAX、PyTorch 和 TensorFlow 都采用这种方法。它给出精确的数值（不是近似值），又不会生成臃肿的符号表达式。

## 编程任务（使用 Colab 或 notebook）

1. 使用 `jax.grad` 计算 $f(x, y) = x^2 y + 3x - 2y$ 在 $(1, 2)$ 处的梯度。由于 $f$ 接收向量输入，使用带有 `argnums` 的 `jax.grad`。
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

2. 使用 `jax.jacobian` 计算向量值函数的雅可比矩阵，并与手算结果比较。
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

3. 使用 `jax.hessian` 计算 $f(x, y) = x^3 + 2xy^2 - y^3$ 的海森矩阵，并验证它是对称的。
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

4. 从零构建一个最小自动微分引擎。
    - 每个 `Var` 跟踪自己的值，以及如何通过链式法则向后传播梯度。
    - 尝试扩展更多操作（除法、幂等）。
    - 这正是 JAX、PyTorch 和 Numpy 这类系统的基础。
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
