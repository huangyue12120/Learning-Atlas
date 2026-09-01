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

*高级文本生成不止于普通的自回归解码，它还要改善质量、可控性和速度。本篇涵盖文本扩散模型（D3PM、MDLM）、OCR、用于对齐的 RLHF 与 DPO、长上下文方法（RoPE scaling、ring attention）、检索增强生成，以及用于加速推理的推测解码。*

- 标准自回归生成（第 04 篇）从左到右、一次生成一个 token。它简单有效，但天然是顺序过程，不能做全局规划，对输出的控制也有限。本篇介绍超越普通自回归解码的方法：文本扩散模型、光学字符识别、通过人类反馈实现可控生成、长上下文处理、检索增强生成，以及用于加速推理的推测解码。

- **文本扩散模型**把扩散框架（第 08 章介绍过图像扩散）应用到离散文本上。核心挑战在于文本是离散的：不能像给像素加噪那样给 token 加连续高斯噪声。针对这一点，人们提出了多种方法。

- **D3PM**（Discrete Denoising Diffusion Probabilistic Models，离散去噪扩散概率模型；Austin 等，2021）直接在离散 token 上定义前向破坏过程，使用转移矩阵。在每个前向步骤中，token 有一定概率被替换成另一个 token（均匀噪声）、被 mask（吸收态），或保持不变。反向过程学习去噪，从被破坏的 token 预测干净 token。第 $t$ 步的转移矩阵 $Q_t$ 控制破坏过程：

$$q(x_t \mid x_{t-1}) = \text{Cat}(x_t ; \, x_{t-1} Q_t)$$

- 其中 $\text{Cat}$ 表示分类分布，$x$ 是 one-hot 向量。多步前向过程 $q(x_t \mid x_0)$ 有闭式形式：$q(x_t \mid x_0) = \text{Cat}(x_t ; \, x_0 \bar{Q}_t)$，其中 $\bar{Q}_t = Q_1 Q_2 \cdots Q_t$ 是截至第 $t$ 步所有转移矩阵的乘积。训练最小化一个变分下界（ELBO），它在时间步之间分解，类似连续情形（第 08 章）：

$$\mathcal{L}_{\text{D3PM}} = D_{\text{KL}}(q(x_T \mid x_0) \| p(x_T)) + \sum_{t=2}^{T} D_{\text{KL}}(q(x_{t-1} \mid x_t, x_0) \| p_\theta(x_{t-1} \mid x_t)) - \log p_\theta(x_0 \mid x_1)$$

- 第一项保证完全破坏后的分布与先验（均匀分布或全 mask）一致。KL 项之和训练模型反转每一步破坏：真实反向后验 $q(x_{t-1} \mid x_t, x_0)$ 可以利用贝叶斯定理和已知转移矩阵以闭式计算，模型 $p_\theta(x_{t-1} \mid x_t)$ 则被训练去匹配它。

- 由于两个分布都是分类分布，KL 散度只是对词表条目求和。最后一项衡量从破坏最轻的状态重建的质量。

- **MDLM**（Masked Diffusion Language Models，掩码扩散语言模型；Sahoo 等，2024）把 D3PM 简化为只使用 mask 这一种破坏操作：前向过程逐渐把 token 替换为 `[MASK]` token，反向过程预测原始 token。这让文本扩散与 masked language modelling（BERT，第 04 篇）联系起来，其中扩散时间步控制 token 被 mask 的比例。在 $t = 0$ 时文本完全干净，在 $t = T$ 时文本完全被 mask。

- **连续文本扩散**通过在连续 embedding 空间中工作，绕过离散问题。首先把 token 映射为 embedding 向量，在这个连续空间中加噪声，再让去噪模型（通常是 Transformer）学习反转这个过程。生成时，模型产生连续向量，再通过寻找最近 embedding 将它们映射回离散 token。挑战是连续空间中的小误差可能映射成完全错误的 token，因此需要谨慎的舍入和截断。

![文本扩散过程](../images/text_diffusion.svg)

- 文本扩散的吸引力在于：它通过迭代细化同时生成所有 token，而不是从左到右逐个生成。这可以带来全局连贯性，也便于补全（在段落中间生成缺失文本）；但当前文本扩散模型在长文本生成质量上仍落后于自回归模型。

- **文本 OCR**（Optical Character Recognition，光学字符识别）是从图像中提取文字的任务。它虽然不一定被传统上归入语言生成，但现代 OCR 系统已与 NLP 深度整合，并越来越多地使用语言模型组件。

- **场景文字检测**在自然图像中定位文字区域（街道标志、产品标签、车牌）。这是一个难题，因为自然环境中的文字可能具有任意角度、尺度和字体，还可能位于杂乱背景上。检测方法通常使用 CNN 或 Transformer 主干，生成文字区域的边界框或分割 mask。

