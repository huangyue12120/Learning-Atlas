---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/16-multi-agent-and-swarms/22-production-scaling-queues-checkpoints/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: f35e11480b186e03dd8652f0775a8f23e890d03863539e654b00ddc9a9d21d09
status: reviewed
---

# 生产扩展：队列、检查点与持久性

> 将多智能体系统扩展到数千个并发运行，需要**持久化执行**：工作队列加检查点。只要具备租约处理、幂等副作用和确定性重放，任何工作器都能在任意崩溃后恢复任意运行。LangGraph 的运行时就是参考示例：它以 `thread_id` 为键，在每个超级步骤后写入检查点（默认使用 Postgres）；工作器崩溃会释放租约，另一工作器随即恢复。智能体可以无限期等待人工输入。**MegaAgent**（arXiv:2408.09955）为每个智能体运行三状态（Idle / Processing / Response）的生产者—消费者队列，并采用两层协调（组内聊天 + 组间管理员聊天）。对于 LLM 流式传输，fiber/async 优于每任务一个线程：线程有 99% 的时间闲置等待 token，而 fiber 会在 I/O 时协作式让出执行权。反面观点是 Ashpreet Bedi 的“Scaling Agentic Software”：在负载证明不足前，只用 **FastAPI + Postgres + 其他什么都不要**；简单架构的承载能力往往超出预期。本课构建持久检查点日志、逐智能体工作队列、async 与线程的演示，并落实务实的“先从简单开始”规则。

**类型：** 学习 + 构建
**语言：** Python（标准库、`asyncio`、`sqlite3`）
**前置要求：** 第 16 阶段 · 09（并行群体网络），第 16 阶段 · 13（共享记忆）
**用时：** 约 75 分钟

## 问题

原型多智能体系统在一台笔记本上、三个智能体和内存事件循环中工作正常。你把它移到生产环境：

- 智能体有时要运行数小时（长篇研究、人工在环等待）。
- 工作器进程会崩溃，重启会丢失状态。
- 峰值负载是平均值的 10 倍，需要水平扩展。
- 用户按每次智能体运行付费，需要对收费实现恰好一次语义。

内存事件循环无法做到这些。你需要底层持久化执行层。2026 年的典型选项是：

1. 带检查点的工作流引擎（Temporal、LangGraph runtime）。
2. 带状态存储的消息队列（Postgres + SQS/RabbitMQ）。
3. Actor 模型框架（MegaAgent 的逐智能体生产者—消费者模型）。
4. 手写 FastAPI + Postgres（Bedi 的主张）。

本课分别构建它们的微型版本。

## 概念

### 持久化执行：模式 <!-- learning-atlas: durable-execution-the-pattern -->

持久化执行引擎会在每个“步骤”（LangGraph 称为超级步骤）后持久化完整程序状态。崩溃时：

```text
工作器在步骤中崩溃
  -> 租约超时
  -> 另一工作器接手 thread_id
  -> 从最后一个检查点恢复
  -> 不重复执行副作用
```

要使其工作，需要：

- **可序列化状态。** 所有智能体状态都必须可持久化。包含实时数据库连接的函数闭包无法存活。
- **确定性恢复。** 给定相同状态和相同输入，智能体应产生相同行为（或对 LLM 调用委托给外部确定性预言机）。
- **幂等副作用。** 外部调用（工具调用、支付）必须幂等，或使用去重键。

LangGraph 在每个超级步骤后写检查点；Temporal 在每个活动后写入；Restate 使用事件溯源日志。三者实现的是同一模式。

### 每步骤检查点运行时

LangGraph 的运行时是完整示例：每个智能体拥有 `thread_id`；状态是一个带类型的字典；每个超级步骤都向 checkpoints 表写入一行。恢复时，运行时从最后一个检查点重放，而不是从头开始。智能体可以在等待人工输入时 `interrupt()`，运行时会持久化状态并释放工作器。输入到达后，任意工作器都可以恢复。

截至 2026 年 4 月，这套设计已达到参考级生产标准。

### MegaAgent 的逐智能体队列

arXiv:2408.09955 描述了一项规模实验：一个集群中运行数千个并发智能体。其架构是：

```text
智能体 i：
  state ∈ {Idle, Processing, Response}
  in_queue   <- 发给智能体 i 的消息
  out_queue  -> 回复 + 副作用

协调器：
  组内聊天       （同一组中的智能体）
  组间管理员聊天 （高层路由）
```

两层协调让组内对话保持密集、组间通信保持稀疏；该模式使数千智能体的成本维持线性增长。

### Async 与每任务一个线程

LLM 调用是 I/O 密集型。等待下一个 token 的线程有 99% 的时间处于闲置状态；每个线程约耗费 1MB 内存，1 万个并发调用仅栈就需要 10GB。

Fiber（Python `asyncio`、Go goroutine、Rust `tokio`）在 I/O 时协作式让出执行权。同样的 1 万次调用可以轻松放入一个进程。在 LLM 智能体规模下，async 属于架构选择，不是局部优化。

例外是 CPU 密集型后处理（嵌入、tokenizer 技巧），它仍需要线程或进程。请将 I/O 层和 CPU 层分开。

### Bedi 的反面观点

Ashpreet Bedi 的“Scaling Agentic Software”（2026）认为，大多数团队在衡量负载前就过度工程。务实默认方案是：

- FastAPI + Postgres。
- 每次智能体运行是一行记录；状态通过乐观并发原地更新。
- 使用 `pg_notify` 或简单 Celery 工作器处理后台任务。
- 在应用代码中实现重试策略。

对于可管理任务且并发智能体运行少于约 100 的负载，这通常已足够。等你测到它失效时再升级。

