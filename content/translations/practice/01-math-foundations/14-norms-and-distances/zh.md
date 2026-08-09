---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/01-math-foundations/14-norms-and-distances/docs/en.md
  revision: 7157ca74a135fad2165f680ec4b4e592f075ec21
  sha256: f0949b87124ae76e14ed331231e357edf7e60552dc4fadd42dee0ffed10ebeca
status: reviewed
---

# 范数与距离

> 距离函数定义“相似”的含义；选错，所有下游都会偏离。

**类型：** 实作  
**学习实现：** Python  
**前置课程：** Phase 1 · 第 01–02 课  
**预计学习：** 约 90 分钟

## 学习目标

- 从零实现 L1、L2、cosine、Mahalanobis、Jaccard 与 edit distance。
- 为 ML 任务选合适距离，并解释备选为何失败。
- 将 L1/L2 连接至 Lasso/Ridge 和其几何约束区域。
- 展示同一数据在不同度量下有不同 nearest neighbor。

## 问题

两个词嵌入、用户画像或像素数组“有多近”完全取决于选择的距离。一个点可能在某度量下最近、在另一度量下很远；KNN、推荐、向量数据库、聚类和损失都依赖此选择。L2 适合空间数据，cosine 主导 NLP，Jaccard 用于集合，edit 用于字符串，Mahalanobis 处理相关，Wasserstein 搬运概率质量，没有通用最优。

## 概念

### 范数：度量向量大小 <!-- learning-atlas: norms-measuring-vector-magnitude -->

范数度量向量大小，向量距离可写为 d(a,b)=||a-b||。L1= sum |x_i|，是只能沿城市街区走的 Manhattan：A=(1,1)、B=(4,5) 时为 7。适合稀疏高维文本/one-hot、鲁棒 outlier、feature selection；Lasso 在 loss 加 ||w||_1，菱形约束的角落落在轴上，会将小权重推到严格 0。MAE 是预测与目标的平均 L1，线性惩罚、抗 outlier。

L2=sqrt(sum x_i²)，直线欧氏距离，同例为 5。适合低中维连续/同尺度特征、空间/传感器/像素；Ridge 在 loss 加 ||w||_2²，圆形约束无轴角，所有权重缩向 0 而极少正好 0；MSE 是平方 L2，重罚大误差。Lp=(sum |x_i|^p)^(1/p)，p=1 是菱形、p=2 圆、p=3 圆角方，p→inf 是方形。

L-infinity=max|x_i|，例中为 4，关注单轴最大偏差；适合 worst-case tolerance、棋王移动和制造质控。范数应非负且仅零向量为 0、绝对齐次、满足三角不等式。

### L1 范数（Manhattan 距离）

L1 将各分量绝对值相加；对稀疏高维数据和异常值更稳健，并通过 Lasso 产生稀疏权重。MAE 正是平均 L1 误差。

```
||x||_1 = |x_1| + |x_2| + ... + |x_n|
```

```
Point A = (1, 1)
Point B = (4, 5)

L1 distance = |4-1| + |5-1| = 3 + 4 = 7

On a grid, you walk 3 blocks east and 4 blocks north.
```

### L2 范数（Euclidean 距离）

L2 是平方和开方的直线距离，适合尺度可比的连续数据、空间/传感器和像素。Ridge 使用平方 L2，MSE 对大误差更敏感。

```
||x||_2 = sqrt(x_1^2 + x_2^2 + ... + x_n^2)
```

```
Point A = (1, 1)
Point B = (4, 5)

L2 distance = sqrt((4-1)^2 + (5-1)^2) = sqrt(9 + 16) = sqrt(25) = 5.0

The straight line, cutting diagonally through the grid.
```

```
MAE (L1 loss):  |y - y_hat|         Linear penalty. Robust to outliers.
MSE (L2 loss):  (y - y_hat)^2       Quadratic penalty. Sensitive to outliers.
```

### Lp 范数：一般族

`||x||_p=(sum |x_i|^p)^(1/p)`；p=1 为菱形，p=2 为圆/球，p=3 为圆角方形，p→∞ 为方形/超立方体。

```
||x||_p = (|x_1|^p + |x_2|^p + ... + |x_n|^p)^(1/p)
```

```
p=1:    Diamond shape      (corners on axes)
p=2:    Circle/sphere      (the usual round ball)
p=3:    Superellipse       (rounded square)
p=inf:  Square/hypercube   (flat sides along axes)
```

### L-infinity 范数（Chebyshev 距离）

`||x||_inf=max(|x_1|,...,|x_n|)`，只由最大偏差的维度决定。

```
||x||_inf = max(|x_1|, |x_2|, ..., |x_n|)
```