- **CRNN**（Convolutional Recurrent Neural Network，卷积循环神经网络；Shi 等，2017）是经典的文字识别架构。CNN 从文字图像提取视觉特征，特征图按列切成序列（每个水平位置一列），双向 LSTM 读取这个序列以建模上下文。输出使用 **CTC**（Connectionist Temporal Classification，连接主义时序分类）解码；CTC 能在不要求显式分割的情况下处理输入列与输出字符之间的对齐。

- CTC 要解决的根本问题是：模型产生 $T$ 个输出分布（每个输入列一个），但目标文本只有 $L \leq T$ 个字符。

- 我们不知道哪些列对应哪些字符。CTC 引入一个 **blank token** $\epsilon$，并定义多对一映射 $\mathcal{B}$，它会折叠重复字符并移除 blank：$\mathcal{B}(\text{"HH-ee-ll-ll-oo"}) = \text{"Hello"}$（其中 “-” 表示 blank）。

- 目标序列 $y$ 的概率，是所有折叠后等于 $y$ 的输入对齐路径之和：

$$P(y \mid x) = \sum_{\pi \in \mathcal{B}^{-1}(y)} \prod_{t=1}^{T} P(\pi_t \mid x)$$

- 其中 $\pi$ 是长度为 $T$ 的对齐路径（每列一个标签，包括 blank）。直接对所有路径求和是指数级的，但**前向算法**（第 05 章 HMM）使用动态规划，在 $O(T \cdot L)$ 时间内高效计算这个和。

- blank token 至关重要：没有它，“Hello”中的重复字符 “ll” 就无法与单个 “l” 区分。训练最大化 $\log P(y \mid x)$；推理时，在 CTC 输出上使用 beam search 或贪心解码寻找最佳路径。

- **文档 OCR**处理发票、表格、科学论文等结构化文档；除了识别字符，还必须理解布局。LayoutLM 等现代系统把文字识别与空间位置特征结合起来：每个 token 同时拥有文字 embedding 和编码其在页面上 $(x, y)$ 坐标的位置 embedding。这让模型能理解“Total:”下面出现的数字就是总金额。

![CRNN OCR 流程](../images/crnn_ocr_pipeline.svg)

- **视觉—语言 OCR**模型（如 TrOCR）把文字识别视为图像到文本的生成任务：Vision Transformer encoder 处理图像，语言模型 decoder 按字符生成文本。它借助预训练视觉模型和语言模型的能力，不依赖手工特征工程，因此能处理多种文字、字体和布局。

- **可控生成**的挑战是引导语言模型产生具有期望属性的输出：特定风格、主题、情感、安全程度或事实准确性。模型既要遵循指令，又要保持流畅和连贯。

- **Classifier-free guidance（CFG）**把图像生成中的技术适配到文本上。训练时随机丢弃条件信号（例如 prompt）一部分时间，让同一个模型同时学习有条件和无条件预测。推理时，对输出 logits 做插值：

$$\text{logits}_{\text{guided}} = (1 + w) \cdot \text{logits}_{\text{conditional}} - w \cdot \text{logits}_{\text{unconditional}}$$

- 其中 $w > 0$ 会放大条件的影响。$w$ 越大，输出越强烈地遵循 prompt，但多样性会降低。

- **RLHF**（Reinforcement Learning from Human Feedback，基于人类反馈的强化学习；Ouyang 等，2022）是让语言模型与人类偏好对齐的主流方法。流程有三个阶段：

- 第一，**监督微调（SFT）**：在高质量的人类编写 prompt—response 数据集上微调基础语言模型。

- 第二，**训练奖励模型**：收集人类比较数据（给定 prompt $x$ 和两个回答 $y_1,y_2$，哪个更好？），训练奖励模型 $r_\phi(x, y)$ 预测人类偏好。奖励模型使用成对排序损失训练：

$$\mathcal{L}_{\text{RM}} = -\log \sigma(r_\phi(x, y_w) - r_\phi(x, y_l))$$

- 其中 $y_w$ 是偏好的回答，$y_l$ 是不受偏好的回答。

- 第三，**强化学习微调**：优化语言模型以最大化奖励，同时保持接近 SFT 模型（防止模式坍塌）。这使用带 KL 惩罚的 PPO（Proximal Policy Optimisation，近端策略优化；第 06 章）：

$$\mathcal{L}_{\text{RL}} = -\mathbb{E}\left[r_\phi(x, y) - \beta \, D_{\text{KL}}(\pi_\theta \| \pi_{\text{SFT}})\right]$$

- KL 项防止模型偏离基础模型太远，也防止模型利用奖励模型的漏洞（“奖励投机”）。

![RLHF 流程](../images/rlhf_pipeline.svg)

