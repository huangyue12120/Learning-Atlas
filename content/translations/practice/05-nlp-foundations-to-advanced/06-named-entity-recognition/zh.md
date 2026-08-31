---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/05-nlp-foundations-to-advanced/06-named-entity-recognition/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 1234e5808229ac25f3c65b1fe1baab736e525591c4cf847cc28690af25d46e71
status: reviewed
---

# 命名实体识别

> 把名称提取出来。听着简单，直到你遇见模糊边界、嵌套实体和领域术语。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 5 第 02 课（BoW 与 TF-IDF）、Phase 5 第 03 课（词嵌入）  
**预计时间：** 约 75 分钟

## 问题

“Apple sued Google over its iPhone search deal in the US.”包含五个实体：Apple（ORG）、Google（ORG）、iPhone（PRODUCT）、search deal（也许算）和 US（GPE）。好的 NER 系统会提取所有实体并给出正确类型；差的系统会漏掉 iPhone，把水果 Apple 与公司 Apple 混淆，还把“US”标成 PERSON。

命名实体识别（NER）是每条结构化提取流水线下方的主力：简历解析、合规日志扫描、医疗记录匿名化、搜索查询理解、聊天机器人回答的事实锚定、法律合同提取。你很少直接看见它，却处处依赖它。

本课从经典路线开始，包括规则、HMM 和 CRF，再进入现代路线，包括 BiLSTM-CRF 与 Transformer。每一步都解决前一步的一项具体局限，这条演进模式本身也是本课重点。

## 概念

**BIO 标注**（或 BILOU）把实体提取转成序列标注问题。为每个词元赋予 `B-TYPE`（实体开始）、`I-TYPE`（实体内部）或 `O`（不属于任何实体）标签。

```text
Apple    B-ORG
sued     O
Google   B-ORG
over     O
its      O
iPhone   B-PRODUCT
search   O
deal     O
in       O
the      O
US       B-GPE
.        O
```

多词元实体会串联标签：`New B-GPE`、`York I-GPE`、`City I-GPE`。理解 BIO 的模型可以提取任意跨度。

架构演进如下：

- **基于规则。** 正则表达式加地名词典查询。已知实体精确率高，对新实体毫无覆盖。
- **HMM。** 隐马尔可夫模型。建模给定标签的词元发射概率，以及标签之间的转移概率；用 Viterbi 解码；从标注数据训练。
- **CRF。** 条件随机场。与 HMM 相似，但采用判别式建模，因此可以混用任意特征，例如词形、大小写和相邻词。到 2026 年，它仍是低资源部署中的经典生产主力。
- **BiLSTM-CRF。** 用神经网络学习特征，不再手工设计。LSTM 双向读取句子，顶层 CRF 保证标签序列一致。
- **基于 Transformer。** 用词元分类头微调 BERT，准确率最高，计算量也最大。

```figure
ner-bio-tagging
```

## 动手实现

### 步骤 1：BIO 标注辅助函数 <!-- learning-atlas: step-1-bio-tagging-helpers -->

```python
def spans_to_bio(tokens, spans):
    labels = ["O"] * len(tokens)
    for start, end, label in spans:
        labels[start] = f"B-{label}"
        for i in range(start + 1, end):
            labels[i] = f"I-{label}"
    return labels


def bio_to_spans(tokens, labels):
    spans = []
    current = None
    for i, label in enumerate(labels):
        if label.startswith("B-"):
            if current:
                spans.append(current)
            current = (i, i + 1, label[2:])
        elif label.startswith("I-") and current and current[2] == label[2:]:
            current = (current[0], i + 1, current[2])
        else:
            if current:
                spans.append(current)
                current = None
    if current:
        spans.append(current)
    return spans
```

```python
>>> tokens = ["Apple", "sued", "Google", "over", "iPhone", "sales", "."]
>>> labels = ["B-ORG", "O", "B-ORG", "O", "B-PRODUCT", "O", "O"]
>>> bio_to_spans(tokens, labels)
[(0, 1, 'ORG'), (2, 3, 'ORG'), (4, 5, 'PRODUCT')]
```

### 步骤 2：手工特征

对经典的非神经 NER，特征决定成败。以下特征很实用：

```python
def token_features(token, prev_token, next_token):
    return {
        "lower": token.lower(),
        "is_upper": token.isupper(),
        "is_title": token.istitle(),
        "has_digit": any(c.isdigit() for c in token),
        "suffix_3": token[-3:].lower(),
        "shape": word_shape(token),
        "prev_lower": prev_token.lower() if prev_token else "<BOS>",
        "next_lower": next_token.lower() if next_token else "<EOS>",
    }


def word_shape(word):
    out = []
    for c in word:
        if c.isupper():
            out.append("X")
        elif c.islower():
            out.append("x")
        elif c.isdigit():
            out.append("d")
        else:
            out.append(c)
    return "".join(out)
```

`word_shape("iPhone")` 返回 `xXxxxx`，`word_shape("USA-2024")` 返回 `XXX-dddd`。大小写模式是专有名词的强信号。

### 步骤 3：简单的规则加词典基线

