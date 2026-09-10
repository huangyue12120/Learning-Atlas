---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 10 - multimodal learning/03. image and video tokenisation.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: d36271e5fb3af4873c60838206b32911f6e02667ede19b85f0ae1c2887cf5ef5
status: reviewed
---

# 图像与视频 token 化

*图像和视频 token 化把连续的视觉数据转换为离散 token 序列，让 Transformer 像处理文本一样处理视觉数据。本篇介绍 VQ-VAE、VQ-GAN、码本学习、DALL-E 的 dVAE、视频 token 化和无查找表量化。*

## 为什么要对图像 token 化

- 可以把语言想成有限字母表：英语大约有 26 个字母，现代语言模型把文本切成 30,000–100,000 个子词 token。每个句子都变成离散符号序列，Transformer 可以逐个预测。另一方面，图像处在连续的高维空间中：一张 256x256 的 RGB 图像是 $\mathbb{R}^{256 \times 256 \times 3} \approx \mathbb{R}^{196{,}608}$ 中的一个点。如果希望语言模型用“说英语”的同一套机制“说图像”，就要把连续的像素数组转换成从有限词表中取出的、长度可控的离散 token 序列。这种转换就是**图像 token 化**。

- 想象自己是马赛克艺术家。你没有无限多种砖块颜色，只有固定的调色板，例如 8192 种颜色。要把照片复现成马赛克，必须：(1) 决定每块砖代表照片的哪个区域；(2) 为每个区域选择最接近的砖块颜色；(3) 接受部分细节会丢失，但整体图像仍可辨认。图像 token 化做的正是这件事：编码器把空间图块压缩成潜向量，码本把每个向量映射到最近的条目，最终得到一个整数索引网格，每个图块一个索引，离散模型就能处理它。

- token 化有三方面好处。第一，它能大幅压缩图像：256x256 图像可以变成 16x16 的 token 网格，把序列长度从 65,536 个像素减到 256 个 token，适合注意力成本随序列长度二次增长的模型。第二，它统一了表示：文本 token 和图像 token 使用同一离散词表，单个自回归 Transformer 就能生成交错的文本和图像。第三，它施加了有用的瓶颈，迫使模型学习有语义的编码，而不是记忆像素噪声。

![图像 token 化流水线概览：连续图像进入编码器，潜向量相对于码本量化，产生离散 token 索引网格](../images/image_tokenisation_overview.svg)

- 回顾第 08 章：卷积网络从图像提取层级特征图；再回顾第 07 章：文本分词器把字符串转成整数序列。图像 token 化正处在两者交汇处：用 CNN 或视觉 Transformer 编码器（第 08 章）产生空间特征，再借用离散词表的思想（第 07 章）把这些特征转换成 token 索引。

## VQ-VAE：向量量化

- 如第 06 章所见，标准**变分自编码器（VAE）**把输入编码为连续潜分布，再从该分布采样并解码回重构结果。潜空间连续，不便输入离散序列模型。van den Oord 等人（2017）提出的**向量量化变分自编码器（VQ-VAE）**引入可学习的嵌入向量码本，把每个编码器输出吸附到最近的码本条目，将连续潜变量替换成离散变量。

- 想象一家只有 $K$ 个编号货架的图书馆。新书（编码器输出）到达时，管理员把它放到与已有书籍（码本向量）最相似的货架，并记录货架编号。以后取书时只需货架编号；该货架的码本条目足以作为原书的近似。这就是向量量化。

- VQ-VAE 由三个组件组成：

- **编码器** $E$ 把输入图像 $\mathbf{x} \in \mathbb{R}^{H \times W \times 3}$ 映射为空间网格的连续潜向量 $\mathbf{z}_e = E(\mathbf{x}) \in \mathbb{R}^{h \times w \times d}$，其中 $h \times w$ 是下采样后的空间分辨率，$d$ 是嵌入维度。

- **码本** $\mathcal{C} = \{\mathbf{e}_1, \mathbf{e}_2, \ldots, \mathbf{e}_K\} \subset \mathbb{R}^d$ 含有 $K$ 个可学习嵌入向量。典型码本大小在 512 到 16,384 个条目之间。

- **解码器** $D$ 从量化后的潜变量重构图像。

- **量化步骤**将空间位置 $(i, j)$ 的每个编码器输出 $\mathbf{z}_e(\mathbf{x})$ 替换为最近的码本条目：

