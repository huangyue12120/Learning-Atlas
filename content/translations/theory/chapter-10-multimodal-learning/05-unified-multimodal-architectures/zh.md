---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 10 - multimodal learning/05. unified multimodal architectures.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 43cace9aa08c04a4bc8361291850b51ac4d26dffcbabb779e2019adf67442f8b
status: reviewed
---
# 统一多模态架构

*统一多模态架构用单一系统取代多个专用模型，让系统能够处理文本、图像、音频和视频，完成理解、推理与生成。本文介绍任意到任意模型（CoDi、NExT-GPT）、原生多模态大语言模型（Gemini、GPT-4o）、多模态词元化策略，以及统一架构面临的权衡。*

## 为何需要统一架构

- 早期多模态系统像五位分处不同房间的译者，各自处理一种语言，再通过墙上的传递口交换纸条。**统一多模态架构**则像一位通晓多种语言的译者：一个模型共享权重，在同一次前向计算中处理文本、图像、音频、视频，甚至动作，并完成理解、生成和推理。

- 统一架构有实际和理论两方面的动机。实际来看，为每一对模态分别维护专用模型（文本到图像、图像到文本、音频到文本等），会让系统数量快速增加：$k$ 种模态最多需要 $k(k-1)$ 条有向流程。统一模型把这些流程整合到一个系统中。理论上，人类不会把视觉和语言完全分开处理；跨模态绑定很早就会发生，并深入影响理解。统一架构试图模拟这种处理方式。

- 共享权重有助于**跨模态迁移**。Transformer 从文本中学到时间关系（主语先于谓语、原因先于结果）后，可以把相同的注意力机制用于视频中的时间关系（物体先出现，再开始移动）或音频中的时间关系（起音先于延音）。这与第 07 章语言模型微调和第 08 章 ImageNet 预训练介绍的迁移学习类似。

- 形式化地，令 $\mathcal{M} = \{m_1, m_2, \ldots, m_k\}$ 表示一组模态。统一模型定义一个参数化函数 $f_\theta$，将任意输入模态子集映射为任意输出模态子集：

$$f_\theta : \mathcal{P}(\mathcal{M}) \rightarrow \mathcal{P}(\mathcal{M})$$

- 其中，$\mathcal{P}(\mathcal{M})$ 是模态集合的幂集，也就是所有子集组成的集合。模型的大部分参数 $\theta$ 由各模态共享，只有少量模态专用适配器层不同。

![统一多模态架构概览：文本、图像、音频和视频输入共享的 Transformer 主干，再生成任意模态的输出](../images/unified_multimodal_overview.svg)

- 统一架构需要处理模态间的结构差异。文本是一维离散词元序列；图像是二维连续像素网格；音频是一维连续波形，时间尺度与文本相差很大；视频则在图像上增加了时间维度。如何把这些结构整理成 Transformer 能处理的单一序列，是这一领域的主要工程难题。

## 任意到任意模型

- **任意到任意模型**就像一只万能遥控器：同一界面既能控制电视、空调，也能控制音响。这类模型可以接受任意模态组合，并生成任意模态组合。

- **CoDi**（Composable Diffusion）通过训练各自专用的扩散模型，再用共享条件机制对齐它们的潜空间，实现任意到任意生成。每种模态都有自己的扩散过程（见本章第 04 篇），但噪声预测网络会接收一个联合交叉注意力层提供的条件；该层同时读取所有输入模态的嵌入。这样，CoDi 可以根据文本提示一次生成相匹配的图像和音频。

- **NExT-GPT**采用另一种架构：它通过轻量级的**投影层**，把 LLM 主干（模型的“脑”）连接到输入侧的模态专用编码器和输出侧的模态专用解码器。输入编码器（如 CLIP 图像编码器、CLAP 音频编码器）把各模态转换到 LLM 的嵌入空间。LLM 对组合后的词元序列进行推理，并生成特殊的“模态信号词元”，将信息路由给相应的解码器（如生成图像的 Stable Diffusion、生成音频的 AudioLDM）。训练时只更新投影层；LLM 以及专用编码器和解码器保持冻结。

