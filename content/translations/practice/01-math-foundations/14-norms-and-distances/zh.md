---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/01-math-foundations/14-norms-and-distances/docs/en.md
  revision: f7aadc1d61a9fbbe2bdb107d1e2bf0a6caeea299
  sha256: 3458a8054e725603437b21aad1522f4a7bd503397cd25530661e68fda3c378c8
status: reviewed
---

# 范数与距离

> 距离函数定义“相似”的含义；选错，所有下游都会偏离。

**类型：** 实作  
**学习实现：** Python  
**前置课程：** Phase 1 · 第 01–02 课  
**预计时间：** 约 90 分钟

## 学习目标

- 从零实现 L1、L2、cosine、Mahalanobis、Jaccard 与 edit distance。
- 为 ML 任务选合适距离，并解释备选为何失败。
- 将 L1/L2 连接至 Lasso/Ridge 和其几何约束区域。
- 展示同一数据在不同度量下有不同 nearest neighbor。

## 问题

你有两个向量。它们可能是词嵌入，可能是用户画像，也可能是像素数组。你需要知道：它们有多近？

答案完全取决于你选择哪个距离函数。两个数据点在一种度量下可能是最近邻，在另一种度量下却相距甚远。你的 KNN 分类器、推荐引擎、向量数据库、聚类算法、损失函数——它们都依赖这个选择。选错了，模型就会为错误的目标做优化。

不存在通用的最优距离。L2 适合空间数据，余弦相似度主导 NLP，Jaccard 处理集合，编辑距离处理字符串，Mahalanobis 考虑相关性，Wasserstein 搬运概率质量。每一种都编码了关于“相似”含义的不同假设。

本课从零构建每一个主要的距离函数，说明每一种何时是正确工具，并演示同一份数据在不同度量下会得到完全不同的最近邻。

## 概念

### 范数：度量向量大小 <!-- learning-atlas: norms-measuring-vector-magnitude -->

范数度量向量的“大小”。两个向量之间的每一个距离函数都可以写成它们之差的范数：$d(a, b) = \lVert a - b \rVert$。因此理解范数就是理解距离。

### L1 范数（Manhattan 距离）

L1 范数将各分量的绝对值相加。

```math
\lVert x \rVert_1 = |x_1| + |x_2| + \cdots + |x_n|
```

之所以称为 Manhattan 距离，是因为它度量你在只能沿坐标轴移动（不能走对角线）的城市网格上要走多远。

```
Point A = (1, 1)
Point B = (4, 5)

L1 distance = |4-1| + |5-1| = 3 + 4 = 7

On a grid, you walk 3 blocks east and 4 blocks north.
```

何时使用 L1：
- 高维稀疏数据（文本特征、one-hot 编码）
- 需要对离群值稳健时（单个巨大的差异不会占主导）
- 特征选择问题（L1 正则化促进稀疏）

与 L1 正则化（Lasso）的联系：在损失函数中加入 $\lVert w \rVert_1$ 会惩罚权重绝对值之和。这会把小权重推到恰好为零，从而自动完成特征选择。L1 惩罚在权重空间中形成菱形约束区域，而菱形的角落落在某些权重为零的坐标轴上。

与损失函数的联系：平均绝对误差（MAE）是预测与目标之间的平均 L1 距离。它对所有误差做线性惩罚，因此相比 MSE 对离群值更稳健。

### L2 范数（Euclidean 距离）

L2 范数是直线距离，即各分量平方和的平方根。

```math
\lVert x \rVert_2 = \sqrt{x_1^2 + x_2^2 + \cdots + x_n^2}
```

这就是你在几何课上学的距离，是 $n$ 维下的勾股定理。

```
Point A = (1, 1)
Point B = (4, 5)

L2 distance = sqrt((4-1)^2 + (5-1)^2) = sqrt(9 + 16) = sqrt(25) = 5.0

The straight line, cutting diagonally through the grid.
```

何时使用 L2：
- 低到中维的连续数据
- 特征尺度可比时
- 物理距离（空间数据、传感器读数）
- 像素级别的图像相似度

