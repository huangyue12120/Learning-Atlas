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

高级文本生成在自回归解码之外探索提升质量、可控性和速度的方法。本文介绍文本扩散模型（D3PM、MDLM）、光学字符识别（OCR）、用 RLHF 和 DPO 对齐模型、长上下文技术（RoPE 扩展、环形注意力）、检索增强生成，以及用于加速推理的推测解码。

- 第 04 篇介绍的标准自回归生成从左到右逐个词元生成文本。它简单有效，但生成过程必须依次进行，缺少全局规划能力，对输出的控制也有限。本文介绍文本扩散、光学字符识别、基于人类反馈的可控生成、长上下文处理、检索增强生成和推测解码等方法。

- **文本扩散模型**将第 08 章介绍的扩散框架应用于离散文本。文本由离散词元组成，不能像像素那样直接加入连续高斯噪声，因此研究者提出了几种处理方法。

- **D3PM**（离散去噪扩散概率模型；Austin 等，2021）直接对离散词元定义前向扰动过程，并用转移矩阵描述每一步的变化。词元可以按均匀噪声替换为其他词元、变为掩码（吸收态），或保持不变。反向过程学习去噪，从受扰动的词元恢复原始词元。第 $t$ 步的转移矩阵 $Q_t$ 定义如下：

$$q(x_t \mid x_{t-1}) = \text{Cat}(x_t ; \, x_{t-1} Q_t)$$
- 其中，$\text{Cat}$ 表示类别分布，$x$ 是独热向量。多步前向过程 $q(x_t \mid x_0)$ 也有闭式表达：$q(x_t \mid x_0) = \text{Cat}(x_t ; \, x_0 \bar{Q}_t)$，其中 $\bar{Q}_t = Q_1 Q_2 \cdots Q_t$ 是截至第 $t$ 步的转移矩阵乘积。训练时，模型最小化按时间步分解的变分下界（ELBO），与第 08 章介绍的连续情形类似：

$$\mathcal{L}_{\text{D3PM}} = D_{\text{KL}}(q(x_T \mid x_0) \| p(x_T)) + \sum_{t=2}^{T} D_{\text{KL}}(q(x_{t-1} \mid x_t, x_0) \| p_\theta(x_{t-1} \mid x_t)) - \log p_\theta(x_0 \mid x_1)$$
- 第一项使完全扰动后的分布与先验（均匀分布或全掩码状态）匹配。KL 项训练模型逆转每一步扰动：已知转移矩阵后，可以用贝叶斯定理计算真实的反向后验 $q(x_{t-1} \mid x_t, x_0)$，再训练模型 $p_\theta(x_{t-1} \mid x_t)$ 去匹配它。

- 这两个分布都是类别分布，因此 KL 散度可按词表中的各个词元求和。最后一项衡量模型从受扰动最少的状态重建原文的效果。

- **MDLM**（掩码扩散语言模型；Sahoo 等，2024）简化了 D3PM，只用掩码扰动文本：前向过程逐步将词元替换为 [MASK]，反向过程则预测原始词元。这使文本扩散与 BERT 的掩码语言建模（第 04 篇）联系起来，扩散时间步决定被掩码词元的比例。$t=0$ 时文本完全未受扰动；$t=T$ 时文本全部被掩码。

- **连续文本扩散**在连续嵌入空间中运行，从而绕开离散词元上的加噪问题。模型先将词元映射为嵌入向量（第 06 章），再在向量上加噪，并用通常基于 Transformer 的去噪模型学习逆过程。生成时，模型输出连续向量，再通过寻找最近的嵌入向量将其映射回离散词元。连续空间中的微小误差也可能对应完全不同的词元，因此需要谨慎地取整和截断。

![文本扩散过程](../images/text_diffusion.svg)


- 文本扩散通过反复细化并行生成所有词元，而不是从左到右逐个生成。这种方式有利于保持全局连贯，也便于补全文本中间的缺失部分。不过，目前文本扩散模型生成长篇文本的质量仍不如自回归模型。

- **光学字符识别（OCR）**从图像中提取文字。OCR 传统上不归入语言生成，但现代 OCR 系统与 NLP 紧密结合，也越来越多地使用语言模型组件。

- **场景文本检测**在自然图像中定位文字区域，例如街道标志、产品标签和车牌。图像中的文字可能角度、大小和字体各异，背景也常杂乱，因此检测并不容易。常见方法使用 CNN 或 Transformer 主干网络，为文字区域生成边界框或分割掩码。

