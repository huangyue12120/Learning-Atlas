---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 12 - graph neural networks/04. graph attention networks.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 18b81fd15942015105c7646b23baa86e59d9cc2e4d3b6323fcb1066d49100ed1
status: reviewed
---
# 图注意力网络

*图注意力网络通过学习数据依赖的权重来替换均匀邻居聚合。本文件涵盖了GAT、多头图注意力、GATv2、图变换器、位置和结构编码，以及可扩展性*

- 在GCN（文件3）中，每个节点通过固定权重（由图结构决定的）聚合其邻居的特征。一个有三个邻居的节点会给予每个邻居大致相等的权重（$\approx 1/3$）。但并非所有邻居都同等重要：来自亲密合作者的消息应该比来自遥远 acquaintance的消息更重要。

- **图注意力网络**通过学习哪些邻居要关注来解决这个问题，使用与变换器相同的注意力机制（第7章）。而不是固定、结构依赖的权重，每个节点计算动态、内容依赖的注意力分数过其邻居。

## GAT: 图注意力网络

- **GAT**（Veličković等人，2018年）计算每个节点与邻接节点之间的注意力系数。对于节点$i$和邻居$j$：

$$e_{ij} = \text{LeakyReLU}\left(\mathbf{a}^T \left[W\mathbf{h}_i \| W\mathbf{h}_j\right]\right)$$
- 其中$W \in \mathbb{R}^{d' \times d}$是共享线性变换，$\|$表示连接，而$\mathbf{a} \in \mathbb{R}^{2d'}$是一个可学习的注意力向量。分数$e_{ij}$衡量节点$j$的特征对节点$i$的重要性。

- 原始分数在所有邻居之间进行归一化，使用 softmax:

$$\alpha_{ij} = \text{softmax}_j(e_{ij}) = \frac{\exp(e_{ij})}{\sum_{k \in \mathcal{N}(i)} \exp(e_{ik})}$$
- 这确保注意力权重在每个节点的邻域内总和为 1，就像 transformer 注意力（第 7 章）。节点更新后的特征是：

$$\mathbf{h}_i' = \sigma\left(\sum_{j \in \mathcal{N}(i)} \alpha_{ij} W\mathbf{h}_j\right)$$
![GCN给所有邻居分配固定相等的权重；GAT学习数据依赖的注意力权重。](../images/gat_attention_weights.svg)


- GCN 的关键区别在于，权重 $\alpha_{ij}$ 是 **从数据中学习的**，而不是由图结构固定。一个节点可以学习关注最有信息的邻居，同时忽略噪声或无关的邻居。

- 注意到注意力仅计算在边（节点 $i$ 只关注其邻居 $\mathcal{N}(i)$），而不是所有节点对。这保持了计算与边的数量成正比，而不是节点数量的平方。

## 多头图注意力

- 与 transformer（第 7 章）一样，**多头注意力**在并行运行 $K$ 个独立的注意力机制时运行，每个都有自己的参数 $W^k$ 和 $\mathbf{a}^k$。结果是串联（在中间层）或平均（在最终层）：

$$\mathbf{h}_i' = \Big\|_{k=1}^{K} \sigma\left(\sum_{j \in \mathcal{N}(i)} \alpha_{ij}^k W^k \mathbf{h}_j\right)$$
- 每个头可以关注不同方面的邻域：一个头可能专注于结构特征，另一个则专注于语义相似性。这与 transformer 中的多头注意力相同：不同的头捕获不同类型的关系。

- 有 $K$ 头和每个头输出维度 $d'$，串联后的输出维度为 $K \times d'$。最终层通常使用平均而不是串联来产生固定大小的输出。

## GATv2: 解决静态注意力问题

- 原始的GAT有一个微妙的限制：它的注意力函数是**静态**（也称为排名基）。注意力分数取决于连接后的拼接 $[W\mathbf{h}_i \| W\mathbf{h}_j]$，但因为注意力向量 $\mathbf{a}$ 在拼接后应用，它可以分解为两个独立的组件： $\mathbf{a}^T [W\mathbf{h}_i \| W\mathbf{h}_j] = \mathbf{a}_1^T W\mathbf{h}_i + \mathbf{a}_2^T W\mathbf{h}_j$。

- 这意味着给定节点 $i$ 的邻居排名完全由邻居特征 $\mathbf{h}_j$ 决定（术语 $\mathbf{a}_1^T W\mathbf{h}_i$ 对所有邻居 $i$ 是恒定的）。注意力排序并不真正依赖于查询节点的特征。节点 $i$ 和节点 $k$ 将对相同的邻居集合进行相同排名，这限制了表达能力。

