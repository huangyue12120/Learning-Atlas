---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 07 - computational linguistics/04. transformers and language models.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 0dba3191925b7d5492b3890becde9e8d23166499af7efedbea04a31e6a173ca6
status: reviewed
---
# Transformer 与语言模型

*Transformer 用自注意力取代循环结构，成为语言理解与生成领域的主流架构。本文介绍 BERT、GPT、T5、位置编码（正弦位置编码、RoPE）、预训练目标（MLM、CLM）、微调、提示词工程和缩放定律，概述现代大语言模型的基础。*

- 第 06 章介绍了 Transformer 架构，包括自注意力、多头注意力、位置编码和编码器—解码器结构。本文聚焦 Transformer 如何适配不同 NLP 范式，介绍 BERT、GPT、T5 等代表性模型，以及让它们能在大规模场景中实用的技术。

- 核心操作是**缩放点积注意力**：计算 $\text{softmax}(QK^T / \sqrt{d_k}) V$，其中查询、键和值是输入的线性投影。**多头注意力**并行运行 $h$ 个注意力头，每个头使用不同的可学习投影，再拼接各头结果。Transformer 块还包含残差连接、层归一化和逐位置前馈网络（见第 06 章）。

- **层归一化**的放置位置是一个细微但重要的架构选择。原始 Transformer 使用**后归一化**：在子层之后执行残差相加和归一化，即 $\text{LayerNorm}(x + \text{Sublayer}(x))$。

- 大多数现代模型使用**前归一化**：先归一化，再执行子层计算，即 $x + \text{Sublayer}(\text{LayerNorm}(x))$。这种方式在训练时更稳定，因为残差连接让梯度沿恒等路径直接传递，不必经过归一化操作。即使没有仔细设置学习率预热，也更容易训练很深的模型。

- 每个 Transformer 块中的**前馈子层**都是一个逐词元位置独立应用的两层 MLP：

$$\text{FFN}(x) = W_2 \cdot \text{GELU}(W_1 x + b_1) + b_2$$
- 前馈层的中间维度通常是模型维度的 4 倍（例如 $d_{\text{model}}=768$、$d_{\text{ff}}=3072$）。它约占每个 Transformer 块参数量的三分之二，并被认为像键值记忆一样，存储训练中学到的事实知识。

- **位置编码**向模型提供词元顺序信息，因为注意力本身具有置换等变性。原始的**正弦位置编码**（见第 06 章）使用固定频率的正弦和余弦函数。**可学习的位置嵌入**则为每个位置添加一个可训练向量（BERT 和 GPT-2 使用这种方法）。两者都是绝对位置编码：无论上下文如何，位置 5 都使用同一个向量。

- **旋转位置嵌入（RoPE）**通过在二维子空间中旋转查询向量和键向量来编码位置。对于一对维度 $(q_{2i}, q_{2i+1})$，位置 $m$ 对应的旋转角度为 $m\theta_i$（其中 $\theta_i = 10000^{-2i/d}$）：

```math
\begin{bmatrix} q'_{2i} \\ q'_{2i+1} \end{bmatrix} = \begin{bmatrix} \cos m\theta_i & -\sin m\theta_i \\ \sin m\theta_i & \cos m\theta_i \end{bmatrix} \begin{bmatrix} q_{2i} \\ q_{2i+1} \end{bmatrix}
```

![RoPE 示意图：不同位置的查询向量和键向量在二维子空间中旋转不同角度，使注意力分数取决于相对位置](../images/rope_rotation.svg)


- RoPE 的一个优点是，旋转后的查询和键向量点积 $q'^T k'$ 只取决于它们的相对位置 $m-n$，不取决于各自的绝对位置。

- 令 $q' = R_m q$、$k' = R_n k$，其中 $R_m$ 是分块对角旋转矩阵，则注意力分数为：

$$q'^T k' = (R_m q)^T (R_n k) = q^T R_m^T R_n \, k = q^T R_{n-m} \, k$$
- 最后一步利用了旋转群的性质：$R_m^T R_n = R_{n-m}$。先反向旋转 $m$，再正向旋转 $n$，等价于旋转 $n-m$。

- 因此，注意力分数只取决于相对距离 $n-m$，不取决于绝对位置 $m$ 和 $n$。

- RoPE 无需学习位置参数，就能让模型获得自然的距离表示，并有助于模型泛化到训练时没见过的序列长度。

- **ALiBi**（带线性偏置的注意力）采用更简单的做法：按位置距离对注意力分数施加固定的线性惩罚，即 $\text{score}_{ij} = q_i^T k_j - m \cdot |i-j|$，其中 $m$ 是每个注意力头对应的斜率。不同的头使用不同斜率，因此有些头关注局部，有些头关注全局。ALiBi 不需要可学习的位置参数，也能较好地泛化到更长的序列。

- 基于 Transformer 的语言模型主要有三种范式：**仅编码器**、**仅解码器**和**编码器—解码器**。它们的区别在于模型能看到哪些词元（由注意力掩码决定），以及训练方式。

![三种 Transformer 范式：BERT 仅编码器使用双向注意力进行理解；GPT 仅解码器使用因果注意力进行生成；T5 编码器—解码器结合两者处理 seq2seq 任务](../images/transformer_paradigms.svg)


