---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 09 - audio and speech/04. speaker and audio analysis.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 50400c0042671313fcff23634d2a6b3b48d6489843c5c416baeaff67ac704a4f
status: reviewed
---
# 说话者分析与音频分析

*说话者分析识别谁在说话、何时说话以及音频中非语音声音的存在。本文件涵盖了说话验证和识别、i-vectors、d-vectors、x-vectors、说话人聚类、音频事件分类、音乐信息检索和情绪识别从语音中提取特征。*

- 在文件 01 中，我们构建了信号处理基础：频谱图、MFCCs 和梅尔滤波器。在文件 02 中，我们识别了说什么。现在我们问他们说了什么、何时说了什么以及音频中发生了什么。说话人识别、聚类、音频分类和音乐分析都共享一个共同的线索：学习能够捕捉任务所需正确不变性的紧凑嵌入，类似于第 06 章中的嵌入思想。

- 将说话者识别想象为在电话中识别朋友的声音。你不需要理解单词；声音的音调、节奏和声线质量是独一无二的那个人的标志。说话人识别系统从原始音频中学习提取出 exactly这个“语音印迹”，忽略说了什么，专注于如何说。

- **语音识别** 是两个相关任务的统称：
    - **语音验证** (SV): 给定一个声称的身份和音频片段，确定说话者是否是他们声称的人。这是一个二元决策（接受或拒绝），是基于语音身份验证技术的基础 ("嘿 Siri, 这是我的声音吗？")。
    - **语音识别** (SI): 给定一个音频片段和已知的说话人库，确定哪个说话者生产了该片段。这是一个多类分类问题。

![](../images/speaker_verification.svg)


- 两个任务共享相同的底层表示：固定维度的 **说话人嵌入**，能够捕捉说话者的身份，无论他们说什么。差异仅在于决策阶段：验证比较两个嵌入，识别找到候选者中最近的嵌入。

- **余弦相似度**是用于比较说话人嵌入的标准指标。给定注册嵌入 $e$ 和测试嵌入 $t$：

$$s = \frac{e \cdot t}{\|e\| \, \|t\|}$$
- 一个阈值 $\theta$ 决定了接受/拒绝的决策：如果 $s > \theta$，接受。这个阈值在 **误判率（FAR）** 和 **拒判率（FRR）** 之间进行权衡。 **等错误率（EER）**，其中 FAR = FRR，是标准评估指标。较低的 EER 表示性能更好。最先进的系统在标准基准测试（VoxCeleb）上实现的 EER 低于 1%。

- **i-vectors**（Dehak et al., 2010）在深度学习之前是主要的说话人嵌入。这个想法来自因子分析（第2章的矩阵分解和第4章的降维）。一个**通用背景模型（UBM）**，在一个多样化的说话人上训练的大GMM定义了一个监督向量空间。每个utterance的GMM监督向量被投影到低维度的**总可变性空间**：

$$M = m + Tw$$
- $M$ 是说话人模型的 GMM 超维向量，$m$ 是 UBM 均值超维向量，$T$ 是总变异性矩阵（从数据中学习），而 $w$ 是 i-vector，它是一个低维度（通常为 400-600）的表示，同时捕捉了说话人和通道的 variability。

- 为了从i-vectors中去除通道变异性，**概率线性判别分析（PLDA）**模型将i-vector视为由特定说话人和通道特异的潜在变量组成的总和。PLDA提供了一个用于验证的有原则的对数似然比分数：

$$\text{score}(w_1, w_2) = \log \frac{P(w_1, w_2 \mid \text{same speaker})}{P(w_1 \mid \text{speaker}_1) \, P(w_2 \mid \text{speaker}_2)}$$
- **d-vectors**（Variani et al., 2014）是第一个神经说话人嵌入。一个在帧级特征上训练的DNN，通过平均所有帧的最后一个隐藏层激活来提取固定维度表示。简单但有效，d-vectors展示了神经网络可以在不依赖i-vectors复杂统计机制的情况下学习说话人区分特征。

- **x-vectors**（Snyder et al., 2018）通过使用时间延迟神经网络（TDNN）架构显著提升了神经说话人嵌入。TDNNs在每一层应用特定的上下文窗口，类似于文件03中的WaveNet的膨胀卷积，但应用于帧级别的特征而不是原始波形样本。

![](../images/xvector_architecture.svg)


- x-vector架构包含三个阶段：
    - **帧级层**：TDNN层的堆栈处理MFCCs（来自文件01），随着时间窗口逐渐扩大。每个层看到一个固定的时间窗口（例如，$\{t-2, t-1, t, t+1, t+2\}$对于第一个层，后续层更宽）。
    - **统计池化**：在帧级层之后，计算整个utterance的帧级输出的均值和标准差，产生一个与utterance长度无关的固定维度向量。

