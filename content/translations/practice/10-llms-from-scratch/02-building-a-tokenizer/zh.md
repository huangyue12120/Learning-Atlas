---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/10-llms-from-scratch/02-building-a-tokenizer/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 3e2af805d324028b1c673be3bebad6f17dc74ca2ffa0f1f050aa2d5d56d61da1
status: reviewed
---

# 从零构建分词器

> 第 01 课给了你一个玩具。这一课给你一件武器。

**类型：** 构建
**语言：** Python
**前置课程：** 第 10 阶段，第 01 课（分词器：BPE、WordPiece、SentencePiece）
**用时：** 约 90 分钟

## 学习目标

- 构建一个生产级 BPE 分词器，处理 Unicode、空白规范化和特殊词元
- 实现字节级回退，让分词器能够对任何输入（包括表情符号、中日韩文字和代码）进行编码，而不会产生未知词元
- 添加预分词正则表达式模式，在应用 BPE 合并前按词边界切分文本
- 在语料库上训练自定义分词器，并在多语言文本上将其压缩比与 tiktoken 进行比较

## 问题

第 01 课中的 BPE 分词器能处理英文文本。现在把日语扔给它。或者表情符号。或者混合使用制表符和空格的 Python 代码。

它会崩溃。

BPE 本身没有错，问题在于实现不完整。生产级分词器要能处理任意编码中的原始字节，在切分前规范化 Unicode，管理永远不会参与合并的特殊词元，将预分词与子词切分串联起来，并且这一切的速度足够快，不会成为处理 15 万亿个词元的训练管道的瓶颈。

GPT-2 的分词器有 50,257 个词元，Llama 3 有 128,256 个，GPT-4 大约有 100,000 个。这些不是玩具数字。这些词表背后的合并表是在数百 GB 的文本上训练出来的，而周边机制——规范化、预分词、特殊词元注入、聊天模板格式化——正是区分只会处理“hello world”的分词器与能处理整个互联网的分词器的关键。

你将构建这套机制。

## 核心概念

### 完整流水线

生产级分词器由五个阶段组成的流水线构成；每个阶段解决不同的问题。

```mermaid
graph LR
    A[原始文本] --> B[规范化]
    B --> C[预分词]
    C --> D[BPE 合并]
    D --> E[特殊词元]
    E --> F[词元 ID]

    style A fill:#1a1a2e,stroke:#e94560,color:#fff
    style B fill:#1a1a2e,stroke:#e94560,color:#fff
    style C fill:#1a1a2e,stroke:#e94560,color:#fff
    style D fill:#1a1a2e,stroke:#e94560,color:#fff
    style E fill:#1a1a2e,stroke:#e94560,color:#fff
    style F fill:#1a1a2e,stroke:#e94560,color:#fff
```

每个阶段都有明确的任务：

| 阶段 | 做什么 | 为什么重要 |
|-------|-------------|----------------|
| 规范化 | NFKC Unicode，可选转小写，可选去除重音符号 | “fi” 连字（U+FB01）会变成“fi”（两个字符）。没有这一步，同一个词会得到不同的词元。 |
| 预分词 | 在 BPE 前将文本切成片段 | 防止 BPE 跨词边界合并。“the cat”不应生成“e c”这个词元。 |
| BPE 合并 | 将学到的合并规则应用于字节序列 | 核心压缩过程：将原始字节转换为子词词元。 |
| 特殊词元 | 注入 [BOS]、[EOS]、[PAD] 和聊天模板标记 | 这些词元的 ID 是固定的。它们不会参与 BPE 合并，模型需要它们来表达结构。 |
| ID 映射 | 将词元字符串转换为整数 ID | 模型看到的是整数，而不是字符串。 |

### 字节级 BPE

第 01 课的分词器处理的是 UTF-8 字节。这是正确的选择。但我们漏掉了一个重要问题：如果这些字节不是有效的 UTF-8，会发生什么？

字节级 BPE 的解决办法是把每个可能的字节值（0–255）都视为有效词元。基础词表恰好有 256 个条目。任意文件——文本、二进制或损坏的文件——都能被分词，而不会产生未知词元。

