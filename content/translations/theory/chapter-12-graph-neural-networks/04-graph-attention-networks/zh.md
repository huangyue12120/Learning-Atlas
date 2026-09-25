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

*图注意力网络用模型根据数据学出的权重，取代对邻居的均匀聚合。本篇介绍 GAT、多头图注意力、GATv2、图 Transformer、位置与结构编码，以及模型的可扩展性。*

- 在 GCN（第 3 篇）中，每个节点按照图结构确定的固定权重（归一化邻接矩阵）聚合邻居特征。在简单情形下，一个节点有 3 个邻居时，每个邻居的权重大致为 $\approx 1/3$。但邻居的重要性并不相同：亲密合作者发来的消息可能比远方熟人的消息更有用。

- **图注意力网络**通过学习该关注哪些邻居来解决这个问题，使用的注意力机制与 Transformer 中的相同（第 7 章）。每个节点不再使用固定的结构权重，而是根据邻居特征动态计算注意力分数。

## GAT：图注意力网络

- **GAT**（Veličković 等，2018）计算节点与其邻居之间的注意力系数。对于节点 $i$ 及其邻居 $j$：

$$e_{ij} = \text{LeakyReLU}\left(\mathbf{a}^T \left[W\mathbf{h}_i \| W\mathbf{h}_j\right]\right)$$

- 其中，$W \in \mathbb{R}^{d' \times d}$ 是共享的线性变换，$\|$ 表示拼接，$\mathbf{a} \in \mathbb{R}^{2d'}$ 是可学习的注意力向量。分数 $e_{ij}$ 衡量节点 $j$ 的特征对节点 $i$ 有多重要。

- 对每个节点的邻居分组，对原始分数应用 softmax 进行归一化：

$$\alpha_{ij} = \text{softmax}_j(e_{ij}) = \frac{\exp(e_{ij})}{\sum_{k \in \mathcal{N}(i)} \exp(e_{ik})}$$

- 这样，每个节点邻域内的注意力权重之和为 1，与 Transformer 注意力的处理方式相同（第 7 章）。节点更新后的特征为：

$$\mathbf{h}_i' = \sigma\left(\sum_{j \in \mathcal{N}(i)} \alpha_{ij} W\mathbf{h}_j\right)$$

![GCN 为邻居分配由图结构确定的固定权重；GAT 则学习依赖数据的注意力权重](../images/gat_attention_weights.svg)

- GAT 与 GCN 的关键区别是：$\alpha_{ij}$ **由数据学习得到**，而非由图结构预先固定。节点可以提高信息量较大的邻居所占权重，并降低噪声或无关邻居的影响。

- GAT 只在图的边上计算注意力：节点 $i$ 只关注邻居集合 $\mathcal{N}(i)$，而不是与所有节点两两计算。这使计算量随边数增长，而不需要对所有节点对做 $O(n^2)$ 运算。

## 多头图注意力

- 与 Transformer（第 7 章）一样，**多头注意力**会并行运行 $K$ 个相互独立的注意力机制，每个机制都有自己的参数 $W^k$ 和 $\mathbf{a}^k$。中间层会拼接各头的结果，最终层通常取平均：

$$\mathbf{h}_i' = \Big\|_{k=1}^{K} \sigma\left(\sum_{j \in \mathcal{N}(i)} \alpha_{ij}^k W^k \mathbf{h}_j\right)$$

- 不同注意力头可以关注邻域的不同方面：一个头可能侧重结构特征，另一个可能侧重语义相似性。这与 Transformer 使用多头注意力的动机相同，即让不同头捕捉不同关系。

- 若有 $K$ 个注意力头，且每个头的输出维度为 $d'$，拼接后的维度为 $K \times d'$。为了得到固定大小的输出，最终层通常对各头取平均，而不是拼接。

## GATv2：改进静态注意力

- 原始 GAT 有一个不易察觉的限制：它的注意力是**静态的**，也称基于排序的注意力。分数由拼接向量 $[W\mathbf{h}_i \| W\mathbf{h}_j]$ 计算。由于注意力向量 $\mathbf{a}$ 作用于拼接结果，可以分解为两个部分：$\mathbf{a}^T [W\mathbf{h}_i \| W\mathbf{h}_j] = \mathbf{a}_1^T W\mathbf{h}_i + \mathbf{a}_2^T W\mathbf{h}_j$。

- 对给定节点 $i$ 来说，第一项 $\mathbf{a}_1^T W\mathbf{h}_i$ 对所有邻居都相同。LeakyReLU 是单调函数，因此邻居的排序实际上只取决于它们自身的特征 $\mathbf{h}_j$，不取决于查询节点的特征。于是，不同节点可能会以相同顺序排列共同邻居，这限制了模型的表达能力。

