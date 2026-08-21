---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/05-nlp-foundations-to-advanced/08-cnns-rnns-for-text/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: de300997238be53f17d753a27aa36e25db7a9954981e6d15db2ecaa9626ccd58
status: reviewed
---

# 用于文本的 CNN 与 RNN

> 卷积学习 n-gram，循环保存记忆。注意力取代了二者，但受限硬件上仍需要它们。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 3 第 11 课（PyTorch 入门）、Phase 5 第 03 课（词嵌入）、Phase 4 第 02 课（从零实现卷积）  
**预计时间：** 约 75 分钟

## 问题

TF-IDF 与 Word2Vec 产生忽略词序的扁平向量。基于它们的分类器无法区分 `dog bites man` 与 `man bites dog`，而词序有时正是信号来源。

Transformer 出现之前，两类架构填补了这个缺口。

**文本卷积网络（TextCNN）。** 在词嵌入序列上执行一维卷积。宽度为 3 的滤波器就是可学习的三元语法检测器，它跨越三个词并输出分数。叠加不同宽度（2、3、4、5）以检测多尺度模式，再通过最大池化得到固定长度表示。结构扁平、可以并行、速度快。

**循环网络（RNN、LSTM、GRU）。** 每次处理一个词元，维护向前传递信息的隐藏状态。它按顺序执行、带有记忆，也能处理可变长度输入。2014 至 2017 年，循环网络主导序列建模，之后注意力登场。

本课实现两类模型，并指出促成注意力机制的失效方式。

## 概念

**TextCNN**（Kim，2014）。先嵌入词元，再让宽度为 `k` 的一维卷积滤波器滑过连续 `k` 元词嵌入，产生特征图。对特征图执行全局最大池化，选出最强激活。把多个滤波宽度的最大池化结果拼接，再输入分类头。

这种方法有效，是因为每个滤波器都是可学习的 n-gram。最大池化不依赖位置，因此“not good”位于评论开头或中部时都会触发相同特征。三种滤波宽度各配 100 个滤波器，就得到 300 个学到的 n-gram 检测器。训练可以并行，没有顺序依赖。

**RNN。** 在时间步 `t`，隐藏状态为 `h_t = f(W * x_t + U * h_{t-1} + b)`。所有时间步共享 `W`、`U`、`b`。时间步 `T` 的隐藏状态概括整个前缀。执行分类时，对 `h_1 ... h_T` 做最大、平均或末状态池化。

普通 RNN 存在梯度消失。**LSTM** 加入门控，决定遗忘什么、存储什么、输出什么，使梯度能稳定穿过长序列。**GRU** 把 LSTM 简化为两个门，参数更少，效果相近。

**双向 RNN** 让一个 RNN 正向运行，另一个反向运行，再拼接两边的隐藏状态。每个词元的表示都能看到左右上下文，序列标注任务离不开它。

```figure
rnn-unroll
```

## 动手实现

### 步骤 1：用 PyTorch 实现 TextCNN

```python
import torch
import torch.nn as nn
import torch.nn.functional as F


class TextCNN(nn.Module):
    def __init__(self, vocab_size, embed_dim, n_classes, filter_widths=(2, 3, 4), n_filters=64, dropout=0.3):
        super().__init__()
        self.embed = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        self.convs = nn.ModuleList([
            nn.Conv1d(embed_dim, n_filters, kernel_size=k)
            for k in filter_widths
        ])
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(n_filters * len(filter_widths), n_classes)

    def forward(self, token_ids):
        x = self.embed(token_ids).transpose(1, 2)
        pooled = []
        for conv in self.convs:
            c = F.relu(conv(x))
            p = F.max_pool1d(c, c.size(2)).squeeze(2)
            pooled.append(p)
        h = torch.cat(pooled, dim=1)
        return self.fc(self.dropout(h))
```

`transpose(1, 2)` 把 `[batch, seq_len, embed_dim]` 改成 `[batch, embed_dim, seq_len]`，因为 `nn.Conv1d` 把中间轴视为通道。无论输入多长，池化输出都有固定大小。

### 步骤 2：LSTM 分类器

```python
class LSTMClassifier(nn.Module):
    def __init__(self, vocab_size, embed_dim, hidden_dim, n_classes, bidirectional=True, dropout=0.3):
        super().__init__()
        self.embed = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        self.lstm = nn.LSTM(embed_dim, hidden_dim, batch_first=True, bidirectional=bidirectional)
        factor = 2 if bidirectional else 1
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(hidden_dim * factor, n_classes)

    def forward(self, token_ids):
        x = self.embed(token_ids)
        out, _ = self.lstm(x)
        pooled = out.max(dim=1).values
        return self.fc(self.dropout(pooled))
```

这里在序列上使用最大池化，而不是末状态池化。执行分类时，最大池化通常胜过只取最后隐藏状态，因为长序列末端的信息容易支配末状态。

### 步骤 3：梯度消失演示（直觉）

不带门控的普通 RNN 无法学习长程依赖。考虑一个玩具任务：判断词元 `A` 是否出现在序列任何位置。若 `A` 位于位置 1，而序列长 100 个词元，损失梯度必须反向穿过循环权重的 99 次乘法。权重小于 1 时梯度消失，大于 1 时则爆炸。

```python
def vanishing_gradient_sim(seq_len, recurrent_weight=0.9):
    import math
    return math.pow(recurrent_weight, seq_len)


# At weight=0.9 over 100 steps:
#   0.9 ^ 100 ≈ 2.7e-5
# The gradient from step 100 to step 1 is effectively zero.
```

LSTM 使用只含加性相互作用的**细胞状态（cell state）**穿过网络来缓解问题。遗忘门会以乘法缩放它，但梯度仍能沿这条“高速公路”流动。GRU 用更少参数完成相似操作。二者都能在超过 100 个时间步的序列上稳定训练。

