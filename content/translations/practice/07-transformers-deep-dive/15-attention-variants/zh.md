---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/07-transformers-deep-dive/15-attention-variants/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: cd5ba2d28dd24fc6eb57f4477148156d5d5be31a8e157efcdcf00b914a9dfb48
status: reviewed
---

# 注意力变体——滑动窗口、稀疏与差分注意力

> 完整注意力像一个圆：每个词元都能看到其他所有词元，内存则为此付出代价。四种变体改变了这个圆的形状，收回一半成本。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 7 第 02 课（自注意力）、Phase 7 第 03 课（多头注意力）、Phase 7 第 12 课（KV 缓存 / Flash Attention）  
**预计时间：** 约 60 分钟

## 问题

完整注意力关于序列长度的内存与计算复杂度都是 `O(N²)`。对于上下文长度为 128K 的 Llama 3 70B，每一层就有 160 亿个注意力项，而模型共有 80 层。Flash Attention（第 12 课）隐藏了 `O(N²)` 的激活内存，但没有改变算术成本——每个词元仍然要关注其他所有词元。

以下三类变体直接改变注意力矩阵的拓扑：

1. **滑动窗口注意力（SWA）。** 每个词元只关注固定窗口内的相邻词元，而不是完整前缀。内存和计算量降为 `O(N · W)`，其中 `W` 是窗口大小。代表模型包括 Gemma 2/3、Mistral 7B 的前几层和 Phi-3-Long。
2. **稀疏 / 分块注意力。** 只对选中的 `(i, j)` 对计算分数，其余权重强制为零。代表方法包括 Longformer、BigBird 和 OpenAI 稀疏 Transformer。
3. **差分注意力。** 使用各自独立的 Q/K 投影计算两个注意力图，再用一个减去另一个。它可以消除把权重泄漏到最前面几个词元的“注意力汇点”。代表方法是微软的 DIFF Transformer（2024）。

这些方法可以共存。一个 2026 年的前沿模型经常混合使用它们：大多数层采用 SWA-1024，每五层设置一层全局完整注意力，再加入少量差分注意力头来清理检索噪声。Gemma 3 的 5:1 SWA 与全局注意力比例，是目前教科书式的默认配置。

## 概念 <!-- learning-atlas: the-concept -->

### 滑动窗口注意力（SWA）

位置 `i` 的查询只关注 `[i - W, i]`（因果 SWA）或 `[i - W/2, i + W/2]`（双向）中的位置。窗口外的词元在分数矩阵中被赋值为 `-inf`。

```
完整因果注意力：       滑动窗口（W=4）：
位置 0-7              位置 0-7，W=4
    0 1 2 3 4 5 6 7        0 1 2 3 4 5 6 7
0 | x                0 |  x
1 | x x              1 |  x x
2 | x x x            2 |  x x x
3 | x x x x          3 |  x x x x
4 | x x x x x        4 |    x x x x
5 | x x x x x x      5 |      x x x x
6 | x x x x x x x    6 |        x x x x
7 | x x x x x x x x  7 |          x x x x
```

当 `N = 8192`、`W = 1024` 时，分数矩阵预期有 1024 × 8192 个非零项——减少 8 倍。

**SWA 会缩小 KV 缓存。** 每一层只需保留最后 `W` 个词元的 K 与 V。采用类似 Gemma 3 的配置（窗口 1024、上下文 128K）时，KV 缓存可缩小 128 倍。

**质量代价。** 只使用 SWA 的 Transformer 不擅长长距离检索。修复方法是在 SWA 层之间穿插完整注意力层。Gemma 3 使用 5:1 的 SWA:全局比例。Mistral 7B 使用因果 SWA 堆栈，信息通过重叠窗口“向前流动”——每一层都会把有效感受野扩大 `W`，经过 `L` 层后，模型可以关注到前方 `L × W` 个词元。

### 稀疏 / 分块注意力

预先选择一种 `N × N` 稀疏模式。三种经典形状如下：

- **局部 + 跨步（OpenAI 稀疏 Transformer）。** 关注最近 `W` 个词元，以及更早位置中每隔 `stride` 个词元的一个位置。以 `O(N · sqrt(N))` 的计算量同时捕获局部和长距离信息。
- **Longformer / BigBird。** 局部窗口 + 少量全局词元（例如 `[CLS]`）。全局词元既关注所有词元，也被所有词元关注，此外再加入随机稀疏连接。在质量相同时，实验上可把上下文扩大 2 倍。
- **原生稀疏注意力（DeepSeek，2025）。** 学习哪些 `(Q, K)` 分块重要，在内核层跳过全零分块，并与 FlashAttention 兼容。

稀疏注意力本质上是一个内核工程问题。数学很简单（对分数矩阵加掩码），真正的收益来自根本不把零值项加载进 SRAM。FlashAttention-3 和 2026 年的 FlexAttention API 已让自定义稀疏模式成为 PyTorch 的一等公民。

