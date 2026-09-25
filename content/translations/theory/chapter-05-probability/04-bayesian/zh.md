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

*贝叶斯方法把先验信念与观测数据结合起来，得到模型参数的后验分布。本文件涵盖最大似然估计、MAP 估计、共轭先验、贝叶斯推断、隐马尔可夫模型和 EM 算法，这些方法支撑垃圾邮件过滤器、语言模型和不确定性感知的机器学习。*

- 前面已经介绍了分布和概率计算。现在回到机器学习的核心问题：给定观测数据，怎样找到模型的最佳参数？

- **最大似然估计（MLE）**直接回答这个问题：选择能使观测数据似然最大的参数。

- 形式上，给定数据 $D = \{x_1, x_2, \ldots, x_n\}$ 和一个具有参数 $\theta$ 的模型，**似然函数**是：

$$L(\theta | D) = P(D | \theta) = \prod_{i=1}^{n} P(x_i | \theta)$$
- 该乘积假设数据点独立同分布（i.i.d.）。最大似然估计为：

$$\hat{\theta}_{\text{MLE}} = \arg\max_\theta L(\theta | D)$$
- 在实践中，我们改为最大化 **对数似然**，因为对数会把乘积转换为求和，并防止数值下溢。

$$\ell(\theta) = \log L(\theta | D) = \sum_{i=1}^{n} \log P(x_i | \theta)$$
- 由于 $\log$ 单调递增，使 $\ell(\theta)$ 最大化的 $\theta$ 也会使 $L(\theta)$ 最大化。

- **抛硬币示例**：你抛一枚硬币 10 次，得到 7 次正面。硬币正面朝上的概率 $p$ 的 MLE 估计是多少？

- 每次抛掷都服从伯努利分布（$p$），因此 10 次抛掷得到 7 次正面的似然为：

$$L(p) = \binom{10}{7} p^7 (1-p)^3$$
- 取对数并求导：$\frac{d\ell}{dp} = \frac{7}{p} - \frac{3}{1-p} = 0$，得到 $\hat{p}_{\text{MLE}} = 7/10 = 0.7$。

- MLE 直观而简单。10 次抛掷得到 7 次正面时，最可能的正面概率是 0.7。但如果 10 次全是正面，MLE 会给出 $\hat{p} = 1$，仿佛硬币一定次次正面；仅凭 10 次观测，这个结论过于自信。

- **最大后验概率估计（MAP）**通过加入先验信息来缓解这个问题。它最大化的是后验概率：

$$\hat{\theta}_{\text{MAP}} = \arg\max_\theta P(\theta | D) = \arg\max_\theta P(D | \theta) \cdot P(\theta)$$
- 我们省略了分母中的 $P(D)$，因为它不依赖于 $\theta$，不会影响 argmax。

- 先验分布 $P(\theta)$ 表示观察数据前我们对参数 $\theta$ 的认识。如果用 Beta(2, 2) 先验温和地表达“硬币大致公平”的信念，MAP 估计就不再只是正面比例，而会向 0.5 收缩。

![MLE找到似然函数的峰值；MAP找到似然函数乘以先验的峰值。](../images/mle_vs_map.svg)


- 使用 Beta($\alpha$, $\beta$) 先验，观察到 $h$ 次正面和 $t$ 次反面后，后验分布为 Beta($\alpha + h$, $\beta + t$)。当 $\alpha+h>1$ 且 $\beta+t>1$ 时，MAP 估计为：

$$\hat{p}_{\text{MAP}} = \frac{\alpha + h - 1}{\alpha + \beta + h + t - 2}$$

**编者注：**若后验参数不满足上述条件，众数可能位于区间边界，不能直接套用该公式。
- 在这个例子中，使用 Beta(2, 2) 先验、7 次正面和 3 次反面时：$\hat{p}_{\text{MAP}} = \frac{2 + 7 - 1}{2 + 2 + 10 - 2} = \frac{8}{12} = 0.667$。

- 可以看到，MAP 估计（0.667）相比 MLE（0.7）更接近 0.5。先验起到了正则化作用。在机器学习中，L2 正则化（权重衰减）与对权重使用高斯先验的 MAP 估计完全等价。

- **完整贝叶斯推断**比 MAP 更进一步：它不寻找单个最佳 $\theta$，而是维护整个后验分布 $P(\theta | D)$。因此得到的不仅是点估计，还有不确定性度量。

- 对于 Beta(2,2) 先验、7 次正面和 3 次反面，完整后验是 Beta(9, 5)。该分布的均值为 $9/14 \approx 0.643$，其宽度反映了我们的置信程度；数据越多，后验分布越窄。

- 这三种方法在先验信息和结果形式上逐步递进：
    - **MLE**：只用数据，不加入先验。速度快，但数据量较小时容易过拟合。
    - **MAP**：结合先验，给出一个点估计，通常更稳健。
    - **完整贝叶斯推断**：保留整个后验分布，提供的信息最丰富，但计算成本通常更高。

- **马尔可夫链**用于描述状态序列，其中下一个状态只依赖当前状态，不依赖更早的历史。这一性质称为**马尔可夫性质**：

$$P(X_{t+1} | X_t, X_{t-1}, \ldots, X_1) = P(X_{t+1} | X_t)$$
- 以天气为例：明天的天气取决于今天的天气，而不直接依赖上周的天气。这是一个简化假设，但很有用。

- 马尔可夫链有一个有限的状态集合和一个**转移矩阵** $T$，其中条目 $T_{ij}$ 表示从状态 $i$ 到状态 $j$ 的概率。每行的总和为 1。

![天气马尔可夫链：下雨、晴天和多云状态及其转移概率](../images/markov_chain.svg)


