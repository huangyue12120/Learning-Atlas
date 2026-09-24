---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 09 - audio and speech/05. source separation and noise.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 86b785f363688a327ea5106a34f91c22392aacd570ff5a4ea50fe590cff24703
status: reviewed
---
# 声音分离与噪声消除

*声音分离和噪声消除可以从混杂音频中恢复个体信号；计算鸡尾酒问题。本文件涵盖了ICA、NMF、时间频率掩码、定向发射、深度学习分离网络（Conv-TasNet、SepFormer）、语音增强以及自适应噪声消除等算法。*

- 想象一下站在一个拥挤的鸡尾酒会上，成百上千的人在同时说话，音乐在播放，杯子碰撞声此起彼伏，但你却能专注于一个对话并清晰地跟随它。这种令人惊叹的能力——**鸡尾酒问题**（Cherry, 1953）——是人类听觉系统 effortlessly解决的问题，但对于机器来说则异常困难。本文件涵盖了尝试解决这个问题的算法：分离混杂音频源、消除 unwanted噪声以及在不利条件下增强语音。

- 文件01（STFT、频谱图、滤波器组）为所有方法提供了信号处理基础。本章02（NMF、ICA、SVD）中的矩阵分解技术提供了一种经典的工具包。文件06（CNNs、RNNs、注意力机制）的深度学习架构和文件04/05的概率论为现代方法提供了信息。

![多声源混合问题：多个说话者和声音来源在麦克风阵列中混合，分离系统必须从混合中恢复每个源信号](../images/cocktail_party.svg)


- **问题定义**：在多个麦克风处观察到混合信号 $x(t)$。混合信号是 $C$ 源信号的简单和（最简单的情况）。

$$x(t) = \sum_{c=1}^{C} s_c(t) + n(t)$$
- $s_c(t)$ 是第 $c$ 个源信号，$n(t)$ 是背景噪声。目标是从 $x(t)$ 中恢复个体 $s_c(t)$。在单麦克风情况下，这个问题严重不足定：一个方程，$C$ 未知数。需要额外的假设（统计独立性、谱结构、学习先验）来使问题可处理。

- 在频域（通过文件01的STFT），混合体变为：

$$X(t, f) = \sum_{c=1}^{C} S_c(t, f) + N(t, f)$$
- 许多分离方法通过估计一个掩码在时频域工作。 $M_c(t, f) \in [0, 1]$ 对于每个源，然后恢复源。 $\hat{S}_c(t, f) = M_c(t, f) \cdot X(t, f)$理想二进制掩码（IBM）设置 $M_c(t, f) = 1$ 如果源 $c$ 在每个时间频率bin中，如果该bin的值大于等于1，则输出1；否则输出0。**理想比掩码（IRM）**是一种软版本：

$$\text{IRM}_c(t, f) = \frac{|S_c(t, f)|^2}{\sum_{j=1}^{C} |S_j(t, f)|^2}$$
- 独立成分分析（ICA）是当麦克风数量等于或超过源数量时的经典方法。ICA（第02章）找到一个线性解混矩阵$W$，使得$\hat{s} = Wx$，其中恢复的源信号$\hat{s}$尽可能地独立统计。关键假设是源信号是非高斯且独立的，通常适用于语音和音乐。

- 对于多麦克风瞬态混响模型 $x = As$（其中 $A$ 是混响矩阵），ICA 通过最大化输出的非 Gaussian 性能来恢复 $W \approx A^{-1}$（FastICA 使用负熵）。ICA 在受控环境中表现良好，但在涉及卷积（房间回声）时失败，在源数量超过麦克风数量或独立性假设被破坏时也失败。

- 非负矩阵分解（NMF）将幅度谱图$V \in \mathbb{R}_+^{F \times T}$分解为两个非负矩阵的乘积（第02章）。

$$V \approx WH$$
- 在 $W \in \mathbb{R}_+^{F \times K}$ 中，$K$ 是谱基向量的字典，$H \in \mathbb{R}_+^{K \times T}$ 包含时间上的激活系数。非负约束是物理上合理的：幅度是非负的，声音组合是加性的。

- 对于源分离，NMF学习每个源的独立字典：$W_{\text{speech}}$捕捉语音（形式结构）的谱模式，而$W_{\text{noise}}$捕捉噪声模式。混合体被分解为$V \approx W_{\text{speech}} H_{\text{speech}} + W_{\text{noise}} H_{\text{noise}}$，每个源通过掩码恢复。NMF使用Frobenius范数或KL散度作为成本函数进行最小化更新：

```math
\begin{aligned}
\text{Frobenius:} \quad D_F(V \| WH) &= \|V - WH\|_F^2 \\
\text{KL:} \quad D_{KL}(V \| WH) &= \sum_{f,t} \left[ V_{ft} \log \frac{V_{ft}}{(WH)_{ft}} - V_{ft} + (WH)_{ft} \right]
\end{aligned}
```

- **波束形成**利用麦克风阵列的空间信息。当一个源信号在不同麦克风处以不同的延迟到达（由于空间排列），这些延迟可以用来增强来自某个方向的信号，同时抑制其他方向的信号。

![波束形成：麦克风阵列接收来自不同方向的不同时间延迟的信号，并将它们组合起来以增强所需的方向，同时抑制其他方向](../images/beamforming.svg)


- **延迟和叠加波束形成**是最简单的方法。如果目标源相对于阵列的角度为 $\theta$，麦克风 $m$ 的时间延迟为 $\tau_m(\theta) = d_m \sin \theta / c$，其中 $d_m$ 是麦克风位置，$c$ 是声速。波束形成器的输出将对麦克风信号进行对齐和叠加：

$$y(t) = \frac{1}{M} \sum_{m=1}^{M} x_m(t - \tau_m(\theta))$$
- 目标方向的信号相加是相干的，而其他方向的信号相加是不相干的，从而实现空间滤波。阵列几何决定了空间分辨率：较大的阵列产生较窄的束。

- 最小方差失真无响应（MVDR）波束形成优化权重，以最小化总输出功率同时通过目标方向不失真。

