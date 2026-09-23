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

# 源分离与噪声消除

*本篇将源分离与噪声消除放回 AI 工程语境，保留源文中的定义、公式、代码、图示和实践边界，便于逐项核对。*

* 来源分离和噪音取消从混合音频中恢复单个信号;计算鸡尾酒派对问题. 该文件涵盖ICA,NMF,时间频率遮掩,光束造型,深度学习分离网络(Conv-TasNet,SepFormer),语音增强和适应性噪声取消. *

- 想象一下,站在一个拥挤的鸡尾酒会。数十人同时交谈,音乐在演奏,眼镜在凝结,然而你却可以专心于一次对话,并清晰地遵循. 这种非凡的能力,即**鸡尾酒会问题**(Cherry,1953),是人类听力系统无劳地解决的,但机器发现异常困难. 此文件涵盖了尝试它的算法:分离混合音频源,取消不想要的噪音,在不利条件下增强语音.

- 文件01(STFT,分光克,滤波库)的信号处理基础支撑着这里的每一种方法. 第02章(NMF,ICA,SVD)的矩阵分解技术提供了经典工具包. 第06章(CNNs,RNNs,注意)的深度学习架构和从第04/05章起的概率理论为现代方法提供了参考.

![图示](../images/cocktail_party.svg)

- ** 问题制剂**:混合信号$x(t)$在一个或多个麦克风上观察到。混合物是(最简单的情况下)$C$源信号 :

$$x(t) = \sum_{c=1}^{C} s_c(t) + n(t)$$

- 地点$s_c(t)$是那个$c$- 源信号和$n(t)$是背景噪声。目标是恢复个人$s_c(t)$从$x(t)$。。。在单个麦克风的情况下, 情况严重不足:$C$未知数 需要更多的假设(统计独立性、光谱结构、学到的前科),使问题能够被引导。

- 在频率域(通过文件01的STFT),混合物会变成:

$$X(t, f) = \sum_{c=1}^{C} S_c(t, f) + N(t, f)$$

- 许多分离方法通过估计**mask**在时间频率领域起作用.$M_c(t, f) \in [0, 1]$,然后将源恢复为$\hat{S}_c(t, f) = M_c(t, f) \cdot X(t, f)$。。。双面罩(IBM)**套$M_c(t, f) = 1$如果来源$c$控制了时间频率的bin和0。** 理想比率口罩**是一个软版本:

$$\text{IRM}_c(t, f) = \frac{|S_c(t, f)|^2}{\sum_{j=1}^{C} |S_j(t, f)|^2}$$

- ** 独立组件分析**是麦克风数等于或超过来源数时的经典方法。ICA(第02章) 找到一个线性未混合矩阵$W$这样的话$\hat{s} = Wx$,其中回收来源$\hat{s}$在统计上是最大的独立。关键假设是源信号是非高斯函数且独立,这通常对语音和音乐有效.

- 多麦克风瞬间混合模型$x = As$(何处)$A$是混合矩阵, ICA 恢复$W \approx A^{-1}$最大限度地提高产出的非高斯性(FastICA使用阴性)或尽量减少相互信息。ICA在受控环境下运作良好,但在混合涉及分化(室回响),源数超过麦克风,或独立性假设被违反时失败.

- ** 非负矩阵因子化(NMF)** 分解等分光谱$V \in \mathbb{R}_+^{F \times T}$成为两个非负性矩阵的产物(第02章):

$$V \approx WH$$

- 地点$W \in \mathbb{R}_+^{F \times K}$是一个字典,其中包含$K$光谱基向量和$H \in \mathbb{R}_+^{K \times T}$包含随时间推移的活化系数。非负性约束是生理上的动机: 等分是非负性的,而音能结合了添加.

- 关于源分立,NMF学习了每个源的分出词典:$W_{\text{speech}}$捕捉语音的光谱模式(成型结构),同时$W_{\text{noise}}$捕捉出噪音图案。混合物被分解为:$V \approx W_{\text{speech}} H_{\text{speech}} + W_{\text{noise}} H_{\text{noise}}$,每个来源都通过蒙面恢复。将使用带有Frobenius规范或KL差分的乘法更新作为成本函数最小化:

```math
\begin{aligned}
\text{Frobenius:} \quad D_F(V \| WH) &= \|V - WH\|_F^2 \\
\text{KL:} \quad D_{KL}(V \| WH) &= \sum_{f,t} \left[ V_{ft} \log \frac{V_{ft}}{(WH)_{ft}} - V_{ft} + (WH)_{ft} \right]
\end{aligned}
```

