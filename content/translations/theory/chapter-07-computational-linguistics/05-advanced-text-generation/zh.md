---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 07 - computational linguistics/05. advanced text generation.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 88d96b617b14ea399f3e1806f8ca281a8215a43486dc366d24ad62da99c53303
status: reviewed
---
# 高级文本生成

高级文本生成超越了传统的自回归解码，以提高质量、可控性和速度。本文件涵盖了文本扩散模型（D3PM、MDLM）、OCR、RLHF和DPO用于对齐、长上下文方法（RoPE缩放、环注意力）以及检索增强生成和 speculative解码以加快推理速度。

- -标准自回归生成（文件04）按一个令牌一个令牌地产生文本，从左到右进行。这是简单且有效的，但它是本质上顺序的，不允许全局规划，并且对输出的控制有限。本文件涵盖了超越传统自回归解码的方法：用于文本的扩散模型、光学字符识别、通过人类反馈实现可控生成、处理长上下文、检索增强生成以及 speculative解码以加快推理速度。

- **文本扩散模型**将扩散框架（在第08章中引入）应用于离散文本。核心挑战是文本是离散的：你不能像为像素添加连续高斯噪声那样为令牌添加噪声。几种方法解决了这个问题。

- **D3PM**（离散去噪扩散概率模型，Austin等人，2021年）直接在离散令牌上应用转换矩阵进行前向污染过程。在每个前向步骤中，一个令牌有某种概率被另一个令牌替换（均匀噪声）、被遮挡（吸收状态），或保持不变。反向过程学习去噪，预测从污染后的令牌中恢复干净的令牌。转换矩阵$Q_t$在第$t$步控制污染：

$$q(x_t \mid x_{t-1}) = \text{Cat}(x_t ; \, x_{t-1} Q_t)$$
- 其中$\text{Cat}$表示一个类别分布，$x$是一个独热向量。多步前向过程$q(x_t \mid x_0)$具有闭合形式：$q(x_t \mid x_0) = \text{Cat}(x_t ; \, x_0 \bar{Q}_t)$其中$\bar{Q}_t = Q_1 Q_2 \cdots Q_t$是所有转换矩阵的乘积，直到第$t$步。训练最小化变分下界（ELBO），该下界在时间步上分解，类似于连续情况（第08章）：

$$\mathcal{L}_{\text{D3PM}} = D_{\text{KL}}(q(x_T \mid x_0) \| p(x_T)) + \sum_{t=2}^{T} D_{\text{KL}}(q(x_{t-1} \mid x_t, x_0) \| p_\theta(x_{t-1} \mid x_t)) - \log p_\theta(x_0 \mid x_1)$$
- 第一项确保完全污染的分布与先验（均匀或全遮挡）匹配。KL项训练模型逆每个污染步骤：真实的逆后验$q(x_{t-1} \mid x_t, x_0)$可以使用贝叶斯规则和已知转换矩阵计算出来，而模型$p_\theta(x_{t-1} \mid x_t)$被训练来匹配它。

- 由于这两种分布都是类别分布，KL散度是一个简单的词汇表项的简单加法。最后一项衡量从最不污染的状态重建质量。

- **MDLM**（掩码扩散语言模型，Sahoo et al., 2024）简化了D3PM，仅使用遮挡作为唯一污染操作：前向过程逐渐用[MASK]标记替换令牌；后向过程预测原始令牌。这将文本扩散连接到掩码语言建模（BERT，文件04），其中扩散时间步控制被遮挡的令牌比例。在$t = 0$时，文本完全干净；在$t = T$时，文本完全被遮挡。

- **连续文本扩散**通过在连续嵌入空间中工作绕过了离散问题。首先将标记映射到它们的嵌入向量（第06章），然后在该连续空间中添加噪声，接着使用典型的变换器模型学习逆过程。在生成时，模型产生连续向量，这些向量通过找到最近的嵌入映射回离散标记。挑战在于连续空间中的小错误可以映射到完全错误的标记，因此需要仔细四舍五入和截断。

![文本扩散过程](../images/text_diffusion.svg)


- 文本扩散的魅力在于它通过迭代细化的方式同时生成所有标记，而不是从左到右。这使得全局一致性得以实现，并且易于填充（在文章中间生成缺失文本），但当前的文本扩散模型在长格式文本的生成质量上仍落后于自回归模型。

- 文本识别（光学字符识别）是将图像中的文字提取出来。虽然传统上不与语言生成一起归类，但现代的OCR系统与NLP深度集成，并且越来越多地使用语言模型组件。

- **场景文本检测**在自然图像中定位文本区域（街道标志、产品标签、车牌）。这非常具有挑战性，因为野外的文本以任意角度、大小、字体和杂乱背景出现。检测方法通常使用CNN或Transformer骨干网络来产生文本区域的边界框或分割掩码。

- CRNN（卷积循环神经网络，shi et al., 2017）是经典文本识别架构。CNN从文本图像中提取视觉特征，将特征图按水平位置切片成一列序列，双向LSTM读取该序列以建模上下文。输出通过**CTC**（连接主义时间分类）进行解码，无需显式分割即可处理输入列与输出字符之间的对齐关系。

- CTC 的基本问题：模型生成了 $T$ 输出分布（一个每列），但目标文本有 $L \leq T$ 字符。

- 我们不知道哪些列对应于哪些字符。CTC引入了一个空白标记 $\epsilon$，并定义了一个多对一映射 $\mathcal{B}$，将重复的字符折叠并删除空白：$\mathcal{B}(\text{"HH-ee-ll-ll-oo"}) = \text{"Hello"}$（其中“-”是空白）。

- 目标序列 $y$ 的概率是所有导致 $y$ 的输入对齐的总和。

