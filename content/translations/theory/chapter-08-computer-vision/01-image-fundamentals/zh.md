---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 08 - computer vision/01. image fundamentals.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 75cefbc6fa7af2546af419a0c4dac4e2c81b16220981a2fa0b07547e9efc1c56
status: reviewed
---
# 图像基础

*图像基础把像素、颜色、滤波和几何结构连接到计算机视觉工程。本篇覆盖 RGB/HSV 表示、直方图、卷积、边缘检测、平滑、对比度和角点等核心操作。*


*图像基本原理 解释数字图像是如何被代表,形成,并在任何模型看到之前进行预处理. 此文件覆盖了像素,色彩空间(RGB,HSV,YCbCr,LAB),针孔相机模型,曲折,边缘检测(Sobel,Canny),直方图,以及特征描述子(SIFT,ORB),低等视觉工具包. *

- **数字图像**是数字的2D网格. 网格中的每个单元格为**像素**(像素),其值代表强度或颜色. 灰度图像是单个2D矩阵,每个像素都持有亮度值,通常从0(黑色)到255(白色),用于8位图像.

- 一个颜色图像将它延伸至三个通道. 在**RGB**色彩空间中,每个像素存储了三个值:红色,绿色和蓝色强度.

- 被彩色图像为外形(高,宽,3)的3D张量. 以不同强度将这三个通道相混合,产生出完整可见色彩.

![颜色图像分解成其红色、绿色和蓝色通道,每个通道显示为灰度强度图](../images/rgb_channels.svg)

- ** Bit 深度** 确定每个信道能代表多少不同的强度水平。

- 8位图像有$2^8 = 256$每个信道, 给定$256^3 \approx 16.7$百万种可能的颜色。16位图像每道有65,536个级别,用于医学成像和HDR摄影中,精细的强度区分很重要.

- RGB对显示来说是方便的,但其他色彩空间更适合不同的任务.

- ** HSV**(Hue,饱和度,值)将色彩信息与亮度区分开来. 色调为纯色(一色轮周围为0-360度),饱和度为颜色多生动(0=灰色,1=纯色),值为亮相. HSV对以颜色为基点的分块有用,因为无论照明条件如何,你都可以单独在花地上打入分界. 检测"红色物体"在HSV中比在RGB中容易得多.

- **YCbCr**将亮度(Y,亮度)与色相(Cb,Cr,颜色差信号)区分开来. 这是JPEG压缩和视频解码器中使用的颜色空间. 人类视觉对亮度比颜色更敏感,因此色度能被存储在下分辨度(chroma subsampling)上,几乎没有知觉损失.

- **LAB**(CIELAB)的设计使得两种颜色之间的数值相距对应于知觉差分. 在LAB空间的等距步骤对于人类观察者来说是相等的步骤. L道为轻道,A从绿色到红色;而B从蓝色到黄色. LAB是当您需要感知到统一颜色比较时使用的.

- **图像形成**描述了3D场景如何变成2D影像. 最简单的型号是**针孔相机**:从现场发出的光从一个小孔穿过,并投影到它的后方的传感器平面上. 一点$(X, Y, Z)$在世界范围内协调用于像素坐标的项目$(u, v)$:

```math
\begin{bmatrix} u \\ v \\ 1 \end{bmatrix} = \frac{1}{Z} \begin{bmatrix} f_x & 0 & c_x \\ 0 & f_y & c_y \\ 0 & 0 & 1 \end{bmatrix} \begin{bmatrix} X \\ Y \\ Z \end{bmatrix}
```

- 3x3 矩阵是**intrinsic 矩阵**$K$。。。它编码相机的内部属性:焦距$f_x, f_y$(镜头如何强烈地凝聚出光) 和主点$(c_x, c_y)$(光学轴与传感器相会,通常靠近图像中心). 这些是固定在给定相机和镜头组合上的.

