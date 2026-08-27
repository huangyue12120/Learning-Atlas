---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/18-ethics-safety-alignment/23-watermarking-synthid-stable-signature-c2pa/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: ae55115b02803bcdeaa1a2e65035857646ce3b9703e3d2eb5fd9992b958c767c
status: reviewed
---

# 水印——SynthID、Stable Signature、C2PA

> 三项技术构成了 2026 年 AI 生成内容溯源的框架。SynthID（Google DeepMind）是 2023 年 8 月推出的图像水印技术，2024 年 5 月扩展到文本和视频（Gemini + Veo），2024 年 10 月通过 Responsible GenAI Toolkit 开源文本方案，2025 年 11 月随 Gemini 3 Pro 推出统一的多媒体检测器。文本水印会微不可察地调整下一个 token 的采样概率；图像/视频水印可以经受压缩、裁剪、滤镜和帧率变化。Stable Signature（Fernandez 等，ICCV 2023，arXiv:2303.15435）微调潜在扩散解码器，使每个输出都包含固定消息；裁剪到生成图像 10% 内容时，检测率仍超过 90%，误报率低于 1e-6。后续研究《Stable Signature is Unstable》（arXiv:2405.07145，2024 年 5 月）表明，微调可以在保持质量的同时移除水印。C2PA 是一种加密签名、防篡改的元数据标准（C2PA 2.2 Explainer，2025）。水印与 C2PA 互补：元数据可能被剥离，但携带更丰富的溯源信息；水印能经受转码，但承载的信息更少。

**类型：** 构建
**语言：** Python（标准库，token 水印嵌入与检测）
**前置要求：** 第 10 阶段 · 04（采样）、第 01 阶段 · 09（信息论）
**用时：** 约 75 分钟

## 学习目标

- 描述 token 级水印（SynthID-text 风格）以及其可检测的机制。
- 描述 Stable Signature，以及 2024 年移除攻击如何攻破它。
- 说明 C2PA 的作用，以及它为何与水印互补。
- 描述关键局限：模型特定信号、释义后的鲁棒性，以及保持语义的攻击（arXiv:2508.20228）。

## 问题

2023–2024 年，深度伪造和 AI 生成内容大规模进入政治与消费场景。水印是拟议的技术溯源信号：在生成时标记，之后再检测。2025 年的证据表明，没有水印能够无条件鲁棒；但与 C2PA 元数据结合后，两者可以提供可用的溯源方案。

## 概念

### 文本水印（SynthID-text 风格）

Kirchenbauer 等人 2023 年提出的机制，由 Google 产品化：

1. 在每个解码步骤中，对前 K 个 token 做哈希，伪随机地将词汇表划分为“绿色”和“红色”集合。
2. 给绿色 token 的 logit 加上 δ，使采样偏向绿色集合。
3. 生成文本中的绿色 token 比随机情况下更多。

检测时：重新对每个前缀做哈希，统计生成文本中的绿色 token，并计算 z 分数。带水印文本的 z 分数 >0；人类文本约为 0。

性质：

- 读者察觉不到（δ 足够小，质量损失很小）。
- 只要能访问词汇表划分函数，就可以检测。
- 对释义不鲁棒——重写文本会破坏信号。

SynthID-text 于 2024 年 10 月通过 Google Responsible GenAI Toolkit 开源。

### Stable Signature（图像）

Fernandez 等人，ICCV 2023。微调潜在扩散解码器，使每幅生成图像都在潜在表示中包含固定的二进制消息。检测时用神经解码器从潜在表示中解码。即使图像裁剪到只剩 10% 内容，检测率也超过 90%，误报率低于 1e-6。

2024 年 5 月的《Stable Signature is Unstable》（arXiv:2405.07145）表明，在保持图像质量的同时微调解码器即可移除水印。生成后的对抗性微调成本低，水印的对抗鲁棒性有限。

### SynthID 统一检测器（2025 年 11 月）

该多媒体检测器与 Gemini 3 Pro 同步推出，可通过单一 API 读取文本、图像、音频和视频中的 SynthID 信号，统一 Google 的溯源技术栈。

### C2PA

Coalition for Content Provenance and Authenticity（内容来源与真实性联盟）。这是一种加密签名、防篡改的元数据标准。C2PA 2.2 Explainer（2025）规定，C2PA manifest 记录来源声明（谁创建、何时创建、做过哪些转换），并由创作者密钥签名。

