---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/14-agent-engineering/02-rewoo-plan-and-execute/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 6415552ddca63102995206c84e95e9b0225b77c0c06ac808f316eb36431bb4df
status: reviewed
---

# ReWOO 与规划后执行：解耦规划

> ReAct 在同一个流中交错思考和行动。ReWOO 将二者分开：先一次性制定大计划，再执行。token 少 5 倍，HotpotQA 准确率高 4%，还可以把规划器蒸馏到 7B 模型。Plan-and-Execute 将它推广开来，Plan-and-Act 则把它扩展到网页导航。

**类型：** 构建
**语言：** Python（标准库）
**前置要求：** 第 14 阶段 · 第 01 节（智能体循环）
**用时：** 约 60 分钟

## 学习目标

- 解释为什么 ReWOO 的 Planner / Worker / Solver 分工比 ReAct 的交错循环节省 token 且更稳健。
- 用标准库实现计划 DAG、按依赖顺序执行的执行器，以及组合 worker 输出的 solver。
- 用 Anthropic 2026 年“五种工作流模式”的框架，判断任务应采用规划后执行还是交错式 ReAct。
- 识别长时程网页或移动任务何时需要 Plan-and-Act 的合成计划数据。

## 问题所在

ReAct 的交错式思考–行动–观察循环简单灵活，但每一次工具调用都必须携带此前的完整上下文——包括之前的每个思考。token 用量随深度呈二次增长。更糟的是，当工具在循环中途失败时，模型必须根据错误观察结果重新推导整个计划。

ReWOO（Xu 等，arXiv:2305.18323，2023 年 5 月）注意到了这一点，并做出了一个选择：先一次性规划全部内容，并行获取证据，最后组合答案。一次 LLM 调用负责规划，N 次工具调用负责证据（可以并行），一次 LLM 调用负责求解。代价是灵活性降低（计划是静态的），换来更高的 token 效率和更清晰的故障边界。

## 核心概念

### 三种角色

```
Planner:  user_question -> [plan_dag]
Workers:  [plan_dag]     -> [evidence]        (tool calls, possibly parallel)
Solver:   user_question, plan_dag, evidence -> final_answer
```

Planner 产出一个 DAG。每个节点命名一个工具、给出其参数，并指出它依赖哪些更早的节点（例如 `#E1`、`#E2` 这样的引用）。Worker 按拓扑顺序执行节点。Solver 将所有内容串接起来。

### 为什么 token 少 5 倍

ReAct 的提示词长度随步数线性增长。到第 10 步时，提示词包含思考 1、行动 1、观察 1、思考 2、行动 2、观察 2，以此类推。每个中间步骤还会冗余地包含原始提示词。

ReWOO 只需要支付一次较大的 planner 提示词、N 个较小的 worker 提示词（每个只有工具调用，没有链式上下文），以及一次 solver 提示词。论文在 HotpotQA 上测得 token 少约 5 倍，同时绝对准确率高 4%。

### 为什么更稳健

如果 ReAct 中的 worker 3 失败，循环必须在流中途从错误中进行推理。在 ReWOO 中，worker 3 返回一个错误字符串；solver 在原始计划的上下文中看到它，因此可以优雅降级。故障定位以节点为单位，而不是以步骤为单位。

### Planner 蒸馏

论文的第二项结果是：因为 planner 看不到观察结果，所以可以用 175B 教师模型的规划输出对 7B 模型进行微调。小模型负责规划，推理时不再需要大模型。如今这已成为常见做法——许多 2026 年生产智能体会使用小规划器配大执行器，或反过来。

### Plan-and-Execute（2023）

LangChain 团队 2023 年 8 月的文章把 ReWOO 推广成了一个模式名称：Plan-and-Execute。前置 planner 输出步骤列表，executor 执行每一步，可选的 replanner 在观察结果后修订计划。这比 ReWOO 更接近 ReAct（replanner 会把观察结果带回规划阶段），但保留了 token 节省。

### Plan-and-Act（Erdogan 等，arXiv:2503.09572，ICML 2025）

Plan-and-Act 将这一模式扩展到长时程网页和移动智能体。关键贡献是合成计划数据：带标签的轨迹生成器产生计划显式的数据。它被用来微调规划器模型，使模型在 WebArena 类任务中超过 30–50 步后仍能工作；单条 ReAct 轨迹在这类任务中会失去连贯性。

### 该选哪一种

