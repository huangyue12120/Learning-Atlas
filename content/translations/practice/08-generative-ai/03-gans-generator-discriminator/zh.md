---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/08-generative-ai/03-gans-generator-discriminator/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: db7fe86ffad9d10f6c5a3af0a1192fde88538af04589e34a21472b8769a1cdf8
status: reviewed
---

# GAN——生成器与判别器

> Goodfellow 在 2014 年提出的技巧完全跳过了密度。两个网络，一个制造赝品，一个识别赝品。双方不断对抗，直到假样本与真实样本无法区分。这个方法看起来不该奏效，也确实经常失败；一旦成功，它在窄领域生成的样本至今仍属文献中最清晰的一批。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 3 第 02 课（反向传播）、Phase 3 第 08 课（优化器）、Phase 8 第 02 课（VAE）  
**预计时间：** 约 75 分钟

## 问题

VAE 生成的样本很模糊，因为其 MSE 解码器损失在*均值*图像上达到贝叶斯最优，而多个可信数字的均值是一个模糊数字。你需要一种奖励*可信度*的损失，而不是奖励与某个目标逐像素接近。可信度没有闭式表达式，只能学习。

Goodfellow 的思路是：训练分类器 `D(x)` 区分真实图像与假图像，再训练生成器 `G(z)` 欺骗 `D`。`G` 的损失信号来自 `D` 当下对真实感的判断。随着 `G` 改进，这个信号也会更新，生成器始终追逐一个移动目标。如果两个网络都收敛，`G` 就在从未写出 `log p(x)` 的情况下学会了数据分布。

这种训练称为对抗训练，其数学形式是一个极小极大博弈：

```
min_G max_D  E_real[log D(x)] + E_fake[log(1 - D(G(z)))]
```

到 2026 年，GAN 已经不是最先进的生成器，扩散与流匹配夺走了这一位置。不过，StyleGAN 2/3 仍是投入使用过的最清晰人脸模型；扩散训练把 GAN 判别器用作*感知损失*；SDXL-Turbo、SD3-Turbo 和 LCM 等快速单步蒸馏也借助对抗训练，让实时扩散得以部署。

## 概念 <!-- learning-atlas: the-concept -->

![极小极大博弈中的 GAN 生成器与判别器训练](../assets/gan.svg)

**生成器 `G(z)`。** 把噪声向量 `z ~ N(0, I)` 映射成样本 `x̂`。它采用类似解码器的网络（全连接层或转置卷积）。

**判别器 `D(x)`。** 把样本映射为标量概率（或分数）。真实 → 1，虚假 → 0。

**损失。** 交替进行两项更新：

- **训练 `D`：** `loss_D = -[ log D(x) + log(1 - D(G(z))) ]`。对真实=1、虚假=0 计算二元交叉熵。
- **训练 `G`：** `loss_G = -log D(G(z))`。这是 Goodfellow 使用的*非饱和*形式（原始的 `log(1 - D(G(z)))` 会在 `D` 十分确信时饱和并让梯度消失）。

**训练循环。** 更新一步 `D`，再更新一步 `G`，不断重复。

**奏效的原因。** 如果 `G` 完美匹配 `p_data`，`D` 就无法做得比随机猜测更好，并会在所有位置输出 0.5；`G` 不再获得梯度。此时达到均衡。

**失效的原因。** 模式坍塌（`G` 找到一个 `D` 无法分类的模式并反复复制）、梯度消失（`D` 学得太快，`log D` 饱和）、训练不稳定（学习率、批大小等因素都会造成影响）。

## 让 GAN 真正可用的变体