- **Gemini**从预训练开始就是原生多模态模型。与 NExT-GPT 的即插即用架构不同，Gemini 的 Transformer 从头开始就在文本、图像、音频和视频词元交错组成的序列上训练。因此，模型会在预训练中自然形成跨模态注意力模式，而不是事后再添加这些能力。Gemini 使用 SentencePiece 处理文本，并学习类似本章第 03 篇 VQ 方法的视觉词元化器。

- **GPT-4o**中的“o”代表“omni”（全模态）。它采用端到端架构，所有模态共享同一个 Transformer 和下一个词元预测目标。模型把音频输入处理为频谱词元、图像处理为图块词元、文本处理为子词词元，再将它们送入同一序列。输出词元由模态专用的输出头解码。GPT-4o 的一项设计改进是降低了延迟：它去掉了早期 GPT-4V 等系统所依赖的 ASR、LLM 和 TTS 多模型级联。

![CoDi 对齐扩散、使用冻结专用模型的 NExT-GPT 中枢架构，以及原生交错预训练的 Gemini 式架构对比](../images/any_to_any_architectures.svg)

- 这些模型的集成程度各不相同：

    - **浅层集成**（NExT-GPT）：冻结的专用模型通过训练得到的适配器连接。开发快，但跨模态推理能力有限。
    - **中层集成**（CoDi）：不同模态的生成器共享条件信息。对齐能力更强，同时保留模块化结构。
    - **深层集成**（Gemini、GPT-4o）：一个模型端到端地在所有模态上训练。跨模态推理能力最强，训练成本也最高。

## 模态专用编码器和解码器与共享主干

- 这种架构为每种输入模态配置专用编码器，为每种输出模态配置专用解码器，再用同一个主干处理各模态的表示。

- 统一模型常用以下三部分结构：

    - **模态编码器** $E_m$ 把模态 $m$ 的原始输入转换为嵌入向量序列 $\mathbf{h}_1^m, \mathbf{h}_2^m, \ldots, \mathbf{h}_{n_m}^m$，每个向量的维度为 $d$。
    - **共享 Transformer 主干** $T_\theta$ 使用自注意力处理所有输入模态的拼接或交错嵌入。
    - **模态解码器** $D_m$ 把主干输出的嵌入还原为模态 $m$ 的原生格式，例如文本词元、图像像素或音频波形。

- 文本编码器通常是嵌入查找表 $E_\text{text}(w) = \mathbf{W}_e[w]$，其中 $w$ 是词元索引，与第 07 章 Transformer 的做法相同。图像编码器通常使用 **Vision Transformer**（ViT），把图像切分为图块，再对各图块进行线性投影（见第 08 章）。音频编码器会计算梅尔频谱图，再使用卷积前端或 Audio Spectrogram Transformer（AST）处理（见第 09 章）。

- 共享主干是一个标准 Transformer，能对所有模态词元执行自注意力。给定拼接后的输入序列 $\mathbf{H} = [\mathbf{h}_1^{m_1}, \ldots, \mathbf{h}_{n_1}^{m_1}, \mathbf{h}_1^{m_2}, \ldots, \mathbf{h}_{n_2}^{m_2}]$，每个词元都可以关注序列中的其他词元，不受模态限制：

$$\text{Attention}(\mathbf{Q}, \mathbf{K}, \mathbf{V}) = \text{softmax}\left(\frac{\mathbf{Q}\mathbf{K}^\top}{\sqrt{d_k}}\right)\mathbf{V}$$

- 这与第 07 章的注意力公式相同，但现在 $\mathbf{Q}$、$\mathbf{K}$ 和 $\mathbf{V}$ 都包含来自多个模态的词元。图像图块词元可以关注文本词元，因此模型无需单独的交叉注意力模块，也能进行跨模态推理。

