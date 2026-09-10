---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 09 - audio and speech/02. automatic speech recognition.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 16d9539ebee0c7b0e194d75b11d0ca50b82d6e0837b50300e628ed32227da00c
status: reviewed
---
# 自动语音识别

*自动语音识别（ASR）把口语音频转换为书面文字，连接人类语音与机器可读语言。本篇从经典流水线到现代神经架构，介绍 GMM-HMM、CTC 损失、RNN-Transducer、基于注意力的编码器—解码器模型（LAS）、Whisper 和端到端 ASR。*

- **自动语音识别**（Automatic Speech Recognition，ASR）是把口语音频转换为书面文字的任务。它既是 AI 最早的问题之一（20 世纪 50 年代的系统只能识别单个数字），也是商业部署最广泛的问题之一（语音助手、转写服务、字幕）。

- 语音的巨大变化带来了困难：说话人、口音、语速、背景噪声、麦克风特性各不相同，而且把连续声学信号映射到离散词语本身就存在歧义。

- 可以把 ASR 想成法庭速记员：速记员听到连续声音，在脑中切分词语，用上下文消解 “they're / their / there” 之类的歧义，再打字输出。ASR 做的事情相同，只是把各阶段显式化，以便独立或联合优化。

- **经典 ASR 流水线**把音频依次处理为多个阶段：原始音频先转换为特征（MFCC 或对数梅尔频谱图，见文件 01）；**声学模型**评估每一帧特征与各音素单元的匹配程度；**发音模型**（词典）把音素映射到词语；**语言模型**评估词序列的可能性；**解码器**搜索使总分最大的词序列。每个组件分别训练和调参。

![从原始音频、特征提取、声学模型、解码器和语言模型到文字输出的 ASR 流水线](../images/asr_pipeline.svg)

- **音素**是语言中能够区分词语的最小声音单位。英语大约有 39–44 个音素（具体数量取决于方言和音素表）。例如 “bat” 与 “pat” 只差一个音素（/b/ 与 /p/）。多数 ASR 系统会建模**上下文相关音素**，即**三音素（triphone）**：由左右邻居共同定义一个音素（例如处在 “b_t” 上下文中的 “a” 与处在 “c_t” 中的 “a” 是不同单元），因为邻近音素会显著影响实际声学表现，这称为**协同发音**。

- 三音素的组合数量极大（40 个音素的三次方为 64,000），因此**决策树聚类**会把声学相似的三音素分组为**senone**（通常 2000–10,000 类）。每个 senone 都有自己的声学模型。这种聚类属于第 06 章介绍的决策树算法。

- **GMM-HMM**（高斯混合模型—隐马尔可夫模型）从 20 世纪 80 年代到 2010 年代初一直是主流声学建模方法。HMM（见第 05 章）负责建模语音的时间结构：每个音素是一个从左到右的 HMM，含 3–5 个状态，每个状态代表音素的子片段（起始、中段、结束）；状态间转移隐式地建模持续时间。

- 在每个 HMM 状态上，发射概率（给定该状态时观测到某特征向量的可能性）由**高斯混合模型**（GMM）建模，即多个多元高斯分布的加权和（见第 05 章）：

```math
p(\mathbf{x} | s) = \sum_{m=1}^{M} w_m \cdot \mathcal{N}(\mathbf{x} ; \boldsymbol{\mu}_m, \boldsymbol{\Sigma}_m)
```

- 其中 $\mathbf{x}$ 是特征向量（例如 39 维 MFCC），$s$ 是 HMM 状态，$M$ 是混合成分数（通常 8–64），$w_m$ 是混合权重，$\boldsymbol{\mu}_m$ 和 $\boldsymbol{\Sigma}_m$ 是各高斯成分的均值与协方差。为提高计算效率，协方差矩阵通常取对角形式（MFCC 经 DCT 去相关后，各维近似独立）。

- 训练使用 **Baum–Welch 算法**（第 05 章 EM 的特例），从带转写的语音数据迭代估计 GMM 参数和 HMM 转移概率。解码（寻找最可能的状态序列）使用**Viterbi 算法**（第 05 章的动态规划）：

```math
\delta_t(j) = \max_{i} \left[ \delta_{t-1}(i) \cdot a_{ij} \right] \cdot b_j(\mathbf{x}_t)
```

- 其中 $\delta_t(j)$ 是时刻 $t$ 结束于状态 $j$ 的最佳路径概率，$a_{ij}$ 是从状态 $i$ 到 $j$ 的转移概率，$b_j(\mathbf{x}_t)$ 是状态 $j$ 对特征 $\mathbf{x}_t$ 的发射概率。

- **DNN-HMM**（Hinton 等，2012）用深度神经网络（第 06 章）替代 GMM 发射模型，从特征帧窗口预测 senone 后验概率 $p(s | \mathbf{x})$。HMM 仍负责时间结构和序列排序，而神经网络提供更有判别力的发射分数。相较 GMM，这种混合方案将词错误率相对降低了 20–30%，并在 2012–2016 年占据主导。

- **WFST 解码**（加权有限状态换能器）是传统 ASR 的标准解码框架。每个组件（HMM 拓扑 H、上下文依赖 C、词典 L、语法/语言模型 G）都表示为带权有限状态换能器，再组合成单一搜索图 $H \circ C \circ L \circ G$。Viterbi 搜索在组合图中寻找最低代价路径。WFST 支持模块化组合知识源和高效的动态规划搜索，其数学基础来自有限自动机理论（与第 05 章的状态机相关）。

