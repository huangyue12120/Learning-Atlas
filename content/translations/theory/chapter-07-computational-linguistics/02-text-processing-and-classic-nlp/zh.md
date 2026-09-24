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
# 文本处理与经典NLP

*文本处理将原始字符转换为模型可以消费的结构化表示。这个文件涵盖了分词（单词、子词、BPE、WordPiece）、文本标准化、编辑距离、TF-IDF、n-gram语言模型、POS标记、NER和情感分析，这是经典NLP管道的基础，仍然主导着现代系统。*

- 原始文本杂乱无章。在任何NLP模型开始工作之前，文本必须进行清理、标准化并转换为结构化表示。这个文件涵盖了从原始字符到模型可以消费的特征的管道，以及在深度学习出现之前主导的经典NLP算法。

- **文本标准化**将原始文本转换为其标准形式。目标是减少无关变异，使“Hello”、“hello”、“HELLO”和“héllo”被适当处理。

- **大小写折叠**将文本转换为小写。这会将“The”和“the”合并成一个标记。它对大多数任务都很有用，但在某些情况下会破坏有用的信息：例如，“US”（国家）vs“us”（代词），或“Apple”（公司）vs“apple”（水果）。

- Unicode 正则化处理了相同字符可以以多种方式编码的事实。字符 "é" 可以是一个单个代码点（U+00E9）或一个基础 "e" 加上一个组合的音调（U+0065 + U+0301）。NFC 正则化将它们组合成一个代码点；NFD 解组它们。如果没有正则化，两个看起来相同的字符串可能不匹配。

- **编辑距离**衡量两个字符串之间的差异。**莱文斯坦距离**计算将一个字符串转换为另一个所需的最小单字符插入、删除和替换次数。"kitten" → "sitting"的编辑距离为3（k→s，e→i，插入g）。

- 编辑距离通过动态规划计算（我们在阿尔罗蒂姆章节中回顾）。定义 $D[i][j]$ 为字符串 $s$ 的前 $i$ 个字符与字符串 $t$ 的前 $j$ 个字符之间的距离：

```math
D[i][j] = \begin{cases} j & \text{if } i = 0 \\ i & \text{if } j = 0 \\ D[i{-}1][j{-}1] & \text{if } s[i] = t[j] \\ 1 + \min(D[i{-}1][j], \; D[i][j{-}1], \; D[i{-}1][j{-}1]) & \text{otherwise} \end{cases}
```

- 编辑距离用于拼写纠正、模糊匹配和DNA序列对齐。在NLP中，它用于处理错误并找到相似的单词。

- 分词是将文本分割成模型可以处理的离散单位（标记）。这是第一步，也是最重要的预处理步骤。选择分词策略对模型行为有着深远的影响。

- **空白标记化**按空格分割。简单但粗暴："纽约"被分割成两个标记，"不要"是一个标记（或根据拆分器分成“don”和“'t”），而中文和日语之间没有单词之间的空格。

- **规则型标记化**使用手工编写的模式（正则表达式）来处理缩写、标点符号和特殊情况。例如，“I’m”被标记为“I” + “’m”，而“U.S.A.”保持一个词。每个语言都需要自己的规则，这是一项耗时的工作。

- **子词分词**是现代解决方案。它从数据中学习频繁的子词单位词汇表，而不是在单词边界处进行分割。这优雅地处理了未知单词：如果“不幸福”不在词汇表中，可能会被拆分为“un” + “happi” + “ness”，保留了语义结构。

!["unhappiness"和"transformers"的词级、字符级和子词级分词比较](../images/tokenisation_comparison.svg)


- **字节对编码（BPE）**从单个字符开始作为词汇表。它不断寻找最频繁的相邻对并合并它们成一个新的标记。经过足够的合并后，常见的单词是单个标记，罕见的单词被分割成频繁的子词片段。

- BPE算法：
    1. 初始化词汇表，包含训练语料中的所有单个字符
    2. 计算每对相邻令牌的频率
    3. 合并最频繁的对为一个新的令牌
    4. 重复步骤2-3，直到达到所需的合并次数（词汇大小）

- 例如，初始时有 "l o w" (5次)，"l o w e r" (2次)，"n e w e s t" (6次)：最频繁的对可能是 "e s" → 合并为 "es"。然后 "es t" → "est"。接着 "n e w" → "new"。最终词汇表包含完整单词和子词片段

