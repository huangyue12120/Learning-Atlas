---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/06-speech-and-audio/07-text-to-speech/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: d974cde93a3a8e692caf62fd9e48e18ebd8b889043bef6cf2367b4d89049a561
status: reviewed
---

# 文本转语音（TTS）——从 Tacotron 到 F5 与 Kokoro

> ASR 把语音转换为文本，TTS 则把文本转换为语音。2026 年的技术栈由三部分构成：文本 → 词元、词元 → 梅尔、梅尔 → 波形。每一部分都有能装进笔记本电脑的默认模型。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 6 第 02 课（频谱图与梅尔）、Phase 5 第 09 课（Seq2Seq）、Phase 7 第 05 课（完整 Transformer）  
**预计时间：** 约 75 分钟

## 问题

你有一个字符串：“Please remind me to water the plants at 6 pm.”。需要生成一段 3 秒音频：听起来自然、有正确的韵律（停顿、重音）、能以正确元音读出 “plants”，并能在 CPU 上于 300 ms 内完成，以供实时语音助理使用。还需要切换声音、处理语码转换输入（“remind me at 6 pm, daijoubu?”），并避免在姓名发音上闹笑话。

现代 TTS 流水线如下：

1. **文本前端。** 归一化文本（日期、数字、电子邮件），转换成音素或子词词元，并预测韵律特征。
2. **声学模型。** 文本 → 梅尔频谱图。Tacotron 2（2017）、FastSpeech 2（2020）、VITS（2021）、F5-TTS（2024）、Kokoro（2024）。
3. **声码器。** 梅尔 → 波形。WaveNet（2016）、WaveRNN、HiFi-GAN（2020）、BigVGAN（2022），以及 2024 年后的神经编解码器声码器。

到 2026 年，端到端扩散与流匹配模型模糊了声学模型和声码器之间的界线，但把系统理解为三个部分，对调试仍然有效。

## 概念

![Tacotron、FastSpeech、VITS 与 F5/Kokoro 并排比较](../assets/tts.svg)

**Tacotron 2（2017）。** Seq2seq：字符嵌入 → BiLSTM 编码器 → 位置敏感注意力 → 自回归 LSTM 解码器输出梅尔帧。速度慢（AR），处理长文本时不稳定。如今仍常被引用为基线。

**FastSpeech 2（2020）。** 非自回归。时长预测器输出每个音素应占多少个梅尔帧。一次前向计算，比 Tacotron 快 10 倍。由于使用单调对齐，会损失一些自然度，但已广泛部署。

**VITS（2021）。** 通过变分推断，端到端联合训练编码器、基于流的时长模块和 HiFi-GAN 声码器。质量高，单个模型即可完成。它是 2022–2024 年主导性的开源 TTS。变体包括 YourTTS（多说话人零样本）和 XTTS v2（Coqui，2024）。

**F5-TTS（2024）。** 在流匹配上运行的扩散 Transformer。韵律自然，只需 5 秒参考音频即可进行零样本语音克隆。位居 2026 年开源 TTS 排行榜前列，有 3.35 亿个参数。

**Kokoro（2024）。** 小巧（8200 万参数），可在 CPU 上运行，是实时英语 TTS 中的同类最佳方案。只支持封闭词表英语，采用 Apache-2.0 许可证。

**OpenAI TTS-1-HD、ElevenLabs v2.5、Google Chirp-3。** 商业领域的最先进方案。ElevenLabs v2.5 的情绪标签（“[whispered]”“[laughing]”）和角色声音在 2026 年主导有声书制作。

### 声码器演进 <!-- learning-atlas: vocoder-evolution -->

| 年代 | 声码器 | 延迟 | 质量 |
|------|--------|------|------|
| 2016 | WaveNet | 只能离线 | 发布时的 SOTA |
| 2018 | WaveRNN | 约实时 | 良好 |
| 2020 | HiFi-GAN | 100× 实时 | 接近人类 |
| 2022 | BigVGAN | 50× 实时 | 可跨说话人与语言泛化 |
| 2024 | SNAC、DAC（神经编解码器） | 与 AR 模型集成 | 离散词元、比特效率高 |

到 2026 年，大多数“TTS”模型都能端到端地从文本生成波形；梅尔频谱图成为内部表示。

### 评估

- **MOS（平均意见分，Mean Opinion Score）。** 1–5 分，由众包人员评定。仍是金标准，但速度慢得令人痛苦。
- **CMOS（比较 MOS，Comparative MOS）。** A 与 B 的偏好比较。每条标注可得到更窄的置信区间。
- **UTMOS、DNSMOS。** 无需参考音频的神经 MOS 预测器，用于排行榜。
- **通过 ASR 计算 CER（字符错误率）。** 将 TTS 输出送入 Whisper，计算相对于输入文本的 CER，作为可懂度的代理指标。
- **SECS（说话人嵌入余弦相似度）。** 衡量语音克隆质量。

LibriTTS test-clean 上的 2026 年数据：

| 模型 | UTMOS | CER（通过 Whisper） | 大小 |
|------|-------|----------------------|------|
| 真实音频 | 4.08 | 1.2% | — |
| F5-TTS | 3.95 | 2.1% | 3.35 亿 |
| XTTS v2 | 3.81 | 3.5% | 4.70 亿 |
| VITS | 3.62 | 3.1% | 2500 万 |
| Kokoro v0.19 | 3.87 | 1.8% | 8200 万 |
| Parler-TTS Large | 3.76 | 2.8% | 23 亿 |

```figure
sp-tts-stack
```

## 动手实现

### 步骤 1：把输入转换为音素