规则是：当你遇到简单架构无法解决的具体问题时，才采用持久化执行框架。过早采用会把时间花在无法产生回报的仪式上。

### 恰好一次语义 <!-- learning-atlas: exactly-once-semantics -->

对于付费智能体运行，你需要“有效恰好一次”（至少一次投递 + 幂等消费者）。工程手段包括：

- **每次运行一个去重键。** 在每次副作用调用中包含它。
- **Outbox 模式。** 先将副作用写入一张表，再由独立进程执行；两步都必须幂等。
- **补偿事务。** 当副作用成功但记录它的写入失败时，安排补偿。

这些是数据库工程模式，并不专属于 LLM。LLM 带来的额外代价只是调用慢；其余都是标准分布式系统问题。

### 彩虹部署

Anthropic 的多智能体研究系统使用“彩虹部署”：多个版本的智能体运行时并发运行，使长时程智能体不必在每次代码部署时被杀死。将新版本金丝雀发布给一部分流量，并在旧版本的智能体完成后再淘汰它。

长时程有状态系统通常采用这种做法；2026 年的适配点在于，智能体可存活数小时，因此部署周期必须容纳它们。

### 典型生产检查表

- 持久状态（检查点、快照，或 outbox + 可重放日志）。
- 幂等副作用。
- 用于 LLM 调用的 async I/O 层。
- 至少一次投递 + 去重。
- 为有状态工作负载使用彩虹/金丝雀部署。
- 可观测性：逐智能体追踪、超级步骤审计、重试计数器。

```figure
sw-checkpoint-replay
```

## 构建

`code/main.py` 实现：

- `CheckpointStore`——由 SQLite 支持、以 thread-id 为键的检查点日志。每个超级步骤追加一行。
- `run_with_checkpoint(agent, thread_id)`——模拟运行中途崩溃；第二个工作器从最后一个检查点恢复。
- `AgentQueue`——带小型工作队列的逐智能体 Idle / Processing / Response 状态机。
- `demo_async_vs_threads()`——用 asyncio 和线程分别运行 500 个并发模拟“LLM 调用”，报告墙钟时间与峰值内存（近似值）。

运行：

```text
python3 code/main.py
```

预期输出：模拟崩溃后检查点恢复成功；async 版本能在 < 1 秒内处理 500 个并发调用；线程版本需要数秒，并且每个并发单元使用高出数个数量级的内存。

## 使用

`outputs/skill-scaling-advisor.md` 会依据负载、状态保留需求和部署频率，建议选择 FastAPI + Postgres、LangGraph runtime、Temporal 或自定义方案。

## 交付

典型生产加固：

- **从简单开始（Bedi 规则）。** 先用 FastAPI + Postgres，直到测得它不够用。
- **优化前先全面埋点。** 逐运行延迟直方图、逐步骤时间、重试次数、故障分类。
- **为副作用采用 outbox 模式。** 尤其是支付和外部 API 调用。
- **彩虹部署。** 部署时绝不杀死飞行中的智能体运行。
- **在以下情况采用持久化执行引擎（Temporal / LangGraph / Restate）：** 遇到具体问题，例如持续数小时的人工在环等待、跨区域协调、复杂重试/补偿策略。
- **I/O 层使用 async。** 线程只用于 CPU 密集型后处理。

## 练习

1. 运行 `code/main.py`，确认检查点恢复正常；测量 async 与线程并发的差异。
2. 实现一个 **outbox** 表：每次工具调用先写入 outbox，再由单独 goroutine/task 执行。通过将工具调用运行两次来验证幂等性。
3. 模拟一次**彩虹部署**：两个并发运行时版本；将一半新 `thread_id` 路由给每个版本；确认旧版本上飞行中的 thread 不会中断。
4. 阅读下方链接的 LangGraph runtime 文档。找出手写 FastAPI + Postgres 版本最难复刻的运行时能力；这是否足以采用它，还是可以延后？
5. 阅读 MegaAgent（arXiv:2408.09955）第 3 节。两层协调（组内 + 组间管理员聊天）是明确的；画出你会如何将它映射到拥有两类队列的消息队列系统。

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|------|----------|----------|
| 持久化执行 | “持久化程序状态” | 引擎在每个超级步骤后写入状态，崩溃恢复是确定性的。 |
| 超级步骤 | “事务边界” | 检查点之间的工作单位，LangGraph 术语。 |
| `thread_id` | “智能体运行标识符” | 绑定检查点与恢复逻辑的键。 |
| 幂等性 | “可以安全重试” | 重复一个副作用产生与一次尝试相同的结果。 |
| Outbox 模式 | “解耦副作用” | 先将意图写入表，再由独立执行器执行并标记完成。 |
| 至少一次投递 | “可能有重复” | 消息队列语义；去重键使消费者达到有效一次。 |
| 彩虹部署 | “版本重叠” | 长时程负载运行期间，多个运行时版本并发。 |
| Async fiber | “协作式让出” | 用户态并发；对 I/O 密集负载比线程便宜。 |
| 检查点 | “状态快照” | 超级步骤边界上的序列化状态，是恢复的关键。 |

## 延伸阅读

- [LangChain — The runtime behind production deep agents](https://www.langchain.com/conceptual-guides/runtime-behind-production-deep-agents) —— LangGraph runtime 设计
- [MegaAgent](https://arxiv.org/abs/2408.09955) —— 逐智能体生产者—消费者队列；数千并发智能体的两层协调
- [Matrix](https://arxiv.org/abs/2511.21686) —— 以消息队列为协调基底的去中心化框架
- [Temporal docs](https://docs.temporal.io/) —— 持久化执行的参考工作流引擎
- [Anthropic — Multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) —— 包含彩虹部署在内的生产经验
