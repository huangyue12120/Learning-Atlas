---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 17 - AI inference/02. efficient architectures.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: a0011aa9b67a35918d63e4d6c18febf8699183fdf1fdcbd566142a47f4206370
status: reviewed
---

# 高效架构

*让模型更快并不只是降低精度，也可以设计更聪明的架构，让每个 token 需要完成的工作更少。本篇涵盖 StreamingLLM、稀疏注意力和线性注意力、多查询与分组查询注意力、推理阶段的混合专家、知识蒸馏、剪枝以及神经架构搜索。*

- 量化（第 01 篇）让每次运算的成本更低。本篇则从根本上减少运算次数。两者可以互补：一个同时具备架构效率和量化的模型，可能比原始模型快 10–100 倍。

## StreamingLLM：无限长度生成

- 标准 Transformer 把所有此前的 token 存在 KV 缓存中，缓存会随序列长度线性增长。到某个时刻，缓存会超过 GPU 内存，生成失败。**StreamingLLM**（Xiao 等，2023）用固定大小的**滚动 KV 缓存**解决了这个问题。

- 关键观察是：无论内容是什么，序列开头的几个 token 都会获得不成比例的高注意力分数。这些 token 被称为**注意力汇（attention sinks）**。如果把它们从缓存中驱逐，注意力分布就会崩溃，生成质量也会灾难性下降。

- StreamingLLM 的方案是：永久保留少量**汇 token**（开头 1–4 个 token）在缓存中，再保留最近 $w$ 个 token 的**滚动窗口**。总缓存大小为 $\text{sink} + w$，无论已经生成多少 token，它都保持固定。

$$\text{Cache} = [\text{token}_0, \text{token}_1, \text{token}_{t-w+1}, \ldots, \text{token}_t]$$

- 注意力汇锚定了 softmax 分布，而滚动窗口提供近期上下文。这样就能以恒定内存进行**无限长度生成**，代价是无法访问序列中间的上下文。

- 对于自然形成注意力汇的模型（大多数预训练 LLM 都是这样），StreamingLLM 不需要重新训练。对于不会自然形成注意力汇的模型，只需在训练时加入一个可学习的汇 token 就能修复。

## 稀疏注意力

- 完整自注意力的序列长度复杂度是 $O(n^2)$，因为每个 token 都关注其他所有 token。当 $n = 128K$ 时，注意力矩阵有 $128K^2 = 160$ 亿个条目。**稀疏注意力**通过限制 token 之间的关注关系来减少计算。

![注意力稀疏模式：完整注意力为 O(n²)，滑动窗口为 O(n·w)，局部加全局注意力增加长程 token](../images/attention_sparsity_patterns.svg)

- **滑动窗口注意力**（Mistral、Gemma）：每个 token 只关注此前 $w$ 个 token（例如 $w = 4096$）。注意力复杂度从 $O(n^2)$ 变为 $O(n \cdot w)$。信息会通过多层网络传播到窗口以外：经过 $L$ 层后，有效上下文范围为 $L \times w$。

- **局部 + 全局注意力**（Longformer、BigBird）：大多数 token 使用滑动窗口注意力（局部），但少量指定 token（例如 [CLS]、每 512 个 token 中的一个）关注所有 token（全局）。这种方式同时捕捉局部模式和长程依赖。

- **膨胀注意力**：在一个窗口内每隔 $k$ 个 token 关注一次，用同样数量的注意力分数覆盖更大范围。逐层增大膨胀率，会形成类似膨胀卷积（第 8 章）的层次化模式。

- 对现代 LLM 来说，实际效果最好的是**交错使用滑动窗口注意力和完整注意力**：有些层使用便宜、擅长处理局部上下文的滑动窗口，有些层使用昂贵但能捕捉长程依赖的完整注意力。Mistral/Mixtral 使用了这种模式。

## 线性注意力与状态空间模型

- 能否完全替换 $O(n^2)$ 的注意力？**线性注意力**和**状态空间模型（SSM）**通过避免显式构造注意力矩阵，以 $O(n)$ 时间处理序列。

- **线性注意力**用核近似替代 softmax 注意力：

$$\text{Standard: } O = \text{softmax}(QK^T / \sqrt{d}) V$$
$$\text{Linear: } O = \phi(Q) (\phi(K)^T V)$$

- 先计算 $K^T V$ 乘积（它是与序列长度无关的 $d \times d$ 矩阵），计算复杂度就从 $O(n^2 \cdot d)$ 变成 $O(n \cdot d^2)$。当 $n \gg d$ 时，节省非常可观。

