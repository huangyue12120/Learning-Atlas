---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/06-speech-and-audio/01-audio-fundamentals/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: b50c405e879b2f560036ced3d62fdaccd8c1d5fa47604f823a8d99b2391095a6
status: reviewed
---

# 音频基础——波形、采样与傅里叶变换

> 波形是原始信号，频谱图是它的表示，梅尔特征则是适合机器学习的形式。每个现代 ASR 和 TTS 流水线都会沿着这架梯子前进，而第一阶就是理解采样与傅里叶变换。

**类型：** 学习  
**学习实现：** Python  
**前置课程：** Phase 1 第 06 课（向量与矩阵）、Phase 1 第 14 课（概率分布）  
**预计时间：** 约 45 分钟

## 问题

麦克风产生的是压力随时间变化的信号，而神经网络接收的是张量。两者之间隔着一整套约定；一旦违反这些约定，就会产生悄无声息的 bug：模型看似训练正常，词错误率（WER）却翻倍；TTS 上线后带着嘶声；或者语音克隆系统记住的是麦克风，而不是说话人。

语音系统中的每个 bug，最终都能追溯到三个问题之一：

1. 数据以什么采样率录制，模型又期望什么采样率？
2. 信号是否发生了混叠？
3. 你处理的是原始采样，还是频率表示？

答对这些问题，Phase 6 余下的内容就容易掌握；答错它们，即使 Whisper-Large-v4 也只会输出垃圾结果。

## 概念 <!-- learning-atlas: the-concept -->

![波形、采样、DFT 与频率分箱示意](../assets/audio-fundamentals.svg)

**波形（waveform）。** 一个取值位于 `[-1.0, 1.0]` 的一维浮点数组，以采样编号为索引。要换算为秒，用编号除以采样率：`t = n / sr`。一段 16 kHz、10 秒的音频是由 160,000 个浮点数组成的数组。

**采样率（sampling rate，sr）。** 每秒采集的样本数。2026 年常见的采样率如下：

| 采样率 | 用途 |
|--------|------|
| 8 kHz | 电话与传统 VOIP。奈奎斯特频率只有 4 kHz，会损失辅音信息；ASR 应避免使用。 |
| 16 kHz | ASR 标准。Whisper、Parakeet、SeamlessM4T v2 都接收 16 kHz 输入。 |
| 22.05 kHz | 较老模型的 TTS 声码器训练。 |
| 24 kHz | 现代 TTS（Kokoro、F5-TTS、xTTS v2）。 |
| 44.1 kHz | CD 音频与音乐。 |
| 48 kHz | 电影、专业音频与高保真 TTS（VALL-E 2、NaturalSpeech 3）。 |

**奈奎斯特—香农定理（Nyquist-Shannon）。** 采样率为 `sr` 时，可以无歧义表示的最高频率是 `sr/2`。`sr/2` 这条边界称为*奈奎斯特频率（Nyquist frequency）*。高于奈奎斯特频率的能量会发生*混叠（aliasing）*——折叠到更低的频率——从而破坏信号。因此，降采样前务必先做低通滤波。

**位深（bit depth）。** 16 位 PCM（有符号 int16，范围为 ±32,767）是通用交换格式；音乐常用 24 位，内部 DSP 则使用 32 位浮点数。`soundfile` 等库读取 int16 后，会将其暴露为 `[-1, 1]` 范围内的 float32 数组。

**傅里叶变换（Fourier Transform）。** 任意有限信号都可以表示为不同频率正弦波之和。对 `N` 个样本，离散傅里叶变换（DFT）会计算 `N` 个复数系数——每个频率分箱一个。`bin k` 对应频率 `k · sr / N` Hz。复数的模表示该频率上的幅度，辐角表示相位。

**FFT。** 快速傅里叶变换（Fast Fourier Transform）：当 `N` 是 2 的幂时，用 `O(N log N)` 时间计算 DFT 的算法。每个音频库的底层都使用 FFT。在 16 kHz 音频上做 1024 点 FFT，可得到 512 个可用频率分箱，覆盖 0–8 kHz，频率分辨率为 15.6 Hz。

**分帧与加窗（framing + window）。** 我们不会对整段音频做一次 FFT，而是把它切成相互重叠的*帧*（典型配置是 25 ms 帧长、10 ms 帧移），将每一帧乘以窗函数（Hann、Hamming）以消除边界处的不连续，再分别对各帧执行 FFT。这种处理称为短时傅里叶变换（STFT）。第 02 课将从这里继续。

```figure
mel-scale
```

## 动手实现

### 步骤 1：读取音频片段并绘制波形

`code/main.py` 只使用标准库中的 `wave` 模块，使演示不依赖第三方库。生产环境会使用 `soundfile` 或 `torchaudio.load`（二者都返回 `(waveform, sr)` 元组）：

```python
import soundfile as sf
waveform, sr = sf.read("clip.wav", dtype="float32")  # shape (T,), sr=int
```

### 步骤 2：从第一性原理合成正弦波

```python
import math

def sine(freq_hz, sr, seconds, amp=0.5):
    n = int(sr * seconds)
    return [amp * math.sin(2 * math.pi * freq_hz * i / sr) for i in range(n)]
```

