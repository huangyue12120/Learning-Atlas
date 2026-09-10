---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 09 - audio and speech/01. digital signal processing.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 1c39b35b0c2eeaee22cf5bea77b2a377a78c362b09b7878239dd52770d813d6b
status: reviewed
---

# 数字信号处理

*数字信号处理把原始音频波形转换为机器学习模型可以学习的结构化表示。本篇介绍声音物理、采样与量化、傅里叶变换（DFT、FFT）、频谱图、梅尔滤波器组、MFCC 和加窗；它们构成所有语音与音频 AI 的特征提取流水线。*

- **声音**是通过介质（空气、水或固体）传播的压力波。振动物体（声带、吉他弦、扬声器锥盆）推拉空气分子，形成交替出现的高压区（压缩）和低压区（稀疏）。

- 这些压力变化以约 343 m/s 的速度在空气中传播到达耳朵，使鼓膜振动并转换为神经信号。

- 可以把声音想成向平静池塘中投入一块石头：石头是振动源，涟漪是压力波，水面上随波起伏的软木塞就是响应波到来的麦克风或鼓膜。

- 软木塞起伏的高度是**振幅**，每秒起伏的次数是**频率**，波到达时软木塞从周期的顶部还是底部开始是**相位**。

- **波形**是把压力（或麦克风将声音转换为电信号后的电压）相对于时间绘出的图。最简单的波形是**纯音**，即单个正弦波：

$$x(t) = A \sin(2\pi f t + \phi)$$

- 其中：
    - $A$ 是振幅（偏离零点的峰值，决定响度）；
    - $f$ 是频率，单位为 Hz（每秒周期数，决定音高）；
    - $\phi$ 是相位，单位为弧度（波形的时间偏移）。

- **周期**是 $T = 1/f$，即一个完整周期所需的时间。

![标注振幅、周期、频率和相移的正弦波](../images/audio_waveform.svg)

- **振幅**决定感知到的响度。振幅加倍，功率会变为四倍（因为功率与振幅平方成正比）。

- 人耳能听到的振幅范围极大，因此使用对数尺度：**分贝（dB）**。声压级为：

$$L = 20 \log_{10}\left(\frac{A}{A_\text{ref}}\right) \text{ dB}$$

- 其中 $A_\text{ref}$ 是参考振幅（通常是听觉阈值 $20 \mu\text{Pa}$）。耳语约 30 dB，正常谈话约 60 dB，摇滚音乐会约 110 dB。振幅每增加 6 dB 大致翻倍，感知响度每增加 10 dB 大致翻倍。这里的对数与第 03 章的函数相同。

- **频率**决定音高。低频（20–250 Hz）听起来是低音，高频（2000–20000 Hz）听起来是高音。人耳的听觉范围约为 20 Hz 到 20 kHz。音乐中的标准 A 音是 440 Hz。频率加倍，音高升高一个**八度**。

- 大多数自然声音不是纯音，而是许多频率的复杂混合。这就是为什么钢琴和小提琴演奏同一个音符听起来不同：它们有相同的**基频**，但**谐波**（基频的整数倍）及其相对振幅不同，因而**音色**不同。

- **相位**决定波形从周期的哪个位置开始。振幅和频率相同但相位不同的两个波，可以发生相长干涉（相位对齐、振幅相加）或相消干涉（相位相反、振幅抵消）。

- 相位对于立体声音频和波束成形很关键，但许多语音处理流水线会丢弃相位，因为人的音高与音色感知大多与相位无关。

- 现实音频信号是时间的**连续**函数，而计算机处理离散数字。**采样**以固定间隔测量信号值，把连续信号转换为离散序列。

- **采样率** $f_s$ 是每秒测量次数。CD 音频使用 $f_s = 44{,}100$ Hz；电话使用 8000 Hz；现代语音模型通常使用 16000 Hz。

- **奈奎斯特—香农采样定理**指出：当且仅当采样率至少是信号中最高频率的两倍时，才能从样本完美重建连续信号：

$$f_s \geq 2 f_\text{max}$$

- $f_s / 2$ 称为**奈奎斯特频率**。如果信号含有高于奈奎斯特频率的成分，这些频率会折叠回有效范围，表现为虚假的低频成分，这种现象叫**混叠**。混叠不可逆：一旦发生，无法从样本中恢复原始信号。

