---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/17-infrastructure-and-production/13-llm-observability/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: eef0e8c56bfce6c48914766194c3fb738c7c4998fee43471c54038f447df1cc2
status: reviewed
---

# LLM 可观测性栈选型

> 2026 年的可观测性市场分为两类。开发平台（LangSmith、Langfuse、Comet Opik）将监控与评估、提示词管理、会话回放打包。网关/插桩工具（Helicone、SigNoz、OpenLLMetry、Phoenix）专注于遥测。Langfuse 的核心采用 MIT 许可，在 OSS 平衡上表现强劲（云端每月 50K events 免费）。Phoenix 原生支持 OpenTelemetry，采用 Elastic License 2.0——非常适合漂移/RAG 可视化，但不是持久化生产后端。Arize AX 使用零拷贝 Iceberg/Parquet 集成，声称成本比单体可观测性低 100 倍。LangSmith 在 LangChain/LangGraph 中领先，$39/user/mo，仅 Enterprise 支持自托管。Helicone 基于代理，15–30 分钟完成设置，每月 100K req 免费，但智能体 trace 深度较浅。常见的生产模式是：网关（Helicone/Portkey）+ 评估平台（Phoenix/TruLens），由 OpenTelemetry 粘合。

**类型：** 学习
**语言：** Python（标准库，用于模拟 trace 采样的玩具程序）
**前置要求：** 第 17 阶段 · 08（推理指标），第 14 阶段（智能体工程）
**用时：** 约 60 分钟

## 学习目标

- 区分开发平台（打包：评估 + 提示词 + 会话）与网关/遥测工具（仅 trace + 指标）。
- 将六种主要工具（Langfuse、LangSmith、Phoenix、Arize AX、Helicone、Opik）映射到其许可、定价和最适用场景。
- 解释 OpenTelemetry 粘合模式如何使你把网关工具与独立评估平台组合起来。
- 说出 2026 年成本差异化因素（Arize AX 的零拷贝方式相对单体采集）并说明约 100 倍的量级。

## 问题

你交付了一项 LLM 功能，它能工作。可你完全看不到提示词失败、工具循环、延迟回归、成本尖峰或提示词缓存命中率。你搜索“LLM observability”，得到八种工具，它们都声称以三种不同价位解决同一个问题。

它们解决的并不是同一个问题。LangSmith 回答“这次 LangGraph 运行为何失败？”；Phoenix 回答“我的 RAG 流水线是否发生漂移？”；Helicone 回答“哪个应用正在烧 token？”；Langfuse 回答“我能否自托管整个系统？”。工具不同，受众不同。

选择涉及四个维度：栈（LangChain？原始 SDK？多供应商？）、许可容忍度（只接受 MIT？Elastic 可以？商业可接受？）、预算（免费层？$100/mo？$1000/mo？），以及自托管（必须？最好有？绝不需要？）。

## 概念

### 两个类别

**开发平台** 将可观测性与评估、提示词管理、数据集版本管理、会话回放打包。你可以运行实验，查看哪种提示词效果好，并以数据集回归方式将新提示词与旧优胜者比较。LangSmith、Langfuse、Comet Opik 都属于此类。

**网关/遥测工具** 对推理调用进行插桩——提示词、响应、token、延迟、模型、成本。Helicone、SigNoz、OpenLLMetry、Phoenix。它们极简，可通过 OpenTelemetry 与独立评估工具组合。

### Langfuse——OSS 平衡

- 核心采用 Apache / MIT 许可；可通过 Docker 自托管。
- 云端免费层：每月 50K events。付费：团队 $29/mo。
- 评估、提示词管理、trace、数据集。对四项开发平台功能都有合理覆盖。
- 最适场景：你想要 LangSmith 级功能，但必须自托管或维持 OSS 许可。

### Phoenix（Arize）——遥测优先、原生 OpenTelemetry

- Elastic License 2.0；自托管很简单。
- 擅长 RAG 和漂移可视化，嵌入空间散点图是一等功能。
- 不适合作为持久化生产后端——主要用于开发期可观测性。
- 最适场景：RAG 流水线开发、漂移调试；生产时与独立网关配对。

### Arize AX——规模化方案

- 商业产品。通过 Iceberg/Parquet 实现零拷贝数据湖集成。
- 声称在大规模下比单体可观测性（Datadog 级）便宜约 100 倍。计算方式是：trace 存在你自己 S3 上的 Parquet 中，Arize 直接读取。
- 最适场景：每天 >10M 条 trace，已有数据湖，想要 LLM 专用仪表盘却不想承担 Datadog 定价。

### LangSmith——LangChain/LangGraph 优先

- 商业产品，$39/user/month。仅 Enterprise 可自托管。
- 对 LangChain 和 LangGraph 栈而言属同类最佳。若不使用二者，其吸引力会下降。
- 最适场景：团队已承诺 LangChain，且愿意付费。

### Helicone——基于代理的最小可行方案