$$\mathbf{z}_q(i,j) = \mathbf{e}_{k^\ast} \quad \text{where} \quad k^\ast = \arg\min_k \|\mathbf{z}_e(i,j) - \mathbf{e}_k\|_2$$

- 这是在嵌入空间中的最近邻查找，和 k-means 分配（第 06 章）完全相同。索引 $k^\ast$ 就是空间位置 $(i,j)$ 的离散 token，整张图像由取自 $\{1, \ldots, K\}$ 的 $h \times w$ 整数网格表示。

![VQ-VAE 架构：编码器产生连续潜变量，每个潜向量匹配最近的码本条目，解码器从量化编码重构图像](../images/vqvae_architecture.svg)

- 挑战在于 $\arg\min$ 不可微，无法通过离散选择反向传播。VQ-VAE 使用**直通估计器**：前向传播中解码器接收 $\mathbf{z}_q$（量化向量）；反向传播中，把重构损失相对于 $\mathbf{z}_q$ 的梯度直接复制给 $\mathbf{z}_e$，仿佛量化步骤是恒等函数。紧凑地写为：

$$\mathbf{z}_q = \mathbf{z}_e + \text{sg}(\mathbf{z}_q - \mathbf{z}_e)$$

- 其中 $\text{sg}(\cdot)$ 是停止梯度操作。前向传播时该式计算为 $\mathbf{z}_q$；反向传播时梯度只通过 $\mathbf{z}_e$ 项流动。

- 完整的 VQ-VAE 损失有三项：

$$\mathcal{L} = \underbrace{\|\mathbf{x} - D(\mathbf{z}_q)\|_2^2}_{\text{reconstruction}} + \underbrace{\|\text{sg}(\mathbf{z}_e) - \mathbf{e}\|_2^2}_{\text{codebook (VQ)}} + \underbrace{\beta \|\mathbf{z}_e - \text{sg}(\mathbf{e})\|_2^2}_{\text{commitment}}$$

- **重构损失**训练编码器和解码器忠实地还原输入。**码本损失**（也叫 VQ 损失）把码本向量拉向编码器输出；注意 $\text{sg}(\mathbf{z}_e)$ 表示编码器不会从这一项获得梯度，所以它只更新码本。**承诺损失**正好相反，鼓励编码器输出靠近码本向量，防止编码器从码本“逃走”。超参数 $\beta$（通常为 0.25）控制码本项与承诺项的平衡。

- 实际上，码本常用**指数移动平均（EMA）**更新，而不是梯度下降，这样更稳定。令 $\mathbf{n}_k$ 为分配到码本条目 $k$ 的编码器输出数，$\mathbf{s}_k$ 为它们的和。EMA 更新为：

$$\mathbf{n}_k \leftarrow \gamma \mathbf{n}_k + (1 - \gamma) |\{(i,j) : k^\ast_{ij} = k\}|$$

$$\mathbf{s}_k \leftarrow \gamma \mathbf{s}_k + (1 - \gamma) \sum_{(i,j) : k^\ast_{ij} = k} \mathbf{z}_e(i,j)$$

$$\mathbf{e}_k \leftarrow \frac{\mathbf{s}_k}{\mathbf{n}_k}$$

- 其中 $\gamma$ 是衰减率（通常为 0.99）。这等价于对编码器输出运行在线 k-means 算法。

### 码本坍缩

- VQ-VAE 的著名失败模式是**码本坍缩**（也叫索引坍缩）：模型只使用 $K$ 个码本条目中的很小一部分，其余条目“死亡”。想象一个图书馆 90% 货架空置，因为管理员总把书放到少数热门货架，表示容量就被浪费了。

- 码本坍缩发生在编码器、码本和解码器共同适应训练的过程中。如果某条目连续多个 batch 未被选择，它就会漂离编码器流形，更不可能再被选中，形成正反馈循环。

- 有多种方法可以缓解码本坍缩：
    - **重置码本**：定期用随机采样的编码器输出重新初始化死亡条目，使其在潜空间活跃区域附近重新开始。
    - **带拉普拉斯平滑的 EMA 更新**：给 $\mathbf{n}_k$ 加小常数，避免条目计数为零，保证所有条目都获得梯度信号。
    - **调节承诺损失**：提高 $\beta$ 会迫使编码器输出更紧密地聚集在码本条目周围，使分配更均匀。
    - **因式分解编码**：把一次码本查找分解为多个更小的查找（例如两个大小为 $\sqrt{K}$ 的码本），降低每次查找的有效码本大小，从而提高利用率。
    - **熵正则化**：加入鼓励码本使用分布均匀的惩罚，使熵 $H = -\sum_k p_k \log p_k$ 最大化，其中 $p_k$ 是经验分配概率。

