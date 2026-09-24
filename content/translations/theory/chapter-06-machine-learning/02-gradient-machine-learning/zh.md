---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 06 - machine learning/02. gradient machine learning.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: e9c5575ef27ceca98c958218c3c4d79d143fa074329bd6d947f4c0d3f8d6501a
status: reviewed
---
# 梯度机器学习

*梯度优化方法通过迭代沿着损失表面的斜率更新模型参数。本文件涵盖了线性回归、逻辑回归、softmax分类、梯度下降变体、正则化（L1/L2）以及偏差-方差权衡*

- 文件 01 中使用了巧妙的启发式方法或封闭形式解。本文件涵盖了通过跟随梯度学习的算法，沿着损失表面的小步下降直到找到好的参数。梯度优化是线性回归到最大神经网络等一切的基础引擎。

- **线性回归**是最简单的梯度模型，它也有封闭形式解，因此是一个完美的起点。该模型是一条直线（在更高维度中是超平面）：

$$\hat{y} = w \cdot x + b = \sum_{i=1}^{d} w_i x_i + b$$
- 在矩阵表示法（见第 02 章），如果我们将所有训练输入堆叠为行的矩阵 $X$ 并将偏置项吸收进 $w$ 中，这变成了 $\hat{y} = Xw$。

- 目标是最小化 **均方误差 (MSE)**，即预测值与实际值之间平方差的平均值：

$$\mathcal{L}(w) = \frac{1}{n} \sum_{i=1}^{n} (y_i - \hat{y}_i)^2 = \frac{1}{n} \|y - Xw\|^2$$
- 为什么使用平方误差？它有一个概率论依据：如果假设目标由 $y = Xw + \epsilon$ 生成，其中 $\epsilon \sim \mathcal{N}(0, \sigma^2)$ 是正态分布，则最大化数据的 Gaussian 光谱（第 05 章）等价于最小化 MSE。平方误差也惩罚大错误比小错误更严重，这通常是有益的。

![数据点的散点图，带有最佳拟合线和虚线残差线，显示误差](../images/linear_regression_fit.svg)


- 因为 MSE 是 $w$ 的二次函数，它有一个唯一的全局最小值，我们可以分析性地找到。通过求导、将其设置为零并解出，得到了 **正规方程**：

$$w^{*} = (X^T X)^{-1} X^T y$$
- 这直接使用了第 02 章中的矩阵逆。表达式 $X^T X$ 是一个 $d \times d$ 矩阵（其中 $d$ 是特征数），而 $X^T y$ 是一个 $d$ 维向量。正规方程一次性给出了最优权重。

- 正规方程失败时的情况是什么？当 $X^T X$ 置为奇异（不可逆）时，这发生在特征线性相关或样本数量多于特征数（$d > n$）的情况下。在这种情况下，你需要正则化（稍后讨论）或梯度下降。

- **逻辑回归**将线性模型适配为二分类问题。相反，我们想要一个介于 0 和 1 之间的概率。**sigmoid函数**将任何实数压缩到这个范围内：

$$\sigma(z) = \frac{1}{1 + e^{-z}}$$
- 模型计算 $z = w \cdot x + b$（线性评分，就像线性回归一样），然后将其通过 sigmoid 函数传递： $\hat{y} = \sigma(w \cdot x + b)$。输出 $\hat{y}$ 被解释为 $P(y = 1 \mid x)$。

![Sigmoid曲线，阈值为0.5标记，显示分类区域，预测0和预测1](../images/sigmoid_logistic.svg)


- 梯度函数具有良好的性质： $\sigma(0) = 0.5$， $\sigma(z) \to 1$ 作为 $z \to \infty$， $\sigma(z) \to 0$ 作为 $z \to -\infty$和它的导数具有优雅的形式。 $\sigma'(z) = \sigma(z)(1 - \sigma(z))$。

- 梯度下降法（Logistic回归）的损失函数是二元交叉熵（BCE），它直接来自伯努利似然（第5章）。