- **端到端 ASR**取消独立的发音模型、音素表和 WFST 解码器，训练一个直接把音频特征映射到字符或词片的神经网络。关键挑战是**对齐问题**：输入每秒有数百个特征帧，输出每秒只有几个字符，二者长度差异很大，而且训练时并不知道对应关系。

- **连接主义时间分类**（Connectionist Temporal Classification，CTC）（Graves 等，2006）通过引入特殊的 **blank** token 解决对齐问题。网络可以输出任意字符与 blank 序列，只要合并连续重复并删除 blank 后得到正确转写即可。例如 “cat” 可以由 “--cc-aa-t--” 产生（“-” 表示 blank）。

- 形式化地说，CTC 定义了从所有长度为 $T$ 的输出序列（字母表加 blank）到标签序列的多对一映射 $\mathcal{B}$。标签序列 $\mathbf{y}$ 的概率，是所有可折叠为它的对齐路径概率之和：

$$P(\mathbf{y} | \mathbf{x}) = \sum_{\boldsymbol{\pi} \in \mathcal{B}^{-1}(\mathbf{y})} \prod_{t=1}^{T} p(\pi_t | \mathbf{x})$$

![CTC 对齐示意：经过 blank 和字符 token 的多条路径最终都折叠为同一输出文字](../images/ctc_alignment.svg)

- 直接求和需要枚举指数级数量的对齐路径；**CTC 前向—后向算法**利用动态规划在 $O(T \cdot |\mathbf{y}|)$ 时间内高效计算，原理类似第 05 章的 HMM 前向—后向算法。

- CTC 做了**条件独立假设**：给定输入后，每个时间步的输出彼此独立。因此 CTC 无法建模输出之间的依赖（例如无法学到 “q” 几乎总跟着 “u”）。这类依赖必须由外部语言模型处理。

- **CTC 解码**有几种选择：
    - **贪心解码**：每个时间步取概率最高的 token，再折叠序列。速度快但不是最优。
    - **束搜索**：每一步保留 top-$k$ 个部分假设，合并折叠后具有相同前缀的假设，并可加入语言模型分数。
    - **前缀束搜索**：专门处理 CTC blank 合并的束搜索变体，确保比较的是折叠后的假设。

- **RNN-Transducer**（RNN-T）（Graves，2012）在 CTC 上加入显式的**预测网络**（类似语言模型的 RNN），让每个输出条件于此前输出，从而去除条件独立假设。RNN-T 包含三个组件：
    - **编码器**：处理音频特征，产生隐藏表示 $\mathbf{h}_t^\text{enc}$（通常是多层 LSTM 或 Conformer）。
    - **预测网络**：自回归 RNN 根据已经发出的标签产生隐藏表示 $\mathbf{h}_u^\text{pred}$。
    - **联合网络**：在每个（时间、标签）位置融合编码器与预测网络输出，产生下一个 token（包括 blank）的分布：

$$p(y | t, u) = \text{softmax}(W \cdot \text{tanh}(W_\text{enc} \mathbf{h}_t^\text{enc} + W_\text{pred} \mathbf{h}_u^\text{pred} + b))$$

- RNN-T 在一个时间步可以发出零个或多个标签（在进入下一时间步前连续发出非 blank token，或发出 blank 而不输出便前进）。训练在二维（时间、标签）网格上使用前向—后向算法，复杂度为 $O(T \cdot U)$，其中 $U$ 是输出长度。RNN-T 天然支持流式处理，因此成为端侧流式 ASR 的主流架构（用于 Google Pixel 等手机）：编码器从左到右处理音频，预测网络增量生成输出。

- **Listen, Attend and Spell**（LAS）（Chan 等，2016）是基于注意力的编码器—解码器模型（第 06 章的序列到序列架构），包含三个组件：
    - **Listener（编码器）**：金字塔式双向 LSTM 处理完整输入序列，每层拼接相邻隐藏状态并将序列下采样 8 倍，得到更短的编码器隐藏序列。
    - **Attention**：每个解码步在全部编码器状态上计算注意力权重，形成上下文向量（与第 07 章的注意力机制相同）。
    - **Speller（解码器）**：自回归 LSTM 逐字符生成转写，条件是上下文向量与此前生成的字符。

- LAS 效果很强，但解码前必须拿到完整语句（注意力要访问全部编码器状态），不适合流式应用。对很长语句，注意力会变得分散，性能也会下降。

- **Conformer**（Gulati 等，2020）结合卷积捕获局部模式的能力与自注意力建模全局依赖的能力。每个 Conformer 块采用夹心结构，包含四个模块：
    1. **前馈模块**（半步）：带残差连接的前馈网络，使用一半残差权重。
    2. **多头自注意力模块**：带相对位置编码的标准 Transformer 自注意力（见第 07 章）。
    3. **卷积模块**：逐点卷积、门控线性单元（GLU）、一维深度可分离卷积、批归一化、Swish 激活和另一个逐点卷积。深度卷积捕获局部上下文，类似在特征序列上使用 n-gram。
    4. **前馈模块**（半步）：与模块 1 相同。

