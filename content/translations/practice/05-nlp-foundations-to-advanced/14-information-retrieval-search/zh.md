---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/05-nlp-foundations-to-advanced/14-information-retrieval-search/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 98979446e6bd498737c8ef8d4ce000e04f9345b82a5a860145bc5411cb71a2a3
status: reviewed
---

# 信息检索与搜索

> BM25 精确却脆弱，稠密检索覆盖广却会漏掉关键词。混合检索是 2026 年默认方案，之后都是调优。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 5 第 02 课（BoW 与 TF-IDF）、Phase 5 第 04 课（GloVe、FastText 与子词）  
**预计时间：** 约 75 分钟

## 问题

用户输入“what happens if someone lies to get money”，期望找到真正覆盖这种行为的法规“Section 420 IPC”。关键词搜索会完全漏掉它，因为没有共享词汇；若嵌入模型没有在法律文本上训练，语义搜索也会漏掉。真实搜索必须兼顾二者。

每个 RAG 系统、搜索框和文档网站模糊查询的下层都是信息检索（IR）流水线。2026 年在生产中奏效的架构由一串互补方法组成，每一步都捕捉前一步的失误。

本课实现每个组成部分，并说明它各自能捕捉哪些失效情形。

## 概念

![混合检索：BM25 + 稠密检索 + RRF + 交叉编码器重排](../assets/retrieval.svg)

共有四层，可按需选择。

1. **稀疏检索（BM25）。** 速度快、精确匹配能力强、语义能力差。它运行在倒排索引上，在数百万篇文档中每次查询不到 10 毫秒，擅长法规编号、产品代码、错误消息和命名实体。
2. **稠密检索。** 把查询和文档编码为向量，再执行最近邻搜索。它能捕捉释义和语义相似性，却会漏掉只差一个字符的精确关键词匹配。使用 FAISS 或向量数据库时，每次查询需 50 至 200 毫秒。
3. **融合。** 合并稀疏与稠密排名。倒数排名融合（RRF）是简单的默认方法，因为它忽略尺度不同的原始分数，只使用排名位置。若明确知道某类信号在领域中占主导，也可以加权融合。
4. **交叉编码器重排。** 取融合结果前 30 个，把查询与文档一起输入交叉编码器，逐对打分，再保留前 5 个。交叉编码器逐对运行比双编码器慢得多，却更准确；只在前 30 个候选上运行可以分摊成本。

三路检索（BM25、稠密检索和 SPLADE 等学习型稀疏检索）在 2026 年基准上胜过两路方案，但需要支持学习型稀疏索引的基础设施。对多数团队，两路检索加交叉编码器重排是最佳平衡点。

```figure
gx-hybrid-retrieval
```

## 动手实现

### 步骤 1：从零实现 BM25

```python
import math
import re
from collections import Counter

TOKEN_RE = re.compile(r"[a-z0-9]+")


def tokenize(text):
    return TOKEN_RE.findall(text.lower())


class BM25:
    def __init__(self, corpus, k1=1.5, b=0.75):
        if not corpus:
            raise ValueError("corpus must not be empty")
        self.corpus = [tokenize(d) for d in corpus]
        self.k1 = k1
        self.b = b
        self.n_docs = len(self.corpus)
        self.avg_dl = sum(len(d) for d in self.corpus) / self.n_docs
        self.df = Counter()
        for doc in self.corpus:
            for term in set(doc):
                self.df[term] += 1

    def idf(self, term):
        n = self.df.get(term, 0)
        return math.log(1 + (self.n_docs - n + 0.5) / (n + 0.5))

    def score(self, query, doc_idx):
        q_tokens = tokenize(query)
        doc = self.corpus[doc_idx]
        dl = len(doc)
        freq = Counter(doc)
        score = 0.0
        for term in q_tokens:
            f = freq.get(term, 0)
            if f == 0:
                continue
            numerator = f * (self.k1 + 1)
            denominator = f + self.k1 * (1 - self.b + self.b * dl / self.avg_dl)
            score += self.idf(term) * numerator / denominator
        return score

    def rank(self, query, top_k=10):
        scored = [(self.score(query, i), i) for i in range(self.n_docs)]
        scored.sort(reverse=True)
        return scored[:top_k]
```

需要知道两个参数。`k1=1.5` 控制词频饱和，值越高，词项重复得到的权重越大。`b=0.75` 控制长度归一化，0 表示忽略文档长度，1 表示完全归一化。默认值来自 Robertson 在原论文中的建议，很少需要调整。

### 步骤 2：用双编码器执行稠密检索

