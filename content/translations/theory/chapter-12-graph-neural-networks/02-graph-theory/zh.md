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

*图论提供描述关系、网络和连接结构的数学语言。本篇覆盖节点与边、邻接矩阵、图的类型、度与路径、图拉普拉斯、谱图论、社区检测和现实世界图。*


*格勒克理论为描述实体之间的关系提供了数学语言. 此文件涵盖节点,边缘,相接矩阵,图类型,程度和连通性,图拉普拉斯(Laplacian),光谱图形理论,以及现实世界的图表应用. 我们将深入研究纯计算机科学章节中的图表*

- 至今为止,本书中的数据一直生活在常规结构上:$\mathbb{R}^n$(第1章),矩阵作为数字网格(第2章),图像作为像素网格(第8章),序列作为所命令列表(第7章). 但许多现实世界的系统是**不规范的**:一个社交网络没有网格结构,一个分子没有从左到右的顺序,一个道路网络不会被整齐地拼接成行和列.

- **Graphs**是代表这些不规则,关系结构的数学工具. 图一取出它们之间的**实体**(节点)和**关系**(尖端)。一旦数据被作为图来表示,我们可以应用文件1的几何深度学习原理来从中学习.

## 节点、边与邻接



- 地图**$G = (V, E)$由一组**个节点**(或顶点)组成.$V = \{v_1, v_2, \ldots, v_n\}$和一套**网格**$E \subseteq V \times V$连接一对节点。

- 节点代表实体:人,原子,城市,网页,神经元. 边缘代表了关系:友谊,化学债券,道路,超链接,突触.

- ** 延迟矩阵**$A$是图表的矩阵。对于一个图$n$节点,$A$是一个$n \times n$矩阵$A_{ij} = 1$如果有来自节点的边缘$i$到节点$j$,以及$A_{ij} = 0$否则。

- 例如,三角形图(3个节点,全部连接)有:

```math
A = \begin{bmatrix} 0 & 1 & 1 \\ 1 & 0 & 1 \\ 1 & 1 & 0 \end{bmatrix}
```

![三角形图及其相邻矩阵: 1 有边缘, 0 否则](../images/graph_adjacency_matrix.svg)

- 对角是零,因为节点没有连接到自己(默认情况下没有自来Loops). 相接矩阵是直接应用我们在第二章所研究的布尔矩阵:每个条目都是二进制关系.

