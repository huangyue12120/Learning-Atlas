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

*自动语音识别（ASR）把口语音频转成书面文本。本文介绍从经典 GMM-HMM 流水线到现代神经网络 ASR 的发展，涵盖 CTC、RNN-T、注意力编码器—解码器模型 LAS、Whisper 和端到端识别。*

- **自动语音识别**（ASR）把口语转成书面文本。它是人工智能领域最早研究的问题之一：20 世纪 50 年代的系统已经能识别单个数字；如今，语音助手、转录服务和字幕系统都广泛使用 ASR。

- 语音变化很大。说话者、口音、语速、背景噪声和麦克风都会影响信号；连续的声学信号与离散词语之间也没有简单的一一对应关系。

- 法庭速记员要从连续的声音中辨认词语，再结合上下文消除歧义，例如区分 “they’re”、“their” 和 “there”。ASR 系统也要完成这些工作，只是会把处理过程拆成多个阶段；各阶段可以分别优化，也可以联合优化。

- **经典 ASR 流水线**依次处理音频：先把原始音频转换成特征（文件 01 介绍的 MFCC 或梅尔频谱图），再由**声学模型**评估每帧特征与各语音单位的匹配程度；**发音词典**把语音单位映射到词语；**语言模型**评估词序列的可能性；最后由**解码器**搜索综合得分最高的词序列。各组件分别训练和调优。

![ASR 流水线：原始音频经过特征提取、声学模型、解码器和语言模型，最终生成文本](../images/asr_pipeline.svg)

- **音位**是能够区分一种语言中不同词语的最小声音单位。英语大约有 39–44 个音位，具体数量取决于方言和采用的音位集。例如，“bat”和“pat”只差一个音位：/b/ 与 /p/。许多 ASR 系统会建模**上下文相关音位**，也称**三音素**（triphone）：当前音位由左、右相邻音位构成的上下文来区分。例如，同样是 /a/，出现在 “b_t” 和 “c_t” 的上下文中时，会对应不同的建模单元。相邻音位会影响当前音位的实际发音，这种现象称为**协同发音**。

- 三音素的组合数量很大：40 个音位的三元组合共有 64,000 种。**决策树聚类**会把声学上相似的三音素归到 **senone（三音素状态类）** 中，通常得到 2,000–10,000 类；每类各有一个声学模型。这种聚类用到了第 06 章介绍的决策树算法。

- **GMM-HMM**（高斯混合模型—隐马尔可夫模型）从 20 世纪 80 年代到 2010 年代初一直是主流的声学建模方法。HMM（见第 05 章）负责建模语音的时间结构：每个音位对应一个从左到右的 HMM，包含 3–5 个状态；每个状态表示音位的一段，例如起始、中段或结尾。状态转移隐式地表示持续时间。

- HMM 状态的发射概率，也就是给定状态时某个特征向量出现的概率，由**高斯混合模型**（GMM）建模。GMM 是多个多元高斯分布的加权和（见第 05 章）：

```math
p(\mathbf{x} | s) = \sum_{m=1}^{M} w_m \cdot \mathcal{N}(\mathbf{x} ; \boldsymbol{\mu}_m, \boldsymbol{\Sigma}_m)
```

- 其中，$\mathbf{x}$ 是特征向量，例如 39 维 MFCC；$s$ 是 HMM 状态；$M$ 是混合成分的数量，通常为 8–64；$w_m$ 是第 $m$ 个高斯成分的混合权重；$\boldsymbol{\mu}_m$ 和 $\boldsymbol{\Sigma}_m$ 分别是该成分的均值和协方差。为减少计算量，协方差矩阵通常取对角形式，也就是假设特征维度彼此独立。MFCC 经离散余弦变换（DCT）后相关性较低，因此这个假设近似成立。

- 训练时，系统用**鲍姆–韦尔奇算法**（第 05 章介绍的 EM 特例）根据带转录的语音数据，迭代估计 GMM 参数和 HMM 转移概率。解码时，系统用**维特比算法**通过动态规划寻找最可能的状态序列：

```math
\delta_t(j) = \max_{i} \left[ \delta_{t-1}(i) \cdot a_{ij} \right] \cdot b_j(\mathbf{x}_t)
```

- $\delta_t(j)$ 表示时刻 $t$ 到达状态 $j$ 的最佳路径概率；$a_{ij}$ 表示从状态 $i$ 转移到状态 $j$ 的概率；$b_j(\mathbf{x}_t)$ 表示状态 $j$ 下观测到特征 $\mathbf{x}_t$ 的发射概率。

