---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/12-multimodal-ai/04-flamingo-gated-cross-attention/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: ee025c471f27b129edbaa5930c75688306a349f57658b4d4bcf4059cd9919b8f
status: reviewed
---

# Flamingo 与少样本 VLM 的门控交叉注意力

> DeepMind 的 Flamingo（2022）在其他人之前完成了两件事。它证明单个模型可以处理图像、视频和文本任意交错的序列；也证明 VLM 可以进行上下文学习——给出一个包含三组示例（图像、标题）的少样本提示词，模型无需任何梯度更新就能为新图像生成标题。它的机制是：把门控交叉注意力层插入冻结 LLM 的现有层之间，并使用一个从零开始的可学习 tanh 门，因此初始化时保留 LLM 的文本能力。本课梳理 Flamingo 的 Perceiver 重采样器和门控交叉注意力架构——它是 Gemini 交错输入和 Idefics2 视觉词元的祖先。

**类型：** 学习
**语言：** Python（标准库，门控交叉注意力 + Perceiver 重采样器演示）
**前置课程：** Phase 12 · 03（BLIP-2 Q-Former）
**预计时间：** 约 120 分钟

## 学习目标

- 通过 tanh(gate) = 0，解释门控交叉注意力如何在初始化时保留冻结 LLM 的文本能力。
- 走过一个 Perceiver 重采样器：N 个图像块 → 通过交叉注意力得到 K 个固定的“潜变量”查询。
- 描述 Flamingo 如何使用尊重图像位置的因果掩码处理交错的图像—文本序列。
- 复现一个少样本多模态提示词结构（3 个图像—标题示例，再加一个查询图像）。

## 问题

BLIP-2 把 32 个视觉词元送入冻结 LLM 的输入层。每个提示词一张图像时效果很好。但如果你想把许多图像与文本交错输入呢，例如“这是图像 A，给它写标题；这是图像 B，给它写标题；现在这是图像 C，给它写标题”？LLM 的自注意力需要在同一条流中处理图像词元和文本词元，而哪些位置可以关注哪些图像也会变得棘手。

Flamingo 的答案是：完全不改变 LLM 的输入流。在现有 LLM 块之间插入额外的交叉注意力层。文本词元仍像往常一样通过 LLM 的因果自注意力流动。在每几个 LLM 块之间，文本词元还会通过新的门控层对图像特征做交叉注意力。这个门从零初始化，意味着在第 0 步新层是空操作——模型与预训练 LLM 完全相同。随着训练进行，门逐渐打开，视觉信息开始流入。

Flamingo 回答的第二个问题是：如何处理每个提示词中数量可变的图像（0、1 或许多张）？使用 Perceiver 重采样器——一个小型交叉注意力模块，接收任意数量的图像块，并产生固定数量的视觉潜变量词元。无论提示词中有多少图像，LLM 的交叉注意力层看到的形状都相同。

## 概念

### 冻结的 LLM

Flamingo 从一个冻结的 Chinchilla 70B LLM 开始。全部 700 亿个权重保持不变，原有的文本自注意力和 FFN 正常运行。

### Perceiver 重采样器

对于提示词中的每张图像，ViT 会产生 N 个图像块词元。Perceiver 重采样器拥有 K 个固定的可学习潜变量（Flamingo 使用 K=64）。每个重采样器块分成两个子步骤：

1. 交叉注意力：K 个潜变量关注 N 个图像块词元（Q 来自潜变量，K/V 来自图像块）。
2. 在潜变量内部进行自注意力 + FFN。

经过 6 个重采样器块之后，无论 ViT 产生了多少图像块，输出都是 64 个、每个 1024 维的视觉词元。一张 224x224 图像（196 个图像块）和一张 480x480 图像（900 个图像块）最终都会输出 64 个重采样词元。

对于视频，重采样器沿时间维应用：每一帧的图像块产生 64 个潜变量，时间位置编码让模型区分 t=0 与 t=N。整个视频会变成 T * 64 个视觉词元。

### 门控交叉注意力

在冻结 LLM 的每 M 层之间（Flamingo 使用 M=4）插入一个新的门控交叉注意力块：

