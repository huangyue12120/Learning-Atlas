---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 09 - audio and speech/03. text to speech and voice.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 3636c9a2e0d4c76110cacd027928d23dfad312063d641c1b9b0a3cde4184be02
status: reviewed
---
# 文本转语音与语音技术

*文本转语音（TTS）把书面文本转换为自然语音，相当于反向运行 ASR 流程。本文介绍 TTS 流水线、Tacotron、WaveNet、HiFi-GAN、语音克隆、语音转换和语音活动检测（VAD）。*

- 文件 01 介绍了信号处理工具，包括波形、频谱图、梅尔滤波器组和 MFCC；文件 02 则把语音转换成了文本。现在沿相反方向处理：输入文本，合成自然语音。这就是**文本转语音**（TTS），也是语音转换、语音克隆和语音活动检测等技术的基础。

- TTS 流水线可以看作一场演出：文本是剧本，声学模型像导演，决定每句话的音高、时长和重音；声码器再把这份“乐谱”转换成听众听到的声波。现代神经网络 TTS 已经摆脱规则系统生硬、机械的语调，合成自然度可以接近真人语音。

![TTS 流水线：文本经规范化后转换为音位，由声学模型生成梅尔频谱图，再交给声码器生成最终波形](../images/tts_pipeline.svg)

- **TTS 流水线**通常分为四步：（1）文本规范化；（2）音位转换；（3）声学建模；（4）声码器合成。有些现代系统把第三、第四步合并为一个端到端模型，但把流程拆开理解仍然有用。

- **文本规范化**把原始文本转换为可朗读的形式。例如，缩写会展开（“Dr.” 转成 “Doctor”），数字会转成词语（“1984” 转成 “nineteen eighty-four”），货币符号会读出来（“\$5” 转成 “five dollars”），网址和特殊字符也要按规则处理。这一步通常使用针对特定语言的规则和语法，也有神经网络规范化模型。这里若把 “St.” 读成 “saint” 而不是 “street”，后续阶段都会沿用错误文本，整句话便会读错。

- **字素到音位转换**（G2P）把规范化后的文本映射为音位序列。英语拼写与发音的对应关系不规则，例如 “though”、“through” 和 “tough” 中的 “ough” 发音各不相同。常见词可以查 CMU 发音词典；词典外的词则交给神经序列到序列模型处理，例如第 06 章的编码器—解码器或第 07 章的 Transformer。西班牙语、芬兰语等正字法与发音对应较规则的语言，G2P 会简单得多。输出通常是国际音标（IPA）序列，或等价的内部音位集。

- **声学模型**读取音位序列，生成中间声学表示，通常是**梅尔频谱图**（见文件 01）。梅尔频谱图记录每个时间帧的频谱包络，保留声码器重建波形所需的听觉信息。声学模型还要预测音位时长、音高（基频 $F_0$）和能量（响度）。

- **声码器**把梅尔频谱图转换为原始音频波形。这是一个条件不足的反演问题：频谱图丢失了相位信息，因此多个不同波形可能产生相同的频谱图。Griffin–Lim、WORLD 等传统声码器使用迭代算法或信号模型；如今，神经声码器的合成质量更高。

- **WaveNet 声码器**（van den Oord 等，2016）是首个能合成出几乎无法与真人录音区分的语音的神经声码器。它用自回归模型生成波形，每个采样值 $x_t$ 都根据之前的采样值预测：

$$P(x) = \prod_{t=1}^{T} P(x_t \mid x_1, \ldots, x_{t-1}, c)$$

- $c$ 是条件输入，即梅尔频谱图。每个采样值有 16 位，若直接对 65,536 个取值计算 softmax，成本会很高。WaveNet 使用 **mu-law 压扩**，把量化级数降到 256；后续变体也会使用逻辑斯蒂混合分布。

- WaveNet 的核心模块是**空洞因果卷积**。因果卷积只使用过去的采样值，不读取未来数据；空洞卷积则按指数递增的间隔跳过采样点，空洞率依次为 $1, 2, 4, 8, \ldots, 512$。这种结构让感受野随层数指数增长，而参数量仍随层数线性增长。

- 每层使用如下门控激活：

$$z = \tanh(W_{f} \ast x) \odot \sigma(W_{g} \ast x)$$

- $W_f$ 和 $W_g$ 分别表示滤波器卷积和门控卷积的权重；$\ast$ 表示空洞因果卷积；$\odot$ 表示逐元素相乘。这种门控机制与第 06 章 LSTM 中的门类似，能控制信息流。

- WaveNet 的合成质量很高，但推理速度很慢：生成 1 秒、采样率为 24 kHz 的音频，需要依次进行 24,000 次前向计算。后续声码器研究因此转向更快的生成方法。

- **WaveRNN**（Kalchbrenner 等，2018）用单层循环网络替换 WaveNet 的深层卷积堆栈。它把每个 16 位采样值拆为高 8 位和低 8 位，分别用 GRU（见第 06 章）预测。双 softmax 结构显著减少了计算量，同时保留较高的合成质量。经过内核优化后，WaveRNN 可以在手机 CPU 上实时运行。

- **WaveGlow**（Prenger 等，2019）是一种基于**归一化流**的声码器，不需要自回归生成。它使用一系列可逆变换（仿射耦合层，见第 06 章的归一化流）把简单高斯分布映射为波形分布。训练时，模型根据变量变换公式最大化精确对数似然：

$$\log P(x) = \log P(z) + \sum_{i} \log \left| \det \frac{\partial f_i}{\partial f_{i-1}} \right|$$

- $z = f(x)$ 表示把 $x$ 输入流模型后得到的潜变量。推理时，模型从标准正态分布 $z \sim \mathcal{N}(0, I)$ 中抽样，再通过逆流一次并行生成波形。WaveGlow 用更大的耦合层网络换取更快的生成速度。

