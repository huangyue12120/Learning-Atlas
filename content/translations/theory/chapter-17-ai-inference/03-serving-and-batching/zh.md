---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 17 - AI inference/03. serving and batching.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 93d4761610df2814a51a8c12e25c43aa337feac3f476c5041e3b019f3c7c2bd7
status: reviewed
---

# 服务与批处理

*要让 LLM 服务数千名并发用户，不能只加载模型并运行推理。本篇涵盖 prefill—decode 拆分、连续批处理、PagedAttention 与 vLLM、调度策略、解耦服务、多模型与 LoRA 服务，以及真正重要的指标。*

- 单个 LLM 推理请求很简单：输入 token，生成输出 token。但要以低延迟和高吞吐服务 10,000 名并发用户，就变成了系统问题。朴素方案（一次处理一个请求）会浪费 90% 以上的 GPU 容量。聪明的批处理和调度可以在不增加硬件的情况下把吞吐提高 10–50 倍。

## Prefill 与 Decode：两个截然不同的阶段

- LLM 推理包含两个计算特征完全不同的阶段：

- **Prefill（提示词处理）**：同时处理所有输入 token。这是一次大型矩阵乘法：$O(\text{prompt\_length} \times d_{\text{model}}^2)$。由于所有 token 都已知，提示词可以并行处理。Prefill 受**计算**限制：GPU 的 ALU 是瓶颈。

- **Decode（token 生成）**：以自回归方式一次生成一个 token。每个新 token 都要通过 KV-cache 关注所有之前的 token。Decode 受**内存带宽**限制：GPU 大部分时间是在从内存加载模型权重和 KV-cache，而不是做计算。每个 decode 步骤只产生一个 token，却必须加载整个模型（70B 模型使用 FP16 时约 140 GB）。

- 这会带来以下影响：

| | Prefill | Decode |
|--|---------|--------|
| 处理的 token | 一次全部处理（并行） | 一次一个（顺序） |
| 瓶颈 | 计算（FLOPS） | 内存带宽 |
| 算术强度 | 高 | 很低 |
| GPU 利用率 | 高（50–80%） | 不批处理时低（1–10%） |
| 延迟指标 | **首 token 时间（TTFT）** | **每个输出 token 时间（TPOT）** |

- TTFT 影响用户体验（要等多久响应才开始流式输出）；TPOT 决定用户感知到的生成速度。用户可以容忍更高的 TTFT（1–5 秒），但希望对话应用的 TPOT 很快（每个 token 30–100 毫秒）。

## 静态批处理（朴素方案）

- 最简单的批处理方式是收集 $B$ 个请求，把它们填充到相同长度，再作为一个 batch 处理。

- **问题 1**：请求的提示词长度不同，生成的输出 token 数也不同。短请求会提前完成，却必须等 batch 中最长的请求结束后才能开始下一批。GPU 会在只剩一个长请求生成时处于空闲状态。

- **问题 2**：填充会浪费计算。如果最长提示词有 2000 个 token、最短的只有 50 个，batch 会填充到 2000。GPU 要为短请求处理 1950 个填充 token，这些计算完全没有价值。

![静态批处理在等待最长请求时浪费 GPU 槽位；连续批处理会立即填入释放的槽位](../images/static_vs_continuous_batching.svg)

## 连续批处理

- **连续批处理**（也叫迭代级批处理）以单个 decode 步骤为粒度，而不是以完整请求为粒度，从而同时解决这两个问题。

- 在每个 decode 步骤中：
    1. 所有正在处理的请求并行生成一个 token（作为一个 batch）。
    2. 已完成的请求（生成 EOS token）立即从 batch 中**移除**。
    3. 队列中的新请求立即**插入**释放出的槽位。

- Batch size 会在每个步骤动态变化。GPU 不会为了等待拖后腿的请求而空闲，也没有无意义的填充（每个请求只使用自己需要的槽位）。

- **影响**：连续批处理通常可以在不改变模型质量、也不显著增加延迟的情况下，比静态批处理提高 2–10 倍吞吐。

## PagedAttention 与 vLLM

