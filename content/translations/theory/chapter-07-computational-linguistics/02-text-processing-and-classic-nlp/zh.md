---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 07 - computational linguistics/02. text processing and classic NLP.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 54ead3ac20bf4838be83a4f31afbdbefe87f35144bae2deb42993f8f1d0042b3
status: reviewed
---

# 文本处理与经典 NLP

*文本处理把原始字符转换为模型可以消费的结构化表示。本篇涵盖词元化（单词、子词、BPE、WordPiece）、文本规范化、编辑距离、TF-IDF、n-gram 语言模型、词性标注、NER 和情感分析——这条经典 NLP 流水线至今仍是现代系统的基础。*

- 原始文本很混乱。在任何 NLP 模型处理语言之前，文本都必须被清理、规范化并转换为结构化表示。本篇介绍从原始字符到模型可消费特征的流程，以及深度学习出现以前占主导地位的经典 NLP 算法。

- **文本规范化**把原始文本转换为规范形式。目标是减少无关变化，使 “Hello”“hello”“HELLO” 和 “héllo” 得到恰当处理。

- **大小写折叠**把文本转成小写，把 “The” 和 “the” 合并为一个 token。它对大多数任务有帮助，但在某些情况下会丢失有用信息：例如 “US”（国家）与 “us”（代词），或 “Apple”（公司）与 “apple”（水果）。

- **Unicode 规范化**处理同一个字符可能有多种编码方式这一事实。字符 “é” 可以是单个码点（U+00E9），也可以是基础字符 “e” 加组合重音符（U+0065 + U+0301）。NFC 规范化把它们组合成一个码点，NFD 则将其分解。没有规范化时，两个看起来完全一样的字符串可能无法匹配。

- **编辑距离**衡量两个字符串的差异。**Levenshtein 距离**统计把一个字符串变成另一个字符串所需的最少单字符插入、删除和替换次数。“kitten” → “sitting”的编辑距离为 3（k→s、e→i、插入 g）。

- 编辑距离使用动态规划计算（我们会在另一个章节回顾）。令 $D[i][j]$ 表示字符串 $s$ 的前 $i$ 个字符与字符串 $t$ 的前 $j$ 个字符之间的距离：

```math
D[i][j] = \begin{cases} j & \text{if } i = 0 \\ i & \text{if } j = 0 \\ D[i{-}1][j{-}1] & \text{if } s[i] = t[j] \\ 1 + \min(D[i{-}1][j], \; D[i][j{-}1], \; D[i{-}1][j{-}1]) & \text{otherwise} \end{cases}
```

- 编辑距离支持拼写纠正、模糊匹配和 DNA 序列比对。在 NLP 中，它用于处理拼写错误和寻找相似单词。

- **词元化**把文本拆成模型可以处理的离散单元（token）。这是第一个、也可以说最重要的预处理步骤。词元化策略的选择会深刻影响模型行为。

- **空白词元化**按空格切分。它简单但很粗糙：“New York”会变成两个 token，“don't”会是一个 token（也可能根据切分器拆成 “don” 和 “'t”），而中文和日文等语言的词语之间根本没有空格。

- **基于规则的词元化**使用手写模式（正则表达式）处理缩写、标点和特殊情况。“I'm” → “I” + “'m”，“U.S.A.” 保持为一个 token。每种语言都需要自己的规则，维护成本很高。

- **子词词元化**是现代方案。它不在词边界切分，而是从数据中学习高频子词单元构成词表。它可以优雅地处理未知词：如果 “unhappiness” 不在词表中，可能拆成 “un” + “happi” + “ness”，从而保留形态结构。

![比较单词级、字符级和子词级词元化对 “unhappiness” 与 “transformers” 的处理](../images/tokenisation_comparison.svg)

- **Byte-Pair Encoding（BPE）**从单个字符作为词表开始。它反复寻找频率最高的相邻 token 对并合并为新 token。经过足够多次合并后，常见词会成为单个 token，罕见词会拆成高频子词片段。

- BPE 算法：
    1. 用训练语料中的所有单个字符初始化词表
    2. 统计每个相邻 token 对的频率
    3. 把频率最高的 token 对合并成新 token
    4. 按希望的合并次数（词表大小）重复步骤 2–3

- 例如，起始语料包含 “l o w”（5 次）、“l o w e r”（2 次）和 “n e w e s t”（6 次）：频率最高的 token 对可能是 “e s” → 合并为 “es”；随后 “es t” → “est”；再随后 “n e w” → “new”。最终词表同时包含完整单词和子词片段。

