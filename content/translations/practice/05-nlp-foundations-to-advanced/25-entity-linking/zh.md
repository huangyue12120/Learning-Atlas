---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/05-nlp-foundations-to-advanced/25-entity-linking/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 45ca4b148495f0bb3c2dcdacabc79dc96e1e5509538cfbf000a77f7dc4405307
status: reviewed
---

# 实体链接与消歧

> NER 找到了“Paris”。实体链接要判断它是法国巴黎、Paris Hilton、得克萨斯州 Paris，还是特洛伊王子 Paris。缺少链接，知识图谱中的实体就仍有歧义。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 5 第 06 课（NER）、Phase 5 第 24 课（共指消解）  
**预计时间：** 约 60 分钟

## 问题

一句话写道：“Jordan beat the press.”你的 NER 把“Jordan”标记为 PERSON，这一步没错。但它到底指哪一个 Jordan？

- Michael Jordan（篮球运动员）？
- Michael B. Jordan（演员）？
- Michael I. Jordan（伯克利机器学习教授，机器学习论文中确实会出现这种混淆）？
- Jordan（约旦这个国家）？
- Jordan（希伯来语名字）？

实体链接（Entity Linking，EL）把每个提及解析为知识库中的唯一条目，知识库可以是 Wikidata、Wikipedia、DBpedia 或你的领域知识库。它包含两个子任务：

1. **候选生成。** 给定“Jordan”，哪些知识库条目可能匹配？
2. **消歧。** 给定上下文，哪个候选才正确？

两个步骤都可以学习，也都有相应基准。组合流水线已经稳定了十年，变化的是消歧器的质量。

## 概念

![实体链接流水线：提及 → 候选 → 消歧实体](../assets/entity-linking.svg)

**候选生成。** 给定提及的表面形式（“Jordan”），在别名索引中查找候选。Wikipedia 别名字典覆盖多数命名实体：“JFK”→ John F. Kennedy、Jacqueline Kennedy、JFK airport、JFK（电影）。典型索引会为每个提及返回 10 至 30 个候选。

**三种消歧方法。**

1. **先验 + 上下文（Milne 与 Witten，2008）。** `P(entity | mention) × context-similarity(entity, text)`。效果良好、速度快、无需训练。
2. **基于嵌入（ESS / REL / Blink）。** 编码提及及其上下文，再编码各候选的描述，选择余弦相似度最大者。2020 至 2024 年的默认方案。
3. **生成式（GENRE，2021；基于 LLM，2023 年以后）。** 逐词元解码实体的规范名称，并用有效实体名称组成的 trie 约束输出，从而保证结果是有效的知识库 ID。

**端到端与流水线。** 现代模型（ELQ、BLINK、ExtEnD、GENRE）会在一次运行中完成 NER、候选生成与消歧。流水线系统仍主导生产环境，因为各组件可以替换。

### 两项测量

- **提及召回率（候选生成）。** 候选列表包含正确知识库条目的标准提及比例。它是整个流水线的上限。
- **消歧准确率 / F1。** 在正确候选存在的前提下，排名第一的结果有多大比例正确。

必须同时报告两者。若系统在 80% 候选召回率下达到 99% 消歧准确率，整个流水线仍只有约 80%。

```figure
gx-entity-linking
```

## 动手实现

### 步骤 1：从 Wikipedia 重定向构建别名索引

```python
alias_to_entities = {
    "jordan": ["Q41421 (Michael Jordan)", "Q810 (Jordan, country)", "Q254110 (Michael B. Jordan)"],
    "paris":  ["Q90 (Paris, France)", "Q663094 (Paris, Texas)", "Q55411 (Paris Hilton)"],
    "apple":  ["Q312 (Apple Inc.)", "Q89 (apple, fruit)"],
}
```

Wikipedia 别名数据约含 1,800 万个（别名，实体）对。可以从 Wikidata 转储下载，并存为倒排索引。

### 步骤 2：基于上下文消歧 <!-- learning-atlas: step-2-context-based-disambiguation -->

```python
def disambiguate(mention, context, alias_index, entity_desc):
    candidates = alias_index.get(mention.lower(), [])
    if not candidates:
        return None, 0.0
    context_words = set(tokenize(context))
    best, best_score = None, -1
    for entity_id in candidates:
        desc_words = set(tokenize(entity_desc[entity_id]))
        union = len(context_words | desc_words)
        score = len(context_words & desc_words) / union if union else 0.0
        if score > best_score:
            best, best_score = entity_id, score
    return best, best_score
```

Jaccard 重叠只是玩具方法，应替换为嵌入的余弦相似度，Transformer 版本见 `code/main.py` 的步骤 2。

### 步骤 3：基于嵌入（BLINK 风格）

```python
from sentence_transformers import SentenceTransformer
encoder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

def embed_mention(text, mention_span):
    start, end = mention_span
    marked = f"{text[:start]} [MENTION] {text[start:end]} [/MENTION] {text[end:]}"
    return encoder.encode([marked], normalize_embeddings=True)[0]

def embed_entity(entity_id, description):
    return encoder.encode([f"{entity_id}: {description}"], normalize_embeddings=True)[0]
```

建立索引时，每个知识库实体只需编码一次。查询时，把提及与上下文编码一次，与候选池做点积，再选择最大者。

### 步骤 4：生成式实体链接（概念）

GENRE 逐字符解码实体的 Wikipedia 标题。约束解码（见第 20 课）保证只能输出有效标题，并与知识库支持的 trie 紧密集成。现代后继方案包括 REL-GEN，以及使用结构化输出的 LLM 提示式实体链接。