- 混叠的日常类比是电影中的车轮效应：车轮转速略高于帧率时，摄像机欠采样会使车轮看起来缓慢地向后转。在音频中，以 16 kHz 采样 15 kHz 音调（$f_\text{Nyquist} = 8$ kHz）会混叠到 $16 - 15 = 1$ kHz，变成完全不同的音高。

![正确采样与采样率过低导致混叠的对比](../images/sampling_aliasing.svg)

- 为防止混叠，需要在采样前用**抗混叠滤波器**（低通滤波器）移除 $f_s/2$ 以上的所有频率。模数转换器（ADC）硬件会在信号数字化前执行这一步。

- **量化**把每个连续值样本映射到有限级别集合中最接近的值。$n$ 位量化器有 $2^n$ 个级别。CD 使用 16 位量化（$2^{16} = 65{,}536$ 个级别）；电话常用带 $\mu$-law 或 A-law **压扩**的 8 位量化（非线性映射，为小振幅分配更多级别以匹配人类感知）。量化会引入**量化噪声**，它是方差为 $\Delta^2/12$ 的舍入误差，其中 $\Delta$ 是级别之间的步长。

- **时域分析**直接从波形提取特征，不把它转换到其他域。这些特征简单、计算快，可以捕获信号的基本属性。

- 一帧 $N$ 个样本的**能量**衡量总体响度：

$$E = \sum_{n=0}^{N-1} x[n]^2$$

- 语音片段能量高，静音能量低。能量就是第 01 章的平方 $\ell_2$ 范数应用于信号向量。

- **过零率（ZCR）**统计一帧中信号改变符号的次数：

$$\text{ZCR} = \frac{1}{2(N-1)} \sum_{n=1}^{N-1} |\text{sign}(x[n]) - \text{sign}(x[n-1])|$$

- 高 ZCR 表示高频内容或噪声，低 ZCR 表示低频或浊音语音（声带周期性振动）。ZCR 是粗略的频率估计器：频率为 $f$ Hz 的纯音每秒过零 $2f$ 次。

- **自相关**衡量信号与其延迟副本的相似程度：

$$R[k] = \sum_{n=0}^{N-1-k} x[n] \cdot x[n+k]$$

- 在延迟 $k = 0$ 时，自相关等于能量。对于周期信号，自相关在等于周期及其倍数的延迟处出现峰值。这是标准的**音高检测**方法：在 $k=0$ 之后找到 $R[k]$ 的第一个显著峰值，音高就是 $f_s / k_\text{peak}$。自相关与第 01 章的点积相关：$R[k]$ 是信号与其平移 $k$ 个样本版本的点积。

- **频域分析**揭示波形中看不见的频谱内容。关键工具是**离散傅里叶变换（DFT）**，它把含 $N$ 个样本的信号分解成 $N$ 个复数频率分量：

$$X[k] = \sum_{n=0}^{N-1} x[n] \cdot e^{-j 2\pi k n / N}, \quad k = 0, 1, \ldots, N-1$$

- 每个 $X[k]$ 是一个复数，其幅度 $|X[k]|$ 给出频率 $f_k = k \cdot f_s / N$ Hz 处的分量振幅，相位 $\angle X[k]$ 给出相位偏移。DFT 是从时域基（单位脉冲）到频域基（复指数）的换基，直接应用了第 02 章的基概念。DFT 也可以写成矩阵乘法 $\mathbf{X} = W \mathbf{x}$，其中 $W$ 是 $N \times N$ 的 DFT 矩阵，元素为 $W_{kn} = e^{-j2\pi kn/N}$。

- **快速傅里叶变换（FFT）**通过递归地把问题拆成偶数索引和奇数索引子问题（Cooley–Tukey 算法），以 $O(N \log N)$ 次运算而非朴素的 $O(N^2)$ 计算 DFT。这种加速让实时频谱分析成为可能。FFT 是整个计算领域最重要的算法之一。

- **功率谱** $|X[k]|^2$ 展示能量在频率上的分布，**幅度谱** $|X[k]|$ 展示振幅。绘制它们可以看出信号中占主导的频率：元音在基频整数倍处有强谐波，擦音（如 “s”）有宽广的高频能量。

