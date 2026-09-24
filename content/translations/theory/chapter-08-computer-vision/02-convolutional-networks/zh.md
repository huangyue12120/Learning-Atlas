---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 08 - computer vision/02. convolutional networks.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: c9cebd550f7ae07752313d826a880553087c4fa03fd94b4129efcac76825908f
status: reviewed
---
# 卷积神经网络

*卷积神经网络直接从像素数据中学习空间特征，取代了手动设计的滤波器。本文件涵盖了卷积机制、池化、步长、膨胀、 receptive field和地标架构（LeNet、AlexNet、VGG、ResNet、Inception、EfficientNet）等定义图像分类的模型。*

- 在文件 01 中，我们手动设计了边缘检测、模糊和角检测的滤波器。自然的问题是：我们可以从数据中学习最优滤波器吗？这就是卷积神经网络（CNNs）所做的。

- 不再选择手动设置滤波器权重，而是通过梯度下降（第 06 章）来学习它们。CNN 发现直接对任务有用的特征。

- 在第 06 章中，我们介绍了卷积操作、CNN 基本知识以及滤波器学习的概念。在这里，我们将深入探讨那些使 CNN 成为计算机视觉领域主导范式超过十年的架构创新。

- 回想核心的**卷积操作**：一个大小为 $k \times k$ 的滤波器 $K$ 在输入特征图上滑动，计算每个位置的点积（第 06 章）。输出尺寸由三个超参数控制。

    - **步长**：滤波器在位置之间移动的像素数。步长为1意味着滤波器每次只移动一个像素。步长为2意味着它每次移动两个像素，从而减半空间维度。滑动卷积是一种替代池化进行降采样的方法。
    - **填充**：在输入边界周围添加零。"相同"填充（$p = \lfloor k/2 \rfloor$）保留空间维度。"有效"填充（$p = 0$）减少它们。
    - **膨胀**：在滤波器元素之间插入间隙。一个3x3的过滤器，使用扩张率为2时，仅覆盖5x5的接收场，但只需9个参数。膨胀卷积通过扩大接收场而不增加计算。

- 卷积后的输出空间大小：

$$\text{out} = \left\lfloor \frac{\text{in} - k + 2p}{s} \right\rfloor + 1$$
- $\text{in}$ 是输入大小，$k$ 是卷积核大小，$p$ 是填充，$s$ 是步长。这个公式在高度和宽度上独立应用。

- **神经元的接受场**是能够影响其值的原始输入区域。
    - 早期层具有较小的接受场（它们看到局部模式，如边缘）。
    - 深层层具有较大的接受场（它们看到更大的结构，如物体部分）。

- 接受场随着每一层的增长：大约每层增加 $k - 1$ 像素（更多使用步长或膨胀）。

![神经元在不同层中看到的 receptive场逐渐增大：第 1 层神经元看到一个 3x3 的区域，第 2 层神经元看到一个 5x5 的区域，第 3 层神经元看到一个 7x7 的区域，这是原始输入的一部分](../images/receptive_field.svg)


- **池化层**通过减少空间维度来保留最重要的信息。
    - **最大池化**在每个窗口中取最大值，保留最强激活（最突出的特征）。
    - **平均池化**取平均值，平滑特征图。一个2x2池子，步长为2，将两个空间维度都减半。

- 全局平均池化（GAP）将每个通道的整个空间范围平均成一个数字，产生与通道数量相同的向量。GAP 替代了许多现代架构中结束部分的全连接层，大大减少了参数数量，并作为结构正则化器发挥作用。

- **批量归一化（BatchNorm）** 在每个 mini-batch内对激活进行归一化，使其均值为零、方差为一，并应用可学习的缩放和偏移量（第 6 章）。在 CNNs 中，批量归一化是按通道应用的：统计信息在 batch 和空间维度上独立地计算每个通道。它有助于稳定训练过程，允许更高的学习率，并作为轻微的正则化器发挥作用。

- **Dropout**（第 6 章）随机零化神经元在训练期间。

- 在CNN中，**空间丢弃**（Dropout2D）会随机丢弃整个特征图通道而不是单个像素，这更有效，因为相邻的特征图像素高度相关。

