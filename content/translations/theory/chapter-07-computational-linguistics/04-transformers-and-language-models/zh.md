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

*Transformer 用 self-attention 取代循环，成为语言理解与生成的主流架构。本篇涵盖 BERT、GPT、T5、位置编码（正弦、RoPE）、预训练目标（MLM、CLM）、微调、提示词工程和扩展定律；这些内容构成了现代 LLM 的蓝图。*

- 第 06 章介绍过 Transformer 架构：self-attention、多头 attention、位置编码以及 encoder-decoder 结构。这里聚焦 Transformer 如何适配特定的 NLP 范式，介绍定义现代 NLP 的模型（BERT、GPT、T5），以及让它们可以在大规模上运行的技术。

- 回顾一下核心运算：**缩放点积 attention**计算 $\text{softmax}(QK^T / \sqrt{d_k}) V$，其中 query、key 和 value 是输入的线性投影。**多头 attention**运行 $h$ 个并行 attention 头，每个头使用不同的可学习投影，再把结果拼接起来。Transformer block 用残差连接、层归一化和逐位置前馈网络（第 06 章）包裹这些操作。

- **层归一化**放在哪里，是一个细微但重要的架构选择。原始 Transformer 使用 **post-norm**：残差和归一化位于子层之后，即 $\text{LayerNorm}(x + \text{Sublayer}(x))$。

- 现代模型大多使用 **pre-norm**：在子层之前归一化，即 $x + \text{Sublayer}(\text{LayerNorm}(x))$。Pre-norm 训练时更稳定，因为残差连接沿恒等路径直接传递梯度，不会受到归一化影响。这让非常深的模型更容易训练，而不必精心设置学习率 warmup。

- 每个 Transformer block 中的**前馈子层**是一个逐 token 位置独立应用的两层 MLP：

$$\text{FFN}(x) = W_2 \cdot \text{GELU}(W_1 x + b_1) + b_2$$

- 内部维度通常是模型维度的 4 倍（例如 $d_{\text{model}} = 768$、$d_{\text{ff}} = 3072$）。这个 FFN 约占每个 block 参数的三分之二，并被认为像一个 key-value memory，存储训练中学到的事实知识。

- **位置编码**向模型提供 token 顺序信息，因为 attention 本身具有置换等变性。原始的**正弦编码**（第 06 章）使用不同频率的固定正弦和余弦函数。**学习式位置 embedding**则简单地为每个位置加一个可训练向量（BERT 和 GPT-2 使用）。两者都是绝对编码：位置 5 无论处于什么上下文，得到的向量都相同。

- **旋转位置编码（Rotary Position Embedding，RoPE）**通过在二维子空间中旋转 query 和 key 向量来编码位置。对于一对维度 $(q_{2i}, q_{2i+1})$，位置为 $m$、旋转角度为 $m\theta_i$（其中 $\theta_i = 10000^{-2i/d}$）时：

```math
\begin{bmatrix} q'_{2i} \\ q'_{2i+1} \end{bmatrix} = \begin{bmatrix} \cos m\theta_i & -\sin m\theta_i \\ \sin m\theta_i & \cos m\theta_i \end{bmatrix} \begin{bmatrix} q_{2i} \\ q_{2i+1} \end{bmatrix}
```

![RoPE：每个位置在二维子空间中以不同角度旋转 query 和 key 向量，因此 attention 分数依赖相对位置](../images/rope_rotation.svg)

- RoPE 的精妙之处在于：旋转后的 query 和 key 的点积 $q'^T k'$ 只依赖相对位置 $m - n$，而不依赖绝对位置。

- 要看清原因，可以把旋转写成 $q' = R_m q$ 和 $k' = R_n k$，其中 $R_m$ 是分块对角旋转矩阵。Attention 分数变为：

$$q'^T k' = (R_m q)^T (R_n k) = q^T R_m^T R_n \, k = q^T R_{n-m} \, k$$

- 最后一步使用了旋转群性质：$R_m^T R_n = R_{n-m}$（先逆向旋转 $m$，再正向旋转 $n$，等价于旋转 $n-m$）。

