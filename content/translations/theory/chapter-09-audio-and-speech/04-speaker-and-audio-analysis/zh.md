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
# 说话人与音频分析

*说话人与音频分析回答“谁在说话、何时说话，以及音频中还有哪些非语音声音”。本篇介绍说话人验证与识别、i-vector、d-vector、x-vector、说话人分离、音频事件分类、音乐信息检索和语音情感识别。*

- 文件 01 建立了信号处理基础：频谱图、MFCC 和梅尔滤波器组；文件 02 识别“说了什么”。现在进一步问“谁说的、何时说的，以及音频里还发生了什么”。说话人识别、分离、音频分类和音乐分析有共同主线：学习能捕获任务所需不变性的紧凑嵌入，这呼应第 06 章的嵌入思想。

- 识别说话人就像在电话里听出朋友的声音：不必听懂词义，音色、节奏和发声质量中的某些特征对这个人独一无二。说话人识别系统正是从原始音频提取这种“声纹”，忽略说了什么，关注怎么说。

- **说话人识别**是两个相关任务的总称：
    - **说话人验证**（SV）：给定声称的身份和一段音频，判断说话人是否确实是该身份。这是接受/拒绝的二元决策，也是语音认证（“Hey Siri，这是我的声音吗？”）背后的技术。
    - **说话人识别**（SI）：给定音频和已知说话人库，判断是哪位说话人产生了这段音频。这是多分类问题。

![说话人验证：注册音频和测试音频分别嵌入，计算余弦相似度，再用阈值决定接受或拒绝](../images/speaker_verification.svg)

- 两个任务共享同一种底层表示：定维度的**说话人嵌入**，无论说什么都能捕获身份。区别只在决策阶段：验证比较两个嵌入，识别则在候选中寻找最近的嵌入。

- **余弦相似度**是比较说话人嵌入的标准指标。给定注册嵌入 $e$ 和测试嵌入 $t$：

$$s = \frac{e \cdot t}{\|e\| \, \|t\|}$$

- 阈值 $\theta$ 决定接受/拒绝：若 $s > \theta$ 则接受。阈值在**误接受率（FAR）**与**误拒绝率（FRR）**之间权衡。FAR = FRR 时的**等错误率（EER）**是标准评估指标，EER 越低越好。当前最先进系统在 VoxCeleb 等基准上的 EER 已低于 1%。

- **i-vector**（Dehak 等，2010）是深度学习之前的主流说话人嵌入。其思想来自因子分析（第 02 章的矩阵分解和第 04 章的降维）。在多说话人数据上训练的大型 GMM **通用背景模型（UBM）**定义超向量空间，每段语音的 GMM 超向量被投影到低维的**总变异空间**：

$$M = m + Tw$$

- 其中 $M$ 是该语句的 GMM 超向量，$m$ 是 UBM 的均值超向量，$T$ 是从数据学习的总变异矩阵，$w$ 是 i-vector，通常为 400–600 维，同时编码说话人与信道变化。

- 为从 i-vector 中移除信道变化，**概率线性判别分析（PLDA）**把 i-vector 建模为说话人特定和信道特定潜变量之和，并为验证提供有原则的对数似然比得分：

$$\text{score}(w_1, w_2) = \log \frac{P(w_1, w_2 \mid \text{same speaker})}{P(w_1 \mid \text{speaker}_1) \, P(w_2 \mid \text{speaker}_2)}$$

- **d-vector**（Variani 等，2014）是最早的神经说话人嵌入。用于说话人分类的 DNN 处理帧级特征，再对整段语句所有帧的最后隐藏层激活求平均，得到定维表示。它简单有效，证明神经网络无需 i-vector 的复杂统计机制也能学习区分说话人的特征。

- **x-vector**（Snyder 等，2018）用**时间延迟神经网络（TDNN）**显著推进了神经说话人嵌入。TDNN 是每层使用特定上下文窗口的一维卷积，与文件 03 中 WaveNet 的膨胀卷积相关，但处理的是帧级特征而非原始波形采样。

![x-vector 架构：TDNN 层以递增上下文处理帧特征，统计池化聚合时间维，随后全连接层产生说话人嵌入](../images/xvector_architecture.svg)

