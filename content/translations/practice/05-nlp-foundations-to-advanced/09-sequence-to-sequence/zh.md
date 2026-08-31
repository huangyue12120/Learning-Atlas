---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/05-nlp-foundations-to-advanced/09-sequence-to-sequence/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 83d570d30ef505439edbbe90a16c984e6c5e552468ed53a54919b36d2dd43d49
status: reviewed
---

# 序列到序列模型

> 两个 RNN 假装成翻译器。它们撞上的瓶颈催生了注意力机制。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 5 第 08 课（用于文本的 CNN 与 RNN）、Phase 3 第 11 课（PyTorch 入门）  
**预计时间：** 约 75 分钟

## 问题

分类把可变长度序列映射成单个标签，翻译则把可变长度序列映射成另一个可变长度序列。输入与输出使用不同词表，甚至来自不同语言，长度也未必相等。

序列到序列（seq2seq）架构由 Sutskever、Vinyals 和 Le 在 2014 年提出，用一个刻意简单的方案攻克了这个问题：两个 RNN。一个读取源句并产生固定长度上下文向量，另一个读取该向量，逐词元生成目标句。它与第 08 课的代码相同，只是采用了不同组合方式。

这套架构值得学习，原因有两个。第一，上下文向量瓶颈是 NLP 中最适合教学的失败案例，它解释了注意力与 Transformer 要解决的一切。第二，教师强制、计划采样和推理时的束搜索等训练方法，至今仍适用于包括 LLM 在内的现代生成系统。

## 概念

**编码器。** 读取源句的 RNN。它的最终隐藏状态就是**上下文向量（context vector）**，即整个输入的固定长度摘要。理论上除了原始文本什么都不丢。

**解码器。** 另一个由上下文向量初始化的 RNN。每一步把前一个已生成词元作为输入，产生目标词表上的概率分布，通过采样或 argmax 选出下一词元，再把它送回模型。重复执行，直到产生 `<EOS>` 或达到最大长度。

**训练：** 在每个解码步骤计算交叉熵损失，再沿序列求和。通过时间反向传播，梯度穿过两个网络。

**教师强制（teacher forcing）。** 训练时，解码器在步骤 `t` 的输入是位置 `t-1` 的真实词元，而不是模型自己上一步的预测。它能稳定训练，否则早期错误会不断级联，模型无从学习。推理时只能使用模型自己的预测，因此训练与推理之间总有分布差距，称为**暴露偏差（exposure bias）**。

**瓶颈。** 编码器从源序列学到的一切都必须塞进一个上下文向量。长句会丢失细节，稀有词会变模糊，重新排序（`chat noir` 与 `black cat`）只能记忆，无法动态计算。

注意力（第 10 课）让解码器查看编码器的每个隐藏状态，而不只看最后一个，从而解决这个瓶颈。这正是它的核心主张。

```figure
lstm-gates
```

## 动手实现

### 步骤 1：编码器

```python
import torch
import torch.nn as nn


class Encoder(nn.Module):
    def __init__(self, src_vocab_size, embed_dim, hidden_dim):
        super().__init__()
        self.embed = nn.Embedding(src_vocab_size, embed_dim, padding_idx=0)
        self.gru = nn.GRU(embed_dim, hidden_dim, batch_first=True)

    def forward(self, src):
        e = self.embed(src)
        outputs, hidden = self.gru(e)
        return outputs, hidden
```

`outputs` 形状为 `[batch, seq_len, hidden_dim]`，每个输入位置对应一个隐藏状态。`hidden` 形状为 `[1, batch, hidden_dim]`，表示最后一步。第 08 课在分类时要求“对 outputs 池化”，此处则保留最后隐藏状态作为上下文向量，并忽略逐步输出。

### 步骤 2：解码器

```python
class Decoder(nn.Module):
    def __init__(self, tgt_vocab_size, embed_dim, hidden_dim):
        super().__init__()
        self.embed = nn.Embedding(tgt_vocab_size, embed_dim, padding_idx=0)
        self.gru = nn.GRU(embed_dim, hidden_dim, batch_first=True)
        self.fc = nn.Linear(hidden_dim, tgt_vocab_size)

    def forward(self, token, hidden):
        e = self.embed(token)
        out, hidden = self.gru(e, hidden)
        logits = self.fc(out)
        return logits, hidden
```

