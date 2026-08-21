---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/05-nlp-foundations-to-advanced/23-chunking-strategies-rag/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: b8b7d9323c9387e7f6b96b5590b767631de766b169b081a128bc70c9648b7372
status: reviewed
---

# RAG 分块策略

> 分块配置对检索质量的影响与嵌入模型选择相当（Vectara，NAACL 2025）。分块一旦出错，再多重排也无法挽救。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 5 第 14 课（信息检索）、Phase 5 第 22 课（嵌入模型）  
**预计时间：** 约 60 分钟

## 问题

你把一份 50 页的合同放进 RAG 系统。用户问：“What is the termination clause?”检索器却返回封面。原因是模型用 512 词元的块训练，而终止条款位于第 20 页，内容跨越分页符被切断，局部也没有能与查询对应的关键词。

先从分块策略入手，不要急着更换嵌入模型。块应该多大？需要重叠吗？在哪里切分？是否加入周边上下文？

2026 年 2 月的基准测试得到了一些意外结果：

- Vectara 2026 年研究：递归 512 词元分块以 69% 对 54% 的准确率超过语义分块。
- Natural Questions 上的 SPLADE + Mistral-8B：重叠没有带来可测量的收益。
- 上下文悬崖：上下文达到约 2,500 个词元时，回答质量会急剧下降。

“显而易见”的答案，即语义分块、20% 重叠和 1,000 个词元，往往不对。下面比较六种策略及各自的适用时机。

## 概念

![在同一段落上展示六种分块策略](../assets/chunking.svg)

**固定分块（fixed chunking）。** 每 N 个字符或词元切分一次，是最简单的基线。它会从句子中间切断，压缩效果好，连贯性差。

**递归分块（recursive）。** LangChain 的 `RecursiveCharacterTextSplitter`。先尝试按 `\n\n` 切分，再依次尝试 `\n`、`.` 和空格，最后可以平稳回退。它是 2026 年的默认策略。

**语义分块（semantic）。** 编码每个句子，计算相邻句子的余弦相似度，在相似度低于阈值处切分。它保留主题连贯性，但速度较慢，有时会产生只有 40 个词元的小片段，反而伤害检索。

**句子分块（sentence）。** 按句子边界切分，每个块包含一句或 N 句组成的窗口。文档不超过约 5k 词元时，它的效果与语义分块相当，成本却低得多。

**父文档分块（parent-document）。** 保存用于检索的小型子块，同时保存用于上下文的较大父块。按子块检索，返回父块。它能平稳退化：不理想的子块仍会返回合理的父块。

**后期分块（late chunking，2024）。** 先在词元级编码完整文档，再把词元嵌入汇聚成块嵌入，从而保留跨块上下文。它适用于长上下文嵌入器（BGE-M3、Jina v3），计算成本较高。

**上下文化检索（contextual retrieval，Anthropic，2024）。** 在每个块前添加由 LLM 生成的文档位置摘要，如“This chunk is section 3.2 of the termination clauses...”。Anthropic 自有基准显示它能把检索结果提升 35% 至 50%，代价是昂贵的索引构建。

### 胜过所有默认值的规则

让块大小匹配查询类型：

| 查询类型 | 块大小 |
|----------|--------|
| 事实型（“CEO 叫什么名字？”） | 256–512 个词元 |
| 分析型或多跳型 | 512–1024 个词元 |
| 理解完整小节 | 1024–2048 个词元 |

这些数值来自 NVIDIA 2026 年基准。块要大到足以容纳答案和局部上下文，也要小到让检索器返回的前 K 个结果聚焦答案，避免上下文噪声。

```figure
n5-chunk-cuts
```

## 动手实现

### 步骤 1：固定分块与递归分块

