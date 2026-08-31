---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/09-reinforcement-learning/02-dynamic-programming/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 131aab723d6114b139761208cdc5fb9ae0363262c57d31e66903650a2fbd81a5
status: reviewed
---

# 动态规划——策略迭代与价值迭代

> 动态规划是可以“作弊”的强化学习。你已经知道转移函数与奖励函数，只需迭代 Bellman 方程，直到 `V` 或 `π` 不再变化。所有基于采样的方法都以它作为追赶的基准。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 9 第 01 课（MDP）  
**预计时间：** 约 75 分钟

## 问题

你有一个模型已知的 MDP，可以针对任意状态—动作对查询 `P(s' | s, a)` 和 `R(s, a, s')`。库存管理者知道需求分布。棋盘游戏具有确定性转移。GridWorld 只需四行 Python。你拥有一个*模型*。

无模型强化学习（Q-learning、PPO、REINFORCE）是为没有模型、只能从环境采样的情况而发明的。拥有模型时，可以使用更快、更好的动态规划方法。Bellman 在 1957 年设计了这些方法。它们至今仍在定义正确性：人们说“这个 MDP 的最优策略”时，指的就是 DP 会返回的策略。

到 2026 年，你仍需要动态规划，原因有三点。第一，强化学习研究中的每个表格型环境（GridWorld、FrozenLake、CliffWalking）都用 DP 求解，以产生黄金标准策略。第二，精确价值可以*调试*采样方法：如果 Q-learning 对 `V*(s_0)` 的估计与 DP 答案相差 30%，说明 Q-learning 实现有缺陷。第三，现代离线强化学习与规划方法（MCTS、AlphaZero 搜索、Phase 9 第 10 课的基于模型强化学习）都会在学习或给定模型上迭代 Bellman 备份。

## 概念 <!-- learning-atlas: the-concept -->

![并排展示的策略迭代与价值迭代](../assets/dp.svg)

**两种算法都对 Bellman 方程执行不动点迭代。**

**策略迭代。** 交替执行两个步骤，直到策略停止变化。

1. *评估：* 给定策略 `π`，反复应用 `V(s) ← Σ_a π(a|s) Σ_{s',r} P(s',r|s,a) [r + γ V(s')]`，直到收敛，从而计算 `V^π`。
2. *改进：* 给定 `V^π`，让 `π` 相对于 `V^π` 采取贪心动作：`π(s) ← argmax_a Σ_{s',r} P(s',r|s,a) [r + γ V(s')]`。

收敛可以保证，因为（a）每次改进要么保持 `π` 不变，要么严格提高某个状态的 `V^π`；（b）确定性策略空间是有限的。即使状态空间很大，通常也只需约 5～20 次外层迭代即可收敛。

**价值迭代。** 把评估与改进折叠进一次扫描。应用 Bellman *最优性*方程：

`V(s) ← max_a Σ_{s',r} P(s',r|s,a) [r + γ V(s')]`

反复执行，直到 `max_s |V_{new}(s) - V(s)| < ε`。最后选择贪心动作，提取策略。每次迭代严格来说更快，因为没有内部评估循环；但通常需要更多迭代才能收敛。

**广义策略迭代（GPI）。** 这是统一框架。价值函数与策略锁定在一个双向改进循环中；任何把二者推向相互一致的方法（异步价值迭代、修改策略迭代、Q-learning、actor-critic、PPO）都属于 GPI。

**`γ < 1` 为何重要。** Bellman 算子是上确界范数下的 `γ` 压缩映射：`||T V - T V'||_∞ ≤ γ ||V - V'||_∞`。压缩性质意味着不动点唯一且几何收敛。放弃 `γ < 1`，就会失去这项保证，此时必须使用有限视野或吸收终止状态。

```figure
value-iteration-gamma
```

## 动手构建

### 第 1 步：构建 GridWorld MDP 模型

使用第 01 课中的 4×4 GridWorld。我们再添加随机变体：智能体以 `0.1` 的概率滑向随机垂直方向。

