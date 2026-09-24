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

*分布式训练将计算分布在多个GPU和机器上，以训练太大型或太慢的模型。本文件涵盖了混合精度、数据并行性、模型并行性、流水线并行性和ZeRO、FSDP、张量并行性和通信原语如所有减少等，这些对于在大规模下训练LLM至关重要。*

- 在单个GPU上训练大型神经网络最终会遇到瓶颈。模型可能无法放入内存，或者训练时间可能需要数月。分布式训练将工作分布在多个设备（GPU、TPU或整个机器）上，以更快地训练更大和更复杂的模型。本文件涵盖了使这一切成为可能的技术。

- 为了理解为什么分布很重要，从训练的计算成本开始。一个包含 $d_{\text{in}}$ 输入和 $d_{\text{out}}$ 输出的全连接层在处理一个包含 $B$ 个示例的批量时，大约需要 $2 \cdot B \cdot d_{\text{in}} \cdot d_{\text{out}}$ 个 FLOPs（浮点运算）。反向传播的成本大约是前向传播的两倍（计算输入和权重的梯度），因此一个全连接层的训练步骤大约需要 $6 \cdot B \cdot d_{\text{in}} \cdot d_{\text{out}}$ 个 FLOPs。

- 对于隐藏维度为 \( d_{\text{hidden}} \) 的 Transformer 层。 $d$自注意力块涉及四个投影（Q、K、V和输出），每个都成本高昂。 $O(B \cdot n \cdot d^2)$ 浮点运算量（FLOPs） $n$ 是序列长度，加上注意力矩阵计算。 $O(B \cdot n^2 \cdot d)$前馈块包含两个全连接层，通常会扩大到 $4d$ 然后： $O(B \cdot n \cdot 8d^2)$总层数：大约 $O(B \cdot n \cdot 12d^2 + B \cdot n^2 \cdot d)$将模型层数相乘，就能理解训练GPT规模模型需要成千上万的GPU小时。

- **内存墙**通常是最大的限制。在训练过程中，GPU内存必须同时持有以下四项内容：

![三维空间中的向量](../images/training_memory_breakdown.svg)


- **参数**：模型权重。一个7亿参数的FP32（每个参数4字节）需要28 GB仅用于权重。
- **梯度**：与参数大小相同。另一个28 GB。
- **优化器状态**：Adam维护两个额外的缓冲区（第一和第二阶估计），每个与参数大小相同。这些在使用较低精度时仍然保持FP32以确保数值稳定性。对于我们的7B模型，这大约是$2 \times 28 = 56$ GB。
- **激活值**：在前向传播过程中保存的中间值，用于后向传播。大小取决于批量大小、序列长度和模型宽度。这是最大的组成部分，并且随着批量大小线性增长。

- 对于我们的7B模型，使用FP32 Adam：28（参数）+ 28（梯度）+ 56（优化器）= 112 GB，在计算激活之前。单个80 GB的A100 GPU无法容纳这个。这就是为什么分布式策略至关重要。

- 混合精度训练是第一道防线。你使用FP16或BF16（16位）而不是FP32（32位）进行前向和后向传播，同时保留权重的主副本在FP32中用于优化器更新。

- FP16具有高精度（10位尾数），但范围有限，可能导致溢出或下溢。通过在反向传播之前将损失乘以一个大因子，然后除以相同的因子来缓解这个问题。

- **BF16**（脑浮点）的指数范围与FP32（8位指数）相同，但精度较低（7位尾数）。它几乎从不溢出，并且很少需要缩放，因此使用起来更简单。BF16是现代变换器训练的默认设置。

- 混合精度大约将激活和梯度的内存消耗减少一半（在前向/反向传播期间是主要开销），同时保持优化器状态为FP32以确保数值稳定性。

- **数据并行**是最简单的分布式策略。您将整个模型复制到$N$个GPU上，将每个mini-batch分成$N$等份，并将每一份发送到每个GPU。每个GPU独立地运行其chunk的前向和反向传播。然后，所有GPU（使用all-reduce操作）平均梯度，每个GPU更新其本地模型副本。

- 从模型的角度来看，这相当于使用一个大小为 $N$ 倍的 mini-batch进行训练。如果每个 GPU 处理的批处理大小为 $B$，则有效批量大小为 $N \cdot B$。

