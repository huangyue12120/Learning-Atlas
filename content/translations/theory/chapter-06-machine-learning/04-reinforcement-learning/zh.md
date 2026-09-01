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

*强化学习通过试错训练 agent 做出序列决策，并最大化累计奖励。本篇涵盖 MDP、价值函数、Bellman 方程、Q-learning、策略梯度、actor-critic 方法、PPO 和 RLHF；这些内容是玩游戏 agent 与语言模型对齐背后的框架。*

- 监督学习需要带标签的数据；无监督学习从无标签数据中寻找模式。**强化学习（reinforcement learning，RL）**与二者不同：agent 通过与环境交互、采取行动并获得奖励来学习。这里没有正确标签，agent 必须通过试错发现良好行为。

- 可以把它想成教狗学一个新把戏。你不会给它展示一个正确行为的数据集，而是让它尝试不同动作，对好的动作给出奖励；随着时间推移，它会逐渐理解你的要求。RL 将这个过程形式化。

- RL 设置包含五个核心组件。**Agent** 是学习者和决策者；**环境（environment）**是 agent 之外、与它交互的一切。在每个时间步，agent 观察**状态** $s_t$，选择**动作** $a_t$，接收**奖励** $r_t$，并转移到新状态 $s_{t+1}$。agent 的目标是最大化它随时间收集的总奖励。

![Agent—环境循环：agent 观察状态、采取动作并收到奖励，环境再转移到新状态](../images/mdp_agent_loop.svg)

- **策略（policy）** $\pi$ 是 agent 的行动方案，也就是从状态映射到动作的规则。确定性策略为每个状态给出一个动作：$a = \pi(s)$。随机策略给出动作上的概率分布：$\pi(a \mid s)$。RL 的目标是找到最优策略，即最大化期望累计奖励的策略。

