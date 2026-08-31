---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/11-llm-engineering/17-agent-framework-tradeoffs/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 4c0c6119addcb3cf05f3a9e1884ae3bf75e4428a6196c90982653559c94c83b7
status: reviewed
---

# 智能体框架取舍——图、角色与 actor 编排

> 每个框架都在兜售同一个 demo（研究智能体写出一份报告），也都隐藏着同一个 bug（状态 schema 与编排层互相冲突）。应当选择抽象方式与问题形状匹配的框架；否则，剩下的都是你要重复编写两遍的胶水代码。

**类型：** 学习
**语言：** Python
**前置要求：** 第 11 阶段 · 第 09 课（函数调用）、第 11 阶段 · 第 16 课（LangGraph）
**用时：** 约 45 分钟

## 问题所在

你有一项任务，需要不止一次 LLM 调用。可能是研究工作流（规划、搜索、摘要、引用），也可能是代码审查流水线（解析 diff、批评、打补丁、验证），还可能是一个多轮助手：订机票、写邮件、提交报销。于是你选择了一个框架。

三天后，框架的抽象开始漏水。CrewAI 给你角色，但当“研究员”需要把结构化计划交给“作者”时，它就开始与你作对。AutoGen 给你智能体之间的聊天，却没有一等状态，所以你的检查点只是聊天日志的 pickle。LangGraph 给你状态图，却要求你在还不知道智能体会做什么之前命名每一次转换。Agno 给你单智能体抽象，而当你试图扇出到三个并发 worker 时，它会发出尖叫。

解决办法是让框架的核心抽象匹配问题的形状。本课按问题形状比较这些框架。

## 核心概念

![智能体框架矩阵：核心抽象与问题形状](../assets/framework-matrix.svg)

2026 年有四个框架占据主流。它们的核心抽象并不相同。

| 框架 | 核心抽象 | 最适合 | 最不适合 |
|-----------|------------------|----------|-----------|
| **LangGraph** | `StateGraph`——类型化状态、节点、条件边、检查点器。 | 状态明确且需要人在回路中断的工作流；需要时间旅行调试的生产智能体。 | 拓扑未知、松散而由角色驱动的头脑风暴。 |
| **CrewAI** | `Crew`——角色（目标、背景故事）、任务、流程（顺序或层级）。 | 有短线性/层级计划的角色扮演或 persona 驱动工作流。 | 超出 crew 轮次历史的有状态任务；复杂分支。 |
| **AutoGen** | `ConversableAgent` 对——两个或更多智能体轮流对话，直到满足退出条件。 | 多智能体 *对话*（师生、提案者—批评者、执行者—审阅者），思考从聊天中涌现。 | 拓扑已知的确定性工作流；需要跨重启持久状态的任务。 |
| **Agno** | `Agent`——单个 LLM + 工具 + 记忆，可组合成团队。 | 快速构建单智能体和轻量团队；强大的多模态能力与内置存储驱动。 | 带自定义归约器、深度显式分支的图。 |

### “抽象”到底意味着什么 <!-- learning-atlas: what-abstraction-actually-means -->

框架的核心抽象，就是你在白板上介绍架构时会画的东西。

- **LangGraph** → 你画一张图。节点是步骤，边是转换，每个位置上的状态对象都有类型。心智模型是状态机。
- **CrewAI** → 你画一张组织结构图。每个角色有工作说明，经理负责路由任务。心智模型是一支小型专家团队。
- **AutoGen** → 你画一个 Slack 私信窗口。两个智能体互相发消息；需要调解人时再加入第三个。心智模型是聊天。
- **Agno** → 你画一个挂着工具的单一方框。把方框并排放置就是团队。心智模型是“开箱即用的智能体”。

### 状态问题

在生产环境中，大多数框架选择都在状态这一点上失效。

- **LangGraph。** 类型化状态（`TypedDict` 或 Pydantic 模型）、逐字段归约器、一等检查点器（SQLite/Postgres/Redis）。恢复、中断和时间旅行都开箱即用。（参见第 11 阶段 · 第 16 课。）
- **CrewAI。** 状态通过 `context` 字段以字符串在任务之间流动，或者通过 `output_pydantic` 结构化传递。默认没有每个 crew 的持久存储；如果 crew 必须经受重启，你得自己接入。
- **AutoGen。** 状态就是聊天历史和用户自定义的 `context`。对话记录可以持久化；任意工作流状态除非你编写适配器，否则不会持久化。
- **Agno。** 内置存储驱动（SQLite、Postgres、Mongo、Redis、DynamoDB），通过 `storage=` 挂到 `Agent` 上——对话会话和用户记忆会自动持久化。它提供会话存储，不提供完整的图检查点器。

