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

*强化学习通过试错最大化累积奖励，训练智能体进行序列决策。本文件涵盖 MDP、值函数、贝尔曼方程、Q-learning、策略梯度、演员–评论家方法、PPO 和 RLHF，这些方法构成游戏智能体与语言模型对齐的基础。*

- 监督学习需要标记数据。无监督学习在未标记数据中发现模式。**强化学习（RL）**与两者不同：智能体通过与环境交互、采取动作并接收奖励来学习。没有正确的标签；智能体必须通过试错发现良好的行为。

- 想象一下教狗一项新技能。你不会向它展示一组正确行为的数据集。相反，它会不断尝试，你会奖励好的动作，随着时间推移，它就会逐渐弄清楚你的要求。RL 将这一过程形式化了。

- 强化学习的设置有五个核心组件。**智能体**是学习者和决策者。**环境**是智能体与之交互的一切外部事物。在每个时间步，智能体观察一个**状态** $s_t$，选择一个**动作** $a_t$，获得一个**奖励** $r_t$，并转移到新状态 $s_{t+1}$。智能体的目标是最大化随时间获得的总奖励。

![智能体–环境循环：智能体观察状态、采取动作、接收奖励，环境转移到新状态](../images/mdp_agent_loop.svg)


- **策略** $\pi$ 是智能体的行动方案，即从状态映射到动作的函数。确定性策略为每个状态给出一个动作：$a = \pi(s)$。随机策略为动作给出概率分布：$\pi(a \mid s)$。强化学习的目标是找到最优策略，即最大化预期累积奖励。

