---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/14-agent-engineering/14-autogen-actor-model/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: d711c64e9a5125ae7cb7b50dfd73abf765f3b3e0d6cef0992da9240fee934ad8
status: reviewed
---

# 智能体的 Actor 模型——异步消息与类型化运行时

> 把智能体当作 actor：异步消息交换、事件驱动处理器、故障隔离、自然并发。AutoGen v0.4（Microsoft Research，2025 年 1 月）围绕这一模型重新设计了智能体编排；框架目前处于维护模式，Microsoft Agent Framework（2025 年 10 月公开预览）是其生产继任者。

**类型：** 学习 + 构建
**语言：** Python（标准库）
**前置要求：** 第 14 阶段 · 第 01 节（智能体循环）、第 14 阶段 · 第 12 节（工作流模式）
**用时：** 约 75 分钟

## 学习目标

- 描述 actor 模型：智能体是 actor，消息是唯一的 IPC，每个 actor 单独隔离故障。
- 说出 AutoGen v0.4 的三层 API——Core、AgentChat、Extensions——以及各自用途。
- 解释为什么把消息投递与处理解耦会带来故障隔离和自然并发。
- 用 Python 标准库实现 actor 运行时，并将双智能体代码审查流程迁移到其中。

## 问题所在

大多数智能体框架是同步的：一个智能体产生，一个智能体消费，所有内容都在调用栈中完成。失败会让整个调用栈崩溃，并发是后来才加上的；分布式运行需要重写。

AutoGen v0.4 的答案是 actor 模型。每个智能体都是拥有私有收件箱的 actor。消息是唯一的交互方式。运行时将投递与处理解耦。故障隔离到一个 actor。并发是原生能力。分布式只是换了传输方式。

## 核心概念

### Actor

一个 actor 具有：

- 私有状态（外部绝不能直接触碰）。
- 收件箱（消息队列）。
- 处理器：receive(message) -> effects，其中 effects 可以是“回复”“发送给另一个 actor”“生成新 actor”“更新状态”“停止自身”。

两个 actor 不能共享内存，只能发送消息。

### 三层 API

AutoGen v0.4 将界面分为三层：

1. **Core。** 低层 actor 框架。AgentRuntime、Agent、Message、Topic。异步消息交换、事件驱动。
2. **AgentChat。** 面向任务的高层 API（替代 v0.2 的 ConversableAgent）。AssistantAgent、UserProxyAgent、RoundRobinGroupChat、SelectorGroupChat。
3. **Extensions。** 集成——OpenAI、Anthropic、Azure、工具、记忆。

### 为什么解耦很重要

在 v0.2 模型中，同步调用 agent_a.chat(agent_b) 会阻塞 agent_a，直到 agent_b 返回。在 v0.4 中，send(agent_b, msg) 将消息放入 agent_b 的收件箱后立即返回。运行时稍后再投递。由此产生三个后果：

- **故障隔离。** Agent B 崩溃不会让 Agent A 崩溃——运行时捕获 B 处理器中的失败，再决定如何处理（记录、重试、进入死信）。
- **自然并发。** 多条消息可以同时在途；actor 并发处理各自的收件箱。
- **面向分布式。** 无论 actor 在进程内还是另一台主机上，收件箱 + 传输都是同一个抽象。

### 拓扑

- **RoundRobinGroupChat。** 智能体按固定轮换轮流执行。
- **SelectorGroupChat。** selector 智能体依据对话上下文选择下一个执行者。
- **Magentic-One。** 面向网页浏览、代码执行和文件处理的参考多智能体团队，建立在 AgentChat 之上。

### 可观测性

内置 OpenTelemetry 支持。每条消息都会发出一个 span；工具调用会携带 2026 年 OTel GenAI 语义约定中的 gen_ai.* 属性（第 23 节）。

### 状态：维护模式

2026 年初：AutoGen v0.7.x 对研究和原型仍然稳定。Microsoft 已将主动开发转向 Microsoft Agent Framework，即生产继任者（2025 年 10 月 1 日公开预览；1.0 GA 的目标是 2026 年第一季度末）。AutoGen 模式可以干净地迁移——actor 模型才是持久的思想。

```figure
actor-mailbox
```

## 动手构建

code/main.py 用标准库实现 actor 运行时：

- Message——带 sender、recipient、topic、body 的类型化载荷。
- Actor——带 receive(message, runtime) 的抽象类。
- Runtime——包含共享队列、投递和故障隔离的事件循环。
- 一个双 actor 示例：ReviewerAgent 审查代码，ChecklistAgent 执行检查清单；二者交换消息直到达成共识。

运行：

```
python3 code/main.py
```

轨迹展示消息投递、一个 actor 中的模拟故障（不会让另一个 actor 崩溃），以及二者收敛到共同结论。

## 实际使用

- **AutoGen v0.4/v0.7**（维护模式）——稳定，适用于研究、原型和多智能体模式。
- **Microsoft Agent Framework**——生产继任者（2025 年 10 月公开预览）；刷新后的 API 仍采用相同 actor 模型思想。
- **LangGraph swarm 拓扑**（第 13 节）——通过共享工具交接实现的类似模式。
- **自定义 actor 运行时**——当需要指定传输方式（NATS、RabbitMQ、gRPC）时。

## 交付

outputs/skill-actor-runtime.md 会根据给定的多智能体任务，生成一个最小 actor 运行时和一个团队模板（RoundRobin 或 Selector）。

## 练习

1. 增加死信队列：处理器抛出异常时，把失败消息停放起来供人工检查。玩具实现会多频繁命中 DLQ？
2. 实现 SelectorGroupChat：selector actor 根据对话状态选择处理下一条消息的 actor。
3. 增加分布式传输：将进程内队列替换为 JSON-over-HTTP 服务器，让 actor 在不同进程中运行。
4. 为每条消息接入一个 OTel span（或无操作替代）。按第 23 节发出 gen_ai.agent.name、gen_ai.operation.name。
5. 阅读 AutoGen v0.4 的架构文章。将玩具实现迁移到真正的 autogen_core API。哪些被你省略、但对生产很重要？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Actor | “智能体” | 私有状态 + 收件箱 + 处理器；不共享内存 |
| Message | “事件” | 类型化载荷；actor 交互的唯一方式 |
| Inbox | “邮箱” | 每个 actor 的待处理消息队列 |
| Runtime | “智能体宿主” | 路由消息并隔离故障的事件循环 |
| Topic | “频道” | actor 之间有名字的发布–订阅路径 |
| Fault isolation | “任其崩溃” | 一个 actor 失败不会让其他 actor 崩溃 |
| RoundRobinGroupChat | “固定轮换团队” | 智能体按顺序轮流执行 |
| SelectorGroupChat | “按上下文路由的团队” | selector 选择下一个执行者 |
| Magentic-One | “参考团队” | 面向网页 + 代码 + 文件的多智能体小组 |

## 延伸阅读

- [AutoGen v0.4，Microsoft Research](https://www.microsoft.com/en-us/research/articles/autogen-v0-4-reimagining-the-foundation-of-agentic-ai-for-scale-extensibility-and-robustness/)——重设计文章
- [LangGraph 概览](https://docs.langchain.com/oss/python/langgraph/overview)——图形状替代方案
- [OpenTelemetry GenAI 语义约定](https://opentelemetry.io/docs/specs/semconv/gen-ai/)——AutoGen 默认发出的 span
