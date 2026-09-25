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
# 图像与视频词元化

*图像与视频词元化把连续的视觉数据转换成离散词元序列，让 Transformer 能像处理文本一样处理图像和视频。本文介绍 VQ-VAE、VQ-GAN、码本学习、DALL-E 的 dVAE、视频词元化和有限标量量化等方法。*

> **译者注：**原文摘要提到查表自由量化（lookup-free quantisation），但正文没有展开这一内容。

## 为什么要把图像词元化

- 现代语言模型把文本切分成离散的子词词元，再逐个预测。图像则是连续的高维数据：一张 256 × 256 的 RGB 图像可表示为 $\mathbb{R}^{256 \times 256 \times 3} \approx \mathbb{R}^{196{,}608}$ 中的一个点。若要让语言模型沿用处理文本的方式生成图像，就需要把像素数组转换为有限词表中的离散词元序列；这一步称为**图像词元化**。

- 词元化时，编码器先把图像空间区域压缩为潜向量，码本再为每个潜向量选出最近的条目。结果是一个整数索引网格，每个图像块对应一个索引，离散模型可以直接处理这个网格。这个过程类似用有限种颜色的马赛克砖重建照片：每块选最接近的颜色，细节会有所损失，但整体图像仍可辨认。

- 词元化主要有三项作用。第一，它大幅压缩图像：256 × 256 图像可表示为 16 × 16 的词元网格，序列长度从 65,536 个像素降至 256 个词元，让二次复杂度的注意力计算更可行。第二，它统一了表示形式：文本词元和图像词元都属于离散序列，单个自回归 Transformer 因而可以交错生成文本和图像。第三，离散瓶颈促使模型学习有语义的编码，而不是记忆像素噪声。

![图像词元化流程概览：连续图像经过编码器得到潜向量，码本对向量进行量化，最终生成离散词元索引网格](../images/image_tokenisation_overview.svg)

- 第 8 章介绍的卷积网络会从图像中提取分层特征图，第 7 章介绍的文本词元化器则会把字符串转换为整数序列。图像词元化结合了这两种思路：先用 CNN 或视觉 Transformer 编码器提取空间特征，再用离散词表把特征转换为词元索引。

## VQ-VAE：向量量化

- 标准**变分自编码器**（VAE）把输入编码为连续潜变量分布，再从该分布采样并解码重建。连续潜空间不便直接输入离散序列模型。van den Oord 等人于 2017 年提出的**向量量化变分自编码器**（VQ-VAE）用含 $K$ 个可学习嵌入向量的码本取代连续潜表示：编码器的每个输出都映射到距离最近的码本条目，从而得到离散表示。

VQ-VAE 由三个部分组成：

  - **编码器** $E$：将输入图像 $\mathbf{x} \in \mathbb{R}^{H \times W \times 3}$ 映射为空间网格上的连续潜向量 $\mathbf{z}_e = E(\mathbf{x}) \in \mathbb{R}^{h \times w \times d}$。其中 $h \times w$ 是下采样后的空间尺寸，$d$ 是嵌入维度。

  - **码本** $\mathcal{C} = \{\mathbf{e}_1, \mathbf{e}_2, \ldots, \mathbf{e}_K\} \subset \mathbb{R}^d$：包含 $K$ 个可学习的嵌入向量。常见码本大小为 512 到 16,384 个条目。

  - **解码器** $D$：根据量化后的潜向量重建图像。

- **量化步骤**：对每个编码器输出 $\mathbf{z}_e(\mathbf{x})$，在其空间位置 $(i, j)$ 用距离最近的码本向量替换：

$$\mathbf{z}_q(i,j) = \mathbf{e}_{k^\ast} \quad \text{where} \quad k^\ast = \arg\min_k \|\mathbf{z}_e(i,j) - \mathbf{e}_k\|_2$$

- 这等同于在嵌入空间中做最近邻查找，与第 6 章介绍的 K-Means 分配步骤相同。索引 $k^\ast$ 就是位置 $(i,j)$ 对应的离散词元，因此整张图像可表示为一个 $h \times w$ 的整数网格，每个值都来自 $\{1, \ldots, K\}$。

![VQ-VAE 架构：编码器生成连续潜向量，每个向量匹配到最近的码本条目，解码器根据量化结果重建图像](../images/vqvae_architecture.svg)

