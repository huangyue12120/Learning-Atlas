---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/08-generative-ai/06-diffusion-ddpm-from-scratch/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: f62dd0eaa055920ebe0ae369fd734c5b0e6ab90ce3f31f485487d7d4cd7a86f8
status: reviewed
---

# 扩散模型——从零实现 DDPM

> Ho、Jain 和 Abbeel（2020）给出了一个让整个领域欲罢不能的方案。用一千个小步骤通过噪声破坏数据，训练一个神经网络预测噪声，再在推理时逆转该过程。如今每个主流图像、视频、3D 和音乐模型都运行这套循环，其上还可能叠加流匹配或一致性技巧。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 3 第 02 课（反向传播）、Phase 8 第 02 课（VAE）  
**预计时间：** 约 75 分钟

## 问题

你想为 `p_data(x)` 构建采样器。GAN 玩的是经常发散的极小极大博弈。VAE 用高斯解码器生成模糊样本。真正需要的训练目标应当满足三点：（a）只有一个稳定损失，没有鞍点，也没有极小极大问题；（b）它是 `log p(x)` 的下界，因此可以得到似然；（c）样本质量达到 SOTA 水平。

Sohl-Dickstein 等（2015）给出了理论答案：定义一条逐渐加入高斯噪声的马尔可夫链 `q(x_t | x_{t-1})`，再训练反向链 `p_θ(x_{t-1} | x_t)` 去噪。Ho、Jain 和 Abbeel（2020）证明，损失可以简化为一行，也就是预测噪声，并整理了数学表达。2020 年，它还只是新奇想法；2021 年，它生成了最先进的样本；2022 年，它成为 Stable Diffusion；2026 年，它已经成为基础底座。

## 概念 <!-- learning-atlas: the-concept -->

![DDPM：前向加噪，反向去噪](../assets/ddpm.svg)

**前向过程 `q`。** 用 `T` 个小步骤加入高斯噪声。累积步骤仍是高斯分布，这个闭式表达式让整套数学可以求解：

```
q(x_t | x_0) = N( sqrt(α̅_t) · x_0,  (1 - α̅_t) · I )
```

其中，对于 `β_t` 调度，`α̅_t = ∏_{s=1..t} (1 - β_s)`。在 T=1000 步中，让 `β_t` 从 1e-4 线性增加到 0.02，最终的 `x_T` 就近似服从 `N(0, I)`。

**反向过程 `p_θ`。** 学习一个预测所加噪声的神经网络 `ε_θ(x_t, t)`。给定 `x_t`，通过下式去噪：

```
x_{t-1} = (1 / sqrt(α_t)) · ( x_t - (β_t / sqrt(1 - α̅_t)) · ε_θ(x_t, t) )  +  σ_t · z
```

其中 `σ_t` 可以是 `sqrt(β_t)`，也可以是学习得到的方差。表达式很难看，但只涉及代数运算：先根据后验 `q(x_{t-1} | x_t, x_0)` 解出 `x_{t-1}`，再用通过噪声预测得到的估计替换 `x_0`。

**训练损失。**

```
L_simple = E_{x_0, t, ε} [ || ε - ε_θ( sqrt(α̅_t) · x_0 + sqrt(1 - α̅_t) · ε,  t ) ||² ]
```

从数据中采样 `x_0`，随机选择 `t`，采样 `ε ~ N(0, I)`，使用闭式表达式一步算出带噪的 `x_t`，再回归噪声。一个损失，没有极小极大博弈，没有 KL，也不需要重参数化技巧。

**采样。** 从 `x_T ~ N(0, I)` 开始，按 `t = T` 到 `1` 迭代执行反向步骤，最终得到样本。

## 它为何奏效

可以从三个角度理解：

1. **去噪容易，生成困难。** 在 `t=T` 时，数据是纯噪声，网络要解决的是一个平凡问题。在 `t=0` 时，网络只需清理少数像素。中间的 `t` 较难，但来自每个噪声级别的大量梯度都会流经同一组权重。

2. **伪装起来的得分匹配。** Vincent（2011）证明，预测噪声等价于估计 `∇_x log q(x_t | x_0)`，也就是*得分*。反向 SDE 使用该得分沿密度梯度向上移动，执行一场朝高概率区域前进的有引导随机游走。

3. **ELBO 化简为普通 MSE。** 完整变分下界在每个时间步都有一个 KL 项。采用 DDPM 参数化后，这些 KL 项会化简为带特定系数的噪声预测 MSE；Ho 去掉了这些系数，把它称作“简单”损失，质量反而*提高*了。

