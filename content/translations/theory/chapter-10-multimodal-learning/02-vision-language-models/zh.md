---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 10 - multimodal learning/02. vision language models.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: c32dba5a1c73fecb1fc8305df2a3539ed0ee89a1cbf1a27cce0d8bda015c8f71
status: reviewed
---
# 视觉语言模型

*视觉语言模型同时理解图像和文本，能够进行视觉问答、图像描述和视觉推理。本文件涵盖了VQA、图像描述、视觉定位以及如VisualBERT、BLIP、LLAVA、Flamingo、PaLI和Qwen-VL等将视觉编码器与大型语言模型融合的架构。*

- 想象一下，你是一位博物馆导游，能够通过看一幅画来描述它：画中有哪些物体，它讲述了一个什么故事，传达了哪些情感，并回答游客提出的问题。**视觉语言模型（VLM）**就是这种计算等价物——一个系统，能够同时理解图像和文本，从而描述视觉场景、回答问题、遵循视觉指令，并在给定自然语言查询的情况下定位图像中的特定对象。

- VLMs位于你第8章中遇到的视觉编码器与第7章中遇到的语言模型之间的交汇点。工程挑战的核心是将两个非常不同的表征世界桥接起来：视觉骨干网络生成的空间、连续特征图和大型语言模型生成的序列、离散标记嵌入。本文件中的每一个架构都是对如何融合视觉和语言问题的不同回答。

![高阶视觉语言模型分类法，显示双编码器、融合编码器和编码器-解码器家族及其输入和输出](../images/vlm_taxonomy.svg)


## 视觉问答

- 假设你展示了一张照片并问：“公园里有多少只狗？”你轻松地解析图像，定位到这些狗，数清它们，并给出答案。**视觉问答（VQA）**正式化了这种过程：给定一张图像$I$和一个自然语言问题$q$，预测答案$a$。

- 任务可以以多种方式表述。最常见的方法是将VQA视为**开放-ended分类**：模型从固定词汇表中选择最频繁的答案（例如，VQA v2中的前3,129个答案）。另一种方法是将其视为**生成回答**，其中模型产生自由形式的文本字符串——这是现代VLMs采用的方法。

- 形式上，你希望学习一个函数$f(I, q) \to a$，最大化正确答案的概率。在分类设置中，这变为：

$$p(a \mid I, q) = \text{softmax}(W \cdot g(v, h))$$
- 其中$v$是视觉特征向量（来自CNN或ViT），$h$是问题编码（来自LSTM或Transformer），而$g$是融合函数，用于结合它们。$g$的设计是真正的架构创新之处。

- **VQA v1**（Antol et al., 2015）引入了基准测试集，包含614,000个问题和204,000张来自MS COCO的图像。研究人员很快发现，模型通过利用**语言先验**——回答“2”对于“有多少”问题或“是”对于“是否有”问题而无需查看图像即可实现 surprisingly高的准确性。

- **VQA v2** (Goyal et al., 2017) 解决了这个问题，通过将每个问题与两个相似的图像配对，这些图像产生不同的答案。这迫使模型实际在视觉内容上进行推理。平衡的配对设置大约翻倍了数据集，并使语言-only捷径的效果大大降低。

- 其他重要的视觉问答（VQA）数据集包括 **GQA**（Hudson & Manning，2019），其中包含需要多步推理的组合问题；**OK-VQA**（Marino et al., 2019），要求超出图像知识的外部信息；以及 **TextVQA**（Singh et al., 2019），其中答案依赖于图像中阅读的文字。

![VQA管道：图像通过视觉编码器传递，问题通过文本编码器传递，它们的表示被融合，并且融合向量被分类为答案](../images/vqa_pipeline.svg)


- 早期的 VQA 模型使用了一种简单的方法：从预训练的 CNN（通常是 Chapter 8 中的 ResNet 或 VGGnet 的倒数第二层）提取图像特征，用 LSTM 编码问题，并将它们结合起来。组合函数 $g$ 迅速发展：从简单的逐元素乘法到 bilinear 池化，再到多模态 Tucker 分解。 **bilinear 注意力** 计算 $v^T W h$，其中 $W$ 是可学习的交互矩阵，但全 bilinear 形式有 $O(d_v \times d_h)$ 个参数，这太大了。 **MLB**（多模态低秩 bilinear 池化）将这个分解为两个低秩投影，使其 tractable.

- VQA 的突破是注意力。 **堆叠注意力网络**（Yang 等人，2016 年）使用问题编码来关注与图像区域相关的空间部分，并迭代地精炼哪些部分应该重点考虑。这个想法——让问题“看”到相关图像区域——成为标准.

## 图像描述

- 想象一下你的朋友在看你的假期照片并讲述他们所看到的内容：“一只金毛猎犬正在海滩上抓飞盘。” **图像描述** 是生成对图像自然语言描述的任务。与 VQA 不同，模型不需要任何问题——它必须自己决定什么值得描述。