```math
\begin{aligned}
\min_{\mathbf{w}} \quad & \mathbf{w}^H \Phi_{nn} \mathbf{w} \\
\text{subject to} \quad & \mathbf{w}^H \mathbf{d}(\theta) = 1
\end{aligned}
```

- $\Phi_{nn}$ 是噪声空间协方差矩阵，$\mathbf{d}(\theta)$ 是方向 $\theta$ 的指向矢量。封闭形式解为：

$$\mathbf{w}_{\text{MVDR}} = \frac{\Phi_{nn}^{-1} \mathbf{d}(\theta)}{\mathbf{d}(\theta)^H \Phi_{nn}^{-1} \mathbf{d}(\theta)}$$
- MVDR根据估计的噪声协方差进行调整，能够更好地抑制干扰，优于延迟和求和方法。它广泛应用于助听器、智能音箱和视频会议系统中。

- 深度学习在单麦克风分离任务上取得了显著的性能提升，尤其是在经典方法难以应对的情况下。一般范式是：编码混合信号，使用神经网络估计掩码或源表示，最后解码以恢复个体源。

- **深度聚类**（Hershey et al., 2016）将每个时间频率分量嵌入到一个高维空间中，使得属于同一源的分量彼此靠近，而来自不同源的分量则相隔较远。双向LSTM（第06章）将每个T-F分量$(t, f)$映射到一个嵌入$v_{t,f} \in \mathbb{R}^D$。训练目标是：

$$\mathcal{L} = \|VV^T - YY^T\|_F^2$$
- $V$ 是嵌入矩阵，$Y$ 是源分配的独热矩阵。乘积 $VV^T$ 是相似度矩阵（两个 bins 的嵌入之间的相似性），而 $YY^T$ 是理想相似度（相同源为 1，否则为 0）。在推理时，使用嵌入进行 K-means 聚类产生二进制掩码。

- **Conv-TasNet** (Luo and Mesgarani, 2019) 完全在时间域操作，绕过了 STFT。它有三个组件：

![Conv-Tasnet架构：编码器将混合波形转换为潜在表示，时序卷积网络分离器估计源掩码，解码器重建每个源波形](../images/conv_tasnet.svg)


- **编码器**：将混合波形的短段映射到潜在表示。对于混合 $x \in \mathbb{R}^T$，编码器输出为 $w = \text{ReLU}(U \ast x) \in \mathbb{R}^{N \times L}$，其中 $U$ 是可学习的基础（类似于 STFT 基础但从数据中学习），$N$ 是基础函数的数量，$L$ 是段数。编码器的核大小和步长（通常为 2ms 和 1ms）决定了时间分辨率。

- **分隔符**：一个 **时间卷积网络（TCN）** 处理编码的混合体，并输出 $C$ 掩码。 TCN 在块中堆叠指数递增膨胀因子 $1, 2, 4, \ldots, 2^{B-1}$ 的深度可分离 1D 卷积（如第 08 章中的高效卷积），重复 $R$ 次。这提供了非常大的感受野，同时保持了计算效率。

- 解码器：一个转置的1D卷积（使用学习到的基础 $V$）将每个掩码表示转换回时间域：$\hat{s}_c = V^T (M_c \odot w)$。

- Conv-Tasnet显著优于基于频谱的方法，因为学习到的编码器-解码器基础可以捕捉（特别是相位）STFT幅度丢弃的信息。

- **双路径RNN（DPRNN）**（Luo et al., 2020）在分离中解决了长序列建模问题。与单个RNN或TCN处理整个编码序列不同，DPRNN将序列分割成重叠的块，并在两个路径上应用RNN：一个内块路径（在每个块内建模局部模式），另一个跨块路径（在块之间建模全局模式）。这在每个维度中将RNN序列长度从$L$减少到$\sqrt{L}$。

```math
\begin{aligned}
\text{Intra-chunk:} \quad & h_{k,n}^{\text{intra}} = \text{BiLSTM}_{\text{intra}}(z_{k,n}) \\
\text{Inter-chunk:} \quad & h_{k,n}^{\text{inter}} = \text{BiLSTM}_{\text{inter}}(h_{k,n}^{\text{intra}})
\end{aligned}
```

- 哪里 $k$ 索引块 $n$ 在每个块中索引位置。块内LSTM在块内部进行跨处理。 $n$ 固定 $k$跨块LSTM处理 $k$ 固定 $n$当然，请提供您需要翻译的英文文本。

- SepFormer（Subakan et al., 2021）用transformers取代了双路径框架中的RNNs。 intra-chunk transformer捕捉局部依赖关系，inter-chunk transformer捕捉全局依赖关系。多头注意力的能力在不出现梯度消失问题的情况下能够建模长距离依赖关系，这使得SepFormer特别适用于长录音。SepFormer在WSJ0-2mix基准测试中取得了最先进的结果。

- **排列不变训练（PIT）**解决了监督源分离中的一个基本问题：标签分配的模糊性。如果网络有两个输出（两个说话者），哪个输出应该对应于哪个说话者？没有自然顺序。PIT计算所有可能的分配损失，并取最小值：

$$\mathcal{L}_{\text{PIT}} = \min_{\pi \in \mathcal{P}} \sum_{c=1}^{C} \ell(\hat{s}_{\pi(c)}, s_c)$$
- $\mathcal{P}$ 是所有 $\{1, \ldots, C\}$ 和 $\ell$ 的排列集合。对于 $C = 2$ 源，只有 2 种排列；对于 $C = 3$ 源，有 6 种。这使用匈牙利算法高效计算，适用于较大的 $C$。

- **Scale-Invariant Signal-to-Distortion Ratio (SI-SDR)** 是源分离的标准评估指标：

```math
\begin{aligned}
s_{\text{target}} &= \frac{\langle \hat{s}, s \rangle}{\|s\|^2} s \\
e_{\text{noise}} &= \hat{s} - s_{\text{target}} \\
\text{SI-SDR} &= 10 \log_{10} \frac{\|s_{\text{target}}\|^2}{\|e_{\text{noise}}\|^2}
\end{aligned}
```