$$P(y \mid x) = \sum_{\pi \in \mathcal{B}^{-1}(y)} \prod_{t=1}^{T} P(\pi_t \mid x)$$
- $\pi$ 是一个长度为 $T$ 的对齐路径（每列包含标签，包括空白）。直接求和是指数级的，但 **前向算法**（第 5 章 HMMs）在 $O(T \cdot L)$ 时间内使用动态规划高效地计算这个和。

- 空白标记是必需的：没有它，像“Hello”中的重复字符“ll”就会被混淆为单个“l”。训练最大化了 $\log P(y \mid x)$，而在推理时，最佳路径通过 beam search 或贪婪解码来自 CTC 输出。

- **文档OCR** 处理结构化文档（发票、表格、科学论文）时，除了识别字符外，还必须理解布局。现代系统如布局LM结合文本识别与空间位置特征：每个标记不仅获得其文本嵌入，还通过编码其在页面上的 $(x, y)$ 坐标来获取位置嵌入。这使得模型能够理解“Total:”下方出现的数字是总金额。

![CRNN OCR管道](../images/crnn_ocr_pipeline.svg)


- **视觉语言OCR** 模型如 TrOCR 将文本识别视为图像到文本生成：一个视觉变换器编码器处理图像，一个语言模型解码器逐字符生成文本。这利用了预训练的视觉和语言模型的强大功能，并在多种脚本、字体和布局中处理多样化内容，而无需手工特征工程。

- **可控生成**是引导语言模型产生符合特定属性的输出，例如特定风格、主题、情感、安全级别或事实准确性。模型应遵循指令，同时保持流畅和连贯。

- **无条件引导（CFG）**用于文本适应图像生成技术。在训练过程中，随机丢弃一些条件信号（例如提示），同时训练一个带有和不带条件的模型。在推理时，输出的对数概率进行插值：

$$\text{logits}_{\text{guided}} = (1 + w) \cdot \text{logits}_{\text{conditional}} - w \cdot \text{logits}_{\text{unconditional}}$$
- $w > 0$ 增加了条件的影响。 $w$ 越高，输出越强烈遵循提示，但多样性减少。

- **RLHF**（从人类反馈中学习强化，Ouyang等人，2022）是将语言模型与人类偏好对齐的主导方法。该过程包括三个阶段：

- 首先，**监督微调（SFT）**：在高质量的人类写作风格的提示数据集上微调基础语言模型。

- 第二，**奖励模型训练**：收集人类比较（给定提示 $x$ 和两个响应 $y_1, y_2$，哪个更好？），并使用该模型 $r_\phi(x, y)$ 预测人类偏好。奖励模型通过一对比排序损失进行训练：

$$\mathcal{L}_{\text{RM}} = -\log \sigma(r_\phi(x, y_w) - r_\phi(x, y_l))$$
- $y_w$ 是首选响应，而 $y_l$ 是不受欢迎的选项。

- 第三，**RL fine-tuning**：优化语言模型以最大化奖励，同时保持与SFT模型的接近（防止模式崩溃）。这使用了PPO（第06章中的近似策略优化），并带有KL惩罚。

$$\mathcal{L}_{\text{RL}} = -\mathbb{E}\left[r_\phi(x, y) - \beta \, D_{\text{KL}}(\pi_\theta \| \pi_{\text{SFT}})\right]$$
- KL项防止模型偏离基础模型太远，并利用奖励模型的特性（“奖励黑客”）。

![RLHF管道](../images/rlhf_pipeline.svg)


- **DPO**（直接偏好优化， Rafailov 等人，2023）通过完全消除奖励模型来简化 RLHF。关键的数学洞察是上述带有KL约束的RL目标有一个闭合形式的最佳策略：

$$\pi^\ast(y \mid x) = \frac{1}{Z(x)} \pi_{\text{ref}}(y \mid x) \exp\!\left(\frac{r(x, y)}{\beta}\right)$$
- $Z(x)$ 是一个归一化分区函数。将这个表达式重新排列以获得奖励，得到 $r(x, y) = \beta \log \frac{\pi^\ast(y \mid x)}{\pi_{\text{ref}}(y \mid x)} + \beta \log Z(x)$。将这个隐含的奖励代入 Bradley-Terry 偏好模型 $P(y_w \succ y_l) = \sigma(r(x, y_w) - r(x, y_l))$ 会导致不可解的 $Z(x)$ 项消去，直接得到 DPO 损失：

$$\mathcal{L}_{\text{DPO}} = -\log \sigma\!\left(\beta \log \frac{\pi_\theta(y_w \mid x)}{\pi_{\text{ref}}(y_w \mid x)} - \beta \log \frac{\pi_\theta(y_l \mid x)}{\pi_{\text{ref}}(y_l \mid x)}\right)$$
- 这与RLHF在数学上等价，但将奖励模型和RL训练合并成一个单步的监督学习步骤。

- 表达式内部的sigmoid可以读作：“增加首选响应的相对概率，并减少不受欢迎响应的相对概率，与参考模型进行比较。”

- 参数 $\beta$ 控制策略与参考模型的偏差程度。在实践中，DPO 的实现更为简单（只需计算当前和参考模型下两种完成的概率对数），并且避免了 PPO 训练中的不稳定问题。

- **宪法型AI**（ Bai et al., 2022）自动化了部分对齐过程。它使用语言模型本身来批评和修订自己的输出，根据一套原则（“宪法”），例如“选择更不有害的响应”。然后这些由AI生成的比较结果用于偏好训练（RLAIF: RL从AI反馈）。

- 长文处理方法解决 $O(n^2)$ 标准自注意力的内存和计算成本限制了序列长度。 $n$ 随着词的数量增长到数万甚至数十万，标准注意力就变得不可行。

