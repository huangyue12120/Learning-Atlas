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

*向量积是衡量相似性和计算投影的基础操作。本文件涵盖了内积、点积、余弦相似度、叉积和外积，这些操作在AI中支持注意力机制、嵌入式和几何推理。*

- 我们已经看到如何向量相加和缩放。但我们可以 *乘以* 两个向量吗？事实证明，有不止一种方法可以这样做，并且每种方法都回答了不同的问题。

- **内积**是通用概念：一个函数，它接受两个向量并产生一个单个数字（标量）。它是“乘以”向量的抽象蓝图。

- 任何内积都必须满足三个规则：

    - **正定性**：$\langle \mathbf{v}, \mathbf{v} \rangle \geq 0$，且仅在零向量时等于零。将一个向量乘以自身总是给出非负结果。

    - **对称性**：$\langle \mathbf{u}, \mathbf{v} \rangle = \langle \mathbf{v}, \mathbf{u} \rangle$。顺序无关紧要。

    - **线性**：$\langle a\mathbf{u} + b\mathbf{v}, \mathbf{w} \rangle = a\langle \mathbf{u}, \mathbf{w} \rangle + b\langle \mathbf{v}, \mathbf{w} \rangle$。它在加法和缩放时分布。

- **点积**是最常见的内积。它是几乎 everywhere都会使用的具体版本。对于两个向量 $\mathbf{a} = (a_1, a_2, \ldots, a_n)$ 和 $\mathbf{b} = (b_1, b_2, \ldots, b_n)$：

$$\mathbf{a} \cdot \mathbf{b} = a_1 b_1 + a_2 b_2 + \cdots + a_n b_n$$
- 将匹配的分量相乘，然后将它们加起来。这就是全部内容。

- 但这个数字 *意味着什么*？点积具有美丽的几何解释：

$$\mathbf{a} \cdot \mathbf{b} = \|\mathbf{a}\| \, \|\mathbf{b}\| \cos(\theta)$$
![点积：向量a投影到b，角度θ和投影示例](../images/dot_product.svg)


- 这直接连接了点积和两个向量 $\theta$ 之间的角度。结果告诉你这两个向量在方向上“一致”的程度。

- 如果它们指向相同的方向（$\theta = 0°$），$\cos(\theta) = 1$ 并且点积最大化。

- 如果它们是正交的（$\theta = 90°$），$\cos(\theta) = 0$ 并且点积恰好为零。这给我们一个精确的测试来检查正交性。

- 如果它们指向相反的方向（$\theta = 180°$），$\cos(\theta) = -1$ 并且点积为负。

- 向量与自身相乘给出其模的平方：$\mathbf{a} \cdot \mathbf{a} = \|\mathbf{a}\|^2$。

- 点积同样给我们提供了投影，即一个向量在另一个向量上的投影。$\mathbf{a}$在$\mathbf{b}$上的投影是：

$$\text{proj}_{\mathbf{b}}(\mathbf{a}) = \frac{\mathbf{a} \cdot \mathbf{b}}{\|\mathbf{b}\|^2} \, \mathbf{b}$$
- 考虑将光线垂直向下照射到 $\mathbf{b}$。 $\mathbf{a}$ 在这条线上的投影是阴影，它告诉你 $\mathbf{a}$ 在 $\mathbf{b}$ 方向的覆盖程度。

- **余弦相似性**通过除以两个向量的模数来归一化点积：

$$\cos(\theta) = \frac{\mathbf{a} \cdot \mathbf{b}}{\|\mathbf{a}\| \, \|\mathbf{b}\|}$$
- 这给出一个值在 $-1$ 和 $1$ 之间，测量方向对齐程度，忽略向量的长度。它广泛用于 ML 中比较文档、嵌入和用户偏好等。

- 现在，点积将两个向量乘以一个标量。**叉积**正好相反，它接受两个向量并返回一个新的向量。

- 交叉积 $\mathbf{a} \times \mathbf{b}$ 产生一个与 $\mathbf{a}$ 和 $\mathbf{b}$ 都垂直的向量：

