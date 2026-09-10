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

*视觉语言模型联合理解图像和文本，支持视觉问答、图像描述和视觉推理。本篇介绍 VQA、图像描述、视觉定位，以及 VisualBERT、BLIP、LLaVA、Flamingo、PaLI 和 Qwen-VL 等把视觉编码器与大型语言模型融合的架构。*

- 想象一位博物馆讲解员：他能看着一幅画说出画面中的物体、讲述的故事和传达的情绪，回答参观者提出的任何问题。**视觉语言模型（VLM）**就是它的计算机版本——一种联合理解图像与文本的系统，能够描述视觉场景、回答相关问题、遵循视觉指令，甚至根据自然语言查询在图像中定位特定物体。

- VLM 位于第 08 章介绍的视觉编码器与第 07 章介绍的语言模型交汇处。核心工程挑战是连接两个非常不同的表示世界：视觉骨干网络的空间、连续特征图，以及语言模型的序列、离散 token 嵌入。本篇的每种架构本质上都在回答同一个问题：怎样融合视觉和语言？

![VLM 高层分类：双编码器、融合编码器和编码器—解码器家族及其输入输出](../images/vlm_taxonomy.svg)

## 视觉问答

- 想象有人给你看一张照片并问“公园里有几只狗？”你会不假思索地解析图像、找到狗、数出数量并作答。**视觉问答（VQA）**将这个过程形式化：给定图像 $I$ 和自然语言问题 $q$，预测答案 $a$。

- 这项任务有多种表述方式。最常见的是**开放式分类**：模型从最常见答案的固定词表中选择一个（例如 VQA v2 的前 3,129 个答案）。也可以把它视为**生成式回答**，让模型输出自由文本；现代 VLM 采用的正是后者。

- 形式化地说，需要学习函数 $f(I, q) \to a$，最大化正确答案的似然。在分类设置下，它变成：

$$p(a \mid I, q) = \text{softmax}(W \cdot g(v, h))$$

- 其中 $v$ 是视觉特征向量（来自 CNN 或 ViT），$h$ 是问题编码（来自 LSTM 或 Transformer），$g$ 是把二者组合起来的融合函数。真正的架构创造力就体现在如何设计 $g$。

- **VQA v1**（Antol 等，2015）建立了这个基准：来自 MS COCO 的 204,000 张图像上有 614,000 个问题。研究者很快发现，模型可以利用**语言先验**获得出人意料的高准确率——对“多少”问题回答“2”，对“有没有”问题回答“是”，甚至不看图像。

- **VQA v2**（Goyal 等，2017）把每个问题配对到两张相似但答案不同的图像，解决了这个问题。这迫使模型把推理真正建立在视觉内容上。平衡配对大致让数据集翻倍，也让只用语言的捷径大幅失效。

- 其他重要 VQA 数据集包括：需要多步组合推理的 **GQA**（Hudson 与 Manning，2019）；需要图像之外知识的 **OK-VQA**（Marino 等，2019）；以及答案依赖读取图像文字的 **TextVQA**（Singh 等，2019）。

![VQA 流水线：图像经过视觉编码器、问题经过文本编码器，二者表示被融合后分类为答案](../images/vqa_pipeline.svg)

- 早期 VQA 模型使用简单策略：从预训练 CNN（通常是第 08 章 ResNet 或 VGGNet 的倒数第二层）提取图像特征，用 LSTM（第 06 章）编码问题，再把二者组合起来。组合函数 $g$ 很快演进：从逐元素乘法，到双线性池化，再到多模态 Tucker 分解。**双线性注意力**计算 $v^T W h$，其中 $W$ 是可学习的交互矩阵；但完整双线性形式需要 $O(d_v \times d_h)$ 个参数，规模大得无法接受。**MLB**（多模态低秩双线性池化）把它分解成两个低秩投影，使之可行。

- VQA 的突破来自注意力。**堆叠注意力网络**（Yang 等，2016）利用问题编码在图像空间区域上做注意力，迭代细化应关注图像的哪些部分。让问题“查看”相关图像区域的想法随后成为标准做法。

## 图像描述

- 想象朋友翻看你的旅行照片、说出看到的内容：“一只金毛在阳光明媚的海滩上接飞盘。”**图像描述**就是为图像生成自然语言描述的任务。与 VQA 不同，它没有问题，模型必须自行决定哪些内容值得描述。