- 这意味着 attention 分数只依赖相对距离 $n-m$，而不分别依赖绝对位置 $m$ 和 $n$。

- 模型因此获得了自然的距离概念，不需要任何学习式位置参数，并且可以泛化到训练时没有见过的序列长度。

- **ALiBi**（Attention with Linear Biases，带线性偏置的 attention）采用更简单的方式：根据距离给 attention 分数增加固定线性惩罚，即 $\text{score}_{ij} = q_i^T k_j - m \cdot |i - j|$，其中 $m$ 是每个头独有的斜率。不同头使用不同斜率，让一些头关注局部、另一些头关注全局。ALiBi 不需要学习位置参数，并且能很好地泛化到训练长度之外的序列。

- 基于 Transformer 的语言模型有三种主流范式：**仅 encoder**、**仅 decoder**以及 **encoder-decoder**。它们的区别在于模型能看到什么（attention mask）以及如何训练。

![三种 Transformer 范式：用于分类的双向 attention encoder-only（BERT）、用于生成的因果 attention decoder-only（GPT），以及结合二者完成 seq2seq 任务的 encoder-decoder（T5）](../images/transformer_paradigms.svg)

- **BERT**（Bidirectional Encoder Representations from Transformers，Transformer 的双向编码器表示；Devlin 等，2019）是典型的 encoder-only 模型。它使用完整的双向 attention 处理文本：每个 token 都可以关注任意其他 token，包括左侧和右侧。这让 BERT 获得丰富的上下文表示，但也意味着它不能自回归地生成文本。

- BERT 使用两个目标进行预训练。**掩码语言模型（masked language modelling，MLM）**随机 mask 15% 的输入 token，并训练模型预测它们。在选中的 token 中，80% 替换为 [MASK] token，10% 替换为随机词，10% 保持不变（防止模型学会只在看到 [MASK] 时才预测）。训练目标为：

$$\mathcal{L}_{\text{MLM}} = -\sum_{i \in \mathcal{M}} \log P(w_i \mid w_{\backslash \mathcal{M}})$$

- 其中 $\mathcal{M}$ 是被 mask 位置的集合，$w_{\backslash \mathcal{M}}$ 是将这些位置 mask 后的句子。这是一个**去噪**目标：模型学习重建被破坏的输入。

![BERT 掩码语言模型：输入中 15% 的 token 被 mask，双向 Transformer 预测被 mask 位置的原始 token](../images/bert_mlm.svg)

- **下一句预测（Next Sentence Prediction，NSP）**训练 BERT 判断两个句子在原始文本中是否相邻。输入开头的特殊 [CLS] token 用于这项二分类。加入 NSP 是为了帮助处理需要理解句子关系的任务（如问答），但后来的研究（RoBERTa）表明它贡献很小，可以去掉。

- BERT 的预训练表示通过在模型顶部增加任务专用头（一个简单的线性层），再对整个模型进行微调，来适配下游任务。分类任务使用 [CLS] token 的表示；token 级任务（NER、POS tagging）使用每个 token 的表示。这种**微调**方法把预训练中学到的语言知识迁移到新任务上，所需标注数据相对较少。

- **GPT**（Generative Pre-trained Transformer，生成式预训练 Transformer；Radford 等，2018）是典型的 decoder-only 模型。它使用**因果（自回归）attention**：每个 token 只能关注更早位置的 token（以及自身）。这是通过在 attention 矩阵中 mask 未来位置实现的（在 softmax 之前把这些分数设为 $-\infty$）。训练目标很简单，即**因果语言模型**：根据所有前面的 token 预测下一个 token。

$$\mathcal{L}_{\text{CLM}} = -\sum_{i=1}^{n} \log P(w_i \mid w_1, \ldots, w_{i-1})$$

- 这与第 02 篇中的 n-gram 语言模型目标相同，只是参数化方式换成了 Transformer，因此能基于完整的前文，而不只是最后 $k-1$ 个 token。

- **GPT-2** 将规模扩展到 15 亿参数，展示了强大的 zero-shot 表现：无需微调，只要给出自然语言 prompt（“Translate English to French: ...”），它就能执行任务。