```math
\begin{aligned}
\mu &= \frac{1}{T} \sum_{t=1}^{T} h_t \\
\sigma &= \sqrt{\frac{1}{T} \sum_{t=1}^{T} (h_t - \mu)^2}
\end{aligned}
```

-     其中 $h_t$ 是帧级输出在时间 $t$。拼接 $[\mu; \sigma]$ 是合并后的表示。
    - **段级层**：全连接层处理合并后的表示。第一段级层（在 softmax 之前）的输出是 x-vector 嵌入。

- x-vectors通过标准的交叉熵损失训练，尽管被用于分类，但学习到的中间表示（x-vector）在未见过的说话者上表现良好，因为网络学会了提取说话者的特征，而不是记住特定的说话者。

- **ECAPA-TDNN**（Desplanques et al., 2020）是当前最先进的基于TDNN的语音识别架构。它在x-vectors的基础上引入了三个改进：
    - **通道注意力（SE）块**：从第8章的SENet中引入，根据全局上下文重新权重特征通道，使模型能够强调与说话人相关的通道。
    - **Res2Net风格多尺度特征**：在每个TDNN块中，通道被分成组，并按层级进行处理，创建了不同时间分辨率的特征（类似于第8章的多尺度特征提取）。
    - **注意力统计池化**：而不是等权重平均，使用注意力机制为每个帧的贡献赋予不同的权重。带有更多说话人区分内容的帧（例如元音，携带更多信息）获得更高的注意力权重：

$$\alpha_t = \frac{\exp(v^T f(h_t))}{\sum_{\tau} \exp(v^T f(h_\tau))}$$
- $f$ 是一个小神经网络，$v$ 是一个学习到的注意力向量。被注意的平均值和标准差变为 $\tilde{\mu} = \sum_t \alpha_t h_t$ 和 $\tilde{\sigma} = \sqrt{\sum_t \alpha_t (h_t - \tilde{\mu})^2}$。

- ECAPA-TDNN 通常使用 AAM-Softmax（加权角度余弦相似度），它在分类损失中添加了一个角度余弦相似度惩罚，将同一说话者的嵌入向量推近，并将不同说话者的嵌入向量推远到 hypersphere 上。

$$L = -\log \frac{e^{s \cos(\theta_{y_i} + m)}}{e^{s \cos(\theta_{y_i} + m)} + \sum_{j \neq y_i} e^{s \cos \theta_j}}$$
- $\theta_{y_i}$ 是嵌入向量与真类权重向量之间的角度，$m$ 是边距（通常为 0.2），而 $s$ 是缩放因子（通常为 30）。这个损失来自人脸识别（第 08 章的 ArcFace）并对于说话人验证非常有效。

- **说话者识别**回答“谁在什么时候说话”在一个多说话人的录音中。想象一下，这就像给时间轴上涂色：每种颜色代表一个不同的说话人，系统必须确定每个说话人在何时活跃，包括重叠的发言。

![](../images/speaker_diarisation.svg)


- **基于聚类的多说话人标注**是传统的处理流程：
    - **分割**：将音频分成短片段（通常1-2秒），使用滑动窗口或说话变化检测。
    - **嵌入提取**：为每个片段提取说话者嵌入（x-vector、ECAPA-TDNN）。
    - **聚类**：根据说话人分组。标准方法是：将每个片段视为独立的集群，然后迭代合并最相似的两个集群，直到满足停止准则（基于距离阈值或目标说话人数）。
    - **重新分割**：使用Viterbi算法重新调整边界。

- 通常未知初始成员数，这使得该问题比标准聚类更困难。使用基于特征值的阈值进行$k$的谱聚类是另一种常见方法。

- **端到端神经多标签分类（EEND）**（Fujita et al., 2019）将聚类方法视为多标签分类问题。一个神经网络（通常是一个基于自注意力的模型，如第7章中的Transformer）接收整个录音作为输入，并为每个帧输出每个说话者的二进制活动标签。这直接处理了集群方法中常见的重叠语音问题。

- $S$的EEND输出在帧$t$时是：

$$\hat{y}_{t,s} = \sigma(f_s(h_t))$$
- 在帧 $t$ 处的变换器输出为 $h_t$，$f_s$ 是针对说话人 $s$ 的线性投影。训练损失是按说话人和帧加权的二元交叉熵。一个关键挑战是必须固定说话人的数量，或者使用具有可变输出架构的框架（例如 EEND-EDA 使用带有吸引器的编码器-解码器）。

- **不变排列训练 (PIT)** 用于多话者标注处理标签歧义问题：由于说话人没有固有的顺序，损失是计算所有可能的说话人到输出的赋值，并取最小值（这与源分离中的 PIT 相同，已在文件 05 中覆盖）。

- **音频分类** 对整个音频剪辑进行标签分配。不同于 ASR（文件 02），音频分类涵盖更广泛的范围：环境声音（警报、雨声、狗吠声）、音乐风格（摇滚、爵士、古典）和一般音频事件。

