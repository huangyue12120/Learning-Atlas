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

*数字信号处理将原始音频波形转换为机器学习模型可以学习的结构化表示。本文件涵盖了声学物理学、采样和量化、傅里叶变换（DFT、FFT）、频谱图、梅尔滤波器、MFCCs以及窗口函数，所有语音和音频AI特征提取管道的详细内容。*

- **声**是一种通过介质传播的压力波动（空气、水、固体）。一个振动物体（声带、吉他弦、扬声器锥体）推动并拉扯空气分子，创建交替的高压区域和低压区域。

- -这些压力变化向外传播，大约在空气中以343 m/s的速度传播，并到达你的耳朵，在那里它们振动耳膜并将声波转换为神经信号。

- -将声音想象成在平静的池塘中扔下一块石头：石头是振动源，涟漪是压力波，漂浮在表面的 Cork是麦克风或耳膜响应波到达时的响应。

- Cork的摆动高度是**幅度**，每秒的摆动次数是**频率**，当波到达时开始在顶部还是底部摆动是**相位**。

- **波形**是时间轴上压力（或麦克风将声音转换为电气信号后）与时间的关系图。最简单的波形是纯音，即单一的正弦波：

$$x(t) = A \sin(2\pi f t + \phi)$$
- 其中：
    - $A$是幅度（峰值偏离零点，决定响度），
    - $f$是频率（每秒循环次数，决定音调），
    - $\phi$是相位（波的到达时间偏移）。

- **周期**是$T = 1/f$，一个完整循环的时间。

![一个带有振幅、周期、频率和相位偏移的正弦波](../images/audio_waveform.svg)


- **幅度**决定了感知响度。将幅度加倍四倍增加功率（因为功率与幅度的平方成正比）。

- 人类听觉范围巨大，所以我们使用对数尺度：**分贝**（dB）。声压级为：

$$L = 20 \log_{10}\left(\frac{A}{A_\text{ref}}\right) \text{ dB}$$
- 其中$A_\text{ref}$是参考幅度（通常为听力阈值，$20 \mu\text{Pa}$）。轻微的声音大约30 dB，正常对话60 dB，摇滚音乐会100 dB。每增加6 dB大致翻倍幅度；每增加10 dB大致翻倍感知响度。这里使用的对数函数与第03章相同。

- **频率**决定了音调。低频（20-250 Hz）听起来是低音；高频（2000-20000 Hz）听起来是高音。人类听觉范围大约从20 Hz到20 kHz。A4音符的频率为440 Hz。将频率加倍升高一个**八度**。

- 大多数自然声音都不是纯音，而是由多种频率的混合体构成，这就是为什么钢琴和小提琴演奏同一音符时听起来不同：它们共享相同的 **基频**，但因各自的 **谐波**（基频的整数倍）和相对振幅（ **音色**）而有所不同。

- **相位**决定了波在哪个周期开始。两个具有相同振幅和频率但不同相位的波可以相互叠加（相位一致，振幅相加）或相互抵消（相位相反，振幅相减）。

- 频率在立体音频和波束形成中至关重要，但在许多语音处理管道中被忽视，因为人类的音调和音色感知主要对频率变化不敏感。

- 实际世界的声音信号是 **连续** 的时间函数，但计算机使用离散数字。 **采样** 将一个连续信号转换为离散序列，通过在定期间隔测量信号的值来实现。

- **采样率** $f_s$ 是每秒测量次数。CD音频使用 $f_s = 44{,}100$ Hz；电话使用 8000 Hz；现代语音模型通常使用 16000 Hz。

- 根据奈奎斯特- Shannon采样定理，只有当采样率至少是信号最高频率的两倍时，连续信号才能从其样本中完美重建。

$$f_s \geq 2 f_\text{max}$$
- 信号的频率 $f_s / 2$ 被称为 **奈奎斯特频率**。如果信号包含高于奈奎斯特频率的频率，这些频率会折叠回有效范围内，并以虚假的低频分量出现。这种现象被称为 **混叠**。混叠是不可逆的：一旦发生，原始信号就无法从采样中恢复。