- KV-cache 会造成棘手的内存管理问题。每个请求的 KV-cache 都会随着生成 token 增长，不同请求处于不同阶段（cache 大小不同）。如果为每个请求分配连续内存，就会浪费空间（必须按最大可能长度分配，即使请求只生成几个 token）。

![PagedAttention 将虚拟 KV-cache 页面映射到不连续的物理 GPU 内存，消除碎片并支持按需分配](../images/paged_attention.svg)

- **PagedAttention**（Kwon 等，2023）把操作系统的虚拟内存概念（第 13 章）应用于 KV-cache。Cache 被划分为固定大小的**页面**（token 位置块），页面按需分配，在物理 GPU 内存中可以不连续。

- 优点包括：
    - **没有碎片**：页面大小统一，因此请求之间不会出现浪费内存的“空洞”。
    - **惰性分配**：只有真正生成 token 时才分配内存，而不是一开始按最大长度预分配。
    - **写时复制**：共享前缀（例如系统提示词）的请求可以共享同一组 KV-cache 页面；只有请求分叉后才复制页面。

- **vLLM** 是围绕 PagedAttention 构建的推理引擎。与静态分配的服务方式（例如没有 paged attention 的 HuggingFace text-generation-inference）相比，它几乎消除了 KV-cache 的内存浪费，吞吐提高 2–4 倍。

## 调度策略

- 当多个请求在等待，而 GPU 只能处理有限的 batch 时，**调度**决定服务哪些请求：

- **先到先服务（FCFS）**：按到达顺序处理请求。它简单但不公平：提交 10K-token 生成请求的用户会阻塞其后的所有用户。

- **最短作业优先（SJF）**：优先处理预计最早完成的请求。它能最小化平均延迟，却会惩罚长请求（它们可能一直得不到服务）。实践中输出长度事先未知，因此 SJF 会使用提示词长度、用户历史等启发式信息估计。

- **抢占**：高优先级请求到达时，暂停一个正在运行的低优先级请求（把它的 KV-cache 换出到 CPU 内存或 SSD），先服务高优先级请求，再恢复被暂停的请求。vLLM 支持这种方式。

- **基于优先级**：为用户或请求类型分配优先级。实时交互查询优先于批处理作业；与抢占结合后，可以保证高优先级流量的延迟 SLO。

- **token 预算**：限制活动 batch 中 token 的总数。这样可以避免少数长请求垄断 GPU 内存、使新请求饥饿。

## 解耦服务

- Prefill 与 decode 的计算特征相反。如果在同一块 GPU 上运行两者，GPU 会在计算受限（prefill）和内存带宽受限（decode）之间来回切换，哪种资源都无法被充分利用。

- **解耦服务**将二者分开：
    - **Prefill 节点**：使用针对计算优化的 GPU（高 FLOPS，可以较少显存），处理所有进入的提示词。
    - **Decode 节点**：使用针对内存带宽优化的 GPU（KV-cache 容量大、内存带宽高），负责所有 token 生成。

- Prefill 节点计算初始 KV-cache，并通过 NVLink 或网络发送给 decode 节点；decode 节点使用收到的 cache 生成 token。

- **Mooncake**（Moonshot AI）采用了这种架构，许多 LLM 服务团队也在探索它。好处是每种 GPU 都与自己的工作负载特征匹配，从而提高整体利用率。

## 多模型与 LoRA 服务

- 在生产环境中，通常要服务多个模型（不同层级使用不同大小的模型，不同任务使用不同微调版本）。

- **模型复用**：在同一块 GPU 上加载多个模型，再把请求路由到对应的模型。GPU 内存可以共享：一块 40 GB 的 GPU 可能同时容纳 13B 模型（26 GB）和 7B 模型（14 GB）。

- **LoRA 服务**：不部署多个独立微调模型，而是部署一个基础模型和多个 **LoRA adapter**（第 6 章）。每个 adapter 增加不到 1% 的参数，请求在推理时路由到对应的 adapter。

