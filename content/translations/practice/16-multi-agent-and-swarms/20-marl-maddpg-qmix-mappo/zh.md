---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/16-multi-agent-and-swarms/20-marl-maddpg-qmix-mappo/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: 77aa03c7a2d275a2459e0bf2153ec6059b438f6fa97e68d208716531ea0e9caf
status: reviewed
---

# MARL——MADDPG、QMIX、MAPPO

> 多智能体协调的强化学习遗产在 2026 年仍持续影响 LLM 智能体系统。**MADDPG**（Lowe 等，NeurIPS 2017，arXiv:1706.02275）提出集中训练、分散执行（CTDE）：训练时每个评论家都看到所有智能体的状态和动作，测试时只运行局部行动者；它适用于合作、竞争和混合环境。**QMIX**（Rashid 等，ICML 2018，arXiv:1803.11485）通过单调混合网络做价值分解，将每个智能体的 Q 值合成为联合 Q 值，因此 `argmax` 可以干净地分发，在 StarCraft Multi-Agent Challenge（SMAC）中占据主导。**MAPPO**（Yu 等，NeurIPS 2022，arXiv:2103.01955）是使用集中式价值函数的 PPO；它只需极少调参，就在粒子世界、SMAC、Google Research Football 和 Hanabi 上表现“出人意料地有效”。这些方法为必须分散行动的智能体团队训练策略奠定基础。MAPPO 是**2026 年合作式 MARL 的默认基线**。本课将在微型网格世界中构建它们的核心模式，在开始 LLM 智能体训练前将三个思想化为直觉。

**类型：** 学习
**语言：** Python（标准库，小型无 NumPy 实现）
**前置要求：** 第 09 阶段（强化学习），第 16 阶段 · 09（并行群体网络）
**用时：** 约 90 分钟

## 问题

LLM 智能体系统越来越多地训练智能体间协调策略：何时延后、何时行动、该调用哪个同伴。说明如何训练此类策略的文献是多智能体强化学习（MARL），它早于 LLM 浪潮，并有一小组占主导地位的算法。

如果没有模式词汇，阅读 MARL 论文会很痛苦。集中训练、分散执行（CTDE）、价值分解和集中式评论家分别回答具体问题：

- 独立 RL（每个智能体各自学习）从每个智能体视角看是非平稳的，效果差。
- 集中式 RL（一个智能体控制全部）无法扩展，并且违反执行约束。
- CTDE 兼得两者优点：用全局信息训练，用局部策略部署。

## 概念

### 论文使用的三种环境

- **粒子世界（多智能体粒子环境）。** 具有合作/竞争任务的简单二维物理环境，是 MADDPG 的原始测试平台。
- **StarCraft Multi-Agent Challenge（SMAC）。** 合作型微操、部分可观测，是 QMIX 的测试平台；动作离散、状态连续。
- **Google Research Football、Hanabi、MPE。** MAPPO 的基准环境。

不同环境有不同的动作/观测类型，算法也据此选择。

### MADDPG（2017）——CTDE 模式

每个智能体 `i` 都有将自身观测映射为动作的行动者 `mu_i(o_i)`。每个智能体还拥有评论家 `Q_i(x, a_1, ..., a_n)`，它在训练时看到所有观测与所有动作。行动者根据评论家的评估，通过策略梯度更新。

```text
actor update:    grad_theta_i J = E[grad_theta mu_i(o_i) * grad_a_i Q_i(x, a_1..n) at a_i=mu_i(o_i)]
critic update:   TD on Q_i(x, a_1..n) given next-state joint estimate
```

为什么使用 CTDE：训练时我们知道所有人的动作，便可用它降低每个评论家的方差；部署时每个智能体只看到 `o_i`，并调用 `mu_i(o_i)`。

失效模式：评论家的输入包含 N 个智能体的所有动作，因此规模会随 N 增长；如果没有近似，无法扩展到约 10 个智能体以上。

### QMIX（2018）——价值分解

只适用于合作场景。全局奖励是逐智能体 Q 值的某个单调函数：

```text
Q_tot(tau, a) = f(Q_1(tau_1, a_1), ..., Q_n(tau_n, a_n)),   df/dQ_i >= 0
```