- x-vector 架构分三阶段：
    - **帧级层**：TDNN 堆栈处理 MFCC（文件 01），逐层扩大时间上下文。每层看到固定窗口，例如第一层为 $\{t-2, t-1, t, t+1, t+2\}$，后续层更宽。
    - **统计池化**：帧级层之后，对整段语句的帧输出计算均值和标准差，得到与语句长度无关的定维向量：

```math
\begin{aligned}
\mu &= \frac{1}{T} \sum_{t=1}^{T} h_t \\
\sigma &= \sqrt{\frac{1}{T} \sum_{t=1}^{T} (h_t - \mu)^2}
\end{aligned}
```

-     其中 $h_t$ 是时刻 $t$ 的帧级输出，拼接 $[\mu; \sigma]$ 即为池化表示。
    - **段级层**：全连接层处理池化表示；第一个段级层（softmax 之前）的输出就是 x-vector 嵌入。

- x-vector 用说话人身份上的标准交叉熵损失训练。虽然训练目标是分类，但中间表示能泛化到未见过的说话人，因为网络学到的是区分说话人的特征，而不是记忆特定身份。

- **ECAPA-TDNN**（Desplanques 等，2020）是当前最先进的基于 TDNN 的说话人识别架构，在 x-vector 上加入三项改进：
    - **Squeeze-Excitation（SE）块**：利用全局上下文重新加权特征通道的通道注意力（第 08 章 SENet），突出与说话人相关的通道。
    - **Res2Net 式多尺度特征**：在每个 TDNN 块内把通道分组并分层处理，形成多个时间分辨率的特征，类似第 08 章的多尺度特征提取。
    - **注意力统计池化**：不再等权平均，而是用注意力为每帧对统计量的贡献加权。包含更多说话人信息的帧（例如元音）获得更高权重：

$$\alpha_t = \frac{\exp(v^T f(h_t))}{\sum_{\tau} \exp(v^T f(h_\tau))}$$

- 其中 $f$ 是小型神经网络，$v$ 是学习到的注意力向量。加权均值与标准差为 $\tilde{\mu} = \sum_t \alpha_t h_t$ 和 $\tilde{\sigma} = \sqrt{\sum_t \alpha_t (h_t - \tilde{\mu})^2}$。

- ECAPA-TDNN 通常使用 **AAM-Softmax**（加性角度间隔 Softmax）训练，在分类损失中加入角度间隔，把同一说话人的嵌入推得更近、不同说话人的嵌入推得更远：

$$L = -\log \frac{e^{s \cos(\theta_{y_i} + m)}}{e^{s \cos(\theta_{y_i} + m)} + \sum_{j \neq y_i} e^{s \cos \theta_j}}$$

- 其中 $\theta_{y_i}$ 是嵌入与真实类别权重向量的夹角，$m$ 是间隔（通常 0.2），$s$ 是缩放因子（通常 30）。该损失源于人脸识别的 ArcFace（第 08 章），对说话人验证非常有效。

- **说话人分离**回答多说话人录音中的“谁在什么时候说话”。可以把它想成给时间线涂色：每种颜色代表一位说话人，系统要标出各人何时活跃，包括重叠说话。

![说话人分离：音频时间线被切分并标注说话人，展示轮流发言与重叠区域](../images/speaker_diarisation.svg)

- **基于聚类的说话人分离**是传统流水线：
    - **分段**：用滑动窗口或说话人切换检测把音频分为短段（通常 1–2 秒）。
    - **嵌入提取**：为每段提取说话人嵌入（x-vector、ECAPA-TDNN）。
    - **聚类**：按说话人分组。标准方法是**凝聚层次聚类（AHC）**：从每段各自成簇开始，反复合并最相似的两个簇，直到达到距离阈值或目标说话人数。
    - **重新分段**：用基于 Viterbi 的重新对齐细化边界。

- 说话人数通常事先未知，因此比标准聚类更难。谱聚类也很常见，可用基于特征值的阈值决定 $k$。

