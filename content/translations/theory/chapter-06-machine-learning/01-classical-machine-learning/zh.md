---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 06 - machine learning/01. classical machine learning.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: c6006efac1536fd074e17c3c5dea9781c0e5c44c3780f7448bbc2e11918e7f54
status: reviewed
---
# 传统机器学习

*传统的机器学习算法通过数据学习模式，而不是被显式编程规则指导。它们使用闭合形式解或启发式搜索，而不是梯度下降。本文件涵盖了朴素贝叶斯、k-NN、决策树、随机森林、SVMs、K均值聚类和PCA等算法*

- 机器学习是研究通过数据改进性能的算法，而不是被显式编程规则指导。你不需要编写“如果收入超过5万美元且年龄小于30岁，则批准贷款”的代码，而是将成千上万过去的贷款决策交给算法，让其自己找出模式。

- 机器学习有三种主要范式。**监督学习**使用带有已知正确输出的标记数据，这意味着每个输入都有一个已知的正确输出。算法从输入映射到输出。**无监督学习**处理未标记数据，并尝试发现隐藏结构，如簇或压缩表示。**强化学习**通过试错来学习，环境中的行动会收到奖励或惩罚（在文件04中讨论）。

- 在监督学习中，**分类**预测离散类别（垃圾邮件或不是垃圾邮件、猫或狗）而**回归**预测连续值（房屋价格、明天的温度等）。边界并不总是明确：逻辑回归被称为“回归”，但实际上它进行分类。生成模型更灵活但训练起来往往更困难；当数据足够多时，判别性模型通常给出更好的分类准确性。

- 生成概率模型和判别性概率模型之间的关键区别在于**生成 vs判别**。生成模型学习联合分布$P(x, y)$，这意味着它理解数据本身是如何生成的。它可以产生新样本。判别性模型直接学习$P(y \mid x)$，专注于类别的边界。朴素贝叶斯是生成模型；逻辑回归（文件02）是判别性模型。生成模型更灵活但训练起来往往更困难；判别性模型通常在数据足够多时给出更好的分类准确性。

- **朴素贝叶斯**是最简单和最有效的分类器之一。它直接应用贝叶斯定理（第05章）：

$$P(C_k \mid x) = \frac{P(x \mid C_k) \, P(C_k)}{P(x)}$$
- “朴素”部分是一个强独立假设：它将每个特征视为在类别的条件下独立的。如果你正在对电子邮件进行垃圾邮件分类，朴素贝叶斯假设“免费”一词的存在与“赢家”一词的存在没有关系，一旦你知道电子邮件是垃圾邮件。这在现实中几乎总是不正确的，但这个分类器仍然工作得很好。

- 由于$P(x)$对于所有类都是相同的，分类简化为选择使分子最大的类：

$$\hat{y} = \arg\max_{k} \; P(C_k) \prod_{i=1}^{n} P(x_i \mid C_k)$$
- 先验概率$P(C_k)$只是每个类中训练示例的分数。似然值$P(x_i \mid C_k)$取决于你拥有的特征类型，这导致了三种常见的变体。

- 多项式朴素贝叶斯适用于计数数据，如文档中单词的频率。每个特征 $x_i$ 表示单词 $i$ 出现的次数，其概率遵循多项式分布。这是文本分类、情感分析和垃圾邮件过滤的标准选择。

- **高斯朴素贝叶斯**假设每个特征在每个类中遵循正态分布。你从训练数据中估计出类 $k$ 中特征 $i$ 的均值 $\mu_{ik}$ 和方差 $\sigma_{ik}^2$，然后计算：

$$P(x_i \mid C_k) = \frac{1}{\sqrt{2\pi\sigma_{ik}^2}} \exp\!\left(-\frac{(x_i - \mu_{ik})^2}{2\sigma_{ik}^2}\right)$$
- 这是当你需要处理连续测量值时的最佳选择，例如身高、体重或传感器读数。

![两个重叠的高斯类条件分布，决策边界处后验概率交叉](../images/naive_bayes_classify.svg)


- 贝叶斯朴素模型适用于二进制特征：每个特征要么存在（1），要么不存在（0）。我们只跟踪一个单词是否出现。这种方法对于短文本或二进制特征向量非常有效。

