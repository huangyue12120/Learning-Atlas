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
# 基与对偶性

*基为向量空间提供坐标系，对偶空间则说明线性泛函如何作用于向量。本文件介绍线性独立、张成、基变换、对偶空间和余向量，这些概念支撑机器学习中的 PCA、特征变换和注意力查询。*

- 我们已经看到向量属于具有特定维度的空间。基向量决定了我们如何描述这些维度。

- **基**是一组没有冗余的向量；通过缩放和相加（线性组合），它们可以构造空间中的任意向量。它们是描述空间的基本构件。

- 基必须满足两个条件：

    - **线性独立**：一个基向量不能由其他基向量构建。每个都贡献了一个真正的新方向。

    - **张成**：空间中的每个向量都能表示为基向量的线性组合。

- 基向量的数量等于空间的**维度**。在$\mathbb{R}^2$中需要2个，在$\mathbb{R}^3$中需要3个，依此类推。

- 最自然的基是标准基，即每个轴上的单位向量：

    - 在$\mathbb{R}^2$中：$\hat{\mathbf{i}} = (1, 0)$和$\hat{\mathbf{j}} = (0, 1)$
    - 在$\mathbb{R}^3$中：$\hat{\mathbf{i}} = (1, 0, 0)$、$\hat{\mathbf{j}} = (0, 1, 0)$、$\hat{\mathbf{k}} = (0, 0, 1)$

- 任意向量都是这些基向量的加权和。向量 $(3, 2)$ 实际上是 $3\hat{\mathbf{i}} + 2\hat{\mathbf{j}}$；权重 3 和 2 就是它在该基下的**坐标**。

- 标准基并不是唯一的有效基。在 $\mathbb{R}^2$ 中，$(1, 1)$ 和 $(-1, 1)$ 也构成一组基。它们线性独立，能够张成整个平面；同一个向量在这组新基下会有不同坐标。

- **基变换**用另一组基重新表示同一个向量。向量本身没有移动，改变的是描述它的坐标。

- 具体做法是乘以**基变换矩阵** $P$。$P$ 的各列是新基向量在旧坐标系中的坐标；要换回原坐标，需要乘以 $P^{-1}$。

- 想象两个朋友为同一家咖啡馆指路。你用街道坐标：$(3, 2)$ 表示“向东 3 个街区，向北 2 个街区”。朋友用对角线坐标：$\mathbf{b}_1 = (1, 1)$（东北）和 $\mathbf{b}_2 = (-1, 1)$（西北）。同一家咖啡馆可以用两种坐标语言描述。

- 朋友说咖啡馆的坐标是 $(2.5, -0.5)$：“沿东北方向走 2.5 步，再沿西北方向反向走 0.5 步。”要把它换成街道坐标，只需按这条规则计算：

$$2.5 \begin{bmatrix} 1 \\ 1 \end{bmatrix} - 0.5 \begin{bmatrix} -1 \\ 1 \end{bmatrix} = \begin{bmatrix} 3 \\ 2 \end{bmatrix}$$
- 这正是你所说的 $(3, 2)$！

- “按规则计算”正是乘以 $P$：把朋友的基向量作为列堆叠起来，再乘以朋友的坐标向量，就得到 2.5 个第一列向量加上 -0.5 个第二列向量：

$$P = \begin{bmatrix} 1 & -1 \\ 1 & 1 \end{bmatrix}, \qquad P \begin{bmatrix} 2.5 \\ -0.5 \end{bmatrix} = \begin{bmatrix} 3 \\ 2 \end{bmatrix}$$
- 反过来，把你的 $(3, 2)$ 换成朋友的坐标，就是撤销这条规则；乘以 $P^{-1}$ 正好完成这一步：

$$P^{-1} \begin{bmatrix} 3 \\ 2 \end{bmatrix} = \begin{bmatrix} 2.5 \\ -0.5 \end{bmatrix}$$
- 没有任何东西移动。$(3, 2)$ 和 $(2.5, -0.5)$ 是同一个点的两种描述，而 $P$ 是在两种描述之间转换的字典。

- 基变换在机器学习中很常见。例如，PCA 找到一组新的基（主成分），让坐标轴对齐数据变化最大的方向，从而更容易分析数据。

- 下面的概念更抽象，但后续章节会把它们用于具体问题。

- 再看一个关键观点：写下 $\mathbf{v} = (3, 2)$ 时，坐标 3 和 2 来自沿各个基方向测量 $\mathbf{v}$ 的结果。第一个坐标问“$\mathbf{v}$ 中有多少个 $\hat{\mathbf{i}}$？”，第二个问“有多少个 $\hat{\mathbf{j}}$？”。