- **CRNN**（卷积循环神经网络；Shi 等，2017）是经典的文字识别架构。CNN 从文字图像中提取视觉特征，再将特征图按水平位置切成一列序列。双向 LSTM 对该序列建模上下文，最后用**CTC**（连接主义时间分类）解码。CTC 能在无需显式分割的情况下对齐输入列与输出字符。

- CTC 要处理的问题是：模型会针对每个输入列生成一个输出分布，共 $T$ 个；而目标文本包含 $L \leq T$ 个字符。

- 由于输入列与字符的对应关系未知，CTC 引入空白符号 $\epsilon$，并定义多对一映射 $\mathcal{B}$：合并连续重复字符，再删除空白符号。例如，$\mathcal{B}(\text{"HH-ee-ll-ll-oo"}) = \text{"Hello"}$，其中连字符表示空白符号。

- 目标序列 $y$ 的概率等于所有能映射为 $y$ 的输入对齐路径的概率之和：

$$P(y \mid x) = \sum_{\pi \in \mathcal{B}^{-1}(y)} \prod_{t=1}^{T} P(\pi_t \mid x)$$
- 其中，$\pi$ 是长度为 $T$ 的对齐路径，每个输入列对应一个标签，也包括空白符号。枚举所有路径需要指数时间；第 05 章 HMM 中的**前向算法**可用动态规划在 $O(T \cdot L)$ 时间内求出总和。

- 空白符号不可或缺：没有它，“Hello”中的连续字符“ll”会与单个“l”混淆。训练时最大化 $\log P(y \mid x)$；推理时则在 CTC 输出上使用束搜索或贪心解码寻找最佳路径。

- **文档 OCR**处理发票、表格和科学论文等结构化文档时，除了识别字符，还要理解页面布局。LayoutLM 等现代系统结合文字识别和空间位置信息：每个词元既有文本嵌入，也有编码页面 $(x,y)$ 坐标的位置嵌入。因此，模型可以判断出现在“Total:”下方的数字表示总金额。

![CRNN OCR管道](../images/crnn_ocr_pipeline.svg)


- **视觉语言 OCR**模型（如 TrOCR）把文字识别建模为图像到文本的生成任务：视觉 Transformer 编码器处理图像，语言模型解码器逐字符生成文字。借助预训练的视觉和语言模型，它能处理不同文字系统、字体和版式，无需手工设计特征。

- **可控生成**旨在引导语言模型按指定属性生成内容，例如采用某种风格或主题、表达特定情感、符合安全要求或保持事实准确。模型既要遵循指令，也要保持流畅连贯。

- **无分类器引导（CFG）**将图像生成中的一种方法改用于文本。训练时，模型有时会随机丢弃条件信号（如提示词），从而同时学习有条件和无条件生成。推理时，对两种情况下的输出 logits 作线性组合：

$$\text{logits}_{\text{guided}} = (1 + w) \cdot \text{logits}_{\text{conditional}} - w \cdot \text{logits}_{\text{unconditional}}$$
- 其中，$w > 0$ 用于增强条件信号的影响。$w$ 越大，输出越贴合提示词，但多样性也越低。

- **RLHF**（基于人类反馈的强化学习；Ouyang 等，2022）是让语言模型符合人类偏好的主要方法，分为三个阶段：

- 首先进行**监督微调（SFT）**：用一组针对提示词撰写的高质量人工回答微调基础语言模型。

- 第二步是**训练奖励模型**：收集人工偏好比较，例如给出提示词 $x$ 和回答 $y_1, y_2$，请标注者选出更好的回答；再训练奖励模型 $r_\phi(x, y)$ 来预测人类偏好。其训练目标采用成对排序损失：

$$\mathcal{L}_{\text{RM}} = -\log \sigma(r_\phi(x, y_w) - r_\phi(x, y_l))$$
- 其中，$y_w$ 是偏好的回答，$y_l$ 是不偏好的回答。

- 第三步是**强化学习微调**：优化语言模型以提高奖励，同时限制它与 SFT 模型之间的差异，避免模式坍塌。该步骤使用带 KL 惩罚的 PPO（近端策略优化；第 06 章）：

$$\mathcal{L}_{\text{RL}} = -\mathbb{E}\left[r_\phi(x, y) - \beta \, D_{\text{KL}}(\pi_\theta \| \pi_{\text{SFT}})\right]$$
- KL 项限制模型偏离 SFT 模型的幅度，减少模型钻奖励模型漏洞（即“奖励投机”）的情况。

![RLHF管道](../images/rlhf_pipeline.svg)


- **DPO**（直接偏好优化；Rafailov 等，2023）通过移除奖励模型来简化 RLHF。其关键推导是：上面的 KL 约束强化学习目标存在闭式最优策略：

