---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/06-speech-and-audio/03-audio-classification/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 3764a4ecf6c369d918f1122bd3d8496afc4d01c62caf6ace237f06c94a9a8241
status: reviewed
---

# 音频分类——从基于 MFCC 的 k-NN 到 AST 与 BEATs

> 从“狗叫还是警笛”到“这是哪种语言”，都属于音频分类。特征是梅尔特征，架构每十年都会变化，评估方法始终是 AUC、F1 和各类别召回率。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 6 第 02 课（频谱图与梅尔）、Phase 3 第 06 课（CNN）、Phase 5 第 08 课（用于文本的 CNN 与 RNN）  
**预计时间：** 约 75 分钟

## 问题

给你一段 10 秒的音频，你想知道：“它是什么？”城市声音（警笛、电钻、狗叫）、语音命令（yes/no/stop）、语言识别（en/es/ar）、说话人情绪（愤怒/中性），或环境声（室内/室外、人声嘈杂）。这些都属于*音频分类（audio classification）*。到 2026 年，基线架构已经成熟：对数梅尔 → CNN 或 Transformer → softmax。

核心难点不在网络，而在数据。音频数据集存在严重的类别不平衡、强烈的领域偏移（干净与嘈杂环境），以及标签噪声（是谁判定“城市人声嘈杂”和“餐厅噪声”的？）。问题的 80% 在数据整理、增强和评估，而不在于把 CNN 换成 Transformer。

## 概念 <!-- learning-atlas: the-concept -->

![音频分类阶梯：从基于 MFCC 的 k-NN 到 AST 与 BEATs](../assets/audio-classification.svg)

**基于 MFCC 的 k-NN（1990 年代基线）。** 将每段音频的 MFCC 展平，计算它与一个带标签特征库的余弦相似度，再返回前 K 个近邻的多数票。在干净的小型数据集（Speech Commands、ESC-50）上，它出奇地强，而且无需 GPU。

**基于对数梅尔的二维 CNN（2015–2019）。** 把 `(T, n_mels)` 的对数梅尔视为图像，应用 ResNet-18 或 VGG 风格网络，对时间轴做全局均值池化，再对类别执行 softmax。到 2026 年，它仍是大多数 Kaggle 竞赛的基线。

**音频频谱图 Transformer（Audio Spectrogram Transformer，AST，2021–2024）。** 把对数梅尔切成小块（如 16×16 patch），添加位置嵌入后送入 ViT。在监督学习的 AudioSet 上达到当时最先进水平（mAP 0.485）。

**BEATs 与 WavLM-base（2024–2026）。** 在数百万小时音频上进行自监督预训练。只需过去所需监督数据的 1–10%，即可针对任务微调。到 2026 年，这是处理非语音音频时的默认起点。BEATs-iter3 在 AudioSet 上比 AST 高 1–2 个 mAP 点，而计算量只有后者的 1/4。

**把 Whisper 编码器用作冻结主干（2024）。** 取 Whisper 编码器、移除解码器、接上线性分类器。无需任何音频增强，就能在语言识别和简单事件分类上取得接近 SOTA 的结果。这是一个“免费午餐”式基线。

### 类别不平衡才是真正的挑战

ESC-50 有 50 个类别，每类 40 段音频——均衡且简单。UrbanSound8K 有 10 个类别，不平衡比例达到 10:1。AudioSet 有 632 个类别，呈现 100,000:1 的长尾。有效技术包括：

- 训练时做均衡采样（评估时不要）。
- Mixup：将两段音频及其标签线性插值，作为数据增强。
- SpecAugment：随机遮蔽时间带与频率带。方法简单，却至关重要。

### 评估

- 互斥多分类（Speech Commands）：top-1 准确率、top-5 准确率。
- 多标签多分类（AudioSet、UrbanSound 风格）：平均精度均值（mAP）。
- 严重不平衡：各类别召回率 + 宏平均 F1。

你应该知道的 2026 年指标：

| 基准 | 基线 | 2026 年 SOTA | 来源 |
|------|------|--------------|------|
| ESC-50 | 82%（AST） | 97.0%（BEATs-iter3） | BEATs 论文（2024） |
| AudioSet mAP | 0.485（AST） | 0.548（BEATs-iter3） | HEAR 排行榜 2026 |
| Speech Commands v2 | 98%（CNN） | 99.0%（Audio-MAE） | HEAR v2 结果 |

```figure
mfcc-pipeline
```

## 动手实现

### 步骤 1：提取特征

```python
def featurize_mfcc(signal, sr, n_mfcc=13, n_mels=40, frame_len=400, hop=160):
    mag = stft_magnitude(signal, frame_len, hop)
    fb = mel_filterbank(n_mels, frame_len, sr)
    mels = apply_filterbank(mag, fb)
    log = log_transform(mels)
    return [dct_ii(frame, n_mfcc) for frame in log]
```

### 步骤 2：固定长度摘要

```python
def summarize(mfcc_frames):
    n = len(mfcc_frames[0])
    mean = [sum(f[i] for f in mfcc_frames) / len(mfcc_frames) for i in range(n)]
    var = [
        sum((f[i] - mean[i]) ** 2 for f in mfcc_frames) / len(mfcc_frames) for i in range(n)
    ]
    return mean + var
```

