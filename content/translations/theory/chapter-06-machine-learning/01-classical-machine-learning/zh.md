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

# 经典机器学习

*经典机器学习算法从数据中学习模式，不依赖显式编程，而是使用闭式解或启发式搜索，而非梯度下降。本篇涵盖朴素贝叶斯、k-NN、决策树、随机森林、SVM、k-means 聚类和 PCA。*

- 机器学习研究的是这样一类算法：它们通过从数据中学习来改进自己在某项任务上的表现，而不是由人明确编写规则。与其写出“如果收入 > 5 万且年龄 < 30 岁，就批准贷款”，不如把数千条历史贷款决策交给算法，让它自己找出模式。

- 机器学习有三种宽泛范式。**监督学习**使用带标签的数据，也就是每个输入都有已知的正确输出；算法学习从输入到输出的映射。**无监督学习**处理未标注数据，试图发现隐藏结构，例如聚类或压缩表示。**强化学习**在环境中通过试错学习，依据采取的动作获得奖励或惩罚（第 04 篇介绍）。

- 在监督学习内部，**分类**预测离散类别（垃圾邮件或非垃圾邮件、猫或狗），而**回归**预测连续值（房价、明天的温度）。两者的边界并不总是清晰：逻辑回归虽然名字中有“回归”，但实际执行的是分类。

- 概率模型中的一个关键区分是**生成式与判别式**。生成式模型学习联合分布 $P(x, y)$，也就是说，它理解数据本身是如何生成的，因此可以生成新样本。判别式模型直接学习 $P(y \mid x)$，只关注类别之间的边界。朴素贝叶斯是生成式模型；逻辑回归（第 02 篇）是判别式模型。生成式模型更灵活，但更难训练好；在数据足够时，判别式模型的分类准确率通常更高。

- **朴素贝叶斯**是最简单、效果也最好的分类器之一。它直接应用贝叶斯定理（第 05 章）：

$$P(C_k \mid x) = \frac{P(x \mid C_k) \, P(C_k)}{P(x)}$$

- “朴素”部分来自一个很强的独立性假设：给定类别后，把每个特征看作相互独立。如果你要把邮件分类为垃圾邮件，朴素贝叶斯会假设，一旦知道邮件是垃圾邮件，出现“free”这个词就与出现“winner”这个词无关。现实中几乎从来不是这样，但这个分类器的效果却出人意料地好。

- 因为所有类别的 $P(x)$ 都相同，分类可以简化为选取分子最大的类别：

$$\hat{y} = \arg\max_{k} \; P(C_k) \prod_{i=1}^{n} P(x_i \mid C_k)$$

- 先验 $P(C_k)$ 就是训练样本中属于每个类别的比例。似然 $P(x_i \mid C_k)$ 取决于特征的类型，由此产生三种常见变体。

- **多项式朴素贝叶斯**针对计数数据设计，例如文档中的词频。每个特征 $x_i$ 表示单词 $i$ 出现了多少次，似然遵循多项式分布。它是文本分类、情感分析和垃圾邮件过滤的标准选择。

- **高斯朴素贝叶斯**假设每个特征在每个类别内都服从正态分布。你从训练数据估计类别 $k$ 中特征 $i$ 的均值 $\mu_{ik}$ 和方差 $\sigma_{ik}^2$，再计算：

$$P(x_i \mid C_k) = \frac{1}{\sqrt{2\pi\sigma_{ik}^2}} \exp\!\left(-\frac{(x_i - \mu_{ik})^2}{2\sigma_{ik}^2}\right)$$

- 当特征是连续测量值（如身高、体重或传感器读数）时，这是自然的选择。

![两个相互重叠的高斯类条件分布，以及后验概率相交处的决策边界](../images/naive_bayes_classify.svg)

- **伯努利朴素贝叶斯**对二值特征建模：每个特征要么存在（1），要么不存在（0）。它不统计单词出现多少次，而只记录该单词是否出现。这对短文本或二值特征向量效果很好。

- 一个实际问题是：某个特征值从未在训练数据的某个类别中出现。此时似然变成零，而由于所有项相乘，整个后验概率都会塌缩为零。**拉普拉斯平滑**通过给每个“特征—类别”组合增加一个小计数（通常为 1）来修复这一点：

$$P(x_i \mid C_k) = \frac{\text{count}(x_i, C_k) + \alpha}{\text{count}(C_k) + \alpha \cdot V}$$

