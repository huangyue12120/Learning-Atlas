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

*基于梯度的学习通过不断沿损失曲面的斜率移动来优化模型参数。本篇介绍线性回归、逻辑回归、softmax 分类、梯度下降的不同变体、正则化（L1/L2）以及偏差—方差权衡。*

- 第 01 篇中的经典方法使用巧妙的启发式方法或闭式解。本篇介绍沿梯度学习的算法：在损失曲面上不断向下迈出小步，直到找到合适的参数。基于梯度的学习是从线性回归到最大规模神经网络的一切模型的引擎。

- **线性回归**是最简单的基于梯度的模型，同时也有闭式解，因此是很好的起点。模型是一条直线（在更高维度中是超平面）：

$$\hat{y} = w \cdot x + b = \sum_{i=1}^{d} w_i x_i + b$$

- 用矩阵记号表示（见第 02 章）：把所有训练输入作为矩阵 $X$ 的行，并在末尾追加一列 1、把偏置吸收到 $w$ 中，就得到 $\hat{y} = Xw$。

- 目标是最小化**均方误差（MSE）**，也就是预测值与真实值之间平方差的平均：

$$\mathcal{L}(w) = \frac{1}{n} \sum_{i=1}^{n} (y_i - \hat{y}_i)^2 = \frac{1}{n} \|y - Xw\|^2$$

- 为什么使用平方误差？它有概率上的依据：若假设目标由 $y = Xw + \epsilon$ 生成，且 $\epsilon \sim \mathcal{N}(0, \sigma^2)$，那么最大化数据的高斯似然（第 05 章）等价于最小化 MSE。平方误差还会比小错误更重地惩罚大错误，这在很多场景中很有用。

![数据点散点图、最佳拟合线以及表示误差的竖直虚线残差](../images/linear_regression_fit.svg)

- 由于 MSE 是关于 $w$ 的二次函数，它有唯一的全局最小值，可以解析求出。求导、令导数为零并求解，就得到**正规方程**：

$$w^{*} = (X^T X)^{-1} X^T y$$

- 这直接使用了第 02 章的矩阵逆。表达式 $X^T X$ 是一个 $d \times d$ 矩阵（$d$ 是特征数），$X^T y$ 是一个 $d$ 维向量。正规方程一次就给出精确的最优权重。

- 正规方程什么时候会失效？当 $X^T X$ 奇异（不可逆）时，例如特征线性相关，或者特征数多于样本数（$d > n$）。此时需要使用正则化（后文介绍）或梯度下降。

- **逻辑回归**把线性模型改造成二分类模型。我们不再预测连续值，而是想要一个 0 到 1 之间的概率。**sigmoid 函数**把任意实数压缩到这个范围：

$$\sigma(z) = \frac{1}{1 + e^{-z}}$$

- 模型先计算 $z = w \cdot x + b$（与线性回归相同的线性分数），再通过 sigmoid：$\hat{y} = \sigma(w \cdot x + b)$。输出 $\hat{y}$ 被解释为 $P(y = 1 \mid x)$。

![标出 0.5 阈值的 sigmoid 曲线，展示预测为 0 和预测为 1 的分类区域](../images/sigmoid_logistic.svg)

- sigmoid 有一些很好的性质：$\sigma(0) = 0.5$，当 $z \to \infty$ 时 $\sigma(z) \to 1$，当 $z \to -\infty$ 时 $\sigma(z) \to 0$，并且它的导数形式很简洁：$\sigma'(z) = \sigma(z)(1 - \sigma(z))$。

- 逻辑回归的损失函数是**二元交叉熵（BCE）**，它直接来自伯努利似然（第 05 章）：

$$\mathcal{L} = -\frac{1}{n} \sum_{i=1}^{n} \left[ y_i \log(\hat{y}_i) + (1 - y_i) \log(1 - \hat{y}_i) \right]$$

- 当真实标签为 1 时，只有第一项起作用，它惩罚较低的预测；当真实标签为 0 时，只有第二项起作用，它惩罚较高的预测。对数会让高置信度错误预测的惩罚非常陡峭：真实标签为 1 时预测 0.01，比预测 0.4 的代价大得多。

- 与线性回归的 MSE 不同，BCE 最小化权重没有闭式解。我们需要迭代方法：**梯度下降**。

- 梯度下降的直觉很简单：想象你在雾中的丘陵地形（损失曲面）上，无法看到全局最低点，只能感受脚下的坡度。你向下坡走一步，再次感受坡度并重复这个过程，最终到达山谷。

$$w \leftarrow w - \eta \frac{\partial \mathcal{L}}{\partial w}$$

- 学习率 $\eta$ 控制步长。太大就会越过山谷、来回震荡而不收敛；太小则前进得极慢，还可能卡在局部最小值。