```python
from sentence_transformers import SentenceTransformer
import numpy as np


def build_dense_index(corpus, model_id="sentence-transformers/all-MiniLM-L6-v2"):
    encoder = SentenceTransformer(model_id)
    embeddings = encoder.encode(corpus, normalize_embeddings=True)
    return encoder, embeddings


def dense_search(encoder, embeddings, query, top_k=10):
    q_emb = encoder.encode([query], normalize_embeddings=True)
    sims = (embeddings @ q_emb.T).flatten()
    order = np.argsort(-sims)[:top_k]
    return [(float(sims[i]), int(i)) for i in order]
```

对嵌入执行 L2 归一化后，点积就等于余弦相似度。`all-MiniLM-L6-v2` 为 384 维，速度快，对多数英语检索任务已经足够强。多语言任务使用 `paraphrase-multilingual-MiniLM-L12-v2`；追求最高准确率则用 `bge-large-en-v1.5` 或 `e5-large-v2`。

### 步骤 3：倒数排名融合

```python
def reciprocal_rank_fusion(rankings, k=60):
    scores = {}
    for ranking in rankings:
        for rank, (_, doc_idx) in enumerate(ranking):
            scores[doc_idx] = scores.get(doc_idx, 0.0) + 1.0 / (k + rank + 1)
    fused = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return [(score, doc_idx) for doc_idx, score in fused]
```

常数 `k=60` 来自 RRF 原论文。`k` 越高，排名差异的贡献越平坦；`k` 越低，靠前位置越占主导。60 是论文默认值，很少需要调整。

### 步骤 4：混合搜索与重排

```python
from sentence_transformers import CrossEncoder

reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")


def hybrid_search(query, bm25, encoder, dense_embeddings, corpus, top_k=5, pool_size=30, reranker=reranker):
    sparse_ranking = bm25.rank(query, top_k=pool_size)
    dense_ranking = dense_search(encoder, dense_embeddings, query, top_k=pool_size)
    fused = reciprocal_rank_fusion([sparse_ranking, dense_ranking])[:pool_size]

    pairs = [(query, corpus[doc_idx]) for _, doc_idx in fused]
    scores = reranker.predict(pairs)
    reranked = sorted(zip(scores, [doc_idx for _, doc_idx in fused]), reverse=True)
    return reranked[:top_k]
```

这里组合了三个阶段。BM25 寻找词面匹配，稠密检索寻找语义匹配，RRF 无须校准分数就能合并两份排名。交叉编码器把查询与文档对一起输入，为前 30 个候选重新打分，捕捉双编码器遗漏的细粒度相关性，最终保留前 5 个。

### 步骤 5：评估

| 指标 | 含义 |
|------|------|
| Recall@k | 存在正确文档的查询中，有多大比例能在前 `k` 个结果找到它？ |
| MRR（Mean Reciprocal Rank） | 第一个相关文档排名倒数的平均值。 |
| nDCG@k | 考虑相关性等级，而不只区分相关与否。 |

对 RAG 而言，检索器的 **Recall@k** 是最重要的数值。正确段落没有进入检索集，阅读器就无法回答。

调试失败查询时，应比较稀疏与稠密排名。若一方找到正确文档、另一方没有，可能是词表不匹配，修复方法是补上缺少的检索分支；也可能是语义歧义，需要更好的嵌入或重排器。

## 使用现成工具

2026 年技术栈：

| 规模 | 技术栈 |
|------|--------|
| 1000 至 10 万篇文档 | 内存 BM25 + `all-MiniLM-L6-v2` 嵌入 + RRF，无须独立数据库。 |
| 10 万至 1000 万篇文档 | 稠密侧用 FAISS 或 pgvector，BM25 侧用 Elasticsearch / OpenSearch，并行运行。 |
| 1000 万篇以上 | 使用支持混合检索的 Qdrant / Weaviate / Vespa / Milvus，再对前 30 个结果执行交叉编码器重排。 |
| 追求前沿最高质量 | 三路检索（BM25 + 稠密 + SPLADE）加 ColBERT 后期交互重排。 |

无论选择什么方案，都要为评估留出预算。先测检索召回率，再测端到端 RAG 准确率。阅读器无法修复检索器漏掉的信息。

### 2026 年生产 RAG 的经验教训

