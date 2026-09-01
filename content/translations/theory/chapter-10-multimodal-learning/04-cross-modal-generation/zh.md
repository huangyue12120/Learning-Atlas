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

*跨模态生成是在一种模态的输入条件下生成另一种模态的输出，例如文本生成图像、图像生成文本、文本生成音频等。本篇涵盖 DALL-E、Stable Diffusion、classifier-free guidance、ControlNet、图像描述、文本生成视频（Sora）和文本生成音频。*

- 在本章第 01–03 篇中，你学习了如何表示、对齐和词元化不同模态。现在进入创造环节：从一种模态生成另一种模态。跨模态生成是文生图工具、视频合成系统、音乐创作模型和图像描述系统背后的引擎。可以把它想象成教机器成为多媒体艺术家——你用文字描述想要的内容，它负责绘画、动画或作曲。

- 核心思想是**条件生成**：给定模态 $A$ 的输入（例如文本），产生模态 $B$ 的输出（例如图像）。形式化地说，我们学习模型 $p_\theta(y \mid x)$，其中 $x$ 是条件信号，$y$ 是生成结果。难点在于这个条件分布极其复杂且维度很高——一幅 512x512 的图像位于 $\mathbb{R}^{786432}$ 中，而单个文本提示词可能对应许多张有效图像。

![跨模态生成总览：文本、图像、音频和视频通过有向箭头相连，展示文生图、图生文、文生音频和文生视频等生成路径](../images/cross_modal_generation_overview.svg)

## 文本生成图像

- 想象你向法庭速写师描述一个场景。速写师需要理解你的话，回忆物体的外观，在空间中组织它们，再绘制最终图像。文本生成图像模型做的正是这些事，只不过它们必须从数据中学习，而不是经过多年的美术训练。

### DALL-E：自回归图像生成

- **DALL-E**（Ramesh 等，2021）把图像生成视为序列预测问题——这与语言模型所使用的范式（第 07 章）相同。关键洞见是：只要能把图像表示为离散 token（回顾第 03 篇的 VQ-VAE），生成图像就只是一个接一个地生成 token。

- 流程分两个阶段。首先，**离散 VAE（dVAE）**把 256x256 图像压缩为来自包含 8192 个条目的 codebook 的 32x32 离散 token 网格，把图像缩短为 1024 个 token 的序列。其次，训练一个 **Transformer decoder** 来建模由 256 个文本 token（使用 BPE 编码）和 1024 个图像 token 拼接而成的联合分布，共 1280 个 token：

$$p(x_{\text{text}}, x_{\text{img}}) = \prod_{i=1}^{1280} p(x_i \mid x_1, \ldots, x_{i-1})$$

- 生成时输入文本 token，模型再以自回归方式逐个采样图像 token。这种方案很优雅，因为它复用了语言建模的完整机制——attention、因果 mask 和 top-k 采样——来合成图像。

- 缺点是自回归生成天然是顺序的：逐个生成 1024 个 token 很慢，而且序列早期的错误会不断累积。DALL-E 通过生成许多候选图像，再用 CLIP（第 01 篇）重新排序并找到与文本提示最匹配的图像来缓解这一问题。

![DALL-E 流程：文本 token 和图像 token 拼成一个序列，由 Transformer decoder 处理，模型根据文本条件自回归预测图像 token](../images/dalle_autoregressive_pipeline.svg)

### Stable Diffusion：带文本条件的潜空间扩散

- **Stable Diffusion**（Rombach 等，2022）采用了完全不同的方法。它不是逐个预测 token，而是从纯噪声出发，在文本提示的引导下逐步去噪成图像。回顾第 8 章的扩散模型——Stable Diffusion 在压缩的潜空间而不是像素空间中运行，因此效率大幅提高。

- 架构由三个协同工作的组件构成。**VAE encoder** 把图像从像素空间（$512 \times 512 \times 3$）压缩到潜表示（$64 \times 64 \times 4$），使维度减少 48 倍。**文本编码器**（通常是 CLIP 或 OpenCLIP）把文本提示转换为 embedding 向量序列。**U-Net 去噪器**接收带噪潜变量、时间步和文本 embedding，并在每一步预测要减去的噪声。文本条件通过 **cross-attention** 层进入 U-Net：

