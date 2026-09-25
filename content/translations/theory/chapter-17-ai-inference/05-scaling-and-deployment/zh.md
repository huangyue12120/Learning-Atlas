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

*要为数百万用户提供大模型服务，需要把推理分布到多张 GPU 上、在目标模型验证词元之前先生成候选词元、缓存共享上下文，并选择合适的服务框架。本文介绍推理并行、推测解码、前缀缓存、KV cache 驱逐、推理框架、成本优化和监控。*

- 单张 H100 为 70B 模型服务时能支持多少并发用户，取决于请求长度、吞吐目标、量化和服务配置；不能用固定人数推算所需 GPU。即使按每张 GPU 服务 100 名并发用户的假设，服务 1000 万用户也需 10 万张 GPU。云费用还取决于租赁价格、利用率和地区，因此原文给出的每年约 30 亿美元只能视为粗略情景估算。提升资源利用率会影响成本，但实际节省额要用部署数据计算。

## 推理时的模型并行

- 当模型无法放入单张 GPU 时，可以把模型拆分到多张 GPU。第 6 章介绍的训练并行策略也可用于推理，但通信、延迟和批处理方式会影响取舍。

### 张量并行

- **张量并行**（Megatron 风格，第 6 章）把单个权重矩阵分片到多张 GPU。对线性层 $Y=XW$，若把 $W$ 按列切分到 $N$ 张 GPU，每张卡计算一个分片：

$$W = [W_1 | W_2 | \cdots | W_N], \quad Y_i = X W_i, \quad Y = \text{concat}(Y_1, \ldots, Y_N)$$

- 推理时，模型大到无法放入一张 GPU 时常会采用张量并行。例如，70B 参数模型的 FP16 原始权重约为 140 GB；两张标称 80 GB 的 GPU 在总容量上可能容纳这些权重，但还要为 KV cache、运行时和通信缓冲区预留空间。
- **对延迟的影响**：张量并行需要在分片层之间进行集合通信，具体使用 all-gather、reduce 等操作取决于切分方式；不是每层都固定执行一次 all-reduce。原文以 NVLink 约 900 GB/s、PCIe 约 32 GB/s 举例，估算每层通信约 0.1 ms 与 3 ms；按 80 层计算约为 8 ms 与 240 ms。这些数值受互连代际、数据量、拓扑和软件影响，只能说明慢互连可能带来的通信成本。

### 流水线并行

- **流水线并行**把不同层放在不同 GPU 上，例如 GPU 1 运行第 0–39 层，GPU 2 运行第 40–79 层。每个词元都要依次经过这些阶段。
- 对单个请求的逐词元延迟，流水线的阶段传递可能增加等待；但它只需在 GPU 间传输激活值，不需要每层都做张量分片的集合通信。跨节点或没有 NVLink 的环境中，较低的通信量可能更有利；不同请求并行填充流水线时，吞吐量表现也会变化。

### 序列并行

- 序列很长时，即使模型权重能放入单张 GPU，KV cache 也可能放不下。**序列并行**可把序列对应的缓存键和值分片到多张 GPU。
- 计算注意力时，各 GPU 处理本地缓存片段，并通过归约合并结果。它可用于 KV cache 超过单卡容量的长上下文推理；通信量和实际延迟取决于注意力实现和互连。

## 推测解码

- **推测解码**让较小的草稿模型先快速生成多个候选词元，再由目标大模型并行验证。普通自回归解码每生成一个词元都要调用目标模型；若草稿模型和目标模型的分布相近，单次验证可能接受多个词元，从而减少昂贵的目标模型解码步骤。

![推测解码示意：快速草稿模型先生成 5 个候选词元，目标模型在一次验证中检查这些候选词元，保留可接受的词元并对拒绝项重新采样](../images/speculative_decoding.svg)

- **基本过程**：
    1. 较小、较快的**草稿模型**（例如 1B 参数）自回归地生成 $k$ 个候选词元。
    2. 较大、较准确的**目标模型**（例如 70B 参数）一次前向计算处理候选序列，得到各位置的词元概率。
    3. 按草稿分布与目标分布执行接受/拒绝检验；被拒绝时根据校正后的目标分布重采样。
    4. 若平均每次验证能接受多个候选词元，就可能减少目标模型调用并提高速度。

$$\text{加速比} \approx \frac{k \times \text{接受率}}{\text{成本比}} \approx 2\text{–}3\times$$

