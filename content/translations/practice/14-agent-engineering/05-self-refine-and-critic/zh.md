---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/14-agent-engineering/05-self-refine-and-critic/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 9c7f53947f9886f431c8f1a5d51f4f1c97af01ff68887f33275dbd64892f93e3
status: reviewed
---

# Self-Refine 与 CRITIC：迭代改进输出

> Self-Refine（Madaan 等，2023）让一个 LLM 扮演三个角色——生成、反馈、改进——并循环执行。在 7 个任务上的平均提升为绝对值 20 分。CRITIC（Gou 等，2023）通过把验证路由到外部工具来强化反馈步骤。2026 年，每个框架都会以“evaluator-optimizer”（Anthropic）或防护栏循环（OpenAI Agents SDK）的名字提供这一模式。

**类型：** 构建
**语言：** Python（标准库）
**前置要求：** 第 14 阶段 · 第 01 节（智能体循环）、第 14 阶段 · 第 03 节（Reflexion）
**用时：** 约 60 分钟

## 学习目标

- 说出 Self-Refine 的三个提示词（生成、反馈、改进），并解释为什么改进提示词需要历史记录。
- 解释 CRITIC 的关键洞见：没有外部依据时，LLM 不擅长自我验证。
- 用标准库实现带历史记录和可选外部验证器的 Self-Refine 循环。
- 将这一模式映射到 Anthropic 的 evaluator-optimizer 工作流，以及 OpenAI Agents SDK 的输出防护栏。

## 问题所在

智能体产出一个几乎正确的答案。也许某行代码有语法错误，也许摘要太长，也许计划漏掉了边界情况。你想要的是：智能体批评自己的输出，然后修正它。

Self-Refine 说明只用一个模型、没有训练数据、没有 RL 也可以做到。但它有一个问题：LLM 不擅长对困难事实进行自我验证。CRITIC 给出了修复方案——把验证步骤路由到外部工具（搜索、代码解释器、计算器、测试运行器）。

这两篇论文共同定义了 2026 年迭代改进的默认模式：生成、验证（可能时使用外部验证）、改进，直到验证器通过。

## 核心概念

### Self-Refine（Madaan 等，NeurIPS 2023）

一个 LLM，三个角色：

```
generate(task)            -> output_0
feedback(task, output_0)  -> critique_0
refine(task, output_0, critique_0, history) -> output_1
feedback(task, output_1)  -> critique_1
refine(task, output_1, critique_1, history) -> output_2
...
stop when feedback says "no issues" or budget exhausted.
```

关键细节是：`refine` 能看到完整历史——所有之前的输出和批评——因此不会重复之前的错误。论文做了消融实验：去掉历史后，质量会急剧下降。

核心结果是：在包括 GPT-4 的 7 个任务（数学、代码、缩略词、对话）上平均提升绝对值 20 分。无需训练，无需外部工具，只需一个模型。

### CRITIC（Gou 等，arXiv:2305.11738，2024 年 2 月 v4）

Self-Refine 的弱点是：反馈步骤是 LLM 给自己打分。对于事实性主张，这不可靠（产生幻觉的模型往往也会觉得这段幻觉很可信）。CRITIC 将 `feedback(task, output)` 替换为 `verify(task, output, tools)`，其中 `tools` 包括：

- 用于事实性主张的搜索引擎。
- 用于代码正确性的代码解释器。
- 用于算术的计算器。
- 特定领域的验证器（单元测试、类型检查器、linter）。

验证器根据工具结果生成结构化批评，建立在事实依据上。改进器再以这段批评为条件。

核心结果是：在事实性任务上，CRITIC 优于 Self-Refine，因为批评有依据。在没有外部验证器的任务（创意写作、格式处理）上，CRITIC 会退化为 Self-Refine。

### 停止条件

有两种常见形状：

1. **验证器通过。** 外部测试返回成功。在可用时优先使用（单元测试、类型检查器、防护栏断言）。
2. **没有反馈。** 模型说“输出没有问题”。成本更低但不可靠；应与最大迭代次数上限结合。

2026 年的默认做法是将二者结合：“如果验证器通过，或模型说没问题且迭代次数至少为 2，或达到最大迭代次数，就停止。”

### Evaluator-Optimizer（Anthropic，2024）

Anthropic 2024 年 12 月的文章将它命名为五种工作流模式之一。它包含两个角色：

- Evaluator：为输出评分并产生批评。
- Optimizer：根据批评修订输出。

循环执行，直到 evaluator 通过。这对应 Anthropic 语境下的 Self-Refine/CRITIC。Anthropic 补充的关键工程细节是：evaluator 和 optimizer 的提示词应该有明显不同，以免模型只是机械地盖章通过。

### OpenAI Agents SDK 输出防护栏

