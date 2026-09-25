---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 07 - computational linguistics/03. embeddings and sequence models.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: cf467c1180cc5100ff9736bfe3244917358a2915bd3075d89870dfc55c2dc437
status: reviewed
---
# 嵌入与序列模型

*词嵌入把稀疏的符号化文本压缩为稠密向量，使语义相似性可以表现为向量空间中的邻近关系。本文介绍 Word2Vec（CBOW、Skip-gram）、GloVe、FastText、RNN、LSTM、GRU、带注意力机制的 seq2seq，以及编码器—解码器范式，梳理从词袋模型到上下文表示的发展过程。*

- 第 01 篇介绍了分布假说：出现在相似语境中的词往往意义相近。第 02 篇用 TF-IDF 等稀疏的人工特征表示文本。这些向量维度很高（每个词表词对应一个维度），而且大多为零。**词嵌入**从数据中学习稠密、低维的向量，在压缩表示的同时捕捉语义关系。

- **Word2Vec**（Mikolov 等，2013）通过一个简单的预测任务训练浅层神经网络，从而学习词嵌入。它有两种架构。

- **连续词袋模型（CBOW）**根据上下文词预测目标词。给定一个上下文窗口（例如 “the cat ___ on the”），模型对上下文词的嵌入向量取平均，再通过线性层预测缺失的词（“sat”）。训练目标是最大化：

$$P(w_t \mid w_{t-k}, \ldots, w_{t-1}, w_{t+1}, \ldots, w_{t+k})$$
- **Skip-gram** 的做法相反：给定目标词，预测周围的上下文词。以 “sat” 为目标词时，模型会分别尝试预测 “the”“cat”“on”“the”。训练目标是最大化：

$$P(w_{t+j} \mid w_t) \quad \text{for each } j \in [-k, k], \; j \neq 0$$
![Skip-gram 与 CBOW 架构对比：CBOW 对上下文嵌入取平均以预测中心词，Skip-gram 用中心词嵌入分别预测各上下文词](../images/word2vec_architectures.svg)


- Skip-gram 往往更适合学习罕见词，因为每个词会按不同上下文位置产生多个训练样本。CBOW 训练速度较快；由于综合了多个上下文信号，它对高频词的表示通常略好。

- 在完整词表上计算训练目标代价很高，因为 softmax 的分母需要遍历全部 $V$ 个词。**负采样**把问题近似为二分类：区分真实上下文词（正样本）和随机抽取的噪声词（负样本）。这样无需计算完整 softmax，只需更新目标词、真实上下文词和少量负样本的嵌入：

$$\mathcal{L} = \log \sigma(v_{w_O}^T v_{w_I}) + \sum_{i=1}^{k} \mathbb{E}_{w_i \sim P_n} [\log \sigma(-v_{w_i}^T v_{w_I})]$$

**编者注：**公式给出的是要最大化的对数目标；若把它作为要最小化的损失，通常需要在前面加负号。
- 其中，$v_{w_I}$ 是输入词的嵌入，$v_{w_O}$ 是输出（上下文）词的嵌入，$P_n$ 是噪声分布，通常取 unigram 频率的 $3/4$ 次方，以降低 “the” 等高频词被抽中的概率。

- 为什么这样简单的目标函数能学到有意义的嵌入？Levy 和 Goldberg（2014）指出，Skip-gram 加负采样在隐式地分解一个**平移点互信息（PMI）**矩阵。训练收敛时，两个词向量的点积近似为：

$$v_w^T v_c \approx \text{PMI}(w, c) - \log k$$
- 其中，$\text{PMI}(w, c) = \log \frac{P(w, c)}{P(w) P(c)}$ 衡量词 $w$ 和 $c$ 的共现频率比偶然情况下预期的高多少（见第 05 篇的信息论）；$k$ 是负样本数。共现远高于偶然水平的词对具有较高 PMI，点积也较大；共现低于预期的词对 PMI 为负，点积较低。这说明 Word2Vec 与潜在语义分析（对共现矩阵做 SVD）等经典分布语义方法有相通之处，但训练更易扩展，也可在线更新。