```python
ORG_GAZETTEER = {"Apple", "Google", "Microsoft", "OpenAI", "Meta", "Amazon", "Netflix"}
GPE_GAZETTEER = {"US", "USA", "UK", "India", "Germany", "France"}
PRODUCT_GAZETTEER = {"iPhone", "Android", "Windows", "ChatGPT", "Claude"}


def rule_based_ner(tokens):
    labels = []
    for token in tokens:
        if token in ORG_GAZETTEER:
            labels.append("B-ORG")
        elif token in GPE_GAZETTEER:
            labels.append("B-GPE")
        elif token in PRODUCT_GAZETTEER:
            labels.append("B-PRODUCT")
        else:
            labels.append("O")
    return labels
```

生产词典包含从 Wikipedia 和 DBpedia 抓取的数百万条目，覆盖率不错，消歧能力却很差，例如无法判断 `Apple` 指公司还是水果。统计模型因此胜出。

### 步骤 4：CRF 这一步（示意而非完整实现）

缺少概率论基础时，用 50 行代码从零实现完整 CRF 并不能帮助理解。此处改用 `sklearn-crfsuite`：

```python
import sklearn_crfsuite

def to_features(tokens):
    out = []
    for i, tok in enumerate(tokens):
        prev = tokens[i - 1] if i > 0 else ""
        nxt = tokens[i + 1] if i + 1 < len(tokens) else ""
        out.append({
            "word.lower()": tok.lower(),
            "word.isupper()": tok.isupper(),
            "word.istitle()": tok.istitle(),
            "word.isdigit()": tok.isdigit(),
            "word.suffix3": tok[-3:].lower(),
            "word.shape": word_shape(tok),
            "prev.word.lower()": prev.lower(),
            "next.word.lower()": nxt.lower(),
            "BOS": i == 0,
            "EOS": i == len(tokens) - 1,
        })
    return out


crf = sklearn_crfsuite.CRF(algorithm="lbfgs", c1=0.1, c2=0.1, max_iterations=100, all_possible_transitions=True)
X_train = [to_features(s) for s in sentences_tokenized]
crf.fit(X_train, bio_labels_train)
```

`c1` 和 `c2` 分别控制 L1 与 L2 正则化。`all_possible_transitions=True` 让模型学到非法序列的概率很低，例如 `O` 后面不应直接出现 `I-ORG`。CRF 由此保证 BIO 一致性，你无须手写约束。

### 步骤 5：BiLSTM-CRF 增加了什么

模型开始学习特征。输入是 GloVe 或 fastText 词元嵌入。一个 LSTM 从左到右读取，另一个从右到左读取；拼接的隐藏状态进入 CRF 输出层。CRF 仍负责标签序列一致性，LSTM 则用学到的表示取代手工特征。

```python
import torch
import torch.nn as nn


class BiLSTM_CRF_Head(nn.Module):
    def __init__(self, vocab_size, embed_dim, hidden_dim, n_labels):
        super().__init__()
        self.embed = nn.Embedding(vocab_size, embed_dim)
        self.lstm = nn.LSTM(embed_dim, hidden_dim, bidirectional=True, batch_first=True)
        self.fc = nn.Linear(hidden_dim * 2, n_labels)

    def forward(self, token_ids):
        e = self.embed(token_ids)
        h, _ = self.lstm(e)
        emissions = self.fc(h)
        return emissions
```

CRF 层可使用 `torchcrf.CRF`（执行 `pip install pytorch-crf`）。除非你有数万句标注数据，否则它相对手工 CRF 的增益虽然可测，却可能比预想的小。

## 使用现成工具

spaCy 内置了生产级 NER。

```python
import spacy

nlp = spacy.load("en_core_web_sm")
doc = nlp("Apple sued Google over its iPhone search deal in the US.")
for ent in doc.ents:
    print(f"{ent.text:20s} {ent.label_}")
```

```text
Apple                ORG
Google               ORG
iPhone               ORG
US                   GPE
```

注意，`iPhone` 被标成了 `ORG` 而不是 `PRODUCT`。spaCy 小模型对产品实体覆盖较弱，大模型 `en_core_web_lg` 表现更好，Transformer 模型 `en_core_web_trf` 还会再好一些。

使用 Hugging Face 运行基于 BERT 的 NER：

```python
from transformers import pipeline

ner = pipeline("ner", model="dslim/bert-base-NER", aggregation_strategy="simple")
print(ner("Apple sued Google over its iPhone in the US."))
```

```text
[{'entity_group': 'ORG', 'word': 'Apple', ...},
 {'entity_group': 'ORG', 'word': 'Google', ...},
 {'entity_group': 'MISC', 'word': 'iPhone', ...},
 {'entity_group': 'LOC', 'word': 'US', ...}]
```

`aggregation_strategy="simple"` 会把连续的 B-X、I-X 词元合并成一个跨度。若不设置，就会得到词元级标签，需要自行合并。

### 基于 LLM 的 NER：2026 年方案

在许多领域，零样本和少样本 LLM NER 已能与微调模型竞争；标注数据稀缺时，它的优势更明显。

