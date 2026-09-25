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

*文本处理把原始字符转换为模型可用的结构化表示。本文介绍词元化、文本规范化、编辑距离、TF-IDF、n-gram 语言模型、词性标注、命名实体识别和情感分析，梳理经典 NLP 流程中至今仍在使用的方法。*

- 原始文本往往杂乱。在 NLP 模型处理语言之前，通常需要先清理和规范化文本，再将其转换成结构化表示。本文介绍从原始字符到模型特征的处理流程，以及深度学习兴起前常用的经典 NLP 算法。

- **文本规范化**会把原始文本转换为约定的标准形式，目的是减少无关差异，让 “Hello”“hello”“HELLO” 和 “héllo” 按需要得到一致处理。

- **大小写折叠**会把文本统一转换为小写，使 “The” 和 “the” 归并为同一个词元。它对许多任务有用，但有时会抹去重要信息，例如 “US”（美国）与 “us”（代词），或 “Apple”（公司）与 “apple”（水果）。

- **Unicode 规范化**处理同一个字符可能存在多种编码形式的情况。例如，“é”可以编码为单个码位（U+00E9），也可以由基字符 “e” 和组合尖音符（U+0065 + U+0301）组成。NFC 会把它们合成为一个码位，NFD 则会将其分解。若不做规范化，两个看起来相同的字符串可能无法匹配。

- **编辑距离**衡量两个字符串之间的差异。**Levenshtein 距离**是把一个字符串变成另一个字符串所需的最少单字符插入、删除和替换次数。例如，“kitten” → “sitting” 的编辑距离是 3（k→s、e→i，再插入 g）。

- 编辑距离可以用动态规划计算。设 $D[i][j]$ 表示字符串 $s$ 的前 $i$ 个字符与字符串 $t$ 的前 $j$ 个字符之间的编辑距离：

**编者注：**原文此处的 “alrothim” 是拼写错误；按语境应为算法章节。

```math
D[i][j] = \begin{cases} j & \text{if } i = 0 \\ i & \text{if } j = 0 \\ D[i{-}1][j{-}1] & \text{if } s[i] = t[j] \\ 1 + \min(D[i{-}1][j], \; D[i][j{-}1], \; D[i{-}1][j{-}1]) & \text{otherwise} \end{cases}
```

- 编辑距离可用于拼写纠错、模糊匹配和 DNA 序列比对。在 NLP 中，它常用于处理拼写错误和查找相似词。

- **词元化（tokenization）**是把文本切分成模型可处理的离散单位（词元）的过程。这是 NLP 预处理的第一步，也是最重要的步骤之一。词元化策略会显著影响模型的行为。

- **按空白切分**会根据空格拆分文本，做法简单但粗糙。例如，“New York”会被切成两个词元；“don't”可能保留为一个词元，也可能按切分规则拆成 “don” 和 “'t”；中文和日文则通常不在词语之间使用空格。

- **基于规则的词元化**使用人工编写的模式（如正则表达式）处理缩写、标点和特殊情况。例如，“I'm”可切分为 “I” 和 “'m”，而 “U.S.A.” 可以保留为一个词元。每种语言都需要单独制定规则，维护成本较高。

- **子词切分**是现代 NLP 常用的方法。它不只按词边界切分，而是从数据中学习常见子词组成的词表。这样也能处理词表中没有的词：例如，“unhappiness”可能被切成 “un” + “happi” + “ness”，在一定程度上保留形态信息。

!["unhappiness"和"transformers"的词级、字符级和子词级分词比较](../images/tokenisation_comparison.svg)


- **字节对编码（BPE）**从训练语料中的单个字符开始构建词表，反复查找出现频率最高的相邻词元对并将其合并为新词元。合并足够多次后，常见词可能成为单个词元，罕见词则由常见子词片段组成。

- BPE 算法的步骤如下：
    1. 初始化词汇表，包含训练语料中的所有单个字符
    2. 统计每一对相邻词元的出现频率
    3. 将频率最高的一对合并为一个新词元
    4. 重复步骤 2–3，直到达到预定的合并次数或词表大小

- 例如，初始词元序列为 “l o w”（出现 5 次）、“l o w e r”（出现 2 次）和 “n e w e s t”（出现 6 次）。出现频率最高的一对可能是 “e s”，于是先合并为 “es”；接着合并 “es t” 得到 “est”，再合并 “n e w” 得到 “new”。最终词表会同时包含完整词和子词片段。

- **WordPiece**（BERT 使用的算法）与 BPE 相似，但依据语言模型概率选择合并项：它选择能最大幅度提高训练数据似然的词元对。非词首子词前会加上 “##”，例如 “playing” 可切分为 “play” + “##ing”。