| 年份 | 创新 | 解决的问题 |
|------|------|------------|
| 2015 | DCGAN | 卷积 / 反卷积、批归一化、LeakyReLU，构成第一个稳定架构。 |
| 2017 | WGAN、WGAN-GP | 用 Wasserstein 距离 + 梯度惩罚替换 BCE，解决梯度消失。 |
| 2017 | 谱归一化 | 约束判别器的 Lipschitz 常数。2026 年的判别器仍在使用。 |
| 2018 | Progressive GAN | 先训练低分辨率，再逐层增加网络。首次得到百万像素级结果。 |
| 2019 | StyleGAN / StyleGAN2 | 映射网络 + 自适应实例归一化。固定领域照片级真实感的先进方法。 |
| 2021 | StyleGAN3 | 无混叠且具有平移等变性，到 2026 年仍是人脸生成的黄金标准。 |
| 2022 | StyleGAN-XL | 带条件、感知类别且规模更大。 |
| 2024 | R3GAN | 采用更强的正则化重新包装 GAN；无需技巧便可处理 1024²。 |

```figure
gan-minimax
```

## 动手构建

`code/main.py` 在一维数据上训练微型 GAN，目标分布是两个高斯分布的混合。生成器和判别器都是单隐藏层 MLP。我们会手写前向传播、反向传播和极小极大训练循环，观察两个关键失效模式（模式坍塌与梯度消失）如何发生。

### 第 1 步：非饱和损失

当 D 很有把握地把 G 的假样本判为假时，原版 Goodfellow 损失 `log(1 - D(G(z)))` 会趋近 0。此时 G 的梯度也近乎为零，无法继续改进。非饱和形式 `-log D(G(z))` 的渐近行为相反：D 越确信，它就越大，从而向 G 提供强信号。

```python
def g_loss(d_fake):
    # 最大化 log D(G(z))  <=>  最小化 -log D(G(z))
    return -sum(math.log(max(p, 1e-8)) for p in d_fake) / len(d_fake)
```

### 第 2 步：判别器与生成器各更新一步

```python
for step in range(steps):
    # 训练 D
    real_batch = sample_real(batch_size)
    fake_batch = [G(z) for z in sample_noise(batch_size)]
    update_D(real_batch, fake_batch)

    # 训练 G
    fake_batch = [G(z) for z in sample_noise(batch_size)]  # 重新生成假样本
    update_G(fake_batch)
```

训练 G 时应重新生成假样本，否则梯度已经过时。

### 第 3 步：监视模式坍塌

```python
if step % 200 == 0:
    samples = [G(z) for z in sample_noise(500)]
    mode_a = sum(1 for s in samples if s < 0)
    mode_b = 500 - mode_a
    if min(mode_a, mode_b) < 50:
        print("  [!] mode collapse: one mode is starved")
```

典型症状是两个真实模式中有一个不再被生成。判别器也不会纠正这一问题，因为它再也看不到来自该模式的假样本。

## 常见问题

- **判别器太强。** 把 D 的学习率降至原来的 1/2～1/5，或加入实例 / 层噪声。如果 D 的准确率超过 95%，G 已经无法学习。
- **生成器记住了一个模式。** 给 D 的输入添加噪声，使用小批量判别层，或者改用 WGAN-GP。
- **批归一化泄漏统计量。** 真实批次与虚假批次流经同一个 BN 层时会混合彼此的统计量。改用实例归一化或谱归一化。
- **利用 Inception Score 漏洞。** 样本量较小时，FID 和 IS 噪声很大。评估时至少使用 1 万个样本。
- **条件任务中的一步采样是假象。** 你仍需要 CFG 强度、截断技巧和重新采样才能得到可用输出。

## 使用方法

2026 年的 GAN 技术栈：

| 情形 | 选择 |
|------|------|
| 固定姿态的照片级人脸 | StyleGAN3（最清晰、最小） |
| 动漫 / 风格化人脸 | StyleGAN-XL 或 Stable Diffusion LoRA |
| 图像到图像转换 | Pix2Pix / CycleGAN（Phase 8 第 04 课）或 ControlNet（Phase 8 第 08 课） |
| 快速单步文生图 | 对扩散进行对抗蒸馏（SDXL-Turbo、SD3-Turbo） |
| 扩散训练器内部的感知损失 | 在图像裁剪块上运行的小型 GAN 判别器 |
| 任何多模态、开放式任务 | 不要使用 GAN，改用扩散或流匹配 |

