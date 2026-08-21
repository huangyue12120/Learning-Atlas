---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/05-nlp-foundations-to-advanced/24-coreference-resolution/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 5737352d097d9de94f3107cee673829c3dd42daf2b0229f0771e0f78489ccabe
status: reviewed
---

# 共指消解

> “She called him. He did not answer. The doctor was at lunch.”三处指称涉及两个人，却没有出现任何姓名。共指消解要判断每个称谓到底指谁。

**类型：** 学习  
**学习实现：** Python  
**前置课程：** Phase 5 第 06 课（NER）、Phase 5 第 07 课（词性标注与句法分析）  
**预计时间：** 约 60 分钟

## 问题

从一篇 300 词的文章中提取 Apple Inc. 的每次提及。文章写出“Apple”时很容易，换成“the company”“they”“Cupertino's technology giant”或“Jobs's firm”就很困难。如果不能把这些提及解析为同一实体，NER 流水线会漏掉 60% 至 80% 的提及。

共指消解（coreference resolution）把指向同一现实实体的表达连接为一个簇。它连接表层 NLP（NER、句法分析）与下游语义任务（信息抽取、问答、摘要、知识图谱）。

它在 2026 年的重要用途包括：

- 摘要：“The CEO announced...”与“Tim Cook announced...”中，摘要应写出 CEO 的姓名。
- 问答：“Who did she call?”要求解析“she”。
- 信息抽取：知识图谱若把“PER1 founded Apple”与“Jobs founded Apple”记作两个不同条目，就是错误的。
- 多文档信息抽取：合并不同文章中对同一事件的提及属于跨文档共指。

## 概念

![共指聚类：提及 → 实体](../assets/coref.svg)

**任务。** 输入一份文档，输出提及（文本跨度）的聚类，每个簇指向一个实体。

**提及类型。**

- **命名实体。** “Tim Cook”
- **名词性提及。** “the CEO”“the company”
- **代词性提及。** “he”“she”“they”“it”
- **同位语。** “Tim Cook, Apple's CEO,”

**架构。**

1. **基于规则（Hobbs，1978）。** 使用语法规则在句法树上解析代词，是良好的基线，在代词任务上出人意料地难以超越。
2. **提及对分类器。** 对每一对提及 `(m_i, m_j)` 预测是否共指，再通过传递闭包聚类。2016 年以前的标准方法。
3. **提及排序。** 对每个提及排列候选先行词，包括“无先行词”，再选择排名最高者。
4. **基于跨度的端到端模型（Lee 等，2017）。** 使用 Transformer 编码器，枚举不超过长度上限的所有候选跨度，预测提及分数，再预测每个跨度的先行词概率，最后贪心聚类。现代默认方案。
5. **生成式模型（2024 年以后）。** 提示 LLM：“List every pronoun in this text and its antecedent.”它在简单案例上表现良好，但难以处理长文档与罕见指称对象。

**评估指标。** 标准指标共有五种（MUC、B³、CEAF、BLANC、LEA），因为单一指标无法完整描述聚类质量。通常把前三项的平均值作为 CoNLL F1 报告。2026 年在 CoNLL-2012 上的先进水平约为 83 F1。

**已知难例。**

- 定指描述指向数页前引入的实体。
- 桥接回指（“the wheels” → 前文提到的一辆车）。
- 中文和日语等语言中的零形回指。
- 后指，即代词先于指称对象：“When **she** walked in, Mary smiled.”

```figure
coref-links
```

## 动手实现

### 步骤 1：预训练神经共指模型（AllenNLP / spaCy-experimental）

```python
import spacy
nlp = spacy.load("en_coreference_web_trf")   # experimental model
doc = nlp("Apple announced new products. The company said they would ship soon.")
for cluster in doc._.coref_clusters:
    print(cluster, "->", [m.text for m in cluster])
```

对较长文档，结果类似：
- 簇 1：[Apple, The company, they]
- 簇 2：[new products]

### 步骤 2：基于规则的代词消解器（教学实现）

`code/main.py` 提供了仅使用标准库的实现：

1. 提取提及：命名实体（首字母大写的跨度）、代词（查字典）和定指描述（“the X”）。
2. 对每个代词查看之前 K 个提及，并按以下项目打分：
   - 性别与数的一致性（启发式）
   - 新近性（距离越近越优先）
   - 句法角色（主语优先）
3. 链接得分最高的先行词。

它无法与神经模型竞争，却展示了搜索空间，以及端到端模型必须完成的决策。

### 步骤 3：使用 LLM 进行共指消解

```python
prompt = f"""Text: {text}

List every pronoun and noun phrase that refers to a person or company.
Cluster them by what they refer to. Output JSON:
[{{"entity": "Apple", "mentions": ["Apple", "the company", "it"]}}, ...]
"""
```