- **DNN-HMM**（Hinton 等，2012）用深度神经网络（DNN，见第 06 章）取代 GMM 发射模型。网络根据一段特征帧预测 senone 的后验概率 $p(s | \mathbf{x})$。HMM 仍负责时间结构和序列建模，神经网络则提供更有区分力的发射得分。相较于 GMM 声学模型，这种混合方法把词错误率降低了 20%–30%，并在 2012–2016 年间成为主流。

- **WFST 解码**（加权有限状态转换器）是传统 ASR 的标准解码框架。HMM 拓扑结构 $H$、上下文相关性 $C$、词典 $L$、语法或语言模型 $G$ 各自表示为带权有限状态转换器，再组合成搜索图 $H \circ C \circ L \circ G$。维特比搜索会在组合图中找到成本最低的路径。WFST 让系统能模块化地组合不同知识来源，并用动态规划高效搜索。它的数学基础来自有限自动机理论，与第 05 章介绍的状态机相关。

- **端到端 ASR**省去发音模型、音位集和 WFST 解码器等独立组件，改用一个神经网络直接把音频特征映射为字符或子词单元。主要难点是**对齐问题**：输入每秒有数百帧特征，输出每秒只有几个字符；训练时，输入和输出之间的对齐关系未知。

- **连接主义时间分类**（CTC，Graves 等，2006）通过加入特殊的**空白符号**来处理对齐问题。网络可以输出任意字符与空白符号序列；合并连续重复项并删除空白符号后，只要得到正确转录即可。例如，输出 “--cc-aa-t--”（“-”表示空白符号）可以得到 “cat”。

- CTC 定义了多对一映射 $\mathcal{B}$，把所有长度为 $T$、由标签和空白符号组成的序列映射为标签序列。标签序列 $\mathbf{y}$ 的概率，是所有会折叠成 $\mathbf{y}$ 的对齐路径概率之和：

$$P(\mathbf{y} | \mathbf{x}) = \sum_{\boldsymbol{\pi} \in \mathcal{B}^{-1}(\mathbf{y})} \prod_{t=1}^{T} p(\pi_t | \mathbf{x})$$

![CTC 对齐示意图：多条包含空白符号和字符的路径，折叠后都会得到同一段文本](../images/ctc_alignment.svg)

- 直接计算这个总和需要枚举数量随序列长度呈指数增长的对齐路径。**CTC 前向—后向算法**用动态规划在 $O(T \cdot |\mathbf{y}|)$ 时间内完成计算，思路与第 05 章的 HMM 前向—后向算法相似。

- CTC 作出**条件独立假设**：给定输入后，各时间步的输出彼此独立。因此，CTC 无法直接建模输出之间的依赖关系，例如 “q” 后面通常接 “u”。系统需要借助外部语言模型处理这些依赖。

- **CTC 解码**有几种选择：
  - **贪心解码**：每个时间步都选概率最高的词元，再折叠重复项并删除空白符号。速度快，但不一定得到最优序列。
  - **束搜索**：每一步保留得分最高的前 $k$ 个部分假设，并合并折叠后具有相同前缀的假设。搜索时也可以加入语言模型得分。
  - **前缀束搜索**：改进束搜索，在比较假设时正确处理 CTC 空白符号和重复项的折叠规则。

- **RNN-T**（RNN Transducer，Graves，2012）在 CTC 上加入显式的**预测网络**。这个类似语言模型的 RNN 会根据先前输出生成当前预测，因此不再采用 CTC 的条件独立假设。RNN-T 包含三个组件：
  - **编码器**：处理音频特征，生成隐藏表示 $\mathbf{h}_t^\text{enc}$，通常由多层 LSTM 或 Conformer 构成。
  - **预测网络**：自回归 RNN，根据先前输出的标签生成隐藏表示 $\mathbf{h}_u^\text{pred}$。
  - **联合网络**：在每个时间—标签位置合并编码器和预测网络的输出，并计算下一个词元（包括空白符号）的概率分布：

$$p(y | t, u) = \text{softmax}(W \cdot \text{tanh}(W_\text{enc} \mathbf{h}_t^\text{enc} + W_\text{pred} \mathbf{h}_u^\text{pred} + b))$$

