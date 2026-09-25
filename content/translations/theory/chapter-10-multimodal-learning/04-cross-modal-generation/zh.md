---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 10 - multimodal learning/04. cross-modal generation.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 297749fe76d1d97e2bfd53936c08cf23e6a422c5487c6acb13264290484bf88e
status: reviewed
---
# 跨模态生成

*跨模态生成根据一种模态的输入生成另一种模态的内容，常见任务包括文本生成图像、图像生成文本、文本生成音频和文本生成视频。本文介绍 DALL-E、Stable Diffusion、无分类器引导、ControlNet、图像描述以及视频和音频生成。*

- 本章前 3 篇介绍了模态表示、对齐和词元化。本文转向生成任务：模型根据一种模态的输入生成另一种模态的内容。文本到图像、视频合成、音乐创作和图像描述都属于跨模态生成。

- 跨模态生成通常采用**条件生成**：给定模态 $A$（如文本）的输入，模型生成模态 $B$（如图像）的内容。形式上，模型学习条件分布 $p_\theta(y \mid x)$，其中 $x$ 是条件信号，$y$ 是生成结果。这个分布复杂且维度很高：一张 512 × 512 图像可表示为 $\mathbb{R}^{786432}$ 中的一个点，而且同一段文本可以对应许多合理图像。

![跨模态生成概览：文本、图像、音频和视频之间的生成方向，包括文本到图像、图像到文本、文本到音频和文本到视频](../images/cross_modal_generation_overview.svg)

## 文本到图像生成

### DALL-E：自回归图像生成

- DALL-E（Ramesh et al., 2021）把图像生成视为序列预测问题，与语言模型（第 07 章）使用的范式相同。既然图像可以表示为离散词元（见本章第 03 篇的 VQ-VAE），生成图像就可以转化为逐个生成词元。

- 该流程分两个阶段。第一步，**离散 VAE（dVAE）**把 256 × 256 图像压缩为 32 × 32 的离散词元网格。码本有 8,192 个条目，因此 dVAE 将图像表示为 1,024 个词元。第二步，训练 **Transformer 解码器**对文本和图像词元的联合分布建模：256 个 BPE 文本词元与 1,024 个图像词元拼接后，序列长度为 1,280：

$$p(x_{\text{text}}, x_{\text{img}}) = \prod_{i=1}^{1280} p(x_i \mid x_1, \ldots, x_{i-1})$$

- 生成时，模型接收文本词元，再以自回归方式逐个采样图像词元。这种做法复用了语言模型的注意力、因果掩码和 top-k 采样等机制。

- 自回归生成必须按顺序产生词元，因此逐个生成 1,024 个词元较慢，序列前部的错误也可能传递到后续结果。DALL-E 会先生成多张候选图像，再用 CLIP（本章第 01 篇）重新排序，选出与文本提示最匹配的图像。

![DALL-E 流程：文本词元与图像词元拼接为一个序列，Transformer 解码器根据文本条件自回归预测图像词元](../images/dalle_autoregressive_pipeline.svg)

### Stable Diffusion：带文本条件的潜扩散

- Stable Diffusion（Rombach et al., 2022）采用另一种生成方式：从随机噪声开始，在文本提示的引导下逐步去噪。与第 08 章介绍的扩散模型相同，它不直接在像素空间操作，而是在压缩后的潜空间中去噪，因此计算效率更高。

- 架构由三个协同工作的部分组成。**VAE 编码器**把图像从像素空间（$512 \times 512 \times 3$）压缩到潜表示（$64 \times 64 \times 4$），维度缩小 48 倍。**文本编码器**（通常为 CLIP 或 OpenCLIP）把提示词转换为嵌入向量序列。**U-Net 去噪器**接收带噪潜表示、时间步和文本嵌入，并预测每一步要去除的噪声。文本条件通过 U-Net 中的**交叉注意力**层注入：

$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d}}\right)V$$

- 其中，$Q$ 来自带噪图像特征，$K$ 和 $V$ 来自文本嵌入。这样，模型能在每个空间位置关注相关词语。例如，对应“红球”的图像区域去噪时，模型会关注“红”和“球”对应的词元。

- 推理时，先在潜空间采样 $z_T \sim \mathcal{N}(0, I)$，再用 U-Net 迭代去噪 $T$ 步（DDIM 调度通常为 20–50 步），最后由 VAE 解码器把干净的潜表示 $z_0$ 还原为像素。原文称，消费级 GPU 可在数秒内生成 512 × 512 图像。

