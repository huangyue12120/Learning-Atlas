---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/05-nlp-foundations-to-advanced/07-pos-tagging-parsing/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 05fb67fdbec5afafc9e35f4d96de29663c1a37022ad70bbe3f97e804366c8a6e
status: reviewed
---

# 词性标注与句法分析

> 语法曾一度失宠。后来每条 LLM 流水线都需要验证结构化提取，语法又回来了。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 5 第 01 课（文本处理）、Phase 2 第 14 课（朴素贝叶斯）  
**预计时间：** 约 45 分钟

## 问题

第 01 课提到，词形还原需要词性标签。不知道 `running` 是动词，词形还原器就无法把它变成 `run`；不知道 `better` 是形容词，就无法还原为 `good`。

这句话背后藏着一个完整的子领域。词性标注为词分配语法类别，句法分析恢复句子的树状结构，包括哪个词修饰哪个词、哪个动词支配哪些论元。经典 NLP 用二十年改进这两项任务。深度学习到来后，研究者把它们压缩成预训练 Transformer 顶部的词元分类问题，研究热点随之转移。

应用领域并没有离开它们。结构化提取流水线仍在底层使用词性与依存树。系统依据语法约束验证 LLM 生成的 JSON，问答系统借助依存分析拆解查询，机器翻译质量评估器还会检查句法树对齐。

这些知识值得掌握。本课介绍标签集、基线方法，以及何时应停止从零实现，直接调用 spaCy。

## 概念

**词性标注（POS tagging）** 为每个词元赋予语法类别。英语默认使用 **Penn Treebank（PTB）** 标签集。它有 36 个标签，区分细到让普通读者感到繁琐：`NN` 是单数名词，`NNS` 是复数名词，`NNP` 是单数专有名词，`VBD` 是动词过去式，`VBZ` 是动词第三人称单数现在式，等等。**Universal Dependencies（UD）** 标签集更粗，只有 17 个标签，但与语言无关，因此成了跨语言工作的默认选择。

```text
The/DET cats/NOUN were/AUX running/VERB at/ADP 3pm/NOUN ./PUNCT
```

**句法分析（syntactic parsing）**生成一棵树，主要有两种形式：

- **成分句法分析（constituency parsing）。** 名词短语、动词短语和介词短语彼此嵌套。输出是非终结符类别（NP、VP、PP）构成的树，单词位于叶节点。
- **依存句法分析（dependency parsing）。** 每个词都依赖一个中心词，并带有语法关系标签。输出是一棵树，每条边都是 `(head, dependent, relation)` 三元组。

依存分析在 2010 年代占据主流，因为它可以自然泛化到多种语言，尤其是语序自由的语言。

```text
running is ROOT
cats is nsubj of running
were is aux of running
at is prep of running
3pm is pobj of at
```

```figure
pos-tagger
```

```figure
dependency-arcs
```

## 动手实现

### 步骤 1：最高频标签基线

这是最简单的实用词性标注器。对每个词，预测它在训练数据中最常见的标签。

```python
from collections import Counter, defaultdict


def train_mft(train_examples):
    word_tag_counts = defaultdict(Counter)
    all_tags = Counter()
    for tokens, tags in train_examples:
        for token, tag in zip(tokens, tags):
            word_tag_counts[token.lower()][tag] += 1
            all_tags[tag] += 1
    word_best = {w: c.most_common(1)[0][0] for w, c in word_tag_counts.items()}
    default_tag = all_tags.most_common(1)[0][0]
    return word_best, default_tag


def predict_mft(tokens, word_best, default_tag):
    return [word_best.get(t.lower(), default_tag) for t in tokens]
```

这个基线在 Brown 语料上达到约 85% 准确率。结果不算好，但严肃模型不应低于这条底线。

### 步骤 2：二元 HMM 标注器 <!-- learning-atlas: step-2-bigram-hmm-tagger -->

对序列的联合概率建模：

```text
P(tags, words) = prod P(tag_i | tag_{i-1}) * P(word_i | tag_i)
```

模型使用两张表：转移概率表记录给定前一标签时当前标签的概率；发射概率表记录给定标签时某个词出现的概率。用计数和拉普拉斯平滑估计二者，再用 Viterbi 在标签格上做动态规划解码。