- **BERT**（基于 Transformer 的双向编码表示；Devlin 等，2019）是典型的仅编码器模型。它使用完整的双向注意力处理文本：每个词元都能关注所有其他词元，包括左右两侧的词元。因此 BERT 能生成丰富的上下文表示，但不能自回归地生成文本。

- BERT 使用两个目标进行预训练。**掩码语言建模（MLM）**随机遮蔽输入中 15% 的词元，并训练模型预测它们。在选中的词元中，80% 替换为 [MASK]，10% 替换为随机词，10% 保持不变（避免模型只在看到 [MASK] 时才学习预测）。训练目标为：

$$\mathcal{L}_{\text{MLM}} = -\sum_{i \in \mathcal{M}} \log P(w_i \mid w_{\backslash \mathcal{M}})$$
- 其中，$\mathcal{M}$ 是被遮蔽位置的集合，$w_{\backslash \mathcal{M}}$ 表示遮蔽这些位置后的句子。这是一种**去噪**目标：模型学习重建被破坏的输入。

![BERT 掩码语言建模：随机遮蔽输入中 15% 的词元，再用双向 Transformer 预测这些位置的原始词元](../images/bert_mlm.svg)


- **下一句预测（NSP）**训练 BERT 判断两个句子在原文中是否连续。模型使用输入开头的特殊 [CLS] 词元进行二分类。NSP 原本用于帮助模型理解问答等任务中的句间关系；后续研究（如 RoBERTa）发现它的作用有限，因此可以移除。

- BERT 通过在模型顶部添加任务专用的预测头（通常是简单的线性层），并微调整个模型，将预训练表示适配到下游任务。分类任务使用 [CLS] 词元的表示；NER、词性标注等词元级任务则使用每个词元的表示。这种**微调**方法能把预训练中学到的语言知识迁移到新任务，所需标注数据相对较少。

- **GPT**（生成式预训练 Transformer；Radford 等，2018）是典型的仅解码器模型。它使用**因果（自回归）注意力**：每个词元只能关注更早位置的词元和自身。实现时，在 softmax 之前将未来位置的注意力分数设为 $-\infty$。训练目标是简单的**因果语言建模（CLM）**：根据此前的词元预测下一个词元。

$$\mathcal{L}_{\text{CLM}} = -\sum_{i=1}^{n} \log P(w_i \mid w_1, \ldots, w_{i-1})$$
- 这与第 02 篇介绍的 n-gram 语言模型目标相同，但 Transformer 可以根据全部前文进行预测，而不只依赖最近的 $k-1$ 个词元。

- **GPT-2**将规模扩大到 15 亿参数，并展示了较强的零样本能力：即使不经过微调，也能根据自然语言提示词（例如“将英语翻译成法语：……”）执行任务。

- **GPT-3**拥有 1750 亿个参数，显示仅靠规模也能带来**上下文学习**能力：在提示词中提供少量输入—输出示例，模型就能在不更新梯度的情况下执行新任务。

- **T5**（文本到文本迁移 Transformer；Raffel 等，2020）等编码器—解码器模型把所有 NLP 任务都表述为文本到文本：输入和输出都是文本字符串，输入前还可以加上任务前缀（如“translate English to German:”）。编码器用双向注意力处理输入，解码器则通过对编码器输出的交叉注意力，自回归地生成结果。

- T5 使用**跨度破坏**进行预训练：随机选择连续词元跨度并替换为哨兵词元，再要求模型生成被移除的内容。例如，输入 “The [X] on [Y]”，目标可以是 “[X] cat sat [Y] the mat”。这把 BERT 的 MLM 从单个词元扩展到了连续跨度。

- **BART**（Lewis 等，2020）也是使用去噪目标预训练的编码器—解码器模型，但采用了更多输入扰动方式：遮蔽或删除词元、遮蔽连续跨度、打乱句子顺序，以及打乱文档顺序。这些多样的扰动能促使模型学习更稳健的表示。

- 随着语言模型变大，**全参数微调**（更新所有参数）会变得难以承担：一个 1750 亿参数的模型，仅保存优化器状态就需要数百 GB。**参数高效微调（PEFT）**只调整一小部分参数。

- **适配器（Adapter）**在现有 Transformer 层之间插入小型瓶颈层，通常由两个线性层和一个非线性函数组成：先降维到较小维度，再升回原维度。训练时只更新适配器权重，冻结原模型权重。新增参数通常不到 5%，在多数任务上仍可达到接近全参数微调的效果。

- **LoRA**（低秩适配）直接修改权重矩阵的增量，不添加新层。它不更新整个权重矩阵 $W$，而是学习一个低秩增量：$W' = W + BA$。其中 $B$ 的形状为 $d \times r$，$A$ 的形状为 $r \times d$，且 $r \ll d$（通常 $r=4$ 到 $64$）。原始权重 $W$ 保持冻结，只训练 $A$ 和 $B$。推理时可将增量合并回原权重，不增加额外延迟：

$$W' = W + BA$$
![LoRA 示意图：冻结的权重矩阵 W 旁增加由小矩阵 A、B 构成的低秩路径，在可训练参数减少 32 倍的同时达到接近全参数微调的效果](../images/lora_decomposition.svg)


