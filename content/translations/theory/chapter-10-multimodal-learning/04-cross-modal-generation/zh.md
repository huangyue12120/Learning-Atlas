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
# 多模态生成

*多模态生成在给定另一模态输入的情况下，产生一种输出。例如，文本到图像、图像到文本、文本到音频以及更多。本文件涵盖了DALL-E、Stable Diffusion、分类器自由引导、控制网络、图像描述、文本到视频（Sora）和文本到音频生成等。想象一下，你用文字描述了一个场景给 courtroom sketch艺术家，艺术家必须理解你的语言、回忆物体的外观、空间布局并最终绘制出完整的画作。多模态生成模型同样如此，但它们需要从数据中学习这些技能，而不是通过多年的艺术学校教育来掌握。*

- 在本章第01-03节中，你了解了如何表示、对齐和标记不同的模态。现在轮到创造性的行为：从另一种模态生成一种。多模态生成是文本到图像工具、视频合成系统、音乐创作模型以及图像描述的引擎。它就像在教导机器成为一个多媒体艺术家——你用文字描述你想什么，它就能绘画、动画或编曲。

- 核心思想是**条件生成**：给定模态$A$（例如文本）的输入，产生模态$B$（例如图像）的输出。形式上，你学习一个模型$p_\theta(y \mid x)$，其中$x$是条件信号，$y$是生成的输出。挑战在于，这个条件分布极其复杂且高维——512x512的图像生活在$\mathbb{R}^{786432}$中，单个文本提示有多个有效的图像选项。

![](../images/cross_modal_generation_overview.svg)


## 文本到图像生成

- 想象一下，你用文字描述一个场景给 courtroom sketch艺术家。艺术家必须理解你的语言、回忆物体的外观、空间布局并最终绘制出完整的画作。文本到图像模型同样如此，但它们需要从数据中学习这些技能，而不是通过多年的艺术学校教育来掌握。

### DALL-E：自回归图像生成

- **DALL-E**（Rames et al., 2021）将图像生成视为一个序列预测问题——与语言模型（第07章）使用的相同范式。关键洞察是，如果可以将图像表示为离散标记（回想文件03中的VQ-VAE），那么生成图像只是逐个生成一系列标记。

- 管道有两个阶段。首先，一个**离散 VAE (dVAE)**将256x256的图像压缩为32x32网格中的离散标记集（代码书包含8192个条目），从而将图像减少到1024个标记序列。其次，一个**Transformer解码器**被训练来模型256个文本标记（BPE编码）与1024个图像标记的联合分布，总计1280个标记：

$$p(x_{\text{text}}, x_{\text{img}}) = \prod_{i=1}^{1280} p(x_i \mid x_1, \ldots, x_{i-1})$$
- 在生成时，你将文本标记输入模型，并逐个自回归地采样图像标记。这种设计非常优雅，因为它利用了语言建模中使用的注意力、因果遮蔽和top-k采样等机制来进行图像合成。

- 缺点是自回归生成本质上是顺序性的：逐个生成1024个标记很慢，而且早期的错误会累积。DALL-E通过生成许多候选图像并使用CLIP（来自文件01）重新排名它们来缓解这一点。

![](../images/dalle_autoregressive_pipeline.svg)


### 稳定扩散：带有文本条件的潜在扩散

- **Stable Diffusion** (Rombach et al., 2022) takes a fundamentally different approach. Instead of predicting tokens one by one, it starts with pure noise and gradually denoises it into an image, guided by a text prompt. Recall diffusion models from Chapter 8 — Stable Diffusion operates in a compressed latent space rather than pixel space, making it dramatically more efficient.

- The architecture has three components working in concert. A **VAE encoder** compresses the image from pixel space ($512 \times 512 \times 3$) to a latent representation ($64 \times 64 \times 4$), reducing dimensionality by a factor of 48. A **text encoder** (typically CLIP or OpenCLIP) converts the text prompt into a sequence of embedding vectors. A **U-Net denoiser** takes the noisy latent, the timestep, and the text embeddings, and predicts the noise to subtract at each step. Text conditioning enters the U-Net through **cross-attention** layers:

$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d}}\right)V$$
- where $Q$ comes from noisy image features, and $K, V$ come from text embeddings. This lets the model attend to relevant words at each spatial location — when denoising the region where a "red ball" should appear, the model attends to the tokens "red" and "ball".

