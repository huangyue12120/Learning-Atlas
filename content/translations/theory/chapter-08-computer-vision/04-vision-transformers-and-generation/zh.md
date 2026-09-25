---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 08 - computer vision/04. vision transformers and generation.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 6ce5bcea1aee83c498853caeb202345690e4c26e561d5e4fbe18a66fe7583dea
status: reviewed
---
# 视觉 Transformer 与图像生成

*视觉 Transformer 将自注意力用于图像块，以数据驱动的方式学习空间结构，挑战 CNN 长期以来的主导地位。本文介绍 ViT、DeiT、Swin Transformer、基于 GAN 的图像生成（StyleGAN）、VAE、扩散模型（DDPM、Stable Diffusion），以及超分辨率和神经风格迁移。*

> 注：原文导语还列出超分辨率和神经风格迁移，但正文没有展开这两项内容。

- CNN（文件 02）具有较强的空间归纳偏置：局部连接、权重共享和平移等变性。视觉 Transformer（ViT）提出了一个颇具挑战的问题：如果完全去掉这些偏置，只使用第 06 章介绍的注意力机制，让模型从数据中自行学习空间结构，会怎样？

- **视觉 Transformer（ViT）**（Dosovitskiy 等，2021）将标准 Transformer 编码器直接用于图像。核心做法是把图像切分成一系列图像块，并将其视作序列，就像自然语言处理（NLP）将文本视作词元序列一样。

- 处理步骤如下：
    1. 将图像（高度 $H$、宽度 $W$、通道数 $C$）切分为大小为 $P \times P$、彼此不重叠的图像块，得到 $N = HW / P^2$ 个图像块。
    2. 将每个图像块展平成长度为 $P^2 \cdot C$ 的向量，再通过可学习的线性嵌入（一次矩阵乘法，见第 02 章）将其投影到模型维度 $D$。
    3. 在序列开头加入一个可学习的 **[CLS] 词元**嵌入（类似于 BERT 的 [CLS]，见第 07 章）。该词元会关注所有图像块，最终表示用于分类。
    4. 加入**位置嵌入**（每个位置对应一个可学习向量），提供空间信息；因为注意力对输入置换是等变的，本身不编码位置信息。
    5. 将由 $(N + 1)$ 个词元嵌入组成的序列输入标准 Transformer 编码器（多头自注意力 + 前馈网络，见第 06 章）。
    6. 将 [CLS] 词元的最终表示输入分类头（一个小型多层感知机）。

![ViT 流程：图像切分为 16×16 图像块，每块展平并进行线性投影；在序列开头加入 [CLS] 词元和位置嵌入，再输入 Transformer 编码器层](../images/vit_pipeline.svg)

- **图像块嵌入**等价于使用核大小为 $P$、步长为 $P$ 的卷积（不重叠）处理图像。ViT 将二维图像转换为一维序列，再用与语言模型相同的架构处理。

- 与 CNN 相比，ViT 的归纳偏置更少：它不强制局部连接，也不具备平移等变性。这意味着模型需要更多训练数据，才能从头学会空间结构。在小型数据集上，CNN 表现更好；但在 JFT-300M 这样的大型数据集（3 亿张图像）上训练时，ViT 能达到或超过最优秀的 CNN。这表明 CNN 的归纳偏置有助于提高数据效率，却不是取得更高最终性能的必要条件。

- ViT 的自注意力计算量随图像块数量按 $O(N^2)$ 增长。对于一张 224×224、切分为 16×16 图像块的图像，$N = 196$，计算量尚可接受；但图像分辨率更高或图像块更小时，二次增长的计算成本就难以承受。

- **DeiT**（Data-efficient Image Transformer，Touvron 等，2021）证明，只用 ImageNet 也能有效训练 ViT，无需规模庞大的 JFT 数据集。其方法包括加强数据增强和正则化（随机深度、标签平滑、Dropout），并使用**知识蒸馏**：预训练 CNN 教师模型提供软标签，ViT 学生模型学习匹配这些标签。DeiT 在 [CLS] 词元旁加入一个**蒸馏词元**，并训练它预测教师模型的输出。