![码本利用率：分配均匀的健康码本与大多数条目未使用的坍缩码本对比](../images/codebook_collapse.svg)

## VQ-GAN：提高保真度的对抗训练

- VQ-VAE 能产生不错的重构，但像素级 $\ell_2$ 损失会惩罚每个像素偏差，倾向于在多个可能细节之间取平均，因而产生模糊输出。就像要求某人画一张与所有可能面孔平均差异最小的脸，他会画出模糊的平均脸，而不是清晰的某一张脸。

- **VQ-GAN**（Esser 等，2021）把 VQ-VAE 框架与生成对抗网络（第 06 章）的**判别器**结合起来。判别器是基于图块的卷积网络，判断局部图像图块是真实的（来自训练数据）还是伪造的（来自解码器）。这种对抗损失鼓励解码器生成感知上清晰、逼真的纹理，而不是像素平均。

- VQ-GAN 目标在 VQ-VAE 损失上增加两项：

$$\mathcal{L}_\text{VQ-GAN} = \mathcal{L}_\text{VQ-VAE} + \lambda_\text{adv} \mathcal{L}_\text{adv} + \lambda_\text{perc} \mathcal{L}_\text{perc}$$

- **对抗损失** $\mathcal{L}_\text{adv}$ 是应用于解码器输出的标准 GAN 目标。判别器 $\mathcal{D}$ 试图区分真实图块和解码图块，解码器（生成器）则试图欺骗判别器。非饱和形式为：

$$\mathcal{L}_\text{adv} = -\mathbb{E}[\log \mathcal{D}(D(\mathbf{z}_q))]$$

- **感知损失** $\mathcal{L}_\text{perc}$ 比较预训练网络（通常是 VGG 或 LPIPS）在原图和重构图上的特征激活：

$$\mathcal{L}_\text{perc} = \sum_l \|\phi_l(\mathbf{x}) - \phi_l(D(\mathbf{z}_q))\|_2^2$$

- 其中 $\phi_l$ 表示预训练网络第 $l$ 层的特征图。这项损失捕获高层结构相似性，而非像素级准确度。

- $\lambda_\text{adv}$ 会自适应设置，让对抗梯度与重构梯度平衡，防止训练早期重构很差时对抗损失占主导。

![VQ-GAN 训练：编码器和解码器通过量化步骤连接，图块判别器为解码输出提供对抗反馈](../images/vqgan_training.svg)

- 结果是在相同码本大小下，token 化器的重构清晰度远高于 VQ-VAE。VQ-GAN 是许多主要图像生成系统（包括原始 DALL-E、Parti 和大量文生图模型）背后的 token 化器。它把 256x256 图像变成 16x16 或 32x32 的离散 token 网格，码本大小为 1024–16384，每个空间维度压缩 16 倍到 64 倍。

## 残差量化与多尺度码本

- 单个码本会给重构质量设下硬上限：每个空间位置只有一个码本向量来表示，任何超过码本表达能力的细节都会丢失。可以把它想成用固定调色板中的一个词描述颜色：“青绿色”接近但不精确；如果还能追加修饰——“青绿色，但稍微偏蓝、再亮一点”——就会更接近。

- **残差量化（RQ）**迭代地应用这个想法。第一次量化得到 $\mathbf{z}_q^{(1)}$ 后，计算残差 $\mathbf{r}^{(1)} = \mathbf{z}_e - \mathbf{z}_q^{(1)}$，再用第二个码本量化残差得到 $\mathbf{z}_q^{(2)}$，如此进行 $T$ 层：

$$\mathbf{r}^{(0)} = \mathbf{z}_e$$

$$\mathbf{z}_q^{(t)} = \text{Quantise}(\mathbf{r}^{(t-1)}, \mathcal{C}^{(t)})$$

$$\mathbf{r}^{(t)} = \mathbf{r}^{(t-1)} - \mathbf{z}_q^{(t)}$$