- 此式只是粗略示意，成本比的定义、草稿时间和验证时间会影响实际加速，不能保证达到 2–3 倍。
- **为什么算法可不损失质量**：在正确使用草稿分布与目标分布进行接受/拒绝和重采样时，输出分布可与只运行目标模型相同。这里的“无损”指统计分布不变，不代表输出内容每次都相同。
- **变体**：
    - **Medusa**（Cai 等，2024）：在目标模型上增加多个轻量预测头，同时预测多个后续词元，不另配独立草稿模型；收益依实现而异。
    - **EAGLE**（Li 等，2024）：训练轻量草稿头，利用目标模型的隐藏状态预测后续词元。论文在特定任务上报告了较高接受率。
    - **自推测解码**：目标模型先只运行部分层生成草稿，再用完整模型验证。
    - **并行解码**：构造多个候选分支组成搜索树，并行验证整棵树；分支会增加 KV cache 的内存使用。

## 前缀缓存

- 多个请求可能共享系统提示词、少样本示例或常见查询前缀。**前缀缓存**保存这些前缀的 KV cache，并在匹配请求之间复用。
- **系统提示词缓存**：若每个请求都以相同的 2000 词元系统提示词开头，服务可在兼容条件下复用该前缀的 KV cache。缓存大小取决于层数、KV 头数、头维度和精度。例如，对 80 层、8 个 KV 头、每头 128 维、FP16 的模型，2000 个词元约需 $2\times80\times8\times128\times2\times2000$ 字节，即约 655 MB（十进制）。实际配置不同，大小也会变化。
- **基数树缓存**（SGLang）：用基数树（trie）组织已缓存的前缀；新请求到达时查找最长匹配前缀，从未缓存的位置继续计算。词元化、模型版本和适配器等配置必须兼容，才能安全复用。
- 对共享前缀较长的应用，前缀缓存可减少预填充计算和 TTFT。原文提到的 50–90% 降幅取决于前缀长度、命中率与基准设置，不是普遍收益。

## KV cache 驱逐

- 除了量化 KV cache（第 17 章第 1 篇）以及用 GQA/MLA 缩小缓存（第 2 篇），还可以按策略移除未来较少参与注意力计算的缓存词元。
- **H2O**（Heavy-Hitter Oracle，Zhang 等，2023）观察到某些模型和任务中的注意力分数集中在少数词元上。它保留：
    1. **近期词元**：例如 StreamingLLM 中最近的 $w$ 个词元。
    2. **高注意力词元**：过去解码步骤中累计注意力分数最高的前 $k$ 个词元。
- 其他较少关注且不在近期窗口内的词元可被驱逐，从而限制缓存大小。H2O 论文在特定实验中以约 20% KV cache 达到接近完整缓存的效果；质量和内存比例取决于模型、数据及生成长度。
- **Scissorhands**（Liu 等，2023）使用另一种重要性估计：保留当前阶段重要的词元，并驱逐连续 $T$ 步都未受到注意的词元，以适应注意力模式变化。
- **动态驱逐与 StreamingLLM 组合**：永久保留少量注意力汇点，并动态保留近期与高注意力词元。该策略可在固定缓存预算下支持长时间生成，但输出质量的退化幅度需按模型评估，不能保证一直可忽略。
- 这些方法利用了一种观察：许多场景下，注意力权重集中在少量缓存位置。其稀疏程度随模型、层、任务和生成阶段变化，因此驱逐策略仍需验证输出质量。

## 推理框架

- LLM 服务生态中常见的框架及其侧重点如下；版本更新可能改变功能和性能：

| 框架 | 特点 | 常见用途 |
|-----------|----------|----------|
| **vLLM** | PagedAttention、连续批处理、高吞吐 | 通用 LLM 服务 |
| **TensorRT-LLM** | NVIDIA 优化内核、FP8、运行中批处理 | NVIDIA GPU 高性能推理 |
| **SGLang** | 前缀缓存（RadixAttention）、结构化生成 | 共享前缀或约束输出应用 |
| **llama.cpp** | CPU/Metal/CUDA/Vulkan、GGUF 量化、可移植 | 消费级硬件与设备端推理 |
| **TGI**（Hugging Face） | API 简单、易部署、集成模型中心 | 快速部署与 Hugging Face 生态 |
| **Ollama** | 一条命令下载并服务模型 | 个人使用与本地开发 |
| **ExLlamaV2** | 面向低显存推理的优化，支持 EXL2 格式 | GPU 显存受限的推理 |

