---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/05-nlp-foundations-to-advanced/05-sentiment-analysis/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 6c0d5587fd261631bbf70042e355315dd840b25ea237f8525e5970dd10f87534
status: reviewed
---

# 情感分析

> 这是经典 NLP 任务。学习经典文本分类所需的大部分知识，都会在这里出现。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 5 第 02 课（BoW 与 TF-IDF）、Phase 2 第 14 课（朴素贝叶斯）  
**预计时间：** 约 75 分钟

## 问题

“The food was not great.”表达的是正面还是负面情感？

情感分析听起来很简单。评论者喜欢或不喜欢某样东西，给句子贴上标签即可。它成为经典 NLP 任务，是因为每个看似简单的例子都藏着难点。否定会翻转含义，讽刺会反转字面意思。“Not bad at all”含有两个偏负面的词，却表达正面态度。表情符号携带的信号可能比周围文字还多。领域词汇也会改变判断，例如 `tight` 出现在音乐评论和服装评论中时含义不同。

情感分析是经典 NLP 的实验室。理解每个朴素基线的特定失效方式，也就理解了为何研究者要发明更丰富的模型。本课从零构建朴素贝叶斯基线，再加入逻辑回归，并说明哪些陷阱会让生产级情感分析升级为合规级问题。

## 概念

经典情感分析分两步。

1. **表示。** 把文本转换成特征向量，可选 BoW、TF-IDF 或 n-gram。
2. **分类。** 在标注样本上拟合线性模型，可选朴素贝叶斯、逻辑回归或 SVM。

朴素贝叶斯是最简单的实用模型。它假设给定标签后，每个特征彼此独立；从计数估计 `P(word | positive)` 与 `P(word | negative)`，推理时把概率相乘。这个“朴素”独立假设并不成立，模型却出人意料地强。稀疏文本特征配合中等规模数据时，分类器更关心每个词倾向于哪一类，而不是倾向程度有多大。

逻辑回归不再采用独立性假设。它为每个特征学习一个权重，其中可以有负权重。二元特征 `not good` 可以学到负权重。若某个二元组合从未带标签出现，朴素贝叶斯便无法这样处理。

```figure
sentiment-logits
```

## 动手实现

### 步骤 1：真实的微型数据集

```python
POSITIVE = [
    "absolutely loved this movie",
    "beautiful cinematography and a great story",
    "one of the best films of the year",
    "brilliant acting from the lead",
    "heartwarming and funny",
]

NEGATIVE = [
    "boring and far too long",
    "not worth your time",
    "the plot made no sense",
    "terrible acting, awful script",
    "i want my two hours back",
]
```

数据集刻意保持很小。真实项目会使用数万个样本，例如 IMDb、SST-2 和 Yelp polarity，但数学完全相同。

### 步骤 2：从零实现多项式朴素贝叶斯

```python
import math
from collections import Counter


def train_nb(docs_by_class, vocab, alpha=1.0):
    class_priors = {}
    class_word_probs = {}
    total_docs = sum(len(d) for d in docs_by_class.values())

    for cls, docs in docs_by_class.items():
        class_priors[cls] = len(docs) / total_docs
        counts = Counter()
        for doc in docs:
            for token in doc:
                counts[token] += 1
        total = sum(counts.values()) + alpha * len(vocab)
        class_word_probs[cls] = {
            w: (counts[w] + alpha) / total for w in vocab
        }
    return class_priors, class_word_probs


def predict_nb(doc, class_priors, class_word_probs):
    scores = {}
    for cls in class_priors:
        s = math.log(class_priors[cls])
        for token in doc:
            if token in class_word_probs[cls]:
                s += math.log(class_word_probs[cls][token])
        scores[cls] = s
    return max(scores, key=scores.get)
```

加性平滑在 `alpha=1.0` 时就是拉普拉斯平滑。没有它，某个类别中未出现的词概率为零，取对数时会出错。实践中常用 `alpha=0.01`，教学默认值则是 `alpha=1.0`。

### 步骤 3：从零实现逻辑回归

