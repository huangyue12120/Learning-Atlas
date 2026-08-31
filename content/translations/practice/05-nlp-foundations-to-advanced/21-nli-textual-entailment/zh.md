---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/05-nlp-foundations-to-advanced/21-nli-textual-entailment/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 1e03d17a955ebb8a52c0f4a19079ae7dadac146e35edc98cd1488ffdaebc7450
status: reviewed
---

# 自然语言推断：文本蕴含

> “t 蕴含 h”是指人读完 t 后会认定 h 为真。NLI 负责预测蕴含、矛盾或中立。它表面平淡，却支撑着生产系统。

**类型：** 学习  
**学习实现：** Python  
**前置课程：** Phase 5 第 05 课（情感分析）、Phase 5 第 13 课（问答）  
**预计时间：** 约 60 分钟

## 问题

你构建了一个摘要器，它生成了一段摘要。怎样确认摘要中没有幻觉？

你构建了一个聊天机器人，它回答“yes”。怎样确认检索到的段落支持这个答案？

你需要按主题分类 10,000 篇新闻文章，却没有训练标签。能否复用某个模型？

这三个问题都可以归结为自然语言推断（Natural Language Inference，NLI）。NLI 询问：给定前提 `t` 与假设 `h`，`t` 是否蕴含 `h`、与 `h` 矛盾，或两者中立（无关）？

- **幻觉检查：** `t` = 源文档，`h` = 摘要主张。不构成蕴含就属于幻觉。
- **有依据的问答：** `t` = 检索段落，`h` = 生成答案。不构成蕴含就属于编造。
- **零样本分类：** `t` = 文档，`h` = 用语言表达的标签（“This is about sports”）。蕴含关系对应预测标签。

一个任务可以服务三种生产用途。因此，每套 RAG 评估框架内部都会使用 NLI 模型。

## 概念

![NLI：比较前提与假设的三分类](../assets/nli.svg)

**三个标签。**

- **蕴含（entailment）。** `t` → `h`。“The cat is on the mat”蕴含“There is a cat.”
- **矛盾（contradiction）。** `t` → ¬`h`。“The cat is on the mat”与“There is no cat.”矛盾。
- **中立（neutral）。** 两个方向都无法推断。“The cat is on the mat”对于“The cat is hungry.”属于中立。

**它不是逻辑蕴含。** NLI 中的“自然”语言推断指典型人类读者会做出的推断，而不是严格逻辑。“John walked his dog”在 NLI 中蕴含“John has a dog”，但严格的一阶逻辑只有在加入所有权公理后才会承认这一结论。

**数据集。**

- **SNLI**（2015）。57 万个人工标注样本对，以图像说明文字作为前提，领域较窄。
- **MultiNLI**（2017）。跨 10 个体裁的 43.3 万个样本对，是 2026 年的标准训练语料。
- **ANLI**（2019）。对抗式 NLI。人类专门编写能击败已有模型的样本，难度更高。
- **DocNLI、ConTRoL**（2020–21）。前提达到文档长度，测试多跳与长距离推断。

**架构。** Transformer 编码器（BERT、RoBERTa、DeBERTa）读取 `[CLS] premise [SEP] hypothesis [SEP]`，再把 `[CLS]` 表示送入三分类 softmax。在 MNLI 上训练并在留出基准上评估，对分布内样本对可以达到 90% 以上准确率。

**通过 NLI 实现零样本分类。** 给定文档和候选标签，把每个标签改写成假设（“This text is about sports”），计算各假设的蕴含概率，再选择最大者。这正是 Hugging Face `zero-shot-classification` 流水线背后的机制。

```figure
nli-router
```

## 动手实现

### 步骤 1：运行预训练 NLI 模型

```python
from transformers import pipeline

nli = pipeline("text-classification",
               model="facebook/bart-large-mnli",
               top_k=None)  # return all labels; replaces deprecated return_all_scores=True

premise = "The cat is sleeping on the couch."
hypothesis = "There is a cat in the room."

result = nli({"text": premise, "text_pair": hypothesis})[0]
print(result)
# [{'label': 'entailment', 'score': 0.97},
#  {'label': 'neutral', 'score': 0.02},
#  {'label': 'contradiction', 'score': 0.01}]
```

用于生产 NLI 时，`facebook/bart-large-mnli` 与 `microsoft/deberta-v3-large-mnli` 是开放模型的默认选择。DeBERTa-v3 位居排行榜前列。

### 步骤 2：零样本分类

```python
zs = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

text = "The stock market rallied after the central bank cut interest rates."
labels = ["finance", "sports", "politics", "technology"]

result = zs(text, candidate_labels=labels)
print(result)
# {'labels': ['finance', 'politics', 'technology', 'sports'],
#  'scores': [0.92, 0.05, 0.02, 0.01]}
```

默认模板是“This example is about {label}.”，可以通过 `hypothesis_template` 自定义。它不需要训练数据，也无需微调，可以直接使用。

### 步骤 3：检查 RAG 忠实度 <!-- learning-atlas: step-3-faithfulness-check-for-rag -->

```python
def is_faithful(answer, context, threshold=0.5):
    result = nli({"text": context, "text_pair": answer})[0]
    entail = next(s for s in result if s["label"] == "entailment")
    return entail["score"] > threshold
```

这是 RAGAS 忠实度评估的核心。把生成答案拆成原子主张，逐条检查检索上下文是否蕴含该主张，再报告构成蕴含的比例。