需要注意两种失效方式。第一，LLM 会过度合并，例如把分别指向两个人的“him”与“her”合并。第二，LLM 会在长文档中静默漏掉提及。务必通过文本跨度偏移检查结果。

### 步骤 4：评估

标准 conll-2012 脚本计算 MUC、B³、CEAF-φ4，并报告三者的平均值。自有评估可以先在标注测试集上计算跨度级精确率与召回率，再加入提及链接 F1。

## 陷阱

- **单例爆炸。** 某些系统把每个提及都报告为独立簇。B³ 对此较宽松，MUC 会惩罚这一行为。务必同时检查三项指标。
- **长上下文中的代词。** 文档超过 2,000 个词元时，性能会下降约 15 F1，需要谨慎分块。
- **性别假设。** 硬编码性别规则无法正确处理非二元性别指称、组织与动物。应使用学习模型或中性打分。
- **LLM 在长文档上漂移。** 一次 API 调用无法可靠聚类横跨 50 多段的提及。应使用滑动窗口并合并结果。

## 使用现成工具

2026 年的技术栈：

| 场景 | 选择 |
|------|------|
| 英语、单文档 | `en_coreference_web_trf`（spaCy-experimental）或 AllenNLP 神经共指模型 |
| 多语言 | 在 OntoNotes 或 Multilingual CoNLL 上训练的 SpanBERT / XLM-R |
| 跨文档事件共指 | 专用端到端模型（2025–26 年先进方案） |
| 快速 LLM 基线 | 使用结构化输出共指提示的 GPT-4o / Claude |
| 生产对话系统 | 基于规则的回退 + 神经主模型 + 关键槽位人工复核 |

2026 年投入生产的集成模式是：先运行 NER，再运行共指消解，把共指簇合并进 NER 实体。下游任务看到的是每个簇对应的一个实体，而不是每个提及对应一个实体。

## 交付成果

保存为 `outputs/skill-coref-picker.md`：

```markdown
---
name: coref-picker
description: Pick a coreference approach, evaluation plan, and integration strategy.
version: 1.0.0
phase: 5
lesson: 24
tags: [nlp, coref, information-extraction]
---

Given a use case (single-doc / multi-doc, domain, language), output:

1. Approach. Rule-based / neural span-based / LLM-prompted / hybrid. One-sentence reason.
2. Model. Named checkpoint if neural.
3. Integration. Order of operations: tokenize → NER → coref → downstream task.
4. Evaluation. CoNLL F1 (MUC + B³ + CEAF-φ4 average) on held-out set + manual cluster review on 20 documents.

Refuse LLM-only coref for documents over 2,000 tokens without sliding-window merge. Refuse any pipeline that runs coref without a mention-level precision-recall report. Flag gender-heuristic systems deployed in demographically diverse text.
```

## 练习

1. **简单。** 在 5 个手工编写的段落上运行 `code/main.py` 中的规则消解器，对照标准答案测量提及链接准确率。
2. **中等。** 在一篇新闻文章上使用预训练神经共指模型，并与自己的人工标注比较各个簇。模型在哪里出错？
3. **困难。** 构建经过共指增强的 NER 流水线：先运行 NER，再通过共指簇合并实体。在 100 篇文章上与只用 NER 的方案比较实体覆盖率提升。

## 关键术语

| 术语 | 常见说法 | 准确含义 |
|------|----------|----------|
| 提及（mention） | 一次指称 | 指向某个实体的文本跨度，可以是名称、代词或名词短语。 |
| 先行词（antecedent） | “it”指的内容 | 较早出现、与后续提及构成共指的提及。 |
| 簇（cluster） | 实体的所有提及 | 全部指向同一现实实体的提及集合。 |
| 回指（anaphora） | 向后指称 | 后面的提及指向前文，如“he”→“John”。 |
| 后指（cataphora） | 向前指称 | 前面的提及指向后文，如“When he arrived, John...”。 |
| 桥接（bridging） | 隐式指称 | “I bought a car. The wheels were bad.”中的车轮属于前述汽车。 |
| CoNLL F1 | 排行榜上的数值 | MUC、B³、CEAF-φ4 三项 F1 的平均值。 |

## 延伸阅读

- [Jurafsky 与 Martin，SLP3 第 26 章：Coreference Resolution and Entity Linking](https://web.stanford.edu/~jurafsky/slp3/26.pdf)：经典教材章节。
- [Lee 等（2017），End-to-end Neural Coreference Resolution](https://arxiv.org/abs/1707.07045)：基于跨度的端到端模型。
- [Joshi 等（2020），SpanBERT](https://arxiv.org/abs/1907.10529)：改善共指消解的预训练方法。
- [Pradhan 等（2012），CoNLL-2012 Shared Task](https://aclanthology.org/W12-4501/)：基准。
- [Hobbs（1978），Resolving Pronoun References](https://www.sciencedirect.com/science/article/pii/0024384178900064)：经典规则方法。
