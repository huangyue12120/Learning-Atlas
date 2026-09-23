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

*本篇将多模态表示放回 AI 工程语境，保留源文中的定义、公式、代码、图示和实践边界，便于逐项核对。*

* 混合式表示方式将视觉、语言和音频连接入共享嵌入空间。此文件涵盖了聚变策略, CLIP, ALIGN, SigLIP, 对比性损失函数(InfonCE, NT-Xent), 0发分级和检索评价. *

- 想象一下你坐在咖啡馆里 你看见桌子上一个蒸发的杯子,听到陶瓷的烧焦声,闻到烤咖啡豆的味道,并感觉到杯子的温暖散热. 没有单一的感官能告诉你一切: 你的大脑把这些信号连接到一个统一的"热咖啡"的感官中. ** 多种模式学习**对机器来说也是一样:它结合了多种模式(视觉、语言、音频等)的信息,以建立比任何单一模式单独提供的更丰富、更强健的表达方式。

- ** 方式** 是信息的一个独特渠道。在机器学习中,最常见的模式是图像(像素网格),文本(token sequences),音频(波形或分光克等,如第9章),视频(帧后序),以及结构化的数据(表,图). 每种模式都有自己的统计结构:图像在空间上是相通的,文本是相接的和相离的,音频是时空的和连续的. 多式联运的挑战在于如何弥补这些根本不同的数据类型。

- 为什么要费劲把模式结合起来? 因为它们提供了补充信息。一只狗的照片告诉你 它的品种和颜色 但不是它的名字。像"我的金色取回者"这样的字幕 告诉你名字和品种 但不是确切的姿势 图像和文本加在一起,比单独一个更全面地描绘。这种互补性是核心动力:多式联运模式可以回答问题,产生内容,并做出任何单一模式都无法作出的决定。

![图示](../images/multimodal_overview.svg)

## 融合策略


- 想想一个团体项目。你可以从两个方面综合想法:每个人从一开始就在同一个房间一起工作(分享原始笔记和草稿),或者每个人独立地写出自己的部分,然后你把最终文件合并. 它们是在多模式学习中**早期聚变**和**后期聚变**。

- ** 早期聚变**(也叫特征级聚变)在任何严重加工发生之前,会从不同模式中将原始或低级地物相接或混合. 例如,你可能会将一个图像的像素特征与文本的符号嵌入并反馈到一个单一的变压器中. 模型从一开始就可以学习精细的跨模式交互,但输入空间很大,模型必须学会同时处理非常不同的数据类型.

- 形式上, 给定特性向量$x_{\text{img}} \in \mathbb{R}^{d_1}$财务报告和已审计财务报表$x_{\text{txt}} \in \mathbb{R}^{d_2}$从两种模式, 早期聚变只是使它们凝聚:

$$x_{\text{fused}} = [x_{\text{img}}; x_{\text{txt}}] \in \mathbb{R}^{d_1 + d_2}$$

- 之后由共享的网络处理这种被收缩的向量. 其优点是模型可以在每一层发现跨模式的关联. 缺点是计算成本和难以对接非常不同的特征类型(等同值对等. 指数很少)。

- ** 延迟聚变**(也叫决策级聚变)通过自己的编码器独立地处理每种方式,产生一种高层次的表示,甚至对每种方式进行最后预测. 然后将这些产出合并起来,通常通过平均分数、投票或学习到的组合层。后期聚变较为简单,可以让您从货架上再用经过预先训练的单式模型,但无法捕捉到低等跨式交互,因为模式从不"看到"对方的原始特征.

- 特定模式的预测$\hat{y}_1$财务报告和已审计财务报表$\hat{y}_2$一个简单的晚聚变规则是:

$$\hat{y} = \alpha \hat{y}_1 + (1 - \alpha) \hat{y}_2$$

- 地点$\alpha \in [0, 1]$是一种有学识或手工调制的混合重量。