### 差分注意力（DIFF Transformer，2024）

常规注意力存在“注意力汇点”问题：softmax 强制每一行的和为 1，因此没有明确关注目标的词元会把权重倾倒在第一个词元或最前面几个词元上。这会挤占原本应该分配给真实内容的容量。

差分注意力通过计算**两个**注意力图并相减来解决这个问题：

```
A1 = softmax(Q1 K1^T / √d)
A2 = softmax(Q2 K2^T / √d)
DiffAttn = (A1 - λ · A2) V
```

其中 `λ` 是可学习标量，通常为 0.5～0.8。A1 捕获真实内容权重，A2 捕获汇点。相减会抵消汇点，把权重重新分配给相关词元。

微软 2024 年报告的结果是：困惑度降低 5%～10%，在训练长度相同时有效上下文增长 1.5～2 倍，大海捞针检索也更敏锐。

### 变体比较

| 变体 | 计算量 | KV 缓存 | 相对完整注意力的质量 | 生产应用 |
|------|--------|---------|------------------------|----------|
| 完整注意力 | O(N²) | 每层 O(N) | 基线 | 所有模型的默认层 |
| SWA（窗口 1024） | O(N·W) | 每层 O(W) | 困惑度差 0.1，与全局层搭配时效果好 | Gemma 2/3、Phi-3-Long |
| 局部 + 跨步稀疏 | O(N·√N) | 混合 | 与 SWA 相近 | OpenAI 稀疏 Transformer、Longformer |
| BigBird（局部 + 全局 + 随机） | 近似 O(N) | 混合 | 上下文扩大 2 倍时可追平完整注意力 | 早期长上下文 BERT |
| 原生稀疏（DeepSeek-V3.2） | O(N · 活跃比例) | O(N) | 困惑度差距在 0.05 以内 | DeepSeek-V3.2，2025 |
| 差分注意力 | O(2·N²) | O(2N) | 困惑度降低 5%～10% | DIFF Transformer、2026 年初期模型 |

```figure
gqa-kv-sharing
```

## 动手构建

参见 `code/main.py`。我们会实现一个因果掩码比较器，在一段玩具序列上并排展示完整注意力、SWA、局部 + 跨步注意力和差分注意力。

### 第 1 步：完整因果掩码（基线）

```python
def causal_mask(n):
    return [[0.0 if j <= i else float("-inf") for j in range(n)] for i in range(n)]
```

这是第 07 课中的基线。掩码是下三角矩阵；主对角线上方的权重为零。

### 第 2 步：滑动窗口因果掩码

```python
def swa_mask(n, window):
    M = [[float("-inf")] * n for _ in range(n)]
    for i in range(n):
        lo = max(0, i - window + 1)
        for j in range(lo, i + 1):
            M[i][j] = 0.0
    return M
```

只有一个参数：`window`。当 `window >= n` 时，会恢复完整因果注意力；当 `window = 1` 时，每个词元只关注自己。

### 第 3 步：局部 + 跨步稀疏掩码

```python
def strided_mask(n, window, stride):
    M = [[float("-inf")] * n for _ in range(n)]
    for i in range(n):
        lo = max(0, i - window + 1)
        for j in range(lo, i + 1):
            M[i][j] = 0.0
        for j in range(0, i + 1, stride):
            M[i][j] = 0.0
    return M
```

使用稠密的局部窗口，并从序列起点开始每隔 `stride` 个词元再关注一个位置。随着层数增加，感受野会以对数步数增长。

### 第 4 步：差分注意力

```python
def diff_attention(Q1, K1, Q2, K2, V, lam):
    A1 = softmax_causal(Q1 @ K1.T / sqrt_d)
    A2 = softmax_causal(Q2 @ K2.T / sqrt_d)
    return (A1 - lam * A2) @ V
```

执行两次注意力，再使用可学习混合系数做减法。代码会比较单一注意力与差分注意力的注意力汇点热图，并观察汇点如何消失。

### 第 5 步：KV 缓存大小

对 `N = 131072` 打印每种变体的逐层缓存大小。SWA 和稀疏变体会缩小 10～100 倍，差分注意力则会翻倍。请有意识地承担内存成本。

## 使用方法

2026 年的生产模式：

```python
from transformers import AutoModelForCausalLM
# Gemma 3 mixes SWA (window=1024) and global layers at 5:1.
model = AutoModelForCausalLM.from_pretrained("google/gemma-3-27b-it")
# print(model.config.sliding_window, model.config.layer_types)
```

PyTorch 2.5+ 中的 FlexAttention 接受一个掩码函数：