![Stable Diffusion 架构：CLIP 编码文本提示，U-Net 在交叉注意力文本条件下逐步去噪潜空间中的随机噪声，再由 VAE 解码成图像](../images/stable_diffusion_architecture.svg)

### 实际应用中的无分类器引导

- **无分类器引导**（CFG）让生成结果更贴合文本提示。模型训练时同时处理有条件和无条件输入，采样时再放大条件预测与无条件预测之间的差异：

$$\hat{\epsilon} = \epsilon_\theta(x_t, \varnothing) + s \cdot (\epsilon_\theta(x_t, c) - \epsilon_\theta(x_t, \varnothing))$$

- 其中 $s$ 是引导尺度。$(\epsilon_\theta(x_t, c) - \epsilon_\theta(x_t, \varnothing))$ 表示加入条件 $c$ 后预测发生的变化。令 $s > 1$ 会放大这一差异，使结果更贴近提示词，但通常会降低多样性。

- Stable Diffusion 常用的引导尺度是 $s = 7.5$。当 $s = 1.0$ 时，模型按原始条件预测采样，图像通常更多样，但对提示词的遵循较弱；当 $s = 20$ 或更高时，图像可能过饱和、重复度增加，但会更贴近文本。合适的 $s$ 取决于用途：创意探索可使用较低引导，严格遵循提示则需要较高引导。

### Imagen：结合语言理解的级联扩散

- Imagen（Saharia et al., 2022）显示，强大的文本编码器可能比更大的图像模型更重要。Imagen 不使用 CLIP，而是冻结 T5-XXL（第 07 章）作为文本编码器。T5-XXL 对语言语义、组合关系和空间关系的理解更丰富，例如“蓝色立方体放在红色球体上方”。

- Imagen 使用**级联扩散**：基础扩散模型先生成 64 × 64 图像，第一个超分辨率模型将其放大到 256 × 256，第二个再放大到 1024 × 1024。每一级都是独立的扩散模型，并以文本为条件；超分辨率模型还以较低分辨率图像为条件。这样，基础模型可以专注于构图和语义，超分辨率模型负责纹理和清晰度。

- Imagen 还提出了**动态阈值化**：在每个去噪步骤中，按百分位范围裁剪预测像素值，而不是固定裁剪到 $[-1, 1]$。这能减少高引导尺度下的饱和伪影。

### Parti：大规模自回归生成

- Parti（Pathways Autoregressive Text-to-Image，Yu et al., 2022）以大规模训练重新推动自回归图像生成。它和 DALL-E 一样，先用 ViT-VQGAN 把图像转换成离散词元，再用 Transformer 按序生成。Parti 使用 200 亿参数、基于 Pathways 架构的编码器—解码器 Transformer，展示了模型规模足够大时，自回归模型也能达到与扩散模型相当的图像质量。

- Parti 与 DALL-E 的一个区别是架构：DALL-E 使用仅解码器结构，Parti 则使用编码器—解码器结构。文本先经过编码器；生成图像词元时，解码器通过交叉注意力读取文本表示。这与第 07 章的机器翻译相似：模型把“文本语言”转换为“图像语言”。

### DiT 与流匹配生成

- **扩散 Transformer**（DiT；Peebles and Xie, 2023）用普通 Transformer 取代扩散模型中的 U-Net 主干。每个带噪潜图块都作为一个词元（类似第 08 章的 ViT），Transformer 使用自注意力和面向文本条件的交叉注意力处理这些词元。DiT 研究显示，扩散模型中的 Transformer 比 U-Net 更容易随计算规模扩展：计算量翻倍时，FID 分数可稳定减半。

- **流匹配**（见第 08 章）是噪声预测扩散方法的一种替代方案。模型不预测要减去的噪声 $\epsilon$，而是预测速度 $v_\theta(x_t, t)$，使样本沿直线路径从噪声移动到数据。Stable Diffusion 3 和 Flux 使用流匹配与**多模态 DiT**（MM-DiT）：文本词元和图像词元由 Transformer 块联合处理，并通过双向注意力彼此交互，而不是只用文本条件化图像特征。

![DiT 架构：带噪潜图块像 ViT 一样词元化，再由包含时间步和类别自适应层归一化的 Transformer 块处理，最后解码回空间潜表示](../images/dit_architecture.svg)

## 文本到视频生成

- 文本到视频除了生成单帧图像，还必须保证**时间连贯性**：每帧都要构成合理图像，相邻帧也要平滑衔接。物体应自然运动、光照应连续变化，摄像机运动也应符合物理规律。

### 时间维度带来的挑战

