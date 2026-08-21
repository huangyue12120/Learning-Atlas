---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/09-reinforcement-learning/05-dqn/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 002242aabbe794433e55c2e708831e30ac786362b9de326ccea60b0c0c1de1c9
status: reviewed
---

# 深度 Q 网络（DQN）

> 2013 年，Mnih 用原始像素训练了一个 Q-learning 网络，在七款 Atari 游戏中击败了所有经典强化学习智能体。2015 年，他把实验扩展到 49 款游戏，成果发表于 Nature，并由此开启了深度强化学习时代。DQN 就是 Q-learning 加上三个让函数近似保持稳定的技巧。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 3 第 03 课（反向传播）、Phase 9 第 04 课（Q-learning、SARSA）  
**预计时间：** 约 75 分钟

## 问题

表格 Q-learning 要为每个（状态，动作）对保存独立的 Q 值。国际象棋棋盘约有 10⁴³ 个状态。一帧 Atari 画面包含 210×160×3 = 100,800 个特征。状态数量达到数千时，表格强化学习就难以为继，更不用说数十亿个状态。

事后看来，解决办法很直接：用神经网络 `Q(s, a; θ)` 替换 Q 表。但研究者花了几十年才实现它。把朴素函数近似用于 Q-learning，会在“致命三角”下发散：函数近似 + 自举 + 离策略学习。Mnih 等（2013、2015）找到了三个稳定学习过程的工程技巧：

1. **经验回放** 打散转移之间的相关性。
2. **目标网络** 冻结自举目标。
3. **奖励裁剪** 规范化梯度幅度。

Atari 上的 DQN 首次用同一套架构和超参数解决了数十个基于原始像素的控制问题。此后所有“深度强化学习”方法，包括 DDQN、Rainbow、Dueling、Distributional、R2D2、Agent57，都建立在这三个技巧之上。

## 概念

![DQN 训练循环：环境、回放缓冲区、在线网络、目标网络、Bellman TD 损失](../assets/dqn.svg)

**目标函数。** DQN 在神经 Q 函数上最小化一步 TD 损失：

`L(θ) = E_{(s,a,r,s')~D} [ (r + γ max_{a'} Q(s', a'; θ^-) - Q(s, a; θ))² ]`

`θ` 是在线网络，每一步都通过梯度下降更新。`θ^-` 是目标网络，定期从 `θ` 复制参数（约每 10,000 步一次）。`D` 是保存历史转移的回放缓冲区。

**三个技巧按重要性排列如下：**

**经验回放。** 使用包含 `约 10⁶` 条转移的环形缓冲区。每个训练步骤从中均匀随机采样一个小批量。这样可以打破时间相关性（连续帧几乎相同），让网络多次学习罕见的奖励转移，并降低连续梯度更新之间的相关性。没有经验回放时，使用神经网络的同策略 TD 会在 Atari 上发散。

**目标网络。** 在 Bellman 方程两侧使用同一个网络 `Q(·; θ)`，会让目标随每次更新而移动，就像“追着自己的尾巴跑”。解决办法是保留第二个权重冻结的网络 `Q(·; θ^-)`。每隔 `C` 步复制一次 `θ → θ^-`，让回归目标在数千次梯度更新期间保持稳定。软更新 `θ^- ← τ θ + (1-τ) θ^-`（DDPG、SAC 使用）是更平滑的变体。

**奖励裁剪。** Atari 的奖励幅度从 1 到 1000 以上不等。把奖励裁剪到 `{-1, 0, +1}`，可以防止某一款游戏主导梯度。如果奖励大小本身很重要，这种做法并不合适；在只关注奖励正负的 Atari 游戏上则没有问题。

**Double DQN。** Hasselt（2016）通过以下方式修正最大化偏差：用在线网络*选择*动作，用目标网络*评估*动作。

`target = r + γ Q(s', argmax_{a'} Q(s', a'; θ); θ^-)`

这是可以直接替换的改进，效果始终更好。默认使用它。

**其他改进（Rainbow，2017）：** 优先经验回放（提高 TD 误差较大转移的采样频率）、Dueling 架构（分离 `V(s)` 与优势值头）、噪声网络（学习探索方式）、n 步回报、分布式 Q（C51/QR-DQN）、多步自举。每项改进都能增加几个百分点，叠加后的收益大致可以累加。

```figure
f3-dqn-stability
```

## 动手构建

这里的代码只用标准库，不依赖 numpy。我们在一个小型连续 GridWorld 上手写单隐层 MLP，因此每个训练步骤只需几微秒。扩大规模后，算法与 Atari DQN 完全相同。

### 第 1 步：回放缓冲区

