---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/01-math-foundations/02-vectors-matrices-operations/docs/en.md
  revision: 7157ca74a135fad2165f680ec4b4e592f075ec21
  sha256: 398ce87f481e54f360898e1af0d0c05877f631d5d1b1c1edebf83f3cf5a09981
status: reviewed
---

# 向量、矩阵与运算

> 神经网络的核心计算是矩阵乘法及其组合。

**类型：** 实作  
**学习实现：** Python（上游另有 Julia 版本，可由原文追溯）  
**前置课程：** Phase 1 · 第 01 课「线性代数直觉」  
**预计学习：** 约 60 分钟

## 学习目标

- 从零实现矩阵的逐元素运算、矩阵乘法、转置、行列式与逆。
- 区分逐元素乘法与矩阵乘法，并说明各自适用的场景。
- 只用自建的 `Matrix` 类实现一个稠密神经网络层：`relu(W @ x + b)`。
- 解释广播（broadcasting）以及偏置如何加到神经网络输出上。

## 问题

搭建神经网络时，你会遇到：

```text
output = activation(weights @ input + bias)
```

其中 `@` 是矩阵乘法，`weights` 是矩阵，`input` 是向量。不了解这些操作时，这一行像魔法；理解后，你会发现它就是一个网络层的前向传播：矩阵变换、加偏置、经过激活函数。

图像可看作像素矩阵，词嵌入（embedding）是向量，每一层网络都是矩阵变换。要理解 AI 系统，必须像理解变量一样理解这些基础操作。

## 概念

### 向量：有顺序的一组数

向量是一组数字，同时带有方向与长度。在 AI 中，它可表示数据点、特征或参数。

```text
v = [3, 4]        # 二维向量
w = [1, 0, -2]    # 三维向量
```

二维向量 `[3, 4]` 指向平面上的 `(3, 4)`，长度为 5。

### 矩阵：数字构成的网格

矩阵是二维数字网格，由行和列构成。一个 `m × n` 矩阵有 `m` 行、`n` 列：

```text
A = | 1  2  3 |     # 2 × 3 矩阵（2 行、3 列）
    | 4  5  6 |
```

神经网络的权重矩阵把输入向量变成输出向量；例如，784 个输入、128 个输出的层需要一个 `128 × 784` 的矩阵。

### 形状为何重要

矩阵乘法遵循严格规则：`(m × n) @ (n × p) = (m × p)`。内侧维度必须相同：

```text
(128 × 784) @ (784 × 1) = (128 × 1)
   权重矩阵        输入          输出

内侧维度：784 = 784  # 合法
```

因此，PyTorch 的形状不匹配错误说明这个数学条件没有满足。

### 操作对应表

| 操作 | 做什么 | 神经网络中的用途 |
|---|---|---|
| 加法 | 逐元素组合 | 向输出加偏置 |
| 标量乘法 | 缩放每个元素 | 学习率 × 梯度 |
| 矩阵乘法 | 变换向量 | 层的前向传播 |
| 转置 | 交换行与列 | 反向传播 |
| 行列式 | 对变换的单个总结 | 判断可逆性 |
| 逆矩阵 | 撤销一个变换 | 解线性方程组 |
| 单位矩阵 | 不改变输入 | 初始化、残差连接 |

### 逐元素乘法与矩阵乘法

这两个概念很容易混淆。逐元素乘法要求形状相同，只相乘对应位置：

```text
| 1  2 | * | 5  6 | = | 5  12 |
| 3  4 |   | 7  8 |   | 21 32 |
```

矩阵乘法计算左侧每一行与右侧每一列的点积，内侧维度需要匹配：

```text
| 1  2 |   | 5  6 |   | 1*5+2*7  1*6+2*8 |   | 19  22 |
| 3  4 | @ | 7  8 | = | 3*5+4*7  3*6+4*8 | = | 43  50 |
```

它们的规则、结果和用途都不同。

### 广播

把偏置向量加到一批输出时，两个形状并不完全相同。广播会把较小向量沿缺失维度重复：

