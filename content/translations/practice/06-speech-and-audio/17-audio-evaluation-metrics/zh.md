---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/06-speech-and-audio/17-audio-evaluation-metrics/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: ac206830044a3d8baf1d99de9a7d56080d08662b3607a329f1164ea7a768a6b7
status: reviewed
---

# 音频评估——WER、MOS、UTMOS、MMAU、FAD 与开放排行榜

> 无法测量，就无法交付。本课列出 2026 年各类音频任务的指标：ASR（WER、CER、RTFx）、TTS（MOS、UTMOS、SECS、ASR 往返 WER）、音频—语言（MMAU、LongAudioBench）、音乐（FAD、CLAP）以及说话人任务（EER），并介绍用于比较的排行榜。

**类型：** 学习  
**学习实现：** Python  
**前置课程：** Phase 6 第 04、06、07、09、10 课；Phase 2 第 09 课（模型评估）  
**预计时间：** 约 60 分钟

## 问题

每种音频任务都有多个指标，每个指标测量不同维度。选错指标，就会交付一个在仪表盘上看起来很棒、在生产环境中表现糟糕的模型。2026 年的标准清单如下：

| 任务 | 主要指标 | 次要指标 |
|------|----------|----------|
| ASR | WER | CER · RTFx · 首词元延迟 |
| TTS | MOS / UTMOS | SECS · ASR 往返 WER · CER · TTFA |
| 语音克隆 | SECS（ECAPA 余弦） | MOS · CER |
| 说话人验证 | EER | minDCF · 工作点上的 FAR / FRR |
| 说话人分离 | DER | JER · 说话人混淆 |
| 音频分类 | top-1 · mAP | 宏平均 F1 · 各类别召回率 |
| 音乐生成 | FAD | CLAP · 听评小组 MOS |
| 音频语言模型 | MMAU-Pro | LongAudioBench · AudioCaps FENSE |
| 流式 S2S | 延迟 P50/P95 | WER · MOS |

## 概念

![音频评估矩阵——指标、任务与 2026 年排行榜](../assets/eval-landscape.svg)

### ASR 指标

**WER（词错误率）。** `(S + D + I) / N`。评分前转为小写、移除标点、归一化数字。使用 `jiwer` 或 OpenAI 的 `whisper_normalizer`。对朗读语音而言，&lt; 5% = 人类水平。

**CER（字符错误率）。** 公式相同，但在字符层面计算。用于词语切分存在歧义的声调语言（普通话、粤语）。

**RTFx（实时因子的倒数）。** 每个实际时钟秒内处理的音频秒数，越高越好。Parakeet-TDT 可达 3380×，Whisper-large-v3 约为 30×。

**首词元延迟。** 从输入音频到首个转录词元的实际时钟时间。对流式系统至关重要。Deepgram Nova-3 约为 150 ms。

### TTS 指标

**MOS（平均意见分）。** 人类给出的 1–5 分。它是金标准，但速度慢。每个样本收集 20 位以上听众评分，每个模型使用 100 个以上样本。

**UTMOS（2022–2026）。** 学习得到的 MOS 预测器。在标准基准上与人类 MOS 的相关性约为 0.9。F5-TTS 的 UTMOS 为 3.95，真实音频为 4.08。

**SECS（说话人编码器余弦相似度）。** 用于语音克隆。计算参考音频与克隆输出的 ECAPA 嵌入余弦。&gt; 0.75 表示能够识别出克隆声音。

**ASR 往返 WER。** 用 Whisper 识别 TTS 输出，再计算相对于输入文本的 WER，用于捕获可懂度回归。2026 年 SOTA：CER &lt; 2%。

**TTFA（首段音频时间，time-to-first-audio）。** 实际时钟延迟。Kokoro-82M 约为 100 ms，F5-TTS 约为 1 秒。

### 语音克隆专用指标

以 **SECS + MOS + CER** 三项组合使用。SECS 高而 MOS 低，表示音色正确但不自然；反过来则表示声音自然，却不是目标说话人。

### 说话人验证

**EER（等错误率）。** 错误接受率等于错误拒绝率时的阈值。ECAPA 在 VoxCeleb1-O 上为 0.87%。

**minDCF（最小检测成本）。** 选定工作点（常取 FAR=0.01）上的加权成本，比 EER 更贴近生产。

### 说话人分离