- **HiFi-GAN**（Kong 等，2020）用**生成对抗网络**从梅尔频谱图合成波形。生成器先通过一系列转置卷积逐步上采样频谱图；每层后接一个**多感受野融合**（MRF）模块。MRF 并行运行多个卷积核大小和空洞率不同的残差块，再把输出相加，让生成器同时捕捉多个时间尺度的模式。

![HiFi-GAN 生成器架构：梅尔频谱图经转置卷积逐层上采样，每层后接多感受野融合模块，组合具有不同空洞率的并行残差块](../images/hifi_gan_generator.svg)

- HiFi-GAN 使用两类判别器。**多周期判别器**（MPD）按不同周期（2、3、5、7、11）折叠一维波形，把它改写为二维数据，再应用二维卷积，以捕捉不同基频下的周期结构。**多尺度判别器**（MSD）分别处理原始波形、下采样 2 倍的波形和下采样 4 倍的波形，捕捉不同时间分辨率下的模式。

- 训练目标由对抗损失、**梅尔频谱图重建损失**（合成音频与真实音频的梅尔频谱图之间的 L1 距离）和**特征匹配损失**（判别器中间层特征之间的 L1 距离）组成：

$$\mathcal{L}_G = \mathcal{L}_{\text{adv}}(G) + \lambda_{\text{mel}} \mathcal{L}_{\text{mel}}(G) + \lambda_{\text{fm}} \mathcal{L}_{\text{fm}}(G)$$

- HiFi-GAN 的合成质量可与 WaveNet 媲美，速度则快 1,000 倍以上，因此单张 GPU 就能实时生成语音。

- **神经源—滤波器模型**（NSF）结合传统信号处理与神经网络。经典源—滤波器模型把有声语音看作基频 $F_0$ 上的周期脉冲激励通过声道滤波器后的输出；声道滤波器对应频谱包络。NSF 用神经网络替换人工设计的滤波器，同时保留显式的激励信号。输入 $F_0$ 轮廓可精细控制音高，纯数据驱动声码器有时难以做到这一点。

- **Tacotron 声学模型**（Wang 等，2017）是第一个直接把字符序列转换成梅尔频谱图的端到端神经 TTS 系统。它采用带注意力的编码器—解码器架构（见第 07 章）。编码器用卷积组、高速网络和双向 GRU 处理字符或音位序列；自回归 GRU 解码器逐帧预测梅尔频谱图，并把前一帧和注意力上下文作为输入。

- **Tacotron 2**（Shen 等，2018）对该架构作了改进。编码器由 3 层一维卷积和双向 LSTM（见第 06 章）组成。解码器使用 2 层 LSTM 和**位置敏感注意力**。注意力不只依赖编码器输出和解码器状态，也会读取之前各步累积的注意力权重，从而减少跳过或重复词语的问题。

![Tacotron 2 架构：字符或音位编码器经卷积层和双向 LSTM 处理，位置敏感注意力对齐梅尔频谱帧，自回归解码器预测停止词元](../images/tacotron2_architecture.svg)

- 解码器第 $i$ 步对编码器位置 $j$ 计算的位置敏感注意力能量为：

$$e_{i,j} = w^T \tanh(W_s s_{i-1} + W_h h_j + W_f f_{i,j} + b)$$

- $s_{i-1}$ 是前一时刻的解码器状态，$h_j$ 是编码器在位置 $j$ 的输出。$f_{i,j}$ 是位置特征：先把此前累积的注意力权重 $\sum_{k<i} \alpha_{k,j}$ 通过一维卷积，再得到该特征。注意力权重为 $\alpha_{i,j} = \text{softmax}(e_{i,j})$。

- Tacotron 2 的解码器还会在每一步预测**停止词元**的概率，用它判断梅尔频谱图是否已经生成完毕。随后，声码器把梅尔频谱图转成波形；最初使用 WaveNet，之后也使用 HiFi-GAN 等模型。

- Tacotron 2 采用自回归生成，速度取决于梅尔频谱帧数。若每秒生成 80 帧，合成 5 秒语音就需要 400 个顺序解码步骤。

- **FastSpeech**（Ren 等，2019）用**非自回归**声学模型解决速度问题。它不再逐帧生成梅尔频谱图，而是并行生成所有帧。关键是预测每个音位对应多少梅尔帧，FastSpeech 用**时长预测器**完成这项工作。

- 时长预测器是一个小型卷积网络，用整数帧数预测每个音位的时长。训练时，模型用预训练自回归教师模型 Tacotron 2 的注意力对齐结果提取真实时长。推理时，**长度调节器**按预测时长重复每个音位的隐藏表示，把音位级序列扩展为帧级序列。

- **FastSpeech 2**（Ren 等，2021）取消了 FastSpeech 的教师—学生蒸馏。它直接用强制对齐提取真实时长（见文件 02 的声学模型框架），并在时长之外增加用于音高（$F_0$）和能量的**方差适配器**。每个适配器都是一个小型卷积预测器，其输出会作为解码器的条件：

```math
\begin{aligned}
\hat{d}_i &= \text{DurationPredictor}(h_i) \\
\hat{p}_i &= \text{PitchPredictor}(h_i) \\
\hat{e}_i &= \text{EnergyPredictor}(h_i)
\end{aligned}
```

- $h_i$ 表示音位 $i$ 的编码器隐藏状态。训练时使用真实值，推理时使用预测值，因此可以显式控制韵律。调节预测器的输出，就能改变音高、语速或能量，这是 FastSpeech 2 的一项重要优势。

- FastSpeech 2 的推理速度通常比 Tacotron 2 快 10–20 倍，也不会出现自回归模型常见的跳词、重复和注意力坍塌问题。

- **VITS**（Kim 等，2021）是一个直接根据文本生成波形的**端到端** TTS 模型，省去了独立声码器。VITS 将条件变分自编码器（见第 06 章）、归一化流和对抗训练结合起来。后验编码器把真实梅尔频谱图映射到潜在空间；先验编码器通过 Transformer 文本编码器和时长预测器，把音位映射到同一潜在空间；解码器基于 HiFi-GAN，从潜变量样本生成波形。

