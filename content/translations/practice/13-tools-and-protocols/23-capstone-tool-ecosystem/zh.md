---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/23-capstone-tool-ecosystem/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: cc05f315de5cde1eb05b148c39b431148d7c3ab9ca5ee70beac776f096a87814
status: reviewed
---

# Capstone——构建完整的工具生态

> Phase 13 教会了你每个组成部分。本 capstone 将它们接成一个具有生产形态的系统：一个包含工具 + 资源 + 提示词 + 任务 + UI 的 MCP 服务器，边缘使用 OAuth 2.1，带 RBAC 的网关，多服务器客户端，一次 A2A 子智能体调用，将 OTel trace 发往 collector，CI 中的工具投毒检测，以及 AGENTS.md + SKILL.md bundle。完成后，你应当能够为每一项架构选择辩护。

**类型：** 构建
**语言：** Python（标准库，端到端生态 harness）
**前置课程：** Phase 13 · 01 至 21
**时间：** 约 120 分钟

## 学习目标

- 组合一个暴露工具、资源、提示词和带 `ui://` app 的任务的 MCP 服务器。
- 在服务器前放置一个执行 RBAC 和固定哈希的 OAuth 2.1 网关。
- 编写一个端到端使用 OTel GenAI 属性进行追踪的多服务器客户端。
- 将部分工作委托给 A2A 子智能体，并验证不透明性得到保持。
- 使用 AGENTS.md + SKILL.md 打包整个栈，使其他智能体可以驱动它。

## 问题

交付“研究与报告”系统：

- 用户提问：“总结 2026 年 arXiv 上关于智能体协议、被引用次数最多的三篇论文。”
- 系统：通过 MCP 搜索 arXiv；通过 A2A 将论文总结委托给专门的写作智能体；聚合结果；将交互式报告渲染为 MCP Apps `ui://` 资源；把每一步记录到 OTel。

Phase 13 的全部原语都会出现。这不是玩具——Anthropic（Claude Research 产品）、OpenAI（带 Apps SDK 的 GPTs）和第三方在 2026 年发布的生产级研究助手系统，都具有这种形状。

## 概念

### 架构

```text
[用户] -> [客户端] -> [网关（OAuth 2.1 + RBAC）] -> [research MCP server]
                                                        |
                                                        +- MCP tool: arxiv_search (pure)
                                                        +- MCP resource: notes://recent
                                                        +- MCP prompt: /research_topic
                                                        +- MCP task: generate_report (long)
                                                        +- MCP Apps UI: ui://report/current
                                                        +- A2A call: writer-agent (tasks/send)
                                                        |
                                                        +- OTel GenAI spans
```

### Trace 层级

```text
agent.invoke_agent
 ├── llm.chat (启动)
 ├── mcp.call -> tools/call arxiv_search
 ├── mcp.call -> resources/read notes://recent
 ├── mcp.call -> prompts/get research_topic
 ├── a2a.tasks/send -> writer-agent
 │    └── task transitions (不透明的内部状态)
 ├── mcp.call -> tools/call generate_report (任务增强)
 │    └── tasks/status 轮询
 │    └── tasks/result (completed，返回 ui:// 资源)
 └── llm.chat (最终综合)
```

一条 trace id。每个 span 都有正确的 `gen_ai.*` 属性。

### 安全姿态

- OAuth 2.1 + PKCE，配合资源指示器，将受众固定到网关。
- 网关持有上游凭据；用户永远看不到它们。
- RBAC：`alice` 拥有 `research:read`、`research:write`，可以调用所有工具。`bob` 拥有 `research:read`，不能调用 `generate_report`。
- 固定描述清单：工具哈希发生变化的服务器会被丢弃。
- Rule of Two 审计：没有工具同时组合不可信输入、敏感数据和后果性操作。

### 渲染

最终的 `generate_report` 任务返回内容块以及一个 `ui://report/current` 资源。客户端主机（Claude Desktop 等）在沙箱 iframe 中渲染交互式仪表盘。仪表盘包含排序后的论文列表、引用数，以及一个按钮；用户点击任意论文后，按钮调用 `host.callTool('summarize_paper', {arxiv_id})`。

### 打包

整个系统交付为：

```text
research-system/
  AGENTS.md                     # 项目约定
  skills/
    run-research/
      SKILL.md                  # 顶层工作流
  servers/
    research-mcp/               # MCP 服务器
      pyproject.toml
      src/
  agents/
    writer/                     # A2A 智能体
  gateway/
    config.yaml                 # RBAC + 固定清单
```

