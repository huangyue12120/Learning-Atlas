---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/09-reinforcement-learning/04-q-learning-sarsa/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 05b289d714aec7c06d0f1c9d5e048fb35dd020a71607f3c27c4983f3675563da
status: reviewed
---

# 时序差分——Q-learning 与 SARSA

> 蒙特卡洛会等到回合结束。TD 通过自举下一状态的价值估计，在每一步之后更新。Q-learning 是离策略且乐观的；SARSA 是同策略且谨慎的。两者都只需一行代码，也共同支撑着本阶段的所有深度强化学习方法。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 9 第 01 课（MDP）、Phase 9 第 02 课（动态规划）、Phase 9 第 03 课（蒙特卡洛）  
**预计时间：** 约 75 分钟

## 问题

蒙特卡洛确实有效，但它有两个代价高昂的要求：回合必须终止，而且只有拿到最终回报后才会更新。如果一个回合有 1,000 步，MC 就要等 1,000 步才能更新任何值。它方差高、偏差低，实际学习速度也很慢。

动态规划的特性恰好相反：自举备份的方差为零，但它要求模型已知。

时序差分（TD）学习在两者之间取了折中。只用一次转移 `(s, a, r, s')`，构造一步目标 `r + γ V(s')`，再把 `V(s)` 向该目标推进。不需要模型，也不需要完整回合。等式右侧使用近似的 `V` 会引入偏差，但方差远低于 MC，而且从第一步开始就能在线更新。

现代强化学习的全部方法，包括 DQN、A2C、PPO、SAC，都以此为支点。本阶段后续内容只是在你将在本课写出的一步 TD 更新之上叠加函数近似与各种技巧。

## 概念

![Q-learning 与 SARSA：离策略 max 与同策略 Q(s', a')](../assets/td.svg)

**V 的 TD(0) 更新：**

`V(s) ← V(s) + α [r + γ V(s') - V(s)]`

方括号中的量是 TD 误差 `δ = r + γ V(s') - V(s)`。它对应 MC 中 `G_t - V(s_t)` 的在线版本。收敛要求 `α` 满足 Robbins-Monro 条件（`Σ α = ∞`、`Σ α² < ∞`），而且所有状态都被无限次访问。

**Q-learning。** 一种用于控制的离策略 TD 方法：

`Q(s, a) ← Q(s, a) + α [r + γ max_{a'} Q(s', a') - Q(s, a)]`

`max` 假设从 `s'` 开始会遵循*贪心*策略，而不管智能体实际采取什么动作。这种解耦使 Q-learning 能在智能体通过 ε-greedy 探索时学习 `Q*`。Mnih 等（2015）把它转化为 Atari 上的深度 Q-learning（第 05 课）。

**SARSA。** 一种同策略 TD 方法：

`Q(s, a) ← Q(s, a) + α [r + γ Q(s', a') - Q(s, a)]`

它的名称来自元组 `(s, a, r, s', a')`。SARSA 使用智能体下一步*实际*采取的动作 `a'`，而不是贪心的 `argmax`。它会收敛到当前 ε-greedy 策略 `π` 的 `Q^π`；当 `ε → 0` 时，最终会得到 `Q*`。

**悬崖行走中的差异。** 在经典悬崖行走任务中（坠下悬崖的奖励为 -100），Q-learning 会沿悬崖边缘学出最优路径，但探索时偶尔会受到惩罚。SARSA 会学出一条与悬崖相隔一步的安全路径，因为它把探索噪声计入了 Q 值。随着训练进行，当 `ε → 0` 时两者都会达到最优。实际应用中，这项差异很重要：如果部署时仍会探索，SARSA 的行为更保守。

**Expected SARSA。** 用 `π` 下的期望值替换 `Q(s', a')`：

`Q(s, a) ← Q(s, a) + α [r + γ Σ_{a'} π(a'|s') Q(s', a') - Q(s, a)]`

它不需要对 `a'` 采样，所以方差低于 SARSA，使用的仍是同策略目标。现代教材通常把它作为默认方法。

**n 步 TD 与 TD(λ)。** 等待 `n` 步后再自举，便可在 TD(0) 与 MC 之间插值。`n=1` 是 TD，`n=∞` 是 MC。TD(λ) 以几何权重 `(1-λ)λ^{n-1}` 对所有 `n` 求平均。大多数深度强化学习方法使用 3 到 20 之间的 `n`。

