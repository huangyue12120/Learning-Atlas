---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/08-generative-ai/04-conditional-gans-pix2pix/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: d6bbfa6ac4d6dc5ee373169e15023f9789b88a85ed0a7152ff0d588615c3ded7
status: reviewed
---

# 条件 GAN 与 Pix2Pix

> 2014—2017 年间的第一个重大突破，是控制 GAN 生成的内容。可以附加标签、图像或句子。Pix2Pix 实现了图像版本；即使到了今天，在窄领域图像到图像任务上，它仍能胜过所有通用文生图模型。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 8 第 03 课（GAN）、Phase 4 第 06 课（U-Net）、Phase 3 第 07 课（CNN）  
**预计时间：** 约 75 分钟

## 问题

无条件 GAN 会随机生成人脸。用来演示还行，放进生产则毫无用处。你真正想做的是：*把草图变成照片*、*把地图变成航拍图*、*把白天场景变成夜晚*、*给灰度图像上色*。这些任务都给定一张输入图像 `x`，要求输出与其具有某种语义对应关系的 `y`。每个 `x` 都可能对应许多个合理的 `y`。均方误差会把这些可能性压平成一团模糊结果；对抗损失不会，因为“看起来真实”要求图像清晰。

条件 GAN（Mirza 与 Osindero，2014）把条件 `c` 同时作为 `G` 和 `D` 的输入。Pix2Pix（Isola 等，2017）进一步规定：条件是一张完整输入图像；生成器使用 U-Net；判别器使用*基于图块*的分类器（PatchGAN）；损失由对抗项与 L1 项组成。即使到 2026 年，这套方案在窄领域图像到图像任务上仍能胜过从头训练的文生图模型，因为它使用*配对数据*训练，拥有任务所需的精确信号。

## 概念

![Pix2Pix：U-Net 生成器与 PatchGAN 判别器](../assets/pix2pix.svg)

**条件生成器 G。** `G(x, z) → y`。在 Pix2Pix 中，`z` 是 G 内部的 dropout（没有输入噪声，Isola 发现模型会忽略显式噪声）。

**条件判别器 D。** `D(x, y) → [0, 1]`。输入是*一对*数据（条件、输出）。关键区别就在这里：D 必须判断 `y` 是否与 `x` 一致，而不只是判断 `y` 看起来是否真实。

**U-Net 生成器。** 在瓶颈两侧设置跳跃连接的编码器—解码器。输入与输出共享低层结构（边缘、轮廓）的任务离不开这些连接。没有跳跃连接，高频细节就会消失。

**PatchGAN 判别器。** D 不输出单个真假分数，而是输出 `N×N` 网格，每个单元判断约 70×70 像素的感受野，最后取平均。这相当于采用马尔可夫随机场假设：真实感具有局部性。该方法训练快得多，参数更少，输出也更清晰。

**损失。**

```
loss_G = -log D(x, G(x)) + λ · ||y - G(x)||_1
loss_D = -log D(x, y) - log (1 - D(x, G(x)))
```

L1 项稳定训练，并把 G 推向已知目标。L1 比 L2 产生更清晰的边缘，因为它对应中位数而非均值。Pix2Pix 默认使用 `λ = 100`。

## CycleGAN——没有配对数据时怎么办

Pix2Pix 需要配对的 `(x, y)` 数据。CycleGAN（Zhu 等，2017）通过增加一项*循环一致性*损失去掉了这项要求。它使用两个生成器 `G: X → Y` 和 `F: Y → X`，并通过训练使 `F(G(x)) ≈ x` 且 `G(F(y)) ≈ y`。由此无需配对样本，就能完成马变斑马、夏季变冬季等转换。

到 2026 年，无配对图像到图像转换主要使用扩散方法（ControlNet、IP-Adapter），而非 CycleGAN；但几乎每篇无配对领域适应论文仍在使用循环一致性思想。

```figure
gx-patchgan
```

## 动手构建

`code/main.py` 在一维数据上实现了微型条件 GAN。条件 `c` 是类别标签（0 或 1）。任务是针对给定类别，从相应条件分布中生成一个样本。

### 第 1 步：把条件同时附加到 G 和 D 的输入

```python
def G(z, c, params):
    return mlp(concat([z, one_hot(c)]), params)

def D(x, c, params):
    return mlp(concat([x, one_hot(c)]), params)
```

独热编码是最简单的做法。更大的模型会使用学习得到的嵌入、FiLM 调制或交叉注意力。

### 第 2 步：进行条件训练

```python
for step in range(steps):
    x, c = sample_real_conditional()
    noise = sample_noise()
    update_D(x_real=x, x_fake=G(noise, c), c=c)
    update_G(noise, c)
```

生成器必须匹配*给定条件下*的真实分布，而不是边缘分布。

### 第 3 步：逐类验证输出

```python
for c in [0, 1]:
    samples = [G(noise, c) for noise in batch]
    mean_c = mean(samples)
    assert_near(mean_c, real_mean_for_class_c)
```

## 常见问题

