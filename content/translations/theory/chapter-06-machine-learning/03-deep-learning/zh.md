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

*深度学习通过堆叠非线性层来构建具有层次结构的表示，自动将原始输入转换为有用的特征。本文件涵盖了 MLP、激活函数、反向传播、CNN、RNN、LSTMs、注意力机制、Transformer、GANs、VAEs、扩散模型和归一化技术等*

- 什么是“深度”？浅层网络只有一个隐藏层；深层网络有多个。深度让网络能够构建层次结构，早期层学习简单的特征（边缘、音调），而后期层将它们组合成复杂的概念（人脸、句子）。这种可组合性是深度学习强大之处的原因。

- 最简单的深度网络是 **多层感知器 (MLP)**，也称为全连接或密集网络。每个层计算：

$$h = \sigma(Wx + b)$$
- $W$ 是权重矩阵（第 02 章），$b$ 是偏置向量，$\sigma$ 是非线性激活函数。一层的输出成为下一层的输入。没有非线性，堆叠层毫无意义：$W_2(W_1 x) = (W_2 W_1)x$，这只是一个线性变换。这是第 02 章中矩阵乘法坍缩的完全相同情况。

- **激活函数** 引入了使深度有意义的非线性。

- **ReLU**（激活函数）：$\text{ReLU}(x) = \max(0, x)$。它是最常用的激活函数。它计算速度快，对于正输入不会饱和，并且会产生稀疏的激活（许多神经元输出恰好为零）。缺点：负输入的神经元总是输出零，如果它们永久卡在那里，就会“死亡”并停止学习。

- **Sigmoid**：sigmoid函数 $\sigma(x) = \frac{1}{1+e^{-x}}$将输入压缩到 $(0, 1)$对于二分类输出层有用，但在隐藏层中存在困难，因为当输入远离零时梯度消失（曲线几乎平坦）。

- **双曲正切函数** $\tanh(x) = \frac{e^x - e^{-x}}{e^x + e^{-x}}$压缩到 $(-1, 1)$零中心（与sigmoid不同），有助于梯度流动，但仍然在极端时会消失。

- **GELU**（高斯误差线性单元）：$\text{GELU}(x) = x \cdot \Phi(x)$，其中 $\Phi$ 是标准正态分布的累积概率函数。它是一种比 ReLU 更平滑的近似体，允许小负值通过。GELU 在 GPT 和 BERT 中默认使用。

- **Swish**: $\text{Swish}(x) = x \cdot \sigma(x)$，另一个平滑门。在实践中类似于GELU。

![四个ReLU、Sigmoid、Tanh和GELU的侧视图及其关键属性](../images/activation_functions.svg)


- 一个密集的层有 $d_{\text{in}}$ 输入和 $d_{\text{out}}$ 输出有 $d_{\text{in}} \times d_{\text{out}} + d_{\text{out}}$ 参数（权重和偏置）。矩阵乘法 $Wx$ 这是矩阵乘法，类似于第2章的内容。在批量设置中，输入是一个矩阵。 $X$ 形状 $(B, d_{\text{in}})$ 输出是 $XW^T + b$ 形状 $(B, d_{\text{out}})$当然，请提供您需要翻译的英文文本。

- **通用逼近定理**表明，一个包含足够神经元的单隐藏层可以精确地近似任何连续函数在紧凑域上。这听起来似乎深度并不重要，但关键在于“足够的神经元”。实际上，在实践中，深度网络通过使用指数级较少的参数来表示相同的功能。深度提供了效率，而不是表达能力。

- 当网络变深时，出现了两种梯度病态。**消失的梯度**：当梯度通过许多层（通过链式法则，第03章）传递时，它们会被许多因子乘以。如果这些因子始终小于1（如sigmoid和tanh饱和），则梯度会指数级地朝零缩小。早期层几乎无法学习。**爆炸的梯度**：如果这些因子始终大于1，梯度会指数级增长，导致数值溢出和不稳定训练。

- 解决梯度消失/爆炸问题的方法：
  - 使用ReLU或GELU激活（正输入时梯度为1，无饱和）
  - 注意权重初始化
  - 正则化层
  - 跳连接（残差连接）
  - 梯度剪裁（对于爆炸的梯度）：将梯度范数上限设置为最大值

- **权重初始化**很重要，因为它决定了激活和梯度在训练开始时的尺度。如果权重过大，激活会爆炸；过小，它们会消失