```figure
qlearning-gridworld
```

## 动手构建

### 第 1 步：在 ε-greedy 策略上运行 SARSA

```python
def sarsa(env, episodes, alpha=0.1, gamma=0.99, epsilon=0.1):
    Q = defaultdict(lambda: {a: 0.0 for a in ACTIONS})

    def choose(s):
        if random() < epsilon:
            return choice(ACTIONS)
        return max(Q[s], key=Q[s].get)

    for _ in range(episodes):
        s = env.reset()
        a = choose(s)
        while True:
            s_next, r, done = env.step(s, a)
            a_next = choose(s_next) if not done else None
            target = r + (gamma * Q[s_next][a_next] if not done else 0.0)
            Q[s][a] += alpha * (target - Q[s][a])
            if done:
                break
            s, a = s_next, a_next
    return Q
```

只需八行。它与 Q-learning 的*唯一*区别就是目标值那一行。

### 第 2 步：Q-learning

```python
def q_learning(env, episodes, alpha=0.1, gamma=0.99, epsilon=0.1):
    Q = defaultdict(lambda: {a: 0.0 for a in ACTIONS})
    for _ in range(episodes):
        s = env.reset()
        while True:
            a = choose(s, Q, epsilon)
            s_next, r, done = env.step(s, a)
            target = r + (gamma * max(Q[s_next].values()) if not done else 0.0)
            Q[s][a] += alpha * (target - Q[s][a])
            if done:
                break
            s = s_next
    return Q
```

`max` 把目标与行为解耦。这个符号就是同策略与离策略的区别。

### 第 3 步：学习曲线

跟踪每 100 个回合的平均回报。在简单的确定性 GridWorld 上，Q-learning 收敛得更快；在悬崖行走任务中，SARSA 更保守。在 `code/main.py` 的 4×4 GridWorld 上使用 `α=0.1, ε=0.1`，两者经过约 2,000 个回合后都会接近最优。

### 第 4 步：与 DP 真值比较

运行价值迭代（第 02 课）得到 `Q*`。检查 `max_{s,a} |Q_learned(s,a) - Q*(s,a)|`。在 4×4 GridWorld 上训练 10,000 个回合后，一个表现正常的表格 TD 智能体应能把误差降到 `约 0.5` 以内。

## 常见问题

- **初始 Q 值很重要。** 在奖励为负的任务中使用乐观初始化（`Q = 0`）会鼓励探索。悲观初始化可能让贪心策略永远困住。
- **α 调度。** 常数 `α` 适合非平稳问题。衰减的 `α_n = 1/n` 在理论上可以保证收敛，但实际太慢；把 `α` 固定在 `[0.05, 0.3]`，并监控学习曲线。
- **ε 调度。** 从较高值（`ε=1.0`）开始，衰减到 `ε=0.05`。“GLIE”（无限探索、极限贪心）是收敛条件。
- **Q-learning 的最大化偏差。** 当 `Q` 含噪声时，`max` 算子存在向上偏差，导致高估。Hasselt 的 Double Q-learning（第 05 课的 DDQN 会使用）通过两张 Q 表修正这一问题。
- **不终止的回合。** TD 不依赖终止状态也能学习，但你要么限制步数，要么在达到上限时正确处理自举。标准做法是把步数上限视为非终止状态并继续自举。
- **状态哈希。** 如果状态是元组或张量，请使用可哈希键：用元组而不是列表；对浮点数取整后组成元组，不要直接使用原始浮点数。

## 使用方法

2026 年的 TD 方法适用范围如下：

| 任务 | 方法 | 原因 |
|------|------|------|
| 小型表格环境 | Q-learning | 直接学习最优策略。 |
| 同策略安全关键任务 | SARSA / Expected SARSA | 探索时较为保守。 |
| 高维状态 | DQN（Phase 9 第 05 课） | 使用经验回放与目标网络的神经网络 Q 函数。 |
| 连续动作 | SAC / TD3（Phase 9 第 07 课） | 在 Q 网络上执行 TD 更新；策略网络输出动作。 |
| 大语言模型强化学习（基于奖励模型） | PPO / GRPO（Phase 9 第 08、12 课） | 通过 GAE 使用 TD 风格优势的 Actor-Critic。 |
| 离线强化学习 | CQL / IQL（Phase 9 第 08 课） | 带保守正则化的 Q-learning。 |

