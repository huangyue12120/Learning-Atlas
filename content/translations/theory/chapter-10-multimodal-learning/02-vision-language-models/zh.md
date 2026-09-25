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

*视觉语言模型联合理解图像和文本，可用于视觉问答、图像描述和视觉推理。本文介绍 VQA、图像描述、视觉定位，以及 VisualBERT、BLIP、LLaVA、Flamingo、PaLI、Qwen-VL 等将视觉编码器与大型语言模型连接起来的架构。*

- 想象一下，你是一位博物馆导游，能够通过看一幅画来描述它：画中有哪些物体，它讲述了一个什么故事，传达了哪些情感，并回答游客提出的问题。**视觉语言模型（VLM）**就是这种计算等价物——一个系统，能够同时理解图像和文本，从而描述视觉场景、回答问题、遵循视觉指令，并在给定自然语言查询的情况下定位图像中的特定对象。

- VLM 位于第 08 章介绍的视觉编码器与第 07 章介绍的语言模型的交界处。核心工程难题是连接两种差异很大的表示：视觉主干网络输出空间连续的特征图，语言模型使用按序排列的离散词元嵌入。本文介绍的架构分别从不同角度解决视觉与语言的融合问题。

![高阶视觉语言模型分类法，显示双编码器、融合编码器和编码器-解码器家族及其输入和输出](../images/vlm_taxonomy.svg)


## 视觉问答

- 假设有人给你看一张照片并问：“公园里有几只狗？”你会看懂图像，找到狗，数出数量并回答。**视觉问答**（VQA）将这项任务形式化为：给定图像 $I$ 和自然语言问题 $q$，预测答案 $a$。

- 这项任务有多种表述方式。最常见的是把 VQA 视为**开放式分类**：模型从固定词表中选择答案，词表通常收录出现频率最高的答案（例如 VQA v2 中的前 3,129 个答案）。也可以把它视为**生成式回答**，让模型生成自由文本；现代 VLM 通常采用这种方式。

- 形式上，需要学习函数 $f(I, q) \to a$，使正确答案的似然最大化。在分类设置中，模型计算：

$$p(a \mid I, q) = \text{softmax}(W \cdot g(v, h))$$
- 其中，$v$ 是视觉特征向量（来自 CNN 或 ViT），$h$ 是问题表示（来自 LSTM 或 Transformer），$g$ 则负责融合两者。模型架构的主要差异往往体现在 $g$ 的设计上。

- **VQA v1**（Antol 等，2015）建立了一个基准数据集，包含 MS COCO 中 204,000 张图像对应的 614,000 个问题。研究人员很快发现，模型可以利用**语言先验**取得出人意料的高准确率，例如不看图像也对“有多少”类问题回答“2”，对“有没有”类问题回答“有”。

- **VQA v2**（Goyal 等，2017）为每个问题配上两张相似但答案不同的图像，以此缓解语言先验造成的问题。这种平衡配对迫使模型依据图像内容推理；数据集规模约为原来的两倍，也削弱了只靠语言线索答题的捷径。

- 其他重要的 VQA 数据集包括：**GQA**（Hudson 和 Manning，2019），其中的问题需要组合多步推理；**OK-VQA**（Marino 等，2019），需要结合图像之外的知识；以及 **TextVQA**（Singh 等，2019），答案取决于读懂图像中的文字。

![VQA 流程：视觉编码器处理图像，文本编码器处理问题，两种表示融合后由分类器预测答案](../images/vqa_pipeline.svg)


- 早期 VQA 模型从预训练 CNN 提取图像特征（通常取 ResNet 或 VGGNet 的倒数第二层，见第 08 章），再用 LSTM 编码问题，最后融合两种表示。融合函数 $g$ 从逐元素乘法发展到**双线性池化**和多模态 Tucker 分解。**双线性注意力**计算 $v^T W h$，其中 $W$ 是可学习的交互矩阵；完整双线性形式包含 $O(d_v \times d_h)$ 个参数，规模过大。**MLB**（多模态低秩双线性池化）把它分解为两个低秩投影，从而降低计算和参数规模。

- 注意力机制推动了 VQA 的发展。**堆叠注意力网络**（Yang 等，2016）使用问题表示关注图像中的空间区域，并逐步调整关注位置。让问题“查看”相关图像区域的做法后来成为标准。

## 图像描述