- **GPT-3**（1750 亿参数）表明，单纯扩大规模就能产生**上下文学习（in-context learning）**：在 prompt 中提供少量输入—输出示例，模型无需任何梯度更新就能执行新任务。

- **Encoder-decoder 模型**（如 **T5**，Text-to-Text Transfer Transformer，文本到文本迁移 Transformer；Raffel 等，2020）把每个 NLP 任务都表达成 text-to-text：输入是文本字符串（可能带有“translate English to German:”这样的任务前缀），输出也是文本字符串。Encoder 使用双向 attention 处理输入，decoder 通过对 encoder 的 cross-attention 自回归地产生输出。

- T5 使用**跨度破坏（span corruption）**进行预训练：随机连续 token 跨度被替换为 sentinel token，模型必须生成原始 token。例如，“The cat sat on the mat”可能变成输入 “The [X] on [Y]”，目标是 “[X] cat sat [Y] the mat”。这把 BERT 的 MLM 从单个 token 推广到了 token 跨度。

- **BART**（Lewis 等，2020）是另一种 encoder-decoder 模型，也使用去噪目标预训练，但采用了更广泛的破坏策略：token mask、token 删除、跨度 mask、句子置换和文档旋转。多样的破坏迫使模型学习更稳健的表示。

- 随着语言模型变大，**全量微调**（更新所有参数）变得不切实际：一个 175B 参数模型，仅保存优化器状态就需要数百 GB。**参数高效微调（parameter-efficient fine-tuning，PEFT）**方法只适配一小部分参数。

- **Adapter** 在已有 Transformer 层之间插入小型 bottleneck 层（通常是两个带非线性的线性层：先下投影到小维度，再上投影回来）。只训练 adapter 权重，冻结原始模型权重。新增参数少于 5%，但在大多数任务上能达到全量微调的表现。

- **LoRA**（Low-Rank Adaptation，低秩适配）直接修改权重矩阵，不增加新层。它不更新完整权重矩阵 $W$，而是学习更新量的低秩分解：$W' = W + BA$，其中 $B$ 为 $d \times r$，$A$ 为 $r \times d$，且 $r \ll d$（通常 $r = 4$ 到 $r = 64$）。原始 $W$ 冻结，只训练 $A$ 和 $B$。推理时可以把更新合并进原始权重，不增加延迟：

$$W' = W + BA$$

![LoRA：冻结的权重矩阵 W 通过小矩阵 A、B 构成的低秩路径旁路，训练参数减少 32 倍，同时达到全量微调效果](../images/lora_decomposition.svg)

- **Prefix tuning** 把一串可学习的“虚拟 token”前置到每个 attention 层的 key 和 value 矩阵。模型把这些 prefix 向量当作真实 token 一样关注，而只训练 prefix 参数。这类似 prompt tuning，但作用在 activation 空间，而不是 embedding 空间。

- **提示词工程**是在不更新任何参数的情况下，设计输入文本来诱导预训练模型产生期望行为的技术。

    - **Zero-shot prompting** 用自然语言描述任务（“Classify the sentiment of the following review:”）。

    - **Few-shot prompting** 在实际查询之前提供输入—输出示例。

    - **思维链（chain-of-thought，CoT）提示**加入“Let's think step by step”，或在示例中包含推理轨迹；通过引导模型分解问题，它能显著提高算术和逻辑推理任务的表现。

- **上下文学习（in-context learning，ICL）**是这样一种现象：大型语言模型可以从 prompt 中提供的示例学习执行任务，而不进行梯度更新。模型权重不会改变；它把示例当作一种隐式规范。

- ICL 在机制上如何工作仍是活跃的研究问题。一种假设是，attention 层在前向传播中实现了某种形式的梯度下降，相当于在上下文示例上“训练”。

- **扩展定律（scaling laws）**描述模型规模、数据规模、计算预算和表现（以 loss 衡量）之间可预测的关系。Kaplan 等（2020）发现，loss 对每个变量都遵循幂律：

$$L(N) \propto N^{-\alpha_N}, \quad L(D) \propto D^{-\alpha_D}, \quad L(C) \propto C^{-\alpha_C}$$