- **频谱图**可视化信号频率内容随时间的变化。它把信号切成短而重叠的帧，对每帧计算 FFT，再把得到的幅度谱并排堆叠。横轴是时间，纵轴是频率，每个点的颜色（或亮度）表示幅度。频谱图是音频处理中最重要的可视化工具。

![频谱图：横轴为时间、纵轴为频率、颜色表示强度](../images/spectrogram_stft.svg)

- **梅尔刻度**是反映人类音高感知的感知频率尺度。人类把相同的频率比感知为相同的音高间隔（正如把相同的强度比感知为相同的响度间隔）。约 1000 Hz 以下，梅尔刻度近似线性；1000 Hz 以上则近似对数：

$$m = 2595 \log_{10}\left(1 + \frac{f}{700}\right)$$

- 逆变换为 $f = 700(10^{m/2595} - 1)$。梅尔刻度解释了为什么音乐半音在对数频率轴上等距：A4（440 Hz）到 A5（880 Hz）和 A5 到 A6（1760 Hz）听起来都是“升高一个八度”，尽管 Hz 间隔分别是 440 和 880。

- **梅尔滤波器组**是一组在梅尔刻度上均匀间隔的三角带通滤波器。每个滤波器覆盖一个频带，并对该频带内的频谱能量求和，产生一个数。典型语音系统使用 40–80 个梅尔滤波器。低频滤波器较窄（在感知敏感处提供高频率分辨率），高频滤波器较宽（在不敏感处提供低分辨率），这模拟了人类耳蜗的频率分辨率。

![叠加在线性频率轴上的三角梅尔滤波器组：低频滤波器窄，高频滤波器宽](../images/mel_filterbank.svg)

- **梅尔频率倒谱系数（MFCC）**是语音和音频的经典特征表示。它把梅尔频谱压缩成少量去相关系数，捕获频谱包络的形状（它编码声道构型，因而包含音位身份），同时丢弃编码音高和相位的细粒度频谱信息。

- MFCC 流水线：
    1. **预加重**：应用一阶高通滤波器 $y[n] = x[n] - \alpha x[n-1]$（通常 $\alpha = 0.97$），增强被声道衰减的高频。
    2. **分帧**：把信号切成重叠帧（通常每帧 25 ms，帧移 10 ms）。
    3. **加窗**：每帧乘以窗函数（Hamming 窗）以减少频谱泄漏（见下文）。
    4. **FFT**：计算每个加窗帧的功率谱。
    5. **梅尔滤波器组**：将三角梅尔滤波器组应用到功率谱，产生各梅尔频带的能量。
    6. **取对数**：对梅尔频带能量取对数。对数压缩动态范围，并把频谱分量的乘法变成加法，匹配人类响度感知。
    7. **DCT**：对对数梅尔能量应用离散余弦变换。DCT 让梅尔频带去相关（相邻频带高度相关），并把能量集中到前几个系数。保留前 13 个系数（MFCC-0 到 MFCC-12）。

![MFCC 流水线：从原始音频、加窗帧、FFT、梅尔滤波器组、对数压缩和 DCT 到最终 MFCC 特征](../images/mfcc_pipeline.svg)

- 第 7 步的 DCT 本质上是“频谱的傅里叶变换”（因此得名**倒谱**，cepstrum 是 spectrum 的变位词）。低阶倒谱系数捕获宽广的频谱形状（声道共振峰，称为**共振峰**），高阶系数捕获细粒度频谱（音高谐波）。只保留前 13 个系数，就保留了共振峰信息并丢弃音高细节。

- **Delta** 和 **delta-delta** MFCC（对相邻帧的 MFCC 取一阶、二阶时间导数，通常用有限差分计算）捕获频谱形状的动态，为特征加入时间上下文。完整 MFCC 特征向量通常为 39 维：13 个静态 + 13 个 delta + 13 个 delta-delta。

- 现代神经网络模型（第 06 章）大多用学习到的特征取代 MFCC：对数梅尔频谱（第 6 步输出、跳过 DCT）是深度学习 ASR 和音频分类的标准输入。模型会学习自己的去相关方式。MFCC 仍然对低资源场景、经典机器学习流水线以及理解信号处理基础很重要。

- **加窗**是在计算 FFT 前用平滑窗函数乘以信号帧。没有加窗时，FFT 假设帧无限重复；帧的突兀起止会产生人工不连续，把能量扩散到所有频率，这种伪影叫**频谱泄漏**。

