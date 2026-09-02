---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 05 - probability/04. bayesian.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: f6225ca0de169e09fcc8a03f9eed9beae3484d9020409f9f7580c463dbd524a3
status: reviewed
---
# 贝叶斯方法与序列模型

*贝叶斯方法将先验信念与观测数据结合起来，得到模型参数的后验分布。本篇涵盖最大似然估计、MAP 估计、共轭先验、贝叶斯推断、隐马尔可夫模型和 EM 算法；这些技术是垃圾邮件过滤器、语言模型和不确定性感知机器学习的基础。*

- 到目前为止，我们已经介绍了分布以及如何计算概率。现在来处理机器学习的核心问题：给定观测数据，怎样找到模型的最佳参数？

- **最大似然估计（Maximum Likelihood Estimation，MLE）**直接回答了这个问题：选择一组能让观测数据最可能出现的参数值。

- 形式化地说，给定数据 $D = \{x_1, x_2, \ldots, x_n\}$ 和参数为 $\theta$ 的模型，**似然函数**为：

$$L(\theta | D) = P(D | \theta) = \prod_{i=1}^{n} P(x_i | \theta)$$

- 这个乘积假设各数据点独立同分布（i.i.d.）。MLE 估计为：

$$\hat{\theta}_{\text{MLE}} = \arg\max_\theta L(\theta | D)$$

- 实际中我们通常改为最大化**对数似然**，因为对数可以把乘积变成求和，并防止数值下溢：

$$\ell(\theta) = \log L(\theta | D) = \sum_{i=1}^{n} \log P(x_i | \theta)$$

- 由于 $\log$ 是单调递增函数，使 $\ell(\theta)$ 最大的 $\theta$ 也会使 $L(\theta)$ 最大。

- **抛硬币例子**：抛一枚硬币 10 次，得到 7 次正面。硬币偏置 $p$（出现正面的概率）的 MLE 估计是多少？

- 每次抛掷都服从 Bernoulli($p$)，因此 10 次抛掷得到 7 次正面的似然为：

$$L(p) = \binom{10}{7} p^7 (1-p)^3$$

- 取对数并求导：$\frac{d\ell}{dp} = \frac{7}{p} - \frac{3}{1-p} = 0$，得到 $\hat{p}_{\text{MLE}} = 7/10 = 0.7$。

- MLE 直观而简单。如果 10 次抛掷中有 7 次正面，最可能的偏置就是 0.7。但请注意其中的问题：如果 10 次全是正面，MLE 会给出 $\hat{p} = 1$，意味着硬币以后总会落正面。仅凭 10 次观测就得出这样的结论，似乎过于自信。

- **最大后验估计（Maximum A Posteriori，MAP）**通过加入先验信念修复了这个问题。MAP 不只最大化似然，而是最大化后验：

$$\hat{\theta}_{\text{MAP}} = \arg\max_\theta P(\theta | D) = \arg\max_\theta P(D | \theta) \cdot P(\theta)$$

- 我们省略了分母中的 $P(D)$，因为它不依赖 $\theta$，不会影响 argmax。

- 先验 $P(\theta)$ 编码了我们在看到数据之前对 $\theta$ 的信念。如果为硬币偏置使用 Beta(2, 2) 先验（表示我们略微相信硬币大致公平），MAP 估计就不再只是正面所占的比例，而会被拉向 0.5。

![MLE 找到似然的峰值，MAP 找到似然与先验乘积的峰值](../images/mle_vs_map.svg)

- 使用 Beta($\alpha$, $\beta$) 先验，观测到 $h$ 次正面和 $t$ 次反面后，后验是 Beta($\alpha + h$, $\beta + t$)，MAP 估计为：

$$\hat{p}_{\text{MAP}} = \frac{\alpha + h - 1}{\alpha + \beta + h + t - 2}$$

- 对于 Beta(2,2) 先验、7 次正面和 3 次反面的例子：$\hat{p}_{\text{MAP}} = \frac{2 + 7 - 1}{2 + 2 + 10 - 2} = \frac{8}{12} = 0.667$。

- 注意，与 MLE（0.7）相比，MAP 估计（0.667）被拉向了 0.5。先验起到了正则化作用。在机器学习中，L2 正则化（权重衰减）恰好等价于对权重使用高斯先验的 MAP 估计。

- **完整的贝叶斯推断**比 MAP 更进一步。它不寻找单个最佳 $\theta$，而是保留完整的后验分布 $P(\theta | D)$。这样得到的不只是点估计，还有不确定性的度量。