- Word2Vec 嵌入一个引人注目的性质是能够通过向量运算近似捕捉**类比关系**。例如，$v_{\text{king}} - v_{\text{man}} + v_{\text{woman}}$ 最接近 $v_{\text{queen}}$。这是因为嵌入空间会把部分语义关系编码为近似线性的方向：“王室身份”方向约为 $v_{\text{king}} - v_{\text{man}}$，将它加到 $v_{\text{woman}}$ 上，结果会接近 $v_{\text{queen}}$。这与第 01 章的线性代数相呼应：语义关系可以表现为向量位移。

- **GloVe**（Global Vectors for Word Representation，Pennington 等，2014）采用了另一种方法。它不逐个学习局部上下文窗口，而是先构建全局词语共现矩阵 $X$；$X_{ij}$ 统计整个语料中词 $j$ 出现在词 $i$ 上下文中的次数。模型再学习词向量，使其点积近似共现次数的对数：

$$w_i^T \tilde{w}_j + b_i + \tilde{b}_j = \log X_{ij}$$
- 损失函数用权重函数 $f(X_{ij})$ 对每一对词加权，避免高频共现主导训练：

$$\mathcal{L} = \sum_{i,j=1}^{V} f(X_{ij}) \left(w_i^T \tilde{w}_j + b_i + \tilde{b}_j - \log X_{ij}\right)^2$$
- GloVe 结合了全局矩阵分解（如潜在语义分析）和 Word2Vec 的局部上下文学习。实践中，两者得到的词嵌入质量相近。

- **FastText**（Bojanowski 等，2017）扩展了 Skip-gram：它把每个词表示为字符 n-gram 的集合。例如，取 $n=3$ 时，“where”可拆为 “<wh”“whe”“her”“ere”“re>”，再加上完整词元 “<where>”。该词的嵌入是这些 n-gram 嵌入的和。

- FastText 的一个重要优势是能为训练时未见过的词生成嵌入。“whereabouts”与 “where” 共享一些 n-gram，因此即使前者没有出现在训练数据中，模型仍能为它生成合理的表示。这对形态变化丰富的语言尤其有用，因为同一个词可能有许多屈折形式（见第 01 篇）。

- **嵌入评估**通常使用两类基准。**类比任务**检验 $v_a - v_b + v_c \approx v_d$ 是否成立（例如，“Paris” $-$ “France” $+$ “Italy” $\approx$ “Rome”）。**相似度基准**则把词对的余弦相似度（见第 01 篇）与人工判断进行比较。常用数据集包括 WordSim-353、SimLex-999 和 Google 类比测试集。需要注意，类比任务表现好的嵌入未必最适合情感分类等下游任务；直接在目标任务上评估通常更有参考价值。

- 第 06 章介绍了用于序列数据的 RNN、LSTM 和 GRU。本节聚焦它们在语言任务中的应用。

- **循环语言模型**逐个读取词元，并在每一步预测下一个词元。隐藏状态 $h_t$ 把整个历史 $w_1, \ldots, w_t$ 压缩为定长向量，再由线性层和 softmax 将 $h_t$ 映射为词表上的概率分布。训练时用真实的下一个词元计算交叉熵损失；这等价于最小化困惑度（见第 02 篇）。它的主要局限是：定长隐藏状态必须编码全部历史信息，较早词元的信息会逐渐被覆盖。

- **双向 RNN**从两个方向处理序列：一个 RNN 从左向右读取，另一个从右向左读取。在位置 $t$，模型将前向隐藏状态 $\overrightarrow{h}_t$ 和后向隐藏状态 $\overleftarrow{h}_t$ 拼接为上下文表示 $h_t = [\overrightarrow{h}_t ; \overleftarrow{h}_t]$。这样模型可以同时利用过去和未来的上下文，因此适用于词性标注和命名实体识别等任务（见第 02 篇）。但双向 RNN 不能用于自回归语言建模，因为预测时不能查看未来词元。