- 在训练数据中，某个特征值从未与某一类一起出现时，会出现一个概率为零的问题。因为所有项都相乘，整个后继结果会坍塌到零。**拉普拉斯平滑**通过在每个特征类别组合上添加一个小计数（通常为1）来解决这个问题：

$$P(x_i \mid C_k) = \frac{\text{count}(x_i, C_k) + \alpha}{\text{count}(C_k) + \alpha \cdot V}$$
- $\alpha$ 是平滑参数（通常是 1），$V$ 是该特征可能的值的数量。这确保了没有任何概率会恰好为零。

- **决策树**采用截然不同的方法。它们通过一系列的“是”或“否”问题来分割特征空间。想象一下二十个问题的游戏：在每次步骤中，你问的问题能够最有效地缩小可能性范围。

- 树从根开始，包含所有训练示例。在每个内部节点，它选择一个特征和阈值进行分割（例如，“年龄小于30？”）。示例根据答案流向左或右。这继续递归地进行，直到叶子，其中包含预测：分类时的多数类，或回归时的平均值。

![决策树，深度为2，特征分裂，Yes/No分支，颜色标记的叶子节点显示类别预测。](../images/decision_tree_split.svg)


- 你首先要回答的问题是：应该在哪个特征上进行切分？你需要切分出的子节点尽可能纯净，其中大多数例子都属于同一个类别。两种常见的纯度指标是 **基尼不纯度** 和 **熵**。

- **基尼不纯度**衡量随机选择样本被错误分类的概率，如果根据该节点的分布进行标签。

$$\text{Gini}(S) = 1 - \sum_{k=1}^{K} p_k^2$$
- 如果一个节点完全纯（所有都是同一类），基尼指数为0。如果两个类的平衡情况相同（例如50/50），基尼指数达到其最大值0.5。

- 熵（从第05章的信息论部分）衡量的是平均惊讶程度。

$$H(S) = -\sum_{k=1}^{K} p_k \log_2 p_k$$
- 纯节点的熵为0。完全平衡二叉节点的熵为1比特。在实践中，基尼和熵给出非常相似的树；基尼稍快于计算，因为它避免了对数运算。

- 信息增益是通过分裂实现的纯度减少。对于一个将集合 $S$ 分割成子集 $S_L$ 和 $S_R$ 的分裂：

$$\text{IG}(S, \text{split}) = H(S) - \frac{|S_L|}{|S|} H(S_L) - \frac{|S_R|}{|S|} H(S_R)$$
- 算法在每个节点上贪婪地选择信息增益最高的分割。这是一个局部最优策略，而不是全局最优策略，但在实践中效果很好。

- **回归树**的工作方式相同，但叶子预测一个连续值（到达该叶子的示例的平均值），而分裂标准使用方差减少而不是基尼或熵。

- 如果不加以控制，决策树会一直分裂到每个叶子都纯化为止，从而严重过拟合。**剪枝**可以解决这个问题。预剪枝在生长树之前设置限制：最大深度、最小叶子样本数或最小信息增益来决定是否进行分割。后剪枝首先生长完整的树，然后从验证集性能的角度删除那些没有改善的分支。

- 单个决策树易于解释，但容易不稳定：数据的微小变化可能导致产生非常不同的树。 **集成方法**通过结合许多模型来获得比任何单个模型更好的预测效果。

- 核心思想是“众人智慧”。如果向100个 mediocre分类器征求多数意见，集成方法可以非常优秀，只要这些个体分类器在某种程度上做出独立的错误。

- **袋装法**（Bootstrap聚合）通过在数据的不同随机子集上训练多个模型，使用有放回抽样（bootstrap样本）。每个模型大约看到原始数据的63%。在预测时，您会平均输出（回归）或进行多数投票（分类）。由于每个模型看到不同的数据，它们犯了不同的错误，平均消除了大部分的方差。

- **随机森林**是将决策树应用到袋装方法上的一种技术，但有一个额外的 twists：在每次分裂时，树只考虑一个随机选择的特征（通常从 $\sqrt{d}$ 个特征中选择 $d$ 个）。这进一步降低了树之间的相关性，使得集成模型更加强大。随机森林是机器学习领域最可靠的一种分类器之一。

