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
# 模型和语言模型

*transformers 替换了递归，成为语言理解与生成的主导架构。本文件涵盖了BERT、GPT、T5、位置编码（正弦、RoPE）、预训练目标（MLM、CLM）、微调、提示工程和规模定律，现代LLMs背后的蓝图。*

- 在第06章中，我们介绍了transformer架构：自注意力、多头注意力、位置编码和encoder-decoder结构。在这里，我们将重点介绍如何将transformers适配特定的NLP范式，定义现代NLP的模型（BERT、GPT、T5），以及使它们在大规模上实用的技术。

- 回忆核心操作：**缩放点积注意力**计算$\text{softmax}(QK^T / \sqrt{d_k}) V$，其中查询、键和值是输入的线性投影。**多头注意力**并行运行$h$个注意力头，每个头都有不同的学习投影，并将结果连接起来。transformer块将其包裹在残差连接、层归一化和位置级前馈网络（第06章）。

- 一个微妙但重要的架构选择是**层归一化**的放置。原始Transformer使用**后归一化**：残差和归一化在子层之后，如$\text{LayerNorm}(x + \text{Sublayer}(x))$。

- 大多数现代模型使用**前归一化**：在子层之前进行归一化，如$x + \text{Sublayer}(\text{LayerNorm}(x))$。前归一化在训练期间更稳定，因为残差连接直接通过恒等路径传递梯度，而这些梯度不受归一化的影响。这使得它更容易训练非常深的模型，而不需要仔细的预热学习率。

- 每个transformer块中的**前馈子层**是一个独立应用于每个令牌位置的两个层MLP：

$$\text{FFN}(x) = W_2 \cdot \text{GELU}(W_1 x + b_1) + b_2$$
- 内部维度通常为模型维度的四倍（例如，$d_{\text{model}} = 768$、$d_{\text{ff}} = 3072$）。这个FFN大约占每个块参数的三分之二，并被认为是一个存储在训练过程中学习到的事实知识的关键值记忆。

- **位置编码**向模型提供关于令牌顺序的信息，因为注意力本身是置换不变的。原始**正弦编码**（第06章）使用固定频率的正弦和余弦函数。**学习性位置嵌入**简单地为每个位置添加一个可训练的向量（用于BERT和GPT-2）。两者都是绝对编码：无论上下文如何，位置5都得到相同的向量。

- **旋转位置嵌入（RoPE）**通过在二维子空间中旋转查询和键向量来编码位置。对于一对维度 $(q_{2i}, q_{2i+1})$，旋转的角度 $m\theta_i$（其中 $m$ 是位置，$\theta_i = 10000^{-2i/d}$ 是角度）应用如下：

```math
\begin{bmatrix} q'_{2i} \\ q'_{2i+1} \end{bmatrix} = \begin{bmatrix} \cos m\theta_i & -\sin m\theta_i \\ \sin m\theta_i & \cos m\theta_i \end{bmatrix} \begin{bmatrix} q_{2i} \\ q_{2i+1} \end{bmatrix}
```

![](../images/rope_rotation.svg)


- RoPE的优点在于，旋转后的查询和键向量之间的点积 $q'^T k'$ 只依赖于相对位置 $m - n$，而不依赖于绝对位置。

- 为了说明这一点，将旋转写为 $q' = R_m q$ 和 $k' = R_n k$，其中 $R_m$ 是块对角旋转矩阵。注意力分数变为：

$$q'^T k' = (R_m q)^T (R_n k) = q^T R_m^T R_n \, k = q^T R_{n-m} \, k$$
- 最后一步来自旋转群性质：$R_m^T R_n = R_{n-m}$（先旋转回 $m$ 然后向前旋转 $n$ 等价于旋转 $n - m$）。

- 这意味着注意力分数只依赖于相对距离 $n - m$，而不依赖于绝对位置 $m$ 和 $n$ 本身。

