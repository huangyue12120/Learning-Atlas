---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/17-infrastructure-and-production/22-load-testing-llm-apis/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: c1e295fcaa091d1c729005d2964d52e29321902f2630e80a663ad7f5fa004802
status: reviewed
---

# LLM API 压力测试：为何 k6 和 Locust 会撒谎

> 传统压力测试器并非为流式响应、可变输出长度、token 级指标或 GPU 饱和而设计。两种陷阱最常伤害团队。GIL 陷阱：Locust 的 token 级测量在 Python GIL 下运行 tokenization，它会在高并发下与请求生成竞争；tokenization 堆积随即抬高报告的 token 间延迟——瓶颈是客户端，不是服务器。提示词均一性陷阱：在循环中使用相同提示词，只测试 token 分布上的一个点；真实流量有可变长度和多样的前缀匹配。LLMPerf 通过 `--mean-input-tokens` + `--stddev-input-tokens` 修复。2026 年工具映射：LLM 专用（GenAI-Perf、LLMPerf、LLM-Locust、guidellm）提供 token 级准确性；**k6 v2026.1.0** + **k6 Operator 1.0 GA（2025 年 9 月）**——流式感知、Kubernetes 原生，可通过 TestRun/PrivateLoadZone CRD 分布式运行，最适合 CI/CD 闸门；Vegeta 用于 Go 的恒定速率饱和；Locust 2.43.3 只有使用 LLM-Locust 扩展才适合流式。负载模式：稳态、爬坡、尖峰（自动扩缩容测试）、浸泡（内存泄漏）。

**类型：** 构建
**语言：** Python（标准库，用于生成真实提示词和收集延迟的玩具程序）
**前置要求：** 第 17 阶段 · 08（推理指标），第 17 阶段 · 03（GPU 自动扩缩容）
**用时：** 约 75 分钟

## 学习目标

- 解释使通用压力测试器在 LLM API 上撒谎的两种反模式（GIL 陷阱、提示词均一性陷阱）。
- 为给定用途选择工具：LLMPerf（基准运行）、k6 + 流式扩展（CI 闸门）、guidellm（大规模合成）、GenAI-Perf（NVIDIA 参考）。
- 设计四种负载模式（稳态、爬坡、尖峰、浸泡），并说出各自捕捉的失败模式。
- 使用输入 token 的均值 + 标准差而非固定长度，构建真实提示词分布。

## 问题

你用 k6 对 LLM 端点做了 500 并发用户测试，它挺住了，于是上线。生产中只有 200 个真实用户，服务却崩了——P99 TTFT 爆炸、GPU 被钉满。

发生了两件事。第一，k6 发送了 500 个相同提示词；请求合并和前缀缓存让你以为正在处理 500 个并发 decode，实际只是在处理一个。第二，k6 不会以人眼所感知的方式跟踪流式响应中的 token 间延迟；它看到的是一个 HTTP 连接，而不是以不同间隔到达的 500 个 token。

LLM 压力测试是一门独立学科。

## 概念

### GIL 陷阱（Locust）

Locust 使用 Python，并在 GIL 下于客户端运行 tokenization。高并发时，tokenizer 排在请求生成之后。报告的 token 间延迟包含客户端的 tokenization 堆积。你以为服务器慢，实际是测试工具。

修复：LLM-Locust 扩展将 tokenization 移到独立进程，或使用编译语言的工具（k6、采用 tokenizers.rs 的 LLMPerf）。

### 提示词均一性陷阱

所有已知压力测试器都允许配置一条提示词。在 10,000 次循环测试中，每次都发送完全相同的提示词。服务器每次看到相同前缀——前缀缓存命中趋近 100%，吞吐量看起来极好。

修复：从提示词分布采样。LLMPerf 使用 `--mean-input-tokens 500 --stddev-input-tokens 150`——长度多样，内容多样。

### 四种负载模式

1. **稳态**——以恒定 RPS 运行 30–60 分钟。捕捉：基线性能回归。
2. **爬坡**——15 分钟内将 RPS 从 0 线性增加到目标。捕捉：容量断点、预热异常。
3. **尖峰**——突然提高 3–10 倍 RPS，持续 2 分钟再恢复。捕捉：自动扩缩容延迟、队列饱和、冷启动影响。
4. **浸泡**——稳态持续 4–8 小时。捕捉：内存泄漏、连接池漂移、可观测性溢出。

### 2026 年工具映射

**LLMPerf**（Anyscale）——Python，但 tokenization 由 Rust 支持。均值/标准差提示词，流式感知。性能运行的最佳默认选项。

