---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/07-transformers-deep-dive/09-vision-transformers/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 6ac276b0bbfd15180e9e8850a8a7577f0ff18fa090f4ab545b8a3ad6906b2288
status: reviewed
---

# 视觉 Transformer（ViT）

> 图像是 patch 网格，句子是词元网格。同一个 Transformer 可以吃下二者。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 7 第 05 课（完整 Transformer）、Phase 4 第 03 课（CNN）、Phase 4 第 14 课（视觉 Transformer 入门）  
**预计时间：** 约 45 分钟

## 问题

2020 年以前，计算机视觉就意味着卷积。ImageNet、COCO 和检测基准上的每个 SOTA 都使用 CNN 主干；Transformer 属于语言领域。

Dosovitskiy 等（2020）的论文《An Image is Worth 16x16 Words》证明可以完全去掉卷积。把图像切成固定大小的 patch，将每个 patch 线性投影为嵌入，再把序列送入普通 Transformer 编码器。在规模足够大时（ImageNet-21k 预训练或更大），ViT 可以追平或击败基于 ResNet 的模型。

ViT 开启了 2026 年更广泛的模式：一种架构，多种模态。Whisper 把音频词元化，ViT 把图像词元化，机器人使用动作词元，视频使用像素词元。Transformer 并不在乎——给它一个序列，它就会学习。

到 2026 年，ViT 及其后代（DeiT、Swin、DINOv2、ViT-22B、SAM 3）占据了大部分视觉领域。CNN 仍在边缘设备与延迟敏感任务中胜出；其他技术栈中总能找到某个 ViT。

## 概念 <!-- learning-atlas: the-concept -->

![图像 → patch → 词元 → Transformer](../assets/vit.svg)

### 步骤 1——切分 patch

把 `H × W × C` 图像切成 `N × (P·P·C)` 的扁平 patch 序列。典型设置：`224 × 224` 图像、`16 × 16` patch → 196 个 patch，每个包含 768 个值。

```text
图像 (224, 224, 3) → 由 16x16x3 patch 组成的 14 × 14 网格 → 196 个长度为 768 的向量
```

Patch 大小是调节杆。Patch 越小，词元越多、分辨率越好，注意力成本按二次增长；patch 越大，粒度越粗、成本越低。

### 步骤 2——线性嵌入

用一个学习矩阵把每个扁平 patch 投影到 `d_model`。这等价于核大小为 `P`、步幅为 `P` 的卷积。在 PyTorch 中，它就是 `nn.Conv2d(C, d_model, kernel_size=P, stride=P)`——两行即可实现。

### 步骤 3——前置 `[CLS]` 词元，加入位置嵌入

- 前置一个可学习的 `[CLS]` 词元。它的最终隐藏状态就是用于分类的图像表示。
- 加入可学习位置嵌入（原始 ViT）或二维正弦位置编码（后续变体）。
- 2024 年后，RoPE 被扩展到二维位置，有时无需显式嵌入。

### 步骤 4——标准 Transformer 编码器

堆叠 L 个 `LayerNorm → Self-Attention → + → LayerNorm → MLP → +` 块。与 BERT 完全相同，没有视觉专用层。论文的教学核心结论由此得到。

### 步骤 5——输出头

对于分类：取 `[CLS]` 隐藏状态 → 线性层 → softmax。对于 DINOv2 或 SAM，丢弃 `[CLS]`，直接使用 patch 嵌入。

### 产生重要影响的变体

| 模型 | 年份 | 变化 |
|------|------|------|
| ViT | 2020 | 原始模型。固定 patch 大小，全局完整注意力。 |
| DeiT | 2021 | 蒸馏；只在 ImageNet-1k 上即可训练。 |
| Swin | 2021 | 带移动窗口的分层架构。固定的次二次成本。 |
| DINOv2 | 2023 | 自监督（无标签）。最佳通用视觉特征。 |
| ViT-22B | 2023 | 220 亿参数；扩展定律同样适用。 |
| SigLIP | 2023 | ViT + 语言对，使用 sigmoid 对比损失。 |
| SAM 3 | 2025 | 分割一切；ViT-Large + 可提示掩码解码器。 |

### 为什么它花了一些时间

ViT 没有 CNN 的归纳偏置（平移不变性、局部性），因此需要*大量*数据才能追平 CNN。如果没有超过 1 亿张标注图像或强大的自监督预训练，在相同计算量下 CNN 仍会胜出。DeiT 于 2021 年通过蒸馏技巧修复了这一点；DINOv2 于 2023 年通过自监督永久解决了它。

```figure
n5-patch-stream
```

## 动手实现

参见 `code/main.py`。使用纯标准库完成 patch 切分、线性嵌入和合理性检查。无需训练——任何现实规模的 ViT 都需要 PyTorch 和数小时 GPU 计算。

### 步骤 1：假图像