- **前缀微调**在每个注意力层的键和值矩阵前添加一串可学习的“虚拟词元”。模型像关注真实词元一样关注这些前缀向量，训练时只更新前缀参数。它类似提示词微调，但操作对象是激活空间而非嵌入空间。

- **提示词工程**是在不更新模型参数的情况下，设计输入文本以引导预训练模型产生所需行为。

    - **零样本提示词**：用自然语言说明任务，例如“判断以下评论的情感”。

    - **少样本提示词**：在实际查询前提供若干输入—输出示例。

    - **思维链（CoT）提示词**：在提示词中加入“让我们一步步思考”之类的要求，或提供推理过程示例。这能引导模型拆解问题，在算术和逻辑推理任务上常有帮助。

- **上下文学习（ICL）**指大型语言模型能根据提示词中的示例学会执行任务，而无需更新梯度。模型权重保持不变，示例相当于隐式的任务说明。

- ICL 的具体机制仍在研究中。一种假说认为，注意力层会在前向传播中实现某种形式的梯度下降，相当于在上下文示例上“训练”模型。

- **缩放定律**描述模型规模、数据规模、计算预算与性能（通常以损失衡量）之间可预测的关系。Kaplan 等（2020）发现，损失会随各变量按幂律变化：

$$L(N) \propto N^{-\alpha_N}, \quad L(D) \propto D^{-\alpha_D}, \quad L(C) \propto C^{-\alpha_C}$$
- 其中，$N$ 是参数数量，$D$ 是数据集大小，$C$ 是计算预算。这些幂律关系在多个数量级的范围内都成立，说明扩大规模通常会带来可预测的改进。

![缩放定律示意图：在双对数坐标中，损失随规模增加按幂律下降；Kaplan 和 Chinchilla 的研究显示了这种可预测趋势](../images/scaling_laws.svg)


- **Chinchilla 缩放定律**（Hoffmann 等，2022）修正了早期认识，指出许多大型模型训练不足。对于固定计算预算 $C$，最优配置会让模型规模和训练数据量以相同幂次增长：

$$N_{\text{opt}} \propto C^{0.5}, \quad D_{\text{opt}} \propto C^{0.5}$$
- 这意味着计算预算翻倍时，模型规模和数据量都应扩大到原来的 $\sqrt{2}$ 倍，而不应只增大模型。

- Kaplan 等人曾建议让参数量 $N$ 比数据量 $D$ 增长得更快，这导致模型很大但训练数据不足。Chinchilla（700 亿参数、1.4 万亿词元）以相同计算预算达到与 Gopher（2800 亿参数、3000 亿词元）相近的表现，说明早期模型严重缺少训练数据。

- 一个常用经验值是每个参数约使用 20 个训练词元。

- **混合专家（MoE）**架构可以在计算量不同比例增长的情况下扩展模型容量。它用多个**专家**前馈网络和一个**门控网络**（路由器）替代单个大型前馈层，由路由器为每个词元选择要激活的专家。

- 门控函数计算每个专家的路由分数，并选择得分最高的前 $k$ 个专家（通常 $k=1$ 或 $k=2$）：

$$G(x) = \text{TopK}(\text{softmax}(W_g x))$$
- 只有选中的专家会处理词元，因此计算量主要随活跃专家数 $k$ 增长，而不是随专家总数 $E$ 增长。使用 top-2 路由的 8 专家模型，参数量是同规模稠密模型的 4 倍，计算量则约为 2 倍。

![MoE 层示意图：输入词元经路由器计算各专家分数，选择得分最高的两个专家，再按门控分数加权合并它们的输出](../images/moe_layer.svg)


- MoE 的一个关键挑战是**负载均衡**：如果路由器把大多数词元都发给少数热门专家，其他专家就会闲置。训练时会加入辅助的**负载均衡损失**，鼓励各专家均匀分担词元：

$$\mathcal{L}_{\text{balance}} = E \cdot \sum_{i=1}^{E} f_i \cdot p_i$$
- 其中，$f_i$ 是分配给专家 $i$ 的词元比例，$p_i$ 是路由到专家 $i$ 的平均概率。两者都均匀（各为 $1/E$）时，该乘积达到最小值。

- **专家并行**把不同专家分布到不同加速器上。前向传播时，系统通过 all-to-all（全对全）通信把词元发送到承载对应专家的设备，再把结果传回。通信是 MoE 大规模部署时的主要工程挑战。Switch Transformer、Mixtral 和 GShard 等模型使用 MoE，以较实用的推理成本取得较强性能。

- 构建模型只是工作的一半，另一半是评估它是否有效。NLP 评估尤其困难，因为语言表达存在歧义，判断带有主观性，而且任务形式开放。

- 同一段内容可能有多种正确译法。摘要即使与参考文本没有完全相同的词语，也可能写得很好。

- 聊天机器人可以给出有帮助、无害且诚实的回答，但合理的评审者仍可能对回答质量意见不一。

- **精确匹配（EM）**是最简单的指标：模型输出是否与标准答案完全相同？它适用于抽取式问答（如 SQuAD）或数值明确的数学题等答案简短、歧义较少的任务。

- EM 判定很严格：“New York City” 和 “new york city” 会被视为不匹配，除非先进行大小写等规范化；它的优点是定义简单明确。

