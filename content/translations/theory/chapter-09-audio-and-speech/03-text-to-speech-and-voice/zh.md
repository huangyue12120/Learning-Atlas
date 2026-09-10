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
# 文本转语音与声音

*文本转语音（TTS）合成把 ASR 流水线反过来，根据书面文本生成自然语音。本篇介绍 TTS 流水线（文本规范化、G2P、声学模型、声码器）、Tacotron、WaveNet、HiFi-GAN、语音克隆、声音转换和语音活动检测（VAD）。*

- 文件 01 建立了信号处理工具箱：波形、频谱图、梅尔滤波器组和 MFCC；文件 02 把语音变成文字。现在反向处理：给定文本，合成自然语音。这就是**文本转语音**（TTS），并进一步打开声音转换、语音克隆和语音活动检测的大门。

- 可以把 TTS 想成舞台表演：剧本是文本输入，导演（声学模型）决定每句的音色、音高、时长和重音，乐队（声码器）再演奏这份乐谱，产生观众听到的声波。现代神经 TTS 用接近真人的表演替代了规则系统僵硬、机械的朗读。

![TTS 流水线：文本规范化后转换为音素，由声学模型生成梅尔频谱图，再经声码器生成最终波形](../images/tts_pipeline.svg)

- **文本转语音流水线**通常包含四个阶段：(1) 文本规范化；(2) 音素转换；(3) 声学模型；(4) 声码器。一些现代系统把第 3、4 阶段合并为端到端模型，但概念上的分解仍然有帮助。

- **文本规范化**把原始文本变成可发音形式：展开缩写（“Dr.” 变为 “Doctor”）、把数字变成单词（“1984” 变为 “nineteen eighty-four”）、读出货币符号（“$5” 变为 “five dollars”），并处理 URL 或特殊字符。该阶段通常依赖语言特定语法的规则，也有神经规范化模型。这里的错误会传递到所有下游阶段：如果把 “St.” 读成 “saint” 而不是 “street”，整句话都会错。

- **字素到音素（G2P）转换**把规范化文本映射为音素序列。英语拼写极不规则（“though”“through”“tough” 对 “ough” 的读法各不相同），所以常见词用词典（CMU 发音词典）查找，词表外词则由神经序列到序列模型（第 06 章的编码器—解码器或第 07 章的 Transformer）处理。拼写浅的语言（西班牙语、芬兰语）需要的 G2P 更简单。输出通常是 IPA（国际音标）序列或等价的内部音素集合。

- **声学模型**接收音素序列并生成中间声学表示，几乎总是**梅尔频谱图**（见文件 01）。梅尔频谱图记录每个时间帧的频谱包络，包含声码器重建波形所需的感知信息。声学模型必须决定时长（每个音素持续多久）、音高（基频 $F_0$）和能量（响度）。

- **声码器**接收梅尔频谱图并生成原始音频波形。这是一个病态逆问题：由于相位信息被丢弃，同一频谱图可能对应很多波形。经典声码器（Griffin-Lim、WORLD）采用迭代或信号模型方法，而如今质量最好的通常是神经声码器。

- **声码器：WaveNet**（van den Oord 等，2016）是第一个生成几乎无法与真人录音区分的神经声码器。它自回归地建模波形，在给定全部历史采样的条件下预测每个采样 $x_t$：

$$P(x) = \prod_{t=1}^{T} P(x_t \mid x_1, \ldots, x_{t-1}, c)$$

- 其中 $c$ 是条件信号（梅尔频谱图）。每个采样为 16 位，直接在 65,536 个值上做 softmax 不切实际。WaveNet 使用 **mu-law 压扩**把级别降到 256 个，后续变体则使用逻辑斯蒂混合分布。

- WaveNet 的核心构件是**膨胀因果卷积**。因果意味着卷积权重只看过去采样（不会泄露未来）；膨胀意味着卷积以指数增加的间隔跳过采样，膨胀因子为 $1, 2, 4, 8, \ldots, 512$。这样参数量仍线性增长，却能获得指数级大的感受野。

- 每层的门控激活为：

$$z = \tanh(W_{f} \ast x) \odot \sigma(W_{g} \ast x)$$

