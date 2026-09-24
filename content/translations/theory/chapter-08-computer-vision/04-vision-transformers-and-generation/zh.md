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
# 视觉变换器与生成

*视觉变换器通过自注意力处理图像块，挑战CNN主导地位，利用数据驱动的空间学习。本文件涵盖了ViT、DeiT、Swin变换器、使用GAN（StyleGAN）进行图像生成、VAEs和扩散模型（DDPM、Stable Diffusion），以及超分辨率和神经风格转换等技术。*

- CNNs (文件 02)构建了强大的空间诱导偏见：局部连接性、权重共享和平移不变性。视觉变换器（ViTs）提出了一个引人注目的问题：如果我们完全放弃这些偏见，让模型从数据中学习空间结构，仅使用第6章介绍的注意力机制呢？

- **视觉变换器 (ViT)** (Dosovitskiy et al., 2021)直接将标准Transformer编码器应用于图像。关键思想是将图像视为一系列非重叠块，就像NLP处理文本时一样，将其视为序列标记。

- 过程如下：
    1. 将图像 (高度 $H$, 宽度 $W$, 颜色 $C$) 分割成一个非重叠的网格，大小为 $P \times P$。这产生了 $N = HW / P^2$ 块。
    2. 将每个块展平为长度为 $P^2 \cdot C$ 的向量，并通过学习线性嵌入（单个矩阵乘法，第2章）将其投影到模型维度 $D$。
    3. 在前面添加一个可学习的 **[CLS] 块** 嵌入（类似于BERT的 [CLS]，第7章）。这个块向所有块进行注意力，并且其最终表示用于分类。
    4. 添加 **位置嵌入**（每个位置一个可学习向量），以提供空间信息，因为注意力是置换不变性的。
    5. 将包含 $(N + 1)$ 块嵌入的序列通过标准Transformer编码器（多头自注意力 + FFN，第6章）传递。
    6. [CLS] 块的最终表示通过分类头（一个小MLP）传递。

![图像分割成16x16块，每个块扁平化并线性投影，[CLS]标记添加，位置嵌入添加后，通过Transformer编码器块处理。](../images/vit_pipeline.svg)


- **块嵌入**等同于使用大小为 $P$ 和步长为 $P$ 的卷积核将2D图像转换为1D序列，然后用与语言相同的架构进行处理。

- ViT的诱导偏见较少于CNNs：它不强制执行局部连接性或平移不变性。这意味着它需要更多的训练数据来从零开始学习空间结构。在小数据集上，ViT不如CNN好。但当在非常大的数据集上进行训练（JFT-300M, 300百万图像）时，ViT与最好的CNNs匹配或超过它们，表明CNN的诱导偏见对于提高数据效率是有帮助的，但对于最终性能是不必要的。

- ViT的自注意力在块的数量上为 $O(N^2)$。对于一个224x224图像，使用16x16块，有 $N = 196$ 块，这 manageable。但对于更高分辨率的图像或较小的块，二次成本变得不可接受。

- **DeiT**（数据高效图像变换器，Touvron等人，2021年）表明，在仅使用ImageNet的情况下，ViT可以有效地进行训练（不需要大规模的JFT数据集），通过强的数据增强、正则化（随机深度、标签平滑、丢弃）和**知识蒸馏**：一个预先训练的CNN教师提供软标签，ViT学生学习匹配这些标签。DeiT在[CLS]标记旁边添加了一个**蒸馏令牌**，并训练它预测教师的输出。

- 深度卷积神经网络（DNN）的特征提取能力有限，而ViT在处理大规模图像时存在计算复杂度高和缺乏层次化特征的问题。为了解决这些问题，Swin Transformer（Liu et al., 2021）提出了一个基于滑动窗口的注意力机制，显著降低了计算复杂度，并且能够生成多层次的特征图，满足检测和分割的需求。

- Swin 引入了 **局部窗口**：而不是全局自注意力覆盖所有补丁，注意力在局部窗口（例如 7x7 补片）中计算。这使得成本线性与图像大小成正比：$O(N)$ 而不是 $O(N^2)$。但单独的局部窗口会阻止区域之间的信息流动。

- **窗口滑动**解决了这个问题：在交替层中，窗口分区向后移动了窗口大小的一半。这创建了跨窗口连接，允许图像的各个部分之间通过所有层的信息流动，而不需要全局注意力的成本。