![并行训练bagging模型，平均结果；sequential训练boosting模型，纠正错误](../images/ensemble_methods.svg)


- 增强学习（Boosting）采取了与传统方法相反的策略。它不是独立地训练模型，而是逐个训练它们，并且每个新模型都专注于上一个模型错误处理的示例。

- **AdaBoost**（自适应提升）为每个训练示例维护一个权重。初始时，所有权重都相等。在训练弱学习器（通常是一个非常浅的决策树，称为“基元”）后，被错误分类的示例得到更高的权重，因此下一个学习器会更关注它们。最终预测是所有学习器的加权投票，其中表现更好的学习器获得更多的发言权：

$$H(x) = \text{sign}\!\left(\sum_{t=1}^{T} \alpha_t \, h_t(x)\right)$$
- 学习器 $t$ 的权重 $\alpha_t$ 依赖于其错误率 $\epsilon_t$：

$$\alpha_t = \frac{1}{2} \ln\!\left(\frac{1 - \epsilon_t}{\epsilon_t}\right)$$
- 错误率低的学习器得到较大的正向权重；表现与随机（$\epsilon = 0.5$）相同的学习器得到零权重。

- **梯度提升**一般化了这个想法。相反，每个新模型被训练来预测当前组合中所有模型的残差误差（损失函数负梯度）。对于平方误差损失，残差是实际值与预测值之间的差异。使用决策树进行梯度提升（GBDT）的方法在结构化数据竞赛中取得了许多胜利（XGBoost、LightGBM和CatBoost等流行实现）。

- 关键对比：袋装方法通过平均噪声来减少方差，而提升方法通过纠正系统性错误来减少偏差。袋装方法最适合那些个体模型过拟合的情况；提升方法最适合那些它们欠拟合的情况。

- 将学习方式转向无监督学习，**K-Means聚类**是最简单且最广泛使用的聚类算法。给定$n$个数据点和一个目标的簇数$K$，它将每个点分配到其中一个$K$组，通过最小化每个点到其簇中心的距离来实现。

- 算法交替进行两个步骤。首先，将每个点分配给最近的质心。然后，更新每个质心为所有被分配到它的点的平均值。重复直到分配不再改变。这保证了收敛性，因为总簇内距离在每次迭代中减少（或保持不变）。

![二维散点图，三个不同颜色的簇、中心标记和虚线边界](../images/kmeans_clustering.svg)


- 从形式上讲，K-means通过最小化每个簇内的平方和来实现，这个值被称为**惯性**：

$$J = \sum_{k=1}^{K} \sum_{x \in C_k} \|x - \mu_k\|^2$$
- $\mu_k$ 是 $C_k$ 集群的质心。

- K-means对初始值非常敏感。如果起始中心不好，可能会导致局部最小值不佳。K-Means++的初始化策略首先随机选择第一个中心，然后为每个后续中心选择概率与其最近现有中心距离平方成正比的概率。这会将初始中心分布得更均匀，并几乎总是给出更好的结果。

- 如何选择 $K$？两种常见的工具。肘部方法在 $K$ 与惯性之间绘制图表，并寻找“肘部”位置，即添加更多簇不再显著改善的地方。轮廓分数衡量一个点与其自身簇相比与其他最近簇的相似程度，范围从 -1（错误簇）到 +1（很好地聚类）。所有点的轮廓分数平均值给出一个整体的集群质量度量。

- K-means存在局限性：它假设簇是大致相等大小的球形，且每个点都恰好属于一个簇。**高斯混合模型（GMM）**放松了这两个限制。

- GMM模型将数据视为由多个$K$高斯分布混合而成，每个分布都有自己的均值$\mu_k$、协方差$\Sigma_k$和混合权重$\pi_k$（这些权重之和为1）。

$$P(x) = \sum_{k=1}^{K} \pi_k \, \mathcal{N}(x \mid \mu_k, \Sigma_k)$$
- 不像硬分配，每个点都得到一个**软分配**：它属于每个集群的概率（称为“责任”）。靠近两个高斯分布边界附近的点可能有60%的几率属于A簇和40%的几率属于B簇。

- GMMs使用EM算法拟合，该算法交替执行两个步骤，类似于K-Means。E步计算每个点来自每个高斯的概率。M步更新参数：给定这些责任，最佳均值、协方差和混合权重是什么？EM每次迭代时都会增加数据似然，并收敛到局部最大值。

