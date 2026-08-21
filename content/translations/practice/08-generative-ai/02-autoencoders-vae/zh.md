---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/08-generative-ai/02-autoencoders-vae/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 09d80cdcdfbcc7fcd85dcdba56b67cf8923e05ec5883f1f4c5f4525ae82d14b6
status: reviewed
---

# 自编码器与变分自编码器（VAE）

> 普通自编码器先压缩再重建。它只会记忆，不会生成。加入一个技巧，让编码服从高斯分布，你就得到了采样器。`z = μ + σ·ε` 这项重参数化技巧，使你在 2026 年使用的每个潜空间扩散和流匹配图像模型都在输入端配置了 VAE。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 3 第 02 课（反向传播）、Phase 3 第 07 课（CNN）、Phase 8 第 01 课（分类）  
**预计时间：** 约 75 分钟

## 问题

把一个含 784 个像素的 MNIST 数字压缩成由 16 个数构成的编码，再完成重建。普通自编码器可以取得很低的重建 MSE，但编码空间凹凸不平、杂乱无章。从编码空间随机选一个点并解码，只会得到噪声。它没有采样器，只是披着生成模型外衣的压缩模型。

你需要同时满足三个目标：（a）编码空间是可以采样的干净、平滑分布，例如各向同性高斯 `N(0, I)`；（b）解码任一样本都能产生可信的数字；（c）编码器和解码器仍能完成有效压缩。三个目标要靠一个架构和一项损失共同实现。

Kingma 在 2013 年提出的 VAE 让编码器输出一个*分布* `q(z|x) = N(μ(x), σ(x)²)`，通过 KL 惩罚把该分布拉向先验 `N(0, I)`，然后从 `q(z|x)` 采样 `z` 再解码。推理时丢弃编码器，直接采样 `z ~ N(0, I)` 并解码。KL 惩罚会迫使编码空间形成结构。

到 2026 年，VAE 很少单独部署，因为扩散模型已经在原始图像质量上超过了它；不过，每个潜空间扩散模型（SD 1/2/XL/3、Flux、AudioCraft）仍首选 VAE 作为编码器。理解 VAE，就理解了日常所用图像流水线中看不见的第一层。

## 概念

![自编码器与 VAE：重参数化技巧](../assets/vae.svg)

**自编码器。** `z = encoder(x)`，`x̂ = decoder(z)`，损失 = `||x - x̂||²`。编码空间没有结构。

**VAE 编码器。** 输出两个向量：`μ(x)` 和 `log σ²(x)`。二者定义 `q(z|x) = N(μ, diag(σ²))`。

**重参数化技巧。** 直接从 `q(z|x)` 采样不可微。把样本改写为 `z = μ + σ·ε`，其中 `ε ~ N(0, I)`。此时 `z` 是 `(μ, σ)` 与一个无参数噪声共同决定的确定性函数，梯度可以流经 `μ` 和 `σ`。

**损失。** 证据下界（Evidence Lower BOund，ELBO）包含两项：

```
loss = reconstruction + β · KL[q(z|x) || N(0, I)]
     = ||x - x̂||²  + β · Σ_i ( σ_i² + μ_i² - log σ_i² - 1 ) / 2
```

重建项把 `x̂` 推向 `x`。KL 项把 `q(z|x)` 推向先验。两者相互权衡。较小的 β（<1）会产生更清晰的样本，但编码空间不太像高斯分布；较大的 β（>1）会形成更干净的编码空间，但样本更模糊。β-VAE（Higgins，2017）让这个调节项广为人知，并推动了解耦表示研究。

**采样。** 推理时抽取 `z ~ N(0, I)`，再送入解码器。只需一次前向传播，不像扩散那样反复采样。

```figure
vae-latent-grid
```

## 动手构建

`code/main.py` 在不使用 numpy 或 torch 的情况下实现了一个微型 VAE。输入是从八维、双组分高斯混合中抽取的八维合成数据。编码器和解码器都是单隐藏层 MLP。我们会实现 tanh 激活、前向传播、损失和手写反向传播。它服务于教学，不适合生产。

### 第 1 步：编码器前向传播