- 模型获得了自然的距离概念，而无需学习任何位置参数，并且可以泛化到在训练期间未见过的序列长度。

- **ALiBi**（带有线性偏置的注意力）采用了一种更简单的方法：它基于距离向注意力分数添加一个固定的线性惩罚，如 $\text{score}_{ij} = q_i^T k_j - m \cdot |i - j|$，其中 $m$ 是头特异斜率。不同的头使用不同的斜率，允许某些头专注于局部，而其他头则全局关注。ALiBi不需要学习任何位置参数，并且在训练期间见过的序列长度之外表现良好。

- 变换器基语言模型的三种主导范式是 **仅编码器**、**仅解码器** 和 **编码器-解码器**。它们的不同之处在于模型可以看到的内容（注意力掩码）和如何进行训练。

![](../images/transformer_paradigms.svg)


- **BERT**（基于Transformer的双向编码表示，Devlin et al., 2019）是典型的仅编码器模型。它以全双方向注意力处理文本：每个标记都可以与所有其他标记相互关注，无论是左边还是右边。这为BERT提供了丰富的上下文表示，但意味着它不能自回归生成文本。

- BERT通过两个目标进行预训练。**掩码语言建模（MLM）**随机遮蔽输入的15%标记，并训练模型预测它们。从选择的标记中，80%被替换为 [MASK] 标记，10%被替换为随机单词，10%保持不变（以防止模型仅在看到 [MASK] 时学习）。训练目标是：

$$\mathcal{L}_{\text{MLM}} = -\sum_{i \in \mathcal{M}} \log P(w_i \mid w_{\backslash \mathcal{M}})$$
- 其中 $\mathcal{M}$ 是被遮蔽的位置集合，$w_{\backslash \mathcal{M}}$ 是这些位置被遮蔽后的句子。这是一个 **去噪** 目标：模型学习重建被损坏的输入。

![](../images/bert_mlm.svg)


- **句子预测（NSP）** 训练 BERT 预测两个句子是否在原始文本中连续。输入的开头使用一个特殊的 [CLS] 令牌进行二分类。NSP 被用于帮助理解句子关系的任务，尽管后来的工作（RoBERTa）表明它贡献不大且可以删除。

- BERT的预训练表示通过在顶部添加任务特定头（一个简单的线性层）进行调整，并对整个模型进行微调。对于分类任务，使用[CLS]标记的表示。对于词级任务（命名实体识别、词性标注等），每个词的表示被使用。这种**微调**方法利用了预训练期间学习到的语言知识，在相对较少标注数据的情况下将这些知识转移到新的任务中。

- GPT（生成预训练变换器，Radford et al., 2018）是标准的解码器-only模型。它使用因果注意力：每个令牌只能关注之前的位置（以及自己）。这通过在注意力矩阵中遮挡未来位置来强制执行（将它们的分数设置为$-\infty$之前进行softmax）。训练目标非常简单，即给定所有先前令牌的情况下预测下一个令牌。

$$\mathcal{L}_{\text{CLM}} = -\sum_{i=1}^{n} \log P(w_i \mid w_1, \ldots, w_{i-1})$$
- 这是文件 02 中相同的 n-gram 语言模型目标，但使用了可以条件于整个前文而不是仅最后一个 $k-1$ 令牌的变换器参数化。

- **GPT-2** 将参数增加到1.5亿，并展示了强大的零-shot性能：在没有进行任何微调的情况下，它可以通过条件自然语言提示（例如“将英语翻译为法语：...”）来执行任务。

- **GPT-3** (175亿参数) 显示了规模本身就能实现 **上下文学习**：通过在提示中提供几个输入输出示例，模型可以在不进行任何梯度更新的情况下执行新的任务。

- **编码器-解码器模型**，如T5（文本到文本转移变换器，Raffel等，2020），将每个NLP任务视为文本到文本：输入是一个文本字符串（可能带有任务前缀如“翻译英语为德语：”），输出也是一个文本字符串。编码器通过双向注意力处理输入，解码器自回归生成输出，并通过交叉注意力与编码器交互。

