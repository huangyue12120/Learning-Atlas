---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/06-speech-and-audio/13-neural-audio-codecs/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 4fc76820d2dc2bafeda60c77018b05b52b4ee1febbdbe2a32b2ac76bcd4f3feb
status: reviewed
---

# 神经音频编解码器——EnCodec、SNAC、Mimi、DAC 与语义—声学拆分

> 2026 年的音频生成几乎全部基于词元。EnCodec、SNAC、Mimi 和 DAC 把连续波形转换为 Transformer 可以预测的离散序列。语义词元与声学词元的拆分——第一个码本负责语义，其余码本负责声学——是 Transformer 以来音频领域最重要的架构变化。

**类型：** 学习  
**学习实现：** Python  
**前置课程：** Phase 6 第 02 课（频谱图）、Phase 10 第 11 课（量化）、Phase 5 第 19 课（子词分词）  
**预计时间：** 约 60 分钟

## 问题

语言模型处理离散词元，而音频是连续的。要为语音 / 音乐构建 LLM 风格模型——MusicGen、Moshi、Sesame CSM、VibeVoice、Orpheus——首先需要一个**神经音频编解码器（neural audio codec）**：用学习得到的编码器把音频离散化为小词表中的词元，再用配套解码器重建波形。

目前形成了两个家族：

1. **重建优先编解码器**——EnCodec、DAC。优化感知音频质量。词元是“声学”的，会捕获说话人身份、音色与背景噪声等一切信息。
2. **语义优先编解码器**——Mimi（Kyutai）、SpeechTokenizer。强制第一个码本编码语言 / 音素内容（通常从 WavLM 蒸馏），后续码本编码声学细节。

2024–2026 年的关键认识是：**尝试从文本生成音频时，纯重建编解码器会产生模糊的语音。** 编解码器词元上的 LLM 必须在同一码本中同时学习语言结构与声学结构，这无法扩展。把二者拆开——语义码本 0、声学码本 1–N——正是 Moshi 和 Sesame CSM 能够工作的原因。

## 概念

![四种编解码器版图：EnCodec、DAC、SNAC（多尺度）与 Mimi（语义 + 声学）](../assets/codec-comparison.svg)

### 核心技巧：残差向量量化（RVQ） <!-- learning-atlas: the-core-trick-residual-vector-quantization-rvq -->

所有现代音频编解码器都不使用一个大码本（高质量需要数百万个编码），而是使用 **RVQ**：多个小码本串联。第一个码本量化编码器输出，第二个量化其残差，依此类推。每个码本包含 1024 个编码。8 个码本的有效词表大小为 1024^8 = 10^24。

推理时，解码器把每一帧选中的所有编码相加，以完成重建。

### 2026 年重要的四种编解码器

**EnCodec（Meta，2022）。** 基线。波形上的编码器—解码器与 RVQ 瓶颈。支持 24 kHz、最多 32 个码本，默认在 1.5 kbps 下使用 4 个码本。架构为 `一维卷积 + Transformer + 一维卷积`。MusicGen 使用它。

**DAC（Descript，2023）。** RVQ 配合 L2 归一化码本、周期激活函数和改进损失。它具有开源编解码器中最高的重建保真度——使用 12 个码本时，有时与原始语音难以区分。支持 44.1 kHz 全频带。

**SNAC（Hubert Siuzdak，2024）。** 多尺度 RVQ——粗码本的帧率低于精细码本。它以分层方式建模音频：约 12 Hz 的粗略“草图”加 50 Hz 的细节。Orpheus-3B 使用它，因为这种分层结构与基于语言模型的生成非常匹配。

**Mimi（Kyutai，2024）。** 2026 年改变游戏规则的方案。帧率为 12.5 Hz（极低），8 个码本，4.4 kbps。码本 0 **从 WavLM 蒸馏**——训练它预测 WavLM 的语音内容特征。码本 1–7 表示声学残差。这一拆分驱动了 Moshi（第 15 课）和 Sesame CSM。

### 帧率对语言建模很重要

帧率越低，序列越短，语言模型越快。

| 编解码器 | 帧率 | 1 秒 = N 帧 | 适用场景 |
|----------|------|-------------|----------|
| EnCodec-24k | 75 Hz | 75 | 音乐、通用音频 |
| DAC-44.1k | 86 Hz | 86 | 高保真音乐 |
| SNAC-24k（粗尺度） | 约 12 Hz | 12 | 高效 AR-LM |
| Mimi | 12.5 Hz | 12.5 | 流式语音 |

在 12.5 Hz 下，10 秒语句只有 125 个编解码器帧——Transformer 可以轻松预测。

### 语义词元与声学词元

```text
frame_t → [semantic_token_t, acoustic_token_0_t, acoustic_token_1_t, ..., acoustic_token_6_t]
```

- **语义词元（Mimi 的码本 0）。** 编码说了什么——音素、单词、内容。通过辅助预测损失从 WavLM 蒸馏。
- **声学词元（码本 1–7）。** 编码音色、说话人身份、韵律、背景噪声与精细细节。

AR 语言模型先预测语义词元（以文本为条件），再预测声学词元（以语义 + 说话人参考为条件）。现代 TTS 能够零样本克隆声音，正是因为这种因子分解：语义模型处理内容，声学模型处理音色。

### 2026 年重建质量（每秒比特数；比特率越低越好）

| 编解码器 | 比特率 | PESQ | ViSQOL |
|----------|--------|------|--------|
| Opus-20kbps | 20 kbps | 4.0 | 4.3 |
| EnCodec-6kbps | 6 kbps | 3.2 | 3.8 |
| DAC-6kbps | 6 kbps | 3.5 | 4.0 |
| SNAC-3kbps | 3 kbps | 3.3 | 3.8 |
| Mimi-4.4kbps | 4.4 kbps | 3.1 | 3.7 |