- **展示与讲述**（Vinyals et al., 2015）确立了用于描述的编码器-解码器架构的典范。一个CNN编码器（例如Inception或ResNet）产生单个图像特征向量$v$。这个向量被用作LSTM解码器的初始隐藏状态，然后逐词生成描述，自回归地：

$$p(w_t \mid w_{1:t-1}, I) = \text{LSTM}(w_{t-1}, h_{t-1})$$
- 整个模型通过最大化目标语料的对数似然进行端到端训练。在推理时，使用beam搜索（第7章）来找到高概率的语料。

- 问题在于展示和讲述时，整个图像被压缩成一个单一的向量。对于复杂的场景，单个向量无法捕捉所有相关的细节。你丢失了空间信息——模型在生成不同单词时无法“回头看”特定部分的图像。

- **Show, Attend and Tell**（Xu et al., 2015）解决了这个问题，通过引入图像区域的注意力来实现。与将图像编码为一个向量不同，CNN在最后一个卷积层上生成一个空间特征网格（例如$14 \times 14 \times 512$来自VGGnet）。在每次解码步骤中，模型计算这些空间位置上的注意力权重，产生一个上下文向量，强调当前单词最相关的区域。

- 回忆第6章的注意力机制：解码器隐藏状态作为查询，空间特征作为键和值，注意力权重告诉模型在哪里看。作者提出了两种变体：**软注意力**（可微分，所有区域的加权平均）和**硬注意力**（随机采样单个区域，使用REINFORCE训练）。

![基于注意力的描述：在解码步骤中，模型关注图像的不同空间区域，专注于生成“狗”时相关的区域](../images/attention_captioning.svg)


- 这些模型生成的注意力图非常可解释：当生成“狗”时，注意力集中在狗区域；当生成“海滩”时，它转移到沙地和水。这是第一个令人信服的演示，说明注意力提供了内置的可解释性。

- CIDEr（Vedantam et al., 2015）、METEOR、BLEU和SPICE是标准的图像描述评估指标。CIDEr通过计算生成和参考描述之间的TF-IDF加权n-gram相似度来实现，特别设计用于图像描述评估。现代视觉语言模型通常在MS COCO Captions和NoCaps等基准测试中使用CIDEr进行评价。

- 后来，包含 **底部向上注意力** 的.captioning模型（Anderson et al., 2018）首先通过 Faster R-CNN（第8章）提出具有高重要性的图像区域，然后在这些区域特征上进行关注，而不是使用一个均匀的网格。这是在 ViT 基础编码器接管之前占据主导地位的方法。

## 架构模式

- 每个 VLM 必须回答一个基本的设计问题：视觉和语言何时交互？答案定义了模型的架构家族。有三种主要模式，每种都有不同的权衡取舍。

### 双编码器

- 想象两个翻译器独立工作——一个读取法语文档，另一个读取英语文档——他们各自在共享的“通用语言”中生成摘要。他们从未进行翻译交流，但他们的摘要可以直接比较。这就是 **双编码器** 模式。

- 一个视觉编码器 $f_v$ 和一个文本编码器 $f_t$ 独立地将各自的输入映射到共享的嵌入空间，维度为 $d$。图像嵌入是 $v = f_v(I) \in \mathbb{R}^d$，文本嵌入是 $t = f_t(q) \in \mathbb{R}^d$。相似性通过点积或余弦相似度计算： $\text{sim}(I, q) = v^T t / (\|v\| \|t\|)$。

- CLIP（Radford et al., 2021），在上一篇文件中讨论了多模态表示，是双编码器的典型代表。它通过互联网上收集的4亿多张图像和文本对进行对比损失训练（InfoNCE）。由于编码器是独立的，可以在预计算并缓存所有图像嵌入后，检索非常高效——只需在搜索时编码查询文本即可。

- 双编码器的弱点在于视觉和语言在特征层面从未交互。模型无法进行精细粒度的跨模态推理：例如，它不能确定图像中特定区域是否对应于特定单词。这限制了其在VQA或语义标注任务中的实用性。

### 合并编码器

- 现在想象两个翻译者在一个房间里，积极讨论这两份文档。他们可以指针特定的段落，互相提问，并建立共同的理解。这就是**合并编码器**模式。

- 两种模态都进行编码，然后通过交叉注意力层融合。图像首先由视觉编码器转换为一系列的补丁或区域标记 $V = [v_1, \ldots, v_N]$。文本被分词成 $T = [t_1, \ldots, t_M]$。在融合层中，文本标记通过交叉注意力与图像标记相互关联：

