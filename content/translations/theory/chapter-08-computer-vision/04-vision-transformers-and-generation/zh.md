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

# 视觉 Transformer 与生成

*视觉 Transformer 把自注意力应用到图像块上，用数据驱动的空间学习挑战 CNN 的主导地位。本篇涵盖 ViT、DeiT、Swin Transformer，以及使用 GAN（StyleGAN）、VAE 和扩散模型（DDPM、Stable Diffusion）进行图像生成，还介绍超分辨率和神经风格迁移。*

- CNN（第 02 篇）内置了很强的空间归纳偏置：局部连接、权重共享和平移等变性。视觉 Transformer（ViT）提出了一个大胆的问题：如果完全去掉这些偏置，只使用第 06 章介绍的注意力机制，让模型从数据中学习空间结构，会怎样？

- **视觉 Transformer（ViT）**（Dosovitskiy 等，2021）直接把标准 Transformer 编码器应用于图像。核心思想是把图像视为一系列图像块，就像 NLP 把文本视为一系列 token。

- 过程如下：
    1. 把图像（高度 $H$、宽度 $W$、通道数 $C$）切分为大小为 $P \times P$ 的不重叠网格，得到 $N = HW / P^2$ 个图像块。
    2. 把每个图像块展平为长度 $P^2 \cdot C$ 的向量，再通过学习到的线性 embedding（一次矩阵乘法，第 02 章）投影到模型维度 $D$。
    3. 在序列开头添加一个可学习的 **[CLS] token** embedding（类似 BERT 的 [CLS]，第 07 章）。这个 token 会关注所有图像块，其最终表示用于分类。
    4. 加入**位置 embedding**（每个位置一个可学习向量）来提供空间信息，因为注意力具有置换等变性。
    5. 将这组 $(N + 1)$ 个 token embedding 送入标准 Transformer 编码器（多头自注意力 + FFN，第 06 章）。
    6. 将 [CLS] token 的最终表示送入分类头（一个小型 MLP）。

![ViT 流水线：将图像切成 16×16 图像块，展平并线性投影，添加 [CLS] token 和位置 embedding，再送入 Transformer 编码器块](../images/vit_pipeline.svg)

- **图像块 embedding** 等价于核大小为 $P$、步幅为 $P$ 的卷积（没有重叠）。ViT 实际上把二维图像转换成一维序列，然后使用与语言相同的架构处理它。

- ViT 比 CNN 的归纳偏置更少：它不强制局部连接，也不强制平移等变。这意味着它需要更多训练数据才能从零学到空间结构。在小数据集上，CNN 的表现优于 ViT。但在非常大的数据集（JFT-300M，3 亿张图像）上训练时，ViT 能达到或超过最好的 CNN，这说明 CNN 的归纳偏置有助于提高数据效率，但不是达到最终性能的必要条件。

- ViT 自注意力关于图像块数量的复杂度是 $O(N^2)$。对于使用 16×16 图像块的 224×224 图像，$N = 196$，这个规模尚可处理。但对更高分辨率图像或更小的图像块而言，二次复杂度会变得难以承受。

- **DeiT**（Data-efficient Image Transformer，数据高效图像 Transformer，Touvron 等，2021）表明，仅使用 ImageNet（不需要庞大的 JFT 数据集），也可以通过强数据增强、正则化（随机深度、标签平滑、dropout）和**知识蒸馏**有效训练 ViT：预训练 CNN 教师提供软标签，ViT 学生学习匹配这些标签。DeiT 在 [CLS] token 旁边加入一个**蒸馏 token**，训练它预测教师的输出。

- **Swin Transformer**（Liu 等，2021）解决了 ViT 的两个主要限制：随图像大小增长的二次成本，以及缺少检测和分割所需的层次化特征图。

- Swin 引入了**移位窗口**：不再对所有图像块执行全局自注意力，而是在局部窗口内计算注意力（例如 7×7 个图像块）。这样计算成本随图像大小线性增长：从 $O(N^2)$ 变为 $O(N)$。但单独使用局部窗口会阻止区域之间的信息流动。

- **窗口移位**解决了这个问题：在交替层中，把窗口划分移动半个窗口大小。这样会创建跨窗口连接，使信息能够在多层之间流过图像的所有部分，同时避免全局注意力的成本。

![Swin Transformer：第 l 层在规则窗口内计算注意力，第 l+1 层将窗口划分移动一半，创建跨窗口连接](../images/swin_shifted_windows.svg)

