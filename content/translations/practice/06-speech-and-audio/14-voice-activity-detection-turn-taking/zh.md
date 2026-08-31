---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/06-speech-and-audio/14-voice-activity-detection-turn-taking/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 2e733e0d8a70489cf07220f0a6a420169c956164df7761872980207436592223
status: reviewed
---

# 语音活动检测与轮次切换——Silero、Cobra 与 Flush 技巧

> 每个语音智能体都成败于两个判断：用户现在是否在说话，以及用户是否说完了？VAD 回答第一个问题；轮次检测（VAD + 静音拖尾 + 语义端点模型）回答第二个。任一判断出错，助理不是打断用户，就是永远说个不停。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 6 第 11 课（实时音频）、Phase 6 第 12 课（语音助理）  
**预计时间：** 约 45 分钟

## 问题

语音智能体对每个 20 ms 块都要做三个不同的判断：

1. **这一帧是语音吗？**——VAD。逐帧二分类。
2. **用户是否开始了新的语句？**——起始检测。
3. **用户是否已经说完？**——端点检测（轮次结束）。

朴素答案（能量阈值）会在任何噪声环境中失效——交通声、键盘声和人群嘈杂声都会触发。2026 年的答案是：Silero VAD（开放、深度学习）+ 轮次检测模型（语义端点检测）+ 根据 VAD 校准的静音拖尾。

## 概念

![VAD 级联：能量 → Silero → 轮次检测器 → Flush 技巧](../assets/vad-turn-taking.svg)

### 三级 VAD 级联 <!-- learning-atlas: the-three-tier-vad-cascade -->

**第 1 级：能量门。** 成本最低。以 -40 dBFS 为 RMS 阈值。可过滤明显静音，但任何高于阈值的噪声都会触发。

**第 2 级：Silero VAD**（2020–2026，MIT）。100 万个参数。在 6000 多种语言上训练。使用单个 CPU 线程处理每个 30 ms 块约需 1 ms。在 5% FPR 下 TPR 为 87.7%。它是开源默认方案。

**第 3 级：语义轮次检测器。** LiveKit 的轮次检测模型（2024–2026）或自建小型分类器。它区分“句中停顿”和“已经说完”，使用语言上下文（语调 + 最近的单词），而非只看静音。

### 关键参数及默认值

- **阈值。** Silero 输出概率；在 &gt; 0.5（默认）或 &gt; 0.3（敏感）时判为语音。阈值越低，首词截断越少，误报越多。
- **最短语音时长。** 拒绝短于 250 ms 的语音——通常是咳嗽或椅子声。
- **静音拖尾（端点检测）。** VAD 回到 0 后等待 500–800 ms，才宣布轮次结束。太短会打断用户，太长则感觉迟钝。
- **前置缓冲区。** 保留 VAD 触发前 300–500 ms 的音频，防止“hey”被截断。

### Flush 技巧（Kyutai，2025）

流式 STT 模型存在前视延迟（Kyutai STT-1B 为 500 ms，STT-2.6B 为 2.5 秒）。正常情况下，语音结束后还要等待这么久才能得到转录。Flush 技巧是：VAD 触发语音结束时，**向 STT 发送 flush 信号**，强制立即输出。STT 以约 4 倍实时速度处理，因此 500 ms 缓冲区约 125 ms 就能处理完。

端到端：125 ms VAD + flush STT = 对话级延迟。

### 2026 年 VAD 比较

| VAD | 5% FPR 下的 TPR | 延迟 | 许可证 |
|-----|-----------------|------|--------|
| WebRTC VAD（Google，2013） | 50.0% | 30 ms | BSD |
| Silero VAD（2020–2026） | 87.7% | 约 1 ms | MIT |
| Cobra VAD（Picovoice） | 98.9% | 约 1 ms | 商业 |
| pyannote 分割 | 95% | 约 10 ms | 类 MIT |

Silero 是正确的默认选择，Cobra 是合规 / 准确度升级。到 2026 年，纯能量 VAD 不应再进入生产环境。

```figure
sp-vad-cascade
```

## 动手实现

### 步骤 1：能量门

```python
def energy_vad(chunk, threshold_dbfs=-40.0):
    rms = (sum(x * x for x in chunk) / len(chunk)) ** 0.5
    dbfs = 20.0 * math.log10(max(rms, 1e-10))
    return dbfs > threshold_dbfs
```

### 步骤 2：在 Python 中使用 Silero VAD

```python
from silero_vad import load_silero_vad, get_speech_timestamps

vad = load_silero_vad()
audio = torch.tensor(waveform_16k, dtype=torch.float32)
segments = get_speech_timestamps(
    audio, vad, sampling_rate=16000,
    threshold=0.5,
    min_speech_duration_ms=250,
    min_silence_duration_ms=500,
    speech_pad_ms=300,
)
for s in segments:
    print(f"{s['start']/16000:.2f}s - {s['end']/16000:.2f}s")
```

