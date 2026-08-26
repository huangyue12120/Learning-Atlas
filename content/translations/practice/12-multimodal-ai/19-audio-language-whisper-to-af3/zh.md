---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/12-multimodal-ai/19-audio-language-whisper-to-af3/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: e804554df688d4902e1d44d47afde4440c7189f55ac0cf9d93d352b37ce9b43f
status: reviewed
---

# 音频—语言模型：从 Whisper 到 Audio Flamingo 3

> Whisper（Radford 等，2022 年 12 月）解决了语音识别——68 万小时弱监督多语言语音、一个简单的编码器—解码器 Transformer，以及一个让之后每个 ASR 发布都引用它的基准。但识别不等于推理。询问“这段录音里有哪些乐器”“说话人表达了什么情绪”或“第 3 分钟发生了什么”，需要的是音频理解，而不是转写。Qwen-Audio、SALMONN、LTU 和 NVIDIA 的 Audio Flamingo 3（AF3，2025 年 7 月）逐步构建了这套技术栈：保留 Whisper 级别的编码器，接入 Q-Former，在音频—文本指令数据上训练，再加入思维链推理。本课走过这条发展路径。

**类型：** 构建
**语言：** Python（标准库，log-Mel 频谱图 + 音频 Q-Former 骨架）
**前置课程：** Phase 6（语音与音频）、Phase 12 · 03（Q-Former）
**预计时间：** 约 180 分钟

## 学习目标

- 从波形计算 log-Mel 频谱图：分窗、FFT、滤波器组和对数变换。
- 比较编码器选项：Whisper 编码器、BEATs、AF-Whisper 混合体，以及各自何时胜出。
- 构建音频 Q-Former：N 个可学习查询对频谱图块做交叉注意力。
- 解释级联（Whisper 后接 LLM）与端到端音频 LLM 训练的差异，以及端到端为什么更容易扩展推理能力。

## 问题

Whisper 解决了语音识别，音频的 OCR 已经是商品化能力。但“商品化”止步于转写。如果模型不能推理听到的内容——时间、说话人、情绪、音乐结构、环境声音——单独的转写就无法驱动产品功能。

有三条显而易见的路线：

1. 级联：Whisper 转写，LLM 在转写文本上推理。适合纯语音场景，但在音乐、环境音、多说话人重叠和情绪上会失败。

2. 端到端音频 LLM：音频编码器直接将音频词元送入 LLM，跳过转写。保留情绪、说话人和环境等声学信息，但需要新的训练数据。

3. 混合：音频编码器 + 文本解码器，既能转写又能推理。Qwen-Audio 和 Audio Flamingo 选择这条路线。

## 概念

### Log-Mel 频谱图：输入特征

每个音频编码器都从同一个特征开始：log-Mel 频谱图。

1. 重采样到 16 kHz。
2. 使用 25ms 窗口、10ms 步长做短时傅里叶变换。
3. 取 FFT 结果的幅度。
4. 应用 Mel 滤波器组（通常为 80 个、在 0–8000 Hz 上按对数间隔排列的滤波器），将频率扭曲到感知尺度。
5. 做对数压缩（log(1 + x)），扩展动态范围。

结果是形状为 (T, 80) 的二维数组，其中 T 是时间帧数。对于帧率为 100 Hz 的 30 秒片段：形状为 (3000, 80)。

### Whisper 的编码器

Whisper 的编码器是一个 12 层、ViT 风格的 Transformer，将 log-Mel 频谱图作为时间帧序列处理。输出是每个时间帧一个隐藏状态向量。

在 ASR 中，Whisper 的解码器是一个交叉注意力 Transformer，以编码器输出为条件生成文本词元，是标准的编码器—解码器结构。

在音频 LLM 中，你希望把编码器输出作为另一个 LLM 的输入。常见模式是：Whisper 编码器冻结，Q-Former 可训练，LLM 冻结或调优。

### BEATs 与音频专用编码器

Whisper 在以语音为主的数据上训练，在音乐和环境音上较弱。

BEATs（Chen 等，2022）是在 AudioSet 上训练的自监督 Transformer。在参数量相同的情况下，它比 Whisper 更擅长捕捉音乐和环境声音。

AF-Whisper（Audio Flamingo 3 的混合体）：将 Whisper + BEATs 特征拼接作为音频输入。Whisper 携带语言信号，BEATs 携带声学信号。

### 音频 Q-Former

模式与 BLIP-2 的视觉 Q-Former 相同。一组固定数量的可学习查询（通常为 32 或 64）对音频编码器输出的帧做交叉注意力。查询变成供 LLM 消费的音频词元。

训练对齐阶段：单独训练 Q-Former，在音频—文本对（AudioCaps、Clotho）上使用对比 + 标题生成损失。指令阶段：端到端训练，解冻 LLM，在指令数据上训练。

### 发展路径——SALMONN、Qwen-Audio、AF3

SALMONN（Tang 等，2023）：Whisper + BEATs + Q-Former + LLaMA。第一个具有严肃推理能力的开放音频 LLM，在 MMAU 上的综合分数约为 0.55。

