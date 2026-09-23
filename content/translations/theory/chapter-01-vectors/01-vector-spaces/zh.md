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

*本篇将向量空间放回 AI 工程语境，保留源文中的定义、公式、代码、图示和实践边界，便于逐项核对。*

* Vector 空间构成 ML所居住的数学操场. 此文件涵盖了向量添加,scalar乘法,关闭轴和子空间,以及AI中几乎所有东西为什么都以向量表示. *

- 将向量空间想成是数学物体所居住的特定类型的游乐场,每个物体被称作"**活体**".

- 向量空间被正式定义为可被添加并缩放而无需离开空间的向量集合.

- 有用的非实例:整数$\mathbb{Z}$** 不** 自缩放以来, 显示在实际数字上的向量空间$3$以$0.5$给$1.5$,它位于设定之外。定义中的"不离开空间"部分正在做真正的工作.

- 对于机器学习中的几何直觉(ML),我们总是会把向量视为以它为坐标为代表的欧几里得空间的一个点.

- 向量$\mathbf{a}$(数学上作为小写字母以黑体表示)$n$坐标,每个都代表轴上的位置。

$$\mathbf{a} = [a_1, a_2, a_3]$$

![图示](../images/vector_3d.svg)

- 向量空间中的向量生活在一套非常具体、不可突破的规则下:

    - ** 增量(合并)**:
    你可以把任意两个向量并结合到一起来创造一个新的向量.
    将向量视为运动的指示.
    如果向量A的意思是"行走3步向前"而向量B的意思是"行走2步向右",那么,向量A的意思是"行走2步向右".
    加上它们(A+B),创造了一个新的单行道指令:"行走3步向前和2步向右".

    - ** 相加(缩放)**:
    您可以使用一个正数(“ scalar ”) 来取出任何向量并缩放它。
    你可以拉伸,收缩,或倒置.
    如果向量A是"行走3步向前",缩放2使它成为"行走6步向前".
    以 -1 的缩放将其完全翻到"行走3步后退".

- 向量空间的**dimension**是其包含的独立方向的数目.$\mathbb{R}^2$是二维(需要2个坐标),而$\mathbf{a}$居于$\mathbb{R}^3$.

- 例如,我们可以代表任何物体,比如,作为载体的人类。$h_1$= 高度为厘米,$h_2$= 公斤重,$h_3$=年龄。

$$\mathbf{h} = [185, 75, 30]$$

- 我们现在创造了一个载体空间,载体代表人类。

- 我们可以代表多个人类,看看他们有多相近或相隔多远!

![图示](../images/human_vectors.svg)

- 我们可以增加更多的特征,在ML中创造出一个人类的丰富代表,常被称作特征向量.

- 你拥有的更独特和有意义的特征, 特性向量的描述性越强, 一个需要记住的重要因素.

- 除了3个维度,向量变得非常难以进行视觉检查,激发出一个数学领域,叫作**Linear代数**.

- 现在,** 线内代数** 是向量,向量空间和向量之间的映射的研究.

- 我们几乎在AI/ML中将每样东西都作为向量来代表,使线性代数成为这个领域的基石.

- 通过将一个向量放入另一个视相的尾部来进行向量添加,并从源到终点来绘制.

![图示](../images/vector_addition.svg)

- 对于两个向量$\mathbf{a} = (a_1, a_2)$财务报告和已审计财务报表$\mathbf{b} = (b_1, b_2)$: $\mathbf{a} + \mathbf{b} = (a_1 + b_1, a_2 + b_2)$

- 向量也可以被减去,所有添加规则也适用.

- 将向量以平面尺乘以该因子在同一方向上.

![图示](../images/scalar_multiplication.svg)

- 给一把平板$c$键$\mathbf{v} = (v_1, v_2)$: $c\mathbf{v} = (cv_1, cv_2)$

- ** 在添加** 下关闭:如果从向量空间中添加任何两个向量,结果也是同一空间内的一个向量:如果$\mathbf{u} \in V$财务报告和已审计财务报表$\mathbf{v} \in V$,则$\mathbf{u} + \mathbf{v} \in V$

- ** Scalar 乘法下关闭**:如果从向量空间中将任何向量乘以 scalar,结果为同一空间内的一个向量: 如果$\mathbf{v} \in V$财务报告和已审计财务报表$c \in F$,则$c\mathbf{v} \in V$

- ** 添加的可比性**:用于任何两种向量$\mathbf{u}$财务报告和已审计财务报表$\mathbf{v}$: $\mathbf{u} + \mathbf{v} = \mathbf{v} + \mathbf{u}$

