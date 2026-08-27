---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/16-multi-agent-and-swarms/11-handoffs-and-routines/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 87bf3b0e0988f7b46dfb666e546210d339b7cd640e840cb49152a19e1521674b
status: reviewed
---

# 交接与例程——无状态编排

> OpenAI 的 Swarm（2024 年 10 月）将多智能体编排提炼为两种原语：**例程（routines）**（作为系统提示词的指令 + 工具）和**交接（handoffs）**（返回另一个 Agent 的工具）。没有状态机，也没有分支 DSL——LLM 通过调用正确交接工具来路由。OpenAI Agents SDK（2025 年 3 月）是其生产级后继。Swarm 本身仍是最干净的概念参考——整个源代码只有数百行。该模式广泛传播，因为 API 表面大致是“agent = 提示词 + 工具；handoff = 返回 agent 的函数”。限制是无状态，因此记忆是调用者的问题。

**类型：** 学习 + 构建
**语言：** Python（标准库）
**前置要求：** 第 16 阶段 · 04（原语模型）
**用时：** 约 60 分钟

## 问题

每个多智能体框架都希望你学习它的 DSL：LangGraph 的节点和边、CrewAI 的团队和任务、AutoGen 的 GroupChat 和管理者。这些 DSL 是真实抽象，却让事情显得比必要的更重。

Swarm 反其道而行：使用模型已经拥有的工具调用能力。交接成为工具调用；编排器就是当前持有会话的任何智能体；状态机隐含在智能体的系统提示词里。

## 概念

### 两种原语

**例程。** 定义智能体角色和可用工具的系统提示词。可将它理解为一个限定范围的指令集：“你是分诊智能体；若用户询问退款，交接给退款智能体。”

**交接。** 智能体可调用的工具，返回一个新的 Agent 对象。Swarm 运行时检测到 Agent 返回值，并在下一轮切换活跃智能体。

这构成完整抽象。

```
def transfer_to_refunds():
    return refund_agent  # Swarm sees Agent return → switch active agent

triage_agent = Agent(
    name="triage",
    instructions="Route the user to the right specialist.",
    functions=[transfer_to_refunds, transfer_to_sales, transfer_to_support],
)
```

分诊智能体的系统提示词使它根据用户消息选择正确交接。LLM 的工具调用完成路由。

### 为什么它广泛传播

- **API 很小。** 只需学习两个概念。
- **利用模型已经会做的事。** 工具调用已经在各供应商中达到生产级。
- **没有状态机负担。** 不必描述图；智能体提示词描述了它们可交接给谁。

### 无状态的取舍

Swarm 明确在多次运行之间无状态。框架在一次运行中保留消息历史，但不持久化任何东西。记忆、连续性、长时间任务——全是调用者的问题。

在生产环境（OpenAI Agents SDK，2025 年 3 月）中，这正是主要变化之一：SDK 在保留交接原语的同时加入内置会话管理、护栏和跟踪。

### Swarm / 交接何时适合

- **分诊模式。** 前台智能体将用户路由给专家。
- **基于技能的交接。** “任务需要代码时调用编码者；需要研究时调用研究者。”
- **短且有界的会话。** 客服、FAQ 转工单、简单工作流。

### Swarm 何时吃力

- **带共享记忆的长会话。** 交接将会话状态重置为新智能体的提示词加历史。若无调用者管理的记忆，智能体间没有持久状态。
- **并行执行。** 交接一次只能进行一个——活跃智能体发生切换。并行需要调用者编排多个 Swarm 运行。
- **审计与回放。** 无状态运行难以精确回放；LLM 的交接选择不具确定性。

### OpenAI Agents SDK（2025 年 3 月）

生产级后继增加：

- **会话状态。** 跨运行的持久线程。
- **护栏。** 输入/输出验证钩子。
- **跟踪。** 记录每个工具调用和交接。
- **交接过滤器。** 控制交接时传输什么上下文。