- **DPO**（Direct Preference Optimisation，直接偏好优化；Rafailov 等，2023）完全去掉奖励模型，简化了 RLHF。关键数学洞见是：上面的 KL 约束强化学习目标有一个闭式最优策略：

$$\pi^\ast(y \mid x) = \frac{1}{Z(x)} \pi_{\text{ref}}(y \mid x) \exp\!\left(\frac{r(x, y)}{\beta}\right)$$

- 其中 $Z(x)$ 是归一化配分函数。对奖励式子重排，得到 $r(x, y) = \beta \log \frac{\pi^\ast(y \mid x)}{\pi_{\text{ref}}(y \mid x)} + \beta \log Z(x)$。将这个隐式奖励代入 Bradley-Terry 偏好模型 $P(y_w \succ y_l) = \sigma(r(x, y_w) - r(x, y_l))$ 后，难以计算的 $Z(x)$ 项会抵消，直接得到 DPO 损失：

$$\mathcal{L}_{\text{DPO}} = -\log \sigma\!\left(\beta \log \frac{\pi_\theta(y_w \mid x)}{\pi_{\text{ref}}(y_w \mid x)} - \beta \log \frac{\pi_\theta(y_l \mid x)}{\pi_{\text{ref}}(y_l \mid x)}\right)$$

- 这在数学上等价于 RLHF，但把奖励模型和强化学习训练压缩成一个监督学习步骤。

- sigmoid 内的表达式可以这样理解：“相对于参考模型，提高偏好回答的相对概率，降低不受偏好回答的相对概率。”

- $\beta$ 控制策略可以偏离参考模型的程度。在实践中，DPO 更容易实现（只需在当前模型和参考模型下计算两个 completion 的 log-probability），还可以避免 PPO 训练的不稳定性。

- **Constitutional AI**（宪法式 AI；Bai 等，2022）自动化对齐过程的一部分。它不收集人类比较，而是让语言模型按照一组原则（“宪法”）批评并修改自己的输出，例如“选择危害更小的回答”。AI 生成的比较数据随后用于偏好训练（RLAIF：来自 AI 反馈的强化学习）。

- **长上下文方法**要处理标准 self-attention 的 $O(n^2)$ 内存和计算成本，这种成本限制了序列长度。当 $n$ 增长到数万或数十万 token 时，标准 attention 会变得不可行。

- **稀疏 attention**把密集的 $n \times n$ attention 矩阵换成稀疏模式，让每个 token 只关注其他 token 的一个子集。常见模式包括**局部 attention**（每个 token 关注固定大小窗口内的邻居）、**步幅 attention**（每隔 $k$ 个 token 关注一次）和**随机 attention**（关注随机子集）。这些模式的组合（BigBird、Longformer 使用）可以达到 $O(n)$ 或 $O(n \sqrt{n})$ 复杂度，同时保留捕捉局部和全局依赖的能力。

![稀疏 attention 模式](../images/sparse_attention_patterns.svg)

- **滑动窗口 attention**限制每个 token 只关注前面的 $w$ 个 token（其局部窗口）。复杂度从 $O(n^2)$ 变为 $O(nw)$，但长距离信息必须通过多层之间重叠的窗口传播。使用 $L$ 层、窗口大小为 $w$ 时，有效感受野是 $L \times w$ 个 token。

- **Ring attention**把长序列分布到多台设备上，并将设备组织成环形拓扑。每台设备持有序列的一块，在计算自己片段的 attention 的同时，将 key-value block 发送给环中的下一台设备。计算与通信可以重叠，序列长度因此只受所有设备总内存限制，而不受单台设备内存限制。

- **记忆增强模型**给 Transformer 配备外部 memory bank，以扩展上下文。每层都可以使用 attention 从 memory 读取和写入。Memorizing Transformer 缓存前面 chunk 的 key-value，并在后续 chunk 中关注它们，以此把上下文扩展到训练窗口之外。为了保持效率，检索使用对缓存 key 的 $k$ 近邻近似。

- 上述方法是长上下文的**架构解决方案**。同样重要的是：模型是否被训练成能有效利用长上下文。

- **渐进式上下文扩展**是标准做法。从一开始就在超长序列上训练代价过高（attention 成本为 $O(n^2)$），所以模型先在短上下文长度（通常 4K–8K token）上预训练，再分阶段通过**持续预训练**扩展到目标长度。

- Llama 3.1 使用逐步增加序列长度的方式，在 800B token 上把上下文从 8K 扩展到 128K。DeepSeek-V3 先在 4K 上训练，再扩展到 32K，然后到 128K。

- 相对于完整预训练预算，每个阶段使用的 token 数量并不多，因为模型只需要学习如何使用更长的位置，不需要重新学习语言本身。