- 数据增强通过在训练过程中对每个图像应用随机变换来 artificially扩大训练集：水平翻转、随机裁剪、旋转、色彩抖动（调整亮度、对比度、饱和度和色调）以及遮挡（掩码随机矩形区域）。网络看到每个图像以多种形式出现，迫使它学习不变的变换特征而不是记忆特定像素模式。

- 高级增强策略包括 **混合拼接**（将两张图像和它们的标签混合：$\tilde{x} = \lambda x_i + (1-\lambda) x_j$，$\tilde{y} = \lambda y_i + (1-\lambda) y_j$）， **剪切拼接**（从一个图像中随机剪切出一块矩形区域并将其粘贴到另一个图像上，并按面积比例混合标签），以及 **随机增强**（从固定的一组增强策略中随机采样一个序列，并使用单一强度参数）。

- CNN架构的历史是一部逐步深入、更高效的设计故事，每个设计都解决了其 predecessors所限制的问题。

- **LeNet-5** (LeCun et al., 1998) 是第一个CNN，专为手写数字识别而设计。它由两个卷积层 followed by三个全连接层组成，使用平均池化和tanh激活。它证明了学习滤波器优于手工设计的特征，但它的参数量很小（60K）。

- **AlexNet**（Krizhevsky et al., 2012）凭借巨大的优势赢得了ImageNet竞赛，引发了深度学习革命。关键创新：使用ReLU激活函数（而不是tanh，后者存在梯度消失问题），dropout用于正则化，数据增强以及在GPU上进行训练。5个卷积层，3个全连接层，6000万参数。

- **VGG**（Simonyan and Zisserman，2014）表明使用仅3x3滤波器堆叠深度更好，比较大的滤波器效果更好。两个堆叠的3x3滤波器具有与一个5x5滤波器相同的可接收场，但参数更少（$2 \times 3^2 = 18$ vs $5^2 = 25$），并且多了一个非线性。VGG-16（16层）和VGG-19（19层）仍然是广泛使用的特征提取器。架构非常简单：增加通道的卷积块，每个后面跟着最大池化。

![VGG 架构：堆叠的 3x3 卷积块，通道深度逐渐增加（64→128→256→512），在块之间使用最大池化，最后是全连接层](../images/vgg_architecture.svg)


- **GoogLeNet/Inception** (Szegedy et al., 2014) 引入了 **Inception 模块**：而不是选择单一的滤波器大小，使用 1x1、3x3 和 5x5 并行卷积，将它们的输出相加，并让网络决定哪个尺度最有效。1x1 卷积用于在较大滤波器之前作为瓶颈来减少计算。GoogLeNet 在参数数量上比 VGG 更少（6.8M vs 138M）。

![Inception 模块：四个平行分支（1×1、3×3、5×5 和池化），带有 1×1 的瓶颈，沿着通道维度进行拼接](../images/inception_module.svg)


- Inception 模块同时捕捉多个尺度的特征。1x1 滤波器捕捉点模式，3x3 滤波器捕捉局部纹理，5x5 滑动窗口捕捉更大结构。将所有视角组合在一起形成了一个丰富的表示。

- ResNet（He等人，2016）解决了退化问题：深度网络的性能不如浅层网络，不是因为过拟合，而是因为优化起来更难。解决方案是跳连接（残差连接）：

$$\text{output} = F(x) + x$$
- 这一层学习了残差 $F(x) = \text{output} - x$。如果最优变换接近身份（在深度网络中很常见），学习一个近于零的残差比学习完整的映射要容易得多。跳连接还提供了一条直接的梯度高速公路，减少了消失梯度的问题。ResNet训练的网络有152层，远远超过了之前任何东西。

![ResNet 块：输入 x 经过两个卷积层生成 F(x)，然后跳连连接将 x 加回，得到输出 F(x) + x](../images/resnet_block.svg)


- 当输入和输出维度不同（由于步长或通道变化），应用一个1x1卷积作为**投影捷径**。 $x$ 匹配尺寸： $\text{output} = F(x) + W_s x$当然，请提供您需要翻译的英文文本。

- **瓶颈块**（在ResNet-50和更深的网络中使用）包含三个卷积：1x1用于减少通道，3x3用于空间处理，再用1x1将通道恢复。这比两个3x3卷积更便宜，并且允许构建更深的网络。