![图示](../images/commutativity.svg)

- 两条通过平行图的路径到达同一点.

- **(零向量)**:存在向量$\mathbf{0}$用于任何向量的$\mathbf{v}$: $\mathbf{v} + \mathbf{0} = \mathbf{v}$

![图示](../images/zero_vector.svg)

- ** 附加反向**:每个向量$\mathbf{v}$,则存在向量$-\mathbf{v}$如此:$\mathbf{v} + (-\mathbf{v}) = \mathbf{0}$

![图示](../images/additive_inverse.svg)

- ** 分配法1**:用于任何平面$c$和向量$\mathbf{u}$, $\mathbf{v}$: $c(\mathbf{u} + \mathbf{v}) = c\mathbf{u} + c\mathbf{v}$

![图示](../images/distributivity.svg)

- 缩放总和(黄金) 给出的结果是 缩放向量的相加。

- ** 分配率2**:任何平面$c$, $d$键$\mathbf{v}$: $(c + d)\mathbf{v} = c\mathbf{v} + d\mathbf{v}$

- ** 协会**:用于任何平面$c$, $d$键$\mathbf{v}$: $(cd)\mathbf{v} = c(d\mathbf{v})$

- ** 身份元素**:用于任何向量$\mathbf{v}$: $1\mathbf{v} = \mathbf{v}$,在其中$1$是斯卡尔斯领域的多相特性。

- 向量空格的一些示例 :

    - **$\mathbb{R}^n$(n-维空间)**:所有在n-维空间中的真实数字,例向量 [1,430.nth项],再加两点或分尺一,你仍然降落在平面上某处.

    - ** 灰度图像**:a$28 \times 28$图像只是784像素强度,即. 向量在$\mathbb{R}^{784}$。。。添加两个图像(蓝调)或缩放一个(闪亮),则会给出另一个大小相同的图像.

    - ** Audio信号**:在44.1kHz取样的一秒钟的剪接是载体,有44,100个条目。将两个片段混合在一起只是向量添加.

    - **Polynomials**:增加两个多诺米或一个缩放一个数字给另一个多诺米,所以它们也形成一个向量空间. 向量不必像箭!

- 一个** subspace ** 只是更大的一个里面一个较小的游乐场。想象三维空间作为一个房间。平板纸从房间中央穿过是子空间,而单条直线从中央穿过也是这样.

- 关键要求是子空间必须经过源. 如果你把纸板移出中心, 它就不再是一个子空间, 因为零向量已经不在它上。

![图示](../images/subspaces.svg)

- 来自向量空间的所有相同规则(添加,缩放,关闭)仍在子空间内工作. 可以在其中添加或缩放向量,而从不"掉入"更大的空间.

- 穿过源头的一行是一维子空间,穿过源头的平面是二维子空间,而完整的空间本身是子空间.

- 在ML中,子空间自然地出现. 高维度数据往往具有生活在下维分空间上的结构. PCA这样的技术发现这个子空间,这样我们就可以更有效地处理数据.

## 编程任务（使用 Colab 或 notebook）


1. 运行代码以验证分配属性, 然后修改和播放以测试其他规则 !
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

2. 运行代码可视化不同的向量,然后修改不同坐标的值来理解每个轴如何影响位置.
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

## 支线：需要认识的数学符号


|Symbol|Meaning|Example|
|---|---|---|
| ∈ |is an element of|x ∈ A: x is in set A|
| ∉ |is not an element of|x ∉ A|
| ⊂ |is a proper subset of|A ⊂ B|
| ⊆ |is a subset of or equal to|A ⊆ B|
| ∪ |union|A ∪ B: things in A or B|
| ∩ |intersection|A ∩ B: things in both A and B|
| ∅ |empty set|A = ∅|
| ℝ |real numbers|x ∈ ℝ|
| ℤ |integers| -2, -1, 0, 1, 2 |
| ℕ |natural numbers| 1, 2, 3, ... |
| ℚ |rational numbers|fractions like 1/2|
| ⇒ |implies|x > 2 ⇒ x > 1|
| ⇔ |if and only if|x = 2 ⇔ x² = 4, with extra conditions|
| ∀ |for all|∀x ∈ ℝ|
| ∃ |there exists|∃x such that x² = 4|
| ¬ |not|¬P: not P|
| ∧ |and|P ∧ Q|
| ∨ |or|P ∨ Q|
| ∴ |therefore|x = 2, ∴ x² = 4|