- **Xavier（Glorot）初始化**将权重从分布中设置为$\frac{2}{d_{\text{in}} + d_{\text{out}}}$。这保持了激活在各层之间的方差大致相同，假设线性或tanh激活

- **He (Kaiming) 初始化** 使用 $\frac{2}{d_{\text{in}}}$，这是为 ReLU 激活函数调整的方差（因为 ReLU 只激活一半的单元，你需要将方差加倍来补偿）。

- **归一化层** 通过确保每个层的输入具有一致的统计特性（大致零均值、单位方差）来稳定训练。

- **批量归一化（BatchNorm）**在批量维度上进行归一化：对于每个通道/特征，计算所有样本在 mini-batch 中的均值和方差，然后进行归一化。它添加可学习的缩放参数（$\gamma$）和偏移参数（$\beta$），以便网络可以逆向进行归一化。

$$\hat{x} = \frac{x - \mu_B}{\sqrt{\sigma_B^2 + \epsilon}}, \quad y = \gamma \hat{x} + \beta$$
- 模型批归一化（Batch Normalization）存在一个问题：它依赖于批次大小。当批次非常小时，统计信息会变得嘈杂。在推理时，使用运行平均值而不是批量统计，这会导致训练集和测试集之间的差异。

- **层归一化（Layer Normalization）**对每个单独样本的特征维度进行归一化。它不依赖于批次中的其他样本，因此是变换器和循环网络的标准选择。

- 实例归一化（Instance Normalization）在每个样本和每个通道上独立地对空间维度进行归一化。它在风格转移中很流行。

- **分组归一化**将通道分成若干组，并在每组内进行归一化。它是一种介于层归一化和实例归一化之间的折衷方法。

![带有彩色切片的3D张量，显示BatchNorm、LayerNorm和InstanceNorm分别正常化的维度](../images/normalization_types.svg)


- dropout 是一种正则化技术，它随机地将一个分数置零。 $p$ 在训练过程中，神经元的激活被随机丢弃。这迫使网络不依赖于任何单一神经元，鼓励冗余表示。在测试时间，所有神经元都处于激活状态。**反向dropout**通过缩放激活来实现。 $\frac{1}{1-p}$ 在训练过程中，不需要进行缩放。这是标准实现。

- **卷积神经网络（CNNs）**利用空间结构。与全连接层不同，卷积层滑动一个小滤波器（核）在输入上进行计算，每个位置都计算一个点积。相同的滤波器权重在整个位置共享，这大大减少了参数并构建了平移不变性。

- 卷积操作对于一个2D输入，使用大小为$k \times k$的滤波器$K$：

$$(\text{input} * K)[i,j] = \sum_{m=0}^{k-1} \sum_{n=0}^{k-1} \text{input}[i+m, j+n] \cdot K[m, n]$$
![输入网格，3x3滤镜滑动在其上，产生每个位置元素级相乘和求和的特征图](../images/cnn_convolution.svg)