- 其中 $\hat{s}$ 为估计的源，$s$ 为真实值。 SI-SDR 对估计的整体尺度是不变的，这在理想情况下是 desirable的，因为绝对音量的重要性不如分离的质量。更高的 SI-SDR（以 dB 计）更好。最先进的系统在 WSJ0-2mix 上实现大约 20-22 dB 的 SI-SDR 改进。

- 音乐分离技术将音乐录音分解为声带、鼓声、低音和其它乐器的声部。这使得应用程序如卡拉OK（去除声带）、混音（调整乐器水平）和转录（逐个分析一种乐器）成为可能。

- **Open-Unmix**（Stoter et al., 2019）是参考基线，使用3层双向LSTM预测每个源的软掩码。它独立地为每个源处理模型。简单但有效，Open-Unmix在MUSDB18上建立了可重复基准。

- **Demucs** (Defossez et al., 2019; 更新为混合 Demucs, 2021) 使用一个 U-net 架构（第 8 章），直接操作波形。编码器通过步进卷积压缩混合体，解码器通过转置卷积和跳连接将其扩展回，并且每个源都有自己的解码头。**混合 Demucs**结合时域和频谱处理：编码器有两个并行的时域和 STFT 分支，其特征在解码器之前融合。这捕捉了时间和频率结构的细微细节。

- Demucs在MUSDB18上实现了最先进的分离质量，尤其在人声分离方面表现突出。它的U-Net架构与第08章中提到的图像分割架构相似，将分离问题视为一种“音频分割”。

- **主动降噪（ANC）**通过生成一个与噪声相抵消的反噪声信号来减少不必要的声音。想象一下降噪耳机：麦克风拾取环境噪音， ANC 系统生成一个反转版本，然后将两个信号（噪声 + 反噪声）结合在一起，理想情况下可以消除为静音。

- 物理很简单：如果噪声是 $n(t)$，同时在相同空间点生成 $-n(t)$ 会产生静音：$n(t) + (-n(t)) = 0$。挑战在于抗噪必须精确对齐时间、幅度和相位。即使是微小的误差也会产生残留噪声或 artifacts。

- **前馈ANC**使用一个参考麦克风，它在噪声到达听众之前拾取噪声。系统有足够的时间来处理噪声并生成抗噪信号。参考信号通过一个自适应滤波器传递，其输出从错误麦克风（靠近听众）的噪声中减去。这适用于可预测、宽带噪声（发动机轰鸣声、风扇噪音）。

- **ANC反馈**仅使用监听者耳部的错误麦克风。系统通过估计残留信号（听众实际听到的内容）来调整抗噪声。ANC反馈简单（不需要参考麦克风），但带宽有限且容易不稳定。

- **自适应滤波器**是ANC的核心数学引擎。滤波系数必须实时调整以适应噪声环境的变化。最常见的算法是**最小均方误差（LMS）**滤波器。

![LMS自适应滤波器：参考信号通过FIR滤波器传递，输出从所需信号中减去以产生误差，该误差反馈回更新滤波器系数](../images/lms_adaptive_filter.svg)


- **LMS算法**：一个FIR滤波器，其系数为$\mathbf{w} = [w_0, w_1, \ldots, w_{L-1}]^T$，处理参考信号$\mathbf{x}(n) = [x(n), x(n-1), \ldots, x(n-L+1)]^T$。输出为$y(n) = \mathbf{w}^T \mathbf{x}(n)$，误差为$e(n) = d(n) - y(n)$（其中$d(n)$是期望/主要信号），权重更新公式为：

$$\mathbf{w}(n+1) = \mathbf{w}(n) + \mu \, e(n) \, \mathbf{x}(n)$$
- $\mu$ 是步长（学习率）。这是使用瞬时梯度估计 $-2 e(n) \mathbf{x}(n)$ 而不是真实梯度的随机梯度下降步骤，用于计算均方误差 $E[e^2(n)]$（第 03 章的梯度下降和第 06 章的 SGD）。

- 步长 $\mu$ 控制收敛速度和稳态误差之间的平衡。过大时，滤波器会振荡或发散；过小则适应性缓慢。稳定性条件 $0 < \mu < 2 / (\lambda_{\max})$ 是输入自相关矩阵 $R = E[\mathbf{x}\mathbf{x}^T]$ 的最大特征值 $\lambda_{\max}$。

- **归一化最小均方误差（NLMS）** 通过将步长大小归一化为输入功率，使其收敛与信号水平无关：

$$\mathbf{w}(n+1) = \mathbf{w}(n) + \frac{\mu}{\|\mathbf{x}(n)\|^2 + \epsilon} \, e(n) \, \mathbf{x}(n)$$
- $\epsilon$ 是一个较小的正则化常数，用于防止除以零。NLMS 的收敛性比 LMS 更可靠，因为有效步长会根据输入功率进行调整。

- 递归最小二乘（RLS）是一种更快收敛的替代方法，它通过最小化加权最小二乘成本来实现。 $\sum_{k=1}^{n} \lambda^{n-k} e^2(k)$在何处 $\lambda \in (0, 1]$ 遗忘因子。RLS通过递归更新逆自相关矩阵，实现最优收敛代价。 $O(L^2)$ 每样本计算（相对于 $O(L)$ 对于LMS。

- **噪声抑制和语音增强**旨在提高嘈杂录音中的语音质量与可懂度。不同于源分离（将不同来源分开），语音增强专注于处理语音加噪声的情况，从嘈杂的观测中恢复干净的语音。

- **频谱减法**是简单的方法。在噪声帧（由文件03中的VAD检测到）上，估计噪声频谱 $|\hat{N}(f)|^2$。然后从每个帧中减去它：

$$|\hat{S}(f)|^2 = \max(|X(f)|^2 - \alpha |\hat{N}(f)|^2, \beta |X(f)|^2)$$
- $\alpha$ 是一个过减法因子（通常为1到4，激进的减法去除更多噪声但引入更多伪影），而 $\beta$ 是一个频谱地板，防止负值并减少“音乐噪音”伪影（孤立的音色残余听起来像随机的音乐音符）。

- **维纳滤波器**提供干净语音谱的最小均方误差估计：

