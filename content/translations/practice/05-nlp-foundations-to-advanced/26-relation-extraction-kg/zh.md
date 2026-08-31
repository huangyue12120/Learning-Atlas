---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/05-nlp-foundations-to-advanced/26-relation-extraction-kg/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: ef4e0adc778d183654f229858959b646052a784980c3aaff2e323634b2ca067e
status: reviewed
---

# 关系抽取与知识图谱构建

> NER 找到实体，实体链接把它们锚定到规范条目，关系抽取再找出实体之间的边。知识图谱由节点、边及其来源共同组成。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 5 第 06 课（NER）、Phase 5 第 25 课（实体链接）  
**预计时间：** 约 60 分钟

## 问题

分析师读到：“Tim Cook became CEO of Apple in 2011.”其中包含四项事实：

- `(Tim Cook, role, CEO)`
- `(Tim Cook, employer, Apple)`
- `(Tim Cook, start_date, 2011)`
- `(Apple, type, Organization)`

关系抽取（Relation Extraction，RE）把自由文本转成结构化三元组 `(subject, relation, object)`。在整个语料库上聚合三元组，就得到知识图谱；再聚合并查询，便得到可用于 RAG、分析或合规审计的推理基础。

2026 年的问题是：LLM 会积极抽取关系，却过于积极。它们会幻觉出源文本没有支持的三元组。没有来源信息，你便无法区分真实三元组与看似合理的虚构内容。2026 年的解决方案是 AEVS 风格的锚定与验证流水线。

## 概念

![文本 → 三元组 → 知识图谱](../assets/relation-extraction.svg)

**三元组形式。** `(subject_entity, relation_type, object_entity)`。关系可以来自封闭本体（Wikidata 属性、FIBO、UMLS），也可以来自开放集合（OpenIE 风格，允许任意关系）。

**三种抽取方法。**

1. **基于规则或模式。** Hearst 模式：“X such as Y”→ `(Y, isA, X)`，再加手写正则。它脆弱、精确且可解释。
2. **监督分类器。** 给定句子中的两个实体提及，从固定集合中预测关系。使用 TACRED、ACE、KBP 训练，是 2015 至 2022 年的标准方案。
3. **生成式 LLM。** 提示模型输出三元组，可以直接工作，但必须携带来源，否则会幻觉出看似合理的无效内容。

**AEVS（Anchor-Extraction-Verification-Supplement，锚定、抽取、验证、补充，2026）。** 当前用于缓解幻觉的框架：

- **锚定。** 识别每个实体跨度和关系短语跨度的精确位置。
- **抽取。** 生成与锚定跨度相连的三元组。
- **验证。** 把每个三元组元素映射回源文本，拒绝没有依据的内容。
- **补充。** 通过覆盖检查保证没有遗漏已锚定的跨度。

它能显著减少幻觉，需要更多计算，但可以审计。

**开放与封闭之间的权衡。**

- **封闭本体。** 固定属性列表，例如 Wikidata 的 11,000 多个属性。可预测、可查询，也难以随意编造。
- **开放式信息抽取。** 任何动词短语都能成为关系，召回率高、精确率低，而且难以查询。

生产知识图谱通常混用两者：先用开放式信息抽取发现关系，再把关系规范化到封闭本体，最后合并进主图谱。

```figure
relation-triples
```

## 动手实现

### 步骤 1：基于模式抽取

```python
PATTERNS = [
    (r"(?P<s>[A-Z]\w+) (?:is|was) (?:a|an|the) (?P<o>[A-Z]?\w+)", "isA"),
    (r"(?P<s>[A-Z]\w+) (?:is|was) born in (?P<o>\w+)", "bornIn"),
    (r"(?P<s>[A-Z]\w+) works? (?:at|for) (?P<o>[A-Z]\w+)", "worksAt"),
    (r"(?P<s>[A-Z]\w+) founded (?P<o>[A-Z]\w+)", "founded"),
]
```