GAN 清晰但适用面窄。只要领域扩展到照片、任意文本提示或视频，就应切换到扩散。对抗技巧仍作为组件存在于感知损失和蒸馏中，而不再充当独立生成器。

## 交付成果

保存为 `outputs/skill-gan-debugger.md`。该技能接收失败的 GAN 训练运行（损失曲线、样本网格、数据集大小），输出可能原因的排序列表、单行修复建议和重新运行方案。

## 练习

1. **简单。** 使用默认设置运行 `code/main.py`，然后设置 `D_LR = 5 * G_LR` 并重新运行。G 的损失多快会坍缩为常数？
2. **中等。** 用 WGAN 损失替换 Goodfellow BCE 损失：`loss_D = E[D(fake)] - E[D(real)]`，`loss_G = -E[D(fake)]`，并把 D 的权重裁剪到 `[-0.01, 0.01]`。训练是否更稳定？比较实际收敛耗时。
3. **困难。** 把一维示例扩展到二维数据（圆环上的 8 个高斯混合分量）。记录生成器在第 1k、5k、10k 步捕获了 8 个模式中的多少个。实现小批量判别并重新测量。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| 生成器 | “G” | 从噪声到样本的网络，`G: z → x̂`。 |
| 判别器 | “D” | 分类器 `D: x → [0, 1]`，区分真实与虚假。 |
| 极小极大 | “博弈” | 对一个联合目标执行 `min_G max_D`。 |
| 非饱和损失 | “修复方法” | G 使用 `-log D(G(z))`，而不是 `log(1 - D(G(z)))`。 |
| 模式坍塌 | “G 只记住了一种东西” | 尽管数据多样，生成器只产生少数几种不同输出。 |
| WGAN | “Wasserstein” | 用推土机距离 + 梯度惩罚替换 BCE，获得更平滑的梯度。 |
| 谱归一化 | “Lipschitz 技巧” | 约束 D 的权重范数以限制其斜率，从而稳定训练。 |
| StyleGAN | “真正能用的那个” | 映射网络 + AdaIN；即使在 2026 年仍是同类最佳的人脸模型。 |

## 生产说明：单步推理是 GAN 的持久优势

GAN 在开放领域生成质量上已经不再领先，但仍能赢得推理成本优势。用生产推理文献中的术语描述，GAN 具有以下特点：

- **没有预填充或解码阶段。** 只执行一次 `G(z)` 前向传播。TTFT 约等于总延迟。
- **没有 KV 缓存压力。** 唯一状态是权重。批大小受激活内存约束，不受缓存约束。
- **连续批处理很简单。** 每个请求的 FLOPs 都固定相同，因此通常只需按服务器目标占用率组成静态批次，不需要在途调度器。

因此，到 2026 年，GAN 蒸馏（SDXL-Turbo、SD3-Turbo、ADD、LCM）仍是快速文生图的主流技术：它把 20～50 步的扩散流水线压缩为 1～4 次 GAN 式前向传播，同时保留扩散基础模型的分布。对抗损失作为训练调节项继续发挥作用，把慢生成器转化为快生成器。

## 延伸阅读

- [Goodfellow 等（2014），《Generative Adversarial Nets》](https://arxiv.org/abs/1406.2661)——原始 GAN 论文。
- [Radford 等（2015），《Unsupervised Representation Learning with DCGAN》](https://arxiv.org/abs/1511.06434)——第一个稳定架构。
- [Arjovsky、Chintala、Bottou（2017），《Wasserstein GAN》](https://arxiv.org/abs/1701.07875)——WGAN。
- [Miyato 等（2018），《Spectral Normalization for GANs》](https://arxiv.org/abs/1802.05957)——谱归一化。
- [Karras 等（2020），《Analyzing and Improving the Image Quality of StyleGAN》](https://arxiv.org/abs/1912.04958)——StyleGAN2。
- [Karras 等（2021），《Alias-Free Generative Adversarial Networks》](https://arxiv.org/abs/2106.12423)——StyleGAN3。
- [Sauer 等（2023），《Adversarial Diffusion Distillation》](https://arxiv.org/abs/2311.17042)——SDXL-Turbo。
