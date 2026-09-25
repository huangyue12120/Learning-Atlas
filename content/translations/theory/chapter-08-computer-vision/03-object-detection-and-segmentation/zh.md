---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 08 - computer vision/03. object detection and segmentation.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 0cfccb0b2895b622597e0866cfdda64da28aa1646b8738bc1dc509921311607e
status: reviewed
---
# 目标检测与分割

*目标检测会定位图像中的每个对象并判断其类别；分割则为每个像素分配标签。本文介绍 IoU、mAP、锚框、R-CNN 系列、YOLO、SSD、特征金字塔网络，以及语义分割、实例分割和全景分割（U-Net、Mask R-CNN、SAM）及其评测指标。*

- 图像分类（文件 02）回答“图像里有什么？”。目标检测要回答更具体的问题：“图像里有哪些对象？它们分别在哪里？”

- 分割还要进一步确定“哪些像素属于哪个对象或类别？”。这些任务逐步要求模型具备更精确的空间理解能力。

- **目标检测**模型会输出一组**边界框**。每个边界框由四个值定义：左上角坐标 $x, y$、宽度和高度；同时还会给出类别标签及其置信度。一张图像里可能没有对象，也可能有一个或数百个、属于多个类别的对象。

![一张含有多个对象的输入图像；每个对象都由带有类别标签和置信度的彩色边界框标出](../images/detection_boxes.svg)

- **交并比（IoU）**用于衡量预测边界框与真实标注框的重合程度，计算方式是交集面积除以并集面积：

$$\text{IoU} = \frac{\text{Area of Intersection}}{\text{Area of Union}}$$

- IoU 为 1 表示两个框完全重合，为 0 表示完全不重合。判定检测正确的常用阈值是 IoU $\geq 0.5$，也会使用更严格的阈值（如 0.75、0.9）。

- 如果预测框与某个真实框的 IoU 超过阈值，且预测类别正确，这次检测就是真阳性（TP）。

- **假阳性（FP）**是指无法与任何真实框匹配的预测框。

- **假阴性（FN）**是指没有任何预测框匹配到的真实对象。它们与第 06 章中的精确率、召回率概念相同。

- **平均精度（AP）**概括模型在某个类别上的检测质量。对每个类别，先按置信度从高到低排列所有检测结果，再逐个计算精确率和召回率，并求精确率—召回率曲线下的面积：

$$\text{AP} = \int_0^1 p(r) \, dr$$

- 实际计算时会对曲线进行插值：对每个召回率 $r$，将精确率设为所有召回率不小于 $r$ 时的最大值。这样得到的曲线更平滑，且精确率随召回率增加而单调不增。

- **平均精度均值（mAP）**是所有类别 AP 的平均值。“mAP@0.5”使用 IoU 阈值 0.5；COCO 标准中的“mAP@[.5:.95]”则对 0.5 到 0.95、步长为 0.05 的 10 个 IoU 阈值分别计算 mAP，再取平均，因此既衡量检测效果，也衡量定位精度。

- **非极大值抑制（NMS）**用于去除重复检测。如果模型为同一对象预测了多个重叠框，NMS 会保留置信度最高的框，并删除与它的 IoU 超过阈值的其他框。模型生成原始预测后，通常会按类别分别执行 NMS。

- **两阶段检测器**先提出候选区域，再对每个候选区域分类并调整边界框。

- **R-CNN**（Girshick 等，2014）是首个成功的深度学习目标检测器。它使用传统算法选择性搜索提出约 2,000 个候选区域，将每个区域缩放到固定尺寸，再分别输入 CNN，并用支持向量机（第 06 章）进行分类。R-CNN 精度较高，但速度极慢：每张图像都要运行 2,000 次 CNN。

- **Fast R-CNN**（Girshick，2015）通过共享特征减少了重复计算：它只对整张图像运行一次 CNN，生成共享特征图；随后利用**感兴趣区域池化（RoI pooling）**从该特征图中提取各个候选区域的特征。

- RoI pooling 将尺寸不一的特征图区域划分成网格，并在每个网格单元内执行最大池化，从而得到固定尺寸的输出。昂贵的 CNN 计算只需进行一次，因此速度更快。

