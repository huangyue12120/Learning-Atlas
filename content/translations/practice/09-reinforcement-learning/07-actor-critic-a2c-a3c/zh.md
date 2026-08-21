---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/09-reinforcement-learning/07-actor-critic-a2c-a3c/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: d57df3347b10a07e55f83e04d3a9b405d9d4a74cb45410a1b7aa89f18a1aa7a3
status: reviewed
---

# Actor-Critic——A2C 与 A3C

> REINFORCE 的噪声很大。加入一个学习 `V̂(s)` 的 critic，再从回报中减去它，就能得到期望相同但方差低得多的优势。这种方法称为 Actor-Critic。A2C 同步运行，A3C 则跨线程运行。两者都是理解所有现代深度强化学习方法的思维模型。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 9 第 04 课（TD 学习）、Phase 9 第 06 课（REINFORCE）  
**预计时间：** 约 75 分钟

## 问题

原始 REINFORCE 可以工作，但方差很高。不同回合的蒙特卡洛回报 `G_t` 可能相差 10 倍以上。把这种噪声乘以 `∇ log π` 再取平均，会产生一个梯度估计器；它需要数千个回合，才能让策略移动到用少得多的 DQN 更新即可到达的位置。

方差源于直接使用原始回报。如果减去基线 `b(s_t)`，即状态的任意函数，包括学习得到的价值，期望不会改变，方差则会下降。可处理的最佳基线是 `V̂(s_t)`。此时，乘在 `∇ log π` 上的量就是*优势*：

`A(s, a) = G - V̂(s)`

动作产生高于平均水平的回报时就是好动作，低于平均水平时就是坏动作。使用学习型 critic 的 REINFORCE 就是 *Actor-Critic*。Critic 为 actor 提供低方差的指导信号。2015 年后的每种深度策略方法，包括 A2C、A3C、PPO、SAC、IMPALA，都采用了这种结构。

## 概念

![Actor-Critic：策略网络加价值网络，以 TD 残差作为优势](../assets/actor-critic.svg)

**两个网络，共同组成一个损失：**

- **Actor** `π_θ(a | s)`：策略。智能体从中采样并执行动作，再用策略梯度训练它。
- **Critic** `V_φ(s)`：估计从状态出发的期望回报。训练目标是最小化 `(V_φ(s) - target)²`。

**优势。** 有两种标准形式：

- *MC 优势：* `A_t = G_t - V_φ(s_t)`。无偏，但方差较高。
- *TD 优势：* `A_t = r_{t+1} + γ V_φ(s_{t+1}) - V_φ(s_t)`。有偏（使用了 `V_φ`），但方差低得多。它也称为 *TD 残差* `δ_t`。

**n 步优势。** 在两者之间插值：

`A_t^{(n)} = r_{t+1} + γ r_{t+2} + … + γ^{n-1} r_{t+n} + γ^n V_φ(s_{t+n}) - V_φ(s_t)`

`n = 1` 是纯 TD，`n = ∞` 是 MC。大多数实现对 Atari 使用 `n = 5`，对 MuJoCo 上的 PPO 使用 `n = 2048`。

**广义优势估计（GAE）。** Schulman 等（2016）提出对所有 n 步优势做指数加权平均：

`A_t^{GAE} = Σ_{l=0}^{∞} (γλ)^l δ_{t+l}`

其中 `λ ∈ [0, 1]`。`λ = 0` 是 TD（方差低、偏差高），`λ = 1` 是 MC（方差高、无偏）。`λ = 0.95` 是 2026 年的默认值；根据所需的偏差—方差平衡进行调整。

**A2C：同步优势 Actor-Critic。** 在 `N` 个并行环境中各收集 `T` 步，计算每一步的优势，在合并后的批次上更新 actor 和 critic，然后重复。它是 A3C 更简单、更易扩展的同类方法。

**A3C：异步优势 Actor-Critic。** Mnih 等（2016）提出。启动 `N` 个工作线程，每个线程运行一个环境。每个 worker 在自己的展开上计算局部梯度，再异步应用到共享参数服务器。不需要回放缓冲区，因为各 worker 运行不同轨迹，自然降低了相关性。A3C 证明了可以大规模使用 CPU 训练。2026 年以 GPU 为基础的 A2C（批量并行环境）占据主流，因为 GPU 适合大批量计算。