- **矩形窗** $w[n] = 1$ 对所有 $n$ 成立：不衰减，泄漏最大，但主瓣最宽（对给定帧长有最好的频率分辨率），实际很少使用。

- **Hamming 窗**：$w[n] = 0.54 - 0.46 \cos(2\pi n / (N-1))$。边缘衰减到接近零，大幅减少泄漏，是语音处理的标准选择。

- **Hann 窗**（也叫 Hanning 窗）：$w[n] = 0.5 - 0.5 \cos(2\pi n / (N-1))$。边缘精确衰减到零，与 Hamming 窗非常相似，但旁瓣抑制略好。

- **Blackman 窗**：$w[n] = 0.42 - 0.5 \cos(2\pi n / (N-1)) + 0.08 \cos(4\pi n / (N-1))$。旁瓣抑制更好，但主瓣更宽（频率分辨率更差），在旁瓣伪影尤其麻烦时使用。

- 这里存在根本权衡：泄漏越小的窗，主瓣越宽，越无法分辨两个相近频率。这就是**频谱分辨率与泄漏的权衡**，是第 03 章不确定性原理的结果。

- **重叠相加（OLA）**用于从加窗并处理后的帧重建信号。帧彼此重叠（通常 50–75%），处理后把加窗输出相加。如果窗函数和重叠选择正确（例如 Hann 窗配合 50% 重叠），重叠窗之和为常数，从而完美重建。这是任何基于帧的音频修改（降噪、变调、时间伸缩）的基础。

- **短时傅里叶变换（STFT）**是频谱图背后的形式化框架。它对信号的每个加窗帧应用 DFT：

```math
\text{STFT}\{x[n]\}(m, k) = \sum_{n=0}^{N-1} x[n + mH] \cdot w[n] \cdot e^{-j 2\pi k n / N}
```

- 其中 $m$ 是帧索引，$H$ 是帧移（相邻帧之间的样本数），$w[n]$ 是窗函数，$N$ 是 FFT 大小。输出是一个二维复数矩阵，即信号的**时频表示**。

- STFT 体现了根本的**时频权衡**：
    - 长帧（大 $N$）：频率分辨率高（能区分相近频率），但时间分辨率差（不能精确定位频率何时改变）。
    - 短帧（小 $N$）：时间分辨率高，但频率分辨率差。
    - 时间分辨率与频率分辨率的乘积有下界：$\Delta t \cdot \Delta f \geq \frac{1}{4\pi}$。这就是**Gabor 极限**，是信号处理版的物理学海森堡不确定性原理。

- 典型语音 STFT 参数：25 ms 帧长（16 kHz 下 $N = 400$），10 ms 帧移（$H = 160$），Hamming 窗，512 点 FFT（从 400 点补零，以提高效率并让频谱插值更平滑）。

- **滤波**通过增强某些频率、衰减另一些频率来改变信号的频率内容。**滤波器**接收输入信号并产生输出信号，其特征由**频率响应** $H(f)$ 描述，后者说明每个频率所经历的增益和相移。

- **低通滤波器**：通过低于截止频率 $f_c$ 的频率，衰减高于它的频率，去除高频噪声和细节。采样前的抗混叠滤波器就是低通滤波器。

- **高通滤波器**：通过高于 $f_c$ 的频率，衰减低于它的频率，去除低频隆隆声和直流偏移。MFCC 提取中的预加重滤波器（$y[n] = x[n] - 0.97 x[n-1]$）就是简单的高通滤波器。

- **带通滤波器**：通过 $[f_1, f_2]$ 范围内的频率，衰减范围外的频率。梅尔滤波器组中的每个三角形都是带通滤波器。

- **带阻（陷波）滤波器**：衰减特定的窄频带，用于消除特定干扰（如 50/60 Hz 电源嗡声）。

- **有限冲激响应（FIR）**滤波器把当前和过去的输入样本加权求和，计算每个输出样本：

$$y[n] = \sum_{k=0}^{M} b_k \cdot x[n-k]$$