$$\text{CrossAttn}(T, V) = \text{softmax}\!\left(\frac{(TW_Q)(VW_K)^T}{\sqrt{d_k}}\right)(VW_V)$$
- 这样可以实现细粒度的交互：每个文本标记都可以关注它需要的具体图像区域。像 **VisualBERT**、**VilBERT** 和 **UNITER** 这样的模型使用这种模式。代价是，你不能预先计算单独的嵌入来检索——每对图像和文本都需要通过融合层进行全向传播。

![双编码器与融合编码器对比：双编码器分别计算单独的嵌入和相似度分数，而融合编码器通过交叉注意力层将模态合并](../images/dual_vs_fusion_encoder.svg)


### 编码器-解码器

- **编码器-解码器**模式将视觉编码器与生成输出标记的文本解码器结合，类似于第7章中提到的seq2seq模型。视觉编码器产生上下文图像表示，而文本解码器通过交叉注意力来使用这些表示，并生成输出文本。

- 这个模式自然支持生成任务：描述、VQA（自由答案）和视觉对话。像 **GIT**（图像到文本生成器，王等人，2022）、**CoCa**（对比式描述器，于等人，2022）和 **PaLI** 使用这种架构。CoCa巧妙地结合了双编码器和编码器-解码器模式：文本解码器的第一半层作为单模态文本编码器（用于对比学习），而第二部分跨注意力图像特征（用于生成描述），两者都得到了最佳效果。

- 选择这三种模式取决于目标任务。双编码器在大规模检索中效果最佳。融合编码器最适合精细理解任务。编码器-解码器在生成任务中最为灵活。现代最先进的视觉语言模型越来越多地采用编码器-解码器或仅解码器的范式，将每项视觉语言任务视为文本生成。

## Flamingo: 几次学习多模态学习

- 想象一下，一位经验丰富的专家，经过多年的艺术和文学研究，能够仅凭看到几幅完全不同的绘画风格的示例，便能准确描述这些风格。**Flamingo**（Alonso et al., 2022, DeepMind）正是基于同样的原则构建的：它利用强大的预训练语言模型和预训练视觉编码器，并通过轻量级的架构组件实现多模态任务上的几次学习。

- 火焰鸟的设计哲学是保守且有效的：保持预训练的视觉编码器（NFNet）和语言模型（Chinchilla）冻结，只学习连接它们的“粘合剂”。这个粘合剂由两个组件组成：一个 **Perceiver Resampler** 和 **带门交叉注意力层**。

- 感知器重采样器将视觉编码器的可变长度输出（取决于图像分辨率）压缩成固定集合。 $N$ 视觉标记（通常） $N = 64$它通过初始化一组 $N$ 可学习查询向量和使用交叉注意力，让这些查询能够关注到视觉编码器输出的完整集。这本质上是Perceiver架构（Jaegle等人，2021）的应用——它产生了一个固定大小、无论输入图像大小如何的紧凑视觉表示。

$$z = \text{CrossAttn}(Q_{\text{learned}}, V_{\text{image}}) \in \mathbb{R}^{N \times d}$$
- **门控交叉注意力层** 交错插入到冻结的语言模型层之间。在每个这样的层中，语言模型的文本令牌与由感知器重采样生成的视觉令牌进行交叉注意。至关重要的是，每个门控交叉注意力层包含一个可学习的标量门 $\alpha$，初始值为零，它将交叉注意力输出乘以残差流后再添加到其中：

$$\hat{x} = x + \alpha \cdot \text{CrossAttn}(x, z)$$
- 初始化 $\alpha = 0$ 表示在训练开始时，交叉注意力不贡献任何信息，模型的行为与原生冻结语言模型完全相同。随着训练的进行，门逐渐打开，视觉信息 smoothly融入语言模型的预训练表示中，而不会破坏其原有的预训练表示。

![Flamingo架构：冻结的视觉编码器输入到一个固定长度视觉令牌生成的Perceiver Resampler中，这些令牌被注入到冻结的语言模型中，通过插入LM块之间的 gated交叉注意力层进行交织](../images/flamingo_architecture.svg)


- Flamingo 可以处理 **交错图像文本序列**。你可以提供一个包含多个图像和文本的提示，例如："[Image 1] 这是一只猫。[Image 2] 这是一只狗。[Image 3] 这是一只 ___." 模型通过视觉编码器和感知器重采样对每个图像进行处理，并将生成的视觉令牌插入到文本序列中对应的位置。语言模型的因果注意力掩码确保每个文本令牌只能关注当前和 preceding图像的视觉令牌。

- 这种交错学习方式能够实现强大的**少样本多模态学习**。通过在上下文中提供少量的图像文本示例，Flamingo可以在不进行任何梯度更新的情况下完成新的任务。在VQAv2、OK-VQA和captioning等基准上，使用80B参数的Flamingo取得了最先进的少样本性能，有时甚至能够与仅使用4或32个示例微调的专业模型匹敌或超越。

