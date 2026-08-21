---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/05-nlp-foundations-to-advanced/18-multilingual-nlp/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 343fc51cb223c67fcf46906beb0ade26c859c437a03196285d44a74e088e720a
status: reviewed
---

# 多语言 NLP

> 一个模型支持 100 多种语言，其中大多数没有训练数据。跨语言迁移是 2020 年代真正投入实用的奇迹。

**类型：** 学习  
**学习实现：** Python  
**前置课程：** Phase 5 第 04 课（GloVe、FastText、子词）、Phase 5 第 11 课（机器翻译）  
**预计时间：** 约 45 分钟

## 问题

英语拥有数十亿条标注样本，乌尔都语只有数千条，迈蒂利语则几乎没有。任何服务全球用户的实用 NLP 系统都必须覆盖语言长尾，而这些语言并不存在特定任务的训练数据。

多语言模型在多种语言上同时训练同一个模型，以此解决问题。共享表示让模型把从高资源语言学到的能力迁移到低资源语言。只用英语情感分析数据微调模型，它无需额外训练就能对乌尔都语给出出人意料的良好情感预测。这种能力称为零样本跨语言迁移，也改变了 NLP 产品服务全球用户的方式。

下面讨论其中的权衡、经典模型，以及初次开展多语言工作的团队最容易出错的一项决策：选择哪种源语言进行迁移。

## 概念

![通过共享多语言嵌入空间实现跨语言迁移](../assets/multilingual.svg)

**共享词表。** 多语言模型使用 SentencePiece 或 WordPiece 分词器，训练语料来自所有目标语言。词表由这些语言共享：相关语言中的相同语素会使用同一个子词单元。英语和意大利语中的 `anti-` 会得到相同词元。

**共享表示。** Transformer 在多种语言上接受掩码语言建模预训练后，会让不同语言中语义相近的句子产生相似隐藏状态。mBERT、XLM-R 和 NLLB 都表现出这一特性。英语的“cat”嵌入会聚集在法语“chat”和西班牙语“gato”附近，完整句子的嵌入也会如此。

**零样本迁移。** 在一种语言（通常是英语）的标注数据上微调模型，推理时直接输入模型支持的其他语言，无需目标语言标签。类型学上接近的语言效果较强，差异较远的语言效果较弱。

**少样本微调。** 加入 100 至 500 条目标语言标注样本，分类任务的准确率便能达到英语基线的 95% 至 98%。这是多语言 NLP 中成本效益最高的单项措施。

## 模型

| 模型 | 年份 | 覆盖范围 | 说明 |
|------|------|----------|------|
| mBERT | 2018 | 104 种语言 | 在维基百科上训练。首个实用多语言语言模型，低资源语言表现较弱。 |
| XLM-R | 2019 | 100 种语言 | 在 CommonCrawl 上训练，语料远大于维基百科。确立了跨语言基线。Base 为 2.7 亿参数，Large 为 5.5 亿参数。 |
| XLM-V | 2023 | 100 种语言 | 使用 100 万词元词表的 XLM-R，而非 25 万词元，低资源语言表现更好。 |
| mT5 | 2020 | 101 种语言 | 用于多语言生成的 T5 架构。 |
| NLLB-200 | 2022 | 200 种语言 | Meta 的翻译模型，包含 55 种低资源语言。 |
| BLOOM | 2022 | 46 种自然语言 + 13 种编程语言 | 以多语言语料训练的开放式 1760 亿参数 LLM。 |
| Aya-23 | 2024 | 23 种语言 | Cohere 的多语言 LLM，阿拉伯语、印地语和斯瓦希里语表现出色。 |

根据用例选择模型。分类任务把 XLM-R-base 作为稳妥默认选择；生成任务根据要做翻译还是开放式生成，选择 mT5 或 NLLB；LLM 类工作则可选 Aya-23，或通过明确的多语言提示使用 Claude。

## 源语言决策（2026 年研究）

多数团队默认用英语作为微调源语言。2026 年的最新研究表明，这种选择往往不对。

语言相似度比原始语料规模更能预测迁移质量。对于斯拉夫语族目标语言，德语或俄语往往优于英语；对于印度语言，印地语往往优于英语。**qWALS** 相似度指标（2026 年，基于《世界语言结构地图集》的特征）量化了这一点。**LANGRANK**（Lin 等，ACL 2019）是另一种更早的方法，它结合语言相似度、语料规模和谱系关系对候选源语言排序。

实用规则：若目标语言存在类型学上接近的高资源近缘语言，先尝试用它微调，再与英语微调结果比较。

```figure
n5-crosslingual-bridge
```

## 动手实现

### 步骤 1：零样本跨语言分类