与 L2 正则化（Ridge）的联系：在损失函数中加入 $\lVert w \rVert_2^2$ 会惩罚较大的权重。与 L1 不同，它不会把权重推到零，而是让所有权重按比例向零收缩。L2 惩罚形成圆形约束区域，坐标轴上没有角落，因此权重会变小，但很少恰好为零。

与损失函数的联系：均方误差（MSE）是 L2 距离平方的平均值。平方使得大误差比小误差受到更重的惩罚。

```math
\begin{aligned}
\text{MAE (L1 loss):} \quad & |y - \hat{y}| && \text{Linear penalty. Robust to outliers.} \\
\text{MSE (L2 loss):} \quad & (y - \hat{y})^2 && \text{Quadratic penalty. Sensitive to outliers.}
\end{aligned}
```

### Lp 范数：一般族

L1 和 L2 都是 Lp 范数的特例：

```math
\lVert x \rVert_p = (|x_1|^p + |x_2|^p + \cdots + |x_n|^p)^{1/p}
```

不同的 $p$ 值会产生不同形状的“单位球”（所有与原点距离为 1 的点组成的集合）：

```
p=1:    Diamond shape      (corners on axes)
p=2:    Circle/sphere      (the usual round ball)
p=3:    Superellipse       (rounded square)
p=inf:  Square/hypercube   (flat sides along axes)
```

### L-infinity 范数（Chebyshev 距离）

当 $p$ 趋于无穷大时，Lp 范数收敛到最大的绝对分量。

```math
\lVert x \rVert_\infty = \max(|x_1|, |x_2|, \ldots, |x_n|)
```

两点之间的距离由它们差异最大的那一个维度决定，其余所有维度都被忽略。

```math
\begin{aligned}
\text{Point } A &= (1, 1) \\
\text{Point } B &= (4, 5) \\[6pt]
L_\infty \text{ distance} &= \max(|4-1|, |5-1|) = \max(3, 4) = 4
\end{aligned}
```

何时使用 L-infinity：
- 任意单个维度上的最坏偏差最关键时
- 棋盘（国际象棋中的王按 L-infinity 移动：任意方向走一步都花费 1）
- 制造公差（每个维度都必须在规格之内）

### Cosine 相似度与 Cosine 距离

余弦相似度度量两个向量之间的夹角，忽略它们的模长。

```math
\text{cos\_sim}(a, b) = \frac{a \cdot b}{\lVert a \rVert_2 \, \lVert b \rVert_2}
```

它的取值范围从 -1（方向相反）到 +1（方向相同）。相互垂直的向量余弦相似度为 0。

余弦距离把它转换为距离：cosine_distance = 1 - cosine_similarity，范围从 0（方向相同）到 2（方向相反）。

```math
\begin{aligned}
& a = (1, 0) \qquad b = (1, 1) \\[6pt]
& \text{cos\_sim} = \frac{1 \cdot 1 + 0 \cdot 1}{1 \cdot \sqrt{2}} = \frac{1}{\sqrt{2}} = 0.707 \\
& \text{cos\_dist} = 1 - 0.707 = 0.293
\end{aligned}
```

余弦为何主导 NLP 和嵌入：在文本中，文档长度不应影响相似度。一篇关于猫、长度是另一篇两倍的文档，仍应与后者“相似”。余弦相似度忽略模长（长度），只关心方向。两篇词分布相同但长度不同的文档指向同一方向，余弦相似度为 1.0。

何时使用余弦相似度：
- 文本相似度（TF-IDF 向量、词嵌入、句嵌入）
- 任何模长是噪声、方向才是信号的领域
- 推荐系统（用户偏好向量）
- 嵌入检索（向量数据库几乎总是使用余弦或点积）

### 点积相似度与 Cosine 相似度

两个向量的点积为：

```math
\begin{aligned}
a \cdot b &= a_1 b_1 + a_2 b_2 + \cdots + a_n b_n \\
&= \lVert a \rVert \, \lVert b \rVert \cos(\text{angle})
\end{aligned}
```

余弦相似度是点积按两个模长归一化后的结果。当两个向量都已单位归一化（模长 = 1）时，点积与余弦相似度完全相同。

```math
\text{If } \lVert a \rVert = 1 \text{ and } \lVert b \rVert = 1: \quad a \cdot b = \cos(\text{angle between } a \text{ and } b)
```

