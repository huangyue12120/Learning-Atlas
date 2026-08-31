---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/07-transformers-deep-dive/07-gpt-causal-language-modeling/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 631bdec6da1f43937a98f0e137a8d0e41cecab977e152b921fc140ebec3afd57
status: reviewed
---

# GPT——因果语言建模

> BERT 能看到两侧，GPT 只能看到过去。三角遮蔽是现代 AI 中影响最深远的一行代码。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 7 第 02 课（自注意力）、Phase 7 第 05 课（完整 Transformer）、Phase 7 第 06 课（BERT）  
**预计时间：** 约 75 分钟

## 问题

语言模型回答一个问题：给定前 `t-1` 个词元，词元 `t` 上的概率分布是什么？在这个信号——下一词元预测——上训练，就能得到一个每次生成一个词元、可生成任意文本的模型。

为了在整个序列上并行进行端到端训练，需要让每个位置的预测只依赖更早位置。否则，模型只需查看答案就能轻易作弊。

因果遮蔽实现了这一点。它是一个由 `-inf` 组成的上三角矩阵，在 softmax 前加到注意力分数上。softmax 后，这些位置变为 0。每个位置只能关注自己与更早位置。由于一次性对整个序列应用遮蔽，一次前向传播就能并行得到 N 个下一词元预测。

GPT-1（2018）、GPT-2（2019）、GPT-3（2020）、GPT-4（2023）、GPT-5（2025）、Claude、Llama、Qwen、Mistral、DeepSeek、Kimi——它们都是具有相同核心循环的纯解码器因果 Transformer。彼此区别来自数据质量、规模、架构改进与后训练（SFT、RLHF、DPO 及其后继方法）。

## 概念 <!-- learning-atlas: the-concept -->

![因果遮蔽形成三角形注意力矩阵](../assets/causal-attention.svg)

### 遮蔽

给定长度为 `N` 的序列，构建 `N × N` 矩阵：

```text
M[i, j] = 0       当 j <= i
M[i, j] = -inf    当 j > i
```

在 softmax 前把 `M` 加到原始注意力分数上。`exp(-inf) = 0`，所以被遮蔽的位置贡献零权重。注意力矩阵的每一行都只是在先前位置上的概率分布。

实现成本：一次 `torch.tril()` 调用。计算时间：纳秒级。对整个领域的影响：一切。

### 三角形从何而来

遮蔽通常被描述为附加在注意力上的补丁。反过来推导，就不再神秘：注意力是前缀平均的第三次改进，而三角形就是该平均循环的边界，以矩阵形式写出。

**阶段 1——前缀平均。** 序列最简单的因果摘要：位置 `i` 变成位置 `0…i` 的均值。写成循环就是 `out[i] = X[:i+1].mean(0)`。同样的计算可以通过一次矩阵乘法完成：取一个由 1 组成的下三角矩阵，每行除以该行元素数，再相乘：

```python
import numpy as np

A = np.tril(np.ones((n, n)))
A = A / A.sum(axis=1, keepdims=True)
out = A @ X
```

`A` 的第 `i` 行为 `[1/(i+1), …, 1/(i+1), 0, …, 0]`。对角线上方的零就是因果性。未来内容并非被遮蔽，而是从未进入求和。

**阶段 2——学习权重。** 均匀平均把过去每个词元都视为同等相关。用学习得到的分数矩阵 `S` 替换这些 1。现在，各行不会自然加和为 1，因此改用 softmax 归一化，而非除以数量。Softmax 永远不会输出精确的零，因果性因此被破坏——除非把未来分数设为 `-inf`，因为 `exp(-inf) = 0`：

```python
def softmax(x, axis):
    e = np.exp(x - np.max(x, axis=axis, keepdims=True))
    return e / e.sum(axis=axis, keepdims=True)

S = S + np.triu(np.full((n, n), -np.inf), k=1)
A = softmax(S, axis=1)
out = A @ X
```

还是同一个三角形、同一个行随机矩阵、同一次矩阵乘法。`-inf` 遮蔽并非新机制，而是把阶段 1 的零项翻译到 softmax 输入域。

