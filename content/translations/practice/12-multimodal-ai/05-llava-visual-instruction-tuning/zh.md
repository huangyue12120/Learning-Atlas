---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/12-multimodal-ai/05-llava-visual-instruction-tuning/docs/en.md
  revision: 7c3323508a5186739feecd76838ba1ae962c736f
  sha256: 8eaf0cdcfc4548e7d44ac0a7cf50fe1b92154b42d99ac715926701719a8ff04c
status: reviewed
---

# LLaVA 与视觉指令微调

> LLaVA（2023 年 4 月）是全世界被复制最多的多模态架构。它用一个两层 MLP 替代了 BLIP-2 的 Q-Former，用朴素的词元拼接替代了 Flamingo 的门控交叉注意力，并在 GPT-4 根据纯文本标题生成的 15.8 万个视觉指令轮次上训练。2023 到 2026 年间，任何构建过 VLM 的实践者都构建过某种 LLaVA 变体。LLaVA-1.5 加入了 AnyRes。LLaVA-NeXT 提升了分辨率。LLaVA-OneVision 用一套方案统一了单图像、多图像和视频。本课阅读这套方案，实现投影器，并解释为什么“简单方案胜出”。

**类型：** 构建
**语言：** Python（标准库，投影器 + 指令模板构建器）
**前置课程：** Phase 12 · 02（CLIP）、Phase 11（LLM 工程——指令微调）
**预计时间：** 约 180 分钟

## 学习目标

- 构建一个两层 MLP 投影器，把 ViT 图像块嵌入（维度 1024）映射到 LLM 的嵌入维度（维度 4096）。
- 走过 LLaVA 的两阶段方案：（1）在 558k 个标题对上做投影器对齐；（2）在 15.8 万个 GPT-4 生成的轮次上做视觉指令微调。
- 构造一个 LLaVA 格式的提示词，其中包含图像词元占位符、系统提示词和用户/助手轮次。
- 解释为什么社区选择 MLP 而不是 Q-Former，即使 Q-Former 在词元预算上更有优势。

## 问题

BLIP-2 的 Q-Former 将图像压缩为 32 个词元。它干净、高效，在基准测试上表现很好。但它有两个问题。

第一，Q-Former 可训练，但它的损失不是最终任务。第一阶段训练 ITC+ITM+ITG，第二阶段训练 LM 损失。查询学到的是某种中间表示，LLM 之后还得对它进行解码。瓶颈造成了信息损失。

第二，Q-Former 需要 1.88 亿个参数；在 LLaVA 的 2023 年规模下，你必须围绕目标 LLM 对它做协同设计。换一个 LLM，就要重新训练 Q-Former；换一个视觉编码器，也要重新训练。每一种组合都是一个独立的研发项目。

LLaVA 的答案简单得有些尴尬：取 ViT 的 576 个图像块词元，让每个词元经过一个两层 MLP（`1024 → 4096 → 4096`），再把全部 576 个词元倒入 LLM 的输入序列。不设瓶颈，不在第一阶段用奇怪的目标做预训练，只用直接的 LM 损失训练 MLP。

数据从哪里来？LLaVA 的第二个洞见是：使用 GPT-4（纯文本）生成指令数据。把图像的 COCO 标题和边界框数据提供给 GPT-4，让它生成对话、描述和复杂推理问题。这样免费得到 15.8 万个指令—响应轮次，不需要人工标注。

结果是一个在 8 张 A100 上运行一天就能训练的 VLM，在 MMMU 上超过 Flamingo，并发布了社区可以继续扩展的开放检查点。到 2023 年末，它已经催生了 50 多个分支。

## 概念 <!-- learning-atlas: the-concept -->

### 架构

13B 版本的 LLaVA-1.5：
- 视觉编码器：CLIP ViT-L/14 @ 336（第一阶段冻结，第二阶段可选解冻）。
- 投影器：带 GELU 激活的两层 MLP，`1024 → 4096 → 4096`。
- LLM：Vicuna-13B（后来换成 Llama-3.1-8B）。

图像 + 文本提示词上的前向过程：

```
img -> ViT -> 576 patches of dim 1024
patches -> MLP -> 576 tokens of dim 4096
prompt: system + "<image>" placeholder + user question
replace <image> token with the 576 projected tokens
feed the full sequence to the LLM
decode response
```

