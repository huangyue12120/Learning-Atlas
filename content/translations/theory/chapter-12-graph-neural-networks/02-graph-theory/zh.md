---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 12 - graph neural networks/02. graph theory.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: a8ed6736218a9dfbb6fe333ccb28bc48b7f8825459e7aed25d9016798f1c8f99
status: reviewed
---
# 图论

*图论为描述实体之间关系提供了数学语言。本文件涵盖了节点、边、邻接矩阵、图类型、度和连通性、图拉普拉斯算子、谱图理论以及现实世界中的图应用。我们将深入探讨在纯计算机科学章节中关于图的讨论*

- 直到目前为止，在这本书中，数据都居住在常规结构上：在 $\mathbb{R}^n$ 中（第 1 章），在网格形式的矩阵中（第 2 章），在像素网格中（第 8 章），在有序列表中（第 7 章）。但许多现实世界系统是 **不规则** 的：一个社交网络没有网格结构，一个分子没有左到右的顺序，一个道路网络不能整齐地排列成行和列。

- **图** 是表示这些不规则、关系结构的数学工具。一个图捕捉了 **实体**（节点）和 **关系**（边）之间的连接。一旦数据被表示为图，我们就可以应用文件 1 中的几何深度学习原则来从中学习。

## 节点、边和邻接性

- **图** $G = (V, E)$ 由一组 **节点**（或顶点） $V = \{v_1, v_2, \ldots, v_n\}$ 和一组连接对节点的 **边** $E \subseteq V \times V$ 组成。

- 节点代表实体：人、原子、城市、网页、神经元。边代表关系：友谊、化学键、道路、超链接、突触。

- 邻接矩阵 $A$ 是图的矩阵表示。对于一个具有 $n$ 节点 $A$ 是的。 $n \times n$ 矩阵中 $A_{ij} = 1$ 如果存在从节点到的边。 $i$ 到节点 $j$和 $A_{ij} = 0$ 否则。

- 例如，一个三角形图（3个节点，全部相连）有：

```math
A = \begin{bmatrix} 0 & 1 & 1 \\ 1 & 0 & 1 \\ 1 & 1 & 0 \end{bmatrix}
```

![一个三角形图及其邻接矩阵：1表示存在边，0表示不存在](../images/graph_adjacency_matrix.svg)


- 对角线为零，因为节点不连接到自己（默认情况下没有自环）。邻接矩阵是我们在第2章中研究的布尔矩阵的直接应用：每个条目是一个二进制关系。

- 邻接矩阵完全编码了图的结构。矩阵运算在技术教材中使用。 $A$ 显示图表属性： $A^2_{ij}$ 计算两个节点之间的长度为2的路径数量。 $i$ 和 $j$ 回想一下，我们在第2章中讨论了矩阵乘法：每个元素是中间节点的乘积之和。更一般地， $A^k_{ij}$ 计数长度$k$ 路径。

- 每个节点可以携带一个 **特征向量** $\mathbf{x}_i \in \mathbb{R}^d$。对于社交网络，这可能是一个用户的个人资料。对于分子，它编码原子类型、电荷和其他属性。整个节点特征的矩阵是 $X \in \mathbb{R}^{n \times d}$，其中每一行代表一个节点的特征。

- 边也可以携带特征：分子中的键类型、空间图中的距离、知识图中的关系类型。 **边的特征** 对于边 $(i, j)$ 是一个向量 $\mathbf{e}_{ij} \in \mathbb{R}^{d_e}$。

## 图类型

- 无向图具有对称的边：如果 $i$ 连接到 $j$，那么 $j$ 连接到 $i$。邻接矩阵是对称的： $A = A^T$（一个对称矩阵，第 2 章）。友谊和化学键是无向的。

- 一个有向图（digraph）的边是有方向的：从 $i$ 到 $j$ 不意味着从 $j$ 到 $i$。邻接矩阵是不对称的。推特关注、网页链接和引用网络都是有向的。

- 一个 **加权图** 给每个边分配一个数值权重。邻接矩阵的条目不再是二进制：$A_{ij} = w_{ij}$。道路网络中的距离、大脑连接强度之间的相关性以及社交网络中交互频率是加权的。