- **Show and Tell**（Vinyals 等，2015）确立了描述任务的经典编码器—解码器架构。CNN 编码器（如 Inception 或 ResNet）产生单个图像特征向量 $v$。该向量作为 LSTM 解码器的初始隐藏状态，解码器再自回归地逐词生成描述：

$$p(w_t \mid w_{1:t-1}, I) = \text{LSTM}(w_{t-1}, h_{t-1})$$

- 整个模型通过最大化真实描述的对数似然端到端训练。推理时使用束搜索（第 07 章）寻找高概率描述。

- Show and Tell 的问题是把整张图像压缩成一个向量。对复杂场景来说，单个向量无法容纳所有相关细节；空间信息丢失，模型在生成不同词语时无法“回看”图像的具体区域。

- **Show, Attend and Tell**（Xu 等，2015）引入**图像区域注意力**解决了这一点。CNN 不再把图像编码成一个向量，而是产生空间特征网格（例如 VGGNet 最后一层卷积得到的 $14 \times 14 \times 512$）。每个解码步骤中，模型对这些空间位置计算注意力权重，产生突出当前词最相关区域的上下文向量。

- 回顾第 06 章的注意力机制：解码器隐藏状态充当查询，空间特征充当键和值，注意力权重告诉模型该看哪里。作者提出两个变体：**软注意力**（可微、对所有区域加权平均）和**硬注意力**（随机采样单个区域，用 REINFORCE 训练）。

![基于注意力的图像描述：每个解码步骤关注图像不同空间区域，生成“dog”时聚焦于狗](../images/attention_captioning.svg)

- 这些模型生成的注意力图非常易解释：生成 “dog” 时注意力在狗所在区域达到峰值；生成 “beach” 时移向沙滩和水面。这是注意力提供内置可解释性的首批有力展示之一。

- **CIDEr**（Vedantam 等，2015）、**METEOR**、**BLEU** 和 **SPICE** 是描述任务的标准评估指标。CIDEr 计算生成描述与参考描述之间 TF-IDF 加权的 n-gram 相似度，专为描述评估设计。现代 VLM 通常在 MS COCO Captions 和 NoCaps 等基准上使用 CIDEr。

- 后来的描述模型加入了**自底向上注意力**（Anderson 等，2018）：先由目标检测器（Faster R-CNN，第 08 章）提出显著图像区域，再让描述模型关注这些区域特征，而非均匀网格。在 ViT 编码器取代它之前，这是主流方法。

## 架构模式

- 每个 VLM 都必须回答一个基本设计问题：视觉和语言在什么位置发生交互？答案决定模型所属的架构家族。主要有三种模式，各自有不同的权衡。

### 双编码器

- 想象两位翻译员独立工作：一位读法语文档，另一位读英语文档，各自用一种共享的“通用语言”写摘要。他们翻译时不交流，但摘要可以直接比较。这就是**双编码器**模式。

- 视觉编码器 $f_v$ 和文本编码器 $f_t$ 独立地把各自输入映射到维度为 $d$ 的共享嵌入空间。图像嵌入为 $v = f_v(I) \in \mathbb{R}^d$，文本嵌入为 $t = f_t(q) \in \mathbb{R}^d$。相似度用点积或余弦相似度计算：$\text{sim}(I, q) = v^T t / (\|v\| \|t\|)$。

- CLIP（Radford 等，2021）是典型双编码器，上一份多模态表示笔记已经介绍。它在从互联网抓取的 4 亿图文对上使用对比目标（InfoNCE）训练。因为编码器相互独立，可以预先计算并缓存所有图像嵌入，检索效率极高：搜索时只需编码查询文本。

- 双编码器的弱点是视觉和语言在特征层从未交互。模型无法执行细粒度跨模态推理，例如无法判断描述中的某个词是否对应图像中的某个具体区域，因此不适合 VQA 或有定位的图像描述。

### 融合编码器

- 现在想象两位翻译员在同一房间里积极讨论两份文档。他们可以指向具体段落、互相提问并建立共同理解。这就是**融合编码器**模式。