```python
def encode(x, enc):
    h = tanh(add(matmul(enc["W1"], x), enc["b1"]))
    mu = add(matmul(enc["W_mu"], h), enc["b_mu"])
    log_sigma2 = add(matmul(enc["W_sig"], h), enc["b_sig"])
    return mu, log_sigma2
```

输出 `log σ²` 而非 `σ`，网络输出便不受约束（对 σ 使用 softplus 是个陷阱，σ ≈ 0 时梯度会消失）。

### 第 2 步：重参数化并解码

```python
def reparameterize(mu, log_sigma2, rng):
    eps = [rng.gauss(0, 1) for _ in mu]
    sigma = [math.exp(0.5 * lv) for lv in log_sigma2]
    return [m + s * e for m, s, e in zip(mu, sigma, eps)]

def decode(z, dec):
    h = tanh(add(matmul(dec["W1"], z), dec["b1"]))
    return add(matmul(dec["W_out"], h), dec["b_out"])
```

### 第 3 步：ELBO

```python
def elbo(x, x_hat, mu, log_sigma2, beta=1.0):
    recon = sum((a - b) ** 2 for a, b in zip(x, x_hat))
    kl = 0.5 * sum(math.exp(lv) + m * m - lv - 1 for m, lv in zip(mu, log_sigma2))
    return recon + beta * kl, recon, kl
```

两个分布都是高斯分布，因此 KL 有精确的闭式表达式。不要做数值积分。2026 年仍有人在交付的代码中用蒙特卡洛方法估计 KL，平白让速度慢到三分之一。

### 第 4 步：生成

```python
def sample(dec, z_dim, rng):
    z = [rng.gauss(0, 1) for _ in range(z_dim)]
    return decode(z, dec)
```

这五行就是生成模型。

## 常见问题

- **后验坍塌。** KL 项过于强烈地推动 `q(z|x) → N(0, I)`，导致 `z` 不再携带有关 `x` 的信息。解决方法：β 退火（从 β=0 开始，逐渐升到 1）、自由比特（free bits），或不对未激活维度施加 KL。
- **样本模糊。** 高斯解码器似然意味着使用 MSE 重建，而 MSE 在 L2 下的贝叶斯最优解是均值；多个可信数字的均值就是一个模糊数字。解决方法：采用离散解码器（VQ-VAE、NVAE），或者只把 VAE 用作编码器，在潜变量上叠加扩散模型（Stable Diffusion 正是这样做的）。
- **β 太大、增大得太早。** 这会导致后验坍塌。从 β≈0.01 开始并逐步提高。
- **潜变量维度过小。** MNIST 可使用 16 维，ImageNet 256² 可使用 256 维，ImageNet 1024² 可使用 2048 维。Stable Diffusion 的 VAE 把 512×512×3 压缩为 64×64×4（原文表述为空间面积下采样 32 倍、通道下采样 32 倍）。

## 使用方法

2026 年的 VAE 技术栈：

| 情形 | 选择 |
|------|------|
| 扩散模型的图像潜变量编码器 | Stable Diffusion VAE（`sd-vae-ft-ema`）或 Flux VAE |
| 音频潜变量编码器 | Encodec（Meta）、SoundStream 或 DAC（Descript） |
| 视频潜变量 | Sora 的时空图块、Latte VAE、WAN VAE |
| 解耦表示学习 | β-VAE、FactorVAE、TCVAE |
| 离散潜变量（供 Transformer 建模） | VQ-VAE、RVQ（ResidualVQ） |
| 用于生成的连续潜变量 | 普通 VAE，再在该潜空间中对流 / 扩散模型施加条件控制 |

潜空间扩散模型就是在 VAE 编码器与解码器之间放置一个扩散模型。VAE 完成粗粒度压缩，扩散模型承担主要生成工作。视频（VAE + 视频扩散 DiT）和音频（Encodec + MusicGen Transformer）也采用同一模式。

## 交付成果

保存为 `outputs/skill-vae-trainer.md`。