- Swin 还通过跨阶段合并图像块，构建**层次化表示**。每个阶段结束后，将相邻的 2×2 个图像块拼接，并投影为通道维度加倍、空间分辨率减半的表示。这会产生类似 CNN 和 FPN（第 03 篇）的多尺度特征图，使 Swin 可以直接兼容 Faster R-CNN 这样的检测头和 U-Net 这样的分割头。

- **PVT**（Pyramid Vision Transformer，金字塔视觉 Transformer）采用了类似的层次化方法，并使用空间缩减注意力：在每个阶段计算注意力之前，对键和值进行空间下采样，在保持全局感受野的同时降低二次成本。

- **自监督视觉学习**从未标注图像中训练表示。标签收集成本很高，但图像数量丰富。目标是学习能够很好迁移到下游任务的特征，而完全不需要人工标注。

- **对比学习**训练模型识别：同一图像的两个增强视图（“正样本对”）应该具有相似的表示，而不同图像的视图（“负样本对”）应该具有不相似的表示。

- **SimCLR**（Chen 等，2020）为批次中的每张图像创建两个增强视图，用共享的骨干网络 + 投影头编码两者，并使用 **NT-Xent 损失**（归一化温度缩放交叉熵）：

$$\ell_{i,j} = -\log \frac{\exp(\text{sim}(z_i, z_j) / \tau)}{\sum_{k \neq i} \exp(\text{sim}(z_i, z_k) / \tau)}$$

- 其中 $\text{sim}$ 是余弦相似度（第 01 章），$\tau$ 是温度参数。分子把正样本对推近，分母把负样本对推远。SimCLR 需要很大的批次（4,096+），以提供足够的负样本。

- **MoCo**（Momentum Contrast，动量对比，He 等，2020）通过维护一个负 embedding 的**动量更新队列**，解决了大批次要求。查询编码器通过梯度下降更新；键编码器是查询编码器的指数移动平均（EMA，第 04 章）：$\theta_k \leftarrow m \theta_k + (1 - m) \theta_q$，其中 $m = 0.999$。队列保存近期的键 embedding，在不需要超大批次的情况下提供大量且一致的负样本。

- **BYOL**（Bootstrap Your Own Latent，自举潜在表示，Grill 等，2020）完全去除了负样本对。它使用两个网络：“在线”网络和“目标”网络（在线网络的 EMA）。在线网络预测另一个增强视图在目标网络中的表示。没有负样本时，BYOL 通过预测头的不对称性和 EMA 目标网络避免坍缩问题（即模型对所有输入都输出同一个向量）。

- **DINO**（Self-Distillation with No Labels，无标签自蒸馏，Caron 等，2021）把自蒸馏应用于 ViT。学生网络在不同增强视图之间预测教师网络（学生网络的 EMA）的输出。教师使用更大的裁剪区域，学生使用更小的裁剪区域。DINO 产生的特征包含明确的场景布局信息：经过 DINO 训练的 ViT，其自注意力图无需任何分割监督就会自然地分割对象。

- **掩码图像建模**是 BERT 掩码语言建模的视觉对应物（第 07 章）。输入图像块中有很大一部分被掩码，模型学习重建它们。

- **MAE**（Masked Autoencoders，掩码自编码器，He 等，2022）遮住 75% 的图像块，并训练一个 ViT 编码器—解码器来重建缺失的像素值。编码器只处理未被掩码的图像块（预训练时节省 4 倍计算），轻量级解码器则根据编码后的可见图像块和可学习的掩码 token 重建完整图像。

- **BEiT**（BERT Pre-training of Image Transformers，图像 Transformer 的 BERT 预训练，Bao 等，2022）遮住图像块，并预测离散视觉 token（从预训练的 dVAE 分词器得到），而不是原始像素。这与 BERT 预测离散词 token 相呼应，也避免了像素重建中的低级细节。

- **图像生成**旨在生成训练集中不存在的全新、逼真图像。核心挑战是对自然图像的高维概率分布建模。

- **生成对抗网络（GAN）**（Goodfellow 等，2014）使用两个相互竞争的网络：从随机噪声创建假图像的**生成器** $G$，以及试图区分真实图像和假图像的**判别器** $D$。两者通过对抗方式训练：$G$ 试图欺骗 $D$，而 $D$ 试图识破 $G$。

$$\min_G \max_D \; \mathbb{E}_{x \sim p_{\text{data}}}[\log D(x)] + \mathbb{E}_{z \sim p(z)}[\log(1 - D(G(z)))]$$