- VITS 的训练目标包括：
  - **重建损失**：促使 VAE 的潜变量保留声学信息。
  - **KL 散度**：使文本条件先验分布接近音频条件后验分布。
  - **对抗损失**：让判别器约束波形质量。
  - **时长损失**：训练随机时长预测器。

- VITS 联合优化声学模型和声码器。与 FastSpeech 2 加 HiFi-GAN 的两阶段系统相比，它减少了预测梅尔频谱图与真实梅尔频谱图不匹配造成的质量下降，因此合成质量更高。

- **VALL-E**（Wang 等，2023）把 TTS 重新表述为对离散音频词元进行**语言建模**。它用神经音频编解码器 EnCodec 把语音编码为多层码本中的离散代码。给定文本提示和一段 3 秒的注册语音，VALL-E 会先把语音编码为离散词元，再用 Transformer 语言模型自回归预测音频词元。

- VALL-E 使用两个模型：**自回归模型**（AR）逐个生成第一层码本词元；**非自回归模型**（NAR）以第一层和其他层的信息为条件，并行预测其余码本层。音频编解码器语言模型可以进行零样本语音克隆：只需 3 秒样本，就能复现说话人的声音、音色甚至情绪。

- **StyleTTS**（Li 等，2022）和 **StyleTTS 2** 把语音内容与风格分开建模。风格编码器从参考音频提取风格向量，其中包含说话人身份、韵律和录音条件。推理时，模型可以从学到的先验分布中采样风格，也可以把参考语音的风格迁移过来。StyleTTS 2 用第 08 章介绍的扩散模型生成多样、自然的韵律先验。

- **Kokoro**（2024）是一款轻量、高质量的开源 TTS 模型，参数量约 8,200 万，自然度表现突出。它采用受 StyleTTS 2 启发的架构，以扩散模型作为风格先验，并使用经过微调的 ISTFTNet 声码器。ISTFTNet 直接预测短时傅里叶变换（STFT）系数（见文件 01），而不是原始波形。Kokoro 的模型规模远小于 VALL-E，却能为英语、日语、法语、韩语和中文合成接近真人的语音，说明精心筛选训练数据并设计高效架构也能取得好效果。它体积小，适合本地和边缘设备部署。

- **Orpheus**（Canopy Labs，2025）是采用 VALL-E 开创的**音频编解码器语言模型**范式的开源 TTS 系列，提供 1B 和 3B 参数版本。它以微调后的 Llama 3 为骨干，直接生成 SNAC 音频编解码词元。模型可以自然地合成笑声、叹息、犹豫等情绪表达；输入文本中的 [laugh]、[sigh] 等标签还能细致控制这些非语言表达。

- **Dia**（Nari Labs，2025）是开源对话 TTS 模型，能根据一份文本转录生成自然的多说话人对话。它使用 16 亿参数的编码器—解码器 Transformer，可处理轮流发言、不同说话人的声音和笑声、停顿等非语言线索。输入一段较短的参考音频，它也能在对话中零样本克隆声音。

- **Sesame CSM**（对话语音模型，2025）专注于自然的多轮对话语音。它建模真实对话的动态变化，例如附和声（“uh huh”）、打断、说话人之间的节奏变化和情绪回应，而不是只优化朗读式 TTS。Transformer 骨干会同时参考文本和音频对话历史，使生成语音的风格随对话变化。

- **Fish Speech**（Fish Audio，2024）是开源 TTS 系统，采用双自回归架构：大型语言模型根据文本生成语义词元，小型模型再把它们转换成 VQGAN 声学词元，最后由声码器解码为波形。Fish Speech 可以根据 10–15 秒参考音频进行零样本语音克隆，延迟也适合实时应用。它采用模块化设计，可以独立替换声码器等组件。

- **ChatTTS**（2024）是面向聊天机器人和语音助手等对话应用的开源 TTS 模型。它通过嵌入文本的特殊词元控制笑声、停顿和填充词等韵律特征，生成自然的对话语音，并支持中英混合合成和多说话人生成。

- **Bark**（Suno，2023）是基于 Transformer 的开源模型，可以根据文本提示生成语音、音乐和音效。它使用三级 Transformer 流水线：文本 → 语义词元 → 粗粒度声学词元 → 细粒度声学词元。Bark 支持语音克隆、多语言合成，以及音乐、环境声等非语音音频。它适用范围广，但控制精度不如专用 TTS 系统。

- **Parler-TTS**（Hugging Face，2024）通过**自然语言描述**控制声音风格。用户无需提供参考音频，只要描述目标声音，例如“一位声音温暖、富有表现力、在安静房间里的女性说话人”。训练数据为每段语音配有自然语言风格描述，因此用户可以直接用文字控制合成效果。

- **Neuphonic** 是基于 API 的 TTS 平台，专为超低延迟语音合成优化，面向实时语音智能体和对话式 AI。它使用流式架构，在完整文本输入前就开始生成语音，首段音频延迟不到 100 毫秒。Neuphonic 主要优化部署和延迟，并围绕现代神经 TTS 提供生产级基础设施。

- **KittenTTS** 是紧凑、快速的 TTS 模型，面向高效和低资源部署。它优先降低延迟和模型体积，适用于边缘设备和嵌入式设备；代价是合成自然度有所下降。

- 现代 TTS 正沿两种路线发展：一类是**音频编解码器语言模型**（VALL-E、Orpheus、Fish Speech），把语音生成视为离散音频代码的下一词元预测，借助大语言模型的规模规律；另一类是**基于归一化流或扩散的模型**（VITS、StyleTTS 2、Kokoro），通过迭代过程生成连续的梅尔频谱图或波形。编解码器语言模型擅长零样本克隆和情绪表达；这类模型通常更小、速度更快。两类模型都在快速接近真人语音的自然度。

- **韵律建模**控制语音的“旋律”，包括音高、时长、能量、节奏和语调。即使每个音位发音清楚，韵律不自然也会让合成语音听起来平淡、机械。单调的 GPS 导航语音与有表现力的有声书朗读，差别就在韵律。

