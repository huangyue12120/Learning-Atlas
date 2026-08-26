---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/20-opentelemetry-genai/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 473d0c4210eddf4b2ae01ce38d1b5a997e75fab66b4be17c32b319c666d88dbb
status: reviewed
---

# OpenTelemetry GenAI——端到端追踪工具调用

> 一个智能体调用五个工具、三个 MCP 服务器和两个子智能体。你需要用一条 trace 覆盖全部过程。OpenTelemetry GenAI 语义约定（v1.37 及更高版本中的稳定属性）是 2026 年的标准，Datadog、Langfuse、Arize Phoenix、OpenLLMetry 和 AgentOps 都原生支持。本课命名 LLM span 和工具执行 span 所需的属性，走过 span 层级（智能体 → LLM → 工具），并提供一个可以接入任意 OTel exporter 的标准库 span 发射器。

**类型：** 构建
**语言：** Python（标准库，OTel span 发射器）
**前置课程：** Phase 13 · 07（MCP 服务器）、Phase 13 · 08（MCP 客户端）
**时间：** 约 75 分钟

## 学习目标

- 说出 LLM span 和工具执行 span 所需的 OTel GenAI 属性。
- 构建覆盖智能体循环、LLM 调用、工具调用和 MCP 客户端分发的 trace 层级。
- 决定哪些内容要捕获（主动选择），哪些内容要脱敏（默认设置）。
- 将 spans 发往本地 collector（Jaeger、Langfuse），而无需重写工具代码。

## 问题

2026 年 2 月的一次调试：用户报告“我的智能体有时要 30 秒响应，有时只要 3 秒”。没有 trace。日志显示了 LLM 调用，却没有工具分发、MCP 服务器往返或子智能体。你只能猜。最后发现：某个 MCP 服务器偶尔会在冷启动时卡住。

没有端到端追踪，你无法找到这种问题。OTel GenAI 可以解决它。

这些约定在 2025–2026 年由 OpenTelemetry 语义约定小组确定。它们定义稳定的属性名称，使 Datadog、Langfuse、Phoenix、OpenLLMetry 和 AgentOps 都能解析相同的 spans。只需插桩一次，就可以发送到任意后端。

## 概念

### Span 层级

```text
agent.invoke_agent  (top, INTERNAL span)
 ├── llm.chat       (CLIENT span)
 ├── tool.execute   (INTERNAL)
 │    └── mcp.call  (CLIENT span)
 ├── llm.chat       (CLIENT span)
 └── subagent.invoke (INTERNAL)
```

整个层级嵌套在同一个 trace id 下。span id 将父子关系连接起来。

### 必需属性

根据 2025–2026 语义约定：

- `gen_ai.operation.name`——`"chat"`、`"text_completion"`、`"embeddings"`、`"execute_tool"`、`"invoke_agent"`。
- `gen_ai.provider.name`——`"openai"`、`"anthropic"`、`"google"`、`"azure_openai"`。
- `gen_ai.request.model`——请求的模型字符串（例如 `"gpt-4o-2024-08-06"`）。
- `gen_ai.response.model`——实际提供服务的模型。
- `gen_ai.usage.input_tokens` / `gen_ai.usage.output_tokens`。
- `gen_ai.response.id`——用于关联的供应商响应 ID。

工具 span 的属性：

- `gen_ai.tool.name`——工具标识符。
- `gen_ai.tool.call.id`——具体调用的 ID。
- `gen_ai.tool.description`——工具描述（可选）。

智能体 span 的属性：

- `gen_ai.agent.name` / `gen_ai.agent.id` / `gen_ai.agent.description`。

### Span 类型

- 跨进程边界的调用（LLM 供应商、MCP 服务器）使用 `SpanKind.CLIENT`。
- 智能体自身的循环步骤和工具执行使用 `SpanKind.INTERNAL`。

### 主动选择的内容捕获

默认情况下，spans 携带指标和计时信息，不携带提示词或 completion。大载荷和 PII 默认关闭。设置 `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental` 以及特定的内容捕获环境变量可以加入内容。生产环境启用前要仔细审查。

### Span 上的事件

可以将词元级事件添加为 span 事件：

- `gen_ai.content.prompt`——输入消息。
- `gen_ai.content.completion`——输出消息。
- `gen_ai.content.tool_call`——记录的工具调用。

事件会在一个 span 内按时间排序，以便详细重放。

### Exporter

OTel spans 可以导出到：

- **Jaeger / Tempo。** 开源、可在本地部署。
- **Langfuse。** 专注 LLM 可观测性；可视化词元使用量。
- **Arize Phoenix。** 将评估与追踪结合。
- **Datadog。** 商业产品；原生解析 `gen_ai.*` 属性。
- **Honeycomb。** 面向列存储；便于查询。