- 一个 **二分图** 是两个不相交的节点集，其中边仅在这些集中。用户和产品形成一个二分图：用户评分产品，但用户不评分用户。二分图的邻接矩阵具有块结构：

```math
A = \begin{bmatrix} 0 & B \\ B^T & 0 \end{bmatrix}
```

- $B$ 是两个节点集之间的二分图邻接矩阵。

- 多图允许在同一个节点对之间存在多条边，并且可以包含自环。知识图谱通常是多图：两个实体可以有多个关系（例如，“出生在”、“居住在”、“工作在”）。

- 超图将边扩展到连接不止两个节点。一个 **超边** 连接一组节点，表示更高阶的关系。一篇由五人共同撰写的论文是一个超边，它连接了五个作者节点。

- 完全图 $K_n$ 每对节点之间都有边。这是完全连接层的图类比，也是变换器操作的结构（每个标记都与所有其他标记相互关注）。

## 度、路径和连通性

- 节点的 **度** 是连接到它的边的数量。在无向图中，节点 $i$ 的度为 $d_i = \sum_j A_{ij}$。高度节点是“中心”节点，有许多连接。

- **度矩阵** $D$ 是一个对角矩阵，其中度在对角线上：$D_{ii} = d_i$。这个矩阵在整个图论和 GNN 公式中出现。

- 两个节点之间的 **路径** 是连接它们的边序列。 **最短路径**（或欧几里得距离）是连接 $i$ 和 $j$ 的路径，具有最少的边（在加权图中，总权重最低）。 **Dijkstra 算法** 在 $O((|V| + |E|) \log |V|)$ 时间内找到最短路径。

- 一个图是连通的，如果从任意节点到任意其他节点都存在一条路径。否则，它有多个**连通分量**：彼此之间没有边的孤立子图。

- 图的直径是任意两个节点之间最短路径的最大长度。它衡量了图的“扩散程度”。社交网络以六度分离而闻名（即任意两个人之间最多通过六个中间人连接）。

- 一个 **环路** 是从某个节点开始，最终回到该节点的路径。没有环路的图称为 **树**。树是最简单的连通图：$n$个节点和恰好$n-1$条边。

- **重要性**衡量节点的重要性。**度中心性**就是度数。**介数中心性**计算通过一个节点的最短路径数量。**特征向量中心性**基于邻居的重要性分配重要性，通过特征向量方程 $A\mathbf{x} = \lambda \mathbf{x}$（第2章）。谷歌的PageRank是无向图上特征向量中心性的变体。

## 图拉普拉斯矩阵

- **图拉普拉斯矩阵** 在图论中是最重要的一种矩阵。它定义为：

$$L = D - A$$
- 其中 $D$ 是度矩阵，$A$ 是邻接矩阵。对于我们的三角形示例：

```math
L = \begin{bmatrix} 2 & 0 & 0 \\ 0 & 2 & 0 \\ 0 & 0 & 2 \end{bmatrix} - \begin{bmatrix} 0 & 1 & 1 \\ 1 & 0 & 1 \\ 1 & 1 & 0 \end{bmatrix} = \begin{bmatrix} 2 & -1 & -1 \\ -1 & 2 & -1 \\ -1 & -1 & 2 \end{bmatrix}
```

- 图拉普拉斯矩阵具有 remarkable性质：

    - 它总是 **对称** 的，并且是 **半正定的**（回想第 2 章：所有特征值都是 $\geq 0$）。对于任何向量 $\mathbf{x}$:

$$\mathbf{x}^T L \mathbf{x} = \sum_{(i,j) \in E} (x_i - x_j)^2$$
![图拉普拉斯度量信号平滑性：平滑信号在连接节点上的值相似，非平滑信号变化剧烈](../images/graph_laplacian_smoothness.svg)


    - 这个二次形式衡量信号 $\mathbf{x}$ 在图上的变化程度。如果相邻节点的值相似， $\mathbf{x}^T L \mathbf{x}$ 小。如果它们差异很大，它就大。拉普拉斯矩阵度量 **平滑性** 信号在图上的变化情况.

    - 最小特征值总是 0，具有特征向量 $\mathbf{1} = [1, 1, \ldots, 1]^T$（一个常数信号的变异性为零）。零特征值的数量等于连通组件的数量.

    - 第二个最小特征值 $\lambda_2$ 是代数连接性（费德勒值）。它衡量图的连接程度： $\lambda_2 = 0$ 表示图是不连通的，大 $\lambda_2$ 表示图是紧密相连的.