- 想象朋友一边看你的假期照片，一边讲述画面：“一只金毛猎犬正在阳光明媚的海滩上接飞盘。”**图像描述**任务是为图像生成自然语言说明。与 VQA 不同，模型无需回答具体问题，而要自行判断哪些内容值得描述。

- **Show and Tell**（Vinyals 等，2015）确立了图像描述中的经典编码器—解码器架构。CNN 编码器（如 Inception 或 ResNet）先生成图像特征向量 $v$，再把它作为 LSTM 解码器的初始隐藏状态。解码器随后按自回归方式逐词生成描述：

$$p(w_t \mid w_{1:t-1}, I) = \text{LSTM}(w_{t-1}, h_{t-1})$$
- 整个模型通过最大化标注描述的对数似然进行端到端训练。推理时使用束搜索（见第 07 章）寻找概率较高的描述。

- Show and Tell 会把整张图像压缩成一个向量。复杂场景中的细节难以全部保留，空间信息也会丢失。生成不同词语时，模型无法“回看”图像的特定区域。

- **Show, Attend and Tell**（Xu 等，2015）通过对图像区域施加注意力来解决这一问题。CNN 不再把图像编码为单个向量，而是在最后一个卷积层输出空间特征网格（例如 VGGNet 输出的 $14 \times 14 \times 512$ 特征）。每个解码步骤都会为各空间位置计算注意力权重，得到突出当前词语相关区域的上下文向量。

- 第 06 章介绍的注意力机制中，解码器隐藏状态充当查询，空间特征充当键和值，注意力权重则指示模型应关注的位置。作者提出两种变体：**软注意力**（可微分，对所有区域加权求平均）和**硬注意力**（随机采样单个区域，并使用 REINFORCE 训练）。

![注意力图像描述：解码时模型会关注图像中的不同区域，例如生成“狗”时关注狗所在的位置](../images/attention_captioning.svg)


- 这些模型生成的注意力图直观易读：生成“狗”时，注意力集中在狗所在区域；生成“海滩”时，注意力转向沙地和海水。这是早期展示注意力可提供内在可解释性的重要例子。

- **CIDEr**（Vedantam 等，2015）、**METEOR**、**BLEU** 和 **SPICE** 是常用的图像描述评估指标。CIDEr 计算生成描述与参考描述之间的 TF-IDF 加权 n-gram 相似度，专为图像描述任务设计。现代 VLM 通常在 MS COCO Captions、NoCaps 等基准上使用 CIDEr 评估描述质量。

- 后来的图像描述模型采用了**自底向上注意力**（Anderson 等，2018）：目标检测器（如 Faster R-CNN，见第 08 章）先提出显著图像区域，描述模型再关注这些区域的特征，而不是均匀的特征网格。这种方法在 ViT 编码器普及前曾占据主流。

## 架构模式

- 每个 VLM 都要决定视觉与语言在网络的哪个阶段交互。这个选择决定模型所属的架构类型。常见架构有三种，各有不同取舍。

### 双编码器

- 想象两个翻译器各自工作：一个阅读法语文档，另一个阅读英语文档，再分别用共享的“通用语言”写出摘要。它们彼此不交流，但生成的摘要可以直接比较。这就是**双编码器**模式。

- 视觉编码器 $f_v$ 和文本编码器 $f_t$ 分别把输入映射到同一个 $d$ 维嵌入空间。图像嵌入为 $v = f_v(I) \in \mathbb{R}^d$，文本嵌入为 $t = f_t(q) \in \mathbb{R}^d$。模型通过点积或余弦相似度计算两者的相似度：$\text{sim}(I, q) = v^T t / (\|v\| \|t\|)$。

- CLIP（Radford 等，2021；见前一篇“多模态表示”）是双编码器的代表。它使用从互联网收集的 4 亿组图文对，通过 InfoNCE 对比目标进行训练。由于两个编码器相互独立，系统可以预先计算并缓存所有图像嵌入；检索时只需编码文本查询，因此速度很快。

- 双编码器的弱点是视觉和语言在特征层面从不交互，因此模型难以进行细粒度的跨模态推理。例如，它无法判断说明中的某个词是否对应图像中的特定区域。这限制了它在 VQA 或带定位信息的图像描述等任务中的表现。

### 融合编码器

- 再想象这两个翻译者坐在同一间房里讨论两份文档。他们可以指出具体段落、互相提问，并共同理解内容。这就是**融合编码器**模式。