$$\hat{S}(t, f) = \frac{|S(t,f)|^2}{|S(t,f)|^2 + |N(t,f)|^2} \cdot X(t, f) = G(t, f) \cdot X(t, f)$$
- 信噪比增益 $G(t, f) = \text{SNR}(t, f) / (1 + \text{SNR}(t, f))$ 范围从 0（纯噪声）到 1（纯语音），作为软掩码。挑战在于估计语音和噪声功率谱。**先验 SNR** $\xi(t, f) = |S(t,f)|^2 / |N(t,f)|^2$ 使用“决策导向”方法估算：当前帧的估计与前一帧经过 Wiener 过滤后的输出的平滑组合。

- **神经语音增强**使用深度学习估计掩码（如Wiener增益）或直接获取干净的频谱图。架构从简单的前馈网络到U-Net（第08章），CRN（卷积递归网络）和Transformer。

- **DCCRN**（深度复杂卷积循环网络）在处理双模STFT（幅度和相位）时，使用复数卷积来自然处理实部和虚部。这避免了仅基于幅度的方法中出现的相位估计问题。

- **全频子网**采用双路径架构，包含一个全局谱模式（捕捉全局 spectral 模式）和一个局部谐波细节模式。全局谱模式处理整个频谱，而局部谐波细节模式处理每个频率 bin 中的窄频带。它们的输出被组合以获得最终掩码估计。

- 微软每年都会对语音增强系统进行深度噪声抑制（DNS）挑战。获胜者通常会使用大规模的训练，涉及多种噪声类型、数据增强（在不同信噪比下添加噪声、混响和编码器瑕疵），以及支持实时处理的架构。

- **回声消除**在双向通信中去除回声。当你打电话时，远端说话者的语音通过你的扬声器播放，然后在房间内反射回来，被你的麦克风拾取，从而产生回声，远端说话者会听到这个回声。**回声消除（AEC）**模型从扬声器到麦克风的声学路径，并减去预测的回声。

- 声音路径被建模为一个自适应的 FIR 过滤器（使用 LMS 或 NLMS），远端信号作为输入。该过滤器模拟了房间 impulse响应，包括直接路径、早期反射和晚期回声。房间 impulse响应可以长达几百毫秒，需要具有数千个系数的滤波器。

- **双语检测**对于AEC至关重要：当近端和远端的说话者同时讲话时，自适应滤波器必须冻结（停止更新），以防止它取消近端说话者的语音。双语检测器比较误差信号的能量与远端信号的能量；突然增加的误差能量，没有被远端信号解释，表明有近端说话。

- The **normalised cross-correlation** between the far-end signal $x(n)$ and the microphone signal $d(n)$ provides a double-talk indicator:

$$\xi(n) = \frac{|\sum_{k=0}^{L-1} x(n-k) d(n-k)|}{\sqrt{\sum_{k} x^2(n-k)} \sqrt{\sum_{k} d^2(n-k)}}$$
- During single-talk (far-end only), $\xi$ is high because $d$ is mostly echo of $x$. During double-talk, $\xi$ drops because the near-end speech is uncorrelated with $x$.

- 现代AEC系统结合自适应滤波与神经网络：自适应滤波提供初始回声估计，神经网络（类似于上述语音增强模型）清理剩余回声并处理线性滤波无法捕捉的非线性（扬声器失真）。

- **评估分离和增强的指标**：
    - **SI-SDR**（如上所述）：用于声源分离的标准。
    - **SDR**（信噪比）：来自BSS Eval，衡量整体分离质量，包括 artifacts和干扰。
    - **PESQ**（语音质量评估）：ITU标准，预测主观质量分数。范围：-0.5到4.5。
    - **STOI**（短时客观可懂度）：预测语音可懂度。范围：0到1。
    - **DNSMOS**（微软的深度噪声抑制 MOS 预测器），一个使用神经网络训练来预测人类 MOS 分数，而不需要干净的参考音频。

## 编程任务（使用CoLab或笔记本）

- **任务 1：独立成分分析（ICA）分离声源。** 实现 FastICA 来分离两个混合音频源，展示在确定情况下经典 cocktail party 解决方案（等源和麦克风）。