## LLaVA 和视觉指令微调

- 想象你有一个非常聪明的语言专家（LLM）和一个非常聪明的艺术批评家（视觉编码器）。如果能教会艺术批评家“说语言专家的话”，他们就能无缝协作。**LLaVA**（大型语言和视觉助手，刘等人，2023年）做到了这一点：它将视觉特征投影到语言专家的令牌嵌入空间中，然后在指令遵循数据上微调整个系统。

- LLaVA 的架构非常简单。图像通过预训练的 CLIP ViT-L/14 视觉编码器编码成网格特征。 $V \in \mathbb{R}^{N \times d_v}$在何处 $N = 256$ 补丁（用于336像素图像的14像素补丁）。一个**投影层** $W$ 将这些视觉特征映射到LLM的嵌入维度：

$$H_v = VW, \quad W \in \mathbb{R}^{d_v \times d_{\text{LLM}}}$$
- 项目中的视觉令牌 $H_v$ 被直接与文本令牌嵌入相连接，然后作为单一序列输入到 LLM（Vicuna，一个经过微调的 LLaMA）中。LLM 使用标准的因果自注意力机制来处理这些令牌——没有特殊的交叉注意力层或感知器，只是简单地进行拼接。视觉令牌被视为具有编码视觉信息的文本令牌。

![LLaVA架构：CLIP ViT将图像编码为patch特征，线性投影将其映射到语言模型嵌入空间，投影的视觉令牌被添加到文本令牌之前，并被馈送到LM](../images/llava_architecture.svg)


- **视觉指令调优**是LLaVA的关键训练创新。作者从COCO图像中生成了158,000个多模态指令跟随示例，每个示例包括一张图片与一个对话指令（例如：“详细描述这张图片”，“这张图片有什么特别之处”，“如果我是来参观这个地方的游客，应该知道什么？”）。模型被训练为给定图像和指令时生成GPT-4作者的响应。

- 训练分为两个阶段。**第一阶段（预训练）**：仅训练投影层 $W$，使用图像-caption对（595K来自CC3M），同时将视觉编码器和LLM冻结。这使 $W$ 学习将视觉特征与 LLM 的嵌入空间对齐。**第二阶段（微调）**：投影层和LLM一起联合微调，使用指令跟随数据，而视觉编码器保持冻结。这使模型能够遵循复杂的视觉指令。

- **LLaVA-1.5**通过三个关键变化改进了原始模型：将单层线性投影替换为两层MLP（更具有表达能力的映射），使用更高分辨率的图像（从224px增加到336px，产生更多的patch tokens），并添加学术VQA数据集到训练混合中。这些看似微小的修改导致了基准性能的巨大提升。

- LLaVA展示了，你不需要像Flamingo那样复杂的架构创新，比如Perceiver Resampler或 gated cross-attention。一个简单的线性投影，结合高质量的指令调优数据，就可以有效地将视觉编码器连接到LLM上。这种简单性使得LlaVA非常有影响力——大多数后续开源VLMs都遵循类似的配方。

## 视觉语言模型的缩放

- 这个领域从概念验证的 VLMs 快速发展到训练了数十亿对图像和文本的工业规模系统。三种不同的模型家族展示了不同方法来实现缩放。

### PaLI

- **PaLI** (路径语言和图像模型，chen et al., 2022, Google) 同时对视觉编码器和语言模型进行缩放。PaLI 使用 ViT-e（4B 参数）作为视觉编码器，使用 mT5（13B 参数）作为语言模型，总参数量为 17B。图像被编码成一系列补丁令牌，这些令牌被添加到文本令牌之前，并输入到 encoder-decoder 的 mT5 中。

- PaLI的关键洞察是**视觉编码器的规模同样重要，与语言模型的规模一样**。以往的工作通常使用一个固定、中等大小的视觉基础（例如ViT-B或ViT-L），并将所有参数预算都投入到LL中。PaLI展示了通过在JFT-4B（4亿个标记图像）上预训练的40亿参数ViT-e，大幅提高了OCR和空间推理等细粒度视觉任务的表现。

- PaLI在WebLI数据集上进行训练，该数据集包含10亿张图像和文本对，涵盖109种语言。因此，它天生具有多语种能力。模型通过混合任务预训练：图像描述、VQA和图像文本匹配（遵循第7章中提出的T5范式）。**PaLI-X**（55B参数）和**PaLI-3**（5B，使用SigLIP作为视觉编码器）是后续迭代版本。

### Qwen-VL

- **Qwen-VL**（ Bai et al., 2023, Alibaba）基于 Qwen LLM，添加了一个 ViT 视觉编码器和一个单层交叉注意力模块（类似于 Flamingo 的 Perceiver Resampler），将视觉编码器的输出压缩成固定数量的 256 个视觉标记。这些视觉标记与文本标记连接，并通过 Qwen LLM 处理。