- **WordPiece**（BERT 使用）与 BPE 类似，但依据似然而不是频率选择合并。它合并能最大化训练数据语言模型似然的 token 对。不是词首的子词 token 会加上 “##” 前缀（例如 “playing” → “play” + “##ing”）。

- **Unigram**（SentencePiece 使用）采取相反做法：从一个很大的词表开始，反复删除对训练数据似然损害最小的 token。最终词表是最能解释语料的子词单元集合。

- **SentencePiece** 是与语言无关的词元化库，把输入视为原始字节流（不会先按空格预分词）。因此它适用于包括无空格语言在内的任何语言，同时实现了 BPE 和 Unigram 算法。

- 词表大小是关键超参数。常见选择在 30,000 到 100,000 个 token 之间。词表越大，每个序列的 token 越少（效率更高），但 embedding 表越大；词表越小，子词切分越多，序列越长。

- 两种技术都会把词还原到基础形式，但方法不同。

- **词干提取（stemming）**用粗略规则去掉后缀。Porter stemmer 把 “running” 变成 “run”，把 “happiness” 变成 “happi”，把 “studies” 变成 “studi”。它速度快但不精确：例如 “university” 和 “universe” 都会变成 “univers”，尽管二者无关。

- **词形还原（lemmatisation）**使用词表和形态分析找到真正的词典形式（lemma）。“Running” → “run”，“better” → “good”，“mice” → “mouse”。它需要知道词性：作为动词的 “saw” 还原为 “see”，作为名词时仍然是 “saw”。

- 现代神经 NLP 中，子词词元化已经大体取代词干提取和词形还原；但在信息检索、使用较小模型或数据有限时，它们仍然有用。

- **词性（POS）标注**为每个词分配语法类别：名词、动词、形容词、限定词等。这是最早的 NLP 任务之一，也是句法分析的基础。

- Penn Treebank 标签集是英语最常用的标签集，有 36 个标签（NN 表示单数名词，NNS 表示复数名词，VB 表示动词原形，VBD 表示过去时，JJ 表示形容词等）。

- POS 标注很难，因为许多词有歧义。“Book”可以是名词（“the book”），也可以是动词（“book a flight”）。“Run”在不同词性下有几十种含义。上下文至关重要。

- 早期标注器使用第 05 章的**隐马尔可夫模型（HMM）**。隐藏状态是 POS 标签，观测是单词。转移概率描述标签序列（限定词后面很可能是名词或形容词），发射概率描述哪些词与哪些标签一起出现。Viterbi 算法寻找最可能的标签序列。

- POS 标注的 HMM 模型：

$$\hat{t}_{1:n} = \arg\max_{t_{1:n}} \prod_{i=1}^{n} P(w_i \mid t_i) \cdot P(t_i \mid t_{i-1})$$

- 现代 POS 标注器使用神经网络（双向 LSTM 或 Transformer），在英语上达到超过 97% 的准确率，接近人类水平。

- **命名实体识别（NER）**识别并分类文本中的专名及其他具体实体：人物、组织、地点、日期、金额等。

- 在 “Apple CEO Tim Cook announced the event in Cupertino on Monday” 中，NER 系统应识别出：Apple（ORG）、Tim Cook（PER）、Cupertino（LOC）、Monday（DATE）。

- NER 通常使用 **BIO 标注**建模为**序列标注**（也叫 IOB 标注）。每个 token 获得一个标签：
    - **B-TYPE**：TYPE 类型实体的开头
    - **I-TYPE**：TYPE 类型实体的内部（延续）
    - **O**：不属于任何实体

- “Tim Cook visited New York” 会变成：Tim/B-PER Cook/I-PER visited/O New/B-LOC York/I-LOC。B 标签标记新实体开始的位置；当两个同类型实体相邻时，这一点尤其重要。

![带 BIO 标签的句子：B-PER（红色）、I-PER（红色）、O（灰色）、B-LOC（蓝色）、I-LOC（蓝色）](../images/bio_tagging.svg)

- 经典 NER 使用第 05 章的**条件随机场（CRF）**，对给定输入的整个标签序列的条件概率建模。不同于生成式的 HMM（$P(x, y)$），CRF 是判别式模型，直接建模 $P(y \mid x)$。线性链 CRF 定义为：

$$P(y_{1:n} \mid x_{1:n}) = \frac{1}{Z(x)} \exp\!\left(\sum_{i=1}^{n} \left[\sum_k \lambda_k f_k(y_i, x, i) + \sum_j \mu_j g_j(y_i, y_{i-1}, x, i)\right]\right)$$