**组合损失。**

`L(θ, φ) = -E[ A_t · log π_θ(a_t | s_t) ]  +  c_v · E[(V_φ(s_t) - G_t)²]  -  c_e · E[H(π_θ(·|s_t))]`

它包含三项：策略梯度损失、价值回归和熵奖励。常用起始值为 `c_v 约 0.5`、`c_e 约 0.01`。

```figure
actor-critic
```

## 动手构建

### 第 1 步：critic

线性 critic `V_φ(s) = w · features(s)` 使用 MSE 更新：

```python
def critic_update(w, x, target, lr):
    v_hat = dot(w, x)
    err = target - v_hat
    for j in range(len(w)):
        w[j] += lr * err * x[j]
    return v_hat
```

在表格环境中，critic 几百个回合便可收敛。用于 Atari 时，把线性 critic 替换为共享 CNN 主干 + 价值头。

### 第 2 步：n 步优势

给定长度为 `T` 的展开，以及自举得到的最终 `V(s_T)`：

```python
def compute_advantages(rewards, values, gamma=0.99, lam=0.95, last_value=0.0):
    advantages = [0.0] * len(rewards)
    gae = 0.0
    for t in reversed(range(len(rewards))):
        next_v = values[t + 1] if t + 1 < len(values) else last_value
        delta = rewards[t] + gamma * next_v - values[t]
        gae = delta + gamma * lam * gae
        advantages[t] = gae
    returns = [a + v for a, v in zip(advantages, values)]
    return advantages, returns
```

`returns` 是 critic 的目标，`advantages` 则乘在 `∇ log π` 上。

### 第 3 步：组合更新

```python
for step_i, (x, a, _r, probs) in enumerate(traj):
    adv = advantages[step_i]
    target_v = returns[step_i]

    # critic
    critic_update(w, x, target_v, lr_v)

    # actor
    for i in range(N_ACTIONS):
        grad_logpi = (1.0 if i == a else 0.0) - probs[i]
        for j in range(N_FEAT):
            theta[i][j] += lr_a * adv * grad_logpi * x[j]
```

这是同策略方法，每次更新使用一次展开，actor 与 critic 采用不同的学习率。

### 第 4 步：并行化（A3C 与 A2C）

- **A3C：** 启动 `N` 个线程。每个线程运行自己的环境并单独执行前向传播，再定期把梯度更新推送到共享主模型。主模型无需加锁；竞态只会引入一些噪声，可以接受。
- **A2C：** 在单个进程中运行 `N` 个环境实例，把观测堆叠为 `[N, obs_dim]` 批次，执行批量前向传播与批量反向传播。它的 GPU 利用率更高、结果确定，也更容易分析，是 2026 年的默认选择。

为了清晰，我们的玩具代码采用单线程；只需三行 numpy 代码就能改写为批量 A2C。

## 常见问题

- **Actor 梯度之前的 critic 偏差。** 如果 critic 仍是随机的，其基线没有信息量，你是在纯噪声上训练。先让 critic 预热几百步再启用策略梯度，或者为 actor 使用较低的学习率。
- **优势规范化。** 在每个批次内把优势规范化为均值为零、标准差为一。它几乎没有成本，却能显著稳定训练。
- **共享主干。** 对图像输入，让 actor 与 critic 使用共享特征提取器，再连接独立的头。两个损失都能帮助训练共享特征。
- **同策略约定。** A2C 对数据只使用一次更新。重复使用会使梯度有偏；PPO 增加的重要性采样修正正是为了解决这个问题。
- **熵坍缩。** 如果没有 `c_e > 0`，策略在几百次更新后就会变得近乎确定，并停止探索。
- **奖励尺度。** 优势的大小取决于奖励尺度。规范化奖励（例如除以运行标准差），使不同任务的梯度幅度保持一致。

## 使用方法

A2C/A3C 在 2026 年很少作为最终选择，但它们构成了后续所有方法所改进的架构：

