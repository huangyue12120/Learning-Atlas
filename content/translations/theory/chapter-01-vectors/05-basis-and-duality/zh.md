---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 01 - vectors/05. basis and duality.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: aecbf0a19ef6ef139ef07ccb978b9760cd5c40c0852729313244238cdd70fedc
status: reviewed
---
# 基础与对偶性

*线性空间的基定义了坐标系，而对偶揭示了线性函数如何作用于向量。本文件涵盖了线性独立、覆盖集、基变换、对偶空间和 covector的概念，这些概念是PCA、特征变换和注意力查询在ML中的基础。*

- 我们已经看到向量生活在具有特定维度的某个空间中。但什么是定义这些维度的？这就是基向量登场的时候了。

- **基**是一个集合，可以构建空间中的任何其他向量，通过缩放和相加（线性组合），没有冗余。它们是空间的基石。

- 基必须满足两个条件：

    - **线性独立**：一个基向量不能由其他基向量构建。每个都贡献了一个真正的新方向。

    - **覆盖**：空间中的每一个向量都可以通过基向量的组合表示出来。没有遗漏任何东西。

- 基向量的数量等于空间的**维度**。在$\mathbb{R}^2$中需要2个，在$\mathbb{R}^3$中需要3个，依此类推。

- 最自然的基是标准基，即每个轴上的单位向量：

    - 在$\mathbb{R}^2$中：$\hat{\mathbf{i}} = (1, 0)$和$\hat{\mathbf{j}} = (0, 1)$
    - 在$\mathbb{R}^3$中：$\hat{\mathbf{i}} = (1, 0, 0)$、$\hat{\mathbf{j}} = (0, 1, 0)$、$\hat{\mathbf{k}} = (0, 0, 1)$

- 任何向量都是这些基向量的加权和。向量$(3, 2)$实际上是$3\hat{\mathbf{i}} + 2\hat{\mathbf{j}}$。权重（3和2）是该向量在该基中的**坐标**。

- 但标准基并不是唯一的有效基。在$\mathbb{R}^2$中，向量$(1, 1)$和$(-1, 1)$也形成了一个基。它们是线性独立的，并且可以到达平面上的任何点。同样的向量在新的基中将会有不同的坐标。

- **基变换**重新描述了同一个向量使用不同的基。向量没有移动，只是从不同的角度来描述它。

- 这是通过乘以一个**基变换矩阵**$P$来完成的，其列是新基向量在旧坐标系中的表示。要返回原基，乘以$P^{-1}$。

- 想象一下两个朋友给出同一个咖啡馆的路线。你导航时使用街道：$(3, 2)$意味着“3个街区向东，2个街区向北”。你的朋友导航时使用对角线：他们的方向是$\mathbf{b}_1 = (1, 1)$（东北）和$\mathbf{b}_2 = (-1, 1)$（西北），这是之前提到的新基。同一个咖啡馆，两种语言描述如何到达那里。

- 你的朋友说咖啡馆在$(2.5, -0.5)$：“沿着我的东北对角线走2.5步，然后向后半步沿着我的东北西对角线”。要找出这在你街道语言中的含义，你只需按照他们的配方进行：

$$2.5 \begin{bmatrix} 1 \\ 1 \end{bmatrix} - 0.5 \begin{bmatrix} -1 \\ 1 \end{bmatrix} = \begin{bmatrix} 3 \\ 2 \end{bmatrix}$$
- 这正是你叫的$(3, 2)$！

- 那“按照配方”这一步正是乘以$P$所做。将朋友的基向量作为列堆叠起来，然后用他们坐标向量相乘，得到2.5个第一个列和-0.5个第二个列，配方又写得紧凑一点：

$$P = \begin{bmatrix} 1 & -1 \\ 1 & 1 \end{bmatrix}, \qquad P \begin{bmatrix} 2.5 \\ -0.5 \end{bmatrix} = \begin{bmatrix} 3 \\ 2 \end{bmatrix}$$
- 反过来，从你的$(3, 2)$翻译到朋友的语言，意味着**逆向**配方，而逆向乘以$P$正是乘以$P^{-1}$所做：