### 步骤 4：为何仍然不够

即使使用 LSTM，仍有三个问题。

1. **顺序瓶颈。** 在长度为 1000 的序列上训练 RNN，需要串行完成 1000 个前向与反向步骤，无法沿时间并行。
2. **编码器与解码器设置中的固定长度上下文向量。** 解码器只看到编码器最终隐藏状态，其中压缩了整个输入；长输入会丢失细节。第 09 课直接讲解这个问题。
3. **远距离依赖的准确率上限。** LSTM 胜过普通 RNN，但仍难以让特定信息跨越 200 多个时间步传播。

注意力解决了全部三个问题，Transformer 则彻底删除了循环。第 10 课将完成这一转折。

## 使用现成工具

PyTorch 的 `nn.LSTM`、`nn.GRU` 和 `nn.Conv1d` 已达到生产可用水平，训练代码遵循标准流程。

Hugging Face 提供可接到输入层的预训练嵌入：

```python
from transformers import AutoModel

encoder = AutoModel.from_pretrained("bert-base-uncased")
for param in encoder.parameters():
    param.requires_grad = False


class BertCNN(nn.Module):
    def __init__(self, n_classes, filter_widths=(2, 3, 4), n_filters=64):
        super().__init__()
        self.encoder = encoder
        self.convs = nn.ModuleList([nn.Conv1d(768, n_filters, kernel_size=k) for k in filter_widths])
        self.fc = nn.Linear(n_filters * len(filter_widths), n_classes)

    def forward(self, input_ids, attention_mask):
        with torch.no_grad():
            out = self.encoder(input_ids=input_ids, attention_mask=attention_mask).last_hidden_state
        x = out.transpose(1, 2)
        pooled = [F.max_pool1d(F.relu(conv(x)), kernel_size=conv(x).size(2)).squeeze(2) for conv in self.convs]
        return self.fc(torch.cat(pooled, dim=1))
```

判断是否符合约束的清单：

- **边缘或端侧推理。** 带 GloVe 嵌入的 TextCNN 比 Transformer 小 10 至 100 倍。若目标设备是手机，可以选择这套技术栈。
- **流式或在线分类。** RNN 每次处理一个词元，Transformer 则需要完整序列。实时到达的文本仍适合 LSTM。
- **用小模型建立基线。** 新任务可以快速迭代，在 CPU 上用 5 分钟训练一个 TextCNN。
- **标注数据有限的序列标注。** 对 1000 至 10000 个标注句子，BiLSTM-CRF（第 06 课）仍是生产级 NER 架构。

其他情况应使用 Transformer。

## 交付成果

保存为 `outputs/prompt-text-encoder-picker.md`：

```markdown
---
name: text-encoder-picker
description: Pick a text encoder architecture for a given constraint set.
phase: 5
lesson: 08
---

Given constraints (task, data volume, latency budget, deploy target, compute budget), output:

1. Encoder architecture: TextCNN, BiLSTM, BiLSTM-CRF, transformer fine-tune, or "use a pretrained transformer as a frozen encoder + small head".
2. Embedding input: random init, GloVe / fastText frozen, or contextualized transformer embeddings.
3. Training recipe in 5 lines: optimizer, learning rate, batch size, epochs, regularization.
4. One monitoring signal. For RNN/CNN models: attention mechanism absence means they miss long-range deps; check per-length accuracy. For transformers: fine-tuning collapse if LR too high; check train loss.

Refuse to recommend fine-tuning a transformer when data is under ~500 labeled examples without showing that a TextCNN / BiLSTM baseline has plateaued. Flag edge deployment as needing architecture-before-everything.
```

## 练习

1. **简单。** 在你自行构造的三分类玩具数据集上训练 TextCNN，验证滤波宽度 `(2, 3, 4)` 的平均 F1 高于只使用宽度 3。
2. **中等。** 为 LSTM 分类器实现最大池化、平均池化和末状态池化。在小型数据集上比较，记录哪种池化胜出并推测原因。
3. **困难。** 结合第 06 课与本课，构建 BiLSTM-CRF NER 标注器，在 CoNLL-2003 上训练。与第 06 课的纯 CRF 基线和 BERT 微调比较，报告训练时间、内存与 F1。

## 关键术语

| 术语 | 常见说法 | 准确含义 |
|------|----------|----------|
| TextCNN | 文本 CNN | 词嵌入上的多层一维卷积配合全局最大池化，来自 Kim（2014）。 |
| RNN | 循环网络 | 每个时间步更新隐藏状态：`h_t = f(W x_t + U h_{t-1})`。 |
| LSTM | 带门控的 RNN | 加入输入门、遗忘门、输出门与细胞状态，可稳定训练长序列。 |
| GRU | 更简单的 LSTM | 使用两个门而不是三个，准确率相近，参数更少。 |
| 双向（bidirectional） | 两个方向 | 拼接正向与反向 RNN，让每个词元都看到两侧上下文。 |
| 梯度消失（vanishing gradient） | 训练信号消失 | 普通 RNN 反复乘以小于 1 的权重，使早期时间步的梯度接近零。 |

## 延伸阅读

- [Kim, Y. (2014). Convolutional Neural Networks for Sentence Classification](https://arxiv.org/abs/1408.5882)：TextCNN 论文，八页，易读。
- [Hochreiter, S. and Schmidhuber, J. (1997). Long Short-Term Memory](https://www.bioinf.jku.at/publications/older/2604.pdf)：LSTM 论文，清晰程度出人意料。
- [Olah, C. (2015). Understanding LSTM Networks](https://colah.github.io/posts/2015-08-Understanding-LSTMs/)：让所有人都能理解 LSTM 的经典图解。
