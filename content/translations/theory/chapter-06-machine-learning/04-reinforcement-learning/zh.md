---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 06 - machine learning/04. reinforcement learning.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 96c91eeee0c1d1c9b8deeb77ab5612c1286029a6a06a428d84f70d633ef39cc7
status: reviewed
---
# 强化学习

*强化学习通过试错最大化累积奖励来训练代理进行序列决策。本文件涵盖了MDPs、值函数、贝尔曼方程、Q-learning、策略梯度方法、演员- critic方法、PPO以及RLHF，这是游戏-playing代理和语言模型对齐的框架。*

- 监督学习需要标记数据。无监督学习在未标记数据中发现模式。**强化学习（RL）**与两者不同：代理通过与环境互动、采取行动并接收奖励来学习。没有正确的标签；代理必须通过试错来发现好的行为。RL正式化了这个过程。

- 想象一下教狗一项新技能。你不会向它展示一组正确的行为。相反，它会尝试一些事情，你会给好行为奖励，并随着时间的推移逐渐发现你要什么。RL将这一过程形式化了。

- 强化学习的设置有五个核心组件。**代理**是学习者和决策制定者。**环境**是代理与之交互的一切外部因素。在每个时间步，代理观察到一个**状态**$s_t$，选择一个**动作**$a_t$，收到一个**奖励**$r_t$，并进入一个新的状态$s_{t+1}$。代理的目标是通过最大化其收集的总奖励来实现时间上的最优解。

![代理-环境循环：代理观察状态，采取行动，接收奖励，环境过渡到新状态](../images/mdp_agent_loop.svg)


- **策略**$\pi$是代理的战略：从状态映射到动作的函数。确定性策略为每个状态提供一个行动：$a = \pi(s)$。随机策略为动作提供概率分布：$\pi(a \mid s)$。强化学习的目标是找到最优策略，即最大化预期累积奖励。

