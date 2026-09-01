---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 17 - AI inference/05. scaling and deployment.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: a18d9bcb15892ca2aa52e72346cc599df3709e3096673b8cd1f8145e93f3a31b
status: reviewed
---

# 扩展与部署

*要为数百万用户服务大型模型，需要把推理分布到多块 GPU 上，在 token 需要之前预测它们，缓存共享上下文，并选择合适的框架。本篇涵盖推理阶段的并行化、推测解码、前缀缓存、推理框架、成本优化和监控。*

- 一块服务 70B 模型的 H100 GPU 可以以交互延迟处理约 100 名并发用户。要服务 1000 万用户，需要 100,000 块 GPU，每年的云计算成本约为 30 亿美元。效率每提升一个百分点，就能节省数千万美元。这就是推理优化并非学术练习的原因：它直接决定 AI 产品的经济性。

## 推理时的模型并行

- 当模型太大、无法放入一块 GPU 时，必须把它拆分到多块 GPU 上。训练阶段使用的并行策略（第 6 章）也适用于推理，但权衡有所不同。

### 张量并行

- **张量并行**（Megatron 风格，第 6 章）把单个权重矩阵拆到多块 GPU 上。对于线性层 $Y = XW$，将权重矩阵 $W$ 按列拆到 $N$ 块 GPU。每块 GPU 计算一部分结果，再通过 all-reduce 汇总：

$$W = [W_1 | W_2 | \cdots | W_N], \quad Y_i = X W_i, \quad Y = \text{concat}(Y_1, \ldots, Y_N)$$

- 在推理中，对于无法放进一块 GPU 的模型，张量并行是默认方案。FP16 的 70B 模型需要 140 GB，可以用张量并行拆到 2 × 80 GB GPU 上。

- **延迟影响**：张量并行每层都会增加一次 all-reduce 通信。在 NVLink（900 GB/s）上，每层增加约 0.1 ms；在 PCIe（32 GB/s）上，每层增加约 3 ms。对于在 2 块 GPU 上运行、包含 80 层的 70B 模型，NVLink 总共增加约 8 ms，PCIe 则增加约 240 ms。这就是 NVLink 对多 GPU 推理极其重要的原因。

### 流水线并行

- **流水线并行**把不同层分配给不同 GPU。GPU 1 处理第 0–39 层，GPU 2 处理第 40–79 层。Token 按顺序流经流水线。

- 在推理中，流水线并行的延迟高于张量并行（每个 token 都要走完整条流水线），但通信开销更低（GPU 之间只传递激活，不需要 all-reduce）。当 GPU 通过较慢的互连连接（位于不同节点、没有 NVLink）时，优先使用流水线并行。

### 序列并行

- 对于很长的序列，即使模型本身能放在一块 GPU 上，KV-cache 也可能放不下。**序列并行**把 KV-cache 分片到多块 GPU：每块 GPU 保存序列中一部分已缓存的 key 和 value。

- 在 attention 期间，每块 GPU 先对自己缓存的片段计算局部 attention 分数，再通过归约合并结果。这用于长上下文推理（128K 以上 token），此时 KV-cache 超过单块 GPU 的内存容量。

## 推测解码

- **推测解码**是最有影响力的 LLM 推理优化之一。其洞见是：解码之所以慢，是因为一次只能生成一个 token，而每个 token 都需要大型模型做一次完整前向计算。但小模型可以更快地生成候选 token，大模型则可以**并行验证**多个候选。

![推测解码：快速 draft 模型生成 5 个候选 token，target 模型一次验证全部候选，接受的 token 被保留，拒绝的 token 重新采样](../images/speculative_decoding.svg)

- **算法**：
    1. **draft 模型**（小而快，例如 1B 参数）以自回归方式生成 $k$ 个候选 token。
    2. **target 模型**（大而准确，例如 70B）对整个 draft 序列进行一次前向计算，得到每个候选 token 的概率。
    3. 如果 target 模型同意（它给该 token 的概率足够高），就**接受**候选；拒绝的候选从 target 模型的分布中重新采样。
    4. 平均而言，每次验证会接受多个 token，因此加速幅度与接受率成正比。

$$\text{Speedup} \approx \frac{k \times \text{acceptance\_rate}}{\text{cost\_ratio}} \approx 2\text{-}3\times$$

