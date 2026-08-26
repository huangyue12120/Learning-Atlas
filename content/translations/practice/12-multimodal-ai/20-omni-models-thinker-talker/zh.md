---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/12-multimodal-ai/20-omni-models-thinker-talker/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 6a61e636804224bc4c0a1530b3f0f26bfdabb46bdf6b31f92f72e5f1d7ebe8c4
status: reviewed
---

# 全能模型：Qwen2.5-Omni 与 Thinker-Talker 分工

> GPT-4o 在 2024 年 5 月的产品演示之所以颠覆，并不是因为底层模型，而是因为产品形态——一个你可以说话、模型能看到摄像头画面、并能在 250ms 内回应的语音界面。开放生态在 2024 和 2025 年剩下的时间里竞相达到这种产品表面。Qwen2.5-Omni（2025 年 3 月）是开放设计的参考：一个 Thinker（大型文本生成 Transformer）加一个 Talker（并行语音生成 Transformer），通过流式语音词元连接。Mini-Omni 对它做了简化，Moshi 达到了相近延迟，GLM-4-Voice 将它扩展到中文。本课阅读 Thinker-Talker 架构，以及让流式实时对话成为可能的延迟预算。

**类型：** 构建
**语言：** Python（标准库，流式流水线延迟模拟器 + VAD 循环）
**前置课程：** Phase 12 · 19（音频 LLM）、Phase 12 · 16（任意到任意）
**预计时间：** 约 180 分钟

## 学习目标

- 将推理流水线拆分为 Thinker（文本推理）和 Talker（语音合成），并解释并行流式为何有效。
- 逐组件计算对话交互的首个音频字节时间（TTFAB）预算。
- 描述 Thinker 内部跨视觉、音频和文本的 TMRoPE 时间对齐位置编码。
- 说出三种实时对话模式：半双工、轮流说话、全双工。

## 问题

实时语音助手必须快速完成很多事情：

1. 听用户说话。实时语音分词、使用语音活动检测（VAD）判断用户何时说完。
2. 可选地看。以 2–4 FPS 输入摄像头画面，与音频一起流入 Thinker。
3. 思考。根据对话历史组织回应。
4. 说话。合成音频词元，解码为波形，流式发送到用户的扬声器。

每一步都会增加延迟。要有对话感，总往返延迟必须低于 500ms——低于这个阈值，用户才不会明显感觉到滞后。GPT-4o 声称约 250ms，Moshi 约 160ms，Qwen2.5-Omni 约 350–500ms。

每个组件都必须流式运行，不能“全部批处理后再解码”。

## 概念

### Thinker 与 Talker

Qwen2.5-Omni 的分解：

- Thinker：7B–80B 的文本生成 Transformer。消费交错的文本 + 图像 + 音频词元，输出代表要说什么的文本词元。
- Talker：更小的语音生成 Transformer（200M–1B）。消费 Thinker 的文本输出词元和最近的语音上下文词元，输出离散语音词元（残差 VQ 索引）。
- 语音解码器：流式波形解码器（SNAC、MoVQGAN 家族），将语音词元实时转换为音频样本。

这种分离很重要。Thinker 要大，才能有好的推理能力。Talker 可以很小，因为它的任务是局部的——将文本转换为语音词元。Talker 更大不会更有表现力，却会更慢。

两者并行运行：

1. Thinker 输出文本词元 t_i。
2. Talker（通过流式）消费 t_i，输出语音词元 s_i、s_{i+1}、…、s_{i+k}。
3. 语音解码器消费到达的语音词元并输出音频样本。
4. 当 Thinker 处理到文本词元 t_{i+3} 时，Talker 已经为 t_0..t_{i+2} 流式输出音频。

### TMRoPE——时间对齐的多模态位置

Thinker 需要整合图像帧（例如以 4 FPS 到达）、音频帧（每秒 50 帧）和对话历史中的文本。朴素的序列顺序（先所有图像，再所有音频，最后文本）会丢失时间对齐。

TMRoPE 为每个词元分配绝对时间戳。t=2.3s 的视觉词元、t=2.32s 的音频词元，以及用户在 t=2.35s 说出的“停下”文本词元。RoPE 根据时间戳旋转注意力，模型看到它们在时间上同时发生。

这正是“他一边说你好一边挥手”能够工作的基础——模型看到同一概念时刻的视频帧和音频。

### 流式语音合成

语音词元必须流式输出。Mini-Omni（Xie 与 Wu，2024）提出“语言模型可以在思考时听和说”：Thinker 输出词元和 Talker 输出词元在同一序列中交错。Thinker 一提交下一个文本词元，Talker 就立即触发，没有批次边界。

