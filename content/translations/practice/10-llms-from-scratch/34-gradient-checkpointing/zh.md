---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/10-llms-from-scratch/34-gradient-checkpointing/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: a6cf7b553b333518445fa61a7588527a69eb1b73bb2106b3438dc22e236c5e78
status: reviewed
---

# 梯度检查点与激活重计算

> 反向传播会保留每个中间激活。在 70B 参数、128K 上下文下，每个 rank 的激活量可达 3 TB。检查点技术以 FLOPs 换内存：重新计算，而不是保存。问题在于该丢弃哪些分段，答案并不是“全部丢弃”。

**类型：** 构建
**语言：** Python（使用 numpy，可选 torch）
**前置要求：** 第 10 阶段第 04 课（预训练 Mini-GPT）、第 10 阶段第 05 课（扩展与分布式）
**用时：** 约 70 分钟

## 问题

训练 Transformer 时，每一层都会存储反向传播中每个需要求导的算子的输入：注意力输入、Q/K/V 投影、softmax 输出、FFN 输入、归一化输出，以及残差流。对于隐藏尺寸为 `d`、序列长度为 `L`、批次大小为 `B` 的一层，这相当于每层约 `12 * B * L * d` 个浮点数。

当 `d=8192, L=8192, B=1` 时，使用 BF16，每层激活约 800 MB。一个 64 层模型的激活就有 51 GB——这还没算微批次大小带来的倍增，没加上注意力 softmax 的中间结果（每个头都有 `L^2`），也没考虑张量并行产生的局部副本。

这是一笔双向账：BF16 权重加优化器状态或许能放进 80GB，但激活会把你推过容量上限。梯度检查点（也称激活重计算）是标准解决方案。丢掉大部分激活；在反向传播期间重新执行前向传播，把它们找回来。代价是额外 FLOPs，收益则是内存按检查点分段数与总层数的比例下降。

朴素地做检查点，每个 step 的前向 FLOPs 大约会增加 33%。做得好——按照 Korthikanti 等人提出的“智能选择”进行选择性检查点——可以节省 5 倍内存，同时 FLOP 开销低于 5%。而在使用 FP8 矩阵乘法、FSDP 卸载和专家并行 MoE 时，这一点尤其重要：你既承担不起内存不够，也承担不起浪费计算。

## 概念

### 反向传播实际需要什么

`output = layer(input)`。反向传播需要 `grad_input` 和 `grad_params`。要计算它们，它需要：

- `input`（对于线性层，用它计算 `grad_params = input.T @ grad_output`）
- 一些激活导数的中间结果（ReLU/GELU/softmax 的导数取决于激活值）

前向传播会把这些内容自动存储在自动求导图中。每个 `tensor.retain_grad()`，以及每个需要其输入的算子，都会保留一个引用。

### 朴素的全量检查点

将网络拆分为 `N` 个分段。前向传播期间，只保存每个分段的*输入*。当反向传播需要中间结果时，重新运行该分段的前向传播以生成这些结果，然后再求导。

例如：将一个 32 层 Transformer 拆成 32 个分段，每段 1 层。

- 内存：32 个层输入（小）对比 32 *（每层的激活量）（很大）。
- 额外计算：每个分段额外执行 1 次前向传播，也就是总前向 FLOPs 增加约 33%（因为反向传播是前向传播的 2 倍，所以完整 step 从 1 + 2 = 3 个单位变为 1 + 1 + 2 = 4 个单位）。

这是 Chen 等人在 2016 年提出的原始方案：每隔 `sqrt(L)` 层设置一个检查点，以平衡内存和计算。对于 L=64，这意味着设置 8 个检查点。

### 选择性检查点（Korthikanti，2022）

并非所有激活的成本都相同。注意力 softmax 输出是 `B*L*L*heads`，会随序列长度*二次增长*。FFN 隐藏激活是 `B*L*4d`，呈线性增长。对于长序列，softmax 会占主导地位。

选择性检查点保留易于存储的激活（线性投影、残差），只重新计算昂贵的激活（注意力）。你只需付出很少的重计算 FLOPs，却能节省 O(L^2) 的内存。

