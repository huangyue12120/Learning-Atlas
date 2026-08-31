---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/12-multimodal-ai/02-clip-contrastive-pretraining/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 802bc398424324f3a203a4f8f468f1e21d327372a1a273db23dbe2d675d6d07d
status: reviewed
---

# CLIP 与对比式视觉—语言预训练

> OpenAI 的 CLIP（2021）证明了一个足以影响随后五年的简单想法：只用带噪声的网络图像—标题对和对比损失，就能把图像编码器与文本编码器对齐到同一个向量空间。不需要任何监督标签。4 亿个图文对。由此得到的嵌入空间可以做零样本分类、图文检索，并且能作为 2026 年每个 VLM 的视觉塔。SigLIP 2（2025）用 sigmoid 替代了 softmax，以更低成本超过了 CLIP 的规模。本课从 InfoNCE 讲到 sigmoid 成对损失，并用标准库 Python 构建训练步骤。

**类型：** 构建
**语言：** Python（标准库，InfoNCE + sigmoid 损失实现）
**前置课程：** Phase 12 · 01（ViT 图像块）、Phase 7（Transformer）
**预计时间：** 约 180 分钟

## 学习目标

- 从互信息推导 InfoNCE 损失，并实现数值稳定的向量化版本。
- 解释 sigmoid 成对损失（SigLIP）为什么能扩展到 32768+ 的批量，而不需要 softmax 所要求的 all-gather 开销。
- 通过构造文本模板（`a photo of a {class}`）并对余弦相似度取 argmax，运行零样本 ImageNet 分类。
- 说出 CLIP / SigLIP 预训练提供的四个控制杆：批量大小、温度、提示词模板和数据质量。

## 问题

CLIP 之前的视觉模型是监督式的。收集带标签的数据集（ImageNet：120 万张图像、1000 个类别），训练一个 CNN，然后发布。标签昂贵，标签会偏向标注者能够达成共识的内容，而且标签不能在不微调的情况下迁移到新任务。

图像—标题网络数据中有十亿以上的松散标注图文对，而且可以免费获得。一张金毛寻回犬的照片配有替代文本“我家 Max 在公园里”，这就携带了监督信号——文字描述了图像。问题是：能否把它变成有用的训练？

CLIP 的答案是：把图像—标题对视为匹配任务。给定一个包含 N 张图像和 N 条标题的批量，学习让每张图像匹配自己的标题，同时与 N-1 个干扰项区分开。监督信号是“这两个东西属于一起；那 N-1 个不属于一起”。没有类别标签，没有人工标注，只有对比损失。

得到的嵌入空间能做的事情超出了 CLIP 的训练目标。零样本 ImageNet 有效，是因为“a photo of a cat”的嵌入会靠近从未被明确标注为猫的猫图片。这就是催生 2026 年每个 VLM 的那场押注。

## 概念 <!-- learning-atlas: the-concept -->

### 双编码器

CLIP 有两个塔：

- 图像编码器 `f`：ViT 或 ResNet，为每张图像输出一个 D 维向量。
- 文本编码器 `g`：小型 Transformer，为每条标题输出一个 D 维向量。

两个塔都会把输出归一化为单位长度。由于两者都是单位范数，图像与文本的相似度为 `cos(f(x), g(y)) = f(x)^T g(y)`。

对于包含 N 个（图像、标题）对的批量，构造形状为 `(N, N)` 的相似度矩阵 `S`：

```
S[i, j] = cos(f(x_i), g(y_j)) / tau
```

其中 `tau` 是学习得到的温度（CLIP 将其初始化为 0.07，并在 log 空间中学习）。

### InfoNCE 损失

CLIP 对行和列使用对称的交叉熵：

```
loss_i2t = CE(S, labels=identity)     # 每张图像的正样本是它自己的标题
loss_t2i = CE(S^T, labels=identity)   # 每条标题的正样本是它自己的图像
loss = (loss_i2t + loss_t2i) / 2
```

这就是 InfoNCE。CE 中的 softmax 强迫每张图像与自己的标题匹配得比批量中的其他标题更好。“负样本”就是批量中的所有其他项目。批量越大，负样本越多，信号越强。CLIP 训练时的批量为 32k；规模很重要。

