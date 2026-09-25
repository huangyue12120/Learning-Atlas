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
# 向量乘积

*向量乘积是衡量相似度和计算投影的基础工具。本文件涵盖内积、点积、余弦相似度、叉积和外积；这些运算支撑 AI 中的注意力机制、嵌入表示和几何推理。*

- 我们已经看到向量可以相加和缩放。两个向量也可以相乘，但乘法有多种定义，每一种都回答不同的问题。

- **内积**是一个通用概念：它接收两个向量并返回一个标量，是“向量相乘”的抽象定义。

- 任何内积都必须满足三条规则：

    - **正定性**：$\langle \mathbf{v}, \mathbf{v} \rangle \geq 0$，且仅当 $\mathbf{v}$ 为零向量时取等号。向量与自身的内积总是非负的。

    - **对称性**：$\langle \mathbf{u}, \mathbf{v} \rangle = \langle \mathbf{v}, \mathbf{u} \rangle$。顺序无关紧要。

    - **线性**：$\langle a\mathbf{u} + b\mathbf{v}, \mathbf{w} \rangle = a\langle \mathbf{u}, \mathbf{w} \rangle + b\langle \mathbf{v}, \mathbf{w} \rangle$。对加法和缩放，它分别满足可加性和齐次性。

- **点积**是最常见的内积，也是实际应用中最常用的具体形式。对于两个向量 $\mathbf{a} = (a_1, a_2, \ldots, a_n)$ 和 $\mathbf{b} = (b_1, b_2, \ldots, b_n)$：

$$\mathbf{a} \cdot \mathbf{b} = a_1 b_1 + a_2 b_2 + \cdots + a_n b_n$$
- 把对应分量相乘，再将乘积相加即可。

- 点积还有一个几何解释：

$$\mathbf{a} \cdot \mathbf{b} = \|\mathbf{a}\| \, \|\mathbf{b}\| \cos(\theta)$$
![点积：向量a投影到b，角度θ和投影示例](../images/dot_product.svg)


- 这个公式把点积与两个向量的夹角 $\theta$ 联系起来。结果反映了两个向量方向的一致程度。

- 如果它们指向相同的方向（$\theta = 0°$），$\cos(\theta) = 1$ 并且点积最大化。

- 如果它们是正交的（$\theta = 90°$），$\cos(\theta) = 0$ 并且点积恰好为零。这给我们一个精确的测试来检查正交性。

- 如果它们指向相反的方向（$\theta = 180°$），$\cos(\theta) = -1$ 并且点积为负。

- 向量与自身相乘给出其模的平方：$\mathbf{a} \cdot \mathbf{a} = \|\mathbf{a}\|^2$。

- 点积还可以计算投影。$\mathbf{a}$ 在 $\mathbf{b}$ 上的投影是：

$$\text{proj}_{\mathbf{b}}(\mathbf{a}) = \frac{\mathbf{a} \cdot \mathbf{b}}{\|\mathbf{b}\|^2} \, \mathbf{b}$$
- 想象一道光垂直照向 $\mathbf{b}$ 所在的直线。$\mathbf{a}$ 在这条直线上的投影就是它的影子，表示 $\mathbf{a}$ 沿 $\mathbf{b}$ 方向的分量。

- **余弦相似度**将点积除以两个向量的模来归一化：

$$\cos(\theta) = \frac{\mathbf{a} \cdot \mathbf{b}}{\|\mathbf{a}\| \, \|\mathbf{b}\|}$$
- 这给出一个值在 $-1$ 和 $1$ 之间，测量方向对齐程度，忽略向量的长度。它广泛用于 ML 中比较文档、嵌入和用户偏好等。

- 点积把两个向量映射为一个标量。**叉积**则接收两个向量并返回一个新向量。

- 叉积 $\mathbf{a} \times \mathbf{b}$ 产生一个同时垂直于 $\mathbf{a}$ 和 $\mathbf{b}$ 的向量：

$$\mathbf{a} \times \mathbf{b} = (a_2 b_3 - a_3 b_2, \; a_3 b_1 - a_1 b_3, \; a_1 b_2 - a_2 b_1)$$
- 只有在三维空间中才能使用叉积。虽然点积可以在任何维度上工作，但叉积是特定于三维空间的。

- 它的模等于由两个向量形成的平行四边形的面积：

$$\|\mathbf{a} \times \mathbf{b}\| = \|\mathbf{a}\| \, \|\mathbf{b}\| \sin(\theta)$$
- 点积使用 $\cos(\theta)$，叉积使用 $\sin(\theta)$。点积衡量方向的一致程度，叉积的大小反映两个向量张成的面积。

- 结果的方向遵循右手定则：右手手指从 $\mathbf{a}$ 的方向弯向 $\mathbf{b}$ 的方向时，拇指指向 $\mathbf{a} \times \mathbf{b}$。

- 与点积不同，叉积**不满足交换律**：$\mathbf{a} \times \mathbf{b} = -(\mathbf{b} \times \mathbf{a})$。交换顺序会改变结果方向。

- 如果两个向量平行，它们的叉积是零向量（因为 $\sin(0°) = 0$）。没有面积，也没有垂直方向。

- 当三个向量通过两种乘法组合时，我们得到的是 **三重积**。

- **标量三重积** $\mathbf{a} \cdot (\mathbf{b} \times \mathbf{c})$ 先计算两个向量的叉积，再与第三个向量做点积。结果是一个标量，其绝对值等于三个向量张成的平行六面体体积。

- 如果标量三重积为零，三个向量就**共面**，它们张成的体积为零。

- 顺序可以循环而不改变结果：$\mathbf{a} \cdot (\mathbf{b} \times \mathbf{c}) = \mathbf{b} \cdot (\mathbf{c} \times \mathbf{a}) = \mathbf{c} \cdot (\mathbf{a} \times \mathbf{b})$。

- **向量三重积** $\mathbf{a} \times (\mathbf{b} \times \mathbf{c})$ 连续进行两次叉积并返回一个向量，可以用下面的恒等式展开：

$$\mathbf{a} \times (\mathbf{b} \times \mathbf{c}) = (\mathbf{a} \cdot \mathbf{c})\mathbf{b} - (\mathbf{a} \cdot \mathbf{b})\mathbf{c}$$
- 结果总是位于由 $\mathbf{b}$ 和 $\mathbf{c}$ 定义的平面上。请注意，叉积 **不满足结合律**：$\mathbf{a} \times (\mathbf{b} \times \mathbf{c}) \neq (\mathbf{a} \times \mathbf{b}) \times \mathbf{c}$.

## 编程任务（使用 Colab 或笔记本）

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