Qwen-Audio（Chu 等，2023）：架构相似，在更丰富的数据集上训练，并针对多轮对话调优。MMAU 约为 0.60。

LTU——Listen, Think, Understand（Gong 等，2023）：显式推理数据，重点是对音频片段进行思维链推理。规模更小，但更聚焦。

Audio Flamingo 3（Goel 等，2025 年 7 月）：当前开放 SOTA。使用 8B LLM 骨干（Qwen2 7B）、Whisper-large 编码器拼接 BEATs、64 查询 Q-Former，在 100 万以上音频—文本指令对上训练。MMAU 0.72，在一些子任务上匹敌前沿专有模型。

AF3 还引入了音频按需思维链：模型可以选择先输出思考词元（“让我先识别乐器：……”），再输出最终答案。复杂推理任务在启用思考时准确率提升 3–5 个百分点。

### 级联与端到端

级联流水线：

1. Whisper 将音频转写为文本。
2. LLM 在文本上推理。

它完美适合“总结这期播客”，但会在以下问题上失败：
- “这首歌的情绪是什么？”——情绪在声音里，不在文字里。
- “说话人是 Alice 还是 Bob？”——需要说话人识别。
- “爆炸发生在第几秒？”——文本中丢失了时间定位。
- “这是生成的音频还是真实吗？”——深度伪造检测需要声学特征。

端到端方案保留声学信号。Qwen-Audio 和 AF3 原生处理音乐、环境和情绪。

### 2026 年生产方案

对于新的音频理解产品：

- 如果目标是转写、不涉及音乐、也不推断情绪，则使用级联。
- 如果涉及音乐、情绪、多说话人或复杂音频推理，则使用 AF3 / Qwen-Audio 家族。

级联更便宜、更简单；端到端能力更强。

### MMAU——音频推理基准

MMAU（大规模多模态音频理解）是 2024–2025 年的音频推理基准：

- 10000 个音频—文本问答对，涵盖语音、音乐和环境声音。
- 覆盖分类、时间推理、因果推理和开放式问答。
- 测试级联流水线系统性遗漏的内容。

开放 SOTA（AF3）为 0.72，专有前沿模型约为 0.78（Gemini 2.5 Pro、Claude Opus 4.7）。差距小于 VideoMME 的开放—闭源差距，说明音频 LLM 正在成熟。

```figure
audio-text-ctc
```

## 使用它

`code/main.py`：

- 在标准库中实现 log-Mel 频谱图计算：分窗、朴素 DFT、Mel 滤波器组。
- 音频 Q-Former 骨架：给定编码器输出帧，计算 Q、K、V 和注意力，并输出 N 个词元。
- 在玩具任务上比较级联与端到端方案。

## 交付成果

本课生成 `outputs/skill-audio-llm-pipeline-picker.md`。给定音频任务（转写、音乐标注、情绪推断、多说话人分离、环境分类），它会选择级联、端到端 AF3 或混合方案。

## 练习

1. 计算 16kHz、25ms 窗口、10ms 步长、80 个 Mel 频带的 30 秒片段 log-Mel 频谱图维度。在 48kHz 下会如何变化？

2. 为什么 Whisper 在音乐上表现不佳？BEATs 捕获了哪些 Whisper 没有的音频特征？

3. 64 个查询的音频 Q-Former 对比 32 个：什么任务复杂度下 64 个值得？32 个在哪些场景节省计算？

4. 阅读 AF3 第 4 节关于按需思维的内容。提出三个最能从思维链中受益的音频任务。

5. 使用 AF3 的输出实现一个最小说话人分离流水线。如何表示说话人切换？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Log-Mel 频谱图 | “Mel 特征” | 经过 Mel 滤波器组和对数幅度变换后的二维（时间、频率）数组 |
| 音频 Q-Former | “音频 Perceiver” | 将音频编码器输出通过交叉注意力变成固定长度查询、供 LLM 使用的瓶颈 |
| 级联 | “ASR 后接 LLM” | Whisper 转写后由文本 LLM 推理的流水线；会丢失声学信息 |
| 端到端 | “音频 LLM” | 音频特征通过 Q-Former 直接进入 LLM；保留声学信号 |
| BEATs | “AudioSet 音频编码器” | 在 AudioSet 上训练的 SSL Transformer；擅长音乐 + 环境声音 |
| MMAU | “音频推理基准” | 覆盖语音、音乐、环境的 1 万个问答对；2024 年评估标准 |
| 按需思维 | “音频 CoT” | 模型可以在最终答案前选择输出推理词元，准确率提升 3–5 个百分点 |

## 延伸阅读

- [Radford 等——Whisper（arXiv:2212.04356）](https://arxiv.org/abs/2212.04356)
- [Chu 等——Qwen-Audio（arXiv:2311.07919）](https://arxiv.org/abs/2311.07919)
- [Goel 等——Audio Flamingo 3（arXiv:2507.08128）](https://arxiv.org/abs/2507.08128)
- [Tang 等——SALMONN（arXiv:2310.13289）](https://arxiv.org/abs/2310.13289)
- [Gong 等——LTU（arXiv:2305.10790）](https://arxiv.org/abs/2305.10790)