- 标准方法遵循第 8 章中的图像分类范式：将音频表示为频谱图（2D时间频率图像），然后应用 CNN 或 transformer 分类器。这种频谱图像方法利用了几十年的计算机视觉进步。

- **环境声分类（ESC）**使用数据集如ESC-50（50类，2000个片段）和UrbanSound8K。典型的架构是应用到log-mel频谱图的CNNs（第6章）。数据增强至关重要：时间拉伸、音调偏移、添加背景噪声以及**SpecAugment**（文件02中的掩码方法应用于频谱图）都提高了泛化能力。

- **音频事件检测**（声事件检测，SED）是时间上的分类：不仅是什么事件存在，而且它们何时开始和结束。**AudioSet**（Gemmeke et al., 2017）是一个大规模基准测试，包含527个事件类别和超过2百万10秒的YouTube视频片段，每个视频片段都只进行了弱标注（剪辑级别的标签，而不是帧级别的）。

- **弱监督的SED**必须从剪辑级别的标签中学习帧级预测。标准方法使用一个CNN，它产生帧级类概率，然后通过注意力池化将它们聚合到剪辑级预测上：

$$\hat{Y}_c = \sigma\left(\sum_t \alpha_{t,c} \cdot f_{t,c}\right)$$
- 在时间 $t$ 时，帧级别的 logits $f_{t,c}$ 对于类 $c$ 进行预测，并且 $\alpha_{t,c}$ 是注意力权重。clip-level 的预测 $\hat{Y}_c$ 是基于 clip-level 标签进行训练的。

- **声学场景分类（ASC）**将整体环境分为“机场”、“公园”、“地铁站”和“办公室”。这是一个综合任务：模型需要捕捉总体的声学纹理，而不是特定事件。DCASE挑战系列每年都会对ASC进行基准测试，通常获胜系统使用多分辨率频谱图上的CNN ensemble。

- 音频嵌入是通过大规模音频数据学习的通用表示，类似于单词嵌入（第07章）或图像特征（第08章），这些表示在下游任务中转移。

- **VGGish**（Hershey et al., 2017）将 VGG 图像分类网络（第 8 章）适配到音频。它通过处理 0.96 秒的对数梅尔频谱图补丁，通过预训练于 AudioSet 的 VGG-like CNN 进行处理，产生每个补丁的 128 维嵌入。VGGish 嵌入作为下游任务的一般音频特征，类似于如何使用 ImageNet 预训练的 CNN 提供视觉特征。

- **PANNs**（预训练音频神经网络， Kong et al., 2020）是CNN架构的家族（CNN6、CNN10、CNN14），在全AudioSet上对音频标签进行训练。其中最常用的CNN14是一个包含14层的CNN，应用了对对数梅尔频谱图的$3 \times 3$卷积。PANNs生成2048维嵌入，能够在多种音频任务中实现最先进的迁移学习。

- **音频频谱变换器（AST）**（Gong et al., 2021）直接将视觉变换器（ViT，第8章）架构应用于音频频谱图。频谱图被分割成$16 \times 16$个patches（就像ViT分割图像一样），每个patch线性投影到一个token嵌入中，添加位置嵌入，然后标准的Transformer编码器（第7章）处理序列。[CLS] token的输出用于分类。

![](../images/audio_spectrogram_transformer.svg)


- AST 通过 ImageNet 预训练受益：由于声谱图是二维图像，AST 从在 ImageNet 图像上预训练的 ViT 模型开始初始化，然后在音频数据上进行微调。这种跨模态转移 surprisingly有效，因为两个领域共享低级特征（边缘、纹理）以及位置嵌入可以插值以处理不同声谱图大小的问题。

- **HTS-AT**（陈等，2022）在AST的基础上引入了多级SwinTransformer架构（第08章的移位窗口注意力），通过多尺度特征提取提高了性能，并降低了计算成本。

- **BEATs**（陈等人，2023）使用一种专门针对音频的预训练策略：迭代掩码预测，并结合离散标记器（类似于wav2vec 2.0在文件02中采用的方法，但应用于一般音频）。随着标记器的逐步优化，生成越来越语义丰富的离散音频令牌。

- **说话人识别与嵌入**结合了说话人嵌入和时间建模。现代系统如Pyannote.audio使用一个三阶段管道：（1）一个神经分割模型，检测说话人的发言和重叠的语音；（2）对每个检测到的段落应用嵌入提取阶段（ECAPA-TDNN）；（3）聚类以在录音中分配说话人身份。

- **音乐信息检索（MIR）**将音频分析应用于音乐。文件01中的频谱表示特别有用，因为音乐具有丰富的和声结构。

- **节拍跟踪**检测音乐的节奏脉动。标准方法从频谱图（检测能量增加信号音符开始）计算一个**起始强度轮廓**，然后使用自相关或临时图找到节拍，最后通过动态规划跟踪每个节拍的位置，以最佳匹配起始强度轮廓同时保持一致的节拍速率。

