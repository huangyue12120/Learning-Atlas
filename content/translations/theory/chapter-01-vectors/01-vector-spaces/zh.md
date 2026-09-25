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

*向量空间是机器学习（ML）使用的数学空间。本文件涵盖向量加法、标量乘法、封闭性公理、子空间，以及 AI 中的大多数对象为何用向量表示。*

- 把向量空间看作容纳数学对象的一类集合，每个对象称为**向量**。

- 向量空间是一个集合，其中的向量可以相加，也可以进行标量乘法，运算结果仍留在这个集合中。

- 一个有用的反例是：整数 $\mathbb{Z}$ 不是实数域上的向量空间，因为把 $3$ 乘以 $0.5$ 会得到不属于该集合的 $1.5$。“结果不能离开空间”正是定义中的关键限制。

- 为了建立机器学习中的几何直觉，我们把向量看作欧几里得空间中的点，并用坐标表示它们。

- 向量 $\mathbf{a}$（用粗体小写字母表示）有 $n$ 个坐标，每个坐标表示它在相应坐标轴上的位置。

$$\mathbf{a} = [a_1, a_2, a_3]$$
![三维空间中，向量 \(a = (3, 2, 4)\) 在 x、y、z 轴上绘制](../images/vector_3d.svg)


- 向量空间中的向量遵循一组明确的规则：

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

- 我们可以表示多个人，再比较他们之间的距离。

![三个人类作为向量：Alice 和 Carol 接近，Alice 和 Bob 非常远](../images/human_vectors.svg)


- 我们还可以加入更多特征，构成更丰富的人的表示；在机器学习中，这通常称为**特征向量**。

- 特征越独特、越有意义，特征向量的描述能力越强。

- 超过三维后，向量很难直接可视化，这推动了线性代数的发展。

- **线性代数**研究向量、向量空间以及向量之间的映射。

- 在 AI/ML 中，我们几乎把所有对象都表示为向量，因此线性代数构成了这个领域的基础。

- 向量加法可以通过将一个向量放在另一个向量的尾部，然后从原点到末端绘制来完成。

![向量加法：向量 \(a\)（红色）加上向量 \(b\)（蓝色）等于结果向量 \(a + b\)（绿色虚线）](../images/vector_addition.svg)


- 对于两个向量 $\mathbf{a} = (a_1, a_2)$ 和 $\mathbf{b} = (b_1, b_2)$：$\mathbf{a} + \mathbf{b} = (a_1 + b_1, a_2 + b_2)$

- 向量也可以相减，所有加法规则同样适用。

- 将向量乘以标量会按该因子缩放向量，方向保持不变。

![标量乘法：向量 \(v\)（红色），2\(v\)（蓝色，加倍），-\(v\)（紫色，反转）](../images/scalar_multiplication.svg)


- 对于标量 $c$ 和向量 $\mathbf{v} = (v_1, v_2)$：$c\mathbf{v} = (cv_1, cv_2)$

- **加法封闭性**：把同一向量空间中的任意两个向量相加，结果仍属于该空间。若 $\mathbf{u} \in V$ 且 $\mathbf{v} \in V$，则 $\mathbf{u} + \mathbf{v} \in V$。

- **乘法封闭性**：如果将空间中的任何向量乘以标量，结果仍然是该空间内的向量：如果 $\mathbf{v} \in V$ 和 $c \in F$，则 $c\mathbf{v} \in V$

- **向量加法的交换律**：对于任意两个向量 $\mathbf{u}$ 和 $\mathbf{v}$，都有 $\mathbf{u} + \mathbf{v} = \mathbf{v} + \mathbf{u}$。

![平行四边形法则：两种路径（u 然后 v，或 v 然后 u）到达相同点](../images/commutativity.svg)


- 通过平行四边形的两条路径都到达同一个点。

- **零向量**：存在一个向量 $\mathbf{0}$，使得对任意向量 $\mathbf{v}$ 都有 $\mathbf{v} + \mathbf{0} = \mathbf{v}$。

![零向量：\(v + 0 = v\)](../images/zero_vector.svg)


- **加法逆元**：对于任何向量 $\mathbf{v}$，存在一个向量 $-\mathbf{v}$，使得： $\mathbf{v} + (-\mathbf{v}) = \mathbf{0}$