解码器每次调用只执行一步。输入是一批单词元和当前隐藏状态，输出下一词元的词表 logits 与更新后的隐藏状态。

### 步骤 3：带教师强制的训练循环 <!-- learning-atlas: step-3-training-loop-with-teacher-forcing -->

```python
def train_batch(encoder, decoder, src, tgt, bos_id, optimizer, teacher_forcing_ratio=0.9):
    optimizer.zero_grad()
    _, hidden = encoder(src)
    batch_size, tgt_len = tgt.shape
    input_token = torch.full((batch_size, 1), bos_id, dtype=torch.long)
    loss = 0.0
    loss_fn = nn.CrossEntropyLoss(ignore_index=0)

    for t in range(tgt_len):
        logits, hidden = decoder(input_token, hidden)
        step_loss = loss_fn(logits.squeeze(1), tgt[:, t])
        loss += step_loss
        use_teacher = torch.rand(1).item() < teacher_forcing_ratio
        if use_teacher:
            input_token = tgt[:, t].unsqueeze(1)
        else:
            input_token = logits.argmax(dim=-1)

    loss.backward()
    optimizer.step()
    return loss.item() / tgt_len
```

需要记住两个参数。`ignore_index=0` 跳过填充词元的损失。`teacher_forcing_ratio` 表示每一步使用真实词元而不是模型预测的概率。训练初期设为 1.0，即完全教师强制，再逐渐降到约 0.5，以缩小暴露偏差。

### 步骤 4：推理循环（贪心）

```python
@torch.no_grad()
def greedy_decode(encoder, decoder, src, bos_id, eos_id, max_len=50):
    _, hidden = encoder(src)
    batch_size = src.shape[0]
    input_token = torch.full((batch_size, 1), bos_id, dtype=torch.long)
    output_ids = []
    for _ in range(max_len):
        logits, hidden = decoder(input_token, hidden)
        next_token = logits.argmax(dim=-1)
        output_ids.append(next_token)
        input_token = next_token
        if (next_token == eos_id).all():
            break
    return torch.cat(output_ids, dim=1)
```

贪心解码每一步都选概率最高的词元，因此可能偏离正确路径：一旦选定某个词元，就无法撤回。**束搜索（beam search）**保留得分最高的 `k` 个部分序列，最终选出得分最高的完整序列。束宽通常取 3 至 5。

### 步骤 5：演示瓶颈

在玩具复制任务上训练模型：源序列为 `[a, b, c, d, e]`，目标序列同样为 `[a, b, c, d, e]`。逐步增加序列长度并观察准确率。

```text
seq_len=5   copy accuracy: 98%
seq_len=10  copy accuracy: 91%
seq_len=20  copy accuracy: 62%
seq_len=40  copy accuracy: 23%
```

单个 GRU 隐藏状态无法无损记住 40 词元输入。每个编码步骤都保存了信息，解码器却只能看到最后状态。注意力直接修复了这个问题。

## 使用现成工具

PyTorch 提供 `nn.Transformer` 和基于 `nn.LSTM` 的 seq2seq 模板。Hugging Face 的 `transformers` 库提供在数十亿词元上训练的完整编码器与解码器模型，包括 BART、T5、mBART 和 NLLB。

```python
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

tok = AutoTokenizer.from_pretrained("facebook/bart-base")
model = AutoModelForSeq2SeqLM.from_pretrained("facebook/bart-base")

src = tok("Translate this to French: Hello, how are you?", return_tensors="pt")
out = model.generate(**src, max_new_tokens=50, num_beams=4)
print(tok.decode(out[0], skip_special_tokens=True))
```

现代编码器与解码器用 Transformer 取代了 RNN。整体形态仍与 2014 年 seq2seq 论文一致：编码器、解码器、逐词元生成；每个模块内部机制已经改变。

### 何时仍选择基于 RNN 的 seq2seq

新项目几乎不会使用它，以下情况例外：