- At inference, you sample $z_T \sim \mathcal{N}(0, I)$ in latent space, iteratively denoise using the U-Net for $T$ steps (typically 20-50 with DDIM scheduling), and decode the clean latent $z_0$ back to pixel space with the VAE decoder. The entire forward pass generates a 512x512 image in seconds on a consumer GPU.

![](../images/stable_diffusion_architecture.svg)


### 分类器自由引导在实践中

- **分类器自由引导 (CFG)** 是使文本到图像模型生成实际匹配其提示的图像的秘密成分。回想一下第 8 章，CFG 训练模型同时条件和无条件地，然后在采样时放大条件信号：

$$\hat{\epsilon} = \epsilon_\theta(x_t, \varnothing) + s \cdot (\epsilon_\theta(x_t, c) - \epsilon_\theta(x_t, \varnothing))$$
- 其中 $s$ 是引导尺度。将术语 $(\epsilon_\theta(x_t, c) - \epsilon_\theta(x_t, \varnothing))$ 视为“指向提示的方向”——它捕捉了条件预测与无条件预测之间的不同之处。乘以 $s > 1$ 增加了这个方向，使图像更接近文本描述的代价是多样性。

- 在实践中，$s = 7.5$ 是一个常见的默认设置用于 Stable Diffusion。在 $s = 1.0$ 时，你会得到原始模型输出（多样但 loosely匹配提示）。在 $s = 20+$ 时，图像会变得过度饱和且重复，但非常紧密地与文本对齐。最佳的 $s$ 取决于应用：创意探索倾向于较低的引导力，而精确的提示遵循则需要较高的引导力。

### 图像：带有语言理解的级联扩散

- **Imagen**（萨哈拉等人，2022年）表明强大的文本编码器比大型图像模型更重要。而不是使用CLIP，Imagen使用来自第7章的冻结**T5-XXL**语言模型作为文本编码器，它对语言语义、组合性和空间关系有更丰富的理解（例如“一个蓝色立方体在红色球体之上”）。

- Imagen 使用了 **级联扩散** 方法：一个基础扩散模型生成 64x64 的图像，第一个超分辨率模型将其放大到 256x256，第二个超分辨率模型达到 1024x1024。每个阶段都是单独的扩散模型，受文本和（对于上采器）较低分辨率图像的条件约束。这种级联方法避免了在基础分辨率下建模细部细节，允许基础模型专注于构图和语义，而上采器则负责纹理和锐度。

- Imagen 还引入了 **动态阈值化**：在每个去噪步骤中，预测像素值被剪裁到百分位数范围而不是固定范围 $[-1, 1]$。这可以防止高引导尺度下饱和 artefacts的出现，这是扩散模型中常见的问题。

### 第一部分：大规模自回归

- **Parti**（基于路径架构的自回归文本到图像模型，由 Yu 等人于 2022 年提出） revived了自回归方法，并在大规模数据集上取得了显著效果。像 DALL-E 一样，它将图像转换为离散标记（使用 ViT-VQGAN），并按顺序生成它们，使用 transformer。然而，Parti 使用了一个基于路径架构的 200 亿参数编码器-解码器 transformer，并展示了当足够大规模时，自回归模型可以与扩散质量相匹配。

- Parti's encoder-decoder architecture is a key difference from DALL-E's decoder-only design. The text goes through the encoder; the decoder cross-attends to the encoded text while generating image tokens. This mirrors machine translation (Chapter 07) — you translate from "text language" to "image language".

### DiT and flow-based generation

- 扩散变换器（DiT）（Peebles和Xie，2023年）用纯Transformer替换扩散模型的U-Net基础。每个带有噪声的潜伏补丁都被视为一个标记（类似于第8章中的ViT），并由自注意力和交叉注意力处理这些标记以条件文本。DiT表明，与U-Nets相比，变换器在扩散方面表现出更可预测的性能——双倍计算可靠地将FID分数减半。

- **流量匹配**（从第8章回忆）已成为扩散噪声预测范式的一种替代方案。而不是预测噪声 $\epsilon$ 在进行减法运算时，模型预测了一个速度。 $v_\theta(x_t, t)$ 它将样本沿着噪声到数据的直线路径进行运输。 **Stable Diffusion 3** 和 **Flux** 使用多模态 DiT（MM-DiT）架构，其中文本和图像令牌在双向注意力下由 transformer 块 jointly处理——两种模式都相互关注，而不是仅通过交叉注意力条件化图像特征。