- **识别和弦**是识别时间上的和声内容。输入通常是 **音阶图**（也称为音级分布）：一个12维的表示，将所有八度折叠在一起，显示每个音级（C、C#、D、...、B）的能量。CNN或RNN（第06章）将每个时间帧分类为标准和弦标签（大调C、小调A、G7等）。

- 颜谱是通过将频谱图（文件 01）中的每个频率带映射到其音级类来计算的：

$$\text{chroma}(p) = \sum_{k : \text{pitch}(k) \bmod 12 = p} |X(k)|^2$$
- $p \in \{0, 1, \ldots, 11\}$ 是音阶，$\text{pitch}(k)$ 将频率 bins $k$ 映射到 MIDI 音符编号。

- **基本的源分离**（在文件 05 中进一步详细说明）将音乐录音分解为单独的乐器（人声、鼓、贝斯和其他）。这是许多MIR应用的关键，如混音、卡拉OK和音乐转录。Demucs模型（文件 05）在标准的MUSDB18基准测试中实现了令人印象深刻的质量分离效果。

- **音乐标签**为歌曲分配标签（类型、情绪、乐器、时代）。它本质上是将音频分类应用于音乐，使用相同的CNN-on-spectrogram方法。Million Song Dataset和MagnaTagATune是标准基准。

- **音频指纹识别**可以从一段短的录音中确定特定的录制，即使有噪音、混响或压缩等声学降质。经典系统是Shazam，它通过哈希星座点（频谱图中的突出峰值）来实现。神经方法学习鲁棒的嵌入，这些嵌入在声学降质下保持不变，同时仍然能够区分不同的录制，这与第06章和第08章中提到的不变特征学习类似。

## 编程任务（使用 CoLab 或 笔记本）

- **任务 1: 使用统计池化提取说话人嵌入。** 构建一个简单的 x-vector 样式模型，通过 TDNN 层处理帧级特征，并使用统计池化生成说话人嵌入。

