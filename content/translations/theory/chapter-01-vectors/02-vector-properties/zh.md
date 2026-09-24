---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 01 - vectors/02. vector properties.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 3ead483bbc41fe399620cf1bbf88734242d54dfc0deca9eb5e784463a1d224a0
status: reviewed
---
# 向量性质

*向量性质描述了定义向量行为的几何和代数特性。本文件涵盖了向量的模、方向、单位向量、相等性、平行性、正交性和线性独立性，这些是机器学习特征空间中构建块的重要组成部分。*

- **模**（或长度）表示它到达的距离。想象一下箭头的长度。对于向量 $\mathbf{a} = (a_1, a_2, a_3)$，其模为：

$$\|\mathbf{a}\| = \sqrt{a_1^2 + a_2^2 + a_3^2}$$
- 这是将 Pythagorean 定理扩展到更高维度，并测量从原点到点的直线距离。

- **方向**表示它指向的地方，简单地想象一条从原点到坐标点的直线。

- 当未明确指定原点时，我们通常暗示（0,0,...0），至少在可视化方面是这样。

- 位置无关，总是关于位移：从原点绘制的 $(3, 2)$ 向量和从另一个点绘制的 $(3, 2)$ 向量仍然相等。

![向量相等：从两个不同起始点绘制的相同（3,2）向量](../images/vector_equality.svg)


- 两个向量可以具有相同的长度但指向完全不同的方向，或者指向相同的方向但长度不同。

![同方向，不同大小（v和2v） vs 同大小，不同方向](../images/magnitude_direction.svg)


- 两个向量如果且仅当它们的对应分量匹配时才相等；同样长度、相同方向，即完全相同的箭头。

$$\mathbf{a} = \mathbf{b} \iff a_i = b_i \text{ for all } i$$
- 两个向量平行如果其中一个是一个标量倍数的另一个。它们沿着同一条直线指向，要么在同一个方向上，要么正好相反。

$$\mathbf{a} \parallel \mathbf{b} \iff \mathbf{a} = k\mathbf{b} \text{ for some scalar } k \neq 0$$
![平行向量：a和b指向相同方向，a和-b指向相反方向](../images/parallel_vectors.svg)


- 如果 $k > 0$，它们指向相同的方向。如果 $k < 0$，它们指向相反的方向。无论哪种方式，它们都通过原点位于同一条直线上。

- 从直观上讲，平行向量携带没有“新”方向信息。一个只是另一个的拉伸或翻转版本。

- 两个向量正交（垂直）如果它们指向完全独立的方向。沿着一个移动时，不会在另一个上取得任何进展。我们将在机器学习中经常遇到正交性。

![正交向量：u和v在直角处相交](../images/orthogonal_vectors.svg)


- 想象一下向北行走然后向东行走，这些是正交方向，无论向北走多少步都不会让你向东移动。我们将遇到正交性非常频繁。

- 正交性在机器学习中至关重要：具有正交特性的特征携带完全独立的信息，这是理想的表现形式。

- 任何两个向量之间都有一个 **角度** $\theta$ 之间的角度，范围从 $0°$ 到 $180°$。

- 这个角度捕捉了两个方向之间的全部关系：$0°$表示平行（相同方向），$180°$表示平行（相反方向），而$90°$表示正交。除此之外，所有情况都是混合的。

- 大多数机器学习中的向量关系都存在于这个范围内。稍后，我们将看到精确的工具（点积、余弦相似性）来计算这个角度。

- A set of vectors is **linearly dependent** if at least one of them can be built from the others by scaling and adding. It brings no new information to the set.

- For example, if $\mathbf{c} = 2\mathbf{a} + 3\mathbf{b}$, then $\mathbf{c}$ is redundant, you already have everything $\mathbf{c}$ offers through $\mathbf{a}$ and $\mathbf{b}$.

- 平行向量总是线性相关的，因为一个只是另一个的缩放副本。包含零向量的任何集合也都是线性相关的。

- 向量是线性独立的，如果它们不能由其他向量构建。每个向量都贡献了一个真正的新方向。正交向量总是线性独立的。

- 一些直觉：如果你想研究不同的人并用向量表示他们，线性相关的向量（人类）会偏向于被采样数据点，这是设计训练AI的数据集时的重要因素。

- 在二维中，两个线性独立的向量可以到达平面上的任何点。在三维中，你需要三个。这个关于“需要多少个独立向量”的想法直接与维度相关联。

- 向量是稀疏的，当大多数分量为零时。相反，大多数分量不为零的情况称为稠密。

$$\mathbf{s} = [0, 0, 3, 0, 0, 0, 1, 0, 0, 0]$$
- 稀疏性对存储和计算都有影响。稀疏向量可以通过只跟踪非零分量来更高效地存储和处理。

- **单位向量**是一个模长恰好为1的向量。它纯粹代表方向，没有长度信息。你可以通过将任何向量除以其模长来将其转换为单位向量：

$$\hat{\mathbf{a}} = \frac{\mathbf{a}}{\|\mathbf{a}\|}$$
- 这种过程称为归一化。它剥离了“多远”并只保留“朝哪个方向”，这是机器学习中一个重要的因素。

- 标准单位向量沿着每个轴指向：$\hat{\mathbf{i}} = (1, 0, 0)$，$\hat{\mathbf{j}} = (0, 1, 0)$，$\hat{\mathbf{k}} = (0, 0, 1)$。任何向量都可以用这些向量的线性组合表示，例如 $(3, 2, 4) = 3\hat{\mathbf{i}} + 2\hat{\mathbf{j}} + 4\hat{\mathbf{k}}$.

## 编程任务（使用 CoLab 或笔记本）

1. 计算向量的模，并验证它是否符合毕达哥拉斯定理，然后修改为计算单位向量。
```python
import jax.numpy as jnp

a = jnp.array([3.0, 4.0])

magnitude = jnp.sqrt(jnp.sum(a ** 2))
print(f"Magnitude of a: {magnitude}")
```

2. 检查两个向量是否平行，通过测试其中一个是否是另一个的标量倍数来实现。
```python
import jax.numpy as jnp

a = jnp.array([2, 4, 6])
b = jnp.array([1, 2, 3])

ratios = a / b
print(f"Ratios: {ratios}")
print(f"Parallel: {jnp.allclose(ratios, ratios[0])}")
```