- 其中 $N$ 是参数数量，$D$ 是数据集大小，$C$ 是计算预算。这些幂律跨越多个数量级仍然成立，表明单纯扩大规模就能带来可预测的改进。

![扩展定律：对数坐标中 loss 按幂律下降，Kaplan 和 Chinchilla 的发现展示了随规模扩大而可预测的改进](../images/scaling_laws.svg)

- **Chinchilla 扩展定律**（Hoffmann 等，2022）修正了这一认识，指出大多数大型模型都训练不足。对于固定计算预算 $C$，模型规模和训练数据应以相同速度扩展：

$$N_{\text{opt}} \propto C^{0.5}, \quad D_{\text{opt}} \propto C^{0.5}$$

- 这意味着，如果计算预算翻倍，模型规模和数据集规模都应乘以 $\sqrt{2}$，而不只是增大模型。

- Kaplan 等曾建议让 $N$ 比 $D$ 增长更快，结果产生了非常大但训练不足的模型。Chinchilla（70B 参数、1.4T token）以相同计算预算达到了 Gopher（280B 参数、300B token）的表现，说明早期模型严重缺乏数据。

- 实用经验法则是：每个参数大约使用 20 个 token 进行训练。

- **混合专家（Mixture of Experts，MoE）**在不按比例增加计算量的情况下扩展模型容量。MoE 不使用一个大型前馈层，而是使用多个**专家** FFN 层和一个**门控网络（router）**，为每个 token 选择要激活的专家。

- 门控函数为每个专家计算路由分数，并选择 top-$k$ 个专家（通常 $k = 1$ 或 $k = 2$）：

$$G(x) = \text{TopK}(\text{softmax}(W_g x))$$

- 只有被选择的专家处理 token，所以计算成本取决于 $k$（激活专家的数量），而不是专家总数 $E$。一个拥有 8 个专家并进行 top-2 路由的模型，参数量是 dense 模型的 4 倍，但计算量只有 2 倍。

![MoE 层：输入 token 经过 router 计算每个专家的分数，选择 top-2 专家，对它们的输出按门控分数加权求和](../images/moe_layer.svg)

- MoE 的关键挑战是**负载均衡**：如果 router 把大多数 token 发给少数热门专家，其他专家就被浪费。训练时会增加辅助的**负载均衡损失**，鼓励各专家均匀使用：

$$\mathcal{L}_{\text{balance}} = E \cdot \sum_{i=1}^{E} f_i \cdot p_i$$

- 其中 $f_i$ 是分配给专家 $i$ 的 token 比例，$p_i$ 是专家 $i$ 的平均路由概率。当 token 比例和概率都均匀时（都等于 $1/E$），该乘积最小。

- **专家并行**把不同专家分布到不同加速器上。前向传播中，all-to-all 通信步骤把 token 路由到承载相应专家的设备，再把结果路由回来。这一通信成本是大规模 MoE 的主要工程挑战。Switch Transformer、Mixtral 和 GShard 等模型使用 MoE，在实际推理成本下取得了很强的表现。

- 构建模型只完成了一半工作；测量模型是否有效是另一半。NLP 评估尤其困难，因为语言具有歧义、主观性和开放性。

- 翻译可以有许多不同的正确表达。摘要即使与参考答案没有任何完全相同的词，也可能是好的摘要。

- 聊天机器人回答可以同时有帮助、无害且诚实，但合理的人类仍可能意见不一。

- **精确匹配（exact match，EM）**是最简单的指标：模型输出是否与标准答案完全一致？它适用于抽取式问答（SQuAD）或封闭形式数学题等答案短小且无歧义的任务。

- EM 很苛刻；除非先做归一化，否则 “New York City” 与 “new york city” 也会匹配失败。但它简单，因此定义明确。

- **token 级指标**把 NLP 当作 token 级分类问题，使用第 06 章的 precision、recall 和 F1。

- **Precision** 衡量模型预测的 token 中有多少正确：$P = \text{TP} / (\text{TP} + \text{FP})$。只预测少量实体但全部正确的模型具有高 precision。

