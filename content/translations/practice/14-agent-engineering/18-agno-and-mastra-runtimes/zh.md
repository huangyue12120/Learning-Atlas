---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/14-agent-engineering/18-agno-and-mastra-runtimes/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 825b6ee75ecab014886579c42bbae112c977eb6b51b91d570c412faa3933ec79
status: reviewed
---

# 生产智能体运行时——快速实例化与类型化工作流

> 生产智能体运行时优化的是原型框架忽略的内容：实例化成本、类型化工作流界面和可用于服务的后端。2026 年的组合是：Agno（Python）追求微秒级智能体实例化和无状态 FastAPI 后端；Mastra 在 Vercel AI SDK 基础之上提供智能体、工具、工作流、统一模型路由和组合式存储。

**类型：** 学习
**语言：** Python、TypeScript
**前置要求：** 第 14 阶段 · 第 01 节（智能体循环）、第 14 阶段 · 第 13 节（LangGraph）
**用时：** 约 45 分钟

## 学习目标

- 识别 Agno 的性能目标以及它们何时重要。
- 说出 Mastra 的三个原语——Agents、Tools、Workflows——以及支持的服务器适配器。
- 解释为什么无状态、按 session 作用域的 FastAPI 后端是推荐的 Agno 生产路径。
- 针对给定技术栈选择 Agno 或 Mastra（Python-first 与 TypeScript-first）。

## 问题所在

LangGraph、AutoGen、CrewAI 都比较重。想要“只要智能体循环、速度快、运行在我的运行时里”的团队会选择 Agno（Python）或 Mastra（TypeScript）。二者都用一部分框架拥有的原语换取原始速度，以及与周围技术栈更紧密的结合。

## 核心概念

### Agno

- Python 运行时，之前名为 Phi-data。
- “没有图、链或复杂模式——只有纯 Python。”
- 文档中的性能目标：约 2μs 的智能体实例化、每个智能体约 3.75 KiB 内存、约 23 个模型提供方。
- 生产路径：无状态、按 session 作用域的 FastAPI 后端。每个请求启动一个全新的智能体；session 状态保存在数据库中。
- 原生多模态（文本、图像、音频、视频、文件）和 agentic RAG。

当每秒有数千个短生命周期智能体（聊天扇入、评估管线）时，速度目标很重要。当一个智能体运行 10 分钟时，它们就不那么重要。

### Mastra

- TypeScript，建立在 Vercel AI SDK 之上。
- 三个原语：**Agents**、**Tools**（Zod 类型化）、**Workflows**。
- 统一模型路由——94 个提供方的 3,300+ 个模型（2026 年 3 月）。
- 组合式存储：把记忆、工作流、可观测性分别接到不同后端；大规模可观测性推荐 ClickHouse。
- Apache 2.0，但源代码中的 ee/ 目录使用 source-available 企业许可证。
- 支持 Express、Hono、Fastify、Koa 的服务器适配器；一等支持 Next.js 和 Astro 集成。
- 提供 Mastra Studio（localhost:4111）用于调试。
- 在 1.0 版本（2026 年 1 月）拥有 22k+ GitHub stars、每周 300k+ npm 下载。

### 定位

二者都不试图成为 LangGraph。它们的竞争点是：

- **语言适配。** Agno 面向 Python-first 团队；Mastra 面向 TypeScript-first 团队。
- **运行时人体工学。** Agno = 接近零开销；Mastra = 与 Vercel 生态集成。
- **可观测性。** 二者都集成 Langfuse/Phoenix/Opik（第 24 节），但 Mastra Studio 是一方产品。

### 何时选择哪一个

- **Agno**——Python 后端、大量短生命周期智能体、强性能要求、FastAPI 团队。
- **Mastra**——TypeScript 后端、Next.js / Vercel 部署、统一多提供方模型路由、Zod 类型化工具。
- **LangGraph**（第 13 节）——持久状态和显式图推理比原始速度更重要。
- **OpenAI / Claude Agent SDK**——想采用提供方的产品化形状（第 16–17 节）。

### 这个模式会在哪里出错

- **为了性能而性能。** 当工作负载是每次请求一次缓慢的智能体调用时，因为“2μs”听起来不错就选择 Agno；开销根本不是瓶颈。
- **生态锁定。** Mastra 的 Vercel 风格集成在 Vercel 上是优势，在其他地方可能是劣势。
- **企业许可证混淆。** Mastra 的 ee/ 目录是 source-available，不是 Apache 2.0。如果计划 fork，请阅读许可证。

```figure
wb-runtime-spawn
```

## 动手构建

本节主要用于比较——没有单一代码产物能公正地代表两个框架。查看 code/main.py 的并排玩具实现：一个“运行智能体、流式输出、持久化 session”的流程，分别以 Agno 形状和 Mastra 形状实现。


运行：

```
python3 code/main.py
```

两条结构不同但功能等价的轨迹。

## 实际使用

- **Agno**——需要速度和 FastAPI 形状的 Python 后端。
- **Mastra**——拥有多个提供方和工作流原语的 TypeScript 后端。
- 二者都提供一方可观测性钩子，也都集成 Langfuse。

## 交付

outputs/skill-runtime-picker.md 会根据技术栈、延迟预算和运行形态，在 Agno、Mastra、LangGraph 或提供方 SDK 之间选择。

## 练习

1. 阅读 Agno 文档。将第 01 节的标准库 ReAct 循环迁移到 Agno。哪些东西消失了？哪些保留？
2. 阅读 Mastra 文档。将相同循环迁移到 Mastra。工具类型（Zod 与无类型）发生了什么变化？
3. 基准测试：在你的技术栈上测量智能体实例化延迟。Agno 的 2μs 对你的工作负载重要吗？
4. 设计迁移：如果你一直在 Python 中运行 CrewAI，迁移到 Agno 会破坏什么？
5. 阅读 Mastra 的 ee/ 许可证条款。哪些限制会影响开源 fork？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Agno | “快速 Python 智能体” | 无状态、按 session 作用域的智能体运行时 |
| Mastra | “Vercel AI SDK 上的 TypeScript 智能体” | Agents + Tools + Workflows + Model Router |
| Unified Model Router | “多提供方访问” | 一个客户端访问 94 个提供方的 3,300+ 个模型 |
| Composite storage | “多后端” | 记忆/工作流/可观测性分别使用不同存储 |
| Mastra Studio | “本地调试器” | 用于检查智能体的 localhost:4111 UI |
| Source-available | “不是 OSS” | 允许阅读源代码，但限制商业使用的许可证 |

## 延伸阅读

- [Agno Agent Framework 文档](https://www.agno.com/agent-framework)——性能目标、FastAPI 集成
- [Mastra 文档](https://mastra.ai/docs)——原语、服务器适配器、模型路由
- [LangGraph 概览](https://docs.langchain.com/oss/python/langgraph/overview)——有状态图替代方案
- [Comet Opik](https://www.comet.com/site/products/opik/)——Mastra 集成中引用的可观测性比较
