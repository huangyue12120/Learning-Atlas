---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/04-computer-vision/14-vision-transformers/docs/en.md
  revision: d0ac5d9f8abb205b1f6cffd5f71cb6d2816ee051
  sha256: 170c3c598b6f80c58cf371afa9002b5fb47bd4fbeaa9400b84293afee02eb2c0
status: reviewed
---

# 视觉 Transformer（ViT）

> 将图像切成图块，把每个图块当作一个词，再用标准 transformer 处理这些图块。

**类型：** 构建  
**学习实现：** Python  
**前置课程：** Phase 7 第 02 课（自注意力）、Phase 4 第 04 课（图像分类）  
**预计时间：** 约 45 分钟

## 学习目标

- 从零实现图块嵌入、可学习位置嵌入、类别词元和 transformer 编码器块，构建最小 ViT。
- 解释为何 ViT 起初被认为需要海量预训练数据，直到 DeiT 和 MAE 证明并非如此。
- 按架构先验比较 ViT、Swin 和 ConvNeXt：无先验、局部窗口注意力、卷积骨干。
- 使用 `timm` 和标准的线性探测 / 微调配方，在小数据集上微调预训练 ViT。

## 问题

十年来，卷积一直是计算机视觉的主流方法。CNN 具有局部性、平移等变性等强归纳偏置，曾被认为很难取代。随后 Dosovitskiy 等（2020）证明：把普通 transformer 应用于展平的图像图块，完全不使用卷积机制，也能在规模足够大时匹敌甚至超越最佳 CNN。

关键在于“规模足够大”。在 ImageNet-1k 上训练的 ViT 不如 ResNet；先在 ImageNet-21k 或 JFT-300M 预训练、再在 ImageNet-1k 微调的 ViT 则胜过 ResNet。结论是 transformer 缺少有用的先验，却能从足够多的数据中学习这些先验。后续工作（DeiT、MAE、DINO）表明，采用正确的训练配方——强增强、自监督预训练、蒸馏——ViT 也能在小数据上良好训练。

到 2026 年，纯 CNN 在边缘设备上仍具竞争力，transformer 则广泛用于分割（Mask2Former、SegFormer）、检测（DETR、RT-DETR）、多模态（CLIP、SigLIP）和视频（VideoMAE、VJEPA）。理解 ViT 块结构有助于比较这些架构。

## 概念

### 流水线

```mermaid
flowchart LR
    IMG["图像<br/>(3, 224, 224)"] --> PATCH["图块嵌入<br/>16x16、步长 16 的卷积<br/>-> (768, 14, 14)"]
    PATCH --> FLAT["展平为<br/>(196, 768) 个词元"]
    FLAT --> CAT["在前面添加<br/>[CLS] 词元"]
    CAT --> POS["加入可学习的<br/>位置嵌入"]
    POS --> ENC["N 个 transformer<br/>编码器块"]
    ENC --> CLS["取 [CLS]<br/>词元输出"]
    CLS --> HEAD["MLP 分类器"]

    style PATCH fill:#dbeafe,stroke:#2563eb
    style ENC fill:#fef3c7,stroke:#d97706
    style HEAD fill:#dcfce7,stroke:#16a34a
```

共七步：图块 → 词元 → 注意力 → 分类器。每个变体（DeiT、Swin、ConvNeXt、MAE 预训练）都只改动其中一两步，其余保持不变。

### 图块嵌入

第一个卷积是关键。卷积核大小为 16、步长为 16，因此 224x224 图像会变成 14x14 的 16x16 图块网格，每个图块被投影为一个 768 维嵌入。这个卷积同时完成图块化和线性投影。

```text
输入：  (3, 224, 224)
卷积（3 -> 768，k=16，s=16，无 padding）：
输出：  (768, 14, 14)
展平空间维度： (196, 768)
```

196 个图块就是 196 个词元。每个词元的特征维度为 768（ViT-B）、1024（ViT-L）或 1280（ViT-H）。

### 类别词元

在序列前添加一个单独的可学习向量：

```text
tokens = [CLS; patch_1; patch_2; ...; patch_196]   shape (197, 768)
```

经过 N 个 transformer 块后，`[CLS]` 输出就是全局图像表示。分类头只读取这个向量。

### 位置嵌入

transformer 没有内置的空间位置概念。为每个词元加入一个可学习向量：

```text
tokens = tokens + learned_pos_embedding   （形状也为 (197, 768)）
```

该嵌入是模型参数；基于梯度的训练会让它适应二维图像结构。正弦式 2D 替代方案也存在，但实践中很少使用。

### Transformer 编码器块

标准结构：多头自注意力、MLP、残差连接、Pre-LayerNorm。

```text
x = x + MSA(LN(x))
x = x + MLP(LN(x))

MLP 为带 GELU 的两层网络：Linear(d -> 4d) -> GELU -> Linear(4d -> d)
```

ViT-B/16 堆叠 12 个此类块，每块有 12 个注意力头，共计 8600 万参数。