- 生成器接收随机潜向量 $z$（从高斯分布等简单分布中采样），通过一系列转置卷积将其映射为图像。判别器是一个标准 CNN 分类器。在均衡状态下，$G$ 生成的图像无法与真实数据区分，而 $D$ 对所有输入都输出 0.5。

- **模式坍缩**是 GAN 的主要失败模式：生成器学会只生成少数几类能够欺骗判别器的图像，忽视训练数据的多样性。生成器找到一小组“安全”输出，而不是覆盖完整分布。

- 稳定 GAN 训练的技巧包括：谱归一化（约束判别器的 Lipschitz 常数）、渐进式增长（先在低分辨率上训练，再逐渐提高）、特征匹配（匹配判别器中间特征的统计信息，而非最终输出）以及使用 Wasserstein 距离替代原始的 JS 散度目标。

- **StyleGAN**（Karras 等，2019）是高质量图像合成领域最有影响力的 GAN 架构。它的关键创新是**基于风格的生成器**：不把潜向量 $z$ 直接输入生成器，而是先通过一个**映射网络**（8 层 MLP）将其映射为风格向量 $w$。这个风格向量通过**自适应实例归一化（AdaIN）**注入生成器的每一层，调节特征图的统计量：

$$\text{AdaIN}(x, y) = y_{s} \cdot \frac{x - \mu(x)}{\sigma(x)} + y_{b}$$

- 其中 $y_s$ 和 $y_b$ 是从 $w$ 导出的缩放和偏置。不同层控制不同方面：早期层控制粗粒度特征（姿态、脸型），中间层控制中等粒度特征（发型、眼睛），后期层控制细节（雀斑、头发纹理）。StyleGAN 能在 1024×1024 分辨率下生成逼真的人脸。

- **变分自编码器（VAE）**（第 06 章）提供了另一种生成方法。与 GAN 不同，VAE 具有严谨的概率框架和明确的训练目标（ELBO）。它生成的图像往往比 GAN 更模糊，但潜空间更平滑、结构更好。VAE 是潜空间扩散模型中的编码器—解码器对，用于把图像压缩到潜空间以及从潜空间还原图像。

- **扩散模型**已经成为图像生成的主流范式，在质量和多样性上都超过了 GAN。其思想很简单：逐渐向数据添加噪声，直到数据变成纯高斯噪声（**前向过程**），然后逐步学习逆转这个过程（**反向过程**）。

- **前向过程**在 $T$ 个时间步中加入高斯噪声：

$$q(x_t | x_{t-1}) = \mathcal{N}(x_t; \sqrt{1 - \beta_t} \, x_{t-1}, \beta_t I)$$

- 其中 $\beta_t$ 是随时间增加的噪声调度。经过足够多步后，无论原始图像 $x_0$ 是什么，$x_T$ 都近似为纯高斯噪声。使用重参数化技巧（第 06 章），并设 $\alpha_t = 1 - \beta_t$、$\bar{\alpha}_t = \prod_{s=1}^{t} \alpha_s$，就可以直接从 $x_0$ 采样 $x_t$：

$$x_t = \sqrt{\bar{\alpha}_t} \, x_0 + \sqrt{1 - \bar{\alpha}_t} \, \epsilon, \quad \epsilon \sim \mathcal{N}(0, I)$$

- **反向过程**学习去噪：从纯噪声 $x_T$ 开始，模型预测每一步加入的噪声 $\epsilon$，并减去它来恢复 $x_{t-1}$。这个过程由神经网络 $\epsilon_\theta$ 参数化（通常是 U-Net，第 03 篇），并使用简单的 MSE 损失训练：

$$\mathcal{L} = \mathbb{E}_{t, x_0, \epsilon}\left[\|\epsilon - \epsilon_\theta(x_t, t)\|^2\right]$$

![扩散的前向与反向过程：干净图像在前向过程中经过 T 步逐渐被噪声破坏，神经网络学习反转每一步，并在反向过程中从纯噪声生成干净图像](../images/diffusion_process.svg)

- **DDPM**（Denoising Diffusion Probabilistic Models，去噪扩散概率模型，Ho 等，2020）建立了这一框架。采样需要遍历全部 $T$ 步（通常为 1,000 步），速度很慢。**DDIM**（Denoising Diffusion Implicit Models，去噪扩散隐式模型，Song 等，2021）把采样过程重新表述为确定性映射，从而允许大步跳过时间步（例如用 50 步代替 1,000 步），且质量损失很小。