- 两种模态先分别编码，再通过**交叉注意力层**融合，让一类模态的 token 关注另一类模态的 token。图像先经视觉编码器得到图块或区域 token 序列 $V = [v_1, \ldots, v_N]$，文本分词为 $T = [t_1, \ldots, t_M]$。在融合层中，文本 token 通过交叉注意力关注图像 token：

$$\text{CrossAttn}(T, V) = \text{softmax}\!\left(\frac{(TW_Q)(VW_K)^T}{\sqrt{d_k}}\right)(VW_V)$$

- 这支持细粒度交互：每个文本 token 都能关注自己需要的具体图像区域。**VisualBERT**、**VilBERT** 和 **UNITER** 等模型采用这种模式。代价是不能再为检索预先计算独立嵌入，每个图文对都必须完整通过融合层。

![双编码器与融合编码器：前者计算独立嵌入和相似度，后者通过交叉注意力层合并模态](../images/dual_vs_fusion_encoder.svg)

### 编码器—解码器

- **编码器—解码器**模式把视觉编码器与自回归生成输出 token 的文本解码器结合起来，类似第 07 章的 seq2seq 模型。视觉编码器产生上下文图像表示，文本解码器在生成输出时对这些表示做交叉注意力。

- 这种模式天然支持生成任务：图像描述、自由回答的 VQA 和视觉对话。**GIT**（Generative Image-to-text Transformer，Wang 等，2022）、**CoCa**（Contrastive Captioner，Yu 等，2022）和 **PaLI** 都采用此架构。CoCa 巧妙地结合双编码器和编码器—解码器：文本解码器前半部分作为单模态文本编码器用于对比学习，后半部分对图像特征做交叉注意力用于生成描述，兼得两者优点。

- 三种模式的选择取决于目标任务：双编码器适合大规模检索，融合编码器适合细粒度理解，编码器—解码器对生成任务最灵活。现代最先进 VLM 越来越多采用编码器—解码器或仅解码器范式，把所有视觉语言任务都视为文本生成。

## Flamingo：少样本多模态学习

- 想象一位同时研究艺术和文学多年的专家，只看一两个例子，就能优雅地描述完全陌生的绘画风格。**Flamingo**（Alonso 等，2022，DeepMind）正是基于这个原则：利用强大的预训练语言模型和预训练视觉编码器，用轻量架构组件连接二者，让模型在多模态任务上进行少样本学习。

- Flamingo 的设计哲学保守而有效：冻结预训练视觉编码器（NFNet）和语言模型（Chinchilla），只学习连接二者的“胶水”。胶水由两个组件组成：**Perceiver Resampler** 和**门控交叉注意力层**。

- **Perceiver Resampler** 接收视觉编码器的可变长度输出（长度取决于图像分辨率），把它压缩为固定数量 $N$ 的视觉 token（通常 $N = 64$）。它初始化 $N$ 个可学习查询向量，用交叉注意力让查询关注视觉编码器的全部输出。这本质上是把 Perceiver 架构（Jaegle 等，2021）用作瓶颈：无论输入图像多大，都产生紧凑、固定大小的视觉表示。

$$z = \text{CrossAttn}(Q_{\text{learned}}, V_{\text{image}}) \in \mathbb{R}^{N \times d}$$

- **门控交叉注意力层**交错插入冻结语言模型的层之间。在每个门控层，语言模型的文本 token 对 Perceiver Resampler 产生的视觉 token 做交叉注意力。关键是每层都有一个可学习标量门 $\alpha$，初始为零，在把交叉注意力输出加入残差流之前先乘以它：

$$\hat{x} = x + \alpha \cdot \text{CrossAttn}(x, z)$$

- 初始化 $\alpha = 0$ 意味着训练开始时交叉注意力没有贡献，模型完全等同于原来冻结的语言模型。门在训练中逐渐打开，平滑地整合视觉信息，不破坏语言模型已经学习的表示。

![Flamingo 架构：冻结的视觉编码器输入 Perceiver Resampler 产生固定长度视觉 token，再通过交错在语言模型块之间的门控交叉注意力注入冻结 LM](../images/flamingo_architecture.svg)

- Flamingo 原生支持**交错图文序列**。可以输入含多张图像和文本的提示，例如：“[图像 1] 这是一只猫。[图像 2] 这是一只狗。[图像 3] 这是一只 ___。”模型分别处理每张图像，视觉 token 在文本序列对应位置插入。语言模型的因果注意力掩码确保每个文本 token 只能关注当前和此前图像的视觉 token。