$$\mathcal{L} = -\frac{1}{n} \sum_{i=1}^{n} \left[ y_i \log(\hat{y}_i) + (1 - y_i) \log(1 - \hat{y}_i) \right]$$
- 当真实标签为1时，只有第一个项被激活，并且惩罚低预测。当真实标签为0时，只有第二个项被激活，并且惩罚高预测。对数使得错误预测的惩罚极其陡峭：预测0.01时，真实标签为1的成本远高于预测0.4。

- 不像线性回归中的均方误差（MSE），二分类交叉熵损失函数的最小化权重没有封闭形式解。我们需要迭代方法：**梯度下降法**。

- 梯度下降的直觉很简单：想象你在一片布满山丘的雾气中站立（损失表面）。你无法看到全局最小值，但你可以感觉到脚下山坡的斜度。你向下走一步，再次感受斜度，重复这个过程。最终你会到达一个山谷。

$$w \leftarrow w - \eta \frac{\partial \mathcal{L}}{\partial w}$$
- 学习率 $\eta$ 控制你的步长大小。过大时，你会越过山谷，来回跳跃而无法收敛。过小时，你会缓慢地向前移动，可能陷入局部最小值中。

![一维损失曲线，三个球：大学习率超调，好学习率收敛，小学习率卡住](../images/gradient_descent_landscape.svg)


- 梯度 $\frac{\partial \mathcal{L}}{\partial w}$ 是指向最大上升方向的向量。我们减去它，因为我们想要下坡。这是第 03 章中应用链式法则到损失函数的结果。

- 批量梯度下降在每次迭代时使用整个训练集计算梯度，这给出了精确的梯度，但在 $n$ 很大时非常昂贵。

- **随机梯度下降（SGD）**每次使用一个随机样本。梯度是噪声的（它从一个样本中估计真实的梯度），但每次步骤都非常快。这种噪声实际上可以帮助跳出浅局部最小值。

- **批量梯度下降**：将两者平衡：每步使用一个包含 $B$ 个样本（通常是 32、64 或 256）的批次。这在计算效率（对批量进行矢量化操作）和梯度质量之间找到了平衡。几乎所有的深度学习都使用批量 SGD。

- **反向传播** 是如何在具有大量参数的模型中实际计算梯度的方法，例如神经网络。它是在第 3 章中应用链式法则系统地通过计算图进行的。

- 任何模型都可以表示为一个操作的有向无环图：输入流向数据，乘以权重，相加，通过非线性函数传递，并最终产生损失值。**前向传播**通过从输入到输出的数据流来计算输出（和损失）。

- The **backward pass** (backpropagation) flows gradients in reverse. Starting from the loss, you compute how the loss changes with respect to each intermediate value, using the chain rule at every node. If $L$ depends on $z$ which depends on $w$, then:

$$\frac{\partial L}{\partial w} = \frac{\partial L}{\partial z} \cdot \frac{\partial z}{\partial w}$$
- Each node only needs to know its own local derivative and the gradient flowing in from above. This makes backpropagation modular and efficient: the cost is roughly twice the forward pass (one pass forward, one backward).

- Vanilla SGD has a problem: it oscillates in directions with steep curvature while making slow progress in flat directions. **Optimisers** improve on this by adapting the step based on gradient history.

- **SGD with momentum** keeps a running average of past gradients (an exponential moving average, from chapter 04). This smooths out oscillations and accelerates progress along consistent directions:

$$v_t = \beta v_{t-1} + (1 - \beta) \nabla \mathcal{L}$$
$$w \leftarrow w - \eta \, v_t$$
- Think of a ball rolling downhill: momentum lets it build up speed in a consistent direction and dampens the side-to-side jitter. The typical value is $\beta = 0.9$.

- **Nesterov accelerated gradient (NAG)** is a small but clever tweak: instead of computing the gradient at the current position, compute it at the "look-ahead" position $w - \eta \beta v_{t-1}$. This corrective step reduces overshooting:

$$v_t = \beta \, v_{t-1} + \nabla \mathcal{L}(w - \eta \beta \, v_{t-1})$$
$$w \leftarrow w - \eta \, v_t$$
- Adagrad 根据每个参数的梯度大小调整学习率。接收大梯度的参数得到较小的学习率，反之亦然。它累加了平方梯度：