- ** 光束形成**利用麦克风阵列提供的空间信息。当一个源信号到达不同的麦克风并有不同的延迟(因为空间安排)时,这些延迟可以用来从一个方向增强信号,同时压制其他方向.

![图示](../images/beamforming.svg)

- ** 延后和通束制**是最简单的办法。如果想要的源处于角度上$\theta$相对于阵列,麦克风上的延迟时间$m$实值$\tau_m(\theta) = d_m \sin \theta / c$,在其中$d_m$是麦克风的位置,并且$c$是声音的速度。光束输出对齐并汇总麦克风信号:

$$y(t) = \frac{1}{M} \sum_{m=1}^{M} x_m(t - \tau_m(\theta))$$

- 从目标方向发出的信号会连贯地添加出信号,而从其他方向发出的信号会不连贯地添加出信号,提供空间过滤. 阵列几何决定了空间分辨率:较大的阵列给出更窄的束.

- ** 最小差异扭曲反应** 光束选择式在不扭曲地通过目标方向时将加权以最小化总输出功率:

```math
\begin{aligned}
\min_{\mathbf{w}} \quad & \mathbf{w}^H \Phi_{nn} \mathbf{w} \\
\text{subject to} \quad & \mathbf{w}^H \mathbf{d}(\theta) = 1
\end{aligned}
```

- 地点$\Phi_{nn}$是噪声空间相变矩阵和$\mathbf{d}(\theta)$是方向的向导$\theta$。。。封闭式解决方案是:

$$\mathbf{w}_{\text{MVDR}} = \frac{\Phi_{nn}^{-1} \mathbf{d}(\theta)}{\mathbf{d}(\theta)^H \Phi_{nn}^{-1} \mathbf{d}(\theta)}$$

- MVDR通过使用估计的噪声共变来适应噪声环境,提供比延迟和更好的干扰拒绝. 它被广泛用于助听器,智能扬声器和电话会议系统.

- ** 深入学习源分离** 显著地改善了业绩,特别是在古典方法挣扎的单麦克风案件中。一般的范式是:用神经网络来编码混合物,估计口罩或源表示,并解码以回收单个源.

- **深聚**(Hershey等,2016年)将每个时间频率的bin嵌入到一个高维空间中,属于同源的bin相接相接相接相接,不同来源的bin相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接相接 双向 LSTM(第06章) 映射每个 T-F 弹框$(t, f)$到嵌入处$v_{t,f} \in \mathbb{R}^D$。。。培训目标是:

$$\mathcal{L} = \|VV^T - YY^T\|_F^2$$

- 地点$V$是嵌入和$Y$是源任务的一个热矩阵。产品$VV^T$是一个相近矩阵(两个相近的宾箱嵌入物是如何存在的),以及$YY^T$是理想的亲和性(如果同一来源,0 否则)。推想出,嵌入物上的K-意指集群产生二进制口罩.

- ** Conv-TasNet**(Luo和Mesgarani,2019年)完全运行在时间域,绕过STFT. 它有三个组成部分:

![图示](../images/conv_tasnet.svg)

- ** Encoder**:一维分解图将混合物波形的短段图示为潜在代表. 对于混合物$x \in \mathbb{R}^T$,编码器输出为$w = \text{ReLU}(U \ast x) \in \mathbb{R}^{N \times L}$,在其中$U$是一种可学习的基础(类似于STFT基础,但从数据中吸取了教训);$N$是基础函数的数量,以及$L$是分数。编码器内核大小和出行速度(通常为2ms和1ms)决定了时间分辨率.

- ** 分离器**:一个** 临时卷积网络** 处理编码的混合物和输出$C$口罩 口罩 口罩 口罩 TCN堆积了被放大的 1D 深度分解的相分化(从 第08章高效相分解) 成块并有指数式增长的相分化因子$1, 2, 4, \ldots, 2^{B-1}$,重复$R$时间。这使得在保持计算效率的同时,有一个非常大的可接受字段.

- ** Decoder**:转录的1D卷积(有学习基础)$V$)将每个被遮住的表示器转换回时间域:$\hat{s}_c = V^T (M_c \odot w)$.

- Conv-TasNet显著地超越了基于分光克的方法,因为所学的编码器-解码器基础可以捕捉STFT分量所丢弃的信息(尤其是相位).

