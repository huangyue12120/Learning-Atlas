---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/04-computer-vision/19-ocr-document-understanding/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 7d3780797a294b83dc498521397a2dba8c180ef07541faaa5092d6ad655e714e
status: reviewed
---

# OCR 与文档理解

> OCR 是三阶段流水线——检测文本框、识别字符、再进行版面布局。每种现代 OCR 系统都会重排或合并这些阶段。

**类型：** 学习 + 使用  
**学习实现：** Python  
**前置课程：** Phase 4 第 06 课（检测）、Phase 7 第 02 课（自注意力）  
**预计时间：** 约 45 分钟

## 学习目标

- 追踪经典 OCR 流水线（检测 → 识别 → 布局）与现代端到端替代方案（Donut、Qwen-VL-OCR）。
- 为序列到序列 OCR 训练实现 CTC（Connectionist Temporal Classification）损失。
- 使用 PaddleOCR 或 EasyOCR 进行生产文档解析，无需训练。
- 区分 OCR、版面解析和文档理解，并为每项任务选择正确工具。

## 问题

充满文本的图像无处不在：收据、发票、身份证、扫描书籍、表单、白板、标志牌、截图。从它们提取结构化数据——不仅是字符，更包括“这是总金额”——是最具价值的应用视觉问题之一。

该领域分为三个技能层：

1. **真正的 OCR**：将像素变成文本。
2. **版面解析**：将 OCR 输出分组为区域（标题、正文、表格、页眉）。
3. **文档理解**：从版面提取结构化字段（`"invoice_total = $42.50"`）。

每层都有经典和现代方法；“我想从图像得到文字”与“我需要这张收据的总金额”之间的差距，比多数团队意识到的更大。

## 概念

### 经典流水线

```mermaid
flowchart LR
    IMG["图像"] --> DET["文本检测<br/>（DB、EAST、CRAFT）"]
    DET --> BOX["词/行<br/>边界框"]
    BOX --> CROP["裁剪每个区域"]
    CROP --> REC["识别<br/>（CRNN + CTC）"]
    REC --> TXT["文本字符串"]
    TXT --> LAY["版面<br/>排序"]
    LAY --> OUT["按阅读顺序的文本"]

    style DET fill:#dbeafe,stroke:#2563eb
    style REC fill:#fef3c7,stroke:#d97706
    style OUT fill:#dcfce7,stroke:#16a34a
```

- **文本检测**产生逐行或逐词的四边形。
- **识别**将每个区域裁剪至固定高度，运行 CNN + BiLSTM + CTC，得到字符序列。
- **布局**重建阅读顺序（拉丁文字自上而下、自左而右；阿拉伯语、日语不同）。

### 用一段话理解 CTC

OCR 识别从固定长度特征图产生可变长度序列。CTC（Graves 等，2006）让你无需字符级对齐即可训练。模型在每个时间步输出对（词表 + blank）的分布；CTC 损失会对所有这样的对齐求边缘化：合并重复项、去除 blank 后可还原为目标文本。

```text
原始输出："h h h _ _ e e l l _ l l o _ _"
合并重复并移除 blank 后："hello"
```

CTC 是 CRNN 在 2015 年成功的原因，也是 2026 年多数生产 OCR 模型仍以其训练的原因。

### 现代端到端模型

- **Donut**（Kim 等，2022）——ViT 编码器 + 文本解码器；读取图像并直接输出 JSON。没有文本检测器，也没有布局模块。
- **TrOCR**——面向行级 OCR 的 ViT + transformer 解码器。
- **Qwen-VL-OCR / InternVL**——为 OCR 任务微调的完整视觉语言模型；2026 年在复杂文档上准确率最佳。
- **PaddleOCR**——成熟生产包中的经典 DB + CRNN 流水线；仍是开源主力。

端到端模型需要更多数据和计算，却跳过了多阶段流水线的误差累积。

### 版面解析

对于结构化文档，运行版面检测器（LayoutLMv3、DocLayNet），为每个区域标注 Title、Paragraph、Figure、Table、Footnote。阅读顺序随后就是“按版面顺序迭代区域并拼接”。

对于表单，使用**键值提取**模型（视觉丰富文档用 Donut，普通扫描件用 LayoutLMv3）。它们接受图像 + 检测文字 + 位置，并预测结构化键值对。

### 评估指标

