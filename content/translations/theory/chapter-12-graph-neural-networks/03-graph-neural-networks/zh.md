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

*图神经网络（GNN）通过消息传递在相邻节点之间共享信息。本篇介绍消息传递框架、GCN、GraphSAGE、GIN、过平滑、图池化、异构图、链接预测和常见任务。*



*Graph神经网络通过在相接的节点之间传递消息来从图结构数据中学习. 该文件涵盖信息传递框架、GCN、GraphSAGE、GIN、过度流畅、图集和节点/网格/图级任务;以及推动分子属性预测、社交网络分析和推荐系统的核心架构。*

- 在之前的文档中,我们建立了数学基础:几何深层学习(file 1)告诉我们要利用对称性,而图理论(file 2)给了我们节点,边缘和相接性的语言. 现在我们建立神经网络,直接在图表上运行。

- 核心挑战:图表数据不正规**。与图像(固定网格)或序列(固定顺序)不同的是,图有可变的节点数,可变的连通性,而无克尼克节点命令. 一个用于图的神经网络在进行通配-等分时必须处理所有这一切(重新标记的节点不应改变输出).

## 消息传递框架



- 几乎所有的GNN都遵循同样的食谱,称为"消息传来**"(也叫邻里聚合). 这个想法简单而优雅:每个节点通过从邻国收集信息来更新其代表.

- 每层$l$,每个节点$i$做三件事:

    1. ** 信息**:每个邻居$j$节点$i$计算信件$\mathbf{m}_{j \to i}$基于其目前的特点。
    2. ** 外接门**:节点$i$收集所有来电信息,并将其与通量-变量函数(和、平或最大)相融合。
    3. ** 最新**:节点$i$将汇总信息与自身特征结合起来,形成新的表述.

- 形式上:

$$\mathbf{m}_i^{(l)} = \bigoplus_{j \in \mathcal{N}(i)} \phi^{(l)}\left(\mathbf{h}_i^{(l)}, \mathbf{h}_j^{(l)}, \mathbf{e}_{ij}\right)$$

$$\mathbf{h}_i^{(l+1)} = \psi^{(l)}\left(\mathbf{h}_i^{(l)}, \mathbf{m}_i^{(l)}\right)$$

- 地点$\mathcal{N}(i)$是节点的邻接者$i$, $\bigoplus$是一种永久性-变量聚合(和、正、最大),$\phi$是消息函数,$\psi$是更新函数,并且$\mathbf{e}_{ij}$是可选的边缘特性。

![消息传递: 邻居发送信件, 常态- 不定函数聚合它们, 节点更新其特性](../images/message_passing_gnn.svg)

- 汇总$\bigoplus$必须具有永久性-变异性(无论邻居的处理顺序如何),以确保整体功能具有永久性-等同性。这直接执行文件 1 的对称原则。

- 之后$k$每个节点的表达方式编码来自其**$k$- 跳出邻里**:所有节点可在内部达到$k$边缘 第1层见到近邻,第2层看见相邻等. 地方信息就是以此传播全球知识。

- 全球网络的可接受性领域随着深度而增长,就像CNN的可接受性领域随着层层而增长(第8章)一样. 但与正格上的CNN不同,可接受场形状因地貌而异,每个节点的可接受场形状因地而异.

## 图卷积网络（GCN）



- **GCN** (Kipf & Welling, 2017)是基础GNN建筑. 它将光谱图的卷积(从文件2)简化为优雅而高效的公式.

- 从光谱卷积开始$g_\theta \star \mathbf{x} = U \, \text{diag}(\hat{g}_\theta) \, U^T \mathbf{x}$, Kipf和 Welling 将光谱滤波器与一阶切比舍夫多诺米亚尔相近,这避免了完全计算出等分分解. 简化后,分层更新变为:

$$H^{(l+1)} = \sigma\left(\hat{A} H^{(l)} W^{(l)}\right)$$

