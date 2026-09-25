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

*矩阵乘法实现线性变换，可以在保持线性的同时重塑、旋转或投影向量。本文件涵盖旋转、反射、缩放、剪切变换、投影、映射的核与像，以及神经网络层如何串联这些变换。*

- **线性变换**（或线性映射）是一个函数，它接受一个向量并产生另一个向量，同时保持加法和标量缩放。如果 $T$ 是线性的，则：

    - $T(\mathbf{u} + \mathbf{v}) = T(\mathbf{u}) + T(\mathbf{v})$
    - $T(c\mathbf{u}) = cT(\mathbf{u})$

- 每个线性变换都可以表示为矩阵乘法。该矩阵 *就是* 变换。当你将向量乘以矩阵时，你正在应用一个线性变换到它。

- 可以把 $2 \times 2$ 矩阵看成一台机器：它接收二维向量并输出新的二维向量。矩阵的列向量告诉我们标准基向量 $\hat{\mathbf{i}}$ 和 $\hat{\mathbf{j}}$ 经变换后的落点，其他向量的结果由线性性决定。

![矩阵的列向量表示标准基向量经过变换后的位置](../images/basis_transform.svg)


- 例如，如果

```math
A = \begin{bmatrix} 2 & 1 \\ 1 & 2 \end{bmatrix}
```

  则 $\hat{\mathbf{i}} = [1, 0]^T$ 映射到 $[2, 1]^T$（第 1 列），$\hat{\mathbf{j}} = [0, 1]^T$ 映射到 $[1, 2]^T$（第 2 列）。其他向量都是这两个基向量的线性组合，因此其输出也由这两个列向量确定。

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

  所以 $[1, 0]^T$ 变成 $[0, 1]^T$，原本指向右方的向量转而指向上方。旋转矩阵都是正交矩阵，行列式恒为 1。手机旋转照片时，系统正是把这个矩阵应用到每个像素坐标上。

- 在三维中，每个旋转轴都有对应的旋转矩阵。机器人手臂的各关节绕各自的轴旋转，每个关节的旋转都可以用矩阵表示。绕 $z$ 轴旋转的矩阵，就是嵌入三维空间的二维旋转：

```math
R_z(\theta) = \begin{bmatrix} \cos\theta & -\sin\theta & 0 \\ \sin\theta & \cos\theta & 0 \\ 0 & 0 & 1 \end{bmatrix}
```

- **缩放**沿每个轴独立地拉伸或缩短向量：

```math
S(s_x, s_y) = \begin{bmatrix} s_x & 0 \\ 0 & s_y \end{bmatrix}
```

![缩放按不同比例拉伸每个轴。](../images/scaling.svg)


- $S(2, 1.5)$ 将 $x$ 分量加倍，将 $y$ 分量乘以 1.5。沿某个轴缩放 $-1$ 会把该轴上的分量翻转。对角矩阵总是表示缩放变换。把图像缩小到 50% 时，相当于对每个像素坐标应用 $S(0.5, 0.5)$。

- 反射会把向量关于某条轴或直线翻转，就像镜面映照。沿 $x$ 轴反射时，$x$ 分量保持不变，$y$ 分量取反：

```math
\text{Ref}_x = \begin{bmatrix} 1 & 0 \\ 0 & -1 \end{bmatrix}
```

![反射沿x轴翻转y分量。](../images/reflection.svg)


- 例如，$[3, 2]^T$ 变为 $[3, -2]^T$。手机水平翻转自拍图像、使图中文字正向显示时，会应用反射矩阵。在 $y = x$ 上反射会交换两个分量：

```math
\text{Ref}_{y=x} = \begin{bmatrix} 0 & 1 \\ 1 & 0 \end{bmatrix}
```

- 反射矩阵的行列式为 $-1$，确认它们翻转方向。

- 旋转和反射都是**刚体变换**，会保持距离和角度。表示它们的矩阵是正交矩阵，因此旋转矩阵的行列式为 $+1$，反射矩阵的行列式为 $-1$。

- **剪切变换**使向量沿一个轴倾斜，位移与另一个轴上的坐标成正比。水平剪切因子为 $k$：

```math
\text{Sh}_x(k) = \begin{bmatrix} 1 & k \\ 0 & 1 \end{bmatrix}
```

![剪切变换使上方沿水平方向滑动，底边保持固定。](../images/shearing.svg)


- 每个点的水平位移等于其高度的 $k$ 倍。取 $k = 0.5$ 时，高度为 2 的点向右移动 1 个单位。底边保持不动，顶边滑动。斜体字形也会经过剪切变换而向右倾斜。

- 上述旋转、缩放、反射和剪切变换都是**线性变换**：它们固定原点并保持直线。**平移**则把所有点移动一个固定量。

- 平移不是线性变换，因为它会移动原点。若把每个点向右移动 3 个单位，零向量会变成 $[3, 0]^T$，线性性就被破坏。我们使用**仿射变换**来表示这种操作，它把线性变换与平移结合起来：

$$\mathbf{y} = A\mathbf{x} + \mathbf{t}$$
- 用单个矩阵乘法表示这种形式，我们使用**齐次坐标**：向每个向量添加一个1，并使用一个$(n+1) \times (n+1)$矩阵:

```math
\begin{bmatrix} A & \mathbf{t} \\ \mathbf{0}^T & 1 \end{bmatrix} \begin{bmatrix} \mathbf{x} \\ 1 \end{bmatrix} = \begin{bmatrix} A\mathbf{x} + \mathbf{t} \\ 1 \end{bmatrix}
```

- 仿射变换保持直线和平行性，但不一定保持角度或长度。电子游戏中的物体都可以用仿射变换定位：旋转、缩放，再放到正确位置，这些操作都编码在一个矩阵中。

- 一个 **退化变换**（奇异矩阵）将空间压缩到更低的维度。

- 例如，矩阵

```math
\begin{bmatrix} 1 & 2 \\ 2 & 4 \end{bmatrix}
```

  将每个二维向量映射到一条线，因为两个列都指向相同的方向。行列式为零，信息丢失，变换无法逆向进行。

- 将彩色图像（每个像素有三个值：红色、绿色和蓝色）转换为灰度图像（每个像素只有一个值）是一个退化变换：颜色信息永久丢失。

- 在机器学习中，线性变换是神经网络的核心。数据通常表示为矩阵，也就是一组向量；每个向量描述一个对象的特征，例如人物、飞机、文本或图像。

- 每一层都应用矩阵乘法，也就是线性变换。数据如何组织以及神经网络为何需要这些层，会在后续章节中说明。

- 如今许多常用模型都采用 **Transformer（变换器）**架构。

- Gemini、ChatGPT、Claude、Qwen 和 DeepSeek 等模型都采用 Transformer 架构。

- **编者注：**Transformer 不能简单定义为一系列线性变换。典型 Transformer 层还包含自注意力、非线性前馈运算等结构。

## 编程任务（使用 Colab 或笔记本）

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