Megatron-Core 将此实现为“选择性”激活重计算。它已用于 2024 年及之后的大多数前沿训练运行。

### 卸载

重计算的另一种替代方案：在前向传播和反向传播之间，将激活传送到 CPU 内存。它需要 PCIe 带宽；只有当空闲带宽超过重新物化的成本时才有益。混合策略很常见：检查点保存一部分层，将另一部分层卸载。

FSDP2 将卸载作为一等选项提供。当 GPU 受内存限制、而 CPU 与 GPU 之间的传输仍有余量时，卸载最有优势。

### 重计算成本模型

对于每隔 `k` 层设置一次朴素检查点的 `L` 层网络，每个 step 的 FLOPs 为：

```
flops_fwd_normal = L * f_layer
flops_bwd_normal = 2 * L * f_layer
flops_total_normal = 3 * L * f_layer

flops_fwd_ckpt = L * f_layer
flops_recompute = L * f_layer  # one extra forward per layer in the segment
flops_bwd_ckpt = 2 * L * f_layer
flops_total_ckpt = 4 * L * f_layer
overhead = 4 / 3 - 1 = 0.33 = 33%
```

使用选择性检查点时，只重新计算注意力内核，而不是整层：

```
flops_recompute_selective = L * f_attention ~= L * f_layer * 0.15
overhead_selective = (3 + 0.15) / 3 - 1 = 0.05 = 5%
```

### 内存节省模型

每层的激活量：`A`。对于 `L` 层，总激活内存为：`L * A`。

全量检查点（分段大小为 1）：只存储 `L * input_volume`（对于标准 Transformer，约为 `L * 1/10 A`）。节省约 `9 * L * A * 1/10`。

每隔 `k` 层设置检查点：存储 `L/k * A`，加上活动分段中 `k-1` 层的内存。

当 `k = sqrt(L)` 时，内存和重计算成本都会随 `sqrt(L)` 缩放——这是各层成本相同情况下的最优权衡。

### 何时不应使用检查点

- 流水线阶段中已经在执行的最内层。它们反正必须完成。
- 如果首层和末层占据该阶段的大部分计算，则不要对它们使用检查点（在 Transformer 中很少见）。
- 已经使用 FlashAttention 的注意力内核——FlashAttention 已经快速地重新计算 softmax，在此基础上再做额外的层级检查点，收益很小。

### 实现模式

1. **函数包装器：** 将一个分段包装在 `torch.utils.checkpoint.checkpoint(fn, input)` 中。PyTorch 只存储 `input`，在反向传播时重新计算其他所有内容。

2. **基于装饰器：** 将层标记为可检查点化；训练器在配置时决定哪些分段需要包装。

3. **手动显式重计算：** 自己编写反向传播，在其中调用自定义的 `recompute_forward`；这个函数用保存的输入复制前向传播。

三种方式得到的功能结果都相同。包装器是标准惯用法。

### 与 TP / PP / FP8 的交互

- **张量并行：** 重计算时必须收集或重新分散检查点输入；要处理由此产生的通信成本。
- **流水线并行：** 常见模式是为每个流水线阶段的前向传播设置检查点，让反向顺序的微批次可以复用激活内存。
- **FP8 重计算：** 重计算期间更新的 amax 历史必须与原始前向传播一致，否则 FP8 的缩放因子会漂移。大多数框架都会快照该缩放因子。

```figure
activation-recompute
```

## 动手构建

### 第 1 步：带分段的玩具模型

```python
import numpy as np


def linear_forward(x, w, b):
    return x @ w + b


def relu(x):
    return np.maximum(x, 0)


def layer_forward(x, w1, b1, w2, b2):
    h = relu(linear_forward(x, w1, b1))
    return linear_forward(h, w2, b2)


def model_forward(x, params):
    activations = [x]
    h = x
    for w1, b1, w2, b2 in params:
        h = layer_forward(h, w1, b1, w2, b2)
        activations.append(h)
    return h, activations
```

### 第 2 步：需要全部激活的朴素反向传播