```python
import numpy as np


def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-np.clip(x, -20, 20)))


def train_lr(X, y, epochs=500, lr=0.05, l2=0.01):
    n_features = X.shape[1]
    w = np.zeros(n_features)
    b = 0.0
    for _ in range(epochs):
        logits = X @ w + b
        preds = sigmoid(logits)
        err = preds - y
        grad_w = X.T @ err / len(y) + l2 * w
        grad_b = err.mean()
        w -= lr * grad_w
        b -= lr * grad_b
    return w, b


def predict_lr(X, w, b):
    return (sigmoid(X @ w + b) >= 0.5).astype(int)
```

L2 正则化在这里很重要。文本特征稀疏，不使用 L2 时模型会记住训练样本。可以从 `0.01` 开始调参。

### 步骤 4：处理否定这一失效模式

比较“not good”和“not bad”。BoW 分类器只看到 `{not, good}` 与 `{not, bad}`，并根据训练数据中哪种组合出现得更多来学习。二元语法分类器则看到 `not_good` 与 `not_bad`，把它们当成不同特征学习。这通常已经足够。

没有二元语法时，还可以使用一种更粗糙但有效的修复：**否定范围（negation scoping）**。从否定词开始，给后续词元加上 `NOT_` 前缀，直到下一个标点为止。

```python
NEGATION_WORDS = {"not", "no", "never", "nor", "none", "nothing", "neither"}
NEGATION_TERMINATORS = {".", "!", "?", ",", ";"}


def apply_negation(tokens):
    out = []
    negate = False
    for token in tokens:
        if token in NEGATION_TERMINATORS:
            negate = False
            out.append(token)
            continue
        if token in NEGATION_WORDS:
            negate = True
            out.append(token)
            continue
        out.append(f"NOT_{token}" if negate else token)
    return out
```

```python
>>> apply_negation(["not", "good", "at", "all", ".", "but", "funny"])
['not', 'NOT_good', 'NOT_at', 'NOT_all', '.', 'but', 'funny']
```

现在 `good` 与 `NOT_good` 是两个特征，分类器可以给它们相反的权重。三行预处理就能让情感基准的准确率得到可测量的提升。

### 步骤 5：真正有用的评估指标

类别不平衡时，单独看准确率会误导你。真实情感语料通常有 70% 至 80% 的样本属于正类或负类；恒定输出多数类的分类器能达到 80% 准确率，却没有任何用处。以下指标应全部报告：

- **逐类精确率与召回率。** 每个类别报告一对，再取宏平均，得到尊重类别平衡的单一数值。
- **宏 F1（不平衡数据的主要指标）。** 对各类别 F1 等权取均值。类别不平衡时用它代替准确率。
- **加权 F1（备选指标）。** 与宏 F1 类似，但按类别频率加权。类别不平衡本身具有业务含义时，与宏 F1 一同报告。
- **混淆矩阵。** 报告原始计数。信任任何标量指标之前都要检查它，因为它能显示模型混淆了哪些类别对。
- **逐类错误样本。** 每类抽取 5 个错误预测并阅读。直接阅读实际错误无法由其他方法替代。

对极端不平衡数据（比例超过 95:5），应报告 **AUROC** 与 **AUPRC**，而不是准确率。AUPRC 对少数类更敏感，而垃圾邮件、欺诈和稀有情感等任务通常正关心少数类。

**需要避免的常见错误。** 对不平衡数据报告微 F1 而不是宏 F1，所得数值会因多数类占主导而显得很高。宏 F1 会迫使你看到少数类性能。

```python
def evaluate(y_true, y_pred):
    tp = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 1)
    fp = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 1)
    fn = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 0)
    tn = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 0)
    precision = tp / (tp + fp) if tp + fp else 0
    recall = tp / (tp + fn) if tp + fn else 0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0
    return {"tp": tp, "fp": fp, "tn": tn, "fn": fn, "precision": precision, "recall": recall, "f1": f1}
```

## 使用现成工具

scikit-learn 用六行代码正确完成这项工作。

```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

pipe = Pipeline([
    ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=2, sublinear_tf=True, stop_words=None)),
    ("clf", LogisticRegression(C=1.0, max_iter=1000)),
])
pipe.fit(X_train, y_train)
print(pipe.score(X_test, y_test))
```