- **Unigram**（SentencePiece 使用的一种算法）采用相反的做法：先从较大的词表开始，再逐步删除那些删去后对训练数据似然影响最小的词元。最终保留的子词单元能够较好地解释语料。

- **SentencePiece** 是一种跨语言的词元化库。它直接处理原始文本，不必先按空格切分，因此也适用于中文等不以空格分词的语言。它实现了 BPE 和 Unigram 算法。

**编者注：**原文称 SentencePiece 将输入视作“原始字节流”；更准确地说，它直接处理未经词级预切分的文本。

- 词表大小是一个重要超参数，常见范围约为 30,000–100,000 个词元。词表越大，每条序列通常越短，但嵌入表也越大；词表越小，子词切分越多，序列也越长。

- 词干提取和词形还原都试图把词语归并到较基本的形式，但做法不同。

- **词干提取（stemming）**用较粗略的规则去掉后缀。Porter 词干提取器会把 “running” 变成 “run”、把 “happiness” 变成 “happi”、把 “studies” 变成 “studi”。它速度快但不够精确：无关的 “university” 和 “universe” 都会被截成 “univers”。

- **词形还原（lemmatisation）**利用词典和形态分析，找出词语的词典原形（lemma）。“running” → “run”，“better” → “good”，“mice” → “mouse”。词形还原需要知道词性：“saw”作动词时还原为 “see”，作名词时则仍是 “saw”。

- 在神经 NLP 中，现代子词切分已在很大程度上取代词干提取和词形还原；但在信息检索、模型较小或数据有限时，这两种方法仍有用。

- **词性标注（POS tagging）**为每个词标注语法类别，如名词、动词、形容词和限定词。这是最早的 NLP 任务之一，也是句法分析的基础。

- Penn Treebank 标签集是英语中常用的标签集之一，共有 36 类标签，例如 NN 表示单数名词、NNS 表示复数名词、VB 表示动词原形、VBD 表示过去式动词、JJ 表示形容词。

- 词性标注并不容易，因为许多词有多种词性。“book”可以是名词（“the book”），也可以是动词（“book a flight”）；“run”在不同词性下也有多种用法，因此必须结合上下文判断。

- 早期的词性标注器使用第 05 章介绍的**隐马尔可夫模型（HMM）**。隐藏状态是词性标签，观测值是词语。转移概率描述标签序列的规律（例如限定词后常接名词或形容词），发射概率描述词语与标签的对应关系。维特比算法用于找出概率最高的标签序列。

- HMM 词性标注模型可写为：

$$\hat{t}_{1:n} = \arg\max_{t_{1:n}} \prod_{i=1}^{n} P(w_i \mid t_i) \cdot P(t_i \mid t_{i-1})$$
- 现代词性标注器使用神经网络（如双向 LSTM 或 Transformer），在英语数据集上的准确率可超过 97%，接近人工标注水平。

- **命名实体识别（NER）**用于识别并分类文本中的专名和其他特定实体，例如人物、组织、地点、日期和货币金额。

- 例如，在 “Apple CEO Tim Cook announced the event in Cupertino on Monday” 中，NER 系统应识别出 Apple（组织，ORG）、Tim Cook（人物，PER）、Cupertino（地点，LOC）和 Monday（日期，DATE）。

- NER 通常被表述为一个**序列标注**任务，常使用 **BIO 标注**（也称 IOB 标注）。每个词元都获得一个标签：
    - **B-TYPE**：某类实体的起始词元
    - **I-TYPE**：某类实体内部的后续词元
    - **O**：不属于任何实体

- “Tim Cook visited New York” 可标注为：Tim/B-PER、Cook/I-PER、visited/O、New/B-LOC、York/I-LOC。B 标签标记实体的起点；当两个同类型实体相邻时，这一点尤其重要。

![带有BIO标签颜色编码的句子：B-PER（红色），I-PER（红色），O（灰色），B-LOC（蓝色），I-LOC（蓝色）](../images/bio_tagging.svg)


- 经典 NER 使用第 05 章介绍的**条件随机场（CRF）**，对给定输入时整条标签序列的条件概率建模。与建模联合概率 $P(x, y)$ 的生成式 HMM 不同，CRF 是判别式模型，直接建模 $P(y \mid x)$。线性链 CRF 定义为：

