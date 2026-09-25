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

*语言学为自然语言处理（NLP）研究提供了描述语言结构的概念和术语。本文介绍形态、句法、语义、语用、音系、成分句法分析、依存句法分析和分布假说，帮助我们理解 AI 系统中的词元化、语法和意义。*

- 在构建能够理解或生成语言的系统之前，先要了解语言本身如何运作。

- 语言学是研究语言的科学，为 NLP 提供了许多常用概念。

- 即使现代神经网络直接从原始数据学习语言，也会隐式地重新发现语言学家数十年来记录的许多结构。

- 语言在各个层面都有结构：构成词语的语音、构成词语的部分、组合成句子的规则、句子表达的意义，以及语境如何影响理解。下面从较基础的层面开始，逐层介绍。

- **形态学**研究词语的内部结构。词语并非不可再分的整体，而是由更小的有意义单位——**词素**——构成。

- 例如，英文单词 “unhappiness” 由三个词素构成：表示否定的前缀 “un-”、词根 “happy”，以及把形容词转为名词的后缀 “-ness”。每个词素都为整个词的意义作出贡献。

- **词根**（有时也称词干）是承载主要意义的核心词素。“happy”“run”“compute” 都是词根。

- **词缀**是附加在词根上的词素。

- 英语有**前缀**（位于词根之前，如 un-、re-、pre-）和**后缀**（位于词根之后，如 -ing、-ed、-tion）。有些语言还使用**中缀**（插入词根内部）和**环缀**（分置于词根两侧）。

![词素树：将“不快乐”拆分为前缀“不”，根“快乐”，后缀“ness”](../images/morpheme_tree.svg)


- 词语形态变化有两类。**屈折变化**改变词语的语法特征，但不改变其核心意义或词性。例如，动词 “run” 可变为 “runs”（第三人称单数）、“running”（进行体）和 “ran”（过去式）；它们仍是意义相近的动词形式。

- **派生**会构成新词，通常也会改变词性。例如，“happy”（形容词）派生出 “happiness”（名词）；“compute”（动词）可派生出 “computation”（名词），再派生出 “computational”（形容词）。派生会改变词义或语法类别。

- 不同语言的形态复杂程度差异很大。英语相对偏**分析型**：每个词包含的词素较少，语法关系更多依靠词序表达。

- 土耳其语和芬兰语是**黏着语**：一个词可以串接许多词素。阿拉伯语和希伯来语使用**模板形态**：词根由辅音骨架构成，例如表示“写”的 k-t-b；在其中嵌入不同元音模式可形成不同词，如 kitab（“书”）、kataba（“他写了”）和 maktub（“写好的”）。

- 形态结构会影响 NLP 中的词元切分。按词切分的分词器可能把 “run”“runs”“running” 和 “ran” 当作四个互不相关的符号。

- 能识别词语形态的系统则可以发现它们共享同一个词根。子词切分（BPE、WordPiece，见第 02 篇）是用统计方法近似形态分析的一种方式。

- **句法**研究词语如何组合成短语和句子。每种语言都有关于词序和结构的规则；违反这些规则，句子就可能变得难以理解。

- “The cat sat on the mat”（猫坐在垫子上）是合乎语法的英语；“Mat the on sat cat the” 则不合乎英语语法。

- 描述句法结构的主要框架有两种。

- **短语结构语法**（也称**成分语法**）认为，句子由层层嵌套的短语构成。句子（S）由名词短语（NP）和动词短语（VP）组成。

- 名词短语可以由限定词（Det）和名词（N）组成；动词短语可以由动词（V）和名词短语组成。这些规则可以构成一棵句法树：

![句子“The cat sat on the mat”的成分树：S 分为 NP 和 VP，NP 分为限定词“the”和名词“cat”，VP 分为动词“sat”和 PP，PP 分为介词“on”和 NP](../images/constituency_tree.svg)


- 这类树称为**成分树**（或句法分析树）。每个内部节点代表一种短语，每个叶节点代表一个词。树结构呈现了短语的层级关系：“在垫子上”是介词短语，“坐在垫子上”是动词短语，而它们共同组成整个句子。

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

- 从 S 开始反复应用规则，可以生成该文法允许的句子。句法分析则反过来：给定句子，找出能够生成它的树。一个句子若有多棵有效的分析树，就存在**句法歧义**。例如，“我用望远镜看到了那个男人”既可以表示我借助望远镜看见了那个男人，也可以表示我看见了一个带着望远镜的男人。

- **依存语法**从另一个角度描述句法：它关注词语之间的直接关系，而不是短语的层层嵌套。除句子的根节点外，每个词都依存于且只依存于一个词（称为它的**中心词**）。由此形成依存树，边上标注主语、宾语、修饰语等语法关系。

![句子“The cat sat on the mat”的依存树：箭头从“sat”指向“cat”（nsubj）和“on”（prep），从“on”指向“mat”（pobj），从“cat”和“mat”分别指向“the”（det）](../images/dependency_tree.svg)


- 在依存分析中，“sat”是根节点；“cat”作为主语（nsubj）依存于 “sat”，“on”作为介词修饰语依存于 “sat”，“mat”作为介词宾语依存于 “on”。除根节点外，每个词都恰好有一个中心词，因此整体构成一棵树。

- 依赖语法在现代NLP中成为主导框架，因为依赖树更容易通过统计解析器生成，并且关系映射到语义角色（谁做了什么给谁）。

- **配价（valency）**指动词要求多少个论元。“sleep”是不及物动词，有一个论元（睡觉者）；“eat”是及物动词，有两个论元（进食者和被吃的东西）；“give”是双及物动词，有三个论元（给予者、所给之物和接受者）。动词的配价会限制哪些句法分析成立。