- 权重 $b_k$ 是**滤波器系数**（也叫抽头），滤波器阶数为 $M$。FIR 滤波器总是稳定的（输出不会发散），并且可以设计成完全线性相位（所有频率延迟相同，保持波形形状）。缺点是要得到陡峭截止需要很多抽头（高 $M$），增加计算量。输出是输入与系数向量的卷积，正是第 06 章的一维卷积操作。

- **无限冲激响应（IIR）**滤波器使用反馈：输出同时依赖过去的输入和过去的输出：

```math
y[n] = \sum_{k=0}^{M} b_k \cdot x[n-k] - \sum_{k=1}^{L} a_k \cdot y[n-k]
```

- 反馈项 $a_k$ 形成递归结构，使冲激响应在理论上无限长。IIR 用远少于 FIR 的系数就能实现陡峭截止，但可能不稳定（如果传递函数的极点位于单位圆外，输出会无界增长；这涉及 z 变换），相位也非线性，会扭曲波形。经典滤波器设计（Butterworth、Chebyshev、椭圆滤波器）都是 IIR。

- 离散时间滤波器的**传递函数**通过 z 变换得到：

$$H(z) = \frac{\sum_{k=0}^{M} b_k z^{-k}}{1 + \sum_{k=1}^{L} a_k z^{-k}}$$

- 分子的根称为**零点**，分母的根称为**极点**。极点—零点图完整刻画滤波器行为。靠近单位圆的极点会放大附近频率，靠近单位圆的零点会衰减附近频率。FIR 只有零点（分母为 1）。这连接了第 02、03 章的特征值和求根概念。

- **卷积定理**：时域卷积等于频域逐元素相乘。因此可以直接把信号与滤波器冲激响应卷积，也可以把它们的傅里叶变换相乘再做逆变换来滤波。对于长滤波器，频域方法（使用 FFT）更快：$O(N \log N)$，而直接卷积为 $O(NM)$。

- **逆 STFT（iSTFT）**从 STFT 表示重建时域信号。任何在频域修改音频的系统（降噪、源分离、音色转换）都需要它。重建使用重叠相加：

```math
x[n] = \frac{\sum_{m} w[n - mH] \cdot \text{IDFT}\{X(m, k)\}[n - mH]}{\sum_{m} w[n - mH]^2}
```

- 分母对窗重叠进行归一化；当合成窗与分析窗一致且重叠足够时，就能保证完美重建。

- **语音 DSP 链路总结**：原始音频以 16 kHz 采样，预加重后切成 25 ms 的 Hamming 窗帧、帧移 10 ms；每帧做 FFT，经过梅尔滤波器组和对数压缩，然后要么保留为对数梅尔特征（给神经网络模型），要么做 DCT 生成 MFCC（给经典模型）。整个链路把一维时域信号转换为适合下游机器学习的二维时频表示，第 02 篇将继续讨论它。

## 编程任务（使用 Colab 或 notebook）

1. 生成正弦波，以不同采样率采样并演示混叠。绘制连续信号、正确采样版本和欠采样（混叠）版本。
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt

# Parameters
f_signal = 5.0  # 5 Hz signal
duration = 1.0  # 1 second

# "Continuous" signal (very high sample rate)
t_cont = jnp.linspace(0, duration, 10000)
x_cont = jnp.sin(2 * jnp.pi * f_signal * t_cont)

# Properly sampled (fs = 50 Hz, well above Nyquist = 10 Hz)
fs_good = 50
t_good = jnp.arange(0, duration, 1.0 / fs_good)
x_good = jnp.sin(2 * jnp.pi * f_signal * t_good)

# Under-sampled (fs = 7 Hz, below Nyquist = 10 Hz) -> aliasing
fs_bad = 7
t_bad = jnp.arange(0, duration, 1.0 / fs_bad)
x_bad = jnp.sin(2 * jnp.pi * f_signal * t_bad)

# The aliased frequency: |f_signal - fs_bad| = |5 - 7| = 2 Hz
f_alias = abs(f_signal - fs_bad)
x_alias_cont = jnp.sin(2 * jnp.pi * f_alias * t_cont)

fig, axes = plt.subplots(3, 1, figsize=(12, 9))

# Plot 1: original signal
axes[0].plot(t_cont, x_cont, color='#3498db', linewidth=1.5, label=f'Original {f_signal} Hz')
axes[0].set_title(f'Original {f_signal} Hz Signal')
axes[0].set_xlabel('Time (s)'); axes[0].set_ylabel('Amplitude')
axes[0].legend(); axes[0].grid(True, alpha=0.3)