- 输出为：$\mathbf{y} = \text{LayerNorm}(\mathbf{x} + \frac{1}{2}\text{FFN}_1 + \text{MHSA} + \text{Conv} + \frac{1}{2}\text{FFN}_2)$。经验表明，带半步残差的 Macaron 式 FFN—Attention—Conv—FFN 排列优于其他顺序。Conformer 已成为 CTC 和 RNN-T 的默认编码器，优于纯 Transformer 或纯 LSTM 编码器。

![Conformer 块示意：前馈、自注意力、卷积、前馈构成夹心结构](../images/conformer_block.svg)

- **Whisper**（Radford 等，2023）是 OpenAI 的大规模注意力 ASR 模型。它采用标准编码器—解码器 Transformer，在从互联网抓取的 68 万小时弱监督数据（音频配近似转写）上训练。关键设计包括：
    - 输入：80 通道对数梅尔频谱图（见文件 01），窗长 25 ms、帧移 10 ms，标准化为零均值和单位方差。
    - 编码器：带正弦位置嵌入和前激活层归一化的标准 Transformer 编码器。
    - 解码器：使用字节级 BPE 分词器（第 07 章）自回归生成 token 的 Transformer 解码器。
    - 多任务：通过解码器提示中的特殊任务 token，让一个模型同时完成转写、翻译、语言识别和时间戳预测。
    - Whisper 的跨领域、跨口音、跨语言泛化主要来自训练数据规模，而非架构新颖性。

- **wav2vec 2.0**（Baevski 等，2020）是用于学习语音表示的**自监督**预训练框架。核心思想是先用大量无标注音频学习表示，再用少量标注数据微调。这沿用了 BERT（第 07 章）的自监督范式，但适配了连续音频信号。

- wav2vec 2.0 包含三部分：
    - **特征编码器**：多层一维 CNN 处理原始波形，在 20 ms 帧率产生潜表示 $\mathbf{z}_t$（16 kHz 下每 320 个样本一个向量）。
    - **量化模块**：用**乘积量化**把潜表示离散到有限码本（将向量分组、每组独立量化，从 $G$ 个各含 $V$ 个条目的码本中选择），为对比学习目标产生 $\mathbf{q}_t$。
    - **上下文网络**：Transformer 编码器接收（部分遮蔽的）潜表示，产生上下文化表示 $\mathbf{c}_t$。

![wav2vec 2.0 架构：CNN 特征编码器、遮蔽、Transformer 上下文网络与量化目标上的对比学习](../images/wav2vec2_pretraining.svg)

- 预训练时，潜表示的随机片段会被**遮蔽**（替换为学习到的 mask 嵌入）；模型需要从一组干扰项（同一语句其他位置采样的负例）中找出被遮蔽位置的真实量化表示。对比损失为：

$$\mathcal{L} = -\log \frac{\exp(\text{sim}(\mathbf{c}_t, \mathbf{q}_t) / \kappa)}{\sum_{\tilde{\mathbf{q}} \in Q_t} \exp(\text{sim}(\mathbf{c}_t, \tilde{\mathbf{q}}) / \kappa)}$$

- 其中 $\text{sim}$ 是余弦相似度，$\kappa$ 是温度参数，$Q_t$ 包含真实量化目标与干扰项。额外的**多样性损失**鼓励均匀使用全部码本条目。该损失本质上是 InfoNCE 对比损失，与视觉自监督学习使用的对比目标属于同一类。

- 预训练后，在顶部添加线性投影和 CTC 头，并用标注数据微调。wav2vec 2.0 只用 10 分钟标注音频（预训练使用 53,000 小时无标注音频）就取得接近当时 SOTA 的结果，展示了自监督学习对低资源语音识别的价值。

- **HuBERT**（Hsu 等，2021）也是自监督方法，但把对比目标换成**遮蔽预测**目标（预测被遮蔽帧的离散聚类标签）。目标由离线聚类生成：第一次迭代对 MFCC 做 k-means，后续迭代对 HuBERT 特征做 k-means。相较 wav2vec 2.0，HuBERT 不需要量化模块或对比采样，训练流水线更简单，效果相当甚至更好。

- **Fast Conformer**（Rekesh 等，2023，NVIDIA NeMo）用**下采样注意力**替代标准 Conformer 的二次复杂度自注意力：先通过步幅卷积压缩输入序列（通常 8 倍），再计算注意力并展开回来。在保留全局上下文的同时，把注意力成本从 $O(T^2)$ 降到 $O(T^2/64)$，因此可以训练几分钟长的语句而不耗尽内存。Fast Conformer 是 NVIDIA NeMo 的默认编码器，也是其生产模型的骨干。

- **Parakeet**（NVIDIA，2024）是一系列高精度英语 ASR 模型，以 Fast Conformer 为编码器、CTC 和 RNN-T 为解码器，在 64,000 小时英语语音上训练。发布时，0.6B 和 1.1B 参数模型在标准基准上取得最低词错误率，多数英语测试集超过 Whisper large-v3。高效的 Fast Conformer、激进的数据增强（SpecAugment、速度扰动、噪声混合）和大规模监督数据是其关键，说明精心工程化已知组件仍能推进 SOTA。

