---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/05-nlp-foundations-to-advanced/19-subword-tokenization/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 6d67e864430ef41e47f3c0e115faead61da03cad377dca5a69f77513afc8f3eb
status: reviewed
---

# 子词分词：BPE、WordPiece、Unigram、SentencePiece

> 词级分词器无法处理未见词，字符级分词器会让序列过长，子词分词器在两者之间取得平衡。每个现代 LLM 都配有一种子词分词器。

**类型：** 学习  
**学习实现：** Python  
**前置课程：** Phase 5 第 01 课（文本处理）、Phase 5 第 04 课（GloVe、FastText、子词）  
**预计时间：** 约 60 分钟

## 问题

你的词表包含 50,000 个词。用户输入“untokenizable”，分词器却返回 `[UNK]`，模型因而得不到这个词的任何信息。更糟的是，语料库中处于第 90 百分位的文档含有 40 个罕见词，相当于每份文档丢失 40 比特信息。

子词分词解决了这个问题。常见词保持为单个词元，罕见词则分解成有意义的片段：`untokenizable` → `un`、`token`、`izable`。任何字符串最终都能表示为字节序列，因此训练数据可以覆盖所有输入。

2026 年，每个前沿 LLM 都采用三种算法之一（BPE、Unigram、WordPiece），并由三种库之一封装（tiktoken、SentencePiece、HF Tokenizers）。发布语言模型之前必须选定一种方案。

## 概念

![逐字符比较 BPE、Unigram 与 WordPiece](../assets/subword-tokenization.svg)

**BPE（Byte-Pair Encoding，字节对编码）。** 从字符级词表开始，统计每一对相邻字符，把最常见的字符对合并成新词元，重复操作直到达到目标词表大小。它是主流算法，GPT-2/3/4、Llama、Gemma、Qwen2 和 Mistral 都采用 BPE。

**字节级 BPE（byte-level BPE）。** 算法相同，但基础单元是原始字节（256 个基础词元），不是 Unicode 字符。因此任何字节序列都可以编码，保证不会产生 `[UNK]`。GPT-2 使用 50,257 个词元，即 256 个字节、50,000 次合并和 1 个特殊词元。

**Unigram。** 从大型词表开始，为每个词元分配一元概率，再迭代删除对语料对数似然增幅最小的词元。推理时具有概率性，可以采样不同分词结果，借助子词正则化进行数据增强。T5、mBART、ALBERT、XLNet 和 Gemma 都使用它。

**WordPiece。** 合并能最大化训练语料似然的字符对，而不是原始频率最高的字符对。BERT、DistilBERT 和 ELECTRA 使用 WordPiece。

**SentencePiece 与 tiktoken。** SentencePiece 可以直接在原始 Unicode 文本上训练 BPE 或 Unigram 词表，并把空白编码为 `▁`。tiktoken 是针对预构建词表的 OpenAI 高速编码器，不能训练词表。

经验规则：

- **训练新词表：** 使用 SentencePiece（适合多语言且无需预分词）或 HF Tokenizers。
- **使用 GPT 词表高速推理：** 使用 tiktoken（cl100k_base、o200k_base）。
- **训练和服务都需要：** 使用 HF Tokenizers，一个库同时完成两项工作。

```figure
bpe-merge
```

## 动手实现

### 步骤 1：从零实现 BPE <!-- learning-atlas: step-1-bpe-from-scratch -->

完整实现见 `code/main.py`。核心循环如下：

```python
def train_bpe(corpus, num_merges):
    vocab = {tuple(word) + ("</w>",): count for word, count in corpus.items()}
    merges = []
    for _ in range(num_merges):
        pairs = Counter()
        for symbols, freq in vocab.items():
            for a, b in zip(symbols, symbols[1:]):
                pairs[(a, b)] += freq
        if not pairs:
            break
        best = pairs.most_common(1)[0][0]
        merges.append(best)
        vocab = apply_merge(vocab, best)
    return merges
```

算法体现了三个事实。`</w>` 标记词尾，使后缀“low”和前缀“lower”保持区别。频率加权让高频字符对优先胜出。合并列表有固定顺序，推理时必须按训练顺序执行合并。

### 步骤 2：使用学到的合并规则编码

```python
def encode_bpe(word, merges):
    symbols = list(word) + ["</w>"]
    for a, b in merges:
        i = 0
        while i < len(symbols) - 1:
            if symbols[i] == a and symbols[i + 1] == b:
                symbols = symbols[:i] + [a + b] + symbols[i + 2:]
            else:
                i += 1
    return symbols
```

朴素实现的复杂度为 O(n·|merges|)。生产实现（tiktoken、HF Tokenizers）使用带优先队列的合并等级查询，运行时间接近线性。

### 步骤 3：实际使用 SentencePiece

```python
import sentencepiece as spm

spm.SentencePieceTrainer.train(
    input="corpus.txt",
    model_prefix="my_tokenizer",
    vocab_size=8000,
    model_type="bpe",          # or "unigram"
    character_coverage=0.9995, # lower for CJK (e.g. 0.9995 for English, 0.995 for Japanese)
    normalization_rule_name="nmt_nfkc",
)

sp = spm.SentencePieceProcessor(model_file="my_tokenizer.model")
print(sp.encode("untokenizable", out_type=str))
# ['▁un', 'token', 'izable']
```

注意：无需预分词，空格编码为 `▁`；`character_coverage` 控制保留罕见字符的强度，未保留的字符会映射到 `<unk>`。

### 步骤 4：为 OpenAI 兼容词表使用 tiktoken

