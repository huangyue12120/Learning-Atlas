---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/09-reinforcement-learning/10-multi-agent-rl/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 431299b046633654b4ca57b5dab3a4a916fa7ec866382caab0cfc4c18d193431
status: reviewed
---

# 多智能体强化学习

> 单智能体强化学习假设环境是平稳的。把两个正在学习的智能体放进同一个世界，这项假设就会失效：每个智能体都是另一个智能体环境的一部分，而且两者都在变化。多智能体强化学习提供了一组技巧，让 Markov 假设不再成立时的学习过程仍能收敛。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 9 第 04 课（Q-learning）、Phase 9 第 06 课（REINFORCE）、Phase 9 第 07 课（Actor-Critic）  
**预计时间：** 约 45 分钟

## 问题

机器人学习在房间中导航是单智能体强化学习问题。足球队不是，AlphaStar 面对 StarCraft 对手不是，由竞价智能体构成的市场不是，两辆汽车协商通过四向停车路口也不是。现实世界中许多多对多问题都不属于单智能体范畴。

在每种多智能体场景中，从任一智能体的视角看，其他智能体*就是*环境的一部分。随着它们学习并改变行为，环境变得非平稳。Markov 性质认为“下一状态只取决于当前状态和我的动作”，但这里的下一状态还取决于*其他*智能体选择的动作，而且它们的策略也是不断移动的目标，因此该性质不再成立。

这会破坏表格方法的收敛证明，因为 Q-learning 的保证假设环境平稳。朴素深度强化学习也会失效：智能体循环追逐彼此，始终无法收敛到稳定策略。你需要多智能体专用技术，包括集中式训练 / 分散式执行、反事实基线、联赛训练和自我对弈。

2026 年的应用包括机器人群体、交通路由、自动驾驶车队、市场模拟器、多智能体大语言模型系统（Phase 16），以及任何包含多个智能玩家的游戏。

## 概念

![四种 MARL 范式：独立学习、集中式 critic、自我对弈、联赛](../assets/marl.svg)

**形式化：Markov 博弈。** 它是 MDP 的推广：状态 `S`、联合动作 `a = (a_1, …, a_n)`、转移 `P(s' | s, a)` 和每个智能体的奖励 `R_i(s, a, s')`。每个智能体 `i` 都在自己的策略 `π_i` 下最大化自身回报。如果奖励相同，就是 **完全合作**；如果是零和，就是 **对抗**；如果两者混合，就是 **一般和**。

**核心挑战：**

- **非平稳性。** 从智能体 `i` 的视角看，`P(s' | s, a_i)` 取决于正在变化的 `π_{-i}`。
- **信用分配。** 使用共享奖励时，究竟是哪个智能体带来了奖励？
- **探索协调。** 智能体必须探索互补策略，不能重复探索同一个状态。
- **可扩展性。** 联合动作空间随 `n` 指数增长。
- **部分可观测性。** 每个智能体只能看到自己的观测，全局状态被隐藏。

**四种主流范式：**

**1. 独立 Q-learning / 独立 PPO（IQL、IPPO）。** 每个智能体学习自己的 Q 函数或策略，并把其他智能体视为环境的一部分。方法简单，有时有效，尤其当经验回放发挥平滑的智能体建模作用时。理论收敛保证不存在。实际中，它适合耦合松散的任务，不适合紧密耦合的任务。

**2. 集中式训练、分散式执行（CTDE）。** 这是最常见的现代范式。每个智能体都有自己的*策略* `π_i`，以局部观测 `o_i` 为条件，因此部署时可以按标准方式分散执行。在*训练*期间，集中式 critic `Q(s, a_1, …, a_n)` 以完整全局状态和联合动作为条件。例如：
- **MADDPG**（Lowe 等，2017）：每个智能体都使用集中式 critic 的 DDPG。
- **COMA**（Foerster 等，2017）：使用反事实基线，询问“如果我改为采取动作 `a'`，奖励会是多少？”，从而分离我的贡献。
- **MAPPO** / 使用共享 critic 的 **IPPO**（Yu 等，2022）：带集中式价值函数的 PPO。到 2026 年，它是合作式 MARL 的主流方法。
- **QMIX**（Rashid 等，2018）：价值分解，使用单调混合的 `Q_tot(s, a) = f(Q_1(s, a_1), …, Q_n(s, a_n))`。

**3. 自我对弈。** 同一个智能体的两个副本互相对弈。对手策略就是自己过去某个快照的策略。AlphaGo / AlphaZero / MuZero、OpenAI Five 都采用这种方法。它最适合零和游戏，训练信号具有对称性。

**4. 联赛训练。** 它把自我对弈扩展到一般和 / 对抗环境：保留由历史策略和当前策略组成的种群，从联赛中采样对手并针对它们训练。联赛还会加入 exploiters（专门击败当前最佳策略）与 main exploiters（专门击败 exploiters）。AlphaStar（StarCraft II）采用了这种方法。当游戏存在“石头—剪刀—布”式策略循环时，必须使用联赛训练。