- K-means实际上是一个GMMs的特殊情况，它对应于半径相同的高斯分布和硬（0/1）责任。

- 支持向量机（SVMs）从几何角度来处理分类问题。给定两个线性可分的类，有无数个超平面可以将它们分开。SVM找到具有最大间隔的超平面，即两个类中最近数据点到超平面的最大距离。

- 最近的点，那些正好位于边缘上的点，被称为 **支持向量**。它们是定义边界的关键点；你可以移除所有其他训练点而得到相同的超平面。

![由最大间隔超平面分隔的两个类，带边缘和圈出的支持向量](../images/svm_margin.svg)


- 对于线性分类器 $f(x) = w \cdot x + b$，找到最大间隔意味着解：

$$\min_{w, b} \; \frac{1}{2}\|w\|^2 \quad \text{subject to} \quad y_i(w \cdot x_i + b) \geq 1 \; \text{for all } i$$
- 这是一个凸二次规划，因此它只有一个全局解（不需要担心局部最小值）。

- 实际数据通常无法完全分离。软间隔支持向量机通过引入松弛变量允许一些点违反边界。 $\xi_i \geq 0$。

$$\min_{w, b, \xi} \; \frac{1}{2}\|w\|^2 + C \sum_{i=1}^{n} \xi_i \quad \text{subject to} \quad y_i(w \cdot x_i + b) \geq 1 - \xi_i$$
- 超参数 $C$ 控制了这个 trade： $C$ 大的惩罚错误分类（更紧密的拟合，过拟合的风险）， $C$ 小的允许更多的违规（更大的容差，更正则化）。

- SVMs的最强大特性是核技巧。许多在原始特征空间中不是线性可分的数据集，在映射到更高维度空间后变得可分。核技巧允许你在高维空间中计算点积，而无需实际执行变换。

- 核函数 $K(x_i, x_j) = \phi(x_i) \cdot \phi(x_j)$ 将SVM优化中的每个点积替换为。最流行的核是径向基函数（RBF）核：

$$K(x_i, x_j) = \exp\!\left(-\gamma \|x_i - x_j\|^2\right)$$
- RBF核隐式地将数据映射到无限维空间。参数$\gamma$控制单个训练点的影响范围：$\gamma$较大时，每个点只影响其邻近区域（过拟合风险），$\gamma$较小则给出平滑边界。

- 其他常见的核函数包括多项式核 $K(x_i, x_j) = (x_i \cdot x_j + c)^d$ 和线性核 $K(x_i, x_j) = x_i \cdot x_j$（即标准的 SVM，没有任何变换）。

- 在实践中，使用RBF核的SVM是主流分类器，直到深度学习崛起。它们仍然在处理小到中等大小的数据集时表现良好，尤其是在特征数量相对于样本数量较多的情况下。

- SVM与第02章（矩阵）的联系非常紧密。优化通常是通过其对偶形式解决的，其中解仅依赖于训练示例之间的点积，这正是使核技巧成为可能的关键。整个算法在内积和线性代数的语言中进行操作。

- 总结经典机器学习工具包：

| 算法 | 类型 | 主要优势 | 主要劣势 |
|---|---|---|---| 高斯贝叶斯 | 监督学习（生成模型） | 计算速度快，处理少量数据能力强 | 假设独立性 |
| 决策树 | 监督学习 | 易于解释 | 容易过拟合 |
| 随机森林 | 监督学习（集成） | 稳健，参数较少 | 不那么易于解释 |
| 梯度提升 | 监督学习（集成） | 在表格数据上处于领先地位 | 更慢，需要更多调整 |
| K-means | 无监督学习（聚类） | 简单，可扩展 | 假设球形簇 |
| GMM | 无监督（聚类） | 软分配，灵活形状 | 初期化敏感 |
| SVM | 监督学习 | 在高维有效 | 大数据集上慢速 |

## 编程任务（使用 CoLab 或 笔记本）

1. 实现从头开始的高斯朴素贝叶斯。使用两个类别的合成二维数据进行训练，并可视化决策边界。与 scikit-learn 的实现进行比较。
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt
from sklearn.datasets import make_classification

