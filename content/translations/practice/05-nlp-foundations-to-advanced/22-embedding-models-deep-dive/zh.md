---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/05-nlp-foundations-to-advanced/22-embedding-models-deep-dive/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: bfb5483ccac7e580a5256434b2a7e4ea749c30999fabc4aead4a95189e8c96b0
status: reviewed
---

# 嵌入模型：2026 年深入解析

> Word2Vec 为每个词生成一个向量。现代嵌入模型为每个段落生成可跨语言的向量，还能提供稀疏、稠密和多向量视图，并按索引预算调整维度。选错模型，RAG 就会检索错误内容。

**类型：** 学习  
**学习实现：** Python  
**前置课程：** Phase 5 第 03 课（Word2Vec）、Phase 5 第 14 课（信息检索）  
**预计时间：** 约 60 分钟

## 问题

你的 RAG 系统有 40% 的情况检索到错误段落。问题很少出在向量数据库或提示上，嵌入模型才是常见原因。

2026 年选择嵌入模型需要权衡五个维度：

1. **稠密、稀疏还是多向量。** 每段一个向量、每个词元一个向量，或带权重的稀疏词袋。
2. **语言覆盖。** 纯英语任务仍由单语言英语模型占优，混合语言语料则由多语言模型占优。
3. **上下文长度。** 512、8,192 或 32,768 个词元，实际有效容量通常只有标称最大值的 60% 至 70%。
4. **维度预算。** 3,072 个全精度浮点数意味着每个向量占 12 KB。达到 1 亿个向量时，存储费用是每月 1,300 美元。Matryoshka 截断可以把成本降至四分之一。
5. **开放还是托管。** 开放权重让你控制技术栈和数据；托管服务以控制权换取持续使用最新模型。

下面按这些权衡维度比较模型，以便依据证据选择，而不是追随上季度的流行模型。

## 概念

![稠密、稀疏与多向量嵌入](../assets/embedding-modes.svg)

**稠密嵌入（dense embedding）。** 每个段落一个向量，通常有 384 至 3,072 维。余弦相似度按语义接近程度排序段落。OpenAI `text-embedding-3-large`、BGE-M3 的稠密模式和 Voyage-3 都属于此类，也是默认选择。

**稀疏嵌入（sparse embedding）。** SPLADE 风格。Transformer 为词表中每个词元预测权重，再把绝大多数权重置零，得到大小为 |vocab| 的稀疏向量。它像 BM25 一样捕捉词汇匹配，却使用学得的词项权重，适合关键词密集的查询。

**多向量（后期交互）。** ColBERTv2、Jina-ColBERT 为每个词元生成一个向量。MaxSim 打分会为每个查询词元找出最相似的文档词元，再把分数相加。存储和打分成本更高，但在长查询与领域专用语料上表现更好。

**BGE-M3 同时提供三种模式。** 一个模型同时输出稠密、稀疏和多向量表示。三者可以独立查询，再以加权和融合分数。若希望用一个检查点灵活支持多种模式，它是 2026 年的默认选择。

**Matryoshka 表示学习。** 训练过程使向量前 N 个维度本身就构成有效嵌入。把 1,536 维向量截断至 256 维，准确率约损失 1%，存储却减少 6 倍。OpenAI text-3、Cohere v4、Voyage-4、Jina v5、Gemini Embedding 2 和 Nomic v1.5 及更新模型都支持它。

### MTEB 排行榜只说明部分情况

Massive Text Embedding Benchmark 最初于 2022 年发布，覆盖 8 种任务类型的 56 项任务，MTEB v2 已扩展到 100 多项。2026 年初，Gemini Embedding 2 以 67.71 的 MTEB-R 分数居检索榜首，Cohere embed-v4 以 65.2 领先通用榜单，BGE-M3 则以 63.0 领先开放权重多语言模型。排行榜是必要参考，却不足以代替领域基准测试。

### 三层模式

| 用例 | 模式 |
|------|------|
| 快速首轮检索 | 稠密双编码器（BGE-M3、text-3-small） |
| 提高召回率 | 稀疏检索（SPLADE、BGE-M3 sparse）+ RRF 融合 |
| 提升前 50 项的精度 | 多向量（ColBERTv2）或交叉编码器重排器 |

