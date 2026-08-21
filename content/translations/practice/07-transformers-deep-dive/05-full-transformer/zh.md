---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/07-transformers-deep-dive/05-full-transformer/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: cb33225ca1b2bbaf32a06d637343c22fbaaf3083081bcf04479409c53070a662
status: reviewed
---

# 完整 Transformer——编码器 + 解码器

> 注意力是主角。残差、归一化、前馈网络与交叉注意力等其他一切，都是让它能够深层堆叠的脚手架。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 7 第 02 课（自注意力）、Phase 7 第 03 课（多头注意力）、Phase 7 第 04 课（位置编码）  
**预计时间：** 约 75 分钟

## 问题

单个注意力层是特征提取器，不是模型。每层一次矩阵乘法不足以承载语言所需的容量。你需要深度——但没有正确的管道，深度会让网络崩溃。

2017 年 Vaswani 论文把六项设计决策组合起来，将一个注意力层变成可堆叠块。此后的每个 Transformer——仅编码器（BERT）、仅解码器（GPT）、编码器—解码器（T5）——都继承了相同骨架。到 2026 年，块的细节已经改进（RMSNorm、SwiGLU、pre-norm、RoPE），骨架仍完全相同。

本课讲解这副骨架。后续课程会将它专门化——第 06 课用于编码器，第 07 课用于解码器，第 08 课用于编码器—解码器。

## 概念

![连接完毕的编码器块与解码器块内部结构](../assets/full-transformer.svg)

### 六个部分

1. **嵌入 + 位置信号。** 词元 → 向量。通过 RoPE（现代）或正弦编码（经典）注入位置。
2. **自注意力。** 每个位置关注其他每个位置；在解码器中进行遮蔽。
3. **前馈网络（FFN）。** 逐位置的两层 MLP：`W_2 · activation(W_1 · x)`。默认扩展比例为 4×。
4. **残差连接。** `x + sublayer(x)`。没有它，梯度在超过约 6 层后会消失。
5. **层归一化。** `LayerNorm` 或 `RMSNorm`（现代）。稳定残差流。
6. **交叉注意力（仅解码器）。** 查询来自解码器，键和值来自编码器输出。

观察一个向量如何流过单个块：注意力在不同位置之间混合信息，残差把信息向前传递，FFN 对其做变换，归一化则保持流稳定。

```figure
transformer-block
```

### 编码器块（BERT、T5 编码器使用）

```text
x → LN → MHA(self) → + → LN → FFN → + → out
                     ^              ^
                     |              |
                     └── residual ──┘
```

编码器是双向的，没有遮蔽，所有位置都能看到所有位置。

### 解码器块（GPT、T5 解码器使用）

```text
x → LN → MHA(masked self) → + → LN → MHA(cross to encoder) → + → LN → FFN → + → out
```

解码器的每个块有三个子层。中间的交叉注意力是信息从编码器流向解码器的唯一位置。在纯解码器架构（GPT）中，会省略交叉注意力，只保留带遮蔽的自注意力 + FFN。

### Pre-norm 与 post-norm

原始论文比较了 `x + sublayer(LN(x))` 与 `LN(x + sublayer(x))`。Post-norm 在 2019 年左右失宠——如果没有谨慎的预热，它很难深层训练。Pre-norm（在子层*之前*执行 `LN`）是 2026 年默认方案：Llama、Qwen、GPT-3+、Mistral 都使用它。

### 2026 年现代化块

Vaswani 2017 使用 LayerNorm + ReLU，现代技术栈把二者都替换了。生产块的实际形态如下：

| 组件 | 2017 | 2026 |
|------|------|------|
| 归一化 | LayerNorm | RMSNorm |
| FFN 激活 | ReLU | SwiGLU |
| FFN 扩展 | 4× | 2.6×（SwiGLU 使用三个矩阵，总参数量相同） |
| 位置 | 绝对正弦 | RoPE |
| 注意力 | 完整 MHA | GQA（或 MLA） |
| 偏置项 | 有 | 无 |

RMSNorm 去掉 LayerNorm 的均值中心化（少一次减法），节省计算，并且经验上至少同样稳定。SwiGLU（`Swish(W1 x) ⊙ W3 x`）在 Llama、PaLM 和 Qwen 论文中始终比 ReLU/GELU FFN 的语言模型困惑度好约 0.5 点。

### 参数量

对于 `d_model = d`、FFN 扩展比例为 `r` 的单个块：

- MHA：`4 · d²`（Q、K、V、O 投影）
- FFN（SwiGLU）：`3 · d · (r · d)` ≈ `3rd²`
- 归一化：可忽略

当 `d = 4096, r = 2.6, layers = 32`（大致对应 Llama 3 8B）时，总计为：`32 · (4·4096² + 3·2.6·4096²) ≈ 32 · (16 + 32) M = ~1.5B parameters per layer × 32 ≈ 7B`（另加嵌入和输出头），与公开参数量相符。

## 动手实现

### 步骤 1：构建块

使用第 03 课中的微型 `Matrix` 类（复制到本文件中，使其可以独立运行）：

- `layer_norm(x, eps=1e-5)`——减去均值，再除以标准差。
- `rms_norm(x, eps=1e-6)`——除以 RMS，不减去均值。
- `gelu(x)` 与 `silu(x) * W3 x`（SwiGLU）。
- `ffn_swiglu(x, W1, W2, W3)`。
- `encoder_block(x, params)` 与 `decoder_block(x, enc_out, params)`。