| 方法 | 与 A2C 的关系 |
|------|---------------|
| PPO | A2C + 裁剪后的重要性比率，从而支持多轮更新 |
| IMPALA | A3C + V-trace 离策略修正 |
| SAC（Phase 9 第 07 课） | 使用软价值 critic 的离策略 A2C（下一课） |
| GRPO（Phase 9 第 12 课） | 去掉 critic 的 A2C，改用组相对优势 |
| DPO | 把 A2C 压缩为偏好排序损失，不需要采样 |
| AlphaStar / OpenAI Five | A2C + 联赛训练 + 模仿预训练 |

在 2026 年的论文中看到“优势”时，就想到 Actor-Critic。

## 交付成果

保存为 `outputs/skill-actor-critic-trainer.md`：

```markdown
---
name: actor-critic-trainer
description: 针对给定环境生成 A2C / A3C / GAE 配置，明确优势估计方法和损失权重。
version: 1.0.0
phase: 9
lesson: 7
tags: [rl, actor-critic, gae]
---

给定一个环境和计算预算，输出：

1. 并行方式。A2C（GPU 批处理）或 A3C（CPU 异步），以及 worker 数量。
2. 展开长度 T。每次更新时每个环境运行的步数。
3. 优势估计器。n 步或 GAE(λ)；注明 λ。
4. 损失权重。`c_v`（价值）、`c_e`（熵）和梯度裁剪值。
5. 学习率。Actor 与 critic 的学习率（如果使用不同值）。

如果环境视野超过 1000，拒绝使用单 worker 的 A2C，因为这种做法过度受限于同策略且速度太慢。没有优势规范化时拒绝交付。如果某次运行满足 `c_e = 0` 且观察到的熵小于 0.1，将其标记为熵坍缩。
```

## 练习

1. **简单。** 在 4×4 GridWorld 上使用 MC 优势（`G_t - V(s_t)`）训练 Actor-Critic。把样本效率与第 06 课中使用运行均值基线的 REINFORCE 比较。
2. **中等。** 切换到 TD 残差优势（`r + γ V(s') - V(s)`）。测量优势批次的方差。它下降了多少？
3. **困难。** 实现 GAE(λ)。扫描 `λ ∈ {0, 0.5, 0.9, 0.95, 1.0}`，绘制最终回报与样本效率的关系。这个任务中偏差—方差的最佳平衡点在哪里？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Actor | “策略网络” | `π_θ(a\|s)`，通过策略梯度更新。 |
| Critic | “价值网络” | `V_φ(s)`，通过对回报 / TD 目标的 MSE 回归更新。 |
| 优势 | “比平均水平好多少” | `A(s, a) = Q(s, a) - V(s)` 或它的估计量；乘在 `∇ log π` 上。 |
| TD 残差 | “δ” | `δ_t = r + γ V(s') - V(s)`；一步优势估计。 |
| GAE | “插值旋钮” | 由 `λ` 参数化，对 n 步优势进行指数加权求和。 |
| A2C | “同步 Actor-Critic” | 跨环境批处理；每次展开执行一个梯度步骤。 |
| A3C | “异步 Actor-Critic” | 工作线程把梯度推送到共享参数服务器。它源自原始论文，到 2026 年已不常用。 |
| 自举 | “在视野末端使用 V” | 截断展开，再加上 `γ^n V(s_{t+n})` 补全求和。 |

## 延伸阅读

- [Mnih 等（2016），《Asynchronous Methods for Deep Reinforcement Learning》](https://arxiv.org/abs/1602.01783)——A3C 原始异步 Actor-Critic 论文。
- [Schulman 等（2016），《High-Dimensional Continuous Control Using Generalized Advantage Estimation》](https://arxiv.org/abs/1506.02438)——GAE。
- [Sutton 与 Barto（2018），第 13 章——Actor-Critic 方法](http://incompleteideas.net/book/RLbook2020.pdf)——基础内容；critic 使用神经网络时，可结合第 9 章的函数近似阅读。
- [Espeholt 等（2018），《IMPALA》](https://arxiv.org/abs/1802.01561)——使用 V-trace 离策略修正的可扩展分布式 Actor-Critic。
- [OpenAI Baselines / Stable-Baselines3](https://stable-baselines3.readthedocs.io/)——值得阅读的生产级 A2C/PPO 实现。
- [Konda 与 Tsitsiklis（2000），《Actor-Critic Algorithms》](https://papers.nips.cc/paper/1786-actor-critic-algorithms)——双时间尺度 Actor-Critic 分解的基础收敛结果。