- **字符错误率（CER）**——Levenshtein 距离 / 参考文本长度，越低越好。生产目标：清晰扫描件上 < 2%。
- **词错误率（WER）**——词级版本。
- **结构化字段 F1**——用于键值任务，衡量 `{invoice_total: 42.50}` 是否正确出现。
- **JSON 编辑距离**——用于端到端文档解析；Donut 论文提出归一化树编辑距离。

```figure
cv3-ctc-collapse
```

## 动手实现

### 步骤 1：CTC 损失 + 贪心解码器

```python
import torch
import torch.nn as nn
import torch.nn.functional as F


def ctc_loss(log_probs, targets, input_lengths, target_lengths, blank=0):
    """
    log_probs:      (T, N, C) log-softmax over vocab including blank at index 0
    targets:        (N, S) int targets (no blanks)
    input_lengths:  (N,) per-sample time steps used
    target_lengths: (N,) per-sample target length
    """
    return F.ctc_loss(log_probs, targets, input_lengths, target_lengths,
                      blank=blank, reduction="mean", zero_infinity=True)


def greedy_ctc_decode(log_probs, blank=0):
    """
    log_probs: (T, N, C) log-softmax
    returns: list of index sequences (blanks removed, repeats merged)
    """
    preds = log_probs.argmax(dim=-1).transpose(0, 1).cpu().tolist()
    out = []
    for seq in preds:
        decoded = []
        prev = None
        for idx in seq:
            if idx != prev and idx != blank:
                decoded.append(idx)
            prev = idx
        out.append(decoded)
    return out
```

`F.ctc_loss` 在可用时使用高效的 CuDNN 实现。贪心解码器比 beam search 更简单，CER 通常只相差 1% 以内。

### 步骤 2：微型 CRNN 识别器

用于行 OCR 的最小 CNN + BiLSTM。

```python
class TinyCRNN(nn.Module):
    def __init__(self, vocab_size=40, hidden=128, feat=32):
        super().__init__()
        self.cnn = nn.Sequential(
            nn.Conv2d(1, feat, 3, 1, 1), nn.BatchNorm2d(feat), nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            nn.Conv2d(feat, feat * 2, 3, 1, 1), nn.BatchNorm2d(feat * 2), nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            nn.Conv2d(feat * 2, feat * 4, 3, 1, 1), nn.BatchNorm2d(feat * 4), nn.ReLU(inplace=True),
            nn.MaxPool2d((2, 1)),
            nn.Conv2d(feat * 4, feat * 4, 3, 1, 1), nn.BatchNorm2d(feat * 4), nn.ReLU(inplace=True),
            nn.MaxPool2d((2, 1)),
        )
        self.rnn = nn.LSTM(feat * 4, hidden, bidirectional=True, batch_first=True)
        self.head = nn.Linear(hidden * 2, vocab_size)

    def forward(self, x):
        # x: (N, 1, H, W)
        f = self.cnn(x)                # (N, C, H', W')
        f = f.mean(dim=2).transpose(1, 2)  # (N, W', C)
        h, _ = self.rnn(f)
        return F.log_softmax(self.head(h).transpose(0, 1), dim=-1)  # (W', N, vocab)
```

输入高度固定（CNN 将高度最大池化到 1）。宽度是 CTC 的时间维度。

### 步骤 3：合成 OCR

生成白底黑字的数字字符串，进行端到端 smoke test。

```python
import numpy as np

def synthetic_line(text, height=32, char_width=16):
    W = char_width * len(text)
    img = np.ones((height, W), dtype=np.float32)
    for i, c in enumerate(text):
        x = i * char_width
        shade = 0.0 if c.isalnum() else 0.5
        img[6:height - 6, x + 2:x + char_width - 2] = shade
    return img


def build_batch(strings, vocab):
    H = 32
    W = 16 * max(len(s) for s in strings)
    imgs = np.ones((len(strings), 1, H, W), dtype=np.float32)
    target_lengths = []
    targets = []
    for i, s in enumerate(strings):
        imgs[i, 0, :, :16 * len(s)] = synthetic_line(s)
        ids = [vocab.index(c) for c in s]
        targets.extend(ids)
        target_lengths.append(len(ids))
    return torch.from_numpy(imgs), torch.tensor(targets), torch.tensor(target_lengths)


vocab = ["_"] + list("0123456789abcdefghijklmnopqrstuvwxyz")
imgs, targets, lengths = build_batch(["hello", "world"], vocab)
print(f"images: {imgs.shape}   targets: {targets.shape}   lengths: {lengths.tolist()}")
```