- **Faster R-CNN**（Ren 等，2015）引入**区域提议网络（RPN）**，取代外部的候选区域提议算法。RPN 是一个运行在共享特征图上的小型 CNN，可以直接预测候选框。它在特征图上滑动一个小窗口，并在每个位置预测 $k$ 个候选框，每个候选框对应一个**锚框**。

![Faster R-CNN 流程：输入图像 → 主干 CNN → 共享特征图 → RPN 生成候选框 → RoI pooling → 分类头和边界框回归头](../images/faster_rcnn.svg)

- **锚框**是在特征图每个空间位置预先设定的边界框，覆盖不同尺度和宽高比（例如 3 种尺度 × 3 种宽高比，即每个位置有 9 个锚框）。RPN 会为每个锚框预测两项内容：表示“对象还是背景”的目标性分数，以及用于调整锚框、得到更贴合目标的候选框的坐标偏移量。这种参数化方式让回归更容易：网络无需预测绝对坐标，只需预测相对于合理初始框的小幅调整。

- 锚框偏移量的参数化方式如下：

$$t_x = \frac{x - x_a}{w_a}, \quad t_y = \frac{y - y_a}{h_a}, \quad t_w = \log\frac{w}{w_a}, \quad t_h = \log\frac{h}{h_a}$$

- 其中，$(x, y, w, h)$ 是预测框的中心坐标和宽高，$(x_a, y_a, w_a, h_a)$ 是锚框的中心坐标和宽高。对宽度和高度取对数，可确保预测框的宽高为正，并使回归对尺度变化不敏感。

- Faster R-CNN 使用多任务损失进行训练：类别标签的分类损失（交叉熵，见第 05 章），以及边界框回归的 **Smooth L1 损失**。与 L2 损失相比，Smooth L1 对离群值不那么敏感：

```math
\text{smooth}_{L1}(x) = \begin{cases} 0.5x^2 & \text{if } |x| < 1 \\ |x| - 0.5 & \text{otherwise} \end{cases}
```

- **特征金字塔网络（FPN）**（Lin 等，2017）通过自顶向下的路径和横向连接，将高层语义信息与低层空间细节结合起来，以处理多尺度目标。主干网络会生成多个尺度的特征图（每经过一个池化层，分辨率减半）。FPN 增加自顶向下路径：每一层接收来自上一层的上采样特征，再通过横向 1×1 卷积与对应的自底向上特征融合。最终得到一组金字塔特征图，兼具较强语义信息和较高空间分辨率。

- 金字塔中分辨率较高的层用于检测小目标，分辨率较低的层用于检测大目标。如今，FPN 已成为多数现代检测架构的标准组件。

- **单阶段检测器**完全跳过候选区域提议步骤，在一次前向传播中直接预测类别和边界框。它们速度更快，但过去精度通常不如两阶段检测器；焦点损失缩小了两者的差距。

- **YOLO**（You Only Look Once，Redmon 等，2016）将图像划分为 $S \times S$ 网格。每个网格单元预测 $B$ 个边界框和 $C$ 个类别的概率。如果某个对象的中心落在一个网格单元内，该单元就负责检测它。整个检测过程只需一次前向传播，也没有候选区域提议阶段，因此 YOLO 速度很快。

- **YOLOv2** 加入锚框、批归一化和多尺度训练。**YOLOv3** 使用特征金字塔网络，并在三个尺度上进行预测。**YOLOv4-v8** 则通过更好的主干网络、路径聚合网络和马赛克数据增强（训练时将四张图像拼接，以增加上下文多样性）继续改进。

- **SSD**（Single Shot MultiBox Detector，Liu 等，2016）在主干网络的多个特征图尺度上进行预测，并在每个尺度使用锚框。较早、分辨率较高的特征图检测小目标；较晚、分辨率较低的特征图检测大目标。SSD 的速度快于 Faster R-CNN，精度也有竞争力。

- **RetinaNet**（Lin 等，2017）指出了单阶段检测器的核心难题：类别不平衡。绝大多数锚框对应背景，会产生大量容易识别的负例；这些负例主导损失，使稀少正例产生的梯度难以发挥作用。

- **焦点损失**通过降低容易样本的权重来解决这一问题：

$$\text{FL}(p_t) = -\alpha_t (1 - p_t)^\gamma \log(p_t)$$