- 这里 $f_k$ 是**发射特征**（输入在位置 $i$ 时标签 $y_i$ 有多大可能），$g_j$ 是**转移特征**（给定前一个标签 $y_{i-1}$ 时标签 $y_i$ 有多大可能）。

- 配分函数 $Z(x) = \sum_{y'} \exp(\ldots)$ 对所有可能的标签序列求和，用于归一化分布。训练最大化条件对数似然，需要用第 05 章的前向算法高效计算 $Z(x)$。

- 相比独立分类每个 token，CRF 的关键优势在于：转移特征会施加结构约束（例如 I-PER 应该只跟在 B-PER 或 I-PER 之后，不应出现在 O 后面）。

- 现代 NER 会在神经编码器（BiLSTM-CRF 或 BERT-CRF）上叠加 CRF：神经网络产生发射分数，CRF 层学习转移结构。

- **句法分析**把句子转换为句法结构，可以是成分树或依存树（都在第 01 篇介绍）。

- **CYK 算法**（Cocke–Younger–Kasami）使用动态规划，通过上下文无关文法解析句子。

- 它要求文法处于**乔姆斯基范式（Chomsky Normal Form）**（每条规则右侧要么有两个非终结符，要么有一个终结符）。算法自底向上填充三角表：单元格表示句子的一个片段，并保存能够生成该片段的非终结符。

- CYK 的时间复杂度为 $O(n^3 \cdot |G|)$，其中 $n$ 是句子长度，$|G|$ 是文法大小。它是精确的，但对大型文法来说很慢。

- **移进—归约分析**从左到右处理句子，同时维护一个栈。每一步要么**移进**（把下一个词压入栈），要么**归约**（从栈中弹出元素并替换成一个短语）。训练好的分类器在每一步决定操作。它的时间复杂度为 $O(n)$，比 CYK 快得多。

- 实际应用中，**依存分析**现在比成分分析更常见。基于转换的依存分析器（类似移进—归约）和基于图的分析器（为所有可能的边打分并寻找最大生成树）是两种主要方法。使用 BiLSTM 或 Transformer 的神经依存分析器达到了最先进的结果。

- 在 embedding 出现之前，NLP 使用简单的计数方法把文档表示成向量。

- **词袋（BoW）模型**把文档表示为单词计数向量，完全忽略词序。如果词表有 $V$ 个单词，每个文档就是 $\mathbb{R}^V$ 中的向量（回到第 01 章的向量空间）。单词 $w$ 对应的条目就是它在文档中出现的次数。

![词袋表示：文档先转换为词频表，再转换为 $R^V$ 中的稀疏向量，每个词表词对应一个条目](../images/bag_of_words.svg)

- BoW 很简单，却对文档分类和垃圾邮件过滤等任务非常有效。它的主要问题是把每个词看得同样重要：“the” 和 “revolutionary” 的权重相同。

- **TF-IDF（Term Frequency-Inverse Document Frequency，词频—逆文档频率）**通过根据词的信息量加权来解决这个问题。在一个文档中频繁出现、但在整个语料中很少出现的词，通常对该文档更重要。

$$\text{TF-IDF}(t, d) = \text{TF}(t, d) \times \text{IDF}(t)$$

- **词频** $\text{TF}(t, d)$ 通常是词 $t$ 在文档 $d$ 中的原始计数（或其对数：$1 + \log(\text{count})$）。

- **逆文档频率** $\text{IDF}(t) = \log\frac{N}{|\{d : t \in d\}|}$，其中 $N$ 是文档总数。在每个文档中都出现的词（如 “the”）的 IDF 接近 0，罕见词的 IDF 很高。

- 可以用第 01 章的余弦相似度比较 TF-IDF 向量，从而衡量文档相似性。这是经典信息检索和搜索引擎的基础。

- **语言模型**为单词序列分配概率，它回答的是：这句话有多大可能？语言模型是机器翻译、语音识别、拼写纠正和文本生成的核心。

- 根据概率链式法则（第 05 章），句子 $w_1, w_2, \ldots, w_n$ 的概率为：

$$P(w_1, w_2, \ldots, w_n) = \prod_{i=1}^{n} P(w_i \mid w_1, \ldots, w_{i-1})$$

- 这个定义是精确的，但不实用：你需要保存每一种可能历史的概率。**马尔可夫假设**（第 05 章）把历史截断为最近的 $k-1$ 个词，于是得到 **n-gram 模型**（其中 $n = k$）。

- **二元模型（bigram）**（$n = 2$）只根据前一个词建模：

$$P(w_i \mid w_1, \ldots, w_{i-1}) \approx P(w_i \mid w_{i-1})$$

- **三元模型（trigram）**（$n = 3$）根据前两个词建模。N-gram 概率通过语料中的计数估计：

$$P(w_i \mid w_{i-1}) = \frac{\text{count}(w_{i-1}, w_i)}{\text{count}(w_{i-1})}$$

- **困惑度**衡量语言模型预测测试集的能力。它是测试集概率的倒数，再按单词数归一化：

$$\text{PPL} = P(w_1, \ldots, w_N)^{-1/N} = \exp\!\left(-\frac{1}{N} \sum_{i=1}^{N} \log P(w_i \mid w_{<i})\right)$$

- 困惑度越低，说明模型对测试数据越“不惊讶”，因此越好。对 10,000 词词表赋予均匀概率的模型，困惑度为 10,000。好的 bigram 模型可能达到约 200，现代神经语言模型可以低于 20。

- 注意，困惑度就是交叉熵（第 05 章信息论）的指数。在训练中最小化交叉熵损失，会直接最小化困惑度。

- **平滑**处理零概率问题：如果某个 n-gram 从未出现在训练数据中，模型会给它分配概率 0，整句概率就会变成 0。**Laplace 平滑**（加一平滑）为每个 n-gram 加上一个小计数：

$$P_{\text{Laplace}}(w_i \mid w_{i-1}) = \frac{\text{count}(w_{i-1}, w_i) + 1}{\text{count}(w_{i-1}) + V}$$

- 对大型词表而言，这种方法过于激进（从已观测 n-gram 中拿走了太多概率）。**Kneser–Ney 平滑**是 n-gram 模型的黄金标准。它结合了两个思想：绝对折扣，以及回退时使用的延续概率。

- 首先，**绝对折扣**从每个已观测计数中减去固定折扣 $d$（通常 $d \approx 0.75$），而不是加入伪计数。释放出的概率质量重新分配给未见过的 n-gram。插值形式为：

$$P_{\text{KN}}(w_i \mid w_{i-1}) = \frac{\max(\text{count}(w_{i-1}, w_i) - d, \; 0)}{\text{count}(w_{i-1})} + \lambda(w_{i-1}) \cdot P_{\text{cont}}(w_i)$$

- 其中 $\lambda(w_{i-1})$ 是分配折扣概率质量的归一化常数。关键创新是**延续概率** $P_{\text{cont}}(w_i)$：它衡量 $w_i$ 出现过多少种不同上下文，而不是它总体出现了多少次：

$$P_{\text{cont}}(w_i) = \frac{|\{w' : \text{count}(w', w_i) > 0\}|}{|\{(w', w'') : \text{count}(w', w'') > 0\}|}$$