```python
def chunk_fixed(text, size=512, overlap=0):
    step = size - overlap
    return [text[i:i + size] for i in range(0, len(text), step)]


def chunk_recursive(text, size=512, seps=("\n\n", "\n", ". ", " ")):
    if len(text) <= size:
        return [text]
    for sep in seps:
        if sep not in text:
            continue
        parts = text.split(sep)
        chunks = []
        buf = ""
        for p in parts:
            if len(p) > size:
                if buf:
                    chunks.append(buf)
                    buf = ""
                chunks.extend(chunk_recursive(p, size=size, seps=seps[1:] or (" ",)))
                continue
            candidate = buf + sep + p if buf else p
            if len(candidate) <= size:
                buf = candidate
            else:
                if buf:
                    chunks.append(buf)
                buf = p
        if buf:
            chunks.append(buf)
        return [c for c in chunks if c.strip()]
    return chunk_fixed(text, size)
```

### 步骤 2：语义分块

```python
def chunk_semantic(text, encoder, threshold=0.6, min_chars=200, max_chars=2048):
    sentences = split_sentences(text)
    if not sentences:
        return []
    embs = encoder.encode(sentences, normalize_embeddings=True)
    chunks = [[sentences[0]]]
    for i in range(1, len(sentences)):
        sim = float(embs[i] @ embs[i - 1])
        current_len = sum(len(s) for s in chunks[-1])
        if sim < threshold and current_len >= min_chars:
            chunks.append([sentences[i]])
        else:
            chunks[-1].append(sentences[i])

    result = []
    for group in chunks:
        text_group = " ".join(group)
        if len(text_group) > max_chars:
            result.extend(chunk_recursive(text_group, size=max_chars))
        else:
            result.append(text_group)
    return result
```

需要在你的领域上调优 `threshold`。过高会产生碎片，过低则会形成一个巨块。

### 步骤 3：父文档分块

```python
def chunk_parent_child(text, parent_size=2048, child_size=256):
    parents = chunk_recursive(text, size=parent_size)
    mapping = []
    for p_idx, parent in enumerate(parents):
        children = chunk_recursive(parent, size=child_size)
        for child in children:
            mapping.append({"child": child, "parent_idx": p_idx, "parent": parent})
    return mapping


def retrieve_parent(child_query, mapping, encoder, top_k=3):
    child_embs = encoder.encode([m["child"] for m in mapping], normalize_embeddings=True)
    q_emb = encoder.encode([child_query], normalize_embeddings=True)[0]
    scores = child_embs @ q_emb
    top = np.argsort(-scores)[:top_k]
    seen, parents = set(), []
    for i in top:
        if mapping[i]["parent_idx"] not in seen:
            parents.append(mapping[i]["parent"])
            seen.add(mapping[i]["parent_idx"])
    return parents
```

关键在于去重父块。多个子块可能映射到同一个父块，全部返回会浪费上下文。

### 步骤 4：上下文化检索（Anthropic 模式）

```python
def contextualize_chunks(document, chunks, llm):
    context_prompts = [
        f"""<document>{document}</document>
Here is the chunk to situate: <chunk>{c}</chunk>
Write 50-100 words placing this chunk in the document's context."""
        for c in chunks
    ]
    contexts = llm.batch(context_prompts)
    return [f"{ctx}\n\n{c}" for ctx, c in zip(contexts, chunks)]
```

对加入上下文后的块建立索引。查询时，额外的周边信息会帮助检索。

### 步骤 5：评估

```python
def recall_at_k(queries, corpus_chunks, encoder, k=5):
    chunk_embs = encoder.encode(corpus_chunks, normalize_embeddings=True)
    hits = 0
    for q_text, gold_idxs in queries:
        q_emb = encoder.encode([q_text], normalize_embeddings=True)[0]
        top = np.argsort(-(chunk_embs @ q_emb))[:k]
        if any(i in gold_idxs for i in top):
            hits += 1
    return hits / len(queries)
```

必须运行基准测试。最适合你的语料的策略可能与任何博客文章都不一致。

## 陷阱

- **只用事实型查询评估分块。** 多跳查询会选出完全不同的优胜者。评估集应按查询类型分层。
- **语义分块未设最小大小。** 它会产生伤害检索的 40 词元片段。务必强制 `min_tokens`。
- **把重叠当成惯例。** 2026 年研究发现，重叠往往没有收益，却让索引成本翻倍。需要测量，不能假定。
- **不限制最小值与最大值。** 5 个词元和 5,000 个词元的块都会破坏检索，应限制范围。
- **跨文档分块。** 绝不能让一个块跨越两份文档。应逐文档分块，再合并结果。