$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d}}\right)V$$

- 其中 $Q$ 来自带噪图像特征，$K,V$ 来自文本 embedding。这样，模型可以在每个空间位置关注相关词语——在去噪“红球”应该出现的区域时，模型会关注 “red” 和 “ball” 这两个 token。

- 推理时，在潜空间中采样 $z_T \sim \mathcal{N}(0, I)$，使用 U-Net 迭代去噪 $T$ 步（通常配合 DDIM 调度执行 20–50 步），再由 VAE decoder 把干净潜变量 $z_0$ 解码回像素空间。整个过程可以在消费级 GPU 上用数秒生成一幅 512x512 图像。

![Stable Diffusion 架构：CLIP 编码文本提示，潜空间中的随机噪声通过与文本 embedding 做 cross-attention 的 U-Net 迭代去噪，最后由 VAE 解码生成图像](../images/stable_diffusion_architecture.svg)

### 实践中的 Classifier-Free Guidance

- **Classifier-free guidance（CFG，无分类器引导）**是让文生图模型真正匹配提示词的关键。回顾第 8 章：CFG 让模型同时进行有条件和无条件训练，然后在采样时放大条件信号：

$$\hat{\epsilon} = \epsilon_\theta(x_t, \varnothing) + s \cdot (\epsilon_\theta(x_t, c) - \epsilon_\theta(x_t, \varnothing))$$

- 其中 $s$ 是引导强度。可以把 $(\epsilon_\theta(x_t, c) - \epsilon_\theta(x_t, \varnothing))$ 看作“朝向提示词的方向”——它捕捉有条件预测与无条件预测之间的差异。乘以 $s > 1$ 会夸大这个方向，让图像更贴近文字描述，但会牺牲多样性。

- 实践中 $s = 7.5$ 是 Stable Diffusion 的常见默认值。$s = 1.0$ 时得到原始模型输出（多样但与提示词的匹配较松）；$s = 20+$ 时图像会过度饱和、重复度变高，但与文字高度一致。最优 $s$ 取决于应用：创意探索偏好更低的引导强度，精确遵循提示词则需要更高的引导强度。

### Imagen：结合语言理解的级联扩散

- **Imagen**（Saharia 等，2022）证明，强大的文本编码器比更大的图像模型更重要。Imagen 不使用 CLIP，而是使用冻结的 **T5-XXL** 语言模型（第 07 章）作为文本编码器；它对语言语义、组合关系和空间关系的理解更加丰富，例如“蓝色立方体位于红色球体上方”。

- Imagen 使用**级联扩散**：基础扩散模型生成 64x64 图像，第一个超分辨率模型放大到 256x256，第二个超分辨率模型达到 1024x1024。每一级都是独立的扩散模型，根据文本以及（对放大器而言）低分辨率图像进行条件生成。这个级联避免基础模型在初始分辨率下直接建模细节，让基础模型专注构图和语义，让放大器处理纹理和清晰度。

- Imagen 还引入了**动态阈值**：在每个去噪步骤中，按照基于百分位数的范围裁剪预测像素值，而不是固定裁剪到 $[-1, 1]$。这能防止高引导强度下常见的饱和伪影。

### Parti：大规模自回归生成

- **Parti（Pathways Autoregressive Text-to-Image）**（Yu 等，2022）以巨大的规模重新采用自回归路线。它和 DALL-E 一样把图像转换成离散 token（使用 ViT-VQGAN），再用 Transformer 顺序生成。但 Parti 使用了基于 Pathways 架构、拥有 200 亿参数的 encoder-decoder Transformer，并表明只要规模足够大，自回归模型也能达到扩散模型的质量。

