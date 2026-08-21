---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/08-generative-ai/11-audio-generation/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: c9ead5e0d8b697a96395667f19e8968268865c09c809cbc1f32eed2b81fe010d
status: reviewed
---

# 音频生成

> 音频是采样率为 16～48 kHz 的一维信号。五秒片段包含 8 万～24 万个样本。没有 Transformer 会直接关注如此长的序列。2026 年的每个生产音频模型都采用同一项解决方案：神经编解码器（Encodec、SoundStream、DAC）把音频压缩成频率为 50～75 Hz 的离散词元，再由 Transformer 或扩散模型生成词元。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 6 第 02 课（音频特征）、Phase 6 第 04 课（ASR）、Phase 8 第 06 课（DDPM）  
**预计时间：** 约 45 分钟

## 问题

音频生成包含三类任务：

1. **文本转语音。** 给定文本，生成语音。干净语音带宽窄且具有很强的语音结构，词元 Transformer 已经能很好地解决。代表系统包括 VALL-E（Microsoft）、NaturalSpeech 3、ElevenLabs、OpenAI TTS。
2. **音乐生成。** 给定提示词（文本、旋律、和弦进行、流派），生成音乐。其分布宽得多。代表系统包括 MusicGen（Meta）、Stable Audio 2.5、Suno v4、Udio、Riffusion。
3. **音效 / 声音设计。** 给定提示词，生成环境声或拟音。代表系统包括 AudioGen、AudioLDM 2、Stable Audio Open。

三类任务都运行在同一套底座上：神经音频编解码器 + 词元自回归或扩散生成器。

## 概念

![音频生成：编解码器词元 + Transformer 或扩散](../assets/audio-generation.svg)

### 神经音频编解码器

包括 Encodec（Meta，2022）、SoundStream（Google，2021）、Descript Audio Codec（DAC，2023）。卷积编码器把波形压缩为逐时间步向量；残差向量量化（RVQ）再把每个向量转换为 K 个级联码本索引；解码器执行逆过程。24 kHz 音频以 2 kbps 编码，使用 8 个 75 Hz RVQ 码本，每秒会产生 600 个词元。

```
波形（每秒 16000 个样本）
    └─ 编码器卷积 ─┐
                    ├─ RVQ 第 1 层 → 75 Hz 索引
                    ├─ RVQ 第 2 层 → 75 Hz 索引
                    ├─ ……
                    └─ RVQ 第 8 层
```

### 上层的两种生成范式

**词元自回归。** 把 RVQ 词元展平为序列，再运行仅解码器 Transformer。MusicGen 使用“延迟并行”方式，让 K 条码本流以逐流偏移并行输出。VALL-E 根据文本提示 + 3 秒语音样本生成语音词元。

**潜空间扩散。** 把编解码器词元打包为连续潜变量，或使用类别扩散建模。Stable Audio 2.5 在连续音频潜变量上使用流匹配。AudioLDM 2 使用文本到梅尔谱再到音频的扩散。

2024—2026 年的趋势是：流匹配在音乐领域胜出，因为推理更快、样本更干净；词元自回归仍主导语音，因为它天然具有因果性，也适合流式传输。

## 生产格局

| 系统 | 任务 | 骨干 | 延迟 |
|------|------|------|------|
| ElevenLabs V3 | TTS | 词元 AR + 神经声码器 | 首词元约 300ms |
| OpenAI GPT-4o audio | 全双工语音 | 端到端多模态 AR | 约 200ms |
| NaturalSpeech 3 | TTS | 潜空间流匹配 | 非流式 |
| Stable Audio 2.5 | 音乐 / 音效 | 音频潜变量上的 DiT + 流匹配 | 生成 1 分钟片段约需 10s |
| Suno v4 | 完整歌曲 | 未披露；推测为词元 AR | 每首歌约 30s |
| Udio v1.5 | 完整歌曲 | 未披露 | 每首歌约 30s |
| MusicGen 3.3B | 音乐 | Encodec 32kHz 上的词元 AR | 实时 |
| AudioCraft 2 | 音乐 + 音效 | 流匹配 | 生成 5s 片段约需 5s |
| Riffusion v2 | 音乐 | 频谱图扩散 | 约 10s |

```figure
score-matching
```

## 动手构建

`code/main.py` 模拟核心思路：在两种不同“风格”生成的合成“音频词元”序列上训练微型下一词元 Transformer（风格 A 在高低词元之间交替，风格 B 单调递增）。模型接收风格条件并完成采样。

### 第 1 步：合成音频词元

```python
def make_tokens(style, length, vocab_size, rng):
    if style == 0:  # “类似语音”：交替变化
        return [i % vocab_size for i in range(length)]
    # “类似音乐”：递增
    return [(i * 3) % vocab_size for i in range(length)]
```

### 第 2 步：训练微型词元预测器

使用以风格为条件的二元语法式预测器。重点在于这条模式：编解码器词元 → 交叉熵训练 → 自回归采样。

### 第 3 步：按条件采样

给定风格词元和起始词元，从预测分布中采样下一词元。继续生成 20～40 个词元。

## 常见问题