```python
class ReplayBuffer:
    def __init__(self, capacity):
        self.buf = []
        self.capacity = capacity
    def push(self, s, a, r, s_next, done):
        if len(self.buf) == self.capacity:
            self.buf.pop(0)
        self.buf.append((s, a, r, s_next, done))
    def sample(self, batch, rng):
        return rng.sample(self.buf, batch)
```

Atari 需要约 50,000 的容量；我们的玩具环境用 5,000 就够了。

### 第 2 步：小型 Q 网络（手写 MLP）

```python
class QNet:
    def __init__(self, n_in, n_hidden, n_actions, rng):
        self.W1 = [[rng.gauss(0, 0.3) for _ in range(n_in)] for _ in range(n_hidden)]
        self.b1 = [0.0] * n_hidden
        self.W2 = [[rng.gauss(0, 0.3) for _ in range(n_hidden)] for _ in range(n_actions)]
        self.b2 = [0.0] * n_actions
    def forward(self, x):
        h = [max(0.0, sum(w * xi for w, xi in zip(row, x)) + b) for row, b in zip(self.W1, self.b1)]
        q = [sum(w * hi for w, hi in zip(row, h)) + b for row, b in zip(self.W2, self.b2)]
        return q, h
```

前向传播为：线性层 → ReLU → 线性层，整个网络只有这三层。

### 第 3 步：DQN 更新

```python
def train_step(online, target, batch, gamma, lr):
    grads = zeros_like(online)
    for s, a, r, s_next, done in batch:
        q, h = online.forward(s)
        if done:
            y = r
        else:
            q_next, _ = target.forward(s_next)
            y = r + gamma * max(q_next)
        td_error = q[a] - y
        accumulate_grads(grads, online, s, h, a, td_error)
    apply_sgd(online, grads, lr / len(batch))
```

它的形式与第 04 课的 Q-learning 相同，只有两处区别：（a）我们通过可微的 `Q(·; θ)` 反向传播，而不是索引表格；（b）目标使用 `Q(·; θ^-)`。

### 第 4 步：外层循环

每个回合都根据 `Q(·; θ)` 采用 ε-greedy 动作，把转移放入缓冲区，从中采样一个小批量，执行一次梯度更新，并定期同步 `θ^- ← θ`。其模式如下：

```python
for episode in range(N):
    s = env.reset()
    while not done:
        a = epsilon_greedy(online, s, epsilon)
        s_next, r, done = env.step(s, a)
        buffer.push(s, a, r, s_next, done)
        if len(buffer) >= batch:
            train_step(online, target, buffer.sample(batch), gamma, lr)
        if steps % sync_every == 0:
            target = copy(online)
        s = s_next
```

在使用 16 维 one-hot 状态的小型 GridWorld 上，智能体经过约 500 个回合就能学到接近最优的策略。在 Atari 上，把训练规模扩大到 2 亿帧，并加入 CNN 特征提取器。

## 常见问题

- **致命三角。** 函数近似 + 离策略 + 自举可能导致发散。DQN 用目标网络与经验回放缓解问题，两者都不要移除。
- **探索。** ε 必须衰减，通常在训练前约 10% 的阶段从 1.0 降到 0.01。早期探索不足会让 Q 网络收敛到局部盆地。
- **高估。** 对含噪 Q 值取 `max` 存在向上偏差。在生产中始终使用 Double DQN。
- **奖励尺度。** 裁剪或规范化奖励；梯度幅度与奖励幅度成正比。
- **回放缓冲区冷启动。** 缓冲区积累几千条转移后再开始训练。用约 20 个样本计算早期梯度会导致过拟合。
- **目标同步频率。** 过于频繁约等于没有目标网络，过于稀疏则会让目标陈旧。Atari DQN 每 10,000 个环境步骤同步一次。经验法则是每隔训练总步数的约 1/100 同步一次。
- **观测预处理。** Atari DQN 堆叠 4 帧，使状态满足 Markov 性。任何包含速度信息的环境都需要帧堆叠或循环状态。

## 使用方法

到 2026 年，DQN 很少再达到最先进水平，但仍是离策略算法的参照基线：

| 任务 | 首选方法 | 不用 DQN 的原因 |
|------|----------|-----------------|
| 类 Atari 的离散动作任务 | Rainbow DQN 或 Muesli | 框架相同，技巧更多。 |
| 连续控制 | SAC / TD3（Phase 9 第 07 课） | DQN 没有策略网络。 |
| 同策略 / 高吞吐量 | PPO（Phase 9 第 08 课） | 不需要回放缓冲区，更容易扩展。 |
| 离线强化学习 | CQL / IQL / Decision Transformer | 使用保守 Q 目标，避免自举爆炸。 |
| 大型离散动作空间（推荐系统） | 带动作嵌入的 DQN，或 IMPALA | DQN 可以使用；附加设计很重要。 |
| 大语言模型强化学习 | PPO / GRPO | 针对序列级而非步骤级，损失函数不同。 |

