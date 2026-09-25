---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 10 - multimodal learning/01. multimodal representations.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: e8c9e500dcf5e90e7b18f769ae7eb7df75b8d1bcfe44a19fd8dc89459767ae86
status: reviewed
---
# 多模态表示

*多模态表示将视觉、语言和音频映射到共享嵌入空间。本文介绍融合策略、CLIP、ALIGN、SigLIP、对比损失函数（InfoNCE、NT-Xent）、零样本分类和检索评估。*

- 设想你坐在咖啡馆里：桌上有一杯冒着热气的咖啡，你听见杯碟碰撞声，闻到烘焙咖啡豆的香气，也感受到杯子传来的温度。单一感官无法提供全部信息；大脑会把这些线索合在一起，形成“热咖啡”的整体感知。**多模态学习**让机器也能整合视觉、语言、音频等不同模态的信息，建立比单一模态更丰富、稳健的表示。

- **模态**是信息的一种类型或通道。机器学习中常见的模态包括图像（像素网格）、文本（词元序列）、音频（波形或频谱图，见第 09 章）、视频（连续帧）和结构化数据（表格、图结构）。每种模态都有自己的统计结构：图像具有空间相关性，文本按顺序排列且由离散元素组成，音频则连续地随时间变化。多模态学习要把这些性质迥异的数据联系起来。

- 为什么要组合不同模态？因为它们提供互补信息。狗的照片能展示品种和毛色，却不会告诉你它的名字；“我的金毛 Max”这句说明能给出名字和品种，却没有描述狗的具体姿势。图像和文本结合后，比单独使用任何一种都更完整。多模态模型因此能够回答问题、生成内容，并完成单一模态模型难以处理的决策任务。

![多模态学习概览：图像、文本和音频分别由编码器处理，各自的表示映射到共享嵌入空间](../images/multimodal_overview.svg)


## 融合策略

- 小组合作时，可以让所有人从一开始就共享笔记和草稿，也可以先各自完成部分内容，最后再合并。多模态学习中的**早期融合**和**晚期融合**与这两种做法相对应。

- **早期融合**（也称特征级融合）在深入处理前，就拼接或混合不同模态的原始特征或低层特征。例如，可以把图像像素特征与文本词元嵌入拼接成一个序列，再输入同一个 Transformer。模型从一开始就能学习细粒度的跨模态交互，但输入空间较大，还必须同时处理性质迥异的数据。

- 形式上，给定两个模态的特征向量 $x_{\text{img}} \in \mathbb{R}^{d_1}$ 和 $x_{\text{txt}} \in \mathbb{R}^{d_2}$，早期融合会把它们直接拼接：

$$x_{\text{fused}} = [x_{\text{img}}; x_{\text{txt}}] \in \mathbb{R}^{d_1 + d_2}$$
- 随后，共享网络处理这个拼接向量。模型可以在每一层发现跨模态关联；代价是计算量增加，而且难以对齐性质不同的特征，例如稠密的像素值和稀疏的词元索引。

- **晚期融合**（也称决策级融合）先用各自的编码器独立处理每种模态，得到高层表示，甚至直接生成预测结果，再通过平均分数、投票或学习得到的组合层整合输出。晚期融合结构较简单，也能直接复用预训练的单模态模型；但各模态从未接触彼此的原始特征，因此无法捕捉低层跨模态交互。

- 给定各模态的预测 $\hat{y}_1$ 和 $\hat{y}_2$，一种简单的晚期融合规则为：

$$\hat{y} = \alpha \hat{y}_1 + (1 - \alpha) \hat{y}_2$$
- 其中，$\alpha \in [0, 1]$ 是学习得到或人工设定的混合权重。

- **中间融合**（也称中层融合）是多数现代系统采用的折中方案。每种模态先由自己的编码器提取特征，再在网络中间层合并表示，常见做法是使用交叉注意力层。这样既能让各编码器专门处理对应模态，也能建立丰富的跨模态交互。Flamingo、LLaVA 以及大多数视觉语言模型（见文件 02）都采用中间融合。

