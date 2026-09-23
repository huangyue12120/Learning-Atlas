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

*图注意力网络让节点根据邻居的重要性自适应分配权重。本篇介绍 GAT、 多头注意力、GATv2、图 Transformer、结构编码、可扩展性以及动态图。*



* 注意力网络用有学问、依赖数据的加权取代统一的相邻汇总。此文件涵盖 GAT,多头图注意度, GATv2, 图形变形器, 位置和结构编码, 以及可缩放性*

- 在GCN(文件3)中,每个节点使用由图表结构(正态的相接性)确定的固定加权来汇总其相邻的特征. 有三个邻国的节点使每个邻国大致相等地分量($\approx 1/3$) (中文(简体)). 但并非所有邻国都同样重要:一个亲密的合作者发出的信息应该不止是一个遥远的熟人发出的信息。

- ** Graph Region Networks**通过学习** 邻居要注意的** ,使用同样的能给变压器提供动力的注意力机制来解决这个问题(第七章)。而不是固定的,基于结构的权重,每个节点都会计算出动态的,基于内容的注意力的分数来超过它的邻居.

## GAT：图注意力网络



- ** GAT**(Veličković等,2018年)计算出每个节点与其相邻地区之间的注意系数. 对于节点$i$和邻居$j$:

$$e_{ij} = \text{LeakyReLU}\left(\mathbf{a}^T \left[W\mathbf{h}_i \| W\mathbf{h}_j\right]\right)$$

- 地点$W \in \mathbb{R}^{d' \times d}$是一个共享的线性转换,$\|$表示结合,和$\mathbf{a} \in \mathbb{R}^{2d'}$是一个可以学习的注意向量。分数$e_{ij}$节点的重要性$j$'其特性是去节点'$i$.

- 原始分数在所有邻居之间都通过软马克法实现正常化:

$$\alpha_{ij} = \text{softmax}_j(e_{ij}) = \frac{\exp(e_{ij})}{\sum_{k \in \mathcal{N}(i)} \exp(e_{ik})}$$

- 这保证了每个节点的相邻区域,就像变压器的注意力一样,注意的分量等于1(第七章)。节点的更新功能有: .

$$\mathbf{h}_i' = \sigma\left(\sum_{j \in \mathcal{N}(i)} \alpha_{ij} W\mathbf{h}_j\right)$$

![GCN为所有邻居指定固定的等分权; GAT 学习数据依赖的注意力权重](../images/gat_attention_weights.svg)

- 与GCN的关键区别:权重$\alpha_{ij}$** 从数据中汲取**,而不是由图表结构所固定。一个节点可以学习专注于信息最丰富的邻居,而忽略吵闹或无关紧要的邻居.

- 注意注意只计算出边缘(节点)$i$只接待邻居$\mathcal{N}(i)$),不是在所有节点对上. 这保持了与边数成正比的计算,而不是节点数的平方.

## 多头图注意力



- 与变压器一样(第七章),** 多头注意** 运行$K$独立关注机制,每个机制都有自己的参数$W^k$财务报告和已审计财务报表$\mathbf{a}^k$。。。其结果被收缩(中间层)或平均(最后层):

$$\mathbf{h}_i' = \Big\|_{k=1}^{K} \sigma\left(\sum_{j \in \mathcal{N}(i)} \alpha_{ij}^k W^k \mathbf{h}_j\right)$$

- 每个头可以关注邻里的不同方面:一个头可能注重结构特征,另一个则注重语义相似性. 这与变压器中的多头注意力的动机相同:不同的头捕捉出不同类型的关系.

- 与$K$标题和产出层面$d'$每个头, 缩合输出有尺寸$K \times d'$。。。最后一层一般是平均的,而不是平整地产生固定大小的产出。

## GATv2：修复静态注意力



- 最初的GAT有一个微妙的局限性:它的注意力功能是**static**(也叫以排名为主). 注意力的分数取决于凝聚$[W\mathbf{h}_i \| W\mathbf{h}_j]$,但因为注意向量$\mathbf{a}$被接合后应用,可分解为两个独立的组件:$\mathbf{a}^T [W\mathbf{h}_i \| W\mathbf{h}_j] = \mathbf{a}_1^T W\mathbf{h}_i + \mathbf{a}_2^T W\mathbf{h}_j$.

- 意思是某个节点的邻居排名$i$完全由邻居的特点决定$\mathbf{h}_j$(该术语$\mathbf{a}_1^T W\mathbf{h}_i$在所有邻国之间恒定$i$) (中文(简体)). 注意排名并不真正依赖于查询节点的特征. 节点$i$和节点$k$将同样的邻居排成相同的等级,这限制了表达性。