完整连接方式参见 `code/main.py`。

### 步骤 2：连接两层编码器与两层解码器

将它们堆叠起来。把编码器输出传入每个解码器交叉注意力。在输出投影前加入最终 LN。

```python
def encode(tokens, params):
    x = embed(tokens, params.emb) + sinusoidal(len(tokens), params.d)
    for block in params.encoder_blocks:
        x = encoder_block(x, block)
    return x

def decode(target_tokens, encoder_out, params):
    x = embed(target_tokens, params.emb) + sinusoidal(len(target_tokens), params.d)
    for block in params.decoder_blocks:
        x = decoder_block(x, encoder_out, block)
    return x
```

### 步骤 3：在玩具样本上运行前向传播

输入 6 词元源序列和 5 词元目标序列，确认输出形状为 `(5, vocab)`。无需训练——本课关注架构，而非损失。

### 步骤 4：替换为 RMSNorm + SwiGLU

把 LayerNorm 与 ReLU-FFN 替换为 RMSNorm 与 SwiGLU，确认形状仍然匹配。只需替换一个函数，就完成了 2026 年的现代化。

## 用于实践

PyTorch/TF 参考实现为 `nn.TransformerEncoderLayer`、`nn.TransformerDecoderLayer`。但 2026 年大多数生产代码会自行编写块，因为：

- Flash Attention 在注意力内部调用，而不是通过 `nn.MultiheadAttention`。
- 标准库参考实现不包含 GQA / MLA。
- RoPE、RMSNorm、SwiGLU 不是 PyTorch 默认设置。

HF `transformers` 中有值得阅读的清晰参考块：`modeling_llama.py` 是 2026 年标准的纯解码器块。它约 500 行，值得完整通读一次。

**编码器、解码器、编码器—解码器——如何选择：**

| 需求 | 选择 | 示例 |
|------|------|------|
| 分类、嵌入、文本问答 | 仅编码器 | BERT、DeBERTa、ModernBERT |
| 文本生成、对话、代码、推理 | 仅解码器 | GPT、Llama、Claude、Qwen |
| 结构化输入 → 结构化输出（翻译、摘要） | 编码器—解码器 | T5、BART、Whisper |

纯解码器赢得了语言领域，因为它的扩展最干净，而且既能理解也能生成。当输入具有明确的“源序列”身份（翻译、语音识别、结构化任务）时，编码器—解码器仍是最佳选择。

## 交付成果

参见 `outputs/skill-transformer-block-reviewer.md`。该技能对照 2026 年默认设置审查新的 Transformer 块实现，并标记缺失部分（pre-norm、RoPE、RMSNorm、GQA、FFN 扩展比例）。

## 练习

1. **简单。** 在 `d_model=512, n_heads=8, ffn_expansion=4, swiglu=True` 时计算 `encoder_block` 的参数量。实现该块并用 `sum(p.numel() for p in block.parameters())` 验证。
2. **中等。** 从 post-norm 切换到 pre-norm。初始化两者，并在随机输入上测量堆叠 12 层后的激活范数。Post-norm 的激活应该爆炸，pre-norm 则保持有界。
3. **困难。** 在玩具复制任务（逆序复制 `x`）上实现四层编码器—解码器，训练 100 步并报告损失。换成 RMSNorm + SwiGLU + RoPE 后，损失是否下降？

## 关键术语

| 术语 | 人们通常怎么说 | 实际含义 |
|------|----------------|----------|
| 块（block） | “一个 Transformer 层” | 归一化 + 注意力 + 归一化 + FFN 的堆叠，并包裹在残差连接中。 |
| 残差（residual） | “跳跃连接” | 输出 `x + f(x)`；使梯度能流过深层堆叠。 |
| Pre-norm | “先归一化，而非之后” | 现代方案：`x + sublayer(LN(x))`。无需复杂预热即可训练更深。 |
| RMSNorm | “没有均值的 LayerNorm” | 除以 RMS；少一个操作，经验稳定性相同。 |
| SwiGLU | “所有人都换用的 FFN” | `Swish(W1 x) ⊙ W3 x → W2`。在语言模型困惑度上优于 ReLU/GELU。 |
| 交叉注意力 | “解码器如何看到编码器” | Q 来自解码器、K/V 来自编码器输出的 MHA。 |
| FFN 扩展 | “中间 MLP 有多宽” | 隐藏大小相对于 d_model 的比例，通常为 4（LayerNorm）或 2.6（SwiGLU）。 |
| 无偏置 | “去掉 +b 项” | 现代技术栈省略线性层偏置；困惑度略有改善，模型更小。 |

## 延伸阅读

- [Vaswani 等（2017）. Attention Is All You Need](https://arxiv.org/abs/1706.03762)——原始块规范。
- [Xiong 等（2020）. On Layer Normalization in the Transformer Architecture](https://arxiv.org/abs/2002.04745)——为何 pre-norm 在深层网络中优于 post-norm。
- [Zhang、Sennrich（2019）. Root Mean Square Layer Normalization](https://arxiv.org/abs/1910.07467)——RMSNorm。
- [Shazeer（2020）. GLU Variants Improve Transformer](https://arxiv.org/abs/2002.05202)——SwiGLU 论文。
- [Hugging Face `modeling_llama.py`](https://github.com/huggingface/transformers/blob/main/src/transformers/models/llama/modeling_llama.py)——2026 年标准的纯解码器块。
