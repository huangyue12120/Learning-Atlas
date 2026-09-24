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

*矩阵操作是深度学习的核心计算引擎。本文件涵盖了矩阵加法、标量乘法、矩阵向量乘积、矩阵乘法、元素级操作、克罗内克积和广播，这些操作构成了每一步前向传播和梯度更新的基础。*

- 矩阵可以像向量一样相加和标量乘法。

- 对于加法，两个矩阵必须具有相同的维度，并且逐元素相加：

```math
\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix} + \begin{bmatrix} 5 & 6 \\ 7 & 8 \end{bmatrix} = \begin{bmatrix} 6 & 8 \\ 10 & 12 \end{bmatrix}
```

- 对于标量乘法，你将每个元素乘以标量：

```math
3 \times \begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix} = \begin{bmatrix} 3 & 6 \\ 9 & 12 \end{bmatrix}
```

- 矩阵可以与向量相乘。**矩阵向量乘积** $A\mathbf{x}$ 使用 $A$ 的列使用 $\mathbf{x}$ 中的权重进行组合：

```math
\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix} \begin{bmatrix} 5 \\ 6 \end{bmatrix} = 5 \begin{bmatrix} 1 \\ 3 \end{bmatrix} + 6 \begin{bmatrix} 2 \\ 4 \end{bmatrix} = \begin{bmatrix} 17 \\ 39 \end{bmatrix}
```

- 这是机器学习的核心操作。每个神经网络层都计算 $A\mathbf{x} + \mathbf{b}$: 一个矩阵乘以输入向量，加上偏置项。

- 一般情况下是矩阵乘法。给定 $A$ ($m \times n$) 和 $B$ ($n \times p$)，乘积 $C = AB$ 是一个 $m \times p$ 矩阵，其中每个元素是行向量与列向量的点积：

$$C_{ij} = \sum_{k=1}^{n} A_{ik} B_{kj}$$
- 每个结果中的条目是 $A$ 中一行与 $B$ 中一列的点积。内维度必须匹配（$n$），结果取外维度（$m \times p$）。

- 另一种方式看：结果矩阵的每一列是 $A$ 的列向量的加权和，权重来自 $B$ 中对应的列。

- 如果 $B$ 中包含列 $[2, 3]^T$，结果列是 $2 \times (\text{column 1 of } A) + 3 \times (\text{column 2 of } A)$。

- 一个有用的特殊情况：将矩阵乘以其转置总是给出一个方阵。 $AA^T$ 是 $m \times m$，$A^TA$ 是 $n \times n$：

```math
\begin{bmatrix} 1 & 2 & 3 \\ 4 & 5 & 6 \end{bmatrix} \begin{bmatrix} 1 & 4 \\ 2 & 5 \\ 3 & 6 \end{bmatrix} = \begin{bmatrix} 14 & 32 \\ 32 & 77 \end{bmatrix}
```

- 矩阵乘法有重要的规则：

    - **非交换性**：$AB \neq BA$ 一般情况下。顺序很重要。

    - **关联性**：$(AB)C = A(BC)$。你可以根据需要任意组合乘法运算。

    - 分配律：$A(B + C) = AB + AC$。

    - **身份**：$AI = IA = A$。

- 矩阵的 **海森堡积**（逐元素乘法）将两个大小相同的矩阵逐元素相乘，写为 $A \odot B$：

```math
\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix} \odot \begin{bmatrix} 5 & 6 \\ 7 & 8 \end{bmatrix} = \begin{bmatrix} 5 & 12 \\ 21 & 32 \end{bmatrix}
```

- 不像标准矩阵乘法，哈达玛积是可交换的（$A \odot B = B \odot A$）且要求两个矩阵具有相同的维度。它在机器学习中被广泛用于门控：将元素级地与值介于 0 和 1 之间的掩码相乘控制每个条目“通过”的多少。

- 两个向量的外积 $\mathbf{u}$ 和 $\mathbf{v}$ 生成一个矩阵： $\mathbf{u}\mathbf{v}^T$每个条目是其中一个元素的产物。 $\mathbf{u}$ 和一个从 $\mathbf{v}$当然可以，请提供您需要翻译的英文文本。