- 最终量化表示是 $\hat{\mathbf{z}} = \sum_{t=1}^{T} \mathbf{z}_q^{(t)}$。若每层有大小为 $K$ 的码本，有效词表大小为 $K^T$，但只需保存 $T \times K$ 个向量，而不是 $K^T$ 个。例如 8 层、$K = 1024$ 时，有效条目数为 $1024^8 \approx 10^{24}$，却只保存 8192 个向量。

- 后续每层捕获更细的细节：第一码本捕获粗结构，第二个捕获中频修正，以此类推。这类似 JPEG 的逐次逼近或网页图片的渐进式渲染：先出现粗略版本，再逐步填入细节。

![残差量化：原向量经过连续阶段逐步近似，每阶段量化前一阶段的残差](../images/residual_quantisation.svg)

- **多尺度码本**在不同空间分辨率上运行，扩展了这个想法。不重复量化同一个空间网格，而是在多个尺度量化：粗网格捕获全局结构，细网格捕获局部细节。这与第 08 章目标检测中的特征金字塔类似，不同尺度的特征捕获不同层次的细节。

- **乘积量化**是相关技术：把 $d$ 维潜向量切成 $M$ 个 $d/M$ 维子向量，每个子向量用自己的码本独立量化。这样有效词表为 $K^M$，但只保存 $M \times K$ 个向量。乘积量化广泛用于近似最近邻搜索（第 13 章），也被应用于图像 token 化。

- Mentzer 等人（2023）提出的**有限标量量化（FSQ）**采取完全不同的方法：不学习码本，而是把潜向量的每个维度直接舍入到固定整数级别之一（例如 $\{-2, -1, 0, 1, 2\}$）。每维有 $L$ 个级别、共 $d$ 维时，隐式码本大小为 $L^d$。FSQ 完全避免码本坍缩，因为没有可学习码本向量，只有可学习的编码器输出，再确定性舍入。直通估计器处理舍入的不可微性。

## 实际图像 token 化器

- 从 VQ-VAE 到 VQ-GAN，再到残差量化的发展，催生了一系列用于最先进生成模型的实用图像 token 化器。

### DALL-E token 化器（dVAE）

- 原始 **DALL-E**（Ramesh 等，2021）使用离散 VAE（dVAE）把 256x256 图像 token 化为 32x32 网格，码本大小为 8192。dVAE 用 Gumbel-Softmax 松弛替代硬 $\arg\min$ 量化，使训练期间的前向传播可微。推理时使用 $\arg\max$ 得到硬 token 分配。dVAE 结合重构损失、相对于均匀先验的 KL 散度以及学习到的 Gumbel-Softmax 温度调度进行训练。随后 DALL-E 训练了一个 120 亿参数的自回归 Transformer，建模 256 个文本 token 与 1024 个图像 token（32x32）的联合分布。

### LlamaGen

- **LlamaGen**（Sun 等，2024）展示了：只要有一个优秀的图像 token 化器，就可以把标准 Llama 风格语言模型架构（第 07 章）重新用于自回归图像生成。LlamaGen 使用改进的 VQ-GAN token 化器和大码本（16,384 个条目），训练普通自回归 Transformer（除 token 化器外没有特殊图像改动），按光栅扫描顺序从左到右预测图像 token。关键洞见是：一旦图像被 token 化为离散序列，语言有效的下一 token 预测范式同样适用于图像，证明 token 化真正跨越了模态鸿沟。

### Cosmos token 化器

- **Cosmos token 化器**（NVIDIA，2024）在统一框架中同时面向图像和视频。它使用因果 3D 架构，把图像视为单帧视频，让同一个 token 化器处理两种模态。Cosmos 支持连续和离散两种模式：连续模式输出实值潜向量（供扩散模型后端使用），离散模式使用有限标量量化产生整数 token（供自回归模型后端使用）。编码器使用因果 3D 卷积，因此每一帧的 token 只依赖当前帧和此前帧，支持流式视频 token 化。

![图像 token 化器架构比较：使用 Gumbel-Softmax 的 dVAE、使用码本查找的 VQ-GAN、使用标量舍入的 FSQ](../images/image_tokeniser_comparison.svg)

## 视频 token 化

- 视频在图像的空间维度之外增加了第三个轴——时间。视频由一系列帧组成，通常每秒 24–30 帧；相邻帧高度冗余，因为视觉世界不会在 33 毫秒内大幅变化。视频 token 化利用这种时间冗余，比独立 token 化每一帧实现更高压缩率。