![](../images/dit_architecture.svg)


## 文本到视频生成

- 文本到视频是文本到图像的升级，增加了 **时间一致性** 的额外约束。每个帧必须是一个有效的图像，但连续帧之间也必须 smoothly连接——物体应该自然移动、光照应持续变化，并且“相机”应该遵循物理上合理的轨迹。想象一下画一幅单一的风景和导演一部电影之间的区别。

### 时间挑战

- 视频介绍了除了图像生成之外的三个挑战。 **时间一致性**要求对象在帧之间保持一致——在第1帧中出现的狗仍然在第100帧中出现。 **运动建模**需要学习物理动力学：物体如何移动，重力是如何工作的，流体是如何流动的。 **计算成本**非常严重：以24 fps和512x512分辨率录制的10秒视频包含 $10 \times 24 \times 512 \times 512 \times 3 \approx 188$ 百万个值，大约是单张图像的240倍的数据量。

### 录制视频和扩展到视频的方法

- **Make-A-Video**（Singer et al., 2022）采取了实用的方法：从预训练的文本到图像模型开始，并添加时间层。关键洞察是，你已经拥有数十亿对图像和文本的强文本图像模型，而只需要从未标记的视频数据中学习运动。

- Make-A-Video 在预训练的时空 U-Net 中插入了 **时间注意力** 和 **时间卷积** 层。空间层（基于图像预训练）处理外观，而新的时间层（基于视频训练）处理运动。空间自注意力在每个帧内进行；时间注意力在每个空间位置上跨帧进行。这种分解是高效的，因为时间和空间模式 largely分离了。

- 生成管道模仿 Imagen 的级联：基础模型生成 16 帧，分辨率和帧率为 64x64；然后使用时空超分辨率模型将这些帧 upscale 到最终分辨率和帧率。一个帧插值网络增加了时间平滑性。

### 视频诗人和基于令牌的视频模型

- **视频诗人**（Kondratyuk et al., 2024）将视频生成统一在语言建模范式下。所有模态——文本、图像、视频和音频——都被标记为离散序列，并使用单个大型语言模型（LLM）进行自回归预测，以跨模态生成视频。这使得零样本能力得以实现：文本到视频、图像到视频、视频到音频、视频编辑和填充都从同一个模型中涌现出来。

- 视频诗将视频编码为一个 MAGVIT-v2 编码器（来自文件 03），该编码器同时压缩空间和时间维度。音频通过声流进行编码。LLM 主干在文本上预训练，并在多模态令牌序列上微调，学习不同模态之间的联合分布。

### Sora-style Temporal Diffusion

- **Sora** (OpenAI, 2024) brought temporal diffusion to mainstream attention with its ability to generate long, coherent, physically plausible videos. While full architectural details are not published, the key ideas involve scaling DiT to spacetime: video frames are decomposed into **spacetime patches** (3D chunks across height, width, and time), which are treated as tokens for a large transformer.

- The spacetime patch approach means the model processes video as a native 3D signal rather than a sequence of 2D frames. This allows it to capture long-range temporal dependencies — the model can "plan ahead" across the entire video duration rather than generating frame by frame.

- Sora can handle variable durations, resolutions, and aspect ratios by adjusting the number of spacetime patches. Training on data at its native resolution (rather than cropping everything to squares) improves composition and framing quality.

### Wan: Open-Source Video generation

- **Wan**（Wan et al., 2025）是基于DiT基础的开源视频生成模型，包括1.3B和14B参数。Wan使用流匹配而不是传统的DDPM风格扩散，学习从噪声到视频隐变量的直线运输路径。3D VAE在空间和时间上压缩视频（4倍时间压缩），而DiT通过全3D注意力处理这些时空隐变量令牌。

- Wan支持文本转视频、图像转视频（动画静止图像）和视频编辑。14B模型在720p分辨率下生成长达5秒的 coherent视频，展示了开源模型在架构和训练配方选择得当的情况下可以接近 proprietary系统的质量。

![](../images/text_to_video_pipeline.svg)


## 文本到音频生成

- 想象一下电影作曲家阅读剧本并为 soundtrack配乐。文本到音频模型也做类似的事情：给定一个文本描述（“一场大雨和远处的雷声”），它们生成相应的音频波形。挑战在于将离散、符号化的文本与连续、时间性的声音进行连接。

