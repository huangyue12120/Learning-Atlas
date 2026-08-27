---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/17-infrastructure-and-production/08-inference-metrics-goodput/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: d53d3c31b91e81969c851c0a9c1cc679e726c10541048c53a34c848c54f6d0c4
status: reviewed
---

# 推理指标：TTFT、TPOT、ITL、Goodput 与 P99

> 四项指标决定一次推理部署是否正常工作。TTFT 由 prefill、排队和网络组成。TPOT（等价于 ITL）是每个 token 受内存约束的 decode 成本。端到端延迟等于 TTFT 加上 TPOT 乘以输出长度。吞吐量是整个集群汇总的每秒 token 数。产品应关注 goodput，即同时满足每一项 SLO 的请求比例。高吞吐、低 goodput 代表你在处理无法按时送达用户的 token。2026 年 TRT-LLM 上 Llama-3.1-8B-Instruct 的参考数值为：平均 TTFT 162 ms、平均 TPOT 7.33 ms、平均 E2E 1,093 ms。始终报告 P50、P90、P99，绝不能只报平均值。也要当心测量陷阱：GenAI-Perf 在计算 ITL 时排除了 TTFT，LLMPerf 则纳入；同一次运行中，两个工具会对 TPOT 给出不同结果。

**类型：** 学习
**语言：** Python（标准库，用于百分位数和 goodput 报告的玩具计算器）
**前置要求：** 第 17 阶段 · 04（服务引擎内部机制）
**用时：** 约 60 分钟

## 学习目标

- 精确定义 TTFT、TPOT、ITL、E2E、吞吐量和 goodput，并说出各自测量的组成部分。
- 解释为什么平均值不适用于 LLM 服务，以及如何解读 P50/P90/P99。
- 构造多约束 SLO（例如 TTFT<500 ms AND TPOT<15 ms AND E2E<2 s），并据此计算 goodput。
- 说出两个会对同一运行的 TPOT 给出不同结果的基准工具，并解释原因。

## 问题

“我们的吞吐量是每秒 15,000 个 token。”那又怎样？如果 40% 的请求端到端超过 2 秒，用户就会放弃这次会话。单靠吞吐量不能说明产品是否正常工作。

推理延迟有多个维度，每一个都有不同的失败方式。Prefill 受计算约束，并随提示词长度增长。Decode 受内存约束，并随批量大小增长。排队延迟是运维问题，网络则是物理距离问题。你需要为每个维度设置不同指标，需要百分位数，还需要一个统一的复合指标来回答“用户是否得到了预期”，这个指标称为 goodput。

## 概念

### TTFT——首 token 时间

`TTFT = queue_time + network_request + prefill_time`

提示词较长时，prefill 占主导。在 H100 上运行 Llama-3.3-70B FP8 时，一个 32k 提示词的纯 prefill 约需 800 ms。排队时间是在负载下调度器行为的结果。网络请求时间是包含 TLS 的线上传输时间。TTFT 是用户看到任何流式输出前所感知的延迟。

### TPOT / ITL——token 间延迟

同一量有很多名称：`TPOT`（每个输出 token 的时间）、`ITL`（token 间延迟）、`decode latency per token`——它们都指首 token 之后连续流式 token 之间的时间。

`TPOT = (decode_forward_time + scheduler_overhead) / tokens_produced`

在同一套启用分块 prefill 的 Llama-3.3-70B H100 栈上，平均 TPOT 约为 7 ms。若未启用分块 prefill，当相邻序列在进行长 prefill 时，TPOT 可能尖峰至 50 ms。关注 P99，而不是平均值。

### E2E 延迟

`E2E = TTFT + TPOT * output_tokens + network_response`

对于长输出（>500 token），E2E 由 TPOT 主导；对于带长提示词的短输出，E2E 由 TTFT 主导。报告以输出长度为条件的 E2E。

### 吞吐量

`throughput = total_output_tokens / elapsed_time`

聚合指标可以说明集群效率，却不能说明单个请求是否健康。

### Goodput——你真正关心的指标

`goodput = fraction of requests meeting (TTFT <= a) AND (TPOT <= b) AND (E2E <= c)`

SLO 是多约束的。只有每项约束都成立，请求才是“好”的。Goodput 就是这部分请求的占比。60% goodput 下的高吞吐量意味着失败；99% goodput 下较低的吞吐量才是目标。

2026 年，goodput 是 MLPerf Inference v6.0 提交以及 AI 平台提供方内部 SLA 跟踪中使用的指标。

### 为什么平均值是错误统计量

LLM 延迟分布右偏。一个 decode 批次中，某个长 prefill 的相邻序列可能使 20 个 token 的 TPOT 达到约 60 ms，其余 500 个 token 的 TPOT 约为 7 ms。平均 TPOT 是 9 ms，P99 TPOT 却是 65 ms。用户经常遭遇 P99，这会促使他们离开。

始终报告三元组（P50、P90、P99）。对于用户体验，P99 是你要优化的指标。

### 参考数值：2026 年 TRT-LLM 上的 Llama-3.1-8B-Instruct