- **词元级指标**把 NLP 任务视为词元分类，使用第 06 章介绍的精确率、召回率和 F1。

- **精确率**衡量模型预测为目标类的词元中有多少正确：$P = \text{TP} / (\text{TP} + \text{FP})$。如果模型只预测少数实体且预测全对，精确率就很高。

- **召回率**衡量标准答案中的目标词元有多少被模型找出：$R = \text{TP} / (\text{TP} + \text{FN})$。如果把所有词元都预测为实体，召回率可能很高，但精确率会很低。

- **F1**是精确率和召回率的调和平均值：

$$F_1 = \frac{2PR}{P + R}$$
- 调和平均数比算术平均数更能惩罚不平衡：$P$ 或 $R$ 任一较低，$F_1$ 就会较低。NER（见第 02 篇）通常先按实体类别计算 F1，再对类别做宏平均；POS 标注则更常用词元级准确率，因为每个词元都需要一个标签。

- **跨度级 F1**（SQuAD 使用）比较预测答案与标准答案包含的词元。例如，参考答案 “the Eiffel Tower” 有 3 个词元，预测 “Eiffel Tower” 有 2 个词元且都匹配，因此 EM 为 0、跨度级 F1 为 0.8。**编者注：**原文括号中的“4/5”与这个例子不符；按词元计算应为 2 个重叠词元、参考 3 个、预测 2 个。

- **BLEU**（Papineni 等，2002）是机器翻译中的经典指标，用来衡量候选译文与一个或多个参考译文之间的 n-gram 重叠。它综合 unigram 到 4-gram 各级别的精确率，并加入简短惩罚：

$$\text{BLEU} = \text{BP} \cdot \exp\!\left(\sum_{n=1}^{N} w_n \log p_n\right)$$
- 其中，$p_n$ 是**修正 n-gram 精确率**：候选译文中每种 n-gram 的计数会按参考译文中的最大计数截断，避免“the the the the”这类退化候选仅靠重复词语拿到高分。权重 $w_n$ 通常取均匀权重，即 $w_n = 1/N$，且 $N = 4$。

- **简短惩罚**为 $\text{BP} = \min(1, \exp(1 - r/c))$。当候选译文短于参考译文时，该惩罚会降低 BLEU 分数；$c$ 和 $r$ 分别表示候选译文与参考译文的长度。没有这项惩罚，模型只输出少量常见词也可能获得较高的精确率。

- 在语料库层面，BLEU 与人工判断有一定相关性；用于评估单句时，相关性较弱。

- BLEU 偏重精确的 n-gram 匹配，因此可能无法识别意思相同的改写。例如，“the cat is on the mat” 和 “a feline sits atop the rug” 表意相近，却没有重叠的二元语法。

- BLEU 不计算召回率。候选译文即使只输出少数常见词，也可能有较高的精确率。

- **ROUGE**（Lin，2004）是摘要评估中的常用指标。BLEU 偏重精确率，ROUGE 则更关注召回率：参考文本中的 n-gram 有多少出现在候选文本中？

- **ROUGE-N**计算 n-gram 召回率：$\text{ROUGE-N} = \frac{|\text{n-grams}_{\text{ref}} \cap \text{n-grams}_{\text{cand}}|}{|\text{n-grams}_{\text{ref}}|}$。ROUGE-1（unigram）和 ROUGE-2（bigram）最常用。**编者注：**原文公式把 n-gram 写成集合，未体现重复项的计数；标准 ROUGE-N 会按匹配的 n-gram 次数计算。

- ROUGE-L 使用候选文本与参考文本之间的**最长公共子序列**（LCS），可以衡量词语顺序，而不要求匹配项连续出现。

- 将 LCS 长度除以参考文本长度可得召回率，除以候选文本长度可得精确率；再用 F 值综合两者。

- LCS 可用动态规划在 $O(mn)$ 时间内计算，与第 02 篇介绍的编辑距离算法类似：

$$R_{\text{LCS}} = \frac{\text{LCS}(X, Y)}{m}, \quad P_{\text{LCS}} = \frac{\text{LCS}(X, Y)}{n}, \quad F_{\text{LCS}} = \frac{(1 + \beta^2) R_{\text{LCS}} P_{\text{LCS}}}{R_{\text{LCS}} + \beta^2 P_{\text{LCS}}}$$
- 其中，$m$ 和 $n$ 分别是参考文本与候选文本的长度。$\beta$ 通常取值较大以提高召回率的权重；当 $\beta \to \infty$ 时，$F_{\text{LCS}}$ 趋近于召回率。

- **METEOR**（Banerjee 和 Lavie，2005）通过纳入同义词、词干和词序信息，弥补 BLEU 的部分不足。

- 它先用精确匹配、词干匹配（第 02 篇介绍的 Porter 词干提取）和同义词匹配（第 01 篇介绍的 WordNet）对齐候选文本与参考文本中的词语。

- 随后，METEOR 计算偏重召回率的精确率与召回率加权调和平均值，并加入片段惩罚：匹配词语在候选文本中的顺序越零散，惩罚越大。

- **ChrF**（字符 n-gram F 值）按字符 n-gram 而非词语 n-gram 计算 F 值。因此，即使词形变化较多（见第 01 篇）或词元切分方式不同，它通常也更稳健。ChrF++ 还加入了词语二元组。

