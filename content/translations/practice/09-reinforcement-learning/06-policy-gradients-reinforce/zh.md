---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/09-reinforcement-learning/06-policy-gradients-reinforce/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 2f358ef609291528bc89714ac09804eca44030072138f39224f60dc138096a7a
status: reviewed
---

# 策略梯度——从零实现 REINFORCE

> 不用再估计价值。直接参数化策略，计算期望回报的梯度，再沿上升方向更新。Williams（1992）用一个定理写出了这种方法。PPO、GRPO 和每一种大语言模型强化学习循环都源于此。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 3 第 03 课（反向传播）、Phase 9 第 03 课（蒙特卡洛）、Phase 9 第 04 课（TD 学习）  
**预计时间：** 约 75 分钟

## 问题

Q-learning 与 DQN 参数化的是*价值*函数，并通过 `argmax Q` 选择动作。它适用于离散动作和离散状态。遇到连续动作时，这种做法就会失效（如何在 10 维力矩上执行 `argmax`？）；你想使用随机策略时也会遇到问题，因为 `argmax` 天生是确定性的。

策略梯度改为直接参数化*策略*。`π_θ(a | s)` 是一个输出动作分布的神经网络。智能体从中采样并执行动作，计算期望回报相对于 `θ` 的梯度，再沿上升方向更新。不需要 `argmax`，也不需要 Bellman 递归，只对 `J(θ) = E_{π_θ}[G]` 做梯度上升。

REINFORCE 定理（Williams，1992）说明这个梯度可以计算：`∇J(θ) = E_π[ G · ∇_θ log π_θ(a | s) ]`。运行一个回合，计算回报，把每一步的回报乘以 `∇ log π_θ(a | s)`，再取平均并执行梯度上升。算法就完成了。

2026 年的每种大语言模型强化学习算法，包括 PPO、DPO 与 GRPO，都是 REINFORCE 的改进。亲手理解它，才能继续学习本阶段后续内容、Phase 10 第 07 课（RLHF 实现）和 Phase 10 第 08 课（DPO）。

## 概念

![策略梯度：softmax 策略、log-π 梯度、回报加权更新](../assets/policy-gradient.svg)

**策略梯度定理。** 对于任何以 `θ` 参数化的策略 `π_θ`：

`∇J(θ) = E_{τ ~ π_θ}[ Σ_{t=0}^{T} G_t · ∇_θ log π_θ(a_t | s_t) ]`

其中，`G_t = Σ_{k=t}^{T} γ^{k-t} r_{k+1}` 是从步骤 `t` 开始的折扣回报。期望针对从 `π_θ` 采样得到的完整轨迹 `τ` 计算。

**证明很短。** 在期望中对 `J(θ) = Σ_τ P(τ; θ) G(τ)` 求导。使用 `∇P(τ; θ) = P(τ; θ) ∇ log P(τ; θ)`（对数导数技巧）。把 `log P(τ; θ)` 分解为 `Σ log π_θ(a_t | s_t) + 不依赖 θ 的环境项`。环境项会消失。两行代数就能推出该定理。

**方差缩减技巧。** 原始 REINFORCE 的方差高得惊人：回报含噪，`∇ log π` 也含噪，两者的乘积噪声更大。标准修正方法有两种：

1. **减去基线。** 对任何不依赖 `a_t` 的基线 `b(s_t)`，用 `G_t - b(s_t)` 替换 `G_t`。它保持无偏，因为 `E[b(s_t) · ∇ log π(a_t | s_t)] = 0`。典型选择是使用 critic 学习得到的 `b(s_t) = V̂(s_t)`，由此得到 Actor-Critic（第 07 课）。
2. **Reward-to-go。** 用 `Σ_t G_t^{from t} · ∇ log π_θ(a_t | s_t)` 替换 `Σ_t G_t · ∇ log π_θ(a_t | s_t)`。对给定动作而言，只有未来回报相关；过去的奖励只会引入均值为零的噪声。

组合两者可得：

`∇J ≈ (1/N) Σ_{i=1}^{N} Σ_{t=0}^{T_i} [ G_t^{(i)} - V̂(s_t^{(i)}) ] · ∇_θ log π_θ(a_t^{(i)} | s_t^{(i)})`

带基线的 REINFORCE 是 A2C（第 07 课）与 PPO（第 08 课）的直接前身。

**Softmax 策略参数化。** 对离散动作，标准选择为：

`π_θ(a | s) = exp(f_θ(s, a)) / Σ_{a'} exp(f_θ(s, a'))`