$$P^{-1} \begin{bmatrix} 3 \\ 2 \end{bmatrix} = \begin{bmatrix} 2.5 \\ -0.5 \end{bmatrix}$$
- 没有移动。$(3, 2)$和$(2.5, -0.5)$是同一个点的两种描述，而$P$是翻译它们之间的字典。

- 在ML中，基变换经常出现。例如，PCA找到一个新的基（主成分），其中数据更容易理解，轴与最大变异的方向对齐。

- 接下来的概念会更加抽象和难以理解，直到我们后来在后续章节中应用这些概念时，所以请做好心理准备，抱歉。

- 现在，这里隐藏着一个更深层次的想法。当我们写 $\mathbf{v} = (3, 2)$ 时，坐标 3 和 2 实际上是通过测量 $\mathbf{v}$ 在每个基方向上的结果。第一个坐标询问“ $\hat{\mathbf{i}}$ 在 $\mathbf{v}$ 中有多少？”第二个坐标询问“ $\hat{\mathbf{j}}$ 中有多少？”

- 在咖啡故事中，这些测量是朋友的问题：你向东北方向走了多远？和你向西北方向走了多远？每个基底都有自己的问题集，每种方向一个。

- 每个问题都是 **线性函数**：它接受一个向量作为输入，并返回一个单个数字，即读数。

- 词“线性”意味着功能尊重两个向量空间的操作。测量向量的和得到的是读数的总和；将一个向量加倍，读数也加倍：

$$f(\mathbf{u} + \mathbf{v}) = f(\mathbf{u}) + f(\mathbf{v}), \qquad f(c\mathbf{v}) = c\,f(\mathbf{v})$$
- -换句话说，线性函数是诚实的 rulers。向量是对象，线性函数是测量它们的 rulers，而所有可能的 rulers形成的集合就是**对偶空间** $V^\ast$。

- 对于每个基础 $\{\mathbf{e}_1, \mathbf{e}_2, \ldots, \mathbf{e}_n\}$，都有一个匹配的 rulerset，即 **dual basis** $\{\mathbf{e}_1^\ast, \mathbf{e}_2^\ast, \ldots, \mathbf{e}_n^\ast\}$。其中 $\mathbf{e}_i^\ast$ 仅回答一个问题："有多少步 $\mathbf{e}_i$？"。一个精心设计的 ruler 在其自己的基础向量上读取1，并完全忽略其他所有向量，这种写法使用了 **Kronecker delta** $\delta_{ij}$:

```math
\mathbf{e}_i^\ast(\mathbf{e}_j) = \delta_{ij} = \begin{cases} 1 & \text{if } i = j \\ 0 & \text{if } i \neq j \end{cases}
```

- 这个微小的校准规则就是尺子需要的全部，因为线性就足够了。观察 $\mathbf{e}_1^\ast$ 读取 $\mathbf{v} = 3\mathbf{e}_1 + 2\mathbf{e}_2$ 的第一个坐标：

$$\mathbf{e}_1^\ast(3\mathbf{e}_1 + 2\mathbf{e}_2) = 3\,\mathbf{e}_1^\ast(\mathbf{e}_1) + 2\,\mathbf{e}_1^\ast(\mathbf{e}_2) = 3 \cdot 1 + 2 \cdot 0 = 3$$
- 该统治者只关注自己的方向，并报告坐标。坐标是双基读数。

- 那么一个 ruler具体长什么样呢？在 $\mathbb{R}^n$ 中，每一个线性函数都只是将一行数字应用到点积上。而我们已经通过构建朋友的基来建立这些 rulers：将 $(3, 2)$ 转换为朋友的语言意味着乘以 $P^{-1}$，每一行 $P^{-1}$ 产生一个坐标。** $P^{-1}$ 的行是双基**：

