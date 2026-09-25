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
# 基于梯度的机器学习

*基于梯度的学习通过沿损失曲面的下降方向迭代更新模型参数。本文介绍线性回归、逻辑回归、softmax 分类、梯度下降变体、正则化（L1/L2）和偏差–方差权衡。*

- 文件 01 介绍了启发式方法和闭式解。本文转而介绍沿梯度更新参数的算法：沿损失曲面逐步下降，寻找较优参数。基于梯度的学习是线性回归和大型神经网络等模型的基础。

- **线性回归**是最简单的梯度模型之一，也有闭式解，适合作为起点。模型是一条直线（更高维时是超平面）：

$$\hat{y} = w \cdot x + b = \sum_{i=1}^{d} w_i x_i + b$$
- 用矩阵表示（见第 2 章）时，如果把所有训练输入作为矩阵 $X$ 的行，并通过追加一列 1 将偏置吸收到 $w$ 中，就得到 $\hat{y} = Xw$。

- 目标是最小化 **均方误差 (MSE)**，即预测值与实际值之间平方差的平均值：

$$\mathcal{L}(w) = \frac{1}{n} \sum_{i=1}^{n} (y_i - \hat{y}_i)^2 = \frac{1}{n} \|y - Xw\|^2$$
- 为什么使用平方误差？它有概率论依据：若假设目标由 $y = Xw + \epsilon$ 生成，且误差项独立同分布并服从 $\mathcal{N}(0, \sigma^2)$，则最大化数据的高斯似然（第 5 章）等价于最小化 MSE。平方误差还会更重地惩罚大误差，这在许多场景中很有用。

![数据点的散点图，带有最佳拟合线和虚线残差线，显示误差](../images/linear_regression_fit.svg)


- MSE 是 $w$ 的二次函数；当 $X$ 满列秩时，它有唯一的全局最小值，可通过解析方法求得。对损失求导、令导数为零并求解，得到**正规方程**：

$$w^{*} = (X^T X)^{-1} X^T y$$

**编者注：**如果 $X$ 不满列秩，最优解可能不唯一，且 $X^T X$ 不可逆，不能直接使用该式。
- 这直接使用了第 02 章中的矩阵逆。表达式 $X^T X$ 是一个 $d \times d$ 矩阵（其中 $d$ 是特征数），而 $X^T y$ 是一个 $d$ 维向量。正规方程一次性给出了最优权重。

- 正规方程什么时候会失效？当 $X^T X$ 奇异（不可逆）时会失效；如果特征线性相关，或特征数多于样本数（$d > n$），就可能发生这种情况。这时需要正则化（后文介绍）或梯度下降。

- **逻辑回归**将线性模型用于二分类，并输出一个介于 0 和 1 之间的概率。**Sigmoid 函数**将任意实数映射到这个范围：

$$\sigma(z) = \frac{1}{1 + e^{-z}}$$
- 模型计算 $z = w \cdot x + b$（线性评分，就像线性回归一样），然后将其通过 sigmoid 函数传递： $\hat{y} = \sigma(w \cdot x + b)$。输出 $\hat{y}$ 被解释为 $P(y = 1 \mid x)$。

![Sigmoid曲线，阈值为0.5标记，显示分类区域，预测0和预测1](../images/sigmoid_logistic.svg)


- Sigmoid 函数具有很好的性质：$\sigma(0) = 0.5$；当 $z \to \infty$ 时，$\sigma(z) \to 1$；当 $z \to -\infty$ 时，$\sigma(z) \to 0$；其导数形式也很简洁：$\sigma'(z) = \sigma(z)(1 - \sigma(z))$。

- 逻辑回归的损失函数是**二元交叉熵（BCE）**，它直接来自伯努利似然（第 5 章）。

$$\mathcal{L} = -\frac{1}{n} \sum_{i=1}^{n} \left[ y_i \log(\hat{y}_i) + (1 - y_i) \log(1 - \hat{y}_i) \right]$$
- 当真实标签为1时，只有第一个项被激活，并且惩罚低预测。当真实标签为0时，只有第二个项被激活，并且惩罚高预测。对数使得错误预测的惩罚极其陡峭：预测0.01时，真实标签为1的成本远高于预测0.4。

- 与线性回归中的均方误差（MSE）不同，最小化二元交叉熵的权重没有闭式解，需要使用迭代方法：**梯度下降**。

- 梯度下降的直觉很简单：想象你站在起伏的山地（损失曲面）上，周围有雾。你看不到全局最小值，但能感受到脚下的坡度。你向下走一步，再次感受坡度，如此重复，最终抵达山谷。

$$w \leftarrow w - \eta \frac{\partial \mathcal{L}}{\partial w}$$
- 学习率 $\eta$ 控制步长。过大时，更新可能越过谷底、来回震荡而无法收敛；过小时，收敛会很慢，在非凸损失中还可能停在局部极小值附近。

