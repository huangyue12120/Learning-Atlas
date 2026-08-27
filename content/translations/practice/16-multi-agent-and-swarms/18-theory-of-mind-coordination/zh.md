---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/16-multi-agent-and-swarms/18-theory-of-mind-coordination/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: c532428bcba5a72f41f9872ea69b03b68ea454ce56ed9febc5489a9e33697e85
status: reviewed
---

# 心智理论与涌现协调

> Li 等人（arXiv:2310.10701）显示，合作文本游戏中的 LLM 智能体具有**涌现的高阶心智理论**（ToM）——推理一个智能体对第三个智能体信念的看法——但因上下文管理与幻觉，在长时程规划上失败。Riedl（arXiv:2510.05174）测量了群体中的高阶协同，发现**只有** ToM 提示条件才能产出身份关联的差异化和目标导向的互补性；低能力 LLM 只呈现虚假的涌现。协调涌现取决于提示词和模型，系统不会自动获得它。本课实现最小 ToM 感知智能体，在有无 ToM 提示的合作任务中运行，并按照 Riedl 2025 协议测量协调差异。

**类型：** 学习 + 构建
**语言：** Python（标准库）
**前置要求：** 第 16 阶段 · 07（心智社会与辩论），第 16 阶段 · 17（生成式智能体）
**用时：** 约 75 分钟

## 问题

多智能体协调常看起来像魔法：智能体分工、预判彼此、避免重复。通常这种“涌现”是提示词工程产物——有人告诉智能体“要协调”。移除提示词，协调也消失。

Riedl 2025 的发现更严格：在控制条件下，协调只会在智能体被提示要推理**其他智能体的心智**（ToM）时涌现。没有 ToM 提示，即使强模型也会显示无法经统计控制存活的协调模式。这对生产很重要：团队交付的“多智能体协调”功能可能依赖提示词且脆弱。

本课把 ToM 当作具体能力（推理关于信念的信念），构建最小 ToM 感知智能体，并测量真实协调与提示词包装的协调之间的差别。

## 概念

### ToM 是什么

发展心理学中，3 岁儿童认为任何人的内心世界都与自己相同；5 岁儿童理解他人有不同信念；7 岁儿童推理关于信念的信念（“她认为我以为球在杯子下面”）。这些分别是零阶、一阶和二阶 ToM。

对 LLM 智能体，ToM 阶数对应：

- **零阶：** 没有他人模型，智能体只按自身观察行动。
- **一阶：** 智能体拥有每个其他智能体的信念模型，“Alice 相信 X”。
- **二阶：** 智能体建模递归信念，“Alice 相信 Bob 相信 X”。

Li 等人 2023 发现，一阶与二阶 ToM 会在合作游戏的 LLM 智能体中涌现，但在长时程和不可靠通信下退化。

### Sally-Anne 测试简介

1985 年的错误信念测试：Sally 将弹珠放进篮子 A 后离开，Anne 将它移至篮子 B。Sally 回来时会去哪里找？有一阶 ToM 的儿童回答篮子 A（Sally 的信念与现实不同）；没有 ToM 的儿童回答篮子 B。

GPT-4 时代的 LLM 在直白提出时能通过 Sally-Anne 类测试，但在叙事很长、场景多次改变或问题间接措辞时会失败。这反映了 2026 年生产 LLM 的实际 ToM 状态。

### Riedl 的协调测量

Riedl（arXiv:2510.05174）构建了群体规模测试：N 个智能体，一个合作目标，可变提示条件。测量：

1. **身份关联的差异化。** 智能体是否随时间形成稳定角色区分？
2. **目标导向的互补性。** 智能体行动是否互补（不同子任务），而不是重复？
3. **高阶协同。** 群体是否做到任何子集都做不到的事情的统计量。

结果是：只有 ToM 提示条件下，全部三项指标才产生高于基线的信号。没有 ToM 提示时，中等能力模型的指标接近随机；大模型无需显式 ToM 提示也显示一些协调，但效果小于显式提示。

### 协调幻觉

若没有统计控制，演示中的“涌现协调”往往反映：

- 将协调烘焙进系统提示词的提示词工程（“一起工作”）。
- 观察者偏差（我们看到预期的模式）。
- 对成功运行的事后筛选。

对外宣传“涌现协调”却没有可测信号的生产系统，应视为营销。先测量，再宣称。

### 最小 ToM 感知智能体

结构：

```
agent state:
  own_beliefs:    {facts the agent believes}
  other_models:   {other_agent_id -> {beliefs_the_agent_attributes_to_them}}
  actions_last_N: [history of others' actions]

observation update:
  - update own_beliefs from direct observation
  - update other_models[agent_id] from their action + prior beliefs

action selection:
  - enumerate candidate actions
  - for each, predict what each other agent will do next given their modeled beliefs
  - pick action that maximizes joint outcome under those predictions
```

`other_models` 属性是 ToM 状态。一阶 ToM 只保留一层；二阶增加 `other_models[i][other_models_of_j]`——即我认为智能体 i 以为智能体 j 相信什么。

### 为什么长时程有害

Li 等人记录：上下文限制使智能体忘记哪个信念属于谁；幻觉会向其他智能体模型加入错误信念。两者产生随时间复合的“我以为他以为 X”错误。