- 视频生成比图像生成多出三类挑战。**时间一致性**要求物体在不同帧中保持身份一致，例如第 1 帧中的狗到了第 100 帧仍是同一只狗。**运动建模**要求模型学会物理动态，包括物体运动、重力和流体运动。**计算开销**也很大：10 秒、24 fps、分辨率为 512 × 512 的视频包含约 $10 \times 24 \times 512 \times 512 \times 3 \approx 188$ 百万个像素值，约为单张图像的 240 倍。

### Make-A-Video 与扩展到视频的方法

- Make-A-Video（Singer et al., 2022）从预训练文本到图像模型出发，再加入时间层。它的思路是：图文模型已从数十亿组图文对中学到图像与语言的对应关系，视频数据则用于补充运动信息。

- Make-A-Video 在预训练的空间 U-Net 中加入**时间注意力**和**时间卷积**层。预训练的空间层负责外观，新训练的时间层负责运动。空间自注意力在单帧内部运算；时间注意力则在同一空间位置上跨帧运算。空间和时间模式分别处理，计算更高效。

- 生成流程与 Imagen 的级联方法类似：基础模型生成 16 帧、每帧 64 × 64 的视频，再通过空间和时间超分辨率模型提高最终分辨率和帧率；帧插值网络进一步平滑运动。

### VideoPoet 与基于词元的视频模型

- VideoPoet（Kondratyuk et al., 2024）用语言建模范式统一视频生成。模型先把文本、图像、视频和音频转换为离散词元序列，再由单个大型语言模型（LLM）自回归预测不同模态的词元。因此，同一模型可零样本完成文本到视频、图像到视频、视频到音频、视频编辑和修补等任务。

- VideoPoet 使用 MAGVIT-v2 编码器（3D VQ-VAE，见本章第 03 篇）同时压缩视频的空间和时间维度，并用 SoundStream 词元化音频。LLM 主干先在文本上预训练，再在多模态词元序列上微调，以学习不同模态的联合分布。

### Sora 式时间扩散

- OpenAI 于 2024 年发布 Sora。Sora 展示了生成长时间、连贯且符合物理规律视频的能力，也引发人们对时间扩散的关注。完整架构尚未公开；已披露的做法是把 DiT 扩展到时空数据：模型将视频帧切分为跨越高度、宽度和时间维度的**时空图块**，作为大型 Transformer 的输入词元。

- 使用时空图块后，模型直接处理原生 3D 信号，而不是逐帧处理一串 2D 图像。这样可以建模长距离时间依赖，跨整个视频时长规划内容，而不必逐帧生成。

- Sora 通过调整时空图块数量来处理不同时长、分辨率和宽高比。训练时保留数据的原始分辨率，而不是统一裁剪成正方形，有助于构图和取景。

### Wan：开源视频生成

- Wan（Wan et al., 2025）是一系列基于 DiT 的开源视频生成模型，包含 1.3B 和 14B 参数版本，并使用 3D VAE 压缩时间维度。Wan 采用**流匹配**而非传统 DDPM 扩散，学习从噪声到视频潜表示的直线路径。3D VAE 同时压缩空间与时间（时间压缩率为 4 倍），DiT 再用完整 3D 注意力处理时空潜词元。

- Wan 支持文本到视频、图像到视频（为静态图像添加动态效果）和视频编辑。原文称，14B 模型可生成分辨率为 720p、最长 5 秒的连贯视频，展示了经过合适的架构与训练设计后，开源模型也能接近专有系统的质量。

![文本到视频流程：语言模型编码文本，时间扩散 Transformer 在文本嵌入条件下对时空噪声去噪，再由 3D VAE 解码为视频帧](../images/text_to_video_pipeline.svg)

## 文本到音频生成

- 文本到音频模型根据文字描述生成对应的音频波形，例如根据“一场伴有大雨和远处雷声的雷暴”生成声音。难点在于把离散、符号化的文本映射到连续、随时间变化的声音。

### AudioLM：音频语言建模

- AudioLM（Borsos et al., 2023）使用自回归语言建模生成音频词元，思路与 DALL-E 逐词元生成图像类似。它采用分层词元结构：**语义词元**由 w2v-BERT 等自监督模型提取（见第 09 章），表示说话或演奏的内容；**声学词元**由神经音频编解码器 SoundStream 提取，表示音色、录音质量等细节。

- 生成分两个阶段。首先，Transformer 根据可选音频提示预测语义词元，确定内容大纲。然后，另一个 Transformer 根据语义词元预测声学词元，补充声音细节。这种层级结构与第 09 章的文本转语音流程相似：语义词元对应音素，声学词元对应梅尔频谱帧。