单调性保证可以让每个智能体独立选择 `argmax_{a_i} Q_i` 来计算 `argmax_a Q_tot`。这正是你所需的**分散执行性质**。训练时，混合网络会从逐智能体 Q 值产生 `Q_tot`。

QMIX 为何在 SMAC 获胜：合作型 StarCraft 微操具有同质智能体、局部观测和全局奖励，正好匹配价值分解。

失效模式：单调性约束过强；有些任务的奖励结构无法被单调分解，例如某个智能体为团队牺牲。扩展方法（QTRAN、QPLEX）放宽了此限制。

### MAPPO（2022）——被低估的默认方案 <!-- learning-atlas: mappo-2022-the-overlooked-default -->

多智能体 PPO：采用集中式价值函数的 PPO。每个智能体都有自己的策略；所有智能体共享（或各自拥有）能够看到完整状态的价值函数。Yu 等人在 2022 年将 MAPPO 与 MADDPG、QMIX 及其扩展方法在五个基准上比较，发现：

- MAPPO 在粒子世界、SMAC、Google Research Football、Hanabi、MPE 上达到或超过离策略 MARL 方法。
- 所需超参数调优极少。
- 训练稳定，且跨随机种子可复现。

在这篇论文之前，社区低估了在线 MARL。到 2026 年，MAPPO 是合作式 MARL 的默认基线；任何新方法都必须超过它。

### LLM 智能体工程师为何应当关心

三种直接用途：

1. **路由器训练。** 元智能体选择由哪个子智能体处理任务，这是包含 N 个分散子智能体和一个集中路由器的 MARL 问题，MAPPO 很适合。
2. **角色涌现。** 在生成式智能体模拟中，训练智能体随时间采取互补角色，本质上是 MARL；QMIX 风格价值分解会通过构造强制互补性。
3. **多智能体工具使用。** 当智能体共享工具并竞争预算时，用 CTDE 训练可得到遵守资源约束的可部署局部策略。

实际提醒：到 2026 年，大多数生产 LLM 智能体系统仍用提示词而不是训练策略。只有当你具备（a）大量交互数据、（b）明确奖励信号、（c）投入训练基础设施的意愿时，才应采用 MARL。

### 超越 RL 的 CTDE 设计模式

即使不训练，CTDE 也是有用的架构模式：

- 在*设计*时，假定可以看到完整团队信息。
- 在*运行时*，强制分散执行：每个智能体只能看到 `o_i`。

该模式迫使你明确维护逐智能体状态，并从一开始思考部分可观测性。许多生产多智能体系统悄然假定到处共享状态；CTDE 纪律能防止这种假设。

### 非平稳性问题

多个智能体同时学习时，每个智能体的环境（其中包括其他智能体的策略）都是非平稳的，经典单智能体 RL 证明不再成立。本课所有 MARL 算法都在解决它：

- MADDPG：全局评论家看到所有动作，因此其价值估计是平稳的。
- QMIX：价值分解将学习移到最优性定义明确的联合 Q 空间。
- MAPPO：集中式价值函数抑制其他策略变化带来的方差。

在 LLM 智能体系统中，非平稳性表现为：“我的智能体上个月能工作，现在上游另一个智能体改了，它就行为异常。”用 CTDE 训练 MARL 是有原则的修复方式；提示词级修复更快，但持久性较差。

### 本课不涵盖的内容

训练真实网络属于第 09 阶段主题。本课构建脚本化策略版本，在没有梯度更新的情况下演示 CTDE、价值分解和集中价值模式。目标是在你拿起完整 MARL 库（PyMARL、MARLlib、RLlib multi-agent）前内化这些模式。

```figure
sw-ctde
```

## 构建

`code/main.py` 在一个微型双智能体合作网格世界中实现三种模式演示：

- 环境：4×4 网格上的 2 个智能体和 1 个奖励 pellet。任一智能体到达 pellet 即奖励为 1，任务结束。
- `IndependentAgents`——每个智能体将其他智能体当作环境，作为基线。
- `MADDPGStyle`——集中式评论家计算联合价值；行动者策略据此更新，采用脚本化策略改进。
- `QMIXStyle`——使用单调混合器的价值分解。
- `MAPPOStyle`——集中式价值函数；策略针对共享基线更新。

