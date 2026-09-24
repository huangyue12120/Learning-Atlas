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
# Bayesian Methods and Sequential Models

*Bayesian methods combine prior beliefs with observed data to produce posterior distributions over model parameters. This file covers maximum likelihood estimation, MAP estimation, conjugate priors, Bayesian inference, hidden Markov models, and the EM algorithm, techniques behind spam filters, language models, and uncertainty-aware ML.*

- So far we have described distributions and how to compute probabilities. Now we tackle the question at the heart of ML: given observed data, how do we find the best parameters for our model?

- **Maximum Likelihood Estimation (MLE)** answers this directly. Pick the parameter values that make the observed data most probable.

- 形式上，给定数据 $D = \{x_1, x_2, \ldots, x_n\}$ 和一个具有参数 $\theta$ 的模型，**似然函数**是：

$$L(\theta | D) = P(D | \theta) = \prod_{i=1}^{n} P(x_i | \theta)$$
- 该乘积假设数据点独立且同分布（i.i.d.）。MLE估计是：

$$\hat{\theta}_{\text{MLE}} = \arg\max_\theta L(\theta | D)$$
- 在实践中，我们最大化 **对数似然** 而不是直接似然，因为对数将乘积转换为和，并防止数值下溢。

$$\ell(\theta) = \log L(\theta | D) = \sum_{i=1}^{n} \log P(x_i | \theta)$$
- 由于 $\log$ 是单调递增的，使得 $\theta$ 最大化的 $\ell(\theta)$ 也最大化了 $L(\theta)$。

- **掷硬币示例**：你抛掷一枚硬币10次，得到7次正面。硬币的MLE估计是其偏向度。 $p$ （概率）？

- 每次翻转是伯努利分布（$p$），因此在10次翻转中出现7个头的概率为：

$$L(p) = \binom{10}{7} p^7 (1-p)^3$$
- Taking the log and differentiating: $\frac{d\ell}{dp} = \frac{7}{p} - \frac{3}{1-p} = 0$, which gives $\hat{p}_{\text{MLE}} = 7/10 = 0.7$.

- MLE is intuitive and simple. If you got 7 heads in 10 flips, the most likely bias is 0.7. But notice the problem: if you got 10 heads in 10 flips, MLE says $\hat{p} = 1$, meaning the coin will always land heads. that seems overconfident given only 10 observations.

- **最大后验（MAP）**通过添加先验信念来解决这个问题。它不仅最大化了似然，还最大化了后验：

$$\hat{\theta}_{\text{MAP}} = \arg\max_\theta P(\theta | D) = \arg\max_\theta P(D | \theta) \cdot P(\theta)$$
- 我们从分母中删除了$P(D)$，因为它不依赖于$\theta$且不会影响argmax。

- 先验$P(\theta)$编码了我们看到数据之前关于$\theta$的信念。如果我们使用Beta(2, 2)先验来表达对硬币偏好的轻微信念（即硬币大致公平），MAP估计不再简单地是头的比例。它被拉向0.5。

![MLE找到似然函数的峰值；MAP找到似然函数乘以先验的峰值。](../images/mle_vs_map.svg)


- 使用Beta($\alpha$, $\beta$)先验和观察到$h$个头和$t$个尾后，后验是Beta($\alpha + h$, $\beta + t$)，MAP估计为：

$$\hat{p}_{\text{MAP}} = \frac{\alpha + h - 1}{\alpha + \beta + h + t - 2}$$
- 对于我们的例子，使用beta(2, 2)先验、7个头和3个尾：$\hat{p}_{\text{MAP}} = \frac{2 + 7 - 1}{2 + 2 + 10 - 2} = \frac{8}{12} = 0.667$。

- 注意到MAP估计（0.667）比MLE（0.7）更接近0.5。先验起到了正则化的作用。在ML中，L2正则化（权重衰减）与MAP估计使用高斯先验分布完全等效。

- 全贝叶斯推理比MAP更进一步。它不仅寻找一个最佳的$\theta$，而是维护整个后验分布$P(\theta | D)$。这不仅给你一个点估计，还给你一个不确定性度量。