- **Recall** 衡量标准 token 中有多少被模型找出：$R = \text{TP} / (\text{TP} + \text{FN})$。把每个 token 都预测为实体的模型 recall 完美，但 precision 很差。

- **F1** 是 precision 与 recall 的调和平均：

$$F_1 = \frac{2PR}{P + R}$$

- 调和平均（而不是算术平均）会惩罚不平衡：如果 $P$ 或 $R$ 有一个很低，$F_1$ 就会很低。对 NER（第 02 篇），F1 先按实体类型计算，再在类型之间做宏平均；对 POS tagging，因为每个 token 都有一个标签，token 级准确率更常用。

- **Span-level F1**（SQuAD 使用）比较预测跨度与标准跨度中的 token 集合。它比精确匹配宽容：如果标准答案是 “the Eiffel Tower”，模型预测 “Eiffel Tower”，尽管 EM 为零，span F1 仍然很高（5 个 token 中有 4 个重叠）。

- **BLEU**（Bilingual Evaluation Understudy，双语评估替代；Papineni 等，2002）是机器翻译的经典指标。它衡量候选翻译与一个或多个参考翻译之间的 n-gram 重叠。分数结合多个 n-gram 层级（从 unigram 到 4-gram）的 precision，并加入简短惩罚：

$$\text{BLEU} = \text{BP} \cdot \exp\!\left(\sum_{n=1}^{N} w_n \log p_n\right)$$

- 其中 $p_n$ 是**修正 n-gram precision**：候选中的每个 n-gram 计数会截断到任一参考中出现的最大次数，防止 “the the the the” 这类退化候选取得高分。权重 $w_n$ 通常均匀（$w_n = 1/N$，$N = 4$）。

- **简短惩罚** $\text{BP} = \min(1, \exp(1 - r/c))$ 会惩罚比参考更短的候选（$c$ 是候选长度，$r$ 是参考长度）。没有它，模型可以只输出少量安全词，同时获得很高 precision。

- BLEU 在语料库层面（对许多句子取平均）与人类判断的相关性尚可，但在句子层面较差。

- 它奖励完全相同的 n-gram，却捕捉不到有效释义：“the cat is on the mat”和“a feline sits atop the rug”即使含义相同，也没有任何二元语法重叠。

- BLEU 还完全忽略 recall——只输出最常见的词，也能在 precision 上得分不错。

- **ROUGE**（Recall-Oriented Understudy for Gisting Evaluation，面向召回的摘要评估替代；Lin，2004）是摘要的标准指标。不同于强调 precision 的 BLEU，ROUGE 强调 recall：参考 n-gram 中有多少出现在候选中？

- **ROUGE-N**计算 n-gram 的 recall：$\text{ROUGE-N} = \frac{|\text{n-grams}_{\text{ref}} \cap \text{n-grams}_{\text{cand}}|}{|\text{n-grams}_{\text{ref}}|}$。ROUGE-1（unigram）和 ROUGE-2（bigram）最常见。

- ROUGE-L 使用候选与参考之间的**最长公共子序列（longest common subsequence，LCS）**，可以捕捉句子层面的词序，而不要求词语连续出现。

- 用参考长度归一化 LCS 长度得到 recall，用候选长度归一化得到 precision，F-measure 再将两者结合。

- LCS 通过动态规划以 $O(mn)$ 时间计算（类似第 02 篇的编辑距离）：

$$R_{\text{LCS}} = \frac{\text{LCS}(X, Y)}{m}, \quad P_{\text{LCS}} = \frac{\text{LCS}(X, Y)}{n}, \quad F_{\text{LCS}} = \frac{(1 + \beta^2) R_{\text{LCS}} P_{\text{LCS}}}{R_{\text{LCS}} + \beta^2 P_{\text{LCS}}}$$

- 其中 $m$ 和 $n$ 是参考与候选的长度，$\beta$ 通常设置为偏向 recall（$\beta \to \infty$ 时得到纯 recall）。

- **METEOR**（Metric for Evaluation of Translation with Explicit ORdering，带显式顺序的翻译评估指标；Banerjee 和 Lavie，2005）通过加入同义词、词干提取和词序，弥补 BLEU 的缺点。