OpenAI Agents SDK 以“输出防护栏”的名字提供了这一模式。防护栏是运行在智能体最终输出上的验证器。如果防护栏触发（抛出 `OutputGuardrailTripwireTriggered`），输出会被拒绝，智能体可以重试。防护栏可以调用工具（CRITIC 风格），也可以是纯函数（Self-Refine 风格）。

### 2026 年的陷阱

- **机械盖章循环。** 同一个模型以同一种提示词风格生成和批评，最终会收敛到“看起来不错”。使用结构明显不同的提示词，或使用更小、更便宜的模型做批评。
- **过度改进。** 每一轮改进都会增加延迟和 token。预算 1–3 轮；之后升级到人工审核。
- **对琐碎任务使用 CRITIC。** 没有外部验证器时，CRITIC 会退化为 Self-Refine；不要为一个空壳验证器付出延迟。

```figure
self-refine
```

## 动手构建

`code/main.py` 在一个玩具任务上实现 Self-Refine 和 CRITIC：给定主题，生成一个简短的项目符号列表。验证器检查格式（3 个项目符号，每个少于 60 个字符）。CRITIC 额外加入一个外部“事实验证器”，对已知幻觉进行惩罚。

组件包括：

- `generate`——脚本化的生成器。
- `feedback`——LLM 风格的自我批评。
- `verify_external`——CRITIC 风格、以依据为基础的验证器。
- `refine`——根据历史记录重写输出。
- 停止条件——验证器通过或最多 4 次迭代。

运行：

```
python3 code/main.py
```

比较 Self-Refine 和 CRITIC 的运行结果。CRITIC 能捕获 Self-Refine 漏掉的事实错误，因为外部验证器拥有自我批评器没有的依据。

## 实际使用

Anthropic 的 evaluator-optimizer 用适合 Claude 的语言表达了这个模式。OpenAI Agents SDK 的输出防护栏是 CRITIC 形状的（防护栏可以调用工具）。LangGraph 提供读起来像 Self-Refine 的 reflection 节点。Google 的 Gemini 2.5 Computer Use 加入了逐步安全评估器，这是 CRITIC 的一个变体：每次行动提交前都要验证。

## 交付

`outputs/skill-refine-loop.md` 会根据任务形状、验证器可用性和迭代预算配置 evaluator-optimizer 循环。它会生成生成器、evaluator/验证器和 optimizer 的提示词，以及停止策略。

## 练习

1. 用 `max_iterations=1` 运行玩具实现。CRITIC 仍然有帮助吗？
2. 将外部验证器替换为有噪声的验证器（随机产生 30% 的假阳性）。循环会怎样？这代表 2026 年许多防护栏堆栈面对的现实。
3. 实现“不同模型的生成器–批评器”变体：大模型生成，小模型批评。它会超过同一模型吗？
4. 阅读 CRITIC 第 3 节（arXiv:2305.11738 v4）。说出三类验证工具，并为每一类举一个例子。
5. 将 OpenAI Agents SDK 的 `output_guardrails` 映射到 CRITIC 的验证器角色。SDK 哪些地方做错了，哪些地方做对了？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Self-Refine | “会自我修复的 LLM” | 一个模型中的生成 → 反馈 → 改进循环，并带历史记录 |
| CRITIC | “以工具为依据的验证” | 用外部验证器（搜索、代码、计算、测试）替换反馈 |
| Evaluator-Optimizer | “Anthropic 工作流模式” | 两种角色——evaluator 评分，optimizer 修订——循环到收敛 |
| Output guardrail | “事后检查” | 在智能体产出后运行的 OpenAI Agents SDK 验证器 |
| Verify step | “批评阶段” | 承担关键决策的步骤：验证是有依据的，还是只靠自评 |
| Refine history | “模型已经尝试过的内容” | 添加到改进提示词开头的既往输出 + 批评；去掉后质量会崩落 |
| Rubber-stamp loop | “自我同意失败” | 同一提示词风格的批评返回“看起来很好”；用结构不同的提示词修复 |
| Stop condition | “收敛测试” | 验证器通过，或没有反馈且达到迭代上限；绝不能只用单一条件 |

## 延伸阅读

- [Madaan 等，Self-Refine（arXiv:2303.17651）](https://arxiv.org/abs/2303.17651)——经典论文
- [Gou 等，CRITIC（arXiv:2305.11738）](https://arxiv.org/abs/2305.11738)——以工具为依据的验证
- [Anthropic，构建有效的智能体](https://www.anthropic.com/research/building-effective-agents)——evaluator-optimizer 工作流模式
- [OpenAI Agents SDK 文档](https://openai.github.io/openai-agents-python/)——CRITIC 形状的输出防护栏验证器
