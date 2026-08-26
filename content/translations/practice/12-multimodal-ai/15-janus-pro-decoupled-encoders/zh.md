---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/12-multimodal-ai/15-janus-pro-decoupled-encoders/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 2ee1a525a09cab506e0d616e1151caaa7a8f51102158430e545242e57ebe24a7
status: reviewed
---

# Janus-Pro：统一多模态模型的解耦编码器

> 统一多模态模型存在不可避免的张力。理解需要语义特征——包含丰富概念级信息的 SigLIP 或 DINOv2 输出向量。生成需要适合重建的编码——能够重新组合成清晰像素的 VQ 词元。这两个目标无法由一个编码器兼顾。Janus（DeepSeek，2024 年 10 月）和 Janus-Pro（DeepSeek，2025 年 1 月）提出的修复方法是停止强求：解耦两个编码器。任务之间共享 Transformer 主体，但理解路径使用 SigLIP，生成路径使用 VQ 分词器。在 7B 规模上，Janus-Pro 在 GenEval 上超过 DALL-E 3，同时在 MMMU 上匹敌 LLaVA。本课阅读一个编码器失败而两个编码器奏效的原因。

**类型：** 构建
**语言：** Python（标准库，双编码器路由 + 共享主体信号）
**前置课程：** Phase 12 · 13（Transfusion）、Phase 12 · 14（Show-o）
**预计时间：** 约 120 分钟

## 学习目标

- 解释单一共享编码器为什么会牺牲理解质量或生成质量。
- 描述 Janus-Pro 的路由：理解时在输入侧使用 SigLIP 特征，生成时在输入和输出两侧使用 VQ 词元。
- 追踪让 Janus-Pro 在 Janus 失败之处成功的数据混合规模化过程。
- 比较解耦（Janus-Pro）、耦合连续（Transfusion）和耦合离散（Show-o）架构。

## 问题

统一模型在理解与生成之间共享 Transformer 主体。此前的尝试（Chameleon、Show-o、Transfusion）都使用同一个视觉分词器处理两个方向。这个分词器只能折中：

- 为重建（生成）优化：VQ-VAE 捕捉细粒度像素细节，但产生的词元语义一致性弱。
- 为语义（理解）优化：SigLIP 嵌入会把“猫”图像聚到“猫”词元附近，但不能进行高质量重建。

Show-o 和 Transfusion 为此在一个方向上付出了可见的质量税。Janus-Pro 问道：既然任务需求不同，为什么还要强求一个分词器？

## 概念

### 解耦视觉编码

Janus-Pro 的架构分开两个编码器：

- 理解路径。输入图像 → SigLIP-SO400m → 两层 MLP → Transformer 主体。
- 生成路径。如果以已有图像为条件，输入图像 → VQ 分词器 → 词元 ID → Transformer 主体。
- 输出生成。Transformer 预测图像词元 → VQ 解码器 → 像素。

Transformer 主体是共享的。主体上游和下游的所有部分都按任务区分。

提示词格式负责区分输入：`<understand>` 标签经过 SigLIP 路由；`<generate>` 经过 VQ 路由。也可以根据任务隐式路由。

### 为什么有效

理解损失得到 SigLIP 特征，而 CLIP 风格预训练已经针对语义相似度调优。由于输入特征更适合该任务，模型的感知基准超过 Show-o / Transfusion。

生成损失得到 VQ 词元，而分词器已经针对重建调优。由于 VQ 编码可以干净地组合回像素，图像质量超过 Show-o。

共享 Transformer 主体看到两种输入分布（SigLIP 和 VQ），并学习同时处理它们。它的主张是：数据足够、参数足够时，主体能够吸收这种切换。

### 数据规模——Janus 对比 Janus-Pro

Janus（原始版本，arXiv 2410.13848）引入了解耦，但规模很小（13 亿参数，数据有限）。Janus-Pro（arXiv 2501.17811）进行了扩展：

- 70 亿参数（对比 13 亿）。
- 第一阶段（对齐）使用 9000 万图文对，高于 7200 万。
- 第二阶段（统一）使用 7200 万，高于 2600 万。
- 第三阶段增加 20 万个图像生成指令样本。

结果是：Janus-Pro-7B 在 MMMU 上匹敌 LLaVA（60.3 对约 58），在 GenEval 上超过 DALL-E 3（0.80 对 0.67）。一个开放模型，在统一光谱的两端都具有竞争力。

### JanusFlow——矫正流变体

JanusFlow（arXiv 2411.07975）把 VQ 生成路径换成矫正流生成路径（连续）。分工变为 SigLIP 负责理解 + 矫正流负责生成。质量上限进一步抬高，架构仍然是解耦编码器、共享主体。