- 可以把视频压缩想成翻页书。如果每页都从头画，需要数千幅细节丰富的画。但多数页面几乎和邻页相同，因此可以每 10 页画一张完整“关键帧”，中间页面只记录小变化。视频 token 化器会自动学会这个技巧。

### 3D VQ-VAE

- VQ-VAE 最直接的视频扩展是**3D VQ-VAE**：把编码器和解码器中的 2D 卷积换成同时作用于空间和时间维度的 3D 卷积。如果编码器在空间上以 $f_s$ 倍、时间上以 $f_t$ 倍下采样，$T \times H \times W$ 的视频片段会变成 $(T/f_t) \times (H/f_s) \times (W/f_s)$ 的 token 网格。

- 例如 $f_s = 16$、$f_t = 4$ 时，16 帧的 256x256 视频片段变成 $4 \times 16 \times 16 = 1024$ 个 token 的序列。这足够紧凑，可以让 Transformer 自回归建模；而原始像素有 $16 \times 256 \times 256 \times 3 \approx 3.1$ 百万个值。

- 3D 卷积联合学习空间和时间特征。早期层捕获局部运动（边缘在帧间移动），深层捕获更高层动态（物体出现、消失或改变形状）。这是第 08 章卷积网络的层级特征提取原则沿时间轴的扩展。

![视频的 3D VQ-VAE：短视频片段由 3D 卷积编码为空间—时间潜向量网格，量化后再解码回帧](../images/video_3d_vqvae.svg)

### 因果视频 token 化器

- 标准 3D 卷积会查看过去、当前和未来帧，因此必须获得整段视频后才能 token 化任何一帧。**因果视频 token 化器**约束时间卷积，使每个输出只依赖当前和过去帧，绝不依赖未来帧。这类似第 07 章自回归 Transformer 的因果掩码：信息沿时间向前流动，不会向后流动。

- 因果 token 化对两个用例至关重要。第一是**流式处理**：帧到达时就能实时 token 化，不必缓冲未来帧。第二是**自回归生成**：Transformer 逐帧生成视频时，帧 $t$ 的 token 必须在不知道帧 $t+1$ 的情况下计算，因为帧 $t+1$ 还未生成。

- 因果约束通过不对称填充时间卷积实现：时间核大小为 $k$ 时，在过去侧填充 $k-1$ 个零，在未来侧填充 0 个零，因此时刻 $t$ 的输出只依赖 $t-k+1, \ldots, t$ 的输入。

- 因果视频 token 化器有一个优雅性质：可以无须特殊处理地 token 化单张图像（只有一帧的“视频”）。第一帧没有过去上下文，因此 token 只由该帧计算。**图像—视频统一**让一个 token 化器同时服务两种模态，简化架构，并支持用同一解码器生成图像和视频。

### 时间压缩策略

- 不同应用需要不同的时间压缩比。动作识别需要保留细微运动，因此使用温和压缩（$f_t = 2$）；长视频生成无法承受存储数千帧，则需要激进压缩（$f_t = 8$ 或更高）。

- 一些 token 化器使用**因式分解压缩**：空间和时间压缩分阶段进行。先用 2D 编码器独立压缩每帧，产生逐帧潜网格；再用 1D 时间编码器跨时间压缩。这比完整 3D 卷积计算便宜，还能为时空选择不同压缩比。代价是无法像联合 3D 编码那样高效捕获时空模式（如球沿对角线移动）。

- **时间插值 token**是近期创新：token 化器只完整编码关键帧，中间帧用轻量插值码表示，描述如何从一个关键帧变形到下一个。这映射了经典视频压缩（H.264/HEVC 的 I 帧与 P 帧），但工作在学习到的潜空间中。

![时间压缩策略：逐帧空间编码后做时间编码，与联合时空 3D 编码对比](../images/temporal_compression_strategies.svg)

## 连续 token 与离散 token

- 并非所有下游模型都需要离散 token。**扩散模型**（第 10 章第 04 篇）原生处理连续值：迭代去噪高斯样本，去噪分数匹配损失定义在连续空间。对扩散后端，token 化器编码器产生连续潜向量，不再量化。**潜空间扩散模型**（Stable Diffusion、DALL-E 3、Flux）使用类似 VQ-GAN 的编码器—解码器，但完全跳过码本，在连续潜空间中操作。