- 平均 TTFT：162 ms。
- 平均 TPOT：7.33 ms。
- 平均 E2E：1,093 ms。
- P99 TPOT：取决于分块 prefill 配置，介于 10–25 ms。

这些是 NVIDIA 发布的参考点。它们会随着模型规模（70B 将是 3–5 倍）、硬件（H100 相比 B200 约慢 3 倍）和负载而变化。

### 测量陷阱

2026 年最常用的两个基准工具，会在同一次运行中对 TPOT 给出不同结果：

- **NVIDIA GenAI-Perf：** 从 ITL 计算中排除 TTFT。ITL 从第 2 个 token 开始。
- **LLMPerf：** 将 TTFT 计入。ITL 从第 1 个 token 开始。

对于一个 TTFT 为 500 ms、100 个输出 token 且总 decode 时间为 700 ms 的请求，GenAI-Perf 报告 `ITL = 700/99 = 7.07 ms`，LLMPerf 报告 `ITL = 1200/100 = 12.00 ms`。工具选择会改变数值。

始终说明所用工具，并始终公布定义。

### 构造 SLO

面向消费者的 2026 年 70B 聊天模型，一个合理 SLO 是：

- TTFT P99 <= 800 ms。
- TPOT P99 <= 25 ms。
- 对 <300-token 输出，E2E P99 <= 3 s。
- Goodput 目标 >= 99%。

企业 SLO 会收紧 TTFT（200–400 ms），并放宽 E2E。重点在于将它们写下来，测量全部三项，并把 goodput 作为一个统一复合指标跟踪。

### 如何测量

- 使用真实流量或逼真的合成流量运行（LLMPerf 参数为 `--mean-input-tokens 800 --stddev-input-tokens 300 --mean-output-tokens 150`）。
- 基准运行的目标并发度设为峰值的 2 倍。
- 运行 30–50 次迭代，从合并样本中取百分位数。
- 发布时注明工具名称、工具版本、模型、硬件、并发度和提示词分布。

```figure
throughput-latency
```

## 使用

`code/main.py` 是一个玩具 goodput 计算器。生成合成延迟分布，应用 SLO，并计算 goodput。它还会在同一条 trace 上展示 GenAI-Perf 与 LLMPerf 的 TPOT 差异。

## 交付

本课产出 `outputs/skill-slo-goodput-gate.md`。给定一个工作负载和 SLO，它会生成适用于 CI/CD 的基准方案：以 goodput 而非吞吐量作为部署闸门。

## 练习

1. 运行 `code/main.py`。生成一个含 1% 尾部尖峰的分布。当你将 P99 TPOT 从 30 ms 收紧为 15 ms 时，goodput 如何变化？
2. 供应商声称“Llama 3.3 70B H100 可达 15,000 tok/s”。在信任它之前，要问哪三个问题？
3. 为什么分块 prefill 能保护 P99 TPOT，却不能保护平均 TPOT？
4. 为语音助理构造一个消费者 SLO（用户听到而不是读到首 token）。哪项指标对用户最可见？
5. 阅读 LLMPerf README 和 GenAI-Perf 文档。找出工具在其他三项指标上的分歧。

## 关键术语

| 术语 | 人们怎么说 | 实际含义 |
|------|-----------|----------|
| TTFT | “首 token 时间” | 排队 + 网络 + prefill；长提示词时由 prefill 主导 |
| TPOT | “每个输出 token 的时间” | 首 token 后每个 token 受内存约束的 decode 成本 |
| ITL | “token 间延迟” | 在大多数工具中等同 TPOT（但并非所有工具——见 GenAI-Perf） |
| E2E | “端到端” | TTFT + TPOT * output_len；另加响应侧网络时间 |
| Throughput | “tok/s” | 集群效率；没有延迟百分位数就没有意义 |
| Goodput | “满足 SLO 的比例” | 同时满足每一项 SLO 约束的请求比例 |
| P99 | “尾部” | 最差的 1/100 延迟；用户体验指标 |
| SLO 多约束 | “联合条件” | 三项延迟上限的 AND；任何一项违反都算请求失败 |
| GenAI-Perf vs LLMPerf | “工具陷阱” | 工具对 ITL 是否包含 TTFT 存在分歧 |

## 延伸阅读

- [NVIDIA NIM — LLM Benchmarking Metrics](https://docs.nvidia.com/nim/benchmarking/llm/latest/metrics.html) — TTFT、ITL、TPOT 的规范定义。
- [Anyscale — LLM Serving Benchmarking Metrics](https://docs.anyscale.com/llm/serving/benchmarking/metrics) — 替代定义与测量方案。
- [BentoML — LLM Inference Metrics](https://bentoml.com/llm/inference-optimization/llm-inference-metrics) — 面向真实部署的应用测量。
- [LLMPerf](https://github.com/ray-project/llmperf) — 基于 Ray 的开源基准。
- [GenAI-Perf](https://github.com/triton-inference-server/perf_analyzer/blob/main/genai-perf/README.md) — NVIDIA 的基准工具。
- [MLPerf Inference](https://mlcommons.org/benchmarks/inference-datacenter/) — 行业接受的、基于 goodput 的基准。
