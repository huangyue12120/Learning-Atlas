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
# 卷积网络

*卷积网络利用局部连接和权重共享从图像中学习层次化特征。本篇介绍卷积、池化、感受野、架构选择、迁移学习和 Grad-CAM 可解释性。*


* 革命神经网络直接从像素数据中学习空间特征分级,用梯度优化的滤波器来取代手工设计的滤波器. 此文件涵盖自旋力学,集合,出步,放大,可接受字段,以及定义图像分类的地标建筑(LeNet, AlexNet, VGG, ResNet, Inception, 高效率网络). *

- 在文件01中,我们手工设计的过滤器用于边缘检测,模糊化,和角检测. 自然的问题是:我们能否从数据中学习到最佳的过滤器? 这正是卷积神经网络(CNNs)所做的.

- CNN不是通过手工选择滤波器的权重,而是通过梯度下降来学习(第06章),发现直接对手头的任务有用的特性.

- 在"06章"中,我们介绍了"革命"行动,CNN基础知识,以及过滤学习的想法. 我们更深入地研究了建筑创新, 使CNN成为十多年来计算机视觉中的主要范例。

- 回顾核心**革命行动**:过滤器$K$大小变化$k \times k$在输入特性图上滑动,在每个位置计算出一个点产品(第06章)。输出大小由三个超参数控制:

    - **Stride**:过滤器在位置间移动多少像素. Stride 1指滤波器一次移动一像素. Stride 2表示它会转移出两个像素,将空间维度减半. 拼接地卷积是集中进行下采样的替代方法.
    - ** Padding**:在输入边框上加上零。"同"作活贴.$p = \lfloor k/2 \rfloor$保持空间维度。"瓦利德"贴纸($p = 0$)减少它们.
    - ** 编号**:插入过滤元素之间的间隙。3x3滤波器有Dilation 2,覆盖了只使用9个参数的5x5可接受域. 分化的卷积在不增加计算的情况下扩展了可接受字段.

- 卷积后输出空间大小 :

$$\text{out} = \left\lfloor \frac{\text{in} - k + 2p}{s} \right\rfloor + 1$$

- 地点$\text{in}$是输入大小,$k$是内核大小,$p$正在铺设,$s$脚步。此公式独立地适用于高度和宽度.

- 神经元的**受体场**是原始输入能影响其价值的区域.
    - 早期地层有小的可接受地段(它们看到边缘等局部地型).
    - 更深层有更大的可接受字段(它们看到更大的结构如物体部分).

- 接受的字段随每一层而增长:大致由$k - 1$每个相位层的像素(更需要步入或拓扑).

![受体场生长于多层间: 第1层神经元见3x3补丁, 第2层神经元见5x5补丁, 第3层神经元见7x7补丁原输入.](../images/receptive_field.svg)

- ** Pooling**地层减少空间尺寸,同时保留最重要的信息。
    - **Max Collection**在每个窗口中取出最大值,保留最强活性(最突出的特征).
    - **Average Collection**取平分,平分地物映射. 2x2的相距相距相距相距相距相距相距相距相距相距相距相距相径相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相距相

- ** 全球平均聚合(GAP)** 将每个信道的整个空间范围平均为一数,产生一个长度等于信道数的向量。GAP取代了许多现代建筑末端的全相通层,大幅地减少了参数计数并起到结构正则器的作用.

- ** 批量正常化(BatchNorm)** 每个小批量中的活性化以零平均值和单位差分,然后应用可学习的尺度和班次(第06章). 在有线电视新闻网中,BatchNorm按频道进行应用:统计是按批量计算,每个频道的空间尺寸独立计算。它稳定培训,允许高等教育率,并起到轻微的常客作用。

- ** Dropout**(第06章)在训练时随机地将神经元零出.

- 在有线电视新闻网中,**空间退位**(Dropout2D)将整个地物映射通道而不是单个像素降下,这更有效,因为地物映射中的相邻像素高度相关.

- **数据增强** 通过在训练期间对每个图像进行随机变换,人工地扩展了所设置的训练:水平翻转,随机收成,旋转,色彩快活(调整亮度,对比度,饱和度,修饰)和剪接(抹出随机长方形补丁). 网络以许多不同的形式看待每个图像,迫使它学习变相-不变量特征而不是记忆出特定的像素图案.

- 高级增强策略包括**混合**(将两个图像及其标签混合:$\tilde{x} = \lambda x_i + (1-\lambda) x_j$, $\tilde{y} = \lambda y_i + (1-\lambda) y_j$),**CutMix**(将一个长方形的补丁从一幅图像粘贴到另一幅图像上并按面积比例混合标签),和**RandAugment**(随机抽样从固定集中抽取一个带单一强度参数的增强序列).

- CNN架构的历史是一个逐渐更深入,效率更高的设计的故事,每个设计都解决了一个限制其前身的问题.

- ** LeNet-5**(LeCun等人,1998年)是CNN的原作,设计为手写数字识别. 两层相接,三层相接 平均集合和Tunh激活 它证明了所学的滤波器比手设计的特性表现得更好,但按现代标准(60K参数)它很小.

