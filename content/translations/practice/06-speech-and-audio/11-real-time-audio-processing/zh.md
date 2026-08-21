---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/06-speech-and-audio/11-real-time-audio-processing/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 38770fe883e05dd7bc541c3d3dbca612686e46d48c7d9a2f4ab2b8b9bb9735db
status: reviewed
---

# 实时音频处理

> 批处理流水线处理一个文件；实时流水线则必须在下一个 20 毫秒到达前处理完当前的 20 毫秒。每个对话式 AI、广播演播室和电话机器人都成败于这份延迟预算。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 6 第 02 课（频谱图）、Phase 6 第 04 课（ASR）、Phase 6 第 07 课（TTS）  
**预计时间：** 约 75 分钟

## 问题

你想要一个感觉鲜活的语音助理。人类对话轮换的延迟约为 230 ms（从安静到回应）。高于 500 ms 会感觉机械；高于 1500 ms 会感觉系统坏了。2026 年，完整的**听见 → 理解 → 回应 → 说出**循环预算如下：

| 阶段 | 预算 |
|------|------|
| 麦克风 → 缓冲区 | 20 ms |
| VAD | 10 ms |
| ASR（流式） | 150 ms |
| LLM（首词元） | 100 ms |
| TTS（首块） | 100 ms |
| 渲染 → 扬声器 | 20 ms |
| **总计** | **约 400 ms** |

Moshi（Kyutai，2024）实现了 200 ms 全双工；GPT-4o-realtime（2024）约为 320 ms；2022 年的级联流水线则高达 2500 ms。10 倍改进来自三项技术：(1) 各环节全面流式化；(2) 使用部分结果做异步流水线并行；(3) 允许中断生成。

## 概念

![包含环形缓冲区、VAD 门控与中断的流式音频流水线](../assets/real-time.svg)

**帧 / 块 / 窗口。** 实时音频以固定大小的块流动。常见选择是 20 ms（16 kHz 下 320 个样本）。所有下游组件都必须跟上这一节奏。

**环形缓冲区（ring buffer）。** 固定大小的循环缓冲区。生产者线程写入新帧，消费者线程读取。在热点路径中不做内存分配。大小约等于最大延迟 × 采样率；2 秒、16 kHz 的环形缓冲区可容纳 32,000 个样本。

**VAD（语音活动检测）。** 无人说话时关闭下游工作。Silero VAD 4.0（2024）在 CPU 上处理每个 30 ms 帧耗时不到 1 ms；`webrtcvad` 是较老的替代方案。

**流式 ASR。** 随音频到达而输出部分转录的模型。Parakeet-CTC-0.6B 的流式模式（NeMo，2024）在 320 ms 延迟下可达到 2–5% WER。Whisper-Streaming（Macháček 等，2023）对 Whisper 分块，在约 2 秒延迟下实现近流式处理。

**中断。** 用户在助理说话时开口，你必须：(a) 检测插话；(b) 停止 TTS；(c) 丢弃余下 LLM 输出。所有操作都要在 100 ms 内完成，否则用户会觉得助理听不见自己。

**WebRTC Opus 传输。** 20 ms 帧、48 kHz、自适应比特率 8–128 kbps。它是浏览器与移动端的标准。LiveKit、Daily.co、Pion 是 2026 年构建语音应用的技术栈。

**抖动缓冲区。** 网络包会乱序或延迟到达。抖动缓冲区负责重排与平滑；太小会产生可听见的断裂，太大则增加延迟。典型值为 60–80 ms。

### 常见坑

- **线程争用。** Python GIL 加上重型模型可能饿死音频线程。使用带 C 回调的音频库（sounddevice、PortAudio），并让 Python 离开热点路径。
- **采样率转换延迟。** 在流水线内部重采样会增加 5–20 ms。应提前重采样，或使用零延迟重采样器（PolyPhase、`soxr_hq`）。
- **TTS 预热。** 即使 Kokoro 这样快速的 TTS，首次请求也有 100–200 ms 预热。缓存模型，并在第一个真实轮次前用一次虚拟运行预热。
- **回声消除。** 若没有 AEC，TTS 输出会重新进入麦克风，触发 ASR 识别机器人的声音。WebRTC AEC3 是开源默认方案。

```figure
nyquist-aliasing
```

## 动手实现

### 步骤 1：环形缓冲区

```python
import collections

class RingBuffer:
    def __init__(self, capacity):
        self.buf = collections.deque(maxlen=capacity)
    def write(self, frame):
        self.buf.extend(frame)
    def read(self, n):
        return [self.buf.popleft() for _ in range(min(n, len(self.buf)))]
    def level(self):
        return len(self.buf)
```

容量决定最大缓冲延迟。16 kHz 下 32,000 个样本 = 2 秒。

### 步骤 2：VAD 门控