```python
import jax
import jax.numpy as jnp
import jax.random as jr
import matplotlib.pyplot as plt

# Generate two source signals
sr = 8000
duration = 1.0
t = jnp.linspace(0, duration, int(sr * duration))

# Source 1: sinusoidal (like a tone)
s1 = jnp.sin(2 * jnp.pi * 440 * t) + 0.3 * jnp.sin(2 * jnp.pi * 880 * t)

# Source 2: sawtooth-like (rich harmonics)
s2 = 2 * (t * 200 % 1) - 1  # sawtooth at 200 Hz

# Normalise sources
s1 = s1 / jnp.max(jnp.abs(s1))
s2 = s2 / jnp.max(jnp.abs(s2))
sources = jnp.stack([s1, s2])  # (2, T)

# Mixing matrix (unknown to the algorithm)
A = jnp.array([[0.8, 0.4],
               [0.3, 0.9]])
mixtures = A @ sources  # (2, T)

# FastICA implementation
def whiten(X):
    """Centre and whiten the data."""
    X_centered = X - jnp.mean(X, axis=1, keepdims=True)
    cov = (X_centered @ X_centered.T) / X_centered.shape[1]
    eigvals, eigvecs = jnp.linalg.eigh(cov)
    D_inv_sqrt = jnp.diag(1.0 / jnp.sqrt(eigvals + 1e-8))
    whitening = D_inv_sqrt @ eigvecs.T
    return whitening @ X_centered, whitening

def fastica(X, n_components=2, max_iter=200, tol=1e-6):
    """FastICA using tanh non-linearity (approximation to negentropy)."""
    X_white, whitening = whiten(X)
    n, T = X_white.shape

    key = jr.PRNGKey(42)
    W = jr.normal(key, (n_components, n))
    # Orthogonalise W
    U, _, Vt = jnp.linalg.svd(W, full_matrices=False)
    W = U @ Vt

    for iteration in range(max_iter):
        W_old = W.copy()

        # For each component
        for i in range(n_components):
            w = W[i]
            # w^T X_white: (T,)
            wx = w @ X_white  # (T,)

            # g(u) = tanh(u), g'(u) = 1 - tanh^2(u)
            g_wx = jnp.tanh(wx)
            g_prime_wx = 1 - g_wx ** 2

            # Newton update: w_new = E[X * g(w^T X)] - E[g'(w^T X)] * w
            w_new = jnp.mean(X_white * g_wx[None, :], axis=1) - \
                    jnp.mean(g_prime_wx) * w

            # Decorrelate from previous components (deflation)
            for j in range(i):
                w_new = w_new - jnp.dot(w_new, W[j]) * W[j]

            w_new = w_new / jnp.linalg.norm(w_new)
            W = W.at[i].set(w_new)

        # Check convergence
        convergence = jnp.min(jnp.abs(jnp.diag(W @ W_old.T)))
        if convergence > 1 - tol:
            print(f"FastICA converged in {iteration + 1} iterations")
            break

    # Unmixing matrix
    unmixing = W @ whitening
    recovered = unmixing @ X
    return recovered, unmixing

recovered, W_unmix = fastica(mixtures)

# Fix sign ambiguity (ICA can flip signs)
for i in range(2):
    if jnp.corrcoef(recovered[i], sources[i])[0, 1] < -0.5:
        recovered = recovered.at[i].set(-recovered[i])

# If sources are swapped, fix permutation
corr_00 = jnp.abs(jnp.corrcoef(recovered[0], sources[0])[0, 1])
corr_01 = jnp.abs(jnp.corrcoef(recovered[0], sources[1])[0, 1])
if corr_01 > corr_00:
    recovered = recovered[::-1]

# Normalise for display
recovered = recovered / jnp.max(jnp.abs(recovered), axis=1, keepdims=True)

fig, axes = plt.subplots(3, 2, figsize=(14, 9))

axes[0, 0].plot(t[:1000], s1[:1000], color='#3498db', linewidth=0.8)
axes[0, 0].set_title('Source 1 (Original)')
axes[0, 0].set_ylabel('Amplitude')

axes[0, 1].plot(t[:1000], s2[:1000], color='#e74c3c', linewidth=0.8)
axes[0, 1].set_title('Source 2 (Original)')

axes[1, 0].plot(t[:1000], mixtures[0, :1000], color='#9b59b6', linewidth=0.8)
axes[1, 0].set_title('Mixture 1 (Microphone 1)')
axes[1, 0].set_ylabel('Amplitude')

axes[1, 1].plot(t[:1000], mixtures[1, :1000], color='#9b59b6', linewidth=0.8)
axes[1, 1].set_title('Mixture 2 (Microphone 2)')

axes[2, 0].plot(t[:1000], recovered[0, :1000], color='#27ae60', linewidth=0.8)
axes[2, 0].set_title('Recovered Source 1 (FastICA)')
axes[2, 0].set_ylabel('Amplitude')
axes[2, 0].set_xlabel('Time (s)')

axes[2, 1].plot(t[:1000], recovered[1, :1000], color='#f39c12', linewidth=0.8)
axes[2, 1].set_title('Recovered Source 2 (FastICA)')
axes[2, 1].set_xlabel('Time (s)')

plt.tight_layout()
plt.show()

# Report correlation with originals
for i in range(2):
    corr = jnp.corrcoef(recovered[i], sources[i])[0, 1]
    print(f"Source {i+1} recovery correlation: {corr:.4f}")
```

- **任务 2：基于 NMF 的声源分离在频谱图上。** 使用非负矩阵分解（第 02 章）将频谱图分离成两个组件，展示 NMF 如何为每个源学习音符字典。