- **Canary**（NVIDIA，2024）扩展 NeMo 以支持多语种、多任务 ASR。它使用带注意力解码器的 Fast Conformer（而非 CTC 或 RNN-T），在一个模型中同时完成多语言转写和翻译，类似 Whisper 的多任务设计但骨干更高效。Canary 支持英语、德语、西班牙语和法语，并取得有竞争力的准确率。

- **Moonshine**（Useful Sensors，2024）是一系列专为**端侧与边缘部署**优化的 ASR 模型。编码器采用混合架构，用小型 CNN 加少量 Transformer 层取代最初的 Transformer/Conformer 层，大幅缩小模型（基础模型少于 3000 万参数）。Moonshine 面向 CPU 和低功耗设备上的实时流式处理，在一定准确率取舍下，将延迟和内存降到 Whisper 的 1/5–1/10。

- **Distil-Whisper**（Gandhi 等，2023）用**知识蒸馏**（第 06 章）压缩 Whisper。学生模型只有 2 个解码器层（Whisper 有 32 层）但保留完整编码器，并训练为匹配教师的输出分布。它的 WER 与教师相差不到 1%，速度快 6 倍，适合完整 Whisper 过慢的实时场景。

- **Universal Speech Model（USM）**（Zhang 等，2023，Google）把自监督预训练扩展到 1200 万小时、覆盖 300 多种语言的无标注音频，再进行监督微调。USM 证明 wav2vec 2.0/自监督范式可以扩展到真正的大规模数据，在标注极少的低资源语言上仍有很强表现。

- **Massively Multilingual Speech（MMS）**（Pratap 等，2023，Meta）利用宗教录音等多语种音频，把 wav2vec 2.0 预训练扩展到 1100 多种语言。MMS 覆盖的语言远多于以往 ASR 系统，让许多资源稀缺语言首次具备语音识别能力。

- 现代 ASR 正汇聚为几种主流模式：(1) 流式场景使用带 CTC 或 RNN-T 的 Conformer 编码器；(2) 离线/多任务场景使用编码器—解码器 Transformer；(3) 低资源场景使用自监督预训练；(4) 通过更多数据和更大模型提升准确率。具体选择取决于延迟预算、可用算力、语言数量，以及应用是流式还是批处理。

- **语言模型融合**利用声学模型之外的语言知识来提升 ASR。基本做法是在解码时把声学模型分数 $p(\mathbf{x} | \mathbf{y})$（音频与转写的匹配程度）和语言模型分数 $p(\mathbf{y})$（转写作为句子的可能性）结合起来。

- **浅融合**在束搜索时组合这些分数：

$$\hat{\mathbf{y}} = \arg\max_\mathbf{y} \left[ \log p_\text{AM}(\mathbf{y} | \mathbf{x}) + \lambda \log p_\text{LM}(\mathbf{y}) \right]$$

- 其中 $\lambda$ 是可调权重，$p_\text{LM}$ 是外部语言模型（通常是第 07 章的 n-gram 或神经语言模型）。方法简单有效，但要求语言模型与 ASR 模型使用同一 token 词表。

- **深度融合**（Gulcehre 等，2015）把语言模型整合进解码器：将 LM 隐状态与解码器隐状态拼接，经门控机制后送入输出投影。整个系统（包括预训练 LM）联合微调，融合更深入但训练更复杂。

- **冷融合**（Sriram 等，2018）与深度融合相似，但从头训练集成语言模型的 ASR 解码器，而不是微调预训练解码器；这样迫使声学模型学习互补信息，而不是重复 LM 已掌握的内容。

- **重打分**（N-best rescoring）采用两遍流程：先用束搜索生成 $N$ 个候选转写，再用更强的语言模型（如大型 Transformer LM）重新排序。实现简单，还能使用不适合第一遍解码的超大语言模型。

- **内部语言模型估计**（ILME）处理一个隐蔽问题：端到端模型会从训练转写中隐式学到内部 LM，浅融合时它可能与外部 LM 冲突（相当于重复计算语言先验）。ILME 估计内部 LM，并在融合时减去其分数：

$$\hat{\mathbf{y}} = \arg\max_\mathbf{y} \left[ \log p_\text{E2E}(\mathbf{y} | \mathbf{x}) - \beta \log p_\text{ILM}(\mathbf{y}) + \lambda \log p_\text{LM}(\mathbf{y}) \right]$$

- **流式与离线 ASR**是一个根本架构选择。离线（批处理）ASR 先处理完整语句再输出；流式 ASR 随音频到达逐步输出，并将延迟控制在有限范围。

- 流式处理对实时应用至关重要：实时字幕、语音助手（用户希望在说完前得到回应）、电话转写。困难在于未来上下文有助于识别（知道下一个词是 “York” 才能区分 “New”），而流式系统不能无限期等待未来信息。

- **单向编码器**（从左到右的 LSTM、因果卷积、因果 Transformer）天然支持流式，因为每个输出只依赖过去和当前输入。双向编码器会查看未来上下文，不能直接流式。

- **分块注意力**（blockwise/segmental attention）把输入切成固定长度的块，只在块内（可选地加前几个块）执行自注意力。这样延迟受块长和处理时间限制，同时保留块内局部双向上下文；代价是块越短，准确率下降越明显。

- **前瞻（lookahead）**允许流式编码器在输出当前帧前查看少量未来帧（例如 300–900 ms），即在单向计算中加入小的右侧上下文。前瞻窗口增加延迟，却能显著提升准确率。