```python
def model_backward(grad_output, activations, params):
    grads = [None] * len(params)
    g = grad_output
    for i in range(len(params) - 1, -1, -1):
        w1, b1, w2, b2 = params[i]
        x_in = activations[i]
        h_pre = linear_forward(x_in, w1, b1)
        h = relu(h_pre)
        gh = g @ w2.T
        gw2 = h.T @ g
        gb2 = g.sum(axis=0)
        g_pre = gh * (h_pre > 0)
        gx = g_pre @ w1.T
        gw1 = x_in.T @ g_pre
        gb1 = g_pre.sum(axis=0)
        grads[i] = (gw1, gb1, gw2, gb2)
        g = gx
    return g, grads
```

### 第 3 步：每隔 k 层设置检查点的内存

```python
def model_forward_checkpointed(x, params, k=4):
    saved_inputs = [x]
    h = x
    for i, (w1, b1, w2, b2) in enumerate(params):
        h = layer_forward(h, w1, b1, w2, b2)
        if (i + 1) % k == 0:
            saved_inputs.append(h)
    return h, saved_inputs


def model_backward_checkpointed(grad_output, saved_inputs, params, k=4):
    grads = [None] * len(params)
    g = grad_output
    segments = [(j * k, min((j + 1) * k, len(params))) for j in range(len(saved_inputs))]
    for seg_idx in range(len(saved_inputs) - 1, -1, -1):
        start, end = segments[seg_idx]
        if start >= end:
            continue
        x_in = saved_inputs[seg_idx]
        _, seg_acts = model_forward(x_in, params[start:end])
        g, seg_grads = model_backward(g, seg_acts, params[start:end])
        for j, gr in enumerate(seg_grads):
            grads[start + j] = gr
    return g, grads
```

### 第 4 步：成本模型

```python
def checkpoint_cost(n_layers, segment_size, flops_per_layer=1.0):
    fwd = n_layers * flops_per_layer
    recompute = n_layers * flops_per_layer
    bwd = 2 * n_layers * flops_per_layer
    return {
        "fwd": fwd,
        "recompute": recompute,
        "bwd": bwd,
        "total": fwd + recompute + bwd,
        "overhead_vs_no_ckpt": (fwd + recompute + bwd) / (fwd + bwd) - 1.0,
    }


def selective_checkpoint_cost(n_layers, attention_fraction=0.15,
                              flops_per_layer=1.0):
    fwd = n_layers * flops_per_layer
    recompute = n_layers * attention_fraction * flops_per_layer
    bwd = 2 * n_layers * flops_per_layer
    return {
        "fwd": fwd,
        "recompute": recompute,
        "bwd": bwd,
        "total": fwd + recompute + bwd,
        "overhead_vs_no_ckpt": (fwd + recompute + bwd) / (fwd + bwd) - 1.0,
    }
```

### 第 5 步：内存估算器

```python
def activation_memory_mb(n_layers, hidden=8192, seq=8192,
                        batch=1, bytes_per_value=2):
    per_layer = 12 * batch * seq * hidden * bytes_per_value
    return n_layers * per_layer / 1e6


def memory_after_checkpoint(n_layers, segment_size, hidden=8192,
                           seq=8192, batch=1, bytes_per_value=2):
    n_seg = max(1, n_layers // segment_size)
    saved = (n_seg + segment_size) * 1 * batch * seq * hidden * bytes_per_value
    return saved / 1e6
```

### 第 6 步：最优分段大小

```python
def optimal_segment(n_layers):
    return int(round(np.sqrt(n_layers)))
```

### 第 7 步：选择性检查点决策

```python
def should_recompute(layer_type, activation_bytes, recompute_flops_ratio):
    if layer_type == "attention" and activation_bytes > 100 * 1e6:
        return True
    if layer_type == "ffn" and activation_bytes > 500 * 1e6:
        return recompute_flops_ratio < 0.1
    return False
```

## 使用