- **GATv2**（Brody et al., 2022）通过在注意力向量之前应用非线性来解决这个问题：

$$e_{ij} = \mathbf{a}^T \text{LeakyReLU}\left(W \left[\mathbf{h}_i \| \mathbf{h}_j\right]\right)$$
- 将 LeakyReLU 移动到计算中意味着注意力分数是一个非线性函数的联合特征，而不是可分解为独立项。这使得注意力**动态**：邻居排名现在依赖于特定的查询节点。GATv2在没有额外计算成本的情况下比原始 GAT 更具有表达能力。

## 图变换器

- 标准的消息传递 GNN 由图拓扑限制：一个节点只能关注其直接邻居。经过 $k$ 层后，通过多个聚合步骤混合的信息来自 $k$ 跳邻的邻居，导致 fidelity 减少。这个局部瓶颈（结合过拟合，文件 3）限制了捕捉长距离依赖的能力。

- **图变换器**通过在所有节点对之间应用**全局自注意力**来打破这一瓶颈：无论它们是否共享边，每个节点都可以在单层中关注其他所有节点，就像标准变换器（第 7 章）。

- 基本思想：将所有节点视为令牌，并在其中应用 transformer 自注意力：

$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$
- 其中 $Q = XW_Q$、$K = XW_K$ 和 $V = XW_V$ 是节点特征 $X$ 的查询、键和值投影（与第 7 章完全相同）。这是一个在完全连接图（完全图 $K_n$，文件 2）上的 GNN。

- 问题：完全连接的图忽略了实际的图结构。边信息（谁真正与谁相连）丢失了。两种方法恢复这一点：

- **Graphormer**（Ying et al., 2021）通过在注意力分数中注入图结构来修复这一问题：

$$A_{ij} = \frac{(\mathbf{h}_i W_Q)(W_K^T \mathbf{h}_j^T)}{\sqrt{d_k}} + b_{\text{spatial}}(i, j) + b_{\text{edge}}(i, j)$$
- 空间偏差 $b_{\text{spatial}}$ 表示节点 $i$ 和 $j$ 之间的最短路径距离。边偏差 $b_{\text{edge}}$ 表示沿最短路径的边特征。此外，Graphormer 使用 **中心性编码**，将节点的度数添加到其输入嵌入中，为模型提供每个节点结构角色的信息。

- **GPS**（通用、强大且可扩展的图变换器，Rampášek et al., 2022）在每一层中结合了局部消息传递和全局注意力：

$$\mathbf{h}_i' = \text{MLP}\left(\mathbf{h}_i^{\text{MPNN}} + \mathbf{h}_i^{\text{Attention}}\right)$$
- 每一层都应用标准的GNN（用于局部结构）和Transformer（用于全局上下文），然后将结果结合起来。这样就得到了最好的效果：局部结构来自消息传递，而长距离依赖则来自注意力。

## 位置编码和结构编码

- 序子编码器在处理序列时使用位置编码（第7章），以注入顺序信息。图没有标准的排序方式，因此需要特定于图的编码。

- **拉普拉斯特征向量编码**使用图拉普拉斯矩阵的特征向量（文件2）作为位置特征。 $k$最小非平凡特征向量提供了一个图的谱嵌入：在图中“相邻”的节点具有相似的特征向量值。这些特征向量被连接到节点特征上。

- 一个小细节：拉普拉斯特征向量具有符号不明确性（如果 $\mathbf{u}$ 是一个特征向量，那么 $-\mathbf{u}$ 也是）。模型必须对这些符号翻转保持不变。解决方案包括在训练期间使用随机符号翻转作为数据增强，或者学习符号不变的变换。

- **随机游走编码**计算从节点 $i$ 开始进行随机游走并返回到节点 $i$ 后 $k$ 步的概率，对于 $k = 1, 2, \ldots, K$。这些概率编码了局部结构信息：密集簇中的节点具有高返回概率，而稀疏区域中的节点具有低概率。着陆概率 $p_{ii}^{(k)} = (A_{\text{rw}}^k)_{ii}$，其中 $A_{\text{rw}} = D^{-1}A$ 是随机游走过渡矩阵。

- **度编码**简单地将节点度作为特征添加。这非常有效，因为度是一个强大的结构信号：叶子节点（度为 1）、桥节点和中心节点的行为不同。

- 这些编码提供了图变换器缺乏的结构性信息，使图变换器在需要长距离推理的任务中优于标准消息传递 GNNs。