- **中聚变**(也叫中间聚变)是大多数现代系统使用的实用中地. 每种模式首先由自己的编码器处理(提取模式特定特征),然后被编码的表示方式通过网络合并为分路,通常通过交叉意向层. 这使得每个编码器在模式上都具有特殊性,同时仍然能够进行丰富的跨模式互动. Flamingo,LLaVA,以及大多数视觉语言模型(file 02)都使用中聚变.

![图示](../images/fusion_strategies.svg)

- 聚变策略之间的选择取决于数据的可用性,计算预算和任务. 早期聚变是强大的,但数据饥饿. 晚聚变是便宜但有限的. 在大规模多式联运模式中,具有跨心力的中间聚变已成为主导方法,因为它兼顾了表达性和模块性。

## 联合嵌入空间


- 想象一个通用的翻译,可以用任何语言取出任何句子,并将其映射到一个共享"意为空间"的同点. 英文,法文或日文中"海滩上一只狗"的句子会都在同一坐标下着陆. ** 联合嵌入空间** 完全这样做,但跨模式:海滩上一只狗的形象和"海滩上一只狗"的文本应该映射到同一向量空间中附近的点.

- 在形式上,我们学习了两种编码器功能:$f_\theta : \mathcal{X}_1 \to \mathbb{R}^d$用于模式1(例如图像)和$g_\phi : \mathcal{X}_2 \to \mathbb{R}^d$用于方式2(例如文本)。双方将投入映射到同一处$d$- 维空间。培训目标确保成对匹配$(x_1, x_2)$有嵌入$f_\theta(x_1)$财务报告和已审计财务报表$g_\phi(x_2)$相近的(高同位素相似性),而相去不远的对相距甚远。

- 这是直接概括出第7章嵌入空间的单词. 回顾Word2Vec和GloVe在向量空间中将相近的同名词相接而来. 联合嵌入空间将这个想法扩展到各种模式:我们不是衡量字与字的相似性,而是衡量图像与文字的相似性,音频与文字的相似性,甚至图像与音频的相似性.

- 相似度度量几乎总是**相克性**(第一章):

$$\text{sim}(u, v) = \frac{u \cdot v}{\|u\| \|v\|}$$

- 以$L_2$- 正常地将所有嵌入到单位超平面上,同位素相似性降低为简单的点出产物$u \cdot v$,这在计算上非常有效,可以加速近距离图书馆。

![图示](../images/joint_embedding_space.svg)

- 联合嵌入空间的力量是,它能够**零发转出**. 一旦对齐了图像和文本嵌入,您就可以将图像归类为从未受过训练的类别:只要将分类名称嵌入为文本并找到最接近图像嵌入的文本. 不需要针对具体任务的微调。这是《公民与自由倡议》及其后继者的主要见解。

## 用于多模态对齐的对比学习


- 想想课堂上的练习, 让学生们可以洗发相片和字幕, 要做好这项工作,你需要既了解视觉内容,也了解语言,并了解它们之间的关联. ** Contrastic learning** 列车型号正是以这种方式:给出一批(图像,文本)对子,模型必须弄清楚哪个图像与哪个文本相接.

- 正如我们在第8章(文件04)所看到的,在单模式环境下的对比性学习(SimCLR,MoCo)将同一图像的视角拉到一起,并推开不同图像的视角. 多式联运对比性学习用"相配模式"来代替"相配的视图":一个图像及其标题为正对;与批次中任何其他标题相配的图像为负对.

### 《刑法》


- ** CLIP**(Contrastive Language-Image Pre-train-training, Radford等,2021)是多式对比学习的基础模型. 它在从互联网上刮去的4亿对(图像,文本)上联合训练一款图像编码器(一款VIT或ResNet, 第8章)和一款文本编码器(一款变压器, 第7章).

- 鉴于一批$N$图像文本对, CLIP 计算$N \times N$所有图像嵌入和所有文本嵌入之间的相弦相似度矩阵. 对角分录为相配对(正对);所有离对角分录为无相配分录(负数). 训练损失推向对角分录高和离对角分录低.