- **忽略条件。** G 学会对条件求边缘化，而 D 因条件信号太弱从不惩罚它。解决方法：在 D 的前部网络层就更强地注入条件，而不是只在后部注入；也可以使用投影判别器（Miyato 与 Koyama，2018）。
- **L1 权重太低。** G 偏向任意但看似真实的输出，不再忠实于输入。Pix2Pix 类任务可以从 λ≈100 开始。
- **L1 权重太高。** G 产生模糊输出，因为 L1 仍属于 L_p 范数。训练稳定后逐步降低权重。
- **D 中泄漏真实答案。** 把 `(x, y)` 拼接为 D 的输入，不能只输入 `y`。否则 D 无法检查一致性。
- **逐类模式坍塌。** 每个类别都可能单独坍塌。应执行类别条件下的多样性检查。

## 使用方法

2026 年图像到图像任务的技术现状：

| 任务 | 最佳方法 |
|------|----------|
| 草图 → 照片，同一领域，有配对数据 | Pix2Pix / Pix2PixHD（仍然快速、清晰） |
| 草图 → 照片，无配对数据 | 带 Scribble 条件模型的 ControlNet |
| 语义分割图 → 照片 | SPADE / GauGAN2 或 SD + ControlNet-Seg |
| 风格迁移 | 带 IP-Adapter 或 LoRA 的扩散；GAN 方法已经过时 |
| 深度图 → 照片 | Stable Diffusion 上的 ControlNet-Depth |
| 超分辨率 | Real-ESRGAN（GAN）、ESRGAN-Plus 或 SD-Upscale（扩散） |
| 图像着色 | ColTran、基于扩散的着色器或 Pix2Pix-color |
| 白天 → 夜晚、季节、天气 | CycleGAN 或基于 ControlNet 的方法 |

当（a）你有数千个配对样本，（b）任务狭窄且可重复，（c）你需要快速推理时，Pix2Pix 仍是合适工具。通用开放领域任务则由扩散胜出。

## 交付成果

保存为 `outputs/skill-img2img-chooser.md`。该技能接收任务描述、数据可用情况（配对或无配对、样本数 N）以及延迟 / 质量预算，然后输出方法（Pix2Pix、CycleGAN、ControlNet 变体、SDXL + IP-Adapter）、训练数据要求、推理成本和评估方案（LPIPS、FID、任务专用指标）。

## 练习

1. **简单。** 修改 `code/main.py`，添加第三个类别。确认 G 仍能把每个类别的噪声映射到正确模式。
2. **中等。** 在一维场景中，用感知式损失替换 L1，例如用冻结的小型 D 作为特征提取器。条件分布的清晰度是否发生变化？
3. **困难。** 在一维场景中勾勒 CycleGAN：两个分布、两个生成器和循环损失。证明它无需配对数据也能学习两个分布之间的映射。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| 条件 GAN | “带标签的 GAN” | G(z, c)、D(x, c)。两个网络都能看到条件。 |
| Pix2Pix | “图像到图像 GAN” | 配对 cGAN，使用 U-Net G、PatchGAN D 和 L1 损失。 |
| U-Net | “带跳跃连接的编码器—解码器” | 对称卷积网络；跳跃连接保留高频信息。 |
| PatchGAN | “局部真实感分类器” | D 输出逐图块分数，而非全局分数。 |
| CycleGAN | “无配对图像转换” | 两个 G + 循环一致性损失；无需配对数据。 |
| SPADE | “GauGAN” | 用语义图对中间激活进行归一化；用于分割图到图像。 |
| FiLM | “逐特征线性调制” | 根据条件对各特征执行仿射变换；条件控制成本低。 |

## 生产说明：以 Pix2Pix 作为延迟受限基线

当你拥有配对数据且任务范围很窄（草图 → 渲染图、语义图 → 照片、白天 → 夜晚）时，Pix2Pix 的单步推理延迟比扩散低一个数量级。生产环境通常进行如下比较：

| 路径 | 步数 | 单张 L4 上处理 512² 的典型延迟 |
|------|------|--------------------------------|
| Pix2Pix（U-Net 前向传播） | 1 | 约 30 ms |
| SD-Inpaint 或 SD-Img2Img | 20 | 约 1.2 s |
| SDXL-Turbo Img2Img | 1～4 | 约 0.15～0.35 s |
| ControlNet + SDXL 基础模型 | 20～30 | 约 3～5 s |

Pix2Pix 在静态批处理时拥有吞吐量优势，因为每个请求的 FLOPs 都相同。扩散则在质量和泛化上占优。现代做法通常是为窄任务部署 Pix2Pix 式蒸馏模型，并用扩散处理尾部输入。

## 延伸阅读

- [Mirza 与 Osindero（2014），《Conditional Generative Adversarial Nets》](https://arxiv.org/abs/1411.1784)——cGAN 论文。
- [Isola 等（2017），《Image-to-Image Translation with Conditional Adversarial Networks》](https://arxiv.org/abs/1611.07004)——Pix2Pix。
- [Zhu 等（2017），《Unpaired Image-to-Image Translation using Cycle-Consistent Adversarial Networks》](https://arxiv.org/abs/1703.10593)——CycleGAN。
- [Wang 等（2018），《High-Resolution Image Synthesis with Conditional GANs》](https://arxiv.org/abs/1711.11585)——Pix2PixHD。
- [Park 等（2019），《Semantic Image Synthesis with Spatially-Adaptive Normalization》](https://arxiv.org/abs/1903.07291)——SPADE / GauGAN。
- [Miyato 与 Koyama（2018），《cGANs with Projection Discriminator》](https://arxiv.org/abs/1802.05637)——投影判别器。
