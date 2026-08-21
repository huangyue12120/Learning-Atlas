---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/06-speech-and-audio/08-voice-cloning-conversion/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: dc41114b9bfa5d8fdc151f0efebe947230683806c1d2f888031a457c9bb8a480
status: reviewed
---

# 语音克隆与语音转换

> 语音克隆用他人的声音朗读你的文本；语音转换则在保留所说内容的同时，把你的声音改写成他人的声音。两者都依赖同一种分解：将说话人身份与内容分离。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 6 第 06 课（说话人识别）、Phase 6 第 07 课（TTS）  
**预计时间：** 约 75 分钟

## 问题

到 2026 年，只需一段 5 秒音频和一张消费级 GPU，就能高质量克隆任何人的声音。ElevenLabs、F5-TTS、OpenVoice v2、VoiceBox 都提供零样本或少样本克隆。这项技术既是福音（无障碍 TTS、配音、辅助声音），也是武器（诈骗电话、政治深度伪造、知识产权盗窃）。

两个密切相关的任务：

- **语音克隆（TTS 侧）：** 文本 + 5 秒参考声音 → 使用该声音生成的音频。
- **语音转换（语音侧）：** 源音频（A 说了 X）+ B 的参考声音 → B 说 X 的音频。

两者都会将波形分解为（内容、说话人、韵律），再把一个来源的内容与另一个来源的说话人重新组合。

2026 年交付时面临的关键约束：**欧盟（《人工智能法案》，2026 年 8 月起执行）和加利福尼亚州（AB 2905，2025 年生效）都在法律上要求水印和同意门控**。流水线必须输出不可听见的水印，并拒绝未经同意的克隆。

## 概念

![语音克隆与转换：分解、交换说话人、重新组合](../assets/voice-cloning.svg)

**零样本克隆。** 把一段 5 秒音频传给一个已在数千位说话人数据上训练的模型。说话人编码器把音频映射为说话人嵌入；TTS 解码器同时以该嵌入和文本为条件。

采用者包括：F5-TTS（2024）、YourTTS（2022）、XTTS v2（2024）、OpenVoice v2（2024）。

**少样本微调。** 录制目标声音 5–30 分钟，使用 LoRA 微调基础模型约一小时，质量便会从“还行”跃升到“难以分辨”。Coqui 和 ElevenLabs 都支持该模式，社区也常将它用于 F5-TTS。

**语音转换（VC）。** 分为两大类：

- **识别—合成。** 运行类似 ASR 的模型提取内容表示（例如软音素后验概率、PPG），再使用目标说话人嵌入重新合成。对语言和口音鲁棒。KNN-VC（2023）、Diff-HierVC（2023）使用这种方法。
- **解耦。** 训练一个自动编码器，在瓶颈处的潜在空间中分离内容、说话人与韵律，推理时交换说话人嵌入。质量较低但速度更快。AutoVC（2019）、VITS-VC 变体使用这种方法。

**基于神经编解码器的克隆（2024+）。** VALL-E、VALL-E 2、NaturalSpeech 3、VoiceBox 把音频视为来自 SoundStream / EnCodec 的离散词元，并在编解码器词元上训练大型自回归或流匹配模型。短提示上的质量可与 ElevenLabs 相比。

### 伦理不是附加组件

**水印。** PerTh（Perth）和 SilentCipher（2024）把约 16–32 位 ID 以不可感知的方式嵌入音频。水印能经受重新编码、流媒体传输和常见编辑，且有可用于生产的开源实现。

**同意门控。** 每段克隆输出都必须关联可验证的同意记录。“我，Rohit，于 2026-04-22 授权将此声音用于 X 用途。”请把记录存入防篡改日志。

**检测。** AASIST、RawNet2 和 Wav2Vec2-AASIST 可直接用作检测器。ASVspoof 2025 挑战赛发布的结果显示，最先进检测器针对 ElevenLabs、VALL-E 2 和 Bark 输出的 EER 为 0.8–2.3%。

### 数据（2026）

| 模型 | 零样本？ | SECS（目标相似度） | WER（可懂度） | 参数量 |
|------|----------|--------------------|---------------|--------|
| F5-TTS | 是 | 0.72 | 2.1% | 3.35 亿 |
| XTTS v2 | 是 | 0.65 | 3.5% | 4.70 亿 |
| OpenVoice v2 | 是 | 0.70 | 2.8% | 2.20 亿 |
| VALL-E 2 | 是 | 0.77 | 2.4% | 3.70 亿 |
| VoiceBox | 是 | 0.78 | 2.1% | 3.30 亿 |

对大多数听者而言，SECS > 0.70 通常已无法与目标声音区分。

```figure
sp-voice-factorize
```

## 动手实现

### 步骤 1：通过识别—合成分解（`main.py` 中的纯代码演示）

```python
def clone_pipeline(ref_audio, text, target_embedder, tts_model):
    speaker_emb = target_embedder.encode(ref_audio)
    mel = tts_model(text, speaker=speaker_emb)
    return vocoder(mel)
```

概念很简单；实现工作主要集中在 `tts_model` 和说话人编码器中。

### 步骤 2：使用 F5-TTS 做零样本克隆

