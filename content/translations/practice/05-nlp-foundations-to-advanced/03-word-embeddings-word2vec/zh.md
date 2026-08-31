---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/05-nlp-foundations-to-advanced/03-word-embeddings-word2vec/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 566500e6c43ebc3624a117e76843be1100be7951ac7780c37f15241299846b27
status: reviewed
---

# 词嵌入：从零实现 Word2Vec

> 观其伴，知其词。让浅层网络学习这个想法，几何结构就会出现。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 5 第 02 课（BoW 与 TF-IDF）、Phase 3 第 03 课（从零实现反向传播）  
**预计时间：** 约 75 分钟

## 问题

TF-IDF 知道 `dog` 和 `puppy` 是两个不同的词，却不知道它们含义相近。在 `dog` 上训练的分类器无法泛化到关于 `puppy` 的评论。你可以列出同义词来补救，但稀有词、领域术语和未曾预料的语言都会让这种办法失效。

我们希望得到一种表示，让 `dog` 和 `puppy` 在空间中彼此接近，让 `king - man + woman` 落在 `queen` 附近，也让模型从 `dog` 学到的信号可以自动迁移一部分给 `puppy`。

Word2Vec 给出了这样的空间。它是 2013 年发表的双层神经网络，曾在万亿词元规模上训练。架构简单得近乎令人尴尬，结果却重塑了之后十年的 NLP。

## 概念

**分布假说（distributional hypothesis）**由 Firth 在 1957 年提出：“You shall know a word by the company it keeps.” 两个词若出现在相似上下文中，很可能具有相近含义。

Word2Vec 用两种方式利用这个想法。

- **Skip-gram。** 给定中心词，预测周围的词。窗口大小为 2 时，`cat -> (the, sat, on)`。
- **CBOW（continuous bag of words，连续词袋）。** 给定周围的词，预测中心词。`(the, sat, on) -> cat`。

Skip-gram 训练较慢，但处理稀有词更好，因此成了默认选择。

网络只有一个不带非线性的隐藏层。输入是词表上的独热向量，输出是词表上的 softmax。训练完成后丢弃输出层，隐藏层权重就是嵌入。

```text
one-hot(center) ── W ──▶ hidden (d-dim) ── W' ──▶ softmax(vocab)
                          ^
                          this is the embedding
```

关键技巧在于：对 10 万个词计算 softmax 成本过高。Word2Vec 使用**负采样（negative sampling）**把问题改成二元分类：“这个上下文词是否出现在该中心词附近？”每个训练词对只抽取少量没有共同出现的负样本，无须对整个词表计算 softmax。

```figure
word-vector-arithmetic
```

## 动手实现

### 步骤 1：从语料生成训练词对

```python
def skipgram_pairs(docs, window=2):
    pairs = []
    for doc in docs:
        for i, center in enumerate(doc):
            for j in range(max(0, i - window), min(len(doc), i + window + 1)):
                if i == j:
                    continue
                pairs.append((center, doc[j]))
    return pairs
```

```python
>>> skipgram_pairs([["the", "cat", "sat", "on", "mat"]], window=2)
[('the', 'cat'), ('the', 'sat'),
 ('cat', 'the'), ('cat', 'sat'), ('cat', 'on'),
 ('sat', 'the'), ('sat', 'cat'), ('sat', 'on'), ('sat', 'mat'),
 ...]
```

窗口中的每个 `(center, context)` 词对都是一个正训练样本。

### 步骤 2：嵌入表

使用两个矩阵。`W` 是中心词嵌入表，也就是最终保留的矩阵；`W'` 是上下文词表，通常会丢弃，有时也与 `W` 取平均。

```python
import numpy as np


def init_embeddings(vocab_size, dim, seed=0):
    rng = np.random.default_rng(seed)
    W = rng.normal(0, 0.1, size=(vocab_size, dim))
    W_prime = rng.normal(0, 0.1, size=(vocab_size, dim))
    return W, W_prime
```

参数从较小的随机值开始。词表大小 1 万、维度 100 接近真实设置；教学时使用 50 个词、16 维已经足以观察几何结构。

### 步骤 3：负采样目标 <!-- learning-atlas: step-3-negative-sampling-objective -->

对每个正样本对 `(center, context)`，从词表随机抽取 `k` 个词作为负样本。训练目标是让正样本的点积 `W[center] · W'[context]` 较大，让负样本的点积较小。