![双向 RNN：前向 RNN 从左向右读取序列并生成隐藏状态，后向 RNN 从右向左读取；两个方向的输出在每个位置拼接](../images/bidirectional_rnn.svg)


- **深层堆叠 RNN**将多个 RNN 层叠放。第 $l$ 层在各时间步产生的隐藏状态序列，作为第 $l+1$ 层的输入。堆叠 2–4 层通常能构建层次化表示并提升性能，类似第 06 章中更深的 CNN 会形成更丰富的特征层次。超过 4 层后，若不添加残差连接，梯度消失和过拟合可能成为问题。

- **序列到序列（seq2seq）**架构（Sutskever 等，2014）把变长输入序列映射为变长输出序列。它由一个**编码器** RNN 和一个**解码器** RNN 组成：编码器读取输入，并将其压缩为上下文向量（最终隐藏状态）；解码器以该向量为条件，逐个生成输出词元。

![Seq2seq 编码器—解码器结构：编码器 RNN 从左向右读取输入词元，将最终隐藏状态传给解码器作为初始状态；解码器以自回归方式生成输出词元](../images/seq2seq_architecture.svg)


- Seq2seq 曾是机器翻译的重要突破。编码器读取法语句子，解码器生成英语译文。解码器从特殊的序列起始词元开始，逐个自回归地生成词元，直到输出序列结束词元。一个实用技巧是反转输入序列（输入 “chat le” 而不是 “le chat”），这会让第一个输入词在计算图中更靠近第一个输出词，从而缩短梯度传播路径并改善结果。

- **瓶颈问题**在于整个输入必须压缩进一个定长向量。句子较长时，这个向量难以保留全部信息，模型性能会下降，因此研究者引入了**注意力机制**。

- 第 06 章介绍了现代注意力机制的 Q、K、V 表述。早期用于 NLP 的注意力机制采用了不同形式，把编码器和解码器的隐藏状态对齐。

- **Bahdanau 注意力**（加性注意力；Bahdanau 等，2015）使用一个可学习的前馈网络，计算前一时间步的解码器隐藏状态 $s_{t-1}$ 与每个编码器隐藏状态 $h_i$ 之间的对齐分数：

$$e_{ti} = v^T \tanh(W_s s_{t-1} + W_h h_i)$$

**编者注：**原文文字写 $s_t$，公式使用 $s_{t-1}$；这里按公式和常见 Bahdanau 写法表述。
- 随后通过 softmax 将分数归一化为注意力权重，并用编码器隐藏状态的加权和计算上下文向量：

$$\alpha_{ti} = \frac{\exp(e_{ti})}{\sum_j \exp(e_{tj})}, \quad c_t = \sum_i \alpha_{ti} h_i$$
- 解码器再结合 $s_{t-1}$ 和 $c_t$ 生成下一个输出。关键改进是：不再让整句共用一个固定上下文向量，而是让解码器在每一步都从编码器状态中取不同的加权组合，从而关注输入中当前相关的部分。

- **Luong 注意力**（乘性注意力；Luong 等，2015）简化了对齐分数的计算。**点积**变体使用 $e_{ti} = s_t^T h_i$；**一般形式**使用 $e_{ti} = s_t^T W h_i$。这两种形式用矩阵乘法代替前馈网络，计算速度快于 Bahdanau 的加性打分。Luong 注意力还用当前解码器状态 $s_t$（而不是 $s_{t-1}$）计算上下文向量，因此使用的信息有所不同。

![源句与译文之间的注意力对齐热图：每个目标词对应其关注的源词，颜色越亮表示注意力权重越高](../images/attention_alignment.svg)


- 注意力权重常用热图展示，显示解码器生成每个输出词元时关注了哪些输入词元。在机器翻译中，热图大致反映源词与目标词的对齐关系；语序调整会打破对角线模式，例如法语和英语的形容词、名词顺序不同。