### 温度

`tau` 控制 softmax 的尖锐程度。低 tau → 分布尖锐，产生困难负样本挖掘效果；高 tau → 分布柔和，所有样本都会参与。CLIP 学习 `log(1/tau)`，并裁剪它以防止坍塌。SigLIP 2 固定初始 tau，改为学习一个偏置。

### 为什么 sigmoid 更容易扩展（SigLIP）

Softmax 需要整个相似度矩阵保持同步。在分布式训练中，必须把每个嵌入 all-gather 到每个副本，然后计算 softmax。这使通信成本随世界大小呈二次增长。

SigLIP 用逐元素 sigmoid 替代 softmax：对于每个对 `(i, j)`，损失是一个二分类问题：“这是否是匹配的一对？”正类标签是对角线上的元素，其余所有元素都是负类。损失为：

```
L = -1/N sum over (i, j) [ y_ij log sigmoid(S[i,j]) + (1-y_ij) log sigmoid(-S[i,j]) ]
```

`y_ij = 1` 当且仅当 `i == j`，否则为 0。每一对的损失彼此独立，不需要 all-gather。每个 GPU 计算自己的局部块并求和。在 CLIP 需要按比例增加通信的地方，SigLIP 2 能以较低成本扩展到 32k–512k 的批量。

### 零样本分类

给定 N 个类别名称，为每个类别构造一个文本模板：

```
"a photo of a {class}"
```

用文本编码器嵌入每个模板，再用图像编码器嵌入输入图像。余弦相似度最大的类别就是预测类别。不需要在目标类别上训练。

提示词模板很重要。CLIP 原论文为每个类别使用了 80 个模板（普通、艺术、照片、绘画等），然后对嵌入求平均，ImageNet 准确率提高了 3 个百分点。现代用法通常选择一个或两个模板。

### 线性探针与微调

零样本是一个基线。在冻结 CLIP 特征之上为目标类别训练一个线性层的线性探针，在域内任务上会超过零样本。完整微调在域内会超过线性探针，但可能损害零样本迁移。三种方案对应三种取舍。

### SigLIP 2：NaFlex 与稠密特征

SigLIP 2（2025）新增：
- NaFlex：单个模型处理可变的宽高比和分辨率。
- 更好的分割与深度估计稠密特征，目标是作为 VLM 中冻结的骨干。
- 多语言：在 100 多种语言上训练，而 CLIP 只有英语。
- 10 亿参数规模，而 CLIP 的上限是 4 亿参数。

在 2026 年的开放 VLM 中，SigLIP 2 SO400m/14 是默认视觉塔。当具体的 LAION-2B 训练分布与查询模式相匹配时，CLIP 仍是纯图文检索的默认选择。

### ALIGN、BASIC、OpenCLIP、EVA-CLIP

ALIGN（Google，2021）：与 CLIP 相同的想法，规模为 18 亿图文对，其中 90% 带噪声，证明了带噪数据也能扩展。OpenCLIP（LAION）：在 LAION-400M / 2B 上对 CLIP 的开放复现，具有多个规模，是最常用的开放检查点。EVA-CLIP：从掩码图像建模初始化，是 VLM 的强力骨干。BASIC：Google 的 CLIP+ALIGN 混合体。它们属于同一个家族，只是数据和调优方式不同。

### 零样本上限

CLIP 类模型的 ImageNet 零样本准确率大约封顶在 76%（CLIP-G、OpenCLIP-G）。继续提升要么需要大得多的数据（SigLIP 2 达到 80%+），要么需要架构变化（监督头、更多参数）。这个基准正在饱和；真正的价值在于下游 VLM 消费的嵌入空间。

```figure
multimodal-fusion
```

## 使用它

`code/main.py` 实现：

1. 一个玩具双编码器（基于哈希的图像特征、基于文本字符的特征），让你无需 numpy 就能看到 InfoNCE 的形状。
2. 纯 Python 的 InfoNCE 损失（通过 log-sum-exp 保持数值稳定）。
3. 用于对比的 sigmoid 成对损失。
4. 一个零样本分类流程：计算图像与一组文本提示词之间的余弦相似度，并取 argmax 作为预测。