$$\pi^\ast(y \mid x) = \frac{1}{Z(x)} \pi_{\text{ref}}(y \mid x) \exp\!\left(\frac{r(x, y)}{\beta}\right)$$
- 其中，$Z(x)$ 是归一化配分函数。将上式改写为奖励，可得 $r(x, y) = \beta \log \frac{\pi^\ast(y \mid x)}{\pi_{\text{ref}}(y \mid x)} + \beta \log Z(x)$。再把这个隐式奖励代入 Bradley–Terry 偏好模型 $P(y_w \succ y_l) = \sigma(r(x, y_w) - r(x, y_l))$，两项难以直接计算的 $Z(x)$ 会相互抵消，由此得到 DPO 损失：

$$\mathcal{L}_{\text{DPO}} = -\log \sigma\!\left(\beta \log \frac{\pi_\theta(y_w \mid x)}{\pi_{\text{ref}}(y_w \mid x)} - \beta \log \frac{\pi_\theta(y_l \mid x)}{\pi_{\text{ref}}(y_l \mid x)}\right)$$
- 在上述设定下，DPO 与 RLHF 的目标在数学上等价，但它把奖励模型训练和强化学习合并为一个监督学习步骤。

- sigmoid 内的表达式可以理解为：相对于参考模型，提高偏好回答的概率，并降低非偏好回答的概率。

- 参数 $\beta$ 控制策略偏离参考模型的程度。DPO 的实现较简单：只需计算当前策略和参考模型对偏好回答与非偏好回答的对数概率，也能避开 PPO 训练中的部分不稳定性。

- **Constitutional AI**（Bai 等，2022）将部分对齐工作自动化。模型依据一套原则（“宪法”）评判并修改自己的回答，例如遵循“选择危害较小的回答”这一原则。随后，研究者用模型生成的偏好比较训练模型，这种方法称为 RLAIF（基于 AI 反馈的强化学习）。

- **长上下文方法**旨在降低标准自注意力 $O(n^2)$ 的内存和计算开销，因为这类开销会限制序列长度。当词元数增至数万甚至数十万时，标准注意力便难以承担。

- **稀疏注意力**用稀疏模式替代密集的 $n \times n$ 注意力矩阵，使每个词元只关注其他词元中的一部分。常见模式包括**局部注意力**（关注固定窗口内的邻近词元）、**步幅注意力**（每隔 $k$ 个词元关注一次）和**随机注意力**（关注随机选出的词元）。BigBird 和 Longformer 等模型组合这些模式，将计算复杂度降至 $O(n)$ 或 $O(n\sqrt{n})$，同时保留捕捉局部和全局依赖的能力。

![稀疏注意力模式](../images/sparse_attention_patterns.svg)


- **滑动窗口注意力**将每个词元的注意范围限制在前方 $w$ 个词元内，因此复杂度为 $O(nw)$，而非 $O(n^2)$。远距离信息需要通过相邻层间重叠的窗口逐步传递。若模型有 $L$ 层、窗口宽度为 $w$，有效感受野为 $L \times w$ 个词元。

- **环形注意力**将长序列分配到多个设备，并按环形拓扑连接设备。每个设备保存一段序列，为这段序列计算注意力时，同时把键值块发送给环上的下一台设备。计算与通信可以重叠，因此序列长度受所有设备的总内存限制，而不只受单台设备内存限制。

- **记忆增强模型**在 Transformer 外接记忆库，以扩展上下文。模型可以在每层通过注意力读写记忆。Memorizing Transformer 会缓存先前文本块的键值对，并在处理后续文本块时关注这些缓存，从而把上下文扩展到训练窗口之外。为提高效率，它会在缓存键上使用近似 $k$ 近邻搜索。

- 以上方法从架构上扩展上下文。模型还必须经过合适的训练，才能有效利用更长的上下文。

- **逐步扩展上下文**是常见做法。从一开始就训练很长的序列代价高昂，因为注意力开销为 $O(n^2)$。模型通常先在较短的上下文长度（4K–8K 个词元）上预训练，再通过分阶段继续预训练扩展到目标长度。

- Llama 3.1 通过逐步增加序列长度，用超过 8000 亿个词元把上下文长度从 8K 扩展到 128K。DeepSeek-V3 则先在 4K 长度上训练，再依次扩展到 32K 和 128K。

- 与完整预训练预算相比，每个阶段使用的词元较少，因为模型只需学习如何利用更远的位置，无需重新学习语言本身。

- 扩展上下文时，需要调整位置编码。**RoPE 插值**缩小位置索引，使模型在更长的序列中仍遇到训练时见过的旋转角度。例如，若模型在长度 $L$ 上训练，要扩展到 $L'=4L$，就把所有位置索引除以 4。