- 对于 Beta(2,2) 先验、7 次正面和 3 次反面的有偏硬币，完整后验是 Beta(9, 5)。这个分布的均值为 $9/14 \approx 0.643$，它的离散程度告诉我们有多大的把握。数据越多，后验分布越窄。

- 这三种方法构成一个连续谱：
    - **MLE**：没有先验，只有数据。速度快，但数据少时可能过拟合。
    - **MAP**：加入先验正则化的点估计。更稳健。
    - **完整贝叶斯**：完整的后验分布。信息最丰富，但通常计算成本较高。

- **马尔可夫链**建模这样一类序列：下一个状态只依赖当前状态，而不依赖历史。这种“无记忆性”称为**马尔可夫性质**：

$$P(X_{t+1} | X_t, X_{t-1}, \ldots, X_1) = P(X_{t+1} | X_t)$$

- 可以想想天气：明天的天气取决于今天的天气，而不是上周的天气（这是一个简化，但出奇地有用）。

- 马尔可夫链有一个有限的**状态**集合，以及一个**转移矩阵** $T$。其中元素 $T_{ij}$ 表示从状态 $i$ 转移到状态 $j$ 的概率，每一行的和都为 1。

![包含下雨、晴天、多云状态及转移概率的天气马尔可夫链](../images/markov_chain.svg)

- 对于上面的天气例子，转移矩阵为：

```math
T = \begin{pmatrix} 0.3 & 0.4 & 0.3 \\ 0.2 & 0.5 & 0.3 \\ 0.4 & 0.3 & 0.3 \end{pmatrix}
```

- 如果今天下雨（状态向量 $\mathbf{s}_0 = [1, 0, 0]$），明天天气的概率分布就是 $\mathbf{s}_1 = \mathbf{s}_0 T = [0.3, 0.4, 0.3]$。两天后的分布为 $\mathbf{s}_2 = \mathbf{s}_0 T^2$。这里用到了第 1 章的矩阵乘法。

- 许多马尔可夫链会收敛到满足 $\pi T = \pi$ 的**平稳分布** $\pi$。无论从哪里开始，经过足够多步后，链都会稳定到 $\pi$。这一性质是 MCMC（Markov Chain Monte Carlo，马尔可夫链蒙特卡洛）的基础；MCMC 是贝叶斯机器学习中广泛使用的采样技术。

- **隐马尔可夫模型（Hidden Markov Models，HMM）**在马尔可夫链上增加了一层间接性。真实状态是隐藏的（不可观测），每个时间步由隐藏状态发出一个可观测信号。

![HMM 结构：上方的隐藏状态通过转移相连，下方的观测通过发射相连](../images/hmm_structure.svg)

- HMM 有三个组成部分：
    - **转移概率** $P(z_t | z_{t-1})$：隐藏状态如何演化（马尔可夫链）
    - **发射概率** $P(x_t | z_t)$：每个隐藏状态产生什么可观测输出
    - **初始分布** $P(z_1)$：起始隐藏状态的概率

- **雨伞例子**：假设你无法直接看到天气，但可以观察朋友是否带伞。隐藏状态是 {Rainy, Sunny}，观测值是 {Umbrella, No umbrella}。

- 转移概率：$P(\text{Rainy}|\text{Rainy}) = 0.7$、$P(\text{Sunny}|\text{Rainy}) = 0.3$、$P(\text{Rainy}|\text{Sunny}) = 0.4$、$P(\text{Sunny}|\text{Sunny}) = 0.6$。

- 发射概率：$P(\text{Umbrella}|\text{Rainy}) = 0.9$、$P(\text{No umbrella}|\text{Rainy}) = 0.1$、$P(\text{Umbrella}|\text{Sunny}) = 0.2$、$P(\text{No umbrella}|\text{Sunny}) = 0.8$。

- HMM 要回答的关键问题包括：
    - **解码**：给定观测，最可能的隐藏状态序列是什么？由 **Viterbi 算法**解决。
    - **评估**：一个观测序列的概率是多少？由**前向算法**解决。
    - **学习**：给定观测，最佳模型参数是什么？由 **Baum-Welch 算法**解决（它是期望最大化算法的一种实现）。

- **Viterbi 算法演示**：假设你观察到 [Umbrella, Umbrella, No umbrella]，想找出最可能的天气序列。

- 从初始概率开始。假设 $P(R) = 0.5$、$P(S) = 0.5$。

- **第 1 天**（观测到 Umbrella）：
    - $V_1(R) = P(R) \cdot P(U|R) = 0.5 \times 0.9 = 0.45$
    - $V_1(S) = P(S) \cdot P(U|S) = 0.5 \times 0.2 = 0.10$

