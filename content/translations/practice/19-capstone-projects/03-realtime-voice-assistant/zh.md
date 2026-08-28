---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/19-capstone-projects/03-realtime-voice-assistant/docs/en.md
  revision: 39ea8a1c6d0b61f071226eff7ede4d4105fed820
  sha256: b35feb343a32c1aa45fe116afc86e243b139a741f3ab93347ce046b0b2d8a5d8
status: reviewed
---

# 毕业项目 03——实时语音助手（从 ASR 到 LLM 再到 TTS）

> 让人觉得自然的语音智能体，端到端延迟要低于 800 ms，知道你什么时候说完，能处理抢话，还能在不让声音卡住的情况下调用工具。到 2026 年，Retell、Vapi、LiveKit Agents 和 Pipecat 都达到了这个标准。它们采用同一种形态：流式 ASR、轮次检测器、流式 LLM 和流式 TTS，全部通过 WebRTC 连接，并在每一跳设置激进的延迟预算。本毕业项目要求你构建其中一个，测量 WER、MOS 和误截断率，并在丢包环境下运行它。

**类型：** 毕业项目
**语言：** Python（智能体 + 流水线）、TypeScript（Web 客户端）
**前置课程：** 第 6 阶段（语音与音频）、第 7 阶段（Transformer）、第 11 阶段（LLM 工程）、第 13 阶段（工具）、第 14 阶段（智能体）、第 17 阶段（基础设施）
**涉及阶段：** P6 · P7 · P11 · P13 · P14 · P17
**用时：** 30 小时

## 问题

语音是 2025–2026 年发展最快的 AI UX 类别。技术上限每个季度都在下降。OpenAI Realtime API、Gemini 2.5 Live、Cartesia Sonic-2、ElevenLabs Flash v3、LiveKit Agents 1.0 和 Pipecat 0.0.70 都让首个音频输出低于 800 ms 变得可及。标准不只是延迟，而是交互感：不打断用户、不被用户打断，从句子中途的打断中恢复，在不让音频停顿的情况下于对话中调用工具，并且能应对移动网络的抖动。

你不能简单拼接三个 REST 调用来达到这个目标。架构从头到尾都是流水线式流式处理。亲自构建后，失败模式会变得清晰：针对电话音频调好的 VAD 在电视背景声上触发，轮次检测器等待永远不会出现的标点，TTS 在发出声音前先缓冲 400 ms。本毕业项目要求你在负载下逐一修复这些问题，并发布延迟与质量报告。

## 概念

流水线有五个流式阶段：**音频输入**（来自浏览器或 PSTN 的 WebRTC）、**ASR**（Deepgram Nova-3 或 faster-whisper 产生流式部分转写）、**轮次检测**（VAD 加一个读取部分转写、寻找完成线索的小型轮次检测模型）、**LLM**（一旦判断轮次完成就立即流式输出词元）、**TTS**（在首个 LLM 词元出现后约 200 ms 内流式输出音频）。

还有三个横切关注点。**抢话（Barge-in）**：用户在智能体说话时开始发言，TTS 取消并立即由 ASR 接管。**工具使用**：对话中的函数调用（天气、日历）必须在旁路上运行，不能让音频停顿；如果延迟超过 300 ms，智能体会预先填充一枚确认词元（“稍等一下……”）。**背压**：丢包时暂存部分转写，VAD 提高语音门限，智能体避免在一条尚未确认的消息上讲话。

测量标准是量化的：在 15 dB SNR 的 Hamming VAD benchmark 上 WER 低于 8%；在 100 通实测电话上首个音频输出 p50 低于 800 ms；误截断率低于 3%；TTS 的 MOS 高于 4.2；单台 g5.xlarge 支持 50 路并发通话。这些数字就是交付物。

## 架构