![一维损失曲线和三个小球：学习率过大导致过冲，合适的学习率收敛，学习率过小则停滞](../images/gradient_descent_landscape.svg)


- 梯度 $\frac{\partial \mathcal{L}}{\partial w}$ 是指向最大上升方向的向量。我们减去它，因为我们想要下坡。这是第 03 章中应用链式法则到损失函数的结果。

- 批量梯度下降在每次迭代时使用整个训练集计算梯度，这给出了精确的梯度，但在 $n$ 很大时非常昂贵。

- **随机梯度下降（SGD）**每次使用一个随机样本。梯度带有噪声（它只用一个样本估计真实梯度），但每一步都极快。这种噪声反而有助于逃离较浅的局部最小值。

- **小批量梯度下降**在两者之间折中：每步使用包含 $B$ 个样本（通常为 32、64 或 256）的小批量。这在计算效率（对批量进行向量化操作）和梯度质量之间取得平衡。几乎所有深度学习都使用小批量 SGD。

- **反向传播** 是如何在具有大量参数的模型中实际计算梯度的方法，例如神经网络。它是在第 3 章中应用链式法则系统地通过计算图进行的。

- 任何模型都可以表示为操作组成的有向无环图：输入流入图中，与权重相乘后相加，再经过非线性函数，最终产生损失值。**前向传播**让数据从输入流向输出，从而计算输出（和损失）。

- **反向传播**将梯度沿计算图反向传递。从损失开始，使用链式法则在每个节点计算损失相对于中间值的变化。若 $L$ 依赖于 $z$，而 $z$ 又依赖于 $w$，则：

$$\frac{\partial L}{\partial w} = \frac{\partial L}{\partial z} \cdot \frac{\partial z}{\partial w}$$
- 每个节点只需知道自己的局部导数，以及从上游传入的梯度。这让反向传播具有模块化和高效的特点：成本大约是前向传播的两倍（一次前向、一次反向）。

- 朴素 SGD 存在一个问题：它会在曲率陡峭的方向上来回振荡，却在平坦方向上进展缓慢。**优化器**会根据梯度历史调整步长来改善这一点。

- **带动量的 SGD**维护过去梯度的滑动平均（指数移动平均，第 04 章），从而平滑振荡，并沿稳定方向加快前进：

$$v_t = \beta v_{t-1} + (1 - \beta) \nabla \mathcal{L}$$
$$w \leftarrow w - \eta \, v_t$$
- 可以把它想象成滚下山坡的球：动量让球沿稳定方向加速，并减弱左右摆动。常用的取值是 $\beta = 0.9$。

- **Nesterov 加速梯度（NAG）**做了一个小调整：不在当前位置计算梯度，而是在“前瞻”位置 $w - \eta \beta v_{t-1}$ 计算。这个修正步骤可以减少过冲：

$$v_t = \beta \, v_{t-1} + \nabla \mathcal{L}(w - \eta \beta \, v_{t-1})$$
$$w \leftarrow w - \eta \, v_t$$
- **Adagrad** 按参数调整学习率。收到大梯度的参数会得到较小的学习率，反之亦然。它累加平方梯度：

$$G_t = G_{t-1} + g_t^2, \quad w \leftarrow w - \frac{\eta}{\sqrt{G_t + \epsilon}} g_t$$
- 问题：$G_t$只增长，因此有效学习率单调递减，最终变得太小而无法学习任何东西。

- **RMSprop** 用平方梯度的指数移动平均而非总和解决了这个问题，因此最近的梯度比更早的梯度影响更大：

$$s_t = \beta \, s_{t-1} + (1 - \beta) g_t^2, \quad w \leftarrow w - \frac{\eta}{\sqrt{s_t + \epsilon}} g_t$$
- **Adam**（自适应矩估计）结合了动量和 RMSprop。它同时维护一阶矩估计（梯度的均值，类似动量）和二阶矩估计（梯度平方的均值，类似 RMSprop）：

$$m_t = \beta_1 m_{t-1} + (1 - \beta_1) g_t$$
$$v_t = \beta_2 v_{t-1} + (1 - \beta_2) g_t^2$$
- 由于 $m_t$ 和 $v_t$ 初始化为零，它们在早期步骤中会偏向零。偏差校正可以解决这个问题：

$$\hat{m}_t = \frac{m_t}{1 - \beta_1^t}, \quad \hat{v}_t = \frac{v_t}{1 - \beta_2^t}$$
$$w \leftarrow w - \frac{\eta}{\sqrt{\hat{v}_t} + \epsilon} \hat{m}_t$$
![二维轮廓图，显示SGD的锯齿状路径、动量遵循平滑路径，Adam沿着最直接路线到达最小值](../images/optimizer_trajectories.svg)