### 为什么使用 Pre-LN

早期 transformer 使用 Post-LN（`x = LN(x + sublayer(x))`），超过 6–8 层后若无预热便难以训练。Pre-LN（`x = x + sublayer(LN(x))`）可稳定地训练更深网络而无需预热，因此被许多 ViT 和现代 LLM 采用。

### 图块大小的权衡

- 16x16 图块 → 196 个词元，标准设置。
- 32x32 图块 → 49 个词元，更快但分辨率更低。
- 8x8 图块 → 784 个词元，更精细但 `O(n^2)` 注意力成本增长很糟糕。

更大的图块 = 更少的词元 = 更快，但空间细节更少。SwinV2 在层级窗口中使用 4x4 图块。

### DeiT 在 ImageNet-1k 上训练 ViT 的配方

原始 ViT 需要 JFT-300M 才能胜过 CNN。DeiT（Touvron 等，2020）仅使用 ImageNet-1k，借助四项改动便将 ViT-B 训练至 81.8% top-1：

1. 强数据增强：RandAugment、Mixup、CutMix、随机擦除。
2. 随机深度（训练时随机丢弃整个块）。
3. 重复增强（同一图像每个 batch 采样 3 次）。
4. 来自 CNN 教师的蒸馏（可选，能进一步提高准确率）。

每种现代 ViT 训练配方都源自 DeiT。

### Swin 与 ConvNeXt

- **Swin**（Liu 等，2021）——基于窗口的注意力。每个块只关注局部窗口；相邻块移动窗口，从而在窗口之间混合信息。它在保留注意力算子的同时，重新引入了 CNN 式的局部性先验。
- **ConvNeXt**（Liu 等，2022）——重新设计的 CNN，采用与 Swin 相同的架构选择（深度可分离卷积、LayerNorm、GELU、倒置瓶颈）。它表明差距不在“注意力还是卷积”，而在“现代训练配方加架构”。

2026 年，ConvNeXt-V2 和 Swin-V2 都达到生产级；正确选择取决于推理技术栈（ConvNeXt 更适合为边缘端编译）和预训练语料。

### MAE 预训练

掩码自编码器（Masked Autoencoder，He 等，2022）：随机遮住 75% 的图块，训练编码器只处理可见的 25%，再训练一个小解码器，根据编码器输出重建被遮住的图块。预训练后丢弃解码器并微调编码器。

MAE 让 ViT 可以仅在 ImageNet-1k 上训练，达到 SOTA，且是当前默认的自监督配方。

```figure
batchnorm-inference
```

## 动手实现

### 步骤 1：图块嵌入

```python
import torch
import torch.nn as nn

class PatchEmbedding(nn.Module):
    def __init__(self, in_channels=3, patch_size=16, dim=192, image_size=64):
        super().__init__()
        assert image_size % patch_size == 0
        self.proj = nn.Conv2d(in_channels, dim, kernel_size=patch_size, stride=patch_size)
        num_patches = (image_size // patch_size) ** 2
        self.num_patches = num_patches

    def forward(self, x):
        x = self.proj(x)
        return x.flatten(2).transpose(1, 2)
```

图像转词元只需一个卷积、一次展平和一次转置。

### 步骤 2：Transformer 块

使用 Pre-LN、多头自注意力、带 GELU 的 MLP 和残差连接。

```python
class Block(nn.Module):
    def __init__(self, dim, num_heads, mlp_ratio=4, dropout=0.0):
        super().__init__()
        self.ln1 = nn.LayerNorm(dim)
        self.attn = nn.MultiheadAttention(dim, num_heads, dropout=dropout, batch_first=True)
        self.ln2 = nn.LayerNorm(dim)
        self.mlp = nn.Sequential(
            nn.Linear(dim, dim * mlp_ratio),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(dim * mlp_ratio, dim),
            nn.Dropout(dropout),
        )

    def forward(self, x):
        a, _ = self.attn(self.ln1(x), self.ln1(x), self.ln1(x), need_weights=False)
        x = x + a
        x = x + self.mlp(self.ln2(x))
        return x
```

`nn.MultiheadAttention` 负责拆分注意力头、缩放点积和输出投影。`batch_first=True`，因此形状为 `(N, seq, dim)`。

### 步骤 3：ViT