- **vLLM** 常用于生产级 LLM 服务，支持连续批处理、PagedAttention、张量并行、推测解码、LoRA 服务及多种开源模型；是否适合仍取决于工作负载。
- **TensorRT-LLM** 针对 NVIDIA 硬件优化。原文称它在同一 GPU 上可能比 vLLM 快 10–30%；具体结果取决于模型、引擎构建、批量和版本，且灵活性、定制成本也需考虑。
- **SGLang** 面向共享前缀或结构化输出场景提供 RadixAttention 缓存与约束解码功能。

## 成本优化

- 大规模部署中，推理费用可能成为机器学习预算的重要部分。可评估以下策略：
- **按需选择 GPU**：模型不一定都要使用 H100。量化后的 7B 模型可能在 A10G 上运行，成本可能低于 H100；文中的约 1 美元/小时与 8 美元/小时仅是价格示例，租赁价格随云厂商、地区、时段和实例配置变化。
- **抢占式实例**：云平台有时会以较低价格提供可中断的 GPU 容量，原文举例折扣为 60–90%。可中断特性适合可重试的批处理任务；若配合保存状态和恢复机制，也可能服务交互流量，但中断会影响延迟和可靠性。
- **自动扩缩容**：根据流量调整 GPU 数量，例如在高峰期扩容、低峰期缩容。可使用 Kubernetes HPA 或云服务商提供的自动扩缩容机制。
- **批处理与利用率**：在单位 GPU 成本不变、吞吐与利用率近似成比例等假设下，从 30% 提高到 90% 利用率可使每词元成本约降至三分之一。连续批处理、调度和 PagedAttention 有助于提高利用率，实际比例需要测量。
- **量化**：INT4 原始权重约为 FP16 的四分之一，可能使模型适配较小 GPU；若吞吐和批次容量提高，也可能降低单位词元成本。原文举例的 2–4 倍成本降低并非保证值，需计入质量、内核和显存开销。

- 下表给出原文标注为约 2026 年的每百万词元成本估算。它没有注明输入与输出词元比例、折扣、缓存价格或服务层级，不能直接用于当前报价或不同供应商间的等价比较：

| 配置 | 每百万词元成本（原文估算） |
|-------|-------------------|
| GPT-4o API | $2.50 |
| Claude 3.5 Sonnet API | $3.00 |
| H100 上的 Llama 70B（vLLM，FP16） | $0.50 |
| H100 上的 Llama 70B（TensorRT-LLM，INT8） | $0.25 |
| A10G 上的 Llama 8B（vLLM，INT4） | $0.05 |
| 设备端 Llama 3B（llama.cpp） | $0（已摊销硬件成本） |

- API 价格可能按输入和输出词元分别计费并随时间变化。设备端的“$0”仅表示不另付云端推理费用，不包括设备购置、电费和维护。

## 监控

- 生产环境应持续监控推理系统，及时发现性能或质量退化：
- **延迟**：跟踪 p50、p95、p99 的 TTFT 和 TPOT，并在 p99 超出服务等级目标（SLO）时告警。异常可能来自 KV cache 内存压力、长请求占用批次、排队或设备降频等原因。
- **吞吐量**：监测每张 GPU 的每秒词元数。下降可能与批处理效率、请求长度、KV cache 占用或硬件状态有关；仅凭吞吐指标不能定位根因。
- **GPU 利用率**：监控 SM 占用、显存占用和内存带宽。高带宽占用且低 SM 占用可能提示访存受限；高 SM 占用可能提示计算负载较高，但仍应结合内核性能分析，不要直接据此得出扩容结论。
- **模型质量**：跟踪回复长度、留出集困惑度和用户反馈等指标。输入分布变化、KV cache 量化或驱逐策略、以及服务流程缺陷都可能影响输出质量。
- **成本**：按模型和 GPU 类型跟踪每词元成本。成本上升而吞吐未增加时，可检查模型版本、批次配置、内存使用和 GPU 利用率。
- **工具**：可用 Prometheus 与 Grafana（第 15 章）监控基础设施，使用 vLLM/TensorRT-LLM 的指标端点，并通过自定义日志采集模型级指标。

## 编程练习（使用 Colab 或 Notebook）

1. 模拟推测解码：用较快的“草稿”函数和较慢的“目标”函数，测量一次生成并验证多个候选词元可能带来的速度变化。给出的代码只模拟流程，不实现保持目标分布不变所需的正确拒绝采样。

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

2. 粗略估算不同优化策略下的 LLM 部署成本。示例公式是人为设定的吞吐启发式，不是测量值：`500 / (params_B * precision_bits / 16)` 对 7B FP16 得到约 71 tok/s，而代码注释称其归一化为 500 tok/s；参数与注释不一致。代码也没有根据具体 GPU 带宽或内核性能建模，因此不宜用于预算报价。

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