- 默认超参数（$\beta_1 = 0.9$、$\beta_2 = 0.999$、$\epsilon = 10^{-8}$）适用于广泛的问题，因此 Adam 成为大多数深度学习工作的默认优化器。

- **AdamW** 将权重衰减与梯度更新解耦。标准 L2 正则化与权重衰减对 SGD 等价，但对 Adam 不等价。AdamW 直接对参数施加权重衰减，而不是把 $\lambda w$ 加到梯度上。这能带来更好的泛化能力，如今已成为 Transformer 训练的标准做法：

$$w \leftarrow w - \eta \left( \frac{\hat{m}_t}{\sqrt{\hat{v}_t} + \epsilon} + \lambda \, w \right)$$
- **LION**（EvoLved Sign Momentum）是通过程序搜索发现的新优化器。它只使用动量更新的符号（而非幅度），使每次更新的尺度一致。LION 比 Adam 使用更少内存（没有二阶矩缓冲区），在许多任务上可以匹敌或超过 Adam：

$$w \leftarrow w - \eta \cdot \text{sign}(\beta_1 \, m_{t-1} + (1 - \beta_1) \, g_t)$$
$$m_t = \beta_2 \, m_{t-1} + (1 - \beta_2) \, g_t$$
- **Muon**（Momentum + Orthogonalisation）先应用 Nesterov 动量，再使用 Newton–Schulz 迭代对更新矩阵做正交化，这近似于极分解。所得更新方向位于 Stiefel 流形上，所有奇异方向上的更新幅度大致相同，避免任何单一方向占主导。这减少了自适应二阶估计所需的内存开销；与 Adam 不同，Muon 不需要维护 $v_t$ 缓冲区。Muon 在 Transformer 训练中表现出色，通常能以更快收敛达到与 AdamW 相当的质量，尤其适用于注意力和 MLP 权重矩阵。嵌入层和输出层通常仍由 AdamW 处理。

$$G_t = \text{NesterovMomentum}(\nabla \mathcal{L})$$
$$U_t = \text{NewtonSchulz}(G_t) \approx G_t (G_t^T G_t)^{-1/2}$$
$$W \leftarrow W - \eta \, U_t$$
- Newton–Schulz 迭代通过重复 $X_{k+1} = \frac{1}{2} X_k (3I - X_k^T X_k)$ 来计算正交因子，通常迭代几步（约 5–10 次）。这避免了完整 SVD 的成本，同时给出良好近似。

![Muon 正交化：动量更新的奇异值分布不均，Newton–Schulz 迭代将其均衡，使所有方向的更新幅度一致](../images/optimizer_muon.svg)


![优化器内存比较：每个参数存储的内容](../images/optimizer_memory.svg)


- 除了 MSE 和 BCE，还有许多其他**损失函数**广泛使用。

- **平均绝对误差（MAE）**或 L1 损失取绝对差的平均值：$\frac{1}{n}\sum|y_i - \hat{y}_i|$。它不对大误差平方，因此比 MSE 更能抵抗异常值。

- **Huber 损失**结合两者的优点：小误差时像 MSE 一样平滑、易于优化，大误差时像 MAE 一样具有抗异常值能力。它有一个控制过渡的阈值 $\delta$。

- **分类交叉熵（CCE）**将 BCE 推广到多分类。若 $\hat{y}_k$ 是预测概率，而 $c$ 是真实类别，

$$\mathcal{L} = -\log(\hat{y}_c)$$
- 这只是正确类别的负对数概率。最小化交叉熵等价于最大化似然，这与第 5 章的信息论相连：交叉熵衡量使用预测分布而非真实分布时所需的额外信息量。**编者注：**以 2 为底的对数将信息量表示为比特；机器学习实现通常使用自然对数，单位为纳特。

- **合页损失（hinge loss）**用于 SVM：$\mathcal{L} = \max(0, 1 - y \cdot f(x))$，其中标签 $y \in \{-1,+1\}$。它只惩罚位于间隔错误一侧或间隔以内的预测；点被正确分类且置信度足够时，损失为零。

- 正则化通过在复杂模型中添加惩罚项来防止过拟合。正则化的损失函数为：

$$\mathcal{L}_{\text{reg}} = \mathcal{L}_{\text{data}} + \lambda \, R(w)$$
- **L2正则化**（岭回归、权重衰减）惩罚权重平方和：$R(w) = \|w\|^2 = \sum w_i^2$。它鼓励任何单个权重不要过大，有效地将所有权重向零收缩，但很少使它们完全为零。

- **L1正则化**（Lasso）惩罚绝对权重的总和：$R(w) = \|w\|_1 = \sum |w_i|$。它鼓励稀疏性，驱动许多权重精确为零，从而自动进行特征选择。