交接原语得以保留；周围增加了生产可用性。

### Swarm 与 GroupChat

两者都使用 LLM 驱动路由，却在**谁选下一个**上不同：

- GroupChat：外部的选择器（函数或 LLM）从外部选出下一个发言者。
- Swarm：当前智能体通过调用交接工具选择其继任者。

Swarm 是“智能体决定下一步”；GroupChat 是“管理者决定下一步”。Swarm 的决策在活跃智能体的工具调用中；GroupChat 的决策在 `GroupChatManager` 中。

```figure
sw-handoff-routing
```

## 动手构建

`code/main.py` 从零实现 Swarm：一个 Agent 数据类、一项交接机制（工具返回 Agent）和一个检测智能体切换的运行循环。

演示：分诊智能体路由至退款、销售或支持专家。每名专家有自己的工具。运行循环打印每次交接。

运行：

```
python3 code/main.py
```

## 实际使用

`outputs/skill-handoff-designer.md` 为给定任务设计交接拓扑：有哪些智能体、它们可调用哪些交接、传输什么上下文。

## 交付物

检查表：

- **交接日志。** 每次交接写入含源智能体、目标智能体、上下文快照的跟踪事件。
- **上下文传输规则。** 决定交接时移动什么：完整历史（昂贵）、最后 N 条消息，或摘要。
- **交接护栏。** 交接给具有不同工具权限的专家必须经过认证——否则提示注入可能强制不希望的交接。
- **循环检测。** 两个智能体来回交接是常见失败；用简单的最后 K 次环形检查检测。
- **回退智能体。** 若交接目标不存在，回退到安全默认值。

## 练习

1. 运行 `code/main.py`，分诊至退款智能体。确认第二轮的活跃智能体是退款智能体。
2. 添加循环检测规则：若同两个智能体连续交接 3 次，则强制退出。设计回退方案。
3. 阅读 OpenAI Agents SDK 关于 handoff filters 的文档。实现“交接时摘要”版本：外发智能体将上下文压缩为要点摘要，然后由入站智能体接手。
4. 比较 Swarm 交接与 GroupChatManager 选择器。哪一种模式更容易遭受提示注入？为什么？
5. 阅读 Swarm cookbook（https://developers.openai.com/cookbook/examples/orchestrating_agents）。找出 Swarm 做出的一项明确设计决策，以及 OpenAI Agents SDK 改变或保留的方式。

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| 例程 | “智能体提示词” | 系统提示词 + 工具列表；定义角色和可用交接。 |
| 交接 | “转交给另一个智能体” | 活跃智能体可调用、返回新 Agent 的工具；运行时切换活跃智能体。 |
| 无状态 | “运行之间没有记忆” | Swarm 不持久化任何内容；记忆由调用者负责。 |
| 活跃智能体 | “现在谁在说话” | 当前持有会话的智能体；交接会改变它。 |
| 上下文传输 | “交接时移动什么” | 入站智能体所见历史的策略：完整、最后 N 条或摘要。 |
| 交接循环 | “智能体乒乓” | 两个智能体持续来回交接的失效模式。 |
| OpenAI Agents SDK | “生产 Swarm” | 2025 年 3 月的后继；在交接原语上增加会话、护栏、跟踪。 |
| 交接过滤器 | “传输的闸门” | SDK 用于在交接边界检查和修改上下文的功能。 |

## 延伸阅读

- [OpenAI cookbook — Orchestrating Agents: Routines and Handoffs](https://developers.openai.com/cookbook/examples/orchestrating_agents) — 参考表述
- [OpenAI Swarm repo](https://github.com/openai/swarm) — 原始实现，保留作概念参考
- [OpenAI Agents SDK docs](https://openai.github.io/openai-agents-python/) — 带会话和跟踪的生产后继
- [Anthropic handoff-in-Claude notes](https://docs.anthropic.com/en/docs/claude-code) — Claude Code 子智能体如何通过 `Task` 使用类似交接的模式