- $\arg\min$ 不可微，无法直接对离散选择执行反向传播。VQ-VAE 使用**直通估计器**处理这一问题：前向传播时，解码器接收量化向量 $\mathbf{z}_q$；反向传播时，重建损失对 $\mathbf{z}_q$ 的梯度直接复制给 $\mathbf{z}_e$，相当于把量化步骤视为恒等映射。其写法为：

$$\mathbf{z}_q = \mathbf{z}_e + \text{sg}(\mathbf{z}_q - \mathbf{z}_e)$$

- 其中 $\text{sg}(\cdot)$ 是停止梯度算子。前向计算该式会得到 $\mathbf{z}_q$；反向传播时，梯度只经过 $\mathbf{z}_e$ 这一项。

- VQ-VAE 的完整损失由三项组成：

$$\mathcal{L} = \underbrace{\|\mathbf{x} - D(\mathbf{z}_q)\|_2^2}_{\text{reconstruction}} + \underbrace{\|\text{sg}(\mathbf{z}_e) - \mathbf{e}\|_2^2}_{\text{codebook (VQ)}} + \underbrace{\beta \|\mathbf{z}_e - \text{sg}(\mathbf{e})\|_2^2}_{\text{commitment}}$$

- **重建损失**训练编码器和解码器，使重建结果接近输入。**码本损失**（也称 VQ 损失）把码本向量拉近编码器输出；由于其中的 $\text{sg}(\mathbf{z}_e)$ 停止梯度，编码器不会从这一项获得梯度，只有码本会更新。**承诺损失**则促使编码器输出靠近码本向量，避免编码器表示逐渐偏离码本。超参数 $\beta$（通常为 0.25）控制码本损失与承诺损失之间的权重。

- 实际训练中，码本常通过**指数移动平均**（EMA）更新，而不是使用梯度下降，这通常更稳定。设 $\mathbf{n}_k$ 是分配给码本条目 $k$ 的编码器输出数量，$\mathbf{s}_k$ 是这些输出的总和，则 EMA 更新为：

$$\mathbf{n}_k \leftarrow \gamma \mathbf{n}_k + (1 - \gamma) |\{(i,j) : k^\ast_{ij} = k\}|$$

$$\mathbf{s}_k \leftarrow \gamma \mathbf{s}_k + (1 - \gamma) \sum_{(i,j) : k^\ast_{ij} = k} \mathbf{z}_e(i,j)$$

$$\mathbf{e}_k \leftarrow \frac{\mathbf{s}_k}{\mathbf{n}_k}$$

- 其中 $\gamma$ 是衰减率（通常为 0.99）。这个过程相当于对编码器输出执行在线 K-Means。

### 码本坍塌

- VQ-VAE 的一种常见失效模式是**码本坍塌**（也称索引坍塌）：模型只使用 $K$ 个码本条目中的少数几个，其余条目则长期闲置，成为“死码”。这会浪费表示能力。

- 码本坍塌源于编码器、码本和解码器在训练中相互适应。如果某个条目连续多个批次都没有被选中，它会逐渐偏离编码器输出所在的潜空间区域，之后被选中的机会更低，形成正反馈循环。

- 缓解码本坍塌的办法包括：
    - **重置码本条目**：定期用随机抽取的编码器输出重新初始化闲置条目，使其回到潜空间中活跃区域附近。
    - **结合拉普拉斯平滑的 EMA 更新**：给 $\mathbf{n}_k$ 加上一个较小常数，避免计数为零，确保每个条目都能得到更新信号。
    - **调整承诺损失**：增大 $\beta$ 会促使编码器输出更紧密地聚集在码本向量周围，使分配更均匀。
    - **因子化编码**：把一次码本查找拆为多个较小的查找，例如使用两个大小为 $\sqrt{K}$ 的码本，以减小每次查找所面对的有效码本规模并提高利用率。
    - **熵正则化**：加入鼓励码本使用率分布均匀的惩罚项，最大化熵 $H = -\sum_k p_k \log p_k$，其中 $p_k$ 是根据实际分配计算出的经验概率。

![码本利用率对比：健康的码本将分配均匀分布到各条目；坍塌的码本中多数条目无人使用](../images/codebook_collapse.svg)

## VQ-GAN：用对抗训练提升保真度