- RL 的数学框架是**马尔可夫决策过程（Markov Decision Process，MDP）**，由五元组 $(S, A, P, R, \gamma)$ 定义：状态集合 $S$、动作集合 $A$、转移概率 $P(s' \mid s, a)$、奖励函数 $R(s, a)$ 和折扣因子 $\gamma$。

- **马尔可夫性质**（第 05 章）指出，未来只依赖当前状态，而不依赖到达当前状态的历史：$P(s_{t+1} \mid s_t, a_t, s_{t-1}, \ldots) = P(s_{t+1} \mid s_t, a_t)$。这意味着状态包含做决策所需的全部信息。

- **折扣因子** $\gamma \in [0, 1)$ 决定 agent 在多大程度上重视未来奖励而不是即时奖励。时间 $t$ 的折扣回报为：

$$G_t = r_t + \gamma r_{t+1} + \gamma^2 r_{t+2} + \cdots = \sum_{k=0}^{\infty} \gamma^k r_{t+k}$$

- 当 $\gamma = 0$ 时，agent 完全目光短浅，只关心下一个奖励；当 $\gamma$ 接近 1 时，agent 更有远见。折扣因子还保证总和会收敛（奖励有界时），这对数学上的良定义很重要。

- **价值函数**估计处于某个状态（或在某个状态采取某个动作）有多好。**状态价值函数** $V^\pi(s)$ 是从状态 $s$ 开始并遵循策略 $\pi$ 时的期望回报：

$$V^\pi(s) = \mathbb{E}_\pi \left[ G_t \mid s_t = s \right]$$

- **动作价值函数** $Q^\pi(s, a)$ 是从状态 $s$ 开始、采取动作 $a$，然后遵循 $\pi$ 时的期望回报：

$$Q^\pi(s, a) = \mathbb{E}_\pi \left[ G_t \mid s_t = s, a_t = a \right]$$

- 二者关系为：$V^\pi(s) = \sum_a \pi(a \mid s) \, Q^\pi(s, a)$。状态价值是各动作价值按策略加权后的平均值。

- **Bellman 方程**表达递归关系：一个状态的价值等于即时奖励加上下一状态的折扣价值。对于状态价值函数：

$$V^\pi(s) = \sum_a \pi(a \mid s) \sum_{s'} P(s' \mid s, a) \left[ R(s, a) + \gamma \, V^\pi(s') \right]$$

- 对于最优价值函数 $V^{*}(s)$，agent 总是选择最好的动作：

$$V^{*}(s) = \max_a \sum_{s'} P(s' \mid s, a) \left[ R(s, a) + \gamma \, V^{*}(s') \right]$$

- 同样，$Q^{*}$ 的 **Bellman 最优性方程**为：

$$Q^{*}(s, a) = \sum_{s'} P(s' \mid s, a) \left[ R(s, a) + \gamma \max_{a'} Q^{*}(s', a') \right]$$

- 一旦得到 $Q^{*}$，最优策略就很简单：始终选择 Q 值最高的动作：$\pi^{*}(s) = \arg\max_a Q^{*}(s, a)$。

- 当知道转移概率和奖励（完整模型）时，**动态规划**方法可以求解 MDP。**策略评估**通过反复应用 Bellman 方程直至收敛，计算给定策略的 $V^\pi$。**策略改进**根据价值函数构造更好策略，方法是贪心地行动：$\pi'(s) = \arg\max_a \sum_{s'} P(s' \mid s, a)[R(s,a) + \gamma V^\pi(s')]$。

- **策略迭代**在策略评估与策略改进之间交替执行，直到策略不再变化；它保证收敛到最优策略。

- **价值迭代**把两个步骤合并为一个：反复应用 Bellman 最优性方程，直到 $V^{*}$ 收敛，然后提取策略。

$$V(s) \leftarrow \max_a \sum_{s'} P(s' \mid s, a) \left[ R(s, a) + \gamma \, V(s') \right]$$

- 动态规划要求知道 $P(s' \mid s, a)$，这在很多情况下并不现实。在大多数真实问题中，agent 不知道环境的动力学，只能与环境交互。这就需要**无模型（model-free）**方法。

- **时序差分（Temporal Difference，TD）学习**在不知道环境模型的情况下从经验中学习。核心思想是**自举（bootstrapping）**：不必等到 episode 结束才计算实际回报 $G_t$，而是使用当前价值函数估计它：

$$V(s_t) \leftarrow V(s_t) + \alpha \left[ r_t + \gamma \, V(s_{t+1}) - V(s_t) \right]$$

- 方括号中的项是 **TD 误差**：**TD 目标**（$r_t + \gamma V(s_{t+1})$）与当前估计 $V(s_t)$ 之间的差。如果 TD 误差为正，说明状态比预期更好，于是提高它的价值；如果为负，则降低价值。

![状态转移与 TD 目标：当前价值、奖励和自举得到的下一状态价值，以及更新公式](../images/td_update.svg)

- TD 学习每一步之后都更新（而不是等完整 episode 结束），因此比 Monte Carlo 方法高效得多。它也适用于持续运行的（非 episode）环境。

- **SARSA**（State-Action-Reward-State-Action）是应用于 Q 值的 TD 学习。agent 在状态 $s$ 中采取动作 $a$，观察奖励 $r$ 和下一个状态 $s'$，然后根据自身策略选择下一个动作 $a'$：

$$Q(s, a) \leftarrow Q(s, a) + \alpha \left[ r + \gamma \, Q(s', a') - Q(s, a) \right]$$

- SARSA 是**同策略（on-policy）**方法：它使用 agent 实际采取的动作更新，其中包括探索。这使 SARSA 更保守；它学习到的策略会把自身的探索噪声考虑在内。

- **Q-learning** 是最著名的 RL 算法。它类似 SARSA，但不使用 agent 实际采取的动作，而使用可能的最佳动作：

$$Q(s, a) \leftarrow Q(s, a) + \alpha \left[ r + \gamma \max_{a'} Q(s', a') - Q(s, a) \right]$$

- Q-learning 是**离策略（off-policy）**方法：无论遵循什么策略，它都能学习最优 Q 值。agent 可以随机探索，同时学习最优动作价值。这让 Q-learning 更激进，通常收敛更快，但可能高估价值。

- **探索与利用**是根本性两难：agent 应该利用已知信息（选择估计价值最高的动作），还是探索未知动作（它们可能更好）？

- 最简单的策略是 **epsilon-greedy**：以 $\epsilon$ 的概率采取随机动作（探索），以 $1 - \epsilon$ 的概率采取贪心动作（利用）。常见做法是从较高的 $\epsilon$ 开始（大量探索），再随时间衰减。

- 表格方法（为每个状态—动作对保存一个值）适用于小型离散状态空间。对于大型或连续状态空间，需要函数近似。**深度 Q 网络（Deep Q-Networks，DQN）**使用神经网络近似 $Q(s, a; \theta)$，其中 $\theta$ 是网络权重。

- DQN 引入了两项关键稳定化技术。**经验回放**：不要从高度相关的连续转移中学习，而是把转移存进 replay buffer，再随机采样 mini-batch 训练。这会打破相关性，并高效复用数据。

- **目标网络**：使用网络的独立、缓慢更新副本计算 TD 目标。如果没有它，目标会在每次更新网络时移动，产生“追自己的尾巴”式的不稳定。目标网络可以定期更新（每 $N$ 步硬更新），也可以持续软更新：$\theta^{-} \leftarrow \tau\theta + (1-\tau)\theta^{-}$。

- DQN 损失就是预测 Q 值与 TD 目标之间的 MSE：

$$\mathcal{L}(\theta) = \mathbb{E} \left[ \left( r + \gamma \max_{a'} Q(s', a'; \theta^{-}) - Q(s, a; \theta) \right)^2 \right]$$

- 到目前为止的方法都学习价值函数，再从价值函数推导策略。**策略梯度**方法采取了不同路径：它直接参数化策略 $\pi(a \mid s; \theta)$，通过对期望回报做梯度上升来优化它。

- **策略梯度定理**给出了期望回报关于策略参数的梯度：

$$\nabla_\theta J(\theta) = \mathbb{E}_\pi \left[ \nabla_\theta \log \pi(a \mid s; \theta) \cdot G_t \right]$$

- 这意味着：提高带来高回报的动作概率，降低带来低回报的动作概率。对数概率的梯度给出策略改变的方向，而 $G_t$ 决定改变幅度。

- **REINFORCE** 是最简单的策略梯度算法。运行一个 episode，计算每一步的回报 $G_t$，然后更新：

$$\theta \leftarrow \theta + \alpha \, \nabla_\theta \log \pi(a_t \mid s_t; \theta) \cdot G_t$$

- REINFORCE 方差很高，因为 $G_t$ 是期望回报的带噪单样本估计。常见修复方法是减去一个**基线（baseline）**（通常是平均回报或学习得到的价值函数），在不引入偏差的情况下降低方差：

$$\theta \leftarrow \theta + \alpha \, \nabla_\theta \log \pi(a_t \mid s_t; \theta) \cdot (G_t - b)$$

- **Actor-Critic** 方法使用两个网络。**Actor** 是策略 $\pi(a \mid s; \theta)$；**Critic** 是充当基线的价值函数 $V(s; \phi)$。优势 $A_t = r_t + \gamma V(s_{t+1}) - V(s_t)$ 替代 $G_t - b$：

$$\theta \leftarrow \theta + \alpha \, \nabla_\theta \log \pi(a_t \mid s_t; \theta) \cdot A_t$$

- Critic 通过最小化 TD 误差来更新，就像基于价值的方法一样。Actor 使用策略梯度更新，critic 的优势估计可以降低方差。这兼具两类方法的优点。

![双头架构：actor 输出动作概率，critic 输出价值估计，优势信号指导 actor 更新](../images/actor_critic.svg)

- **PPO（Proximal Policy Optimization，近端策略优化）**是实践中最广泛使用的策略梯度算法。它解决了一个关键问题：如果策略更新太大，性能可能灾难性崩溃。

- PPO 使用**裁剪替代目标**。令 $r_t(\theta) = \frac{\pi(a_t | s_t; \theta)}{\pi(a_t | s_t; \theta_{\text{old}})}$ 表示新旧策略之间的概率比，损失为：

$$\mathcal{L}^{\text{CLIP}}(\theta) = \mathbb{E} \left[ \min\!\left( r_t(\theta) A_t, \; \text{clip}(r_t(\theta), 1-\epsilon, 1+\epsilon) A_t \right) \right]$$

- 裁剪（通常 $\epsilon = 0.2$）防止概率比偏离 1 太远，从而让更新小而稳定。如果优势为正（动作是好的），概率比上限为 $1 + \epsilon$；如果优势为负（动作是坏的），概率比下限为 $1 - \epsilon$。这比早期的信赖域方法（TRPO）更简单、更稳定。

- 通过 **RLHF**（Reinforcement Learning from Human Feedback，基于人类反馈的强化学习）训练 ChatGPT 风格模型时使用的就是 PPO。在 RLHF 中，先用人类偏好数据（人类更喜欢两个输出中的哪一个？）训练奖励模型，再用 PPO 优化语言模型策略，最大化学习到的奖励。

- **DPO**（Direct Preference Optimization，直接偏好优化）通过完全去掉奖励模型来简化 RLHF。它不训练奖励模型再运行 RL，而是从偏好数据推导闭式损失，直接优化策略：

$$\mathcal{L}_{\text{DPO}}(\theta) = -\mathbb{E} \left[ \log \sigma\!\left( \beta \log \frac{\pi_\theta(y_w \mid x)}{\pi_{\text{ref}}(y_w \mid x)} - \beta \log \frac{\pi_\theta(y_l \mid x)}{\pi_{\text{ref}}(y_l \mid x)} \right) \right]$$

- 这里 $y_w$ 是偏好的（获胜）回答，$y_l$ 是不偏好的（落败）回答。DPO 提高偏好输出的相对概率，比基于 PPO 的 RLHF 更易实现。

- RL 算法中有两组重要区分。**同策略与离策略**：同策略方法（SARSA、PPO）从当前策略生成的数据中学习；离策略方法（Q-learning、DQN）可以从任何策略生成的数据中学习。离策略方法更节省样本（可以复用旧数据），但稳定性可能较差。

- **基于模型与无模型**：无模型方法（前面讨论的全部方法）直接从经验中学习价值或策略；基于模型的方法学习环境模型（$P(s' \mid s, a)$ 和 $R(s, a)$），再用它规划（想象未来轨迹，而不用真正采取动作）。基于模型的方法更节省样本，但增加了学习准确环境模型的复杂性。

- RL 方法全景可以概括为：

| 方法 | 类型 | 核心思想 | 优势 |
|---|---|---|---|
| Value Iteration | DP、基于模型 | Bellman 最优性 | 精确解（小型 MDP） |
| SARSA | TD、同策略 | 按同策略学习 Q | 保守、安全 |
| Q-Learning | TD、离策略 | 学习 Q*，使用贪心目标 | 简单、有效 |
| DQN | 深度、离策略 | 神经 Q + 回放 + 目标网络 | 可扩展到高维状态 |
| REINFORCE | 策略梯度 | 对数概率 × 回报的梯度 | 策略优化简单 |
| Actor-Critic | PG + value | Actor + Critic，降低方差 | 实用、灵活 |
| PPO | PG、裁剪 | 类信赖域稳定性 | 工业标准 |
| DPO | 直接偏好 | 跳过奖励模型 | 更简单的 RLHF |

## 编程任务（使用 CoLab 或 notebook）

1. 为简单的 gridworld 实现价值迭代。计算最优价值函数并提取最优策略；分别用热力图和箭头图可视化二者。
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

2. 在简单的 gridworld 上实现表格 Q-learning。训练 agent，绘制学习曲线，并展示学到的 Q 值。
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

3. 在多臂老虎机问题上实现 REINFORCE。展示训练过程中策略如何逐渐偏向最佳臂。
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