- **音高**由基频 $F_0$ 决定，指听者感知到的声音高低。疑问句末尾音高通常上扬，陈述句末尾通常下降；表达情绪时，音高也会连续变化。CREPE（神经网络音高跟踪器）和 YIN（基于自相关，见文件 01）等算法可以从音频提取 $F_0$。TTS 模型可以由声学模型预测音高（如 FastSpeech 2 的音高预测器），也可以隐式学习音高（如 Tacotron 2）。

- **时长**决定语速和节奏。重读音节较长，虚词常缩短，停顿标记短语边界。FastSpeech 等非自回归模型会显式建模时长；Tacotron 等自回归模型则通过注意力对齐隐式建模时长。

- **能量**（响度）能表达强调。英语句子 “I didn’t say HE stole it” 和 “I didn’t say he STOLE it” 只改变重读词，强调的内容就不同。

- **风格嵌入**捕捉更高层的韵律模式。**全局风格词元**（GST）框架（Wang 等，2018）学习一组风格嵌入，并通过软注意力提取“兴奋”“悲伤”或“耳语”等说话风格。推理时，模型从参考语音提取风格嵌入并加到编码器输出，从而迁移说话风格。

- **语音转换**（VC）在保留语言内容的同时改变说话人身份。例如，可以把自己录下的语音转换成目标说话人的声音。语音转换需要把说话人身份与语音内容分离。

![语音转换流水线：源语音被编码为内容表示和说话人嵌入，替换为目标说话人嵌入后，再由解码器生成目标声音](../images/voice_conversion_pipeline.svg)

- **说话人嵌入**（详见文件 04）用固定维度向量表示说话人身份，通常由预训练的说话人验证模型生成，例如 x-vector 或 ECAPA-TDNN。语音转换时，模型先把源语音编码为不含说话人身份的内容表示，再结合目标说话人嵌入解码。

- **解耦表示**把语音解耦为彼此独立的因素，例如内容（音位）、说话人身份、音高和节奏。常见方法包括：
  - **信息瓶颈**：压缩内容表示，尽量移除说话人信息，例如 AutoVC。
  - **对抗训练**：在内容表示上训练说话人分类器，再通过梯度反转去除说话人信息。
  - **向量量化**：VQ-VAE 把内容压入离散瓶颈；码本条目表示语音类别而非说话人特征，因此能去除说话人身份信息。

- **语音克隆**根据目标说话人的声音合成语音。**多说话人 TTS**在多个说话人的数据上训练，并以说话人嵌入作为条件。推理时，模型从注册语音提取新说话人的嵌入，再用它控制生成。

- **少样本语音克隆**只需几分钟数据就能适配新说话人。说话人编码器从注册语音提取嵌入，TTS 模型再根据该嵌入生成语音。SV2TTS（Jia 等，2018）采用这种方式，由独立训练的说话人编码器、以说话人嵌入为条件的 Tacotron 2 合成器和 WaveRNN 声码器组成。

- **零样本语音克隆**不需要适配，只需一段 3–30 秒的短语音。VALL-E 把注册语音作为语言模型的提示，使模型能沿用其中的声音。模型通过大规模多说话人数据训练，学会了在同一段语音中保持声音一致。

- **语音活动检测**（VAD）逐帧判断“当前是否有人在说话”。虽然只是二分类任务，VAD 却是 ASR（见文件 02）、说话人分段（文件 04）和降噪（文件 05）的重要预处理步骤。它可以跳过静音以减少计算，也能避免把噪声当成语音处理。

- 传统 VAD 使用能量阈值（语音通常比静音响）、过零率（语音有特定的过零模式）和频谱特征。在低信噪比环境中，这些特征容易失效。

- **神经网络 VAD**把问题视为逐帧二分类。小型 RNN 或 CNN 读取声学特征（文件 01 介绍的对数梅尔能量），预测每帧属于语音或非语音的概率。

- **WebRTC VAD**（Google）是轻量级传统 VAD，使用基于简单频谱特征的 GMM 分类器。它提供 0–3 四个激进程度等级，运行很快，但难以处理音乐、非语音发声和低信噪比环境。由于不依赖额外组件，它仍常用作基线。

- **Silero VAD**（Silero Team，2021）已成为生产环境中事实上的神经网络 VAD 标准。它用一小组深度可分离一维卷积（把第 08 章 MobileNet 的思路用于音频）提取特征，再接一层 LSTM 建模时间上下文，最后由线性层输出每帧的语音概率。模型小于 2 MB，约有 100 万参数，每次处理 30–100 毫秒音频。
  - **输入**：16 kHz 原始音频。它不需要人工提取特征，卷积前端会直接从波形中学习特征。
  - **分窗、有状态推理**：LSTM 隐藏状态会在音频块之间保留，因此模型可以流式处理音频，无需重新读取完整历史。每次调用处理 30、60 或 100 毫秒音频块，并返回 $[0, 1]$ 范围内的语音概率。
  - **自适应阈值**：Silero VAD 使用不同的起始和结束阈值，并设置最短语音和静音时长，避免噪声边界导致状态频繁切换。语音段必须连续超过起始阈值一段时间才会确认；低于结束阈值的静音也要持续一段时间，系统才会关闭语音段。
  - **性能**：Silero VAD 在 CPU 上的实时因子为 1%–2%；处理 1 秒音频约需 10–20 毫秒，适合边缘设备、手机和实时流水线。在噪声或音乐较多的音频上，它明显优于 WebRTC VAD，同时体积小到可以在设备端运行。
  - Silero VAD 常作为 Whisper（见文件 02）的前端，把长音频切成语句再转录；说话人分段流水线（文件 04）也会用它先定位语音区域，再提取说话人嵌入。

- **声学活动检测**（AAD）把 VAD 扩展到所有声学活动，而不只检测语音。智能家居、安全系统和野生动物监测都可以使用 AAD。模型可以检测玻璃破碎、狗叫和警报声等事件，通常采用文件 04 介绍的音频分类方法。

