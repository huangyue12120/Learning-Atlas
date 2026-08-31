---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/06-speech-and-audio/02-spectrograms-mel-features/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: f59fdf24432cbb8cb256aac7d9dd723115935021614a42581160d74845c86568
status: reviewed
---

# 频谱图、梅尔尺度与音频特征

> 神经网络不擅长直接接收原始波形，却能很好地处理频谱图；处理梅尔频谱图时效果更佳。2026 年的每个 ASR、TTS 和音频分类器，都成败于这一项预处理选择。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 6 第 01 课（音频基础）  
**预计时间：** 约 45 分钟

## 问题

取一段 16 kHz、10 秒的音频，会得到 160,000 个全部位于 `[-1, 1]` 的浮点数，它们与“狗叫”或“单词 cat”这样的标签几乎完全不相关。原始波形包含所需信息，但其形式很难让模型提取。即使是两个完全相同、只相隔 100 ms 的音素，其原始采样值也完全不同。

频谱图解决了这个问题：它压缩人类感知会忽略的时间细节（微秒级抖动），保留感知关注的结构（在约 10–25 ms 的时间窗口中，哪些频率具有能量）。

梅尔频谱图又进一步。人类对音高的感知是对数式的：100 Hz 与 200 Hz 听起来的“间距”，和 1000 Hz 与 2000 Hz 相同。梅尔尺度会对频率轴进行扭曲，以符合这种感知。从 2010 年到 2026 年，梅尔尺度频谱图一直是语音机器学习中最重要的一种特征。

## 概念 <!-- learning-atlas: the-concept -->

![从波形到 STFT、梅尔频谱图与 MFCC 的阶梯](../assets/mel-features.svg)

**STFT（短时傅里叶变换，Short-Time Fourier Transform）。** 将波形切成重叠帧（典型配置：25 ms 窗、10 ms 帧移，即 16 kHz 下的 400/160 个样本）。每帧乘以窗函数（默认 Hann；Hamming 的取舍略有不同），再对各帧执行 FFT。把幅度谱堆叠为形状 `(n_frames, n_freq_bins)` 的矩阵，所得矩阵称为频谱图。

**对数幅度（log-magnitude）。** 原始幅度跨越 5–6 个数量级。使用 `log(|X| + 1e-6)` 或 `20 * log10(|X|)` 压缩动态范围。每个生产流水线使用的都是对数幅度，而不是原始幅度。

**梅尔尺度（mel scale）。** 以 Hz 表示的频率 `f` 按 `m = 2595 * log10(1 + f / 700)` 映射到梅尔值 `m`。该映射在 1 kHz 以下大致呈线性，以上则大致呈对数。覆盖 0–8 kHz 的 80 个梅尔分箱是标准 ASR 输入。

**梅尔滤波器组（mel filterbank）。** 一组在梅尔尺度上等距排列的三角形滤波器。每个滤波器都是相邻 FFT 分箱的加权和。用 STFT 幅度乘以滤波器组矩阵，只需一次矩阵乘法就能得到梅尔频谱图。

**对数梅尔频谱图（log-mel spectrogram）。** `log(mel_spec + 1e-10)`。它是 Whisper、Parakeet 与 SeamlessM4T 的输入，也是 2026 年通用的音频前端。

**MFCC。** 对对数梅尔频谱图应用 II 型 DCT，并保留前 13 个系数。这样可去除特征间相关性并进一步压缩。它曾是主导特征，直到约 2015 年，基于原始对数梅尔的 CNN/Transformer 才追上来。MFCC 仍用于说话人识别（x-vector、ECAPA）。

**分辨率取舍。** FFT 越大，频率分辨率越好，时间分辨率却越差。25 ms/10 ms 是音频机器学习的默认设置；音乐常用 50 ms/12.5 ms；瞬态检测（鼓点、爆破音）常用 5 ms/2 ms。

```figure
spectrogram-window
```

## 动手实现

### 步骤 1：对波形分帧