两者何时不同：点积包含模长信息，模长更大的向量会得到更高的点积得分。这在某些检索系统中很重要——你希望“热门”条目排得更靠前时，模长就充当了隐式的质量或重要性信号。

```
a = (3, 0)    b = (1, 0)    c = (0, 1)

dot(a, b) = 3     dot(a, c) = 0
cos(a, b) = 1.0   cos(a, c) = 0.0

Both agree on direction, but dot product also reflects magnitude.
```

实践中：
- 需要纯方向相似度时用余弦相似度
- 模长携带有意义的信息时用点积
- 许多向量数据库（Pinecone、Weaviate、Qdrant）允许你在两者间选择
- 如果嵌入已做 L2 归一化，选哪个都一样

### Mahalanobis 距离

欧氏距离平等对待所有维度。但如果特征相关或尺度不同，L2 会给出误导性的结果。

Mahalanobis 距离考虑了数据的协方差结构。

```math
d_M(x, y) = \sqrt{(x - y)^T S^{-1} (x - y)}
```

其中 $S$ 是数据的协方差矩阵。

直观地说：Mahalanobis 距离先对数据去相关并归一化（白化），再在变换后的空间中计算 L2 距离。如果 $S$ 是单位矩阵（特征不相关、单位方差），Mahalanobis 距离就退化为欧氏距离。

```
Example: height and weight are correlated.
Someone 6'2" and 180 lbs is not unusual.
Someone 5'0" and 180 lbs is unusual.

Euclidean distance might say they are equally far from the mean.
Mahalanobis distance correctly identifies the second as an outlier
because it accounts for the height-weight correlation.
```

何时使用 Mahalanobis 距离：
- 离群值检测（与均值的 Mahalanobis 距离较大的点就是离群值）
- 特征尺度不同且相关时的分类
- 当你有足够的数据来估计可靠的协方差矩阵时
- 制造业的质量控制（多元过程监控）

### Jaccard 相似度（集合）

Jaccard 相似度度量两个集合之间的重叠。

```math
J(A, B) = \frac{|A \cap B|}{|A \cup B|}
```

它的取值范围从 0（无重叠）到 1（集合相同）。Jaccard 距离 = 1 - Jaccard 相似度。

```
A = {cat, dog, fish}
B = {cat, bird, fish, snake}

Intersection = {cat, fish}         size = 2
Union = {cat, dog, fish, bird, snake}  size = 5

Jaccard similarity = 2/5 = 0.4
Jaccard distance = 0.6
```

何时使用 Jaccard：
- 比较标签、类别或特征构成的集合
- 基于词是否出现（而非频率）的文档相似度
- 近重复检测（用 MinHash 近似 Jaccard）
- 比较二值特征向量（存在/缺失数据）
- 评估分割模型（交并比 Intersection over Union 就是 Jaccard）

### Edit distance（Levenshtein 距离）

编辑距离统计把一个字符串变换成另一个所需的最少单字符操作数。操作包括：插入、删除或替换。

```
"kitten" -> "sitting"

kitten -> sitten  (substitute k -> s)
sitten -> sittin  (substitute e -> i)
sittin -> sitting (insert g)

Edit distance = 3
```

用动态规划计算。填一个矩阵，其中 $(i, j)$ 项是字符串 A 的前 $i$ 个字符与字符串 B 的前 $j$ 个字符之间的编辑距离。

```
        ""  s  i  t  t  i  n  g
    ""   0  1  2  3  4  5  6  7
    k    1  1  2  3  4  5  6  7
    i    2  2  1  2  3  4  5  6
    t    3  3  2  1  2  3  4  5
    t    4  4  3  2  1  2  3  4
    e    5  5  4  3  2  2  3  4
    n    6  6  5  4  3  3  2  3
```

何时使用编辑距离：
- 拼写检查与纠错
- DNA 序列比对（可带加权操作）
- 模糊字符串匹配
- 对杂乱文本数据去重

### KL 散度（不是距离，但常这样使用）

KL 散度度量一个概率分布与另一个的差异程度。它在第 09 课讲过，但放在这里讨论是因为人们常把它当作“距离”使用，尽管它并不是。

