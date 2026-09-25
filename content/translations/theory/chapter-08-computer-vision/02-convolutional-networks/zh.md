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

*卷积神经网络直接从像素数据中学习空间特征层级，用梯度优化的滤波器取代手工设计的滤波器。本文介绍卷积、池化、步长、膨胀、感受野，以及 LeNet、AlexNet、VGG、ResNet、Inception、EfficientNet 等定义图像分类发展的经典架构。*

- 第 01 篇中，我们手工设计滤波器来检测边缘、模糊图像和寻找角点。自然会想到：能不能从数据中学出合适的滤波器？这正是卷积神经网络（CNN）要做的事。

- CNN 不再手工设定滤波器权重，而是通过梯度下降（第 06 章）学习权重，从数据中找到对当前任务有用的特征。

- 第 06 章介绍了卷积、CNN 基础和滤波器学习。本篇进一步讨论让 CNN 在十多年间成为计算机视觉主流架构的设计创新。

- 回顾核心的**卷积操作**：大小为 $k\times k$ 的滤波器 $K$ 在输入特征图上滑动，并在每个位置计算点积（第 06 章）。输出尺寸由三个超参数决定：

    - **步长**：滤波器每次移动的像素数。步长为 1 时，每次移动一个像素；步长为 2 时，每次移动两个像素，通常会使空间尺寸减半。步长卷积也可替代池化进行下采样。
    - **填充**：在输入边缘补零。“Same” 填充（$p=\lfloor k/2\rfloor$）可在步长为 1、核大小为奇数时保持空间尺寸不变；“Valid” 填充（$p=0$）不补零，通常会缩小输出尺寸。
    - **膨胀**：在滤波器元素之间插入间隔。膨胀率为 2 的 $3\times3$ 滤波器覆盖 $5\times5$ 的区域，但仍只有 9 个参数。膨胀卷积无需增加参数或计算量，就能扩大感受野。

- 卷积后的输出空间尺寸为：

$$\text{out} = \left\lfloor \frac{\text{in} - k + 2p}{s} \right\rfloor + 1$$
- 其中，$\text{in}$ 是输入尺寸，$k$ 是卷积核大小，$p$ 是填充量，$s$ 是步长。高度和宽度分别套用这个公式。

- 一个神经元的**感受野**是原始输入中能够影响该神经元数值的区域。
    - 浅层的感受野较小，主要检测边缘等局部模式。
    - 深层的感受野较大，能够检测物体部件等更大结构。

- 感受野会随网络加深而扩大。普通卷积下，每增加一层大约扩大 $k-1$ 个像素；步长和膨胀还会进一步扩大感受野。

![网络逐层扩大感受野：第 1 层看到原图中的 3×3 区域，第 2 层看到 5×5 区域，第 3 层看到 7×7 区域](../images/receptive_field.svg)


- **池化层**缩小空间尺寸，同时保留较重要的信息。
    - **最大池化**取每个窗口中的最大值，保留最强的激活，也就是最显著的特征。
    - **平均池化**取窗口均值，使特征图更平滑。步长为 2 的 $2\times2$ 池化会将高和宽都减半。

- **全局平均池化**（GAP）对每个通道的整个空间区域求平均，输出一个长度等于通道数的向量。许多现代架构用 GAP 替代末端的全连接层，从而大幅减少参数，并形成结构性正则化。

- **批量归一化**（BatchNorm；第 06 章）在每个小批量内将激活值标准化为均值 0、方差 1，再应用可学习的缩放和平移。在 CNN 中，BatchNorm 按通道计算统计量，统计范围包括批次和空间维度。它能稳定训练、支持更高的学习率，也有轻微的正则化作用。

- **Dropout**（第 06 章）在训练期间随机将部分神经元的输出置零。

- 在 CNN 中，**空间 Dropout**（Dropout2D）会随机丢弃整个特征图通道，而不是单个像素。由于特征图中相邻像素高度相关，这种做法更有效。