- 这样，模型不会遇到训练时未见过的旋转角度，但相邻位置之间的有效分辨率会降低。

- **RoPE 外推**保留原始位置索引，并将 RoPE 应用于超过训练长度 $L$ 的位置，依赖模型泛化到未见过的旋转角度。

- 插值通常更稳定；若不调整基频（ABF），外推效果会迅速下降。

- **YaRN**（Yet another RoPE extension）针对不同 RoPE 维度采用不同处理方式，改进了朴素插值。

- 高频维度对应较小的 $i$，按 $\theta_i = \theta_{\text{base}}^{-2i/d}$ 计算时，在训练长度内会旋转多次，因此较适合外推。

- 低频维度对应较大的 $i$，旋转较慢，对长度扩展也更敏感。

- YaRN 只对低频维度插值，对高频维度外推，并通过温度缩放 $t$ 补偿注意力 logits 的分布变化：

$$\text{score}'_{ij} = \frac{q_i^T k_j}{t \sqrt{d_k}}$$
- 其中，$t>1$ 会使注意力分布变平，避免位置信号压缩后模型过度关注邻近词元。

- **长上下文数据整理**是一个关键却常被低估的挑战。多数预训练语料由新闻、网页和社交媒体帖子等短文档组成。

- 长上下文训练需要能真正用满上下文窗口的数据，例如书籍、代码仓库、长篇科学文章、多轮对话记录，以及按主题串接的相关文档。

- 如果训练数据只是用填充或打包的短文档填满上下文窗口，模型可能学会忽略远处的词元，因为这些词元彼此无关。

- **序列打包**通过把多个文档拼接成一个训练序列来减少填充浪费，并使用注意力掩码阻止模型跨文档关注。

- 长上下文训练中的打包策略也很重要：把大量无关短文档拼在一起，可能让模型把远处的词元当成噪声；拼接较少但确实较长的文档，则能训练模型利用整个上下文。

- 一种已知的失效模式是“中间丢失”现象（Liu 等，2023）：语言模型通常能有效利用上下文开头和结尾的信息，却难以处理放在中间的信息。

- 这类似于人类记忆中的序列位置效应，包括首因效应和近因效应。

- 这种现象部分源于训练数据分布：重要信息常出现在文档开头或结尾；注意力模式也可能使模型偏向附近和开头的词元。

- 在长文本训练中改变关键信息的位置分布，可以缓解这一问题，但无法彻底解决。

- **大海捞针评估**检查模型能否从很长的干扰文本（“干草堆”）中找出指定事实（“针”），不论事实出现在什么位置。

- 真正具备长上下文能力的模型，应能近乎准确地找出放在任意位置的“针”。

- 这项测试能清楚显示“中间丢失”现象，也常用于评估上下文扩展方法。

- **长上下文微调**在预训练后使用有针对性的 SFT 数据，例如多轮对话、证据散布在数千个词元中的文档问答、长篇摘要和代码仓库级理解任务。

- Qwen3 在这一阶段使用**双块注意力**（Dual Chunk Attention，DCA）：长序列被分成块对，块内采用完整注意力，块间则使用更高效的注意力，因此微调时的有效序列容量提高到原来的 4 倍。

- **状态空间模型**（SSM）为长序列建模提供了另一种思路：它不改造注意力，而是用受连续时间控制理论启发的线性动力系统取代注意力机制。

- SSM 通过潜在状态 $x(t) \in \mathbb{R}^N$，将输入序列 $u(t)$ 映射为输出 $y(t)$：

$$x'(t) = Ax(t) + Bu(t), \quad y(t) = Cx(t) + Du(t)$$
- 其中，$A \in \mathbb{R}^{N \times N}$ 是状态转移矩阵，$B \in \mathbb{R}^{N \times 1}$ 是输入投影，$C \in \mathbb{R}^{1 \times N}$ 是输出投影，$D$ 表示跳跃连接。

- 将 SSM 用于离散词元序列时，需要用步长 $\Delta$ 对连续系统离散化。零阶保持离散化得到：

$$\bar{A} = \exp(\Delta A), \quad \bar{B} = (\Delta A)^{-1}(\exp(\Delta A) - I) \cdot \Delta B$$
- 离散递推关系变为 $x_k = \bar{A} x_{k-1} + \bar{B} u_k$、$y_k = C x_k + D u_k$。它与 RNN 类似，逐个处理词元并维护隐藏状态。

