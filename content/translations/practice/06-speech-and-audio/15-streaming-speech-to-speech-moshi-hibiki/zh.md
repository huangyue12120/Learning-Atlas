---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/06-speech-and-audio/15-streaming-speech-to-speech-moshi-hibiki/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: e21cb5cde8e5c2f46a027328b5d1eee69ad8231661d78f8b6509803a6dde3802
status: reviewed
---

# 流式语音到语音——Moshi、Hibiki 与全双工对话

> 2024–2026 年重新定义了语音 AI。Moshi 用单个模型以 200 ms 延迟同时倾听和说话；Hibiki 则逐块完成语音到语音翻译。两者都抛弃 ASR → LLM → TTS 流水线，改用基于 Mimi 编解码器词元的统一全双工架构。这是新的参考设计。

**类型：** 学习  
**学习实现：** Python  
**前置课程：** Phase 6 第 13 课（神经音频编解码器）、Phase 6 第 11 课（实时音频）、Phase 7 第 05 课（完整 Transformer）  
**预计时间：** 约 75 分钟

## 问题

每个由第 11 + 12 课构建的语音智能体都有约 300–500 ms 的基本延迟下限：VAD 触发、STT 处理、LLM 推理、TTS 生成。每个阶段都有自己的最小延迟。你可以调整和并行，但流水线形状决定了上限。

Moshi（Kyutai，2024–2026）提出了另一个问题：如果根本没有流水线呢？如果一个模型直接、连续地接收音频并输出音频，而文本只是中间的“内心独白”，不再是必经阶段呢？

答案是**全双工语音到语音（full-duplex speech-to-speech）**。理论延迟为 160 ms（80 ms Mimi 帧 + 80 ms 声学延迟）；在单张 L4 GPU 上的实际延迟为 200 ms。这只有最先进流水线式语音智能体的一半。

## 概念

![Moshi 架构：两条并行 Mimi 流 + 内心独白文本](../assets/moshi-hibiki.svg)

### Moshi 架构

**输入。** 两条 Mimi 编解码器流，均为 12.5 Hz × 8 个码本：

- 流 1：用户音频（经 Mimi 编码，持续到达）
- 流 2：Moshi 自己的音频（由 Moshi 生成）

**Transformer。** 一个 70 亿参数的时间 Transformer 同时处理两条流和一条文本“内心独白”流。在每个 80 ms 步骤中，它：

1. 接收最新的用户 Mimi 词元（8 个码本）。
2. 接收最近的 Moshi Mimi 词元（已生成的 8 个码本）。
3. 生成下一个 Moshi 文本词元（内心独白）。
4. 生成下一组 Moshi Mimi 词元（通过小型深度 Transformer 生成 8 个码本）。

三条流——用户音频、Moshi 音频、Moshi 文本——并行运行。Moshi 可以边说边听；可以在用户打断时自行中断；还可以在不打断主要语句的情况下做反馈回应（“mhm”）。

**深度 Transformer。** 同一帧中的 8 个码本不是并行预测的——它们存在码本间依赖。一个小型两层“深度 Transformer”在 80 ms 内依次预测这些码本。这是自回归编解码器语言模型的标准因子分解（VALL-E、VibeVoice 也使用）。

### 为什么内心独白文本有帮助

没有显式文本时，模型必须在声学流中隐式建模语言。Moshi 的洞察是：强制模型在输出音频的同时输出文本词元。文本流基本就是 Moshi 所说内容的转录。它能改善语义连贯性、便于替换语言模型头，还能免费获得转录文本。

### Hibiki：流式语音到语音翻译

架构相同，但在翻译样本对上训练。源音频持续输入，目标语言音频持续输出。Hibiki-Zero（2026 年 2 月）无需词级对齐训练数据——它使用句子级数据，并通过 GRPO 强化学习优化延迟。

初始支持四个语言对；使用约 1000 小时数据即可适配一种新语言。

### 更广泛的 Kyutai 技术栈（2026）

- **Moshi**——全双工对话（首先支持法语，也很好地支持英语）
- **Hibiki / Hibiki-Zero**——同声语音翻译
- **Kyutai STT**——流式 ASR（500 ms 或 2.5 秒前视）
- **Kyutai Pocket TTS**——可在 CPU 上运行的 1 亿参数 TTS（2026 年 1 月）
- **Unmute**——在公共服务器上组合这些组件的完整流水线

L40S GPU 上的吞吐量：以 3 倍实时速度并发运行 64 个会话。

### Sesame CSM——近亲

Sesame CSM（2025）采用类似思想——Llama-3 主干加 Mimi 编解码器头。但 CSM 是单向的（接收上下文 + 文本，生成语音），而非全双工。它是市场上“声音临场感”最好的 TTS，但与 Moshi 的全双工能力并不完全相同。

### 2026 年性能数据

| 模型 | 延迟 | 用例 | 许可证 |
|------|------|------|--------|
| Moshi | 200 ms（L4） | 全双工英语 / 法语对话 | CC-BY 4.0 |
| Hibiki | 12.5 Hz 帧率 | 法语 ↔ 英语流式翻译 | CC-BY 4.0 |
| Hibiki-Zero | 相同 | 5 个语言对，无需对齐数据 | CC-BY 4.0 |
| Sesame CSM-1B | 首帧时间 200 ms | 上下文条件 TTS | Apache-2.0 |
| GPT-4o Realtime | 约 300 ms | 闭源，OpenAI API | 商业 |
| Gemini 2.5 Live | 约 350 ms | 闭源，Google API | 商业 |