- 另一方面，**自回归模型**（GPT 风格）使用对 $K$ 个类别做 softmax 的有限词表来预测下一 token，从根本上需要离散 token。每个使用自回归 Transformer 的图像生成系统（DALL-E、Parti、LlamaGen、Chameleon）都依赖离散 token 化器。

- 因此，连续或离散 token 的选择由生成后端决定：

- 使用**离散 token**的情况：模型是自回归的（用交叉熵做下一 token 预测）；希望与文本 token 共享词表、构建统一多模态模型；或者需要精确的 token 级控制（例如通过替换 token 做检索或编辑）。

- 使用**连续 token**的情况：模型是扩散或流匹配模型；任务要求极高的重构保真度（连续潜变量完全避免量化误差）；或者希望使用作用于实值向量的回归损失。

- 一些新架构同时支持两种模式。例如 Cosmos token 化器可以从同一个编码器输出连续潜变量（扩散模式）或 FSQ 离散 token（自回归模式），只需打开或关闭轻量量化头。

- **软量化**是中间方案：不做硬 $\arg\min$ 分配，而是取最近的 top-$k$ 个码本条目加权平均，权重由负距离的 softmax 给出。它比硬量化保留更多信息，同时仍近似离散。有些系统训练时使用软量化，推理时使用硬量化。

![根据下游生成模型选择连续或离散 token 化的决策树](../images/continuous_vs_discrete_tokens.svg)

## 应用

### 自回归图像生成

- 图像成为离散 token 序列后，就可以训练标准自回归 Transformer 建模。把图像 token 展平成一维序列（通常按光栅扫描：从左到右、从上到下），Transformer 用标准交叉熵学习 $p(\text{token}_i | \text{token}_1, \ldots, \text{token}_{i-1})$。生成时逐个采样 token，再把完整网格送入 token 化器解码器产生像素。

- 以文本为条件很直接：把文本 token 放在图像 token 序列前面，模型就学习 $p(\text{image tokens} | \text{text tokens})$。DALL-E、Parti 和 LlamaGen 都这样做文生图。文本和图像 token 共享 Transformer、注意力机制，通常也共享嵌入表（文本和图像 token 占据不同索引区间）。

- 光栅扫描顺序引入了人为不对称：图像左上角先生成，却没有右下角的上下文。多项工作对此作出改进。**掩码图像建模**（MaskGIT）训练双向 Transformer，同时生成所有 token 但带有不同置信度，反复解除最有把握的 token 的掩码。**多尺度生成**先生成粗 token（捕获整体构图），再用残差 token 细化。这些方法牺牲纯从左到右生成的简单性，换取更好的全局一致性。

### 统一视觉—语言 token

- 图像 token 化最深层的动机是**统一**：把视觉和语言放到同一种表示格式中，让一个模型架构同时处理两者。正如第 07 章所述，语言模型是能力极强的序列到序列机器。把图像表示为 token 序列，就能免费继承语言建模的全部基础设施——预训练方案、扩展定律、RLHF、上下文长度扩展等。

- **Chameleon**（Meta，2024）是典型例子：它使用含 8192 个条目的 VQ-GAN 码本，把图像转为 token，与文本 token 交错放入约 65,000 个条目的单一词表（文本 + 图像）。标准 Transformer 在混合图文序列上训练，可以在同一次前向中根据图像生成文本、根据文本生成图像，或生成交错的图文内容。

- **Gemini**（Google，2024）在更大规模上采取类似方法，在同一个 Transformer 内原生理解并生成图像、音频和文本，由模态专用 token 化器把数据输入共享序列。

- 统一模型的关键工程挑战是**词表平衡**：如果 65,000 个词表条目中有 8192 个是图像 token，模型可能给视觉分配不足的容量。解决方案包括为每种模态使用独立嵌入层（只在注意力层共享）、模态专用损失权重，以及预训练期间谨慎设置数据混合比例。

![统一视觉语言模型：来自独立 token 化器的文本和图像 token 交错成单一序列，由一个 Transformer 处理](../images/unified_vision_language_tokens.svg)

## 编程任务（使用 Colab 或 notebook）

