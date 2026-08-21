---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/06-speech-and-audio/09-music-generation/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 4e0e66aee4ae937574ff9dfe0fc0369ed311a93683af1f3b0f7c66c3b6d49eaa
status: reviewed
---

# 音乐生成——MusicGen、Stable Audio、Suno 与许可地震

> 2026 年的音乐生成：Suno v5 和 Udio v4 主导商业市场；MusicGen、Stable Audio Open 和 ACE-Step 领跑开源领域。技术问题大体已经解决，法律问题（Warner Music 5 亿美元和解、UMG 和解）则在 2025–2026 年重塑了该领域。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 6 第 02 课（频谱图）、Phase 4 第 10 课（扩散模型）  
**预计时间：** 约 75 分钟

## 问题

文本 → 一段 30 秒到 4 分钟、包含歌词、人声和结构的音乐。它包含三个子问题：

1. **器乐生成。** “带温暖键盘音色的 lo-fi hip-hop 鼓点”这样的文本 → 音频。MusicGen、Stable Audio、AudioLDM。
2. **歌曲生成（人声 + 歌词）。** “一首关于得州雨夜的乡村歌曲” → 完整歌曲。Suno、Udio、YuE、ACE-Step。
3. **条件式 / 可控生成。** 延长现有片段、重新生成桥段、转换风格、分离音轨或局部重绘。Udio 的局部重绘 + 音轨分离是 2026 年需要追赶的功能。

## 概念

![音乐生成：词元语言模型与扩散模型，2026 年模型地图](../assets/music-generation.svg)

### 基于神经编解码器词元的词元语言模型

Meta 的 **MusicGen**（2023，MIT）及许多衍生模型：以文本/旋律嵌入为条件，自回归预测 EnCodec 词元（32 kHz、4 个码本），再用 EnCodec 解码。参数量为 3 亿至 33 亿。它是强基线，但处理超过 30 秒的内容时表现不佳。

**ACE-Step**（开源，40 亿参数 XL 版于 2026 年 4 月发布）把这种方法扩展到以歌词为条件的完整歌曲生成，是开源社区最接近 Suno 的方案。

### 基于梅尔或潜变量的扩散

**Stable Audio（2023）** 与 **Stable Audio Open（2024）**：在压缩音频上做潜在扩散。擅长循环片段、声音设计和氛围纹理，不擅长结构完整的整首歌曲。

**AudioLDM / AudioLDM2**：通过类似 T2I 的潜在扩散实现文本到音频，并泛化到音乐、音效和语音。

### 混合式（生产）——Suno、Udio、Lyria

权重闭源。其内部可能是自回归编解码器词元语言模型 + 基于扩散的声码器，并包含专门的声音、鼓与旋律头。Suno v5（2026）以 ELO 1293 领跑质量；Udio v4 增加局部重绘和音轨分离（可分别下载贝斯、鼓与人声）。

### 评估

- **FAD（弗雷歇音频距离，Fréchet Audio Distance）。** 使用 VGGish 或 PANNs 特征，计算生成音频与真实音频分布之间的嵌入级距离，越低越好。MusicGen small 在 MusicCaps 上的 FAD 为 4.5；SOTA 约为 3.0。
- **音乐性（主观）。** 人类偏好。Suno v5 以 ELO 1293 领先。
- **文本—音频对齐。** 提示与输出之间的 CLAP 分数。
- **音乐性伪影。** 节拍外转场、人声乐句漂移，以及 30 秒后结构丢失。

## 2026 年模型地图

| 模型 | 参数量 | 长度 | 人声 | 许可证 |
|------|--------|------|------|--------|
| MusicGen-large | 33 亿 | 30 秒 | 无 | MIT |
| Stable Audio Open | 12 亿 | 47 秒 | 无 | Stability 非商业许可 |
| ACE-Step XL（2026 年 4 月） | 40 亿 | &gt; 2 分钟 | 有 | Apache-2.0 |
| YuE | 70 亿 | &gt; 2 分钟 | 有，多语言 | Apache-2.0 |
| Suno v5（闭源） | ? | 4 分钟 | 有，ELO 1293 | 商业 |
| Udio v4（闭源） | ? | 4 分钟 | 有 + 分轨 | 商业 |
| Google Lyria 3（闭源） | ? | 实时 | 有 | 商业 |
| MiniMax Music 2.5 | ? | 4 分钟 | 有 | 商业 API |

## 法律格局（2025–2026）

- **Warner Music 与 Suno 和解。** 5 亿美元。WMG 现在对 Suno 上的 AI 相似性、音乐权利和用户生成曲目具有监督权。UMG 与 Udio 也达成了类似和解。
- **欧盟《人工智能法案》** + **加利福尼亚州 SB 942**：必须披露 AI 生成音乐。
- 使用 MIT 许可证的 **Riffusion / MusicGen** 没有合规包袱，但也不提供商业人声。

可安全交付的模式：

1. 只生成器乐（MusicGen、Stable Audio Open、MIT/CC0 输出）。
2. 使用带逐次生成许可的商业 API（Suno、Udio、ElevenLabs Music）。
3. 在自有或已授权目录上训练（大多数企业最终会这样做）。
4. 为生成内容添加水印与元数据标签。