![一维损失曲线上的三个小球：学习率过大时越过谷底，合适时收敛，过小时卡住](../images/gradient_descent_landscape.svg)

- 梯度 $\frac{\partial \mathcal{L}}{\partial w}$ 是指向最陡上升方向的向量。我们减去它，是因为要向下坡走。这就是第 03 章中的链式法则在损失函数上的应用。

- **批量梯度下降**每一步都使用整个训练集计算梯度，得到的是精确梯度，但当 $n$ 很大时成本很高。

- **随机梯度下降（SGD）**每一步只使用一个随机样本。梯度有噪声（它从一个样本估计真实梯度），但每一步都非常快。这种噪声实际上还能帮助算法逃离浅层局部最小值。

- **小批量梯度下降**取二者之间的折中：每一步使用 $B$ 个样本（通常是 32、64 或 256）。它兼顾了计算效率（对批次做向量化运算）与梯度质量。几乎所有深度学习都使用小批量 SGD。

- **反向传播**是计算神经网络等多参数模型梯度的方法。它把第 03 章的链式法则系统地应用于计算图。

- 任意模型都可以表示成操作组成的有向无环图：输入流入后与权重相乘、相加、经过非线性函数，最终产生损失值。**前向传播**让数据从输入流过这张图到达输出，计算输出（和损失）。

- **反向传播**让梯度反向流动。从损失开始，利用每个节点处的链式法则，计算损失相对于每个中间值的变化。如果 $L$ 依赖于 $z$，而 $z$ 又依赖于 $w$，则：

$$\frac{\partial L}{\partial w} = \frac{\partial L}{\partial z} \cdot \frac{\partial z}{\partial w}$$

- 每个节点只需知道自己的局部导数，以及从上游流入的梯度。这让反向传播既模块化又高效：成本大约是前向传播的两倍（一次前向、一次反向）。

- 普通 SGD 有一个问题：在曲率陡峭的方向上来回振荡，却在平坦方向上进展缓慢。**优化器**通过根据梯度历史调整步长来改善这一点。

- **带动量的 SGD**保存过去梯度的运行平均（第 04 章的指数移动平均），从而平滑振荡，并沿着一致的方向加快前进：

$$v_t = \beta v_{t-1} + (1 - \beta) \nabla \mathcal{L}$$
$$w \leftarrow w - \eta \, v_t$$

- 可以把它想成向下滚动的小球：动量让小球在一致方向上积累速度，同时抑制左右抖动。典型取值为 $\beta = 0.9$。

- **Nesterov 加速梯度（NAG）**是一个小而巧妙的修改：不在当前位置计算梯度，而是在“前瞻”位置 $w - \eta \beta v_{t-1}$ 计算。这个校正步骤能减少越过谷底的情况：

$$v_t = \beta \, v_{t-1} + \nabla \mathcal{L}(w - \eta \beta \, v_{t-1})$$
$$w \leftarrow w - \eta \, v_t$$

- **Adagrad**为每个参数自适应学习率。收到较大梯度的参数会得到较小学习率，反之亦然。它累积梯度平方：

$$G_t = G_{t-1} + g_t^2, \quad w \leftarrow w - \frac{\eta}{\sqrt{G_t + \epsilon}} g_t$$

- 问题在于 $G_t$ 只增不减，所以有效学习率单调下降，最终小到无法继续学习。

- **RMSprop**用梯度平方的指数移动平均替代累加，从而修复这个问题；近期梯度比很久以前的梯度更重要：

$$s_t = \beta \, s_{t-1} + (1 - \beta) g_t^2, \quad w \leftarrow w - \frac{\eta}{\sqrt{s_t + \epsilon}} g_t$$

- **Adam（自适应矩估计）**结合了动量和 RMSprop。它同时维护一阶矩估计（梯度均值，类似动量）和二阶矩估计（梯度平方均值，类似 RMSprop）：

$$m_t = \beta_1 m_{t-1} + (1 - \beta_1) g_t$$
$$v_t = \beta_2 v_{t-1} + (1 - \beta_2) g_t^2$$

- 由于 $m_t$ 和 $v_t$ 从零初始化，早期步骤会偏向零。偏差修正如下：

$$\hat{m}_t = \frac{m_t}{1 - \beta_1^t}, \quad \hat{v}_t = \frac{v_t}{1 - \beta_2^t}$$

$$w \leftarrow w - \frac{\eta}{\sqrt{\hat{v}_t} + \epsilon} \hat{m}_t$$

![二维等高线图：SGD 呈之字形，Momentum 走更平滑的路径，Adam 以最直接的路线到达最小值](../images/optimizer_trajectories.svg)

- 默认超参数（$\beta_1 = 0.9$、$\beta_2 = 0.999$、$\epsilon = 10^{-8}$）在各种问题上都表现良好，这也是 Adam 成为大多数深度学习工作默认优化器的原因。