### 音频LM：音频语言建模

- **音频LM** (Borsos et al., 2023) 通过预测离散音频标记自回归生成音频，使用与DALL-E为图像设计的语言建模范式。它采用了一种分层的标记结构：**语义标记**（来自一个自我监督模型如w2v-BERT，参考第9章）捕捉高层次内容（说话或播放的内容），而**声学标记**（来自SoundStream，一种神经音频编码器）捕捉细粒度的声学细节（如何听起来——音质、录音质量）。

- 生成分为两个阶段。首先，一个Transformer根据可选的音频提示预测语义标记，确立高层次内容的计划。其次，另一个Transformer在条件上预测声学标记，填充声学细节。这种层级结构与文本到语音管道（第9章）相似——语义标记扮演着音素的角色，而声学标记扮演着梅尔频谱帧的角色。

- 音频LM可以从单个训练于音频数据的模型中生成说话延续（给定3秒的语音，生成接下来的10秒），音乐延续和声音效果，无需文本标签进行预训练。

### 音乐LM：文本条件下的音乐

- **MusicLM** (Agostinelli et al., 2023) extends AudioLM to text-conditioned music generation. It adds a text-audio joint embedding (from **muLan**, a CLIP-like model trained on music-text pairs) to condition the generation. The MuLan embedding captures semantic meaning of the text description ("upbeat jazz with saxophone solo") and guides the hierarchical token generation.

- MusicLM generates music at 24 kHz for arbitrary durations, maintaining melodic and rhythmic coherence over minutes-long pieces. It can also condition on a hummed melody (using melody tokens extracted by a pitch tracker) plus a text description, generating a full arrangement that follows the hummed tune in the style described by the text.

### MusicGen: 单阶段高效生成

- **MusicGen** (Copet et al., 2023) 简化了多阶段方法。它不再使用单独的语义和声学模型，而是使用一个直接从音频编解码器生成多个代码书级别的单阶段自回归变换器。关键创新是交错代码书模式：而不是在生成一个时间步的所有代码书级别后再移动到下一个时间步，MusicGen交错代码书中的标记并按特定模式排列，允许一些代码书级别的并行解码。

- 条件很简单：文本通过T5编码器编码，并将文本嵌入添加到音频令牌序列（就像语言模型中的前缀提示）或通过交叉注意力注入。MusicGen还支持旋律条件：一个参考旋律的 chromagram（从第9章讨论的频谱特征中获得）被编码并与其他文本条件一起使用。

$$p(a_1, \ldots, a_T) = \prod_{t=1}^{T} \prod_{k=1}^{K} p(a_{t,k} \mid a_{<t}, c_{\text{text}})$$
- 在时间步 $t$ 和代码簿级别 $k$ 处，音频令牌 $a_{t,k}$ 与文本条件 $c_{\text{text}}$ 相关联。 $k$ 的乘积在代码簿模式下因预测级别而异——某些级别是并行预测的。

![](../images/text_to_audio_pipeline.svg)


## 图像到文本生成

- 现在翻转方向：给定一张图片，生成一个自然语言描述。这是 **图像描述**，它是一种条件文本生成，其中图片是条件。想象一下博物馆导游描述一幅画——他们必须感知视觉内容，理解对象之间的关系，并用流畅的语言表达他们的观察结果。

### 图像描述作为条件生成

- 经典方法使用编码器-解码器架构（第7章）。预训练的CNN或ViT（第8章）将图像编码为一组特征向量。语言模型解码器在每个步骤中生成单词，同时关注图像特征：

$$p(w_1, \ldots, w_L \mid I) = \prod_{l=1}^{L} p(w_l \mid w_1, \ldots, w_{l-1}, I)$$
- where $w_l$ are the caption words and $I$ is the image representation. cross-attention connects the text decoder to the image features, allowing the model to "look at" different regions of the image as it generates different words — attending to the dog region when generating "dog" and the park region when generating "park".