## 可扩展性

- 图神经网络（GNN）的最基本可扩展性挑战是图可以有数百万个节点和数十亿条边。训练一个 GNN 在整个图上进行需要存储所有节点特征和整个邻接矩阵，这通常不可行。

- **Mini-batch training** for GNNs is more complex than for images or sequences because nodes are interconnected. Naively sampling a batch of nodes requires their neighbours (layer 1), their neighbours' neighbours (layer 2), and so on. This **neighbourhood explosion** means a batch of 1000 target nodes might require millions of nodes in the computation graph.

- **Neighbourhood sampling** (GraphSAGE-style, file 3) limits the explosion by sampling a fixed number of neighbours per node per layer. With 2 layers and 15 samples per layer, each target node's subgraph has at most $15^2 = 225$ nodes, regardless of the full graph size.

- **Cluster-GCN**（Chiang et al., 2019）通过图聚类算法（例如METIS）将图分割成簇，然后逐个训练。在每个簇内，边是密集的（大多数邻居都在同一个簇中），因此子图捕捉了相关结构。跨簇边偶尔包括在内。

- **图变换的可扩展性** 因为全局注意力是$O(n^2)$。对于节点数达百万的图，全注意力不可行。解决方案包括：
    - 稀疏注意力模式（只在图中最近的$k$个节点上进行关注）
    - 线性注意力近似
    - 结合局部消息传递（便宜，$O(|E|)$）与在细化后的图上进行全局注意力（节点数较少）

## 时间和动态图

- 我们之前研究的图是**静态的**：节点、边和特征都是固定的。但现实中的许多图**随着时间变化**：社交媒体中新用户加入，金融交易创建边，交通模式在一天内发生变化，分子相互作用波动。

- 一个 **时间图** 每条边都附带了一个时间戳：$(i, j, t)$ 表示节点 $i$ 在时间 $t$ 与节点 $j$ 进行了交互。挑战在于学习能够同时捕捉图结构和时间动态的表示。

- 有两种范式：

- **离散时间动态图（DTDG）**：该图表示为一系列快照 $G_1, G_2, \ldots, G_T$，每快照对应一个时间步。 GNN 处理每个快照，RNN 或时空注意力机制捕捉快照之间的演变。这简单但丢失了细粒度的时间信息（事件在快照之间丢失），需要选择一个快照频率。

- **连续时间动态图（CTDG）**：事件被建模为一个按时间戳交互的流。每个事件 $(i, j, t)$ 在它发生时更新节点 $i$ 和 $j$ 的表示。这保留了所有时间信息。

- **时序图网络（TGN）**（Rossi等人，2020年）是CTDG架构的领先者。每个节点都维护一个**记忆状态**$\mathbf{s}_i(t)$，每当该节点参与互动时都会更新。

$$\mathbf{s}_i(t^+) = \text{GRU}\left(\mathbf{s}_i(t^-), \; \mathbf{m}_i(t)\right)$$
- $\mathbf{m}_i(t)$ 是由节点特征、边特征和时间编码组合而成的消息。GRU（第6章）选择性地保留和遗忘过去的信息，从而能够捕捉长期模式并适应近期事件。

- **时间编码**表示自上次交互以来的 elapsed时间作为特征向量，类似于transformers中的位置编码（第7章）。一种常见的方法使用可学习的Fourier特征：

$$\Phi(t) = \left[\cos(\omega_1 t), \sin(\omega_1 t), \ldots, \cos(\omega_d t), \sin(\omega_d t)\right]$$
- 这样可以为模型提供丰富的时差表示：“这个用户最近一次活跃是5分钟前”与“3个月前”被嵌入得不同。

- **时间图注意力（TGAT）**在节点的临时邻域上应用自注意力：该集合为最近的交互，每个交互由特征相关性（如GAT）和时序相关性加权。来自遥远过去的互动自然被降权。

- 应用包括欺诈检测（在金融图中异常交易模式），交通预测（从历史流量模式预测拥堵），社会网络动态（预测病毒内容传播）和药物相互作用时间预测。

## 编程任务（使用 CoLab 或 笔记本）

