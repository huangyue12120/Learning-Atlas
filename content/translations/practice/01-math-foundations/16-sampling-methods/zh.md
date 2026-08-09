---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/01-math-foundations/16-sampling-methods/docs/en.md
  revision: 7157ca74a135fad2165f680ec4b4e592f075ec21
  sha256: 387bb3952f9a86f59c898179ec88597a8e9719e662ecab1b6b93bd6a977c2616
status: reviewed
---

# 抽样方法

> 抽样让 AI 能探索可能性的空间。

**类型：** 实作
**语言：** Python
**前置课程：** 第 1 阶段第 06–07 课（概率、贝叶斯定理）
**预计时间：** 约 120 分钟

## 学习目标

- 仅使用均匀随机数，从零实现逆 CDF、拒绝抽样和重要性抽样
- 为语言模型的词元生成构建温度抽样、top-k 和 top-p（核采样）
- 解释重参数化技巧，以及它为何能让 VAE 中的抽样过程支持反向传播
- 运行 Metropolis–Hastings MCMC，从未归一化的目标分布中抽样

## 问题

语言模型处理完你的提示词后，会生成一个包含 50,000 个 logit 的向量，词汇表中的每个词元各对应一个。现在它必须从中选出一个。该怎么选？

如果它总是选择概率最高的词元，每次回答都会完全相同：确定，却无趣。若完全均匀随机地选择，输出又会变成毫无意义的乱码。答案位于这两个极端之间，而抽样决定了这个平衡点。

抽样并不局限于文本生成。强化学习通过抽样轨迹来估计策略梯度；VAE 通过从已学习的分布中抽样，并穿过随机性进行反向传播来学习潜在表示；扩散模型通过抽样噪声并迭代去噪来生成图像；蒙特卡洛方法用于估计没有闭式解的积分；MCMC 算法则探索无法枚举的高维后验分布。

每个生成式 AI 系统都是一个抽样系统。抽样策略决定输出的质量、多样性与可控性。本课将从均匀随机数出发，从零构建各种主要的抽样方法，直至驱动现代 LLM 和生成模型的技术。

## 概念

### 为什么抽样重要

抽样在 AI 和机器学习中承担四种基础角色：

**生成。**语言模型、扩散模型和 GAN 都通过抽样产生输出。抽样算法直接控制创造性、连贯性和多样性。温度、top-k 与核采样是工程师每天调节的旋钮。

**训练。**随机梯度下降会抽取小批量数据；Dropout 会抽取要停用的神经元；数据增强会抽取随机变换；重要性抽样会对样本重新加权，以降低强化学习（PPO、TRPO）中的梯度方差。

**估计。**机器学习中的许多量没有闭式解，例如数据分布上的期望损失、基于能量模型的配分函数，以及贝叶斯推断中的证据。蒙特卡洛估计通过对样本求平均来近似计算这些量。

**探索。**MCMC 算法用于探索贝叶斯推断中的后验分布；进化策略会抽取参数扰动；Thompson 抽样在多臂老虎机问题中平衡探索与利用。

核心挑战在于：你只能直接从简单分布（均匀分布、正态分布）中抽样。对于其他分布，则需要一种方法把简单样本转换为目标分布的样本。

### 均匀随机抽样

所有抽样方法都从这里开始。均匀随机数生成器会在 [0, 1) 中生成数值，其中任意等长子区间出现的概率相同。

```
U ~ Uniform(0, 1)

P(a <= U <= b) = b - a    其中 0 <= a <= b <= 1

性质：
  E[U] = 0.5
  Var(U) = 1/12
```

要从包含 n 个元素的离散集合中均匀抽样，生成 U 后返回 floor(n * U)。要从连续区间 [a, b] 中抽样，计算 a + (b - a) * U。

关键洞见是：一个均匀随机数恰好包含从任意分布中生成一个样本所需的随机性。诀窍在于找到正确的变换。

### 逆 CDF 方法（逆变换抽样）

