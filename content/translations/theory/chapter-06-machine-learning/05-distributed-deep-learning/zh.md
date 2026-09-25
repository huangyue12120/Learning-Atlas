---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 06 - machine learning/05. distributed deep learning.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 44d3fb2b8b69bead34fcc91742b2c088caa09612acbc91952d1bba57a4d2ff84
status: reviewed
---
# 分布式深度学习

*分布式训练把计算分布到多块 GPU 和多台机器上，用于训练单个设备无法容纳或速度过慢的模型。本文件涵盖混合精度、数据并行、模型并行、流水线并行、ZeRO、FSDP、张量并行，以及 all-reduce 等通信原语，它们是大规模训练 LLM 的基础。

**编者注：**原文导语列出 ZeRO 和 FSDP，但正文没有展开介绍。*

- 在单个 GPU 上训练大型神经网络最终会遇到瓶颈：模型可能无法装入内存，或者训练可能需要数月。分布式训练将工作分布到多个设备（GPU、TPU 或整台机器）上，从而更快地训练更大的模型。本文件涵盖了实现这一点的技术。

- 为了理解分布为何重要，先看训练的**计算成本**。一个具有 $d_{\text{in}}$ 个输入和 $d_{\text{out}}$ 个输出的全连接层，在处理包含 $B$ 个样本的批量时，大约需要 $2 \cdot B \cdot d_{\text{in}} \cdot d_{\text{out}}$ FLOPs（浮点运算）：输出矩阵的每个元素各进行一次乘法和加法。反向传播的成本约为前向传播的两倍（分别计算关于输入和权重的梯度），因此全连接层的一次训练步骤约需 $6 \cdot B \cdot d_{\text{in}} \cdot d_{\text{out}}$ FLOPs。

- 对于隐藏维度为 $d$ 的 Transformer 层，自注意力块包含四个投影（Q、K、V 和输出），每个投影的计算量为 $O(B \cdot n \cdot d^2)$ FLOPs（其中 $n$ 是序列长度），此外还要计算复杂度为 $O(B \cdot n^2 \cdot d)$ 的注意力矩阵。前馈块包含两个稠密层，通常先扩展到 $4d$ 再缩回去，计算量为 $O(B \cdot n \cdot 8d^2)$。每层总计算量约为 $O(B \cdot n \cdot 12d^2 + B \cdot n^2 \cdot d)$。乘以层数后，就能看出训练 GPT 规模模型为何需要数千 GPU 小时。

- **内存墙**通常是更严格的限制。在训练过程中，GPU 内存必须同时容纳以下四项内容：

![训练内存构成的堆叠柱状图：参数、梯度、优化器状态和激活值](../images/training_memory_breakdown.svg)


- **参数**：模型权重。一个 70 亿参数的模型使用 FP32（每个参数 4 字节）时，仅权重就需要 28 GB。
- **梯度**：与参数大小相同，另需 28 GB。
- **优化器状态**：Adam 维护两个额外缓冲区（一阶矩和二阶矩估计），每个缓冲区与参数同样大小。即使模型使用低精度，这些状态仍以 FP32 保存以保证数值稳定。对于这个 7B 模型，这部分约为 $2 \times 28 = 56$ GB。
- **激活值**：前向传播期间保存、供反向传播使用的中间值。其大小取决于批量大小、序列长度和模型宽度；它通常是最大的组成部分，并随批量大小线性增长。

- 对于 7B 模型，使用 FP32 Adam 时，参数 28 GB + 梯度 28 GB + 优化器状态 56 GB = 112 GB，还没有计算激活值。单块 80 GB 的 A100 GPU 无法容纳这些内容，这正是分布式策略不可或缺的原因。

- **混合精度训练**是第一道防线。前向和反向传播使用 FP16 或 BF16（16 位），而不是 FP32（32 位）；同时保留一份 FP32 权重主副本，用于优化器更新。

- **FP16** 具有较高精度（10 位尾数），但取值范围有限，可能导致溢出或下溢。**损失缩放**（在反向传播前将损失乘以较大因子，再将梯度除以同一因子）可以缓解这一问题。

- **BF16**（脑浮点数）的指数范围与 FP32（8 位指数）相同，但精度较低（7 位尾数）。它几乎不会溢出，也很少需要损失缩放，因此使用起来更简单。BF16 是现代 Transformer 训练的默认格式。