- 强化学习的数学框架是**马尔可夫决策过程（MDP）**，由一个五元组 $(S, A, P, R, \gamma)$ 定义：状态集 $S$、动作集 $A$、转移概率 $P(s' \mid s, a)$、奖励函数 $R(s, a)$ 和折扣因子 $\gamma$。

**编者注：**原文称其为“四元组”，但实际列出了五项；这里按元素数量改为“五元组”。

- **马尔可夫性质**（第5章）表明未来只取决于当前状态，而不受过去经历的影响：$P(s_{t+1} \mid s_t, a_t, s_{t-1}, \ldots) = P(s_{t+1} \mid s_t, a_t)$。这意味着状态包含了做出决策所需的所有信息。

- **折扣因子** $\gamma \in [0, 1)$ 决定了智能体相对于即时奖励有多重视未来奖励。从时间 $t$ 开始的折扣回报为：

$$G_t = r_t + \gamma r_{t+1} + \gamma^2 r_{t+2} + \cdots = \sum_{k=0}^{\infty} \gamma^k r_{t+k}$$
- 当 $\gamma = 0$ 时，智能体只关心下一个奖励；当 $\gamma$ 接近 1 时，智能体更重视长期回报。折扣因子还保证在奖励有界时回报和收敛，这是数学定义成立的必要条件。

- **值函数**估计在某个状态（或在某个状态下采取某个动作）的好坏程度。**状态值函数** $V^\pi(s)$ 是从状态 $s$ 开始，遵循策略 $\pi$ 的预期回报：

$$V^\pi(s) = \mathbb{E}_\pi \left[ G_t \mid s_t = s \right]$$
- **动作价值函数** $Q^\pi(s, a)$ 表示从状态 $s$ 出发，先采取动作 $a$，之后遵循策略 $\pi$ 所得到的期望回报：

$$Q^\pi(s, a) = \mathbb{E}_\pi \left[ G_t \mid s_t = s, a_t = a \right]$$
- 两者的关系为：$V^\pi(s) = \sum_a \pi(a \mid s) \, Q^\pi(s, a)$。状态价值是按策略加权后的动作价值平均。

- **贝尔曼方程**表示一个递归关系：状态的价值等于立即奖励加上下一个状态的折扣价值。对于状态值函数：

$$V^\pi(s) = \sum_a \pi(a \mid s) \sum_{s'} P(s' \mid s, a) \left[ R(s, a) + \gamma \, V^\pi(s') \right]$$
- 对于最优值函数 $V^{*}(s)$，智能体总是选择最好的动作：

$$V^{*}(s) = \max_a \sum_{s'} P(s' \mid s, a) \left[ R(s, a) + \gamma \, V^{*}(s') \right]$$
- 同样，$Q^{*}$的贝尔曼最优方程是：

$$Q^{*}(s, a) = \sum_{s'} P(s' \mid s, a) \left[ R(s, a) + \gamma \max_{a'} Q^{*}(s', a') \right]$$
- 一旦你拥有 $Q^{*}$，最优策略非常简单：总是选择具有最高 Q 值的动作：$\pi^{*}(s) = \arg\max_a Q^{*}(s, a)$。

- 动态规划方法用于已知转移概率和奖励函数（完整模型）的 MDP。策略评估针对给定策略迭代应用贝尔曼方程，直到 $V^\pi$ 收敛。**策略改进**利用价值函数构造更好的策略：$\pi'(s) = \arg\max_a \sum_{s'} P(s' \mid s, a)[R(s,a) + \gamma V^\pi(s')]$。

- **策略迭代**交替进行评估和改进，直到策略不再变化。它保证能够收敛到最优策略。

- **值迭代**将两个步骤合并为一个：它反复应用贝尔曼最优方程，直到 $V^{*}$ 收敛，然后提取策略。

$$V(s) \leftarrow \max_a \sum_{s'} P(s' \mid s, a) \left[ R(s, a) + \gamma \, V(s') \right]$$
- 动态规划需要知道 $P(s' \mid s, a)$，这在大多数实际问题中并不现实。通常情况下，智能体只能与环境交互，而无法了解环境的动态。这就是**无模型**方法发挥作用的地方。

- **时间差（TD）学习**通过经验学习，而不需要知道模型。关键思想是**自举（bootstrapping）**：不必等到整个回合结束才计算实际回报 $G_t$，而是使用当前的价值函数进行估计：

$$V(s_t) \leftarrow V(s_t) + \alpha \left[ r_t + \gamma \, V(s_{t+1}) - V(s_t) \right]$$
- 括号内的量是 **TD 误差**：即 **TD 目标**（$r_t + \gamma V(s_{t+1})$）与当前估计 $V(s_t)$ 之差。如果 TD 误差为正，说明该状态比预期更好，因此提高其价值；如果为负，则降低其价值。

![状态转移显示 TD 目标：当前价值、奖励，以及通过自举得到的下一状态价值和更新公式](../images/td_update.svg)


- TD学习在每个时间步后更新，而不是等到整回合结束，这使得它比蒙特卡洛方法更高效。此外，在持续环境中也适用。

- **SARSA**（状态–动作–奖励–状态–动作）是将 TD 学习应用于 Q 值的方法。智能体在状态 $s$ 中采取动作 $a$，观察奖励 $r$ 和下一状态 $s'$，然后根据其策略选择下一动作 $a'$。

$$Q(s, a) \leftarrow Q(s, a) + \alpha \left[ r + \gamma \, Q(s', a') - Q(s, a) \right]$$
- SARSA 是**在策略（on-policy）**方法：它使用智能体实际采取的动作进行更新，其中包括探索动作。这使得 SARSA 更保守；它学习的是一个考虑自身探索噪声的策略。

- **Q-learning** 是最著名的强化学习算法。它类似于 SARSA，但不是使用智能体实际采取的动作，而是使用最佳可能的动作：

$$Q(s, a) \leftarrow Q(s, a) + \alpha \left[ r + \gamma \max_{a'} Q(s', a') - Q(s, a) \right]$$
- Q-learning 是**离策略（off-policy）**方法：无论遵循什么策略，它都学习最优 Q 值。即使智能体进行随机探索，它仍能学习最优动作价值。这使得 Q-learning 更激进，通常收敛更快，但可能会高估价值。

- **探索与利用**是基本的困境：智能体应该利用它已经知道的东西（选择估计值最高的动作），还是探索未知的动作（可能会发现更好的动作）？

- 最简单的策略是 **ε-贪心**：以概率 $\epsilon$ 采取随机动作进行探索，以概率 $1 - \epsilon$ 采取当前估计最优的动作。常见调度从较大的 $\epsilon$ 开始，随后随时间衰减。

- 表格方法（在表中为每个状态–动作对存储一个值）适用于小型离散状态空间。对于大型或连续状态空间，你需要函数近似。**深度 Q 网络（DQN）**使用神经网络来近似 $Q(s, a; \theta)$，其中 $\theta$ 是网络权重。

- DQN 引入了两个关键的稳定化技术。**经验回放**：不再从连续的转移中学习（这些转移高度相关），而是将转移存储在回放缓冲区中，并随机采样小批量进行训练。这会打破相关性并高效复用数据。

- **目标网络**：使用一个单独、缓慢更新的网络副本来计算 TD 目标。如果没有它，每次更新网络时目标都会移动，导致“追着自己的尾巴跑”的不稳定性。目标网络每 $N$ 步定期更新一次（硬更新），或持续更新（软更新：$\theta^{-} \leftarrow \tau\theta + (1-\tau)\theta^{-}$）。

- DQN的损失函数仅仅是预测Q值与TD目标之间的均方误差（MSE）：

$$\mathcal{L}(\theta) = \mathbb{E} \left[ \left( r + \gamma \max_{a'} Q(s', a'; \theta^{-}) - Q(s, a; \theta) \right)^2 \right]$$
- 到目前为止，所有方法都学习价值函数并从中推导策略。**策略梯度**方法采取了不同的做法：它们直接将策略参数化为 $\pi(a \mid s; \theta)$，并通过对期望回报做梯度上升来优化策略。

- **策略梯度定理** 给出了策略参数相对于期望回报的梯度：

$$\nabla_\theta J(\theta) = \mathbb{E}_\pi \left[ \nabla_\theta \log \pi(a \mid s; \theta) \cdot G_t \right]$$
- 这句话的意思是：增加导致高回报的动作概率，减少导致低回报的动作概率。对策略的对数概率梯度给出了改变的方向，$G_t$决定了改变的程度。

- **REINFORCE** 是最简单的策略梯度算法。运行一个回合，计算每个步骤的回报 $G_t$，然后更新：

$$\theta \leftarrow \theta + \alpha \, \nabla_\theta \log \pi(a_t \mid s_t; \theta) \cdot G_t$$
- REINFORCE 的方差较高，因为 $G_t$ 是对预期回报的带噪声单样本估计。一种常见的解决方法是减去一个**基线**（通常是平均回报或学习到的价值函数），以减少方差而不引入偏差：

$$\theta \leftarrow \theta + \alpha \, \nabla_\theta \log \pi(a_t \mid s_t; \theta) \cdot (G_t - b)$$
- **演员–评论家（Actor–Critic）**方法使用两个网络。**演员**表示策略 $\pi(a \mid s; \theta)$；**评论家**表示值函数 $V(s; \phi)$，充当基线。优势 $A_t = r_t + \gamma V(s_{t+1}) - V(s_t)$ 取代 $G_t - b$：

$$\theta \leftarrow \theta + \alpha \, \nabla_\theta \log \pi(a_t \mid s_t; \theta) \cdot A_t$$
- 评论家通过最小化 TD 误差进行更新，就像基于价值的方法一样。演员使用策略梯度进行更新，并利用评论家的优势估计来降低方差。这结合了两者的优点。

![双头架构：演员输出动作概率，评论家输出价值估计，优势信号引导演员更新](../images/actor_critic.svg)


- **PPO**（近端策略优化）是实践中最常用的策略梯度算法。它解决了一个关键问题：如果策略更新过大，性能可能发生灾难性崩溃。

- PPO 使用**裁剪替代目标函数**。设 $r_t(\theta) = \frac{\pi(a_t | s_t; \theta)}{\pi(a_t | s_t; \theta_{\text{old}})}$ 为新旧策略的概率比。损失为：

$$\mathcal{L}^{\text{CLIP}}(\theta) = \mathbb{E} \left[ \min\!\left( r_t(\theta) A_t, \; \text{clip}(r_t(\theta), 1-\epsilon, 1+\epsilon) A_t \right) \right]$$
- 裁剪（通常为 $\epsilon = 0.2$）防止比值偏离 1，从而保持更新幅度小而稳定。如果优势为正（动作做得好），比值会被限制在 $1 + \epsilon$；如果优势为负（动作做得不好），比值会被限制在 $1 - \epsilon$。这种方法比早期的信赖域方法（TRPO）更简单、更稳定。

- PPO 通过**基于人类反馈的强化学习（RLHF）**训练类似 ChatGPT 的模型。在 RLHF 中，利用人类偏好数据（人类更喜欢两个输出中的哪一个？）训练奖励模型，然后由 PPO 优化语言模型的策略，以最大化这个学习到的奖励。

- **DPO**（直接偏好优化）简化了RLHF，完全移除奖励模型。它不先训练奖励模型再运行 RL，而是从偏好数据推导闭式损失，直接优化策略：

$$\mathcal{L}_{\text{DPO}}(\theta) = -\mathbb{E} \left[ \log \sigma\!\left( \beta \log \frac{\pi_\theta(y_w \mid x)}{\pi_{\text{ref}}(y_w \mid x)} - \beta \log \frac{\pi_\theta(y_l \mid x)}{\pi_{\text{ref}}(y_l \mid x)} \right) \right]$$
- $y_w$ 是人类偏好的（获胜）响应，$y_l$ 是不受偏好的（落选）响应。DPO 提高偏好输出的相对概率，实现起来比基于 PPO 的 RLHF 简单得多。

- RL 算法有两组重要区分。**在策略（on-policy）与离策略（off-policy）**：在策略方法（SARSA、PPO）从当前策略生成的数据中学习；离策略方法（Q-learning、DQN）可以使用任何策略生成的数据。离策略方法样本效率更高（可以复用旧数据），但稳定性可能较差。

- **基于模型与无模型**：无模型方法（如 SARSA、Q-learning 和策略梯度方法）直接从经验中学习价值或策略；基于模型的方法学习环境模型（$P(s' \mid s, a)$ 和 $R(s, a)$），再用它规划未来轨迹，即想象未来轨迹而无需实际执行动作。基于模型的方法样本效率更高，但增加了学习准确环境模型的复杂性。

**编者注：**原文把前文介绍的方法一概称为无模型方法，但其中的值迭代属于基于模型的方法；这里改为列举部分无模型方法。

- 总结 RL 领域：

| 方法 | 类型 | 关键思想 | 优势 |
|---|---|---|---|
| 值迭代 | DP，基于模型 | 贝尔曼最优性 | 小型 MDP 的精确解 |
| SARSA | TD，在策略 | 学习 Q，在策略 | 安全、保守 |
| Q-Learning | TD，离策略 | 学习 Q*，采用贪心目标 | 简单、有效 |
| DQN | 深度，离策略 | 神经网络 Q + 回放 + 目标网络 | 可扩展到高维状态 |
| REINFORCE | 策略梯度 | 对数概率梯度 × 回报 | 简单的策略优化 |
| 演员–评论家 | 策略梯度 + 值函数 | 演员和评论家降低方差 | 实用、灵活 |
| PPO | 策略梯度，裁剪 | 信任区域式稳定性 | 行业常用 |
| DPO | 直接偏好优化 | 跳过奖励模型 | 更简单的 RLHF |

## 编程任务（使用 CoLab 或笔记本）

1. 实现一个简单网格世界的值迭代。计算最优值函数并提取最优策略，将两者分别可视化为热图和箭头图。
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

2. 在一个简单的网格世界中实现表格 Q-learning。训练智能体，绘制学习曲线，并显示学到的 Q 值。

**编者注：**原文要求显示学到的 Q 值，但代码末尾只打印了贪心策略，没有输出 Q 表。
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

**编者注：**原文代码中 `grad_log_pi` 的计算与注释不符；它没有计算 `one_hot(action) - probs`，因此策略梯度更新有误。
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