- 其中，$p_t$ 是模型对正确类别预测的概率。当模型有把握且预测正确时（$p_t$ 较高），$(1 - p_t)^\gamma$ 就较小，从而降低容易负例对损失的贡献。超参数 $\gamma$（通常取 2）控制降权幅度。当 $\gamma = 0$ 时，焦点损失退化为标准交叉熵。借助焦点损失，RetinaNet 以单阶段检测器的速度达到了可与两阶段检测器相比的精度。

- **无锚框检测**完全不使用锚框，减少了超参数调试工作，也简化了处理流程。

- **FCOS**（Fully Convolutional One-Stage，Tian 等，2019）在特征图的每个空间位置预测该位置到最近边界框四条边（左、上、右、下）的距离，以及类别标签。**中心度（centerness）**分数会降低远离目标中心的预测权重，从而提升预测质量。FCOS 使用 FPN 处理多个尺度。

- **CenterNet**（Zhou 等，2019）将对象检测视为关键点估计：它预测一张热图，峰值对应对象中心，再在每个峰值位置回归对象的宽度和高度。这种无锚框方法简洁优雅，但热图后处理需要仔细设计。

- **CornerNet**将对象表示为一对角点（左上角和右下角）。它分别预测两种角点的热图，并通过**关联嵌入**将对应角点配对成边界框。该方法不需要锚框，也能处理形状各异的对象。

- **语义分割**为图像中的每个像素分配一个类别标签。与输出边界框的目标检测不同，语义分割会生成稠密的像素级标签图。例如，街景中的每个像素都可以被标记为道路、人行道、汽车、行人、建筑物或天空等类别。

![语义分割示例：街景输入图像及其像素级标签图，不同颜色代表不同类别](../images/semantic_segmentation.svg)

- **全卷积网络（FCN）**（Long 等，2015）通过用卷积层替换分类 CNN 中的全连接层，将分类网络改造成分割网络，使其输出空间标签图而不是单个类别。再通过转置卷积或双线性插值上采样，将输出恢复到输入图像的分辨率。来自较早层的跳跃连接则补回下采样过程中丢失的空间细节。

- **转置卷积**（有时称为“反卷积”）是卷积的上采样对应操作。带步长的卷积会降低空间维度，转置卷积则会增加空间维度。它在输入元素之间插入零，再执行标准卷积，从而学习如何上采样。

- **U-Net**（Ronneberger 等，2015）提出了对称的编码器—解码器架构，并在每个层级都设置跳跃连接。编码器（收缩路径）会降低空间分辨率、增加通道数，与分类 CNN 的做法相同；解码器（扩张路径）则逐步上采样，恢复到完整分辨率。在每个层级，跳跃连接都会拼接编码器和解码器的特征图，为解码器补充精细空间信息。高层语义与低层细节结合后，分割边界会更清晰、准确。

![U-Net 架构：左侧为逐步下采样的编码器路径，右侧为逐步上采样的解码器路径，两侧对应层级之间由跳跃连接相连](../images/unet_architecture.svg)

- U-Net 最初用于训练数据较少的生物医学图像分割。此后，许多模型都以它的架构为基础，包括潜在扩散模型（文件 04）中的 U-Net。

- **DeepLab**（Chen 等，2014–2018）为图像分割引入了两项关键技术：

    - **空洞卷积（膨胀卷积）**：在滤波器元素之间留出间隔的标准卷积，间隔由膨胀率 $r$ 控制。一个膨胀率为 $r$ 的 3×3 滤波器，感受野为 $(2r + 1) \times (2r + 1)$，但仍只需 9 个参数。它无需下采样，就能在保留空间分辨率的同时捕捉多个尺度的上下文信息。

    - **空洞空间金字塔池化（ASPP）**：并行使用多个膨胀率不同的空洞卷积（例如 1、6、12、18），拼接其结果，再用 1×1 卷积融合。ASPP 可以同时捕捉多个尺度的上下文；其思路与 Inception 模块（文件 02）类似，但它通过不同膨胀率而非不同卷积核尺寸实现这一点。

- DeepLab 还使用**条件随机场（CRF）**（第 05 章）进行后处理：鼓励空间位置相近且颜色相似的像素共享同一标签，以细化分割边界。

- **实例分割**结合了目标检测和分割：它会识别每个独立对象实例，并为每个实例生成像素级掩码。街景中的两辆汽车会各自得到一个掩码，而不是合用一个“汽车”掩码。

