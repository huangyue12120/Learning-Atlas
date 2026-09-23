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

*矩阵的结构类型决定了它如何存储信息、进行变换以及高效计算。本篇覆盖方阵、对角矩阵、对称矩阵、正交矩阵、稀疏矩阵、三角矩阵和块矩阵等常见类型。*


*特殊矩阵结构解锁了计算快捷键和数学保证. 该文件涵盖身份、对角、对称、三角、正交、正向、肯定、稀有和分层矩阵、在共变估计中出现的类型、图表算法、正则化和Markov链。*

- 并非所有的矩阵都是相同的. 不同的结构给出了矩阵的特殊属性,使得它们更快地计算,更容易解释,或者两者兼而有之. 这是你最会遇到的类型。

- **平方矩阵**的行数和列数相同($n \times n$) (中文(简体)). 大多数有趣的属性(决定性,eigenvalus,反向)只适用于平方矩阵.

- **标识矩阵**$I$是方形矩阵,对角上为一等分,而其他地方为一等分。这是"什么都不做"的转变:$AI = IA = A$用于任何相容矩阵$A$.

```math
I = \begin{bmatrix} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \end{bmatrix}
```

- **零矩阵**$O$所有元素均等于零。它将每个向量映射到零向量,摧毁所有信息.

- **对角矩阵**除主对角上外,都为零. 用对角矩阵来将一个向量相乘,简单地将每个组件独立地缩放,使其非常高效.

```math
D = \begin{bmatrix} 3 & 0 \\ 0 & 7 \end{bmatrix}
```

- ** 对称矩阵** 等于它自己的转写:$A = A^T$,含义$A_{ij} = A_{ji}$。。。对称矩阵具有特殊属性,它们的精子总是相向相向. 相变矩阵总是对称的.

```math
S = \begin{bmatrix} 3 & -1 \\ -1 & 6 \end{bmatrix}
```

- 一个**三角矩阵**在对角的一面有所有零. ** 下三角** 以上为零;上三角** 下为零。它们对于通过前向或后向替代有效解决等式系统至关重要。

```math
L = \begin{bmatrix} 2 & 0 & 0 \\ 1 & 3 & 0 \\ -1 & 2 & 4 \end{bmatrix} \qquad U = \begin{bmatrix} 5 & -1 & 2 \\ 0 & 1 & 3 \\ 0 & 0 & -2 \end{bmatrix}
```

- 三角矩阵的决定因素仅仅是其对角元素的产物.

- **正交矩阵** 的转置等于其逆矩阵：$Q^TQ = QQ^T = I$。