- Qwen-VL的训练使用了一个三阶段的配方。第一阶段：仅解码器冻结，预训练14亿弱监督图像文本对。第二阶段：全模型解冻，多任务预训练包括VQA、描述、定位和OCR数据集。第三阶段：指令遵循和对话数据的 supervised微调。这种逐步提升，从嘈杂的网页数据到精心编写的指令数据，是大多数现代VLMs共享的模式。

- **Qwen2-VL** (2024) 引入了动态分辨率支持：不再将所有图像缩放为固定大小，而是根据图像的原始分辨率动态调整视觉标记的数量。高分辨率图像产生更多标记，低分辨率图像产生更少。这在需要处理细节敏感任务（如文档理解、精细识别）时提高了性能，同时避免了对低分辨率输入进行不必要的计算。

### 内部VL

- **Internvl**（陈等人，2024年上海人工智能实验室）对视觉编码器进行了激进的缩放，使用了6亿参数的Vision Transformer InternViT-6B，并与语言模型配对。关键的架构贡献是动态高分辨率处理：图像被分割成448x448像素的块，每个块独立地由视觉编码器处理，然后将这些块特征与全图的缩略图特征连接起来。这使得模型能够处理任意宽高比和分辨率的图像。

- InternVL-2进一步引入了**渐进性对齐训练**：首先通过对比目标（如CLIP）对视觉编码器进行对齐，然后将其连接到LLM通过轻量级MLP连接器，最后在指令数据上端到端微调。渐进策略防止了视觉编码器预训练表示的 catastrophic遗忘。

![视觉语言模型的缩放：PaLI、Qwen-VL和InternVL的不同连接方法比较，包括它们的训练阶段](../images/scaling_vlms_comparison.svg)


- 三个家族中一个共同的主题是 **数据清理的重要性**。未经处理的网页抓取图像文本对齐错误率高。随着训练阶段的进行，数据逐渐过滤和精炼，从数亿个噪声对齐到数百万个高质量指令示例。最终微调数据的质量往往比模型原始参数数量更重要。

## 接地和引用

- 想象一下，指着一群人的某个人说“红帽子的女人”。你使用语言来指代一个特定的空间区域。**视觉接地**的反义词是：给定一张图片和自然语言表达式，模型必须识别（定位）被引用的对象。**引用表达式理解**产生边界框；**引用表达式分割**产生像素掩码。

- 形式上，给定一个图像 $I$ 和一个引用表达式 $r$（例如，“左方的大型棕色狗”），模型预测一个边界框 $b = (x, y, w, h)$ 或一组坐标来定位引用对象。数据集包括 **RefCOCO**、**RefCOCO+** 和 **RefCOCOg**，每个包含多对象图像和每个对象的唯一引用表达式。

- 早期的区域提议模型使用了两阶段的方法：首先从Faster R-CNN或类似技术生成区域提议，然后对每个提议进行语言查询评分，使用融合模型。得分最高的区域是预测结果。这种方法计算成本高，并受限于提议的质量。

- 现代的 VLMs 将接地直接集成到生成框架中。关键思想是将边界框坐标表示为 **文本标记**。你将连续坐标空间离散化成 bins（例如，每个 $x, y, w, h$ 有 1000 个 bins），并添加特殊位置标记如 `<loc_342>` 到词汇表中。模型然后通过输出一系列位置标记来生成边界框：

$$\text{Output: } \texttt{<loc\_102><loc\_215><loc\_487><loc\_398>}$$
- 这个标记技巧允许任何自回归语言模型在不进行架构更改的情况下进行定位。**Pix2Seq**（Chen et al., 2022）率先将这种方法应用于目标检测，而Qwen-VL、Ferret和Kosmos-2等模型将其扩展到引用表达理解和短语定位。

- **Kosmos-2** (Peng et al., 2023, Microsoft) 在多模态大语言模型中添加了地平线能力，通过在生成的文本中嵌入特殊标记来表示空间位置。例如，它可以生成：“一只`<phrase>`金毛猎犬`</phrase>` `<box>` `<loc_102>` `<loc_215>` `<loc_487>` `<loc_398>` `</box>`正在抓飞盘。”这种文本和空间标记的交织同时实现了描述和定位。

![通过坐标标记进行定位：模型在生成文本令牌时，插入了 discret化边界框坐标令牌，这些坐标标记定位了描述中的对象](../images/grounding_coordinate_tokens.svg)


- **指代**进一步扩展：模型不再使用边界框，而是预测一个单点（通常为被引用对象的中心）。这在需要用户询问“最近的出口在哪里？”时非常有用，模型会将坐标叠加到图像上。除了边界框对齐外，Shikra和Ferret还支持基于点的指代。

## OCR-free文档理解