**通信。** 允许智能体相互发送学习得到的消息 `m_i`。它适用于合作场景。Foerster 等（2016）证明，可以端到端训练可微的智能体间通信。今天基于大语言模型的多智能体系统（Phase 16）本质上使用自然语言通信。

```figure
f3-marl-orbit
```

## 动手构建

本课使用一个 6×6 GridWorld，其中有两个合作智能体。它们从相对的角落出发，必须到达同一个目标。共享奖励：只要任一智能体仍在移动，每步奖励为 `-1`；两者都到达时奖励为 `+10`。代码见 `code/main.py`。

### 第 1 步：多智能体环境

```python
class CoopGridWorld:
    def __init__(self):
        self.size = 6
        self.goal = (5, 5)

    def reset(self):
        return ((0, 0), (5, 0))  # two agents

    def step(self, state, actions):
        a1, a2 = state
        new1 = move(a1, actions[0])
        new2 = move(a2, actions[1])
        done = (new1 == self.goal) and (new2 == self.goal)
        reward = 10.0 if done else -1.0
        return (new1, new2), reward, done
```

*联合*动作空间为 `|A|² = 16`。全局状态由两个位置组成。

### 第 2 步：独立 Q-learning

每个智能体都运行自己的 Q 表，键为联合状态。每一步中，两者都通过 ε-greedy 选择动作，收集联合转移，再分别使用共享奖励更新自己的 Q。

```python
def independent_q(env, episodes, alpha, gamma, epsilon):
    Q1, Q2 = defaultdict(default_q), defaultdict(default_q)
    for _ in range(episodes):
        s = env.reset()
        while not done:
            a1 = epsilon_greedy(Q1, s, epsilon)
            a2 = epsilon_greedy(Q2, s, epsilon)
            s_next, r, done = env.step(s, (a1, a2))
            target1 = r + gamma * max(Q1[s_next].values())
            target2 = r + gamma * max(Q2[s_next].values())
            Q1[s][a1] += alpha * (target1 - Q1[s][a1])
            Q2[s][a2] += alpha * (target2 - Q2[s][a2])
            s = s_next
```

这个方法能解决本任务，因为奖励稠密且目标一致。在紧密耦合任务中，例如一个智能体必须*等待*另一个智能体时，它会失败。

### 第 3 步：使用价值分解更新的集中式 Q

使用一个针对联合动作的 Q 函数 `Q(s, a_1, a_2)`，并根据共享奖励更新。执行时通过边缘化实现分散策略：`π_i(s) = argmax_{a_i} max_{a_{-i}} Q(s, a_1, a_2)`。这种方法用指数增长的联合动作空间换取*正确*的全局视角。

### 第 4 步：简单自我对弈（对抗式双智能体）

同一个智能体承担两个角色。让智能体 A 与智能体 B 训练，每经过 `K` 个回合，把 A 的权重复制给 B。训练对称，进展一致。这是微型 AlphaZero 配方。

## 常见问题

- **非平稳回放。** 独立智能体的经验回放比单智能体更棘手，因为旧转移由现在已经过时的对手生成。可以重新标注，或根据新近程度加权。
- **信用分配不明确。** 长回合结束后只有共享奖励，无法确定哪个智能体做出了贡献。可以采用反事实基线（COMA），或为每个智能体塑造奖励。
- **策略漂移 / 追逐。** 每个智能体的最佳响应都会随着其他智能体更新而改变。可以使用集中式 critic、较低的学习率，或每次只冻结一个智能体。
- **通过协调进行奖励投机。** 智能体会找到设计者没有预料的协同漏洞，例如拍卖智能体收敛到零报价。应谨慎设计奖励并加入行为约束。
- **重复探索。** 两个智能体都探索相同的状态—动作对。可以为每个智能体加入熵奖励，或按角色设置条件。
- **联赛循环。** 纯自我对弈可能陷入优势循环。使用包含多样化对手的联赛训练。
- **样本爆炸。** `n` 个智能体 × 状态空间 × 联合动作。使用函数近似，以及分解动作空间（每个智能体使用一个策略输出头）进行近似。

## 使用方法

2026 年的 MARL 应用图谱如下：

| 领域 | 方法 | 说明 |
|------|------|------|
| 合作导航 / 操作 | MAPPO / QMIX | CTDE；共享 critic + 分散式 actor。 |
| 双人游戏（国际象棋、围棋、扑克） | 使用 MCTS 的自我对弈（AlphaZero） | 零和；对称训练。 |
| 复杂多人游戏（Dota、StarCraft） | 联赛训练 + 模仿预训练 | OpenAI Five、AlphaStar。 |
| 自动驾驶车队 | 使用注意力的 CTDE MAPPO / PPO | 部分观测；队伍规模可变。 |
| 拍卖市场 | 博弈论均衡 + 强化学习 | 当 `n` → ∞ 时使用平均场强化学习。 |
| 大语言模型多智能体系统（Phase 16） | 自然语言通信 + 角色条件化 | 强化学习循环位于智能体规划层。 |