- T5 在预训练时使用了 **跨度遮蔽**：随机连续的标记被替换为哨兵标记，模型必须生成原始标记。例如，“猫坐在垫子上”可能变成“[X]在[Y]”作为输入，目标是“[X]猫坐在[Y]垫子上”。这将BERT的MLM扩展到跨度而不是单个标记。

- **BART**（Lewis et al., 2020）是另一个编码器-解码模型，它通过一个去噪目标预训练。然而，它应用了更广泛的污染策略：标记遮蔽、标记删除、段落遮蔽、句子置换和文档旋转。这些多样化的污染迫使模型学习更加鲁棒的表示。

- 随着语言模型的规模越来越大，**全参数微调**（更新所有参数）变得不可行：一个175B参数模型需要数百个吉字节来存储优化器状态。**参数效率微调 (PEFT)** 方法只适应少量参数。

- 适配器在现有Transformer层之间插入小瓶颈层（通常为两个线性层和一个非线性），仅训练适配器权重，而保留原始模型权重不变。这在大多数任务上与全精调性能相当，但新增参数少于5%。

- **LoRA**（低秩适应）通过修改权重矩阵本身而不添加新层来工作。而不是更新整个权重矩阵 $W$，LoRA学习了更新的低秩分解： $W' = W + BA$，其中 $B$ 是 $d \times r$ 和 $A$，而 $r \times d$ 与 $r \ll d$（通常为 $r = 4$ 到 $r = 64$）相关联。原始的 $W$ 是冻结的；只有 $A$ 和 $B$ 被训练。在推理时，更新可以直接合并到原始权重中，无需额外延迟：

$$W' = W + BA$$
![LoRA通过小矩阵A和B的低秩路径绕过冻结权重矩阵W，减少了32倍的可训练参数，但与全精调一致。](../images/lora_decomposition.svg)


- **前缀调整**在每个注意力层的键和值矩阵中添加一系列可学习的“虚拟令牌”。模型将这些前缀向量视为真实令牌进行注意，而只训练前缀参数。这类似于提示调整，但操作在激活空间而不是嵌入空间。

- **prompt工程**是设计能够激发预训练模型所需行为的输入文本的艺术，而不进行任何参数更新。

    - **零样本提示**描述了任务的自然语言（“请对以下评论进行情感分类”。）

    - **少样本提示**在实际查询之前提供输入-输出示例。

    - **链式思考（CoT）**提示在示例中添加“让我们一步步思考”或包括推理痕迹，这大大提高了在算术和逻辑推理任务上的性能，因为它引导模型分解问题。

- **上下文学习（ICL）**是大型语言模型从提示中提供的示例中学习执行任务的现象，而无需进行梯度更新。模型的权重不会改变；它使用这些示例作为一种隐式的规范。

- ICL的工作原理仍然是一个活跃的研究问题；一种假设是注意力层在前向传播中实现了一种形式的梯度下降，有效地“训练”在上下文示例上。

- **缩放定律**描述了模型大小、数据大小、计算预算和性能（通过损失测量）之间的可预测关系。Kaplan等人（2020年）发现，损失遵循每个变量的幂律关系：

$$L(N) \propto N^{-\alpha_N}, \quad L(D) \propto D^{-\alpha_D}, \quad L(C) \propto C^{-\alpha_C}$$
- 其中$N$是参数数量，$D$是数据集大小，$C$是计算预算。这些幂律关系在许多数量级上都成立，暗示简单地扩大规模会带来可预测的改进。

![幂律关系：随着缩放，损失按对数坐标轴上的幂律减少， Kaplan 和 Chinchilla 的发现表明在缩放方面有可预测的改进](../images/scaling_laws.svg)


- **Chinchilla缩放定律**（Hoffmann et al., 2022）修正了这一观点，表明大多数大型模型是过拟合的。对于固定计算预算$C$，最优分配应将模型大小和训练数据等比例增加：