- **为什么没有质量损失**：拒绝采样方案保证输出分布与 target 模型完全一致。推测解码是无损的——统计上它和只运行 target 模型得到的输出相同，只是更快。

- **变体**：
    - **Medusa**（Cai 等，2024）：不使用独立 draft 模型，而是在 target 模型上添加多个轻量级“头”，同时预测多个未来 token，不需要额外模型。
    - **EAGLE**（Li 等，2024）：训练一个使用 target 模型隐藏状态预测未来 token 的轻量 draft head。它的接受率高于独立 draft 模型。
    - **自推测解码**：target 模型本身通过 early exit 生成 draft（只运行前几层），再用完整模型验证。
    - **并行解码**：并行生成多个延续（候选树），一次验证整棵树。它吞吐更高，但分支 KV-cache 会消耗更多内存。

## 前缀缓存

- 许多请求共享相同前缀：系统提示词、few-shot 示例或常见查询模式。**前缀缓存**保存这些前缀的 KV-cache，并在多个请求之间复用。

- **系统提示词缓存**：如果每个请求都以相同的 2000-token 系统提示词开头，这 2000 个 token 的 KV-cache 只需计算一次，所有请求共享。对于有 80 层的 70B 模型，每个请求可节省约 200 MB。

- **基数树缓存**（SGLang）：把缓存的前缀组织成基数树（Trie）。新请求到达时，查找最长的缓存前缀匹配，从匹配位置开始生成，跳过前缀计算。

- **影响**：对于共享前缀很长的应用（带系统提示词的聊天机器人、带公共检索段落的 RAG），前缀缓存可以把 TTFT 降低 50–90%，并按比例节省 GPU 计算。

## KV-cache 淘汰

- 除了量化 KV-cache（第 01 篇）以及使用 GQA/MLA 缩小其体积（第 02 篇）外，**KV-cache 淘汰**策略还会选择性移除未来不太可能被关注的缓存 token。

- **H2O（Heavy-Hitter Oracle，重击者预言机；Zhang 等，2023）**观察到 attention 分数遵循幂律：少量 token（“重击者”）获得大部分 attention，而大多数 token 获得的 attention 可以忽略。H2O 保留：

    1. **最近 token**（最后 $w$ 个 token 的滑动窗口，类似 StreamingLLM）。
    2. **重击者 token**（按过去所有 decode 步骤中的累计 attention 分数排序后排名前 $k$ 的 token）。

- 既不属于最近 token、也不属于重击者的 token 会被淘汰。这样可以保持固定大小的 KV-cache，同时保留真正影响生成的 token。只使用完整 KV-cache 20% 的内存，H2O 仍能达到接近完整 cache 的质量。

- **Scissorhands**（Liu 等，2023）采用类似方案，但使用更复杂的重要性指标：保留在**当前**步骤获得高 attention 的 token，淘汰连续 $T$ 步都未被关注的 token。它会适应生成过程中不断变化的 attention 模式。

- **动态淘汰 + StreamingLLM**：把 attention sink（永久保留最初几个 token）与动态淘汰（保留最近 token + 重击者）结合起来。这是面向超长生成的内存效率最高的方案，可在质量有界下降的情况下实现无限长度生成。

- 所有淘汰方法的共同洞见是：LLM 的 attention 在实践中是**稀疏的**——虽然架构会对所有缓存 token 计算 attention，但实际权重会集中在一小部分上。淘汰其余 token 对输出质量的影响很小。

## 推理框架

- LLM 服务生态已经集中到少数几个主流框架：

| 框架 | 优势 | 最适合 |
|-----------|-----------|----------|
| **vLLM** | PagedAttention、连续批处理、高吞吐 | 通用 LLM 服务，追求最高吞吐 |
| **TensorRT-LLM** | NVIDIA 优化 kernel、FP8、in-flight batching | NVIDIA GPU 上的最高性能 |
| **SGLang** | 前缀缓存（RadixAttention）、快速结构化生成 | 共享前缀、受约束输出的应用 |
| **llama.cpp** | CPU/Metal/CUDA/Vulkan、GGUF 量化、可移植 | 消费级硬件、设备端推理 |
| **TGI**（HuggingFace） | API 简单、易部署、集成模型 Hub | 快速部署、HuggingFace 生态 |
| **Ollama** | 一条命令下载并服务模型 | 个人使用、本地开发 |
| **ExLlamaV2** | 极致量化优化（EXL2 格式） | 显存受限的 GPU 推理 |