- **第 2 天**（观测到 Umbrella）：
    - $V_2(R) = \max(V_1(R) \cdot P(R|R), V_1(S) \cdot P(R|S)) \cdot P(U|R)$
    - $= \max(0.45 \times 0.7, 0.10 \times 0.4) \times 0.9 = \max(0.315, 0.04) \times 0.9 = 0.2835$
    - $V_2(S) = \max(V_1(R) \cdot P(S|R), V_1(S) \cdot P(S|S)) \cdot P(U|S)$
    - $= \max(0.45 \times 0.3, 0.10 \times 0.6) \times 0.2 = \max(0.135, 0.06) \times 0.2 = 0.027$

- **第 3 天**（观测到 No umbrella）：
    - $V_3(R) = \max(0.2835 \times 0.7, 0.027 \times 0.4) \times 0.1 = 0.1985 \times 0.1 = 0.01985$
    - $V_3(S) = \max(0.2835 \times 0.3, 0.027 \times 0.6) \times 0.8 = 0.08505 \times 0.8 = 0.06804$

- 第 3 天的最大值对应 Sunny。回溯得到：第 3 天 = Sunny（来自 R），第 2 天 = Rainy（来自 R），第 1 天 = Rainy。最可能的序列是：**Rainy, Rainy, Sunny**。

- **前向—后向算法**根据完整观测序列，计算每个时间步处于各隐藏状态的概率。前向过程计算 $P(z_t, x_{1:t})$，后向过程计算 $P(x_{t+1:T} | z_t)$。将二者相乘，就能得到平滑后的状态概率。

- 当隐藏状态不可观测时，**Baum-Welch 算法**从数据中学习 HMM 参数。它是一种期望最大化（Expectation-Maximisation，EM）算法：E 步使用前向—后向算法估计哪些隐藏状态生成了观测，M 步更新转移概率和发射概率。

- HMM 历史上曾主导语音识别（隐藏的音素状态发出声学信号）和生物信息学（隐藏的基因状态发出 DNA 碱基对）领域。虽然深度学习已经在很大程度上取代了这些领域中的 HMM，但隐藏状态、发射和序列推断这些思想仍然是序列模型的核心。

- **条件随机场（Conditional Random Fields，CRF）**通过移除对发射的独立性假设来改进 HMM。在 HMM 中，时间 $t$ 的观测只依赖时间 $t$ 的隐藏状态；CRF 则允许位置 $t$ 的标签依赖整个输入序列。

- 线性链 CRF 建模给定输入序列 $\mathbf{x}$ 时标签序列 $\mathbf{y}$ 的条件概率：

$$P(\mathbf{y} | \mathbf{x}) = \frac{1}{Z(\mathbf{x})} \exp\!\left(\sum_t \left[\sum_k \lambda_k f_k(y_t, y_{t-1}, \mathbf{x}, t)\right]\right)$$

- 这里 $f_k$ 是特征函数（可以查看输入的任意部分），$\lambda_k$ 是学习得到的权重，$Z(\mathbf{x})$ 是归一化常数。

- CRF 是判别式模型（直接建模 $P(\mathbf{y}|\mathbf{x})$），而 HMM 是生成式模型（建模 $P(\mathbf{x}, \mathbf{y})$）。这一区分与逻辑回归（判别式）和朴素贝叶斯（生成式）之间的区别相同。

- 在现代 NLP 中，CRF 层经常添加在神经网络（BiLSTM-CRF、BERT-CRF）之上，用于命名实体识别和词性标注等重视标签依赖关系的任务。

## 编程任务（使用 CoLab 或 notebook）

1. 为抛硬币实验实现 MLE 和 MAP。观察在不同先验和不同数据量下，MAP 估计如何变化。
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt

# Data: observed coin flips
heads, tails = 7, 3

# MLE
p_mle = heads / (heads + tails)
print(f"MLE: {p_mle:.4f}")

# MAP with Beta prior
for alpha, beta in [(1,1), (2,2), (5,5), (10,10)]:
    p_map = (alpha + heads - 1) / (alpha + beta + heads + tails - 2)
    print(f"MAP (Beta({alpha},{beta})): {p_map:.4f}")

# Visualise posterior for Beta(2,2) prior
theta = jnp.linspace(0.01, 0.99, 200)
# Posterior is Beta(alpha+heads, beta+tails)
a_post, b_post = 2 + heads, 2 + tails
posterior = theta**(a_post-1) * (1-theta)**(b_post-1)
posterior = posterior / jnp.trapezoid(posterior, theta)

