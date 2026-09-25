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

*图像基础介绍数字图像的表示、成像过程，以及模型处理图像前常用的预处理方法。本文涵盖像素、颜色空间（RGB、HSV、YCbCr、LAB）、针孔相机模型、卷积、边缘检测（Sobel、Canny）、直方图和特征描述子（SIFT、ORB）等计算机视觉基础。*

- **数字图像**是由数字组成的二维网格。网格中的每个单元称为**像素**（picture element），其数值表示亮度或颜色。灰度图像由一个二维矩阵表示，每个像素存储一个亮度值；在 8 位图像中，数值通常从 0（黑）到 255（白）。

- 彩色图像有三个通道。在 **RGB** 颜色空间中，每个像素分别存储红、绿、蓝三个颜色通道的强度值。

- 因此，彩色图像可表示为形状为（高度，宽度，3）的三维张量。以不同强度组合这三个通道，就能表示可见光谱中的各种颜色。

![彩色图像拆分为红、绿、蓝三个通道，每个通道以灰度强度图显示](../images/rgb_channels.svg)


- **位深度**决定每个通道可以表示多少种不同的强度。

- 8 位图像的每个通道有 $2^8=256$ 个强度等级，因此 RGB 图像最多可表示 $256^3 \approx 1670$ 万种颜色。16 位图像的每个通道有 65,536 个等级，适用于需要保留细微强度差异的医学成像和 HDR 摄影。

- RGB 适合显示图像；其他颜色空间则更适合特定任务。

- **HSV**（色相、饱和度、明度）将颜色信息与亮度分开。色相表示颜色本身，以色环上的角度表示（0–360 度）；饱和度表示颜色的鲜艳程度（0 表示灰色，1 表示纯色）；明度表示亮度。HSV 常用于基于颜色的分割，因为可以单独按色相设定阈值，受光照变化的影响较小。因此，用 HSV 检测“红色物体”通常比用 RGB 更容易。

- **YCbCr**将亮度（Y，人眼感知的明暗）与色度（Cb、Cr，颜色差信号）分开。JPEG 压缩和视频编解码器都使用这种颜色空间。人眼对亮度比对颜色更敏感，因此可以降低色度分辨率（色度抽样），而几乎不影响感知效果。

- **LAB**（CIELAB）旨在让颜色之间的数值距离近似对应人眼感知到的差异。在 LAB 空间中，数值相等的变化量看起来也近似相等。L 通道表示明度，A 轴从绿到红，B 轴从蓝到黄。需要较均匀地比较颜色感知差异时，可以使用 LAB。

- **成像过程**描述三维场景如何形成二维图像。最简单的模型是**针孔相机**：场景中的光线通过一个小孔，投射到后方的传感器平面上。世界坐标中的点 $(X,Y,Z)$ 会投影到像素坐标 $(u,v)$：

```math
\begin{bmatrix} u \\ v \\ 1 \end{bmatrix} = \frac{1}{Z} \begin{bmatrix} f_x & 0 & c_x \\ 0 & f_y & c_y \\ 0 & 0 & 1 \end{bmatrix} \begin{bmatrix} X \\ Y \\ Z \end{bmatrix}
```

- 这个 $3\times3$ 矩阵称为**内参矩阵** $K$，描述相机的内部参数，包括焦距 $f_x,f_y$（表示镜头汇聚光线的能力）和主点 $(c_x,c_y)$。主点是光轴与传感器的交点，通常靠近图像中心。对于给定的相机和镜头组合，这些参数保持不变。

![针孔相机模型：三维点经过光心投影到图像平面，并标出焦距和主点](../images/pinhole_camera.svg)


- **外参**描述相机在世界中的位置和朝向，包括旋转矩阵 $R$（$3\times3$，见第 02 章）和位移向量 $t$（$3\times1$）。两者共同把世界坐标变换到相机坐标。完整投影关系为：

$$\mathbf{p} = K [R \mid t] \mathbf{P}$$
- 其中，$\mathbf{P}=[X,Y,Z,1]^T$ 是三维点的齐次坐标，$\mathbf{p}=[u,v,1]^T$ 是投影后的像素坐标。矩阵 $[R\mid t]$ 的形状为 $3\times4$，由旋转矩阵和位移向量横向拼接而成。这些内容都用到了第 02 章介绍的线性代数。

- 真实镜头会引入**畸变**。

    - **径向畸变**会把直线弯成曲线：桶形畸变使图像向外鼓起，枕形畸变则使图像向内收缩。
    **切向畸变**通常由镜头与传感器未完全对准引起。**编者注：**原文将其简化为镜头与传感器不平行；更一般地说，切向畸变来自镜头光学中心与传感器中心未对齐。

- 相机标定会利用已知图案（如棋盘格）的图像估计内参和畸变系数，再据此校正图像、消除畸变。

- **空间滤波**是经典图像处理的基础。**滤波器**（或卷积核）是一个较小的矩阵，通常为 $3\times3$ 或 $5\times5$，它会在图像上滑动。每到一个位置，就把滤波器与对应图像区域逐元素相乘，再将结果相加，得到一个输出像素。这种操作称为**二维卷积**，也是 CNN（第 02 篇）使用的运算；区别在于，传统图像处理中的滤波器权重由人设计，而非通过训练学习。