- 其中 $W_f$、$W_g$ 是滤波器和门控卷积权重，$\ast$ 表示膨胀因果卷积，$\odot$ 是逐元素乘法。这种门控机制来自第 06 章的 LSTM，允许网络控制信息流。

- WaveNet 质量出色，但推理极慢：生成 1 秒、24 kHz 的音频需要 24,000 次串行前向传播。这推动了之后的声码器研究。

- **WaveRNN**（Kalchbrenner 等，2018）用单层循环网络替代 WaveNet 的深卷积堆栈。它把每个 16 位采样拆成粗粒度（高 8 位）和细粒度（低 8 位）两部分，分别用 GRU（第 06 章）预测。双 softmax 显著减少计算，同时保持较高质量；经过内核优化后，WaveRNN 足以在移动 CPU 上实时运行。

- **WaveGlow**（Prenger 等，2019）是**基于流**的声码器，完全避免自回归生成。它使用一系列可逆变换（仿射耦合层，第 06 章的归一化流），把简单高斯分布映射为波形分布。训练通过变量变换公式最大化精确对数似然：

$$\log P(x) = \log P(z) + \sum_{i} \log \left| \det \frac{\partial f_i}{\partial f_{i-1}} \right|$$

- 其中 $z = f(x)$ 是将 $x$ 经过流得到的潜变量。推理时从 $z \sim \mathcal{N}(0, I)$ 采样，再通过逆流一次并行生成。WaveGlow 用耦合层的大型网络换取生成速度。

- **HiFi-GAN**（Kong 等，2020）使用**生成对抗网络**从梅尔频谱图合成波形。生成器通过一系列转置卷积对梅尔频谱图上采样，每层后接**多感受野融合（MRF）**模块。MRF 并行应用不同卷积核大小和膨胀率的多个残差块，再求和输出，从而同时捕获多个时间尺度的模式。

![HiFi-GAN 生成器架构：梅尔频谱图经过转置卷积上采样，每层后接融合不同膨胀模式的多感受野残差块](../images/hifi_gan_generator.svg)

- HiFi-GAN 使用两类判别器。**多周期判别器（MPD）**按不同周期（2、3、5、7、11）把一维波形折叠为二维，再应用二维卷积，以捕获不同基频的周期结构。**多尺度判别器（MSD）**处理原始波形、2 倍下采样和 4 倍下采样版本，捕获不同时间分辨率的模式。

- 训练目标结合对抗损失、**梅尔频谱图重构损失**（合成音频与真实音频梅尔频谱图之间的 L1 距离）和**特征匹配损失**（判别器中间特征之间的 L1 距离）：

$$\mathcal{L}_G = \mathcal{L}_{\text{adv}}(G) + \lambda_{\text{mel}} \mathcal{L}_{\text{mel}}(G) + \lambda_{\text{fm}} \mathcal{L}_{\text{fm}}(G)$$

- HiFi-GAN 的合成质量可与 WaveNet 媲美，但速度快逾 1000 倍，可在单张 GPU 上实时生成。

- **神经源—滤波器（NSF）模型**结合传统信号处理与神经网络。在经典源—滤波器模型中，有声音频由源激励（基频 $F_0$ 上的周期脉冲串）通过声道滤波器（频谱包络）产生。NSF 用神经网络替代手工滤波器，同时保留显式源信号。输入的 $F_0$ 轮廓提供精细音高控制，纯数据驱动的声码器有时难以做到这一点。

- **声学模型：Tacotron**（Wang 等，2017）是第一个直接把字符序列转换为梅尔频谱图的端到端神经 TTS 系统。它使用带注意力的编码器—解码器架构（第 07 章）：编码器用卷积组、高速公路网络和双向 GRU 处理字符/音素序列；解码器是自回归 GRU，利用上一帧和注意力上下文逐帧预测梅尔帧。

- **Tacotron 2**（Shen 等，2018）大幅改进了架构。编码器是三层一维卷积堆栈，后接双向 LSTM（第 06 章）；解码器是带**位置敏感注意力**的两层 LSTM。它不仅使用编码器输出和解码器状态，还使用此前步骤累积的注意力权重，从而避免跳词或重复词这一常见失败模式。

