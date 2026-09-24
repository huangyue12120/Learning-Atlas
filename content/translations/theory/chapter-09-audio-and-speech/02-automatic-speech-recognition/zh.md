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

*自动语音识别将 spoken音频转换为书面文本， bridging人类语音和机器可读语言之间的差距。本文件涵盖了GMM-HMM、CTC损失、RNN-转ducer、带有注意力机制的编码器-解码器模型（LAS）、Whisper以及端到端ASR，从经典管道到现代神经架构。*

- **自动语音识别** (ASR) 是将 spoken音频转换为书面文本的任务。它是AI领域最古老的难题之一（1950年代的系统可以识别单个数字），也是最 commercially部署的问题（语音助手、转录服务和字幕）。

- 难点在于语音的巨大多样性：不同说话者、口音、语速、背景噪音、麦克风特性以及单词之间连续的声波映射到离散词之间的根本模糊性。

- 将ASR想象为法庭书记员。书记员听到一个连续的声音流， mentally将其分割成单词，使用上下文来解决歧义（例如，“they’re”、“their”和“there”的区别），然后输入结果。ASR系统也这样做，但以阶段性的形式进行，并且可以独立或联合优化每个组件。

- **经典ASR管道**将音频处理成一系列 distinct的阶段：原始音频被转换为特征（MFCCs或log-mel频谱图，来自文件01），一个**声学模型**评估每个特征帧与每个音素单元匹配的程度，一个**发音模型**（词典）将音素映射到单词，一个**语言模型**评估单词序列的可能性，以及一个**解码器**搜索具有最大综合得分的单词序列。每个组件单独训练和调整。

![ASR管道从原始音频通过特征提取、声学模型、解码器和语言模型，最终输出文本](../images/asr_pipeline.svg)


- **音素**是区分语言中单词的最小声音单位。英语大约有39-44个音素（具体数量取决于方言和使用的音素库存）。例如，“bat”和“pat”在发音上不同，因为它们有不同的音素 (/b/ vs /p/)。大多数ASR系统模型 **上下文依赖的音素**，称为 **三元音素**：一个由其左和右邻居定义的音素（例如，在"context of "b_t"中，“a”的单位与在"context of "c_t"中不同的单位）。因为音素的声学实现 heavily受其邻近的影响（这被称为 **连合**）。

- 三元音素的数量巨大（40个音素的立方 = 64,000），因此 **决策树聚类**将声学相似的三元音素分组到 **senone** 中（通常有2000-10,000类）。每个senone都有自己的声学模型。这种聚类是第06章中决策树算法的形式。

- GMM-HMM（高斯混合模型 - 隐藏马尔可夫模型）是1980年代到2010年主导的语音建模方法。HMM（第5章）模型了语音的时间结构：每个音素是一个从左到右的HMM，其中每个状态代表一个子音段（起始、中间、结束）。状态之间的转换隐式地表示了持续时间。

- 在每个HMM状态中，发射概率（在该状态下某个特征向量出现的概率）由一个**高斯混合模型**（GMM）来建模：这是从第05章引入的多元高斯分布的加权和。

```math
p(\mathbf{x} | s) = \sum_{m=1}^{M} w_m \cdot \mathcal{N}(\mathbf{x} ; \boldsymbol{\mu}_m, \boldsymbol{\Sigma}_m)
```

- $\mathbf{x}$ 是特征向量（例如，39维的MFCC），$s$是HMM状态，$M$是混合组件的数量（通常为8到64个），$w_m$是每个高斯成分的混合权重，$\boldsymbol{\mu}_m$和$\boldsymbol{\Sigma}_m$分别是每个高斯成分的均值和协方差。协方差矩阵通常是对角线的，以提高计算效率（假设特征维度独立，这在MFCC中通常为真，因为DCT去相关）。

- 训练使用贝叶斯-韦尔奇算法（一种特殊的EM算法，来自第5章）从转录的语音数据中迭代估计GMM参数和HMM转移概率。解码（找到最可能的状态序列）使用维特比算法（动态规划，来自第5章）：

```math
\delta_t(j) = \max_{i} \left[ \delta_{t-1}(i) \cdot a_{ij} \right] \cdot b_j(\mathbf{x}_t)
```