- 流式 ASR 的延迟由多部分组成：
    - **算法延迟**：音频到达后等待模型能够处理的时间，由块长、前瞻和特征提取决定。
    - **计算延迟**：执行模型前向传播所需时间。
    - **端点检测延迟**：检测用户停止说话所需的时间。
    - **首 token 延迟**：第一个词出现的速度。**最终确认延迟**：最终输出被确认的速度（流式系统通常会在更多音频到来时修正临时输出）。

- **ASR 评估指标**：

- **词错误率**（WER）是主要指标。它用编辑距离把假设（系统输出）与参考（真实转写）对齐，计算把一个变成另一个所需的最少替换、插入和删除次数：

$$\text{WER} = \frac{S + D + I}{N}$$

- 其中 $S$ 是替换数，$D$ 是删除数，$I$ 是插入数，$N$ 是参考文本的词数。如果插入很多词，WER 可以超过 100%。干净朗读语音的 WER 约 5% 已接近人类水平；会话或噪声语音更难（10–20% 甚至更高）。

- **字符错误率**（CER）使用同一公式，但在字符层面计算。对于没有明确词边界的语言（中文、日语），CER 更有信息量；它也能更细致地衡量近似错误（“cat” 与 “bat” 的 WER 是 100%，CER 却是 33%）。

- **词信息丢失**（WIL）和**词信息保留**（WIP）是信息论替代指标，更准确地考虑参考与假设的相关性，但报告频率较低。

- **实时因子**（RTF）衡量计算效率，即处理时间与音频时长之比。RTF < 1 表示快于实时，RTF > 1 表示无法跟上实时音频；流式系统必须保持 RTF < 1。

- **数据增强**对鲁棒 ASR 至关重要，常见方法包括：
    - **速度扰动**：以 0.9 倍和 1.1 倍速度重采样音频（同时改变音高与时长）。
    - **SpecAugment**（Park 等，2019）：在频谱图上随机遮蔽频带和时间步。这是音频版 dropout，也是最有效的 ASR 正则化技术之一，不需要额外数据。
    - **噪声增强**：以不同信噪比将干净语音与录制噪声混合。
    - **房间脉冲响应模拟**：把干净语音与模拟房间声学卷积，模拟混响环境。

- **ASR 分词**决定模型输出词表，选项包括：
    - **字符**：简单、词表小（英语约 30 个），但输出序列长且没有隐式语言建模。
    - **词片/BPE**（第 07 章）：在词表大小和序列长度间折中，是现代系统标准（Whisper 使用约 50,000 个字节级 BPE token）。
    - **词语**：词表大（50,000+），输出短，但无法处理词表外词语。
    - **音素**：有语言学依据且紧凑，但需要发音词典。

- ASR 的演进可以概括为：高度工程化的模块化系统（GMM-HMM + WFST 解码，1990–2010 年代）→ 混合系统（DNN-HMM，2012–2016）→ 把越来越多流水线吸收进单一神经网络的端到端系统（CTC、RNN-T、LAS，2016–2020）→ 利用海量无标注或弱标注数据的大规模预训练模型（wav2vec 2.0、Whisper，2020 至今）。每次转变都简化了工程并提升了准确率，体现机器学习从手工设计转向数据学习表示的趋势（第 06 章中 CNN 替代手工图像特征、第 07 章中 Transformer 替代 NLP 特征也是同一故事）。

## 编程任务（使用 Colab 或 notebook）

1. **从零实现 CTC 损失。** 使用 JAX 构造短 logits 序列和目标标签，执行 CTC 前向算法得到总概率，并计算负对数似然损失。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

def ctc_forward(log_probs, targets):
    """
    CTC forward algorithm (log-domain for numerical stability).
    log_probs: (T, V) log probabilities over vocabulary (index 0 = blank)
    targets: (U,) target label indices (no blanks)
    Returns: log probability of the target sequence under CTC.
    """
    T, V = log_probs.shape
    U = len(targets)

    # Build the extended label sequence with blanks: [blank, y1, blank, y2, ..., yU, blank]
    S = 2 * U + 1
    labels = jnp.zeros(S, dtype=jnp.int32)  # all blanks
    for i in range(U):
        labels = labels.at[2 * i + 1].set(targets[i])

    # Initialise alpha (log domain)
    NEG_INF = -1e30
    alpha = jnp.full((T, S), NEG_INF)
    alpha = alpha.at[0, 0].set(log_probs[0, labels[0]])        # start with blank
    alpha = alpha.at[0, 1].set(log_probs[0, labels[1]])        # or first label

    # Fill forward
    for t in range(1, T):
        for s in range(S):
            # Same state
            a = alpha[t - 1, s]
            # From previous state
            if s > 0:
                a = jnp.logaddexp(a, alpha[t - 1, s - 1])
            # Skip blank (if current and two-back labels are different)
            if s > 1 and labels[s] != 0 and labels[s] != labels[s - 2]:
                a = jnp.logaddexp(a, alpha[t - 1, s - 2])
            alpha = alpha.at[t, s].set(a + log_probs[t, labels[s]])

    # Total log probability: sum of last two states at final time step
    log_prob = jnp.logaddexp(alpha[T - 1, S - 1], alpha[T - 1, S - 2])
    return log_prob, alpha