![Swin Transformer：层 l 在常规窗口内计算注意力，层 l+1 将窗口分区向右移动一半，创建交叉窗口连接](../images/swin_shifted_windows.svg)


- Swin通过在不同阶段合并patches来构建一个层次结构。在每个阶段之后，相邻的2x2 patches会被连接并投影到通道维度翻倍且空间分辨率减半。这产生了类似于CNNs和FPN（文件03）中多尺度特征图的特征图，使得Swin可以直接与检测头如Faster R-CNN和分割头如U-Net兼容。

- PVT（金字塔视觉变换器）采用类似的空间降采样注意力的分层方法：在每个阶段，键和值都会进行空间降采样后再计算注意力，从而降低了二次成本同时保持全局可接受的视场。

- 自监督视觉学习从无标签图像中训练表示。收集标签成本高昂，但图像资源丰富。目标是通过不依赖任何人类标注来学习能够良好迁移下游任务的特征。

- 对比学习训练模型识别两个相同图像的增强视图（“正对配对”）应该具有相似表示，而不同图像的视图（“负对配对”）应该具有不同的表示。

- SimCLR（陈等人，2020）为每个图像批次创建两个增强视图，使用共享骨干和投影头对两者进行编码，并应用 **NT-Xent损失**（归一化温度缩放交叉熵）。

$$\ell_{i,j} = -\log \frac{\exp(\text{sim}(z_i, z_j) / \tau)}{\sum_{k \neq i} \exp(\text{sim}(z_i, z_k) / \tau)}$$
- where $\text{sim}$ is cosine similarity (chapter 01) and $\tau$ is a temperature parameter. The numerator pushes positive pairs together; the denominator pushes negative pairs apart. SimCLR requires large batch sizes (4,096+) to provide enough negatives.

- **MoCo** (Momentum contrast, He et al., 2020) solves the large-batch requirement by maintaining a **momentum-updated queue** of negative embeddings. The query encoder is updated by gradient descent; the key encoder is updated as an exponential moving average (EMA, chapter 04) of the query encoder: $\theta_k \leftarrow m \theta_k + (1 - m) \theta_q$, with $m = 0.999$. The queue stores recent key embeddings, providing a large and consistent set of negatives without needing huge batches.

- **BYOL** (Bootstrap Your Own Latent, Grill et al., 2020) eliminates negative pairs entirely. It uses two networks: an "online" network and a "target" network (EMA of the online). The online network predicts the target network's representation of a different augmented view. Without negatives, BYOL avoids the collapse problem (where the model outputs the same vector for everything) through the asymmetry of the predictor head and the EMA target.

- **DINO** (Self-Distillation with No Labels, Caron et al., 2021) applies self-distillation to ViT. A student network predicts the output of a teacher network (EMA of the student) across different augmented views. The teacher uses larger crops; the student uses smaller crops. DINO produces features that contain explicit information about the scene layout: the self-attention maps of DINO-trained viTs naturally segment objects without any segmentation supervision.

- 掩码图像建模是BERT的遮蔽语言模型（第07章）的视觉类比。输入区域中的大部分被遮挡，模型学习重建它们。

- **MAE**（掩码自编码器，He et al., 2022）遮盖75%的patches，并训练一个ViT编码器-解码器来重建缺失像素值。只有未遮盖的patches被处理为编码器（在预训练期间节省4倍计算），而轻量级解码器从编码可见patches和可学习掩码令牌中重建完整的图像。

- **BEiT** (BERT预训练图像变换器，Bao et al., 2022) 隐藏补丁并预测离散视觉标记（从预先训练的dVAE标记器获得），而不是原始像素。这与BERT预测离散词标记的方式相似，并避免了低级细节的像素重建。

- **图像生成**旨在产生新的、现实istic的图像，这些图像在训练集中不存在。核心挑战是建模自然图像高维概率分布。

- 生成对抗网络（GANs）（Goodfellow et al., 2014）使用两个竞争的网络：一个**生成器**$G$，它从随机噪声中创建假图像；另一个**判别器**$D$试图区分真实图像和假图像。它们通过对抗训练进行训练：$G$试图欺骗$D$，而$D$试图抓住$G$。

$$\min_G \max_D \; \mathbb{E}_{x \sim p_{\text{data}}}[\log D(x)] + \mathbb{E}_{z \sim p(z)}[\log(1 - D(G(z)))]$$
- 生成器接收一个随机的潜在向量 $z$（从简单分布如高斯中采样），通过一系列转置卷积将其映射到图像。判别器是一个标准的 CNN 分类器。在平衡状态下， $G$ 产生与真实数据几乎无法区分的图像，而 $D$ 对所有输入输出 0.5。