```python
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

tok = AutoTokenizer.from_pretrained("joeddav/xlm-roberta-large-xnli")
model = AutoModelForSequenceClassification.from_pretrained("joeddav/xlm-roberta-large-xnli")


def classify(text, candidate_labels, hypothesis_template="This text is about {}."):
    scores = {}
    for label in candidate_labels:
        hypothesis = hypothesis_template.format(label)
        inputs = tok(text, hypothesis, return_tensors="pt", truncation=True)
        with torch.no_grad():
            logits = model(**inputs).logits[0]
        entail_score = torch.softmax(logits, dim=-1)[2].item()
        scores[label] = entail_score
    return dict(sorted(scores.items(), key=lambda x: -x[1]))


print(classify("I love this product!", ["positive", "negative", "neutral"]))
print(classify("मुझे यह उत्पाद पसंद है!", ["positive", "negative", "neutral"]))
print(classify("J'adore ce produit !", ["positive", "negative", "neutral"]))
```

同一个模型用同一套 API 处理三种语言。XLM-R 在自然语言推断（NLI）数据上训练后，可以借助蕴含判断技巧良好地迁移到分类任务。

### 步骤 2：多语言嵌入空间

```python
from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

pairs = [
    ("The cat is sleeping.", "Le chat dort."),
    ("The cat is sleeping.", "El gato está durmiendo."),
    ("The cat is sleeping.", "Die Katze schläft."),
    ("The cat is sleeping.", "The dog is barking."),
]

for eng, other in pairs:
    emb_eng = model.encode([eng], normalize_embeddings=True)[0]
    emb_other = model.encode([other], normalize_embeddings=True)[0]
    sim = float(np.dot(emb_eng, emb_other))
    print(f"  {eng!r} <-> {other!r}: cos={sim:.3f}")
```

互为翻译的句子在嵌入空间中距离较近，另一句英语则离得更远。跨语言检索、聚类和相似度计算正是依靠这一特性工作。

### 步骤 3：少样本微调策略

```python
from transformers import TrainingArguments, Trainer
from datasets import Dataset


def few_shot_finetune(base_model, base_tokenizer, examples):
    ds = Dataset.from_list(examples)

    def tokenize_fn(ex):
        out = base_tokenizer(ex["text"], truncation=True, max_length=128)
        out["labels"] = ex["label"]
        return out

    ds = ds.map(tokenize_fn)
    args = TrainingArguments(
        output_dir="out",
        per_device_train_batch_size=8,
        num_train_epochs=5,
        learning_rate=2e-5,
        save_strategy="no",
    )
    trainer = Trainer(model=base_model, args=args, train_dataset=ds)
    trainer.train()
    return base_model
```

使用 100 至 500 条目标语言样本时，`num_train_epochs=5` 与 `learning_rate=2e-5` 是安全的默认设置。更高的学习率会破坏多语言对齐，最终只得到一个英语模型。

## 真正有效的评估方式

- **按语言计算留出集准确率。** 不要聚合，因为聚合值会掩盖语言长尾。
- **与单语言基线比较。** 对数据充足的语言，从头训练的单语言模型有时会超过多语言模型，必须实际测试。
- **实体级测试。** 测试目标语言中的命名实体。多语言模型对远离拉丁字母的文字体系往往分词较弱。
- **跨语言一致性。** 两种语言表达同一含义时应得到相同预测，需要测量两者的差距。

## 使用现成工具

2026 年的技术栈：

| 任务 | 推荐方案 |
|------|----------|
| 100 种语言的分类 | 微调 XLM-R-base（约 2.7 亿参数） |
| 零样本文本分类 | `joeddav/xlm-roberta-large-xnli` |
| 多语言句子嵌入 | `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` |
| 200 种语言的翻译 | `facebook/nllb-200-distilled-600M`（见第 11 课） |
| 多语言生成 | Claude、GPT-4、Aya-23、mT5-XXL |
| 低资源语言 NLP | XLM-V，或在相关高资源语言上进行领域微调 |

若性能重要，务必为目标语言微调预留预算。零样本只适合作为起点，不能当作最终结果。

### 分词税：低资源语言会遇到什么问题

多语言模型让所有语言共用一个分词器。训练该词表的语料主要由英语、法语、西班牙语、中文和德语构成。主流语言之外的语言会悄然叠加三种代价：

- **切分率税（fertility tax）。** 低资源语言文本中，每个词会被切成比英语多得多的词元。一句印地语可能需要等义英语句子的 3 至 5 倍词元，这会按同样倍数消耗上下文窗口、训练效率和延迟预算。
- **变体恢复税（variant recovery tax）。** 每个拼写错误、附加符号变体、Unicode 规范化不一致或大小写变化，都会在嵌入空间中变成一个毫无关联、需要从头学习的序列。模型无法学会母语者能识别的正字法对应关系。
- **容量溢出税（capacity spillover tax）。** 前两项代价会占用上下文位置、网络层深度和嵌入维度。同一模型留给低资源语言实际推理的容量，会系统性地少于高资源语言。