论文及 2024–2026 后续工作记录的缓解：

- **提示词中的显式 ToM 状态。** 结构化格式：`{agent_id: belief_list}`，迫使检索保留身份—信念绑定。
- **更短推理链。** 每轮更少 ToM 更新，减少复合幻觉。
- **外部 ToM 存储。** 将模型保留在 LLM 上下文之外，每轮只注入相关部分。

### ToM 在生产中何处失败

- **对抗环境。** 具有良好 ToM 的智能体更容易被操纵（可建模它们如何建模你，再加以利用）。
- **异构团队。** 模型不同时，对一个对手有效的 ToM 模型不能泛化。
- **依赖真实事实的任务。** ToM 处理信念；若正确性取决于事实，ToM 可能分散注意。

### 可真正测量的协调

团队协调真实而非提示词包装的三项实用信号：

1. **随时间的互补性。** 在多轮任务中，智能体行动是否覆盖不相交子任务？
2. **预判。** 智能体 A 在 T+1 时的行动，是否依赖对 B 在 T+2 行动的预测，且预测后来正确？
3. **纠正。** A 在 T 时误读 B 信念后，A 是否在 T+2 前修正？

它们都可在记录的多智能体系统中测量，是“协调”叙事的实质版本。

```figure
sw-theory-of-mind
```

## 动手构建

`code/main.py` 实现：

- `ToMAgent`——追踪自身信念与针对每个其他智能体的信念模型。
- 一项合作任务：三个智能体必须从三个盒子各收集一个 token；每个盒子只能容纳一个 token。智能体不能通信；它们从彼此动作推断意图。
- 两种配置：`zeroth_order`（无 ToM）和 `first_order`（带一层信念模型的 ToM）。
- 200 次随机试验的测量：完成率、重复率（两个智能体瞄准同一盒子）、平均完成轮数。

运行：

```
python3 code/main.py
```

预期输出：零阶智能体以约 35% 的比例重复工作，并在 10 轮内完成约 60% 的试验；一阶 ToM 智能体重复率约 5%、完成约 95%。差异就是可测的协调效应。

## 实际使用

`outputs/skill-tom-auditor.md` 是审计多智能体系统“涌现协调”声明的技能，检查提示词包装、相对控制组的统计显著性和已测量互补性。

## 交付物

协调声明检查表：

- **控制条件。** 提供没有协调提示词的系统版本，测量两者。
- **统计检验。** 在你的指标上，系统与控制的差异是否在 `p < 0.05` 时显著？
- **互补性度量。** 随时间的行动不相交性，而不只是最终成功。
- **失败案例日志。** 智能体失调时，ToM 状态是什么样？
- **模型能力披露。** 若效果在较小模型上消失，应明确说明。

## 练习

1. 运行 `code/main.py`。确认一阶 ToM 将重复率降低约 7 倍。扩展到 5 个智能体和 5 个盒子时差距还存在吗？
2. 实现二阶 ToM（智能体 A 建模 B 对 C 的看法）。它比一阶有改进吗？在哪类任务上？
3. 向 ToM 状态注入**幻觉**：每轮随机翻转一个信念。这会在多大程度上降低一阶表现？
4. 阅读 Li 等人（arXiv:2310.10701）。复现“长时程退化”：轮数从 10 增至 30 时，一阶 ToM 性能如何变化？
5. 阅读 Riedl 2025（arXiv:2510.05174）。在模拟日志上实现高阶协同统计量。没有 ToM 提示条件时该效应是否存在？

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|---|---|---|
| 心智理论 | “理解他人心智” | 建模另一智能体信念的能力，按阶数（0、1、2+）分级。 |
| Sally-Anne 测试 | “错误信念测试” | 1985 年发展心理学测试；LLM 通过直白版本，在复杂版本失败。 |
| 一阶 ToM | “A 相信 X” | 建模另一个智能体关于事实的信念。 |
| 二阶 ToM | “A 相信 B 相信 X” | 更深一层的递归建模。 |
| 身份关联的差异化 | “随时间稳定的角色” | Riedl 的指标：角色保持稳定，而非随机。 |
| 目标导向的互补性 | “不相交行动” | 智能体瞄准不同子任务，而不是同一个。 |
| 高阶协同 | “群体超过任意子集” | Riedl 测量真实协调的统计量。 |
| 协调幻觉 | “看起来协调” | 没有可测信号、被提示词包装出的协调外观。 |

## 延伸阅读

- [Li et al. — Theory of Mind for Multi-Agent Collaboration via Large Language Models](https://arxiv.org/abs/2310.10701) — 合作游戏中的涌现 ToM 与长时程失效
- [Riedl — Emergent Coordination in Multi-Agent Language Models](https://arxiv.org/abs/2510.05174) — 群体规模测量；ToM 提示是承重条件
- [Premack & Woodruff — Does the chimpanzee have a theory of mind?](https://www.cambridge.org/core/journals/behavioral-and-brain-sciences/article/does-the-chimpanzee-have-a-theory-of-mind/1E96B02CD9850E69AF20F81FA7EB3595) — ToM 概念的 1978 年起源
- [Baron-Cohen, Leslie, Frith — Does the autistic child have a theory of mind?](https://doi.org/10.1016/0010-0277(85)90022-8) — Sally-Anne 论文（1985）