```python
import jax
import jax.numpy as jnp
import jax.random as jr
import matplotlib.pyplot as plt

# Simulate frame-level MFCC features for multiple speakers
def generate_speaker_data(key, n_speakers=5, utterances_per_speaker=20,
                          n_frames=100, n_features=40):
    """Generate synthetic speaker data with speaker-dependent patterns."""
    keys = jr.split(key, 3)
    all_features = []
    all_labels = []

    # Each speaker has a characteristic spectral pattern
    speaker_patterns = jr.normal(keys[0], (n_speakers, n_features)) * 0.5

    for spk in range(n_speakers):
        for utt in range(utterances_per_speaker):
            k = jr.fold_in(keys[1], spk * utterances_per_speaker + utt)
            noise = jr.normal(k, (n_frames, n_features)) * 0.3
            features = speaker_patterns[spk][None, :] + noise
            all_features.append(features)
            all_labels.append(spk)

    perm = jr.permutation(keys[2], len(all_features))
    features = jnp.stack(all_features)[perm]
    labels = jnp.array(all_labels)[perm]
    return features, labels

key = jr.PRNGKey(42)
features, labels = generate_speaker_data(key)
n_speakers = 5
n_features = 40

# x-vector-style model
def init_xvector(key, n_features=40, hidden=128, embed_dim=64, n_speakers=5):
    keys = jr.split(key, 8)
    params = {
        # TDNN layer 1: context [-2, 2]
        'tdnn1_w': jr.normal(keys[0], (5, n_features, hidden)) * jnp.sqrt(2.0 / (5 * n_features)),
        'tdnn1_b': jnp.zeros(hidden),
        # TDNN layer 2: context [-2, 2]
        'tdnn2_w': jr.normal(keys[1], (5, hidden, hidden)) * jnp.sqrt(2.0 / (5 * hidden)),
        'tdnn2_b': jnp.zeros(hidden),
        # TDNN layer 3: context [-3, 3]
        'tdnn3_w': jr.normal(keys[2], (7, hidden, hidden)) * jnp.sqrt(2.0 / (7 * hidden)),
        'tdnn3_b': jnp.zeros(hidden),
        # Segment-level layers (after pooling: 2*hidden -> embed_dim)
        'seg1_w': jr.normal(keys[3], (2 * hidden, embed_dim)) * jnp.sqrt(2.0 / (2 * hidden)),
        'seg1_b': jnp.zeros(embed_dim),
        # Classification head
        'cls_w': jr.normal(keys[4], (embed_dim, n_speakers)) * jnp.sqrt(2.0 / embed_dim),
        'cls_b': jnp.zeros(n_speakers),
    }
    return params

def xvector_forward(params, x, return_embedding=False):
    """x: (batch, frames, features) -> logits or embeddings."""
    # TDNN layers (1D convolutions)
    h = jax.lax.conv_general_dilated(
        x.transpose(0, 2, 1), params['tdnn1_w'].transpose(2, 1, 0),
        window_strides=(1,), padding='SAME'
    ).transpose(0, 2, 1) + params['tdnn1_b']
    h = jax.nn.relu(h)

    h = jax.lax.conv_general_dilated(
        h.transpose(0, 2, 1), params['tdnn2_w'].transpose(2, 1, 0),
        window_strides=(1,), padding='SAME'
    ).transpose(0, 2, 1) + params['tdnn2_b']
    h = jax.nn.relu(h)

    h = jax.lax.conv_general_dilated(
        h.transpose(0, 2, 1), params['tdnn3_w'].transpose(2, 1, 0),
        window_strides=(1,), padding='SAME'
    ).transpose(0, 2, 1) + params['tdnn3_b']
    h = jax.nn.relu(h)

    # Statistics pooling: mean and std over time
    mu = jnp.mean(h, axis=1)
    sigma = jnp.std(h, axis=1)
    pooled = jnp.concatenate([mu, sigma], axis=-1)

    # Segment-level layer -> embedding
    embedding = jax.nn.relu(pooled @ params['seg1_w'] + params['seg1_b'])

    if return_embedding:
        return embedding

    # Classification
    logits = embedding @ params['cls_w'] + params['cls_b']
    return logits

def cross_entropy_loss(params, features, labels):
    logits = xvector_forward(params, features)
    one_hot = jax.nn.one_hot(labels, n_speakers)
    log_probs = jax.nn.log_softmax(logits)
    return -jnp.mean(jnp.sum(one_hot * log_probs, axis=-1))

grad_fn = jax.jit(jax.value_and_grad(cross_entropy_loss))

# Train
params = init_xvector(jr.PRNGKey(0))
lr = 1e-3
losses = []

for epoch in range(300):
    loss_val, grads = grad_fn(params, features, labels)
    params = jax.tree.map(lambda p, g: p - lr * g, params, grads)
    losses.append(float(loss_val))

# Extract embeddings and visualise with t-SNE-style 2D projection (using PCA)
embeddings = xvector_forward(params, features, return_embedding=True)

# Simple PCA to 2D
emb_centered = embeddings - jnp.mean(embeddings, axis=0)
_, _, Vt = jnp.linalg.svd(emb_centered, full_matrices=False)
proj_2d = emb_centered @ Vt[:2].T

fig, axes = plt.subplots(1, 2, figsize=(14, 5))

axes[0].plot(losses, color='#3498db', linewidth=1.5)
axes[0].set_xlabel('Epoch')
axes[0].set_ylabel('Cross-Entropy Loss')
axes[0].set_title('Speaker Classification Training')
axes[0].set_yscale('log')

colors = ['#3498db', '#e74c3c', '#27ae60', '#f39c12', '#9b59b6']
for spk in range(n_speakers):
    mask = labels == spk
    axes[1].scatter(proj_2d[mask, 0], proj_2d[mask, 1], c=colors[spk],
                    label=f'Speaker {spk}', alpha=0.7, s=30)
axes[1].set_xlabel('PC 1')
axes[1].set_ylabel('PC 2')
axes[1].set_title('Speaker Embeddings (PCA projection)')
axes[1].legend()

plt.tight_layout()
plt.show()

# Verification demo: cosine similarity
emb_norm = embeddings / jnp.linalg.norm(embeddings, axis=-1, keepdims=True)
sim_matrix = emb_norm @ emb_norm.T
print(f"Embedding shape: {embeddings.shape}")
print(f"Avg same-speaker similarity: {jnp.mean(sim_matrix[labels[:, None] == labels[None, :]]):.4f}")
print(f"Avg diff-speaker similarity: {jnp.mean(sim_matrix[labels[:, None] != labels[None, :]]):.4f}")
```

- **任务 2: 使用余弦相似度评分进行说话人验证。** 给定预计算的说话人嵌入，实现一个验证系统，计算 EER（等错误率）并绘制 DET 曲线。