GPT-2 加入了一个技巧：将每个字节映射到可打印的 Unicode 字符，使词表保持人类可读。在它的映射中，字节 0x20（空格）会变成字符“G”。这纯粹是外观层面的处理，算法并不在意。

真正的力量在于：字节级 BPE 能处理地球上的每一种语言。每个汉字占 3 个 UTF-8 字节；日语字符可能占 3–4 个字节。阿拉伯文、天城文、表情符号——全都只是字节序列。BPE 算法在这些字节序列中寻找模式，和在英文 ASCII 字节中寻找模式的方式完全相同。

### 预分词

BPE 处理文本之前，需要先把文本切成片段。这可以防止合并算法创建跨越词边界的词元。

GPT-2 使用正则表达式模式切分文本：

```
'(?:[sdmt]|ll|ve|re)| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+
```

这个模式会切分缩写（“don't”变成“don”+“'t”）、带可选前导空格的单词、数字、标点和空白。前导空格会保留在单词上——因此“the cat”会变成 [" the", " cat"]，而不是 ["the", " ", "cat"]。

Llama 使用 SentencePiece，完全跳过正则表达式。它把原始字节流视为一个长序列，让 BPE 算法自己找出边界。这种方式更简单，但也给了 BPE 更大的自由去创建跨词词元。

选择很重要。GPT-2 的正则表达式会阻止分词器学到：一个词末尾的“the”和下一个词开头的“the”应该合并。SentencePiece 则允许这样做，有时能实现更高效的压缩，但生成的词元也更难解释。

### 特殊词元

每个生产级分词器都会为结构标记预留词元 ID：

| 词元 | 用途 | 使用者 |
|-------|---------|---------|
| `[BOS]` / `<s>` | 序列开始 | Llama 3、GPT |
| `[EOS]` / `</s>` | 序列结束 | 所有模型 |
| `[PAD]` | 用于批次对齐的填充 | BERT、T5 |
| `[UNK]` | 未知词元（字节级 BPE 可消除它） | BERT、WordPiece |
| `<\|im_start\|>` | 聊天消息边界起点 | ChatGPT、Qwen |
| `<\|im_end\|>` | 聊天消息边界终点 | ChatGPT、Qwen |
| `<\|user\|>` | 用户轮次标记 | Llama 3 |
| `<\|assistant\|>` | 助手轮次标记 | Llama 3 |

特殊词元永远不会被 BPE 切分。合并算法运行前，分词器会精确匹配它们，将其替换为固定 ID，再正常处理周围的文本。

### 聊天模板

这里是大多数人感到困惑、也最容易让实现出错的地方。

当你向聊天模型发送消息时，API 接收的是一组消息列表：

```
[
  {"role": "system", "content": "You are helpful."},
  {"role": "user", "content": "Hello"},
  {"role": "assistant", "content": "Hi there!"}
]
```

模型看不到 JSON；它看到的是一条扁平的词元序列。聊天模板使用特殊词元将消息转换为这条扁平序列。每个模型的做法都不同：

```
Llama 3:
<|begin_of_text|><|start_header_id|>system<|end_header_id|>

You are helpful.<|eot_id|><|start_header_id|>user<|end_header_id|>

Hello<|eot_id|><|start_header_id|>assistant<|end_header_id|>

Hi there!<|eot_id|>

ChatGPT:
<|im_start|>system
You are helpful.<|im_end|>
<|im_start|>user
Hello<|im_end|>
<|im_start|>assistant
Hi there!<|im_end|>
```

模板写错后，模型就会输出垃圾。它是在一种精确的格式上训练的。任何偏差——缺少换行、交换词元、额外空格——都会让输入落到训练分布之外。

### 速度

Python 对生产级分词来说太慢了。

tiktoken（OpenAI）使用 Rust 编写，并通过 Python 绑定提供接口。HuggingFace tokenizers 也使用 Rust。SentencePiece 使用 C++。这些实现比纯 Python 快 10–100 倍。