# --- Toy example ---
T = 12   # input length (time steps)
V = 5    # vocab size (0=blank, 1='c', 2='a', 3='t', 4='x')
targets = jnp.array([1, 2, 3])  # "c", "a", "t"

# Create random logits and convert to log-probabilities
key = jax.random.PRNGKey(42)
logits = jax.random.normal(key, (T, V))
log_probs = jax.nn.log_softmax(logits, axis=-1)

log_prob, alpha = ctc_forward(log_probs, targets)
ctc_loss = -log_prob

print(f"Target sequence: {targets.tolist()} ('c', 'a', 't')")
print(f"Input length T={T}, Vocab size V={V}")
print(f"CTC log-probability: {log_prob:.4f}")
print(f"CTC loss (neg log-prob): {ctc_loss:.4f}")

# Visualise the forward variable (alpha) lattice
fig, ax = plt.subplots(figsize=(12, 5))
# Convert from log to linear for visualisation
alpha_linear = jnp.exp(alpha - jnp.max(alpha))  # normalise for visibility
im = ax.imshow(alpha_linear.T, aspect='auto', origin='lower', cmap='viridis')
ax.set_xlabel('Time step (t)')
ax.set_ylabel('Extended label index (s)')

label_names = ['_', 'c', '_', 'a', '_', 't', '_']  # _ = blank
ax.set_yticks(range(len(label_names)))
ax.set_yticklabels(label_names)
ax.set_title(f'CTC Forward Variable (alpha lattice) | Loss = {ctc_loss:.2f}')
plt.colorbar(im, ax=ax, label='Normalised probability')
plt.tight_layout(); plt.show()
```

2. **构建基于注意力的编码器—解码器 ASR 模型（LAS 风格）。** 使用一维卷积编码器和单层解码器的点积注意力，在合成数据上运行并可视化注意力权重。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

# --- Minimal attention-based encoder-decoder for ASR ---

def init_params(key, input_dim, hidden_dim, vocab_size):
    """Initialise parameters for a tiny LAS-like model."""
    keys = jax.random.split(key, 8)
    scale = 0.1
    params = {
        # Encoder: simple linear projection (simulating conv output)
        'enc_w': jax.random.normal(keys[0], (input_dim, hidden_dim)) * scale,
        'enc_b': jnp.zeros(hidden_dim),
        # Attention: query, key, value projections
        'attn_q': jax.random.normal(keys[1], (hidden_dim, hidden_dim)) * scale,
        'attn_k': jax.random.normal(keys[2], (hidden_dim, hidden_dim)) * scale,
        'attn_v': jax.random.normal(keys[3], (hidden_dim, hidden_dim)) * scale,
        # Decoder RNN (simple Elman RNN for illustration)
        'dec_wh': jax.random.normal(keys[4], (hidden_dim, hidden_dim)) * scale,
        'dec_wx': jax.random.normal(keys[5], (vocab_size, hidden_dim)) * scale,
        'dec_wc': jax.random.normal(keys[6], (hidden_dim, hidden_dim)) * scale,
        'dec_b': jnp.zeros(hidden_dim),
        # Output projection
        'out_w': jax.random.normal(keys[7], (hidden_dim, vocab_size)) * scale,
        'out_b': jnp.zeros(vocab_size),
    }
    return params

def encode(params, x):
    """Encoder: linear projection (placeholder for conv/LSTM stack)."""
    return jnp.tanh(x @ params['enc_w'] + params['enc_b'])

def attend(params, query, enc_out):
    """Dot-product attention over encoder outputs."""
    q = query @ params['attn_q']                   # (hidden,)
    k = enc_out @ params['attn_k']                 # (T_enc, hidden)
    v = enc_out @ params['attn_v']                 # (T_enc, hidden)
    d_k = q.shape[-1]
    scores = (k @ q) / jnp.sqrt(d_k)              # (T_enc,)
    weights = jax.nn.softmax(scores)               # (T_enc,)
    context = weights @ v                          # (hidden,)
    return context, weights

def decode_step(params, h_prev, y_prev_onehot, enc_out):
    """Single decoder step: RNN + attention."""
    # Embed previous token
    y_emb = y_prev_onehot @ params['dec_wx']       # (hidden,)
    # Attend to encoder
    context, attn_w = attend(params, h_prev, enc_out)
    # RNN update
    h = jnp.tanh(h_prev @ params['dec_wh'] + y_emb + context @ params['dec_wc']
                  + params['dec_b'])
    # Output logits
    logits = h @ params['out_w'] + params['out_b']
    return h, logits, attn_w

# --- Setup ---
key = jax.random.PRNGKey(0)
input_dim = 40       # e.g., 40 mel bands
hidden_dim = 64
vocab_size = 10      # small vocab for demo
T_enc = 30           # encoder time steps
T_dec = 8            # decoder steps

params = init_params(key, input_dim, hidden_dim, vocab_size)

# Synthetic input: random mel-like features
key, subkey = jax.random.split(key)
x = jax.random.normal(subkey, (T_enc, input_dim))

# Encode
enc_out = encode(params, x)

# Decode (teacher forcing with random targets)
key, subkey = jax.random.split(key)
targets = jax.random.randint(subkey, (T_dec,), 0, vocab_size)

h = jnp.zeros(hidden_dim)
all_logits = []
all_attn = []

for t in range(T_dec):
    y_prev = jax.nn.one_hot(targets[t] if t > 0 else 0, vocab_size)
    h, logits, attn_w = decode_step(params, h, y_prev, enc_out)
    all_logits.append(logits)
    all_attn.append(attn_w)

all_attn = jnp.stack(all_attn)  # (T_dec, T_enc)
all_logits = jnp.stack(all_logits)  # (T_dec, vocab_size)

# --- Visualise attention weights ---
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

im = axes[0].imshow(all_attn, aspect='auto', cmap='Blues', origin='lower')
axes[0].set_xlabel('Encoder time step')
axes[0].set_ylabel('Decoder step')
axes[0].set_title('Attention Weights (decoder -> encoder)')
plt.colorbar(im, ax=axes[0])

# Show predicted token distribution for each decoder step
im2 = axes[1].imshow(jax.nn.softmax(all_logits, axis=-1), aspect='auto',
                      cmap='Oranges', origin='lower')
axes[1].set_xlabel('Vocabulary index')
axes[1].set_ylabel('Decoder step')
axes[1].set_title('Output Token Probabilities')
plt.colorbar(im2, ax=axes[1])

plt.suptitle('Minimal Attention-based ASR Model (untrained)')
plt.tight_layout(); plt.show()
```

