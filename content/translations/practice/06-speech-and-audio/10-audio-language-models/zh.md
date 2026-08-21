---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/06-speech-and-audio/10-audio-language-models/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: ed7987f01dba1440b53561d85648b63bae2396f6b4b0494151e272dfa071e046
status: reviewed
---

# 音频—语言模型——Qwen2.5-Omni、Audio Flamingo 与 GPT-4o Audio

> 2026 年的音频—语言模型能够对语音、环境声和音乐进行推理。Qwen2.5-Omni-7B 在 MMAU-Pro 上与 GPT-4o Audio 相当；Audio Flamingo Next 在 LongAudioBench 上击败 Gemini 2.5 Pro。开源与闭源之间的差距基本消失——多音频任务除外，在那里所有模型都接近随机水平。

**类型：** 学习  
**学习实现：** Python  
**前置课程：** Phase 6 第 04 课（ASR）、Phase 12 第 03 课（视觉—语言模型）、Phase 7 第 10 课（音频 Transformer）  
**预计时间：** 约 45 分钟

## 问题

你有一段 5 秒音频：狗在叫，有人大喊“stop!”，随后陷入安静。可以提出的有用问题跨越多个维度：

- **转录。** “说了什么？”——属于 ASR 范畴。
- **语义推理。** “这个人有危险吗？”——需要联合理解狗叫、喊声和随后的安静。
- **音乐推理。** “哪些乐器在演奏旋律？”
- **长音频检索。** “在这堂 90 分钟的课中，教师在哪里讲解了梯度下降？”

能够用一条提示回答所有这些问题的单一模型，就是**音频—语言模型（audio-language model，LALM / ALM）**。它不同于纯 ASR：LALM 输出自由形式的自然语言答案，而非只有转录文本。

## 概念

![音频—语言模型：音频编码器 + 投影器 + LLM 解码器](../assets/alm-architecture.svg)

### 三组件模板

2026 年的每个 LALM 都有相同骨架：

1. **音频编码器。** Whisper 编码器、BEATs、CLAP、WavLM，或各模型的自定义编码器。
2. **投影器。** 线性层或 MLP，把音频编码器特征桥接到 LLM 的词元嵌入空间。
3. **LLM。** 基于 Llama / Qwen / Gemma 的解码器，接收交错的文本与音频词元，并生成文本。

训练过程：

- **阶段 1。** 冻结编码器与 LLM，只在 ASR / 字幕数据上训练投影器。
- **阶段 2。** 在遵循音频指令的任务（问答、推理、音乐理解）上做全量 / LoRA 微调。
- **阶段 3（可选）。** 加入语音输入 / 语音输出的语音解码器。Qwen2.5-Omni 与 AF3-Chat 采用这种方式。

### 2026 年模型地图

| 模型 | 主干 | 音频编码器 | 输出模态 | 访问方式 |
|------|------|------------|----------|----------|
| Qwen2.5-Omni-7B | Qwen2.5-7B | 自定义 + Whisper | 文本 + 语音 | Apache-2.0 |
| Qwen3-Omni | Qwen3 | 自定义 | 文本 + 语音 | Apache-2.0 |
| Audio Flamingo 3 | Qwen2 | AF-CLAP | 文本 | NVIDIA 非商业许可 |
| Audio Flamingo Next | Qwen2 | AF-CLAP v2 | 文本 | NVIDIA 非商业许可 |
| SALMONN | Vicuna | Whisper + BEATs | 文本 | Apache-2.0 |
| LTU / LTU-AS | Llama | CAV-MAE | 文本 | Apache-2.0 |
| GAMA | Llama | AST + Q-Former | 文本 | Apache-2.0 |
| Gemini 2.5 Flash/Pro（闭源） | Gemini | 专有 | 文本 + 语音 | API |
| GPT-4o Audio（闭源） | GPT-4o | 专有 | 文本 + 语音 | API |

### 基准现实检验（2026）

**MMAU-Pro。** 1800 个问答对，覆盖语音 / 声音 / 音乐 / 混合，并包含多音频子集。

| 模型 | 总体 | 语音 | 声音 | 音乐 | 多音频 |
|------|------|------|------|------|--------|
| Gemini 2.5 Pro | 约 60% | 73.4% | 51.9% | 64.9% | 约 22% |
| Gemini 2.5 Flash | 约 57% | 73.4% | 50.5% | 64.9% | 21.2% |
| GPT-4o Audio | 52.5% | — | — | — | 26.5% |
| Qwen2.5-Omni-7B | 52.2% | 57.4% | 47.6% | 61.5% | 约 20% |
| Audio Flamingo 3 | 约 54% | — | — | — | — |
| Audio Flamingo Next | LongAudioBench 上的 SOTA | — | — | — | — |

**多音频列对所有模型都很难看。** 四选一多项选择题的随机水平为 25%；大多数模型就在这个水平附近。LALM 仍然不擅长比较两个音频片段。

### LALM 在 2026 年的适用场景

- **呼叫中心录音合规审计。** “坐席是否提到了要求的披露内容？”
- **无障碍。** 为听障用户描述声音事件，而不只是转录。
- **内容审核。** 检测暴力语言、威胁语气与背景上下文。
- **播客 / 会议分章。** 生成语义摘要，而非只有说话人轮次。
- **音乐目录分析。** “找出所有 B 段发生转调的曲目。”

### 它们（目前）不适用的场景