![Tacotron 2 架构：字符/音素编码器、卷积层与双向 LSTM，位置敏感注意力对齐梅尔帧，自回归解码器预测停止 token](../images/tacotron2_architecture.svg)

- 解码器第 $i$ 步对编码器位置 $j$ 的位置敏感注意力能量为：

$$e_{i,j} = w^T \tanh(W_s s_{i-1} + W_h h_j + W_f f_{i,j} + b)$$

- 其中 $s_{i-1}$ 是上一步解码器状态，$h_j$ 是位置 $j$ 的编码器输出，$f_{i,j}$ 是位置特征：把累积注意力权重 $\sum_{k<i} \alpha_{k,j}$ 通过一维卷积得到。注意力权重为 $\alpha_{i,j} = \text{softmax}(e_{i,j})$。

- Tacotron 2 解码器还会在每一步预测**停止 token**概率，表示梅尔频谱图何时结束。输出频谱图随后送入声码器（最初是 WaveNet，后来替换为 HiFi-GAN 等）。

- Tacotron 2 的自回归特性意味着合成速度受梅尔帧数限制。典型梅尔频谱图每秒 80 帧，因此 5 秒语句需要 400 次串行解码。

- **FastSpeech**（Ren 等，2019）用**非自回归**声学模型解决速度问题：它并行生成全部帧，而不是逐帧生成。关键挑战是确定每个音素应生成多少梅尔帧，FastSpeech 用**时长预测器**处理这一问题。

- 时长预测器是一个小型卷积网络，预测每个音素的整数时长（梅尔帧数）。训练时，用预训练自回归教师模型（Tacotron 2）的注意力对齐提取真实时长；推理时，预测时长通过**长度调节器**把音素级隐藏序列扩展到帧级，方法只是把每个音素的隐藏表示重复预测的帧数。

- **FastSpeech 2**（Ren 等，2021）移除了教师—学生蒸馏，改进 FastSpeech。它直接用强制对齐（文件 02 的声学模型框架）提取真实时长，并在时长之外增加音高（$F_0$）与能量的显式**方差适配器**。每个适配器都是小型卷积预测器，其输出作为解码器条件：

```math
\begin{aligned}
\hat{d}_i &= \text{DurationPredictor}(h_i) \\
\hat{p}_i &= \text{PitchPredictor}(h_i) \\
\hat{e}_i &= \text{EnergyPredictor}(h_i)
\end{aligned}
```

- 其中 $h_i$ 是音素 $i$ 的编码器隐藏状态。训练时使用真实值，推理时使用预测值即可显式控制韵律。这是 FastSpeech 2 的重要优势：只需缩放预测器输出，就能调节音高、速度或能量。

- FastSpeech 2 的推理速度通常比 Tacotron 2 快 10–20 倍，并避免跳词、重复和注意力坍缩等自回归失败模式。

- **VITS**（Kim 等，2021）是直接从文本生成波形的**端到端** TTS 模型，取消独立声码器阶段。VITS 将条件变分自编码器（第 06 章）与归一化流、对抗训练结合：后验编码器把真实梅尔频谱图映射到潜空间，先验编码器把音素（经 Transformer 文本编码器和时长预测器）映射到同一潜空间，解码器（基于 HiFi-GAN）从潜样本生成波形。

- VITS 的训练目标包括：
    - **重构损失**：VAE 迫使潜分布编码声学信息。
    - **KL 散度**：让文本条件先验与音频条件后验对齐。
    - **对抗损失**：判别器保证波形质量。
    - **时长损失**：训练随机时长预测器。

- 相比两阶段系统（FastSpeech 2 + HiFi-GAN），VITS 的声学模型和声码器联合优化，避免预测梅尔频谱图与真实频谱图不匹配造成的退化，因此质量更高。

- **VALL-E**（Wang 等，2023）彻底把 TTS 重构为离散音频 token 上的**语言建模问题**。它用神经音频编解码器（EnCodec）将语音表示为多个码本层级的离散码。给定文本提示和一段 3 秒的注册语音（同样编码为离散 token），VALL-E 用 Transformer 语言模型自回归预测音频 token。

