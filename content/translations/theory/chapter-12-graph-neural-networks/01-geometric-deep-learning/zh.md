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

*几何深度学习把对称性、不变性和等变性作为设计神经网络的原则。本篇覆盖群作用、五类几何域、尺度分离与粗化，并连接到图、点云和网格数据。*


* 几何深度学习是显示CNN、变压器和GNN作为同一原则的例子的统一框架:利用对称性。此文件涵盖对称组,群动作,偏差,等分,五相几何域,以及比例分隔*

- 在整个书中,我们研究了许多架构:有线电视新闻网的图像(第8章),变形器的语文(第7章)和RL政策的相继决定(第6章)。这些看起来完全不同的模型是针对完全不同的问题设计的. 但有一个更深层次的模式。

- ** 几何深度学习** 揭示出所有这些架构都是相同想法的例子:建立尊重数据**同义**的网络。CNN利用图像中的翻译对称性. 变形器在序列中利用通相对称(意向不取决于绝对位置). GNNs在图中利用通相对称. 一旦你看到这个, 建筑的动物园变成了一个单一的,连贯的框架。

## 对称性与群



- 物体的**对称**是使其不变的变相. 一个广场有8个对称:4个旋转(0°,90°,180°,270°)和4个反相. 一个圆圈有无数个: 任何关于它的中心的旋转。关键的观点是,对称性告诉你什么不重要,知道什么无关紧要对于学习来说是非常强大的。

- 在ML术语中:如果一个任务有对称性,无论它看到的输入的"版本"是哪一种,模型都应该给出相同的答案. 猫的探测器应该工作 无论猫在图像的上-左或下-右. 这就是翻译对称。

- 共鸣被正式化为**群**. 一组$G$是一个具有四个属性的转换组:

    - ** Closure**:结合两个变换,使组合中出现另一个变换. 旋转90°再旋转90°得到180°,这在集中也是.
    - ** 协会**:$(g_1 \circ g_2) \circ g_3 = g_1 \circ (g_2 \circ g_3)$。。。分组顺序并不重要(从第二章中回顾矩阵乘法的关联性)。
    - ** 身份**:有"无所事事"的转变$e$这样的话$e \circ g = g \circ e = g$.
    - ** 反向**:每个转变都有一个倒数:$g \circ g^{-1} = e$.

- 这些与向量空格(第一章)相同,但用于转换而不是向量. 联系是深层的:团体在向量空间上行动,而这一行动是神经网络必须尊重的.

- 在深入学习中出现的关键群体:

    - ** 翻译组**$(\mathbb{R}^n, +)$: 移动图像或信号。这就是CNN利用的对称性.
    - ** 对称组**$S_n$: 所有布局$n$元素。这就是GNNs和变压器所利用的对称性(重排节点或道具不应改变结果).
    - ** 轮调组**$SO(n)$: 所有旋转$n$- 维空间。$SO(2)$是飞机上的旋转,$SO(3)$是3D中的旋转(分子和3D视觉任务的关键)。
    - ** 欧克利德语组**$E(n)$:所有旋转,反想,和翻译. 物理空间相对.
    - ** 特别欧几利得集团**$SE(n)$: 旋转和翻译(无反省). 硬体运动的对称性.

- 一个 ** 组动作** 描述一个组如何转换数据. 若为$G$是一个团体,$X$是数据空间, 动作$\rho: G \times X \to X$映射每个组元素$g$和数据点$x$切换到转换点$\rho(g, x)$。。。对于图像,翻译组通过移位像素坐标来进行动作. 对于图,对称组通过重新给节点贴上标签来进行.

## 不变性与等变性



- 鉴于一个对称组,一个函数可以两个重要方式与之相联:

- 一个函数$f$属于一个集团的**invatant**$G$如果输入转换时输出不改变:

$$f(\rho(g, x)) = f(x) \quad \text{for all } g \in G$$

- 示例:一幅图像的全亮度如果移动图像则不会改变. 图像分类应该为翻译-变相:无论猫坐在哪里,类"猫"都是一样的.

- 一个函数$f$等价**为$G$如果转换输入以相应方式改变输出:

$$f(\rho_{\text{in}}(g, x)) = \rho_{\text{out}}(g, f(x)) \quad \text{for all } g \in G$$

- 示例:如果将一幅图像右移为5像素,CNN中的特征图也右移为5像素. 卷积操作为翻译-等同:它保持了空间关系. 对象检测应当等同:如果猫会移动,则被绑定的盒子应该随它移动.

![变相:不管变相,输出都保持不变. 等效:输出相应变换](../images/invariance_vs_equivariance.svg)

- 区分事项:**中间层**一般应当是等同的(为下游地层保留结构),而**最后产出**则应当不相干(答案不应取决于转变)。CNN通过堆放等分的相生层来达到这个目的,然后在结尾处应用全球集合(这是无变相的).