```python
from f5_tts.api import F5TTS
tts = F5TTS()
wav = tts.infer(
    ref_file="rohit_5s.wav",
    ref_text="The quick brown fox jumps over the lazy dog.",
    gen_text="Please add milk and bread to my list.",
)
```

参考文本必须与音频完全一致；不匹配会破坏对齐。

### 步骤 3：使用 KNN-VC 做语音转换

```python
import torch
from knnvc import KNNVC  # 2023 model, https://github.com/bshall/knn-vc
vc = KNNVC.load("wavlm-base-plus")
out_wav = vc.convert(source="my_voice.wav", target_pool=["alice_1.wav", "alice_2.wav"])
```

KNN-VC 使用 WavLM 为源音频与目标池提取逐帧嵌入，再将每个源帧替换为目标池中的最近邻。它是非参数方法，只需一分钟目标语音即可工作。

### 步骤 4：嵌入水印

```python
from silentcipher import SilentCipher
sc = SilentCipher(model="2024-06-01")
payload = b"consent_id:abc123;ts:1745353200"
watermarked = sc.embed(wav, sr=24000, message=payload)
detected = sc.detect(watermarked, sr=24000)   # returns payload bytes
```

载荷约为 32 位，在重新编码为 MP3 和添加轻微噪声后仍可检测。

### 步骤 5：同意门控

```python
def cloned_inference(text, ref_audio, consent_record):
    assert verify_signature(consent_record), "Signed consent required"
    assert consent_record["speaker_id"] == hash_speaker(ref_audio)
    wav = tts.infer(ref_file=ref_audio, gen_text=text)
    wav = watermark(wav, payload=consent_record["id"])
    return wav
```

## 用于实践

2026 年的技术栈：

| 情况 | 选择 |
|------|------|
| 5 秒零样本克隆、开源 | F5-TTS 或 OpenVoice v2 |
| 商业生产克隆 | ElevenLabs Instant Voice Clone v2.5 |
| 语音转换（改写） | KNN-VC 或 Diff-HierVC |
| 多说话人微调 | StyleTTS 2 + 说话人适配器 |
| 跨语言克隆 | XTTS v2 或 VALL-E X |
| 深度伪造检测 | Wav2Vec2-AASIST |

## 陷阱

- **参考文本未对齐。** F5-TTS 及类似模型要求参考文本与参考音频完全一致，包括标点。
- **参考音频有混响。** 回声会毁掉克隆。请在近讲、干燥的录音环境中录制。
- **情绪不匹配。** 使用“欢快”的训练参考会让所有克隆都很欢快。参考情绪应与目标用途匹配。
- **语言泄漏。** 克隆英语说话人后让模型说法语，通常仍会带英语口音；应使用跨语言模型（XTTS、VALL-E X）。
- **没有水印。** 自 2026 年 8 月起，在欧盟无法合法交付。

## 交付成果

保存为 `outputs/skill-voice-cloner.md`。设计包含同意门控、水印和质量目标的克隆或转换流水线。

## 练习

1. **简单。** 运行 `code/main.py`。它会计算交换前后两个“说话人”的余弦相似度，以演示说话人嵌入交换。
2. **中等。** 使用 OpenVoice v2 克隆你自己的声音。测量参考音频与克隆之间的 SECS，并通过 Whisper 测量 CER。
3. **困难。** 对 20 段克隆音频应用 SilentCipher 水印，经 128 kbps MP3 编码和解码后检测载荷，并报告比特准确率。

## 关键术语

| 术语 | 人们通常怎么说 | 实际含义 |
|------|----------------|----------|
| 零样本克隆 | 5 秒就够了 | 预训练模型 + 说话人嵌入；无需训练。 |
| PPG | 音素后验图 | 用作语言无关内容表示的逐帧 ASR 后验概率。 |
| KNN-VC | 最近邻转换 | 把每个源帧替换为目标池中的最近帧。 |
| 神经编解码器 TTS | VALL-E 风格 | 在 EnCodec/SoundStream 词元上运行的 AR 模型。 |
| 水印 | 不可听见的签名 | 嵌入音频、可经受重新编码的比特。 |
| SECS | 克隆保真度 | 目标与克隆声音的说话人嵌入余弦相似度。 |
| AASIST | 深度伪造检测器 | 检测合成语音的反欺骗模型。 |

## 延伸阅读

- [Chen 等（2024）. F5-TTS](https://arxiv.org/abs/2410.06885)——开源零样本克隆 SOTA。
- [Baevski 等 / Microsoft（2023）. VALL-E](https://arxiv.org/abs/2301.02111) 与 [VALL-E 2（2024）](https://arxiv.org/abs/2406.05370)——神经编解码器 TTS。
- [Qian 等（2019）. AutoVC](https://arxiv.org/abs/1905.05879)——基于解耦的语音转换。
- [Baas、Waubert de Puiseau、Kamper（2023）. KNN-VC](https://arxiv.org/abs/2305.18975)——基于检索的 VC。
- [SilentCipher（2024）——音频水印](https://github.com/sony/silentcipher)——可用于生产的 32 位音频水印。
- [ASVspoof 2025 结果](https://www.asvspoof.org/)——检测器与合成器之间的攻防竞赛，更新至 2026 年。
