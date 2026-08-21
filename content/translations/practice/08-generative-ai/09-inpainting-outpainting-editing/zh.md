---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/08-generative-ai/09-inpainting-outpainting-editing/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: a0a39b1a67b7b04440df938be761512cc0fc841d15d2ca492e7d7cdbad0cdbc2
status: reviewed
---

# 图像修复、外扩与编辑

> 文生图创造新内容，图像修复修正旧内容。生产环境中，70% 的可计费图像工作都属于编辑：替换背景、移除标志、扩展画布、重新生成手部。图像修复让扩散真正发挥价值。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 8 第 07 课（潜空间扩散）、Phase 8 第 08 课（ControlNet 与 LoRA）  
**预计时间：** 约 75 分钟

## 问题

客户发来一张近乎完美的产品照片，但背景里有一块分散注意力的招牌。你想擦掉招牌，其他所有像素保持完全相同。不能从头运行文生图，否则颜色、光照和产品角度都会变化。你只想重新生成*遮罩内部*的区域，并要求新内容尊重周围上下文。

图像修复（inpainting）有几种变体：

- **图像修复。** 重新生成遮罩内部，保留外部像素。
- **图像外扩。** 重新生成遮罩外部（或画布以外），保留内部区域。
- **图像编辑。** 重新生成整张图像，但保持与原图的语义或结构一致性（SDEdit、InstructPix2Pix）。

2026 年的每条扩散流水线都提供图像修复模式，包括 Flux.1-Fill、Stable Diffusion Inpaint、SDXL-Inpaint、DALL-E 3 Edit。它们使用同一项原理。

## 概念

![图像修复：感知遮罩的去噪与保留上下文的重新注入](../assets/inpainting.svg)

### 朴素方法（及其错误之处）

使用遮罩运行标准文生图。在每个采样步骤，把带噪潜变量的未遮罩区域替换为经过前向扩散的干净图像。这种方法勉强能用，但效果很差。模型不知道遮罩区域中原本有什么，边界伪影会渗透出来。

### 正确的图像修复模型

训练经过修改的 U-Net，让它接收 9 个输入通道，而不是 4 个：

```
input = concat([ noisy_latent (4ch), encoded_image (4ch), mask (1ch) ], dim=channel)
```

额外通道由 VAE 编码源图像的副本和一张单通道遮罩组成。训练时随机遮住图像区域，只训练模型对遮罩区域去噪，并把未遮罩区域作为干净条件信号提供给模型。推理时，模型可以“看见”遮罩周围的内容，从而生成连贯的补全结果。

SD-Inpaint、SDXL-Inpaint、Flux-Fill 都使用这种 9 通道输入或类似形式。Diffusers 提供 `StableDiffusionInpaintPipeline`、`FluxFillPipeline`。

### SDEdit（Meng 等，2022）——无需训练的编辑

给源图像加噪直到某个中间 `t`，再使用新提示词从 `t` 沿反向链运行到 0。无需重新训练。起始 `t` 在保真度与创作自由度之间取舍：

- `t/T = 0.3` → 与源图像近乎相同，只做小幅风格变化
- `t/T = 0.6` → 中等程度编辑，保留粗略结构
- `t/T = 0.9` → 从接近噪声的状态生成，只保留极少源图像内容

### InstructPix2Pix（Brooks 等，2023）

在 `(输入图像, 指令, 输出图像)` 三元组上微调扩散模型。推理时同时以输入图像和文本指令（“改成日落”“加一条龙”）为条件。它有两个 CFG 强度：图像强度和文本强度。

### RePaint（Lugmayr 等，2022）

保留标准无条件扩散模型。在每个反向步骤重新采样，也就是偶尔跳回噪声更强的状态再重新生成。这样可以避免边界伪影，适用于没有训练好图像修复模型的情况。

```figure
inpaint-mask-reinject
```

## 动手构建