- 这意味着你可以仅仅通过转接来"取消"转换,这在计算上是便宜的. 其柱为正交形(单位长度和相通.

- 一个**sparse矩阵**的元素多为零;而一个**dense矩阵**的元素多为非零.

![Sparse vs 密度: 点代表非零项](../images/sparse_dense.svg)

- 实际上,许多现实世界的矩阵极为稀少。

- 拥有100万用户的社会网络可以作为代表$10^6 \times 10^6$矩阵,但每个人只连接到少数其他人,因此几乎所有条目都是零.

![小型社交网络及其相接性矩阵:大多数条目为零](../images/social_network_matrix.svg)

- 通过重新排列身份矩阵的行,获得**周度矩阵**。乘以它会洗涤向量的元素. 每行和每列都有一个1,其余的都是0s.

- 例如,下面的矩阵将元素3移到第1位,元素1移到第2位,元素2移到第3位:

```math
P = \begin{bmatrix} 0 & 0 & 1 \\ 1 & 0 & 0 \\ 0 & 1 & 0 \end{bmatrix}
```

- ** Toeplitz 矩阵** 每对角(上-左到下-右)都有相同的值. 注意每个对角的常数 :

```math
T = \begin{bmatrix} a & b & c \\ d & a & b \\ e & d & a \end{bmatrix}
```

- 这种结构出现在信号处理和卷积中,因为一个固定的滤波器会滑过一个信号,相当于被一个托普利茨矩阵相乘.

- **(**circulant matrium **)是一种特殊的托普利茨矩阵,其中每行是上行的回转. 当一行到达尾端时,它会环绕:

```math
C = \begin{bmatrix} 1 & 3 & 2 \\ 2 & 1 & 3 \\ 3 & 2 & 1 \end{bmatrix}
```

- 环状基质与离散的傅里叶变换(DFT)紧密相通,是循环卷积方式的核心.

- ** 赫尔米特矩阵**是一个对称矩阵的复杂等同物:$A = A^\ast$(何处)$A^\ast$是相接转接器。

- 对于真实价值的矩阵来说,赫米地语和对称语是相同的. 你会在量子计算和信号处理中遇到这些.

- ** 统一处理矩阵** 是正交矩阵的复杂等同物:$U^\ast U = UU^\ast = I$。。。与正向基团在真实空间中保存长度一样,单相基团在复杂的空间中保存长度.

- 符合**专有矩阵**$A^2 = A$。。。两次应用变换与一次应用相同,这使其成为了**预测**. 一旦你预测了, 投影再次改变什么。

- ** 无能矩阵** 满足$A^k = O$某电源的零矩阵$k$。。。应用足够多的转换时间 并且一切崩溃到零。例如:

```math
\begin{bmatrix} 0 & 1 \\ 0 & 0 \end{bmatrix}^2 = \begin{bmatrix} 0 & 0 \\ 0 & 0 \end{bmatrix}
```

- **Boolean矩阵**(或二进制矩阵)只包含0s和1s. 它代表了是/否的关系。例如,在有3个节点的图中,**adjacency矩阵**记录了连接到节点:

```math
B = \begin{bmatrix} 0 & 1 & 1 \\ 1 & 0 & 0 \\ 1 & 0 & 0 \end{bmatrix}
```

- 在这里,1号节点连接到2号和3号节点,但2号和3号节点互不相通.

- ** 凡德蒙德矩阵** 由一组数值的相继功率所建立。既定价值$x_1, x_2, x_3$:

```math
V = \begin{bmatrix} 1 & x_1 & x_1^2 \\ 1 & x_2 & x_2^2 \\ 1 & x_3 & x_3^2 \end{bmatrix}
```

- 这种结构出现在多名相插法中: 找寻经过一整组给定分数的独特多名相.

- 一个**赫森堡矩阵**是"几乎"三角形,在第一个子对角下方为零:

```math
H = \begin{bmatrix} 4 & 2 & 1 \\ 3 & 5 & -1 \\ 0 & 1 & 6 \end{bmatrix}
```

- 它是高效计算等值的有用的中间形式。将一个矩阵减小为黑森堡形式首先使得迭代算法更快地汇合.

## 编程任务（使用 Colab 或 notebook）



1. 创建正交矩阵(旋转矩阵),用其转接器来相乘,并验证您的身份。尝试不同的角度。
```python
import jax.numpy as jnp

theta = jnp.pi / 4
Q = jnp.array([[jnp.cos(theta), -jnp.sin(theta)],
               [jnp.sin(theta),  jnp.cos(theta)]])

print(f"Q @ Q.T:\n{Q @ Q.T}")
print(f"Determinant: {jnp.linalg.det(Q):.2f}")
```

2. 创建对称矩阵并验证其等同其转录. 然后计算其等分值,并检查等分值是否为相分相.
```python
import jax.numpy as jnp

S = jnp.array([[4.0, 2.0],
               [2.0, 3.0]])

print(f"Symmetric: {jnp.allclose(S, S.T)}")

eigenvalues, eigenvectors = jnp.linalg.eigh(S)
print(f"Eigenvalues: {eigenvalues}")
print(f"Dot product of eigenvectors: {jnp.dot(eigenvectors[:, 0], eigenvectors[:, 1]):.6f}")
```