$$N_{\text{opt}} \propto C^{0.5}, \quad D_{\text{opt}} \propto C^{0.5}$$
- 这意味着如果你双倍你的计算预算，你应该同时增加模型大小和数据集大小的比例为$\sqrt{2}$，而不是单纯让模型变大。

- Kaplan等人建议将$N$的缩放速度更快于$D$，导致非常大的但过拟合的模型。Chinchilla（70B参数，1.4T tokens）与Gopher（280B参数，300B tokens）在相同的计算预算下表现相同，证明了早期的模型严重缺乏数据。

- 实际上，每20个参数大约需要训练20个标记。

- **混合专家（MoE）** 是一种架构，它通过不按比例增加计算能力来扩展模型容量。而不是使用一个大型的前馈层，MoE 使用多个 **专家** FFN 层和一个 **路由网络**（路由器），该路由器选择为每个标记激活哪些专家。

- 门控函数计算每个专家的路由分数，并选择排名最高的-$k$（通常为 $k = 1$ 或 $k = 2$）：

$$G(x) = \text{TopK}(\text{softmax}(W_g x))$$
- 只有选定的专家处理令牌，因此计算成本与活跃专家的数量（$k$）成正比，而不是所有专家的数量（$E$）。一个包含8个专家和前2个路由的模型参数是密集模型的4倍，但计算量只有2倍。

![MoE 层：输入令牌通过计算每个专家的得分的路由传递，选择前 2 个专家，它们的输出按 gating 分数加权并相加](../images/moe_layer.svg)


- A critical challenge in MoE is **load balancing**: if the router sends most tokens to a few popular experts, the others are wasted. Training adds an auxiliary **load balancing loss** that encourages uniform expert utilisation:

$$\mathcal{L}_{\text{balance}} = E \cdot \sum_{i=1}^{E} f_i \cdot p_i$$
- where $f_i$ is the fraction of tokens assigned to expert $i$ and $p_i$ is the average routing probability for expert $i$. This product is minimised when both the token fractions and probabilities are uniform (each equal to $1/E$).

- **专家并行**将不同专家分布在不同的加速器上。在前向传播过程中，一个所有对通信步骤将令牌路由到其分配的专家设备，然后将结果返回。这种通信成本是MoE大规模时的主要工程挑战。像Switch Transformer、Mixtral和Gshard这样的模型使用MoE以实现强大的性能，并且具有实际推理成本。

- 构建模型是半场工作；测量它们是否有效是另一半工作。NLP评估特别困难，因为语言是模糊的、主观的和开放的。

- 一个翻译可以以多种方式正确。总结也可以很好，即使它与参考文献共享了几乎没有任何确切的单词——但它的简单性使其具有明确性。

- 一个聊天机器人回复可以是有帮助、无害和诚实的，然而合理的人都会不同意。

- **精确匹配（EM）**是最简单的指标：模型的输出是否完全匹配金标准答案？它用于任务，如提取式问答（SQUAD）或封闭形式数学。

- EM是严厉的；“纽约市”和“纽约市”除非应用标准化，否则不会匹配——但它的简单性使其具有明确性。

- **标记级指标**将NLP视为标记级别的分类问题，使用第6章中的精确率、召回率和F1值。

- **精确率**衡量模型预测的令牌中正确了多少：$P = \text{TP} / (\text{TP} + \text{FP})$。一个预测很少实体但全部正确的模型具有高精确率。

- **召回率**衡量模型在金标准令牌中找到多少：$R = \text{TP} / (\text{TP} + \text{FN})$。一个预测每个令牌为实体的模型具有完美的召回率，但糟糕的精确率。

- **F1**是精确率和召回率的调和平均值：