![针孔相机模型:通过光学中心到图像平面上的三维点项目,有焦距和主点标签](../images/pinhole_camera.svg)

- **extransic参数**描述相机在世界上的位置:自转矩阵$R$(3x3,出自第02章)和一个平移向量$t$(3x1) (英语). 它们一起将世界坐标转换为相机坐标. 整个预测是:

$$\mathbf{p} = K [R \mid t] \mathbf{P}$$

- 地点$\mathbf{P} = [X, Y, Z, 1]^T$是等同坐标中的三维点,并且$\mathbf{p} = [u, v, 1]^T$是预测的像素。该$[R \mid t]$矩阵为3x4,将旋转和翻译并排堆放. 这是第02章的线性代数

- 真实的镜头引入了**扭曲**.

    - ** Radial s扭曲** 将直线弯曲为曲线(弹管扭曲使图像向外凸起;披针扭曲将它向内挤出).
    ** 当镜头与传感器不完全平行时,即产生切入扭曲。

- 相机校正从已知图案的图像(像检查板)中估计出内在参数和扭曲系数,然后校正(undistorts)图像.

- **空间过滤**是古典图像处理的基础. 一个**filter**(或内核)是一个小矩阵(典型为3x3或5x5),会从图像上滑出. 在每个位置上,滤波器值会与相重叠的图像补丁相乘,并进行总和以产生一个输出像素. 这是**2D的卷积**, 同样的操作是授权CNNs(文件02), 但这里的过滤器重量是手工设计的而不是学习的。

$$(\text{image} * K)[i,j] = \sum_{m} \sum_{n} \text{image}[i+m, j+n] \cdot K[m, n]$$

- 这是从第06章开始的 1D 卷积的2D 扩展. 滤波器决定操作检测到什么:不同的滤波器检测到不同的特性.

- ** Blurring ** 通过平均相邻像素来平滑图像。一个**box过滤器**对所有邻居给予同等的分量.

- 一个**高斯滤波器**由2D高斯函数(第05章)来给邻居以重量,给附近的像素以更多的分量,给远的像素以较少分量. 高斯模糊是最常用的平滑操作,由$\sigma$数字 :$\sigma$意思是更平滑一点

- ** Median过滤** 将每个像素取而代之的是邻接点的中位数,而不是加权平均值。它在保留边缘的同时去除盐相和上层噪声(随机黑白像素)特别有效,因为中位数坚固到外层(如第04章所讨论).

- **Edge检测** 识别出像素强度发生剧烈变化的边界. 边缘在图像中携带大部分结构信息;您可以单独从它们的边缘识别对象.

- **Sobel操作员**使用两个3x3过滤器来估计横向和纵向方向的梯度:

```math
G_x = \begin{bmatrix} -1 & 0 & 1 \\ -2 & 0 & 2 \\ -1 & 0 & 1 \end{bmatrix}, \quad G_y = \begin{bmatrix} -1 & -2 & -1 \\ 0 & 0 & 0 \\ 1 & 2 & 1 \end{bmatrix}
```

- 将图像与$G_x$给出水平梯度(垂直边缘的强烈反应),以及$G_y$给出了垂直梯度(在水平边缘的强烈反应)。

- 梯度大小$\sqrt{G_x^2 + G_y^2}$和方向$\arctan(G_y / G_x)$一起描述每个像素的边缘强度和方向。这是从 第 03 章来渐变的图像域模拟.

![原始图像、Sobel 水平梯度、Sobel 垂直梯度和合并边缘星等](../images/sobel_edges.svg)

- ** Canny边缘探测器** 是边缘探测的金本位. 它采取四个步骤:
    1. 用高斯滤镜平滑图像以降低噪音
    2. 计算梯度大小和方向(使用 Sobel)
    3. ** 非极大值抑制**:仅保留沿梯度方向为局部最大值的像素而使边缘变薄
    4. ** 滞后阈值**:使用两个阈值(高和低)。高于高阈值的像素是确定的边缘. 阈值之间的像素只有在连接到一个确定的边缘时才为边缘. 低阈值以下的像素被丢弃.