- **Swin Transformer**（Liu 等，2021）针对 ViT 的两项主要局限：图像尺寸增大时计算量按二次方增长，以及缺少检测和分割所需的层次化特征图。

- Swin 使用**移位窗口**：不再对所有图像块执行全局自注意力，而是在局部窗口内计算注意力（例如，每个窗口包含 7×7 个图像块）。这样，计算量会随图像大小线性增长，为 $O(N)$，而不是 $O(N^2)$。不过，单独使用局部窗口会阻断不同区域之间的信息传递。

- **窗口移位**解决了这个问题：在交替的网络层中，将窗口划分移动半个窗口的宽度。这样便能建立跨窗口连接，让图像不同区域的信息在多层之间流动，同时避免全局注意力的高昂成本。

![Swin Transformer：第 l 层在常规窗口内计算注意力，第 l+1 层将窗口划分平移半个窗口，从而建立跨窗口连接](../images/swin_shifted_windows.svg)

- Swin 还会在不同阶段合并图像块，构建**层次化表示**。每个阶段结束后，将相邻的 2×2 图像块拼接，再投影到通道数翻倍、空间分辨率减半的表示。这样得到的多尺度特征图与 CNN 和 FPN（文件 03）中的特征图类似，因此 Swin 可以直接搭配 Faster R-CNN 等检测头，以及 U-Net 等分割头。

- **PVT**（Pyramid Vision Transformer，金字塔视觉 Transformer）也采用分层结构，并使用空间缩减注意力：每个阶段在计算注意力前先对键和值进行空间下采样，以降低二次计算成本，同时保留全局感受野。

- **自监督视觉学习**使用未标注图像训练表示。标注成本高，但图像资源丰富。目标是在不依赖人工标注的情况下，学习能够迁移到下游任务的特征。

- **对比学习**让模型学会：同一图像经过不同数据增强得到的两个视图（**正样本对**）应具有相似表示；不同图像的视图（**负样本对**）则应具有不同表示。

- **SimCLR**（Chen 等，2020）为批次中的每张图像生成两个增强视图，使用共享的主干网络和投影头编码这两个视图，再应用 **NT-Xent 损失**（归一化温度缩放交叉熵）：

$$\ell_{i,j} = -\log \frac{\exp(\text{sim}(z_i, z_j) / \tau)}{\sum_{k \neq i} \exp(\text{sim}(z_i, z_k) / \tau)}$$

- 其中，$\text{sim}$ 是余弦相似度（见第 01 章），$\tau$ 是温度参数。分子项拉近正样本对，分母项则拉远负样本对。SimCLR 需要较大的批次（4,096 张以上），才能提供足够多的负样本。

- **MoCo**（Momentum Contrast，He 等，2020）通过维护一个**动量更新的负样本队列**，解决了对大批次的依赖。查询编码器通过梯度下降更新；键编码器则是查询编码器的指数移动平均（EMA，见第 04 章）：$\theta_k \leftarrow m \theta_k + (1 - m) \theta_q$，其中 $m = 0.999$。队列保存近期的键嵌入，因此无需使用超大批次，也能获得大量且稳定的负样本。

- **BYOL**（Bootstrap Your Own Latent，Grill 等，2020）完全不使用负样本对。它包含两个网络：在线网络和目标网络（在线网络的 EMA）。在线网络要预测目标网络对另一种增强视图生成的表示。BYOL 依靠预测头与 EMA 目标网络之间的不对称性，避免模型输出完全相同向量的坍塌问题。

- **DINO**（Self-Distillation with No Labels，Caron 等，2021）将自蒸馏用于 ViT。学生网络根据不同的增强视图预测教师网络的输出，而教师网络是学生网络的 EMA。教师使用较大的裁剪图像，学生使用较小的裁剪图像。DINO 学到的特征包含明确的场景布局信息：即使没有分割监督，DINO 训练所得 ViT 的自注意力图也能自然地分出对象。

- **掩码图像建模**是 BERT 掩码语言建模（见第 07 章）在视觉领域的对应方法。输入图像中的大部分图像块会被遮住，模型需要学习重建它们。

