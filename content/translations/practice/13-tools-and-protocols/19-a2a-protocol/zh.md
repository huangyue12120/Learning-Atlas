---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/19-a2a-protocol/docs/en.md
  revision: 7a181b46332db6d2e1274c798e851bf978a008a9
  sha256: 6ffa81e756cabc661d58601f42a44a276d7c920c397e854a395d3187b97d9c9f
status: reviewed
---

# A2A——智能体到智能体协议

> MCP 面向智能体到工具。A2A（Agent2Agent）面向智能体到智能体，是一个开放协议，允许用不同框架构建的黑盒智能体协作。它由 Google 于 2025 年 4 月发布，2025 年 6 月捐赠给 Linux Foundation，并在 2026 年 4 月达到 v1.0；当时已有 150 多个支持者，包括 AWS、Cisco、Microsoft、Salesforce、SAP 和 ServiceNow。它吸收了 IBM 的 ACP，并加入 AP2 支付扩展。本课介绍 Agent Card、Task 生命周期和三种协议绑定，使用 A2A 1.0.1 的线上字段与方法名称。

**类型：** 构建
**语言：** Python（标准库，Agent Card + Task harness）
**前置课程：** Phase 13 · 06（MCP 基础）、Phase 13 · 08（MCP 客户端）
**时间：** 约 75 分钟

## 学习目标

- 区分智能体到工具（MCP）与智能体到智能体（A2A）的使用场景。
- 在 `/.well-known/agent-card.json` 发布带技能和 `supportedInterfaces` 元数据的 Agent Card。
- 走通 Task 生命周期：`TASK_STATE_SUBMITTED`、`TASK_STATE_WORKING`、`TASK_STATE_INPUT_REQUIRED`，以及 `TASK_STATE_COMPLETED`、`TASK_STATE_FAILED`、`TASK_STATE_CANCELED`、`TASK_STATE_REJECTED` 等终态。
- 使用 Parts 各自包含 `text`、`raw`、`url` 或 `data` 之一的 Messages，并将 Artifacts 作为输出。

## 问题

一个客服智能体需要将报告写作委托给专门的写作智能体。在 A2A 出现之前，选择包括：

- 自定义 REST API。可以工作，但每一对智能体都要做一次性集成。
- 共享代码库。要求两个智能体使用同一个框架运行。
- MCP。不合适：MCP 用于调用工具，而不是让两个智能体在保留各自内部推理黑盒的前提下协作。

A2A 填补了这个空白。它将交互建模为一个智能体向另一个智能体发送 Task，并带有生命周期、消息和 artifacts。被调用智能体的内部状态保持不透明——调用者只能看到任务状态转变和最终输出。

A2A 是“让跨框架智能体互相通信”的协议。它不取代 MCP；二者互补。

## 概念

### Agent Card

每个符合 A2A 的智能体都在 `/.well-known/agent-card.json` 发布一张卡：

```json
{
  "name": "research-agent",
  "description": "Summarizes academic papers and drafts citations.",
  "version": "1.2.0",
  "supportedInterfaces": [
    {
      "url": "https://research.example.com/a2a",
      "protocolBinding": "JSONRPC",
      "protocolVersion": "1.0"
    }
  ],
  "capabilities": {"streaming": true, "pushNotifications": true},
  "securitySchemes": {
    "bearer": {"httpAuthSecurityScheme": {"scheme": "Bearer"}}
  },
  "securityRequirements": [{"schemes": {"bearer": {"list": []}}}],
  "defaultInputModes": ["text/plain"],
  "defaultOutputModes": ["text/markdown"],
  "skills": [
    {
      "id": "summarize_paper",
      "name": "Summarize a paper",
      "description": "Read a paper PDF and produce a 3-paragraph summary.",
      "tags": ["research", "summarization"],
      "inputModes": ["text/plain", "application/pdf"],
      "outputModes": ["text/markdown"]
    }
  ]
}
```

发现基于 URL：获取卡片，从 `supportedInterfaces` 中选择客户端支持的第一个 `protocolBinding`，再枚举技能。输入和输出模式使用媒体类型。

### 签名 Agent Card

卡片可以携带 `signatures` 数组。每一项都是 JWS（RFC 7515），对移除 `signatures` 字段后、按 RFC 8785 规范化的卡片 JSON 计算签名。使用方按同样规则规范化卡片并验证签名，以防止冒充。

### Task 生命周期

```text
TASK_STATE_SUBMITTED
  -> TASK_STATE_WORKING
  -> TASK_STATE_COMPLETED | TASK_STATE_FAILED | TASK_STATE_CANCELED | TASK_STATE_REJECTED

TASK_STATE_WORKING
  -> TASK_STATE_INPUT_REQUIRED
  -> TASK_STATE_WORKING (the client sends a message with the same taskId)
```

