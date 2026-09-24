---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 12 - graph neural networks/01. geometric deep learning.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 232fe3a279001fc32a0ecbebe077e2a2ce61d168102ac250ca9717d06f06d083
status: reviewed
---
# 几何深度学习

*几何深度学习是揭示 CNNs、transformers 和 GNNs 为同一原则的统一框架：利用对称性。本文件涵盖了对称群、群作用、不变性、同变性、五个几何领域和尺度分离*

- 在这本书中，我们研究了许多架构：用于图像的 CNNs（第8章），用于语言的 transformers（第7章）和用于序列决策的 RL 策略（第6章）。这些看起来像是完全不同的模型，设计用于完全不同的问题。但有一个更深的模式。

- **几何深度学习**揭示了所有这些架构都是同一概念的实例：构建尊重数据对称性的网络。CNN 利用图像中的平移对称性。transformers 利用序列中的排列对称性（注意不依赖于绝对位置）。GNN 利用图中的排列对称性。一旦你看到这一点，这个动物园式的架构就变成了一个单一、 coherent 的框架。

## 对称性和群

- **对象的对称**是保持其不变的变换。一个正方形有 8 种对称：4 个旋转（0°、90°、180°、270°）和 4 个反射。一个圆有无限多：任何围绕中心的旋转。关键洞察是，对称告诉您什么不重要，了解什么不重要对于学习来说极其强大。

- 在 ML 角度：如果任务具有对称性，模型应该无论看到哪个“版本”输入时给出相同的答案。一只猫检测器应该在图像的左上角或右下角工作。这正是平移对称性。

- 对称通过 **群** 来形式化。一个群 $G$ 是一组变换，具有四个属性：

    - **封闭性**：结合两个变换给出另一个变换在集合中。旋转 90° 然后 90° 给出 180°，这也是在集合中的。
    - **交换律**：$(g_1 \circ g_2) \circ g_3 = g_1 \circ (g_2 \circ g_3)$。分组的顺序无关紧要（回想矩阵乘法的交换律来自第2章）。
    - **单位元**：有一个“不做任何事情”的变换 $e$ 使得 $e \circ g = g \circ e = g$。
    - **逆元**：每个变换都有一个反向操作：$g \circ g^{-1} = e$。

- 这些是向量空间（第1章）中矢量的相同公理，但针对变换而不是矢量。这种联系非常深刻：群在向量空间上作用，并且这个作用是神经网络必须尊重的。

- 在深度学习中出现的关键群有：

    - **翻译组** $(\mathbb{R}^n, +)$：图像或信号的平移。这是CNNs利用的对称性。
    - **对称组** $S_n$：所有$n$个元素的排列。这是GNNs和transformers利用的对称性（重新排列节点或标记不应改变结果）。
    - **旋转组** $SO(n)$：$n$维空间中的所有旋转。$SO(2)$是平面中的旋转，$SO(3)$是三维中的旋转（对于分子和3D视觉任务至关重要）。
    - **欧几里得群** $E(n)$：所有旋转、反射和平移。物理空间的对称性。
    - **特殊欧几里得群** $SE(n)$：旋转和平移（没有反射）。刚体运动的对称性。

- **群作用**描述了群如何变换数据。如果 $G$ 是一个群，$X$ 是一个数据空间，操作 $\rho: G \times X \to X$ 将每个群元素 $g$ 和数据点 $x$ 映射到一个新的点 $\rho(g, x)$。对于图像，变换群通过移动像素坐标来作用。对于图，对称群通过重新标记节点来作用。

## ##不变性和同态性

- 给定一个对称群，函数可以以两种重要方式与之关联：

- 一个函数 $f$ 对于一个群 $G$ 是 **不变的**，如果输出在输入被变换时不会改变：

$$f(\rho(g, x)) = f(x) \quad \text{for all } g \in G$$
- 示例：图像的总亮度在平移时不会改变。图像分类应该是平移不变的：猫无论坐在哪里，类别都是“猫”。

- 一个函数 $f$ 对于 $G$ 是 **等价的**，如果变换输入会相应地变换输出。