- VQ-VAE 的重建结果尚可，但像素级 $\ell_2$ 损失会同等惩罚每个像素的偏差，容易把多种合理细节平均在一起，生成模糊图像，而不是清晰的具体细节。

- VQ-GAN（Esser et al., 2021）在 VQ-VAE 框架中加入生成对抗网络的**判别器**（第 6 章）。判别器是基于图像块的卷积网络，用来判断局部图像块来自真实训练图像还是解码器生成结果。对抗损失促使解码器生成感知上清晰、逼真的纹理，而不是像素平均值。

- VQ-GAN 的目标函数在 VQ-VAE 损失上增加对抗损失和感知损失：

$$\mathcal{L}_\text{VQ-GAN} = \mathcal{L}_\text{VQ-VAE} + \lambda_\text{adv} \mathcal{L}_\text{adv} + \lambda_\text{perc} \mathcal{L}_\text{perc}$$

- **对抗损失** $\mathcal{L}_\text{adv}$ 是作用于解码器输出的标准 GAN 目标。判别器 $\mathcal{D}$ 尝试区分真实图像块和解码生成的图像块，解码器（生成器）则尝试欺骗判别器。非饱和形式为：

$$\mathcal{L}_\text{adv} = -\mathbb{E}[\log \mathcal{D}(D(\mathbf{z}_q))]$$

- **感知损失** $\mathcal{L}_\text{perc}$ 比较预训练网络（通常为 VGG 或 LPIPS）在原图和重建图像上的特征激活：

$$\mathcal{L}_\text{perc} = \sum_l \|\phi_l(\mathbf{x}) - \phi_l(D(\mathbf{z}_q))\|_2^2$$

- 其中 $\phi_l$ 表示预训练网络第 $l$ 层的特征图。与像素级误差相比，这项损失更关注高层结构是否相似。

- $\lambda_\text{adv}$ 会根据对抗梯度与重建梯度的相对大小自适应调整，避免重建质量较差的训练初期被对抗损失主导。

![VQ-GAN 训练：编码器与解码器通过量化步骤连接，基于图像块的判别器为解码结果提供对抗反馈](../images/vqgan_training.svg)

- 在码本大小相同的情况下，VQ-GAN 通常比 VQ-VAE 生成更清晰的重建图像。原文称它是原版 DALL-E、Parti 等多种图像生成系统的核心词元化器，并称 256 × 256 图像可转换为码本大小为 1,024–16,384 的 16 × 16 或 32 × 32 离散词元网格。按网格边长计算，每个空间维度分别压缩 16 倍或 8 倍；相对于像素总数，词元数量分别减少 256 倍或 64 倍。**原文将空间维度压缩率写为 16 倍至 64 倍，与所列图像和网格尺寸不符。**

## 残差量化与多尺度码本

- 单一码本会限制重建质量：每个空间位置只能用一个码本向量表示，码本无法表达的细节会丢失。**残差量化**（RQ）通过逐级修正来减少这种误差。第一步得到 $\mathbf{z}_q^{(1)}$ 后，先计算残差 $\mathbf{r}^{(1)} = \mathbf{z}_e - \mathbf{z}_q^{(1)}$，再用第二个码本量化残差，得到 $\mathbf{z}_q^{(2)}$；如此重复 $T$ 级：

$$\mathbf{r}^{(0)} = \mathbf{z}_e$$

$$\mathbf{z}_q^{(t)} = \text{Quantise}(\mathbf{r}^{(t-1)}, \mathcal{C}^{(t)})$$

$$\mathbf{r}^{(t)} = \mathbf{r}^{(t-1)} - \mathbf{z}_q^{(t)}$$

- 最终量化表示为 $\hat{\mathbf{z}} = \sum_{t=1}^{T} \mathbf{z}_q^{(t)}$。若有 $T$ 级、每一级使用大小为 $K$ 的码本，组合后可表示 $K^T$ 种编码，但只需存储 $T \times K$ 个向量，而非 $K^T$ 个。例如，8 级、每级 $K = 1024$ 时，理论上可表示约 $1024^8 \approx 10^{24}$ 种组合，实际只需存储 8,192 个向量。

- 每一级会补充更细的细节：第一级表示粗略结构，第二级校正中频信息，后续级别继续细化。这与 JPEG 渐进式编码或网页图像逐步渲染的过程类似：先显示大致结果，再逐步补充细节。

![残差量化：逐级量化前一级留下的残差，逐步逼近原始向量](../images/residual_quantisation.svg)