### 分支问题

每个不简单的智能体都会分支。谁来决定分支很重要。

- **LangGraph**——由你通过条件边决定。路由是带命名分支的 Python 函数。分支是一等公民，写入已编译图；检查点器会记录走过哪条分支。
- **CrewAI**——层级模式下由经理决定；顺序模式下由你在构建时决定。路由隐含在任务列表中；除了经理的提示词之外，没有一等的“if”。
- **AutoGen**——由智能体通过聊天决定。分支从下一个发言者中涌现；`GroupChatManager` 选择下一个发言者。你可以手写 `speaker_selection_method`，但默认是 LLM 驱动的。
- **Agno**——由智能体决定下一步调用哪个工具。团队有 coordinator/router/collaborator 模式；除此之外的分支由开发者负责。

### 可观测性问题

- **LangGraph**——通过 LangSmith 或任意 OTel exporter 使用 OpenTelemetry。每次节点转换都是一个 trace span；检查点还可以充当可重放的 trace。LangSmith 是一方方案；Langfuse/Phoenix 也有适配器。
- **CrewAI**——自 2025 年末起原生支持 OpenTelemetry；集成 Langfuse、Phoenix、Opik、AgentOps。
- **AutoGen**——通过 `autogen-core` 集成 OpenTelemetry；AgentOps 和 Opik 有连接器。追踪粒度是每条智能体消息，而不是每个节点。
- **Agno**——内置 `monitoring=True` 标志以及 OpenTelemetry exporter；与 Langfuse 的会话追踪深度集成。

### 成本与延迟

四个框架都会增加每次调用的额外开销（框架逻辑、验证、序列化）。按开销从低到高大致是：Agno ≈ LangGraph < CrewAI ≈ AutoGen。差异主要取决于框架额外进行多少 LLM 路由。CrewAI 的层级经理会花词元决定下一步由谁执行；AutoGen 的 `GroupChatManager` 也一样。LangGraph 只会在你写下 `llm.invoke` 的地方消耗词元。Agno 的单智能体路径很薄。

如果每次运行的成本很重要，优先使用显式路由（LangGraph 边、AutoGen `speaker_selection_method`），而不是由 LLM 选择路由。

### 互操作性

- **LangGraph** ↔ **LangChain** 工具、检索器、LLM。一等 MCP adapter（把 MCP server 作为工具导入）。
- **CrewAI** ↔ 工具继承 `BaseTool`；LangChain 工具、LlamaIndex 工具和 MCP 工具都可以适配进来。通过 `allow_delegation=True` 支持 crew-to-crew 委派。
- **AutoGen** → `FunctionTool` 封装任意 Python 可调用对象；可用 MCP adapter。对于智能体间模式，与 AG2 生态紧密耦合。
- **Agno** → 使用 `@tool` 装饰器或 BaseTool 子类；提供 MCP adapter；工具可以在智能体与团队之间共享。

## 方法论

> 你应该能用一句话解释：为什么某个框架适合某个智能体问题。

构建前检查清单：

1. **画出形状。** 这是图（类型化状态、命名转换）吗？角色扮演（专家交接工作）吗？聊天（智能体一直对话直到完成）吗？还是带工具的单智能体？
2. **决定谁来分支。** 开发者决定分支 → LangGraph；经理智能体决定 → CrewAI 层级模式；聊天中涌现 → AutoGen；工具调用决定 → Agno。
3. **检查状态预算。** 你是否需要从检查点恢复、时间旅行或在运行中途插入人工中断？如果需要，LangGraph 是默认选择；Agno session 覆盖以对话为范围的状态。
4. **检查成本预算。** LLM 选择路由会为每轮增加词元成本。如果智能体每天运行数千次，优先使用显式路由。
5. **为框架开销留预算。** 每个框架都是另一个依赖。如果任务只是两次 LLM 调用和一个工具，就写 30 行普通 Python；没有框架比不使用框架更便宜。

在你还不能画出图、组织结构图、聊天窗口或智能体方框之前，拒绝使用框架。在框架的状态模型与你真正需要的东西冲突时，拒绝选择它。

## 决策矩阵

