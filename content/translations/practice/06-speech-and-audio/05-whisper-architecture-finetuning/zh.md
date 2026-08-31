---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/06-speech-and-audio/05-whisper-architecture-finetuning/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 90a39b539e0065af945955829839edeaaa63883fa9b5e21bf15c9b8c7db0efb5
status: reviewed
---

# Whisper——架构与微调

> Whisper 是一个 30 秒窗口的 Transformer 编码器—解码器，在 68 万小时多语言弱监督音频—文本对上训练而成。一种架构可完成多项任务，并在 99 种语言上保持鲁棒。它是 2026 年的参考 ASR。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 6 第 04 课（ASR）、Phase 5 第 10 课（注意力）、Phase 7 第 05 课（完整 Transformer）  
**预计时间：** 约 75 分钟

## 问题

OpenAI 于 2022 年 9 月发布的 Whisper，是第一个成为通用商品的 ASR 模型：传入音频即可得到文本，支持 99 种语言，对噪声鲁棒，而且能在笔记本电脑上运行。到 2024 年，OpenAI 已发布 Large-v3 和 Turbo 变体；到 2026 年，从播客转录、语音助理到 YouTube 字幕，Whisper 都已成为默认基线。

但你不能永远把 Whisper 当作黑盒流水线。领域偏移会让它失效——技术术语、说话人口音、专有名词、短音频和静音都是问题。你需要知道：

1. 它内部究竟是什么。
2. 如何正确地向它提供分块、流式或长音频。
3. 何时微调，以及如何微调。

## 概念

![Whisper 编码器—解码器、任务、分块推理与微调](../assets/whisper.svg)

**架构。** 标准 Transformer 编码器—解码器。

- 输入：30 秒对数梅尔频谱图，80 维梅尔、10 ms 帧移 → 3000 帧。较短音频补零，较长音频分块。
- 编码器：卷积下采样（步幅 2）+ `N` 个 Transformer 块。Large-v3 使用 32 层、1280 维、20 个头。
- 解码器：`N` 个 Transformer 块，其中包含因果自注意力和指向编码器输出的交叉注意力。大小与编码器相同。
- 输出：基于 51,865 个词元词表的 BPE 词元。

Large-v3 有 15.5 亿个参数。Turbo 把解码器从 32 层缩减到 4 层，在 WER 损失不到 1% 的情况下将延迟降低 8 倍。

**提示格式。** Whisper 是一个多任务模型，通过解码器提示中的特殊词元控制：

```text
<|startoftranscript|><|en|><|transcribe|><|notimestamps|> Hello world.<|endoftext|>
```

- `<|en|>`——语言标签；控制翻译与转录行为。
- `<|transcribe|>` 或 `<|translate|>`——分别表示按原文转录，或把任意语言输入翻译为英语输出。
- `<|notimestamps|>`——跳过单词级时间戳，速度更快。

正是这段提示让一个模型能够完成多种任务。把 `<|en|>` 换成 `<|fr|>`，它就会转录法语。

**30 秒窗口。** 所有处理都固定在 30 秒上。更长音频需要分块，更短音频需要填充。窗口原生不支持流式处理，因此出现了 WhisperX、Whisper-Streaming 和 faster-whisper。

**对数梅尔归一化。** `(log_mel - mean) / std`，其中统计量来自 Whisper 自己的训练语料。你*必须*使用 Whisper 的预处理（`whisper.audio.log_mel_spectrogram`），不能使用 `librosa.feature.melspectrogram`。

### 2026 年的变体

| 变体 | 参数量 | 延迟（A100） | WER（LibriSpeech-clean） |
|------|--------|--------------|--------------------------|
| Tiny | 3900 万 | 1× 实时 | 5.4% |
| Base | 7400 万 | 1× | 4.1% |
| Small | 2.44 亿 | 1× | 3.0% |
| Medium | 7.69 亿 | 1× | 2.7% |
| Large-v3 | 15.5 亿 | 2× | 1.8% |
| Large-v3-turbo | 8.09 亿 | 8× | 1.58% |
| Whisper-Streaming（2024） | 15.5 亿 | 流式 | 2.0% |

### 微调 <!-- learning-atlas: fine-tuning -->

2026 年的标准流程：

1. 收集 10–100 小时目标领域音频及其对齐文本。
2. 使用带 `generate_with_loss` 回调的 `transformers.Seq2SeqTrainer`。
3. 参数高效方案：在注意力层的 `q_proj`、`k_proj`、`v_proj` 上应用 LoRA，可将 GPU 内存降至 1/4，WER 代价不到 0.3。
4. 若数据少于 10 小时，就冻结编码器，只微调解码器。
5. 使用 Whisper 自带的分词器与提示格式，绝不要替换分词器。

社区结果：在 20 小时医疗口述数据上微调 Medium，可将医疗词汇的 WER 从 12% 降到 4.5%；在 4 小时冰岛语数据上微调 Turbo，可将 WER 从 18% 降到 6%。

```figure
sp-asr-attention
```

## 动手实现

### 步骤 1：直接运行 Whisper

```python
import whisper
model = whisper.load_model("large-v3-turbo")
result = model.transcribe(
    "clip.wav",
    language="en",
    task="transcribe",
    temperature=0.0,
    condition_on_previous_text=False,  # prevents runaway repetition
)
print(result["text"])
for seg in result["segments"]:
    print(f"[{seg['start']:.2f}–{seg['end']:.2f}] {seg['text']}")
```

始终应该覆盖的关键默认值：`temperature=0.0`（采样默认使用 0.0 → 0.2 → 0.4……的回退链）、`condition_on_previous_text=False`（避免幻觉级联问题），以及 `no_speech_threshold=0.6`（静音检测）。

