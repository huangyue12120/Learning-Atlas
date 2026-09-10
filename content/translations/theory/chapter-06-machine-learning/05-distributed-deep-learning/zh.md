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

*分布式训练把计算分摊到多张 GPU 和多台机器上，用于训练单个设备无法容纳或速度太慢的模型。本篇介绍混合精度、数据并行、模型并行、流水线并行、ZeRO、FSDP、张量并行，以及 all-reduce 等通信原语；这些都是大规模训练 LLM 的基础。*

- 在单张 GPU 上训练大型神经网络最终会遇到瓶颈：模型可能放不进显存，或者训练需要数月。分布式训练把工作分摊到多个设备（GPU、TPU 或整台机器），从而更快地训练更大的模型。本篇介绍实现这一目标的技术。

- 要理解分布式为何重要，可以先看训练的**计算成本**。一个批次大小为 $B$、输入维度为 $d_{\text{in}}$、输出维度为 $d_{\text{out}}$ 的稠密层，一次前向传播大约需要 $2 \cdot B \cdot d_{\text{in}} \cdot d_{\text{out}}$ 次 FLOP（浮点运算）：输出矩阵的每个元素各进行一次乘法和加法。反向传播还要计算相对于输入和权重的梯度，成本约为前向的两倍，因此稠密层的一次训练步约需要 $6 \cdot B \cdot d_{\text{in}} \cdot d_{\text{out}}$ 次 FLOP。

- 对于隐藏维度为 $d$ 的 Transformer 层，自注意力块包含四个投影（Q、K、V 和输出），每个投影的成本为 $O(B \cdot n \cdot d^2)$ FLOP（$n$ 是序列长度），另有成本为 $O(B \cdot n^2 \cdot d)$ 的注意力矩阵计算。前馈块有两个稠密层，通常先扩展到 $4d$ 再缩回去：$O(B \cdot n \cdot 8d^2)$。每层总成本约为 $O(B \cdot n \cdot 12d^2 + B \cdot n^2 \cdot d)$。乘以层数后，就能看出训练 GPT 规模模型为何需要数千 GPU 小时。

- **内存墙**往往是更严格的约束。训练时，GPU 显存必须同时容纳四类内容：

![训练内存组成的堆叠柱状图：参数、梯度、优化器状态和激活](../images/training_memory_breakdown.svg)

- **参数**：模型权重。一个 70 亿参数模型若使用 FP32（每个参数 4 字节），仅权重就需要 28 GB。
- **梯度**：与参数大小相同，另需 28 GB。
- **优化器状态**：Adam 维护两个额外缓冲区（一次和二次矩估计），每个与参数大小相同。即使模型使用低精度，这些状态也以 FP32 保存以保证数值稳定性。对 7B 模型而言，这需要 $2 \times 28 = 56$ GB。
- **激活**：前向传播中保存、供反向传播使用的中间值。大小取决于 batch size、序列长度和模型宽度，通常是最大的一项，并且随 batch size 线性增长。

- 对使用 FP32 Adam 的 7B 模型，参数 28 GB + 梯度 28 GB + 优化器状态 56 GB = 112 GB，还没计算激活。单张 80 GB 的 A100 放不下这些内容，因此分布式策略不可或缺。

- **混合精度训练**是第一道防线。与把一切都以 FP32（32 位浮点数）保存不同，训练的前向和反向传播使用 FP16 或 BF16（16 位），同时为优化器更新保留一份 FP32 主权重副本。

- **FP16**精度高（10 位尾数），但表示范围有限，可能溢出或下溢。损失缩放（在反向传播前把损失乘以较大因子，再把梯度除以同一因子）可以缓解这个问题。

- **BF16**（brain float）拥有与 FP32 相同的指数范围（8 位指数），但精度更低（7 位尾数）。它几乎不会溢出，也很少需要损失缩放，使用起来更简单。BF16 是现代 Transformer 训练的默认格式。

- 混合精度大致可以把激活和梯度的内存减半（它们是前向/反向期间占主导的成本），同时保留 FP32 优化器状态以确保数值稳定。

- **数据并行**是最简单的分布式策略。在 $N$ 张 GPU 上复制整个模型，把每个 mini-batch 等分成 $N$ 个小块，每张 GPU 接收一个小块。每张 GPU 独立对自己的数据执行前向和反向传播，然后使用 all-reduce 操作在所有 GPU 之间平均梯度，最后每张 GPU 更新自己的模型副本。