用户使用 `docker compose up` 部署。Claude Code、Cursor、Codex 和 opencode 用户都可以通过调用 `run-research` skill 驱动系统。

### Phase 13 每节课的贡献

| 课程 | Capstone 使用的内容 |
|--------|------------------------|
| 01–05 | 工具接口、供应商可移植性、并行调用、schema、linting |
| 06–10 | MCP 原语、服务器、客户端、传输、资源 + 提示词 |
| 11–14 | 采样、roots + elicitation、异步任务、`ui://` apps |
| 15–17 | 工具投毒、OAuth 2.1、网关 + 注册表 |
| 18 | A2A 子智能体委托 |
| 19 | OTel GenAI 追踪 |
| 20 | LLM 层的路由网关 |
| 21 | SKILL.md + AGENTS.md 打包 |

```figure
t3-capstone-chain
```

## 动手使用

`code/main.py` 将前面课程的模式缝合成一个可运行的演示。全部使用标准库，全部在进程内运行，因此可以从头读到尾。它会为研究与报告场景运行完整流程：与网关握手、模拟 OAuth 2.1、合并 `tools/list`、将 `generate_report` 作为任务运行、调用 A2A 写作智能体、返回 `ui://` 资源、发出 OTel spans。

注意观察：

- 每一跳都使用同一个 trace id。
- 网关阻止第二个用户写入。
- 任务生命周期从 working → completed，并同时返回文本和 ui:// 内容。
- A2A 调用的内部状态对编排器不透明。
- AGENTS.md 和 SKILL.md 是另一个智能体复现该工作流所需的全部文件。

## 交付物

本课产出 `outputs/skill-ecosystem-blueprint.md`。给定一个产品需求（研究、摘要、自动化），该 skill 会生成完整架构：使用哪些 MCP 原语、哪些网关控制、哪些 A2A 调用、哪些 telemetry 以及如何打包。

## 练习

1. 运行 `code/main.py`。注意单个 trace id 以及 spans 如何嵌套。数一数演示触及了 Phase 13 的多少种原语。

2. 扩展演示：增加第二个后端 MCP 服务器（例如 `bibliography`），确认网关将它的工具合并到相同的命名空间中。

3. 将假的 A2A 写作智能体替换为运行在子进程中的真实智能体。使用第 19 课的 harness。

4. 在编排器与 LLM 之间的路由网关中增加 PII 脱敏步骤。确认用户查询中的电子邮件会被清除。

5. 为将维护该系统的队友编写一份 AGENTS.md。它应当在五分钟内读完，并提供在 Cursor 或 Codex 中驱动 capstone 所需的一切信息。

## 术语

| 术语 | 人们会怎么说 | 它实际表示什么 |
|------|----------------|------------------------|
| Capstone | “Phase 13 集成演示” | 使用每种原语的端到端系统 |
| Research and report | “那个场景” | 搜索、总结、渲染模式 |
| Ecosystem | “所有组件放在一起” | 服务器 + 客户端 + 网关 + 子智能体 + telemetry + package |
| Trace hierarchy | “单个 trace id” | 每一跳的 span 共享 trace；通过 span id 建立父子关系 |
| Gateway-issued token | “传递式认证” | 客户端只看到网关令牌；上游凭据由网关持有 |
| Merged namespace | “所有工具放在一个平面列表” | 网关合并多服务器工具，冲突时加前缀 |
| Opacity boundary | “A2A 调用隐藏内部” | 子智能体的推理对编排器不可见 |
| Three-layer stack | “AGENTS.md + SKILL.md + MCP” | 项目上下文 + 工作流 + 工具 |
| Defense-in-depth | “多层安全” | 固定哈希、OAuth、RBAC、Rule of Two、审计日志 |
| Spec compliance matrix | “规范要求我们交付什么” | 将交付物映射到 2025-11-25 要求的检查表 |

## 延伸阅读

- [MCP — Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)——整合后的参考规范
- [MCP blog — 2026 roadmap](https://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/)——协议未来方向
- [a2a-protocol.org](https://a2a-protocol.org/latest/)——A2A v1.0 参考
- [OpenTelemetry — GenAI semconv](https://opentelemetry.io/docs/specs/semconv/gen-ai/)——权威追踪约定
- [Anthropic — Claude Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview)——生产智能体运行时模式