```
Point A = (1, 1)
Point B = (4, 5)

L-inf distance = max(|4-1|, |5-1|) = max(3, 4) = 4
```

### Cosine 相似度与 Cosine 距离

cos_sim(a,b)=a·b/(||a||₂||b||₂)，范围 -1..1，cosine distance=1-cos，范围 0..2；它忽略长度，故长度不同但词分布相同的文档仍为 1，非常适合 TF-IDF、word/sentence embedding、preference 和 vector search。dot=a·b=||a||||b||cos(angle)，若均 L2 normalized 则等于 cosine；否则 magnitude 是流行度/质量等额外信号。cosine 要纯方向，dot 要保 magnitude。

```
cos_sim(a, b) = (a . b) / (||a||_2 * ||b||_2)
```

```
a = (1, 0)    b = (1, 1)

cos_sim = (1*1 + 0*1) / (1 * sqrt(2)) = 1/sqrt(2) = 0.707
cos_dist = 1 - 0.707 = 0.293
```

### 点积相似度与 Cosine 相似度

单位归一化向量的点积等于 cosine；未归一化时点积还包含长度，可作为流行度或置信度信号。向量数据库通常允许在两者间选择。

```
a . b = a_1*b_1 + a_2*b_2 + ... + a_n*b_n
      = ||a|| * ||b|| * cos(angle)
```

```
If ||a|| = 1 and ||b|| = 1:
    a . b = cos(angle between a and b)
```

```
a = (3, 0)    b = (1, 0)    c = (0, 1)

dot(a, b) = 3     dot(a, c) = 0
cos(a, b) = 1.0   cos(a, c) = 0.0

Both agree on direction, but dot product also reflects magnitude.
```

### Mahalanobis 距离

Mahalanobis d_M=sqrt((x-y)^T S^-1 (x-y))，先 whiten/decorr 后 L2；S=I 时退为 Euclidean。身高体重相关时，沿相关轴的偏离不罕见、垂直偏离更异常。用在 outlier、不同 scale/相关特征的分类、可靠 covariance 的 QC。

Mahalanobis 使用协方差矩阵白化数据；协方差为单位阵时退化为 Euclidean。适合异常检测、不同尺度/相关特征分类和制造质量控制。

```
d_M(x, y) = sqrt((x - y)^T * S^(-1) * (x - y))
```

```
Example: height and weight are correlated.
Someone 6'2" and 180 lbs is not unusual.
Someone 5'0" and 180 lbs is unusual.

Euclidean distance might say they are equally far from the mean.
Mahalanobis distance correctly identifies the second as an outlier
because it accounts for the height-weight correlation.
```

### Jaccard 相似度（集合）

Jaccard J(A,B)=|A∩B|/|A∪B|，distance=1-J，例 {cat,dog,fish} 与 {cat,bird,fish,snake} 为 .4/.6；用于 tags/categories、word presence、MinHash near duplicate、binary feature 和 segmentation IoU。

```
J(A, B) = |A intersect B| / |A union B|
```

```
A = {cat, dog, fish}
B = {cat, bird, fish, snake}

Intersection = {cat, fish}         size = 2
Union = {cat, dog, fish, bird, snake}  size = 5

Jaccard similarity = 2/5 = 0.4
Jaccard distance = 0.6
```

### Edit distance（Levenshtein 距离）

Levenshtein edit distance 是插/删/替换将一个字符串化成另一个的最少次数；kitten→sitting 为 3，经 DP 计算，应用于 spell check、DNA（可加权）、fuzzy match 和脏文本去重。

```
"kitten" -> "sitting"

kitten -> sitten  (substitute k -> s)
sitten -> sittin  (substitute e -> i)
sittin -> sitting (insert g)

Edit distance = 3
```

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

### KL 散度（不是距离，但常这样使用）

KL(P||Q)=sum p log(p/q) 不对称且不满足 triangle，故是 divergence 非 metric；forward KL mode-covering、reverse KL mode-seeking，用于 VAE、distillation、RLHF/policy constraint。

```
D_KL(P || Q) = sum(p(x) * log(p(x) / q(x)))
```

```
D_KL(P || Q) != D_KL(Q || P)
```

### Wasserstein 距离（Earth Mover 距离）

Wasserstein/earth mover 是移动质量的最小 work，1D W1=积分 |CDF_P-CDF_Q| dx；它对称、满足 triangle，即使无重叠仍有限梯度，如 P=[1,0,0,0,0]、Q=[0,0,0,0,1] 时 KL=inf、W=4；用于 WGAN、optimal transport、histogram retrieval。

```
W(P, Q) = inf over all transport plans gamma of E[d(x, y)]
```