其中，`f_θ` 可以是任何为每个动作输出一个分数的神经网络。其梯度形式很简洁：

`∇_θ log π_θ(a | s) = ∇_θ f_θ(s, a) - Σ_{a'} π_θ(a' | s) ∇_θ f_θ(s, a')`

也就是所选动作分数的梯度减去该梯度在策略下的期望。

**连续动作的高斯策略。** `π_θ(a | s) = N(μ_θ(s), σ_θ(s))`。`∇ log N(a; μ, σ)` 有闭式解。Phase 9 第 07 课的 SAC 只需要这些知识。

```figure
policy-gradient-landscape
```

## 动手构建

### 第 1 步：softmax 策略网络

```python
def policy_logits(theta, state_features):
    return [dot(theta[a], state_features) for a in range(N_ACTIONS)]

def softmax(logits):
    m = max(logits)
    exps = [exp(l - m) for l in logits]
    Z = sum(exps)
    return [e / Z for e in exps]
```

在表格环境中使用线性策略（每个动作一条权重向量）。用于 Atari 时，换成 CNN 并保留 softmax 头。

### 第 2 步：采样与对数概率

```python
def sample_action(probs, rng):
    x = rng.random()
    cum = 0
    for a, p in enumerate(probs):
        cum += p
        if x <= cum:
            return a
    return len(probs) - 1

def log_prob(probs, a):
    return log(probs[a] + 1e-12)
```

### 第 3 步：展开并记录对数概率

```python
def rollout(theta, env, rng, gamma):
    trajectory = []
    s = env.reset()
    while not done:
        logits = policy_logits(theta, s)
        probs = softmax(logits)
        a = sample_action(probs, rng)
        s_next, r, done = env.step(s, a)
        trajectory.append((s, a, r, probs))
        s = s_next
    return trajectory
```

### 第 4 步：REINFORCE 更新

```python
def reinforce_step(theta, trajectory, gamma, lr, baseline=0.0):
    returns = compute_returns(trajectory, gamma)
    for (s, a, _, probs), G in zip(trajectory, returns):
        advantage = G - baseline
        grad_log_pi_a = [-p for p in probs]
        grad_log_pi_a[a] += 1.0
        for i in range(N_ACTIONS):
            for j in range(len(s)):
                theta[i][j] += lr * advantage * grad_log_pi_a[i] * s[j]
```

梯度 `∇ log π(a|s) = e_a - π(·|s)`，即 `a` 的 one-hot 向量减去概率，是 softmax 策略梯度的核心。把它练成肌肉记忆。

### 第 5 步：基线

使用近期回合中 `G` 的运行均值作为基线，就足以通过方差缩减让 4×4 GridWorld 学习起来；它需要约 500 个回合才能收敛。把基线升级为学习得到的 `V̂(s)`，就得到 Actor-Critic。

## 常见问题

- **梯度爆炸。** 回报可能很大。把 `G` 与 `∇ log π` 相乘前，始终在批次内将其规范化到 `约 N(0, 1)`。
- **熵坍缩。** 策略过早收敛到近乎确定的动作，停止探索并陷入局部解。解决方法是在目标中加入熵奖励 `β · H(π(·|s))`。
- **高方差。** 原始 REINFORCE 需要数千个回合。标准修正方法是使用 critic 基线（第 07 课）或 TRPO/PPO 的信赖域（第 08 课）。
- **样本效率低。** 同策略方法在一次更新后会丢弃每条转移。通过重要性采样执行离策略修正可以重用数据，但会增加方差（PPO 的比率就是经过裁剪的 IS 权重）。
- **非平稳梯度。** 来自 100 个回合前的同一梯度使用的是旧 `π`。因此，同策略方法每完成几次展开就会更新。
- **信用分配。** 不使用 reward-to-go 时，过去的奖励会引入噪声。始终使用 reward-to-go。

## 使用方法

到 2026 年，研究者很少直接运行 REINFORCE，但它的梯度公式无处不在：

| 用例 | 派生方法 |
|------|----------|
| 连续控制 | 使用高斯策略的 PPO / SAC |
| 大语言模型 RLHF | 带 KL 惩罚、运行于词元级策略上的 PPO |
| 大语言模型推理（DeepSeek） | GRPO：使用组相对基线、不需要 critic 的 REINFORCE |
| 多智能体 | 使用集中式 critic 的 REINFORCE（MADDPG、COMA） |
| 离散动作机器人 | A2C、A3C、PPO |
| 只有偏好数据的场景 | DPO：把 REINFORCE 改写为偏好似然损失，不需要采样 |