- 模型会给每个词元加上**模态嵌入**，让主干知道词元来自哪种模态。这类似位置嵌入，但模态嵌入表示模态身份，而不是序列位置。模型为模态 $m$ 的每个词元加上可学习向量 $\mathbf{e}_m \in \mathbb{R}^d$：

$$\tilde{\mathbf{h}}_i^m = \mathbf{h}_i^m + \mathbf{e}_m + \mathbf{p}_i$$

- 其中，$\mathbf{p}_i$ 是位置 $i$ 的位置嵌入。

![编码器—主干—解码器架构：图像图块、文本词元和音频帧进入共享 Transformer，再由模态专用解码器生成输出](../images/shared_backbone_multimodal.svg)

## 多模态词元化

- 一封信可以把英文文字、手绘草图和乐谱排成线性序列：先写一句话、画一张图，再用文字说明图中的内容。多模态词元化也把文本、图像、音频和视频转成单一词元序列，供 Transformer 从左向右处理。

- 文本词元化已经相当成熟：**字节对编码**（BPE）或 SentencePiece 可以生成子词词表（见第 07 章）。难点在于如何把这种方法扩展到连续型模态。

- 图像词元化主要有两种路线。**离散路线**使用 VQ-VAE 或 VQ-GAN（详见本章第 03 篇），把每张图像编码为一串码本索引。若码本有 $|\mathcal{C}|$ 个条目，图像编码为 $n$ 个码，那么图像就表示为从大小为 $|\mathcal{C}|$ 的词表中取出的 $n$ 个离散词元，可以直接与文本词表兼容。**连续路线**使用 ViT 或 CNN 编码器生成 $n$ 个连续嵌入向量，再通过线性投影把它们映射到 Transformer 的嵌入维度。Gemini 和 GPT-4o 使用连续路线的变体；Parti 和 LlamaGen 等自回归图像生成器则倾向采用离散路线。

- 音频信号通常先转换为梅尔频谱图，再通过神经音频编解码器（如 EnCodec、SoundStream）离散化为分层词元，或由学习得到的编码器连续投影。以 AudioLM 为例，它把音频表示为来自多个码本层的离散词元序列，再以自回归方式建模。

- 视频词元化在图像词元化基础上增加了时间压缩。常见方法使用 **3D VQ-VAE**（如本章第 03 篇的 VideoGPT 或 Cosmos Tokeniser），把时空图块量化为离散词元。时间压缩率很重要：未经大幅时间降采样的 24 fps 原始视频，每秒会产生过多词元。

- 所有模态完成词元化后，模型会把它们**交错排列**成单一序列，并用特殊分隔词元标记模态边界。例如：

```
[TEXT] The cat sits on a mat [/TEXT] [IMAGE] <img_tok_1> <img_tok_2> ... <img_tok_n> [/IMAGE] [AUDIO] <aud_tok_1> ... <aud_tok_m> [/AUDIO]
```

- Transformer 随后使用标准因果注意力或双向注意力处理整个混合序列。模态分隔词元有双重作用：它们标记模态边界，也充当“汇聚点”，其表示概括对应模态片段的内容。

![文本词元、离散图像词元和音频编解码器词元交错排列，并通过模态边界标记输入同一个 Transformer](../images/multimodal_tokenisation_sequence.svg)

- **词元预算**是一个重要设计因素。若一张图像占 256 个词元，文字说明占 50 个词元，图像占用的词元数约为文本的五倍。模型需要在分辨率（词元越多、细节越丰富）和上下文长度（词元越多、内存和计算成本越高）之间权衡。**词元合并**会逐步合并相似词元；**自适应词元化**则对简单区域使用较少词元、对复杂区域使用较多词元。这些方法可以控制词元开销。

## 训练流程：分阶段预训练与联合微调

- 多模态模型需要逐步学习。从随机初始化开始同时训练所有模态，往往难以收敛。主流做法是**分阶段训练**，按顺序培养更复杂的跨模态能力。