- 推理时，解码器必须在每一步选择一个词元。**贪心解码**每次都选概率最高的词元，但局部最优选择可能导致整句效果不佳。**束搜索**会在每一步保留概率最高的 $k$ 条部分序列（$k$ 称为束宽），扩展每条序列的所有可能后续词元，再留下整体得分最高的 $k$ 条序列。

- 当束宽 $k=1$ 时，束搜索等同于贪心解码。常见束宽为 4–10；束宽越大，搜索到较优序列的机会越高，但计算也越慢。束搜索还需要做**长度归一化**，避免偏向较短序列，因为短序列连乘的概率项较少，通常总概率更高。归一化分数为：

$$\text{score}(y) = \frac{1}{|y|^\alpha} \sum_{t=1}^{|y|} \log P(y_t \mid y_{<t})$$
- 其中，$|y|$ 是序列长度，$\alpha$（通常为 0.6–0.7）控制长度惩罚的强度。$\alpha=0$ 时不做长度归一化；$\alpha=1$ 时，分数是每个词元的平均对数概率（即几何平均）。介于两者之间的取值用于平衡输出简洁度和过早截断的风险。

- RNN 按顺序处理文本，而 **1D CNN** 可以通过在词元序列上滑动滤波器并行处理。每个滤波器都会检测一种局部模式（n-gram 特征）。

- **TextCNN**（Kim，2014）在输入嵌入矩阵上应用多个宽度不同的一维卷积滤波器（例如宽度为 3、4、5 个词元）。每个滤波器生成一个特征图，随后用**最大时序池化**从每张特征图中取最大值，判断文本任意位置是否出现了对应模式。最后拼接所有滤波器的池化特征并输入分类器。

![TextCNN 结构：输入嵌入并行经过宽度为 3、4、5 的卷积滤波器，每个滤波器接最大时序池化；池化结果拼接后送入全连接分类器](../images/textcnn_architecture.svg)


- TextCNN 速度快，在情感分析等文本分类任务上效果也不错。它擅长捕捉局部 n-gram 模式，但不能建模长距离依赖：宽度为 5 的滤波器只能看到连续 5 个词元。**空洞因果卷积**在滤波器元素之间加入间隔（空洞）来扩大感受野。将空洞率按 1、2、4、8……递增的卷积层堆叠起来，可以在不增加参数的情况下指数级扩大感受野，使模型捕捉数百个词元跨度内的依赖关系。

- 前面介绍的 Word2Vec、GloVe 和 FastText 都为每个词类型生成一个固定向量，不考虑语境。同一个 “bank” 无论表示金融机构还是河岸，嵌入都相同。**上下文嵌入**正是为了解决这一局限。

- **ELMo**（Embeddings from Language Models；Peters 等，2018）通过在输入文本上运行深层双向 LSTM 语言模型，生成上下文相关的词表示。前向 LSTM 预测每个位置的下一个词，后向 LSTM 则预测前一个词；两个模型都在大型语料上以语言建模目标训练。

- 在每个位置 $k$，ELMo 使用针对具体任务学习的权重，组合全部 $L$ 层的隐藏状态：

$$\text{ELMo}_k = \gamma \sum_{j=0}^{L} s_j \, h_{k,j}$$
- 其中，$h_{k,j}$ 是第 $j$ 层在位置 $k$ 的隐藏状态（第 0 层是原始词元嵌入）；$s_j$ 是经过 softmax 归一化的标量权重，$\gamma$ 是针对任务学习的缩放因子。不同层捕捉的信息有所不同：较低层偏向句法信息（如词性和词形），较高层偏向语义信息（如词义和语义角色）。通过学习权重混合各层表示，ELMo 可以适应不同下游任务。

- ELMo 标志着**先预训练、再微调**范式的兴起：先用大量无标注文本训练语言模型，再把学到的表示用于下游任务。ELMo 通常把预训练表示作为固定或轻微微调的特征，与任务特定输入拼接。BERT 和 GPT（见第 04 篇）进一步对整个模型进行端到端微调，在许多下游任务上效果更好。