一个 24 × 24 RGB 图像，以由 `(R, G, B)` 元组组成的行列表表示。使用 6×6 patch → 16 个 patch，每个得到 108 维嵌入向量。

### 步骤 2：切分 patch

```python
def patchify(image, P):
    H = len(image)
    W = len(image[0])
    patches = []
    for i in range(0, H, P):
        for j in range(0, W, P):
            patch = []
            for di in range(P):
                for dj in range(P):
                    patch.extend(image[i + di][j + dj])
            patches.append(patch)
    return patches
```

光栅顺序：在网格中按行优先。每个 ViT 都使用这种顺序。

### 步骤 3：线性嵌入

将每个扁平 patch 乘以一个随机 `(patch_flat_size, d_model)` 矩阵。前置 `[CLS]` 后，验证输出形状为 `(N_patches + 1, d_model)`。

### 步骤 4：计算现实 ViT 的参数量

打印 ViT-Base 的参数量：12 层、12 个头、d=768、patch=16。与 ResNet-50（约 2500 万）比较。ViT-Base 约为 8600 万，ViT-Large 约 3.07 亿，ViT-Huge 约 6.32 亿。

## 用于实践

```python
from transformers import ViTImageProcessor, ViTModel
import torch
from PIL import Image

processor = ViTImageProcessor.from_pretrained("google/vit-base-patch16-224-in21k")
model = ViTModel.from_pretrained("google/vit-base-patch16-224-in21k")

img = Image.open("cat.jpg")
inputs = processor(img, return_tensors="pt")
out = model(**inputs).last_hidden_state   # (1, 197, 768): [CLS] + 196 patches
cls_emb = out[:, 0]                       # image representation
```

**DINOv2 嵌入是 2026 年图像特征的默认方案。** 冻结主干，训练一个微型头。适用于分类、检索、检测、字幕。Meta 的 DINOv2 检查点在每个非文本视觉任务上都优于 CLIP。

**选择 patch 大小。** 小型模型使用 16×16（ViT-B/16）。稠密预测（分割）使用 8×8 或 14×14（SAM、DINOv2）。超大型模型使用 14×14。

## 交付成果

参见 `outputs/skill-vit-configurator.md`。该技能根据数据集大小、分辨率与计算预算，为新的视觉任务选择 ViT 变体与 patch 大小。

## 练习

1. **简单。** 运行 `code/main.py`。验证 patch 数量等于 `(H/P) * (W/P)`，扁平 patch 维度等于 `P*P*C`。
2. **中等。** 实现二维正弦位置嵌入——分别为每个 patch 的 `row` 和 `col` 计算独立正弦编码，再拼接。在微型 PyTorch ViT 中使用它们，并在 CIFAR-10 上与可学习位置嵌入比较准确率。
3. **困难。** 构建三层 ViT（PyTorch），使用 4×4 patch 在 1000 张 MNIST 图像上训练，测量测试准确率。之后在同样 1000 张图像上加入 DINOv2 预训练（简化：只训练编码器根据被遮蔽 patch 预测 patch 嵌入）。准确率是否改善？

## 关键术语

| 术语 | 人们通常怎么说 | 实际含义 |
|------|----------------|----------|
| Patch | “视觉 Transformer 词元” | 图像中一个 `P × P × C` 区域的像素值扁平向量。 |
| Patchify | “切块 + 展平” | 将图像切成不重叠 patch，并把每个展平为向量。 |
| `[CLS]` 词元 | “图像摘要” | 前置的可学习词元；其最终嵌入就是图像表示。 |
| 归纳偏置 | “模型的假设” | ViT 的先验比 CNN 少，需要更多数据弥补差距。 |
| DINOv2 | “自监督 ViT” | 使用图像增强 + 动量教师进行无标签训练。2026 年最佳通用图像特征。 |
| SigLIP | “CLIP 的继任者” | 使用 sigmoid 对比损失训练的 ViT + 文本编码器；相同计算量下优于 CLIP。 |
| Swin | “窗口化 ViT” | 使用局部注意力 + 移动窗口的分层 ViT；次二次复杂度。 |
| 寄存器词元 | “2023 年技巧” | 吸收注意力汇点的少量额外可学习词元；改善 DINOv2 特征。 |

## 延伸阅读

- [Dosovitskiy 等（2020）. An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale](https://arxiv.org/abs/2010.11929)——ViT 论文。
- [Touvron 等（2021）. Training data-efficient image transformers & distillation through attention](https://arxiv.org/abs/2012.12877)——DeiT。
- [Liu 等（2021）. Swin Transformer: Hierarchical Vision Transformer using Shifted Windows](https://arxiv.org/abs/2103.14030)——Swin。
- [Oquab 等（2023）. DINOv2: Learning Robust Visual Features without Supervision](https://arxiv.org/abs/2304.07193)——DINOv2。
- [Darcet 等（2023）. Vision Transformers Need Registers](https://arxiv.org/abs/2309.16588)——DINOv2 的寄存器词元修复。
