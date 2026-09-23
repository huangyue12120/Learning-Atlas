---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 01 - vectors/05. basis and duality.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: aecbf0a19ef6ef139ef07ccb978b9760cd5c40c0852729313244238cdd70fedc
status: reviewed
---
# 基与对偶性

*基定义向量空间的坐标系，对偶性揭示线性函数如何作用于向量。本篇介绍线性无关、张成集、换基、对偶空间和余向量，以及它们与 PCA、特征变换和注意力查询的关系。*


*Bases定义了向量空间的坐标系统,二元性揭示了线性函数如何对向量作用. 该文件涵盖线性独立、跨套、基数变化、双重空间和相思者、常设仲裁法院背后的概念、特性转换以及ML.* 中的注意问题。

- 我们看到载体生活在空间中,具有一定的维度. 但是,这些维度的定义是什么? 这是 ** 基准向量 ** 的输入。

- ** Basis**是一组向量,通过缩放和加成(线性组合),可以构建空间中每一个其他向量,没有冗余. 他们是空间的构件。

- 依据必须满足两个条件:

    - ** 微小独立**:不能从其他部分建立基准向量。每一份都提供了真正的新方向。

    - ** Spanning**:空间中每个向量都可以被以基向量的组合来表示. 什么都没有留下。

- 一个基中向量数等于空间的**dimension **. 单位$\mathbb{R}^2$需要2个$\mathbb{R}^3$你需要3个,等等

- 最自然的基是**标准基**,单位向量沿每个轴:

    - 单位$\mathbb{R}^2$: $\hat{\mathbf{i}} = (1, 0)$财务报告和已审计财务报表$\hat{\mathbf{j}} = (0, 1)$
    - 单位$\mathbb{R}^3$: $\hat{\mathbf{i}} = (1, 0, 0)$, $\hat{\mathbf{j}} = (0, 1, 0)$, $\hat{\mathbf{k}} = (0, 0, 1)$

- 任何向量只是这些基向量的加权和. 向量$(3, 2)$痷$3\hat{\mathbf{i}} + 2\hat{\mathbf{j}}$。。。权重(3和2)是向量的**坐标**。

- 但标准依据并不是唯一的有效依据. 单位$\mathbb{R}^2$,向量$(1, 1)$财务报告和已审计财务报表$(-1, 1)$还构成一个基础。它们具有线性独立,可以到达平面上的任何点. 同样的向量在这个新基础上只会有不同的坐标.

- ** 基础的改变** 用不同的基础重新表达同一个向量。向量没有移动,我们只是从不同的角度描述它。

- 方法是乘以**基数矩阵的变化**$P$,其列是用旧坐标书写的新的基准向量。回去,乘以$P^{-1}$.

- 把它当成是两个朋友给同一个咖啡馆指路. 你走在街道上:$(3, 2)$意思是"以东3个街区,以北2个街区". 你的朋友通过对角导航:$\mathbf{b}_1 = (1, 1)$(东北)和$\mathbf{b}_2 = (-1, 1)$(西北),从更早开始的新基础. 同样的咖啡馆,两种语言用来描述如何到达那里.

- 你朋友说咖啡馆在$(2.5, -0.5)$:"沿着我的东北对角走出2.5步,然后沿着我的西北对角走出半步". 为了了解你街上语言的含义 你只是按照他们的食谱

$$2.5 \begin{bmatrix} 1 \\ 1 \end{bmatrix} - 0.5 \begin{bmatrix} -1 \\ 1 \end{bmatrix} = \begin{bmatrix} 3 \\ 2 \end{bmatrix}$$

- 和你所谓的咖啡馆一样$(3, 2)$!

- "跟随食谱"的步子 恰恰是乘以$P$已经。将朋友的基向量堆成一列,乘以坐标的向量,则取出第一列的2.5分和第二列的-0.5分,再次取出食谱,仅简洁地写道:

$$P = \begin{bmatrix} 1 & -1 \\ 1 & 1 \end{bmatrix}, \qquad P \begin{bmatrix} 2.5 \\ -0.5 \end{bmatrix} = \begin{bmatrix} 3 \\ 2 \end{bmatrix}$$

