---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/07-transformers-deep-dive/03-multi-head-attention/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 143eb42fb1de2307cda1f2231b8d5cbb2144deced1dfd717a2c789edbf667f81
status: reviewed
---

# 多头注意力

> 一个注意力头一次学习一种关系，八个头就学习八种。头几乎是免费的，多用一些。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 7 第 02 课（从头实现自注意力）  
**预计时间：** 约 75 分钟

## 问题

单个自注意力头计算一个注意力矩阵。该矩阵只能捕获一种关系——通常是能让训练信号上的损失最小的关系。如果数据中混杂着主谓一致、共指、长距离语篇和句法分块，一个头会把它们涂抹到同一个 softmax 分布中，并丢掉一半信号。

2017 年 Vaswani 论文给出的修复方法是：并行运行多个注意力函数，每个函数拥有自己的 Q、K、V 投影，再拼接输出。每个头都在维度为 `d_model / n_heads` 的较小子空间中工作。总参数量不变，表达能力提升。

多头注意力是 2026 年每个 Transformer 的默认配置。唯一的争论是要用*多少个*头，以及键和值是否共享投影（分组查询注意力、多查询注意力、多头潜在注意力）。

## 概念

![多头注意力进行拆分、关注并拼接](../assets/multi-head-attention.svg)

**拆分。** 取形状为 `(N, d_model)` 的 `X`。将它投影为形状均为 `(N, d_model)` 的 Q、K、V。重塑为 `(N, n_heads, d_head)`，其中 `d_head = d_model / n_heads`，再转置成 `(n_heads, N, d_head)`。

**并行关注。** 在每个头内部运行缩放点积注意力。每个头产生 `(N, d_head)`。各个头在嵌入的不同子空间中工作，在注意力计算本身期间不会互相通信。

**拼接并投影。** 把各头重新堆叠为 `(N, d_model)`，再乘以形状为 `(d_model, d_model)` 的学习输出矩阵 `W_o`。`W_o` 是各头彼此混合的位置。

**为什么有效。** 每个头都能专门化，而无需与其他头争夺表示预算。2019–2024 年的探针研究发现了不同的头角色：位置头、关注前一个词元的头、复制头、命名实体头、归纳头（上下文学习的基础）。

**2026 年的变体谱系：**

| 变体 | Q 头数 | K/V 头数 | 使用者 |
|------|--------|----------|--------|
| 多头（MHA） | N | N | GPT-2、BERT、T5 |
| 多查询（MQA） | N | 1 | PaLM、Falcon |
| 分组查询（GQA） | N | G（如 N/8） | Llama 2 70B、Llama 3+、Qwen 2+、Mistral |
| 多头潜在（MLA） | N | 压缩到低秩空间 | DeepSeek-V2、V3 |

GQA 是现代默认选择，因为它把 KV 缓存内存缩小 `N/G` 倍，同时几乎保持完整质量。MLA 更进一步，把 K/V 压缩到潜在空间，并在计算时重新投影——代价是增加 FLOPs，换取更多内存节省。

```figure
multihead-split
```

## 动手实现

### 步骤 1：在已有单头注意力上拆分各头

取第 02 课的 `SelfAttention`，在外面包装拆分/拼接操作。NumPy 实现参见 `code/main.py`；逻辑如下：

```python
def split_heads(X, n_heads):
    n, d = X.shape
    d_head = d // n_heads
    return X.reshape(n, n_heads, d_head).transpose(1, 0, 2)  # (heads, n, d_head)

def combine_heads(H):
    h, n, d_head = H.shape
    return H.transpose(1, 0, 2).reshape(n, h * d_head)
```

一次重塑和一次转置，没有循环。这正是 PyTorch 在 `nn.MultiheadAttention` 底层所做的操作。

### 步骤 2：对每个头运行缩放点积注意力

每个头获得自己的 Q、K、V 切片。注意力变成一次批量矩阵乘法：

```python
def mha_forward(X, W_q, W_k, W_v, W_o, n_heads):
    Q = X @ W_q
    K = X @ W_k
    V = X @ W_v
    Qh = split_heads(Q, n_heads)         # (heads, n, d_head)
    Kh = split_heads(K, n_heads)
    Vh = split_heads(V, n_heads)
    scores = Qh @ Kh.transpose(0, 2, 1) / np.sqrt(Qh.shape[-1])
    weights = softmax(scores, axis=-1)
    out = weights @ Vh                    # (heads, n, d_head)
    concat = combine_heads(out)
    return concat @ W_o, weights
```

在真实硬件上，`Qh @ Kh.transpose(...)` 是一次 `bmm`。GPU 看到的是形状为 `(heads, N, d_head) × (heads, d_head, N) -> (heads, N, N)` 的单次批量矩阵乘法。增加头几乎是免费的。

### 步骤 3：分组查询注意力变体

只有键和值投影发生变化。Q 获得 `n_heads` 组；K 和 V 获得 `n_kv_heads < n_heads` 组，再重复到相同数量：