- 在下列地点:
    - $H^{(l)} \in \mathbb{R}^{n \times d}$是分层节点特性的矩阵$l$
    - $W^{(l)} \in \mathbb{R}^{d \times d'}$是可学习的重量矩阵
    - $\hat{A} = \tilde{D}^{-1/2} \tilde{A} \tilde{D}^{-1/2}$是具有自带光圈的对称常态相邻矩阵
    - $\tilde{A} = A + I$添加自带(所以每个节点也收到自己的消息)
    - $\tilde{D}$是度矩阵$\tilde{A}$
    - $\sigma$非线性活化(ReLU,如第6章)

- 矩阵乘法$\hat{A} H^{(l)}$是聚合步骤:对于每个节点,它计算其邻国特征的加权平均值(加上其本身的,通过自跳)。加权矩阵$W^{(l)}$是所有节点共享的可学习的转变。活化增加了非线性.

- 这非常简单:它只是矩阵乘法,然后是学习到的线性地图和活化。整个GCN层可以被写入一行代码. 正常化:$\tilde{D}^{-1/2}$防止许多相邻的节点占据主导地位:高等节点会缩小其消息.

- 在通訊框架中,GCN使用:
    - 消息(T) :$\phi(\mathbf{h}_j) = \mathbf{h}_j$(只是发送您的特性)
    - 合计:正常总和(按学位加权)
    - 更新:线性转换+活化

## 图表



- GCN是**可转换的**:在训练时需要完整的图表,无法处理新的,看不见的节点. 如果有新用户加入一个社交网络,则GCN必须对整个图表进行再培训. ** GraphSAGE**(Hamilton等人,2017年)用**诱导**方法来解决这个问题。

- 关键的想法是**邻居抽样**:不要使用所有邻居,而要抽样一个固定大小的子集. 这使得计算独立于完整的图表结构,并允许通缩到看不见的节点和图表.

- 节点的图形SAGE更新$i$:

$$\mathbf{h}_i^{(l+1)} = \sigma\left(W^{(l)} \cdot \text{CONCAT}\left(\mathbf{h}_i^{(l)}, \text{AGG}\left(\{\mathbf{h}_j^{(l)} : j \in \mathcal{S}(i)\}\right)\right)\right)$$

- 地点$\mathcal{S}(i)$是一个**抽样**的邻居子集(例如,随机抽样500个邻居中的10个)。CONCAT操作明确将节点本身的特征与聚合相邻的特征区分开来,让网络为"自己"和"邻居"学习不同的转变.

- GraphSAGE 支持多个聚合函数:
    - ** 内容**:$\text{AGG} = \frac{1}{|\mathcal{S}|} \sum_{j \in \mathcal{S}} \mathbf{h}_j$(简单,有效)
    - ** LSTM**:通过LSTM向被抽样的邻居提供食物(但这引入了命令依赖,有些违反常态变化)
    - ** Pool**:$\text{AGG} = \max(\{\sigma(W_{\text{pool}} \mathbf{h}_j + \mathbf{b})\})$(非线性变换然后最大)

- 采样策略使得"图SAGE"可以被放大到非常大的图表. 训练使用小型节点:每个目标节点的样本$k_1$邻居在第一层,然后$k_2$第2层的邻居 与$k_1 = k_2 = 10$和两层,每个节点的计算树最多$10 \times 10 = 100$节点,不论图大小.

## 图同构网络（GIN）



- 不同的GNN架构有不同的**表达力**:它们区分结构上不同的图表的能力. GCN和GraphSAGE虽然在实践中是有效的,但在它们能够区分哪些图表结构方面却非常有限。

- 测量GNN表达性的理论工具是**Weisfeiler-Lehman (WL)测试**,一种用于测试图异态性的古典算法(两个图是否结构上完全相同). WL测试通过将每个节点的标签与相邻的标签多集一起用散去来反复地完善节点标签.

- **GIN**(徐等,2019年)被设计为与WL测试一样有表达力,使其成为最强大的通电GNN(在通电的理论范围内). 关键洞察力:聚合函数必须是多集的**注入**(相邻特性的不同多集必须产生不同的集合值).

- 集合在多集(summe) 上注入$\{1, 1, 2\}$给予 4, 而$\{1, 3\}$给出4,但相对于具有足够尺寸的特性向量,不同多集的总和一般是不同的。平均值和最大值不是注射式的:表示不能区分$\{1, 1\}$从$\{2, 2\}$最大值无法区分$\{1, 2, 3\}$从$\{1, 1, 3\}$.

- GIN更新为:

$$\mathbf{h}_i^{(l+1)} = \text{MLP}^{(l)}\left((1 + \epsilon^{(l)}) \cdot \mathbf{h}_i^{(l)} + \sum_{j \in \mathcal{N}(i)} \mathbf{h}_j^{(l)}\right)$$

- 地点$\epsilon$是一种可学习的平面图(或固定为0),MLP提供非线性,注射式的映射. 总和集合保留了多集结构,而MLP可以学习区分任意两个不同的总和值.

## 过平滑



- 在GNNs中,一个主要的挑战是**过平滑**:随着层数的增加,所有节点表示都趋同到同值,失去了区分不同节点的能力.

![过平滑:第1层有明显的节点特征,在更深层逐渐融合为统一特征](../images/over_smoothing_gnn.svg)

- 机能自在. 每个传递消息的层 平均一个节点的特征 与它的邻居。经过多轮平均,每个节点都已经看到(并和)其连接组件中的所有其他节点相融合. 特征成为了统一的平均值,图中等同的模糊了一幅图像的多倍,直到它变成一副坚实的颜色.

- 正式、反复适用常态化的附庸$\hat{A}$与一级矩阵相汇合(每行都与图上随机行走的固定分布成正比). 这与权力迭接对主导支配者的趋同(第二章)。

- 过沉将GNN限制为浅深(典型的为2-4层),不同于从数十或数百层中受益的CNN和变压器. 这意味着每个节点只能看到一个有限的相邻区域,这对需要远程信息的任务来说是个问题.

- 缓解措施包括:
    - ** 应急连接**(来自ResNets, 第8章):$\mathbf{h}_i^{(l+1)} = \mathbf{h}_i^{(l+1)} + \mathbf{h}_i^{(l)}$,从更早的地层保存信息。
    - ** 跳跃性知识**:从所有层面提出或集中注意力的表述,而不仅仅是最后一种。
    - ** DropEdge**:在训练期间随机去除边缘,减缓了信息传播.
    - ** Graph Transformers**(文件4):绕过本地消息传递瓶颈,引起全球关注.

## 图池化



- 对于**graph-level任务**(预想整个图的属性,就像分子的毒性),我们需要将所有节点表示分解为单一的图形级向量. 这是**图集**,CNNs全球平均集合的图表模拟(第8章)。

- 最简单的方法是**readout**:对所有节点特征集应用一个通量-变量函数:

$$\mathbf{h}_G = \text{READOUT}(\{\mathbf{h}_i^{(L)} : i \in V\}) = \sum_i \mathbf{h}_i^{(L)} \quad \text{or} \quad \frac{1}{|V|} \sum_i \mathbf{h}_i^{(L)} \quad \text{or} \quad \max_i \mathbf{h}_i^{(L)}$$

- 这是文件 1 的 DeepSets 聚合, 在 GNN 最终层后应用。Sum保留了大小信息(一个有100个节点的图将有一个大于一个有10个的和),而大小的平均值为常态.

- ** 高阶组合** 逐渐收缩图表,反映CNN如何逐步降低图像样本。在每个级别,节点组被合并为"超级节点":

- ** DiffPool**(差异组合)学习软任务矩阵$S^{(l)} \in \mathbb{R}^{n_l \times n_{l+1}}$,将每个节点指定为集群:

$$X^{(l+1)} = S^{(l)T} H^{(l)}, \quad A^{(l+1)} = S^{(l)T} A^{(l)} S^{(l)}$$

- 任务矩阵是由单独的GNN预测的,使得集群的端到端可有差异. 这就形成了一个分级:原始图 → 节点较少的相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相

- ** TopKPool ** 采取更简单的做法:为每个节点学习一个分数,保持顶端-$k$分出节点,然后放下剩下的。这是一个硬选取(不是软派),在计算上比地夫宝便宜.

## 异构图



- 目前所有的GNN假设一个**同心图**:一种节点,一种边缘. 但大多数现实世界的图表是**异相**:多节点类型和多边缘类型. 一个知识图有人物节点,组织节点,以及位置节点,通过"works at","born in"和"地处"边缘相接. 一个推荐者系统有用户节点和项目节点通过"购买","查看"和"分级"边缘相接.

- 相异的图有**schema**(也叫元),它定义了允许的节点类型和边缘类型. 每个边缘类型将特定源类型与特定目标类型相接. 例如"works at"连接了Person-Organization.

- ** 关系性GCN(R-GCN)**(Schlichtkrull等,2018年)通过对每种边缘类型使用单独的权重矩阵来处理各种边缘:

$$\mathbf{h}_i^{(l+1)} = \sigma\left(\sum_{r \in \mathcal{R}} \sum_{j \in \mathcal{N}_r(i)} \frac{1}{|\mathcal{N}_r(i)|} W_r^{(l)} \mathbf{h}_j^{(l)} + W_0^{(l)} \mathbf{h}_i^{(l)}\right)$$

- 地点$\mathcal{R}$是边缘类型的一组,$\mathcal{N}_r(i)$是连接到节点的相邻区域$i$通过关系$r$,以及$W_r$是相对于关系的权重矩阵$r$。。。自我连接$W_0$分别处理节点本身的特性。

- 问题:在许多关系类型下,参数数会爆炸(一)$d \times d$矩阵(每个关系)。R-GCN通过** Basis分解** 来缓解这种情况:$W_r = \sum_{b=1}^{B} a_{rb} V_b$,在其中$V_b$共享基质矩阵和$a_{rb}$每个关系为平分系数。这类似于低等分级因子化(第2章):关系特异性矩阵活在一个低维子空间.

- ** 异相图变形器(HGT)**(Hu等,2020年)将注意机制应用于多相图. 关键洞察力是注意力应该取决于节点类型和连接它们的边缘类型. HGT 使用特定类型投影矩阵进行查询,键和值:

$$\text{Attention}(i, j) = \left(W_{\tau(i)}^Q \mathbf{h}_i\right)^T \cdot \frac{W_{\phi(i,j)}^{\text{ATT}}}{\sqrt{d}} \cdot \left(W_{\tau(j)}^K \mathbf{h}_j\right)$$

- 地点$\tau(i)$是节点的类型$i$财务报告和已审计财务报表$\phi(i,j)$是它们之间的边缘类型。这保证了模型对不同关系类型有不同的处理:为作者撰写的论文应当使用与参考文献不同的关注分量.

- ** 基于Metapath的方法** 界定了通过计划(例如作者-论文-作者-共同作者)的有意义的路径,并沿这些路径汇总了信息。** HAN**(异地关注网络)在两个层面给予注意:在每个元道内(沿着这条路径的哪个邻国?) 以及跨越元道(哪些关系模式很重要?)

## 链接预测与知识图谱补全



- ** Link 预测** 问:鉴于现有的边缘,哪些缺失的边缘可能存在? 这是完成知识图(预计缺失的事实)、建议(预测用户喜欢的项目)和社会网络分析(预计未来友谊)的核心任务。

- ** 基于编辑的方法** 学习每个实体的向量和每个关系的变换,然后根据各实体和关系如何结合而得分:

- ** TransE** 模式关系作为嵌入空间中的翻译:如果$(h, r, t)$是有效的三重体(头实体、关系实体、尾实体),然后$\mathbf{h} + \mathbf{r} \approx \mathbf{t}$。。。得分函数是$f(h, r, t) = -\|\mathbf{h} + \mathbf{r} - \mathbf{t}\|$。。。直觉上,在嵌入空间中,关系向量"移动"头实体到尾实体.

- ** RotatE ** 模拟关系作为复杂空间的自转:$\mathbf{t} = \mathbf{h} \circ \mathbf{r}$,在其中$\circ$是元素的复杂乘法,并且$|\mathbf{r}_i| = 1$(单位复数为回转). 这可以模型化对称,反对称,倒置,以及TransE所不能的构成模式.

- **ContlEx**使用带有赫米底点产品的复杂价值嵌入,使其能模拟不对称关系(如果A是B的上司,B不是A的上司).

- 基于GNN的链接预测计算出带消息传入的节点嵌入,再用端点嵌入来打分边缘. 这结合了GNNs的结构推理和嵌入方法的关系建模. GNN编码器捕捉出单嵌入方法所忽略的多跳相邻结构.

## 任务类型



- GNNs解决了三类任务:

- **节点级任务**:为每个节点预测一个属性. 例子:在社交网络(bot或human)中对用户进行分类,在一个互动网络中预测每个蛋白质的功能,半监督的节点分类(label a few nodes, provide the rest). 输出为嵌入节点$\mathbf{h}_i^{(L)}$通过分类器。

- ** Edge-level 任务**:预测每个边缘的属性或预测是否存在边缘. 例如:链接预测(这两个用户会成为朋友吗?),知识图补全(这些实体之间的这种关系是否维持?),药物与药物相互作用预测. 输出一般使用两个端点节点的嵌入:$\hat{y}_{ij} = f(\mathbf{h}_i, \mathbf{h}_j)$,在其中$f$是一种点产品,通配+MLP,或者其他组合.

- ** Graph 级任务**:为整个图预测一个属性. 例如:分子属性预测(是这个分子有毒吗?),图解分类(是这个社交网络是bot网络?),图解生成(设计一个具有所期望的特性的分子). 输出使用图集生成$\mathbf{h}_G$,然后被分类或倒置。

## 编程任务（使用 Colab 或 notebook）



1. 使用常态化的相位矩阵从零开始执行单一的GCN层. 应用到一个小的图上,观察节点特征是如何平滑的.
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

2. 执行以总和聚合(GIN-style)传递消息,并与平均聚合(GCN-style)进行比较. 显示总和可以区分表示不能的多集.
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

3. 表现出过度吸气。反复应用常态化的相接功能并监视节点特性会汇合.
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