留意三个设置。`stop_words=None` 保留否定词；`ngram_range=(1, 2)` 加入二元语法，让 `not_good` 成为特征；`sublinear_tf=True` 减弱重复词的影响。在 SST-2 上，这三个标志可能就是 75% 与 85% 准确率基线之间的差别。

### 何时改用 Transformer

- 讽刺检测。经典模型在这里会失败。
- 情感在文档中途改变的长评论。
- 基于方面的情感分析。“Camera was great but battery was terrible.”需要把情感归因到具体方面，只能使用 Transformer 或结构化输出模型。
- 非英语低资源语言。多语言 BERT 可以直接给出零样本基线。

遇到上述任一需求，可以跳到 Phase 7 的 Transformer 深入课程。否则，朴素贝叶斯或逻辑回归配合 TF-IDF、二元语法和否定处理，就是你的 2026 年生产基线。

### 再谈可复现性陷阱

团队经常重新训练情感模型，却很少重新评估所有基线。论文中的准确率依赖特定数据划分、预处理和分词器。若新模型与基线使用不同流水线，比较出的差值会误导你。请始终在自己的流水线上重跑基线，不要直接引用论文数值。

## 交付成果

保存为 `outputs/prompt-sentiment-baseline.md`：

```markdown
---
name: sentiment-baseline
description: Design a sentiment analysis baseline for a new dataset.
phase: 5
lesson: 05
---

Given a dataset description (domain, language, size, label granularity, latency budget), you output:

1. Feature extraction recipe. Specify tokenizer, n-gram range, stopword policy (usually keep), negation handling (scoped prefix or bigrams).
2. Classifier. Naive Bayes for baseline, logistic regression for production, transformer only if the domain needs sarcasm / aspects / cross-lingual.
3. Evaluation plan. Report precision, recall, F1, confusion matrix, and per-class error samples (not just scalars).
4. One failure mode to monitor post-deployment. Domain drift and sarcasm are the top two.

Refuse to recommend dropping stopwords for sentiment tasks. Refuse to report accuracy as the sole metric when classes are imbalanced (e.g., 90% positive). Flag subword-rich languages as needing FastText or transformer embeddings over word-level TF-IDF.
```

## 练习

1. **简单。** 把 `apply_negation` 加入 scikit-learn 流水线的预处理步骤，在小型情感数据集上测量 F1 的变化。
2. **中等。** 实现带类别权重的逻辑回归，可以向 scikit-learn 传入 `class_weight="balanced"`，也可以自行推导梯度。在 90:10 的合成类别不平衡数据上测量效果。
3. **困难。** 在情感模型的残差上训练第二个分类器，构建讽刺检测器，并记录实验设置。若准确率低于随机水平，应提醒读者：二分类讽刺检测的随机水平约为 50%，大多数初次尝试都会落在附近。

## 关键术语

| 术语 | 常见说法 | 准确含义 |
|------|----------|----------|
| 极性（polarity） | 正面或负面 | 二元标签，有时扩展为中性或细粒度五星标签。 |
| 基于方面的情感（aspect-based sentiment） | 每个方面的极性 | 把情感归因到文本提到的具体实体或属性。 |
| 否定范围（negation scoping） | 翻转附近词元 | 在 `not` 之后的词元前加 `NOT_`，直到遇到标点。 |
| 拉普拉斯平滑（Laplace smoothing） | 给计数加 1 | 防止朴素贝叶斯中出现概率为零的特征。 |
| L2 正则化 | 缩小权重 | 在损失中加入 `lambda * sum(w^2)`；稀疏文本特征离不开它。 |

## 延伸阅读

- [Pang and Lee (2008). Opinion Mining and Sentiment Analysis](https://www.cs.cornell.edu/home/llee/opinion-mining-sentiment-analysis-survey.html)：奠基性综述。篇幅很长，但前四节覆盖了全部经典方法。
- [Wang and Manning (2012). Baselines and Bigrams: Simple, Good Sentiment and Topic Classification](https://aclanthology.org/P12-2018/)：这篇论文证明，二元语法加朴素贝叶斯在短文本上很难击败。
- [scikit-learn 文本特征提取文档](https://scikit-learn.org/stable/modules/feature_extraction.html#text-feature-extraction)：`CountVectorizer`、`TfidfVectorizer` 及其所有可调参数的参考。