- 弹性网结合了两种特性：$R(w) = \alpha \|w\|_1 + (1 - \alpha) \|w\|^2$，兼顾稀疏性和权重收缩。

- 贝叶斯解释（第 05 章）：L2 正则化等价于为权重设定高斯先验并求 MAP 估计，L1 正则化对应拉普拉斯先验。正则化强度 $\lambda$ 控制先验相对于数据的影响。

- **评估指标**告诉你模型是否真正有效。对于回归，MSE 和 MAE 是标准指标；对于分类，情况更复杂。

- **混淆矩阵**是二分类的计数表，包含四项：
  - 真阳性（TP）：预测为正，实际为正
  - 假阳性（FP）：预测为正，实际为负
  - 真阴性（TN）：预测为负，实际为负
  - 假阴性（FN）：预测为负，实际为正

- **准确率** = $\frac{TP + TN}{TP + TN + FP + FN}$。类别不平衡时，准确率可能产生误导：如果 99% 的邮件都不是垃圾邮件，一个总是预测“非垃圾邮件”的模型准确率仍有 99%，却没有实际用途。

- **精确率** = $\frac{TP}{TP + FP}$：在所有预测为正的样本中，实际为正的有多少？精确率高意味着误报少。

- **召回率**（敏感度）= $\frac{TP}{TP + FN}$：实际正例中，你捕获了多少？高召回率意味着漏掉的案例很少。

- **F1 分数** = $\frac{2 \cdot \text{precision} \cdot \text{recall}}{\text{precision} + \text{recall}}$，是精确率和召回率的调和平均，兼顾两者。

- ROC 曲线展示分类阈值从 0 变到 1 时，真阳性率（TPR，也称召回率）与假阳性率（FPR，$\frac{FP}{FP + TN}$）之间的关系。完美分类器的曲线经过左上角。ROC 曲线下面积（AUC）用一个数概括性能：1.0 表示完美分类，0.5 表示随机猜测。

- 交叉验证能更可靠地估计泛化性能。在 $k$ 折交叉验证中，将数据分成 $k$ 个折，使用其中 $k-1$ 折训练，在剩余 1 折上测试，然后轮换。所有 $k$ 折测试性能的平均值就是估计结果。这样所有数据都用于训练和测试（只是不会同时用于两者），数据稀缺时尤其有价值。

- **偏差–方差权衡**（第 4 章）是机器学习中的基本张力。模型的期望误差可以分解为：

$$\text{Error} = \text{Bias}^2 + \text{Variance} + \text{Irreducible Noise}$$
- **偏差**是错误假设导致的系统误差（例如用直线拟合曲线数据）。**方差**是对训练数据波动的敏感度（例如用 20 次多项式拟合噪声）。简单模型具有高偏差、低方差；复杂模型具有低偏差、高方差。最佳平衡点使总误差最小。

- **学习率调度**在训练过程中调整 $\eta$。常见的策略包括：
  - 步衰减：每 $N$ 个 epoch 将 $\eta$ 乘以一个因子（例如，0.1）
  - 余弦退火：沿余弦曲线将 $\eta$ 从初始值平滑降至接近零
  - 预热：从很小的 $\eta$ 开始，在最初几千步线性增加，然后衰减。这能防止初始梯度过大导致训练不稳定
  - 1cycle：先上升后下降的一个余弦周期，可能带来更快收敛

- **超参数调优**是为学习率、批量大小、正则化强度等不会由梯度下降学习的设置寻找合适取值的过程。常见方法包括：
  - 网格搜索：尝试预先定义网格中的每种组合（穷举但开销较大）
  - 随机搜索：随机采样组合，通常更高效，因为不是所有超参数都同等重要
  - 贝叶斯优化：构建目标函数的模型，并智能地选择下一个要尝试的超参数
  - **ASHA**（异步逐次减半算法）：以较小预算并行运行许多试验，再把更有希望的试验提升到更大预算，并尽早停止其余试验。它结合了早停和大规模并行：与其完整运行 100 次训练，不如先低成本启动全部试验，每一轮只保留表现靠前的四分之一，最终让少数试验运行至完成。这是 Ray Tune 等大规模调优框架的核心方法。

- **无调度学习**不再按固定曲线衰减 $\eta$，而是维护两个序列：缓慢移动的迭代平均值 $z_t$（趋向最优解）和快速探索的迭代点 $y_t$（在此处计算梯度）。最终输出为平均序列；理论上，它能达到事后看来最优的学习率调度所具有的收敛率。这样无需把调度方式作为超参数，只需设置基础学习率。无调度版本的 SGD 和 Adam 已被证明在一些任务上可达到或超过经过调优的调度版本。

## 编程任务（使用 Colab 或笔记本）

1. 使用正规方程和梯度下降实现线性回归。比较两种方法的结果，并绘制梯度下降损失随迭代次数的变化曲线。
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
