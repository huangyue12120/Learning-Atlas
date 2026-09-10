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

# 语言学基础

*语言学提供了 NLP 系统隐式学习和利用的结构化词汇。本篇介绍形态学、句法、语义、语用、音系、成分句法与依存句法分析，以及分布式假设——这些人类语言科学构成了 AI 中分词、语法和意义的基础。*

- 在构建能够理解或生成语言的系统之前，我们需要先了解语言本身如何运作。

- 语言学是对语言的科学研究，为 NLP 不断借用的概念词汇提供了来源。

- 即使是从原始数据学习语言的现代神经模型，也在隐式地重新发现语言学家数十年来整理出的许多结构。

- 语言在每个层次都有结构：组成词语的声音、组成词语的部分、把词组合成句子的规则、句子所承载的意义，以及语境塑造解释的方式。我们将从底层向上逐层学习。

- **形态学**研究词的内部结构。词不是不可再分的原子，而是由称为**词素**的更小意义单位构成。

- 单词 “unhappiness” 含有三个词素：“un-”（表示“不”的前缀）、“happy”（词根）和 “-ness”（把形容词变成名词的后缀）。每个词素都为整体意义作出贡献。

- **词根**（或词干）是承载主要意义的核心词素。“happy”“run”“compute”都是词根。

- **词缀**是附着到词根上、用来修改词根的词素。

- 英语有**前缀**（位于词根之前，如 un-、re-、pre-）和**后缀**（位于词根之后，如 -ing、-ed、-tion）。有些语言还使用中缀（插入词根内部）和环缀（包围词根）。

![词素树：“unhappiness”被拆分为前缀“un”、词根“happy”和后缀“ness”](../images/morpheme_tree.svg)

- 形态过程有两种。**屈折**改变词的语法属性，但不改变核心意义或词性：“run”变成 “runs”（第三人称）、“running”（进行时）、“ran”（过去时）。它仍然是表示同一动作的动词。

- **派生**创造新词，通常还会改变词性：“happy”（形容词）变成 “happiness”（名词），“compute”（动词）变成 “computation”（名词）再变成 “computational”（形容词）。每一次派生都会改变意义和语法类别。

- 不同语言的形态复杂度差异很大。英语相对**分析型**（每个词的词素较少，主要依赖词序）。

- 土耳其语和芬兰语是**黏着型**语言（一个词可以串起许多词素）。阿拉伯语和希伯来语使用**模板型**形态：词根是辅音骨架，例如表示“写”的 k-t-b，再插入不同的元音模式生成不同的词：kitab“书”、kataba“他写了”、maktub“已写的”。

- 形态学对 NLP 很重要，因为它影响分词。基于词的分词器会把 “run”“runs”“running” 和 “ran” 当作四个互不相关的符号。

- 具备形态意识的系统会识别它们共享同一个词根。子词分词（BPE、WordPiece；第 02 篇介绍）是形态分析的统计近似。

- **句法**研究词如何组合成短语和句子。每种语言都有规定词序和结构的规则；违反规则就会产生乱码。

- “The cat sat on the mat” 是合乎英语语法的；“Mat the on sat cat the” 不是。

- 描述句法结构主要有两种框架。

- **短语结构语法**（也叫成分语法）认为句子由短语嵌套而成。一个句子（S）由名词短语（NP）和动词短语（VP）组成。

- 名词短语可以是限定词（Det）后接名词（N）；动词短语可以是动词（V）后接名词短语。按照这些规则可以构建一棵树：

![“the cat sat on the mat”的成分树：S 分成 NP 和 VP，NP 分成 Det“the”和 N“cat”，VP 分成 V“sat”和 PP，PP 分成 P“on”和 NP](../images/constituency_tree.svg)

- 这棵树称为**成分树**（或解析树）。每个内部节点是一种短语类型，每个叶节点是一个词。它捕捉了层级分组：“on the mat”是介词短语，“sat on the mat”是动词短语，整体是一个句子。

- **上下文无关文法（CFG）**将这些规则形式化。它由一组产生式组成，每条规则形如 $A \to \alpha$，其中 $A$ 是非终结符（如 NP 或 VP 这样的短语类型），$\alpha$ 是终结符（词）和非终结符组成的序列。例如：

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

- 从 S 开始反复应用规则，就能生成该文法允许的所有句子。解析是反向过程：给定句子，寻找生成它的树（或多棵树）。有多棵有效解析树的句子称为**句法歧义**。例如 “I saw the man with the telescope” 既可以解析为“我用望远镜看见了那个人”，也可以解析为“我看见了一个带着望远镜的人”。

- **依存语法**采取不同视角。它不描述短语嵌套，而描述词之间的直接关系。句中的每个词恰好依赖于另一个词（它的**中心词**），句子根节点除外。结果是**依存树**，边标记语法关系（主语、宾语、修饰语等）。

![“the cat sat on the mat”的依存树：箭头从“sat”指向“cat”（nsubj）和“on”（prep），从“on”指向“mat”（pobj），从“cat”指向“the”（det），从“mat”指向“the”（det）](../images/dependency_tree.svg)

- 在依存视角中，“sat”是根。“cat”作为主语（nsubj）依赖于“sat”，“on”作为介词修饰语依赖于“sat”，“mat”作为介词宾语依赖于“on”。每个词都挂在恰好一个中心词下，形成一棵树。

- 依存语法已经成为现代 NLP 的主流框架，因为统计解析器更容易生成依存树，而且这些关系更直接地对应语义角色（谁对谁做了什么）。