在 16 kHz 下合成 1 秒、440 Hz（音乐会标准音 A）的正弦波，会得到 16,000 个浮点数。使用 `wave.open(..., "wb")`，按 16 位 PCM 编码写出。

### 步骤 3：手工计算 DFT

```python
def dft(x):
    N = len(x)
    out = []
    for k in range(N):
        re = sum(x[n] * math.cos(-2 * math.pi * k * n / N) for n in range(N))
        im = sum(x[n] * math.sin(-2 * math.pi * k * n / N) for n in range(N))
        out.append((re, im))
    return out
```

复杂度为 `O(N²)`——足以在 `N=256` 时验证正确性，却完全不适合真实音频。实际代码会调用 `numpy.fft.rfft` 或 `torch.fft.rfft`。

### 步骤 4：寻找主导频率

幅度峰值索引 `k_star` 对应频率 `k_star * sr / N`。在 440 Hz 正弦波上运行后，峰值应出现在分箱 `440 * N / sr`。

### 步骤 5：演示混叠

以 10 kHz 采样率（奈奎斯特频率 = 5 kHz）采样一个 7 kHz 正弦波。7 kHz 音调高于奈奎斯特频率，会折叠为 `10 − 7 = 3 kHz`，因此 FFT 峰值出现在 3 kHz。这是经典的混叠演示，也解释了为什么每个 DAC/ADC 都会配备陡峭的低通滤波器。

## 用于实践

2026 年真正用于交付的技术栈如下：

| 任务 | 库 | 原因 |
|------|----|------|
| 读写 WAV/FLAC/OGG | `soundfile`（libsndfile 封装） | 速度最快、稳定，并返回 float32。 |
| 重采样 | `torchaudio.transforms.Resample` 或 `librosa.resample` | 内置正确的抗混叠处理。 |
| STFT / Mel | `torchaudio` 或 `librosa` | 适合 GPU；属于 PyTorch 生态。 |
| 实时流处理 | `sounddevice` 或 `pyaudio` | 跨平台的 PortAudio 绑定。 |
| 检查文件 | `ffprobe` 或 `soxi` | 快速的 CLI，可报告采样率、声道与编解码器。 |

决策规则：**先匹配采样率，再匹配其他任何东西**。Whisper 期望 16 kHz、单声道、float32 输入。若传入 44.1 kHz 立体声，得到的垃圾结果看上去会像模型 bug。

## 交付成果

保存为 `outputs/skill-audio-loader.md`。该技能帮助你检查音频输入是否符合下游模型的期望，并在不符合时正确重采样。

## 练习

1. **简单。** 在 16 kHz 下合成 1 秒的 220 Hz + 440 Hz + 880 Hz 混合信号，运行 DFT，确认三个峰值出现在预期分箱。
2. **中等。** 以 48 kHz 录制一段 3 秒的语音。先用 `torchaudio.transforms.Resample`（带抗混叠）降采样到 16 kHz，再用朴素抽取（每三个样本取一个）降采样到 16 kHz。对两者做 FFT。混叠出现在哪里？
3. **困难。** 只使用 `math` 和步骤 3 的 DFT，从头实现 STFT。帧长为 400，帧移为 160，使用 Hann 窗。用 `matplotlib.pyplot.imshow` 绘制幅度，得到第 02 课中的频谱图。

## 关键术语

| 术语 | 人们通常怎么说 | 实际含义 |
|------|----------------|----------|
| 采样率（sample rate） | 每秒有多少个样本 | ADC 测量信号的频率，以 Hz 为单位。 |
| 奈奎斯特频率（Nyquist） | 能表示的最高频率 | `sr/2`；高于它的能量会向下混叠。 |
| 位深（bit depth） | 每个样本的分辨率 | `int16` = 65,536 个电平；`float32` = `[-1, 1]` 中的 24 位精度。 |
| DFT | 序列的傅里叶变换 | `N` 个样本 → `N` 个复数频率系数。 |
| FFT | 快速 DFT | 要求 `N` 为 2 的幂、复杂度为 `O(N log N)` 的算法。 |
| 分箱（bin） | 频率列 | 对应 `k · sr / N` Hz；分辨率 = `sr / N`。 |
| STFT | 频谱图的底层机制 | 随时间对分帧、加窗后的信号执行 FFT。 |
| 混叠（aliasing） | 奇怪的频率幽灵 | 高于奈奎斯特频率的能量镜像到较低分箱。 |

## 延伸阅读

- [Shannon (1949). Communication in the Presence of Noise](https://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy/entropy.pdf)——采样定理背后的论文。
- [Smith — The Scientist and Engineer's Guide to Digital Signal Processing](https://www.dspguide.com/ch8.htm)——免费、权威的 DSP 教材。
- [librosa 文档——音频入门](https://librosa.org/doc/latest/tutorial.html)——带代码的实作导览。
- [Heinrich Kuttruff — Room Acoustics（第 6 版）](https://www.routledge.com/Room-Acoustics/Kuttruff/p/book/9781482260434)——解释真实音频为什么不是干净正弦波的参考资料。
- [Steve Eddins — FFT Interpretation notebook](https://blogs.mathworks.com/steve/2020/03/30/fft-spectrum-and-spectral-densities/)——用 10 分钟厘清频率分箱直觉。