$$P^{-1} = \frac{1}{2}\begin{bmatrix} 1 & 1 \\ -1 & 1 \end{bmatrix} \quad\Rightarrow\quad \mathbf{b}_1^\ast = (0.5,\ 0.5), \qquad \mathbf{b}_2^\ast = (-0.5,\ 0.5)$$
- 检查它与咖啡馆之旅： $\mathbf{b}_1^\ast \cdot (3, 2) = 0.5 \cdot 3 + 0.5 \cdot 2 = 2.5$，正好是朋友的第一个坐标。这个文件的两部分是一个概念：变换基交换了建筑块，而对偶基是匹配的新坐标读取器集合。

- 算法规则藏在明处：$P^{-1}P = I$明确指出， ruler $i$读取basis vector $i$为1，其他为0。单位矩阵是克罗内克delta写成表格的形式。

- 注意。猜测 $\mathbf{b}_1$ 的 ruler 是 $\mathbf{b}_1$ 自身，即只用点乘 $(1, 1)$。但 $(1, 1) \cdot (3, 2) = 5$ 是 2.5 的真坐标值的两倍。只有在 **正交** 基底下（彼此垂直，每个长度为 1），点乘才会读出其自身坐标，就像标准基底一样。这就是为什么 $\mathbf{e}_1^\ast$ 和 $\mathbf{e}_1$ 看起来相同的原因。对于其他任何基底， rulers 都位于 $P^{-1}$ 的行中。

- 这也可以解释点积的双重身份。每一个向量 $\mathbf{u}$ 秘密地定义了一个统治者（度量） $\mathbf{v}$ 通过计算 $\mathbf{u} \cdot \mathbf{v}$然后，每个统治者都是某个向量的点积。在有限维数中，对偶空间本质上是原始空间的镜像。

- 对于现在看来，对偶性可能显得抽象，但它在许多实际想法中都起着基础作用：坐标是双基评估，点积是一种对偶配对，而神经网络中的注意力操作通过一个向量集“查询”另一个向量来实现，这正是对偶性的体现。

## 编程任务（使用 CoLab 或笔记本）

1. 表达向量在两个不同的基底中，并验证它们代表同一个点。尝试创建自己的基底，看看这个向量会得到什么坐标。
```python
import jax.numpy as jnp

v = jnp.array([3.0, 2.0])

# Standard basis: coordinates are just the components
print(f"Standard basis coords: {v}")

# New basis: (1,1) and (-1,1)
P = jnp.array([[1.0, -1.0],
               [1.0,  1.0]])
new_coords = jnp.linalg.solve(P, v)
print(f"New basis coords: {new_coords}")

# Verify: reconstruct from new coords
reconstructed = new_coords[0] * P[:, 0] + new_coords[1] * P[:, 1]
print(f"Reconstructed: {reconstructed}")
```

2. 从任务1（P⁻¹的行）构建朋友的基底的对偶基，并验证每个标尺读出恰好一个坐标。然后看看点乘一个基底向量本身只适用于正交基底。
```python
import jax.numpy as jnp

v = jnp.array([3.0, 2.0])

# The friend's basis (1,1) and (-1,1), stacked as columns
P = jnp.array([[1.0, -1.0],
               [1.0,  1.0]])

# The dual basis: the rows of P^{-1}
P_inv = jnp.linalg.inv(P)
b1_star, b2_star = P_inv[0], P_inv[1]
print(f"b1* = {b1_star}, b2* = {b2_star}")

# Each ruler reads one coordinate in the friend's basis (matches task 1!)
print(f"b1*(v) = {jnp.dot(b1_star, v)}")  # 2.5
print(f"b2*(v) = {jnp.dot(b2_star, v)}")  # -0.5

# Calibration: 1 on its own basis vector, 0 on the other
print(f"b1*(b1) = {jnp.dot(b1_star, P[:, 0])}, b1*(b2) = {jnp.dot(b1_star, P[:, 1])}")

# The trap: dotting with b1 itself does NOT give the coordinate
print(f"b1 . v = {jnp.dot(P[:, 0], v)}  (5.0, not 2.5 -- b1 is not orthonormal)")

# The standard basis IS orthonormal, so there the shortcut works
e1 = jnp.array([1.0, 0.0])
print(f"e1 . v = {jnp.dot(e1, v)}  (3.0, the first standard coordinate)")
```