```math
D_{KL}(P \,\|\, Q) = \sum_x p(x) \log\frac{p(x)}{q(x)}
```

关键性质：KL 散度不对称。

```math
D_{KL}(P \,\|\, Q) \ne D_{KL}(Q \,\|\, P)
```

这意味着它不满足距离度量的基本要求。它也不满足三角不等式。它是散度，不是距离。

前向 KL $(D_{KL}(P \Vert Q))$ 是“覆盖众数”的：$Q$ 试图覆盖 $P$ 的所有众数。
反向 KL $(D_{KL}(Q \Vert P))$ 是“寻找众数”的：$Q$ 聚焦于 $P$ 的单个众数。

你会在哪里见到 KL 散度：
- VAE（ELBO 中的 KL 项把隐分布推向先验）
- 知识蒸馏（学生试图匹配教师的分布）
- RLHF（KL 惩罚让微调后的模型保持接近基础模型）
- 策略梯度方法（约束策略更新）

### Wasserstein 距离（Earth Mover 距离）

Wasserstein 距离度量把一个概率分布变换成另一个所需的最小“工作量”。可以这样理解：如果一个分布是一堆土、另一个是一个坑，你需要搬多少土、搬多远？

```math
W(P, Q) = \inf_{\gamma} \mathbb{E}[d(x, y)] \quad \text{(over all transport plans } \gamma\text{)}
```

对于一维分布，它简化为两个累积分布函数之差的绝对值的积分：

```math
W_1(P, Q) = \int |\text{CDF}_P(x) - \text{CDF}_Q(x)| \, dx
```

Wasserstein 为何重要：
- 它是真正的度量（对称、满足三角不等式）
- 即使分布不重叠它也能提供梯度（此时 KL 散度趋于无穷大）
- 这一性质使它成为 Wasserstein GAN（WGAN）的核心，WGAN 解决了原始 GAN 的训练不稳定问题

```
Distributions with no overlap:

P: [1, 0, 0, 0, 0]    Q: [0, 0, 0, 0, 1]

KL divergence: infinity (log of zero)
Wasserstein: 4 (move all mass 4 bins)

Wasserstein gives a meaningful gradient. KL does not.
```

何时使用 Wasserstein：
- GAN 训练（WGAN、WGAN-GP）
- 比较可能不重叠的分布
- 最优传输问题
- 图像检索（比较颜色直方图）

### 为什么不同任务需要不同距离

| 任务 | 最佳距离 | 原因 |
|------|--------------|-----|
| 文本相似度 | 余弦 | 模长是噪声，方向才是含义 |
| 图像像素比较 | L2 | 空间关系重要，特征尺度可比 |
| 稀疏高维特征 | L1 | 稳健，不会放大罕见的大差异 |
| 集合重叠（标签、类别） | Jaccard | 数据天然是集合型而非向量型 |
| 字符串匹配 | 编辑距离 | 操作对应人类编辑的直觉 |
| 离群值检测 | Mahalanobis | 考虑特征相关性与尺度 |
| 比较分布 | KL 散度 | 度量用 $Q$ 替代 $P$ 所损失的信息 |
| GAN 训练 | Wasserstein | 分布不重叠时仍能提供梯度 |
| 嵌入（向量数据库） | 余弦或点积 | 嵌入被训练为在方向上编码含义 |
| 推荐 | 点积 | 模长可编码流行度或置信度 |
| DNA 序列 | 加权编辑距离 | 替换代价随核苷酸对而变 |
| 制造业质控 | L-infinity | 任意维度上的最坏偏差最关键 |

### 与损失函数的连接

损失函数就是作用于预测与目标之上的距离函数。

```
Loss function       Distance it uses       Behavior
MSE                 L2 squared             Penalizes large errors heavily
MAE                 L1                     Penalizes all errors equally
Huber loss          L1 for large errors,   Best of both: robust to outliers,
                    L2 for small errors    smooth gradient near zero
Cross-entropy       KL divergence          Measures distribution mismatch
Hinge loss          max(0, margin - d)     Only penalizes below margin
Triplet loss        L2 (typically)         Pulls positives close, pushes
                                           negatives away
Contrastive loss    L2                     Similar pairs close, dissimilar
                                           pairs beyond margin
```

