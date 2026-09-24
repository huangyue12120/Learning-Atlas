---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 02 - matrices/04. linear transformations.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 2a7dd04f8268d8e3a8be7a7151676d434a4e8cd0ce47ced61755f96260da61c5
status: reviewed
---
# 线性变换

*矩阵乘法是线性变换的函数，它重塑、旋转或投影向量，同时保持线性。本文件涵盖了旋转、反射、缩放、切变、投影、映射的核和像，以及如何神经网络层链这些变换。*

- **线性变换**（或线性映射）是一个函数，它接受一个向量并产生另一个向量，同时保持加法和标量缩放。如果 $T$ 是线性的，则：

    - $T(\mathbf{u} + \mathbf{v}) = T(\mathbf{u}) + T(\mathbf{v})$
    - $T(c\mathbf{u}) = cT(\mathbf{u})$

- 每个线性变换都可以表示为矩阵乘法。该矩阵 *就是* 变换。当你将向量乘以矩阵时，你正在应用一个线性变换到它。

- 将 $2 \times 2$ 矩阵视为一个机器，它接受 2D 向量并输出新的 2D 向量。矩阵的列告诉您在变换后标准基向量 $\hat{\mathbf{i}}$ 和 $\hat{\mathbf{j}}$ 的位置。其余内容都从线性保持中得出。

![](../images/basis_transform.svg)


- 例如，如果

```math
A = \begin{bmatrix} 2 & 1 \\ 1 & 2 \end{bmatrix}
```

  则 $\hat{\mathbf{i}} = [1, 0]^T$ 落在 $[2, 1]^T$（列 1）和 $\hat{\mathbf{j}} = [0, 1]^T$ 落在 $[1, 2]^T$（列 2）。其他任何向量都是这两个的组合，因此其输出自动跟随。

- 将两个矩阵相乘可以视为一个变换后另一个变换。如果 $B$ 在一个空间中转换向量，而 $A$ 在结果上转换，则 $AB$ 两者都按顺序进行。在游戏引擎中，旋转角色然后向前移动的结果与先向前移动然后旋转的结果不同，这是因为矩阵乘法不是可交换的。

- **旋转**将向量按角度 $\theta$ 旋转而不改变其长度。向量保持相同大小，它只是指向新的方向。

![旋转保持长度不变但改变方向。](../images/rotation.svg)


- 在 2D 中，旋转矩阵是：

```math
R(\theta) = \begin{bmatrix} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \end{bmatrix}
```

- 对于 $\theta = 90°$:

```math
R = \begin{bmatrix} 0 & -1 \\ 1 & 0 \end{bmatrix}
```

  所以 $[1, 0]^T$ 变成了 $[0, 1]^T$。当前指向的向量向上。旋转矩阵总是正交的，始终具有行列式为 1 的值。当你在手机上旋转照片时，这就是应用到每个像素坐标的精确矩阵。

- 在三维中，有单独的旋转矩阵用于每个轴。一个机器人手臂围绕特定轴旋转每个关节，并且每个关节是一个旋转矩阵。绕 z 轴旋转看起来像嵌入在 3D 中的 2D 情况：

```math
R_z(\theta) = \begin{bmatrix} \cos\theta & -\sin\theta & 0 \\ \sin\theta & \cos\theta & 0 \\ 0 & 0 & 1 \end{bmatrix}
```

- **缩放**沿每个轴独立地拉伸或缩短向量：

```math
S(s_x, s_y) = \begin{bmatrix} s_x & 0 \\ 0 & s_y \end{bmatrix}
```

![缩放按不同比例拉伸每个轴。](../images/scaling.svg)


- 当然，请提供您需要翻译的英文文本。 $S(2, 1.5)$ 将x分量加倍，将y分量乘以1.5。缩放为 $-1$ 沿着轴翻转时，该组件会沿轴翻转。对图像进行缩放至50%相当于应用了缩放变换。 $S(0.5, 0.5)$ 到每个像素坐标。

- 反射将向量翻转到一个轴或线，就像镜子。沿x轴反射时，x分量保持不变，y分量取反：

```math
\text{Ref}_x = \begin{bmatrix} 1 & 0 \\ 0 & -1 \end{bmatrix}
```

![反射沿x轴翻转y分量。](../images/reflection.svg)


- 例如，$[3, 2]^T$变为$[3, -2]^T$。当你手机翻转自拍时，它应用了反射矩阵。在 $y = x$ 上反射交换两个组件：

```math
\text{Ref}_{y=x} = \begin{bmatrix} 0 & 1 \\ 1 & 0 \end{bmatrix}
```

