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

*提升模型速度不只靠降低数值精度，也可以改用每个词元所需计算更少的架构。本文介绍 StreamingLLM、稀疏与线性注意力、多查询与分组查询注意力、推理时的混合专家、知识蒸馏、剪枝和神经架构搜索。*

- 上一篇介绍的量化降低每次运算的成本；本文介绍如何从架构上减少运算次数。两种方法可以组合使用，但实际加速幅度取决于模型、硬件、数据长度和实现，不能用固定倍数概括。

## StreamingLLM：持续生成

- 标准 Transformer 会在 KV cache 中保存此前词元的信息，缓存随序列长度线性增长。缓存超过可用显存后，推理可能无法继续。**StreamingLLM**（Xiao 等，2023）使用固定大小的**滚动 KV cache**。
- 研究发现，在一些预训练语言模型中，序列开头的少数词元会获得异常高的注意力分数，不一定因为这些词元的语义特别重要。这类位置被称为**注意力汇点**。移除这些词元后，注意力分布可能明显改变，生成质量也可能下降。
- StreamingLLM 会将少量**汇点词元**（例如开头 1–4 个词元）永久保留在缓存中，并用**滚动窗口**保存最近的 $w$ 个词元。缓存总量为“汇点词元数 + $w$”，不随已生成词元总数增长。

$$\text{Cache} = [\text{token}_0, \text{token}_1, \text{token}_{t-w+1}, \ldots, \text{token}_t]$$

- 汇点词元为 softmax 注意力分布提供锚点，滚动窗口则保留近期上下文。因此，模型可以在缓存大小固定时持续生成；代价是无法直接读取窗口之外的中间上下文。实际生成长度仍可能受位置编码、模型实现和服务策略限制。
- 对会自然形成注意力汇点的模型，StreamingLLM 在一些设置中无需重新训练。若模型没有这一特性，可在训练中加入可学习的汇点词元；效果要结合具体模型验证。

## 稀疏注意力

- 完整自注意力中，每个词元都与其他词元计算注意力，因此序列长度为 $n$ 时，注意力分数数量按 $O(n^2)$ 增长。例如 $n=128K$ 时，单个注意力头的分数矩阵约有 168 亿个元素。**稀疏注意力**通过限制词元间的连接，减少计算和存储。

![注意力稀疏模式：完整注意力为 O(n²)，滑动窗口注意力为 O(n·w)，局部加全局注意力可覆盖远距离词元](../images/attention_sparsity_patterns.svg)

- **滑动窗口注意力**（如部分 Mistral、Gemma 配置）：每个词元只关注之前的 $w$ 个词元，例如 $w=4096$。计算量从 $O(n^2)$ 降到 $O(n\cdot w)$。在层与层的窗口连接充分时，信息可以逐层传播到更远位置；$Lw$ 可视为传播范围的粗略上界，不表示每个词元都能有效利用该长度的上下文。
- **局部加全局注意力**（如 Longformer、BigBird 的某些配置）：大多数词元只做局部窗口注意力，少数指定位置（例如 `[CLS]` 或每隔 512 个词元）与所有位置交互，以兼顾局部模式和远距离依赖。
- **空洞注意力**：在窗口中隔若干位置取一个词元参与注意力，用相近数量的分数覆盖更大范围。让空洞间隔在不同层变化，可形成类似空洞卷积的分层模式（第 8 章）。
- 一种常见设计是在不同层交替使用滑动窗口注意力和完整注意力：前者成本较低，善于建模局部上下文；后者用于捕捉远距离关系。Mistral 或 Mixtral 的部分版本采用过这类组合，具体配置依模型版本而异。

## 线性注意力与状态空间模型

- 能否完全避免 $O(n^2)$ 注意力？**线性注意力**和**状态空间模型（SSM）**不显式构造完整注意力矩阵；在特征维度固定时，它们的序列计算量可随长度 $n$ 线性增长。
- **线性注意力**用核函数特征映射近似 softmax 注意力：