- 与普通 RNN 不同，这种递推也可展开为**全局卷积**。由于系统是线性的，输出为 $y = \bar{K} \ast u$，卷积核 $\bar{K} = (C\bar{B}, \, C\bar{A}\bar{B}, \, C\bar{A}^2\bar{B}, \ldots)$ 只取决于固定参数。

- SSM 的核心特点是具有两种等价计算形式：递推适合自回归推理，每一步的计算量为 $O(1)$；卷积适合并行训练，通过 FFT 可在 $O(n \log n)$ 时间内计算。

![SSM双视图：推理时递归，训练时卷积，Mamba的选择性扩展](../images/ssm_dual_view.svg)


- **S4**（用于序列建模的结构化状态空间；Gu 等，2022）解决了关键数值问题，使 SSM 更实用。矩阵 $A$ 必须捕捉长距离依赖；若直接对它参数化，系统动态可能消失或爆炸，与普通 RNN 遇到的问题类似。

- S4 用 **HiPPO**（高阶多项式投影算子）矩阵初始化 $A$。该矩阵由连续信号的最优多项式逼近理论推导而来，其特定结构能保证状态以平缓衰减的方式压缩表示完整输入历史：

```math
A_{nk} = -\begin{cases} (2n+1)^{1/2}(2k+1)^{1/2} & \text{if } n > k \\ n+1 & \text{if } n = k \\ 0 & \text{if } n < k \end{cases}
```

- 这种下三角结构使状态能够用 Legendre 多项式在线近似输入信号。计算长卷积核时，求取 $\bar{A}^k$ 的开销很大；S4 利用 HiPPO 矩阵可分解为低秩项与对角项之和这一性质，将卷积核的计算降至 $O(n \log n)$。

- **Mamba**（Gu 和 Dao，2023）引入了选择性状态空间这一关键创新，使 SSM 参数依赖输入。S4 中的 $A$、$B$、$C$ 和步长 $\Delta$ 都是固定的，因此每个词元都遵循相同的动态。Mamba 则把 $B$、$C$ 和 $\Delta$ 定义为输入的函数：

$$B_k = \text{Linear}(u_k), \quad C_k = \text{Linear}(u_k), \quad \Delta_k = \text{softplus}(\text{Linear}(u_k))$$
- 这种选择性让模型能在每个位置决定哪些信息写入状态、哪些信息忽略。它类似于注意力选择相关词元，但不需要二次计算。步长 $\Delta_k$ 起到“门控”作用：较大的 $\Delta$ 使状态更充分地整合当前输入（连续系统向前演化较大一步，效果近似重置状态）；较小的 $\Delta$ 则保留已有状态，减少当前输入的影响。

- 代价是输入依赖参数破坏了卷积视角：卷积核不再固定，因此 Mamba 无法使用基于 FFT 的训练方法。Mamba 改用**硬件感知并行扫描算法**，利用递推运算的结合性：可以把状态更新 $(x_k, u_k) \mapsto x_{k+1}$ 表示为一系列可结合操作，再通过前缀扫描并行计算，类似硬件设计中的并行前缀加法。该算法在 GPU 上的时间复杂度为 $O(n)$，并行深度为 $O(\log n)$，效率接近卷积。

- Mamba 的推理计算量可做到每个词元 $O(1)$：只需更新固定大小的状态，也不需要随上下文增长的 KV 缓存。因此，长序列下它的内存效率高于 Transformer。状态维度 $N$（通常为 16）远小于 Transformer 的 KV 缓存，后者要保存 $O(n \cdot d)$ 个值。实践中，Mamba 在语言建模基准上的质量可与相同参数量的 Transformer 持平或更好，处理长序列时推理也更快。

- **混合架构**将 SSM 层与注意力层结合起来：多数层使用 SSM 高效传播长距离信息，少数层则用注意力精确检索与内容相关的信息。Jamba 和 Zamba 等模型交替堆叠 Mamba 与 Transformer 块，在保持大部分推理效率优势的同时，质量优于纯 SSM。两种机制各有所长：SSM 擅长平滑地传播远距离状态，注意力擅长按内容精确查找。

- **检索增强生成**（RAG）让语言模型在推理时访问外部知识库，以弥补模型知识的局限。模型检索相关文档，并根据文档内容生成回答，而非只依赖训练时存入参数的知识。

- 经典的**检索器—阅读器架构**包含两个组件。检索器接收查询，从语料库中找出最相关的前 $k$ 个段落；阅读器（语言模型）根据查询和检索到的段落生成答案。检索器既可采用 BM25 等稀疏方法（BM25 扩展了第 02 篇的 TF-IDF），也可采用密集检索方法。

