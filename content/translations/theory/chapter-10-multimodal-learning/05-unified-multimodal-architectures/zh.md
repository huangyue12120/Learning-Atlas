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

*本篇将统一多模态架构放回 AI 工程语境，保留源文中的定义、公式、代码、图示和实践边界，便于逐项核对。*

* 统一的多模式架构用一个单一的系统取代单独的专家模型,该系统可读取文字、图像、音频和视频、理由和生成。该文件涵盖任何一种到任何一种模式(CoDi、NExT-GPT)、本土的多模式LLMs(Gemini、GPT-4o)、多模式标识战略,以及统一的建筑取舍。

## 统一化的动机


- 想象一下一个会说五种语言的翻译,可以在他们中间转换,而不乏苦闷. 早期的多式系统更像是坐在不同房间的5名独立的翻译,每个翻译处理一种语言,并在墙上通过一个槽来传递笔记. 单一的多式建筑**是单一的多式建筑:一个具有共同分量的模型,它读取、写出和解释整个文本、图像、音频、视频甚至动作,都在一个前行通道内。

- 动机既具有实用性,也具有理论性. 在实际方面,为每对模式(文本到图像、图像到文本、音频到文本等)保持单独的专家模型。导致组合爆炸:$k$模式要求最多$k(k-1)$直接管道。统一的模型将所有这些都倒塌为一个单一的系统. 在理论方面,人类认知不会在孤立的模块中处理视觉和语言;跨模式绑定会早而深入地发生,统一试图反映这一点.

- 共享权重鼓励**跨模式转让**。在文字中学习了时间规律(动词前的主题,作用前的原因)的变压器可以重新使用这些相同的注意力电路来进行视频中的时间规律(物体在移动前出现)或音频(在维持前被设定). 这是你从第7章中看到的有语言模型微调的转学和从第8章中看到有图像网络预训的转学的多模式模拟.

- 正式地,让我们$\mathcal{M} = \{m_1, m_2, \ldots, m_k\}$成为一套模式。一个统一的模型定义了单一参数化函数$f_\theta$将任何输入模式子集映射到任何子集输出模式:

$$f_\theta : \mathcal{P}(\mathcal{M}) \rightarrow \mathcal{P}(\mathcal{M})$$

- 地点$\mathcal{P}(\mathcal{M})$是模式的电源集(所有子集)。关键制约因素是$\theta$大部分是共享的;只有薄薄的、特定模式的适配层不同。

![图示](../images/unified_multimodal_overview.svg)

- 统一的前景伴随着一种根本的紧张:方式结构不同。文本是离散符号的一维序列. 图像是连续像素值的2D格. 音频是一维连续波形,时间尺度与文本差分很大. 视频在图像中添加了时间轴. 将这些相去甚远的结构调和成一个变压器能消化的单一序列,是这个领域在工程上的核心挑战.

## 任意到任意模型


- 想想一个通用的遥控器 可以操作你的电视,空调,和音乐系统,都通过同一个接口。** 任何模型**都是AI的等同物:它们接受任何模式组合作为输入,产生任何组合作为输出.

- **CoDi**(可分化扩散)通过培训特定模式的传播模式实现任何一代人,然后通过共享调节机制调整其潜在空间。每种模式都有自己的扩散过程(本章中从文件04中召回的传播模型),但噪声预测网络以联合交叉注意层为条件,该层同时看到所有输入模式所嵌入. 这使得 CoDi 从一个单行道的文本提示生成一个图像和匹配的音频。

- ** NExT-GPT**采用了不同的建筑设计方法。它通过轻量级**投影层**将LLM主干线("大脑")与输入侧的特有模式编码器和输出侧的特有模式解码器相接. 输入编码器(如CLIP的图像编码器,CLAP的音频编码器)将每个模式都翻译为LLM的嵌入空间. LLM在组合符号序列上的原因,并会向相应的解码器(例如图像的稳定分化,音频的AudioLDM)发出特殊的"模式信号令牌"来提供路由信息. 只有投影层经过了训练;LLM和专家编码器/解码器被保持被冻结.

- ** Gemini**(Google DeepMind)是当地从预训开始的多式。与NExT-GPT的插座和玩法不同,双子座变压器是从头到尾在文本,图像,音频,视频等符号的相接出序列上被训练而来. 这意味着跨模式的注意模式在预训期间有机地发展,而不是在后期被栓住. 该模型在文本中使用了"PriestPiece sorderiser",并学习了类似于本章第03卷所讨论VQ方法的可视化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活化活