- $\delta_t(j)$ 是在时间 $t$ 时，最佳路径结束于状态 $j$ 的概率；$a_{ij}$ 是从状态 $i$ 到状态 $j$ 的转移概率；$b_j(\mathbf{x}_t)$ 是在状态 $j$ 中特征 $\mathbf{x}_t$ 发生的发射概率。

- DNN-HMM（Hinton et al., 2012）将GMM的发射模型替换为一个深度神经网络（DNN，见第06章），该网络预测senone后验概率$p(s | \mathbf{x})$，基于特征帧窗口。尽管HMM仍然处理时间结构和序列，但神经网络提供了远更判别性的发射得分。这种混合方法将词错误率降低了20-30%，在2012-2016年间是主流范式。

- **WFST解码**（权重有限状态转换器）是传统ASR的标准解码框架。每个组件（HMM拓扑结构H、上下文依赖性C、词典L、语法/语言模型G）都表示为一个带有权重的有限状态转换器，然后这些转换器被组合成一个单一的搜索图$H \circ C \circ L \circ G$。Viterbi搜索则在该组合图中找到最低成本路径。WFSTs允许知识来源的模块化组合，并且通过高效的动态规划搜索实现高效。数学框架来自有限自动机理论（与第5章中的状态机相关）。

- **端到端 ASR** 消除了单独的组件（发音模型、音素库存和 WFST 解码器），并训练一个直接从音频特征映射到字符或词元的单个神经网络。关键挑战是 **对齐问题**：输入（每秒数百帧特征）和输出（每秒几个字符）长度差异巨大，且在训练期间它们之间的对齐关系未知。

- 连接主义时间分类（CTC）（Graves et al., 2006）通过引入一个特殊的“空白”标记来解决对齐问题。网络可以输出任何字符和空白序列，只要折叠连续重复并删除空白后得到正确的转录。例如，“cat”可以通过输出序列“--cc-aa-t--”（其中“-”是空白）产生。

- CTC 定义了一个多对一映射 $\mathcal{B}$，从所有长度-$T$ 输出序列（包括空格）的集合到标签序列。标签序列 $\mathbf{y}$ 的概率是所有折叠到它的对齐方式的总和：

$$P(\mathbf{y} | \mathbf{x}) = \sum_{\boldsymbol{\pi} \in \mathcal{B}^{-1}(\mathbf{y})} \prod_{t=1}^{T} p(\pi_t | \mathbf{x})$$
![CTC对齐显示了许多可能的路径，包括空白和字符标记，这些路径最终 collapse到相同的输出文本](../images/ctc_alignment.svg)


- 计算这个和的 naive方法需要枚举指数级多的对齐方式，但 **CTC 前后向算法** 在 $O(T \cdot |\mathbf{y}|)$ 使用动态规划高效地计算它，类似于第 05 章中的 HMM 前后向算法。

- CTC 假设每个时间步的输出独立于所有其他输出，给定输入。这意味着 CTC 无法建模输出依赖（例如，它不能学习“q”几乎总是被“u”跟随）。需要外部语言模型来处理这些依赖。

- **CTC解码**选项：
    - **贪婪解码**：在每个时间步取最可能的标记，然后合并。速度快但不最优。
    - ** beam搜索**：维护前缀概率最高的标记集。$k$ 在每次步骤中，合并具有相同前缀的假设。可以整合语言模型得分。
    - **前缀 beam search**：一种修改后的 beam search，正确处理CTC空白合并，确保假设在合并后进行比较。

- **RNN-transducer** (RNN-T) (Graves, 2012) extends CTC by adding an explicit **prediction network** (a language model-like RNN) that conditions each output on the previous outputs, removing the conditional independence assumption. RNN-T has three components:
    - **Encoder**: processes the audio features to produce hidden representations $\mathbf{h}_t^\text{enc}$ (typically a stack of LSTMs or Conformer layers).
    - **Prediction network**: an autoregressive RNN that produces hidden representations $\mathbf{h}_u^\text{pred}$ from the previously emitted labels.
    - **Joint network**: combines the encoder and prediction network outputs at each (time, label) position and produces a distribution over the next token (including blank):