- **DenseNet**（黄等人，2017）进一步发展了跳连接的概念：每个层都与后续的层在密集块中相连。$l$从所有先前层接收特征图作为输入：$x_l = H_l([x_0, x_1, \ldots, x_{l-1}])$，其中$[\cdot]$表示沿通道维度进行拼接。这促进了特征重用、加强了梯度流动，并减少了总参数数。

![DenseNet 段：每个层通过通道维度的拼接接收来自所有 preceding 层的特征图，创建了最大特征重用的最大连接性](../images/densenet_block.svg)


- **高效架构**旨在部署在移动设备和边缘硬件上，这些设备的计算、内存和能源都受到限制。

- **MobileNet** (Howard et al., 2017) 替换标准卷积为 **深度可分离卷积**，将操作分解为两个步骤：
    1. **深度卷积**：对每个输入通道应用单个 $k \times k$ 过滤器（无交叉通道交互）
    2. **点卷积**：对通道进行 1x1 卷积以结合信息

- 一个标准的 $k \times k$ 卷积，输入通道数为 $C_{\text{in}}$，输出通道数为 $C_{\text{out}}$，每像素需要 $k^2 \cdot C_{\text{in}} \cdot C_{\text{out}}$ 次乘法。深度可分离卷积只需 $k^2 \cdot C_{\text{in}} + C_{\text{in}} \cdot C_{\text{out}}$ 次，大约减少了 $k^2$ 倍。对于 3x3 过滤器，这大约便宜了 9 倍

![深度可分离卷积：深度步应用一个 k×k 的过滤器 per 个通道，然后点wise 1×1 卷积混合通道——相同的输出形状，大约少 9 倍的操作数](../images/depthwise_separable_conv.svg)


- **MobileNet-V2** 引入了 **倒残差块**：通过一个 1x1 卷积将通道数扩大，然后在扩大的空间内应用深度可分卷积，最后通过另一个 1x1 卷积将通道数缩小。跳连接放在窄（瓶颈）层上，与 ResNet 模式相反。扩展比通常为 6。

- **EfficientNet**（Tan和Le，2019）引入了**复合缩放**：不再独立地对深度、宽度或分辨率进行缩放，而是通过固定比值将所有三个维度一起缩放。给定一个缩放系数 $\phi$:

$$\text{depth}: d = \alpha^\phi, \quad \text{width}: w = \beta^\phi, \quad \text{resolution}: r = \gamma^\phi$$
- subject to $\alpha \cdot \beta^2 \cdot \gamma^2 \approx 2$ (so that total computation roughly doubles per unit increase in $\phi$). A grid search finds $\alpha = 1.2$, $\beta = 1.1$, $\gamma = 1.15$ as the baseline ratios. EfficientNet-B0 through B7 scale up progressively, achieving 状态-of-the-art accuracy with far fewer parameters and FLOPs than previous models.

![EfficientNet 组合缩放：单独缩放宽度、深度或分辨率，或者同时缩放所有三个，使用一个系数 φ](../images/efficientnet_scaling.svg)


- **ShuffleNet** reduces the cost of 1x1 convolutions (which dominate in MobileNet-style architectures) by using **group convolutions** followed by a **channel shuffle**. Group convolutions split channels into groups and convolve within each group independently, but this prevents cross-group information flow. The shuffle operation rearranges channels between groups, restoring the information mixing at negligible cost.

- **迁移学习** 是将一个在一种任务上训练过的模型适应到另一种任务的实践。在计算机视觉中，这通常意味着从预训练在 ImageNet（1.4百万张图像，1,000类）上的模型开始，并适应特定领域的数据集（医学影像、卫星影像、制造缺陷等）。

- **特征提取**：冻结所有卷积层，移除最终的分类头，并仅训练顶部的新头。冻结的层充当通用特征提取器。这种方法在目标域与 ImageNet 相似且目标数据集较小时效果较好。

- **微调**：解冻一些或全部卷积层并使用小的学习率进行训练。预训练的权重作为起始点而不是固定特征。微调通常从解冻较后的层（捕获高阶、任务特定特征）开始，有时也解冻较早的层。

- 迁移学习之所以有效，是因为 CNN 的早期层通过边缘、纹理和颜色等通用特征学习了有用的功能，而后期层则学习了任务特定的功能。一个训练为动物分类的网络仍然具有识别建筑物的边缘检测器。

- **可视化CNNs** 可以揭示网络已经学习到什么，并帮助调试意外行为。