$$\text{标准注意力： } O = \text{softmax}(QK^T / \sqrt{d}) V$$
$$\text{线性注意力： } O = \phi(Q) (\phi(K)^T V)$$

- 先计算 $K^T V$（矩阵大小为 $d\times d$，与序列长度无关），可将计算量从 $O(n^2\cdot d)$ 降为 $O(n\cdot d^2)$。当 $n$ 远大于 $d$ 时可能节省大量计算；实际收益仍取决于维度、实现和硬件。
- **RWKV** 结合 RNN 与 Transformer 的思路：推理时按词元递推，训练时则可并行化部分计算。每个词元只需更新固定大小的状态，因此状态大小不随整个历史序列增长；每词元的实际计算量仍取决于模型宽度。
- **Mamba**（Gu 与 Dao，2023）是一种选择性状态空间模型，通过学习到的状态转移处理序列：

$$h_t = \bar{A} h_{t-1} + \bar{B} x_t, \quad y_t = C h_t$$

- 其中 $\bar{A}$ 和 $\bar{B}$ 随输入变化（具有选择性），使模型能按输入调整信息保留与更新方式。论文在部分语言任务上报告了有竞争力的效果，但不能推断 Mamba 在所有任务上都优于 Transformer；其序列计算规模可随 $n$ 线性增长。
- **取舍**：线性注意力和 SSM 在长序列上的计算或状态存储可能更省，但在需要精确检索远距离信息的任务上，部分模型不如完整注意力。混合架构会组合 Transformer 层与 Mamba 等模块，效果取决于具体设计。

## 多查询注意力与分组查询注意力

- 标准多头注意力（MHA，第 7 章）为每个头分别计算键 $K$ 和值 $V$ 投影。若有 $h$ 个头，KV cache 通常保存 $h$ 组键和值。**多查询注意力（MQA）**和**分组查询注意力（GQA）**会共享部分 K/V 投影，以缩小缓存。
- **MQA**（Shazeer，2019）：所有头共用一组 K、V 投影，每个头仍有自己的 Q 投影。KV cache 大小约为 MHA 的 $1/h$，例如 32 个头时，在其他条件相同时可缩小约 32 倍。
- **GQA**（Ainslie 等，2023）：介于 MHA 与 MQA 之间。每组头共享一组 K、V 投影。例如 $h=32$ 个查询头、$g=8$ 组时，每组 4 个头共享一组 K/V；与 MHA 相比，缓存约缩小 $h/g=4$ 倍。

$$\text{MHA： } h \text{ 个头、} h \text{ 组 K/V} \quad \to \quad \text{GQA： } h \text{ 个头、} g \text{ 组 K/V} \quad \to \quad \text{MQA： } h \text{ 个头、} 1 \text{ 组 K/V}$$

![MHA、GQA 与 MQA 对比：MHA 每个头各自保存 KV，GQA 在组内共享 KV，MQA 让所有头共用一组 KV，从而缩小 KV cache](../images/mha_gqa_mqa.svg)

- Llama 2/3、Gemma、Mistral 等部分现代 LLM 配置采用 GQA。它能减少 KV cache 占用；对延迟和质量的影响取决于模型、硬件与推理实现，不能保证质量损失可忽略。

### 多头潜在注意力（MLA）

- **MLA**（DeepSeek-V2，2024）通过低秩潜在空间压缩 KV cache。概念上，它为每个词元缓存压缩向量 $\mathbf{c}_t$，再在注意力计算时重建 K/V：

$$\mathbf{c}_t = W_{\text{compress}} \cdot [\mathbf{k}_t; \mathbf{v}_t], \quad \mathbf{k}_t = W_K^{\text{up}} \cdot \mathbf{c}_t, \quad \mathbf{v}_t = W_V^{\text{up}} \cdot \mathbf{c}_t$$