运行它并观察损失曲线。绝对数值是玩具级的，但形状与真正 CLIP 训练器输出的形状一致。

## 交付成果

本课生成 `outputs/skill-clip-zero-shot.md`。给定一组图像（通过路径）和目标类别列表，它会使用 CLIP 模板构造文本提示词，使用指定的检查点（例如 `openai/clip-vit-large-patch14`）嵌入两侧，并返回带相似度分数的 top-1 / top-5 预测。这个技能拒绝对提示词列表中没有的类别做出判断。

## 练习

1. 手算一个包含 4 对样本的 InfoNCE。构造 4x4 相似度矩阵，运行 softmax，取出对角线，再计算交叉熵。将你的 Python 实现与手算结果核对。

2. SigLIP 除了温度还使用偏置参数 `b`：`S'[i,j] = S[i,j]/tau + b`。当批量存在严重类别不平衡时（每行的负样本远多于正样本），`b` 起什么作用？阅读 SigLIP 第 3 节（arXiv:2303.15343）。

3. 为猫与狗构建一个零样本分类器。尝试两个提示词模板：`a photo of a {class}` 和 `a picture of a {class}`。在 100 张测试图像上测量准确率。模板集成是否超过单个模板？

4. 计算在 512 个 GPU、批量 32k 的运行中，softmax InfoNCE 与 sigmoid 成对损失的通信成本。哪一个按 O(N) 扩展，哪一个按 O(N^2) 扩展？引用 SigLIP 第 4 节。

5. 阅读 OpenCLIP 缩放定律论文（arXiv:2212.07143，Cherti 等）。从图中复现其关于数据缩放的结论：在模型规模固定时，ImageNet 零样本准确率与训练数据规模之间的对数线性关系是什么？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| InfoNCE | “对比损失” | 在批量相似度矩阵上计算的交叉熵；每个项目的正样本是与它配对的项目，其他一切都是负样本 |
| Sigmoid 损失 | “SigLIP 损失” | 每对样本的二元交叉熵；没有 softmax 或 all-gather，在分布式训练中扩展成本低 |
| 温度 | “tau” | 在 softmax/sigmoid 前缩放 logits 的标量；控制分布的尖锐程度 |
| 零样本 | “不微调分类” | 使用文本提示词构造类别嵌入，并通过余弦相似度分类；不在目标类别上训练 |
| 提示词模板 | “a photo of a ...” | 包围类别名称的文本框架；会让零样本准确率变化 1–5 个百分点 |
| 双编码器 | “双塔” | 一个图像编码器 + 一个文本编码器，在共享的 D 维空间中输出向量 |
| 困难负样本 | “棘手干扰项” | 与正样本足够相似、模型必须努力将其区分开的负样本 |
| 线性探针 | “冻结 + 一层” | 只在冻结特征上训练线性分类器；用于衡量特征质量 |
| NaFlex | “原生灵活分辨率” | SigLIP 2 的能力：无需调整大小即可接收任意宽高比和分辨率的图像 |
| 温度缩放 | “对数参数化的 tau” | CLIP 将 `log(1/tau)` 参数化，使梯度表现良好，并裁剪它以防止 tau 接近零而坍塌 |

## 延伸阅读

- [Radford 等——Learning Transferable Visual Models From Natural Language Supervision（arXiv:2103.00020）](https://arxiv.org/abs/2103.00020)——CLIP 论文。
- [Zhai 等——Sigmoid Loss for Language Image Pre-Training（arXiv:2303.15343）](https://arxiv.org/abs/2303.15343)——SigLIP。
- [Tschannen 等——SigLIP 2（arXiv:2502.14786）](https://arxiv.org/abs/2502.14786)——多语言 + NaFlex。
- [Jia 等——ALIGN（arXiv:2102.05918）](https://arxiv.org/abs/2102.05918)——利用带噪网络数据扩展。
- [Cherti 等——Reproducible scaling laws for contrastive language-image learning（arXiv:2212.07143）](https://arxiv.org/abs/2212.07143)——OpenCLIP 缩放定律。