- **模式崩溃**是生成对抗网络（GAN）的主要失败模式：生成器学习只产生少数类型的图像来欺骗判别器，而忽视了训练数据的多样性。生成器找到了一小部分“安全”输出而不是覆盖整个分布。

- GAN训练技巧包括：谱归一化（限制判别器的拉普拉斯常数），渐进增长（先在低分辨率下训练，然后逐渐增加），特征匹配（匹配中间判别器特征的统计信息而不是最终输出），以及使用Wasserstein距离代替原始JS散度目标。

- **StyleGAN**（Karras et al., 2019）是高质量图像合成中最 influential的 GAN 架构。它的关键创新是 **风格化生成器**：而不是直接将 $z$ 输入到生成器中，它首先通过一个 8 层 MLP 映射网络（mapping network）产生一个风格向量 $w$。这个风格向量被注入到生成器的每一层中，通过 **自适应实例归一化（AdaIN）** 来调整特征图统计信息：

$$\text{AdaIN}(x, y) = y_{s} \cdot \frac{x - \mu(x)}{\sigma(x)} + y_{b}$$
- $y_s$和$y_b$是通过$w$计算得出的缩放和偏移量。不同的层控制不同的方面：早期层控制粗略特征（姿态、脸型），中层控制中等特征（发型、眼睛），晚期层控制精细细节（雀斑、头发纹理）。StyleGAN可以在1024x1024分辨率下生成逼真的面部图像。

- **变分自编码器（VAEs）**（第06章）提供了一种替代生成方法。与GANs不同，VAEs具有一个有原则的概率框架，并且有一个明确的训练目标（ELBO）。它们倾向于产生模糊的图像，但提供了更平滑、结构化的潜在空间。VAE是用于在和从潜在空间中压缩图像的编码器-解码器对，这些模型被用作潜流扩散模型的一部分。

- **扩散模型**已成为图像生成的主导范式，超越了GANs在质量和多样性方面。概念上很简单：逐渐向数据中添加噪声，直到它变成纯高斯噪声（**前向过程**），然后逐步学习逆过程（**后向过程**）。

- **前向过程**在$T$个时间步长内添加高斯噪声：

$$q(x_t | x_{t-1}) = \mathcal{N}(x_t; \sqrt{1 - \beta_t} \, x_{t-1}, \beta_t I)$$
- 其中$\beta_t$是随着时间增加的噪声调度表。经过足够多的时间步后，$x_T$大约接近纯高斯噪声，无论原始图像$x_0$如何。使用重参数化技巧（第06章）和设置$\alpha_t = 1 - \beta_t$、$\bar{\alpha}_t = \prod_{s=1}^{t} \alpha_s$，我们可以直接从$x_0$中采样$x_t$：

$$x_t = \sqrt{\bar{\alpha}_t} \, x_0 + \sqrt{1 - \bar{\alpha}_t} \, \epsilon, \quad \epsilon \sim \mathcal{N}(0, I)$$
- **后向过程**学习去噪：从纯噪声$x_T$开始，模型预测每个步骤添加的噪声$\epsilon$，并将其减去以恢复$x_{t-1}$。这由一个神经网络$\epsilon_\theta$（通常是一个U-Net，来自文件03）通过简单的MSE损失训练：

$$\mathcal{L} = \mathbb{E}_{t, x_0, \epsilon}\left[\|\epsilon - \epsilon_\theta(x_t, t)\|^2\right]$$
![扩散前向和后向过程：干净图像逐渐被噪声污染，经过 T 步（前向），神经网络学习每个步骤的逆操作（后向），从纯噪声开始生成干净图像](../images/diffusion_process.svg)


- **DDPM**（噪声扩散概率模型，Ho等人，2020年）建立了这个框架。采样需要通过迭代所有 $T$ 步骤（通常为 1,000），这非常慢。**DDIM**（噪声扩散隐式模型，Song等人，2021年）将采样过程重新表述为一个确定性的映射，允许大步跳过（例如，50 步而不是 1,000 步）而几乎没有质量损失。

