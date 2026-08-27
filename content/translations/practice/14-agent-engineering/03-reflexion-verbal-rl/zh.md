---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/14-agent-engineering/03-reflexion-verbal-rl/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 9afabebcab9e1ce6d6ab3b2b0ceabd8b0aa308b25a73b8d6510fc2f2739f9b36
status: reviewed
---

# Reflexion：语言式强化学习

> 基于梯度的 RL 需要成千上万次试验和 GPU 集群，才能修复一种失败模式。Reflexion（Shinn 等，NeurIPS 2023）用自然语言完成这件事：每次试验失败后，智能体写下一段反思，将它存进情景记忆，并让下一次试验以这段记忆为条件。这正是 Letta 的睡眠时计算、Claude Code 的 CLAUDE.md 学习记录和 pro-workflow 的 learn-rule 背后的模式。

**类型：** 构建
**语言：** Python（标准库）
**前置要求：** 第 14 阶段 · 第 01 节（智能体循环）、第 14 阶段 · 第 02 节（ReWOO）
**用时：** 约 60 分钟

## 学习目标

- 说出 Reflexion 的三个组件（Actor、Evaluator、Self-Reflector）以及情景记忆的作用。
- 用标准库实现带二值评估器、反思缓冲区和全新重试的 Reflexion 循环。
- 针对给定任务，在标量、启发式和自评反馈来源之间做选择。
- 解释为什么语言式强化能捕获那些基于梯度的 RL 需要成千上万次试验才能修复的错误。

## 问题所在

智能体执行任务失败了。在标准 RL 中，你会再运行成千上万次试验，计算梯度并更新权重。这既昂贵又缓慢，而大多数生产智能体都没有为每次失败准备训练预算。

Reflexion（Shinn 等，arXiv:2303.11366）提出了另一个问题：如果智能体只是想一想为什么失败，并在提示词中带着这个想法再试一次，会怎样？不更新权重，不计算梯度，只是在试验之间保存自然语言。

结果是：在 ALFWorld 上它击败 ReAct 和其他未微调基线；在 HotpotQA 上它优于 ReAct；在代码生成（HumanEval/MBPP）上，它在当时达到了 state of the art。整个过程没有执行一步梯度更新。

## 核心概念

### 三个组件

```
Actor         : 生成一条轨迹（ReAct 风格循环）
Evaluator     : 为轨迹打分——二值、启发式或自评
Self-Reflector: 针对失败写一段自然语言反思
```

再加一个数据结构：

```
Episodic memory: 之前反思的列表，添加到下一次试验的提示词开头
```

一次试验运行 Actor。Evaluator 对它评分。如果分数很低，Self-Reflector 会生成反思（“我选错了工具，因为我把问题误读成了询问 X，而它其实询问的是 Y”）。反思进入情景记忆。下一次试验从头开始，但能看到这段反思。

### 三类评估器

1. **标量（Scalar）**——外部二值信号。ALFWorld 成功或失败，HumanEval 测试通过或失败。最简单，信号最强。
2. **启发式（Heuristic）**——预先定义的失败特征。“如果智能体连续两次产生相同动作，就标记为卡住。”“如果轨迹超过 50 步，就标记为低效。”
3. **自评（Self-evaluated）**——LLM 为自己的轨迹评分。没有 ground truth 时必需，但信号更弱；适合与工具依据的验证结合（第 05 节——CRITIC）。

2026 年的默认做法是混合使用：有标量信号时使用标量，没有时使用自评，并把启发式作为安全护栏。

### 为什么可以泛化

Reflexion 与其说是一种新算法，不如说是一个有名字的模式。几乎每个生产环境中的“自愈”智能体都运行某种变体：

- Letta 的睡眠时计算（第 08 节）：独立智能体反思过去的对话，并写入记忆块。
- Claude Code 的 `CLAUDE.md` / “save memory” 模式：把反思捕获成学习记录，添加到未来会话的开头。
- pro-workflow 的 `/learn-rule` 命令：把纠正捕获成明确规则。
- LangGraph 的反思节点：给输出评分，并在需要时路由到 refine。

它们都来自同一个洞见：自然语言是足够丰富的媒介，可以在运行之间传递“我从失败中学到了什么”。

### 何时有效，何时无效

Reflexion 在以下情况有效：

- 有清晰的失败信号（测试失败、工具错误、答案错误）。
- 任务类别可复现（可以再次提出同一类型的问题）。
- 轨迹仍有改进空间（有足够的行动预算）。

