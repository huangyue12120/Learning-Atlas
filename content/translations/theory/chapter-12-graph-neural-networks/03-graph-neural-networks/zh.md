---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 12 - graph neural networks/03. graph neural networks.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: a48fe60ffc376a89155eb9009c7395c63219a358431c2565301075a66fd74bdb
status: reviewed
---
# 图神经网络

*图神经网络通过在连接节点之间传递消息来学习具有图结构数据。本文件涵盖了消息传递框架、GCN（Graph Convolutional Network）、GraphSAGE（GraphSage）、GIN（Graph Isomorphism Networks）、过拟合、图池化和节点/边/图级任务；这些是支持分子性质预测、社会网络分析和推荐系统的核心架构。*

- 在之前的文件中，我们建立了数学基础：几何深度学习（文件1）告诉我们利用对称性，而图论（文件2）为我们提供了节点、边和邻接的语言。现在我们构建直接操作图的神经网络。

- 主要挑战：图数据是**不规则的**。与图像（固定网格）或序列（固定顺序）不同，图有可变数量的节点、可变连接性和没有标准的节点排序。一个用于图的神经网络必须处理所有这些，同时保持对称性不变（重新排列节点不应改变输出）。

## 消息传递框架

- 大多数GNN遵循相同的配方，称为**消息传递**（也称为邻域聚合）。想法很简单且优雅：每个节点通过收集其邻居的信息来更新其表示。

- 在每层$l$中，每个节点$i$做三件事：

    1. **消息**：每个邻居$j$为节点$i$计算一个基于其当前特征的消息$\mathbf{m}_{j \to i}$。
    2. **聚合**：节点$i$收集所有 incoming消息并结合它们使用一个不变的聚合函数（求和、平均或最大值）。
    3. **更新**：节点$i$将聚合的消息与自己的特征结合起来，产生一个新的表示。

- 形式上：

$$\mathbf{m}_i^{(l)} = \bigoplus_{j \in \mathcal{N}(i)} \phi^{(l)}\left(\mathbf{h}_i^{(l)}, \mathbf{h}_j^{(l)}, \mathbf{e}_{ij}\right)$$
$$\mathbf{h}_i^{(l+1)} = \psi^{(l)}\left(\mathbf{h}_i^{(l)}, \mathbf{m}_i^{(l)}\right)$$
- 其中$\mathcal{N}(i)$是节点$i$的邻居集合，$\bigoplus$是一个不变的聚合函数（求和、平均或最大值），$\phi$是消息函数，$\psi$是更新函数，$\mathbf{e}_{ij}$是可选的边特征。

![](../images/message_passing_gnn.svg)


- 聚合$\bigoplus$必须不变（无论邻居如何处理）以确保整体功能不变对称性。这直接实现了文件1中的对称原则。

- 在$k$层的消息传递后，每个节点的表示编码了其**$k$-hop邻域**的信息：所有可达的节点在$k$条边内。第一层看到直接邻居，第二层看到邻居的邻居，依此类推。这是如何将局部信息传播到构建全局理解的方式。

- 图神经网络的 receptive场随着深度而增长，就像CNN随着层数而增长（第8章）。但与在固定网格上运行的CNN不同，图神经网络的 receptive场形状因节点的图拓扑结构而异。

## 图卷积网络（GCN）

- **GCN**（Kipf & Welling，2017）是基础的GNN架构。它简化了从文件2中获得的谱图卷积为一个优雅且高效的公式。

- 从谱图卷积 $g_\theta \star \mathbf{x} = U \, \text{diag}(\hat{g}_\theta) \, U^T \mathbf{x}$ 开始，Kipf 和 Welling 使用第一个阶的切比雪夫多项式近似谱滤波器，从而避免了完全计算特征分解。简化后，每层更新变为：