- **多尺度码本**在不同空间分辨率上执行量化。它不在同一个空间网格上重复量化，而是用粗网格表示全局结构，再用更精细的网格捕捉局部细节。这与第 8 章目标检测中使用的特征金字塔有关：不同尺度的特征表示不同层次的细节。

- **乘积量化**会把 $d$ 维潜向量拆成 $M$ 个 $d/M$ 维子向量，再用各自的码本分别量化。这样能表示 $K^M$ 种组合，而只需存储 $M \times K$ 个向量。乘积量化常用于近似最近邻搜索（第 13 章），也已用于图像词元化。

- Mentzer 等人于 2023 年提出的**有限标量量化**（FSQ）不学习码本，而是把潜向量的每一维舍入到一组固定整数级别之一，例如 $\{-2, -1, 0, 1, 2\}$。每维有 $L$ 个级别、向量维度为 $d$ 时，隐式码本大小为 $L^d$。由于没有学习得到的码本向量，只有编码器输出按确定规则舍入，FSQ 可以避免码本坍塌。舍入操作的不可微性仍由直通估计器处理。

## 常见图像词元化器

- VQ-VAE、VQ-GAN 和残差量化的发展，带来了多种用于先进生成模型的实用图像词元化器。

### DALL-E 词元化器（dVAE）

- 原版 DALL-E（Ramesh et al., 2021）使用离散 VAE（dVAE），把 256 × 256 图像编码为 32 × 32 词元网格，码本大小为 8,192。dVAE 用 Gumbel-Softmax 松弛替代硬性的 $\arg\min$ 量化，使训练时的前向计算可微；推理时则用 $\arg\max$ 得到离散词元分配。训练目标由重建损失、相对于均匀先验的 KL 散度，以及学习得到的 Gumbel-Softmax 温度调度组成。随后，DALL-E 训练了一个 120 亿参数的自回归 Transformer，对 256 个文本词元与 1,024 个图像词元（32 × 32）的联合分布建模。

### LlamaGen

- LlamaGen（Sun et al., 2024）表明，只要图像词元化器足够好，标准的 Llama 风格语言模型架构（第 7 章）也能用于自回归图像生成。LlamaGen 使用改进的 VQ-GAN 词元化器，码本含 16,384 个条目，再用普通的自回归 Transformer 按光栅扫描顺序从左到右预测图像词元，无须为图像生成专门修改架构。图像转为离散序列后，语言建模中的下一个词元预测方法同样可以用于图像，这说明词元化能够连接不同模态。

### Cosmos 词元化器

- NVIDIA 于 2024 年推出的 Cosmos 词元化器统一处理图像和视频。它采用因果 3D 架构，把图像视为只有一帧的视频，因此同一词元化器可以处理两种模态。Cosmos 支持连续和离散两种模式：连续模式输出实数潜向量，供扩散模型使用；离散模式使用有限标量量化生成整数词元，供自回归模型使用。编码器采用因果 3D 卷积，因此每帧的词元只依赖当前帧和此前帧，支持流式视频词元化。

![图像词元化器对比：dVAE 使用 Gumbel-Softmax，VQ-GAN 查找码本条目，FSQ 对标量进行舍入](../images/image_tokeniser_comparison.svg)

## 视频词元化

- 视频在图像的空间维度之外增加了时间维度。视频由连续帧组成，常见帧率为每秒 24–30 帧；相邻帧通常高度冗余，因为画面很少在 33 毫秒内发生剧烈变化。视频词元化利用这种时间冗余，比逐帧独立词元化压缩得更多。

### 3D VQ-VAE

- 3D VQ-VAE 是将 VQ-VAE 扩展到视频的一种直接方法：编码器和解码器把 2D 卷积替换为同时处理空间与时间维度的 3D 卷积。如果编码器在空间维度下采样 $f_s$ 倍、在时间维度下采样 $f_t$ 倍，那么 $T \times H \times W$ 的视频片段会变为 $(T/f_t) \times (H/f_s) \times (W/f_s)$ 的词元网格。

- 例如，若 $f_s = 16$、$f_t = 4$，16 帧、分辨率为 256 × 256 的视频会变成 $4 \times 16 \times 16 = 1024$ 个词元。这个长度适合 Transformer 自回归建模；原始视频则包含 $16 \times 256 \times 256 \times 3 \approx 3.1$ 百万个像素值。

