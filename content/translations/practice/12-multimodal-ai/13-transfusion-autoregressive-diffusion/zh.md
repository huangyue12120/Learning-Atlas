---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/12-multimodal-ai/13-transfusion-autoregressive-diffusion/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: fe6e5c16f8fed7f6f61f68dd6f0bda20200527ee585f3faee80fcc779116bfe0
status: reviewed
---

# Transfusion：在一个 Transformer 中实现自回归文本 + 扩散图像

> Chameleon 和 Emu3 把一切都押在离散词元上。它们有效，但量化瓶颈是可见的——图像质量低于连续空间扩散模型，并在某处进入平台期。Transfusion（Meta，Zhou 等，2024 年 8 月）做出了相反的选择：保持图像连续，完全去掉 VQ-VAE，并用两个损失训练一个 Transformer。文本词元使用下一词元预测，图像块使用流匹配/扩散损失。两个目标共同优化同一组权重。Stable Diffusion 3（MMDiT）背后的架构是一个近亲。本课阅读 Transfusion 的论点，构建一个玩具双损失训练器，并追踪让一个 Transformer 完成两类工作的注意力掩码。

**类型：** 构建
**语言：** Python（标准库，MNIST 规模玩具上的双损失训练器）
**前置课程：** Phase 12 · 11（Chameleon）、Phase 8（生成式 AI）
**预计时间：** 约 180 分钟

## 学习目标

- 连接一个在单一骨干上运行两个损失的 Transformer（文本词元上的 NTP、图像块上的扩散 MSE）。
- 解释为什么图像块之间的双向注意力，加上文本词元上的因果注意力，是正确的掩码选择。
- 从算力、质量和代码复杂度方面，比较 Transfusion 风格（连续图像、扩散损失）与 Chameleon 风格（离散图像、NTP）。
- 说出 MMDiT 的贡献：每个块使用模态特定权重，在残差流上使用联合注意力。

## 问题

离散图像词元与连续图像表示之争比 LLM 还要古老。连续表示（原始像素、VAE 潜变量）保留细节；离散词元（VQ 索引）适合 Transformer 的原生词汇，却在量化步骤丢失细节。

Chameleon / Emu3 选择离散方案：一个损失、一个架构，但图像保真度受分词器质量限制。

扩散模型选择连续方案：图像质量出色，但它是独立于 LLM 的模型，需要复杂的噪声计划工程，而且无法与文本生成干净地整合。

Transfusion 提问：能不能两者兼得？保留连续图像，仍然训练一个模型，用两个损失缝合成一次梯度更新。

## 概念

### 双损失架构

单个仅解码器 Transformer 处理一条包含以下内容的序列：

- 文本词元（离散，来自 BPE 词汇）。
- 图像块（连续，将 16x16 像素块通过线性嵌入投影到隐藏维度——与 ViT 编码器的输入相同）。
- 标记连续图像块位置的 `<image>` 和 `</image>` 标签。

前向传播只运行一次。损失根据每个词元选择两个头中的一个：

- 文本词元：在词汇 logits 头上计算标准交叉熵。
- 图像块：在连续图像块上计算扩散损失——预测添加到每个图像块上的噪声。

梯度通过共享 Transformer 主体流动。两个损失同时改善共享权重。

### 注意力掩码：文本因果 + 图像双向

文本词元必须是因果的——不能让一个文本词元关注未来文本，否则教师强制会失效。但图像块表示同一个快照，因此在同一图像块内应该彼此双向关注。

掩码为：

```
M[i, j] = 1 if:
  (i is text and j is text and j <= i)   # causal for text
  OR (i is image and j is image and same_image_block(i, j))   # bidirectional within image
  OR (i is text and j is image and j < i_image_end)   # text attends to previous images
  OR (i is image and j is text and j < i_image_start)   # image attends to preceding text
```

训练和推理时实现为块三角掩码。

### Transformer 内部的扩散损失

扩散损失是标准做法：向图像块添加噪声，让模型预测噪声（或者等价地预测干净图像块）。Transfusion 的版本使用流匹配——预测从噪声到干净数据的速度场。

训练过程：
1. 对每个图像块 x0，抽取一个随机时间步 t。
2. 抽取噪声 ε，计算 xt = (1-t) * x0 + t * ε（流匹配的线性插值）。
3. Transformer 预测 v_theta(xt, t)；损失 = MSE(v_theta(xt, t), ε - x0)。
4. 与同一序列中的文本 NTP 损失一起反向传播。

推理时的生成过程是：
- 文本词元：标准自回归采样。
- 图像块：扩散采样循环（通常 10–30 步），以此前的文本词元为条件。

### MMDiT：Stable Diffusion 3 的变体

Stable Diffusion 3（Esser 等，2024 年 3 月）与 Transfusion 大约同时发布了 MMDiT（多模态扩散 Transformer）。两者是同胞架构。

MMDiT 的主要差异：

