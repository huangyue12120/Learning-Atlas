---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/09-reinforcement-learning/03-monte-carlo-methods/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 59ed85c22bceb45e65a953b3cc10cc54fec517a3ef5a35a901f69d433b947991
status: reviewed
---

# 蒙特卡洛方法——从完整回合中学习

> 动态规划需要模型。蒙特卡洛只需要回合。运行策略，观察回报，再取平均。这是强化学习中最简单的想法，也由此开启了后续全部方法。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 9 第 01 课（MDP）、Phase 9 第 02 课（动态规划）  
**预计时间：** 约 75 分钟

## 问题

动态规划很优雅，但它假设你可以为每个状态与动作查询 `P(s' | s, a)`。现实世界中几乎没有任务满足这个条件。机器人无法解析计算施加关节力矩后相机像素的分布。定价算法无法对每种潜在顾客反应做积分。大语言模型也无法枚举输出一个词元后的所有可能续写。

你需要一种只要求能够从环境*采样*的方法。运行策略，得到轨迹 `s_0, a_0, r_1, s_1, a_1, r_2, …, s_T`，再用它估计价值。这种方法称为蒙特卡洛方法。

从 DP 转向 MC，在思想上很重要：我们从*已知模型 + 精确备份*转向*采样展开 + 平均回报*。方差会猛增，适用范围也会大幅扩大。本课之后的每种强化学习算法，包括 TD、Q-learning、REINFORCE、PPO、GRPO，本质上都包含蒙特卡洛估计器，有时还会在其上叠加自举。

## 概念

![蒙特卡洛：展开、计算回报、求平均；首次访问与每次访问](../assets/monte-carlo.svg)

**核心思路可以写成一行：** `V^π(s) = E_π[G_t | s_t = s] ≈ (1/N) Σ_i G^{(i)}(s)`，其中 `G^{(i)}(s)` 是遵循策略 `π` 访问 `s` 后观察到的回报。

**首次访问 MC 与每次访问 MC。** 如果一个回合多次访问状态 `s`，首次访问 MC 只计算第一次访问后的回报；每次访问 MC 则计算全部访问。两者在极限下都无偏。首次访问更容易分析，因为样本独立同分布。每次访问从每个回合使用更多数据，实际收敛通常更快。

**增量均值。** 不保存全部回报，而是更新运行均值：

`V_n(s) = V_{n-1}(s) + (1/n) [G_n - V_{n-1}(s)]`

把它重写为 `V_new = V_old + α · (target - V_old)`，其中 `α = 1/n`。用常数步长 `α ∈ (0, 1)` 替换 `1/n`，就得到可以跟踪 `π` 变化的非平稳 MC 估计器。从 MC 走向 TD，再走向每种现代强化学习算法，关键就在这项改动。

**探索现在成了问题。** DP 通过枚举接触每个状态。MC 只能看见策略实际访问的状态。如果 `π` 是确定性的，整个状态空间中的一些区域永远不会被采样，其价值估计也会永远停留在零。历史上依次出现了三种解决方法：

1. **探索式起点。** 每个回合都从随机 `(s, a)` 对开始。这可以保证覆盖，但实际并不现实，因为你无法把机器人“重置”到任意状态。
2. **ε-greedy。** 相对于当前 Q 采取贪心动作，但以概率 `ε` 选择随机动作。所有状态—动作对最终都会被采样。
3. **离策略 MC。** 使用行为策略 `μ` 收集数据，通过重要性采样学习目标策略 `π`。方差很高，但它搭起了通往 DQN 等经验回放方法的桥梁。

**蒙特卡洛控制。** 与策略迭代相同，执行评估 → 改进 → 评估，只是用采样完成评估：

1. 运行 `π`，得到一个回合。
2. 根据观察到的回报更新 `Q(s, a)`。
3. 让 `π` 相对于 `Q` 采取 ε-greedy 动作。
4. 重复。

在温和条件下，每个状态—动作对被访问无限多次，且 `α` 满足 Robbins-Monro 条件时，该过程以概率 1 收敛到 `Q*` 和 `π*`。

```figure
epsilon-greedy
```

## 动手构建

### 第 1 步：展开轨迹 → `(s, a, r)` 列表

