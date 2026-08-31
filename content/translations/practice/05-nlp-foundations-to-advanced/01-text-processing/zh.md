---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/05-nlp-foundations-to-advanced/01-text-processing/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: d7070af33a9656a02ce6dcf42966d6c8c401035df0f8fa244ec37c12ca4d210b
status: reviewed
---

# 文本处理：分词、词干提取与词形还原

> 语言是连续的，模型是离散的，预处理连接二者。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 2 第 14 课（朴素贝叶斯）  
**预计时间：** 约 45 分钟

## 问题

模型读不懂“The cats were running.”，只能读取整数。

每个自然语言处理（NLP）系统开头都要回答三个问题：一个词从哪里开始；怎样找出词根；哪些场景应把 `run`、`running`、`ran` 当成同一个词，哪些场景又必须区分它们。

分词出错，模型就会从垃圾数据中学习。若分词器有时把 `don't` 当成一个词元，有时拆成 `do n't`，训练分布就会分裂。若词干提取器把 `organization` 和 `organ` 都缩成同一词干，主题建模就失效。若词形还原器需要词性上下文，而你没有提供，系统便会把动词当作名词处理。

本课从零实现这三步预处理，再展示 NLTK 和 spaCy 如何完成同样的工作，帮助你看清各自的取舍。

## 概念

三种操作各有用途，也各有失效方式。

**分词（tokenization）**把字符串切成词元。“词元”的含义刻意保持宽泛，因为合适的粒度取决于任务：经典 NLP 常用词级词元，Transformer 常用子词，没有空格的语言可用字符级词元。

**词干提取（stemming）**按规则截去后缀。它速度快，规则激进，也不理解语义。`running -> run` 是理想结果，`organization -> organ` 则暴露了缺陷。

**词形还原（lemmatization）**借助语法知识把词还原为词典形式。它更慢、更准确，需要查询表或形态分析器。`ran -> run` 要知道“ran”是“run”的过去式；`better -> good` 要识别比较级。

经验法则：速度优先且能容忍噪声时使用词干提取，例如搜索索引和粗粒度分类；语义优先时使用词形还原，例如问答、语义搜索和任何会展示给用户的文本。

```figure
edit-distance
```

## 动手实现

### 步骤 1：正则表达式分词器 <!-- learning-atlas: step-1-a-regex-word-tokenizer -->

一个足够实用的简单分词器会按非字母数字字符切分，同时把标点保留为独立词元。它并不完美，也不是最终方案，但一行代码就能运行。

```python
import re

def tokenize(text):
    return re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?|[0-9]+|[^\sA-Za-z0-9]", text)
```

三个模式按优先级依次匹配：内部可以带一个撇号的单词（`don't`、`it's`）、纯数字，以及任意单个非空白且非字母数字字符，也就是独立标点。

```python
>>> tokenize("The cats weren't running at 3pm.")
['The', 'cats', "weren't", 'running', 'at', '3', 'pm', '.']
```

留意它的失效方式。由于表达式把连续字母和连续数字列为不同分支，`3pm` 会拆成 `['3', 'pm']`，多数任务可以接受。URL、电子邮件和话题标签都会被拆坏。生产环境应在通用模式之前加入这些专用模式。

### 步骤 2：Porter 词干提取器（仅步骤 1a）

完整的 Porter 算法包含五个规则阶段。只实现步骤 1a 已能覆盖最常见的英语后缀，并展示这种算法的工作模式。

```python
def stem_step_1a(word):
    if word.endswith("sses"):
        return word[:-2]
    if word.endswith("ies"):
        return word[:-2]
    if word.endswith("ss"):
        return word
    if word.endswith("s") and len(word) > 1:
        return word[:-1]
    return word
```

```python
>>> [stem_step_1a(w) for w in ["caresses", "ponies", "caress", "cats"]]
['caress', 'poni', 'caress', 'cat']
```