真实 OCR 数据集会增加字体、噪声、旋转、模糊和颜色。上方流水线完全相同。

### 步骤 4：训练草图

```python
model = TinyCRNN(vocab_size=len(vocab))
opt = torch.optim.Adam(model.parameters(), lr=1e-3)

for step in range(200):
    strings = ["abc" + str(step % 10)] * 4 + ["xyz" + str((step + 1) % 10)] * 4
    imgs, targets, target_lens = build_batch(strings, vocab)
    log_probs = model(imgs)  # (W', 8, vocab)
    input_lens = torch.full((8,), log_probs.size(0), dtype=torch.long)
    loss = ctc_loss(log_probs, targets, input_lens, target_lens, blank=0)
    opt.zero_grad(); loss.backward(); opt.step()
```

这种简单合成数据上，损失在 200 步内应从约 3 降至约 0.2。

## 使用现成工具

三条生产路径：

- **PaddleOCR**——成熟、快速、多语言。一行即可用：`paddleocr.PaddleOCR(lang="en").ocr(image_path)`。
- **EasyOCR**——Python 原生、多语言、PyTorch 骨干。
- **Tesseract**——经典方案；模型困难时对旧扫描文档仍有用。

端到端文档解析可使用 Donut 或 VLM：

```python
from transformers import DonutProcessor, VisionEncoderDecoderModel

processor = DonutProcessor.from_pretrained("naver-clova-ix/donut-base-finetuned-cord-v2")
model = VisionEncoderDecoderModel.from_pretrained("naver-clova-ix/donut-base-finetuned-cord-v2")
```

对于结构可重复的收据、发票和表单，可微调 Donut；对于任意文档或需要 OCR 推理的任务，Qwen-VL-OCR 一类 VLM 是当前默认选择。

## 交付产物

本课产出：

- `outputs/prompt-ocr-stack-picker.md`——根据文档类型、语言和结构选择 Tesseract / PaddleOCR / Donut / VLM-OCR 的提示词。
- `outputs/skill-ctc-decoder.md`——从零编写贪心和 beam-search CTC 解码器（含长度归一化）的技能。

## 练习

1. **（简单）** 在 5 位随机数字字符串上训练 TinyCRNN 500 步，报告保留集 CER。
2. **（中等）** 将贪心解码替换为 beam search（`beam_width=5`），报告 CER 差异。在哪些输入上 beam search 胜出？
3. **（困难）** 在 20 张收据上运行 PaddleOCR，提取行项目，并针对手工标注真值的 `{item_name, price}` 对计算 F1。

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|------|----------|----------|
| OCR | “从像素得到文字” | 将图像区域转变为字符序列 |
| CTC | “无需对齐的损失” | 无须逐时间步标签即可训练序列模型的损失；对对齐方式求边缘化 |
| CRNN | “经典 OCR 模型” | 卷积特征提取器 + BiLSTM + CTC；2015 年基线至今仍用于生产 |
| Donut | “端到端 OCR” | ViT 编码器 + 文本解码器；直接由图像输出 JSON |
| 版面解析（Layout parsing） | “寻找区域” | 在文档中检测并标记标题/表格/图片/段落区域 |
| 阅读顺序（Reading order） | “文本序列” | 将识别区域排为句子的顺序；拉丁文字简单，混合版面不简单 |
| CER / WER | “错误率” | 字符或词粒度的 Levenshtein 距离 / 参考长度 |
| VLM-OCR | “会读图的 LLM” | 为 OCR 任务训练或提示的视觉语言模型；复杂文档上的当前 SOTA |

## 延伸阅读

- [CRNN（Shi 等，2015）](https://arxiv.org/abs/1507.05717)——原始 CNN+RNN+CTC 架构。
- [CTC（Graves 等，2006）](https://www.cs.toronto.edu/~graves/icml_2006.pdf)——原始 CTC 论文，密集包含算法思想。
- [Donut（Kim 等，2022）](https://arxiv.org/abs/2111.15664)——无 OCR 文档理解 transformer。
- [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)——开源生产 OCR 技术栈。