```python
def frame(signal, frame_len, hop):
    n = 1 + (len(signal) - frame_len) // hop
    return [signal[i * hop : i * hop + frame_len] for i in range(n)]
```

一段 16 kHz、10 秒的音频，在 `frame_len=400, hop=160` 时会产生 998 帧。

### 步骤 2：Hann 窗

```python
import math

def hann(N):
    return [0.5 * (1 - math.cos(2 * math.pi * n / (N - 1))) for n in range(N)]
```

在 FFT 前逐元素相乘，可消除在非零端点截断引起的频谱泄漏。

### 步骤 3：STFT 幅度

```python
def stft_magnitude(signal, frame_len=400, hop=160):
    win = hann(frame_len)
    frames = frame(signal, frame_len, hop)
    return [magnitudes(dft([w * s for w, s in zip(win, f)])) for f in frames]
```

生产环境使用由 FFT 支持且已向量化的 `torch.stft` 或 `librosa.stft`。这里的循环用于教学；`code/main.py` 会在短音频上运行它。

### 步骤 4：梅尔滤波器组

```python
def hz_to_mel(f):
    return 2595.0 * math.log10(1.0 + f / 700.0)

def mel_to_hz(m):
    return 700.0 * (10 ** (m / 2595.0) - 1)

def mel_filterbank(n_mels, n_fft, sr, fmin=0, fmax=None):
    fmax = fmax or sr / 2
    mels = [hz_to_mel(fmin) + (hz_to_mel(fmax) - hz_to_mel(fmin)) * i / (n_mels + 1)
            for i in range(n_mels + 2)]
    hzs = [mel_to_hz(m) for m in mels]
    bins = [int(h * n_fft / sr) for h in hzs]
    fb = [[0.0] * (n_fft // 2 + 1) for _ in range(n_mels)]
    for m in range(n_mels):
        for k in range(bins[m], bins[m + 1]):
            fb[m][k] = (k - bins[m]) / max(1, bins[m + 1] - bins[m])
        for k in range(bins[m + 1], bins[m + 2]):
            fb[m][k] = (bins[m + 2] - k) / max(1, bins[m + 2] - bins[m + 1])
    return fb
```

在 `n_fft=400` 时，用 80 个梅尔分箱覆盖 0–8 kHz，会得到一个 `(80, 201)` 矩阵。将 `(n_frames, 201)` 的 STFT 幅度乘以它的转置，即可得到 `(n_frames, 80)` 的梅尔频谱图。

### 步骤 5：对数梅尔

```python
def log_mel(mel_spec, eps=1e-10):
    return [[math.log(max(v, eps)) for v in frame] for frame in mel_spec]
```

常见替代方案包括：`librosa.power_to_db`（按参考值归一化的 dB）以及 `10 * log10(power + eps)`。Whisper 使用更复杂的裁剪与归一化流程（参见 Whisper 的 `log_mel_spectrogram`）。

### 步骤 6：MFCC

```python
def dct_ii(x, n_coeffs):
    N = len(x)
    return [
        sum(x[n] * math.cos(math.pi * k * (2 * n + 1) / (2 * N)) for n in range(N))
        for k in range(n_coeffs)
    ]
```

对每个对数梅尔帧应用 DCT，并保留前 13 个系数，所得矩阵称为 MFCC 矩阵。通常会丢弃第一个系数，因为它编码的是整体能量。

## 用于实践

2026 年的技术栈：

| 任务 | 特征 |
|------|------|
| ASR（Whisper、Parakeet、SeamlessM4T） | 80 维对数梅尔，10 ms 帧移，25 ms 窗 |
| TTS 声学模型（VITS、F5-TTS、Kokoro） | 80 维梅尔，5–12 ms 帧移，以实现精细时间控制 |
| 音频分类（AST、PANNs、BEATs） | 128 维对数梅尔，10 ms 帧移 |
| 说话人嵌入（ECAPA-TDNN、WavLM） | 80 维对数梅尔或原始波形 SSL |
| 音乐（MusicGen、Stable Audio 2） | EnCodec 离散词元（不是梅尔特征） |
| 关键词检测 | 面向微型设备的 40 维 MFCC |