$$F_1 = \frac{2PR}{P + R}$$
- 调和平均数（而不是算术平均数）惩罚不平衡：如果$P$或$R$低，$F_1$也低。对于NER（文件02），F1是按实体类型计算的，并且在类型之间进行宏平均。对于POS标记，标记级准确性更常见，因为每个令牌都得到一个标签。

- **段落级F1**（用于SQUAD）比较预测段落中的令牌集与金标准段落中的令牌集。这比精确匹配要宽容得多：如果金标准答案是“埃菲尔铁塔”而模型预测“埃菲尔铁塔”，则段落F1高（4个重叠的令牌中有5个），尽管EM为零。

- **BLEU**（双语评估理解，Papineni et al., 2002）是机器翻译的经典指标。它测量候选翻译与一个或多个参考翻译之间的n-gram重叠。得分结合了多个n-gram级别的精确率（从单个到4个），以及一个简短性惩罚：

$$\text{BLEU} = \text{BP} \cdot \exp\!\left(\sum_{n=1}^{N} w_n \log p_n\right)$$
- 在何处 $p_n$ 是“修正的n-gram精确率”：在候选中每个n-gram的计数被限制在其任何参考中的最大计数，以防止像“the the the the”这样的退化候选得分过高。权重 $w_n$ 通常都是均匀的（$w_n = 1/N$，有 $N = 4$).

- **短语惩罚** $\text{BP} = \min(1, \exp(1 - r/c))$ 对于候选词长度小于参考词（$c$ 是候选词长度，$r$ 是参考词长度）的模型进行惩罚。没有这个惩罚，模型可能会通过输出非常少、非常安全的词语来实现高精度。

- BLEU与人类在语料库级别的判断相关，但对句子级的判断效果较差。

- 它奖励精确的 n-gram 匹配和无效的 paraphrases："猫在地毯上" 和 "一只小猫坐在垫子上" 虽然意思相同，但没有大写词重叠。

- BLEU 也完全忽略了召回率 —一个只产生最常见单词的候选者在精度方面表现良好。

- **ROUGE**（基于召回率的摘要评估，Lin，2004）是文本总结的标准度量。与BLEU不同，ROUGE更注重召回率：候选文本中包含了多少个参考文本中的n-gram？

- **ROUGE-N**计算n-gram的召回率：$\text{ROUGE-N} = \frac{|\text{n-grams}_{\text{ref}} \cap \text{n-grams}_{\text{cand}}|}{|\text{n-grams}_{\text{ref}}|}$。ROUGE-1（单字）和ROUGE-2（双字）是最常见的。

- ROUGE-L使用候选和参考之间的最长公共子序列（LCS），可以捕捉句子级别的单词顺序，而不需要连续匹配。

- 计算参考长度的最长公共子序列（LCS）长度，然后除以参考长度得到召回率；计算候选长度的LCS长度，然后除以候选长度得到精确率；最后，F-measure是召回率和精确率的组合。

- LCS（最长公共子序列）通过动态规划在 $O(mn)$ 时间内计算（类似于文件 02 中的编辑距离）。

$$R_{\text{LCS}} = \frac{\text{LCS}(X, Y)}{m}, \quad P_{\text{LCS}} = \frac{\text{LCS}(X, Y)}{n}, \quad F_{\text{LCS}} = \frac{(1 + \beta^2) R_{\text{LCS}} P_{\text{LCS}}}{R_{\text{LCS}} + \beta^2 P_{\text{LCS}}}$$
- where $m$ and $n$ are the lengths of reference and candidate, and $\beta$ is typically set to favour recall ($\beta \to \infty$ gives pure recall).

- **METEOR** (Metric for evaluation of Translation with explicit ORdering, Banerjee and Lavie, 2005) addresses BLEU's weaknesses by incorporating synonyms, stemming, and word order.

- 首先，它使用精确匹配、词干匹配（通过文件 02 中的 Porter 算法）和同义词匹配（通过文件 01 中的 WordNet）来对候选词与参考词进行对齐。

