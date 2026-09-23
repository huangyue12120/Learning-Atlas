---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 01 - vectors/04. products.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 9e83fbd97192fa1a0ddaa70c35ed82b517360285b3d01df2faa039b13cfc0ce8
status: reviewed
---

# 向量积

*本篇将向量积放回 AI 工程语境，保留源文中的定义、公式、代码、图示和实践边界，便于逐项核对。*

* 变量产品是测量相似性和计算预测的基本操作。这个文件涵盖了内出产,点出产,同心相近,交叉出产,外出出产,能使注意力机理,嵌入,以及AI中的几何推理. *

- 我们已经看到如何添加和放大向量。但是,我们能不能“乘以”两个向量? 原来有不止一种方法可以做到,每个方法都回答一个不同的问题.

- **内出物**是一般的构想:一种功能,取出两个向量并产生出一个单数(一个scalar). 它是“倍增”向量的抽象蓝图。

- 任何内出产品都必须符合三项规则:

    - ** 积极确定性**:$\langle \mathbf{v}, \mathbf{v} \rangle \geq 0$,并仅等于零向量。将向量与自身相乘,总是给出非负的结果.

    - ** 对称**:$\langle \mathbf{u}, \mathbf{v} \rangle = \langle \mathbf{v}, \mathbf{u} \rangle$。。。令无所取.

    - ** 线性**:$\langle a\mathbf{u} + b\mathbf{v}, \mathbf{w} \rangle = a\langle \mathbf{u}, \mathbf{w} \rangle + b\langle \mathbf{v}, \mathbf{w} \rangle$。。。它通过增加和规模分配。

- **点产品**是最常见的内出物. 这是你几乎会使用的具体版本。对于两个向量$\mathbf{a} = (a_1, a_2, \ldots, a_n)$财务报告和已审计财务报表$\mathbf{b} = (b_1, b_2, \ldots, b_n)$:

$$\mathbf{a} \cdot \mathbf{b} = a_1 b_1 + a_2 b_2 + \cdots + a_n b_n$$

- 相匹配组件相乘,然后将全部相加. 就是这样

- 但这个号码是什么意思? 点产品有美丽的几何解释:

$$\mathbf{a} \cdot \mathbf{b} = \|\mathbf{a}\| \, \|\mathbf{b}\| \cos(\theta)$$

![图示](../images/dot_product.svg)

- 这将点产品直接连接到角度$\theta$两个向量之间。结果告诉你两个向量"同意"方向的多少.

- 如果他们指的相同方式($\theta = 0°$), $\cos(\theta) = 1$点的产物是最大的。

- 如果它们是正交的(如:$\theta = 90°$), $\cos(\theta) = 0$而点产品完全为零。这让我们能精确地检验矫形

- 如果它们指向相反的方向($\theta = 180°$), $\cos(\theta) = -1$而点产品为负.

- 向量点本身表示其大小平方:$\mathbf{a} \cdot \mathbf{a} = \|\mathbf{a}\|^2$.

- 点产品也给我们**投影**,一个向量投出另一个. 预测$\mathbf{a}$打开$\mathbf{b}$即:

$$\text{proj}_{\mathbf{b}}(\mathbf{a}) = \frac{\mathbf{a} \cdot \mathbf{b}}{\|\mathbf{b}\|^2} \, \mathbf{b}$$

- 想想把一盏光直照到$\mathbf{b}$。。。阴影$\mathbf{a}$线上是投影 它告诉你多少$\mathbf{a}$位于方向上$\mathbf{b}$.

- ** 共心相近性** 通过将两个分量分为两种来使点产物正常化:

$$\cos(\theta) = \frac{\mathbf{a} \cdot \mathbf{b}}{\|\mathbf{a}\| \, \|\mathbf{b}\|}$$

- 这给出了一个值在$-1$财务报告和已审计财务报表$1$测量方向对齐,而忽略向量的长度。在ML中被广泛用于比较诸如文档,嵌入和用户偏好等事物.

- 现在,点产品要取出两个向量,然后还回一个平板. **十字产品** 做相反的,它需要两个向量并返回一个 * 新向量*.