- **torch.utils.checkpoint**：`from torch.utils.checkpoint import checkpoint`——PyTorch 中的标准包装器。它包装一个函数；只存储输入，并在反向传播时重新计算。
- **Megatron-Core 激活重计算：** 支持 `selective`、`full` 和 `block` 模式，是 2024 年及之后前沿训练的标准做法。
- **FSDP2 卸载：** FSDP2 使用 `module.to_empty(device="cpu")` 和 `offload_policy`，将激活分片到 CPU，而不是重新计算。
- **DeepSpeed ZeRO-Offload：** 为优化器状态和激活提供 CPU 卸载，与检查点技术互补。

## 交付

本课产出 `outputs/prompt-activation-recompute-policy.md`——一个接收模型配置（层数、隐藏维度、序列长度、批次大小）和可用 GPU 内存，并输出逐层重计算策略（none / selective / full / offload）的提示词。

## 练习

1. 验证正确性。运行 `model_forward` + `model_backward`（完整激活）与 `model_forward_checkpointed` + `model_backward_checkpointed`（分段）并进行对比。参数梯度必须达到机器精度级别的一致。

2. 将分段大小 `k` 从 1 扫描到 `L`。绘制 FLOP 开销和内存，找出曲线的拐点。

3. 实现选择性检查点：存储注意力模块的输入，但不存储其中间结果。对于一个 32 层模型，在 seq=8192 时，测量相对于整层检查点的 FLOP 开销。

4. 添加卸载。将分段输入保存到模拟的“CPU buffer”（一个单独的列表）中。将“PCIe 带宽”测量为字节数/时间，并找出卸载与重计算之间的盈亏平衡点。

5. 对一个真实的 PyTorch Transformer 进行有无 `torch.utils.checkpoint` 的基准测试。测量内存（通过 `torch.cuda.max_memory_allocated`）和 step 时间。

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|------|----------|----------|
| 梯度检查点 | “通过重新执行前向传播来节省内存” | 只存储分段输入；在反向传播期间重新计算中间结果，以获得计算梯度所需的张量 |
| 激活重计算 | “和检查点一样” | 同一技术在 HPC 语境中的名称 |
| 分段大小（k） | “每个检查点包含多少层” | 中间结果会被丢弃并一起重新物化的层数 |
| 选择性检查点 | “Korthikanti 的技巧” | 只重新计算存储成本高的激活（注意力 softmax），保留便宜的激活 |
| 全量检查点 | “朴素版本” | 重新计算每个分段中每一层的中间结果 |
| 块检查点 | “粗粒度” | 以整个 Transformer 块为单位设置检查点；粒度最大 |
| FLOP 开销 | “计算税” | 每个 step 的额外 FLOPs =（重计算 FLOPs）/（前向 + 反向 FLOPs）；朴素方案为 33%，选择性方案为 5% |
| 激活卸载 | “发送到 CPU” | 在前向传播到反向传播期间将激活移到 CPU 内存；重计算的替代方案 |
| sqrt-L 规则 | “经典最优解” | 对于成本相同的层，最优检查点间隔是 sqrt(L) 层 |
| 注意力 softmax 量 | “O(L^2) 问题” | L^2 * heads * batch 个浮点数；在长上下文下主导激活内存 |

## 延伸阅读

- [Chen et al., 2016 -- "Training Deep Nets with Sublinear Memory Cost"](https://arxiv.org/abs/1604.06174) -- 首篇将梯度检查点形式化的论文
- [Korthikanti et al., 2022 -- "Reducing Activation Recomputation in Large Transformer Models"](https://arxiv.org/abs/2205.05198) -- 选择性激活重计算及其形式化成本分析
- [Pudipeddi et al., 2020 -- "Training Large Neural Networks with Constant Memory using a New Execution Algorithm"](https://arxiv.org/abs/2002.05645) -- 通过反向模式重新物化实现恒定内存的替代方法
- [Ren et al., 2021 -- "ZeRO-Offload: Democratizing Billion-Scale Model Training"](https://arxiv.org/abs/2101.06840) -- 大规模场景下的激活卸载
- [PyTorch torch.utils.checkpoint docs](https://pytorch.org/docs/stable/checkpoint.html) -- 标准 API
- [Megatron-Core activation recomputation documentation](https://docs.nvidia.com/nemo-framework/user-guide/latest/nemotoolkit/features/memory_optimizations.html) -- 选择性、全量和块模式