- **数据增强**在训练时随机变换图像，以扩充训练集。常见方法包括水平翻转、随机裁剪、旋转、颜色抖动（调整亮度、对比度、饱和度和色相），以及 Cutout（随机遮挡矩形区域）。同一图像会以多种形式出现，促使网络学习对变换稳健的特征，而不是记住特定像素模式。

- 进阶的数据增强方法包括 **Mixup**（按比例混合两张图像及其标签：$\tilde{x}=\lambda x_i+(1-\lambda)x_j$，$\tilde{y}=\lambda y_i+(1-\lambda)y_j$）、**CutMix**（将一张图像的矩形区域粘贴到另一张图像上，并按面积比例混合标签），以及 **RandAugment**（从固定增强集合中随机抽取一系列变换，只需设置一个强度参数）。

- CNN 架构不断向更深、更高效的方向发展，每种新设计都解决了前代架构遇到的限制。

- **LeNet-5**（LeCun 等，1998）是最早的 CNN，专为手写数字识别设计。它包含两个卷积层和三个全连接层，使用平均池化和 tanh 激活函数。LeNet-5 证明了学习得到的滤波器可以胜过手工设计的特征，但按现代标准看，它很小，只有 6 万个参数。

- **AlexNet**（Krizhevsky 等，2012）以明显优势赢得 ImageNet 竞赛，推动了深度学习的发展。它的关键创新包括使用 ReLU 激活函数（取代容易遇到梯度消失的 tanh）、用 Dropout 正则化、进行数据增强，以及使用 GPU 训练。AlexNet 有 5 个卷积层、3 个全连接层和 6000 万个参数。

- **VGG**（Simonyan 和 Zisserman，2014）表明，深层堆叠 $3\times3$ 滤波器比直接使用较大滤波器效果更好。两个连续的 $3\times3$ 滤波器与一个 $5\times5$ 滤波器具有相同的感受野，但参数更少（$2\times3^2=18$，而 $5^2=25$），还多出一次非线性变换。VGG-16 和 VGG-19 分别有 16 层和 19 层，至今仍常用作特征提取器。其结构简单：卷积块的通道数逐步增加（64、128、256、512），每个卷积块后接最大池化。

![VGG 架构：堆叠 3×3 卷积块，通道数逐渐增加（64→128→256→512），卷积块之间使用最大池化，末端接全连接层](../images/vgg_architecture.svg)


- **GoogLeNet/Inception**（Szegedy 等，2014）引入了 **Inception 模块**。它不只选择一种滤波器尺寸，而是并行使用 $1\times1$、$3\times3$ 和 $5\times5$ 卷积，再拼接各分支的输出，让网络利用不同尺度的信息。较大的卷积前会使用 $1\times1$ 卷积作瓶颈，以减少计算量。GoogLeNet 的准确率高于 VGG，参数量却只有 VGG 的约十二分之一（680 万对 1.38 亿）。

![Inception 模块：四个并行分支（1×1、3×3、5×5 卷积和池化），先用 1×1 卷积作瓶颈，再沿通道维度拼接输出](../images/inception_module.svg)


- Inception 模块能同时捕捉多个尺度的特征：$1\times1$ 滤波器检测逐点模式，$3\times3$ 滤波器提取局部纹理，$5\times5$ 滤波器捕捉较大的结构。拼接不同尺度的结果后，网络得到更丰富的表示。

- **ResNet**（He 等，2016）解决了**退化问题**：更深的网络反而比浅层网络表现差，原因并非过拟合，而是优化更困难。ResNet 使用**跳跃连接**（残差连接）：

$$\text{output} = F(x) + x$$
- 卷积层只需学习残差 $F(x)=\text{output}-x$。如果最优变换接近恒等映射（这在深层网络中很常见），学习接近零的残差比直接学习完整映射容易得多。跳跃连接还为梯度提供直接通路，减轻梯度消失。ResNet 将网络加深到 152 层，远超此前的架构。

![ResNet 残差块：输入 x 经过两个卷积层得到 F(x)，再通过跳跃连接加回 x，输出 F(x)+x](../images/resnet_block.svg)