- 所失是相. 对于图像$i$与文本对齐$j = i$,图像到文本的丢失是:

$$\mathcal{L}_{i \to t} = -\frac{1}{N} \sum_{i=1}^{N} \log \frac{\exp(\text{sim}(z_i^{\text{img}}, z_i^{\text{txt}}) / \tau)}{\sum_{k=1}^{N} \exp(\text{sim}(z_i^{\text{img}}, z_k^{\text{txt}}) / \tau)}$$

- 而文本到图像的丢失与所交换的角色相同:

$$\mathcal{L}_{t \to i} = -\frac{1}{N} \sum_{i=1}^{N} \log \frac{\exp(\text{sim}(z_i^{\text{txt}}, z_i^{\text{img}}) / \tau)}{\sum_{k=1}^{N} \exp(\text{sim}(z_i^{\text{txt}}, z_k^{\text{img}}) / \tau)}$$

- CLIP损失总额为:

$$\mathcal{L}_{\text{CLIP}} = \frac{1}{2}(\mathcal{L}_{i \to t} + \mathcal{L}_{t \to i})$$

- 给$\tau$是一个学习到的**温**参数(初始于$\tau = 0.07$) (中文(简体)). 温度控制软马克斯分布的锐度:低$\tau$使模型更能聚焦最接近的匹配, 高度$\tau$更平均地传播概率。CLIP 学习$\tau$与模型重合,而不是把它当作一个固定的超参数。

![图示](../images/clip_contrastive_matrix.svg)

- CLIP的图像编码器一般为一款ViT-L/14(一款带有14x14补丁的大视觉变形器,第8章文件04). 文本编码器是一款带有因果遮罩的12层变压器(同GPT,Capter 7 file 04). 两种编码器都通过学习到的线性投影将输出投射到共享的512或768维空间,然后$L_2$正常化。

- CLIP最出名的属性是**零镜头图像分类**. 将图像分类为其中之一$K$类别,您创建$K$文本提示如"{类名}相片",将每个提示与文本编码器相嵌入,将图像与图像编码器相嵌入,并选择其文本嵌入与图像嵌入具有最高同位素相似性的类. 在ImageNet上,CLIP实现竞争性的精度,从未看到过单一的ImageNet训练实例.

### 阿利冈


- ** ALIGN**(Jia等,2021年) CLIP对噪声器的处理方法,较大的数据集:18亿个图像文本对并有最小过滤. 在CLIP仔细整理其数据的地方,ALIGN显示尺度可以补偿噪音. ALIGN使用一个高效Net图像编码器和一个BERT文本编码器,并使用具有相同对比性损失的列车. 关键发现是,只要有足够的数据,你就不需要昂贵的数据清理:对比性目标自然会降低重量,因为其产生不一致的梯度。

### 锡格利普


- ** SigLIP**(语言-图像预训的Sigmoid损失,Zhai等,2023年)用更简单的sigmoid损失取代了CLIP基于软马克的对比性损失. 而不是治疗$N \times N$相似性矩阵作为一个分类问题(每行是一列上下软马克斯),SigLIP将每个条目作为二进制分类独立处理:这是(图像,文本)配对还是不是?

- 单一对的 SigLIP 损失$(i, j)$即:

$$\mathcal{L}_{ij} = -y_{ij} \log \sigma(z_i^{\text{img}} \cdot z_j^{\text{txt}} / \tau) - (1 - y_{ij}) \log(1 - \sigma(z_i^{\text{img}} \cdot z_j^{\text{txt}} / \tau))$$

- 地点$y_{ij} = 1$若为$i = j$(对应)和$y_{ij} = 0$否则,以及$\sigma$是 sigmoid 函数。

- SigLIP的关键优势在于它消除了整个批次实现全球软马克斯正常化的需要. 在CLIP中,软最大分母需要收集所有设备上的所有嵌入物,这是分布式训练中的通信瓶颈. SigLIP的每平面相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相相接相接相接相接相接相接相接相相接相接相相接相接相接相相接相接相接相接相接相接相接相接相接相接相接相接相接相 SigLIP与CLIP的质量相匹配,培训费用也较低.