- **阶段 1：单模态预训练。**每个模态编码器分别在大规模单模态数据集上训练。文本主干使用标准语言建模目标（下一个词元预测），在数万亿个文本词元上预训练（见第 07 章）。视觉编码器使用图像分类或自监督目标（MAE、DINO）预训练（见第 08 章）。音频编码器则使用语音识别或音频分类数据预训练（见第 09 章）。这一阶段会得到能力较强的单模态特征提取器。

- **阶段 2：跨模态对齐。**将预训练编码器连接到共享主干，再用图像—文本对、音频—转录文本对等成对多模态数据训练模型，目标可以是对比式或生成式。这一阶段可以冻结编码器权重以保留单模态知识，只更新投影层和主干。本章第 01 篇介绍的 CLIP 式对齐也可以在此阶段融入统一模型。

- **阶段 3：联合多模态预训练。**解冻全部或大部分参数，在单模态与多模态数据混合的数据集上训练，并对所有模态词元使用统一的下一个词元预测目标。损失函数为：

$$\mathcal{L} = -\sum_{t=1}^{T} \log p_\theta(x_t \mid x_{<t})$$

- $x_t$ 可以是文本词元、图像词元或音频词元。模型必须学会预测任意模态的下一个词元，才能形成真正的跨模态理解能力。

- **阶段 4：指令微调与对齐。**在整理好的指令跟随数据集上微调预训练模型，其中包含多模态指令，例如“详细描述这张图”“这个视频里有什么声音？”或“生成一张 X 的图像”。这一阶段常使用**基于人类反馈的强化学习**（RLHF）或直接偏好优化（DPO），让模型输出符合人类偏好。

- **模态专用预热**可以防止模态坍塌。如果某种模态（通常是训练数据最多的文本）主导梯度信号，模型可能会“遗忘”数据较少的模态。常见预热策略包括：

    - **梯度平衡**：调整各模态梯度的尺度，使它们对参数更新的贡献接近。
    - **数据比例调度**：逐步提高多模态数据相对于单模态数据的比例。
    - **损失加权**：为各模态设置权重 $\lambda_m$，使总损失为 $\mathcal{L} = \sum_m \lambda_m \mathcal{L}_m$；调整 $\lambda_m$，平衡各模态的学习速度。

![四阶段训练流程：单模态预训练、跨模态对齐、联合多模态预训练和指令微调，并标示各阶段被冻结或训练的参数](../images/staged_multimodal_training.svg)

- **不宜跳过这些阶段：**从头开始同时训练所有模态很难奏效。模型必须同步学习边缘检测、音素识别等低层特征，以及高层跨模态推理，而这些能力的学习动态差异很大。不同模态的数据量也严重失衡：文本有数万亿个词元，图像有数十亿个词元，音频则有数亿段片段。此外，优化景观高度非凸。分阶段训练提供了类似第 06 章课程学习的训练顺序，引导模型进入更好的解区域。

## 多模态思维链推理

- 解几何题时，人会画图、标出角度、列出方程，再逐步求解。**多模态思维链**（CoT）让模型也能生成中间推理步骤；这些步骤可以包含文字、图像标注，甚至生成的示意图，最后再给出答案。

- 在纯文本 CoT 中（见第 07 章的提示策略），模型用自然语言生成一系列推理步骤。多模态 CoT 还可以在中间步骤中引用或生成视觉内容。例如，给模型一张图表并问“哪一年销售额最高？”，模型可以先描述图表：“图表显示了 2018 至 2023 年的销售额……”，再指出相关视觉特征：“2021 年的柱子最高……”，最后回答：“2021 年。”

- 形式化地，令 $\mathbf{x}$ 表示多模态输入，$y$ 表示目标答案。标准预测模型直接估计 $p(y \mid \mathbf{x})$。思维链引入中间推理 $\mathbf{r} = (r_1, r_2, \ldots, r_L)$，并把预测分解为：

