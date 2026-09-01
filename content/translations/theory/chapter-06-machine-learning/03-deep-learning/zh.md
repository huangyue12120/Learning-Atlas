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

*深度学习堆叠非线性层，构建分层表示，把原始输入自动转换为有用特征。本篇涵盖 MLP、激活函数、反向传播、CNN、RNN、LSTM、attention、Transformer、GAN、VAE、扩散模型和归一化技术。*

- 什么样的网络才称得上“深”？浅层网络只有一个隐藏层；深层网络有许多隐藏层。深度让网络能够构建分层表示：早期层学习简单特征（边缘、音调），后面的层将它们组合成复杂概念（面孔、句子）。这种组合性正是深度学习强大的原因。

- 最简单的深层网络是**多层感知机（multi-layer perceptron，MLP）**，也称全连接网络或 dense 网络。每一层计算：

$$h = \sigma(Wx + b)$$

- 这里 $W$ 是权重矩阵（第 02 章），$b$ 是偏置向量，$\sigma$ 是非线性激活函数。一层的输出成为下一层的输入。如果没有非线性，堆叠多层就没有意义：$W_2(W_1 x) = (W_2 W_1)x$，它仍然只是另一个线性变换。这正是第 02 章中的矩阵乘法塌缩。

- **激活函数**引入了让深度有意义的非线性。

- **ReLU（Rectified Linear Unit，修正线性单元）**：$\text{ReLU}(x) = \max(0, x)$。它是使用最广泛的激活函数，计算快，正输入区域不饱和，并且会产生稀疏激活（许多神经元的输出恰好为零）。缺点是：负输入的神经元总是输出零；如果它们永久卡在那里，就会“死亡”并停止学习。

- **Sigmoid**：$\sigma(x) = \frac{1}{1+e^{-x}}$，把输入压缩到 $(0, 1)$。它适合二分类的输出层，但在隐藏层中有问题，因为输入远离零时梯度会消失（曲线几乎是平的）。

- **Tanh**：$\tanh(x) = \frac{e^x - e^{-x}}{e^x + e^{-x}}$，把输入压缩到 $(-1, 1)$。它以零为中心（不同于 sigmoid），有助于梯度流动，但在极端值处仍然会受到梯度消失影响。

- **GELU（Gaussian Error Linear Unit，高斯误差线性单元）**：$\text{GELU}(x) = x \cdot \Phi(x)$，其中 $\Phi$ 是标准正态分布的 CDF。它是 ReLU 的平滑近似，允许小的负值通过。GELU 是 GPT 和 BERT 中的默认激活函数。

- **Swish**：$\text{Swish}(x) = x \cdot \sigma(x)$，是另一种平滑门控函数，实际表现与 GELU 相近。

![ReLU、Sigmoid、Tanh 与 GELU 的并列曲线及其关键性质](../images/activation_functions.svg)

- 一个有 $d_{\text{in}}$ 个输入和 $d_{\text{out}}$ 个输出的 dense 层有 $d_{\text{in}} \times d_{\text{out}} + d_{\text{out}}$ 个参数（权重加偏置）。矩阵乘法 $Wx$ 就是第 02 章中的矩阵—向量乘法。在 batch 场景中，形状为 $(B, d_{\text{in}})$ 的输入矩阵 $X$ 产生形状为 $(B, d_{\text{out}})$ 的输出 $XW^T + b$。

- **通用逼近定理**指出，只要神经元足够多，单个隐藏层就能以任意精度逼近紧致域上的任意连续函数。这听起来像是深度不重要，但关键在于“神经元足够多”。在实践中，深层网络可以用比浅层网络少指数级的参数表示相同函数。深度带来的是效率，而不仅仅是表达能力。

- 随着网络变深，会出现两类梯度病态。**梯度消失**：梯度经过许多层（通过第 03 章的链式法则）时，会被许多因子相乘。如果这些因子持续小于 1（sigmoid 和 tanh 饱和时就会这样），梯度会指数级缩小到零，早期层几乎无法学习。**梯度爆炸**：如果这些因子持续大于 1，梯度会指数级增长，导致数值溢出和训练不稳定。

- 解决梯度消失/爆炸的方法：
  - 使用 ReLU 或 GELU 激活（正输入的梯度为 1，不会饱和）
  - 仔细进行权重初始化
  - 使用归一化层
  - 使用残差连接（跳跃连接）
  - 梯度裁剪（针对梯度爆炸）：把梯度范数限制在最大值以内

- **权重初始化**很重要，因为它决定训练开始时激活和梯度的尺度。权重太大，激活会爆炸；权重太小，激活会消失。