- **vLLM** 是生产级 LLM 服务的默认选择。它支持连续批处理、PagedAttention、张量并行、推测解码、LoRA 服务和大多数开源模型。

- **TensorRT-LLM** 在 NVIDIA 硬件上拥有最高的原始性能（同一块 GPU 上比 vLLM 快 10–30%），但灵活性较低、定制难度更高。

- **SGLang** 擅长结构化输出（JSON、特定格式的代码）或共享前缀的场景，这得益于其 radix attention cache 和受约束解码引擎。

## 成本优化

- 在大规模场景中，推理成本会占据机器学习预算的主要部分。降低成本的策略包括：

- **选择匹配的 GPU**：不是每个模型都需要 H100。量化后的 7B 模型可以在 A10G（约 1 美元/小时）上良好运行，不必使用 H100（约 8 美元/小时）。让 GPU 与工作负载匹配。

- **Spot 实例**：云服务商会以 60–90% 的折扣提供闲置 GPU 容量（AWS Spot、GCP Preemptible）。Spot 实例可能被中断，因此适合批量推理，不适合对延迟敏感的服务。结合抢占处理（在新实例上保存状态并恢复），Spot 实例也能服务交互式流量。

- **自动扩缩容**：根据流量调整 GPU 数量。高峰期扩容，夜间缩容。Kubernetes HPA（Horizontal Pod Autoscaler）或云原生自动扩缩容（AWS SageMaker、GCP Vertex AI）可以处理这项工作。

- **批处理 + 利用率**：GPU 利用率从 30% 提高到 90%，每 token 成本会降低约 3 倍。连续批处理、智能调度和 PagedAttention 都能提升利用率。

- **量化**：INT4 相比 FP16 少用 4 倍内存，可以放进更小的 GPU，成本降低 2–4 倍。此外，同一 batch 能容纳更多请求，提高吞吐并降低每 token 成本。

- **每 token 成本基准**（约值，2026 年）：

| 部署方式 | 每 100 万 token 成本 |
|-------|-------------------|
| GPT-4o API | $2.50 |
| Claude 3.5 Sonnet API | $3.00 |
| H100 上的 Llama-70B（vLLM，FP16） | $0.50 |
| H100 上的 Llama-70B（TRT-LLM，INT8） | $0.25 |
| A10G 上的 Llama-8B（vLLM，INT4） | $0.05 |
| 设备端的 Llama-3B（llama.cpp） | $0（硬件折旧除外） |

## 监控

- 生产级推理必须持续监控，以便在用户受到影响前发现退化：

- **延迟监控**：在 p50、p95 和 p99 处跟踪 TTFT 与 TPOT。为 p99 超过 SLO 设置告警。p99 突增通常意味着：KV-cache 内存压力（抖动）、长请求垄断 batch，或 GPU 因温度过高而降频。

- **吞吐监控**：跟踪每块 GPU 每秒生成的 token 数。下降可能表示：批处理效率降低（许多短请求导致 batch 利用率低）、序列长度增加（每个请求占用更多 KV-cache），或硬件问题（GPU 进入 ECC 错误纠正模式、运行速度变慢）。

- **GPU 利用率**：跟踪 SM 占用率、显存利用率和内存带宽。低 SM 占用率 + 高显存利用率 = 受内存限制（需要更高带宽或量化）；高 SM 占用率 + 低显存利用率 = 受计算限制（需要更多 FLOPS 或更小的模型）。

- **模型质量监控**：跟踪每个请求的指标（响应长度、留出集上的困惑度、用户反馈信号）。模型质量可能因为以下原因下降：数据漂移（进入请求的分布变化）、长对话中 KV-cache 量化误差累积，或服务流水线中的 bug。

- **成本监控**：按模型、GPU 类型跟踪每 token 成本。如果成本上涨而吞吐没有提高，就要排查效率回归（新模型版本占用更多内存、batch 配置不佳或 GPU 利用不足）。

- **工具**：使用 Prometheus + Grafana（第 15 章）监控基础设施指标，使用 vLLM/TRT-LLM 的内置指标端点，并通过自定义日志记录模型级指标。

## 编程任务（使用 CoLab 或 notebook）

