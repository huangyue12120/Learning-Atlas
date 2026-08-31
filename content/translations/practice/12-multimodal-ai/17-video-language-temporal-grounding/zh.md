---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/12-multimodal-ai/17-video-language-temporal-grounding/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 9e17f6c9311d0df49f261e4435e4420793dd9780d5ae031beccc3249580751f1
status: reviewed
---

# 视频—语言模型：时间词元与定位

> 视频不是照片的堆叠。一段 5 秒的片段具有因果顺序、动作动词和事件时间，而图像模型无法表示这些内容。Video-LLaMA（Zhang 等，2023 年 6 月）发布了第一个带音视频定位的开放视频 LLM。VideoChat 和 Video-LLaVA 扩展了这一模式。到 2025 年，Qwen2.5-VL 的 TMRoPE 缩小了与前沿专有模型的差距。每个系统以不同方式解决时间词元——每段片段一个 Q-Former、每帧拼接池化、每个词元使用 TMRoPE。本课阅读这些模式，构建一个均匀与动态帧抽样器，并在时间定位任务上评估。

**类型：** 构建
**语言：** Python（标准库，帧抽样器 + 时间定位评估器）
**前置课程：** Phase 12 · 08（LLaVA-OneVision）
**预计时间：** 约 180 分钟

## 学习目标

- 解释时间位置编码如何在不改变视觉编码器的情况下改变视频 VLM 性能。
- 从每秒词元数与定位准确率方面，比较均匀、动态 FPS 和事件驱动的帧抽样。
- 描述每段片段使用 Q-Former（Video-LLaMA）、每帧池化（Video-LLaVA）和每个词元使用 M-RoPE（Qwen2.5-VL）的设计。
- 说出四个视频基准：VideoMME、TempCompass、EgoSchema、Video-MMMU。

## 问题

一个 30 FPS 的 1 分钟视频有 1800 帧。按每帧 196 个视觉词元（224 分辨率的 ViT-B）计算，就是 352k 个词元，比 2024 年的任何 LLM 上下文都大。

存在三种缩减策略：

1. 对帧进行子采样（根据内容选择 1–8 FPS）。
2. 激进地池化每帧的图像块词元（3x3 或 4x4 双线性池化）。
3. 使用 Q-Former 压缩：输入一个 16 帧片段，输出 64 个词元。

每种取舍都不同。子采样会丢失时间细节，池化会丢失空间细节，Q-Former 两者都会少量丢失，但能节省词元。

时间位置编码是另一个轴：模型如何知道第 5 帧先于第 6 帧？方案包括简单的一维时间 RoPE（Video-LLaMA）、学习式时间嵌入（Video-LLaVA）和 TMRoPE（Qwen2.5-VL，完整三维）。

## 概念 <!-- learning-atlas: the-concept -->

### Video-LLaMA：每段片段一个 Q-Former + 音频分支

Video-LLaMA（2023）是第一个开放视频 LLM。架构如下：

- 2 FPS 的 16 帧片段（即 8 秒）。
- 每帧的 ViT 特征 → Video Q-Former 对全部 16 帧做交叉注意力 → 32 个可学习查询 → LLM。
- 并行音频分支：波形 → ImageBind 音频编码器 → Audio Q-Former → 32 个查询 → LLM。

优势是音视频联合推理，弱点是片段长度固定、不能任意做时间定位。

### VideoChat 与 Video-LLaVA

VideoChat 保留了 Video-LLaMA 的想法，但去掉音频并简化。Video-LLaVA（Lin 等，2023）在图像和视频帧上训练一个视觉编码器（“投影前对齐”），得到统一表示。两者都是冻结 CLIP 编码器 + MLP + LLM。

两者都不能处理长视频，都是 8–16 帧系统。

### Qwen2.5-VL 与 TMRoPE

Qwen2.5-VL 引入了 TMRoPE——时间—模态旋转位置嵌入。每个图像块词元携带一个（t、h、w）位置，其中 t 是真实时间戳，而不是帧索引。

它与简单时间嵌入的关键区别：

- 绝对时间，而不是索引。模型看到“4.2 秒时”，而不是“第 15 帧”。
- 每个词元旋转，而不是每段片段旋转。每个视觉词元都按自己的时间戳独立旋转。
- 兼容动态 FPS。如果这里按 2 FPS 抽样、那里按 4 FPS 抽样，TMRoPE 可以原生处理不均匀的时间间隔。

TMRoPE 支持“猫在第几秒跳起来？”这样的查询，模型可以回答“4.2 秒”。Video-LLaMA 只能说“片段早期”。

### 帧抽样策略

均匀抽样：在视频时长内均匀抽取 N 帧。简单，但会错过运动峰值。

动态 FPS：根据运动强度自适应抽样。使用光流或帧差在高运动片段中密集抽样。Qwen2.5-VL 以此训练。