- **GPT-4o** ("o"指"omni")代表了另一种模式:一种端到端的模型,所有模式都共享相同的变压器和相同的下接子预测目标. 音频输入被作为光谱符号处理,图像被作为补丁符号处理,而文本被作为子词符号处理,全部被输入到一个序列中. 该模型生成输出符由模式特定头来解码. 关键的创新是通过去除更早的系统如GPT-4V所依赖的分级ASR,LLM和TTS等模型的级联而实现的低延迟.

![图示](../images/any_to_any_architectures.svg)

- 这些模型的集成深度范围如下:

    - ** Shallow集成**(NExT-GPT):由训练有素的适配器连接的被冷冻的专家. 快速建设,有限的跨模式推理.
    - ** 中子集成**(CoDI):跨模式特定发电机的共享调节. 更好的对齐,仍然是模块化的.
    - ** 深度整合**(Gemini,GPT-4o):单一模式在所有模式上经过端到端培训。最丰富的跨模式推理,最昂贵的培训。

## 共享骨干网络与模态专用编码器/解码器


- 设想一个工厂,单条装配线(共享骨干),但原材料的装载码头(编码器)不同,成品的航运部门(编码器)不同. 每个码头都专门处理货物,但一旦进入工厂,所有东西都会沿着同一运输带移动。

- 统一型号的主导建筑模式使用这三部分结构:

    - ** 模式编码器**$E_m$从模式转换原始输入$m$进入嵌入向量的序列$\mathbf{h}_1^m, \mathbf{h}_2^m, \ldots, \mathbf{h}_{n_m}^m$,每个维度$d$.
    - ** 共用变压器主干线**$T_\theta$用自觉处理所有输入模式的相接或相接嵌入。
    - ** 模式解码器**$D_m$将主干线的输出重新嵌入到模式的本土格式中$m$(文字符号,图像像素,音频波形).

- 对于文本,编码器一般是一个嵌入式查询表$E_\text{text}(w) = \mathbf{W}_e[w]$地点$w$是一个符号指数, 和你在第七章中看到的一样。对于图像来说,编码器常常是一个**Vision Transformer**(ViT),将图像分解为补丁并逐一线性投影,如第8章所涵盖. 对于音频,编码器计算出一个mel分光克并用革命前端或音频分光克变换器(AST)处理,如第9章所讨论.

- 共享骨干是一个标准变压器,在所有模式符上都有自觉性. 由于输入序列调和$\mathbf{H} = [\mathbf{h}_1^{m_1}, \ldots, \mathbf{h}_{n_1}^{m_1}, \mathbf{h}_1^{m_2}, \ldots, \mathbf{h}_{n_2}^{m_2}]$,自意允许每个符号都关注其他每个符号,而不管其模式如何:

$$\text{Attention}(\mathbf{Q}, \mathbf{K}, \mathbf{V}) = \text{softmax}\left(\frac{\mathbf{Q}\mathbf{K}^\top}{\sqrt{d_k}}\right)\mathbf{V}$$

- 7章的注意公式也是这样 但现在$\mathbf{Q}$, $\mathbf{K}$,以及$\mathbf{V}$包含多种模式的符号。一个图像-patch 符可以处理一个文本符,使得跨模式推理无需任何单独的交叉注意模块.

- ** 在每个符号上添加模式嵌入**,这样主干线就知道一个符号来自哪种模式。这类似于位置嵌入,但编码模式身份而不是序列位置. 一个可学习的向量$\mathbf{e}_m \in \mathbb{R}^d$从模式添加到每个符号$m$:

$$\tilde{\mathbf{h}}_i^m = \mathbf{h}_i^m + \mathbf{e}_m + \mathbf{p}_i$$

- 地点$\mathbf{p}_i$是位置嵌入的位置$i$.

![图示](../images/shared_backbone_multimodal.svg)

## 多模态 token 化


- 想象一下,你正在写一封信 包括英文和手绘草图。你可以写一句,画出一幅图, 写出另一句提到图, 然后粘入音乐分数。字母是单线性流,它相互间会分出不同的"模式". 多式联运的标志化就是这样做的:它把文本、图像、音频和视频转换成一个单一的平整的符号序列,由变压器从左到右处理。

- 对于正文来说,标志性化是既定的:**字节-pair编码**(BPE)或句子Piece产生一个分词符号的词汇,如第七章所涵盖. 挑战在于将这一想法扩大到持续的方式。