3. **从零计算词错误率（WER）。** 使用动态规划（编辑距离）把多个假设与参考文本比较，并可视化编辑距离矩阵。
```python
import jax.numpy as jnp
import matplotlib.pyplot as plt
import numpy as np

def compute_wer(reference, hypothesis):
    """
    Compute WER using dynamic programming (Levenshtein distance on words).
    Returns WER, number of substitutions, deletions, insertions, and the DP matrix.
    """
    ref_words = reference.split()
    hyp_words = hypothesis.split()
    N = len(ref_words)
    M = len(hyp_words)

    # DP matrix: d[i][j] = edit distance between ref[:i] and hyp[:j]
    d = np.zeros((N + 1, M + 1), dtype=np.int32)
    # Backtrack matrix to count S, D, I
    ops = np.zeros((N + 1, M + 1, 3), dtype=np.int32)  # [sub, del, ins]

    for i in range(N + 1):
        d[i][0] = i  # all deletions
    for j in range(M + 1):
        d[0][j] = j  # all insertions

    for i in range(1, N + 1):
        for j in range(1, M + 1):
            if ref_words[i - 1] == hyp_words[j - 1]:
                sub_cost = d[i - 1][j - 1]  # match, no edit
            else:
                sub_cost = d[i - 1][j - 1] + 1  # substitution
            del_cost = d[i - 1][j] + 1      # deletion
            ins_cost = d[i][j - 1] + 1      # insertion

            d[i][j] = min(sub_cost, del_cost, ins_cost)

    # Backtrack to count operations
    i, j = N, M
    S, D, I = 0, 0, 0
    while i > 0 or j > 0:
        if i > 0 and j > 0 and d[i][j] == d[i-1][j-1] and ref_words[i-1] == hyp_words[j-1]:
            i -= 1; j -= 1  # correct
        elif i > 0 and j > 0 and d[i][j] == d[i-1][j-1] + 1:
            S += 1; i -= 1; j -= 1  # substitution
        elif i > 0 and d[i][j] == d[i-1][j] + 1:
            D += 1; i -= 1  # deletion
        elif j > 0 and d[i][j] == d[i][j-1] + 1:
            I += 1; j -= 1  # insertion
        else:
            break

    wer = (S + D + I) / N if N > 0 else 0.0
    return wer, S, D, I, d

# --- Test cases ---
reference = "the cat sat on the mat"
hypotheses = [
    "the cat sat on the mat",          # perfect
    "the cat sit on the mat",          # 1 substitution
    "the cat on the mat",              # 1 deletion
    "the big cat sat on the mat",      # 1 insertion
    "a dog sat in a rug",              # multiple errors
]

print(f"Reference: '{reference}'\n")
print(f"{'Hypothesis':<40s} {'WER':>6s} {'S':>3s} {'D':>3s} {'I':>3s}")
print("-" * 60)
results = []
for hyp in hypotheses:
    wer, S, D, I, dp = compute_wer(reference, hyp)
    results.append((hyp, wer, S, D, I, dp))
    print(f"'{hyp}':<40s} {wer:>6.1%} {S:>3d} {D:>3d} {I:>3d}")

# Visualise the DP matrix for the worst case
worst = results[-1]
hyp_words = worst[0].split()
ref_words = reference.split()
dp_matrix = worst[5]

fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# DP matrix
im = axes[0].imshow(dp_matrix, cmap='YlOrRd', origin='upper')
axes[0].set_xticks(range(len(hyp_words) + 1))
axes[0].set_xticklabels([''] + hyp_words, rotation=45, ha='right', fontsize=9)
axes[0].set_yticks(range(len(ref_words) + 1))
axes[0].set_yticklabels([''] + ref_words, fontsize=9)
axes[0].set_xlabel('Hypothesis words')
axes[0].set_ylabel('Reference words')
axes[0].set_title(f'Edit Distance Matrix\nWER = {worst[1]:.1%}')
for i in range(dp_matrix.shape[0]):
    for j in range(dp_matrix.shape[1]):
        axes[0].text(j, i, str(dp_matrix[i, j]), ha='center', va='center', fontsize=8)
plt.colorbar(im, ax=axes[0])

# WER comparison bar chart
names = [f'Hyp {i+1}' for i in range(len(results))]
wers = [r[1] * 100 for r in results]
colors = ['#27ae60' if w == 0 else '#f39c12' if w < 30 else '#e74c3c' for w in wers]
axes[1].barh(names, wers, color=colors)
axes[1].set_xlabel('WER (%)')
axes[1].set_title('Word Error Rate Comparison')
for i, (w, r) in enumerate(zip(wers, results)):
    axes[1].text(w + 1, i, f'{w:.0f}% (S={r[2]}, D={r[3]}, I={r[4]})',
                 va='center', fontsize=9)
axes[1].set_xlim(0, max(wers) * 1.4)

plt.tight_layout(); plt.show()
```