- **TTS 评估指标**同时衡量客观质量和主观自然度：
  - **平均意见分**（MOS）：听者按 1–5 分评估自然度，是主观自然度评估的黄金标准，但耗时且成本高。
  - **梅尔倒谱失真**（MCD）：衡量合成语音与参考语音的梅尔倒谱距离。数值越低越好，但它不一定与听感一致。
  - **PESQ / POLQA**：最初为电话语音设计的标准化感知质量指标。
  - **说话人相似度**：计算合成语音与参考语音的说话人嵌入余弦相似度，常用于评估语音克隆。
  - **可懂度**：把合成语音输入 ASR 系统（见文件 02），再计算 WER。

## 编程任务（使用 Colab 或笔记本）

- **任务 1：用 Griffin–Lim 从梅尔频谱图重建波形。** 实现 Griffin–Lim 迭代相位重建算法，把梅尔频谱图还原为波形。这个练习展示了声码器面临的频谱反演问题，也说明了神经声码器的作用。

```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

# Generate a synthetic waveform (sum of harmonics simulating a vowel)
sr = 16000
duration = 1.0
t = jnp.linspace(0, duration, int(sr * duration))
f0 = 220.0  # fundamental frequency
waveform = (
    0.6 * jnp.sin(2 * jnp.pi * f0 * t) +
    0.3 * jnp.sin(2 * jnp.pi * 2 * f0 * t) +
    0.1 * jnp.sin(2 * jnp.pi * 3 * f0 * t)
)

# Compute STFT
n_fft = 1024
hop_length = 256
window = jnp.hanning(n_fft)

def stft(signal, n_fft, hop_length, window):
    """Compute Short-Time Fourier Transform."""
    n_frames = 1 + (len(signal) - n_fft) // hop_length
    frames = jnp.stack([
        signal[i * hop_length : i * hop_length + n_fft] * window
        for i in range(n_frames)
    ])
    return jnp.fft.rfft(frames, n=n_fft)

def istft(stft_matrix, hop_length, window, length):
    """Compute inverse STFT with overlap-add."""
    n_fft = (stft_matrix.shape[1] - 1) * 2
    n_frames = stft_matrix.shape[0]
    frames = jnp.fft.irfft(stft_matrix, n=n_fft)
    frames = frames * window[None, :]
    output = jnp.zeros(length)
    for i in range(n_frames):
        start = i * hop_length
        end = start + n_fft
        if end <= length:
            output = output.at[start:end].add(frames[i])
    return output

# Forward STFT
S = stft(waveform, n_fft, hop_length, window)
magnitude = jnp.abs(S)

# Mel filterbank
n_mels = 80
mel_low = 0.0
mel_high = 2595 * jnp.log10(1 + (sr / 2) / 700)
mel_points = jnp.linspace(mel_low, mel_high, n_mels + 2)
hz_points = 700 * (10 ** (mel_points / 2595) - 1)
freq_bins = jnp.floor((n_fft + 1) * hz_points / sr).astype(int)

mel_filterbank = jnp.zeros((n_mels, n_fft // 2 + 1))
for m in range(n_mels):
    f_left = freq_bins[m]
    f_center = freq_bins[m + 1]
    f_right = freq_bins[m + 2]
    for k in range(f_left, f_center):
        mel_filterbank = mel_filterbank.at[m, k].set(
            (k - f_left) / max(f_center - f_left, 1)
        )
    for k in range(f_center, f_right):
        mel_filterbank = mel_filterbank.at[m, k].set(
            (f_right - k) / max(f_right - f_center, 1)
        )

# To mel and back (pseudo-inverse)
mel_spec = magnitude @ mel_filterbank.T
magnitude_reconstructed = mel_spec @ jnp.linalg.pinv(mel_filterbank.T)
magnitude_reconstructed = jnp.maximum(magnitude_reconstructed, 1e-7)

# Griffin-Lim algorithm
def griffin_lim(magnitude, n_iter, hop_length, window, signal_length):
    """Iterative phase reconstruction."""
    n_fft = (magnitude.shape[1] - 1) * 2
    key = jax.random.PRNGKey(42)
    phase = jax.random.uniform(key, magnitude.shape, minval=-jnp.pi, maxval=jnp.pi)

    for _ in range(n_iter):
        complex_spec = magnitude * jnp.exp(1j * phase)
        signal = istft(complex_spec, hop_length, window, signal_length)
        reanalysis = stft(signal, n_fft, hop_length, window)
        phase = jnp.angle(reanalysis)

    complex_spec = magnitude * jnp.exp(1j * phase)
    return istft(complex_spec, hop_length, window, signal_length)

reconstructed = griffin_lim(magnitude_reconstructed, n_iter=60, hop_length=hop_length,
                            window=window, signal_length=len(waveform))

# Plot comparison
fig, axes = plt.subplots(3, 1, figsize=(12, 8))

axes[0].plot(t[:1000], waveform[:1000], color='#3498db', linewidth=0.8)
axes[0].set_title('Original Waveform')
axes[0].set_ylabel('Amplitude')

axes[1].imshow(jnp.log1p(mel_spec.T), aspect='auto', origin='lower', cmap='magma')
axes[1].set_title('Mel Spectrogram (intermediate representation)')
axes[1].set_ylabel('Mel bin')

axes[2].plot(t[:1000], reconstructed[:1000], color='#e74c3c', linewidth=0.8)
axes[2].set_title('Griffin-Lim Reconstructed Waveform (60 iterations)')
axes[2].set_xlabel('Time (s)')
axes[2].set_ylabel('Amplitude')

plt.tight_layout()
plt.show()

# Measure reconstruction error
mse = jnp.mean((waveform[:len(reconstructed)] - reconstructed[:len(waveform)]) ** 2)
print(f"MSE between original and reconstructed: {mse:.6f}")
print("Note: phase information loss through mel inversion causes artifacts.")
```