- 轮子效应是电影中轮子旋转慢的原因。当轮子的转速略高于帧率时，它看起来会缓慢地向后旋转。在音频中，采样率为16kHz（$f_\text{Nyquist} = 8$ kHz）的15kHz音调会被混频到$16 - 15 = 1$ kHz，这完全是一个不同的音高。

![信号的正确采样与低采样率下的混叠采样](../images/sampling_aliasing.svg)


- 为了防止混响，一个抗混响滤波器（低通滤波器）在采样之前移除所有高于 $f_s/2$ 的频率。这个滤波器由模拟到数字转换器（ADC）硬件在信号数字化之前应用。

- 量化将每个连续值样本映射到有限级中的最近值。一个 $n$ 位量化器有 $2^n$ 级。 CD 音频使用 16 位量化（ $2^{16} = 65{,}536$ 级）；电话通常使用 8 位，采用 $\mu$ 法或 A-law **压缩**（一个非线性映射，将更多级分配给小幅度，匹配人类感知）。量化引入 **量化噪声**，一种形式的舍入误差，其方差为 $\Delta^2/12$，其中 $\Delta$ 是级之间的步长。

- **时域分析**直接从波形中提取特征，而不将其转换到另一个域。这些特征简单、快速计算，并捕捉基本信号属性。

- **能量** 一帧 $N$ 样本的总响度。

$$E = \sum_{n=0}^{N-1} x[n]^2$$
- 语音片段具有高能量；静音具有低能量。能量是第01章中定义的平方 $\ell_2$范数应用于信号向量的结果。

- 零交叉率（ZCR）计算信号在帧中变化符号的次数：

$$\text{ZCR} = \frac{1}{2(N-1)} \sum_{n=1}^{N-1} |\text{sign}(x[n]) - \text{sign}(x[n-1])|$$
- 高的 ZCR 表示高频内容或噪声；低的 ZCR 表示低频或有声语音（其中声带会周期性振动）。ZCR 是一个粗略的频率估计器：在 $f$ Hz 的纯音中，每秒跨越零 $2f$ 次。

- 自相关性度量一个信号与自身延迟版本的相似程度：

$$R[k] = \sum_{n=0}^{N-1-k} x[n] \cdot x[n+k]$$
- 在延迟 $k = 0$ 处，自相关等于能量。对于周期信号，自相关在延迟等于周期及其倍数时有峰值。这是 **音高检测** 的标准技术：找到 $R[k]$ 后 $k=0$ 之后的第一个显著峰值，并且音高为 $f_s / k_\text{peak}$。自相关与第 01 章中的点积有关：$R[k]$ 是信号与其 $k$ 移位版本的点积。

- 频域分析揭示了信号的频谱内容，这些内容在时域波形中不可见。关键工具是离散傅里叶变换（DFT），它将包含 $N$ 个样本的信号分解为 $N$ 个复数频率分量：

$$X[k] = \sum_{n=0}^{N-1} x[n] \cdot e^{-j 2\pi k n / N}, \quad k = 0, 1, \ldots, N-1$$
- 每个 $X[k]$ 是一个复数，其幅度 $|X[k]|$ 表示在 $f_k = k \cdot f_s / N$ Hz 频率成分的振幅，而相位 $\angle X[k]$ 表示相位偏移。DFT 是将时间域基（单位脉冲）转换为频率域基（复指数）的一种直接应用，这是从第 02 章中引入的基础概念。DFT 可以写成矩阵乘法 $\mathbf{X} = W \mathbf{x}$，其中 $W$ 是 $N \times N$ 的 DFT 矩阵，其条目为 $W_{kn} = e^{-j2\pi kn/N}$。

- 快速傅里叶变换（FFT）是一种算法，它可以在 $O(N \log N)$ 次操作内计算 DFT，而不是 naive 的 $O(N^2)$。通过递归地将问题拆分为偶数索引和奇数索引的子问题（Cooley-Tukey 算法），这种加速使得实时频谱分析成为可能。FFT 是所有计算中最重要的算法之一。

- **频谱** $|X[k]|^2$ 显示能量在频率上的分布。**幅度谱** $|X[k]|$ 显示振幅。绘制这些可以揭示信号中哪些频率占主导地位：元音有强的谐波，其频率为基频的整数倍；摩擦音（如“s”）具有广泛的高频率能量。