- 这种交错能力支持强大的**少样本多模态学习**。在上下文中提供几个图文示例，Flamingo 无需梯度更新就能执行新任务。在 VQAv2、OK-VQA 和描述基准上，80B 参数的 Flamingo 以少样本方式达到最先进表现，仅用 4 或 32 个示例就常常能匹敌或超过微调的专用模型。

## LLaVA 与视觉指令微调

- 想象一个出色的语言专家（LLM）和一位出色的艺术评论家（视觉编码器）。如果让评论家学会“说语言专家的语言”，两者就能无缝合作。**LLaVA**（Large Language and Vision Assistant，Liu 等，2023）正是如此：用简单线性层把视觉特征投影到 LLM 的 token 嵌入空间，再在指令遵循数据上微调整个系统。

- LLaVA 架构非常简单。图像由预训练 CLIP ViT-L/14 编码器编码为图块特征网格 $V \in \mathbb{R}^{N \times d_v}$，其中 336px 图像、14px 图块产生 $N = 256$ 个图块。**投影层** $W$ 把视觉特征映射到 LLM 嵌入维度：

$$H_v = VW, \quad W \in \mathbb{R}^{d_v \times d_{\text{LLM}}}$$

- 投影后的视觉 token $H_v$ 直接与文本 token 嵌入拼接，作为单个序列输入 LLM（经过微调的 LLaMA，即 Vicuna）。LLM 用标准因果自注意力处理它们，没有特殊交叉注意力层，没有 Perceiver，只有拼接；视觉 token 被当作恰好编码视觉信息的文本 token。

![LLaVA 架构：CLIP ViT 将图像编码为图块特征，线性投影映射到 LLM 嵌入空间，视觉 token 置于文本 token 前并输入 LLM](../images/llava_architecture.svg)

- **视觉指令微调**是 LLaVA 的关键训练创新。作者使用 GPT-4 根据 COCO 图像生成 158,000 个多模态指令遵循示例。每个示例由图像和对话式指令组成，如“详细描述这张图”“图中有什么不寻常之处？”“如果我是来这里旅游的人，应该知道什么？”模型学习根据图像和指令生成 GPT-4 撰写的回答。

- 训练分两个阶段。**阶段 1（预训练）**：在图像描述对（来自 CC3M 的 595K 对）上只训练投影层 $W$，视觉编码器与 LLM 都冻结，教会 $W$ 把视觉特征对齐到 LLM 嵌入空间。**阶段 2（微调）**：在指令遵循数据上联合微调投影层和 LLM，视觉编码器仍冻结，教会模型遵循复杂的视觉指令。

- **LLaVA-1.5** 通过三个关键变化改进原版：把单线性投影换成两层 MLP（映射更有表现力）；使用更高分辨率图像（336px 而非 224px，产生更多图块 token）；把学术 VQA 数据集加入训练混合。这些看似微小的修改带来了基准表现的大幅提升。

- LLaVA 证明不必使用 Flamingo 的 Perceiver Resampler 或门控交叉注意力等复杂创新。简单线性投影配合高质量指令微调数据，就足以有效连接视觉编码器和 LLM。这种简单性让 LLaVA 极具影响力——后续大多数开源 VLM 都采用类似方案。

## 扩展视觉语言模型

- 领域迅速从概念验证 VLM 发展到在数十亿图文对上训练的工业级系统。三个模型家族体现了不同的扩展方式。

### PaLI

- **PaLI**（Pathways Language and Image model，Chen 等，2022，Google）同时扩展视觉编码器和语言模型。PaLI 使用 ViT-e（40 亿参数）作为视觉编码器，使用 mT5（130 亿参数）作为语言模型，总计 170 亿参数。图像编码成图块 token 序列，置于文本 token 前，输入编码器—解码器 mT5。

- PaLI 的关键洞见是：**扩展视觉编码器与扩展语言模型同样重要**。此前工作通常使用固定的中等规模视觉骨干（如 ViT-B 或 ViT-L），把全部参数预算投入 LLM。PaLI 表明，在 JFT-4B（40 亿张标注图像）上预训练的 40 亿参数 ViT-e 能显著改善 OCR、空间推理等细粒度视觉任务。

