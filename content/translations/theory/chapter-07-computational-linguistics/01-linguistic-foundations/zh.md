---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 07 - computational linguistics/01. linguistic foundations.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: e96beed85b0061c1001e7475faeafb1b6ddc50fd5d9d64892b6bc9f05227a843
status: reviewed
---
# 语言基础

*语言学为NLP系统隐式学习和利用的语言结构提供了结构性词汇。本文件涵盖了形态、语法、语义、 pragmat学、语音、依存分析以及分布性假设，这是支撑AI中词法、语法和意义的基础的人类语言科学。*

- 在我们能够构建理解或生成语言的系统之前，我们需要了解语言本身是如何工作的。

- 语言学是研究语言的科学，它为NLP提供了常常用到的概念词汇。

- 即使现代神经模型，从原始数据中学习语言时，它们也 implicitly重新发现了许多几十年来语言学家已记录下来的结构。

- 语言在每个层次上都有结构：构成单词的声音、构成单词的部件、组合成句子的规则、这些句子所携带的意义以及上下文如何影响解释。我们将从底部开始，逐步工作通过每个层次。

- **形态学**是研究单词内部结构的学科。单词不是原子的；它们由较小有意义的单位称为**词素**组成。

- 例如，“unhappiness”包含三个词素：前缀“un-”（表示“不”的意思），根“happy”，后缀“-ness”（将形容词转换为名词）。每个词素都对意义做出了贡献。

- **根**（或核心）是承载主要含义的核心词素。“happy”、“run”、“compute”都是根。

- **附缀**是附加到根上的词素。

- 英语有前缀（在根之前：un-, re-, pre-）和后缀（在根之后：-ing, -ed, -tion）。一些语言也使用插入式附缀（嵌入在根内）和环绕式附缀。

![词素树：将“不快乐”拆分为前缀“不”，根“快乐”，后缀“ness”](../images/morpheme_tree.svg)


- 有两种类型的词素变化。**屈折**改变单词的语法属性，但不改变其核心意义或部分词性：例如，“run”变为“runs”（第三人称），“running”（进行时态），“ran”（过去时）。单词仍然是一个表示相同意思的动词。

- **衍生**创造一个新的词，通常改变其部分词性：例如，“happy”（形容词）变为“happiness”（名词），“compute”（动词）变为“computation”（名词）变为“computational”（形容词）。每个衍生都会改变意义和语法类别。

- 语言在形态复杂性方面差异巨大。英语相对**分析型**（每个单词的词素较少，依赖于词序）。

- 土耳其语和芬兰语是**聚合型**（单词可以包含许多词素连成串）。阿拉伯语和希伯来语使用**模板型**形态（根是像“k-t-b”这样的音节骨架，插入不同的元音模式以创建不同单词：kitab“书”，kataba“他写了”，maktub“写过”。

- 模式对 NLP 重要，因为它影响了分词。一个单词级别的分词器会将 "run"、"runs"、"running" 和 "ran" 视为四个无关的符号。

- 一个具有语义感知系统的系统能够识别它们共享一个根。子词分词（BPE、WordPiece），我们将在文件 02 中讨论，是一种统计上接近语义分析的方法。

- **语法** 是研究单词如何组合成短语和句子的学科。每种语言都有规则来规定词序和结构；违反这些规则会产生乱码。

- "The cat sat on the mat" 是语法正确的英语；"Mat the on sat cat the" 不是。

- 有两种主要框架用于描述句法结构。

- **短语结构语法**（也称为成分语法）说句子是由嵌套在其他短语中的短语构建的。一个句子（S）由名词短语（NP）和动词短语（VP）组成。

- 名词短语可能由限定词（det）和名词（N）组成。动词短语可能由动词（V）和名词短语组成。这些规则构建一棵树：

![句子结构树，对于“猫坐在垫子上”：S分支为NP和VP，NP分支为限定词“的”和名词“猫”，VP分支为动词“坐”和PP，PP分支为介词“在”和名词“垫子”](../images/constituency_tree.svg)


- 这棵树被称为 **词法树**（或句法树）。每个内部节点是短语类型，每个叶子是单词。该树捕捉了层次结构：“在垫子上”是一个单位（介词短语），“坐在垫子上”是一个单位（动词短语），整个句子是一个句子。

