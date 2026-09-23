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

*目标检测回答图像中有什么以及在哪里，分割进一步为像素分配语义。本篇覆盖 IoU、非极大值抑制、锚框、检测器、语义/实例分割和评估指标。*


*对象检测定位并分类图像中的每个对象;分区为每个像素指定了标签. 此文件涵盖IoU,mAP,锚盒,R-CNN家族,YOLO,SSD,地物金字塔网络,语义/内置/泛光学分解(U-Net,Mask R-CNN,SAM),以及基准参数. *

- 图像分类(文件02)回答"这个图像是什么?". 物体检测提出了更难的问题:"这个图像中哪些物体,它们在哪里?"

- 分解更进一步:"哪个像素属于哪个对象或类别?" 这些任务构成了空间理解越来越精确的分层.

- ** 物体探测** 模型输出一组**行框**,每组由四个坐标所定义(左上角)$x, y$,宽度,高度)和有自信分数的类标签. 单一的图像可能包含零,一,或来自多类的数百个对象.

![包含多个对象的输入图像,每个图像由带有类标签和置信分数的有色边框包围](../images/detection_boxes.svg)

- **交并比（Intersection over Union, IoU）** 衡量预测边界框与真实标注的重合程度，定义为交集面积除以并集面积：

$$\text{IoU} = \frac{\text{Area of Intersection}}{\text{Area of Union}}$$

- 1的IoU表示完美的重叠;0的IoU表示完全没有重叠. "正确"检测的标准阈值是IoU$\geq 0.5$尽管也使用了更严格的阈值(0.75和0.9)。

- 如果其有地真盒的IOU超过阈值,且类数正确,则检测为**真正(TP)**.

- **假阳性（FP）** 是预测出的边界框，但它与任何真实标注都不匹配。

- ** 假阴性(FN)** 是一个没有预测匹配的地基真物. 这些概念与第06章的精确性/回顾性相同。

- ** 精度(AP)** 概括了一类的检测质量。对于每个等级,根据信任分数排列所有检测,计算精度和回想,并计算精度回想曲线下的区域:

$$\text{AP} = \int_0^1 p(r) \, dr$$

- 在实践中,曲线被内插:在每个召回级别上,精确度设定为任何召回时的最高精度$\geq r$。。。这使得曲线平滑并单调地减弱.

- ** 指所有类别的平均精度。"mAP@0.5"使用IoU阈值0.5. "("mAP@[5:.95]" (COCO标准)) 平均mAP在0.05级的0.5到0.95级的10个IoU阈值以上,奖励了检测和精确定位.

- ** 非最大剂量的抑制** 消除了重复检测。当一个模型为同一个对象预测出多个相重叠的框时,NMS会保留最自信的框并去除所有在IoU阈值上方与之相重叠的其他框. 在模型产生生动预测后,每个类都采用这个方法.

- ** 两阶段探测器**首先提出候选区域,然后对每项提案进行分类和完善。

- **R-CNN**(Girshick等,2014年)是第一个成功的深层学习探测器. 它使用选择性搜索(一种古典算法)来提出~2,000个候选区域,将每个区域扭曲到固定大小,通过CNN独立运行,并以SVM进行分类(第06章). R-CNN准确但极其缓慢:它运行了CNN每幅图像的2000次.

- ** Fast R-CNN**(Girshick,2015年)解决了冗余问题,在整张图像上运行了一次CNN来制作一个共享的地物图,然后用**RoI Collection**(利息集合注册)从该共享地图中提取出每个提案的特性.

- RoI Collection通过特性图的一个可变大小的区域,并通过将区域分为网格和每个单元格内最大集合来产生固定大小的输出. 这要快得多,因为昂贵的CNN计算只发生一次.

- ** Faster R-CNN**(Ren等,2015年)通过引入**Region提议网络(RPN)**,取消了外部区域提议算法,这个小型有线电视新闻网运行在共享地物图上并直接预测提议. RPN 在特性映射图上滑出一个小窗口,并在每个位置预测$k$提案(每个**箱各一个)。

![更快的 R-CNN 管道:输入图像 → 主干线CNN → 共享特征图 → RPN生成建议书 → RoI 集合 → 分类和框回归头](../images/faster_rcnn.svg)

- ** 锁定框** 是特征图每个空间位置的预先界定的边框,涵盖不同的尺度和方相比(例如:三个尺度)$\times$3个比率=每个职位9个锚). RPN预测每个主播有两件事:一个对象分数(object vs背景)和坐标相抵来将主播精炼成更紧的建议书. 这种偏移使回归问题变得容易:网络不但没有预测绝对坐标,反而预测一个合理的起动框会有小的调整.

- 主机的偏移情况如下:

$$t_x = \frac{x - x_a}{w_a}, \quad t_y = \frac{y - y_a}{h_a}, \quad t_w = \log\frac{w}{w_a}, \quad t_h = \log\frac{h}{h_a}$$