$$P(y_{1:n} \mid x_{1:n}) = \frac{1}{Z(x)} \exp\!\left(\sum_{i=1}^{n} \left[\sum_k \lambda_k f_k(y_i, x, i) + \sum_j \mu_j g_j(y_i, y_{i-1}, x, i)\right]\right)$$
- 其中，$f_k$ 是**发射特征**（衡量位置 $i$ 的输入与标签 $y_i$ 的匹配程度），$g_j$ 是**转移特征**（衡量前一个标签 $y_{i-1}$ 与当前标签 $y_i$ 的相容程度）。

- 配分函数 $Z(x) = \sum_{y'} \exp(\ldots)$ 对所有可能的标签序列求和，用于归一化概率分布。训练时最大化条件对数似然，需要用第 05 章介绍的前向算法高效计算 $Z(x)$。

- 相比于独立分类每个词元，CRF 的转移特征还能施加结构约束。例如，I-PER 只能跟在 B-PER 或 I-PER 后面，不能出现在 O 之后。

- 现代 NER 常在神经编码器（如 BiLSTM 或 BERT）之上叠加 CRF：神经网络产生发射分数，CRF 层学习标签之间的转移结构。

- **句法分析**将句子转换为句法结构，可以得到成分树或依存树（见第 01 篇）。

- **CYK 算法**（Cocke–Younger–Kasami）使用动态规划，根据上下文无关文法分析句子。

- CYK 要求文法转换为**乔姆斯基范式（CNF）**：每条规则右侧要么包含两个非终结符，要么包含一个终结符。算法自底向上填充三角表格；每个单元对应句子中的一个跨度，并记录能够生成该跨度的非终结符。

- CYK 的时间复杂度为 $O(n^3 \cdot |G|)$，其中 $n$ 是句子长度，$|G|$ 是文法大小。它能够精确解析，但对于大型文法来说速度较慢。

- **移位—归约分析**从左到右处理句子，并维护一个栈。每一步要么将下一个词移入栈中（shift），要么从栈中弹出若干元素并将其归约为一个短语（reduce）。分类器决定每一步采取哪种操作。这类分析的时间复杂度为 $O(n)$，比 CYK 快得多。

- **依存句法分析**在实践中比成分句法分析更常见。两种主要方法是基于转移的分析器（如移位—归约分析）和基于图的分析器（为可能的边打分，再寻找最大生成树）。使用 BiLSTM 或 Transformer 的神经依存分析器已达到先进水平。

- 在词嵌入普及之前，NLP 常用简单的计数方法把文档表示为向量。

- **词袋模型（BoW）**把文档表示为词频向量，完全忽略词序。若词表有 $V$ 个词，每篇文档就表示为 $\mathbb{R}^V$ 中的向量（联系第 01 章的向量空间）；词 $w$ 对应的分量是它在文档中出现的次数。

![词袋模型：文档转换为单词计数表，然后转换为R^V中的稀疏向量，每个词汇词都有一项](../images/bag_of_words.svg)


- BoW 虽然简单，却能有效用于文档分类和垃圾邮件过滤。它的主要缺点是把所有词看得同样重要：“the” 与 “revolutionary” 会得到相同权重。

- **TF-IDF**（词频—逆文档频率）根据词语的信息量为其加权：在某篇文档中频繁出现、但在整个语料库中较少出现的词，通常对该文档更重要。

$$\text{TF-IDF}(t, d) = \text{TF}(t, d) \times \text{IDF}(t)$$
- **词频** $\text{TF}(t, d)$ 常取词项 $t$ 在文档 $d$ 中的原始计数，也可以使用对数计数，例如 $1 + \log(\text{count})$。

- **逆文档频率**为 $\text{IDF}(t) = \log\frac{N}{|\{d : t \in d\}|}$，其中 $N$ 是文档总数。出现在所有文档中的词（如 “the”）的 IDF 接近 0；罕见词的 IDF 较高。

- TF-IDF 向量可用第 01 章介绍的余弦相似度进行比较，以衡量文档之间的相似程度。这是经典信息检索和搜索引擎的基础。

- **语言模型**为词语序列分配概率，用来回答“这个句子出现的可能性有多大？”语言模型是机器翻译、语音识别、拼写纠错和文本生成的核心。

- 根据第 05 章介绍的概率链式法则，句子 $w_1, w_2, \ldots, w_n$ 的概率为：

$$P(w_1, w_2, \ldots, w_n) = \prod_{i=1}^{n} P(w_i \mid w_1, \ldots, w_{i-1})$$
- 这种表示虽然精确，却不实用：必须保存每一种可能历史对应的概率。第 05 章介绍的**马尔可夫假设**把历史截断为最近的 $k-1$ 个词，由此得到一个 n-gram 模型（其中 $n=k$）。

- **二元语法模型（bigram，$n=2$）**只根据前一个词预测当前词：

$$P(w_i \mid w_1, \ldots, w_{i-1}) \approx P(w_i \mid w_{i-1})$$
- **三元语法模型（trigram，$n=3$）**根据前两个词预测当前词。n-gram 条件概率通常通过统计语料中的词序列来估计；例如，二元模型的概率为：

**编者注：**原文紧接三元模型给出的公式是二元模型概率 $P(w_i \mid w_{i-1})$。

$$P(w_i \mid w_{i-1}) = \frac{\text{count}(w_{i-1}, w_i)}{\text{count}(w_{i-1})}$$
- **困惑度（PPL）**衡量语言模型预测测试集的能力。它根据测试集序列的概率计算，并按词数归一化：

$$\text{PPL} = P(w_1, \ldots, w_N)^{-1/N} = \exp\!\left(-\frac{1}{N} \sum_{i=1}^{N} \log P(w_i \mid w_{<i})\right)$$
- 困惑度越低，模型对测试数据越不意外，通常说明预测效果越好。若模型对 10,000 词的词表一律赋予相同概率，其困惑度为 10,000；一个较好的二元模型可能达到约 200，现代神经语言模型则可能低于 20。

**编者注：**这些数值仅作示例；困惑度取决于测试语料和词元切分方式，不能直接跨数据集或词元器比较。

- 困惑度是交叉熵（见第 05 章信息论）的指数形式。因此，训练时最小化交叉熵损失，也会最小化困惑度。

- **平滑**用于处理零概率问题：如果某个 n-gram 没在训练语料中出现，模型可能会给它赋予零概率，进而使整句概率变为零。**拉普拉斯平滑**（加一平滑）会给每个 n-gram 的计数加 1：

$$P_{\text{Laplace}}(w_i \mid w_{i-1}) = \frac{\text{count}(w_{i-1}, w_i) + 1}{\text{count}(w_{i-1}) + V}$$
- 对大型词表而言，拉普拉斯平滑过于激进，因为它会从已观察到的 n-gram 中分走过多概率质量。**Kneser–Ney 平滑**是经典的 n-gram 平滑方法，结合了绝对折扣和回退时使用的延续概率。

- 首先，**绝对折扣**从每个已观察到的计数中减去固定值 $d$（通常约为 0.75），而不是添加伪计数；腾出的概率质量会重新分配给未见过的 n-gram。其插值形式为：

$$P_{\text{KN}}(w_i \mid w_{i-1}) = \frac{\max(\text{count}(w_{i-1}, w_i) - d, \; 0)}{\text{count}(w_{i-1})} + \lambda(w_{i-1}) \cdot P_{\text{cont}}(w_i)$$
- 其中，$\lambda(w_{i-1})$ 是分配折扣概率质量的归一化系数。**延续概率** $P_{\text{cont}}(w_i)$ 衡量有多少种不同的上下文会出现 $w_i$，而不是只看它的总体出现频率：

$$P_{\text{cont}}(w_i) = \frac{|\{w' : \text{count}(w', w_i) > 0\}|}{|\{(w', w'') : \text{count}(w', w'') > 0\}|}$$
- 分子统计语料中有多少种不同的词出现在 $w_i$ 前面。比如，“Francisco”常出现在 “San” 之后，因此它出现的上下文较少；即使 “San Francisco” 很常见，“Francisco” 的延续概率仍较低，不容易在不相关的上下文中被错误预测。

- 相反，“the” 这样的常见词会出现在许多不同词之后，因此延续概率较高。这体现了回退估计的一个直觉：词语能出现在多少种上下文中，比它的原始频数更重要。

- 数十年来，n-gram 模型一直是主流方法。它们速度快、容易解释，而且只需计数，无需复杂训练。但它们难以处理长距离依赖。例如，在 “The keys that I left on the table are missing” 中，要正确预测 “are”，模型需要知道远处的主语 “keys” 是复数。RNN 及后来的 Transformer 等神经语言模型可以更好地处理这类依赖。

## 编程任务（使用 Colab 或 Jupyter 笔记本）

1. 用动态规划实现 Levenshtein 编辑距离。在若干词对上测试，并将其用于简单的拼写纠错。
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

2. 从零实现 BPE 词元化：从字符级词元开始，反复合并出现频率最高的相邻词元对。
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

3. 构建一个二元语法模型，在测试句子上计算困惑度，并试验拉普拉斯平滑。
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

4. 从零实现 TF-IDF，并使用余弦相似度找出与查询最相似的文档。
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