- Parti 的 encoder-decoder 架构是它与 DALL-E decoder-only 设计的关键区别。文本经过 encoder，decoder 在生成图像 token 时对编码后的文本做 cross-attention。这类似于机器翻译（第 07 章）——把“文本语言”翻译成“图像语言”。

### DiT 与基于流的生成

- **Diffusion Transformers（DiT）**（Peebles 与 Xie，2023）用普通 Transformer 替换扩散模型中的 U-Net 主干。每个带噪潜空间 patch 都被视为一个 token（类似第 8 章的 ViT），Transformer 对这些 token 做 self-attention，并对文本条件做 cross-attention。DiT 表明，对于扩散模型，Transformer 的扩展行为比 U-Net 更可预测——计算量翻倍可以稳定地让 FID 降低一半。

- **Flow matching（流匹配）**（回顾第 8 章）已经成为噪声预测扩散范式的替代方案。模型不再预测要减去的噪声 $\epsilon$，而是预测速度 $v_\theta(x_t, t)$，让样本沿着从噪声到数据的直线路径移动。**Stable Diffusion 3** 和 **Flux** 采用了结合**多模态 DiT（MM-DiT）**的 flow matching：文本和图像 token 在 Transformer block 中联合处理并进行双向 attention，两种模态相互关注，而不只是让文本通过 cross-attention 为图像特征提供条件。

![DiT 架构：带噪潜变量 patch 像 ViT 一样词元化，由带时间步和类别条件自适应层归一化的 Transformer block 处理，再解码回空间潜变量](../images/dit_architecture.svg)

## 文本生成视频

- 文本生成视频可以看作增加了一个严苛约束的文生图：**时间一致性**。每一帧都必须内部自洽（是一张有效图像），相邻帧还必须平滑连接——物体应自然移动，光照应连续变化，“摄像机”应沿物理上合理的轨迹运动。它类似于绘制一幅风景与导演一部电影之间的差别。

### 时间维度的挑战

- 与图像生成相比，视频增加了三个挑战。**时间一致性**要求物体在各帧保持身份——第 1 帧的狗在第 100 帧仍应是同一只狗。**运动建模**要求学习物理动力学：物体如何移动、重力如何作用、流体如何流动。**计算成本**非常高：10 秒、24 fps、512x512 分辨率的视频包含 $10 \times 24 \times 512 \times 512 \times 3 \approx 188$ 百万个数值，约是单幅图像数据量的 240 倍。

### Make-A-Video 与延展到视频的方法

- **Make-A-Video**（Singer 等，2022）采用了务实方法：从预训练的文生图模型开始，并加入时间层。关键洞见是，你已经拥有在数十亿图文对上训练的强大文生图模型，只需要从（无标注）视频数据中学习运动。

- Make-A-Video 把**时间 attention**和**时间卷积**插入预训练的空间 U-Net。空间层（在图像上预训练）处理外观，新加入的时间层（在视频上训练）处理运动。空间 self-attention 在每一帧内部运行；时间 attention 在每个空间位置跨帧运行。这种分解很高效，因为时间模式和空间模式在很大程度上可以分开处理。

- 生成流程类似 Imagen 的级联：基础模型在 64x64 生成 16 帧，然后空间和时间超分辨率模型把它放大到目标分辨率和帧率。帧插值网络会进一步提高时间平滑度。

### VideoPoet 与基于 token 的视频模型

- **VideoPoet**（Kondratyuk 等，2024）把视频生成统一到语言建模范式下。所有模态——文本、图像、视频和音频——都被词元化为离散序列，然后训练一个大型语言模型（LLM）在所有模态之间自回归预测 token。这使零样本能力成为可能：文生视频、图生视频、视频生音频、视频编辑和补全都可以从同一个模型中产生。

- VideoPoet 使用 MAGVIT-v2 encoder（3D VQ-VAE，见第 03 篇）词元化视频，同时压缩空间与时间维度。音频用 SoundStream 词元化。LLM 主干先在文本上预训练，再在多模态 token 序列上微调，从而学习模态之间的联合分布。

### Sora 风格的时间扩散