- PaLI 在 WebLI 上训练，该数据集含 109 种语言的 100 亿图文对，因此天然多语言。模型用多任务混合预训练：图像描述、VQA、图文匹配，全部按照第 07 章的 T5 范式转化为文本到文本生成。**PaLI-X**（550 亿参数）和 **PaLI-3**（50 亿参数，使用 SigLIP 视觉编码器）是后续版本。

### Qwen-VL

- **Qwen-VL**（Bai 等，2023，阿里巴巴）在 Qwen LLM 上加入 ViT 视觉编码器和单层交叉注意力模块（类似 Flamingo 的 Perceiver Resampler），把视觉编码器输出压缩为固定的 256 个视觉 token。视觉 token 与文本 token 拼接后交给 Qwen LLM。

- Qwen-VL 采用三阶段训练。阶段 1：在 14 亿弱监督图文对上预训练，只解冻视觉编码器。阶段 2：在包括 VQA、描述、定位和 OCR 的高质量数据上多任务预训练，解冻整个模型。阶段 3：在指令遵循和对话数据上监督微调。这种从嘈杂网页数据到精选指令数据的渐进式改进，是现代 VLM 的共同模式。

- **Qwen2-VL**（2024）引入**动态分辨率**：不把所有图像缩放到固定大小，而是按原生分辨率处理，通过动态调整视觉 token 数。高分辨率图像产生更多 token，低分辨率图像产生更少 token。在文档理解和细粒度识别等对细节敏感的任务上，这能提高性能，又不会把计算浪费在低分辨率输入上。

### InternVL

- **InternVL**（Chen 等，2024，上海人工智能实验室）激进地扩展视觉编码器，使用 60 亿参数的 InternViT-6B 配合语言模型。关键架构贡献是**动态高分辨率处理**：把图像切成 448x448 像素的图块，每块独立通过视觉编码器，再把图块特征与整图缩略图特征拼接。这样模型可以处理任意宽高比和分辨率的图像。

- InternVL-2 进一步引入**渐进式对齐训练**：先用对比目标（类似 CLIP）对齐视觉编码器，再通过轻量 MLP 连接到 LLM，最后在指令数据上端到端微调。渐进策略可以防止视觉编码器预训练表示发生灾难性遗忘。

![VLM 扩展：PaLI、Qwen-VL 与 InternVL 连接视觉编码器和语言模型的不同方法及训练阶段](../images/scaling_vlms_comparison.svg)

- 三个家族的共同主题是**训练数据整理**的重要性。原始网页图文对有噪声，常常彼此不对齐。连续的训练阶段会逐步筛选和精炼数据，从数十亿嘈杂配对缩小到数百万高质量指令示例。最终微调数据的质量往往比模型原始参数量更重要。

## 定位与指代表达

- 想象你指着人群中的一个人说“戴红帽子的女士”。你在用语言指代特定空间区域。**视觉定位**是反向任务：给定图像和自然语言表达，模型必须找出（定位）所指物体。**指代表达理解**输出边界框，**指代表达分割**输出像素掩码。

- 形式化地说，给定图像 $I$ 和指代表达 $r$（如“左边的大棕狗”），模型预测边界框 $b = (x, y, w, h)$ 或一组定位所指对象的坐标。数据集包括 **RefCOCO**、**RefCOCO+** 和 **RefCOCOg**，每个都包含有多个对象的图像以及对应的无歧义指代表达。

- 早期定位模型采用两阶段方法：先（用 Faster R-CNN 或类似模型）生成区域候选，再用融合模型为每个候选相对于语言查询打分，最高分区域就是预测结果。它计算成本高，而且受候选质量限制。

- 现代 VLM 把定位直接整合进生成框架。关键想法是把边界框坐标表示为**文本 token**。把连续坐标空间离散成 bin（例如 $x,y,w,h$ 各使用 1000 个 bin），并在词表中加入 `<loc_342>` 这样的特殊位置 token。模型输出一系列位置 token 来生成边界框：

$$\text{Output: } \texttt{<loc\_102><loc\_215><loc\_487><loc\_398>}$$

- 这种分词技巧让任意自回归语言模型都能执行定位，无需修改架构——它只需学会“说坐标”。**Pix2Seq**（Chen 等，2022）率先将其用于目标检测，Qwen-VL、Ferret 和 Kosmos-2 等模型将其扩展到指代表达理解和短语定位。