- **CoCa** (Contrastive Captioners, Yu et al., 2022) unified contrastive learning (file 01's CLIP-style objective) with captioning in a single model. The image encoder produces features used both for contrastive alignment with text and for cross-attention in a captioning decoder. This multi-task training gives CoCa strong zero-shot recognition (from contrastive learning) and strong generation (from captioning).

### 现代视觉语言描述

- modern approaches often use **large multimodal models** (file 02) for captioning. Models like LLaVA, Qwen-VL, and GPT-4V treat captioning as a special case of visual question answering — the "question" is implicitly "describe this image". The visual encoder (CLIP ViT or SigLIP) produces patch tokens that are projected into the LLM's embedding space, and the LLM generates a free-form description.

- The advantage of LLM-based captioning over dedicated encoder-decoder models is **instruction following**: you can ask for different levels of detail ("describe in one sentence" vs. "provide a detailed paragraph"), focus on specific aspects ("describe the colours"), or generate structured output ("list all objects with their positions"). This flexibility comes from the LLM's instruction-tuning (Chapter 07).

## 视频音频协同生成

- 想象一下，观看一部电影时声音被关掉，这种体验是空洞的。视觉内容和音频之间有着深刻耦合：一个弹跳的球有节奏的“咚”声，雨滴产生“ patter”，人群发出欢呼声。 **视频音频协同生成** 的目标是同时生成两种模态，并保持视觉与听觉之间的时间对齐。

### 协同时间建模

- 核心挑战是 **时间同步**：鼓声的音符必须恰好与显示鼓槌击打鼓的视觉帧完全一致。这需要一个共享的时间表示，两个模态都可以引用。

- 一种方法是通过共享的隐式时间线生成视频和音频。像 **CoDi**（由 Tang et al., 2023 年提出）这样的模型使用单独的扩散模型为每个模态生成，但它们在共享的隐式空间中对齐。在训练过程中，交叉模态注意力层学习在每个时间步上同步视觉和音频特征。在生成过程中，两个扩散过程同时运行，并通过共享的对齐条件彼此影响。

- 视频诗人（如上所述）采取了一种更统一的方法：由于所有模态都被标记为一个单一的序列，LLM自然地学习视频和音频令牌之间的时间对应关系。一个狗吠视频 followed by相应的音频令牌教会模型将视觉中的吠声动作与声音联系起来。

- **时间对齐损失**函数明确地强制同步。一种形式使用帧级对比学习：音频段在时间 $t$ 应该与视频帧在时间 $t$ 更相似，而不是与其他时间的帧更相似：

$$\mathcal{L}_{\text{sync}} = -\mathbb{E}_t \left[\log \frac{\exp(\text{sim}(v_t, a_t) / \tau)}{\sum_{t'} \exp(\text{sim}(v_t, a_{t'}) / \tau)}\right]$$
- 在时间点 $t$，视频和音频的表示分别为 $v_t$ 和 $a_t$。$\tau$ 是一个温度参数。这种结构与文件 01 中的 InfoNCE 损失相同，但应用在帧级而不是剪辑级。

## 指令跟随生成

- 考虑向艺术家传达“让天空更加戏剧化”或“将帽子替换为王冠”的指令。**指令跟随生成**允许你使用自然语言命令而不是精确的空间掩码或画笔来编辑图像。

### InstructPix2Pix：通过描述进行编辑

- **InstructPix2Pix** (Brooks et al., 2023) 训练了一个条件扩散模型，该模型接收输入图像和文本指令，并生成编辑后的图像。聪明的地方在于如何创建训练数据：GPT-3 生成编辑指令（“让它变冷”，“把猫变成狗”）与输入输出文本描述配对，而一个文本到图像模型（Stable Diffusion）生成相应的图像对。

- 模型是一个修改后的 Stable Diffusion U-Net，它接收两个条件：文本指令（通过交叉注意力）和输入图像的潜变量（按通道连接到噪声潜变量）。它使用 **双分类自由引导**，有两个指导尺度——一个用于文本指令（$s_T$），另一个用于输入图像（$s_I$）：

$$\hat{\epsilon} = \epsilon_\theta(x_t, \varnothing, \varnothing) + s_I \cdot (\epsilon_\theta(x_t, c_I, \varnothing) - \epsilon_\theta(x_t, \varnothing, \varnothing)) + s_T \cdot (\epsilon_\theta(x_t, c_I, c_T) - \epsilon_\theta(x_t, c_I, \varnothing))$$
- 其中 $c_I$ 是输入图像条件，$c_T$ 是文本指令。第一个指导项控制如何保留原始图像；第二个指导项控制遵循指令的程度。这给了用户一个二维旋钮：高 $s_I$ 保留原始图像非常接近，而高 $s_T$ 更加戏剧性地进行编辑。