完整玩具抽取器见 `code/main.py`。Hearst 模式至今仍用于领域专用流水线，因为它容易调试。

### 步骤 2：监督关系分类

```python
from transformers import AutoTokenizer, AutoModelForSequenceClassification

tok = AutoTokenizer.from_pretrained("Babelscape/rebel-large")
model = AutoModelForSequenceClassification.from_pretrained("Babelscape/rebel-large")

text = "Tim Cook was born in Alabama. He later became CEO of Apple."
encoded = tok(text, return_tensors="pt", truncation=True)
output = model.generate(**encoded, max_length=200)
triples = tok.batch_decode(output, skip_special_tokens=False)
```

REBEL 是 seq2seq 关系抽取器：输入文本，输出已经采用 Wikidata 属性 ID 的三元组。它在远程监督数据上微调，是开放权重的标准基线。

### 步骤 3：通过锚定提示 LLM 抽取

```python
prompt = f"""Extract (subject, relation, object) triples from the text.
For each triple, include the exact character span in the source text.

Text: {text}

Output JSON:
[{{"subject": {{"text": "...", "span": [start, end]}},
   "relation": "...",
   "object": {{"text": "...", "span": [start, end]}}}}, ...]

Only include triples fully supported by the text. No inference beyond what is stated.
"""
```

把每个返回跨度与源文本核对。只要 `text[start:end] != triple_entity`，就拒绝该结果。这是 AEVS“验证”步骤的最小实现。

### 步骤 4：规范化到封闭本体 <!-- learning-atlas: step-4-canonicalize-onto-a-closed-ontology -->

```python
RELATION_MAP = {
    "is the CEO of": "P169",       # "chief executive officer"
    "was born in":   "P19",         # "place of birth"
    "founded":        "P112",       # "founded by" (inverted subject/object)
    "works at":       "P108",       # "employer"
}


def canonicalize(relation):
    rel_low = relation.lower().strip()
    if rel_low in RELATION_MAP:
        return RELATION_MAP[rel_low]
    return None   # drop unmapped open relations or route to manual review
```

规范化往往占工程工作量的 60% 至 80%，必须为此预留预算。

### 步骤 5：构建小型图谱并查询

```python
triples = extract(text)
graph = {}
for s, r, o in triples:
    graph.setdefault(s, []).append((r, o))


def neighbors(node, relation=None):
    return [(r, o) for r, o in graph.get(node, []) if relation is None or r == relation]


print(neighbors("Tim Cook", relation="P108"))    # -> [(P108, Apple)]
```

这是每个基于知识图谱的 RAG 系统的原子操作。扩展时可以使用 RDF 三元组存储（Blazegraph、Virtuoso）、属性图（Neo4j）或向量增强图存储。

## 陷阱

- **在关系抽取前运行共指消解。** “He founded Apple”要求关系抽取知道“he”指谁。应先运行共指消解，见第 24 课。
- **实体规范化。** “Apple Inc”与“Apple”必须解析为同一节点。应先运行实体链接，见第 25 课。
- **幻觉三元组。** LLM 会输出文本没有支持的三元组，必须强制执行跨度验证。
- **关系规范化漂移。** 开放式关系表达不一致，如“was born in”“came from”“is a native of”。必须折叠成规范 ID，否则图谱无法查询。
- **时间错误。** “Tim Cook is CEO of Apple”现在为真，2005 年却为假。许多关系都有时间范围，应使用限定符，例如 Wikidata 中的 `P580` 开始时间和 `P582` 结束时间。
- **领域不匹配。** REBEL 在 Wikipedia 上训练，法律、医学和科学文本往往需要领域微调的关系抽取模型。

## 使用现成工具

2026 年的技术栈：

