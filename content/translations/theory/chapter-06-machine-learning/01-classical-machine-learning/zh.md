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

*传统机器学习算法从数据中学习模式，而不是依赖人工编写的规则；它们通常使用闭式解或启发式搜索，而非梯度下降。本文介绍朴素贝叶斯、决策树、随机森林、SVM、K-Means 聚类等方法。*

**编者注：**导语还列出 k-NN 和 PCA，但正文没有介绍这两种方法。

- 机器学习是研究通过数据改进性能的算法，而不是被显式编程规则指导。你不需要编写“如果收入超过5万美元且年龄小于30岁，则批准贷款”的代码，而是将成千上万过去的贷款决策交给算法，让其自己找出模式。

- 机器学习有三种主要范式。**监督学习**使用带标签的数据，即每个输入都对应已知的正确输出，算法据此学习从输入到输出的映射。**无监督学习**处理未标记数据，尝试发现其中的结构，例如簇或压缩表示。**强化学习**通过试错来学习，并根据智能体在环境中采取的行动获得奖励或惩罚（见文件 04）。

- 在监督学习中，**分类**预测离散类别（垃圾邮件或非垃圾邮件、猫或狗），而**回归**预测连续值（房价、明天的气温）。界限并不总是清晰：逻辑回归名为“回归”，但实际执行的是分类。

- 概率模型的一个关键区分是**生成式与判别式**。生成模型学习联合分布 $P(x, y)$，也就是理解数据本身如何生成，因此可以生成新样本。判别模型直接学习 $P(y \mid x)$，只关注类别之间的边界。朴素贝叶斯是生成模型；逻辑回归（文件 02）是判别模型。生成模型更灵活但更难训练好；数据足够时，判别模型通常能得到更高的分类准确率。

- **朴素贝叶斯**是最简单和最有效的分类器之一。它直接应用贝叶斯定理（第05章）：

$$P(C_k \mid x) = \frac{P(x \mid C_k) \, P(C_k)}{P(x)}$$
- “朴素”指一个很强的条件独立假设：给定类别后，每个特征彼此独立。如果要把邮件分类为垃圾邮件，朴素贝叶斯会假设：一旦知道邮件是垃圾邮件，“免费”一词是否出现与“赢家”一词是否出现无关。现实中这几乎从不成立，但该分类器的效果仍出人意料地好。

- 由于 $P(x)$ 对所有类别都相同，分类时只需选择使分子最大的类别：

$$\hat{y} = \arg\max_{k} \; P(C_k) \prod_{i=1}^{n} P(x_i \mid C_k)$$
- 先验概率 $P(C_k)$ 是类别 $C_k$ 在训练数据中的比例。似然 $P(x_i \mid C_k)$ 取决于特征类型，由此得到三种常见变体。

- 多项式朴素贝叶斯适用于计数数据，如文档中单词的频率。每个特征 $x_i$ 表示单词 $i$ 出现的次数，其概率遵循多项式分布。这是文本分类、情感分析和垃圾邮件过滤的标准选择。

- **高斯朴素贝叶斯**假设每个特征在每个类中遵循正态分布。你从训练数据中估计出类 $k$ 中特征 $i$ 的均值 $\mu_{ik}$ 和方差 $\sigma_{ik}^2$，然后计算：

$$P(x_i \mid C_k) = \frac{1}{\sqrt{2\pi\sigma_{ik}^2}} \exp\!\left(-\frac{(x_i - \mu_{ik})^2}{2\sigma_{ik}^2}\right)$$
- 当特征是身高、体重或传感器读数等连续测量值时，这是自然的选择。

![两个重叠的高斯类条件分布，决策边界处后验概率交叉](../images/naive_bayes_classify.svg)


- **伯努利朴素贝叶斯**适用于二元特征：每个特征要么存在（1），要么不存在（0）。我们只记录一个词是否出现。这种方法对短文本或二元特征向量很有效。

- 如果训练数据中某个特征值从未与某一类别同时出现，其似然就会变为零；由于各特征似然相乘，该类别的得分也会归零。**拉普拉斯平滑**通过为每个特征值与类别的组合添加一个小计数（通常为 1）来解决这个问题：

