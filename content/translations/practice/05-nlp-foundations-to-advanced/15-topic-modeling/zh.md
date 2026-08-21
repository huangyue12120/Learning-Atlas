---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/05-nlp-foundations-to-advanced/15-topic-modeling/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 0b8bfca1c418447199c2d11972a26da45b772de059db589c56f2e1127d38499b
status: reviewed
---

# 主题建模：LDA 与 BERTopic

> LDA：文档是主题的混合，主题是词上的分布。BERTopic：文档在嵌入空间聚类，簇就是主题。目标相同，分解方式不同。

**类型：** 学习  
**学习实现：** Python  
**前置课程：** Phase 5 第 02 课（BoW 与 TF-IDF）、Phase 5 第 03 课（Word2Vec）  
**预计时间：** 约 45 分钟

## 问题

你手里有一万张客服工单、五万篇新闻或二十万条推文，需要了解这批文本都在谈什么，却无法逐篇阅读。数据没有类别标签，你甚至不知道有多少个类别。

主题建模无须监督就能回答这个问题。输入语料，输出少量连贯主题，以及每篇文档在这些主题上的分布。

两类算法占据主导。LDA（2003）把每篇文档视为潜在主题的混合，把每个主题视为词上的分布，并使用贝叶斯推断。生产系统需要混合成员主题分配和可解释的词级概率分布时，至今仍会使用它。

BERTopic（2020）用 BERT 编码文档，用 UMAP 降维，用 HDBSCAN 聚类，再通过基于类别的 TF-IDF 提取主题词。对短文本、社交媒体，以及语义相似度比词面重叠更重要的任务，它表现更好。每篇文档只得到一个主题，这对长文本是一项限制。

本课建立两种方法的直觉，并说明面对不同语料应怎样选择。

## 概念

![LDA 混合模型与 BERTopic 聚类](../assets/topic-modeling.svg)

**LDA 的生成故事。** 每个主题是词上的分布，每篇文档是主题的混合。生成文档中的一个词时，先从文档混合中抽取主题，再从该主题的词分布中抽取单词。推断把过程反过来：给定观察到的词，推断每篇文档的主题分布和每个主题的词分布。折叠 Gibbs 采样或变分贝叶斯负责数学计算。

LDA 的关键输出：

- `doc_topic`：形状为 `(n_docs, n_topics)` 的矩阵，每行和为 1，表示文档的主题混合。
- `topic_word`：形状为 `(n_topics, vocab_size)` 的矩阵，每行和为 1，表示主题的词分布。

**BERTopic 流水线。**

1. 用句子 Transformer 编码每篇文档，例如 `all-MiniLM-L6-v2`，得到 384 维向量。
2. 用 UMAP 降到约 5 维。BERT 嵌入维度太高，不适合直接聚类。
3. 用 HDBSCAN 聚类。它基于密度，能产生大小不一的簇和一个“离群值”标签。
4. 对每个簇，在簇内文档上计算基于类别的 TF-IDF，提取排名最高的词。

输出是每篇文档一个主题，外加 -1 离群标签；HDBSCAN 的概率向量还可以提供可选的软成员关系。

```figure
topic-drift
```

## 动手实现

### 步骤 1：使用 scikit-learn 运行 LDA

```python
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.decomposition import LatentDirichletAllocation
import numpy as np


def fit_lda(documents, n_topics=5, max_features=1000):
    cv = CountVectorizer(
        max_features=max_features,
        stop_words="english",
        min_df=2,
        max_df=0.9,
    )
    X = cv.fit_transform(documents)
    lda = LatentDirichletAllocation(
        n_components=n_topics,
        random_state=42,
        max_iter=50,
        learning_method="online",
    )
    doc_topic = lda.fit_transform(X)
    feature_names = cv.get_feature_names_out()
    return lda, cv, doc_topic, feature_names


def print_top_words(lda, feature_names, n_top=10):
    for idx, topic in enumerate(lda.components_):
        top_idx = np.argsort(-topic)[:n_top]
        words = [feature_names[i] for i in top_idx]
        print(f"topic {idx}: {' '.join(words)}")
```

注意：这里删除停用词，用 `min_df` 与 `max_df` 过滤稀有和遍布语料的词，并使用 `CountVectorizer`，不能使用 `TfidfVectorizer`，因为 LDA 需要原始计数。

### 步骤 2：BERTopic（生产）

```python
from bertopic import BERTopic

topic_model = BERTopic(
    embedding_model="sentence-transformers/all-MiniLM-L6-v2",
    min_topic_size=15,
    verbose=True,
)

topics, probs = topic_model.fit_transform(documents)
info = topic_model.get_topic_info()
print(info.head(20))
valid_topics = info[info["Topic"] != -1]["Topic"].tolist()
for topic_id in valid_topics[:5]:
    print(f"topic {topic_id}: {topic_model.get_topic(topic_id)[:10]}")
```

对 `Topic != -1` 的过滤会删除 BERTopic 的离群桶，即 HDBSCAN 无法聚类的文档。`min_topic_size` 控制 HDBSCAN 的最小簇大小；BERTopic 库默认值为 10。本例按课程规模显式设置为 15。语料超过一万篇文档时，可以增加到 50 或 100。

### 步骤 3：评估

两种方法都输出主题词，问题在于这些词是否连贯。

