---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 06 - machine learning/03. deep learning.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: d2e677b6ca1dafa667a4f4ff12dfddee367392dd6940f25f5b6934ed21cd071d
status: reviewed
---
# 深度学习

*深度学习通过堆叠非线性层构建层次化表示，自动把原始输入转换为有用特征。本文介绍 MLP、激活函数、反向传播、CNN、RNN、LSTM、注意力机制、Transformer、VAE 和归一化技术。*

**编者注：**原文导语还列出 GAN 和扩散模型，但正文没有介绍这两类模型。

- 什么是“深度”？浅层网络只有一个隐藏层；深层网络有多个。深度让网络能够构建层次结构，早期层学习简单的特征（边缘、音调），而后期层将它们组合成复杂的概念（人脸、句子）。这种可组合性是深度学习强大之处的原因。

- 最简单的深度网络是 **多层感知器（MLP）**，也称为全连接或密集网络。每个层计算：

$$h = \sigma(Wx + b)$$
- $W$ 是权重矩阵（第 02 章），$b$ 是偏置向量，$\sigma$ 是非线性激活函数。一层的输出成为下一层的输入。没有非线性，堆叠层毫无意义：$W_2(W_1 x) = (W_2 W_1)x$，这只是一个线性变换。这正是第 2 章所说的矩阵乘法坍缩。

- **激活函数**引入了让深度变得有意义的非线性。

- **ReLU**（线性整流单元）：$\text{ReLU}(x) = \max(0, x)$。它是最常用的激活函数。它计算速度快，对于正输入不会饱和，并且会产生稀疏的激活（许多神经元输出恰好为零）。缺点：负输入的神经元总是输出零，如果它们永久卡在那里，就会“死亡”并停止学习。

- **Sigmoid**：$\sigma(x) = \frac{1}{1+e^{-x}}$ 将输入压缩到 $(0, 1)$。它适用于二分类输出层，但在隐藏层中可能造成问题，因为输入远离零时梯度会消失（曲线接近平坦）。

- **双曲正切函数（Tanh）**：$\tanh(x) = \frac{e^x - e^{-x}}{e^x + e^{-x}}$ 将输入压缩到 $(-1, 1)$。它以零为中心（不同于 Sigmoid），有助于梯度流动，但在极端输入下仍会出现梯度消失。

- **GELU**（高斯误差线性单元）：$\text{GELU}(x) = x \cdot \Phi(x)$，其中 $\Phi$ 是标准正态分布的累积分布函数。它是 ReLU 的平滑近似，会保留一部分小的负值；GPT 和 BERT 等模型常用 GELU。

- **Swish**：$\text{Swish}(x) = x \cdot \sigma(x)$，也是一种平滑门控函数，实际效果与 GELU 相近。

![ReLU、Sigmoid、Tanh 和 GELU 的并列曲线及其关键性质](../images/activation_functions.svg)


- 一个稠密层接收 $d_{\text{in}}$ 个输入并产生 $d_{\text{out}}$ 个输出，因此有 $d_{\text{in}} \times d_{\text{out}} + d_{\text{out}}$ 个参数（权重和偏置）。矩阵乘法 $Wx$ 就是第 02 章介绍的矩阵–向量乘法。在批量处理中，输入矩阵 $X$ 的形状为 $(B, d_{\text{in}})$，输出 $XW^T + b$ 的形状为 $(B, d_{\text{out}})$。

- **通用逼近定理**表明，包含足够神经元的单隐藏层可以在紧致域上以任意精度近似任意连续函数。这听起来似乎深度并不重要，但关键在于“足够的神经元”。实际上，在实践中，深度网络通过使用指数级较少的参数来表示相同的功能。深度提供了效率，而不是表达能力。

- 当网络变深时，出现了两种梯度病态。**消失的梯度**：当梯度通过许多层（通过链式法则，第03章）传递时，它们会被许多因子乘以。如果这些因子始终小于1（如sigmoid和tanh饱和），则梯度会指数级地朝零缩小。早期层几乎无法学习。**爆炸的梯度**：如果这些因子始终大于1，梯度会指数级增长，导致数值溢出和不稳定训练。

- 解决梯度消失/爆炸问题的方法：
  - 使用 ReLU 或 GELU 激活。ReLU 对正输入的梯度为 1；GELU 在正区间也不易饱和。**编者注：**原文把 ReLU 梯度为 1 的性质一并归给 GELU，这一点并不严格。
  - 注意权重初始化
  - 归一化层
  - 跳连接（残差连接）
  - 梯度裁剪（针对梯度爆炸）：将梯度范数限制在某个最大值以内