它与水印互补：

- 元数据可以被剥离；水印不容易被剥离。
- 元数据信息丰富，能记录完整溯源链；水印只能承载少量比特。
- C2PA 依赖平台采用；水印会自动嵌入。

Google 在 Search、Ads 和“About this image”中整合了两者。

### 局限

- **模型特定。** SynthID 只为启用 SynthID 的模型生成内容加水印。未启用 SynthID 的模型没有水印，因此“没有 SynthID 信号”不能证明内容真实。
- **释义。** 文本水印无法经受保持语义的释义重写。
- **变换攻击。** arXiv:2508.20228（2025）展示了能破坏文本水印和许多图像水印、同时保持语义的攻击。
- **微调移除。** 根据《Stable Signature is Unstable》，生成后的微调可以移除嵌入的水印。

### 欧盟《人工智能法案》第 50 条

关于 AI 生成内容标注透明度的行为准则：第一稿于 2025 年 12 月，第二稿于 2026 年 3 月，预计最终稿于 2026 年 6 月（见[欧盟委员会状态页面](https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content)）。截至 2026 年 4 月，该准则仍是草案，时间表可能变化。这是要求技术层的监管层；深度伪造必须标注。

### 它在第 18 阶段主线中的位置

第 22–23 课讨论模型输出的内容（私有数据、溯源信号）。第 27 课讨论训练数据治理。第 24 课讨论要求采用这些技术措施的监管框架。

```figure
an-watermark-greenlist
```

## 使用

`code/main.py` 构建一个玩具文本水印。token 是 0..N-1 的整数；带水印的采样偏向哈希定义的绿色集合。检测器计算绿色 token 的 z 分数。你可以观察 1000-token 生成文本中的检测效果，观察释义如何破坏信号，并测量人类文本上的误报率。

## 交付

本课产出 `outputs/skill-provenance-audit.md`。给定一项有溯源声明的内容部署，它会审查水印机制（如有）、C2PA 签名链（如有）、各自的对抗鲁棒性以及各模态覆盖范围。

## 练习

1. 运行 `code/main.py`。报告带水印的 1000-token 生成文本与人类文本的 z 分数，并找出 95% 置信度阈值下的误报率。

2. 实现一种释义攻击，将 30% 的 token 替换为同义词，然后重新测量 z 分数。

3. 阅读 Kirchenbauer 等人 2023 年第 6 节关于鲁棒性的内容。为什么文本水印会在释义下失效，而图像水印能经受裁剪？

4. 设计一个使用 SynthID-text + C2PA 元数据的部署。描述消费者看到的溯源链，并分别指出一个组件的失效模式。

5. 2024 年《Stable Signature is Unstable》的结果表明微调会移除图像水印。设计一种部署控制来限制这种攻击，例如要求对微调后的检查点进行签名发布。

## 关键术语

| 术语 | 人们怎么说 | 实际含义 |
|------|------------|----------|
| SynthID | “Google 的水印” | 跨模态溯源信号，覆盖文本、图像、音频和视频 |
| Token 水印 | “Kirchenbauer 风格” | 通过偏置采样产生、用绿色 token z 分数检测的文本水印 |
| Stable Signature | “图像水印” | 通过微调解码器产生的水印，ICCV 2023 |
| C2PA | “元数据标准” | 加密签名、防篡改的溯源元数据 |
| 释义鲁棒性 | “改写会不会破坏它” | 文本水印的性质，目前有限 |
| 微调移除 | “对抗性去水印” | 通过微调解码器移除图像水印的攻击 |
| 跨模态检测器 | “统一 SynthID” | 2025 年 11 月推出的跨模态统一 API |

## 延伸阅读

- [Kirchenbauer et al. — A Watermark for Large Language Models (ICML 2023, arXiv:2301.10226)](https://arxiv.org/abs/2301.10226) — token 水印机制
- [Fernandez et al. — Stable Signature (ICCV 2023, arXiv:2303.15435)](https://arxiv.org/abs/2303.15435) — 图像水印论文
- [Stable Signature is Unstable (arXiv:2405.07145)](https://arxiv.org/abs/2405.07145) — 移除攻击
- [Google DeepMind — SynthID](https://deepmind.google/models/synthid/) — 跨模态水印
- [C2PA 2.2 Explainer (2025)](https://c2pa.org/specifications/specifications/2.2/explainer/Explainer.html) — 元数据标准