## 对比损失函数详解


- 在对比性学习中使用的损失函数共享一个共同的结构:它们都试图使正对子的相似分数高于负对子,有些概念认为"边际"或"温度"可以控制模型的推力. 让我们正式确定关键变体。

### 信息NCE


- **InfoNCE**(Noise-Contrustive Espresentation, van den Oord等,2018年)是CLIP损失背后的理论基础. 询问$q$,一个正键$k^+$,以及$K$负键$\{k_1^-, \ldots, k_K^-\}$,损失是:

$$\mathcal{L}_{\text{InfoNCE}} = -\log \frac{\exp(q \cdot k^+ / \tau)}{\exp(q \cdot k^+ / \tau) + \sum_{j=1}^{K} \exp(q \cdot k_j^- / \tau)}$$

- 这个是$(K+1)$- 道路分类问题:在公路分类中查明积极因素$K+1$候选人。InfoNCE是查询和正键之间相互信息的一个下限,因此它最大限度地协调对同步输入的表示。束缚紧紧如负数$K$增加,这解释了为什么对比性方法得益于大批量尺寸。

### NT - X 类型


- **NT-Xent**(Normalized Went-scaled Cross-Entropy,Chen等,2020年)是SimCLR中使用的损失(第8章文件04),基本上在一批内对称地应用了InfoNCE. 批次的,请检查date=中的日期值 (帮助)$N$双对,$2N$增加意见$2N - 2$每个主机的负值(除自身及其正值外,所有视图). 正对的损失$(i, j)$即:

$$\ell_{i,j} = -\log \frac{\exp(\text{sim}(z_i, z_j) / \tau)}{\sum_{k=1}^{2N} \mathbf{1}_{[k \neq i]} \exp(\text{sim}(z_i, z_k) / \tau)}$$

- NT-Xent和InfoNCE是相同的数学公式;名称之所以不同,是因为它们是在不同的上下文中被引入的(自控视觉对等. 代表性学习理论)。

### 温度参数的作用


- ** 温度**$\tau$是对比性学习中最重要的超参数之一. 要建立直觉,想想物理意义上的温度:在高温下,分子会随机地移动(软马克斯是平的,所有的负面看起来都同样糟糕);在低温下,分子会沉入僵硬的结构(软马克斯达到顶峰,只有最难的负面物质).

- 形式上,作为$\tau \to 0$,软马克斯接近硬马克斯,它只选择一个最难的负数. 作为$\tau \to \infty$所有负面因素都一样 实际上,$\tau \in [0.01, 0.1]$正常嵌入效果不错 温度过低造成训练不稳定(硬底片的渐变非常大);温度过高使损失对违规情况不敏感.

- CLIP 备忘列表$\tau = 0.07$并把它当作一个圆柱形的平板$\tau = \exp(t)$,在其中$t$以梯度下移与模型加权并列更新。这使得模型可以在训练期间自动调整对比性任务的难度.

![图示](../images/contrastive_temperature.svg)

### 三元组损失与基于间隔的替代方法


- 在InfoNCE主导之前,** 三重损失**是衡量学习的标准. 有了锚$a$,一个正数$p$负数$n$:

$$\mathcal{L}_{\text{triplet}} = \max(0, \|a - p\|^2 - \|a - n\|^2 + m)$$

- 地点$m$是保证正数至少是$m$离负数更近 三联赛的失利在单个三重排而不是分批进行,使得其样本效率低于InfoNCE. 这也对采矿策略很敏感:随机负数往往太容易(损失为零),因此**硬负数开采**(选择最接近的不正确匹配)或**半硬相开采**(选择差值内的负数)至关重要.

- InfoNCE在整个批次中隐含地进行硬负开采,这也是它的表现超过三重损失规模的原因之一. InfoNCE 中的软max常态化会自动提升硬底片(那些与锚高度相近的),提供自然课程,而不明确开采.

## 图文检索与零样本分类