- 流式翻译，需要每次消费一个输入词元，并保持有界内存。
- 端侧文本生成，Transformer 的内存成本过高。
- 教学。理解编码器与解码器瓶颈，是理解 Transformer 为何胜出的最快路径。

### 暴露偏差及其缓解方法

- **计划采样（scheduled sampling）。** 训练期间逐渐降低教师强制比例，让模型学会从自身错误中恢复。
- **最小风险训练（minimum risk training）。** 使用句子级 BLEU，而不是词元级交叉熵来训练，更接近真正目标。
- **强化学习微调。** 用某个指标奖励序列生成器，现代 LLM 的 RLHF 也采用这种方式。

三种方法也都适用于基于 Transformer 的生成。

## 交付成果

保存为 `outputs/prompt-seq2seq-design.md`：

```markdown
---
name: seq2seq-design
description: Design a sequence-to-sequence pipeline for a given task.
phase: 5
lesson: 09
---

Given a task (translation, summarization, paraphrase, question rewrite), output:

1. Architecture. Pretrained transformer encoder-decoder (BART, T5, mBART, NLLB) is the default. RNN-based seq2seq only for specific constraints.
2. Starting checkpoint. Name it (`facebook/bart-base`, `google/flan-t5-base`, `facebook/nllb-200-distilled-600M`). Match the checkpoint to task and language coverage.
3. Decoding strategy. Greedy for deterministic output, beam search (width 4-5) for quality, sampling with temperature for diversity. One sentence justification.
4. One failure mode to verify before shipping. Exposure bias manifests as generation drift on longer outputs; sample 20 outputs at the 90th-percentile length and eyeball.

Refuse to recommend training a seq2seq from scratch for under a million parallel examples. Flag any pipeline that uses greedy decoding for user-facing content as fragile (greedy repeats and loops).
```

## 练习

1. **简单。** 实现玩具复制任务。在目标等于输入的词元对上训练 GRU seq2seq，测量长度为 5、10、20 时的准确率，复现瓶颈。
2. **中等。** 加入束宽为 3 的束搜索解码。在小型平行语料上与贪心解码比较 BLEU，记录束搜索在哪些位置胜出，通常是最后几个词元，以及哪些位置没有差别。
3. **困难。** 在包含一万对句子的复述数据集上微调 `facebook/bart-base`。在留出输入上，把微调模型的 beam-4 输出与基础模型比较，报告 BLEU 并选择 10 个定性示例。

## 关键术语

| 术语 | 常见说法 | 准确含义 |
|------|----------|----------|
| 编码器（encoder） | 输入 RNN | 读取源序列，产生逐步隐藏状态和最终上下文向量。 |
| 解码器（decoder） | 输出 RNN | 由上下文向量初始化，每次生成一个目标词元。 |
| 上下文向量（context vector） | 摘要 | 编码器最终隐藏状态，大小固定；注意力要解决的瓶颈。 |
| 教师强制（teacher forcing） | 使用真实词元 | 训练时输入上一个真实词元，使学习稳定。 |
| 暴露偏差（exposure bias） | 训练与测试差距 | 模型在真实词元上训练，从未练习如何从自己的错误预测中恢复。 |
| 束搜索（beam search） | 更好的解码 | 每一步保留前 `k` 个部分序列，而不是贪心提交单一选择。 |

## 延伸阅读

- [Sutskever, Vinyals, Le (2014). Sequence to Sequence Learning with Neural Networks](https://arxiv.org/abs/1409.3215)：原始 seq2seq 论文，四页。
- [Cho et al. (2014). Learning Phrase Representations using RNN Encoder-Decoder for Statistical Machine Translation](https://arxiv.org/abs/1406.1078)：提出 GRU 和编码器与解码器框架。
- [Bahdanau, Cho, Bengio (2014). Neural Machine Translation by Jointly Learning to Align and Translate](https://arxiv.org/abs/1409.0473)：注意力论文，建议学完本课立即阅读。
- [PyTorch NLP from Scratch 教程](https://pytorch.org/tutorials/intermediate/seq2seq_translation_tutorial.html)：可运行的 seq2seq 与注意力代码。
