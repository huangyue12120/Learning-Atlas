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

*矩阵运算是深度学习的计算引擎。本文件涵盖矩阵加法、标量乘法、矩阵-向量乘法、矩阵乘法、逐元素运算、克罗内克积和广播；这些运算构成前向传播与梯度更新的基础。*

- 矩阵和向量一样可以相加，也可以进行标量乘法。

- 矩阵相加要求两个矩阵维度相同，并按元素相加：

```math
\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix} + \begin{bmatrix} 5 & 6 \\ 7 & 8 \end{bmatrix} = \begin{bmatrix} 6 & 8 \\ 10 & 12 \end{bmatrix}
```

- 标量乘法把每个元素乘以同一个标量：

```math
3 \times \begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix} = \begin{bmatrix} 3 & 6 \\ 9 & 12 \end{bmatrix}
```

- 矩阵可以与向量相乘。**矩阵-向量乘法** $A\mathbf{x}$ 使用 $\mathbf{x}$ 中的权重对 $A$ 的列向量进行线性组合：

```math
\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix} \begin{bmatrix} 5 \\ 6 \end{bmatrix} = 5 \begin{bmatrix} 1 \\ 3 \end{bmatrix} + 6 \begin{bmatrix} 2 \\ 4 \end{bmatrix} = \begin{bmatrix} 17 \\ 39 \end{bmatrix}
```

- 这是机器学习中的核心运算。每个神经网络层都计算 $A\mathbf{x} + \mathbf{b}$：用矩阵变换输入向量，再加上偏置。

- 给定 $A$（$m \times n$）和 $B$（$n \times p$），乘积 $C = AB$ 是一个 $m \times p$ 矩阵，每个元素都是一行与一列的点积：

$$C_{ij} = \sum_{k=1}^{n} A_{ik} B_{kj}$$
- 结果矩阵的每个元素都是 $A$ 的一行与 $B$ 的一列的点积。两个矩阵的内维度 $n$ 必须相同；结果有 $m$ 行、$p$ 列。

- 也可以把结果矩阵的每一列看成 $A$ 的列向量的线性组合，权重来自 $B$ 的对应列。

- 如果 $B$ 的某一列是 $[2, 3]^T$，结果中对应的列就是 $2 \times (A 的第 1 列) + 3 \times (A 的第 2 列)$。

- 一个有用的特殊情况是：矩阵乘以自身的转置总会得到方阵。$AA^T$ 是 $m \times m$，$A^TA$ 是 $n \times n$：

```math
\begin{bmatrix} 1 & 2 & 3 \\ 4 & 5 & 6 \end{bmatrix} \begin{bmatrix} 1 & 4 \\ 2 & 5 \\ 3 & 6 \end{bmatrix} = \begin{bmatrix} 14 & 32 \\ 32 & 77 \end{bmatrix}
```

- 矩阵乘法满足以下规则：

    - **非交换性**：一般来说，$AB \neq BA$；乘法顺序会影响结果。

    - **结合律**：$(AB)C = A(BC)$。可以按需要组合乘法。

    - 分配律：$A(B + C) = AB + AC$。

    - **单位元**：$AI = IA = A$。

- **哈达玛积**（逐元素乘法）把两个同形矩阵的对应元素相乘，记作 $A \odot B$：

```math
\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix} \odot \begin{bmatrix} 5 & 6 \\ 7 & 8 \end{bmatrix} = \begin{bmatrix} 5 & 12 \\ 21 & 32 \end{bmatrix}
```

- 与标准矩阵乘法不同，哈达玛积满足交换律（$A \odot B = B \odot A$），并要求两个矩阵维度相同。它常用于门控：把矩阵与元素值在 0 到 1 之间的掩码逐元素相乘，控制每个条目的保留程度。

- 两个向量 $\mathbf{u}$ 和 $\mathbf{v}$ 的**外积**生成一个矩阵 $\mathbf{u}\mathbf{v}^T$，其中每个元素都是一个分量与另一个分量的乘积：

```math
\begin{bmatrix} 1 \\ 2 \\ 3 \end{bmatrix} \begin{bmatrix} 4 & 5 \end{bmatrix} = \begin{bmatrix} 4 & 5 \\ 8 & 10 \\ 12 & 15 \end{bmatrix}
```

- **编者注：**当 $\mathbf{u}$ 和 $\mathbf{v}$ 都非零时，外积矩阵的秩为 1，因为每一行都是 $\mathbf{v}^T$ 的缩放版本。任意矩阵都可以表示为若干秩 1 外积之和，这正是 SVD 所做的事情（见“矩阵分解”）。