- **稀疏注意力**将密集的 $n \times n$ 注意矩阵替换为一个稀疏模式，其中每个令牌只关注其他令牌的一部分。常见的模式包括局部注意力（每个令牌只与固定大小的邻居互动），步长注意力（只关注每 $k$ 个令牌），以及随机注意力（只关注随机子集）。结合这些模式（在 BigBird 和 Longformer 中使用）可以实现 $O(n)$ 或 $O(n \sqrt{n})$ 复杂度，同时保持捕捉局部和全局依赖的能力。

![稀疏注意力模式](../images/sparse_attention_patterns.svg)


- 滑动窗口注意力限制每个词只关注之前的 $w$ 令牌（其本地窗口）。这是 $O(nw)$ 而不是 $O(n^2)$但是，长距离的信息必须通过重叠的窗口在层之间传播。 $L$ 层和窗口大小 $w$有效接受场是 $L \times w$ 标记。

- **环关注**通过在环拓扑中排列长序列，将它们分布在多个设备上。每个设备持有序列的一部分，并同时为自己的部分计算注意力，同时向下一个设备发送键值块。这种重叠计算与通信的方式允许序列的长度仅受限于所有设备总内存，而不是单个设备的内存。

- **内存增强模型**通过在Transformer中添加外部记忆库来扩展上下文。在每一层，模型可以读取和写入这个记忆库，并使用注意力机制进行操作。记忆化Transformer从之前的部分缓存键值对，并在后续部分中进行关注，从而有效地将上下文扩展到训练窗口之外。检索是近似（使用$k$最近邻邻居对缓存的键进行）的，以保持效率。

- 上述方法是处理长上下文的**架构性解决方案**。同样重要的是，如何有效地使用模型来处理长上下文。

- **逐步扩展上下文**是标准方法。从一开始就训练非常长的序列是非常昂贵的（$O(n^2)$注意力成本），因此模型在短上下文长度（通常为4K–8K个标记）上进行预训练，然后通过分阶段继续预训练扩展到目标长度。

- Llama 3.1从8K扩展到128K，通过逐渐增加的序列长度覆盖超过800B的tokens。DeepSeek-V3在4K开始训练，然后扩展到32K，最后到128K。

- 每个阶段使用相对较少的tokens（相对于整个预训练预算），因为模型只需要学习如何使用更长的位置，而不是重新学习语言本身。

- 在扩展时，位置编码需要进行调整。 **RoPE插值** 将位置索引缩小，使得模型看到与训练时相同的旋转角度，但这些角度分布在更长的序列上。如果模型在长度 $L$ 下进行了训练，并且你想将其扩展到 $L' = 4L$，那么你需要将所有位置索引除以 4。

- 这意味着模型从未见过一个它没有遇到过的旋转角度，但相邻位置之间的有效分辨率下降了。

- **RoPE扩展**保持原始位置索引不变，并在 $L$ 之后简单地应用 RoPE，依赖模型对未见过的角度进行泛化。

- 插值更加稳定；在不进行基本频率调整（ABF）的情况下，外推会迅速下降。

- YaRN（Yet Another roPE extensioN）通过识别不是所有RoPE维度都应该同等对待来改进朴素插值。

- 高频维度（小 $i$ 在 $\theta_i = \theta_{\text{base}}^{-2i/d}$ 中旋转多次，并且能够很好地进行外推）。

- 长度扩展时，低频维度（大 $i$）旋转较慢且更敏感。

- YaRN 只在低频维度进行插值，而在高频维度进行外推，并通过应用温度缩放 $t$ 来补偿注意力_logits的分布性变化。

$$\text{score}'_{ij} = \frac{q_i^T k_j}{t \sqrt{d_k}}$$
- $t > 1$ 将注意力分布拉平，防止模型在压缩位置信号时过于集中地关注附近令牌。

- **长文档数据整理** 是一个关键且常常被低估的挑战。大多数预训练语料库由短文档组成（新闻文章、网页、社交媒体帖子等）。

- 长文档训练需要一种实际锻炼完整上下文窗口的数据混合：书籍、代码仓库、长形式科学文章、多轮对话记录以及主题相关联的文档进行拼接。

- 如果模型仅通过填充或打包短文档来训练，它会忽略远处的标记，因为它们从未相关。

- **序列打包**是一种训练效率技术：多个文档被拼接成一个单个的训练序列，以避免填充浪费，并通过注意力掩码防止跨文档注意力。

- 对于长上下文训练，打包策略很重要：打包许多无关的短文档教会模型远处的标记是噪声，而打包较少、真正长的文档则教会它使用完整的上下文。

- 已知的一种故障模式是“中间丢失”现象（Liu 等，2023）：语言模型在使用上下文窗口开头和结尾的信息方面表现良好，但在中间放置的信息上却难以处理。

- 这类似于人类记忆中的序列位置效应（先入为主和尾部效应）。

- 它部分源于训练数据的分布（重要信息通常在文档开头或结尾），同时也受到注意力模式的影响，这些模式倾向于关注附近的和初始标记。

- 长文本训练时，关键信息的多样放置能够缓解但无法完全解决这个问题。

- **寻找迷针**评估测试模型是否能够在长干扰背景下准确检索特定事实（“迷针”），无论该事实放置在 haystack 的哪个位置。

- 具有真实长上下文能力的模型应能够以近乎完美的准确性检索任何位置的迷针。

- 这个测试清楚地展示了“丢失在中间”的效果，并用于基准测试上下文扩展方法。

- **长上下文微调**在预训练后使用针对性的SFT数据：多轮对话、文档问答中的证据分散在数千个标记中，长篇摘要以及仓库级别的代码理解。

- Qwen3在这一阶段使用了**双块注意力（DCA）**，它将长序列处理为对块的对，其中 intra-chunk注意力是全的，而 inter-chunk注意力是高效的，从而在微调期间提高了4倍的有效序列容量。

- **状态空间模型（SSMs）**提供了一种 fundamentally不同的长序列建模方法。它们完全取代了注意力机制，而是将其替换为一个由连续时间控制理论启发的线性动态系统。