```python
from phonemizer import phonemize
ph = phonemize("Hello world", language="en-us", backend="espeak")
# 'həloʊ wɜːld'
```

音素是通用桥梁。对于任何质量低于 VITS 水平的系统，都不要把原始文本直接送入后续模块。

### 步骤 2：运行 Kokoro（2026 年 CPU 默认方案）

```python
from kokoro import KPipeline
tts = KPipeline(lang_code="a")  # "a" = American English
audio, sr = tts("Please remind me to water the plants at 6 pm.", voice="af_bella")
# audio: float32 tensor, sr=24000
```

可离线运行，只有一个文件，8200 万个参数。

### 步骤 3：使用 F5-TTS 做语音克隆

```python
from f5_tts.api import F5TTS
tts = F5TTS()
wav = tts.infer(
    ref_file="my_voice_5s.wav",
    ref_text="The quick brown fox jumps over the lazy dog.",
    gen_text="Please remind me to water the plants.",
)
```

传入 5 秒参考音频及其文本；F5 会克隆韵律与音色。

### 步骤 4：从头实现 HiFi-GAN 声码器

完整实现太大，放不进教程脚本，但其形状如下：

```python
class HiFiGAN(nn.Module):
    def __init__(self, mel_channels=80, upsample_rates=[8, 8, 2, 2]):
        super().__init__()
        # 4 upsample blocks, total 256x to go from mel-rate to audio-rate
        ...
    def forward(self, mel):
        return self.blocks(mel)  # -> waveform
```

训练目标包括：对抗损失（鉴别器读取短窗口）+ 梅尔频谱图重建损失 + 特征匹配损失。该能力已经商品化——使用 `hifi-gan` 仓库或 NVIDIA NeMo 的预训练检查点即可。

### 步骤 5：完整流水线（伪代码）

```python
text = "Please remind me at 6 pm."
phones = phonemize(text)
mel = acoustic_model(phones, speaker=alice)      # [T, 80]
wav = vocoder(mel)                                # [T * 256]
soundfile.write("out.wav", wav, 24000)
```

## 用于实践

2026 年的技术栈：

| 情况 | 选择 |
|------|------|
| 实时英语语音助理 | Kokoro（CPU）或 XTTS v2（GPU） |
| 从 5 秒参考音频克隆声音 | F5-TTS |
| 商业角色声音 | ElevenLabs v2.5 |
| 有声书叙述 | ElevenLabs v2.5 或 XTTS v2 + 微调 |
| 低资源语言 | 在 5–20 小时目标语言数据上训练 VITS |
| 表现力 / 情绪标签 | ElevenLabs v2.5 或微调 StyleTTS 2 |

截至 2026 年的开源领先者：**F5-TTS 质量最佳，Kokoro 效率最高**。除非你是历史学家，否则不要再选 Tacotron。

## 陷阱

- **没有文本归一化器。** “Dr. Smith”应读作“Doctor”还是“Drive”？“2026”应读作“twenty twenty six”还是“two zero two six”？请在音素化器*之前*归一化。
- **词表外专有名词。** “Ghumare”应读作“ghyu-mair”吗？为未知词元提供字素到音素模型作为回退。
- **削波。** 声码器输出很少削波，但推理时的梅尔缩放不匹配可能超出 ±1.0。务必执行 `np.clip(wav, -1, 1)`。
- **采样率不匹配。** Kokoro 输出 24 kHz，而下游流水线期望 16 kHz → 应重采样，否则会发生混叠。

## 交付成果

保存为 `outputs/skill-tts-designer.md`。针对给定声音、延迟与语言目标设计 TTS 流水线。

## 练习

1. **简单。** 运行 `code/main.py`。它会根据玩具词表构建音素字典、估算各音素时长，并打印一个假的“梅尔”时间表。
2. **中等。** 安装 Kokoro，分别用声音 `af_bella` 和 `am_adam` 合成同一句话，比较音频时长与主观质量。
3. **困难。** 录制一段 5 秒的自己声音作为参考，使用 F5-TTS 克隆，并报告参考音频与克隆输出之间的 SECS。

## 关键术语

| 术语 | 人们通常怎么说 | 实际含义 |
|------|----------------|----------|
| 音素（phoneme） | 声音单位 | 抽象声音类别；英语 ARPABet 有 39 个。 |
| 时长预测器（duration predictor） | 每个音素持续多久 | 非自回归模型输出；每个音素对应的整数帧数。 |
| 声码器（vocoder） | 梅尔 → 波形 | 将梅尔频谱图映射为原始采样的神经网络。 |
| HiFi-GAN | 标准声码器 | 基于 GAN；主导 2020–2024 年。 |
| MOS | 主观质量 | 人类评分者给出的 1–5 平均意见分。 |
| SECS | 语音克隆指标 | 目标声音与输出声音的说话人嵌入余弦相似度。 |
| F5-TTS | 2024 年开源 SOTA | 流匹配扩散；零样本克隆。 |
| Kokoro | CPU 英语领先者 | 8200 万参数，Apache 2.0。 |

## 延伸阅读

- [Shen 等（2017）. Tacotron 2](https://arxiv.org/abs/1712.05884)——seq2seq 基线。
- [Kim、Kong、Son（2021）. VITS](https://arxiv.org/abs/2106.06103)——基于流的端到端模型。
- [Chen 等（2024）. F5-TTS](https://arxiv.org/abs/2410.06885)——当前开源 SOTA。
- [Kong、Kim、Bae（2020）. HiFi-GAN](https://arxiv.org/abs/2010.05646)——到 2026 年仍在部署的声码器。
- [Hugging Face 上的 Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M)——2024 年面向 CPU 的英语 TTS。