- **WordPiece**（由BERT使用）类似于BPE，但选择合并基于训练数据的语言模型概率最大。非词首的子词标记以“##”前缀（例如，“playing”→“play”+“##ing”）。

- **Unigram**（由SentencePiece使用）采取相反的方法：从一个大型词汇开始，迭代删除对训练数据概率影响最小的标记。最终词汇是最好解释语料库的子词单位集合。

- **SentencePiece**是一个语言无关的分词库，将输入视为原始字节流（没有在空格上进行预分词）。这使得它适用于任何语言，包括那些没有空格的语言。它实现了BPE和Unigram算法。

- 词汇表大小是关键的超参数。典型的选择范围从30,000到100,000个标记。更大的词汇表意味着每条序列中的标记更少（效率更高），但需要更大的嵌入表。较小的词汇表意味着更多的子词拆分和较长的序列。

- 两种方法都将单词简化为基本形式，但它们的方法不同。

- **词干提取**通过简单的规则去除单词的后缀。Porter词干器将“running”简化为“run”，将“happiness”简化为“happi”，将“studies”简化为“studi”。它速度快但不精确：虽然“university”和“universe”都以“univers”结尾，尽管它们是无关的。

- **词形还原（Lemmatisation）** 使用词汇和形态分析来找到真正的字典形式（词根）。例如，“running” → “run”，“better” → “good”，“mice” → “mouse”。它需要知道单词的词性：作为动词词形还原为“see”，但作为名词则保持不变。

- 现代子词元标记法已经 largely取代了 stemming和词形还原在神经NLP中的使用，但在信息检索和处理较小模型或有限数据时仍然有用。

- **词性标注（POS tagging）** 将每个单词分配一个语法类别：名词、动词、形容词、限定词等。这是最古老的NLP任务之一，是句法分析的基础。

- Penn Treebank 标签集是英语中最常见的，包含 36 个标签（NN 表示单数名词，NNS 表示复数名词，VB 表示基础动词，VBD 表示过去时，JJ 表示形容词等）。

- POS 标签化很困难，因为许多单词是模糊的。"Book" 可以是名词（“the book”）或动词（“book a flight”）。"Run" 有几十种意义，跨越不同的部分。上下文至关重要。

- 早期标签器使用 **隐式马尔可夫模型 (HMMs)**，来自第 05 章。隐藏状态是 POS 标签，观察是单词。转移概率捕获了标签序列（一个限定词很可能是后跟名词或形容词），而发射概率捕获了哪些单词与哪些标签一起出现。维特比算法找到了最可能的标签序列。

- HMM模型用于词性标注：

$$\hat{t}_{1:n} = \arg\max_{t_{1:n}} \prod_{i=1}^{n} P(w_i \mid t_i) \cdot P(t_i \mid t_{i-1})$$
- 现代的POS标注器使用神经网络（双向LSTM或Transformer），在英语上达到超过97%的准确率，接近人类性能。

- **命名实体识别 (NER)** 识别并分类文本中的特定实体：人名、组织、地点、日期、货币金额等。

- 在“苹果CEO蒂姆库克周一在库比提诺宣布了活动”中，一个命名实体识别系统应该识别：苹果（ORG），蒂姆库克（PER），库比提诺（LOC），周一（DATE）。

- 命名实体识别（NER）通常被看作是使用**序列标注**的方法，其中每个标记都用**BIO tagging**（也称为IOB tagging）进行标记。每个标记都有以下三种可能的标签：
    - **B-TYPE**: 表示一个类型为TYPE的实体的开始
    - **I-TYPE**: 表示一个类型为TYPE的实体的内部（续续续）
    - **O**: 表示不在任何实体中

- Tim/B-PER Cook/I-PER visited/O New/B-LOC York/I-LOC. The B tag marks where a new entity starts, which is important when two entities of the same type are adjacent.

![带有BIO标签颜色编码的句子：B-PER（红色），I-PER（红色），O（灰色），B-LOC（蓝色），I-LOC（蓝色）](../images/bio_tagging.svg)


- 经典命名实体识别（NER）使用了条件随机字段（CRFs），这是第 05 章的内容，它通过输入来模型整个标签序列的条件概率。与 HMMs 不同，HMMs 是生成性的（$P(x, y)$），而 CRFs 是判别性的，并直接模型 $P(y \mid x)$。线性链 CRF 定义为：