- 扩展时必须调整位置编码。**RoPE 插值**缩小位置索引，使模型看到训练时见过的相同旋转角度，只是这些角度被铺到更长序列上。如果模型以长度 $L$ 训练，而希望扩展到 $L' = 4L$，就把所有位置索引除以 4。

- 这样模型不会看到从未遇到的旋转角度，但相邻位置之间的有效分辨率会下降。

- **RoPE 外推**保持原始位置索引不变，直接对 $L$ 之后的位置应用 RoPE，依赖模型泛化到未见过的角度。

- 插值更稳定；没有基频调整（ABF）时，外推的性能会迅速下降。

- **YaRN**（Yet another RoPE extensioN）发现不同 RoPE 维度不应一视同仁，因此改进了朴素插值。

- 高频维度（$\theta_i = \theta_{\text{base}}^{-2i/d}$ 中较小的 $i$）在训练长度内旋转很多次，通常能较好地外推。

- 低频维度（较大的 $i$）旋转缓慢，对长度扩展更敏感。

- YaRN 只对低频维度插值，对高频维度外推，并对 attention logits 应用温度缩放 $t$，以补偿分布偏移：

$$\text{score}'_{ij} = \frac{q_i^T k_j}{t \sqrt{d_k}}$$

- 其中 $t > 1$ 会使 attention 分布变平，防止位置号被压缩后模型过于尖锐地关注附近 token。

- **长上下文数据策划**是关键、却常被低估的挑战。大部分预训练语料由短文档构成（新闻、网页、社交媒体帖子）。

- 长上下文训练需要真正使用完整上下文窗口的数据混合：书籍、代码仓库、长篇科学论文、多轮对话日志，以及主题相关文档的串联。

- 如果模型只在被填充或打包到上下文窗口的短文档上训练，它会学会忽略远处 token，因为这些 token 从未真正相关。

- **序列打包**是一种训练效率技术：将多个文档拼接成一个训练序列，并用 attention mask 阻止文档间 attention，从而避免 padding 浪费。

- 对长上下文训练来说，打包策略很重要：把许多互不相关的短文档打包，会教模型把远处 token 当成噪声；少量真正很长的文档则会教它使用完整上下文。

- 一个已知的失败模式是 **“lost in the middle（中间丢失）”**现象（Liu 等，2023）：语言模型通常能有效使用上下文窗口开头和结尾的信息，却难以使用位于中间的信息。

- 这类似于人类记忆中的系列位置效应（首因效应与近因效应）。

- 它部分源于训练数据分布（重要信息经常位于文档开头或结尾），部分源于 attention 模式（注意力集中在相邻 token 和初始 token 上）。

- 通过让关键信息出现在多种位置上进行长上下文训练，可以缓解这一问题，但不能完全解决。

- **大海捞针（needle-in-a-haystack）**评估会把一个具体事实（“针”）放在很长的干扰上下文（“草堆”）的不同位置，测试模型能否检索它。

- 真正具备长上下文能力的模型，无论针位于何处都应接近完美地检索出来。

- 这个测试能清晰揭示中间丢失效应，也用于评估上下文扩展方法。

- **长上下文微调**在预训练后使用定向 SFT 数据：长多轮对话、证据散落在数千 token 中的文档问答、长文本摘要，以及仓库级代码理解。

- Qwen3 在这一阶段使用 **Dual Chunk Attention（DCA，双 chunk attention）**：把长序列作为成对 chunk 处理，chunk 内使用完整 attention，chunk 间使用高效 attention，在微调时实现 4 倍有效序列容量。

- **状态空间模型（SSM）**为长序列建模提供了根本不同的方法。它不修改 attention，而是用受连续时间控制理论启发的线性动力系统完全替代 attention。

- SSM 通过潜在状态 $x(t) \in \mathbb{R}^N$，把输入序列 $u(t)$ 映射为输出 $y(t)$：

$$x'(t) = Ax(t) + Bu(t), \quad y(t) = Cx(t) + Du(t)$$

- 其中 $A \in \mathbb{R}^{N \times N}$ 是状态转移矩阵，$B \in \mathbb{R}^{N \times 1}$ 是输入投影，$C \in \mathbb{R}^{1 \times N}$ 是输出投影，$D$ 是 skip connection。

- 要将它应用到离散序列（token），需要用步长 $\Delta$ 对连续系统进行**离散化**。零阶保持离散化给出：

$$\bar{A} = \exp(\Delta A), \quad \bar{B} = (\Delta A)^{-1}(\exp(\Delta A) - I) \cdot \Delta B$$

- 离散递推为 $x_k = \bar{A} x_{k-1} + \bar{B} u_k$、$y_k = C x_k + D u_k$，看起来像 RNN：一次处理一个 token，并维护隐藏状态。