- 附式矩阵将图的结构完全编码. 矩阵操作$A$显示图表属性 :$A^2_{ij}$计算节点之间长度 2 的路径数$i$财务报告和已审计财务报表$j$(第2章的召回矩阵乘法:每个条目都是中间节点上的产品的总和. 更笼统地说,$A^k_{ij}$计数长度 -$k$路径。

- 每个节点可携带**地段向量**$\mathbf{x}_i \in \mathbb{R}^d$。。。对于一个社交网络来说,这可能是用户的概况信息. 对于一分子,它编码原子类型,电荷等属性. 完整的节点特性集是一个矩阵$X \in \mathbb{R}^{n \times d}$,其中每行都是一个节点的特征。

- 边缘还可以携带特征:分子中的结合类型,空间图中的距离,知识图中的关系类型. 边缘的** 尖端特征 **$(i, j)$是向量$\mathbf{e}_{ij} \in \mathbb{R}^{d_e}$.

## 图的类型



- ** 未定向图** 有对称边: 如果$i$连接到$j$,则$j$连接到$i$。。。相邻矩阵对称性:$A = A^T$(对称矩阵 第2章). 友谊和化学债券是没有方向性的。

- ** 定向图** (绘图) 有有方向的边缘:来自$i$改为$j$并不意味着从$j$改为$i$。。。相接矩阵不对称. 推特跟随,网络超链接,并引导引用网络.

- ** 加权图** 给每个边缘分配一个数值加权. 相邻矩阵有真实值的条目而不是二进制:$A_{ij} = w_{ij}$。。。道路网络中的距离、大脑连通性方面的相关优势以及社交网络中的互动频率都是加权的。

- 一个**双相图**有两个脱节的节点,边缘只在各节点之间(从未在其中). 用户和产品形成双相图:用户对产品进行评分,但用户不对用户进行评分. 双相图的相邻矩阵有一个块结构:

```math
A = \begin{bmatrix} 0 & B \\ B^T & 0 \end{bmatrix}
```

- 地点$B$是两个节点集之间的双相接矩阵。

- **多图**允许同一对节点和/或自带相间的多边. 知识图是典型的多图:两个实体可以有多种关系(如"生于","活于","活于"等).

- 一个**hypergraph ** 通俗化边缘,可以同时连接两个以上节点. 一个**hyperedge**连接了一组节点,代表了高阶关系. 由5人共同撰写的研究论文是连接了5个作者节点的"超尖端".

- a ** 完整的图表**$K_n$每对节点之间都有边缘。这是完全连接的地层的图模拟,而变压器运行的结构(每个符都注意其他符).

## 度、路径与连通性



- 一个节点的**度**是与之相接的边缘数. 在不定向的图表中,节点的度$i$实值$d_i = \sum_j A_{ij}$。。。高分节点为"接地",多有接地.

- **度矩阵**$D$是一个对角矩阵,在对角上标有学位:$D_{ii} = d_i$。。。这个矩阵在整个图理和GNN公式中出现.

- 两个节点之间的**path**是连接它们的边缘的序列. 最短路径**(或大地测量)$i$财务报告和已审计财务报表$j$是边缘最小的路径(或加权图中总重最小)。** Dijkstra 的算法** 发现最短的路径在$O((|V| + |E|) \log |V|)$时间。

- 如果每个节点之间都有一条路径,则图是**相接**. 如果没有,它有多个**相接组件**:孤立的子图而它们之间没有边缘.

- 一个图中的**直径**是任意一对节点之间最短的路径. 它测量图的"扩张"程度. 社交网络有出名的小直径("六度分离").

- **周期**是在同一节点开始和结束的路径. 无周期的图表是树。树是最简单的连接图:$n$节点和确切的$n-1$边缘

- ** 中央**衡量节点的重要性。** Degree中心** 仅仅是学位。** 贝特温内斯中心** 算上一个节点经过的最短路径。** Eigenvector 中心** 基于节点相邻者的重要性而给予重要性,导致 eigenvector 等式$A\mathbf{x} = \lambda \mathbf{x}$(第2章) 第3行,第1行,第2行,第2行,第2行,第2行,第2行,第2行,第2行,第2行,第2行,第2行,第2行,第2行,第2行,第2行,第2行,第2行,第2行,第2行,第2行,第2行,第2行,第2行,第4行,第2行,第5行,第7行,第6行,第10行. Google's PageRank)为指向图形学的eigenvector中心学的一个变种.

## 图拉普拉斯算子



- **图 Laplacian ** 也许是图论中最重要的矩阵. 定义如下:

$$L = D - A$$

- 地点$D$是学位矩阵和$A$是辅助矩阵。我们的三角形的例子:

```math
L = \begin{bmatrix} 2 & 0 & 0 \\ 0 & 2 & 0 \\ 0 & 0 & 2 \end{bmatrix} - \begin{bmatrix} 0 & 1 & 1 \\ 1 & 0 & 1 \\ 1 & 1 & 0 \end{bmatrix} = \begin{bmatrix} 2 & -1 & -1 \\ -1 & 2 & -1 \\ -1 & -1 & 2 \end{bmatrix}
```

- 拉普拉斯人有显著的特性:

    - 它总是**对称** 和** 阳性半定值**(从第2章中回顾:所有等值都是$\geq 0$) (中文(简体)). 对于任何向量$\mathbf{x}$:

$$\mathbf{x}^T L \mathbf{x} = \sum_{(i,j) \in E} (x_i - x_j)^2$$

![图形 Laplacian 测量信号平滑度:平滑信号在相接节点上具有相近的值,非平滑信号差异很大](../images/graph_laplacian_smoothness.svg)

    - 这个四进制表示一个多少信号$\mathbf{x}$在图上, 不同边缘。如果相邻的节点有相似的值,$\mathbf{x}^T L \mathbf{x}$是个小的。如果它们差异很大,就大了。拉普拉斯测量图上信号的**平滑度**.

    - 最小的等值总是0,有等值$\mathbf{1} = [1, 1, \ldots, 1]^T$(一常数信号有零变相). 0 eigen值数等于连接组件数.

    - 第二小的精华$\lambda_2$是**等数连通**(Fiedler值)。它测量了图的连接程度:$\lambda_2 = 0$表示图断开, 大$\lambda_2$表示图被紧密地连接.

- ** 通常的拉普拉斯式**分级:

$$\hat{L} = D^{-1/2} L D^{-1/2} = I - D^{-1/2} A D^{-1/2}$$

- 这种正常化保证了拉普拉斯的属性不依赖于节点度的绝对分量. 术语$D^{-1/2} A D^{-1/2}$是**对称的常态相接处**,它直接出现在GCN公式(文件3)中.

## 谱图论



- 图拉普拉西安的等分值和等分值定义了图的**光谱**,它们充当了傅里叶变换的相模.

- 在古典信号处理中,Fourier将一个信号分解为频率元件(sine和cosines). 在图上,拉普拉西安人的精子扮演了这些频率基的作用. 低等同位素的相位值在图中变化缓慢(低频,平滑),而高等同位素的相位值相位值则变化迅速(高频,振荡).

- **Graph Fourier变换(GFT)** 信号$\mathbf{x}$图表为:

$$\hat{\mathbf{x}} = U^T \mathbf{x}$$

- 地点$U$是拉普拉西安精子的基质(回顾出第2章的精子分解:$L = U \Lambda U^T$) (中文(简体)). 反向变换是$\mathbf{x} = U \hat{\mathbf{x}}$.

- **光谱域中的Graph convolution**是频率域的指向相乘法,正如空间域中的同分相乘法对应于傅里叶域(从第8章的卷积定理):

$$g_\theta \star \mathbf{x} = U \left((U^T g_\theta) \odot (U^T \mathbf{x}) \right) = U \, \text{diag}(\hat{g}_\theta) \, U^T \mathbf{x}$$

- 过滤器$\hat{g}_\theta$是eigenvalues 的一个可学习的函数。这是光谱GNN的基础,我们将简化成文件3中实用的GCN.

- 计算瓶颈是$L$,费用$O(n^3)$用于图表$n$节点。这对大图(百万个节点)来说是不切实际的. 多能相近(Chebyshev polynomials)完全避免了等分分解,而这种相近直接导致GCN.

## 社区检测



- 许多现实世界的图表有**社区结构**:集群间连接密集的节点群,并有稀疏的集群. 社交网络有好友小组,生物网络有功能模块,引用网络有研究领域.

- ** Spectral Crouping ** 使用拉普拉斯语的egenvectors来寻找社区. 想法是:使用$k$最小的非三角化编辑器$L$,然后在此嵌入空间中应用 k- 含义(第6章)。同一社区中的节点最终会相接相接地被光谱嵌入.

- 这之所以可行,是因为费德勒向量(从E.$\lambda_2$)自然地将图分出为两个组:带正值的节点和带负值的节点,切入最稀少的连接. 高层次的领袖们将这一点完善为更多的群体.

- ** 模式**$Q$衡量社区分区的质量。它在随机图中将社区内边缘的数目与预期的数字进行比较:

$$Q = \frac{1}{2|E|} \sum_{ij} \left(A_{ij} - \frac{d_i d_j}{2|E|} \right) \delta(c_i, c_j)$$

- 地点$c_i$是社区指定节点$i$财务报告和已审计财务报表$\delta$如果节点在同一社区,则为 1。$Q$范围从$-0.5$改为$1$,更高的价值表明社区结构更强.

## 现实世界中的图



- ** 社会网络**:节点是人,边缘是友谊或互动. Facebook拥有数十亿个节点和上千亿个边缘. 这些图表一般是稀有的(每个人有上百个朋友,而不是上亿个),展现出小世界属性(短平均路径长度),并有重尾分学位分布(几个有着上百万个连接的枢纽).

- **分子图**:节点为原子,边缘为化学结合. 每个原子都有特征(元素类型,充电,混合),而每个键有特征(单原子,双原子,三原子,芳香原子). 分子图体较小(有10至数百个节点),但结构高度. 从图结构中预测分子性质是GNNs的主要应用.

- **知识图**:节点是实体(人,地,概念),边缘是被打出的关系("生于","资本","INSTANCE"). 知识图解 动力搜索引擎,推荐系统,以及问答. 它们通常是与数百万个实体和数十亿个关系进行定向的多图。

- ** 选取网**:节点为论文,边缘为引用(指向). 集群揭示出研究群落. 节点特征包括标题,抽象和出版年份.

- ** 蛋白质相互作用网络**:节点为蛋白质,边缘表示物理相互作用或功能关联. 了解这些图表有助于确定药物目标和疾病机制。

- ** 公路网和运输**:节点为相交道口,边缘为有距离/时间重量的路段. 这些图上最短的路径算法是动力导航系统. 自驾车运动预测(第11章)代表了作为图的剂相互作用.

## 编程任务（使用 Colab 或 notebook）



1. 构建一个小的图作为相接矩阵并计算出基本属性:每个节点的度,长度2的路径数,以及图是否相连.
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

2. 计算图 Laplacian 及其等值。验证最小的eigen值为 0,相应的eigenvector为常数.
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

3. 将光谱组合在一个图上,与两个社区相接。使用Fiedler向量嵌入节点,并用符号将其分出.
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