$$(\text{image} * K)[i,j] = \sum_{m} \sum_{n} \text{image}[i+m, j+n] \cdot K[m, n]$$
- 这是第 06 章一维卷积在二维图像上的扩展。滤波器决定运算会突出哪些特征，不同滤波器能检测不同特征。**编者注：**原文公式没有翻转卷积核，严格来说表示互相关；许多深度学习框架仍将这种运算称为卷积。

- **模糊**通过对相邻像素求平均来平滑图像。**均值滤波器**为所有邻近像素赋予相同权重。

- **高斯滤波器**按二维高斯函数（第 05 章）为邻近像素赋权，距离越近，权重越大。高斯模糊是最常用的平滑操作，其参数为 $\sigma$；$\sigma$ 越大，平滑效果越强。

- **中值滤波**用邻域内像素值的中位数替换当前像素，而不是求加权平均。它能有效去除椒盐噪声（随机出现的黑白像素），同时保留边缘，因为中位数不容易受离群值影响（见第 04 章）。

- **边缘检测**用于找出像素强度急剧变化的位置。这些边缘包含图像的大部分结构信息，有时只看物体边缘就能辨认物体。

- **Sobel 算子**用两个 $3\times3$ 滤波器估计水平方向和垂直方向的梯度：

```math
G_x = \begin{bmatrix} -1 & 0 & 1 \\ -2 & 0 & 2 \\ -1 & 0 & 1 \end{bmatrix}, \quad G_y = \begin{bmatrix} -1 & -2 & -1 \\ 0 & 0 & 0 \\ 1 & 2 & 1 \end{bmatrix}
```

- 用 $G_x$ 对图像做卷积可得到水平梯度，在垂直边缘处响应较强；用 $G_y$ 则得到垂直梯度，在水平边缘处响应较强。

- 梯度幅值 $\sqrt{G_x^2+G_y^2}$ 和方向 $\arctan(G_y/G_x)$ 一起描述每个像素处边缘的强度和方向。这相当于第 03 章梯度概念在图像领域中的应用。**编者注：**实现时通常用 $\operatorname{atan2}(G_y,G_x)$ 计算方向，以保留象限信息。

![原始图像、Sobel 水平梯度、Sobel 垂直梯度和合成后的边缘幅值](../images/sobel_edges.svg)


- **Canny 边缘检测器**是经典的边缘检测算法，分四步处理：
    1. 用高斯滤波器平滑图像，降低噪声。
    2. 用 Sobel 算子计算梯度幅值和方向。
    3. **非极大值抑制**：只保留沿梯度方向的局部极大值，使边缘变细。
    4. **滞后阈值处理**：设置高、低两个阈值。高于高阈值的像素确定为边缘；介于两个阈值之间的像素，只有连接到确定边缘时才保留；低于低阈值的像素则丢弃。

- 使用两个阈值比单一阈值更稳健：Canny 会保留强边缘，只在弱边缘属于连续边缘结构时才保留它们。

- **频域分析**能揭示空间域中不易观察的图像模式。**二维傅里叶变换**是第 03 章一维傅里叶变换的扩展，它把图像分解为不同频率和方向的二维正弦模式之和：

$$F(u, v) = \sum_{x=0}^{M-1} \sum_{y=0}^{N-1} f(x, y) \cdot e^{-j2\pi(ux/M + vy/N)}$$
- 低频对应变化平缓的区域，如天空或墙面；高频对应变化急剧的部分，如边缘、纹理和噪声。**幅度谱**表示各频率成分的强度，**相位谱**则编码这些成分在空间中的排列方式。

- **低通滤波**去掉高频成分，使图像变平滑；这相当于在空间域中进行高斯模糊。**高通滤波**去掉低频成分，突出边缘和细节。**带通滤波**只保留一定频率范围内的成分，可用于纹理分析。

- 当滤波器较大时，在频域滤波可能比空间卷积更快，因为空间域中的卷积等价于频域中的逐元素乘法，这就是**卷积定理**。这也直接用到了第 03 章介绍的傅里叶变换性质。

- **直方图**概括像素强度的分布，统计每个强度值对应的像素数量。8 位图像的强度值通常为 0–255。这相当于将第 04 章的频数分布应用于像素值。

![图像及其强度直方图：暗图像的像素集中在低强度值，亮图像的像素集中在高强度值](../images/image_histogram.svg)


- 暗图像的直方图集中在左侧的低强度值区域，亮图像的直方图集中在右侧的高强度值区域。低对比度图像的直方图较窄；高对比度图像的直方图则较宽、分布较开。

- **直方图均衡化**将直方图扩展到整个强度范围，以提高图像对比度。其核心是寻找一种映射，使像素强度的累积分布函数（CDF）近似线性。这直接应用了第 04 章的 CDF 概念。