$$p(y \mid \mathbf{x}) = \sum_{\mathbf{r}} p(y \mid \mathbf{r}, \mathbf{x}) \cdot p(\mathbf{r} \mid \mathbf{x})$$

- 实际计算时，模型会通过贪心解码或束搜索生成推理链，近似计算上式中的求和。推理步骤 $r_i$ 可以是文本词元、图像区域引用，也可以是叠加在输入图像上的边界框等视觉词元。

- **多模态 CoT 训练**通常先整理由人工标注者提供的逐步多模态推理轨迹，再用这些轨迹微调模型。另一种方法是从更大的教师模型蒸馏 CoT 能力：教师模型为大量数据生成推理轨迹，较小的学生模型同时学习输入和教师轨迹。

- 多模态 CoT 适用于**空间推理**（如判断红球是否在蓝色立方体左侧）、**基于图示的数学推理**（如几何题），以及需要综合图像多个区域信息的**多步视觉问答**。

## 多模态智能体

- **多模态智能体**通过多种模态感知环境，判断下一步行动，并根据感知结果执行动作。厨房机器人就是一个例子：它查看台面上的食材（视觉），读取平板电脑上的食谱（文本），听见计时器响起（音频），再拿起刀切洋葱（动作）。

- 智能体按经典的**观察—推理—行动**循环运行：

    1. **观察**：智能体从环境接收多模态输入，如屏幕截图、用户的语音指令或视频流。
    2. **推理**：统一模型处理多模态输入，并可能通过思维链规划一系列步骤。
    3. **行动**：模型输出动作，如文本回答、工具调用、坐标 $(x, y)$ 处的鼠标点击，或机器人电机指令。

- **工具使用**是多模态智能体的一项重要能力。模型需要学会判断何时无法直接回答问题，并调用外部工具，例如计算器、代码解释器、网页浏览器或搜索引擎。模型会在输出词元序列中生成结构化调用，例如 `search("current weather in London")`；系统执行调用后，再把结果作为额外输入词元交给模型处理。

- **视觉定位**将语言指向图像或视频中的具体区域。智能体听到“点击右上角的蓝色按钮”时，需要把这段描述映射到像素坐标。常见做法是训练模型用特殊词元输出边界框坐标，或生成热图标出对应区域。这把本章第 02 篇（视觉语言模型）介绍的定位和指代方法扩展到动作领域。

- WebVoyager 和 SeeAct 等**网页智能体**展示了多模态模型如何浏览网站。智能体接收网页截图，识别按钮、文本框和链接等交互元素，再输出点击、输入或滚动等动作，完成用户指定的目标。主要难点是动作空间太大：一个网页通常有数百个可点击位置。

![多模态智能体的观察—推理—行动循环：屏幕视觉输入进入统一模型，模型推理后输出点击、输入或工具调用等动作](../images/multimodal_agent_loop.svg)

- **具身智能体**把这套方法扩展到物理环境。配有摄像头和麦克风的机器人接收视觉与音频输入，经统一模型处理后输出电机指令。Google 的 PaLM-E 等项目把机器人传感器数据直接嵌入语言模型的词元序列，使机器人能根据视觉观察理解“拿起碗旁边的绿色积木”等指令，并生成一系列电机动作。

- 智能体训练会在标准分阶段预训练之后加入**强化学习**（RL）。智能体与环境交互（如模拟桌面、网页浏览器或机器人模拟器），根据任务完成情况获得奖励，再使用 PPO 或 REINFORCE 等算法更新策略。奖励通常较稀疏：任务成功记为 1，否则为 0。这让优化变得困难，也使训练依赖多模态预训练形成的先验能力。

## 基准测试与评估

- 评估能看、听、读和行动的模型，需要一组覆盖不同能力的基准测试。单个指标无法衡量多模态能力，因此研究者会组合使用多种专项评测。

- **MMLU**（Massive Multitask Language Understanding）测试模型在 57 个学科领域的知识。它最初只评估文本能力，也可以作为基线：增加视觉能力后，统一多模态模型仍应保留文本表现。多模态训练后 MMLU 分数下降，说明模型可能发生灾难性遗忘。