```python
def rollout(env, policy, max_steps=200):
    trajectory = []
    s = env.reset()
    for _ in range(max_steps):
        a = policy(s)
        s_next, r, done = env.step(s, a)
        trajectory.append((s, a, r))
        s = s_next
        if done:
            break
    return trajectory
```

不需要模型，只用 `env.reset()` 和 `env.step(s, a)`。它与 gym 环境接口相同，但去掉了多余内容。

### 第 2 步：计算回报（反向扫描）

```python
def returns_from(trajectory, gamma):
    returns = []
    G = 0.0
    for _, _, r in reversed(trajectory):
        G = r + gamma * G
        returns.append(G)
    return list(reversed(returns))
```

只需一次遍历，复杂度为 `O(T)`。使用反向递推 `G_t = r_{t+1} + γ G_{t+1}`，无需反复求和。

### 第 3 步：首次访问 MC 评估

```python
def mc_policy_evaluation(env, policy, episodes, gamma=0.99):
    V = defaultdict(float)
    counts = defaultdict(int)
    for _ in range(episodes):
        trajectory = rollout(env, policy)
        returns = returns_from(trajectory, gamma)
        seen = set()
        for t, ((s, _, _), G) in enumerate(zip(trajectory, returns)):
            if s in seen:
                continue
            seen.add(s)
            counts[s] += 1
            V[s] += (G - V[s]) / counts[s]
    return V
```

真正完成工作的只有三行：把状态标记为已首次访问，增加计数，更新运行均值。

### 第 4 步：ε-greedy MC 控制（同策略）

```python
def mc_control(env, episodes, gamma=0.99, epsilon=0.1):
    Q = defaultdict(lambda: {a: 0.0 for a in ACTIONS})
    counts = defaultdict(lambda: {a: 0 for a in ACTIONS})

    def policy(s):
        if random() < epsilon:
            return choice(ACTIONS)
        return max(Q[s], key=Q[s].get)

    for _ in range(episodes):
        trajectory = rollout(env, policy)
        returns = returns_from(trajectory, gamma)
        seen = set()
        for (s, a, _), G in zip(trajectory, returns):
            if (s, a) in seen:
                continue
            seen.add((s, a))
            counts[s][a] += 1
            Q[s][a] += (G - Q[s][a]) / counts[s][a]
    return Q, policy
```

### 第 5 步：与 DP 黄金标准比较

随着回合数趋于无穷，你用 MC 得到的 `V^π` 估计应与第 02 课的 DP 结果一致。实际中，在 4×4 GridWorld 上运行 50,000 个回合，可以把误差降到 DP 答案的 `约 0.1` 以内。

## 常见问题

- **无限回合。** MC 要求回合*终止*。如果策略可能永远循环，就设置 `max_steps` 上限，并把触及上限视为隐式失败。GridWorld 的随机策略经常超时，这很正常，只要正确计数即可。
- **方差。** MC 使用完整回报。在长回合中，方差很大；末尾一次不走运的奖励会同样幅度地改变 `V(s_0)`。TD 方法（第 04 课）通过自举降低方差。
- **状态覆盖。** 从全新 Q 开始执行贪心 MC，遇到平局时只会尝试一个动作。你*必须*探索，可以采用 ε-greedy、探索式起点或 UCB。
- **非平稳策略。** 如果 `π` 发生变化（MC 控制正是如此），旧回报来自另一个策略。常数 α MC 可以处理这种情况，样本平均 MC 不行。
- **离策略重要性采样。** 权重 `π(a|s)/μ(a|s)` 会沿轨迹相乘。方差随视野爆炸。可以采用逐决策加权 IS 限制方差，或切换到 TD。

## 使用方法

蒙特卡洛方法在 2026 年承担以下角色：

| 用例 | 使用 MC 的原因 |
|------|----------------|
| 短视野游戏（21 点、扑克） | 回合自然终止；回报清晰。 |
| 对日志策略进行离线评估 | 对已存储轨迹的折扣回报取平均。 |
| 蒙特卡洛树搜索（AlphaZero） | 从树叶开始的 MC 展开会引导选择。 |
| 大语言模型强化学习评估 | 计算给定策略的多个采样补全的平均奖励。 |
| PPO 中的基线估计 | 优势目标 `A_t = G_t - V(s_t)` 使用 MC `G_t`。 |
| 强化学习教学 | 能实际工作的最简单算法；去掉自举便可看清核心。 |

