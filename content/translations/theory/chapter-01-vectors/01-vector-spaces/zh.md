---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 01 - vectors/01. vector spaces.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 1edd2e5bee4f13a5b527ff6743684a7de9bade90744a1bfdacb647c80068ee8b
status: reviewed
---
# 向量空间

*向量空间是ML的数学环境。本文件涵盖了向量加法、标量乘法、封闭公理、子空间以及为什么AI几乎都是用向量表示的原因。*

- 将向量空间视为一种特定类型的数学对象集合，每个对象称为**向量**。

- 向量空间的形式定义为一个可以进行加法和标量乘法的集合，而不会离开这个集合。

- 一个有用的非示例：整数$\mathbb{Z}$不是实数域上的向量空间，因为缩放$3$为$0.5$后得到的$1.5$不在集合内。定义中的“不会离开空间”部分正在做实际工作。

- 对于机器学习（ML）中的几何直观，我们将始终将向量视为欧几里得空间中的点，用坐标表示。

- 向量$\mathbf{a}$（用粗体字母表示）有$n$个坐标，每个坐标代表沿着轴的位置。

$$\mathbf{a} = [a_1, a_2, a_3]$$
![三维空间中，向量 \(a = (3, 2, 4)\) 在 x、y、z 轴上绘制](../images/vector_3d.svg)


- 向量空间中的向量遵循非常严格、不可打破的一套规则：

    - **向量加法（合并）**：
    你可以将任意两个向量结合起来，创建一个新的向量。
    将向量视为移动的指令。
    如果向量A表示“向前走3步”，向量B表示“向右走2步”，
    向量相加（A + B）创建一个新的单一指令： “向前走3步和向右走2步。”

    - **标量乘法（缩放）**：
    你可以用任何向量乘以一个普通的数字（“标量”）。
    你可以拉伸它、缩小它或反转它。
    如果向量A是“向前走3步”，那么乘以2后变成“向前走6步”。
    乘以-1后，它完全翻转为“向后走3步”。

- 向量空间的维度是指它包含的独立方向的数量。 $\mathbb{R}^2$是二维（需要2个坐标），而上面提到的$\mathbf{a}$生活在$\mathbb{R}^3$中。

- 例如，我们可以用向量表示任何对象，比如一个人，其中$h_1$是身高（厘米），$h_2$是体重（千克），$h_3$是年龄。

$$\mathbf{h} = [185, 75, 30]$$
- 现在我们已经创建了一个包含表示人的向量的向量空间。

- 我们可以表示多个个人，并查看它们之间的距离！

![三个人类作为向量：Alice 和 Carol 接近，Alice 和 Bob 非常远](../images/human_vectors.svg)


- 我们可以添加更多特征，创建一个丰富的描述一个人的人体向量，通常称为机器学习中的特征向量。

- 特征向量包含的特征越多，它就越描述性，这是一个需要记住的重要因素。

- 在三维以上，向量变得非常难以视觉检查，激发了一门数学领域：线性代数。

- 现在，**线性代数**是关于向量、向量空间和向量之间的映射的学科。

- 我们在AI/ML中几乎将一切表示为向量，使得线性代数成为该领域的基石。

- 向量加法可以通过将一个向量放在另一个向量的尾部，然后从原点到末端绘制来完成。

![向量加法：向量 \(a\)（红色）加上向量 \(b\)（蓝色）等于结果向量 \(a + b\)（绿色虚线）](../images/vector_addition.svg)


- 对于两个向量 $\mathbf{a} = (a_1, a_2)$ 和 $\mathbf{b} = (b_1, b_2)$：$\mathbf{a} + \mathbf{b} = (a_1 + b_1, a_2 + b_2)$

- 向量也可以相减，所有加法规则同样适用。

- 将向量乘以标量会按该因子缩放向量，方向保持不变。

![标量乘法：向量 \(v\)（红色），2\(v\)（蓝色，加倍），-\(v\)（紫色，反转）](../images/scalar_multiplication.svg)


- 对于标量 $c$ 和向量 $\mathbf{v} = (v_1, v_2)$：$c\mathbf{v} = (cv_1, cv_2)$

- **加法封闭性**：如果将两个向量空间中的任意两个向量相加，结果仍然是同一个空间内的向量：如果 $\mathbf{u} \in V$ 和 $\mathbf{v} \in V$，则 $\mathbf{u} + \mathbf{v} \in V$

- **乘法封闭性**：如果将空间中的任何向量乘以标量，结果仍然是该空间内的向量：如果 $\mathbf{v} \in V$ 和 $c \in F$，则 $c\mathbf{v} \in V$

- **向量加法的交换律**: 对于任意两个向量 $\mathbf{u}$ 和 $\mathbf{v}$：$\mathbf{u} + \mathbf{v} = \mathbf{v} + \mathbf{u}$

![平行四边形法则：两种路径（u 然后 v，或 v 然后 u）到达相同点](../images/commutativity.svg)


- 通过平行四边形的两条路径都到达同一个点。

- **(零向量)**：存在一个向量 $\mathbf{0}$，使得对于任何向量 $\mathbf{v}$： $\mathbf{v} + \mathbf{0} = \mathbf{v}$

![零向量：\(v + 0 = v\)](../images/zero_vector.svg)