![早期、中间和晚期融合：早期融合拼接原始输入，中间融合通过交叉注意力合并中间表示，晚期融合组合最终预测](../images/fusion_strategies.svg)


- 选择哪种融合策略，取决于数据量、计算预算和任务需求。早期融合表达能力强，但需要大量数据；晚期融合成本低，能力也有限。中间融合通过交叉注意力兼顾表达能力和模块化设计，已成为大规模多模态模型的主流方案。

## 联合嵌入空间

- 设想有一种通用翻译器，能把不同语言的同一句话映射到共享“语义空间”中的同一点。英文、法文和日文的“海滩上的狗”会落在相同坐标附近。**联合嵌入空间**把这类对齐扩展到不同模态：海滩上有狗的图像与“海滩上的狗”这段文本，应映射到同一向量空间中彼此接近的位置。

- 形式上，我们学习两个编码函数：$f_\theta : \mathcal{X}_1 \to \mathbb{R}^d$ 处理模态 1（如图像），$g_\phi : \mathcal{X}_2 \to \mathbb{R}^d$ 处理模态 2（如文本）。两个函数都把输入映射到同一个 $d$ 维空间。训练目标会让语义匹配的样本对 $(x_1, x_2)$ 对应的嵌入 $f_\theta(x_1)$ 和 $g_\phi(x_2)$ 彼此接近（余弦相似度高），并让不匹配的样本对彼此远离。

- 这直接延伸了第 07 章介绍的词嵌入空间。Word2Vec 和 GloVe 会把语义相近的词放在向量空间中彼此接近的位置。联合嵌入空间把这一思想扩展到不同模态：模型可以衡量图像与文本、音频与文本，甚至图像与音频之间的相似度。

- 相似度通常用**余弦相似度**衡量（见第 01 章）：

$$\text{sim}(u, v) = \frac{u \cdot v}{\|u\| \|v\|}$$
- 把所有嵌入按 $L_2$ 范数归一化到单位超球面后，余弦相似度就等于点积 $u \cdot v$。点积计算简单，还能用近似最近邻库加速。

![联合嵌入空间：图像编码器和文本编码器把各自的输入映射到共享向量空间，匹配的样本对聚集在一起](../images/joint_embedding_space.svg)


- 联合嵌入空间支持**零样本迁移**。图像和文本嵌入对齐后，即使训练时没见过某些类别，也能对图像进行分类：把类别名称编码为文本嵌入，再找出与图像嵌入最接近的类别。整个过程不需要针对具体任务微调模型。这正是 CLIP 及后续模型的核心思路。

## 用对比学习对齐多模态表示

- 想象学生拿到打乱的照片和说明，要为每张照片找出正确的说明。要做好这项任务，就得理解图像和文本各自的内容及其联系。**对比学习**用类似方法训练模型：输入一批（图像，文本）样本对，让模型判断每张图像与哪段文本相匹配。

- 第 08 章文件 04 介绍过单模态对比学习（SimCLR、MoCo）：它拉近同一图像不同增强视图的表示，并推远不同图像的表示。多模态对比学习把“增强视图”换成“匹配的模态”：图像与对应说明构成正样本对，同一批次中其他说明则构成负样本对。

### CLIP

- **CLIP**（Contrastive Language-Image Pre-training，Radford 等，2021）是多模态对比学习的代表性模型。它用从互联网收集的 4 亿组（图像，文本）数据，联合训练图像编码器（ViT 或 ResNet，见第 08 章）和文本编码器（Transformer，见第 07 章）。

- 给定一批 $N$ 组图像和文本，CLIP 会计算所有图像嵌入与文本嵌入之间的余弦相似度，组成 $N \times N$ 矩阵。对角线元素对应匹配的正样本对，非对角线元素对应不匹配的负样本对。训练时，损失函数会提高对角线上的相似度，并压低其他位置的相似度。

- CLIP 使用对称交叉熵损失。对图像 $i$ 及其配对文本 $j = i$，图像到文本方向的损失为：