### 与正则化的连接

正则化在损失函数上为权重加一个范数惩罚。

```
L1 regularization (Lasso):   loss + lambda * ||w||_1
  -> Sparse weights. Some weights become exactly zero.
  -> Automatic feature selection.
  -> Solution has corners (non-differentiable at zero).

L2 regularization (Ridge):   loss + lambda * ||w||_2^2
  -> Small weights. All weights shrink toward zero.
  -> No feature selection (nothing goes to exactly zero).
  -> Smooth solution everywhere.

Elastic Net:                  loss + lambda_1 * ||w||_1 + lambda_2 * ||w||_2^2
  -> Combines sparsity of L1 with stability of L2.
  -> Groups of correlated features are kept or dropped together.
```

为什么 L1 产生稀疏而 L2 不会：想象二维权重空间中的约束区域。L1 是菱形，L2 是圆。损失函数的等高线（椭圆）最容易在菱形的角落处相切，那里某个权重为零；而它与圆相切于光滑点，那里两个权重都非零。

### 最近邻搜索

每个距离函数都隐含一个最近邻搜索问题：给定一个查询点，在数据集中找到最近的点。

精确最近邻搜索在包含 $n$ 个 $d$ 维点的数据集上每次查询需要 $O(n \cdot d)$。对于大型数据集，这太慢了。

近似最近邻（ANN）算法用少量精度换取巨大的速度提升：

```
Algorithm         Approach                      Used by
KD-trees          Axis-aligned space partition   scikit-learn (low-dim)
Ball trees        Nested hyperspheres            scikit-learn (medium-dim)
LSH               Random hash projections        Near-duplicate detection
HNSW              Hierarchical navigable         FAISS, Qdrant, Weaviate
                  small-world graph
IVF               Inverted file index with       FAISS (billion-scale)
                  cluster-based search
Product quant.    Compress vectors, search       FAISS (memory-constrained)
                  in compressed space
```

HNSW（分层可导航小世界图）是现代向量数据库中的主流算法。它构建一个多层图，每个节点连接到它的近似最近邻。搜索从顶层（稀疏、长跳）开始，向下进入底层（稠密、短跳）。

```figure
norm-unit-balls
```

## 动手构建

### 步骤 1：实现全部范数与距离函数

参见 `code/distances.py` 的完整实现；每个函数只用基础 Python 数学运算从零构建。

### 步骤 2：同一数据、不同距离、不同近邻

`distances.py` 创建数据集和查询点，展示 L1、L2、cosine 等度量会选出不同的最近邻。

### 步骤 3：嵌入相似度搜索

模拟嵌入检索，比较 cosine 相似度与 L2 距离产生的排序差异。

## 使用

最常见的实际用途：在向量数据库中查找相似条目。

```python
import numpy as np

def cosine_similarity_matrix(X):
    norms = np.linalg.norm(X, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1, norms)
    X_normalized = X / norms
    return X_normalized @ X_normalized.T

embeddings = np.random.randn(1000, 768)

sim_matrix = cosine_similarity_matrix(embeddings)

query_idx = 0
similarities = sim_matrix[query_idx]
top_k = np.argsort(similarities)[::-1][1:6]
print(f"Top 5 most similar to item 0: {top_k}")
print(f"Similarities: {similarities[top_k]}")
```

当你调用 `model.encode(text)` 然后检索向量数据库时，底层发生的就是这件事。嵌入模型把文本映射为向量，向量数据库计算你的查询向量与每个存储向量之间的余弦相似度（或点积），并用 ANN 算法避免逐一检查所有向量。

## 练习

1. 计算 `(1,2,3)` 与 `(4,0,6)` 的 L1、L2、L∞，并证明任意点对都满足 `L∞≤L2≤L1`。
2. 构造 cosine>0.9 但 L2>10 的向量，再构造 cosine<0.3 但 L2<0.5 的向量，并解释几何原因。
3. 实现函数，分别按 L1、L2、cosine、Mahalanobis 返回数据集最近邻，找出四者结果全不同的数据集。
4. 用 CDF 手算 `[0.5,0.5,0,0]` 与 `[0,0,0.5,0.5]`、以及均匀分布与后者的 Wasserstein 距离，比较大小并说明原因。
5. 实现 MinHash 近似 Jaccard；生成 100 个随机集合，使用 50、100、200 个哈希函数比较误差并绘图。