$$G_t = G_{t-1} + g_t^2, \quad w \leftarrow w - \frac{\eta}{\sqrt{G_t + \epsilon}} g_t$$
- 问题：$G_t$只增长，因此有效学习率单调递减，最终变得太小而无法学习任何东西。

- RMSprop通过使用一个指数移动平均的平方梯度来解决这个问题，而不是一个总和。因此，最近的梯度比古老的梯度更重要：

$$s_t = \beta \, s_{t-1} + (1 - \beta) g_t^2, \quad w \leftarrow w - \frac{\eta}{\sqrt{s_t + \epsilon}} g_t$$
- **Adam** (自适应矩估计法)结合了动量和RMSprop。它同时维护一个第一阶矩估计（梯度的均值，类似于动量）和一个第二阶矩估计（梯度平方的均值，类似于RMSprop）：

$$m_t = \beta_1 m_{t-1} + (1 - \beta_1) g_t$$
$$v_t = \beta_2 v_{t-1} + (1 - \beta_2) g_t^2$$
- 由于$m_t$和$v_t$在初始化时为零，它们在早期步骤中倾向于零。偏置修正解决了这个问题：

$$\hat{m}_t = \frac{m_t}{1 - \beta_1^t}, \quad \hat{v}_t = \frac{v_t}{1 - \beta_2^t}$$
$$w \leftarrow w - \frac{\eta}{\sqrt{\hat{v}_t} + \epsilon} \hat{m}_t$$
![二维轮廓图，显示SGD的锯齿状路径、动量遵循平滑路径，Adam沿着最直接路线到达最小值](../images/optimizer_trajectories.svg)


- 默认超参数（$\beta_1 = 0.9$、$\beta_2 = 0.999$、$\epsilon = 10^{-8}$）适用于广泛的问题范围，因此Adam是大多数深度学习工作中默认的优化器。

- **AdamW**将权重衰减与梯度更新分离。标准L2正则化和权重衰减对于SGD来说是等效的，但对于Adam来说不是。AdamW直接将权重衰减应用于参数而不是在梯度上添加$\lambda w$。这提高了泛化能力，并且现在是Transformer训练的标准做法：