**DER（说话人分离错误率）。** `(FA + Miss + Confusion) / total_speaker_time`。漏检语音 + 误报语音 + 说话人混淆，分别按比例计算。在 AMI 会议上，10–20% DER 是现实水平；pyannote 3.1 + 商业 Precision-2 在录音良好的音频上可达到 &lt;10% DER。

**JER（Jaccard 错误率）。** DER 的替代指标，对短片段偏差更鲁棒。

### 音频分类

多标签：在所有类别上计算 **mAP（平均精度均值）**。BEATs-iter3 在 AudioSet 上达到 0.548 mAP。

互斥多分类：**top-1、top-5 准确率**。Audio-MAE 在 Speech Commands v2 上达到 99.0% top-1。

不平衡数据：**宏平均 F1** + **各类别召回率**。要按类别报告——聚合准确率会掩盖哪些类别失败。

### 音乐生成

**FAD（弗雷歇音频距离）。** 真实音频与生成音频的 VGGish 嵌入分布之间的距离。MusicGen-small 在 MusicCaps 上为 4.5，MusicLM 为 4.0，越低越好。

**CLAP 分数。** 使用 CLAP 嵌入得到的文本—音频对齐分数。&gt; 0.3 表示对齐尚可。

**听评小组 MOS。** 对消费级音乐而言，它仍是最终判据。Suno v5 在 TTS Arena 上的 ELO 为 1293（来自成对人类偏好）。

### 音频—语言基准

**MMAU（大规模多音频理解，Massive Multi-Audio Understanding）。** 1 万个音频问答对。

**MMAU-Pro。** 1800 个困难条目，分为四类：语音 / 声音 / 音乐 / 多音频。四选一的随机水平为 25%。Gemini 2.5 Pro 总体约 60%；所有模型的多音频结果约为 22%。

**LongAudioBench。** 带语义查询的多分钟音频。Audio Flamingo Next 击败 Gemini 2.5 Pro。

**AudioCaps / Clotho。** 字幕基准，使用 SPICE、CIDEr、FENSE 指标。

### 流式语音到语音

**延迟 P50 / P95 / P99。** 从用户结束说话到出现第一段可听回应的实际时钟时间。Moshi 为 200 ms，GPT-4o Realtime 为 300 ms。

输出上的 **WER / MOS**。

**插话响应速度。** 从用户打断到助理静音的时间，目标为 &lt; 150 ms。

### 2026 年排行榜

| 排行榜 | 赛道 | URL |
|--------|------|-----|
| Open ASR Leaderboard（HF） | 英语 + 多语言 + 长音频 | `huggingface.co/spaces/hf-audio/open_asr_leaderboard` |
| TTS Arena（HF） | 英语 TTS | `huggingface.co/spaces/TTS-AGI/TTS-Arena` |
| Artificial Analysis Speech | TTS + STT，来自成对投票的 ELO | `artificialanalysis.ai/speech` |
| MMAU-Pro | LALM 推理 | `mmaubenchmark.github.io` |
| SpeakerBench / VoxSRC | 说话人识别 | `voxsrc.github.io` |
| MMAU 音乐子集 | 音乐 LALM | （MMAU 内） |
| HEAR benchmark | 自监督音频 | `hearbenchmark.com` |

```figure
sp-wer-align
```

## 动手实现

### 步骤 1：带归一化的 WER

```python
from jiwer import wer, Compose, ToLowerCase, RemovePunctuation, Strip

transform = Compose([ToLowerCase(), RemovePunctuation(), Strip()])
score = wer(
    truth="Please turn on the lights.",
    hypothesis="please turn on the light",
    truth_transform=transform,
    hypothesis_transform=transform,
)
# ~0.17
```

### 步骤 2：TTS 往返 WER

```python
def ttr_wer(tts_model, asr_model, texts):
    errors = []
    for txt in texts:
        audio = tts_model.synthesize(txt)
        recog = asr_model.transcribe(audio)
        errors.append(wer(truth=txt, hypothesis=recog))
    return sum(errors) / len(errors)
```

### 步骤 3：语音克隆的 SECS

```python
from speechbrain.inference.speaker import EncoderClassifier
sv = EncoderClassifier.from_hparams("speechbrain/spkrec-ecapa-voxceleb")

emb_ref = sv.encode_batch(load_wav("reference.wav"))
emb_clone = sv.encode_batch(load_wav("cloned.wav"))
secs = torch.nn.functional.cosine_similarity(emb_ref, emb_clone, dim=-1).item()
```