- ** Dual-Path RNN(DPRNN)** (Luo等,2020年)解决了分离中的长序列建模问题. DPRNN不是用单个RNN或TCN处理整个被编码的序列,而是将序列分成相重叠的块并沿两条路径应用RNNs:一** in-chunk**路径(在每个块内模拟局部图案)和一** achunk**路径(跨块模拟全局图案). 这会减少 RNN 序列长度从$L$改为$\sqrt{L}$在每一方面:

```math
\begin{aligned}
\text{Intra-chunk:} \quad & h_{k,n}^{\text{intra}} = \text{BiLSTM}_{\text{intra}}(z_{k,n}) \\
\text{Inter-chunk:} \quad & h_{k,n}^{\text{inter}} = \text{BiLSTM}_{\text{inter}}(h_{k,n}^{\text{intra}})
\end{aligned}
```

- 地点$k$索引块和$n$索引块内的位置。内部的 LSTTM 进程$n$固定费用$k$; 跨圆柱的 LSTTM 进程$k$固定费用$n$.

- ** SepFormer**(Subakan等人,2021年)用变压器取代双路径框架中的RNN(第07章)。圆通内变压器以自心取局部依赖性,圆通间变压器取全球依赖性. 多头注意力在不消失的梯度问题(第06章)下模拟长程依赖的能力使得SepFormer对长相录音特别有效. SepFormer在WSJ0-2mix基准上实现了最先进的成绩.

- ** Permutation Invariant Training (PIT)**解决了受监督源分离中的一个根本问题:标签分配模糊. 如果网络有两个产出(两个发言者),哪些产出应对应哪个发言者? 没有自然的命令。PIT计算所有可能的任务的损失,并至少采取以下措施:

$$\mathcal{L}_{\text{PIT}} = \min_{\pi \in \mathcal{P}} \sum_{c=1}^{C} \ell(\hat{s}_{\pi(c)}, s_c)$$

- 地点$\mathcal{P}$是所有布局的一组$\{1, \ldots, C\}$财务报告和已审计财务报表$\ell$即每源损失(典型的尺度-不变量信号-分解比,SI-SDR). 用于$C = 2$来源只有2个;$C = 3$有6个 使用匈牙利算法高效计算$C$.

- ** 比例-不变量信号对分解比率(SI-SDR)** 是源分离的标准评价指标:

```math
\begin{aligned}
s_{\text{target}} &= \frac{\langle \hat{s}, s \rangle}{\|s\|^2} s \\
e_{\text{noise}} &= \hat{s} - s_{\text{target}} \\
\text{SI-SDR} &= 10 \log_{10} \frac{\|s_{\text{target}}\|^2}{\|e_{\text{noise}}\|^2}
\end{aligned}
```

- 地点$\hat{s}$是估计来源,并且$s$才是事实 SI-SDR与估计的整体尺度不相干,这是可取的,因为绝对体积不如分离的质量重要. 更高的SI-SDR(以dB计)更好. 先进系统在WSJ0-2mix上实现约20-22分贝SI-SDR改进.

- **Music source screw** 将一首音乐录音分出出来:相声,鼓,低音等乐器. 这使得各种应用如卡拉OK(移相相声),再混合(正弦乐等),以及抄写(一次分析一款乐器).

- ** Open-Unmix**(Stoter等,2019年)是参考基准,使用3层双向LSTM来预测星等STFT域中每个源的软口罩. 它用一个专门的模型独立处理每个源. 简单而有效的开放-Unmix为MUSDB18建立了可复制的基准。

- ** Demucs**(Defossez等,2019;更新为Hybrid Demucs,2021)使用一款直接在波形上运行的U-Net架构(第08章). 编码器会通过被扭曲的相接子来压缩混合物,解码器通过有跳过连接的转接相接子来将混合物回放,每个源都会得到自有的分解头. **Hybrid Demucs**结合了时间域和频率域处理:编码器有平行的时间域和STFT分支,其特性在解码器之前被熔化. 这既能捕捉出细微的时间细节,又能捕捉出光谱结构.

- Demucs在MUSDB18上实现了最先进的分出质量,相声特别强. 其U-Net架构从第08章中回想起了图像分解架构,将分解问题视为"音频分解"的一种形式.

- **活性噪声取消(ANC)**通过产生破坏性干扰噪声的反噪信号来减少不想要的声音. 想想噪音封杀耳机:麦克风接起环境噪声,ANC系统产生倒置版本,而组合信号(噪声+反噪声)理想地取消沉默.