- **零样本提示。** 给 LLM 一份实体类型列表和一个模式示例，要求输出 JSON。开箱即用，在新领域上的准确率中等。
- **ZeroTuneBio 风格提示。** 把任务拆成候选提取、含义解释、判断和复核。多阶段提示比单次提示能显著提高生物医学 NER 准确率，同样模式也适用于法律、金融和科学领域。
- **结合 RAG 的动态提示。** 每次推理都从小型标注种子集检索最相似的例子，动态构建少样本提示。2026 年基准中，这让 GPT-4 生物医学 NER 的 F1 比静态提示高出 11% 至 12%。
- **按实体类型拆分。** 对长文档，一次调用提取所有实体类型会随文本变长而损失召回率。为每种实体类型单独运行一次提取。推理成本更高，准确率也明显更高，这是临床记录与法律合同的标准模式。

2026 年的生产建议是：收集训练数据之前，先建立 LLM 零样本基线。它的 F1 常常已经够用，无须再微调。

### 经典 NER 仍胜出的场景

即使可以使用 LLM，下列条件下经典 NER 仍更合适：

- 延迟预算低于 50 毫秒。
- 已有数千个标注样本，并且需要超过 98% 的 F1。
- 领域本体稳定，预训练 CRF 或 BiLSTM 可以良好迁移。
- 监管要求模型在本地运行且不能生成文本。

### NER 的失效场景

- **领域偏移。** 在 CoNLL 上训练的 NER 用于法律合同时，表现可能比词典还差。请在目标领域微调。
- **嵌套实体。** “Bank of America Tower”同时是 ORG 与 FACILITY。标准 BIO 无法表达重叠跨度，需要嵌套 NER，例如多轮或基于跨度的模型。
- **长实体。** “United States Federal Deposit Insurance Corporation.”词元级模型有时会把它拆开。使用 `aggregation_strategy` 或后处理。
- **稀疏类型。** 医疗 NER 中的 DRUG_BRAND、ADVERSE_EVENT、DOSE 等标签，通用模型毫无概念。应从 ScispaCy 和 BioBERT 开始。

## 交付成果

保存为 `outputs/skill-ner-picker.md`：

```markdown
---
name: ner-picker
description: Pick the right NER approach for a given extraction task.
version: 1.0.0
phase: 5
lesson: 06
tags: [nlp, ner, extraction]
---

Given a task description (domain, label set, language, latency, data volume), output:

1. Approach. Rule-based + gazetteer, CRF, BiLSTM-CRF, or transformer fine-tune.
2. Starting model. Name it (spaCy model ID, Hugging Face checkpoint ID, or "custom, trained from scratch").
3. Labeling strategy. BIO, BILOU, or span-based. Justify in one sentence.
4. Evaluation. Use `seqeval`. Always report entity-level F1 (not token-level).

Refuse to recommend fine-tuning a transformer for under 500 labeled examples unless the user already has a pretrained domain model. Flag nested entities as needing span-based or multi-pass models. Require a gazetteer audit if the user mentions "production scale" and labels are unchanged from CoNLL-2003.
```

## 练习

1. **简单。** 实现 `bio_to_spans`，即 `spans_to_bio` 的逆函数，并在 10 个句子上验证往返一致性。
2. **中等。** 在 CoNLL-2003 英语 NER 数据集上训练上面的 sklearn-crfsuite CRF。使用 `seqeval` 报告逐实体 F1，典型结果约为 84 F1。
3. **困难。** 在医学、法律或金融领域的 NER 数据集上微调 `distilbert-base-cased`。与 spaCy 小模型比较，记录数据泄漏检查并写下令你意外的发现。

## 关键术语

| 术语 | 常见说法 | 准确含义 |
|------|----------|----------|
| NER | 提取名称 | 为词元跨度赋予类型，如 PERSON、ORG、GPE、DATE 等。 |
| BIO | 标注方案 | `B-X` 表示开始，`I-X` 表示延续，`O` 表示外部。 |
| BILOU | 更精细的 BIO | 加入 `L-X`（末尾）与 `U-X`（单元）以获得更清晰的边界。 |
| CRF | 结构化分类器 | 不只建模发射，还建模标签转移，从而约束有效序列。 |
| 嵌套 NER | 重叠实体 | 一个跨度和它的子跨度属于不同实体；BIO 无法表达。 |
| 实体级 F1 | 正确的 NER 指标 | 预测跨度必须与真实跨度完全一致；词元级 F1 会夸大准确率。 |

## 延伸阅读

- [Lample et al. (2016). Neural Architectures for Named Entity Recognition](https://arxiv.org/abs/1603.01360)：经典 BiLSTM-CRF 论文。
- [Devlin et al. (2018). BERT: Pre-training of Deep Bidirectional Transformers](https://arxiv.org/abs/1810.04805)：引入后来成为标准的词元分类模式。
- [spaCy 语言学特征：命名实体](https://spacy.io/usage/linguistic-features#named-entities)：`Doc.ents` 和 `Span` 各属性的实用参考。
- [seqeval](https://github.com/chakki-works/seqeval)：正确的指标库，请始终使用它。
