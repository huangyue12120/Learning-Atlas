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
# 声源分离与噪声消除

*声源分离与噪声消除从混合音频中恢复各路信号，这就是计算上的“鸡尾酒会问题”。本文介绍 ICA、NMF、时频掩码、波束形成、Conv-TasNet 和 SepFormer 等深度学习分离网络、语音增强与主动降噪。*

- 想象你站在热闹的鸡尾酒会上：几十个人同时交谈，音乐在响，杯子不时碰撞，你仍能专注听清一个人的谈话。这种能力称为**鸡尾酒会问题**（Cherry，1953）。人类听觉系统能轻松应对，机器却很难做到。本文介绍分离混合声源、消除噪声和在恶劣条件下增强语音的算法。

- 文件 01 介绍的短时傅里叶变换（STFT）、频谱图和滤波器组，为这里的各种方法提供信号处理基础。第 02 章的 NMF、ICA 和 SVD 等矩阵分解方法构成经典工具；第 06 章的 CNN、RNN、注意力机制，以及第 04、05 章的概率理论，则支撑现代方法。

![鸡尾酒会问题：多个说话人和声源在麦克风阵列中混合，分离系统需要从混合信号中恢复各个声源](../images/cocktail_party.svg)

- **问题表述**：一个或多个麦克风接收到混合信号 $x(t)$。最简单的情况下，混合信号是 $C$ 个声源的总和：

$$x(t) = \sum_{c=1}^{C} s_c(t) + n(t)$$

- $s_c(t)$ 是第 $c$ 个声源，$n(t)$ 是背景噪声。系统要根据 $x(t)$ 恢复各个 $s_c(t)$。单麦克风场景严重欠定：只有一个方程，却有 $C$ 个未知数。要让问题可解，必须加入额外假设，例如统计独立性、频谱结构或学到的先验。

- 用文件 01 介绍的 STFT 转到频域后，混合信号变为：

$$X(t, f) = \sum_{c=1}^{C} S_c(t, f) + N(t, f)$$

- 许多分离方法会在时频域为每个声源估计一个**掩码** $M_c(t, f) \in [0, 1]$，再按 $\hat{S}_c(t, f) = M_c(t, f) \cdot X(t, f)$ 恢复声源。**理想二值掩码**（IBM）在声源 $c$ 主导某个时频单元时令 $M_c(t, f) = 1$，否则令其为 0。**理想比率掩码**（IRM）是它的软掩码版本：

$$\text{IRM}_c(t, f) = \frac{|S_c(t, f)|^2}{\sum_{j=1}^{C} |S_j(t, f)|^2}$$

- **独立成分分析**（ICA）适用于麦克风数量不少于声源数量的情形。ICA（见第 02 章）寻找线性解混矩阵 $W$，使 $\hat{s} = Wx$ 得到的声源 $\hat{s}$ 在统计上尽可能独立。它假设声源相互独立且服从非高斯分布；语音和音乐通常满足这些条件。

- 对于多麦克风瞬时混合模型 $x = As$（$A$ 是混合矩阵），ICA 通过最大化输出的非高斯性（FastICA 使用负熵）或最小化互信息，估计 $W \approx A^{-1}$。ICA 在受控环境中效果良好，但遇到卷积混合（例如房间混响）、声源多于麦克风，或声源不独立时，效果就会变差。

- **非负矩阵分解**（NMF）把幅度频谱图 $V \in \mathbb{R}_+^{F \times T}$ 分解为两个非负矩阵的乘积（见第 02 章）：

$$V \approx WH$$

- $W \in \mathbb{R}_+^{F \times K}$ 是由 $K$ 个频谱基向量组成的字典，$H \in \mathbb{R}_+^{K \times T}$ 记录这些基向量随时间变化的激活系数。幅度谱取非负值；各声源的波形在时域相加，NMF 则用非负频谱分量的和近似表示混合幅度谱。

- NMF 分离声源时，会为不同声源学习各自的字典：$W_{\text{speech}}$ 捕捉语音的频谱模式（如共振峰结构），$W_{\text{noise}}$ 则捕捉噪声模式。混合频谱分解为 $V \approx W_{\text{speech}} H_{\text{speech}} + W_{\text{noise}} H_{\text{noise}}$，再通过掩码恢复各声源。NMF 使用乘法更新规则最小化代价函数，常用 Frobenius 范数或 KL 散度：