- 两种模态先分别编码，再通过**交叉注意力层**融合。视觉编码器把图像转换为图像块或区域词元序列 $V = [v_1, \ldots, v_N]$；文本则被切分为词元序列 $T = [t_1, \ldots, t_M]$。在融合层中，文本词元通过交叉注意力关注图像词元：

$$\text{CrossAttn}(T, V) = \text{softmax}\!\left(\frac{(TW_Q)(VW_K)^T}{\sqrt{d_k}}\right)(VW_V)$$
- 这种结构支持细粒度交互：每个文本词元都能关注所需的图像区域。**VisualBERT**、**VilBERT** 和 **UNITER** 等模型采用这种模式。代价是无法预先计算独立嵌入来检索；每组图像和文本都必须经过融合层完整计算一次。

![双编码器与融合编码器对比：双编码器分别计算图像和文本嵌入及其相似度，融合编码器则通过交叉注意力合并两种模态](../images/dual_vs_fusion_encoder.svg)


### 编码器-解码器

- **编码器—解码器**架构将视觉编码器与自回归生成输出词元的文本解码器结合起来，类似于第 07 章的 seq2seq 模型。视觉编码器生成图像的上下文表示，文本解码器在生成文本时通过交叉注意力读取这些表示。

- 这种架构适合生成任务，例如图像描述、自由形式 VQA 回答和视觉对话。**GIT**（Generative Image-to-text Transformer，Wang 等，2022）、**CoCa**（Contrastive Captioner，Yu 等，2022）和 **PaLI** 都采用了这种模式。CoCa 结合双编码器和编码器—解码器的优点：文本解码器前半部分作为单模态文本编码器，用于对比学习；后半部分通过交叉注意力读取图像特征，用于生成图像描述。

- 选择哪种架构取决于目标任务：双编码器适合大规模检索，融合编码器适合细粒度理解，编码器—解码器适合生成任务。现代先进 VLM 越来越多地采用编码器—解码器或仅解码器架构，把视觉语言任务统一表述为文本生成。

## Flamingo：少样本多模态学习

- Flamingo（Alonso et al., 2022，DeepMind）将预训练语言模型与预训练视觉编码器连接起来，只增加少量轻量组件，便能让模型通过上下文中的少数示例完成多模态任务。

- Flamingo 冻结预训练视觉编码器 NFNet 和语言模型 Chinchilla，只训练连接二者的组件：Perceiver Resampler（感知器重采样器）和门控交叉注意力层。

- Perceiver Resampler 将视觉编码器产生的可变长度输出（长度取决于图像分辨率）压缩为固定数量的视觉词元，通常为 $N = 64$ 个。它先初始化 $N$ 个可学习的查询向量，再用交叉注意力让这些查询读取视觉编码器的全部输出。这相当于把 Perceiver 架构（Jaegle et al., 2021）用作信息瓶颈：无论输入图像尺寸如何，输出的视觉表示长度都固定且紧凑。

$$z = \text{CrossAttn}(Q_{\text{learned}}, V_{\text{image}}) \in \mathbb{R}^{N \times d}$$

- 门控交叉注意力层交错插入冻结的语言模型各层之间。在这些层中，语言模型的文本词元对 Perceiver Resampler 生成的视觉词元执行交叉注意力。每层都包含一个初始值为零的可学习标量门 $\alpha$：交叉注意力的输出先乘以该门，再加到残差流中。

$$\hat{x} = x + \alpha \cdot \text{CrossAttn}(x, z)$$

- 由于 $\alpha = 0$，训练开始时交叉注意力不会为模型提供信息，模型行为与原先冻结的语言模型相同。训练过程中，门值逐渐增大，视觉信息随之融入语言模型的预训练表示，同时尽量避免破坏原有表示。

![Flamingo 架构：冻结的视觉编码器将输出送入 Perceiver Resampler，生成定长视觉词元；这些词元通过交错插入语言模型层之间的门控交叉注意力层注入冻结的语言模型](../images/flamingo_architecture.svg)

- Flamingo 原生支持**图文交错序列**。输入可以包含多张图像以及穿插其间的文本，例如：“[图像 1] 这是一只猫。[图像 2] 这是一只狗。[图像 3] 这是一只 ___。”模型分别通过视觉编码器和 Perceiver Resampler 处理图像，再把相应的视觉词元插入文本序列。语言模型的因果注意力掩码保证每个文本词元只能关注当前图像及此前图像对应的视觉词元。