$$P(x_i \mid C_k) = \frac{\text{count}(x_i, C_k) + \alpha}{\text{count}(C_k) + \alpha \cdot V}$$
- $\alpha$ 是平滑参数（通常是 1），$V$ 是该特征可能的值的数量。这确保了没有任何概率会恰好为零。

- **决策树**采用了不同的方法：通过一系列“是”或“否”的问题划分特征空间。想象“二十个问题”游戏，每一轮都提出最能缩小可能范围的问题。

- 树从包含全部训练样本的根节点开始。在每个内部节点，算法选择一个特征和阈值进行划分（例如“年龄是否小于 30？”），再根据答案将样本分到左侧或右侧。这个过程递归进行，直到叶节点输出预测：分类树输出多数类，回归树输出均值。

![决策树：深度为 2，按特征分裂，Yes/No 分支和带颜色的类别预测叶节点。](../images/decision_tree_split.svg)


- 关键问题是：应该在哪个特征上切分？我们希望切分后的子节点尽可能“纯”，即大多数样本属于同一类别。两种常见的不纯度指标是 **基尼不纯度** 和 **熵**。

- **基尼不纯度**衡量：按照节点分布随机选择一个样本并分类时，样本被错误分类的概率。

$$\text{Gini}(S) = 1 - \sum_{k=1}^{K} p_k^2$$
- 如果一个节点完全纯（所有样本都属于同一类），基尼不纯度为 0。如果两个类别比例相同（例如 50/50），基尼不纯度达到最大值 0.5。

- **熵**（见第 5 章的信息论部分）衡量类别分布的不确定性，也就是平均自信息：

$$H(S) = -\sum_{k=1}^{K} p_k \log_2 p_k$$
- 纯节点的熵为 0。完全平衡的二元节点熵为 1 比特。在实践中，基尼不纯度和熵生成的树非常相似；基尼不纯度避免了对数运算，因此计算稍快。

- **信息增益**是通过切分实现的不纯度减少。对于将集合 $S$ 划分为子集 $S_L$ 和 $S_R$ 的切分：

$$\text{IG}(S, \text{split}) = H(S) - \frac{|S_L|}{|S|} H(S_L) - \frac{|S_R|}{|S|} H(S_R)$$
- 算法在每个节点上贪婪地选择信息增益最高的分割。这是一个局部最优策略，而不是全局最优策略，但在实践中效果很好。

- **回归树**的工作方式相同，但叶子预测一个连续值（到达该叶子的示例的平均值），而分裂标准使用方差减少而不是基尼或熵。

- 如果不加限制，决策树会不断划分，直到每个叶节点都纯为止，因而严重过拟合。**剪枝**可以缓解这个问题。预剪枝在建树前设置限制，例如最大深度、叶节点最小样本数或分裂所需的最小信息增益。后剪枝先建成完整的树，再根据验证集表现删除无益的分支。

- 单个决策树易于解释，但往往不稳定：数据的微小变化就可能产生完全不同的树。**集成方法**把许多模型结合起来，取得比任何单个模型更好的预测。

- 核心思想是“众人智慧”。即使 100 个一般的分类器各自只有中等表现，只要它们的错误有一定独立性，集成后的多数投票也可能很强。

- **装袋法**（bagging，自助聚合）从训练数据中有放回地抽样，形成多个自助样本，并用它们分别训练模型。每个模型通常会看到约 63% 的不同训练样本。预测时，对输出取平均（回归）或多数投票（分类）。各模型使用的数据不同，因而会犯不同的错误；汇总预测可以抵消部分方差。

- **随机森林**把决策树用于装袋法，并增加一个变化：每次分裂只考虑随机选取的一部分特征（通常从 $d$ 个特征中选取 $\sqrt{d}$ 个）。这进一步降低了树之间的相关性，使集成更强。随机森林是机器学习中较可靠的现成分类器之一。

![并行训练装袋模型并平均结果；依次训练提升模型并纠正错误](../images/ensemble_methods.svg)


- **提升（Boosting）**采取了相反的策略。它不独立训练模型，而是依次训练；每个新模型都重点处理前一个模型分类错误的样本。

- **AdaBoost**（自适应提升）为每个训练样本维护一个权重。初始时所有权重相等。训练弱学习器（通常是很浅的决策树，称为“决策树桩”）后，提高被错误分类样本的权重，使下一个学习器更关注它们。最终预测是所有学习器的加权投票，表现更好的学习器权重更高：

