---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/14-agent-engineering/29-production-runtimes/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 693a6f21557b8a6c349730ee6d378eb619b327c65ff8dbfe9474a75968b5f940
status: reviewed
---

# 生产运行时：队列、事件、定时任务

> 生产智能体运行在六种运行时形状上：请求–响应、流式、持久化执行、基于队列的后台、事件驱动、定时调度。先选择形状，再选择框架。无论哪种形状，可观测性都是承重结构。

**类型：** 学习
**语言：** Python（标准库）
**前置要求：** 第 14 阶段 · 第 13 节（LangGraph）、第 14 阶段 · 第 22 节（语音）
**用时：** 约 60 分钟

## 学习目标

- 说出六种生产运行时形状，并将每一种匹配到框架/产品模式。
- 解释为什么持久化执行（LangGraph）对长时程任务很重要。
- 描述事件驱动运行时，以及 Claude Managed Agents 何时适用。
- 解释多步智能体中“可观测性是承重结构”的说法。

## 问题所在

生产智能体会遇到 Jupyter notebook 不会暴露的失败：第 37 步网络超时、用户在语音通话中途挂断、cron 任务因机器重启而停止、后台 worker 内存耗尽。运行时形状决定哪些失败可以存活。

## 核心概念

### 请求–响应

- 同步 HTTP，用户等待完成。
- 只适合短任务（小于 30 秒）。
- 技术栈：Agno（Python + FastAPI）、Mastra（TypeScript + Express/Hono/Fastify/Koa）。
- 可观测性：标准 HTTP 访问日志 + OTel span。

### 流式

- 用 SSE 或 WebSocket 输出渐进结果。
- LiveKit 将它扩展到语音/视频的 WebRTC（第 22 节）。
- 技术栈：任何支持流式的框架 + 能处理 SSE/WS 的前端。
- 可观测性：逐块计时、首 token 延迟、尾部延迟。

### 持久化执行

- 每一步之后保存状态检查点；失败时自动恢复。
- AutoGen v0.4 的 actor 模型将失败隔离到一个智能体（第 14 节）。
- 这是 LangGraph 的核心差异（第 13 节）。
- 当步数未知且恢复成本高时不可或缺。

### 基于队列 / 后台

- 作业进入队列，worker 取走；结果通过 webhook 或 pub/sub 返回。
- 长时程智能体必需（Anthropic 的 computer use 公告称每项任务几十到几百步）。
- 技术栈：Celery（Python）、BullMQ（Node）、SQS + Lambda（AWS）、自定义实现。
- 可观测性：队列深度、每个作业的延迟分布、DLQ 大小。

### 事件驱动

- 智能体订阅触发器：新邮件、PR 打开、cron 触发。
- Claude Managed Agents 开箱覆盖这种场景（第 17 节）。
- CrewAI Flows（第 15 节）为事件驱动的确定性工作流提供结构。
- 可观测性：触发源、事件到启动的延迟、智能体延迟。

### 定时调度

- 定期运行的 cron 形状智能体。
- 与持久化执行结合，让失败的夜间运行在下一次 tick 继续。
- 技术栈：Kubernetes CronJob + 持久化框架；托管方案（Render cron、Vercel cron）。

### 2026 年部署模式

- **CrewAI Flows** 用于事件驱动生产。
- **Agno** 无状态 FastAPI 用于 Python 微服务。
- **Mastra** 服务器适配器（Express、Hono、Fastify、Koa）用于嵌入。
- **Pipecat Cloud / LiveKit Cloud** 用于托管语音（第 22 节）。
- **Claude Managed Agents** 用于托管的长期异步工作。

### 可观测性是承重结构

OpenTelemetry GenAI span（第 23 节）和 Langfuse/Phoenix/Opik 后端（第 24 节）让你能够调试在第 40 步失败的多步智能体。生产环境需要这套可观测性，才能快速调试，而不必从头重放并增加日志。

### 生产运行时会在哪里失败

- **形状选择错误。** 为 5 分钟任务选择请求–响应。用户会挂断，worker 会堆积，重试会叠加。
- **没有 DLQ。** 队列 worker 没有死信队列，失败作业会消失。
- **后台工作不透明。** 后台智能体运行却不导出 trace，直到用户报告问题才发现失败。
- **跳过持久状态。** 任何超过 30 秒、又无法承受重启成本的运行，都需要持久化执行。

```figure
wb-runtime-shapes
```

## 动手构建

code/main.py 是一个标准库多形状 demo：

- 请求–响应端点（普通函数）。
- 流式处理器（生成器）。
- 带 DLQ 的队列 worker。
- 事件触发器注册表。
- cron 形状调度器。

运行：

```bash
python3 code/main.py
```

输出五条轨迹，展示同一任务在每种形状下的行为。智能体逻辑相同，外壳不同。第六种形状——持久化执行——在第 13 节通过 LangGraph 检查点专门介绍。

## 实际使用

- **请求–响应** 用于聊天式 UX。
- **流式** 用于渐进响应。
- **持久化** 用于长时程任务。
- **队列** 用于批处理 / 异步 / 长运行。
- **事件** 用于智能体响应外部事件。
- **Cron** 用于日常维护（记忆整合、评估、成本报告）。

## 交付

outputs/skill-runtime-shape.md 会为任务选择运行时形状，并接入可观测性要求。

## 练习

1. 将第 01 节的 ReAct 循环迁移到技术栈中的全部六种形状。每种形状适合哪个产品界面？
2. 为基于队列的 demo 增加 DLQ。模拟 10% 的作业失败，展示 DLQ 大小。
3. 编写 cron 触发的评估智能体，每晚针对当天排名前 20 的 trace 运行。
4. 实现带背压的流式：客户端变慢时暂停智能体。这与轮次预算如何交互？
5. 阅读 Claude Managed Agents 文档。何时会把自托管长时程智能体迁移到托管？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Request-response | “同步” | 用户等待；只适合短任务 |
| Streaming | “SSE / WS” | 渐进输出；UX 更好；每块可观测延迟 |
| Durable execution | “从失败恢复” | 检查点状态；从最后一步重启 |
| Queue-based | “后台作业” | 生产者 / worker 池 / DLQ |
| Event-driven | “基于触发器” | 智能体对外部事件作出反应 |
| DLQ | “死信队列” | 存放失败作业的停车场 |
| Claude Managed Agents | “托管 harness” | Anthropic 托管的长期异步，带缓存 + 压缩 |

## 延伸阅读

- [LangGraph 概览](https://docs.langchain.com/oss/python/langgraph/overview)——持久化执行细节
- [Claude Managed Agents 概览](https://platform.claude.com/docs/en/managed-agents/overview)——托管长期异步
- [Anthropic，Introducing computer use](https://www.anthropic.com/news/3-5-models-and-computer-use)——“每项任务几十到几百步”
- [AutoGen v0.4（Microsoft Research）](https://www.microsoft.com/en-us/research/articles/autogen-v0-4-reimagining-the-foundation-of-agentic-ai-for-scale-extensibility-and-robustness/)——actor 模型故障隔离