```python
import jax
import jax.numpy as jnp
import jax.random as jr
import matplotlib.pyplot as plt

def generate_verification_pairs(key, n_speakers=20, dim=64, n_pairs=2000):
    """Generate speaker embeddings and verification trial pairs."""
    keys = jr.split(key, 5)

    # Speaker centroids with some variance
    centroids = jr.normal(keys[0], (n_speakers, dim))
    centroids = centroids / jnp.linalg.norm(centroids, axis=-1, keepdims=True)

    # Generate enrollment and test embeddings with intra-speaker variance
    enroll_embs = []
    test_embs = []
    trial_labels = []  # 1 = same speaker (target), 0 = different (impostor)

    for i in range(n_pairs):
        k1, k2, k3 = jr.split(jr.fold_in(keys[1], i), 3)
        is_target = jr.bernoulli(k1).astype(int)

        spk1 = jr.randint(k2, (), 0, n_speakers)
        emb1 = centroids[spk1] + jr.normal(jr.fold_in(k3, 0), (dim,)) * 0.15

        if is_target:
            spk2 = spk1
        else:
            spk2 = (spk1 + jr.randint(jr.fold_in(k3, 1), (), 1, n_speakers)) % n_speakers

        emb2 = centroids[spk2] + jr.normal(jr.fold_in(k3, 2), (dim,)) * 0.15

        enroll_embs.append(emb1)
        test_embs.append(emb2)
        trial_labels.append(int(is_target))

    return (jnp.stack(enroll_embs), jnp.stack(test_embs),
            jnp.array(trial_labels))

key = jr.PRNGKey(42)
enroll, test, labels = generate_verification_pairs(key)

# Compute cosine similarity scores
enroll_norm = enroll / jnp.linalg.norm(enroll, axis=-1, keepdims=True)
test_norm = test / jnp.linalg.norm(test, axis=-1, keepdims=True)
scores = jnp.sum(enroll_norm * test_norm, axis=-1)

# Compute FAR and FRR at various thresholds
thresholds = jnp.linspace(-1.0, 1.0, 500)

target_scores = scores[labels == 1]
impostor_scores = scores[labels == 0]

fars = []
frrs = []
for thresh in thresholds:
    far = jnp.mean(impostor_scores >= thresh)  # false accepts
    frr = jnp.mean(target_scores < thresh)     # false rejects
    fars.append(float(far))
    frrs.append(float(frr))

fars = jnp.array(fars)
frrs = jnp.array(frrs)

# Find EER: where FAR ≈ FRR
eer_idx = jnp.argmin(jnp.abs(fars - frrs))
eer = float((fars[eer_idx] + frrs[eer_idx]) / 2)
eer_threshold = float(thresholds[eer_idx])

print(f"Equal Error Rate (EER): {eer:.4f} ({eer*100:.2f}%)")
print(f"EER threshold: {eer_threshold:.4f}")

fig, axes = plt.subplots(1, 3, figsize=(18, 5))

# Score distributions
bins = jnp.linspace(-0.5, 1.0, 60)
axes[0].hist(target_scores, bins=bins, alpha=0.6, color='#27ae60',
             label='Target (same speaker)', density=True)
axes[0].hist(impostor_scores, bins=bins, alpha=0.6, color='#e74c3c',
             label='Impostor (different speaker)', density=True)
axes[0].axvline(eer_threshold, color='#f39c12', linestyle='--', linewidth=2,
                label=f'EER threshold = {eer_threshold:.3f}')
axes[0].set_xlabel('Cosine Similarity Score')
axes[0].set_ylabel('Density')
axes[0].set_title('Score Distributions')
axes[0].legend()

# FAR vs FRR
axes[1].plot(thresholds, fars, color='#e74c3c', linewidth=2, label='FAR')
axes[1].plot(thresholds, frrs, color='#3498db', linewidth=2, label='FRR')
axes[1].axvline(eer_threshold, color='#f39c12', linestyle='--', linewidth=1.5)
axes[1].scatter([eer_threshold], [eer], color='#f39c12', s=100, zorder=5,
                label=f'EER = {eer:.4f}')
axes[1].set_xlabel('Threshold')
axes[1].set_ylabel('Error Rate')
axes[1].set_title('FAR and FRR vs Threshold')
axes[1].legend()

# DET curve (FAR vs FRR)
axes[2].plot(fars, frrs, color='#9b59b6', linewidth=2)
axes[2].plot([0, 1], [0, 1], 'k--', alpha=0.3)
axes[2].scatter([eer], [eer], color='#f39c12', s=100, zorder=5,
                label=f'EER = {eer:.4f}')
axes[2].set_xlabel('False Acceptance Rate')
axes[2].set_ylabel('False Rejection Rate')
axes[2].set_title('DET Curve')
axes[2].set_xlim([0, 0.5])
axes[2].set_ylim([0, 0.5])
axes[2].legend()
axes[2].set_aspect('equal')

plt.tight_layout()
plt.show()
```

- **任务 3: 音频频谱图补丁嵌入（AST 样式）。** 实现音频频谱图变换器中补丁提取和嵌入层，可视化如何将频谱图分词。

