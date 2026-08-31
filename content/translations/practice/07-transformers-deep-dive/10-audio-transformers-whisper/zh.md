---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/07-transformers-deep-dive/10-audio-transformers-whisper/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: f996b553ee4abba0d68ac4368a41ffecdffc5c91639060ffe99fa83fd84d80eb
status: reviewed
---

# 音频 Transformer——Whisper 架构

> 音频是频率随时间变化形成的图像。Whisper 就像一个吞下梅尔频谱图、再用文字作答的 ViT。

**类型：** 学习  
**学习实现：** Python  
**前置课程：** Phase 7 第 05 课（完整 Transformer）、Phase 7 第 08 课（编码器—解码器）、Phase 7 第 09 课（ViT）  
**预计时间：** 约 45 分钟

## 问题

在 Whisper（OpenAI，Radford 等，2022）出现之前，最先进的自动语音识别（automatic speech recognition，ASR）意味着 wav2vec 2.0 和 HuBERT——自监督特征提取器加上一个微调后的任务头。它们质量高，却需要昂贵的数据流水线，对领域变化也很脆弱。多语种语音识别还需要为不同语系分别训练模型。

Whisper 押注了三件事：

1. **用一切数据训练。** 从互联网抓取 68 万小时、覆盖 97 种语言的弱标注音频。不依赖干净的学术语料库，也不需要音素标注。
2. **一个模型完成多项任务。** 通过任务词元，让同一个解码器联合学习转写、翻译、语音活动检测、语言识别和时间戳预测。
3. **采用标准编码器—解码器 Transformer。** 编码器接收对数梅尔频谱图，解码器自回归地产生文本词元。不需要声码器、CTC 或 HMM。

结果是：Whisper large-v3 对口音、噪声以及完全没有干净标注数据的语言都很稳健。到 2026 年，它已成为几乎所有开源语音助理和大多数商业语音助理的默认语音前端。

## 概念 <!-- learning-atlas: the-concept -->

![Whisper 流水线：音频 → 梅尔频谱 → 编码器 → 解码器 → 文本](../assets/whisper.svg)

### 第 1 步——重采样与分帧

音频采样率为 16 kHz。将音频裁剪或填充到 30 秒。计算对数梅尔频谱图：80 个梅尔频带、10 ms 步长，得到约 3,000 帧 × 80 个特征，这构成 Whisper 看到的“输入图像”。

### 第 2 步——卷积前端

两个卷积核大小为 3、总步幅为 2 的 Conv1D 层，把 3,000 帧缩减为 1,500 帧。这样能在不增加大量参数的前提下将序列长度减半。

### 第 3 步——编码器

一个在 1,500 个时间步上运行的 Transformer 编码器，large 版本有 24 层。它使用正弦位置编码、自注意力和 GELU FFN，输出 1,500 × 1,280 个隐藏状态。

### 第 4 步——解码器

一个 24 层 Transformer 解码器。它使用一个在 GPT-2 词表基础上加入少量音频专用特殊词元的 BPE 词表，自回归地产生词元。

### 第 5 步——任务词元

解码器提示以控制词元开头，用来告诉模型应该做什么：

```
<|startoftranscript|>  <|en|>  <|transcribe|>  <|0.00|>
```

或：

```
<|startoftranscript|>  <|fr|>  <|translate|>   <|0.00|>
```

模型就是按照这种约定训练的。你可以通过前缀控制任务。这相当于 2026 年的指令微调思路，只不过应用在语音上。

### 第 6 步——输出

使用宽度为 5、带对数概率阈值的束搜索。若没有 `<|notimestamps|>` 词元，模型会以每 0.02 秒音频为一个单位预测时间戳。

### Whisper 各版本规模