- 如果步长或通道数变化导致输入、输出维度不同，就用 $1\times1$ 卷积构造**投影捷径**，把 $x$ 映射到匹配的尺寸：$\text{output}=F(x)+W_sx$。

- **瓶颈块**用于 ResNet-50 及更深的网络，包含三个卷积：先用 $1\times1$ 卷积减少通道数，再用 $3\times3$ 卷积处理空间信息，最后用 $1\times1$ 卷积恢复通道数。这比使用两个 $3\times3$ 卷积更省计算，因此可以构建更深的网络。

- **DenseNet**（Huang 等，2017）进一步扩展了跳跃连接：在每个密集块中，每一层都连接到其后的所有层。第 $l$ 层将之前所有层的特征图作为输入：$x_l=H_l([x_0,x_1,\ldots,x_{l-1}])$，其中 $[\cdot]$ 表示沿通道维度拼接。这样能复用特征、加强梯度传递，并减少参数总量。

![DenseNet 密集块：每一层都沿通道维度拼接此前所有层的特征图作为输入，从而充分复用特征](../images/densenet_block.svg)


- **高效架构**面向移动设备和边缘硬件部署。这些设备的计算能力、内存和能耗都受到限制。

- **MobileNet**（Howard 等，2017）用**深度可分离卷积**取代标准卷积，将运算分成两步：
    1. **逐通道卷积**：为每个输入通道分别应用一个 $k\times k$ 滤波器，不混合通道信息。
    2. **逐点卷积**：用 $1\times1$ 卷积混合不同通道的信息。

- 标准 $k\times k$ 卷积在每个空间位置需要 $k^2 C_{\text{in}} C_{\text{out}}$ 次乘法。深度可分离卷积只需 $k^2 C_{\text{in}}+C_{\text{in}}C_{\text{out}}$ 次，计算量大约减少到原来的 $1/k^2$。使用 $3\times3$ 滤波器时，计算量约少 9 倍。

![深度可分离卷积：逐通道步骤为每个通道应用一个 k×k 滤波器，再用逐点 1×1 卷积混合通道；输出形状不变，运算量约减少 9 倍](../images/depthwise_separable_conv.svg)


- **MobileNet-V2** 引入了**倒残差块**：先用 $1\times1$ 卷积扩展通道数，再在扩展后的表示上执行逐通道卷积，最后用另一个 $1\times1$ 卷积投影回较窄的通道空间。跳跃连接位于窄的瓶颈层上，与 ResNet 的模式相反。通道扩展倍率通常为 6。

- **EfficientNet**（Tan 和 Le，2019）提出了**复合缩放**：不再只单独增加网络深度、宽度或图像分辨率，而是按固定比例同时缩放三个维度。给定缩放系数 $\phi$：

$$\text{depth}: d = \alpha^\phi, \quad \text{width}: w = \beta^\phi, \quad \text{resolution}: r = \gamma^\phi$$
- 同时满足 $\alpha\cdot\beta^2\cdot\gamma^2\approx2$，使 $\phi$ 每增加 1，计算量大约翻倍。通过网格搜索得到的基准比例为 $\alpha=1.2$、$\beta=1.1$、$\gamma=1.15$。EfficientNet-B0 到 B7 逐步扩大规模，以更少的参数和 FLOPs 达到当时最先进的准确率。

![EfficientNet 复合缩放：对比单独缩放宽度、深度或分辨率，以及用同一系数同时缩放三个维度](../images/efficientnet_scaling.svg)


- **ShuffleNet**使用**分组卷积**和**通道重排**降低 $1\times1$ 卷积的成本，这类卷积在 MobileNet 风格的架构中占用较多计算。分组卷积把通道拆成多个组，各组独立卷积，但会阻断组间的信息流动。通道重排以极低成本重新排列各组通道，恢复组间的信息混合。

- **迁移学习**是将一个任务上训练的模型迁移到另一任务。在计算机视觉中，常见做法是从 ImageNet（140 万张图像、1000 个类别）上预训练的模型出发，再适配医学影像、卫星图像或工业缺陷等领域的数据集。