$$H(x) = \text{sign}\!\left(\sum_{t=1}^{T} \alpha_t \, h_t(x)\right)$$
- 学习器 $t$ 的权重 $\alpha_t$ 依赖于其错误率 $\epsilon_t$：

$$\alpha_t = \frac{1}{2} \ln\!\left(\frac{1 - \epsilon_t}{\epsilon_t}\right)$$
- 错误率低的学习器得到较大的正向权重；表现与随机（$\epsilon = 0.5$）相同的学习器得到零权重。

- **梯度提升**推广了这个想法。它不重新加权样本，而是让每个新模型预测当前集成模型的残差（即损失函数的负梯度）。对于平方误差损失，残差就是预测值与目标值之差。基于决策树的梯度提升（GBDT）在结构化数据竞赛中催生了许多获胜方案（XGBoost、LightGBM 和 CatBoost 都是流行实现）。

- 关键区别在于：装袋法通过平均预测降低**方差**，提升法通过逐步纠正系统性错误降低**偏差**。基模型容易过拟合时，装袋法通常更合适；基模型欠拟合时，提升法通常更合适。

- 在无监督学习中，**K-Means 聚类**是最简单、最常用的算法之一。给定 $n$ 个数据点和目标簇数 $K$，它把每个点分配到 $K$ 个簇之一，并最小化点到所属簇中心的距离平方和。

- 算法交替执行两个步骤：先将每个点分配给最近的质心，再把每个质心更新为分配给它的所有点的均值。重复这两个步骤，直到分配不再变化。每次迭代都会降低或保持簇内距离平方和，因此算法会收敛。

![二维散点图，三个不同颜色的簇、中心标记和虚线边界](../images/kmeans_clustering.svg)


- 形式上，K-Means 最小化簇内平方和，也称为**惯性**：

$$J = \sum_{k=1}^{K} \sum_{x \in C_k} \|x - \mu_k\|^2$$
- $\mu_k$ 是簇 $C_k$ 的质心。

- K-Means 对初始化很敏感。糟糕的初始质心可能导致较差的局部最小值。**K-Means++** 初始化策略先随机选择第一个质心，然后按与最近已有质心的平方距离成比例的概率选择后续质心。这样能让初始质心分散开，几乎总能得到更好的结果。

- 如何选择 $K$？有两个常用工具。**肘部法**绘制惯性随 $K$ 变化的曲线，寻找增加更多簇后改善幅度不大的“肘部”。**轮廓系数**衡量一个点与自身簇的相似度相对于它与最近其他簇的相似度，范围从 -1（分错簇）到 +1（聚类良好）。所有点的平均轮廓系数给出整体聚类质量的度量。

- K-Means 有两个局限：它假设簇大致呈大小相近的球形，并且采用“硬”分配（每个点恰好属于一个簇）。**高斯混合模型（GMM）**放宽了这两个限制。

- GMM 将数据建模为 $K$ 个高斯分布的混合，每个分布都有自己的均值 $\mu_k$、协方差 $\Sigma_k$ 和混合权重 $\pi_k$（权重之和为 1）。

$$P(x) = \sum_{k=1}^{K} \pi_k \, \mathcal{N}(x \mid \mu_k, \Sigma_k)$$
- 与硬分配不同，每个点都会得到一个**软分配**：属于每个簇的概率（称为“责任度”）。靠近两个高斯分布边界的点可能有 60% 的概率属于 A 簇、40% 的概率属于 B 簇。

- GMM 使用**期望最大化（EM）算法**拟合，并交替执行两个步骤。E 步计算责任度，即每个点来自各高斯分量的概率；M 步据此更新均值、协方差和混合权重。精确执行 E 步和 M 步时，EM 不会降低数据似然。**编者注：**似然不下降不代表每一步都严格增加，也不保证收敛到局部最大值。

- 在球形、协方差相同且方差趋近于 0 的极限下，K-Means 可视为 GMM-EM 的硬分配形式。**编者注：**原文把 K-Means 直接称为 GMM 的特殊情形，省略了这个极限条件。

- **支持向量机（SVM）**从几何角度处理分类问题。给定两个线性可分的类别，有无数个超平面可以将它们分开。SVM 找到具有**最大间隔**的超平面，即超平面与两个类别中最近数据点之间的最大可能间隙。