- **密集段落检索**（DPR）使用双编码器架构：一个编码器将问题映射为向量，另一个将段落映射为向量，两者通常都基于 BERT。建立索引时，系统会编码并存储所有段落；收到查询时，再编码问题，并用 FAISS 等近似最近邻搜索找出最相近的段落。相似度用问题向量与段落向量的点积计算。

- **分块策略**会显著影响检索质量。段落既要足够短，让检索器能够处理，也要足够完整，保留一个完整观点。固定长度分块（如 256 个词元、重叠 50 个词元）实现简单，但可能切断句子。语义分块按段落或章节边界切分；层次分块则建立不同粒度摘要组成的树。

![RAG架构](../images/rag_architecture.svg)


- RAG 有几项优势：更新知识库无需重新训练模型；模型可以引用来源；回答也能以检索文本为依据，减少幻觉。主要挑战是检索质量和延迟：如果检索到无关段落，模型可能会自信地给出错误答案；检索本身也会增加推理步骤。

- **推测解码**用小型、快速的**草稿模型**并行提出多个候选词元，再由大型**目标模型**在一次前向传播中验证，以加速自回归生成。

- 算法分为几步。首先，草稿模型自回归地生成 $k$ 个候选词元；由于模型较小，这一步很快。

- 接着，目标模型在一次前向传播中并行计算这 $k$ 个候选词元的概率，利用批量计算提高效率。

- 对于从草稿分布 $p_d(t)$ 抽到的候选词元 $t$，以 $\min(1, \, p_{\text{target}}(t) / p_d(t))$ 的概率接受。若拒绝，则从归一化后的**修正分布** $p_{\text{adj}}(t) = \max(0, \, p_{\text{target}}(t) - p_d(t))$ 重新采样一个词元。

- 这个接受拒绝方案确保了输出分布与目标模型完全一致。

- 原因如下：输出词元 $t$ 的概率来自直接接受，或拒绝候选词元后重新采样。直接接受 $t$ 的概率为 $p_d(t) \cdot \min(1, p_{\text{target}}(t)/p_d(t))$。

- 若 $p_{\text{target}}(t) \leq p_d(t)$，直接接受的概率就是 $p_{\text{target}}(t)$。若 $p_{\text{target}}(t) > p_d(t)$，直接接受的概率为 $p_d(t)$；计入拒绝概率后，重新采样会补上差额 $p_{\text{target}}(t)-p_d(t)$。

- 两种情况下，最终输出 $t$ 的总概率都等于 $p_{\text{target}}(t)$。因此，草稿模型只影响速度，不改变目标模型的输出分布。

![推测解码](../images/speculative_decoding.svg)


- 加速效果取决于接受率。草稿模型越接近目标模型，接受的词元越多，端到端耗时也越接近只运行草稿模型的耗时。典型加速比为 2–3 倍，输出质量不变。

- **Medusa**（Cai 等，2024）不使用独立的草稿模型，而是在目标模型中添加多个轻量预测头。每个头并行预测不同未来位置的词元（提前 $k=1,2,3,\ldots$ 步）。Medusa 以树形结构提出多个候选续写，再通过目标模型注意力层的一次前向计算验证哪些候选成立，因此无需另设草稿模型。

- 更广义的**并行生成**方法都试图打破自回归解码的顺序瓶颈。Jacobi 解码先为所有位置生成初始猜测，再并行迭代修正，把生成过程视为固定点迭代。非自回归模型（NAT）在一次前向传播中同时生成所有词元，但质量通常较低；研究者会用迭代细化、CTC 损失或从自回归教师模型蒸馏知识等方法缩小差距。

- 模型对齐、长上下文、检索、高效解码和状态空间模型等技术，都会用于现代生产级大语言模型。

- 本文后续将介绍前沿模型中的架构创新，展示第 01–04 篇的理论与上述方法如何在实践中结合。

- **分组查询注意力**（Grouped Query Attention，GQA）是目前最常用的注意力效率优化方法。标准多头注意力（MHA）为每个注意力头分别计算键和值投影，因此每个词元的键和值缓存各需 $n_{\text{heads}} \times d_{\text{head}}$ 个数值。GQA 让多个查询头共享一个键值头。

- 例如，Llama 3、Qwen 和 Gemma 常用 64 个查询头、8 个 KV 头。每个 KV 头供 8 个查询头共享，因此 KV 缓存比 MHA 减少 8 倍。

- GQA 的输出质量与 MHA 几乎相同：不同查询头仍可关注不同模式，只是共用同一键值子空间。多查询注意力（MQA）是更极端的情形，所有查询头共用一个 KV 头；GQA 在质量和效率之间取得了更好的平衡。