$$\mathbf{a} \times \mathbf{b} = (a_2 b_3 - a_3 b_2, \; a_3 b_1 - a_1 b_3, \; a_1 b_2 - a_2 b_1)$$
- 只有在三维空间中才能使用叉积。虽然点积可以在任何维度上工作，但叉积是特定于三维空间的。

- 它的模等于由两个向量形成的平行四边形的面积：

$$\|\mathbf{a} \times \mathbf{b}\| = \|\mathbf{a}\| \, \|\mathbf{b}\| \sin(\theta)$$
- 注意模式：点积使用 $\cos(\theta)$，叉积使用 $\sin(\theta)$。点积衡量两个向量的对齐程度，叉积衡量它们在方向上的差异程度。

- 结果的方向遵循右手定则：将你的右手手指从 $\mathbf{a}$ 拉向 $\mathbf{b}$，拇指指向 $\mathbf{a} \times \mathbf{b}$。

- 与点积不同，叉积是**非交换的**： $\mathbf{a} \times \mathbf{b} = -(\mathbf{b} \times \mathbf{a})$交换顺序改变方向。

- 如果两个向量平行，它们的叉积是零向量（因为 $\sin(0°) = 0$）。没有面积，也没有垂直方向。

- 当三个向量通过两种乘法组合时，我们得到的是 **三重积**。

- **叉积三重积** $\mathbf{a} \cdot (\mathbf{b} \times \mathbf{c})$ 首先对两个向量进行叉乘，然后将结果与第三个向量点积。输出是一个单个数字，等于由这三个向量形成的平行四边形（斜立的三维盒子）的体积。

- 如果三向量的叉积为零，那么这三个向量是**共面**的，它们都在同一个平面上，并且不形成任何体积。

- 顺序可以循环而不改变结果：$\mathbf{a} \cdot (\mathbf{b} \times \mathbf{c}) = \mathbf{b} \cdot (\mathbf{c} \times \mathbf{a}) = \mathbf{c} \cdot (\mathbf{a} \times \mathbf{b})$。

- 向量三重积 $\mathbf{a} \times (\mathbf{b} \times \mathbf{c})$ 是将向量相乘两次并返回一个向量。它使用以下恒等式展开得当：

$$\mathbf{a} \times (\mathbf{b} \times \mathbf{c}) = (\mathbf{a} \cdot \mathbf{c})\mathbf{b} - (\mathbf{a} \cdot \mathbf{b})\mathbf{c}$$
- 结果总是位于由 $\mathbf{b}$ 和 $\mathbf{c}$ 定义的平面上。请注意，叉积 **不满足结合律**：$\mathbf{a} \times (\mathbf{b} \times \mathbf{c}) \neq (\mathbf{a} \times \mathbf{b}) \times \mathbf{c}$.

## 编程任务（使用 CoLab 或笔记本）

1. 计算两个向量的点积，并使用它来找到它们之间的角度。尝试将它们设置为正交、平行或相反，看看角度如何变化。
```python
import jax.numpy as jnp

a = jnp.array([1.0, 2.0, 3.0])
b = jnp.array([4.0, -1.0, 2.0])

dot = jnp.dot(a, b)
angle = jnp.arccos(dot / (jnp.linalg.norm(a) * jnp.linalg.norm(b)))

print(f"Dot product: {dot}")
print(f"Angle: {jnp.degrees(angle):.1f}°")
```

2. 计算两个三维向量的叉积，并通过检查其与每个原始向量的点积是否为零来验证结果是垂直的。
```python
import jax.numpy as jnp

a = jnp.array([1.0, 0.0, 0.0])
b = jnp.array([0.0, 1.0, 0.0])

cross = jnp.cross(a, b)

print(f"a x b = {cross}")
print(f"Perpendicular to a: {jnp.dot(cross, a) == 0}")
print(f"Perpendicular to b: {jnp.dot(cross, b) == 0}")
```
