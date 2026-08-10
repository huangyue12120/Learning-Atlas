---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/02-ml-fundamentals/14-naive-bayes/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: cda8fef9420715c6fd52a94ea81e2d3a93ae60d32e08a4170ddf8e56696b5a63
status: reviewed
---

# 朴素贝叶斯

> “朴素”的假设是错的，它却依然有效；这正是它的魅力。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 2 第 01–07 课（分类、贝叶斯定理）  
**预计时间：** 约 75 分钟

## 学习目标

- 使用 Laplace 平滑从零实现文本分类的多项式朴素贝叶斯。
- 解释朴素独立假设为何在数学上错误、却能在实践中给出正确类别排序。
- 比较多项式、伯努利、高斯朴素贝叶斯，并为给定特征类型选择正确变体。
- 在高维稀疏数据上将朴素贝叶斯与逻辑回归比较，解释其中的偏差—方差权衡。

## 问题

你需要对文本分类：邮件分垃圾/非垃圾，评论分正/负，工单分门类。特征数可达数千（每个词一个），而训练数据有限。

多数分类器在这里表现不佳：逻辑回归需要足够样本可靠估计数千权重；决策树每次只按一个词切分，严重过拟合；10,000 维上的 KNN 毫无意义，因为每个点与其他点几乎等距。

朴素贝叶斯能处理它。它作出数学上错误的假设——给定类别后每个特征都相互独立——却仍在文本分类上超过“更聪明”的模型，尤其是小训练集。它只需遍历数据一次即可训练，可扩展到百万特征，还会产出概率估计（独立假设使其校准往往不好）。

理解错误假设为何带来好预测，会揭示 ML 的基本事实：最佳模型不是最正确的模型，而是最适合数据的偏差—方差权衡模型。

## 概念

### 贝叶斯定理（快速回顾） <!-- learning-atlas: bayes-theorem-quick-review -->

贝叶斯定理翻转条件概率：

```
P(class | features) = P(features | class) * P(class) / P(features)
```

我们希望得到 `P(class | features)`：给定文档词语时属于某类别的概率。它可由以下量计算：

- `P(features | class)`：在该类文档中看到这些词的似然。
- `P(class)`：类别先验概率（一般而言垃圾邮件有多常见？）。
- `P(features)`：证据，对所有类别相同，比较时可忽略。

`P(class | features)` 最大的类别获胜。

### 朴素独立假设

精确计算 `P(features | class)` 必须估计所有特征的联合概率。词表有 10,000 个词时，需要估计 2^10,000 种组合的分布，完全不可能。

朴素假设是：给定类别后，各特征条件独立。

```
P(w1, w2, ..., wn | class) = P(w1 | class) * P(w2 | class) * ... * P(wn | class)
```

这将一个不可能的联合分布变为 n 个简单的逐特征分布，每个只需一次计数。

假设显然错误：任何文档中 “machine” 与 “learning” 都不独立。但分类器不需要正确概率估计，只需正确排序——哪个类别概率最高。独立假设会带来系统误差，但它们会以近似相同方式影响各类，故排序仍然正确。

### 为什么仍然有效

三个原因：

1. **排序重于校准。**分类只需最上方类别正确；真实垃圾概率为 0.7 时，即使预测 P(spam)=0.99999，仍正确选中垃圾。需要的是正确赢家，不是精确概率。
2. **高偏差、低方差。**独立假设是强先验，强力约束模型以防过拟合。数据有限时，略有错误但稳定的模型优于理论正确却不稳定的模型。
3. **特征冗余会抵消。**相关特征提供冗余证据；模型会重复计数，但为正确类别也重复计数。若 “machine” 与 “learning” 总共现，二者都支持 “tech” 类。

第四个实用原因是极快：训练仅一次遍历以计数频率，预测只是矩阵乘法；数秒即可训练百万文档，因此可更快迭代、尝试更多特征集与实验。

### 数学：逐步计算

以 spam 与 not-spam 两类、词表 “free”“money”“meeting” 为例。训练数据为：

- 垃圾邮件中 “free”“money”“meeting” 分别出现 80、60、10 次（共 150 个词）。
- 非垃圾邮件中 “free”“money”“meeting” 分别出现 5、10、100 次（共 115 个词）。
- 40% 邮件为垃圾邮件，60% 为非垃圾邮件。