```figure
sp-fullduplex
```

## 动手实现

### 步骤 1：接口

Moshi 提供 WebSocket 服务器，接收 80 ms 的 Mimi 编码音频块，并返回 80 ms 的 Mimi 编码音频块。两个方向持续运行。

```python
import asyncio
import websockets
from moshi.client_utils import encode_audio_mimi, decode_audio_mimi

async def moshi_chat():
    async with websockets.connect("ws://localhost:8998/api/chat") as ws:
        mic_task = asyncio.create_task(stream_mic_to(ws))
        spk_task = asyncio.create_task(stream_from_to_speaker(ws))
        await asyncio.gather(mic_task, spk_task)
```

### 步骤 2：全双工循环

```python
async def stream_mic_to(ws):
    async for chunk_80ms in mic_stream_at_12_5_hz():
        mimi_tokens = encode_audio_mimi(chunk_80ms)
        await ws.send(serialize(mimi_tokens))

async def stream_from_to_speaker(ws):
    async for msg in ws:
        mimi_tokens, text_token = deserialize(msg)
        audio = decode_audio_mimi(mimi_tokens)
        await play(audio)
```

两个方向同时运行。Python asyncio 或 Rust futures 是标准传输方式。

### 步骤 3：训练目标（概念）

对于每个 80 ms 帧 `t`：

- 输入：`user_mimi[0..t]`、`moshi_mimi[0..t-1]`、`moshi_text[0..t-1]`
- 预测：`moshi_text[t]`，然后预测 `moshi_mimi[t, codebook_0..7]`

先预测文本，再预测音频（内心独白）；在深度 Transformer 中，按码本顺序预测音频。

### 步骤 4：Moshi 的优势与不足

Moshi 的优势：

- 在便宜硬件上实现低于 250 ms 的端到端延迟。
- 自然的反馈回应与中断。
- 无需流水线胶水代码。

Moshi 不擅长：

- 工具调用（没有针对此能力训练；需要单独的 LLM 路径）。
- 长链推理（Moshi 是约 80 亿参数的对话模型，不是 Claude/GPT-4）。
- 小众主题的事实准确性。
- 大多数企业生产用例（2026 年仍使用流水线）。

## 用于实践

| 情况 | 选择 |
|------|------|
| 最低延迟的语音伴侣 | Moshi |
| 实时翻译通话 | Hibiki |
| 语音演示 / 研究 | Moshi、CSM |
| 带工具的企业智能体 | 使用流水线（第 12 课），不用 Moshi |
| 上下文中的自定义声音 TTS | Sesame CSM |
| 任意语言的语音到语音 | GPT-4o Realtime 或 Gemini 2.5 Live（商业） |

## 陷阱

- **工具调用有限。** Moshi 是对话模型，不是智能体框架。与流水线结合才能使用工具。
- **特定声音条件控制。** Moshi 使用一个训练好的固定角色；克隆声音需要单独训练。
- **语言覆盖。** 法语 + 英语表现出色，其他语言有限。Hibiki-Zero 有所帮助，但仍需要训练数据。
- **资源成本。** 一个完整 Moshi 会话会占用一个 GPU 槽位，不适合低成本多租户共享部署。

## 交付成果

保存为 `outputs/skill-duplex-pipeline.md`。针对语音智能体负载选择流水线或全双工架构，并说明理由。

## 练习

1. **简单。** 运行 `code/main.py`。它会以符号方式模拟双流 + 内心独白架构。
2. **中等。** 从 Hugging Face 拉取 Moshi，运行服务器并测试一次对话。测量从用户结束说话到 Moshi 开始回应的实际延迟。
3. **困难。** 使用 20 条匹配的测试语句，将第 12 课的流水线智能体与 Moshi 比较 P50 延迟。分析流水线在什么情况下仍具有架构优势。

## 关键术语

| 术语 | 人们通常怎么说 | 实际含义 |
|------|----------------|----------|
| 全双工（full-duplex） | 同时听与说 | 同一模型上同时激活两条音频流。 |
| 内心独白（inner monologue） | 模型的文本流 | Moshi 在输出音频的同时输出文本词元。 |
| 深度 Transformer | 码本间预测器 | 在一个 80 ms 帧内预测 8 个码本的小型 Transformer。 |
| Mimi | Kyutai 的编解码器 | 12.5 Hz × 8 个码本；语义 + 声学；驱动 Moshi。 |
| 流式 S2S | 实时音频 → 音频 | 逐块翻译 / 对话，无流水线阶段。 |
| 反馈回应（back-channeling） | “嗯哼”式回应 | Moshi 能发出简短确认，而不中断自己的轮次。 |

## 延伸阅读

- [Défossez 等（2024）. Moshi——语音—文本基础模型](https://arxiv.org/html/2410.00037v2)——论文。
- [Kyutai Labs（2026）. Hibiki-Zero](https://arxiv.org/abs/2602.12345)——无需对齐数据的流式翻译。
- [Sesame（2025）. Crossing the uncanny valley of voice](https://www.sesame.com/research/crossing_the_uncanny_valley_of_voice)——CSM 规范。
- [Kyutai——Moshi 仓库](https://github.com/kyutai-labs/moshi)——安装与服务器。
- [OpenAI——Realtime API](https://platform.openai.com/docs/guides/realtime)——闭源商业同类产品。
- [Kyutai——Delayed Streams Modeling](https://github.com/kyutai-labs/delayed-streams-modeling)——底层 STT/TTS 框架。