```python
import jax
import jax.numpy as jnp
import jax.random as jr
import matplotlib.pyplot as plt

# Generate a synthetic spectrogram (harmonic structure + noise)
def generate_spectrogram(key, n_time=128, n_freq=128):
    """Create a synthetic spectrogram with harmonic patterns."""
    k1, k2 = jr.split(key)
    spec = jr.normal(k1, (n_time, n_freq)) * 0.1

    # Add harmonic bands (simulating speech formants)
    for f0 in [15, 30, 45, 70]:
        width = 3
        envelope = jnp.exp(-0.5 * ((jnp.arange(n_freq) - f0) / width) ** 2)
        time_mod = 0.5 + 0.5 * jnp.sin(2 * jnp.pi * jnp.arange(n_time) / 40)
        spec += jnp.outer(time_mod, envelope)

    return jnp.clip(spec, 0, None)

key = jr.PRNGKey(42)
spectrogram = generate_spectrogram(key)
n_time, n_freq = spectrogram.shape

# Patch extraction parameters
patch_h = 16  # time
patch_w = 16  # frequency
stride_h = 16
stride_w = 16
embed_dim = 192  # ViT-Small dimension

n_patches_h = n_time // stride_h
n_patches_w = n_freq // stride_w
n_patches = n_patches_h * n_patches_w

print(f"Spectrogram: {n_time} x {n_freq}")
print(f"Patch size: {patch_h} x {patch_w}")
print(f"Number of patches: {n_patches_h} x {n_patches_w} = {n_patches}")

# Extract patches
def extract_patches(spec, patch_h, patch_w, stride_h, stride_w):
    """Extract non-overlapping patches from spectrogram."""
    patches = []
    positions = []
    for i in range(0, spec.shape[0] - patch_h + 1, stride_h):
        for j in range(0, spec.shape[1] - patch_w + 1, stride_w):
            patch = spec[i:i+patch_h, j:j+patch_w]
            patches.append(patch.flatten())
            positions.append((i, j))
    return jnp.stack(patches), positions

patches, positions = extract_patches(spectrogram, patch_h, patch_w, stride_h, stride_w)
print(f"Patches shape: {patches.shape}")  # (n_patches, patch_h * patch_w)

# Linear projection (patch embedding)
patch_dim = patch_h * patch_w
k1, k2 = jr.split(jr.PRNGKey(0))
W_embed = jr.normal(k1, (patch_dim, embed_dim)) * jnp.sqrt(2.0 / patch_dim)
b_embed = jnp.zeros(embed_dim)

# Learnable positional embeddings
pos_embed = jr.normal(k2, (n_patches + 1, embed_dim)) * 0.02  # +1 for CLS

# CLS token
cls_token = jnp.zeros((1, embed_dim))

# Forward pass
patch_tokens = patches @ W_embed + b_embed  # (n_patches, embed_dim)
tokens = jnp.concatenate([cls_token, patch_tokens], axis=0)  # (n_patches+1, embed_dim)
tokens = tokens + pos_embed  # Add positional embeddings

print(f"Token sequence shape: {tokens.shape}")
print(f"Each token has dimension: {embed_dim}")

# Visualisation
fig, axes = plt.subplots(2, 2, figsize=(14, 10))

# Original spectrogram with patch grid
axes[0, 0].imshow(spectrogram.T, aspect='auto', origin='lower', cmap='magma')
for i in range(0, n_time + 1, stride_h):
    axes[0, 0].axvline(i - 0.5, color='white', linewidth=0.5, alpha=0.5)
for j in range(0, n_freq + 1, stride_w):
    axes[0, 0].axhline(j - 0.5, color='white', linewidth=0.5, alpha=0.5)
axes[0, 0].set_title(f'Spectrogram with {patch_h}x{patch_w} Patch Grid')
axes[0, 0].set_xlabel('Time frame')
axes[0, 0].set_ylabel('Frequency bin')

# Individual patches visualised
n_show = min(16, n_patches)
patch_grid = patches[:n_show].reshape(n_show, patch_h, patch_w)
combined = jnp.concatenate([patch_grid[i] for i in range(min(8, n_show))], axis=1)
axes[0, 1].imshow(combined.T, aspect='auto', origin='lower', cmap='magma')
axes[0, 1].set_title(f'First {min(8, n_show)} Patches (concatenated)')
axes[0, 1].set_xlabel('Patch index (horizontal)')
axes[0, 1].set_ylabel('Frequency within patch')

# Token embeddings similarity matrix
token_norms = tokens / jnp.linalg.norm(tokens, axis=-1, keepdims=True)
sim = token_norms @ token_norms.T
im = axes[1, 0].imshow(sim, cmap='RdBu_r', vmin=-1, vmax=1)
axes[1, 0].set_title('Token Similarity Matrix (cosine)')
axes[1, 0].set_xlabel('Token index')
axes[1, 0].set_ylabel('Token index')
plt.colorbar(im, ax=axes[1, 0], fraction=0.046)

# Positional embedding similarity
pos_norms = pos_embed / jnp.linalg.norm(pos_embed, axis=-1, keepdims=True)
pos_sim = pos_norms @ pos_norms.T
im2 = axes[1, 1].imshow(pos_sim, cmap='RdBu_r', vmin=-1, vmax=1)
axes[1, 1].set_title('Positional Embedding Similarity')
axes[1, 1].set_xlabel('Position index')
axes[1, 1].set_ylabel('Position index')
plt.colorbar(im2, ax=axes[1, 1], fraction=0.046)

plt.tight_layout()
plt.show()
```