作为参照：如果以每秒 100 万个词元（快速 Python）的速度，为 Llama 3 的预训练数据进行分词，处理 15 万亿个词元需要 174 天；以每秒 1 亿个词元（Rust）的速度，则只需 1.7 天。

你现在用 Python 构建它，是为了理解算法。在生产环境中，你会使用编译型实现，只接触 Python 封装层。

```figure
weight-tying
```

## 动手实现

### 第 1 步：字节级编码

这是基础：将任意字符串转换为字节序列，将每个字节映射到可打印字符以便显示，然后再反向转换。

```python
def bytes_to_tokens(text):
    return list(text.encode("utf-8"))

def tokens_to_text(token_bytes):
    return bytes(token_bytes).decode("utf-8", errors="replace")
```

在多语言文本上进行测试，观察字节数：

```python
texts = [
    ("English", "hello"),
    ("Chinese", "你好"),
    ("Emoji", "🔥"),
    ("Mixed", "hello你好🔥"),
]

for label, text in texts:
    b = bytes_to_tokens(text)
    print(f"{label}: {len(text)} chars -> {len(b)} bytes -> {b}")
```

“hello”占用 5 个字节。“你好”占用 6 个字节（每个字符 3 个字节）。火焰表情符号占用 4 个字节。字节级分词器不在乎输入是什么语言；字节就是字节。

### 第 2 步：使用正则表达式进行预分词

使用 GPT-2 正则表达式模式将文本切分成片段。每个片段由 BPE 独立分词。

```python
import re

try:
    import regex
    GPT2_PATTERN = regex.compile(
        r"""'(?:[sdmt]|ll|ve|re)| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+"""
    )
except ImportError:
    GPT2_PATTERN = re.compile(
        r"""'(?:[sdmt]|ll|ve|re)| ?[a-zA-Z]+| ?[0-9]+| ?[^\s\w]+|\s+(?!\S)|\s+"""
    )

def pre_tokenize(text):
    return [match.group() for match in GPT2_PATTERN.finditer(text)]
```

`regex` 模块支持 Unicode 属性转义（`\p{L}` 表示字母，`\p{N}` 表示数字）。标准库的 `re` 模块不支持，因此我们退回使用 ASCII 字符类。对于生产级多语言分词器，请安装 `regex`。

试试看：

```python
print(pre_tokenize("Hello, world! Don't stop."))
# [' Hello', ',', ' world', '!', " Don", "'t", ' stop', '.']
```

前导空格会保留在单词上。缩写会在撇号处分开。标点会成为自己的片段。BPE 永远不会跨越这些边界合并词元。

### 第 3 步：在字节序列上运行 BPE

这是第 01 课中的核心算法，不过现在它会分别作用于预分词后的片段。

```python
from collections import Counter

def get_byte_pairs(chunks):
    pairs = Counter()
    for chunk in chunks:
        byte_seq = list(chunk.encode("utf-8"))
        for i in range(len(byte_seq) - 1):
            pairs[(byte_seq[i], byte_seq[i + 1])] += 1
    return pairs

def apply_merge(byte_seq, pair, new_id):
    merged = []
    i = 0
    while i < len(byte_seq):
        if i < len(byte_seq) - 1 and byte_seq[i] == pair[0] and byte_seq[i + 1] == pair[1]:
            merged.append(new_id)
            i += 2
        else:
            merged.append(byte_seq[i])
            i += 1
    return merged
```

### 第 4 步：处理特殊词元

特殊词元需要精确匹配和固定 ID。它们会完全绕过 BPE。

```python
class SpecialTokenHandler:
    def __init__(self):
        self.special_tokens = {}
        self.pattern = None

    def add_token(self, token_str, token_id):
        self.special_tokens[token_str] = token_id
        escaped = [re.escape(t) for t in sorted(self.special_tokens.keys(), key=len, reverse=True)]
        self.pattern = re.compile("|".join(escaped))

    def split_with_specials(self, text):
        if not self.pattern:
            return [(text, False)]
        parts = []
        last_end = 0
        for match in self.pattern.finditer(text):
            if match.start() > last_end:
                parts.append((text[last_end:match.start()], False))
            parts.append((match.group(), True))
            last_end = match.end()
        if last_end < len(text):
            parts.append((text[last_end:], False))
        return parts
```