图像占用 LLM 上下文中的 576 个词元。在 2048 的上下文中，剩下 1472 个词元给文本；在 32k 上下文中，这只是舍入误差。

### 第一阶段：投影器对齐

冻结 ViT，冻结 LLM，只训练两层 MLP。数据集是 558k 个图像—标题对（LAION-CC-SBU）。损失是在投影后的图像词元条件下对标题进行语言建模。

批量 128、单轮训练即可在数小时内完成。投影器学习将 ViT 空间映射到 LLM 空间。不需要任务特定监督。

### 第二阶段：视觉指令微调

解冻投影器（仍然训练）。解冻 LLM（通常完全解冻，有时使用 LoRA）。在 15.8 万个视觉指令轮次上训练。

指令数据是关键。Liu 等人的生成步骤是：
1. 取一张 COCO 图像。
2. 提取文本描述（5 条人工标题 + 边界框列表）。
3. 使用三个提示词模板发送给 GPT-4：
   - 对话：“围绕这张图像生成一段用户与助手之间的来回对话。”
   - 详细描述：“对图像给出丰富、详细的描述。”
   - 复杂推理：“提出一个需要根据图像进行推理的问题，然后回答它。”
4. 将 GPT-4 的输出解析成（指令、响应）对。

整个过程都没有直接接触图像——只有文本描述。GPT-4 会幻觉式地产生看似合理的图像内容。虽然有噪声，但它奏效了：15.8 万轮对话足以释放对话能力。

### 社区为什么复制它

- 不需要调节第一阶段专用的损失，始终使用 LM 损失。
- 投影器几小时就能训练完成，不是几天。
- LLM 可以替换（LLaVA-Llama2、LLaVA-Mistral、LLaVA-Llama3），只需重新训练投影器。
- 视觉指令数据流水线使用 GPT-4；为新领域重新生成数据的成本很低。

### LLaVA-1.5 与 LLaVA-NeXT

LLaVA-1.5（2023 年 10 月）新增：
- 将学术任务数据（VQA、OKVQA、RefCOCO）混入指令微调。
- 更好的系统提示词。
- 2048 → 32k 上下文。

LLaVA-NeXT（2024 年 1 月）新增：
- AnyRes：把高分辨率图像切成 2x2 或 1x3 的 336x336 裁剪图，再加一张全局低分辨率缩略图。每个裁剪图变成 576 个词元；每张图像总共约 2880 个视觉词元。OCR 和图表任务大幅提升。
- 更好的指令数据配比，并加入 ShareGPT4V（高质量 GPT-4V 标题）。
- 更强的基础 LLM（Mistral-7B、Yi-34B）。

### LLaVA-OneVision

第 12.08 课会深入讲 OneVision。简而言之：仍然使用同一个投影器，但采用覆盖单图像、多图像和视频的课程学习，并在一个模型中共享视觉词元预算。

### 与 Q-Former 的比较

| | Q-Former（BLIP-2） | MLP（LLaVA） |
|---|---|---|
| 每张图像的视觉词元 | 32 | 576（基础）或 2880（AnyRes） |
| 可训练参数 | 1.88 亿 + LM | 4000 万 + LM |
| 第一阶段损失 | ITC+ITM+ITG | 只有 LM |
| LLM 即插即用 | 需要重新训练 | 只需极少重新训练即可替换 |
| 多图像 | 不自然 | 自然（拼接） |
| 视频 | 不自然 | 自然（按帧拼接） |
| 词元预算 | 小 | 大 |

MLP 胜在简单和词元灵活性，Q-Former 胜在词元预算。到 2023 年末，词元预算不再是硬约束（LLM 上下文增长到了 32k–128k+），简单性占据主导。

### 提示词格式

```
A chat between a curious human and an artificial intelligence assistant. The assistant gives helpful, detailed, and polite answers to the human's questions. USER: <image> Describe this image in detail. ASSISTANT: The image shows ...
```

`<image>` 是占位词元。在分词之前，它会被 576 个视觉词元替换（AnyRes 下为 2880 个）。分词器看到的序列会比训练时稍长，但由于第一阶段教会了 LLM 如何处理这种新输入，LLM 可以应对它。

### 参数经济性

LLaVA-1.5-7B 的参数拆分：
- CLIP ViT-L/14 @ 336：3.03 亿（第一阶段冻结，第二阶段通常解冻）。
- 投影器（两次线性变换）：约 2200 万可训练参数。
- Llama-7B：70 亿。
- 总计：73 亿参数。第二阶段的可训练参数：完整的 70 亿 + 2200 万投影器参数。