- 对于Beta(2,2)先验和7次正面，3次反面的全后验是Beta(9, 5)。这个分布的均值是$9/14 \approx 0.643$，它告诉我们我们的信心程度。随着更多数据的出现，后验会变得更窄。

- 这三种方法形成了一条谱系：
    - **MLE**: 没有先验，只用数据。速度快，但小数据时容易过拟合。
    - **MAP**: 点估计加上先验正则化。增加了鲁棒性。
    - **Full Bayesian**: 整个后验分布。最信息丰富，但通常计算成本高。

- **马尔可夫链**模型序列，其中下一个状态仅依赖于当前状态，而不受历史影响。这种“无记忆”特性称为**马尔可夫性质**：

$$P(X_{t+1} | X_t, X_{t-1}, \ldots, X_1) = P(X_{t+1} | X_t)$$
- 想象一下天气。明天的天气取决于今天的情况，但不考虑上周（简化但非常有用）。

- 马尔可夫链有一个有限的状态集合和一个**转移矩阵** $T$，其中条目 $T_{ij}$ 表示从状态 $i$ 到状态 $j$ 的概率。每行的总和为 1。

![三维空间中的向量](../images/markov_chain.svg)


- 对于上述天气示例，状态转移矩阵为：

```math
T = \begin{pmatrix} 0.3 & 0.4 & 0.3 \\ 0.2 & 0.5 & 0.3 \\ 0.4 & 0.3 & 0.3 \end{pmatrix}
```

- 如果今天是下雨（状态向量 $\mathbf{s}_0 = [1, 0, 0]$），明天的天气概率分布是 $\mathbf{s}_1 = \mathbf{s}_0 T = [0.3, 0.4, 0.3]$。两天后： $\mathbf{s}_2 = \mathbf{s}_0 T^2$。这使用了第一章中的矩阵乘法。

- 大多数马尔可夫链收敛到一个 **平稳分布** $\pi$，使得 $\pi T = \pi$。无论你从哪里开始，经过足够步数后，链会稳定在 $\pi$。这个性质是 MCMC（马尔可夫链蒙特卡洛）的基础，这是一种广泛使用的贝叶斯 ML 中常用的采样技术。

- 隐式马尔可夫模型（HMMs）通过增加一层间接性来扩展马尔可夫链。真实状态是隐藏的（未观察到），在每个时间步，隐藏状态会发出一个可观测信号。

![隐马尔可夫模型结构：隐藏状态在顶部通过转换连接，观测在底部通过发射连接](../images/hmm_structure.svg)


- 一个 HMM 包含三个组成部分：
    - **转移概率** $P(z_t | z_{t-1})$：隐藏状态如何演变（马尔可夫链）
    - **发射概率** $P(x_t | z_t)$：每个隐藏状态产生的可观测输出
    - **初始分布** $P(z_1)$：起始隐藏状态的概率分布

- **伞的例子**：假设你不能直接看到天气，但你可以观察到你的朋友是否携带了伞。隐藏状态是{下雨，晴天}，观测结果是{伞，无伞}。

- 转移概率：$P(\text{Rainy}|\text{Rainy}) = 0.7$，$P(\text{Sunny}|\text{Rainy}) = 0.3$，$P(\text{Rainy}|\text{Sunny}) = 0.4$，$P(\text{Sunny}|\text{Sunny}) = 0.6$。

- 发射概率：$P(\text{Umbrella}|\text{Rainy}) = 0.9$，$P(\text{No umbrella}|\text{Rainy}) = 0.1$，$P(\text{Umbrella}|\text{Sunny}) = 0.2$，$P(\text{No umbrella}|\text{Sunny}) = 0.8$。

- HMMs的关键问题包括：
    - **解码**：给定观测，最可能的隐藏状态序列是什么？使用**维特比算法**解决。
    - **评估**：观测序列的概率是多少？使用**前向算法**解决。
    - **学习**：给定观测，最佳模型参数是什么？使用**贝叶斯-韦尔奇算法**（一种期望最大化实例）。

- **维特比遍历**：假设你观察到 [雨伞，雨伞，无雨伞] 并且想要找到最可能的天气序列。

- 从初始概率开始。假设 $P(R) = 0.5$, $P(S) = 0.5$。