- **Kosmos-2**（Peng 等，2023，Microsoft）通过把空间位置表示为嵌入生成文本中的特殊 token，为多模态 LLM 增加定位能力。例如它可以生成：“A `<phrase>` golden retriever `</phrase>` `<box>` `<loc_102>` `<loc_215>` `<loc_487>` `<loc_398>` `</box>` is catching a frisbee.” 文本 token 与空间 token 交错，模型就能同时描述和定位。

![通过坐标 token 化进行定位：模型生成穿插离散边界框坐标 token 的文本，定位描述中提到的对象](../images/grounding_coordinate_tokens.svg)

- **指点**把定位更进一步：不输出边界框，而是预测单个点（通常是所指对象中心）。这对交互应用很有用，例如用户问“最近的出口在哪里”，模型在图像上叠加一个坐标作答。**Shikra** 和 **Ferret** 等模型除基于框的定位外，还支持基于点的指代。

## 无 OCR 文档理解

- 传统文档理解流水线很复杂：先运行 OCR 引擎提取文字和布局，再把提取的文本送入语言模型。这种多阶段方法很脆弱——OCR 错误会向下游传播，空间布局信息也常常丢失或表示不佳。如果模型能像人一样直接从像素阅读，会怎样？

- **Donut**（Document Understanding Transformer，Kim 等，2022）完全消除了 OCR。它使用 Swin Transformer（第 08 章）作为视觉编码器处理文档图像，再使用 BART 风格 Transformer 解码器直接根据视觉特征生成结构化文本输出。解码器可以根据任务生成 JSON、键值对或普通文本。

- Donut 训练分两阶段。**预训练**：模型执行合成 OCR 学会阅读——给定文档图像，生成完整文字内容。训练数据是由文本语料渲染出的数百万张合成文档图像，教视觉编码器识别字符、字体和布局。**微调**：把模型适配到收据解析、表单理解和文档分类等下游任务，训练它生成任务特定的结构化输出。

- Donut 解码器采用特殊提示方案：用提示 token 指定任务（如分类用 `<doc_class>`，收据解析用 `<parse_receipt>`），模型根据提示生成输出。这个统一接口让单个模型可以处理多个文档理解任务。

- **Pix2Struct**（Lee 等，2023，Google）把无 OCR 思路应用到网页理解和图表/图形理解。关键预训练目标是**截图解析**：给定被遮挡的网页截图，模型生成产生可见区域的底层 HTML，从而学会理解视觉渲染与结构化标记之间的关系。

- Pix2Struct 引入**可变分辨率输入处理**：不把所有图像缩放为固定大小（那会扭曲宽高比并破坏细小文字），而是把图像打包成固定数量的图块，同时保留原始宽高比。高而窄的文档生成高而窄的图块网格。这对文档理解至关重要，因为宽高比承载语义信息（收据又窄又高，电子表格又宽又矮）。

![无 OCR 文档理解：Donut 和 Pix2Struct 直接通过视觉编码器处理文档图像并生成结构化文本，不需要 OCR 预处理](../images/ocr_free_document_understanding.svg)

- **Nougat**（Blecher 等，2023，Meta）把 Donut 架构专门用于学术论文，直接从 PDF 页面图像生成完整 LaTeX 标记。它能处理复杂数学公式、表格和图形，而传统 OCR 流水线在这些任务上很容易失败。模型在 PDF 页面图像及对应 LaTeX 源代码对上训练。

- 无 OCR 模型的成功体现了深度学习中的更广泛原则：直接从原始输入（像素）学习的端到端模型，常常超过复杂的多阶段流水线，因为它们能联合优化所有组件，学习专门适配最终任务的表示。中间 OCR 步骤反而是限制模型学习能力的瓶颈。

## 视觉 token 流水线

- 不论采用哪种架构，每个 VLM 都必须把图像转换成语言模型可以处理的 token 序列。理解这一流水线很重要。不同模型的细节不同，但总体流程是：

- **步骤 1：提取图块。** 把高 $H$、宽 $W$ 的图像切成 $P \times P$ 的不重叠图块，产生 $N = HW / P^2$ 个图块。对于 336x336 图像和 14x14 图块，$N = 576$。