**NVIDIA GenAI-Perf**——NVIDIA 参考工具，使用 Triton client，覆盖全面指标。注意其 ITL 排除 TTFT；LLMPerf 包含。相同服务器上两个工具会产生不同 TPOT。

**LLM-Locust**（TrueFoundry）——修复 GIL 陷阱的 Locust 扩展。熟悉的 Locust DSL + 流式指标。

**guidellm**——大规模合成基准。

**k6 v2026.1.0** + **k6 Operator 1.0 GA（2025 年 9 月）：**

- k6 本身（Go、编译型、无 GIL）新增流式感知指标。
- k6 Operator 使用 TestRun / PrivateLoadZone CRD 来实现 Kubernetes 原生分布式测试。
- 最适合 CI/CD 闸门和 SLA 测试。

**Vegeta**——Go，比 k6 简单。以恒定速率进行 HTTP 饱和。并非 LLM 感知，但适合网关 / 限流测试。

**Locust 2.43.3 原版**——对 LLM 有 GIL 陷阱，只有加上 LLM-Locust 扩展才适用。

### CI 中的 SLA 闸门

在 PR 中运行 k6：

- 在基线 RPS 下各运行 30–50 次迭代。
- 闸门：P50/P95 TTFT、5xx < 5%、TPOT 低于阈值。
- 违反时使构建失败。

### 真实提示词分布

从真实流量样本（若有）或已发布的分布构建（如聊天使用 ShareGPT 提示词，代码使用 HumanEval）。将均值 + 标准差送入 LLMPerf。无论如何都不要使用一条提示词循环。

### 应当记住的数字

- k6 Operator 1.0 GA：2025 年 9 月。
- k6 v2026.1.0：流式感知指标。
- 典型 LLMPerf 运行：在并发 X 下 100–1000 个请求。
- 典型 CI 闸门：每个 PR 30–50 次迭代。
- 四种模式：稳态、爬坡、尖峰、浸泡。

```figure
load-pattern-waves
```

## 使用

`code/main.py` 模拟使用真实提示词分布的压力测试，测量有效 TPOT，并展示提示词均一性陷阱。

## 交付

本课产出 `outputs/skill-load-test-plan.md`。给定工作负载和 SLA，它会选择工具并设计四种负载模式。

## 练习

1. 运行 `code/main.py`。比较均一与真实分布——差距在哪里？
2. 为 CI 闸门编写 k6 脚本：100 并发下 TTFT P95 < 800 ms，运行时间 5 分钟。
3. 你的浸泡测试显示内存每小时增长 50 MB。说出三种原因，以及用于在它们之间区分的插桩。
4. 尖峰测试从 10 RPS 到 100 RPS。若已部署 Karpenter + vLLM production-stack（第 17 阶段 · 03 + 18），预期恢复时间是多少？
5. 同一服务器上 GenAI-Perf 报告 TPOT=6ms，LLMPerf 报告 TPOT=11ms。解释原因。

## 关键术语

| 术语 | 人们怎么说 | 实际含义 |
|------|-----------|----------|
| LLMPerf | “LLM 工具” | Anyscale 基准工具，流式感知 |
| GenAI-Perf | “NVIDIA 工具” | NVIDIA 参考工具 |
| LLM-Locust | “面向 LLM 的 Locust” | 修复 GIL 陷阱的 Locust 扩展 |
| guidellm | “合成基准” | 大规模合成工具 |
| k6 Operator | “K8s k6” | 基于 CRD 的分布式 k6 |
| GIL 陷阱 | “Python 客户端开销” | Tokenization 堆积抬高报告延迟 |
| 提示词均一性陷阱 | “单提示词谎言” | 相同提示词循环命中缓存，抬高吞吐量 |
| 稳态 | “恒定负载” | N 分钟固定 RPS |
| 爬坡 | “线性上升” | 一段时长内从 0 到目标 |
| 尖峰 | “突发测试” | 突然倍增再恢复 |
| 浸泡 | “长时间测试” | 持续数小时，用于泄漏检测 |

## 延伸阅读

- [TianPan — Load Testing LLM Applications](https://tianpan.co/blog/2026-03-19-load-testing-llm-applications)
- [PremAI — Load Testing LLMs 2026](https://blog.premai.io/load-testing-llms-tools-metrics-realistic-traffic-simulation-2026/)
- [NVIDIA NIM — Introduction to LLM Inference Benchmarking](https://docs.nvidia.com/nim/large-language-models/1.0.0/benchmarking.html)
- [TrueFoundry — LLM-Locust](https://www.truefoundry.com/blog/llm-locust-a-tool-for-benchmarking-llm-performance)
- [LLMPerf](https://github.com/ray-project/llmperf)
- [k6 Operator](https://github.com/grafana/k6-operator)