**阶段 3——依赖内容的权重。** 阶段 2 中，`S` 在训练后固定：无论词元内容是什么，位置 7 对位置 3 的权重都一样。让分数依赖词元自身：`S = Q @ K.T / sqrt(d_k)`。其他一切都不变——遮蔽、softmax、矩阵乘法完全相同。

三个阶段，一个不变量：下三角行随机矩阵乘以序列。均匀平均、学习得到的静态权重、依赖内容的权重。遮蔽从未被添加到注意力中，而是从平均中幸存下来。

```figure
mask-derivation
```

### 并行训练，串行推理

训练：一次前向传播处理整个 `(N, d_model)` 序列，计算 N 个交叉熵损失（每个位置一个），求和并反向传播。沿序列并行，因此一次 GPU 计算可处理批次中的 100 万个词元，GPT 训练也能扩展。

推理：逐词元生成。输入 `[t1, t2, t3]`，得到 `t4`；输入 `[t1, t2, t3, t4]`，得到 `t5`；输入 `[t1, t2, t3, t4, t5]`，得到 `t6`。KV 缓存（第 12 课）保存 `t1…tn` 的隐藏状态，因此每一步无需重新计算。但推理的串行深度 = 输出长度，这种自回归开销构成每个 LLM 解码的延迟瓶颈。

### 损失——错位一个词元

给定词元 `[t1, t2, t3, t4]`：

- 输入：`[t1, t2, t3]`
- 目标：`[t2, t3, t4]`

对每个位置 `i` 计算 `-log P(target_i | inputs[:i+1])`，再求和，得到整个序列的交叉熵。

你听说过的每个 Transformer 语言模型都在这个损失上训练。预训练、微调、SFT——损失相同，数据不同。

### 解码策略

训练后，采样选择比人们以为的更重要。

| 方法 | 做法 | 适用场景 |
|------|------|----------|
| 贪心 | 每一步取 argmax | 确定性任务、代码补全 |
| 温度 | logits 除以 T，再采样 | 创意任务；T 越高，多样性越大 |
| Top-k | 只从概率最高的 k 个词元中采样 | 消除低概率尾部 |
| Top-p（核采样） | 从累计概率 ≥ p 的最小集合中采样 | 2020 年后的默认方案；适应分布形状 |
| Min-p | 保留满足 `p > min_p * max_p` 的词元 | 2024 年后；比 top-p 更擅长拒绝长尾 |
| 推测解码 | 草稿模型提出 N 个词元，大模型验证 | 在质量相同的情况下延迟降低 2–3 倍 |

2026 年，对开放权重模型而言，min-p + 温度 0.7 是合理默认设置。任何生产推理技术栈都必须支持推测解码。

### “GPT 配方”为何有效

1. **纯解码器。** 没有编码器开销，每层只需一次注意力 + FFN。
2. **扩展。** 1.24 亿 → 15 亿 → 1750 亿 → 数万亿。Chinchilla 扩展定律（第 13 课）告诉你如何分配计算。
3. **上下文学习。** 约在 60–130 亿参数时涌现。模型无需微调即可遵循少样本示例。
4. **RLHF。** 在人类偏好上做后训练，把原始预训练文本模型变成对话助理。
5. **Pre-norm + RoPE + SwiGLU。** 保证大规模训练稳定。

自 GPT-2 以来，核心架构变化不大。所有有趣变化都发生在数据、规模与后训练中。

```figure
causal-mask
```

## 动手实现

### 步骤 1：因果遮蔽

参见 `code/main.py`。只需一行：

```python
def causal_mask(n):
    return [[0.0 if j <= i else float("-inf") for j in range(n)] for i in range(n)]
```

在 softmax 前将它加入注意力分数，机制就完成了。

### 步骤 2：两层 GPT 风格模型

堆叠两个解码器块（带遮蔽的自注意力 + FFN，无交叉注意力）。加入词元嵌入、位置编码与反嵌入（与词元嵌入矩阵共享权重——GPT-2 起使用的标准技巧）。

### 步骤 3：端到端下一词元预测