| 模型 | 参数量 | 层数 | d_model | 头数 | 显存（fp16） |
|-------|--------|------|---------|------|--------------|
| Tiny | 39M | 4 | 384 | 6 | 约 1 GB |
| Base | 74M | 6 | 512 | 8 | 约 1 GB |
| Small | 244M | 12 | 768 | 12 | 约 2 GB |
| Medium | 769M | 24 | 1024 | 16 | 约 5 GB |
| Large | 1550M | 32 | 1280 | 20 | 约 10 GB |
| Large-v3 | 1550M | 32 | 1280 | 20 | 约 10 GB |
| Large-v3-turbo | 809M | 32 | 1280 | 20 | 约 6 GB（4 层解码器） |

Large-v3-turbo（2024）把解码器从 32 层削减到 4 层。解码速度提高 8 倍，而 WER 退化不到 1 个百分点。正是这种解码提速，使 Whisper-turbo 在 2026 年成为实时语音智能体的默认选择。

### Whisper 做不到什么

- 不提供说话人分离（谁在说话）。需要与 pyannote 配合。
- 原生不支持实时流式处理——30 秒窗口是固定的。现代封装（`faster-whisper`、`WhisperX`）通过 VAD 与重叠窗口补上流式能力。
- 没有外部分块时，无法使用超过 30 秒的长程上下文。实际效果通常仍然很好，因为人类语音转写很少需要长距离上下文。

### 2026 年技术版图

| 任务 | 模型 | 说明 |
|------|------|------|
| 英语 ASR | Whisper-turbo、Moonshine | Moonshine 在边缘设备上快 4 倍 |
| 多语种 ASR | Whisper-large-v3 | 97 种语言 |
| 流式 ASR | faster-whisper + VAD | 可达到 150 ms 的延迟目标 |
| TTS | Piper、XTTS-v2、Kokoro | 编码器—解码器模式，但整体形态类似 Whisper |
| 音频 + 语言 | AudioLM、SeamlessM4T | 在同一个 Transformer 中统一文本词元与音频词元 |

```figure
n5-mel-decode
```

## 动手构建

参见 `code/main.py`。我们不训练 Whisper，而是构建对数梅尔频谱图流水线与任务词元提示格式化器。这些才是生产中真正需要接触的部分。

### 第 1 步：合成音频

生成一个采样率为 16 kHz、频率为 440 Hz、时长为 1 秒的正弦波，共 16,000 个采样点。

### 第 2 步：对数梅尔频谱图（简化版）

完整梅尔频谱图需要 FFT。这里采用简化的分帧与逐帧能量计算，在不依赖 `librosa` 的情况下展示整条流水线：

```python
def frame_signal(x, frame_size=400, hop=160):
    frames = []
    for start in range(0, len(x) - frame_size + 1, hop):
        frames.append(x[start:start + frame_size])
    return frames
```

每帧 25 ms，帧移 10 ms，与 Whisper 的加窗方式一致。为便于教学，这里用逐帧能量代替梅尔频带。

### 第 3 步：填充到 30 秒

Whisper 始终处理 30 秒的音频块。将频谱图填充或裁剪到 3,000 帧。

### 第 4 步：构建提示词元

```python
def whisper_prompt(lang="en", task="transcribe", timestamps=True):
    tokens = ["<|startoftranscript|>", f"<|{lang}|>", f"<|{task}|>"]
    if not timestamps:
        tokens.append("<|notimestamps|>")
    return tokens
```

全部任务控制接口只有一个 4 词元前缀。

## 使用方法

```python
import whisper
model = whisper.load_model("large-v3-turbo")
result = model.transcribe("meeting.wav", language="en", task="transcribe")
print(result["text"])
print(result["segments"][0]["start"], result["segments"][0]["end"])
```

更快且兼容 OpenAI 的实现：

```python
from faster_whisper import WhisperModel
model = WhisperModel("large-v3-turbo", compute_type="int8_float16")
segments, info = model.transcribe("meeting.wav", vad_filter=True)
for s in segments:
    print(f"{s.start:.2f} - {s.end:.2f}: {s.text}")
```

**2026 年适合选择 Whisper 的情况：**

- 希望用一个模型完成多语种 ASR。
- 需要稳健转写含噪、多样化的音频。
- 研究或 ASR 原型——这是最快的起点。

