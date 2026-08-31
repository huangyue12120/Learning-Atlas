---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/19-a2a-protocol/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 5c54f7443ce3693f8b9f4b7eb9e37daea2d9b74b2ff37e7afed9835df87dfd9c
status: reviewed
---

# A2A——智能体到智能体协议

> MCP 面向智能体到工具。A2A（Agent2Agent）面向智能体到智能体，是一个开放协议，允许用不同框架构建的黑盒智能体协作。它由 Google 于 2025 年 4 月发布，2025 年 6 月捐赠给 Linux Foundation，并在 2026 年 4 月达到 v1.0；当时已有 150 多个支持者，包括 AWS、Cisco、Microsoft、Salesforce、SAP 和 ServiceNow。本课将走过 Agent Card、Task 生命周期和两种传输绑定。

**类型：** 构建
**语言：** Python（标准库，Agent Card + Task harness）
**前置课程：** Phase 13 · 06（MCP 基础）、Phase 13 · 08（MCP 客户端）
**时间：** 约 75 分钟

## 学习目标

- 区分智能体到工具（MCP）与智能体到智能体（A2A）的使用场景。
- 在 `/.well-known/agent.json` 发布带技能和端点元数据的 Agent Card。
- 走通 Task 生命周期（submitted → working → input-required → completed / failed / canceled / rejected）。
- 使用包含 Parts（文本、文件、数据）的 Messages，并将 Artifacts 作为输出。

## 问题

一个客服智能体需要将报告写作委托给专门的写作智能体。在 A2A 出现之前，选择包括：

- 自定义 REST API。可以工作，但每一对智能体都要做一次性集成。
- 共享代码库。要求两个智能体使用同一个框架运行。
- MCP。不合适：MCP 用于调用工具，而不是让两个智能体在保留各自内部推理黑盒的前提下协作。

A2A 填补了这个空白。它将交互建模为一个智能体向另一个智能体发送 Task，并带有生命周期、消息和 artifacts。被调用智能体的内部状态保持不透明——调用者只能看到任务状态转变和最终输出。

A2A 是“让跨框架智能体互相通信”的协议。它不取代 MCP；二者互补。

## 概念

### Agent Card

每个符合 A2A 的智能体都在 `/.well-known/agent.json` 发布一张卡：

```json
{
  "schemaVersion": "1.0",
  "name": "research-agent",
  "description": "Summarizes academic papers and drafts citations.",
  "url": "https://research.example.com/a2a",
  "version": "1.2.0",
  "skills": [
    {
      "id": "summarize_paper",
      "name": "Summarize a paper",
      "description": "Read a paper PDF and produce a 3-paragraph summary.",
      "inputModes": ["text", "file"],
      "outputModes": ["text", "artifact"]
    }
  ],
  "capabilities": {"streaming": true, "pushNotifications": true}
}
```

发现基于 URL：获取卡片，了解 A2A 端点 URL，枚举技能。

### 签名 Agent Card（AP2）

AP2 扩展（2025 年 9 月）为 Agent Card 增加了加密签名。发布者使用 JWT 对自己的卡片签名；消费者进行验证。这可以防止冒充。

### Task 生命周期

```text
submitted -> working -> completed | failed | canceled | rejected
             -> input_required -> working (loop via message)
```

客户端通过 `tasks/send` 发起任务。被调用智能体在这些状态之间转移；客户端通过 SSE 订阅状态更新，或者进行轮询。

### Messages 与 Parts

一条消息携带一个或多个 Parts：

- `text`——纯文本内容。
- `file`——带 mimeType 的 base64 blob。
- `data`——类型化 JSON 载荷（给被调用智能体的结构化输入）。

示例：

```json
{
  "role": "user",
  "parts": [
    {"type": "text", "text": "Summarize this paper."},
    {"type": "file", "file": {"name": "paper.pdf", "mimeType": "application/pdf", "bytes": "..."}},
    {"type": "data", "data": {"targetLength": "3 paragraphs"}}
  ]
}
```

### Artifacts

输出是 Artifacts，而不是原始字符串。Artifact 是一种有名称、有类型的输出：

```json
{
  "name": "summary",
  "parts": [{"type": "text", "text": "..."}],
  "mimeType": "text/markdown"
}
```

Artifact 可以作为分块流式传输。调用者负责累积这些分块。