- **MMBench**评估视觉语言理解，覆盖属性识别、空间关系理解和 OCR 等 20 个细分能力。每道题都提供一张图像和一道选择题。该基准测试模型是否真正理解图像，而不是依赖纯文本线索答题。

- **SEED-Bench**包含 19,000 道选择题，覆盖图像和视频理解的 12 个评估维度。它重点测试时间理解（某一帧之前或之后发生了什么）和组合推理（综合多个视觉属性）。

- **MM-Vet**评估综合多模态能力。模型必须在一道题中同时使用识别、OCR、空间感知、语言生成和知识检索等技能。

- **MathVista**测试模型根据视觉输入进行数学推理的能力，题目包括几何图、统计图表、函数图像和科学插图。该基准主要考察多模态思维链能力。

- **音视频基准测试**（如 AVQA，即音视频问答）评估模型能否推理所见与所闻之间的关系。例如，模型需要判断正在说话的人位于画面左侧还是右侧。

- **智能体基准测试**（如 WebArena、OSWorld 和 SWE-bench）评估模型在交互环境中完成任务的能力。常用指标是成功率，即智能体正确完成的任务比例。这些基准尤其困难，因为它们要求模型进行长程规划并从错误中恢复。

- LMSYS Chatbot Arena 等**综合评估**框架通过两两比较收集人类偏好：评审者看到两个模型对同一多模态输入的回答，再选出更好的回答。数千次比较可用于计算 Elo 评分，得到一个与模型整体质量相关的标量。

- 多模态评估长期面临**数据污染**问题：模型使用互联网规模的数据训练，基准图像和题目可能已经出现在训练集中。谨慎去重和创建留出测试集有助于防范污染，但不能完全消除风险。

## 世界模型

- 把桌边的玻璃杯推下去时，可以预测杯子会掉落、玻璃会碎，也会意识到这样做不妥。大脑会运行一个**世界模型**，也就是对环境物理结构和因果关系的内部模拟，用来预测多个模态中的未来状态。

- 在 AI 中，世界模型是一个学习得到的函数，根据当前状态和动作预测下一状态：

$$\hat{s}_{t+1} = g_\phi(s_t, a_t)$$

- 其中，$s_t$ 是当前状态表示，可以包含视觉、听觉和本体感觉信息；$a_t$ 是动作；$\hat{s}_{t+1}$ 是预测的下一状态。$s_t$ 位于学习得到的潜空间，而不是原始像素空间，因此预测问题更容易处理。

- Sora（OpenAI）和 Genie（Google DeepMind）等**视频预测模型**推动了世界模型的发展。它们根据文本提示和/或动作序列生成时间连贯的视频帧。研究者常把它们称为视频生成器，但它们更接近环境模拟器：模型学到足以生成合理未来的物理规律，如重力、碰撞、遮挡和流体动力学。

- 多模态架构与世界模型密切相关。只预测像素的世界模型能力有限；实用的世界模型还要预测不同模态的结果。推倒玻璃杯后，模型应能预测杯子的视觉运动轨迹、玻璃破碎的声音，以及“地上有碎玻璃”这一语义后果。统一多模态架构已经在共享空间中表示多种模态，因此适合构建世界模型。

- 多模态世界模型可以优化以下损失：

$$\mathcal{L}_\text{world} = \mathbb{E}\left[\sum_{m \in \mathcal{M}} \lambda_m \| s_{t+1}^m - g_\phi^m(s_t, a_t) \|^2 \right]$$

- 其中，$s_{t+1}^m$ 是模态 $m$ 中真实的下一状态表示，$g_\phi^m$ 是世界模型中模态专用的预测头。共享潜在动力学 $g_\phi$ 在联合多模态空间中运行，各模态专用的预测头则把预测结果解码为相应模态的原生格式。

![世界模型示意图：动作更新潜在状态，各解码器预测未来视觉帧、音频波形和语义描述](../images/multimodal_world_model.svg)