- **主题连贯度（c_v）。** 在滑动窗口上下文中计算排名靠前词对的 NPMI（归一化逐点互信息），把分数聚合成主题向量，再用余弦相似度比较这些向量。越高越好。使用 `gensim.models.CoherenceModel` 并设置 `coherence="c_v"`。
- **主题多样性。** 所有主题的高排名词中，唯一词所占比例。越高越好，表示主题之间不重叠。
- **定性检查。** 阅读每个主题的高排名词。它们是否命名了一个真实事物？人工判断仍是最后一道防线。

## 怎样选择

| 场景 | 选择 |
|------|------|
| 短文本（推文、评论、标题） | BERTopic |
| 含主题混合的长文档 | LDA |
| 无 GPU 或计算量受限 | LDA 或 NMF |
| 需要文档级多主题分布 | LDA |
| 用 LLM 为主题命名 | BERTopic，直接支持 |
| 资源受限的端侧部署 | LDA |
| 追求最高语义连贯度 | BERTopic |

最重要的现实因素是文档长度。BERT 嵌入会截断，LDA 计数可以处理任意长度。文档超过嵌入模型上下文时，应先分块再聚合，或使用 LDA。

## 使用现成工具

2026 年技术栈：

- **BERTopic。** 短文本和任何语义优先任务的默认选择。
- **`gensim.models.LdaModel`。** 生产经典 LDA，成熟且久经检验。
- **`sklearn.decomposition.LatentDirichletAllocation`。** 适合实验的简便 LDA。
- **NMF。** 非负矩阵分解，LDA 的快速替代方案，在短文本上质量接近。
- **Top2Vec。** 设计类似 BERTopic，社区较小，一些基准表现良好。
- **FASTopic。** 更新的方法，在超大语料上比 BERTopic 快。
- **基于 LLM 的标注。** 运行任意聚类，再提示模型为每个簇命名。

## 交付成果

保存为 `outputs/skill-topic-picker.md`：

```markdown
---
name: topic-picker
description: Pick LDA or BERTopic for a corpus. Specify library, knobs, evaluation.
version: 1.0.0
phase: 5
lesson: 15
tags: [nlp, topic-modeling]
---

Given a corpus description (document count, avg length, domain, language, compute budget), output:

1. Algorithm. LDA / NMF / BERTopic / Top2Vec / FASTopic. One-sentence reason.
2. Configuration. Number of topics: `recommended = max(5, round(sqrt(n_docs)))`, clamped to 200 for corpora under 40,000 docs; permit >200 only when the corpus is genuinely large (>40k) and note the increased compute cost. `min_df` / `max_df` filters and embedding model for neural approaches also belong here.
3. Evaluation. Topic coherence (c_v) via `gensim.models.CoherenceModel`, topic diversity, and a 20-sample human read.
4. Failure mode to probe. For LDA, "junk topics" absorbing stopwords and frequent terms. For BERTopic, the -1 outlier cluster swallowing ambiguous documents.

Refuse BERTopic on documents longer than the embedding model's context window without a chunking strategy. Refuse LDA on very short text (tweets, reviews under 10 tokens) as coherence collapses. Flag any n_topics choice below 5 as likely wrong; flag >200 on corpora under 40k docs as likely over-splitting.
```

## 练习

1. **简单。** 在 20 Newsgroups 数据集上拟合 5 个主题的 LDA，打印每个主题前 10 个词，再手工命名每个主题。算法找到了真实类别吗？
2. **中等。** 在同一个 20 Newsgroups 子集上拟合 BERTopic。与 LDA 比较主题数量、高排名词和定性连贯度。哪种方法更清晰地呈现真实类别？
3. **困难。** 在你的语料上计算 LDA 与 BERTopic 的 c_v 连贯度。分别用 5、10、20、50 个主题运行，绘制连贯度随主题数变化的曲线，并报告哪种方法对主题数更稳定。

## 关键术语

| 术语 | 常见说法 | 准确含义 |
|------|----------|----------|
| 主题（topic） | 语料所谈的一件事 | 词上的概率分布（LDA）或相似文档簇（BERTopic）。 |
| 混合成员关系（mixed membership） | 一篇文档属于多个主题 | LDA 为每篇文档分配所有主题上的概率分布。 |
| UMAP | 降维 | 保留局部结构的流形学习方法，BERTopic 会使用它。 |
| HDBSCAN | 密度聚类 | 寻找大小不一的簇，为离群值生成“噪声”标签 -1。 |
| c_v 连贯度 | 主题质量指标 | 滑动窗口中高排名主题词的平均逐点互信息。 |

## 延伸阅读

- [Blei, Ng, Jordan (2003). Latent Dirichlet Allocation](https://www.jmlr.org/papers/volume3/blei03a/blei03a.pdf)：LDA 论文。
- [Grootendorst (2022). BERTopic: Neural topic modeling with a class-based TF-IDF procedure](https://arxiv.org/abs/2203.05794)：BERTopic 论文。
- [Röder, Both, Hinneburg (2015). Exploring the Space of Topic Coherence Measures](https://svn.aksw.org/papers/2015/WSDM_Topic_Evaluation/public.pdf)：提出 c_v 等指标的论文。
- [BERTopic 文档](https://maartengr.github.io/BERTopic/)：生产参考，示例质量很好。