- 对于上述天气示例，状态转移矩阵为：

```math
T = \begin{pmatrix} 0.3 & 0.4 & 0.3 \\ 0.2 & 0.5 & 0.3 \\ 0.4 & 0.3 & 0.3 \end{pmatrix}
```

- 如果今天是下雨（状态向量 $\mathbf{s}_0 = [1, 0, 0]$），明天的天气概率分布是 $\mathbf{s}_1 = \mathbf{s}_0 T = [0.3, 0.4, 0.3]$。两天后： $\mathbf{s}_2 = \mathbf{s}_0 T^2$。这使用了第一章中的矩阵乘法。

- 满足适当条件的马尔可夫链会收敛到**平稳分布** $\pi$，使得 $\pi T = \pi$。例如，对有限状态链，不可约且非周期可保证从任意初始状态收敛到唯一平稳分布。**编者注：**原文的收敛结论并不适用于所有马尔可夫链。MCMC（马尔可夫链蒙特卡洛）利用这类链从目标分布抽样，是贝叶斯机器学习中的常用方法。

- **隐马尔可夫模型（HMM）**在马尔可夫链上加入不可观测的隐藏状态；每个时间步的隐藏状态会生成一个可观测信号。

![隐马尔可夫模型结构：隐藏状态在顶部通过转换连接，观测在底部通过发射连接](../images/hmm_structure.svg)


- 一个 HMM 包含三个组成部分：
    - **转移概率** $P(z_t | z_{t-1})$：隐藏状态如何演变（马尔可夫链）
    - **发射概率** $P(x_t | z_t)$：每个隐藏状态产生的可观测输出
    - **初始分布** $P(z_1)$：起始隐藏状态的概率分布

- **雨伞示例**：假设你看不到天气，只能观察朋友是否带伞。隐藏状态为 {下雨、晴天}，观测结果为 {带伞、不带伞}。

- 转移概率：$P(\text{Rainy}|\text{Rainy}) = 0.7$，$P(\text{Sunny}|\text{Rainy}) = 0.3$，$P(\text{Rainy}|\text{Sunny}) = 0.4$，$P(\text{Sunny}|\text{Sunny}) = 0.6$。

- 发射概率：$P(\text{Umbrella}|\text{Rainy}) = 0.9$，$P(\text{No umbrella}|\text{Rainy}) = 0.1$，$P(\text{Umbrella}|\text{Sunny}) = 0.2$，$P(\text{No umbrella}|\text{Sunny}) = 0.8$。

- HMM 的关键问题包括：
    - **解码**：给定观测，最可能的隐藏状态序列是什么？使用**维特比算法**解决。
    - **评估**：观测序列的概率是多少？使用**前向算法**解决。
    - **学习**：给定观测，最佳模型参数是什么？使用**鲍姆–韦尔奇算法**（期望最大化算法的一种）。

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

- 第 3 天的最大值对应晴天。回溯得到：第 3 天为晴天（从雨天转移而来），第 2 天为雨天（从雨天转移而来），第 1 天为雨天。最可能的序列是：**下雨、下雨、晴天**。

- **前向–后向算法**根据完整观测序列，计算每个时间步处于各隐藏状态的概率。前向传播计算 $P(z_t, x_{1:t})$，后向传播计算 $P(x_{t+1:T} | z_t)$；将两者相乘并按状态归一化，得到平滑后的状态概率。

- **鲍姆–韦尔奇算法**在隐藏状态不可观测时从数据中学习 HMM 参数。它属于期望最大化（EM）算法：E 步使用前向–后向算法估计生成观测的隐藏状态概率，M 步更新转移概率和发射概率。

- 隐马尔可夫模型（HMM）曾在语音识别和生物信息学领域占据主导地位：在语音识别中，隐藏的音素状态发出声学信号；在生物信息学中，隐藏的基因状态发出 DNA 碱基对。尽管深度学习已在这些领域大体取代 HMM，隐藏状态、发射信号和序列推断的思想仍是序列模型的核心。

- **条件随机场（CRF）**放宽了 HMM 对观测的条件独立假设。在 HMM 中，给定隐藏状态后，各时刻的观测条件独立；CRF 则允许位置 $t$ 的标签依赖整个输入序列。

- 线性链 CRF 对给定输入序列 $\mathbf{x}$ 的标签序列 $\mathbf{y}$ 的条件概率进行建模。

$$P(\mathbf{y} | \mathbf{x}) = \frac{1}{Z(\mathbf{x})} \exp\!\left(\sum_t \left[\sum_k \lambda_k f_k(y_t, y_{t-1}, \mathbf{x}, t)\right]\right)$$
- 这里 $f_k$ 是特征函数（可以查看输入的任何部分），$\lambda_k$ 是学习权重，而 $Z(\mathbf{x})$ 是一个归一化常数。

- CRF 是判别模型（直接建模 $P(\mathbf{y}|\mathbf{x})$），而 HMM 是生成模型（建模 $P(\mathbf{x}, \mathbf{y})$）。这种区别与逻辑回归（判别式）和朴素贝叶斯（生成式）相同。

- 在现代 NLP 中，CRF 层通常添加在神经网络（如 BiLSTM-CRF、BERT-CRF）之上，用于命名实体识别、词性标注等任务；在这些任务中，捕捉标签之间的依赖很重要。

## 编程任务（使用 CoLab 或笔记本）

1. 为硬币抛掷实验实现 MLE 和 MAP。比较不同先验和数据量下的 MAP 估计。
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

3. 实现雨伞 HMM 的维特比算法，并对观测序列进行解码。
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

4. 观察随着抛掷次数增加，后验分布如何变化。从均匀的 Beta(1,1) 先验开始，每观察一次抛掷结果就更新一次。
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
