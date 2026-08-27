---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/16-multi-agent-and-swarms/04-primitive-model/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 3b17765b0944dce19879fea690146703bead63f48a52d2d7d4c5667ac84b166f
status: reviewed
---

# 多智能体原语模型

> 只需四种原语——智能体、交接、共享状态、编排器——便能覆盖一个四维设计空间；2026 年发布的主要多智能体框架（AutoGen、LangGraph、CrewAI、OpenAI Agents SDK、Microsoft Agent Framework）都是其中的点。本课从零构建它们，让玩具系统以四种原语运行，并将每个主要框架映射到同一组坐标轴，因此你能用一段话读懂任何新版本。

**类型：** 学习
**语言：** Python（标准库）
**前置要求：** 第 14 阶段（智能体工程），第 16 阶段 · 01（为什么要多智能体）
**用时：** 约 60 分钟

## 问题

每六个月就会有新的多智能体框架发布：AutoGen 在 2023 年，CrewAI 在 2024 年，LangGraph 和 OpenAI Swarm 在 2024 年，Google ADK 在 2025 年 4 月，Microsoft Agent Framework RC 在 2026 年 2 月。每份新闻稿都声称自己是“正确的抽象”。

如果逐一学习，你会筋疲力尽。API 看起来不同，文档对“智能体”是什么也意见不一。一个框架将共享内存称为“blackboard”，另一个称它为“message pool”，第三个称它为“StateGraph”。你开始怀疑这个领域只是在反复造轮子。

四种原语在这些框架中保持稳定，营销包装掩盖了这一点。掌握它们后，你可以用一段话理解每个框架。

## 概念

### 四种原语

1. **智能体（Agent）**——系统提示词加工具列表。无状态；每次运行都从系统提示词和当前消息历史开始。
2. **交接（Handoff）**——将控制权从一个智能体结构化地转给另一个。机制上，它可以是返回新智能体的工具调用，或沿条件前进的图边。
3. **共享状态（Shared state）**——可由多个智能体读取（有时也可写入）的任意数据结构。消息池、黑板、键值存储、向量记忆。
4. **编排器（Orchestrator）**——决定下一个发言者的人。可选显式图（确定性）、LLM 发言者选择器（软）、上一位发言者的交接调用（OpenAI Swarm），或队列上的调度器（群体架构）。

四个原语构成完整设计空间。每个框架都为每条轴选择默认值，其余只是表面语法。

### 每个 2026 框架如何映射到它

| 框架 | 智能体 | 交接 | 共享状态 | 编排器 |
|---|---|---|---|---|
| OpenAI Swarm / Agents SDK | `Agent(instructions, tools)` | 工具返回 Agent | 调用者的问题 | LLM 的下一次交接调用 |
| AutoGen v0.4 / AG2 | `ConversableAgent` | GroupChat 上的发言者选择器 | 消息池 | 选择函数（LLM 或轮询） |
| CrewAI | `Agent(role, goal, backstory)` | `Process.Sequential / Hierarchical` | 串联的 Task 输出 | 管理者 LLM 或静态顺序 |
| LangGraph | 节点函数 | 图边 + 条件 | `StateGraph` reducer | 图，确定性 |
| Microsoft Agent Framework | 智能体 + 编排模式 | 模式特定 | 线程 / 上下文 | 模式特定 |
| Google ADK | 智能体 + A2A card | A2A task | A2A artifacts | 宿主决定 |

表面差异很大，底层却是同样的四个旋钮。

### 为什么这很重要

一旦看见原语，框架比较就成为简短清单：

- 编排器是信任 LLM 路由（Swarm），还是将路由固定在代码里（LangGraph）？
- 共享状态是完整历史（GroupChat），还是投影视图（StateGraph reducer）？
- 智能体能够修改彼此的提示词（CrewAI manager），还是只能交接（Swarm）？

这三个问题回答了 80% 的框架适配问题。你不再选购“最好的多智能体框架”，而是为真正关心的轴设计。

### 无状态洞见

除共享状态外，每一种原语都无状态。智能体是（提示词、工具）的函数；交接是函数调用；编排器是调度器。**系统中唯一有状态的东西是共享状态。** 所有有趣的错误都发生在这里：记忆投毒（第 15 课）、消息排序、版本控制、写入竞争。

隐藏共享状态的框架（Swarm）将问题推给调用者；集中共享状态的框架（LangGraph checkpoint、AutoGen pool）使其可检查，却把协调成本转移给共享状态实现。

### 单个原语的解剖

#### 智能体

```
Agent = (system_prompt, tools, model, optional_name)
```

没有记忆，没有状态。拥有相同系统提示词和工具的两个智能体可以互换。任何看似智能体内部的状态，实际都在共享状态或交接协议中。

#### 交接

```
Handoff = (from_agent, to_agent, reason, payload)
```

主流有三种实现：

- **函数返回**——工具返回下一个智能体，对应 OpenAI Swarm 模式。智能体在工具模式中携带路由。
- **图边**——LangGraph。边是声明式的；LLM 产出一个值，条件选择下一个节点。
- **发言者选择**——AutoGen GroupChat。选择函数（有时本身是一次 LLM 调用）读取消息池并决定谁接着发言。

#### 共享状态

```
SharedState = { messages: [], artifacts: {}, context: {} }
```

最低限度是一列消息，通常还有更多：结构化制品（CrewAI Task 输出）、类型化上下文（LangGraph reducers）、外部记忆（MCP、向量数据库）。

