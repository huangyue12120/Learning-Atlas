---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/05-nlp-foundations-to-advanced/10-attention-mechanism/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: f31dde76b3cd616e1c7d242a9d36fc4f5dd2c4a8514bd026da2d4b9e652ae49b
status: reviewed
---

# 注意力机制：关键突破

> 解码器不再费力凝视压缩摘要，而是查看完整源序列。之后的一切，都是注意力加工程实现。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 5 第 09 课（序列到序列模型）  
**预计时间：** 约 45 分钟

## 问题

第 09 课以一次测得的失败告终：在玩具复制任务上训练的 GRU 编码器与解码器，序列长度为 5 时准确率为 89%，长度增加到 80 后接近随机水平。原因来自结构，而不是训练 bug：编码器获取的每一比特信息都必须塞进一个固定大小的隐藏状态，解码器再也看不到其他内容。

Bahdanau、Cho 和 Bengio 在 2014 年发表了一个三行修复方案。不要只把编码器最终状态交给解码器，而应保留所有编码器状态。解码器每执行一步，都计算这些状态的加权平均；权重表示“此刻解码器需要查看编码器位置 `i` 的程度”。这个加权平均就是上下文，并且会随每个解码步骤改变。

完整想法是：Transformer 扩展了它，自注意力把它应用到单个序列，多头注意力则并行运行它。2014 年的版本已经打破瓶颈。掌握它之后，转向 Transformer 主要是工程变化，而不是概念变化。

## 概念

![Bahdanau 注意力：解码器查询所有编码器状态](../assets/attention.svg)

在解码步骤 `t`：

1. 把前一个解码器隐藏状态 `s_{t-1}` 用作**查询（query）**。
2. 用它为每个编码器隐藏状态 `h_1, ..., h_T` 打分，每个编码位置得到一个标量。
3. 对分数执行 softmax，得到总和为 1 的注意力权重 `α_{t,1}, ..., α_{t,T}`。
4. 计算上下文向量 `c_t = Σ α_{t,i} * h_i`，即编码器状态的加权平均。
5. 解码器接收 `c_t` 与前一个输出词元，生成下一词元。

加权平均是核心。解码器要把“Je”翻成“I”时，会提高“Je”所在编码器状态的权重，降低其他位置；需要“not”时则提高“pas”的权重。上下文向量每一步都会重塑。

## 形状：每个人都会踩的坑

多数注意力实现第一次都会错在这里，请慢慢读。

| 对象 | 形状 | 说明 |
|------|------|------|
| 编码器隐藏状态 `H` | `(T_enc, d_h)` | 若使用 BiLSTM，则 `d_h = 2 * d_hidden` |
| 解码器隐藏状态 `s_{t-1}` | `(d_s,)` | 单个向量 |
| 注意力分数 `e_{t,i}` | 标量 | 每个编码位置一个 |
| 注意力权重 `α_{t,i}` | 标量 | 在所有 `i` 上执行 softmax 后得到 |
| 上下文向量 `c_t` | `(d_h,)` | 与单个编码器状态形状相同 |

**Bahdanau（加性）分数。** `e_{t,i} = v_α^T * tanh(W_a * s_{t-1} + U_a * h_i)`。

- `s_{t-1}` 形状为 `(d_s,)`，`h_i` 形状为 `(d_h,)`。
- `W_a` 形状为 `(d_attn, d_s)`，`U_a` 形状为 `(d_attn, d_h)`。
- 二者在 tanh 内部相加后形状为 `(d_attn,)`。
- `v_α` 形状为 `(d_attn,)`，与 `v_α` 的内积把结果压成一个标量。**`v_α` 的作用**是把注意力维向量投影为标量分数。

**Luong（乘性）分数。** 有三种变体：

- `dot`：`e_{t,i} = s_t^T * h_i`，要求 `d_s == d_h`。这是硬约束，编码器为双向时不要使用。
- `general`：`e_{t,i} = s_t^T * W * h_i`，`W` 形状为 `(d_s, d_h)`，从而取消维度相等约束。
- `concat`：等价于 Bahdanau 形式。前两种成本更低，因此很少使用它。