- **MAE**（Masked Autoencoders，He 等，2022）遮住 75% 的图像块，并训练 ViT 编码器—解码器重建缺失的像素值。编码器只处理未遮住的图像块（预训练时可节省 4 倍计算）；轻量级解码器则根据编码后的可见图像块和可学习的掩码词元重建整张图像。

- **BEiT**（BERT Pre-training of Image Transformers，Bao 等，2022）遮住图像块，并预测离散视觉词元（由预训练的 dVAE 词元化器生成），而不是直接预测像素。这与 BERT 预测离散词元的做法相似，也避免了对像素级低层细节进行重建。

- **图像生成**旨在生成训练集中不存在的逼真图像。核心难点是建模自然图像的高维概率分布。

- **生成对抗网络（GAN）**（Goodfellow 等，2014）由两个相互竞争的网络组成：**生成器** $G$ 从随机噪声生成假图像；**判别器** $D$ 则尝试区分真实图像和生成图像。两者通过对抗训练：$G$ 试图骗过 $D$，$D$ 则试图识破 $G$。

$$\min_G \max_D \; \mathbb{E}_{x \sim p_{\text{data}}}[\log D(x)] + \mathbb{E}_{z \sim p(z)}[\log(1 - D(G(z)))]$$

- 生成器从简单分布（如高斯分布）中采样随机潜在向量 $z$，再通过一系列转置卷积将它映射为图像。判别器则是标准的 CNN 分类器。在均衡状态下，$G$ 生成的图像与真实数据无法区分，而 $D$ 对所有输入都输出 0.5。

- **模式坍塌**是 GAN 的主要失效模式：生成器为了骗过判别器，只学会生成少数几类图像，忽略训练数据的多样性。它找到少数“保险”的输出，却没有覆盖完整的数据分布。

- 稳定 GAN 训练的技巧包括：谱归一化（限制判别器的 Lipschitz 常数）、渐进式增长（先在低分辨率下训练，再逐渐提高分辨率）、特征匹配（匹配判别器中间层特征的统计量，而非最终输出），以及使用 Wasserstein 距离替代原始的 JS 散度目标。

- **StyleGAN**（Karras 等，2019）是高质量图像合成领域最具影响力的 GAN 架构。它的核心创新是**风格生成器**：不直接把潜在向量 $z$ 输入生成器，而是先通过映射网络（8 层 MLP）将 $z$ 转换为风格向量 $w$。风格向量通过**自适应实例归一化（AdaIN）**注入生成器的每一层，以调节特征图的统计量：

$$\text{AdaIN}(x, y) = y_{s} \cdot \frac{x - \mu(x)}{\sigma(x)} + y_{b}$$

- 其中，$y_s$ 和 $y_b$ 是根据 $w$ 计算出的缩放和偏移量。不同层控制不同层次的特征：早期层控制姿态、脸型等粗略特征；中间层控制发型、眼睛等中等尺度特征；后期层控制雀斑、头发纹理等细节。StyleGAN 能以 1024×1024 分辨率生成逼真的人脸图像。

- **变分自编码器（VAE）**（见第 06 章）提供了另一种生成方法。与 GAN 不同，VAE 具有严谨的概率框架和明确的训练目标（证据下界，ELBO）。VAE 生成的图像往往比 GAN 模糊，但其潜在空间更平滑、结构更清晰。潜在扩散模型使用 VAE 编码器—解码器对图像进行压缩和还原。

- **扩散模型**已成为图像生成的主流范式，在图像质量和多样性方面都超过了 GAN。基本思路很简单：逐步向数据添加噪声，直到它变为纯高斯噪声（**前向过程**），再逐步学习逆转这一过程（**反向过程**）。

- **前向过程**在 $T$ 个时间步中逐步加入高斯噪声：

$$q(x_t | x_{t-1}) = \mathcal{N}(x_t; \sqrt{1 - \beta_t} \, x_{t-1}, \beta_t I)$$

- 其中，$\beta_t$ 是随时间递增的噪声调度。经过足够多的步骤后，无论初始图像 $x_0$ 如何，$x_T$ 都会近似纯高斯噪声。利用重参数化技巧（见第 06 章），并设 $\alpha_t = 1 - \beta_t$、$\bar{\alpha}_t = \prod_{s=1}^{t} \alpha_s$，就可以直接从 $x_0$ 采样 $x_t$：

