---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/14-agent-engineering/23-otel-genai-conventions/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 079cbb2f56f7ec32724047275efa9fbd66a2af5f3953edba52f675527e336aa8
status: reviewed
---

# OpenTelemetry GenAI 语义约定

> OpenTelemetry 的 GenAI SIG（2024 年 4 月成立）定义了智能体遥测的标准 schema。Span 名称、属性和内容捕获规则在不同厂商之间趋于一致，因此智能体轨迹在 Datadog、Grafana、Jaeger 和 Honeycomb 中表达相同含义。

**类型：** 学习 + 构建
**语言：** Python（标准库）
**前置要求：** 第 14 阶段 · 第 13 节（LangGraph）、第 14 阶段 · 第 24 节（可观测性平台）
**用时：** 约 60 分钟

## 学习目标

- 说出 GenAI span 的类别：model/client、agent、tool。
- 区分 invoke_agent CLIENT span 与 INTERNAL span，以及各自适用的情况。
- 列出顶层 GenAI 属性：提供方名称、请求模型、数据源 ID。
- 解释内容捕获契约：选择加入、OTEL_SEMCONV_STABILITY_OPT_IN、外部引用建议。

## 问题所在

每个厂商都在发明自己的 span 名称。运维团队最后只能为每个框架构建独立 dashboard。OpenTelemetry 的 GenAI SIG 通过定义整个生态共同遵循的一套标准来解决这个问题。

## 核心概念

### Span 类别

1. **模型 / 客户端 span。** 覆盖原始 LLM 调用。由提供方 SDK（Anthropic、OpenAI、Bedrock）和框架模型适配器发出。
2. **智能体 span。** create_agent（构造智能体时）和 invoke_agent（运行智能体时）。
3. **工具 span。** 每次工具调用一个；通过父子关系连接到智能体 span。

### 智能体 span 命名

- Span 名称：如果已命名，则为 invoke_agent {gen_ai.agent.name}；否则回退为 invoke_agent。
- Span kind：
  - **CLIENT**——远程智能体服务（OpenAI Assistants API、Bedrock Agents）。
  - **INTERNAL**——进程内智能体框架（LangChain、CrewAI、本地 ReAct）。

### 关键属性

- gen_ai.provider.name——anthropic、openai、aws.bedrock、google.vertex。
- gen_ai.request.model——模型 ID。
- gen_ai.response.model——最终解析到的模型（路由后可能与请求不同）。
- gen_ai.agent.name——智能体标识符。
- gen_ai.operation.name——chat、completion、invoke_agent、tool_call。
- gen_ai.data_source.id——用于 RAG：查阅了哪个语料库或存储。

Anthropic、Azure AI Inference、AWS Bedrock、OpenAI 都有技术专用约定。

### 内容捕获

默认规则是：插桩默认不应捕获输入/输出。捕获通过以下属性选择加入：

- gen_ai.system_instructions
- gen_ai.input.messages
- gen_ai.output.messages

推荐的生产模式是：将内容外部存储（S3、自己的日志存储），在 span 上记录引用（指针 ID，而不是散文）。这是第 27 节的内容中毒防御接入可观测性的方式。

### 稳定性

截至 2026 年 3 月，大多数约定仍是 experimental。通过以下环境变量选择加入稳定预览：

```
OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental
```

Datadog v1.37+ 会将 GenAI 属性原生映射到其 LLM Observability schema。其他后端（Grafana、Honeycomb、Jaeger）支持原始属性。

### 这个模式会在哪里出错

- **在 span 中捕获完整提示词。** PII、密钥、客户数据进入运维人员可读的 trace。应外部存储。
- **没有 gen_ai.provider.name。** 缺少归属后，多提供方 dashboard 会失效。
- **Span 没有父级链接。** 工具 span 变成孤儿。始终传播上下文。
- **没有设置 stability opt-in。** 后端升级时，你的属性可能被重命名。

```figure
ae-genai-span-tree
```

## 动手构建

code/main.py 实现一个符合 GenAI 约定的标准库 span 发射器：

- 带 GenAI 属性 schema 的 Span。
- 带 start_span、嵌套上下文的 Tracer。
- 一个脚本化智能体运行，发出 create_agent、invoke_agent（INTERNAL）、每个工具的 span 和 LLM 调用的 chat span。
- 内容捕获模式：将提示词外部存储，在 span 上记录 ID。

运行：

```
python3 code/main.py
```

输出是一棵包含全部必需 GenAI 属性的 span 树，以及展示选择加入内容引用的“外部存储”。

## 实际使用

- **Datadog LLM Observability**（v1.37+）原生映射属性。
- **Langfuse / Phoenix / Opik**（第 24 节）——自动插桩整个生态。
- **Jaeger / Honeycomb / Grafana Tempo**——原始 OTel trace；根据 GenAI 属性构建 dashboard。
- **自托管**——运行带 GenAI processor 的 OTel Collector。

## 交付

outputs/skill-otel-genai.md 会将 OTel GenAI span 接入现有智能体，提供内容捕获默认设置和外部引用存储。

## 练习

1. 用 invoke_agent（INTERNAL）+ 每个工具 span 为第 01 节的 ReAct 循环插桩。发送到 Jaeger 实例。
2. 以“仅引用”模式增加内容捕获：提示词存入 SQLite，span 属性只携带行 ID。
3. 阅读 gen_ai.data_source.id 规范。将它接入第 09 节的 Mem0 搜索。
4. 设置 OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental，验证 collector 不会重命名属性。
5. 构建 dashboard：只根据 GenAI 属性回答“哪些工具错误与哪些模型相关”。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| GenAI SIG | “OpenTelemetry GenAI 小组” | 定义 schema 的 OTel 工作组 |
| invoke_agent | “智能体 span” | 表示一次智能体运行的 span 名称 |
| CLIENT span | “远程调用” | 调用远程智能体服务的 span |
| INTERNAL span | “进程内” | 进程内智能体运行的 span |
| gen_ai.provider.name | “提供方” | anthropic / openai / aws.bedrock / google.vertex |
| gen_ai.data_source.id | “RAG 来源” | 检索命中的语料库/存储 |
| Content capture | “提示词记录” | 选择加入的消息捕获；生产环境外部存储 |
| Stability opt-in | “预览模式” | 固定 experimental 约定的环境变量 |

## 延伸阅读

- [OpenTelemetry GenAI 语义约定](https://opentelemetry.io/docs/specs/semconv/gen-ai/)——规范
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/)——默认发出 GenAI span
- [AutoGen v0.4（Microsoft Research）](https://www.microsoft.com/en-us/research/articles/autogen-v0-4-reimagining-the-foundation-of-agentic-ai-for-scale-extensibility-and-robustness/)——内置 OTel span
- [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview)——W3C 追踪上下文传播