```python
def simple_energy_vad(frame, threshold=0.01):
    return sum(x * x for x in frame) / len(frame) > threshold ** 2
```

生产环境应替换为 Silero VAD：

```python
import torch
vad, _ = torch.hub.load("snakers4/silero-vad", "silero_vad")
is_speech = vad(torch.tensor(frame), 16000).item() > 0.5
```

### 步骤 3：流式 ASR

```python
# Parakeet-CTC-0.6B streaming via NeMo
from nemo.collections.asr.models import EncDecCTCModelBPE
asr = EncDecCTCModelBPE.from_pretrained("nvidia/parakeet-ctc-0.6b")
# chunk_ms=320 ms, look_ahead_ms=80 ms
for chunk in audio_stream():
    partial_text = asr.transcribe_streaming(chunk)
    print(partial_text, end="\r")
```

### 步骤 4：中断处理器

```python
class Dialog:
    def __init__(self):
        self.tts_task = None

    def on_user_speech(self, frame):
        if self.tts_task and not self.tts_task.done():
            self.tts_task.cancel()   # barge-in
        # then feed to streaming ASR

    def on_final_user_utterance(self, text):
        self.tts_task = asyncio.create_task(self.reply(text))

    async def reply(self, text):
        async for tts_chunk in llm_then_tts(text):
            speaker.write(tts_chunk)
```

关键在于异步 I/O 和可取消的 TTS 流式处理。在音轨上调用 WebRTC `peerconnection.stop()` 是标准方式。

## 用于实践

2026 年的技术栈：

| 层 | 选择 |
|----|------|
| 传输 | LiveKit（WebRTC）或 Pion（Go） |
| VAD | Silero VAD 4.0 |
| 流式 ASR | Parakeet-CTC-0.6B 或 Whisper-Streaming |
| LLM 首词元 | Groq、Cerebras、vLLM-streaming |
| 流式 TTS | Kokoro 或 ElevenLabs Turbo v2.5 |
| 回声消除 | WebRTC AEC3 |
| 原生端到端 | OpenAI Realtime API 或 Moshi |

## 陷阱

- **为了安全缓冲 500 ms。** 缓冲区本身就是延迟下限。请缩小它。
- **没有固定线程优先级。** 音频回调线程优先级低于 UI 线程，会在负载下产生毛刺。
- **TTS 块太小。** 小于 200 ms 的块会让声码器伪影变得明显。320 ms 是最佳点。
- **没有抖动缓冲区。** 真实网络存在抖动；没有平滑就会产生爆裂声。
- **一次性错误处理。** 音频流水线必须不会崩溃；一个异常就会终止会话。

## 交付成果

保存为 `outputs/skill-realtime-designer.md`。设计一个为各阶段给出具体延迟预算的实时音频流水线。

## 练习

1. **简单。** 运行 `code/main.py`。它会模拟环形缓冲区 + 能量 VAD，并打印一条假 10 秒音频流各阶段的延迟。
2. **中等。** 使用 `sounddevice` 构建一个直通循环，以 20 ms 帧处理麦克风输入，并逐帧打印 VAD 状态。
3. **困难。** 使用 `aiortc` 构建全双工回声测试：浏览器 → WebRTC → Python → WebRTC → 浏览器。用 1 kHz 脉冲测量端到端延迟。

## 关键术语

| 术语 | 人们通常怎么说 | 实际含义 |
|------|----------------|----------|
| 环形缓冲区（ring buffer） | 循环队列 | 音频帧使用的固定大小、无锁（或 SPSC 锁）FIFO。 |
| VAD | 静音门控 | 标记语音与非语音的模型或启发式方法。 |
| 流式 ASR | 实时 STT | 音频到达时输出部分文本；前视范围有界。 |
| 抖动缓冲区（jitter buffer） | 网络平滑器 | 重排乱序数据包的队列；典型值为 60–80 ms。 |
| AEC | 回声消除 | 消除从扬声器到麦克风的反馈路径。 |
| 插话（barge-in） | 用户中断 | 系统在 TTS 期间检测到用户语音，必须取消播放。 |
| 全双工（full duplex） | 双向同时进行 | 用户与机器人可以同时说话；Moshi 是全双工模型。 |

## 延伸阅读

- [Macháček 等（2023）. Whisper-Streaming](https://arxiv.org/abs/2307.14743)——分块式近流式 Whisper。
- [Kyutai（2024）. Moshi](https://kyutai.org/Moshi.pdf)——全双工，200 ms 延迟。
- [LiveKit Agents 框架（2024）](https://docs.livekit.io/agents/)——生产级音频智能体编排。
- [Silero VAD 仓库](https://github.com/snakers4/silero-vad)——低于 1 ms 的 VAD，Apache 2.0。
- [WebRTC AEC3 论文](https://webrtc.googlesource.com/src/+/main/modules/audio_processing/aec3/)——开源回声消除。