- 3D 卷积会联合学习空间与时间特征。浅层可捕捉帧间边缘移动等局部运动，深层则可捕捉物体出现、消失或形状变化等高层动态。这是第 8 章卷积网络所述分层特征提取在时间维度上的扩展。

![用于视频的 3D VQ-VAE：3D 卷积将视频片段编码为空间—时间潜向量网格，经量化后再解码为视频帧](../images/video_3d_vqvae.svg)

### 因果视频词元化器

- 标准 3D 卷积会同时查看过去、当前和未来帧，因此必须拿到完整视频片段后才能开始词元化。**因果视频词元化器**限制时间卷积，使每个输出只依赖当前帧和之前的帧，不依赖未来帧。这与第 7 章自回归 Transformer 的因果掩码类似：信息沿时间向前传递，不向后传递。

- 因果词元化有两类重要用途。第一是**流式处理**：帧到达时即可实时词元化，无须等待未来帧。第二是**自回归生成**：Transformer 按帧生成视频时，第 $t$ 帧的词元必须在不知道第 $t+1$ 帧的情况下计算，因为第 $t+1$ 帧此时尚未生成。

- 实现因果约束的一种办法是对时间卷积进行非对称填充：时间核大小为 $k$ 时，在过去一侧填充 $k-1$ 个零，未来一侧不填充。这样，时间 $t$ 的输出只依赖时间 $t-k+1, \ldots, t$ 的输入。

- 因果视频词元化器还可以直接处理单张图像，无须特殊逻辑。把图像视为只有一帧的视频，首帧没有过去的上下文，其词元只根据当前帧计算。**图像—视频统一**使同一词元化器能够处理两种模态，也便于模型用同一个解码器生成图像和视频。

### 时间压缩策略

- 不同应用需要不同的时间压缩率。动作识别需要保留细微运动，通常采用较温和的压缩（$f_t = 2$）；长视频生成若逐帧存储会产生大量词元，则需要较强压缩（$f_t = 8$ 或更高）。

- 一些词元化器采用**因子化压缩**，分阶段压缩空间和时间维度：先用 2D 编码器逐帧压缩，生成每帧的潜网格；再用 1D 时间编码器沿时间维度压缩。这种做法比完整 3D 卷积计算量小，也能独立设置空间和时间压缩率。代价是它不如联合 3D 编码高效地捕捉球体斜向移动等时空模式。

- **时间插值词元**是一种较新的做法：词元化器完整编码关键帧，并用轻量插值编码表示中间帧如何在关键帧之间变化。这类似 H.264/HEVC 等传统视频压缩中的 I 帧和 P 帧，只不过插值发生在学习得到的潜空间中。

![时间压缩策略对比：逐帧进行空间编码后再做时间编码，或用 3D 编码联合处理空间与时间](../images/temporal_compression_strategies.svg)

## 连续词元与离散词元

- 并非所有下游模型都需要离散词元。**扩散模型**（第 10 章第 04 篇）原生处理连续数值：它反复对高斯噪声样本去噪，去噪分数匹配等损失也定义在连续空间中。供扩散模型使用的词元化器会输出连续潜向量，不进行量化。原文将 Stable Diffusion、DALL-E 3 和 Flux 等**潜扩散模型**描述为使用类似 VQ-GAN 的编码器—解码器，但完全跳过码本，直接在连续潜空间中工作。

- **自回归模型**（如 GPT）则在有限词表上通过 $K$ 类 softmax 预测下一个词元，因此需要离散词元。使用自回归 Transformer 的图像生成系统（DALL-E、Parti、LlamaGen、Chameleon）都依赖离散词元化器。

- 连续或离散表示的选择取决于生成模型：
  - 模型采用自回归下一个词元预测和交叉熵损失、需要与文本共享词表，或需要精确控制单个词元（例如按词元检索或编辑）时，使用**离散词元**。
  - 模型采用扩散或流匹配、任务要求高保真重建（连续潜变量不产生量化误差），或损失函数作用于实值向量时，使用**连续词元**。

- 一些新架构支持两种模式。例如，Cosmos 词元化器可以用同一编码器输出连续潜向量供扩散模型使用，也可以通过 FSQ 离散化后供自回归模型使用；轻量级量化头可以启用或关闭。