- 一个SSM将输入序列$u(t)$映射到输出$y(t)$，通过一个由$x(t) \in \mathbb{R}^N$控制的潜在状态。

$$x'(t) = Ax(t) + Bu(t), \quad y(t) = Cx(t) + Du(t)$$
- $A \in \mathbb{R}^{N \times N}$ 是状态转换矩阵，$B \in \mathbb{R}^{N \times 1}$ 是输入投影，$C \in \mathbb{R}^{1 \times N}$ 是输出投影，$D$ 是跳连接。

- 将此应用于离散序列（标记）时，连续系统通过步长 $\Delta$ 进行离散化。零阶保持离散化给出：

$$\bar{A} = \exp(\Delta A), \quad \bar{B} = (\Delta A)^{-1}(\exp(\Delta A) - I) \cdot \Delta B$$
- 这个离散递推关系变成了 $x_k = \bar{A} x_{k-1} + \bar{B} u_k$ 和 $y_k = C x_k + D u_k$，看起来像一个 RNN：逐个处理一个标记，并使用隐藏状态。

- 不像RNNs，这个递归也可以展开为**全局卷积**：因为系统是线性的，输出是$y = \bar{K} \ast u$，其中核$\bar{K} = (C\bar{B}, \, C\bar{A}\bar{B}, \, C\bar{A}^2\bar{B}, \ldots)$只依赖于固定参数。

- 这种双视图——用于高效的自回归推理的递归$O(1)$ 逐层（step）和卷积用于高效并行训练。$O(n \log n)$ 通过FFT）——是SSMs的核心洞察力。

![SSM双视图：推理时递归，训练时卷积，Mamba的选择性扩展](../images/ssm_dual_view.svg)


- **S4**（用于序列建模的结构状态空间，Gu等人，2022年）通过解决关键数值挑战使SSMs实用。$A$必须捕捉长距离依赖，但直接参数化它会导致动态消失或爆炸（与朴素的RNN相同的问题）。

- S4 使用 **HiPPO**（高阶多项式投影算子）矩阵初始化 $A$，该矩阵基于连续信号最优多项式逼近理论推导而来。HiPPO 矩阵具有特定结构，能够证明状态能以渐进衰减的方式保持整个输入历史的压缩表示。

```math
A_{nk} = -\begin{cases} (2n+1)^{1/2}(2k+1)^{1/2} & \text{if } n > k \\ n+1 & \text{if } n = k \\ 0 & \text{if } n < k \end{cases}
```

- 这个下三角结构确保了状态作为输入信号的在线近似使用Legendre多项式。计算长核时，$\bar{A}^k$非常昂贵，因此S4利用HiPPO矩阵可以分解为低秩和对角项之和的事实，从而实现$O(n \log n)$核的计算。

- **Mamba** (Gu and dao, 2023) 引入了关键创新——选择性状态空间：将 SSM 参数输入依赖。在 S4 中，矩阵 $A$、$B$、$C$ 和 步长 $\Delta$ 是固定的 —— 无论内容如何，每个令牌都应用相同的动态。Mamba 将 $B$、$C$ 和 $\Delta$ 函数于输入：

$$B_k = \text{Linear}(u_k), \quad C_k = \text{Linear}(u_k), \quad \Delta_k = \text{softplus}(\text{Linear}(u_k))$$
- 这种选择性允许模型在每个位置决定存储在状态中的信息以及忽略哪些信息，类似于注意力选择相关令牌，但没有二次成本。步长 $\Delta_k$ 控制“门”：较大的 $\Delta$ 使状态强烈地整合当前输入（连续动力前进一个大步，实际上重置了状态），而较小的 $\Delta$ 保留现有的状态并忽略当前输入。

- 该交易是输入依赖参数打破了卷积视图（核不再是固定不变的），因此Mamba无法使用FFT-based训练。相反，它使用一个**硬件感知并行扫描算法**，利用递归的关联性：状态更新$(x_k, u_k) \mapsto x_{k+1}$可以表达为一系列关联操作，并通过前缀和（扫描）进行并行化，类似于硬件设计中的并行前缀加法。这在GPU上运行的时间复杂度为$O(n)$，深度为$O(\log n)$，接近卷积的效率。

- Mamba能够实现真正推理。 $O(1)$ 每个token（只需更新固定大小的状态，不随上下文增长的KV缓存），使其在长序列长度下比Transformer更内存高效。状态大小 $N$ （通常为16）远小于Transformer的KV缓存，后者存储 $O(n \cdot d)$ 在实践中，Mamba与Transformer质量相当，在相同的参数数量上，在语言建模基准测试中表现更好，并且在处理长序列时推理速度更快。

- **混合架构**将SSM层与注意力层结合使用，利用SSMs处理大多数层（高效长距离传播）并在少数层中添加注意力层（精确内容依赖检索）。像Jamba和Zamba这样的模型交错使用Mamba和Transformer块，比纯SSMs在质量上更好，但保留了大部分推理效率优势。这表明注意力和SSMs捕捉互补能力：SSMs擅长平滑、长距离状态传播，而注意力擅长精确、内容相关的查找。

- **检索增强生成（RAG）**通过在推理时访问外部知识库，解决了语言模型的知识限制。它不依赖于在训练期间编码在模型参数中的知识，而是从相关文档中检索信息并根据这些信息进行条件生成。

- 经典的检索器-阅读器架构由两个组件组成。检索器接收查询并从语料库中获取最相关的前-$k$个段落。阅读器（一个语言模型）基于查询和检索到的段落生成答案。检索器可以使用稀疏方法（如BM25，它扩展了文件02中的TF-IDF），也可以使用密集方法。

- **密集文本检索（DPR）** 使用双编码器架构：一个编码器将问题映射到向量，另一个编码器将文档映射到向量。两者通常基于BERT。在索引时间，所有文档都被编码并存储。在查询时间，问题被编码，并使用近似最近邻搜索（如FAISS）找到最接近的文档。相似度指标是问题和文档向量之间的点积。