- ** AlexNet**(Krizhevsky等,2012年)以一分之差赢得了ImageNet的比赛,引发了深刻的学习革命. 关键创新:再LU激活(而不是Tanh,它有消亡的梯度),取消规范化、数据增强和关于GPU的培训。5个卷积地层,3个全相通地层,6000万个参数.

- ** VGG**(Simonyan和Zisserman,2014年)表明,仅使用3x3堆放的过滤器深度比更大的过滤器效果更好. 两个堆叠的3x3过滤器具有与一个5x5过滤器相同的可接受字段,但参数较少($2 \times 3^2 = 18$数字$5^2 = 25$)和额外的非线性. VGG-16 (16层)和VGG-19 (19层)仍然被广泛用作特征提取器. 建筑结构非常简单:各有不断增长的通道(64,128,256,512)的分块,每条后是最大集合.

![VGG架构:堆放有增加通道深度的3x3凸起区块(64_128_256_512),最大区块之间汇合,以全连接地层为结束.](../images/vgg_architecture.svg)

- **GoogleNet/Inception**(Szegedy等,2014年)引入了**Inception模块**:不选择单一的滤波器大小,而是平行地使用1x1,3x3和5x5的分解来压缩其输出,让网络决定哪个比例表最有用. 1x1分解被用做在更大的滤波器之前的瓶颈来减少计算. GoogleNet比VGG更精准,减少了12个参数(6.8M对138M).

![入门模块:四个平行分支(1×1,3×3,5×5和集合),有1×1瓶颈,沿通道维相接.](../images/inception_module.svg)

- Inception模块同时捕获多个尺度的特征. 1x1滤波器能捕捉输出点的图案,3x3能捕捉出局部的纹理,而5x5能捕捉出更大的结构. 协和会将所有观点融合为丰富的代表性.

- **ResNet**(He等,2016年)解决了**降解问题**:深度网络的表现比更浅的要差,不是因为过于适应,而是因为它们更难于优化. 溶液是**skip连接**(剩余连接):

$$\text{output} = F(x) + x$$

- 层层会学习残存$F(x) = \text{output} - x$。。。如果优化的转变接近身份(这在深层网络中很常见),学习近零的剩余比学习完整的地圖要容易得多. 跳过连接也提供直接梯度高速公路,减少已消失的梯度. ResNet训练的网络有152个层,比以前任何一层都深.

![ResNet块:输入x通过两个凸起层生成F(x),然后跳转连接会再添加x回放,给输出F(x)+x](../images/resnet_block.svg)

- 当输入和输出的维度不同(由于速度或信道变化)时,** 预测快捷键** 将 1x1 缩进应用到$x$以匹配尺寸 :$\text{output} = F(x) + W_s x$.

- **bottleneck块**(被使用于ResNet-50和更深)使用三个回旋:一是减少通道;三是空间处理;一是扩大回旋通道. 这比两个3x3的卷积更便宜,并允许更深的网络.

- ** DenseNet** (Huang等, 2017)将跳过连接的想法取而代之:每层在密集区块内与后层相接. 层$l$接收来自前几层的特征图作为输入:$x_l = H_l([x_0, x_1, \ldots, x_{l-1}])$,在其中$[\cdot]$表示沿着通道维度的调和。这鼓励特征再利用,加强梯度流,并减少参数总数.

![DenseNet 稠密块:每层都通过接合方式接收所有上层的地物图,为最大地物再利用创造密集的连接](../images/densenet_block.svg)

- ** 有效架构** 在移动设备和边缘硬件上的目标部署,其中计算、内存和能量受到限制。

- ** MobileNet**(Howard等,2017年)用** 深度可分解的相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相
    1. ** 深度卷积**:适用单一$k \times k$每个输入通道过滤器(无跨通道交互)
    2. ** 抽出**:采用1x1的分出法将信息综合到不同渠道。

- 一个标准$k \times k$与$C_{\text{in}}$输入通道和$C_{\text{out}}$输出通道费用$k^2 \cdot C_{\text{in}} \cdot C_{\text{out}}$乘法每相相位. 深度可分化的相接成本$k^2 \cdot C_{\text{in}} + C_{\text{in}} \cdot C_{\text{out}}$,大约减少$k^2$时间。对于一个3x3滤波器来说,这大约是9x更便宜的.

![深度可分解分解分解分解:深度可分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解分解](../images/depthwise_separable_conv.svg)

- **MobileNet-V2**引入了**倒置后残块**:以1x1的回旋来扩展通道,在扩大的空间中应用深度回旋,再以1x1回旋来投放回旋. 跳过连接被放入窄(bottleneck)层上,倒置ResNet模式. 扩张率一般为6.

- **EfficientNet**(Tan和Le,2019年)引入了**compond缩放**:而不是只缩放深度,只宽度,或只独立解析度,而是使用固定比例来将所有三个维相加. 以缩放系数为准$\phi$:

