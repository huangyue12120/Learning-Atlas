---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/05-nlp-foundations-to-advanced/13-question-answering/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 0fcd3cb8c48f9b9f0a1597958ed41da266022394329bd44bf1c29eae8453d7f9
status: reviewed
---

# 问答系统

> 三类系统塑造了现代问答：抽取式系统寻找跨度，检索增强系统用文档提供依据，生成式系统产出答案。现代 AI 助理都是三者的组合。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 5 第 11 课（机器翻译）、Phase 5 第 10 课（注意力机制）  
**预计时间：** 约 75 分钟

## 问题

用户输入“When did the first iPhone launch?”，期待得到“June 29, 2007.”，而不是“Apple's history is long and varied.”，也不是孤零零的“2007”。答案必须直接、有依据且正确。

过去十年有三种问答架构占据主导。

- **抽取式问答。** 给定一个确定包含答案的问题与段落，寻找答案跨度在段落中的起止索引。SQuAD 是经典基准。
- **开放域问答。** 不提供段落。先检索相关段落，再抽取或生成答案。这是当前所有 RAG 流水线的基础。
- **生成式或闭卷问答。** 大语言模型从参数记忆中回答，不执行检索。推理最快，事实可靠性最低。

2026 年的趋势是混合架构：检索少量最优段落，再提示生成模型根据这些段落回答。这种架构称为 RAG。第 14 课会深入讲解检索部分，本课构建问答部分。

## 概念

![问答架构：抽取式、检索增强式、生成式](../assets/qa.svg)

**抽取式。** 用 BERT 系 Transformer 共同编码问题和段落。训练两个头，分别预测答案在词元序列中的开始与结束索引。损失是有效位置上的交叉熵，输出是段落内的一段跨度。它从结构上不会产生幻觉，也从结构上无法处理段落中没有答案的问题。

**检索增强式（RAG）。** 分两阶段。检索器先从语料中找到前 `k` 个段落，阅读器再用这些段落抽取或生成答案。检索器与阅读器拆开后，可以独立训练和评估。现代 RAG 常在二者之间增加重排器。

**生成式。** GPT、Claude、Llama 等仅解码器 LLM 从学到的权重中回答，不执行检索。常见知识表现出色，稀有或近期事实则可能完全错误。幻觉率与事实在预训练数据中的频率负相关。

```figure
qa-span
```

## 动手实现

### 步骤 1：使用预训练模型执行抽取式问答

```python
from transformers import pipeline

qa = pipeline("question-answering", model="deepset/roberta-base-squad2")

passage = (
    "Apple Inc. released the first iPhone on June 29, 2007. "
    "The device was announced by Steve Jobs at Macworld in January 2007."
)
question = "When was the first iPhone released?"

answer = qa(question=question, context=passage)
print(answer)
```

```python
{'score': 0.98, 'start': 57, 'end': 70, 'answer': 'June 29, 2007'}
```

`deepset/roberta-base-squad2` 在包含不可回答问题的 SQuAD 2.0 上训练。默认情况下，即使模型的空答案分数最高，`question-answering` 流水线也会返回得分最高的跨度，并不会自动返回空答案。若需要明确的“无答案”行为，请在调用流水线时传入 `handle_impossible_answer=True`；只有空答案分数超过所有跨度分数时，流水线才返回空答案。无论如何都要检查 `score` 字段。

### 步骤 2：检索增强流水线（示意） <!-- learning-atlas: step-2-a-retrieval-augmented-pipeline-sketch -->

```python
from sentence_transformers import SentenceTransformer
import numpy as np

encoder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

corpus = [
    "Apple Inc. released the first iPhone on June 29, 2007.",
    "Macworld 2007 featured the iPhone announcement by Steve Jobs.",
    "Android launched in 2008 as Google's mobile operating system.",
    "The first iPod was released in 2001.",
]
corpus_embeddings = encoder.encode(corpus, normalize_embeddings=True)


def retrieve(question, top_k=2):
    q_emb = encoder.encode([question], normalize_embeddings=True)
    sims = (corpus_embeddings @ q_emb.T).squeeze()
    order = np.argsort(-sims)[:top_k]
    return [corpus[i] for i in order]


def answer(question):
    passages = retrieve(question, top_k=2)
    combined = " ".join(passages)
    return qa(question=question, context=combined)


print(answer("When was the first iPhone released?"))
```

这是两阶段流水线。稠密检索器 Sentence-BERT 按语义相似度寻找相关段落，抽取式阅读器 RoBERTa-SQuAD 从拼接的候选段落中提取答案跨度。它适用于小型语料。面对百万篇文档，应使用 FAISS 或向量数据库。

### 步骤 3：使用 RAG 生成答案

```python
def rag_generate(question, llm):
    passages = retrieve(question, top_k=3)
    prompt = f"""Context:
{chr(10).join('- ' + p for p in passages)}

Question: {question}

Answer using only the context above. If the context does not contain the answer, say "I don't know."
"""
    return llm(prompt)
```

提示模式很重要。明确要求模型只依据上下文，并在上下文不足时回答“I don't know”，相比朴素提示可降低 40% 至 60% 的幻觉率。更复杂的模式会加入引用、置信度和结构化提取。

### 步骤 4：反映真实世界的评估

SQuAD 使用**精确匹配（Exact Match，EM）**和**词元级 F1**。EM 在归一化后执行严格匹配，包括转小写、删除标点和冠词；完全匹配得 1，否则得 0。F1 根据预测与参考答案的词元重叠计算，可以得到部分分数。两者都会低估释义：“June 29, 2007”与“June 29th, 2007”通常得到 0 EM，因为序数形式不会被归一化掉，但重叠词元仍会带来可观 F1。