- AudioLM 可以续写语音（给定 3 秒语音后生成接下来的 10 秒）、续写音乐，也可以生成音效。预训练只需音频数据，不需要文本标签。

### MusicLM：文本条件音乐生成

- MusicLM（Agostinelli et al., 2023）把 AudioLM 扩展到文本条件音乐生成。它使用 MuLan（类似 CLIP、以音乐—文本对训练的模型）提供的文本—音频联合嵌入作为生成条件。MuLan 嵌入捕捉描述的语义，例如“带萨克斯独奏的欢快爵士乐”，并引导分层词元生成。

- MusicLM 以 24 kHz 生成任意时长的音乐，并能在数分钟的片段中保持旋律和节奏连贯。它还可以同时接收哼唱旋律和文本描述：音高跟踪器先提取旋律词元，模型再按描述的风格为旋律编配完整乐曲。

### MusicGen：高效的单阶段生成

- MusicGen（Copet et al., 2023）简化了多阶段生成流程：它使用单个自回归 Transformer，直接从音频编解码器的多个码本层生成词元。MusicGen 采用**交错码本模式**：模型按特定顺序交错生成各时间步和码本层的词元，因此可以并行解码部分码本层。

- 文本由 T5 编码器处理，文本嵌入可以放在音频词元序列之前，作为前缀提示；也可以通过交叉注意力注入。MusicGen 也支持旋律条件：从参考旋律的频谱特征中提取音级色度图（见第 09 章），并与文本条件一起输入。

$$p(a_1, \ldots, a_T) = \prod_{t=1}^{T} \prod_{k=1}^{K} p(a_{t,k} \mid a_{<t}, c_{\text{text}})$$

- 其中 $a_{t,k}$ 表示时间步 $t$、码本层 $k$ 上的音频词元，$c_{\text{text}}$ 是文本条件。对 $k$ 的乘积分解方式取决于码本生成顺序；某些层可以并行预测。

![文本到音频流程：语言模型编码文本，Transformer 解码器以交错模式生成多个码本层的离散音频词元，音频编解码器解码器再还原波形](../images/text_to_audio_pipeline.svg)

## 图像到文本生成

- 图像到文本生成根据图像生成自然语言描述，也就是**图像描述**任务。它属于条件文本生成，图像是生成条件。

### 将图像描述表述为条件生成

- 经典方法采用编码器—解码器架构（第 07 章）：预训练 CNN 或 ViT（第 08 章）将图像编码为一组特征向量；语言模型解码器在每一步关注图像特征并逐词生成描述：

$$p(w_1, \ldots, w_L \mid I) = \prod_{l=1}^{L} p(w_l \mid w_1, \ldots, w_{l-1}, I)$$

- 其中 $w_l$ 是描述中的词，$I$ 是图像表示。交叉注意力把文本解码器连接到图像特征，使模型生成不同词语时可以关注不同区域，例如生成“狗”时关注狗所在区域，生成“公园”时关注公园区域。

- CoCa（Contrastive Captioners，Yu et al., 2022）在同一模型中结合对比学习（本章第 01 篇所述 CLIP 式目标）与图像描述。图像编码器生成的特征既用于和文本进行对比对齐，也供描述解码器通过交叉注意力读取。多任务训练让 CoCa 同时具备零样本识别能力和文本生成能力。

### 现代视觉语言模型描述图像

- 现代图像描述系统常使用大型多模态模型（本章第 02 篇）。LLaVA、Qwen-VL 和 GPT-4V 等模型把图像描述视为一种特殊的视觉问答：隐含问题是“描述这张图像”。视觉编码器（CLIP ViT 或 SigLIP）生成图块词元并投影到 LLM 嵌入空间，LLM 再生成自由文本描述。

- 与专用编码器—解码器相比，基于 LLM 的方法更容易**遵循指令**：用户可以指定描述长度（如一句话或详细段落）、关注特定内容（如颜色），或要求结构化输出（如列出物体及其位置）。这种灵活性来自第 07 章介绍的指令微调。

## 视频与音频协同生成

- 视频与音频紧密相关：弹跳的球伴随有节奏的撞击声，下雨会产生淅沥声，人群会发出欢呼声。**视频—音频协同生成**要同时生成两种模态，并保持画面与声音的时间对齐。

### 联合时间建模

- 模型要解决**时间同步**问题：鼓槌击中鼓面的画面要与鼓声同时出现。为此，视频和音频需要共享一种时间表示。