$$\text{depth}: d = \alpha^\phi, \quad \text{width}: w = \beta^\phi, \quad \text{resolution}: r = \gamma^\phi$$

- 须遵守$\alpha \cdot \beta^2 \cdot \gamma^2 \approx 2$(因此,计算总数大约是每单位增加一倍)$\phi$) (中文(简体)). 查找网格$\alpha = 1.2$, $\beta = 1.1$, $\gamma = 1.15$作为基线比率。通过B7实现高效Net-B0逐步升级,以比以往模型少得多的参数和FLOP达到最先进的精度.

![高效网络复合缩放:仅缩放宽度、深度或分辨率与所有三个比例并用单一系数 −](../images/efficientnet_scaling.svg)

- **ShuffleNet**通过使用**群变**后再用**道打乱**来降低1x1回旋(在MobileNet风格建筑中占主导地位)的成本. 集团化将渠道分解为集团,并在每个集团内部独立地进行分化,但这阻碍了跨集团的信息流. 洗牌行动在各组之间重新安排了渠道,以可忽略不计的成本恢复了信息混合.

- ** 转让学习** 是采用一个经过一项任务培训的模型,并把它适应不同的任务。在计算机视觉中,这几乎总是意味着从一个在ImageNet上预先训练的模型(140万个图像,1000个类)开始,并适应特定域数据集(医疗图像,卫星图像,制造缺陷等).

- ** 特征提取**:冻结所有分层,去掉最终的分类头部,并只在上部训练出一副新的头部. 被冻结的地层充当了一般特征提取器. 当目标域类似于ImageNet,而目标数据集也很小时,这效果很好.

- **精调**:解冻部分或全部入会地层并进行训练,学习率小. 被预先训练的重量作为起点而不是固定特征。精细调整一般从仅解冻后层开始(它能捕捉高层次,任务特定特征),也可以选择解冻更早的地层.

- 转移学习之所以有用,是因为CNN的早期地层会学习跨任务有用的通用地物(尖端,纹理,颜色),而后期地层则会学习特定任务地物. 训练有素的动物分类网络仍有有用的边缘探测器,可用于建筑物的分类。

- ** 视觉CNN** 揭示了网络学到了什么,并帮助调试出意料之外的行为。

- ** 活动图**(地貌图)显示每个过滤器对某一输入图像的输出。早期地层活化看起来像边缘地图;更深地层产生越来越抽象,空间粗糙活化.

- ** Grad-CAM**(Gradient-quented Class Activation Magazine, Selvaraju等, 2017)突出显示输入图像中对于模型预测最重要的区域. 其作用者为:
    1. 计算目标类分数相对于上个卷积层特征图的梯度(使用从第03章起的链条规则)
    2. 全球平均值将这些梯度组合起来,以获得每个频道的重要性权重
    3. 计算特征图的加权组合和应用ReLU

$$L_{\text{Grad-CAM}} = \text{ReLU}\!\left(\sum_k \alpha_k A^k\right), \quad \alpha_k = \frac{1}{Z} \sum_i \sum_j \frac{\partial y^c}{\partial A^k_{ij}}$$

- 地点$A^k$是那个$k$-第一张地图$\alpha_k$是频道的重要重量$k$,以及$y^c$是类的分数$c$。。。结果是粗糙的加热图显示哪个区域推动了分类。ReLU之所以被应用,是因为我们对对阶级有积极影响的特征感兴趣.

![渐变-CAM:狗的输入图像,从上个凸起层的特征图,梯度加权组合,以及由此产生的热映射在原始图像上突出狗的脸.](../images/grad_cam.svg)

- ** Feature inversion**通过优化随机图像来从它的特性表示中重建出一个输入图像来匹配目标特性(在像素值上使用梯度回落). 这揭示了网络在每个层次上保留的信息. 早期地层重建出近乎完美的图像;更深地地层产生可识别但被扭曲的图像,显示细微的空间细节被丢失而语义内容被保存.

- **"深梦"**和"神经风格传入"**是特色可视化的创造性应用. 深梦将神经元在所选层的活化最大化,以产生超现实,图案被放大的图像. 神经风格转移选择一个目标图像,以匹配一个图像的内容特征(从深层)和另一个图像的风格特征(滤波器活化的奶奶矩阵,它捕捉出纹理统计).

## 编程任务（使用 Colab 或 notebook）



1. 在JAX中从零开始执行简单的CNN,带有两个分层,最大集合和一个分类头. 以合成2D图案分类任务对其进行训练.
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

2. 可视化不同滤波器大小如何影响可接受字段. 显示两个堆叠的3x3滤镜覆盖与一个5x5滤镜相同的可接受字段,但参数较少.
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

3. 从零开始执行 Grad-CAM。鉴于一个预建的简单的CNN,计算特定类的梯度加权活化图,并视同为热映射.
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

4. 比较深度可与标准可分化相融合. 计算两者的参数和FLOP,并显示它们产生的类似输出远不如计算.
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