| 场景 | 选择 |
|------|------|
| 快速生产、通用领域 | REBEL 或 LlamaPred + Wikidata 规范化 |
| 领域专用（生物医学、法律） | SciREX 风格领域微调 + 自定义本体 |
| LLM 提示、输出需要审计 | AEVS 流水线：锚定 → 抽取 → 验证 → 补充 |
| 大规模新闻信息抽取 | 基于模式 + 监督模型的混合方案 |
| 从零构建知识图谱 | 开放式信息抽取 + 人工规范化 |
| 时态知识图谱 | 抽取时加入限定符（开始/结束时间、时间点） |

集成模式是：NER → 共指消解 → 实体链接 → 关系抽取 → 本体映射 → 图谱加载。每个阶段都可能成为质量门槛。

## 交付成果

保存为 `outputs/skill-re-designer.md`：

```markdown
---
name: re-designer
description: Design a relation extraction pipeline with provenance and canonicalization.
version: 1.0.0
phase: 5
lesson: 26
tags: [nlp, relation-extraction, knowledge-graph]
---

Given a corpus (domain, language, volume) and downstream use (KG-RAG, analytics, compliance), output:

1. Extractor. Pattern-based / supervised / LLM / AEVS hybrid. Reason tied to precision vs recall target.
2. Ontology. Closed property list (Wikidata / domain) or open IE with canonicalization pass.
3. Provenance. Every triple carries source char-span + doc id. Non-negotiable for audit.
4. Merge strategy. Canonical entity id + relation id + temporal qualifiers; dedup policy.
5. Evaluation. Precision / recall on 200 hand-labelled triples + hallucination-rate on LLM-extracted sample.

Refuse any LLM-based RE pipeline without span verification (source provenance). Refuse open-IE output flowing into a production graph without canonicalization. Flag pipelines with no temporal qualifier on time-bounded relations (employer, spouse, position).
```

## 练习

1. **简单。** 在 5 个新闻文章句子上运行 `code/main.py` 中的模式抽取器，人工检查精确率。
2. **中等。** 在相同句子上使用 REBEL 或小型 LLM，比较所得三元组。哪个抽取器的精确率更高？哪个召回率更高？
3. **困难。** 构建 AEVS 流水线：用 LLM 抽取，再对照源文本验证跨度。在 50 个 Wikipedia 风格句子上，测量验证步骤前后的幻觉率。

## 关键术语

| 术语 | 常见说法 | 准确含义 |
|------|----------|----------|
| 三元组（triple） | 主语、关系、宾语 | `(s, r, o)` 元组，知识图谱的原子单位。 |
| 开放式信息抽取（Open IE） | 抽取任意内容 | 开放词表关系短语，召回率高、精确率低。 |
| 封闭本体（closed ontology） | 固定 schema | 有限的关系类型集合，如 Wikidata、UMLS、FIBO。 |
| 规范化（canonicalization） | 统一所有表示 | 把表面名称和关系映射为规范 ID。 |
| AEVS | 有依据的抽取 | 锚定、抽取、验证、补充流水线（2026）。 |
| 来源信息（provenance） | 指向事实来源的链接 | 每个三元组携带源文档 ID 与字符跨度。 |
| 远程监督（distant supervision） | 低成本标签 | 把文本与已有知识图谱对齐，生成训练数据。 |

## 延伸阅读

- [Mintz 等（2009），Distant supervision for relation extraction without labeled data](https://www.aclweb.org/anthology/P09-1113.pdf)：远程监督论文。
- [Huguet Cabot、Navigli（2021），REBEL: Relation Extraction By End-to-end Language generation](https://aclanthology.org/2021.findings-emnlp.204.pdf)：seq2seq 关系抽取主力模型。
- [Wadden 等（2019），Entity, Relation, and Event Extraction with Contextualized Span Representations (DyGIE++)](https://arxiv.org/abs/1909.03546)：联合信息抽取。
- [AEVS：Anchor-Extraction-Verification-Supplement 框架](https://www.mdpi.com/2073-431X/15/3/178)：2026 年缓解幻觉的设计。
- [Wikidata SPARQL 教程](https://www.wikidata.org/wiki/Wikidata:SPARQL_tutorial)：规范图谱查询。
