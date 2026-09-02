---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 02 - matrices/03. operations.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 3627030fc60d19cc16f1010a0f73f8d744168e2e4e80c6b66f30e118e2aaabdc
status: reviewed
---

# 矩阵运算

*矩阵运算是深度学习的计算引擎。本篇涵盖矩阵加法、标量乘法、矩阵—向量乘法、矩阵乘法、逐元素运算、克罗内克积和广播；每一次前向传播和梯度更新都建立在这些运算之上。*

- 矩阵可以像向量一样相加和缩放。

- 相加时，两个矩阵必须具有相同维度，并逐元素相加：

```math
\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix} + \begin{bmatrix} 5 & 6 \\ 7 & 8 \end{bmatrix} = \begin{bmatrix} 6 & 8 \\ 10 & 12 \end{bmatrix}
```

- 标量乘法则是把每个元素乘以这个标量：

```math
3 \times \begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix} = \begin{bmatrix} 3 & 6 \\ 9 & 12 \end{bmatrix}
```

- 对矩阵最简单的操作，是把它与向量相乘。**矩阵—向量乘法** $A\mathbf{x}$ 使用 $\mathbf{x}$ 中的元素作为权重，对 $A$ 的列进行组合：

```math
\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix} \begin{bmatrix} 5 \\ 6 \end{bmatrix} = 5 \begin{bmatrix} 1 \\ 3 \end{bmatrix} + 6 \begin{bmatrix} 2 \\ 4 \end{bmatrix} = \begin{bmatrix} 17 \\ 39 \end{bmatrix}
```

- 这是机器学习的核心运算。每个神经网络层都会计算 $A\mathbf{x} + \mathbf{b}$：矩阵乘输入向量，再加上偏置。

- 一般情况是**矩阵乘法**。给定 $A$（$m \times n$）和 $B$（$n \times p$），乘积 $C = AB$ 是一个 $m \times p$ 矩阵，其中每个元素都是一个点积：

$$C_{ij} = \sum_{k=1}^{n} A_{ik} B_{kj}$$

- 结果中的每个元素，都是 $A$ 的一行与 $B$ 的一列的点积。内维度必须匹配（都是 $n$），结果采用外维度（$m \times p$）。

- 还可以这样理解：结果的每一列都是 $A$ 的各列的**加权和**，权重来自 $B$ 中对应的那一列。

- 如果 $B$ 有一列为 $[2, 3]^T$，那么结果中对应的列就是 $A$ 的第 1 列乘以 2，再加上第 2 列乘以 3。

- 一个有用的特殊情况是：矩阵乘以自己的转置总会得到方阵。$AA^T$ 是 $m \times m$，而 $A^TA$ 是 $n \times n$：

```math
\begin{bmatrix} 1 & 2 & 3 \\ 4 & 5 & 6 \end{bmatrix} \begin{bmatrix} 1 & 4 \\ 2 & 5 \\ 3 & 6 \end{bmatrix} = \begin{bmatrix} 14 & 32 \\ 32 & 77 \end{bmatrix}
```

- 矩阵乘法有几个重要规则：

    - **不满足交换律**：一般来说 $AB \neq BA$，顺序很重要。

    - **满足结合律**：$(AB)C = A(BC)$，可以任意组合乘法。

    - **满足分配律**：$A(B + C) = AB + AC$。

    - **单位元**：$AI = IA = A$。

- **Hadamard 积**（逐元素积）把两个同形矩阵逐项相乘，记作 $A \odot B$：

```math
\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix} \odot \begin{bmatrix} 5 & 6 \\ 7 & 8 \end{bmatrix} = \begin{bmatrix} 5 & 12 \\ 21 & 32 \end{bmatrix}
```

- 与标准矩阵乘法不同，Hadamard 积满足交换律（$A \odot B = B \odot A$），并要求两个矩阵维度相同。在机器学习中，它常用于门控：与取值在 0 到 1 之间的掩码逐元素相乘，可以控制每个元素有多少“通过”。

- 两个向量 $\mathbf{u}$ 和 $\mathbf{v}$ 的**外积**会生成一个矩阵：$\mathbf{u}\mathbf{v}^T$。其中每个元素都是 $\mathbf{u}$ 的一个元素与 $\mathbf{v}$ 的一个元素的乘积：

```math
\begin{bmatrix} 1 \\ 2 \\ 3 \end{bmatrix} \begin{bmatrix} 4 & 5 \end{bmatrix} = \begin{bmatrix} 4 & 5 \\ 8 & 10 \\ 12 & 15 \end{bmatrix}
```

- 结果的秩总是 1，因为每一行都是 $\mathbf{v}^T$ 的缩放版本。任意矩阵都可以表示为秩一外积之和，这正是 SVD 的工作方式（将在“矩阵分解”中介绍）。

