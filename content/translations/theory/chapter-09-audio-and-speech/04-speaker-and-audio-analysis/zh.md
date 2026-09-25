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
# 说话人识别与音频分析

*说话人和音频分析回答三个问题：谁在说话、何时发言，以及音频中还有哪些非语音声音。本文介绍说话人验证与辨认、i-vector、d-vector、x-vector、说话人分段、音频事件分类、音乐信息检索和语音情绪识别。*

- 文件 01 介绍了频谱图、MFCC 和梅尔滤波器组等信号处理基础；文件 02 则从语音中识别说了什么。接下来，我们要判断谁在说话、何时发言，以及音频中还发生了什么。说话人识别、说话人分段、音频分类和音乐分析都依赖紧凑的嵌入表示，让模型保留当前任务需要的不变特征。这与第 06 章介绍的嵌入思想相通。

- 通过电话辨认朋友的声音时，你不必听懂每个词。音色、语速和发声特点通常能让你认出对方。说话人识别系统也会从原始音频中提取这类“声纹”，尽量忽略说话内容，关注声音特征。

- **说话人识别**统称两项相关任务：
  - **说话人验证**（SV）：给定一个声称的身份和一段音频，判断说话者是否为其所声称的人。这是接受或拒绝的二元判断，也是语音身份验证（例如“嘿 Siri，这是我的声音吗？”）背后的技术。
  - **说话人辨认**（SI）：给定一段音频和一组已知说话人，判断录音中是谁在说话。这是多分类任务。

![说话人验证流程：系统分别提取注册语音和测试语音的嵌入，计算余弦相似度，再依据阈值决定接受或拒绝](../images/speaker_verification.svg)

- 两项任务都使用固定维度的**说话人嵌入**表示身份，不受说话内容影响。区别在于决策方式：验证比较两个嵌入；辨认则从候选人中找出嵌入最接近的一位。

- **余弦相似度**常用于比较说话人嵌入。给定注册嵌入 $e$ 和测试嵌入 $t$：

$$s = \frac{e \cdot t}{\|e\| \, \|t\|}$$

- 阈值 $\theta$ 决定是否接受身份声明：当 $s > \theta$ 时接受。调整阈值会改变**误接受率**（FAR）和**误拒绝率**（FRR）。FAR 与 FRR 相等时的**等错误率**（EER）是常用评估指标；EER 越低，系统表现越好。标准基准（如 VoxCeleb）上的先进系统，EER 可低于 1%。

- **i-vector**（Dehak 等，2010）是深度学习兴起前常用的说话人嵌入。它的思路来自因子分析（第 02 章的矩阵分解和第 04 章的降维）。**通用背景模型**（UBM）是用多种说话人数据训练的大型 GMM，用来定义超向量空间。系统把每段语音的 GMM 超向量投影到低维的**总变异空间**：

$$M = m + Tw$$

- $M$ 是该语音的 GMM 超向量，$m$ 是 UBM 的均值超向量，$T$ 是从数据中学习到的总变异矩阵，$w$ 是 i-vector。i-vector 通常有 400–600 维，同时编码说话人差异和信道差异。

- 为了从 i-vector 中分离信道差异，**概率线性判别分析**（PLDA）把 i-vector 表示为说话人相关和信道相关潜变量之和。PLDA 会为说话人验证计算有统计依据的对数似然比：

$$\text{score}(w_1, w_2) = \log \frac{P(w_1, w_2 \mid \text{same speaker})}{P(w_1 \mid \text{speaker}_1) \, P(w_2 \mid \text{speaker}_2)}$$

- **d-vector**（Variani 等，2014）是早期的神经说话人嵌入。系统在帧级特征上训练 DNN 做说话人分类，再对一段语音中所有帧的最后一层隐藏激活取平均，得到固定维度的表示。d-vector 方法简单有效，说明神经网络不需要 i-vector 那套复杂统计建模，也能学到区分说话人的特征。

- **x-vector**（Snyder 等，2018）借助**时间延迟神经网络**（TDNN）推进了神经说话人嵌入的发展。TDNN 是一维卷积网络，各层使用不同的上下文窗口。它与文件 03 中 WaveNet 的空洞卷积思路相关，但处理的是帧级特征，而非原始波形。