- **端到端神经说话人分离（EEND）**（Fujita 等，2019）把分离看作多标签分类：神经网络（通常是第 07 章的自注意力 Transformer）接收整段录音，在每帧为每位说话人输出二元活动标签。它直接处理重叠语音，弥补了聚类方法的主要弱点。

- 对 $S$ 位说话人，时刻 $t$ 的 EEND 输出为：

$$\hat{y}_{t,s} = \sigma(f_s(h_t))$$

- 其中 $h_t$ 是时刻 $t$ 的 Transformer 输出，$f_s$ 是说话人 $s$ 的线性投影。训练损失是对说话人与帧求和的二元交叉熵。挑战在于说话人数必须固定，或使用可变输出架构（EEND-EDA 用带 attractor 的编码器—解码器）。

- 说话人分离中的**置换不变训练（PIT）**处理标签歧义：说话人没有固有顺序，因此对所有说话人到输出的分配计算损失并取最小值（与文件 05 介绍的源分离 PIT 相同）。

- **音频分类**为整段音频分配标签。不同于转写语音的 ASR（文件 02），音频分类覆盖更广：环境声（警笛、雨、狗叫）、音乐流派（摇滚、爵士、古典）和一般音频事件。

- 标准方法遵循第 08 章图像分类范式：把音频表示为频谱图（二维时频图像），再用 CNN 或 Transformer 分类器。频谱图像方法借用了计算机视觉数十年的进展。

- **环境声音分类（ESC）**使用 ESC-50（50 类、2000 段）和 UrbanSound8K 等数据集。典型架构是在对数梅尔频谱图上运行 CNN（第 06 章）。数据增强至关重要：时间伸缩、变调、加入背景噪声和 **SpecAugment**（把文件 02 的遮蔽方法用于频谱图）都能提升泛化。

- **音频事件检测**（Sound Event Detection，SED）是分类的时间版本：不仅要判断有哪些事件，还要判断起止时刻。**AudioSet**（Gemmeke 等，2017）是大规模基准，含 527 类、超过 200 万段 10 秒 YouTube 音频，每段只有片段级弱标签而非帧级标签。

- **弱监督 SED**必须从片段级标签学习帧级预测。标准方法用 CNN 生成帧级类别概率，再通过注意力池化聚合为片段级预测：

$$\hat{Y}_c = \sigma\left(\sum_t \alpha_{t,c} \cdot f_{t,c}\right)$$

- 其中 $f_{t,c}$ 是时刻 $t$ 类别 $c$ 的帧级 logit，$\alpha_{t,c}$ 是注意力权重。片段级预测 $\hat{Y}_c$ 用片段标签监督训练。

- **声学场景分类（ASC）**对整体环境分类，如“机场”“公园”“地铁站”“办公室”。这是整体性任务：模型要捕获一般声学纹理，而非某个具体事件。DCASE 系列每年进行基准评测，获胜系统通常在多分辨率频谱图上集成多个 CNN。

- **音频嵌入**是从大规模音频数据学习的通用表示，类似第 07 章的词嵌入或第 08 章的图像特征，可迁移到下游任务。

- **VGGish**（Hershey 等，2017）把 VGG 图像分类网络（第 08 章）改用于音频。它将 0.96 秒的对数梅尔频谱图块输入在 AudioSet 上预训练的 VGG 式 CNN，每块产生 128 维嵌入。VGGish 嵌入可作为下游任务的通用音频特征，类似 ImageNet 预训练 CNN 的作用。

- **PANNs**（预训练音频神经网络，Kong 等，2020）是一组在完整 AudioSet 上训练的 CNN（CNN6、CNN10、CNN14），用于音频标注。最常用的 CNN14 是 14 层 CNN，在对数梅尔频谱图上使用 $3 \times 3$ 卷积，产生 2048 维嵌入，在多种音频任务迁移学习中达到 SOTA。

- **音频频谱 Transformer（AST）**（Gong 等，2021）直接把视觉 Transformer（ViT，第 08 章）用于音频频谱图。频谱图切成 $16 \times 16$ 图块，每块线性投影为 token 嵌入并加位置嵌入，再由标准 Transformer 编码器（第 07 章）处理序列，用 [CLS] 输出分类。