```python
import jax
import jax.numpy as jnp
import jax.random as jr
import matplotlib.pyplot as plt

# Generate two signals with distinct spectral characteristics
sr = 8000
duration = 1.0
t = jnp.linspace(0, duration, int(sr * duration))

# Source 1: low-frequency harmonic (simulating bass)
src1 = (jnp.sin(2 * jnp.pi * 100 * t) +
        0.5 * jnp.sin(2 * jnp.pi * 200 * t) +
        0.3 * jnp.sin(2 * jnp.pi * 300 * t))

# Source 2: high-frequency harmonic (simulating a flute)
src2 = (jnp.sin(2 * jnp.pi * 800 * t) +
        0.4 * jnp.sin(2 * jnp.pi * 1600 * t))

# Time-varying amplitudes (sources active at different times)
env1 = jnp.where(t < 0.5, 1.0, 0.3)
env2 = jnp.where(t > 0.3, 1.0, 0.2)
src1 = src1 * env1
src2 = src2 * env2

mixture = src1 + src2

# Compute magnitude spectrogram (STFT)
n_fft = 512
hop = 128
window = jnp.hanning(n_fft)

def compute_stft(signal, n_fft, hop, window):
    n_frames = 1 + (len(signal) - n_fft) // hop
    frames = jnp.stack([
        signal[i * hop : i * hop + n_fft] * window
        for i in range(n_frames)
    ])
    return jnp.fft.rfft(frames, n=n_fft)

S_mix = compute_stft(mixture, n_fft, hop, window)
V = jnp.abs(S_mix).T  # (F, T) - frequency x time
phase = jnp.angle(S_mix).T

F, T = V.shape
print(f"Spectrogram shape: {F} freq bins x {T} time frames")

# NMF: V ≈ WH using multiplicative update rules
def nmf(V, K, n_iter=200, key=jr.PRNGKey(0)):
    """Non-negative Matrix Factorisation with Frobenius norm."""
    k1, k2 = jr.split(key)
    W = jnp.abs(jr.normal(k1, (F, K))) * 0.1 + 0.01  # (F, K)
    H = jnp.abs(jr.normal(k2, (K, T))) * 0.1 + 0.01  # (K, T)

    costs = []
    for i in range(n_iter):
        # Multiplicative update for H
        WtV = W.T @ V
        WtWH = W.T @ W @ H + 1e-8
        H = H * (WtV / WtWH)

        # Multiplicative update for W
        VHt = V @ H.T
        WHHt = W @ H @ H.T + 1e-8
        W = W * (VHt / WHHt)

        cost = jnp.sum((V - W @ H) ** 2)
        costs.append(float(cost))

    return W, H, costs

# Run NMF with K=2 components
K = 2
W, H, costs = nmf(V, K, n_iter=300)

# Reconstruct each source using soft masks
V_hat = W @ H
mask1 = (W[:, 0:1] @ H[0:1, :]) / (V_hat + 1e-8)
mask2 = (W[:, 1:2] @ H[1:2, :]) / (V_hat + 1e-8)

V_src1 = mask1 * V
V_src2 = mask2 * V

# Visualisation
fig, axes = plt.subplots(3, 2, figsize=(14, 10))

# Mixture spectrogram
axes[0, 0].imshow(jnp.log1p(V), aspect='auto', origin='lower', cmap='magma')
axes[0, 0].set_title('Mixture Spectrogram |X|')
axes[0, 0].set_ylabel('Frequency bin')

# NMF convergence
axes[0, 1].plot(costs, color='#3498db', linewidth=1.5)
axes[0, 1].set_title('NMF Convergence')
axes[0, 1].set_xlabel('Iteration')
axes[0, 1].set_ylabel('Frobenius cost')
axes[0, 1].set_yscale('log')

# Spectral basis vectors W
freq_hz = jnp.arange(F) * sr / n_fft
axes[1, 0].plot(freq_hz, W[:, 0], color='#27ae60', linewidth=1.5,
                label='Basis 1 (low freq)')
axes[1, 0].plot(freq_hz, W[:, 1], color='#e74c3c', linewidth=1.5,
                label='Basis 2 (high freq)')
axes[1, 0].set_title('Learned Spectral Bases W')
axes[1, 0].set_xlabel('Frequency (Hz)')
axes[1, 0].set_ylabel('Magnitude')
axes[1, 0].legend()

# Temporal activations H
time_s = jnp.arange(T) * hop / sr
axes[1, 1].plot(time_s, H[0], color='#27ae60', linewidth=1.5,
                label='Activation 1')
axes[1, 1].plot(time_s, H[1], color='#e74c3c', linewidth=1.5,
                label='Activation 2')
axes[1, 1].set_title('Temporal Activations H')
axes[1, 1].set_xlabel('Time (s)')
axes[1, 1].set_ylabel('Activation')
axes[1, 1].legend()

# Separated spectrograms
axes[2, 0].imshow(jnp.log1p(V_src1), aspect='auto', origin='lower', cmap='magma')
axes[2, 0].set_title('Separated Source 1 (low-frequency)')
axes[2, 0].set_ylabel('Frequency bin')
axes[2, 0].set_xlabel('Time frame')

axes[2, 1].imshow(jnp.log1p(V_src2), aspect='auto', origin='lower', cmap='magma')
axes[2, 1].set_title('Separated Source 2 (high-frequency)')
axes[2, 1].set_xlabel('Time frame')

plt.tight_layout()
plt.show()

print(f"Reconstruction error: {jnp.sum((V - W @ H)**2):.2f}")
print(f"NMF learns spectral bases that capture each source's frequency profile.")
```

- **任务 3：LMS 自适应滤波器用于噪声抑制。** 实现 LMS 和 NLMS 算法进行回声/噪声抑制，展示收敛行为和步长的影响。

