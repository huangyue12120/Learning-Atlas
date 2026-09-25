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

*几何深度学习以对称性为共同原则，将 CNN、Transformer 和 GNN 联系起来。本篇介绍对称群、群作用、不变性与等变性、五类几何数据，以及尺度分离。*

- 本书介绍过许多架构：处理图像的 CNN（第 8 章）、处理语言的 Transformer（第 7 章），以及用于序列决策的强化学习（RL）策略（第 6 章）。它们看起来各不相同，适用于不同的问题，但背后有一个共同思路。

- **几何深度学习**把这些架构归结为同一个做法：构建能利用数据对称性的网络。CNN 利用图像的平移对称性；Transformer 在不加入位置信息时，对词元置换具有等变性；GNN 利用图的节点置换对称性。这样看，原本各不相同的架构就能放进同一框架中理解。

## 对称性与群

- **对象的对称变换**是使对象保持不变的变换。正方形有 8 种对称变换：4 种旋转（0°、90°、180°、270°）和 4 种反射。圆有无穷多种对称变换：绕圆心旋转任意角度都不会改变它。对称性揭示哪些变化不影响对象；在学习任务中，利用这一点可以减少模型需要处理的差异。

- 从机器学习的角度看，如果任务具有某种对称性，那么输入经过相应变换后，模型应给出相同答案。例如，无论猫出现在图像左上角还是右下角，猫分类器都应识别出“猫”。这里对应的是平移对称性。

- **群**是对称变换的代数描述。群 $G$ 是一个变换集合，满足以下四条性质：

    - **封闭性**：集合中任意两个变换的复合仍属于该集合。例如，旋转 90° 两次等于旋转 180°，结果仍在集合中。
    - **结合律**：$(g_1 \circ g_2) \circ g_3 = g_1 \circ (g_2 \circ g_3)$。变换复合时，改变括号的位置不会改变结果；矩阵乘法也满足结合律（第 2 章）。
    - **单位元**：存在一个“不做任何变换”的元素 $e$，使得 $e \circ g = g \circ e = g$。
    - **逆元**：每个变换 $g$ 都有一个逆变换 $g^{-1}$，使得 $g \circ g^{-1} = e$。

- 这些性质也适用于向量空间中的向量加法：向量在加法下构成阿贝尔群。群可以作用在向量空间上，神经网络需要按任务要求保留这种作用下的结构。原文将群公理概括为向量空间的公理；严格来说，向量空间还要求满足标量乘法等额外公理。

- 深度学习中常见的群包括：

    - **平移群** $(\mathbb{R}^n, +)$：表示图像或信号的平移，是 CNN 利用的对称性。
    - **置换群** $S_n$：由 $n$ 个元素的所有排列组成。GNN 和 Transformer 会利用置换对称性；重新编号节点或重排词元，不应改变相应的图或序列含义。
    - **旋转群** $SO(n)$：表示 $n$ 维空间中的所有旋转。$SO(2)$ 表示平面旋转，$SO(3)$ 表示三维旋转；它们在分子建模和三维视觉中很重要。
    - **欧几里得群** $E(n)$：包含所有旋转、反射和平移，描述物理空间的对称性。
    - **特殊欧几里得群** $SE(n)$：包含旋转和平移，不含反射，描述刚体运动的对称性。

- **群作用**描述群元素如何变换数据。若 $G$ 是一个群，$X$ 是数据空间，那么作用 $\rho: G \times X \to X$ 会把群元素 $g$ 和数据点 $x$ 映射为变换后的点 $\rho(g, x)$。对图像来说，平移群作用于像素坐标；对图来说，置换群可以重新标记节点。

## 不变性与等变性

- 函数与对称群之间有两种重要关系。

- 若输入经过群 $G$ 中的变换后，函数 $f$ 的输出不变，则称 $f$ 对 $G$ **不变**：

$$f(\rho(g, x)) = f(x) \quad \text{for all } g \in G$$

- 例如，在不裁掉像素的平移下，图像的总亮度不变。图像分类通常也应对平移不变：无论猫出现在图像的哪个位置，分类结果都应是“猫”。

- 若输入变换后，函数 $f$ 的输出也按对应方式变换，则称 $f$ 对 $G$ **等变**：

$$f(\rho_{\text{in}}(g, x)) = \rho_{\text{out}}(g, f(x)) \quad \text{for all } g \in G$$

- 例如，图像向右平移 5 个像素后，CNN 的特征图也相应向右平移 5 个像素。卷积对平移等变，会保留空间位置关系。目标检测也应具有这种性质：猫移动后，对应的边界框也应移动。

![不变性：输出不随输入变换而改变。等变性：输出随输入以对应方式变换。](../images/invariance_vs_equivariance.svg)

- 两者的区别在于：**中间层**通常应当等变，以便把结构信息传给后续层；若任务标签不随输入变换而变，**最终输出**就应当不变。CNN 可以先堆叠等变卷积层，再用全局池化得到不变的输出。