- 从你那里翻译过来$(3, 2)$进入朋友的语言,意味着"放弃" 食谱,并取消$P$这正是什么$P^{-1}$是否为:

$$P^{-1} \begin{bmatrix} 3 \\ 2 \end{bmatrix} = \begin{bmatrix} 2.5 \\ -0.5 \end{bmatrix}$$

- 什么都没有移动。$(3, 2)$财务报告和已审计财务报表$(2.5, -0.5)$是两个关于一点的描述,$P$是它们之间翻译的词典。

- 在《示范法》中,经常出现改变依据的情况。例如,五氯苯甲醚找到了一个新的基础(主要组成部分),即数据更容易理解,轴与最大变化的方向一致。

- 接下来的一组概念是抽象的,现在很难掌握,直到我们在后几章中应用彗星时,所以请自己做好准备,以便产生影响。

- 现在,有一个更深层次的想法藏在这里。当我们写的时候$\mathbf{v} = (3, 2)$,坐标3和2是"测量"的结果$\mathbf{v}$沿着每个方向。第一个坐标问"有多少$\hat{\mathbf{i}}$已经进入$\mathbf{v}$,第二个问 "多少$\hat{\mathbf{j}}$?"

- 在咖啡馆的故事中,这些测量是这位朋友的疑问:"你沿着我的东北对角走多远? 和"我的西北一多远?" 每一个基础都有自己的问题,一个方向。

- 每个问题是一个**线性函数**:一个函数在向量中取出并返回一个单数,读取.

- *线性*一词指功能尊重两个向量空间操作. 测量向量和读取的相和; 双向向量和读取的相:

$$f(\mathbf{u} + \mathbf{v}) = f(\mathbf{u}) + f(\mathbf{v}), \qquad f(c\mathbf{v}) = c\,f(\mathbf{v})$$

- 换句话说,线性函数是"诚实的统治者". 向量是物体,线性函数是测量它们的统治者,所有可能的统治者的集合构成**双相空间**$V^\ast$.

- 每一个方面$\{\mathbf{e}_1, \mathbf{e}_2, \ldots, \mathbf{e}_n\}$有一套匹配的统治者,** 双重基础**$\{\mathbf{e}_1^\ast, \mathbf{e}_2^\ast, \ldots, \mathbf{e}_n^\ast\}$,在其中$\mathbf{e}_i^\ast$回答一个问题: "有多少步骤,$\mathbf{e}_i$? ? 吗? 一个精准的尺子在自己的基础上读取了 1 个向量,完全忽略了其他所有,它用**克罗内克三角洲** 的缩写.$\delta_{ij}$:

```math
\mathbf{e}_i^\ast(\mathbf{e}_j) = \delta_{ij} = \begin{cases} 1 & \text{if } i = j \\ 0 & \text{if } i \neq j \end{cases}
```

- 微小的校正规则是所有的规则, 因为线性是其他。看着$\mathbf{e}_1^\ast$读取第一个坐标$\mathbf{v} = 3\mathbf{e}_1 + 2\mathbf{e}_2$:

$$\mathbf{e}_1^\ast(3\mathbf{e}_1 + 2\mathbf{e}_2) = 3\,\mathbf{e}_1^\ast(\mathbf{e}_1) + 2\,\mathbf{e}_1^\ast(\mathbf{e}_2) = 3 \cdot 1 + 2 \cdot 0 = 3$$

- 统治者无视除自己以外的每一个方向,并报告坐标. 坐标*是*双基读取.

- 那么,什么是统治者 看起来像具体? 单位$\mathbb{R}^n$,每个线性函数只是用点产品应用的一行数字. 为了朋友的基础,我们已经建立了统治者 而不注意:翻译$(3, 2)$进入朋友的语言意味着乘以$P^{-1}$,每行$P^{-1}$制作了一个坐标。** 页 次$P^{-1}$具有双重基础**:

$$P^{-1} = \frac{1}{2}\begin{bmatrix} 1 & 1 \\ -1 & 1 \end{bmatrix} \quad\Rightarrow\quad \mathbf{b}_1^\ast = (0.5,\ 0.5), \qquad \mathbf{b}_2^\ast = (-0.5,\ 0.5)$$