```python
import jax
import jax.numpy as jnp
import jax.random as jr
import matplotlib.pyplot as plt

# Simulate an echo cancellation scenario
# Far-end signal -> room impulse response -> echo at microphone
# Near-end speech is the desired signal we want to preserve

sr = 8000
duration = 2.0
n_samples = int(sr * duration)
key = jr.PRNGKey(42)
keys = jr.split(key, 5)

# Far-end signal (reference): random speech-like signal
far_end = jr.normal(keys[0], (n_samples,)) * 0.5

# Room impulse response (unknown to the algorithm)
rir_length = 64
rir = jnp.zeros(rir_length)
rir = rir.at[0].set(0.8)   # direct path
rir = rir.at[5].set(0.3)   # early reflection
rir = rir.at[12].set(-0.2) # reflection
rir = rir.at[25].set(0.1)  # late reflection
rir = rir.at[40].set(-0.05)

# Echo: convolution of far-end with RIR
echo = jnp.convolve(far_end, rir)[:n_samples]

# Near-end speech (active in a portion of the signal)
near_end = jnp.zeros(n_samples)
start, end = n_samples // 3, 2 * n_samples // 3
near_speech = 0.3 * jnp.sin(
    2 * jnp.pi * 300 * jnp.linspace(0, (end - start) / sr, end - start)
)
near_end = near_end.at[start:end].set(near_speech)

# Microphone signal: echo + near-end + noise
noise = jr.normal(keys[1], (n_samples,)) * 0.01
mic_signal = echo + near_end + noise

# LMS adaptive filter
def lms_filter(reference, desired, filter_length, mu):
    """Standard LMS adaptive filter."""
    n = len(reference)
    w = jnp.zeros(filter_length)
    output = jnp.zeros(n)
    error = jnp.zeros(n)
    w_history = []

    for i in range(filter_length, n):
        x = reference[i:i-filter_length:-1]  # reversed segment
        if len(x) < filter_length:
            x = jnp.pad(x, (0, filter_length - len(x)))
        x = reference[max(0, i-filter_length+1):i+1][::-1]

        y = jnp.dot(w, x)
        e = desired[i] - y
        w = w + mu * e * x

        output = output.at[i].set(y)
        error = error.at[i].set(e)

        if i % 500 == 0:
            w_history.append(w.copy())

    return output, error, w_history

# NLMS adaptive filter
def nlms_filter(reference, desired, filter_length, mu, eps=1e-6):
    """Normalised LMS adaptive filter."""
    n = len(reference)
    w = jnp.zeros(filter_length)
    output = jnp.zeros(n)
    error = jnp.zeros(n)

    for i in range(filter_length, n):
        x = reference[max(0, i-filter_length+1):i+1][::-1]

        y = jnp.dot(w, x)
        e = desired[i] - y
        norm_factor = jnp.dot(x, x) + eps
        w = w + (mu / norm_factor) * e * x

        output = output.at[i].set(y)
        error = error.at[i].set(e)

    return output, error

# Run LMS with different step sizes
filter_len = 64
mu_values = [0.001, 0.01, 0.05]
colors_mu = ['#3498db', '#e74c3c', '#27ae60']

fig, axes = plt.subplots(2, 2, figsize=(14, 10))

# Original signals
t = jnp.arange(n_samples) / sr
axes[0, 0].plot(t, mic_signal, color='#9b59b6', linewidth=0.5, alpha=0.7,
                label='Mic (echo + near-end)')
axes[0, 0].plot(t, echo, color='#e74c3c', linewidth=0.5, alpha=0.7,
                label='Echo (to cancel)')
axes[0, 0].plot(t, near_end, color='#27ae60', linewidth=0.8,
                label='Near-end speech (to preserve)')
axes[0, 0].set_title('Signal Components')
axes[0, 0].set_xlabel('Time (s)')
axes[0, 0].set_ylabel('Amplitude')
axes[0, 0].legend(fontsize=8)

# LMS convergence for different step sizes
for mu, color in zip(mu_values, colors_mu):
    _, err, _ = lms_filter(far_end, mic_signal, filter_len, mu)
    # Smoothed squared error
    sq_err = err ** 2
    window_size = 200
    smoothed = jnp.convolve(sq_err, jnp.ones(window_size)/window_size,
                             mode='valid')
    axes[0, 1].plot(smoothed, color=color, linewidth=1.2,
                    label=f'mu={mu}')

axes[0, 1].set_title('LMS Convergence (smoothed MSE)')
axes[0, 1].set_xlabel('Sample')
axes[0, 1].set_ylabel('Squared Error')
axes[0, 1].set_yscale('log')
axes[0, 1].legend()

# Best LMS result
_, err_lms, w_hist = lms_filter(far_end, mic_signal, filter_len, 0.01)
axes[1, 0].plot(t, mic_signal, color='#9b59b6', linewidth=0.5, alpha=0.4,
                label='Before cancellation')
axes[1, 0].plot(t, err_lms, color='#3498db', linewidth=0.5, alpha=0.8,
                label='After LMS cancellation')
axes[1, 0].plot(t, near_end, color='#27ae60', linewidth=0.8, alpha=0.5,
                label='True near-end')
axes[1, 0].set_title('LMS Echo Cancellation Result (mu=0.01)')
axes[1, 0].set_xlabel('Time (s)')
axes[1, 0].set_ylabel('Amplitude')
axes[1, 0].legend(fontsize=8)

# NLMS result
_, err_nlms = nlms_filter(far_end, mic_signal, filter_len, 0.5)
axes[1, 1].plot(t, mic_signal, color='#9b59b6', linewidth=0.5, alpha=0.4,
                label='Before cancellation')
axes[1, 1].plot(t, err_nlms, color='#f39c12', linewidth=0.5, alpha=0.8,
                label='After NLMS cancellation')
axes[1, 1].plot(t, near_end, color='#27ae60', linewidth=0.8, alpha=0.5,
                label='True near-end')
axes[1, 1].set_title('NLMS Echo Cancellation Result (mu=0.5)')
axes[1, 1].set_xlabel('Time (s)')
axes[1, 1].set_ylabel('Amplitude')
axes[1, 1].legend(fontsize=8)

plt.tight_layout()
plt.show()

# Measure echo reduction
echo_power = jnp.mean(echo ** 2)
lms_residual = jnp.mean(err_lms[n_samples//2:] ** 2)  # after convergence
nlms_residual = jnp.mean(err_nlms[n_samples//2:] ** 2)
print(f"Echo power: {10*jnp.log10(echo_power):.1f} dB")
print(f"LMS residual: {10*jnp.log10(lms_residual):.1f} dB "
      f"(ERLE: {10*jnp.log10(echo_power/lms_residual):.1f} dB)")
print(f"NLMS residual: {10*jnp.log10(nlms_residual):.1f} dB "
      f"(ERLE: {10*jnp.log10(echo_power/nlms_residual):.1f} dB)")
```

- **任务 4：时间频率掩码用于语音增强。** 实现一个简单的频谱掩码方法（理想比值掩码）并将其与频谱减法进行比较，可视化在合成噪声语音信号上的分离质量。

