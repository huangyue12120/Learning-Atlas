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

*图神经网络通过在相连节点之间传递消息，从图结构数据中学习。本篇介绍消息传递框架、GCN、GraphSAGE、GIN、过度平滑、图池化，以及节点级、边级和图级任务。这些架构广泛用于分子性质预测、社交网络分析和推荐系统。*

- 前两篇介绍了所需的数学基础：几何深度学习（第 1 篇）说明如何利用对称性，图论（第 2 篇）提供节点、边和邻接等概念。现在可以据此构建直接处理图的神经网络。

- 图数据的主要挑战是**不规则**：与固定网格的图像和顺序固定的序列不同，图的节点数和连接关系各不相同，也没有固定的节点排序。图神经网络需要适应这些差异。重新标记节点时，节点级输出应相应地重新排列；图级输出则应保持不变。

## 消息传递框架

- 几乎所有 GNN 都遵循一种称为**消息传递**（也称邻域聚合）的流程：每个节点收集邻居的信息，再据此更新自己的表示。

- 在第 $l$ 层，每个节点 $i$ 做三件事：

    1. **生成消息**：节点 $i$ 的每个邻居 $j$ 根据当前特征计算发往 $i$ 的消息 $\mathbf{m}_{j \to i}$。
    2. **聚合消息**：节点 $i$ 收集所有传入消息，再用求和、平均或最大值等排列不变函数合并它们。
    3. **更新表示**：节点 $i$ 将聚合结果与自身特征结合，得到新的表示。

- 形式化地：

$$\mathbf{m}_i^{(l)} = \bigoplus_{j \in \mathcal{N}(i)} \phi^{(l)}\left(\mathbf{h}_i^{(l)}, \mathbf{h}_j^{(l)}, \mathbf{e}_{ij}\right)$$

$$\mathbf{h}_i^{(l+1)} = \psi^{(l)}\left(\mathbf{h}_i^{(l)}, \mathbf{m}_i^{(l)}\right)$$

- 其中，$\mathcal{N}(i)$ 是节点 $i$ 的邻居集合，$\bigoplus$ 是排列不变的聚合操作（求和、平均或最大值），$\phi$ 是消息函数，$\psi$ 是更新函数，$\mathbf{e}_{ij}$ 是可选的边特征。

![消息传递：邻居发送消息，经排列不变操作聚合后，节点更新自身特征](../images/message_passing_gnn.svg)

- 聚合操作 $\bigoplus$ 必须对邻居顺序不敏感，才能使节点级网络对节点重标记保持**等变**。这正是第 1 篇几何深度学习中对称性原则的体现。若输出是整张图的表示，则通常要求它对节点置换**不变**。

- 经过 $k$ 层消息传递后，每个节点的表示都能包含其 **$k$ 跳邻域**的信息，也就是沿不超过 $k$ 条边可到达的节点信息。第 1 层接收直接邻居的信息，第 2 层还能接收邻居的邻居的信息，依此类推。这样，局部信息便能逐层传播。

- GNN 的**感受野**会随网络深度扩大，与 CNN 的感受野随层数增加而扩大类似（第 8 章）。但在图中，每个节点的感受野形状取决于图的连接结构，并不像规则网格上的 CNN 那样固定。

## 图卷积网络（GCN）

- **GCN**（Kipf 和 Welling，2017）是经典的 GNN 架构之一。它把第 2 篇的谱图卷积简化为一个高效的公式。

- 从谱卷积 $g_\theta \star \mathbf{x} = U \, \text{diag}(\hat{g}_\theta) \, U^T \mathbf{x}$ 出发，Kipf 和 Welling 用一阶切比雪夫多项式近似谱滤波器，从而不必显式计算特征分解。简化后，每层的更新为：

$$H^{(l+1)} = \sigma\left(\hat{A} H^{(l)} W^{(l)}\right)$$