- 拥有训练有素的联合嵌入空间后,可以进行**image-text reference**:给定图像查询,从数据库中找到最相关的文本(图像到文本检索),或者给定文本查询,找到最相关的图像(文本到图像检索). 这只是在共享嵌入空间中最近的邻居搜索。

- 想象一下一个图书管理员可以立刻将任何相片与一百万个条目目录中的任何标题进行比较. 他们不需要提前了解每一个可能的分类;他们只是衡量每个相片对每个标题的"接近"程度. 这就是CLIP风格的模型如何进行检索和零发分级.

- **零相机分类**是文本到图像检索的特例. 鉴于$K$分类名称,您构造文本提示$\{t_1, \ldots, t_K\}$(如"猫相","狗相"等)并嵌入. 对于新图像$x$,预测类是:

$$\hat{y} = \arg\max_{k} \; \text{sim}(f_\theta(x), g_\phi(t_k))$$

- 关键洞察力在于文本编码器起到灵活分类头的作用. 与其为每个下游任务训练出一个新的线性地层,不如简单地用自然语言描述任务. 这就是为什么CLIP的通俗化如此之好:文本编码器在前期训练中看到了上百万种不同的描述.

- ** Prompt工程** 事项。CLIP在ImageNet上的零射入精度由63.2%提高到68.4%,只是将快取模板从"{类名}"改为"{类名}相片". 更好的是,**即时综艺** 平均嵌入多个模板的文本(例如"{类名}相片","{类名}相片好照","画出{类名}"),以产生更坚固的文本代表.

![图示](../images/zero_shot_classification.svg)

## 音画对应关系


- 闭上眼睛听别人弹篮球 你可以从节奏的地上分辨出来 现在睁开眼睛:视觉回弹与每个回弹完全一致。这种音频和视觉事件之间的紧密通信是机器可以学习的自由监督信号. ** 视听函授** 训练模型将声音与他们的视觉来源联系起来,没有任何人类标签。

- 这个想法与CLIP非常相近,但以音频取代了文本. 特地相配的视频框和音频段,模型学习出一个嵌入空间,在时间上对齐的视听对子相近而错配对相去相去相去甚远.

- ** Audio-Visual Embedding(AVE)** 方法(Arandjelovic和Zisserman,2017年) 培训视觉编码器$f$和音频编码器$g$在视频数据上出现对比性损失。正对是(视频帧,音频剪辑从同时间开始),而底片是来自不同视频或不同时代的音频剪辑. 模特得知叫声会与狗相伴而来,吉他的声音会与吉他相伴相伴相伴而来,都无标签.

- 音频编码器一般使用CNN或音频变压器处理**log-mel光谱**(第9章文件01),产生固定尺寸的嵌入. 视觉编码器使用标准图像主干线(ResNet,VIT)处理视频帧. 两个项目共用$d$- 维度空间,和训练使用与CLIP相同的InfoNCE损失:

$$\mathcal{L}_{\text{AV}} = -\log \frac{\exp(\text{sim}(z^{\text{vis}}, z^{\text{aud}}) / \tau)}{\sum_{k=1}^{N} \exp(\text{sim}(z^{\text{vis}}, z_k^{\text{aud}}) / \tau)}$$

![图示](../images/audio_visual_correspondence.svg)

- ** 视听学习的应用**包括:声音源本地化(在图像中声音来自何处?),视听语音识别(与音频相融合的唇动,如第9章文件02),视听源分化(通过观看自己的脸来隔离一位演讲者的声音,从第9章文件05中"鸡尾党"的问题),以及以音频为条件的视频生成.

- ** ImageBind**(Girdhar等人,2023年)将这一范围扩大到六种模式:图像、文本、音频、深度、热能和IMU数据。关键的观点是,你不需要每组组合的配对数据。通过将每种模式与图像对齐(使用图像-文本对文本,图像-音频对音频等),所有模式都通过共享的图像嵌入空间被暗地里对齐. 这种通过共同主播模式的"绑定"产生出一种突发的对齐:音频和文本变得相似,尽管它们从未直接一起训练.