现代深度强化学习算法（PPO、SAC）使用 `n` 步回报或 GAE，在纯 MC（完整回报）与纯 TD（一步自举）之间插值。两个端点都属于同一估计器。

## 交付成果

保存为 `outputs/skill-mc-evaluator.md`：

```markdown
---
name: mc-evaluator
description: 通过蒙特卡洛展开评估策略；如果有 DP 对照，则生成包含对照的收敛报告。
version: 1.0.0
phase: 9
lesson: 3
tags: [rl, monte-carlo, evaluation]
---

给定一个环境（回合式，带 reset+step API）和一个策略，输出：

1. 方法。首次访问还是每次访问 MC，以及选择理由。
2. 回合预算。目标数量、方差诊断和预期标准误差。
3. 探索计划。ε 调度（如果需要）或探索式起点。
4. 黄金标准对照。如果是表格环境，使用 DP 最优 V*；否则使用 Q-learning / PPO 基线提供的界。
5. 终止检查。最大步数上限、超时和非终止轨迹处理方式。

如果非回合式任务没有有限视野上限，拒绝运行 MC。对于表格任务，如果每个状态不足 100 个回合样本，拒绝报告 V^π 估计。把动作方差为零的策略标记为探索风险。
```

## 练习

1. **简单。** 对 4×4 GridWorld 中的均匀随机策略实现首次访问 MC 评估。运行 10,000 个回合，绘制 `V(0,0)` 随回合数变化的曲线，并与 DP 答案对照。
2. **中等。** 使用 `ε ∈ {0.01, 0.1, 0.3}` 实现 ε-greedy MC 控制。比较训练 20,000 个回合后的平均回报。曲线是什么形状？偏差—方差取舍出现在哪里？
3. **困难。** 使用重要性采样实现*离策略* MC：通过均匀随机策略 `μ` 收集数据，估计确定性最优策略 `π` 的 `V^π`。比较普通 IS、逐决策 IS 与加权 IS。哪一种方差最低？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| 蒙特卡洛 | “随机采样” | 对来自分布的独立同分布样本取平均，以估计期望。 |
| 回报 `G_t` | “未来奖励” | 从步骤 `t` 到回合结束的折扣奖励和：`Σ_{k≥0} γ^k r_{t+k+1}`。 |
| 首次访问 MC | “每个状态只计一次” | 只有回合中的第一次访问会影响价值估计。 |
| 每次访问 MC | “使用所有访问” | 每次访问都会影响估计；略有偏差，但样本效率更高。 |
| ε-greedy | “探索噪声” | 以概率 `1-ε` 选择贪心动作；以概率 `ε` 选择随机动作。 |
| 重要性采样 | “修正从错误分布进行的采样” | 使用 `π(a\|s)/μ(a\|s)` 乘积重新加权回报，以根据 `μ` 数据估计 `V^π`。 |
| 同策略 | “从自己的数据中学习” | 目标策略 = 行为策略。普通 MC、PPO、SARSA。 |
| 离策略 | “从别人的数据中学习” | 目标策略 ≠ 行为策略。重要性采样 MC、Q-learning、DQN。 |

## 延伸阅读

- [Sutton 与 Barto（2018），第 5 章——蒙特卡洛方法](http://incompleteideas.net/book/RLbook2020.pdf)——权威讲解。
- [Singh 与 Sutton（1996），《Reinforcement Learning with Replacing Eligibility Traces》](https://link.springer.com/article/10.1007/BF00114726)——首次访问与每次访问分析。
- [Precup、Sutton、Singh（2000），《Eligibility Traces for Off-Policy Policy Evaluation》](http://incompleteideas.net/papers/PSS-00.pdf)——离策略 MC 与方差控制。
- [Mahmood 等（2014），《Weighted Importance Sampling for Off-Policy Learning》](https://arxiv.org/abs/1404.6362)——现代低方差 IS 估计器。
- [Tesauro（1995），《TD-Gammon, A Self-Teaching Backgammon Program》](https://dl.acm.org/doi/10.1145/203330.203343)——首次大规模实证展示 MC/TD 自我对弈如何收敛到超人水平，也是本阶段后半部分每一课的思想先驱。