```math
\begin{aligned}
\text{Frobenius:} \quad D_F(V \| WH) &= \|V - WH\|_F^2 \\
\text{KL:} \quad D_{KL}(V \| WH) &= \sum_{f,t} \left[ V_{ft} \log \frac{V_{ft}}{(WH)_{ft}} - V_{ft} + (WH)_{ft} \right]
\end{aligned}
```

- **波束形成**利用麦克风阵列的空间信息。声源到达各麦克风的时间不同，这些延迟可以帮助增强某个方向的声音，同时抑制其他方向的干扰。

![波束形成：麦克风阵列从不同方向接收带有不同延迟的信号，波束形成器组合这些信号以增强目标方向并抑制其他方向](../images/beamforming.svg)

- **延迟求和波束形成**是最简单的方法。若目标声源相对阵列的角度为 $\theta$，麦克风 $m$ 的时间延迟为 $\tau_m(\theta) = d_m \sin \theta / c$，其中 $d_m$ 是麦克风的位置，$c$ 是声速。波束形成器先对齐各麦克风信号，再将它们相加：

$$y(t) = \frac{1}{M} \sum_{m=1}^{M} x_m(t - \tau_m(\theta))$$

- 目标方向的信号会相干叠加，其他方向的信号则不相干叠加，由此实现空间滤波。阵列越大，波束通常越窄，空间分辨率也越高。

- **最小方差无失真响应**（MVDR）波束形成通过调整权重，最小化总输出功率，同时保证目标方向的信号不失真：

```math
\begin{aligned}
\min_{\mathbf{w}} \quad & \mathbf{w}^H \Phi_{nn} \mathbf{w} \\
\text{subject to} \quad & \mathbf{w}^H \mathbf{d}(\theta) = 1
\end{aligned}
```

- $\Phi_{nn}$ 是噪声空间协方差矩阵，$\mathbf{d}(\theta)$ 是角度 $\theta$ 的导向矢量。该优化问题的闭式解为：

$$\mathbf{w}_{\text{MVDR}} = \frac{\Phi_{nn}^{-1} \mathbf{d}(\theta)}{\mathbf{d}(\theta)^H \Phi_{nn}^{-1} \mathbf{d}(\theta)}$$

- MVDR 使用估计得到的噪声协方差适应环境，抑制干扰的效果优于延迟求和方法。助听器、智能音箱和电话会议系统都使用这种方法。

- **深度学习声源分离**显著提高了分离效果，尤其是在传统方法难以应对的单麦克风场景。常见流程是：先编码混合信号，再用神经网络估计掩码或声源表示，最后解码出各个声源。

- **深度聚类**（Hershey 等，2016）把每个时频单元嵌入高维空间，使同一声源的单元彼此靠近，不同声源的单元彼此远离。双向 LSTM（见第 06 章）把每个时频单元 $(t, f)$ 映射为嵌入 $v_{t,f} \in \mathbb{R}^D$。训练目标为：

$$\mathcal{L} = \|VV^T - YY^T\|_F^2$$

- $V$ 是嵌入矩阵，$Y$ 是声源分配的独热矩阵。$VV^T$ 是嵌入相似度矩阵；$YY^T$ 是理想相似度矩阵，同源单元取 1，不同源取 0。推理时，对嵌入做 K-means 聚类即可生成二值掩码。

- **Conv-TasNet**（Luo 和 Mesgarani，2019）完全在时域工作，无需 STFT。它由三个部分构成：

![Conv-TasNet 架构：编码器把混合波形转换为潜在表示，时序卷积分离器估计各声源掩码，解码器再重建每个声源的波形](../images/conv_tasnet.svg)

- **编码器**：一维卷积把混合波形的短片段映射为潜在表示。给定混合信号 $x \in \mathbb{R}^T$，编码器输出 $w = \text{ReLU}(U \ast x) \in \mathbb{R}^{N \times L}$。$U$ 是可学习的基，与 STFT 基类似，但直接从数据中学习；$N$ 是基函数数目，$L$ 是片段数。卷积核大小和步长（通常为 2 毫秒和 1 毫秒）决定时间分辨率。

- **分离器**：**时序卷积网络**（TCN）处理编码后的混合信号，并输出 $C$ 个掩码。TCN 在多个模块中堆叠一维空洞深度可分离卷积，空洞率按 $1, 2, 4, \ldots, 2^{B-1}$ 指数增长，整个堆栈重复 $R$ 次。这样能扩大感受野，同时控制计算量。

- **解码器**：带可学习基 $V$ 的一维转置卷积，把每个掩码后的表示还原到时域：$\hat{s}_c = V^T (M_c \odot w)$。