```python
import math


def train_hmm(train_examples, alpha=0.01):
    transitions = defaultdict(Counter)
    emissions = defaultdict(Counter)
    tags = set()
    vocab = set()

    for tokens, ts in train_examples:
        prev = "<BOS>"
        for token, tag in zip(tokens, ts):
            transitions[prev][tag] += 1
            emissions[tag][token.lower()] += 1
            tags.add(tag)
            vocab.add(token.lower())
            prev = tag
        transitions[prev]["<EOS>"] += 1

    return transitions, emissions, tags, vocab


def log_prob(table, given, key, smooth_denom, alpha):
    return math.log((table[given].get(key, 0) + alpha) / smooth_denom)


def viterbi(tokens, transitions, emissions, tags, vocab, alpha=0.01):
    tags_list = list(tags)
    n = len(tokens)
    V = [[0.0] * len(tags_list) for _ in range(n)]
    back = [[0] * len(tags_list) for _ in range(n)]

    for j, tag in enumerate(tags_list):
        em_denom = sum(emissions[tag].values()) + alpha * (len(vocab) + 1)
        tr_denom = sum(transitions["<BOS>"].values()) + alpha * (len(tags_list) + 1)
        tr = log_prob(transitions, "<BOS>", tag, tr_denom, alpha)
        em = log_prob(emissions, tag, tokens[0].lower(), em_denom, alpha)
        V[0][j] = tr + em
        back[0][j] = 0

    for i in range(1, n):
        for j, tag in enumerate(tags_list):
            em_denom = sum(emissions[tag].values()) + alpha * (len(vocab) + 1)
            em = log_prob(emissions, tag, tokens[i].lower(), em_denom, alpha)
            best_prev = 0
            best_score = -1e30
            for k, prev_tag in enumerate(tags_list):
                tr_denom = sum(transitions[prev_tag].values()) + alpha * (len(tags_list) + 1)
                tr = log_prob(transitions, prev_tag, tag, tr_denom, alpha)
                score = V[i - 1][k] + tr + em
                if score > best_score:
                    best_score = score
                    best_prev = k
            V[i][j] = best_score
            back[i][j] = best_prev

    last_best = max(range(len(tags_list)), key=lambda j: V[n - 1][j])
    path = [last_best]
    for i in range(n - 1, 0, -1):
        path.append(back[i][path[-1]])
    return [tags_list[j] for j in reversed(path)]
```

二元 HMM 在 Brown 语料上达到约 93% 准确率。从 85% 到 93% 的提升主要来自转移概率，模型学会了 `DET NOUN` 很常见，而 `NOUN DET` 很少见。

### 步骤 3：现代标注器为何更强

转移和发射概率只能捕捉局部信息。它们无法判断 `saw` 在“I bought a saw”中是名词，而在“I saw the movie”中是动词。带任意特征的 CRF，例如后缀、词形、前后词和词本身，能达到约 97%。BiLSTM-CRF 或 Transformer 则能达到约 98% 以上。

这项任务的上限受标注者分歧制约。人工标注者在 Penn Treebank 上的一致率约为 97%。超过 98% 的模型很可能已对测试集过拟合。

### 步骤 4：依存句法分析示意

完整的依存分析实现超出本课范围；Jurafsky 和 Martin 的教材给出了权威讲解。你需要知道两类经典方法：

- **基于转移**的分析器（arc-eager、arc-standard）类似移进-归约分析器：读取词元，把它们移入栈中，再应用创建依存弧的归约动作。贪心解码速度快。经典实现是 MaltParser，现代神经版本则有 Chen 与 Manning 的转移式分析器。
- **基于图**的分析器（Eisner 算法、Dozat-Manning 双仿射模型）为每条可能的中心词与依存词边打分，再选择最大生成树。速度较慢，准确率更高。

大多数应用直接调用 spaCy：

```python
import spacy

nlp = spacy.load("en_core_web_sm")
doc = nlp("The cats were running at 3pm.")
for token in doc:
    print(f"{token.text:10s} tag={token.tag_:5s} pos={token.pos_:6s} dep={token.dep_:10s} head={token.head.text}")
```

```text
The        tag=DT    pos=DET    dep=det        head=cats
cats       tag=NNS   pos=NOUN   dep=nsubj      head=running
were       tag=VBD   pos=AUX    dep=aux        head=running
running    tag=VBG   pos=VERB   dep=ROOT       head=running
at         tag=IN    pos=ADP    dep=prep       head=running
3pm        tag=NN    pos=NOUN   dep=pobj       head=at
.          tag=.     pos=PUNCT  dep=punct      head=running
```

