---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/06-speech-and-audio/12-voice-assistant-pipeline/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 42adee0778ecf907bc8312c65cde0d75a8cc6db9ee3780bcc441cbc768a884ee
status: reviewed
---

# 构建语音助理流水线——Phase 6 综合项目

> 把第 01–11 课的一切连接起来。构建一个能倾听、推理并开口回应的语音助理。到 2026 年，这已是工程问题，而非研究问题——但集成细节决定它能否交付。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 6 第 04、05、06、07、11 课；Phase 11 第 09 课（函数调用）；Phase 14 第 01 课（智能体循环）  
**预计时间：** 约 120 分钟

## 问题

构建一个端到端助理：

1. 捕获麦克风输入（16 kHz 单声道）。
2. 检测用户开始与结束说话。
3. 流式转录。
4. 把转录文本传给可调用工具（计时器、天气、日历）的 LLM。
5. 把 LLM 文本流式送入 TTS。
6. 向用户播放音频。
7. 如果用户在回应中途打断，就停止播放。

延迟目标：在笔记本电脑 CPU 上，从用户结束说话到收到第一个 TTS 音频字节不超过 800 ms。质量目标：不漏词、不在静音中产生字幕幻觉、不泄漏克隆声音、不让提示注入成功。

## 概念

![语音助理流水线：麦克风 → VAD → STT → LLM + 工具 → TTS → 扬声器](../assets/voice-assistant.svg)

### 七个组件

1. **音频捕获。** 麦克风 → 16 kHz 单声道 → 20 ms 块。Python 中通常使用 `sounddevice`，生产环境则使用原生 AudioUnit/ALSA/WASAPI。
2. **VAD（第 11 课）。** Silero VAD，阈值 0.5，最短语音 250 ms，静音拖尾 500 ms。发出“开始”和“结束”信号。
3. **流式 STT（第 4–5 课）。** Whisper-streaming、Parakeet-TDT 或 Deepgram Nova-3（API），输出部分与最终转录。
4. **带工具调用的 LLM。** GPT-4o / Claude 3.5 / Gemini 2.5 Flash。以 JSON schema 定义工具，流式输出词元。
5. **流式 TTS（第 7 课）。** Kokoro-82M（最快开源方案）或 Cartesia Sonic（商业方案）。在收到 20 个 LLM 词元后启动 TTS。
6. **播放。** 输出到扬声器；低带宽网络使用 Opus 编码。
7. **中断处理器。** 如果在 TTS 播放期间触发 VAD，就停止播放、取消 LLM，并重新启动 STT。

### 一定会遇到的三种故障

1. **首词截断。** VAD 启动晚了一拍，用户的“hey”消失了。启动阈值应设为 0.3，而非 0.5。
2. **回应中途打断混乱。** 用户中断后 LLM 仍在生成，助理盖过用户说话。把 VAD 连接到取消 LLM 的操作。
3. **静音幻觉。** Whisper 在静音预热帧上输出“Thanks for watching”。务必用 VAD 门控。

### 2026 年生产参考技术栈

| 技术栈 | 延迟 | 许可证 | 说明 |
|--------|------|--------|------|
| LiveKit + Deepgram + GPT-4o + Cartesia | 350–500 ms | 商业 API | 2026 年行业默认方案 |
| Pipecat + Whisper-streaming + GPT-4o + Kokoro | 500–800 ms | 主要为开源 | 适合自己动手 |
| Moshi（全双工） | 200–300 ms | CC-BY 4.0 | 单模型；架构不同，见第 15 课 |
| Vapi / Retell（托管） | 300–500 ms | 商业 | 上线最快；定制能力有限 |
| Whisper.cpp + llama.cpp + Kokoro-ONNX | 离线 | 开源 | 隐私 / 边缘端 |

```figure
v4-voice-latency
```

## 动手实现

### 步骤 1：带分块的麦克风捕获（伪代码）

```python
import sounddevice as sd

def mic_stream(chunk_ms=20, sr=16000):
    q = queue.Queue()
    def cb(indata, frames, time, status):
        q.put(indata.copy().flatten())
    with sd.InputStream(channels=1, samplerate=sr, blocksize=int(sr * chunk_ms/1000), callback=cb):
        while True:
            yield q.get()
```

### 步骤 2：由 VAD 门控的轮次捕获

