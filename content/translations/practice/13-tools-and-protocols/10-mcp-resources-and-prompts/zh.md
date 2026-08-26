---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/10-mcp-resources-and-prompts/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: a216053c7bc5c84c3fae6d4ecbed6f3771d6ccf4599314d4f8776860bc4fa39f
status: reviewed
---

# MCP 资源与 Prompt——工具之外的上下文暴露

> 工具获得了 MCP 90% 的关注。其他两种服务器原语解决的是不同问题：资源暴露可读取的数据；prompt 暴露可复用的 slash command 模板。许多服务器应该使用资源，而不是把读取操作包在工具中；也应该使用 prompt，而不是把工作流硬编码到客户端提示中。本课将给出决策规则，并走过 `resources/*` 和 `prompts/*` 消息。

**类型：** 构建
**语言：** Python（标准库、资源 + prompt 处理器）
**前置课程：** Phase 13 · 07（MCP 服务器）
**时间：** 约 45 分钟

## 学习目标

- 针对给定领域，在工具、资源和 prompt 之间决定应该暴露某项能力的方式。
- 实现 `resources/list`、`resources/read`、`resources/subscribe`，并处理 `notifications/resources/updated`。
- 使用参数模板实现 `prompts/list` 和 `prompts/get`。
- 识别宿主何时将 prompt 暴露为 slash command，何时自动注入上下文。

## 问题

一个幼稚的笔记应用 MCP 服务器会把所有东西都暴露成工具：`notes_read`、`notes_list`、`notes_search`。这会把每次数据访问都包成模型驱动的工具调用，后果包括：

- 对每个可能从上下文中获益的查询，模型都必须决定是否调用 `notes_read`。
- 只读内容无法被订阅，也无法流式传送到宿主的侧边栏。
- 客户端 UI（Claude Desktop 的资源附件面板、Cursor 的“包含文件”选择器）无法呈现这些数据。

正确的划分是：将数据暴露为资源，将会修改状态或需要计算的动作暴露为工具，将可复用的多步工作流暴露为 prompt。每种原语都有自己的 UX 能力和访问模式。

## 概念

### 工具、资源与 Prompt——决策规则

| 能力 | 原语 |
|------------|-----------|
| 用户希望搜索、过滤或转换数据 | 工具 |
| 用户希望宿主将数据作为上下文加入 | 资源 |
| 用户希望重用一个模板化工作流 | Prompt |

指导原则：如果模型在每个相关查询中都能从调用它受益，那就是工具。如果用户会从将它附加到对话中受益，那就是资源。如果用户想重用的单元是整个多步工作流，那就是 prompt。

### 资源

`resources/list` 返回 `{resources: [{uri, name, mimeType, description?}]}`。`resources/read` 接收 `{uri}`，返回 `{contents: [{uri, mimeType, text | blob}]}`。

URI 可以是任何可寻址的内容：

- `file:///Users/alice/notes/mcp.md`
- `postgres://my-db/query/SELECT ...`
- `notes://note-14`（自定义 scheme）
- `memory://session-2026-04-22/recent`（服务器专用）

`contents[]` 同时支持文本和二进制。二进制使用 base64 编码的字符串 `blob`，并附带 `mimeType`。

### 资源订阅

在能力中声明 `{resources: {subscribe: true}}`。客户端调用 `resources/subscribe {uri}`。资源发生变化时，服务器发送 `notifications/resources/updated {uri}`。客户端重新读取。

用例：笔记服务器的资源是磁盘上的文件；文件监视器触发更新通知；Claude Desktop 在文件被宿主外部编辑后，将文件重新拉取到上下文中。

### 资源模板（2025-11-25 新增）

`resourceTemplates` 允许暴露参数化 URI 模式：`notes://{id}`，其中 `id` 是补全目标。客户端可以在资源选择器中自动补全 ID。

### Prompt

`prompts/list` 返回 `{prompts: [{name, description, arguments?}]}`。`prompts/get` 接收 `{name, arguments}`，返回 `{description, messages: [{role, content}]}`。

Prompt 是一个模板，会填充为宿主发送给模型的消息列表。例如，`code_review` prompt 接收 `file_path` 参数，返回三条消息的序列：system 消息、带文件内容的 user 消息和带推理模板的 assistant 起始消息。

### 宿主与 Prompt

Claude Desktop、VS Code 和 Cursor 在聊天 UI 中将 prompt 暴露为 slash command。用户输入 `/code_review`，再从表单中选择参数。服务器的 prompt 是“用户快捷操作”和“发送给模型的完整提示”之间的契约。

不是每个客户端都支持 prompt，先检查能力协商。声明了 prompt 能力、但客户端不支持 prompt 的服务器，只是不会看到这些 slash command。

### “列表已变化”通知