- 除 BLEU 外，ChrF 也是机器翻译中常用的评估指标，尤其适合形态变化丰富的语言。

- 困惑度（第 02 篇）衡量语言模型对留出测试集的预测表现，是常用的内在评估指标：$\text{PPL} = \exp(-\frac{1}{N} \sum_{i} \log P(w_i \mid w_{<i}))$。数值越低越好。

- 困惑度通常只适合比较使用相同词元切分方式的模型，因为不同切分器会把同一文本编码成长度不同的序列 $N$。

- 词汇表较大的模型，每个词元的困惑度可能较低，但处理同一句子时产生的词元也可能较少。

- **每字节比特数**（BPB）用文本的 UTF-8 字节数而非词元数作归一化，因此不受词元切分方式影响：



```math
\text{BPB} = \frac{-\sum_{i} \log_2 P(w_i \mid w_{<i})}{\text{number of UTF-8 bytes}}
```

- **BERTScore**（Zhang 等，2020）不只比较表层 n-gram，而是在嵌入空间中衡量相似度。它用上下文嵌入（通常来自预训练的 BERT 模型）计算余弦相似度：参考文本中的每个词元与候选文本中最相似的词元匹配，候选文本中的每个词元也与参考文本中最相似的词元匹配。分数会聚合为精确率、召回率和 F1，其中精确率与召回率的计算方式如下：



$$R_{\text{BERT}} = \frac{1}{|r|} \sum_{r_i \in r} \max_{c_j \in c} \cos(r_i, c_j), \quad P_{\text{BERT}} = \frac{1}{|c|} \sum_{c_j \in c} \max_{r_i \in r} \cos(c_j, r_i)$$
- 其中，$r_i$ 和 $c_j$ 分别是参考文本与候选文本中词元的上下文嵌入。BERTScore 能反映 n-gram 指标难以捕捉的语义相似性。例如，`automobile` 和 `car` 语义相近，BERTScore 可能会给它们较高的相似度。**编者注：**原文称这两个词没有共同字符，但它们都含有字母 `a`。

- **BLEURT**（Sellam 等，2020）直接用人工质量判断微调 BERT 模型。给定一对参考文本和候选文本，它会输出一个质量分数。训练分两步：先用合成数据训练，例如随机扰动参考译文，并用 BLEU、METEOR 等指标给这些样本评分；再用人工评分微调。原文称，BLEURT 与人工判断的相关性高于表层匹配指标。

- **COMET**（Crosslingual Optimized Metric for Evaluation of Translation；Rei 等，2020）是一种用于机器翻译的学习型指标。它同时使用源句、参考译文和候选译文，通过多语言编码器（XLM-R）为三者生成嵌入，再预测质量分数。由于纳入了源句，COMET 有机会发现仅比较参考译文与候选译文时难以识别的含义错误，例如译文流畅却与原文事实不符。

- **LLM-as-judge**（让大语言模型充当评审）可用于大规模评估。评审模型（如 GPT-4 或 Claude）根据输入、待评估回答以及可选的参考答案，给出分数（如 1 到 5 分）或两份回答之间的偏好。

- **成对比较**（如 Chatbot Arena 所用）是 LLM-as-judge 的一种评估形式。原文将它称为其中最可靠的格式。评审查看两份回答并选出更好的一份，而不是分别打绝对分数。这可以减少评分校准问题，例如不同评审对“3 分”的理解不同。成对比较结果可汇总为**Elo 等级分**（源自国际象棋评分系统）：每个模型有一个初始分数，再根据与其他模型比较的结果升降。模型 $A$ 对模型 $B$ 的预期获胜概率为：

$$P(A \succ B) = \frac{1}{1 + 10^{(R_B - R_A) / 400}}$$
- 其中，$R_A$ 和 $R_B$ 是两个模型的 Elo 等级分。每次比较后，按下式更新模型 $A$ 的分数：$R_A' = R_A + K(S - P(A \succ B))$。$S \in \{0, 1\}$ 表示实际结果，$K$ 控制分数调整幅度。击败强对手会让模型加分更多；输给弱对手则会让模型扣分更多。

- **位置偏差**是 LLM 评审的已知问题：评审可能偏好先展示的回答，有些模型则偏好后展示的回答。可以交换两份回答的位置，各评估一次，再汇总两次结果，以减轻这种偏差。

- **冗长偏差**指评审可能偏好较长、较详细的回答，即使简短回答更合适。

- **自一致性**检查评审模型多次评估同一输入时，结果是否稳定。结果差异较大，说明评估信号噪声较高。

- **评审者间一致性**（如 Cohen's kappa 或 Krippendorff's alpha）衡量多个评审者之间的一致程度，可用来判断评估结果的可靠性上限。

- **数据污染**会影响基准测试的可信度：如果评估数据进入了模型的训练集，模型可能记住答案，导致分数虚高。

- 对使用网络抓取数据训练的大语言模型来说，数据污染尤其值得注意，因为公开的热门基准测试可能已被收录在训练数据中。缓解方法包括使用未公开的测试集、定期更换题目的动态基准测试、在基准数据中嵌入用于检测泄漏的唯一**金丝雀字符串**，以及分别比较受污染子集与干净子集上的表现。