- **Sora**（OpenAI，2024）凭借生成长而连贯、符合物理规律的视频，把时间扩散带入大众视野。虽然完整架构细节尚未公开，但关键思想包括把 DiT 扩展到时空：视频帧被拆成跨越高度、宽度和时间的**时空 patch（3D 块）**，并将这些 patch 作为大型 Transformer 的 token。

- 时空 patch 方法让模型把视频作为原生 3D 信号处理，而不是一串 2D 帧。这使它能够捕获长距离时间依赖——模型可以在整个视频时长上“提前规划”，而不是一帧一帧地生成。

- Sora 可以通过调整时空 patch 数量来处理不同的时长、分辨率和宽高比。在原生分辨率的数据上训练（而不是把所有内容裁成正方形）能够改善构图和取景质量。

### Wan：开源视频生成

- **Wan**（Wan 等，2025）是一组开源视频生成模型（13 亿和 140 亿参数），采用 DiT 主干和 3D VAE 时间压缩。Wan 使用 **flow matching** 而不是传统 DDPM 风格的扩散，学习从噪声到视频潜变量的直线传输路径。3D VAE 在空间和时间上压缩视频（时间压缩 4 倍），DiT 再用完整的 3D attention 处理生成的时空潜变量 token。

- Wan 支持文本生成视频、图像生成视频（让静态图像动起来）和视频编辑。14B 模型可以生成最长 5 秒、720p 分辨率的连贯视频，说明只要架构和训练配方选择得当，开源模型也能接近闭源系统的质量。

![文本生成视频流程：语言模型编码文本，时间扩散 Transformer 关注文本 embedding 并对时空噪声去噪，3D VAE 将其解码为视频帧](../images/text_to_video_pipeline.svg)

## 文本生成音频

- 想象电影作曲家读完剧本后为电影谱写配乐。文本生成音频模型做类似的事情：给定文本描述（“一场伴随大雨和远处雷声的雷暴”），生成对应的音频波形。难点在于连接文本离散、符号化的性质与声音连续、时间性的性质。

### AudioLM：音频语言建模

- **AudioLM**（Borsos 等，2023）通过自回归预测离散音频 token 生成音频，采用的语言建模范式与 DALL-E 生成图像时相同。它使用分层 token 结构：**语义 token**（来自 w2v-BERT 等自监督模型，回顾第 9 章）捕捉高层内容（说了什么或演奏了什么），而**声学 token**（来自 SoundStream 神经音频编解码器）捕捉细粒度声学细节（听起来如何——音色、录音质量）。

- 生成分两个阶段。首先，Transformer 根据可选的音频提示预测语义 token，建立高层内容计划。其次，另一个 Transformer 以语义 token 为条件预测声学 token，补充声学细节。这种层级结构类似文本转语音流程（第 9 章）——语义 token 起到音素的作用，声学 token 起到 mel 频谱帧的作用。

- AudioLM 可以生成语音续写（给定 3 秒语音，生成接下来的 10 秒）、音乐续写和音效；它只用音频数据训练的单个模型就能完成这些任务，预训练不需要文本标签。

### MusicLM：文本条件音乐

- **MusicLM**（Agostinelli 等，2023）把 AudioLM 扩展到文本条件音乐生成。它加入来自 **MuLan** 的文本—音频联合 embedding；MuLan 是类似 CLIP、在音乐—文本对上训练的模型。MuLan embedding 捕捉文本描述（“带萨克斯独奏的欢快爵士乐”）的语义，并引导分层 token 生成。

- MusicLM 以 24 kHz 生成任意时长的音乐，在长达数分钟的片段中保持旋律和节奏连贯。它还可以同时接收哼唱旋律（由音高跟踪器提取 melody token）和文字描述，生成符合哼唱旋律、风格遵循文字描述的完整编曲。

### MusicGen：高效的单阶段生成

- **MusicGen**（Copet 等，2023）简化了多阶段方案。它不使用独立的语义模型和声学模型，而是使用单个自回归 Transformer，直接生成音频 codec 的多个 codebook 层级。关键创新是**交错 codebook 模式**：它不是生成一个时间步的所有 codebook 层级后再进入下一时间步，而是按跨 codebook 和时间步交错的模式生成，从而让部分 codebook 层级可以并行解码。