$$\mathcal{L}_{i \to t} = -\frac{1}{N} \sum_{i=1}^{N} \log \frac{\exp(\text{sim}(z_i^{\text{img}}, z_i^{\text{txt}}) / \tau)}{\sum_{k=1}^{N} \exp(\text{sim}(z_i^{\text{img}}, z_k^{\text{txt}}) / \tau)}$$
- 交换图像与文本的角色，可得到文本到图像方向的损失：

$$\mathcal{L}_{t \to i} = -\frac{1}{N} \sum_{i=1}^{N} \log \frac{\exp(\text{sim}(z_i^{\text{txt}}, z_i^{\text{img}}) / \tau)}{\sum_{k=1}^{N} \exp(\text{sim}(z_i^{\text{txt}}, z_k^{\text{img}}) / \tau)}$$
- CLIP 的总损失是两者的平均值：

$$\mathcal{L}_{\text{CLIP}} = \frac{1}{2}(\mathcal{L}_{i \to t} + \mathcal{L}_{t \to i})$$
- $\tau$ 是学习得到的**温度参数**，初始值为 $\tau = 0.07$。温度控制 softmax 分布的尖锐程度：$\tau$ 较低时，模型更集中于最相似的样本；$\tau$ 较高时，概率分布更平均。CLIP 会和模型权重一起学习 $\tau$，而不是把它设为固定超参数。

![CLIP 训练过程：一批 N 组图像文本对生成 N×N 相似度矩阵，训练会提高对角线元素并压低非对角线元素](../images/clip_contrastive_matrix.svg)


- CLIP 的图像编码器通常使用 ViT-L/14（一种大型视觉 Transformer，图像块为 14×14，见第 08 章文件 04）。文本编码器是采用因果掩码的 12 层 Transformer，结构类似 GPT（见第 07 章文件 04）。两个编码器都通过学习得到的线性投影，把输出映射到 512 维或 768 维的共享空间，再按 $L_2$ 范数归一化。

- CLIP 的重要能力之一是**零样本图像分类**。要把图像分到 $K$ 个类别之一，可以为每个类别构造一条文本提示，例如“a photo of a {class name}”，再分别用文本和图像编码器生成嵌入，选择与图像嵌入余弦相似度最高的类别。CLIP 在 ImageNet 上取得了有竞争力的准确率，训练时没有使用 ImageNet 样本。

### ALIGN

- **ALIGN**（Jia 等，2021）把 CLIP 的方法扩展到规模更大、噪声更多的数据集，其中包含 18 亿组只经过少量筛选的图像文本对。CLIP 仔细筛选训练数据；ALIGN 的结果显示，扩大数据规模可以弥补一部分噪声。ALIGN 使用 EfficientNet 图像编码器和 BERT 文本编码器，并采用相同的对比损失。其研究结论是：数据量足够大时，不必投入高昂成本清洗数据；噪声样本产生的梯度不一致，对比目标会自然降低它们的权重。

### SigLIP

- **SigLIP**（Sigmoid Loss for Language-Image Pre-training，Zhai 等，2023）用更简单的 sigmoid 损失替代 CLIP 的 softmax 对比损失。CLIP 把 $N \times N$ 相似度矩阵视为分类问题，每一行都对各列做 softmax；SigLIP 则把矩阵中的每个元素单独视为二分类问题：这组（图像，文本）是否匹配？

- 单个样本对 $(i, j)$ 的 SigLIP 损失为：

$$\mathcal{L}_{ij} = -y_{ij} \log \sigma(z_i^{\text{img}} \cdot z_j^{\text{txt}} / \tau) - (1 - y_{ij}) \log(1 - \sigma(z_i^{\text{img}} \cdot z_j^{\text{txt}} / \tau))$$
- 当 $i = j$、样本对匹配时，$y_{ij} = 1$；否则 $y_{ij} = 0$。$\sigma$ 表示 sigmoid 函数。