- 从 Word2Vec 到 ELMo 的发展体现了 NLP 中的一条主线：表示从静态走向动态，上下文从局部扩展到全局，模型从浅层发展到深层。每一步都以更多计算换取更丰富的表示。第 04 篇介绍的 Transformer 用注意力完全替代循环结构，同时实现深层上下文建模和并行计算。

## 编程任务（使用 Colab 或 Jupyter 笔记本）

1. 从零实现带负采样的 Word2Vec Skip-gram。在小型语料上训练，并用 PCA 将学到的嵌入可视化。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

# Small corpus
corpus = """the king ruled the kingdom . the queen ruled the kingdom .
the prince is the son of the king . the princess is the daughter of the queen .
a man worked in the castle . a woman worked in the castle .
the king and queen lived in the castle . the prince and princess played outside .""".lower().split()

vocab = sorted(set(corpus))
word2idx = {w: i for i, w in enumerate(vocab)}
idx2word = {i: w for w, i in word2idx.items()}
V = len(vocab)

# Generate skip-gram pairs with window size 2
window = 2
pairs = []
for i, word in enumerate(corpus):
    for j in range(max(0, i - window), min(len(corpus), i + window + 1)):
        if i != j:
            pairs.append((word2idx[word], word2idx[corpus[j]]))

pairs = jnp.array(pairs)
print(f"Vocabulary: {V} words, Training pairs: {len(pairs)}")

# Model parameters
embed_dim = 16
key = jax.random.PRNGKey(42)
k1, k2 = jax.random.split(key)
W_in = jax.random.normal(k1, (V, embed_dim)) * 0.1    # input embeddings
W_out = jax.random.normal(k2, (V, embed_dim)) * 0.1   # output embeddings

# Negative sampling loss for one pair
def neg_sampling_loss(W_in, W_out, target, context, neg_ids):
    v_in = W_in[target]      # (embed_dim,)
    v_out = W_out[context]   # (embed_dim,)
    v_neg = W_out[neg_ids]   # (k, embed_dim)

    pos_loss = -jax.nn.log_sigmoid(jnp.dot(v_in, v_out))
    neg_loss = -jnp.sum(jax.nn.log_sigmoid(-v_neg @ v_in))
    return pos_loss + neg_loss

# Training loop
num_neg = 5
lr = 0.05

@jax.jit
def train_step(W_in, W_out, target, context, neg_ids):
    loss, (g_in, g_out) = jax.value_and_grad(neg_sampling_loss, argnums=(0, 1))(
        W_in, W_out, target, context, neg_ids)
    return loss, W_in - lr * g_in, W_out - lr * g_out

key = jax.random.PRNGKey(0)
for epoch in range(50):
    total_loss = 0.0
    for i in range(len(pairs)):
        key, subkey = jax.random.split(key)
        neg_ids = jax.random.randint(subkey, (num_neg,), 0, V)
        loss, W_in, W_out = train_step(W_in, W_out, pairs[i, 0], pairs[i, 1], neg_ids)
        total_loss += loss
    if (epoch + 1) % 10 == 0:
        print(f"Epoch {epoch+1}: avg loss = {total_loss / len(pairs):.4f}")

# Visualise with PCA (chapter 01)
embeddings = W_in
mean = embeddings.mean(axis=0)
centered = embeddings - mean
U, S, Vt = jnp.linalg.svd(centered, full_matrices=False)
coords = centered @ Vt[:2].T  # project onto top 2 PCs

plt.figure(figsize=(10, 8))
for i, word in idx2word.items():
    plt.scatter(coords[i, 0], coords[i, 1], c='#3498db', s=40)
    plt.annotate(word, (coords[i, 0] + 0.02, coords[i, 1] + 0.02), fontsize=9)
plt.title("Word2Vec Skip-gram Embeddings (PCA projection)")
plt.grid(alpha=0.3); plt.show()
```

2. 构建一个字符级 RNN 语言模型，让它从一小段训练文本中学习并生成文本。
```python
import jax
import jax.numpy as jnp