### 第 5 步：完整的分词器类

把所有步骤串起来：规范化、按特殊词元切分、预分词、BPE 合并，再映射为 ID。

```python
import unicodedata

class ProductionTokenizer:
    def __init__(self):
        self.merges = {}
        self.vocab = {i: bytes([i]) for i in range(256)}
        self.special_handler = SpecialTokenHandler()
        self.next_id = 256

    def normalize(self, text):
        return unicodedata.normalize("NFKC", text)

    def train(self, text, num_merges):
        text = self.normalize(text)
        chunks = pre_tokenize(text)
        chunk_bytes = [list(chunk.encode("utf-8")) for chunk in chunks]

        for i in range(num_merges):
            pairs = Counter()
            for seq in chunk_bytes:
                for j in range(len(seq) - 1):
                    pairs[(seq[j], seq[j + 1])] += 1
            if not pairs:
                break
            best = max(pairs, key=pairs.get)
            new_id = self.next_id
            self.next_id += 1
            self.merges[best] = new_id
            self.vocab[new_id] = self.vocab[best[0]] + self.vocab[best[1]]
            chunk_bytes = [apply_merge(seq, best, new_id) for seq in chunk_bytes]

    def add_special_token(self, token_str):
        token_id = self.next_id
        self.next_id += 1
        self.special_handler.add_token(token_str, token_id)
        self.vocab[token_id] = token_str.encode("utf-8")
        return token_id

    def encode(self, text):
        text = self.normalize(text)
        parts = self.special_handler.split_with_specials(text)
        all_ids = []
        for part_text, is_special in parts:
            if is_special:
                all_ids.append(self.special_handler.special_tokens[part_text])
            else:
                for chunk in pre_tokenize(part_text):
                    byte_seq = list(chunk.encode("utf-8"))
                    for pair, new_id in self.merges.items():
                        byte_seq = apply_merge(byte_seq, pair, new_id)
                    all_ids.extend(byte_seq)
        return all_ids

    def decode(self, ids):
        byte_parts = []
        for token_id in ids:
            if token_id in self.vocab:
                byte_parts.append(self.vocab[token_id])
        return b"".join(byte_parts).decode("utf-8", errors="replace")

    def vocab_size(self):
        return len(self.vocab)
```

### 第 6 步：多语言测试

真正的测试：把英文、中文、表情符号和代码都交给它。

```python
corpus = (
    "The quick brown fox jumps over the lazy dog. "
    "The quick brown fox runs through the forest. "
    "Machine learning models process natural language. "
    "Deep learning transforms how we build software. "
    "def train(model, data): return model.fit(data) "
    "def predict(model, x): return model(x) "
)

tok = ProductionTokenizer()
tok.train(corpus, num_merges=50)

bos = tok.add_special_token("<|begin|>")
eos = tok.add_special_token("<|end|>")

test_texts = [
    "The quick brown fox.",
    "你好世界",
    "Hello 🌍 World",
    "def foo(x): return x + 1",
    f"<|begin|>Hello<|end|>",
]

for text in test_texts:
    ids = tok.encode(text)
    decoded = tok.decode(ids)
    print(f"Input:   {text}")
    print(f"Tokens:  {len(ids)} ids")
    print(f"Decoded: {decoded}")
    print()
```

每个汉字会产生 3 个字节，表情符号会产生 4 个字节。这些输入都不会让分词器崩溃，也不会产生未知词元，这体现了字节级 BPE 的能力。

## 使用它

### 比较真实的分词器

加载 Llama 3、GPT-4 和 Mistral 的实际分词器，看看它们如何处理同一段多语言文本。