- SigLIP 不需要在整个批次上计算全局 softmax。CLIP 的 softmax 分母要求汇总各设备上的所有嵌入，这会成为分布式训练的通信瓶颈。SigLIP 可以在本地计算每个样本对的 sigmoid 损失，因此更容易扩展到超大批次。它以较低的训练成本达到与 CLIP 相当的效果。

## 常见对比损失

- 对比学习的损失函数有共同目标：提高正样本对的相似度，降低负样本对的相似度；“间隔”或“温度”等参数控制模型施加的力度。下面介绍几种常见形式。

### InfoNCE

- **InfoNCE**（Noise-Contrastive Estimation，van den Oord 等，2018）是 CLIP 损失的理论基础。给定查询 $q$、一个正键 $k^+$ 和 $K$ 个负键 $\{k_1^-, \ldots, k_K^-\}$，损失为：

$$\mathcal{L}_{\text{InfoNCE}} = -\log \frac{\exp(q \cdot k^+ / \tau)}{\exp(q \cdot k^+ / \tau) + \sum_{j=1}^{K} \exp(q \cdot k_j^- / \tau)}$$
- 这相当于一个 $(K+1)$ 类分类问题：从 $K+1$ 个候选中找出正样本。InfoNCE 是查询与正键之间互信息的下界；最大化它可以对齐语义匹配的输入表示。负样本数量 $K$ 越多，下界越紧，这也解释了为什么对比学习通常受益于较大的批次。

### NT-Xent

- **NT-Xent**（Normalised Temperature-scaled Cross-Entropy，Chen 等，2020）是 SimCLR 使用的损失（见第 08 章文件 04），本质上是在批次内对称应用 InfoNCE。批次含 $N$ 组样本时，$2N$ 个增强视图会为每个锚点提供 $2N - 2$ 个负样本，即除自身和正样本外的所有视图。正样本对 $(i, j)$ 的损失为：

$$\ell_{i,j} = -\log \frac{\exp(\text{sim}(z_i, z_j) / \tau)}{\sum_{k=1}^{2N} \mathbf{1}_{[k \neq i]} \exp(\text{sim}(z_i, z_k) / \tau)}$$
- NT-Xent 和 InfoNCE 的数学形式相同，名称不同是因为它们分别出现在自监督视觉和表示学习理论的研究中。

### 温度的作用

- **温度** $\tau$ 是对比学习中的重要超参数。可以借用物理温度来理解它：温度高时，softmax 分布较平，模型难以区分不同负样本；温度低时，分布更尖锐，最难的负样本影响最大。

- 形式上，$\tau \to 0$ 时，softmax 趋近硬 argmax，只选出最难的负样本；$\tau \to \infty$ 时，所有负样本的权重趋于相同。对归一化嵌入，$\tau \in [0.01, 0.1]$ 往往效果较好。温度过低会导致训练不稳定，因为困难负样本对应的梯度很大；温度过高则会让损失对违例不敏感。

- CLIP 将温度初始化为 $\tau = 0.07$，并通过对数参数化来学习这个标量：$\tau = \exp(t)$。参数 $t$ 与模型权重一起通过梯度下降更新，使模型能在训练中自动调整对比任务的难度。

![温度对比 softmax 的影响：低温产生尖锐分布，突出困难负样本；高温产生平坦分布](../images/contrastive_temperature.svg)


### 三元组损失与基于间隔的方法

- 在 InfoNCE 成为主流之前，**三元组损失**是度量学习的常用方法。给定锚点 $a$、正样本 $p$ 和负样本 $n$：

$$\mathcal{L}_{\text{triplet}} = \max(0, \|a - p\|^2 - \|a - n\|^2 + m)$$
- $m$ 是间隔，要求正样本至少比负样本近 $m$。三元组损失逐组三元组计算，而不是利用整个批次，因此比 InfoNCE 的样本利用率低。它也依赖负样本挖掘策略：随机负样本往往太容易，损失会变为零，所以**困难负样本挖掘**（选择最接近的错误匹配）或**半困难负样本挖掘**（选择落在间隔内的负样本）很重要。