- 分子统计语料中 $w_i$ 前面出现过的不同单词数。像 “Francisco” 这样的词只出现在少数上下文中（几乎总是在 “San” 后面），所以即使 “San Francisco” 很常见，“Francisco” 的延续概率仍然很低，不会在其他上下文中被错误预测。

- 相反，像 “the” 这样的常见词出现在许多不同单词之后，因此延续概率很高。这捕捉了一个直觉：在回退估计中，词的多用途性比原始频率更重要。

- N-gram 模型几十年来都是最先进的方法。它们速度快、可解释且不需要训练（只需计数）。但它们难以处理长距离依赖（“The keys that I left on the table **are** missing”需要知道主语 “keys” 是复数，而主语离动词很远）。从 RNN 开始、最终发展到 Transformer 的神经语言模型解决了这个限制。

## 编程任务（使用 CoLab 或 notebook）

1. 使用动态规划实现 Levenshtein 编辑距离。在单词对上测试，并用它完成简单的拼写纠正。
```python
import jax.numpy as jnp

def edit_distance(s, t):
    """Compute Levenshtein edit distance using DP."""
    m, n = len(s), len(t)
    D = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(m + 1):
        D[i][0] = i
    for j in range(n + 1):
        D[0][j] = j

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s[i-1] == t[j-1]:
                D[i][j] = D[i-1][j-1]
            else:
                D[i][j] = 1 + min(D[i-1][j], D[i][j-1], D[i-1][j-1])

    return D[m][n]

# Test
pairs = [("kitten", "sitting"), ("sunday", "saturday"), ("hello", "hallo")]
for s, t in pairs:
    print(f"d('{s}', '{t}') = {edit_distance(s, t)}")

# Simple spelling correction
dictionary = ["the", "their", "there", "then", "than", "this", "that", "these", "those"]
misspelled = "thier"
corrections = sorted(dictionary, key=lambda w: edit_distance(misspelled, w))
print(f"\nClosest to '{misspelled}': {corrections[:3]}")
```