- **80% 的 RAG 故障来自摄取与分块，而不是模型。** 团队花几周更换 LLM、调整提示，检索却每三次查询就悄悄返回一次错误上下文。应先修复分块。
- **分块策略比块大小重要。** 固定长度切分会破坏表格、代码和嵌套标题。默认应按句子感知切分；技术文档和产品手册值得使用语义或 LLM 分块。
- **父文档模式。** 检索小型“子块”以获得精确率；同一父章节出现多个子块时，换入父块保留上下文。它无需重新训练就能稳定提升答案质量。
- **`k_rerank=3` 通常最优。** 超过三个文本块后，每增加一块都会提高词元成本和生成延迟，却不再提高答案质量。若 `k=8` 仍明显胜过 `k=3`，说明重排器表现不足。
- **HyDE 或查询扩展。** 根据查询生成假设答案，再嵌入该答案执行检索，弥合短问题与长文档的措辞差距，无须训练即可提高精确率。
- **上下文预算应低于 8K 词元。** 若持续达到上限，说明重排阈值太宽松。
- **为一切做版本管理。** 提示、分块规则、嵌入模型和重排器都要版本化。任何漂移都会静默破坏答案质量。可在 CI 中为忠实度、上下文精确率和未回答问题率设置门禁，避免回归进入用户环境。
- **三路检索（BM25 + 稠密 + SPLADE 等学习型稀疏检索）在 2026 年基准上胜过两路检索**，尤其适合同时包含专有名词与语义的查询。基础设施支持 SPLADE 索引时即可采用。

2026 年行业测量显示，良好的检索设计可降低 70% 至 90% 的幻觉。多数 RAG 性能收益来自更好的检索，而不是模型微调。

## 交付成果

保存为 `outputs/skill-retrieval-picker.md`：

```markdown
---
name: retrieval-picker
description: Pick a retrieval stack for a given corpus and query pattern.
version: 1.0.0
phase: 5
lesson: 14
tags: [nlp, retrieval, rag, search]
---

Given requirements (corpus size, query pattern, latency budget, quality bar, infra constraints), output:

1. Stack. BM25 only, dense only, hybrid (BM25 + dense + RRF), hybrid + cross-encoder rerank, or three-way (BM25 + dense + learned-sparse).
2. Dense encoder. Name the specific model. Match to language(s), domain, and context length.
3. Reranker. Name the specific cross-encoder model if used. Flag that rerank adds 30-100ms latency on top-30.
4. Evaluation plan. Recall@10 is the primary retriever metric. MRR for multi-answer. Baseline first, incremental improvements measured against it.

Refuse to recommend dense-only for corpora with named entities, error codes, or product SKUs unless the user has evidence dense handles exact matches. Refuse to skip reranking for high-stakes retrieval (legal, medical) where the final top-5 decides the user's answer.
```

## 练习

1. **简单。** 在 500 篇文档的语料上实现上面的 `hybrid_search`，用 20 个查询测试，对比仅 BM25、仅稠密检索与混合检索的 Recall@5。
2. **中等。** 加入 MRR 计算。对每个已知正确文档的测试查询，找出正确文档在 BM25、稠密和混合排名中的位置，并报告三者 MRR。
3. **困难。** 使用 Sentence Transformers 的 MultipleNegativesRankingLoss 在目标领域微调稠密编码器。从 500 对查询与文档构建训练集，比较微调前后的召回率。

## 关键术语

| 术语 | 常见说法 | 准确含义 |
|------|----------|----------|
| BM25 | 关键词搜索 | Okapi BM25，根据词频、IDF 和长度为文档打分。 |
| 稠密检索（dense retrieval） | 向量搜索 | 把查询和文档编码为向量，寻找最近邻。 |
| 双编码器（bi-encoder） | 嵌入模型 | 分别编码查询与文档，查询时速度快。 |
| 交叉编码器（cross-encoder） | 重排模型 | 把查询与文档一起编码，速度慢但准确。 |
| RRF | 排名融合 | 对两份排名的 `1/(k + rank)` 求和。 |
| Recall@k | 检索指标 | 相关文档出现在前 `k` 个结果中的查询比例。 |

## 延伸阅读

- [Robertson and Zaragoza (2009). The Probabilistic Relevance Framework: BM25 and Beyond](https://www.staff.city.ac.uk/~sbrp622/papers/foundations_bm25_review.pdf)：BM25 的权威讲解。
- [Karpukhin et al. (2020). Dense Passage Retrieval for Open-Domain QA](https://arxiv.org/abs/2004.04906)：DPR，经典双编码器。
- [Formal et al. (2021). SPLADE: Sparse Lexical and Expansion Model](https://arxiv.org/abs/2107.05720)：缩小稀疏与稠密差距的学习型稀疏检索器。
- [Cormack, Clarke, Büttcher (2009). Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf)：RRF 论文。
- [Khattab and Zaharia (2020). ColBERT: Efficient and Effective Passage Search](https://arxiv.org/abs/2004.12832)：后期交互检索。