你在 2026 年论文中读到的“强化学习”，九成都是 Q-learning 或 SARSA 的某种扩展。深入阅读之前，先把表格更新练到得心应手。

## 交付成果

保存为 `outputs/skill-td-agent.md`：

```markdown
---
name: td-agent
description: 在表格或小型特征强化学习任务中选择 Q-learning、SARSA 或 Expected SARSA。
version: 1.0.0
phase: 9
lesson: 4
tags: [rl, td-learning, q-learning, sarsa]
---

给定一个表格或小型特征环境，输出：

1. 算法。Q-learning / SARSA / Expected SARSA / n 步变体。结合同策略与离策略以及方差，用一句话说明理由。
2. 超参数。α、γ、ε 和衰减调度。
3. 初始化。Q_0 的取值（乐观或零）及理由。
4. 收敛诊断。目标学习曲线；如果可以运行 DP，则检查 `|Q - Q*|`。
5. 部署注意事项。探索在推理时会如何表现？是否需要 SARSA 的保守性？

拒绝把表格 TD 用于状态空间大于 10⁶ 的任务。没有说明最大化偏差时，拒绝交付 Q-learning 智能体。标记在整个训练期间把 ε 保持为 1.0（没有利用阶段）的智能体。
```

## 练习

1. **简单。** 在 4×4 GridWorld 上实现 Q-learning 与 SARSA。针对 2,000 个回合绘制学习曲线（每 100 个回合的平均回报）。谁收敛得更快？
2. **中等。** 构建悬崖行走环境（4×12，最后一行是悬崖，奖励为 -100，坠落后重置到起点）。比较 Q-learning 与 SARSA 的最终策略。截取各自路径。哪条路径更靠近悬崖？
3. **困难。** 实现 Double Q-learning。在带噪声奖励的 GridWorld 中（每步奖励叠加 σ=5 的高斯噪声），证明 Q-learning 会显著高估 `V*(0,0)`，而 Double Q-learning 不会。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| TD 误差 | “更新信号” | `δ = r + γ V(s') - V(s)`，即自举残差。 |
| TD(0) | “一步 TD” | 每次转移后只使用下一状态的估计值进行更新。 |
| Q-learning | “离策略强化学习入门” | 对下一状态的动作取 `max` 的 TD 更新；无论行为策略如何，都学习 `Q*`。 |
| SARSA | “同策略 Q-learning” | 使用下一步实际动作的 TD 更新；学习当前 ε-greedy 策略 π 的 `Q^π`。 |
| Expected SARSA | “低方差 SARSA” | 用 `π` 下的期望替换采样得到的 `a'`。 |
| GLIE | “正确的探索调度” | Greedy in the Limit with Infinite Exploration，即无限探索、极限贪心；Q-learning 收敛所需的条件。 |
| 自举 | “在目标中使用当前估计” | TD 与 MC 的区别。它会引入偏差，但能大幅降低方差。 |
| 最大化偏差 | “Q-learning 会高估” | 对含噪估计取 `max` 会产生向上偏差；Double Q-learning 可以修正。 |

## 延伸阅读

- [Watkins 与 Dayan（1992），《Q-learning》](https://link.springer.com/article/10.1007/BF00992698)——原始论文与收敛证明。
- [Sutton 与 Barto（2018），第 6 章——时序差分学习](http://incompleteideas.net/book/RLbook2020.pdf)——TD(0)、SARSA、Q-learning 与 Expected SARSA。
- [Hasselt（2010），《Double Q-learning》](https://papers.nips.cc/paper_files/paper/2010/hash/091d584fced301b442654dd8c23b3fc9-Abstract.html)——最大化偏差的修正方法。
- [Seijen、Hasselt、Whiteson 与 Wiering（2009），《A Theoretical and Empirical Analysis of Expected SARSA》](https://ieeexplore.ieee.org/document/4927542)——Expected SARSA 的提出动机。
- [Rummery 与 Niranjan（1994），《On-line Q-learning using connectionist systems》](https://www.researchgate.net/publication/2500611_On-Line_Q-Learning_Using_Connectionist_Systems)——提出 SARSA 这一名称的论文，当时称为“modified connectionist Q-learning”。
- [Sutton 与 Barto（2018），第 7 章——n 步自举](http://incompleteideas.net/book/RLbook2020.pdf)——把 TD(0) 推广到 TD(n)，形成了从 Q-learning 到资格迹，再到后来 PPO 中 GAE 的路径。