### 步骤 3：轮次结束状态机

```python
class TurnDetector:
    def __init__(self, silence_hangover_ms=500, min_speech_ms=250):
        self.state = "idle"
        self.speech_ms = 0
        self.silence_ms = 0
        self.silence_hangover_ms = silence_hangover_ms
        self.min_speech_ms = min_speech_ms

    def update(self, is_speech, chunk_ms=20):
        if is_speech:
            self.speech_ms += chunk_ms
            self.silence_ms = 0
            if self.state == "idle" and self.speech_ms >= self.min_speech_ms:
                self.state = "speaking"
                return "START"
        else:
            self.silence_ms += chunk_ms
            if self.state == "speaking" and self.silence_ms >= self.silence_hangover_ms:
                self.state = "idle"
                self.speech_ms = 0
                return "END"
        return None
```

### 步骤 4：Flush 技巧骨架

```python
def flush_on_end(stt_client, audio_buffer):
    stt_client.send_audio(audio_buffer)
    stt_client.send_flush()
    return stt_client.recv_transcript(timeout_ms=150)
```

要让它工作，STT（Kyutai、Deepgram、AssemblyAI）必须支持 flush。Whisper streaming 不支持——它以块为基础，总是等待块结束。

## 用于实践

| 情况 | VAD 选择 |
|------|----------|
| 开源、快速、通用 | Silero VAD |
| 商业呼叫中心 | Cobra VAD |
| 端侧（手机） | Silero VAD ONNX |
| 研究 / 说话人分离 | pyannote 分割 |
| 零依赖回退 | WebRTC VAD（传统） |
| 需要高质量轮次结束判断 | Silero + 分层使用 LiveKit 轮次检测器 |

经验法则：除非真的别无选择，否则绝不要交付纯能量 VAD。

## 陷阱

- **固定阈值。** 安静环境有效，嘈杂环境失效。应在设备上校准，或切换到 Silero。
- **静音拖尾太短。** 智能体在句中打断用户。500–800 ms 是对话语音的最佳范围。
- **拖尾太长。** 感觉迟钝。请与目标用户做 A/B 测试。
- **没有前置缓冲区。** 用户音频开头 200–300 ms 会丢失。务必保留滚动前置缓冲。
- **忽略语义端点检测。** “Hmm, let me think...” 中包含长停顿。用户讨厌在思考中途被打断。请使用 LiveKit 轮次检测器或类似模型。

## 交付成果

保存为 `outputs/skill-vad-tuner.md`。针对一项负载选择 VAD 模型、阈值、拖尾、前置缓冲和轮次检测策略。

## 练习

1. **简单。** 运行 `code/main.py`。它会模拟一段语音 + 静音 + 语音 + 咳嗽序列，并测试三级 VAD。
2. **中等。** 安装 `silero-vad`，处理一段 5 分钟录音，调整阈值以同时减少首词截断与误触发，并报告精确率 / 召回率。
3. **困难。** 构建一个微型轮次检测器：Silero VAD + 读取最近 10 个单词嵌入的三层 MLP（使用 sentence-transformers）。在手工标注的轮次结束数据集上训练，F1 比只用 Silero 高 10%。

## 关键术语

| 术语 | 人们通常怎么说 | 实际含义 |
|------|----------------|----------|
| VAD | 语音检测器 | 逐帧二分类：这是语音吗？ |
| 轮次检测（turn detection） | 端点检测 | VAD + 静音拖尾 + 语义端点。 |
| 静音拖尾（silence hangover） | 语音后等待 | 宣布轮次结束前的等待时间；500–800 ms。 |
| 前置缓冲（pre-roll） | 说话前缓冲 | 保留 VAD 触发前 300–500 ms 音频。 |
| Flush 技巧 | Kyutai 技巧 | VAD → flush-STT → 延迟从 500 ms 降到 125 ms。 |
| 语义端点（semantic endpoint） | “他真的想停下吗？” | 查看单词而非只看静音的机器学习分类器。 |
| 5% FPR 下的 TPR | ROC 点 | 标准 VAD 基准；Silero 为 87.7%，WebRTC 为 50%。 |

## 延伸阅读

- [Silero VAD](https://github.com/snakers4/silero-vad)——开放 VAD 参考方案。
- [Picovoice Cobra VAD](https://picovoice.ai/products/cobra/)——商业准确度领先者。
- [Kyutai——Unmute + Flush 技巧](https://kyutai.org/stt)——低于 200 ms 的工程技巧。
- [LiveKit——轮次检测](https://docs.livekit.io/agents/logic/turns/)——生产环境的语义端点检测。
- [WebRTC VAD](https://webrtc.googlesource.com/src/)——传统基线。
- [pyannote 分割](https://github.com/pyannote/pyannote-audio)——说话人分离级分割。