- **权重初始化**很重要，因为它决定训练开始时激活和梯度的尺度。如果权重过大，激活会爆炸；过小，激活和梯度会消失。

- **Xavier（Glorot）初始化**从方差为 $\frac{2}{d_{\text{in}} + d_{\text{out}}}$ 的分布中采样权重。在使用线性或 Tanh 激活时，这能让各层激活的方差大致保持稳定。

- **He（Kaiming）初始化**使用方差 $\frac{2}{d_{\text{in}}}$，针对 ReLU 激活进行校准（ReLU 会把一半激活置零，因此需要把方差加倍补偿）。

- **归一化层**通过确保每层输入具有一致的统计特性（大致为零均值、单位方差）来稳定训练。

- **批量归一化（BatchNorm）**在批量维度上进行归一化：对于每个通道/特征，计算所有样本在 mini-batch 中的均值和方差，然后进行归一化。它添加可学习的缩放参数（$\gamma$）和偏移参数（$\beta$），以便网络可以逆向进行归一化。

$$\hat{x} = \frac{x - \mu_B}{\sqrt{\sigma_B^2 + \epsilon}}, \quad y = \gamma \hat{x} + \beta$$
- 批量归一化（BatchNorm）存在一个问题：它依赖批量大小，批量很小时统计量会比较嘈杂。推理时使用训练期间累计的均值和方差，而不是当前批量的统计量，因此训练和推理时的归一化方式不同。

- **层归一化（LayerNorm）**对每个样本的特征维度进行归一化，不依赖同一批次中的其他样本，因此常用于 Transformer 和循环网络。

- 实例归一化（Instance Normalization）在每个样本和每个通道上独立地对空间维度进行归一化。它在风格转移中很流行。

- **分组归一化**将通道分成若干组，并在每组内进行归一化。它是一种介于层归一化和实例归一化之间的折衷方法。

![带彩色切片的三维张量，展示 BatchNorm、LayerNorm 和 InstanceNorm 各自归一化的维度](../images/normalization_types.svg)


- **Dropout** 是一种正则化技术，训练时随机将比例为 $p$ 的神经元激活置零。这会迫使网络不要依赖某个单一神经元，鼓励冗余表示。测试时所有神经元都参与计算。**倒置 Dropout**在训练时把激活乘以 $\frac{1}{1-p}$，因此测试时无需再缩放，这是标准实现。

- **卷积神经网络（CNN）**利用空间结构。与全连接层不同，卷积层让小滤波器（卷积核）在输入上滑动，并在每个位置计算点积。滤波器权重在所有位置共享，从而大幅减少参数，并带来平移等变性。**编者注：**卷积本身是平移等变的；平移不变性通常还需要池化或全局聚合等操作。

- 对于使用大小为 $k \times k$ 滤波器 $K$ 的二维输入，卷积操作为：

$$(\text{input} * K)[i,j] = \sum_{m=0}^{k-1} \sum_{n=0}^{k-1} \text{input}[i+m, j+n] \cdot K[m, n]$$

**编者注：**该公式没有翻转卷积核，严格说是互相关；深度学习中通常也把这种运算称为卷积。
![输入网格，3x3滤镜滑动在其上，产生每个位置元素级相乘和求和的特征图](../images/cnn_convolution.svg)


- 输出大小取决于三个超参数。**步长**控制滤波器每次移动的像素数（步长为 2 时，空间尺寸约减半）。**填充**在输入边界周围补零；步长为 1 时，“same” 填充保留空间尺寸，“valid” 不补零。输出大小为 $\text{out} = \lfloor (\text{in} - k + 2p) / s \rfloor + 1$。

- **池化** 层降采样特征图。最大池取窗口中的最大值；平均池取窗口的均值。池化会减小空间维度，同时保留最重要的信息。

- **膨胀卷积**在滤波器元素之间插入间隙，增加感受野而不增加参数。膨胀率2意味着3x3滤波器覆盖一个5x5区域。

- **1x1卷积**使用一个1x1滤波器进行卷积。它们不考虑空间邻近；相反，它们在通道之间混合信息。将它们视为在每个空间位置应用密集层。它们用于以低成本改变通道数量。

