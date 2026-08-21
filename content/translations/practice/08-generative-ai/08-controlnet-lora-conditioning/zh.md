---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/08-generative-ai/08-controlnet-lora-conditioning/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: cc1f1598103a54fe7dda2459c8e0c172c22109098a64f730ac2dbb9d251e83b2
status: reviewed
---

# ControlNet、LoRA 与条件控制

> 单靠文本很难精确控制生成结果。ControlNet 允许你克隆预训练扩散模型，再使用深度图、姿态骨架、涂鸦或边缘图引导它。LoRA 只训练 1000 万个参数，就能微调一个 20 亿参数的模型。两者共同把 Stable Diffusion 从玩具变成 2026 年各家创意机构都能交付的图像流水线。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 8 第 07 课（潜空间扩散）、Phase 10（从零实现大语言模型，提供 LoRA 基础）  
**预计时间：** 约 75 分钟

## 问题

“一名身穿红裙的女子牵着一只狗走在繁忙街道上”这样的提示词，没有说明狗在*哪里*、女子摆出*什么姿势*，也没有描述街道的*透视关系*。文本只能确定图像所需信息的约 10%。其余信息属于视觉内容，难以用语言高效描述。

为姿态、深度、Canny、分割等每种信号从头训练新的条件模型，成本高得无法承受。你可以冻结拥有 26 亿参数的 SDXL 骨干，连接一个读取条件的小型侧网络，再让它轻推骨干的中间特征，这种结构称为 ControlNet。

你还希望在不重新训练完整模型的前提下，教给模型新概念（你的脸、你的产品、你的风格）。你需要一个小 100 倍的增量。LoRA 提供了这种方案：它是插入现有注意力权重的低秩适配器。

ControlNet + LoRA + 文本构成 2026 年从业者的工具箱。多数生产图像流水线都会在 SDXL / SD3 / Flux 基础模型上叠加 2～5 个 LoRA、1～3 个 ControlNet 和一个 IP-Adapter。

## 概念

![ControlNet 克隆编码器；LoRA 添加低秩增量](../assets/controlnet-lora.svg)

### ControlNet（Zhang 等，2023）

取一个预训练 SD，*克隆* U-Net 的编码器半部。冻结原始网络。训练克隆网络，让它接收额外条件输入（边缘、深度、姿态）。通过*零卷积*跳跃连接（初始化为零的 1×1 卷积；开始时不执行任何操作，再学习增量），把克隆网络接回原始网络的解码器半部。

```
SD U-Net 解码器：... ← orig_enc_features + zero_conv(controlnet_enc(condition))
```

零卷积初始化意味着 ControlNet 从恒等映射开始，即使尚未训练也不会造成损害。使用标准扩散损失，在 100 万组（提示词、条件、图像）三元组上训练。

面向各种模态的 ControlNet 会作为小型侧模型发布（SDXL 约 360M 参数，SD 1.5 约 70M 参数）。推理时可以组合它们：

```
features += weight_a * control_a(depth) + weight_b * control_b(pose)
```

### LoRA（Hu 等，2021）

对于模型中的任意线性层 `W ∈ R^{d×d}`，冻结 `W` 并添加低秩增量：

```
W' = W + ΔW,  ΔW = B @ A,  A ∈ R^{r×d},  B ∈ R^{d×r}
```

其中 `r << d`。注意力通常使用 4～16 阶，重度微调使用 64～128 阶。新参数量从 `d²` 降为 `2 · d · r`。对于 `d=640`、`r=16` 的 SDXL 注意力，每个适配器只需 2 万个参数，而非 41 万个，减少 20 倍。纵观整个模型，一个 LoRA 通常为 20～200MB，基础模型则为 5GB。

推理时可以缩放 LoRA：`W' = W + α · B @ A`。`α = 0.5-1.5` 属于正常范围。多个 LoRA 可以相加叠放，但需要注意它们会以非线性方式相互影响。

### IP-Adapter（Ye 等，2023）

一个接收*图像*作为条件（同时也接收文本）的微型适配器。它使用 CLIP 图像编码器产生图像词元，并把它们与文本词元一起注入交叉注意力。每个基础模型约增加 20MB。无需 LoRA，就能完成“按这张参考图的风格生成图像”。