$$f(\rho_{\text{in}}(g, x)) = \rho_{\text{out}}(g, f(x)) \quad \text{for all } g \in G$$
- 示例：如果将图像向右移动5个像素，CNN中的特征图也会相应地向右移动5个像素。卷积操作是平移等价的：它保留了空间关系。对象检测应该也是等价的：如果猫移动了，边界框也应该跟着移动。

![不变性：输出在变换时保持不变。等变性：输出相应地进行变换。](../images/invariance_vs_equivariance.svg)


- 重要区别：**中间层**通常应该是等变的（在下游层保持结构），而**最终输出**应该是不变的（答案不应依赖于变换）。CNN通过堆叠等变卷积层，然后在末尾应用全局池化来实现这一点。

- 在架构中构建等变性远比从数据中学到它更高效。具有权重共享的翻译等变CNN需要少得多的参数，而必须独立学习“猫位于(10,10)”和“猫位于(200,150)”这样的信息的全连接网络则需要多得多的参数。对称约束将假设空间指数级减少。

## 五种几何域

- 几何深度学习识别数据的五个基本领域，每个领域都有其自身的对称群。每种神经网络架构都可以理解为利用这些领域的对称性。

![五种几何领域：网格、集合、序列、图和流形，各有其对称性和结构。](../images/five_geometric_domains.svg)


- **1. 网格（欧几里得数据）**：图像、音频频谱图和体积数据。基础结构是一个规则的网格，具有平移对称性。群是平移群（可能加上旋转和平移）。利用这种对称性的架构是CNN：卷积恰好是对齐于平移的操作。空间位置共享权重是平移不变性具象化。

- **2. 集合（无序集合）**：点云、粒子系统。对称是排列不变性：元素的顺序并不重要。架构是DeepSets（以及第8章中的PointNet）：对每个元素应用共享函数，然后使用排列不变性操作进行聚合（如求和、平均或最大值）。形式上，$f(\{x_1, \ldots, x_n\}) = \phi\left(\sum_i \psi(x_i)\right)$。

- **3. 序**序列（有序数据）：文本、时间序列。序列是1D网格，但有 twist：对称性更复杂。绝对位置可能或不可能重要。RNNs自回归处理序列。带有位置编码的transformers可以关注任何位置，并且它们的自我注意是对齐于排列（在添加位置编码之前）。这就是为什么transformers表现得如此出色：它们从排列不变性开始，只添加了足够的位置结构。

- **4. 图（关系数据）**：社交网络、分子、知识图谱。节点的对称性是重新排列节点不会改变图的性质。架构是 **GNN**：连接节点之间传递消息，使用共享函数，这些函数不依赖于节点的顺序。这是本章其余部分的重点。

- **5. 曲面和网格**: 表面，3D形状。对称包括微分同构（平滑变形）。架构使用内蕴操作符（例如拉普拉斯-贝尔特里尼），这些操作符由表面几何本身定义，与表面在空间中的嵌入方式无关。这与微分几何相关，并且对于形状分析、球面上的气候建模和蛋白质表面分析等具有重要意义。

- 这个框架的强大之处在于统一性。CNN 是网格图上的 GNN，Transformer 是全连接图上的 GNN，DeepSets 是没有边的 GNN。将这些视为同一原则的实例指导了新架构的设计：识别你的数据的对称性，并构建一个尊重这种对称性的网络。

## 分割和粗化尺度

- 实际世界的数据在多个尺度上具有结构。一幅图像有像素级的纹理、局部模式（边缘、角点）、物体部分（轮子、窗户）和全局结构（整个场景）。一个分子有原子级特征、功能组和整体分子形状。

- **结构分离**是这些层次的细节可以分层处理的原则：首先捕捉局部结构，然后逐步聚合到更粗略的表示。这是 **降级** 或 **池化**。

- 在卷积神经网络（CNNs）中，池化层（最大池化、平均池化）会降低空间分辨率，迫使更高层次捕捉更大尺度的模式。从 receptive field的角度来看（第8章），更深的层“看到”更多的图像。这正是尺度分离在起作用。