- ** GATv2**(Broody等人,2022年)通过在注意向量之前应用非线性来解决这个问题:

$$e_{ij} = \mathbf{a}^T \text{LeakyReLU}\left(W \left[\mathbf{h}_i \| \mathbf{h}_j\right]\right)$$

- 将LeakyReLU移入计算中意味着注意分数是联合特征的非线性函数,不能分解成独立的术语. 这引起了注意**动态**:现在邻国的排名取决于具体的查询节点. GATv2在严格意义上比GAT更能表达,没有额外的计算成本.

## 图 Transformer



- 标准通訊-通訊GNN受圖形地貌所限制:一个节点只能照顾到它的直邻. 之后$k$层,从$k$- 跳跃的邻居们通过多个聚合步骤混合在一起,失去忠诚. 这个本地瓶颈(与过度流出相加, 文件 3) 限制了捕捉远程依赖性的能力。

- ** Graph Transformers** 打破了这个瓶颈,将** 全球自觉** 应用到所有节点对上,不管它们是否共享一个边. 每个节点可以在一分层中关注其他每个节点,就像标准变压器(第七章)一样.

- 基本思想:将所有节点当作符号,应用变压器自意:

$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$

- 地点$Q = XW_Q$, $K = XW_K$, $V = XW_V$是节点特性的查询、密钥和值预测$X$(确切如第7章所言). 这是全连接图上的GNN(完整图)$K_n$,文件2) (中文(简体)).

- 问题:一个完全连接的图表忽略了实际的图表结构. 边缘信息(实际与谁连接)被丢失. 两种方法恢复了这一点:

- ** Graphormer**(Ying等人,2021年)在注意分数中,通过**bias值**向变压器注入了图结构:

$$A_{ij} = \frac{(\mathbf{h}_i W_Q)(W_K^T \mathbf{h}_j^T)}{\sqrt{d_k}} + b_{\text{spatial}}(i, j) + b_{\text{edge}}(i, j)$$

- 空间偏差$b_{\text{spatial}}$编码节点之间的最短路径距离$i$财务报告和已审计财务报表$j$。。。边缘偏差$b_{\text{edge}}$编码沿最短路径的边缘特征。此外,Graphormer使用**中枢编码**,在输入嵌入中添加了节点的程度,给出了每个节点的结构作用的模型信息.

- ** GPS**(通用、强力、可缩放的图变形器、Rampášek等,2022年)将传递的地方信息与全球关注结合起来,每一层:

$$\mathbf{h}_i' = \text{MLP}\left(\mathbf{h}_i^{\text{MPNN}} + \mathbf{h}_i^{\text{Attention}}\right)$$

- 每层都同时应用一个标准的GNN(用于局部结构)和一个变压器(用于全球背景),然后结合结果. 这得到了两个世界中最好的:来自消息传递的本地结构,以及来自关注的远程依赖.

## 位置编码与结构编码



- 序列上的变形器使用位置编码(第七章)来注入顺序信息. 图表没有条形顺序,所以需要图上特有的编码.

- ** 拉普拉西安 eigenvector 编码** 使用图 Laplacian (文件 2)的eigenvectors作为位置特征. 该$k$最小的非三相异构能提供图的光谱嵌入:图中"相近"的节点具有相近异构值. 这些被调和到节点特征上.

- 一个微妙之处:拉普拉西安的egenvectors有一个标志模糊(如果$\mathbf{u}$是个先锋,也是$-\mathbf{u}$) (中文(简体)). 模型必须对这些标志翻转不灵活。解决方案包括使用随机的符号翻转作为培训期间的数据增强,或者学习符号-变量转换.

- ** Random 行走编码** 计算从节点开始随机行走的概率$i$返回节点$i$之后$k$步骤,用于$k = 1, 2, \ldots, K$。。。这些概率编码了本地结构信息:密集集群中的节点有很高的回报概率,而稀有区域的节点则有较低的概率. 着陆概率$p_{ii}^{(k)} = (A_{\text{rw}}^k)_{ii}$地点$A_{\text{rw}} = D^{-1}A$是随机行走过渡矩阵。

- **Degree编码** 简单地添加节点度作为特性. 这令人惊讶的是有效的,因为度是一个强大的结构信号:叶节点(一级),桥节点,和枢纽节点的行为不同.

- 这些编码提供了香草变压器所缺乏的结构信息,使Graph变压器在需要远程推理的任务上能够超越标准消息传递GNN.