```text
浏览器 / Twilio PSTN
        |
        v
   WebRTC / SIP 边缘
        |
        v
  LiveKit Agents 1.0（或 Pipecat 0.0.70）
        |
   +----+--------------+--------------+-----------------+
   |                   |              |                 |
   v                   v              v                 v
  ASR              VAD v5         轮次检测器         旁路
（Deepgram         （Silero）       （LiveKit）        工具
 Nova-3 /         语音门          部分转写上的      （天气、
 Whisper-v3）      每 20 ms        完成分数           日历）
   |                   |              |
   +--------+----------+--------------+
            v
        LLM（流式）
     GPT-4o-realtime / Gemini 2.5 Flash /
     级联 Claude Haiku 4.5
            |
            v
        TTS（流式）
     Cartesia Sonic-2 / ElevenLabs Flash v3
            |
            v
     返回给呼叫方的音频
            |
            v
   OpenTelemetry 语音 trace -> Langfuse
```

## 技术栈

- 传输：LiveKit Agents 1.0（WebRTC）加 Twilio PSTN 网关；Pipecat 0.0.70 作为备用框架
- ASR：Deepgram Nova-3（流式，首个部分结果低于 300 ms），或在 GPU 上自托管的 faster-whisper Whisper-v3-turbo
- VAD：Silero VAD v5 加 LiveKit 轮次检测器（读取部分转写的小型 Transformer）
- LLM：紧密集成时使用 OpenAI GPT-4o-realtime，或 Gemini 2.5 Flash Live，或级联 Claude Haiku 4.5（流式补全，独立音频路径）
- TTS：Cartesia Sonic-2（首字节延迟最低）、ElevenLabs Flash v3，或自托管时使用开源 Orpheus
- 工具：用于天气/日历/预订的 FastMCP 旁路；工具耗时超过 300 ms 时由智能体预先发出填充语
- 可观测性：OpenTelemetry 语音 span，带音频回放的 Langfuse 语音 trace
- 部署：单台 g5.xlarge（24 GB VRAM）用于自托管 Whisper + Orpheus；最低延迟使用托管 API

```figure
ce-voice-latency
```

## 动手构建

1. **WebRTC 会话。** 建立一个 LiveKit 房间和一个传输麦克风音频的 Web 客户端。在服务器上连接一个加入该房间的智能体 worker。

2. **流式 ASR。** 将 20 ms 的 PCM 帧送入 Deepgram Nova-3（或 GPU 上的 faster-whisper）。订阅部分和最终转写，并记录每个部分结果的延迟。

3. **VAD 与轮次检测器。** 在帧流上运行 Silero VAD v5。收到语音结束事件后，使用最新的部分转写调用 LiveKit 轮次检测器。只有当 VAD 判定静音持续 500 ms 且轮次检测器的完成分数 > 0.6 时，才确认“轮次完成”。

4. **LLM 流。** 轮次完成后，使用持续的对话和最终转写启动 LLM 调用。把词元流式输出；在首个词元出现时交给 TTS。

5. **TTS 流。** Cartesia Sonic-2 流式返回音频块。首个块必须在首个 LLM 词元出现后的 200 ms 内离开服务器。将块发到 LiveKit 房间，客户端通过 WebRTC 抖动缓冲播放。

6. **抢话。** 当 TTS 正在播放时 VAD 检测到用户的新语音，立即取消 TTS 流，丢弃剩余的 LLM 输出并重新激活 ASR。发布一个 `tts_canceled` span。

7. **工具旁路。** 将天气和日历注册为函数调用工具。调用时并发发起请求；如果 300 ms 内没有完成，让 LLM 发出“稍等一下，让我查一下”这类填充语；工具返回后继续。

8. **评测工作台。** 记录 100 通电话。计算 WER（对照留出转写）、误截断率（用户说到一半时 TTS 被取消的比例）、首个音频输出 p50、TTS MOS（人工或 NISQA），以及抖动/丢包测试（丢弃 3% 的数据包）。