- RNN-T 在每个时间步可以输出零个或多个标签：它可以先输出非空白词元，再进入下一个时间步；也可以输出空白符号并直接前进。训练时，算法会在二维的时间—标签网格上执行前向—后向计算，复杂度为 $O(T \cdot U)$，其中 $U$ 是输出长度。RNN-T 天然支持流式识别：编码器从左向右处理音频，预测网络逐步生成文本。因此，它成为 Google Pixel 手机等设备端流式 ASR 的主流架构。

- **Listen, Attend and Spell**（LAS，Chan 等，2016）是使用注意力的编码器—解码器模型，采用了第 06 章介绍的序列到序列架构。它包含三个组件：
  - **Listener（编码器）**：金字塔式双向 LSTM 处理完整输入序列，并在每层拼接相邻两个隐藏状态，使序列长度缩短到原来的八分之一，得到较短的编码器隐藏状态序列。
  - **注意力层**：解码器每生成一步，就对所有编码器状态计算注意力权重，并据此形成上下文向量。这里使用第 07 章介绍的注意力机制。
  - **Speller（解码器）**：自回归 LSTM 根据上下文向量和已生成的字符，逐个生成转录文本中的字符。

- LAS 的识别效果很好，但解码前必须拿到完整语句，因为注意力层需要查看所有编码器状态，所以它不适合流式识别。长语句也会带来困难：注意力分散到过长的序列后，模型难以聚焦相关信息。

- **Conformer**（Gulati 等，2020）把卷积捕捉局部模式的能力与自注意力建模全局依赖的能力结合起来。每个 Conformer 块按“夹心”结构排列四个模块：
  1. **前馈模块（半步）**：带残差连接的前馈网络，残差权重取一半。
  2. **多头自注意力模块**：使用相对位置编码的标准 Transformer 自注意力（见第 07 章）。
  3. **卷积模块**：依次包含逐点卷积、门控线性单元（GLU）、一维深度卷积、批归一化、Swish 激活和另一个逐点卷积。深度卷积负责捕捉局部上下文，类似在特征序列上建模 n-gram。
  4. **前馈模块（半步）**：与第一个前馈模块相同。

- Conformer 块的输出为：$\mathbf{y} = \text{LayerNorm}(\mathbf{x} + \frac{1}{2}\text{FFN}_1 + \text{MHSA} + \text{Conv} + \frac{1}{2}\text{FFN}_2)$。实验结果显示，采用半步残差的 Macaron 式结构（前馈—注意力—卷积—前馈）优于其他排列。Conformer 已成为 CTC 和 RNN-T 系统的常用编码器，表现优于纯 Transformer 或纯 LSTM 编码器。

![Conformer 块的夹心结构：前馈、自注意力、卷积、前馈](../images/conformer_block.svg)

- **Whisper**（Radford 等，2023）是 OpenAI 的大规模注意力式 ASR 模型，采用标准的编码器—解码器 Transformer 架构（见第 07 章），在从互联网收集的 68 万小时弱监督数据上训练。数据将音频与近似转录配对。它的主要设计包括：
  - 输入：文件 01 介绍的 80 通道梅尔频谱图，窗长 25 毫秒、帧移 10 毫秒，并归一化为零均值、单位方差。
  - 编码器：带正弦位置嵌入和预激活层归一化的标准 Transformer 编码器。
  - 解码器：使用字节级 BPE 词元切分器（见第 07 章）的 Transformer 解码器，以自回归方式生成词元。
  - 多任务处理：同一个模型可以转录、翻译、识别语言并预测时间戳；解码提示词中的特殊任务词元决定当前任务。
  - Whisper 在不同领域、口音和语言上的泛化能力，主要来自训练数据规模，而非架构创新。

- **wav2vec 2.0**（Baevski 等，2020）是一种用于学习语音表示的**自监督预训练**框架。它先从大量无标注音频中学习表示，再用少量有标注数据微调。它沿用了 BERT（见第 07 章）的自监督范式，并将其用于连续音频信号。

- wav2vec 2.0 包含三个部分：
  - **特征编码器**：多层一维 CNN 处理原始波形样本，生成潜在表示 $\mathbf{z}_t$。在 16 kHz 采样率下，每 20 毫秒（320 个样本）生成一个向量。
  - **量化模块**：使用**乘积量化**把潜在表示离散化为有限的码本。模块把向量分组，再分别量化各组；每组使用一个码本，共有 $G$ 个码本，每个码本含 $V$ 个条目。量化结果 $\mathbf{q}_t$ 作为对比学习目标。
  - **上下文网络**：Transformer 编码器处理部分经过掩码的潜在表示，生成上下文化表示 $\mathbf{c}_t$。