- 激活图（特征图）显示每个滤波器对给定输入图像的输出。早期层的激活图看起来像边缘图；更深的层产生越来越抽象、空间上越来越粗略的激活。

- **Grad-CAM**（梯度加权类别激活映射，Selvaraju 等人，2017）强调了模型预测最相关的输入图像区域。它通过：
    1. 使用第3章中的链式法则计算目标类分数相对于最后卷积层特征图的梯度
    2. 对这些梯度进行全局平均池化以获取每通道的重要性权重
    3. 将特征图按加权组合并应用ReLU

$$L_{\text{Grad-CAM}} = \text{ReLU}\!\left(\sum_k \alpha_k A^k\right), \quad \alpha_k = \frac{1}{Z} \sum_i \sum_j \frac{\partial y^c}{\partial A^k_{ij}}$$
- $A^k$是第$k$个特征图，$\alpha_k$是通道$k$的重要性权重，$y^c$是类$c$的得分。结果是一个粗略的热力图，显示哪些区域驱动了分类。ReLU应用是因为我们对具有正影响的特征感兴趣。

![Grad-CAM：输入图像是一只狗，来自最后一个卷积层的特征图，梯度加权组合，以及生成的热图叠加在原始图像上，突出显示了狗的脸部](../images/grad_cam.svg)


- **特征反转**通过优化一个随机图像来匹配目标特征（使用像素值的梯度下降），从其特征表示重建输入图像。这揭示了网络在每个层中保留的信息。早期层可以重建接近完美的图像；深层层产生可识别但扭曲的图像，显示精细的空间细节丢失而语义内容被保留。

- **深度梦境**和**神经风格转换**是基于特征可视化进行的创意应用。深度梦境通过最大化选定层中神经元的激活来产生超现实、图案增强的图像。神经风格转换优化目标图像，使其内容特征（来自深层层）与另一个图像的内容特征匹配，并且纹理统计信息（通过滤波器激活的Gram矩阵捕获）与另一个图像的风格特征匹配。

## 编程任务（使用 Colab 或笔记本）

1. 实现一个简单的CNN从头开始在JAX中，包含两个卷积层、最大池化和分类头。然后在合成的二维模式分类任务上进行训练。
```python
import jax
import jax.numpy as jnp
import jax.lax as lax
import matplotlib.pyplot as plt

def conv2d(x, kernel, stride=1):
    """Simple 2D convolution for single input, single filter."""
    return lax.conv(x[None, None], kernel[None, None], (stride, stride), 'SAME')[0, 0]

def max_pool(x, size=2):
    """2x2 max pooling."""
    H, W = x.shape
    x = x[:H//size*size, :W//size*size]
    return x.reshape(H//size, size, W//size, size).max(axis=(1, 3))

def init_cnn(key):
    k1, k2, k3 = jax.random.split(key, 3)
    return {
        'conv1': jax.random.normal(k1, (5, 5)) * 0.3,
        'conv2': jax.random.normal(k2, (3, 3)) * 0.3,
        'fc_w': jax.random.normal(k3, (64, 1)) * 0.1,
        'fc_b': jnp.zeros(1),
    }

def forward_cnn(params, img):
    # Conv1 -> ReLU -> Pool
    h = jnp.maximum(0, conv2d(img, params['conv1']))
    h = max_pool(h)
    # Conv2 -> ReLU -> Pool
    h = jnp.maximum(0, conv2d(h, params['conv2']))
    h = max_pool(h)
    # Flatten and classify
    flat = h.ravel()
    # Pad or truncate to fixed size
    flat = jnp.pad(flat, (0, max(0, 64 - len(flat))))[:64]
    logit = (flat @ params['fc_w'] + params['fc_b']).squeeze()
    return jax.nn.sigmoid(logit)

# Generate synthetic data: class 0 = low-freq pattern, class 1 = high-freq
def make_data(key, n=200):
    images, labels = [], []
    for i in range(n):
        k1, key = jax.random.split(key)
        x, y = jnp.meshgrid(jnp.linspace(0, 4*jnp.pi, 32), jnp.linspace(0, 4*jnp.pi, 32))
        if i < n // 2:
            img = jnp.sin(x) + jax.random.normal(k1, (32, 32)) * 0.1
            labels.append(0)
        else:
            img = jnp.sin(4 * x) * jnp.sin(4 * y) + jax.random.normal(k1, (32, 32)) * 0.1
            labels.append(1)
        images.append(img)
    return images, jnp.array(labels, dtype=jnp.float32)

key = jax.random.PRNGKey(42)
images, labels = make_data(key)
params = init_cnn(jax.random.PRNGKey(0))

def loss_fn(params, img, label):
    pred = forward_cnn(params, img)
    return -(label * jnp.log(pred + 1e-7) + (1 - label) * jnp.log(1 - pred + 1e-7))

grad_fn = jax.grad(loss_fn)
lr = 0.01

for epoch in range(5):
    total_loss = 0.0
    for img, label in zip(images, labels):
        grads = grad_fn(params, img, label)
        params = {k: params[k] - lr * grads[k] for k in params}
        total_loss += loss_fn(params, img, label)
    print(f"Epoch {epoch}: loss = {total_loss / len(images):.4f}")

# Test accuracy
preds = jnp.array([forward_cnn(params, img) > 0.5 for img in images])
acc = jnp.mean(preds == labels)
print(f"Accuracy: {acc:.2%}")
```