![Audio Spectrogram Transformer：梅尔频谱图切成图块，展平后线性投影为 token，加位置嵌入，经 Transformer 编码器由 CLS token 输出分类](../images/audio_spectrogram_transformer.svg)

- AST 受益于 **ImageNet 预训练**：频谱图是二维图像，因此可从 ImageNet 预训练的 ViT 初始化，再在音频上微调。跨模态迁移之所以有效，是因为两个领域共享边缘、纹理等低层特征，且位置嵌入可插值以适配不同频谱图尺寸。

- **HTS-AT**（Chen 等，2022）用层次化 Swin Transformer（第 08 章的移位窗口注意力）改进 AST，通过多尺度特征提取降低计算量并提升性能。

- **BEATs**（Chen 等，2023）采用音频专用预训练：结合离散 token 化器进行迭代遮蔽预测（类似文件 02 的 wav2vec 2.0，但面向一般音频）。token 化器逐步改进，产生越来越有语义的离散音频 token。

- **结合嵌入的说话人分离**把说话人嵌入与时间建模结合起来。Pyannote.audio 等现代系统使用三阶段流水线：(1) 神经分段模型检测说话人轮次和重叠语音；(2) 对每个检测片段用 ECAPA-TDNN 提取嵌入；(3) 聚类，将身份分配到整段录音。

- **音乐信息检索（MIR）**把音频分析应用于音乐。文件 01 的频谱表示尤其有用，因为音乐具有丰富的谐波结构。

- **节拍跟踪**检测音乐的节奏脉冲。标准流程从频谱图计算**起音强度包络**（检测表示音符起始的能量上升），再用自相关或 tempogram 找到速度，最后用动态规划在保持速度一致的同时寻找最符合起音包络的节拍时刻序列。

- **和弦识别**识别随时间变化的和声内容。输入通常是**色度图**（pitch class profile）：把所有八度折叠到一起的 12 维表示，显示 12 个音级（C、C#、D、…、B）的能量。CNN 或 RNN（第 06 章）将每帧分类为标准和弦标签（C 大调、A 小调、G7 等）。

- 色度图由 STFT（文件 01）计算，将每个频率 bin 映射到其音级：

$$\text{chroma}(p) = \sum_{k : \text{pitch}(k) \bmod 12 = p} |X(k)|^2$$

- 其中 $p \in \{0, 1, \ldots, 11\}$ 是音级，$\text{pitch}(k)$ 把频率 bin $k$ 映射到 MIDI 音符编号。

- **源分离基础**（文件 05 详述）把音乐录音分成独立乐器（人声、鼓、贝斯、其他）。这是混音、卡拉 OK 和音乐转写等 MIR 应用的核心。Demucs（文件 05）在 MUSDB18 基准上实现了出色的分离质量。

- **音乐标注**为歌曲分配标签（流派、情绪、乐器、年代），本质上是用于音乐的音频分类，采用相同的“频谱图上运行 CNN”方法。Million Song Dataset 和 MagnaTagATune 是标准基准。

- **音频指纹**从短片段识别具体录音，即使存在噪声、混响或压缩伪影。经典系统 Shazam 对频谱图中的显著峰值（星座点）做哈希。神经方法学习对声学退化不变、又能区分不同录音的鲁棒嵌入，延续第 06、08 章的不变特征学习思想。

## 编程任务（使用 Colab 或 notebook）

- **任务 1：带统计池化的说话人嵌入提取。** 构建简单的 x-vector 风格模型，用 TDNN 层和统计池化处理帧级特征，生成说话人嵌入。

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

- **任务 2：使用余弦相似度评分的说话人验证。** 给定预计算的说话人嵌入，实现验证系统，计算 EER（等错误率）并绘制 DET 曲线。

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

- **任务 3：音频频谱图图块嵌入（AST 风格）。** 实现 Audio Spectrogram Transformer 的图块提取和嵌入层，可视化频谱图如何被 token 化。

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

- **任务 4：用于和弦分析的简单色度图计算。** 从合成谐波信号计算并可视化色度图，展示音乐信息检索中的音级折叠。

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