```python
SLIP = 0.1

def transitions(state, action):
    if state == TERMINAL:
        return [(state, 0.0, 1.0)]
    outcomes = []
    for direction, prob in action_probs(action):
        outcomes.append((apply_move(state, direction), -1.0, prob))
    return outcomes
```

`transitions(s, a)` 返回 `(s', r, p)` 列表，这份列表定义了整个模型。

### 第 2 步：策略评估

给定策略 `π(s) = {动作: 概率}`，迭代 Bellman 方程，直到 `V` 停止变化：

```python
def policy_evaluation(policy, gamma=0.99, tol=1e-6):
    V = {s: 0.0 for s in states()}
    while True:
        delta = 0.0
        for s in states():
            v = sum(pi_a * sum(p * (r + gamma * V[s_prime])
                              for s_prime, r, p in transitions(s, a))
                   for a, pi_a in policy(s).items())
            delta = max(delta, abs(v - V[s]))
            V[s] = v
        if delta < tol:
            return V
```

### 第 3 步：策略改进

用相对于 `V` 的贪心策略替换 `π`。如果 `π` 没有变化，就返回，因为我们已经达到最优解。

```python
def policy_improvement(V, gamma=0.99):
    new_policy = {}
    for s in states():
        best_a = max(
            ACTIONS,
            key=lambda a: sum(p * (r + gamma * V[s_prime])
                              for s_prime, r, p in transitions(s, a)),
        )
        new_policy[s] = best_a
    return new_policy
```

### 第 4 步：把两者连接起来

```python
def policy_iteration(gamma=0.99):
    policy = {s: "up" for s in states()}   # 任意起点
    for _ in range(100):
        V = policy_evaluation(lambda s: {policy[s]: 1.0}, gamma)
        new_policy = policy_improvement(V, gamma)
        if new_policy == policy:
            return V, policy
        policy = new_policy
```

在 4×4 网格上，通常经过 4～6 次外层迭代即可收敛。输出 `V*(0,0) ≈ -6`，策略会严格缩短步数。

### 第 5 步：价值迭代（单循环版本）

```python
def value_iteration(gamma=0.99, tol=1e-6):
    V = {s: 0.0 for s in states()}
    while True:
        delta = 0.0
        for s in states():
            v = max(sum(p * (r + gamma * V[s_prime])
                       for s_prime, r, p in transitions(s, a))
                   for a in ACTIONS)
            delta = max(delta, abs(v - V[s]))
            V[s] = v
        if delta < tol:
            break
    policy = policy_improvement(V, gamma)
    return V, policy
```

它得到相同的不动点，但代码更少。

## 常见问题

- **忘记处理终止状态。** 如果对吸收状态应用 Bellman 备份，算法仍会选择一个什么也不改变的“最佳动作”。应使用 `if s == terminal: V[s] = 0` 保护。
- **上确界范数与 L2 收敛。** 使用 `max |V_new - V|`，不能使用平均值。理论保证建立在上确界范数上。
- **原地更新与同步更新。** 原地更新 `V[s]`（Gauss-Seidel）比使用单独的 `V_new` 字典（Jacobi）收敛得更快。生产代码采用原地更新。
- **策略平局。** 如果两个动作的 Q 值相同，`argmax` 可能在不同迭代中采用不同的平局处理方式，导致“策略稳定”检查振荡。应采用稳定规则，例如固定顺序中的第一个动作。
- **状态空间爆炸。** DP 每次扫描的复杂度为 `O(|S| · |A|)`。它最多可以处理约 10⁷ 个状态；超过该规模就需要函数近似（Phase 9 第 05 课起）。

## 使用方法

2026 年，DP 是正确性基线，也是规划器的内部循环：

| 用例 | 方法 |
|------|------|
| 精确求解小型表格 MDP | 价值迭代（更简单）或策略迭代（外层步骤更少） |
| 验证 Q-learning / PPO 实现 | 在玩具环境中与 DP 最优 V* 比较 |
| 基于模型强化学习（Phase 9 第 10 课） | 在学习得到的转移模型上执行 Bellman 备份 |
| AlphaZero / MuZero 中的规划 | 蒙特卡洛树搜索 = 异步 Bellman 备份 |
| 离线强化学习（CQL、IQL） | 保守 Q 迭代，即对分布外动作施加惩罚的 DP |