$$x_t = \sqrt{\bar{\alpha}_t} \, x_0 + \sqrt{1 - \bar{\alpha}_t} \, \epsilon, \quad \epsilon \sim \mathcal{N}(0, I)$$

- **反向过程**学习去噪：从纯噪声 $x_T$ 开始，模型预测每一步加入的噪声 $\epsilon$，并将其减去以恢复 $x_{t-1}$。该过程由神经网络 $\epsilon_\theta$ 参数化（通常使用 U-Net，见文件 03），并通过简单的均方误差（MSE）损失训练：

$$\mathcal{L} = \mathbb{E}_{t, x_0, \epsilon}\left[\|\epsilon - \epsilon_\theta(x_t, t)\|^2\right]$$

![扩散模型的前向与反向过程：干净图像在前向过程中经过 T 步逐渐被噪声扰动；神经网络学习逆转每一步，从纯噪声生成干净图像](../images/diffusion_process.svg)

- **DDPM**（Denoising Diffusion Probabilistic Models，Ho 等，2020）建立了这一框架。采样需要迭代全部 $T$ 步（通常为 1,000 步），因此速度很慢。**DDIM**（Denoising Diffusion Implicit Models，Song 等，2021）将采样过程重新表述为确定性映射，因此可以大步跳过时间步（例如只用 50 步而不是 1,000 步），且图像质量损失很小。

- **基于得分的模型**（Song 和 Ermon，2019）提供了另一种视角。模型不预测噪声 $\epsilon$，而是估计**得分函数** $\nabla_{x_t} \log p(x_t)$，即带噪图像的对数概率关于图像本身的梯度。这个梯度指向数据分布中概率更高、图像更干净的区域。采样时，模型通过 Langevin 动力学沿着该梯度移动。基于得分的模型和 DDPM 统一在**随机微分方程（SDE）**框架中：前向过程是加入噪声的 SDE，反向过程是时间反演的 SDE。

- **无分类器引导**（Ho 和 Salimans，2022）用于调节生成质量与多样性的取舍。训练时，模型既接受带条件（文本提示词或类别标签）的训练，也接受随机丢弃条件后的无条件训练。采样时，将两种预测加权组合：

$$\hat{\epsilon} = \epsilon_\theta(x_t, \varnothing) + s \cdot (\epsilon_\theta(x_t, c) - \epsilon_\theta(x_t, \varnothing))$$

- 其中，$c$ 是条件，$\varnothing$ 表示空条件，$s > 1$ 是引导尺度。$s$ 越大，图像越符合条件，但多样性越低。按此公式，$s = 0$ 得到无条件预测，$s = 1$ 得到有条件预测；$s = 7.5$ 是常见默认值。

> 注：原文把 $s = 1$ 称为无引导，与公式不符；按公式应由 $s = 0$ 得到无条件预测。

- **潜在扩散**（Rombach 等，2022；Stable Diffusion）将扩散过程从像素空间移至学习得到的潜在空间。预训练 VAE 编码器先将图像压缩为低维潜在表示（通常在空间维度上下采样 4 倍或 8 倍），扩散过程在压缩空间中进行，再由 VAE 解码器将去噪后的潜在表示还原成像素。这样效率会大幅提高：在像素空间扩散一张 512×512 图像，需要处理 $512 \times 512 \times 3$ 张量；在潜在空间中只需处理 $64 \times 64 \times 4$ 张量。

- 潜在扩散中的去噪 U-Net 接收带噪潜在表示、时间步（用正弦嵌入编码，类似 Transformer 的位置编码）和条件信号（由冻结的 CLIP 或 T5 文本编码器生成的文本嵌入）。文本条件通过 U-Net 内的交叉注意力层传入：文本嵌入作为键和值，图像特征作为查询。这样，模型就能在每个空间位置关注与提示词相关的文本内容。

- **流匹配**是扩散模型之外的一种新兴方法，它学习从噪声到数据的直接传输路径，而不是像 DDPM 那样迭代去噪。