- **频谱图** 是一种表示信号随时间变化的频率内容的视觉表示。它通过将信号分成短重叠帧，计算每个帧的FFT，然后将这些结果的幅度谱堆叠起来来计算。水平轴是时间，垂直轴是频率，每个点的颜色（或亮度）代表幅度。频谱图在音频处理中是最重要的可视化工具之一。

![显示时间在水平轴，频率在垂直轴，强度为颜色的频谱图](../images/spectrogram_stft.svg)


- **梅尔频谱**是人类感知音高的一种感知频率尺度。人类感知两个频率的等比关系与感知两个音高的等比关系相同（就像我们感知两个强度的等比关系与感知两个响度的等比关系相同）。在1000 Hz以下，梅尔频谱大约线性变化；在1000 Hz以上，它大约对数变化：

$$m = 2595 \log_{10}\left(1 + \frac{f}{700}\right)$$
- 反转是 $f = 700(10^{m/2595} - 1)$。音阶的原理使音乐半音在频率轴上均匀分布：从 A4（440 Hz）到 A5（880 Hz），再到 A5 到 A6（1760 Hz），它们都听起来像是“一个八度高”，尽管 Hz 的间隔分别是 440 和 880。

- **滤波器组** 是一组均匀分布在梅尔尺度上的三角带通滤波器。每个滤波器覆盖一个频率范围，并将该范围内频谱能量的总和转换为单个数值。典型的语音系统使用40到80个梅尔滤波器。低频滤波器窄（在我们感知敏感度高的频率区域），高频滤波器宽（在我们感知敏感度低的频率区域）。这种频率分辨率与人类听觉器官的频率分辨率相似。

![线性频率轴上叠加的三角形梅拉滤波器组，低频处窄滤波器和高频处宽滤波器](../images/mel_filterbank.svg)


- **梅尔频率系数**（MFCCs）是语音和音频的经典特征表示。它们将梅尔频谱压缩成少量不相关的系数，这些系数捕捉了声谱轮廓的形状（编码声道配置和因此音素身份），同时丢弃了细部声谱细节（编码音高和相位）。

- MFCC流程：
    1. **预加重**：应用一个第一阶高通滤波器 $y[n] = x[n] - \alpha x[n-1]$（通常 $\alpha = 0.97$）来增强声带通过 Vocal tract时被衰减的高频。
    2. **分帧**：将信号切成重叠帧（通常 25 毫秒长，间隔 10 毫秒）。
    3. **窗函数**：对每个帧乘以窗函数（汉明窗），以减少频谱泄漏（见下文）。
    4. **FFT**：计算每个窗函数后的功率谱。
    5. **梅尔滤波器组**：将功率谱应用到梅尔滤波器组，产生梅尔带能量。
    6. **对数**：取梅尔带能量的对数。对数压缩动态范围，并将乘法（声带成分）转换为加法，匹配人类听觉感知。
    7. **DCT**：应用离散余弦变换（DCT）到对数梅尔能量。DCT去相关梅尔带（由于相邻带高度相关），并将能量压缩到前几个系数中。保留前 13 个系数（MFCC-0 到 MFCC-12）。

![从原始音频到窗口化帧、FFT、梅拉滤波器组、对数压缩和DCT的MFCC管道，最终得到MFCC特征](../images/mfcc_pipeline.svg)


- 步骤 7 中的 DCT 实际上是“频谱的傅里叶变换”（因此名称 **cepstrum** =频谱的同义词）。低阶 cepstral系数捕捉声带共振（称为 **formants**）的大体频谱形状，而高阶系数捕捉细部频谱细节（音调谐波）。通过保留前 13 个，我们保留了 formant信息并丢弃了 pitch细节。

- **Delta** 和 **delta-delta** MFCCs（MFCC在相邻帧之间计算的首、二阶导数，通过有限差分）捕捉声带形状的变化，添加时间上下文。一个完整的 MFCC特征向量通常有 39 维：13 静态 + 13 Delta + 13 delta-delta。

- 现代神经网络模型（第 6 章）大多已经取代了 MFCCs，转而使用学习特征：步骤 6 的对数梅尔频谱图（跳过 DCT）是深度学习 ASR 和音频分类的标准输入。模型自己学习去相关性。尽管如此，MFCCs 在低资源设置、经典 ML 管道和理解信号处理基础方面仍然非常重要。