- 它先用完全匹配、词干匹配（使用第 02 篇的 Porter stemming）和同义词匹配（使用第 01 篇的 WordNet）对齐候选与参考中的单词。

- 然后计算偏向 recall 的 unigram precision 与 recall 的调和平均，并加入碎片惩罚，惩罚匹配词在候选中与参考顺序不同的情况。

- **ChrF**（Character n-gram F-score）在字符 n-gram 上而不是词 n-gram 上计算 F-score。因此它对形态变化更稳健（对第 01 篇所说的黏着语很重要），也能部分处理分词差异。ChrF++ 在字符 n-gram 的基础上加入词 bigram。

- 它已经与 BLEU 一起成为推荐的机器翻译指标，尤其适合形态丰富的语言。

- **困惑度（Perplexity）**（第 02 篇）衡量语言模型预测留出测试集的能力。它是语言模型的标准内在指标：$\text{PPL} = \exp(-\frac{1}{N} \sum_{i} \log P(w_i \mid w_{<i}))$。越低越好。

- 只有使用同一种分词方式的模型之间才能比较困惑度，因为对同一段文本，不同分词器会产生不同的序列长度 $N$。

- 词表更大的模型往往每 token 困惑度更低，但每个句子处理的 token 更少。

- **每字节比特数（bits-per-byte，BPB）**不按 token 数，而按文本中的 UTF-8 字节数归一化，因此与分词方式无关：

```math
\text{BPB} = \frac{-\sum_{i} \log_2 P(w_i \mid w_{<i})}{\text{number of UTF-8 bytes}}
```

- **BERTScore**（Zhang 等，2020）通过在 embedding 空间中计算相似度，超越表层 n-gram 匹配。候选中的每个 token 都与参考中上下文 embedding 余弦相似度最高的 token 匹配（通常使用预训练 BERT）。分数聚合为 precision、recall 和 F1：

$$R_{\text{BERT}} = \frac{1}{|r|} \sum_{r_i \in r} \max_{c_j \in c} \cos(r_i, c_j), \quad P_{\text{BERT}} = \frac{1}{|c|} \sum_{c_j \in c} \max_{r_i \in r} \cos(c_j, r_i)$$

- 其中 $r_i$ 和 $c_j$ 是参考与候选 token 的上下文 embedding。这能捕捉 n-gram 指标遗漏的语义相似度：“automobile”和“car”即使没有共同字符，由于 BERT embedding 相似，也会得到高分。

- **BLEURT**（Sellam 等，2020）更进一步，直接在人工质量判断上微调 BERT。给定参考—候选对，它输出一个标量质量分数。BLEURT 先在合成数据上训练（对参考翻译随机扰动，并用 BLEU、METEOR 等指标评分），再用人工评分微调。它与人类判断的相关性优于任何表层指标。

- **COMET**（Crosslingual Optimized Metric for Evaluation of Translation，跨语言优化翻译评估指标；Rei 等，2020）是一个机器翻译学习式指标，它以源句、参考和候选为条件，而不仅仅看参考与候选。它使用多语言 encoder（XLM-R）将三者编码，再预测质量分数。看到源句后，COMET 能发现只看参考的指标无法发现的含义错误（例如流畅但事实错误的翻译）。

- **LLM-as-judge** 是大规模评估的现代方法。不再针对参考答案计算指标，而是让强大的语言模型（GPT-4、Claude）评估模型输出质量。评审模型接收输入、模型回答以及可选的参考答案，并输出评分（例如 1–5）或成对偏好（回答 A 优于回答 B）。

- **成对比较**（Chatbot Arena 使用）是 LLM-as-judge 最可靠的格式。评审模型看到两个回答并选择更好者，而不是分别打绝对分数。这避免了校准问题（不同评审模型对“3 分”可能有不同基准）。结果聚合为**Elo rating**（源自国际象棋）：每个模型从基础分开始，根据与其他模型对战的胜负获得或失去分数。模型 A 对模型 B 的预期胜率为：

$$P(A \succ B) = \frac{1}{1 + 10^{(R_B - R_A) / 400}}$$