```
x_after_llm_block = llm_block(x_before)
cross = cross_attn(x_after, resampler_output)
gated = tanh(alpha) * cross + x_after
x_before_next_block = gated
```

- `alpha` 是可学习标量，初始化为零。
- `tanh(0) = 0`，所以初始化时门控分支的贡献为零。
- 随着 `alpha` 偏离零，交叉注意力贡献平滑增长。
- 残差连接意味着即使门完全打开，也不会覆盖 LLM 的文本表示，只会在其上增加视觉信息。

这是 Flamingo 最重要的设计选择：视觉条件是相加的、受门控的，并且初始化为零。第 0 步的 Flamingo 在纯文本输入上就是一个完美的 Chinchilla 70B。

### 交错输入的掩码交叉注意力

在“<image A> 标题 A <image B> 标题 B <image C> ?”这样的提示词中，每个文本词元只能看到它在序列中之前出现的图像。交叉注意力掩码强制执行这一点：位置 `t` 的文本词元只能关注图像索引 `i < i_t` 的图像重采样词元，其中 `i_t` 是该文本位置之前最近出现的图像。“只看到最近的前置图像”和“看到所有前置图像”都是有效选择；Flamingo 选择了前者。

### 上下文少样本学习

Flamingo 提示词看起来像这样：

```
<image1> A photo of a cat. <image2> A photo of a dog. <image3> A photo of a
```

模型看到补全模式，然后输出“bird”（或 image3 所显示的其他内容）。不需要梯度更新。冻结 LLM 的上下文学习能力通过门控交叉注意力保留下来——这正是论文的核心亮点，也是它重要的原因。

### 训练数据

Flamingo 在三个数据集上训练：

1. MultiModal MassiveWeb（M3W）：4300 万个网页，包含交错的图像和文本，用于重建阅读顺序。
2. 图文对（ALIGN + LTIP）：44 亿个图文对。
3. 视频—文本对（VTP）：2700 万个短视频片段。

OBELICS（2023）是交错网页语料的开放复现，Idefics、Idefics2 以及大多数开放的“Flamingo 类”模型都会在其上训练。

### OpenFlamingo 与 Otter

OpenFlamingo（2023）是开放复现。架构相同（在冻结 LLaMA 或 MPT 上使用 Perceiver 重采样器 + 门控交叉注意力），检查点规模为 3B、4B、9B。由于基础 LLM 更小、数据更少，质量落后于 Flamingo。

Otter（2023）在 OpenFlamingo 的基础上使用 MIMIC-IT（一个多模态指令数据集）进行指令微调，证明门控交叉注意力也适用于指令遵循。

### 后继者

- Idefics / Idefics2 / Idefics3：Hugging Face 的门控交叉注意力谱系，逐步变得更简单（Idefics2 放弃重采样器，改用带自适应池化的直接图像块词元）。
- Flamingo 到 Chameleon 的过渡：到 2024 年，许多团队转向早期融合（第 12.11 课）；在必须冻结骨干的生产场景中，Flamingo 风格的门控交叉注意力仍然存在。
- Gemini 的交错输入：从概念上继承了 Flamingo 对交错格式的灵活性，但确切机制是专有的。

### 与 BLIP-2 的比较

| | BLIP-2 | Flamingo |
|---|---|---|
| 视觉桥 | 在输入处使用一次 Q-Former | 每 M 层使用门控交叉注意力 |
| 视觉词元 | 每张图像 32 个 | 每个交叉注意力层每张图像 64 个 |
| 冻结 LLM | 是 | 是 |
| 上下文少样本 | 弱 | 强——论文的核心 |
| 交错输入 | 原生不支持 | 支持，这是设计目标 |
| 训练数据 | 1.3 亿图文对 | 13 亿图文对 + 4300 万交错网页 |
| 参数量 | 1.88 亿可训练 | 约 100 亿可训练（交叉注意力层） |
| 算力 | 8 张 A100 上数天 | 数千张 TPUv4 上数周 |

预算有限、处理单图像 VQA 时选择 BLIP-2。需要交错、少样本或多图像推理时选择 Flamingo/Idefics2。