累积分布函数（CDF）将数值映射为概率：

```
F(x) = P(X <= x)

性质：
  F 单调不减
  F(-inf) = 0
  F(+inf) = 1
  F 将实数轴映射到 [0, 1]
```

逆 CDF 会将概率映射回数值。若 U ~ Uniform(0, 1)，则 X = F_inverse(U) 服从目标分布。

```
算法：
  1. 生成 u ~ Uniform(0, 1)
  2. 返回 F_inverse(u)

为何有效：
  P(X <= x) = P(F_inverse(U) <= x) = P(U <= F(x)) = F(x)
```

**指数分布示例：**

```
PDF: f(x) = lambda * exp(-lambda * x),   x >= 0
CDF: F(x) = 1 - exp(-lambda * x)

求解 F(x) = u，解出 x：
  u = 1 - exp(-lambda * x)
  exp(-lambda * x) = 1 - u
  x = -ln(1 - u) / lambda

由于 (1 - U) 与 U 同分布：
  x = -ln(u) / lambda
```

当能够写出 F_inverse 的闭式表达时，该方法十分有效。对于正态分布，不存在闭式的逆 CDF，因此需要使用其他方法（Box-Muller 或数值近似）。

**离散版本：**对于离散分布，将 CDF 构建为累积和，生成 U，再找到累积和首次超过 U 的索引。这正是第 06 课中 `sample_categorical` 的工作方式。

### 拒绝抽样

当无法求逆 CDF、但能计算目标 PDF（允许相差一个常数因子）时，可以使用拒绝抽样。

```
目标分布：p(x)（可计算，可能未经归一化）
提议分布：q(x)（可从中抽样）
上界：对所有 x，p(x) <= M * q(x)

算法：
  1. 抽取 x ~ q(x)
  2. 抽取 u ~ Uniform(0, 1)
  3. 若 u < p(x) / (M * q(x))，接受 x
  4. 否则拒绝，并返回第 1 步

接受率 = 1/M
```

界 M 越紧，接受率越高。在低维（1–3 维）中，拒绝抽样效果良好；在高维中，因提议分布的大部分体积都会被拒绝，接受率会指数级下降。这就是拒绝抽样中的维度灾难。

**示例：从截断正态分布中抽样。**在截断区间上使用均匀提议分布。包络常数 M 是该区间内正态 PDF 的最大值。

**示例：从半圆中抽样。**在外接矩形内均匀提出候选点；若点落在半圆内便接受。这也是蒙特卡洛计算 pi 的方法：接受率等于面积比 pi/4。

### 重要性抽样

有时你并不需要从目标分布 p(x) 中抽样。你需要估计 p(x) 下的期望，而手头拥有的是来自另一分布 q(x) 的样本。

```
目标：估计 E_p[f(x)] = ∫ f(x) * p(x) dx

改写：
  E_p[f(x)] = ∫ f(x) * (p(x)/q(x)) * q(x) dx
            = E_q[f(x) * w(x)]

其中 w(x) = p(x) / q(x) 为重要性权重。

估计量：
  E_p[f(x)] ~ (1/N) * sum(f(x_i) * w(x_i))    其中 x_i ~ q(x)
```

这在强化学习中至关重要。在 PPO（近端策略优化）中，你先用旧策略 pi_old 收集轨迹，却希望优化新策略 pi_new。重要性权重为 pi_new(a|s) / pi_old(a|s)。PPO 会裁剪这些权重，防止新策略偏离旧策略太远。

重要性抽样估计量的方差取决于 q 与 p 的相似程度。如果 q 与 p 差异很大，少数样本会获得极大的权重并主导估计结果。自归一化重要性抽样通过除以权重之和来缓解这一问题：

```
E_p[f(x)] ~ sum(w_i * f(x_i)) / sum(w_i)
```

### Monte Carlo 估计

蒙特卡洛估计通过对随机样本求平均来近似积分。大数定律保证其收敛。