当你在 2026 年的训练脚本中读到 `loss = -advantage * log_prob`，看到的就是带基线的 REINFORCE。DPO、GRPO、RLOO 等整篇论文，都是建立在这一行代码之上的方差缩减技巧。

## 交付成果

保存为 `outputs/skill-policy-gradient-trainer.md`：

```markdown
---
name: policy-gradient-trainer
description: 针对给定任务生成 REINFORCE / Actor-Critic / PPO 训练配置，并诊断方差问题。
version: 1.0.0
phase: 9
lesson: 6
tags: [rl, policy-gradient, reinforce]
---

给定一个环境（离散 / 连续动作、视野、奖励统计量），输出：

1. 策略头。Softmax（离散）或高斯（连续）及其参数数量。
2. 基线。无（原始算法）、运行均值、学习得到的 `V̂(s)` 或 A2C critic。
3. 方差控制。默认启用 reward-to-go、回报规范化和梯度裁剪值。
4. 熵奖励。系数 β 及衰减调度。
5. 批量大小。每次更新使用的回合数；同策略数据的新鲜度约定。

视野超过 500 步时，拒绝使用无基线的 REINFORCE。拒绝对连续动作控制使用 softmax 头。如果一次运行满足 `β = 0` 且观察到的策略熵小于 0.1，将其标记为熵坍缩。
```

## 练习

1. **简单。** 在 4×4 GridWorld 上用线性 softmax 策略实现 REINFORCE。不使用基线，训练 1,000 个回合。绘制学习曲线，并测量回报的方差（标准差）。
2. **中等。** 加入运行均值基线并重新训练。比较它与原始运行的样本效率和方差。基线把收敛所需的步数减少了多少？
3. **困难。** 加入熵奖励 `β · H(π)`。扫描 `β ∈ {0, 0.01, 0.1, 1.0}`。绘制最终回报和策略熵。这个任务的最佳取值在哪里？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| 策略梯度 | “直接训练策略” | `∇J(θ) = E[G · ∇ log π_θ(a\|s)]`；从对数导数技巧推导而来。 |
| REINFORCE | “最早的 PG 算法” | Williams（1992）；用蒙特卡洛回报乘以对数策略梯度。 |
| 对数导数技巧 | “得分函数估计器” | `∇P(τ;θ) = P(τ;θ) · ∇ log P(τ;θ)`；使期望的梯度可处理。 |
| 基线 | “方差缩减” | 从 `G` 中减去任意 `b(s)`；保持无偏，因为 `E[b · ∇ log π] = 0`。 |
| Reward-to-go | “只计算未来回报” | 使用 `G_t^{from t}`，而不是完整的 `G_0`；结果正确且方差更低。 |
| 熵奖励 | “鼓励探索” | `+β · H(π(·\|s))` 项可以防止策略坍缩。 |
| 同策略 | “用刚看到的数据训练” | 梯度期望相对于当前策略计算，不能直接重用旧数据。 |
| 优势 | “比平均水平好多少” | `A(s, a) = G(s, a) - V(s)`；带基线的 REINFORCE 所乘的带符号量。 |

## 延伸阅读

- [Williams（1992），《Simple Statistical Gradient-Following Algorithms for Connectionist Reinforcement Learning》](https://link.springer.com/article/10.1007/BF00992696)——REINFORCE 原始论文。
- [Sutton 等（2000），《Policy Gradient Methods for Reinforcement Learning with Function Approximation》](https://papers.nips.cc/paper_files/paper/1999/hash/464d828b85b0bed98e80ade0a5c43b0f-Abstract.html)——适用于函数近似的现代策略梯度定理。
- [Sutton 与 Barto（2018），第 13 章——策略梯度方法](http://incompleteideas.net/book/RLbook2020.pdf)——教材讲解。
- [OpenAI Spinning Up——VPG / REINFORCE](https://spinningup.openai.com/en/latest/algorithms/vpg.html)——配有 PyTorch 代码的清晰教学材料。
- [Peters 与 Schaal（2008），《Reinforcement Learning of Motor Skills with Policy Gradients》](https://homes.cs.washington.edu/~todorov/courses/amath579/reading/PolicyGradient.pdf)——方差缩减与自然梯度视角，把 REINFORCE 连接到信赖域方法系列（TRPO、PPO）。