- **加法逆元**：对于任何向量 $\mathbf{v}$，存在一个向量 $-\mathbf{v}$，使得： $\mathbf{v} + (-\mathbf{v}) = \mathbf{0}$

![加法逆元：向量 \(v\)（红色）和 -\(v\)（蓝色）相互抵消为零](../images/additive_inverse.svg)


- **分配律 1**：对于任何标量 $c$ 和向量 $\mathbf{u}$， $\mathbf{v}$： $c(\mathbf{u} + \mathbf{v}) = c\mathbf{u} + c\mathbf{v}$

![分配律：缩放的总和等于缩放向量的总和](../images/distributivity.svg)


- 向量的缩放和其分量的缩放之和相同。

- **分配律 2**：对于任何标量 $c$、$d$ 和向量 $\mathbf{v}$， $(c + d)\mathbf{v} = c\mathbf{v} + d\mathbf{v}$

- **结合律**：对于任何标量 $c$、$d$ 和向量 $\mathbf{v}$： $(cd)\mathbf{v} = c(d\mathbf{v})$

- **单位元**: 对于任何向量 $\mathbf{v}$: $1\mathbf{v} = \mathbf{v}$，其中 $1$ 是标量域的乘法单位元。

- 一些向量空间的例子：

    - **$\mathbb{R}^n$ (n-dimensional space)**: all real numbers in an n-dimensional space, example vector [1, 4, 3000... nth item], add two points or scale one, and you still land somewhere on the plane.

    - **Grayscale images**: a $28 \times 28$ image is just 784 pixel intensities, i.e. a vector in $\mathbb{R}^{784}$. Adding two images (blending) or scaling one (brightening) gives another image of the same size.

    - **Audio signals**: a 1-second clip sampled at 44.1kHz is a vector with 44,100 entries. Mixing two clips together is just vector addition.

    - **多项式**: 向量相加或标量乘以一个数仍然得到另一个多项式，因此它们也形成了向量空间。向量不必像箭头一样！

- **子空间**只是更大空间中的一个小房间。想象3D空间为一个房间。通过中心的平面是子空间，通过中心的一条直线也是子空间。

- 关键要求是子空间必须穿过原点。如果将那张纸移开中心，它就不再是子空间，因为零向量不再在上面。

![子空间：3D 空间内的直线和通过原点的平面](../images/subspaces.svg)


- 向量空间中的所有规则（加法、标量乘法、封闭性）仍然适用于子空间。你可以在其中添加或缩放向量，而不会“掉出”到更大的空间中。

- 通过原点的直线是一个1维子空间，通过原点的平面是2维子空间，整个空间也是它自己的子空间。

- 在机器学习中，子空间自然出现。高维度数据通常在低维子空间上具有结构。PCA技术找到这个子空间，以便我们可以更高效地处理数据。

## 编程任务（使用CoLab或笔记本）

1. 运行代码来验证分配性性质，然后修改并试着测试其他规则！
```python
import jax.numpy as jnp

u = jnp.array([1, 2])
v = jnp.array([3, 0])
c = 2

lhs = c * (u + v)
rhs = c*u + c*v

print(f"LHS: {lhs}")
print(f"RHS: {rhs}")
```

2. 运行代码来可视化不同的向量，然后修改坐标值以理解每个轴如何影响位置。
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt

# Try changing these vectors!
a = jnp.array([3, 2, 4])
b = jnp.array([1, 4, 2])
c = jnp.array([4, 1, 3])

fig = plt.figure()
ax = fig.add_subplot(111, projection="3d")

for vec, name, color in [(a, "a", "red"), (b, "b", "blue"), (c, "c", "green")]:
    ax.quiver(0, 0, 0, *vec, color=color, arrow_length_ratio=0.1, linewidth=2, label=name)

lim = int(jnp.abs(jnp.stack([a, b, c])).max()) + 1
ax.set_xlim([0, lim]); ax.set_ylim([0, lim]); ax.set_zlim([0, lim])
ax.set_xlabel("X"); ax.set_ylabel("Y"); ax.set_zlabel("Z")
ax.legend()
plt.show()
```

## 副任务（一些数学符号要知道）

| 符号 | 含含义 | 示例 |
|---|---|---| ∈ | 是集合中的元素 | x ∈ A: x在集合A中 |
| ∉ | 不是集合中的元素 | x ∉ A |
| ⊂ | 是真子集 | a ⊂ b |
| ⊆ | 是子集或等于 | a ⊆ b |
| ∪ | 并集 | A ∪ B: 同时在A和B中的事物 |
| ∩ | 交集 | A ∩ B: 同时在A和B中的事物 |
| ∅ | 空集 | A = ∅ |
| ℝ | 实数 | x ∈ ℝ |
| ℤ | 整数 | -2, -1, 0, 1, 2 |
| ℕ | 自然数 | 1, 2, 3, ... |
| ℚ | 有理数 | 分数如1/2 |
| ⇒ | 蕴含 | x > 2 ⇒ x > 1 |
| ⇔ | 如果且仅限于 | x = 2 ⇔ x² = 4，带有额外条件 |
| ∀ | 对所有 | ∀x ∈ ℝ |
| ∃ | 存在 | ∃x使得x² = 4 |
| ¬ | 否 | ¬P: 不是P |
| ∧ | 和 | P ∧ Q |
| ∨ | 或 | P ∨ Q |
| ∴ | 因此 | x = 2, ∴ x² = 4 |