```text
| 1  2  3 |   +   [10, 20, 30]
| 4  5  6 |

广播会把这个向量沿行扩展：

| 1  2  3 |   | 10  20  30 |   | 11  22  33 |
| 4  5  6 | + | 10  20  30 | = | 14  25  36 |
```

现代框架会自动完成这一步；理解它能帮助你判断“形状不同但代码为何能运行”。

```figure
vector-projection
```

## 动手实现

### 步骤 1：向量类

```python
class Vector:
    def __init__(self, data):
        self.data = list(data)
        self.size = len(self.data)

    def __repr__(self):
        return f"Vector({self.data})"

    def __add__(self, other):
        return Vector([a + b for a, b in zip(self.data, other.data)])

    def __sub__(self, other):
        return Vector([a - b for a, b in zip(self.data, other.data)])

    def __mul__(self, scalar):
        return Vector([x * scalar for x in self.data])

    def dot(self, other):
        return sum(a * b for a, b in zip(self.data, other.data))

    def magnitude(self):
        return sum(x ** 2 for x in self.data) ** 0.5
```

### 步骤 2：带核心操作的矩阵类

```python
class Matrix:
    def __init__(self, data):
        self.data = [list(row) for row in data]
        self.rows = len(self.data)
        self.cols = len(self.data[0])
        self.shape = (self.rows, self.cols)

    def __repr__(self):
        rows_str = "\n  ".join(str(row) for row in self.data)
        return f"Matrix({self.shape}):\n  {rows_str}"

    def __add__(self, other):
        return Matrix([
            [self.data[i][j] + other.data[i][j] for j in range(self.cols)]
            for i in range(self.rows)
        ])

    def __sub__(self, other):
        return Matrix([
            [self.data[i][j] - other.data[i][j] for j in range(self.cols)]
            for i in range(self.rows)
        ])

    def scalar_multiply(self, scalar):
        return Matrix([
            [self.data[i][j] * scalar for j in range(self.cols)]
            for i in range(self.rows)
        ])

    def element_wise_multiply(self, other):
        return Matrix([
            [self.data[i][j] * other.data[i][j] for j in range(self.cols)]
            for i in range(self.rows)
        ])

    def matmul(self, other):
        return Matrix([
            [
                sum(self.data[i][k] * other.data[k][j] for k in range(self.cols))
                for j in range(other.cols)
            ]
            for i in range(self.rows)
        ])

    def transpose(self):
        return Matrix([
            [self.data[j][i] for j in range(self.rows)]
            for i in range(self.cols)
        ])

    def determinant(self):
        if self.shape == (1, 1):
            return self.data[0][0]
        if self.shape == (2, 2):
            return self.data[0][0] * self.data[1][1] - self.data[0][1] * self.data[1][0]
        det = 0
        for j in range(self.cols):
            minor = Matrix([
                [self.data[i][k] for k in range(self.cols) if k != j]
                for i in range(1, self.rows)
            ])
            det += ((-1) ** j) * self.data[0][j] * minor.determinant()
        return det

    def inverse_2x2(self):
        det = self.determinant()
        if det == 0:
            raise ValueError("Matrix is singular, no inverse exists")
        return Matrix([
            [self.data[1][1] / det, -self.data[0][1] / det],
            [-self.data[1][0] / det, self.data[0][0] / det]
        ])

    @staticmethod
    def identity(n):
        return Matrix([
            [1 if i == j else 0 for j in range(n)]
            for i in range(n)
        ])
```

### 步骤 3：观察它运行

```python
A = Matrix([[1, 2], [3, 4]])
B = Matrix([[5, 6], [7, 8]])

print("A + B =", (A + B).data)
print("A @ B =", A.matmul(B).data)
print("A^T =", A.transpose().data)
print("det(A) =", A.determinant())
print("A^-1 =", A.inverse_2x2().data)

I = Matrix.identity(2)
print("A @ A^-1 =", A.matmul(A.inverse_2x2()).data)
```

### 步骤 4：连接到神经网络