- 对于图像,有两种广义的方法. **discrete**方法使用VQ-VAE或VQ-GAN(详见本章第03卷)来将每个图像映射到一个编码本索引的序列. 如果密码簿有$|\mathcal{C}|$条目和图像编码为$n$代码,图像变成$n$从大小词汇中提取的离散符号$|\mathcal{C}|$,直接兼容文本词汇。** 持续** 方法使用维T或CNN编码器制作$n$连续嵌入向量,它们被线性地投射入变压器的嵌入维度. 双子座和GPT-4o使用连续方法的变体;自相递回的图像生成器如Parti和LlamaGen更倾向于离散路线.

- 对于音频来说,信号一般被转换为mel分光克,然后或者被用神经音频编码器(如EnCodec,SoundStream,能产生分级离散的符号)来做盘片处理,或者通过学习到的编码器来连续投影. 例如,AudioLM代表音频作为从多代码簿级别分出的一个离散符号的序列,然后自动地模拟.

- 对于视频来说,标语化建立在图像标语化的基础上,但也必须压缩时间维度. 一个共同的战略使用**3D VQ-VAE**(如从文件03起在VideoGPT或Cosmos Tokeniser中)将分解为分解符. 时间压缩因子至关重要:24 fps的原始视频每秒产生太多的指使而无需主动的时下取样.

- 一旦所有模式都得到标识,它们就被** 中间放出** 成一个单一的序列,并带有特别的划定符标记模式边界。一个典型的格式看起来像:

```
[TEXT] The cat sits on a mat [/TEXT] [IMAGE] <img_tok_1> <img_tok_2> ... <img_tok_n> [/IMAGE] [AUDIO] <aud_tok_1> ... <aud_tok_m> [/AUDIO]
```

- 变压器然后使用其标准因子(或双向)注意机制处理整个混合序列. 模式分界符是双重职责:它们向模式通报模式边界,并起到"集合点"的作用,其表达总结了每个模式段.

![图示](../images/multimodal_tokenisation_sequence.svg)

- 一个关键的设计选择是**预算**。以256个符号标出单一的图像和以50个符号标出文字标题,意味着图像会再消耗上下文窗口的5x. 模型必须平衡分辨率(多指代=更细节)与上下文长度(多指代=更高的内存和计算成本). 诸如**token合并**(逐步结合类似标志)和**taptive specification**(简单区域使用较少的标志,复杂区域使用较多的标志)等技术有助于管理这种取舍。

## 训练配方：分阶段预训练与联合微调


- 算术之前你不会教小孩微积分 同样,你不能从随机初始化同时对所有模式进行统一的多模式模式的训练,并期望其很好地汇合。主导做法是**分阶段培训**,在这种培训中,模型逐步学习了经过精心排序的阶段更为复杂的跨模式能力。

- ** 第1阶段:统一格式预训。** 每种模式编码器都独立地接受大型统一格式数据集的培训。文本主干线在数以万亿计的文本符号上预先进行了语言建模目标(next-token promision)的标准训练,与第七章完全相同. 视觉编码器如第8章一样,在图像分类或自我监督的目标(MAE,DINO)上预先训练. 音频编码器在语音识别或音频分类数据上受到预训,如第9章. 这一阶段产生出很强的单式特征提取器.

- **Stage 2: Cross-moduction.** 预训编码器与共享主干相接,该模型在配对多模式数据(图像-封装对等,音频-transcript对等)上进行了有对比性或基因性目标的培训. 在这一阶段,编码器的重量可能被冻结(以保存单式知识)而只有投影层和主干部分更新. 这是CLIP风格对齐(从本章中的文件01)被折叠入统一模型的舞台.

- ** 步骤3:联合多式联运预训。** 所有参数(或大多数参数)均解冻,该模型的培训内容是单式和多式数据的混合,在所有模式符号上都有一个单独的后台预测目标。损失函数为:

$$\mathcal{L} = -\sum_{t=1}^{T} \log p_\theta(x_t \mid x_{<t})$$

- 地点$x_t$可以是文本符号,图像符号,也可以是音频符号. 该模式必须学会预测下一个征兆,而不管其方式如何,这迫使它形成真正的跨模式理解。