- 然后，它计算一个加权的调和平均值，权重向召回率倾斜，并应用一个碎片化惩罚，该惩罚对匹配单词在参考中出现顺序不同的候选者进行惩罚。

- **ChrF** (字符 n-gram F-score) 计算基于字符 n-grams 的 F-score，而不是基于词 n-grams。这使得它在处理形态变异（对于来自文件 01 的语料库至关重要）和部分处理 tokenisation 差异方面更加稳健。ChrF++ 在字符 n-grams 中添加了单词二元组。

- 它已成为机器翻译中推荐的指标之一，尤其是在形态丰富的语言中，除了 BLEU 之外。

- 困惑度（文件 02）衡量语言模型在未见测试集上预测的准确性。它是语言模型的标准内在指标：$\text{PPL} = \exp(-\frac{1}{N} \sum_{i} \log P(w_i \mid w_{<i}))$。越低越好。

- -困惑度仅在使用相同分词器的模型之间可比，因为不同分词器为同一文本生成不同的序列长度 $N$ .

- -具有更大词汇表的模型每令牌的困惑度较低，但处理的句子中的令牌较少。

- **比特每字节**（BPB）通过文本中UTF-8字节数而不是标记数进行归一化，使其与标记无关：



```math
\text{BPB} = \frac{-\sum_{i} \log_2 P(w_i \mid w_{<i})}{\text{number of UTF-8 bytes}}
```

- **BERTScore**（张等人，2020）超越表面级n-gram匹配，通过计算嵌入空间中的相似性来实现。候选文本中的每个标记与参考文本中最相似的标记进行匹配，使用上下文嵌入（通常来自预训练的BERT模型）的余弦相似度。这些分数被聚合为精确率、召回率和F1：



$$R_{\text{BERT}} = \frac{1}{|r|} \sum_{r_i \in r} \max_{c_j \in c} \cos(r_i, c_j), \quad P_{\text{BERT}} = \frac{1}{|c|} \sum_{c_j \in c} \max_{r_i \in r} \cos(c_j, r_i)$$
- $r_i$ 和 $c_j$ 是引用和候选令牌的上下文嵌入。这捕捉了 n-gram 指标无法捕获的语义相似性："汽车"和"车"得分很高，因为它们的 BERT 嵌入相似，尽管它们没有共享字符。

- **BLEURT**（Sellam et al., 2020）进一步通过直接在人类质量判断上微调BERT模型来实现。给定参考和候选对，它输出一个标量质量分数。BLEURT使用合成数据（随机扰动的参考翻译，由BLEU和METEOR等指标评估）进行训练，然后根据人类评分进行微调。它与人类判断的相关性更好，优于任何表面级指标。

- COMET（跨语言优化评估翻译的度量，Rei et al., 2020）是一种用于机器翻译的学习型度量，它不仅条件于参考和候选，还条件于源句子。它使用多语言编码器（XLM-R）来嵌入所有三个，并预测一个质量分数。通过看到源句子，COMET可以检测出仅凭参考无法发现的含义错误（例如，流畅但事实错误的翻译）。

- **LLM-as-judge** 是大规模评估的现代方法。不再计算与参考相比的指标，而是通过强大的语言模型（如 GPT-4、Claude）来评估模型输出的质量。评判者接收输入、模型的响应以及可选的参考答案，并产生评分（例如 1-5）或一对比偏好（响应 A 比响应 B 更好）。

- **一对比**（在聊天机器人竞技场中使用）是最可靠的LL作为评判的格式。评判者看到两个响应并选择更好的一个，而不是给每个响应分配绝对分数。这避免了 calibration问题（不同评判者可能有不同的基准线“3 out of 5”）。结果汇总为**Elo评级**（如象棋），其中每个模型开始时有一个基础评级，并根据与其他模型的胜率和输率而增减积分。模型$A$与模型$B$之间的预期获胜概率是：

