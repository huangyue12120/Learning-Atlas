---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/14-agent-engineering/28-orchestration-patterns/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: c45bf70a77e6c5a172587da2d472cc0d398e62b3bd48352ad4da34d108a2a7f2
status: reviewed
---

# 编排模式：Supervisor、Swarm、Hierarchical

> 2026 年的框架中反复出现四种编排模式：supervisor-worker、swarm / 点对点、hierarchical、debate。Anthropic 的建议是：“关键在于为你的需求构建正确的系统。”先从简单方案开始；只有在单智能体加五种工作流模式不足时才增加拓扑。

**类型：** 学习 + 构建
**语言：** Python（标准库）
**前置要求：** 第 14 阶段 · 第 12 节（工作流模式）、第 14 阶段 · 第 25 节（多智能体辩论）
**用时：** 约 60 分钟

## 学习目标

- 说出四种反复出现的编排模式，以及每一种适用的情况。
- 描述 2026 年 LangChain 的建议：基于工具调用的 supervisor 与 supervisor 库的差异。
- 解释 Anthropic 的“构建正确系统”规则，以及它如何约束拓扑选择。
- 用标准库针对一个共同的脚本化 LLM 实现全部四种模式。

## 问题所在

团队在还不需要多智能体之前就急着使用“多智能体”。框架中反复出现四种模式；一旦能说出它们，就可以选择正确方案——或者完全跳过拓扑。

## 核心概念

### Supervisor-worker

- 中央路由 LLM 将任务分派给专门智能体。
- 它决定：回到自身循环、交给专家，还是终止。
- 专家之间不直接交流；所有路由都经过 supervisor。

框架包括：LangGraph create_supervisor、Anthropic orchestrator-workers、CrewAI Hierarchical Process。

**2026 年 LangChain 建议：** 通过直接工具调用进行监督，而不是使用 create_supervisor。这样可以更细致地控制上下文工程——你可以精确决定每个专家看到什么。

### Swarm / 点对点

- 智能体通过共享工具界面直接交接。
- 没有中央路由器。
- 延迟低于 supervisor（跳数更少）。
- 更难推理（没有单一控制点）。

框架包括：LangGraph swarm 拓扑、OpenAI Agents SDK handoff（当所有智能体都可以交给其他智能体时）。

### Hierarchical

- supervisor 管理子 supervisor，子 supervisor 再管理 worker。
- 在 LangGraph 中通过嵌套子图实现；在 CrewAI 中通过嵌套 crew 实现。
- 以运行复杂度为代价，扩展到大量智能体。

需要它的情况是：单个 supervisor 的上下文预算容纳不下所有专家的描述。

### Debate

- 并行提议者 + 迭代式交叉批评（第 25 节）。
- 严格说它更像验证而不是编排，但在框架中经常作为一种拓扑选择出现。

### 自治 Crew 与确定性 Flow

CrewAI 将两种部署模式形式化：

- **Flow** 用于确定性的事件驱动自动化（生产环境推荐的起点）。
- **Crew** 用于自治的基于角色的协作。

它与上面的四种模式正交，但可以映射到拓扑：Flow 通常是 supervisor 或 hierarchical；Crew 通常是带 LLM 路由器的 supervisor。

### Anthropic 的建议

“LLM 领域的成功不在于构建最复杂的系统，而在于为你的需求构建正确的系统。”

决策顺序：

1. 单智能体 + 工作流模式（第 12 节）——从这里开始。
2. Supervisor-worker——有 2–4 个专家时。
3. Swarm——延迟比推理清晰度更重要时。
4. Hierarchical——只有 supervisor 上下文预算不够时。
5. Debate——准确率比成本更重要时。

### 这个模式会在哪里出错

- **拓扑优先思维。** 还没有确认多智能体解决什么问题，就说“我们需要多智能体”。
- **Swarm 中交接来回跳。** A → B → A → B。使用跳转计数器。
- **虚假的层级。** 因为“企业级”而加三层，实际只有两个团队。把它压平。

```figure
orchestration-pattern
```

## 动手构建

code/main.py 用标准库针对脚本化 LLM 实现全部四种模式：

- Supervisor——中央路由器。
- Swarm——直接点对点交接。
- Hierarchical——supervisor 管理 supervisor。
- Debate——并行提议者 + 批评。

每种模式处理同一个三意图任务（refund / bug / sales），但轨迹形状各不相同。

运行：

```
python3 code/main.py
```

输出每种模式的轨迹和操作数。Supervisor 最干净；swarm 最短；hierarchical 最深；debate 最昂贵。

## 实际使用

- **LangGraph** 用于 supervisor 和 hierarchical（嵌套子图）。
- **OpenAI Agents SDK** 用于作为工具的 handoff（supervisor 形状）。
- **CrewAI Flow** 用于生产确定性工作流。
- **自定义实现** 用于辩论，或需要精确控制的场景。

## 交付

outputs/skill-orchestration-picker.md 会选择一种拓扑并实现它。

## 练习

1. 移除路由器，将 supervisor-worker 改为 swarm。什么坏了？什么改善了？
2. 为 swarm 增加跳转计数器：3 次 handoff 后拒绝。它能抓住 A→B→A 的来回跳转吗？
3. 为一个包含 12 个专家的领域构建两层 hierarchical 系统。如果没有嵌套，上下文预算在哪里失败？
4. 在生产形状的工作负载上分析四种模式。它们分别在哪个指标（延迟、成本、准确率、可调试性）上胜出？
5. 阅读 Anthropic 的《Building Effective Agents》文章。把每条生产流程映射到四种模式之一。有没有不能干净映射的？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Supervisor-worker | “路由器 + 专家” | 中央 LLM 分派专家；专家互不交流 |
| Swarm | “点对点” | 通过共享工具直接交接；没有中央路由器 |
| Hierarchical | “supervisor 的 supervisor” | 面向大规模智能体群体的嵌套子图 |
| Debate | “提议者 + 批评” | 并行提议者和交叉批评（第 25 节） |
| Tool-call-based supervision | “没有库的 supervisor” | 以直接工具调用实现 supervisor，控制上下文 |
| Crew | “自治团队” | CrewAI 的基于角色的协作模式 |
| Flow | “确定性工作流” | CrewAI 的生产事件驱动模式 |

## 延伸阅读

- [Anthropic，构建有效的智能体](https://www.anthropic.com/research/building-effective-agents)——五种模式 + 智能体与工作流
- [LangGraph 概览](https://docs.langchain.com/oss/python/langgraph/overview)——supervisor、swarm、hierarchical
- [CrewAI 文档](https://docs.crewai.com/en/introduction)——Crew 与 Flow
- [Du 等，Society of Minds（arXiv:2305.14325）](https://arxiv.org/abs/2305.14325)——辩论模式