## 使用现成工具

2026 年的技术栈：

| 场景 | 策略 |
|------|------|
| 首次构建、语料未知 | 递归、512 个词元、无重叠 |
| 事实型问答 | 递归、256–512 个词元 |
| 分析型或多跳型 | 递归、512–1024 个词元 + 父文档分块 |
| 大量交叉引用（合同、论文） | 后期分块或上下文化检索 |
| 会话或对话语料 | 按轮次分块 + 说话者元数据 |
| 短文本（推文、评论） | 一份文档就是一个块 |

从递归 512 开始，在含 50 个查询的评估集上测量 recall@5，再据此调优。

## 交付成果

保存为 `outputs/skill-chunker.md`：

```markdown
---
name: chunker
description: Pick a chunking strategy, size, and overlap for a given corpus and query distribution.
version: 1.0.0
phase: 5
lesson: 23
tags: [nlp, rag, chunking]
---

Given a corpus (document types, avg length, domain) and query distribution (factoid / analytical / multi-hop), output:

1. Strategy. Recursive / sentence / semantic / parent-document / late / contextual. Reason.
2. Chunk size. Token count. Reason tied to query type.
3. Overlap. Default 0; justify if >0.
4. Min/max enforcement. `min_tokens`, `max_tokens` guards.
5. Evaluation plan. Recall@5 on 50-query stratified eval set (factoid, analytical, multi-hop).

Refuse any chunking strategy without min/max chunk size enforcement. Refuse overlap above 20% without an ablation showing it helps. Flag semantic chunking recommendations without a min-token floor.
```

## 练习

1. **简单。** 分别用 fixed(512, 0)、recursive(512, 0) 和 recursive(512, 100) 切分一份 20 页文档，比较块数量和边界质量。
2. **中等。** 在 5 份文档上构建含 30 个查询的评估集，测量递归分块、语义分块与父文档分块的 recall@5。哪种策略胜出？结果是否符合博客文章？
3. **困难。** 实现上下文化检索，测量它相对递归基线的 MRR 提升。报告索引成本（LLM 调用次数）与准确率增益。

## 关键术语

| 术语 | 常见说法 | 准确含义 |
|------|----------|----------|
| 块（chunk） | 文档的一部分 | 接受嵌入、索引与检索的子文档单元。 |
| 重叠（overlap） | 安全边际 | 相邻块共享的 N 个词元，2026 年基准中往往无用。 |
| 语义分块（semantic chunking） | 智能分块 | 在相邻句子嵌入相似度下降处切分。 |
| 父文档分块（parent-document） | 两级检索 | 检索小型子块，返回较大父块。 |
| 后期分块（late chunking） | 嵌入后再分块 | 在词元级编码完整文档，再汇聚成块向量。 |
| 上下文化检索（contextual retrieval） | Anthropic 的技巧 | 建立索引前，在每个块前添加 LLM 生成的摘要。 |
| 上下文悬崖（context cliff） | 2,500 词元墙 | RAG 中上下文达到约 2.5k 词元时出现的质量下降（2026 年 1 月）。 |

## 延伸阅读

- [Yepes 等 / LangChain：Recursive Character Splitting 文档](https://python.langchain.com/docs/how_to/recursive_text_splitter/)：生产默认方案。
- [Vectara（2024，NAACL 2025），Chunking configurations analysis](https://arxiv.org/abs/2410.13070)：分块与嵌入模型选择同样重要。
- [Jina AI：Late Chunking in Long-Context Embedding Models（2024）](https://jina.ai/news/late-chunking-in-long-context-embedding-models/)：后期分块论文。
- [Anthropic：Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval)：使用 LLM 生成上下文前缀，把检索结果提升 35% 至 50%。
- [NVIDIA 2026 分块大小基准，Premai 摘要](https://blog.premai.io/rag-chunking-strategies-the-2026-benchmark-guide/)：按查询类型选择块大小。