## 可扩展性



- GNNs的基本可伸缩性挑战在于:图可以有上百万个节点和数十亿个边缘. 在全图上培训一个GNN需要将所有节点特征和整个相邻矩阵存储在内存中,这往往不可行.

- **GNNs的Mini-batch训练**比图像或序列复杂,因为节点是相通的. 自然地对一批节点进行取样,需要邻居(一级),邻居(二级)等. 这起**邻接爆炸** 是指在计算图中,有一批1000个目标节点可能需要上百万个节点.

- ** 邻居取样**(GraphSAGE-style,文件3)通过每层节点取样固定的邻居数目来限制爆炸。每个目标节点的子图最多只有两层和每层15个样本$15^2 = 225$节点,无论图形大小。

- ** Cluster-GCN**(Chiang等,2019年)使用图表集成算法(如METIS)将图分出为集群,再一次在一个集群上进行列车. 集群内边缘为密集(大多数相邻者同为集群),因此子图捕捉到相关的结构. 跨集群边缘偶尔会由包含集群之间的边缘处理.

- ** 变形器可伸缩性** 由于全球关注程度$O(n^2)$。。。对于拥有上百万个节点的图表,充分关注是不可行的. 解决办法包括:
    - 分解注意模式(只到$k$-图中最靠近的节点).
    - 线性注意近似
    - 合并本地消息传递(便宜,$O(|E|)$)全球关注于收缩的图表(发条节点)

## 时间图与动态图



- 我们迄今研究的图是**static**:节点,边缘和特征是固定的. 但许多现实世界的图**随时间推移**:新用户加入社交网络,金融交易创造边缘,流量模式一时变化,分子相互作用起伏.

- ** 时态图** 用时间戳来增加每个边:$(i, j, t)$表示节点$i$与节点交互$j$时间$t$。。。挑战在于学习既能反映图表结构又能反映时间动态的表述.

- 有两个范例:

- ** 不同时段动态图(DTDG)**:该图作为快照的序列来表示.$G_1, G_2, \ldots, G_T$,每个时间步一个。一个GNN处理每个快照,一个RNN或时间关注机制能够捕捉到跨越快照的卷积. 这很简单,但损失了精细的计时信息(快照之间的事件丢失),需要选择快取频率.

- ** 连续-时间动态图(CTDG)**:事件模拟为一流的时序互动. 每个活动$(i, j, t)$更新节点的表达式$i$财务报告和已审计财务报表$j$确切时间。这保存了所有的时间信息。

- ** 临时图网(TGN)** (Rossi等,2020年)是领先的CTDG架构. 每个节点都保持了**模态**$\mathbf{s}_i(t)$当节点参与交互时,该节点会更新:

$$\mathbf{s}_i(t^+) = \text{GRU}\left(\mathbf{s}_i(t^-), \; \mathbf{m}_i(t)\right)$$

- 地点$\mathbf{m}_i(t)$是一个从交互中计算出来的信息(将节点、边缘特征和时间编码的特性合并)。GRU(第6章)有选择地保留并忘记了过去的信息,使得记忆能够捕捉出长期规律,同时适应最近的事件.

- ** 时间编码** 代表自上次相互作用以来作为特性向量的所经过的时间,类似于变压器中的位置编码(第七章)。共同的方法使用可学习的傅里叶特征:

$$\Phi(t) = \left[\cos(\omega_1 t), \sin(\omega_1 t), \ldots, \cos(\omega_d t), \sin(\omega_d t)\right]$$

- 这使得模型对时间间隙有丰富的表现:"这个用户在5分钟前最后一次活动"对"3个月前"的嵌入不同.

- ** 时间图注意** 对节点的时间相邻处适用自我注意:最近的一系列相互作用,每个作用均按特征相关性(如GAT)和时间回放度加以加权。来自遥远过去的互动自然被压低。

- 应用包括:欺诈侦测(金融图中异常的交易模式),流量预测(从历史流量模式中预测拥堵),社交网络动态(预测病毒内容传播),以及药物相互作用预测随时间推移而变化.

## 编程任务（使用 Colab 或 notebook）



1. 从零开始执行一个单一的GAT关注头. 计算出节点和相邻点之间的注意力分量,并验证其相和为一.
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

2. 比较GCN(固定权重)与GAT(吸取权重)汇总. 显示GAT可以给邻居分配不同的权重,而GCN则统一对待.
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

3. 展示位置编码的好处. 计算出一个图的Laplacian eigenvector编码,并显示结构相近的节点得到类似的编码.
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