- **分块策略** 对检索质量影响显著。文档必须分割成足够小的段落，以便检索器可以处理，但大小足够包含完整的想法。固定大小分块（例如，256个标记，50个标记重叠）简单但可能将句子分割得 awkward。语义分块在段落或章节边界处进行分割。层次结构分块创建不同粒度摘要的树状结构。

![RAG架构](../images/rag_architecture.svg)


- RAG 提供了几个优势：知识库可以更新而无需重新训练模型，模型可以引用来源，并且由于模型可以在检索到的文本中支撑答案，因此 hallucination 减少。主要挑战是检索质量（如果检索到的错误段落，模型可能会自信地产生错误的答案），以及延迟（检索增加了推理步骤）。

- **推测解码**通过使用一个小型、快速的 **草稿模型** 并在单个前向传播中并行提出多个令牌来加速自回归生成。这些令牌随后由大型 **目标模型** 进行验证。

- 算法的工作方式如下：草案模型自回归地生成 $k$ 候选令牌（因为草案模型很小，这非常快）。

- 目标模型然后对所有 $k$ 同时在单次前向传播中处理多个标记（这非常高效，因为工作是批量进行的）。

- 对于每个从草案分布 $p_d(t)$ 中采样的候选令牌 $t$，如果被接受，则概率为 $\min(1, \, p_{\text{target}}(t) / p_d(t))$。如果被拒绝，则重新采样一个来自 **调整后的分布** $p_{\text{adj}}(t) = \max(0, \, p_{\text{target}}(t) - p_d(t))$ 的令牌，并进行归一化处理。

- 这个接受拒绝方案确保了输出分布与目标模型完全一致。

- To see why, consider the effective probability of emitting token $t$. It can be accepted directly (probability $p_d(t) \cdot \min(1, p_{\text{target}}(t)/p_d(t))$) or produced through resampling.

- For tokens where $p_{\text{target}}(t) \leq p_d(t)$, the direct acceptance contributes $p_{\text{target}}(t)$. For tokens where $p_{\text{target}}(t) > p_d(t)$, direct acceptance contributes $p_d(t)$ and resampling contributes the remainder $p_{\text{target}}(t) - p_d(t)$ (after accounting for the rejection probability).

- 在两种情况下，发射的总概率是 $t$ 等于 $p_{\text{target}}(t)$这个草案模型只影响速度，不涉及质量。

![推测解码](../images/speculative_decoding.svg)


- 速度取决于接受率：如果草稿模型与目标模型对齐良好，大多数令牌被接受，墙钟时间大致等于草稿模型。典型的加速比为2-3倍，没有质量下降。

- **Medusa** (Cai et al., 2024)采用了一种不同的方法：它在目标模型本身中添加了多个轻量级预测头。每个头同时预测不同未来的token位置（$k = 1, 2, 3, \ldots$步后）。在每次步骤中，Medusa提出多个候选继续方案，并通过一次通过目标模型的注意力层来验证哪些候选是 consistent的。这完全避免了需要单独的draft模型。

- 并行生成方法旨在打破自回归解码的顺序瓶颈。Jacobi解码从所有位置初始化猜测，并在并行迭代中逐步优化它们，将生成视为固定点迭代。非自回归模型（NAT）同时生成所有标记，在单个前向传播中进行，但通常会遭受质量下降，并需要使用迭代细化、CTC损失或来自自回归教师的知识蒸馏等技术来缩小差距。

- 上述技术——对齐、长上下文、检索、高效解码和状态空间模型——在现代生产LLMs中共同作用。

- 剩下的文件概述前沿模型中的架构创新，展示了文件 01–04 中的理论想法和上述方法在实践中的结合。

- **组别查询注意力（GQA）**是目前最广泛采用的注意力效率技术。标准多头注意力（MHA）为每个头单独进行键和值投影，需要为每个令牌缓存 $n_{\text{heads}} \times d_{\text{head}}$ 值。GQA 将多个查询头组合在一起，共享一个键值头。

- 使用 64 查询头和 8 KV 头（Llama 3、Qwen 和 Gemma 中常见的配置），每个 KV 头被 8 个查询头共享，从而将 KV 缓存减少了 8 倍。

- 输出质量与MHA几乎相同，因为查询仍然可以关注不同的模式，只是共享相同的键值子空间。多查询注意力（MQA）是所有查询都只有一个KV头的极端情况，但GQA提供了更好的质量和效率平衡。

- 多头潜意识注意力（MLA），在DeepSeek-V2中引入，实现了更激进的KV缓存压缩。与GQA相关的全键值投影不同，MLA将隐藏状态降维到低秩的**潜意识向量**。 $c_t \in \mathbb{R}^{d_c}$ 在 $d_c \ll n_{\text{heads}} \times d_{\text{head}}$。

$$c_t = W_{\text{down}} \, h_t$$
- 仅此压缩向量被缓存。在注意力时间，通过上投影重建完整的键和值表示。 $k_t = W_{\text{up}}^K c_t$， $v_t = W_{\text{up}}^V c_t$在DeepSeek-V3（总参数量为671B，有效参数量为37B）中，压缩维度是 $d_c = 512$ 与 $128 \times 128 = 16{,}384$ 对于全MHA，KV缓存减少93%。

- 一个微妙之处：标准的RoPE是位置依赖的，并且与共享压缩不兼容，因此MLA使用**分隔式RoPE**：查询和键（每个头64维度）的小单独流携带位置信息通过RoPE，而大部分表示通过压缩的潜意识路径流动。

![注意力KV缓存策略：MHA、GQA和MLA比较](../images/mla_vs_gqa.svg)