1. 实现一个从头开始的单个 GAT 注意力头。计算节点与其邻居之间的注意力权重，并验证它们之和为 1。
```python
import jax
import jax.numpy as jnp

rng = jax.random.PRNGKey(0)
k1, k2, k3 = jax.random.split(rng, 3)

n_nodes, d_in, d_out = 5, 4, 3

# Random node features
H = jax.random.normal(k1, (n_nodes, d_in))

# Learnable parameters
W = jax.random.normal(k2, (d_in, d_out)) * 0.5
a = jax.random.normal(k3, (2 * d_out,)) * 0.5

# Adjacency (node 0 connects to 1, 2, 3)
neighbours_of_0 = [1, 2, 3]

# Transform features
Wh = H @ W  # (n_nodes, d_out)

# Compute attention scores for node 0
h_i = Wh[0]
scores = []
for j in neighbours_of_0:
    h_j = Wh[j]
    e_ij = jnp.dot(a, jnp.concatenate([h_i, h_j]))
    e_ij = jax.nn.leaky_relu(e_ij, negative_slope=0.2)
    scores.append(float(e_ij))

scores = jnp.array(scores)
alpha = jax.nn.softmax(scores)

print(f"Raw scores: {scores}")
print(f"Attention weights: {alpha}")
print(f"Sum of weights: {alpha.sum():.4f}")

# Weighted aggregation
h_new = sum(alpha[k] * Wh[neighbours_of_0[k]] for k in range(len(neighbours_of_0)))
print(f"Updated node 0 features: {h_new}")
```

2. 比较 GCN（固定权重）与 GAT（学习权重）聚合。显示 GAT 可以给不同邻居分配不同的权重，而 GCN 统一处理它们。
```python
import jax
import jax.numpy as jnp

# 4 nodes: node 0 connects to 1, 2, 3
A = jnp.array([[0,1,1,1],
               [1,0,0,0],
               [1,0,0,0],
               [1,0,0,0]], dtype=float)

# Features: node 1 is very relevant, node 2 is noise, node 3 is moderate
H = jnp.array([[0.0, 0.0],   # node 0
               [1.0, 0.0],   # node 1 (signal)
               [0.0, 0.0],   # node 2 (noise)
               [0.5, 0.0]])  # node 3 (moderate)

# GCN: normalised adjacency weights
A_hat = A + jnp.eye(4)
D_inv = jnp.diag(1.0 / A_hat.sum(axis=1))
gcn_weights = (D_inv @ A_hat)[0]  # weights for node 0
print(f"GCN weights for node 0: {gcn_weights}")
print("  → All neighbours get roughly equal weight")

# GAT: learned attention (simulated)
# Suppose the attention mechanism learns to focus on node 1
gat_weights = jnp.array([0.1, 0.7, 0.05, 0.15])  # learned
print(f"\nGAT weights for node 0: {gat_weights}")
print("  → Node 1 (informative) gets most attention")

gcn_output = gcn_weights @ H
gat_output = gat_weights @ H
print(f"\nGCN output: {gcn_output}  (diluted by noise)")
print(f"GAT output: {gat_output}  (focused on signal)")
```

3. 展示位置编码的好处。计算图的拉普拉斯特征向量编码，并显示结构相似的节点得到相似的编码。
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt

# Barbell graph: two cliques connected by a bridge
n = 10
A = jnp.zeros((n, n))
# Clique 1: nodes 0-4
for i in range(5):
    for j in range(i+1, 5):
        A = A.at[i,j].set(1).at[j,i].set(1)
# Clique 2: nodes 5-9
for i in range(5, 10):
    for j in range(i+1, 10):
        A = A.at[i,j].set(1).at[j,i].set(1)
# Bridge
A = A.at[4,5].set(1).at[5,4].set(1)

D = jnp.diag(A.sum(axis=1))
L = D - A
eigenvalues, eigenvectors = jnp.linalg.eigh(L)

# Use first 3 non-trivial eigenvectors as positional encoding
pe = eigenvectors[:, 1:4]

print("Laplacian Positional Encodings:")
for i in range(n):
    group = "Clique 1" if i < 5 else "Clique 2"
    bridge = " (bridge)" if i in [4, 5] else ""
    print(f"  Node {i} ({group}{bridge}): {pe[i]}")

plt.scatter(pe[:5, 0], pe[:5, 1], c="#3498db", s=80, label="Clique 1")
plt.scatter(pe[5:, 0], pe[5:, 1], c="#e74c3c", s=80, label="Clique 2")
plt.scatter(pe[[4,5], 0], pe[[4,5], 1], c="black", s=120, marker="*",
            label="Bridge nodes", zorder=5)
plt.legend(); plt.grid(True)
plt.title("Laplacian Eigenvector Positional Encodings")
plt.xlabel("Eigenvector 1"); plt.ylabel("Eigenvector 2")
plt.show()
```