- 这里 $\alpha$ 是平滑参数（通常为 1），$V$ 是该特征可能取值的数量。这可以保证概率永远不会恰好为零。

- **决策树**采用完全不同的方法。它不计算概率，而是通过一系列是/否问题划分特征空间。可以把它想成“二十个问题”游戏：每一步都提出能最大程度缩小可能范围的问题。

- 一棵树从根节点开始，根节点包含所有训练样本。在每个内部节点，它选择一个特征和阈值进行切分（例如“年龄 < 30 吗？”）。样本根据答案向左或向右流动。这个过程递归地持续到叶节点；叶节点保存预测结果：分类时是到达该叶节点样本的多数类别，回归时是这些样本的均值。

![深度为 2 的决策树：按特征切分，具有是/否分支和彩色叶节点，叶节点显示类别预测](../images/decision_tree_split.svg)

- 关键问题是：应该按哪个特征切分？你希望切分后得到的子节点尽可能“纯”，也就是大多数样本属于同一类别。两种常见的不纯度度量是**基尼不纯度**和**熵**。

- **基尼不纯度**衡量这样一个概率：随机抽取的样本，若按该节点中的类别分布打标签，会被错误分类的概率为多少：

$$\text{Gini}(S) = 1 - \sum_{k=1}^{K} p_k^2$$

- 如果一个节点完全纯（所有样本属于一个类别），基尼不纯度为 0。如果类别完全均衡（例如两个类别各占 50%），基尼不纯度达到最大值 0.5。

- **熵**（第 05 章的信息论部分）衡量平均惊奇度：

$$H(S) = -\sum_{k=1}^{K} p_k \log_2 p_k$$

- 纯节点的熵为 0。完全均衡的二分类节点的熵为 1 bit。在实践中，基尼不纯度和熵产生的树非常相似；基尼不纯度略快一些，因为不需要计算对数。

- **信息增益**是切分带来的不纯度降低。对于把集合 $S$ 分为子集 $S_L$ 和 $S_R$ 的切分：

$$\text{IG}(S, \text{split}) = H(S) - \frac{|S_L|}{|S|} H(S_L) - \frac{|S_R|}{|S|} H(S_R)$$

- 算法在每个节点贪心地选择信息增益最高的切分。这是局部最优策略，并非全局最优，但在实践中效果很好。

- **回归树**的工作方式相同，但叶节点预测连续值（到达该叶节点样本的均值），切分准则使用方差减少，而不是基尼不纯度或熵。

- 如果不加限制，决策树会一直切分，直到每个叶节点都纯净，实质上记住全部训练数据。这会造成严重过拟合。**剪枝**可以对抗它。预剪枝在树生长前设置限制：最大深度、叶节点的最小样本数，或切分所需的最小信息增益。后剪枝先长出完整的树，再移除在验证集上不能改善表现的分支。

- 单棵决策树容易解释，但往往不稳定：数据略有变化，就可能产生完全不同的树。**集成方法**把多个模型组合起来，获得优于任意单个模型的预测。

- 核心思想是“群体智慧”。如果询问 100 个一般水平的分类器并进行多数投票，只要各个分类器的错误有一定独立性，集成结果就可能非常好。

- **Bagging**（bootstrap aggregating，自助聚合）在不同的随机数据子集上训练多个模型，这些子集通过有放回抽样得到（bootstrap 样本）。每个模型大约看到原始数据的 63%。预测时，对输出取平均（回归）或多数投票（分类）。由于每个模型看到的数据不同，它们会犯不同的错误，平均就能抵消大量方差。

- **随机森林**是在决策树上应用 bagging，并增加一个变化：每次切分时，树只考虑随机选取的特征子集（通常从总共 $d$ 个特征中选 $\sqrt{d}$ 个）。这会进一步降低树之间的相关性，使集成更强。随机森林是整个机器学习领域中最可靠的开箱即用分类器之一。

![并列对比：bagging 训练并行模型并取平均，boosting 顺序训练模型以纠正此前的错误](../images/ensemble_methods.svg)

- **Boosting** 持相反的理念。它不独立训练模型，而是按顺序训练，每个新模型都重点关注此前模型预测错误的样本。