- **Task 2: Duration predictor (FastSpeech-style).** Train a small convolutional duration predictor that maps phoneme embeddings to durations. This is the core component enabling non-autoregressive TTS.

```python
import jax
import jax.numpy as jnp
import jax.random as jr
import matplotlib.pyplot as plt

# Simulate phoneme sequences with ground-truth durations
# In real TTS, durations come from forced alignment or teacher attention
def generate_synthetic_data(key, n_samples=200, max_phonemes=30, embed_dim=64):
    """Generate synthetic phoneme embeddings and durations."""
    keys = jr.split(key, 4)
    lengths = jr.randint(keys[0], (n_samples,), 5, max_phonemes)

    all_embeddings = []
    all_durations = []
    all_masks = []

    for i in range(n_samples):
        L = int(lengths[i])
        emb = jr.normal(keys[1], (max_phonemes, embed_dim))
        # Durations: vowels (even indices) are longer, consonants shorter
        base_dur = jnp.where(jnp.arange(max_phonemes) % 2 == 0, 8.0, 4.0)
        noise = jr.normal(jr.fold_in(keys[2], i), (max_phonemes,)) * 1.5
        dur = jnp.clip(base_dur + noise, 1.0, 20.0).astype(jnp.float32)
        mask = (jnp.arange(max_phonemes) < L).astype(jnp.float32)

        all_embeddings.append(emb)
        all_durations.append(dur * mask)
        all_masks.append(mask)

    return (jnp.stack(all_embeddings), jnp.stack(all_durations),
            jnp.stack(all_masks))

key = jr.PRNGKey(42)
embeddings, durations, masks = generate_synthetic_data(key)

# Duration predictor: 2-layer 1D convolution + linear projection
def init_duration_predictor(key, embed_dim=64, hidden_dim=128, kernel_size=3):
    """Initialise duration predictor weights."""
    keys = jr.split(key, 4)
    scale1 = jnp.sqrt(2.0 / (embed_dim * kernel_size))
    scale2 = jnp.sqrt(2.0 / (hidden_dim * kernel_size))
    params = {
        'conv1_w': jr.normal(keys[0], (kernel_size, embed_dim, hidden_dim)) * scale1,
        'conv1_b': jnp.zeros(hidden_dim),
        'conv2_w': jr.normal(keys[1], (kernel_size, hidden_dim, hidden_dim)) * scale2,
        'conv2_b': jnp.zeros(hidden_dim),
        'linear_w': jr.normal(keys[2], (hidden_dim, 1)) * jnp.sqrt(2.0 / hidden_dim),
        'linear_b': jnp.zeros(1),
    }
    return params

def duration_predictor(params, x):
    """Predict log-durations from phoneme embeddings. x: (batch, seq, embed)."""
    # Conv layer 1 with ReLU
    h = jax.lax.conv_general_dilated(
        x.transpose(0, 2, 1),  # (batch, embed, seq)
        params['conv1_w'].transpose(2, 1, 0),  # (out, in, kernel)
        window_strides=(1,), padding='SAME'
    ).transpose(0, 2, 1) + params['conv1_b']  # back to (batch, seq, hidden)
    h = jax.nn.relu(h)

    # Conv layer 2 with ReLU
    h = jax.lax.conv_general_dilated(
        h.transpose(0, 2, 1),
        params['conv2_w'].transpose(2, 1, 0),
        window_strides=(1,), padding='SAME'
    ).transpose(0, 2, 1) + params['conv2_b']
    h = jax.nn.relu(h)

    # Linear projection to scalar
    log_dur = (h @ params['linear_w'] + params['linear_b']).squeeze(-1)
    return log_dur

# Loss: MSE on log-durations (standard in FastSpeech)
def loss_fn(params, embeddings, durations, masks):
    log_dur_pred = duration_predictor(params, embeddings)
    log_dur_true = jnp.log(jnp.clip(durations, 1.0, None))
    sq_err = (log_dur_pred - log_dur_true) ** 2 * masks
    return jnp.sum(sq_err) / jnp.sum(masks)

grad_fn = jax.jit(jax.value_and_grad(loss_fn))

# Training loop
params = init_duration_predictor(jr.PRNGKey(0))
lr = 1e-3
losses = []

for epoch in range(300):
    loss_val, grads = grad_fn(params, embeddings, durations, masks)
    params = jax.tree.map(lambda p, g: p - lr * g, params, grads)
    losses.append(float(loss_val))

# Evaluate on a sample
log_dur_pred = duration_predictor(params, embeddings[:1])
dur_pred = jnp.exp(log_dur_pred[0])
dur_true = durations[0]
mask = masks[0]
valid_len = int(jnp.sum(mask))

fig, axes = plt.subplots(1, 2, figsize=(14, 5))

axes[0].plot(losses, color='#3498db', linewidth=1.5)
axes[0].set_xlabel('Epoch')
axes[0].set_ylabel('MSE Loss (log-duration)')
axes[0].set_title('Duration Predictor Training')
axes[0].set_yscale('log')

x_pos = jnp.arange(valid_len)
width = 0.35
axes[1].bar(x_pos - width/2, dur_true[:valid_len], width, color='#27ae60',
            label='Ground truth', alpha=0.8)
axes[1].bar(x_pos + width/2, dur_pred[:valid_len], width, color='#e74c3c',
            label='Predicted', alpha=0.8)
axes[1].set_xlabel('Phoneme index')
axes[1].set_ylabel('Duration (frames)')
axes[1].set_title('Duration Prediction vs Ground Truth')
axes[1].legend()

plt.tight_layout()
plt.show()
```

- **Task 3: Simple neural vocoder with upsampling convolutions.** Build a minimal HiFi-GAN-style generator that upsamples a mel spectrogram to a waveform using transposed convolutions and residual blocks.