- 地点$(x, y, w, h)$是预测的盒子中心和大小,以及$(x_a, y_a, w_a, h_a)$是锚。宽度和高度的日志转换保证了预测的框总是正的并使得回归尺度变异.

- 多任务损失的快速R-CNN列车:分类损失(从第05章开始为分级标签),外加"回放"收录出**smooth L1损失**. 平滑 L1 对外线的敏感度比L2低:

```math
\text{smooth}_{L1}(x) = \begin{cases} 0.5x^2 & \text{if } |x| < 1 \\ |x| - 0.5 & \text{otherwise} \end{cases}
```

- ** Feature Pyramid Networks (FPN)**(Lin等,2017年)解决了多尺度问题,通过自上而下的道路与平面连接,将高层次的语义与低层次的空间细节相融合. 骨干在多尺度上生成地物图(每个集合层将分辨率减半). FPN增加了自上而下路径,每个关卡都会从上面的关卡中接收到被取出被取出被取出被取出被取出被取出被取出被取出被取出被取出被取出,并通过平面1x1分化而与相应的自下而上关合并. 结果形成了地物图的金字塔,每个都具有强烈的语义和良好的空间分辨率.

- 小型物体从金字塔的较高分辨率水平被检测出;大型物体从较低分辨率水平被检测出. FPN现在是大多数现代检测架构中的标准组件.

- ** 1级探测器** 完全跳过提议步骤,预言类标签和一通的接框。这比两相探测器更快,但历史上的准确度低于两相探测器,直到焦距减少才弥补了缺口。

- ** YOLO** (You Only Look once, Redmon等, 2016年)将图像分为:$S \times S$网格。每个网格单元格预测$B$边框和$C$阶级概率。如果一个物体的中心掉入网格细胞,该细胞负责检测. YOLO极快,因为整个探测器是单向前传,没有建议阶段.

- ** YOLOv2** 增加了锚盒、分批正常化和多规模培训。** YOLOv3**使用地物金字塔网络,并按三个尺度预测. ** YOLOv4-v8** 继续改进,采用更好的主干、路径汇总网络和镶嵌式数据增强(在培训期间将四个图像放在一起,以增加背景多样性)。

- **SSD**(Single Shot多Box探测器,刘等2016年)在主干内部的多功能映射尺度上进行预测,使用每个尺度的锚盒. 早期(高分辨率)地物图能探测出小物体;后期(低分辨率)地物图能探测出大物体. SSD快于具有竞争性精度的更快R-CNN.

- ** RetinaNet**(Lin等,2017年)查明了单相探测器的核心问题:阶级不平衡. 绝大多数锚盒与背景相匹配,这些背景产生容易的负数,在损失中占据主导地位并压倒了从罕见的正数例子所形成的梯度.

- ** 家庭损失** 通过轻而易举的例子解决了这一问题:

$$\text{FL}(p_t) = -\alpha_t (1 - p_t)^\gamma \log(p_t)$$