```figure
diffusion-denoise
```

## 动手构建

`code/main.py` 实现一维 DDPM。数据是双峰混合分布。“网络”是一个微型 MLP，输入 `(x_t, t)` 并输出预测噪声。训练使用一行损失，采样则迭代反向链。

### 第 1 步：前向调度（闭式形式）

```python
betas = [1e-4 + (0.02 - 1e-4) * t / (T - 1) for t in range(T)]
alphas = [1 - b for b in betas]
alpha_bars = []
cum = 1.0
for a in alphas:
    cum *= a
    alpha_bars.append(cum)
```

### 第 2 步：一步采样 `x_t`

```python
def forward_sample(x0, t, alpha_bars, rng):
    a_bar = alpha_bars[t]
    eps = rng.gauss(0, 1)
    x_t = math.sqrt(a_bar) * x0 + math.sqrt(1 - a_bar) * eps
    return x_t, eps
```

### 第 3 步：一次训练步骤

```python
def train_step(x0, model, alpha_bars, rng):
    t = rng.randrange(T)
    x_t, eps = forward_sample(x0, t, alpha_bars, rng)
    eps_hat = model_forward(model, x_t, t)
    loss = (eps - eps_hat) ** 2
    return loss, gradient_step(model, ...)
```

### 第 4 步：反向采样

```python
def sample(model, alpha_bars, T, rng):
    x = rng.gauss(0, 1)
    for t in range(T - 1, -1, -1):
        eps_hat = model_forward(model, x, t)
        beta_t = 1 - alphas[t]
        x = (x - beta_t / math.sqrt(1 - alpha_bars[t]) * eps_hat) / math.sqrt(alphas[t])
        if t > 0:
            x += math.sqrt(beta_t) * rng.gauss(0, 1)
    return x
```

在一个使用 40 个时间步和 24 单元 MLP 的一维问题上，模型约训练 200 个 epoch 就能学会双峰混合分布。

## 时间条件控制

网络需要知道自己在对哪个时间步去噪。标准做法有两种：

- **正弦嵌入。** 与 Transformer 位置编码相似。`embed(t) = [sin(t/ω_0), cos(t/ω_0), sin(t/ω_1), ...]`。将其送入 MLP，再广播到网络中。
- **FiLM / 组归一化条件控制。** 在每个网络块中，把嵌入投影为逐通道的缩放 / 偏置（FiLM）。

玩具代码使用正弦嵌入 → 拼接。生产 U-Net 使用 FiLM。

## 常见问题

- **调度影响很大。** 线性 `β` 是 DDPM 默认值，但余弦调度（Nichol 与 Dhariwal，2021）在相同算力下能取得更好的 FID。如果质量进入平台期，应切换调度。
- **时间步嵌入很脆弱。** 在一维玩具问题中，可以直接把原始 `t` 当作浮点数传入；图像任务中这样做会失败，应始终使用适当的嵌入。
- **V-prediction 与 ε-prediction。** 在很小或很大的 t 区域，`ε` 的信噪比很差。V-prediction（`v = α·ε - σ·x`）更稳定；SDXL、SD3 和 Flux 都使用它。
- **无分类器引导。** 推理时同时计算有条件与无条件 `ε`，再用 `ε_cfg = (1 + w) · ε_cond - w · ε_uncond` 合成，其中 `w ≈ 3-7`。第 08 课会详细介绍。
- **1000 步太多。** 生产系统使用 DDIM（20～50 步）、DPM-Solver（10～20 步）或蒸馏（1～4 步）。参见第 12 课。

## 使用方法

| 角色 | 2026 年的典型技术栈 |
|------|---------------------|
| 图像像素空间扩散（小型、玩具） | DDPM + U-Net |
| 图像潜空间扩散 | VAE 编码器 + U-Net 或 DiT（第 07 课） |
| 视频潜空间扩散 | 时空 DiT（Sora、Veo、WAN） |
| 音频潜空间扩散 | Encodec + 扩散 Transformer |
| 科学（分子、蛋白质、物理） | 等变扩散（EDM、RFdiffusion、AlphaFold3） |

扩散是通用生成骨干。流匹配（第 13 课）是 2024—2026 年的竞争者，在质量相同时通常能以推理速度取胜。

## 交付成果

保存为 `outputs/skill-diffusion-trainer.md`。该技能接收数据集与算力预算，输出调度（线性 / 余弦 / sigmoid）、预测目标（ε/v/x）、步数、引导强度、采样器家族和评估方案。