- 把等变性直接写进架构，通常比让模型仅从数据中学会它更省参数。共享权重的平移等变 CNN，不必分别学习“猫在位置 (10, 10)”和“猫在位置 (200, 150)”这两种情况。这样的对称性约束会大幅缩小模型需要探索的假设空间。

## 五类几何数据

- 几何深度学习把数据归为五类基本领域，每类都有相应的对称群。许多神经网络架构可以理解为利用了其中某一类数据的对称性。

![五类几何数据：网格、集合、序列、图和流形，各自具有相应的对称性与结构。](../images/five_geometric_domains.svg)

- **1. 网格（欧几里得数据）**：图像、音频频谱图和体数据都可表示为规则网格，通常具有平移对称性；也可能考虑旋转和反射。CNN 利用这种结构：卷积对平移等变，而在不同空间位置共享权重则是其具体体现。

- **2. 集合（无序数据）**：点云和粒子系统都可以表示为集合。集合元素的排列不应影响结果，因此需要排列不变性。DeepSets（以及第 8 章介绍的 PointNet）会对每个元素应用共享函数，再用求和、平均或最大值等排列不变操作聚合结果。形式上，$f(\{x_1, \ldots, x_n\}) = \phi\left(\sum_i \psi(x_i)\right)$。

- **3. 序列（有序数据）**：文本和时间序列都属于这一类。序列可以看作一维网格，但位置是否重要取决于任务。RNN 按顺序自回归地处理序列。加入位置编码后，Transformer 可以关注各个位置；在加入位置编码之前，自注意力对词元置换是等变的。位置编码为模型提供了足以区分顺序的信息。

- **4. 图（关系数据）**：社交网络、分子和知识图谱都可以表示为图。重新编号节点不应改变图本身的性质，而节点级输出应随节点置换相应调整。GNN 在相连节点之间传递消息，并使用不依赖节点顺序的共享函数。本章其余部分将重点介绍 GNN。

- **5. 流形与网格**：曲面和三维形状可视为流形或网格。这里的对称性包括微分同胚，即光滑变形。相关架构会使用由曲面自身几何定义的内蕴算子，例如拉普拉斯–贝尔特拉米算子；这些算子不依赖曲面如何嵌入外部空间。这类方法与微分几何相关，可用于形状分析、球面气候建模和蛋白质表面分析。

- 这一框架把多种架构联系起来：可以把 CNN 看作网格图上的 GNN，把 Transformer 看作全连接图上的 GNN，把 DeepSets 看作没有边的 GNN。设计新架构时，可以先识别数据的对称性，再让网络保留这种结构。

## 尺度分离与粗化

- 现实数据通常同时包含多个尺度的结构。图像中既有像素级纹理，也有边缘、角点等局部模式、车轮和窗户等物体部件，以及完整场景这样的全局结构。分子则包含原子特征、官能团和整体分子形状。

- **尺度分离**指按层次处理不同细节：先捕捉局部结构，再逐步聚合为更粗的表示。这一过程称为**粗化**或**池化**。

- 在 CNN 中，最大池化或平均池化会降低空间分辨率，使更深层捕捉更大尺度的模式。从感受野的角度看（第 8 章），层数越深，特征就能综合图像中越大范围的信息。这就是尺度分离的体现。

- 在图中，粗化会把若干节点聚成“超节点”，形成规模更小、同时保留关键结构的图。这就是图池化，第 3 篇将详细介绍。它与图像池化相似：降低分辨率，同时保留重要特征。

- 在序列中，句子 → 段落 → 文档这样的层次处理，可以捕捉不同时间或语义尺度上的结构。第 8 章的 Swin Transformer 则通过移位窗口构成的层级，把这一思路用于图像。

- 从数学上看，粗化会形成一个逐层抽象的表示层次：

$$x \xrightarrow{\text{local features}} h^{(1)} \xrightarrow{\text{coarsen}} h^{(2)} \xrightarrow{\text{coarsen}} \cdots \xrightarrow{\text{global}} y$$

- 每一层的表示都应对该层对应的对称群等变；最终的全局表示则应当不变，从而提取输入的关键信息，而不受无关变换影响。

- 对结构化数据来说，深层网络可以逐层形成更抽象的表示。多个等变层组合后，模型能从简单的局部特征中构建复杂的不变特征。

## 编程任务（使用 Colab 或笔记本）

1. 验证卷积的平移等变性。对图像卷积，再平移图像并重新卷积，检查两次卷积结果是否也相应平移。原文代码使用一维信号作演示。

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

**说明：**原文代码对比整个输出数组。`mode="same"` 的零填充与 `jnp.roll` 的循环移位在边界处采用不同约定，因此全数组比较可能失败；若要验证等变性，应忽略受边界影响的位置，或统一边界处理方式。

2. 验证 DeepSets 式聚合的排列不变性。对集合中的每个元素应用同一个函数，将结果相加，再检查元素顺序是否影响输出。

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

3. 探索群结构。用二维旋转矩阵检查封闭性、结合律、单位元和逆元。

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

**说明：**这段代码用几个具体角度做数值检查，适合帮助理解群公理，但有限个样例本身不能证明所有二维旋转矩阵都满足这些性质。
