---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/07-transformers-deep-dive/04-positional-encoding/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: c7e45e8178d68f5a75b790a84c81a6749b2f2f54c88e30c3f36fabc705a0a511
status: reviewed
---

# 位置编码——正弦、RoPE、ALiBi

> 注意力具有置换不变性。若没有位置信号，“The cat sat on the mat”和“mat the on sat cat the”会产生相同输出。三种算法修复了这个问题——每种算法对“位置”的含义有不同假设。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 7 第 02 课（自注意力）、Phase 7 第 03 课（多头注意力）  
**预计时间：** 约 45 分钟

## 问题

缩放点积注意力无法感知顺序。注意力矩阵 `softmax(Q K^T / √d) V` 由成对相似度计算得到。打乱 `X` 的行，输出中的行也会以同样方式打乱。注意力内部没有任何东西关心位置。

对于词袋模型，这不是 bug；对于语言、代码、音频、视频——任何顺序携带意义的内容——这都是致命问题。

修复方法是以某种方式把位置注入嵌入。三个时代给出了三种答案：

1. **绝对正弦位置编码**（Vaswani，2017）。把位置的 `sin/cos` 加入嵌入。简单、无需学习，但难以外推到训练长度之外。
2. **RoPE——旋转位置嵌入**（Su，2021）。按与位置成正比的角度旋转 Q 和 K 向量，直接在点积中编码*相对*位置。2026 年的主流方案。
3. **ALiBi——带线性偏置的注意力**（Press，2022）。完全跳过嵌入；根据距离向注意力分数加入逐头线性惩罚。长度外推表现出色。

截至 2026 年，几乎每个前沿开源模型都使用 RoPE：Llama 2/3/4、Qwen 2/3、Mistral、Mixtral、DeepSeek-V3、Kimi。少数长上下文模型使用 ALiBi 或其现代变体。绝对正弦位置编码已成为历史方案。

## 概念

![正弦绝对位置、RoPE 旋转与 ALiBi 距离偏置](../assets/positional-encoding.svg)

### 绝对正弦位置编码

预先计算一个形状为 `(max_len, d_model)` 的固定矩阵 `PE`：

```text
PE[pos, 2i]   = sin(pos / 10000^(2i / d_model))
PE[pos, 2i+1] = cos(pos / 10000^(2i / d_model))
```

然后在注意力前计算 `X' = X + PE[:N]`。每个维度都是不同频率的正弦波，模型学习从相位模式中读取位置。它在 `max_len` 之外会失效：如果模型只见过位置 0–2047，就没有任何东西告诉它位置 2048 会发生什么。

### RoPE

旋转 Q 和 K 向量（而非嵌入）。对每一对维度 `(2i, 2i+1)`：

```text
[q'_2i    ]   [ cos(pos·θ_i)  -sin(pos·θ_i) ] [q_2i   ]
[q'_2i+1  ] = [ sin(pos·θ_i)   cos(pos·θ_i) ] [q_2i+1 ]

θ_i = base^(-2i / d_head)，base 默认为 10000
```

对位置 `pos_k` 的键应用相同旋转。点积 `q'_m · k'_n` 会变成只与 `(m - n)` 有关的函数。换句话说：**注意力分数只依赖相对距离**，尽管旋转由绝对位置决定。这是个漂亮的技巧。

扩展 RoPE：可以缩放 `base`（NTK-aware、YaRN、LongRoPE），无需重新训练就能外推到更长上下文。Llama 3 通过这种方式把上下文从 8K 扩展到 128K。

### ALiBi

跳过嵌入技巧，直接对注意力分数加偏置：

```text
attn_score[i, j] = (q_i · k_j) / √d  -  m_h · |i - j|
```

其中 `m_h` 是各头专属的斜率（例如 `1 / 2^(8·h/H)`）。较近的词元被增强，较远的词元受到惩罚。没有训练时成本。论文表明，其长度外推优于正弦方案，并在原始训练长度上与 RoPE 相当。

### 2026 年如何选择

| 变体 | 外推 | 训练成本 | 使用者 |
|------|------|----------|--------|
| 绝对正弦 | 差 | 免费 | 原始 Transformer、早期 BERT |
| 学习绝对位置 | 无 | 很小 | GPT-2、GPT-3 |
| RoPE | 配合缩放时良好 | 免费 | Llama 2/3/4、Qwen 2/3、Mistral、DeepSeek-V3、Kimi |
| RoPE + YaRN | 出色 | 微调阶段 | Qwen2-1M、Llama 3.1 128K |
| ALiBi | 出色 | 免费 | BLOOM、MPT、Baichuan |

RoPE 胜出的原因是：可以嵌入注意力而不改变架构、编码相对位置，并能通过 `base` 超参数干净地控制长上下文微调。

```figure
rope-explorer
```

## 动手实现

### 步骤 1：正弦编码

参见 `code/main.py`。只需四行计算：

```python
def sinusoidal(N, d):
    pe = [[0.0] * d for _ in range(N)]
    for pos in range(N):
        for i in range(d // 2):
            theta = pos / (10000 ** (2 * i / d))
            pe[pos][2 * i]     = math.sin(theta)
            pe[pos][2 * i + 1] = math.cos(theta)
    return pe
```

在第一个注意力层之前，把它加到嵌入矩阵上。

### 步骤 2：把 RoPE 应用于 Q、K

RoPE 就地作用于 Q 和 K。对每一对维度：

```python
def apply_rope(x, pos, base=10000):
    d = len(x)
    out = list(x)
    for i in range(d // 2):
        theta = pos / (base ** (2 * i / d))
        c, s = math.cos(theta), math.sin(theta)
        a, b = x[2 * i], x[2 * i + 1]
        out[2 * i]     = a * c - b * s
        out[2 * i + 1] = a * s + b * c
    return out
```

