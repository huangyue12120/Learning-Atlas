---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/05-nlp-foundations-to-advanced/16-text-generation-pre-transformer/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 92d3b5e90a0730efd6819090e514a562e02185a3a1b65f78b60331692adbb9ee
status: reviewed
---

# Transformer 之前的文本生成：N-gram 语言模型

> 一个词若令模型意外，说明模型不好。困惑度把意外变成数字，平滑则让它保持有限。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 5 第 01 课（文本处理）、Phase 2 第 14 课（朴素贝叶斯）  
**预计时间：** 约 45 分钟

## 问题

在 Transformer、RNN 和词嵌入出现之前，语言模型通过统计一个词跟在前 `n-1` 个词之后的频率来预测下一词。统计得到“the cat”后接“sat”47 次，接“jumped”12 次，接“refrigerator”0 次，再归一化成概率分布。

这种模型称为 n-gram 语言模型。1980 至 2015 年间，语音识别器、拼写检查器和基于短语的机器翻译系统都依靠它。今天需要廉价端侧语言建模时，它仍会运行。

真正有趣的问题是怎样处理未见 n-gram。原始计数模型为未见序列分配零概率，这会造成灾难，因为句子很长，几乎每个长句都至少含一个未见序列。五十年的平滑研究解决了这个问题，Kneser-Ney 平滑是最终成果，现代深度学习也继承了它重视实证的传统。

## 概念

![N-gram 模型：计数、平滑、生成](../assets/ngram.svg)

### 预测游戏

在上述机制出现之前，一个实验已经定义了语言模型。遮住英语句子的下一个字母，让一个人逐个猜测，直到猜中为止，记录猜测次数，再对几百个字母重复。

猜测次数构成文本的无损重新编码。把这串次数交给第二个采用相同猜测顺序的人，他可以重建每个字母，因为每个位置的候选顺序都已确定。能用更少符号重新编码的消息，每个符号携带的信息更少，因此猜测次数统计给出了英语熵的上限。

Shannon 在 1951 年运行了这个实验，得到的数值至今仍支配该领域。27 个符号组成的字母表（26 个字母加空格）每个字母最多携带 `log2(27) ≈ 4.75` 比特。拥有 100 个字母上下文的人类猜测者只需每字母 0.6 至 1.3 比特。英语大约四分之三的位置都近乎只有一种选择。任何模型具备学习能力之前，研究者已经测量了它要学习的结构。

此后的每个语言模型都是这场游戏的机械玩家，本课的每个评估数值都在为游戏计分：

- **交叉熵损失**是模型平均为每个符号所需的比特数。训练语言模型就是最小化猜测游戏得分。
- **困惑度**是 `2^bits` 或 `e^nats`，表示模型猜测后仍面对的分支数。均匀猜测 27 个符号时困惑度为 27；每字母 1 比特的玩家困惑度为 2。
- **上下文长度就是玩家的记忆。** 三元模型只有两个词元的记忆，Transformer 玩的是同一场游戏，却拥有 10 万词元上下文。规则没有改变，玩家变强了。

需要留意一次单位切换：游戏用比特（`log2`）按字母计分，下面的 n-gram 公式则用 nat（自然对数）按词元计分。因为 nat 中的困惑度 `e^H` 与 bit 中的 `2^H` 相等，两种视角只是单位不同。

```figure
prediction-game
```

**N-gram 概率：** `P(w_i | w_{i-n+1}, ..., w_{i-1})`。固定 `n`，通常三元模型取 3，四元模型取 4，再根据计数计算：

```text
P(w | context) = count(context, w) / count(context)
```

**零计数问题。** 训练中未见的 n-gram 概率为零。2007 年一项 Brown 语料研究发现，即使使用四元模型，留出集仍有 30% 的四元组在训练中未出现。不做平滑就无法在真实文本上评估。

**平滑方法按复杂度递增如下：**

1. **拉普拉斯（加一）。** 给每个计数加 1。简单，却不适合稀有事件。
2. **Good-Turing。** 根据“频率的频率”，把概率质量从高频事件重新分给未见事件。
3. **插值。** 用可调权重组合 n-gram、`(n-1)`-gram 等估计。
4. **回退。** n-gram 计数为零时，退回 `(n-1)`-gram。Katz 回退会做归一化。
5. **绝对折扣。** 从所有计数减去固定折扣 `D`，再把释放的概率分给未见事件。
6. **Kneser-Ney。** 绝对折扣加上巧妙的低阶模型：使用**延续概率**，即一个词出现于多少种上下文，而不是原始词频。