生产问答应评估：

- **答案准确性**，由 LLM 或人工评判，因为普通指标无法识别语义等价。
- **引用准确性。** 引用段落是否真的支持答案？可以自动检查生成引用与检索段落之间的字符串匹配。
- **拒答校准。** 检索段落不含答案时，系统是否会正确说“I don't know”？测量错误自信率。
- **检索召回率。** 评估阅读器之前，先测量检索器能否把正确段落带入前 `k` 个结果。阅读器无法修复缺失段落。

### RAGAS：2026 年生产评估框架

`RAGAS` 专为 RAG 系统设计，是 2026 年的交付默认框架。它不需要标准参考答案就能评估四个维度：

- **忠实度（faithfulness）。** 答案中的每条主张是否来自检索上下文？通过基于 NLI 的蕴含判断测量，是主要幻觉指标。
- **答案相关性。** 答案是否回应问题？从答案生成假设问题，再与真实问题比较。
- **上下文精确率。** 检索到的文本块中有多少真正相关？低精确率表示提示中噪声多。
- **上下文召回率。** 检索结果是否包含所需全部信息？低召回率意味着阅读器不可能成功。

无参考评估允许你在没有整理标准答案的情况下评估生产流量。对精确匹配完全无用的开放问题，还可以叠加 LLM 评判。

执行 `pip install ragas`，接入检索器与阅读器，即可得到每条查询的四个标量，并据此设置回归告警。

## 使用现成工具

2026 年技术栈：

| 用例 | 推荐方案 |
|------|----------|
| 给定段落，寻找答案跨度 | `deepset/roberta-base-squad2` |
| 面向固定语料，不能接受闭卷答案 | RAG：稠密检索器加 LLM 阅读器 |
| 实时查询文档库 | RAG：混合检索器（BM25 加稠密检索）与重排器，见第 14 课 |
| 对话问答（包含追问） | 带对话历史的 LLM，每一轮都执行 RAG |
| 高度事实化、受监管领域 | 在权威语料上执行抽取式问答，绝不能单用生成模型 |

到 2026 年，抽取式问答已不再流行，因为带 LLM 的 RAG 能处理更多情形。但在法律研究、监管合规和审计工具等必须逐字引用的场景，它仍在生产中使用。

## 交付成果

保存为 `outputs/skill-qa-architect.md`：

```markdown
---
name: qa-architect
description: Choose QA architecture, retrieval strategy, and evaluation plan.
version: 1.0.0
phase: 5
lesson: 13
tags: [nlp, qa, rag]
---

Given requirements (corpus size, question type, factuality constraint, latency budget), output:

1. Architecture. Extractive, RAG with extractive reader, RAG with generative reader, or closed-book LLM. One-sentence reason.
2. Retriever. None, BM25, dense (name the encoder), or hybrid.
3. Reader. SQuAD-tuned model, LLM by name, or "domain-fine-tuned DistilBERT."
4. Evaluation. EM + F1 for extractive benchmarks; answer accuracy + citation accuracy + refusal calibration for production. Name what you are measuring and how you are measuring it.

Refuse closed-book LLM answers for regulatory or compliance-sensitive questions. Refuse any QA system without a retrieval-recall baseline (you cannot evaluate the reader without knowing the retriever surfaced the right passage). Flag questions that require multi-hop reasoning as needing specialized multi-hop retrievers like HotpotQA-trained systems.
```

## 练习

1. **简单。** 在 10 个 Wikipedia 段落上搭建上面的 SQuAD 抽取流水线，手工编写 10 个问题并测量答案正确次数。若段落与问题干净，应答对 7 至 9 个。
2. **中等。** 加入拒答分类器。当最高检索分数低于阈值，例如余弦相似度 0.3 时，返回“I don't know”，不再调用阅读器。在留出集上调整阈值。
3. **困难。** 在自选的一万篇文档语料上构建 RAG 流水线。使用 RRF 融合实现混合检索（BM25 加稠密检索，见第 14 课），测量加入混合检索前后的答案准确率，并记录哪类问题获益最多。

## 关键术语

| 术语 | 常见说法 | 准确含义 |
|------|----------|----------|
| 抽取式问答 | 寻找答案跨度 | 预测给定段落中答案的开始与结束索引。 |
| 开放域问答 | 在语料上问答 | 不提供段落，必须先检索再回答。 |
| RAG | 检索后生成 | 检索增强生成，由检索器与阅读器组成。 |
| SQuAD | 经典基准 | Stanford Question Answering Dataset，使用 EM 与 F1 指标。 |
| 幻觉 | 编造答案 | 阅读器输出没有得到检索上下文支持。 |
| 拒答校准 | 知道何时闭嘴 | 系统无法回答时能正确说“I don't know”。 |

## 延伸阅读

- [Rajpurkar et al. (2016). SQuAD: 100,000+ Questions for Machine Comprehension of Text](https://arxiv.org/abs/1606.05250)：基准论文。
- [Karpukhin et al. (2020). Dense Passage Retrieval for Open-Domain QA](https://arxiv.org/abs/2004.04906)：DPR，经典问答稠密检索器。
- [Lewis et al. (2020). Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401)：命名 RAG 的论文。
- [Gao et al. (2023). Retrieval-Augmented Generation for Large Language Models: A Survey](https://arxiv.org/abs/2312.10997)：完整的 RAG 综述。
