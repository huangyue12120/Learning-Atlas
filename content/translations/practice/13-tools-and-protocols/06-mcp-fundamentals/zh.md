---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/06-mcp-fundamentals/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 67c6891660801ef5b808da02d79d3f651c35fee97ffbabd3842229022b6e8cf4
status: reviewed
---

# MCP 基础——原语、生命周期与 JSON-RPC 基础

> MCP 之前的每种集成都是一次性的。Model Context Protocol 由 Anthropic 于 2024 年 11 月首次发布，如今由 Linux Foundation 的 Agentic AI Foundation 负责管理；它将发现与调用标准化，使任意客户端都能与任意服务器通信。2025-11-25 规范定义了六种原语（三种服务器原语、三种客户端原语）、三阶段生命周期和 JSON-RPC 2.0 线上格式。掌握这些内容，Phase 13 的其余 MCP 章节就只是阅读了。

**类型：** 学习
**语言：** Python（标准库、JSON-RPC 解析器）
**前置课程：** Phase 13 · 01 至 05（工具接口与函数调用）
**时间：** 约 45 分钟

## 学习目标

- 说出全部六种 MCP 原语（服务器上的 tools、resources、prompts；客户端上的 roots、sampling、elicitation），并分别给出一个用例。
- 走完三阶段生命周期（初始化、运行、关闭），并说明每个阶段由谁发送哪种消息。
- 解析和输出 JSON-RPC 2.0 的请求、响应与通知封装。
- 解释 `initialize` 阶段的能力协商是什么，以及没有它会出什么问题。

## 问题

在 MCP 之前，每个使用工具的智能体都有自己的协议。Cursor 有一个形似 MCP、但并不兼容的工具系统；Claude Desktop 使用另一套；VS Code 的 Copilot 扩展又有第三套。一个团队如果构建“Postgres 查询”工具，就要针对不同宿主的 API 重写三次。想复用它，就得复制代码。

结果是一次性集成的寒武纪大爆发，也给生态速度设下了上限。

MCP 通过标准化线上格式解决了这个问题。一个 MCP 服务器可以运行在每个 MCP 客户端中：Claude Desktop、ChatGPT、Cursor、VS Code、Gemini、Goose、Zed、Windsurf；截至 2026 年 4 月已有 300 多个客户端、每月 1.1 亿次 SDK 下载和超过 10,000 个公开服务器。Linux Foundation 于 2025 年 12 月在新的 Agentic AI Foundation 之下接管了管理权。

本 Phase 使用的规范版本是 **2025-11-25**。它加入了异步 Tasks（SEP-1686）、URL 模式的 elicitation（SEP-1036）、带工具的 sampling（SEP-1577）、增量 scope 同意（SEP-835）和 OAuth 2.1 resource-indicator 语义。Phase 13 · 09 至 16 会覆盖这些扩展。本课停留在基础部分。

## 概念

### 三种服务器原语

1. **Tools。** 可调用的动作。与 Phase 13 · 01 中相同的四步循环。
2. **Resources。** 暴露的数据。通过 URI 定位的只读内容：`file:///path`、`db://query/...` 和自定义 scheme。
3. **Prompts。** 可复用模板。宿主 UI 中的 slash command；服务器提供模板，客户端填入参数。

### 三种客户端原语

4. **Roots。** 服务器允许接触的 URI 集合。由客户端声明，服务器遵守。
5. **Sampling。** 服务器请求客户端模型执行一次 completion。这样可以运行由服务器托管的智能体循环，而不需要服务器持有 API key。
6. **Elicitation。** 服务器在执行过程中请求客户端用户提供结构化输入。形式可以是表单或 URL（SEP-1036）。

MCP 中的每项能力恰好属于这六种原语之一。Phase 13 · 10 至 14 会逐一深入。

### 线上格式：JSON-RPC 2.0

每条消息都是一个带有以下字段的 JSON 对象：

- 请求：`{jsonrpc: "2.0", id, method, params}`。
- 响应：`{jsonrpc: "2.0", id, result | error}`。
- 通知：`{jsonrpc: "2.0", method, params}`——没有 `id`，也不期待响应。

基础规范大约有 15 个方法，按原语分组。重要的方法包括：

- `initialize` / `initialized`（握手）
- `tools/list`、`tools/call`
- `resources/list`、`resources/read`、`resources/subscribe`
- `prompts/list`、`prompts/get`
- `sampling/createMessage`（服务器到客户端）
- `notifications/tools/list_changed`、`notifications/resources/updated`、`notifications/progress`

### 三阶段生命周期

**阶段 1：初始化。**

客户端发送带有 `capabilities` 和 `clientInfo` 的 `initialize`。服务器回复自己的 `capabilities`、`serverInfo` 和它支持的规范版本。客户端消化响应后发送 `notifications/initialized`。从这里开始，双方可以根据协商好的能力发送请求。

**阶段 2：运行。**

双向进行。客户端调用 `tools/list` 来发现工具，再调用 `tools/call` 执行。服务器如果声明了相应能力，可以发送 `sampling/createMessage`。服务器的工具集发生变化时，可以发送 `notifications/tools/list_changed`。用户改变根范围时，客户端可以发送 `notifications/roots/list_changed`。

**阶段 3：关闭。**

任意一方都可以关闭传输。MCP 没有结构化的 shutdown 方法；传输层（stdio 或 Streamable HTTP，见 Phase 13 · 09）负责承载连接结束信号。

### 能力协商

`initialize` 握手中的 `capabilities` 就是契约。服务器示例：

```json
{
  "tools": {"listChanged": true},
  "resources": {"subscribe": true, "listChanged": true},
  "prompts": {"listChanged": true}
}
```