```
W_1(P, Q) = integral |CDF_P(x) - CDF_Q(x)| dx
```

```
Distributions with no overlap:

P: [1, 0, 0, 0, 0]    Q: [0, 0, 0, 0, 1]

KL divergence: infinity (log of zero)
Wasserstein: 4 (move all mass 4 bins)

Wasserstein gives a meaningful gradient. KL does not.
```

### 为什么不同任务需要不同距离

距离的选择要匹配数据类型和任务目标：图像像素、稀疏集合、文本序列、嵌入和概率分布各自需要不同的不变量。

### 与损失函数的连接

回归常最小化 L1 或 L2 残差；分类交叉熵、度量学习的对比损失也都在定义何种差异应被惩罚。

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

L1 正则促进稀疏，L2 正则限制权重大小；二者分别以不同范数约束参数空间。

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

### 最近邻搜索

在大规模嵌入库中，近似最近邻索引以选定的距离或相似度快速返回候选，再进行精确排序。

文本用 cosine；像素 L2；稀疏高维 L1；集合 Jaccard；字符串 edit；异常 Mahalanobis；分布 KL；GAN Wasserstein；embedding cosine/dot；推荐 dot；DNA weighted edit；制造 L-inf。loss 是 prediction-target 的距离：MSE L2²，MAE L1，Huber 小误差 L2/大误差 L1，CE/KL 分布失配，hinge margin，triplet/contrastive 通常 L2。

exact nearest neighbor 对 n 个 d 维点每 query O(nd)。ANN 用微小精度换速度：KD-tree（低维）、ball tree（中维）、LSH（near duplicate）、HNSW（FAISS/Qdrant/Weaviate 的分层 small-world graph）、IVF（billion scale）、product quantization（压缩向量）。HNSW 由稀疏顶层长跳、稠密底层短跳构成。

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

```figure
norm-unit-balls
```

## Build It

### 步骤 1：实现全部范数与距离函数

参见 `code/distances.py` 的完整实现；每个函数只用基础 Python 数学运算从零构建。

### 步骤 2：同一数据、不同距离、不同近邻

`distances.py` 创建数据集和查询点，展示 L1、L2、cosine 等度量会选出不同的最近邻。

### 步骤 3：Embedding 相似度搜索

模拟 embedding 检索，比较 cosine 相似度与 L2 距离产生的排序差异。

## Use It

向量数据库实作将 embedding L2 归一化后计算 query 与存储向量的 cosine/dot，ANN 避免全扫描。

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

当调用 `model.encode(text)` 后检索，这正是底层过程。上面的示例按行归一化 1,000 个 768 维 embedding、构造相似度矩阵、排除查询自身并取前五名。练习：(1) 计算 `(1,2,3)` 和 `(4,0,6)` 的 L1/L2/L∞ 并证明 `L∞<=L2<=L1`；(2) 构造 high cosine/large L2 与 low cosine/small L2；(3) 让 L1/L2/cosine/Mahalanobis 四者选不同 NN；(4) 手算两组离散 CDF Wasserstein；(5) 100 随机集合比较 50/100/200 hash MinHash 的 Jaccard 误差。

## Exercises

1. 计算 `(1,2,3)` 与 `(4,0,6)` 的 L1、L2、L∞，并证明任意点对都满足 `L∞≤L2≤L1`。
2. 构造 cosine>0.9 但 L2>10 的向量，再构造 cosine<0.3 但 L2<0.5 的向量，并解释几何原因。
3. 实现函数，分别按 L1、L2、cosine、Mahalanobis 返回数据集最近邻，找出四者结果全不同的数据集。
4. 用 CDF 手算 `[0.5,0.5,0,0]` 与 `[0,0,0.5,0.5]`、以及均匀分布与后者的 Wasserstein 距离，比较大小并说明原因。
5. 实现 MinHash 近似 Jaccard；生成 100 个随机集合，使用 50、100、200 个哈希函数比较误差并绘图。

## Key Terms

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

## Further Reading

- [FAISS：高效相似度搜索库](https://github.com/facebookresearch/faiss)——Meta 的大规模 ANN 库。
- [Wasserstein GAN](https://arxiv.org/abs/1701.07875)——将 Earth Mover 距离引入 GAN 的论文。
- [Locality-Sensitive Hashing](https://dl.acm.org/doi/10.1145/276698.276876)——经典 ANN 算法。
- [Word2Vec](https://arxiv.org/abs/1301.3781)——embedding 中 cosine 相似度的代表性工作。
- [sklearn.neighbors 文档](https://scikit-learn.org/stable/modules/neighbors.html)——距离度量与近邻算法实践指南。