![](../images/instructpix2pix_pipeline.svg)


### SDEdit和噪声基于的编辑

- **SDEdit** (Meng et al., 2022) 提供了一个更简单的编辑方法，不需要特殊训练。你取输入图像，给它添加噪声（运行前扩散过程到中间时间 $t_0$），然后用描述所需的输出文本进行去噪。噪声的量控制了编辑强度：低噪声保留结构（颜色变化、风格转换），而高噪声允许重大重组（对象替换、布局更改）。

- 交易精确：在时间步 $t_0$，噪声图像保留了原始信号的 $\bar{\alpha}_{t_0}$ 分割。去噪过程根据新的文本提示填充了被污染的细节。这在数学上是基于扩散模型从后向 $p(x_0 \mid x_{t_0}, c)$ 样本，其中 $x_{t_0}$ 约束生成为“接近”原始的。

### 控制网：空间条件约束

- ControlNet（张等人，2023）在文本到图像扩散中添加了精细的 spatial控制。一个预训练的U-Net编码器被训练来接受额外的输入条件——边缘图（Canny边缘）、深度图、姿态骨架和分割图。原始U-Net权重被冻结。ControlNet编码器的输出通过零卷积（1x1卷积初始化为零）添加到冻结U-Net的跳连接中，确保训练从预训练模型的行为开始，并逐渐学习新的条件。

- 这种架构允许你提供一个草图、深度图或人体姿态作为结构指南，而文本提示则填充外观。预训练的权重负责实现逼真效果和文本理解；ControlNet层负责条件空间的精确性。

## 一致性与对齐度指标

- 如何衡量生成的图像是否好？“好”至少有两个维度：**质量**（它看起来像一个真实图像吗？）和**对齐度**（它是否与文本提示匹配？）。已经开发了几个指标来量化这些。

### Frechet Inception Distance (FID)

- **Frechet Inception Distance (FID)**（Heusel et al., 2017）衡量生成图像分布与真实图像在预训练的Inception网络特征空间中的距离。可以将其视为比较两个图像集合的“指纹”而非单个图像。

- 两个真实和生成的图像集都通过Inception-v3进行处理，并收集了来自倒数第二层的激活。这些激活被建模为多元高斯分布 $\mathcal{N}(\mu_r, \Sigma_r)$ 和 $\mathcal{N}(\mu_g, \Sigma_g)$。FID是这两个高斯之间的Frechet距离（Wasserstein-2距离）。

$$\text{FID} = \|\mu_r - \mu_g\|^2 + \text{Tr}\left(\Sigma_r + \Sigma_g - 2(\Sigma_r \Sigma_g)^{1/2}\right)$$
- 下降的 FID 更好。FID = 0 表示分布是相同的。FID 捕获了质量和多样性（如果模型遭受模式崩溃，$\Sigma_g$ 将小于 $\Sigma_r$）。在 ImageNet 256x256 上典型的先进值是 FID < 2.0。

- FID 有已知的局限性：它假设特征分布是高斯（近似），需要数千个样本才能获得稳定的估计，并且使用了Inception特征（可能无法捕捉所有感知相关的差异）。

### inception 分数（IS）

- ** inception 分数（IS）**（Salimans 等，2016 年）衡量两个属性：每个生成的图像应该被自信地分类（条件类分布 $p(y \mid x)$ 应该是尖峰的），并且生成的图像集应该覆盖许多类别（边际 $p(y) = \mathbb{E}_x[p(y \mid x)]$ 应该是均匀的）。IS 通过 KL 散度结合了这些。

$$\text{IS} = \exp\left(\mathbb{E}_x \left[D_{\text{KL}}(p(y \mid x) \| p(y))\right]\right)$$
- 高 IS 更好。图像集的最大 IS 等于类的数量（对于 ImageNet 为 1000）。IS 奖励质量（锐利、可识别的图像）和多样性（类的覆盖范围），但存在显著限制：它完全忽略了真实数据分布，无法检测同一类中的模式下降，并且偏向于像 ImageNet 那样的图像，因为它是使用 Inception 的类预测。

### CLIPScore: 测量文本-图像对齐度