- 不同于 RNN，这个递推也可以展开为**全局卷积**：因为系统是线性的，输出为 $y = \bar{K} \ast u$，其中卷积核 $\bar{K} = (C\bar{B}, \, C\bar{A}\bar{B}, \, C\bar{A}^2\bar{B}, \ldots)$ 只依赖固定参数。

- 这个**双重视角**——递推用于高效自回归推理（每步 $O(1)$），卷积用于高效并行训练（通过 FFT 为 $O(n \log n)$）——是 SSM 的核心洞见。

![SSM 双重视角：用于推理的递推、用于训练的卷积，以及 Mamba 的选择性扩展](../images/ssm_dual_view.svg)

- **S4**（Structured State Spaces for Sequence Modeling，结构化序列状态空间；Gu 等，2022）解决了关键数值问题，使 SSM 变得实用：状态矩阵 $A$ 必须捕捉长距离依赖，但直接参数化会导致动态过程消失或爆炸（与普通 RNN 的问题相同）。

- S4 使用 **HiPPO**（High-order Polynomial Projection Operators，高阶多项式投影算子）矩阵初始化 $A$。这个矩阵来自连续信号最优多项式逼近理论，并具有一种特定结构，可以证明这种结构使状态能以平滑衰减的方式维护整个输入历史的压缩表示：

```math
A_{nk} = -\begin{cases} (2n+1)^{1/2}(2k+1)^{1/2} & \text{if } n > k \\ n+1 & \text{if } n = k \\ 0 & \text{if } n < k \end{cases}
```

- 这种下三角结构保证状态可以使用 Legendre 多项式，在线近似输入信号。计算长卷积核所需的 $\bar{A}^k$ 很昂贵，因此 S4 利用 HiPPO 矩阵可以分解为低秩项和对角项之和这一事实，以 $O(n \log n)$ 计算卷积核。

- **Mamba**（Gu 与 Dao，2023）引入了关键创新：**选择性状态空间**，也就是让 SSM 参数依赖输入。在 S4 中，矩阵 $A$、$B$、$C$ 和步长 $\Delta$ 都是固定的——无论 token 内容如何，对每个 token 都应用相同动态。Mamba 让 $B$、$C$ 和 $\Delta$ 成为输入的函数：

$$B_k = \text{Linear}(u_k), \quad C_k = \text{Linear}(u_k), \quad \Delta_k = \text{softplus}(\text{Linear}(u_k))$$

- 这种选择性让模型能够在每个位置决定哪些信息存入状态、哪些信息忽略——类似 attention 选择相关 token，但没有二次复杂度。步长 $\Delta_k$ 控制“门”：较大的 $\Delta$ 使状态强烈整合当前输入（连续动态前进较大步长，实际上会重置状态），较小的 $\Delta$ 则保留已有状态并忽略当前输入。

- 权衡在于：输入依赖参数破坏了卷积视角（卷积核不再固定），所以 Mamba 不能使用基于 FFT 的训练。它改用**硬件感知并行扫描**算法，利用递推的结合律：状态更新 $(x_k, u_k) \mapsto x_{k+1}$ 可以表示为一系列满足结合律的操作，并通过前缀和（scan）并行化，类似硬件设计中的并行前缀加法。GPU 上的运行时间为 $O(n)$、深度为 $O(\log n)$，效率几乎可以达到卷积。

- Mamba 的推理真正是每个 token $O(1)$（只需更新固定大小的状态，不需要随上下文增长的 KV-cache），因此在长序列上比 Transformer 更节省内存。状态大小 $N$（通常为 16）远小于 Transformer 的 KV-cache，后者保存 $O(n \cdot d)$ 个值。在实践中，Mamba 在语言建模基准上以相同参数量达到或超过 Transformer 的质量，同时在长序列上显著加快推理。

- **混合架构**把 SSM 层与 attention 层结合起来：大多数层使用 SSM 进行高效的长距离传播，再穿插少数 attention 层进行精确的基于内容的检索。Jamba 和 Zamba 等模型交错使用 Mamba 与 Transformer block，在保持相当多推理效率优势的同时，比纯 SSM 获得更好的质量。这说明 attention 和 SSM 的能力互补：SSM 擅长平滑的长距离状态传播，attention 擅长精确的、依赖内容的查找。

- **检索增强生成（Retrieval-Augmented Generation，RAG）**通过在推理时接入外部知识库，缓解语言模型的知识局限。RAG 不再完全依赖训练时编码在模型参数中的知识，而是检索相关文档，并以这些文档为条件进行生成。

- 经典的**检索器—阅读器架构**包含两个组件。**检索器**接收查询，从语料库中取回最相关的 top-$k$ 个段落；**阅读器**（语言模型）结合查询和检索到的段落生成答案。检索器可以使用稀疏方法（BM25，它扩展了第 02 篇的 TF-IDF）或稠密方法。