- 正则化拉普拉斯矩阵按度数缩放：

$$\hat{L} = D^{-1/2} L D^{-1/2} = I - D^{-1/2} A D^{-1/2}$$
- 此种归一化确保了拉普拉斯算子的性质不依赖于节点度的绝对尺度。术语 $D^{-1/2} A D^{-1/2}$ 是 **对称归一化的邻接矩阵**，它直接出现在 GCN 公式（文件 3）中。

## 谱图理论

- 图拉普拉斯矩阵的特征值和特征向量定义了图的谱，它们是图的傅里叶变换的图学版本。

- 在经典信号处理中，傅里叶变换将信号分解为频率成分（正弦和余弦）。在图形上，拉普拉斯算子的特征向量扮演了这些频率基的角色。低频特征向量随图形变化缓慢（低频、平滑），而高频特征向量随图形变化迅速（高频、波动）。

- **图傅里叶变换 (GFT)** 对于图上的信号 $\mathbf{x}$ 是：

$$\hat{\mathbf{x}} = U^T \mathbf{x}$$
- 其中 $U$ 是拉普拉斯算子特征向量的矩阵（回想第 2 章中的特征分解：$L = U \Lambda U^T$）。逆变换是 $\mathbf{x} = U \hat{\mathbf{x}}$。

- **图卷积**在频域中是点乘，就像空间域中的卷积对应于傅里叶域中的乘法（第8章的卷积定理）：

$$g_\theta \star \mathbf{x} = U \left( (U^T g_\theta) \odot (U^T \mathbf{x}) \right) = U \, \text{diag}(\hat{g}_\theta) \, U^T \mathbf{x}$$
- 过滤器 $\hat{g}_\theta$ 它是特征值的可学习函数。这是Spectral GNN的基础，我们将它简化为文件3中的实用GCN。

- 计算瓶颈在于特征分解。 $L$这需要 $O(n^3)$ 对于一个图， $n$ 节点。对于大型图（数百万个节点）来说，这种方法不实用。多项式近似（切比雪夫多项式）完全避免了特征分解，这种近似直接导致了GCN。

## 社区检测

- 许多现实世界中的图具有**社区结构**：簇状的密集连接节点之间有稀疏的连接。社交网络中有朋友群体，生物网络中有功能模块，引用网络中有研究领域。

- 谱聚类使用拉普拉斯特征向量来发现社区。想法：将每个节点嵌入到 $k$ 最小非平凡特征向量 $L$然后在嵌入空间中应用K均值（第6章）。同一社区的节点在谱嵌入中会聚在一起。

- 这工作是因为 $\lambda_2$ 的特征向量（即 Fiedler 向量）自然地将图分为两个组：值为正的节点和值为负的节点，通过最稀疏的连接进行切割。更高次的特征向量进一步细化这种分组。

- **模块性** $Q$衡量社区划分的质量。它将社区内部边的数量与随机图中预期的边数量进行比较：

$$Q = \frac{1}{2|E|} \sum_{ij} \left( A_{ij} - \frac{d_i d_j}{2|E|} \right) \delta(c_i, c_j)$$
- where $c_i$ is the community assignment of node $i$ and $\delta$ is 1 if nodes are in the same community. $Q$ ranges from $-0.5$ to $1$, with higher values indicating stronger community structure.

## 实际世界图谱

- **社交网络**: 节点是人，边是友谊或互动。Facebook有数十亿个节点和数百亿条边。这些图通常是稀疏的（每个人都有几百个朋友，而不是 billions），表现出小世界性质（平均路径长度较短），并且度分布具有重尾特性（少数几个中心节点连接数达百万）。

- **分子图**: 节点是原子，边是化学键。每个原子有特征（元素类型、电荷、杂化状态）和每个键有特征（单键、双键、三键、芳香）。分子图相对较小（数十到数百个节点），但结构非常复杂。从图的结构预测分子性质是一个重大应用领域，GNNs在此方面具有重要作用。