- 这种图文交错输入支持**少样本多模态学习**：只需在上下文中提供少量图文示例，Flamingo 无需更新模型参数，就能完成新任务。在 VQAv2、OK-VQA 和图像描述等基准上，80B 参数的 Flamingo 取得了当时领先的少样本表现；有些任务中，它的表现可与用 4 个或 32 个示例微调的专用模型相当，甚至更好。

## LLaVA 与视觉指令微调

- LLaVA（Large Language and Vision Assistant，Liu et al., 2023）用简单的线性层将视觉特征投影到大语言模型（LLM）的词元嵌入空间，再用指令跟随数据微调整个系统。

- LLaVA 的架构较为直接：图像先经预训练的 CLIP ViT-L/14 视觉编码器，得到网格状图块特征 $V \in \mathbb{R}^{N \times d_v}$；对于 336 像素图像和 14 像素图块，$N = 256$。投影层 $W$ 将这些视觉特征映射到 LLM 的嵌入维度：

$$H_v = VW, \quad W \in \mathbb{R}^{d_v \times d_{\text{LLM}}}$$

- 投影后的视觉词元 $H_v$ 与文本词元嵌入拼接成一个序列，再输入 LLM（Vicuna，即微调后的 LLaMA）。LLM 使用标准因果自注意力处理该序列；这一架构不需要专门的交叉注意力层或 Perceiver 模块。视觉词元与文本词元一起参与处理，只是前者编码的是视觉信息。

![LLaVA 架构：CLIP ViT 将图像编码为图块特征，线性投影把特征映射至 LLM 的嵌入空间，再将视觉词元置于文本词元之前输入 LLM](../images/llava_architecture.svg)

- **视觉指令微调**是 LLaVA 的关键训练方法。作者使用 GPT-4 根据 COCO 图像生成了 158,000 条多模态指令跟随样例。每条样例包含一张图像和一段对话式指令，例如“详细描述这张图”“这张图有什么特别之处？”或“如果我是来这里旅游的游客，有什么需要了解？”。训练目标是让模型根据图像和指令生成 GPT-4 撰写的回答。

- 训练分两个阶段。**第一阶段（预训练）**：使用 CC3M 中的 595K 组图像—描述文本对，只训练投影层 $W$，冻结视觉编码器和 LLM，使 $W$ 学会把视觉特征对齐到 LLM 的嵌入空间。**第二阶段（微调）**：使用指令跟随数据联合微调投影层和 LLM，继续冻结视觉编码器，使模型学会遵循复杂的视觉指令。

- **LLaVA-1.5**主要改动有三项：用两层 MLP 替换单层线性投影，以增强映射能力；改用 336 像素而非 224 像素的图像，产生更多图块词元；并把学术 VQA 数据集加入训练数据。这些改动显著提升了基准测试表现。

- LLaVA 表明，连接视觉编码器与 LLM 不一定需要 Flamingo 的 Perceiver Resampler 或门控交叉注意力等复杂组件。简单的线性投影配合高质量指令微调数据，也能有效完成这项工作。此后许多开源 VLM 都采用了类似方案。

## 视觉语言模型的扩展

- 视觉语言模型很快从概念验证发展到使用数十亿图文对训练的大规模系统。PaLI、Qwen-VL 和 InternVL 展示了不同的扩展路线。

### PaLI

- PaLI（Pathways Language and Image model，Chen et al., 2022，Google）同时扩展视觉编码器和语言模型：它使用 4B 参数的 ViT-e 作为视觉编码器、13B 参数的 mT5 作为语言模型，总参数量为 17B。图像被编码为图块词元序列，放在文本词元之前，一并输入编码器—解码器 mT5。

- PaLI 的一个关键发现是，扩大视觉编码器与扩大语言模型同样重要。此前的工作通常使用中等规模的视觉主干网络（如 ViT-B 或 ViT-L），把参数预算主要投向 LLM。PaLI 显示，在 JFT-4B（包含 40 亿张带标注图像）上预训练的 4B 参数 ViT-e，能显著提升 OCR 和空间推理等细粒度视觉任务的表现。

- PaLI 使用 WebLI 训练。该数据集包含 100 亿组图像—文本对，覆盖 109 种语言，因此 PaLI 具备多语言能力。预训练混合图像描述、VQA 和图文匹配等任务，并按照第 7 章介绍的 T5 范式统一为文本到文本生成。后续版本包括 55B 参数的 PaLI-X，以及使用 SigLIP 作为视觉编码器、参数量为 5B 的 PaLI-3。