四者运行相同回合，并报告到达目标的平均步数。CTDE 变体会比独立基线收敛到更短的路径。

运行：

```text
python3 code/main.py
```

预期输出：独立智能体平均需要约 6 步；CTDE 变体会朝约 3.5 步收敛（4×4 网格的最优值为 3）。即使策略是脚本化的，模式差异也会出现。

## 使用

`outputs/skill-marl-picker.md` 是一个根据多智能体任务选择 MARL 算法的技能：合作还是竞争、同质还是异质、动作空间类型、规模和奖励信号。

## 交付

生产中使用 MARL 很少；当你确实使用时：

- **从 MAPPO 开始。** 2022 年论文将其确立为基线，先复现它能避免花数周追逐更花哨的方法。
- **记录每个智能体的观测与动作流。** 没有逐智能体轨迹，MARL 调试毫无希望。
- **分开训练代码和执行代码。** CTDE 是一种纪律；让执行路径真的只能看到 `o_i`。
- **奖励塑形警告。** MARL 对奖励设计极其敏感，塑形中的一个协调缺陷就会让智能体学会利用它；应运行对抗性测试。
- **对于 LLM 智能体，** 先考虑提示词级策略。仅当交互数据、奖励信号和基础设施都具备时，才投资 MARL 训练。

## 练习

1. 运行 `code/main.py`。测量独立智能体和 MAPPO 风格智能体之间的到目标步数差距。在 6×6 网格上，差距会变大还是变小？
2. 实现竞争变体：两个智能体、一个 pellet，只有先到者获得奖励。哪种模式能干净处理竞争？历史上是 MADDPG。
3. 阅读 MADDPG（arXiv:1706.02275）第 3 节，用自己的话以伪代码形式符号化地实现精确的评论家更新规则。
4. 阅读 MAPPO（arXiv:2103.01955）。作者为何认为集中价值 + PPO 在其基准上优于离策略 MARL？列出最强的三项主张。
5. 将 CTDE 作为设计模式应用到一个假设的 LLM 智能体系统（如研究智能体 + 摘要器 + 编码器）。设计时有哪些联合信息在运行时不可获得？

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|------|----------|----------|
| MARL | “多智能体 RL” | 面向多智能体系统的强化学习。 |
| CTDE | “集中训练、分散执行” | 用全局信息训练，用局部策略部署。 |
| MADDPG | “多智能体 DDPG” | 每个智能体都有能看到全部观测和动作的评论家的 CTDE。 |
| QMIX | “价值分解” | 对逐智能体 Q 值做单调混合，只适用于合作。 |
| MAPPO | “多智能体 PPO” | 使用集中式价值函数的 PPO；2026 年默认基线。 |
| 价值分解 | “逐智能体 Q 值的和” | 将联合 Q 表示为逐智能体 Q 值的单调函数。 |
| 非平稳性 | “移动目标” | 随其他智能体学习，每个智能体的环境也改变；是 MARL 的核心问题。 |
| 在线 / 离策略 | “从当前 / 回放数据学习” | PPO 是在线策略（MAPPO）；DDPG 和 Q-learning 是离策略。 |
| SMAC | “StarCraft Multi-Agent Challenge” | 合作微操基准，是 QMIX 的主场。 |

## 延伸阅读

- [Lowe et al. — Multi-Agent Actor-Critic for Mixed Cooperative-Competitive Environments](https://arxiv.org/abs/1706.02275) —— MADDPG；NeurIPS 2017
- [Rashid et al. — QMIX: Monotonic Value Function Factorisation for Deep Multi-Agent Reinforcement Learning](https://arxiv.org/abs/1803.11485) —— QMIX；ICML 2018
- [Yu et al. — The Surprising Effectiveness of PPO in Cooperative Multi-Agent Games](https://arxiv.org/abs/2103.01955) —— MAPPO；NeurIPS 2022
- [BAIR blog post on MAPPO](https://bair.berkeley.edu/blog/2021/07/14/mappo/) —— 对 MAPPO 结果易于理解的介绍
- [SMAC repository](https://github.com/oxwhirl/smac) —— StarCraft Multi-Agent Challenge