- 地点$p_t$是正确分类的预测概率。当模型是自信和正确的($p_t$是高处的,$(1 - p_t)^\gamma$减少损失的负值。超参数$\gamma$(典型的2个)控制了下重的强度. 与$\gamma = 0$,焦损减为标准的交叉收缩. 随着焦距的减少,RetinaNet实现了精确度可与单相相仿的两相探测器.

- ** 无锚地探测** 完全去除锚盒,减少超参数调取并简化管道。

- **FCOS** (Fully Civilal One-Stage, Tian等, 2019)在地物图的每个空间位置上预测出从该位置到最近的边框(左,上,下)四面的距离并加上一个类标签. 一个**中心**在远离物体中心的地方得分下重的预测,提高了质量. FCOS使用FPN处理多级天平.

- ** CenterNet**(Zhou等,2019年)检测出物体为点:它预测出一个热图,峰值与物体中心相对应,然后在每一峰值上反射出宽度和高度. 检测成为关键点估计。这是优雅和无锚地的,但需要小心的加热后处理.

- ** CornerNet ** 检测对象为相对角(上-左和下-右). 它预测出两个热图(每个转角类型一个),并使用**关联嵌入**来匹配相应的转角入入边框. 这避免了锚和处理任意形状物体的需要.

- ** 语义分解** 为图像中的每个像素指定了类标签. 与检测(输出框)不同,分块生成密集的像素级地图. 街道场景可能将每个像素标为道路,人行道,汽车,行人,建筑,天空等.

![语义分割:输入街道场景及其像素级标签地图,其中每种颜色代表一个类](../images/semantic_segmentation.svg)

- ** Fully Curval Networks (FCN)**(Long等,2015年)将分类CNN进行分层化改造,将全相接的地层取而代之,使网络能够输出出空间图而不是单一的类. Upsampling(通过移植的会卷积或双线性插入)将输出恢复到输入分辨率. 从更早的地层跳过连接后添加了在下采样过程中丢失的空间细节.

- ** 转换的革命**(有时被称作"分裂")是革命的反面例子. 平分的卷积会减少空间维度, 转换的卷积会增加空间维度。它在输入元素之间插入了零,然后应用了标准卷积,有效地学习如何取出上下文.

- **U-Net**(Ronneberger等,2015年)引入了对称的编码器-解码器架构,每个级别都有跳过连接. 编码器(收缩路径)在增加频道的同时会降低空间分辨率,完全像一个分类的CNN. 解码器(扩展路径)向后提升到完全分辨率. 跳过连接concatenate编码器特性图,并配有分解码器特性图,为分解器提供细微的空间细节. 这种高层次语义和低层次细节的结合产生了尖锐,准确的分解界限.

![U-Net 架构:左边有下采样的编码器路径,右边有上取样的解码器路径,并跳过连接接合相应关卡](../images/unet_architecture.svg)

- U-Net最初是为生物医学图像分解(培训数据稀缺)而设计的,其架构已成为许多后续模型的基础,包括潜在扩散模型中的U-Net (file 04).

- ** DepepLab**(Chen等,2014-2018年)为分化引入了两项关键创新:

    - ** Atrous (dilated) convolution**:在滤波元素之间插入缺口,由dilation 速率所控制的标准分解$r$。。。3x3 有扩展功能的过滤器$r$拥有一个可接受领域:$(2r + 1) \times (2r + 1)$,而只使用9个参数。这在多个尺度上捕捉上下文,而不进行下取样,保持了空间分辨率.

    - ** Atrous Space Pyramid Pooling (ASPP)**:应用多层等分化,并平行地进行不同分化速率(如速率1,6,12,18),使结果收缩,并用一×1相分化的引信. ASPP同时在多个尺度上捕捉上下文,精神上与Inception模块相类似(文件02),但使用Dilation来代替不同的内核大小.

- DeepLab还用了**有条件的随机场(CRF)**(第05章)作为后处理步骤来细化分区界限,鼓励相邻相近的有相

- **Instad分解**结合了检测和分解:它识别出每个单个对象实例,并为每个物体生成一个像素级口罩. 场景中的两辆车获得两个相隔相隔的口罩,而不只是为两者提供"车".

- **Mask R-CNN**(He等,2017年)通过增加一个小分头来延长快取R-CNN,预言每个被检测出物体的二进制口罩. 架构为更快捷的R-CNN+一个口罩分支:口罩分支取自RoI集合特性并输出a$m \times m$每班二进制口罩. 它使用**RoIAlign**而不是RoI集合:在精确被采样点上比线性插入而不是分量化的网格细胞,这避免了分量化导致的空间错配. 这一小的改变显著地提高了口罩的质量.

- Mask R-CNN通过多任务损失的训练:分类损失+盒式回归损失+口罩损失(每像素二进制交叉收缩). 口罩分支为每个类独立预测口罩;只使用与所预测的类相对应的口罩,将口罩与分类相隔开来掩盖了预测,并改进了两者.

- ** 光学分解** 将语义和实例分解统一为一个单一任务。每个像素都同时获得一个类标签(语义)和一个实例ID(Intance,用于汽车和人等"事物"类). "Stuff"类(天空,道路,草地)只获得语义标记,因为它们是无可计数的例子的无形态区域.

- 泛光学质量(PQ)衡量标准通过分解成分解质量(对应分的IoU平均分)和识别质量(对应分的F1分)来评价这一点:

$$\text{PQ} = \underbrace{\frac{\sum_{(p,g) \in \text{TP}} \text{IoU}(p,g)}{|\text{TP}|}}_{\text{SQ}} \times \underbrace{\frac{|\text{TP}|}{|\text{TP}| + \frac{1}{2}|\text{FP}| + \frac{1}{2}|\text{FN}|}}_{\text{RQ}}$$

- ** 对自主驱动和增强现实等应用程序而言,实时分解**至关重要,因为这些应用程序的延迟预算很紧(往往每帧不到30毫秒)。

- ** BiseNet**(双边分块网,于等等,2018年)使用两条平行路径:一条有宽浅地层的**空间路径,保留了空间细节;一条有深窄地层的**通文路径,捕捉语义. 产出被接通,既能加快速度,又能准确。

- ** DDRNet**(深双决议网,Hong等,2021年)在整个网络中维持两个不同决议的分处,它们之间反复交流信息。高分辨分支保留了空间细节,而低分辨分支则捕捉到全球背景. 多个双边聚变模块将信息双向合并.

- 实时分解的一般趋势是避免重编码器-解码器模式,而是在整个网络中保持足够的空间分辨率,以一定的精度来换取惊人的低空.

## 编程任务（使用 Colab 或 notebook）



1. 从零开始实施IoU计算和非最大抑制。将 NMS 应用到一组相重叠的边框并可视化结果.
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

2. 实施简化的区域提议网络。给定一个特征映射,以多尺度和侧面比生成锚盒,并预测对象分数和框相抵消.
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

3. 执行一个简化的U-Net编码器-解码器,并带有1D分区的跳过连接(一D信号的二进制标签).
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