- InfoNCE 会在整个批次中隐式挖掘困难负样本，这也是它在大规模场景中优于三元组损失的原因之一。它的 softmax 归一化会自动提高困难负样本（与锚点相似度较高者）的权重，无需显式挖掘就能形成自然的训练顺序。

## 图文检索与零样本分类

- 训练好联合嵌入空间后，就能执行**图文检索**：给定图像查询，从数据库中找出最相关的文本（图像到文本检索）；或给定文本查询，找出最相关的图像（文本到图像检索）。这相当于在共享嵌入空间中搜索最近邻。

- 可以把 CLIP 式模型想成一位图书管理员，能迅速比较百万条目中的任意照片和说明。它不必预先掌握所有类别，只要计算每张照片与各条说明的接近程度，就能完成检索和零样本分类。

- **零样本分类**是文本到图像检索的一种特殊情况。给定 $K$ 个类别名称，先为它们各构造一条文本提示，共 $K$ 条，记为 $\{t_1, \ldots, t_K\}$（例如“a photo of a cat”和“a photo of a dog”），再计算这些提示的嵌入。对新图像 $x$，预测类别为：

$$\hat{y} = \arg\max_{k} \; \text{sim}(f_\theta(x), g_\phi(t_k))$$
- 文本编码器在这里充当灵活的分类头。下游任务无需另训线性层，只要用自然语言描述类别即可。CLIP 的文本编码器在预训练中接触过大量不同描述，因此能够迁移到多种任务。

- **提示词设计**会影响效果。仅把 ImageNet 上的提示模板从“{class name}”改为“a photo of a {class name}”，CLIP 的零样本准确率就从 63.2% 提高到 68.4%。**提示词集成**还会对多个模板（如“a photo of a {class name}”“a good photo of a {class name}”“a drawing of a {class name}”）得到的文本嵌入取平均，形成更稳健的文本表示。

![零样本分类：分别计算图像和各类别文本提示的嵌入，再选择余弦相似度最高的类别](../images/zero_shot_classification.svg)


## 音视频对应关系

- 闭上眼睛听别人拍篮球，你能从有节奏的撞击声判断篮球何时落地。睁开眼后，会看到画面中的弹跳和每次撞击声同步。音频事件与视觉事件之间的对应关系为机器提供了无需人工标注的监督信号。**音视频对应学习**据此训练模型，让声音与其视觉来源建立联系。

- 这一思路与 CLIP 类似，只是把文本换成音频。给定配对的视频帧和音频片段，模型会学习一个嵌入空间，让时间上对齐的音视频样本彼此接近，让错位的样本彼此远离。

- **音视频嵌入**（Audio-Visual Embedding，AVE）方法（Arandjelovic 和 Zisserman，2017）在视频数据上用对比损失训练视觉编码器 $f$ 和音频编码器 $g$。正样本对由同一时刻的视频帧和音频片段组成；负样本则来自其他视频或不同时间。这样，模型无需标签也能学到吠叫声对应狗的画面、吉他声对应吉他的画面。

- 音频编码器通常用 CNN 或音频 Transformer 处理**对数梅尔频谱图**（见第 09 章文件 01），生成定长嵌入。视觉编码器则用标准图像主干网络（如 ResNet、ViT）处理视频帧。两个编码器都把输出映射到共享的 $d$ 维空间，训练时使用与 CLIP 相同的 InfoNCE 损失：

$$\mathcal{L}_{\text{AV}} = -\log \frac{\exp(\text{sim}(z^{\text{vis}}, z^{\text{aud}}) / \tau)}{\sum_{k=1}^{N} \exp(\text{sim}(z^{\text{vis}}, z_k^{\text{aud}}) / \tau)}$$
![音视频对应学习：视觉编码器处理视频帧，音频编码器处理频谱图，对比学习会对齐时间匹配的样本对](../images/audio_visual_correspondence.svg)