- 在大规模位置编码方面，与原始的正弦方案相比，前沿模型发生了显著的分化。所有前沿模型都使用了RoPE（文件04），但对长上下文进行了关键修改。基础频率 $\theta_{\text{base}}$ 在原始的ROPE公式中 $\theta_i = \theta_{\text{base}}^{-2i/d}$ 通常为10,000，这限制了超出训练长度的预测。

- **调整基础频率（ABF）**简单地将 $\theta_{\text{base}}$ 增加到 500,000（Llama 3）或 1,000,000（Qwen3、Gemma 3），从而延长旋转周期，使模型在训练过程中遇到的完整旋转次数减少，并能更远地进行预测。

- YaRN（Yet another roPE extensioN）应用频率依赖的插值：低频维度被缩放，高频维度被扩展，并通过温度因子调整注意力分布。DeepSeek-V3、Qwen和Kimi K2都使用基于YaRN的扩展来达到128K上下文，这些模型在4K到8K预训练的模型上进行扩展。

- **iRoPE**（交错 RoPE），在 Llama 4 中引入，采取了更激进的方法：每四个注意力层都不使用任何位置编码（NoPE），而其他层则使用标准的 RoPE，并且采用分块注意力。

- NoPE 层可以无偏地关注所有位置，而 RoPE 层提供局部顺序。结合推理时的温度缩放，这使得 Llama 4 Scout 的 10M 令牌上下文窗口 — 超过任何纯 RoPE 方法的几个数量级——成为可能。

- **大规模混合专家架构**已成为前沿模型（文件 04 引入了 MoE 基本知识）的主要架构。关键设计选择包括专家的数量、路由稀疏性和负载均衡。

- 路由稀疏性差异显著：DeepSeek-V3 使用 256 个专家，采用 top-8 路由（32x 稀疏）；Qwen3 使用 128 个专家，采用 top-8 路由（16x 稀疏）；Mixtral 使用 8 个专家，采用 top-2 路由（4x 稀疏）；Llama 4 Maverick 使用 128 个专家，采用 top-1 路由并包含一个共享专家（128x 稀疏）。

- 更高的稀疏性意味着相同的活跃计算量下有更多的总参数，但需要更仔细的负载均衡和通信基础设施。

- **无辅助损失的负载平衡**（DeepSeek-V3）取代了传统的负载平衡损失（文件 04），因为发现这种损失会降低模型质量。相反，每个专家在每次训练步骤中维护一个动态偏置项，根据训练过程调整：过载专家的偏置减少（接收较少令牌），欠载专家的偏置增加。这实现了无辅助损失的路由平衡，而不会污染主要训练信号。

- **共享专家**在大多数MoE设计中出现：一个或多个专家FFNs，它们对每个令牌都进行处理，无论路由如何。这些专家处理所有令牌都需要的基本模式（基本语法、功能词），从而让路由专家能够专门化。Llama 4使用1个共享专家加上1个路由专家每令牌（非常稀疏）；DeepSeek-V3使用1个共享专家加上8个路由专家。

- **交替使用密集层和MoE层**提供另一个设计轴。Gemma 2和3交替使用局部全局注意力层（在Gemma 3中，局部层使用一个1,024-token滑动窗口，并且只缓存整个128K上下文）。

- Llama 4 Maverick将密集的FFN层与MoE（混合稀疏）层交织在一起。Kimi K2使用混合稀疏层（在专家层之间插入一个密集层）。这种异构设计允许不同层执行不同的功能。

- **多令牌预测（MTP）**，在DeepSeek-V3中使用，训练模型不仅预测下一个令牌，还预测下一个令牌之后的令牌。在每个位置，一个辅助预测模块（共享主模型的嵌入）预测一个额外的未来令牌。MTP损失相对于主要下一个令牌损失的权重为0.1–0.3。除了在训练期间提高表示质量外，MTP头还可以作为推理时的草案头，提供免费加速。

- 知识蒸馏是一种训练策略，其中大型“教师”模型的输出指导较小“学生”模型的训练。Gemma 2和3使用了广泛的蒸馏：较小的模型（2B、4B）在50倍于计算最优数据量的情况下，使用教师的概率分布作为软目标进行训练。这就是为什么Gemma 3-4B的质量与Gemma 2-27B相同的原因。

- 蒸馏损失取代或补充了标准的交叉熵：学生通过最小化其输出分布与教师之间的KL散度来优化。

$$\mathcal{L}_{\text{distill}} = D_{\text{KL}}(p_{\text{teacher}}(\cdot \mid x) \| p_{\text{student}}(\cdot \mid x))$$
- DeepSeek-R1 将其 671B 推理模型压缩到只有 1.5B 的稠密模型，使用了 800K 编辑过的链式思考样本，从而产生了具有 disproportionate强大推理能力的小模型。

- **基于强化学习的推理**是LLM能力的最大进步之一。DeepSeek-R1展示了在基础模型（不进行监督微调）上纯强化学习可以激发自发出现的链式思考、自我验证和错误修正行为，当模型被奖励给出正确最终答案时。

- DeepSeek-R1 使用 **GRPO**（组相对策略优化），从而消除了 PPO 所需的价值网络。对于每个提示，GRPO 从一组 $G$ 输出、计算它们的奖励，并在组内标准化优势：

$$A_i = \frac{r_i - \text{mean}(r_1, \ldots, r_G)}{\text{std}(r_1, \ldots, r_G)}$$
- 策略梯度使用这些组相对优势与带有裁剪目标的损失函数（类似于PPO中的裁剪）进行训练。

- 去掉批评网络可以显著减少强化学习训练所需的内存和计算资源，使得在RL中训练671B参数模型成为可能。

- 一个关键的设计选择：DeepSeek-R1使用**基于规则的奖励**（检查数学答案与标准答案进行比较，运行代码测试用例）而不是神经奖励模型，因为神经奖励模型在这一规模下容易受到奖励欺骗。