- **Mask R-CNN**（He 等，2017）在 Faster R-CNN 上增加一个小型分割头，为每个检测到的对象预测二值掩码。其架构是在 Faster R-CNN 上增加掩码分支：掩码分支接收 RoI pooling 得到的特征，并为每个类别输出一个 $m \times m$ 二值掩码。Mask R-CNN 使用 **RoIAlign** 替代 RoI pooling：它在精确采样点进行双线性插值，而不是将坐标量化到网格单元，因此可避免量化造成的空间错位。这一小改动显著提升了掩码质量。

- Mask R-CNN 使用多任务损失进行训练：分类损失 + 边界框回归损失 + 掩码损失（逐像素二元交叉熵）。掩码分支分别预测每个类别的掩码，最后只使用预测类别对应的掩码。这让掩码预测与分类相互解耦，两者的效果也因此提升。

- **全景分割**将语义分割和实例分割统一到同一任务中。每个像素既有类别标签（语义），也有实例 ID（实例；适用于汽车、行人等可逐个计数的“thing”类）。天空、道路、草地等“stuff”类只标注语义类别，因为它们是无法按个体计数的连续区域。

- 全景质量（PQ）指标将分割质量（匹配片段的平均 IoU）和识别质量（匹配片段的 F1 分数）相乘，以此评估全景分割：

$$\text{PQ} = \underbrace{\frac{\sum_{(p,g) \in \text{TP}} \text{IoU}(p,g)}{|\text{TP}|}}_{\text{SQ}} \times \underbrace{\frac{|\text{TP}|}{|\text{TP}| + \frac{1}{2}|\text{FP}| + \frac{1}{2}|\text{FN}|}}_{\text{RQ}}$$

- 对自动驾驶、增强现实等应用来说，**实时分割**至关重要，因为每帧的延迟预算通常很紧（往往低于 30 毫秒）。

- **BiSeNet**（Bilateral Segmentation Network，Yu 等，2018）采用两条并行路径：较宽、较浅的**空间路径**保留空间细节；较深、较窄的**上下文路径**提取语义信息。融合两条路径的输出后，模型兼顾速度和精度。

- **DDRNet**（Deep Dual-Resolution Network，Hong 等，2021）在整个网络中保留两条分辨率不同的分支，并反复交换信息。高分辨率分支保留空间细节，低分辨率分支提取全局上下文；多个双向融合模块会在两个方向上融合信息。

- 实时分割的发展趋势是避免使用计算量大的编码器—解码器结构，转而在网络中尽量维持足够的空间分辨率，以牺牲部分精度换取大幅降低的延迟。

## 编程任务（使用 Colab 或笔记本）

1. 从头实现 IoU 计算和非极大值抑制（NMS），将 NMS 应用于一组互相重叠的边界框，并将结果可视化。
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def compute_iou(box1, box2):
    """Compute IoU between two boxes [x1, y1, x2, y2]."""
    x1 = jnp.maximum(box1[0], box2[0])
    y1 = jnp.maximum(box1[1], box2[1])
    x2 = jnp.minimum(box1[2], box2[2])
    y2 = jnp.minimum(box1[3], box2[3])

    intersection = jnp.maximum(0, x2 - x1) * jnp.maximum(0, y2 - y1)
    area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
    area2 = (box2[2] - box2[0]) * (box2[3] - box2[1])
    union = area1 + area2 - intersection

    return intersection / (union + 1e-6)

def nms(boxes, scores, iou_threshold=0.5):
    """Non-Maximum Suppression."""
    order = jnp.argsort(-scores)  # sort by descending confidence
    keep = []

    remaining = list(range(len(scores)))
    order_list = order.tolist()

    while order_list:
        idx = order_list[0]
        keep.append(idx)
        order_list = order_list[1:]

        new_order = []
        for j in order_list:
            iou = compute_iou(boxes[idx], boxes[j])
            if iou < iou_threshold:
                new_order.append(j)
        order_list = new_order

    return keep

# Example: overlapping detections of the same object
boxes = jnp.array([
    [50, 60, 150, 160],   # high confidence
    [55, 65, 155, 165],   # overlapping duplicate
    [52, 58, 148, 158],   # overlapping duplicate
    [200, 100, 300, 200], # different object
    [205, 105, 305, 205], # overlapping duplicate
])
scores = jnp.array([0.95, 0.80, 0.70, 0.90, 0.60])