- 其中 $R_A$、$R_B$ 是 Elo rating。每次比较后，分数更新为：$R_A' = R_A + K(S - P(A \succ B))$，其中 $S \in \{0, 1\}$ 是实际结果，$K$ 控制更新幅度。持续击败强对手的模型会快速上升；输给弱对手的模型会下降。

- **位置偏差**是 LLM 评审的已知问题：它们往往偏好排在前面的回答（有些模型则偏好排在后面的回答）。**交换顺序**（将每一对回答以两种顺序评估两次）并对结果取平均，可以缓解这一问题。

- **冗长偏差**是另一个问题：即使简洁回答更好，评审模型也往往偏好更长、更详细的回答。

- **自一致性**检查评审模型在多次评估同一个输入时是否给出相同评分。高方差意味着评估信号噪声较大。

- **评审者间一致性**（Cohen's kappa 或 Krippendorff's alpha）衡量多个评审是否同意，为评估可靠性提供上界。

- **污染**是一个关键风险：如果评估数据出现在模型训练集中，基准分数会被抬高且失去意义。

- 这对使用网络抓取数据训练的 LLM 尤其严重，因为热门基准很可能已经出现在训练语料中。缓解策略包括：使用不公开发布的留出测试集；创建定期重新生成问题的动态基准；使用**金丝雀字符串**（嵌入基准数据中的唯一标识符来检测泄漏）；比较被污染子集与干净子集上的表现。

- **标准 NLU 基准**评估跨多种任务的语言理解能力。

- **GLUE**（General Language Understanding Evaluation）和 **SuperGLUE** 是多任务基准，覆盖情感（SST-2）、文本相似度（STS-B）、自然语言推理（MNLI、RTE）、指代消解（WSC）和问答（BoolQ）。

- 模型分别在每项任务上评估，再用聚合指标打分。GLUE 目前已被认为接近饱和（模型在大多数任务上超过人类表现）；SuperGLUE 仍然更具挑战。

- **MMLU**（Massive Multitask Language Understanding）用涵盖 57 个学科（数学、历史、法律、医学、计算机科学等）的选择题，评估知识与推理能力。

- 它测试模型是否在预训练中吸收了广泛知识。分数按学科报告，并给出宏平均。

- **MMLU-Pro** 增加了更难的多步推理问题，并把选项从 4 个增加到 10 个。

- **HellaSwag**通过要求模型选择场景最合理的后续内容，测试常识推理。错误答案由模型对抗式生成，使其表面上合理、语义上却不正确。

- **WinoGrande**使用只相差一个词的最小成对样本，测试常识指代消解。

- **ARC**（AI2 Reasoning Challenge）使用小学科学题，分为 easy 和 challenge 集，测试事实与推理能力。

- **推理与数学基准**评估解决问题的能力，这是区分强弱 LLM 的关键。

- **GSM8K**（Grade School Math 8K）包含 8,500 道小学数学文字题，需要多步算术推理。它是基础数学推理以及评估思维链提示（第 04 篇）的标准基准。

- **MATH** 是更困难的竞赛级数学数据集，覆盖代数、数论、几何、计数和概率。题目需要多步符号推理；MATH-500 是常报告的 500 题子集。

- **AIME**（American Invitational Mathematics Examination）题目属于竞赛级别，正确解答需要跨许多步骤的深度数学推理。DeepSeek-R1 在 AIME 2024 上取得 79.8%，表明经过 RL 训练的推理模型（第 05 篇）可以接近强人类选手。

- **HumanEval** 和 **MBPP**（Mostly Basic Programming Problems）通过检查模型生成的代码能否通过单元测试来评估代码生成。HumanEval 包含 164 道 Python 题，每题提供函数签名和 docstring，模型必须生成函数体。

- 指标是 **pass@k**：生成的 $k$ 个解中至少有一个通过全部测试的概率。单次采样的公式为：

$$\text{pass@}k = 1 - \frac{\binom{n-c}{k}}{\binom{n}{k}}$$

- 其中 $n$ 是生成样本总数，$c$ 是通过测试的样本数。该公式修正了简单地从 $k$ 个样本中取最优结果所产生的偏差。