- **跳跃连接**（残差连接）让输入绕过一个或多个层：$\text{output} = F(x) + x$。该层只需学习残差 $F(x) = \text{output} - x$；当最优变换接近恒等映射时，这更容易。ResNet（残差网络）利用这一技巧堆叠超过 100 层，缓解深层网络性能反而低于浅层网络的退化问题。

- 卷积神经网络（CNN）构建**特征层次结构**：早期层检测边缘和纹理，中间层把它们组合成部件（眼睛、车轮），后期层识别完整对象。每层的感受野（它能“看到”的输入区域）都会随深度扩大。

- **嵌入**把离散词元（单词、字符、项目 ID）映射为稠密向量。嵌入层就是一个查找表：矩阵 $E$ 的形状为（词表大小，嵌入维度）。查找词元 $i$ 就是选择 $E$ 的第 $i$ 行，这等价于乘以独热向量，是矩阵–向量乘法的特例（第 2 章）。嵌入在训练中学习，因此相似词元会得到相似向量。

- **词元化（分词）**是把原始文本转换为词元序列的过程。按词分词通常以空格切分，难以处理未见过的词。**子词分词**（BPE、WordPiece、SentencePiece）把文本拆成常见子词，在词表大小和覆盖率之间取得平衡。例如，英文单词 “unhappiness” 可以拆成 [“un”, “happiness”] 或 [“un”, “happ”, “iness”]。

- **循环神经网络（RNN）**逐个处理序列中的词元，并维护一个向后续步骤传递信息的隐藏状态：

$$h_t = \tanh(W_h h_{t-1} + W_x x_t + b)$$
- 隐藏状态 $h_t$ 是网络截至时间 $t$ 所见信息的压缩摘要。权重 $W_h$ 和 $W_x$ 在所有时间步共享（类似 CNN 在空间位置之间共享权重）。

- 朴素 RNN 难以处理长序列，因为会出现梯度消失：从时间步 $t$ 传到 $t-k$ 的梯度信号要经过 $k$ 次 $W_h$ 的乘法，数值会指数级缩小（也可能指数级爆炸）。

- **LSTM**（长短期记忆网络）通过引入独立的细胞状态 $c_t$ 来缓解这个问题。细胞状态随时间传递时受其他计算影响较小；三个门控制信息的写入、输出和保留：

- **遗忘门**决定从细胞状态中要擦除的内容：$f_t = \sigma(W_f [h_{t-1}, x_t] + b_f)$
- **输入门**决定要写入的新信息：$i_t = \sigma(W_i [h_{t-1}, x_t] + b_i)$，候选值为$\tilde{c}_t = \tanh(W_c [h_{t-1}, x_t] + b_c)$
- 细胞状态更新：$c_t = f_t \odot c_{t-1} + i_t \odot \tilde{c}_t$
- **输出门**决定要暴露的内容：$o_t = \sigma(W_o [h_{t-1}, x_t] + b_o)$和$h_t = o_t \odot \tanh(c_t)$

![LSTM 单元：遗忘门、输入门、输出门、细胞状态高速通路和数据流连接](../images/rnn_lstm_cell.svg)


- 细胞状态像一条传送带：信息可以跨多个时间步较少受干扰地流动，从而缓解长距离依赖中的梯度消失。**编者注：**LSTM 能缓解梯度消失，但不能保证彻底消除。

- **GRU**（门控循环单元）简化了 LSTM：将细胞状态和隐藏状态合并，并用两个门取代三个门——更新门（兼具遗忘门和输入门的作用）与重置门。GRU 参数更少，性能通常与 LSTM 相当。

- RNN（包括 LSTM）的主要限制是必须按顺序处理词元：先处理词元 1，再处理词元 2，最后处理词元 3。这使并行计算受限，也形成信息瓶颈，因为所有上下文都要通过固定大小的隐藏状态传递。

- **注意力机制**缓解了这两个问题。它不把整个输入压缩成固定向量，而是让模型查看各个输入位置，并判断哪些位置与当前输出相关。**编者注：**注意力让训练阶段能够并行处理输入，但自回归模型生成输出时通常仍需逐个生成词元。

- 现代形式使用 **查询、键和值（Q、K、V）**。可以把它想成图书馆检索：查询是你要找的东西，键是每本书的标签，值是书的实际内容。将查询与所有键比较，就能决定检索哪些值。

- **缩放点积注意力**：