- **连续归一化流（CNF）**定义随时间变化的速度场 $v_\theta(x, t)$，沿平滑轨迹将简单分布 $p_0$（噪声）中的样本推送到数据分布 $p_1$。这一变换遵循常微分方程（ODE）：

$$\frac{dx}{dt} = v_\theta(x, t), \quad t \in [0, 1]$$

- 从 $x_0 \sim \mathcal{N}(0, I)$ 出发，将 ODE 向前积分至 $t = 1$，即可生成一个来自数据分布的样本。速度场由神经网络参数化，并通过训练匹配目标条件流。

- **最优传输（OT）流匹配**（Lipman 等，2023）以噪声和数据之间的直线路径作为目标流。从噪声样本 $x_0$ 到数据样本 $x_1$ 的条件路径为 $x_t = (1 - t) x_0 + t x_1$，目标速度为 $v = x_1 - x_0$。训练损失为：

$$\mathcal{L} = \mathbb{E}_{t, x_0, x_1} \left[\|v_\theta(x_t, t) - (x_1 - x_0)\|^2\right]$$

- **整流流**（Liu 等，2022）通过迭代校正学到的流路径，使其逐渐变直。初始训练完成后，先用模型模拟 ODE，生成（噪声，数据）样本对；这些配对比随机配对更匹配，再用于重新训练模型。重复这一过程会得到越来越直的路径，因此只需较少的 ODE 步骤（甚至一步）就能完成积分，实现极快的生成。

- 与扩散模型相比，流匹配有几项优势：训练目标更简单（直接回归速度，无需噪声调度）；采样 ODE 更平滑，因此所需积分步数更少；同时，它与最优传输理论的联系也提供了理论依据。Stable Diffusion 3 和 Flux 使用流匹配，而非传统 DDPM。

## 编程任务（使用 Colab 或笔记本）

1. 从头实现 ViT 的图像块嵌入：将图像切分为图像块并展平，投影到模型维度，加入位置嵌入，再在序列开头加入 [CLS] 词元。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

def create_patch_embedding(image, patch_size, d_model, params):
    """Convert an image into a sequence of patch embeddings."""
    H, W, C = image.shape
    n_patches_h = H // patch_size
    n_patches_w = W // patch_size
    n_patches = n_patches_h * n_patches_w

    # Extract patches
    patches = []
    for i in range(n_patches_h):
        for j in range(n_patches_w):
            patch = image[i*patch_size:(i+1)*patch_size,
                          j*patch_size:(j+1)*patch_size, :]
            patches.append(patch.ravel())
    patches = jnp.stack(patches)  # (N, P*P*C)

    # Linear projection to d_model
    embeddings = patches @ params['proj_w'] + params['proj_b']  # (N, d_model)

    # Prepend CLS token
    cls_token = params['cls_token']  # (1, d_model)
    embeddings = jnp.concatenate([cls_token, embeddings], axis=0)  # (N+1, d_model)

    # Add position embeddings
    embeddings = embeddings + params['pos_embed']  # (N+1, d_model)

    return embeddings, patches

