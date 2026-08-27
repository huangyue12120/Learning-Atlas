---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/14-agent-engineering/12-anthropic-workflow-patterns/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 55c8edf5c8a62595d2db17d555b2ca3cddf12a8b8d8bdf0ff745b347000c0a57
status: reviewed
---

# Anthropic 的工作流模式：简单胜过复杂

> Schluntz 和 Zhang（Anthropic，2024 年 12 月）区分了工作流（预定义路径）和智能体（动态工具使用）。五种工作流模式覆盖了大多数情况。从直接 API 调用开始；只有当步骤无法预测时才加入智能体。

**类型：** 学习 + 构建
**语言：** Python（标准库）
**前置要求：** 第 14 阶段 · 第 01 节（智能体循环）
**用时：** 约 60 分钟

## 学习目标

- 说出 Anthropic 的五种工作流模式：提示词链、路由、并行化、编排器–worker、评估器–优化器。
- 解释智能体与工作流的区别，以及各自的工程成本。
- 判断何时选择工作流而不是智能体（以及相反的情况）。
- 用标准库针对脚本化 LLM 实现全部五种模式。

## 问题所在

团队会为本来只需要一次函数调用的问题选择多智能体框架。成本是真实的：框架会增加遮蔽提示词的层、隐藏控制流，并诱发过早的复杂化。Schluntz 和 Zhang 2024 年 12 月的文章是被引用最多的行业反驳之一：从简单开始，只有在复杂度值得其成本时才增加它。

## 核心概念

### 工作流与智能体

- **工作流。** LLM 和工具由预定义的代码路径编排；工程师拥有图。
- **智能体。** LLM 动态地指导自己的工具并决定自己的步骤；模型拥有图。

二者都有自己的位置。工作流更便宜、更快、更容易调试。智能体解锁开放式问题，但让故障模式更难推理。

### 增强型 LLM

五种模式的共同基础是：一个 LLM 接入三项能力——搜索（检索）、工具（行动）、记忆（持久化）。任意 API 调用都可以使用它们。

### 五种模式

1. **提示词链（Prompt chaining）。** 第 1 次调用的输出是第 2 次调用的输入。任务有清晰线性分解时使用。步骤之间可以加入程序化门控。

2. **路由（Routing）。** 分类器 LLM 选择要调用的下游 LLM 或工具。类别不同的输入需要不同处理时使用（一级支持、退款、bug、销售）。

3. **并行化（Parallelization）。** 并发运行 N 次 LLM 调用，再聚合结果。两种形状是分段（处理不同块）和投票（同一提示词运行 N 次，进行多数投票/综合）。

4. **编排器–worker（Orchestrator-workers）。** 编排器 LLM 动态决定运行哪些 worker（也可以是 LLM），并综合它们的输出。类似智能体循环，但编排器不会无限循环。

5. **评估器–优化器（Evaluator-optimizer）。** 一个 LLM 提出答案，另一个 LLM 进行评估。循环直到 evaluator 通过。这是 Self-Refine（第 05 节）的泛化。

### 工作流胜过智能体的地方

- **可预测的任务。** 如果可以列举步骤，就应该列举。
- **成本受限的任务。** 工作流的步骤数有界；智能体可能不断循环。
- **合规受限的任务。** 审计人员希望阅读图，而不是从轨迹中推断图。

### 智能体胜过工作流的地方

- **开放式研究。** 下一步取决于上一步返回的结果。
- **长度可变的任务。** 需要数分钟到数小时、步骤数未知的工作。
- **新领域。** 还不知道正确工作流时——先探索，之后再固化。

### 上下文工程的伴随纪律

Anthropic 的“面向 AI 智能体的有效上下文工程”（2025）将相邻的纪律形式化：200k 窗口是预算，不是容器。要放入什么、何时压缩、何时让上下文增长。第 14 阶段关于上下文压缩的课程会详细介绍（在本课程编号调整前为第 14 阶段的早期第 06 节）。

```figure
workflow-chain
```

## 动手构建

code/main.py 针对 ScriptedLLM 实现了全部五种工作流模式：

- prompt_chain(input, steps)——顺序执行。
- route(input, classifier, handlers)——分类 + 分派。
- parallel_vote(prompt, n, aggregator)——N 次运行，聚合结果。
- orchestrator_workers(task, workers)——编排器选择 worker。
- evaluator_optimizer(task, proposer, evaluator, max_iter)——循环直到通过。

运行：

```
python3 code/main.py
```

每种模式都会打印自己的轨迹。每个模式的代码总行数约为 10–15 行；框架的成本则以数千行计算。

## 实际使用

- 大多数任务使用直接 API 调用。
- 只有在模式确实需要持久状态（LangGraph）、actor 模型并发（AutoGen v0.4）或角色模板（CrewAI）时才使用框架。
- 如果想要 Claude Code 的 harness 形态，却不想从头重建，可以选择 Claude Agent SDK。

## 交付

outputs/skill-workflow-picker.md 会根据任务描述选择合适的模式，给出决策理由，并提供工作流不足时迁移到智能体的重构路径。

## 练习

1. 实现带置信度阈值的路由。低于阈值就升级给人工。在一级支持场景中，阈值应落在哪里？
2. 为 parallel_vote 增加超时。一个调用卡住时会发生什么？如何用缺失的投票进行聚合？
3. 将 evaluator_optimizer 变成 bandit：在多次迭代之间保留 top-2 输出，避免后期一个坏结果覆盖较早的好结果。
4. 将提示词链与路由组合：路由器从三个链中选一个。比较 token 成本与单个大提示词方案。
5. 选择一个生产功能。画出工作流图并数步骤。这里智能体真的会更好吗？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Workflow | “预定义流程” | 工程师拥有的 LLM 与工具调用图 |
| Agent | “自治 AI” | 模型拥有的图，动态指导工具 |
| Augmented LLM | “带工具的 LLM” | LLM + 搜索 + 工具 + 记忆；原子单位 |
| Prompt chaining | “顺序调用” | 第 N 次调用的输出是第 N+1 次调用的输入 |
| Routing | “分类器分派” | 选择哪个链/模型处理输入 |
| Parallelization | “扇出” | N 次并发调用；按分段或投票聚合 |
| Orchestrator-workers | “分派智能体” | 编排器 LLM 动态选择专门的 LLM |
| Evaluator-optimizer | “提议者 + 评判者” | 循环直到 evaluator 通过；Self-Refine 的泛化 |

## 延伸阅读

- [Anthropic，构建有效的智能体（2024 年 12 月）](https://www.anthropic.com/research/building-effective-agents)——五种工作流模式
- [Anthropic，面向 AI 智能体的有效上下文工程](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)——伴随纪律
- [LangGraph 概览](https://docs.langchain.com/oss/python/langgraph/overview)——有状态图何时值得其成本
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/)——产品化的编排器–worker 模式