$$\text{Attention}(Q, K, V) = \text{softmax}\!\left(\frac{QK^T}{\sqrt{d_k}}\right) V$$
- $QK^T$ 通过矩阵乘法（第 2 章）计算每个查询与每个键的点积。点积可用于衡量相似度，但只有向量归一化后才等于余弦相似度（第 1 章）。除以 $\sqrt{d_k}$ 可避免点积过大导致 softmax 饱和、产生近似独热分布并使梯度变小。softmax 将分数转换为概率分布，再乘以 $V$ 得到值的加权组合。

- **多头注意力**并行运行 $h$ 个注意力操作，每个操作都有不同的 Q、K 和 V 的学习投影。这使得模型能够同时关注不同表示子空间的信息。一个头可能关注语法关系，另一个头可能关注语义关系。输出被连接并投影：

$$\text{MultiHead}(Q, K, V) = \text{Concat}(\text{head}_1, \ldots, \text{head}_h) W^O$$
- **Transformer**架构（Vaswani 等，2017）由注意力层和前馈层组成，不使用循环结构。编码器块依次包含多头自注意力、残差相加与层归一化、前馈网络、残差相加与层归一化。解码器块还包含遮蔽自注意力（防止模型看到未来词元）和关注编码器输出的交叉注意力层。

![Transformer编码块：多头注意力、加法和层归一化、前馈网络、加法和层归一化，带有残差连接](../images/transformer_block.svg)


- **位置编码**是必要的，因为注意力具有置换等变性，会把输入视为集合而非序列。没有位置信息，“猫追着狗”和“狗追着猫”会得到相同的表示。原始 Transformer 使用正弦位置编码：

$$PE_{(pos, 2i)} = \sin\!\left(\frac{pos}{10000^{2i/d}}\right), \quad PE_{(pos, 2i+1)} = \cos\!\left(\frac{pos}{10000^{2i/d}}\right)$$
- 每个位置都会得到一个唯一向量，模型可据此区分位置。现代模型通常改用可学习的位置嵌入或相对位置编码（RoPE、ALiBi）。

- Transformer 在现代硬件上并行处理所有词元（自注意力矩阵 $QK^T$ 通过一次矩阵乘法计算），因此通常比 RNN 更易并行训练。代价是自注意力关于序列长度的复杂度为 $O(n^2)$，因为每个词元都关注其他词元，而 RNN 为 $O(n)$。这也是长上下文模型需要稀疏注意力、线性注意力或 FlashAttention 等变体的原因。

- **视觉 Transformer（ViT）**把图像切成固定大小的图像块（例如 $16\times16$），将每块展平为向量，再把图像块作为词元序列输入 Transformer。模型在序列开头加入可学习的 [CLS] 词元，并用其最终表示进行分类。虽然 ViT 没有卷积的归纳偏置，但数据充足时可以达到或超过 CNN 的效果。

- **MLP-Mixer**是更简单的架构，用 MLP 取代注意力和卷积。它交替使用“词元混合” MLP（跨空间位置）和“通道混合” MLP（跨特征），表现具有竞争力。这表明现代架构的关键不只在注意力，也在于高效混合词元与特征之间的信息。

- **自动编码器**通过训练网络重建自身输入，学习压缩表示。编码器把输入映射到低维瓶颈（潜在编码），解码器再把它映射回来：

$$z = f_{\text{enc}}(x), \quad \hat{x} = f_{\text{dec}}(z), \quad \mathcal{L} = \|x - \hat{x}\|^2$$
- 瓶颈迫使网络保留较重要的特征。自编码器可用于降维、去噪（以含噪输入训练，重建干净输出）和异常检测（重建误差较大可能表示输入异常）。

- **变分自编码器（VAE）**引入概率建模：编码器不把数据编码为单个点 $z$，而是输出一个高斯分布的参数（均值 $\mu$ 和方差 $\sigma^2$）。隐变量从该分布采样：$z = \mu + \sigma \odot \epsilon$，其中 $\epsilon \sim \mathcal{N}(0, I)$。这种**重参数化技巧**使采样过程可微，梯度可以穿过采样操作。

- VAE 损失包含两个项：

$$\mathcal{L} = \underbrace{\|x - \hat{x}\|^2}_{\text{重建损失}} + \underbrace{D_{\text{KL}}(q(z|x) \| p(z))}_{\text{正则化}}$$
- KL 散度项（第 5 章）将学习到的后验 $q(z|x)$ 推向先验 $p(z) = \mathcal{N}(0, I)$，确保潜在空间平滑且结构良好。然后可以从先验采样并解码，生成新数据；这正是 VAE 成为生成模型的原因。