- 知识图谱由实体（人、地点、概念）和类型关系边组成。知识图谱支持搜索引擎、推荐系统和问答系统。它们通常是带有数百万个实体和数十亿条关系的有向多图。

- **引用网络**：节点是论文，边是引用（有向）。聚类揭示研究社区。节点特征包括标题、摘要和出版年份。

- 蛋白质相互作用网络：节点是蛋白质，边表示物理相互作用或功能关联。理解这些图有助于识别药物靶点和疾病机制。

- **道路网络和运输**：节点是交叉口，边是路段，带有距离/时间权重。这些图上的最短路径算法支持导航系统。自动驾驶运动预测（第11章）将代理交互表示为图。

## 编程任务（使用CoLab或笔记本）

1. 构建一个小型的邻接矩阵图，并计算基本属性：每个节点的度数、长度为2的路径数量以及该图是否连通。
```python
import jax.numpy as jnp

# A simple graph: 5 nodes
# 0-1, 0-2, 1-2, 2-3, 3-4
A = jnp.array([[0, 1, 1, 0, 0],
               [1, 0, 1, 0, 0],
               [1, 1, 0, 1, 0],
               [0, 0, 1, 0, 1],
               [0, 0, 0, 1, 0]], dtype=float)

# Degree
degrees = A.sum(axis=1)
print(f"Degrees: {degrees}")

# Paths of length 2
A2 = A @ A
print(f"Paths of length 2 (node 0 to 3): {int(A2[0, 3])}")

# Connected? Check if A^(n-1) has all nonzero entries
An = jnp.linalg.matrix_power(A + jnp.eye(5), 4)  # (A+I)^4 for reachability
connected = jnp.all(An > 0)
print(f"Connected: {connected}")
```

2. 计算图拉普拉斯矩阵及其特征值。验证最小特征值为0，对应的特征向量是常数。
```python
import jax.numpy as jnp

A = jnp.array([[0, 1, 1, 0, 0],
               [1, 0, 1, 0, 0],
               [1, 1, 0, 1, 0],
               [0, 0, 1, 0, 1],
               [0, 0, 0, 1, 0]], dtype=float)

D = jnp.diag(A.sum(axis=1))
L = D - A

eigenvalues, eigenvectors = jnp.linalg.eigh(L)
print(f"Eigenvalues: {eigenvalues}")
print(f"Smallest eigenvector: {eigenvectors[:, 0]}")
print(f"Fiedler value (algebraic connectivity): {eigenvalues[1]:.4f}")

# Verify: x^T L x measures smoothness
x = jnp.array([1.0, 1.0, 1.0, -1.0, -1.0])  # two groups
smoothness = x @ L @ x
print(f"Smoothness of two-group signal: {smoothness:.2f}")
```

3. 对具有两个社区的图进行谱聚类。使用Fiedler向量嵌入节点，并根据符号分离它们。
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt

# Two communities of 5 nodes each, weakly connected
A = jnp.zeros((10, 10))
# Community 1: nodes 0-4 (dense)
for i in range(5):
    for j in range(i+1, 5):
        A = A.at[i, j].set(1).at[j, i].set(1)
# Community 2: nodes 5-9 (dense)
for i in range(5, 10):
    for j in range(i+1, 10):
        A = A.at[i, j].set(1).at[j, i].set(1)
# One bridge edge
A = A.at[2, 7].set(1).at[7, 2].set(1)

D = jnp.diag(A.sum(axis=1))
L = D - A
eigenvalues, eigenvectors = jnp.linalg.eigh(L)

# Fiedler vector (2nd smallest eigenvalue)
fiedler = eigenvectors[:, 1]
communities = (fiedler > 0).astype(int)

print(f"Fiedler vector: {fiedler}")
print(f"Clusters: {communities}")

plt.bar(range(10), fiedler, color=["#3498db" if c == 0 else "#e74c3c" for c in communities])
plt.xlabel("Node"); plt.ylabel("Fiedler vector value")
plt.title("Spectral Clustering via Fiedler Vector")
plt.show()
```