- **稠密段落检索（DPR）**使用双编码器架构：一个 encoder 把问题映射为向量，另一个 encoder 把段落映射为向量；两者通常都基于 BERT。在建立索引时，对所有段落编码并保存；查询时，对问题编码，再使用近似最近邻搜索（如 FAISS）找到最近的段落。相似度度量是问题向量与段落向量的点积。

- **切分策略**会显著影响检索质量。文档必须被切成检索器可以处理、同时又足以包含完整观点的段落。固定大小切分（例如 256 个 token、重叠 50 个 token）简单，但可能不自然地切断句子；语义切分在段落或章节边界处切分；层级切分则在不同粒度上建立摘要树。

![RAG 架构](../images/rag_architecture.svg)

- RAG 有多项优势：知识库可以在不重新训练模型的情况下更新；模型可以引用来源；答案以检索文本为依据，因此幻觉会减少。主要挑战是检索质量（如果检索到错误段落，模型可能仍然自信地给出错误答案）和延迟（检索为推理增加了一个步骤）。

- **推测解码（speculative decoding）**使用一个小而快的**草稿模型**并行提出多个 token，再由大型**目标模型**在一次前向传播中验证这些 token，从而加速自回归生成。

- 算法过程如下：草稿模型自回归地生成 $k$ 个候选 token（模型较小，因此速度快）。

- 目标模型随后在一次前向传播中同时为这 $k$ 个 token 打分（工作被批处理，因此效率高）。

- 对于从草稿分布 $p_d(t)$ 中采样得到的每个候选 token $t$，以 $\min(1, \, p_{\text{target}}(t) / p_d(t))$ 的概率接受。如果拒绝，就从**调整后的分布** $p_{\text{adj}}(t) = \max(0, \, p_{\text{target}}(t) - p_d(t))$ 中重新采样，并进行归一化。

- 这种接受—拒绝方案保证输出分布与单独使用目标模型时完全相同。

- 要理解原因，可以考虑输出 token $t$ 的有效概率。它可能被直接接受（概率为 $p_d(t) \cdot \min(1, p_{\text{target}}(t)/p_d(t))$），也可能通过重新采样产生。

- 当 $p_{\text{target}}(t) \leq p_d(t)$ 时，直接接受贡献 $p_{\text{target}}(t)$；当 $p_{\text{target}}(t) > p_d(t)$ 时，直接接受贡献 $p_d(t)$，重新采样贡献剩余的 $p_{\text{target}}(t) - p_d(t)$（计入拒绝概率后）。

- 两种情况下，输出 $t$ 的总概率都等于 $p_{\text{target}}(t)$。草稿模型只影响速度，不影响质量。

![推测解码](../images/speculative_decoding.svg)

- 加速幅度取决于接受率：如果草稿模型与目标模型良好对齐，大多数 token 都会被接受，墙钟时间大致接近草稿模型的耗时。典型加速为 2–3 倍，且不会降低质量。

- **Medusa**（Cai 等，2024）采取了不同方法：它不使用独立的草稿模型，而是在目标模型本身上增加多个轻量级预测头。每个头同时预测不同的未来 token 位置（向前 $k = 1, 2, 3, \ldots$ 步）。每一步中，Medusa 使用树结构提出多个候选延续，再通过一次目标模型 attention 层的前向传播验证哪些候选彼此一致，因此完全不需要独立的草稿模型。

- 更广义的**并行生成**方法都试图打破自回归解码的顺序瓶颈。Jacobi 解码先用猜测初始化所有位置，再并行迭代细化，直到收敛，把生成看成不动点迭代。非自回归模型（NAT）在一次前向传播中同时生成所有 token，但通常会损失质量，需要迭代细化、CTC 损失或来自自回归教师模型的知识蒸馏等技术来缩小差距。

- 上述技术——对齐、长上下文、检索、高效解码和状态空间模型——共同构成了现代生产级 LLM。

- 本篇剩余部分概览前沿模型的架构创新，展示第 01–04 篇的理论思想以及上述方法如何在实践中组合。

- **分组查询注意力（Grouped Query Attention，GQA）**是目前最广泛采用的 attention 效率技术。标准多头 attention（MHA）为每个头维护独立的 key 和 value 投影，每个 token 需要缓存 $n_{\text{heads}} \times d_{\text{head}}$ 个值。GQA 将多个 query 头分组，让它们共享一个 key-value 头。

- 64 个 query 头和 8 个 KV 头（Llama 3、Qwen、Gemma 中的常见配置）意味着每个 KV 头由 8 个 query 头共享；与 MHA 相比，KV cache 减少 8 倍。