# Plot 2: proper sampling
axes[1].plot(t_cont, x_cont, color='#3498db', linewidth=1, alpha=0.4, label='Original')
axes[1].stem(t_good, x_good, linefmt='#27ae60', markerfmt='o', basefmt='k-',
             label=f'Sampled at {fs_good} Hz (above Nyquist)')
axes[1].set_title(f'Proper Sampling: fs = {fs_good} Hz > 2 x {f_signal} Hz')
axes[1].set_xlabel('Time (s)'); axes[1].set_ylabel('Amplitude')
axes[1].legend(); axes[1].grid(True, alpha=0.3)

# Plot 3: aliased sampling
axes[2].plot(t_cont, x_cont, color='#3498db', linewidth=1, alpha=0.4, label='Original')
axes[2].stem(t_bad, x_bad, linefmt='#e74c3c', markerfmt='o', basefmt='k-',
             label=f'Sampled at {fs_bad} Hz (below Nyquist)')
axes[2].plot(t_cont, x_alias_cont, color='#f39c12', linewidth=1.5, linestyle='--',
             label=f'Aliased signal appears as {f_alias} Hz')
axes[2].set_title(f'Aliased Sampling: fs = {fs_bad} Hz < 2 x {f_signal} Hz')
axes[2].set_xlabel('Time (s)'); axes[2].set_ylabel('Amplitude')
axes[2].legend(); axes[2].grid(True, alpha=0.3)

plt.tight_layout(); plt.show()
```

2. 计算并可视化由多个正弦波组成的信号的 FFT。展示幅度谱并识别组成频率。
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt

# Create a composite signal: 220 Hz + 440 Hz + 880 Hz (A3 + A4 + A5)
fs = 8000  # 8 kHz sample rate
duration = 0.1  # 100 ms
t = jnp.arange(0, duration, 1.0 / fs)
n_samples = len(t)

# Three frequency components with different amplitudes
x = 1.0 * jnp.sin(2 * jnp.pi * 220 * t) + \
    0.6 * jnp.sin(2 * jnp.pi * 440 * t) + \
    0.3 * jnp.sin(2 * jnp.pi * 880 * t)

# Compute FFT
X = jnp.fft.fft(x)
freqs = jnp.fft.fftfreq(n_samples, d=1.0 / fs)
magnitude = jnp.abs(X) / n_samples  # normalise

# Only plot positive frequencies
pos_mask = freqs >= 0
freqs_pos = freqs[pos_mask]
mag_pos = magnitude[pos_mask] * 2  # double to account for negative freq energy

fig, axes = plt.subplots(2, 1, figsize=(12, 7))

# Time domain
axes[0].plot(t * 1000, x, color='#3498db', linewidth=1)
axes[0].set_title('Composite Signal: 220 Hz + 440 Hz + 880 Hz')
axes[0].set_xlabel('Time (ms)'); axes[0].set_ylabel('Amplitude')
axes[0].grid(True, alpha=0.3)

# Frequency domain
axes[1].plot(freqs_pos, mag_pos, color='#e74c3c', linewidth=1.5)
axes[1].set_title('Magnitude Spectrum (FFT)')
axes[1].set_xlabel('Frequency (Hz)'); axes[1].set_ylabel('Magnitude')
axes[1].set_xlim(0, 1500)
# Annotate peaks
for f_peak, amp in [(220, 1.0), (440, 0.6), (880, 0.3)]:
    axes[1].annotate(f'{f_peak} Hz', xy=(f_peak, amp), fontsize=10,
                     ha='center', va='bottom', color='#9b59b6',
                     arrowprops=dict(arrowstyle='->', color='#9b59b6'))
axes[1].grid(True, alpha=0.3)

plt.tight_layout(); plt.show()
```

3. 从零用 JAX 构建完整 MFCC 流水线：预加重、分帧、加窗、FFT、梅尔滤波器组、对数和 DCT。可视化梅尔滤波器组以及作为热图的 MFCC。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

# --- Generate a synthetic speech-like signal ---
key = jax.random.PRNGKey(42)
fs = 16000
duration = 1.0
t = jnp.arange(0, duration, 1.0 / fs)