- 输出大小取决于三个超参数。 **步长** 控制滤波器在位置之间移动的像素数（步长为2会减半空间维度）。 **填充** 在输入边界周围添加零 ("same"填充保留空间尺寸，"valid"填充不保留）。输出大小公式：$\text{out} = \lfloor (\text{in} - k + 2p) / s \rfloor + 1$.

- **池化** 层降采样特征图。最大池取窗口中的最大值；平均池取窗口的均值。池化会减小空间维度，同时保留最重要的信息。

- **膨胀卷积**在滤波器元素之间插入间隙，增加感受野而不增加参数。膨胀率2意味着3x3滤波器覆盖一个5x5区域。

- **1x1卷积**使用一个1x1滤波器进行卷积。它们不考虑空间邻近；相反，它们在通道之间混合信息。将它们视为在每个空间位置应用密集层。它们用于以低成本改变通道数量。

- **跳连接**（残差连接）让输入绕过一个或多个层：$\text{output} = F(x) + x$。该层只需学习残差 $F(x) = \text{output} - x$，当最优变换接近身份时更容易。ResNets（残差网络）通过使用这种方法叠加100层来解决深度网络性能不如浅层网络的问题。

- 卷积神经网络（CNN）构建一个特征层次结构。早期层检测边缘和纹理。中间层将这些组合成部件（眼睛、轮子）。晚期层识别整个对象。每个层的可接受场（它能“看到”的输入区域）随着深度而增长。

- 嵌入将离散标记（单词、字符、项目ID）映射到稠密向量。嵌入层只是一个查找表：一个矩阵。 $E$ 词表大小和嵌入维度的形状（词汇量，嵌入维度）。查找标记 $i$ 选择行 $i$ 是的。 $E$这相当于乘以一个独热向量，这是矩阵-向量乘法的一个特殊案例（第02章）。在训练过程中学习到的嵌入，相似的词会最终得到相似的向量。

- **分词** 是将原始文本转换为一系列标记的过程。单词级分词按空格分割，但无法处理未见过的单词。**子词分词**（BPE、WordPiece、SentencePiece）将文本分解为频繁的子词单位，平衡词汇量和覆盖率。例如，“不幸福”可能变为["不", "幸福"]或["不", " Happ", "iness"]。

- 循环神经网络（RNNs）逐个处理序列，维护一个隐藏状态，用于将信息向前传递：

$$h_t = \tanh(W_h h_{t-1} + W_x x_t + b)$$
- The hidden 状态 $h_t$ is a compressed summary of everything the network has seen up to time $t$. The same weights $W_h$ and $W_x$ are shared across all time steps (weight sharing, like CNNs share spatial weights).

- Vanilla RNNs struggle with long sequences because of vanishing gradients: the gradient signal from step $t$ to step $t - k$ passes through $k$ multiplications by $W_h$, and it shrinks (or explodes) exponentially.

- **LSTM**（长短期记忆）通过引入一个单独的细胞状态$c_t$，该状态在时间上流动而几乎没有干扰。三个门控制进入、离开和保留的信息：

- **遗忘门**决定从细胞状态中要擦除的内容：$f_t = \sigma(W_f [h_{t-1}, x_t] + b_f)$
- **输入门**决定要写入的新信息：$i_t = \sigma(W_i [h_{t-1}, x_t] + b_i)$，候选值为$\tilde{c}_t = \tanh(W_c [h_{t-1}, x_t] + b_c)$
- 细胞状态更新：$c_t = f_t \odot c_{t-1} + i_t \odot \tilde{c}_t$
- **输出门**决定要暴露的内容：$o_t = \sigma(W_o [h_{t-1}, x_t] + b_o)$和$h_t = o_t \odot \tanh(c_t)$

![LSTM单元显示遗忘门、输入门、输出门、细胞状态高通滤波器和数据流连接](../images/rnn_lstm_cell.svg)


- 细胞状态像一个传送带：信息可以跨多个时间步不变地流动，从而解决了长距离依赖的梯度消失问题。

- **GRU**（门控循环单元）简化了LSTM，将细胞状态和隐藏状态合并为一个，并使用两个门代替三个：更新门（结合遗忘和输入）和重置门。GRUs参数较少，通常与LSTMs性能相当。

- RNNs（包括LSTM）的最基本限制是顺序处理：必须先处理令牌1，然后是令牌2，最后是令牌3。这阻止了并行化，并创建了一个信息瓶颈，因为所有上下文都必须挤过固定大小的隐藏状态。

- **注意**解决了两个问题。它允许模型回顾所有输入位置，并决定哪些是当前输出相关的。

- 现代的表达方式使用了 **查询、键和值（Q, K, V）**。想象一下，它就像一个图书馆搜索：你有一个查询（你要找的东西），键（每个书上的标签），和值（实际的书内容）。你将你的查询与所有键进行比较，以确定要检索哪些值。

- **缩放点积注意力**：

$$\text{Attention}(Q, K, V) = \text{softmax}\!\left(\frac{QK^T}{\sqrt{d_k}}\right) V$$
- $QK^T$ 计算每个查询与每个键之间的相似性。这是矩阵乘法（第 02 章），条目是点积，用于测量余弦相似度（第 01 章）。除以 $\sqrt{d_k}$ 防止点积变得太大（这会使 softmax 受饱和影响，并产生近似单热分布，导致梯度消失）。softmax 将相似性转换为概率分布。乘以 $V$ 生成加权组合的值。

- **多头注意力**并行运行 $h$ 个注意力操作，每个操作都有不同的 Q、K 和 V 的学习投影。这使得模型能够同时关注不同表示子空间的信息。一个头可能关注语法关系，另一个头可能关注语义关系。输出被连接并投影：

$$\text{MultiHead}(Q, K, V) = \text{Concat}(\text{head}_1, \ldots, \text{head}_h) W^O$$
- **Transformer**架构（Vaswani et al., 2017）完全由注意力和前馈层组成，没有递归。编码器块重复：多头自注意力、加法和层归一化、前馈网络、加法和层归一化。解码器块添加一个遮蔽的自注意力（防止模型看到未来标记）和一个跨注意力层，该层关注编码器输出。

![Transformer编码块：多头注意力、加法和层归一化、前馈网络、加法和层归一化，带有残差连接](../images/transformer_block.svg)


- **位置编码**是必要的，因为注意力是排列不变的，这意味着它将输入视为一个集合而不是序列。没有位置信息，“猫坐在垫子上”和“垫子坐在猫上”会完全相同。原始的Transformer使用了正弦位置编码：

$$PE_{(pos, 2i)} = \sin\!\left(\frac{pos}{10000^{2i/d}}\right), \quad PE_{(pos, 2i+1)} = \cos\!\left(\frac{pos}{10000^{2i/d}}\right)$$
- 每个位置都得到一个唯一的向量，模型可以使用该向量来区分位置。现代模型通常使用学习的相对位置嵌入（RoPE、ALiBi）或相对位置编码代替。

- transformers在并行处理所有token时（self-attention矩阵$QK^T$通过一次矩阵乘法计算），比RNNs在现代硬件上训练速度快得多。代价是，自注意力在序列长度（每个token都关注其他所有token）方面是$O(n^2)$的，而RNNs是$O(n)$。这就是为什么长上下文模型需要特殊注意变体（稀疏注意力、线性注意力和闪存注意力）。

- **视觉变换器（ViT）**通过将图像分割成固定大小的patches（例如16x16），将每个patch展平为向量，并将patches视为一个token序列来应用transformer。在每个patch前添加一个可学习的[CLS]标记，其最终表示用于分类。尽管没有卷积诱导偏置，但ViTs在训练足够的数据时可以与CNNs匹配或超越。

- **MLP-Mixer** 是一个更简单的架构，它用全连接层（MLPs）取代了注意力和卷积。它交替应用“token-mixing” MLPs（在空间位置上应用）和“channel-mixing” MLPs（在特征上应用）。它与现代架构相比表现相当出色，这表明现代架构的关键洞察不是注意力本身，而是信息在tokens和features之间高效混合的能力。

- 自动编码器通过训练网络来重建其输入，学习压缩表示。编码器将输入映射到一个较低维度的瓶颈（隐含代码），而解码器将其映射回来：

$$z = f_{\text{enc}}(x), \quad \hat{x} = f_{\text{dec}}(z), \quad \mathcal{L} = \|x - \hat{x}\|^2$$
- 瓶颈效应迫使网络学习最重要的特征。自编码器用于降维、去噪（训练时使用噪声输入，重建干净输出）和异常检测（高重建误差信号不寻常的输入）。

- 变分自编码器（VAE）引入了概率的元素。它们不将数据编码为单个点，而是将其编码为一个分布。 $z$编码器输出分布的参数（均值） $\mu$ 方差 $\sigma^2$ 高斯分布。隐变量从该分布中采样。 $z = \mu + \sigma \odot \epsilon$在何处 $\epsilon \sim \mathcal{N}(0, I)$这个“重新参数化技巧”使得采样可微，从而梯度可以流动。

- 该VAE损失包含两个项：

$$\mathcal{L} = \underbrace{\|x - \hat{x}\|^2}_{\text{reconstruction}} + \underbrace{D_{\text{KL}}(q(z|x) \| p(z))}_{\text{regularisation}}$$
- KL散度项（第5章）将学习到的后验 $q(z|x)$ 推向先验 $p(z) = \mathcal{N}(0, I)$，确保潜空间平滑且结构良好。然后可以从先验中采样并解码生成新数据。这就是为什么VAEs是生成模型的原因。

## 编程任务（使用 Colab 或笔记本）

1. 构建一个简单的MLP从头开始在JAX中。使用2D分类问题（例如同心圆）对其进行训练，并可视化决策边界。
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

2. 实现一维卷积从头开始。应用一个简单的边缘检测滤波器到信号，并与内置的 `jnp.convolve` 进行比较。
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

3. 实现从头开始的缩放点积注意力。计算一个小型示例的注意力权重，并可视化注意力矩阵为热图。
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

4. 构建一个简单的自编码器，通过一维瓶颈压缩2D数据，并重建它。可视化潜伏空间和重构结果。
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