### 步骤 4：音乐生成的 FAD

```python
from frechet_audio_distance import FrechetAudioDistance
fad = FrechetAudioDistance()
score = fad.get_fad_score("generated_folder/", "reference_folder/")
```

### 步骤 5：说话人验证的 EER（与第 6 课代码相同）

```python
def eer(same_scores, diff_scores):
    thresholds = sorted(set(same_scores + diff_scores))
    best = (1.0, 0.0)
    for t in thresholds:
        far = sum(1 for s in diff_scores if s >= t) / len(diff_scores)
        frr = sum(1 for s in same_scores if s < t) / len(same_scores)
        if abs(far - frr) < best[0]:
            best = (abs(far - frr), (far + frr) / 2)
    return best[1]
```

## 用于实践

每次部署都应配备固定的评估工具，并在每次模型更新时运行。三条基本规则：

1. **评分前归一化。** 转小写、移除标点、展开数字。报告归一化规则。
2. **报告分布，而非平均值。** 延迟报告 P50/P95/P99；分类报告各类别召回率；MMAU 报告各类别结果。
3. **运行一个标准公开基准。** 即使生产数据不同，报告 Open ASR / TTS Arena / MMAU 结果也能让评审者进行同口径比较。

## 陷阱

- **UTMOS 外推。** 它在 VCTK 风格干净语音上训练，对嘈杂 / 克隆 / 情绪音频评分不佳。
- **MOS 小组偏差。** 20 位 Amazon Mechanical Turk 工作者不等于 20 位目标用户。高风险场景应付费组建领域听评小组。
- **FAD 依赖参考集。** 比较模型时，必须使用相同的参考分布。
- **聚合 WER。** 总体 5% WER 可能掩盖口音语音上的 30% WER。应按人口统计切片报告。
- **公开基准饱和。** 大多数前沿模型在标准基准上已接近上限。请构建反映实际流量的内部留出集。

## 交付成果

保存为 `outputs/skill-audio-evaluator.md`。为任意音频模型发布选择指标、基准与报告格式。

## 练习

1. **简单。** 运行 `code/main.py`。在玩具输入上计算 WER / CER / EER / SECS / 类 FAD / 类 MMAU 指标。
2. **中等。** 构建 TTS 往返 WER 工具，把 Kokoro 或 F5-TTS 输出送入 Whisper，在 50 条提示上计算 WER，并标记 WER &gt; 10% 的提示。
3. **困难。** 在 MMAU-Pro 的语音与多音频子集上评测第 10 课选择的 LALM（各 50 条）。报告各类别准确率，并与公开数字比较。

## 关键术语

| 术语 | 人们通常怎么说 | 实际含义 |
|------|----------------|----------|
| WER | ASR 分数 | 归一化后单词层面的 `(S+D+I)/N`。 |
| CER | 字符 WER | 用于声调语言或字符级系统。 |
| MOS | 人类意见 | 1–5 分；20 位以上听众 × 100 个样本。 |
| UTMOS | 机器学习 MOS 预测器 | 学习得到的模型；与人类 MOS 约有 0.9 相关性。 |
| SECS | 语音克隆相似度 | 参考音频与克隆音频之间的 ECAPA 余弦。 |
| EER | 说话人验证分数 | FAR = FRR 时的阈值。 |
| DER | 说话人分离分数 |（FA + Miss + Confusion）/ 总时长。 |
| FAD | 音乐生成质量 | VGGish 嵌入上的弗雷歇距离。 |
| RTFx | 吞吐量 | 每个实际时钟秒处理的音频秒数。 |

## 延伸阅读

- [jiwer](https://github.com/jitsi/jiwer)——带归一化工具的 WER/CER 库。
- [UTMOS（Saeki 等，2022）](https://arxiv.org/abs/2204.02152)——学习得到的 MOS 预测器。
- [弗雷歇音频距离（Kilgour 等，2019）](https://arxiv.org/abs/1812.08466)——音乐生成标准。
- [开放 ASR 排行榜](https://huggingface.co/spaces/hf-audio/open_asr_leaderboard)——2026 年实时排名。
- [TTS Arena](https://huggingface.co/spaces/TTS-AGI/TTS-Arena)——人类投票的 TTS 排行榜。
- [MMAU-Pro 基准](https://mmaubenchmark.github.io/)——LALM 推理排行榜。
- [HEAR 基准](https://hearbenchmark.com/)——音频 SSL 基准。