- **S-LoRA**（Sheng 等，2023）让单个基础模型服务数千个 LoRA adapter。Adapter 存放在 CPU 中，需要时分页加载到 GPU。基础模型的 KV-cache 和权重共享，只有小型 LoRA 矩阵因请求而异。

- **Punica**（Chen 等，2023）使用定制 CUDA kernel，让同一个 batch 中的不同请求应用不同 LoRA 矩阵，从而批处理跨 adapter 的请求，避免每个请求切换 adapter 的开销。

## 受约束与引导式生成

- 许多应用要求 LLM 以特定格式输出：有效 JSON、SQL 查询、某种语言的代码，或符合某个模式的响应。**受约束生成**保证输出符合语法或模式。

- **语法约束解码**：每个解码步骤都屏蔽会违反语法的 token。如果当前输出是 `{"name": "Alice", "age":`，而语法要求下一个值是整数，就屏蔽除数字以外的所有 token。LLM 的概率分布会在有效 token 上重新归一化。

- **Outlines**（Willard 与 Louf，2023）把 JSON schema 或正则表达式编译成有限状态机（FSM）。每个解码步骤中，FSM 确定哪些 token 可以作为有效延续；无效 token 的概率设为 0。这样无需重试即可保证 100% 的模式合规。

- **SGLang** 原生集成受约束生成：你在 Python 中指定输出结构，引擎负责高效处理 token 屏蔽和缓存。它还与 RadixAttention（前缀缓存）结合，使结构化输出能够复用缓存前缀。

- **为什么重要**：没有受约束生成时，系统先自由生成、再解析输出，失败后重试。复杂 JSON schema 的重试率常见为 10–30%，会浪费计算；受约束生成可以完全消除重试。

## 请求路由

- 并不是每个查询都需要最大的模型。**请求路由**根据估计的难度把查询发送给不同的模型：

- **级联**：先尝试小模型。如果小模型的置信度低于阈值（例如 top token 的 softmax 概率 < 0.8），再升级到大模型。简单查询（占流量 80% 以上）由便宜的小模型处理，只有困难查询才使用昂贵的大模型。

- **学习式路由**：训练轻量分类器（或使用小模型的困惑度）来预测查询需要哪个模型层级。把“2+2 等于多少？”发给 3B 模型，把“解释量子纠缠的数学基础”发给 70B 模型。

- **影响**：如果 80% 的查询都能由成本低 10 倍的模型处理，平均每次查询的成本可下降约 70%。对于多模型部署，这是影响最大的成本优化手段之一。