## 练习

1. **简单。** 把 `code/main.py` 中的 T 从 40 改为 10。样本质量（输出的可视化直方图）如何下降？T 降到多少时，双峰结构会坍塌？
2. **中等。** 从 ε-prediction 切换到 v-prediction。重新推导反向步骤，并比较最终样本质量。
3. **困难。** 加入无分类器引导。使用类别标签 `c ∈ {0, 1}` 作为条件，训练时以 10% 的概率丢弃标签；采样时使用 `ε = (1+w)·ε_cond - w·ε_uncond`。测量 `w = 0, 1, 3, 7` 时命中条件模式的概率。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| 前向过程 | “添加噪声” | 破坏数据的固定马尔可夫链 `q(x_t \| x_{t-1})`。 |
| 反向过程 | “去噪” | 重建数据的学习链 `p_θ(x_{t-1} \| x_t)`。 |
| β 调度 | “噪声阶梯” | 每步方差；可以是线性、余弦或 sigmoid。 |
| α̅ | “Alpha bar” | 累积乘积 `∏(1 - β)`；由 `x_0` 闭式计算 `x_t`。 |
| 简单损失 | “噪声 MSE” | `\|\|ε - ε_θ(x_t, t)\|\|²`；所有变分推导都化简为这一项。 |
| ε-prediction | “预测噪声” | 输出是加入的噪声；标准 DDPM。 |
| V-prediction | “预测速度” | 输出为 `α·ε - σ·x`；在各个 t 上具有更好的条件性。 |
| DDPM | “那篇论文” | Ho 等，2020；线性 β、1000 步、U-Net。 |
| DDIM | “确定性采样器” | 非马尔可夫采样器，20～50 步，训练目标不变。 |
| 无分类器引导 | “CFG” | 混合有条件与无条件噪声预测，以增强条件控制。 |

## 生产说明：扩散推理的核心是步数

DDPM 论文执行 T=1000 个反向步骤。生产系统不会这样部署。实际推理栈会从三种策略中选择一种；每种策略都能用“延迟来自哪里”这套生产框架清楚描述：

1. **使用更快的采样器，模型不变。** DDIM（20～50 步）、DPM-Solver++（10～20 步）、UniPC（8～16 步）。直接替换反向循环，不改动训练好的 `ε_θ` 权重。延迟降低 20～50 倍。
2. **蒸馏。** 训练学生模型，用更少步骤匹配教师模型：渐进式蒸馏（2 → 1）、一致性模型（任意步数 → 1～4）、LCM、SDXL-Turbo、SD3-Turbo。延迟再降低 5～10 倍，但需要重新训练。
3. **缓存与编译。** `torch.compile(unet, mode="reduce-overhead")`、TensorRT-LLM 的扩散后端、`xformers`/SDPA 注意力、bf16 权重。单步延迟约降低 2 倍，并可与（1）、（2）叠加。

生产扩散服务器的预算讨论与生产文献对大语言模型的描述相同：延迟是 `num_steps × step_cost + VAE_decode`，吞吐量是 `batch_size × (num_steps × step_cost)^-1`。TTFT 很小（一步）；与 TPOT 对应的量是完整响应时间，因为从用户角度看，图像是“一次性”生成的。

## 延伸阅读

- [Sohl-Dickstein 等（2015），《Deep Unsupervised Learning using Nonequilibrium Thermodynamics》](https://arxiv.org/abs/1503.03585)——超前于时代的扩散论文。
- [Ho、Jain、Abbeel（2020），《Denoising Diffusion Probabilistic Models》](https://arxiv.org/abs/2006.11239)——DDPM。
- [Song、Meng、Ermon（2021），《Denoising Diffusion Implicit Models》](https://arxiv.org/abs/2010.02502)——使用更少步骤的 DDIM。
- [Nichol 与 Dhariwal（2021），《Improved DDPM》](https://arxiv.org/abs/2102.09672)——余弦调度、学习方差。
- [Dhariwal 与 Nichol（2021），《Diffusion Models Beat GANs on Image Synthesis》](https://arxiv.org/abs/2105.05233)——分类器引导。
- [Ho 与 Salimans（2022），《Classifier-Free Diffusion Guidance》](https://arxiv.org/abs/2207.12598)——CFG。
- [Karras 等（2022），《Elucidating the Design Space of Diffusion-Based Generative Models (EDM)》](https://arxiv.org/abs/2206.00364)——统一记号与最简洁的方案。