多数生产技术栈会同时使用三层。

```figure
gx-matryoshka
```

## 动手实现

### 步骤 1：基线，使用 Sentence-BERT 生成稠密嵌入

```python
from sentence_transformers import SentenceTransformer
import numpy as np

encoder = SentenceTransformer("BAAI/bge-small-en-v1.5")
corpus = [
    "The first iPhone launched in 2007.",
    "Apple released the iPod in 2001.",
    "Android is an operating system from Google.",
]
emb = encoder.encode(corpus, normalize_embeddings=True)

query = "When was the iPhone released?"
q_emb = encoder.encode([query], normalize_embeddings=True)[0]
scores = emb @ q_emb
print(sorted(enumerate(scores), key=lambda x: -x[1]))
```

`normalize_embeddings=True` 使点积等于余弦相似度，必须始终设置。

### 步骤 2：Matryoshka 截断

```python
def truncate(vectors, dim):
    out = vectors[:, :dim]
    return out / np.linalg.norm(out, axis=1, keepdims=True)

emb_256 = truncate(emb, 256)
emb_128 = truncate(emb, 128)
```

截断后需要重新归一化。Nomic v1.5、OpenAI text-3 与 Voyage-4 经过训练，前几个层级的截断几乎无损。非 Matryoshka 模型，如原始 Sentence-BERT，截断后会急剧退化。

### 步骤 3：BGE-M3 的多功能模式

```python
from FlagEmbedding import BGEM3FlagModel

model = BGEM3FlagModel("BAAI/bge-m3", use_fp16=True)

output = model.encode(
    corpus,
    return_dense=True,
    return_sparse=True,
    return_colbert_vecs=True,
)
# output["dense_vecs"]:    (n_docs, 1024)
# output["lexical_weights"]: list of dict {token_id: weight}
# output["colbert_vecs"]:  list of (n_tokens, 1024) arrays
```

一次推理调用生成三个索引。分数融合如下：

```python
dense_score = ... # cosine over dense_vecs
sparse_score = model.compute_lexical_matching_score(q_lex, d_lex)
colbert_score = model.colbert_score(q_col, d_col)
final = 0.4 * dense_score + 0.2 * sparse_score + 0.4 * colbert_score
```

需要在你的领域数据上调优权重。

### 步骤 4：在自定义任务上运行 MTEB 评估

```python
from mteb import MTEB

tasks = ["ArguAna", "SciFact", "NFCorpus"]
evaluation = MTEB(tasks=tasks)
results = evaluation.run(encoder, output_folder="./mteb-results")
```

在具有代表性的任务子集上运行候选模型。排行榜名次不能代替测试，因为领域会影响结果。

### 步骤 5：从零手工实现余弦相似度

实现见 `code/main.py`，它使用仅依赖标准库的平均 Hashing Trick 嵌入。效果无法与 Transformer 嵌入竞争，却展示了流程：分词 → 向量化 → 归一化 → 点积。

## 陷阱

- **查询与文档使用同一模型路径。** 某些模型（Voyage、Jina-ColBERT）采用非对称编码，查询和文档经过不同路径。务必查看模型卡。
- **遗漏前缀。** `bge-*` 模型需要在查询前加上 `"Represent this sentence for searching relevant passages: "`。漏掉会让召回率下降 3 至 5 点。
- **过度截断 Matryoshka。** 1,536 → 256 通常安全，1,536 → 64 并不安全。必须在评估集上验证。
- **上下文截断。** 多数模型会静默截断超过最大长度的输入。长文档需要分块，见第 23 课。
- **忽略尾延迟。** MTEB 分数不会显示 p99 延迟。6 亿参数模型可能只高 2 分，每次查询的成本却是 3.35 亿参数模型的 3 倍。

## 使用现成工具

2026 年的技术栈：

| 场景 | 选择 |
|------|------|
| 仅英语、高速、API | `text-embedding-3-large` 或 `voyage-3-large` |
| 开放权重、英语 | `BAAI/bge-large-en-v1.5` |
| 开放权重、多语言 | `BAAI/bge-m3` 或 `Qwen3-Embedding-8B` |
| 长上下文（32k 以上） | Voyage-3-large、Cohere embed-v4、Qwen3-Embedding-8B |
| 仅 CPU 部署 | Nomic Embed v2（1.37 亿参数，MoE） |
| 存储受限 | Matryoshka 截断 + int8 量化 |
| 关键词密集查询 | 加入 SPLADE 稀疏检索，与稠密检索做 RRF 融合 |