- 矩阵乘法的计算成本较高。两个 $n \times n$ 矩阵相乘需要 $O(n^3)$ 次运算；对 $1000 \times 1000$ 矩阵来说，这约等于十亿次乘法。

- 当矩阵是稀疏（大部分元素为零）时，朴素的乘法会浪费时间去乘以零。**压缩稀疏行（CSR）格式**只存储非零元素及其位置：

    - **值**：按行顺序的非零元素
    - **列索引**：每个值所属的列
    - **行偏移量**：在值列表中每行开始的位置

- 例如，矩阵：

```math
A = \begin{bmatrix} 5 & 0 & 0 & 2 \\ 0 & 0 & 3 & 0 \\ 0 & 0 & 0 & -1 \end{bmatrix}
```

- 存储为：values（值）= [5, 2, 3, -1]，columns（列索引）= [0, 3, 2, 3]，row offsets（行偏移量）= [0, 2, 3, 4]。这种格式跳过所有零元素，可以加快稀疏运算。

- 矩阵的一个核心用途是求解线性方程组。问题 $A\mathbf{x} = \mathbf{b}$ 可以理解为：“$A$ 作用于哪个 $\mathbf{x}$ 后会得到 $\mathbf{b}$？”

- 例如，购买水果时，设每个苹果价格为 $x_1$ 美元、每根香蕉价格为 $x_2$ 美元。已知 2 个苹果和 1 根香蕉共花费 5 美元，1 个苹果和 3 根香蕉共花费 10 美元。用矩阵表示为：

```math
\begin{bmatrix} 2 & 1 \\ 1 & 3 \end{bmatrix} \begin{bmatrix} x_1 \\ x_2 \end{bmatrix} = \begin{bmatrix} 5 \\ 10 \end{bmatrix}
```

- 将矩阵按行与向量逐行相乘（每行点积 $[x_1, x_2]^T$），得到两个方程：

$$2x_1 + 1x_2 = 5 \qquad \text{（第 1 行）} \qquad \qquad x_1 + 3x_2 = 10 \qquad \text{（第 2 行）}$$
- 由第 1 个方程得到 $x_2 = 5 - 2x_1$，代入第 2 个方程：$x_1 + 3(5 - 2x_1) = 10$，解得 $x_1 = 1$，再代回得到 $x_2 = 3$。苹果价格为 1 美元，香蕉价格为 3 美元。

- 验证结果：

```math
\begin{bmatrix} 2 & 1 \\ 1 & 3 \end{bmatrix} \begin{bmatrix} 1 \\ 3 \end{bmatrix} = \begin{bmatrix} 2 + 3 \\ 1 + 9 \end{bmatrix} = \begin{bmatrix} 5 \\ 10 \end{bmatrix}
```

- 如果 $A$ 有逆矩阵，解法很简单：$\mathbf{x} = A^{-1}\mathbf{b}$。但直接计算逆矩阵既昂贵又可能数值不稳定，因此实践中通常使用矩阵分解。

- 不是每个矩阵都是方阵，也不是每个方阵都可逆。伪逆 $A^+$ 将逆矩阵推广到任意矩阵，并且总是存在。**编者注：**下面的公式只适用于 $A$ 满列秩的情形；一般情形下的 $A^+$ 是 Moore–Penrose 伪逆。

$$A^+ = (A^TA)^{-1}A^T$$
- 当 $A$ 是下三角矩阵时，可以通过**前代**求解 $L\mathbf{x} = \mathbf{b}$：先求出 $x_1$，再用它求 $x_2$，依此类推。

- 当 $A$ 是上三角矩阵时，可以通过**回代**求解 $U\mathbf{x} = \mathbf{b}$：先求最后一个变量，再向上求解。

- 这正是把矩阵分解为三角因子很有用的原因：一个困难问题可以拆成两个简单问题。

## 编程任务（使用 Colab 或笔记本）

1. 乘以两个矩阵并验证维度。然后交换顺序，观察结果是否改变（或如果维度不匹配则失败）。
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

2. 解线性方程组 $A\mathbf{x} = \mathbf{b}$ 并通过将结果乘回来验证解。尝试更改 $\mathbf{b}$ 来观察解如何移动。
```python
import jax.numpy as jnp

A = jnp.array([[2.0, 1.0],
               [5.0, 3.0]])
b = jnp.array([4.0, 7.0])

x = jnp.linalg.solve(A, b)
print(f"Solution x: {x}")
print(f"A @ x: {A @ x}")
```