```math
\begin{bmatrix} 1 \\ 2 \\ 3 \end{bmatrix} \begin{bmatrix} 4 & 5 \end{bmatrix} = \begin{bmatrix} 4 & 5 \\ 8 & 10 \\ 12 & 15 \end{bmatrix}
```

- 结果总是秩为1，因为每行都是$\mathbf{v}^T$的缩放版本。任何矩阵都可以写成秩为1外积的和，这正是SVD所做（在分解中讨论）。

- 矩阵乘法计算成本高昂。两个 $n \times n$ 矩阵的乘法需要 $O(n^3)$ 次操作。对于一个 $1000 \times 1000$ 矩阵，这相当于一亿次乘法。

- 当矩阵是稀疏（大部分元素为零）时，朴素的乘法会浪费时间去乘以零。**压缩稀疏行（CSR）格式**只存储非零元素及其位置：

    - **值**：按行顺序的非零元素
    - **列索引**：每个值所属的列
    - **行偏移量**：在值列表中每行开始的位置

- 例如，矩阵：

```math
A = \begin{bmatrix} 5 & 0 & 0 & 2 \\ 0 & 0 & 3 & 0 \\ 0 & 0 & 0 & -1 \end{bmatrix}
```

- 存储为：values = [5, 2, 3, -1]，columns = [0, 3, 2, 3]，row offsets = [0, 2, 3, 4]。跳过所有零，使得稀疏操作大大加快。

- 矩阵的一个核心用途是解线性方程组。问题 $A\mathbf{x} = \mathbf{b}$ 提问：“当 $A$ 转换 $\mathbf{x}$ 时，产生 $\mathbf{b}$？”

- 例如，如果你在买水果。苹果每颗 $x_1$ 美元，香蕉每颗 $x_2$ 美元。你知道 2 颗苹果和 1 根香蕉总共花费 $5, and 1 apple and 3 bananas cost \$10。用矩阵形式表示：

```math
\begin{bmatrix} 2 & 1 \\ 1 & 3 \end{bmatrix} \begin{bmatrix} x_1 \\ x_2 \end{bmatrix} = \begin{bmatrix} 5 \\ 10 \end{bmatrix}
```

- 将矩阵按行与向量逐行相乘（每行点积 $[x_1, x_2]^T$），得到两个方程：

$$2x_1 + 1x_2 = 5 \qquad \text{(row 1)} \qquad \qquad x_1 + 3x_2 = 10 \qquad \text{(row 2)}$$
- 从第1行，将$x_2 = 5 - 2x_1$代入到第2行：得到$x_1 + 3(5 - 2x_1) = 10$，再代入到第3行：得到$x_1 = 1$，最后代入到第4行：得到$x_2 = 3$。苹果的价格是\$1 and bananas cost \$3元。

- 验证 - 确认无误：

```math
\begin{bmatrix} 2 & 1 \\ 1 & 3 \end{bmatrix} \begin{bmatrix} 1 \\ 3 \end{bmatrix} = \begin{bmatrix} 2 + 3 \\ 1 + 9 \end{bmatrix} = \begin{bmatrix} 5 \\ 10 \end{bmatrix}
```

- 如果 $A$ 有逆矩阵，解法很简单：直接使用 $\mathbf{x} = A^{-1}\mathbf{b}$。但直接计算逆矩阵非常昂贵且数值不稳定。实际操作中，我们通常采用分解方法。

- 不是每个矩阵都是方阵，也不是每个方阵都是可逆的。伪逆 $A^+$ 一般化了逆运算到任何矩阵上。它总是存在，并提供最佳可能的逆：

$$A^+ = (A^TA)^{-1}A^T$$
- 当 $A$ 是下三角矩阵时，通过 **向前代换** 解 $L\mathbf{x} = \mathbf{b}$ 很简单。首先解出 $x_1$，然后使用它来找到 $x_2$，依此类推。

- When $A$ is upper triangular, solving $U\mathbf{x} = \mathbf{b}$ works by **back substitution**: solve for the last variable first, then work upward.

- This is why decomposing a matrix into triangular factors (as we will see in decompositions) is so useful. It turns a hard problem into two easy ones.

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