2026 年的模式是：先使用 BGE-M3 或 text-3-large，通过 MTEB 在你的领域上评估；若领域专用模型领先超过 3 点，再替换模型。

## 交付成果

保存为 `outputs/skill-embedding-picker.md`：

```markdown
---
name: embedding-picker
description: Pick embedding model, dimension, and retrieval mode for a given corpus and deployment.
version: 1.0.0
phase: 5
lesson: 22
tags: [nlp, embeddings, retrieval]
---

Given a corpus (size, languages, domain, avg length), deployment target (cloud / edge / on-prem), latency budget, and storage budget, output:

1. Model. Named checkpoint or API. One-sentence reason.
2. Dimension. Full / Matryoshka-truncated / int8-quantized. Reason tied to storage budget.
3. Mode. Dense / sparse / multi-vector / hybrid. Reason.
4. Query prefix / template if required by the model card.
5. Evaluation plan. MTEB tasks relevant to domain + held-out domain eval with nDCG@10.

Refuse recommendations that truncate Matryoshka to <64 dims without domain validation. Refuse ColBERTv2 for corpora under 10k passages (overhead not justified). Flag long-document corpora (>8k tokens) routed to models with 512-token windows.
```

## 练习

1. **简单。** 用 `bge-small-en-v1.5` 分别以完整维度（384）和 Matryoshka 128 维编码 100 个句子，测量 10 个查询上的 MRR 下降幅度。
2. **中等。** 在你所在领域的 500 个段落上比较 BGE-M3 的稠密、稀疏和 ColBERT 模式。哪一种的 recall@10 最高？RRF 融合是否超过最佳单一模式？
3. **困难。** 在与你的领域最相关的两项任务上，为三个候选模型运行 MTEB。报告 MTEB 分数、100 个查询批次的 p99 延迟，以及每 100 万次查询的费用，选择帕累托最优方案。

## 关键术语

| 术语 | 常见说法 | 准确含义 |
|------|----------|----------|
| 稠密嵌入（dense embedding） | 那个向量 | 每段文本对应一个固定大小的向量，用余弦相似度排序。 |
| 稀疏嵌入（sparse embedding） | 学习版 BM25 | 每个词表词元对应一个权重，绝大多数为零，通过端到端训练获得。 |
| 多向量（multi-vector） | ColBERT 风格 | 每个词元一个向量，使用 MaxSim 打分；索引更大，召回率更高。 |
| Matryoshka | 俄罗斯套娃技巧 | 向量前 N 个维度自身就是有效的较小嵌入。 |
| MTEB | 嵌入基准 | Massive Text Embedding Benchmark，发布时含 56 项任务，v2 超过 100 项。 |
| BEIR | 检索基准 | 18 项零样本检索任务，常用于衡量跨领域稳健性。 |
| 非对称编码（asymmetric encoding） | 查询路径 ≠ 文档路径 | 模型对查询与文档采用不同投影。 |

## 延伸阅读

- [Reimers、Gurevych（2019），Sentence-BERT](https://arxiv.org/abs/1908.10084)：双编码器论文。
- [Muennighoff 等（2022），MTEB: Massive Text Embedding Benchmark](https://arxiv.org/abs/2210.07316)：排行榜论文。
- [Chen 等（2024），BGE-M3: Multi-lingual, Multi-functionality, Multi-granularity](https://arxiv.org/abs/2402.03216)：统一三种模式的模型。
- [Kusupati 等（2022），Matryoshka Representation Learning](https://arxiv.org/abs/2205.13147)：维度阶梯训练目标。
- [Santhanam 等（2022），ColBERTv2: Effective and Efficient Retrieval via Lightweight Late Interaction](https://arxiv.org/abs/2112.01488)：生产中的后期交互。
- [Hugging Face 上的 MTEB 排行榜](https://huggingface.co/spaces/mteb/leaderboard)：实时排名。
