---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 02 - matrices/01. matrix properties.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 87186cd05aebc78027d4f19c1b5e650f88120c99b8d10cc18ecbfa809b122a09
status: reviewed
---
# 矩阵属性

*矩阵是存储数据集、编码变换和定义神经网络层的数据结构。本文件涵盖了矩阵维度、元素、转置、迹、行列式、逆、秩和零空间等基础性质，这些性质贯穿于线性代数和机器学习的各个方面。*

- 矩阵的本质是一个由行和列排列的矩形网格中的数字堆叠。如果向量是单个数字列表，那么矩阵就是一个向量堆叠。

```math
A = \begin{bmatrix} 1 & 2 & 3 \\ 4 & 5 & 6 \end{bmatrix}
```

- 如果一个人被描述为向量 $[\text{age}, \text{height}, \text{weight}]$，那么三个人形成一个矩阵，其中每一行都是一个人：

```math
\begin{bmatrix} 25 & 170 & 65 \\ 30 & 180 & 80 \\ 22 & 160 & 55 \end{bmatrix}
```

- 这个矩阵有3行和3列，因此我们称之为 $3 \times 3$ 矩阵。

- 矩阵中的每个数字称为 **元素** 或 **条目**，并用其行和列标识：$A_{ij}$ 是位于第 $i$ 行、第 $j$ 列的元素。

- 矩阵的 **转置** 是沿着其对角线翻转它，将行转换为列，将列转换为行。如果 $A$ 是 $m \times n$，则 $A^T$ 是 $n \times m$。

```math
A = \begin{bmatrix} 1 & 2 & 3 \\ 4 & 5 & 6 \end{bmatrix} \quad \Rightarrow \quad A^T = \begin{bmatrix} 1 & 4 \\ 2 & 5 \\ 3 & 6 \end{bmatrix}
```

- 将矩阵乘以它的转置总是给出一个方阵：$AA^T$ 是 $m \times m$ 和 $A^TA$ 是 $n \times n$。

- 矩阵的 **迹** 是其对角元素的和：$\text{tr}(A) = A_{11} + A_{22} + \cdots + A_{nn}$。迹等于特征值（我们稍后会看到）。

![迹：对角线元素的和](../images/matrix_trace.svg)


- 对于上面的矩阵，$\text{tr}(A) = 1 + 4 + 9 = 14$。仅高亮显示的对角线重要。

- 如果两个矩阵代表同一个线性变换，但使用不同的基底表示，它们的迹将相同。迹是“基底无关”的。

- 矩阵的 **秩** 是其线性独立行（或等价地，列）的数量。它告诉你矩阵携带了多少有用的信息。

- 例如，以下矩阵的秩为2，因为没有一行是另一行的倍数：

```math
\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}
```

但这个矩阵的秩为1，因为第二行只是第一行的两倍，所以它没有提供新的信息：

```math
\begin{bmatrix} 1 & 2 \\ 2 & 4 \end{bmatrix}
```

- 一个$5 \times 3$矩阵的最大秩最多为3。如果某些行是其他行的缩放或组合版本，则秩会降低。具有最大可能秩的矩阵称为**满秩**。

![秩：独立行覆盖整个空间，依赖行仅覆盖子空间](../images/matrix_rank.svg)


- 一个矩阵是可逆的（有逆矩阵）当且仅当它是满秩的。

- The rank is connected to the **null space** (the set of vectors that the matrix maps to zero) through the **rank-nullity theorem**: $\text{rank}(A) + \text{nullity}(A) = \text{number of columns of } A$. What the matrix keeps (rank) plus what it destroys (nullity) equals the total dimension.

- The **column space** of a matrix is the set of all possible outputs when you multiply the matrix by any vector. It is spanned by the columns of the matrix. If a matrix has 3 columns but only 2 are independent, the column space is a 2D plane, not all of 3D space.

![列空间：独立列覆盖一个平面，依赖列仅覆盖一条直线](../images/column_space.svg)


- 行空间是另一种角度，从行的角度来看。秩等于列空间和行空间的维度，因此它们总是相等的。

- 两个空间共同回答了“这个矩阵能产生哪些输出？”和“哪些输入会被映射到零？”这两个问题。这两个空间完全描述了矩阵的作用。

- 矩阵的 **行列式** 是一个单个数字，它捕捉了矩阵如何缩放空间。想象一个 $2 \times 2$ 矩阵将单位正方形变换为平行四边形。行列式是该平行四边形的面积（带有符号）。

```math
\det\begin{bmatrix} a & b \\ c & d \end{bmatrix} = ad - bc
```

![行列式：线性变换的面积缩放因子](../images/determinant.svg)


- 例如：

```math
\det\begin{bmatrix} 2 & 1 \\ 0 & 3 \end{bmatrix} = 2 \cdot 3 - 1 \cdot 0 = 6
```

变换将单位正方形拉伸成一个面积为6的平行四边形。