实际症状是：模型在印地语上的训练过程看似正常，损失曲线正确，评估困惑度也似乎合理，但生产输出会出现细微错误。句中形态结构突然瓦解，罕见屈折变化始终无法恢复。**分词器若有缺陷，扩大数据规模也无法解决。**

缓解方法包括：选择充分覆盖目标语言的分词器，XLM-V 的 100 万词元词表就是直接改进；训练前在目标语言留出文本上检查分词切分率；对真正的长尾文字体系使用字节级回退，如 SentencePiece 的 `byte_fallback=True` 或 GPT-2 式字节级 BPE，确保永远不会产生 OOV。

## 交付成果

保存为 `outputs/skill-multilingual-picker.md`：

```markdown
---
name: multilingual-picker
description: Pick source language, target model, and evaluation plan for a multilingual NLP task.
version: 1.0.0
phase: 5
lesson: 18
tags: [nlp, multilingual, cross-lingual]
---

Given requirements (target languages, task type, available labeled data per language), output:

1. Source language for fine-tuning. Default English; check LANGRANK or qWALS if target language has a typologically close high-resource language.
2. Base model. XLM-R (classification), mT5 (generation), NLLB (translation), Aya-23 (generative LLM).
3. Few-shot budget. Start with 100-500 target-language examples if available. Zero-shot only if labeling is infeasible.
4. Evaluation plan. Per-language accuracy (not aggregate), cross-lingual consistency, entity-level F1 on non-Latin scripts.

Refuse to ship a multilingual model without per-language evaluation — aggregate metrics hide long-tail failures. Flag scripts with low tokenization coverage (Amharic, Tigrinya, many African languages) as needing a model with byte-fallback (SentencePiece with byte_fallback=True, or byte-level tokenizer like GPT-2).
```

## 练习

1. **简单。** 对英语、法语、印地语和阿拉伯语分别选取 10 个句子，运行零样本分类流水线并报告各语言准确率。预期法语表现强，印地语尚可，阿拉伯语波动较大。
2. **中等。** 使用 `paraphrase-multilingual-MiniLM-L12-v2` 在小型混合语言语料库上构建跨语言检索器。用英语查询，检索任意语言的文档，并测量 recall@5。
3. **困难。** 在印地语分类任务上比较英语源微调与印地语源微调。两种方案都用 500 条目标语言样本做少样本微调，报告哪种源语言带来更高的印地语准确率，以及高出多少。这相当于 LANGRANK 论点的缩小版实验。

## 关键术语

| 术语 | 常见说法 | 准确含义 |
|------|----------|----------|
| 多语言模型（multilingual model） | 一个模型，多种语言 | 多种语言共享词表和参数。 |
| 跨语言迁移（cross-lingual transfer） | 用一种语言训练，换另一种语言运行 | 在源语言上微调，不使用目标语言标签，直接在目标语言上评估。 |
| 零样本（zero-shot） | 没有目标语言标签 | 不在目标语言上微调便执行迁移。 |
| 少样本（few-shot） | 少量目标语言标签 | 使用 100 至 500 条目标语言样本进行微调。 |
| mBERT | 首个多语言语言模型 | 在维基百科上预训练、支持 104 种语言的 BERT。 |
| XLM-R | 标准跨语言基线 | 在 CommonCrawl 上预训练、支持 100 种语言的 RoBERTa。 |
| NLLB | Meta 的 200 语言机器翻译模型 | No Language Left Behind，包含 55 种低资源语言。 |

## 延伸阅读

- [Conneau 等（2019），Unsupervised Cross-lingual Representation Learning at Scale](https://arxiv.org/abs/1911.02116)：XLM-R 论文。
- [Pires、Schlinger、Garrette（2019），How Multilingual is Multilingual BERT?](https://arxiv.org/abs/1906.01502)：开启跨语言迁移研究方向的分析论文。
- [Costa-jussà 等（2022），No Language Left Behind](https://arxiv.org/abs/2207.04672)：NLLB-200 论文。
- [Üstün 等（2024），Aya Model: An Instruction Finetuned Open-Access Multilingual Language Model](https://arxiv.org/abs/2402.07827)：Cohere 的多语言 LLM Aya。
- [Language Similarity Predicts Cross-Lingual Transfer Learning Performance（2026）](https://www.mdpi.com/2504-4990/8/3/65)：关于 qWALS 与 LANGRANK 源语言选择的论文。