plt.figure(figsize=(8, 4))
plt.plot(theta, posterior, color="#e74c3c", linewidth=2, label=f"Posterior Beta({a_post},{b_post})")
plt.axvline(p_mle, color="#3498db", linestyle="--", label=f"MLE = {p_mle:.2f}")
plt.axvline((a_post-1)/(a_post+b_post-2), color="#e74c3c", linestyle="--", label=f"MAP = {(a_post-1)/(a_post+b_post-2):.3f}")
plt.xlabel("θ (coin bias)")
plt.ylabel("Density")
plt.title("Posterior distribution after 7H, 3T with Beta(2,2) prior")
plt.legend()
plt.grid(alpha=0.3)
plt.show()
```

2. 为天气模型构建马尔可夫链并进行模拟。分别通过模拟和求解 $\pi T = \pi$ 计算平稳分布。
```python
import jax
import jax.numpy as jnp

# Transition matrix: R, S, C
T = jnp.array([
    [0.3, 0.4, 0.3],
    [0.2, 0.5, 0.3],
    [0.4, 0.3, 0.3]
])
states = ["Rainy", "Sunny", "Cloudy"]

# Simulate 100,000 steps
key = jax.random.PRNGKey(42)
n_steps = 100_000
state = 0  # start rainy
counts = jnp.zeros(3)

for i in range(n_steps):
    key, subkey = jax.random.split(key)
    state = jax.random.choice(subkey, 3, p=T[state])
    counts = counts.at[state].add(1)

sim_stationary = counts / n_steps
print("Simulated stationary distribution:")
for s, p in zip(states, sim_stationary):
    print(f"  {s}: {p:.4f}")

# Analytical: find left eigenvector with eigenvalue 1
eigenvalues, eigenvectors = jnp.linalg.eig(T.T)
idx = jnp.argmin(jnp.abs(eigenvalues - 1.0))
pi = jnp.real(eigenvectors[:, idx])
pi = pi / pi.sum()
print("\nAnalytical stationary distribution:")
for s, p in zip(states, pi):
    print(f"  {s}: {p:.4f}")
```

3. 为雨伞 HMM 实现 Viterbi 算法，并解码一个观测序列。
```python
import jax.numpy as jnp

# HMM parameters
states = ["Rainy", "Sunny"]
obs_names = ["Umbrella", "No umbrella"]

trans = jnp.array([[0.7, 0.3],   # R->R, R->S
                    [0.4, 0.6]])  # S->R, S->S

emit = jnp.array([[0.9, 0.1],    # R->U, R->noU
                   [0.2, 0.8]])   # S->U, S->noU

init = jnp.array([0.5, 0.5])

# Observations: U=0, noU=1
observations = [0, 0, 1]  # Umbrella, Umbrella, No umbrella

def viterbi(obs, init, trans, emit):
    n_states = len(init)
    T = len(obs)
    V = jnp.zeros((T, n_states))
    path = jnp.zeros((T, n_states), dtype=int)

    # Initialisation
    V = V.at[0].set(init * emit[:, obs[0]])

    # Recursion
    for t in range(1, T):
        for j in range(n_states):
            probs = V[t-1] * trans[:, j]
            V = V.at[t, j].set(jnp.max(probs) * emit[j, obs[t]])
            path = path.at[t, j].set(jnp.argmax(probs))

    # Backtrack
    best = [int(jnp.argmax(V[-1]))]
    for t in range(T-1, 0, -1):
        best.insert(0, int(path[t, best[0]]))
    return best, V

decoded, scores = viterbi(observations, init, trans, emit)
print("Observations:", [obs_names[o] for o in observations])
print("Decoded:     ", [states[s] for s in decoded])
```

4. 可视化随着观测到更多抛硬币结果，后验如何演化。从 Beta(1,1) 先验（均匀分布）开始，在每次抛掷后更新。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

theta = jnp.linspace(0.01, 0.99, 300)
key = jax.random.PRNGKey(7)

# True bias = 0.65
flips = jax.random.bernoulli(key, p=0.65, shape=(50,))

plt.figure(figsize=(10, 5))
a, b = 1, 1  # Beta(1,1) = uniform

for n_obs in [0, 1, 5, 10, 25, 50]:
    h = int(flips[:n_obs].sum())
    t = n_obs - h
    a_post = a + h
    b_post = b + t
    y = theta**(a_post-1) * (1-theta)**(b_post-1)
    y = y / jnp.trapezoid(y, theta)
    plt.plot(theta, y, linewidth=2, label=f"n={n_obs} (h={h})")

plt.axvline(0.65, color="black", linestyle=":", alpha=0.5, label="true p=0.65")
plt.xlabel("θ")
plt.ylabel("Density")
plt.title("Bayesian updating: posterior narrows with more data")
plt.legend()
plt.grid(alpha=0.3)
plt.show()
```
