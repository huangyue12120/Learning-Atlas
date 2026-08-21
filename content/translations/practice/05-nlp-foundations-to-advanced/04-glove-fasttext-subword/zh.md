---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/05-nlp-foundations-to-advanced/04-glove-fasttext-subword/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: b92cf9d14b8729b4a378b0b4f468f4d957f6600c15d876b091d8dec54d8d3e47
status: reviewed
---

# GloVe、FastText 与子词嵌入

> Word2Vec 为每个词训练一个嵌入；GloVe 分解共现矩阵；FastText 嵌入词的组成部分；BPE 则搭起通往 Transformer 的桥梁。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 5 第 03 课（从零实现 Word2Vec）  
**预计时间：** 约 45 分钟

## 问题

Word2Vec 留下了两个悬而未决的问题。

首先，另一条研究路线没有进行在线 skip-gram 更新，而是直接分解共现矩阵，例如 LSA 和 HAL。Word2Vec 的迭代方法是否从原理上更好，还是两类方法处理计数的方式造成了差异？**GloVe** 给出了答案：使用精心设计损失函数的矩阵分解可以达到或超过 Word2Vec，而且训练成本更低。

其次，这两种方法都无法处理从未见过的词。`Zoomer-approved`、`dogecoin`、上周刚造出的专有名词，以及稀有词根的各种屈折形式都无向量可用。**FastText** 为字符 n-gram 建立嵌入来解决这一问题：一个词由包含词素在内的各个部分向量相加而成，因此词表外词也能获得合理向量。

Transformer 出现后，问题再次转移。词级词表的容量通常止步于约一百万项，真实语言却远比这开放。**字节对编码（Byte-Pair Encoding，BPE）**及其相关方法学习覆盖所有文本的高频子词单元词表，从而解决了这个问题。现代大语言模型的分词器都采用子词方案。

本课依次讲解三种方法，再说明各自适合什么场景。

## 概念

**GloVe（Global Vectors）。** 构建词与词的共现矩阵 `X`，其中 `X[i][j]` 表示词 `j` 出现在词 `i` 上下文中的次数。训练向量，使 `v_i · v_j + b_i + b_j ≈ log(X[i][j])`。损失函数要降低高频词对的影响，避免它们支配训练。

**FastText。** 一个词等于其字符 n-gram 与完整词本身的向量之和。`where` 会变成 `<wh, whe, her, ere, re>, <where>`。按 Word2Vec 的方式训练这些组成向量。它的好处是，未见过的词（如 `whereupon`）也能由已知 n-gram 组合出来。

**BPE（Byte-Pair Encoding）。** 从单个字节或字符组成的词表开始，统计语料中所有相邻词元对，把最常见的一对合并成新词元，重复 `k` 次。最终词表含有 `k + 256` 个词元；高频序列（`ing`、`tion`、`the`）会成为单个词元，稀有词则拆成熟悉的片段。任何句子都能完成分词。

```figure
n5-subword-merge
```

## 动手实现

### GloVe：分解共现矩阵

```python
import numpy as np
from collections import Counter


def build_cooccurrence(docs, window=5):
    pair_counts = Counter()
    vocab = {}
    for doc in docs:
        for token in doc:
            if token not in vocab:
                vocab[token] = len(vocab)
    for doc in docs:
        indexed = [vocab[t] for t in doc]
        for i, center in enumerate(indexed):
            for j in range(max(0, i - window), min(len(indexed), i + window + 1)):
                if i != j:
                    distance = abs(i - j)
                    pair_counts[(center, indexed[j])] += 1.0 / distance
    return vocab, pair_counts


def glove_train(vocab, pair_counts, dim=16, epochs=100, lr=0.05, x_max=100, alpha=0.75, seed=0):
    n = len(vocab)
    rng = np.random.default_rng(seed)
    W = rng.normal(0, 0.1, size=(n, dim))
    W_tilde = rng.normal(0, 0.1, size=(n, dim))
    b = np.zeros(n)
    b_tilde = np.zeros(n)

    for epoch in range(epochs):
        for (i, j), x_ij in pair_counts.items():
            weight = (x_ij / x_max) ** alpha if x_ij < x_max else 1.0
            diff = W[i] @ W_tilde[j] + b[i] + b_tilde[j] - np.log(x_ij)
            coef = weight * diff

            grad_W_i = coef * W_tilde[j]
            grad_W_tilde_j = coef * W[i]
            W[i] -= lr * grad_W_i
            W_tilde[j] -= lr * grad_W_tilde_j
            b[i] -= lr * coef
            b_tilde[j] -= lr * coef

    return W + W_tilde
```