- 常见的自然语言理解（NLU）基准测试会用多种任务评估语言理解能力。

- **GLUE**（General Language Understanding Evaluation）和 **SuperGLUE** 是多任务基准，涵盖情感分析（SST-2）、文本相似度（STS-B）、自然语言推断（MNLI、RTE）、共指消解（WSC）和问答（BoolQ）。

- 模型先分别接受各项任务的评估，再按聚合指标计分。GLUE 目前已被认为趋于饱和，模型在多数任务上的表现超过人类；SuperGLUE 仍更具挑战性。

- **MMLU**（Massive Multitask Language Understanding）用多项选择题评估模型在 57 个学科领域中的知识与推理能力。

- 该基准测试模型在预训练期间学到的广泛知识，并报告各学科得分及宏平均分。

- MMLU-Pro 加入了难度更高、需要多步推理的问题，每题有 10 个选项，而 MMLU 有 4 个。

- **HellaSwag**让模型从多个选项中选出最符合场景的后续内容，以测试常识推理。干扰项由模型对抗式生成，表面上合理，语义上却不正确。

- **WinoGrande**用只差一个词的最小对测试常识推理和共指消解能力。

- **ARC**（AI2 Reasoning Challenge）包含简单集和挑战集，使用小学科学问题评估事实知识与推理能力。

- **推理与数学基准测试**评估问题求解能力，用来区分能力较强和较弱的大语言模型。

- **GSM8K**（Grade School Math 8K）包含 8,500 道需要多步算术推理的小学数学应用题。它是评估基础数学推理和思维链提示词（第 04 篇）的常用基准。

- **MATH** 是一个难度更高的数据集，收录代数、数论、几何、计数和概率等领域的竞赛级数学题。题目需要多步符号推理；MATH-500 是常见的 500 题子集。

- **AIME**（American Invitational Mathematics Examination）是竞赛级数学考试，题目需要多步数学推理。DeepSeek-R1 在 2024 年 AIME 中得分 79.8%。原文据此指出，经过强化学习训练的推理模型（第 05 篇）已接近高水平的人类参赛者。

- **HumanEval** 和 **MBPP**（Mostly Basic Programming Problems）通过运行单元测试评估代码生成。HumanEval 包含 164 道 Python 编程题，每题提供函数签名和文档字符串，模型需要补全函数体。

- 常用指标是 **pass@k**，表示 $k$ 个生成样本中至少有一个通过全部测试的概率。其估计式为：

$$\text{pass@}k = 1 - \frac{\binom{n-c}{k}}{\binom{n}{k}}$$
- 其中，$n$ 是生成样本总数，$c$ 是通过测试的样本数。该公式用于校正从 $n$ 个样本中抽取 $k$ 个时直接估算 pass@k 所产生的偏差。

- **SWE-bench**进一步评估模型能否通过修改现有代码库解决真实的 GitHub 问题，是对实际软件工程能力更严格的测试。

- **GPQA**（Graduate-Level Google-Proof QA）包含生物、物理和化学领域的专家级问题，即使领域专家也觉得难以作答。它旨在测试模型的理解能力，而非单纯的模式匹配；“Diamond”子集难度最高。

- 安全与对齐基准测试模型是否有帮助、无害且诚实。

- **TruthfulQA**测试模型是否会复述常见误解。题目经过设计，使网上最常见的答案往往是错的。例如，“吞下口香糖会怎样？”常见误解是口香糖会在体内停留 7 年，实际情况是它会正常通过消化道。复述这类流行错误说法的模型得分较低。

- **BBQ**（Bias Benchmark for QA）评估模型在年龄、性别、种族和宗教等类别上的社会偏见。题目经过设计，使带有偏见的模型容易系统性地选择刻板印象答案。**ToxiGen**评估模型针对特定群体生成有害内容的倾向。

- **MT-Bench**用 80 道精心设计的问题评估多轮对话能力，涵盖写作、角色扮演、推理、数学、编程、信息抽取、STEM 和人文学科。LLM 评审（GPT-4）按 1 到 10 分为回答评分。多轮形式还能检验模型能否接续对话、保持上下文并处理澄清请求。

- **Chatbot Arena**（LMSYS）邀请真实用户对匿名模型的回答进行盲测比较。用户提交提示词并投票选出更好的回答，但不知道回答来自哪个模型。平台汇总投票并生成 Elo 排行榜。原文认为，这种评估方式的生态效度较高，因为它反映了用户面对多样、未经筛选的提示词时的偏好。

- **AlpacaEval**在固定指令集上，将待测模型的输出与参考模型（GPT-4）的输出作自动成对比较，再由评审模型判定胜率。

- **AlpacaEval 2.0**使用经过长度控制的胜率，以减轻冗长偏差的影响。

- **特定任务评估**需要根据领域选择相应指标。

- **词错误率**（WER）用于语音识别：$\text{WER} = (S + D + I) / N$。其中，$S$、$D$ 和 $I$ 分别表示替换、删除和插入错误，$N$ 是参考文本中的词数。它相当于词级编辑距离（第 02 篇）除以参考文本长度。

- **槽位 F1**用于任务型对话系统，衡量模型从用户话语中提取结构化信息的准确程度。例如，从“帮我订一张明天去巴黎的机票”中提取“目的地：巴黎”和“日期：明天”。