Kneser-Ney 的洞见很深。“San Francisco”是常见二元组，单词“Francisco”几乎总出现在“San”之后。朴素绝对折扣会因计数高而给“Francisco”较高的一元概率。Kneser-Ney 发现它只出现于一种上下文，于是降低其延续概率。因此，以“Francisco”结尾的新二元组会得到恰当的低概率。

**评估：困惑度。** 在留出测试集上，对每词平均负对数似然取指数，越低越好。困惑度 100 表示模型的迷惑程度相当于在 100 个词之间均匀选择。

```text
perplexity = exp(- (1/N) * Σ log P(w_i | context_i))
```

```figure
ngram-backoff
```

## 动手实现

### 步骤 1：三元组计数

```python
from collections import Counter, defaultdict


def train_ngram(corpus_tokens, n=3):
    ngrams = Counter()
    contexts = Counter()
    for sentence in corpus_tokens:
        padded = ["<s>"] * (n - 1) + sentence + ["</s>"]
        for i in range(len(padded) - n + 1):
            ctx = tuple(padded[i:i + n - 1])
            word = padded[i + n - 1]
            ngrams[ctx + (word,)] += 1
            contexts[ctx] += 1
    return ngrams, contexts


def raw_probability(ngrams, contexts, context, word):
    ctx = tuple(context)
    if contexts.get(ctx, 0) == 0:
        return 0.0
    return ngrams.get(ctx + (word,), 0) / contexts[ctx]
```

输入是分好词的句子列表，输出是 n-gram 计数与上下文计数。`<s>` 和 `</s>` 表示句子边界。

### 步骤 2：拉普拉斯平滑

```python
def laplace_probability(ngrams, contexts, vocab_size, context, word):
    ctx = tuple(context)
    numerator = ngrams.get(ctx + (word,), 0) + 1
    denominator = contexts.get(ctx, 0) + vocab_size
    return numerator / denominator
```

给每个计数加 1。它能完成平滑，却向未见事件分配过多概率，也伤害已知稀有事件。

### 步骤 3：Kneser-Ney（二元、插值）

```python
def kneser_ney_bigram_model(corpus_tokens, discount=0.75):
    unigrams = Counter()
    bigrams = Counter()
    unigram_contexts = defaultdict(set)

    for sentence in corpus_tokens:
        padded = ["<s>"] + sentence + ["</s>"]
        for i, w in enumerate(padded):
            unigrams[w] += 1
            if i > 0:
                prev = padded[i - 1]
                bigrams[(prev, w)] += 1
                unigram_contexts[w].add(prev)

    total_unique_bigrams = sum(len(ctx_set) for ctx_set in unigram_contexts.values())
    continuation_prob = {
        w: len(ctx_set) / total_unique_bigrams for w, ctx_set in unigram_contexts.items()
    }

    context_totals = Counter()
    for (prev, w), count in bigrams.items():
        context_totals[prev] += count

    unique_follow = defaultdict(set)
    for (prev, w) in bigrams:
        unique_follow[prev].add(w)

    def prob(prev, w):
        count = bigrams.get((prev, w), 0)
        denom = context_totals.get(prev, 0)
        if denom == 0:
            return continuation_prob.get(w, 1e-9)
        first_term = max(count - discount, 0) / denom
        lambda_prev = discount * len(unique_follow[prev]) / denom
        return first_term + lambda_prev * continuation_prob.get(w, 1e-9)

    return prob
```

这里有三个部分。`continuation_prob` 捕捉“这个词出现在多少种不同上下文中”，这是 Kneser-Ney 的创新；`lambda_prev` 是折扣释放的概率质量，用于加权回退；最终概率等于折扣后的主项加带权延续项。

### 步骤 4：通过采样生成文本

```python
import random


def generate(prob_fn, vocab, prefix, max_len=30, seed=0):
    rng = random.Random(seed)
    tokens = list(prefix)
    for _ in range(max_len):
        candidates = [(w, prob_fn(tokens[-1], w)) for w in vocab]
        total = sum(p for _, p in candidates)
        r = rng.random() * total
        acc = 0.0
        for w, p in candidates:
            acc += p
            if r <= acc:
                tokens.append(w)
                break
        if tokens[-1] == "</s>":
            break
    return tokens
```

按概率比例采样，不同随机种子会给出不同输出。若想得到类似束搜索的输出，可以每步选择 argmax，也就是贪心，再加入温度作为小幅随机控制。

### 步骤 5：困惑度