第二阶段训练成本：8xA100 上约 20 小时。这是关键数字——一天、一个节点、可复现。LLaVA 因此迅速传播。

```figure
mm-llava-projector
```

## 使用它

`code/main.py` 实现：

1. 纯 Python 的两层 MLP 投影器（玩具规模为维度 16 → 32 → 32）。
2. 提示词构建流水线：系统提示词 + 用 N 个投影词元替换 `<image>` + 用户轮次 + 助手生成占位符。
3. 视觉化 576 词元视觉块在 LLM 上下文中的占比（消耗 2k / 32k / 128k 上下文的百分比）。

## 交付成果

本课生成 `outputs/skill-llava-vibes-eval.md`。给定一个 LLaVA 家族检查点，它运行一个包含 10 个提示词的 vibes-eval 套件（3 个标题生成、3 个 VQA、2 个推理、2 个拒答），并报告人类可读的评分卡。它不是基准测试，而是用于确认投影器和 LLM 是否连接良好的冒烟测试。

## 练习

1. 计算 `1024 → 4096 → 4096` 两层 MLP 投影器的可训练参数量。加入 GELU 和偏置后，它占 LLaVA-13B 的多少比例？

2. 为“拒答”情况构造一个 LLaVA 提示词——图像中有一个私人个体。写出预期的助手响应。为什么 LLaVA 应该在零样本情况下拒答？需要什么训练数据来强化这个拒答？

3. 阅读 LLaVA-NeXT 博客中的 AnyRes 部分。计算 1344x672 图像在 AnyRes 下的视觉词元数量，并与 336x336 基础方案的 576 个词元比较。

4. LLaVA 第一阶段投影器使用标题上的 LM 损失训练。如果跳过第一阶段，直接进入第二阶段（视觉指令微调），会发生什么？引用 Prismatic VLMs 消融实验（arXiv:2402.07865）回答。

5. LLaVA-Instruct-150k 使用 GPT-4 和 COCO 标题生成指令。对于一个新领域（医学 X 光片、卫星图像），描述生成领域指令的四步数据流水线。每一步可能出什么问题？

## 关键术语

| 术语 | 人们常说 | 实际含义 |
|------|----------|----------|
| 投影器 | “MLP 桥” | 使用 GELU 将 ViT 维度映射到 LLM 维度的两层 MLP |
| 图像词元 | “<image> 占位符” | 推理前会被 N 个投影视觉词元替换的提示词标记 |
| 视觉指令微调 | “LLaVA 第二阶段” | 在 GPT-4 生成的（图像、指令、响应）三元组上训练 |
| 第一阶段对齐 | “投影器预训练” | 冻结 ViT 和 LLM，在标题上用 LM 损失训练投影器 |
| AnyRes | “多裁剪平铺” | 将高分辨率图像切成图块网格，并拼接每个图块的视觉词元 |
| LLaVA-Instruct | “GPT-4 生成” | 从 COCO 标题 + GPT-4 合成的 15.8 万个指令—响应对 |
| 视觉编码器冻结 | “锁定骨干” | 第一阶段 CLIP 权重不更新，第二阶段有时也不更新 |
| ShareGPT4V | “更好的标题” | GPT-4V 生成的 100 万条详细标题，用于高质量对齐 |
| VQA | “视觉问答” | 针对图像提出自由形式问题并回答的任务 |
| Prismatic VLMs | “设计空间论文” | Karamcheti 2024 年系统测试投影器和数据选择的消融研究 |

## 延伸阅读

- [Liu 等——Visual Instruction Tuning（arXiv:2304.08485）](https://arxiv.org/abs/2304.08485)——LLaVA 论文。
- [Liu 等——Improved Baselines with Visual Instruction Tuning（arXiv:2310.03744）](https://arxiv.org/abs/2310.03744)——LLaVA-1.5。
- [Chen 等——ShareGPT4V（arXiv:2311.12793）](https://arxiv.org/abs/2311.12793)——详细标题数据集。
- [Karamcheti 等——Prismatic VLMs（arXiv:2402.07865）](https://arxiv.org/abs/2402.07865)——设计空间消融。
- [Li 等——LLaVA-OneVision（arXiv:2408.03326）](https://arxiv.org/abs/2408.03326)——统一单图像、多图像和视频。