- 坎尼的两个阈值使其比一个阈值更坚固:强边总是被保持,而弱边只有在属于连续边缘结构时才被保持.

- ** 频率域** 分析揭示出空间域中难以看到的规律. **2D Fourier变换**(从第03章中推断出1D版本)将一幅图像分解为不同频率和取向的2D sinoidal图案的总称:

$$F(u, v) = \sum_{x=0}^{M-1} \sum_{y=0}^{N-1} f(x, y) \cdot e^{-j2\pi(ux/M + vy/N)}$$

- 低频率对应平滑而缓慢变化的区域(天空,一堵墙). 高频率对应尖端过渡(尖端,纹理,噪音). **放大光谱**显示每个频率存在多少能量,而**相光谱**编码了空间安排.

- **Low-pass滤波**去除高频,使图像平滑(相当于空间域中的高斯模糊). ** 高通滤波** 清除了低频,强调边和细微细节. ** Band-pass滤波** 只保留一定频率范围,可用于纹理分析.

- 在实践中,频率域的滤波速度可以快于大滤波器的空间分解,因为空间域的分解等于频率域中元素相乘法(**tvolution定理**). 这直接连接了从第03章起的傅里叶变换属性.

- ** 图表** 总结了像素强度的分布。一个直方图计算出每个强度值的像素数(8位图像为0-255). 它与适用于像素值的第04章的频率分布相同.

![图像及其强度直方图: 暗相图向左倾斜, 亮相图向右倾斜](../images/image_histogram.svg)

- 一个暗图像的直方图集中在左边(低值). 一个明亮的图像 集中在右边。低相接图像有狭长直方图. 高相通的图像具有宽广,分布的直方图.

- ** 相位平分**使直方图跨出全强度范围,对比度得到提高。其理念是找到一个能使像素强度的累积分布函数(CDF)大致为线性的映射. 这是从第04章直接应用CDF概念.

- **大津的方法** 自动找到将一幅相片分出前缘和背景的最佳阈值. 它尝试每一个可能的阈值,并选择一个能将阶级内部的差异最小化的阈值(或等同地将阶级之间的差异最大化). 这与第04章中适用于像素强度人群的相同.

- ** 特征提取** 在图像中识别出不同的点或区域,可用于匹配,识别,和3D重建. 良好的特征应当是可重复的(在另一种观点中再次发现),具有独特性(有别于其他特征)并高效地计算.

- ** 角点检测** 发现图像强度在多方向有显著变化的点. 一个平稳的区域没有任何方向的变化。一个边缘有一个方向的变化。一个角落至少有两个方向有变化,使它成为当地独特的地标,因此是一个可靠的地标.

- **哈里斯角探测器** 分析每个像素的**结构张量**(也叫第二动量矩阵):

```math
M = \sum_{(x,y) \in W} w(x,y) \begin{bmatrix} I_x^2 & I_x I_y \\ I_x I_y & I_y^2 \end{bmatrix}
```

- 地点$I_x$财务报告和已审计财务报表$I_y$是图像梯度(由索贝尔计算),$W$是一个本地窗口,并且$w$是一个高斯加权函数。价值$M$(出自第02章) 告诉你特征的类型:
    - 两者均是等值小:平地(无特征)
    - 一个大一个小:边缘
    - 两者均为大:角

- Harris没有明确地计算eigenvalues,而是使用一角响应函数:$R = \det(M) - k \cdot (\text{trace}(M))^2$,在其中$\det(M) = \lambda_1 \lambda_2$财务报告和已审计财务报表$\text{trace}(M) = \lambda_1 + \lambda_2$(均出自第02章). 大正数$R$表示一个角落。常数$k$一般为0.04-0.06。

- hi-Tomasi**探测器简化为$R = \min(\lambda_1, \lambda_2)$,直接检查较小的正特征值是否足够大。这在实践中略为稳定。