### Qwen-VL

- Qwen-VL（Bai et al., 2023，Alibaba）在 Qwen LLM 上加入 ViT 视觉编码器和单层交叉注意力模块。该模块类似 Flamingo 的 Perceiver Resampler，会把视觉编码器输出压缩为固定的 256 个视觉词元；之后将它们与文本词元拼接，交给 Qwen LLM 处理。

- Qwen-VL 的训练分三个阶段。**第一阶段**：使用 14 亿组弱监督图文对进行预训练，只解冻视觉编码器。**第二阶段**：解冻整个模型，使用质量更高的 VQA、图像描述、视觉定位和 OCR 数据进行多任务预训练。**第三阶段**：使用指令跟随和对话数据进行监督微调。从噪声较多的网页数据逐步过渡到筛选后的指令数据，是许多现代 VLM 采用的训练路线。

- **Qwen2-VL**（2024）支持动态分辨率：它不再把所有图像缩放到同一尺寸，而是按图像原始分辨率调整视觉词元数量。高分辨率图像产生更多词元，低分辨率图像产生更少词元。这样既能提升文档理解、细粒度识别等任务的表现，也能避免对低分辨率输入进行不必要的计算。

### InternVL

- InternVL（Chen et al., 2024，上海人工智能实验室）大幅扩展视觉编码器，采用 60 亿参数的视觉 Transformer InternViT-6B，并与语言模型配合使用。它的一项关键设计是动态高分辨率处理：图像被切分为 448 × 448 像素的图块，每块分别由视觉编码器处理，再把各图块的特征与整幅图像缩略图的特征拼接起来。因此，模型可以处理不同宽高比和分辨率的图像。

- InternVL-2 进一步采用**渐进式对齐训练**：先用对比学习目标（如 CLIP）对齐视觉编码器，再通过轻量 MLP 连接器将其接入 LLM，最后使用指令数据端到端微调。按阶段训练旨在避免视觉编码器预训练表示发生灾难性遗忘。

![视觉语言模型的扩展：比较 PaLI、Qwen-VL 和 InternVL 连接视觉编码器与语言模型的方式及各自的训练阶段](../images/scaling_vlms_comparison.svg)

- 这三个模型家族都体现了训练数据筛选的重要性。网页抓取得到的图文对常有噪声，图像和文本也可能不匹配。训练各阶段会逐步过滤和筛选数据，从数十亿组噪声较多的图文对转向数百万条高质量指令样例。最终微调数据的质量往往比模型参数量更能影响表现。

## 视觉定位与指代表达

- 设想你在一群人中指着某个人说“戴红帽子的女人”。这句话用语言指向了图像中的特定区域。**视觉定位**（visual grounding）就是根据图像和自然语言指代表达，找出被指对象的位置。**指代表达理解**输出边界框，**指代表达分割**输出像素掩码。

- 形式上，给定图像 $I$ 和指代表达 $r$（例如“左侧的大棕狗”），模型预测边界框 $b = (x, y, w, h)$ 或一组用于定位目标的坐标。RefCOCO、RefCOCO+ 和 RefCOCOg 等数据集包含有多个物体的图像，并为物体提供无歧义的指代表达。

- 早期视觉定位模型采用两阶段方法：先用 Faster R-CNN 等方法生成候选区域，再通过融合模型计算每个候选区域与语言查询的匹配分数，并选出得分最高的区域。这种方法计算开销较大，而且效果受候选区域质量限制。

- 现代 VLM 会把视觉定位直接纳入生成过程。一个常见做法是把边界框坐标表示为**文本词元**：将连续坐标空间离散为多个区间（例如，分别把 $x, y, w, h$ 划分为 1,000 个区间），再把 `<loc_342>` 这样的特殊位置词元加入词表。模型输出一串位置词元来表示边界框：

$$\text{Output: } \texttt{<loc\_102><loc\_215><loc\_487><loc\_398>}$$

- 这种词元化方法让自回归语言模型无需更改架构就能预测位置，只要学会输出坐标词元即可。Pix2Seq（Chen et al., 2022）率先将这种方法用于目标检测；Qwen-VL、Ferret 和 Kosmos-2 等模型则将其扩展到指代表达理解和短语定位。