- 其中：
    - $H^{(l)} \in \mathbb{R}^{n \times d}$ 是第 $l$ 层的节点特征矩阵；
    - $W^{(l)} \in \mathbb{R}^{d \times d'}$ 是可学习的权重矩阵；
    - $\hat{A} = \tilde{D}^{-1/2} \tilde{A} \tilde{D}^{-1/2}$ 是加入自环后的对称归一化邻接矩阵；
    - $\tilde{A} = A + I$ 表示为邻接矩阵加入自环，使节点也能接收自身的信息；
    - $\tilde{D}$ 是 $\tilde{A}$ 对应的度矩阵；
    - $\sigma$ 是非线性激活函数，例如第 6 章介绍的 ReLU。

- 矩阵乘法 $\hat{A} H^{(l)}$ 完成聚合：对每个节点加权汇总邻居特征，并通过自环纳入自身特征。权重矩阵 $W^{(l)}$ 是所有节点共享的可学习变换，激活函数则引入非线性。

- 一层 GCN 可以概括为邻接矩阵乘法、可学习的线性变换和激活函数。度归一化会削弱高度节点消息的影响，避免其仅凭邻居数量主导聚合结果。

- 用消息传递框架描述，GCN 的组成是：
    - **消息**：$\phi(\mathbf{h}_j) = \mathbf{h}_j$，即传递邻居特征；
    - **聚合**：按节点度归一化的加权求和；
    - **更新**：线性变换后接激活函数。

## GraphSAGE

- 传统 GCN 常采用**传导式**设定：训练时使用已知图的结构和节点特征。新节点能否直接加入训练好的 GCN，取决于训练方式、可用特征和推理实现；原文把这一限制概括为必须在整张图上重训。**GraphSAGE**（Hamilton 等，2017）则从设计上采用**归纳式**方法，以便对未见节点生成表示。

- GraphSAGE 的关键做法是**邻域采样**：不使用全部邻居，而是为每个节点抽取固定数量的邻居。这样可以限制计算量，并推广到训练时未见过的节点或图。

- GraphSAGE 对节点 $i$ 的更新为：

$$\mathbf{h}_i^{(l+1)} = \sigma\left(W^{(l)} \cdot \text{CONCAT}\left(\mathbf{h}_i^{(l)}, \text{AGG}\left(\{\mathbf{h}_j^{(l)} : j \in \mathcal{S}(i)\}\right)\right)\right)$$

- 其中，$\mathcal{S}(i)$ 是抽样得到的邻居子集，例如从 500 个邻居中随机抽取 10 个。`CONCAT` 将节点自身特征与邻居聚合结果拼接，让模型能对两者学习不同的变换。

- GraphSAGE 可以使用多种聚合函数：
    - **平均聚合**：$\text{AGG} = \frac{1}{|\mathcal{S}|} \sum_{j \in \mathcal{S}} \mathbf{h}_j$，简单有效；
    - **LSTM 聚合**：按某个顺序将抽样邻居输入 LSTM。结果会依赖输入顺序，因此可能破坏排列不变性；
    - **池化聚合**：先作非线性变换，再逐元素取最大值，即 $\text{AGG} = \max(\{\sigma(W_{\text{pool}} \mathbf{h}_j + \mathbf{b}) : j \in \mathcal{S}\})$。

- 邻域采样让 GraphSAGE 能扩展到大型图。训练时可以对一批目标节点抽样：第一层为每个目标节点抽取 $k_1$ 个邻居，再为这些邻居各抽取 $k_2$ 个邻居。若 $k_1 = k_2 = 10$ 且有两层，则每个目标节点至多对应 100 条第二跳采样路径；按完整计算树计数时，还需加上目标节点和第一跳节点。

## 图同构网络（GIN）

- 不同 GNN 的**表达能力**不同，也就是区分结构不同的图的能力。GCN 和 GraphSAGE 虽然实用，但在区分某些图结构方面有理论限制。

- **Weisfeiler–Lehman（WL）检验**是分析 GNN 表达能力的经典工具。它通过反复组合每个节点的标签及其邻居标签的多重集，再对结果重新编码（通常称为哈希）来细化节点标签。它可用于图同构检验，但 1-WL 并不能区分所有非同构图。

- **GIN**（Xu 等，2019）的表达能力可达到消息传递 GNN 理论上的上限，即与 1-WL 检验相当。关键条件之一是聚合函数对邻居特征的多重集具有**单射性**：不同的多重集应映射到不同结果。

- 求和在经过合适的特征映射后，可以保留多重集中的计数信息；但原始求和本身并不总是单射。例如，$\{1, 1, 2\}$ 与 $\{1, 3\}$ 的和都是 4。平均值和最大值也会丢失信息：平均值无法区分 $\{1, 1\}$ 和 $\{2, 2\}$，最大值无法区分 $\{1, 2, 3\}$ 和 $\{1, 1, 3\}$。因此，不能仅凭“用了求和”就保证任意多重集都可区分。

- GIN 的更新公式为：

$$\mathbf{h}_i^{(l+1)} = \text{MLP}^{(l)}\left((1 + \epsilon^{(l)}) \cdot \mathbf{h}_i^{(l)} + \sum_{j \in \mathcal{N}(i)} \mathbf{h}_j^{(l)}\right)$$

- 其中 $\epsilon$ 是可学习的标量，也可以固定为 0。MLP 提供非线性变换；在适当条件下，它可以区分不同的聚合结果。GIN 的表达能力仍受消息传递框架本身的理论限制。

## 过度平滑

- GNN 面临的一个挑战是**过度平滑**：层数增加时，不同节点的表示会逐渐趋同，难以区分。

![过度平滑：不同节点的特征逐层混合，深层表示趋于相似](../images/over_smoothing_gnn.svg)

- 直观地说，每层消息传递都会混合节点及其邻居的特征。反复聚合后，节点表示包含越来越多相邻节点的信息，差异随之减小。这类似于反复模糊图像，最后细节逐渐消失。

- 在连通且加入自环的图上，反复应用对称归一化邻接矩阵会使表示趋向低维空间，因而不同节点的特征可能变得相似。原文将这一过程概括为“每行趋向随机游走的平稳分布”；严格说，对称归一化邻接矩阵的极限与随机游走矩阵不同，其主导方向还与节点度数有关。

- 过度平滑会限制许多常规 GNN 的有效深度，实践中常见的网络只有 2 到 4 层。相比之下，CNN 和 Transformer 有时会使用数十甚至数百层。较浅的 GNN 只能利用有限跳数的邻域，可能难以处理依赖远距离信息的任务。

- 常见缓解方法包括：
    - **残差连接**（第 8 章的 ResNet）：把前一层表示加到当前层输出中，以保留较早的信息，可写作 $\mathbf{h}_{i,\mathrm{res}}^{(l+1)} = \mathbf{h}_i^{(l+1)} + \mathbf{h}_i^{(l)}$。原文将残差输出和层输出写成同一符号；这里用 $\mathbf{h}_{i,\mathrm{res}}^{(l+1)}$ 区分相加后的表示。
    - **Jumping Knowledge**：拼接或通过注意力汇总各层表示，而不只使用最后一层。
    - **DropEdge**：训练时随机删去一些边，减缓信息传播。
    - **图 Transformer**（第 4 篇）：通过全局注意力绕开局部消息传递的限制。

## 图池化

- 对于**图级任务**，例如预测分子的毒性，需要把所有节点表示汇总为一个图级向量。**图池化**对应于 CNN 中的全局池化（第 8 章）。

- 最简单的做法是**读出**（readout）：对所有节点特征应用排列不变函数，得到图的表示：

$$\mathbf{h}_G = \text{READOUT}(\{\mathbf{h}_i^{(L)} : i \in V\}) = \sum_i \mathbf{h}_i^{(L)} \quad \text{or} \quad \frac{1}{|V|} \sum_i \mathbf{h}_i^{(L)} \quad \text{or} \quad \max_i \mathbf{h}_i^{(L)}$$

- 这相当于在 GNN 最后一层之后应用第 1 篇的 DeepSets 聚合。求和对图大小敏感；平均值会按节点数归一化。求和值是否随节点数增大，还取决于节点表示的取值。

- **层次化池化**会逐步粗化图，类似 CNN 逐步降低图像分辨率；每一层都会把若干节点合并为“超节点”。

- **DiffPool**（可微池化）学习一个软分配矩阵 $S^{(l)} \in \mathbb{R}^{n_l \times n_{l+1}}$，把每个节点分配给某个簇：

$$X^{(l+1)} = S^{(l)T} H^{(l)}, \quad A^{(l+1)} = S^{(l)T} A^{(l)} S^{(l)}$$

- 分配矩阵由另一个 GNN 预测，因此聚类可以端到端地训练。这样能形成层级结构：原图逐步变成节点更少的粗化图，再继续粗化，最终可汇总为单个图表示。

- **TopKPool** 的做法更直接：为每个节点学习一个分数，只保留分数最高的 $k$ 个节点并丢弃其余节点。这是硬选择，而非软分配，计算成本通常低于 DiffPool。

## 异构图

- 前面介绍的 GNN 假设图是**同质图**，即节点和边各只有一种类型。许多现实图则是**异构图**，含有多种节点类型和边类型。例如，知识图谱可以包含人物、组织和地点节点，以及“任职于”“出生于”“位于”等关系；推荐系统可以包含用户和商品节点，以及“购买”“浏览”“评分”等关系。

- 异构图有一个**模式**（也称元图），规定允许出现的节点类型和边类型。每种边类型都连接特定的源节点类型和目标节点类型。例如，“任职于”连接“人物”与“组织”。

- **关系图卷积网络**（R-GCN，Schlichtkrull 等，2018）为不同边类型使用不同的权重矩阵，以处理异构关系：

$$\mathbf{h}_i^{(l+1)} = \sigma\left(\sum_{r \in \mathcal{R}} \sum_{j \in \mathcal{N}_r(i)} \frac{1}{|\mathcal{N}_r(i)|} W_r^{(l)} \mathbf{h}_j^{(l)} + W_0^{(l)} \mathbf{h}_i^{(l)}\right)$$

- 其中 $\mathcal{R}$ 是边类型集合，$\mathcal{N}_r(i)$ 是通过关系 $r$ 与节点 $i$ 相连的邻居集合，$W_r$ 是关系 $r$ 对应的权重矩阵。自连接项 $W_0$ 单独处理节点自身的特征。

- 关系类型很多时，每种关系都使用一个 $d \times d$ 矩阵会产生大量参数。R-GCN 可用**基分解**缓解这一问题：$W_r = \sum_{b=1}^{B} a_{rb} V_b$，其中 $V_b$ 是共享的基矩阵，$a_{rb}$ 是每种关系对应的标量系数。这类似于低秩分解：关系矩阵由低维子空间中的基矩阵组合而成。

- **异构图 Transformer**（HGT，Hu 等，2020）把注意力机制用于异构图。注意力权重同时依赖节点类型和边类型。HGT 为查询和键使用按节点类型区分的投影矩阵，并为边类型设置注意力变换：

$$\text{Attention}(i, j) = \left(W_{\tau(i)}^Q \mathbf{h}_i\right)^T \cdot \frac{W_{\phi(i,j)}^{\text{ATT}}}{\sqrt{d}} \cdot \left(W_{\tau(j)}^K \mathbf{h}_j\right)$$

- 其中，$\tau(i)$ 表示节点 $i$ 的类型，$\phi(i,j)$ 表示连接节点 $i$ 和 $j$ 的边类型。模型可以据此区分关系：论文关注作者时使用的注意力权重，可以不同于它关注引用文献时使用的权重。

- **元路径方法**在图模式中定义有意义的路径，例如“作者 → 论文 → 作者”表示合著关系，再沿这些路径聚合信息。**HAN**（异构注意力网络）分两层应用注意力：先判断同一元路径中的哪些邻居重要，再判断哪些关系模式重要。

## 链接预测与知识图谱补全

- **链接预测**要解决的问题是：已知图中的部分边，哪些缺失的边可能存在？它是知识图谱补全（预测缺失事实）、推荐（预测用户可能喜欢的商品）和社交网络分析（预测未来友谊）的核心任务。

- **基于嵌入的方法**为每个实体学习一个向量，为每种关系学习一个变换，再根据实体与关系是否匹配给候选边打分。

- **TransE**把关系建模为嵌入空间中的平移。若 $(h, r, t)$ 是有效三元组（头实体、关系、尾实体），则 $\mathbf{h} + \mathbf{r} \approx \mathbf{t}$。其评分函数为 $f(h, r, t) = -\|\mathbf{h} + \mathbf{r} - \mathbf{t}\|$。直观来说，关系向量把头实体“移动”到尾实体的位置。

- **RotatE**把关系建模为复数空间中的旋转：$\mathbf{t} = \mathbf{h} \circ \mathbf{r}$，其中 $\circ$ 表示逐元素复数乘法，且 $|\mathbf{r}_i| = 1$，即每个关系分量都是单位复数。RotatE 能表示 TransE 无法充分捕捉的对称、反对称、逆关系和组合模式。

- **ComplEx**使用复数嵌入和 Hermitian 内积，因此能够建模非对称关系，例如 A 是 B 的上司，但 B 不是 A 的上司。

- 基于 GNN 的链接预测先用消息传递计算节点嵌入，再用边两端节点的表示给候选边打分。这结合了 GNN 的结构信息和嵌入方法对关系的建模能力；GNN 编码器能捕捉只为每个节点学习单一嵌入的方法容易忽略的多跳邻域结构。

## 任务类型

- GNN 主要处理三类任务：

- **节点级任务**：预测每个节点的属性，例如识别社交网络中的机器人或真人、预测相互作用网络中蛋白质的功能，或根据少量已标记节点预测其余节点类别。模型将节点嵌入 $\mathbf{h}_i^{(L)}$ 输入分类器。

- **边级任务**：预测边的属性，或判断一条边是否存在。例如预测两位用户是否会成为朋友、补全知识图谱中的关系，或预测药物相互作用。模型通常使用边两端节点的嵌入计算 $\hat{y}_{ij} = f(\mathbf{h}_i, \mathbf{h}_j)$；$f$ 可以是点积、拼接后接 MLP，或其他组合函数。

- **图级任务**：预测整张图的属性，例如分子性质、图分类或生成具有指定性质的分子。模型先聚合得到图表示 $\mathbf{h}_G$，再进行分类或回归。

## 编程任务（使用 Colab 或笔记本）

1. 从头实现一层 GCN，使用归一化邻接矩阵处理一个小图，并观察节点特征如何变得平滑。

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

2. 实现 GIN 风格的求和聚合，并与 GCN 风格的平均聚合比较。原文代码声称两组邻居的均值相同、求和可以区分它们，但当前数值并不符合这一说法。

```python
import jax.numpy as jnp

# Two different neighbourhood multisets that have the same mean
# Node A: neighbours have features [1, 1, 1, 1]  (four neighbours, all 1)
# Node B: neighbours have features [2, 2]          (two neighbours, all 2)

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

**说明：**按原代码，A 的平均值为 1、B 的平均值为 2；两者的和都是 4。因此代码显示平均值能区分这两组，而求和不能。若要实现题目所述对比，可将 `neighbours_B` 改为两个 `[1.0]`：此时两组平均值都是 1，求和则分别为 4 和 2。

3. 展示过度平滑现象。反复应用归一化邻接矩阵，观察节点特征如何趋同。

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

**说明：**示例中的图是固定构造的，并非随机生成。对称归一化邻接矩阵反复作用后，节点表示会趋向低维结构，但未必逐项收敛为完全相同的数值。