- 与频谱图方法相比，Conv-TasNet 效果更好，因为它学到的编码器—解码器基能保留 STFT 幅度谱丢掉的信息，尤其是相位信息。

- **双路径 RNN**（DPRNN，Luo 等，2020）处理分离任务中的长序列问题。它不让单个 RNN 或 TCN 处理整段编码序列，而是把序列切成重叠块，再沿两条路径运行 RNN：**块内路径**建模每个块的局部模式，**块间路径**建模各块之间的全局模式。这样，每个维度上的 RNN 序列长度都会从 $L$ 降为 $\sqrt{L}$：

```math
\begin{aligned}
\text{Intra-chunk:} \quad & h_{k,n}^{\text{intra}} = \text{BiLSTM}_{\text{intra}}(z_{k,n}) \\
\text{Inter-chunk:} \quad & h_{k,n}^{\text{inter}} = \text{BiLSTM}_{\text{inter}}(h_{k,n}^{\text{intra}})
\end{aligned}
```

- $k$ 表示块索引，$n$ 表示块内位置。块内 LSTM 固定 $k$，沿 $n$ 处理；块间 LSTM 固定 $n$，沿 $k$ 处理。

- **SepFormer**（Subakan 等，2021）用 Transformer 替换双路径结构中的 RNN。块内 Transformer 用自注意力捕捉局部依赖，块间 Transformer 捕捉全局依赖。多头注意力无需依赖跨长序列的循环传播，因此不易受到梯度消失问题影响，适合处理长录音。SepFormer 在 WSJ0-2mix 基准上取得当时先进的结果。

- **排列不变训练**（PIT）解决监督式声源分离中的标签排列歧义。若网络有两个输出，对应两个说话人，训练时没有固定规则规定哪个输出对应谁。PIT 会计算所有可能的对应方式，再取损失最低的一种：

$$\mathcal{L}_{\text{PIT}} = \min_{\pi \in \mathcal{P}} \sum_{c=1}^{C} \ell(\hat{s}_{\pi(c)}, s_c)$$

- $\mathcal{P}$ 是 $\{1, \ldots, C\}$ 的所有排列，$\ell$ 是每个声源的损失，通常使用尺度不变信号失真比（SI-SDR）。$C=2$ 时有 2 种排列，$C=3$ 时有 6 种；$C$ 较大时可以用匈牙利算法高效求解。

- **尺度不变信号失真比**（SI-SDR）是声源分离的标准评估指标：

```math
\begin{aligned}
s_{\text{target}} &= \frac{\langle \hat{s}, s \rangle}{\|s\|^2} s \\
e_{\text{noise}} &= \hat{s} - s_{\text{target}} \\
\text{SI-SDR} &= 10 \log_{10} \frac{\|s_{\text{target}}\|^2}{\|e_{\text{noise}}\|^2}
\end{aligned}
```

- $\hat{s}$ 是估计声源，$s$ 是真实声源。SI-SDR 不受估计信号整体音量影响，因为分离质量比绝对音量更重要。SI-SDR 越高越好。WSJ0-2mix 上的先进系统可达到约 20–22 dB 的 SI-SDR 提升。

- **音乐声源分离**把一段音乐拆成不同分轨，例如人声、鼓、贝斯和其他乐器。这样可以实现卡拉 OK（去除人声）、重新混音（调整各乐器音量）和音乐转录（逐个分析乐器）。

- **Open-Unmix**（Stoter 等，2019）是一个参考基线。它使用 3 层双向 LSTM，在幅度 STFT 域为每个声源预测软掩码；每个声源由独立模型处理。Open-Unmix 方法简单有效，并为 MUSDB18 建立了可复现的基准。

- **Demucs**（Defossez 等，2019；2021 年更新为 Hybrid Demucs）使用第 08 章介绍的 U-Net，直接处理波形。编码器通过步长卷积压缩混合信号，解码器再用转置卷积和跳跃连接恢复信号，每个声源都有自己的解码头。**Hybrid Demucs**并行处理时域波形和 STFT 频谱，再把两路特征融合后送入解码器，兼顾时间细节和频谱结构。

- Demucs 在 MUSDB18 上的分离效果领先，尤其擅长分离人声。它的 U-Net 架构与第 08 章的图像分割网络相似，可以把声源分离看作一种“音频分割”。

- **主动降噪**（ANC）通过生成反噪声，让它与噪声发生相消干涉，从而降低不需要的声音。降噪耳机就是一个例子：麦克风采集环境噪声，ANC 系统生成反相信号，两者叠加后理想情况下会相互抵消。

