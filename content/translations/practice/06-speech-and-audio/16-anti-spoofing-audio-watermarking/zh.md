---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/06-speech-and-audio/16-anti-spoofing-audio-watermarking/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: e10d33a6c2f542fa1a2a08bd484f7b78b04b6511bd4a5a9dc4720eca850ce504
status: reviewed
---

# 语音反欺骗与音频水印——ASVspoof 5、AudioSeal、WaveVerify

> 语音克隆的落地速度快过防御。2026 年的生产语音系统需要两样东西：一个区分真实与伪造语音的检测器（AASIST、RawNet2），以及一个能经受压缩与编辑的水印（AudioSeal）。两者都要交付，否则就不要交付语音克隆。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 6 第 06 课（说话人识别）、Phase 6 第 08 课（语音克隆）  
**预计时间：** 约 75 分钟

## 问题

三种相关防御：

1. **反欺骗 / 深度伪造检测。** 给定一段音频，它是合成的还是真实的？ASVspoof 基准（ASVspoof 2019 → 2021 → 5）是金标准。
2. **音频水印。** 在生成音频中嵌入不可感知的信号，供检测器日后提取。AudioSeal（Meta）和 WavMark 是开放方案。
3. **经过认证的来源。** 对音频文件与元数据进行加密签名。C2PA / Content Authenticity Initiative。

检测用于应对不配合的对手，水印用于满足合规——AI 生成音频应能被识别。到 2026 年，两者都是必需的。

## 概念

![反欺骗、水印与来源认证——三层防御](../assets/spoofing-watermark.svg)

### ASVspoof 5——2024–2025 年基准

相比过去版本，最大的变化是：

- **众包数据**（而非录音室干净数据）——条件更真实。
- **约 2000 位说话人**（过去约 100 位）。
- **32 种攻击算法。** TTS + 语音转换 + 对抗扰动。
- **两条赛道。** 独立检测的对抗措施（CM）；面向生物识别系统的抗欺骗 ASV（SASV）。

ASVspoof 5 上的最先进结果约为 7.23% EER；在较老的 ASVspoof 2019 LA 上为 0.42% EER。真实世界部署中，对野外音频应预期 5–10% EER。

### AASIST 与 RawNet2——检测模型家族

**AASIST**（2021，持续更新至 2026）。在频谱特征上使用图注意力，是 ASVspoof 5 对抗措施任务当前的 SOTA。

**RawNet2。** 原始波形上的卷积前端 + TDNN 主干。更简单的基线，微调后仍有竞争力。

**NeXt-TDNN + SSL 特征。** 2025 年变体：ECAPA 风格 + WavLM 特征 + 焦点损失。在 ASVspoof 2019 LA 上达到 0.42% EER。

### AudioSeal——2024 年默认水印

Meta 的 **AudioSeal**（2024 年 1 月发布，v0.2 于 2024 年 12 月发布）。关键设计如下：

- **局部化。** 以 16 kHz 采样分辨率逐帧检测水印（1/16000 秒）。
- **生成器与检测器联合训练。** 生成器学习嵌入不可听信号；检测器学习在各种增强后找到它。
- **鲁棒。** 可经受 MP3 / AAC 压缩、均衡器、±10% 速度变化，以及 +10 dB SNR 噪声混合。
- **快速。** 检测器以 485 倍实时速度运行，比 WavMark 快 1000 倍。
- **容量。** 每条语句可嵌入 16 位载荷（可编码模型 ID、生成时间戳、用户 ID）。

### WavMark

AudioSeal 之前的开放基线。使用可逆神经网络，每秒 32 位。问题包括：

- 同步需要暴力搜索，速度慢。
- 高斯噪声或 MP3 压缩即可移除。
- 不适合实时处理。

### WaveVerify（2025 年 7 月）

它针对 AudioSeal 的弱点——特别是时间操作（倒放、变速）。使用基于 FiLM 的生成器 + 专家混合检测器。在标准攻击上与 AudioSeal 相当，并能处理时间编辑。

### 对手利用的缺口

AudioMarkBench 指出：“在音高变换下，所有水印的比特恢复准确率都低于 0.6，表明水印几乎被完全移除。”**音高变换是通用攻击。** 2026 年没有一种水印能完全抵抗剧烈音高修改。因此，除水印外还需要检测（AASIST）。

### C2PA / Content Authenticity Initiative

它是一种清单格式，不属于机器学习技术。音频文件携带关于创建工具、作者与日期的加密签名元数据。Audobox / Seamless 使用它。它适合来源认证；但恶意行为者重新编码并移除元数据后，它就无能为力。

```figure
v4-audio-watermark
```

## 动手实现

### 步骤 1：简单频谱特征检测器（玩具）

```python
def spectral_rolloff(spec, percentile=0.85):
    cum = 0
    total = sum(spec)
    if total == 0:
        return 0
    threshold = total * percentile
    for k, v in enumerate(spec):
        cum += v
        if cum >= threshold:
            return k
    return len(spec) - 1

def is_suspicious(audio):
    spec = magnitude_spectrum(audio)
    rolloff = spectral_rolloff(spec)
    return rolloff / len(spec) > 0.92
```

合成语音往往有异常平坦的高频能量。生产检测器使用 AASIST，而不是这个实现，但直觉依然成立。