以 Laplace 平滑（alpha=1）计算：

```
P(free | spam)    = (80 + 1) / (150 + 3) = 81/153 = 0.529
P(money | spam)   = (60 + 1) / (150 + 3) = 61/153 = 0.399
P(meeting | spam) = (10 + 1) / (150 + 3) = 11/153 = 0.072

P(free | not-spam)    = (5 + 1) / (115 + 3) = 6/118 = 0.051
P(money | not-spam)   = (10 + 1) / (115 + 3) = 11/118 = 0.093
P(meeting | not-spam) = (100 + 1) / (115 + 3) = 101/118 = 0.856
```

新邮件含 “free” 两次、“money” 一次、“meeting” 零次：

```
log P(spam | email) = log(0.4) + 2*log(0.529) + 1*log(0.399) + 0*log(0.072)
                    = -0.916 + 2*(-0.637) + (-0.919) + 0
                    = -3.109

log P(not-spam | email) = log(0.6) + 2*log(0.051) + 1*log(0.093) + 0*log(0.856)
                        = -0.511 + 2*(-2.976) + (-2.375) + 0
                        = -8.838
```

垃圾邮件以明显优势获胜。“free” 出现两次是强证据；“meeting” 不出现对两个对数和贡献都是零（0 * log(P)）。多项式 NB 中缺失词无影响，伯努利 NB 才显式建模缺失。

### 三种变体

朴素贝叶斯有三种风格，各自以不同方式建模 `P(feature | class)`。

#### 多项式朴素贝叶斯

将每个特征视作计数，最适合词频或 TF-IDF 的文本数据：

```
P(word_i | class) = (count of word_i in class + alpha) / (total words in class + alpha * vocab_size)
```

`alpha` 是下文说明的 Laplace 平滑；此变体是文本分类主力。

#### 高斯朴素贝叶斯

将每个特征建模为正态分布，最适合连续特征：

```
P(x_i | class) = (1 / sqrt(2 * pi * var)) * exp(-(x_i - mean)^2 / (2 * var))
```

每个类别、每个特征各有均值与方差；类内特征确实近似钟形分布时效果好。

#### 伯努利朴素贝叶斯

把每个特征建模为二元的存在/缺失，适合短文本或二值特征向量：

```
P(word_i | class) = (docs in class containing word_i + alpha) / (total docs in class + 2 * alpha)
```

与多项式变体不同，它显式惩罚词缺失：通常出现在垃圾邮件中的 “free” 若未出现，是反垃圾证据。

### 何时使用各变体

| 变体 | 特征类型 | 最适合 | 示例 |
|---------|-------------|----------|---------|
| 多项式 | 计数或频率 | 文本分类、词袋 | 邮件垃圾、主题分类 |
| 高斯 | 连续值 | 具有近似正态特征的表格数据 | Iris、传感器数据 |
| 伯努利 | 二值（0/1） | 短文本、二值特征向量 | 短信垃圾、存在/缺失特征 |

### Laplace 平滑

测试数据中某词从未在某类训练数据出现时会怎样？无平滑时，`P(word | class) = 0/N = 0`；乘积中一个零就使 `P(class | features)=0`，其他证据完全无效。

Laplace 平滑为每个特征计数加小值 `alpha`（通常为 1）：

```
P(word_i | class) = (count(word_i, class) + alpha) / (total_words_in_class + alpha * vocab_size)
```

alpha=1 时每个词至少有微小概率；测试邮件中的 “discombobulate” 不再消灭垃圾概率。它的贝叶斯解释是对词分布施加均匀 Dirichlet 先验。

alpha 越高，平滑越强、分布越均匀；alpha 越低，越相信数据。alpha 是应调节的超参数。

| Alpha | 作用 | 使用时机 |
|-------|--------|-------------|
| 0.001 | 几乎不平滑，相信数据 | 极大训练集、预计无未见特征 |
| 0.1 | 轻度平滑 | 大训练集 |
| 1.0 | 标准 Laplace 平滑 | 默认起点 |
| 10.0 | 强平滑，压平分布 | 极小训练集、预期许多未见特征 |

### 对数空间计算

数百个小于 1 的概率相乘会浮点下溢，乘积变为 0。解决方案是在对数空间工作：不乘概率，而加其对数。

```
log P(class | x1, x2, ..., xn) = log P(class) + sum_i log P(xi | class)
```