`code/main.py` 在五维数据上实现玩具一维图像修复方案。我们会在五维混合数据上训练 DDPM；每个样本由某一簇中的 5 个浮点数组成。推理时“遮住”5 个维度中的 2 个，每一步都注入未遮住 3 个维度的带噪前向版本，只重新生成被遮住的维度。

### 第 1 步：五维 DDPM 数据

```python
def sample_data(rng):
    cluster = rng.choice([0, 1])
    center = [-1.0] * 5 if cluster == 0 else [1.0] * 5
    return [c + rng.gauss(0, 0.2) for c in center], cluster
```

### 第 2 步：训练处理全部五个维度的去噪器

使用标准 DDPM。网络为五维带噪输入输出五维噪声预测。

### 第 3 步：推理时执行感知遮罩的反向过程

```python
def inpaint_step(x_t, mask, clean_image, alpha_bars, t, rng):
    # 用重新加噪的干净源图像版本替换未遮罩维度
    a_bar = alpha_bars[t]
    for i in range(len(x_t)):
        if not mask[i]:
            x_t[i] = math.sqrt(a_bar) * clean_image[i] + math.sqrt(1 - a_bar) * rng.gauss(0, 1)
    # ……然后对 x_t 执行普通反向步骤
```

这是朴素方法，在玩具一维数据上可以奏效。真实图像修复使用 9 通道输入，因为纹理连贯性更重要。

### 第 4 步：图像外扩

图像外扩就是反转遮罩后的图像修复：遮住新增的、原先不存在的画布，使用原图填充其余部分。训练目标完全相同。

## 常见问题

- **接缝。** 朴素方法会留下可见边界，因为梯度信息无法跨过遮罩流动。解决方法：把遮罩扩张 8～16 像素，或使用正确的图像修复模型。
- **遮罩泄漏。** 如果条件图像的未遮罩区域质量很差或含有噪声，它会污染遮罩内部的生成结果。先去噪或轻微模糊。
- **CFG 与遮罩大小相互影响。** 小遮罩搭配高 CFG 会产生饱和图块。小幅编辑应降低 CFG。
- **SDEdit 保真度断崖。** `t/T` 从 0.5 增至 0.6，就可能丢失主体身份。应扫描多个取值并保存检查点。
- **提示词不匹配。** 提示词应描述*整张*图像，而非只描述新增内容。应写“一只猫坐在椅子上”，而不是“一只猫”。

## 使用方法

| 任务 | 流水线 |
|------|--------|
| 移除物体、小遮罩 | SD-Inpaint 或 Flux-Fill，使用标准提示词 |
| 替换天空 | SD-Inpaint + “日落时的蓝天” |
| 扩展画布 | SDXL 外扩模式（8px 羽化）或带外扩遮罩的 Flux-Fill |
| 重新生成手部 / 人脸 | SD-Inpaint，提示词重新描述主体 + ControlNet-Openpose |
| 改变单一区域风格 | 在遮罩区域以 `t/T=0.5` 运行 SDEdit |
| “改成日落” | InstructPix2Pix 或 Flux-Kontext |
| 替换背景 | SAM 遮罩 → SD-Inpaint |
| 超高保真度 | 最困难的情况使用 Flux-Fill 或 GPT-Image（托管） |

SAM（Meta 的 Segment Anything，2023）+ 扩散修复是 2026 年的背景移除流水线。SAM 2（2024）可用于视频。

## 交付成果

保存为 `outputs/skill-editing-pipeline.md`。该技能接收原始图像 + 编辑描述 + 可选遮罩（或 SAM 提示），输出遮罩生成方法、基础模型、CFG 强度（图像 + 文本）、SDEdit-t 或图像修复模式，以及质量检查清单。

## 练习