- **基于评分的模型**（Song和Ermon，2019）提供了一个不同的视角。而不是预测噪声 $\epsilon$，模型估计评分函数 $\nabla_{x_t} \log p(x_t)$，这是对带噪声图像的对数概率关于噪声的梯度。这个梯度指向数据分布中更高概率（更干净）区域的方向。采样使用 Langevin动力学遵循这个梯度。基于评分的模型和 DDPM 在 **随机微分方程 (SDEs)** 的框架下统一：前向过程是添加噪声的 SDE，后向过程是时间反转的 SDE。

- **无指导分类**（Ho和Salimans，2022）在样本质量与多样性之间进行权衡。模型既条件训练（使用文本提示或类别标签），又无条件训练（随机丢弃条件）。在采样时，预测是一个加权组合：

$$\hat{\epsilon} = \epsilon_\theta(x_t, \varnothing) + s \cdot (\epsilon_\theta(x_t, c) - \epsilon_\theta(x_t, \varnothing))$$
- 在何处 $c$ 是条件。 $\varnothing$ 是空条件，且 $s > 1$ 是指导尺度。更高 $s$ 生成的图像更符合条件，但多样性较少。 $s = 1$ 提供无指导模型 $s = 7.5$ 是默认设置。

- **潜在扩散**（Rombach et al., 2022; Stable Diffusion）将扩散过程从像素空间转移到一个学习的潜在空间。预训练的VAE编码器将图像压缩到一个较低维度的潜在表示（通常为4x或8x的空间下采样），扩散在该压缩空间中进行，而VAE解码器从去噪后的潜在重建像素。这非常高效：在像素空间扩散512x512图像意味着处理$512 \times 512 \times 3$张量，但在潜在空间中仅需处理$64 \times 64 \times 4$张量。

- 无噪扩散的U-Net接收带有噪声的潜变量、时间步（编码为正弦嵌入，类似于Transformer中的位置编码）和条件信号（来自冻结的CLIP或T5文本编码器）。文本条件通过U-Net内的交叉注意力层进入：文本嵌入作为键和值，图像特征作为查询。这使得模型在每个空间位置都能关注到与文本提示相关的部分。

- **噪声到数据的直接传输路径学习** 是一种新兴的替代方法，而不是像 DDPM 那样进行迭代去噪。

- **连续正则化流（CNF）** 定义了一个随时间变化的速度场 $v_\theta(x, t)$，它将噪声分布 $p_0$ 推动到数据分布 $p_1$ 上，沿着平滑轨迹。变换遵循普通微分方程（ODE）。

$$\frac{dx}{dt} = v_\theta(x, t), \quad t \in [0, 1]$$
- 从 $x_0 \sim \mathcal{N}(0, I)$ 开始，通过正向积分 ODE 到 $t = 1$ 产生一个数据分布的样本。速度场由神经网络参数化，并训练以匹配目标条件流。

- **最优运输**（OT）流匹配（Lipman et al., 2023）使用噪声和数据之间的直线路径作为目标流：噪声样本 $x_0$ 到数据样本 $x_1$ 的条件路径简单地是 $x_t = (1 - t) x_0 + t x_1$，目标速度是 $v = x_1 - x_0$。训练损失变为：

$$\mathcal{L} = \mathbb{E}_{t, x_0, x_1} \left[\|v_\theta(x_t, t) - (x_1 - x_0)\|^2\right]$$
- **修正流**（Liu et al., 2022）通过迭代地纠正学习到的流路径来实现。在初始训练阶段后，模型用于生成（噪声、数据）对，通过模拟ODE来实现。这些对比随机配对更紧密的对被用来重新训练模型。重复这个过程会产生越来越直的路径，可以使用较少的ODE步骤（甚至单步），从而实现极其快速的生成。

- 流匹配相对于扩散具有几个优势：训练目标更简单（直接速度回归，没有噪声调度），采样 ODE 更平滑（需要较少的积分步骤），并且与最优传输理论提供了理论基础。 Stable Diffusion 3 和 Flux 使用流匹配而不是传统的 DDPM。

## 编程任务（使用 Colab 或笔记本）

1. 实现从头开始的ViT patch嵌入。将图像分割成patches，扁平化它们，投影到模型维度，添加位置嵌入，并在前面加上[CLS]标记。
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

2. 实现一个简单的GAN训练循环。在2D数据上训练生成器和判别器，并可视化生成的分布收敛到真实分布。
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

3. 实现扩散前向过程：在增加的时间步长上给图像添加噪声，并可视化渐进性的污染。然后实现一个单个去噪步骤。
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
