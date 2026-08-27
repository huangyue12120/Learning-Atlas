---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/16-multi-agent-and-swarms/12-a2a-protocol/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 88e30cad22423a230c73859d2151de5eaddc78936b5a11c840ddf753d2fa284c
status: reviewed
---

# A2A——智能体到智能体协议

> Google 于 2025 年 4 月宣布 A2A；到 2026 年 4 月，规范位于 https://a2a-protocol.org/latest/specification/，并得到 150 多家组织支持。A2A 是 MCP（第 13 课）的水平互补：MCP 是垂直的（智能体 ↔ 工具），A2A 是对等的（智能体 ↔ 智能体）。它定义 Agent Card（发现）、带制品的任务（文本、结构化数据、视频）、不透明的任务生命周期和认证。生产系统愈发将 MCP 与 A2A 配对。Google Cloud 在 2025–2026 年期间将 A2A 支持纳入 Vertex AI Agent Builder。

**类型：** 学习 + 构建
**语言：** Python（标准库，`http.server`、`json`）
**前置要求：** 第 16 阶段 · 04（原语模型）
**用时：** 约 75 分钟

## 问题

你的智能体需要调用另一个系统上的智能体，怎么做？可以暴露 HTTP 端点、定义定制 JSON 模式，并祈祷对端说相同语言。每一对智能体都会变成定制集成。

A2A 是此类调用的通用线路协议：标准发现、标准任务模型、标准传输、标准制品。它类似 HTTP+REST，但智能体是一等公民。

## 概念

### 四个元素

**Agent Card。** 位于 `/.well-known/agent.json` 的 JSON 文档，描述智能体：名称、技能、端点、支持的模态、认证要求。读取卡片便完成发现。

```
GET https://agent.example.com/.well-known/agent.json
→ {
    "name": "code-review-agent",
    "skills": ["review-python", "review-typescript"],
    "endpoints": {
      "tasks": "https://agent.example.com/tasks"
    },
    "auth": {"type": "bearer"},
    "modalities": ["text", "structured"]
  }
```

**任务。** 工作单元。一个拥有生命周期的异步、有状态对象：`submitted → working → completed / failed / canceled`。客户端发送任务，然后轮询或订阅更新。

**制品。** 任务产出的结果类型。文本、结构化 JSON、图像、视频、音频。制品具有类型，因此不同模态是一等公民。

**不透明生命周期。** A2A 不规定远程智能体*如何*解决任务。客户端看见状态转换和制品；实现可自由使用任意框架。

### MCP/A2A 分工

- **MCP**（第 13 课）：智能体 ↔ 工具。智能体经 JSON-RPC 向工具服务器读写，默认无状态。
- **A2A**：智能体 ↔ 智能体。对等协议；两端都是有各自推理过程的智能体。

生产多智能体系统同时使用两者。一个 A2A 对等体在自己这一侧调用 MCP 工具。这种分工让两个关注点保持清晰。

### 发现流程

```
Client                     Agent server
  ├──GET /.well-known/agent.json──>
  <──Agent Card JSON─────────────
  ├──POST /tasks {skill, input}──>
  <──201 task_id, state=submitted
  ├──GET /tasks/{id}──────────────>
  <──state=working, 42% done──────
  ├──GET /tasks/{id}──────────────>
  <──state=completed, artifacts──
```

也可使用流式方式：对 `/tasks/{id}/events` 发起 SSE 订阅，以接收推送更新。

### 认证

A2A 支持三种常见模式：

- **Bearer token**——OAuth2 或不透明 token。
- **mTLS**——双向 TLS；组织向彼此证明身份。
- **签名请求**——对载荷计算 HMAC。

认证在 Agent Card 中声明；客户端负责发现并遵守。

### 到 2026 年 4 月有 150 多家组织

企业采用推动 A2A 规模化。要点是：A2A 成为企业智能体系统跨越信任边界的方式。Google Cloud 发布 Vertex AI Agent Builder 的 A2A 支持；Microsoft Agent Framework 支持它；大多数主要框架（LangGraph、CrewAI、AutoGen）都提供 A2A 适配器。

### A2A 何处胜出

- **跨组织调用。** 公司 A 的智能体调用公司 B 的智能体。没有 A2A，每一对都是定制合同。
- **异构框架。** LangGraph 智能体调用 CrewAI 智能体，再调用定制 Python 智能体。A2A 负责统一。
- **类型化制品。** 视频结果、结构化 JSON、音频——都是一等公民。
- **长时间任务。** 不透明生命周期 + 轮询让耗时数小时的任务易于处理。