有两种拓扑：**完整池（full pool）**——每个智能体都看到每条消息；以及**投影（projected）**——智能体只看到按角色限定的视图。完整池简单但难扩展；投影可扩展，但需要提前设计模式。

#### 编排器

```
Orchestrator = ({state, last_speaker}) -> next_agent
```

有四种形式：

- **静态**——图在构建时固定（LangGraph 确定性、CrewAI Sequential）。
- **LLM 选择**——LLM 读取消息池并选择下一个发言者（AutoGen、CrewAI Hierarchical）。
- **交接驱动**——当前智能体通过调用交接工具作决定（Swarm）。
- **队列驱动**——工作者从共享队列拉取工作；没有显式的下一发言者（群体架构、Matrix）。

### 框架间会变化什么

一旦原语固定，余下的设计决策是：

- **记忆策略**——短暂状态与持久检查点（LangGraph checkpointer）。
- **安全边界**——谁能批准一次交接（人在回路）。
- **成本核算**——每个智能体的 token 预算。
- **可观测性**——追踪交接、持久化状态以供回放。

它们都可在原语之上实现，没有一个是新原语。

```figure
a5-primitive-radar
```

## 动手构建

`code/main.py` 用约 150 行标准库 Python 实现四种原语。没有真实 LLM——每个智能体都是脚本化策略，因此焦点保持在协调结构上。

该文件导出：

- `Agent`——包含名称、系统提示词、工具、策略函数的数据类。
- `Handoff`——返回新智能体的函数。
- `SharedState`——线程安全的消息池。
- `Orchestrator`——三种变体：`StaticOrchestrator`、`HandoffOrchestrator`、`LLMSelectorOrchestrator`（模拟）。

演示通过全部三种编排器类型运行同一个三智能体流水线（研究 → 写作 → 审阅），并在最后打印消息池。你会看到输出的唯一区别是*谁选择下一个*；智能体与共享状态在各次运行中完全相同。

运行它：

```
python3 code/main.py
```

预期输出：三次编排器运行，每种模式一次。每次都会打印最终消息池。若研究员提前决定工作完成，交接驱动的运行会到达较少智能体——这是 LLM 路由取舍的缩影。

## 实际使用

`outputs/skill-primitive-mapper.md` 是一项读取任意多智能体代码库或框架文档、返回四原语映射的技能。对新框架版本运行它，便可在深入阅读文档之前获得一段话的理解。

## 交付物

在采用新框架前，先写出它的原语映射。若做不到，要么文档不完整，要么框架发明了第五种原语（罕见——先检查是否只是你未见过的共享状态变体）。

将该映射固定在架构文档中。新成员加入团队时，先把映射发给他们，再发 API 文档。框架版本变化时，对映射做差异比较，而不是对更新日志做差异比较。

## 练习

1. 用不同的智能体策略运行 `code/main.py` 三次。观察编排器选择如何改变实际运行的智能体。
2. 实现第四种编排器：队列驱动，让智能体轮询共享状态获取工作。可能出现什么死锁？如何检测它？
3. 选取 LangGraph quickstart（https://docs.langchain.com/oss/python/langgraph/workflows-agents）并将其改写为四种原语。哪些 LangGraph 抽象是一一映射，哪些是便利包装？
4. 阅读 OpenAI Swarm cookbook（https://developers.openai.com/cookbook/examples/orchestrating_agents）。找出 Swarm 将哪一种原语做得最顺手，又把哪一种推给调用者。
5. 在上表中找一个完全隐藏共享状态的框架。说明当智能体需要跨交接协调、却无法重读历史时会出什么问题。

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| 智能体 | “带工具的 LLM” | 一个 `(system_prompt, tools, model)` 三元组；无状态。 |
| 交接 | “控制权转移” | 指明下一个智能体和可选载荷的结构化调用；有函数返回、图边、发言者选择三种实现。 |
| 共享状态 | “记忆” / “上下文” | 多智能体系统中唯一有状态的部分；消息池或黑板。 |
| 编排器 | “协调者” | 决定谁下一个运行的人：静态图、LLM 选择器、交接驱动或队列驱动。 |
| 原语 | “抽象” | 每个框架都会参数化的四个轴之一，不是框架功能。 |
| 消息池 | “共享聊天历史” | 全历史的共享状态；易于推理、难于扩展。 |
| 投影状态 | “限定视图” | 共享状态中按角色限制的视图；可扩展，但需要模式设计。 |
| 发言者选择 | “下一个谁说话” | 由函数（通常是 LLM）从群组中选择下一个智能体的编排模式。 |

## 延伸阅读

- [OpenAI cookbook: Orchestrating Agents — Routines and Handoffs](https://developers.openai.com/cookbook/examples/orchestrating_agents) — 对交接驱动编排最清晰的表述
- [AutoGen stable docs](https://microsoft.github.io/autogen/stable/) — GroupChat + 发言者选择是 LLM 选择编排的参考实现
- [LangGraph workflows and agents](https://docs.langchain.com/oss/python/langgraph/workflows-agents) — 图边编排与基于 reducer 的共享状态
- [CrewAI introduction](https://docs.crewai.com/en/introduction) — 角色—目标—背景智能体，以及 Sequential / Hierarchical 流程
- [AG2 (community AutoGen continuation)](https://github.com/ag2ai/ag2) — Microsoft 将 v0.4 转入维护后仍在演进的 AutoGen v0.2 支线