keep = nms(boxes, scores, iou_threshold=0.5)

fig, axes = plt.subplots(1, 2, figsize=(14, 5))
colors = ['#3498db', '#e74c3c', '#27ae60', '#9b59b6', '#f39c12']

for ax, title, indices in zip(axes, ['Before NMS', 'After NMS'],
                               [range(len(boxes)), keep]):
    ax.set_xlim(0, 400); ax.set_ylim(0, 300)
    ax.set_aspect('equal'); ax.invert_yaxis()
    ax.set_title(title)
    for i in indices:
        b = boxes[i]
        rect = patches.Rectangle((b[0], b[1]), b[2]-b[0], b[3]-b[1],
                                  linewidth=2, edgecolor=colors[i],
                                  facecolor='none')
        ax.add_patch(rect)
        ax.text(b[0], b[1]-5, f'{scores[i]:.2f}', color=colors[i], fontsize=10)

plt.tight_layout(); plt.show()
print(f"Kept {len(keep)} of {len(boxes)} boxes after NMS")
```

2. 实现一个简化的区域提议网络（RPN）：给定一张特征图，生成多个尺度和宽高比的锚框，并预测目标性分数与边界框偏移量。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt
import matplotlib.patches as patches

def generate_anchors(feature_h, feature_w, stride, scales, ratios):
    """Generate anchor boxes for each position on the feature map."""
    anchors = []
    for y in range(feature_h):
        for x in range(feature_w):
            cx = (x + 0.5) * stride
            cy = (y + 0.5) * stride
            for s in scales:
                for r in ratios:
                    w = s * jnp.sqrt(r)
                    h = s / jnp.sqrt(r)
                    anchors.append([cx - w/2, cy - h/2, cx + w/2, cy + h/2])
    return jnp.array(anchors)

def rpn_forward(feature_map, params):
    """Simplified RPN: predicts objectness and box offsets per anchor."""
    H, W, C = feature_map.shape
    n_anchors = params['cls_w'].shape[1]

    # Slide a 1x1 conv over the feature map (simplified)
    cls_scores = feature_map.reshape(-1, C) @ params['cls_w']  # (H*W, n_anchors)
    box_offsets = feature_map.reshape(-1, C) @ params['reg_w']  # (H*W, n_anchors*4)

    cls_scores = jax.nn.sigmoid(cls_scores)
    return cls_scores.ravel(), box_offsets.reshape(-1, 4)

# Setup
feature_h, feature_w, channels = 4, 4, 16
stride = 16  # each feature map cell covers 16x16 pixels
scales = [32, 64, 128]
ratios = [0.5, 1.0, 2.0]
n_anchors_per_pos = len(scales) * len(ratios)

key = jax.random.PRNGKey(42)
k1, k2, k3 = jax.random.split(key, 3)

feature_map = jax.random.normal(k1, (feature_h, feature_w, channels))
params = {
    'cls_w': jax.random.normal(k2, (channels, n_anchors_per_pos)) * 0.01,
    'reg_w': jax.random.normal(k3, (channels, n_anchors_per_pos * 4)) * 0.01,
}

anchors = generate_anchors(feature_h, feature_w, stride, scales, ratios)
scores, offsets = rpn_forward(feature_map, params)

print(f"Feature map: {feature_h}x{feature_w}, stride={stride}")
print(f"Anchors per position: {n_anchors_per_pos}")
print(f"Total anchors: {len(anchors)}")
print(f"Objectness scores shape: {scores.shape}")
print(f"Box offsets shape: {offsets.shape}")

# Visualise anchors for one position
fig, ax = plt.subplots(figsize=(6, 6))
img_size = feature_h * stride
ax.set_xlim(0, img_size); ax.set_ylim(0, img_size)
ax.invert_yaxis(); ax.set_aspect('equal')

pos_idx = feature_h // 2 * feature_w + feature_w // 2  # centre position
colors = ['#3498db', '#e74c3c', '#27ae60']
for i, s in enumerate(scales):
    for j, r in enumerate(ratios):
        idx = pos_idx * n_anchors_per_pos + i * len(ratios) + j
        a = anchors[idx]
        rect = patches.Rectangle((a[0], a[1]), a[2]-a[0], a[3]-a[1],
                                  linewidth=1.5, edgecolor=colors[i],
                                  facecolor='none', linestyle=['--', '-', ':'][j])
        ax.add_patch(rect)

ax.scatter([img_size/2], [img_size/2], c='red', s=50, zorder=5)
ax.set_title(f'Anchors at centre position\n3 scales × 3 ratios = {n_anchors_per_pos}')
ax.grid(True, alpha=0.3)
plt.tight_layout(); plt.show()
```