2. 可视化不同滤波器大小如何影响 receptive场。显示两个堆叠的3x3滤波器覆盖相同的 receptive场，但参数更少。
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt

def compute_receptive_field(layers):
    """Compute receptive field size from a list of (kernel_size, stride) tuples."""
    rf = 1  # start with 1 pixel
    stride_product = 1
    for k, s in layers:
        rf += (k - 1) * stride_product
        stride_product *= s
    return rf

# Compare architectures
configs = {
    'Single 5x5': [(5, 1)],
    'Two 3x3':    [(3, 1), (3, 1)],
    'Three 3x3':  [(3, 1), (3, 1), (3, 1)],
    'Single 7x7': [(7, 1)],
    '3x3 stride 2 + 3x3': [(3, 2), (3, 1)],
}

print(f"{'Config':<25} {'RF':>4} {'Params (per channel)':>20}")
print('-' * 55)
for name, layers in configs.items():
    rf = compute_receptive_field(layers)
    # Parameters: sum of k^2 for each layer (per input-output channel pair)
    params = sum(k * k for k, s in layers)
    print(f"{name:<25} {rf:>4} {params:>20}")

# Visualise receptive fields
fig, axes = plt.subplots(1, 3, figsize=(14, 4))
for ax, (name, rf_size) in zip(axes, [('5x5 filter', 5), ('Two 3x3 filters', 5), ('Three 3x3 filters', 7)]):
    grid = jnp.zeros((9, 9))
    c = 4  # centre
    half = rf_size // 2
    grid = grid.at[c-half:c+half+1, c-half:c+half+1].set(1.0)
    ax.imshow(grid, cmap='Blues', vmin=0, vmax=1)
    ax.set_title(f'{name}\nRF = {rf_size}x{rf_size}')
    ax.set_xticks(range(9)); ax.set_yticks(range(9))
    ax.grid(True, alpha=0.3)
plt.suptitle('Receptive Field Comparison')
plt.tight_layout(); plt.show()
```

3. 从头开始实现Grad-CAM。给定一个预构建的简单CNN，计算特定类别的梯度加权激活图，并将其可视化为热图。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

def simple_cnn(params, img):
    """Simple CNN that returns both the prediction and last conv activations."""
    # Conv layer (our "last conv layer" for Grad-CAM)
    H, W = img.shape
    k = params['conv'].shape[0]
    pad = k // 2
    img_pad = jnp.pad(img, pad, mode='edge')
    activation_map = jnp.zeros((H, W))
    for i in range(H):
        for j in range(W):
            activation_map = activation_map.at[i, j].set(
                jnp.sum(img_pad[i:i+k, j:j+k] * params['conv'])
            )
    activation_map = jnp.maximum(0, activation_map)  # ReLU

    # Global average pool -> dense -> output
    pooled = activation_map.mean()
    logit = pooled * params['w'] + params['b']
    return jax.nn.sigmoid(logit), activation_map

# Create test image: bright region on the left (class indicator)
img = jnp.zeros((32, 32))
img = img.at[8:24, 4:16].set(1.0)
img = img.at[5:10, 20:28].set(0.3)

key = jax.random.PRNGKey(42)
params = {
    'conv': jax.random.normal(key, (5, 5)) * 0.3,
    'w': jnp.array(2.0),
    'b': jnp.array(-0.5),
}

# Compute Grad-CAM
def class_score(params, img):
    pred, _ = simple_cnn(params, img)
    return pred

# Get activation map and gradients
pred, act_map = simple_cnn(params, img)
grad_fn = jax.grad(lambda img: simple_cnn(params, img)[0])
img_grad = grad_fn(img)

# Weight = global average of gradients (simplified 1-channel Grad-CAM)
alpha = img_grad.mean()
grad_cam = jnp.maximum(0, alpha * act_map)  # ReLU
grad_cam = (grad_cam - grad_cam.min()) / (grad_cam.max() - grad_cam.min() + 1e-8)

fig, axes = plt.subplots(1, 3, figsize=(14, 4))
axes[0].imshow(img, cmap='gray'); axes[0].set_title('Input Image'); axes[0].axis('off')
axes[1].imshow(act_map, cmap='viridis'); axes[1].set_title('Activation Map'); axes[1].axis('off')
axes[2].imshow(img, cmap='gray', alpha=0.6)
axes[2].imshow(grad_cam, cmap='jet', alpha=0.4)
axes[2].set_title(f'Grad-CAM (pred={pred:.2f})'); axes[2].axis('off')
plt.tight_layout(); plt.show()
```