- 如果行列式为正，变换保持方向（东西不会翻转）。如果为负，它会翻转方向（就像镜子反射一样）。如果为零，矩阵将空间压缩到更低的维度，将平行四边形折叠成线或点。

- 一个行列式为零的矩阵被称为 **奇异**。它没有逆矩阵，并且永久丢失了信息。

- 对于大于 $2 \times 2$ 的矩阵，计算行列式时使用 **子式** 和 **代数余子式**。 **子式** $M_{ij}$ 是删除行 $i$ 和列 $j$ 后得到的较小矩阵的行列式。

![子矩阵：删除一行和一列得到较小的矩阵](../images/cofactor.svg)


- 伴随矩阵 $C_{ij} = (-1)^{i+j} M_{ij}$ 为每个次要元素（像棋盘一样交替）附上一个标记。 $+, -, +, \ldots$矩阵的行列式等于任意行或列之和： $\det(A) = \sum_j A_{1j} \cdot C_{1j}$这是“伴随展开”的意思。

- 矩阵的逆 $A$, 书写 $A^{-1}$是逆矩阵，它将 undone。 $A$ 做： $AA^{-1} = A^{-1}A = I$ （单位矩阵）。只有非奇异矩阵才有逆。

- 对于一个 $2 \times 2$ 矩阵，其逆矩阵有直接公式：

```math
\begin{bmatrix} a & b \\ c & d \end{bmatrix}^{-1} = \frac{1}{ad - bc}\begin{bmatrix} d & -b \\ -c & a \end{bmatrix}
```

注意分母中的行列式，这就是为什么奇异矩阵（行列式为零）没有逆矩阵的原因。

- 矩阵的条件数衡量其对输入微小变化的敏感程度。它定义为 $\kappa(A) = \|A\| \cdot \|A^{-1}\|$。

- 条件数接近1表示矩阵是**条件良好**的：小输入变化产生小输出变化。条件数很大表示它**条件不良**：微小错误会放大成极大的程度。正交和单位矩阵条件数为1，而奇异矩阵条件数无穷大。

- 例如，以下矩阵具有条件数 $10^8$。一个方向被正常缩放，另一个方向几乎压缩到零，因此沿着该方向的小扰动会 wildly扭曲:

```math
\begin{bmatrix} 1 & 0 \\ 0 & 10^{-8} \end{bmatrix}
```

- 同样，向量有范数（长度），矩阵也有 **范数** 来衡量它们的“大小”。最常见的是一种称为 **Frobenius范数** 的范数，它将矩阵视为一个长向量并计算其长度:

```math
\|A\|_F = \sqrt{\sum_{i}\sum_{j} A_{ij}^2}
```

- 例如：

```math
\left\|\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}\right\|_F = \sqrt{1 + 4 + 9 + 16} = \sqrt{30} \approx 5.48
```

- 谱范数 $\|A\|_2$ 是最大的奇异值 $A$它测量矩阵可以拉伸任何单位向量的最大程度。在机器学习中，矩阵范数用于权重正则化（惩罚大权重）和监控训练稳定性。

- 一个对称矩阵 $A$ 是正定的，如果对于任何非零向量 $\mathbf{x}$： $\mathbf{x}^T A \mathbf{x} > 0$。这个二次形式总是产生一个正数。

- 例如，以下矩阵是正定的：

```math
A = \begin{bmatrix} 2 & 1 \\ 1 & 3 \end{bmatrix}
```

选择任意向量，例如 $\mathbf{x} = [1, -1]^T$： $\mathbf{x}^T A \mathbf{x} = 2 - 1 - 1 + 3 = 3 > 0$。无论你尝试哪个非零 $\mathbf{x}$，总是得到一个正结果。

- 正定矩阵非常重要，因为它们确保优化问题有一个唯一的最小值。

- 如果条件放宽到 $\mathbf{x}^T A \mathbf{x} \geq 0$（允许零），矩阵是 **半正定** 的（PSD）。PSD 矩阵经常出现：协方差矩阵、SVM 中的核矩阵和局部最小值处的 Hessian 都是 PSD。不同之处在于，PSD 允许某些方向是“平坦”的（零曲率），而不是严格向上弯曲。

## 编程任务（使用 Colab 或笔记本）

1. 计算矩阵的迹、秩和行列式。尝试将一行变为另一行的倍数，看看秩和行列式如何变化。
```python
import jax.numpy as jnp

A = jnp.array([[1.0, 2.0],
               [3.0, 4.0]])

print(f"Trace: {jnp.trace(A)}")
print(f"Rank: {jnp.linalg.matrix_rank(A)}")
print(f"Determinant: {jnp.linalg.det(A):.2f}")
```

2. 计算矩阵的逆，将其乘以原始矩阵，并验证结果为单位矩阵。然后尝试一个奇异矩阵，观察会发生什么。
```python
import jax.numpy as jnp

A = jnp.array([[1.0, 2.0],
               [3.0, 4.0]])

A_inv = jnp.linalg.inv(A)
print(f"A * A_inv:\n{A @ A_inv}")
```