![加法逆元：向量 \(v\)（红色）和 -\(v\)（蓝色）相互抵消为零](../images/additive_inverse.svg)


- **分配律 1**：对于任意标量 $c$ 和向量 $\mathbf{u}, \mathbf{v}$，都有 $c(\mathbf{u} + \mathbf{v}) = c\mathbf{u} + c\mathbf{v}$。

![分配律：缩放的总和等于缩放向量的总和](../images/distributivity.svg)


- 向量的缩放和其分量的缩放之和相同。

- **分配律 2**：对于任何标量 $c$、$d$ 和向量 $\mathbf{v}$， $(c + d)\mathbf{v} = c\mathbf{v} + d\mathbf{v}$

- **结合律**：对于任何标量 $c$、$d$ 和向量 $\mathbf{v}$： $(cd)\mathbf{v} = c(d\mathbf{v})$

- **单位元**：对任意向量 $\mathbf{v}$，都有 $1\mathbf{v} = \mathbf{v}$，其中 $1$ 是标量域的乘法单位元。

- 一些向量空间的例子：

    - **$\mathbb{R}^n$（$n$ 维空间）**：由 $n$ 个实数构成的向量组成的空间。例如，向量可以写成 $[1, 4, 3000, \ldots]$；相加或缩放向量后，结果仍属于同一个空间。

    - **灰度图像**：$28 \times 28$ 的图像包含 784 个像素强度值，也就是 $\mathbb{R}^{784}$ 中的一个向量。把两幅图像相加（混合）或缩放其中一幅（调亮），仍会得到同样大小的图像。

    - **音频信号**：以 44.1 kHz 采样的一秒音频片段有 44,100 个采样值，因此可表示为一个向量。混合两段音频就是进行向量加法。

    - **多项式**：两个多项式相加，或用标量乘以一个多项式，结果仍是多项式，因此多项式也构成向量空间。向量不一定长得像箭头。

- **子空间**是大向量空间中的一个向量空间。把三维空间想成一间房屋，穿过房屋中心的平面和直线都可以是子空间。

- 关键要求是子空间必须穿过原点。如果将那张纸移开中心，它就不再是子空间，因为零向量不再在上面。

![子空间：3D 空间内的直线和通过原点的平面](../images/subspaces.svg)


- 向量空间中的所有规则（加法、标量乘法、封闭性）仍然适用于子空间。你可以在其中添加或缩放向量，而不会“掉出”到更大的空间中。

- 通过原点的直线是一个1维子空间，通过原点的平面是2维子空间，整个空间也是它自己的子空间。

- 在机器学习中，子空间自然出现。高维度数据通常在低维子空间上具有结构。PCA技术找到这个子空间，以便我们可以更高效地处理数据。

## 编程任务（使用 Colab 或笔记本）

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

## 补充任务（认识一些数学符号）

| 符号 | 含义 | 示例 |
|---|---|---|
| ∈ | 属于集合 | $x \in A$：$x$ 属于集合 $A$ |
| ∉ | 不属于集合 | $x \notin A$ |
| ⊂ | 真子集 | $A \subset B$ |
| ⊆ | 子集或相等 | $A \subseteq B$ |
| ∪ | 并集 | $A \cup B$：属于 $A$ 或 $B$ 的元素 |
| ∩ | 交集 | $A \cap B$：同时属于 $A$ 和 $B$ 的元素 |
| ∅ | 空集 | $A = \varnothing$ |
| ℝ | 实数 | $x \in \mathbb{R}$ |
| ℤ | 整数 | $-2, -1, 0, 1, 2$ |
| ℕ | 自然数 | $1, 2, 3, \ldots$ |
| ℚ | 有理数 | $1/2$ 这样的分数 |
| ⇒ | 蕴含 | $x > 2 \Rightarrow x > 1$ |
| ⇔ | 当且仅当 | $x = 2 \Leftrightarrow x^2 = 4$（还需满足额外条件） |
| ∀ | 对所有 | $\forall x \in \mathbb{R}$ |
| ∃ | 存在 | $\exists x$ 使得 $x^2 = 4$ |
| ¬ | 非 | $\neg P$：命题 $P$ 不成立 |
| ∧ | 且 | $P \land Q$ |
| ∨ | 或 | $P \lor Q$ |
| ∴ | 因此 | $x = 2$，因此 $x^2 = 4$ |