- **引用准确率**（第 05 篇）用于检查 RAG 系统生成的引用是否支持回答中的陈述。评估者将每项陈述与检索到的段落核对，并统计得到充分支持、部分支持或不受支持的陈述所占比例。

- 常见的评估陷阱会让基准比较失去意义。

- **为应试而训练**：模型针对基准分数优化，却没有获得相应能力。例如，在 MMLU 风格的选择题上微调的模型可能取得高分，面对同一问题的开放式提问时却答错。

- **指标投机**：模型可能学会生成能提高自动指标分数（如提高 BLEU、降低困惑度）的输出，却没有改善实际质量。按 BLEU 优化的译文可能变得保守、笼统，读起来也不够自然流畅。

- **基准测试饱和**：模型接近或超过基准测试的上限后，分数便难以区分模型能力。GLUE、SQuAD 1.1 等基准测试已经趋于饱和。

- 研究者不断推出更难的基准测试，但基准测试经历创建、饱和再替换的循环，使不同时间的结果难以纵向比较。

- **人工评估**仍被视为黄金标准，但费用高、耗时，也难以复现。众包标注员与领域专家，以及来自不同文化或语言背景的评审者，可能给出不同判断。研究报告应说明评审者间的一致性和评审者的人口统计信息，以便他人复现评估。

## 编码任务（使用 CoLab 或笔记本）

1. 实现一个完整的Transformer编码器块（多头注意力、前馈网络、残差连接和层归一化）。将其应用于简单的序列分类任务。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

def layer_norm(x, gamma, beta, eps=1e-5):
    mean = x.mean(axis=-1, keepdims=True)
    var = x.var(axis=-1, keepdims=True)
    return gamma * (x - mean) / jnp.sqrt(var + eps) + beta

def multi_head_attention(Q, K, V, W_q, W_k, W_v, W_o, n_heads):
    B, T, D = Q.shape
    head_dim = D // n_heads

    q = Q @ W_q  # (B, T, D)
    k = K @ W_k
    v = V @ W_v

    # Reshape to (B, n_heads, T, head_dim)
    q = q.reshape(B, T, n_heads, head_dim).transpose(0, 2, 1, 3)
    k = k.reshape(B, T, n_heads, head_dim).transpose(0, 2, 1, 3)
    v = v.reshape(B, T, n_heads, head_dim).transpose(0, 2, 1, 3)

    scores = q @ k.transpose(0, 1, 3, 2) / jnp.sqrt(head_dim)
    weights = jax.nn.softmax(scores, axis=-1)
    out = (weights @ v).transpose(0, 2, 1, 3).reshape(B, T, D)
    return out @ W_o, weights

def transformer_block(x, params):
    # Pre-norm multi-head self-attention
    normed = layer_norm(x, params['ln1_g'], params['ln1_b'])
    attn_out, weights = multi_head_attention(
        normed, normed, normed,
        params['W_q'], params['W_k'], params['W_v'], params['W_o'],
        n_heads=4
    )
    x = x + attn_out

    # Pre-norm feed-forward
    normed = layer_norm(x, params['ln2_g'], params['ln2_b'])
    ff = jax.nn.gelu(normed @ params['W1'] + params['b1'])
    ff = ff @ params['W2'] + params['b2']
    x = x + ff
    return x, weights

# Initialise parameters
d_model, d_ff, n_heads = 32, 128, 4
key = jax.random.PRNGKey(42)
keys = jax.random.split(key, 10)

params = {
    'W_q': jax.random.normal(keys[0], (d_model, d_model)) * 0.05,
    'W_k': jax.random.normal(keys[1], (d_model, d_model)) * 0.05,
    'W_v': jax.random.normal(keys[2], (d_model, d_model)) * 0.05,
    'W_o': jax.random.normal(keys[3], (d_model, d_model)) * 0.05,
    'ln1_g': jnp.ones(d_model), 'ln1_b': jnp.zeros(d_model),
    'ln2_g': jnp.ones(d_model), 'ln2_b': jnp.zeros(d_model),
    'W1': jax.random.normal(keys[4], (d_model, d_ff)) * 0.05,
    'b1': jnp.zeros(d_ff),
    'W2': jax.random.normal(keys[5], (d_ff, d_model)) * 0.05,
    'b2': jnp.zeros(d_model),
}

# Test with random input
x = jax.random.normal(keys[6], (2, 8, d_model))  # batch=2, seq_len=8
out, attn_weights = transformer_block(x, params)
print(f"Input shape:  {x.shape}")
print(f"Output shape: {out.shape}")
print(f"Attention weights shape: {attn_weights.shape}")  # (B, n_heads, T, T)

# Visualise attention patterns for each head
fig, axes = plt.subplots(1, 4, figsize=(16, 3.5))
for h in range(4):
    im = axes[h].imshow(attn_weights[0, h], cmap='Blues', vmin=0)
    axes[h].set_title(f"Head {h}")
    axes[h].set_xlabel("Key pos"); axes[h].set_ylabel("Query pos")