- 一种方法是从共享潜在时间轴生成视频和音频。CoDi（Composable Diffusion，Tang et al., 2023）为不同模态使用单独的扩散模型，再通过共享潜空间对齐。训练时，跨模态注意力层学习同步每个时间步的视觉和音频特征；生成时，两个扩散过程同时运行，并通过共享对齐信息彼此条件化。

- VideoPoet 采用更统一的方案：模型把所有模态词元化为单一序列，因此 LLM 可以直接学习视频词元与音频词元之间的时间对应关系。例如，训练序列中若狗吠动作的视频词元后接相应音频词元，模型就能把吠叫动作与吠声联系起来。

- **时间对齐损失**会显式约束同步。一种方法是在帧级进行对比学习：时间 $t$ 的音频片段应与同一时刻的视频帧更相似，而不是与其他时刻的帧相似：

$$\mathcal{L}_{\text{sync}} = -\mathbb{E}_t \left[\log \frac{\exp(\text{sim}(v_t, a_t) / \tau)}{\sum_{t'} \exp(\text{sim}(v_t, a_{t'}) / \tau)}\right]$$

- 其中 $v_t$ 和 $a_t$ 分别是时间 $t$ 的视频和音频表示，$\tau$ 是温度参数。这个公式在结构上与本章第 01 篇的 InfoNCE 损失相同，但作用于帧，而不是整段片段。

## 指令跟随生成

- 指令跟随生成允许用户用自然语言命令编辑图像，无须提供精确的空间掩码或笔刷操作。

### InstructPix2Pix：根据描述编辑图像

- InstructPix2Pix（Brooks et al., 2023）训练一个条件扩散模型，输入图像和文本指令，输出编辑后的图像。训练数据由两部分构成：GPT-3 根据输入、输出图像描述生成编辑指令（如“改成冬天”“把猫变成狗”），再由文本到图像模型 Stable Diffusion 生成对应的图像对。

- 模型使用修改版 Stable Diffusion U-Net，同时接收两种条件：通过交叉注意力输入文本指令；输入图像潜表示则沿通道维度与带噪潜表示拼接。模型使用**双重无分类器引导**，分别用 $s_T$ 控制文本指令，用 $s_I$ 控制输入图像：

$$\hat{\epsilon} = \epsilon_\theta(x_t, \varnothing, \varnothing) + s_I \cdot (\epsilon_\theta(x_t, c_I, \varnothing) - \epsilon_\theta(x_t, \varnothing, \varnothing)) + s_T \cdot (\epsilon_\theta(x_t, c_I, c_T) - \epsilon_\theta(x_t, c_I, \varnothing))$$

- 其中 $c_I$ 是输入图像条件，$c_T$ 是文本指令。第一项引导控制保留原图的程度，第二项控制遵循指令的强度。$s_I$ 越高，结果越接近原图；$s_T$ 越高，编辑幅度越大。

![InstructPix2Pix 流程：输入图像和文本指令进入修改版扩散模型，生成遵循指令并尽量保留未编辑区域的图像](../images/instructpix2pix_pipeline.svg)

### SDEdit 与基于噪声的编辑

- SDEdit（Meng et al., 2022）无需专门训练即可编辑图像：先对输入图像执行前向扩散，在中间时间步 $t_0$ 加入噪声；再根据描述目标结果的文本提示去噪。噪声越少，越能保留原图结构，适合改颜色或风格；噪声越多，越可以重组图像，例如替换物体或改变布局。

- 编辑强度由时间步 $t_0$ 控制。原文称加噪图像保留原始信号的 $\bar{\alpha}_{t_0}$ 比例，去噪过程则根据新提示补全受噪声破坏的细节。从概率角度看，扩散模型从后验分布 $p(x_0 \mid x_{t_0}, c)$ 中采样，其中 $x_{t_0}$ 约束生成结果，使其接近原图。

> **译者注：**按常见 DDPM 前向过程，$x_t = \sqrt{\bar{\alpha}_t}x_0 + \sqrt{1-\bar{\alpha}_t}\epsilon$，原始信号的振幅系数是 $\sqrt{\bar{\alpha}_t}$；$\bar{\alpha}_t$ 对应信号系数的平方。原文把 $\bar{\alpha}_{t_0}$ 直接称为信号比例，表述不够准确。

### ControlNet：空间条件控制

- ControlNet（Zhang et al., 2023）为文本到图像扩散增加精细的空间控制。它复制预训练 U-Net 的编码器，并训练副本接收额外条件，如 Canny 边缘图、深度图、姿态骨架和分割图；原 U-Net 权重保持冻结。ControlNet 编码器通过**零卷积**（初始化为零的 1 × 1 卷积）把输出加到冻结 U-Net 的跳跃连接上。零初始化使模型从原有预训练行为开始，再逐渐学习新的条件。