- **RWKV** 结合了 RNN 和 Transformer 的思想。它用类似 RNN 的循环形式按顺序处理 token，却可以像 Transformer 一样在训练时并行化。推理时每个 token 的复杂度是 $O(1)$（内存恒定，KV 缓存不会增长）。

- **Mamba**（Gu 与 Dao，2023）是一种选择性状态空间模型。它通过学习到的状态转移处理序列：

$$h_t = \bar{A} h_{t-1} + \bar{B} x_t, \quad y_t = C h_t$$

- 其中 $\bar{A}$ 和 $\bar{B}$ 依赖于输入（具有选择性），因此 Mamba 可以动态地关注输入的某些部分，或忽略它们。与固定 SSM 不同，选择性让 Mamba 在保持 $O(n)$ 缩放的同时，在语言任务上也能与 Transformer 竞争。

- **权衡**：线性注意力和 SSM 对长序列更快，但通常不如完整注意力擅长需要精确长程检索的任务。混合架构（部分 Transformer 层 + 部分 Mamba 层）往往能兼得两者优点。

## 多查询注意力与分组查询注意力

- 标准多头注意力（MHA，第 7 章）为每个头使用独立的 $K$、$V$ 投影。对于 $h$ 个头，这意味着 KV 缓存中有 $h$ 组独立的键和值张量。**多查询注意力（MQA）**和**分组查询注意力（GQA）**可以减少它们。

- **MQA**（Shazeer，2019）：所有头共享一组 $K, V$ 投影，但每个头仍有自己的 $Q$ 投影。KV 缓存缩小为原来的 $1/h$（例如 32 个头时缩小 32 倍）。

- **GQA**（Ainslie 等，2023）处于两者之间。注意力头被分组，每组共享一组 $K, V$ 投影。当 $h = 32$ 个头、$g = 8$ 个组时，每 4 个头共享 K/V。KV 缓存缩小为原来的 $g/h$，即缩小 $h/g = 4$ 倍。

$$\text{MHA: } h \text{ heads, } h \text{ K/V sets} \quad \to \quad \text{GQA: } h \text{ heads, } g \text{ K/V sets} \quad \to \quad \text{MQA: } h \text{ heads, } 1 \text{ K/V set}$$

![MHA、GQA 与 MQA：MHA 为每个头提供独立 KV，GQA 在组内共享 KV，MQA 为所有头使用单个 KV，从而显著减小 KV 缓存](../images/mha_gqa_mqa.svg)

- 大多数现代 LLM 使用 GQA（Llama 2/3、Gemma、Mistral）。与 MHA 相比，它几乎不损失质量，却能减少 KV 缓存占用和推理延迟。

### 多头潜在注意力（MLA）

- **MLA**（DeepSeek-V2，2024）比 GQA 更进一步，把 KV 缓存压缩到**低秩潜在空间**。MLA 不缓存完整的键和值向量，而是为每个 token 缓存一个压缩潜在向量 $\mathbf{c}_t$，在注意力计算时再即时重建 K/V：

$$\mathbf{c}_t = W_{\text{compress}} \cdot [\mathbf{k}_t; \mathbf{v}_t], \quad \mathbf{k}_t = W_K^{\text{up}} \cdot \mathbf{c}_t, \quad \mathbf{v}_t = W_V^{\text{up}} \cdot \mathbf{c}_t$$

- 压缩向量 $\mathbf{c}_t$ 远小于原始 K 与 V 的总大小。与 MHA 相比，DeepSeek-V2 将 KV 缓存大小减少了 **93.3%**，超过了 MQA 的压缩效果，同时保持 MHA 级别的质量。

- 代价是：从潜在向量重建 K/V 会为每次注意力运算增加少量计算。但由于 LLM 解码受内存带宽限制（而非计算能力限制），总体上仍然有利：需要加载的内存更少，每个 token 只增加略多的计算。

### Flash Attention

- **Flash Attention**（Dao 等，2022，第 16 章第 05 篇有详细介绍）不是架构变化，而是实现层面的优化，但任何高效注意力的讨论都应包括它。它用以下方式计算精确的标准注意力：

    - 使用 **O(n)** 内存而不是 O(n²)（注意力矩阵从未在 HBM 中具体化）。
    - 比标准注意力快 **2–4 倍**（通过分块和在线 softmax 把数据保留在 SRAM 中）。
    - **没有质量损失**——输出在数学上与标准注意力完全相同。

- Flash Attention 现在已经是 PyTorch（`torch.nn.functional.scaled_dot_product_attention`）、JAX 和所有主流推理框架中的默认注意力实现。如果你在 2024 年以后运行注意力，几乎肯定正在使用 Flash Attention。

### Ring Attention