- 传统的文档理解管道复杂：首先运行一个OCR引擎提取文本和布局，然后将提取的文本喂给语言模型。这种多阶段方法脆弱——OCR错误会向下传递，并且空间布局信息往往丢失或 poorly表示。如果模型可以直接从像素读取，就像你一样吗？

- **Donut**（文档理解变换器，Kim et al., 2022）完全消除了OCR。它使用Swin Transformer（第8章）作为视觉编码器来处理文档图像，并使用BART-style变换器解码器直接从视觉特征生成结构化文本输出。解码器可以根据任务产生JSON、键值对或纯文本。

- Donut 的训练分为两阶段。**预训练**：模型通过执行合成 OCR 来学习阅读，给定文档图像，它生成完整的文本内容。这在数百万个从文本语料库渲染的合成文档图像上进行训练，教导视觉编码器识别字符、字体和布局。**微调**：模型被适应特定下游任务，如收据解析、表单理解或文档分类，通过训练它生成任务特定结构化的输出。

- Donut 解码器使用一种特殊的提示方案：任务由一个提示令牌（例如，`<doc_class>`用于分类或 `<parse_receipt>`用于收据解析）指定，模型根据此提示生成输出。这种统一的接口允许单个模型处理多种文档理解任务。

- Pix2Struct（Lee et al., 2023，Google）将OCR-free的想法应用于网页理解和图表/图形的解释。关键预训练目标是“截图解析”：给定一个带有遮挡的网页截图，模型生成产生可见区域的底层HTML。这教会了模型理解视觉渲染和结构化标记之间的关系。

- Pix2Struct引入了**可变分辨率输入处理**：而不是将所有图像缩放为固定大小（这会破坏比例和细文字体），它将图像打包成固定数量的补丁，同时保留原始比例。一张高宽比大的文档会产生一个高宽比大的补丁网格。这对于文档理解至关重要，因为比例信息携带了语义信息（收据是窄而高的；电子表格是宽而短的）。

![OCR-free文档理解：Donut和Pix2Struct直接通过视觉编码器处理文档图像，并生成结构化的文本输出，而无需任何OCR预处理](../images/ocr_free_document_understanding.svg)


- **Nougat** (Blecher et al., 2023, Meta) 使用 Donut 架构专门处理学术论文，直接从 PDF 页面图像生成完整的 LaTeX 标记。它能够处理复杂的数学方程、表格和图形——传统 OCR 流水线在这些任务上表现不佳。模型是基于 PDF 页面图像及其对应的 LaTeX 源代码对进行训练的。

- OCR-free模型的成功表明深度学习中一个更广泛的原则：直接从原始输入（像素）学习的端到端模型往往优于复杂的多阶段管道，因为它们可以同时优化所有组件并学习特定于最终任务的表示。中间的OCR步骤是一个瓶颈，限制了模型能够学习的内容。

## 图形令牌管道

- 不论架构家族如何，每种 VLM 必须将图像转换为语言模型可以处理的序列 tokens。理解这个管道至关重要。该过程因模型而异，但总体流程是：

- **步骤 1: 提取补丁。** 图像（高度 $H$，宽度 $W$）被分割成非重叠的补丁，大小为 $P \times P$，产生 $N = HW / P^2$ 个补丁。对于一个 336x336 的图像，使用 14x14 的补丁，$N = 576$.

- **步骤 2: 视觉编码。** 每个补丁线性投影并通过视觉编码器（通常是一个 ViT）传递。输出是包含局部外观信息和全局上下文（来自自注意力）的序列 $V = [v_1, \ldots, v_N] \in \mathbb{R}^{N \times d_v}$。这些嵌入携带了视觉补丁的上下文信息。

- **步骤 3: 图像标记压缩（可选）。** 一些模型将 $N$ 个视觉标记压缩成一个较小的 $M \ll N$ 个标记集，以减少语言模型的计算负担。Flamingo 使用 Perceiver Resampler ($M = 64$)；Qwen-VL 使用交叉注意力 ($M = 256$)；**Q-Former**（在 BLIP-2 中使用，Li 等人，2023 年）使用一组 $M = 32$ 个可学习查询标记，这些标记与视觉编码器的输出进行交叉注意力。

- **步骤 4: 投影。** 视觉标记（要么是完整的集合，要么是压缩后的集合）通过线性层或 MLP 投射到语言模型的嵌入空间中。投影后，视觉标记与文本标记嵌入具有相同的维度，并可以与它们连接。

- **步骤 5: 注入到 LLM 中。** 投影后的视觉标记插入到一个特殊 `<image>` 个占位符标记的位置，然后将组合序列传递给语言模型。LLM 的自注意力允许文本标记关注视觉标记，反之亦然。

![视觉令牌管道：图像patch被提取，由ViT编码，可选地通过Perceiver或Q-Former压缩，投影到语言模型维度，与文本令牌连接](../images/visual_token_pipeline.svg)