- **Otsu 方法**会自动寻找最佳阈值，将图像分为前景和背景。它遍历可能的阈值，选择使类内方差最小（等价于使类间方差最大）的阈值。这是将第 04 章介绍的方差概念应用于像素强度分布。

- **特征提取**用于找出图像中有辨识度的点或区域，以便进行匹配、识别和三维重建。好的特征应能在不同视角下重复检测到、与其他特征区分开，而且计算效率高。

- **角点检测**寻找图像强度在多个方向上显著变化的位置。平滑区域在各个方向上变化都很小；边缘只在一个方向上明显变化；角点至少在两个方向上都有明显变化，因此在局部具有独特性，可作为可靠的地标。

- **Harris 角点检测器**会分析每个像素处的**结构张量**（也称二阶矩矩阵）：

```math
M = \sum_{(x,y) \in W} w(x,y) \begin{bmatrix} I_x^2 & I_x I_y \\ I_x I_y & I_y^2 \end{bmatrix}
```

- 其中，$I_x$ 和 $I_y$ 是用 Sobel 算子计算出的图像梯度，$W$ 是局部窗口，$w$ 是高斯权重函数。$M$ 的特征值（见第 02 章）可用于判断局部特征类型：
    - 两个特征值都很小：平坦区域，没有明显特征。
    - 一个较大、一个较小：边缘。
    - 两个都较大：角点。

- Harris 无需显式计算特征值，而是使用角点响应函数：$R=\det(M)-k\cdot(\operatorname{trace}(M))^2$。其中，$\det(M)=\lambda_1\lambda_2$，$\operatorname{trace}(M)=\lambda_1+\lambda_2$（见第 02 章）。较大的正 $R$ 表示角点，常数 $k$ 通常取 0.04–0.06。

- **Shi-Tomasi 检测器**将响应简化为 $R=\min(\lambda_1,\lambda_2)$，直接检查较小的特征值是否足够大。它在实际使用中稍稳定一些。

- **斑点检测**寻找与周围区域不同的图像区域。与点状特征角点不同，斑点具有一定的尺度。

- **SIFT**（尺度不变特征变换；Lowe，2004）会在多个尺度上检测斑点，并构造对旋转和尺度不变、对光照变化部分不变的描述子。主要步骤如下：
    1. 使用逐渐增大的 $\sigma$ 执行高斯模糊，建立**尺度空间**（见下文）。
    2. 在不同尺度的高斯差分（DoG）中寻找极值。
    3. 精修关键点位置，并剔除低对比度点和边缘响应点。
    4. 根据局部梯度方向，为关键点指定主方向。
    5. 在关键点周围的 $16\times16$ 区域内统计梯度直方图，构造 128 维描述子。

- **SURF**（加速稳健特征）使用方框滤波器和积分图近似 SIFT，以加快计算。**ORB**（定向 FAST 与旋转 BRIEF）是一种快速的开源替代方法，将 FAST 角点检测器与 BRIEF 二进制描述子结合，并加入旋转不变性。

- **HOG**（方向梯度直方图）描述子将图像划分为小单元，统计各单元内的梯度方向，再按单元块进行归一化。HOG 捕捉边缘方向的分布，而边缘方向包含丰富的物体形状信息。在深度学习普及前，HOG 与 SVM（第 06 章）是行人检测和物体识别的主流方法。

- **图像金字塔**以多个分辨率表示同一图像。
    - **高斯金字塔**通过反复模糊并下采样（每次将分辨率减半）构建，每一层都是原图更粗略的版本。
    - **拉普拉斯金字塔**保存相邻高斯层之间的差值，记录每次下采样丢失的细节。拉普拉斯金字塔可以逆变换，从中重建原图。

![高斯金字塔：从全分辨率原图开始，后续每一层的分辨率都减半](../images/image_pyramid.svg)


- **尺度空间**将“物体可能以不同尺度出现”这一概念形式化。例如，一棵树是大尺度斑点，树叶则是小尺度斑点；要检测两者，就必须搜索不同尺度。图像的尺度空间由一系列图像组成，每幅图像都是原图与不同 $\sigma$ 的高斯核卷积所得：

$$L(x, y, \sigma) = G(x, y, \sigma) * I(x, y)$$
- 其中，$G$ 是标准差为 $\sigma$ 的二维高斯函数。若某个特征在多个尺度上都存在，它更可能是有意义的结构，而非噪声。尺度空间是 SIFT 以及现代计算机视觉中多尺度处理的理论基础；目标检测中的特征金字塔网络（第 03 篇）也使用了多尺度处理。

## Coding Tasks (use CoLab or notebook)

1. 读取一张图像，将其转换到不同的颜色空间（RGB、HSV、LAB），并分别显示各通道。观察颜色信息在不同空间中的分布差异。
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

2. 用二维卷积从头实现 Sobel 边缘检测和高斯模糊。将它们应用于图像，并比较处理结果。
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

3. 从头实现直方图均衡化，并将其应用于低对比度灰度图像。比较处理前后的直方图。
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

4. 从头实现 Harris 角点检测器，在一张简单图像中检测角点并将其可视化。
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
