---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/11-mcp-sampling/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 9ee3c3f52111e1582b00ef49ad3b809abccfc5aaf07ab5ed7309b2e5d91637ca
status: reviewed
---

# MCP Sampling——服务器请求的 LLM 补全与智能体循环

> 大多数 MCP 服务器都是无脑执行器：接收参数、运行代码、返回内容。Sampling 让服务器反向请求：它可以要求客户端的 LLM 做出决策。这样服务器无需持有模型凭据，就能托管智能体循环。合并到 2025-11-25 规范中的 SEP-1577 为 sampling 请求加入了工具，使循环可以包含更深入的推理。漂移风险提示：截至 2026 年第一季度，sampling 中的 SEP-1577 工具形状仍是实验性的，SDK API 还在稳定中。

**类型：** 构建
**语言：** Python（标准库、sampling 测试工具）
**前置课程：** Phase 13 · 07（MCP 服务器）、Phase 13 · 10（资源与 prompt）
**时间：** 约 75 分钟

## 学习目标

- 解释 `sampling/createMessage` 解决了什么问题（服务器托管的循环，无需服务器端 API key）。
- 实现一个服务器，让它通过多回合 prompt 请求客户端 sampling，并返回补全。
- 使用 `modelPreferences`（成本 / 速度 / 智能优先级）引导客户端选择模型。
- 构建 `summarize_repo` 工具，让它通过 sampling 内部迭代，而不是将行为硬编码。

## 问题

一个用于代码摘要工作流的实用 MCP 服务器需要遍历文件树、选择要读取的文件、综合摘要并返回。LLM 推理应该在哪里发生？

方案 A：服务器调用自己的 LLM。需要 API key，由服务器付费，每用户成本很高。

方案 B：服务器返回原始内容，由客户端的智能体负责推理。可以工作，但会把服务器逻辑移入客户端提示，十分脆弱。

方案 C：服务器通过 `sampling/createMessage` 请求客户端 LLM。服务器保留算法（读哪些文件、执行几轮），客户端保留计费和模型选择。服务器完全不持有凭据。

Sampling 就是方案 C。它让受信任的服务器可以托管智能体循环，而无需把自己变成完整的 LLM 宿主。

## 概念

### `sampling/createMessage` 请求

服务器发送：

```json
{
  "jsonrpc": "2.0",
  "id": 42,
  "method": "sampling/createMessage",
  "params": {
    "messages": [{"role": "user", "content": {"type": "text", "text": "..."}}],
    "systemPrompt": "...",
    "includeContext": "none",
    "modelPreferences": {
      "costPriority": 0.3,
      "speedPriority": 0.2,
      "intelligencePriority": 0.5,
      "hints": [{"name": "claude-3-5-sonnet"}]
    },
    "maxTokens": 1024
  }
}
```

客户端运行自己的 LLM，然后返回：

```json
{"jsonrpc": "2.0", "id": 42, "result": {
  "role": "assistant",
  "content": {"type": "text", "text": "..."},
  "model": "claude-3-5-sonnet-20251022",
  "stopReason": "endTurn"
}}
```

### `modelPreferences`

三个相加为 1.0 的浮点数：

- `costPriority`：偏好更便宜的模型。
- `speedPriority`：偏好更快的模型。
- `intelligencePriority`：偏好能力更强的模型。

再加上 `hints`：服务器偏好的命名模型。客户端可以遵守，也可以不遵守；客户端用户的配置始终优先。

### `includeContext`

三个取值：

- `"none"`——只有服务器提供的消息。默认值。
- `"thisServer"`——包含该服务器会话中的之前消息。
- `"allServers"`——包含整个会话上下文。

由于会泄漏跨服务器上下文，`includeContext` 从 2025-11-25 起被软弃用。优先使用 `"none"`，并在消息中传入显式上下文。

### 带工具的 Sampling（SEP-1577）

2025-11-25 新增：sampling 请求可以包含 `tools` 数组。客户端使用这些工具运行完整的工具调用循环。这样服务器可以通过客户端模型托管 ReAct 风格的智能体循环。

```json
{
  "messages": [...],
  "tools": [
    {"name": "fetch_url", "description": "...", "inputSchema": {...}}
  ]
}
```

客户端循环执行：sampling；如果被调用则执行工具；再次 sampling；最后返回 assistant 消息。该特性截至 2026 年第一季度仍是实验性的；SDK 签名可能继续变化。实现时请对照 2025-11-25 规范中的 client/sampling 章节确认。

### 人在回路

客户端在运行 sampling 之前必须向用户展示服务器要求模型做什么。恶意服务器可能利用 sampling 操纵用户会话（“对用户说 X，让他们点击 Y”）。Claude Desktop、VS Code 和 Cursor 会将 sampling 请求显示为确认对话框，用户可以拒绝。

2026 年的共识是：没有人工确认的 sampling 是危险信号。网关（Phase 13 · 17）可以自动批准低风险 sampling，自动拒绝可疑内容。