- 音视频学习可用于**声源定位**（声音来自画面的哪个位置？）、音视频语音识别（结合唇部动作和音频，见第 09 章文件 02）、音视频声源分离（观察说话人的面部来分离其语音，即第 09 章文件 05 所述的“鸡尾酒会问题”），以及由音频条件控制的视频生成。

- **ImageBind**（Girdhar 等，2023）把对齐范围扩展到六种模态：图像、文本、音频、深度、热成像和 IMU 数据。它的关键思路是不必为每种模态组合都准备配对数据。只要分别把各模态对齐到图像（如用图文对训练文本、用图音对训练音频），所有模态就能通过共享的图像嵌入空间间接对齐。这种以图像为共同锚点的“绑定”会产生涌现式对齐：即使音频和文本从未直接配对训练，它们的表示也会彼此接近。

## 评估

- 评估多模态模型时，需要衡量模型对跨模态关系的理解能力。常用方法分为**零样本基准测试**和**检索指标**两类。

### 零样本基准测试

- 零样本评估检验模型能否完成训练时未明确针对的任务。最常见的基准是 **ImageNet 零样本准确率**：把 ImageNet 的 1,000 个类别名称编码为文本嵌入，再编码每张测试图像，根据余弦相似度计算 top-1 和 top-5 分类准确率。CLIP ViT-L/14 的零样本 top-1 准确率为 75.5%，与用 ImageNet 监督训练的 ResNet-50 相当。

- 其他零样本基准包括 CIFAR-10/100、STL-10、Food-101、Oxford Pets 和 Flowers-102。跨多个数据集评估，可以检验模型是否具备较广泛的视觉理解能力，还是只记住了预训练数据中的模式。

- **线性探测**是另一种评估方式：固定预训练图像编码器，为带标签的数据集提取特征，再在特征之上训练一个简单的线性分类器。它能单独衡量表示质量，不受零样本检索机制影响。CLIP 的特征很适合线性探测，效果常能达到甚至超过监督式预训练的特征。

### 检索指标

- 图像到文本和文本到图像检索通常使用**召回率@K**（Recall@K，R@K）：正确匹配出现在前 $K$ 个检索结果中的查询所占比例。常见指标有 R@1、R@5 和 R@10。

- 对于包含 $Q$ 个查询的数据集：

$$\text{R@}K = \frac{1}{Q} \sum_{q=1}^{Q} \mathbf{1}[\text{rank}(q) \leq K]$$
- 其中，$\text{rank}(q)$ 表示查询 $q$ 的正确匹配在排序结果中的位置。

- 常见检索基准包括 **Flickr30K**（31,000 张图像，每张配有 5 条说明）和 **MS-COCO**（123,000 张图像，每张配有 5 条说明）。评估时使用测试集：给定图像，从整个测试集中检索正确说明；反向任务则根据说明检索图像。

- **中位排名**（MedR）是补充指标，表示所有查询的正确匹配位置的中位数。完美模型的 MedR 为 1，数值越低越好。

- 多模态模型还会接受组合式理解基准测试，例如 **Winoground** 会检查模型能否区分“狗在杯子里”和“杯子在狗里面”；**ARO**（Attribute、Relation、Order，即属性、关系、顺序）则检验模型是否理解语言结构，而不是只匹配词袋。CLIP 式模型在这些任务上往往表现不佳，说明对比预训练虽然能对齐整体语义，却未必能捕捉细粒度的组合结构。

![检索评估：模型按相似度为查询图像排列文本候选项，Recall@K 衡量正确说明是否出现在前 K 个结果中](../images/retrieval_recall_at_k.svg)


## 小结

- 本文介绍的多模态表示是本章后续内容的基础。CLIP 及其后续模型训练出的联合嵌入空间，把视觉和语言联系起来。文件 02 会在此基础上介绍视觉语言模型，说明模型如何从检索扩展到图像描述生成；文件 03 讨论如何把图像和视频转换为序列模型可用的词元；文件 04 介绍跨模态生成（文本生成图像、文本生成视频）；文件 05 则介绍在单个模型中处理多种模态的统一架构。