```python
import tiktoken
enc = tiktoken.get_encoding("o200k_base")
print(enc.encode("untokenizable"))        # [127340, 101028]
print(len(enc.encode("Hello, world!")))   # 4
```

它只负责编码，采用 Rust 后端，速度很快。它能精确复现 GPT-4/5 分词，可用于字节计数、成本估算和上下文窗口预算。

## 2026 年仍会进入生产的陷阱

- **分词器漂移（tokenizer drift）。** 训练使用词表 A，部署却使用词表 B。词元 ID 不同会让模型输出乱码。应在 CI 中检查 `tokenizer.json` 的哈希。
- **空白歧义。** BPE 会把“hello”与“ hello”编码成不同词元。务必明确设置 `add_special_tokens` 与 `add_prefix_space`。
- **多语言训练不足。** 以英语为主的语料会把非拉丁文字拆成多 5 至 10 倍的词元。在 GPT-3.5 上，同一提示的日语或阿拉伯语成本会高 5 至 10 倍。o200k_base 已部分修复这一问题。
- **Emoji 拆分。** 一个 Emoji 可能占用 5 个词元。规划上下文预算时要专门检查 Emoji 的处理方式。

## 使用现成工具

2026 年的技术栈：

| 场景 | 选择 |
|------|------|
| 从头训练单语言模型 | HF Tokenizers（BPE） |
| 训练多语言模型 | SentencePiece（Unigram，`character_coverage=0.9995`） |
| 提供 OpenAI 兼容 API | tiktoken（GPT-4 及更新模型使用 `o200k_base`） |
| 领域专用词表（代码、数学、蛋白质） | 在领域语料上训练自定义 BPE，再与基础词表合并 |
| 边缘推理、小型模型 | Unigram（较小词表表现更好） |

词表大小是一项扩展决策，不是固定常数。粗略经验是：参数少于 10 亿时使用 32k，10 亿至 100 亿时使用 50k 至 100k，多语言或前沿模型使用 200k 以上。

## 交付成果

保存为 `outputs/skill-bpe-vs-wordpiece.md`：

```markdown
---
name: tokenizer-picker
description: Pick tokenizer algorithm, vocab size, library for a given corpus and deployment target.
version: 1.0.0
phase: 5
lesson: 19
tags: [nlp, tokenization]
---

Given a corpus (size, languages, domain) and deployment target (training from scratch / fine-tuning / API-compatible inference), output:

1. Algorithm. BPE, Unigram, or WordPiece. One-sentence reason.
2. Library. SentencePiece, HF Tokenizers, or tiktoken. Reason.
3. Vocab size. Rounded to nearest 1k. Reason tied to model size and language coverage.
4. Coverage settings. `character_coverage`, `byte_fallback`, special-token list.
5. Validation plan. Average tokens-per-word on held-out set, OOV rate, compression ratio, round-trip decode equality.

Refuse to train a character-coverage <0.995 tokenizer on corpora with rare-script content. Refuse to ship a vocab without a frozen `tokenizer.json` hash check in CI. Flag any monolingual tokenizer under 16k vocab as likely under-spec.
```

## 练习

1. **简单。** 在 `code/main.py` 的微型语料上训练执行 500 次合并的 BPE，并编码三个留出词。统计其中恰好产生 1 个词元和产生多个词元的词各有多少。
2. **中等。** 对 100 个英语维基百科句子，比较 `cl100k_base`、`o200k_base` 和你用 vocab=32k 训练的 SentencePiece BPE 所产生的词元数，报告各自的压缩率。
3. **困难。** 在同一语料上分别训练 BPE、Unigram 和 WordPiece。把它们用于小型情感分类器，测量下游准确率。分词器选择是否让 F1 相差超过 1 个百分点？

## 关键术语

| 术语 | 常见说法 | 准确含义 |
|------|----------|----------|
| BPE | 字节对编码 | 贪心合并频率最高的字符对，直到达到目标词表大小。 |
| 字节级 BPE（byte-level BPE） | 永远没有未知词元 | 在 256 个原始字节上执行 BPE，GPT-2 与 Llama 使用此方法。 |
| Unigram | 概率分词器 | 使用对数似然从大型候选集中逐步删减词元，T5 与 Gemma 使用此方法。 |
| SentencePiece | 处理空白的那一个 | 在原始文本上训练 BPE 或 Unigram 的库，空格编码为 `▁`。 |
| tiktoken | 速度快的那一个 | OpenAI 以 Rust 实现、面向预构建词表的 BPE 编码器，不能训练词表。 |
| 合并列表（merge list） | 神秘数字 | `(a, b) → ab` 组成的有序合并列表，推理时依次应用。 |
| 字符覆盖率（character coverage） | 多罕见才算太罕见 | 分词器必须覆盖的训练语料字符比例，典型值约为 0.9995。 |

## 延伸阅读

- [Sennrich、Haddow、Birch（2015），Neural Machine Translation of Rare Words with Subword Units](https://arxiv.org/abs/1508.07909)：BPE 论文。
- [Kudo（2018），Subword Regularization with Unigram Language Model](https://arxiv.org/abs/1804.10959)：Unigram 论文。
- [Kudo、Richardson（2018），SentencePiece: A simple and language independent subword tokenizer](https://arxiv.org/abs/1808.06226)：SentencePiece 论文。
- [Hugging Face：Summary of the tokenizers](https://huggingface.co/docs/transformers/tokenizer_summary)：简明参考资料。
- [OpenAI tiktoken 仓库](https://github.com/openai/tiktoken)：使用手册与编码列表。