## 可组合性矩阵

| 工具 | 控制内容 | 大小 | 使用时机 |
|------|----------|------|----------|
| ControlNet | 空间结构（姿态、深度、边缘） | 70～360MB | 精确布局、构图 |
| LoRA | 风格、主体、概念 | 20～200MB | 个性化、风格 |
| IP-Adapter | 来自参考图像的风格或主体 | 20MB | 文本无法描述外观时 |
| Textual Inversion | 把单个概念表示为新词元 | 10KB | 旧式方案，大多已被 LoRA 取代 |
| DreamBooth | 针对主体进行全量微调 | 2～5GB | 强身份一致性、高算力 |
| T2I-Adapter | 更轻量的 ControlNet 替代方案 | 70MB | 边缘设备、推理预算有限时 |

ControlNet 约等于空间控制，LoRA 约等于语义控制。两者应一起使用。

```figure
v4-controlnet-zero
```

## 动手构建

`code/main.py` 在一维场景中模拟两种机制：

1. **LoRA。** 有一个预训练线性层 `W`。冻结它，训练低秩矩阵 `B @ A`，使 `W + BA` 匹配目标线性层。示例会表明，`r = 1` 足以完美学习秩为 1 的修正。

2. **ControlNet-lite。** 一个“冻结的基础”预测器和一个读取额外信号的“侧网络”。侧网络输出由初始化为零的可学习标量控制门调节，形成我们的零卷积版本。训练并观察控制门逐渐增大。

### 第 1 步：LoRA 数学

```python
def lora(W, A, B, x, alpha=1.0):
    # W 已冻结；A、B 是可训练的低秩因子。
    return [W[i][j] * x[j] for i, j in ...] + alpha * (B @ (A @ x))
```

### 第 2 步：零初始化侧网络

```python
side_out = control_net(x, condition)
gated = gate * side_out  # gate 初始化为 0
h = base(x) + gated
```

在第 0 步，输出与基础模型完全相同。训练早期会缓慢更新 `gate`，不会发生灾难性漂移。

## 常见问题

- **LoRA 缩放过度。** `α = 2` 或 `α = 3` 是常见的“加强效果”技巧，但会生成风格过重或破损的结果。保持 `α ≤ 1.5`。
- **ControlNet 权重冲突。** 同时把 Pose ControlNet 和 Depth ControlNet 的权重设为 1.0，通常会过冲。权重之和约为 1.0 是安全默认值。
- **LoRA 用错基础模型。** SDXL LoRA 用在 SD 1.5 上会悄悄失效，因为注意力维度不匹配。Diffusers 0.30+ 会发出警告。
- **Textual Inversion 漂移。** 在一个检查点上训练的词元，换到另一个检查点后会严重漂移。LoRA 的可移植性更好。
- **LoRA 权重合并与存储。** 可以把 LoRA 烘焙进基础模型权重，以加快推理（运行时无需做加法），但会失去运行时缩放 `α` 的能力。两个版本都应保留。

## 使用方法

| 目标 | 2026 年流水线 |
|------|---------------|
| 复现品牌艺术风格 | 在约 30 张精选图像上以 32 阶训练 LoRA |
| 把我的脸放进生成图像 | DreamBooth 或 LoRA + IP-Adapter-FaceID |
| 指定姿态 + 提示词 | ControlNet-Openpose + SDXL + 文本 |
| 感知深度的构图 | ControlNet-Depth + SD3 |
| 参考图 + 提示词 | IP-Adapter + 文本 |
| 精确布局 | ControlNet-Scribble 或 ControlNet-Canny |
| 替换背景 | ControlNet-Seg + 图像修复（第 09 课） |
| 快速单步风格 | SDXL-Turbo 上的 LCM-LoRA |

## 交付成果

保存为 `outputs/skill-sd-toolkit-composer.md`。该技能接收一项任务（输入资产包括提示词、可选参考图像、可选姿态、可选深度、可选涂鸦），输出工具栈、权重和可复现的随机种子方案。

## 练习