## 编程任务（使用 Colab 或笔记本）

1. 用 JAX 从零实现一个简单的 MLP。在二维分类问题（例如同心圆）上训练，并可视化决策边界。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt
from sklearn.datasets import make_circles

# Data
X, y = make_circles(n_samples=500, noise=0.1, factor=0.5, random_state=42)
X, y = jnp.array(X), jnp.array(y, dtype=jnp.float32)

# Initialise a 2-layer MLP: 2 -> 16 -> 16 -> 1
def init_params(key):
    k1, k2, k3 = jax.random.split(key, 3)
    return {
        'W1': jax.random.normal(k1, (2, 16)) * 0.5,
        'b1': jnp.zeros(16),
        'W2': jax.random.normal(k2, (16, 16)) * 0.5,
        'b2': jnp.zeros(16),
        'W3': jax.random.normal(k3, (16, 1)) * 0.5,
        'b3': jnp.zeros(1),
    }

def forward(params, x):
    h = jnp.maximum(0, x @ params['W1'] + params['b1'])  # ReLU
    h = jnp.maximum(0, h @ params['W2'] + params['b2'])   # ReLU
    logit = (h @ params['W3'] + params['b3']).squeeze()
    return jax.nn.sigmoid(logit)

def loss_fn(params, X, y):
    pred = forward(params, X)
    return -jnp.mean(y * jnp.log(pred + 1e-7) + (1 - y) * jnp.log(1 - pred + 1e-7))

grad_fn = jax.jit(jax.grad(loss_fn))
params = init_params(jax.random.PRNGKey(0))
lr = 0.1

for step in range(2000):
    grads = grad_fn(params, X, y)
    params = {k: params[k] - lr * grads[k] for k in params}

# Plot decision boundary
xx, yy = jnp.meshgrid(jnp.linspace(-2, 2, 200), jnp.linspace(-2, 2, 200))
grid = jnp.column_stack([xx.ravel(), yy.ravel()])
zz = forward(params, grid).reshape(xx.shape)

plt.figure(figsize=(7, 6))
plt.contourf(xx, yy, zz, levels=[0, 0.5, 1], alpha=0.3, colors=['#e74c3c', '#3498db'])
plt.scatter(X[y==0,0], X[y==0,1], c='#e74c3c', s=10, label='Class 0')
plt.scatter(X[y==1,0], X[y==1,1], c='#3498db', s=10, label='Class 1')
plt.title("MLP Decision Boundary on Concentric Circles")
plt.legend(); plt.grid(alpha=0.3); plt.show()

acc = jnp.mean((forward(params, X) > 0.5) == y)
print(f"Accuracy: {acc:.2%}")
```

2. 从零实现一维卷积。对信号应用简单的边缘检测滤波器，并与内置函数 `jnp.convolve` 比较。
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt

def conv1d(signal, kernel):
    """1D convolution (valid mode) from scratch."""
    n, k = len(signal), len(kernel)
    output = jnp.zeros(n - k + 1)
    for i in range(n - k + 1):
        output = output.at[i].set(jnp.sum(signal[i:i+k] * kernel))
    return output

# Create a signal with a step function
t = jnp.linspace(0, 4, 200)
signal = jnp.where(t < 1, 0.0, jnp.where(t < 2, 1.0, jnp.where(t < 3, 0.5, 1.5)))

# Edge detection kernel
edge_kernel = jnp.array([-1.0, 0.0, 1.0])

# Our implementation vs built-in
our_output = conv1d(signal, edge_kernel)
jnp_output = jnp.convolve(signal, edge_kernel, mode='valid')

fig, axes = plt.subplots(3, 1, figsize=(10, 6), sharex=True)
axes[0].plot(t, signal, color='#3498db', linewidth=1.5)
axes[0].set_title("Original Signal"); axes[0].set_ylabel("Value")

axes[1].plot(t[:len(our_output)], our_output, color='#e74c3c', linewidth=1.5)
axes[1].set_title("After Edge Detection (our conv1d)"); axes[1].set_ylabel("Value")

axes[2].plot(t[:len(jnp_output)], jnp_output, color='#27ae60', linewidth=1.5, linestyle='--')
axes[2].set_title("After Edge Detection (jnp.convolve)"); axes[2].set_ylabel("Value")
axes[2].set_xlabel("t")

plt.tight_layout(); plt.show()
print(f"Outputs match: {jnp.allclose(our_output, jnp_output)}")
```