### 步骤 2：AudioSeal 嵌入 + 检测

```python
from audioseal import AudioSeal
import torch

generator = AudioSeal.load_generator("audioseal_wm_16bits")
detector = AudioSeal.load_detector("audioseal_detector_16bits")

audio = load_wav("generated.wav", sr=16000)[None, None, :]
payload = torch.tensor([[1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0]])
watermark = generator.get_watermark(audio, sample_rate=16000, message=payload)
watermarked = audio + watermark

result, decoded_payload = detector.detect_watermark(watermarked, sample_rate=16000)
# result: float in [0, 1] — probability of watermark presence
# decoded_payload: 16 bits; match against embedded payload
```

### 步骤 3：评估——EER

```python
def eer(real_scores, fake_scores):
    thresholds = sorted(set(real_scores + fake_scores))
    best = (1.0, 0.0)
    for t in thresholds:
        far = sum(1 for s in fake_scores if s >= t) / len(fake_scores)
        frr = sum(1 for s in real_scores if s < t) / len(real_scores)
        if abs(far - frr) < best[0]:
            best = (abs(far - frr), (far + frr) / 2)
    return best[1]
```

### 步骤 4：生产集成

```python
def safe_tts(text, voice, clone_reference=None):
    if clone_reference is not None:
        verify_consent(user_id, clone_reference)
    audio = tts_model.synthesize(text, voice)
    audio_with_wm = audioseal_embed(audio, payload=build_payload(user_id, model_id))
    manifest = c2pa_sign(audio_with_wm, user_id, timestamp=now())
    return audio_with_wm, manifest
```

每次生成都交付：(1) 水印；(2) 签名清单；(3) 符合保留政策的审计日志。

## 用于实践

| 用例 | 防御 |
|------|------|
| 交付 TTS / 语音克隆 | 每个输出都嵌入 AudioSeal（不可妥协） |
| 生物识别语音解锁 | AASIST + ECAPA 集成；活体挑战 |
| 呼叫中心欺诈检测 | 对 20% 来电样本运行 AASIST |
| 播客真实性 | 上传时进行 C2PA 签名；AI 生成内容加入 AudioSeal |
| 研究 / 训练检测器 | ASVspoof 5 训练/开发/评估集 |

## 陷阱

- **添加水印却从不运行检测器。** 毫无意义。请在 CI 中交付检测器。
- **检测却不校准。** 在 ASVspoof LA 上训练的 AASIST 会过拟合，真实世界准确率下降。应在自己的领域上校准。
- **音高变换缺口。** 剧烈音高变换会移除大多数水印。必须提供检测回退。
- **移除元数据后重新托管。** 重新编码很容易绕过 C2PA。务必组合加密防御和感知防御（水印）。
- **把活体挑战当检测。** 要求用户说出随机短语，可以防止重放攻击，但不能防止实时克隆。

## 交付成果

保存为 `outputs/skill-spoof-defender.md`。针对语音生成部署选择检测模型、水印、来源清单与运维手册。

## 练习

1. **简单。** 运行 `code/main.py`。在合成音频上运行玩具检测器和玩具水印嵌入/检测。
2. **中等。** 安装 `audioseal`，在 TTS 输出中嵌入 16 位载荷，再重新解码。用噪声破坏音频，并测量比特恢复准确率。
3. **困难。** 在 ASVspoof 2019 LA 上微调 RawNet2 或 AASIST 并测量 EER。再在一组留出的 F5-TTS 生成音频上测试——观察分布外检测如何退化。

## 关键术语

| 术语 | 人们通常怎么说 | 实际含义 |
|------|----------------|----------|
| ASVspoof | 基准 | 双年挑战；2024 年版本为 ASVspoof 5。 |
| CM（对抗措施） | 检测器 | 对真实语音与合成 / 转换语音做分类。 |
| SASV | 说话人验证 + CM | 集成生物识别与欺骗检测。 |
| AudioSeal | Meta 水印 | 局部化、16 位载荷，比 WavMark 快 485 倍。 |
| 比特恢复准确率 | 水印存活情况 | 遭受攻击后成功恢复的载荷比特比例。 |
| C2PA | 来源清单 | 关于创建 / 作者身份的加密元数据。 |
| AASIST | 检测器家族 | 基于图注意力的反欺骗 SOTA。 |

## 延伸阅读

- [Todisco 等（2024）. ASVspoof 5](https://dl.acm.org/doi/10.1016/j.csl.2025.101825)——当前基准。
- [Défossez 等（2024）. AudioSeal](https://arxiv.org/abs/2401.17264)——默认水印。
- [Chen 等（2025）. WaveVerify](https://arxiv.org/abs/2507.21150)——面向时间攻击的 MoE 检测器。
- [Jung 等（2022）. AASIST](https://arxiv.org/abs/2110.01200)——SOTA 检测主干。
- [AudioMarkBench（2024）](https://proceedings.neurips.cc/paper_files/paper/2024/file/5d9b7775296a641a1913ab6b4425d5e8-Paper-Datasets_and_Benchmarks_Track.pdf)——鲁棒性评估。
- [C2PA 规范](https://c2pa.org/specifications/specifications/)——来源清单格式。