- **AdamW**把权重衰减与梯度更新解耦。标准 L2 正则化与权重衰减对 SGD 等价，但对 Adam 不等价。AdamW 直接作用于参数，而不是把 $\lambda w$ 加到梯度中，因此泛化更好，如今已成为 Transformer 训练的标准：

$$w \leftarrow w - \eta \left( \frac{\hat{m}_t}{\sqrt{\hat{v}_t} + \epsilon} + \lambda \, w \right)$$

- **LION（EvoLved Sign Momentum）**是通过程序搜索发现的新优化器。它只使用动量更新的符号（而不是大小），使每次更新的尺度一致。LION 比 Adam 使用更少内存（没有二阶矩缓冲区），在许多任务上可以达到或超过 Adam：

$$w \leftarrow w - \eta \cdot \text{sign}(\beta_1 \, m_{t-1} + (1 - \beta_1) \, g_t)$$
$$m_t = \beta_2 \, m_{t-1} + (1 - \beta_2) \, g_t$$

- **Muon（Momentum + Orthogonalisation）**先应用 Nesterov 动量，再用 Newton–Schulz 迭代将更新矩阵正交化；后者近似极分解。最终更新方向位于 Stiefel 流形上，所有奇异方向的更新大小大致相等，不会让某个方向独占。这样就不需要自适应二阶矩估计（不再像 Adam 那样保存 $v_t$ 缓冲区），从而节省内存。Muon 在 Transformer 训练中表现很强，通常能以更快收敛达到 AdamW 的质量，尤其适合注意力和 MLP 权重矩阵。嵌入层和输出层通常仍由 AdamW 处理。

$$G_t = \text{NesterovMomentum}(\nabla \mathcal{L})$$
$$U_t = \text{NewtonSchulz}(G_t) \approx G_t (G_t^T G_t)^{-1/2}$$
$$W \leftarrow W - \eta \, U_t$$

- Newton–Schulz 迭代反复执行 $X_{k+1} = \frac{1}{2} X_k (3I - X_k^T X_k)$ 若干步（通常 5–10 步）来计算正交因子。它避免了完整 SVD 的成本，同时得到很好的近似。

![Muon 正交化：动量更新的奇异值分布偏斜，Newton–Schulz 迭代将其均衡，使所有方向均匀更新](../images/optimizer_muon.svg)

![优化器内存比较：每种优化器为每个参数存储的内容](../images/optimizer_memory.svg)

- 除 MSE 和 BCE 外，还有一些常用的**损失函数**。

- **平均绝对误差（MAE）**，也称 L1 损失，取绝对差值的平均：$\frac{1}{n}\sum|y_i - \hat{y}_i|$。由于不会将大误差平方，它比 MSE 更能抵抗离群值。

- **Huber 损失**兼取两者优点：小误差时像 MSE（平滑、易于优化），大误差时像 MAE（对离群值稳健）。它有一个控制切换位置的阈值 $\delta$。

- **类别交叉熵（CCE）**把 BCE 推广到多类别。如果 $\hat{y}_k$ 是类别 $k$ 的预测概率，真实类别是 $c$：

$$\mathcal{L} = -\log(\hat{y}_c)$$

- 这就是正确类别概率的负对数。最小化交叉熵等价于最大化似然，这又与第 05 章的信息论相连：交叉熵衡量使用预测分布而非真实分布时需要多出的比特数。

- **Hinge 损失**用于 SVM：$\mathcal{L} = \max(0, 1 - y \cdot f(x))$。它只惩罚位于间隔错误一侧或间隔以内的预测；一旦样本被足够有把握地正确分类，损失就是零。

- **正则化**通过给复杂模型添加惩罚来防止过拟合。正则化后的损失是：

$$\mathcal{L}_{\text{reg}} = \mathcal{L}_{\text{data}} + \lambda \, R(w)$$

- **L2 正则化**（Ridge、权重衰减）惩罚权重平方和：$R(w) = \|w\|^2 = \sum w_i^2$。它抑制任何单个权重变得过大，实际上会把所有权重收缩到零附近，但很少让它们精确为零。

- **L1 正则化**（Lasso）惩罚权重绝对值之和：$R(w) = \|w\|_1 = \sum |w_i|$。它鼓励稀疏性，把许多权重推到精确的零，从而自动选择特征。

- **Elastic Net**把二者结合起来：$R(w) = \alpha \|w\|_1 + (1 - \alpha) \|w\|^2$，同时实现稀疏与收缩。

- 这里还有一个漂亮的贝叶斯解释（见第 05 章）：L2 正则化等价于给权重设置高斯先验并求 MAP 估计；L1 正则化对应拉普拉斯先验。正则化强度 $\lambda$ 控制你相对于数据有多信任先验。