```figure
sp-codec-tokens
```

## 动手实现

### 步骤 1：使用 MusicGen 生成

```python
from audiocraft.models import MusicGen
import torchaudio

model = MusicGen.get_pretrained("facebook/musicgen-small")
model.set_generation_params(duration=10)
wav = model.generate(["upbeat synthwave with driving drums, 128 BPM"])
torchaudio.save("out.wav", wav[0].cpu(), 32000)
```

共有三种大小：`small`（3 亿，速度快）、`medium`（15 亿）、`large`（33 亿）。要判断“想法是否成立”，small 已经足够。

### 步骤 2：旋律条件控制

```python
melody, sr = torchaudio.load("humming.wav")
wav = model.generate_with_chroma(
    ["jazz piano cover"],
    melody.squeeze(),
    sr,
)
```

MusicGen-melody 接收色度图，在替换音色的同时保留曲调。适合“把这段旋律改成弦乐四重奏”这类需求。

### 步骤 3：FAD 评估

```python
from frechet_audio_distance import FrechetAudioDistance
fad = FrechetAudioDistance()

fad.get_fad_score("generated_folder/", "reference_folder/")
```

计算 VGGish 嵌入距离。它适合做风格级回归测试，不能替代人类听众。

### 步骤 4：加入 LLM—音乐工作流

与第 7–8 课的想法结合：

```python
prompt = "Write a 30-second jazz loop. Describe the drums, bass, and piano voicing."
description = llm.complete(prompt)
music = musicgen.generate([description], duration=30)
```

## 用于实践

| 目标 | 技术栈 |
|------|--------|
| 器乐声音设计 | Stable Audio Open |
| 游戏 / 自适应音乐 | Google Lyria RealTime（闭源） |
| 带人声的完整歌曲（商业） | Suno v5 或 Udio v4，附明确许可 |
| 带人声的完整歌曲（开源） | ACE-Step XL 或 YuE |
| 广告短曲 | MusicGen，以哼唱参考做旋律条件控制 |
| 音乐视频背景 | MusicGen + Stable Video Diffusion |

## 2026 年仍会进入生产环境的陷阱

- **洗白版权的提示。** “一首 Taylor Swift 风格的歌曲”——商业 Suno/Udio 现在会过滤此类内容，开源模型不会。请添加自己的过滤列表。
- **30 秒后的重复 / 漂移。** AR 模型会循环。对多次生成做交叉淡化，或使用 ACE-Step 保持结构一致。
- **速度漂移。** 模型会偏离 BPM。在提示中加入 BPM 标签，并使用 librosa 的 `beat_track` 做后过滤。
- **人声可懂度。** Suno 表现出色；开源模型的歌词常含混不清。如果歌词很重要，请使用商业 API 或微调。
- **单声道输出。** 开源模型生成单声道或伪立体声。应使用适当的立体声重建方法升级（ezst、Cartesia 的立体声扩散）。

## 交付成果

保存为 `outputs/skill-music-designer.md`。为音乐生成部署选择模型、许可策略、长度 / 结构计划与披露元数据。

## 练习

1. **简单。** 运行 `code/main.py`。它会以 ASCII 符号生成一段“生成式”和弦进行与鼓型——即音乐生成的卡通版。愿意的话，可用任意 MIDI 渲染器播放。
2. **中等。** 安装 `audiocraft`，使用 MusicGen-small 针对 4 个风格提示分别生成 10 秒片段，并相对于参考风格集测量 FAD。
3. **困难。** 使用 ACE-Step（或 MusicGen-melody），通过不同音色提示生成同一曲调的三个变体。计算与提示的 CLAP 相似度以验证对齐。

## 关键术语

| 术语 | 人们通常怎么说 | 实际含义 |
|------|----------------|----------|
| FAD | 音频 FID | 真实音频与生成音频嵌入分布之间的弗雷歇距离。 |
| 色度图（chromagram） | 以音高表示旋律 | 每帧 12 维向量；作为旋律条件输入。 |
| 分轨（stems） | 乐器音轨 | 分离的贝斯 / 鼓 / 人声 / 旋律 WAV。 |
| 局部重绘（inpainting） | 重新生成一段 | 遮蔽一个时间窗口；模型只重新生成该段。 |
| CLAP | 文本—音频 CLIP | 对比式音频—文本嵌入；评估文本—音频对齐。 |
| EnCodec | 音乐编解码器 | MusicGen 使用的 Meta 神经编解码器；32 kHz、4 个码本。 |

## 延伸阅读

- [Copet 等（2023）. MusicGen](https://arxiv.org/abs/2306.05284)——开放自回归基准。
- [Evans 等（2024）. Stable Audio Open](https://arxiv.org/abs/2407.14358)——声音设计的默认方案。
- [ACE-Step](https://github.com/ace-step/ACE-Step)——2026 年 4 月发布的开源 40 亿参数完整歌曲生成器。
- [Suno v5 平台文档](https://suno.com)——商业质量领先者。
- [AudioLDM2](https://arxiv.org/abs/2308.05734)——面向音乐与音效的潜在扩散。
- [WMG—Suno 和解报道](https://www.musicbusinessworldwide.com/suno-warner-music-settlement/)——2025 年 11 月的先例。