- Qwen3的混合思考模式将推理（带有`<think>`标签的步骤链）和快速直接响应整合到一个模型中，允许用户控制“思考预算”，在牺牲延迟的同时换取推理深度。

- 通过同时训练有思考和无思考的数据，而不是单独的模型检查点来实现。

- **大规模训练稳定性**需要超越标准做法的新技术。 **Logit软截断**（Gemma 2）通过 $s \cdot \tanh(\text{logits} / s)$ 将注意力分数传递给一个软截断 $s$（通常为30–50），以防止无界增长。

- **QK-Norm**（Qwen3）在计算注意力分数之前，对查询和键向量应用 RMSNorm，从而消除了 QKV 偏置的需求。**QK-Clip**（Kimi K2 的 Muon Clip 优化器）在训练过程中监控最大注意力 logits，并在权重矩阵超过阈值时重新缩放查询-键权重矩阵，以确保稳定预训练1T参数模型，避免零不稳定事件的发生。

- **FP8混合精度训练**（DeepSeek-V3）在前向和后向传播中使用8位浮点数进行计算密集型矩阵乘法，而主权重保持在更高精度。

- 这大约将吞吐量提高了两倍，与BF16/FP16训练相比几乎没有质量损失。DeepSeek-V3仅用280万H800 GPU小时就训练了671B参数的模型，这在可比模型中只占很小的一部分，主要得益于这一技术优化和其他工程优化措施。

## 编程任务（使用 CoLab 或 笔记本）

1. 从头实现一个简单的检索增强生成管道。使用 TF-IDF 索引文档集（文件 02），为查询检索最相关的段落，并将其prepend到提示中。
```python
import jax.numpy as jnp
import math
from collections import Counter

# Knowledge base: a set of short passages
knowledge_base = [
    "The Eiffel Tower is a wrought-iron lattice tower in Paris, France. It was constructed from 1887 to 1889 as the centerpiece of the 1889 World's Fair.",
    "The Great Wall of China is a series of fortifications built along the northern borders of China. Construction began in the 7th century BC.",
    "Photosynthesis is the process by which plants convert sunlight, water, and carbon dioxide into glucose and oxygen using chlorophyll.",
    "The theory of general relativity, published by Albert Einstein in 1915, describes gravity as the curvature of spacetime caused by mass and energy.",
    "Python is a high-level programming language known for its simple syntax and readability. It was created by Guido van Rossum and released in 1991.",
    "The mitochondria are organelles found in eukaryotic cells. They generate most of the cell's supply of ATP, used as a source of chemical energy.",
]

# Build TF-IDF index (reusing concepts from file 02)
def tokenise(text):
    return text.lower().split()

vocab = sorted(set(w for doc in knowledge_base for w in tokenise(doc)))
word2idx = {w: i for i, w in enumerate(vocab)}
V = len(vocab)
N = len(knowledge_base)

# Document frequencies
doc_freq = Counter()
for doc in knowledge_base:
    for w in set(tokenise(doc)):
        doc_freq[w] += 1

def tfidf_vector(text):
    words = tokenise(text)
    counts = Counter(words)
    vec = jnp.zeros(V)
    for w, c in counts.items():
        if w in word2idx:
            tf = 1 + math.log(c)
            idf = math.log(N / (doc_freq.get(w, 0) + 1))
            vec = vec.at[word2idx[w]].set(tf * idf)
    return vec

# Index all documents
doc_vectors = jnp.stack([tfidf_vector(doc) for doc in knowledge_base])

def cosine_sim(a, b):
    return jnp.dot(a, b) / (jnp.linalg.norm(a) * jnp.linalg.norm(b) + 1e-8)

def retrieve(query, top_k=2):
    """Retrieve top-k most relevant passages for a query."""
    q_vec = tfidf_vector(query)
    sims = jnp.array([cosine_sim(q_vec, doc_vectors[i]) for i in range(N)])
    top_indices = jnp.argsort(-sims)[:top_k]
    return [(int(i), float(sims[i]), knowledge_base[int(i)]) for i in top_indices]

# Test retrieval
queries = [
    "Who built the Eiffel Tower?",
    "How do plants make food?",
    "What did Einstein discover?",
]

for query in queries:
    results = retrieve(query, top_k=1)
    print(f"\nQuery: '{query}'")
    for idx, sim, passage in results:
        print(f"  Retrieved (sim={sim:.3f}): '{passage[:80]}...'")

    # RAG-style prompt construction
    context = results[0][2]
    rag_prompt = f"Context: {context}\n\nQuestion: {query}\nAnswer:"
    print(f"  RAG prompt:\n    {rag_prompt[:120]}...")
```