- Kosmos-2（Peng et al., 2023，Microsoft）通过在生成文本中嵌入表示空间位置的特殊词元，使多模态大语言模型具备视觉定位能力。例如，模型可以生成：“一只 `<phrase>`金毛寻回犬`</phrase>` `<box>` `<loc_102>` `<loc_215>` `<loc_487>` `<loc_398>` `</box>` 正在接飞盘。”文本与空间词元交错出现，使模型能够同时描述图像并定位对象。

![用坐标词元进行视觉定位：模型在生成文本时插入离散化的边界框坐标词元，以定位描述中提到的对象](../images/grounding_coordinate_tokens.svg)

- **点式定位**进一步简化了输出：模型不预测边界框，而是预测一个点，通常是目标中心。用户询问“最近的出口在哪里？”时，系统可以在图像上标出该点。Shikra 和 Ferret 除了支持边界框定位，也支持点式定位。

## 无 OCR 文档理解

- 传统文档理解流程通常先用 OCR 提取文字和版面信息，再把提取的文本交给语言模型。这种多阶段流程容易受 OCR 错误影响，版面信息也常会丢失或表示不充分。无 OCR 方法尝试直接从像素读取文档内容。

- Donut（Document Understanding Transformer，Kim et al., 2022）不使用 OCR。它用 Swin Transformer（第 8 章）编码文档图像，再由 BART 风格的 Transformer 解码器根据视觉特征直接生成结构化文本。输出可以是 JSON、键值对或纯文本，具体取决于任务。

- Donut 分两个阶段训练。**预训练**阶段执行合成 OCR：给定文档图像，模型生成其中的完整文本内容。训练数据是由文本语料渲染出的数百万张合成文档图像，帮助视觉编码器识别字符、字体和版面。**微调**阶段则针对收据解析、表单理解或文档分类等下游任务，让模型生成对应的结构化结果。

- Donut 解码器通过提示词指定任务，例如用 `<doc_class>` 进行分类，或用 `<parse_receipt>` 解析收据；模型根据提示生成结果。这个统一接口让同一模型能够处理多种文档理解任务。

- Pix2Struct（Lee et al., 2023，Google）将无 OCR 方法用于网页理解和图表解读。它的关键预训练目标是**截图解析**：给定一张部分遮挡的网页截图，模型生成产生可见区域的底层 HTML，从而学习视觉呈现与结构化标记之间的关系。

- Pix2Struct 还支持**可变分辨率输入**：它不把所有图像缩放到固定尺寸（这会改变宽高比并损失细小文字），而是在保留原始宽高比的前提下，将图像表示为固定数量的图块。纵向细长的文档会对应纵向细长的图块网格。文档的宽高比携带语义信息，例如收据通常窄而高，电子表格通常宽而矮。

![无 OCR 文档理解：Donut 和 Pix2Struct 直接编码文档图像并生成结构化文本，无需 OCR 预处理](../images/ocr_free_document_understanding.svg)

- Nougat（Blecher et al., 2023，Meta）采用 Donut 架构专门处理学术论文，直接从 PDF 页面图像生成完整的 LaTeX 标记。它能处理复杂公式、表格和图形；传统 OCR 流程在这些任务上往往效果不佳。模型使用 PDF 页面图像及对应 LaTeX 源代码组成的数据对进行训练。

- 无 OCR 模型体现了一种更广泛的深度学习思路：直接从像素等原始输入学习的端到端模型，往往优于复杂的多阶段流程，因为它可以联合优化各组件，并学习适合最终任务的表示。中间的 OCR 环节可能成为瓶颈，限制模型能学到的内容。

## 视觉词元处理流程

- 无论采用哪种架构，VLM 都需要把图像转换成语言模型能够处理的词元序列。具体流程因模型而异，通常包含以下步骤。

- **步骤 1：提取图像块。** 将高度为 $H$、宽度为 $W$ 的图像切分为边长 $P$ 的非重叠图像块，得到 $N = HW / P^2$ 个图像块。例如，336 × 336 的图像切分为 14 × 14 的图像块后，$N = 576$。

- **步骤 2：视觉编码。** 每个图像块先经过线性投影，再输入视觉编码器（通常为 ViT）。输出为带上下文信息的图像块嵌入序列 $V = [v_1, \ldots, v_N] \in \mathbb{R}^{N \times d_v}$。这些嵌入同时包含局部外观信息和自注意力带来的全局上下文。