```python
def gqa_project(X, W, n_kv_heads, n_heads):
    kv = split_heads(X @ W, n_kv_heads)       # (kv_heads, n, d_head)
    repeat = n_heads // n_kv_heads
    return np.repeat(kv, repeat, axis=0)      # (n_heads, n, d_head)
```

推理时，只有 `n_kv_heads` 份数据存于 KV 缓存，而不是 `n_heads` 份，因此可节省内存。Llama 3 70B 使用 64 个查询头和 8 个 KV 头——缓存缩小 8 倍。

### 步骤 4：探测每个头学到了什么

使用 4 个头对短句运行 MHA。对每个头打印 `(N, N)` 注意力矩阵。即使随机初始化，也会看到不同头选择不同结构——其中一部分是信号，一部分是子空间的旋转对称性。

## 用于实践

在 PyTorch 中，一行即可实现：

```python
import torch.nn as nn

mha = nn.MultiheadAttention(embed_dim=512, num_heads=8, batch_first=True)
```

PyTorch 2.5+ 中的 GQA：

```python
from torch.nn.functional import scaled_dot_product_attention

# scaled_dot_product_attention auto-dispatches Flash Attention on CUDA.
# For GQA, pass Q of shape (B, n_heads, N, d_head) and K,V of shape
# (B, n_kv_heads, N, d_head). PyTorch handles the repeat.
out = scaled_dot_product_attention(q, k, v, is_causal=True, enable_gqa=True)
```

**该用多少个头？** 2026 年生产模型的经验法则：

| 模型大小 | d_model | n_heads | d_head |
|----------|---------|---------|--------|
| 小型（约 1.25 亿） | 768 | 12 | 64 |
| 基础（约 3.5 亿） | 1024 | 16 | 64 |
| 大型（约 10 亿） | 2048 | 16 | 128 |
| 前沿（约 700 亿） | 8192 | 64 | 128 |

`d_head` 几乎总是 64 或 128。它决定一个头能“看到”多少信息。低于 32 时，各头会开始受缩放因子 `sqrt(d_head)` 影响；高于 256 时，则失去“许多小型专家”的优势。

## 交付成果

参见 `outputs/skill-mha-configurator.md`。该技能根据参数预算、序列长度与部署目标，为新的 Transformer 推荐头数、KV 头数与投影策略。

## 练习

1. **简单。** 取 `code/main.py` 中的 MHA，在固定 `d_model=64` 时把 `n_heads` 从 1 改为 16。在合成复制任务上绘制微型单层模型的损失。更多头会带来帮助、趋于平台，还是造成伤害？
2. **中等。** 实现 MQA（所有查询头共享一个 KV 头）。测量与完整 MHA 相比参数量减少多少，并计算 N=2048 时推理 KV 缓存缩小多少。
3. **困难。** 实现微型多头潜在注意力：把 K、V 压缩为秩为 `r` 的潜变量，把潜变量存入 KV 缓存，并在注意时解压。`r` 取多少时，缓存内存能降到完整 MHA 的 1/8 以下，同时质量保持在验证困惑度 1 bit 以内？

## 关键术语

| 术语 | 人们通常怎么说 | 实际含义 |
|------|----------------|----------|
| 头（head） | “单个注意力电路” | 一个维度为 `d_head = d_model / n_heads` 的 Q/K/V 投影，拥有自己的注意力矩阵。 |
| d_head | “头维度” | 每个头的隐藏宽度；生产环境几乎总为 64 或 128。 |
| 拆分 / 组合 | “重塑技巧” | 注意力前后执行的 `(N, d_model) ↔ (n_heads, N, d_head)` 重塑 + 转置。 |
| W_o | “输出投影” | 拼接各头后应用的 `(d_model, d_model)` 矩阵；各头在这里混合。 |
| MQA | “一个 KV 头” | 多查询注意力：共享单个 K/V 投影。KV 缓存最小，但有一定质量损失。 |
| GQA | “Llama 2 后的默认方案” | `n_kv_heads < n_heads` 的分组查询注意力；通过重复匹配 Q。 |
| MLA | “DeepSeek 的技巧” | 多头潜在注意力：把 K、V 压缩到低秩潜变量，并在注意时解压。 |
| 归纳头（induction head） | “上下文学习背后的电路” | 一对检测先前出现位置并复制其后继内容的头。 |

## 延伸阅读

- [Vaswani 等（2017）. Attention Is All You Need §3.2.2](https://arxiv.org/abs/1706.03762)——最初的多头规范。
- [Shazeer（2019）. Fast Transformer Decoding: One Write-Head is All You Need](https://arxiv.org/abs/1911.02150)——MQA 论文。
- [Ainslie 等（2023）. GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints](https://arxiv.org/abs/2305.13245)——如何在训练后把 MHA 转换为 GQA。
- [DeepSeek-AI（2024）. DeepSeek-V2 Technical Report](https://arxiv.org/abs/2405.04434)——MLA 及其为何在缓存内存上优于 MHA/GQA。
- [Olsson 等（2022）. In-context Learning and Induction Heads](https://transformer-circuits.pub/2022/in-context-learning-and-induction-heads/index.html)——从机制角度观察各个头究竟在做什么。