- 从模型角度看，这等价于使用大 $N$ 倍的 mini-batch 训练。如果每张 GPU 处理大小为 $B$ 的 batch，有效 batch size 就是 $N \cdot B$。

![对比数据并行和模型并行：数据并行复制模型并切分数据，模型并行切分模型并共享数据](../images/data_model_parallelism.svg)

- 梯度平均可以同步进行，也可以异步进行。**同步 SGD** 等待所有 GPU 完成后再平均，保证数学上等价于使用更大 batch 的单 GPU 训练。缺点是最慢的 GPU（“掉队者”）会拖住所有其他 GPU。

- **异步 SGD** 允许每张 GPU 独立更新共享参数服务器，无需等待。这消除了掉队者问题，但会引入“陈旧梯度”：某张 GPU 计算梯度时使用的参数可能略微过时。陈旧梯度会增加噪声、减慢收敛。实践中更常用通信高效的同步 SGD。

- **梯度累积**是在硬件有限时模拟更大 batch 的软件技巧。不是每个 mini-batch 都更新一次，而是执行多次前向/反向传播并累积梯度，再更新一次。这样无需为激活分配更大的显存（任一时刻只保存一个 mini-batch 的激活），却能得到大 batch 的效果。

- 当模型本身太大、无法放入单张 GPU 时，需要**模型并行**。模型并行主要有两种形式。

- **张量并行**把单个层拆到多张 GPU 上。大型矩阵乘法 $Y = XW$ 可以按列切分：把 $W$ 分成 $[W_1, W_2]$ 放在两张 GPU 上，并行计算 $Y_1 = XW_1$ 和 $Y_2 = XW_2$，再拼接结果。这适用于注意力投影和前馈层。它要求 GPU 之间有快速通信（通常是节点内 NVLink），因为每层都要合并局部结果。

- **流水线并行**把不同层分配给不同 GPU。GPU 0 运行第 1–4 层，GPU 1 运行第 5–8 层，以此类推。数据像流水线上的装配件一样流动。朴素方法会产生“流水线气泡”：GPU 0 处理微批次 1 的前向时，GPU 1–3 都在空转。**微批处理**把 mini-batch 拆成依次流过流水线的更小微批次，从而让所有 GPU 大多数时间保持忙碌。

- **混合并行**结合数据并行、张量并行和流水线并行。典型的大模型配置是在节点内用张量并行（8 张 GPU 通过高速 NVLink 连接），跨节点用流水线并行，再在节点组之间用数据并行。GPT-4 和 Llama 等模型就是这样训练的。

- 分布式训练的效率高度依赖**通信**。关键操作是 **all-reduce**：每张 GPU 上都有一个值，计算它们的和（或平均值），并把结果分发给所有 GPU。

- 朴素 all-reduce 把所有数据发送到一张 GPU，在那里求和，再广播回去。通信量为 $O(N)$，并且根 GPU 会成为瓶颈。

- **环形 all-reduce**高效得多。把 $N$ 张 GPU 排成环，每张 GPU 将数据切成 $N$ 个块。在 $N - 1$ 个步骤中，每张 GPU 把一个块发送给邻居、从另一个邻居接收块，并累积局部和。再经过 $N - 1$ 个步骤，把完整的和传播到所有 GPU。每张 GPU 传输的数据总量是数据大小的 $2(N-1)/N$ 倍，随着 $N$ 增大趋近于 $2\times$。关键是它不会随 $N$ 增长，因此达到了带宽最优。

![四张 GPU 排成环形，梯度分块在邻居之间传递，直到每张 GPU 都拥有完整的和](../images/ring_allreduce.svg)

- **参数服务器**是另一种架构：专用服务器节点保存模型参数，工作节点计算梯度并发送给服务器；服务器更新参数，再把参数发回工作节点。这种方案更简单，但服务器可能成为通信瓶颈。

- **NCCL（NVIDIA 集合通信库）**是 GPU-to-GPU 通信的标准库。它提供 all-reduce、all-gather、broadcast 和其他集合操作的优化实现，并能根据网络拓扑自动选择最佳算法。