# Simulate voiced speech: fundamental + harmonics with amplitude decay
f0 = 150.0  # fundamental frequency
x = sum(jnp.sin(2 * jnp.pi * f0 * k * t) / k for k in range(1, 8))
# Add some noise
x = x + 0.1 * jax.random.normal(key, t.shape)
x = x / jnp.max(jnp.abs(x))  # normalise

# --- Step 1: Pre-emphasis ---
alpha = 0.97
x_pre = jnp.concatenate([x[:1], x[1:] - alpha * x[:-1]])

# --- Step 2: Framing ---
frame_len = int(0.025 * fs)   # 25 ms = 400 samples
hop_len = int(0.010 * fs)     # 10 ms = 160 samples
n_frames = (len(x_pre) - frame_len) // hop_len + 1
frames = jnp.stack([x_pre[i * hop_len : i * hop_len + frame_len]
                     for i in range(n_frames)])

# --- Step 3: Hamming window ---
hamming = 0.54 - 0.46 * jnp.cos(2 * jnp.pi * jnp.arange(frame_len) / (frame_len - 1))
windowed = frames * hamming

# --- Step 4: FFT ---
n_fft = 512
spectra = jnp.fft.rfft(windowed, n=n_fft)
power_spectra = jnp.abs(spectra) ** 2 / n_fft

# --- Step 5: Mel filterbank ---
n_mels = 40
f_min, f_max = 0.0, fs / 2.0

def hz_to_mel(f):
    return 2595 * jnp.log10(1 + f / 700)

def mel_to_hz(m):
    return 700 * (10 ** (m / 2595) - 1)

mel_min = hz_to_mel(f_min)
mel_max = hz_to_mel(f_max)
mel_points = jnp.linspace(mel_min, mel_max, n_mels + 2)
hz_points = mel_to_hz(mel_points)

freq_bins = jnp.floor((n_fft + 1) * hz_points / fs).astype(jnp.int32)
n_freqs = n_fft // 2 + 1
filterbank = jnp.zeros((n_mels, n_freqs))

for m in range(n_mels):
    f_left = freq_bins[m]
    f_center = freq_bins[m + 1]
    f_right = freq_bins[m + 2]
    # Rising slope
    for k in range(int(f_left), int(f_center)):
        if f_center != f_left:
            filterbank = filterbank.at[m, k].set((k - f_left) / (f_center - f_left))
    # Falling slope
    for k in range(int(f_center), int(f_right)):
        if f_right != f_center:
            filterbank = filterbank.at[m, k].set((f_right - k) / (f_right - f_center))

# Apply filterbank
mel_spectra = jnp.dot(power_spectra, filterbank.T)

# --- Step 6: Log ---
log_mel = jnp.log(mel_spectra + 1e-10)

# --- Step 7: DCT (type-II) ---
n_mfcc = 13
n_mel_channels = log_mel.shape[1]
dct_matrix = jnp.zeros((n_mfcc, n_mel_channels))
for i in range(n_mfcc):
    for j in range(n_mel_channels):
        dct_matrix = dct_matrix.at[i, j].set(
            jnp.cos(jnp.pi * i * (j + 0.5) / n_mel_channels)
        )
mfccs = jnp.dot(log_mel, dct_matrix.T)

# --- Visualisation ---
fig, axes = plt.subplots(3, 1, figsize=(14, 11))

# Mel filterbank
freq_axis = jnp.linspace(0, fs / 2, n_freqs)
for m in range(n_mels):
    color = '#3498db' if m % 2 == 0 else '#e74c3c'
    axes[0].plot(freq_axis, filterbank[m], color=color, alpha=0.6, linewidth=0.8)
axes[0].set_title(f'Mel Filterbank ({n_mels} filters)')
axes[0].set_xlabel('Frequency (Hz)'); axes[0].set_ylabel('Weight')
axes[0].grid(True, alpha=0.3)

# Log-mel spectrogram
im1 = axes[1].imshow(log_mel.T, aspect='auto', origin='lower',
                      extent=[0, duration, 0, n_mels], cmap='viridis')
axes[1].set_title('Log-Mel Spectrogram')
axes[1].set_xlabel('Time (s)'); axes[1].set_ylabel('Mel Band')
plt.colorbar(im1, ax=axes[1], label='Log Energy')