- 视觉标记的数量直接影响计算成本。每个视觉标记都参与了LLM的自注意力，其复杂度与序列长度成二次关系。分辨率较高的图像包含数百或数千个视觉标记，占据了LLM的上下文窗口。这就是为什么压缩令牌很重要：将576个视觉标记减少到64个，可以将视觉贡献到注意力中的比例大致降低9倍。

- BLIP-2（李等人，2023）因其高效的桥接策略而著名。它引入了一个轻量级的Q-Former（一个带有可学习查询的小型Transformer），位于冻结的视觉编码器和冻结的LLM之间。Q-Former是唯一的训练组件——视觉编码器和LLM都保持冻结。它在两个阶段进行预训练：首先，通过图像文本对比学习、匹配和描述目标连接到视觉编码器；然后，通过语言生成目标连接到LLM。这种模块化设计允许BLIP-2将任何视觉编码器插入到任何LLM中。

## 训练目标

- VLMs 通过结合不同的目标进行训练，具体取决于架构模式：

- **图像文本对比损失 (ITC):** 将图像和文本表示对齐到共享嵌入空间中，类似于 CLIP。这是双编码器的主要目标，并且在融合模型的预训练中经常使用。损失是上一个文件中的 InfoNCE 损失。

- **图像文本匹配（ITM）：一个二分类目标——给定一张图片和一段文字，预测它们是否匹配。相似但配对不同图片的负面样本使这个任务具有挑战性，并迫使模型学习细粒度的对齐。**

- **语言建模（LM）：**标准的自回归语言建模目标——给定所有先前令牌预测下一个令牌。对于VLMs，"先前令牌"包括视觉令牌，因此模型学习在有视觉输入的情况下生成文本。这是编码器-解码器和仅解码器VLM的主要目标。

$$\mathcal{L}_{\text{LM}} = -\sum_{t=1}^{T} \log p(w_t \mid w_{<t}, V)$$
- **前缀语言建模：**一种变体，其中图像和文本前缀作为上下文（未训练），模型被训练生成仅续接。这在PaLI和simVLM等模型中使用。

- 最现代的 VLMs 在预训练阶段结合了多个目标（例如，在 BLIP 中为 ITC + ITM + LM，而在 CoCa 中为 ITC + LM），然后在指令数据上使用纯 LM 目标进行微调。

## 编程任务（使用 CoLab 或笔记本）

1. 实现一个简单的注意力基图像描述解码器。使用随机的“图像特征”作为编码器输出，并训练解码器生成固定描述，观察在每个解码步骤中注意力权重如何在空间位置上变化。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

# Simulate a 4x4 spatial grid of image features (16 regions, dim=32)
key = jax.random.PRNGKey(42)
k1, k2, k3 = jax.random.split(key, 3)
img_features = jax.random.normal(k1, (16, 32))  # 16 spatial regions, 32-dim

# Vocabulary: 0=<start>, 1="a", 2="red", 3="car", 4=<end>
vocab_size, embed_dim, hidden_dim = 5, 16, 32
W_embed = jax.random.normal(k2, (vocab_size, embed_dim)) * 0.1
W_attn_q = jax.random.normal(k3, (hidden_dim, 32)) * 0.1  # query projection

def attend(h, img_feats, W_q):
    """Compute soft attention over image features given decoder state h."""
    query = h @ W_q  # (32,)
    scores = img_feats @ query  # (16,)
    weights = jax.nn.softmax(scores)  # (16,)
    context = weights @ img_feats  # (32,)
    return context, weights

# Simple GRU-like step (for illustration, just a linear + tanh)
W_h = jax.random.normal(jax.random.PRNGKey(0), (embed_dim + 32, hidden_dim)) * 0.1

def decode_step(h, word_idx, img_feats):
    context, attn_weights = attend(h, img_feats, W_attn_q)
    word_emb = W_embed[word_idx]  # (16,)
    inp = jnp.concatenate([word_emb, context])  # (48,)
    h_new = jnp.tanh(inp @ W_h)  # (32,)
    return h_new, attn_weights

# Run decoding for the sequence: <start> -> "a" -> "red" -> "car" -> <end>
target_seq = [0, 1, 2, 3, 4]
h = jnp.zeros(hidden_dim)
all_attn = []
for word_idx in target_seq[:-1]:
    h, attn_w = decode_step(h, word_idx, img_features)
    all_attn.append(attn_w)

# Visualise attention maps (reshaped to 4x4 grid) at each step
words = ["<start>", "a", "red", "car"]
fig, axes = plt.subplots(1, 4, figsize=(14, 3))
for i, (ax, w) in enumerate(zip(axes, words)):
    ax.imshow(all_attn[i].reshape(4, 4), cmap='viridis')
    ax.set_title(f'Attending when\ngenerating after "{w}"')
    ax.axis('off')