![wav2vec 2.0 架构：CNN 特征编码器、掩码、Transformer 上下文网络，以及基于量化目标的对比学习](../images/wav2vec2_pretraining.svg)

- 预训练时，模型会随机选取一些连续区间的潜在表示，并用学到的掩码嵌入替换它们；随后，模型要从一组干扰项中找出被掩码位置对应的量化表示。干扰项是从同一段语音的其他位置抽取的负样本。对比损失为：

$$\mathcal{L} = -\log \frac{\exp(\text{sim}(\mathbf{c}_t, \mathbf{q}_t) / \kappa)}{\sum_{\tilde{\mathbf{q}} \in Q_t} \exp(\text{sim}(\mathbf{c}_t, \tilde{\mathbf{q}}) / \kappa)}$$

- 其中，$\text{sim}$ 是余弦相似度，$\kappa$ 是温度参数，$Q_t$ 包含真实量化目标和干扰项。额外的**多样性损失**鼓励模型均衡使用码本中的各个条目。这一对比目标属于 InfoNCE 损失一类，也用于视觉自监督学习。

- 预训练完成后，模型会增加线性投影层和 CTC 头，再用有标注数据微调。wav2vec 2.0 仅用 10 分钟有标注语音，就取得了接近当时先进水平的结果；预训练使用了 53,000 小时无标注音频。这展示了自监督学习在低资源语音识别中的潜力。

- **HuBERT**（Hsu 等，2021）也使用自监督学习，但以**掩码预测**取代对比目标：模型预测被掩码帧的离散聚类标签。训练目标来自离线聚类：第一次迭代对 MFCC 做 k-means，后续迭代则对 HuBERT 特征聚类。与 wav2vec 2.0 相比，HuBERT 无需量化模块或对比采样，训练流程更简单，效果相当或更好。

- **Fast Conformer**（Rekesh 等，2023，NVIDIA NeMo）用**下采样注意力**替代标准 Conformer 的二次复杂度自注意力。它先用步长卷积压缩输入序列（通常压缩 8 倍），再计算注意力，最后还原序列。注意力计算量因此从 $O(T^2)$ 降到 $O(T^2/64)$，同时保留全局上下文。模型可以训练长达数分钟的语句，而不受显存限制。Fast Conformer 是 NVIDIA NeMo 工具包的默认编码器，也是其生产模型的基础。

- **Parakeet**（NVIDIA，2024）是一组面向英语的高精度 ASR 模型，使用 Fast Conformer 编码器和 CTC、RNN-T 解码器，并以 64,000 小时英语语音训练。发布时，参数量为 0.6B 和 1.1B 的 Parakeet 模型在标准基准上取得了最低的词错误率，在大多数英语测试集上超过 Whisper large-v3。它们结合了高效的 Fast Conformer、较强的数据增强（SpecAugment、速度扰动、噪声混合）和大规模监督训练数据，说明工程化组合成熟组件也能推进性能。

- **Canary**（NVIDIA，2024）扩展 NeMo 框架，支持多语言和多任务 ASR。它使用 Fast Conformer 编码器和基于注意力的解码器，而非 CTC 或 RNN-T；同一个模型可以转录多种语言并进行翻译。它与 Whisper 一样支持多任务，但采用了效率更高的 Fast Conformer 主干。Canary 支持英语、德语、西班牙语和法语，识别准确率具有竞争力。

- **Moonshine**（Useful Sensors，2024）专为**设备端和边缘部署**优化。它采用混合编码器：用小型 CNN 和少量 Transformer 层取代前几层 Transformer 或 Conformer，使基础模型的参数量不到 3,000 万。Moonshine 面向 CPU 和低功耗设备上的实时流式识别；与体量较大的 Whisper 相比，它牺牲部分准确率，换取 5–10 倍更低的延迟和内存占用。

- **Distil-Whisper**（Gandhi 等，2023）用第 06 章介绍的**知识蒸馏**压缩 Whisper。学生模型保留完整编码器，只用 2 层解码器（Whisper 有 32 层），并通过拟合 Whisper 的输出分布进行训练。Distil-Whisper 的 WER 与教师模型相差不到 1%，速度快 6 倍；当完整 Whisper 太慢时，它更适合实时应用。