- 混合精度大约将激活值和梯度的内存占用减少一半（它们是前向/反向传播期间的主要开销），同时将优化器状态保持为 FP32 以确保数值稳定性。

- **数据并行**是最简单的分布式策略。把完整模型复制到 $N$ 块 GPU 上，将每个 mini-batch 分成 $N$ 个等大分片并分发给各 GPU。每块 GPU 独立处理自己的分片并完成前向、反向传播，然后通过 all-reduce 在所有 GPU 间平均梯度，再更新本地模型副本。

- 从模型角度看，这等价于使用大小为原来 $N$ 倍的 mini-batch 训练。若每块 GPU 处理大小为 $B$ 的批次，有效批量大小就是 $N \cdot B$。

![并排比较：数据并行复制模型并拆分数据，模型并行拆分模型并共享数据](../images/data_model_parallelism.svg)


- 梯度平均可以同步或异步进行。**同步 SGD** 等待所有 GPU 完成后再进行平均，从而保证其在数学上等价于使用更大批量的单 GPU 训练。缺点是速度最慢的 GPU（“拖后腿者”）会让所有人等待。

- **异步 SGD** 允许每块 GPU 无需等待，独立更新共享参数服务器。这消除了“拖后腿”问题，但会引入“陈旧梯度”：GPU 可能基于略微过时的参数计算梯度。陈旧梯度会增加噪声并减慢收敛。实践中更常用通信高效的同步 SGD。

- **梯度累积**是一种软件技巧，用于在有限硬件上模拟更大的批量大小。不再每个 mini-batch 更新一次，而是运行多次前向/反向传播并累加梯度，然后更新一次。这样无需为激活值分配更多 GPU 内存（内存中一次只有一个 mini-batch 的激活值），也能得到与更大批量相同的结果。

- 当模型本身太大、单个 GPU 无法容纳时，需要使用**模型并行**。主要有两种形式。

- **张量并行**将单个层拆分到多块 GPU 上。一个大型矩阵乘法 $Y = XW$ 可以按列分割：将 $W$ 划分为 $[W_1, W_2]$，分别放在两块 GPU 上；然后在两块 GPU 上并行计算 $Y_1 = XW_1$ 和 $Y_2 = XW_2$，最后将结果拼接起来。这适用于注意力投影和前馈层。它需要 GPU 之间的高速通信（通常在节点内使用 NVLink），因为每层都必须合并局部结果。

- **流水线并行**将不同层分配给不同 GPU。GPU 0 运行第 1–4 层，GPU 1 运行第 5–8 层，依此类推。数据像装配线一样通过流水线。朴素方法会产生“流水线气泡”：GPU 0 处理微批次 1 的前向传播时，GPU 1–3 处于空闲状态。**微批处理**将 mini-batch 切分成更小的微批次，并依次送入流水线，从而大部分时间都能让所有 GPU 保持忙碌。

- **混合并行**结合数据、张量和流水线并行。一个典型的大型模型设置可能在一个节点内（8 块通过高速 NVLink 连接的 GPU）使用张量并行，跨节点使用流水线并行，并在节点组之间使用数据并行。这就是 GPT-4 和 Llama 等模型的训练方式。

- 分布式训练的效率很大程度上取决于**通信**。关键操作是 **all-reduce（全归约）**：给定 $N$ 块 GPU 上各自的值，计算总和（或平均值），再把结果分发给所有 GPU。

- 朴素的 all-reduce 会将所有数据发送到一块 GPU，在那里求和后再广播回来。其通信量为 $O(N)$，并会在根节点形成瓶颈。

- **环形 all-reduce（全归约）**效率更高。将 $N$ 块 GPU 排成环，每块 GPU 把数据分成 $N$ 个分片。在 $N - 1$ 个步骤中，每块 GPU 向一个邻居发送一个分片，同时从另一个邻居接收一个分片，并累加部分和。再经过 $N - 1$ 个步骤，完整总和会传播到所有 GPU。每块 GPU 传输的数据量为原始数据大小的 $2(N-1)/N$ 倍，随着 $N$ 增大趋近于 $2$ 倍。关键是，这个量不随 $N$ 增长，因此达到了带宽最优。