### 共享主体的任务

Transformer 主体处理统一序列，但输入分布有两种。它的任务是：

- 理解：消费 SigLIP 特征 + 文本词元 → 自回归输出文本。
- 生成：消费文本词元 +（可选的图像 VQ 词元）→ 自回归输出图像 VQ 词元。

主体的每个块没有模态特定权重。它就是你期望在 Qwen 或 Llama 内部看到的文本风格 Transformer，再加上两个输入适配器。

有趣的是，这意味着 Janus-Pro 的主体可以从预训练 LLM 初始化。Janus-Pro 确实从 DeepSeek-MoE-7B 初始化。这一选择很重要：LLM 提供了纯从头训练的统一模型难以达到的推理能力。

### 与 InternVL-U 的比较

InternVL-U（第 12.10 课）是 2026 年的后续方案。它结合：

- 原生多模态预训练（InternVL3 骨干）。
- 解耦编码器路由（输入使用 SigLIP，输出使用 VQ + 扩散头）。
- 统一理解 + 生成 + 编辑。

InternVL-U 将 Janus-Pro 的架构选择纳入更大的框架。对于规模化的统一模型，解耦编码器思想如今已经成为默认方案。

### 局限

解耦编码器增加了架构复杂度：要训练两个分词器，维护两条输入路径，处理两组失败模式。对于不需要生成的产品，Janus-Pro 过度设计——选择 LLaVA 家族的理解模型。

对于不需要理解的产品，Janus-Pro 资质过高——选择 Stable Diffusion 3 / Flux 模型。

对于两者都需要的产品，Janus-Pro 现在是开放架构的参考方案。

```figure
l5-janus-decouple
```

## 使用它

`code/main.py` 模拟 Janus-Pro 路由：

- 两个模拟编码器：类似 SigLIP 的编码器（产生 256 维语义向量）和类似 VQ 的编码器（产生整数编码）。
- 一个提示词路由器，根据任务标签选择编码器。
- 一个共享主体（替代实现），无论词元序列由哪个编码器产生都进行处理。
- 从阶段 1（对齐）切换到阶段 3（指令微调）的加权样本计划。

打印 3 个示例的路由路径：图像问答、T2I、图像编辑。

## 交付成果

本课生成 `outputs/skill-decoupled-encoder-picker.md`。给定一个希望以接近前沿质量实现统一生成 + 理解的产品，它会在 Janus-Pro、JanusFlow 和 InternVL-U 之间选择，并给出具体的数据规模建议。

## 练习

1. Janus-Pro-7B 在 GenEval 上超过 DALL-E 3。解释为什么一个 7B 开放模型能在生成上匹敌前沿专有模型，却不能在理解上匹敌它。

2. 实现路由函数：给定提示词文本，将其分类为 `understand` 或 `generate`。如何处理“描述然后画出来”这样的模糊提示词？

3. JanusFlow 将 VQ 路径替换成矫正流。Transformer 主体现在输出什么？损失发生了什么变化？

4. 提出第四个任务，让 Janus-Pro 架构通过增加一个解耦编码器来处理。例如：图像分割（DINO 风格）、深度（MiDaS 风格）。

5. 阅读 Janus-Pro 第 4.2 节关于数据规模的内容。与 Janus 相比，哪个数据阶段对 T2I 质量提升贡献最大？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| 解耦编码 | “两个视觉编码器” | 每个方向使用独立的分词器或编码器：语义编码器用于理解，重建编码器用于生成 |
| 共享主体 | “一个 Transformer” | 单个 Transformer 处理任一编码器的输出；没有模态特定权重 |
| 用 SigLIP 理解 | “语义特征” | 提供丰富概念特征、但重建能力差的 CLIP 家族视觉塔 |
| 用 VQ 生成 | “重建编码” | 能够干净解码回像素的向量量化词元 |
| JanusFlow | “矫正流变体” | 用连续流匹配生成头替代 VQ 的 Janus-Pro |
| 路由标签 | “任务标签” | 选择输入编码器的提示词标记（`<understand>` / `<generate>`） |

## 延伸阅读

- [Wu 等——Janus（arXiv:2410.13848）](https://arxiv.org/abs/2410.13848)
- [Chen 等——Janus-Pro（arXiv:2501.17811）](https://arxiv.org/abs/2501.17811)
- [Ma 等——JanusFlow（arXiv:2411.07975）](https://arxiv.org/abs/2411.07975)
- [InternVL-U（arXiv:2603.09877）](https://arxiv.org/abs/2603.09877)
- [Dong 等——DreamLLM（arXiv:2309.11499）](https://arxiv.org/abs/2309.11499)