- **窗函数** 是在计算 FFT 之前对信号帧乘以平滑窗函数的过程。没有窗函数，FFT 假设帧无限重复；声带帧的 abrupt开始和结束创建了人工断层，将能量扩散到所有频率，这种现象称为 **频谱泄漏**。

- **矩形窗** $w[n] = 1$ 对于所有 $n$：没有平滑，最大泄漏，但主波瓣最宽（给定帧长的最佳频率分辨率）。在实践中很少使用。

- **汉明窗**：$w[n] = 0.54 - 0.46 \cos(2\pi n / (N-1))$。边缘逐渐减小到接近零，极大地减少了泄漏。在语音处理中使用最广泛。

- **汉宁窗**（也称为汉宁）：$w[n] = 0.5 - 0.5 \cos(2\pi n / (N-1))$。在边缘精确地归零。与汉明窗口非常相似，但具有稍好的旁瓣抑制效果。

- **黑曼窗**：$w[n] = 0.42 - 0.5 \cos(2\pi n / (N-1)) + 0.08 \cos(4\pi n / (N-1))$。更好的旁瓣抑制但主瓣更宽（频率分辨率较差）。当旁瓣 artifacts特别严重时使用。

- 存在一个基本的权衡：泄漏较少的窗户有更宽的主要波瓣，这意味着它们无法分辨两个非常接近的频率。这是“频谱分辨率与泄漏之间的权衡”，这是来自第03章的不确定性原理的结果。

- **重叠加法**（OLA）是一种从窗口化、处理后的帧中重建信号的技术。帧之间存在重叠（通常为50%-75%），在处理后，窗口化的输出被相加。如果选择的窗函数和重叠方式正确（例如使用Hann窗并设置50%的重叠），重叠的窗口会相加成一个常数，从而实现完美的重建。这对于任何基于帧的音频修改（噪声抑制、音调变化、时间拉伸）都是至关重要的。

- 短时傅里叶变换（STFT）是频谱图的基础框架。它将信号的每个窗口帧应用到DFT上：

```math
\text{STFT}\{x[n]\}(m, k) = \sum_{n=0}^{N-1} x[n + mH] \cdot w[n] \cdot e^{-j 2\pi k n / N}
```

- 在 $m$ 中是帧索引，$H$ 是跳步大小（相邻帧之间的样本数），$w[n]$ 是窗函数，而 $N$ 是 FFT 大小。输出是一个 2D 复数值矩阵：信号的时间频率表示。

- STFT 实现了时间频率之间的基本 **时频权衡**：
    - 长帧（大 $N$）具有高频率分辨率（可以区分相邻的频率），但时间分辨率较差（无法精确 pinpoint频率的变化）。
    - 短帧（小 $N$）具有高时间分辨率，但频率分辨率较差。
    - 时间分辨率和频率分辨率的乘积在下界被限制： $\Delta t \cdot \Delta f \geq \frac{1}{4\pi}$。这是信号处理领域中 Heisenberg 不确定性原理的信号处理版本。

- 常见的STFT参数：25毫秒帧长（在16 kHz时为$N = 400$），10毫秒步长（$H = 160$），汉明窗，512点FFT（为了效率和 smoother的频谱插值，从400点零填充）。

- **滤波器**通过放大某些频率并衰减其他频率来修改信号的频谱。一个**滤波器**是一个系统，它接收输入信号并产生输出信号。滤波器由其**频率响应** $H(f)$ 描述，该描述了每个频率上的增益和相移。

- 低通滤波器：通过截止频率 $f_c$ 传递低于该频率的频谱，并抑制高于该频率的频谱。去除高频噪声和细节。在采样之前，用于抗混叠的低通滤波器也是低通滤波器。

- **高通滤波器**：通过频率高于 $f_c$ 并抑制低于的频率。去除低频 rumble 和 DC 偏移。MFCC 提取（$y[n] = x[n] - 0.97 x[n-1]$）中的预加重滤波器是一个简单的高通滤波器。

- **带通滤波器**：通过频率在 $[f_1, f_2]$ 范围内的信号，抑制其他频率。每个梅尔滤波器中的三角形都是带通滤波器。