- **端侧 + 云端混合路由**：**Cactus** ([github.com/cactus-compute/cactus](https://github.com/cactus-compute/cactus)) 在设备层实现请求路由。它通过定制 ARM SIMD kernel 在设备（手机、笔记本、可穿戴设备）上运行小模型；当本地模型置信度低或查询超过设备能力时，自动路由到云模型。两条路径都使用 OpenAI 兼容 API，路由过程对应用透明。这是基础设施层的级联：第一层是免费的端侧模型，第二层是收费的云 API。对于大多数查询很简单的应用（助手问答、自动补全、转写），端侧处理可以以零边际成本覆盖 70–90% 的流量。

## 推理指标

- 合适的指标取决于使用场景：

| 指标 | 衡量内容 | 目标（对话） | 目标（批处理） |
|--------|-----------------|-----------------|-----------------|
| **TTFT** | 首 token 时间 | <1 s | 不太重要 |
| **TPOT** | 每个输出 token 时间 | <100 ms | 不太重要 |
| **吞吐量** | token/秒（总量） | 不太重要 | 最大化 |
| **p99 延迟** | 最慢的 1% 请求 | <5 s | <30 s |
| **每 token 成本** | $/1M token | 最小化 | 最小化 |
| **SLO 合规率** | 满足延迟目标的请求比例 | >99% | >95% |

- **TTFT 与 TPOT 的权衡**：激进地增加 batch 可以提高吞吐量（总 token/s 更多），却会提高 TPOT（GPU 要处理更多请求，每个 token 等待更久）。调度策略必须在吞吐量（收入）与延迟（用户体验）之间取得平衡。

- **每 token 成本**是生产环境的终极指标。它综合了硬件成本（GPU 租用）、吞吐量（token/s）和利用率。GPU 利用率为 50% 的系统，其每 token 成本是利用率 100% 系统的两倍。这正是批处理、调度和 PagedAttention 如此重要的原因：它们提高了利用率。

## 编程任务（使用 CoLab 或 notebook）

1. 模拟连续批处理与静态批处理，并测量吞吐量差异。
```python
import random
import time

def simulate_static_batching(requests, batch_size=8):
    """Process requests in fixed batches. Wait for all to finish."""
    total_tokens = 0
    total_time = 0

    for i in range(0, len(requests), batch_size):
        batch = requests[i:i + batch_size]
        max_len = max(r['output_len'] for r in batch)
        # All requests in the batch take as long as the longest
        batch_time = max_len * 0.01  # 10ms per token
        total_time += batch_time
        total_tokens += sum(r['output_len'] for r in batch)

    return total_tokens / total_time  # tokens per second

def simulate_continuous_batching(requests, max_batch=8):
    """Process with continuous batching. Remove finished, add new."""
    total_tokens = 0
    total_time = 0
    active = []
    queue = list(requests)

    while active or queue:
        # Fill batch
        while len(active) < max_batch and queue:
            active.append({'remaining': queue.pop(0)['output_len']})

        if not active:
            break

        # One decode step: all active requests generate 1 token
        for req in active:
            req['remaining'] -= 1
        total_tokens += len(active)
        total_time += 0.01  # 10ms per step

        # Remove finished requests
        active = [r for r in active if r['remaining'] > 0]

    return total_tokens / total_time

# Generate requests with varied output lengths
random.seed(42)
requests = [{'output_len': random.randint(10, 500)} for _ in range(100)]

static_tps = simulate_static_batching(requests)
continuous_tps = simulate_continuous_batching(requests)

print(f"Static batching:     {static_tps:.0f} tokens/s")
print(f"Continuous batching: {continuous_tps:.0f} tokens/s")
print(f"Speedup:     {continuous_tps / static_tps:.1f}x")
```

2. 计算 PagedAttention 带来的 KV-cache 内存节省。比较预分配（最坏情况）与分页分配（实际使用量）。
```python
def paged_vs_preallocated(n_requests, max_seq_len, avg_seq_len, page_size, kv_per_token_bytes):
    """Compare memory usage: preallocated vs paged KV-cache."""
    # Preallocated: every request gets max_seq_len slots
    preallocated_gb = n_requests * max_seq_len * kv_per_token_bytes / 1e9

    # Paged: allocate only what is used (with page granularity)
    import math
    avg_pages = math.ceil(avg_seq_len / page_size)
    paged_gb = n_requests * avg_pages * page_size * kv_per_token_bytes / 1e9

    waste_preallocated = (max_seq_len - avg_seq_len) / max_seq_len
    waste_paged = (avg_pages * page_size - avg_seq_len) / (avg_pages * page_size)

    print(f"Requests: {n_requests}, Max seq: {max_seq_len}, Avg seq: {avg_seq_len}")
    print(f"  Preallocated: {preallocated_gb:.1f} GB (waste: {waste_preallocated:.0%})")
    print(f"  Paged:        {paged_gb:.1f} GB (waste: {waste_paged:.0%})")
    print(f"  Savings:      {preallocated_gb - paged_gb:.1f} GB ({preallocated_gb/paged_gb:.1f}x)")
    print()

# Llama-70B: ~1.3 KB per token per layer, 80 layers = ~100 KB per token total
kv_bytes = 100_000

# Scenario 1: short requests, large max
paged_vs_preallocated(256, max_seq_len=4096, avg_seq_len=256, page_size=16, kv_per_token_bytes=kv_bytes)

# Scenario 2: varied lengths
paged_vs_preallocated(256, max_seq_len=8192, avg_seq_len=1024, page_size=16, kv_per_token_bytes=kv_bytes)

# Scenario 3: long context
paged_vs_preallocated(64, max_seq_len=131072, avg_seq_len=16000, page_size=16, kv_per_token_bytes=kv_bytes)
```