- 在咖啡馆的例子中，这些测量对应朋友提出的问题：“你沿东北方向走了多远？”“你沿西北方向走了多远？”每组基都有一组对应的问题，每个方向一个。

- 每个问题都对应一个**线性泛函**：它接收一个向量并返回一个标量读数。

- “线性”表示这个泛函保持向量空间的两种运算：测量向量和会得到读数之和，把向量加倍，读数也会加倍：

$$f(\mathbf{u} + \mathbf{v}) = f(\mathbf{u}) + f(\mathbf{v}), \qquad f(c\mathbf{v}) = c\,f(\mathbf{v})$$
- 换句话说，线性泛函就是测量向量的“标尺”。向量是被测对象，线性泛函是测量它们的标尺，而所有可能标尺组成的集合就是**对偶空间** $V^\ast$。

- 对于每组基 $\{\mathbf{e}_1, \mathbf{e}_2, \ldots, \mathbf{e}_n\}$，都有一组匹配的标尺，称为**对偶基** $\{\mathbf{e}_1^\ast, \mathbf{e}_2^\ast, \ldots, \mathbf{e}_n^\ast\}$。其中 $\mathbf{e}_i^\ast$ 只回答一个问题：“向量中有多少个 $\mathbf{e}_i$？”标尺在自己的基向量上读数为 1，在其他基向量上读数为 0，这个关系用**克罗内克 δ（Kronecker delta）** $\delta_{ij}$ 表示：

```math
\mathbf{e}_i^\ast(\mathbf{e}_j) = \delta_{ij} = \begin{cases} 1 & \text{if } i = j \\ 0 & \text{if } i \neq j \end{cases}
```

- 只要确定线性泛函在各基向量上的取值，就能确定它在任意向量上的取值。以 $\mathbf{e}_1^\ast$ 为例，它读取 $\mathbf{v} = 3\mathbf{e}_1 + 2\mathbf{e}_2$ 的第一个坐标：

$$\mathbf{e}_1^\ast(3\mathbf{e}_1 + 2\mathbf{e}_2) = 3\,\mathbf{e}_1^\ast(\mathbf{e}_1) + 2\,\mathbf{e}_1^\ast(\mathbf{e}_2) = 3 \cdot 1 + 2 \cdot 0 = 3$$
- 这个标尺忽略其他方向，只报告对应坐标。坐标就是对偶基的读数。

- 在 $\mathbb{R}^n$ 中，每个线性泛函都可以表示为一行系数与向量的点积。把 $(3, 2)$ 转换成朋友的坐标需要乘以 $P^{-1}$，因此 $P^{-1}$ 的每一行就是一个标尺。**$P^{-1}$ 的行构成对偶基**：

$$P^{-1} = \frac{1}{2}\begin{bmatrix} 1 & 1 \\ -1 & 1 \end{bmatrix} \quad\Rightarrow\quad \mathbf{b}_1^\ast = (0.5,\ 0.5), \qquad \mathbf{b}_2^\ast = (-0.5,\ 0.5)$$
- 咖啡馆的例子也验证了这一点：$\mathbf{b}_1^\ast \cdot (3, 2) = 0.5 \cdot 3 + 0.5 \cdot 2 = 2.5$，正好得到朋友坐标的第一项。基变换用另一组基表示同一个向量，对偶基则读取这组坐标。

- $P^{-1}P = I$ 也说明了校准规则：第 $i$ 个标尺在第 $i$ 个基向量上读数为 1，在其他基向量上读数为 0。单位矩阵就是把克罗内克 δ 写成表格。

- 注意不要把 $\mathbf{b}_1$ 本身当作对应标尺：与 $(1, 1)$ 做点积得到 $(1, 1) \cdot (3, 2) = 5$，是正确坐标 2.5 的两倍。只有在**正交归一基**中，点积才会直接读出坐标；标准基就是这种情况。对其他基，标尺位于 $P^{-1}$ 的各行中。

- 这也解释了点积的双重作用：每个向量 $\mathbf{u}$ 都能通过 $\mathbf{u} \cdot \mathbf{v}$ 定义一个测量 $\mathbf{v}$ 的标尺；在有限维空间中，每个标尺也都可由某个向量的点积表示。因此，对偶空间可以看作原空间的镜像。

- 对偶性贯穿许多实际方法：坐标是对偶基的读数，点积是对偶配对，神经网络中的注意力则让一组向量“查询”另一组向量。

## 编程任务（使用 Colab 或笔记本）

1. 用两组不同的基表示同一个向量，并验证它们代表同一个点。尝试自选一组基，看看这个向量的坐标如何变化。
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

2. 根据任务 1 中 $P^{-1}$ 的各行构造朋友那组基的对偶基，并验证每个标尺恰好读出一个坐标。再确认：只有在正交归一基中，与基向量做点积才能直接读出对应坐标。
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