经验法则：**如果处理的不是音乐，就从 80 维对数梅尔开始。** 任何偏离都应给出充分理由。

## 2026 年仍会进入生产环境的陷阱

- **梅尔维数不匹配。** 训练用 80 维梅尔，推理用 128 维。它会悄无声息地失败。请在两端记录特征形状。
- **上游采样率不匹配。** 在 22.05 kHz 下计算的梅尔特征与 16 kHz 不同。请在特征提取*之前*修正采样率。
- **dB 与 log 混淆。** Whisper 期望对数梅尔，而不是 dB 梅尔。一些 HF 流水线会自动检测，自定义代码不会。
- **归一化漂移。** 训练时按语句归一化，推理时做全局归一化。这类生产 bug 会让 WER 翻倍。
- **填充造成泄漏。** 在音频末尾补零会让尾部帧产生平坦频谱。应对称填充或复制边界。

## 交付成果

保存为 `outputs/skill-feature-extractor.md`。该技能针对给定模型目标选择特征类型、梅尔维数、帧长/帧移以及归一化方案。

## 练习

1. **简单。** 运行 `code/main.py`。它会合成一个扫频信号（频率从 200 → 4000 Hz），并打印每帧梅尔分箱的 argmax。可以选择绘图，并确认结果与扫频相符。
2. **中等。** 分别取 `n_mels` 为 `{40, 80, 128}`、`frame_len` 为 `{200, 400, 800}` 重新运行。测量时间轴上的尖峰带宽。哪一种组合对扫频的分辨效果最好？
3. **困难。** 实现 `power_to_db`，并在 AudioMNIST 上训练一个微型 CNN 分类器，比较三种输入的 ASR 准确率：(a) 原始对数梅尔，(b) 使用 `ref=max` 的 dB 梅尔，(c) MFCC-13 + 一阶差分 + 二阶差分。报告 top-1 准确率。

## 关键术语

| 术语 | 人们通常怎么说 | 实际含义 |
|------|----------------|----------|
| 帧（frame） | 一小段 | 送入一次 FFT 的 25 ms 波形片段。 |
| 帧移（hop） | 步幅 | 连续两帧之间相隔的样本数；ASR 默认为 10 ms。 |
| 窗（window） | Hann/Hamming 那个东西 | 让帧边缘渐变到零的逐点乘数。 |
| STFT | 频谱图生成器 | 分帧 + 加窗 FFT；产生时间 × 频率矩阵。 |
| 梅尔（mel） | 扭曲后的频率 | 对数感知尺度；`m = 2595·log10(1 + f/700)`。 |
| 滤波器组（filterbank） | 那个矩阵 | 把 STFT 投影到梅尔分箱上的三角形滤波器。 |
| 对数梅尔（log-mel） | Whisper 的输入 | `log(mel_spec + eps)`；已在 2026 年标准化。 |
| MFCC | 传统特征 | 对数梅尔的 DCT；13 个去相关系数。 |

## 延伸阅读

- [Davis、Mermelstein（1980）. Comparison of parametric representations for monosyllabic word recognition](https://ieeexplore.ieee.org/document/1163420)——MFCC 论文。
- [Stevens、Volkmann、Newman（1937）. A Scale for the Measurement of the Psychological Magnitude Pitch](https://pubs.aip.org/asa/jasa/article-abstract/8/3/185/735757/)——最初的梅尔尺度。
- [OpenAI——Whisper 源码中的 log_mel_spectrogram](https://github.com/openai/whisper/blob/main/whisper/audio.py)——阅读参考实现。
- [librosa 特征提取文档](https://librosa.org/doc/main/feature.html)——`mfcc`、`melspectrogram` 和帧移/窗的参考资料。
- [NVIDIA NeMo——音频预处理](https://docs.nvidia.com/deeplearning/nemo/user-guide/docs/en/main/asr/asr_all.html#featurizers)——面向 Parakeet 与 Canary 的生产级流水线。