1. **简单。** 在 `code/main.py` 中让 LoRA 阶数 `r` 从 1 变到 4。达到多少阶时，LoRA 可以精确匹配秩为 2 的目标增量？
2. **中等。** 在两个目标变换上分别训练 LoRA。一起加载它们，展示相加后的交互。什么情况下交互不再保持线性？
3. **困难。** 使用 diffusers 叠加 SDXL-base + Canny-ControlNet（权重 0.8）+ 风格 LoRA（α 0.8）+ IP-Adapter（权重 0.6）。改变各组件权重，测量 FID 与提示词遵循之间的权衡。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| ControlNet | “空间控制” | 克隆的编码器 + 零卷积跳跃连接；读取条件图像。 |
| 零卷积 | “从恒等映射开始” | 初始化为零的 1×1 卷积；ControlNet 起初不改变任何内容。 |
| LoRA | “低秩适配器” | `W + B @ A`，`r << d`；参数比全量微调少 100 倍。 |
| 阶数 r | “调节项” | LoRA 压缩程度；通常为 4～16，重度个性化使用 64 以上。 |
| α | “LoRA 强度” | 运行时缩放 LoRA 增量。 |
| IP-Adapter | “参考图像” | 通过 CLIP 图像词元实现的小型图像条件适配器。 |
| DreamBooth | “针对主体全量微调” | 在约 30 张主体图像上训练完整模型。 |
| Textual Inversion | “新词元” | 只学习一个新词嵌入；旧式方案，大多已被取代。 |

## 生产说明：LoRA 切换、ControlNet 通道与多租户服务

真实的文生图 SaaS 会在同一个基础检查点上提供数百个 LoRA 和十多个 ControlNet。这个服务问题很像大语言模型多租户问题，生产文献会在连续批处理、LoRAX / S-LoRA 主题下讨论后者：

- **热切换 LoRA，不要合并。** 把 `W' = W + α·B·A` 合并进基础模型会让单步推理快约 3%～5%，但也会固定 `α` 和基础模型。把 LoRA 以秩 r 增量形式热驻留在显存中；diffusers 提供 `pipe.load_lora_weights()` + `pipe.set_adapters([...], adapter_weights=[...])`，支持逐请求激活。切换成本只是 `2 · d · r · num_layers` 个权重，规模为 MB，耗时不到一秒。
- **把 ControlNet 视为第二条注意力通道。** 克隆编码器与基础模型并行运行。两个权重均为 1.0 的 ControlNet 意味着每步增加两次前向传播，而不是合并为一次。批大小余量会按二次方下降。每启用一个 ControlNet，应按单步成本约增加 1.5 倍制定预算。
- **LoRA 也可量化。** 如果基础模型已经量化（参见第 07 课在 8GB 上运行 Flux），LoRA 增量也能直接量化为 8 位或 4 位。QLoRA 式加载允许你在 4 位 Flux 基础模型上叠加 5～10 个 LoRA，而不会耗尽内存。

Flux 专用说明：Niels 的 Flux-on-8GB 笔记本把基础模型量化为 4 位；在该量化基础模型上，以 `weight_name="pytorch_lora_weights.safetensors"` 叠加风格 LoRA（`pipe.load_lora_weights("user/style-lora")`）仍能工作。2026 年多数 SaaS 创意机构都采用这套方案。

## 延伸阅读

- [Zhang、Rao、Agrawala（2023），《Adding Conditional Control to Text-to-Image Diffusion Models》](https://arxiv.org/abs/2302.05543)——ControlNet。
- [Hu 等（2021），《LoRA: Low-Rank Adaptation of Large Language Models》](https://arxiv.org/abs/2106.09685)——LoRA（最初用于大语言模型，后来移植到扩散）。
- [Ye 等（2023），《IP-Adapter: Text Compatible Image Prompt Adapter》](https://arxiv.org/abs/2308.06721)——IP-Adapter。
- [Mou 等（2023），《T2I-Adapter: Learning Adapters to Dig Out More Controllable Ability》](https://arxiv.org/abs/2302.08453)——ControlNet 的轻量替代方案。
- [Ruiz 等（2023），《DreamBooth: Fine Tuning Text-to-Image Diffusion Models for Subject-Driven Generation》](https://arxiv.org/abs/2208.12242)——DreamBooth。
- [Hugging Face Diffusers——ControlNet / LoRA / IP-Adapter 文档](https://huggingface.co/docs/diffusers/training/controlnet)——参考流水线。