- **Xavier（Glorot）初始化**从方差为 $\frac{2}{d_{\text{in}} + d_{\text{out}}}$ 的分布中采样权重。假设使用线性或 tanh 激活，它可以让各层激活的方差大致保持不变。

- **He（Kaiming）初始化**使用方差 $\frac{2}{d_{\text{in}}}$，针对 ReLU 激活进行校准（因为 ReLU 会把一半激活置零，所以需要将方差加倍来补偿）。

- **归一化层**通过确保每一层的输入具有一致的统计量（大致为零均值、单位方差）来稳定训练。

- **批归一化（Batch Normalisation，BatchNorm）**沿 batch 维度归一化：对每个通道/特征，在 mini-batch 的所有样本上计算均值和方差，然后进行归一化。它还加入可学习的缩放（$\gamma$）和偏移（$\beta$）参数，使网络在需要时可以撤销归一化：

$$\hat{x} = \frac{x - \mu_B}{\sqrt{\sigma_B^2 + \epsilon}}, \quad y = \gamma \hat{x} + \beta$$

- BatchNorm 有一个问题：它依赖 batch 大小。batch 很小时，统计量会有噪声。在推理时使用运行平均值而不是 batch 统计量，这还会造成训练与测试之间的差异。

- **层归一化（Layer Normalisation，LayerNorm）**对每个样本独立地沿特征维度归一化。它不依赖 batch 中的其他样本，因此成为 Transformer 和循环网络的标准选择。

- **实例归一化（Instance Normalisation）**对每个样本、每个通道独立地沿空间维度归一化。它常用于风格迁移。

- **组归一化（Group Normalisation）**把通道分成若干组，并在每组内部归一化。它是 LayerNorm 与 InstanceNorm 之间的折中。

![3D 张量的彩色切片，展示 BatchNorm、LayerNorm 与 InstanceNorm 分别沿哪些维度归一化](../images/normalization_types.svg)

- **Dropout**是一种正则化技术，训练时随机把比例为 $p$ 的一部分神经元置零。这样网络不能依赖某一个神经元，促使它学习冗余表示。测试时所有神经元都激活。**反向 dropout（inverted dropout）**在训练时把激活乘以 $\frac{1}{1-p}$，这样测试时就不需要再缩放。这是标准实现。

- **卷积神经网络（Convolutional Neural Networks，CNN）**利用空间结构。卷积层不像 dense 层那样把每个输入连接到每个输出，而是让一个小滤波器（kernel）在输入上滑动，在每个位置计算点积。同一组滤波器权重在所有位置共享，这大幅减少参数，并内置了平移不变性。

- 对于带有 $k \times k$ 滤波器 $K$ 的二维输入，**卷积运算**为：

$$(\text{input} * K)[i,j] = \sum_{m=0}^{k-1} \sum_{n=0}^{k-1} \text{input}[i+m, j+n] \cdot K[m, n]$$

![3x3 滤波器在输入网格上滑动，在每个位置做逐元素乘法求和并产生输出特征图](../images/cnn_convolution.svg)

- 输出大小取决于三个超参数。**步幅（stride）**控制滤波器每次移动多少像素（stride 为 2 会让空间尺寸减半）。**填充（padding）**在输入边界周围补零（“same” padding 保持空间尺寸，“valid” padding 不保持）。输出大小公式为：$\text{out} = \lfloor (\text{in} - k + 2p) / s \rfloor + 1$。

- **池化（pooling）**层对特征图下采样。最大池化取每个窗口中的最大值；平均池化取均值。池化在保留最重要信息的同时减少空间维度。

- **空洞卷积（dilated convolution）**在滤波器元素之间插入间隔，在不增加参数的情况下扩大感受野。膨胀率为 2 意味着 3x3 滤波器覆盖 5x5 的区域。

- **1x1 卷积**使用 1x1 滤波器，因此不会查看空间邻居；它会混合通道之间的信息。可以把它看成在每个空间位置应用一个 dense 层。它用于低成本地改变通道数。

- **跳跃连接（skip connection）**或残差连接让输入绕过一个或多个层：$\text{output} = F(x) + x$。这使层只需学习残差 $F(x) = \text{output} - x$；当最优变换接近恒等变换时，这更容易学习。ResNet（Residual Networks）利用这一技巧堆叠了超过 100 层，解决了深度网络反而不如浅层网络的退化问题。

- CNN 构建了**特征层次**。早期层检测边缘和纹理；中间层把它们组合成部件（眼睛、车轮）；后期层识别完整对象。每一层的感受野（它能够“看到”的输入区域）都会随深度增长。