- 输出质量几乎与 MHA 相同，因为 query 仍然可以关注不同模式，只是共享同一个 key-value 子空间。多查询 attention（MQA）是极端情形：所有 query 共用一个 KV 头；但 GQA 在质量与效率之间提供了更好的折中。

- **多头潜在注意力（Multi-head Latent Attention，MLA）**由 DeepSeek-V2 引入，实现了更激进的 KV cache 压缩。MLA 不缓存完整的 key-value 投影（即使使用 GQA 也是如此），而是把隐藏状态下投影为低秩**潜向量** $c_t \in \mathbb{R}^{d_c}$，其中 $d_c \ll n_{\text{heads}} \times d_{\text{head}}$：

$$c_t = W_{\text{down}} \, h_t$$

- 只缓存这个压缩向量。在 attention 时，通过上投影重建完整的 key 和 value 表示：$k_t = W_{\text{up}}^K c_t$、$v_t = W_{\text{up}}^V c_t$。在 DeepSeek-V3（总参数 671B、激活参数 37B）中，压缩维度为 $d_c = 512$，而完整 MHA 为 $128 \times 128 = 16{,}384$，KV cache 减少了 93%。

- 这里有一个细节：标准 RoPE 依赖位置，与共享压缩不兼容，因此 MLA 使用**解耦 RoPE**：query 和 key 中一条较小的独立流（每个头 64 个维度）通过 RoPE 携带位置信息，而表示主体沿压缩潜向量路径传递。

![Attention KV cache 策略：比较 MHA、GQA 与 MLA](../images/mla_vs_gqa.svg)

- **大规模的位置编码**已经显著偏离最初的正弦方案。所有前沿模型都使用 **RoPE**（第 04 篇），但会针对长上下文进行关键修改。原始 RoPE 公式 $\theta_i = \theta_{\text{base}}^{-2i/d}$ 中的基频 $\theta_{\text{base}}$ 通常为 10,000，这限制了超过训练长度的外推。

- **调整基频（Adjusted Base Frequency，ABF）**直接把 $\theta_{\text{base}}$ 提高到 500,000（Llama 3）或 1,000,000（Qwen3、Gemma 3），拉长旋转周期，使模型在训练中经历更少的完整旋转，从而可以进一步外推。

- **YaRN**（Yet another RoPE extensioN）使用依赖频率的插值：低频维度被插值（缩小），高频维度被外推，并使用温度因子调整 attention 分布。DeepSeek-V3、Qwen 和 Kimi K2 都使用基于 YaRN 的扩展，将在 4K–8K 上预训练的模型扩展到 128K 上下文。

- **iRoPE**（interleaved RoPE，交错 RoPE）由 Llama 4 引入，采取了更激进的方案：每第 4 个 attention 层完全**不使用位置编码**（NoPE），其他层使用带 chunk 的标准 RoPE。

- NoPE 层可以在没有位置偏置的情况下关注所有位置，而 RoPE 层提供局部顺序信息。结合推理时的温度缩放，这让 Llama 4 Scout 支持 10M token 的上下文窗口，远超任何纯 RoPE 方法。

- **大规模混合专家（MoE）**已经成为前沿模型的主流架构（第 04 篇介绍了 MoE 基础）。关键设计选择包括专家数量、路由稀疏性和负载均衡。

- **路由稀疏性**差异很大：DeepSeek-V3 使用 256 个专家、top-8 路由（32 倍稀疏）；Qwen3 使用 128 个专家、top-8（16 倍稀疏）；Mixtral 使用 8 个专家、top-2（4 倍稀疏）；Llama 4 Maverick 使用 128 个专家、top-1 加一个共享专家（128 倍稀疏）。

- 更高的稀疏性意味着在相同激活计算量下拥有更多总参数，但需要更精细的负载均衡和通信基础设施。

- **无辅助损失负载均衡**（DeepSeek-V3）取代了传统的负载均衡损失（第 04 篇），后者被发现会降低模型质量。新方法让每个专家维护一个在每个训练步骤调整的动态偏置：过载专家的偏置降低（接收更少 token），负载不足专家的偏置提高。这在不让辅助损失污染主训练信号的情况下实现均衡路由。

- **共享专家**出现在大多数 MoE 设计中：一个或多个专家 FFN 无论路由结果如何都处理每个 token。这些专家处理所有 token 都需要的通用模式（基本语法、功能词），让路由专家可以专门化。Llama 4 使用 1 个共享专家加每个 token 1 个路由专家（非常稀疏）；DeepSeek-V3 使用 1 个共享专家加 8 个路由专家。

- **交替使用 dense 与 MoE 层**提供了另一个设计维度。Gemma 2 和 3 交替使用局部/全局 attention 层（Gemma 3 的比例为 5:1，其中局部层使用 1,024 token 的滑动窗口，只有全局层缓存完整的 128K 上下文）。