# MFCCs
im2 = axes[2].imshow(mfccs.T, aspect='auto', origin='lower',
                      extent=[0, duration, 0, n_mfcc], cmap='coolwarm')
axes[2].set_title(f'MFCCs (first {n_mfcc} coefficients)')
axes[2].set_xlabel('Time (s)'); axes[2].set_ylabel('MFCC Index')
plt.colorbar(im2, ax=axes[2], label='Coefficient Value')

plt.tight_layout(); plt.show()
```

4. 实现 FIR 低通和高通滤波器，可视化它们对同时含低频和高频成分信号的影响。展示时域和频域视图。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

# Create a signal with low (100 Hz) and high (2000 Hz) components
fs = 8000
duration = 0.05  # 50 ms for clear visualisation
t = jnp.arange(0, duration, 1.0 / fs)

x_low = jnp.sin(2 * jnp.pi * 100 * t)
x_high = 0.5 * jnp.sin(2 * jnp.pi * 2000 * t)
x = x_low + x_high

# Design a simple FIR low-pass filter using windowed sinc
def fir_lowpass(cutoff_hz, fs, n_taps=51):
    """Design FIR low-pass filter using windowed sinc method."""
    fc = cutoff_hz / fs  # normalised cutoff
    n = jnp.arange(n_taps)
    mid = (n_taps - 1) / 2.0
    # Sinc function (ideal low-pass impulse response)
    h = jnp.where(n == mid, 2 * fc,
                  jnp.sin(2 * jnp.pi * fc * (n - mid)) / (jnp.pi * (n - mid)))
    # Apply Hamming window
    window = 0.54 - 0.46 * jnp.cos(2 * jnp.pi * n / (n_taps - 1))
    h = h * window
    h = h / jnp.sum(h)  # normalise to unity gain at DC
    return h

def apply_filter(x, h):
    """Apply FIR filter via convolution."""
    return jnp.convolve(x, h, mode='same')

# Low-pass filter at 500 Hz (passes 100 Hz, blocks 2000 Hz)
h_lp = fir_lowpass(500, fs, n_taps=51)
x_lp = apply_filter(x, h_lp)

# High-pass = delta - low-pass (spectral inversion)
delta = jnp.zeros(51)
delta = delta.at[25].set(1.0)
h_hp = delta - h_lp
x_hp = apply_filter(x, h_hp)

# Compute spectra for all signals
def compute_spectrum(signal, fs):
    X = jnp.fft.rfft(signal)
    freqs = jnp.fft.rfftfreq(len(signal), d=1.0 / fs)
    mag = jnp.abs(X) / len(signal) * 2
    return freqs, mag

fig, axes = plt.subplots(3, 2, figsize=(14, 10))

# Time domain plots
for i, (sig, title, color) in enumerate([
    (x, 'Original (100 Hz + 2000 Hz)', '#3498db'),
    (x_lp, 'Low-pass filtered (< 500 Hz)', '#27ae60'),
    (x_hp, 'High-pass filtered (> 500 Hz)', '#e74c3c')
]):
    axes[i, 0].plot(t * 1000, sig[:len(t)], color=color, linewidth=1)
    axes[i, 0].set_title(f'Time Domain: {title}')
    axes[i, 0].set_xlabel('Time (ms)'); axes[i, 0].set_ylabel('Amplitude')
    axes[i, 0].grid(True, alpha=0.3)

# Frequency domain plots
for i, (sig, title, color) in enumerate([
    (x, 'Original', '#3498db'),
    (x_lp, 'Low-pass', '#27ae60'),
    (x_hp, 'High-pass', '#e74c3c')
]):
    freqs, mag = compute_spectrum(sig, fs)
    axes[i, 1].plot(freqs, mag, color=color, linewidth=1.5)
    axes[i, 1].set_title(f'Spectrum: {title}')
    axes[i, 1].set_xlabel('Frequency (Hz)'); axes[i, 1].set_ylabel('Magnitude')
    axes[i, 1].set_xlim(0, 3000)
    axes[i, 1].axvline(x=500, color='#f39c12', linestyle='--', alpha=0.7,
                        label='Cutoff (500 Hz)')
    axes[i, 1].legend(); axes[i, 1].grid(True, alpha=0.3)

plt.tight_layout(); plt.show()
```