1. 用 JAX 实现最小 VQ 层：给定一批编码器输出向量，执行最近邻码本查找并计算 VQ-VAE 损失（重构 + 码本 + 承诺）。用直方图可视化码本利用率。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

# --- Minimal VQ layer ---
key = jax.random.PRNGKey(42)
d = 8          # embedding dimension
K = 64         # codebook size
n_vectors = 256  # batch of encoder outputs

# Random encoder outputs and codebook
k1, k2 = jax.random.split(key)
z_e = jax.random.normal(k1, (n_vectors, d))       # encoder outputs
codebook = jax.random.normal(k2, (K, d)) * 0.1     # codebook (small init)

# Nearest-neighbour lookup: find closest codebook entry for each z_e
# distances[i, k] = ||z_e[i] - codebook[k]||^2
distances = (
    jnp.sum(z_e ** 2, axis=1, keepdims=True)
    - 2 * z_e @ codebook.T
    + jnp.sum(codebook ** 2, axis=1, keepdims=True).T
)
indices = jnp.argmin(distances, axis=1)       # token indices
z_q = codebook[indices]                        # quantised vectors

# VQ-VAE loss terms
beta = 0.25
loss_codebook = jnp.mean((jax.lax.stop_gradient(z_e) - z_q) ** 2)
loss_commit   = jnp.mean((z_e - jax.lax.stop_gradient(z_q)) ** 2)
loss_total    = loss_codebook + beta * loss_commit
print(f"Codebook loss: {loss_codebook:.4f}, Commitment loss: {loss_commit:.4f}")

# Codebook utilisation
unique, counts = jnp.unique(indices, return_counts=True, size=K, fill_value=-1)
plt.figure(figsize=(10, 4))
plt.bar(range(K), counts, color='#3498db', alpha=0.8)
plt.xlabel('Codebook Index'); plt.ylabel('Assignment Count')
plt.title(f'Codebook Utilisation ({jnp.sum(counts > 0)}/{K} entries used)')
plt.grid(True, alpha=0.3); plt.tight_layout(); plt.show()
# Try: increase K to 512 and observe collapse. Then add codebook reset logic.
```

2. 构建二维向量量化器，让它学会铺满二维分布。生成随机二维点，使用 EMA 更新学习码本，并可视化 Voronoi 区域。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

# Generate 2D data from a mixture of Gaussians
key = jax.random.PRNGKey(0)
n_points = 2000
K = 16  # codebook entries
gamma = 0.99  # EMA decay

# Four clusters
keys = jax.random.split(key, 5)
centres = jnp.array([[2, 2], [-2, 2], [-2, -2], [2, -2]], dtype=jnp.float32)
data = jnp.concatenate([
    jax.random.normal(keys[i], (n_points // 4, 2)) * 0.5 + centres[i]
    for i in range(4)
])

# Initialise codebook from random data points
idx = jax.random.choice(keys[4], n_points, (K,), replace=False)
codebook = data[idx]
ema_count = jnp.ones(K)
ema_sum = codebook.copy()

# Run EMA-based codebook learning for several epochs
for epoch in range(30):
    # Assign each point to nearest codebook entry
    dists = jnp.sum((data[:, None, :] - codebook[None, :, :]) ** 2, axis=2)
    assignments = jnp.argmin(dists, axis=1)
    # EMA update
    for k in range(K):
        mask = (assignments == k)
        count_k = jnp.sum(mask)
        ema_count = ema_count.at[k].set(gamma * ema_count[k] + (1 - gamma) * count_k)
        if count_k > 0:
            sum_k = jnp.sum(data[mask], axis=0)
            ema_sum = ema_sum.at[k].set(gamma * ema_sum[k] + (1 - gamma) * sum_k)
    codebook = ema_sum / ema_count[:, None]

# Visualise assignments and codebook
fig, ax = plt.subplots(1, 1, figsize=(8, 8))
colors = plt.cm.tab20(jnp.linspace(0, 1, K))
for k in range(K):
    mask = assignments == k
    ax.scatter(data[mask, 0], data[mask, 1], c=[colors[k]], s=5, alpha=0.3)
ax.scatter(codebook[:, 0], codebook[:, 1], c='black', s=120, marker='X',
           edgecolors='white', linewidths=1.5, zorder=10, label='Codebook')
ax.set_title(f'Learned VQ Codebook ({K} entries) on 2D Data')
ax.legend(); ax.set_aspect('equal'); ax.grid(True, alpha=0.3)
plt.tight_layout(); plt.show()
# Try: increase K to 64 and observe finer tiling. Reduce gamma and see instability.
```

