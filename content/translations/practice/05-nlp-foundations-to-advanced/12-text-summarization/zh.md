---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/05-nlp-foundations-to-advanced/12-text-summarization/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: d856ec071b1b46533679495c2c23bf7bfb8796e664589771f1dad37a30bf4623
status: reviewed
---

# 文本摘要

> 抽取式系统告诉你文档说了什么，生成式系统告诉你作者想表达什么。任务不同，陷阱也不同。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 5 第 02 课（BoW 与 TF-IDF）、Phase 5 第 11 课（机器翻译）  
**预计时间：** 约 75 分钟

## 问题

信息流中出现一篇 2000 词的新闻文章，你需要用 120 词概括它。可以从文中选出三个最重要的句子，也就是抽取式摘要；也可以用自己的话重写内容，也就是生成式摘要。二者都叫摘要，却是完全不同的问题。

抽取式摘要是排序问题。为每个句子打分，返回前 `k` 个。因为逐字摘自原文，输出一定符合语法；风险在于漏掉散布于全文的信息。

生成式摘要是生成问题。Transformer 以输入为条件生成新文本。输出流畅且压缩度高，却可能编造源文没有的事实，风险是自信地捏造内容。

本课实现两种方法，并说明各自独有的失效方式。

## 概念

![抽取式 TextRank 与生成式 Transformer](../assets/summarization.svg)

**抽取式。** 把文章视为一张图，句子是节点，相似度是边。在图上运行 PageRank 或类似算法，按句子与其他所有内容的连接程度打分。分数最高的句子组成摘要。经典实现是 **TextRank**（Mihalcea 与 Tarau，2004）。

**生成式。** 在文档与摘要对上微调 Transformer 编码器与解码器，例如 BART、T5、Pegasus。推理时，模型读取文档，通过交叉注意力逐词元生成摘要。Pegasus 使用缺口句子预训练目标，因此无须太多微调也很擅长摘要。

使用 **ROUGE**（Recall-Oriented Understudy for Gisting Evaluation）评估。ROUGE-1 与 ROUGE-2 衡量一元和二元语法重叠，ROUGE-L 衡量最长公共子序列。越高越好；40 ROUGE-L 表示“好”，50 表示“极佳”。论文通常同时报告三项。请使用 `rouge-score` 包。

```figure
summarize-collapse
```

## 动手实现

### 步骤 1：TextRank（抽取式）

```python
import math
import re
from collections import Counter


def sentence_split(text):
    return re.split(r"(?<=[.!?])\s+", text.strip())


def similarity(s1, s2):
    w1 = Counter(s1.lower().split())
    w2 = Counter(s2.lower().split())
    intersection = sum((w1 & w2).values())
    denom = math.log(len(w1) + 1) + math.log(len(w2) + 1)
    if denom == 0:
        return 0.0
    return intersection / denom


def textrank(text, top_k=3, damping=0.85, iterations=50, epsilon=1e-4):
    sentences = sentence_split(text)
    n = len(sentences)
    if n <= top_k:
        return sentences

    sim = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i != j:
                sim[i][j] = similarity(sentences[i], sentences[j])

    scores = [1.0] * n
    for _ in range(iterations):
        new_scores = [1 - damping] * n
        for i in range(n):
            total_out = sum(sim[i]) or 1e-9
            for j in range(n):
                if sim[i][j] > 0:
                    new_scores[j] += damping * sim[i][j] / total_out * scores[i]
        if max(abs(s - ns) for s, ns in zip(scores, new_scores)) < epsilon:
            scores = new_scores
            break
        scores = new_scores

    ranked = sorted(range(n), key=lambda k: scores[k], reverse=True)[:top_k]
    ranked.sort()
    return [sentences[i] for i in ranked]
```

这里有两个要点。相似度函数使用对数归一化词重叠，这是原始 TextRank 变体；也可以使用 TF-IDF 向量的余弦相似度。阻尼系数 0.85 和迭代次数沿用 PageRank 默认值。

### 步骤 2：用 BART 生成摘要

```python
from transformers import pipeline

summarizer = pipeline("summarization", model="facebook/bart-large-cnn")

article = """(long news article text)"""

summary = summarizer(article, max_length=120, min_length=60, do_sample=False)
print(summary[0]["summary_text"])
```

BART-large-CNN 在 CNN/DailyMail 语料上微调，开箱即可生成新闻风格摘要。面对科学论文、对话或法律文本等其他领域，应使用相应 Pegasus 检查点，或在目标数据上微调。

### 步骤 3：ROUGE 评估 <!-- learning-atlas: step-3-rouge-evaluation -->

```python
from rouge_score import rouge_scorer

scorer = rouge_scorer.RougeScorer(["rouge1", "rouge2", "rougeL"], use_stemmer=True)
scores = scorer.score(reference_summary, generated_summary)
print({k: round(v.fmeasure, 3) for k, v in scores.items()})
```

请始终使用词干提取。否则“running”与“run”会被算作不同词，ROUGE 会低估结果。

### 超越 ROUGE：2026 年摘要评估

ROUGE 主导摘要评估已有二十年，到 2026 年只靠它已不够。对 NLG 论文的大规模元分析显示：

- **BERTScore** 使用上下文嵌入相似度，使用率到 2023 年持续增长，如今多数摘要论文会与 ROUGE 一起报告。
- **BARTScore** 把评估视为生成：给定源文，由预训练 BART 为摘要分配似然分数。
- **MoverScore** 在上下文嵌入上计算 Earth Mover's Distance，因为比 ROUGE 更能捕捉语义重叠，在 2025 年摘要基准上升至首位。
- **FactCC** 与**基于 QA 的忠实度**在 2021 至 2023 年间常见，如今常被 **G-Eval** 取代。G-Eval 使用 GPT-4 提示链与思维链推理，对连贯性、一致性、流畅度和相关性打分。
- 评分量表设计良好时，**G-Eval** 和类似 LLM 评判方法与人工判断约有 80% 的一致率。