- 用户可以提供草图、深度图或人体姿态作为结构约束，再由文本提示补充外观。预训练权重负责图像写实度和文本理解，ControlNet 层则让生成结果符合空间条件。

## 生成质量与对齐度指标

- 评估生成图像时，至少要分别考察**质量**（图像是否自然、真实）和**对齐度**（图像是否符合文本提示）。以下指标用于衡量这两个方面。

### Frechet Inception Distance（FID）

- **Frechet Inception Distance**（FID；Heusel et al., 2017）衡量真实图像和生成图像在预训练 Inception 网络特征空间中的分布距离。它比较的是两组图像的整体特征分布，而不是逐张比较图像。

- 将真实图像和生成图像分别输入 Inception-v3，收集倒数第二层的激活，并把它们近似为多元高斯分布 $\mathcal{N}(\mu_r, \Sigma_r)$ 和 $\mathcal{N}(\mu_g, \Sigma_g)$。FID 是这两个高斯分布间的 Frechet 距离，也就是 Wasserstein-2 距离：

$$\text{FID} = \|\mu_r - \mu_g\|^2 + \text{Tr}\left(\Sigma_r + \Sigma_g - 2(\Sigma_r \Sigma_g)^{1/2}\right)$$

- FID 越低越好；FID 为 0 表示两组特征分布相同。FID 同时反映图像质量和多样性：图像模糊会改变其特征，模式坍塌则可能使 $\Sigma_g$ 小于 $\Sigma_r$。原文给出的 ImageNet 256 × 256 先进结果通常低于 2.0。

- FID 有几项局限：它假设特征服从高斯分布，这只是近似；稳定估计需要数千张样本；Inception 特征也未必涵盖所有与感知有关的差异。

### Inception Score（IS）

- **Inception Score**（IS；Salimans et al., 2016）衡量两点：每张生成图像应能被分类器明确分类，即条件分布 $p(y \mid x)$ 较集中；生成图像整体应覆盖多个类别，即边际分布 $p(y) = \mathbb{E}_x[p(y \mid x)]$ 较均匀。IS 用 KL 散度把两者结合起来：

$$\text{IS} = \exp\left(\mathbb{E}_x \left[D_{\text{KL}}(p(y \mid x) \| p(y))\right]\right)$$

- IS 越高越好。最大值等于类别数（ImageNet 有 1,000 类）。IS 试图同时反映图像质量（清晰、可识别）和类别多样性，但它不比较真实数据分布，无法发现同一类别内部的模式丢失，而且由于使用 Inception 分类器，容易偏向类似 ImageNet 的图像。

### CLIPScore：衡量文本—图像对齐

- **CLIPScore**（Hessel et al., 2021）使用预训练 CLIP（本章第 01 篇）直接衡量图像与文本提示的匹配程度，分数为 CLIP 图像嵌入和文本嵌入之间的余弦相似度，并截断到非负值：

$$\text{CLIPScore}(I, T) = \max(0, \cos(E_I(I), E_T(T)))$$

- 其中 $E_I$ 和 $E_T$ 分别是 CLIP 图像编码器和文本编码器。CLIPScore 不依赖参考图像，只需要文本提示。它与人类对图文匹配程度的判断相关，因此常用于评估文本到图像生成的提示词一致性。

- 若要与参考图像比较，**RefCLIPScore** 会结合 CLIPScore 和生成图像与参考图像的视觉相似度：

$$\text{RefCLIPScore} = \text{HarmonicMean}(\text{CLIPScore}(I, T), \max(0, \cos(E_I(I), E_I(I_{\text{ref}}))))$$

- 这种调和平均同时衡量文本对齐和图像与参考图像的视觉相似度。

![评估指标对比：FID 比较真实与生成图像的特征分布，IS 衡量生成图像自身的质量和多样性，CLIPScore 衡量图像与文本嵌入的余弦相似度](../images/generation_evaluation_metrics.svg)

### 人类评估

- 自动指标只能近似人类判断，人工评估仍是重要基准。常见方法包括**成对比较**（比较两张图哪张更符合提示）、**Likert 量表**（按 1–5 分评估质量和对齐度）和 **Elo 评分**（以竞赛形式对模型排序）。DrawBench 和 PartiPrompts 提供标准化提示集，供人工系统评估使用。

## 伦理问题

