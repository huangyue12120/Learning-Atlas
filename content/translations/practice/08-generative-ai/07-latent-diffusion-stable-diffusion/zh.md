---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/08-generative-ai/07-latent-diffusion-stable-diffusion/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 31a712aa953cffde8d835b2d6776923c98ca0946f06adb2c53f2694863ba6941
status: reviewed
---

# 潜空间扩散与 Stable Diffusion

> 在 512×512 图像的像素空间中运行扩散，堪称计算资源暴行。Rombach 等（2022）发现，生成一张图像并不需要全部 78.6 万个维度，只需足以捕获语义结构的表示，再用独立解码器处理其余细节。让扩散在 VAE 的潜空间内运行。Stable Diffusion 就建立在这一项想法上。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 8 第 02 课（VAE）、Phase 8 第 06 课（DDPM）、Phase 7 第 09 课（ViT）  
**预计时间：** 约 75 分钟

## 问题

在 512² 像素空间中运行扩散，意味着 U-Net 要处理形状为 `[B, 3, 512, 512]` 的张量。对于一个拥有 5 亿参数的 U-Net，每个采样步骤约需 100 GFLOPS。50 步就是每张图像 5 TFLOPS。如果再用十亿张图像训练，计算账单会荒唐得难以承受。

这些 FLOPs 大多用于让感知上并不重要的细节通过网络，也就是有损 VAE 本可压缩掉的高频纹理。Rombach 的思路是：只训练一次 VAE（*第一阶段*）并冻结它，再让扩散完全运行在 4 通道、64×64 的潜空间（*第二阶段*）。使用同样的 U-Net，像素数降至 1/16，在质量相当的情况下 FLOPs 约减少 64 倍。

这构成 Stable Diffusion 的方案。SD 1.x / 2.x 使用 8.6 亿参数的 U-Net 处理 `64×64×4` 潜变量；SDXL 使用 26 亿参数的 U-Net 处理 `128×128×4` 潜变量；SD3 用采用流匹配的扩散 Transformer（DiT）替换 U-Net。Flux.1-dev（Black Forest Labs，2024）提供一个 120 亿参数的 DiT-MMDiT。它们都运行在同一套两阶段底座上。

## 概念

![潜空间扩散：VAE 压缩 + 潜空间中的扩散](../assets/latent-diffusion.svg)

**分开训练的两个阶段。**

1. **第 1 阶段——VAE。** 编码器 `E(x) → z`，解码器 `D(z) → x`。目标压缩方式：每条空间轴下采样 8 倍并调整通道，使潜变量总大小约为像素数的 1/16。损失 = 重建（L1 + LPIPS 感知损失）+ KL（权重较小，避免强迫 `z` 过于接近高斯；因为无需直接从 `z` 精确采样）。训练时通常还会加入对抗损失，使解码图像保持清晰。

2. **第 2 阶段——在 `z` 上扩散。** 把 `z = E(x_real)` 当作数据。训练 U-Net（或 DiT）对 `z_t` 去噪。推理时先通过扩散采样 `z_0`，再计算 `x = D(z_0)`。

**文本条件控制。** 还需两个组件。其一是冻结的文本编码器（SD 1.x 使用 CLIP-L，SD 2/XL 使用 CLIP-L+OpenCLIP-G，SD3 和 Flux 使用 T5-XXL）。其二是交叉注意力注入：每个 U-Net 块都接收 `[Q = 图像特征, K = V = 文本词元]` 并混合二者。文本只能通过这些词元影响图像。

**损失函数与第 06 课完全相同。** 仍然是在噪声上计算 DDPM / 流匹配 MSE，只是更换了数据域。

## 架构变体

| 模型 | 年份 | 骨干 | 潜变量形状 | 文本编码器 | 参数量 |
|------|------|------|------------|------------|--------|
| SD 1.5 | 2022 | U-Net | 64×64×4 | CLIP-L（77 个词元） | 860M |
| SD 2.1 | 2022 | U-Net | 64×64×4 | OpenCLIP-H | 865M |
| SDXL | 2023 | U-Net + 精修器 | 128×128×4 | CLIP-L + OpenCLIP-G | 2.6B + 6.6B |
| SDXL-Turbo | 2023 | 已蒸馏 | 128×128×4 | 同上 | 1～4 步采样 |
| SD3 | 2024 | MMDiT（多模态 DiT） | 128×128×16 | T5-XXL + CLIP-L + CLIP-G | 2B / 8B |
| Flux.1-dev | 2024 | MMDiT | 128×128×16 | T5-XXL + CLIP-L | 12B |
| Flux.1-schnell | 2024 | 已蒸馏 MMDiT | 128×128×16 | T5-XXL + CLIP-L | 12B，1～4 步 |