- 条件输入很直接：文本由 T5 encoder 编码，文本 embedding 被添加到音频 token 序列前面（类似语言模型中的前缀提示），或通过 cross-attention 注入。MusicGen 也支持旋律条件：把参考旋律的 chromagram（来自第 9 章讨论的频谱特征）编码后，与文本条件一起使用。

$$p(a_1, \ldots, a_T) = \prod_{t=1}^{T} \prod_{k=1}^{K} p(a_{t,k} \mid a_{<t}, c_{\text{text}})$$

- 其中 $a_{t,k}$ 是时间步 $t$、codebook 层级 $k$ 的音频 token，$c_{\text{text}}$ 是文本条件。对 $k$ 的乘积如何分解取决于 codebook 模式——有些层级会并行预测。

![文本生成音频流程：语言模型编码文本，Transformer decoder 按交错模式在多个 codebook 层级上生成离散音频 token，音频 codec decoder 重建波形](../images/text_to_audio_pipeline.svg)

## 图像生成文本

- 现在反过来：给定一幅图像，生成自然语言描述。这就是**图像描述（image captioning）**，也是一种条件文本生成，其中图像是条件。可以把它想象成博物馆讲解员描述一幅画——他必须感知视觉内容、理解物体之间的关系，并用流畅语言表达观察结果。

### 把描述视为条件生成

- 经典方法采用 **encoder-decoder** 架构（第 07 章）。预训练 CNN 或 ViT（第 8 章）把图像编码为一组特征向量。语言模型 decoder 每次生成一个描述词，并在每一步关注图像特征：

$$p(w_1, \ldots, w_L \mid I) = \prod_{l=1}^{L} p(w_l \mid w_1, \ldots, w_{l-1}, I)$$

- 其中 $w_l$ 是描述词，$I$ 是图像表示。Cross-attention 把文本 decoder 与图像特征连接起来，使模型生成不同词语时可以“查看”图像的不同区域——生成 “dog” 时关注狗所在的区域，生成 “park” 时关注公园区域。

- **CoCa（Contrastive Captioners）**（Yu 等，2022）在同一个模型中统一了对比学习（第 01 篇的 CLIP 风格目标）与图像描述。图像 encoder 生成的特征既用于与文本进行对比对齐，也用于描述 decoder 的 cross-attention。这种多任务训练让 CoCa 兼具很强的零样本识别能力（来自对比学习）和生成能力（来自描述训练）。

### 现代视觉—语言描述

- 现代方法经常使用**大型多模态模型**（第 02 篇）进行描述。LLaVA、Qwen-VL 和 GPT-4V 等模型把描述当作视觉问答的特例——隐含的问题是“描述这幅图”。视觉编码器（CLIP ViT 或 SigLIP）生成 patch token，再投影到 LLM 的 embedding 空间，由 LLM 生成自由形式的描述。

- 基于 LLM 的描述相较专用 encoder-decoder 模型的优势是**指令遵循**：你可以要求不同详细程度（“用一句话描述”与“提供一段详细描述”）、聚焦特定方面（“描述颜色”），或生成结构化输出（“列出所有物体及其位置”）。这种灵活性来自 LLM 的指令调优（第 07 章）。

## 视频—音频联合生成

- 想象关掉声音看电影——体验会变得空洞。视觉内容与音频紧密耦合：弹跳的球会发出有节奏的撞击声，下雨会发出滴答声，人群会产生欢呼声。**视频—音频联合生成**试图同时生成两种模态，并保持所见与所闻在时间上的对齐。

### 联合时间建模

- 核心挑战是**时间同步**：鼓声必须恰好与鼓槌击中鼓面的那一帧重合。这需要一种共享的时间表示，让两种模态都能参照它。