4. 比较深度可分离卷积与标准卷积。计数参数和FLOPs，显示两者在输出上相似，但计算更少。
```python
import jax
import jax.numpy as jnp

def standard_conv(x, kernel):
    """Standard convolution: (H, W, C_in) * (k, k, C_in, C_out) -> (H, W, C_out)."""
    H, W, C_in = x.shape
    k, _, _, C_out = kernel.shape
    pad = k // 2
    x_pad = jnp.pad(x, ((pad, pad), (pad, pad), (0, 0)), mode='constant')
    out = jnp.zeros((H, W, C_out))
    for i in range(H):
        for j in range(W):
            patch = x_pad[i:i+k, j:j+k, :]  # (k, k, C_in)
            for c in range(C_out):
                out = out.at[i, j, c].set(jnp.sum(patch * kernel[:, :, :, c]))
    return out

def depthwise_separable_conv(x, dw_kernel, pw_kernel):
    """Depthwise separable: depthwise (k,k,C_in) then pointwise (C_in, C_out)."""
    H, W, C_in = x.shape
    k = dw_kernel.shape[0]
    pad = k // 2
    x_pad = jnp.pad(x, ((pad, pad), (pad, pad), (0, 0)), mode='constant')

    # Depthwise: one filter per channel
    dw_out = jnp.zeros((H, W, C_in))
    for i in range(H):
        for j in range(W):
            for c in range(C_in):
                patch = x_pad[i:i+k, j:j+k, c]
                dw_out = dw_out.at[i, j, c].set(jnp.sum(patch * dw_kernel[:, :, c]))

    # Pointwise: 1x1 conv across channels
    out = dw_out @ pw_kernel
    return out

# Setup
H, W, C_in, C_out, k = 8, 8, 16, 32, 3
key = jax.random.PRNGKey(42)
k1, k2, k3, k4 = jax.random.split(key, 4)

x = jax.random.normal(k1, (H, W, C_in))
std_kernel = jax.random.normal(k2, (k, k, C_in, C_out)) * 0.1
dw_kernel = jax.random.normal(k3, (k, k, C_in)) * 0.1
pw_kernel = jax.random.normal(k4, (C_in, C_out)) * 0.1

# Compare
std_params = k * k * C_in * C_out
dw_params = k * k * C_in + C_in * C_out

std_flops = H * W * k * k * C_in * C_out
dw_flops = H * W * (k * k * C_in + C_in * C_out)

print(f"Standard conv:            {std_params:>8,} params,  {std_flops:>10,} FLOPs")
print(f"Depthwise separable conv: {dw_params:>8,} params,  {dw_flops:>10,} FLOPs")
print(f"Parameter reduction:      {std_params / dw_params:.1f}x")
print(f"FLOP reduction:           {std_flops / dw_flops:.1f}x")

std_out = standard_conv(x, std_kernel)
ds_out = depthwise_separable_conv(x, dw_kernel, pw_kernel)
print(f"\nStandard output shape:    {std_out.shape}")
print(f"Depthwise sep output shape: {ds_out.shape}")
```