- 原理很简单：若噪声为 $n(t)$，在空间同一点生成 $-n(t)$，两者相加就会静音：$n(t) + (-n(t)) = 0$。难点是让反噪声在时间、幅度和相位上都与噪声精确对齐。微小误差也会留下残余噪声或伪影。

- **前馈 ANC**使用参考麦克风，在噪声到达听者之前采集噪声。系统可以及时处理参考信号并生成反噪声，再通过自适应滤波器处理参考信号，最后从靠近听者的误差麦克风信号中减去滤波器输出。这种方法适合可预测的宽带噪声，例如发动机轰鸣和风扇噪声。

- **反馈 ANC**只使用听者耳边的误差麦克风。系统根据残余信号，也就是听者实际听到的声音，估计噪声并调整反噪声。反馈 ANC 不需要参考麦克风，结构更简单，但带宽有限，也可能不稳定。

- **自适应滤波**是 ANC 的数学核心。噪声环境变化时，滤波器系数必须跟着调整。最常见的算法是**最小均方**（LMS）滤波器。

![LMS 自适应滤波器：参考信号经过 FIR 滤波器，滤波器输出从目标信号中减去并产生误差；误差再反馈以更新滤波器系数](../images/lms_adaptive_filter.svg)

- **LMS 算法**：系数为 $\mathbf{w} = [w_0, w_1, \ldots, w_{L-1}]^T$ 的 FIR 滤波器处理参考信号 $\mathbf{x}(n) = [x(n), x(n-1), \ldots, x(n-L+1)]^T$。滤波器输出 $y(n) = \mathbf{w}^T \mathbf{x}(n)$，误差为 $e(n) = d(n) - y(n)$，其中 $d(n)$ 是目标信号或主信号。权重按以下公式更新：

$$\mathbf{w}(n+1) = \mathbf{w}(n) + \mu \, e(n) \, \mathbf{x}(n)$$

- $\mu$ 是步长（学习率）。这个更新相当于对均方误差 $E[e^2(n)]$ 做随机梯度下降：算法用瞬时梯度 $-2 e(n) \mathbf{x}(n)$ 估计真实梯度（见第 03 章梯度下降和第 06 章 SGD）。

- 步长 $\mu$ 决定收敛速度与稳态误差之间的权衡。步长过大，滤波器会振荡或发散；过小则适应缓慢。稳定条件为 $0 < \mu < 2 / (\lambda_{\max})$，其中 $\lambda_{\max}$ 是输入自相关矩阵 $R = E[\mathbf{x}\mathbf{x}^T]$ 的最大特征值。

- **归一化 LMS**（NLMS）按输入功率归一化步长，因此收敛过程不受信号电平影响：

$$\mathbf{w}(n+1) = \mathbf{w}(n) + \frac{\mu}{\|\mathbf{x}(n)\|^2 + \epsilon} \, e(n) \, \mathbf{x}(n)$$

- $\epsilon$ 是防止除以零的小正则项。NLMS 会根据输入功率调整有效步长，因此比普通 LMS 更稳定。

- **递归最小二乘**（RLS）收敛速度更快，它最小化加权最小二乘代价 $\sum_{k=1}^{n} \lambda^{n-k} e^2(k)$，其中 $\lambda \in (0, 1]$ 是遗忘因子。RLS 递归维护逆自相关矩阵的估计，每个采样点需要 $O(L^2)$ 次计算；LMS 只需 $O(L)$ 次。

- **噪声抑制与语音增强**旨在改善噪声录音中的语音质量和可懂度。声源分离要区分多个独立声源；语音增强则专门从“语音加噪声”的观测中恢复干净语音。

- **谱减法**是最简单的方法。系统先用文件 03 的 VAD 找出只有噪声的帧，并估计噪声频谱 $|\hat{N}(f)|^2$，然后从每帧频谱中减去噪声：

$$|\hat{S}(f)|^2 = \max(|X(f)|^2 - \alpha |\hat{N}(f)|^2, \beta |X(f)|^2)$$

- $\alpha$ 是过减因子，通常取 1–4。过减越多，去噪越强，也越容易产生伪影。$\beta$ 是频谱下限，可避免出现负值，并减少“音乐噪声”伪影，也就是听起来像随机音符的孤立音调残留。

- **维纳滤波**给出均方误差意义下的干净语音频谱估计：

$$\hat{S}(t, f) = \frac{|S(t,f)|^2}{|S(t,f)|^2 + |N(t,f)|^2} \cdot X(t, f) = G(t, f) \cdot X(t, f)$$