- **Stage 4:指令调和.** 预训模式在包含多式指令的被曲解的指令跟随数据集上进行了微调(如"详细描述这幅图像","这段视频发出什么声音?","Generate a image of X"等). 这一阶段经常使用**从人类反馈中学习的**强制(RLHF)或直接偏好优化(DPO)来使模型的输出与人类偏好相配合.

- ** 不同模式的取暖**是一种在各阶段内防止模式倒塌的技术。如果一种模式(通常为文本,它拥有最多的训练数据)主导了梯度信号,则该模式可能会"忘记"更弱的模式. 暖和战略包括:

    - ** 分层平衡**:从每种模式按比例调整梯度,以便平等地为参数更新做出贡献。
    - ** 数据比率列表**:逐步提高多式联运数据相对于单式数据的比例。
    - ** 减重**:指定特定方式的加权$\lambda_m$所以总损失是$\mathcal{L} = \sum_m \lambda_m \mathcal{L}_m$,与$\lambda_m$旨在平衡不同模式的学习率。

![图示](../images/staged_multimodal_training.svg)

- ** 为什么不跳过阶段? ** 从头到尾联合培训一切是诱人的,但实际上由于若干原因未能成功。首先,模型必须同时学习低等特征(尖端检测,电话识别)和高等跨模式推理,这些功能的学习动态非常不同. 第二,不同模式的数据分布严重失衡(成千上千的文本符号与成千上亿的图像符号相对数以亿计的音频剪辑)。第三,优化地貌高度非汇合,有阶段培训提供课程指导模式向更好的盆地发展,与第六章的课程学习理念相类似.

## 多模态思维链推理


- 当你解决了几何学问题,你可能会绘制出一个图表,标记角度,写出一个等式,然后一步一步地解决. 您不会直接从问题声明跳到答案。** 多式联运思维链**(COT)推理使模型能够这样做:生成可能涉及文本、视觉说明甚至生成图表的中间推理步骤,然后才能得出最后答案。

- 在只用文本的COT(如第七章"关于催化策略的讨论"所探讨)中,该模型产生自然语言中一系列推理步骤. 多式联运公司允许中间步骤参考或生成可视内容,从而扩大这一范围。例如,给一个图表图像和“哪年的销售量最高?”的问题,一种多式CoT模型可以首先描述该图表("图表显示2018年至2023年的销售量......"),然后确定相关的视觉特征("最高的栏出现在2021."),最后输出答案("2021").

- 正式地,让我们$\mathbf{x}$成为多式联运输入,$y$成为目标答案。标准预测模型$p(y \mid \mathbf{x})$直接来. 思维链引入中间推理$\mathbf{r} = (r_1, r_2, \ldots, r_L)$并将预测因素化为:

$$p(y \mid \mathbf{x}) = \sum_{\mathbf{r}} p(y \mid \mathbf{r}, \mathbf{x}) \cdot p(\mathbf{r} \mid \mathbf{x})$$

- 在实践中,总和的取向是贪婪或梁-搜比推理链解码相近. 推理步骤$r_i$可以是文本符号,引用图像区域,甚至生成可视符号(例如输入图像上覆盖的边框注释).

- ** 培训多式联运公司** 通常涉及整理数据集,其中人类注释员提供分步骤的多式联运推理痕迹,然后在这些痕迹上细化模型。一些方法从更大的教师模型中提炼出COT能力:教师为一个大数据集生成推理痕迹,较小的学生模型既接受输入,也接受教师痕迹的培训.

- 多式联运CoT对于需要**空间推理**(如"蓝色立方体左侧是红球吗"),**数学推理比图**(如几何问题),和**多步视觉问题回答**,答案取决于一个图像的多区域的信息相融合.

## 多模态智能体


- 想想厨房里的机器人厨师 它查看了柜台上的成分(视觉),在平板上读取食谱(文字),听取计时器哔声(音频),然后身体上取出一把刀并切出一根洋葱(动作). 一种**多模式代理**是这一方法的数字版本:这种模型通过多种模式来感知世界,说明做什么的理由,并根据其认知采取行动。

- 代理循环遵循经典的**观察-理性-活性**周期:

    1. **观察**:代理接收来自其环境的多模式输入(截图,用户口述指示,视频馈送).
    2. **Reason**:统一模型处理多式输入,可能利用思维链来规划一系列步骤。
    3. ** Act**:模型输出动作(文本响应、工具呼叫、鼠标点击坐标)$(x, y)$一个机器人发动机命令