$$P(A \succ B) = \frac{1}{1 + 10^{(R_B - R_A) / 400}}$$
- 在何处 $R_A, R_B$ 是的，这些是 Elo 分数。每次比较后，分数会更新： $R_A' = R_A + K(S - P(A \succ B))$在何处 $S \in \{0, 1\}$ 是实际结果和 $K$ 控制更新幅度。表现优异的模型会迅速崛起；表现不佳的模型则会迅速衰落。

- **位置偏见** 是 LLM 评估器已知的问题：它们倾向于优先考虑第一个（或在某些模型中，第二个）呈现的响应。通过交换（对每个对进行两次评估，但以两种顺序呈现响应）并取平均值来缓解这一点。

- **冗余倾向** 是另一个：法官倾向于偏好更长、更详细的答案，即使更好的答案是简洁的。

- 自一致性检查确保法官在多次评估相同输入时给出相同的评分。高方差表明评价信号噪声较大。

- **互评一致性**（科恩的 kappa 或克里普多夫系数）衡量多个评审员是否一致，提供评估可靠性的上限。

- **污染** 是一个关键问题：如果评估数据出现在模型的训练集中，基准分数会膨胀且毫无意义。

- 这尤其对通过网络爬虫数据训练的LLMs来说是一个问题，因为流行的基准测试很可能会存在。缓解策略包括：使用不公开发布的测试集、创建定期重新生成问题的动态基准测试、** Canary字符串**（在基准数据中嵌入的独特标识符以检测泄漏），以及比较受污染和干净子集上的性能。

- 标准的NLU基准测试评估语言理解在多种任务上的表现。

- **GLUE**（通用语言理解评估）和**SuperGLUE**是涵盖情感分析（SST-2）、文本相似度（STS-B）、自然语言推理（MNLI、RTE）、核心ference（WSC）和问答（BoolQ）的多任务基准。

- 模型在每个任务上分别评估，并通过聚合指标进行评分。GLUE现在被认为饱和（大多数任务上的模型性能超过人类）；SuperGLUE仍然更具挑战性。

- **MMLU**（大规模多任务语言理解）通过使用多项选择题评估57个学术领域的知识和推理能力。

- 测试模型在预训练期间是否吸收了广泛的知识。每个主题的得分和宏平均分都会报告。

- MMLU-Pro 添加了更难、多步推理问题，每个问题有10个答案选项，而不是4个。

- **HellaSwag** 通过让模型选择最合理的场景延续来测试常识推理。错误答案是通过对抗生成模型生成的，表面上看起来很合理但语义上不正确。

- WinoGrande 使用最小配对测试常识核心语义分辨率，这些配对仅相差一个单词。

- ARC（AI2推理挑战）使用小学科学问题的简单和困难集，测试事实和推理能力。

- **推理和数学基准**评估问题解决能力，区分强LLM与弱LL。

- **GSM8K**（小学数学8K）包含8,500个需要多步算术推理的初级数学问题。它是基本数学推理的标准基准，并用于评估链式思维提示（文件04）。

- **数学** 是一个包含竞赛级数学问题的更难数据集，涉及代数、数论、几何、计数和概率。这些问题需要多步符号推理，MATH-500 是一个常见的500题子集。

- **AIME**（美国邀请数学考试）问题属于竞赛级别的：正确解答需要深厚的数学推理和多步思考。DeepSeek-R1在2024年AIME中得分79.8%，表明基于RL训练的推理模型（文件05）可以接近强人类竞争对手。

- **HumanEval** 和 **MBPP**（基本编程问题）通过检查模型代码是否通过单元测试来评估代码生成。HumanEval包含164个Python问题，带有函数签名和文档字符串；模型必须生成函数体。

- 该指标是**pass@k**：至少有一个由 $k$ 生成的解决方案通过所有测试的概率。对于单个样本：

$$\text{pass@}k = 1 - \frac{\binom{n-c}{k}}{\binom{n}{k}}$$
- $n$ 是生成样本的总数，而 $c$ 是通过筛选后的样本数。这个公式用于修正单纯选择 $k$ 个样本时可能存在的偏差。