- 反射矩阵的行列式为 $-1$，确认它们翻转方向。

- 旋转和平移都是**不变距离和角度的** **刚体变换**。表示它们的矩阵是正交矩阵，因此正交矩阵总是具有$+1$（旋转）或$-1$（反射）的行列式。

- **剪切**沿一个轴将向量倾斜，比例上与另一个轴成正比。水平剪切因子为 $k$：

```math
\text{Sh}_x(k) = \begin{bmatrix} 1 & k \\ 0 & 1 \end{bmatrix}
```

![剪切将顶部向左滑动，底部保持固定。](../images/shearing.svg)


- 每个点沿水平方向滑动，其高度的 $k$ 倍。使用 $k = 0.5$，高度为 2 的点向右移动 1 位。底部行保持不变，顶部行滑动。这就是斜体文本的工作原理：正立字母被拉伸以向右倾斜。

- 以上所有（旋转、缩放、反射、切变）都是线性变换。它们保持原点固定，并且保留直线。但关于**平移**（向一个固定量移动一切）呢？

- 翻译不是线性变换，因为它移动了原点。如果将每个点向右移动3个单位，零向量会移动到$[3, 0]^T$，破坏线性。为了处理它，我们使用**仿射变换**，它结合了一个线性变换和一个平移:

$$\mathbf{y} = A\mathbf{x} + \mathbf{t}$$
- 用单个矩阵乘法表示这种形式，我们使用**齐次坐标**：向每个向量添加一个1，并使用一个$(n+1) \times (n+1)$矩阵:

```math
\begin{bmatrix} A & \mathbf{t} \\ \mathbf{0}^T & 1 \end{bmatrix} \begin{bmatrix} \mathbf{x} \\ 1 \end{bmatrix} = \begin{bmatrix} A\mathbf{x} + \mathbf{t} \\ 1 \end{bmatrix}
```

- 仿射变换保持直线和平行线，但不一定角度或长度。视频游戏中的每一个物体都是通过仿射变换来定位的：旋转它、缩放它，然后将其放置在正确的位置，所有编码在一个单一的矩阵中。:

- 一个 **退化变换**（奇异矩阵）将空间压缩到更低的维度。

- 例如，矩阵

```math
\begin{bmatrix} 1 & 2 \\ 2 & 4 \end{bmatrix}
```

  将每个二维向量映射到一条线，因为两个列都指向相同的方向。行列式为零，信息丢失，变换无法逆向进行。

- 将彩色图像（每个像素有三个值：红色、绿色和蓝色）转换为灰度图像（每个像素只有一个值）是一个退化变换：颜色信息永久丢失。

- 在机器学习中，线性变换是神经网络的核心。数据以矩阵的形式表示（一个向量堆栈，代表物体的特征，如人类、飞机、文本、图像等任何东西！）

- 每一层应用矩阵乘法（线性变换），细节在其他章节中提供，我们需要解释如何结构这些数据，并正确地激励神经网络。

- 然而，今天最常用的技巧往往几乎 exclusively通过一系列线性变换传递数据，我们称这些为 **变换器**。

- Gemini、chatGPT、Claude、Qwen、DeepSeek和今天世界上最好的AI，都是transformers!

## 编程任务（使用CoLab或笔记本）

1. 应用旋转矩阵到向量并绘制原始和旋转后的向量。尝试不同的角度。
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt

theta = jnp.pi / 3
R = jnp.array([[jnp.cos(theta), -jnp.sin(theta)],
               [jnp.sin(theta),  jnp.cos(theta)]])

v = jnp.array([1.0, 0.0])
v_rot = R @ v

plt.figure(figsize=(5, 5))
plt.quiver(0, 0, v[0], v[1], angles='xy', scale_units='xy', scale=1, color='red', label='original')
plt.quiver(0, 0, v_rot[0], v_rot[1], angles='xy', scale_units='xy', scale=1, color='blue', label='rotated')
plt.xlim(-1.5, 1.5); plt.ylim(-1.5, 1.5)
plt.grid(True); plt.legend(); plt.gca().set_aspect('equal')
plt.show()
```

2. 应用切变变换到形成正方形的点集，并可视化变形后的形状。
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt

square = jnp.array([[0,0],[1,0],[1,1],[0,1],[0,0]]).T

k = 0.5
shear = jnp.array([[1, k],
                    [0, 1]])
sheared = shear @ square

plt.figure(figsize=(6, 4))
plt.plot(square[0], square[1], 'r-o', label='original')
plt.plot(sheared[0], sheared[1], 'b-o', label='sheared')
plt.grid(True); plt.legend(); plt.gca().set_aspect('equal')
plt.show()
```