- **GATv2**（Brody 等，2022）把非线性移到注意力向量之前，以消除这一限制：

$$e_{ij} = \mathbf{a}^T \text{LeakyReLU}\left(W \left[\mathbf{h}_i \| \mathbf{h}_j\right]\right)$$

- LeakyReLU 现在作用于节点特征的联合变换，注意力分数不再能分解为两个独立项。因此，邻居排序会依赖具体的查询节点，注意力变为**动态注意力**。GATv2 的表达能力严格强于 GAT，计算成本则相同。

## 图 Transformer

- 标准消息传递 GNN 受图拓扑限制：每个节点只能直接关注邻居。经过 $k$ 层后，$k$ 跳邻居的信息要经过多次聚合才能传来，细节可能逐步损失。这个局部瓶颈，加上过度平滑（第 3 篇），会妨碍模型捕捉长距离依赖。

- **图 Transformer**对所有节点对执行**全局自注意力**，无论节点之间是否有边，都可以在一层内交换信息，类似标准 Transformer（第 7 章）。

- 基本做法是把节点视为词元，再应用 Transformer 自注意力：

$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$

- 其中，$Q = XW_Q$、$K = XW_K$、$V = XW_V$ 分别是节点特征 $X$ 的查询、键和值投影（与第 7 章相同）。这种做法相当于在完全图 $K_n$ 上运行 GNN（第 2 篇）。

- 问题在于，全局注意力本身没有保留原图的连接结构。可以用以下两种方法把图结构重新注入模型。

- **Graphormer**（Ying 等，2021）在注意力分数中加入偏置项，以编码图结构：

$$A_{ij} = \frac{(\mathbf{h}_i W_Q)(W_K^T \mathbf{h}_j^T)}{\sqrt{d_k}} + b_{\text{spatial}}(i, j) + b_{\text{edge}}(i, j)$$

- 空间偏置 $b_{\text{spatial}}$ 编码节点 $i$ 与 $j$ 的最短路径距离；边偏置 $b_{\text{edge}}$ 编码最短路径上的边特征。Graphormer 还使用**中心性编码**，把节点度加入输入嵌入，提示模型该节点在图中的结构角色。

- **GPS**（通用、强大且可扩展的图 Transformer；Rampášek 等，2022）在每层中结合局部消息传递与全局注意力：

$$\mathbf{h}_i' = \text{MLP}\left(\mathbf{h}_i^{\text{MPNN}} + \mathbf{h}_i^{\text{Attention}}\right)$$

- 每层分别用 GNN 建模局部结构、用 Transformer 建模全局上下文，再融合两者结果。这样既保留局部关系，也能捕捉长距离依赖。

## 位置编码与结构编码

- 序列 Transformer 使用位置编码注入顺序信息（第 7 章）；图没有唯一的节点排序，因此需要针对图结构设计编码。

- **拉普拉斯特征向量编码**把图拉普拉斯矩阵（第 2 篇）的特征向量作为位置特征。取前 $k$ 个非平凡特征向量，可以为图构造谱嵌入；图中相邻或结构相近的节点通常会有相近的特征向量分量值。再将这些编码与节点特征拼接。

- 拉普拉斯特征向量存在**符号不确定性**：若 $\mathbf{u}$ 是特征向量，$-\mathbf{u}$ 也是。因此模型应能处理特征向量符号翻转。可以在训练时随机翻转符号作数据增强，或学习对符号翻转不变的变换。若特征值重复，对应特征子空间的基也不唯一。

- **随机游走编码**记录从节点 $i$ 出发、经过 $k$ 步后回到 $i$ 的概率，其中 $k = 1, 2, \ldots, K$。这些概率反映局部结构：密集簇中的节点通常有较高的返回概率，稀疏区域中的节点通常较低。返回概率为 $p_{ii}^{(k)} = (A_{\text{rw}}^k)_{ii}$，其中 $A_{\text{rw}} = D^{-1}A$ 是随机游走转移矩阵。

- **度编码**把节点度作为一个特征。度是有用的结构信号：它能识别叶节点（度为 1）和高度节点。不过，仅凭度数通常无法识别桥接节点，因为不同结构角色的节点可能有相同的度。

- 这些编码补充了普通 Transformer 缺少的图结构信息，有助于图 Transformer 处理需要远距离推理的任务；具体效果取决于任务和模型。

## 可扩展性