**一个值得明确指出的 Bahdanau 与 Luong 陷阱。** Bahdanau 使用 `s_{t-1}`，即生成当前词之前的解码器状态；Luong 使用 `s_t`，即更新后的状态。混淆二者会产生细微的错误梯度，而且极难调试。选择一篇论文，并始终遵守其约定。

```figure
attention-heatmap
```

## 动手实现

### 步骤 1：加性（Bahdanau）注意力

```python
import numpy as np


def additive_attention(decoder_state, encoder_states, W_a, U_a, v_a):
    projected_dec = W_a @ decoder_state
    projected_enc = encoder_states @ U_a.T
    combined = np.tanh(projected_enc + projected_dec)
    scores = combined @ v_a
    weights = softmax(scores)
    context = weights @ encoder_states
    return context, weights


def softmax(x):
    x = x - np.max(x)
    e = np.exp(x)
    return e / e.sum()
```

逐一对照上表检查形状。`encoder_states` 为 `(T_enc, d_h)`；`projected_enc` 为 `(T_enc, d_attn)`；`projected_dec` 为 `(d_attn,)`，会触发广播；`combined` 为 `(T_enc, d_attn)`；`scores` 与 `weights` 都是 `(T_enc,)`；`context` 是 `(d_h,)`。至此可以交付。

### 步骤 2：Luong dot 与 general

```python
def dot_attention(decoder_state, encoder_states):
    scores = encoder_states @ decoder_state
    weights = softmax(scores)
    return weights @ encoder_states, weights


def general_attention(decoder_state, encoder_states, W):
    projected = W.T @ decoder_state
    scores = encoder_states @ projected
    weights = softmax(scores)
    return weights @ encoder_states, weights
```

每种方法只要三行，这解释了 Luong 论文为何受到重视：在多数任务上准确率相同，代码却少得多。

### 步骤 3：完整数值示例

给定三个编码器状态，大致对应“cat”“sat”“mat”，再给一个与第一个状态最对齐的解码器状态，注意力分布会集中到位置 0。若解码器状态移向最后一个编码器状态，注意力就会移到位置 2，上下文向量也随之移动。

```python
H = np.array([
    [1.0, 0.0, 0.2],
    [0.5, 0.5, 0.1],
    [0.1, 0.9, 0.3],
])

s_close_to_cat = np.array([0.9, 0.1, 0.2])
ctx, w = dot_attention(s_close_to_cat, H)
print("weights:", w.round(3))
```

```text
weights: [0.464 0.305 0.231]
```

第一行胜出。接着把解码器状态移近第三个编码器状态，观察权重变化。注意力就是显式对齐。

### 步骤 4：为何它是通往 Transformer 的桥梁

把上面的语言翻译成 Q/K/V：

- **Query** = 解码器状态 `s_{t-1}`
- **Key** = 编码器状态，即打分对象
- **Value** = 编码器状态，即被加权求和的对象

经典注意力的键和值是同一对象。自注意力把二者分开：序列可以查询自身，并为 K 与 V 使用不同的可学习投影。多头注意力用不同的可学习投影并行运行这一过程。Transformer 多次堆叠整个阶段，并去除 RNN。

数学与形状都相同。从 Bahdanau 注意力跨到缩放点积注意力，在概念上主要只是符号变化。

## 使用现成工具

PyTorch 和 TensorFlow 都直接提供注意力。

```python
import torch
import torch.nn as nn

mha = nn.MultiheadAttention(embed_dim=128, num_heads=8, batch_first=True)
query = torch.randn(2, 5, 128)
key = torch.randn(2, 10, 128)
value = torch.randn(2, 10, 128)

output, weights = mha(query, key, value)
print(output.shape, weights.shape)
```

```text
torch.Size([2, 5, 128]) torch.Size([2, 5, 10])
```

这是一个 Transformer 注意力层：查询批次有 5 个位置，键值批次有 10 个位置，每个位置 128 维，使用 8 个头。`output` 是注入新上下文后的查询，`weights` 是可视化用的 5×10 对齐矩阵。