- **软量化**介于两者之间：它不采用硬性的 $\arg\min$ 分配，而是对最近的 $k$ 个码本条目按负距离通过 softmax 计算权重，并据此求加权平均。它比硬量化保留更多信息，同时仍近似离散。一些系统训练时使用软量化，推理时则改用硬量化。

![根据下游生成模型选择连续或离散词元化的决策流程图](../images/continuous_vs_discrete_tokens.svg)

## 应用

### 自回归图像生成

- 图像表示为离散词元序列后，就能用标准自回归 Transformer 建模。图像词元通常按光栅扫描顺序（从左到右、从上到下）展平为一维序列，Transformer 用标准交叉熵学习 $p(\text{token}_i | \text{token}_1, \ldots, \text{token}_{i-1})$。生成时，模型逐个采样词元，再将完整网格交给词元化器的解码器还原为像素。

- 条件图像生成只需把文本词元放在图像词元序列之前，使模型学习 $p(\text{image tokens} | \text{text tokens})$。DALL-E、Parti 和 LlamaGen 都采用这种方式进行文生图。文本与图像词元共享同一 Transformer 和注意力机制，通常也共享嵌入表，只是两种模态使用不同的索引范围。

- 光栅扫描顺序会带来人为的方向偏差：左上角先生成，此时模型还看不到右下角的信息。**掩码图像建模**（MaskGIT）用双向 Transformer 同时生成所有词元，再按置信度迭代取消掩码，优先确定置信度最高的词元。**多尺度生成**则先生成表示全局构图的粗粒度词元，再用残差词元逐步细化。这两种方法牺牲了纯左到右生成的简单性，以换取更好的全局连贯性。

### 统一的视觉—语言词元

- 图像词元化的深层目标是**统一表示**：让视觉和语言使用同一种表示格式，使单一模型架构能够处理两者。图像转成词元序列后，语言建模中的预训练方法、缩放规律、RLHF 和上下文长度扩展等基础设施也可以用于图像建模。

- Chameleon（Meta，2024）是一个例子：它用包含 8,192 个条目的 VQ-GAN 码本把图像转成词元，再与文本词元交错放入一个约含 65,000 个条目的词表。标准 Transformer 在混合的图文序列上训练，可以根据图像生成文本、根据文本生成图像，也可以生成图文交错内容，所有任务都使用同一次前向计算。

- Gemini（Google，2024）也采用了类似思路，在大规模单一 Transformer 中理解和生成图像、音频与文本，并使用针对不同模态的词元化器将输入送入共享序列。

- 统一模型面临的关键工程问题是**词表容量平衡**：如果 65,000 个词表条目中有 8,192 个用于图像，模型可能分配给视觉的容量不足。可行做法包括为不同模态设置独立嵌入层、只在注意力层共享表示，按模态调整损失权重，以及在预训练时谨慎控制各类数据的混合比例。

![统一视觉—语言模型：不同词元化器产生的文本和图像词元交错组成单一序列，由一个 Transformer 处理](../images/unified_vision_language_tokens.svg)

## 编程任务（使用 Colab 或笔记本）

1. 用 JAX 实现一个最简 VQ 层：给定一批编码器输出向量，查找最近的码本条目，并计算 VQ-VAE 损失（重建损失、码本损失和承诺损失）。用直方图展示码本利用率。

   **说明：**原代码使用随机向量和码本，只计算码本损失与承诺损失；没有编码器、解码器或重建损失，因此并未实现题目所说的完整 VQ-VAE 损失。

2. 构建一个二维向量量化示例，让码本学习覆盖一个二维分布：生成随机二维点，通过 EMA 更新学习码本，并展示 Voronoi 区域。

   **说明：**原代码只按码本分配结果给数据点着色并标出码本向量，没有画出 Voronoi 区域边界。

3. 演示残差量化：用连续 $T$ 级量化处理一批向量，并测量各级的重建误差。

   **说明：**原代码每级使用独立随机初始化的码本，没有训练码本；因此误差不保证随级数增加而逐步下降。

4. 模拟一个简单的一维“视频词元化器”：生成一串模拟视频帧的一维信号，执行因果时间压缩，并与非因果压缩比较重建质量。

   **说明：**原代码对完整长度的序列分别做因果指数平滑和双向平滑，没有把序列量化为词元，也没有减少帧数；它比较的是两种平滑方式的重建均方误差。

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