- VALL-E 使用两个模型：**自回归（AR）模型**逐 token 生成第一个码本层，**非自回归（NAR）模型**并行预测其余码本层，并以第一层及彼此为条件。这种 codec 语言模型实现了惊人的零样本声音克隆：只需 3 秒样本就能复现说话人的声音、音色甚至情绪。

- **StyleTTS**（Li 等，2022）和 **StyleTTS 2** 将语音解耦为内容与风格。风格编码器从参考音频提取风格向量，捕获说话人身份、韵律和录音条件；推理时可从学习到的先验采样风格，或从参考语句迁移风格。StyleTTS 2 使用扩散模型（第 08 章）作为风格先验，生成多样自然的韵律。

- **Kokoro**（2024）是轻量、高质量的开源 TTS 模型，以小体积（约 8200 万参数）和出色自然度著称。它采用受 StyleTTS 2 启发的架构，用基于扩散的风格先验和微调后的 ISTFTNet 声码器，直接预测 STFT 系数（见文件 01）而非原始波形采样。尽管只有 VALL-E 等模型的一小部分规模，Kokoro 在英语、日语、法语、韩语和中文上都接近真人自然度，说明精心整理的数据和高效架构可以与蛮力扩展竞争。其小型模型体积适合本地和边缘部署。

- **Orpheus**（Canopy Labs，2025）是一系列基于 VALL-E **codec 语言模型**范式的开源 TTS 模型（10 亿和 30 亿参数）。它使用 LLM 骨干（微调 Llama 3）直接生成 SNAC 音频 codec token。突出特点是接近真人的情绪表达：能自然处理笑声、叹气、犹豫和情感韵律；输入文本中加入 `[laugh]` 或 `[sigh]` 标签即可细粒度控制副语言表达。

- **Dia**（Nari Labs，2025）是开源对话 TTS 模型，可从一份文本转写生成逼真的多说话人对话。它基于 16 亿参数的编码器—解码器 Transformer，处理轮次切换、说话人特定声音和笑声、停顿等非语言线索，也支持用短音频提示进行声音克隆，在对话上下文中零样本生成说话人。

- **Sesame CSM**（Conversational Speech Model，2025）关注自然的多轮对话语音。它不优化朗读式 TTS，而是建模真实对话的动态：应答声（“uh huh”）、打断、说话人间节奏变化和情绪响应。模型以文本和音频历史为对话上下文，用 Transformer 骨干生成随对话流动而调整风格的语音。

- **Fish Speech**（Fish Audio，2024）是采用双自回归架构的开源 TTS：大型语言模型从文本生成语义 token，小模型把它们转换为 VQGAN 声学 token，再由声码器解码成波形。Fish Speech 可用 10–15 秒参考音频零样本克隆声音，并具备适合实时应用的低延迟；模块化设计允许独立替换组件（如声码器）。

- **ChatTTS**（2024）是面向聊天机器人和虚拟助手等对话应用的开源 TTS。它通过嵌入文本的特殊 token 控制笑声、停顿、填充词等韵律特征，生成自然对话式语音，支持中英混合合成和多说话人生成。

- **Bark**（Suno，2023）是基于 Transformer 的开源模型，可从文本提示生成语音、音乐和音效。它采用三阶段 Transformer 流水线（文本 → 语义 token → 粗粒度声学 token → 细粒度声学 token），支持声音克隆、多语言合成和音乐、环境声等非语音音频。通用性牺牲了可控性：它不如专用 TTS 精确，但更灵活。

- **Parler-TTS**（Hugging Face，2024）用**自然语言描述**控制声音：无需风格参考音频，用户只需输入“安静房间里，一位声音温暖、富有表现力的女声”之类的描述。Parler-TTS 在带标注语音上训练，每段语音都配有说话风格的自然语言描述，因此无需参考音频即可直观控制。

- **Neuphonic** 是面向 API 的 TTS 平台，优化超低延迟合成，目标是实时语音代理和对话式 AI。通过在完整文本到达前就开始生成音频的流式架构，它把首个音频延迟降到 100 ms 以下。Neuphonic 重点解决部署与延迟优化，而不是提出全新架构，为现代神经 TTS 提供生产级基础设施。