发展趋势是：用 DiT（在潜变量图块上运行的 Transformer）替换 U-Net；扩大文本编码器（T5 在提示词遵循方面优于 CLIP）；增加潜变量通道数（从 4 增至 16，为更多细节留出空间）。

```figure
noise-schedule
```

## 动手构建

`code/main.py` 在第 06 课的 DDPM 上叠加一个玩具一维“VAE”（为方便演示，编码器与解码器是恒等变换；真实 VAE 应使用卷积网络），并加入带无分类器引导的类别条件控制。该示例说明，无论在原始一维值还是编码值上运行，扩散都使用同一项损失。

### 第 1 步：编码器 / 解码器

```python
def encode(x):    return x * 0.5          # 玩具“压缩”：缩小数值尺度
def decode(z):    return z * 2.0
```

真实 VAE 拥有训练得到的权重。出于教学目的，这个线性映射足以说明扩散可以在 `z` 上运行，无需关心原始数据空间。

### 第 2 步：在 `z` 空间中扩散

使用与第 06 课相同的 DDPM。网络看到的数据是 `z = E(x)`。采样 `z_0` 后，用 `D(z_0)` 解码。

### 第 3 步：无分类器引导

训练时以 10% 的概率丢弃类别标签（替换为空词元）。推理时同时计算 `ε_cond` 和 `ε_uncond`，然后使用：

```python
eps_cfg = (1 + w) * eps_cond - w * eps_uncond
```

`w = 0` 表示不引导（多样性完整），`w = 3` 是默认值，`w = 7+` 会产生饱和 / 过度清晰的结果。

### 第 4 步：文本条件控制（概念，不写代码）

用冻结文本编码器的输出替换类别标签。通过交叉注意力把文本嵌入送入 U-Net：

```python
h = h + CrossAttention(Q=h, K=text_embed, V=text_embed)
```

这是类别条件扩散模型与 Stable Diffusion 之间唯一实质性的区别。

## 常见问题

- **VAE 尺度不匹配。** SD 1.x VAE 编码后会应用缩放常数（`scaling_factor ≈ 0.18215`）。漏掉它会让 U-Net 在方差严重错误的潜变量上训练。每个检查点都附带该值。
- **文本编码器悄悄出错。** SD3 需要支持至少 128 个词元的 T5-XXL，只回退到 CLIP 会损失信息。务必检查 `use_t5=True`，否则提示词保真度会骤降。
- **混用潜空间。** SDXL、SD3、Flux 使用不同 VAE。在 SDXL 潜变量上训练的 LoRA 无法用于 SD3。Hugging Face diffusers 0.30+ 会拒绝加载不匹配的检查点。
- **CFG 太高。** `w > 10` 会产生饱和、油腻的图像，为迎合提示词牺牲多样性。合适范围是 `w = 3-7`。
- **负向提示词泄漏。** 空负向提示词会变为空词元；非空负向提示词会变成 `ε_uncond`。两者并不相同，一些流水线会悄悄默认使用空词元。

## 使用方法

2026 年的生产技术栈：

| 目标 | 推荐骨干 |
|------|----------|
| 窄领域、配对数据、从头训练模型 | 微调 SDXL（LoRA / 全量），交付最快 |
| 开放领域文生图、开放权重 | Flux.1-dev（12B，Apache / 非商业）或 SD3.5-Large |
| 开放权重下的最快推理 | Flux.1-schnell（1～4 步，Apache）或 SDXL-Lightning |
| 最佳提示词遵循、托管服务 | GPT-Image / DALL-E 3（仍然领先）、Midjourney v7、Imagen 4 |
| 编辑工作流 | Flux.1-Kontext（2024 年 12 月），原生接收图像 + 文本 |
| 研究基线 | SD 1.5，虽已古老但研究充分 |

## 交付成果

保存为 `outputs/skill-sd-prompter.md`。该技能接收文本提示词与目标风格，输出模型 + 检查点、CFG 强度、采样器、负向提示词、分辨率、可选 ControlNet/IP-Adapter 组合，以及逐步质量检查清单。