Moshi（Défossez 等，2024 年 10 月）是最快的开放实现。在单个 A100 上 TTFAB 为 160ms。它使用一个能在交替位置输出文本和语音词元的 7B Transformer，并用“内心独白”将思考流和说话流分开。这本质上是 Thinker + Talker 融合到一个模型中，再配合谨慎的训练。

### VAD 与轮流说话

语音活动检测运行在输入侧，有两种模式：

- 半双工：用户说话，模型听；模型说话，用户听。通过 VAD 的静音检测（约 200ms）清晰交接。
- 全双工：双方可以同时说话。模型可以附和（“嗯嗯”）或打断，更难。Moshi 支持它。

Qwen2.5-Omni 默认支持半双工，并通过静音阈值轮流说话。全双工需要应用层处理。

### Qwen3-Omni（2025 年 11 月）

后继版本。Qwen3-80B Thinker、更大的 Talker、改进的 TMRoPE-v2。延迟接近 GPT-4o 的 250ms，开放权重，在 OmniBench 上与 Gemini 2.0 Live 具有竞争力。

### 生产延迟预算

一次典型的流式交互：

- 麦克风 → 音频词元：40–80ms。
- 预填充（提示词 + 历史）：7B 上 100–200ms，70B 上高得多。
- 第一个 Thinker 文本词元：40ms。
- Talker 处理第一个文本词元：20ms。
- 第一批语音词元提交：40ms。
- 残差 VQ 解码：30ms。
- 语音波形解码：50–80ms。

TTFAB 总计：7B 为 320–510ms，70B 为 600–900ms。前沿质量通常意味着 70B+，这也就造成了前沿系统的延迟差距。

### 词元速率数学

16kHz 音频、50Hz 基础语音词元意味着每秒输出需要 50 个语音词元。Talker 必须以至少 50 tok/s 的速度输出，才能跟上。典型 LLM 在 H100 上的吞吐量为 30–80 tok/s，因此小型（200–300M）Talker 足够快；7B Talker 会落后。

这就是为什么存在小型专用 Talker，而不是“直接使用主模型”。

```figure
l5-thinker-talker
```

## 使用它

`code/main.py`：

- 用模拟词元输出速率模拟 Thinker-Talker 流水线。
- 为可配置的模型规模和麦克风采样率计算 TTFAB。
- 使用 VAD 静音阈值演示半双工轮流说话。

## 交付成果

本课生成 `outputs/skill-omni-streaming-budget.md`。给定实时语音产品的目标 TTFAB 和功能集合（视觉输入、双语、全双工），它会选择 Qwen2.5-Omni、Qwen3-Omni、Moshi 或 Mini-Omni，并规划 Thinker/Talker 大小。

## 练习

1. 你的目标 TTFAB 是 300ms。在 7B Thinker 和 300M Talker 上，列出每个组件的延迟。

2. Qwen2.5-Omni 使用 TMRoPE。描述这样一个提示词中模型看到什么：用户在 t=1s 开始说话，摄像头在 t=1.2s 捕捉到一个手势。

3. 全双工支持要求模型在听的同时输出音频。提出一种能教会模型这一点的训练数据格式。

4. 阅读 Moshi 论文第 4 节。描述“内心独白”的分离，以及它为什么避免了 Thinker-Talker 拆分。

5. 计算吞吐预算：为了跟上 16kHz 音频中每秒 50 个基础层词元，Talker 必须多快输出词元？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Thinker | “推理大脑” | 产生要说内容的大型文本生成 Transformer |
| Talker | “生成语音的嘴” | 根据 Thinker 文本产生离散语音词元的小型 Transformer |
| TTFAB | “延迟预算” | 首个音频字节时间：从用户说完话到第一个音频样本输出 |
| TMRoPE | “时间对齐 RoPE” | 在视觉、音频、文本之间使用绝对时间戳的位置编码 |
| 半双工 | “轮流说话” | 用户和模型交替说话，VAD 静音检测用户是否说完 |
| 全双工 | “同时说话” | 模型能同时说和听，并能附和 |
| 内心独白 | “Moshi 分离” | 思考流和说话流在单个模型中交错的设计 |

## 延伸阅读

- [Xu 等——Qwen2.5-Omni（arXiv:2503.20215）](https://arxiv.org/abs/2503.20215)
- [Qwen 团队——Qwen3-Omni（arXiv:2509.17765）](https://arxiv.org/html/2509.17765v1)
- [Xie 与 Wu——Mini-Omni（arXiv:2408.16725）](https://arxiv.org/abs/2408.16725)
- [Défossez 等——Moshi（arXiv:2410.00037）](https://arxiv.org/abs/2410.00037)
- [Zeng 等——GLM-4-Voice（arXiv:2412.02612）](https://arxiv.org/abs/2412.02612)