资源和 prompt 的集合发生变化时，都会发送 `notifications/list_changed`。刚导入 20 条笔记的服务器会发送 `notifications/resources/list_changed`；客户端重新调用 `resources/list` 以获得新增内容。

### 内容类型约定

文本使用：`mimeType: "text/plain"`、`text/markdown`、`application/json`。
二进制使用：`image/png`、`application/pdf`，以及 `blob` 字段。
MCP Apps（第 14 课）使用 `ui://` URI 中的 `text/html;profile=mcp-app`。

### 动态资源

资源 URI 不必对应静态文件。每次读取 `notes://recent` 都可以返回最新五条笔记。`db://query/users/active` 可以执行参数化查询。服务器可以自由地动态计算内容。

规则是：如果客户端能够按 URI 缓存，URI 就必须稳定。如果计算是一次性的，URI 应包含时间戳或 nonce，使客户端缓存不会过期失效。

### 订阅与轮询

支持订阅的客户端通过 `notifications/resources/updated` 获得服务器推送。不支持订阅的客户端或宿主会通过重新读取来轮询。两者都符合规范。服务器的能力声明告诉客户端它支持哪一种。

订阅的成本是服务器需要保存每会话状态（谁订阅了什么）。限制订阅集合的大小；断开的客户端应超时。

### Prompt 与系统提示

MCP 中的 prompt 不是系统提示。宿主的系统提示（它自己的运行指令）和 MCP prompt（由用户调用的服务器模板）并存。行为良好的客户端绝不会让服务器 prompt 覆盖自己的系统提示，而是将二者分层叠加。

```figure
t3-primitive-sort
```

## 动手使用

`code/main.py` 在第 07 课笔记服务器的基础上增加：

- 每条笔记的资源（`notes://note-1` 等），支持 `resources/subscribe`。
- 一个渲染成三消息模板的 `review_note` prompt。
- 文件监视器模拟：笔记修改时发出 `notifications/resources/updated`。
- 一个始终返回最新五条笔记的 `notes://recent` 动态资源。

运行演示，查看完整流程。

## 交付物

本课会生成 `outputs/skill-primitive-splitter.md`。给定一个拟议中的 MCP 服务器，这个 skill 会将每项能力分类为工具 / 资源 / prompt，并给出理由。

## 练习

1. 运行 `code/main.py`。观察初始资源列表，然后触发笔记编辑，确认 `notifications/resources/updated` 事件发出。

2. 添加 `resources/list_changed` 发送器：创建新笔记时发送通知，让客户端重新发现资源。

3. 为 GitHub MCP 服务器设计三个 prompt：`summarize_pr`、`triage_issue`、`release_notes`。每个都要有参数 schema，prompt 正文应无需进一步编辑即可运行。

4. 选取第 07 课服务器中的一个现有工具，判断它应继续作为工具，还是拆成资源 + 工具组合。用一句话说明理由。

5. 阅读规范的 `server/resources` 和 `server/prompts` 章节。找出 `resources/read` 中很少填充、但规范支持的一个字段。提示：查看资源内容上的 `_meta`。

## 术语

| 术语 | 人们常说 | 实际含义 |
|------|----------------|------------------------|
| 资源 | “暴露的数据” | 宿主可以读取的 URI 可寻址内容 |
| 资源 URI | “数据指针” | 带 scheme 前缀的标识符（`file://`、`notes://` 等） |
| `resources/subscribe` | “监视变化” | 客户端选择、针对特定 URI 的服务器推送更新 |
| `notifications/resources/updated` | “资源已变更” | 告知客户端已订阅资源拥有新内容的信号 |
| 资源模板 | “参数化 URI” | 带补全提示、供宿主选择器使用的 URI 模式 |
| Prompt | “Slash command 模板” | 带参数槽位的命名多消息模板 |
| Prompt 参数 | “模板输入” | 宿主在渲染前收集的类型化参数 |
| `prompts/get` | “渲染模板” | 服务器返回填充完成的消息列表 |
| 内容块 | “类型化块” | `{type: text \| image \| resource \| ui_resource}` |
| Slash command UX | “用户快捷操作” | 宿主将 prompt 显示为以 `/` 开头的命令 |

## 延伸阅读

- [MCP — Concepts: Resources](https://modelcontextprotocol.io/docs/concepts/resources) — 资源 URI、订阅与模板
- [MCP — Concepts: Prompts](https://modelcontextprotocol.io/docs/concepts/prompts) — Prompt 模板与 slash command 集成
- [MCP — Server resources spec 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/server/resources) — `resources/*` 消息完整参考
- [MCP — Server prompts spec 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts) — `prompts/*` 消息完整参考
- [MCP — Protocol info site: resources](https://modelcontextprotocol.info/docs/concepts/resources/) — 扩展官方文档的社区指南