事件驱动：运行轻量检测器，在动作发生处多抽样。VideoAgent 使用这种方法。

关键帧 + 上下文：在镜头边界抽样，再加一些相邻帧。适合电影内容。

### 每帧池化

按 1 FPS、每帧 576 个词元计算，5 分钟片段有 172,800 个词元。Qwen2.5-VL-72B 的 128k 上下文勉强可以处理，但成本很高。

3x3 双线性池化将每帧缩减到 64 个词元，因此 5 分钟只有 19,200 个词元。这是大多数任务的最佳平衡点。

对于空间细节不太重要的智能体工作流，可以更激进地池化（6x6 → 每帧 16 个词元）。

### 四个视频基准

- VideoMME：全面的视频理解，包括短、中、长视频。
- TempCompass：细粒度时间推理，询问“之前”/“之后”。
- EgoSchema：长时域第一人称视频。
- Video-MMMU：多模态、多学科的视频问题。

完整的视频 VLM 评估会覆盖四个基准。它们强调不同轴：TempCompass 完全关注顺序，EgoSchema 关注 3 分钟以上的推理，VideoMME 覆盖各种时长。

### 定位输出格式

时间定位的输出格式：

- 自由文本：“猫大约在第 4 秒时跳起来。”易解析，但不精确。
- 结构化 JSON：`{"event": "jump", "start": 4.1, "end": 4.3}`。Qwen2.5-VL 用此训练。
- 基于词元：在答案中交错特殊的 `<time>4.1</time>` 词元。Qwen2.5-VL 的内部格式。

下游使用时，基于词元的格式最准确。Qwen2.5-VL 的 JSON 输出格式可以直接解析。

### 2026 年最佳实践

2026 年的视频 VLM：

- 编码器：带 M-RoPE 的 SigLIP 2，或带 TMRoPE 的 Qwen2.5-VL。
- 帧抽样：动态 FPS（根据运动在 1–4 之间）并设置最大帧数上限。
- 每帧池化：3x3 双线性。
- 输出：带时间 + 事件字段的结构化 JSON。
- 基准：一般任务使用 VideoMME + TempCompass；长时域使用 EgoSchema。

```figure
video-temporal-patches
```

## 使用它

`code/main.py` 包含：

- 均匀和动态 FPS 帧抽样器。
- 一个玩具时间定位评估器：给定时间 T 的“真实”事件和模型输出，在容差范围内计算准确率。
- 对 Video-LLaMA（16 帧，Q-Former）、Video-LLaVA（8 帧，MLP）、Qwen2.5-VL（动态 FPS + TMRoPE）进行比较。

## 交付成果

本课生成 `outputs/skill-video-vlm-frame-planner.md`。给定视频任务（监控、动作识别、时间定位、摘要），它会选择帧抽样器、池化因子、输出格式和预期准确率等级。

## 练习

1. 对于 3 分钟的烹饪演示，选择均匀还是动态 FPS。用词元数量说明理由。

2. TMRoPE 具体增加了什么，是简单时间嵌入表无法做到的？

3. 为时间定位写一个 VLM 可以学习输出的 JSON schema。包含错误情况。

4. 阅读 Video-LLaVA 第 3 节“投影前对齐”。为什么它优于分别训练图像和视频编码器？

5. 根据 VideoMME 排行榜，截至 2026 年开放模型第一名与专有模型第一名之间的差距是多少？其中有多少差距应归因于时间编码，又有多少归因于基础 LLM 规模？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| 时间定位 | “时间局部化答案” | VLM 输出事件发生时的具体时间戳范围 |
| TMRoPE | “时间多模态 RoPE” | 使用绝对时间戳的三维旋转位置，Qwen2.5-VL 使用 |
| 动态 FPS | “感知运动的抽样” | 高运动片段多抽帧，静态片段少抽帧 |
| 帧池化 | “逐帧空间压缩” | 在送入 LLM 前通过双线性插值减少每帧图像块数量 |
| 视频 Q-Former | “片段压缩器” | 将 N 帧映射为 K 个可学习查询的交叉注意力瓶颈 |
| VideoMME | “视频基准” | 全面的短/中/长视频基准，包含 2500+ 个样本 |

## 延伸阅读

- [Zhang 等——Video-LLaMA（arXiv:2306.02858）](https://arxiv.org/abs/2306.02858)
- [Li 等——VideoChat（arXiv:2305.06355）](https://arxiv.org/abs/2305.06355)
- [Lin 等——Video-LLaVA（arXiv:2311.10122）](https://arxiv.org/abs/2311.10122)
- [Qwen 团队——Qwen2.5-VL（arXiv:2502.13923）](https://arxiv.org/abs/2502.13923)
- [Lin 等——VILA-1.5（arXiv:2312.07533）](https://arxiv.org/abs/2312.07533)