在 20 词元的玩具词表上，为每个位置生成 logits，计算相对于错位一个词元目标的交叉熵损失。不执行梯度——这是前向传播合理性检查。

### 步骤 4：采样

实现贪心、温度、top-k、top-p、min-p。对固定提示运行每种方法并比较输出。一个采样函数只需 10 行。

## 用于实践

2026 年的 PyTorch 写法：

```python
from transformers import AutoModelForCausalLM, AutoTokenizer
model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-3.2-3B-Instruct")
tok = AutoTokenizer.from_pretrained("meta-llama/Llama-3.2-3B-Instruct")

prompt = "Attention is all you need because"
inputs = tok(prompt, return_tensors="pt")
out = model.generate(
    **inputs,
    max_new_tokens=64,
    temperature=0.7,
    top_p=0.9,
    do_sample=True,
)
print(tok.decode(out[0]))
```

在底层，`generate()` 运行前向传播、取最终位置的 logits、采样下一词元、将其追加并重复。每个生产 LLM 推理技术栈（vLLM、TensorRT-LLM、llama.cpp、Ollama、MLX）都使用相同循环，只是进行了大量优化——批量预填充、连续批处理、KV 缓存分页、推测解码。

**一句话区分 GPT 与 BERT：** GPT 预测 `P(x_t | x_{<t})`，BERT 预测 `P(x_masked | x_unmasked)`。损失决定模型能否生成。

## 交付成果

参见 `outputs/skill-sampling-tuner.md`。该技能为新的生成任务选择采样参数，并标记必须使用确定性解码的情况。

## 练习

1. **简单。** 运行 `code/main.py`，确认 softmax 后的因果注意力矩阵为下三角。抽查：第 3 行只能在第 0–3 列中有权重。
2. **中等。** 实现宽度为 4 的束搜索。在 10 条短提示上比较 beam-4 与贪心的困惑度。束搜索总会胜出吗？（提示：通常适合翻译，不适合开放式对话。）
3. **困难。** 实现推测解码：使用微型两层模型作为草稿，六层模型作为验证器。对 100 个长度 64 的补全测量实际加速，并确认输出与验证器的贪心输出相同。

## 关键术语

| 术语 | 人们通常怎么说 | 实际含义 |
|------|----------------|----------|
| 因果遮蔽 | “三角形” | 加到注意力分数上的上三角 `-inf` 矩阵，使位置 `i` 只能看到位置 `≤ i`。 |
| 下一词元预测 | “损失” | 每个位置上模型分布相对于真实下一词元的交叉熵。 |
| 自回归 | “一次生成一个” | 把输出反馈为输入；只在训练时并行，生成时不并行。 |
| Logits | “softmax 前的分数” | LM 头在 softmax 前的原始输出；采样在这些值上进行。 |
| 温度 | “创意旋钮” | 将 logits 除以 T；T→0 = 贪心，T→∞ = 均匀。 |
| Top-p | “核采样” | 截断分布，只保留总和达到 ≥p 的最小集合，再从中采样。 |
| Min-p | “优于 top-p” | 保留 `p ≥ min_p × max_p` 的词元；根据分布尖锐程度调整截断。 |
| 推测解码 | “草稿 + 验证” | 廉价模型提出 N 个词元，大模型并行验证。 |
| 教师强制 | “训练技巧” | 训练时输入真实的前一个词元，而非模型预测。每个 seq2seq 语言模型的标准做法。 |

## 延伸阅读

- [Radford 等（2018）. Improving Language Understanding by Generative Pre-Training](https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf)——GPT-1。
- [Radford 等（2019）. Language Models are Unsupervised Multitask Learners](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf)——GPT-2。
- [Brown 等（2020）. Language Models are Few-Shot Learners](https://arxiv.org/abs/2005.14165)——GPT-3 与上下文学习。
- [Leviathan、Kalman、Matias（2023）. Fast Inference from Transformers via Speculative Decoding](https://arxiv.org/abs/2211.17192)——推测解码论文。
- [Hugging Face `modeling_llama.py`](https://github.com/huggingface/transformers/blob/main/src/transformers/models/llama/modeling_llama.py)——标准因果语言模型参考代码。