- 配对数据上的对比学习会把不同模态映射到可直接比较的嵌入空间。图像嵌入和文本嵌入因此成为同一空间中的表示，可用于零样本分类、检索，并接入更大的系统。方法的核心是拉近匹配样本对、推远不匹配样本对；这一简单原则在多种任务中都很有效。

## 编程任务（使用 Colab 或笔记本）

1. **从头实现 CLIP 对比损失。**生成随机图像和文本嵌入，计算相似度矩阵，并求出对称交叉熵损失。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

def clip_loss(image_embeds, text_embeds, temperature=0.07):
    """Compute symmetric CLIP contrastive loss."""
    # L2 normalise embeddings
    image_embeds = image_embeds / jnp.linalg.norm(image_embeds, axis=1, keepdims=True)
    text_embeds = text_embeds / jnp.linalg.norm(text_embeds, axis=1, keepdims=True)

    # Compute cosine similarity matrix (N x N)
    logits = image_embeds @ text_embeds.T / temperature  # (N, N)

    # Labels: the diagonal (i-th image matches i-th text)
    N = logits.shape[0]
    labels = jnp.arange(N)

    # Symmetric cross-entropy: image-to-text + text-to-image
    loss_i2t = -jnp.mean(jax.nn.log_softmax(logits, axis=1)[jnp.arange(N), labels])
    loss_t2i = -jnp.mean(jax.nn.log_softmax(logits, axis=0)[labels, jnp.arange(N)])
    return (loss_i2t + loss_t2i) / 2, logits * temperature

# Simulate a batch of 8 image-text pairs in 64-dim space
key = jax.random.PRNGKey(42)
k1, k2 = jax.random.split(key)
N, D = 8, 64
image_embeds = jax.random.normal(k1, (N, D))
text_embeds = jax.random.normal(k2, (N, D))

loss, sim_matrix = clip_loss(image_embeds, text_embeds)
print(f"CLIP loss (random embeddings): {loss:.4f}")

# Visualise the similarity matrix
fig, ax = plt.subplots(figsize=(6, 5))
im = ax.imshow(sim_matrix, cmap='coolwarm', vmin=-1, vmax=1)
ax.set_xlabel("Text index"); ax.set_ylabel("Image index")
ax.set_title(f"Cosine Similarity Matrix (loss={loss:.3f})")
plt.colorbar(im); plt.tight_layout(); plt.show()
# Try changing temperature (0.01, 0.1, 1.0) and observe how loss changes
# Try making matched pairs similar: set text_embeds = image_embeds + small noise
```

2. **构建玩具联合嵌入模型。**使用 InfoNCE 损失和梯度下降，把作为随机向量的“图像”表示与另一组随机向量“说明”对齐。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

def info_nce_loss(img_enc, txt_enc, img_data, txt_data, tau=0.1):
    """InfoNCE over a batch of paired (image, text) data."""
    z_img = img_data @ img_enc  # (N, D)
    z_txt = txt_data @ txt_enc  # (N, D)
    # L2 normalise
    z_img = z_img / jnp.linalg.norm(z_img, axis=1, keepdims=True)
    z_txt = z_txt / jnp.linalg.norm(z_txt, axis=1, keepdims=True)
    logits = z_img @ z_txt.T / tau
    labels = jnp.arange(logits.shape[0])
    return -jnp.mean(jax.nn.log_softmax(logits, axis=1)[jnp.arange(len(labels)), labels])

# Create 32 paired samples: img in R^8, txt in R^6, embed into R^4
key = jax.random.PRNGKey(0)
k1, k2, k3, k4 = jax.random.split(key, 4)
N, d_img, d_txt, d_embed = 32, 8, 6, 4

img_data = jax.random.normal(k1, (N, d_img))
txt_data = jax.random.normal(k2, (N, d_txt))

# Learnable projection matrices
img_enc = jax.random.normal(k3, (d_img, d_embed)) * 0.1
txt_enc = jax.random.normal(k4, (d_txt, d_embed)) * 0.1

grad_fn = jax.jit(jax.grad(info_nce_loss, argnums=(0, 1)))
lr = 0.05
losses = []

for step in range(300):
    loss = info_nce_loss(img_enc, txt_enc, img_data, txt_data)
    losses.append(float(loss))
    g_img, g_txt = grad_fn(img_enc, txt_enc, img_data, txt_data)
    img_enc = img_enc - lr * g_img
    txt_enc = txt_enc - lr * g_txt

print(f"Initial loss: {losses[0]:.3f}, Final loss: {losses[-1]:.3f}")
print(f"Random baseline (log N): {jnp.log(N):.3f}")

plt.figure(figsize=(8, 4))
plt.plot(losses, color='#2c3e50')
plt.axhline(y=0, color='green', linestyle='--', alpha=0.5, label='Perfect alignment')
plt.axhline(y=float(jnp.log(N)), color='red', linestyle='--', alpha=0.5, label='Random (log N)')
plt.xlabel("Step"); plt.ylabel("InfoNCE Loss")
plt.title("Learning a Joint Embedding Space")
plt.legend(); plt.grid(alpha=0.3); plt.tight_layout(); plt.show()
# Modify d_embed (try 2, 4, 16) to see how embedding dimension affects alignment
```