每当有人说“最优价值函数”，指的就是“DP 不动点”。在论文中看到 `V*` 或 `Q*` 时，应想到这段循环。

## 交付成果

保存为 `outputs/skill-dp-solver.md`：

```markdown
---
name: dp-solver
description: 通过策略迭代或价值迭代精确求解小型表格 MDP，并报告收敛行为。
version: 1.0.0
phase: 9
lesson: 2
tags: [rl, dynamic-programming, bellman]
---

给定一个模型已知的 MDP，输出：

1. 选择。策略迭代还是价值迭代。说明与 |S|、|A|、γ 相关的理由。
2. 初始化。V_0、起始策略和收敛敏感性。
3. 停止条件。上确界范数容差 ε，以及预计扫描次数。
4. 验证。精确计算 V*(s_0)，提取贪心策略。
5. 用途。如何使用该基线调试 / 评估基于采样的方法。

拒绝在状态空间大于 10⁷ 时运行 DP。没有上确界范数检查时，拒绝声称已经收敛。把无限视野任务中的任何 γ ≥ 1 标记为违反保证。
```

## 练习

1. **简单。** 在 4×4 GridWorld 上分别使用 `γ ∈ {0.9, 0.99}` 运行价值迭代。需要多少次扫描才能达到 `max |ΔV| < 1e-6`？把 `V*` 打印为 4×4 网格。
2. **中等。** 在*随机* GridWorld（滑动概率 `0.1`）上比较策略迭代与价值迭代。统计扫描次数、实际耗时和最终 `V*(0,0)`。哪种方法按迭代次数收敛更快？按实际耗时呢？
3. **困难。** 构建修改策略迭代：评估步骤不运行到收敛，只执行 `k` 次扫描。对 `k ∈ {1, 2, 5, 10, 50}` 绘制 `V*(0,0)` 误差关于 `k` 的曲线。曲线说明了评估与改进之间怎样的取舍？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| 策略迭代 | “DP 算法” | 交替执行评估（`V^π`）和改进（相对于 `V^π` 的贪心 `π`），直到策略停止变化。 |
| 价值迭代 | “更快的 DP” | 在一次扫描中应用 Bellman 最优性备份；以几何速度收敛到 `V*`。 |
| Bellman 算子 | “递归” | `(T V)(s) = max_a Σ P (r + γ V(s'))`；上确界范数下的 `γ` 压缩映射。 |
| 压缩映射 | “DP 收敛的原因” | 任何满足 `\|\|T x - T y\|\| ≤ γ \|\|x - y\|\|` 的算子 `T` 都有唯一不动点。 |
| GPI | “一切都是 DP” | 广义策略迭代：任何把 `V` 与 `π` 推向相互一致的方法。 |
| 同步更新 | “Jacobi 式” | 整次扫描都使用旧 `V`；便于分析但速度较慢。 |
| 原地更新 | “Gauss-Seidel 式” | 在更新过程中直接使用正在变化的 `V`；实际收敛更快。 |

## 延伸阅读

- [Sutton 与 Barto（2018），第 4 章——动态规划](http://incompleteideas.net/book/RLbook2020.pdf)——权威讲解策略迭代与价值迭代。
- [Bertsekas（2019），《Reinforcement Learning and Optimal Control》](http://www.athenasc.com/rlbook.html)——严谨讨论压缩映射论证。
- [Puterman（2005），《Markov Decision Processes》](https://onlinelibrary.wiley.com/doi/book/10.1002/9780470316887)——修改策略迭代及其收敛分析。
- [Howard（1960），《Dynamic Programming and Markov Processes》](https://mitpress.mit.edu/9780262582300/dynamic-programming-and-markov-processes/)——最早提出策略迭代的论文。
- [Bertsekas 与 Tsitsiklis（1996），《Neuro-Dynamic Programming》](http://www.athenasc.com/ndpbook.html)——从 DP 走向近似 DP / 深度强化学习的桥梁，后续每课都会使用。