### 两种传输绑定 <!-- learning-atlas: two-transport-bindings -->

1. **基于 HTTP 的 JSON-RPC。** `/a2a` 端点，使用 POST 发送请求，可选 SSE 用于流式传输。默认绑定。
2. **gRPC。** 适用于 gRPC 已经是原生形态的企业环境。

两种绑定携带相同的逻辑消息形状。

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
| 授权 | OAuth 2.1（Phase 13 · 16） | JWT 签名的 Agent Card（AP2） |
| 传输 | Stdio / Streamable HTTP | 基于 HTTP 的 JSON-RPC / gRPC |

想调用具体工具时使用 MCP。想把整个任务委托给另一个智能体时使用 A2A。许多生产系统同时使用两者：智能体使用 MCP 作为工具层，使用 A2A 作为协作层。

```figure
a2a-task-lifecycle
```

## 动手使用

`code/main.py` 实现了一个最小 A2A harness：研究智能体发布自己的卡片；写作智能体收到一个带 parts 的 `tasks/send`，其中包含 PDF 和文本指令；它经历 working → input_required → working → completed，并返回文本 artifact。全部使用标准库，通过内存传输聚焦消息形状。

注意观察：

- Agent Card JSON 的形状。
- Task ID 分配和状态转换。
- 混合类型的消息 parts。
- 任务中途的 input-required 分支。
- 完成时返回 artifact。

## 交付物

本课产出 `outputs/skill-a2a-agent-spec.md`。给定一个应当能被其他智能体调用的新智能体，该 skill 会产出 Agent Card JSON、技能 schema 和端点蓝图。

## 练习

1. 运行 `code/main.py`。追踪完整的 Task 生命周期，包括被调用智能体请求澄清时的 input-required 暂停。

2. 添加签名 Agent Card。使用卡片规范化 JSON 的 HMAC 进行签名。编写验证器，并确认卡片被修改后验证失败。

3. 实现任务流式传输：写作智能体通过 SSE 发出三个增量 artifact 分块，调用者将它们累积起来。

4. 设计一个包装 MCP 服务器的 A2A 智能体。将每个 MCP 工具映射到一个 A2A 技能。记录权衡——失去了哪些不透明性？

5. 阅读 A2A v1.0 公告，找出截至 2026 年 4 月尚未被任何框架实现的一项功能。（提示：与多跳任务委托有关。）

## 术语

| 术语 | 人们会怎么说 | 它实际表示什么 |
|------|----------------|------------------------|
| A2A | “Agent-to-Agent 协议” | 面向黑盒智能体协作的开放协议 |
| Agent Card | “`/.well-known/agent.json`” | 描述智能体技能和端点的已发布元数据 |
| Skill | “可调用单元” | 智能体支持的命名操作（类似 MCP 工具） |
| Task | “委托单元” | 带生命周期和最终 artifact 的工作项 |
| Message | “任务输入” | 携带 Parts（文本、文件、数据） |
| Part | “类型化分块” | 消息中的 `text` / `file` / `data` 元素 |
| Artifact | “任务输出” | 完成时返回的有名称、有类型输出 |
| AP2 | “Agent Payments Protocol” | 用于信任和支付的签名 Agent Card 扩展 |
| 不透明性 | “黑盒协作” | 被调用智能体的内部对调用者隐藏 |
| Input-required | “任务暂停” | 智能体需要更多信息时的生命周期状态 |

## 延伸阅读

- [a2a-protocol.org](https://a2a-protocol.org/latest/)——A2A 权威规范
- [a2aproject/A2A — GitHub](https://github.com/a2aproject/A2A)——参考实现与 SDK
- [Linux Foundation — A2A launch press release](https://www.linuxfoundation.org/press/linux-foundation-launches-the-agent2agent-protocol-project-to-enable-secure-intelligent-communication-between-ai-agents)——2025 年 6 月治理转移
- [Google Cloud — A2A protocol upgrade](https://cloud.google.com/blog/products/ai-machine-learning/agent2agent-protocol-is-getting-an-upgrade)——路线图与合作伙伴势头
- [Google Dev — A2A 1.0 milestone](https://discuss.google.dev/t/the-a2a-1-0-milestone-ensuring-and-testing-backward-compatibility/352258)——v1.0 发布说明与向后兼容指南
