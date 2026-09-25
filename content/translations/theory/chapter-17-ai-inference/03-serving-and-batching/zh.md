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
# 推理服务与批处理

*同时为成千上万名用户提供 LLM 服务，工作不只是加载模型并运行推理。本文介绍预填充与解码阶段、连续批处理、PagedAttention 与 vLLM、调度策略、解耦式推理服务、多模型与 LoRA 服务、受约束生成，以及常用性能指标。*

- 单个 LLM 请求只需输入词元并生成输出。但要让系统以低延迟、高吞吐服务大量并发用户，需要处理整体系统效率。逐个处理请求会浪费大量 GPU 算力；批处理和调度可以提高吞吐量，但实际收益取决于工作负载、硬件和基线实现，不能固定为 10–50 倍。

## 预填充与解码：两个不同阶段

- LLM 推理通常分为两个计算特性不同的阶段：
- **预填充（prefill）**：并行处理提示词中的全部输入词元，主要涉及大批量矩阵运算，线性层的计算量可近似写作 $O(\text{prompt\_length} \times d_{\text{model}}^2)$。长提示词还会增加注意力计算。预填充常受计算能力限制，但瓶颈会随序列长度、批量和实现变化。
- **解码（decode）**：自回归地逐个生成词元。每一步都要读取模型权重，并访问先前词元的 KV cache；在常见设置下，解码可能受内存带宽限制。以 70B 参数模型为例，FP16 权重的理论大小约 140 GB（十进制），不过批处理、量化、缓存和硬件会改变实际每步传输量。
- 两阶段的差异可概括如下：

| | 预填充 | 解码 |
|--|---------|--------|
| 处理词元 | 并行处理所有输入词元 | 自回归地逐个处理 |
| 常见瓶颈 | 计算能力（FLOPS） | 内存带宽 |
| 算术强度 | 较高 | 较低 |
| GPU 利用率 | 通常较高 | 不批处理时可能较低 |
| 延迟指标 | **首词元延迟（TTFT）** | **每输出词元时间（TPOT）** |

- TTFT 衡量用户等待回复开始的时间，TPOT 影响后续词元的生成速度。对话产品可将数秒 TTFT、每词元几十至百毫秒作为讨论示例；用户可接受的阈值取决于产品和任务。

## 静态批处理（简单方案）

- 最简单的批处理方式是收集 $B$ 个请求，将它们填充到相同长度，再作为一个批次处理。
- **问题一**：请求的提示词和输出长度不同。较短请求完成后，往往要等同批最长请求结束，才能启动下一个固定批次；GPU 可能只剩少数长请求在运行。
- **问题二**：填充会产生无效计算。如果批次中最长提示词有 2000 个词元、最短只有 50 个，简单实现可能把短请求也填充到 2000 个位置，其中许多位置不包含有效词元。

![静态批处理会让已完成请求留下空闲槽位，直到最长请求结束；连续批处理则立即填入新请求](../images/static_vs_continuous_batching.svg)

## 连续批处理

- **连续批处理**（也称迭代级批处理）按单次解码迭代更新批次，而不是等整批请求全部完成。
- 每个解码步骤中：
    1. 所有进行中的请求并行生成一个词元。
    2. 已完成的请求（例如生成了 EOS 词元）立即从批次移除。
    3. 队列中的新请求可加入释放出的槽位。
- 批次大小可随每步完成和加入的请求动态变化，从而减少等待长请求造成的空闲。不同实现仍可能有填充、调度和内存开销。
- 连续批处理在一些负载下比静态批处理提高吞吐量，也可能改变单请求延迟。原有模型计算不变时，它本身不会改变模型质量；具体吞吐和延迟收益取决于实现。

## PagedAttention 与 vLLM

- 每个请求的 KV cache 随生成长度增长，而并发请求的缓存大小不同。若为每个请求预留连续内存和最大长度，短请求会浪费大量空间，也容易产生内存碎片。

![PagedAttention 将虚拟 KV cache 页映射到 GPU 中不连续的物理内存，按需分配缓存并减少碎片](../images/paged_attention.svg)