- 精细音乐理论（低于和弦层面）。
- 长对话中的说话人归因推理（超过 10 分钟后退化）。
- 多音频比较（22–26% 仅略高于随机水平）。
- 实时流式推理（大多数只能离线批量推理）。

```figure
v4-alm-tokens
```

## 动手实现

### 步骤 1：查询 Qwen2.5-Omni

```python
from transformers import AutoModelForCausalLM, AutoProcessor

processor = AutoProcessor.from_pretrained("Qwen/Qwen2.5-Omni-7B")
model = AutoModelForCausalLM.from_pretrained("Qwen/Qwen2.5-Omni-7B", torch_dtype="auto")

audio, sr = load_wav("clip.wav", sr=16000)
messages = [{
    "role": "user",
    "content": [
        {"type": "audio", "audio": audio},
        {"type": "text", "text": "What sounds do you hear, and what's happening?"},
    ],
}]
inputs = processor.apply_chat_template(messages, tokenize=True, return_tensors="pt")
output = model.generate(**inputs, max_new_tokens=200)
print(processor.decode(output[0], skip_special_tokens=True))
```

### 步骤 2：投影器模式

```python
import torch.nn as nn

class AudioProjector(nn.Module):
    def __init__(self, audio_dim=1280, llm_dim=4096):
        super().__init__()
        self.down = nn.Linear(audio_dim, llm_dim)
        self.act = nn.GELU()
        self.up = nn.Linear(llm_dim, llm_dim)

    def forward(self, audio_features):
        return self.up(self.act(self.down(audio_features)))
```

就是这样。投影器通常只有 1–3 个线性层。在 ASR 样本对（音频 → 转录文本）上训练它，就是阶段 1 的代理任务。

### 步骤 3：评测 MMAU / LongAudioBench

```python
from datasets import load_dataset
mmau = load_dataset("MMAU/MMAU-Pro")

correct = 0
for item in mmau["test"]:
    answer = call_model(item["audio"], item["question"], item["choices"])
    if answer == item["correct_choice"]:
        correct += 1
print(f"Accuracy: {correct / len(mmau['test']):.3f}")
```

分别报告各类别（语音 / 声音 / 音乐 / 多音频）结果。聚合数字会掩盖模型失败的位置。

## 用于实践

| 任务 | 2026 年选择 |
|------|-------------|
| 自由形式音频问答（开源） | Qwen2.5-Omni-7B |
| 开源长音频最佳 | Audio Flamingo Next |
| 闭源最佳 | Gemini 2.5 Pro |
| 语音输入 / 语音输出智能体 | Qwen2.5-Omni 或 GPT-4o Audio |
| 音乐推理 | Audio Flamingo 3 或 2（音乐专用 AF-CLAP） |
| 呼叫中心审计 | 通过 API 使用 Gemini 2.5 Pro，并对政策文档做 RAG |

## 陷阱

- **过度信任多音频能力。** 若任务需要判断“哪个片段包含 X”，必须正视接近随机水平的表现。
- **长音频退化。** 超过 10 分钟后，大多数模型的说话人归因都会失效。应先做说话人分离（第 6 课），再做摘要。
- **静音上的幻觉。** 使用 Whisper 编码器的 LALM 会继承同类问题。请用 VAD 门控。
- **挑选有利基准。** 厂商博客只突出表现最好的类别。请自己运行 MMAU-Pro 的多音频子集。

## 交付成果

保存为 `outputs/skill-alm-picker.md`。针对给定音频理解任务，选择 LALM、基准子集与输出模态（文本或语音）。

## 练习

1. **简单。** 运行 `code/main.py`，查看一个玩具投影器模式，以及把（音频嵌入、文本词元）路由为输出词元的假 LALM。
2. **中等。** 在 100 个 MMAU-Pro 语音条目上评测 Qwen2.5-Omni-7B，并与论文报告的结果比较。
3. **困难。** 构建最小音频字幕基线：BEATs 编码器 + 两层投影器 + 冻结的 Llama-3.2-1B。只在 AudioCaps 上微调投影器，并在 Clotho-AQA 上与 SALMONN 比较。

## 关键术语

| 术语 | 人们通常怎么说 | 实际含义 |
|------|----------------|----------|
| LALM | 音频版 ChatGPT | 音频编码器 + 投影器 + LLM 解码器。 |
| 投影器（projector） | 适配器 | 将音频特征映射到 LLM 嵌入空间的小型 MLP。 |
| MMAU | 基准 | 跨语音、声音与音乐的 1 万个音频问答对。 |
| MMAU-Pro | 更难的 MMAU | 1800 个多音频 / 重推理问题。 |
| LongAudioBench | 长音频评估 | 带语义查询的多分钟音频。 |
| 语音输入 / 语音输出 | 原生语音 | 模型直接接收并输出语音，不绕道文本。 |

## 延伸阅读

- [Chu 等（2024）. Qwen2-Audio](https://arxiv.org/abs/2407.10759)——参考架构。
- [Alibaba（2025）. Qwen2.5-Omni](https://huggingface.co/Qwen/Qwen2.5-Omni-7B)——语音输入、语音输出。
- [NVIDIA（2025）. Audio Flamingo 3](https://arxiv.org/abs/2507.08128)——开源长音频领先者。
- [NVIDIA（2026）. Audio Flamingo Next](https://arxiv.org/abs/2604.10905)——LongAudioBench SOTA。
- [Tang 等（2023）. SALMONN](https://arxiv.org/abs/2310.13289)——双编码器先驱。
- [MMAU-Pro 排行榜](https://mmaubenchmark.github.io/)——2026 年实时排名。