- **特征提取**：冻结所有卷积层，移除最后的分类头，再训练一个新的分类头。被冻结的卷积层充当通用特征提取器。当目标领域接近 ImageNet、目标数据集又较小时，这种方法效果较好。

- **微调**：解冻部分或全部卷积层，并用较小的学习率继续训练。预训练权重此时作为初始化，而非固定特征。微调通常先解冻靠后的层，因为它们提取高层、任务相关的特征；也可以视情况解冻更早的层。

- 迁移学习之所以有效，是因为 CNN 的浅层会学习边缘、纹理和颜色等通用特征，深层则学习任务相关特征。即使网络原本用于动物分类，其中的边缘检测器仍可用于识别建筑物。

- **可视化 CNN**可以揭示网络学到了什么，并帮助排查异常行为。

- **激活图**（特征图）显示输入图像经过每个滤波器后的输出。浅层激活图常呈现边缘；越深的层，激活越抽象，空间分辨率也越粗略。

- **Grad-CAM**（梯度加权类激活映射；Selvaraju 等，2017）突出显示对模型预测最重要的图像区域。计算步骤如下：
    1. 用第 03 章介绍的链式法则，计算目标类别分数相对于最后一个卷积层特征图的梯度。
    2. 对梯度作全局平均池化，得到每个通道的重要性权重。
    3. 按权重组合特征图，再应用 ReLU。

$$L_{\text{Grad-CAM}} = \text{ReLU}\!\left(\sum_k \alpha_k A^k\right), \quad \alpha_k = \frac{1}{Z} \sum_i \sum_j \frac{\partial y^c}{\partial A^k_{ij}}$$
- 其中，$A^k$ 是第 $k$ 个特征图，$\alpha_k$ 是通道 $k$ 的重要性权重，$y^c$ 是类别 $c$ 的分数。计算结果是一张较粗略的热力图，显示图像中哪些区域推动了该分类。这里使用 ReLU，是因为我们关注对类别分数产生正向影响的特征。

![Grad-CAM 示意图：输入狗的图像、最后一个卷积层的特征图、梯度加权组合，以及叠加在原图上并突出狗脸的热力图](../images/grad_cam.svg)


- **特征反演**通过优化一张随机图像的像素值，使它匹配目标特征，从而根据特征表示重建输入图像。这可以揭示网络在各层保留的信息。浅层特征通常能重建出接近原样的图像；深层特征重建出的图像仍可辨认，却会发生扭曲，表明精细空间细节已经丢失，而语义信息仍被保留。

- **Deep Dream**和**神经风格迁移**是特征可视化的创意应用。Deep Dream 会最大化指定层中神经元的激活，生成超现实、纹理夸张的图像。神经风格迁移则优化目标图像：让它的内容特征匹配一张图像的深层特征，同时让它的风格特征匹配另一张图像的纹理统计。纹理统计通常用滤波器激活的 Gram 矩阵表示。

## 编程任务（使用 Colab 或笔记本）

1. 用 JAX 从头实现一个简单的卷积神经网络（CNN），包含两个卷积层、最大池化层和分类头，并在合成的二维模式分类任务上训练。
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

2. 可视化滤波器大小对感受野的影响。展示两个串联的 3×3 滤波器与一个 5×5 滤波器具有相同的感受野，但参数更少。
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

3. 从头实现 Grad-CAM：给定一个预先构建的简单 CNN，计算特定类别的梯度加权激活图，并将其显示为热图。
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

> 注：这段示例计算的是预测值对输入图像的梯度，并未计算目标类别分数对卷积特征图的梯度，因此不属于标准 Grad-CAM；模型也只有一个输出，无法选择不同类别。

4. 比较深度可分离卷积与标准卷积。分别统计参数量和 FLOPs，并展示深度可分离卷积在计算量大幅减少的同时，能产生相近的输出。
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

> 注：此示例中的两组权重独立随机初始化，代码只输出张量形状，没有比较数值；因此无法验证两种卷积的输出是否相近。