- **AdaBoost**（Adaptive Boosting，自适应提升）为每个训练样本维护一个权重。开始时所有权重相等。训练一个弱学习器（通常是很浅的决策树，称为“树桩”）后，提高被错误分类样本的权重，让下一个学习器更多关注它们。最终预测是所有学习器的加权投票，表现更好的学习器话语权更大：

$$H(x) = \text{sign}\!\left(\sum_{t=1}^{T} \alpha_t \, h_t(x)\right)$$

- 学习器 $t$ 的权重 $\alpha_t$ 取决于其错误率 $\epsilon_t$：

$$\alpha_t = \frac{1}{2} \ln\!\left(\frac{1 - \epsilon_t}{\epsilon_t}\right)$$

- 错误率低的学习器获得较大的正权重；表现接近随机猜测（$\epsilon = 0.5$）的学习器权重为零。

- **梯度提升**推广了这个思想。它不重新加权样本，而是让每个新模型预测当前集成模型的残差（损失函数的负梯度）。对于平方误差损失，残差就是预测值与目标值之间的差。使用决策树的梯度提升（GBDT）是许多结构化数据竞赛获胜方案的基础（XGBoost、LightGBM 和 CatBoost 都是常用实现）。

- 核心区别是：bagging 通过平均噪声来降低**方差**，boosting 通过纠正系统性错误来降低**偏差**。当单个模型过拟合时，bagging 最有效；当单个模型欠拟合时，boosting 最有效。

- 转向无监督学习，**K-Means 聚类**是最简单、使用最广泛的聚类算法。给定 $n$ 个数据点和目标簇数 $K$，它通过最小化每个点到所在簇中心的总距离，把每个点分配给 $K$ 个簇中的一个。

- 该算法交替执行两个步骤。首先，把每个点**分配**给最近的质心。其次，把每个质心**更新**为分配给它的所有点的均值。重复直到分配不再改变。由于每一步都会使簇内总距离减小（或保持不变），算法一定会收敛。

![二维散点图：三个彩色点簇、质心标记和虚线簇边界](../images/kmeans_clustering.svg)

- 形式化地说，K-Means 最小化的是簇内平方和，称为**惯性**：

$$J = \sum_{k=1}^{K} \sum_{x \in C_k} \|x - \mu_k\|^2$$

- 其中 $\mu_k$ 是簇 $C_k$ 的质心。

- K-Means 对初始化很敏感。糟糕的初始质心可能导致较差的局部最小值。**K-Means++** 初始化策略先随机选择第一个质心，然后按该点到最近已有质心的平方距离成比例地选择每个后续质心。这会让初始中心分散开，几乎总能得到更好的结果。

- 如何选择 $K$？有两种常用工具。**肘部法**绘制惯性与 $K$ 的关系，并寻找增加更多簇后收益明显变小的“肘部”。**轮廓系数**衡量一个点与自身簇的相似度相对于它与最近其他簇的相似度，取值从 -1（错误的簇）到 +1（聚类良好）。所有点的平均轮廓系数提供了整体簇质量指标。

- K-Means 有局限：它假设簇大致等大且呈球形，并且进行“硬”分配（每个点恰好属于一个簇）。**高斯混合模型（GMM）**放宽了这两个限制。

- GMM 把数据建模为 $K$ 个高斯分布的混合，每个高斯分布都有自己的均值 $\mu_k$、协方差 $\Sigma_k$ 和混合权重 $\pi_k$（权重之和为 1）：

$$P(x) = \sum_{k=1}^{K} \pi_k \, \mathcal{N}(x \mid \mu_k, \Sigma_k)$$

- 它不进行硬分配，而是为每个点产生**软分配**：该点属于每个簇的概率（称为“责任度”）。位于两个高斯分布边界附近的点，可能有 60% 的概率属于簇 A，40% 的概率属于簇 B。

- GMM 使用**期望最大化（EM）算法**拟合，其过程与 K-Means 很像，交替执行两步。**E 步**计算责任度：每个点来自每个高斯分布的概率是多少？**M 步**更新参数：给定责任度，最好的均值、协方差和混合权重是什么？EM 保证每轮迭代都会提高数据似然，并收敛到局部最大值。

- K-Means 实际上是 GMM 的 EM 特例：它对应协方差相等的球形高斯分布，以及硬（0/1）责任度。

- **支持向量机（SVM）**从几何角度处理分类。对于两个线性可分的类别，可以有无穷多个超平面把它们分开。SVM 找到的是具有**最大间隔**的那个：超平面与两类最近数据点之间的间隙最大。