- **基于分数的模型**（Song 与 Ermon，2019）提供了另一种视角。模型不预测噪声 $\epsilon$，而是估计**分数函数** $\nabla_{x_t} \log p(x_t)$，即相对于带噪图像的对数概率梯度。这个梯度指向数据分布中概率更高（更干净）的区域。采样使用 Langevin 动力学沿着该梯度进行。基于分数的模型与 DDPM 在**随机微分方程（SDE）**框架中统一：前向过程是加入噪声的 SDE，反向过程是时间反转后的 SDE。

- **无分类器引导**（Ho 与 Salimans，2022）控制样本质量与多样性之间的权衡。模型同时进行有条件训练（使用文本提示或类别标签）和无条件训练（随机丢弃条件）。采样时，预测是以下加权组合：

$$\hat{\epsilon} = \epsilon_\theta(x_t, \varnothing) + s \cdot (\epsilon_\theta(x_t, c) - \epsilon_\theta(x_t, \varnothing))$$

- 其中 $c$ 是条件，$\varnothing$ 是空条件，$s > 1$ 是引导尺度。更大的 $s$ 会生成与条件匹配更强、但多样性更低的图像。$s = 1$ 对应无引导模型；$s = 7.5$ 是常见默认值。

- **潜空间扩散**（Rombach 等，2022；Stable Diffusion）把扩散过程从像素空间移到学习到的潜空间。预训练 VAE 编码器把图像压缩成低维潜表示（通常在空间上缩小 4 倍或 8 倍），扩散在这个压缩空间中进行，VAE 解码器再从去噪后的潜变量重建像素。这会显著提高效率：在像素空间扩散一张 512×512 图像，需要处理 $512 \times 512 \times 3$ 的张量；在潜空间中只需要处理 $64 \times 64 \times 4$ 的张量。

- 潜空间扩散中的去噪 U-Net 接收带噪潜变量、时间步（编码为正弦 embedding，类似 Transformer 中的位置编码）和条件信号（来自冻结的 CLIP 或 T5 文本编码器的文本 embedding）。文本条件通过 U-Net 内的交叉注意力层进入：文本 embedding 充当键和值，图像特征充当查询。这样模型就能在每个空间位置关注文本提示中相关的部分。

- **流匹配**是扩散的一种新兴替代方案。它学习噪声与数据之间的直接传输路径，而不是 DDPM 的迭代去噪过程。

- **连续归一化流（CNF）**定义了一个依赖时间的速度场 $v_\theta(x, t)$，沿着平滑轨迹把样本从简单分布 $p_0$（噪声）推向数据分布 $p_1$。这个变换遵循常微分方程（ODE）：

$$\frac{dx}{dt} = v_\theta(x, t), \quad t \in [0, 1]$$

- 从 $x_0 \sim \mathcal{N}(0, I)$ 开始，向前积分 ODE 到 $t = 1$，就会产生一个来自数据分布的样本。速度场由神经网络参数化，并训练为匹配目标条件流。

- **最优传输（OT）**流匹配（Lipman 等，2023）使用噪声与数据之间的直线路径作为目标流：从噪声样本 $x_0$ 到数据样本 $x_1$ 的条件路径就是 $x_t = (1 - t) x_0 + t x_1$，目标速度为 $v = x_1 - x_0$。训练损失变为：

$$\mathcal{L} = \mathbb{E}_{t, x_0, x_1} \left[\|v_\theta(x_t, t) - (x_1 - x_0)\|^2\right]$$

- **整流流**（Liu 等，2022）通过迭代逐渐拉直所学习的流路径。初次训练后，使用模型通过模拟 ODE 生成（噪声、数据）对。由于这些配对比随机配对更对齐，因此用它们重新训练模型。重复这一过程会产生越来越直的路径，可以用更少的 ODE 步数（甚至一步）遍历，从而实现极快的生成。

- 与扩散相比，流匹配有几个优点：训练目标更简单（直接回归速度，不需要噪声调度），采样 ODE 更平滑（需要更少的积分步数），而且与最优传输的连接提供了理论基础。Stable Diffusion 3 和 Flux 使用流匹配，而不是传统 DDPM。

## 编程任务（使用 CoLab 或 notebook）

1. 从零实现 ViT 的图像块 embedding。将图像切分为图像块、展平、投影到模型维度、添加位置 embedding，并在开头添加 [CLS] token。
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

2. 实现一个简单的 GAN 训练循环。在二维数据上训练生成器和判别器，并可视化生成分布向真实分布收敛的过程。
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

3. 实现扩散前向过程：在不断增加的时间步中向图像添加噪声，并可视化逐步破坏的过程。然后实现一步去噪。
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