plt.suptitle("Multi-Head Attention Patterns")
plt.tight_layout(); plt.show()
```

2. 实现因果（自回归）注意力遮挡，并与双向注意力进行比较。展示如何通过遮挡防止信息从未来到过去令牌的流动。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

def attention(Q, K, V, mask=None):
    d_k = Q.shape[-1]
    scores = Q @ K.T / jnp.sqrt(d_k)
    if mask is not None:
        scores = jnp.where(mask, scores, -1e9)
    weights = jax.nn.softmax(scores, axis=-1)
    return weights @ V, weights

seq_len, d_model = 6, 8
key = jax.random.PRNGKey(0)
k1, k2, k3 = jax.random.split(key, 3)
Q = jax.random.normal(k1, (seq_len, d_model))
K = jax.random.normal(k2, (seq_len, d_model))
V = jax.random.normal(k3, (seq_len, d_model))

# Bidirectional (encoder-style): all positions visible
bidir_mask = jnp.ones((seq_len, seq_len), dtype=bool)
bidir_out, bidir_weights = attention(Q, K, V, bidir_mask)

# Causal (decoder-style): only past and current positions visible
causal_mask = jnp.tril(jnp.ones((seq_len, seq_len), dtype=bool))
causal_out, causal_weights = attention(Q, K, V, causal_mask)

fig, axes = plt.subplots(1, 3, figsize=(14, 4))
tokens = [f"t{i}" for i in range(seq_len)]

axes[0].imshow(bidir_weights, cmap='Blues', vmin=0, vmax=0.5)
axes[0].set_title("Bidirectional Attention\n(BERT-style)")
axes[0].set_xticks(range(seq_len)); axes[0].set_xticklabels(tokens)
axes[0].set_yticks(range(seq_len)); axes[0].set_yticklabels(tokens)

axes[1].imshow(causal_mask.astype(float), cmap='Greys', vmin=0, vmax=1)
axes[1].set_title("Causal Mask\n(1 = allowed, 0 = blocked)")
axes[1].set_xticks(range(seq_len)); axes[1].set_xticklabels(tokens)
axes[1].set_yticks(range(seq_len)); axes[1].set_yticklabels(tokens)

axes[2].imshow(causal_weights, cmap='Blues', vmin=0, vmax=0.5)
axes[2].set_title("Causal Attention\n(GPT-style)")
axes[2].set_xticks(range(seq_len)); axes[2].set_xticklabels(tokens)
axes[2].set_yticks(range(seq_len)); axes[2].set_yticklabels(tokens)

for ax in axes:
    ax.set_xlabel("Key"); ax.set_ylabel("Query")
plt.tight_layout(); plt.show()

# Verify: in causal attention, output at position i depends only on positions <= i
print("Causal attention weight at position 2 (should only attend to 0, 1, 2):")
print(f"  Weights: {causal_weights[2]}")
print(f"  Sum of future weights (should be ~0): {causal_weights[2, 3:].sum():.6f}")
```

3. 实现LoRA（低秩适应）并展示它如何使用远少于全精调参数修改权重矩阵。
```python
import jax
import jax.numpy as jnp

d_model = 256
rank = 4  # LoRA rank (much smaller than d_model)

key = jax.random.PRNGKey(42)
k1, k2, k3 = jax.random.split(key, 3)

# Original frozen weight matrix
W_frozen = jax.random.normal(k1, (d_model, d_model)) * 0.02

# LoRA matrices (only these are trainable)
B = jnp.zeros((d_model, rank))       # initialised to zero
A = jax.random.normal(k2, (rank, d_model)) * 0.01  # random init

# Forward pass: W_effective = W_frozen + B @ A
x = jax.random.normal(k3, (8, d_model))

# Without LoRA
y_original = x @ W_frozen.T

# With LoRA
W_effective = W_frozen + B @ A
y_lora = x @ W_effective.T

# Parameter counts
full_params = d_model * d_model
lora_params = d_model * rank + rank * d_model  # B + A

print(f"Model dimension: {d_model}")
print(f"LoRA rank: {rank}")
print(f"Full fine-tuning parameters: {full_params:,}")
print(f"LoRA parameters: {lora_params:,}")
print(f"Parameter reduction: {full_params / lora_params:.1f}x")
print(f"\nSince B is initialised to zeros, initial LoRA output matches original:")
print(f"  Max difference: {jnp.abs(y_original - y_lora).max():.2e}")

# Simulate training: only update A and B
def lora_forward(A, B, W_frozen, x):
    return x @ (W_frozen + B @ A).T

def dummy_loss(A, B, W_frozen, x, target):
    pred = lora_forward(A, B, W_frozen, x)
    return jnp.mean((pred - target) ** 2)

# Target: some transformation of x
target = x @ jax.random.normal(jax.random.PRNGKey(99), (d_model, d_model)).T * 0.02

grad_fn = jax.jit(jax.grad(dummy_loss, argnums=(0, 1)))
lr = 0.01

for step in range(200):
    gA, gB = grad_fn(A, B, W_frozen, x, target)
    A = A - lr * gA
    B = B - lr * gB

loss_before = dummy_loss(jnp.zeros_like(A), jnp.zeros_like(B), W_frozen, x, target)
loss_after = dummy_loss(A, B, W_frozen, x, target)
print(f"\nLoss before LoRA: {loss_before:.6f}")
print(f"Loss after LoRA:  {loss_after:.6f}")
print(f"Effective weight change rank: {jnp.linalg.matrix_rank(B @ A)}")
```