- **Ring Attention**（Liu 等，2023）把注意力计算分布到多个设备上，用于即使采用 Flash Attention 也无法放进单张 GPU 内存的超长序列。

- 思路是：把序列分割到 $N$ 个设备上。每个设备持有 $n/N$ 个 token 的 Q、K、V。设备排列成环。在每一步中：
    1. 每个设备计算本地注意力（用自己的 Q 对本地 K/V 计算）。
    2. 每个设备把自己的 K/V 块发送给环中的下一个设备。
    3. 每个设备从上一个设备接收 K/V，并用它们计算注意力。
    4. 经过 $N$ 步后，每个设备都已经对每个 K/V 块执行过注意力。

- 通信与计算**重叠**：计算当前 K/V 块的注意力时，下一个块正在传输。这样几乎完全隐藏了通信延迟。

- Ring Attention 通过在 GPU 环中分布 KV 缓存，使**百万 token 的上下文窗口**成为可能。每台设备的内存为 O(n/N)，因此可以处理任意长度的序列（限制只来自设备数量）。

## 推理阶段的混合专家

- MoE 模型（第 7 章）每个 token 只激活一部分参数（通常是 8 个专家中的 2 个）。推理时独特的挑战是**专家缓存**：所有专家都必须在内存中，因为任何 token 都可能路由到任意专家，但每个 token 实际只激活 2 个。

- 以 Mixtral 8x7B 为例：总参数量 = 470 亿（8 个 70 亿参数的专家，外加共享组件），每个 token 的激活参数约为 130 亿（2 个专家 + 共享层）。它以相当于 700 亿参数 LLM 的质量，获得了相当于 130 亿参数 LLM 的推理成本，但内存仍需容纳 470 亿参数。

- **专家卸载**：在 GPU 内存受限的部署中，把不活跃的专家放在 CPU 或 SSD 上，按需加载。由于 token 路由具有足够的可预测性，可以预取可能使用的专家。

- **专家缓存**：在 GPU 内存中维护最近使用专家的 LRU 缓存。如果反复激活的是相同专家（领域内数据很常见），缓存命中率会很高。

## 知识蒸馏

- **蒸馏**（第 6 章）训练一个小型“学生”模型去模仿大型“教师”模型。学生从教师的软预测（类别上的概率分布）中学习，这比单独使用硬标签包含更多信息。

$$\mathcal{L} = \alpha \cdot \text{KL}(p_{\text{teacher}}^{T} \| p_{\text{student}}^{T}) + (1 - \alpha) \cdot \mathcal{L}_{\text{CE}}(y, p_{\text{student}})$$

- 其中 $T$ 是温度（更高的 $T$ 会让分布更平滑，暴露教师模型的不确定性），$\alpha$ 用来平衡蒸馏损失与标准交叉熵损失。

- **对 LLM 而言**：蒸馏用于从大型、高能力模型创建小型快速模型。例如，从 GPT-4 得到一个 7B 学生模型，使它在特定任务上保留 GPT-4 的大部分行为。学生模型的服务成本可能低 10–100 倍。

- **任务特定蒸馏**：只使用与你的部署任务相关的数据进行蒸馏。在 70B 教师模型提供的医疗问答数据上蒸馏出的 7B 模型，可能在该特定任务上超过 70B 模型（因为学生有限的能力全部集中于目标领域）。

## 剪枝

- **剪枝**通过移除不必要的权重（将其设为零）来减小模型大小和计算量。

- **非结构化剪枝**（基于幅值）：移除绝对值最小的单个权重，形成稀疏权重矩阵。它简单且压缩效果好，但除非稀疏性遵循特定模式，否则当前硬件（GPU）无法高效加速稀疏运算。

- **结构化剪枝**：移除完整单元——注意力头、MLP 神经元或层。它产生更小的稠密模型，在标准硬件上容易加速。代价是粒度更粗（移除一个完整的头，可能同时移除有用和无用的权重）。

- **2:4 稀疏性**（NVIDIA Ampere 及更新架构）：一种硬件支持的稀疏模式，每 4 个权重中有 2 个为零。GPU 的稀疏 Tensor Core 跳过零值乘法，可获得约 2 倍加速。这是目前唯一具有实际硬件加速的稀疏模式。

- **彩票假设**（Frankle 与 Carlin，2019）：随机初始化的网络中存在一个子网络（“中奖彩票”），只训练这个子网络也能达到完整网络的性能。找到这个子网络（训练、剪枝、再回滚初始化）成本很高，但这个洞见推动了剪枝研究。

## 神经架构搜索（NAS）

- **NAS** 通过在候选架构空间中搜索，自动设计架构，在满足硬件约束（延迟、内存、功耗）的前提下找到准确率最高的架构。