它们都使用 OTLP 作为线路格式。你的代码不需要关心具体后端。

### 跨 MCP 传播

MCP 客户端调用服务器时，应将 W3C `traceparent` 头注入请求。Streamable HTTP 支持标准头。Stdio 原生不携带 HTTP 头；规范的 2026 年路线图讨论在 JSON-RPC 调用中增加 `_meta.traceparent` 字段。

在它发布之前，可以手工将 traceparent 放入每个请求的 `_meta` 中。服务器记录 trace id。

### 指标

除了 spans，GenAI 语义约定还定义了以下指标：

- `gen_ai.client.token.usage`——直方图。
- `gen_ai.client.operation.duration`——直方图。
- `gen_ai.tool.execution.duration`——直方图。

使用这些指标构建不需要逐调用细节的仪表盘。

### AgentOps 层

AgentOps（成立于 2024 年）专门做 GenAI 可观测性。它包装 LangGraph、Pydantic AI、CrewAI 等流行框架，自动发出 OTel spans。如果你的技术栈使用受支持的框架，它很有用；否则使用手动插桩。

```figure
t3-span-waterfall
```

## 动手使用

`code/main.py` 为一个调用 LLM、分发两个工具并进行一次 MCP 往返的智能体，以 OTel 形状将 spans 发到 stdout（类似 OTLP-JSON 的格式）。没有真正的 exporter——本课聚焦 span 形状和属性集合。你可以将输出粘贴到兼容 OTLP 的查看器中，也可以直接阅读。

注意观察：

- 所有 spans 共享同一个 trace id。
- 通过 `parentSpanId` 编码父子链接。
- 填充必需的 `gen_ai.*` 属性。
- 默认关闭内容捕获；一个场景通过环境变量打开它。

## 交付物

本课产出 `outputs/skill-otel-genai-instrumentation.md`。给定一个智能体代码库，该 skill 会产出插桩计划：在哪里添加 spans、填充哪些属性，以及选择哪些 exporter。

## 练习

1. 运行 `code/main.py`。数一数 spans，并识别哪些是 CLIENT、哪些是 INTERNAL。

2. 打开内容捕获（环境变量），确认出现 `gen_ai.content.prompt` 和 `gen_ai.content.completion` 事件。注意这对 PII 意味着什么。

3. 添加工具执行指标 `gen_ai.tool.execution.duration`，并在每次调用时将它作为直方图样本发出。

4. 将父智能体 span 的 traceparent 传播到 MCP 请求的 `_meta.traceparent` 字段。验证 MCP 服务器能够看到同一个 trace id。

5. 阅读 OTel GenAI 语义约定规范。找出规范列出、但本课代码没有发出的一个属性，并添加它。

## 术语

| 术语 | 人们会怎么说 | 它实际表示什么 |
|------|----------------|------------------------|
| OTel | “OpenTelemetry” | 面向 traces、metrics、logs 的开放标准 |
| GenAI 语义约定 | “GenAI semantic conventions” | LLM / 工具 / 智能体 span 的稳定属性名称 |
| `gen_ai.*` | “属性命名空间” | 所有 GenAI 属性共用的前缀 |
| Span | “计时操作” | 带开始时间、结束时间和属性的工作单元 |
| Trace | “跨 span 的祖先关系” | 共享 trace id 的 span 树 |
| SpanKind | “CLIENT / SERVER / INTERNAL” | 对 span 方向的提示 |
| OTLP | “OpenTelemetry 线路协议” | exporter 使用的线路格式 |
| 主动内容捕获 | “捕获提示词 / completion” | 默认关闭；通过环境变量开启 |
| traceparent | “W3C 头” | 跨服务传播 trace 上下文 |
| Exporter | “面向后端的发送器” | 将 spans 发送到 Jaeger / Datadog 等的组件 |

## 延伸阅读

- [OpenTelemetry — GenAI semconv](https://opentelemetry.io/docs/specs/semconv/gen-ai/)——GenAI spans、metrics 和 events 的权威约定
- [OpenTelemetry — GenAI spans](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/)——LLM 和工具执行 span 属性列表
- [OpenTelemetry — GenAI agent spans](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-agent-spans/)——智能体级 `invoke_agent` span
- [open-telemetry/semantic-conventions — GenAI spans](https://github.com/open-telemetry/semantic-conventions/blob/main/docs/gen-ai/gen-ai-spans.md)——GitHub 托管的事实来源
- [Datadog — LLM OTel semantic convention](https://www.datadoghq.com/blog/llm-otel-semantic-convention/)——生产集成 walkthrough