- **PagedAttention**（Kwon 等，2023）把操作系统虚拟内存的思想（第 13 章）用于 KV cache：缓存被划分成固定大小的**页**（词元位置块），按需分配，物理显存位置不必连续。
- 主要优点包括：
    - **减少外部碎片**：等大小内存块降低请求之间出现大小不一空洞的情况；页内未用位置和元数据仍会占空间。
    - **按需分配**：只为实际生成的词元分配 KV cache，而不必一开始就按最大长度全部预留。
    - **写时复制**：共享相同前缀的请求（如系统提示词）可共用 KV cache 页；请求分叉后再复制需要修改的页。
- **vLLM** 是使用 PagedAttention 的推理引擎。论文和特定基准报告过相对静态内存分配服务更高的吞吐量；2–4 倍等数值依赖比较对象、硬件、请求分布和软件版本，不代表普遍收益。

## 调度策略

- 当多个请求等待服务而 GPU 的批次容量有限时，**调度**决定先处理哪些请求：
- **先来先服务（FCFS）**：按到达顺序处理。实现简单，但较长请求可能让后续请求等待。
- **最短作业优先（SJF）**：优先处理预计最快完成的请求。在已知处理时间等特定假设下，它能降低平均等待时间；但可能让长请求长期得不到处理。生成长度事先未知时，系统只能用提示词长度、历史行为等信息估计。
- **抢占**：高优先级请求到达时，暂停较低优先级的进行中请求，把 KV cache 换出至 CPU 内存或 SSD，处理高优先级请求后再恢复。换入换出会带来成本，支持方式取决于推理引擎；vLLM 的部分配置支持抢占。
- **优先级调度**：为用户或请求类型设定优先级，例如让交互式查询高于批处理任务。结合抢占可为高优先级流量设置延迟目标，但需要考虑低优先级请求的等待时间。
- **词元预算**：限制活动批次的词元总量，避免少数长请求占满 GPU 内存、挤压新请求。预算如何计算由服务实现决定。

## 解耦式推理服务

- 预填充和解码的计算特征不同。若在同一组 GPU 上处理，设备会交替执行计算密集的预填充和带宽密集的解码；特定负载下，资源可能无法充分匹配。
- **解耦式服务**把两个阶段放在不同的设备或节点上：
    - **预填充节点**：侧重计算能力，处理新提示词；显存配置仍需满足模型和 KV cache 需求。
    - **解码节点**：侧重内存带宽和 KV cache 容量，逐词元生成输出。
- 预填充节点计算初始 KV cache 后，通过 NVLink 或网络发送给解码节点。传输时间和网络容量会影响整体延迟。
- Moonshot AI 的 **Mooncake** 是探索 KV cache 解耦式服务架构的项目之一。按阶段匹配硬件有望提高整体利用率，但收益取决于负载、通信成本和调度方式。

## 多模型与 LoRA 服务

- 生产环境可能同时服务多个模型，例如不同容量的模型，或针对不同任务微调的模型。
- **模型复用**：在同一 GPU 上加载多个模型，再把请求路由到对应模型。例如，13B 和 7B 模型的 FP16 原始权重约分别占 26 GB 和 14 GB（十进制），理论上合计 40 GB；实际还要计入 KV cache、运行时缓冲区和对齐开销，因此不代表它们一定能同时放入标称 40 GB 的 GPU。
- **LoRA 服务**：在一个基础模型上提供多个 **LoRA 适配器**（第 6 章），按请求选择适配器，而不部署多份完整模型。低秩适配器通常远小于基础模型；参数比例取决于秩、目标层和模型规模，不固定低于 1%。
- **S-LoRA**（Sheng 等，2023）支持从单个基础模型服务大量 LoRA 适配器。适配器可存放在 CPU 内存，并按需调入 GPU。基础模型权重可以共享；各请求的 KV cache 通常仍是独立的，匹配的前缀缓存除外。
- **Punica**（Chen 等，2023）用自定义 CUDA 内核在同一批次中处理来自不同 LoRA 适配器的请求，减少逐请求切换适配器的开销。收益取决于批次组成和内核支持。

## 受约束与引导式生成