- 这是简化示意，省略了 MLA 中位置编码等其他细节。DeepSeek-V2 报告称，相较其 MHA 基线，KV cache 大小减少 93.3%；这是该模型配置和评测口径下的结果，不是所有架构都能达到的压缩比例。论文还报告了与基线接近的任务质量。
- 从潜在向量重建 K/V 会增加一些计算。若推理受内存带宽限制，减少缓存读取可能抵消额外计算；若瓶颈不同，则总体收益也会不同。

### FlashAttention

- **FlashAttention**（Dao 等，2022；第 16 章第 5 篇有详细介绍）不是新的注意力架构，而是实现优化。它分块计算标准注意力，不把完整注意力矩阵写入高带宽显存（HBM），从而：
    - 将中间存储需求从 $O(n^2)$ 降至 $O(n)$。
    - 通过分块、在片上 SRAM 中复用数据和在线 softmax，在部分工作负载上比朴素实现快约 2–4 倍；实际速度取决于硬件、序列长度和基线实现。
    - 数学上计算标准注意力结果，不引入近似误差；浮点运算顺序变化可能带来舍入差异。
- PyTorch 的 `torch.nn.functional.scaled_dot_product_attention`、JAX 和其他框架可在受支持的设备与输入条件下选择 FlashAttention 或类似的高效内核；具体后端不保证每次调用都会使用 FlashAttention。

### 环形注意力

- **环形注意力**（Liu 等，2023）将序列分到多个设备上处理，适用于单个 GPU 难以容纳的长序列；FlashAttention 可以与之结合，但无法消除总 KV 数据量和跨设备通信成本。
- 基本做法是把序列分配到 $N$ 个设备，每个设备保存 $n/N$ 个词元的 Q、K、V，并按环形拓扑交换 K/V：
    1. 每个设备先用本地 Q 与本地 K/V 计算注意力。
    2. 每个设备把当前 K/V 块发送给环上的下一个设备。
    3. 每个设备接收前一个设备的 K/V 块，并继续计算本地 Q 对这些 K/V 的注意力。
    4. 经过 $N$ 轮后，每个设备都处理过所有 K/V 块。
- 实现可让通信与注意力计算部分重叠：计算当前块时传输下一块，以隐藏一部分通信延迟；效果取决于网络、调度和计算负载。
- 环形并行曾用于百万词元级上下文的实验。每个设备分担约 $O(n/N)$ 的序列数据；可处理的长度仍受设备数量、总内存、通信开销和模型位置处理方式限制。

## 推理时的混合专家

- 混合专家模型（MoE，第 7 章）对每个词元只激活部分专家，例如 8 个专家中选 2 个。推理时的一个挑战是**专家缓存**：任何词元都可能被路由到不同专家，系统需能访问相应权重，但每个词元只使用其中一部分。
- 以 Mixtral 8×7B 为例，模型总参数约 47B（8 个专家加共享组件），每个词元激活参数约 13B（两个专家加共享层）。这些是近似参数量；被激活参数较少意味着计算量可能较低，但部署通常仍需存放或调取全部专家权重，不能直接等同于 13B 稠密模型的显存和服务成本。质量也取决于任务与评测。
- **专家卸载**：显存不足时，可把未激活专家放在 CPU 内存或 SSD，需要时传到 GPU。传输会增加延迟；若能根据路由情况预取，可能减轻等待，但路由并非总能准确预测。
- **专家缓存**：可在 GPU 内存中使用 LRU 等策略保留近期使用的专家。重复使用同一批专家时可能提高缓存命中率；命中率取决于输入分布、路由行为和缓存容量。

## 知识蒸馏

- **知识蒸馏**（第 6 章）训练较小的“学生”模型模仿较大的“教师”模型。学生除学习硬标签外，还可学习教师的软预测（类别概率分布），从中获得类别间相对关系等信息。