9. **负载测试。** 使用模拟呼叫方在单台 g5.xlarge 上驱动 50 路并发通话。测量持续运行时首个音频输出的 p95。

## 实际使用

```text
caller: "what is the weather in tokyo tomorrow"
[asr  ] partial @280ms: "what is the"
[asr  ] partial @540ms: "what is the weather"
[turn ] completion score 0.82 at @820ms; commit
[llm  ] first token @960ms
[tool ] weather.tokyo tomorrow -> 68/52 partly cloudy @1140ms
[tts  ] first audio-out @1040ms: "Tokyo tomorrow will be partly cloudy..."
turn latency: 1040ms user-stop -> audio-out
```

## 交付

交付物是 `outputs/skill-voice-agent.md`。给定一个领域（客户支持、日程安排或自助终端），它会搭建一个 LiveKit 智能体，并将 ASR/VAD/LLM/TTS 流水线调到测量标准。评分标准如下：

| 权重 | 评判项 | 测量方式 |
|:-:|---|---|
| 25 | 端到端延迟 | 在 100 通录音电话上测量首个音频输出 p50，要求低于 800 ms |
| 20 | 轮次质量 | 在 Hamming VAD benchmark 上误截断率低于 3% |
| 20 | 工具使用正确性 | 对话中的工具调用返回正确数据，且不让音频停顿 |
| 20 | 丢包下的可靠性 | 注入 3% 丢包时的 WER 和轮次稳定性 |
| 15 | 评测工作台完整性 | 使用公开配置进行可复现测量 |
| **100** | | |

## 练习

1. 在 g5.xlarge 上将 Deepgram Nova-3 换成 faster-whisper v3 turbo。测量延迟和 WER 差距，指出 CPU 与 GPU 决策在哪些地方重要。

2. 增加中断仲裁策略：用户在工具调用期间抢话时，智能体该怎么做？比较三种策略（硬取消、完成工具后停止、排队等待下一轮）。

3. 运行对抗性轮次检测测试：让用户在句子中间长时间停顿。调节 VAD 静音阈值和轮次检测器分数阈值，在不超过 900 ms 的前提下把误截断降到最低。

4. 通过 Twilio 将同一个智能体部署到 PSTN。比较 PSTN 与 WebRTC 的首个音频输出，解释抖动缓冲和编解码器差异。

5. 为非英语语言（日语、西班牙语）增加语音活动检测。测量 Silero VAD v5 的误触发率，并与语言专用微调版本比较。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Turn detection | “话语结束” | 给定 VAD 静音和部分转写后，判断用户是否说完的分类器 |
| Barge-in | “中断处理” | VAD 检测到用户新语音时取消正在播放的 TTS |
| First-audio-out | “延迟” | 从用户停止说话到首个音频数据包离开服务器的时间 |
| VAD | “语音门” | 将音频帧分类为语音或静音的模型；Silero VAD v5 是 2026 年默认选择 |
| Jitter buffer | “音频平滑” | 客户端短暂保存数据包、吸收网络波动的缓冲区 |
| Filler | “确认词元” | 工具较慢时智能体发出的短语，用于避免静默 |
| MOS | “平均意见分” | 感知语音质量评分；NISQA 是自动化代理指标 |

## 延伸阅读

- [LiveKit Agents 1.0](https://github.com/livekit/agents)——参考 WebRTC 智能体框架
- [Pipecat](https://github.com/pipecat-ai/pipecat)——备用的 Python-first 流式智能体框架
- [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)——集成式语音模型参考
- [Deepgram Nova-3 文档](https://developers.deepgram.com/docs)——流式 ASR 参考
- [Silero VAD v5](https://github.com/snakers4/silero-vad)——VAD 参考模型
- [Cartesia Sonic-2](https://docs.cartesia.ai)——低延迟 TTS 参考
- [Retell AI 架构](https://docs.retellai.com)——生产语音智能体架构
- [Vapi.ai 生产技术栈](https://docs.vapi.ai)——另一种生产参考