- 物理学很简单:如果噪音是$n(t)$,生成$-n(t)$在同一空间点上产生沉默:$n(t) + (-n(t)) = 0$。。。挑战在于,反噪声必须在时间、振幅和相位上精确一致。甚至小错误也会产生残留噪音或文物.

- ** Feedforward ANC** 使用参考麦克风,在噪音到达收听器前取出. 系统有时间处理噪声并产生出反噪声. 参考信号通过一个适应性过滤器,其输出从出错麦克风(靠近收听器)的噪音中减去. 这对可预见的宽带噪音(引擎哼声,风扇噪音)来说是很好的.

- ** Feedback ANC**只使用一个错误麦克风在收听者的耳边. 系统估计了从剩余信号(听众实际听到的)发出的噪声,并调整了反噪. 反馈ANC比较简单(不需要参考麦克风),但带宽有限,可能变得不稳定.

- ** Adaptive filtering**是ANC背后的数学引擎. 过滤系数必须不断适应不断变化的噪音环境。最常见的算法是**东平方(LMS)**滤波器.

![图示](../images/lms_adaptive_filter.svg)

- ** LMS 算法**:带有系数的飞行情报过滤器$\mathbf{w} = [w_0, w_1, \ldots, w_{L-1}]^T$处理参考信号$\mathbf{x}(n) = [x(n), x(n-1), \ldots, x(n-L+1)]^T$。。。输出为$y(n) = \mathbf{w}^T \mathbf{x}(n)$,错误是$e(n) = d(n) - y(n)$(何处)$d(n)$是理想/主要信号,重量更新如下:

$$\mathbf{w}(n+1) = \mathbf{w}(n) + \mu \, e(n) \, \mathbf{x}(n)$$

- 地点$\mu$是步法大小(学习率)。这是平均平方误差上一个有花纹的梯度下移步骤$E[e^2(n)]$,使用瞬时梯度估计值$-2 e(n) \mathbf{x}(n)$而不是真正的梯度(第03章的梯度下降和 第06章的 SGD).

- 步骤大小$\mu$控制汇合速度和稳定状态出错之间的取舍。过于庞大,过滤器会振荡或分化;太小和适应缓慢。稳定状态是$0 < \mu < 2 / (\lambda_{\max})$,在其中$\lambda_{\max}$是输入自动连接矩阵中最大的 eigen 值$R = E[\mathbf{x}\mathbf{x}^T]$.

- ** 正常LMS(NLMS)** 以输入功率使步骤大小正常化,使收缩独立于信号级别:

$$\mathbf{w}(n+1) = \mathbf{w}(n) + \frac{\mu}{\|\mathbf{x}(n)\|^2 + \epsilon} \, e(n) \, \mathbf{x}(n)$$

- 地点$\epsilon$是一个小的正则化常数,以防止被零除去。NLMS比LMS更能可靠地聚合,因为有效的步骤尺寸适应了输入力.