4. **实现 SpecAugment。** 对数梅尔频谱图应用频率遮蔽和时间遮蔽，并可视化增强前后的结果；频谱图由合成信号生成。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

# --- Generate synthetic log-mel spectrogram ---
key = jax.random.PRNGKey(42)
fs = 16000
duration = 2.0
t = jnp.arange(0, duration, 1.0 / fs)

# Simulate speech: chirp signal with harmonics
f0 = 120.0
x = sum(jnp.sin(2 * jnp.pi * f0 * k * t * (1 + 0.1 * t)) / k for k in range(1, 10))
key, subkey = jax.random.split(key)
x = x + 0.05 * jax.random.normal(subkey, t.shape)

# Compute log-mel spectrogram (simplified)
frame_len = 400  # 25 ms
hop_len = 160    # 10 ms
n_fft = 512
n_mels = 80

n_frames = (len(x) - frame_len) // hop_len + 1
hamming = 0.54 - 0.46 * jnp.cos(2 * jnp.pi * jnp.arange(frame_len) / (frame_len - 1))

frames = jnp.stack([x[i * hop_len : i * hop_len + frame_len] for i in range(n_frames)])
windowed = frames * hamming
spectra = jnp.abs(jnp.fft.rfft(windowed, n=n_fft)) ** 2

# Simple mel filterbank
def hz_to_mel(f): return 2595 * jnp.log10(1 + f / 700)
def mel_to_hz(m): return 700 * (10 ** (m / 2595) - 1)

mel_points = jnp.linspace(hz_to_mel(0), hz_to_mel(fs / 2), n_mels + 2)
hz_pts = mel_to_hz(mel_points)
bins = jnp.floor((n_fft + 1) * hz_pts / fs).astype(jnp.int32)

n_freqs = n_fft // 2 + 1
fb = jnp.zeros((n_mels, n_freqs))
for m in range(n_mels):
    lo, mid, hi = int(bins[m]), int(bins[m+1]), int(bins[m+2])
    for k in range(lo, mid):
        if mid != lo:
            fb = fb.at[m, k].set((k - lo) / (mid - lo))
    for k in range(mid, hi):
        if hi != mid:
            fb = fb.at[m, k].set((hi - k) / (hi - mid))

log_mel = jnp.log(spectra @ fb.T + 1e-10)

# --- SpecAugment ---
def spec_augment(spec, key, n_freq_masks=2, freq_mask_width=15,
                 n_time_masks=2, time_mask_width=25):
    """Apply SpecAugment: frequency and time masking."""
    augmented = spec.copy()
    T, F = spec.shape

    # Frequency masking
    for _ in range(n_freq_masks):
        key, k1, k2 = jax.random.split(key, 3)
        f_width = jax.random.randint(k1, (), 1, freq_mask_width + 1)
        f_start = jax.random.randint(k2, (), 0, max(1, F - freq_mask_width))
        mask = (jnp.arange(F) >= f_start) & (jnp.arange(F) < f_start + f_width)
        augmented = jnp.where(mask[None, :], 0.0, augmented)

    # Time masking
    for _ in range(n_time_masks):
        key, k1, k2 = jax.random.split(key, 3)
        t_width = jax.random.randint(k1, (), 1, time_mask_width + 1)
        t_start = jax.random.randint(k2, (), 0, max(1, T - time_mask_width))
        mask = (jnp.arange(T) >= t_start) & (jnp.arange(T) < t_start + t_width)
        augmented = jnp.where(mask[:, None], 0.0, augmented)

    return augmented

key, subkey = jax.random.split(key)
log_mel_aug = spec_augment(log_mel, subkey)

# --- Visualise ---
fig, axes = plt.subplots(2, 1, figsize=(14, 8))

im0 = axes[0].imshow(log_mel.T, aspect='auto', origin='lower', cmap='inferno',
                       extent=[0, duration, 0, n_mels])
axes[0].set_title('Original Log-Mel Spectrogram')
axes[0].set_xlabel('Time (s)'); axes[0].set_ylabel('Mel Band')
plt.colorbar(im0, ax=axes[0], label='Log Energy')

im1 = axes[1].imshow(log_mel_aug.T, aspect='auto', origin='lower', cmap='inferno',
                       extent=[0, duration, 0, n_mels])
axes[1].set_title('After SpecAugment (frequency + time masking)')
axes[1].set_xlabel('Time (s)'); axes[1].set_ylabel('Mel Band')
plt.colorbar(im1, ax=axes[1], label='Log Energy')

plt.tight_layout(); plt.show()
```
