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

*本篇将线性变换放回 AI 工程语境，保留源文中的定义、公式、代码、图示和实践边界，便于逐项核对。*

*每个矩阵乘法是一个线性转换,这个函数在保持线性的同时重塑,旋转或预测向量. 此文件涵盖旋转,反射,缩放,剪切,投影,地图的内核和图像,以及神经网络层如何将这些变换链. *

- **线性转换**(或线性映射)是一种函数,它取出一个向量并产生另一个向量,同时保留添加和缩放. 若为$T$线性,然后:

    - $T(\mathbf{u} + \mathbf{v}) = T(\mathbf{u}) + T(\mathbf{v})$
    - $T(c\mathbf{u}) = cT(\mathbf{u})$

- 每个线性变相都可以被矩阵表示为乘法. 矩阵 *是 * 转变。当一个向量被矩阵相乘时,您正在对它进行线性转换。

- 想想看,你觉得呢?$2 \times 2$矩阵作为机器,取入2D向量并输出出新的2D向量. 矩阵的列告诉你标准基准向量的位置$\hat{\mathbf{i}}$财务报告和已审计财务报表$\hat{\mathbf{j}}$最终在转型后。其它一切都从线性。

![图示](../images/basis_transform.svg)

- 例如,如果

```math
A = \begin{bmatrix} 2 & 1 \\ 1 & 2 \end{bmatrix}
```

  接下来$\hat{\mathbf{i}} = [1, 0]^T$陆地在$[2, 1]^T$(栏1)和$\hat{\mathbf{j}} = [0, 1]^T$陆地在$[1, 2]^T$(栏2). 每个其他向量都是这两个的结合,因此其输出会自动跟随.

- 将两个矩阵相乘可以认为是应用一个又一个的转变. 若为$B$从一个空格转换向量$A$改变结果,然后$AB$都按顺序进行。在游戏引擎中,将一个字符旋转后再向前移动是与其先移动后再旋转不同的结果,这就是矩阵乘法不是共通性的原因.

- ** 旋转** 向量按角度旋转$\theta$而不改变它们的长度。向量保持不变,只是指向一个新的方向。

![图示](../images/rotation.svg)

- 在2D中,自转矩阵是:

```math
R(\theta) = \begin{bmatrix} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \end{bmatrix}
```

- 用于$\theta = 90°$:

```math
R = \begin{bmatrix} 0 & -1 \\ 1 & 0 \end{bmatrix}
```

  这么说$[1, 0]^T$变成$[0, 1]^T$。。。向量指向现在的指向。旋转矩阵是正交的,总是有决定因素1. 当你在手机上旋转一张照片时,这是每个像素坐标都应用的精确矩阵.

- 在3D中,每个轴都有单独的自转矩阵. 机器人臂将每个关节围绕一个特定的轴心旋转,而每个关节是一个自转矩阵. Z轴周围的旋转看起来像嵌入了3D的2D大小写:

```math
R_z(\theta) = \begin{bmatrix} \cos\theta & -\sin\theta & 0 \\ \sin\theta & \cos\theta & 0 \\ 0 & 0 & 1 \end{bmatrix}
```

- ** 缩放** 沿着每个轴线伸展或收缩向量:

```math
S(s_x, s_y) = \begin{bmatrix} s_x & 0 \\ 0 & s_y \end{bmatrix}
```

![图示](../images/scaling.svg)

- $S(2, 1.5)$将 X 组件相乘,将 Y 组件相乘 1.5。缩放$-1$沿轴翻转该组件。对角矩阵总是一个缩放的转变. 当图像大小调整到50%时,您正在应用$S(0.5, 0.5)$每个像素坐标。

- ** Reflection**将向量翻过一轴或一行,像一面镜子. 反射到x轴上保持x-组件并否定y组件:

```math
\text{Ref}_x = \begin{bmatrix} 1 & 0 \\ 0 & -1 \end{bmatrix}
```

![图示](../images/reflection.svg)

- 举例来说,$[3, 2]^T$变成$[3, -2]^T$。。。当你的手机水平翻转一个自拍 所以文本读取正确, 它正在应用一个反射矩阵。跨线反射$y = x$互换两个组件:

```math
\text{Ref}_{y=x} = \begin{bmatrix} 0 & 1 \\ 1 & 0 \end{bmatrix}
```

- 反射矩阵有决定因素$-1$证实它们的方向翻转。

- 旋转和反射都是**刚性转变**:它们保持了距离和角度. 代表它们的矩阵是正交矩阵,这就是正交矩阵总是有决定因素的原因.$+1$(旋转)或$-1$(反语).

- ** 听**沿一轴向量相向相向。横向剪切(按因素)$k$:

```math
\text{Sh}_x(k) = \begin{bmatrix} 1 & k \\ 0 & 1 \end{bmatrix}
```

![图示](../images/shearing.svg)

- 每个点横向滑动$k$乘以其高处. 与$k = 0.5$,高度2的一分 右转1。下行会保持放入,上行会滑出. 斜体文字就是这样工作的:直立字母被剪去,这样就向右倾斜了.

- 上述所有(旋转,缩放,反射,剪接)都是**线性**变相. 他们保留原生地固定并保留正线. 但是,**翻译**(用固定数额转移一切)呢?

- 翻译是 * 不是 * 线性转换,因为它会移动源. 如果您将每点右移到 3, 零向量移动到$[3, 0]^T$打破线性。为了处理它,我们使用**affine转换**,将线性转换和翻译结合起来:

$$\mathbf{y} = A\mathbf{x} + \mathbf{t}$$

- 为了将它作为单一的矩阵乘法来表示,我们使用**同心座标**:在每一个向量中再加一个 1 并使用一个$(n+1) \times (n+1)$矩阵 :

```math
\begin{bmatrix} A & \mathbf{t} \\ \mathbf{0}^T & 1 \end{bmatrix} \begin{bmatrix} \mathbf{x} \\ 1 \end{bmatrix} = \begin{bmatrix} A\mathbf{x} + \mathbf{t} \\ 1 \end{bmatrix}
```

- 芳香转化保留了直线和平行主义,但不一定是角度或长度. 电子游戏中的每个对象都使用affine变换来定位:旋转,缩放,再放在正确的位置上,全部被编码为一个矩阵.

- ** 脱原变换**(单质矩阵)会使空间倒塌为更低的维度.

- 例如,矩阵

```math
\begin{bmatrix} 1 & 2 \\ 2 & 4 \end{bmatrix}
```

  将每个2D向量映射到一行,因为两列都指向同一个方向。决定因素是零,信息被丢失,变相无法被逆转.

- 将一个彩色图像(每个像素值为3:红色,绿色,蓝色)转换为灰度(每个像素值为1)是一种已退化的转变:颜色信息已永久消失.

- 在ML中,线性变换是神经网络的核心,数据被作为矩阵来表示(一叠的向量代表物体的特征,如人类,平面,文字,图像. 任何!)

- 每层应用矩阵乘法(线性转换),细节在其他章节中提供,我们需要解释hpw来构建这些数据并适当激励神经网络.

- 然而,今天最常用的技术 往往几乎完全通过 一系列线性转换传递数据 我们称之为** Transfers **.

- 双子座 ChatGPT 克洛德 Quen DeepSeek 以及当今世界上表现最好的AI都是变压器!

## 编程任务（使用 Colab 或 notebook）


1. 将旋转矩阵应用到向量上,并同时绘制原始向量和旋转向量。尝试不同的角度。
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

2. 将剪切变换应用到一组形成正方形的点上,并可以直观地看到已变形的形状.
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