生产建议是报告 ROUGE-L 以便与旧结果比较，用 BERTScore 衡量语义重叠，用 G-Eval 判断连贯性和事实性，再用 50 至 100 个人工标注摘要完成校准。

### 步骤 4：事实性问题

生成式摘要容易产生幻觉。抽取式摘要逐字来自源文，幻觉风险低得多；但如果源句脱离上下文、内容过时或引用顺序错乱，仍可能误导。这是合规相关生产系统至今偏好抽取式方法的首要原因。

需要识别的幻觉类型：

- **实体替换。** 源文写“John Smith”，摘要写“John Brown”。
- **数字漂移。** 源文写“25,000”，摘要写“25 million”。
- **极性翻转。** 源文写“rejected the offer”，摘要写“accepted the offer”。
- **事实编造。** 源文没有提 CEO，摘要却说 CEO 批准了。

有效的评估方法：

- **FactCC。** 在源句与摘要句之间的蕴含关系上训练二元分类器，预测“符合事实”或“不符合事实”。
- **基于 QA 的事实性。** 向 QA 模型提出答案存在于源文的问题。若摘要支持不同答案，则标记异常。
- **实体级 F1。** 比较源文与摘要的命名实体。只出现在摘要中的实体值得怀疑。

新闻、医疗、法律和金融等面向用户且重视事实性的场景，应默认使用更安全的抽取式方法。生成式方案必须在环路中加入事实性检查。

## 使用现成工具

2026 年技术栈：

| 用例 | 推荐方案 |
|------|----------|
| 英语新闻，3 至 5 句摘要 | `facebook/bart-large-cnn` |
| 科学论文 | `google/pegasus-pubmed` 或微调 T5 |
| 多文档、长文本 | 任何上下文超过 32k 的 LLM 配合提示 |
| 对话摘要 | `philschmid/bart-large-cnn-samsum` |
| 抽取式，结构上具有低幻觉风险 | TextRank 或 `sumy` 的 LSA / LexRank |

若计算不是约束，带长上下文的 LLM 到 2026 年往往胜过专用模型。代价是成本与可复现性；专用模型输出更一致。

## 交付成果

保存为 `outputs/skill-summary-picker.md`：

```markdown
---
name: summary-picker
description: Pick extractive or abstractive, named library, factuality check.
version: 1.0.0
phase: 5
lesson: 12
tags: [nlp, summarization]
---

Given a task (document type, compliance requirement, length, compute budget), output:

1. Approach. Extractive or abstractive. Explain in one sentence why.
2. Starting model / library. Name it. `sumy.TextRankSummarizer`, `facebook/bart-large-cnn`, `google/pegasus-pubmed`, or an LLM prompt.
3. Evaluation plan. ROUGE-1, ROUGE-2, ROUGE-L (use rouge-score with stemming). Plus factuality check if abstractive.
4. One failure mode to probe. Entity swap is the most common in abstractive news summarization; flag samples where source entities do not appear in summary.

Refuse abstractive summarization for medical, legal, financial, or regulated content without a factuality gate. Flag input over the model's context window as needing chunked map-reduce summarization (not just truncation).
```

## 练习

1. **简单。** 在 5 篇新闻上运行 TextRank，把排名最高的 3 个句子与参考摘要比较，测量 ROUGE-L。在 CNN/DailyMail 风格文章上应达到 30 至 45 ROUGE-L。
2. **中等。** 实现实体级事实性检查：用 spaCy 提取源文和摘要中的命名实体，计算源实体在摘要中的召回率，以及摘要实体相对源文的精确率。高精确率、低召回率表示安全但简短；低精确率表示产生了实体幻觉。
3. **困难。** 在 50 篇 CNN/DailyMail 文章上比较 BART-large-CNN 与 LLM（Claude 或 GPT-4）。报告 ROUGE-L、实体 F1 事实性和每篇摘要成本，并记录各自胜出的场景。

## 关键术语

| 术语 | 常见说法 | 准确含义 |
|------|----------|----------|
| 抽取式（extractive） | 选择句子 | 逐字返回源文句子，不会编造新事实。 |
| 生成式（abstractive） | 重写 | 以源文为条件生成新文本，可能产生幻觉。 |
| ROUGE | 摘要指标 | 系统输出与参考摘要之间的 n-gram 或最长公共子序列重叠。 |
| TextRank | 基于图的抽取方法 | 在句子相似度图上运行 PageRank。 |
| 事实性（factuality） | 内容是否正确 | 摘要中的主张是否得到源文支持。 |
| 幻觉（hallucination） | 编造内容 | 摘要中存在源文不支持的内容。 |

## 延伸阅读

- [Mihalcea and Tarau (2004). TextRank: Bringing Order into Texts](https://aclanthology.org/W04-3252/)：经典抽取式论文。
- [Lewis et al. (2019). BART: Denoising Sequence-to-Sequence Pre-training](https://arxiv.org/abs/1910.13461)：BART 论文。
- [Zhang et al. (2019). PEGASUS: Pre-training with Extracted Gap-sentences](https://arxiv.org/abs/1912.08777)：Pegasus 与缺口句子目标。
- [Lin (2004). ROUGE: A Package for Automatic Evaluation of Summaries](https://aclanthology.org/W04-1013/)：ROUGE 论文。
- [Maynez et al. (2020). On Faithfulness and Factuality in Abstractive Summarization](https://arxiv.org/abs/2005.00661)：关于忠实度与事实性的综述论文。