- **第 1 天**（观察伞）：
    - $V_1(R) = P(R) \cdot P(U|R) = 0.5 \times 0.9 = 0.45$
    - $V_1(S) = P(S) \cdot P(U|S) = 0.5 \times 0.2 = 0.10$

- **第 2 天**（观察伞）：
    - $V_2(R) = \max(V_1(R) \cdot P(R|R), V_1(S) \cdot P(R|S)) \cdot P(U|R)$
    - $= \max(0.45 \times 0.7, 0.10 \times 0.4) \times 0.9 = \max(0.315, 0.04) \times 0.9 = 0.2835$
    - $V_2(S) = \max(V_1(R) \cdot P(S|R), V_1(S) \cdot P(S|S)) \cdot P(U|S)$
    - $= \max(0.45 \times 0.3, 0.10 \times 0.6) \times 0.2 = \max(0.135, 0.06) \times 0.2 = 0.027$

- **第 3 天**（观察无伞）：
    - $V_3(R) = \max(0.2835 \times 0.7, 0.027 \times 0.4) \times 0.1 = 0.1985 \times 0.1 = 0.01985$
    - $V_3(S) = \max(0.2835 \times 0.3, 0.027 \times 0.6) \times 0.8 = 0.08505 \times 0.8 = 0.06804$

- 第 3 天的最大值在晴天。回溯：第 3 天 = 晴天（从 R），第 2 天 = 阴天（从 R），第 1 天 = 阴天。最可能的序列：**阴天，阴天，晴天**.

- **前向后向算法**计算在每个时间步点上处于每个隐藏状态的概率，给定整个观察序列。前向传播计算 $P(z_t, x_{1:t})$，后向传播计算 $P(x_{t+1:T} | z_t)$。将这些相乘得到平滑的状态概率值。

- **贝叶斯滤波器算法**从数据中学习 HMM 参数时，当隐藏状态未被观察到时。它是期望最大化（EM）算法：E 步使用前向后向计算生成观测的隐藏状态概率，M 步更新转移和发射概率。

- 隐马尔可夫模型（HMM）在语音识别和生物信息学领域曾经占据主导地位，因为它们能够通过隐藏的声学状态来生成声波信号。然而，在这些领域中，深度学习已经大大取代了HMM。尽管如此，隐藏状态、发射序列以及顺序推理的概念仍然是序列模型的核心思想。

- **条件随机字段（CRF）**通过消除观测的独立性假设，改进了HMMs。在HMM中，时间$t$的观察仅依赖于时间$t$的隐藏状态。CRFs允许位置$t$的标签取决于整个输入序列。

- 线性链CRF模型给定输入序列$\mathbf{x}$的标签序列$\mathbf{y}$的条件概率。

$$P(\mathbf{y} | \mathbf{x}) = \frac{1}{Z(\mathbf{x})} \exp\!\left(\sum_t \left[\sum_k \lambda_k f_k(y_t, y_{t-1}, \mathbf{x}, t)\right]\right)$$
- 这里 $f_k$ 是特征函数（可以查看输入的任何部分），$\lambda_k$ 是学习权重，而 $Z(\mathbf{x})$ 是一个归一化常数。

- CRFs 是判别模型（它们直接建模 $P(\mathbf{y}|\mathbf{x})$），而 HMMs 是生成模型（它们建模 $P(\mathbf{x}, \mathbf{y})$）。这种区别与逻辑回归（判别）和朴素贝叶斯（生成）相同。

- 在现代 NLP 中，CRF 层通常被添加在神经网络（如 BiLSTM-CRF、BERT-CRF）之上，用于任务如命名实体识别和词性标注，其中捕捉标签依赖是重要的。

## 编程任务（使用 CoLab 或笔记本）

1. 实现 MLE 和 MAP 对于硬币抛掷实验。观察随着不同先验和不同数据量时的 MAP 估计的变化。
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

2. 构建一个马尔可夫链来模拟天气模型，并进行模拟。通过计算平稳分布，既可以通过模拟也可以通过求解 $\pi T = \pi$ 来实现。
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

3. 实现 umbrella HMM 的维特比算法，并对观测序列进行解码。
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

4. 观察随着更多硬币抛掷时后验分布的变化。从初始的 Beta(1,1) 先验（均匀）开始，每次更新后都进行更新。
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