- **EfficientNet**（第 8 章）就是通过 NAS 找到的：复合缩放规则（平衡深度、宽度和分辨率）来自搜索结果，而不是人的直觉。

- 对推理效率而言，NAS 可以针对特定硬件目标找到优化后的架构：“在 iPhone Neural Engine 上找到延迟 < 5 ms 且 ImageNet 准确率 > 80% 的模型。”搜索空间包括层类型、宽度、激活函数和注意力模式。

- **Once-for-all 网络**训练一个过参数化的单一网络，再为不同部署目标抽取子网络。一次训练就能为云 GPU、移动 GPU 和 CPU 生成模型，并分别针对目标进行优化。

## 编程任务（使用 CoLab 或 notebook）

1. 实现滑动窗口注意力，并将它的内存占用与完整注意力进行比较。
```python
import jax
import jax.numpy as jnp

def full_attention(Q, K, V):
    """Standard O(n^2) attention."""
    scores = Q @ K.T / jnp.sqrt(Q.shape[-1])
    weights = jax.nn.softmax(scores, axis=-1)
    return weights @ V

def sliding_window_attention(Q, K, V, window_size=128):
    """Sliding window attention: each token attends to window_size previous tokens."""
    n = Q.shape[0]
    d = Q.shape[-1]
    output = jnp.zeros_like(Q)

    for i in range(n):
        start = max(0, i - window_size + 1)
        k_window = K[start:i+1]
        v_window = V[start:i+1]
        scores = Q[i] @ k_window.T / jnp.sqrt(d)
        weights = jax.nn.softmax(scores)
        output = output.at[i].set(weights @ v_window)

    return output

n, d = 512, 64
key = jax.random.PRNGKey(0)
Q = jax.random.normal(key, (n, d))
K = jax.random.normal(jax.random.PRNGKey(1), (n, d))
V = jax.random.normal(jax.random.PRNGKey(2), (n, d))

print(f"Full attention memory:    O(n^2) = {n*n} entries")
print(f"Window (w=128) memory:   O(n*w) = {n*128} entries")
print(f"Reduction: {n*n / (n*128):.1f}x")
```

2. 比较 MHA、GQA 和 MQA 的 KV 缓存大小，说明为什么 GQA 是实践中的折中优选。
```python
def kv_cache_size(n_heads, n_kv_heads, d_head, seq_len, bytes=2):
    """KV-cache size in MB."""
    return 2 * n_kv_heads * d_head * seq_len * bytes / 1e6

n_heads = 32
d_head = 128
seq_len = 32768

mha = kv_cache_size(n_heads, n_heads, d_head, seq_len)       # 32 KV heads
gqa = kv_cache_size(n_heads, 8, d_head, seq_len)              # 8 KV heads
mqa = kv_cache_size(n_heads, 1, d_head, seq_len)              # 1 KV head

print(f"MHA (32 KV heads): {mha:.0f} MB per layer")
print(f"GQA (8 KV heads):  {gqa:.0f} MB per layer ({mha/gqa:.0f}x smaller)")
print(f"MQA (1 KV head):   {mqa:.0f} MB per layer ({mha/mqa:.0f}x smaller)")
```

3. 通过从随机注意力层中移除最不重要的注意力头，模拟结构化剪枝，并测量输出变化。
```python
import jax
import jax.numpy as jnp

key = jax.random.PRNGKey(0)
n_heads, seq_len, d_head = 8, 64, 32

# Random multi-head attention output (one per head)
head_outputs = jax.random.normal(key, (n_heads, seq_len, d_head))

# Full output: concatenate all heads
full_output = head_outputs.reshape(seq_len, n_heads * d_head)

# Importance: measure each head's contribution by its norm
head_norms = jnp.linalg.norm(head_outputs, axis=(1, 2))
print("Head importance (by norm):", jnp.round(head_norms, 2))

# Prune least important heads
for n_keep in [8, 6, 4, 2]:
    top_heads = jnp.argsort(head_norms)[-n_keep:]
    pruned = head_outputs[top_heads].reshape(seq_len, n_keep * d_head)

    # Pad to original size for comparison (zero out pruned heads)
    full_pruned = jnp.zeros_like(head_outputs)
    full_pruned = full_pruned.at[top_heads].set(head_outputs[top_heads])
    full_pruned = full_pruned.reshape(seq_len, n_heads * d_head)

    error = jnp.linalg.norm(full_output - full_pruned) / jnp.linalg.norm(full_output)
    print(f"Keep {n_keep}/{n_heads} heads: relative error = {error:.4f}, "
          f"memory = {n_keep/n_heads:.0%}")
```