- **步骤 3：压缩词元（可选）。** 有些模型会把 $N$ 个视觉词元压缩成 $M \ll N$ 个，以减少语言模型的计算负担。Flamingo 使用 Perceiver Resampler（$M = 64$）；Qwen-VL 使用交叉注意力（$M = 256$）；BLIP-2 中的 Q-Former（Li et al., 2023）则用 $M = 32$ 个可学习查询词元，对视觉编码器输出执行交叉注意力。

- **步骤 4：投影。** 通过线性层或 MLP，把完整或压缩后的视觉词元投影到语言模型的嵌入空间。投影后，视觉词元与文本词元嵌入维度相同，可以拼接在一起。

- **步骤 5：输入 LLM。** 把投影后的视觉词元放到序列中 `<image>` 占位词元所在的位置，再将组合序列输入语言模型。LLM 的自注意力使文本词元和视觉词元能够彼此关注。

![视觉词元处理流程：提取图像块并用 ViT 编码，可选地通过 Perceiver 或 Q-Former 压缩，再投影到 LLM 维度并与文本词元拼接](../images/visual_token_pipeline.svg)

- 视觉词元数量会直接影响计算开销。每个视觉词元都会参与 LLM 的自注意力计算，而这类计算的复杂度随序列长度呈二次增长。高分辨率图像可能产生数百甚至数千个视觉词元，占用大量上下文窗口。因此，词元压缩很有用：把 576 个视觉词元压缩到 64 个，视觉词元对注意力计算的贡献约减少到原来的九分之一。

- BLIP-2（Li et al., 2023）采用了一种高效的连接方案：在冻结的视觉编码器和冻结的 LLM 之间加入轻量级 Q-Former（带可学习查询的小型 Transformer）。Q-Former 是唯一需要训练的组件，视觉编码器和 LLM 都保持冻结。预训练分两个阶段：先通过图文对比学习、图文匹配和图像描述目标与视觉编码器对齐，再通过语言生成目标与 LLM 对齐。这种模块化设计使 BLIP-2 能把不同视觉编码器接入不同 LLM。

## 训练目标

- VLM 会根据架构组合不同训练目标：

- **图文对比损失（ITC）**：将图像和文本表示映射到共享嵌入空间中并进行对齐，做法类似 CLIP。它是双编码器的主要训练目标，也常用于融合编码器的预训练。损失函数与上一文件介绍的 InfoNCE 损失相同。

- **图文匹配（ITM）**：二分类任务。给定一张图像和一段文本，模型判断二者是否匹配。困难负样本（与图像内容相似、但实际配对的是另一张图像的文本）会增加任务难度，促使模型学习更细粒度的图文对齐。

- **语言建模（LM）**：标准的自回归目标，即根据此前的词元预测下一个词元。对于 VLM，此前的词元序列还包括视觉词元，因此模型学习根据视觉输入生成文本。这是编码器—解码器和仅解码器 VLM 的主要训练目标。

$$\mathcal{L}_{\text{LM}} = -\sum_{t=1}^{T} \log p(w_t \mid w_{<t}, V)$$

- **前缀语言建模**：图像和文本前缀作为上下文提供，不作为预测目标；模型只需生成后续内容。PaLI 和 SimVLM 等模型使用这一目标。

- 许多现代 VLM 在预训练时组合多个目标（例如 BLIP 使用 ITC、ITM 和 LM，CoCa 使用 ITC 和 LM），之后再用纯 LM 目标在指令数据上微调。

## 编程任务（使用 Colab 或笔记本）

1. 实现一个简单的基于注意力的图像描述解码器。使用随机“图像特征”作为编码器输出，训练解码器生成固定描述，并观察每个解码步骤的注意力权重如何在不同空间位置间变化。

   **说明：**原代码把给定词序列作为输入执行前向计算，没有预测词元的输出层，也没有定义损失函数、优化器或参数更新步骤，因此既没有训练解码器，也没有实际生成描述；直接运行无法保证出现有意义的注意力变化。
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

2. 模拟视觉词元处理流程：将图像切分为图像块，把图像块投影到嵌入空间，再与文本词元嵌入拼接，最后在组合序列上运行单层自注意力。
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

3. 用坐标词元实现视觉定位。将给定边界框转换为离散词元，再从词元还原边界框，并比较不同区间数下的量化误差。
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