- **CLIPScore**（Hessel 等，2021 年）直接使用预训练的 CLIP 模型（文件 01）来衡量生成的图像与文本提示之间的匹配程度。得分是 CLIP 图像嵌入和 CLIP 文本嵌入之间余弦相似度的简单计算：

$$\text{CLIPScore}(I, T) = \max(0, \cos(E_I(I), E_T(T)))$$
- 其中 $E_I$ 和 $E_T$ 是 CLIP 图像和文本编码器。CLIPScore 参考无关 — 它不需要真实图像，只需要文本提示。它与人类对文本-图像对齐度的判断有很好的相关性，并且已成为评估文本到图像模型中提示一致性的标准指标。

- 用于与参考标题进行比较，**RefCLIPScore**考虑了参考图像：

$$\text{RefCLIPScore} = \text{HarmonicMean}(\text{CLIPScore}(I, T), \max(0, \cos(E_I(I), E_I(I_{\text{ref}}))))$$
- 这平衡了文本对齐与视觉相似性到参考图像。

![](../images/generation_evaluation_metrics.svg)


### 人类评估

- 自动化指标是代理；人类判断仍然是黄金标准。常见的协议包括 **成对比较**（哪个图像更符合提示？），**Likert量表**（按1到5评分质量与对齐程度），以及 **Elo评级**（在模型之间进行的锦标赛式排名）。DrawBench和PartiPrompts基准提供了标准化的提示集，用于系统的人类评估。

## 伦理考虑

- 跨模态生成是人工智能领域最具有伦理重要性的领域之一。从文本描述中创建逼真的图像、视频和音频的能力引发了深远的担忧，这些担忧必须认真对待。

### 深fake和 misinformation

- **深度伪造** 是设计用于描绘从未发生事件的媒体。文本到图像和文本到视频模型可以创建令人信服的虚假照片，伪造证据和误导性新闻图像。危险不仅在于假象存在，还在于其存在削弱了所有媒体的信任——如果任何图像都是假的，那么没有任何图像是完全可信的。

- 检测方法包括训练分类器来区分真实和生成的图像，分析统计 artefacts（GAN生成的图像具有微妙的光谱签名），以及嵌入不可见水印（Stable Diffusion的不可见水印，Google的SynthID）。然而，检测是一个军备竞赛：随着生成器改进，探测器必须不断更新。

### 生成中的偏见

- 经过互联网规模数据训练的模型继承并放大了社会偏见。文本到图像模型 disproportionately生成较浅肤色的脸部，将某些职业与特定性别关联起来，并默认使用未指定提示的文化规范。这些偏见根植于训练数据分布和CLIP/T5文本编码器中，它们从自己的训练语料库中编码了偏见。

- mitigation strategies include curating more representative training data, applying debiasing techniques to text encoders, using safety classifiers to filter problematic outputs, and enabling user control over demographic attributes. None of these are complete solutions, and ongoing auditing is essential.

### 内容过滤和安全性

- 负责部署需要多层保护。**输入过滤**在生成之前阻止有害提示。**输出过滤**分类生成的内容并拒绝有害材料。**NSFW分类器**检测色情、暴力或其他有害内容。例如，Stable Diffusion的安全检查器计算生成图像的CLIP嵌入与预定义的有害概念嵌入之间的余弦相似度，标记超过阈值的图像。

- 许多生成模型（如 Stable Diffusion 和 Wan）的开源性质在民主化访问和防止滥用之间产生了矛盾。一旦模型权重被释放，内容过滤就可以被绕过。这导致了关于适当开放程度和模型开发者责任的讨论。

### 知识产权和同意

- 生成模型训练于互联网数据可能会复制受版权保护的风格、商标或真实人物的形象，而无需获得同意。法律和伦理框架仍在发展中，但负责任的做法包括尊重退出机制、承认嵌入在训练数据中的创造性贡献，并开发技术措施来防止记忆和重复训练示例。

## 编程任务（使用 CoLab 或笔记本）

1. 实现一个无指导分类器的2D扩散模型。使用带有标签簇的数据集训练一个条件扩散模型，然后在不同引导尺度下采样，观察质量多样性之间的trade-off。
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

2. 计算两个二维样本集之间的FID，使用完整的Frechet距离公式。改变生成的分布，并观察FID如何变化。
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

3. 实现文本和图像嵌入之间CLIPScore的计算，使用随机投影作为CLIP的替代品。观察当模态间“对齐”程度变化时，余弦相似度的行为。
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