| 问题形状 | 首选框架 | 原因 |
|---------------|---------------------|-----|
| 带类型化状态、人工审批、长时间运行的工作流 DAG | LangGraph | 一等状态、检查点器、中断和时间旅行。 |
| 具有明确角色的研究/写作流水线 | CrewAI（顺序）或 LangGraph 子图 | CrewAI 能低成本表达按角色分工；分支变复杂后再用 LangGraph 扩展。 |
| 提案者—批评者或师生对话 | AutoGen | 双智能体聊天是它原生的形状。 |
| 带工具、会话和记忆的单智能体 | Agno | 最薄的配置，内置存储与记忆。 |
| 带归约器的数千路并行扇出 | LangGraph + `Send` | 唯一拥有一等并行调度 API 的框架。 |
| 快速原型、不承诺使用框架 | 普通 Python + 提供方 SDK | 不使用框架就是最快的框架。 |

```figure
l5-framework-fit
```

## 练习

1. **简单。** 对同一个任务——“研究 Anthropic 总部，写一份 200 字简报并引用来源”——分别用 LangGraph（四个节点：plan、search、write、cite）和 CrewAI（三个角色：researcher、writer、editor）实现。报告每次运行的词元成本和代码行数。
2. **中等。** 用 AutoGen（researcher ↔ writer 聊天，editor 通过 `GroupChat` 加入）和 Agno（带 `search_tools`、`write_tools` 以及 session store 的单智能体）实现同一个任务。按以下维度给四种实现排序：(a) 每次运行成本；(b) 崩溃后恢复能力；(c) 在写作步骤前插入人工审批的能力。
3. **困难。** 构建一个决策树脚本 `pick_framework.py`，接收简短的问题描述（JSON：`{has_typed_state, has_roles, has_dialogue, has_parallel_fanout, needs_resume}`），返回一个推荐以及一句话理由。用你自己设计的六个案例验证它。

## 关键术语

| 术语 | 人们口中的说法 | 它实际指什么 |
|------|-----------------|-----------------------|
| Orchestration | “智能体如何协调” | 决定下一个运行节点/角色/智能体的那一层。 |
| Durable state | “重启后恢复” | 能够在进程死亡后存活的状态，附着在检查点或 session store 上。 |
| LLM-selected routing | “让模型决定” | 每轮由 planner LLM 选择下一步；灵活，但每次决策都要付词元成本。 |
| Explicit routing | “开发者决定” | 由 Python 函数或静态边选择下一步；便宜且可审计。 |
| Crew | “CrewAI 团队” | 绑定成一个可运行单元的角色 + 任务 + 流程（顺序或层级）。 |
| GroupChat | “AutoGen 的多智能体聊天” | 由发言者选择器管理的 N 个智能体之间的对话。 |
| Team（Agno） | “多智能体 Agno” | 在一组智能体上运行 route / coordinate / collaborate 模式。 |
| StateGraph | “LangGraph 的图” | 类型化状态、节点、条件边和检查点器组成的抽象。 |

## 延伸阅读

- [LangGraph 文档](https://langchain-ai.github.io/langgraph/) — StateGraph、检查点器、中断和时间旅行。
- [CrewAI 文档](https://docs.crewai.com/) — Crew、Flow、Agent、Task、Process。
- [AutoGen 文档](https://microsoft.github.io/autogen/) — ConversableAgent、GroupChat、团队和工具。
- [Agno 文档](https://docs.agno.com/) — Agent、Team、Workflow、存储和记忆。
- [Anthropic：Building effective agents（2024 年 12 月）](https://www.anthropic.com/research/building-effective-agents) — 与框架无关的模式库（提示链、路由、并行化、orchestrator-workers、evaluator-optimizer）。
- [Yao 等：《ReAct: Synergizing Reasoning and Acting》（ICLR 2023）](https://arxiv.org/abs/2210.03629) — 每个框架都会重新包装的循环。
- [Wu 等：《AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation》（2023）](https://arxiv.org/abs/2308.08155) — AutoGen 的设计论文。
- [Park 等：《Generative Agents: Interactive Simulacra of Human Behavior》（UIST 2023）](https://arxiv.org/abs/2304.03442) — CrewAI 式 persona 栈建立其上的角色扮演基础。
- 第 11 阶段 · 第 16 课（LangGraph）— 本课用于对比的框架。
- 第 11 阶段 · 第 19 课（Reflexion）— 能自然映射到 LangGraph、但在 CrewAI 中较别扭的模式。
- 第 11 阶段 · 第 22 课（生产可观测性）— 如何为你选择的框架做仪表化。