这使预测成为点积：

```
log_scores = X @ log_feature_probs.T + log_class_priors
prediction = argmax(log_scores)
```

即矩阵乘法；这也是 NB 预测极快的原因，与单层线性模型是相同操作。

### 朴素贝叶斯与逻辑回归

二者都是文本线性分类器，差异在建模对象：

| 方面 | 朴素贝叶斯 | 逻辑回归 |
|--------|------------|-------------------|
| 类型 | 生成式（建模 P(X\|Y)） | 判别式（建模 P(Y\|X)） |
| 训练 | 计数频率 | 优化损失函数 |
| 小数据 | 更好（强先验有帮助） | 更差（不足以估计权重） |
| 大数据 | 更差（错误假设造成伤害） | 更好（边界更灵活） |
| 特征 | 假设独立 | 能处理相关性 |
| 速度 | 单次遍历，极快 | 迭代优化 |
| 校准 | 概率较差 | 概率较好 |

经验法则：先用朴素贝叶斯；数据足够且 NB 到平台期后切换逻辑回归。

### 分类管道

```mermaid
flowchart LR
    A[原始文本] --> B[分词]
    B --> C[构建词表]
    C --> D[统计词频]
    D --> E[应用平滑]
    E --> F[计算对数概率]
    F --> G["预测：选择后验概率最大的类别"]

    style A fill:#f9f,stroke:#333
    style G fill:#9f9,stroke:#333
```

实践中在对数空间工作以避免下溢：不乘许多小概率而加其对数。

```
log P(class | features) = log P(class) + sum_i log P(feature_i | class)
```

```figure
naive-bayes
```

## 动手实现

`code/naive_bayes.py` 从零实现多项式 NB 与高斯 NB。

### MultinomialNB

从零实现：

1. **fit(X, y)：**为每一类统计每个特征频率，加 Laplace 平滑，计算并保存对数概率与类别先验（类别频率的对数）。
2. **predict_log_proba(X)：**为每个样本和类别计算 log P(class) + 特征的 log P(feature_i | class) 之和，即 `X @ log_probs.T + log_priors`。
3. **predict(X)：**返回对数概率最高的类别。

```python
class MultinomialNB:
    def __init__(self, alpha=1.0):
        self.alpha = alpha

    def fit(self, X, y):
        classes = np.unique(y)
        n_classes = len(classes)
        n_features = X.shape[1]

        self.classes_ = classes
        self.class_log_prior_ = np.zeros(n_classes)
        self.feature_log_prob_ = np.zeros((n_classes, n_features))

        for i, c in enumerate(classes):
            X_c = X[y == c]
            self.class_log_prior_[i] = np.log(X_c.shape[0] / X.shape[0])
            counts = X_c.sum(axis=0) + self.alpha
            self.feature_log_prob_[i] = np.log(counts / counts.sum())

        return self
```

核心洞见：拟合后预测仅是矩阵乘法加偏置，这就是 NB 如此快的原因。

### GaussianNB

对连续特征，按类别、特征估计均值与方差：

```python
class GaussianNB:
    def __init__(self):
        pass

    def fit(self, X, y):
        classes = np.unique(y)
        self.classes_ = classes
        self.means_ = np.zeros((len(classes), X.shape[1]))
        self.vars_ = np.zeros((len(classes), X.shape[1]))
        self.priors_ = np.zeros(len(classes))

        for i, c in enumerate(classes):
            X_c = X[y == c]
            self.means_[i] = X_c.mean(axis=0)
            self.vars_[i] = X_c.var(axis=0) + 1e-9
            self.priors_[i] = X_c.shape[0] / X.shape[0]

        return self
```

预测对每个特征使用高斯 PDF，再跨特征相乘（在对数空间相加）。

### 演示：文本分类

代码生成模拟两类（技术文章与体育文章）的词袋数据；不同类别有不同词频分布，多项式 NB 用词计数分类。

具体而言，生成 200 个“词”（特征列）：0–39 在技术文章中高频、体育中低频；80–119 在体育中高频、技术中低频；40–79 在两类均为中频。这模拟了有些词是强类别指示器、有些词是噪声的现实情形。

### 演示：连续特征

代码生成 Iris 风格数据（3 类、4 特征、高斯簇）；高斯 NB 用类别均值和方差分类。各类别有不同中心（均值向量）和不同扩散（方差），模拟真实测量在类别间的系统性差异。