3. 为一维分割（二元标注一维信号）实现一个带跳跃连接的简化 U-Net 编码器—解码器。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

def conv1d_same(x, kernel):
    """1D convolution with same padding."""
    k = len(kernel)
    pad = k // 2
    x_pad = jnp.pad(x, pad, mode='edge')
    n = len(x)
    out = jnp.zeros(n)
    for i in range(n):
        out = out.at[i].set(jnp.sum(x_pad[i:i+k] * kernel))
    return out

def downsample(x):
    return x[::2]

def upsample(x, target_len):
    return jnp.interp(jnp.linspace(0, 1, target_len), jnp.linspace(0, 1, len(x)), x)

def unet_1d(x, params):
    """Simplified 1D U-Net with 2 encoder/decoder levels."""
    # Encoder
    e1 = jnp.maximum(0, conv1d_same(x, params['enc1']))
    e1_down = downsample(e1)

    e2 = jnp.maximum(0, conv1d_same(e1_down, params['enc2']))
    e2_down = downsample(e2)

    # Bottleneck
    bottleneck = jnp.maximum(0, conv1d_same(e2_down, params['bottleneck']))

    # Decoder with skip connections
    d2_up = upsample(bottleneck, len(e2))
    d2 = jnp.maximum(0, conv1d_same(d2_up + e2, params['dec2']))  # skip connection

    d1_up = upsample(d2, len(e1))
    d1 = conv1d_same(d1_up + e1, params['dec1'])  # skip connection

    return jax.nn.sigmoid(d1)

# Create signal with labelled regions
n = 128
t = jnp.linspace(0, 4 * jnp.pi, n)
signal = jnp.sin(t) + 0.5 * jnp.sin(3 * t)
labels = (signal > 0.5).astype(jnp.float32)  # binary segmentation target

key = jax.random.PRNGKey(42)
keys = jax.random.split(key, 5)
params = {
    'enc1': jax.random.normal(keys[0], (5,)) * 0.3,
    'enc2': jax.random.normal(keys[1], (5,)) * 0.3,
    'bottleneck': jax.random.normal(keys[2], (3,)) * 0.3,
    'dec2': jax.random.normal(keys[3], (5,)) * 0.3,
    'dec1': jax.random.normal(keys[4], (5,)) * 0.3,
}

def loss_fn(params, signal, labels):
    pred = unet_1d(signal, params)
    return -jnp.mean(labels * jnp.log(pred + 1e-7) + (1 - labels) * jnp.log(1 - pred + 1e-7))

grad_fn = jax.jit(jax.grad(loss_fn))
lr = 0.05

for step in range(500):
    grads = grad_fn(params, signal, labels)
    params = {k: params[k] - lr * grads[k] for k in params}

pred = unet_1d(signal, params)

fig, axes = plt.subplots(3, 1, figsize=(12, 7), sharex=True)
axes[0].plot(t, signal, color='#3498db', linewidth=1.5)
axes[0].set_title('Input Signal'); axes[0].set_ylabel('Value')

axes[1].fill_between(t, 0, labels, alpha=0.3, color='#27ae60')
axes[1].set_title('Ground Truth Labels'); axes[1].set_ylabel('Label')

axes[2].plot(t, pred, color='#e74c3c', linewidth=1.5)
axes[2].fill_between(t, 0, (pred > 0.5).astype(float), alpha=0.2, color='#e74c3c')
axes[2].set_title('U-Net Prediction'); axes[2].set_ylabel('Probability')
axes[2].set_xlabel('t')

plt.tight_layout(); plt.show()
print(f"Final loss: {loss_fn(params, signal, labels):.4f}")
print(f"Pixel accuracy: {jnp.mean((pred > 0.5) == labels):.2%}")
```