客户端通过 `SendMessage` 发起请求，由服务器创建 Task。被调用智能体在这些状态之间转移；客户端通过 `GetTask` 轮询，或通过 `SendStreamingMessage` 和 `SubscribeToTask` 接收 SSE 流。流中包含 `statusUpdate` 和 `artifactUpdate` 事件，任务到达终态时关闭，不使用 `final` 标志。

### Messages 与 Parts

一条消息包含 `messageId`、`role`（`ROLE_USER` 或 `ROLE_AGENT`）以及一个或多个 Parts。每个 Part 恰好包含一个内容字段，该字段名表明内容类型：

- `text`：纯文本内容。
- `raw`：文件字节，在 JSON 中使用 base64，通常带 `filename` 和 `mediaType`。
- `url`：文件内容的链接。
- `data`：结构化 JSON 载荷（给被调用智能体的结构化输入）。不再使用 `kind` 字段作为类型标签。

示例：

```json
{
  "messageId": "msg-001",
  "role": "ROLE_USER",
  "parts": [
    {"text": "Summarize this paper."},
    {"raw": "...", "filename": "paper.pdf", "mediaType": "application/pdf"},
    {"data": {"targetLength": "3 paragraphs"}, "mediaType": "application/json"}
  ]
}
```

### Artifacts

输出是 Artifacts，而不是原始字符串。Artifact 是一种有名称、有类型的输出：

```json
{
  "artifactId": "art-001",
  "name": "summary",
  "parts": [{"text": "...", "mediaType": "text/markdown"}]
}
```

Artifact 可以作为分块流式传输。每个 `artifactUpdate` 事件包含制品以及 `append`、`lastChunk` 字段；调用者负责累积这些分块。

### 三种协议绑定 <!-- learning-atlas: three-protocol-bindings -->

1. **基于 HTTP 的 JSON-RPC 2.0**（`JSONRPC`）。使用 POST 发送请求，SSE 用于流式传输。方法采用 PascalCase：`SendMessage`、`SendStreamingMessage`、`GetTask`、`ListTasks`、`CancelTask`、`SubscribeToTask`、`CreateTaskPushNotificationConfig`、`GetTaskPushNotificationConfig`、`ListTaskPushNotificationConfigs`、`DeleteTaskPushNotificationConfig` 和 `GetExtendedAgentCard`。
2. **gRPC**（`GRPC`）。适用于 gRPC 已经是原生形态的企业环境，方法名相同。
3. **HTTP+JSON/REST**（`HTTP+JSON`）。使用 `POST /message:send`、`GET /tasks/{id}` 等资源路径。

三种绑定携带相同的数据模型。每个 `supportedInterfaces` 条目声明一种绑定及其 `protocolVersion`。客户端每次请求都发送 `A2A-Version: 1.0`，因为服务器会将缺少此标头的请求按 0.3 版本处理。

```http
POST /a2a HTTP/1.1
Host: research.example.com
Content-Type: application/json
A2A-Version: 1.0

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "SendMessage",
  "params": {
    "message": {
      "messageId": "msg-001",
      "role": "ROLE_USER",
      "parts": [{"text": "Summarize this paper."}]
    }
  }
}
```

### 保持不透明

一个关键设计原则是：被调用智能体的内部状态保持不透明。调用者看到任务状态和 artifacts。被调用智能体的思维链、工具调用以及子智能体委托全部不可见。这与 MCP 不同，MCP 中工具调用是透明的。

理由是：A2A 允许竞争者在不暴露内部的情况下协作。A2A 可以实现“调用这个客服智能体”，而调用者无需知道这个服务是如何实现的。

### 时间线

- **2025-04-09。** Google 宣布 A2A。
- **2025-06-23。** 捐赠给 Linux Foundation。
- **2025-08。** 吸收 IBM 的 ACP。
- **2025-09。** AP2 扩展（Agent Payments）发布。
- **2026-04。** v1.0 发布，拥有 150 多个支持组织。

### 与 MCP 的关系

| 维度 | MCP | A2A |
|-----------|-----|-----|
| 使用场景 | 智能体到工具 | 智能体到智能体 |
| 不透明性 | 工具调用透明 | 内部推理不透明 |
| 常见调用方 | 智能体运行时 | 另一个智能体 |
| 状态 | 工具调用结果 | 带生命周期的 Task |
| 授权 | OAuth 2.1（Phase 13 · 16） | Agent Card 的 `securitySchemes` + `securityRequirements` |
| 传输 | Stdio / Streamable HTTP | JSON-RPC / gRPC / HTTP+JSON |