$$p(y | t, u) = \text{softmax}(W \cdot \text{tanh}(W_\text{enc} \mathbf{h}_t^\text{enc} + W_\text{pred} \mathbf{h}_u^\text{pred} + b))$$
- RNN-T can emit zero or more labels per time step (by emitting non-blank tokens before advancing to the next time step, or emitting blank to advance without output). Training uses a forward-backward algorithm over the 2D (time, label) lattice, with complexity $O(T \cdot U)$ where $U$ is the output length. RNN-T is the dominant architecture for on-device streaming ASR (used in Google's pixel phones and similar products) because it naturally supports streaming: the encoder processes audio left-to-right and the prediction network generates output incrementally.

- **Listen, attend and spell** (LAS) (Chan et al., 2016) is an attention-based encoder-decoder model (the sequence-to-sequence architecture from chapter 06). It has three components:
    - **Listener** (encoder): a pyramidal bidirectional LSTM that processes the full input sequence and downsamples by a factor of 8 (by concatenating pairs of consecutive hidden 状态s at each layer), producing a shorter sequence of encoder hidden 状态s.
    - **Attention**: at each decoder step, computes attention weights over all encoder 状态s to form a context vector (the same attention mechanism from chapter 07).
    - **Speller** (decoder): an autoregressive LSTM that generates the output transcript one character at a time, conditioned on the context vector and previously generated characters.

- LAS achieves strong results but requires the full utterance to be available before decoding (because the attention attends to all encoder 状态s), making it unsuitable for streaming applications. It also struggles with very long utterances because attention over long sequences becomes diffuse.

- **变换器**（Gulati et al., 2020）结合了卷积的局部模式捕捉能力与自注意力的全局依赖建模。每个变换器块由四个模块组成，结构类似三明治：

    1. **全连接层**（半步）：包含残差连接和一半的残差权重的全连接网络。
    2. **多头自注意力层**：标准Transformer自注意力（如第07章所述），使用相对位置编码。
    3. **卷积层**：点积卷积、Gated Linear Unit（GLU）、1D深度卷积、批量归一化、Swish激活和另一个点积卷积。深度卷积捕捉局部上下文（例如特征序列的n-gram）。
    4. **全连接层**（半步）：与模块1相同。

- 输出是：$\mathbf{y} = \text{LayerNorm}(\mathbf{x} + \frac{1}{2}\text{FFN}_1 + \text{MHSA} + \text{Conv} + \frac{1}{2}\text{FFN}_2)$。半步残差的macaron结构（FFN-Attention-Conv-FFN）在实验中优于其他顺序。conformers已成为CTC和RNN-T系统默认编码器，优于纯transformer和纯LSTM编码器。

![一个表示嵌套结构的转换块，其中包含前馈、自注意力、卷积和前馈模块](../images/conformer_block.svg)


- **Whisper**（Radford et al., 2023）是OpenAI的大规模注意力基模型。它使用标准的编码器-解码器 transformer架构（从第07章），在互联网上收集的68万小时弱监督数据集上进行训练（音频与近似转录配对）。关键设计选择：
    - 输入：80通道的log-mel频谱图（从文件01），窗口为25毫秒，跳过10毫秒，归一化到零均值和单位方差。
    - 编码器：标准的transformer编码器，包含正弦位置嵌入和预激活层归一化。
    - 解码器：使用字节级BPE分词器（从第07章）自回归生成令牌的transformer解码器。
    - 多任务：单个模型同时处理转录、翻译、语言识别和时间戳预测，条件于解码提示中的特殊任务标记。
    - 训练数据的规模（而不是架构的新颖性）是Whisper在不同领域、口音和语言上强大泛化的主要驱动因素。

- **wav2vec 2.0**（Baevski et al., 2020）是一个**自监督**预训练框架，用于语音表示。核心思想是从大量未标记的音频中学习语音表示，然后用少量标记数据进行微调。这遵循了与BERT（从第07章）相同的自监督范式，但适用于连续音频信号。

- 微波2.0架构由三个部分组成：
    - **特征编码器**：一个多层1D卷积网络，处理原始波形样本并产生潜在表示。 $\mathbf{z}_t$ 在每帧20毫秒（16 kHz时，每320个样本一个向量）。
    - **量化模块**：将潜在表示离散化为有限的代码表，使用**产品量化**（将向量分成组并独立地对每个组进行量化，选择从 $G$ 编码表 $V$ 每个条目。这产生目标。 $\mathbf{q}_t$ 对于对比学习目标。
    - **上下文网络**：一个基于Transformer编码器的网络，它接受部分掩码后的潜在表示，并生成上下文化的表示。 $\mathbf{c}_t$。

![wav2vec 2.0架构，显示CNN特征编码器、掩码、变换器上下文网络以及带有量化目标的对比学习](../images/wav2vec2_pretraining.svg)


- 在预训练阶段，随机抽取的潜在表示会被**遮挡**（用一个学习到的掩码嵌入替换），模型需要从一组负样本（来自同一句话的不同位置）中识别出被遮挡位置的真实量化表示。对比损失是：

$$\mathcal{L} = -\log \frac{\exp(\text{sim}(\mathbf{c}_t, \mathbf{q}_t) / \kappa)}{\sum_{\tilde{\mathbf{q}} \in Q_t} \exp(\text{sim}(\mathbf{c}_t, \tilde{\mathbf{q}}) / \kappa)}$$
- $\text{sim}$ 是余弦相似度，$\kappa$ 是温度参数，而 $Q_t$ 包含了真实量化目标加上干扰项。额外的 **多样性损失** 促使所有代码书条目得到均衡使用。这个损失本质上是 InfoNCE 对抗性损失，与视觉自监督学习中使用的相同家族的对抗目标一致。

- 在预训练后，添加了一个线性投影和CTC头，并在标记数据上进行微调。Wav2Vec 2.0仅用10分钟的标记数据就达到了接近最先进的结果（使用53,000小时的未标记音频进行预训练），展示了自我监督学习在低资源语音识别中的强大能力。

- **HuBERT**（Hsu et al., 2021）是另一种自监督方法，它将对比损失替换为掩码预测目标（预测掩码帧的离散聚类分配）。目标由一个离线聚类步骤生成（在第一次迭代中对MFCC进行k-means，然后在后续迭代中对HuBERT特征进行k-means）。与wav2vec 2.0相比，HuBERT简化了训练管道（不需要量化模块或对比采样），并且结果相当或更好。

- **快速变换器**（Rekesh et al., 2023，NVIDIA NeMo）用下采样注意力机制取代标准变换器中的二次自注意力。输入序列被压缩（通常通过步长卷积），然后计算注意力，最后再展开回去。这将注意力成本从 $O(T^2)$ 减少到 $O(T^2/64)$ 而不丢失全局上下文，从而在训练非常长的语句时无需内存问题。快速变换器是 NVIDIA 的 NeMo 工具包中的默认编码器，并且构成了其生产级模型的基础。

- **Parakeet**（NVIDIA，2024）是基于Fast Conformer编码器和CTC/RNN-T解码器构建的高精度英语ASR模型家族。Parakeet模型（0.6B和1.1B参数）在发布时在标准基准测试中取得了最低的词错误率，超越了whisper large-v3在大多数英语测试集上的表现。关键成分包括高效的Fast Conformer架构、激进的数据增强（SpecAugment、速度扰动、噪声混合），以及大规模 supervised训练数据——证明了对已知组件进行精心工程仍然可以推动技术前沿。

- **Canary**（NVIDIA，2024）扩展了NeMo框架以支持多语言和多任务ASR。它使用带有注意力解码器的快速转换编码器（而不是CTC或RNN-T），并在单个模型中处理多种语言的转录和翻译（类似于Whisper的多任务设计，但使用更高效的快速转换骨干）。Canary模型在英语、德语、西班牙语和法语方面具有竞争力。

- **Moonshine** (有用传感器，2024）是专门为 **设备端和边缘部署**优化的 ASR 模型。编码器使用一个混合架构，将初始的 transformer/conformer 层替换为一个小 CNN，后面跟着几层 transformer 层，大大减少了模型大小（基础模型参数少于 30M）。Moonshine 目标是实时流媒体在 CPU 和低功耗设备上运行，而 Whisper 过大且慢，通过牺牲一些准确性换取 5-10 倍的低延迟和内存占用。

- **Distil-Whisper** (Gandhi 等人，2023）应用了 **知识压缩**（第 6 章）将 Whisper 压缩成一个更小、更快的模型。学生模型仅使用 2 层解码器（与 Whisper 的 32 层相比），而保留完整的编码器，并通过匹配 whisper 的输出分布进行训练。Distil-Whisper 在 WER 上达到教师模型的 1% 左右，速度是教师模型的 6 倍，使其在需要快速响应的应用中非常实用。

- **通用语音模型（USM）** (张等人，2023年，谷歌) 将自监督预训练扩展到超过12百万小时的无标签音频，并在300多种语言上进行 supervised微调。 USM 显示了 wav2vec 2.0 / 自监督范式在真正大规模数据领域中的巨大潜力，能够在有限标注数据的情况下实现强性能。

- **大规模多语种语音（MMS）** (普拉塔普等人，2023年，Meta) 使用宗教录音和其他多语言音频源将 wav2vec 2.0 预训练扩展到超过1,100种语言。 MMS 覆盖了任何现有 ASR 系统中更多语言，首次为许多资源匮乏的语言提供了语音识别能力。

- 现代 ASR 的景观正在向几个主导模式汇聚：（1）基于 Conformer 的编码器，使用 CTC 或 RNN-T 进行流式处理；（2）编码器-解码器 transformer 用于离线/多任务应用；（3）自监督预训练适用于资源有限的设置；（4）规模 — 数据量和模型大小的增加持续提升准确性。选择这些模式取决于部署约束：延迟预算、可用计算资源、语言数量以及应用程序是否为流式或批处理。

- **语言模型集成**通过将语音模型的得分（如何匹配文本）与语言模型的得分（文本是否为句子）结合，提高ASR性能。基本思想是，在解码过程中，将音频匹配度得分 $p(\mathbf{x} | \mathbf{y})$ 和语言模型概率得分 $p(\mathbf{y})$ 结合起来。

- **浅融合** combines the scores at beam search time:

$$\hat{\mathbf{y}} = \arg\max_\mathbf{y} \left[ \log p_\text{AM}(\mathbf{y} | \mathbf{x}) + \lambda \log p_\text{LM}(\mathbf{y}) \right]$$
- 其中 $\lambda$ 是可调的权重，$p_\text{LM}$ 是一个外部语言模型（通常来自第 07 章）。这种方法简单且有效，但要求 LM 操作与 ASR 模型相同的词汇表。

- **深度融合**（Gulcehre et al., 2015）将语言模型整合到解码器网络中：LM 隐藏状态与解码器隐藏状态连接，并通过门控机制传递给输出投影。整个系统（包括预训练的 LM）联合微调。这种方法允许更深的集成，但更复杂且难以训练。

- **冷融合**（Sriram et al., 2018）与深度融合类似，但从头开始训练 ASR 解码器，并将语言模型整合进去，而不是微调预训练的解码器。这种方法迫使声学模型学习互补信息，而不是重复 LM 已知的内容。

- **重排评分**（N-best重排）是一种两步方法：首先使用 beam search生成 $N$候选转录，然后使用更强大的语言模型（例如大型 transformer LM）重新排名它们。这非常简单实现，并且允许使用速度较慢的大型 LMs进行第一轮解码。

- **内部语言模型估计（ILME）** 考虑到一个微妙的问题：端到端模型隐式从训练转录中学习内部LM，这可能与外部LM在浅层融合时发生冲突。ILME估计内部LM并将其分数在融合过程中减去:

$$\hat{\mathbf{y}} = \arg\max_\mathbf{y} \left[ \log p_\text{E2E}(\mathbf{y} | \mathbf{x}) - \beta \log p_\text{ILM}(\mathbf{y}) + \lambda \log p_\text{LM}(\mathbf{y}) \right]$$
- **流式 vs.离线ASR** 是一个基本的架构选择。离线（或批量）ASR在整个转录处理完毕后再产生任何输出。流式ASR随着音频到达时实时生成输出，并且具有一定的延迟限制。:

- 流式传输对于实时应用至关重要：实时字幕、语音助手（用户在说话时需要立即得到回应）、电话录音。挑战在于，某些未来上下文有助于识别（知道下一个单词是“York”可以消除“New”的歧义），但流式系统无法等待任意长度的未来上下文。

- **单向编码器**（左到右LSTM、因果卷积、因果变换器）自然支持流式处理，因为每个输出仅依赖于过去和当前输入。双向编码器（它们考虑未来上下文）直接不支持流式处理。

- **块级注意力**（也称为块状或段落级注意力）将输入分割成固定长度的块，并在每个块内应用自注意力（以及可选地对前面的几个块）。这限制了延迟到块大小加上处理时间，同时仍然允许每个块内的局部双向上下文。缺点是随着块大小的减少，准确性会下降。

- **前瞻** 允许流式编码器在产生当前帧之前查看一小部分未来帧（例如，300-900毫秒）。这通过向单向计算中添加一个小的右上下文来实现。前瞻窗口增加了延迟，但显著提高了准确性。

- **延迟**在流式ASR中具有多个组件：
    - **算法性延迟**：从音频到达模型可以处理它的时间（由切片大小、前瞻和特征提取决定）。
    - **计算延迟**：运行模型前向传播所需的时间。
    - **终点器延迟**：检测用户已结束说话所需的时间。
    - **第一个词的延迟**：第一个单词出现的速度。**最终确认延迟**：最终输出被确认的速度（流式系统通常产生 provisional输出，随着更多音频到达而得到修正）。

- **评估指标**对于ASR:

- **词错误率（WER）** 是主要指标。它通过将假设（系统输出）与参考（标准转录）进行对齐来计算，使用编辑距离（将一个转换为另一个所需的最小替换、插入和删除数量），然后：

$$\text{WER} = \frac{S + D + I}{N}$$
- $S$ 是替换，$D$ 是删除，$I$ 是插入，$N$ 是参考文本的总词数。WER 可以超过 100%，如果有很多插入。对于干净读取的语音，5% 的 WER 被认为是人类水平；而对于对话或嘈杂的语音，难度更大（10-20%+）。

- **字符错误率**（CER）在字符级别应用相同的公式，而不是单词级别。CER对于没有清晰词界的语言（如中文、日语）和评估近似度如何接近更准确（例如，“cat” vs “bat”在WER中为100%，但在CER中为33%）。

- **单词信息丢失**（WIL）和**单词信息保留**（WIP）是基于参考和假设之间相关性的信息论替代方案，比WER更精确地评估这种关系，但它们较少被报告。

- 实时因素（RTF）衡量计算效率：处理时间与音频持续时间的比率。RTF < 1 means the system runs faster than real time; RTF > 1表示它无法跟上现场音频。流媒体系统必须保持RTF < 1。

- **数据增强**对于ASR的鲁棒性至关重要。常见的技术包括：
    - **速度扰动**：将音频以0.9x和1.1x的速度进行重采样（改变音调和持续时间）。
    - **SpecAugment**（Park et al., 2019）：在频谱图中随机遮挡频率带和时间步长。这是ASR的音频等效于丢弃，是其中一个最有效的正则化技术，不需要额外的数据。
    - **噪声增强**：将干净的语音与各种信噪比下的录制噪音混合。
    - **房间 impulse响应模拟**：将干净的语音与模拟房间声学效果进行卷积，以模拟回声环境。

- **分词**对于ASR决定了模型的输出词汇表。选项包括：
    - **字符**：简单的、小词汇表（大约30个字符），但长输出序列和没有隐含的语言建模。
    - **单词片段/ BPE**（来自第7章）：平衡词汇大小和序列长度的子词单位。现代系统的标准做法（例如，Whisper使用字节级BPE，包含约50,000个标记）。
    - **单词**：大型词汇表（超过50,000个），短输出序列，但无法处理不在词汇表中的单词。
    - **音素**：基于语言学的，紧凑型，但需要发音词典。

- ASR的发展可以总结为从高度工程化的模块化系统（GMM-HMM + WFST解码，1990s-2010s）到混合系统（DNN-HMM，2012-2016）再到吸收越来越多管道内容的端到端系统（CTC、RNN-T、LAS，2016-2020），最后是利用大量未标记或弱标记数据的大规模预训练模型（wav2vec 2.0、Whisper，2020至今）。每个过渡简化了工程工作同时提高了准确性，遵循机器学习领域向从数据中学习表示而非手动设计它们的趋势（如第06章中图像特征由CNN取代，第07章中NLP特征由transformers取代）。

## 编程任务（使用CoLab或笔记本）

1. 实现从头开始的CTC损失函数在JAX中。创建一个短序列的logits和目标标签，使用CTC前向算法计算总概率，并计算负对数似然损失。
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
