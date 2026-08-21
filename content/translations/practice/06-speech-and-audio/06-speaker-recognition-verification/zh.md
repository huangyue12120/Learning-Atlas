---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/06-speech-and-audio/06-speaker-recognition-verification/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 63ddce2e943e59e1b2aa18bb698df67409fd0011f0d8421139ec7c46cba2f217
status: reviewed
---

# 说话人识别与验证

> ASR 问的是“他们说了什么？”，说话人识别问的是“是谁说的？”。数学形式看起来相同——嵌入加余弦相似度——但每项生产决策都取决于一个 EER 数字。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 6 第 02 课（频谱图与梅尔）、Phase 5 第 22 课（嵌入模型）  
**预计时间：** 约 45 分钟

## 问题

用户说出一句口令。你想知道：这是否真是其声称的身份（*验证，verification*，1:1），或者他是否是注册库中的某一个人（*识别，identification*，1:N）？又或者两者都不是——他是否是一位未知说话人（*开放集，open-set*）？

2018 年前：GMM-UBM + i-vector，EER 尚可，但容易受通道偏移（电话与笔记本电脑）和情绪影响。2018–2022 年：x-vector（以角度间隔训练的 TDNN 主干）。2022 年后：ECAPA-TDNN 和 WavLM-large 嵌入。到 2026 年，该领域由三个模型和一个指标主导。

这个指标就是 **EER——等错误率（Equal Error Rate）**。调整决策阈值，使错误接受率（False Accept Rate）等于错误拒绝率（False Reject Rate），二者的交点即为 EER。每篇论文、每个排行榜和每场采购评审都会使用它。

## 概念

![包含嵌入、余弦相似度与 EER 的注册和验证流水线](../assets/speaker-verification.svg)

**流水线。** 注册：录制目标说话人 5–30 秒的语音，计算固定维度嵌入（ECAPA-TDNN 为 192 维，WavLM-large 为 256 维）。验证：获得测试语句的嵌入，计算余弦相似度，再与阈值比较。

**ECAPA-TDNN（2020，2026 年仍占主导）。** 全称为“强调通道注意力、传播与聚合的时延神经网络”（Emphasized Channel Attention, Propagation and Aggregation - Time-Delay Neural Network）。它由带压缩—激励的一维卷积块、多头注意力池化和一个投影到 192 维的线性层组成。在 VoxCeleb 1+2（2700 位说话人、110 万条语句）上，使用加性角度间隔损失（AAM-softmax）训练。

**WavLM-SV（2022+）。** 使用 AAM 损失微调预训练的 WavLM-large SSL 主干。质量更高但速度更慢——体积超过 300 MB，而 ECAPA 约为 15 MB。

**x-vector（基线）。** TDNN + 统计池化。经典方案，在 CPU / 边缘端仍然实用。

**AAM-softmax。** 在角度空间中为标准 softmax 加入间隔 `m`：正确类别使用 `cos(θ + m)`，从而强制类别之间保持角度分离。典型取值为 `m=0.2`、尺度 `s=30`。

### 评分

- **余弦相似度（cosine）**：计算注册嵌入和测试嵌入之间的余弦相似度，再用阈值决策。
- **PLDA（概率 LDA，Probabilistic LDA）。** 将嵌入投影到一个潜在空间，在该空间中，同一说话人与不同说话人的似然比具有闭式解。在余弦评分上叠加后，可将 EER 降低 10–20%。它在 2020 年前是标准方案，如今只用于闭集场景。
- **分数归一化。** `S-norm` 或 `AS-norm`：使用一组冒名者分数的均值与标准差归一化每个分数。跨领域评估不可或缺。

### 你应该知道的数据（2026）

| 模型 | VoxCeleb1-O EER | 参数量 | 吞吐量（A100） |
|------|-----------------|--------|-----------------|
| x-vector（经典） | 3.10% | 500 万 | 400× 实时 |
| ECAPA-TDNN | 0.87% | 1500 万 | 200× 实时 |
| WavLM-SV large | 0.42% | 3.16 亿 | 20× 实时 |
| Pyannote 3.1 分割 + 嵌入 | 0.65% | 600 万 | 100× 实时 |
| ReDimNet（2024） | 0.39% | 2400 万 | 100× 实时 |

### 说话人分离

在包含多位说话人的音频中确定“谁在何时说话”。流水线为：VAD → 分段 → 为每个片段提取嵌入 → 聚类（凝聚式或谱聚类）→ 平滑边界。现代技术栈是 `pyannote.audio` 3.1，它在一次调用中封装了说话人分割、嵌入与聚类。2026 年 AMI 上的 SOTA DER 约为 15%（2022 年为 23%）。

```figure
sp-eer-crossover
```

## 动手实现

### 步骤 1：从 MFCC 统计量构造玩具嵌入

```python
def embed_mfcc_stats(signal, sr):
    frames = featurize_mfcc(signal, sr, n_mfcc=13)
    mean = [sum(f[i] for f in frames) / len(frames) for i in range(13)]
    std = [
        math.sqrt(sum((f[i] - mean[i]) ** 2 for f in frames) / len(frames))
        for i in range(13)
    ]
    return mean + std  # 26-d
```

它离 SOTA 十万八千里——仅供教学。`code/main.py` 使用它在合成说话人数据上完成概念验证。