- 强化学习的数学框架是**马尔可夫决策过程（MDP）**，由一个四元组$(S, A, P, R, \gamma)$定义：状态集$S$、动作集$A$、转换概率$P(s' \mid s, a)$、奖励函数$R(s, a)$和折扣因子$\gamma$组成。

- **马尔可夫性质**（第5章）表明未来只取决于当前状态，而不受过去经历的影响：$P(s_{t+1} \mid s_t, a_t, s_{t-1}, \ldots) = P(s_{t+1} \mid s_t, a_t)$。这意味着状态包含了做出决策所需的所有信息。

- **折扣因子**$\gamma \in [0, 1)$决定了代理对未来奖励的重视程度与即时奖励之间的关系。从时间$t$的总回报为：

$$G_t = r_t + \gamma r_{t+1} + \gamma^2 r_{t+2} + \cdots = \sum_{k=0}^{\infty} \gamma^k r_{t+k}$$
- 通过$\gamma = 0$，代理完全短视，只关心下一个奖励。通过$\gamma$接近1时，代理远见卓识。折扣因子也确保了和收敛（如果奖励是受限制的），这对于数学上的定义至关重要。

- **值函数**估计在某个状态（或在某个状态下采取某个动作）的好坏程度。**状态值函数** $V^\pi(s)$ 是从状态 $s$ 开始，遵循策略 $\pi$ 的预期回报：

$$V^\pi(s) = \mathbb{E}_\pi \left[ G_t \mid s_t = s \right]$$
- The **action-value function** $Q^\pi(s, a)$ is the expected return starting from 状态 $s$, taking action $a$, and then following $\pi$:

$$Q^\pi(s, a) = \mathbb{E}_\pi \left[ G_t \mid s_t = s, a_t = a \right]$$
- The relationship: $V^\pi(s) = \sum_a \pi(a \mid s) \, Q^\pi(s, a)$. The 状态 value is the average of action values, weighted by the policy.

- **贝尔曼方程**表示一个递归关系：状态的价值等于立即奖励加上下一个状态的折扣价值。对于状态值函数：

$$V^\pi(s) = \sum_a \pi(a \mid s) \sum_{s'} P(s' \mid s, a) \left[ R(s, a) + \gamma \, V^\pi(s') \right]$$
- 对于最优值函数 $V^{*}(s)$，代理总是选择最好的动作：

$$V^{*}(s) = \max_a \sum_{s'} P(s' \mid s, a) \left[ R(s, a) + \gamma \, V^{*}(s') \right]$$
- 同样，$Q^{*}$的贝尔曼最优方程是：

$$Q^{*}(s, a) = \sum_{s'} P(s' \mid s, a) \left[ R(s, a) + \gamma \max_{a'} Q^{*}(s', a') \right]$$
- 一旦你拥有 $Q^{*}$，最优策略非常简单：总是选择具有最高 Q 值的动作：$\pi^{*}(s) = \arg\max_a Q^{*}(s, a)$。

- 动态规划方法用于解决已知转移概率和奖励（完整模型）的MDP。策略评估计算 $V^\pi$ 对于给定的策略，通过迭代应用贝尔曼方程直到收敛。**策略改进**使用价值函数构造一个更好的策略： $\pi'(s) = \arg\max_a \sum_{s'} P(s' \mid s, a)[R(s,a) + \gamma V^\pi(s')]$当然，请提供您需要翻译的英文文本。

- **策略迭代**交替进行评估和改进，直到策略不再变化。它保证能够收敛到最优策略。

- **值迭代**将两个步骤合并为一个：它反复应用贝尔曼最优方程，直到 $V^{*}$ 收敛，然后提取策略。

$$V(s) \leftarrow \max_a \sum_{s'} P(s' \mid s, a) \left[ R(s, a) + \gamma \, V(s') \right]$$
- 动态规划需要知道 $P(s' \mid s, a)$，这在大多数实际问题中是不现实的。通常情况下，代理只能与环境进行交互，而无法了解其动态。这就是模型自由方法发挥作用的地方。

- **时间差（TD）学习**通过经验学习，而不需要知道模型。关键思想是 **回溯**：而不是等到整个episode结束才计算实际回报 $G_t$，而是使用当前的价值函数进行估计：

$$V(s_t) \leftarrow V(s_t) + \alpha \left[ r_t + \gamma \, V(s_{t+1}) - V(s_t) \right]$$
- 本括号内的术语是 **TD误差**：目标值（$r_t + \gamma V(s_{t+1})$）与当前估计 $V(s_t)$ 的差值。如果 TD误差为正，说明状态比预期更好，因此我们增加其值。如果负数，则减少其值。

![状态转换显示TD目标：当前值、奖励和通过更新公式计算的后续值](../images/td_update.svg)


- TD学习在每次单步后更新，而不是在完成整个 episode后，这使得它比蒙特卡洛方法更高效。此外，在非 episodic（持续）环境中也适用。

- **SARSA**（状态-动作-奖励-状态-动作）是将TD学习应用于Q值的强化学习方法。代理在状态 $s$ 中采取了动作 $a$，观察到了奖励 $r$ 和下一个状态 $s'$，然后根据其策略选择下一个动作 $a'$。

$$Q(s, a) \leftarrow Q(s, a) + \alpha \left[ r + \gamma \, Q(s', a') - Q(s, a) \right]$$
- SARSA 是 **策略学习**：它使用实际采取的动作进行更新，包括探索。这使得 SARSA 更保守；它学习一个考虑自己探索噪声的策略。

- **Q-learning** 是最著名的强化学习算法。它类似于 SARSA，但不是使用代理实际采取的动作，而是使用最佳可能的动作：

$$Q(s, a) \leftarrow Q(s, a) + \alpha \left[ r + \gamma \max_{a'} Q(s', a') - Q(s, a) \right]$$
- Q-learning是**非策略学习**：它学习最优的Q值，而不管当前采取的是什么策略。即使在随机探索的情况下，它也能学习到最优的动作值。这使得Q-learning更加激进，并且通常收敛速度更快，但可能会高估价值。

- **探索与利用**是基本的困境：代理应该利用它已经知道的东西（选择估计值最高的行动）还是探索未知的动作（可能会发现更好的）？

- 最简单的策略是 **epsilon-greedy**：以概率 $\epsilon$ 采取随机动作（探索）；以概率 $1 - \epsilon$ 采取贪婪动作（ exploitation）。一个常见的调度从高 $\epsilon$（大量探索）开始，并随着时间的推移而衰减。

- 表格方法（在每个状态动作对中存储一个值）适用于小型离散状态空间。对于大型或连续状态空间，你需要函数近似。**深度Q网络（DQN）**使用神经网络来近似 $Q(s, a; \theta)$，其中 $\theta$ 是网络权重。

- DQN引入了两个关键的稳定化技术。**经验回放**：而不是从连续的转换中学习（这些转换高度相关），将转换存储在经验缓冲区中，并随机采样小批量进行训练。这打破了相关性，有效地重用数据。

- **目标网络**：使用一个单独、缓慢更新的网络来计算TD目标。如果没有这个，目标每次更新网络时都会移动，导致“追尾自己”的不稳定。目标网络每 $N$ 步进行硬更新（即一次性更新），或持续更新（软更新：$\theta^{-} \leftarrow \tau\theta + (1-\tau)\theta^{-}$）。

- DQN的损失函数仅仅是预测Q值与TD目标之间的均方误差（MSE）：

$$\mathcal{L}(\theta) = \mathbb{E} \left[ \left( r + \gamma \max_{a'} Q(s', a'; \theta^{-}) - Q(s, a; \theta) \right)^2 \right]$$
- 直到目前为止，所有方法都学习价值函数并从它们中推导出策略。 **策略梯度** 方法采取了不同的方法：他们直接参数化策略 $\pi(a \mid s; \theta)$ 并通过期望回报的梯度上升优化它。

- **策略梯度定理** 给出了策略参数相对于期望回报的梯度：

$$\nabla_\theta J(\theta) = \mathbb{E}_\pi \left[ \nabla_\theta \log \pi(a \mid s; \theta) \cdot G_t \right]$$
- 这句话的意思是：增加导致高回报的动作概率，减少导致低回报的动作概率。对策略的对数概率梯度给出了改变的方向，$G_t$决定了改变的程度。

- **强化学习** 是最简单的策略梯度算法。运行一个回合，计算每个步骤的回报 $G_t$，然后更新：

$$\theta \leftarrow \theta + \alpha \, \nabla_\theta \log \pi(a_t \mid s_t; \theta) \cdot G_t$$
- REINFORCE 的方差较高，因为 $G_t$ 是一个噪声、单样本估计的预期回报。一种常见的解决方法是减去一个 **基线**（通常是平均回报或学习到的价值函数），以减少方差而不引入偏差：

$$\theta \leftarrow \theta + \alpha \, \nabla_\theta \log \pi(a_t \mid s_t; \theta) \cdot (G_t - b)$$
- **Actor-Critic**方法使用两个网络。**actor**是策略 $\pi(a \mid s; \theta)$。**critic**是一个值函数 $V(s; \phi)$，作为基准。优势 $A_t = r_t + \gamma V(s_{t+1}) - V(s_t)$取代了 $G_t - b$:

$$\theta \leftarrow \theta + \alpha \, \nabla_\theta \log \pi(a_t \mid s_t; \theta) \cdot A_t$$
- 该批评者通过最小化TD误差，就像价值方法一样进行更新。演员使用策略梯度进行更新，并且利用批评者的优势估计来减少方差。这是最好的两者之和。

![双头架构：演员输出动作概率，批评家输出价值估计，优势信号引导演员更新](../images/actor_critic.svg)


- **PPO**（近似策略优化）是实践中最常用的策略梯度算法。它解决了一个问题：如果策略更新过大，性能会突然崩溃。

- PPO 使用了 **截断的替代目标函数**。设 $r_t(\theta) = \frac{\pi(a_t | s_t; \theta)}{\pi(a_t | s_t; \theta_{\text{old}})}$ 为新旧策略的概率比。损失是：

$$\mathcal{L}^{\text{CLIP}}(\theta) = \mathbb{E} \left[ \min\!\left( r_t(\theta) A_t, \; \text{clip}(r_t(\theta), 1-\epsilon, 1+\epsilon) A_t \right) \right]$$
- 剪裁（通常为 $\epsilon = 0.2$）防止比值偏离1，从而保持更新较小且稳定。如果优势是正的（动作做得好），比值会被限制在 $1 + \epsilon$。如果是负的（动作不好），比值会被限制在 $1 - \epsilon$。这种方法更简单和稳定，优于早期的信任区域方法（TRPO）。

- PPO 是用于训练具有聊天GPT风格的模型的 **RLHF**（从人类反馈中学习强化）。在 RLHF 中，一个奖励模型通过人类偏好数据（选择两个输出中的哪一个？）进行训练，并且 PPO 优化语言模型的策略以最大化这个学习到的奖励。

- **DPO**（直接偏好优化）简化了RLHF，通过完全消除奖励模型来实现。而不是先训练奖励模型再运行RL，DPO从偏好数据中推导出一个闭合形式的损失函数，直接优化策略：

$$\mathcal{L}_{\text{DPO}}(\theta) = -\mathbb{E} \left[ \log \sigma\!\left( \beta \log \frac{\pi_\theta(y_w \mid x)}{\pi_{\text{ref}}(y_w \mid x)} - \beta \log \frac{\pi_\theta(y_l \mid x)}{\pi_{\text{ref}}(y_l \mid x)} \right) \right]$$
- $y_w$是 preferred（获胜）响应，$y_l$是 dispreferred（失败）响应。DPO增加了 preferred输出的相对概率，并且比基于PPO的RLHF要简单得多。

- 两个重要的区分在 RL 算法中。 **On-policy vs off-policy**：on-policy 方法（SARSA、PPO）从当前策略生成的数据中学习；off-policy 方法（Q-learning、DQN）可以利用任何策略生成的数据进行学习。off-policy 方法更高效地使用旧数据，但稳定性可能较差。

- **Model-based vs model-free**：model-free 方法（迄今为止讨论的所有内容）直接从经验中学习值或策略。模型基于方法学习环境的模型（$P(s' \mid s, a)$ 和 $R(s, a)$），并使用它进行规划（想象未来的轨迹而不需要实际采取行动）。模型基于方法更高效，但增加了学习准确模型的复杂性。

- 总结 RL 领域：

| 方法 | 类型 | 关键思想 | 强度 |
|---|---|---|---| 值迭代 | DP，模型基于方法 | Bellman 最优性 | 精确解（小 MDPs） |
| SARSA | TD，on-policy | 学习 Q on-policy | 安全、保守 |
| Q-Learning | TD，off-policy | 学习 Q*，贪婪目标 | 简单、有效 |
| DQN | 深度，off-policy | 神经网络 Q + 回放 + 目标网络 | 在高维状态中可扩展 |
| REINFORCE | 政策梯度 | 策略概率的梯度乘以回报 | 简单的策略优化 |
| Actor-Critic | PG + 值函数 | 动物和批评家用于低方差 | 实用且灵活 |
| PPO | PG，裁剪 | 信任区域稳定性 | 行业标准 |
| DPO | 直接偏好 | 跳过奖励模型 | 更简单的 RLHF |

## 编程任务（使用 CoLab 或笔记本）

1. 实现一个简单的网格世界中的值迭代。计算最优值函数并提取最优策略。可视化两者作为热图和箭头图。
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt

# 4x4 gridworld: goal at (3,3), reward -1 per step, 0 at goal
grid_size = 4
gamma = 0.99
goal = (3, 3)

# Actions: up, down, left, right
actions = [(-1, 0), (1, 0), (0, -1), (0, 1)]
action_names = ['up', 'down', 'left', 'right']
action_arrows = ['\u2191', '\u2193', '\u2190', '\u2192']

def step(s, a):
    """Deterministic transition."""
    ns = (max(0, min(grid_size-1, s[0]+a[0])),
          max(0, min(grid_size-1, s[1]+a[1])))
    return ns

# Value iteration
V = jnp.zeros((grid_size, grid_size))
for iteration in range(100):
    V_new = jnp.array(V)
    for i in range(grid_size):
        for j in range(grid_size):
            if (i, j) == goal:
                continue
            values = []
            for a in actions:
                ns = step((i, j), a)
                values.append(-1 + gamma * float(V[ns[0], ns[1]]))
            V_new = V_new.at[i, j].set(max(values))
    if jnp.max(jnp.abs(V_new - V)) < 1e-6:
        print(f"Converged in {iteration+1} iterations")
        break
    V = V_new

# Extract policy
policy = [['' for _ in range(grid_size)] for _ in range(grid_size)]
for i in range(grid_size):
    for j in range(grid_size):
        if (i, j) == goal:
            policy[i][j] = 'G'
            continue
        best_a = max(range(4), key=lambda a: -1 + gamma * float(V[step((i,j), actions[a])[0], step((i,j), actions[a])[1]]))
        policy[i][j] = action_arrows[best_a]

fig, axes = plt.subplots(1, 2, figsize=(10, 4))
im = axes[0].imshow(V, cmap='YlOrRd_r')
axes[0].set_title("Optimal Value Function")
for i in range(grid_size):
    for j in range(grid_size):
        axes[0].text(j, i, f"{V[i,j]:.1f}", ha='center', va='center', fontsize=10)
plt.colorbar(im, ax=axes[0])

axes[1].imshow(jnp.ones((grid_size, grid_size)), cmap='Greys', vmin=0, vmax=2)
axes[1].set_title("Optimal Policy")
for i in range(grid_size):
    for j in range(grid_size):
        axes[1].text(j, i, policy[i][j], ha='center', va='center', fontsize=18)
plt.tight_layout(); plt.show()
```

2. 实现一个简单的网格世界的表格 Q-learning。训练代理，绘制学习曲线，并显示学到的 Q 值。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

grid_size = 5
goal = (4, 4)
actions = [(-1,0), (1,0), (0,-1), (0,1)]

# Q-table
Q = {}
for i in range(grid_size):
    for j in range(grid_size):
        Q[(i,j)] = [0.0] * 4

alpha = 0.1
gamma = 0.95
epsilon = 1.0
epsilon_decay = 0.995
min_epsilon = 0.01

def step(s, a_idx):
    a = actions[a_idx]
    ns = (max(0, min(grid_size-1, s[0]+a[0])),
          max(0, min(grid_size-1, s[1]+a[1])))
    r = 0.0 if ns == goal else -1.0
    done = ns == goal
    return ns, r, done

key = jax.random.PRNGKey(42)
rewards_per_episode = []

for ep in range(500):
    s = (0, 0)
    total_reward = 0
    for _ in range(100):
        key, subkey = jax.random.split(key)
        if float(jax.random.uniform(subkey)) < epsilon:
            key, subkey = jax.random.split(key)
            a = int(jax.random.randint(subkey, (), 0, 4))
        else:
            a = max(range(4), key=lambda i: Q[s][i])

        ns, r, done = step(s, a)
        total_reward += r
        # Q-learning update
        Q[s][a] += alpha * (r + gamma * max(Q[ns]) - Q[s][a])
        s = ns
        if done:
            break
    rewards_per_episode.append(total_reward)
    epsilon = max(min_epsilon, epsilon * epsilon_decay)

plt.figure(figsize=(8, 4))
# Smooth the curve
window = 20
smoothed = [sum(rewards_per_episode[max(0,i-window):i+1])/min(i+1, window)
            for i in range(len(rewards_per_episode))]
plt.plot(smoothed, color='#3498db', linewidth=1.5)
plt.xlabel("Episode"); plt.ylabel("Total Reward (smoothed)")
plt.title("Q-Learning on Gridworld")
plt.grid(alpha=0.3); plt.show()

# Show learned policy
arrow = ['\u2191', '\u2193', '\u2190', '\u2192']
print("Learned policy:")
for i in range(grid_size):
    row = ""
    for j in range(grid_size):
        if (i,j) == goal:
            row += " G "
        else:
            row += f" {arrow[max(range(4), key=lambda a: Q[(i,j)][a])]} "
    print(row)
```

3. 实现一个多臂老虎机问题中的 REINFORCE。展示策略如何在训练过程中逐渐偏好最好的臂。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

# 5-armed bandit with different expected rewards
true_rewards = jnp.array([0.2, 0.5, 0.8, 0.3, 0.1])
n_arms = len(true_rewards)

# Policy: softmax over logits
logits = jnp.zeros(n_arms)
lr = 0.1
key = jax.random.PRNGKey(42)

policy_history = []
reward_history = []

for step in range(2000):
    probs = jax.nn.softmax(logits)
    policy_history.append(probs)

    # Sample action
    key, subkey = jax.random.split(key)
    action = jax.random.choice(subkey, n_arms, p=probs)

    # Get reward (Bernoulli)
    key, subkey = jax.random.split(key)
    reward = float(jax.random.uniform(subkey) < true_rewards[action])
    reward_history.append(reward)

    # REINFORCE update
    # grad log pi(a) = e_a - probs (for softmax parameterisation)
    grad_log_pi = -probs.at[action].add(1.0)  # one-hot(a) - probs
    logits = logits + lr * reward * grad_log_pi

policy_history = jnp.stack(policy_history)

fig, axes = plt.subplots(1, 2, figsize=(12, 4))
colors = ['#3498db', '#e74c3c', '#27ae60', '#9b59b6', '#f39c12']
for i in range(n_arms):
    axes[0].plot(policy_history[:, i], color=colors[i],
                 label=f'Arm {i} (true={true_rewards[i]:.1f})', linewidth=1.5)
axes[0].set_xlabel("Step"); axes[0].set_ylabel("P(arm)")
axes[0].set_title("Policy Evolution (REINFORCE)")
axes[0].legend(fontsize=8); axes[0].grid(alpha=0.3)

# Smoothed reward
window = 50
smoothed = [sum(reward_history[max(0,i-window):i+1])/min(i+1,window)
            for i in range(len(reward_history))]
axes[1].plot(smoothed, color='#27ae60', linewidth=1.5)
axes[1].axhline(y=0.8, color='#e74c3c', linestyle='--', alpha=0.5, label='Best arm')
axes[1].set_xlabel("Step"); axes[1].set_ylabel("Avg Reward")
axes[1].set_title("Reward Over Time"); axes[1].legend()
axes[1].grid(alpha=0.3)
plt.tight_layout(); plt.show()
```