plt.suptitle('Attention Over Image Regions at Each Decoding Step')
plt.tight_layout(); plt.show()
# Try changing img_features to see how attention patterns shift!
```

2. 模拟视觉标记管道：将图像分割成patches，将patches投影到嵌入空间，与文本标记嵌入拼接，并在组合序列上运行单个自注意力层。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

key = jax.random.PRNGKey(7)

# Create a synthetic 8x8 "image" with 3 channels
k1, k2, k3, k4 = jax.random.split(key, 4)
image = jax.random.uniform(k1, (8, 8, 3))

# Step 1: Patchify into 4x4 patches -> 4 patches
patch_size = 4
patches = image.reshape(2, patch_size, 2, patch_size, 3)
patches = patches.transpose(0, 2, 1, 3, 4).reshape(4, patch_size * patch_size * 3)  # (4, 48)
print(f"Number of patches: {patches.shape[0]}, patch dim: {patches.shape[1]}")

# Step 2: Project patches to embedding dim (d=16)
d_model = 16
W_patch = jax.random.normal(k2, (patches.shape[1], d_model)) * 0.1
visual_tokens = patches @ W_patch  # (4, 16)

# Step 3: Create text token embeddings (simulate 3 text tokens)
text_tokens = jax.random.normal(k3, (3, d_model)) * 0.1

# Step 4: Concatenate visual + text tokens
combined = jnp.concatenate([visual_tokens, text_tokens], axis=0)  # (7, 16)
print(f"Combined sequence length: {combined.shape[0]} (4 visual + 3 text)")

# Step 5: Single-head self-attention over the combined sequence
W_Q = jax.random.normal(k4, (d_model, d_model)) * 0.1
k5, k6 = jax.random.split(k4)
W_K = jax.random.normal(k5, (d_model, d_model)) * 0.1
W_V = jax.random.normal(k6, (d_model, d_model)) * 0.1

Q = combined @ W_Q
K = combined @ W_K
V = combined @ W_V
attn_scores = (Q @ K.T) / jnp.sqrt(d_model)
attn_weights = jax.nn.softmax(attn_scores, axis=-1)  # (7, 7)

output = attn_weights @ V  # (7, 16)

# Visualise the cross-modal attention pattern
labels = ['V1', 'V2', 'V3', 'V4', 'T1', 'T2', 'T3']
fig, ax = plt.subplots(figsize=(6, 5))
im = ax.imshow(attn_weights, cmap='Blues')
ax.set_xticks(range(7)); ax.set_xticklabels(labels)
ax.set_yticks(range(7)); ax.set_yticklabels(labels)
ax.set_xlabel('Key'); ax.set_ylabel('Query')
ax.set_title('Self-Attention: Visual (V) and Text (T) Tokens')
plt.colorbar(im, ax=ax); plt.tight_layout(); plt.show()
# Observe: text tokens attend to visual tokens (cross-modal attention)!
```

3. 实现坐标标记化进行视觉定位。给定一个边界框，将其转换为离散标记；给定离散标记，重建边界框。可视化不同bin分辨率下的量化误差。
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt

def encode_bbox(bbox, num_bins=1000):
    """Convert continuous bbox (x, y, w, h) in [0,1] to discrete tokens."""
    tokens = jnp.round(jnp.array(bbox) * (num_bins - 1)).astype(jnp.int32)
    return tokens

def decode_bbox(tokens, num_bins=1000):
    """Convert discrete tokens back to continuous bbox."""
    return tokens.astype(jnp.float32) / (num_bins - 1)

# Ground-truth bounding box (normalised to [0, 1])
gt_bbox = jnp.array([0.123, 0.456, 0.333, 0.222])

# Test quantisation at different bin resolutions
bin_sizes = [10, 50, 100, 500, 1000]
errors = []
for n_bins in bin_sizes:
    tokens = encode_bbox(gt_bbox, n_bins)
    reconstructed = decode_bbox(tokens, n_bins)
    error = jnp.max(jnp.abs(gt_bbox - reconstructed))
    errors.append(float(error))
    print(f"Bins={n_bins:>5d} | Tokens={tokens} | "
          f"Reconstructed={reconstructed} | Max error={error:.6f}")

fig, ax = plt.subplots(figsize=(8, 4))
ax.plot(bin_sizes, errors, 'o-', color='#e74c3c', linewidth=2, markersize=8)
ax.set_xlabel('Number of Bins'); ax.set_ylabel('Max Quantisation Error')
ax.set_title('Bounding Box Quantisation Error vs Bin Resolution')
ax.set_xscale('log'); ax.set_yscale('log')
ax.grid(True, alpha=0.3); plt.tight_layout(); plt.show()
# Try: what happens with very few bins (e.g., 5)? When is the error acceptable?
```