- ** 使用工具** 是多式联运代理人的关键能力。该模型在无法直接回答问题时被训练成识别,而必须使用外部工具:计算器、代码解释器、网页浏览器或搜索引擎。该模型生成一个结构化的工具调用(例如,`search("current weather in London")`)作为其输出符号序列的一部分,系统执行调用,结果被反馈作为模型处理的附加输入符号.

- ** 视频定位** 用图像或视频连接特定区域的语言。当一个代理商说"点击上-右角的蓝色按钮"时,它必须将"上-右角的蓝色按钮"的短语放入像素坐标. 从结构上讲,实现这一点的方法是培训模型将相框坐标输出为特殊符号,或者让模型在显示所提及区域的图像上产生热图. 这就将本章(Vision Language Models)文件02所讨论工作的定位和转介扩展至动作域.

- ** WebVoyager 和 SeeAct 等网络代理商演示了多模式代理通航网站. 代理机接收网页截图,识别交互元素(按钮,文本字段,链接),输出动作(点击,打出,滚动)以完成用户指定的目标. 关键的挑战在于巨大的行动空间:一个典型的网页有上百个可能的点击目标.

![图示](../images/multimodal_agent_loop.svg)

- ** 健康剂**将这一范围扩大到物理环境。拥有相机和麦克风的机器人接收视觉和音频输入,通过统一的模型进行处理,并输出运动指令. PALM-E(Google)等项目将机器人传感器数据直接嵌入到语言模型的符号序列中,使机器人能够遵循"取出碗附近的绿色块"等指令,在视觉观察中将指令放入地上并生成一系列运动动作.

- 特工人员培训配方在标准预训上增加了**强化学习**(RL)阶段. 代理机与一个环境(模拟桌面,网页浏览器,机器人模拟器)交互,任务完成后获得奖励,并使用PPO或REINFORCE等算法更新其政策. 奖励信号通常很少(任务成功1个,否则0个),使这种优化具有挑战性,严重依赖多式联运预训的强大前奏。

## 基准与评估


- 评估一个能够看见、听到、阅读和采取行动的模式需要一套不同的基准。没有任何单一的衡量标准能反映多式联运的能力,因此外地依靠收集的专门评价。

- ** MMLU**(大规模多任务语言理解)测试57个学科的知识。虽然最初只使用文字,但它作为一个基线:统一的多模式模型在获得视觉能力时不应失去仅使用文字的性能。多式联运训练后MMLU的下降标志着灾难性的遗忘。

- ** MM Bench** 评估20个精细能力维度的视觉语言理解,包括属性识别、空间关系理解和OCR。每个问题都呈现出一个形象和一个多选择的问题. 基准系统测试模型是否真正理解了图像,还是依赖于仅文本快捷键.

- ** SEED-Bench**提供19 000个多重选择问题,涉及12个评价层面,既用于图像理解,也用于视频理解。它具体测试时间理解(在特定框架之前/之后发生的事情)和组成推理(合并多个视觉属性).

- ** MM-Vet**通过要求模型同时使用多种技能来评价综合多模式能力:识别、OCR、空间意识、语言生成和知识检索,所有这一切都是一个问题。

- **MathVista** 测试数学推理而不是视觉输入:几何图,统计图,函数图和科学数字. 这一基准具体针对多模式思维链能力。

- ** 视听基准** 如AVQA(视听问题回答),测试模型是否能够说明所见所闻之间的关系。例如:"说话的人是左边还是右边?

- ** 代理基准** 如WebArena、OSWorld和SWE-bench评价在互动环境中完成的任务。衡量标准一般是成功率:代理人正确完成的任务分出多少? 这些基准尤其具有挑战性,因为它们需要长期规划并收回错误。

- ** Holistic评价** 诸如LMSYS Chatbot Arena之类的框架采用人首偏好判断,以头对头的形式. 两种模式显示相同的多式输入,由人类裁判选择更好的反应. Elo的收视率是根据数千次这种比较计算的,提供与整体模型质量密切相关的单一分级。

- 多式联运评价中的一个长期挑战是**数据被污染**:因为这些模型都接受了互联网规模数据的培训,因此这套培训中可能会出现基准图像和问题。谨慎的分解和建立暂停试验装置是基本但不完善的保障措施。

## 世界模型


- 想象一下,闭上眼睛,想象一下,如果你把一副玻璃从桌子的边缘推开, 会发生什么事。你"看见"它倒下, "听到" 碎裂,和"感觉" 这是一个坏主意。你的大脑正在运行一个**世界模型**:一种内部模拟环境的物理和因果结构,可以预测未来状态跨越多种模式.