- 建筑结构中的等同性比从数据中学习要高效得多。一个能分享重量的翻译-等同的CNN需要比一个完全连接的网络要少得多的参数,这个网络必须独立地学习"猫在位置(10,10)"和"猫在位置(200,150)". 对称的制约使假说空间指数地减小.

## 五类几何域



- 几何深度学习确定了**5个基本领域**数据,每个领域都有自己的对称组. 每一个神经网络架构都可以被理解为利用其中一个域的对称性.

![5个几何域:网格、套接字、相序、图和多相,每个都具有自己的对称和架构](../images/five_geometric_domains.svg)

- 缩写:A/CN.9/WG.III/WP.96。网格 (欧克利得数据)**:图像,音频分光谱,量子数据. 基础结构为有翻译对称性的正格网. 组是翻译组(外加可能的轮回和反思). 利用这种对称性的建筑是**CNN**:卷积正是相当于翻译的操作. 不同空间位置的重量共享是翻译等效制成的混凝土。

- **2 (中文(简体)). 集(无序集)**:点云,粒子系统. 对称性是通相的无常:元素的顺序无关紧要. 架构为**Depetz**(并取自第8章的PointNet):对每个元素应用一个共享函数,再以通量-变量操作(和数,正数,或最大数)进行聚合. 形式上$f(\{x_1, \ldots, x_n\}) = \phi\left(\sum_i \psi(x_i)\right)$.

- **3 , (中文(简体)). 序列(顺序数据)**:文本,时间序列. 花序为1D的网格,但有扭矩:对称性更细微. 绝对地位可能或不会重要。RNNs处理序列自动递归. 有位置编码的变形器可以处理任何位置,它们的自取是等同于活化(在添加位置编码之前). 这就是为什么变压器能如此的通俗化:它们开始具有平整-等分性,并且只是添加了足够多的位置结构.

- **4 (中文(简体)). 图表(关系数据)**:社交网络,分子,知识图. 对称是结点的通接:重新给结点贴上标签不应改变图的属性. 该架构为**GNN**:消息在连接节点之间传递,使用共享的功能不依赖于节点命令. 本章其余部分的焦点就是此.

- **5 (中文(简体)). 马尼弗斯和梅舍斯**:表面,3D形状. 对称性包括二相变形(smooth deform). 该架构使用由地表几何本身定义的内在操作符(如:Laplace-Beltrami),独立于地表嵌入空间的方式. 这与差分几何相关,并与形状分析,球体气候建模,蛋白质地表分析有关.

- 这个框架的力量就是统一. CNN是网格图上的GNN. 变压器是全相通图上的GNN. DeepSets是一个没有边际的GNN. 将这些作为同一原则的例子来看待,指导了新架构的设计:识别您数据的对称性,并建立一个尊重它的网络.

## 尺度分离与粗化



- 现实世界数据具有多尺度的结构. 图像有精细的纹理(像素等位),局部图案(尖端,角),物体部件(轮子,窗口)和全局结构(整个场景). 分子具有原子级特征,功能组,并有整体分子形状.

- ** 规模分离**是这些详细程度可以按等级处理的原则:首先捕捉出局部结构,然后逐渐地汇总为相近的表示. 这是**穿梭** 或**拼接**。

- 在有线电视新闻网中,集合层(最大集合,平均集合)对空间分辨率进行下图,迫使高层捕捉出更大规模的模式. 在可接受的字段视图(第8章)中,更深层"见"更多图像. 这是规模分离行动。

- 在图中,同心合指将节点组成"超节点",生成一个能保留基本结构的更小的图. 这是图集,我们将在文件3中详细叙述。图像集合的类比是直接的:在保留重要特征的同时降低分辨率.

- 按顺序,分级处理(例如句子-段-文档)捕捉不同时间或语义尺度的结构. "斯温变形器"(第8章)将这个想法应用于其窗口分级变化的图像.

- 数学上,收缩定义了日益抽象的表达**的等级**:

$$x \xrightarrow{\text{local features}} h^{(1)} \xrightarrow{\text{coarsen}} h^{(2)} \xrightarrow{\text{coarsen}} \cdots \xrightarrow{\text{global}} y$$

- 在每一职等,代表人数与该职等对称组相等。最终的全球代表性不尽相同,捕捉投入的精髓,而不对无关的转变敏感.

- 这种分级制是深层网络比浅层网络对结构化数据更起作用的原因:每层都增加了一层抽象,许多等分层的构成从简单的局部地层中积累出复杂的不相干特征.

## 编程任务（使用 Colab 或 notebook）



1. 校验翻译是否等同卷积。将一个卷积应用到一个图像上,然后转换图像并再转动. 检查输出是否相互转换版本。
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

2. 校验 Depsets 类聚合的变相。将一个共享函数应用到一个集合的每个元素,对结果进行总和,并检查输出是否相同,无论元素顺序如何.
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

3. 探索组群结构. 通过检查关闭、关联性、身份和反向,验证2D旋转矩阵组成一个组。
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