# Setup
H, W, C = 32, 32, 3
patch_size = 8
d_model = 64
n_patches = (H // patch_size) * (W // patch_size)  # 16

key = jax.random.PRNGKey(42)
keys = jax.random.split(key, 5)

# Create a synthetic image with distinct quadrants
image = jnp.zeros((H, W, C))
image = image.at[:16, :16, 0].set(1.0)   # red top-left
image = image.at[:16, 16:, 1].set(1.0)   # green top-right
image = image.at[16:, :16, 2].set(1.0)   # blue bottom-left
image = image.at[16:, 16:, :2].set(1.0)  # yellow bottom-right

params = {
    'proj_w': jax.random.normal(keys[0], (patch_size**2 * C, d_model)) * 0.02,
    'proj_b': jnp.zeros(d_model),
    'cls_token': jax.random.normal(keys[1], (1, d_model)) * 0.02,
    'pos_embed': jax.random.normal(keys[2], (n_patches + 1, d_model)) * 0.02,
}

embeddings, patches = create_patch_embedding(image, patch_size, d_model, params)

print(f"Image shape: {image.shape}")
print(f"Patch size: {patch_size}x{patch_size}")
print(f"Number of patches: {n_patches}")
print(f"Patch vector length: {patch_size**2 * C}")
print(f"Embedding shape: {embeddings.shape}  (CLS + {n_patches} patches)")

# Visualise patches
fig, axes = plt.subplots(2, 5, figsize=(14, 6))
axes[0, 0].imshow(image); axes[0, 0].set_title('Full Image'); axes[0, 0].axis('off')
for idx in range(min(9, n_patches)):
    ax = axes[(idx+1) // 5, (idx+1) % 5]
    patch_img = patches[idx].reshape(patch_size, patch_size, C)
    ax.imshow(patch_img); ax.set_title(f'Patch {idx}'); ax.axis('off')
plt.suptitle('ViT Patch Decomposition')
plt.tight_layout(); plt.show()
```

2. 实现一个简单的 GAN 训练循环：在二维数据上训练生成器和判别器，并可视化生成分布如何逐渐逼近真实分布。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

def generator(z, params):
    h = jnp.tanh(z @ params['g_w1'] + params['g_b1'])
    h = jnp.tanh(h @ params['g_w2'] + params['g_b2'])
    return h @ params['g_w3'] + params['g_b3']

def discriminator(x, params):
    h = jax.nn.leaky_relu(x @ params['d_w1'] + params['d_b1'], 0.2)
    h = jax.nn.leaky_relu(h @ params['d_w2'] + params['d_b2'], 0.2)
    return jax.nn.sigmoid(h @ params['d_w3'] + params['d_b3'])

def init_params(key):
    keys = jax.random.split(key, 6)
    z_dim, h_dim, data_dim = 2, 32, 2
    scale = 0.1
    return {
        'g_w1': jax.random.normal(keys[0], (z_dim, h_dim)) * scale,
        'g_b1': jnp.zeros(h_dim),
        'g_w2': jax.random.normal(keys[1], (h_dim, h_dim)) * scale,
        'g_b2': jnp.zeros(h_dim),
        'g_w3': jax.random.normal(keys[2], (h_dim, data_dim)) * scale,
        'g_b3': jnp.zeros(data_dim),
        'd_w1': jax.random.normal(keys[3], (data_dim, h_dim)) * scale,
        'd_b1': jnp.zeros(h_dim),
        'd_w2': jax.random.normal(keys[4], (h_dim, h_dim)) * scale,
        'd_b2': jnp.zeros(h_dim),
        'd_w3': jax.random.normal(keys[5], (h_dim, 1)) * scale,
        'd_b3': jnp.zeros(1),
    }

def d_loss(params, real_data, fake_data):
    real_score = discriminator(real_data, params)
    fake_score = discriminator(fake_data, params)
    return -jnp.mean(jnp.log(real_score + 1e-7) + jnp.log(1 - fake_score + 1e-7))

def g_loss(params, fake_data):
    fake_score = discriminator(fake_data, params)
    return -jnp.mean(jnp.log(fake_score + 1e-7))

# Real data: ring distribution
key = jax.random.PRNGKey(42)
theta = jax.random.uniform(key, (512,)) * 2 * jnp.pi
real_data = jnp.stack([jnp.cos(theta), jnp.sin(theta)], axis=1)
real_data = real_data + jax.random.normal(key, real_data.shape) * 0.05

params = init_params(jax.random.PRNGKey(0))
d_grad = jax.grad(d_loss)
g_grad = jax.grad(g_loss)
lr = 0.001

snapshots = []
for step in range(3000):
    key, k1 = jax.random.split(key)
    z = jax.random.normal(k1, (512, 2))
    fake_data = generator(z, params)

    # Update discriminator
    grads = d_grad(params, real_data, fake_data)
    for k in ['d_w1', 'd_b1', 'd_w2', 'd_b2', 'd_w3', 'd_b3']:
        params[k] = params[k] - lr * grads[k]

    # Update generator
    fake_data = generator(z, params)
    grads = g_grad(params, fake_data)
    for k in ['g_w1', 'g_b1', 'g_w2', 'g_b2', 'g_w3', 'g_b3']:
        params[k] = params[k] - lr * grads[k]

    if step in [0, 500, 1500, 2999]:
        snapshots.append((step, fake_data.copy()))

fig, axes = plt.subplots(1, 4, figsize=(16, 4))
for ax, (step, fake) in zip(axes, snapshots):
    ax.scatter(real_data[:, 0], real_data[:, 1], s=5, alpha=0.3, c='#3498db', label='Real')
    ax.scatter(fake[:, 0], fake[:, 1], s=5, alpha=0.3, c='#e74c3c', label='Generated')
    ax.set_title(f'Step {step}'); ax.set_xlim(-2, 2); ax.set_ylim(-2, 2)
    ax.set_aspect('equal'); ax.legend(markerscale=3)
plt.suptitle('GAN Training: Generator Learns the Ring Distribution')
plt.tight_layout(); plt.show()
```

3. 实现扩散模型的前向过程：在不断增加的时间步上向图像加噪，并可视化图像逐步被噪声扰动的过程。然后实现一步去噪。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

def noise_schedule(T, beta_start=0.0001, beta_end=0.02):
    """Linear noise schedule."""
    betas = jnp.linspace(beta_start, beta_end, T)
    alphas = 1.0 - betas
    alpha_bars = jnp.cumprod(alphas)
    return betas, alphas, alpha_bars

def forward_diffusion(x0, t, alpha_bars, key):
    """Add noise to x0 at timestep t."""
    alpha_bar_t = alpha_bars[t]
    noise = jax.random.normal(key, x0.shape)
    xt = jnp.sqrt(alpha_bar_t) * x0 + jnp.sqrt(1 - alpha_bar_t) * noise
    return xt, noise

# Create a simple 2D "image" (checkerboard)
img = jnp.zeros((32, 32))
for i in range(4):
    for j in range(4):
        if (i + j) % 2 == 0:
            img = img.at[i*8:(i+1)*8, j*8:(j+1)*8].set(1.0)

T = 1000
betas, alphas, alpha_bars = noise_schedule(T)

# Visualise forward process
timesteps = [0, 50, 200, 500, 999]
key = jax.random.PRNGKey(42)

fig, axes = plt.subplots(1, len(timesteps), figsize=(16, 3.5))
for ax, t in zip(axes, timesteps):
    key, subkey = jax.random.split(key)
    xt, noise = forward_diffusion(img, t, alpha_bars, subkey)
    ax.imshow(xt, cmap='gray', vmin=-2, vmax=2)
    ax.set_title(f't={t}\n$\\bar{{\\alpha}}$={alpha_bars[t]:.3f}')
    ax.axis('off')
plt.suptitle('Diffusion Forward Process: Progressive Noise Addition')
plt.tight_layout(); plt.show()

# Simple denoising: train a tiny network to predict noise at t=200
t_denoise = 200
key, k1 = jax.random.split(key)
xt, true_noise = forward_diffusion(img, t_denoise, alpha_bars, k1)

# Tiny "denoiser": just learn a constant noise estimate (for illustration)
noise_estimate = jnp.zeros_like(img)
lr = 0.01
for step in range(100):
    residual = noise_estimate - true_noise
    noise_estimate = noise_estimate - lr * residual

# Reverse one step
alpha_bar_t = alpha_bars[t_denoise]
x_denoised = (xt - jnp.sqrt(1 - alpha_bar_t) * noise_estimate) / jnp.sqrt(alpha_bar_t)

fig, axes = plt.subplots(1, 3, figsize=(12, 4))
axes[0].imshow(img, cmap='gray'); axes[0].set_title('Original $x_0$'); axes[0].axis('off')
axes[1].imshow(xt, cmap='gray', vmin=-2, vmax=2)
axes[1].set_title(f'Noisy $x_{{200}}$'); axes[1].axis('off')
axes[2].imshow(x_denoised, cmap='gray')
axes[2].set_title('Denoised (one step)'); axes[2].axis('off')
plt.tight_layout(); plt.show()

mse = jnp.mean((x_denoised - img)**2)
print(f"Denoising MSE: {mse:.4f}")
```