- 维纳增益 $G(t, f) = \text{SNR}(t, f) / (1 + \text{SNR}(t, f))$ 的范围是 0 到 1：0 表示纯噪声，1 表示纯语音，因此它相当于软掩码。难点在于估计语音和噪声的功率谱。系统用“判决导向”方法估计**先验信噪比** $\xi(t, f) = |S(t,f)|^2 / |N(t,f)|^2$，把当前帧估计与前一帧维纳滤波输出平滑结合。

- **神经网络语音增强**用深度学习估计掩码（类似维纳增益），或直接估计干净频谱图。模型包括简单前馈网络、U-Net（见第 08 章）、卷积循环网络（CRN）和 Transformer。

- **DCCRN**（深度复数卷积循环网络）处理复数 STFT，同时利用幅度和相位。复数卷积能直接处理实部和虚部，因此避免了只处理幅度时需要单独估计相位的问题。

- **FullSubNet**使用双路径结构：全频带模型捕捉整体频谱模式，子频带模型捕捉局部谐波细节。全频带模型处理完整频谱；子频带模型则围绕每个频率 bin 处理窄频段。系统结合两路输出估计最终掩码。

- **DNS（深度噪声抑制）挑战赛**由 Microsoft 每年举办，用来评估语音增强系统。获胜系统通常使用包含多种噪声的大规模训练数据、数据增强（不同信噪比的噪声、混响和编解码失真）以及可实时运行的架构。

- **回声消除**用于双向通信。当你通话时，远端说话人的声音从扬声器播放，在房间里反射后被本地麦克风再次采集，形成远端听到的回声。**声学回声消除**（AEC）会建模从扬声器到麦克风的声学路径，并减去预测的回声。

- 系统用自适应 FIR 滤波器建模这条声学路径，以远端信号作为输入。滤波器估计房间脉冲响应，包括直达声、早期反射和晚期混响。房间脉冲响应可能持续数百毫秒，因此滤波器往往需要数千个抽头。

- **双讲检测**对 AEC 很重要：近端和远端同时说话时，自适应滤波器必须暂停更新，以免消除近端说话人的声音。检测器会比较误差信号能量和远端信号能量；若误差能量突然升高，又无法用远端信号解释，就可能是近端有人说话。

- 远端信号 $x(n)$ 和麦克风信号 $d(n)$ 的**归一化互相关**可以用于检测双讲：

$$\xi(n) = \frac{|\sum_{k=0}^{L-1} x(n-k) d(n-k)|}{\sqrt{\sum_{k} x^2(n-k)} \sqrt{\sum_{k} d^2(n-k)}}$$

- 只有远端说话时，$d$ 主要是 $x$ 的回声，因此 $\xi$ 较高。双讲时，近端语音与 $x$ 不相关，$\xi$ 会降低。

- 现代 AEC 会把自适应滤波与神经网络结合起来：自适应滤波器先估计回声，神经网络再清理残余回声，并处理扬声器失真等线性滤波器无法建模的非线性。

- **声源分离与语音增强的评估指标**包括：
  - **SI-SDR**（上文定义）：声源分离的常用指标。
  - **信号失真比**（SDR，来自 BSS Eval）：衡量整体分离质量，包括伪影和干扰。
  - **语音质量感知评估**（PESQ）：ITU 标准，用来预测主观语音质量，取值范围为 −0.5 至 4.5。
  - **短时客观可懂度**（STOI）：预测语音可懂度，取值范围为 0 到 1。
  - **DNSMOS**：Microsoft 的深度噪声抑制 MOS 预测器。它用神经网络预测人工 MOS 分数，不需要干净的参考语音。

## 编程任务（使用 Colab 或笔记本）

- **任务 1：用独立成分分析分离声源。** 实现 FastICA，从两个混合音频信号中分离出两个声源，展示麦克风数等于声源数时的经典鸡尾酒会问题解法。

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

- **任务 2：在频谱图上用 NMF 分离声源。** 使用第 02 章介绍的非负矩阵分解，把频谱图分解为两个声源，并观察 NMF 如何为每个声源学习频谱字典。

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

- **任务 3：用 LMS 自适应滤波器消除噪声。** 实现 LMS 和 NLMS 回声或噪声消除算法，比较收敛过程和步长的影响。

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

- **任务 4：用时频掩码增强语音。** 实现简单的频谱掩码方法（理想比率掩码），再与谱减法比较，观察它们在合成噪声语音上的分离效果。

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