# Generate synthetic data
X, y = make_classification(n_samples=300, n_features=2, n_redundant=0,
                           n_informative=2, n_clusters_per_class=1, random_state=42)
X, y = jnp.array(X), jnp.array(y)

# Fit Gaussian Naive Bayes from scratch
classes = jnp.unique(y)
params = {}
for c in classes:
    c = int(c)
    mask = y == c
    X_c = X[mask]
    params[c] = {
        'mean': jnp.mean(X_c, axis=0),
        'var': jnp.var(X_c, axis=0),
        'prior': jnp.sum(mask) / len(y)
    }

def gaussian_log_likelihood(x, mean, var):
    return -0.5 * jnp.sum(jnp.log(2 * jnp.pi * var) + (x - mean)**2 / var)

def predict(X):
    preds = []
    for x in X:
        log_posts = []
        for c in [0, 1]:
            log_post = jnp.log(params[c]['prior']) + gaussian_log_likelihood(
                x, params[c]['mean'], params[c]['var'])
            log_posts.append(log_post)
        preds.append(jnp.argmax(jnp.array(log_posts)))
    return jnp.array(preds)

# Decision boundary visualisation
xx, yy = jnp.meshgrid(jnp.linspace(X[:,0].min()-1, X[:,0].max()+1, 200),
                       jnp.linspace(X[:,1].min()-1, X[:,1].max()+1, 200))
grid = jnp.column_stack([xx.ravel(), yy.ravel()])
zz = predict(grid).reshape(xx.shape)

plt.figure(figsize=(8, 6))
plt.contourf(xx, yy, zz, alpha=0.3, cmap='coolwarm')
plt.scatter(X[y==0, 0], X[y==0, 1], c='#3498db', label='Class 0', edgecolors='k', s=20)
plt.scatter(X[y==1, 0], X[y==1, 1], c='#e74c3c', label='Class 1', edgecolors='k', s=20)
plt.title("Gaussian Naive Bayes Decision Boundary")
plt.legend()
plt.grid(alpha=0.3)
plt.show()

accuracy = jnp.mean(predict(X) == y)
print(f"Training accuracy: {accuracy:.2%}")
```

2. 构建一个使用基尼不纯度分裂的决策树。实现单个节点的分裂逻辑，并展示信息增益如何选择最佳特征和阈值。
```python
import jax.numpy as jnp

def gini_impurity(y):
    """Gini impurity of a label array."""
    classes, counts = jnp.unique(y, return_counts=True)
    probs = counts / len(y)
    return 1.0 - jnp.sum(probs ** 2)

def information_gain(y, left_mask):
    """IG from splitting y into left/right by boolean mask."""
    parent_gini = gini_impurity(y)
    left_y, right_y = y[left_mask], y[~left_mask]
    n = len(y)
    if len(left_y) == 0 or len(right_y) == 0:
        return 0.0
    child_gini = (len(left_y)/n) * gini_impurity(left_y) + \
                 (len(right_y)/n) * gini_impurity(right_y)
    return float(parent_gini - child_gini)

def best_split(X, y):
    """Find the feature and threshold that maximise information gain."""
    best_ig, best_feat, best_thresh = -1, None, None
    for feat in range(X.shape[1]):
        thresholds = jnp.unique(X[:, feat])
        for thresh in thresholds:
            mask = X[:, feat] <= float(thresh)
            ig = information_gain(y, mask)
            if ig > best_ig:
                best_ig, best_feat, best_thresh = ig, feat, float(thresh)
    return best_feat, best_thresh, best_ig

# Example: synthetic data
from sklearn.datasets import make_classification
X, y = make_classification(n_samples=100, n_features=4, n_redundant=0, random_state=0)
X, y = jnp.array(X), jnp.array(y)