关键点：对位置 `m` 的 Q 和位置 `n` 的 K 应用相同函数。其点积会在每对坐标上获得 `cos((m-n)·θ_i)` 因子。注意力因此免费学到相对位置。

### 步骤 3：ALiBi 斜率与偏置

```python
def alibi_bias(n_heads, seq_len):
    # slope_h = 2 ** (-8 * h / n_heads) for h = 1..n_heads
    slopes = [2 ** (-8 * (h + 1) / n_heads) for h in range(n_heads)]
    bias = []
    for m in slopes:
        row = [[-m * abs(i - j) for j in range(seq_len)] for i in range(seq_len)]
        bias.append(row)
    return bias  # add to attention scores before softmax
```

把 `bias[h]` 加到头 `h` 的 `(seq_len, seq_len)` 注意力分数矩阵上，再执行 softmax。

### 步骤 4：验证 RoPE 的相对距离性质

随机选择两个向量 `a, b`，按 `(pos_a, pos_b)` 旋转，再按 `(pos_a + k, pos_b + k)` 旋转。两个点积必须在浮点误差范围内相等。该性质就是 RoPE 的全部意义——它不受绝对偏移影响，只与相对间隔有关。

## 用于实践

PyTorch 2.5+ 在 `torch.nn.functional` 中提供 RoPE 工具。大多数生产代码使用 `flash_attn` 或 `xformers`，在注意力内核中应用 RoPE。

```python
from transformers import AutoModel
model = AutoModel.from_pretrained("meta-llama/Llama-3.2-3B")
# model.config.rope_scaling → {"type": "yarn", "factor": 32.0, "original_max_position_embeddings": 8192}
```

**2026 年的长上下文技巧：**

- **NTK-aware 插值。** 从 4K 扩展到 16K+ 时，把 `base` 重缩放为 `base * (scale_factor)^(d/(d-2))`。
- **YaRN。** 更智能的插值，在长上下文上保持注意力熵。Llama 3.1 128K 使用它。
- **LongRoPE。** Microsoft 2024 年的方法，通过进化搜索选择逐维缩放因子。Phi-3-Long 使用它。
- **位置插值 + 微调。** 只需按扩展因子缩小位置，再微调 10–50 亿词元。效果出奇地好。

## 交付成果

参见 `outputs/skill-positional-encoding-picker.md`。该技能根据目标上下文长度、外推需求与训练预算选择编码策略。

## 练习

1. **简单。** 将 `max_len=512, d=128` 的正弦 `PE` 矩阵绘制为热力图，确认“维度索引越大，条纹越宽”的模式。
2. **中等。** 实现 NTK-aware RoPE 缩放。在长度 256 的序列上训练微型语言模型，再分别在有无缩放时测试长度 1024，测量困惑度。
3. **困难。** 在同一个注意力模块中实现 ALiBi 和 RoPE。在长度 512 的序列上训练四层 Transformer 完成复制任务，测试时外推到 2048，并比较性能退化。

## 关键术语

| 术语 | 人们通常怎么说 | 实际含义 |
|------|----------------|----------|
| 位置编码 | “告诉注意力顺序” | 加入嵌入或注意力中，用于编码位置的任意信号。 |
| 正弦编码 | “最初的那个” | 以几何频率将 `sin/cos` 加入嵌入；无法外推。 |
| RoPE | “旋转嵌入” | 按位置相关角度旋转 Q、K；点积编码相对距离。 |
| ALiBi | “线性偏置技巧” | 向注意力分数加入 `-m·\|i-j\|`；无需嵌入，外推出色。 |
| base | “RoPE 的旋钮” | RoPE 的频率缩放器；增大可在推理时扩展上下文。 |
| NTK-aware | “一种 RoPE 缩放技巧” | 重缩放 `base`，避免上下文扩展时压缩高频维度。 |
| YaRN | “更复杂的方案” | 保持注意力熵的逐维插值 + 外推。 |
| 外推 | “在训练长度之外工作” | 位置方案能否在训练中见过的 `max_len` 之外产生正确输出？ |

## 延伸阅读

- [Vaswani 等（2017）. Attention Is All You Need §3.5](https://arxiv.org/abs/1706.03762)——最初的正弦方案。
- [Su 等（2021）. RoFormer: Enhanced Transformer with Rotary Position Embedding](https://arxiv.org/abs/2104.09864)——RoPE 论文。
- [Press、Smith、Lewis（2021）. Train Short, Test Long: Attention with Linear Biases Enables Input Length Extrapolation](https://arxiv.org/abs/2108.12409)——ALiBi。
- [Peng 等（2023）. YaRN: Efficient Context Window Extension of Large Language Models](https://arxiv.org/abs/2309.00071)——最先进的 RoPE 缩放。
- [Chen 等（2023）. Extending Context Window of Large Language Models via Positional Interpolation](https://arxiv.org/abs/2306.15595)——Meta 的 Llama 2 长上下文论文。
- [Ding 等（2024）. LongRoPE: Extending LLM Context Window Beyond 2 Million Tokens](https://arxiv.org/abs/2402.13753)——Phi-3-Long 使用、并在“用于实践”中引用的 Microsoft 方法。
- [Hugging Face Transformers——`modeling_rope_utils.py`](https://github.com/huggingface/transformers/blob/main/src/transformers/modeling_rope_utils.py)——每种 RoPE 缩放方案（默认、线性、动态、YaRN、LongRoPE、Llama-3）的生产级实现。