```python
class ViT(nn.Module):
    def __init__(self, image_size=64, patch_size=16, in_channels=3,
                 num_classes=10, dim=192, depth=6, num_heads=3, mlp_ratio=4):
        super().__init__()
        self.patch = PatchEmbedding(in_channels, patch_size, dim, image_size)
        num_patches = self.patch.num_patches
        self.cls_token = nn.Parameter(torch.zeros(1, 1, dim))
        self.pos_embed = nn.Parameter(torch.zeros(1, num_patches + 1, dim))
        self.blocks = nn.ModuleList([
            Block(dim, num_heads, mlp_ratio) for _ in range(depth)
        ])
        self.ln = nn.LayerNorm(dim)
        self.head = nn.Linear(dim, num_classes)
        nn.init.trunc_normal_(self.pos_embed, std=0.02)
        nn.init.trunc_normal_(self.cls_token, std=0.02)

    def forward(self, x):
        x = self.patch(x)
        cls = self.cls_token.expand(x.size(0), -1, -1)
        x = torch.cat([cls, x], dim=1)
        x = x + self.pos_embed
        for blk in self.blocks:
            x = blk(x)
        x = self.ln(x[:, 0])
        return self.head(x)

vit = ViT(image_size=64, patch_size=16, num_classes=10, dim=192, depth=6, num_heads=3)
x = torch.randn(2, 3, 64, 64)
print(f"output: {vit(x).shape}")
print(f"params: {sum(p.numel() for p in vit.parameters()):,}")
```

这个微型 ViT 约有 280 万参数，可以在 CPU 上运行。标准 ViT-B 有 8600 万参数；使用同一类定义，但设为 `dim=768, depth=12, num_heads=12`。

### 步骤 4：合理性检查——单图推理

```python
logits = vit(torch.randn(1, 3, 64, 64))
print(f"logits: {logits}")
print(f"probs:  {logits.softmax(-1)}")
```

应无报错地运行，且概率之和为 1。

## 使用现成工具

`timm` 为每种 ViT 变体提供 ImageNet 预训练权重，只需一行：

```python
import timm

model = timm.create_model("vit_base_patch16_224", pretrained=True, num_classes=10)
```

`timm` 是 2026 年生产中视觉 transformer 的默认选择。它以同一 API 支持 ViT、DeiT、Swin、Swin-V2、ConvNeXt、ConvNeXt-V2、MaxViT、MViT、EfficientFormer 以及数十种其他模型。

多模态工作（图像 + 文本）可使用 `transformers` 提供的 CLIP、SigLIP、BLIP-2、LLaVA；它们的图像编码器全都是某种 ViT 变体。

## 交付产物

本课产出：

- `outputs/prompt-vit-vs-cnn-picker.md`——依据数据集大小、计算资源和推理技术栈，在 ViT、ConvNeXt 与 Swin 之间选择的提示词。
- `outputs/skill-vit-patch-and-pos-embed-inspector.md`——验证 ViT 的图块嵌入和位置嵌入形状是否匹配模型预期序列长度、捕获最常见移植 bug 的技能。

## 练习

1. **（简单）** 打印上方微型 ViT 一次前向传播中每个中间张量的形状。确认：输入 `(N, 3, 64, 64)` → 图块 `(N, 16, 192)` → 加 CLS 后 `(N, 17, 192)` → 分类器输入 `(N, 192)` → 输出 `(N, num_classes)`。
2. **（中等）** 在第 4 课的 synthetic-CIFAR 数据集上微调预训练 `timm` ViT-S/16，并与同一数据上的 ResNet-18 微调比较。报告训练时间和最终准确率。
3. **（困难）** 为微型 ViT 实现 MAE 预训练：遮住 75% 图块，训练编码器和小解码器重建被遮住图块。评估预训练前后合成数据上的线性探测准确率。

## 关键术语

| 术语 | 常见说法 | 实际含义 |
|------|----------|----------|
| 图块嵌入（Patch embedding） | “第一个卷积” | kernel size = stride = 图块大小的卷积，将图像转为词元嵌入网格 |
| 类别词元（Class 词元） | “[CLS]” | 添加到词元序列前的可学习向量；最终输出是全局图像表示 |
| 位置嵌入（Positional embedding） | “可学习位置编码” | 加入每个词元的可学习向量，使 transformer 知道图块来自哪里 |
| Pre-LN | “子层前的 LayerNorm” | 稳定的 transformer 变体：`x + sublayer(LN(x))`，而非 `LN(x + sublayer(x))` |
| 多头注意力（Multi-head attention） | “并行注意力” | 标准 transformer 注意力，被拆成 num_heads 个独立子空间，随后拼接 |
| ViT-B/16 | “Base，图块 16” | 规范尺寸：dim=768、depth=12、heads=12、patch_size=16、image=224；约 8600 万参数 |
| DeiT | “数据高效的 ViT” | 仅用强增强在 ImageNet-1k 上训练 ViT；证明并非一定需要大型预训练数据集 |
| MAE | “掩码自编码器” | 自监督预训练：遮住 75% 图块并重建；主流 ViT 预训练配方 |

## 延伸阅读

- [An Image is Worth 16x16 Words（Dosovitskiy 等，2020）](https://arxiv.org/abs/2010.11929)——ViT 论文。
- [DeiT：Data-efficient Image Transformers（Touvron 等，2020）](https://arxiv.org/abs/2012.12877)——如何只用 ImageNet-1k 训练 ViT。
- [Masked Autoencoders are Scalable Vision Learners（He 等，2022）](https://arxiv.org/abs/2111.06377)——MAE 预训练。
- [timm 文档](https://huggingface.co/docs/timm)——生产中会使用的各类视觉 transformer 参考。