```python
def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-np.clip(x, -20, 20)))


def train_pair(W, W_prime, center_idx, context_idx, negative_indices, lr):
    v_c = W[center_idx]
    u_pos = W_prime[context_idx]
    u_negs = W_prime[negative_indices]

    pos_score = sigmoid(v_c @ u_pos)
    neg_scores = sigmoid(u_negs @ v_c)

    grad_center = (pos_score - 1) * u_pos
    for i, u in enumerate(u_negs):
        grad_center += neg_scores[i] * u

    W[context_idx] = W[context_idx]
    W_prime[context_idx] -= lr * (pos_score - 1) * v_c
    for i, neg_idx in enumerate(negative_indices):
        W_prime[neg_idx] -= lr * neg_scores[i] * v_c
    W[center_idx] -= lr * grad_center
```

核心公式把正样本的逻辑损失与负样本的逻辑损失相加：正样本的 sigmoid 应接近 1，负样本则应接近 0。梯度会同时流入两张表。原论文给出了完整推导；若想牢牢记住，最好拿纸笔完整推一遍。

### 步骤 4：在玩具语料上训练

```python
def train(docs, dim=16, window=2, k_neg=5, epochs=100, lr=0.05, seed=0):
    vocab = build_vocab(docs)
    vocab_size = len(vocab)
    rng = np.random.default_rng(seed)
    W, W_prime = init_embeddings(vocab_size, dim, seed=seed)
    pairs = skipgram_pairs(docs, window=window)

    for epoch in range(epochs):
        rng.shuffle(pairs)
        for center, context in pairs:
            c_idx = vocab[center]
            ctx_idx = vocab[context]
            negs = rng.integers(0, vocab_size, size=k_neg)
            negs = [n for n in negs if n != ctx_idx and n != c_idx]
            train_pair(W, W_prime, c_idx, ctx_idx, negs, lr)
    return vocab, W
```

在大规模语料上训练足够多轮后，共享上下文的词会得到相似的中心词嵌入。玩具语料只能隐约显示这种效果；数十亿词元会让结构变得鲜明。

### 步骤 5：类比技巧

```python
def nearest(vocab, W, target_vec, topk=5, exclude=None):
    exclude = exclude or set()
    inv_vocab = {i: w for w, i in vocab.items()}
    norms = np.linalg.norm(W, axis=1, keepdims=True) + 1e-9
    W_norm = W / norms
    target = target_vec / (np.linalg.norm(target_vec) + 1e-9)
    sims = W_norm @ target
    order = np.argsort(-sims)
    out = []
    for i in order:
        if i in exclude:
            continue
        out.append((inv_vocab[i], float(sims[i])))
        if len(out) == topk:
            break
    return out


def analogy(vocab, W, a, b, c, topk=5):
    v = W[vocab[b]] - W[vocab[a]] + W[vocab[c]]
    return nearest(vocab, W, v, topk=topk, exclude={vocab[a], vocab[b], vocab[c]})
```

在预训练的 300 维 Google News 向量上：

```python
>>> analogy(vocab, W, "man", "king", "woman")
[('queen', 0.71), ('monarch', 0.62), ('princess', 0.59), ...]
```

`king - man + woman = queen`。模型并不懂王室概念，而是向量 `(king - man)` 捕捉到了某种类似“王室”的方向，把它加到 `woman` 上后，结果落在女性王室成员所在区域附近。

## 使用现成工具

从零编写 Word2Vec 适合教学，生产 NLP 使用 `gensim`。

```python
from gensim.models import Word2Vec

sentences = [
    ["the", "cat", "sat", "on", "the", "mat"],
    ["the", "dog", "ran", "across", "the", "room"],
]

model = Word2Vec(
    sentences,
    vector_size=100,
    window=5,
    min_count=1,
    sg=1,
    negative=5,
    workers=4,
    epochs=30,
)

print(model.wv["cat"])
print(model.wv.most_similar("cat", topn=3))
```

真实项目很少需要自行训练 Word2Vec，通常直接下载预训练向量。

- **GloVe**：斯坦福提出的共现矩阵分解方法，提供 50、100、200、300 维检查点，通用覆盖良好。第 04 课专门介绍 GloVe。
- **fastText**：Facebook 对 Word2Vec 的扩展，为字符 n-gram 建立嵌入，通过组合子词处理词表外词。见第 04 课。
- **Google News 预训练 Word2Vec**：300 维、300 万词词表，发布于 2013 年，至今仍有人每天下载。

### 2026 年 Word2Vec 仍胜出的场景