- 每个块使用模态特定权重。每个 Transformer 块为文本词元和图像块分别使用 Q、K、V 和 MLP 权重。注意力是联合的（跨模态），其他部分则是模态特定的。
- 矫正流训练。这是一种特定的流匹配变体，采样过程已知，比 DDPM 数学更简单。
- 规模。MMDiT 是 SD3（2B 和 8B 参数变体）的骨干。Transfusion 的论文扩展到 7B。

两者都收敛到同一个核心想法：一个 Transformer 在连续图像表示上运行图像扩散，在文本上运行 NTP。

### 为什么胜过 Chameleon 风格

连续扩散与离散 NTP 在图像生成上的质量差距是可测量的。Transfusion 论文报告：

- 在 7B 参数下，在 FID 上超过同规模的 Chameleon 风格模型 3–5 个百分点。
- 不需要训练分词器——图像编码器更简单（投影到隐藏维度的线性层，与 ViT 的输入层相同）。
- 推理时可以并行去噪图像块，不像自回归图像词元那样逐个生成。

缺点是：Transfusion 是双损失模型，训练动态更棘手，需要调节损失权重。NTP 与扩散之间的计划不匹配，可能使某个头占据主导。

### 下游有什么

Janus-Pro（第 12.15 课）通过解耦理解与生成的视觉编码器来改进 Transfusion 的想法——一侧用 SigLIP，另一侧用 VQ，同时共享 Transformer 主体。Show-o（第 12.14 课）把扩散换成离散扩散（掩码预测）。Transfusion 之后，统一生成家族迅速分叉。

2026 年能够输出图像的生产 VLM——Gemini 3 Pro、GPT-5、Claude Opus 4.7 的图像生成路径——几乎肯定使用了这个家族的某个后代。具体细节是专有的。

```figure
cfg-guidance-scale
```

## 使用它

`code/main.py` 在一个微型 MNIST 类问题上构建玩具 Transfusion：

- 文本标题是描述数字（0–9）的短整数序列。
- 图像是 4x4 的字节网格。
- 一对共享权重的线性投影充当 Transformer 的替代品；文本使用 NTP 损失，噪声图像块使用 MSE 损失。
- 训练循环交替两个损失，注意力掩码显式构造。
- 生成过程在一次前向传播中同时产生文本标题和 4x4 图像。

Transformer 本身是玩具。双损失接线、注意力掩码构造和推理循环才是本课真正交付的产物。

## 交付成果

本课生成 `outputs/skill-two-loss-trainer-designer.md`。给定一个新的多模态训练任务（文本 + 图像、文本 + 音频、文本 + 视频），它会设计双损失计划（损失权重、掩码形状、共享块与模态特定块），并标记实现风险。

## 练习

1. Transfusion 风格模型训练 70% 文本词元和 30% 图像块。图像扩散损失的量级约为文本 NTP 损失的 10 倍。什么损失权重能平衡它们？

2. 为序列 `[T, T, <image>, P, P, P, P, </image>, T]` 实现块三角掩码。标出每个元素为 0 还是 1。

3. MMDiT 有模态特定的 QKV 权重。与 Transfusion 完全共享的 Transformer 相比，这会增加多少参数？在 7B 参数规模下值得吗？

4. 生成过程：给定文本提示词，模型对 50 个词元运行 NTP，遇到 `<image>`，然后对 256 个图像块运行 20 步去噪。总共需要多少次前向传播？

5. 阅读 SD3 论文第 3 节。描述矫正流，以及它为什么比 DDPM 用更少的推理步骤收敛。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| 双损失训练 | “NTP + 扩散” | 一个 Transformer 在同一次梯度更新中同时优化文本词元的交叉熵和连续图像块的 MSE |
| 流匹配 | “矫正流” | 预测从噪声到干净数据的速度场、数学比 DDPM 简单的扩散变体 |
| MMDiT | “多模态 DiT” | Stable Diffusion 3 的架构：联合注意力、模态特定的 MLP 和归一化 |
| 块三角掩码 | “文本因果 + 图像双向” | 对文本跨位置因果、但在图像区域内部双向的注意力掩码 |
| 连续图像表示 | “没有 VQ” | 图像块是实值向量，而不是整数码本索引 |
| 速度预测 | “v-参数化” | 网络输出噪声与数据之间的速度场，而不是噪声本身 |

## 延伸阅读

- [Zhou 等——Transfusion（arXiv:2408.11039）](https://arxiv.org/abs/2408.11039)
- [Esser 等——Stable Diffusion 3 / MMDiT（arXiv:2403.03206）](https://arxiv.org/abs/2403.03206)
- [Peebles 与 Xie——DiT（arXiv:2212.09748）](https://arxiv.org/abs/2212.09748)
- [Zhao 等——MonoFormer（arXiv:2409.16280）](https://arxiv.org/abs/2409.16280)
- [Xie 等——Show-o（arXiv:2408.12528）](https://arxiv.org/abs/2408.12528)