- **通用语音模型**（Universal Speech Model，USM；Zhang 等，2023，Google）把自监督预训练扩展到 300 多种语言、共 1,200 万小时的无标注音频，之后再进行监督微调。USM 表明，wav2vec 2.0 一类的自监督方法能够扩展到极大规模的数据，并用少量标注数据提升低资源语言的识别效果。

- **大规模多语种语音**（Massively Multilingual Speech，MMS；Pratap 等，2023，Meta）把 wav2vec 2.0 的预训练扩展到 1,100 多种语言，训练数据包括宗教录音和其他多语种音频。MMS 覆盖的语言数超过此前的 ASR 系统，让许多资源匮乏语言首次拥有语音识别能力。

- 现代 ASR 正沿着几种路线发展：用于流式识别的 Conformer 编码器配合 CTC 或 RNN-T；用于离线识别和多任务处理的编码器—解码器 Transformer；面向低资源场景的自监督预训练；以及扩大数据和模型规模以提升准确率。具体选择取决于延迟预算、可用算力、语言数量，以及应用需要流式还是批量处理。

- **语言模型集成**把声学模型捕捉到的语音信息与语言知识结合起来，改善识别结果。解码时，系统会综合声学模型得分 $p(\mathbf{x} | \mathbf{y})$（音频与转录的匹配程度）和语言模型得分 $p(\mathbf{y})$（转录作为句子的可能性）。

- **浅层融合**在束搜索时合并两个模型的得分：

$$\hat{\mathbf{y}} = \arg\max_\mathbf{y} \left[ \log p_\text{AM}(\mathbf{y} | \mathbf{x}) + \lambda \log p_\text{LM}(\mathbf{y}) \right]$$

- $\lambda$ 是可调权重；$p_\text{LM}$ 是外部语言模型，通常是第 07 章介绍的 n-gram 或神经语言模型。浅层融合实现简单、效果好，但外部语言模型必须使用与 ASR 相同的词元表。

- **深层融合**（Gulcehre 等，2015）把语言模型接入解码器：语言模型的隐藏状态与解码器隐藏状态拼接，再通过门控机制传给输出投影层。系统会联合微调，包括预训练语言模型在内的所有组件。这种方法整合得更深，但训练也更复杂。

- **冷融合**（Sriram 等，2018）与深层融合相似，但把语言模型接入后，从头训练 ASR 解码器，而不是微调预训练解码器。这样可以让声学模型学习语言模型尚未提供的信息，减少重复学习。

- **重打分**（N-best 重打分）分两步进行：先用束搜索生成 $N$ 个候选转录，再用更强的语言模型（例如大型 Transformer 语言模型）重新评分并排序。第一轮解码不必运行大型语言模型，因此可以在第二轮使用计算成本更高的模型。

- **内部语言模型估计**（ILME）处理端到端模型与外部语言模型结合时的重复计分问题。端到端模型会从训练转录中隐式学到语言模型；浅层融合再加入外部语言模型时，可能把语言先验重复计算。ILME 会估计并减去内部语言模型得分：

$$\hat{\mathbf{y}} = \arg\max_\mathbf{y} \left[ \log p_\text{E2E}(\mathbf{y} | \mathbf{x}) - \beta \log p_\text{ILM}(\mathbf{y}) + \lambda \log p_\text{LM}(\mathbf{y}) \right]$$

- **流式与离线 ASR**是两种架构选择。离线（或批量）ASR 要等整段语音处理完才输出结果；流式 ASR 则随着音频到达逐步输出，并控制延迟。

- 实时字幕、语音助手和电话转录都需要流式识别。未来上下文有时能帮助消除歧义，例如听到 “York” 后，系统更容易确认前一个词是 “New”；但流式系统不能一直等待后续语音。

- **单向编码器**（从左向右处理的 LSTM、因果卷积和因果 Transformer）只依赖过去和当前输入，适合流式识别。**双向编码器**会读取未来上下文，不能直接用于流式识别。

- **分块注意力**（也称块式或分段注意力）把输入切成固定长度的块，只在当前块内计算自注意力，也可以查看前面若干块。块长加上计算时间限制了延迟，同时让模型在每块内利用双向上下文。块越短，识别准确率通常越低。

- **前瞻**让流式编码器在输出当前帧前读取少量未来帧，例如 300–900 毫秒。实现时，单向计算会加入一小段右侧上下文。前瞻窗口会增加延迟，但能提高准确率。