```python
prompt = f"""Text: {text}
Mention: {mention}
List the best Wikipedia title for this mention.
Respond with JSON: {{"title": "..."}}"""
```

把它与白名单（Outlines `choice`）结合，就是 2026 年最容易发布的实体链接流水线。

### 步骤 5：在 AIDA-CoNLL 上评估

AIDA-CoNLL 是标准实体链接基准：1,393 篇 Reuters 文章、3.4 万个提及，并带有 Wikipedia 实体标注。需要报告知识库内准确率（`P@1`）和知识库外 NIL 检测率。

## 陷阱

- **NIL 处理。** 有些提及不在知识库中，如新出现的实体或冷门人物。系统必须预测 NIL，不能猜测错误实体。该项需单独测量。
- **提及边界错误。** 上游 NER 漏掉部分跨度，如把“Bank of America”只标记为“Bank”，会降低实体链接召回率。
- **流行度偏差。** 训练得到的系统会过度预测高频实体。机器学习论文中的“Michael I. Jordan”经常被链接到篮球运动员 Jordan。
- **跨语言实体链接。** 把中文文本中的提及映射到英语 Wikipedia 实体，需要多语言编码器或翻译步骤。
- **知识库过时。** 新公司、事件和人物不在去年的 Wikipedia 转储中。生产流水线需要建立更新循环。

## 使用现成工具

2026 年的技术栈：

| 场景 | 选择 |
|------|------|
| 通用英语 + Wikipedia | BLINK 或 REL |
| 跨语言，知识库为 Wikipedia | mGENRE |
| 适合 LLM，每天只有少量提及 | 提供候选列表，提示 Claude/GPT-4 输出受约束 JSON |
| 领域专用知识库（医疗、法律） | 自定义 BERT + 知识库感知检索 + 在领域 AIDA 风格数据集上微调 |
| 极低延迟 | 仅精确匹配先验（Milne-Witten 基线） |
| 研究先进水平 | GENRE / ExtEnD / 生成式 LLM-EL |

2026 年投入生产的模式是：NER → 共指消解 → 对每个提及执行实体链接 → 每个簇折叠为一个规范实体。输出应是文档中每个实体对应一个知识库 ID，而不是每个提及对应一个 ID。

## 交付成果

保存为 `outputs/skill-entity-linker.md`：

```markdown
---
name: entity-linker
description: Design an entity linking pipeline — KB, candidate generator, disambiguator, evaluation.
version: 1.0.0
phase: 5
lesson: 25
tags: [nlp, entity-linking, knowledge-graph]
---

Given a use case (domain KB, language, volume, latency budget), output:

1. Knowledge base. Wikidata / Wikipedia / custom KB. Version date. Refresh cadence.
2. Candidate generator. Alias-index, embedding, or hybrid. Target mention recall @ K.
3. Disambiguator. Prior + context, embedding-based, generative, or LLM-prompted.
4. NIL strategy. Threshold on top score, classifier, or explicit NIL candidate.
5. Evaluation. Mention recall @ 30, top-1 accuracy, NIL-detection F1 on held-out set.

Refuse any EL pipeline without a mention-recall baseline (you cannot evaluate a disambiguator without knowing candidate gen surfaced the right entity). Refuse any pipeline using LLM-prompted EL without constrained output to valid KB ids. Flag systems where popularity bias affects minority entities (e.g. name-clashes) without domain fine-tuning.
```

## 练习

1. **简单。** 对 10 个有歧义的提及（Paris、Jordan、Apple），实现 `code/main.py` 中的先验 + 上下文消歧器。人工标注正确实体并测量准确率。
2. **中等。** 用句子 Transformer 编码 50 个有歧义的提及，并编码每个候选的描述。比较基于嵌入的消歧与 Jaccard 上下文重叠。
3. **困难。** 构建包含 1,000 个实体的领域知识库，如公司的员工和产品。端到端实现 NER + 实体链接，在 100 个留出句子上测量精确率与召回率。

## 关键术语

| 术语 | 常见说法 | 准确含义 |
|------|----------|----------|
| 实体链接（Entity Linking，EL） | 链接到 Wikipedia | 把提及映射到唯一的知识库条目。 |
| 候选生成（candidate generation） | 可能是谁？ | 为一个提及返回可能的知识库条目短名单。 |
| 消歧（disambiguation） | 选出正确者 | 使用上下文为候选打分并选择胜者。 |
| 别名索引（alias index） | 查找表 | 从表面形式映射到候选实体。 |
| NIL | 不在知识库中 | 明确预测没有知识库条目与提及匹配。 |
| KB | 知识库 | Wikidata、Wikipedia、DBpedia 或领域知识库。 |
| AIDA-CoNLL | 基准 | 1,393 篇带标准实体链接的 Reuters 文章。 |

## 延伸阅读

- [Milne、Witten（2008），Learning to Link with Wikipedia](https://www.cs.waikato.ac.nz/~ihw/papers/08-DM-IHW-LearningToLinkWithWikipedia.pdf)：奠定先验 + 上下文方法的论文。
- [Wu 等（2020），Zero-shot Entity Linking with Dense Entity Retrieval (BLINK)](https://arxiv.org/abs/1911.03814)：基于嵌入的主力方案。
- [De Cao 等（2021），Autoregressive Entity Retrieval (GENRE)](https://arxiv.org/abs/2010.00904)：使用约束解码的生成式实体链接。
- [Hoffart 等（2011），Robust Disambiguation of Named Entities in Text (AIDA)](https://www.aclweb.org/anthology/D11-1072.pdf)：基准论文。
- [REL: An Entity Linker Standing on the Shoulders of Giants（2020）](https://arxiv.org/abs/2006.01969)：开放生产技术栈。