### 没有 API key 的服务器托管循环

典型用例是一个自身没有 LLM 访问权限的代码摘要 MCP 服务器。它执行：

1. 遍历仓库结构。
2. 用“挑出最可能描述该仓库用途的五个文件”调用 `sampling/createMessage`。
3. 读取这些文件。
4. 将文件内容和“用三段话总结仓库”传入 `sampling/createMessage`。
5. 将摘要作为 `tools/call` 结果返回。

服务器从未接触 LLM API。客户端用户使用自己的凭据为补全付费。

### 安全风险（Unit 42 披露，2026 年第一季度）

- **隐蔽 sampling。** 工具总是带着“从会话上下文回复用户的邮箱”调用 sampling。Phase 13 · 15 会介绍攻击向量。
- **通过 sampling 窃取资源。** 服务器要求客户端总结攻击者的载荷，让用户承担费用。
- **循环炸弹。** 服务器在紧循环中调用 sampling。客户端必须执行每会话速率限制。

```figure
t3-sampling-flip
```

## 动手使用

`code/main.py` 提供一个假的服务器到客户端 sampling 测试工具。模拟的 `summarize_repo` 工具调用两轮 sampling（选择文件，然后总结），假的客户端返回预设响应。测试工具展示：

- 服务器带着 `modelPreferences` 发送 `sampling/createMessage`。
- 客户端返回一个补全。
- 服务器继续自己的循环。
- 速率限制器限制每次工具调用的 sampling 总数。

请重点观察：

- 服务器只暴露一个工具（`summarize_repo`）；所有推理都发生在 sampling 调用中。
- 模型偏好影响客户端的模型选择；hints 列出偏好的模型。
- 循环在 `stopReason: "endTurn"` 时终止。
- `max_samples_per_tool = 5` 限制可以捕获失控循环。

## 交付物

本课会生成 `outputs/skill-sampling-loop-designer.md`。给定一个需要调用 LLM 的服务器端算法（研究、摘要、规划），这个 skill 会设计基于 sampling 的实现，并加入合适的 modelPreferences、速率限制和安全确认。

## 练习

1. 运行 `code/main.py`。将 `max_samples_per_tool` 改为 2，观察速率限制截断。

2. 实现 SEP-1577 的 sampling 中工具变体：sampling 请求携带 `tools` 数组。验证客户端循环在返回最终补全前执行这些工具。注意漂移风险：SDK 签名在 2026 年上半年仍可能变化。

3. 加入人在回路确认：服务器第一次 `sampling/createMessage` 之前暂停并等待用户批准。被拒绝的调用返回类型化拒绝。

4. 添加按客户端会话索引的每用户速率限制器。同一用户在同一服务器上的循环应共享预算。

5. 设计一个使用 sampling 选择待包含片段的 `summarize_pdf` 工具。画出发送的消息。当 `modelPreferences.intelligencePriority` 从 0.1 变为 0.9 时，行为如何变化？

## 术语

| 术语 | 人们常说 | 实际含义 |
|------|----------------|------------------------|
| Sampling | “服务器到客户端的 LLM 调用” | 服务器请求客户端模型生成补全 |
| `sampling/createMessage` | “那个方法” | 发起 sampling 请求的 JSON-RPC 方法 |
| `modelPreferences` | “模型优先级” | 成本 / 速度 / 智能权重，加上名称提示 |
| `includeContext` | “跨会话泄漏” | 软弃用的上下文包含模式 |
| SEP-1577 | “Sampling 中的工具” | 允许 sampling 中携带工具，以便服务器托管 ReAct |
| 人在回路 | “用户确认” | 客户端在运行前向用户展示 sampling 请求 |
| 循环炸弹 | “失控 sampling” | 服务器端无限 sampling 循环；客户端必须限速 |
| 隐蔽 sampling | “隐藏推理” | 恶意服务器在 sampling 提示中隐藏意图 |
| 资源窃取 | “使用用户的 LLM 预算” | 服务器迫使客户端为用户不需要的 sampling 付费 |
| `stopReason` | “生成停止原因” | `endTurn`、`stopSequence` 或 `maxTokens` |

## 延伸阅读

- [MCP — Concepts: Sampling](https://modelcontextprotocol.io/docs/concepts/sampling) — Sampling 高层概览
- [MCP — Client sampling spec 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/client/sampling) — `sampling/createMessage` 权威形状
- [MCP — GitHub SEP-1577](https://github.com/modelcontextprotocol/modelcontextprotocol) — Sampling 中工具的规范演进提案（实验性）
- [Unit 42 — MCP attack vectors](https://unit42.paloaltonetworks.com/model-context-protocol-attack-vectors/) — 隐蔽 sampling 与资源窃取模式
- [Speakeasy — MCP sampling core concept](https://www.speakeasy.com/mcp/core-concepts/sampling) — 带客户端代码示例的演练