$$\mathcal{L} = \alpha \cdot \text{KL}(p_{\text{teacher}}^{T} \| p_{\text{student}}^{T}) + (1 - \alpha) \cdot \mathcal{L}_{\text{CE}}(y, p_{\text{student}})$$

- 其中 $T$ 是温度；较高的 $T$ 会让分布更平滑，呈现教师模型对其他类别的相对判断。$\alpha$ 用于平衡蒸馏损失和标准交叉熵损失。不同文献的损失定义略有差异，有些会在 KL 项乘上 $T^2$。
- **用于 LLM**：蒸馏可用于从大模型训练出更小的专用模型。原文以 GPT-4 到 7B 学生模型为例，这只是示意；模型规模和具体行为的接近程度取决于监督数据与方法。学生模型的服务成本可能更低，但成本比例不能固定为 10–100 倍。
- **任务专用蒸馏**：集中使用与部署任务相关的数据进行蒸馏。对特定领域微调的学生模型有时能在该领域超过通用教师模型，但这不保证在其他任务上也更好。

## 剪枝

- **剪枝**将部分权重置零或删除模型单元，以减少参数或计算量。是否能降低实际推理成本，取决于硬件和软件是否支持相应稀疏结构。
- **非结构化剪枝**（基于幅度）：删除绝对值较小的单个权重，形成稀疏矩阵。这有助于压缩，但通用 GPU 未必能加速任意稀疏矩阵；需要匹配受支持的稀疏模式和内核。
- **结构化剪枝**：整组移除注意力头、MLP 神经元或层，得到较小的稠密模型，常规硬件较容易执行。代价是粒度较粗；被删除的整个单元中可能同时包含有用和不重要的权重。
- **2:4 稀疏性**（NVIDIA Ampere 及更新架构支持的模式）：每 4 个权重中有 2 个为零。满足格式、算子和内核要求时，稀疏 Tensor Core 可跳过部分乘法；最高约 2 倍的算子吞吐量不代表端到端推理也会快 2 倍。其他硬件可能支持不同稀疏模式。
- **彩票假设**（Frankle 与 Carbin，2019）：随机初始化网络中可能存在一个子网络，若从合适的初始化状态单独训练，可达到接近完整网络的表现。寻找此类子网络可能需要反复训练、剪枝和回滚参数，成本较高；这一假设启发了后续剪枝研究。

## 神经架构搜索（NAS）

- **神经架构搜索（NAS）**在候选架构空间中自动搜索，以满足延迟、内存、能耗等硬件约束并优化准确率。
- **EfficientNet**（第 8 章）通过 NAS 搜索得到基线架构；后续的复合缩放规则会平衡网络深度、宽度和分辨率。具体架构与缩放系数来自搜索和实验，不应概括为完全脱离人工设定的结果。
- 为提升推理效率，NAS 可针对指定硬件搜索架构，例如设定手机 Neural Engine 上低于 5 ms 的延迟、ImageNet 准确率高于 80% 等目标。搜索空间可包括层类型、宽度、激活函数和注意力模式；实际目标需在指定设备上测量。
- **一次训练网络（Once-for-All network）**先训练一个过参数化网络，再为不同部署目标导出子网。一次训练可提供云端 GPU、移动 GPU 和 CPU 等目标的候选模型，但仍需按目标设备评估和选择。

## 编程练习（使用 Colab 或 Notebook）

1. 实现滑动窗口注意力，并将理论注意力分数数量与完整注意力作比较。示例代码统计的是矩阵元素数量，不是框架实际峰值显存。

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

2. 比较 MHA、GQA 和 MQA 的 KV cache 大小，观察在缓存缩减幅度与头间共享之间的折中。代码计算的是每层的理论大小。

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

3. 在随机生成的多头注意力输出上模拟剪枝，并根据各头范数估算输出变化。该范数仅是重要性代理，不等同于真实模型中的验证结果。

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