- 最近的点，也就是正好位于间隔边缘的点，被称为**支持向量**。只有这些点会影响边界的定义；移除其他所有训练点，仍然会得到同一个超平面。

![两个类别由最大间隔超平面分隔，显示间隔带和圈出的支持向量](../images/svm_margin.svg)

- 对于线性分类器 $f(x) = w \cdot x + b$，寻找最大间隔等价于求解：

$$\min_{w, b} \; \frac{1}{2}\|w\|^2 \quad \text{subject to} \quad y_i(w \cdot x_i + b) \geq 1 \; \text{for all } i$$

- 这是一个凸二次规划，因此具有唯一的全局解，不用担心局部最小值。

- 真实数据很少能完美线性可分。**软间隔 SVM** 通过引入松弛变量 $\xi_i \geq 0$，允许一部分点违反间隔：

$$\min_{w, b, \xi} \; \frac{1}{2}\|w\|^2 + C \sum_{i=1}^{n} \xi_i \quad \text{subject to} \quad y_i(w \cdot x_i + b) \geq 1 - \xi_i$$

- 超参数 $C$ 控制权衡：较大的 $C$ 会重罚误分类（拟合更紧，存在过拟合风险），较小的 $C$ 允许更多违反（间隔更宽，正则化更强）。

- SVM 最强大的特性是**核技巧**。许多在原始特征空间中不可线性分离的数据，映射到高维空间后会变得可分。核技巧让你可以在不显式计算变换的情况下，直接计算高维空间中的点积。

- 核函数 $K(x_i, x_j) = \phi(x_i) \cdot \phi(x_j)$ 替代 SVM 优化中的每一个点积。最常见的核是**径向基函数（RBF）核**：

$$K(x_i, x_j) = \exp\!\left(-\gamma \|x_i - x_j\|^2\right)$$

- RBF 核会把数据隐式映射到无限维空间。参数 $\gamma$ 控制单个训练点的影响范围：较大的 $\gamma$ 意味着每个点只影响近邻（存在过拟合风险），较小的 $\gamma$ 产生更平滑的边界。

- 其他常见核包括多项式核 $K(x_i, x_j) = (x_i \cdot x_j + c)^d$ 和线性核 $K(x_i, x_j) = x_i \cdot x_j$（后者就是没有变换的标准 SVM）。

- 实际上，在深度学习兴起以前，带 RBF 核的 SVM 曾是主导分类器。它们在中小型数据集上仍然表现良好，尤其适用于特征数量相对于样本数量较多的场景。

- SVM 与第 02 章（矩阵）的联系很深。优化通常以对偶形式求解，解只依赖训练样本之间的点积，这正是核技巧可行的原因。整个算法都在内积和线性代数的语言中运行。

- 经典机器学习工具箱总结如下：

| 算法 | 类型 | 主要优势 | 主要弱点 |
|---|---|---|---|
| 朴素贝叶斯 | 监督学习（生成式） | 速度快，少量数据也能工作 | 独立性假设 |
| 决策树 | 监督学习 | 可解释 | 容易过拟合 |
| 随机森林 | 监督学习（集成） | 稳健，超参数少 | 可解释性较低 |
| 梯度提升 | 监督学习（集成） | 表格数据上的先进效果 | 速度较慢，需要更多调参 |
| K-Means | 无监督学习（聚类） | 简单，可扩展 | 假设簇呈球形 |
| GMM | 无监督学习（聚类） | 软分配，形状灵活 | 对初始化敏感 |
| SVM | 监督学习 | 高维空间中有效 | 大数据集上较慢 |

## 编程任务（使用 CoLab 或 notebook）

1. 从零实现高斯朴素贝叶斯。在二维合成数据上训练两个类别，并可视化决策边界。与 scikit-learn 的实现进行比较。
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

2. 构建一个使用基尼不纯度进行切分的决策树。实现单个节点的切分逻辑，展示信息增益如何选择最佳特征和阈值。
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

3. 从零实现带 K-Means++ 初始化的 K-Means。对合成数据集进行聚类，并可视化每次迭代中的簇。
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

4. 演示核技巧。通过将核矩阵与多项式核的显式特征映射进行比较，展示 RBF 核如何在高维空间中计算点积。
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