![x-vector 架构：TDNN 逐层扩大帧级特征的上下文，统计池化汇总时间维信息，全连接层生成说话人嵌入](../images/xvector_architecture.svg)

- x-vector 架构分为三个阶段：
  - **帧级层**：多层 TDNN 处理 MFCC（见文件 01），逐步扩大时间上下文。每层读取一个固定窗口，例如第一层读取 $\{t-2, t-1, t, t+1, t+2\}$，后续层会使用更宽的窗口。
  - **统计池化**：帧级层处理完整语音后，系统计算所有帧输出的均值和标准差，形成不受语音时长影响的固定维度向量：

```math
\begin{aligned}
\mu &= \frac{1}{T} \sum_{t=1}^{T} h_t \\
\sigma &= \sqrt{\frac{1}{T} \sum_{t=1}^{T} (h_t - \mu)^2}
\end{aligned}
```

- $h_t$ 是时刻 $t$ 的帧级输出；拼接 $[\mu; \sigma]$ 得到池化表示。
  - **段级层**：全连接层处理池化表示。第一个段级层在 softmax 之前的输出，就是 x-vector 嵌入。

- x-vector 通常用说话人身份的交叉熵损失训练。虽然训练目标是分类，说话人嵌入仍能迁移到训练中未出现过的人，因为网络学会提取区分说话人的特征，而非记住训练集中的身份。

- **ECAPA-TDNN**（Desplanques 等，2020）是当时先进的 TDNN 说话人识别架构，主要改进包括：
  - **压缩—激励**（SE）模块：借鉴第 08 章 SENet 的通道注意力，依据全局上下文重新调整各特征通道的权重，突出与说话人相关的通道。
  - **Res2Net 式多尺度特征**：每个 TDNN 块把通道分组并分层处理，从而获得不同时间尺度的特征，类似第 08 章的多尺度特征提取。
  - **注意力统计池化**：注意力机制为每帧分配不同权重，而不是对所有帧等权平均。包含较多说话人信息的帧（例如元音）会获得较高权重：

$$\alpha_t = \frac{\exp(v^T f(h_t))}{\sum_{\tau} \exp(v^T f(h_\tau))}$$

- $f$ 是一个小型神经网络，$v$ 是学习得到的注意力向量。加权均值和标准差分别为 $\tilde{\mu} = \sum_t \alpha_t h_t$ 和 $\tilde{\sigma} = \sqrt{\sum_t \alpha_t (h_t - \tilde{\mu})^2}$。

- ECAPA-TDNN 通常使用 **AAM-Softmax**（加性角度间隔 Softmax）训练。它在分类损失中加入角度间隔，让同一说话人的嵌入在超球面上更接近，让不同说话人的嵌入更远：

$$L = -\log \frac{e^{s \cos(\theta_{y_i} + m)}}{e^{s \cos(\theta_{y_i} + m)} + \sum_{j \neq y_i} e^{s \cos \theta_j}}$$

- $\theta_{y_i}$ 是嵌入与真实类别权重向量之间的夹角；$m$ 是间隔，通常取 0.2；$s$ 是缩放因子，通常取 30。该损失借鉴第 08 章人脸识别中的 ArcFace，适用于说话人验证。

- **说话人分段**回答多说话人录音中的“谁在何时说话”。可以把它想成给时间轴分配颜色：每种颜色代表一位说话人，系统要标出其发言时段，也要识别说话重叠的区间。

![说话人分段结果：时间轴被切分并标注说话人身份，显示轮流发言和重叠区间](../images/speaker_diarisation.svg)

- **基于聚类的说话人分段**是传统处理流程：
  - **分段**：用滑动窗口或说话人变化检测，把音频切成短片段，通常每段 1–2 秒。
  - **嵌入提取**：为每段提取说话人嵌入，例如 x-vector 或 ECAPA-TDNN。
  - **聚类**：按说话人归组。常用**凝聚层次聚类**（AHC）：先让每段各自成簇，再不断合并最相似的簇，直到达到距离阈值或目标说话人数。
  - **重新分段**：用基于维特比算法的重新对齐细化边界。

- 录音中的说话人数通常事先未知，因此这个任务比标准聚类更难。另一种常见方法是谱聚类，再用基于特征值的阈值估计簇数 $k$。