3. 从零实现缩放点积注意力。计算一个小型示例的注意力权重，并将注意力矩阵可视化为热图。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

def scaled_dot_product_attention(Q, K, V):
    """Scaled dot-product attention."""
    d_k = Q.shape[-1]
    scores = Q @ K.T / jnp.sqrt(d_k)
    weights = jax.nn.softmax(scores, axis=-1)
    output = weights @ V
    return output, weights

# Example: 4 tokens, embedding dim 8
key = jax.random.PRNGKey(42)
k1, k2, k3 = jax.random.split(key, 3)
seq_len, d_model = 4, 8

Q = jax.random.normal(k1, (seq_len, d_model))
K = jax.random.normal(k2, (seq_len, d_model))
V = jax.random.normal(k3, (seq_len, d_model))

output, weights = scaled_dot_product_attention(Q, K, V)

print(f"Q shape: {Q.shape}")
print(f"Attention weights shape: {weights.shape}")
print(f"Output shape: {output.shape}")
print(f"\nAttention weights (rows sum to 1):")
print(weights)
print(f"Row sums: {weights.sum(axis=-1)}")

# Visualise attention
fig, ax = plt.subplots(figsize=(5, 4))
im = ax.imshow(weights, cmap='Blues', vmin=0, vmax=1)
ax.set_xlabel("Key position"); ax.set_ylabel("Query position")
ax.set_title("Attention Weights")
tokens = ['tok 0', 'tok 1', 'tok 2', 'tok 3']
ax.set_xticks(range(4)); ax.set_xticklabels(tokens)
ax.set_yticks(range(4)); ax.set_yticklabels(tokens)
for i in range(4):
    for j in range(4):
        ax.text(j, i, f"{weights[i,j]:.2f}", ha='center', va='center', fontsize=10)
plt.colorbar(im); plt.tight_layout(); plt.show()
```

4. 构建一个简单的自编码器，通过一维瓶颈压缩二维数据并重建输入。可视化潜在空间和重建结果。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt
from sklearn.datasets import make_moons

# Data
X, _ = make_moons(n_samples=500, noise=0.05, random_state=42)
X = jnp.array(X)

# Autoencoder: 2 -> 8 -> 1 -> 8 -> 2
def init_ae(key):
    k1, k2, k3, k4 = jax.random.split(key, 4)
    return {
        'enc_W1': jax.random.normal(k1, (2, 8)) * 0.5, 'enc_b1': jnp.zeros(8),
        'enc_W2': jax.random.normal(k2, (8, 1)) * 0.5, 'enc_b2': jnp.zeros(1),
        'dec_W1': jax.random.normal(k3, (1, 8)) * 0.5, 'dec_b1': jnp.zeros(8),
        'dec_W2': jax.random.normal(k4, (8, 2)) * 0.5, 'dec_b2': jnp.zeros(2),
    }

def encode(p, x):
    h = jnp.tanh(x @ p['enc_W1'] + p['enc_b1'])
    return h @ p['enc_W2'] + p['enc_b2']

def decode(p, z):
    h = jnp.tanh(z @ p['dec_W1'] + p['dec_b1'])
    return h @ p['dec_W2'] + p['dec_b2']

def ae_loss(p, X):
    z = encode(p, X)
    X_hat = decode(p, z)
    return jnp.mean((X - X_hat) ** 2)

grad_fn = jax.jit(jax.grad(ae_loss))
params = init_ae(jax.random.PRNGKey(0))
lr = 0.01

for step in range(3000):
    grads = grad_fn(params, X)
    params = {k: params[k] - lr * grads[k] for k in params}

z = encode(params, X)
X_hat = decode(params, z)

fig, axes = plt.subplots(1, 2, figsize=(12, 5))
axes[0].scatter(X[:,0], X[:,1], c=z.squeeze(), cmap='viridis', s=10)
axes[0].set_title("Original Data (coloured by latent code)")
axes[1].scatter(X_hat[:,0], X_hat[:,1], c=z.squeeze(), cmap='viridis', s=10)
axes[1].set_title("Reconstruction from 1D bottleneck")
for ax in axes:
    ax.set_aspect('equal'); ax.grid(alpha=0.3)
plt.tight_layout(); plt.show()

print(f"Reconstruction MSE: {ae_loss(params, X):.4f}")
```