![并行计算：数据并行复制模型和分割数据，模型并行分割模型共享数据](../images/data_model_parallelism.svg)


- 梯度平均可以同步或异步进行。 **同步SGD** 在所有GPU完成之前才进行平均，确保与单GPU训练使用更大批量的数学等效性。缺点是速度最慢的GPU（“拖后腿”的GPU）会拖累所有人。

- **异步SGD** 让每个GPU独立地更新共享参数服务器，而不等待。这消除了“慢行者”问题，但引入了“过时梯度”：一个GPU可能基于稍有 outdated的参数计算梯度。过时梯度增加了噪声，并且可能会减缓收敛速度。在实践中，高效通信的同步SGD是 preferred。

- **梯度累积** 是一种软件技巧，用于在有限硬件上模拟更大的批量大小。而不是逐个批次进行一次更新，你运行多个前向和后向传播，并累加梯度，然后进行一次更新。这与使用更大批量的结果相同，不需要更多的GPU内存来存储激活（每次只有一个mini-batch的激活在内存中）。

- 当模型本身太大无法单个GPU容纳时，需要使用**模型并行性**。主要有两种形式。

- **张量并行**将单个层拆分到GPU上。一个大型矩阵乘法 $Y = XW$ 可以按列分割：将 $W$ 分割成两个GPU上的 $[W_1, W_2]$，然后在两个GPU上并行计算 $Y_1 = XW_1$ 和 $Y_2 = XW_2$，最后拼接。这适用于注意力投影和前馈层。它需要在GPU之间快速通信（通常在节点内使用 NVLink），因为每个层的中间结果必须在每层中合并。

- **流水线并行**将不同层分配给不同的GPU。GPU 0运行第1到第4层，GPU 1运行第5到第8层，依此类推。数据通过流水线流动，就像装配线一样。 naive方法有一个“流水线气泡”：当GPU 0处理微批量1的前向传播时，GPU 1-3处于闲置状态。 **微批量**通过在流水线上按顺序流过来缓解这个问题，从而使得所有GPU大部分时间都忙碌着。

- **混合并行**结合数据、张量和流水线并行。一个典型的大型模型设置可能在一个节点（8个通过快速NVLink连接的GPU）中使用张量并行，跨节点使用流水线并行，跨组节点使用数据并行。这就是像GPT-4和Llama这样的模型是如何训练的。

- 分布式训练的效率很大程度上依赖于通信。关键操作是“所有reduce”：给定每个节点上的值，将它们汇总到一个全局值上。 $N$ GPU计算总和（或平均值），并将结果分配给所有GPU。

- 一个简单的所有广播将所有数据发送到一个GPU，进行求和后广播回。这在通信中是$O(N)$，并且在根节点处创建瓶颈。

- **环形所有进程**效率更高。将$N$个GPU排列成一个环。每个GPU将其数据分成$N$块。在$N - 1$步中，每个GPU向其邻居发送一块数据，并从其其他邻居接收一块数据，逐步累加部分和。经过另一个$N - 1$步后，整个全和被传播到所有GPU。每个GPU传输的数据量为原始数据大小的$2(N-1)/N$倍，随着$N$增加时接近$2\times$。关键的是，这不会随$N$增加而增加，因此 bandwidth最优。

![四个GPU排列成一个环形，每个GPU将梯度块传递给相邻的GPU，直到所有GPU都拥有完整的总和](../images/ring_allreduce.svg)


- 参数服务器是一种替代架构，其中专门的服务器节点持有模型参数。工作节点计算梯度并将其发送到服务器，服务器更新参数并将它们返回。这更简单，但可能会在服务器上创建通信瓶颈。

- NCCL（NVIDIA的GPU通信库）是标准的GPU到GPU通信库。它提供了优化的实现，包括所有广播、所有聚合和广播等集体操作，并自动选择最佳算法以适应网络拓扑结构。

- **模型性能的缩放定律**描述了随着计算、数据和模型大小增加时，模型性能如何改善。原始的 Kaplan 等人（2020）发现，损失随着每次的幂律变化而减少：