- **Embedding** 把离散 token（单词、字符、项目 ID）映射为稠密向量。embedding 层其实只是一个查找表：形状为（词表大小，embedding 维度）的矩阵 $E$。查找 token $i$ 就是选取 $E$ 的第 $i$ 行。这等价于与 one-hot 向量相乘，而 one-hot 向量只是矩阵—向量乘法的一个特例（第 02 章）。Embedding 在训练中学习，因此相似 token 最终会得到相似向量。

- **分词（tokenisation）**是把原始文本转换为 token 序列的过程。词级分词按空格切分，但无法处理未见过的词。**子词分词（subword tokenisation）**（BPE、WordPiece、SentencePiece）把文本拆成高频子词单元，在词表大小和覆盖率之间取得平衡。单词 “unhappiness” 可能变成 ["un", "happiness"] 或 ["un", "happ", "iness"]。

- **循环神经网络（Recurrent Neural Networks，RNN）**一次处理序列中的一个元素，维护一个向前传递信息的隐藏状态：

$$h_t = \tanh(W_h h_{t-1} + W_x x_t + b)$$

- 隐藏状态 $h_t$ 是网络截至时间 $t$ 所见全部内容的压缩摘要。权重 $W_h$ 和 $W_x$ 在所有时间步共享（类似 CNN 共享空间权重）。

- 普通 RNN 难以处理长序列，因为会发生梯度消失：从步骤 $t$ 到步骤 $t-k$ 的梯度信号要经过 $k$ 次 $W_h$ 乘法，因而呈指数级缩小（或爆炸）。

- **LSTM（Long Short-Term Memory，长短期记忆）**引入独立的 cell state $c_t$，让它以尽量少的干扰跨时间流动，从而解决这个问题。三个门控制信息的进入、输出和保留：

- **遗忘门**决定从 cell state 中擦除什么：$f_t = \sigma(W_f [h_{t-1}, x_t] + b_f)$
- **输入门**决定写入哪些新信息：$i_t = \sigma(W_i [h_{t-1}, x_t] + b_i)$，候选值为 $\tilde{c}_t = \tanh(W_c [h_{t-1}, x_t] + b_c)$
- cell state 更新为：$c_t = f_t \odot c_{t-1} + i_t \odot \tilde{c}_t$
- **输出门**决定暴露什么：$o_t = \sigma(W_o [h_{t-1}, x_t] + b_o)$，并且 $h_t = o_t \odot \tanh(c_t)$

![LSTM 单元：遗忘门、输入门、输出门、cell state 高速通道和数据流连接](../images/rnn_lstm_cell.svg)

- cell state 像传送带一样工作：信息可以在许多时间步中不变地流动（遗忘门保持接近 1），从而解决长距离依赖中的梯度消失问题。

- **GRU（Gated Recurrent Unit，门控循环单元）**通过把 cell state 和隐藏状态合并为一个状态，并使用两个门而不是三个门来简化 LSTM：更新门（合并遗忘门和输入门）以及重置门。GRU 参数更少，通常可以取得与 LSTM 相近的表现。

- RNN（包括 LSTM）的根本限制是顺序处理：必须先处理 token 1，再处理 token 2，最后处理 token 3。这阻碍了并行化，也造成信息瓶颈，因为所有上下文都必须挤进固定大小的隐藏状态。

- **Attention**同时解决这两个问题。它不把整个输入压缩进一个固定向量，而是让模型回看所有输入位置，并决定哪些位置与当前输出相关。

- 现代形式使用**查询、键和值（Q、K、V）**。可以把它想成图书馆搜索：query 是你要找的东西，keys 是每本书上的标签，values 是书的实际内容。将 query 与所有 key 比较，就能决定取回哪些 value。

- **缩放点积 attention**：

$$\text{Attention}(Q, K, V) = \text{softmax}\!\left(\frac{QK^T}{\sqrt{d_k}}\right) V$$

- $QK^T$ 计算每个 query 与每个 key 的相似度。这是矩阵乘法（第 02 章），其条目是点积，而点积可以度量余弦相似度（第 01 章）。除以 $\sqrt{d_k}$ 可以防止点积过大（否则 softmax 会饱和，产生接近 one-hot 的分布和消失梯度）。Softmax 把相似度转换为概率分布；与 $V$ 相乘则产生 value 的加权组合。

- **多头 attention**运行 $h$ 个并行 attention 操作，每个操作使用 Q、K、V 的不同可学习投影。这使模型可以同时关注不同表示子空间中的信息。一个头可能关注句法关系，另一个头关注语义关系。各头输出拼接后再投影：