- 许多应用要求 LLM 输出特定格式，例如合法 JSON、SQL、指定语言的代码或符合某个 schema 的内容。**受约束生成**会把可生成结果限制在文法或 schema 允许的范围内。
- **文法约束解码**：每一步屏蔽会违反文法的词元。例如，若当前输出为 `{"name": "Alice", "age":`，而文法要求下一个值为整数，就只保留能继续生成整数的词元，再对有效候选重新归一化概率。
- **Outlines**（Willard 与 Louf，2023）可将 JSON schema 或正则表达式编译为有限状态机（FSM），每步据此判断哪些词元可作为后续内容。只要 schema 和分词器约束能被正确表示，解码结果可符合相应语法；语法合规不等同于内容满足业务语义。
- **SGLang** 原生支持结构化生成：用户用 Python 指定输出结构，由推理引擎处理词元屏蔽和缓存。它可与 RadixAttention（前缀缓存）结合，重用共享前缀。
- 使用约束解码可减少“先自由生成、再解析失败后重试”的情况。复杂 JSON 任务的重试比例因 schema、提示词和模型而异，不能一概而论；约束也不能消除所有执行失败。

## 请求路由

- 并非每个请求都需要最大的模型。**请求路由**根据预估难度，将请求分配给不同模型：
- **级联路由**：先用小模型回答；若其置信度低于阈值（例如最高词元 softmax 概率低于 0.8），再升级到大模型。最高词元概率未必校准良好，需用代表性数据验证阈值。简单请求占比和成本收益也取决于实际流量。
- **学习式路由**：训练轻量分类器，或用小模型的困惑度，预测请求适合的模型层级。例如，可把简单算术交给 3B 模型，把更复杂的问题交给 70B 模型；路由判断本身也有成本和误判风险。
- 若 80% 请求由成本低 10 倍的小模型处理，且每个请求成本相近，理论上平均成本约下降 72%（不计路由开销）。真实节省幅度取决于请求比例、输入输出长度、模型吞吐和硬件价格。
- **端云混合路由**：**Cactus**（[github.com/cactus-compute/cactus](https://github.com/cactus-compute/cactus)）展示了设备侧路由方案：在手机、笔记本或可穿戴设备上运行较小模型；当模型信心不足或请求超出设备能力时，再转交云模型。应用可通过兼容 OpenAI 的 API 访问两种路径。对简单请求较多的应用，设备端可能处理相当比例的流量，降低云端 API 的边际费用；覆盖率取决于任务和设备，且本地运行仍消耗硬件资源与电量。

## 推理指标

- 应按应用场景选择指标。下表的目标是示例，不是所有服务都适用的通用标准：

| 指标 | 衡量内容 | 对话示例目标 | 批处理示例目标 |
|--------|-----------------|------------------------|-----------------|
| **TTFT** | 首个输出词元的等待时间 | <1 秒 | 相对不重要 |
| **TPOT** | 生成阶段每个输出词元所需时间 | <100 毫秒 | 相对不重要 |
| **吞吐量** | 总词元数/秒 | 相对不重要 | 尽量提高 |
| **p99 延迟** | 延迟分布第 99 百分位 | <5 秒 | <30 秒 |
| **每词元成本** | 每 100 万词元的费用 | 尽量降低 | 尽量降低 |
| **SLO 达标率** | 达到延迟目标的请求比例 | >99% | >95% |

- **TTFT 与 TPOT 的取舍**：积极增加批次大小可能提高总吞吐量，也可能增加单个请求的 TPOT；结果取决于调度器和工作负载。调度策略要在吞吐量与用户感知延迟之间权衡。
- **每词元成本**是生产环境的重要指标，受 GPU 租用成本、吞吐量和利用率共同影响。在硬件成本和有效容量相同的假设下，利用率为 50% 时单位词元成本可能约为 100% 利用率时的两倍；真实系统还会受延迟目标、功耗和调度开销影响。批处理与 PagedAttention 可提高资源利用率，但需要实测确认。

## 编程练习（使用 Colab 或 Notebook）

1. 模拟连续批处理与静态批处理，并比较吞吐量。示例为简化模拟，没有模拟 GPU 内核和提示词预填充。

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
print(f"Speedup: {continuous_tps / static_tps:.1f}x")
```

2. 估算 PagedAttention 相对于最大长度预分配的 KV cache 空间节省。代码假设请求长度可用平均值概括，也未计入共享前缀和页元数据。代码中的 `kv_bytes = 100_000` 是示例参数；随后的注释将其归于 Llama 70B，但实际每词元缓存大小取决于层数、KV 头数、头维度和精度，必须按具体模型配置计算，不能视为通用值。

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