- 轻量级领域检索。在笔记本电脑上用医学摘要训练一小时，就能得到通用模型无法捕获的专业向量。
- 类比式特征工程。计算 `gender_vector = mean(man - woman pairs)`，再从其他词中减去该方向，可以得到性别中性轴。公平性研究仍在使用这种方法。
- 可解释性。100 维足够小，可以用 PCA 或 t-SNE 绘图，直接观察聚类形成。
- 必须在无 GPU 设备上运行的推理。Word2Vec 查找只需读取矩阵中的一行。

### Word2Vec 的失效场景

第一道墙是多义词。`bank` 只有一个向量，河岸和金融机构共用它；`table` 表示电子表格与家具时也共用同一向量。下游分类器无法从这个向量区分词义。

上下文嵌入（ELMo、BERT 及之后的所有 Transformer）会根据周围上下文，为同一个词的每次出现生成不同向量，从而解决这一问题。从 Word2Vec 到 BERT 的跃迁，就是从静态表示转向上下文表示。Phase 7 会介绍 Transformer 部分。

另一个问题是词表外词。若训练数据中没有 `Zoomer-approved`，Word2Vec 就没有回退方案。fastText 用子词组合解决了它，见第 04 课。

## 交付成果

保存为 `outputs/skill-embedding-probe.md`：

```markdown
---
name: embedding-probe
description: Inspect a word2vec model. Run analogies, find neighbors, diagnose quality.
version: 1.0.0
phase: 5
lesson: 03
tags: [nlp, embeddings, debugging]
---

You probe trained word embeddings to verify they are working. Given a `gensim.models.KeyedVectors` object and a vocabulary, you run:

1. Three canonical analogy tests. `king : man :: queen : woman`. `paris : france :: tokyo : japan`. `walking : walked :: swimming : ?`. Report the top-1 result and its cosine.
2. Five nearest-neighbor tests on domain-specific words the user supplies. Print top-5 neighbors with cosines.
3. One symmetry check. `similarity(a, b) == similarity(b, a)` to within float precision.
4. One degenerate check. If any embedding has a norm below 0.01 or above 100, the model has a training bug. Flag it.

Refuse to declare a model good on analogy accuracy alone. Analogy benchmarks are gameable and do not transfer to downstream tasks. Recommend intrinsic + downstream evaluation together.
```

## 练习

1. **简单。** 在包含 20 个猫狗句子的微型语料上运行训练循环。训练 200 轮后，验证 `nearest(vocab, W, W[vocab["cat"]])` 返回结果的前三名包含 `dog`。若没有，增加训练轮数或词表大小。
2. **中等。** 加入高频词下采样。频率高于 `10^-5` 的词按与词频成比例的概率从训练词对中丢弃，衡量它对稀有词相似度的影响。
3. **困难。** 在 20 Newsgroups 语料上训练模型。计算两条偏见轴：`he - she` 和 `doctor - nurse`。把职业词投影到两条轴上，报告哪些职业的偏见差距最大。公平性研究人员会使用这类探针。

## 关键术语

| 术语 | 常见说法 | 准确含义 |
|------|----------|----------|
| 词嵌入（word embedding） | 用向量表示词 | 从上下文学习到的稠密低维表示，通常为 100 至 300 维。 |
| Skip-gram | Word2Vec 技巧 | 从中心词预测上下文词；比 CBOW 慢，但更善于处理稀有词。 |
| 负采样（negative sampling） | 训练捷径 | 用对 `k` 个随机词的二元分类，替代整个词表上的 softmax。 |
| 静态嵌入（static embedding） | 每个词一个向量 | 不论上下文都使用相同向量，因此无法处理多义词。 |
| 上下文嵌入（contextual embedding） | 上下文敏感的向量 | 根据周围词语，为每次出现生成不同向量；Transformer 会产生这种表示。 |
| OOV | 词表外 | 训练期间未见过的词；Word2Vec 无法为它生成向量。 |

## 延伸阅读

- [Mikolov et al. (2013). Distributed Representations of Words and Phrases and their Compositionality](https://arxiv.org/abs/1310.4546)：负采样论文，篇幅短，容易阅读。
- [Rong, X. (2014). word2vec Parameter Learning Explained](https://arxiv.org/abs/1411.2738)：若原论文数学显得密集，这篇文章给出了最清楚的梯度推导。
- [gensim Word2Vec 教程](https://radimrehurek.com/gensim/models/word2vec.html)：真实有效的生产训练设置。