## 练习

1. **简单。** 使用引导强度 `w ∈ {0, 1, 3, 7, 15}` 运行 `code/main.py`。记录各类别的样本均值。`w` 达到多少时，类别均值会超过真实数据均值并继续分离？
2. **中等。** 用一对带重建损失的 tanh-MLP 编码器 / 解码器替换玩具线性编码器。在新潜变量上重新训练扩散。样本质量是否发生变化？
3. **困难。** 使用 diffusers 配置真实的 Stable Diffusion 推理：加载 `sdxl-base`，用 CFG=7 运行 30 个 Euler 步并计时。然后切换到 `sdxl-turbo`，使用 4 步和 CFG=0。生成相同主体，描述质量发生了什么变化，并解释原因。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| 第一阶段 | “VAE” | 训练得到的编码器 / 解码器对；把 512² 压缩为 64²。 |
| 第二阶段 | “U-Net” | 在潜空间上运行的扩散模型。 |
| CFG | “引导强度” | `(1+w)·ε_cond - w·ε_uncond`；调节条件控制强度。 |
| 空词元 | “空提示词嵌入” | 用于 `ε_uncond` 的无条件嵌入。 |
| 交叉注意力 | “文本进入模型的方式” | 每个 U-Net 块都以文本词元作为 K 和 V 进行注意。 |
| DiT | “扩散 Transformer” | 用处理潜变量图块的 Transformer 替换 U-Net；扩展性更好。 |
| MMDiT | “多模态 DiT” | SD3 架构：文本流与图像流执行联合注意力。 |
| VAE 缩放因子 | “魔法数字” | 把潜变量除以约 5.4，使扩散在单位方差空间中运行。 |

## 生产说明：在 8GB 消费级 GPU 上运行 Flux-12B

参考 Flux 集成是“我有一张消费级 GPU，能否部署它？”的经典方案。它把生产推理文献中的三个调节项应用到了扩散 DiT：

1. **错峰加载。** Flux 包含三个无需同时驻留显存的网络：T5-XXL 文本编码器（fp32 约 10 GB）、CLIP-L（较小）、120 亿参数的 MMDiT，以及 VAE。先编码提示词，*删除*编码器；加载 DiT 并去噪，*删除* DiT；最后加载 VAE 并解码。8GB 消费级 GPU 每次只能容纳一个阶段。
2. **通过 bitsandbytes 进行 4 位量化。** T5 编码器和 DiT 都使用 `BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_compute_dtype=torch.bfloat16)`。内存减少 8 倍；根据 Aritra 在所链接笔记本中的基准，文生图质量下降无法察觉。
3. **CPU 卸载。** `pipe.enable_model_cpu_offload()` 会在每次前向传播推进时，自动在 CPU 与 GPU 之间交换模块。延迟增加 10%～20%，但流水线由此可以运行。

内存账目如下：量化后的 `10 GB T5 / 8 = 1.25 GB`，量化 DiT 为 `12 B 个参数 × 0.5 字节 = 约 6 GB`，此外还需激活内存。用 stas00 的术语说，这是 TP=1 推理的极端形式：不做模型并行，使用最大程度的量化。生产环境会在 H100 上运行 TP=2 或 TP=4；单台开发笔记本则采用这里的方案。

## 延伸阅读

- [Rombach 等（2022），《High-Resolution Image Synthesis with Latent Diffusion Models》](https://arxiv.org/abs/2112.10752)——Stable Diffusion。
- [Podell 等（2023），《SDXL: Improving Latent Diffusion Models for High-Resolution Image Synthesis》](https://arxiv.org/abs/2307.01952)——SDXL。
- [Peebles 与 Xie（2023），《Scalable Diffusion Models with Transformers (DiT)》](https://arxiv.org/abs/2212.09748)——DiT。
- [Esser 等（2024），《Scaling Rectified Flow Transformers for High-Resolution Image Synthesis》](https://arxiv.org/abs/2403.03206)——SD3、MMDiT。
- [Ho 与 Salimans（2022），《Classifier-Free Diffusion Guidance》](https://arxiv.org/abs/2207.12598)——CFG。
- [Labs（2024），《Flux.1——Black Forest Labs announcement》](https://blackforestlabs.ai/announcing-black-forest-labs/)——Flux.1 系列。
- [Hugging Face Diffusers 文档](https://huggingface.co/docs/diffusers/index)——上述每个检查点的参考实现。