- **带阻滤波器（去噪滤波器）**：抑制特定窄频范围内的信号。用于去除特定干扰（例如，50/60 Hz的电源线噪声）。

- 一个有限 impulse响应（FIR）滤波器通过计算当前和过去输入样本的加权和来计算每个输出样本：

$$y[n] = \sum_{k=0}^{M} b_k \cdot x[n-k]$$
- $b_k$ 是滤波器系数（也称为“脉冲”）。该滤波器的阶数为 $M$。FIR 滤波器总是稳定的（输出永远不会发散），并且可以设计为具有完全线性相位（所有频率都延迟相同的时间，保留波形形状）。它们的缺点是实现尖锐截止需要许多脉冲（高 $M$），增加了计算量。输出是输入与系数向量的卷积，正好是第 06 章中介绍的 1D 卷积操作。

- 无限 impulse响应（IIR）滤波器使用反馈：输出不仅依赖于过去的输入，还依赖于过去的输出。

```math
y[n] = \sum_{k=0}^{M} b_k \cdot x[n-k] - \sum_{k=1}^{L} a_k \cdot y[n-k]
```

- 反馈项 $a_k$ 创建一个具有无限持续时间 impulse响应的递归结构。IIR滤波器由于使用较少系数就能实现尖锐截止，但它们可能会不稳定（如果传递函数的极点位于单位圆外，这是一些概念）。 $z$- 变换。它们还具有非线性相位，这会扭曲波形形状。经典滤波器设计（但瓦特、切贝谢夫、椭圆）是IIR。

- 离散时间滤波器的传输函数通过 $z$ 变换获得。

$$H(z) = \frac{\sum_{k=0}^{M} b_k z^{-k}}{1 + \sum_{k=1}^{L} a_k z^{-k}}$$
- 根据分子的根被称为零，根据分母的根被称为极点。极点零图完全描述了滤波器的行为。靠近单位圆的极点放大附近频率；靠近单位圆的零衰减它们。FIR滤波器只有零（分母是1）。这与第02章和第03章中的特征值和根查找概念连接起来。

- **卷积定理**：时域的卷积等于频域的点乘。这意味着滤波可以通过直接将信号与滤波器冲激响应相卷积来实现，或者通过计算它们的傅里叶变换并逆变换结果来实现。对于较长的滤波器，频域方法（使用FFT）更快：$O(N \log N)$ versus $O(NM)$。

- 反向短时傅里叶变换（iSTFT）从其频域表示中重建时间域信号。这是任何修改音频在频率域的系统（噪声抑制、源分离、语音转换等）所必需的。重建使用重叠添加：

```math
x[n] = \frac{\sum_{m} w[n - mH] \cdot \text{IDFT}\{X(m, k)\}[n - mH]}{\sum_{m} w[n - mH]^2}
```

- 分母用于归一化窗口重叠，确保在分析窗和合成窗匹配且重叠足够时实现完美的重建。

- **语音处理链的总结**：原始音频以16 kHz采样，经过预增强后，被切成25 ms的汉明窗口帧，间隔为10 ms，每个帧进行FFT变换，通过梅尔滤波器bank进行过滤，然后进行对数压缩。最后，这些特征要么作为对数梅尔特征（用于神经网络模型），要么进行DCT变换以生成MFCCs（对于经典模型）。整个链将一个一维时间域信号转换为适合下游机器学习的二维时间频率表示，这将是文件02的主题。

## 编程任务（使用 CoLab 或 笔记本）

1. 生成一个正弦波，以不同采样率对其进行采样，并演示混叠现象。绘制连续信号、正确采样的版本和欠采样（混叠）版本的图像。
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

2. 计算并可视化由多个正弦波组成的信号的 FFT。显示幅度谱并识别构成频率。
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

3. 在 JAX 中从头构建完整的 MFCC 流程：预加重、分帧、窗口化、FFT、梅尔滤波器银行、对数和 DCT。可视化梅尔滤波器银行及其产生的 MFCCs 作为热图。
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

4. 实现 FIR 低通和高通滤波器，并可视化它们在包含低频和高频成分的信号上的效果。显示时间域和频率域视图。
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