2. 从零实现 BPE 词元化。从字符级 token 开始，反复合并频率最高的 token 对。
```python
from collections import Counter

def get_pairs(corpus):
    """Count adjacent token pairs across all words."""
    pairs = Counter()
    for word, freq in corpus.items():
        symbols = word.split()
        for i in range(len(symbols) - 1):
            pairs[(symbols[i], symbols[i+1])] += freq
    return pairs

def merge_pair(pair, corpus):
    """Merge all occurrences of a pair in the corpus."""
    new_corpus = {}
    bigram = ' '.join(pair)
    replacement = ''.join(pair)
    for word, freq in corpus.items():
        new_word = word.replace(bigram, replacement)
        new_corpus[new_word] = freq
    return new_corpus

# Training corpus with word frequencies
text = "low low low low low lower lower newest newest newest newest newest newest"
word_freqs = Counter(text.split())
# Initialise: split each word into characters with end-of-word marker
corpus = {' '.join(word) + ' _': freq for word, freq in word_freqs.items()}

print("Initial corpus:")
for word, freq in corpus.items():
    print(f"  {word}: {freq}")

# Run BPE for 10 merges
for i in range(10):
    pairs = get_pairs(corpus)
    if not pairs:
        break
    best_pair = max(pairs, key=pairs.get)
    corpus = merge_pair(best_pair, corpus)
    print(f"\nMerge {i+1}: {best_pair} (freq={pairs[best_pair]})")
    for word, freq in corpus.items():
        print(f"  {word}: {freq}")
```

3. 构建 bigram 语言模型，在测试句子上计算困惑度，并尝试 Laplace 平滑。
```python
from collections import Counter, defaultdict
import math

# Training corpus
train = """the cat sat on the mat . the dog chased the cat .
the cat ran from the dog . a dog sat on a mat .""".split()

# Count bigrams and unigrams
bigrams = Counter(zip(train[:-1], train[1:]))
unigrams = Counter(train)
vocab_size = len(set(train))

def bigram_prob(w2, w1, alpha=0):
    """P(w2 | w1) with optional Laplace smoothing."""
    return (bigrams[(w1, w2)] + alpha) / (unigrams[w1] + alpha * vocab_size)

# Compute perplexity
test = "the cat sat on a mat .".split()

for alpha in [0, 1, 0.1]:
    log_prob = 0
    for w1, w2 in zip(test[:-1], test[1:]):
        p = bigram_prob(w2, w1, alpha=alpha)
        if p > 0:
            log_prob += math.log(p)
        else:
            log_prob += float('-inf')

    ppl = math.exp(-log_prob / (len(test) - 1)) if log_prob > float('-inf') else float('inf')
    print(f"Smoothing α={alpha}: perplexity = {ppl:.2f}")
```

4. 从零实现 TF-IDF，使用余弦相似度找到与查询最相似的文档。
```python
import jax.numpy as jnp
import math
from collections import Counter

documents = [
    "the cat sat on the mat",
    "the dog chased the cat around the park",
    "a mat was placed on the floor by the door",
    "the quick brown fox jumped over the lazy dog",
]

# Build vocabulary
vocab = sorted(set(word for doc in documents for word in doc.split()))
word_to_idx = {w: i for i, w in enumerate(vocab)}
V = len(vocab)
N = len(documents)

# Compute TF-IDF matrix
doc_freq = Counter()
for doc in documents:
    for word in set(doc.split()):
        doc_freq[word] += 1

tfidf_matrix = jnp.zeros((N, V))
for i, doc in enumerate(documents):
    word_counts = Counter(doc.split())
    for word, count in word_counts.items():
        tf = 1 + math.log(count)
        idf = math.log(N / doc_freq[word])
        j = word_to_idx[word]
        tfidf_matrix = tfidf_matrix.at[i, j].set(tf * idf)

# Query
query = "cat on the mat"
query_vec = jnp.zeros(V)
query_counts = Counter(query.split())
for word, count in query_counts.items():
    if word in word_to_idx:
        tf = 1 + math.log(count)
        idf = math.log(N / doc_freq.get(word, 1))
        query_vec = query_vec.at[word_to_idx[word]].set(tf * idf)

# Cosine similarity (from chapter 01)
def cosine_sim(a, b):
    return jnp.dot(a, b) / (jnp.linalg.norm(a) * jnp.linalg.norm(b) + 1e-8)

print(f"Query: '{query}'\n")
for i, doc in enumerate(documents):
    sim = cosine_sim(query_vec, tfidf_matrix[i])
    print(f"  Doc {i} (sim={sim:.3f}): '{doc}'")
```