代码还展示：

- **平滑比较：**以不同 alpha 训练多项式 NB，展示平滑强度对准确率的影响。
- **训练量实验：**训练量从 20 增至 1600 时 NB 准确率如何提高；极少数据时仍有不错准确率是其主优势。
- **混淆矩阵：**逐类 precision、recall 与 F1，显示 NB 在哪里出错。

### 预测速度

朴素贝叶斯预测是矩阵乘法。n 个样本、d 个特征、k 个类别时：

- 多项式 NB：一次 (n x d) @ (d x k) 矩阵乘法，O(n * d * k)。
- 高斯 NB：n * k 次高斯 PDF 计算，每次跨 d 特征，O(n * d * k)。

二者在各维度上线性；相比 KNN（需计算到所有训练点的距离）或 RBF SVM（需对所有支持向量计算核），预测时快若干数量级。

## 使用现成工具

sklearn 中两种变体都是一行即可使用：

```python
from sklearn.naive_bayes import GaussianNB, MultinomialNB

gnb = GaussianNB()
gnb.fit(X_train, y_train)
print(f"GaussianNB accuracy: {gnb.score(X_test, y_test):.3f}")

mnb = MultinomialNB(alpha=1.0)
mnb.fit(X_train_counts, y_train)
print(f"MultinomialNB accuracy: {mnb.score(X_test_counts, y_test):.3f}")
```

sklearn 文本分类：

```python
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

text_clf = Pipeline([
    ("vectorizer", CountVectorizer()),
    ("classifier", MultinomialNB(alpha=1.0)),
])

text_clf.fit(train_texts, train_labels)
accuracy = text_clf.score(test_texts, test_labels)
```

`naive_bayes.py` 会将从零实现与 sklearn 在同一数据上比较，以验证正确性。

### 使用 NB 的 TF-IDF

原始词频让每次出现权重相同，但 “the”“is” 等词在每类中都常见、没有信息；TF-IDF（Term Frequency - Inverse Document Frequency）降低常见词权重、提高稀有而有判别力的词权重。

```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

text_clf = Pipeline([
    ("tfidf", TfidfVectorizer()),
    ("classifier", MultinomialNB(alpha=0.1)),
])
```

TF-IDF 值非负，能与 MultinomialNB 共用。TF-IDF + MultinomialNB 是最强的文本分类基线之一，训练样本少于 10,000 时常胜过复杂模型。

### 短文本的 BernoulliNB

推文、短信、聊天消息等短文本中，BernoulliNB 可超过 MultinomialNB；词计数低使频率信息有噪声，而只关心存在/缺失更可靠。

```python
from sklearn.naive_bayes import BernoulliNB
from sklearn.feature_extraction.text import CountVectorizer

text_clf = Pipeline([
    ("vectorizer", CountVectorizer(binary=True)),
    ("classifier", BernoulliNB(alpha=1.0)),
])
```

CountVectorizer 的 `binary=True` 将计数转为 0/1。没有它 BernoulliNB 仍能运行，却会看到并非为其设计的计数。

### 校准 NB 概率

NB 概率校准较差：P(spam)=0.95 时真实概率可能为 0.7。若需要可靠概率（如设阈值或与其他模型组合），使用 sklearn 的 `CalibratedClassifierCV`：

```python
from sklearn.calibration import CalibratedClassifierCV

calibrated_nb = CalibratedClassifierCV(MultinomialNB(), cv=5, method="sigmoid")
calibrated_nb.fit(X_train, y_train)
proba = calibrated_nb.predict_proba(X_test)
```

它用交叉验证在 NB 原始分数上拟合逻辑回归，所得概率会更接近真实类别频率。

### 常见陷阱

1. **负特征值。**MultinomialNB 要求非负特征。若存在负值（某些 TF-IDF 设置或标准化特征），改用 GaussianNB，或将特征平移为正。
2. **零方差特征。**GaussianNB 会除以方差；某类的特征若全相同会导致计算失败。代码向方差加小平滑项（1e-9）。
3. **类别不平衡。**99% 邮件非垃圾时 P(not-spam)=0.99 的先验可能淹没似然证据；可手动设 class priors，或使用 sklearn 的 class_prior 参数。
4. **特征缩放。**MultinomialNB 不需缩放（处理计数）；GaussianNB 也不需缩放（估计逐特征统计量）。这是相对逻辑回归/SVM 的优势，二者对尺度敏感。