- ** 斑点检测**发现与其周围不同的区域。与角(指点特征)不同,斑点具有特征大小.

- ** SIFT**(Cale-Invariant Feature Transform,Lowe,2004年)在多尺度上检测出斑点,并构造出一种不易旋转、缩放和部分不易发生照明变化的描述符。其作用者为:
    1. 利用高斯模糊度,在增加时建造一个**尺度空间**(见下文)$\sigma$
    2. 发现不同尺度的高斯函数差异
    3. 改进关键点位置并去除低相接点和边缘反应
    4. 根据本地梯度方向指定主导方向
    5. 围绕关键点在16x16的补丁中从渐变直方图中构建128维描述符

- ** SURF**(加速稳健特征)使用盒式过滤器和集成图像来进行更快的计算,大致为SIFT. **ORB**(定向FAST和旋转BRIEF)是一个快速开源的替代品,将FAST角探测器与BRIEF二进制描述器结合,增加了旋转偏移.

- **HOG**(正向渐变图)描述符将图像分出为小单元格,计算出每个单元格内梯度方向的直方图,并实现细胞块间的常态化. HOG捕捉到边缘取向的分布,对于对象外形来说,它具有很高的信息性. 在深入学习之前,HOG + SVM(第06章)是行人探测和物体识别的主要方法.

- ** 图像金字塔** 代表多个分辨率的图像。
    - 通过反复的模糊和下取样(破坏分辨率),建造了**高斯金字塔**. 每个关卡都是降采样版本的原作.
    - 一个**拉普拉西安金字塔**存储了连续高斯平分的差分,捕捉了每个下取采样步骤所损失的细节. 拉普拉斯金字塔是不可逆的:你可以从中重建出原始图像.

![高斯金字塔:完全分辨率时的原始图像,然后在每层半分辨率时逐渐缩小版本](../images/image_pyramid.svg)

- ** 尺度空间**将物体在不同尺度上存在的想法正规化。一棵树是大花花;一棵树上的叶子是小花花. 为了发现两者,你需要跨尺度搜索. 图像的尺度空间是由与高斯函数合作增加生成的图像家族$\sigma$:

$$L(x, y, \sigma) = G(x, y, \sigma) * I(x, y)$$

- 地点$G$是标准偏差的 2D 高斯函数$\sigma$。。。跨多尺度持续存在的地物更可能是有意义的结构,而不是噪音. 缩放空间是SIFT的理论基础,也是整个现代计算机视觉中使用的多尺度处理的理论基础,包括物体探测中的特征金字塔网络(文件03).

## 编程任务（使用 Colab 或 notebook）



1. 装入一幅图像,将其转换为不同的颜色空间(RGB,HSV,LAB),并可视化单个频道. 观察颜色信息如何在空间中以不同方式分布.
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt
from PIL import Image
import numpy as np

# Create a synthetic test image with distinct colours
H, W = 128, 256
img = np.zeros((H, W, 3), dtype=np.uint8)
img[:, :64] = [255, 50, 50]     # red
img[:, 64:128] = [50, 255, 50]  # green
img[:, 128:192] = [50, 50, 255] # blue
img[:, 192:] = [255, 255, 50]   # yellow

# Add a brightness gradient
for y in range(H):
    scale = 0.3 + 0.7 * y / H
    img[y] = (img[y] * scale).astype(np.uint8)

img_jnp = jnp.array(img, dtype=jnp.float32) / 255.0