1. **简单。** 在 `code/main.py` 中把遮罩维度所占比例从 0.2 变到 0.8。达到多大比例时，图像修复质量（遮罩维度的残差）与无条件生成相同？
2. **中等。** 实现 RePaint：每隔 10 个反向步骤就跳回 5 步（添加噪声）再重新去噪。测量它是否会减少遮罩边缘的边界残差。
3. **困难。** 使用 Hugging Face diffusers，在 20 个人脸重生成任务上比较 SD 1.5 Inpaint + ControlNet-Openpose 与 Flux.1-Fill。分别评估姿态遵循和身份保持。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| 图像修复 | “填洞” | 重新生成遮罩内部；保留外部像素。 |
| 图像外扩 | “扩展画布” | 重新生成画布外部；保留内部。 |
| 9 通道 U-Net | “正确的图像修复模型” | 以 `noisy \| encoded-source \| mask` 作为输入的 U-Net。 |
| SDEdit | “带噪声级别的 Img2img” | 加噪到时间 `t`，再用新提示词去噪。 |
| InstructPix2Pix | “纯文本编辑” | 在（图像、指令、输出）三元组上微调的扩散模型。 |
| RePaint | “无需重新训练” | 在反向过程中定期重新加噪，以减少接缝。 |
| SAM | “Segment Anything” | 通过点击或方框生成遮罩；与图像修复搭配使用。 |
| Flux-Kontext | “带上下文编辑” | 接收参考图像 + 编辑指令的 Flux 变体。 |

## 生产说明：编辑流水线对延迟敏感

用户编辑图像时希望往返时间低于 5 秒。在 L4 上运行 30 步、1024² 的 SDXL-Inpaint 需 3～4 秒；此外，SAM 遮罩生成约需 200 ms，VAE 编码 / 解码合计约需 500 ms。用生产框架描述，这类任务受 TTFT 而非吞吐量约束：批大小为 1，并发量低，每个阶段都要尽量缩短：

- **SAM-H 最慢。** SAM-H 处理 1024² 图像约需 200 ms；SAM-ViT-B 只需约 40 ms，质量损失很小。SAM 2（视频）会增加时间开销，单图编辑不要使用它。
- **可以跳过编码时就跳过。** `pipe.image_processor.preprocess(img)` 会把图像编码成潜变量。如果还保留着上一次生成的潜变量（迭代编辑界面中很常见），通过 `latents=...` 直接传入，从而省去一次 VAE 编码。
- **遮罩扩张也影响吞吐量。** 遮罩很小时，U-Net 的大部分前向传播都被浪费，因为未遮罩像素最终仍会被钳制。`diffusers` 的 `StableDiffusionInpaintPipeline` 无论如何都会运行完整 U-Net；只有正确的 9 通道图像修复变体能利用遮罩计算。
- **Flux-Kontext 是 2025 年的答案。** 对 `(source_image, instruction)` 执行一次前向传播，不需要单独遮罩，也无需扫描 SDEdit 噪声。在 H100 上，它约用 1.5 秒完成一次编辑。其架构启示是：把多个阶段合并起来。

## 延伸阅读

- [Lugmayr 等（2022），《RePaint: Inpainting using Denoising Diffusion Probabilistic Models》](https://arxiv.org/abs/2201.09865)——无需训练的图像修复。
- [Meng 等（2022），《SDEdit: Guided Image Synthesis and Editing with Stochastic Differential Equations》](https://arxiv.org/abs/2108.01073)——SDEdit。
- [Brooks、Holynski、Efros（2023），《InstructPix2Pix》](https://arxiv.org/abs/2211.09800)——文本指令编辑。
- [Kirillov 等（2023），《Segment Anything》](https://arxiv.org/abs/2304.02643)——SAM，遮罩来源。
- [Ravi 等（2024），《SAM 2: Segment Anything in Images and Videos》](https://arxiv.org/abs/2408.00714)——视频 SAM。
- [Hertz 等（2022），《Prompt-to-Prompt Image Editing with Cross-Attention Control》](https://arxiv.org/abs/2208.01626)——注意力层级编辑。
- [Black Forest Labs（2024），《Flux.1-Fill and Flux.1-Kontext》](https://blackforestlabs.ai/flux-1-tools/)——2024 年工具。
