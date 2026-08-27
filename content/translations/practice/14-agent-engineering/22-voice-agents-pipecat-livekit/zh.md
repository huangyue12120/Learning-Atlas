---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/14-agent-engineering/22-voice-agents-pipecat-livekit/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 514d102d6130a6c3c6682b33e86d7a2e24de4e9240176de6e78403ecc9d8083d
status: reviewed
---

# 语音智能体：Pipecat 与 LiveKit

> 语音智能体在 2026 年是生产中的一等类别。Pipecat 提供基于 Python frame 的管线（VAD → STT → LLM → TTS → transport）。LiveKit Agents 通过 WebRTC 将 AI 模型连接到用户。高端生产技术栈的端到端延迟目标为 450–600ms。

**类型：** 学习
**语言：** Python（标准库）
**前置要求：** 第 14 阶段 · 第 01 节（智能体循环）、第 14 阶段 · 第 12 节（工作流模式）
**用时：** 约 60 分钟

## 学习目标

- 描述 Pipecat 的基于 frame 的管线：DOWNSTREAM（source→sink）和 UPSTREAM（控制）。
- 说出经典语音管线的阶段，以及 Pipecat 支持哪些 transport。
- 解释 LiveKit Agents 的两类语音智能体（MultimodalAgent、VoicePipelineAgent）以及各自适用场景。
- 总结 2026 年生产延迟预期，以及它们如何驱动架构选择。

## 问题所在

语音智能体不是给文本循环外挂 TTS。延迟预算非常苛刻（约 600ms），部分音频是默认形态，轮次检测本身也是一个模型，而 transport 从电话 SIP 到 WebRTC 各不相同。要么构建基于 frame 的管线（Pipecat），要么依赖平台（LiveKit）。

## 核心概念

### Pipecat（pipecat-ai/pipecat）

- 基于 Python frame 的管线框架。
- Frame → FrameProcessor 链。
- 两种流向：
  - **DOWNSTREAM**——source → sink（音频输入、TTS 输出）。
  - **UPSTREAM**——反馈和控制（取消、指标、插话）。
- PipelineTask 通过事件（on_pipeline_started、on_pipeline_finished、on_idle_timeout）和用于指标/追踪/RTVI 的 observer 管理生命周期。

典型管线：

```
VAD (Silero) → STT → LLM (context alternates user/assistant) → TTS → transport
```

Transport 包括：Daily、LiveKit、SmallWebRTCTransport、FastAPI WebSocket、WhatsApp。

Pipecat Flows 增加结构化对话（状态机）。Pipecat Cloud 是托管运行时。

### LiveKit Agents（livekit/agents）

- 通过 WebRTC 将 AI 模型连接到用户。
- 核心概念：Agent、AgentSession、entrypoint、AgentServer。
- 两类语音智能体：
  - **MultimodalAgent**——通过 OpenAI Realtime 或等价服务直接传输音频。
  - **VoicePipelineAgent**——STT → LLM → TTS 级联；提供文本层面的控制。
- 使用 transformer 模型做语义轮次检测。
- 原生 MCP 集成。
- 通过 SIP 提供电话能力。
- 通过 LiveKit Inference 无需 API key 使用 50+ 个模型；通过插件再提供 200+ 个模型。

### 商业平台

Vapi（优化的高端技术栈约 450–600ms）和 Retell（180 次测试通话的端到端约 600ms）都建立在这些方案之上。当你想要托管语音技术栈、却没有 WebRTC 团队时，选择平台。

### 这个模式会在哪里出错

- **没有处理插话。** 用户打断了，但智能体继续说。Pipecat 需要 UPSTREAM cancel frame，LiveKit 有等价机制。
- **忽略 STT 置信度。** 将低置信度 transcript 当作事实输入 LLM。应根据置信度门控，或请求确认。
- **TTS 在句中截断。** 管线在一段话中途取消时，TTS 需要知道这一点，或截断音频。
- **忽略延迟预算。** 每个组件都会增加 50–200ms。发布前先把整条链加总。

### 2026 年典型延迟

- VAD：20–60ms
- STT partial：100–250ms
- LLM 首 token：150–400ms
- TTS 首段音频：100–200ms
- Transport RTT：30–80ms

端到端 450–600ms 属于高端水平；800–1200ms 很常见；超过 1500ms 就会感觉系统坏了。

```figure
voice-pipeline
```

## 动手构建

code/main.py 是一个基于 frame 的玩具管线，包含：

- Frame 类型（audio、transcript、text、tts_audio、control）。
- 带 process(frame) 的 Processor 接口。
- 一个五阶段管线（VAD → STT → LLM → TTS → transport），由脚本化 processor 组成。
- 用于演示插话的 UPSTREAM cancel frame。

运行：

```
python3 code/main.py
```

轨迹展示正常流动，以及在一句话中途停止 TTS 的插话取消。

## 实际使用

- **Pipecat** 用于完全控制——自定义 processor、Python-first、可插拔提供方。
- **LiveKit Agents** 用于 WebRTC-first 部署和电话。
- **Vapi / Retell** 用于没有 WebRTC 团队时的托管语音智能体。
- **OpenAI Realtime / Gemini Live** 用于直接音频输入/输出（MultimodalAgent）。

## 交付

outputs/skill-voice-pipeline.md 会搭建形状类似 Pipecat 的语音管线：VAD + STT + LLM + TTS + transport，并处理插话。

## 练习

1. 为玩具管线增加指标 observer：统计每秒每个阶段的 frame 数。延迟积累在哪里？
2. 实现置信度门控的 STT：低于阈值时请求“可以请你再说一遍吗？”
3. 增加语义轮次检测：简单规则——如果 transcript 以“？”结尾，就结束轮次。
4. 阅读 Pipecat 的 transport 文档。将标准库 transport 替换为 SmallWebRTCTransport 配置（stub）。
5. 对同一查询测量 OpenAI Realtime 与 STT+LLM+TTS 级联。文本层控制带来了多少延迟成本？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| Frame | “事件” | 管线中的类型化数据单元（音频、transcript、文本、控制） |
| Processor | “管线阶段” | 带 process(frame) 的处理器 |
| DOWNSTREAM | “向前流” | 从 source 到 sink：音频输入、语音输出 |
| UPSTREAM | “反馈流” | 控制：取消、指标、插话 |
| VAD | “语音活动检测” | 检测用户何时在说话 |
| Semantic turn detection | “智能结束轮次” | 基于模型决定用户是否说完 |
| MultimodalAgent | “直接音频智能体” | 音频输入、音频输出；中间没有文本 |
| VoicePipelineAgent | “级联智能体” | STT + LLM + TTS；文本层控制 |

## 延伸阅读

- [Pipecat 文档](https://docs.pipecat.ai/getting-started/introduction)——基于 frame 的管线、processor、transport
- [LiveKit Agents 文档](https://docs.livekit.io/agents/)——WebRTC + 语音原语
- [Vapi](https://vapi.ai/)——托管语音平台
- [Retell AI](https://www.retellai.com/)——经过延迟基准测试的托管语音