# Manual RGB to HSV conversion
def rgb_to_hsv(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    maxc = jnp.max(rgb, axis=-1)
    minc = jnp.min(rgb, axis=-1)
    diff = maxc - minc + 1e-7

    # Hue
    h = jnp.where(maxc == minc, 0.0,
        jnp.where(maxc == r, 60 * ((g - b) / diff % 6),
        jnp.where(maxc == g, 60 * ((b - r) / diff + 2),
                              60 * ((r - g) / diff + 4))))
    s = jnp.where(maxc < 1e-7, 0.0, diff / maxc)
    v = maxc
    return jnp.stack([h / 360, s, v], axis=-1)

hsv = rgb_to_hsv(img_jnp)

fig, axes = plt.subplots(2, 3, figsize=(14, 8))
for i, (ch, name) in enumerate(zip([img_jnp[...,0], img_jnp[...,1], img_jnp[...,2]],
                                     ['Red', 'Green', 'Blue'])):
    axes[0, i].imshow(ch, cmap='gray', vmin=0, vmax=1)
    axes[0, i].set_title(f'RGB: {name}'); axes[0, i].axis('off')

for i, (ch, name) in enumerate(zip([hsv[...,0], hsv[...,1], hsv[...,2]],
                                     ['Hue', 'Saturation', 'Value'])):
    axes[1, i].imshow(ch, cmap='gray', vmin=0, vmax=1)
    axes[1, i].set_title(f'HSV: {name}'); axes[1, i].axis('off')

plt.suptitle('RGB vs HSV Channels')
plt.tight_layout(); plt.show()
```

2. 执行索贝尔边缘检测,高斯因从头到尾使用2D分解而模糊. 把它们应用到图像中并比较结果.
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

def conv2d(image, kernel):
    """2D convolution (valid mode) from scratch."""
    H, W = image.shape
    kH, kW = kernel.shape
    out_h, out_w = H - kH + 1, W - kW + 1
    output = jnp.zeros((out_h, out_w))
    for i in range(out_h):
        for j in range(out_w):
            patch = image[i:i+kH, j:j+kW]
            output = output.at[i, j].set(jnp.sum(patch * kernel))
    return output

# Create a test image: white rectangle on dark background
img = jnp.zeros((64, 64))
img = img.at[15:50, 20:45].set(1.0)
# Add some noise
key = jax.random.PRNGKey(42)
img = img + jax.random.normal(key, img.shape) * 0.05

# Sobel filters
sobel_x = jnp.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=jnp.float32)
sobel_y = jnp.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]], dtype=jnp.float32)

# Gaussian blur kernel (5x5, sigma=1)
ax = jnp.arange(-2, 3, dtype=jnp.float32)
xx, yy = jnp.meshgrid(ax, ax)
gaussian = jnp.exp(-(xx**2 + yy**2) / (2 * 1.0**2))
gaussian = gaussian / gaussian.sum()

# Apply filters
gx = conv2d(img, sobel_x)
gy = conv2d(img, sobel_y)
edges = jnp.sqrt(gx**2 + gy**2)
blurred = conv2d(img, gaussian)

fig, axes = plt.subplots(1, 4, figsize=(16, 4))
for ax, data, title in zip(axes,
    [img, edges, blurred, gx],
    ['Original', 'Edge Magnitude', 'Gaussian Blur', 'Horizontal Gradient']):
    ax.imshow(data, cmap='gray')
    ax.set_title(title); ax.axis('off')
plt.tight_layout(); plt.show()
```

3. 从零开始执行直方图均衡,并将其应用到低相接灰度图像上. 对比直方图前后.
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt

# Create a low-contrast image (values clustered in a narrow range)
key = __import__('jax').random.PRNGKey(42)
img = __import__('jax').random.uniform(key, (128, 128)) * 0.3 + 0.3  # values in [0.3, 0.6]

def histogram_equalise(img, n_bins=256):
    """Histogram equalisation for a grayscale image."""
    # Quantise to bins
    bins = jnp.linspace(0, 1, n_bins + 1)
    hist = jnp.histogram(img, bins=bins)[0]

    # Compute CDF
    cdf = jnp.cumsum(hist)
    cdf_normalised = (cdf - cdf.min()) / (cdf.max() - cdf.min())

    # Map each pixel through the CDF
    indices = jnp.clip((img * n_bins).astype(jnp.int32), 0, n_bins - 1)
    equalised = cdf_normalised[indices]
    return equalised

eq_img = histogram_equalise(img)

fig, axes = plt.subplots(2, 2, figsize=(12, 10))
axes[0, 0].imshow(img, cmap='gray', vmin=0, vmax=1)
axes[0, 0].set_title('Original (Low Contrast)'); axes[0, 0].axis('off')
axes[0, 1].imshow(eq_img, cmap='gray', vmin=0, vmax=1)
axes[0, 1].set_title('After Histogram Equalisation'); axes[0, 1].axis('off')

axes[1, 0].hist(img.ravel(), bins=64, color='#3498db', alpha=0.8)
axes[1, 0].set_title('Histogram Before'); axes[1, 0].set_xlim(0, 1)
axes[1, 1].hist(eq_img.ravel(), bins=64, color='#e74c3c', alpha=0.8)
axes[1, 1].set_title('Histogram After'); axes[1, 1].set_xlim(0, 1)

plt.tight_layout(); plt.show()
```

4. 从头开始使用哈里斯角探测器 以简单的图像检测出角并把它们想象出来.
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

def harris_corners(img, k=0.05, threshold=0.01):
    """Harris corner detection from scratch."""
    # Compute gradients with Sobel
    sobel_x = jnp.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=jnp.float32)
    sobel_y = jnp.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]], dtype=jnp.float32)

    # Pad image for valid convolution to preserve size
    img_pad = jnp.pad(img, 1, mode='edge')
    H, W = img.shape

    Ix = jnp.zeros_like(img)
    Iy = jnp.zeros_like(img)
    for i in range(H):
        for j in range(W):
            patch = img_pad[i:i+3, j:j+3]
            Ix = Ix.at[i, j].set(jnp.sum(patch * sobel_x))
            Iy = Iy.at[i, j].set(jnp.sum(patch * sobel_y))

    # Structure tensor components
    Ixx = Ix * Ix
    Iyy = Iy * Iy
    Ixy = Ix * Iy

    # Gaussian smoothing of structure tensor (approximate with window sum)
    w = 3  # window half-size
    R = jnp.zeros_like(img)
    pad_xx = jnp.pad(Ixx, w, mode='constant')
    pad_yy = jnp.pad(Iyy, w, mode='constant')
    pad_xy = jnp.pad(Ixy, w, mode='constant')

    for i in range(H):
        for j in range(W):
            sxx = jnp.sum(pad_xx[i:i+2*w+1, j:j+2*w+1])
            syy = jnp.sum(pad_yy[i:i+2*w+1, j:j+2*w+1])
            sxy = jnp.sum(pad_xy[i:i+2*w+1, j:j+2*w+1])
            det = sxx * syy - sxy * sxy
            trace = sxx + syy
            R = R.at[i, j].set(det - k * trace * trace)

    # Threshold
    corners = R > threshold * R.max()
    return R, corners

# Test image: checkerboard pattern (lots of corners)
block = 16
n = 4
checker = jnp.zeros((block * n, block * n))
for i in range(n):
    for j in range(n):
        if (i + j) % 2 == 0:
            checker = checker.at[i*block:(i+1)*block, j*block:(j+1)*block].set(1.0)

R, corners = harris_corners(checker)
cy, cx = jnp.where(corners)

fig, axes = plt.subplots(1, 3, figsize=(14, 4))
axes[0].imshow(checker, cmap='gray')
axes[0].set_title('Checkerboard'); axes[0].axis('off')
axes[1].imshow(R, cmap='hot')
axes[1].set_title('Harris Response'); axes[1].axis('off')
axes[2].imshow(checker, cmap='gray')
axes[2].scatter(cx, cy, c='#e74c3c', s=15, marker='x')
axes[2].set_title(f'Detected Corners ({len(cx)})'); axes[2].axis('off')
plt.tight_layout(); plt.show()
```