$$w \leftarrow w - \eta \left( \frac{\hat{m}_t}{\sqrt{\hat{v}_t} + \epsilon} + \lambda \, w \right)$$
- **LION** (进化后的动量符号）是通过程序搜索发现的一种新的优化器。它只使用动量更新的符号（而不是大小），使得每次更新具有相同的尺度。LION比Adam（没有第二阶缓冲区）少用内存，并且在许多任务上可以与Adam匹敌或超越：

$$w \leftarrow w - \eta \cdot \text{sign}(\beta_1 \, m_{t-1} + (1 - \beta_1) \, g_t)$$
$$m_t = \beta_2 \, m_{t-1} + (1 - \beta_2) \, g_t$$
- **Muon**（动量加正交化）应用Nesterov动量，然后使用Newton-Schulz迭代对更新矩阵进行正交化，这近似于极分解。结果的更新方向位于Stiefel流形上，每个更新在所有奇异方向上的大致大小相同，防止任何单一方向主导。这消除了需要适应性第二阶估计（像Adam那样没有$v_t$缓冲区）所需的内存减少。Muon在Transformer训练中表现出色，通常在更快的收敛速度下与AdamW质量相当，特别是在注意力和MLP权重矩阵上。嵌入层和输出层通常是仍然由AdamW处理的。

$$G_t = \text{NesterovMomentum}(\nabla \mathcal{L})$$
$$U_t = \text{NewtonSchulz}(G_t) \approx G_t (G_t^T G_t)^{-1/2}$$
$$W \leftarrow W - \eta \, U_t$$
- Newton-Schulz迭代通过重复$X_{k+1} = \frac{1}{2} X_k (3I - X_k^T X_k)$来计算正交因子，通常进行几步（大约5到10次）。这避免了全SVD的成本，同时给出了一个很好的近似值。

![μ子正交化：动量更新导致奇异值偏斜，牛顿-舒尔兹迭代使它们均匀更新](../images/optimizer_muon.svg)


![优化器内存比较：每个参数存储的内容](../images/optimizer_memory.svg)


- 除了MSE和BCE之外，还有许多**损失函数**被广泛使用。

- **均方误差（MAE）**或L1损失，取绝对差值的平均值：$\frac{1}{n}\sum|y_i - \hat{y}_i|$。它比MSE更鲁棒于异常值，因为它不平方大错误。

- 胡珀损失结合了两者的优势：它在小误差时像均方误差一样平滑（易于优化），在大误差时像绝对误差那样鲁棒于异常值。它有一个阈值 $\delta$ 来控制过渡。

- **分类交叉熵（CCE）**将BCE推广到多类。如果 $\hat{y}_k$ 是预测的概率类别 $k$ 真正的类别是 $c$当然，我明白了。请继续。

$$\mathcal{L} = -\log(\hat{y}_c)$$
- 这只是正确类的负对数概率。最小化交叉熵等价于最大化似然，这与第5章的信息论连接起来：交叉熵衡量使用预测分布而不是真实分布时需要额外的比特数量。

- **损失函数** 用于SVM：$\mathcal{L} = \max(0, 1 - y \cdot f(x))$。它只惩罚那些在错误侧或在边界内的预测。一旦一个点被正确分类且有足够的信心，损失为零。

- 正则化通过在复杂模型中添加惩罚项来防止过拟合。正则化的损失函数为：

$$\mathcal{L}_{\text{reg}} = \mathcal{L}_{\text{data}} + \lambda \, R(w)$$
- **L2正则化**（岭回归、权重衰减）惩罚权重平方和：$R(w) = \|w\|^2 = \sum w_i^2$。它鼓励任何单个权重不要过大，有效地将所有权重向零收缩，但很少使它们完全为零。

- **L1正则化**（Lasso）惩罚绝对权重的总和：$R(w) = \|w\|_1 = \sum |w_i|$。它鼓励稀疏性，驱动许多权重精确为零，从而自动进行特征选择。

- 弹性网结合了两种特性：$R(w) = \alpha \|w\|_1 + (1 - \alpha) \|w\|^2$，同时实现了稀疏性和缩减。

- 美丽的贝叶斯解释（来自第 05 章）。L2 正则化等价于将权重放置在高斯先验上，并找到 MAP 估计。L1 正则化对应着拉普拉斯先验。正则化强度 $\lambda$ 控制你对先验的信任程度相对于数据。

- **评估指标**告诉你你的模型是否真的在工作。对于回归，MSE和MAE是标准的。对于分类，事情更加复杂。

- **混淆矩阵** 是二分类的计数表，包含四个计数：
  - 正确预测（TP）：预测为正，实际为正
  - 错误预测（FP）：预测为正，实际为负
  - 正确非预测（TN）：预测为负，实际为负
  - 错误非预测（FN）：预测为负，实际为正

- **准确性** = 当类不平衡时，$\frac{TP + TN}{TP + TN + FP + FN}$ 可能误导。如果 99% 的邮件不是垃圾邮件，一个总是预测“不是垃圾邮件”的模型有 99% 的准确率但毫无用处。

- 精度 = $\frac{TP}{TP + FP}$：所有预测为正的实际有多少个？高精度意味着很少出现误报。

- **召回率**（敏感度）= $\frac{TP}{TP + FN}$：实际正例中，你捕获了多少？高召回率意味着漏掉的案例很少。

- 准确率（准确率）= $\frac{2 \cdot \text{precision} \cdot \text{recall}}{\text{precision} + \text{recall}}$ 是精确率和召回率的调和平均数，平衡了两者。

- ROC 曲线显示在不同分类阈值下，真正正例率（召回）与假正例率（$\frac{FP}{FP + TN}$）之间的关系。完美的分类器会紧贴左上角。AUC（ROC曲线下的面积）是一个单一数字，用于总结性能：1.0是完美，0.5是随机猜测。

- 交叉验证提供了一个更可靠的估计泛化性能。在 $k$-fold 交叉验证中，我们将数据分成 $k$ 次，每次训练使用其中的 $k-1$ 次，测试使用剩余的那一次，并进行旋转。所有 $k$ 次测试性能的平均值是我们估计的结果。这种方法利用了所有数据（既用于训练又用于测试），特别是在数据稀缺时尤为宝贵。

- **偏差方差权衡**（第4章）是机器学习中的基本矛盾。一个模型的期望误差可以分解为：

$$\text{Error} = \text{Bias}^2 + \text{Variance} + \text{Irreducible Noise}$$
- **偏差** 是由于错误假设引起的系统误差（例如，拟合曲线数据的直线）。**方差** 是对训练数据波动的敏感度（例如，一个二次多项式拟合噪声）。简单模型具有高偏差和低方差；复杂模型具有低偏差和高方差。最佳平衡点最小化总误差。

- **学习率调度**在训练过程中调整 $\eta$。常见的策略包括：
  - 步衰减：每 $N$ 个 epoch 将 $\eta$ 乘以一个因子（例如，0.1）
  - 正弦退火：从初始值平滑地减少 $\eta$，遵循一个从初始值到接近零的正弦曲线
  - 缓热期：从非常小的 $\eta$ 开始线性增加，并在前几万个步骤后衰减。这有助于防止训练初期出现大的初始梯度导致不稳定
  - 1cycle：一次正弦上升然后下降，可以加速收敛

- **超参数调优**是通过找到学习率、批量大小、正则化强度等非梯度下降学习的设置的好值来实现的过程。常见的方法：
  - 网格搜索：在预先定义的网格上尝试每种组合（耗时但昂贵）
  - 随机搜索：随机采样组合，通常更高效，因为不是所有超参数都同等重要
  - 贝叶斯优化：构建目标函数的模型，并智能地选择下一个要尝试的超参数
  - **ASHA**（异步成功性递减算法）：在小预算下并行运行许多试验，然后将最成功的试验提升到更大的预算中，而淘汰其余的早期。它结合了早期停止的效率和大规模并行——而不是运行100个完整的训练过程，而是开始所有100个训练过程非常便宜，只保留每个阶段的前四分之一，并且只有少数完成。这是现代大规模调优框架如ray tune的核心。

- **无学习率调度的学习**完全消除了学习率调度的需要。不再在固定曲线上衰减 $\eta$，而是维护两个序列：一个缓慢移动的迭代平均值 $z_t$（收敛到最优解），另一个快速探索性的迭代 $y_t$（其中评估梯度）。最终输出是平均序列，这证明了它在 hindsight下与最佳调度的收敛率匹配。这完全消除了学习率作为超参数的角色——你只需设置基础的学习率，优化器负责其余部分。无学习率调度版本的 SGD 和 Adam 已经被证明能够达到或超过它们经过调优的调度版本。

## 编程任务（使用 Colab 或笔记本）

1. 实现线性回归，使用普通方程和梯度下降法。比较两种方法的结果，并绘制GD损失随迭代次数的变化曲线。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

# Generate synthetic data: y = 3x + 2 + noise
key = jax.random.PRNGKey(42)
n = 100
X = jax.random.uniform(key, (n, 1), minval=0, maxval=10)
y = 3 * X[:, 0] + 2 + jax.random.normal(key, (n,)) * 1.5

# Add bias column
X_b = jnp.column_stack([X, jnp.ones(n)])

# Normal equation
w_exact = jnp.linalg.solve(X_b.T @ X_b, X_b.T @ y)
print(f"Normal equation: w={w_exact[0]:.4f}, b={w_exact[1]:.4f}")

# Gradient descent
w_gd = jnp.zeros(2)
lr = 0.005
losses = []
for step in range(500):
    pred = X_b @ w_gd
    error = pred - y
    loss = jnp.mean(error ** 2)
    losses.append(float(loss))
    grad = (2 / n) * X_b.T @ error
    w_gd = w_gd - lr * grad

print(f"Gradient descent: w={w_gd[0]:.4f}, b={w_gd[1]:.4f}")

fig, axes = plt.subplots(1, 2, figsize=(12, 4))
axes[0].scatter(X[:, 0], y, s=15, alpha=0.5, color='#3498db')
axes[0].plot([0, 10], [w_exact[1], w_exact[0]*10 + w_exact[1]], color='#e74c3c', linewidth=2)
axes[0].set_title("Linear Regression Fit")
axes[0].set_xlabel("x"); axes[0].set_ylabel("y")

axes[1].plot(losses, color='#27ae60', linewidth=1.5)
axes[1].set_title("GD Loss Convergence")
axes[1].set_xlabel("Step"); axes[1].set_ylabel("MSE")
axes[1].set_yscale('log')
plt.tight_layout()
plt.show()
```

2. 实现从头开始的逻辑回归，并使用梯度下降进行训练。在二维数据集上进行训练，并可视化学习到的决策边界。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt
from sklearn.datasets import make_moons

# Generate data
X, y = make_moons(n_samples=300, noise=0.2, random_state=42)
X, y = jnp.array(X), jnp.array(y, dtype=jnp.float32)

def sigmoid(z):
    return 1 / (1 + jnp.exp(-z))

# Add bias column
X_b = jnp.column_stack([X, jnp.ones(len(X))])
w = jnp.zeros(3)
lr = 0.5
losses = []

for step in range(2000):
    z = X_b @ w
    pred = sigmoid(z)
    # BCE loss
    loss = -jnp.mean(y * jnp.log(pred + 1e-8) + (1 - y) * jnp.log(1 - pred + 1e-8))
    losses.append(float(loss))
    # Gradient
    grad = X_b.T @ (pred - y) / len(y)
    w = w - lr * grad

# Decision boundary
xx, yy = jnp.meshgrid(jnp.linspace(-2, 3, 200), jnp.linspace(-1.5, 2, 200))
grid = jnp.column_stack([xx.ravel(), yy.ravel(), jnp.ones(xx.size)])
zz = sigmoid(grid @ w).reshape(xx.shape)

plt.figure(figsize=(8, 6))
plt.contourf(xx, yy, zz, levels=[0, 0.5, 1], alpha=0.3, colors=['#e74c3c', '#3498db'])
plt.contour(xx, yy, zz, levels=[0.5], colors='#9b59b6', linewidths=2)
plt.scatter(X[y==0, 0], X[y==0, 1], c='#e74c3c', s=15, label='Class 0')
plt.scatter(X[y==1, 0], X[y==1, 1], c='#3498db', s=15, label='Class 1')
plt.title("Logistic Regression Decision Boundary")
plt.legend()
plt.grid(alpha=0.3)
plt.show()
```

3. 比较在二维二次曲面上优化器轨迹。从同一个起始点运行 SGD、SGD+动量和 Adam，并绘制它们的路径。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

# Elongated quadratic: L(w1, w2) = 0.5*w1^2 + 10*w2^2
def loss_fn(w):
    return 0.5 * w[0]**2 + 10 * w[1]**2

grad_fn = jax.grad(loss_fn)

def run_sgd(w0, lr=0.05, steps=80):
    w = w0.copy()
    path = [w.copy()]
    for _ in range(steps):
        g = grad_fn(w)
        w = w - lr * g
        path.append(w.copy())
    return jnp.stack(path)

def run_momentum(w0, lr=0.05, beta=0.9, steps=80):
    w, v = w0.copy(), jnp.zeros(2)
    path = [w.copy()]
    for _ in range(steps):
        g = grad_fn(w)
        v = beta * v + (1 - beta) * g
        w = w - lr * v
        path.append(w.copy())
    return jnp.stack(path)

def run_adam(w0, lr=0.05, b1=0.9, b2=0.999, eps=1e-8, steps=80):
    w, m, v = w0.copy(), jnp.zeros(2), jnp.zeros(2)
    path = [w.copy()]
    for t in range(1, steps + 1):
        g = grad_fn(w)
        m = b1 * m + (1 - b1) * g
        v = b2 * v + (1 - b2) * g**2
        m_hat = m / (1 - b1**t)
        v_hat = v / (1 - b2**t)
        w = w - lr * m_hat / (jnp.sqrt(v_hat) + eps)
        path.append(w.copy())
    return jnp.stack(path)

w0 = jnp.array([8.0, 3.0])
sgd_path = run_sgd(w0)
mom_path = run_momentum(w0)
adam_path = run_adam(w0)

# Plot
fig, ax = plt.subplots(figsize=(8, 6))
w1 = jnp.linspace(-10, 10, 100)
w2 = jnp.linspace(-4, 4, 100)
W1, W2 = jnp.meshgrid(w1, w2)
L = 0.5 * W1**2 + 10 * W2**2
ax.contour(W1, W2, L, levels=20, cmap='Greys', alpha=0.4)
ax.plot(sgd_path[:,0], sgd_path[:,1], 'o-', color='#3498db', markersize=2, linewidth=1, label='SGD')
ax.plot(mom_path[:,0], mom_path[:,1], 'o-', color='#27ae60', markersize=2, linewidth=1, label='Momentum')
ax.plot(adam_path[:,0], adam_path[:,1], 'o-', color='#e74c3c', markersize=2, linewidth=1, label='Adam')
ax.plot(0, 0, 'k*', markersize=15, label='Minimum')
ax.set_xlabel('w₁'); ax.set_ylabel('w₂')
ax.set_title("Optimizer Trajectories on Elongated Quadratic")
ax.legend()
plt.grid(alpha=0.3)
plt.show()
```

4. 显示 L1 和 L2 正则化对权重稀疏性的影响。使用两种惩罚项训练线性回归，并比较结果的权重向量。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

# Synthetic data: only first 3 of 20 features are relevant
key = jax.random.PRNGKey(0)
n, d = 200, 20
w_true = jnp.zeros(d).at[:3].set(jnp.array([3.0, -2.0, 1.5]))
X = jax.random.normal(key, (n, d))
y = X @ w_true + 0.5 * jax.random.normal(key, (n,))

def train_ridge(X, y, lam=1.0, lr=0.01, steps=2000):
    """L2 regularised linear regression via GD."""
    w = jnp.zeros(X.shape[1])
    for _ in range(steps):
        pred = X @ w
        grad = (2/len(y)) * X.T @ (pred - y) + 2 * lam * w
        w = w - lr * grad
    return w

def train_lasso(X, y, lam=1.0, lr=0.01, steps=2000):
    """L1 regularised linear regression via proximal GD."""
    w = jnp.zeros(X.shape[1])
    for _ in range(steps):
        pred = X @ w
        grad = (2/len(y)) * X.T @ (pred - y)
        w = w - lr * grad
        # Soft thresholding (proximal operator for L1)
        w = jnp.sign(w) * jnp.maximum(jnp.abs(w) - lr * lam, 0)
    return w

w_l2 = train_ridge(X, y, lam=0.1)
w_l1 = train_lasso(X, y, lam=0.1)

fig, axes = plt.subplots(1, 3, figsize=(14, 4))
axes[0].bar(range(d), w_true, color='#333', alpha=0.7)
axes[0].set_title("True Weights"); axes[0].set_xlabel("Feature")
axes[1].bar(range(d), w_l2, color='#3498db', alpha=0.7)
axes[1].set_title("L2 (Ridge): shrinks all"); axes[1].set_xlabel("Feature")
axes[2].bar(range(d), w_l1, color='#e74c3c', alpha=0.7)
axes[2].set_title("L1 (Lasso): zeros out irrelevant"); axes[2].set_xlabel("Feature")
plt.tight_layout()
plt.show()

print(f"L2 non-zero weights: {int(jnp.sum(jnp.abs(w_l2) > 0.01))}/{d}")
print(f"L1 non-zero weights: {int(jnp.sum(jnp.abs(w_l1) > 0.01))}/{d}")
```
