---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/02-function-calling-deep-dive/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 4691bbc616aa41426d78eb1e3b77b8635de13cf451272e63fba79b59094a7e71
status: reviewed
---

# 函数调用深潜——OpenAI、Anthropic、Gemini

> 三家前沿提供商在 2024 年收敛到了同一个工具调用循环，之后却在其他所有地方分道扬镳。OpenAI 使用 `tools` 和 `tool_calls`，Anthropic 使用 `tool_use` 和 `tool_result` 块，Gemini 使用 `functionDeclarations` 和唯一 ID 关联。本课并排比较三者，使在一个提供商上运行的代码迁移到另一个提供商时不会在细节上崩溃。

**类型：** 构建
**语言：** Python（标准库、schema 转换器）
**前置课程：** Phase 13 · 01（工具接口）
**时间：** 约 75 分钟

## 学习目标

- 说出 OpenAI、Anthropic 和 Gemini 函数调用载荷的三种形状差异（声明、调用、结果）。
- 将一份工具声明转换为三个提供商的格式，并预测严格模式约束会在哪里不同。
- 在每个提供商中使用 `tool_choice` 强制、禁止或自动选择工具调用。
- 了解每个提供商的硬限制（工具数量、schema 深度、参数长度），以及违反限制时各自发出的错误特征。

## 问题

函数调用请求的形状因提供商而异。下面是 2026 年生产技术栈中的三个具体例子：

**OpenAI Chat Completions / Responses API。** 传入 `tools: [{type: "function", function: {name, description, parameters, strict}}]`。模型的响应包含 `choices[0].message.tool_calls: [{id, type: "function", function: {name, arguments}}]`，其中 `arguments` 是必须解析的 JSON 字符串。严格模式（`strict: true`）通过受约束解码强制 schema 合规。

**Anthropic Messages API。** 传入 `tools: [{name, description, input_schema}]`。响应以 `content: [{type: "text"}, {type: "tool_use", id, name, input}]` 返回。`input` 已经解析完成（是对象而非字符串）。你要用新的 `user` 消息回复，其中包含 `{type: "tool_result", tool_use_id, content}` 块。

**Google Gemini API。** 传入 `tools: [{functionDeclarations: [{name, description, parameters}]}]`（嵌套在 `functionDeclarations` 中）。响应以 `candidates[0].content.parts: [{functionCall: {name, args, id}}]` 到达；Gemini 3 及更高版本中的 `id` 是唯一的，用于并行调用关联。你要回复 `{functionResponse: {name, id, response}}`。

循环相同，字段名、嵌套方式、字符串与对象的约定以及关联机制却各不相同。一个团队如果在 OpenAI 上写了天气智能体，仅为了迁移管线，就要花两天移植到 Anthropic，再花一天移植到 Gemini。

本课构建一个转换器，将三种格式统一为一个规范工具声明，并在边缘完成路由。Phase 13 · 17 会将同一模式推广为 LLM 网关。

## 概念

### 共同结构

每个提供商都需要五样东西：

1. **工具列表。** 每个工具的名称、描述和输入 schema。
2. **工具选择。** 强制某个工具、禁止工具，或让模型自行决定。
3. **调用输出。** 指出工具及其参数的结构化输出。
4. **调用 ID。** 将响应关联回正确的调用（并行时尤其重要）。
5. **结果注入。** 将结果绑定回调用的消息或块。

### 按字段比较形状

| 方面 | OpenAI | Anthropic | Gemini |
|--------|--------|-----------|--------|
| 声明封装 | `{type: "function", function: {...}}` | `{name, description, input_schema}` | `{functionDeclarations: [{...}]}` |
| Schema 字段 | `parameters` | `input_schema` | `parameters` |
| 响应容器 | assistant 消息中的 `tool_calls[]` | 类型为 `tool_use` 的 `content[]` | 类型为 `functionCall` 的 `parts[]` |
| 参数类型 | JSON 字符串化 | 已解析对象 | 已解析对象 |
| ID 格式 | `call_...`（由 OpenAI 生成） | `toolu_...`（Anthropic） | UUID（Gemini 3+） |
| 结果块 | `tool` 角色、`tool_call_id` | 带 `tool_result`、`tool_use_id` 的 `user` | 带匹配 `id` 的 `functionResponse` |
| 强制工具 | `tool_choice: {type: "function", function: {name}}` | `tool_choice: {type: "tool", name}` | `tool_config: {function_calling_config: {mode: "ANY"}}` |
| 禁止工具 | `tool_choice: "none"` | `tool_choice: {type: "none"}` | `mode: "NONE"` |
| 严格 schema | `strict: true` | schema 即契约（始终强制） | 请求级 `responseSchema` |