```python
import jax
import jax.numpy as jnp
import jax.random as jr
import matplotlib.pyplot as plt

def init_residual_block(key, channels, kernel_size, dilation):
    """Initialise a dilated residual convolution block."""
    k1, k2 = jr.split(key)
    scale = jnp.sqrt(2.0 / (channels * kernel_size))
    return {
        'conv1_w': jr.normal(k1, (kernel_size, channels, channels)) * scale,
        'conv1_b': jnp.zeros(channels),
        'conv2_w': jr.normal(k2, (kernel_size, channels, channels)) * scale,
        'conv2_b': jnp.zeros(channels),
        'dilation': dilation
    }

def residual_block(params, x):
    """x: (batch, time, channels). Dilated conv residual block with LeakyReLU."""
    h = jax.nn.leaky_relu(x, negative_slope=0.1)
    # Simplified: use standard conv (dilation handled conceptually)
    h = jax.lax.conv_general_dilated(
        h.transpose(0, 2, 1),
        params['conv1_w'].transpose(2, 1, 0),
        window_strides=(1,),
        padding='SAME',
        rhs_dilation=(params['dilation'],)
    ).transpose(0, 2, 1) + params['conv1_b']
    h = jax.nn.leaky_relu(h, negative_slope=0.1)
    h = jax.lax.conv_general_dilated(
        h.transpose(0, 2, 1),
        params['conv2_w'].transpose(2, 1, 0),
        window_strides=(1,),
        padding='SAME'
    ).transpose(0, 2, 1) + params['conv2_b']
    return x + h

def init_generator(key, n_mels=80, upsample_rates=(8, 8, 4),
                   channels=128):
    """Initialise a minimal HiFi-GAN-style generator."""
    keys = jr.split(key, 10)
    params = {}

    # Input projection: mel bins -> channels
    params['input_w'] = jr.normal(keys[0], (7, n_mels, channels)) * 0.02
    params['input_b'] = jnp.zeros(channels)

    # Upsample blocks (transposed convolutions)
    in_ch = channels
    for i, rate in enumerate(upsample_rates):
        k_size = rate * 2
        scale = jnp.sqrt(2.0 / (in_ch * k_size))
        out_ch = in_ch // 2
        params[f'up{i}_w'] = jr.normal(keys[i+1], (k_size, in_ch, out_ch)) * scale
        params[f'up{i}_b'] = jnp.zeros(out_ch)
        # Residual blocks at each scale
        params[f'res{i}_0'] = init_residual_block(jr.fold_in(keys[i+4], 0),
                                                    out_ch, 3, 1)
        params[f'res{i}_1'] = init_residual_block(jr.fold_in(keys[i+4], 1),
                                                    out_ch, 3, 3)
        in_ch = out_ch

    # Output projection to mono waveform
    params['output_w'] = jr.normal(keys[8], (7, in_ch, 1)) * 0.02
    params['output_b'] = jnp.zeros(1)
    params['upsample_rates'] = upsample_rates

    return params

def generator_forward(params, mel):
    """mel: (batch, time, n_mels) -> waveform: (batch, time * prod(rates), 1)."""
    # Input projection
    h = jax.lax.conv_general_dilated(
        mel.transpose(0, 2, 1),
        params['input_w'].transpose(2, 1, 0),
        window_strides=(1,), padding='SAME'
    ).transpose(0, 2, 1) + params['input_b']

    for i, rate in enumerate(params['upsample_rates']):
        h = jax.nn.leaky_relu(h, negative_slope=0.1)
        # Upsample via transposed convolution
        k_size = rate * 2
        h = jax.lax.conv_transpose(
            h.transpose(0, 2, 1),
            params[f'up{i}_w'].transpose(2, 1, 0),
            strides=(rate,),
            padding='SAME'
        ).transpose(0, 2, 1) + params[f'up{i}_b']
        # Residual blocks
        h = residual_block(params[f'res{i}_0'], h)
        h = residual_block(params[f'res{i}_1'], h)

    h = jax.nn.leaky_relu(h, negative_slope=0.1)
    out = jax.lax.conv_general_dilated(
        h.transpose(0, 2, 1),
        params['output_w'].transpose(2, 1, 0),
        window_strides=(1,), padding='SAME'
    ).transpose(0, 2, 1) + params['output_b']

    return jnp.tanh(out)

# Create a synthetic mel spectrogram (simulating a vowel)
n_mels = 80
n_frames = 50
mel = jnp.zeros((1, n_frames, n_mels))
# Add energy in low-frequency mel bins (simulating formants)
mel = mel.at[:, :, 5:15].set(1.0)
mel = mel.at[:, :, 20:25].set(0.6)

# Initialise and run generator
key = jr.PRNGKey(42)
params = init_generator(key, n_mels=n_mels, upsample_rates=(8, 8, 4),
                         channels=128)
waveform = generator_forward(params, mel)

print(f"Input mel shape:  {mel.shape}")
print(f"Output waveform shape: {waveform.shape}")
print(f"Upsample factor: {8 * 8 * 4} = {8*8*4}x")

fig, axes = plt.subplots(2, 1, figsize=(12, 6))

axes[0].imshow(mel[0].T, aspect='auto', origin='lower', cmap='magma')
axes[0].set_title('Input Mel Spectrogram')
axes[0].set_ylabel('Mel bin')
axes[0].set_xlabel('Frame')

waveform_np = waveform[0, :, 0]
axes[1].plot(waveform_np[:2000], color='#9b59b6', linewidth=0.5)
axes[1].set_title('Generator Output Waveform (untrained - random noise)')
axes[1].set_ylabel('Amplitude')
axes[1].set_xlabel('Sample')

plt.tight_layout()
plt.show()
print("Note: The output is noise because the generator is untrained.")
print("In practice, adversarial + mel loss training shapes this into speech.")
```

- **Task 4: Voice activity detection with a simple RNN.** Train a small GRU-based VAD model on synthetic audio features to classify frames as speech or silence.