- **上下文无关文法（CFG）**正式化了这些规则。它由一组生产规则组成，每个规则的形式为 $A \to \alpha$，其中 $A$ 是非终结符（如 NP 或 VP），而 $\alpha$ 是一个词元序列和非终结符的组合。例如：

```
S  → NP VP
NP → Det N
NP → Det N PP
VP → V NP
VP → V PP
PP → P NP
Det → "the" | "a"
N  → "cat" | "mat" | "dog"
V  → "sat" | "chased"
P  → "on" | "under"
```

- 从S开始，反复应用规则，可以生成所有该语法允许的句子。解析是相反的：给定一个句子，找到产生它的树（或树）。具有多个有效解析树的句子是**语义上不明确的**。"我用望远镜看到了那个男人"有两个解析：我是用望远镜看到那个男人，或者我看到一个有望远镜的男人。

- 依赖语法从不同的角度看待。它描述了单词之间的直接关系，而不是短语的嵌套。句子中的每个单词都依赖于恰好一个其他单词（它的头），除了句子的根。结果是一个依赖树，其中边被标签为语法关系（主语、宾语、修饰词等）。

![依存树，对于“猫坐在垫子上”：箭头从“坐”指向“猫”（主语）和“在”（介词），从“在”指向“垫子”（宾语），从“猫”指向“的”（限定词），从“垫子”指向“的”（限定词）](../images/dependency_tree.svg)


- 在依赖视图中，"sat" 是根节点。"Cat" 作为主语（nsubj）依附于 "sat"。"On" 作为介词修饰词依附于 "sat"。"Mat" 作为介词的宾语依附于 "on"。每个单词都恰好有一个头，形成一棵树。

- 依赖语法在现代NLP中成为主导框架，因为依赖树更容易通过统计解析器生成，并且关系映射到语义角色（谁做了什么给谁）。

- **Valency** describes how many arguments a verb requires. "Sleep" is **intransitive** (one argument: the sleeper). "Eat" is **transitive** (two: the eater and the eaten). "Give" is **ditransitive** (three: the giver, the thing given, and the receiver). Knowing a verb's valency constrains which parse trees are valid.

- **Semantics** is the study of meaning. Syntax tells you how a sentence is structured; semantics tells you what it means.

- **Lexical semantics** concerns the meaning of individual words. Words are related to each other in systematic ways:

    - **Synonymy**: words with (nearly) the same meaning. "Big" and "large" are synonyms. True perfect synonymy is rare; there are almost always subtle differences in connotation or usage.
    - **Antonymy**: words with opposite meanings. "Hot" and "cold," "buy" and "sell."
    - **Hypernymy/hyponymy**: "is-a" relationships. "Dog" is a hyponym of "animal" (a dog is a kind of animal). "Animal" is a hypernym of "dog." These form taxonomic hierarchies.
    - **Meronymy**: "part-of" relationships. "Wheel" is a meronym of "car."
    - **Polysemy**: a single word with multiple related meanings. "Bank" means a financial institution or a river bank. Context disambiguates.

- **词义歧义消解（WSD）** 是确定多义词在特定上下文中意图的任务。例如，在“我在银行存款”中，金融意义是正确的；在“我们在河边坐”中，地理意义是正确的。词义歧义消解在早期自然语言处理中是一个核心问题；现代基于上下文的嵌入（如ELMo、BERT）通过为同一单词产生不同表示来 largely解决这个问题。

- **语义组合性**探讨了单个词语如何结合形成短语或句子的含义。弗雷格提出的“语义组合性”原则表明，复杂表达式的含义由其组成部分和用于组合它们的规则决定。"猫追狗"与"狗追猫"的意义不同，因为语法结构（谁是主语还是宾语）与词义相互作用。

- Not all meaning is compositional. **Idioms** like "kick the bucket" (meaning "to die") have meanings that cannot be derived from their parts. These are a challenge for any compositional approach.

- **Distributional semantics** is the computational approach to meaning that underpins modern NLP. The **distributional hypothesis** (Firth, 1957) 状态s: "You shall know a word by the company it keeps." Words that appear in similar contexts tend to have similar meanings. This is the theoretical foundation for word embeddings (Word2Vec, GloVe), which we will explore in file 03.

