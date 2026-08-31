---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/06-speech-and-audio/04-speech-recognition-asr/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 8636c6f5f698e085af96b807aff2733d606e41728a174fe1b80e31508c02f721
status: reviewed
---

# 语音识别（ASR）——CTC、RNN-T 与注意力

> 语音识别是在每个时间步进行音频分类，再由一个理解语言和静音的序列模型把结果粘合起来。CTC、RNN-T 和注意力是实现它的三种方式。请选择一种，并理解原因。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 6 第 02 课（频谱图与梅尔）、Phase 5 第 08 课（用于文本的 CNN 与 RNN）、Phase 5 第 10 课（注意力）  
**预计时间：** 约 45 分钟

## 问题

你有一段 16 kHz、10 秒的音频，想得到字符串：“turn on the kitchen lights”。挑战在于结构：音频帧与字符并非一一对齐。单词 “okay” 可能持续 200 ms，也可能持续 1200 ms；静音把语句分隔开；不同音素的长度各不相同；输出词元数也无法预先确定。

三种问题建模方式可以解决这一点：

1. **CTC（连接时序分类，Connectionist Temporal Classification）。** 每帧输出词元概率，其中包括一个特殊的*空白（blank）*。解码时合并重复词元并移除空白。非自回归，速度快。wav2vec 2.0、MMS 使用该方法。
2. **RNN-T（循环神经网络转导器，Recurrent Neural Network Transducer）。** 联合网络根据编码器帧和先前词元预测下一词元。支持流式处理。Google 端侧 ASR、NVIDIA Parakeet 使用该方法。
3. **注意力编码器—解码器。** 编码器把音频压缩成隐藏状态，解码器通过交叉注意力自回归生成词元。Whisper、SeamlessM4T 使用该方法。

到 2026 年，LibriSpeech test-clean 上的 SOTA WER 为 1.4%（NVIDIA Parakeet-TDT-1.1B）和 1.58%（Whisper-Large-v3-turbo）。质量差异很小，部署差异却非常大。

## 概念 <!-- learning-atlas: the-concept -->

![ASR 的三种建模方式：CTC、RNN-T 与注意力编码器—解码器](../assets/asr-formulations.svg)

**CTC 直觉。** 假设编码器输出 `T` 个帧级分布，覆盖 `V+1` 个词元（V 个字符 + 空白）。对于长度为 `U < T` 的目标字符串 `y`，任何折叠后得到 `y` 的帧对齐都算有效。CTC 损失对所有这类对齐求和。推理过程是：逐帧取 argmax、合并重复项、移除空白。

优点：非自回归、可流式处理、无需前视。缺点：*条件独立假设*——每一帧的预测相互独立，因此内部没有语言模型。可以在束搜索中通过外部 LM 或浅融合修复。

**RNN-T 直觉。** 它增加一个嵌入词元历史的*预测器（predictor）*网络，以及一个把预测器状态与编码器帧结合成 `V+1` 联合分布的*联合器（joiner）*；其中 `+1` 表示空值/不发射。它显式建模了 CTC 忽略的条件依赖。由于每一步只依赖过去的帧和词元，因此支持流式处理。

优点：可流式处理 + 内部 LM。缺点：训练更复杂、更占内存（三维损失格点）；RNN-T 损失内核本身已经形成了一个完整的库类别。

**注意力编码器—解码器。** 编码器（6–32 个 Transformer 层）处理对数梅尔帧；解码器（6–32 个 Transformer 层）通过交叉注意力读取编码器输出，并自回归生成词元。它没有对齐约束——注意力可以查看音频中的任何位置。除非限制注意力，否则无法流式处理（如 2024 年的分块 Whisper-Streaming）。

优点：离线 ASR 质量最高，使用标准 seq2seq 工具即可轻松训练。缺点：自回归延迟与输出长度成正比；不做额外工程就无法流式处理。

### WER：唯一的核心数字

**词错误率（Word Error Rate）** = `(S + D + I) / N`，其中 S = 替换数，D = 删除数，I = 插入数，N = 参考文本的单词数。它等价于单词层面的 Levenshtein 编辑距离，越低越好。WER 高于 20% 通常不可用；对朗读语音而言，低于 5% 可视为达到人类水平。标准基准上的 2026 年数据如下：

| 模型 | LibriSpeech test-clean | LibriSpeech test-other | 大小 |
|------|------------------------|------------------------|------|
| Parakeet-TDT-1.1B | 1.40% | 2.78% | 11 亿参数 |
| Whisper-Large-v3-turbo | 1.58% | 3.03% | 8.09 亿 |
| Canary-1B Flash | 1.48% | 2.87% | 10 亿 |
| Seamless M4T v2 | 1.7% | 3.5% | 23 亿 |

这些模型全都基于编码器—解码器或 RNN-T。纯 CTC 系统（wav2vec 2.0）在 test-clean 上约为 1.8–2.1%。

```figure
ctc-collapse
```

## 动手实现

### 步骤 1：CTC 贪心解码

```python
def ctc_greedy(frame_logits, blank=0, vocab=None):
    # frame_logits: list of per-frame probability vectors
    preds = [max(range(len(p)), key=lambda i: p[i]) for p in frame_logits]
    out = []
    prev = -1
    for p in preds:
        if p != prev and p != blank:
            out.append(p)
        prev = p
    return "".join(vocab[i] for i in out) if vocab else out
```

两条规则：合并连续重复项，移除空白。例如：`a a _ _ a b b _ c` → `a a b c`。

### 步骤 2：CTC 束搜索