- **多头潜在注意力**（Multi-head Latent Attention，MLA）由 DeepSeek-V2 引入，可进一步压缩 KV 缓存。与 GQA 仍缓存完整键值投影不同，MLA 将隐藏状态降维为低秩的**潜在向量** $c_t \in \mathbb{R}^{d_c}$，其中 $d_c \ll n_{\text{heads}} \times d_{\text{head}}$：

$$c_t = W_{\text{down}} \, h_t$$
- 系统只缓存这个压缩向量。计算注意力时，再通过上投影还原完整的键和值：$k_t = W_{\text{up}}^K c_t$、$v_t = W_{\text{up}}^V c_t$。DeepSeek-V3 总参数量为 6710 亿，激活参数量为 370 亿；它的压缩维度 $d_c=512$，而完整 MHA 需要 $128 \times 128=16{,}384$ 维。**编者注：**按这些维度计算，KV 缓存减少约 96.9%，原文所写的 93% 与数值不符。

- 还有一个实现细节：标准 RoPE 依赖位置信息，与共享压缩不兼容，因此 MLA 使用**解耦 RoPE**。查询和键中各有一条较小的独立分支（每个头 64 维）用 RoPE 编码位置，其余表示则通过压缩潜在向量传递。

![注意力KV缓存策略：MHA、GQA和MLA比较](../images/mla_vs_gqa.svg)


- **大规模位置编码**已明显不同于最初的正弦位置编码方案。当前前沿模型都使用 RoPE（第 04 篇），但会针对长上下文作重要调整。原始 RoPE 公式 $\theta_i = \theta_{\text{base}}^{-2i/d}$ 中的基频 $\theta_{\text{base}}$ 通常为 10,000，这会限制模型外推到训练长度之外。

- **调整基频**（Adjusted Base Frequency，ABF）把 $\theta_{\text{base}}$ 提高到 500,000（Llama 3）或 1,000,000（Qwen3、Gemma 3），以延长旋转周期。这样，模型在训练中经历的完整旋转次数更少，也能外推到更长序列。

- YaRN（Yet another RoPE extension）按频率调整 RoPE：对低频维度作插值，对高频维度作外推，并用温度因子调整注意力分布。DeepSeek-V3、Qwen 和 Kimi K2 都以 YaRN 将预训练时的 4K–8K 上下文扩展到 128K。

- **iRoPE**（交错 RoPE）由 Llama 4 引入，采用了更激进的方案：每四个注意力层中有一个不使用位置编码（NoPE），其余层则使用标准 RoPE 和分块注意力。

- NoPE 层可以在没有位置偏置的情况下关注所有位置，RoPE 层则提供局部顺序信息。配合推理时的温度缩放，Llama 4 Scout 的上下文窗口可扩展到 1000 万词元，比纯 RoPE 方法长多个数量级。

- **大规模混合专家架构**已成为前沿模型的主流设计。第 04 篇介绍过 MoE 的基本原理；扩展到大规模时，关键设计包括专家数量、路由稀疏度和负载均衡。

- 不同模型采用的路由稀疏度差别很大：DeepSeek-V3 有 256 个专家，每个词元采用 top-8 路由（32 倍稀疏）；Qwen3 有 128 个专家、采用 top-8 路由（16 倍稀疏）；Mixtral 有 8 个专家、采用 top-2 路由（4 倍稀疏）；Llama 4 Maverick 有 128 个专家，采用 top-1 路由并另设一个共享专家（128 倍稀疏）。

- 在活跃计算量相同的情况下，稀疏度越高，总参数量就越大；同时也需要更精细的负载均衡和通信基础设施。

- DeepSeek-V3 的**无辅助损失负载均衡**取代了传统的负载均衡损失（见第 04 篇），因为后者被发现会降低模型质量。每个训练步骤都会动态调整各专家的偏置：过载专家的偏置降低，使其接收更少词元；负载不足的专家则提高偏置。这样可以平衡路由，而不让辅助损失干扰主要训练信号。

- 多数 MoE 架构都包含**共享专家**：一个或多个专家 FFN 会处理每个词元，不受路由结果影响。共享专家负责语法、功能词等常见模式，让路由专家专注于特定模式。Llama 4 每个词元使用 1 个共享专家和 1 个路由专家；DeepSeek-V3 使用 1 个共享专家和 8 个路由专家。

- **交替堆叠稠密层与 MoE 层**是另一种设计方式。Gemma 2 和 Gemma 3 交替使用局部注意力层与全局注意力层；Gemma 3 的比例为 5:1。局部层使用 1,024 词元的滑动窗口，只有全局层缓存完整的 128K 上下文。

