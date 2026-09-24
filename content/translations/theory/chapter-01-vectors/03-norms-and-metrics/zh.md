---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 01 - vectors/03. norms and metrics.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: ec5f2e1e396e95094b93a329f68f65aa4c843aa44bd72b5724f673a0ea67e6bc
status: reviewed
---
# 指标与范数

*范数衡量向量的大小；距离衡量两个向量之间的距离。本文件涵盖了L1、L2和L-infinity范数、欧几里得距离和余弦距离，以及为什么在ML中的kNN、聚类和检索中选择合适的距离函数至关重要。*

- 我们知道向量有大小和方向。但如何实际测量单个向量的“多大”或两个向量之间的“有多远”？这就是范数和度量发挥作用的地方。

- 在标量中，我们知道10 > 5，因为它们的价值量化了它们，但如何量化一个向量？它是范数，它测量单个向量的大小。

- 最熟悉的范数是欧几里得范数（L2），它只是我们已经知道的模公式：

$$\|\mathbf{v}\|_2 = \sqrt{v_1^2 + v_2^2 + \cdots + v_n^2}$$
- 但还有其他方式来测量大小。想象你在一个只有街道和建筑物的城市中。你不能通过建筑穿过街道，所以你的旅程的“长度”是沿着每条街道走的总块数。这是曼哈顿范数（L1）：

$$\|\mathbf{v}\|_1 = |v_1| + |v_2| + \cdots + |v_n|$$
- 或者你可能只关心最大的单个组件，忽略其余部分。这是最大范数（L-infinity）：

$$\|\mathbf{v}\|_\infty = \max(|v_1|, |v_2|, \ldots, |v_n|)$$
- 这三个都是**一般Lp范数**的特殊情况：

$$\|\mathbf{v}\|_p = (|v_1|^p + |v_2|^p + \cdots + |v_n|^p)^{1/p}$$
- 设置 $p = 2$ 为欧几里得距离，$p = 1$ 为曼哈顿距离，而 $p \to \infty$ 则是最大范数。随着 $p$ 增加，最大的分量贡献越来越多，最终只有一项重要。

- 每个范数必须遵守三条规则:

    - **非负性**: $\|\mathbf{v}\| \geq 0$，且 $\|\mathbf{v}\| = 0$ 只有在 $\mathbf{v} = \mathbf{0}$ 时。大小永远不会为负，只有零向量的大小为零。

    - **缩放**: $\|c\mathbf{v}\| = |c| \cdot \|\mathbf{v}\|$。将向量加倍，其大小也加倍。

    - **三角不等式**: $\|\mathbf{u} + \mathbf{v}\| \leq \|\mathbf{u}\| + \|\mathbf{v}\|$。短路的距离永远不会比绕道走远。

- 现在，**度量**用于测量两个向量之间的距离。想象一下，它是在询问：“这两个点之间有多远？”

- 获取度量的最简单方法是使用差值的范数：$d(\mathbf{u}, \mathbf{v}) = \|\mathbf{u} - \mathbf{v}\|$。从一个向量中减去另一个向量，然后测量剩余部分的大小。

- 使用欧几里得范数，我们得到了熟悉的 **欧几里得距离**：

$$d(\mathbf{u}, \mathbf{v}) = \sqrt{(u_1 - v_1)^2 + (u_2 - v_2)^2 + \cdots + (u_n - v_n)^2}$$
- 使用曼哈顿范数则得到 **曼哈顿距离**，即沿每个轴的总差值，类似于两个地点之间计数城市街区的距离。

- 每个度量都必须遵守四个规则：

    - 非负性： $d(\mathbf{u}, \mathbf{v}) \geq 0$距离永远不能为负。

    - **身份**：如果和 $\mathbf{u} = \mathbf{v}$ 相同，则 $d(\mathbf{u}, \mathbf{v}) = 0$ 为真。零距离意味着同一个点。

    - **对称性**：$d(\mathbf{u}, \mathbf{v}) = d(\mathbf{v}, \mathbf{u})$。从A到B的距离等于从B到A的距离。

    - 三角不等式 $d(\mathbf{u}, \mathbf{w}) \leq d(\mathbf{u}, \mathbf{v}) + d(\mathbf{v}, \mathbf{w})$直接走永远比绕路长。

- 两个有什么关系？一个度量向量，另一个度量两个之间的差距。每个度量自然创建了一个度量（通过测量差异），但不是每一个度量都来自一个度量。

- 例如，**汉明距离**计算两个向量不同位置的数量。它是有效的度量标准，但不是任何范数的来源。

- 在机器学习中，选择合适的范数或度量非常重要。

- L2距离是将每个差值平方后再求和，因此单个较大的差异会主导结果。

- L1距离是绝对差值的总和，每个差值都同等对待。一个较大的差异对L2的影响较小。

## 编程任务（使用CoLab或笔记本）

1. 计算向量的L1和L2范数。尝试改变数值，观察哪个范数对大成分更敏感，还是对小成分更敏感。然后尝试计算p范数（例如，1、2、5、10、50、100），并观察它逐渐接近无穷范数值。
```python
import jax.numpy as jnp

v = jnp.array([3.0, -4.0, 1.0])

l1 = jnp.sum(jnp.abs(v))
l2 = jnp.sqrt(jnp.sum(v ** 2))

print(f"L1: {l1}, L2: {l2:.2f}")
```

2. 计算两个向量的欧几里得距离和曼哈顿距离。尝试将向量移动更近或更远，并观察每个距离如何响应不同。
```python
import jax.numpy as jnp

u = jnp.array([1.0, 2.0, 3.0])
v = jnp.array([4.0, 0.0, 1.0])

euclidean = jnp.sqrt(jnp.sum((u - v) ** 2))
manhattan = jnp.sum(jnp.abs(u - v))

print(f"Euclidean: {euclidean:.2f}, Manhattan: {manhattan}")
```