- 交叉产品$\mathbf{a} \times \mathbf{b}$生成一个垂直于两者的向量$\mathbf{a}$财务报告和已审计财务报表$\mathbf{b}$:

$$\mathbf{a} \times \mathbf{b} = (a_2 b_3 - a_3 b_2, \; a_3 b_1 - a_1 b_3, \; a_1 b_2 - a_2 b_1)$$

- 交叉产品只在3D中工作. 虽然点产品在任何个个维度上都有作用,但交叉出产是三维空间所特有的.

- 它的等分度等于两个向量形成的平行图的区域:

$$\|\mathbf{a} \times \mathbf{b}\| = \|\mathbf{a}\| \, \|\mathbf{b}\| \sin(\theta)$$

- 注意模式:点产品使用$\cos(\theta)$和交叉产品用途$\sin(\theta)$。。。点产品衡量两种向量的相通度,交叉产品衡量它们*偏差*方向相通度.

- 结果的方向遵循了** 右手规则**:将你右手的手指从$\mathbf{a}$目标$\mathbf{b}$,拇指指向方向$\mathbf{a} \times \mathbf{b}$.

- 与点产品不同,交叉产品为**不共通**:$\mathbf{a} \times \mathbf{b} = -(\mathbf{b} \times \mathbf{a})$。。。捣乱取令倒向.

- 如果两个向量是平行的,它们的交叉产物是零向量(因为$\sin(0°) = 0$) (中文(简体)). 没有区域,没有垂直方向。

- 使用两种产品结合三个向量时会发生什么? 这给我们带来了** 三重产品**。

- 高薪三重产品**$\mathbf{a} \cdot (\mathbf{b} \times \mathbf{c})$首先取出两个向量的交叉产物,再将结果与第三个相去相去. 输出为单数,等同由三个向量所形成的相平行管(一个斜出3D框)的体积.

- 如果平板三相产物为零,三个向量为**coplanar**,它们都位于同平面并形成无容积.

- 顺序可以循环而不改变结果:$\mathbf{a} \cdot (\mathbf{b} \times \mathbf{c}) = \mathbf{b} \cdot (\mathbf{c} \times \mathbf{a}) = \mathbf{c} \cdot (\mathbf{a} \times \mathbf{b})$.

- **活体三重产品**$\mathbf{a} \times (\mathbf{b} \times \mathbf{c})$将交叉产品应用两次,并返回向量。它利用身份来清晰地扩展:

$$\mathbf{a} \times (\mathbf{b} \times \mathbf{c}) = (\mathbf{a} \cdot \mathbf{c})\mathbf{b} - (\mathbf{a} \cdot \mathbf{b})\mathbf{c}$$

- 结果总是在飞机上$\mathbf{b}$财务报告和已审计财务报表$\mathbf{c}$。。。注意交叉产品为**不关联**:$\mathbf{a} \times (\mathbf{b} \times \mathbf{c}) \neq (\mathbf{a} \times \mathbf{b}) \times \mathbf{c}$.

## 编程任务（使用 Colab 或 notebook）


1. 计算出两个向量的点出产物,并用它来找到它们之间的角度. 尝试使其为正交,平行,或相向,并查看角度的变化.
```python
import jax.numpy as jnp

a = jnp.array([1.0, 2.0, 3.0])
b = jnp.array([4.0, -1.0, 2.0])

dot = jnp.dot(a, b)
angle = jnp.arccos(dot / (jnp.linalg.norm(a) * jnp.linalg.norm(b)))

print(f"Dot product: {dot}")
print(f"Angle: {jnp.degrees(angle):.1f}°")
```

2. 计算出两个3D向量的交叉产物并验证结果,通过检查其与每个原始向量的点出产物是否为零,对两者均具有垂直性.
```python
import jax.numpy as jnp

a = jnp.array([1.0, 0.0, 0.0])
b = jnp.array([0.0, 1.0, 0.0])

cross = jnp.cross(a, b)

print(f"a x b = {cross}")
print(f"Perpendicular to a: {jnp.dot(cross, a) == 0}")
print(f"Perpendicular to b: {jnp.dot(cross, b) == 0}")
```