# Tiny training text
text = "to be or not to be that is the question "
chars = sorted(set(text))
char2idx = {c: i for i, c in enumerate(chars)}
idx2char = {i: c for c, i in char2idx.items()}
V = len(chars)
data = jnp.array([char2idx[c] for c in text])

# RNN parameters
hidden_dim = 64
key = jax.random.PRNGKey(0)
k1, k2, k3, k4, k5 = jax.random.split(key, 5)

params = {
    'Wx': jax.random.normal(k1, (V, hidden_dim)) * 0.1,
    'Wh': jax.random.normal(k2, (hidden_dim, hidden_dim)) * 0.05,
    'bh': jnp.zeros(hidden_dim),
    'Wy': jax.random.normal(k3, (hidden_dim, V)) * 0.1,
    'by': jnp.zeros(V),
}

def rnn_step(params, h, x_idx):
    x = jnp.eye(V)[x_idx]  # one-hot
    h = jnp.tanh(x @ params['Wx'] + h @ params['Wh'] + params['bh'])
    logits = h @ params['Wy'] + params['by']
    return h, logits

def loss_fn(params, inputs, targets):
    h = jnp.zeros(hidden_dim)
    total_loss = 0.0
    for t in range(len(inputs)):
        h, logits = rnn_step(params, h, inputs[t])
        log_probs = jax.nn.log_softmax(logits)
        total_loss -= log_probs[targets[t]]
    return total_loss / len(inputs)

grad_fn = jax.jit(jax.grad(loss_fn))

# Training
inputs = data[:-1]
targets = data[1:]
lr = 0.01

for step in range(500):
    grads = grad_fn(params, inputs, targets)
    params = {k: params[k] - lr * grads[k] for k in params}
    if (step + 1) % 100 == 0:
        l = loss_fn(params, inputs, targets)
        print(f"Step {step+1}: loss = {l:.4f}")

# Generate text
def generate(params, seed_char, length=60):
    h = jnp.zeros(hidden_dim)
    idx = char2idx[seed_char]
    result = [seed_char]
    key = jax.random.PRNGKey(42)
    for _ in range(length):
        h, logits = rnn_step(params, h, idx)
        key, subkey = jax.random.split(key)
        idx = jax.random.categorical(subkey, logits)
        result.append(idx2char[int(idx)])
    return ''.join(result)