### 你实际会遇到的限制

- **OpenAI。** 每次请求 128 个工具。Schema 深度 5。参数字符串不超过 8192 字节。严格模式要求没有 `$ref`，没有相互重叠的 `oneOf`/`anyOf`/`allOf`，并且每个属性都列在 `required` 中。
- **Anthropic。** 每次请求 64 个工具。Schema 深度实际上不设上限，但实践上限为 10。没有严格模式标志；schema 是契约，模型通常会遵守。
- **Gemini。** 每次请求 64 个函数。Schema 类型是 OpenAPI 3.0 子集（与 JSON Schema 2020-12 有轻微差异）。Gemini 3 起并行调用具有唯一 ID。

### `tool_choice` 的行为

三种模式每家都支持，只是名称不同。

- **Auto。** 模型选择工具或文本。默认模式。
- **Required / Any。** 模型至少必须调用一个工具。
- **None。** 模型不能调用工具。

此外，每个提供商各有一种独有模式：

- **OpenAI。** 按名称强制使用某个工具。
- **Anthropic。** 按名称强制使用某个工具；`disable_parallel_tool_use` 标志区分单调用和多调用。
- **Gemini。** `mode: "VALIDATED"` 让每个响应都经过 schema 校验器，无论模型原本想做什么。

### 并行调用

OpenAI 的 `parallel_tool_calls: true`（默认值）会在一条 assistant 消息中输出多个调用。你运行它们，再用一条批量的 tool 角色消息回复，每个 `tool_call_id` 对应一个条目。Anthropic 历史上是单调用；`disable_parallel_tool_use: false`（Claude 3.5 起的默认值）开启多调用。Gemini 2 支持并行调用但没有稳定 ID；Gemini 3 加入 UUID，使乱序响应能够被干净地关联。

### 流式传输

三家都支持流式工具调用，但线上格式不同：

- **OpenAI。** `tool_calls[i].function.arguments` 的增量块逐步到达。你要累积它们，直到 `finish_reason: "tool_calls"`。
- **Anthropic。** 由 block-start / block-delta / block-stop 事件组成。`input_json_delta` 块携带部分参数。
- **Gemini。** `streamFunctionCallArguments`（Gemini 3 新增）会带着 `functionCallId` 输出块，因此多个并行调用可以交错。

Phase 13 · 03 会深入并行与流式重组。本课聚焦声明和单调用形状。

### 错误与修复

参数无效时的错误形态也不同。

- **OpenAI（非严格模式）。** 模型返回 `arguments: "{bad json}"`，你的 JSON 解析失败，于是注入错误消息并重新调用。
- **OpenAI（严格模式）。** 校验发生在解码期间；无效 JSON 不可能出现，但可能出现 `refusal`。
- **Anthropic。** `input` 可能含有意外字段；schema 是建议性的。必须在服务器端校验。
- **Gemini。** OpenAPI 3.0 的一个问题：对象字段上的 `enum` 会被静默忽略；要自行校验。

### 转换器模式

你的代码中的规范工具声明可以长这样（形状由你选择）：

```python
Tool(
    name="get_weather",
    description="Use when ...",
    input_schema={"type": "object", "properties": {...}, "required": [...]},
    strict=True,
)
```

三个小函数把它转换为三个提供商的形状。本课的 `code/main.py` 正是这样做的，随后还会将一个假的工具调用通过每个提供商的响应形状往返解析。无需网络——本课教的是形状，而不是 HTTP。

生产团队会将这个转换器封装在 Pydantic AI 的 `AbstractToolset`、LangGraph 的 `UniversalToolNode` 或 LlamaIndex 的 `BaseTool` 中。Phase 13 · 17 会提供一个网关，在三家提供商前暴露 OpenAI 形状的 API。