- **评估指标**告诉你模型是否真的在工作。回归通常使用 MSE 和 MAE；分类则要更细致地分析。

- **混淆矩阵**是二分类的四个计数：
  - 真阳性（TP）：预测为正，实际为正
  - 假阳性（FP）：预测为正，实际为负
  - 真阴性（TN）：预测为负，实际为负
  - 假阴性（FN）：预测为负，实际为正

- **准确率** = $\frac{TP + TN}{TP + TN + FP + FN}$ 在类别不平衡时可能误导。如果 99% 的邮件都不是垃圾邮件，那么总是预测“非垃圾”的模型有 99% 准确率，却没有用。

- **精确率** = $\frac{TP}{TP + FP}$ 回答：所有预测为正的样本中，有多少确实为正？精确率高表示误报少。

- **召回率**（敏感度）= $\frac{TP}{TP + FN}$ 回答：所有实际为正的样本中，你捕获了多少？召回率高表示漏检少。

- **F1 分数** = $\frac{2 \cdot \text{precision} \cdot \text{recall}}{\text{precision} + \text{recall}}$ 是精确率与召回率的调和平均，兼顾二者。

- **ROC 曲线**在把分类阈值从 0 调到 1 时，绘制真阳性率（召回率）与假阳性率（$\frac{FP}{FP + TN}$）的关系。完美分类器贴近左上角。**AUC**（ROC 曲线下面积）用一个数概括性能：1.0 是完美，0.5 等于随机猜测。

- **交叉验证**提供更可靠的泛化性能估计。在 $k$ 折交叉验证中，把数据分成 $k$ 折，用其中 $k-1$ 折训练、剩余一折测试，然后轮换。所有 $k$ 折测试性能的平均值就是估计结果。所有数据都既用于训练又用于测试（只是不会在同一次训练中同时使用），在数据稀缺时尤其有价值。

- **偏差—方差权衡**（第 04 章）是机器学习中的基本张力。模型期望误差可以分解为：

$$\text{Error} = \text{Bias}^2 + \text{Variance} + \text{Irreducible Noise}$$

- **偏差**是错误假设带来的系统误差（例如用直线拟合弯曲数据）。**方差**是模型对训练数据波动的敏感性（例如 20 次多项式拟合噪声）。简单模型偏差高、方差低；复杂模型偏差低、方差高。最佳点使总误差最小。

- **学习率调度**在训练期间调整 $\eta$。常见策略包括：
  - 阶梯衰减：每 $N$ 个 epoch 将 $\eta$ 乘以一个因子（例如 0.1）。
  - 余弦退火：沿余弦曲线把 $\eta$ 从初始值平滑降到接近零。
  - 预热：从很小的 $\eta$ 开始，前几千步线性增大，再进行衰减；这能防止初始梯度过大而使训练不稳定。
  - 1cycle：先上升再下降的一个余弦周期，可以更快收敛。

- **超参数调优**是寻找学习率、batch size、正则化强度以及其他不会由梯度下降学习的设置的过程。常见方法包括：
  - 网格搜索：在预先定义的网格上尝试每个组合（彻底但昂贵）。
  - 随机搜索：随机采样组合；由于并非所有超参数都同样重要，它往往更高效。
  - 贝叶斯优化：建立目标函数模型，智能选择下一组要尝试的超参数。
  - **ASHA（异步连续减半算法）**：用小预算并行运行很多试验，再把最有希望的试验提升到更大预算，尽早终止其余试验。它把提前停止的效率与大规模并行结合起来：与其完整运行 100 次训练，不如先廉价启动全部 100 次，每一轮保留前四分之一，最后只让少数试验跑完。这是 Ray Tune 等现代大规模调优框架的基础。

- **无调度学习**完全消除了学习率调度的需要。它不是沿固定曲线衰减 $\eta$，而是维护两个序列：趋向最优值的慢速迭代平均 $z_t$，以及计算梯度的快速探索迭代 $y_t$。最终输出是平均序列；理论上，它能达到事后看来最佳调度的收敛速度。这样调度不再是超参数，只需设置基础学习率，优化器会处理其余部分。SGD 和 Adam 的无调度变体都已被证明可以达到或超过带调度版本。

## 编程任务（使用 Colab 或 notebook）

1. 同时用正规方程和梯度下降实现线性回归。比较两种解，并绘制 GD 损失随迭代次数的收敛曲线。
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

2. 从零用梯度下降实现逻辑回归。在二维数据集上训练，并可视化学到的决策边界。
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

3. 比较二维二次曲面上的优化器轨迹。从同一个起点运行 SGD、SGD+Momentum 和 Adam，并绘制它们的路径。
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

4. 展示 L1 与 L2 正则化对权重稀疏性的影响。用两种惩罚训练线性回归，比较得到的权重向量。
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