- **KittenTTS** 是紧凑、快速的 TTS 模型，面向高效和低资源部署。它优先保证边缘与嵌入式应用的低延迟、小模型体积，在 CPU 和移动设备上实时运行时牺牲少量自然度。

- 现代 TTS 正分化为两种范式：(1) **codec 语言模型**（VALL-E、Orpheus、Fish Speech）把语音生成看作离散音频码的下一 token 预测，利用 LLM 扩展定律；(2) **流/扩散模型**（VITS、StyleTTS 2、Kokoro）通过迭代细化生成连续梅尔频谱图或波形。codec LM 擅长零样本克隆和表达力，流/扩散模型通常更小更快；两者都在快速接近真人自然度。

- **韵律建模**控制语音的“音乐性”：音高、时长、能量、节奏和语调。即使单个音素清楚，韵律不好也会让合成语音平板、机械。可以把韵律理解为单调 GPS 声音与富有表现力的有声书朗读者之间的差别。

- **音高**（基频 $F_0$）是感知到的高低。疑问句末尾通常上扬，陈述句末尾通常下降，情绪语音中会连续变化。$F_0$ 可用 CREPE（神经音高跟踪器）或 YIN（基于自相关，见文件 01）从音频提取。TTS 中，音高可以由声学模型（FastSpeech 2 的音高预测器）预测，也可以隐式学习（Tacotron 2）。

- **时长**决定说话速度和节奏。重读音节更长，功能词会缩短，停顿标记短语边界。非自回归模型（FastSpeech）显式建模时长，自回归模型（Tacotron）则由注意力对齐隐式决定时长。

- **能量**（响度）承载重音。“I didn't say HE stole it” 和 “I didn't say he STOLE it” 的含义不同，完全由能量模式传达。

- **风格嵌入**捕获更高层的韵律模式。**全局风格 token（GST）**框架（Wang 等，2018）学习一组风格 token（在可学习嵌入集合上的软注意力），表示“兴奋”“悲伤”“耳语”等说话风格。风格编码器从参考语句提取风格嵌入并加入编码器输出，推理时即可迁移风格。

- **声音转换（VC）**在保留语言内容的同时改变语句的说话人身份。想象录下自己的声音，输出却像某个目标说话人。VC 必须把说话人身份与内容解耦。

![声音转换流水线：源语音分解为内容表示和说话人嵌入，替换为目标说话人嵌入后由解码器重构目标声音](../images/voice_conversion_pipeline.svg)

- **说话人嵌入**（详见文件 04）用定长向量编码说话人身份，可以来自预训练说话人验证模型（x-vector、ECAPA-TDNN）。VC 先把源语音编码为与说话人无关的内容表示，再结合目标说话人嵌入解码。

- **解耦表示**把语音分成相互独立的因素：内容（音素）、说话人身份、音高和节奏。常见方法包括：
    - **信息瓶颈**：把内容表示压缩得足够紧，使说话人信息丢失（AutoVC）。
    - **对抗训练**：在内容表示上训练说话人分类器，并通过梯度反转移除说话人信息。
    - **向量量化**：VQ-VAE 迫使内容经过离散瓶颈，自然去除说话人身份（码本条目表示音素类别，而非说话人特征）。

- **声音克隆**以目标说话人的声音合成语音。**多说话人 TTS**在多说话人数据上训练，以说话人嵌入为条件；推理时从注册音频提取新说话人的嵌入，作为生成条件。

- **少样本声音克隆**用少量数据（几分钟）适应新说话人。说话人编码器从注册音频提取嵌入，TTS 模型以此为条件生成语音。SV2TTS（Jia 等，2018）采用这一思路：独立训练的说话人编码器、以说话人嵌入为条件的 Tacotron 2 合成器，以及 WaveRNN 声码器。

- **零样本声音克隆**完全不需要适应：一段 3–30 秒的短语音就够了。VALL-E 把注册音频当作语言模型提示；模型在大规模多说话人数据上训练，语句内声音保持一致是统计常态，因此能继续生成同一声音。