想调用具体工具时使用 MCP。想把整个任务委托给另一个智能体时使用 A2A。许多生产系统同时使用两者：智能体使用 MCP 作为工具层，使用 A2A 作为协作层。

```figure
a2a-task-lifecycle
```

## 动手使用

`code/main.py` 实现了一个最小 A2A harness：写作智能体发布自己的卡片；研究智能体向它发送带 PDF part 和文本指令的 `SendMessage` 请求。任务经历 `TASK_STATE_WORKING` → `TASK_STATE_INPUT_REQUIRED` → `TASK_STATE_WORKING` → `TASK_STATE_COMPLETED`，并返回文本 artifact。全部使用标准库，通过内存传输聚焦消息形状。

注意观察：

- Agent Card JSON 的形状。
- 服务器侧 Task ID 分配和状态转换。
- 由内容字段决定类型的消息 parts。
- 任务中途的 `TASK_STATE_INPUT_REQUIRED` 分支。
- 完成时返回 artifact。

## 交付物

本课产出 `outputs/skill-a2a-agent-spec.md`。给定一个应当能被其他智能体调用的新智能体，该 skill 会产出 Agent Card JSON、技能 schema 和端点蓝图。

## 练习

1. 运行 `code/main.py`。追踪完整的 Task 生命周期，包括被调用智能体请求澄清时的 `TASK_STATE_INPUT_REQUIRED` 暂停。

2. 添加签名 Agent Card。在 `signatures` 中放入一项 `alg` 为 `HS256` 的 JWS，对不含 `signatures` 字段的规范化卡片 JSON 签名。编写验证器，并确认卡片被修改后验证失败。

3. 使用 `SendStreamingMessage` 实现任务流式传输：写作智能体先发出 `task`，再发出三个 `artifactUpdate` 分块，最后发出状态为 `TASK_STATE_COMPLETED` 的 `statusUpdate` 并关闭流。调用者累积这些分块。

4. 设计一个包装 MCP 服务器的 A2A 智能体。将每个 MCP 工具映射到一个 A2A 技能。记录权衡——失去了哪些不透明性？

5. 阅读 A2A v1.0 公告，找出截至 2026 年 4 月尚未被任何框架实现的一项功能。（提示：与多跳任务委托有关。）

## 术语

| 术语 | 人们会怎么说 | 它实际表示什么 |
|------|----------------|------------------------|
| A2A | “Agent-to-Agent 协议” | 面向黑盒智能体协作的开放协议 |
| Agent Card | “`/.well-known/agent-card.json`” | 描述智能体技能和 `supportedInterfaces` 的已发布元数据 |
| Skill | “可调用单元” | 智能体支持的命名操作（类似 MCP 工具） |
| Task | “委托单元” | 带生命周期和最终 artifact 的工作项 |
| Message | “任务输入” | 携带 Parts（`text`、`raw`、`url`、`data`） |
| Part | “类型化分块” | 恰好包含 `text` / `raw` / `url` / `data` 之一，可带 `mediaType`；不使用 `kind` 字段 |
| Artifact | “任务输出” | 完成时返回的有名称、有类型输出 |
| AP2 | “Agent Payments Protocol” | 基于 A2A 的支付扩展；卡片签名属于 A2A 核心（`signatures`） |
| 不透明性 | “黑盒协作” | 被调用智能体的内部对调用者隐藏 |
| `TASK_STATE_INPUT_REQUIRED` | “任务暂停” | 智能体需要更多信息时的中断状态 |

## 延伸阅读

- [a2a-protocol.org](https://a2a-protocol.org/latest/)——A2A 权威规范
- [a2aproject/A2A — GitHub](https://github.com/a2aproject/A2A)——参考实现与 SDK
- [A2A v1.0.1 release](https://github.com/a2aproject/A2A/tree/v1.0.1)——本课依据的带版本标签的 `docs/specification.md` 与规范性定义 `specification/a2a.proto`
- [Linux Foundation — A2A launch press release](https://www.linuxfoundation.org/press/linux-foundation-launches-the-agent2agent-protocol-project-to-enable-secure-intelligent-communication-between-ai-agents)——2025 年 6 月治理转移
- [Google Cloud — A2A protocol upgrade](https://cloud.google.com/blog/products/ai-machine-learning/agent2agent-protocol-is-getting-an-upgrade)——路线图与合作伙伴势头
- [Google Dev — A2A 1.0 milestone](https://discuss.google.dev/t/the-a2a-1-0-milestone-ensuring-and-testing-backward-compatibility/352258)——v1.0 发布说明与向后兼容指南