3. 演示残差量化：使用 $T$ 个连续量化阶段编码一批向量，测量每一层的重构误差如何下降。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

key = jax.random.PRNGKey(7)
d = 16         # embedding dimension
K = 32         # codebook size per level
T = 8          # number of residual levels
n_vectors = 512

# Random data to quantise
k1, *cb_keys = jax.random.split(key, T + 1)
z = jax.random.normal(k1, (n_vectors, d))

# Independent random codebooks for each level
codebooks = [jax.random.normal(cb_keys[t], (K, d)) * (0.5 ** t)
             for t in range(T)]

# Residual quantisation loop
residual = z.copy()
z_hat = jnp.zeros_like(z)
errors = []

for t in range(T):
    cb = codebooks[t]
    dists = (jnp.sum(residual ** 2, axis=1, keepdims=True)
             - 2 * residual @ cb.T
             + jnp.sum(cb ** 2, axis=1, keepdims=True).T)
    indices = jnp.argmin(dists, axis=1)
    z_q_t = cb[indices]
    z_hat = z_hat + z_q_t
    residual = residual - z_q_t
    mse = jnp.mean(jnp.sum((z - z_hat) ** 2, axis=1))
    errors.append(float(mse))
    print(f"Level {t+1}: MSE = {mse:.4f}")

plt.figure(figsize=(8, 5))
plt.plot(range(1, T + 1), errors, 'o-', color='#e74c3c', linewidth=2, markersize=8)
plt.xlabel('Residual Quantisation Level')
plt.ylabel('Reconstruction MSE')
plt.title('Error Reduction with Residual Quantisation')
plt.xticks(range(1, T + 1)); plt.grid(True, alpha=0.3)
plt.tight_layout(); plt.show()
# Try: use a single codebook of size K*T and compare with RQ. Which wins?
```

4. 模拟简单的一维“视频 token 化器”：生成一系列一维信号（模拟视频帧），应用因果时间压缩，并从重构质量角度与非因果压缩比较。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

key = jax.random.PRNGKey(99)
n_frames = 16
frame_len = 64

# Generate a "video": a slowly moving Gaussian bump across frames
x_axis = jnp.linspace(-3, 3, frame_len)
frames = jnp.stack([
    jnp.exp(-0.5 * (x_axis - (-2 + 4 * t / n_frames)) ** 2)
    for t in range(n_frames)
])  # shape: (n_frames, frame_len)

# Causal temporal compression: each frame's code depends only on past frames
# Simple approach: average current frame with exponential decay of past
alpha_causal = 0.6
causal_codes = jnp.zeros_like(frames)
causal_codes = causal_codes.at[0].set(frames[0])
for t in range(1, n_frames):
    causal_codes = causal_codes.at[t].set(
        alpha_causal * frames[t] + (1 - alpha_causal) * causal_codes[t - 1]
    )

# Non-causal: average with both past and future (bilateral smoothing)
kernel = jnp.array([0.2, 0.6, 0.2])  # past, current, future
padded = jnp.concatenate([frames[:1], frames, frames[-1:]], axis=0)
noncausal_codes = jnp.stack([
    kernel[0] * padded[t] + kernel[1] * padded[t+1] + kernel[2] * padded[t+2]
    for t in range(n_frames)
])

# Reconstruction error
mse_causal = jnp.mean((frames - causal_codes) ** 2)
mse_noncausal = jnp.mean((frames - noncausal_codes) ** 2)
print(f"Causal MSE: {mse_causal:.6f}, Non-causal MSE: {mse_noncausal:.6f}")

fig, axes = plt.subplots(1, 3, figsize=(15, 5))
for ax, data, title in zip(axes,
    [frames, causal_codes, noncausal_codes],
    ['Original Frames', f'Causal (MSE={mse_causal:.5f})',
     f'Non-causal (MSE={mse_noncausal:.5f})']):
    ax.imshow(data, aspect='auto', cmap='viridis', origin='lower')
    ax.set_xlabel('Spatial Position'); ax.set_ylabel('Frame Index')
    ax.set_title(title)
plt.tight_layout(); plt.show()
# Try: vary alpha_causal and the kernel weights. What happens with alpha=1.0?
```