```figure
function-call-args
```

## 动手使用

`code/main.py` 定义一个规范的 `Tool` 数据类和三个转换器，分别输出 OpenAI、Anthropic 与 Gemini 的声明 JSON。随后它会解析每种形状的手工编写的提供商响应，得到同一个规范调用对象，展示三种外表之下的语义是相同的。运行它，并排比较三个声明。

请重点观察：

- 三个声明块的差异只有封装和字段名。
- 三个响应块的差异在于调用所在的位置（顶层 `tool_calls`、`content[]` 块、`parts[]` 条目）。
- 一个 `canonical_call()` 函数可以从三种响应形状中提取 `{id, name, args}`。

## 交付物

本课会生成 `outputs/skill-provider-portability-audit.md`。给定一个针对单一提供商的函数调用集成，这个 skill 会产出可移植性审计：它依赖哪些提供商限制，哪些字段需要重命名，以及迁移到其他提供商时会在哪里出问题。

## 练习

1. 运行 `code/main.py`，确认三个提供商的声明 JSON 序列化的是同一个底层 `Tool` 对象。修改规范工具，添加一个枚举参数，确认只有 Gemini 转换器需要处理 OpenAPI 的差异。

2. 为每个提供商添加 `ListToolsResponse` 解析器，提取模型在 `list_tools` 或发现调用后返回的工具列表。OpenAI 原生没有这个接口；记录这一不对称之处。

3. 实现 `tool_choice` 转换：把规范的 `ToolChoice(mode="force", tool_name="x")` 映射到三种提供商的形状，再映射 `mode="any"` 和 `mode="none"`。对照本课的差异表。

4. 选择三家提供商中的一家，从头到尾阅读它的函数调用指南。找出一个其他两家不支持的 schema 字段。候选项包括：OpenAI 的 `strict`、Anthropic 的 `disable_parallel_tool_use`、Gemini 的 `function_calling_config.allowed_function_names`。

5. 编写一个测试向量：工具调用的参数违反声明的 schema。让它通过每个提供商的校验器（作为代理，使用第 01 课的标准库校验器即可），记录会触发哪些错误。说明在生产环境中你会选择哪家提供商来获得严格性。

## 术语

| 术语 | 人们常说 | 实际含义 |
|------|----------------|------------------------|
| 函数调用 | “工具使用” | 提供商级 API，用于输出结构化工具调用 |
| 工具声明 | “工具规格” | 名称 + 描述 + JSON Schema 输入载荷 |
| `tool_choice` | “强制 / 禁止” | auto / required / none / 指定名称等模式 |
| 严格模式 | “Schema 强制” | OpenAI 的标志，约束解码以匹配 schema |
| `tool_use` 块 | “Anthropic 的调用形状” | 带有 id、名称和输入的内联内容块 |
| `functionCall` 部分 | “Gemini 的调用形状” | `parts[]` 中包含名称、参数和 id 的条目 |
| 参数即字符串 | “字符串化 JSON” | OpenAI 返回 JSON 字符串而不是对象形式的参数 |
| 并行工具调用 | “一个回合内扇出” | 一条 assistant 消息中的多个工具调用 |
| 拒绝 | “模型拒答” | 严格模式专用的、替代调用的拒绝块 |
| OpenAPI 3.0 子集 | “Gemini schema 差异” | Gemini 使用的、与 JSON Schema 略有差异的类 JSON Schema 方言 |

## 延伸阅读

- [OpenAI — Function calling guide](https://platform.openai.com/docs/guides/function-calling) — 包含严格模式和并行调用的权威参考
- [Anthropic — Tool use overview](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview) — `tool_use` 与 `tool_result` 块语义
- [Google — Gemini function calling](https://ai.google.dev/gemini-api/docs/function-calling) — 并行调用、唯一 ID 和 OpenAPI 子集
- [Vertex AI — Function calling reference](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/function-calling) — Gemini 的企业级表面
- [OpenAI — Structured outputs](https://platform.openai.com/docs/guides/structured-outputs) — 严格模式 schema 强制的细节