该技能接收数据集概况、目标潜变量维度和下游用途（重建、采样或作为潜空间扩散的输入），输出架构选择（普通 / β / VQ / RVQ）、β 调度、潜变量维度、解码器似然（高斯或类别分布），以及评估计划（重建 MSE、逐维 KL、`q(z|x)` 与 `N(0, I)` 之间的 Fréchet 距离）。

## 练习

1. **简单。** 把 `code/main.py` 中的 `β` 分别改为 `0.01`、`0.1`、`1.0`、`5.0`。记录最终的重建 MSE 与 KL。对于这份合成数据，哪个 β 位于帕累托前沿？
2. **中等。** 用伯努利似然（交叉熵损失）替换高斯解码器似然。在同一份合成数据的二值化版本上比较样本质量。
3. **困难。** 把 `code/main.py` 扩展成微型 VQ-VAE：用含 K=32 个条目的码本中的最近邻查找替换连续 `z`。比较重建 MSE，并报告实际使用了多少个码本条目（码本坍塌确实会发生）。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| 自编码器 | 编码—解码网络 | `x → z → x̂`，学习 MSE。它不是生成模型。 |
| VAE | 带采样器的 AE | 编码器输出分布，KL 惩罚塑造编码空间。 |
| ELBO | 证据下界 | `log p(x) ≥ recon - KL[q(z\|x) \|\| p(z)]`；`q = p(z\|x)` 时取到紧界。 |
| 重参数化 | `z = μ + σ·ε` | 把随机节点改写为确定性运算 + 纯噪声，使采样过程可以反向传播。 |
| 先验 | `p(z)` | 潜变量的目标分布，通常为 `N(0, I)`。 |
| 后验坍塌 | “KL 项获胜” | 编码器忽略 `x` 并输出先验；解码器只能凭空生成。 |
| β-VAE | 可调的 KL 权重 | `loss = recon + β·KL`。β 越大，表示越解耦，但样本也越模糊。 |
| VQ-VAE | 离散潜变量 | 用最近的码本向量替换连续 `z`，使 Transformer 能够建模。 |

## 生产说明：VAE 是扩散服务器中最热的路径

Stable Diffusion / Flux / SD3 流水线会为每个请求调用两次 VAE：一次编码（执行 img2img / 修复时），一次解码。在 1024² 分辨率下，解码器常常产生整条流水线中最大的激活内存峰值，因为它要把 `128×128×16` 的潜变量上采样回 `1024×1024×3`。由此带来两个实际结论：

- **分片或分块解码。** `diffusers` 提供 `pipe.vae.enable_slicing()` 和 `pipe.vae.enable_tiling()`。分块会引入少量接缝伪影，但能把内存从 `O(H·W)` 降为 `O(tile²)`。在消费级 GPU 上处理 1024² 及更高分辨率时不可或缺。
- **解码器使用 bf16，最终缩放使用 fp32 数值。** SD 1.x VAE 以 fp32 发布，在 1024² 及更高分辨率下转成 fp16 会*悄无声息地产生 NaN*。SDXL 提供 `madebyollin/sdxl-vae-fp16-fix`，应优先选择 fp16 修复版本，或直接使用 bf16。

## 延伸阅读

- [Kingma 与 Welling（2013），《Auto-Encoding Variational Bayes》](https://arxiv.org/abs/1312.6114)——VAE 论文。
- [Higgins 等（2017），《β-VAE: Learning Basic Visual Concepts with a Constrained Variational Framework》](https://openreview.net/forum?id=Sy2fzU9gl)——解耦 β-VAE。
- [van den Oord 等（2017），《Neural Discrete Representation Learning》](https://arxiv.org/abs/1711.00937)——VQ-VAE。
- [Vahdat 与 Kautz（2021），《NVAE: A Deep Hierarchical Variational Autoencoder》](https://arxiv.org/abs/2007.03898)——先进的图像 VAE。
- [Rombach 等（2022），《High-Resolution Image Synthesis with Latent Diffusion Models》](https://arxiv.org/abs/2112.10752)——Stable Diffusion；以 VAE 作为编码器。
- [Défossez 等（2022），《High Fidelity Neural Audio Compression》](https://arxiv.org/abs/2210.13438)——音频 VAE 标准 Encodec。