$$\text{MultiHead}(Q, K, V) = \text{Concat}(\text{head}_1, \ldots, \text{head}_h) W^O$$

- **Transformer**架构（Vaswani 等，2017）完全由 attention 和前馈层构成，没有循环。encoder block 重复执行：多头 self-attention、add 与 layer-norm、前馈网络、add 与 layer-norm。decoder block 还增加 masked self-attention（防止模型看到未来 token）和 cross-attention（关注 encoder 输出）。

![Transformer encoder block：多头 attention、add 与 layernorm、前馈网络、add 与 layernorm，以及残差连接](../images/transformer_block.svg)

- **位置编码**是必要的，因为 attention 具有置换等变性，也就是说它把输入当作集合而不是序列。如果没有位置信息，“the cat sat on the mat”和“the mat sat on the cat”会完全相同。原始 Transformer 使用正弦位置编码：

$$PE_{(pos, 2i)} = \sin\!\left(\frac{pos}{10000^{2i/d}}\right), \quad PE_{(pos, 2i+1)} = \cos\!\left(\frac{pos}{10000^{2i/d}}\right)$$

- 每个位置都有一个独特向量，模型可以用它区分位置。现代模型通常改用学习式位置 embedding 或相对位置编码（RoPE、ALiBi）。

- Transformer 并行处理所有 token（self-attention 矩阵 $QK^T$ 在一次矩阵乘法中计算），因此在现代硬件上训练速度远快于 RNN。代价是 self-attention 关于序列长度的复杂度为 $O(n^2)$（每个 token 都关注其他 token），而 RNN 为 $O(n)$。这就是长上下文模型需要特殊 attention 变体（稀疏 attention、线性 attention、Flash Attention）的原因。

- **视觉 Transformer（Vision Transformer，ViT）**把图像切成固定大小的 patch（例如 16x16），将每个 patch 展平为向量，并把这些 patch 当作 token 序列输入 Transformer。输入前置一个可学习的 [CLS] token，其最终表示用于分类。虽然没有卷积的归纳偏置，ViT 在拥有足够训练数据时仍能达到或超过 CNN。

- **MLP-Mixer**是更简单的架构，它用 MLP 同时替代 attention 和卷积。它交替使用“token-mixing” MLP（沿空间位置应用）和“channel-mixing” MLP（沿特征应用）。它的表现有竞争力，说明现代架构的关键洞见或许不是 attention 本身，而是高效地混合 token 与特征之间的信息。

- **Autoencoder（自动编码器）**通过训练网络重建自身输入来学习压缩表示。encoder 把输入映射到低维 bottleneck（潜在编码），decoder 再把它映射回来：

$$z = f_{\text{enc}}(x), \quad \hat{x} = f_{\text{dec}}(z), \quad \mathcal{L} = \|x - \hat{x}\|^2$$

- bottleneck 迫使网络学习最重要的特征。Autoencoder 可用于降维、去噪（用带噪输入训练，重建干净输出）和异常检测（重建误差高表示输入异常）。

- **变分自动编码器（Variational Autoencoder，VAE）**增加了概率视角。encoder 不再编码为单个点 $z$，而是输出一个分布的参数（高斯分布的均值 $\mu$ 和方差 $\sigma^2$）。潜在编码从该分布中采样：$z = \mu + \sigma \odot \epsilon$，其中 $\epsilon \sim \mathcal{N}(0, I)$。这种**重参数化技巧**让采样过程可微，因此梯度可以通过它传播。

- VAE 损失包含两项：

$$\mathcal{L} = \underbrace{\|x - \hat{x}\|^2}_{\text{reconstruction}} + \underbrace{D_{\text{KL}}(q(z|x) \| p(z))}_{\text{regularisation}}$$

- KL 散度项（第 05 章）把学习到的后验 $q(z|x)$ 推向先验 $p(z) = \mathcal{N}(0, I)$，保证潜在空间平滑且结构良好。随后可以从先验中采样并解码，生成新数据；这正是 VAE 成为生成模型的原因。

## 编程任务（使用 CoLab 或 notebook）

1. 从零开始用 JAX 构建一个简单的 MLP。在二维分类问题（例如同心圆）上训练它，并可视化决策边界。
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

2. 从零实现一维卷积。对信号应用简单的边缘检测滤波器，并将结果与内置的 jnp.convolve 比较。
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

3. 从零实现缩放点积 attention。对一个小例子计算 attention 权重，并将 attention 矩阵可视化为热力图。
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

4. 构建一个简单的自动编码器，把二维数据压缩通过一维 bottleneck，再进行重建。可视化潜在空间和重建结果。
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