到 2026 年，MARL 增长最快的应用来自大语言模型：语言模型智能体组成的群体会协商、辩论、构建软件。此时强化学习优化的是*轨迹级*输出的偏好，而不是词元级输出（Phase 16 第 03 课）。

## 交付成果

保存为 `outputs/skill-marl-architect.md`：

```markdown
---
name: marl-architect
description: 针对给定任务选择合适的多智能体强化学习范式（IPPO、CTDE、自我对弈、联赛）。
version: 1.0.0
phase: 9
lesson: 10
tags: [rl, multi-agent, marl, self-play]
---

给定一个包含 `n` 个智能体的任务，输出：

1. 范式分类。合作 / 对抗 / 一般和。说明理由。
2. 算法。IPPO / MAPPO / QMIX / 自我对弈 / 联赛。结合耦合紧密程度和奖励结构说明理由。
3. 信息访问。是否集中式训练？哪些全局信息进入 critic？是否分散式执行？
4. 信用分配。反事实基线、价值分解或奖励塑造。
5. 探索计划。每个智能体的熵、基于种群的训练或联赛。

紧密耦合的合作任务不得使用独立 Q-learning。存在循环风险的一般和任务不得推荐自我对弈。如果 MARL 流水线没有固定对手评估，将其标记出来，因为选择性报告自我对弈数字的情况很常见。
```

## 练习

1. **简单。** 在双智能体合作 GridWorld 上训练独立 Q-learning。平均回报经过多少个回合会大于 0？绘制联合学习曲线。
2. **中等。** 加入一个“协调”任务：只有两个智能体在同一回合踏上目标时，才算到达。独立 Q 还能收敛吗？哪里出了问题？
3. **困难。** 为 MAPPO 风格训练实现集中式 critic，并在协调任务上比较它与独立 PPO 的收敛速度。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Markov 博弈 | “多智能体 MDP” | `(S, A_1, …, A_n, P, R_1, …, R_n)`；每个智能体都有自己的奖励。 |
| CTDE | “集中式训练、分散式执行” | 训练时使用联合 critic；每个智能体的策略只使用局部观测。 |
| IPPO | “独立 PPO” | 每个智能体分别运行 PPO。简单且常被低估的基线。 |
| MAPPO | “多智能体 PPO” | 使用以全局状态为条件的集中式价值函数的 PPO。 |
| QMIX | “单调价值分解” | `Q_tot = f_monotone(Q_1, …, Q_n)`，允许分散执行 argmax。 |
| COMA | “反事实多智能体” | 优势 = 我的 Q 减去对我的动作做边缘化后得到的期望 Q。 |
| 自我对弈 | “智能体对过去的自己” | 单个智能体承担两个角色；零和游戏的标准方法。 |
| 联赛训练 | “种群训练” | 缓存历史策略，从策略池采样对手；用于处理策略循环。 |

## 延伸阅读

- [Lowe 等（2017），《Multi-Agent Actor-Critic for Mixed Cooperative-Competitive Environments (MADDPG)》](https://arxiv.org/abs/1706.02275)——使用集中式 critic 的 CTDE。
- [Foerster 等（2017），《Counterfactual Multi-Agent Policy Gradients (COMA)》](https://arxiv.org/abs/1705.08926)——用于信用分配的反事实基线。
- [Rashid 等（2018），《QMIX: Monotonic Value Function Factorisation》](https://arxiv.org/abs/1803.11485)——带单调性的价值分解。
- [Yu 等（2022），《The Surprising Effectiveness of PPO in Cooperative Multi-Agent Games (MAPPO)》](https://arxiv.org/abs/2103.01955)——PPO 在 MARL 上出人意料地强。
- [Vinyals 等（2019），《Grandmaster level in StarCraft II using multi-agent reinforcement learning (AlphaStar)》](https://www.nature.com/articles/s41586-019-1724-z)——大规模联赛训练。
- [Silver 等（2017），《Mastering the game of Go without human knowledge (AlphaGo Zero)》](https://www.nature.com/articles/nature24270)——零和游戏中的纯自我对弈。
- [Sutton 与 Barto（2018），第 15 章神经科学与第 17 章前沿](http://incompleteideas.net/book/RLbook2020.pdf)——包括教材对多智能体环境和非平稳性问题的简要介绍，CTDE 正是为解决这个问题而设计。
- [Zhang、Yang 与 Başar（2021），《Multi-Agent Reinforcement Learning: A Selective Overview》](https://arxiv.org/abs/1911.10635)——综述合作式、竞争式和混合式 MARL 及其收敛结果。