1. 模拟推测解码。使用快速的“draft”函数和慢速的“target”函数，测量一次生成并验证多个 token 带来的加速。
```python
import random
import time

def target_model(tokens):
    """Slow but accurate model. Returns probability of each candidate token."""
    time.sleep(0.01)  # simulate 10ms per forward pass
    # For simulation: accept tokens that are even numbers
    return [0.9 if t % 2 == 0 else 0.1 for t in tokens]

def draft_model():
    """Fast but approximate model. Generates one candidate token."""
    time.sleep(0.001)  # simulate 1ms per token
    return random.randint(0, 9)

def standard_decoding(n_tokens):
    """Generate one token at a time with the target model."""
    tokens = []
    for _ in range(n_tokens):
        time.sleep(0.01)  # target model generates 1 token
        tokens.append(random.randint(0, 9))
    return tokens

def speculative_decoding(n_tokens, k=4):
    """Generate k draft tokens, verify with target, accept/reject."""
    tokens = []
    total_target_calls = 0

    while len(tokens) < n_tokens:
        # Draft: generate k candidates quickly
        candidates = [draft_model() for _ in range(k)]

        # Verify: one target model call for all k candidates
        probs = target_model(candidates)
        total_target_calls += 1

        # Accept tokens until one is rejected
        for i, (tok, prob) in enumerate(zip(candidates, probs)):
            if random.random() < prob:
                tokens.append(tok)
                if len(tokens) >= n_tokens:
                    break
            else:
                # Resample from target distribution
                tokens.append(tok + 1)  # simplified resampling
                break

    return tokens, total_target_calls

n = 50

start = time.time()
_ = standard_decoding(n)
standard_time = time.time() - start

start = time.time()
_, target_calls = speculative_decoding(n, k=5)
spec_time = time.time() - start

print(f"Standard:    {standard_time:.2f}s ({n} target calls)")
print(f"Speculative: {spec_time:.2f}s ({target_calls} target calls)")
print(f"Speedup:     {standard_time / spec_time:.1f}x")
```

2. 估算应用不同优化策略后的 LLM 服务部署节省的成本。
```python
def serving_cost_analysis(
    model_name, params_B, precision_bits,
    gpu_name, gpu_mem_gb, gpu_cost_per_hr,
    target_throughput_tps,
):
    """Estimate serving cost for an LLM deployment."""
    model_size_gb = params_B * 1e9 * precision_bits / 8 / 1e9
    gpus_for_model = max(1, int((model_size_gb * 1.2) / gpu_mem_gb + 0.99))  # 1.2x for KV-cache

    # Rough throughput estimate (memory-bandwidth limited)
    tokens_per_gpu = 500 / (params_B * precision_bits / 16)  # normalised to 500 tok/s for 7B FP16
    total_throughput = tokens_per_gpu * gpus_for_model

    replicas = max(1, int(target_throughput_tps / total_throughput + 0.99))
    total_gpus = gpus_for_model * replicas
    cost_per_hr = total_gpus * gpu_cost_per_hr
    cost_per_1M_tokens = cost_per_hr / (total_throughput * replicas * 3600 / 1e6)

    print(f"{model_name} @ {precision_bits}-bit on {gpu_name}:")
    print(f"  Model size: {model_size_gb:.0f} GB → {gpus_for_model} GPU(s)/replica")
    print(f"  Throughput: {total_throughput:.0f} tok/s/replica")
    print(f"  Replicas for {target_throughput_tps} tok/s: {replicas}")
    print(f"  Total GPUs: {total_gpus}")
    print(f"  Cost: ${cost_per_hr:.0f}/hr, ${cost_per_1M_tokens:.2f}/1M tokens")
    print()

print("=== Cost Comparison ===\n")

# Baseline: FP16 on H100
serving_cost_analysis("Llama-70B", 70, 16, "H100", 80, 8.0, 1000)

# Quantised: INT8 on H100
serving_cost_analysis("Llama-70B", 70, 8, "H100", 80, 8.0, 1000)

# Quantised: INT4 on A100
serving_cost_analysis("Llama-70B", 70, 4, "A100", 80, 4.0, 1000)

# Smaller model: 8B on A10G
serving_cost_analysis("Llama-8B", 8, 4, "A10G", 24, 1.0, 1000)
```