![四块 GPU 排成环形，每块 GPU 将梯度分片传给邻居，直到所有 GPU 都拥有完整总和](../images/ring_allreduce.svg)


- **参数服务器**是一种替代架构，其中专用服务器节点保存模型参数。工作节点计算梯度并将其发送到服务器；服务器更新参数后再发回。这更简单，但可能在服务器处形成通信瓶颈。

- **NCCL**（NVIDIA 集合通信库）是 GPU 到 GPU 通信的标准库。它为 all-reduce、all-gather、broadcast 及其他集合通信操作提供优化实现，并自动根据网络拓扑选择最佳算法。

- **缩放定律**描述模型性能如何随计算量、数据量和模型规模提升。Kaplan 等人（2020）的原始缩放定律发现，损失会分别随参数量、数据集大小和计算预算按幂律下降：

$$L(N) \propto N^{-\alpha_N}, \quad L(D) \propto D^{-\alpha_D}, \quad L(C) \propto C^{-\alpha_C}$$
- $N$ 是参数数量，$D$ 是数据集大小，$C$ 是计算预算。

- **Chinchilla 缩放定律**（Hoffmann 等，2022）表明，大多数模型训练不足：给定计算预算时，应在比此前设想更多的数据上训练更小的模型。最佳比例约为每个参数 20 个词元；7B 模型按这个比例约需 140B 个词元。这一发现推动了“计算最优”训练。**编者注：**原文称 Llama 1 的 65B 模型使用 300B 个 token 训练，这与 LLaMA 论文报告的 1.4T 个训练词元不符（[LLaMA 论文](https://arxiv.org/abs/2302.13971)）。

- **混合专家（MoE）**是一种在不按比例增加计算量的情况下扩展模型容量的架构。每个 Transformer 层不再只有一个前馈网络，而是包含 $N$ 个专家网络（每个都是标准 FFN）。**门控网络**（路由器）检查每个词元，并将其路由到得分最高的 $K$ 个专家（通常 $K=1$ 或 $K=2$）。

![词元通过门控网络路由到选定专家，采用 Top-K 稀疏路由并对输出加权组合](../images/moe_routing.svg)


- 总参数量很大（因为有 $N$ 个专家），但每个词元的 FLOPs 大致不变（因为每个词元只激活 $K$ 个专家）。例如，Mixtral 8x7B 总共有 47B 个参数，但每次前向传播只使用约 13B 个参数，因此以较低成本接近更大模型的性能。

- MoE 引入了挑战。**负载均衡**：如果路由器将大多数词元发送到同一专家，其余的则会被浪费。辅助损失鼓励均匀路由。**通信**：不同的专家可能位于不同的 GPU 上，因此路由词元需要进行全对全通信，这非常昂贵。

- **故障恢复能力**在训练持续数周或数月、使用数千块 GPU 时至关重要。如果单个 GPU 发生故障，你不会希望丢失全部进度。**检查点机制**会定期将模型权重、优化器状态和训练状态（学习率、步数、数据位置）保存到磁盘。发生故障时，可以从最近的检查点重新开始。

- **梯度检查点**（也称为激活重计算）是一种内存优化，而不是故障恢复机制。前向传播时，不保存供反向传播使用的全部激活值，而只保存某些检查点处的激活值；反向传播时，再根据检查点重新计算缺失的激活值。这是在计算和内存之间做权衡：训练计算量通常约增加 33%，但可将激活内存减少一个 $\sqrt{L}$ 的因子（其中 $L$ 是层数）。**编者注：**原文称增加的是“前向传播成本”；实际额外计算来自反向传播时重算激活，这里按训练总计算量表述。

- 综合来看，训练前沿模型需要结合多种技术：BF16 混合精度；使用环形 all-reduce 的数千块 GPU 数据并行；节点内张量并行；跨节点流水线并行；用于节省内存的梯度检查点；用于提高参数效率的 MoE；以及用于故障恢复的定期检查点。系统工程与算法设计同样具有挑战性。

- 概述分布式训练工具：

| 技术 | 作用 | 代价 |
|---|---|---|
| 混合精度（BF16） | 减少激活和梯度的内存占用 | 轻微数值差异 |
| 数据并行 | 在 GPU 间扩展批量大小 | 梯度同步通信开销 |
| 张量并行 | 将层拆分到多块 GPU | 需要高速互连 |
| 流水线并行 | 将模型阶段拆分到多块 GPU | 流水线气泡（计算浪费） |
| 梯度累积 | 模拟大批量训练 | 更慢，需要多次前向和反向传播 |
| 梯度检查点 | 减少激活内存 | 计算量增加约 33% |
| 环形 all-reduce | 高效平均梯度 | 大模型受带宽限制 |
| MoE | 以相近 FLOPs 提供更大容量 | 负载均衡和路由复杂度 |
| 缩放定律 | 指导计算资源分配 | 属于经验规律，不一定适用于所有规模 |

## 编程任务（使用 CoLab 或笔记本）

1. 计算 Transformer 层的 FLOPs 和内存需求。给定隐藏维度 $d$、序列长度 $n$、批量大小 $B$ 和层数，估计总训练成本。

**编者注：**原文代码中的注意力权重内存估算 `attn_mem = B * n * n * dtype_bytes` 没有计入注意力头数，因此会低估多头注意力的内存；该写法只能视作单头近似。
```python
import jax.numpy as jnp

def transformer_layer_flops(d, n, B):
    """Approximate FLOPs for one transformer layer forward pass."""
    # QKV projections: 3 * (B * n * d * d) * 2 (multiply-add)
    qkv_flops = 3 * 2 * B * n * d * d
    # Attention: (B * n * n * d) * 2 for QK^T, (B * n * n * d) * 2 for attn*V
    attn_flops = 2 * 2 * B * n * n * d
    # Output projection: (B * n * d * d) * 2
    out_flops = 2 * B * n * d * d
    # FFN: two layers, d->4d and 4d->d: 2 * (B * n * d * 4d) * 2
    ffn_flops = 2 * 2 * B * n * d * 4 * d
    return qkv_flops + attn_flops + out_flops + ffn_flops

def transformer_layer_memory(d, n, B, dtype_bytes=2):
    """Approximate activation memory (bytes) for one layer."""
    # QKV: 3 * B * n * d
    qkv_mem = 3 * B * n * d * dtype_bytes
    # Attention weights: B * heads * n * n (approx B * n * n * sizeof)
    attn_mem = B * n * n * dtype_bytes
    # FFN intermediate: B * n * 4d
    ffn_mem = B * n * 4 * d * dtype_bytes
    return qkv_mem + attn_mem + ffn_mem

# Example: GPT-2 scale
d, n, B, L = 1024, 1024, 8, 24
fwd_flops = transformer_layer_flops(d, n, B)
total_flops = 3 * L * fwd_flops  # 3x for forward + backward
act_mem = L * transformer_layer_memory(d, n, B)
param_count = L * (12 * d * d + 13 * d)  # approximate

print(f"Model: d={d}, n={n}, B={B}, L={L}")
print(f"Parameters: {param_count / 1e6:.0f}M")
print(f"FLOPs per step: {total_flops / 1e12:.2f} TFLOPs")
print(f"Activation memory: {act_mem / 1e9:.2f} GB (BF16)")
print(f"Parameter memory (FP32): {param_count * 4 / 1e9:.2f} GB")
print(f"Adam optimizer memory: {param_count * 8 / 1e9:.2f} GB")
print(f"Total training memory: {(param_count * 16 + act_mem) / 1e9:.2f} GB")
```

2. 模拟数据并行训练。将数据集拆分到多个“虚拟 GPU”上，独立计算梯度并求平均，然后验证结果与单 GPU 训练相匹配。
```python
import jax
import jax.numpy as jnp

# Simple linear model: y = wx + b
key = jax.random.PRNGKey(0)
X = jax.random.normal(key, (64, 4))
w_true = jnp.array([1.0, -2.0, 3.0, 0.5])
y = X @ w_true + 0.1 * jax.random.normal(key, (64,))

def loss_fn(w, X, y):
    return jnp.mean((X @ w - y) ** 2)

grad_fn = jax.grad(loss_fn)

# Single GPU: full batch gradient
w = jnp.zeros(4)
grad_single = grad_fn(w, X, y)

# Data parallel: split across 4 "GPUs"
n_gpus = 4
chunk_size = len(X) // n_gpus
grads = []
for i in range(n_gpus):
    X_chunk = X[i*chunk_size:(i+1)*chunk_size]
    y_chunk = y[i*chunk_size:(i+1)*chunk_size]
    grads.append(grad_fn(w, X_chunk, y_chunk))

# All-reduce: average gradients
grad_parallel = jnp.mean(jnp.stack(grads), axis=0)

print("Single-GPU gradient:", grad_single)
print("Data-parallel gradient (avg):", grad_parallel)
print(f"Match: {jnp.allclose(grad_single, grad_parallel, atol=1e-5)}")

# Train both and compare
w_single, w_parallel = jnp.zeros(4), jnp.zeros(4)
lr = 0.1
for step in range(100):
    w_single = w_single - lr * grad_fn(w_single, X, y)

    grads = [grad_fn(w_parallel, X[i*chunk_size:(i+1)*chunk_size],
                     y[i*chunk_size:(i+1)*chunk_size]) for i in range(n_gpus)]
    avg_grad = jnp.mean(jnp.stack(grads), axis=0)
    w_parallel = w_parallel - lr * avg_grad

print(f"\nAfter 100 steps:")
print(f"Single-GPU weights: {w_single}")
print(f"Data-parallel weights: {w_parallel}")
print(f"Max difference: {jnp.max(jnp.abs(w_single - w_parallel)):.2e}")
```

3. 实现一个简单的混合专家层。创建一个门控网络，将词元路由到前 $K$ 个专家，并组合它们的输出。
```python
import jax
import jax.numpy as jnp

def expert_fn(x, W1, b1, W2, b2):
    """Simple 2-layer FFN expert."""
    h = jnp.maximum(0, x @ W1 + b1)  # ReLU
    return h @ W2 + b2

def moe_layer(x, gate_W, experts_params, top_k=2):
    """
    MoE forward pass.
    x: (batch, d_model)
    gate_W: (d_model, n_experts)
    experts_params: list of (W1, b1, W2, b2) per expert
    """
    n_experts = len(experts_params)

    # Gating: compute routing scores
    gate_logits = x @ gate_W  # (batch, n_experts)
    gate_probs = jax.nn.softmax(gate_logits, axis=-1)

    # Top-K selection
    top_k_indices = jnp.argsort(-gate_probs, axis=-1)[:, :top_k]
    top_k_probs = jnp.take_along_axis(gate_probs, top_k_indices, axis=-1)
    # Renormalise
    top_k_probs = top_k_probs / jnp.sum(top_k_probs, axis=-1, keepdims=True)

    # Compute expert outputs (simplified: run all experts, mask later)
    expert_outputs = jnp.stack([
        expert_fn(x, *experts_params[i]) for i in range(n_experts)
    ], axis=1)  # (batch, n_experts, d_model)

    # Gather top-K expert outputs and weight them
    batch_idx = jnp.arange(x.shape[0])[:, None]
    selected_outputs = expert_outputs[batch_idx, top_k_indices]  # (batch, top_k, d_model)
    output = jnp.sum(selected_outputs * top_k_probs[:, :, None], axis=1)

    return output, gate_probs

# Setup
key = jax.random.PRNGKey(42)
batch, d_model, d_ff, n_experts = 8, 16, 32, 4

# Initialise experts
experts_params = []
for i in range(n_experts):
    k1, k2, key = jax.random.split(key, 3)[0], jax.random.split(key, 3)[1], jax.random.split(key, 3)[2]
    experts_params.append((
        jax.random.normal(k1, (d_model, d_ff)) * 0.1,
        jnp.zeros(d_ff),
        jax.random.normal(k2, (d_ff, d_model)) * 0.1,
        jnp.zeros(d_model),
    ))

key, subkey = jax.random.split(key)
gate_W = jax.random.normal(subkey, (d_model, n_experts)) * 0.1
x = jax.random.normal(key, (batch, d_model))

output, gate_probs = moe_layer(x, gate_W, experts_params, top_k=2)

print(f"Input shape: {x.shape}")
print(f"Output shape: {output.shape}")
print(f"Gate probabilities (first sample): {gate_probs[0]}")
print(f"Expert usage (avg across batch):")
for i in range(n_experts):
    usage = jnp.mean(gate_probs[:, i])
    print(f"  Expert {i}: {usage:.3f}")
```