### 步骤 4：手工实现 NLI 分类器（概念演示）

`code/main.py` 提供了一个仅使用标准库的玩具实现：通过词汇重叠与否定检测比较前提和假设。它无法与 Transformer 模型竞争，却能展示任务形式：输入两段文本，输出三分类标签，损失是 `{entail, contradict, neutral}` 上的交叉熵。

## 陷阱

- **只看假设的捷径。** 模型仅凭假设便能在 SNLI 上达到约 60% 准确率，因为“not”“nobody”“never”与矛盾标签相关。这是检测标签泄漏的有力基线。
- **词汇重叠启发式。** 子序列启发式（“每个子序列都受到蕴含”）可以通过 SNLI，却会在 HANS/ANLI 上失败。应使用对抗基准。
- **文档长度导致退化。** 句子级 NLI 模型面对文档长度的前提时，F1 会下降 20 点以上。长上下文应使用在 DocNLI 上训练的模型。
- **零样本模板敏感性。** “This example is about {label}”“{label}”与“The topic is {label}”之间的差异可能让准确率波动 10 点以上，需要调优模板。
- **领域不匹配。** MNLI 使用通用英语训练。法律、医学和科学文本需要领域专用 NLI 模型，如 SciNLI、MedNLI。

## 使用现成工具

2026 年的技术栈：

| 用例 | 模型 |
|------|------|
| 通用 NLI | `microsoft/deberta-v3-large-mnli` |
| 高速或边缘部署 | `cross-encoder/nli-deberta-v3-base` |
| 零样本分类（轻量） | `facebook/bart-large-mnli` |
| 文档级 NLI | `MoritzLaurer/DeBERTa-v3-large-mnli-fever-anli-ling-wanli` |
| 多语言 | `MoritzLaurer/multilingual-MiniLMv2-L6-mnli-xnli` |
| RAG 幻觉检测 | RAGAS / DeepEval 内的 NLI 层 |

2026 年的元模式是：NLI 是文本理解的通用胶带。只要需要判断“A 是否支持 B？”或“A 是否与 B 矛盾？”，先尝试 NLI，再考虑额外调用一次 LLM。

## 交付成果

保存为 `outputs/skill-nli-picker.md`：

```markdown
---
name: nli-picker
description: Pick an NLI model, label template, and evaluation setup for a classification / faithfulness / zero-shot task.
version: 1.0.0
phase: 5
lesson: 21
tags: [nlp, nli, zero-shot]
---

Given a use case (faithfulness check, zero-shot classification, document-level inference), output:

1. Model. Named NLI checkpoint. Reason tied to domain, length, language.
2. Template (if zero-shot). Verbalization pattern. Example.
3. Threshold. Entailment cutoff for the decision rule. Reason based on calibration.
4. Evaluation. Accuracy on held-out labeled set, hypothesis-only baseline, adversarial subset.

Refuse to ship zero-shot classification without a 100-example labeled sanity check. Refuse to use a sentence-level NLI model on document-length premises. Flag any claim that NLI solves hallucination — it reduces it; it does not eliminate it.
```

## 练习

1. **简单。** 用 `facebook/bart-large-mnli` 运行 20 个人工编写的（前提、假设、标签）三元组，覆盖全部三个类别并测量准确率。加入对抗性的“子序列启发式”陷阱（“I did not eat the cake”与“I ate the cake”），观察模型是否出错。
2. **中等。** 在 100 条 AG News 标题上比较零样本模板 `"This text is about {label}"`、`"The topic is {label}"` 和 `"{label}"`，报告准确率波动。
3. **困难。** 构建 RAG 忠实度检查器：先拆分原子主张，再逐条运行 NLI。在 50 个带有标准上下文的 RAG 生成答案上评估，对照人工标签测量假阳性率和假阴性率。

## 关键术语

| 术语 | 常见说法 | 准确含义 |
|------|----------|----------|
| NLI | 自然语言推断 | 对前提与假设之间的关系进行三分类。 |
| RTE | 识别文本蕴含 | NLI 的旧称，指同一任务。 |
| 蕴含（entailment） | “t 推出 h” | 给定 t，典型读者会认定 h 为真。 |
| 矛盾（contradiction） | “t 排除 h” | 给定 t，典型读者会认定 h 为假。 |
| 中立（neutral） | “无法决定” | 从 t 无法沿任一方向推断 h。 |
| 零样本分类（zero-shot classification） | 把 NLI 当分类器 | 把标签用语言表达成假设，选择蕴含概率最大者。 |
| 忠实度（faithfulness） | 答案有依据吗？ | 对（检索上下文，生成答案）执行 NLI。 |

## 延伸阅读

- [Bowman 等（2015），A large annotated corpus for learning natural language inference](https://arxiv.org/abs/1508.05326)：SNLI。
- [Williams、Nangia、Bowman（2017），A Broad-Coverage Challenge Corpus for Sentence Understanding through Inference](https://arxiv.org/abs/1704.05426)：MultiNLI。
- [Nie 等（2019），Adversarial NLI](https://arxiv.org/abs/1910.14599)：ANLI 基准。
- [Yin、Hay、Roth（2019），Benchmarking Zero-shot Text Classification](https://arxiv.org/abs/1909.00161)：把 NLI 用作分类器。
- [He 等（2021），DeBERTa: Decoding-enhanced BERT with Disentangled Attention](https://arxiv.org/abs/2006.03654)：2026 年 NLI 的主力模型。