- 在AI背景下,一个世界模型是一个学习到的函数,它根据当前状态和一种行动来预测世界的下一个状态:

$$\hat{s}_{t+1} = g_\phi(s_t, a_t)$$

- 地点$s_t$现状(可能包括视觉、听觉和自发信息),$a_t$是一种行动,并且$\hat{s}_{t+1}$是预测的下一个状态。国家$s_t$生活在一个有学问的潜在空间中,而不是原始像素空间,使得预测问题可以被引导.

- ** 视频预测模型**,如Sora(OpenAI)和Genie(Google DeepMind)是走向世界模型的重大步骤。他们学会生成时间上一致的视频帧,以文本提示和/或动作序列为条件. 虽然它们常被作为视频生成器来讨论,但基础能力更接近于世界模拟:该模型已经内化了足够多的物理(重力,相撞,隔离,流体动力学),以形成可信的未来.

- 与多式建筑的连接是深厚的. 一个只预测像素的世界模型是有限的;一个真正有用的世界模型可以预测各种模式. 如果推出玻璃,世界模型应该预测视觉轨迹(玻璃倒地),听觉事件(玻璃碎地)和语义后果(你现在已经把玻璃倒地了). 统一的多模式架构是世界模式的自然选择,因为它们已经代表了共享空间中的所有模式。

- 在形式上,一种多式世界模式的选择:

$$\mathcal{L}_\text{world} = \mathbb{E}\left[\sum_{m \in \mathcal{M}} \lambda_m \| s_{t+1}^m - g_\phi^m(s_t, a_t) \|^2 \right]$$

- 地点$s_{t+1}^m$以模式显示的地真相状态$m$财务报告和已审计财务报表$g_\phi^m$是世界模型中特定模式的预测头目。共同的潜在动态$g_\phi$在联合多模式空间中运行,而特定模式头则将预测解码为每种模式的本地格式。

![图示](../images/multimodal_world_model.svg)

- ** JEPA**(联合嵌入预测架构)由Yann LeCun提出,为避免像素水平预测的陷阱的世界模型提供了一个框架. JEPA没有预测原始像素(这种像素将能力浪费在诸如精确纹理等不相关的细节上),而是预测嵌入空间. 该模型学习了将观测图映射到嵌入的编码器和预测未来嵌入的预测器:

$$\hat{\mathbf{z}}_{t+1} = h_\psi(\mathbf{z}_t, a_t), \quad \mathbf{z}_t = \text{Enc}(s_t)$$

- 损失比较了嵌入式而非原始观测,后者更强健到能感知到别名(许多不同的像素配置可能代表同一个语义状态). 这种方法对于多模式世界模型来说特别有希望,因为它自然在统一建筑已经提供的共享嵌入空间中运作。

- 世界模型的实用性超出了学术兴趣. 在**以模型为基础的强化学习**中,代理人利用其世界模式在采取行动前"想象"其后果,大幅地减少了现实世界所需的互动次数(回顾第11章关于以模型为基础的RL的讨论). 在**自主驱动**中,一个世界模型预测了未来几秒钟由于不同的指导决定而将如何演进场景. 在**robotics **中,一个世界模型允许机器人在被执行之前先进行精神排练来操作序列.

- 世界模型研究的前沿正在走向**互动世界模型**,这些模型是实时运行的,是对任意用户行为的回应,基本上成为完全从数据中学习的通用模拟器. Genie 2 (Google DeepMind) 为3D环境演示了这一点:给一个单一的图像,它会产生一个交互的,可控制的3D世界,用户可以探索. 世界模型和统一的多模式结构的趋同表明,未来一个单一模型能够感知、预测、模拟和跨越所有模式采取行动。

## 编程任务（使用 Colab 或 notebook）


** 任务1:建立最低限度的多式代号互换器**

- 写入一个功能,将文本字符串和一个假"图像"(一个小的2D阵列)并把它们的象征性表达符放入有模式嵌入的单一平面序列中.

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

** 任务2:可视化跨模式的注意模式**

- 创建合成多模式序列并计算自意分数,以查看图像符号如何处理文本符号,反之亦然.

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

** 任务3:以特定模式损失加权模拟分阶段培训**

- 说明特定模式的损失权重如何影响玩具多模式培训循环。观察平衡损失如何阻止一种模式占据主导地位.

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