- **SWE-bench** 进一步评估模型是否能解决真实的 GitHub 问题，通过修改现有的代码库来实现 — 这是一个对实际软件工程能力的更难测试。

- **GPQA** (Graduate-Level Google-Proof QA) 包含了生物学、物理学和化学领域的专家级问题，这些问题对于领域专家来说都非常困难。它测试的是模型是否真正理解，而不是模式匹配。"Diamond" 子集是最难的。

- 安全性和对齐基准评估模型是否有用、无害且诚实。

- **真理问答** 测试模型是否能正确重现常见误解。问题设计得使得最常见的互联网答案是错误的（例如，“吞咽口香糖会怎么样？”常见的误解是它会停留7年，但真相是它会正常通过）。那些记住流行但不正确的说法的模型得分较低。

- **BBQ**（社会偏见基准测试）评估在年龄、性别、种族和宗教等类别中是否存在社会偏见。问题结构使得偏见模型会系统性地选择刻板印象的答案。**Toxigen**评估模型生成特定群体关于有害内容的倾向。

- **MT-Bench**评估多轮对话能力，使用80个精心设计的问题，涵盖写作、角色扮演、推理、数学、编码、提取、STEM和人文科学。一个LLM裁判（GPT-4）对回答进行评分，从1到10分不等。多轮格式测试模型是否能够跟进、保持上下文并处理澄清请求。

- **Chatbot Arena**（LMSYS）通过真实用户进行匿名模型之间的盲配对。用户提交提示并投票选择更好的响应，但不知道哪个模型产生了它。最终的 Elo排行榜被认为是评估通用大语言模型质量最生态有效的评价方式，因为它反映了真实用户在多样、未经筛选的提示上的偏好。

- AlpacaEval 通过比较模型输出与参考模型（GPT-4）在固定指令集上的结果，自动进行两两评估。一个判别模型决定胜率。

- AlpacaEval 2.0 使用长度控制的胜率来纠正冗余偏差。

- **任务特定评估**需要针对特定领域的专用指标。

- **词错误率（WER）**：对于语音识别，$\text{WER} = (S + D + I) / N$，其中 $S$、$D$ 和 $I$ 分别代表替换、删除和插入错误，$N$ 是参考单词的数量。这是在词级别上应用的编辑距离（文件 02），按参考长度归一化后的结果。

- **槽位F1** 用于任务型对话系统，衡量模型是否正确从用户语句中提取结构化信息（例如，从“预订巴黎的机票明天”中提取“目的地：巴黎”和“日期：明天”）。

- **引用准确性**（文件 05）用于检查 RAG 系统生成的引用是否支持所作陈述。陈述与检索到的段落进行比较，该指标计算支持、部分支持或不支持陈述的陈述数量比例。

- 评估中的常见问题可能导致整个基准比较无效。

- **测试导向的教学**：优化基准性能，而不是真实能力。一个在MMLU风格的多项选择题上微调的模型，在MMLU中表现良好，但在以开放形式提出相同问题时可能会失败。

- **指标游戏**：模型可以优化以产生在自动指标（高BLEU，低困惑度）上表现良好的输出，而不是真正好的自然流畅的翻译。BLEU最优的翻译通常是一个安全、通用的 paraphrase，而不是真正的自然流畅的翻译。

- **基准饱和度**：当模型接近或超过基准性能时，基准就不再具有信息价值。GLUE、SQUAD 1.1和其他一些基准已经饱和。

- 这个字段不断创造更难的基准，但创建、饱和和替换的循环使得纵向比较变得困难。

- **人类评估**仍然是黄金标准，但成本高昂、耗时且难以复制。不同注释员池（工人队列 vs 专家领域，不同文化，不同语言）产生不同的判断。报告间注释员一致性并提供注释员 demographics是可重复性的关键。

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