```figure
cross-attention-fusion
```

## 使用它

`code/main.py` 演示：

1. 在 36 个伪造图像块词元上使用 8 个可学习潜变量运行 Perceiver 重采样器（纯 Python 交叉注意力）。
2. 运行一个门控交叉注意力步骤：`alpha = 0` 时 → 输出等于输入（LLM 不变），随后 `alpha = 2.0` → 混入视觉贡献。
3. 构建交错掩码，为“（图像 1）（文本 1）（图像 2）（文本 2）”序列生成二维注意力掩码。

## 交付成果

本课生成 `outputs/skill-gated-bridge-diagnostic.md`。给定一个开放 VLM 的配置（是否有重采样器、交叉注意力频率、门控方案），它会识别其中的 Flamingo 谱系元素并解释冻结策略。它可用于调试微调为什么损害了文本性能（答案：门开得太快、太大）。

## 练习

1. 计算 Flamingo-9B 的视觉参数量：9B LLM + 1.4B 门控交叉注意力层 + 64M 重采样器。训练参数占总参数的多少比例？

2. 用 PyTorch 实现门控残差 `y = tanh(alpha) * cross + x`。实验展示 `alpha=0` 时初始化结果严格满足 `y==x`。

3. 阅读 OpenFlamingo 第 3.2 节（arXiv:2308.01390），了解当一个批量中的不同提示词包含不同数量的图像时，它们如何处理。描述填充策略。

4. 为什么 Flamingo 的交叉注意力掩码让文本词元只能关注最近的前置图像，而不是所有前置图像？阅读 Flamingo 论文第 2.4 节并解释其中的取舍。

5. 上下文少样本：为一个新的 Flamingo 变体构造一个包含 4 个“图像 → 主要物体颜色”示例的提示词。描述当示例数量从 0 增加到 8 时预期的准确率变化模式。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Perceiver 重采样器 | “固定潜变量交叉注意力” | 从数量可变的输入图像块中产生 K 个固定词元的模块 |
| 门控交叉注意力 | “Tanh 门控桥” | 残差层 `y = tanh(alpha)*cross + x`，带可学习 alpha，初始化为 0 |
| 交错输入 | “混合序列” | 按阅读顺序自由混合图像与文本的提示词格式 |
| 冻结 LLM | “没有 LLM 梯度” | 文本 LLM 的权重不更新，只有重采样器 + 交叉注意力层训练 |
| 少样本 | “上下文示例” | 在提示词中给出少量（图像、答案）对，模型无需微调即可泛化 |
| OBELICS | “交错网页语料” | 包含按阅读顺序排列的图像和文本的开放数据集，共 1.41 亿个网页 |
| Chinchilla | “冻结的 70B 基础模型” | Flamingo 使用的冻结文本 LLM，来自 DeepMind 的 Chinchilla 论文 |
| 门控计划 | “alpha 如何变化” | 训练期间交叉注意力门打开的速率 |
| 交叉注意力频率 | “每 M 层一次” | 插入门控交叉注意力块的频率；Flamingo 使用 M=4 |
| OpenFlamingo | “开放复现” | MosaicML/LAION 的 3–9B 开放检查点；架构与 Flamingo 相同 |

## 延伸阅读

- [Alayrac 等——Flamingo（arXiv:2204.14198）](https://arxiv.org/abs/2204.14198)——原始论文。
- [Awadalla 等——OpenFlamingo（arXiv:2308.01390）](https://arxiv.org/abs/2308.01390)——开放复现。
- [Laurençon 等——OBELICS（arXiv:2306.16527）](https://arxiv.org/abs/2306.16527)——交错网页语料。
- [Jaegle 等——Perceiver IO（arXiv:2107.14795）](https://arxiv.org/abs/2107.14795)——通用 Perceiver 架构。
- [Li 等——Otter（arXiv:2305.03726）](https://arxiv.org/abs/2305.03726)——指令微调的 Flamingo 后继者。
- [Laurençon 等——Idefics2（arXiv:2405.02246）](https://arxiv.org/abs/2405.02246)——Flamingo 方法的现代简化版本。