- **端到端神经说话人分段**（EEND，Fujita 等，2019）把分段任务建模为多标签分类。神经网络（通常是第 07 章介绍的 Transformer 等自注意力模型）读取整段录音，并逐帧输出各说话人的二元活动标签。它可以直接处理说话重叠，这是聚类流程的主要弱点。

- 对 $S$ 位说话人，EEND 在第 $t$ 帧的输出为：

$$\hat{y}_{t,s} = \sigma(f_s(h_t))$$

- $h_t$ 是 Transformer 在第 $t$ 帧的输出；$f_s$ 是针对说话人 $s$ 的线性投影。训练损失是对所有说话人和帧求和的二元交叉熵。训练时必须固定说话人数，或采用可变输出结构；例如 EEND-EDA 使用带吸引器的编码器—解码器。

- **排列不变训练**（PIT）解决说话人标签顺序不确定的问题。由于说话人没有固定顺序，系统会尝试所有说话人到输出的对应方式，并选取损失最低的排列。文件 05 介绍了源分离中的同类 PIT 方法。

- **音频分类**为整段音频分配类别。与转录语音的 ASR（见文件 02）不同，音频分类还处理环境声（警笛、雨声、狗叫）、音乐流派（摇滚、爵士、古典）和其他音频事件。

- 常见方法沿用第 08 章的图像分类思路：把音频转成频谱图这一时频二维表示，再用 CNN 或 Transformer 分类。这样可以借用计算机视觉领域积累的模型和方法。

- **环境声分类**（ESC）使用 ESC-50（50 类、2,000 段音频）和 UrbanSound8K 等数据集。常见架构是第 06 章介绍的 CNN，输入为对数梅尔频谱图。数据增强也很重要：时间拉伸、音高偏移、添加背景噪声，以及把文件 02 的掩码方法用于频谱图的 **SpecAugment**，都能提升泛化能力。

- **音频事件检测**（声音事件检测，SED）不仅判断有哪些事件，还要标出它们的起止时间。**AudioSet**（Gemmeke 等，2017）是大型基准数据集，包含 527 类事件和超过 200 万段来自 YouTube 的 10 秒音频。数据只有弱标签：标签对应整段音频，而不是逐帧标注。

- **弱监督声音事件检测**要从整段音频的标签学习逐帧预测。常见做法是用 CNN 生成每帧的类别概率，再通过注意力池化汇总成整段音频的预测：

$$\hat{Y}_c = \sigma\left(\sum_t \alpha_{t,c} \cdot f_{t,c}\right)$$

- $f_{t,c}$ 是时刻 $t$ 的帧级 logit，表示类别 $c$ 的预测；$\alpha_{t,c}$ 是注意力权重；整段音频的预测 $\hat{Y}_c$ 根据片段级标签训练。

- **声学场景分类**（ASC）识别整体环境，例如机场、公园、地铁站或办公室。模型要捕捉环境的整体声学纹理，而不是某个具体事件。DCASE 系列挑战每年都会评测 ASC；表现靠前的系统通常会集成处理多分辨率频谱图的 CNN。

- **音频嵌入**是从大规模音频数据中学到的通用表示，与第 07 章的词嵌入、第 08 章的图像特征类似，可以迁移到下游任务。

- **VGGish**（Hershey 等，2017）把第 08 章的 VGG 图像分类网络用于音频。它把 0.96 秒的对数梅尔频谱图切片输入在 AudioSet 上预训练的 VGG 类 CNN，每片生成一个 128 维嵌入。VGGish 嵌入可以作为下游任务的通用音频特征，类似于 ImageNet 预训练 CNN 提供的视觉特征。

- **预训练音频神经网络**（PANNs，Kong 等，2020）是一组在完整 AudioSet 上进行音频标注训练的 CNN 架构，包括 CNN6、CNN10 和 CNN14。常用的 CNN14 有 14 层，对数梅尔频谱图经过 $3 \times 3$ 卷积。PANNs 会生成 2,048 维嵌入，在多种音频任务上取得先进的迁移学习效果。

- **音频频谱图 Transformer**（AST，Gong 等，2021）把第 08 章的视觉 Transformer（ViT）直接用于音频频谱图。模型把频谱图切成 $16 \times 16$ 的图块，展平每块并线性投影为词元嵌入，再加入位置嵌入，由第 07 章介绍的标准 Transformer 编码器处理。分类时使用 [CLS] 词元的输出。