- 检查一下咖啡馆旅行的情况:$\mathbf{b}_1^\ast \cdot (3, 2) = 0.5 \cdot 3 + 0.5 \cdot 2 = 2.5$这正是朋友的第一个坐标 这个文件的两半是一个想法:换个基础交换构件,双重基础是匹配的一组从新坐标上读取的统治者.

- 校正规则也隐藏在眼前:$P^{-1}P = I$说对了 尺子$i$根据向量读取 1$i$和0对其他人。身份矩阵是克罗内克三角洲作为表格被写出.

- 一个警告。令人惊奇的是,统治者$\mathbf{b}_1$实值$\mathbf{b}_1$本身,即: 只是点点$(1, 1)$。。。不过$(1, 1) \cdot (3, 2) = 5$将2.5的正坐标翻一番 有基准向量的点点读取它自己的坐标时,只有当基是**正态**(相对垂直,每长一),就像标准基. 这是唯一的原因$\mathbf{e}_1^\ast$恰好看起来与$\mathbf{e}_1$。。。统治者们生活在每条基础上$P^{-1}$.

- 这也解释了"点"产品"双活"的原因. 每个向量$\mathbf{u}$秘密定义尺(度量衡)$\mathbf{v}$通过计算$\mathbf{u} \cdot \mathbf{v}$),而每个标尺都是点出物,带有一定的向量. 在有限度的维度中,双相空间本质上是原始空间的镜像.

- 质量现在可能看起来是抽象的,但它支撑了许多实际的想法:坐标是双基评价,点产物是双相配对,神经网络中的注意等转变通过有一套向量"克瑞"来操作,这是行动中的双相.

## 编程任务（使用 Colab 或 notebook）



1. 在两个不同的基座上显示一个向量,并验证它们代表同一点. 尝试创建自己的基础, 看看向量得到什么坐标。
```python
import jax.numpy as jnp

v = jnp.array([3.0, 2.0])

# Standard basis: coordinates are just the components
print(f"Standard basis coords: {v}")

# New basis: (1,1) and (-1,1)
P = jnp.array([[1.0, -1.0],
               [1.0,  1.0]])
new_coords = jnp.linalg.solve(P, v)
print(f"New basis coords: {new_coords}")

# Verify: reconstruct from new coords
reconstructed = new_coords[0] * P[:, 0] + new_coords[1] * P[:, 1]
print(f"Reconstructed: {reconstructed}")
```

2. 从任务1(一行为P− 1)中建立朋友基础的双重基础,并核实每个标尺读取一个精确的坐标. 那么,看看为什么用一个基向量本身来做点 仅仅为正态基础工作。
```python
import jax.numpy as jnp

v = jnp.array([3.0, 2.0])

# The friend's basis (1,1) and (-1,1), stacked as columns
P = jnp.array([[1.0, -1.0],
               [1.0,  1.0]])

# The dual basis: the rows of P^{-1}
P_inv = jnp.linalg.inv(P)
b1_star, b2_star = P_inv[0], P_inv[1]
print(f"b1* = {b1_star}, b2* = {b2_star}")

# Each ruler reads one coordinate in the friend's basis (matches task 1!)
print(f"b1*(v) = {jnp.dot(b1_star, v)}")  # 2.5
print(f"b2*(v) = {jnp.dot(b2_star, v)}")  # -0.5

# Calibration: 1 on its own basis vector, 0 on the other
print(f"b1*(b1) = {jnp.dot(b1_star, P[:, 0])}, b1*(b2) = {jnp.dot(b1_star, P[:, 1])}")

# The trap: dotting with b1 itself does NOT give the coordinate
print(f"b1 . v = {jnp.dot(P[:, 0], v)}  (5.0, not 2.5 -- b1 is not orthonormal)")

# The standard basis IS orthonormal, so there the shortcut works
e1 = jnp.array([1.0, 0.0])
print(f"e1 . v = {jnp.dot(e1, v)}  (3.0, the first standard coordinate)")
```