- Llama 4 Maverick 将稠密 FFN 层与 MoE 层交错堆叠；Kimi K2 则在专家层之间插入一个稠密层，形成混合稀疏结构。这种异构设计让不同层承担不同功能。

- DeepSeek-V3 使用**多词元预测**（MTP），训练模型预测下一个词元以及再后一个词元。每个位置的辅助预测模块与主模型共享嵌入，并额外预测一个未来词元。MTP 损失相对于主语言模型的下一词元预测损失，权重为 0.1–0.3。MTP 头既能改善训练期间的表示，也能在推理时充当草稿头，加快解码。

- **知识蒸馏**让大型“教师”模型的输出指导较小“学生”模型的训练。Gemma 2 和 Gemma 3 广泛使用蒸馏：2B、4B 等小模型以教师的概率分布为软目标，在相当于计算最优数据量 50 倍的数据上训练。原文据此解释 Gemma 3-4B 的质量为何能与 Gemma 2-27B 相当。

- 蒸馏损失可以取代或补充标准交叉熵。训练时，学生模型最小化自身输出分布与教师模型输出分布之间的 KL 散度：

$$\mathcal{L}_{\text{distill}} = D_{\text{KL}}(p_{\text{teacher}}(\cdot \mid x) \| p_{\text{student}}(\cdot \mid x))$$
- DeepSeek-R1 使用 80 万条筛选过的思维链样本，将 6710 亿参数的推理模型蒸馏到最小 15 亿参数的稠密模型中，得到推理能力远超其规模预期的小模型。

- **强化学习推理**是大语言模型能力的重要进展。DeepSeek-R1 展示了只在基础模型上进行强化学习、不先做监督微调，也能引出思维链推理、自我验证和纠错行为；当模型因正确的最终答案获得奖励时，这些行为会逐渐出现。

- DeepSeek-R1 使用**组相对策略优化**（GRPO），无需 PPO 所需的价值网络。对每个提示词，GRPO 生成一组 $G$ 个回答、计算各自的奖励，再在组内标准化优势：

$$A_i = \frac{r_i - \text{mean}(r_1, \ldots, r_G)}{\text{std}(r_1, \ldots, r_G)}$$
- 策略梯度使用组内相对优势，并采用类似 PPO 的裁剪目标。

- 去掉价值网络可将强化学习训练的内存和计算需求减半，使研究者能够用 RL 训练 6710 亿参数的模型。

- DeepSeek-R1 的一个关键设计是使用**基于规则的奖励**，例如将数学答案与标准答案核对、运行代码测试，而不使用神经奖励模型。原文指出，在这一规模下，神经奖励模型容易受到奖励投机的影响。

- Qwen3 的**混合思考模式**将推理与快速直接回答整合在同一个模型中。推理内容用 `<think>` 标签标出，用户可调节“思考预算”，在响应延迟和推理深度之间权衡。

- 这种能力来自同时使用带思考和不带思考的数据训练，并非切换不同的模型检查点。

- **大规模训练稳定化**需要采用标准方法之外的技术。Gemma 2 使用**logit 软上限**，将注意力分数映射为 $s \cdot \tanh(\text{logits} / s)$，其中软上限 $s$ 通常为 30–50，以避免分数无限增大。

- **QK-Norm**（Qwen3）在计算注意力分数前对查询和键向量应用 RMSNorm，从而无需 QKV 偏置。**QK-Clip**（Kimi K2 的 MuonClip 优化器）监控训练中的最大注意力 logit；超过阈值时，就重新缩放查询和键的权重矩阵。这使 1 万亿参数模型的预训练保持稳定，未出现不稳定事件。

- DeepSeek-V3 使用 **FP8 混合精度训练**：在前向和反向传播中的高计算量矩阵乘法采用 8 位浮点数，主权重则保留更高精度。

- 与 BF16/FP16 训练相比，这种做法几乎不损失质量，吞吐量约增至两倍。DeepSeek-V3 训练 6710 亿参数模型使用了 280 万个 H800 GPU 小时，远少于可比模型；FP8 和其他工程优化促成了这一效率。

## 编程任务（使用 CoLab 或 笔记本）

1. 从头实现一个简单的检索增强生成管道。使用 TF-IDF（第 02 篇）为一组文档建立索引，根据查询检索最相关的段落，并将其前置到提示词中。
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

2. 用简化的草稿模型和目标模型实现推测解码，并验证接受后的输出分布与目标模型相同。
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

3. 构建一个简单的 DPO 训练循环。给定一对偏好回答和非偏好回答，使用 DPO 损失更新一个小模型。
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