- Yann LeCun 提出的 **JEPA**（联合嵌入预测架构）提供了一种世界模型框架，避免直接预测像素带来的问题。直接预测原始像素会把模型容量耗费在具体纹理等无关细节上；JEPA 则在嵌入空间中预测。模型学习一个编码器，把观察结果映射为嵌入，再学习一个预测器预测未来嵌入：

$$\hat{\mathbf{z}}_{t+1} = h_\psi(\mathbf{z}_t, a_t), \quad \mathbf{z}_t = \text{Enc}(s_t)$$

- 该方法比较嵌入表示，而不是原始观察，因此对**感知混叠**更稳健：不同像素配置可能对应同一语义状态。对多模态世界模型来说，这种方法很有潜力，因为它直接在统一架构提供的共享嵌入空间中运行。

- 世界模型有多种实际用途。在**基于模型的强化学习**中，智能体先用世界模型“想象”采取某项动作的后果，再决定是否执行，从而减少与真实环境的交互次数（见第 11 章的基于模型强化学习）。在**自动驾驶**中，世界模型预测不同转向决策下未来几秒的场景变化。在**机器人**领域，世界模型可以让机器人先在内部演练操作步骤，再真正执行。

- 世界模型研究正转向能实时运行并响应任意用户动作的**交互式世界模型**，相当于完全从数据中学习通用模拟器。Google DeepMind 的 Genie 2 展示了这种能力：模型只需一张图像，就能生成可交互、可控制的 3D 环境供用户探索。世界模型与统一多模态架构逐渐汇合后，单个模型有望跨模态完成感知、预测、模拟和行动。

## 编程任务（使用 Colab 或笔记本）

**任务 1：实现简单的多模态词元交错器**

- 编写一个函数，接收文本和一个小型二维数组作为虚拟图像，把二者的词元化表示及模态嵌入组合成一条扁平序列。

```python
import jax
import jax.numpy as jnp

# Simulate multimodal tokenisation: text tokens + "image patch" tokens
def interleave_modalities(text_tokens, image_patches, embed_dim=32, key=jax.random.PRNGKey(0)):
    """Interleave text and image tokens with learned modality embeddings."""
    k1, k2, k3 = jax.random.split(key, 3)
    n_text = text_tokens.shape[0]
    n_img = image_patches.shape[0]
    # Random projection matrices (stand-ins for real encoders)
    W_text = jax.random.normal(k1, (text_tokens.shape[-1], embed_dim)) * 0.02
    W_img = jax.random.normal(k2, (image_patches.shape[-1], embed_dim)) * 0.02
    # Modality embeddings: one for text, one for image
    mod_emb = jax.random.normal(k3, (2, embed_dim)) * 0.02
    text_embs = text_tokens @ W_text + mod_emb[0]  # (n_text, embed_dim)
    img_embs = image_patches @ W_img + mod_emb[1]   # (n_img, embed_dim)
    # Interleave: [IMG] tokens first, then [TEXT] tokens (like LLaVA)
    combined = jnp.concatenate([img_embs, text_embs], axis=0)
    print(f"Combined sequence: {n_img} image + {n_text} text = {combined.shape[0]} tokens")
    return combined

# Try it: 5 text tokens (dim 16) and 4 image patches (dim 64)
text = jax.random.normal(jax.random.PRNGKey(1), (5, 16))
image = jax.random.normal(jax.random.PRNGKey(2), (4, 64))
seq = interleave_modalities(text, image)
# Experiment: change embed_dim, swap the interleaving order, add a third modality
```

**说明：**原代码接收的是已向量化的文本词元和图像块特征，没有把字符串或二维像素图像转换为词元；代码把图像词元整体放在文本词元前，也未加入模态分隔词元。

**任务 2：可视化跨模态注意力模式**

- 创建一条合成多模态序列并计算自注意力分数，观察图像词元如何关注文本词元，反之亦然。