```python
import jax
import jax.numpy as jnp
import jax.random as jr
import matplotlib.pyplot as plt

# Generate synthetic log-mel energy features with speech/silence labels
def generate_vad_data(key, n_sequences=100, n_frames=200, n_features=40):
    """Simulate log-mel features: speech regions are higher energy with structure."""
    keys = jr.split(key, 5)
    all_features = []
    all_labels = []

    for i in range(n_sequences):
        k = jr.fold_in(keys[0], i)
        k1, k2, k3 = jr.split(k, 3)

        # Random speech/silence pattern
        label = jnp.zeros(n_frames)
        n_segments = jr.randint(k1, (), 2, 6)
        for seg in range(int(n_segments)):
            start = jr.randint(jr.fold_in(k2, seg), (), 0, n_frames - 20)
            length = jr.randint(jr.fold_in(k3, seg), (), 10, 50)
            end = jnp.minimum(start + length, n_frames)
            label = label.at[int(start):int(end)].set(1.0)

        # Features: speech frames have higher energy + spectral structure
        noise = jr.normal(jr.fold_in(keys[1], i), (n_frames, n_features)) * 0.3
        speech_pattern = jnp.outer(label, jnp.exp(-jnp.arange(n_features) / 15.0))
        features = speech_pattern * 2.0 + noise + 0.1

        all_features.append(features)
        all_labels.append(label)

    return jnp.stack(all_features), jnp.stack(all_labels)

key = jr.PRNGKey(123)
features, labels = generate_vad_data(key)
train_features, train_labels = features[:80], labels[:80]
test_features, test_labels = features[80:], labels[80:]

# Simple GRU-based VAD model
def init_vad_model(key, input_dim=40, hidden_dim=64):
    keys = jr.split(key, 6)
    scale_ih = jnp.sqrt(2.0 / input_dim)
    scale_hh = jnp.sqrt(2.0 / hidden_dim)
    return {
        'W_z': jr.normal(keys[0], (input_dim, hidden_dim)) * scale_ih,
        'U_z': jr.normal(keys[1], (hidden_dim, hidden_dim)) * scale_hh,
        'b_z': jnp.zeros(hidden_dim),
        'W_r': jr.normal(keys[2], (input_dim, hidden_dim)) * scale_ih,
        'U_r': jr.normal(keys[3], (hidden_dim, hidden_dim)) * scale_hh,
        'b_r': jnp.zeros(hidden_dim),
        'W_h': jr.normal(keys[4], (input_dim, hidden_dim)) * scale_ih,
        'U_h': jr.normal(keys[5], (hidden_dim, hidden_dim)) * scale_hh,
        'b_h': jnp.zeros(hidden_dim),
        'W_out': jr.normal(jr.fold_in(keys[0], 99), (hidden_dim, 1)) * 0.1,
        'b_out': jnp.zeros(1),
    }

def gru_step(params, h, x):
    """Single GRU step."""
    z = jax.nn.sigmoid(x @ params['W_z'] + h @ params['U_z'] + params['b_z'])
    r = jax.nn.sigmoid(x @ params['W_r'] + h @ params['U_r'] + params['b_r'])
    h_tilde = jnp.tanh(x @ params['W_h'] + (r * h) @ params['U_h'] + params['b_h'])
    h_new = (1 - z) * h + z * h_tilde
    return h_new

def vad_forward(params, x):
    """x: (batch, time, features) -> logits: (batch, time)."""
    batch_size, n_frames, _ = x.shape
    hidden_dim = params['W_z'].shape[1]
    h = jnp.zeros((batch_size, hidden_dim))

    outputs = []
    for t in range(n_frames):
        h = gru_step(params, h, x[:, t, :])
        logit = (h @ params['W_out'] + params['b_out']).squeeze(-1)
        outputs.append(logit)

    return jnp.stack(outputs, axis=1)

def bce_loss(params, features, labels):
    """Binary cross-entropy loss for VAD."""
    logits = vad_forward(params, features)
    probs = jax.nn.sigmoid(logits)
    probs = jnp.clip(probs, 1e-7, 1 - 1e-7)
    loss = -(labels * jnp.log(probs) + (1 - labels) * jnp.log(1 - probs))
    return jnp.mean(loss)

grad_fn = jax.jit(jax.value_and_grad(bce_loss))

# Training
params = init_vad_model(jr.PRNGKey(0))
lr = 5e-3
losses = []

for epoch in range(200):
    loss_val, grads = grad_fn(params, train_features, train_labels)
    params = jax.tree.map(lambda p, g: p - lr * g, params, grads)
    losses.append(float(loss_val))
    if epoch % 50 == 0:
        print(f"Epoch {epoch}: loss = {loss_val:.4f}")

# Evaluate on test set
test_logits = vad_forward(params, test_features)
test_preds = (jax.nn.sigmoid(test_logits) > 0.5).astype(jnp.float32)
accuracy = jnp.mean(test_preds == test_labels)
print(f"\nTest accuracy: {accuracy:.4f}")

# Visualise a test example
idx = 0
fig, axes = plt.subplots(3, 1, figsize=(14, 7))

axes[0].imshow(test_features[idx].T, aspect='auto', origin='lower', cmap='magma')
axes[0].set_title('Log-Mel Energy Features')
axes[0].set_ylabel('Mel bin')

axes[1].fill_between(range(200), test_labels[idx], alpha=0.4, color='#27ae60',
                     label='Ground truth')
axes[1].plot(jax.nn.sigmoid(test_logits[idx]), color='#e74c3c',
             linewidth=1.5, label='Predicted probability')
axes[1].axhline(0.5, color='gray', linestyle='--', linewidth=0.8)
axes[1].set_ylabel('Speech probability')
axes[1].legend()
axes[1].set_title('VAD Predictions')

axes[2].fill_between(range(200), test_labels[idx], alpha=0.4, color='#27ae60',
                     label='Ground truth')
axes[2].fill_between(range(200), test_preds[idx], alpha=0.4, color='#f39c12',
                     label='Predicted (threshold=0.5)')
axes[2].set_ylabel('Speech / Silence')
axes[2].set_xlabel('Frame')
axes[2].legend()
axes[2].set_title('VAD Binary Decision')

plt.tight_layout()
plt.show()
```