```
目标：估计定义域 D 上的 I = ∫_D g(x) dx

方法：
  1. 从 D 中均匀抽取 x_1, ..., x_N
  2. I ~ (D 的体积 / N) * sum(g(x_i))

误差：O(1 / sqrt(N))，与维度无关
```

其误差率与维度无关。这正是蒙特卡洛方法在高维空间中占主导地位的原因：基于网格的积分在那里不可行。

**估计 pi：**

```
从 [-1, 1] x [-1, 1] 中均匀抽取 (x, y)
统计落在单位圆内的点数：x^2 + y^2 <= 1
pi ~ 4 * (圆内点数) / (总点数)
```

**估计期望：**

```
E[f(X)] ~ (1/N) * sum(f(x_i))    其中 x_i ~ p(x)

样本均值收敛到真实期望。
估计量的方差 = Var(f(X)) / N
```

### 马尔可夫链 Monte Carlo（MCMC）：Metropolis–Hastings

MCMC 构造一条以目标分布 p(x) 为平稳分布的马尔可夫链。经过足够多步后，链中的样本（近似地）就是来自 p(x) 的样本。

```
目标：p(x)（已知至一个归一化常数）
提议：q(x'|x)（根据当前状态如何提出下一个状态）

Metropolis–Hastings 算法：
  1. 从某个 x_0 开始
  2. 对 t = 1, 2, ..., T：
     a. 提出 x' ~ q(x'|x_t)
     b. 计算接受比：
        alpha = [p(x') * q(x_t|x')] / [p(x_t) * q(x'|x_t)]
     c. 以 min(1, alpha) 的概率接受：
        - 若 u < alpha（u ~ Uniform(0,1)）：x_{t+1} = x'
        - 否则：x_{t+1} = x_t
  3. 丢弃前 B 个样本（预热）
  4. 返回其余样本
```