- 一种方案是从共享的潜在时间轴生成视频和音频。**CoDi（Composable Diffusion）**（Tang 等，2023）为每种模态使用独立扩散模型，但通过共享潜空间对齐它们。训练时，跨模态 attention 层学习在每个时间步同步视觉和音频特征；生成时，两个扩散过程同时运行，并通过共享对齐相互提供条件。

- 上文介绍的 VideoPoet 采用更统一的方法：由于所有模态都被词元化到同一个序列中，LLM 会自然学习视频 token 与音频 token 之间的时间对应关系。一段先出现吠叫狗的视频片段，后面跟着对应音频 token，会教模型把狗的吠叫动作与吠叫声关联起来。

- **时间对齐损失**会显式约束同步。一种做法是在帧级别使用对比学习：时间 $t$ 的音频片段应比其他时间的帧更接近时间 $t$ 的视频帧：

$$\mathcal{L}_{\text{sync}} = -\mathbb{E}_t \left[\log \frac{\exp(\text{sim}(v_t, a_t) / \tau)}{\sum_{t'} \exp(\text{sim}(v_t, a_{t'}) / \tau)}\right]$$

- 其中 $v_t$ 和 $a_t$ 是时间 $t$ 的视频和音频表示，$\tau$ 是温度参数。它在结构上与第 01 篇的 InfoNCE 损失相同，只是应用在时间帧级别，而不是片段级别。

## 指令遵循生成

- 想象告诉艺术家“让天空更有戏剧性”或“把帽子换成王冠”。**指令遵循生成**让你可以用自然语言命令编辑图像，而不需要精确的空间 mask 或画笔笔触。

### InstructPix2Pix：按描述编辑

- **InstructPix2Pix**（Brooks 等，2023）训练一个条件扩散模型，接收输入图像和文本指令，再生成编辑后的图像。巧妙之处在于训练数据的构造：GPT-3 生成编辑指令（“把它变成冬天”“把猫变成狗”），并配合输入—输出文本描述；文生图模型（Stable Diffusion）再生成对应的图像对。

- 该模型是修改后的 Stable Diffusion U-Net，同时接收文本指令（通过 cross-attention）和输入图像潜变量（与带噪潜变量按通道拼接）。它使用**双重 classifier-free guidance**，两个引导强度分别对应文本指令（$s_T$）和输入图像（$s_I$）：

$$\hat{\epsilon} = \epsilon_\theta(x_t, \varnothing, \varnothing) + s_I \cdot (\epsilon_\theta(x_t, c_I, \varnothing) - \epsilon_\theta(x_t, \varnothing, \varnothing)) + s_T \cdot (\epsilon_\theta(x_t, c_I, c_T) - \epsilon_\theta(x_t, c_I, \varnothing))$$

- 其中 $c_I$ 是输入图像条件，$c_T$ 是文本指令。第一个引导项控制保留原图的程度，第二个控制遵循指令的力度。这为用户提供了一个二维旋钮：较高的 $s_I$ 会更贴近保留原图，较高的 $s_T$ 会产生更大幅度的编辑。

![InstructPix2Pix：输入图像和文本指令进入修改后的扩散模型，生成遵循指令且保留未编辑区域的图像](../images/instructpix2pix_pipeline.svg)

### SDEdit 与基于噪声的编辑

- **SDEdit**（Meng 等，2022）提供了一种更简单的编辑方法，不需要专门训练。把噪声加入输入图像（运行前向扩散过程直到中间时间步 $t_0$），再使用描述目标输出的文本提示进行去噪。噪声量控制编辑强度：低噪声保留结构（颜色变化、风格迁移），高噪声允许大幅重构（替换物体、改变布局）。

- 这种权衡可以精确描述：在时间步 $t_0$，带噪图像保留原始信号的 $\bar{\alpha}_{t_0}$ 比例。去噪过程根据新文本提示补全被破坏的细节。这有严格的数学依据：扩散模型从后验 $p(x_0 \mid x_{t_0}, c)$ 采样，其中 $x_{t_0}$ 约束生成结果“接近”原图。

### ControlNet：空间条件