$$P(y_{1:n} \mid x_{1:n}) = \frac{1}{Z(x)} \exp\!\left(\sum_{i=1}^{n} \left[\sum_k \lambda_k f_k(y_i, x, i) + \sum_j \mu_j g_j(y_i, y_{i-1}, x, i)\right]\right)$$
- 这里 $f_k$ 是 **发射特征**（在位置 $i$ 给定输入时，标签 $y_i$ 的可能性），而 $g_j$ 是 **转移特征**（在给定前一个标签 $y_{i-1}$ 时，标签 $y_i$ 的可能性）。

- 分区函数 $Z(x) = \sum_{y'} \exp(\ldots)$ 对所有可能的标签序列进行求和以归一化分布。训练最大化条件对数似然，这需要计算 $Z(x)$ 高效地使用前向算法（第5章）。

- 独立分类每个标记的优势：CRF的转移特征强制结构约束（例如，I-PER只能跟随B-PER或I-PER，从不出现在O之后）。

- 现代的命名实体识别（NER）栈在神经编码器（如BiLSTM或BERT）之上叠加了一个CRF层。在这个过程中，神经网络生成了发射分数，而CRF层则学习转移结构。

- **语法解析** 将句子转换为其语法结构，要么是 constituency树，要么是依赖树（从文件 01）。

- **CYK算法**（Cocke-Younger-Kasami）使用动态规划解析带有上下文无关文法的句子。

- 它需要句法符合 **克诺霍夫标准形式**（每个规则要么有两个非终结符，要么有一个终端在右侧）。它从三角形表格底部向上填充：单元格代表句子的片段，每个单元格存储可以生成该片段的非终结符。

- CYK算法的时间复杂度为$O(n^3 \cdot |G|)$，其中$n$是句子长度，$|G|$是语法大小。这个时间复杂度是精确的但速度较慢，适用于大型语法。

- **左移右归解析器**从左到右处理句子，维护一个栈。在每次步骤中，它要么将下一个单词推入栈顶（shift），要么从栈中弹出元素并用短语替换它们。经过训练的分类器决定每个步骤的动作。这运行在 $O(n)$ 时间内，比 CYK 快得多。

- **依存句法分析**在实践中比词性句法分析更为常见。基于转移的依存句法分析（如移位-合并）和基于图的依存句法分析（评分所有可能的边并找到最大 spanning树）是两种主要方法。使用BiLSTM或transformers的神经依存句法解析达到了最先进的结果。

- 在嵌入之前，NLP通过简单的计数方法将文档表示为向量。

- 词袋模型（BoW）将文档表示为一个单词计数的向量，完全忽略单词顺序。如果词汇表有 $V$ 每个文档都是一个向量。 $\mathbb{R}^V$ （从第一章回到向量空间）词条 $w$ 是次数。 $w$ 出现在文档中。

![词袋模型：文档转换为单词计数表，然后转换为R^V中的稀疏向量，每个词汇词都有一项](../images/bag_of_words.svg)


- BoW 是简单但令人惊讶地有效用于文档分类和垃圾邮件过滤等任务。它的主要缺点是它将每个单词视为同等重要："the" 和 "revolutionary" 享有相同的权重。

- TF-IDF（词频-逆文档频率）通过根据单词的重要性来调整权重。在某个文档中频繁出现的单词，但在整个语料库中出现较少的单词，很可能是该文档的重要组成部分。

$$\text{TF-IDF}(t, d) = \text{TF}(t, d) \times \text{IDF}(t)$$
- **词频** $\text{TF}(t, d)$ 是文档 $d$ 中词 $t$ 的原始计数（或其对数：$1 + \log(\text{count})$）。

- 逆文档频率，即 $\text{IDF}(t) = \log\frac{N}{|\{d : t \in d\}|}$，其中 $N$ 是总文档数。出现在所有文档中的词（如“the”）的 IDF 很接近 0。罕见词的 IDF 高。

- TF-IDF向量可以通过余弦相似性（如第01章所述）来衡量文档的相似度。这是经典的信息检索和搜索引擎的基础。

- 语言模型为一组单词分配概率。它回答：这个句子很可能吗？语言模型是机器翻译、语音识别、拼写纠正和文本生成的核心。

- 句子 $w_1, w_2, \ldots, w_n$ 的概率，由条件概率的链式法则（第 05 章）给出：

$$P(w_1, w_2, \ldots, w_n) = \prod_{i=1}^{n} P(w_i \mid w_1, \ldots, w_{i-1})$$
- 这个方法虽然精确但不实用：你需要存储每个可能历史的概率。 **马尔可夫假设**（第5章）将历史截断为最后一个$k-1$个单词，形成一个n-gram模型（其中$n = k$）。

- 二元模型（$n = 2$）仅条件于前一个词：

$$P(w_i \mid w_1, \ldots, w_{i-1}) \approx P(w_i \mid w_{i-1})$$
- 三元模型（$n = 3$）条件于前两个词。n-gram概率通过在语料库中计数来估计：

$$P(w_i \mid w_{i-1}) = \frac{\text{count}(w_{i-1}, w_i)}{\text{count}(w_{i-1})}$$
- **困惑度**衡量语言模型预测测试集的能力。它是一个测试集的逆概率，按单词数量归一化：

$$\text{PPL} = P(w_1, \ldots, w_N)^{-1/N} = \exp\!\left(-\frac{1}{N} \sum_{i=1}^{N} \log P(w_i \mid w_{<i})\right)$$
- 低困惑度意味着模型对测试数据的“惊讶”程度较小，因此更好。一个将10,000词词汇表分配均匀概率的语言模型具有困惑度10,000。一个好的二元模型可能达到困惑度200左右。现代神经语言模型的困惑度低于20。

- 注意，困惑度是交叉熵（第5章的信息论）的指数形式。在训练期间直接最小化交叉熵损失可以直接最小化困惑度。

- **平滑**处理零概率问题：如果一个n-gram从未出现在训练中，模型将其概率分配为0，这会使整个句子的概率为0。 **拉普拉斯平滑**（加一）给每个n-gram添加一个小计数：

$$P_{\text{Laplace}}(w_i \mid w_{i-1}) = \frac{\text{count}(w_{i-1}, w_i) + 1}{\text{count}(w_{i-1}) + V}$$
- 这对于大型词汇表来说过于激进（它从观察到的n-gram中窃取了太多概率）。 **Kneser-Ney平滑** 是n-gram模型的标准金标准。它结合了两个想法：绝对折扣和回退的概率继续性。

- 首先， **绝对折扣** 从每个观察到的计数中减去一个固定的折扣 $d$（通常为 $d \approx 0.75$），而不是添加伪计数。被释放的概率质量重新分配给未见过的n-gram。插值形式为：

$$P_{\text{KN}}(w_i \mid w_{i-1}) = \frac{\max(\text{count}(w_{i-1}, w_i) - d, \; 0)}{\text{count}(w_{i-1})} + \lambda(w_{i-1}) \cdot P_{\text{cont}}(w_i)$$
- $\lambda(w_{i-1})$ 是一个归一化常数，用于分配折扣质量。关键创新是 **延续概率** $P_{\text{cont}}(w_i)$，它衡量不同上下文 $w_i$ 出现的次数，而不是总体出现的频率：

$$P_{\text{cont}}(w_i) = \frac{|\{w' : \text{count}(w', w_i) > 0\}|}{|\{(w', w'') : \text{count}(w', w'') > 0\}|}$$
- 分子统计的是在语料库中出现的与 $w_i$ 相邻的不同单词的数量。例如，单词“Francisco”通常出现在“San”的后面，因此即使“San Francisco”非常常见，它也会因为其低延续概率而不会在其他上下文中被无端预测。

- 反之，常见的单词如“the”出现在许多不同的单词后面，并且得到较高的延续概率。这捕捉了单词的多样性比其原始频率更重要对于回退估计的理解。

- N-gram模型在几十年里都是最先进的技术。它们速度快、易于解释，不需要训练（只需计数）。但它们在处理长距离依赖方面挣扎（例如，“我留在桌子上的钥匙**是**丢失的”需要知道“钥匙”是复数，这远非动词所知）。神经语言模型，从RNNs开始，最终发展到transformers，解决了这个问题。

## 编程任务（使用CoLab或笔记本）

1. 实现Levenshtein编辑距离，使用动态规划进行计算。测试它在单词对上，并用它来进行简单的拼写纠正。
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

2. 实现从头开始的BPE分词。从字符级别的标记开始，迭代合并最频繁的对。
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

3. 构建一个二元语言模型，并在测试句子上计算困惑度。尝试使用拉普拉斯平滑。
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

4. 实现从头开始的TF-IDF，并使用余弦相似性找到与查询最相似的文档。
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
