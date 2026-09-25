---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 02 - matrices/02. matrix types.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 17e33db0da1efa60e1b2d1a000bb03c0e4e246778dec12b2740ab34d56336846
status: reviewed
---
# 矩阵类型

*特殊矩阵结构可以带来计算加速和数学性质。本文件涵盖单位矩阵、对角矩阵、对称矩阵、三角矩阵、正交矩阵、正定矩阵、稀疏矩阵和随机转移矩阵；这些结构出现在协方差估计、图算法、正则化和马尔可夫链中。*

- 不同的矩阵结构赋予矩阵不同的性质，使计算更快、分析更直接，或同时具备这两点。下面介绍常见类型。

- **方阵**的行数和列数相同（$n \times n$）。行列式、特征值和逆矩阵等许多性质只对方阵定义。

- **单位矩阵** $I$ 是一个对角线元素为 1，其余元素为 0 的方阵。它是一个“什么都不做”的变换：$AI = IA = A$ 对于任何兼容的矩阵 $A$ 都是如此。

```math
I = \begin{bmatrix} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \end{bmatrix}
```

- **零矩阵** $O$ 的所有元素都为零。它把每个向量映射到零向量，丢弃全部信息。

- **对角矩阵**除主对角线外的元素都为零。矩阵与向量相乘时，只需独立缩放每个分量，因此计算高效。

```math
D = \begin{bmatrix} 3 & 0 \\ 0 & 7 \end{bmatrix}
```

- **对称矩阵**等于其转置：$A = A^T$，这意味着 $A_{ij} = A_{ji}$。对称矩阵具有特殊的性质，即它们的特征向量总是彼此垂直。协方差矩阵总是对称的。

```math
S = \begin{bmatrix} 3 & -1 \\ -1 & 6 \end{bmatrix}
```

- **三角矩阵**在主对角线一侧全为零。**下三角矩阵**的上三角部分为零，**上三角矩阵**的下三角部分为零。它们可以用前代或回代高效求解线性方程组。

```math
L = \begin{bmatrix} 2 & 0 & 0 \\ 1 & 3 & 0 \\ -1 & 2 & 4 \end{bmatrix} \qquad U = \begin{bmatrix} 5 & -1 & 2 \\ 0 & 1 & 3 \\ 0 & 0 & -2 \end{bmatrix}
```

- 三角矩阵的行列式仅仅是其对角线元素的乘积。

- **正交矩阵**满足 $Q^TQ = QQ^T = I$，因此只需计算代价较低的转置运算，就能撤销变换。它的列向量彼此正交且长度为 1。

- **稀疏矩阵**的大多数元素为零，**稠密矩阵**的大多数元素非零。

![稀疏矩阵与稠密矩阵：点表示非零元素](../images/sparse_dense.svg)


- 许多现实中的矩阵都很稀疏。

- 一个拥有百万用户的社交网络可以表示为 $10^6 \times 10^6$ 矩阵，但每个人只与少数其他人连接，因此几乎所有元素都是零。

![一个小型社交网络及其邻接矩阵：大多数条目为零。](../images/social_network_matrix.svg)


- **置换矩阵**是通过重新排列单位矩阵的行得到的。乘以它会打乱向量中的元素。每一行和每一列恰好有一个 1，其余为 0。

- 例如，下面的矩阵将元素 3 移动到位置 1，元素 1 移动到位置 2，元素 2 移动到位置 3：

```math
P = \begin{bmatrix} 0 & 0 & 1 \\ 1 & 0 & 0 \\ 0 & 1 & 0 \end{bmatrix}
```

- **托普利茨矩阵**的每条从左上到右下的对角线上，元素都相同：

```math
T = \begin{bmatrix} a & b & c \\ d & a & b \\ e & d & a \end{bmatrix}
```

- 这种结构出现在信号处理和卷积中，因为让固定滤波器沿信号滑动，等价于乘以托普利茨矩阵。

- **循环矩阵**是特殊的托普利茨矩阵，每一行都是上一行的循环移位：一行到达末尾后会从开头继续。

```math
C = \begin{bmatrix} 1 & 3 & 2 \\ 2 & 1 & 3 \\ 3 & 2 & 1 \end{bmatrix}
```

- 循环矩阵与离散傅里叶变换（DFT）密切相关，也是循环卷积的基础。

- **埃尔米特矩阵**是复数域中对称矩阵的对应概念：$A = A^\ast$，其中 $A^\ast$ 表示共轭转置。

- 对实值矩阵而言，埃尔米特矩阵与对称矩阵相同。量子计算和信号处理中会遇到这类矩阵。

- **酉矩阵**是复数域中正交矩阵的对应概念：$U^\ast U = UU^\ast = I$。正交矩阵在实数空间中保持长度，酉矩阵在复数空间中保持长度。

- **幂等矩阵**满足 $A^2 = A$。重复应用两次与应用一次相同，因此它表示一种**投影**。完成投影后，再次投影不会改变结果。

- **幂零矩阵**满足 $A^k = O$（零矩阵），其中 $k$ 是某个正整数。重复应用变换足够多次后，所有向量都会被压到零。

```math
\begin{bmatrix} 0 & 1 \\ 0 & 0 \end{bmatrix}^2 = \begin{bmatrix} 0 & 0 \\ 0 & 0 \end{bmatrix}
```

- **布尔矩阵**（或二进制矩阵）只包含 0 和 1，用来表示是/否关系。例如，3 个节点的**邻接矩阵**记录节点之间是否相连：

```math
B = \begin{bmatrix} 0 & 1 & 1 \\ 1 & 0 & 0 \\ 1 & 0 & 0 \end{bmatrix}
```

- 这里，节点 1 与节点 2、3 相连，而节点 2 和节点 3 彼此不相连。

- **范德蒙矩阵**由一组数的连续幂构成。给定 $x_1, x_2, x_3$：

```math
V = \begin{bmatrix} 1 & x_1 & x_1^2 \\ 1 & x_2 & x_2^2 \\ 1 & x_3 & x_3^2 \end{bmatrix}
```

- 这种结构用于多项式插值：寻找经过给定点的唯一多项式。

- **Hessenberg 矩阵**“几乎”是三角矩阵：第一条次对角线以下的元素都为零。

```math
H = \begin{bmatrix} 4 & 2 & 1 \\ 3 & 5 & -1 \\ 0 & 1 & 6 \end{bmatrix}
```

- 它是高效计算特征值的中间形式。先把矩阵化为 Hessenberg 形式，可以让迭代算法更快收敛。

## 编程任务（使用 Colab 或笔记本）

1. 创建一个正交矩阵（旋转矩阵），将其乘以其转置，并验证你得到单位矩阵。尝试不同角度。
```python
import jax.numpy as jnp

theta = jnp.pi / 4
Q = jnp.array([[jnp.cos(theta), -jnp.sin(theta)],
               [jnp.sin(theta),  jnp.cos(theta)]])

print(f"Q @ Q.T:\n{Q @ Q.T}")
print(f"Determinant: {jnp.linalg.det(Q):.2f}")
```

2. 创建一个对称矩阵，并验证它等于其转置。然后计算其特征值并检查特征向量是否相互垂直。
```python
import jax.numpy as jnp

S = jnp.array([[4.0, 2.0],
               [2.0, 3.0]])

print(f"Symmetric: {jnp.allclose(S, S.T)}")

eigenvalues, eigenvectors = jnp.linalg.eigh(S)
print(f"Eigenvalues: {eigenvalues}")
print(f"Dot product of eigenvectors: {jnp.dot(eigenvectors[:, 0], eigenvectors[:, 1]):.6f}")
```