- Llama 4 Maverick 将 dense FFN 层与 MoE 层交错排列。Kimi K2 使用混合稀疏层（专家层之间插入一个 dense 层）。这种异构设计让不同层可以承担不同功能。

- **多 token 预测（Multi-token prediction，MTP）**被 DeepSeek-V3 使用，训练模型不仅预测下一个 token，还预测下下个 token。在每个位置，一个与主模型 embedding 共享参数的辅助预测模块会额外预测一个未来 token。MTP 损失相对于主 next-token 损失的权重为 0.1–0.3。除了改善训练中的表示质量，MTP 头还可以在推理时充当推测解码的草稿头，免费提供加速。

- **知识蒸馏**是一种训练策略：大型“教师”模型的输出指导小型“学生”模型训练。Gemma 2 和 3 大量使用蒸馏：小模型（2B、4B）使用教师的概率分布作为软目标，在计算最优数据量的 50 倍数据上训练。这解释了为什么 Gemma 3-4B 的质量可以匹配 Gemma 2-27B。

- 蒸馏损失替代或补充标准交叉熵：学生模型最小化自身输出分布与教师输出分布之间的 KL 散度：

$$\mathcal{L}_{\text{distill}} = D_{\text{KL}}(p_{\text{teacher}}(\cdot \mid x) \| p_{\text{student}}(\cdot \mid x))$$

- DeepSeek-R1 使用 800K 条精选思维链样本，把 671B 的推理模型蒸馏到最小 1.5B 的 dense 模型，产生了推理能力远超其规模预期的小模型。

- **通过强化学习实现推理**是 LLM 能力最近最重要的进展。DeepSeek-R1 证明，在基础模型上直接进行纯强化学习（不经过监督微调）可以激发思维链推理、自我验证和错误纠正；当模型因最终答案正确而获得奖励时，这些行为会自发出现。

- DeepSeek-R1 使用 **GRPO**（Group Relative Policy Optimisation，组相对策略优化），去掉了 PPO 所需的价值网络。对每个 prompt，GRPO 采样一组 $G$ 个输出，计算奖励，并在组内标准化优势：

$$A_i = \frac{r_i - \text{mean}(r_1, \ldots, r_G)}{\text{std}(r_1, \ldots, r_G)}$$

- 随后，策略梯度使用这些组相对优势，并采用带裁剪的目标（类似 PPO 的裁剪）。

- 去掉 critic 网络后，强化学习训练的内存和计算需求减半，使对 671B 参数模型进行 RL 训练成为可能。

- 一个关键设计选择是：DeepSeek-R1 使用**基于规则的奖励**（将数学答案与标准答案核对、运行代码测试用例），而不是神经奖励模型，因为在这个规模上，神经奖励模型容易被奖励投机利用。

- **Qwen3 的混合思考模式**把推理（使用 `<think>` 标签逐步展开思维链）和快速直接回答整合在一个模型中，允许用户控制在延迟与推理深度之间权衡的“思考预算”。

- 这是通过同时使用思考和非思考数据训练实现的，而不是通过分开的模型 checkpoint 实现。

- **大规模训练稳定化**需要超越标准实践的新技术。**logit 软上限**（Gemma 2）使用 $s \cdot \tanh(\text{logits} / s)$ 变换 attention 分数，其中软上限 $s$ 通常为 30–50，以防止数值无界增长。

- **QK-Norm**（Qwen3）在计算 attention 分数前对 query 和 key 向量应用 RMSNorm，取代对 QKV bias 的需要。**QK-Clip**（Kimi K2 的 MuonClip 优化器）监控训练期间的最大 attention logit，当它超过阈值时重新缩放 query-key 权重矩阵，使 1T 参数模型能够稳定预训练且不出现不稳定事件。

- **FP8 混合精度训练**（DeepSeek-V3）在前向和反向传播中对计算密集的矩阵乘法使用 8 位浮点数，同时以更高精度保存主权重。

- 与 BF16/FP16 训练相比，这大致可以使吞吐量翻倍，质量损失可以忽略。DeepSeek-V3 的 671B 参数模型只使用了 2.8M H800 GPU 小时训练完成，远低于同类模型，很大程度上归功于这项技术和其他工程优化。

## 编程任务（使用 CoLab 或 notebook）

1. 从零实现一个简单的检索增强生成流程。使用 TF-IDF（第 02 篇）为一组文档建立索引，为查询检索最相关的段落，并将它前置到 prompt 中。
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

2. 使用玩具草稿模型和目标模型实现推测解码，展示接受的输出与目标模型的分布一致。
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

3. 构建一个简单的 DPO 训练循环。给定偏好和不偏好的 completion 对，使用 DPO 损失更新一个小模型。
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
