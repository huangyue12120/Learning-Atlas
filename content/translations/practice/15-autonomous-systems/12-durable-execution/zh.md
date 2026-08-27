---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/15-autonomous-systems/12-durable-execution/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: adc5aa6f20ee09b6920ab01aec2e062234e9e6620ca58f4e43fc59f073c15bba
status: reviewed
---

# 长时间后台智能体：持久执行

> 生产级长时程智能体不会在 `while True` 中运行。每次 LLM 调用都会成为带检查点、重试和回放的活动。Temporal 与 OpenAI Agents SDK 的集成于 2026 年 3 月正式可用。Claude Code Routines（Anthropic）在没有持久本地进程的情况下运行计划的 Claude Code 调用。会话会在需要人类输入时暂停、穿越部署存活，并从由 `thread_id` 键控的最新检查点恢复。在新的易用性背后，是一个旧模式——工作流编排——加上一个新输入：LLM 调用是非确定性活动，必须在恢复时被确定性地回放。

**类型：** 学习
**语言：** Python（标准库，最小持久执行状态机）
**前置要求：** 第 15 阶段 · 10（权限模式）、第 15 阶段 · 01（长时程智能体）
**用时：** 约 60 分钟

## 问题所在

设想一个运行四小时的智能体。它调用三个工具、向用户询问两次，并发出四十次 LLM 调用。运行到一半时，宿主机重启，会发生什么？

- 在朴素的 `while True` 循环中：一切都会丢失。运行从头开始。三个工具调用（带有真实副作用）再次执行。用户被再次询问他们已经批准的事情。四十次 LLM 调用再次计费。
- 使用持久执行：运行从最近检查点恢复。已完成活动不会重新执行，其结果会从持久日志回放。用户不必再次批准已批准的事情。已经完成的 LLM 调用不会再次计费。

这套模式已由工作流引擎交付十年（Temporal、Cadence、Uber 的 Cherami）。新颖之处在于，LLM 调用现在也是一种活动，具有非确定性、成本高且可能带副作用等特征，恰好适配这个模式。

本课的运行主题是：长时程可靠性会衰减（METR 观察到“35 分钟退化”——成功率随时程大致二次下降）。持久执行允许运行时间超过可靠性画像所支持的范围；设计正确时，这是一种新的安全失败方式，设计错误时也是一种新的不安全失败方式。

## 核心概念

### 活动、工作流和回放

- **工作流：** 确定性的编排代码，定义活动序列、分支和等待。它必须是确定的，才能从事件日志回放时不出现意外分歧。
- **活动：** 一个非确定性、可能失败的工作单元。LLM 调用、工具调用、文件写入、HTTP 请求。每项活动记录其输入和（完成后）输出。
- **事件日志：** 持久后备存储。每次活动开始、完成、失败、重试以及每个工作流决策都被记录。
- **回放：** 恢复时，工作流代码从头重新运行；每项已完成活动返回日志中的结果而不再次执行。仅未完成活动会实际运行。

这与 React 针对虚拟 DOM 重渲染，或 Git 从提交重建工作树的形状相同。编排器的确定性让持久性变得低成本。

### 为什么 LLM 调用适合这个模式

LLM 调用具有以下属性：

- 非确定性（temperature > 0；即使 temperature 为 0 也会随模型版本漂移）。
- 昂贵（金钱和延迟）。
- 可能失败（速率限制、超时）。
- 有副作用（若它们调用工具）。

这正是活动的画像。将每个 LLM 调用封装为活动，就获得带指数退避的重试、跨重启的检查点，以及可回放的调试轨迹。

### 由 `thread_id` 键控的检查点

LangGraph、Microsoft Agent Framework、Cloudflare Durable Objects 与 Claude Code Routines 都收敛为同一 API 形状：`thread_id`（或等价物）标识会话；每次状态转移都持久化到后端（PostgreSQL 为默认，SQLite 用于开发，Redis 用于缓存）；恢复时读取最新检查点。

后端选择很重要：

- **PostgreSQL：** 持久、可查询、可穿越部署存活。LangGraph 的默认选项。
- **SQLite：** 只适用于本地开发；跨宿主机会丢失数据。
- **Redis：** 快，但除非配置 AOF/快照，否则易失。
- **Cloudflare Durable Objects：** 透明分布式；按唯一键划分范围；可存活数小时至数周。