- **扩展定律**描述模型性能如何随计算量、数据量和模型规模提升。Kaplan 等人（2020）的原始扩展定律发现，损失分别随它们呈幂律下降：

$$L(N) \propto N^{-\alpha_N}, \quad L(D) \propto D^{-\alpha_D}, \quad L(C) \propto C^{-\alpha_C}$$

- 其中 $N$ 是参数数量，$D$ 是数据集大小，$C$ 是计算预算。

- **Chinchilla 扩展定律**（Hoffmann 等，2022）指出，大多数模型训练不足：给定计算预算时，应当在更多数据上训练更小的模型，比过去的做法更合理。最佳比例大约是每个参数 20 个 token。7B 模型应看到约 140B 个 token，而不是 Llama 1 使用 65B 模型时的 300B token。这一发现推动领域转向“计算最优”训练。

- **混合专家（Mixture of Experts，MoE）**是一种在不按比例增加计算量的情况下扩展模型容量的架构。Transformer 层不再只有一个前馈网络，而是有 $N$ 个“专家”网络（每个都是标准 FFN）。**门控网络**（路由器）检查每个 token，并把它发送给概率最高的 $K$ 个专家（通常 $K = 1$ 或 $K = 2$）。

![token 经过门控网络路由到选中的专家，采用 top-K 稀疏路由并加权组合输出](../images/moe_routing.svg)

- 总参数量会大得多（因为有 $N$ 个专家），但每个 token 的 FLOP 大致保持不变（因为每个 token 只激活 $K$ 个专家）。例如，Mixtral 8x7B 总参数量为 47B，但一次前向只使用约 13B 参数，以较小成本提供更大模型的性能。

- MoE 带来新的挑战。**负载均衡**：如果路由器把大多数 token 都发给同一个专家，其他专家就被浪费；辅助损失会鼓励均匀路由。**通信**：不同专家可能位于不同 GPU，路由 token 需要 all-to-all 通信，代价很高。

- 训练运行持续数周或数月、使用数千张 GPU 时，**容错**至关重要。如果一张 GPU 失败，我们不希望丢失全部进度。**检查点**会定期把模型权重、优化器状态和训练状态（学习率、步数、数据位置）保存到磁盘；发生故障时从最近的检查点重启。

- **梯度检查点**（也称激活重计算）是内存优化，而不是容错机制。前向传播时不保存所有激活供反向使用，只在特定检查点保存激活；反向传播时从检查点重新计算缺失激活。这是用计算换内存：前向成本约增加 33%，但激活内存可减少到原来的 $\sqrt{L}$ 分之一（$L$ 是层数）。

- 综合来看，训练前沿模型会结合所有这些技术：BF16 混合精度、数千张 GPU 上的数据并行与环形 all-reduce、节点内张量并行、跨节点流水线并行、用梯度检查点降低内存、用 MoE 提高参数效率，以及定期检查点实现容错。系统工程和算法设计一样具有挑战性。

- 分布式训练工具箱可以总结如下：

| 技术 | 作用 | 权衡 |
|---|---|---|
| 混合精度（BF16） | 将激活/梯度内存减半 | 轻微的数值差异 |
| 数据并行 | 跨 GPU 扩展 batch size | 梯度同步带来的通信开销 |
| 张量并行 | 将层拆到多张 GPU | 需要高速互连 |
| 流水线并行 | 将模型阶段拆到多张 GPU | 流水线气泡（计算浪费） |
| 梯度累积 | 模拟大 batch | 速度更慢（多次前向/反向） |
| 梯度检查点 | 减少激活内存 | 计算量增加约 33% |
| 环形 all-reduce | 高效平均梯度 | 大模型受带宽限制 |
| MoE | 增加容量、保持 FLOP | 负载均衡与路由复杂度 |
| 扩展定律 | 指导计算分配 | 经验规律，不一定适用于所有规模 |

## 编程任务（使用 Colab 或 notebook）

1. 计算 Transformer 层的 FLOP 和内存需求。给定隐藏维度 $d$、序列长度 $n$、batch size $B$ 和层数，估算总训练成本。
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

2. 模拟数据并行训练。把数据集分到多张“虚拟 GPU”上，独立计算梯度、平均梯度，并验证结果与单 GPU 训练一致。
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

3. 实现一个简单的混合专家层。创建一个门控网络，把 token 路由给 top-K 专家并组合它们的输出。
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