- **任务 4: 简单的 chromagram 计算用于和弦分析。** 从合成谐波信号计算并可视化 chromagram，演示音乐信息检索中使用的音级折叠方法。

```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

# Generate a synthetic musical signal: C major chord -> G major chord
sr = 16000
duration = 2.0
t = jnp.linspace(0, duration, int(sr * duration))

# C major (C4=261.6, E4=329.6, G4=392.0) for first half
# G major (G3=196.0, B3=246.9, D4=293.7) for second half
half = len(t) // 2

c_major = (0.5 * jnp.sin(2 * jnp.pi * 261.63 * t[:half]) +
           0.4 * jnp.sin(2 * jnp.pi * 329.63 * t[:half]) +
           0.3 * jnp.sin(2 * jnp.pi * 392.00 * t[:half]))

g_major = (0.5 * jnp.sin(2 * jnp.pi * 196.00 * t[:half]) +
           0.4 * jnp.sin(2 * jnp.pi * 246.94 * t[:half]) +
           0.3 * jnp.sin(2 * jnp.pi * 293.66 * t[:half]))

signal = jnp.concatenate([c_major, g_major])

# Compute STFT
n_fft = 4096  # high resolution for pitch accuracy
hop_length = 512
window = jnp.hanning(n_fft)

def stft(signal, n_fft, hop_length, window):
    n_frames = 1 + (len(signal) - n_fft) // hop_length
    frames = jnp.stack([
        signal[i * hop_length : i * hop_length + n_fft] * window
        for i in range(n_frames)
    ])
    return jnp.fft.rfft(frames, n=n_fft)

S = stft(signal, n_fft, hop_length, window)
power_spec = jnp.abs(S) ** 2
freqs = jnp.fft.rfftfreq(n_fft, 1.0 / sr)

# Compute chromagram by mapping frequency bins to pitch classes
# MIDI note number from frequency: 69 + 12 * log2(f / 440)
note_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

def freq_to_chroma(freq):
    """Map frequency to pitch class (0-11). Returns -1 for freq <= 0."""
    midi = 69 + 12 * jnp.log2(jnp.clip(freq, 1e-10, None) / 440.0)
    return jnp.round(midi).astype(int) % 12

# Build chromagram: sum power spectrum energy for each pitch class
chromagram = jnp.zeros((power_spec.shape[0], 12))
valid_freqs = freqs[1:]  # skip DC
valid_power = power_spec[:, 1:]

for p in range(12):
    # Find frequency bins belonging to this pitch class
    chroma_bins = freq_to_chroma(valid_freqs)
    mask = (chroma_bins == p).astype(jnp.float32)
    chromagram = chromagram.at[:, p].set(
        jnp.sum(valid_power * mask[None, :], axis=1)
    )

# Normalise each frame
chromagram = chromagram / (jnp.max(chromagram, axis=1, keepdims=True) + 1e-8)

# Visualisation
fig, axes = plt.subplots(3, 1, figsize=(14, 10))

# Waveform
axes[0].plot(t[:3000], signal[:3000], color='#3498db', linewidth=0.5,
             label='C major')
axes[0].plot(t[half:half+3000], signal[half:half+3000], color='#e74c3c',
             linewidth=0.5, label='G major')
axes[0].set_title('Waveform: C major → G major')
axes[0].set_ylabel('Amplitude')
axes[0].set_xlabel('Time (s)')
axes[0].legend()

# Spectrogram (log scale)
time_axis = jnp.arange(power_spec.shape[0]) * hop_length / sr
axes[1].imshow(jnp.log1p(power_spec[:, :500].T), aspect='auto', origin='lower',
               cmap='magma', extent=[0, time_axis[-1], 0, freqs[500]])
axes[1].set_title('Power Spectrogram')
axes[1].set_ylabel('Frequency (Hz)')
axes[1].set_xlabel('Time (s)')

# Chromagram
im = axes[2].imshow(chromagram.T, aspect='auto', origin='lower', cmap='YlOrRd',
                     extent=[0, time_axis[-1], -0.5, 11.5])
axes[2].set_yticks(range(12))
axes[2].set_yticklabels(note_names)
axes[2].set_title('Chromagram (pitch class energy over time)')
axes[2].set_ylabel('Pitch class')
axes[2].set_xlabel('Time (s)')
plt.colorbar(im, ax=axes[2], fraction=0.046, label='Normalised energy')

# Mark expected active pitch classes
mid_frame = chromagram.shape[0] // 2
print(f"C major region - expected: C, E, G")
print(f"  Chroma values: {dict(zip(note_names, [f'{v:.2f}' for v in chromagram[mid_frame//2]]))}")
print(f"G major region - expected: G, B, D")
print(f"  Chroma values: {dict(zip(note_names, [f'{v:.2f}' for v in chromagram[mid_frame + mid_frame//2]]))}")

plt.tight_layout()
plt.show()
```