- 流式 ASR 的延迟由几部分组成：
  - **算法延迟**：音频到达后，模型何时能开始处理它；这取决于分块大小、前瞻窗口和特征提取。
  - **计算延迟**：模型完成一次前向传播所需的时间。
  - **端点检测延迟**：系统判断用户已经说完所需的时间。
  - **首个词元延迟**：第一个词出现所需的时间。**最终确认延迟**：系统确认最终输出所需的时间。流式系统常先给出临时结果，再随新音频到达进行修正。

- **ASR 评估指标**包括：

- **词错误率**（WER）是主要指标。计算时，系统先用编辑距离对齐假设文本（系统输出）和参考文本（标准转录），找出把其中一段转换为另一段所需的最少替换、删除和插入操作，再计算：

$$\text{WER} = \frac{S + D + I}{N}$$

- $S$、$D$、$I$ 分别表示替换、删除和插入的数量；$N$ 是参考文本的总词数。插入很多时，WER 可以超过 100%。干净朗读语音的 WER 达到 5% 左右可视为接近人类水平；对话语音或噪声语音更难，WER 可能达到 10%–20% 以上。

- **字符错误率**（CER）在字符级别使用同一公式。对于中文、日文等没有明显词界的语言，CER 通常更有参考价值。它也能更细致地区分接近但不相同的结果：例如，“cat”和“bat”的 WER 是 100%，CER 则约为 33%。

- **词信息损失率**（WIL）和**词信息保留率**（WIP）从信息论角度衡量参考文本与假设文本的关系，比 WER 更细致地考虑二者之间的关联，但报告频率较低。

- **实时因子**（RTF）衡量计算效率，等于处理音频所需时间除以音频时长。RTF 小于 1 表示系统处理速度快于实时；大于 1 则无法跟上实时音频。流式系统需要把 RTF 保持在 1 以下。

- **数据增强**能提升 ASR 的鲁棒性，常用方法包括：
  - **速度扰动**：以 0.9 倍或 1.1 倍速度重采样音频，同时改变音高和时长。
  - **SpecAugment**（Park 等，2019）：随机遮盖频谱图中的频带和时间步。它相当于音频领域的 dropout，是 ASR 常用且有效的正则化方法，不需要额外数据。
  - **噪声增强**：把干净语音与不同信噪比的录制噪声混合。
  - **房间脉冲响应模拟**：把干净语音与模拟的房间声学脉冲响应卷积，模拟混响环境。

- **词元化**决定 ASR 模型的输出词表。常见选择包括：
  - **字符**：词表小、实现简单，英语约有 30 个字符；但输出序列较长，也不包含隐式语言模型。
  - **子词单元或 BPE**（见第 07 章）：在词表大小和序列长度之间折中，是现代系统的常见选择。Whisper 使用字节级 BPE，词表约有 50,000 个词元。
  - **词语**：词表通常有 50,000 个以上的词，输出序列较短，但无法处理词表外词语。
  - **音位**：这种单位有语言学依据，词表紧凑，但需要发音词典。

- ASR 的发展经历了几次转变：先是高度工程化的模块化系统（GMM-HMM 加 WFST 解码，1990 年代至 2010 年代），再到混合系统（DNN-HMM，2012–2016），随后是把更多流程合进单一神经网络的端到端系统（CTC、RNN-T、LAS，2016–2020），再到使用海量无标注或弱标注数据训练的大规模预训练模型（wav2vec 2.0、Whisper，2020 年至今）。每次转变都减少了手工工程工作，并提升识别准确率。这也反映了机器学习的整体方向：从数据中学习表示，而不是手工设计表示；第 06 章的 CNN 取代图像特征工程、第 07 章的 Transformer 取代 NLP 特征工程，也体现了这一变化。

## 编程任务（使用 Colab 或笔记本）

1. 用 JAX 从头实现 CTC 损失函数。创建一段简短的 logits 序列和目标标签序列，用 CTC 前向算法计算目标序列的总概率，再计算负对数似然损失。
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

2. 构建一个简单的编码器-解码注意力基架构（一个最小的LAS-like架构）在JAX中。使用1D卷积编码器和单层解码器，带有点积注意力。在合成数据上运行它，并可视化注意力权重。
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

3. 从头开始计算Word Error Rate（WER），使用动态规划（编辑距离）进行评估，并与参考进行比较。可视化编辑距离矩阵。
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

4. 实现SpecAugment（频率遮挡和时间遮挡）在log-mel频谱图上，并可视化原始版本和增强版本。从合成信号生成频谱图。
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