![音频频谱图 Transformer：梅尔频谱图被切成图块，各图块展平并线性投影为词元，加入位置嵌入后交给 Transformer 编码器，通过 CLS 词元输出分类结果](../images/audio_spectrogram_transformer.svg)

- AST 可以利用 **ImageNet 预训练**：频谱图也是二维图像，所以模型可从 ImageNet 预训练的 ViT 初始化，再用音频数据微调。两种模态共享边缘、纹理等底层特征；位置嵌入也可以插值，以适应尺寸不同的频谱图，因此这种跨模态迁移效果很好。

- **HTS-AT**（Chen 等，2022）在 AST 基础上采用分层 Swin Transformer（见第 08 章的移位窗口注意力），用多尺度特征提取提升性能并减少计算量。

- **BEATs**（Chen 等，2023）使用面向音频的预训练方法：模型通过离散词元化器进行迭代掩码预测，思路与文件 02 的 wav2vec 2.0 相似，但用于一般音频。词元化器逐步改进后，会生成语义信息更丰富的离散音频词元。

- **结合嵌入的说话人分段**把说话人嵌入与时间建模结合起来。Pyannote.audio 等现代系统通常分三步处理：先用神经分段模型检测说话人轮次和重叠语音；再为检测到的片段提取嵌入（例如 ECAPA-TDNN）；最后用聚类把说话人身份对应到整段录音。

- **音乐信息检索**（MIR）把音频分析方法用于音乐。文件 01 介绍的频谱表示在这里很有用，因为音乐具有丰富的谐波结构。

- **节拍跟踪**检测音乐的节奏脉动。系统先从频谱图计算**起音强度包络**，找出可能对应音符起始的能量变化；再用自相关或节拍速度图估计速度；最后通过动态规划寻找与起音强度包络相符、同时保持速度平稳的拍点序列。

- **和弦识别**追踪音乐随时间变化的和声。输入通常是**音级色度图**（chromagram，也称音级轮廓），这是一个 12 维表示：它把各八度折叠起来，记录 C、C♯、D 到 B 等 12 个音级的能量。CNN 或 RNN（见第 06 章）再把每帧分类为 C 大调、A 小调或 G7 等和弦。

- 系统从短时傅里叶变换（STFT，见文件 01）计算音级色度图：先把每个频率 bin 映射到对应音级，再汇总能量：

$$\text{chroma}(p) = \sum_{k : \text{pitch}(k) \bmod 12 = p} |X(k)|^2$$

- $p \in \{0, 1, \ldots, 11\}$ 表示音级；$\text{pitch}(k)$ 把频率 bin $k$ 映射到 MIDI 音符编号。

- **源分离基础**（详见文件 05）是把音乐录音拆分为人声、鼓、贝斯和其他乐器等音轨。这项技术可用于混音、卡拉 OK 和音乐转录。Demucs（见文件 05）在标准 MUSDB18 基准上能有效分离音源。

- **音乐标注**为歌曲分配流派、情绪、乐器和年代等标签。这相当于把音频分类用于音乐，常用方法仍是对频谱图应用 CNN。Million Song Dataset 和 MagnaTagATune 是常见基准。

- **音频指纹识别**根据短音频片段识别具体录音，即使片段带有噪声、混响或压缩失真也能识别。经典系统 Shazam 会对频谱图中显著峰值组成的星座点进行哈希。神经网络则学习对声学退化稳健的嵌入，同时区分不同录音；这与第 06、08 章讨论的不变特征学习相通。

## 编程任务（使用 Colab 或笔记本）

- **任务 1：使用统计池化提取说话人嵌入。** 构建一个简易 x-vector 模型，用 TDNN 层处理帧级特征，再通过统计池化生成说话人嵌入。

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

- **任务 2：用余弦相似度验证说话人。** 给定预先计算的说话人嵌入，实现验证系统，计算 EER（等错误率）并绘制检测误差权衡（DET）曲线。

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

- **任务 3：提取并嵌入 AST 风格的频谱图块。** 实现音频频谱图 Transformer 的图块提取和嵌入层，并展示模型如何把频谱图切分为词元。

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

- **任务 4：计算音级色度图并分析和弦。** 从合成的谐波信号计算并显示音级色度图，展示音乐信息检索如何把不同八度折叠到 12 个音级。

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