对于对称提议分布（q(x'|x) = q(x|x')），该比值可化简为 p(x')/p(x)。这就是原始的 Metropolis 算法。

**为何有效。** 这一接受规则保证了详细平衡：处于 x 并转移到 x' 的概率，等于处于 x' 并转移到 x 的概率。详细平衡意味着 p(x) 是该链的平稳分布。

**实践注意事项：**
- 预热：丢弃链达到平衡前产生的早期样本
- 抽稀：每隔 k 个样本保留一个，以降低自相关性
- 提议尺度：太小会使链移动缓慢（接受率高，但探索慢）；太大会导致大多数提议被拒绝（接受率低，链停在原地）
- 在高维空间中，高斯提议分布的最优接受率约为 0.234

### Gibbs 抽样

Gibbs 抽样是用于多元分布的一种特殊 MCMC 方法。它不在所有维度上同时提出一次移动，而是每次根据条件分布更新一个变量。

```
目标：p(x_1, x_2, ..., x_d)

算法：
  对每次迭代 t：
    抽取 x_1^{t+1} ~ p(x_1 | x_2^t, x_3^t, ..., x_d^t)
    抽取 x_2^{t+1} ~ p(x_2 | x_1^{t+1}, x_3^t, ..., x_d^t)
    ...
    抽取 x_d^{t+1} ~ p(x_d | x_1^{t+1}, x_2^{t+1}, ..., x_{d-1}^{t+1})
```

Gibbs 抽样要求能够从每个条件分布 p(x_i | x_{-i}) 中抽样。对许多模型而言，这很直接：
- 贝叶斯网络：条件分布可由图结构得到
- 高斯混合模型：条件分布为高斯分布
- Ising 模型：每个自旋的条件分布只依赖于其邻居

接受率始终为 1（每个提议都会被接受），因为从精确条件分布中抽样会自动满足详细平衡。

**局限性。** 当变量高度相关时，Gibbs 抽样的混合速度很慢，因为一次只更新一个变量，无法在分布中进行大幅度的对角移动。

### 温度抽样（用于 LLM）

语言模型会为词表中的每个词元输出 logit z_1, ..., z_V。Softmax 将这些 logit 转换为概率。温度会在 Softmax 之前对 logit 进行缩放：

```
p_i = exp(z_i / T) / sum(exp(z_j / T))

T = 1.0：标准 softmax（原始分布）
T -> 0：argmax（确定性地总选最高 logit）
T -> inf：均匀分布（所有词元等可能）
T < 1.0：使分布更尖锐（更自信，更多样性更低）
T > 1.0：使分布更平坦（更不自信，更多样性更高）
```

**为何有效。** 将 logit 除以 T < 1 会放大 logit 之间的差异。若 z_1 = 2 且 z_2 = 1，除以 T = 0.5 后，z_1/T = 4、z_2/T = 2，二者的差距变得更大。经过 Softmax 后，logit 最高的词元会获得大得多的概率份额。

**实践中：**
- T = 0.0：贪心解码，最适合事实问答
- T = 0.3-0.7：略具创造性，适合代码生成
- T = 0.7-1.0：较为均衡，适合一般对话
- T = 1.0-1.5：适合创意写作和头脑风暴
- T > 1.5：随机性越来越强，通常很少实用

温度不会改变哪些词元是可能的；它改变的是分配给各词元的概率质量。

### Top-k 抽样

Top-k 抽样将候选集合限制为概率最高的 k 个词元，然后重新归一化并从这个受限集合中抽样。

```
算法：
  1. 计算全部 V 个词元的 softmax 概率
  2. 按概率降序排列词元
  3. 仅保留前 k 个词元
  4. 重新归一化：p_i' = p_i / sum_{j ∈ top-k}(p_j)
  5. 从重新归一化后的分布中抽样

k = 1：贪心解码
k = V：不筛选（标准抽样）
k = 40：典型设定，移除不太可能词元的长尾
```

Top-k 能防止模型从词表分布的长尾中选出极不可能的词元（如拼写错误或无意义内容）。但问题在于：k 是固定的，与上下文无关。当模型很有把握时（某个词元的概率为 95%），k = 40 仍会允许另外 39 个候选；当模型不确定时（概率分散在 1000 个词元上），k = 40 又会截断合理的选项。

### Top-p（nucleus）抽样

Top-p 抽样会动态调整候选集合的大小。它不保留固定数量的词元，而是保留累计概率超过 p 的最小词元集合。

```
算法：
  1. 计算全部 V 个词元的 softmax 概率
  2. 按概率降序排列词元
  3. 找到使前 k 个概率之和 >= p 的最小 k
  4. 仅保留这 k 个词元
  5. 重新归一化并抽样

p = 0.9：保留覆盖 90% 概率质量的词元
p = 1.0：不筛选
p = 0.1：限制很强，接近贪心
```

当模型很有把握时，核抽样会保留很少的词元（可能只有 2–3 个）；当模型不确定时，它会保留较多词元（可能有 200 个）。这种自适应行为正是核抽样通常比 Top-k 生成更好文本的原因。

**常见组合：**
- 温度 0.7 + top-p 0.9：适合通用场景的设置
- 温度 0.0（贪心）：最适合确定性任务
- 温度 1.0 + top-k 50：Fan 等人（2018）原始论文中的设置

Top-k 和 Top-p 可以结合使用：先应用 Top-k，再在剩余集合上应用 Top-p。

### 重参数化技巧（用于 VAE）

变分自编码器（VAE）通过将输入编码为潜在空间中的一个分布、从该分布中抽样，再将样本解码回来进行学习。问题在于：无法穿过抽样操作进行反向传播。

```
标准抽样（不可微）：
  z ~ N(mu, sigma^2)

  随机性阻断了梯度流。
  d/d_mu [从 N(mu, sigma^2) 抽样] = ???
```

重参数化技巧将随机性与参数分离：

```
重参数化抽样：
  epsilon ~ N(0, 1)          （固定随机噪声，不含参数）
  z = mu + sigma * epsilon   （参数的确定性函数）

  此时 z 是 mu 和 sigma 的确定性、可微函数。
  d(z)/d(mu) = 1
  d(z)/d(sigma) = epsilon

  梯度可穿过 mu 和 sigma 传播。
```

之所以可行，是因为 N(mu, sigma^2) 与 mu + sigma * N(0, 1) 具有相同的分布。关键洞见是：将随机性移至一个不含参数的来源（epsilon），再将样本表示为参数的可微变换。

**在 VAE 训练循环中：**
1. 编码器为每个输入输出 mu 和 log(sigma^2)
2. 抽取 epsilon ~ N(0, 1)
3. 计算 z = mu + sigma * epsilon
4. 解码 z 以重建输入
5. 经由第 4、3、2、1 步反向传播（因为第 3 步可微，所以这是可行的）

没有重参数化技巧，VAE 无法使用标准反向传播进行训练。正是这一洞见使 VAE 变得实用。

### Gumbel-Softmax（可微类别抽样）

重参数化技巧适用于连续分布（如高斯分布）。对于离散的类别分布，则需要不同的方法。Gumbel-Softmax 为类别抽样提供了一种可微近似。

**Gumbel-Max 技巧（不可微）：**

```
要从对数概率为 log(p_1), ..., log(p_k) 的类别分布抽样：
  1. 对每个类别抽取 g_i ~ Gumbel(0, 1)
     （g = -log(-log(u))，其中 u ~ Uniform(0, 1)）
  2. 返回 argmax(log(p_i) + g_i)

这会产生精确的类别样本。
```

**Gumbel-Softmax（可微近似）：**

```
以软 softmax 替代硬 argmax：
  y_i = exp((log(p_i) + g_i) / tau) / sum(exp((log(p_j) + g_j) / tau))

tau（温度）控制近似程度：
tau -> 0：接近 one-hot 向量（硬类别）
tau -> inf：接近均匀分布（1/k, 1/k, ..., 1/k）
tau = 1.0：软近似
```

Gumbel-Softmax 会生成离散样本的连续松弛形式。其输出是概率向量（软 one-hot），而非硬 one-hot。梯度可以穿过 Softmax 传播。在训练的前向传播中，可以使用“直通”估计器：前向传播使用硬 argmax，反向传播则使用软 Gumbel-Softmax 的梯度。

**应用：**
- VAE 中的离散潜变量
- 神经架构搜索（选择离散操作）
- 硬注意力机制
- 带离散动作的强化学习

### 分层抽样

标准蒙特卡洛抽样可能会因随机性而在样本空间中留下空隙。分层抽样通过将空间划分为多个层并从每一层抽样，强制实现均匀覆盖。

```
标准 Monte Carlo：
  从 [0, 1] 中均匀抽取 N 个点
  某些区域可能有聚集，另一些则有空隙

分层抽样：
  将 [0, 1] 分为 N 个等长层：[0, 1/N), [1/N, 2/N), ..., [(N-1)/N, 1)
  在每层内均匀抽取一个点
  x_i = (i + u_i) / N，其中 u_i ~ Uniform(0, 1)，i = 0, ..., N-1
```

与标准蒙特卡洛相比，分层抽样的方差始终更低或相等：

```
Var(分层抽样) <= Var(标准 Monte Carlo)

当 f(x) 平滑变化时，改进最大。
对于分段常数函数，分层抽样是精确的。
```

**应用：**
- 数值积分（准蒙特卡洛）
- 训练数据划分（确保每个折中的类别平衡）
- 结合分层的重点抽样（结合两种技术）
- NeRF（神经辐射场）沿相机光线使用分层抽样

### 与扩散模型的联系

扩散模型通过抽样过程生成图像。前向过程会在 T 个步骤中逐渐向图像加入高斯噪声，直至其变为纯噪声。反向过程学习去噪，逐步恢复原始图像。

```
正向过程（已知）：
  x_t = sqrt(alpha_t) * x_{t-1} + sqrt(1 - alpha_t) * epsilon
  其中 epsilon ~ N(0, I)

  T 步后：x_T ~ N(0, I)（纯噪声）

反向过程（已学习）：
  x_{t-1} = (1/sqrt(alpha_t)) * (x_t - (1 - alpha_t)/sqrt(1 - alpha_bar_t) * epsilon_theta(x_t, t)) + sigma_t * z
  其中 z ~ N(0, I)

  每个去噪步骤都是一个抽样步骤。
```

与本课方法的联系：
- 每个去噪步骤都使用重参数化技巧（抽取噪声，再应用确定性变换）
- 噪声调度 {alpha_t} 控制一种形式的温度退火
- 训练使用蒙特卡洛估计来近似 ELBO（证据下界）
- 扩散模型中的祖先抽样是一条马尔可夫链（每一步只依赖当前状态）

整个图像生成过程都是迭代抽样：从噪声开始，在每一步中基于已学习的去噪模型抽取一个噪声略少的版本。

```figure
monte-carlo-pi
```

## 构建实现

### 步骤 1：均匀与逆 CDF 抽样

```python
import math
import random

def sample_uniform(a, b):
    return a + (b - a) * random.random()

def sample_exponential_inverse_cdf(lam):
    u = random.random()
    return -math.log(u) / lam
```

生成 10,000 个指数分布样本，并验证均值为 1/lambda。

### 步骤 2：拒绝抽样

```python
def rejection_sample(target_pdf, proposal_sample, proposal_pdf, M):
    while True:
        x = proposal_sample()
        u = random.random()
        if u < target_pdf(x) / (M * proposal_pdf(x)):
            return x
```

用拒绝抽样从截断正态分布中抽样。通过样本直方图验证其形状。

### 步骤 3：重要性抽样

```python
def importance_sampling_estimate(f, target_pdf, proposal_pdf, proposal_sample, n):
    total = 0
    for _ in range(n):
        x = proposal_sample()
        w = target_pdf(x) / proposal_pdf(x)
        total += f(x) * w
    return total / n
```

使用均匀提议分布估计正态分布下的 E[X^2]，并与已知答案（mu^2 + sigma^2）比较。

### 步骤 4：pi 的 Monte Carlo 估计

```python
def monte_carlo_pi(n):
    inside = 0
    for _ in range(n):
        x = random.uniform(-1, 1)
        y = random.uniform(-1, 1)
        if x*x + y*y <= 1:
            inside += 1
    return 4 * inside / n
```

### 步骤 5：Metropolis–Hastings MCMC

```python
def metropolis_hastings(target_log_pdf, proposal_sample, proposal_log_pdf, x0, n_samples, burn_in):
    samples = []
    x = x0
    for i in range(n_samples + burn_in):
        x_new = proposal_sample(x)
        log_alpha = (target_log_pdf(x_new) + proposal_log_pdf(x, x_new)
                     - target_log_pdf(x) - proposal_log_pdf(x_new, x))
        if math.log(random.random()) < log_alpha:
            x = x_new
        if i >= burn_in:
            samples.append(x)
    return samples
```

从双峰分布（两个高斯分布的混合）中抽样，并可视化链的轨迹。

### 步骤 6：Gibbs 抽样

```python
def gibbs_sampling_2d(conditional_x_given_y, conditional_y_given_x, x0, y0, n_samples, burn_in):
    x, y = x0, y0
    samples = []
    for i in range(n_samples + burn_in):
        x = conditional_x_given_y(y)
        y = conditional_y_given_x(x)
        if i >= burn_in:
            samples.append((x, y))
    return samples
```

### 步骤 7：温度抽样

```python
def softmax(logits):
    max_l = max(logits)
    exps = [math.exp(z - max_l) for z in logits]
    total = sum(exps)
    return [e / total for e in exps]

def temperature_sample(logits, temperature):
    scaled = [z / temperature for z in logits]
    probs = softmax(scaled)
    return sample_from_probs(probs)
```

展示温度如何改变一组词元 logit 的输出分布。

### 步骤 8：Top-k 与 Top-p 抽样

```python
def top_k_sample(logits, k):
    indexed = sorted(enumerate(logits), key=lambda x: -x[1])
    top = indexed[:k]
    top_logits = [l for _, l in top]
    probs = softmax(top_logits)
    idx = sample_from_probs(probs)
    return top[idx][0]

def top_p_sample(logits, p):
    probs = softmax(logits)
    indexed = sorted(enumerate(probs), key=lambda x: -x[1])
    cumsum = 0
    selected = []
    for token_idx, prob in indexed:
        cumsum += prob
        selected.append((token_idx, prob))
        if cumsum >= p:
            break
    sel_probs = [pr for _, pr in selected]
    total = sum(sel_probs)
    sel_probs = [pr / total for pr in sel_probs]
    idx = sample_from_probs(sel_probs)
    return selected[idx][0]
```

### 步骤 9：重参数化技巧

```python
def reparam_sample(mu, sigma):
    epsilon = random.gauss(0, 1)
    return mu + sigma * epsilon

def reparam_gradient(mu, sigma, epsilon):
    dz_dmu = 1.0
    dz_dsigma = epsilon
    return dz_dmu, dz_dsigma
```

演示梯度可穿过重参数化样本、却不能穿过直接抽样传播。

### 步骤 10：Gumbel-Softmax

```python
def gumbel_sample():
    u = random.random()
    return -math.log(-math.log(u))

def gumbel_softmax(logits, temperature):
    gumbels = [math.log(p) + gumbel_sample() for p in logits]
    return softmax([g / temperature for g in gumbels])
```

展示降低温度如何使输出接近 one-hot 向量。

包含所有可视化的完整实现位于 `code/sampling.py`。

## 使用

使用 NumPy 与 SciPy 的生产版本：

```python
import numpy as np

rng = np.random.default_rng(42)

exponential_samples = rng.exponential(scale=2.0, size=10000)
print(f"Exponential mean: {exponential_samples.mean():.4f} (expected 2.0)")

from scipy import stats
normal = stats.norm(loc=0, scale=1)
print(f"CDF at 1.96: {normal.cdf(1.96):.4f}")
print(f"Inverse CDF at 0.975: {normal.ppf(0.975):.4f}")

logits = np.array([2.0, 1.0, 0.5, 0.1, -1.0])
temperature = 0.7
scaled = logits / temperature
probs = np.exp(scaled - scaled.max()) / np.exp(scaled - scaled.max()).sum()
token = rng.choice(len(logits), p=probs)
print(f"Sampled token index: {token}")
```

大规模 MCMC 请使用专门的库：
- PyMC：使用 NUTS（自适应 HMC）的完整贝叶斯建模
- emcee：集成式 MCMC 抽样器
- NumPyro/JAX：GPU 加速的 MCMC

你已从零实现这些方法，现在知道这些库调用背后在做什么。

## 练习

1. 为 Cauchy 分布实现逆 CDF 抽样。其 CDF 为 F(x) = 0.5 + arctan(x)/pi。生成 10,000 个样本，并将直方图与真实 PDF 对照绘制。留意重尾（远离中心的极端值）。

2. 使用 Uniform(0, 1) 提议分布，以拒绝抽样生成 Beta(2, 5) 分布样本。将接受样本与真实 Beta PDF 对照绘制。理论接受率是多少？

3. 分别用 1,000、10,000 和 100,000 个样本，以 Monte Carlo 估计 sin(x) 从 0 到 pi 的积分。比较各层级的误差，验证误差按 O(1/sqrt(N)) 缩放。

4. 实现 Metropolis–Hastings，从与 exp(-(x^2 * y^2 + x^2 + y^2 - 8*x - 8*y) / 2) 成正比的二维分布 p(x, y) 中抽样。绘制样本和链轨迹，并试验不同的提议标准差。

5. 构建完整的文本生成演示：给定含 10 个词且带 logit 的词表，用 (a) 贪心、(b) temperature=0.7、(c) top-k=3、(d) top-p=0.9 生成 20 个词元的序列。比较 5 次运行的输出多样性。

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|------|----------------|----------------------|
| 抽样 | “抽取随机值” | 按概率分布生成值，是所有生成式 AI 背后的机制。 |
| 均匀分布 | “都一样可能” | [a, b] 中每个值的概率密度均为 1/(b-a)，是一切抽样方法的起点。 |
| 逆 CDF | “概率变换” | F_inverse(U) 将均匀样本变成任意已知 CDF 分布的样本，精确且高效。 |
| 拒绝抽样 | “提出并接受／拒绝” | 从简单提议分布生成候选，再按目标／提议比决定是否接受；精确但会浪费样本。 |
| 重要性抽样 | “重加权样本” | 用 q(x) 的样本、按 p(x)/q(x) 加权来估计 p(x) 下的期望；是强化学习 PPO 的核心。 |
| Monte Carlo | “对随机样本取平均” | 以样本均值近似积分；误差为 O(1/sqrt(N))，与维度无关。 |
| MCMC | “会收敛的随机游走” | 构造以目标分布为平稳分布的马尔可夫链；Metropolis–Hastings 是基础算法。 |
| Metropolis–Hastings | “接受上坡，有时也接受下坡” | 提出移动，按密度比接受；详细平衡保证收敛到目标分布。 |
| Gibbs 抽样 | “一次一个变量” | 固定其他变量，从每个变量的条件分布更新；接受率为 100%。 |
| 温度 | “置信度旋钮” | 在 softmax 前将 logit 除以 T；T<1 更尖锐（更自信），T>1 更平坦（更多样）。 |
| Top-k 抽样 | “保留最好的 k 个” | 将除最高概率 k 个词元外的概率置零、重新归一化后抽样；候选集大小固定。 |
| 核抽样（top-p） | “保留可能的那些” | 保留累计概率超过 p 的最小词元集合；候选集大小自适应。 |
| 重参数化技巧 | “把随机性移到外面” | 写成 z = mu + sigma * epsilon，其中 epsilon ~ N(0,1)，使抽样可微，是 VAE 训练的关键。 |
| Gumbel-Softmax | “软类别抽样” | 通过 Gumbel 噪声和带温度的 softmax 对类别抽样做可微近似。 |
| 分层抽样 | “强制覆盖” | 将样本空间划分为层，并从每层抽样；方差总是不高于朴素 Monte Carlo。 |
| 预热 | “预热期” | 链达到平稳分布前丢弃的初始 MCMC 样本。 |
| 详细平衡 | “可逆性条件” | p(x) * T(x->y) = p(y) * T(y->x)，是 p 成为马尔可夫链平稳分布的充分条件。 |
| 扩散抽样 | “迭代去噪” | 从噪声出发，通过已学习的去噪步骤生成数据；每一步都是条件抽样操作。 |

## 延伸阅读

- [Holbrook（2023）：Metropolis–Hastings 算法](https://arxiv.org/abs/2304.07010)——MCMC 基础的详细教程
- [Jang、Gu、Poole（2017）：使用 Gumbel-Softmax 的类别重参数化](https://arxiv.org/abs/1611.01144)——原始 Gumbel-Softmax 论文
- [Holtzman 等（2020）：神经文本退化的奇特案例](https://arxiv.org/abs/1904.09751)——核（top-p）抽样论文
- [Kingma 与 Welling（2014）：自动编码变分贝叶斯](https://arxiv.org/abs/1312.6114)——提出重参数化技巧的 VAE 论文
- [Ho、Jain、Abbeel（2020）：去噪扩散概率模型](https://arxiv.org/abs/2006.11239)——将抽样与图像生成联系起来的 DDPM