```python
import jax
import jax.numpy as jnp
import jax.random as jr
import matplotlib.pyplot as plt

# Create synthetic "speech" and "noise" signals
sr = 8000
duration = 2.0
t = jnp.linspace(0, duration, int(sr * duration))

# Speech: harmonic series with time-varying amplitude (simulating speech)
speech = jnp.zeros_like(t)
for f0 in [150, 300, 450, 600, 900]:
    amp_env = 0.5 + 0.5 * jnp.sin(2 * jnp.pi * 2.0 * t)  # 2 Hz modulation
    speech = speech + (0.5 / (f0/150)) * amp_env * jnp.sin(2 * jnp.pi * f0 * t)
speech = speech / jnp.max(jnp.abs(speech))

# Noise: band-limited noise
key = jr.PRNGKey(42)
noise_raw = jr.normal(key, t.shape) * 0.4

# Mix at a given SNR
snr_db = 5.0
speech_power = jnp.mean(speech ** 2)
noise_power = jnp.mean(noise_raw ** 2)
noise_scale = jnp.sqrt(speech_power / (noise_power * 10 ** (snr_db / 10)))
noise = noise_raw * noise_scale
mixture = speech + noise

# STFT
n_fft = 512
hop = 128
window = jnp.hanning(n_fft)

def stft(signal, n_fft, hop, window):
    n_frames = 1 + (len(signal) - n_fft) // hop
    frames = jnp.stack([
        signal[i * hop : i * hop + n_fft] * window
        for i in range(n_frames)
    ])
    return jnp.fft.rfft(frames, n=n_fft)

def istft(S, hop, window, length):
    n_fft = (S.shape[1] - 1) * 2
    n_frames = S.shape[0]
    frames = jnp.fft.irfft(S, n=n_fft) * window[None, :]
    output = jnp.zeros(length)
    window_sum = jnp.zeros(length)
    for i in range(n_frames):
        start = i * hop
        end = start + n_fft
        if end <= length:
            output = output.at[start:end].add(frames[i])
            window_sum = window_sum.at[start:end].add(window ** 2)
    window_sum = jnp.maximum(window_sum, 1e-8)
    return output / window_sum

S_speech = stft(speech, n_fft, hop, window)
S_noise = stft(noise, n_fft, hop, window)
S_mix = stft(mixture, n_fft, hop, window)

mag_speech = jnp.abs(S_speech)
mag_noise = jnp.abs(S_noise)
mag_mix = jnp.abs(S_mix)
phase_mix = jnp.angle(S_mix)

# Method 1: Ideal Ratio Mask (oracle - upper bound)
irm = mag_speech ** 2 / (mag_speech ** 2 + mag_noise ** 2 + 1e-8)
S_irm = (irm * mag_mix) * jnp.exp(1j * phase_mix)
enhanced_irm = istft(S_irm, hop, window, len(mixture))

# Method 2: Spectral subtraction
# Estimate noise from first 0.2s (assumed silence)
noise_frames = int(0.2 * sr / hop)
noise_est = jnp.mean(mag_mix[:noise_frames] ** 2, axis=0, keepdims=True)
alpha = 2.0  # over-subtraction factor
beta = 0.02  # spectral floor
mag_sub = jnp.maximum(mag_mix ** 2 - alpha * noise_est, beta * mag_mix ** 2)
mag_sub = jnp.sqrt(mag_sub)
S_sub = mag_sub * jnp.exp(1j * phase_mix)
enhanced_sub = istft(S_sub, hop, window, len(mixture))

# Method 3: Wiener filter
snr_est = mag_mix ** 2 / (noise_est + 1e-8)
wiener_gain = snr_est / (1 + snr_est)
S_wiener = (wiener_gain * mag_mix) * jnp.exp(1j * phase_mix)
enhanced_wiener = istft(S_wiener, hop, window, len(mixture))

# Compute SI-SDR for each method
def si_sdr(estimate, reference):
    """Scale-invariant signal-to-distortion ratio."""
    ref = reference[:len(estimate)]
    est = estimate[:len(reference)]
    s_target = (jnp.dot(est, ref) / (jnp.dot(ref, ref) + 1e-8)) * ref
    e_noise = est - s_target
    return 10 * jnp.log10(jnp.dot(s_target, s_target) /
                           (jnp.dot(e_noise, e_noise) + 1e-8))

si_sdr_mix = si_sdr(mixture, speech)
si_sdr_irm_val = si_sdr(enhanced_irm, speech)
si_sdr_sub_val = si_sdr(enhanced_sub, speech)
si_sdr_wiener_val = si_sdr(enhanced_wiener, speech)

# Visualisation
fig, axes = plt.subplots(3, 2, figsize=(14, 12))

# Spectrograms
axes[0, 0].imshow(jnp.log1p(mag_speech.T), aspect='auto', origin='lower',
                   cmap='magma')
axes[0, 0].set_title('Clean Speech Spectrogram')
axes[0, 0].set_ylabel('Frequency bin')

axes[0, 1].imshow(jnp.log1p(mag_mix.T), aspect='auto', origin='lower',
                   cmap='magma')
axes[0, 1].set_title(f'Noisy Mixture ({snr_db:.0f} dB SNR)')

# Masks
axes[1, 0].imshow(irm.T, aspect='auto', origin='lower', cmap='RdYlGn')
axes[1, 0].set_title('Ideal Ratio Mask (Oracle)')
axes[1, 0].set_ylabel('Frequency bin')

axes[1, 1].imshow(wiener_gain.T, aspect='auto', origin='lower', cmap='RdYlGn',
                   vmin=0, vmax=1)
axes[1, 1].set_title('Estimated Wiener Gain')

# Enhanced waveforms comparison
n_show = 3000
axes[2, 0].plot(t[:n_show], speech[:n_show], color='#27ae60', linewidth=0.8,
                alpha=0.5, label='Clean')
axes[2, 0].plot(t[:n_show], mixture[:n_show], color='#e74c3c', linewidth=0.5,
                alpha=0.4, label='Noisy')
axes[2, 0].plot(t[:n_show], enhanced_irm[:n_show], color='#3498db',
                linewidth=0.8, label='IRM enhanced')
axes[2, 0].set_title('Waveform Comparison (IRM)')
axes[2, 0].set_xlabel('Time (s)')
axes[2, 0].set_ylabel('Amplitude')
axes[2, 0].legend(fontsize=8)

# SI-SDR bar chart
methods = ['Mixture', 'Spectral\nSubtraction', 'Wiener\nFilter', 'Ideal Ratio\nMask']
sdr_values = [float(si_sdr_mix), float(si_sdr_sub_val),
              float(si_sdr_wiener_val), float(si_sdr_irm_val)]
bar_colors = ['#e74c3c', '#f39c12', '#9b59b6', '#27ae60']
bars = axes[2, 1].bar(methods, sdr_values, color=bar_colors, alpha=0.8)
axes[2, 1].set_ylabel('SI-SDR (dB)')
axes[2, 1].set_title('Enhancement Quality Comparison')
for bar, val in zip(bars, sdr_values):
    axes[2, 1].text(bar.get_x() + bar.get_width()/2., bar.get_height() + 0.3,
                    f'{val:.1f}', ha='center', fontsize=10)
axes[2, 1].axhline(0, color='gray', linestyle='--', linewidth=0.8)

plt.tight_layout()
plt.show()

print(f"SI-SDR (noisy mixture):        {si_sdr_mix:.2f} dB")
print(f"SI-SDR (spectral subtraction): {si_sdr_sub_val:.2f} dB")
print(f"SI-SDR (Wiener filter):        {si_sdr_wiener_val:.2f} dB")
print(f"SI-SDR (ideal ratio mask):     {si_sdr_irm_val:.2f} dB (oracle upper bound)")
```