print(f"\nGenerated: {generate(params, 't')}")
```

3. 实现一个带 Bahdanau 注意力的玩具 seq2seq 模型，让它完成序列反转，并将注意力对齐矩阵可视化。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

# Task: reverse a sequence of digits (e.g., [3, 1, 4] -> [4, 1, 3])
vocab_size = 10  # digits 0-9
SOS, EOS = 10, 11  # special tokens
total_vocab = 12
embed_dim, hidden_dim = 16, 32
max_len = 5

key = jax.random.PRNGKey(42)
keys = jax.random.split(key, 8)

params = {
    'embed': jax.random.normal(keys[0], (total_vocab, embed_dim)) * 0.1,
    'enc_Wx': jax.random.normal(keys[1], (embed_dim, hidden_dim)) * 0.1,
    'enc_Wh': jax.random.normal(keys[2], (hidden_dim, hidden_dim)) * 0.05,
    'dec_Wx': jax.random.normal(keys[3], (embed_dim, hidden_dim)) * 0.1,
    'dec_Wh': jax.random.normal(keys[4], (hidden_dim, hidden_dim)) * 0.05,
    # Bahdanau attention
    'Ws': jax.random.normal(keys[5], (hidden_dim, hidden_dim)) * 0.1,
    'Wh_att': jax.random.normal(keys[6], (hidden_dim, hidden_dim)) * 0.1,
    'v_att': jax.random.normal(keys[7], (hidden_dim,)) * 0.1,
    # Output projection (from hidden + context to vocab)
    'Wo': jax.random.normal(keys[0], (hidden_dim * 2, total_vocab)) * 0.1,
}

def encode(params, seq):
    """Encode input sequence, return all hidden states."""
    h = jnp.zeros(hidden_dim)
    states = []
    for t in range(len(seq)):
        x = params['embed'][seq[t]]
        h = jnp.tanh(x @ params['enc_Wx'] + h @ params['enc_Wh'])
        states.append(h)
    return jnp.stack(states), h

def bahdanau_attention(params, dec_state, enc_states):
    """Compute Bahdanau attention weights and context vector."""
    scores = jnp.tanh(enc_states @ params['Wh_att'] + dec_state @ params['Ws'])
    e = scores @ params['v_att']  # (src_len,)
    alpha = jax.nn.softmax(e)
    context = alpha @ enc_states
    return context, alpha

def decode_step(params, dec_h, prev_token, enc_states):
    x = params['embed'][prev_token]
    dec_h = jnp.tanh(x @ params['dec_Wx'] + dec_h @ params['dec_Wh'])
    context, alpha = bahdanau_attention(params, dec_h, enc_states)
    combined = jnp.concatenate([dec_h, context])
    logits = combined @ params['Wo']
    return dec_h, logits, alpha

def seq2seq_loss(params, src, tgt):
    enc_states, enc_final = encode(params, src)
    dec_h = enc_final
    loss = 0.0
    prev_token = SOS
    for t in range(len(tgt)):
        dec_h, logits, _ = decode_step(params, dec_h, prev_token, enc_states)
        log_probs = jax.nn.log_softmax(logits)
        loss -= log_probs[tgt[t]]
        prev_token = tgt[t]
    return loss / len(tgt)

# Generate training data: reverse sequences
key = jax.random.PRNGKey(0)
train_srcs, train_tgts = [], []
for _ in range(200):
    key, subkey = jax.random.split(key)
    length = jax.random.randint(subkey, (), 3, max_len + 1)
    key, subkey = jax.random.split(key)
    seq = jax.random.randint(subkey, (int(length),), 0, vocab_size)
    train_srcs.append(seq)
    train_tgts.append(seq[::-1])  # reverse

# Training
grad_fn = jax.grad(seq2seq_loss)
lr = 0.01

for epoch in range(100):
    total_loss = 0.0
    for src, tgt in zip(train_srcs, train_tgts):
        grads = grad_fn(params, src, tgt)
        params = {k: params[k] - lr * grads[k] for k in params}
        total_loss += seq2seq_loss(params, src, tgt)
    if (epoch + 1) % 20 == 0:
        print(f"Epoch {epoch+1}: avg loss = {total_loss / len(train_srcs):.4f}")

# Visualise attention for one example
test_src = jnp.array([3, 1, 4, 1, 5])
test_tgt = test_src[::-1]

enc_states, enc_final = encode(params, test_src)
dec_h = enc_final
attentions = []
prev_token = SOS
for t in range(len(test_tgt)):
    dec_h, logits, alpha = decode_step(params, dec_h, prev_token, enc_states)
    attentions.append(alpha)
    prev_token = test_tgt[t]

att_matrix = jnp.stack(attentions)
fig, ax = plt.subplots(figsize=(6, 5))
im = ax.imshow(att_matrix, cmap='Blues')
ax.set_xlabel("Source position"); ax.set_ylabel("Target position")
src_labels = [str(int(x)) for x in test_src]
tgt_labels = [str(int(x)) for x in test_tgt]
ax.set_xticks(range(len(src_labels))); ax.set_xticklabels(src_labels)
ax.set_yticks(range(len(tgt_labels))); ax.set_yticklabels(tgt_labels)
for i in range(len(tgt_labels)):
    for j in range(len(src_labels)):
        ax.text(j, i, f"{att_matrix[i,j]:.2f}", ha='center', va='center', fontsize=9)
ax.set_title("Bahdanau Attention Alignment (sequence reversal)")
plt.colorbar(im); plt.tight_layout(); plt.show()
```