### 经典注意力仍有用的场景

- 教学。单头、单层、基于 RNN 的版本把每个概念都显露出来。
- Transformer 放不下的端侧序列任务。
- 2014 至 2017 年的任何论文。不懂 Bahdanau 的约定，就会误读这些论文。
- 机器翻译中的细粒度对齐分析。即使在 Transformer 模型中，原始注意力权重也是一种解释工具；阅读它们需要理解其含义。

### 把注意力权重当作解释的陷阱

注意力权重看起来很可解释。它们沿位置求和为一，可以绘图，高权重似乎表示“模型看了这里”，审稿人也喜欢这样的图。

实际解释力没有表面上那么强。Jain 和 Wallace（2019）证明，在一些任务中，可以置换注意力分布，甚至用任意替代分布，而不改变模型预测。若没有消融或反事实检查，不要把注意力权重当作模型推理过程的证据。

## 交付成果

保存为 `outputs/prompt-attention-shapes.md`：

```markdown
---
name: attention-shapes
description: Debug shape bugs in attention implementations.
phase: 5
lesson: 10
---

Given a broken attention implementation, you identify the shape mismatch. Output:

1. Which matrix has the wrong shape. Name the tensor.
2. What its shape should be, derived from (d_s, d_h, d_attn, T_enc, T_dec, batch_size).
3. One-line fix. Transpose, reshape, or project.
4. A test to catch regressions. Typically: assert `output.shape == (batch, T_dec, d_h)` and `weights.shape == (batch, T_dec, T_enc)` and `weights.sum(dim=-1) close to 1`.

Refuse to recommend fixes that silently broadcast. Broadcast-hiding bugs surface later as silent accuracy degradation, the worst kind of attention bug.

For Bahdanau confusion, insist the decoder input is `s_{t-1}` (pre-step state). For Luong, `s_t` (post-step state). For dot-product, flag dimension mismatch between query and key as the most common first-time error.
```

## 练习

1. **简单。** 为 `softmax` 实现掩码，使编码器填充词元的注意力权重为零。在含可变长度序列的批次上测试。
2. **中等。** 为 Luong `general` 形式加入多头注意力。把 `d_h` 分成 `n_heads` 组，每个头单独运行注意力，再拼接结果。验证单头情形与前面的实现一致。
3. **困难。** 在第 09 课的玩具复制任务上，训练带 Bahdanau 注意力的 GRU 编码器与解码器。绘制准确率随序列长度变化的曲线，并与无注意力基线比较。序列越长，差距应越大，这能确认注意力缓解了瓶颈。

## 关键术语

| 术语 | 常见说法 | 准确含义 |
|------|----------|----------|
| 注意力（attention） | 查看某些内容 | 值序列的加权平均，权重来自查询与键的相似度。 |
| Query、Key、Value | QKV | 三种投影：Q 提问，K 用于匹配，V 提供返回内容。 |
| 加性注意力 | Bahdanau | 前馈分数：`v^T tanh(W q + U k)`。 |
| 乘性注意力 | Luong dot / general | 分数为 `q^T k` 或 `q^T W k`，成本更低，多数任务准确率相同。 |
| 对齐矩阵（alignment matrix） | 好看的图 | `(T_dec, T_enc)` 网格形式的注意力权重，可用于查看模型关注位置。 |

## 延伸阅读

- [Bahdanau, Cho, Bengio (2014). Neural Machine Translation by Jointly Learning to Align and Translate](https://arxiv.org/abs/1409.0473)：原始论文。
- [Luong, Pham, Manning (2015). Effective Approaches to Attention-based Neural Machine Translation](https://arxiv.org/abs/1508.04025)：三种评分变体及其比较。
- [Jain and Wallace (2019). Attention is not Explanation](https://arxiv.org/abs/1902.10186)：关于可解释性的警告。
- [Dive into Deep Learning：Bahdanau 注意力](https://d2l.ai/chapter_attention-mechanisms-and-transformers/bahdanau-attention.html)：可在 PyTorch 中运行的讲解。