$$L(N) \propto N^{-\alpha_N}, \quad L(D) \propto D^{-\alpha_D}, \quad L(C) \propto C^{-\alpha_C}$$
- $N$ 是参数数量，$D$ 是数据集大小，$C$ 是计算预算。

- **Chinchilla缩放定律**（Hoffmann等人，2022）表明大多数模型是过拟合的：对于给定的计算预算，你应该在更多的数据上训练一个较小的模型。最佳比例大约为每20个参数140万个标记。一个7B模型应该看到约140亿个标记，而不是Llama 1使用65B模型时的300亿个标记。这一发现推动了“计算最优”训练的方向。

- **混合专家（MoE）** 是一种架构，可以在不按比例增加计算能力的情况下，扩展模型容量。而不是在每个 transformer 层中使用一个 feed-forward 网络，你有 $N$ 个专家网络（每个都是标准的 FFN）。一个 **引导网络**（路由器）会检查每个标记，并将其发送到顶部-$K$ 个专家（通常为 $K = 1$ 或 $K = 2$）。

![令牌通过门控网络路由到选定专家，使用Top-K稀疏路由和输出的加权组合](../images/moe_routing.svg)


- 总参数数量很大（因为您有 $N$ 专家），但每个 token 的 FLOPs 大致保持不变（因为只有 $K$ 专家在每个 token 上激活）。例如，Mixtral 8x7B 总共有 47B 参数，但在前向传递中只使用约 13B，这使得性能接近一个更大的模型，但成本较低。

- MoE 引入了挑战。**负载均衡**：如果路由器将大多数令牌发送到同一专家，其余的则会被浪费。辅助损失鼓励均匀路由。**通信**：不同的专家可能位于不同的 GPU 上，因此路由令牌需要进行全对全通信，这非常昂贵。

- **故障恢复能力**在训练持续数周或数月时对数千个GPU至关重要。如果单个GPU失败，您不想丢失所有进度。**定期保存模型权重、优化器状态和训练状态（学习率、步数、数据位置）到磁盘**。如果发生故障，您可以从最近的检查点重新开始。

- **梯度检查点**（也称为激活重计算）是一种内存优化，而不是故障恢复机制。在前向传播过程中，你只保存某些检查点的激活值，而不是整个前向传播过程中的所有激活值。在反向传播过程中，你从检查点重新计算缺失的激活值。这在计算上会增加前向传播的成本，大约为33%，但可以减少激活内存因子$\sqrt{L}$（其中$L$是层数）。

- 将所有这些技术结合起来，训练前沿模型需要使用这些方法：BF16混合精度、数千个GPU的数据并行以及节点间环形所有reduce、节点内的张量并行、节点间的流水线并行、梯度检查点以减少内存、MoE以提高参数效率以及节点间的故障恢复检查点。系统工程与算法设计一样具有挑战性。

- 概述分布式训练工具：

| 技术 | 作用 | 交易 |
|---|---|---| 混合精度 (BF16) | 减少激活和梯度的内存使用量 | 小数差异 |
| 数据并行性 | 在 GPU 上批量大小按比例扩展 | 梯度同步的通信开销 |
| 张量并行性 | 将层拆分到 GPUs 上 | 需要快速的互连 |
| 管道并行性 | 将模型阶段拆分到 GPUs 上 | 管道气泡（浪费计算） |
| 梯度累积 | 模拟大批量 | 更慢（多个前向和后向传递） |
| 梯度检查点 | 减少激活内存 | ~33% 更多计算 |
| 环形所有节点汇总 | 有效的梯度平均 | 对于大型模型，带宽受限 |
| MoE | 更大的容量，相同的FLOPs | 负载均衡和路由复杂性 |
| 扩展定律 | 指导计算分配 | 实验性的，可能在所有规模都不适用 |

## 编程任务（使用CoLab或笔记本）

1. 计算变换器层的FLOPs和内存要求。给定隐藏维度 $d$，序列长度 $n$，批量大小 $B$ 和层数，估计总训练成本。
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

2. 模拟数据并行训练。将数据集拆分为多个“虚拟GPU”，独立计算梯度，平均它们，并验证结果与单GPU训练匹配。
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

3. 实现一个简单的混合专家层。创建一个 gating网络，将令牌路由到前K个专家并组合他们的输出。
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