- 大图可能包含数百万节点和数十亿条边。若把所有节点特征和图结构都用于一次训练，内存需求可能无法承受；稀疏存储邻接关系可以避免构造稠密的 $n \times n$ 矩阵，但并不能消除大规模训练的成本。

- GNN 的**小批量训练**比图像或序列更复杂，因为节点彼此相连。抽取一批目标节点后，还要找到它们的一跳邻居、二跳邻居，依此类推。这样会出现**邻域爆炸**：1000 个目标节点可能扩展成数百万个计算节点。

- **邻域采样**（第 3 篇 GraphSAGE 所用的方法）为每层的每个节点抽取固定数量的邻居，以限制计算量。两层各抽取 15 个邻居时，每个目标节点最多有 $15^2 = 225$ 条第二跳采样路径；若统计完整计算树，还要加上目标节点和第一跳节点。

- **Cluster-GCN**（Chiang 等，2019）先用 METIS 等图聚类算法把图划分为多个簇，再逐簇训练。簇内边较密，因此每次训练使用的子图能保留较多相关结构；训练时也可以纳入部分跨簇边。

- **图 Transformer 的可扩展性**更难处理，因为全局注意力的计算复杂度为 $O(n^2)$。对百万级节点的图而言，完整注意力不可行。常见方案包括：
    - 使用稀疏注意力，只关注图中的 $k$ 个近邻节点；
    - 使用线性注意力近似；
    - 将计算较便宜的局部消息传递（$O(|E|)$）与较小粗化图上的全局注意力结合。

## 时序图与动态图

- 前面讨论的图是**静态图**：节点、边和特征保持不变。许多现实图则会随时间变化：新用户加入社交网络，金融交易产生新边，交通流量随一天中的时段改变，分子相互作用也会波动。

- **时序图**为边附加时间戳：$(i, j, t)$ 表示节点 $i$ 在时间 $t$ 与节点 $j$ 发生交互。模型需要同时表示图结构与随时间变化的行为。

- 时序图主要有两种建模方式：

- **离散时间动态图**（DTDG）：将图表示为一系列快照 $G_1, G_2, \ldots, G_T$，每个快照对应一个时间步。GNN 处理每个快照，RNN 或时间注意力机制再建模快照间的变化。这种做法简单，但会丢失快照之间事件的细节，而且需要选择快照频率。

- **连续时间动态图**（CTDG）：把事件表示为带时间戳的交互流。每当事件 $(i, j, t)$ 发生，就在该时刻更新节点 $i$ 和 $j$ 的表示，从而保留事件的时间信息。

- **时序图网络**（TGN，Rossi 等，2020）是连续时间动态图的代表性架构。每个节点维护一个**记忆状态** $\mathbf{s}_i(t)$，在节点参与交互时更新：

$$\mathbf{s}_i(t^+) = \text{GRU}\left(\mathbf{s}_i(t^-), \; \mathbf{m}_i(t)\right)$$

- 其中，$\mathbf{m}_i(t)$ 是由这次交互计算出的消息，包含两个节点的特征、边特征和时间编码。GRU（第 6 章）会选择性地保留或遗忘历史信息，使记忆既能捕捉长期模式，也能适应近期事件。

- **时间编码**把距上次交互的时间间隔表示为特征向量，类似 Transformer 的位置编码（第 7 章）。一种常见方法是使用可学习的 Fourier 特征：

$$\Phi(t) = \left[\cos(\omega_1 t), \sin(\omega_1 t), \ldots, \cos(\omega_d t), \sin(\omega_d t)\right]$$

- 这样的表示能区分不同时间间隔，例如用户 5 分钟前和 3 个月前的活动。

- **时序图注意力**（TGAT）在节点的时序邻域上运行自注意力。该邻域由近期交互构成，注意力权重同时考虑特征相关性（类似 GAT）和时间远近；较久远的交互通常会得到较低权重。

- 时序图可用于欺诈检测（识别金融图中的异常交易）、交通预测（根据历史流量预测拥堵）、社交网络动态建模（预测内容传播）以及随时间变化的药物相互作用预测。

## 编程任务（使用 Colab 或笔记本）

1. 从头实现一个 GAT 注意力头。计算某个节点与其邻居之间的注意力权重，并验证权重之和为 1。

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

2. 比较 GCN 的固定权重和 GAT 的学习权重。观察 GAT 如何为不同邻居分配不同权重，而 GCN 如何按图结构统一加权。

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

3. 展示位置编码的作用。计算图拉普拉斯特征向量编码，并观察结构相近节点的编码。

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

**说明：**拉普拉斯特征向量的符号可整体翻转；特征值重复时，特征向量基也可能变化。因此，代码生成的具体坐标并非唯一，结构关系才是重点。