| 模式 | 适用时机 |
|------|----------|
| ReAct | 短任务、环境未知、需要对异常做出反应 |
| ReWOO | 工具已知的结构化任务、对 token 敏感、证据可并行获取 |
| Plan-and-Execute | 类似 ReWOO，但需要部分执行后重新规划 |
| Plan-and-Act | 长时程（超过 30 步）、网页/移动/计算机使用任务 |
| Tree of Thoughts | 值得付出搜索成本的任务（第 04 节） |

Anthropic 2024 年 12 月的建议是：从最简单的方案开始。如果任务只是一次工具调用加摘要，不要构建 ReWOO；如果任务是 40 步的研究作业，也不要只做 ReAct。

```figure
rewoo-plan
```

## 动手构建

`code/main.py` 实现了一个玩具版 ReWOO：

- `Planner`——根据提示词输出计划 DAG 的脚本化策略。
- `Worker`——通过注册表分派每个节点的工具调用。
- `Solver`——读取证据并生成最终答案的脚本化组合器。
- 依赖解析——在分派时将 `#E1` 等引用替换为之前 worker 的输出。

示例回答“法国首都的人口是多少，四舍五入到百万？”这个问题，使用两步计划：（1）查首都；（2）查人口；然后求解。

运行：

```
python3 code/main.py
```

轨迹先展示完整计划，再展示 worker 结果，最后展示 solver 组合。把它与交错式 ReAct 运行进行比较（我们打印的是粗略字符数）：在这类结构化任务上，ReWOO 更省。

## 实际使用

LangGraph 以 recipe 形式提供 Plan-and-Execute（ReAct 使用 `create_react_agent`，plan-execute 使用自定义图）。CrewAI 的 Flows 直接编码了这种模式：你预先定义任务，Flow DAG 负责执行。Plan-and-Act 的合成数据方法仍主要处于研究阶段；显式计划 DAG 这种运行时模式则通过 LangGraph 和 CrewAI Flows 进入生产环境。

## 交付

`outputs/skill-rewoo-planner.md` 会根据用户请求和工具目录生成 ReWOO 计划 DAG。它会在交给执行器之前验证计划（无环、每个引用已解析、每个工具都存在）。

## 练习

1. 并行执行相互独立的计划节点。对于一个含 6 个节点、分成 2 个并行组的 DAG，这带来什么收益？
2. 增加一个 replanner 节点：任一 worker 返回错误时触发。要让 ReWOO 变成 Plan-and-Execute，最小改动是什么？
3. 用小模型（7B 级别）替换 `Planner`，让 `Solver` 继续使用 frontier 模型。比较端到端质量——分工在哪些地方失败？
4. 阅读 ReWOO 论文第 4 节关于规划器蒸馏的内容。概念性地复现 175B → 7B 结果：需要什么训练数据，如何评估计划质量？
5. 将玩具实现迁移为 Plan-and-Act 的轨迹形状：计划是序列而非 DAG。哪些权衡会改变？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| ReWOO | “无观察推理” | 先规划，再并行获取证据，最后求解——规划提示词中没有观察结果 |
| Plan-and-Execute | “LangChain 的 plan-execute 模式” | 在执行后增加可选 replanner 节点的 ReWOO |
| Plan-and-Act | “扩展版 plan-execute” | 显式的规划器/执行器分工，用合成计划训练数据支持长时程任务 |
| Evidence reference | “#E1、#E2……” | 计划节点占位符，在分派时替换为之前 worker 的输出 |
| Planner distillation | “小规划器、大执行器” | 用大教师模型的规划轨迹微调小模型 |
| Token efficiency | “更少的往返” | 论文中相对 ReAct 在 HotpotQA 上少 5 倍 token |
| DAG executor | “拓扑分派器” | 按依赖顺序运行计划节点，并在同一层并行 |

## 延伸阅读

- [Xu 等，ReWOO：将推理与观察解耦（arXiv:2305.18323）](https://arxiv.org/abs/2305.18323)——经典论文
- [Erdogan 等，Plan-and-Act（arXiv:2503.09572）](https://arxiv.org/abs/2503.09572)——使用合成计划扩展规划器–执行器
- [LangGraph Plan-and-Execute 教程](https://docs.langchain.com/oss/python/langgraph/overview)——框架 recipe
- [Anthropic，构建有效的智能体](https://www.anthropic.com/research/building-effective-agents)——选择能工作的最简单模式