- 矩阵乘法的计算成本很高。两个 $n \times n$ 矩阵相乘需要 $O(n^3)$ 次运算。对于 $1000 \times 1000$ 的矩阵，就是 10 亿次乘法。

- 当矩阵是**稀疏的**（大部分元素为零）时，朴素乘法会浪费时间去乘以零。**压缩稀疏行（Compressed Sparse Row，CSR）**格式只存储非零元素及其位置：

    - **值**：按行排列的非零元素
    - **列索引**：每个值所属的列
    - **行偏移**：每行在值列表中的起始位置

- 例如，矩阵：

```math
A = \begin{bmatrix} 5 & 0 & 0 & 2 \\ 0 & 0 & 3 & 0 \\ 0 & 0 & 0 & -1 \end{bmatrix}
```

- 会存储为：values = [5, 2, 3, -1]，columns = [0, 3, 2, 3]，row offsets = [0, 2, 3, 4]。这样跳过所有零元素，稀疏运算会快得多。

- 矩阵的一个核心用途是求解**线性方程组**。方程组 $A\mathbf{x} = \mathbf{b}$ 问的是：“向量 $\mathbf{x}$ 经过 $A$ 变换后，怎样得到 $\mathbf{b}$？”

- 例如，假设你在买水果。每个苹果的价格是 $x_1$ 美元，每根香蕉的价格是 $x_2$ 美元。你知道 2 个苹果和 1 根香蕉共 5 美元，1 个苹果和 3 根香蕉共 10 美元。用矩阵表示：

```math
\begin{bmatrix} 2 & 1 \\ 1 & 3 \end{bmatrix} \begin{bmatrix} x_1 \\ x_2 \end{bmatrix} = \begin{bmatrix} 5 \\ 10 \end{bmatrix}
```

- 逐行将矩阵乘向量（每一行与 $[x_1, x_2]^T$ 做点积），就得到两个方程：

$$2x_1 + 1x_2 = 5 \qquad \text{(row 1)} \qquad \qquad x_1 + 3x_2 = 10 \qquad \text{(row 2)}$$

- 由第 1 行得 $x_2 = 5 - 2x_1$。代入第 2 行：$x_1 + 3(5 - 2x_1) = 10$，得到 $x_1 = 1$，进而 $x_2 = 3$。苹果每个 1 美元，香蕉每根 3 美元。

- 验证一下——结果确实成立：

```math
\begin{bmatrix} 2 & 1 \\ 1 & 3 \end{bmatrix} \begin{bmatrix} 1 \\ 3 \end{bmatrix} = \begin{bmatrix} 2 + 3 \\ 1 + 9 \end{bmatrix} = \begin{bmatrix} 5 \\ 10 \end{bmatrix}
```

- 如果 $A$ 有逆矩阵，解就简单地写成 $\mathbf{x} = A^{-1}\mathbf{b}$。但直接计算逆矩阵成本高且数值不稳定。实践中，我们使用矩阵分解。

- 不是每个矩阵都是方阵，也不是每个方阵都可逆。**伪逆** $A^+$ 把逆矩阵推广到任意矩阵。它总是存在，并提供“尽可能好的”逆：

$$A^+ = (A^TA)^{-1}A^T$$

- 当 $A$ 为下三角矩阵时，求解 $L\mathbf{x} = \mathbf{b}$ 可以通过**前代**轻松完成：先求 $x_1$，再利用它求 $x_2$，如此向下进行。

- 当 $A$ 为上三角矩阵时，求解 $U\mathbf{x} = \mathbf{b}$ 可以通过**回代**完成：先求最后一个变量，再向上求解。

- 这就是为什么把矩阵分解为三角因子（将在矩阵分解中看到）非常有用。它把一个难题变成了两个简单问题。

## 编程任务（使用 CoLab 或 notebook）

1. 将两个矩阵相乘并验证维度。然后交换乘法顺序，观察结果如何变化（或者在维度不匹配时观察它如何失败）。
```python
import jax.numpy as jnp

A = jnp.array([[1.0, 2.0],
               [3.0, 4.0]])
B = jnp.array([[5.0, 6.0],
               [7.0, 8.0]])

print(f"A @ B:\n{A @ B}")
print(f"B @ A:\n{B @ A}")
print(f"Equal: {jnp.allclose(A @ B, B @ A)}")
```

2. 求解线性方程组 $A\mathbf{x} = \mathbf{b}$，并通过重新相乘验证解。尝试修改 $\mathbf{b}$，观察解如何变化。
```python
import jax.numpy as jnp

A = jnp.array([[2.0, 1.0],
               [5.0, 3.0]])
b = jnp.array([4.0, 7.0])

x = jnp.linalg.solve(A, b)
print(f"Solution x: {x}")
print(f"A @ x: {A @ x}")
```