在单位比特的感知质量上，Opus 等传统编解码器仍然领先。神经编解码器的优势是**离散词元**（Opus 不产生）和**生成模型质量**（语言模型能利用这些词元做什么）。

```figure
rvq-codec-cascade
```

## 动手实现

### 步骤 1：用 EnCodec 编码

```python
from encodec import EncodecModel
import torch

model = EncodecModel.encodec_model_24khz()
model.set_target_bandwidth(6.0)  # kbps

wav = torch.randn(1, 1, 24000)
with torch.no_grad():
    encoded = model.encode(wav)
codes, scale = encoded[0]
# codes: (1, n_codebooks, n_frames), dtype=int64
```

在 6 kbps 时，`n_codebooks=8`。每个编码位于 0–1023（10 位）。

### 步骤 2：解码并测量重建

```python
with torch.no_grad():
    wav_recon = model.decode([(codes, scale)])

from torchaudio.functional import compute_deltas
import torch.nn.functional as F

mse = F.mse_loss(wav_recon[:, :, :wav.shape[-1]], wav).item()
```

### 步骤 3：语义—声学拆分（Mimi 风格）

```python
from moshi.models import loaders
mimi = loaders.get_mimi()

with torch.no_grad():
    codes = mimi.encode(wav)  # shape (1, 8, frames@12.5Hz)

semantic = codes[:, 0]
acoustic = codes[:, 1:]
```

语义码本 0 与 WavLM 对齐。你可以训练一个文本到语义的 Transformer——词表比直接生成音频小得多。之后，再让单独的声学到波形解码器以说话人参考为条件。

### 步骤 4：为什么基于编解码器词元的 AR 语言模型有效

对于一段 10 秒语音，Mimi 的帧率为 12.5 Hz，共 8 个码本：

```text
N_tokens = 10 * 12.5 * 8 = 1000 tokens
```

1000 个词元对 Transformer 来说只是很小的上下文。现代 GPU 上，一个 2.56 亿参数的 Transformer 可在数毫秒内生成 10 秒语音。

## 用于实践

问题 → 编解码器的映射：

| 任务 | 编解码器 |
|------|----------|
| 通用音乐生成 | EnCodec-24k |
| 最高保真重建 | DAC-44.1k |
| 语音上的 AR 语言模型（TTS） | SNAC 或 Mimi |
| 流式全双工语音 | Mimi（12.5 Hz） |
| 带文本的音效库 | EnCodec + T5 条件控制 |
| 精细音频编辑 | DAC + 局部重绘 |

经验法则：**如果在构建生成模型，就从 Mimi 或 SNAC 开始；如果在构建压缩流水线，就使用 Opus。**

## 陷阱

- **码本过多。** 增加码本会线性提升保真度，同时也线性增加语言模型序列长度。应在 8–12 个停止。
- **帧率不匹配。** 在 12.5 Hz Mimi 上训练语言模型，再用 50 Hz EnCodec 微调，会悄无声息地失败。
- **假设所有码本地位相同。** 在 Mimi 中，码本 0 承载内容；丢失它会破坏可懂度。丢失码本 7 则几乎听不出来。
- **把重建质量作为唯一指标。** 编解码器可能重建得很好，但若语义结构很差，就无法用于基于语言模型的生成。

## 交付成果

保存为 `outputs/skill-codec-picker.md`。针对给定生成或压缩任务选择编解码器。

## 练习

1. **简单。** 运行 `code/main.py`。它实现一个玩具标量 + 残差量化器，并测量增加码本时的重建误差。
2. **中等。** 安装 `encodec`，在一段留出语音上比较 1、4、8、32 个码本。绘制 PESQ 或 MSE 与比特率的关系。
3. **困难。** 加载 Mimi 并编码一段音频。先把码本 0 替换为随机整数后解码，再对码本 7 做同样处理。比较两种破坏——码本 0 损坏应摧毁可懂度，码本 7 损坏则几乎没有变化。

## 关键术语

| 术语 | 人们通常怎么说 | 实际含义 |
|------|----------------|----------|
| RVQ | 残差量化 | 多个小码本串联；每个码本量化前一个的残差。 |
| 帧率 | 编解码器速度 | 每秒词元帧数。越低，语言模型越快。 |
| 语义码本 | 码本 0（Mimi） | 从 SSL 特征蒸馏的码本；编码内容。 |
| 声学码本 | 其余所有码本 | 音色、韵律、噪声与精细细节。 |
| PESQ / ViSQOL | 感知质量 | 与 MOS 相关的客观指标。 |
| EnCodec | Meta 编解码器 | RVQ 基线；MusicGen 使用它。 |
| Mimi | Kyutai 编解码器 | 12.5 Hz 帧率；语义—声学拆分；驱动 Moshi。 |

## 延伸阅读

- [Défossez 等（2023）. EnCodec](https://arxiv.org/abs/2210.13438)——RVQ 基线。
- [Kumar 等（2023）. Descript Audio Codec（DAC）](https://arxiv.org/abs/2306.06546)——最高保真的开源方案。
- [Siuzdak（2024）. SNAC](https://arxiv.org/abs/2410.14411)——多尺度 RVQ。
- [Kyutai（2024）. Mimi 编解码器](https://kyutai.org/codec-explainer)——语义—声学拆分与 WavLM 蒸馏。
- [Borsos 等（2023）. AudioLM](https://arxiv.org/abs/2209.03143)——两阶段语义 / 声学范式。
- [Zeghidour 等（2021）. SoundStream](https://arxiv.org/abs/2107.03312)——最初的可流式 RVQ 编解码器。