```python
from torch.nn.attention.flex_attention import flex_attention, create_block_mask

def swa_pattern(b, h, q_idx, kv_idx):
    return (q_idx - kv_idx < 1024) & (q_idx >= kv_idx)

mask = create_block_mask(swa_pattern, B=batch, H=heads, Q_LEN=n, KV_LEN=n)
out = flex_attention(q, k, v, block_mask=mask)
```

它会被编译成自定义 Triton 内核。对常见模式，速度可控制在比 FlashAttention-3 慢 10% 以内，而掩码函数只是一个 Python 可调用对象。

**各方案的选择时机：**

- **纯完整注意力**——上下文不超过约 16K 时每层都可使用；检索质量最重要时也应选择它。
- **SWA + 全局混合**——长上下文（>32K），且训练和推理受内存限制。它是 2026 年超过 32K 上下文时的默认方案。
- **稀疏分块注意力**——需要自定义内核和模式。通常保留给专门工作负载（检索、音频）。
- **差分注意力**——适用于注意力汇点污染会损害结果的工作负载（长上下文 RAG、大海捞针测试）。

## 交付成果

参见 `outputs/skill-attention-variant-picker.md`。这个技能会根据目标上下文长度、检索要求以及训练 / 推理计算特征，为新模型选择注意力拓扑。

## 练习

1. **简单。** 运行 `code/main.py`。验证 `window=4` 的 SWA 会把每行最后 4 个词元之外的全部位置置零；验证 `window=n` 可以逐位复现完整因果注意力。
2. **中等。** 在第 07 课综合项目的基础上实现 `window=1024` 的因果 SWA。在 tinyshakespeare 上训练 1,000 步。验证损失相对于完整注意力退化了多少？峰值内存下降了多少？
3. **困难。** 在综合项目模型中实现 Gemma 3 风格的 5:1 层混合（5 层 SWA、1 层全局）。在参数量相同时，与纯 SWA 和纯全局基线比较损失、内存和生成质量。
4. **困难。** 实现每个头拥有可学习 `λ` 的差分注意力。在合成检索任务（一个目标、2,000 个干扰项）上训练。与参数量相同的单一注意力基线比较检索准确率。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| 滑动窗口注意力（SWA） | “局部注意力” | 每个查询只关注最近 `W` 个词元；KV 缓存缩小到 `O(W)`。 |
| 有效感受野 | “模型能向前看多远” | 在窗口为 `W` 的 `L` 层 SWA 堆栈中，最多可看到前方 `L × W` 个词元。 |
| Longformer / BigBird | “局部 + 全局 + 随机” | 带少量始终关注全局的词元的稀疏模式；早期长上下文方案。 |
| 原生稀疏注意力 | “DeepSeek 的内核技巧” | 学习块级稀疏性；在内核层跳过全零块，同时保持质量。 |
| 差分注意力 | “两个图，用一个减另一个” | DIFF Transformer：从第一张注意力图中减去可学习 `λ` 乘以第二张图，以抵消注意力汇点。 |
| 注意力汇点 | “权重泄漏到词元 0” | Softmax 归一化强制每行之和为 1；没有信息的查询会把权重倾倒在位置 0。 |
| FlexAttention | “用 Python 写掩码” | PyTorch 2.5+ API，把任意掩码函数编译成具有 FlashAttention 形态的内核。 |
| 层类型混合 | “5:1 的 SWA 与全局注意力” | 在堆栈中交错放置稀疏与完整注意力层，以更低内存保持质量。 |

## 延伸阅读

- [Beltagy、Peters、Cohan（2020），《Longformer: The Long-Document Transformer》](https://arxiv.org/abs/2004.05150)——经典的滑动窗口 + 全局词元论文。
- [Zaheer 等（2020），《Big Bird: Transformers for Longer Sequences》](https://arxiv.org/abs/2007.14062)——局部 + 全局 + 随机。
- [Child 等（2019），《Generating Long Sequences with Sparse Transformers》](https://arxiv.org/abs/1904.10509)——OpenAI 的局部 + 跨步模式。
- [Gemma Team（2024），《Gemma 2: Improving Open Language Models at a Practical Size》](https://arxiv.org/abs/2408.00118)——1:1 的 SWA:全局混合。
- [Gemma Team（2025），《Gemma 3 technical report》](https://arxiv.org/abs/2503.19786)——已成为教科书式默认配置的 5:1 混合与 window=1024。
- [Ye 等（2024），《Differential Transformer》](https://arxiv.org/abs/2410.05258)——DIFF Transformer 论文。
- [Yuan 等（2025），《Native Sparse Attention》](https://arxiv.org/abs/2502.11089)——DeepSeek-V3.2 的可学习稀疏注意力。
- [PyTorch——FlexAttention 博客与文档](https://pytorch.org/blog/flexattention/)——“使用方法”中掩码即可调用对象模式的 API 参考。