从下往上读取 `dep` 列，句子的语法结构便会显现。

## 使用现成工具

生产 NLP 库通常把词性和依存分析器纳入标准流水线。

- **spaCy**（`en_core_web_sm`、`md`、`lg`、`trf`）。速度快、准确，并与分词、NER、词形还原集成。`token.tag_` 为 Penn 标签，`token.pos_` 为 UD 标签，`token.dep_` 为依存关系。
- **Stanford NLP（stanza）**。Stanford 对 CoreNLP 的后继项目，在 60 多种语言上达到顶尖性能。
- **trankit**。基于 Transformer，UD 准确率高。
- **NLTK**。使用 `pos_tag`，可用但较慢、年代较早，适合教学。

### 到 2026 年仍需这些知识的场景

- **词形还原。** 第 01 课需要 POS 才能正确还原词形。
- **从 LLM 输出中提取结构。** 验证生成句子是否符合语法约束，例如主谓一致与必需修饰语。
- **基于方面的情感分析。** 依存分析告诉你哪个形容词修饰哪个名词。
- **查询理解。** “movies directed by Wes Anderson starring Bill Murray”可以通过句法树拆成结构化约束。
- **跨语言迁移。** UD 标签和依存关系不依赖具体语言，可对新语言执行零样本结构分析。
- **低计算量流水线。** 无法部署 Transformer 时，POS、依存分析与词典的组合能完成相当多任务。

## 交付成果

保存为 `outputs/skill-grammar-pipeline.md`：

```markdown
---
name: grammar-pipeline
description: Design a classical POS + dependency pipeline for a downstream NLP task.
version: 1.0.0
phase: 5
lesson: 07
tags: [nlp, pos, parsing]
---

Given a downstream task (information extraction, rewrite validation, query decomposition, lemmatization), you output:

1. Tagset to use. Penn Treebank for English-only legacy pipelines, Universal Dependencies for multilingual or cross-lingual.
2. Library. spaCy for most production, stanza for academic-grade multilingual, trankit for highest UD accuracy. Name the specific model ID.
3. Integration pattern. Show the 3-5 lines that call the library and consume the needed attributes (`.pos_`, `.dep_`, `.head`).
4. Failure mode to test. Noun-verb ambiguity (`saw`, `book`, `can`) and PP-attachment ambiguity are the classical traps. Sample 20 outputs and eyeball.

Refuse to recommend rolling your own parser. Building parsers from scratch is a research project, not an application task. Flag any pipeline that consumes POS tags without handling lowercase/uppercase variants as fragile.
```

## 练习

1. **简单。** 在小型标注语料上运行最高频标签基线，例如 NLTK 的 Brown 子集；在留出句子上测量准确率，验证约 85% 的结果。
2. **中等。** 训练上面的二元 HMM 并报告逐标签精确率与召回率。HMM 最容易混淆哪些标签？
3. **困难。** 使用 spaCy 的依存分析，从 1000 个句子样本中提取主语、动词、宾语三元组。在 50 个手工标注三元组上评估，并记录失效位置，通常包括被动语态、并列结构和省略主语。

## 关键术语

| 术语 | 常见说法 | 准确含义 |
|------|----------|----------|
| 词性标签（POS tag） | 词的类型 | 语法类别；PTB 有 36 种，UD 有 17 种。 |
| Penn Treebank | 标准标签集 | 英语专用，细分动词时态与名词单复数。 |
| Universal Dependencies | 多语言标签集 | 比 PTB 粗，与具体语言无关，是跨语言工作的默认选择。 |
| 依存句法分析 | 句子树 | 每个词有一个中心词，每条边带一种语法关系。 |
| Viterbi | 动态规划 | 根据发射与转移概率找出概率最高的标签序列。 |

## 延伸阅读

- [Jurafsky and Martin：《Speech and Language Processing》第 8、18 章](https://web.stanford.edu/~jurafsky/slp3/)：词性标注与句法分析的权威教材讲解。
- [Universal Dependencies 项目](https://universaldependencies.org/)：所有多语言分析器都在使用的跨语言标签集与树库集合。
- [spaCy 语言学特征指南](https://spacy.io/usage/linguistic-features)：`Token` 暴露的每个属性的实用参考。
- [Chen and Manning (2014). A Fast and Accurate Dependency Parser using Neural Networks](https://nlp.stanford.edu/pubs/emnlp2014-depparser.pdf)：把神经句法分析器带入主流的论文。