### 步骤 2：分块处理长音频

```python
# whisperx is the 2026 reference for long-form with word-level timestamps
import whisperx
model = whisperx.load_model("large-v3-turbo", device="cuda", compute_type="float16")
segments = model.transcribe("1hour.mp3", batch_size=16, chunk_size=30)
```

WhisperX 增加了三项能力：(1) Silero VAD 门控；(2) 通过 wav2vec 2.0 做单词级对齐；(3) 通过 `pyannote.audio` 做说话人分离。它是 2026 年生产转录的主力工具。

### 步骤 3：使用 LoRA 微调

```python
from transformers import WhisperForConditionalGeneration, WhisperProcessor
from peft import LoraConfig, get_peft_model

model = WhisperForConditionalGeneration.from_pretrained("openai/whisper-large-v3-turbo")
lora = LoraConfig(
    r=16, lora_alpha=32, target_modules=["q_proj", "v_proj"],
    lora_dropout=0.1, bias="none", task_type="SEQ_2_SEQ_LM",
)
model = get_peft_model(model, lora)
# model.print_trainable_parameters()  -> ~3M trainable / 809M total
```

之后使用标准 Trainer 循环。每 1000 步保存一次检查点，并在留出集上用 WER 评估。

### 步骤 4：检查每一层学到了什么

```python
# Grab cross-attention weights during decode to see what the decoder attends to.
with torch.inference_mode():
    out = model.generate(
        input_features=features,
        return_dict_in_generate=True,
        output_attentions=True,
    )
# out.cross_attentions: layer × head × step × src_len
```

用热力图可视化——你会看到随着解码步骤扫描编码器帧而形成的对角线对齐。那条对角线就是 Whisper 对单词时间戳的表示。

## 用于实践

2026 年的技术栈：

| 情况 | 选择 |
|------|------|
| 通用英语、离线 | 通过 `whisperx` 使用 Large-v3-turbo |
| 移动端 / 边缘端 | int8 量化 Whisper-Tiny 或 Moonshine |
| 多语言长音频 | Large-v3 + `whisperx` + 说话人分离 |
| 低资源语言 | 使用 LoRA 微调 Medium 或 Turbo |
| 流式（2 秒延迟） | Whisper-Streaming 或 Parakeet-TDT |
| 单词级时间戳 | WhisperX（通过 wav2vec 2.0 强制对齐） |

`faster-whisper`（CTranslate2 后端）是 2026 年最快的 CPU + GPU 推理运行时——输出相同，速度比原版快 4 倍。

## 2026 年仍会进入生产环境的陷阱

- **在静音上产生文本幻觉。** Whisper 的训练数据包含字幕，因此会输出“Thanks for watching!”、“Subscribe!”和歌词。调用前务必用 VAD 门控。
- **`condition_on_previous_text` 级联。** 一次幻觉会污染后续窗口。除非需要跨块流畅性，否则将其设为 `False`。
- **短音频填充。** 一段 2 秒音频被填充到 30 秒后，可能在尾部静音中产生幻觉。使用 `pad=False` 或 VAD 门控。
- **错误的梅尔统计量。** 使用 librosa 的梅尔特征而非 Whisper 的特征会产生近似随机的输出。请使用 `whisper.audio.log_mel_spectrogram`。

## 交付成果

保存为 `outputs/skill-whisper-tuner.md`。针对给定领域设计 Whisper 微调或推理流水线。

## 练习

1. **简单。** 运行 `code/main.py`。它会对 Whisper 风格提示进行分词、计算解码形状预算，并打印 10 分钟音频的分块计划。
2. **中等。** 安装 `faster-whisper`，转录一段 10 分钟的播客，并与人工文本比较 WER。尝试 `language="auto"` 和强制 `language="en"`。
3. **困难。** 使用 HF `datasets`，选择一种 Whisper 表现不佳的语言（如乌尔都语），在 2 小时数据上使用 LoRA 微调 Medium 两轮，并报告 WER 变化。

## 关键术语

| 术语 | 人们通常怎么说 | 实际含义 |
|------|----------------|----------|
| 30 秒窗口 | Whisper 的限制 | 硬性输入上限；更长音频需要分块。 |
| SOT | 转录起点 | `<\|startoftranscript\|>` 启动解码器提示。 |
| 时间戳词元 | 时间对齐 | 每个 0.02 秒偏移量都是 5.1 万词表中的一个特殊词元。 |
| Turbo | 快速变体 | 4 层解码器，快 8 倍，WER 回退不到 1%。 |
| WhisperX | 长音频封装 | VAD + Whisper + wav2vec 对齐 + 说话人分离。 |
| LoRA 微调 | 高效微调 | 在注意力中加入低秩适配器；训练约 0.3% 的参数。 |
| 幻觉 | 静默故障 | Whisper 从噪声/静音中生成流畅英语。 |

## 延伸阅读

- [Radford 等（2022）. Whisper 论文](https://arxiv.org/abs/2212.04356)——原始架构与训练配方。
- [OpenAI（2024）. Whisper Large-v3-turbo 发布说明](https://github.com/openai/whisper/discussions/2363)——4 层解码器，8 倍加速。
- [Bain 等（2023）. WhisperX](https://arxiv.org/abs/2303.00747)——长音频、单词对齐与说话人分离。
- [Systran——faster-whisper 仓库](https://github.com/SYSTRAN/faster-whisper)——基于 CTranslate2，速度快 4 倍。
- [Hugging Face——Whisper 微调教程](https://huggingface.co/blog/fine-tune-whisper)——权威的 LoRA / 全量微调实作导览。