```python
import tiktoken

gpt4_enc = tiktoken.get_encoding("cl100k_base")

test_paragraph = "Machine learning is powerful. 机器学习很强大。 L'apprentissage automatique est puissant. 🤖💪"

tokens = gpt4_enc.encode(test_paragraph)
pieces = [gpt4_enc.decode([t]) for t in tokens]
print(f"GPT-4 ({len(tokens)} tokens): {pieces}")
```

```python
from transformers import AutoTokenizer

llama_tok = AutoTokenizer.from_pretrained("meta-llama/Meta-Llama-3-8B")
mistral_tok = AutoTokenizer.from_pretrained("mistralai/Mistral-7B-v0.1")

for name, tok in [("Llama 3", llama_tok), ("Mistral", mistral_tok)]:
    tokens = tok.encode(test_paragraph)
    pieces = tok.convert_ids_to_tokens(tokens)
    print(f"{name} ({len(tokens)} tokens): {pieces[:20]}...")
```

同一段文本会得到不同的词元数量。词表为 128K 的 Llama 3 在合并常见模式时更激进。词表约为 100K 的 GPT-4 居中。词表为 32K 的 Mistral 会产生更多词元，但嵌入层更小。

权衡始终相同：词表越大，序列越短，但参数越多。

## 交付产物

本节会产出一个用于构建和调试生产级分词器的提示词。参见 `outputs/prompt-tokenizer-builder.md`。

## 练习

1. **简单：** 添加一个 `get_token_bytes(id)` 方法，显示任意词元 ID 对应的原始字节。用它检查最常见的合并词元实际表示什么。
2. **中等：** 实现 Llama 风格的预分词器，在空白和数字处分割文本，但保留前导空格。在同一语料库上，将它的词表与 GPT-2 正则表达式方法进行比较。
3. **困难：** 添加一个聊天模板方法，接收 `{"role": ..., "content": ...}` 消息列表，并生成 Llama 3 聊天格式对应的正确词元序列。将它与 HuggingFace 实现进行对照测试。

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|------|----------------|----------------------|
| 字节级 BPE | “在字节上工作的分词器” | 基础词表由 256 个字节值构成的 BPE——能够处理任何输入而不产生未知词元 |
| 预分词 | “在 BPE 之前切分” | 在 BPE 之前按正则或规则切分文本，防止 BPE 跨词边界合并 |
| NFKC 规范化 | “Unicode 清理” | 先做规范分解，再进行兼容组合——“fi”连字变为“fi”，全角“A”变为“A” |
| 聊天模板 | “消息如何变成词元” | 将角色/内容消息列表转换为扁平词元序列的确切格式——与模型相关，必须与训练格式一致 |
| 特殊词元 | “控制词元” | 绕过 BPE 的保留词元 ID——[BOS]、[EOS]、[PAD] 和聊天标记——在合并前精确匹配 |
| 词元膨胀率 | “每个单词的词元数” | 输出词元数与输入单词数的比值——GPT-4 的英文为 1.3，韩语为 2–3；数值越高，浪费的上下文越多 |
| tiktoken | “OpenAI 分词器” | 通过 Python 绑定提供接口的 Rust BPE 实现——比纯 Python 快 10–100 倍 |
| 合并表 | “词表” | 训练期间学习到的按顺序排列的字节对合并列表，代表分词器学到的知识 |

## 延伸阅读

- [OpenAI tiktoken 源码](https://github.com/openai/tiktoken)——用于 GPT-3.5/4 的 Rust BPE 实现
- [HuggingFace tokenizers](https://github.com/huggingface/tokenizers)——支持 BPE、WordPiece 和 Unigram 的 Rust 分词器库
- [Llama 3 论文（Meta，2024）](https://arxiv.org/abs/2407.21783)——介绍 128K 词表和分词器训练的细节
- [SentencePiece（Kudo 与 Richardson，2018）](https://arxiv.org/abs/1808.06226)——与语言无关的分词方法
- [GPT-2 分词器源码](https://github.com/openai/gpt-2/blob/master/src/encoder.py)——最初的字节到 Unicode 映射