- **语音活动检测（VAD）**在每个时间帧回答一个二元问题：此刻有人说话吗？尽管简单，VAD 是 ASR（文件 02）、说话人分离（文件 04）和降噪（文件 05）的关键预处理步骤。好的 VAD 跳过静音以减少计算，并避免把噪声当成语音来处理，从而提升准确率。

- 经典 VAD 使用能量阈值（语音比静音更响）、过零率（语音有特征性的过零模式）和频谱特征。在低信噪比的噪声环境中，这些方法会失效。

- **神经 VAD**把问题看成帧级二分类。小型 RNN 或 CNN 接收声学特征（文件 01 的对数梅尔能量），预测语音/非语音概率。

- **WebRTC VAD**（Google）是经典的轻量 VAD，用基于 GMM 的分类器处理简单频谱特征。它有四个激进程度等级（0–3），速度极快，但在音乐、非语音发声和低信噪比环境中表现较差。由于零依赖且简单，仍广泛用作基线。

- **Silero VAD**（Silero Team，2021）是生产环境事实上的神经 VAD 标准。其架构是小型深度可分离一维卷积堆栈（把第 08 章 MobileNet 思想用于音频），后接用于时间上下文的单层 LSTM，最后用线性头输出每帧语音概率。整个模型小于 2 MB（约 100 万参数），按 30–100 ms 分块处理音频。
    - **输入**：原始 16 kHz 音频（无需手工特征提取，卷积前端直接从波形学习特征）。
    - **带窗口的有状态推理**：LSTM 隐状态在块之间传递，因此无需重复处理完整历史即可处理流式音频。每次调用处理 30、60 或 100 ms 的块，返回 $[0, 1]$ 中的语音概率。
    - **自适应阈值**：Silero VAD 不使用单一固定阈值，而是设置独立的起始/结束阈值以及最小语音/静音时长，防止噪声边界快速抖动。语音段必须超过起始阈值并持续足够时间才确认，静音低于结束阈值并持续一段时间才关闭语音段。
    - **性能**：Silero VAD 在 CPU 上的实时因子为 1–2%（处理 1 秒音频约需 10–20 ms），适合边缘设备、手机和实时流水线。在噪声和音乐较多的音频上明显优于 WebRTC VAD，同时足够小，可端侧部署。
    - Silero VAD 常作为 Whisper（文件 02）的前端，在转写前把长音频切成语句块；也用于说话人分离流水线（文件 04），在提取说话人嵌入前定位语音区域。

- **声学活动检测（AAD）**把 VAD 扩展到检测所有声学活动，而不只是语音。这对智能家居、安防系统和野生动物监测很有用。AAD 模型可检测玻璃破碎、狗叫或警报等事件，通常使用文件 04 中的音频分类框架。

- **TTS 评估指标**同时衡量客观质量与主观自然度：
    - **平均意见分（MOS）**：人类听众以 1–5 分评价自然度，是金标准，但昂贵且耗时。
    - **梅尔倒谱失真（MCD）**：衡量合成与参考梅尔倒谱之间的距离。越低越好，但不总与感知一致。
    - **PESQ / POLQA**：最初为电话设计的标准化感知评估指标。
    - **说话人相似度**：合成音频与参考音频的说话人嵌入余弦相似度（声音克隆时很重要）。
    - **可懂度**：把合成音频送入 ASR 系统（文件 02），计算 WER。

## 编程任务（使用 Colab 或 notebook）

- **任务 1：从梅尔频谱图实现 Griffin-Lim 声码器。** 实现迭代式相位重构算法，把梅尔频谱图转换回波形，理解声码器问题以及为什么需要神经声码器。

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

- **任务 2：时长预测器（FastSpeech 风格）。** 训练小型卷积时长预测器，把音素嵌入映射到时长；这是实现非自回归 TTS 的核心组件。

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
- **任务 3：使用上采样卷积的简单神经声码器。** 构建最小 HiFi-GAN 风格生成器，用转置卷积和残差块把梅尔频谱图上采样为波形。

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

- **任务 4：使用简单 RNN 的语音活动检测。** 在合成音频特征上训练小型 GRU VAD 模型，把帧分类为语音或静音。

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