```python
def capture_turn(stream, vad, pre_roll_ms=300, silence_ms=500):
    buf, pre, triggered = [], collections.deque(maxlen=pre_roll_ms // 20), False
    silent = 0
    for chunk in stream:
        pre.append(chunk)
        if vad(chunk):
            if not triggered:
                buf = list(pre)
                triggered = True
            buf.append(chunk)
            silent = 0
        elif triggered:
            silent += 20
            buf.append(chunk)
            if silent >= silence_ms:
                return b"".join(buf)
```

### 步骤 3：流式 STT → LLM → TTS

```python
async def turn(audio_bytes):
    transcript = await stt.transcribe(audio_bytes)
    async for token in llm.stream(transcript):
        async for audio in tts.stream(token):
            await speaker.play(audio)
```

### 步骤 4：在 LLM 循环内调用工具

```python
tools = [
    {"name": "get_weather", "parameters": {"location": "string"}},
    {"name": "set_timer", "parameters": {"seconds": "int"}},
]

async for chunk in llm.stream(user_text, tools=tools):
    if chunk.type == "tool_call":
        result = dispatch(chunk.name, chunk.args)
        continue_streaming(result)
    if chunk.type == "text":
        await tts.stream(chunk.text)
```

### 步骤 5：处理中断

```python
tts_task = asyncio.create_task(tts_loop())
while True:
    chunk = await mic.get()
    if vad(chunk):
        tts_task.cancel()
        await speaker.stop()
        await new_turn()
        break
```

## 用于实践

参见 `code/main.py` 中可运行的模拟，它使用桩模型连接全部七个组件，让你无需硬件也能看到流水线形状。真实实现可将桩替换为：

- `silero-vad`（`pip install silero-vad`）
- `deepgram-sdk` 或 `openai-whisper`
- `openai`（`gpt-4o`）或 `anthropic`
- `kokoro` 或 `cartesia`
- 用于 I/O 的 `sounddevice`

## 陷阱

- **永久记录个人身份信息（PII）。** 在大多数司法辖区，完整轮次音频都属于 PII。保存 30 天，并进行静态加密。
- **不支持插话。** 用户一定会打断，助理必须停止说话。
- **TTS 阻塞。** 同步 TTS 会阻塞事件循环。请使用异步方式或单独线程。
- **没有工具调用错误处理。** 工具会失败。LLM 应接收错误、重试一次，然后平稳降级。
- **过度积极的幻觉过滤器。** 过滤过头，助理会反复说“I can't help with that.”；过滤不足，它就什么都敢说。请在留出集上校准。
- **没有唤醒词选项。** 始终监听会带来隐私风险。增加唤醒词门控（Porcupine 或 openWakeWord）。

## 交付成果

保存为 `outputs/skill-voice-assistant-architect.md`。给定预算、规模、语言与合规约束，产出完整技术栈规范。

## 练习

1. **简单。** 运行 `code/main.py`。它会用桩模块模拟一个完整的端到端轮次，并打印各阶段延迟。
2. **中等。** 把 STT 桩替换为真实 Whisper 模型，处理预录制 `.wav`，测量 WER 与端到端延迟。
3. **困难。** 加入工具调用：实现 `get_weather`（任意 API）和 `set_timer`。让 LLM 通过这些工具进行路由，并验证当用户说“set a 5 minute timer”时会触发正确函数，且语音回应进行确认。

## 关键术语

| 术语 | 人们通常怎么说 | 实际含义 |
|------|----------------|----------|
| 轮次（turn） | 一次用户 + 助理往返 | 一段以 VAD 划定边界的用户语音 + 一个 LLM—TTS 回应。 |
| 插话（barge-in） | 中断 | 用户在助理说话时开口，助理停止。 |
| 唤醒词（wake word） | “Hey assistant” | 短关键词检测器；Porcupine、Snowboy、openWakeWord。 |
| 端点检测（end-pointing） | 轮次结束 | VAD + 最短静音，用于判定用户已说完。 |
| 前置缓冲（pre-roll） | 说话前缓冲 | 在 VAD 触发前保留 200–400 ms 音频，避免首词截断。 |
| 工具调用（tool call） | 函数调用 | LLM 输出 JSON；运行时分发；结果送回循环。 |

## 延伸阅读

- [LiveKit——语音智能体快速入门](https://docs.livekit.io/agents/)——生产级参考。
- [Pipecat——语音智能体示例](https://github.com/pipecat-ai/pipecat)——适合自己动手的框架。
- [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)——托管的原生语音路径。
- [Kyutai Moshi](https://github.com/kyutai-labs/moshi)——全双工参考（第 15 课）。
- [Porcupine 唤醒词](https://picovoice.ai/products/porcupine/)——唤醒词门控。
- [Anthropic——工具使用指南](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)——LLM 函数调用。