- 在图中，聚合意味着将节点分组到“超级节点”中，产生一个较小的图，同时保留其基本结构。这正是我们将在文件3中详细讨论的图池化。图像池化的类比是直接的：降低分辨率的同时保留重要特征。

- 在序列中，层次处理（例如句子 → 段落 → 文档）捕捉不同时间或语义尺度上的结构。 Swin Transformer（第 8 章）将这一概念应用于图像，通过其 shifted窗口层级来实现。

- 数学上，粗化定义了一种 **越来越抽象的表示层次**：

$$x \xrightarrow{\text{local features}} h^{(1)} \xrightarrow{\text{coarsen}} h^{(2)} \xrightarrow{\text{coarsen}} \cdots \xrightarrow{\text{global}} y$$
- 在每一层，表示都与该层的对称群相等价。最终全局表示不变，捕捉输入的本质，而不受无关变换的影响。

- 这种层次结构是为什么深度网络比浅层网络更适合处理结构化数据的原因：每一层都增加了一层抽象，而由许多同变的层组合起来可以构建出复杂不变特征从简单的局部特征中。

## 编程任务（使用 CoLab 或笔记本）

1. 验证卷积的平移不变性。应用一个图像的卷积，然后将图像向左或向右移动，再进行一次卷积。检查输出是否是平移后的版本。
```python
import jax
import jax.numpy as jnp

# 1D signal and a simple filter
signal = jnp.array([0, 0, 0, 1, 2, 3, 2, 1, 0, 0, 0], dtype=float)
kernel = jnp.array([1, 0, -1], dtype=float)

# Convolve then shift
conv_result = jnp.convolve(signal, kernel, mode="same")
shifted_signal = jnp.roll(signal, 3)
conv_shifted = jnp.convolve(shifted_signal, kernel, mode="same")
shifted_conv = jnp.roll(conv_result, 3)

print(f"Conv then shift:  {shifted_conv}")
print(f"Shift then conv:  {conv_shifted}")
print(f"Equivariant: {jnp.allclose(shifted_conv, conv_shifted, atol=1e-5)}")
```

2. 验证DeepSets风格聚合的置换不变性。对集合中的每个元素应用共享函数，求和结果，并检查输出是否与元素顺序无关。
```python
import jax
import jax.numpy as jnp

# A "set" of 4 vectors (order should not matter)
x = jnp.array([[1.0, 2.0], [3.0, 4.0], [5.0, 6.0], [7.0, 8.0]])

# Simple shared function: element-wise square
psi = lambda v: v ** 2

# Aggregate by sum
def deepsets(points):
    return jnp.sum(jax.vmap(psi)(points), axis=0)

# Original order
result1 = deepsets(x)

# Permuted order
perm = jnp.array([2, 0, 3, 1])
result2 = deepsets(x[perm])

print(f"Original order:  {result1}")
print(f"Permuted order:  {result2}")
print(f"Invariant: {jnp.allclose(result1, result2)}")
```

3. 探索群结构。验证2D旋转矩阵形成群，通过检查封闭性、结合律、单位元和逆元来实现。
```python
import jax.numpy as jnp

def rot2d(theta):
    return jnp.array([[jnp.cos(theta), -jnp.sin(theta)],
                       [jnp.sin(theta),  jnp.cos(theta)]])

R1 = rot2d(jnp.pi / 6)
R2 = rot2d(jnp.pi / 4)
R3 = rot2d(jnp.pi / 3)

# Closure: product of two rotations is a rotation
R12 = R1 @ R2
print(f"Closure (det=1, orthogonal): det={jnp.linalg.det(R12):.4f}, "
      f"R^T R = I: {jnp.allclose(R12.T @ R12, jnp.eye(2), atol=1e-5)}")

# Associativity
print(f"Associative: {jnp.allclose((R1 @ R2) @ R3, R1 @ (R2 @ R3), atol=1e-5)}")

# Identity
I = rot2d(0.0)
print(f"Identity: {jnp.allclose(R1 @ I, R1, atol=1e-5)}")

# Inverse
R1_inv = rot2d(-jnp.pi / 6)
print(f"Inverse: {jnp.allclose(R1 @ R1_inv, jnp.eye(2), atol=1e-5)}")
```