- **实用主义**研究了上下文如何影响意义。同样的句子在不同的人、时间、地点和原因下可能有不同的含义。

- “Can you pass the salt?” 是一个关于能力的语法上的 yes/no 问题。实际上，它是一个请求。你不会回答“是的，我可以”然后坐下来。理解这一点需要超越字面意思的知识，具体来说，是 **言语行为** 的约定俗成。

- **言语行为理论**（Austin, Searle）区分了：
    - **语义行为**：字面内容（“你能把盐递过去吗？”）
    - **功能行为**：意图（一个请求）
    - **效果行为**：对听众的影响（他们递过盐）

- **隐含 意**（Grice）是通过暗示但未明确表达的含义。如果有人问“约翰是个好厨师吗？”你回答说“他是英国人”，你没有直接回答问题，但听众可以通过文化刻板印象（有时公正有时不公正）推断出你实际上的意思是“不是”。Grice的**合作原则**指出说话者通常试图提供信息、诚实、相关和清晰，而听众假设这些准则成立

- **核心指涉**是一种语用现象，不同的表达指向同一个实体。在“爱丽丝去了商店。她买了牛奶”中，“她”指的是爱丽丝。解决核心指涉是理解多句文本的关键，也是NLP中的重要任务

- ** discourse structure** 描述了句子如何连接以形成连贯的文本。一个叙述有开头、中间和结尾。一个论点有主张和证据。 **Rhetorical Structure Theory (RST)** 分析文本为段落之间的 discourse关系（如阐述、对比、因果等）树形结构。

- 理性主义是NLP最困难的地方。现代语言模型通过训练数据隐式处理语法和语义，但理解 sarcasm、暗示、上下文依赖意义的理性推理仍然是一个前沿挑战。

- **音韵学** 研究语言的声音系统。虽然本章关注文本，但一个简短的概述为音频和语音章节（第09章）铺平了道路。

- **音素** 是区分意义最小的声学单位。英语大约有44个音素。单词“bat”和“pat”仅相差一个音素(/b/ vs /p/)，这完全改变了它们的意义。这种差异称为**最小配对**。

- ** allophones** 是同一个音素的不同物理实现，不会改变意义。英语中“pin”（带气流的“p”，即有气泡）和“spin”（无气流的“p”）是 /p/ 的同音异形体；母语者将它们视为相同的声学单位。

- **国际音标（IPA）**为所有语言提供了统一的发音符号。单词“猫”被记录为/kæt/。IPA是书面文本和语音系统的桥梁。

- **语调**涵盖了语音的节奏、重音和音调。例如，“我并没有说他偷了钱”在不同的重音下有不同的含义，因此文本无法传达的信息通过语调得以保留。这就是为什么文本到语音系统必须仔细建模的原因。

- 在NLP中，语音知识出现在文本到语音（图元到音素转换）、语音识别（将声波映射为音素）以及拼写纠正和转录等场景。

## 编程任务（使用 CoLab 或 笔记本）

1. 构建一个简单的形态分析器，将英语单词分割成可能的词素列表，使用常见的前缀和后缀。
```python
prefixes = ['un', 're', 'pre', 'dis', 'mis', 'over', 'under', 'out', 'non']
suffixes = ['ing', 'ed', 'ly', 'ness', 'ment', 'tion', 'able', 'ible', 'er', 'est', 'ful', 'less', 'ous']

def analyse_morphemes(word):
    """Simple morpheme analysis using known affixes."""
    parts = []
    remaining = word.lower()

    # Check prefixes
    for p in sorted(prefixes, key=len, reverse=True):
        if remaining.startswith(p) and len(remaining) > len(p) + 2:
            parts.append(f"[prefix: {p}]")
            remaining = remaining[len(p):]
            break

    # Check suffixes
    for s in sorted(suffixes, key=len, reverse=True):
        if remaining.endswith(s) and len(remaining) > len(s) + 2:
            root = remaining[:-len(s)]
            parts.append(f"[root: {root}]")
            parts.append(f"[suffix: {s}]")
            remaining = None
            break

    if remaining is not None:
        parts.append(f"[root: {remaining}]")

    return parts

for word in ['unhappiness', 'reusable', 'disconnected', 'overreacting', 'kindness']:
    print(f"{word:20s} → {' + '.join(analyse_morphemes(word))}")
```