服务器声明它可以发送 `tools/list_changed` 通知，并支持 `resources/subscribe`。客户端通过声明自己的能力进行回应：

```json
{
  "roots": {"listChanged": true},
  "sampling": {},
  "elicitation": {}
}
```

如果客户端没有声明 `sampling`，服务器就不能调用 `sampling/createMessage`。反过来也一样：如果服务器没有声明 `resources.subscribe`，客户端就不能尝试订阅。

正是这一点防止了生态漂移。不支持 sampling 的客户端仍然是合法 MCP 客户端；不调用 sampling 的服务器仍然是合法 MCP 服务器。它们只是不会一起使用该功能。

### 结构化内容与错误形状

`tools/call` 返回一个带类型块的 `content` 数组：`text`、`image`、`resource`。Phase 13 · 14 会向列表中加入 MCP Apps（`ui://` 交互式 UI）。

错误使用 JSON-RPC 错误码。规范定义的附加码包括 `-32002`“Resource not found”、`-32603`“Internal error”，以及放在 `error.data` 中的 MCP 特定错误数据。

### 客户端能力与工具调用细节

一个常见混淆是：`capabilities.tools` 表示客户端是否支持工具列表变更通知。客户端是否会调用具体工具，是由模型驱动的运行时选择，而不是能力标志。能力标志是规范层面的契约；模型选择与之正交。

### 为什么不用 REST，而用 JSON-RPC？

JSON-RPC 2.0（2010）是一个轻量的双向协议。REST 由客户端发起，而 MCP 需要服务器发起消息（sampling、通知），因此 JSON-RPC 对称的请求/响应形状很自然。JSON-RPC 也可以干净地运行在 stdio 和 WebSocket/Streamable HTTP 之上，而不必重新发明 HTTP 的请求形状。

```figure
mcp-tool-call
```

## 动手使用

`code/main.py` 提供一个最小 JSON-RPC 2.0 解析器和输出器，然后手动走完 `initialize` → `tools/list` → `tools/call` → `shutdown` 顺序，并打印每条消息。没有真正的传输；只有消息形状。对照延伸阅读中的规范，核实每个封装。

请重点观察：

- `initialize` 双向声明能力；响应包含 `serverInfo` 和 `protocolVersion: "2025-11-25"`。
- `tools/list` 返回一个 `tools` 数组；每个条目都有 `name`、`description`、`inputSchema`。
- `tools/call` 使用 `params.name` 和 `params.arguments`。
- 响应的 `content` 是一个 `{type, text}` 块数组。

## 交付物

本课会生成 `outputs/skill-mcp-handshake-tracer.md`。给定一段 pcap 风格的 MCP 客户端-服务器交互记录，这个 skill 会为每条消息标注它使用的原语、生命周期阶段和能力。

## 练习

1. 运行 `code/main.py`。找出发生能力协商的那一行，并说明如果服务器不声明 `tools.listChanged`，会有什么变化。

2. 扩展解析器，处理 `notifications/progress`。消息形状是：`{method: "notifications/progress", params: {progressToken, progress, total}}`。在长时间运行的 `tools/call` 期间发送它，并确认客户端处理器会显示进度条。

3. 从头到尾阅读 MCP 2025-11-25 规范——全文约 80 页。找出大多数服务器不需要的能力标志。提示：它与资源订阅有关。

4. 在纸上画出一个假设的“cron job”功能应当属于哪种原语。（提示：服务器希望客户端在预定时间调用它。当前六种原语都不适合。）MCP 的 2026 路线图中有一份相关 SEP 草案。

5. 解析 GitHub 上某个开放 MCP 服务器的一条会话日志。统计请求、响应和通知消息的数量，计算生命周期流量与运行流量各占多少。

## 术语

| 术语 | 人们常说 | 实际含义 |
|------|----------------|------------------------|
| MCP | “Model Context Protocol” | 用于模型发现并调用工具的开放协议 |
| 服务器原语 | “服务器暴露的东西” | tools（动作）、resources（数据）、prompts（模板） |
| 客户端原语 | “客户端允许服务器使用的东西” | roots（范围）、sampling（LLM 回调）、elicitation（用户输入） |
| JSON-RPC 2.0 | “线上格式” | 对称的请求/响应/通知封装 |
| `initialize` 握手 | “能力协商” | 第一对消息；服务器和客户端声明它们支持的功能 |
| `tools/list` | “发现” | 客户端请求服务器当前的工具集 |
| `tools/call` | “调用” | 客户端请求服务器带参数执行工具 |
| `notifications/*_changed` | “变更事件” | 服务器告知客户端其原语列表发生了变化 |
| 内容块 | “类型化结果” | 工具结果中的 `{type: "text" \| "image" \| "resource" \| "ui_resource"}` |
| SEP | “规范演进提案” | 命名的草案提案（例如异步 Tasks 的 SEP-1686） |

## 延伸阅读

- [Model Context Protocol — Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25) — 权威规范文档
- [Model Context Protocol — Architecture concepts](https://modelcontextprotocol.io/docs/concepts/architecture) — 六种原语的心智模型
- [Anthropic — Introducing the Model Context Protocol](https://www.anthropic.com/news/model-context-protocol) — 2024 年 11 月发布文章
- [MCP blog — First MCP anniversary](https://blog.modelcontextprotocol.io/posts/2025-11-25-first-mcp-anniversary/) — 一周年回顾与 2025-11-25 规范变更
- [WorkOS — MCP 2025-11-25 spec update](https://workos.com/blog/mcp-2025-11-25-spec-update) — SEP-1686、1036、1577、835 和 1724 摘要