### 将人类输入视为一等状态

先提议后提交（第 15 课）需要一个可持久化的“等待人类”状态。工作流暂停，外部队列持有待处理请求，一次批准会从准确的那一点恢复。没有持久性，这只是尽力而为；有了持久性，隔夜到达的批准可使工作流在早晨继续。

### 35 分钟退化

METR 观察到，所有测量的智能体类别在约 35 分钟连续运行后都会出现可靠性衰减。任务时长翻倍，失败率大约变为四倍。持久执行并不能修复它；它只是让你能运行得超过可靠性画像支持的时长。安全模式是将持久性与在重新进入时要求新鲜 HITL 的检查点结合，并使用预算紧急停止开关（第 13 课）来限制总计算量，而不论墙钟时间。

### 何时持久执行是错误答案

- 没有人工输入、短于几分钟的运行。开销大于收益。
- 严格只读的信息检索。
- 正确性要求端到端发生在一个上下文窗口中的任务（一些推理任务；一些一次性生成）。

```figure
memory-consolidation
```

## 实际运行

`code/main.py` 使用标准库实现最小持久执行引擎。它支持：

- 将输入输出记录到 JSON 事件日志的 `@activity` 装饰器。
- 对活动进行排序的工作流函数。
- 一个 `run_or_replay(workflow, event_log)` 函数，可回放已完成活动而不重新执行。

驱动程序模拟一个三活动工作流，中途崩溃，并展示：(a) 朴素重试会重新执行所有内容，(b) 回放只会运行缺失活动。

## 交付物

`outputs/skill-durable-execution-review.md` 审阅一个拟议的长时间智能体部署是否具有正确的持久执行形状：活动、确定性、检查点后端、人类输入状态与恢复时的 HITL 策略。

## 练习

1. 运行 `code/main.py`。观察朴素重试与回放之间的活动执行次数差异。改变崩溃点，并展示回放次数会相应变化。

2. 将玩具引擎改为显式使用 `thread_id`。模拟共享该引擎的两个并发会话，并确认它们的事件日志不会碰撞。

3. 在玩具引擎中选一个活动。在工作流决策中引入非确定性（墙钟时间戳）。展示回放时的分歧。解释真实引擎如何处理（副作用注册、`Workflow.now()` API）。

4. 阅读 LangChain “Runtime behind production deep agents”文章。列出运行时持久化的每一种状态，并说明每种覆盖什么失效模式。

5. 为一个 6 小时自治编程任务设计检查点策略。在哪里检查点？崩溃恢复是什么样子？哪些动作需要新鲜 HITL？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|---|---|---|
| 工作流 | “智能体脚本” | 确定性的编排代码；可从事件日志回放 |
| 活动 | “一步” | 非确定性单元（LLM 调用、工具调用）；前后均记录 |
| 事件日志 | “后备存储” | 每个状态转移的持久记录 |
| 回放 | “恢复” | 重运行工作流；已完成活动返回日志结果而不重执行 |
| 检查点 | “保存点” | 由 thread_id 键控的持久状态；恢复时使用最新状态 |
| thread_id | “会话键” | 为持久状态划分范围的标识符 |
| 35 分钟退化 | “可靠性衰减” | METR：成功率随时程大约二次下降 |
| 非确定性 | “回放中的漂移” | 墙钟、随机数、LLM 输出；必须注册为副作用 |

## 延伸阅读

- [Anthropic——Claude Code Agent SDK：智能体循环](https://code.claude.com/docs/en/agent-sdk/agent-loop)——预算、轮次与恢复语义。
- [Microsoft——Agent Framework：人在回路与检查点](https://learn.microsoft.com/en-us/agent-framework/workflows/human-in-the-loop)——RequestInfoEvent 形状。
- [LangChain——生产级深度智能体背后的运行时](https://www.langchain.com/conceptual-guides/runtime-behind-production-deep-agents)——具体运行时要求。
- [OpenAI Agents SDK + Temporal 集成（Trigger.dev 公告）](https://trigger.dev)——LLM 调用的活动形状。
- [Anthropic——在实践中衡量智能体自主性](https://www.anthropic.com/research/measuring-agent-autonomy)——35 分钟退化的来源。