- **ControlNet**（Zhang 等，2023）为文生图扩散加入细粒度空间控制。它复制一个预训练 U-Net encoder，并训练它接收额外的输入条件——边缘图（Canny 边缘）、深度图、姿态骨架、分割图等；原始 U-Net 权重保持冻结。ControlNet encoder 的输出通过**零卷积**（初始化为零的 1x1 卷积）加入冻结 U-Net 的 skip connection，从而保证训练初始时仍是预训练模型的行为，再逐渐学习新条件。

- 这种架构让你可以提供草图、深度图或人体姿态作为结构引导，让文本提示补充外观。预训练权重负责照片真实感和文本理解，ControlNet 层负责遵循条件的空间结构。

## 一致性与对齐指标

- 如何衡量生成图像是否优秀？“好”至少有两个维度：**质量**（看起来像真实图像吗？）和**对齐**（符合文本提示吗？）。人们设计了多种指标来量化它们。

### Frechet Inception Distance（FID）

- **Frechet Inception Distance（FID）**（Heusel 等，2017）在预训练 Inception 网络的特征空间中，衡量生成图像分布与真实图像分布之间的距离。可以把它理解为比较两组图像的“指纹”，而不是逐张比较图像。

- 把真实图像集和生成图像集都输入 Inception-v3，收集倒数第二层的激活。这些激活被建模为多元高斯分布 $\mathcal{N}(\mu_r, \Sigma_r)$ 和 $\mathcal{N}(\mu_g, \Sigma_g)$。FID 是这两个高斯分布之间的 Frechet 距离（Wasserstein-2 距离）：

$$\text{FID} = \|\mu_r - \mu_g\|^2 + \text{Tr}\left(\Sigma_r + \Sigma_g - 2(\Sigma_r \Sigma_g)^{1/2}\right)$$

- FID 越低越好。FID = 0 表示两个分布相同。FID 同时捕捉质量（如果生成图像模糊，其特征会与真实图像不同）和多样性（如果模型发生 mode collapse，$\Sigma_g$ 会小于 $\Sigma_r$）。在 ImageNet 256x256 上，当前典型的先进结果是 FID < 2.0。

- FID 也有已知局限：它假定特征分布为高斯分布（这只是近似），需要数千个样本才能得到稳定估计，并使用 Inception 特征（不一定能捕捉所有感知上重要的差异）。

### Inception Score（IS）

- **Inception Score（IS）**（Salimans 等，2016）衡量两个属性：每幅生成图像都应能被高置信度分类（条件类别分布 $p(y \mid x)$ 应较尖锐），同时生成图像集应覆盖许多类别（边缘分布 $p(y) = \mathbb{E}_x[p(y \mid x)]$ 应接近均匀）。IS 用 KL 散度把这两点结合起来：

$$\text{IS} = \exp\left(\mathbb{E}_x \left[D_{\text{KL}}(p(y \mid x) \| p(y))\right]\right)$$

- IS 越高越好。最大 IS 等于类别数（ImageNet 为 1000）。IS 同时奖励质量（清晰、可识别的图像）和多样性（覆盖多个类别），但局限明显：它完全忽略真实数据分布，不能检测某个类别内部的模式缺失，而且由于使用 Inception 的类别预测，会偏向类似 ImageNet 的图像。

### CLIPScore：衡量文本—图像对齐

- **CLIPScore**（Hessel 等，2021）使用预训练 CLIP 模型（第 01 篇）直接衡量生成图像与文本提示的匹配程度。其分数就是 CLIP 图像 embedding 与文本 embedding 的余弦相似度：

$$\text{CLIPScore}(I, T) = \max(0, \cos(E_I(I), E_T(T)))$$

- 其中 $E_I$ 和 $E_T$ 是 CLIP 的图像和文本编码器。CLIPScore 不依赖参考图像，只需要文本提示。它与人类对文本—图像对齐的判断有较好相关性，已经成为评估文生图提示一致性的标准指标。

- 如果要与参考描述进行比较，**RefCLIPScore** 会加入参考图像：