从上到下读取这些规则。`ies -> i` 让 `ponies` 变成 `poni`，而不是 `pony`。真正的 Porter 算法会在步骤 1b 中修正它。规则之间会竞争，排在前面的规则优先，因此顺序比任意单条规则更重要。

### 步骤 3：基于查询表的词形还原器

严格的词形还原需要形态学知识。教学版本可以使用一张小型词元表，再加回退规则。

```python
LEMMA_TABLE = {
    ("running", "VERB"): "run",
    ("ran", "VERB"): "run",
    ("runs", "VERB"): "run",
    ("better", "ADJ"): "good",
    ("best", "ADJ"): "good",
    ("cats", "NOUN"): "cat",
    ("cat", "NOUN"): "cat",
    ("were", "VERB"): "be",
    ("was", "VERB"): "be",
    ("is", "VERB"): "be",
}

def lemmatize(word, pos):
    key = (word.lower(), pos)
    if key in LEMMA_TABLE:
        return LEMMA_TABLE[key]
    if pos == "VERB" and word.endswith("ing"):
        return word[:-3]
    if pos == "NOUN" and word.endswith("s"):
        return word[:-1]
    return word.lower()
```

```python
>>> lemmatize("running", "VERB")
'run'
>>> lemmatize("cats", "NOUN")
'cat'
>>> lemmatize("better", "ADJ")
'good'
>>> lemmatize("watched", "VERB")
'watched'
```

最后一个例子揭示了关键限制：`watched` 不在表中，而回退规则只处理 `ing`。真正的词形还原器还要处理 `ed`、不规则动词、形容词比较级以及发生语音变化的复数形式（`children -> child`）。因此，生产系统会使用 WordNet、spaCy 的形态组件或完整的形态分析器。

### 步骤 4：串成流水线

```python
def preprocess(text, pos_tagger=None):
    tokens = tokenize(text)
    stems = [stem_step_1a(t.lower()) for t in tokens]
    tags = pos_tagger(tokens) if pos_tagger else [(t, "NOUN") for t in tokens]
    lemmas = [lemmatize(word, pos) for word, pos in tags]
    return {"tokens": tokens, "stems": stems, "lemmas": lemmas}
```

目前缺少词性标注器，Phase 5 第 07 课会实现一个。此处暂时把所有词元都标为 `NOUN`，并明确承认这一限制。

## 使用现成工具

NLTK 和 spaCy 提供了生产级实现，各自只需几行代码。

### NLTK

```python
import nltk
nltk.download("punkt_tab")
nltk.download("wordnet")
nltk.download("averaged_perceptron_tagger_eng")

from nltk.tokenize import word_tokenize
from nltk.stem import PorterStemmer, WordNetLemmatizer
from nltk import pos_tag

text = "The cats were running."
tokens = word_tokenize(text)
stems = [PorterStemmer().stem(t) for t in tokens]
lemmatizer = WordNetLemmatizer()
tagged = pos_tag(tokens)


def nltk_pos_to_wordnet(tag):
    if tag.startswith("V"):
        return "v"
    if tag.startswith("J"):
        return "a"
    if tag.startswith("R"):
        return "r"
    return "n"


lemmas = [lemmatizer.lemmatize(t, nltk_pos_to_wordnet(tag)) for t, tag in tagged]
```

`word_tokenize` 能处理缩写、Unicode 和正则表达式遗漏的边界情况。`PorterStemmer` 会执行全部五个阶段。`WordNetLemmatizer` 需要把 NLTK 的 Penn Treebank 词性方案转换成 WordNet 的缩写集合。上面的转换接线正是许多教程跳过的部分。

### spaCy

```python
import spacy

nlp = spacy.load("en_core_web_sm")
doc = nlp("The cats were running.")

for token in doc:
    print(token.text, token.lemma_, token.pos_)
```

```text
The      the     DET
cats     cat     NOUN
were     be      AUX
running  run     VERB
.        .       PUNCT
```

spaCy 把整条流水线封装在 `nlp(text)` 后面，一次执行分词、词性标注和词形还原。大规模处理时，它比 NLTK 更快，开箱精度也更高。代价是你很难随意替换单个组件。