需要记住两个关键部分。加权函数 `f(x) = (x/x_max)^alpha` 会降低极高频词对（如 `(the, and)`）的权重，防止它们支配损失。最终嵌入是 `W`（中心词）与 `W_tilde`（上下文）两张表之和。论文证明，这个求和技巧通常比只使用其中一张表效果更好。

### FastText：感知子词的嵌入

```python
def char_ngrams(word, n_min=3, n_max=6):
    wrapped = f"<{word}>"
    grams = {wrapped}
    for n in range(n_min, n_max + 1):
        for i in range(len(wrapped) - n + 1):
            grams.add(wrapped[i:i + n])
    return grams
```

```python
>>> char_ngrams("where")
{'<where>', '<wh', 'whe', 'her', 'ere', 're>', '<whe', 'wher', 'here', 'ere>', '<wher', 'where', 'here>'}
```

每个词由一组 n-gram 表示，通常取 3 到 6 个字符。词嵌入就是这些 n-gram 嵌入的总和。训练 skip-gram 时，用这一组合代替 Word2Vec 的单个向量即可。

```python
def fasttext_vector(word, ngram_table):
    grams = char_ngrams(word)
    vecs = [ngram_table[g] for g in grams if g in ngram_table]
    if not vecs:
        return None
    return np.sum(vecs, axis=0)
```

只要未见词的部分 n-gram 已知，仍能得到向量。`whereupon` 与 `where` 共享 `<wh`、`her`、`ere` 和 `<where`，所以二者会落在相近位置。

### BPE：学习子词词表

```python
def learn_bpe(corpus, k_merges):
    vocab = Counter()
    for word, freq in corpus.items():
        tokens = tuple(word) + ("</w>",)
        vocab[tokens] = freq

    merges = []
    for _ in range(k_merges):
        pair_freq = Counter()
        for tokens, freq in vocab.items():
            for a, b in zip(tokens, tokens[1:]):
                pair_freq[(a, b)] += freq
        if not pair_freq:
            break
        best = pair_freq.most_common(1)[0][0]
        merges.append(best)

        new_vocab = Counter()
        for tokens, freq in vocab.items():
            new_tokens = []
            i = 0
            while i < len(tokens):
                if i + 1 < len(tokens) and (tokens[i], tokens[i + 1]) == best:
                    new_tokens.append(tokens[i] + tokens[i + 1])
                    i += 2
                else:
                    new_tokens.append(tokens[i])
                    i += 1
            new_vocab[tuple(new_tokens)] = freq
        vocab = new_vocab
    return merges


def apply_bpe(word, merges):
    tokens = list(word) + ["</w>"]
    for a, b in merges:
        new_tokens = []
        i = 0
        while i < len(tokens):
            if i + 1 < len(tokens) and tokens[i] == a and tokens[i + 1] == b:
                new_tokens.append(a + b)
                i += 2
            else:
                new_tokens.append(tokens[i])
                i += 1
        tokens = new_tokens
    return tokens
```

```python
>>> corpus = Counter({"low": 5, "lower": 2, "newest": 6, "widest": 3})
>>> merges = learn_bpe(corpus, k_merges=10)
>>> apply_bpe("lowest", merges)
['low', 'est</w>']
```

第一轮合并频率最高的相邻词元对。迭代足够多次后，高频子串（`low`、`est`、`tion`）会变成单个词元，稀有词则会干净地拆开。

真正的 GPT、BERT、T5 分词器会学习 3 万至 10 万次合并。于是，任何文本都能转成长度有界的已知 ID 序列，不再出现 OOV。

## 使用现成工具

实际项目很少自行训练这些模型，通常直接加载预训练检查点。

```python
import fasttext.util
fasttext.util.download_model("en", if_exists="ignore")
ft = fasttext.load_model("cc.en.300.bin")
print(ft.get_word_vector("whereupon").shape)
print(ft.get_word_vector("zoomerapproved").shape)
```

在 Transformer 时代使用 BPE 风格的子词分词：