### 步骤 2：余弦相似度 + 阈值

```python
def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    return dot / (na * nb) if na and nb else 0.0

def verify(enroll, test, threshold=0.75):
    return cosine(enroll, test) >= threshold
```

### 步骤 3：从相似度样本对计算 EER

```python
def eer(same_scores, diff_scores):
    thresholds = sorted(set(same_scores + diff_scores))
    best = (1.0, 1.0, 0.0)  # (fa, fr, threshold)
    for t in thresholds:
        fr = sum(1 for s in same_scores if s < t) / len(same_scores)
        fa = sum(1 for s in diff_scores if s >= t) / len(diff_scores)
        if abs(fa - fr) < abs(best[0] - best[1]):
            best = (fa, fr, t)
    return (best[0] + best[1]) / 2, best[2]
```

返回 `(eer, threshold_at_eer)`，两者都应报告。

### 步骤 4：用 SpeechBrain 构建生产方案

```python
from speechbrain.pretrained import EncoderClassifier

clf = EncoderClassifier.from_hparams(source="speechbrain/spkrec-ecapa-voxceleb")

# enroll: average the embeddings of 3-5 clean samples
enroll = torch.stack([clf.encode_batch(load(x)) for x in enrollment_clips]).mean(0)
# verify
score = clf.similarity(enroll, clf.encode_batch(load("test.wav"))).item()
verdict = score > 0.25   # ECAPA typical threshold; tune on your data
```

### 步骤 5：用 pyannote 做说话人分离

```python
from pyannote.audio import Pipeline

pipe = Pipeline.from_pretrained("pyannote/speaker-diarization-3.1")
diarization = pipe("meeting.wav", num_speakers=None)
for turn, _, speaker in diarization.itertracks(yield_label=True):
    print(f"{turn.start:.1f}–{turn.end:.1f}  {speaker}")
```

## 用于实践

2026 年的技术栈：

| 情况 | 选择 |
|------|------|
| 闭集 1:1 验证、边缘端 | ECAPA-TDNN + 余弦阈值 |
| 开放集验证、云端 | WavLM-SV + AS-norm |
| 说话人分离（会议、播客） | `pyannote/speaker-diarization-3.1` |
| 反欺骗（重放 / 深度伪造检测） | AASIST 或 RawNet2 |
| 微型嵌入式设备（KWS + 注册） | Titanet-Small（NeMo） |

## 陷阱

- **通道不匹配。** 在 VoxCeleb（网络视频）上训练的模型不等同于电话音频模型。务必在目标通道上评估。
- **短语句。** 测试音频低于 3 秒时，EER 会急剧恶化。
- **带噪注册。** 一段嘈杂的注册音频会污染锚点。至少使用 3 个干净样本并取平均。
- **不同条件共用固定阈值。** 务必在目标领域的留出开发集上调整阈值。
- **对未归一化嵌入计算余弦。** 先做 L2 归一化，否则模长会占主导。

## 交付成果

保存为 `outputs/skill-speaker-verifier.md`。选择模型、注册协议、阈值调整计划与防欺诈措施。

## 练习

1. **简单。** 运行 `code/main.py`。它会构建合成“说话人”（不同音调轮廓）、完成注册，并在包含 100 对样本的试验列表上计算 EER。
2. **中等。** 对 30 条 VoxCeleb1 语句（5 位说话人 × 每人 6 条）使用 SpeechBrain ECAPA，比较余弦评分与 PLDA 的 EER。
3. **困难。** 使用 `pyannote.audio` 构建完整的注册 → 说话人分离 → 验证流水线，并在 AMI 开发集上评估 DER。

## 关键术语

| 术语 | 人们通常怎么说 | 实际含义 |
|------|----------------|----------|
| EER | 标题指标 | 错误接受率 = 错误拒绝率时的阈值。 |
| 验证（verification） | 1:1 | “这是 Alice 吗？” |
| 识别（identification） | 1:N | “说话的是谁？” |
| 开放集（open-set） | 可能出现未知者 | 测试集可以包含未注册的说话人。 |
| 注册（enrollment） | 登记 | 计算说话人的参考嵌入。 |
| AAM-softmax | 损失函数 | 带加性角度间隔的 softmax；强制簇间分离。 |
| PLDA | 经典评分 | 概率 LDA；在嵌入之上做似然比评分。 |
| DER | 说话人分离指标 | 说话人分离错误率——漏检 + 误报 + 混淆。 |

## 延伸阅读

- [Snyder 等（2018）. X-Vectors: Robust DNN Embeddings for Speaker Recognition](https://www.danielpovey.com/files/2018_icassp_xvectors.pdf)——经典的深度嵌入论文。
- [Desplanques 等（2020）. ECAPA-TDNN](https://arxiv.org/abs/2005.07143)——2020–2026 年的主导架构。
- [Chen 等（2022）. WavLM: Large-Scale Self-Supervised Pre-Training for Full Stack Speech Processing](https://arxiv.org/abs/2110.13900)——用于说话人验证与分离的 SSL 主干。
- [Bredin 等（2023）. pyannote.audio 3.1](https://github.com/pyannote/pyannote-audio)——生产级说话人分离与嵌入技术栈。
- [VoxCeleb 排行榜（更新至 2026）](https://www.robots.ox.ac.uk/~vgg/data/voxceleb/)——各模型当前 EER 排名。