```python
def ctc_beam(frame_logits, beam=8, blank=0):
    import math
    beams = [([], 0.0)]  # (tokens, log_prob)
    for p in frame_logits:
        log_p = [math.log(max(pi, 1e-10)) for pi in p]
        candidates = []
        for seq, lp in beams:
            for t, lpt in enumerate(log_p):
                new = seq[:] if t == blank else (seq + [t] if not seq or seq[-1] != t else seq)
                candidates.append((new, lp + lpt))
        candidates.sort(key=lambda x: -x[1])
        beams = candidates[:beam]
    return beams[0][0]
```

生产环境使用带 LM 融合的前缀树束搜索；这里展示的是概念骨架。

### 步骤 3：WER

```python
def wer(ref, hyp):
    r, h = ref.split(), hyp.split()
    dp = [[0] * (len(h) + 1) for _ in range(len(r) + 1)]
    for i in range(len(r) + 1):
        dp[i][0] = i
    for j in range(len(h) + 1):
        dp[0][j] = j
    for i in range(1, len(r) + 1):
        for j in range(1, len(h) + 1):
            cost = 0 if r[i - 1] == h[j - 1] else 1
            dp[i][j] = min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost,
            )
    return dp[len(r)][len(h)] / max(1, len(r))
```

### 步骤 4：用 Whisper 做推理

```python
import whisper
model = whisper.load_model("large-v3-turbo")
result = model.transcribe("clip.wav")
print(result["text"])
```

只需一行即可使用 2026 年最强的通用 ASR。在 24 GB GPU 上可达到约 20 倍实时速度。

### 步骤 5：使用 Parakeet 或 wav2vec 2.0 流式处理

```python
from transformers import pipeline
asr = pipeline("automatic-speech-recognition", model="nvidia/parakeet-tdt-1.1b")
for chunk in streaming_audio():
    print(asr(chunk, return_timestamps=True))
```

流式 ASR 需要分块编码器注意力和跨块状态；应使用提供支持的库（Parakeet 使用 NeMo，`transformers` 流水线使用 `chunk_length_s`）。

## 用于实践

2026 年的技术栈：

| 情况 | 选择 |
|------|------|
| 英语、离线、追求最高质量 | Whisper-large-v3-turbo |
| 多语言、鲁棒性优先 | SeamlessM4T v2 |
| 流式、低延迟 | Parakeet-TDT-1.1B 或 Riva |
| 边缘端、移动端、延迟 <500 ms | 量化 Whisper-Tiny 或 Moonshine（2024） |
| 长音频 | Whisper + 基于 VAD 的分块（WhisperX） |
| 特定领域（医疗、法律） | 微调 wav2vec 2.0 + 领域 LM 融合 |

## 2026 年仍会进入生产环境的陷阱

- **没有 VAD。** 在静音上运行 Whisper 会产生幻觉（“Thanks for watching!”）。调用前务必用 VAD 门控。
- **字符、单词与子词 WER 混淆。** 在归一化之后（转小写、移除标点）报告单词级 WER。
- **语言识别漂移。** Whisper 自动 LID 可能把嘈杂音频错误路由到日语或威尔士语；确定语言时，应强制设置 `language="en"`。
- **长音频不分块。** Whisper 的窗口为 30 秒。对更长音频使用 `chunk_length_s=30, stride=5`。

## 交付成果

保存为 `outputs/skill-asr-picker.md`。针对给定部署目标选择模型、解码策略、分块方式与 LM 融合。

## 练习

1. **简单。** 运行 `code/main.py`。它会对手工构造的 CTC 输出做贪心解码，并计算相对于参考文本的 WER。
2. **中等。** 正确实现步骤 2 的前缀树束搜索（考虑空白合并规则）。在一个包含 10 个样本的合成数据集上与贪心解码比较。
3. **困难。** 在 [LibriSpeech test-clean](https://www.openslr.org/12) 上使用 `whisper-large-v3-turbo`，计算前 100 条语句的 WER，并与公开数据比较。

## 关键术语

| 术语 | 人们通常怎么说 | 实际含义 |
|------|----------------|----------|
| CTC | 空白词元损失 | 对所有帧到词元对齐求边缘概率；非自回归。 |
| RNN-T | 流式损失 | CTC + 下一词元预测器；可以处理词序。 |
| 注意力编码器—解码器 | Whisper 风格 | 编码器 + 交叉注意力解码器；离线质量最佳。 |
| WER | 需要报告的数字 | 单词层面的 `(S+D+I)/N`。 |
| 空白（blank） | 空无 | CTC 中表示“本帧不发射任何词元”的特殊词元。 |
| LM 融合 | 外部语言模型 | 束搜索时加入加权的 LM 对数概率。 |
| VAD | 静音门控 | 语音活动检测器；裁掉非语音部分。 |

## 延伸阅读

- [Graves 等（2006）. Connectionist Temporal Classification](https://www.cs.toronto.edu/~graves/icml_2006.pdf)——CTC 论文。
- [Graves（2012）. Sequence Transduction with RNNs](https://arxiv.org/abs/1211.3711)——RNN-T 论文。
- [Radford 等 / OpenAI（2022）. Whisper: Robust Speech Recognition via Large-Scale Weak Supervision](https://arxiv.org/abs/2212.04356)——2022 年的权威论文；v3-turbo 于 2024 年扩展。
- [NVIDIA NeMo——Parakeet-TDT 模型卡](https://huggingface.co/nvidia/parakeet-tdt-1.1b)——2026 年开放 ASR 排行榜领先者。
- [Hugging Face——开放 ASR 排行榜](https://huggingface.co/spaces/hf-audio/open_asr_leaderboard)——涵盖 25 个以上模型的实时基准。