$$\text{RefCLIPScore} = \text{HarmonicMean}(\text{CLIPScore}(I, T), \max(0, \cos(E_I(I), E_I(I_{\text{ref}}))))$$

- 这样可以在文本对齐与参考图像的视觉相似度之间取得平衡。

![评估指标：FID 比较真实和生成图像集的特征分布，IS 单独衡量生成图像的质量与多样性，CLIPScore 衡量图像 embedding 与文本 embedding 的余弦相似度](../images/generation_evaluation_metrics.svg)

### 人工评估

- 自动指标只是代理指标，人类判断仍然是黄金标准。常见协议包括**成对比较**（两幅图中哪幅更符合提示？）、**Likert 量表**（以 1–5 分评价质量和对齐度）和 **Elo 评分**（以锦标赛形式对多个模型排序）。DrawBench 和 PartiPrompts 基准提供了标准化的提示词集，可用于系统化的人类评估。

## 伦理考量

- 跨模态生成是 AI 中伦理影响最深远的领域之一。根据文字描述生成逼真图像、视频和音频的能力带来了重大风险，实践者必须认真对待。

### 深度伪造与错误信息

- **Deepfake（深度伪造）**是为呈现从未发生过的事件而生成或篡改的媒体。文生图和文生视频模型可以制造公众人物的逼真伪造照片、虚构证据和误导性新闻图像。危险不只是伪造内容本身存在，更在于它的存在会削弱人们对所有媒体的信任——如果任何图像都有可能是假的，就没有图像能被完全信任。

- 检测方法包括用真实图像与生成图像训练分类器、分析统计伪影（GAN 生成图像有细微的频谱特征），以及嵌入不可见水印（Stable Diffusion 的不可见水印、Google 的 SynthID）。但这是一场军备竞赛：生成器改进后，检测器也必须持续更新。

### 生成中的偏差

- 在互联网规模数据上训练的模型会继承并放大社会偏见。对于未明确说明的提示词，文生图模型倾向生成肤色较浅的面孔，把某些职业与特定性别联系起来，并默认采用西方文化规范。这些偏差来自训练数据分布，也来自 CLIP/T5 文本编码器自身的训练语料。

- 缓解策略包括策划更具代表性的训练数据、对文本编码器采用去偏技术、使用安全分类器过滤有问题的输出，以及让用户控制人口属性。但没有任何一种方案是完整解决方案，持续审计仍然必要。

### 内容过滤与安全

- 负责任的部署需要多层保护。**输入过滤**在生成前阻断有害提示词；**输出过滤**对生成内容分类并拒绝有害内容；**NSFW 分类器**检测色情、暴力或其他有害内容。例如 Stable Diffusion 的安全检查器会计算生成图像的 CLIP embedding 与一组预定义有害概念 embedding 之间的余弦相似度，标记超过阈值的图像。

- 许多生成模型（Stable Diffusion、Wan）是开源的，这在普及访问与防止滥用之间制造了张力。模型权重一旦发布，内容过滤就可能被绕过。这引发了关于开放程度、模型开发者责任等问题的讨论。

### 知识产权与同意

- 在互联网数据上训练的生成模型可能未经同意复现受版权保护的风格、商标或真实人物肖像。法律和伦理框架仍在发展，但负责任的实践应尊重退出机制，承认训练数据中包含的创作者贡献，并开发技术防护措施，防止记忆和复述训练样本。

## 编程任务（使用 CoLab 或 notebook）

1. 为一个二维玩具扩散模型实现 classifier-free guidance。在带标签的二维数据集（例如带标签的簇）上训练条件扩散模型，然后用不同引导强度采样，观察质量—多样性的权衡。
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

2. 使用完整的 Frechet 距离公式计算两组二维样本之间的 FID。改变生成分布，观察 FID 如何变化。
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

3. 使用随机投影代替 CLIP，实现文本 embedding 与图像 embedding 之间的 CLIPScore 计算。改变模态之间的“对齐程度”，观察余弦相似度如何变化。
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