- ** 递归性最小平方块(RLS)**是一个更快的交汇方式,可以将加权最小平方块成本降到最低$\sum_{k=1}^{n} \lambda^{n-k} e^2(k)$,在其中$\lambda \in (0, 1]$是一个遗忘的因素。RLS对逆自转矩阵进行估计,并进行回溯更新,以达到最佳的趋同,代价是$O(L^2)$计算每个样本(相对于$O(L)$(关于LMS).

- ** 减少噪音和增强语音** 旨在提高音频录音的语音质量和通晓性。与源分化(分离出不同的源)不同,语音增强特别针对语音+-噪音案例,从吵闹的观察中恢复干净的语音.

- ** 具体减法**是最简单的办法。在只发出噪音的框架(由VAD从文件03中检测出)中,估计噪音频谱$|\hat{N}(f)|^2$。。。然后从每个框中减去:

$$|\hat{S}(f)|^2 = \max(|X(f)|^2 - \alpha |\hat{N}(f)|^2, \beta |X(f)|^2)$$

- 地点$\alpha$是一个过低的因子(典型的为1-4,积极的去除会去除更多的噪音但引入更多的文物)和$\beta$是一种能防止负值并减少"音乐噪声"文物的光谱地层(同位素的通体残迹,听起来像随机的乐谱).

- ** Wiener过滤** 提供了干净语音频谱最小平均平方误差估计:

$$\hat{S}(t, f) = \frac{|S(t,f)|^2}{|S(t,f)|^2 + |N(t,f)|^2} \cdot X(t, f) = G(t, f) \cdot X(t, f)$$

- 维纳增益$G(t, f) = \text{SNR}(t, f) / (1 + \text{SNR}(t, f))$从0(纯噪音)到1(纯语音),作为软口罩。挑战在于估计语音和噪声动力光谱. ** 预先确定的国家自然资源保护**$\xi(t, f) = |S(t,f)|^2 / |N(t,f)|^2$使用“决定导向”方法进行估计:将当前框架的估计和前一个框架的Wiener-过滤输出平滑组合起来。

- ** 神经语音增强** 使用深层学习来估计口罩(如Wiener增益)或直接用干净分光克来估计. 建筑范围从简单的向后传输网络到U-Net(第08章)、CNN(革命经常性网络)和变压器。

- ** DCCRN**(深复杂再生网络)在复杂的STFT(大小和相位)上运作,使用复杂价值的再生,自然处理真实和想象的部分。这样做可以避免造成只采用量法的相位估计问题。

- **FullSubNet** 采用了双向结构,具有全频段模型(Caption Global光谱图案)和分频段模型(Caption local harmonic complete). 全波段模型处理整个频谱,而分波段模型则处理以每个频被子为中心的窄频段. 其产出合并为最后口罩估计数。

- ** 微软基准语音增强系统每年的挑战。胜出者一般使用具有多种噪声类型的大规模训练,数据增强(在各种SNRs上添加噪声,回声,可编码文物),以及实时能建构.

- ** Echo 取消** 在双向通信中去除相声回声. 打电话时,远端扬声器的声音会通过你的扩音器播放,弹出在房间周围,被你的麦克风接起,产生远端扬声器所听到的回声. ** 声波回声取消(AEC)** 模拟声波路径从扬声器到麦克风,并减去所预测的回声.

- 相声道被模拟为适应性FIR过滤器(使用LMS或NLMS),以远端信号为输入. 滤波器模拟了室冲应,包括直接路径,早期反射,和后反射. 室冲反应可长达数百毫秒,需要有上千个水龙头的过滤器.

- ** 双对口检测** 对AEC至关重要:当近端和远端的演讲者同时交谈时,适应性过滤器必须被冻结(停止更新)以防止其取消近端演讲者的声音. 双口探测器将出错信号的能量与远端信号能进行比较;远端信号未解释的错误能量突然增加,提示了近端语音.

- 远端信号之间**正态的交叉对接**$x(n)$和麦克风信号$d(n)$提供双对讲指标:

$$\xi(n) = \frac{|\sum_{k=0}^{L-1} x(n-k) d(n-k)|}{\sqrt{\sum_{k} x^2(n-k)} \sqrt{\sum_{k} d^2(n-k)}}$$

- 在单人谈话期间(只有远端),$\xi$高是因为$d$主要是回声$x$。。。在双人谈话时$\xi$下放,因为近端的演讲与$x$.

- 现代AEC系统将适应性滤波与神经网络结合:适应性滤波器提供了初始回声估计,神经网络(类似于上方的语音增强模型)清理出剩余回声并处理线性非线性(loudspeaker s扭曲),线性滤波器无法捕捉.

- ** 分离和加强评价指标**:
    - ** SI-SDR**(上文定义):源分离标准。
    - ** SDR**(符号对分比):从BSS Eval中,衡量整体分离质量,包括文物和干扰.
    - **PESQ(语音质量的认知评价):电联标准预测主观质量分数. 范围:-0.5至4.5.
    - **STOI** (Short-Time Goal Incellibility):预测语音能被理解. 范围:0至1.
    - ** DNSMOS**:微软深层噪声压制MOS预测器,一个神经网络,训练以预测人类MOS分数而不需要干净的参考音频.

## 编程任务（使用 Colab 或 notebook）


- ** 任务1:独立组件分析,用于源分离。** 实施FastICA,将两个混合音频源分离出,以展示典型的鸡尾酒派对解决方案(平等来源和麦克风)。

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

- **任务2:基于NMF的源分取光谱. ** 使用非负矩阵分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分出分分出分出分出分出分出分出分的分出分的分的分分出分出分出分出分出分出分出分分出分出分

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

- ** 任务3:LMS适应性过滤器用于噪声取消.** 采用回声/噪声取消的LMS和NLMS算法,显示同位素行为和步长的效果.

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

- **任务4:为语音增强而进行时间频率遮罩. ** 采用简单的光谱遮罩方法(理想比掩罩)并和光谱减法相比较,可视化地在合成的吵闹语音信号上实现分出质量.

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