- 将 `OPENAI_API_BASE` 替换为 Helicone 代理即可，设置用时 15–30 分钟。
- MIT 许可；每月 100K req 免费，付费 $20/mo+。
- 包括故障切换、缓存、速率限制——也充当网关。
- 智能体 / 多步骤 trace 深度较浅。
- 最适场景：快速开始、单栈应用，需要把网关和可观测性合二为一。

### Opik（Comet）——OSS 开发平台

- Apache 2.0，完全 OSS。
- 功能集与 Langfuse 相似，并带有 Comet 血统。
- 最适场景：已使用 Comet 的 ML 团队，希望在同一个面板中进行 LLM 可观测性。

### SigNoz——OpenTelemetry 优先的完整 APM

- Apache 2.0。通过 OpenTelemetry 同时处理通用 APM 和 LLM。
- 最适场景：跨服务和 LLM 调用的统一可观测性。

### 粘合层：OpenTelemetry + GenAI 语义约定

OpenTelemetry 在 2025 年末发布了 GenAI 语义约定（`gen_ai.system`、`gen_ai.request.model`、`gen_ai.usage.input_tokens`）。消费 OTel 的工具可以互操作。正在出现的生产模式：

1. 从每次 LLM 调用中发出带 GenAI 约定的 OTel。
2. 路由至网关（Helicone / Portkey），用于日常工作。
3. 双写至评估平台（Phoenix / Langfuse），用于回归。
4. 归档至数据湖（Iceberg），由 Arize AX 或 DuckDB 做长期分析。

### 陷阱：在错误层次插桩

在智能体框架内部插桩（例如添加 LangSmith trace）会使你与该框架耦合。在 HTTP/OpenAI-SDK 层插桩（通过 OpenLLMetry 或网关）则是可移植的。

### 采样——你无法保存一切

每天超过 1M 请求时，保留完整 trace 的成本会超过 LLM 调用本身。按规则采样：100% 错误、100% 高成本、5% 成功。始终保留聚合数据；保留原始数据以覆盖长尾。

### 应当记住的数字

- Langfuse 云端免费层：每月 50K events。
- LangSmith：$39/user/month。
- Helicone 免费层：每月 100K req。
- Arize AX 的声明：大规模下比单体方案便宜约 100 倍。
- OpenTelemetry GenAI 约定：2025 年发布，2026 年广泛采用。

```figure
i4-otel-glue
```

## 使用

`code/main.py` 模拟一天 1M trace 在不同保留策略下的情况（100% 采集、采样、采样 + 错误）。它报告存储成本及每种策略损失的内容。

## 交付

本课产出 `outputs/skill-observability-stack.md`。给定栈、规模、预算和许可立场，它会选择工具。

## 练习

1. 你的 LangChain 团队想要 OSS 自托管可观测性。选择 Langfuse 或 Opik，并说明理由。
2. 每天 5M 条 trace，Datadog 报价 $150K/month。计算 Arize AX 的盈亏平衡点。
3. 设计一组组织指南中必须在每次 LLM 调用上填写的 OpenTelemetry GenAI 属性。
4. 请论证 Phoenix 单独用于生产是否足够。何时不够？
5. Helicone 带来 20ms 代理开销。P99 TTFT 为 300 ms 时可接受吗？若 SLA 为 100 ms 呢？

## 关键术语

| 术语 | 人们怎么说 | 实际含义 |
|------|-----------|----------|
| OpenLLMetry | “面向 LLM 的 OTel” | 用于 LLM 的开源 OpenTelemetry 插桩 |
| GenAI 约定 | “OTel 属性” | LLM 调用的标准 OTel 属性名称 |
| LangSmith | “LangChain 可观测性” | 与 LangChain 生态打包的商业平台 |
| Langfuse | “OSS LangSmith” | 具相似功能集的 MIT OSS |
| Phoenix | “Arize 开发工具” | 原生 OpenTelemetry 的开发/评估平台 |
| Arize AX | “规模化可观测性” | 商业零拷贝 Iceberg/Parquet 可观测性 |
| Helicone | “代理可观测性” | 收集 LLM 遥测的 HTTP 代理 + 网关功能 |
| Opik | “Comet LLM” | 来自 Comet、采用 Apache 2.0 的 OSS 开发平台 |
| 会话回放 | “trace 重跑” | 回放完整智能体会话及工具调用 |
| Eval | “离线测试” | 在带标签数据集上运行候选模型/提示词 |

## 延伸阅读

- [SigNoz — Top LLM Observability Tools 2026](https://signoz.io/comparisons/llm-observability-tools/)
- [Langfuse — Arize AX Alternative analysis](https://langfuse.com/faq/all/best-phoenix-arize-alternatives)
- [PremAI — Setting Up Langfuse, LangSmith, Helicone, Phoenix](https://blog.premai.io/llm-observability-setting-up-langfuse-langsmith-helicone-phoenix/)
- [OpenTelemetry GenAI Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
- [Arize Phoenix docs](https://docs.arize.com/phoenix)
- [Helicone docs](https://docs.helicone.ai/)