- **SWE-bench** 更进一步：评估模型能否通过修改已有代码库来解决真实 GitHub issue，这是对实际软件工程能力更困难的测试。

- **GPQA**（Graduate-Level Google-Proof QA）包含生物、物理和化学领域的专家级问题，即使领域专家也觉得困难。它测试模型是否真正理解，而不是只做模式匹配；其中 “Diamond” 子集最难。

- **安全与对齐基准**评估模型是否有帮助、无害且诚实。

- **TruthfulQA** 测试模型是否会复现常见误解。题目特意设计为网络上最常见的回答是错的（例如“吞下口香糖会怎样？”常见误解是它会在体内停留 7 年，而事实是它会正常通过消化道）。记住流行但错误说法的模型得分会很低。

- **BBQ**（Bias Benchmark for QA）测试年龄、性别、种族和宗教等类别中的社会偏见。题目设计为带偏见的模型会系统地选择刻板印象答案。**Toxigen** 评估模型针对特定人口群体生成有毒内容的倾向。

- **MT-Bench** 使用 80 个精心设计的问题评估多轮对话能力，覆盖写作、角色扮演、推理、数学、编码、信息抽取、STEM 和人文学科。LLM 评审以 1–10 分评价回答。多轮格式测试模型能否追问、保持上下文并处理澄清请求。

- **Chatbot Arena**（LMSYS）让真实用户对匿名模型进行盲成对比较。用户提交 prompt，并在不知道回答来自哪个模型的情况下投票选择更好的回答。由此得到的 Elo 排名被认为是通用 LLM 质量在生态效度上最好的评估之一，因为它反映了真实用户对多样、未经策划 prompt 的偏好。

- **AlpacaEval**通过把模型输出与参考模型（GPT-4）在固定指令集上的输出比较，自动进行成对评估。评审模型决定胜率。

- **AlpacaEval 2.0** 使用长度控制的胜率，修正冗长偏差。

- **任务专用评估**需要针对专业领域设计指标。

- 语音识别使用**词错误率（Word Error Rate，WER）**：$\text{WER} = (S + D + I) / N$，其中 $S$、$D$、$I$ 是替换、删除和插入错误，$N$ 是参考词数。这是以参考长度归一化的编辑距离（第 02 篇），应用在词级别。

- 面向任务的对话系统使用 **Slot F1**，衡量模型是否能从用户话语中正确提取结构化信息（例如从“帮我订一张明天去巴黎的机票”中提取“目的地：巴黎”和“日期：明天”）。

- RAG 系统（第 05 篇）使用**引用准确率**，检查模型生成的引用是否真的支持相应论断。逐条将论断与检索段落核对，统计完全支持、部分支持和不支持的比例。

- **评估陷阱**很常见，足以使整组基准比较失效。

- **教模型应试**：优化基准分数而不是真实能力。在 MMLU 风格选择题上微调的模型可能在 MMLU 上得分很高，却无法解决以开放式格式提出的相同问题。

- **指标投机**：模型可以被优化为产生自动指标分数高的输出（BLEU 高、困惑度低），但输出本身未必好。BLEU 最优翻译往往是安全、泛化的释义，而不是自然流畅的表达。

- **基准饱和**：当模型接近或超过人类表现时，基准就不再提供信息。GLUE、SQuAD 1.1 和其他一些基准已经饱和。

- 研究领域会持续创造更难的基准，但“创建—饱和—替换”的循环使纵向比较变得困难。

- **人工评估**仍然是黄金标准，但成本高、速度慢且难以复现。不同评审群体（众包人员与领域专家、不同文化和不同语言）会产生不同判断。为了可复现，必须报告评审者间一致性和评审者人口统计信息。

## 编程任务（使用 CoLab 或 notebook）

1. 从零实现完整的 Transformer encoder block（多头 attention、前馈层、残差连接、层归一化），并将它应用于简单的序列分类任务。
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

2. 实现因果（自回归）attention mask，并与双向 attention 比较。展示 mask 如何阻止信息从未来 token 流向过去 token。
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

3. 实现 LoRA（Low-Rank Adaptation，低秩适配），展示它如何以远少于全量微调的可训练参数修改权重矩阵。
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