## 交付成果

本课产出：

- `outputs/skill-naive-bayes-chooser.md`——选择正确 NB 变体的决策 skill。
- `code/naive_bayes.py`——从零实现 MultinomialNB、GaussianNB，并与 sklearn 比较。

### 朴素贝叶斯何时失败

当独立假设导致类别**排序**错误（而不只是概率错误）时 NB 失败：

1. **强特征交互。**类别取决于两特征组合而非任一特征（XOR 式）时，每个特征单独均无证据，NB 无法非线性组合它们。
2. **带相反证据的高度相关特征。**A 指向垃圾、B 指向非垃圾，但二者现实中完全相关（总一致）时，NB 会看到不存在的冲突证据。
3. **极大训练集。**数据足够时，逻辑回归等判别式模型会学习真实决策边界并超过 NB；小数据时有用的独立假设此时成为限制。

实践中这些在文本分类中较少：文本特征众多、单独都弱，独立假设的误差倾向于抵消。对特征较少且强相关的表格数据，优先考虑逻辑回归或树模型。

## 练习

1. **平滑实验。**以 alpha 为 0.01、0.1、1.0、10.0、100.0 训练文本多项式 NB，绘制准确率对 alpha 的图；性能在哪里达到峰值？为何极高 alpha 有害？
2. **特征独立性测试。**在真实文本数据集选择显然相关的 “machine”“learning”，计算 P(word1 | class) * P(word2 | class) 并与 P(word1 AND word2 | class) 比较；独立假设错得多严重？影响准确率吗？
3. **伯努利实现。**扩展代码为 BernoulliNB 类，把词袋转为二值（出现/未出现），与 MultinomialNB 比较准确率；何时伯努利胜出？
4. **NB 与逻辑回归。**在文本数据上训练二者，从 100 个样本逐步增至 10,000，绘制准确率对训练集大小；逻辑回归何时超过 NB？
5. **垃圾过滤器。**构建完整分类器：分词原始邮件、建词表、创建词袋特征、训练 MultinomialNB，并用 precision 与 recall（而非只用准确率）评估；为什么？

## 核心术语

| 术语 | 常见说法 | 实际含义 |
|------|----------------|----------------------|
| 朴素贝叶斯 | “简单概率分类器” | 应用贝叶斯定理，并假设给定类别后特征条件独立的分类器。 |
| 条件独立 | “特征互不影响” | P(A, B \| C) = P(A \| C) * P(B \| C)：已知 C 后，知道 B 不再提供 A 的信息。 |
| Laplace 平滑 | “加一平滑” | 为每个特征加小计数，防止零概率主导预测。 |
| 先验 | “看数据前的相信程度” | P(class)，观测特征前各类别的概率。 |
| 似然 | “数据有多吻合” | P(features \| class)，已知类别时观察这些特征的概率。 |
| 后验 | “看数据后的相信程度” | P(class \| features)，观察特征后更新的类别概率。 |
| 生成式模型 | “建模数据如何生成” | 学习 P(X \| Y) 与 P(Y)，再以贝叶斯定理得到 P(Y \| X)。 |
| 判别式模型 | “建模决策边界” | 不建模 X 如何生成，直接学习 P(Y \| X) 的模型。 |
| 对数概率 | “避免下溢” | 使用 log P 而非 P，防止许多小概率乘积在浮点数中变零。 |

## 延伸阅读

- [scikit-learn Naive Bayes docs](https://scikit-learn.org/stable/modules/naive_bayes.html)——三种变体及数学细节。
- [McCallum 和 Nigam：A Comparison of Event Models for Naive Bayes Text Classification（1998）](https://www.cs.cmu.edu/~knigam/papers/multinomial-aaaiws98.pdf)——文本多项式与伯努利 NB 的经典比较。
- [Rennie 等：Tackling the Poor Assumptions of Naive Bayes Text Classifiers（2003）](https://people.csail.mit.edu/jrennie/papers/icml03-nb.pdf)——文本 NB 改进。
- [Ng 和 Jordan：On Discriminative vs. Generative Classifiers（2001）](https://ai.stanford.edu/~ang/papers/nips01-discriminativegenerative.pdf)——证明少数据时 NB 比 LR 收敛更快。