- 文本到图像、视频和音频的生成能力引出深度伪造、偏见、内容安全、版权和同意等问题。

### 深度伪造与虚假信息

- **深度伪造**是生成或篡改媒体，使其呈现从未发生的事件。文本到图像和文本到视频模型可以生成公众人物的伪造照片、虚假证据和误导性新闻图像。这类伪造内容会削弱人们对媒体整体的信任。

- 检测方式包括训练分类器区分真实与生成图像、分析统计伪影（例如 GAN 图像可能带有细微频谱特征），以及嵌入不可见水印（如 Stable Diffusion 的不可见水印和 Google SynthID）。这是持续升级的攻防过程：生成器改进后，检测器也需要更新。

### 生成偏差

- 使用互联网规模数据训练的模型会继承并放大社会偏见。文本到图像模型更常生成浅肤色面孔，可能把某些职业与特定性别关联起来；提示信息不充分时，也可能默认采用西方文化规范。这些偏差既来自训练数据，也可能来自 CLIP、T5 等文本编码器各自的训练语料。

- 缓解方法包括筛选更具代表性的训练数据、对文本编码器进行去偏、用安全分类器过滤有问题的输出，以及让用户控制人物的人口属性。这些措施仍不完备，团队需要持续审查模型输出。

### 内容过滤与安全

- 负责任的部署需要多层保护。**输入过滤**在生成前拦截有害提示；**输出过滤**识别并拒绝有害内容；**NSFW 分类器**检测色情、暴力或其他有害内容。例如，Stable Diffusion 的安全检查器计算生成图像的 CLIP 嵌入与预设有害概念嵌入之间的余弦相似度，超过阈值时将图像标记出来。

- Stable Diffusion、Wan 等模型开放权重，扩大了公众使用生成模型的机会，也增加了防止滥用的难度。权重公开后，用户可以绕过模型自带的内容过滤，因此模型开放程度和开发者责任仍有争议。

### 知识产权与同意

- 使用互联网数据训练的生成模型可能在未经许可的情况下复现受版权保护的风格、商标或真人肖像。相关法律和伦理规范仍在形成。负责任的做法包括尊重退出机制、承认训练数据中的创作贡献，并开发技术措施，减少对训练样本的记忆和复现。

## 编程任务（使用 Colab 或笔记本）

1. 为玩具二维扩散模型实现无分类器引导。使用带标签簇的二维数据训练条件扩散模型，再用不同引导尺度采样，观察生成质量与多样性的权衡。

   **说明：**原代码生成了环形和聚类两组数据，并在不同子图中重复绘制这两组真实样本；它没有训练去噪模型、应用 CFG 公式或生成新样本，因此不能据此观察引导尺度对生成结果的影响。

2. 用完整的 Frechet 距离公式计算两组二维样本的 FID。改变生成分布，观察 FID 如何变化。

   **说明：**原代码把协方差乘积 $\Sigma_r\Sigma_g$ 直接交给 eigh 求特征分解；该乘积通常不对称，而 eigh 假设输入为对称或 Hermitian 矩阵，因此不一定能正确计算矩阵平方根。

3. 用随机生成的向量模拟 CLIP 图像嵌入和文本嵌入，计算 CLIPScore，并观察余弦相似度如何随两种模态的对齐程度变化。

   **说明：**原代码直接构造共享成分加噪声的嵌入向量，并未实际使用随机投影矩阵；它只是用随机向量模拟图文嵌入。

```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

# Toy 2D conditional diffusion with classifier-free guidance
def noise_schedule(T):
    betas = jnp.linspace(1e-4, 0.02, T)
    alphas = 1.0 - betas
    return jnp.cumprod(alphas)

def forward_diffuse(x0, t, alpha_bars, key):
    noise = jax.random.normal(key, x0.shape)
    return jnp.sqrt(alpha_bars[t]) * x0 + jnp.sqrt(1 - alpha_bars[t]) * noise, noise

# Generate labelled 2D data: class 0 = ring, class 1 = cluster
key = jax.random.PRNGKey(42)
k1, k2, k3 = jax.random.split(key, 3)
theta = jax.random.uniform(k1, (200,)) * 2 * jnp.pi
ring = jnp.stack([jnp.cos(theta), jnp.sin(theta)], axis=1) * 2
ring += jax.random.normal(k2, ring.shape) * 0.1
cluster = jax.random.normal(k3, (200, 2)) * 0.3

data = jnp.concatenate([ring, cluster])
labels = jnp.concatenate([jnp.zeros(200), jnp.ones(200)])

# Simulate CFG: show how guidance pushes samples toward class-conditional modes
# Try varying guidance_scale from 0.0 to 5.0 and observe results
guidance_scales = [0.0, 1.0, 3.0, 7.0]
fig, axes = plt.subplots(1, 4, figsize=(16, 4))
for ax, s in zip(axes, guidance_scales):
    ax.scatter(ring[:, 0], ring[:, 1], s=8, alpha=0.4, label='Ring (c=0)')
    ax.scatter(cluster[:, 0], cluster[:, 1], s=8, alpha=0.4, label='Cluster (c=1)')
    ax.set_title(f'Guidance scale s={s}')
    ax.set_xlim(-4, 4); ax.set_ylim(-4, 4)
    ax.set_aspect('equal'); ax.legend(fontsize=7)
plt.suptitle('Experiment: vary guidance scale and observe quality vs diversity')
plt.tight_layout(); plt.show()
# Exercise: train a small MLP denoiser with class conditioning,
# then implement the CFG formula to sample with different s values.
```
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