```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

def cross_modal_attention(n_text=6, n_img=4, d=32, key=jax.random.PRNGKey(42)):
    """Compute and visualise attention between text and image tokens."""
    k1, k2, k3 = jax.random.split(key, 3)
    # Simulate token embeddings for two modalities
    text_embs = jax.random.normal(k1, (n_text, d))
    img_embs = jax.random.normal(k2, (n_img, d))
    seq = jnp.concatenate([img_embs, text_embs], axis=0)  # (n_img+n_text, d)
    # Learned Q, K projections
    Wq = jax.random.normal(k3, (d, d)) * 0.1
    Wk = jax.random.normal(jax.random.PRNGKey(99), (d, d)) * 0.1
    Q, K = seq @ Wq, seq @ Wk
    scores = Q @ K.T / jnp.sqrt(d)
    attn = jax.nn.softmax(scores, axis=-1)
    # Plot
    labels = [f"img_{i}" for i in range(n_img)] + [f"txt_{i}" for i in range(n_text)]
    fig, ax = plt.subplots(figsize=(7, 6))
    ax.imshow(attn, cmap="viridis")
    ax.set_xticks(range(len(labels))); ax.set_xticklabels(labels, rotation=45, fontsize=8)
    ax.set_yticks(range(len(labels))); ax.set_yticklabels(labels, fontsize=8)
    ax.set_xlabel("Key (attended to)"); ax.set_ylabel("Query (attending from)")
    ax.set_title("Cross-modal self-attention map")
    plt.colorbar(ax.images[0], ax=ax, shrink=0.8)
    plt.tight_layout(); plt.show()

cross_modal_attention()
# Experiment: increase d, add a causal mask, observe how attention patterns change
```

**任务 3：模拟带模态专用损失加权的分阶段训练**

- 演示不同模态的损失权重如何影响简单的多模态训练循环。观察平衡损失能否避免某一种模态主导训练。

```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

def staged_training_sim(steps=200, key=jax.random.PRNGKey(7)):
    """Simulate multimodal training with adjustable modality loss weights."""
    # Two 'modalities' with different loss scales (text loss ~10x larger than image loss)
    losses_text, losses_img = [], []
    param = jnp.array([0.0, 0.0])  # Shared param updated by both modality losses
    lr = 0.05
    # Try changing these weights to see the effect on convergence balance
    lambda_text, lambda_img = 1.0, 5.0  # upweight the weaker modality

    for step in range(steps):
        k1, k2, key = jax.random.split(key, 3)
        noise_t = jax.random.normal(k1, ()) * 0.3
        noise_i = jax.random.normal(k2, ()) * 0.1
        loss_t = (param[0] - 3.0) ** 2 + noise_t  # text target = 3.0
        loss_i = 0.1 * (param[1] - 1.0) ** 2 + noise_i  # image target = 1.0 (smaller scale)
        # Weighted combined gradient
        grad_t = lambda_text * 2 * (param[0] - 3.0)
        grad_i = lambda_img * 0.2 * (param[1] - 1.0)
        param = param - lr * jnp.array([grad_t, grad_i])
        losses_text.append(float(loss_t)); losses_img.append(float(loss_i))

    fig, ax = plt.subplots(figsize=(8, 4))
    ax.plot(losses_text, label=f"Text loss (weight={lambda_text})", alpha=0.7)
    ax.plot(losses_img, label=f"Image loss (weight={lambda_img})", alpha=0.7)
    ax.set_xlabel("Training step"); ax.set_ylabel("Loss"); ax.legend()
    ax.set_title("Modality loss balancing during staged training")
    plt.tight_layout(); plt.show()

staged_training_sim()
# Experiment: set lambda_img=1.0 and watch image loss converge much slower
```

**说明：**注释称一个共享参数同时接受两种模态损失的更新，但代码用文本梯度更新 param[0]，用图像梯度更新 param[1]。两种模态没有共同更新同一个参数，因此这段模拟无法说明一种模态压过另一种模态。