### 提示

**练习 1.** 差向量是 (-3, 2, -3)，因此用 `l1_norm`、`l2_norm` 和 `linf_norm` 计算该向量的三种范数。至于证明，把最大的 $\lvert d_i \rvert$ 与平方和比较，再把平方和与绝对值之和的平方比较。

**练习 2.** 余弦相似度忽略长度，所以先取两个方向几乎相同的向量，再把其中一个拉得长很多。对第二种情形，取原点附近两个方向不同的短向量，然后用 `cosine_similarity` 和 `l2_distance` 检验两个条件。

**练习 3.** 对 `l1_distance`、`l2_distance`、`cosine_distance` 和 `mahalanobis_distance` 各调用一次 `find_nearest_neighbor(query, dataset, distance_fn)`。`demo_different_neighbors` 展示了一个度量彼此不一致的数据集，先读它，再改动这些点，直到四个答案都不同。

**练习 4.** 写出每个分布的累积和，然后把两个累积和的绝对差相加。用 `wasserstein_1d(p, q)` 核对两次手算结果，再根据概率质量必须移动多远来解释较大的那个值。

**练习 5.** 对每个哈希函数，一个集合的 MinHash 签名是其元素上的最小哈希值；两个集合取得相同最小值的哈希函数比例，可估计它们的 Jaccard 相似度。用 `jaccard_similarity` 比较每个估计值；对于 $k$ 个哈希函数，误差应大致以 $1/\sqrt{k}$ 的速度下降。

## 关键术语

| 术语 | 常用说法 | 准确定义 |
|---|---|---|
| Norm | “向量大小” | 非负、齐次、三角不等式且仅零向量取 0 的标量函数。 |
| L1 norm | “Manhattan distance” | 绝对分量之和；稳健并促成稀疏。 |
| L2 norm | “Euclidean distance” | 平方和开方；欧氏空间直线距离。 |
| Lp norm | “Generalized norm” | 绝对分量 p 次方和的 p 次根。 |
| L-infinity norm | “Max/Chebyshev” | 最大绝对分量，是 Lp 的无穷极限。 |
| Cosine similarity | “向量夹角” | 点积按两向量长度归一，范围 -1 到 +1。 |
| Cosine distance | “1 减 cosine” | 将相似度转为 0 到 2 的距离。 |
| Dot product | “未归一化 cosine” | 分量乘积之和，同时反映长度。 |
| Mahalanobis distance | “考虑相关的距离” | 在协方差白化空间中的 L2。 |
| Jaccard similarity | “集合重叠” | 交集大小除以并集大小。 |
| Edit distance | “Levenshtein” | 最少插入、删除、替换数。 |
| KL divergence | “分布距离” | 非对称的分布编码额外代价，不是真距离。 |
| Wasserstein distance | “Earth mover” | 搬运质量的最小工作量，是真 metric。 |
| Approximate nearest neighbor | “ANN search” | HNSW、LSH、IVF 等快速近似搜索。 |
| HNSW | “向量 DB 算法” | 分层 small-world 图。 |
| L1 regularization | “Lasso” | L1 惩罚使权重严格为零。 |
| L2 regularization | “Ridge/weight decay” | 平滑收缩权重但不产生稀疏。 |
| Elastic Net | “L1 + L2” | 结合稀疏性与稳定性。 |

## 延伸阅读

- [FAISS：高效相似度搜索库](https://github.com/facebookresearch/faiss)——Meta 的大规模 ANN 库。
- [Wasserstein GAN](https://arxiv.org/abs/1701.07875)——将 Earth Mover 距离引入 GAN 的论文。
- [Locality-Sensitive Hashing](https://dl.acm.org/doi/10.1145/276698.276876)——经典 ANN 算法。
- [Word2Vec](https://arxiv.org/abs/1301.3781)——embedding 中 cosine 相似度的代表性工作。
- [sklearn.neighbors 文档](https://scikit-learn.org/stable/modules/neighbors.html)——距离度量与近邻算法实践指南。