- 最近的点，那些正好位于边缘上的点，被称为 **支持向量**。它们是定义边界的关键点；你可以移除所有其他训练点而得到相同的超平面。

![由最大间隔超平面分隔的两个类，带边缘和圈出的支持向量](../images/svm_margin.svg)


- 对于线性分类器 $f(x) = w \cdot x + b$，若标签 $y_i \in \{-1, +1\}$，最大间隔问题可写为：

$$\min_{w, b} \; \frac{1}{2}\|w\|^2 \quad \text{满足} \quad y_i(w \cdot x_i + b) \geq 1 \; \text{对所有 } i$$
- 这是一个凸二次规划，因此其最优解是全局最优解，不会陷入较差的局部极小值。**编者注：**凸性保证全局最优，但不总能保证解唯一。

- 现实数据很少能完全分离。**软间隔 SVM** 引入松弛变量 $\xi_i \geq 0$，允许一些点违反间隔约束：

$$\min_{w, b, \xi} \; \frac{1}{2}\|w\|^2 + C \sum_{i=1}^{n} \xi_i \quad \text{满足} \quad y_i(w \cdot x_i + b) \geq 1 - \xi_i$$
- 超参数 $C$ 控制这种权衡：$C$ 较大时严厉惩罚误分类（拟合更紧，过拟合风险更高）；$C$ 较小时允许更多违反（间隔更宽，正则化更强）。

- SVM 的一个重要特点是**核技巧**。许多在原始特征空间中不可线性分离的数据集，映射到更高维空间后就可以分离。核技巧让你无需显式计算变换，就能在高维空间中计算点积。

- 核函数 $K(x_i, x_j) = \phi(x_i) \cdot \phi(x_j)$ 用于替换 SVM 优化中的点积，因此无需显式执行高维变换。最常用的核是径向基函数（RBF）核：

$$K(x_i, x_j) = \exp\!\left(-\gamma \|x_i - x_j\|^2\right)$$
- RBF 核隐式地把数据映射到无限维空间。参数 $\gamma$ 控制单个训练点的影响范围：$\gamma$ 较大时，每个点只影响邻近区域（有过拟合风险）；$\gamma$ 较小时，边界更平滑。

- 其他常见的核函数包括多项式核 $K(x_i, x_j) = (x_i \cdot x_j + c)^d$ 和线性核 $K(x_i, x_j) = x_i \cdot x_j$（即标准的 SVM，没有任何变换）。

- 在实践中，使用 RBF 核的 SVM 在深度学习兴起前曾是主流分类器。对于中小型数据集，它们现在仍表现良好，尤其是特征数相对于样本数较多时。

- SVM 与第 2 章（矩阵）的联系很深。优化通常以对偶形式求解，此时解只依赖训练样本之间的点积，这正是核技巧可行的原因。整个算法都建立在内积和线性代数之上。

- 总结经典机器学习工具包：

| 算法 | 类型 | 主要优势 | 主要劣势 |
|---|---|---|---|
| 朴素贝叶斯 | 监督学习（生成模型） | 计算快，适合少量数据 | 假设特征条件独立 |
| 决策树 | 监督学习 | 易于解释 | 容易过拟合 |
| 随机森林 | 监督学习（集成） | 稳健，参数较少 | 不易解释 |
| 梯度提升 | 监督学习（集成） | 表格数据表现强 | 训练较慢，需要更多调参 |
| K-Means | 无监督学习（聚类） | 简单、可扩展 | 假设簇呈球形 |
| GMM | 无监督学习（聚类） | 软分配，形状灵活 | 对初始化敏感 |
| SVM | 监督学习 | 高维数据有效 | 大数据集上较慢 |

## 编程任务（使用 CoLab 或 笔记本）

1. 从零实现高斯朴素贝叶斯。使用两个类别的合成二维数据训练模型并可视化决策边界，再与 scikit-learn 的实现比较。
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

3. 从零实现 K-Means 算法，并使用 K-Means++ 初始化。对合成数据集进行聚类，逐次可视化迭代过程中的簇分配。
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

4. 展示核技巧。通过比较 RBF 核矩阵和多项式核的显式特征映射，说明核函数如何计算高维空间中的点积。**编者注：**代码显式验证的是二次多项式核与特征映射的点积相等；RBF 核则展示其核矩阵，且不存在有限维的显式特征映射。
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