```python
from transformers import AutoTokenizer

tok = AutoTokenizer.from_pretrained("gpt2")
print(tok.tokenize("unbelievably tokenized"))
```

```text
['un', 'bel', 'iev', 'ably', 'Ġtoken', 'ized']
```

前缀 `Ġ` 标记词边界，这是 GPT-2 的约定。现代分词器会采用 BPE 变体、WordPiece（BERT）或 SentencePiece（T5、LLaMA）。

### 怎样选择

| 场景 | 选择 |
|------|------|
| 通用预训练词向量，不需要容忍 OOV | GloVe 300d |
| 通用预训练词向量，必须处理拼写错误、新词或形态丰富的语言 | FastText |
| 输入 Transformer 的任何内容，无论训练还是推理 | 使用模型随附的分词器，绝不能替换。 |
| 从零训练自己的语言模型 | 先在语料上训练 BPE 或 SentencePiece 分词器。 |
| 生产环境中的线性文本分类 | 仍然选择 TF-IDF，见第 02 课。 |

## 交付成果

保存为 `outputs/skill-embeddings-picker.md`：

```markdown
---
name: tokenizer-picker
description: Pick a tokenization approach for a new language model or text pipeline.
version: 1.0.0
phase: 5
lesson: 04
tags: [nlp, tokenization, embeddings]
---

Given a task and dataset description, you output:

1. Tokenization strategy (word-level, BPE, WordPiece, SentencePiece, byte-level). One-sentence reason.
2. Vocabulary size target (e.g., 32k for an English-only LM, 64k-100k for multilingual).
3. Library call with the exact training command. Name the library. Quote the arguments.
4. One reproducibility pitfall. Tokenizer-model mismatch is the single most common silent production bug; call out which pair must be used together.

Refuse to recommend training a custom tokenizer when the user is fine-tuning a pretrained LLM. Refuse to recommend word-level tokenization for any model targeting production inference. Flag non-English / multi-script corpora as needing SentencePiece with byte fallback.
```

## 练习

1. **简单。** 运行 `char_ngrams("playing")` 和 `char_ngrams("played")`，计算两组 n-gram 的 Jaccard 重叠。你会看到许多共享片段（`pla`、`lay`、`play`），这解释了 FastText 为何能在形态变体之间迁移。
2. **中等。** 扩展 `learn_bpe`，跟踪词表增长。绘制每个语料字符对应词元数随合并次数变化的曲线。起初压缩速度很快，随后会渐近到每个词元约 2 至 3 个字符。
3. **困难。** 在莎士比亚全集上训练包含 1000 次合并的 BPE。比较常见词与稀有专有名词的分词结果，测量合并前后每个词的平均词元数，并写下令你意外的发现。

## 关键术语

| 术语 | 常见说法 | 准确含义 |
|------|----------|----------|
| 共现矩阵（co-occurrence matrix） | 词与词的频率表 | `X[i][j]` 表示词 `j` 在词 `i` 周围窗口中出现的次数。 |
| 子词（subword） | 单词的一部分 | 字符 n-gram（FastText）或学习到的词元（BPE、WordPiece、SentencePiece）。 |
| BPE | 字节对编码 | 反复合并最高频相邻词元对，直到词表达到目标大小。 |
| OOV | 词表外 | 模型从未见过的词；Word2Vec 与 GloVe 无法处理，FastText 与 BPE 可以。 |
| 字节级 BPE | 在原始字节上运行 BPE | GPT-2 的方案。词表从 256 个字节开始，因此不存在 OOV。 |

## 延伸阅读

- [Pennington, Socher, Manning (2014). GloVe: Global Vectors for Word Representation](https://nlp.stanford.edu/pubs/glove.pdf)：七页的 GloVe 论文，仍是损失函数推导的最佳说明。
- [Bojanowski et al. (2017). Enriching Word Vectors with Subword Information](https://arxiv.org/abs/1607.04606)：FastText 论文。
- [Sennrich, Haddow, Birch (2016). Neural Machine Translation of Rare Words with Subword Units](https://arxiv.org/abs/1508.07909)：把 BPE 引入现代 NLP 的论文。
- [Hugging Face 分词器综述](https://huggingface.co/docs/transformers/tokenizer_summary)：BPE、WordPiece 与 SentencePiece 在实践中的差异。