### A2A 何处吃力

- **对延迟敏感的微调用。** A2A 生命周期是异步的；亚毫秒级智能体间通信不适合，应使用直接 RPC。
- **紧耦合的进程内智能体。** 两个智能体若在同一 Python 进程中运行，A2A 的 HTTP 往返过度。
- **小团队。** 规范开销是真实的；仅内部智能体可能不需要这种形式化。

### A2A 与 ACP、ANP、NLIP

2024–2026 年出现数个相关规范：

- **ACP**（IBM/Linux Foundation）——A2A 的前身，范围更窄。
- **ANP**（Agent Network Protocol）——偏重对等发现、去中心化优先。
- **NLIP**（Ecma Natural Language Interaction Protocol，于 2025 年 12 月标准化）——自然语言内容类型。

截至 2026 年 4 月，A2A 是采用最广的对等协议。比较可参阅 arXiv:2505.02279（Liu 等人，“A Survey of Agent Interoperability Protocols”）。

```figure
sw-agent-card-discovery
```

## 动手构建

`code/main.py` 使用 `http.server` 和 JSON 实现一个最小 A2A 服务器与客户端。服务器：

- 暴露 `/.well-known/agent.json`，
- 接受 `POST /tasks`，
- 管理任务状态，
- 通过 `GET /tasks/{id}` 返回制品。

客户端：

- 获取 Agent Card，
- 提交任务，
- 轮询至完成，
- 读取制品。

运行：

```
python3 code/main.py
```

脚本在后台线程启动服务器，再让客户端对其运行。你将看到完整流程：发现、提交、轮询、制品。

## 实际使用

`outputs/skill-a2a-integrator.md` 设计一项 A2A 集成：Agent Card 内容、任务模式、认证选择、流式与轮询的取舍。

## 交付物

检查表：

- **固定规范版本。** A2A 仍在演变；Agent Card 应声明协议版本。
- **幂等任务创建。** 重复提交（网络重试）应只产生一个任务。
- **制品模式。** 声明智能体返回的形状；消费者应验证。
- **限流 + 认证。** A2A 面向公开网络；应用标准 Web 安全。
- **失败任务的死信队列。** 随时间检查模式，发现重复出现的失败类型。

## 练习

1. 运行 `code/main.py`。确认客户端发现服务器并收到正确制品。
2. 为服务器增加第二项技能（如 “summarize”）。更新 Agent Card。编写一个根据任务类型选择技能的客户端。
3. 实现 SSE 流端点：`/tasks/{id}/events`，发出状态改变。客户端需要做哪些不同的事？
4. 阅读 A2A 规范（https://a2a-protocol.org/latest/specification/）。找出规范强制要求、而此演示未实现的三项内容。
5. 比较 A2A（Agent Card 发现）与 MCP（通过 `listTools` 列出服务器能力）。自描述智能体与能力探测之间有什么取舍？

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| A2A | “智能体到智能体” | 让智能体跨系统调用其他智能体的对等协议；Google 2025。 |
| Agent Card | “智能体名片” | `/.well-known/agent.json` 中描述技能、端点、认证的 JSON。 |
| 任务 | “工作单元” | 具有生命周期的异步有状态对象；完成时产生制品。 |
| 制品 | “结果” | 类型化输出：文本、结构化 JSON、图像、视频、音频；一等媒体。 |
| 不透明生命周期 | “如何解决是智能体的事” | 客户端只见状态转换；服务器可自由选择框架/工具。 |
| 发现 | “找到智能体” | `GET /.well-known/agent.json` 返回卡片。 |
| MCP 与 A2A | “工具与对等体” | MCP：垂直 智能体 ↔ 工具；A2A：水平 智能体 ↔ 智能体。 |
| ACP / ANP / NLIP | “兄弟协议” | 相邻规范；A2A 是采用最广的 2026 协议。 |

## 延伸阅读

- [A2A specification](https://a2a-protocol.org/latest/specification/) — 权威规范
- [Google Developers Blog — A2A announcement](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/) — 2025 年 4 月发布文章
- [A2A GitHub repo](https://github.com/a2aproject/A2A) — 参考实现与 SDK
- [Liu et al. — A Survey of Agent Interoperability Protocols](https://arxiv.org/html/2505.02279v1) — MCP、ACP、A2A、ANP 比较