## 评估


- 评价多模式模型需要掌握跨模式理解的衡量标准。两个主要评价模式是**零射出基准**和**检索度量标准**。

### 零样本基准


- 零镜头评价衡量一个模型是否能够完成它从未明确接受过培训的任务。最常见的基准是 ** ImageNet 0-shot精度**:将所有1000个ImageNet类名称都嵌入为文本,嵌入了每个测试图像,并基于同位素相似度测量上一和上五分类精度. CLIP ViT-L/14实现75.5%的上一精度0发,可与在ImageNet上接受过监督的ResNet-50相媲美.

- 其他零射出的基准包括:CIFAR-10/100,STL-10,Food-101,牛津宠物和花生-102. 在许多数据集中评价该模型是否真正具有一般的视觉理解,还是仅仅从培训前数据中记忆出模式。

- ** 贫化物探测器**评估是一种补充性测试。您冻结预选的图像编码器, 提取标签数据集的特性, 并在顶端训练一个简单的线性分类器。这独立于零发回取机制,衡量所学表现的质量. CLIP的特征是出色的线性探测特征,经常匹配或超过监督预训练.

### 检索指标


- 对于检索任务(图像到文本和文本到图像),标准度量是**Recall@K** (R@K):在顶端显示正确匹配的查询的分数$K$检索结果。常见的值有R@1,R@5和R@10.

- 形式上,为一组$Q$查询:

$$\text{R@}K = \frac{1}{Q} \sum_{q=1}^{Q} \mathbf{1}[\text{rank}(q) \leq K]$$

- 地点$\text{rank}(q)$位于排序的查询检索列表中正确匹配的位置$q$.

- 标准检索基准包括:**Flickr30K**(31,000个图像,每个有5个标题)和**MS-CO**(123,000个图像,每个有5个标题)。评估是在测试拆分上进行的:给一个图像,从完整的测试集中取回正确的标题,反之亦然。

- ** Median squence**(MedR)是一个互补的衡量标准:在所有查询中正确匹配的中位位置. 一个完美的模型有 Medr = 1. 低点更好

- 除了检索,多模式模型还根据组成理解基准进行评估,如**Winoground**(测试模型是否能够区分出"一只狗中的杯子"与"一只狗中的杯子")和**ARO**(属性,关系,顺序),测试模型是否真正理解了语言的结构,或者仅仅匹配了词包. CLIP风格的模型经常在这些上挣扎,揭示出一个根本的局限性:对比性前训练将全球语义相协调,但可能无法捕捉到精细的成分结构.

![图示](../images/retrieval_recall_at_k.svg)

## 综合起来


- 本文件中涵盖的多式表述构成本章所述一切的基础。CLIP及其后继者所训练的联合嵌入空间是连接视觉和语言的"glue". 文件02基于这个基础,有超越检索的视觉语言模型来生成关于图像的文本. 文件03探索了图像和视频如何被标识用于序列模型. 文件04覆盖了跨模式生成(文本到图像,文本到视频). 而文件05则检查一个单一模型内处理多模式的统一架构.

- 核心取走:对等数据上的对比性学习产生不同模式可互换的嵌入空间. 图像嵌入和文本嵌入成为"同一类事",使得零发分级,检索,无缝地融合到更大的系统中去. 这个想法的简单,只要把匹配的对子推到一起,再把无法匹配的对子分开,就会削弱其非凡的效能.

## 编程任务（使用 Colab 或 notebook）


1. 从头执行 CLIP 对比损失。创建随机图像和文本嵌入,计算相似性矩阵,并计算对称的交叉切入损失.
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

2. 构建一个玩具联合嵌入模型,学习将2D"图像"(随机向量)与"抓取"(不同的随机向量)相匹配,使用InfoNCE损失和梯度回落.
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

3. 采用预计算嵌入式进行零发分级. 将类"原型"模拟为文本嵌入,并用近邻取景来分类新图像.
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