- **步骤 2：视觉编码。** 每个图块做线性投影并通过视觉编码器（通常是 ViT），输出上下文图块嵌入序列 $V = [v_1, \ldots, v_N] \in \mathbb{R}^{N \times d_v}$。这些嵌入同时携带局部外观和（来自自注意力的）全局上下文。

- **步骤 3：token 压缩（可选）。** 有些模型把 $N$ 个视觉 token 压缩为更小的 $M \ll N$ 个，以降低语言模型的计算负担。Flamingo 使用 Perceiver Resampler（$M = 64$），Qwen-VL 使用交叉注意力（$M = 256$），**Q-Former**（BLIP-2 使用，Li 等，2023）使用 $M = 32$ 个可学习查询 token 对视觉编码器输出做交叉注意力。

- **步骤 4：投影。** 将完整或压缩后的视觉 token 通过线性层或 MLP 投影到语言模型嵌入空间。投影后，视觉 token 与文本 token 嵌入具有相同维度，可以拼接。

- **步骤 5：注入 LLM。** 把投影后的视觉 token 插入 token 序列中特殊 `<image>` 占位符的位置，再由语言模型处理合并序列。LLM 的自注意力允许文本 token 关注视觉 token，反之亦然。

![视觉 token 流水线：提取图像图块，经 ViT 编码，可选地由 Perceiver 或 Q-Former 压缩，投影到 LLM 维度，再与文本 token 拼接](../images/visual_token_pipeline.svg)

- 视觉 token 数量直接影响计算成本。每个视觉 token 都参与 LLM 自注意力，而注意力成本关于序列长度是二次的。高分辨率图像可能产生数百或数千个视觉 token，主导 LLM 上下文窗口。因此 token 压缩很重要：把 576 个视觉 token 减到 64 个，会让注意力中的视觉贡献约降低 9 倍。

- **BLIP-2**（Li 等，2023）以高效的桥接策略著称。它引入轻量**Q-Former**（带可学习查询的小型 Transformer），位于冻结视觉编码器和冻结 LLM 之间。Q-Former 是唯一可训练组件，视觉编码器与 LLM 都保持冻结。它分两阶段预训练：先用图文对比、匹配和描述目标（连接视觉编码器），再用语言生成目标（连接 LLM）。这种模块化设计让 BLIP-2 可以把任意视觉编码器接入任意 LLM。

## 训练目标

- VLM 根据架构模式组合不同目标进行训练：

- **图文对比损失（ITC）**：在共享嵌入空间对齐图像和文本表示，类似 CLIP。这是双编码器的主要目标，也常作为融合模型的预训练目标。损失是上一篇介绍的 InfoNCE。

- **图文匹配（ITM）**：二分类目标——给定图像和文本，预测二者是否匹配。硬负样本（内容相似但配了另一张图像的文本）让任务更难，迫使模型学习细粒度对齐。

- **语言建模（LM）**：标准自回归语言建模目标——给定所有前置 token，预测下一个 token。对 VLM 来说，“前置 token”还包括视觉 token，因此模型学会根据视觉输入生成文本。这是编码器—解码器和仅解码器 VLM 的主要目标。

$$\mathcal{L}_{\text{LM}} = -\sum_{t=1}^{T} \log p(w_t \mid w_{<t}, V)$$

- **前缀语言建模**：提供图像和文本前缀作为上下文（不对它们训练），只训练模型生成后续内容。PaLI 和 SimVLM 等模型使用它。

- 大多数现代 VLM 在预训练时组合多个目标（如 BLIP 的 ITC + ITM + LM、CoCa 的 ITC + LM），再在指令数据上用纯 LM 目标微调。

## 编程任务（使用 Colab 或 notebook）

1. 实现一个简单的基于注意力的图像描述解码器。使用随机“图像特征”作为编码器输出，训练解码器生成固定描述，观察每个解码步骤注意力权重如何在空间位置之间移动。
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

2. 模拟视觉 token 流水线：把图像切成图块，将图块投影到嵌入空间，与文本 token 嵌入拼接，再在合并序列上运行单层自注意力。
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

3. 为视觉定位实现坐标 token 化。给定边界框，把它转换成离散 token；给定离散 token，重建边界框。可视化不同 bin 分辨率下的量化误差。
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