2. 实现推测解码，展示接受的输出与目标模型分布匹配。
```python
import jax
import jax.numpy as jnp

# Simulate a draft model (fast, less accurate) and target model (slow, accurate)
vocab_size = 8
seq_len = 5

key = jax.random.PRNGKey(42)

# Target model: returns logits given a sequence
def target_model(seq, key):
    """Simulated target model: produces token logits (expensive)."""
    # In practice this would be a large Transformer forward pass
    k1, k2 = jax.random.split(key)
    logits = jax.random.normal(k1, (len(seq), vocab_size)) * 2
    # Make it somewhat predictable: bias toward token (seq[-1] + 1) % vocab_size
    for i in range(len(seq)):
        logits = logits.at[i, (seq[i] + 1) % vocab_size].add(3.0)
    return logits

def draft_model(seq, key):
    """Simulated draft model: similar but noisier (cheap)."""
    k1, k2 = jax.random.split(key)
    logits = jax.random.normal(k1, (len(seq), vocab_size))
    for i in range(len(seq)):
        logits = logits.at[i, (seq[i] + 1) % vocab_size].add(2.0)
    return logits

def sample_token(logits, key):
    return jax.random.categorical(key, logits)

def speculative_decode(prefix, draft_steps=3, key=jax.random.PRNGKey(0)):
    """Speculative decoding: draft proposes, target verifies."""
    seq = list(prefix)
    total_accepted = 0
    total_proposed = 0

    for _ in range(4):  # generate 4 rounds
        key, *subkeys = jax.random.split(key, draft_steps + 3)

        # Draft model proposes draft_steps tokens
        draft_tokens = []
        draft_probs = []
        draft_seq = list(seq)
        for i in range(draft_steps):
            d_logits = draft_model(jnp.array(draft_seq), subkeys[i])
            d_probs = jax.nn.softmax(d_logits[-1])
            tok = sample_token(d_logits[-1], subkeys[i])
            draft_tokens.append(int(tok))
            draft_probs.append(d_probs)
            draft_seq.append(int(tok))

        # Target model scores all draft tokens in one pass
        target_logits = target_model(jnp.array(draft_seq), subkeys[draft_steps])
        target_start = len(seq) - 1  # position of last prefix token

        # Accept/reject each draft token
        accepted = 0
        for i in range(draft_steps):
            t_probs = jax.nn.softmax(target_logits[target_start + i])
            d_prob = draft_probs[i][draft_tokens[i]]
            t_prob = t_probs[draft_tokens[i]]

            # Accept with probability min(1, target_prob / draft_prob)
            accept_prob = jnp.minimum(1.0, t_prob / (d_prob + 1e-10))
            key, accept_key = jax.random.split(key)
            if jax.random.uniform(accept_key) < accept_prob:
                seq.append(draft_tokens[i])
                accepted += 1
            else:
                # Reject: sample from adjusted distribution
                key, resample_key = jax.random.split(key)
                adjusted = jnp.maximum(0, t_probs - draft_probs[i])
                adjusted = adjusted / (adjusted.sum() + 1e-10)
                new_tok = jax.random.categorical(resample_key, jnp.log(adjusted + 1e-10))
                seq.append(int(new_tok))
                break

        total_accepted += accepted
        total_proposed += draft_steps

    return seq, total_accepted, total_proposed

# Run speculative decoding
prefix = [0, 1]
result_seq, accepted, proposed = speculative_decode(prefix)
acceptance_rate = accepted / proposed if proposed > 0 else 0

print(f"Prefix: {prefix}")
print(f"Generated sequence: {result_seq}")
print(f"Draft proposals: {proposed}")
print(f"Accepted: {accepted}")
print(f"Acceptance rate: {acceptance_rate:.1%}")
print(f"Speedup potential: {(accepted + proposed) / proposed:.2f}x")
```

3. 构建一个简单的 DPO 训练循环。给定一对偏好和不偏好完成的结果，使用 DPO 损失更新一个小模型。
```python
import jax
import jax.numpy as jnp

# Tiny language model: linear projection from one-hot to logits
vocab_size = 10
seq_len = 4

key = jax.random.PRNGKey(42)
k1, k2 = jax.random.split(key)

# Current policy parameters (trainable)
theta = jax.random.normal(k1, (vocab_size, vocab_size)) * 0.1
# Reference policy parameters (frozen copy of initial theta)
theta_ref = theta.copy()

def log_prob_sequence(params, sequence):
    """Compute log P(sequence) under a simple autoregressive model."""
    total = 0.0
    for t in range(1, len(sequence)):
        # Simple: logits at position t depend on token at t-1
        logits = params[sequence[t-1]]
        log_probs = jax.nn.log_softmax(logits)
        total += log_probs[sequence[t]]
    return total

def dpo_loss(theta, theta_ref, preferred, dispreferred, beta=0.1):
    """Direct Preference Optimisation loss for one pair."""
    log_pi_w = log_prob_sequence(theta, preferred)
    log_pi_l = log_prob_sequence(theta, dispreferred)
    log_ref_w = log_prob_sequence(theta_ref, preferred)
    log_ref_l = log_prob_sequence(theta_ref, dispreferred)

    # DPO objective
    return -jax.nn.log_sigmoid(
        beta * ((log_pi_w - log_ref_w) - (log_pi_l - log_ref_l))
    )

# Preference dataset: (prompt_prefix, preferred_completion, dispreferred_completion)
preferences = [
    (jnp.array([1, 3, 5, 7]), jnp.array([1, 3, 5, 2])),  # prefer 7 over 2 at end
    (jnp.array([0, 2, 4, 6]), jnp.array([0, 2, 4, 9])),  # prefer 6 over 9
    (jnp.array([3, 3, 3, 3]), jnp.array([3, 3, 3, 0])),  # prefer repeating over 0
    (jnp.array([5, 6, 7, 8]), jnp.array([5, 6, 7, 1])),  # prefer 8 over 1
]

grad_fn = jax.jit(jax.grad(dpo_loss))
lr = 0.05

print("Training DPO...")
for epoch in range(100):
    total_loss = 0.0
    for preferred, dispreferred in preferences:
        loss = dpo_loss(theta, theta_ref, preferred, dispreferred)
        grads = grad_fn(theta, theta_ref, preferred, dispreferred)
        theta = theta - lr * grads
        total_loss += loss
    if (epoch + 1) % 20 == 0:
        avg_loss = total_loss / len(preferences)
        print(f"  Epoch {epoch+1}: avg DPO loss = {avg_loss:.4f}")

# Check: the model should now prefer the preferred completions
print("\nPreference check after DPO training:")
for preferred, dispreferred in preferences:
    lp_w = log_prob_sequence(theta, preferred)
    lp_l = log_prob_sequence(theta, dispreferred)
    print(f"  Preferred {list(preferred.astype(int))}: logP={lp_w:.3f}  "
          f"Dispreferred {list(dispreferred.astype(int))}: logP={lp_l:.3f}  "
          f"{'correct' if lp_w > lp_l else 'WRONG'}")
```