**适合选择其他方案的情况：**

- 边缘设备上的超低延迟流式处理——在相同质量下，Moonshine 胜过 Whisper。
- 需要低于 200 ms 延迟的实时对话式 AI——应使用专门的流式 ASR。
- 说话人分离——Whisper 不提供这一能力；需要接入 pyannote。

## 交付成果

参见 `outputs/skill-asr-configurator.md`。这个技能会为新的语音应用选择 ASR 模型、解码参数和预处理流水线。

## 练习

1. **简单。** 运行 `code/main.py`。确认对一个采样率为 16 kHz、帧移为 10 ms 的 1 秒信号，帧数约为 100；30 秒时约为 3,000 帧。
2. **中等。** 使用 `numpy.fft` 构建完整的对数梅尔频谱图。验证 80 个梅尔频带与 `librosa.feature.melspectrogram(n_mels=80)` 的结果在数值误差范围内一致。
3. **困难。** 实现流式推理：把音频切成 10 秒窗口、保留 2 秒重叠，对每个音频块运行 Whisper，再合并转写结果。用一段 5 分钟的播客样本，测量相对于单次完整推理的词错误率。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| 梅尔频谱图 | “音频图像” | 二维表示：一个轴是频带，另一个轴是时间帧；每个单元格存储经对数缩放的能量。 |
| 对数梅尔频谱 | “Whisper 看到的内容” | 对梅尔频谱图取对数；近似人类对响度的感知。 |
| 帧 | “一个时间切片” | 一个 25 ms 的采样窗口；以 10 ms 的步长重叠移动。 |
| 任务词元 | “语音任务的提示前缀” | 解码器提示中的特殊词元，如 `<\|transcribe\|>` / `<\|translate\|>`。 |
| 语音活动检测（VAD） | “找出语音” | 在 ASR 前移除静音的门控步骤；可以大幅降低成本。 |
| CTC | “连接时序分类” | 用于免对齐训练的经典 ASR 损失；Whisper **没有**使用它。 |
| Whisper-turbo | “小解码器、完整编码器” | large-v3 编码器 + 4 层解码器；解码速度提高 8 倍。 |
| Faster-whisper | “生产级封装” | 基于 CTranslate2 的重新实现；支持 int8 量化；比 OpenAI 参考实现快 4 倍。 |

## 延伸阅读

- [Radford 等（2022），《Robust Speech Recognition via Large-Scale Weak Supervision》](https://arxiv.org/abs/2212.04356)——Whisper 论文。
- [OpenAI Whisper 仓库](https://github.com/openai/whisper)——参考代码与模型权重。阅读 `whisper/model.py`，约 400 行代码从头到尾展示 Conv1D 前端、编码器和解码器。
- [OpenAI Whisper——`whisper/decoding.py`](https://github.com/openai/whisper/blob/main/whisper/decoding.py)——第 5～6 步描述的束搜索与任务词元逻辑就在这里；约 500 行，完全可读。
- [Baevski 等（2020），《wav2vec 2.0: A Framework for Self-Supervised Learning of Speech Representations》](https://arxiv.org/abs/2006.11477)——前身；在某些场景中仍能提供 SOTA 特征。
- [SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper)——生产级封装，比参考实现快 4 倍。
- [Jia 等（2024），《Moonshine: Speech Recognition for Live Transcription and Voice Commands》](https://arxiv.org/abs/2410.15608)——2024 年面向边缘设备的 ASR，整体形态类似 Whisper，但规模更小。
- [HuggingFace 博客——“Fine-Tune Whisper For Multilingual ASR with 🤗 Transformers”](https://huggingface.co/blog/fine-tune-whisper)——经典微调方案，包含梅尔频谱图预处理器和词元时间戳处理。
- [HuggingFace `modeling_whisper.py`](https://github.com/huggingface/transformers/blob/main/src/transformers/models/whisper/modeling_whisper.py)——完整实现（编码器、解码器、交叉注意力和生成），与本课架构图一致。