feat, thresh, ig = best_split(X, y)
print(f"Best split: feature {feat}, threshold {thresh:.3f}, info gain {ig:.4f}")
print(f"Parent Gini: {gini_impurity(y):.4f}")
mask = X[:, feat] <= thresh
print(f"Left Gini:   {gini_impurity(y[mask]):.4f} ({int(jnp.sum(mask))} samples)")
print(f"Right Gini:  {gini_impurity(y[~mask]):.4f} ({int(jnp.sum(~mask))} samples)")
```

3. 实现从头开始的K-Means算法，并使用K-Means++初始化。对一个合成数据集进行聚类，并在每次迭代中可视化簇状分布。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt
from sklearn.datasets import make_blobs

# Generate synthetic clusters
X, y_true = make_blobs(n_samples=300, centers=4, cluster_std=0.8, random_state=42)
X = jnp.array(X)

def kmeans_plus_plus_init(X, K, key):
    """K-Means++ initialisation."""
    n = X.shape[0]
    idx = jax.random.randint(key, (), 0, n)
    centroids = [X[idx]]
    for _ in range(1, K):
        dists = jnp.min(jnp.stack([jnp.sum((X - c)**2, axis=1) for c in centroids]), axis=0)
        probs = dists / jnp.sum(dists)
        key, subkey = jax.random.split(key)
        idx = jax.random.choice(subkey, n, p=probs)
        centroids.append(X[idx])
    return jnp.stack(centroids)

def kmeans(X, K, max_iters=20, key=jax.random.PRNGKey(0)):
    centroids = kmeans_plus_plus_init(X, K, key)
    history = [centroids]
    for _ in range(max_iters):
        # Assign step
        dists = jnp.stack([jnp.sum((X - c)**2, axis=1) for c in centroids])
        labels = jnp.argmin(dists, axis=0)
        # Update step
        new_centroids = jnp.stack([
            jnp.mean(X[labels == k], axis=0) for k in range(K)
        ])
        history.append(new_centroids)
        if jnp.allclose(centroids, new_centroids):
            break
        centroids = new_centroids
    return labels, centroids, history

K = 4
labels, centroids, history = kmeans(X, K)

# Plot final result
colors = ['#3498db', '#e74c3c', '#27ae60', '#9b59b6']
plt.figure(figsize=(8, 6))
for k in range(K):
    mask = labels == k
    plt.scatter(X[mask, 0], X[mask, 1], c=colors[k], s=20, alpha=0.6)
    plt.scatter(centroids[k, 0], centroids[k, 1], c=colors[k], marker='X',
                s=200, edgecolors='k', linewidths=1.5)
plt.title(f"K-Means Clustering (K={K}, {len(history)-1} iterations)")
plt.grid(alpha=0.3)
plt.show()

# Compute inertia
inertia = sum(jnp.sum((X[labels == k] - centroids[k])**2) for k in range(K))
print(f"Final inertia: {inertia:.2f}")
```

4. 展示核技巧。通过比较RBF核矩阵与显式特征映射来说明，RBF核在高维空间中计算点积。
```python
import jax.numpy as jnp

# Simple 2D data
X = jnp.array([[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]])

# Polynomial kernel: K(x,y) = (x·y + 1)^2
def poly_kernel(X, degree=2, c=1.0):
    return (X @ X.T + c) ** degree

# Explicit degree-2 feature map for 2D: (1, sqrt(2)*x1, sqrt(2)*x2, x1^2, x2^2, sqrt(2)*x1*x2)
def poly_features(X):
    x1, x2 = X[:, 0], X[:, 1]
    return jnp.column_stack([
        jnp.ones(len(X)),
        jnp.sqrt(2) * x1,
        jnp.sqrt(2) * x2,
        x1 ** 2,
        x2 ** 2,
        jnp.sqrt(2) * x1 * x2
    ])

K_trick = poly_kernel(X)
phi = poly_features(X)
K_explicit = phi @ phi.T

print("Kernel trick (polynomial degree 2):")
print(K_trick)
print("\nExplicit feature map dot products:")
print(K_explicit)
print(f"\nMatrices match: {jnp.allclose(K_trick, K_explicit)}")

# RBF kernel: no finite explicit map exists
def rbf_kernel(X, gamma=0.5):
    sq_dists = jnp.sum(X**2, axis=1, keepdims=True) + \
               jnp.sum(X**2, axis=1) - 2 * X @ X.T
    return jnp.exp(-gamma * sq_dists)

K_rbf = rbf_kernel(X)
print("\nRBF kernel matrix:")
print(K_rbf)
print("Diagonal is always 1 (a point is identical to itself)")
print("Off-diagonal entries decay with distance")
```