2. 实现一个简单的上下文无关语法解析器，使用递归下降法。定义一个小的上下文无关文法，并将句子解析为结构树。
```python
class CFGParser:
    """Recursive descent parser for a tiny English grammar."""
    def __init__(self, tokens):
        self.tokens = tokens
        self.pos = 0

    def peek(self):
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None

    def consume(self, expected=None):
        tok = self.peek()
        if expected and tok != expected:
            return None
        self.pos += 1
        return tok

    def parse_det(self):
        if self.peek() in ('the', 'a'):
            return ('Det', self.consume())
        return None

    def parse_noun(self):
        if self.peek() in ('cat', 'dog', 'mat', 'man'):
            return ('N', self.consume())
        return None

    def parse_verb(self):
        if self.peek() in ('sat', 'chased', 'saw'):
            return ('V', self.consume())
        return None

    def parse_prep(self):
        if self.peek() in ('on', 'under', 'with'):
            return ('P', self.consume())
        return None

    def parse_np(self):
        save = self.pos
        det = self.parse_det()
        noun = self.parse_noun()
        if det and noun:
            # Check for optional PP
            pp = self.parse_pp()
            if pp:
                return ('NP', det, noun, pp)
            return ('NP', det, noun)
        self.pos = save
        return None

    def parse_pp(self):
        save = self.pos
        prep = self.parse_prep()
        np = self.parse_np()
        if prep and np:
            return ('PP', prep, np)
        self.pos = save
        return None

    def parse_vp(self):
        save = self.pos
        verb = self.parse_verb()
        if verb:
            np = self.parse_np()
            if np:
                return ('VP', verb, np)
            pp = self.parse_pp()
            if pp:
                return ('VP', verb, pp)
        self.pos = save
        return None

    def parse_sentence(self):
        np = self.parse_np()
        vp = self.parse_vp()
        if np and vp and self.pos == len(self.tokens):
            return ('S', np, vp)
        return None

def print_tree(tree, indent=0):
    if isinstance(tree, str):
        print(' ' * indent + tree)
    elif isinstance(tree, tuple):
        print(' ' * indent + tree[0])
        for child in tree[1:]:
            print_tree(child, indent + 2)

sentences = [
    "the cat sat on the mat",
    "a dog chased the cat",
]

for sent in sentences:
    tokens = sent.split()
    parser = CFGParser(tokens)
    tree = parser.parse_sentence()
    print(f"\n'{sent}':")
    if tree:
        print_tree(tree)
    else:
        print("  (no parse found)")
```

3. 探索词义关系，通过构建一个简单的单词图来实现。给定一个包含同义词、反义词和超nym关系的小词汇表，找到两个词之间的路径。
```python
relations = {
    ('big', 'large'): 'synonym',
    ('big', 'small'): 'antonym',
    ('small', 'tiny'): 'synonym',
    ('dog', 'animal'): 'hypernym',
    ('cat', 'animal'): 'hypernym',
    ('puppy', 'dog'): 'hypernym',
    ('happy', 'glad'): 'synonym',
    ('happy', 'sad'): 'antonym',
    ('hot', 'cold'): 'antonym',
    ('hot', 'warm'): 'synonym',
}

# Build adjacency list
from collections import defaultdict, deque

graph = defaultdict(list)
for (w1, w2), rel in relations.items():
    graph[w1].append((w2, rel))
    graph[w2].append((w1, rel))

def find_path(start, end):
    """BFS to find a path between two words through the relation graph."""
    queue = deque([(start, [(start, None)])])
    visited = {start}
    while queue:
        node, path = queue.popleft()
        if node == end:
            return path
        for neighbor, rel in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, path + [(neighbor, rel)]))
    return None

pairs = [('big', 'tiny'), ('puppy', 'cat'), ('happy', 'sad')]
for w1, w2 in pairs:
    path = find_path(w1, w2)
    if path:
        steps = " → ".join(f"{w}({r})" if r else w for w, r in path)
        print(f"{w1} → {w2}: {steps}")
    else:
        print(f"{w1} → {w2}: no path found")
```