- **编解码器质量限制输出质量。** 如果编解码器无法忠实表示一种声音，再好的生成器也无济于事。DAC 是当前最佳的开放方案。
- **RVQ 误差累积。** 每个 RVQ 层都建模上一层的残差。第 1 层误差会向后传播。在高层使用温度 0 采样可以改善结果。
- **音乐结构。** 30 秒音频在 75 Hz 下包含 2 万多个词元，Transformer 很难处理。MusicGen 使用滑动窗口 + 提示延续；Stable Audio 使用较短片段 + 交叉淡化。
- **边界伪影。** 在生成片段之间做交叉淡化时，需要谨慎执行重叠相加。
- **对干净数据的需求。** 音乐生成器需要数万小时的授权音乐。2024 年 Suno / Udio 与 RIAA 的诉讼让这个问题浮出水面。
- **语音克隆伦理。** 3 秒样本加文本提示，已足够让 VALL-E / XTTS / ElevenLabs 克隆声音。每个生产模型都需要滥用检测 + 退出名单。

## 使用方法

| 任务 | 2026 年技术栈 |
|------|---------------|
| 商业 TTS | ElevenLabs、OpenAI TTS 或 Azure Neural |
| 语音克隆（已验证同意） | XTTS v2（开放）或 ElevenLabs Pro |
| 快速生成背景音乐 | Stable Audio 2.5 API、Suno 或 Udio |
| 带歌词的音乐 | Suno v4 或 Udio v1.5 |
| 音效 / 拟音 | AudioCraft 2、ElevenLabs SFX 或 Stable Audio Open |
| 实时语音智能体 | GPT-4o realtime 或 Gemini Live |
| 开放权重音乐研究 | MusicGen 3.3B、Stable Audio Open 1.0、AudioLDM 2 |
| 配音 / 翻译 | HeyGen、ElevenLabs Dubbing |

## 交付成果

保存为 `outputs/skill-audio-brief.md`。该技能接收音频简报（任务、时长、风格、声音、许可证），输出模型 + 托管方式、提示词格式（流派标签、风格描述、结构标记）、编解码器 + 生成器 + 声码器链、随机种子方案，以及评估计划（MOS / CLAP score / TTS 的 CER / 用户 A/B 测试）。

## 练习

1. **简单。** 运行 `code/main.py` 并明确设置风格。验证生成序列符合该风格的模式。
2. **中等。** 添加延迟并行解码：模拟两条必须相差 1 步的词元流。训练联合预测器。
3. **困难。** 使用 Hugging Face transformers 在本地运行 MusicGen-small。用三个不同提示词分别生成 10 秒片段，通过 A/B 测试评估风格遵循。

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| 编解码器 | “神经压缩” | 音频编码器 / 解码器；典型输出为 50～75 Hz 词元。 |
| RVQ | “残差 VQ” | K 个量化器级联；每个量化器建模前一个的残差。 |
| 词元 | “一个编解码器符号” | 码本中的离散索引；通常有 1024 或 2048 个取值。 |
| 延迟并行 | “错位码本” | 以交错偏移输出 K 条词元流，缩短序列。 |
| 流匹配 | “2024 年音频领域的赢家” | 以更直路径替代扩散；采样更快。 |
| 语音提示 | “3 秒样本” | 引导克隆声音的说话者嵌入或词元前缀。 |
| 梅尔频谱图 | “那个可视化” | 对数幅度感知频谱图；许多 TTS 系统使用。 |
| 声码器 | “梅尔谱到波形” | 把梅尔频谱图还原为音频的神经组件。 |

## 生产说明：音频是流式传输问题

音频是唯一让用户期待*边生成边接收*、而非一次性返回的输出模态。用生产术语来说，TPOT（每输出词元时间）很重要，因为目标吞吐量由用户的聆听速度而非阅读速度决定。16kHz 音频经 Encodec 处理后约为每秒 75 个词元，服务器必须为每位用户达到每秒至少 75 个词元，才能保持流畅播放。

由此带来两个架构结论：

- **流匹配音频模型无法直接流式输出。** Stable Audio 2.5 和 AudioCraft 2 会一次渲染固定长度片段。为了流式传输，需要切分片段并重叠边界，做法类似滑动窗口扩散；与编解码器 AR 模型相比，这会增加 100～300ms 延迟开销。

如果产品是“实时语音聊天”或“实时音乐续写”，请选择编解码器 AR 路径。如果产品是“提交后渲染 30 秒片段”，流匹配会在质量和总延迟上胜出。

## 延伸阅读

- [Défossez 等（2022），《Encodec: High Fidelity Neural Audio Compression》](https://arxiv.org/abs/2210.13438)——编解码器标准。
- [Zeghidour 等（2021），《SoundStream》](https://arxiv.org/abs/2107.03312)——第一个广泛使用的神经音频编解码器。
- [Kumar 等（2023），《High-Fidelity Audio Compression with Improved RVQGAN (DAC)》](https://arxiv.org/abs/2306.06546)——DAC。
- [Wang 等（2023），《Neural Codec Language Models are Zero-Shot Text to Speech Synthesizers (VALL-E)》](https://arxiv.org/abs/2301.02111)——VALL-E。
- [Copet 等（2023），《Simple and Controllable Music Generation (MusicGen)》](https://arxiv.org/abs/2306.05284)——MusicGen。
- [Liu 等（2023），《AudioLDM 2: Learning Holistic Audio Generation with Self-supervised Pretraining》](https://arxiv.org/abs/2308.05734)——AudioLDM 2。
- [Stability AI（2024），《Stable Audio 2.5》](https://stability.ai/news/introducing-stable-audio-2-5)——2025 年采用流匹配的文生音乐系统。