3. **用预先计算的嵌入实现零样本分类。**把文本嵌入作为各类别的“原型”，再用最近邻搜索为新图像分类。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

# Simulate 5 classes, each with a prototype text embedding in R^32
key = jax.random.PRNGKey(42)
n_classes, d = 5, 32
class_names = ["cat", "dog", "car", "plane", "ship"]

# Class prototypes (imagine these came from a text encoder)
k1, k2 = jax.random.split(key)
class_prototypes = jax.random.normal(k1, (n_classes, d))
class_prototypes = class_prototypes / jnp.linalg.norm(class_prototypes, axis=1, keepdims=True)

# Generate 200 test "images" (embeddings near their class prototype + noise)
n_per_class = 40
true_labels = jnp.repeat(jnp.arange(n_classes), n_per_class)
keys = jax.random.split(k2, n_classes * n_per_class)

image_embeds = []
for i in range(n_classes):
    noise = jax.random.normal(keys[i], (n_per_class, d)) * 0.5
    cluster = class_prototypes[i] + noise
    image_embeds.append(cluster)
image_embeds = jnp.concatenate(image_embeds, axis=0)
image_embeds = image_embeds / jnp.linalg.norm(image_embeds, axis=1, keepdims=True)

# Zero-shot classification: cosine similarity with each prototype
similarities = image_embeds @ class_prototypes.T  # (200, 5)
predicted_labels = jnp.argmax(similarities, axis=1)
accuracy = jnp.mean(predicted_labels == true_labels)
print(f"Zero-shot accuracy: {accuracy:.1%}")

# Confusion matrix
conf = jnp.zeros((n_classes, n_classes), dtype=jnp.int32)
for true, pred in zip(true_labels, predicted_labels):
    conf = conf.at[true, pred].add(1)

fig, ax = plt.subplots(figsize=(6, 5))
im = ax.imshow(conf, cmap='Blues')
ax.set_xticks(range(n_classes)); ax.set_xticklabels(class_names, rotation=45)
ax.set_yticks(range(n_classes)); ax.set_yticklabels(class_names)
ax.set_xlabel("Predicted"); ax.set_ylabel("True")
for i in range(n_classes):
    for j in range(n_classes):
        ax.text(j, i, int(conf[i, j]), ha='center', va='center', fontsize=11)
ax.set_title(f"Zero-Shot Confusion Matrix (acc={accuracy:.1%})")
plt.colorbar(im); plt.tight_layout(); plt.show()
# Try increasing noise (0.5 -> 1.0 -> 2.0) to see accuracy degrade
# Try adding prompt ensembling: average 3 noisy copies of each prototype
```