- **语义学**研究意义。句法说明句子如何组织，语义学说明句子表达什么。

- **词汇语义学**研究单个词语的意义。词语之间存在多种系统关系：

    - **同义关系**：意义相同或相近的词语，如 “big” 和 “large”。完全同义的词很少见；它们通常在语感或用法上略有差异。
    - **反义关系**：意义相反的词语，如 “hot” 和 “cold”、“buy” 和 “sell”。
    - **上下位关系**：表示“是……的一种”。“dog”是“animal”的下位词（狗是一种动物），“animal”则是“dog”的上位词。这类关系构成分类层级。
    - **部分—整体关系**：表示某物是另一物的一部分，如车轮是汽车的一部分。
    - **多义关系**：一个词有多个彼此相关的意义。例如，“bank”可指金融机构，也可指河岸；语境有助于判断具体词义。

- **词义消歧（WSD）**要判断多义词在特定语境中表达的是哪一种意思。例如，“我在银行存款”中的“银行”指金融机构；“我们坐在河岸边”中的 “bank” 则指河岸。词义消歧曾是早期 NLP 的核心问题之一；ELMo、BERT 等上下文嵌入模型会根据语境为同一个词生成不同表示，因此缓解了这一问题。

- **组合语义学**研究词语的意义如何组合成短语或句子的意义。弗雷格提出的**组合性原则**认为，复杂表达式的意义由其组成部分的意义以及组合规则共同决定。“猫追狗”和“狗追猫”表达不同的意思，因为语法结构（谁是主语、谁是宾语）会与词义相互作用。

- 并非所有意义都能由各部分组合得出。像 “kick the bucket”（“去世”）这样的**习语**，整体意思无法从组成词语推导出来，这对组合式语义分析构成挑战。

- **分布语义学**是现代 NLP 中一种计算语义的方法。Firth（1957）提出的**分布假说**可以概括为：“观其伴而知其词。”在相似语境中出现的词，往往有相近的意义。这一假说也是词嵌入（Word2Vec、GloVe）的理论基础；第 03 篇将介绍这些方法。

- **语用学**研究语境如何影响意义。同一句话由不同的人在不同时间、地点或情境下说出，可能表达不同意思。

- “Can you pass the salt?” 从句法上看是一个询问能力的“是/否”问句；在实际交流中，它通常是在请求对方递盐。要理解这一点，必须结合字面意思之外的知识，尤其是**言语行为**的惯例。

- Austin 和 Searle 的**言语行为理论**区分了三种行为：
    - **言内行为（locutionary act）**：话语的字面内容（“你能把盐递过来吗？”）。
    - **言外行为（illocutionary act）**：说话者的意图（请求对方递盐）。
    - **言后行为（perlocutionary act）**：话语对听者造成的影响（听者把盐递过来）。

- Grice 所说的**会话含义（implicature）**是话语暗示出来、却没有明说的意思。有人问“约翰擅长做菜吗？”，你回答“他是英国人”，虽然没有直接回答，但听者可能依据某种文化刻板印象（无论是否公允）推断你的意思是“并不擅长”。Grice 的**合作原则**认为，说话者通常会尽量做到信息充分、诚实、切题、清楚；听者也会据此理解话语。

- **共指**是一种语用现象，指不同表达指向同一个实体。在“爱丽丝去了商店。她买了牛奶”中，“她”指的就是爱丽丝。共指消解是理解多句文本的关键，也是 NLP 的重要任务。

- **篇章结构**描述句子如何衔接成连贯文本。叙事通常有开端、发展和结尾；论证则由论点和证据构成。**修辞结构理论（RST）**把文本分析为篇章片段之间的关系树，例如阐述、对比和因果关系。

- 语用学是 NLP 中最难处理的领域之一。现代语言模型能通过训练数据隐式地掌握不少句法和语义规律，但语用推理仍是前沿挑战，尤其是理解讽刺、会话含义和依赖语境的意义。

- **音系学**研究语言的语音系统。本章聚焦文本，这里简要介绍音系学，为第 09 章的音频与语音内容作铺垫。

- **音位（phoneme）**是能够区别词义的最小语音单位。英语大约有 44 个音位。“bat” 和 “pat” 只差一个音位（/b/ 与 /p/），词义却完全不同；这样的词语构成一组**最小对立体**。

- **音位变体（allophone）**是同一音位的不同语音实现，不会造成词义差别。在英语中，“pin” 里的 /p/ 带送气，而 “spin” 里的 /p/ 不送气；两者都是音位 /p/ 的变体，英语母语者会把它们视为同一个音位。

- **国际音标（IPA）**为记录各种语言的语音提供了统一符号。英语单词 “cat” 可记作 /kæt/。IPA 是书面文本与语音系统之间的桥梁。

- **韵律**包括语音的节奏、重音和语调。例如，英语句子 “I didn't say he stole the money” 中重读不同的词，会产生不同含义。韵律承载了纯文本无法表达的信息，因此文本转语音系统需要仔细建模。

- 在 NLP 中，音系知识应用于文本转语音（字素到音位的转换）、语音识别（将声学信号映射到音位），也与拼写纠正和转写有关。

## 编程任务（使用 Colab 或 Jupyter 笔记本）

1. 使用常见前缀和后缀表，构建一个简单的形态分析器，把英语单词拆分为可能的词素。

**编者注：**这段代码只按词缀表作启发式切分，不能保证找准词素边界；例如它会把 “unhappiness” 中的词根切成 “happi”。
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

2. 用递归下降法实现一个简单的上下文无关文法解析器。定义一套小型文法，并把句子解析为成分句法树。
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

3. 构建一个简单的词语关系图，探索词义关系。给定包含同义、反义和上下位关系的小型词表，找出任意两个词之间的路径。
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