def compute_fid(real, generated):
    """Compute Frechet distance between two 2D sample sets."""
    mu_r, mu_g = jnp.mean(real, axis=0), jnp.mean(generated, axis=0)
    sigma_r = jnp.cov(real.T)
    sigma_g = jnp.cov(generated.T)
    diff = mu_r - mu_g
    # Matrix square root via eigendecomposition
    product = sigma_r @ sigma_g
    eigvals, eigvecs = jnp.linalg.eigh(product)
    sqrt_product = eigvecs @ jnp.diag(jnp.sqrt(jnp.maximum(eigvals, 0))) @ eigvecs.T
    fid = jnp.sum(diff ** 2) + jnp.trace(sigma_r + sigma_g - 2 * sqrt_product)
    return fid

key = jax.random.PRNGKey(0)
k1, k2, k3, k4 = jax.random.split(key, 4)

# Real distribution: standard 2D Gaussian
real = jax.random.normal(k1, (1000, 2))

# Generated distributions with increasing divergence
shifts = [0.0, 0.5, 1.0, 2.0, 4.0]
fig, axes = plt.subplots(1, len(shifts), figsize=(18, 3.5))
for ax, shift in zip(axes, shifts):
    gen = jax.random.normal(k2, (1000, 2)) * (1 + shift * 0.2) + shift
    fid = compute_fid(real, gen)
    ax.scatter(real[:, 0], real[:, 1], s=3, alpha=0.3, label='Real')
    ax.scatter(gen[:, 0], gen[:, 1], s=3, alpha=0.3, label='Generated')
    ax.set_title(f'Shift={shift}\nFID={fid:.2f}')
    ax.set_xlim(-5, 8); ax.set_ylim(-5, 8)
    ax.set_aspect('equal'); ax.legend(fontsize=7)
plt.suptitle('FID increases as generated distribution diverges from real')
plt.tight_layout(); plt.show()
# Try: change the variance of generated samples without shifting the mean.
# How does FID respond to a diversity mismatch vs a location mismatch?
```
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

def cosine_similarity(a, b):
    return jnp.dot(a, b) / (jnp.linalg.norm(a) * jnp.linalg.norm(b))

def clip_score(img_emb, txt_emb):
    """CLIPScore: clamped cosine similarity."""
    return jnp.maximum(0.0, cosine_similarity(img_emb, txt_emb))

key = jax.random.PRNGKey(42)
dim = 512  # CLIP embedding dimension

# Simulate aligned and misaligned pairs
# Aligned: image and text embeddings share a component
k1, k2, k3 = jax.random.split(key, 3)
shared = jax.random.normal(k1, (dim,))
shared = shared / jnp.linalg.norm(shared)

noise_levels = jnp.linspace(0, 5, 20)
scores = []
for noise in noise_levels:
    noise_vec = jax.random.normal(k2, (dim,)) * noise
    img_emb = shared + noise_vec * 0.3
    txt_emb = shared + jax.random.normal(k3, (dim,)) * noise * 0.3
    scores.append(float(clip_score(img_emb, txt_emb)))

plt.figure(figsize=(8, 4))
plt.plot(noise_levels, scores, 'o-', color='#2c3e50')
plt.xlabel('Noise level (misalignment)')
plt.ylabel('CLIPScore')
plt.title('CLIPScore decreases as text-image alignment degrades')
plt.grid(True, alpha=0.3)
plt.tight_layout(); plt.show()
# Experiment: what happens if you normalise embeddings before adding noise?
# How does dimensionality affect the score distribution?
```