Reflexion 在以下情况没有帮助：

- 智能体第一次就已经成功。
- 失败来自外部（网络中断、工具损坏）——反思“网络断了”不会帮助未来运行。
- 反思变成迷信——把一次偶发的 flaky 运行写成故事并保存下来。

2026 年的陷阱是记忆腐化。反思会不断累积，其中一些已经过时或错误；随着情景缓冲区变大，重跑会变慢。缓解方式包括定期压缩（第 06 节）、为反思设置 TTL，或使用独立的睡眠时清理智能体（Letta）。

```figure
react-trace
```

## 动手构建

`code/main.py` 在一个玩具谜题上实现 Reflexion：生成一个元素个数为 3 且总和等于目标值的列表。Actor 生成候选列表；Evaluator 检查总和；Self-Reflector 写下一行关于哪里出错的诊断。反思进入情景记忆，供下一次试验使用。

组件包括：

- `Actor`——看到反思后会改进的脚本化策略。
- `Evaluator.binary()`——检查目标总和是否匹配的通过/失败评估器。
- `SelfReflector`——生成一行失败诊断。
- `EpisodicMemory`——带 TTL 语义的有界列表。

运行：

```
python3 code/main.py
```

轨迹展示三次试验。第 1 次失败并保存反思，第 2 次看到反思后有所改进但仍失败，第 3 次成功。与基线运行（没有反思）比较：基线会卡在第 1 次的答案上。

## 实际使用

LangGraph 将反思作为节点模式提供。Claude Code 的 `/memory` 命令和 pro-workflow 的 `/learn-rule` 把情景缓冲区外化为 Markdown 文件。Letta 的睡眠时计算在空闲时运行 Self-Reflector，使主智能体受延迟约束的路径保持快速。OpenAI Agents SDK 不直接提供 Reflexion；你可以用一个按分数拒绝轨迹的自定义 Guardrail，以及一个跨运行存活的 memory `Session` 来构建它。

## 交付

`outputs/skill-reflexion-buffer.md` 会创建并维护一个情景缓冲区，支持捕获反思、TTL 和去重。给定任务类别和一次失败，它会生成真正能帮助下一次试验的反思（而不是泛泛的“要更加小心”）。

## 练习

1. 从二值评估器切换到返回距离指标（离目标有多远）的标量评估器。它会更快收敛吗？
2. 为反思增加 10 次试验的 TTL。超过这个点后，更早的反思会造成妨碍还是提供帮助？
3. 实现启发式评估器：如果同一个动作重复出现，就把试验标记为卡住。它与 Self-Reflector 如何交互？
4. 使用忽略反思的对抗性 Actor 运行 Reflexion。要让 Actor 注意到反思，最低限度的反思提示词工程是什么？
5. 阅读 Reflexion 论文关于 AlfWorld 的第 4 节。从概念上复现 130% 的成功率提升：相对于原始 ReAct，关键差异是什么？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Reflexion | “自我纠正” | Shinn 等人 2023 年提出的模式：Actor、Evaluator、Self-Reflector 加情景记忆 |
| Verbal reinforcement | “无需梯度的学习” | 添加到下一次试验提示词开头的自然语言反思 |
| Episodic memory | “按任务的反思” | 某一任务类别的既往反思有界缓冲区 |
| Scalar evaluator | “二值成功信号” | 来自 ground truth 的通过/失败或数值分数 |
| Heuristic evaluator | “基于模式的检测器” | 预先定义的失败特征（如卡住循环、步数过多） |
| Self-evaluator | “让 LLM 评判自己的轨迹” | 没有 ground truth 时信号较弱的后备方案——应与工具依据的验证结合 |
| Memory rot | “过时反思” | 情景缓冲区充满过时条目；用压缩/TTL 修复 |
| Sleep-time reflection | “异步自我反思” | 在热路径之外运行 Self-Reflector，让主智能体保持快速 |

## 延伸阅读

- [Shinn 等，Reflexion：使用语言式强化学习的语言智能体（arXiv:2303.11366）](https://arxiv.org/abs/2303.11366)——经典论文
- [Letta，Sleep-time Compute](https://www.letta.com/blog/sleep-time-compute)——生产环境中的异步反思
- [Anthropic，面向 AI 智能体的有效上下文工程](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)——将情景缓冲区作为上下文的一部分来管理
- [LangGraph 概览](https://docs.langchain.com/oss/python/langgraph/overview)——反思节点模式