这些经验依然通用。回放和目标网络出现在 SAC、TD3、DDPG、SAC-X、AlphaZero 的自我对弈缓冲区以及每种离线强化学习方法中。奖励裁剪在 PPO 中演变为优势规范化。DQN 的架构仍是设计蓝图。

## 交付成果

保存为 `outputs/skill-dqn-trainer.md`：

```markdown
---
name: dqn-trainer
description: 为离散动作强化学习任务生成 DQN 训练配置，包括缓冲区、目标同步、ε 调度和奖励裁剪。
version: 1.0.0
phase: 9
lesson: 5
tags: [rl, dqn, deep-rl]
---

给定一个离散动作环境（观测形状、动作数量、视野和奖励尺度），输出：

1. 网络。架构（MLP / CNN / Transformer）、特征维度和深度。
2. 回放缓冲区。容量、小批量大小和预热大小。
3. 目标网络。同步策略（每 C 步硬更新，或使用 τ 软更新）。
4. 探索。ε 的起始值、终止值和调度长度。
5. 损失。Huber 或 MSE、梯度裁剪值和奖励裁剪规则。
6. Double DQN。默认启用，除非有明确理由关闭。

如果 DQN 没有目标网络、没有回放缓冲区或把 ε 保持为 1，拒绝交付。拒绝连续动作任务，并将其转交 SAC / TD3。奖励范围超过单步平均值 10 倍时，标记为需要裁剪或尺度规范化。
```

## 练习

1. **简单。** 运行 `code/main.py`。绘制每回合的回报曲线。经过多少个回合，运行均值会超过 -10？
2. **中等。** 禁用目标网络（Bellman 目标两侧都使用在线网络）。测量训练不稳定性：回报会振荡还是发散？
3. **困难。** 加入 Double DQN：用在线网络选择 `argmax a'`，用目标网络评估。对于奖励含噪的 GridWorld，训练 1,000 个回合后，比较使用与不使用 Double DQN 时 `Q(s_0, best_a)` 相对于真实 `V*(s_0)` 的偏差。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| DQN | “深度 Q-learning” | 使用神经 Q 函数、回放缓冲区和目标网络的 Q-learning。 |
| 经验回放 | “打乱后的转移” | 每个梯度步骤从环形缓冲区均匀采样，以降低数据相关性。 |
| 目标网络 | “冻结的自举” | 在 Bellman 目标中使用定期复制的 Q 网络；稳定训练过程。 |
| 致命三角 | “强化学习为什么会发散” | 函数近似 + 自举 + 离策略，无法保证收敛。 |
| Double DQN | “最大化偏差的修正方法” | 在线网络选择动作，目标网络评估动作。 |
| Dueling DQN | “V 头与 A 头” | 分解 `Q = V + A - mean(A)`；输出相同，梯度流更好。 |
| Rainbow | “所有技巧” | 把 DDQN + PER + Dueling + n 步 + 噪声网络 + 分布式方法合在一起。 |
| PER | “优先经验回放” | 按照 TD 误差的大小成比例采样转移。 |

## 延伸阅读

- [Mnih 等（2013），《Playing Atari with Deep Reinforcement Learning》](https://arxiv.org/abs/1312.5602)——开启深度强化学习的 2013 年 NeurIPS workshop 论文。
- [Mnih 等（2015），《Human-level control through deep reinforcement learning》](https://www.nature.com/articles/nature14236)——涵盖 49 款游戏的 Nature DQN 论文。
- [Hasselt、Guez 与 Silver（2016），《Deep Reinforcement Learning with Double Q-learning》](https://arxiv.org/abs/1509.06461)——DDQN。
- [Wang 等（2016），《Dueling Network Architectures》](https://arxiv.org/abs/1511.06581)——Dueling DQN。
- [Hessel 等（2018），《Rainbow: Combining Improvements in Deep RL》](https://arxiv.org/abs/1710.02298)——叠加多项技巧的论文。
- [OpenAI Spinning Up——DQN](https://spinningup.openai.com/en/latest/algorithms/dqn.html)——清晰的现代讲解。
- [Sutton 与 Barto（2018），第 9 章——使用函数近似的同策略预测](http://incompleteideas.net/book/RLbook2020.pdf)——教材对“致命三角”（函数近似 + 自举 + 离策略）的讲解；DQN 的目标网络和回放缓冲区正是为了约束这个问题。
- [CleanRL DQN 实现](https://docs.cleanrl.dev/rl-algorithms/dqn/)——消融研究使用的单文件 DQN 参考实现，适合与本课的从零实现对照阅读。