```python
import random

inputs = Matrix([[0.5], [0.8], [0.2]])
weights = Matrix([
    [random.uniform(-1, 1) for _ in range(3)]
    for _ in range(2)
])
bias = Matrix([[0.1], [0.1]])

def relu_matrix(m):
    return Matrix([[max(0, val) for val in row] for row in m.data])

pre_activation = weights.matmul(inputs) + bias
output = relu_matrix(pre_activation)

print(f"Input shape: {inputs.shape}")
print(f"Weight shape: {weights.shape}")
print(f"Output shape: {output.shape}")
print(f"Output: {output.data}")
```

这给出一个稠密层：`output = relu(W @ x + b)`。每个稠密神经网络层都执行同样的操作。

## 使用库

NumPy 用更少的代码完成上述操作，且速度可高出几个数量级。

```python
import numpy as np

A = np.array([[1, 2], [3, 4]])
B = np.array([[5, 6], [7, 8]])

print("A + B =\n", A + B)
print("A * B (element-wise) =\n", A * B)
print("A @ B (matrix multiply) =\n", A @ B)
print("A^T =\n", A.T)
print("det(A) =", np.linalg.det(A))
print("A^-1 =\n", np.linalg.inv(A))
print("I =\n", np.eye(2))

inputs = np.random.randn(3, 1)
weights = np.random.randn(2, 3)
bias = np.array([[0.1], [0.1]])
output = np.maximum(0, weights @ inputs + bias)

print(f"\nNeural network layer: {weights.shape} @ {inputs.shape} = {output.shape}")
print(f"Output:\n{output}")
```

Python 中的 `@` 运算符会调用 `__matmul__`。NumPy 用 C 和 Fortran 编写的优化 BLAS 例程实现它；数学相同，速度可快约 100 倍。

NumPy 的广播：

```python
matrix = np.array([[1, 2, 3], [4, 5, 6]])
bias = np.array([10, 20, 30])
print(matrix + bias)
```

NumPy 会把一维偏置自动广播到两行。这正是每个神经网络中偏置加法的工作方式。

## 交付物

本课产出一个用几何直觉讲解矩阵运算的提示词，见上游 `outputs/prompt-matrix-operations.md`。这里构建的 `Matrix` 类是 Phase 3 第 10 课小型神经网络框架的基础。

## 练习

1. **验证逆矩阵。** 计算 `A @ A.inverse_2x2()` 并确认得到单位矩阵。用三组不同的 2×2 矩阵重复；行列式为零时会怎样？
2. **实现 3×3 逆矩阵。** 用伴随矩阵法扩展 `Matrix`，再与 `numpy.linalg.inv` 对照。
3. **搭建两层网络。** 只用 `Matrix` 类（不使用 NumPy）构造两层神经网络：输入 (3) → 隐层 (4) → 输出 (2)。随机初始化权重，运行一次前向传播，并验证所有形状。

## 术语

| 术语 | 实际含义 |
|---|---|
| 向量 | 有顺序的一组数；在 AI 中通常是高维空间中的点。 |
| 矩阵 | 线性变换，把向量从一个空间映射到另一个空间。 |
| 矩阵乘法 | 左矩阵的每行与右矩阵的每列做点积；顺序重要。 |
| 转置 | 交换行与列，把 `m × n` 变成 `n × m`。 |
| 行列式 | 描述变换缩放面积或体积的程度；为零意味着压扁了某个维度。 |
| 逆矩阵 | 能撤销原变换的矩阵；只在矩阵可逆时存在。 |
| 单位矩阵 | 矩阵乘法中的“1”。 |
| 广播 | 沿缺失维度重复较小数组以匹配较大数组。 |
| 逐元素运算 | 对对应位置操作；形状必须相同或可广播。 |

## 原文与补充阅读

- 锁定版本的上游课程：`phases/01-math-foundations/02-vectors-matrices-operations/docs/en.md`
- [3Blue1Brown：线性代数的本质](https://www.3blue1brown.com/topics/linear-algebra)
- [NumPy broadcasting 文档](https://numpy.org/doc/stable/user/basics.broadcasting.html)
- [Stanford CS229 线性代数复习](http://cs229.stanford.edu/section/cs229-linalg.pdf)