```python
import math


def perplexity(prob_fn, sentences):
    total_log_prob = 0.0
    total_tokens = 0
    for sentence in sentences:
        padded = ["<s>"] + sentence + ["</s>"]
        for i in range(1, len(padded)):
            p = prob_fn(padded[i - 1], padded[i])
            total_log_prob += math.log(max(p, 1e-12))
            total_tokens += 1
    return math.exp(-total_log_prob / total_tokens)
```

越低越好。在 Brown 语料上，调优良好的四元 Kneser-Ney 模型困惑度约为 140；Transformer 语言模型在同一测试集上达到 15 至 30，差距约十倍。这解释了领域为何转向神经模型。

## 使用现成工具

- **经典 NLP 教学。** 它能最清楚地展示平滑、最大似然估计与困惑度。
- **KenLM。** 生产级 n-gram 库。在低延迟语音和机器翻译系统中用作重评分器。
- **端侧自动补全。** 键盘至今仍使用三元模型。
- **基线。** 宣称神经语言模型优秀之前，始终先计算 n-gram 语言模型困惑度。若 Transformer 没有大幅超过 KN，说明系统有问题。

## 交付成果

保存为 `outputs/prompt-lm-baseline.md`：

```markdown
---
name: lm-baseline
description: Build a reproducible n-gram language model baseline before training a neural LM.
phase: 5
lesson: 16
---

Given a corpus and target use (next-word prediction, rescoring, perplexity baseline), output:

1. N-gram order. Trigram for general English, 4-gram if corpus is large, 5-gram for speech rescoring.
2. Smoothing. Modified Kneser-Ney is the default; Laplace only for teaching.
3. Library. `kenlm` for production, `nltk.lm` for teaching, roll your own only to learn.
4. Evaluation. Held-out perplexity with consistent tokenization between train and test sets.

Refuse to report perplexity computed with different tokenization between systems being compared — perplexity numbers are comparable only under identical tokenization. Flag OOV rate in test set; KN handles OOV poorly unless you reserve a special <UNK> token during training.
```

## 练习

1. **简单。** 在包含 1000 句莎士比亚文本的语料上训练三元语言模型，生成 20 个句子。它们会局部合理、整体不连贯，这是经典演示。
2. **中等。** 在留出的莎士比亚数据上为 KN 模型实现困惑度，并与拉普拉斯平滑比较。KN 的困惑度应低 30% 至 50%。
3. **困难。** 构建三元拼写纠正器：给定拼错的词及其上下文，生成候选纠正，再按语言模型上下文概率排序。在公开 Birkbeck 拼写语料上评估。

## 关键术语

| 术语 | 常见说法 | 准确含义 |
|------|----------|----------|
| N-gram | 词序列 | `n` 个连续词元组成的序列。 |
| 平滑（smoothing） | 避免零概率 | 重新分配概率质量，让未见事件得到非零概率。 |
| 困惑度（perplexity） | 语言模型质量指标 | 留出数据上的 `exp(-average log-prob)`，越低越好。 |
| 回退（backoff） | 退到更短上下文 | 三元计数为零时使用二元模型，Katz 回退对其做了形式化。 |
| Kneser-Ney | 最佳 n-gram 平滑 | 绝对折扣加低阶模型的延续概率。 |
| 延续概率（continuation probability） | KN 专用概念 | 按词 `w` 出现的上下文数量加权 `P(w)`，而不是使用原始计数。 |
| 文本熵（entropy of text） | 每个符号的信息量 | 给定上下文后编码下一符号平均需要的比特数。Shannon 在 1951 年使用最多 100 个字母上下文，对印刷英语估计为每字母 0.6 至 1.3 比特，当时尚无任何模型。 |

## 延伸阅读

- [Shannon (1951). Prediction and Entropy of Printed English](https://www.princeton.edu/~wbialek/rome/refs/shannon_51.pdf)：定义所有语言模型至今仍在优化目标的猜测游戏实验。
- [Jurafsky and Martin：《Speech and Language Processing》第 3 章（2026 草稿）](https://web.stanford.edu/~jurafsky/slp3/3.pdf)：n-gram 语言模型与平滑的权威讲解。
- [Chen and Goodman (1998). An Empirical Study of Smoothing Techniques for Language Modeling](https://dash.harvard.edu/handle/1/25104739)：确立 Kneser-Ney 为最佳 n-gram 平滑的论文。
- [Kneser and Ney (1995). Improved Backing-off for M-gram Language Modeling](https://ieeexplore.ieee.org/document/479394)：KN 原始论文。
- [KenLM](https://kheafield.com/code/kenlm/)：快速生产级 n-gram 语言模型，2026 年仍用于延迟敏感应用。