$$H^{(l+1)} = \sigma\left(\hat{A} H^{(l)} W^{(l)}\right)$$
- 其中：
    - $H^{(l)} \in \mathbb{R}^{n \times d}$ 是第 $l$ 层节点特征矩阵
    - $W^{(l)} \in \mathbb{R}^{d \times d'}$ 是可学习的权重矩阵
    - $\hat{A} = \tilde{D}^{-1/2} \tilde{A} \tilde{D}^{-1/2}$ 是带有自环的对称归一化邻接矩阵
    - $\tilde{A} = A + I$ 添加了自环（因此每个节点也接收自己的消息）
    - $\tilde{D}$ 是 $\tilde{A}$ 的度矩阵
    - $\sigma$ 是非线性激活（如第6章所述的ReLU）

- 矩阵乘法 $\hat{A} H^{(l)}$ 是聚合步骤：对于每个节点，它计算其邻居特征的加权平均值（加上自身的消息，通过自环）。权重矩阵 $W^{(l)}$ 是可学习的变换，共享给所有节点。激活添加非线性。

- 这非常简单：它只是矩阵乘法后跟着一个可学习的线性映射和激活。整个GCN层可以写成一行代码。归一化通过 $\tilde{D}^{-1/2}$ 防止度数高的节点主导：高度节点的消息被缩放下来。

- 在消息传递框架中，GCN使用：
    - 消息：$\phi(\mathbf{h}_j) = \mathbf{h}_j$（只发送你的特征）
    - 合并：归一化求和（按度数加权）
    - 更新：线性变换 + 激活

## 图SAGE

- GCN是**可转导的**：它在训练时需要整个图，无法处理新、未见过的节点。如果一个新用户加入社交网络，GCN必须重新训练整个图。**GraphSAGE**（Hamilton et al., 2017）通过引入**归纳**方法解决了这个问题。

- 主要思想是**邻域采样**：而不是使用所有邻居，而是随机选择固定大小的子集。这使得计算独立于完整的图结构，并且允许对未见过节点和图进行泛化。

- 图SAGE节点 $i$的更新：

$$\mathbf{h}_i^{(l+1)} = \sigma\left(W^{(l)} \cdot \text{CONCAT}\left(\mathbf{h}_i^{(l)}, \text{AGG}\left(\{\mathbf{h}_j^{(l)} : j \in \mathcal{S}(i)\}\right)\right)\right)$$
- $\mathcal{S}(i)$ 是一个 **采样** 的邻居子集（例如，随机从 500 个邻居中抽取 10 个）。CONCAT 操作明确地将节点自身的特征与聚合的邻居特征分开，让网络学习不同变换对于“自己”和“邻域”的不同。

- GraphSAGE支持多种聚合函数：
    - **平均值**：简单且有效（$\text{AGG} = \frac{1}{|\mathcal{S}|} \sum_{j \in \mathcal{S}} \mathbf{h}_j$）
    - **LSTM**：将采样邻居通过LSTM进行喂养（但引入了顺序依赖，某种程度上违反了排列不变性）
    - **池化**：非线性变换后取最大值（$\text{AGG} = \max(\{\sigma(W_{\text{pool}} \mathbf{h}_j + \mathbf{b})\})$）

- 采样策略使GraphSAGE在处理非常大的图时具有可扩展性。训练使用节点的mini-batch：对于每个目标节点，层1中随机选择$k_1$个邻居，然后为这些邻居中的每一个层2中再随机选择$k_2$个邻居。在2层和$k_1 = k_2 = 10$个邻居的情况下，每个节点的计算树最多包含$10 \times 10 = 100$个节点，与图的大小无关。

## 图同构网络（GIN）

- 不同的 GNN 架构具有不同的 **表达能力**：它们区分结构不同图的能力。 GCN 和 GraphSAGE，尽管在实践中非常有效，但被证明在能够区分哪些图结构方面是有局限性的。

- 测量 GNN 表达能力的理论工具是 **Weisfeiler-Lehman (WL) 测试**，这是一种经典的算法，用于测试图同构（两个图是否在结构上相同）。 WL 测试通过将每个节点的标签与邻节点标签的多重集一起哈希来迭代地细化节点标签。

- **GIN**（Xu et al., 2019）设计为与WL测试一样具有表达力，因此是消息传递GNN中最强大的。关键洞察：聚合函数必须在多集上是可逆的（不同邻居特征的多集会产生不同的聚合值）。

- 向量空间中的和聚合是可逆的（向量 $\{1, 1, 2\}$ 的和为 4，而 $\{1, 3\}$ 的和也为 4，但当特征向量足够维度时，不同多集的和通常是不同的）。平均值和最大值不是可逆的：平均值无法区分 $\{1, 1\}$ 和 $\{2, 2\}$，最大值也无法区分 $\{1, 2, 3\}$ 和 $\{1, 1, 3\}$。

- GIN 更新是：

$$\mathbf{h}_i^{(l+1)} = \text{MLP}^{(l)}\left((1 + \epsilon^{(l)}) \cdot \mathbf{h}_i^{(l)} + \sum_{j \in \mathcal{N}(i)} \mathbf{h}_j^{(l)}\right)$$
- $\epsilon$ 是一个可学习的标量（或固定为 0），而 MLP 提供非线性、可逆映射。聚合操作保留了集合结构，MLP 可以学习区分任何两个不同的聚合值。

## 过度平滑

- GNNs面临的一个主要挑战是 **过度平滑**：随着层数的增加，所有节点表示都收敛到同一个值，从而丧失区分不同节点的能力。

![](../images/over_smoothing_gnn.svg)


- 机制直观。每个消息传递层平均一个节点的特征与它的邻居。经过许多轮的平均，每个节点都见过（并融合了）它连接组件中的每一个其他节点。这些特征成为了一个均匀的平均值，就像将图像模糊得太多次以至于变成单一的颜色一样。

- 形式上，对归一化邻接矩阵 $\hat{A}$ 的多次应用收敛到一个秩为1的矩阵（每行都变为随机游走的平稳分布）。这与向量迭代向主导特征值靠近的结果相同（第2章）。

- 过度平滑限制了GNNs的深度（通常为2到4层），与CNNs和transformers相比，这些模型受益于数十或数百层。这意味着每个节点只能看到有限的邻域，这对于需要长距离信息的任务来说是一个问题。

- 防范措施包括：
    - **残余连接**（来自ResNets，第8章）：$\mathbf{h}_i^{(l+1)} = \mathbf{h}_i^{(l+1)} + \mathbf{h}_i^{(l)}$，保留早期层的信息。
    - **跳跃知识**：将所有层的表示进行拼接或注意力池化，而不是仅使用最后一层。
    - **丢边**：在训练期间随机删除边，减慢信息传播速度。
    - **图变换器**（文件4）：通过全局注意力绕过局部消息传递瓶颈。

## 图池化

- 对于 **图级任务**（预测整个图的属性，如分子的毒性），我们需要将所有节点表示合并成一个图级向量。这正是 CNNs 中全局平均池化在图上的对应——即图池化。

- 最简单的方法是 **读取**：对所有节点特征应用不变性函数。

$$\mathbf{h}_G = \text{READOUT}(\{\mathbf{h}_i^{(L)} : i \in V\}) = \sum_i \mathbf{h}_i^{(L)} \quad \text{or} \quad \frac{1}{|V|} \sum_i \mathbf{h}_i^{(L)} \quad \text{or} \quad \max_i \mathbf{h}_i^{(L)}$$
- 这正是文件 1 中的 DeepSets 汇总，应用在最终的 GNN 层之后。求和保留大小信息（一个有 100 个节点的图将比一个有 10 个节点的图大），而平均值则进行归一化处理。

- **Hierarchical pooling** progressively coarsens the graph, mirroring how CNNs progressively downsample images. At each level, groups of nodes are merged into "supernodes":

- **DiffPool** (Differentiable Pooling) learns a soft assignment matrix $S^{(l)} \in \mathbb{R}^{n_l \times n_{l+1}}$ that assigns each node to a cluster:

$$X^{(l+1)} = S^{(l)T} H^{(l)}, \quad A^{(l+1)} = S^{(l)T} A^{(l)} S^{(l)}$$
- The assignment matrix is predicted by a separate GNN, making the clustering end-to-end differentiable. This creates a hierarchy: the original graph → a coarsened graph with fewer nodes → an even coarser graph → a single node (the graph representation).

- **TopKPool** 采用了一种更简单的方法：为每个节点学习一个简单的分数，保留得分最高的前-$k$个节点，并丢弃其余的。这是一种硬选择（不是软赋值），比DiffPool计算成本更低。

## 异构图

- 所有现有的 GNNs 都假设一个 **同质图**：一种类型的节点和一种类型的边。但大多数现实世界中的图都是 **异质的**：多种类型的节点和多种类型的边。知识图中有人员节点、组织节点和地点节点，通过“工作在”、“出生在”和“位于”边连接。推荐系统中有用户节点和物品节点通过“购买”、“查看”和“评分”边连接。

- 一个异构图有一个 **模式**（也称为元图），定义了允许的节点类型和边类型。每个边类型连接特定源类型的节点到特定目标类型的节点。例如，“工作于”连接人→组织。

- **关系图神经网络（R-GCN）**（Schlichtkrull等，2018年）通过为每种边类型使用单独的权重矩阵来处理异质边。

$$\mathbf{h}_i^{(l+1)} = \sigma\left(\sum_{r \in \mathcal{R}} \sum_{j \in \mathcal{N}_r(i)} \frac{1}{|\mathcal{N}_r(i)|} W_r^{(l)} \mathbf{h}_j^{(l)} + W_0^{(l)} \mathbf{h}_i^{(l)}\right)$$
- $\mathcal{R}$ 是边类型的集合，$\mathcal{N}_r(i)$ 是通过关系 $r$ 连接到节点 $i$ 的邻居的集合，$W_r$ 是特定于关系 $r$ 的权重矩阵。自连接 $W_0$ 处理节点自身的特征单独。

- 问题：随着关系类型增多，参数数量急剧增加（一个 $d \times d$ 矩阵每种关系。R-GCN通过**基础分解**来缓解这一点。 $W_r = \sum_{b=1}^{B} a_{rb} V_b$在何处 $V_b$ 共享基础矩阵 $a_{rb}$ 每个关系都有标量系数。这类似于低秩分解（第2章）：关系特定的矩阵在低维子空间中生活。

- **异构图变换器（HGT）**（Hu et al., 2020）将注意力机制应用于异构图。关键洞察是，注意力应同时依赖节点类型和连接它们的边类型。HGT使用特定于节点类型的查询、键和值投影矩阵：

$$\text{Attention}(i, j) = \left(W_{\tau(i)}^Q \mathbf{h}_i\right)^T \cdot \frac{W_{\phi(i,j)}^{\text{ATT}}}{\sqrt{d}} \cdot \left(W_{\tau(j)}^K \mathbf{h}_j\right)$$
- 在 $\tau(i)$ 类型的节点和 $i$ 之间的 $\phi(i,j)$ 类型的边中，模型会根据关系类型的不同而有不同的关注权重。例如，一篇论文在关注其作者时使用不同的注意力权重，而在关注其引用时则使用不同的注意力权重。

- **基于元路径的方法**定义了通过模式（例如，作者 → 论文 → 作者以进行共著）的有意义路径，并在这些路径上聚合信息。 **HAN**（异质注意力网络）在两个层次应用注意力：在每个元路径中（哪些邻居沿着这个路径重要？）和跨元路径（哪些关系模式重要？）。

## 链接预测和知识图谱填充

- **链接预测**的问题是：已知现有的边，哪些缺失的边最有可能存在？这是知识图谱完成（预测缺失事实）、推荐（预测用户会喜欢什么）和社交网络分析（预测未来友谊）的核心任务。

- **基于嵌入的方法** 为每个实体和关系学习一个向量，并为每个关系学习一个变换，然后通过评估实体和关系是否匹配来评分潜在的边：

- **TransE** 将关系视为嵌入空间中的平移。如果 $(h, r, t)$ 是一个有效的三元组（头实体、关系、尾实体），则 $\mathbf{h} + \mathbf{r} \approx \mathbf{t}$。评分函数是 $f(h, r, t) = -\|\mathbf{h} + \mathbf{r} - \mathbf{t}\|$。直观上，关系向量将头实体移动到嵌入空间中的尾实体。

- **RotatE** 将关系建模为复空间中的旋转：$\mathbf{t} = \mathbf{h} \circ \mathbf{r}$，其中 $\circ$ 是元素级的复数乘法，而 $|\mathbf{r}_i| = 1$（单位复数是旋转）。这可以模型 TransE 无法捕捉到的对称性、反对称性、倒置和组合模式。

- **ComplEx** 使用复数嵌入，并采用共轭点积，从而能够建模非对称关系（例如，A是B的上司，但B不是A的上司）。

- GNN-based link prediction computes node embeddings with message passing, then scores edges using the endpoint embeddings. This combines the structural reasoning of GNNs with the relational modelling of embedding methods. The GNN encoder captures multi-hop neighbourhood structure that single-embedding methods miss.

## 任务类型

- GNNs解决三种类别的问题:

- **节点级别的任务**: 预测每个节点的属性。例如，在社交网络中预测用户（机器人或人类）的身份，预测蛋白质在相互作用网络中的功能，半监督节点分类（标记几个节点，预测剩余部分）。输出是通过分类器传递的节点嵌入 $\mathbf{h}_i^{(L)}$.

- **边级别的任务**: 预测每个边或预测边是否存在。例如，链接预测（这两个用户是否会成为朋友？），知识图谱完成（这个关系是否存在于这些实体之间？），药物-药物相互作用预测。输出通常使用两个端点节点的嵌入： $\hat{y}_{ij} = f(\mathbf{h}_i, \mathbf{h}_j)$，其中 $f$ 是点积、连接 + MLP 或其他组合.

- **图级任务**: 预测整个图的属性。例如：分子性质预测（这个分子有毒吗？）、图分类（这个社交网络是机器人网络吗？）、图生成（设计具有所需特性的分子）。输出使用图聚合来产生 $\mathbf{h}_G$，然后进行分类或回归。

## 编程任务（使用 Colab 或笔记本）

1. 实现一个从头开始的GCN层，使用归一化的邻接矩阵。将其应用于一个小图，并观察节点特征是如何平滑的。
```python
import jax
import jax.numpy as jnp

# Graph: 5 nodes, simple chain with a branch
A = jnp.array([[0, 1, 0, 0, 0],
               [1, 0, 1, 0, 0],
               [0, 1, 0, 1, 1],
               [0, 0, 1, 0, 0],
               [0, 0, 1, 0, 0]], dtype=float)

# Add self-loops
A_hat = A + jnp.eye(5)
D_hat = jnp.diag(A_hat.sum(axis=1))
D_inv_sqrt = jnp.diag(1.0 / jnp.sqrt(A_hat.sum(axis=1)))
A_norm = D_inv_sqrt @ A_hat @ D_inv_sqrt

# Node features: one-hot identity
H = jnp.eye(5)

# Weight matrix (random initialisation)
rng = jax.random.PRNGKey(0)
W = jax.random.normal(rng, (5, 3)) * 0.5

# GCN layer: H' = ReLU(A_norm @ H @ W)
H_new = jax.nn.relu(A_norm @ H @ W)

print("Original features (one-hot):")
print(H)
print("\nAfter GCN layer:")
print(jnp.round(H_new, 3))
print("\nNotice: connected nodes now have similar representations")
```

2. 实现基于加权聚合的消息传递（GIN风格），并与基于平均聚合的GCN风格进行比较。展示加权聚合可以区分那些平均聚合无法区分的多集。
```python
import jax.numpy as jnp

# Two different neighbourhood multisets that have the same mean
# Node A: neighbours have features [1, 1, 1, 1](four neighbours, all 1)
# Node B: neighbours have features [2, 2](two neighbours, all 2)

neighbours_A = jnp.array([[1.0], [1.0], [1.0], [1.0]])
neighbours_B = jnp.array([[2.0], [2.0]])

# Mean aggregation
mean_A = neighbours_A.mean(axis=0)
mean_B = neighbours_B.mean(axis=0)
print(f"Mean A: {mean_A}, Mean B: {mean_B}, Same: {jnp.allclose(mean_A, mean_B)}")

# Sum aggregation
sum_A = neighbours_A.sum(axis=0)
sum_B = neighbours_B.sum(axis=0)
print(f"Sum A:  {sum_A},  Sum B:  {sum_B},  Same: {jnp.allclose(sum_A, sum_B)}")
print("\nSum distinguishes these multisets; mean does not!")
```

3. 展示过平滑现象。将归一化的邻接矩阵重复应用，并观察节点特征如何收敛。
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt

# Random graph
A = jnp.array([[0,1,1,0,0,0],
               [1,0,1,0,0,0],
               [1,1,0,1,0,0],
               [0,0,1,0,1,1],
               [0,0,0,1,0,1],
               [0,0,0,1,1,0]], dtype=float)

A_hat = A + jnp.eye(6)
D_inv_sqrt = jnp.diag(1.0 / jnp.sqrt(A_hat.sum(axis=1)))
A_norm = D_inv_sqrt @ A_hat @ D_inv_sqrt

# Initial features: distinct per node
H = jnp.array([[1,0], [0,1], [1,1], [-1,0], [0,-1], [-1,-1]], dtype=float)

distances = []
for k in range(20):
    H = A_norm @ H
    # Measure how distinct the features are (std across nodes)
    spread = jnp.std(H, axis=0).mean()
    distances.append(float(spread))

plt.plot(distances, "o-")
plt.xlabel("Number of message-passing rounds")
plt.ylabel("Feature spread (std across nodes)")
plt.title("Over-Smoothing: Features Converge with Depth")
plt.show()
```