简单却强大：对 13 系数 MFCC 沿时间计算均值与方差，就能为任意音频得到 26 维固定嵌入。它可以瞬间运行，并且直到 2017 年仍能在 ESC-50 上击败最先进的神经网络基线。

### 步骤 3：k-NN

```python
def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1e-12
    nb = math.sqrt(sum(x * x for x in b)) or 1e-12
    return dot / (na * nb)

def knn_classify(q, bank, labels, k=5):
    sims = sorted(range(len(bank)), key=lambda i: -cosine(q, bank[i]))[:k]
    votes = Counter(labels[i] for i in sims)
    return votes.most_common(1)[0][0]
```

### 步骤 4：升级到基于对数梅尔的 CNN

在 PyTorch 中：

```python
import torch.nn as nn

class AudioCNN(nn.Module):
    def __init__(self, n_mels=80, n_classes=50):
        super().__init__()
        self.body = nn.Sequential(
            nn.Conv2d(1, 32, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(32, 64, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(64, 128, 3, padding=1), nn.ReLU(),
            nn.AdaptiveAvgPool2d(1),
        )
        self.head = nn.Linear(128, n_classes)

    def forward(self, x):  # x: (B, 1, T, n_mels)
        return self.head(self.body(x).flatten(1))
```

300 万个参数。在单张 RTX 4090 上训练 ESC-50 约需 10 分钟，准确率可达 80% 以上。

### 步骤 5：2026 年默认方案——微调 BEATs

```python
from transformers import ASTFeatureExtractor, ASTForAudioClassification

ext = ASTFeatureExtractor.from_pretrained("MIT/ast-finetuned-audioset-10-10-0.4593")
model = ASTForAudioClassification.from_pretrained(
    "MIT/ast-finetuned-audioset-10-10-0.4593",
    num_labels=50,
    ignore_mismatched_sizes=True,
)

inputs = ext(audio, sampling_rate=16000, return_tensors="pt")
logits = model(**inputs).logits
```

对于 BEATs，通过 `beats` 库使用 `microsoft/BEATs-base`；其 transformers API 具有相同的形状。

## 用于实践

2026 年的技术栈：

| 情况 | 起点 |
|------|------|
| 微型数据集（<1000 段） | 基于 MFCC 均值的 k-NN（你的基线）+ 音频增强 |
| 中型数据集（1K–100K） | 微调 BEATs 或 AST |
| 大型数据集（>100K） | 从头训练或微调 Whisper 编码器 |
| 实时、边缘端 | 40 维 MFCC CNN，量化为 int8（KWS 风格） |
| 多标签（AudioSet） | BEATs-iter3 + BCE 损失 + mixup + SpecAugment |
| 语言识别 | MMS-LID、SpeechBrain VoxLingua107 基线 |

决策规则：**从冻结的主干开始训练**。微调一个 BEATs 分类头，几小时内就能达到 SOTA 的 95%，耗时远少于从零训练新模型。

## 交付成果

保存为 `outputs/skill-classifier-designer.md`。针对给定音频分类任务，选择架构、增强方式、类别平衡策略和评估指标。

## 练习

1. **简单。** 运行 `code/main.py`。它会在一个 4 类合成数据集（不同音高的纯音）上训练基于 MFCC 的 k-NN 基线。报告混淆矩阵。
2. **中等。** 把 `summarize` 替换为 `[mean, var, skew, kurtosis]`。在同一合成数据集上，四阶矩池化是否优于均值 + 方差？
3. **困难。** 使用 `torchaudio` 在 ESC-50 的 fold 1 上训练二维 CNN。报告五折交叉验证准确率。加入 SpecAugment（时间遮蔽 = 20，频率遮蔽 = 10），并报告指标变化。

## 关键术语

| 术语 | 人们通常怎么说 | 实际含义 |
|------|----------------|----------|
| AudioSet | 音频界的 ImageNet | Google 的 200 万片段、632 类弱标注 YouTube 数据集。 |
| ESC-50 | 小型分类基准 | 50 类 × 每类 40 段环境声音。 |
| AST | 音频频谱图 Transformer | 对对数梅尔 patch 应用 ViT；2021 年 SOTA。 |
| BEATs | 自监督音频 | Microsoft 模型；截至 2026 年，iter3 领跑 AudioSet。 |
| Mixup | 成对增强 | `x = λ·x1 + (1-λ)·x2; y = λ·y1 + (1-λ)·y2`。 |
| SpecAugment | 基于遮蔽的增强 | 将频谱图中的随机时间带和频率带置零。 |
| mAP | 主要多标签指标 | 跨类别与阈值的平均精度均值。 |

## 延伸阅读

- [Gong、Chung、Glass（2021）. AST: Audio Spectrogram Transformer](https://arxiv.org/abs/2104.01778)——2021–2024 年的代表性架构。
- [Chen 等（2022，2024 修订）. BEATs: Audio Pre-Training with Acoustic Tokenizers](https://arxiv.org/abs/2212.09058)——2024 年后的默认选择。
- [Park 等（2019）. SpecAugment](https://arxiv.org/abs/1904.08779)——主导性的音频增强方法。
- [Piczak（2015）. ESC-50 dataset](https://github.com/karolpiczak/ESC-50)——至今仍在使用的 50 类基准。
- [Gemmeke 等（2017）. AudioSet](https://research.google.com/audioset/)——632 类 YouTube 分类体系，至今仍是金标准。