- **配价**描述动词需要多少个论元。“Sleep”是**不及物**动词（一个论元：睡觉的人），“Eat”是**及物**动词（两个：吃的人和被吃的东西），“Give”是**双及物**动词（三个：给予者、所给之物和接受者）。知道动词的配价可以限制哪些解析树有效。

- **语义学**研究意义。句法告诉你句子如何组织，语义告诉你它表达什么。

- **词汇语义**关注单词的意义。词之间存在系统的关系：
    - **同义关系**：意义（几乎）相同的词。“Big”和“large”是同义词。真正完全的同义关系很少见，内涵或用法几乎总有细微差别。
    - **反义关系**：意义相反的词。“Hot”和“cold”，“buy”和“sell”。
    - **上位词/下位词关系**：“是某类”的关系。“Dog”是“animal”的下位词（狗是一种动物），“animal”是“dog”的上位词。这些关系形成分类层级。
    - **部分—整体关系**：“是……的一部分”。“Wheel”是“car”的部分词。
    - **一词多义**：单个词有多个相关意义。“Bank”可以表示金融机构，也可以表示河岸；语境会消除歧义。

- **词义消歧（WSD）**的任务是确定多义词在给定语境中使用的是哪个意义。在 “I deposited money at the bank” 中是金融意义；在 “We sat by the river bank” 中是地理意义。WSD 曾是早期 NLP 的核心问题；现代上下文嵌入（ELMo、BERT）通过为同一词的不同用法生成不同向量表示，基本解决了它。

- **组合语义**研究单词意义如何组合成短语或句子的意义。**组合性原则**（归因于 Frege）指出，复杂表达式的意义由其部分的意义以及组合规则决定。“The cat chased the dog”和“the dog chased the cat”的意义不同，是因为句法结构（谁是主语、谁是宾语）与词义发生了交互。

- 并非所有意义都是组合的。像 “kick the bucket”（意为“死亡”）这样的**习语**，其意义无法由各个组成部分推导出来；这对任何组合式方法都是挑战。

- **分布式语义**是支撑现代 NLP 的计算意义方法。**分布式假设**（Firth，1957）说：“通过一个词身边的词来认识它。”出现在相似语境中的词往往有相似意义。这是词嵌入（Word2Vec、GloVe）的理论基础，我们将在第 03 篇学习。

- **语用学**研究语境如何影响意义。同一个句子会因说话者、时间、地点和目的不同而表达不同含义。

- “Can you pass the salt?” 在句法上是关于能力的是非问句，但在语用上是请求。你不会回答 “Yes, I can” 后继续坐着不动；理解这一点需要超越字面词语的知识，特别是**言语行为**的约定。

- **言语行为理论**（Austin、Searle）区分：
    - **言内行为**：字面内容（“Can you pass the salt?”）。
    - **言外行为**：意图功能（请求）。
    - **言后行为**：对听者的影响（听者递过盐）。

- **会话含义**（Grice）是被暗示、但没有明确说出的意义。如果有人问 “Is John a good cook?”，你回答 “He's British”，你没有从字面上回答问题，但听者可以（无论是否公平地借助文化刻板印象）推断你想说“不是”。Grice 的**合作原则**认为，说话者通常会努力做到信息充分、真实、相关和清楚；听者会假定这些准则成立，再解释话语。

- **共指**是指不同表达式指向同一实体的语用现象。“Alice went to the store. She bought milk.” 中的 “she” 指 Alice。解决共指对理解多句文本至关重要，也是 NLP 的关键任务。

- **话语结构**描述句子如何连接成连贯文本。叙事有开头、发展和结尾；论证有主张和证据。**修辞结构理论（RST）**把文本分析成话语关系（展开、对比、因果等）组成的树。

- 语用学是 NLP 最困难的部分。现代语言模型通过训练数据隐式掌握了大量句法和语义，但语用推理、讽刺、含义以及依赖语境的意义仍是前沿挑战。

- **音系学**研究语言的声音系统。虽然本章聚焦文本，但这里的简要介绍可以连接到音频与语音章节（第 09 章）。

- **音位**是能够区分意义的最小声音单位。英语大约有 44 个音位。“bat”和“pat”只差一个音位（/b/ 与 /p/），意义却完全不同，这叫**最小对立体**。

- **音位变体**是同一音位的不同物理实现，不会改变意义。“pin”中的 p（送气，有一股气流）和“spin”中的 p（不送气）都是英语 /p/ 的音位变体；母语者把它们视为同一个声音。

- **国际音标（IPA）**提供跨语言的标准音位记号。“cat”转写为 /kæt/。IPA 是书面文本与语音系统之间的桥梁。

- **韵律**涵盖语音的节奏、重音和语调。“I didn't say he stole the money” 根据重音落在哪个词上，可以有七种不同意义。韵律携带了文本会丢失的信息，所以文本到语音系统必须仔细建模。

- 在 NLP 中，音系知识出现在文本到语音（字素到音位转换）、语音识别（把声学信号映射到音位），甚至拼写纠错和音译中。

## 编程任务（使用 Colab 或 notebook）

1. 构建一个简单的形态分析器，使用常见前缀和后缀列表把英文单词拆成可能的词素。
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

2. 使用递归下降实现一个简单的上下文无关文法解析器。定义小型文法，将句子解析为成分树。
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

3. 构建一个简单词图探索词汇关系。给定包含同义、反义和上下位关系的小词表，寻找词语之间的路径。
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