### 怎样选择

| 场景 | 选择 |
|------|------|
| 教学、研究、需要替换组件 | NLTK |
| 生产、多语言、速度优先 | spaCy |
| Transformer 流水线（无论如何都要使用模型自带分词器） | 使用 `tokenizers` / `transformers`，跳过经典预处理 |

### 两个很少有人提醒你的失效方式

**可复现性漂移。** NLTK 和 spaCy 会在版本升级时改变分词与词形还原行为。spaCy 2.x 可能产生 `['do', "n't"]`，3.x 却可能产生 `["don't"]`。模型在一种分布上训练，推理时却收到另一种分布，准确率会悄然下降，团队很难定位原因。请在 `requirements.txt` 中锁定库版本，并编写预处理回归测试，固定 20 个样例句子的预期分词结果，每次升级都运行它。

**训练与推理不一致。** 训练时执行激进预处理，例如小写化、删除停用词和词干提取，部署时却直接输入原始用户文本，模型性能便会崩塌。这是生产 NLP 中最常见的故障。训练阶段执行了预处理，推理阶段就必须调用同一个函数。把预处理函数放进模型包一起交付，不要把它留在由服务团队重新实现的笔记本单元格中。

## 交付成果

产出一份可复用提示词，帮助工程师在不读三本教材的情况下选择预处理策略。

保存为 `outputs/prompt-preprocessing-advisor.md`：

```markdown
---
name: preprocessing-advisor
description: Recommends a tokenization, stemming, and lemmatization setup for an NLP task.
phase: 5
lesson: 01
---

You advise on classical NLP preprocessing. Given a task description, you output:

1. Tokenization choice (regex, NLTK word_tokenize, spaCy, or transformer tokenizer). Explain why.
2. Whether to stem, lemmatize, both, or neither. Explain why.
3. Specific library calls. Name the functions. Quote the POS-tag translation if NLTK is involved.
4. One failure mode the user should test for.

Refuse to recommend stemming for user-visible text. Refuse to recommend lemmatization without POS tags. Flag non-English input as needing a different pipeline.
```

## 练习

1. **简单。** 扩展 `tokenize`，让 URL 保持为单个词元。测试：`tokenize("Visit https://example.com today.")` 应只产生一个 URL 词元。
2. **中等。** 实现 Porter 步骤 1b。若单词包含元音且以 `ed` 或 `ing` 结尾，则删除该后缀。处理双辅音规则（`hopping -> hop`，不能变成 `hopp`）。
3. **困难。** 构建一个以 WordNet 为查询表的词形还原器；WordNet 无条目时，回退到你的 Porter 词干提取器。在带标注语料上衡量其准确率，并与单独使用 WordNet、单独使用 Porter 的结果比较。

## 关键术语

| 术语 | 常见说法 | 准确含义 |
|------|----------|----------|
| 词元（词元） | 一个单词 | 模型消费的任意单位，可以是词、子词、字符或字节。 |
| 词干（stem） | 单词的词根 | 按规则删除后缀的结果，不一定是真实单词。 |
| 词元形式（lemma） | 词典形式 | 你会在词典中查询的形式；正确计算它需要语法上下文。 |
| 词性标签（POS tag） | 词类 | `NOUN`、`VERB`、`ADJ` 等类别；准确还原词形需要它。 |
| 形态学（morphology） | 词形规则 | 单词如何随时态、数和格改变形式；词形还原依赖这些规则。 |

## 延伸阅读

- [Porter, M. F. (1980). An algorithm for suffix stripping](https://tartarus.org/martin/PorterStemmer/def.txt)：原始论文只有五页，至今仍是最清楚的解释。
- [spaCy 101：语言学特征](https://spacy.io/usage/linguistic-features)：真实流水线的组件如何连接。
- [NLTK Book 第 3 章](https://www.nltk.org/book/ch03.html)：你可能还没考虑过的分词边界情况。
