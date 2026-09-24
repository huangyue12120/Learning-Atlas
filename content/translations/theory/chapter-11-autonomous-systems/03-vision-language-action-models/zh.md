---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 11 - autonomous systems/03. vision-language-action models.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 7d6cdced73a21e8209a4596ef979b6a21f713ab59f1edff40f6e91fd6d61476f
status: reviewed
---
# 视觉语言动作模型

*视觉语言动作模型（VLAs）将看到、理解语言和执行动作统一到一个单一的神经网络中。本文件涵盖了VLAs架构、动作标记化、RT-2、Octo、OpenVLA、预训练策略、泛化、无实体性模型以及基准测试*

- 在之前的文件中，我们覆盖了感知（即世界的感觉）和机器人学习（控制身体）。传统上，这些是分开的管道：一个感知模块检测物体，一个语言模块解释命令，一个控制模块生成动作。每个模块都是独立设计、训练和调试的。

- **视觉语言动作模型（VLAs）**将这个管道合并成一个单一的神经网络。该模型接受图像（视觉）、自然语言指令（语言）并输出运动命令（动作）。只有一个模型，从头到尾。

- 这遵循了我们在第10章中看到的趋势：就像多模态模型将视觉和语言理解合并到了一个架构中一样，VLAs将其扩展到物理动作。这个洞察是语言提供了一个自然、灵活的接口来指定任务（“拿起红色杯子并将其放在架子上”），而大型预训练的视觉语言模型已经理解和掌握了图像和指令。

## 从视觉语言到动作

- 记忆第10章中，**视觉语言模型（VLMs）**如LLAVA和Flamingo接受图像和文本作为输入并产生文本作为输出。它们理解场景、回答问题和遵循指令，全部在语言中进行。

- VLAs问：如果输出不是文本而是**机器人动作**呢？相反，该模型生成一个序列的运动命令，使手臂抓取那个杯子。

- 关键的架构洞察是动作可以表示为标记，就像单词一样。如果VLM通过逐词预测语言标记来生成语言，那么VLAs也可以以相同的方式生成动作标记。变换器在本质上并不关心输出标记是否意味着“杯子”或“移动 gripper 2cm向前”。

- 这将机器人控制重新定义为序列建模问题，这正是变换器擅长的（第7章）。该模型学习映射：(图像观察结果、语言指令) $\to$ (动作标记序列)。

## VLA架构

![VLA架构：相机图像和语言指令编码为令牌，通过LL基础网络处理，并解码为机器人动作](../images/vla_architecture.svg)


- 一个典型的VLA有三个组件：

    - **视觉编码器**：处理相机图像并将其转换为视觉标记。通常使用预训练的ViT（第8章）或SigLIP编码器（第10章）。图像被分割成patches，每个嵌入为一个标记，就像标准的视觉变换器一样。

    - **语言模型基础架构**：一个预训练的LLM（例如，LLaMA、PaLM），它处理交错的视觉标记和语言标记序列。这是推理发生的地方：模型理解“拿起红色杯子”是因为它同时关注指令和视觉特征。

    - **动作头**：将LLM的输出映射到机器人动作。这可以是一个简单的MLP，将最后一个隐藏状态映射到连续的动作值，或者一个标记化方案，将动作转换为由LLM现有词汇预测的离散令牌。

- 架构看起来像：

$$\text{Image} \xrightarrow{\text{ViT}} \text{visual tokens} \quad + \quad \text{Instruction} \xrightarrow{\text{tokeniser}} \text{language tokens} \quad \xrightarrow{\text{LLM}} \quad \text{action tokens}$$
- 视觉标记和语言标记被串联（或交错）并输入到变换器骨干中，该骨干自动生成动作标记。这与VLM（第10章）的架构相同，但输出模式是动作而不是文本。

## 动作标记化

- 机器人动作是连续的：关节速度、末端执行器位置和抓手宽度。这些必须转换为离散标记，以便LLM生成它们。

![动作令牌化：连续的动作值被二进制成离散的索引，由LL生成为令牌](../images/action_tokenisation.svg)


- 最简单的方法是 **均匀离散化**。每个动作维度被分成 $N$ 个跨度为有效值范围的 bins。例如，如果 x-速度从 -0.1 到 0.1 m/s 范围内，我们使用 256 个 bins，每个 bin 表示 $\frac{0.2}{256} \approx 0.8$ mm/s。动作值映射到其最近的 bin 索引，成为令牌。

- 使用7个动作维度（6 DOF +夹爪）和256个 bins，动作词汇表包含$7 \times 256 = 1792$个标记。这些标记被添加到LLM现有的文本词汇中。模型按维度逐个生成一个动作标记，就像生成单词一样，自回归地进行。

- **动作分块**一次性预测多个未来的时步，而不是单个动作。如果块大小为$H$，则模型输出$H \times d$个令牌（其中$d$是动作维度）。这对于流畅、时间上连贯的动作至关重要。逐个预测会导致不连续的行为，因为每个预测都是独立的。分块迫使模型规划一个短轨迹，捕捉时间结构。

- 更高级的方法使用 **学习的标记化**，通过 VQ-VAE（第 10 章）。VQ-VAE 编码器将一系列连续的动作映射到一系列离散代码簿索引上，并且解码器从这些索引中重建连续的动作。LLM 生成代码簿索引而不是均匀分箱的值。这类似于图像标记器（第 10 章）如何将视觉信息压缩成紧凑的离散代码。

## 关键的 VLA 模型

- **RT-2**（机器人变换器2，谷歌深度Mind）是第一个大规模VLA。它使用预训练的VLM（PaLM-E或PaLI-X，最多55B参数）并将其微调为机器人演示数据。动作用文本字符串表示：序列“1 128 91 241 5 101 127”编码一个7维动作（每个数字是二进制索引）。

- RT-2展示了令人惊讶的特性：VLM的背景区分能力在机器人中涌现出来。模型可以遵循它从未见过的机器人数据中的概念的指令（例如，“将香蕉移动到以A开头的国家”需要视觉对象识别+世界知识+动作）。VLM的语言理解与视觉推理“免费提供”。

- RT-2的一个限制是，它仅在单个机器人体裁（特定手臂和特定夹子）上进行训练。它不能泛化到不同的机器人。

- **Octo**（加州大学伯克利分校）是一个开源、**平台无关的**VLA，旨在适用于不同机器人平台。关键创新是：

    - 一个**扩散动作头**而不是自回归令牌预测。动作头使用变换器的输出并通过去噪扩散过程产生动作（第8章）。这自然处理多模态动作分布（见下图），其中完成任务有多种有效方式。

![多模态动作分布：回归平均两个有效的路径，通过障碍物形成无效路径](../images/multimodal_action_distribution.svg)


    - **灵活的观察和动作空间**：Octo使用针对不同机器人配置的任务特定标记器。它在Open X-Embodiment数据集上进行了预训练，该数据集中包含来自22个不同机器人配置的演示。

    - **高效微调**：Octo可以使用最多100个演示进行微调，这使得它在数据有限的实验室中非常实用。

- OpenVLA（斯坦福大学、加州伯克利大学）采用了一种基于现有开源VLM（Llama架构）进行微调的方法。它使用了一个7B参数的骨干网络，采用了统一的动作令牌化（每个维度256个 bins），并训练于Open X-Embodiment数据集上。它的优势在于简单性：该架构是一个标准的VLM，只是在词汇表中添加了动作令牌，使得训练和部署变得更加容易，与现有的LLM基础设施兼容。

- **$\pi_0$**（物理智能）代表了最先进的状态。它使用了一个预训练的VLM骨干网络，并结合了一个**流匹配**动作头（第8章）。流匹配通过学习一个速度场，将噪声传输到动作分布中，产生平滑、时间上连贯的动作轨迹。 $\pi_0$展示了惊人的通用性，能够在多种机器人形态下执行任务，包括双臂操作和 Dexterous手控制。

## 预训练方法

- VLAs 从预训练的 VLM 后端中受益匪浅，这些模型已经理解视觉场景和语言。训练管道通常遵循以下阶段：

    1. **VLM 预训练**：使用互联网上的数十亿张图像-文本对（如 CLIP、SigLIP 或 LLaVA 样式）训练或使用现成的视觉语言模型。

    2. **机器人数据协同训练**：在混合的互联网数据和机器人演示数据上微调 VLM。互联网数据防止了视觉和语言理解的 catastrophic遗忘，而机器人数据教授动作生成。混合比至关重要：过多的机器人数据会损害语言理解，过少则无法学习动作。

    3. **任务特定的微调**：可选地在特定任务或机器人上对演示进行微调，通常使用LoRA（第10章）来保持训练参数数量较小。

- 机器人数据量比互联网数据小几个数量级。一个VLM可能预训练在数十亿张图像上，但最大的机器人数据集（Open X-Embodiment）包含所有化身的数百万帧。这种数据稀缺性是至关重要的：视觉和语言表示可以转移，而仅需从有限的机器人数据中学习动作映射。

## 通用化

- VLA的潜力在于**泛化**：在训练期间未见过的任务、从未见过的对象、从未见过的环境和从未见过的指令中执行任务。

- VLAs generalise along several axes:

    - **Novel objects**: the VLM backbone recognises objects from internet pretraining. If the model knows what a "screwdriver" looks like from web images, it can manipulate one even if no robot demonstration ever included a screwdriver.

    - **新指令**：组合语言理解允许模型遵循新的概念组合。即使只训练了堆叠红色方块，模型也能理解颜色形容词，因为这些是从语言预训练中获得的。

    - **新环境**：在一定程度上，VLAs可以在视觉领域（不同表格、照明、背景）之间转移，因为视觉编码器被预训练在多样化的网页图像上。但这种能力也有局限性：一个在实验室中训练的机器人可能在混乱的厨房中挣扎。

    - **新模型**：这是最困难的轴。不同的机器人有不同的动作空间（关节角度 vs.末端执行器速度），不同的传感器（手腕摄像头 vs. overhead摄像头），和不同的物理能力。不依赖于特定机器人的模型，如Octo和$\pi_0$通过灵活的标记器和跨多种机器人类型的预训练来解决这个问题。

- 模型的泛化能力通过在从未训练过的任务上进行评估来衡量。在新任务上的成功率为50%-80%，而对已知数据集的成功率则超过90%。随着模型规模扩大和机器人数据集的增长，这个差距正在缩小。

## 无模型依赖的模型

- 这个领域正朝着 **一个模型，多个机器人** 的方向发展。不再为每个机器人训练单独的策略，而是由单一的 VLA 处理多个形态。

- 这需要解决 **动作空间不匹配** 的问题。一个带有并联夹爪的7自由度手臂有7个动作维度。双臂设置有14个。四足机器人有12个。人形机器人有30+。动作标记必须足够灵活，以处理所有这些。

- 解决方案包括：
    - **填充动作向量**：使用最大的动作空间，并将较小的空间用零填充。
    - **每个机器人类型的单独小MLP**：共享一个Transformer基础架构，为每种机器人类型提供单独的小MLP。
    - **标准化的动作表示**：将所有动作表达在同一个框架中（例如，在世界坐标系下表示末端执行器的速度），这样不同机器人产生相似的末端执行器运动时会共享相同的动作令牌。

- 共享的基础架构学习通用视觉和语言理解，以及常见的操作策略（从上方接近、对准对象、关闭夹具）。每个机器人的特定组件只需要将这些高层次策略翻译成具体的电机命令即可。

## 基准测试与评估

- 评价VLAs（虚拟现实动作学习）特别具有挑战性，因为它需要物理机器人实验或高精度模拟。

- **SIMPLER**（模拟操作策略评估用于机器人学习）提供标准化的模拟环境，用于比较VLA性能而无需物理硬件。它与现实世界的成功率高度相关，并且支持可重复的基准测试。

- **真实世界评估**仍然是黄金标准。典型的流程：
    1. 定义一组带有明确成功标准的任务（物体到达目标位置，正确物体被选中，任务在规定时间内完成）。
    2. 对每个任务运行 $N$ 次试验（通常为 10–50 次）。
    3. 报告成功率及其置信区间。
    4. 包括未训练过的任务来测量泛化能力。

- **开放 X-Embodiment** 数据集和基准汇集了来自 22 所机构的多平台机器人数据。它提供了一个标准化格式用于分享演示，并为跨平台转移提供了共同的评估套件。

## 编程任务（使用 CoLab 或 笔记本）

1. 实现动作分词：将连续的动作离散化到 bins 中，并重构它们。观察量化误差随 bin 数量的变化情况。
```python
import jax.numpy as jnp

# Continuous action: 7 dimensions (6 DoF + gripper)
action_true = jnp.array([0.023, -0.051, 0.012, 0.1, -0.03, 0.005, 0.8])
action_min = jnp.array([-0.1, -0.1, -0.1, -0.5, -0.5, -0.5, 0.0])
action_max = jnp.array([ 0.1,  0.1,  0.1,  0.5,  0.5,  0.5, 1.0])

for n_bins in [16, 64, 256, 1024]:
    # Tokenise: map continuous value to bin index
    normalised = (action_true - action_min) / (action_max - action_min)
    tokens = jnp.clip((normalised * n_bins).astype(int), 0, n_bins - 1)

    # Detokenise: map bin index back to continuous value
    reconstructed = (tokens + 0.5) / n_bins * (action_max - action_min) + action_min

    error = jnp.linalg.norm(action_true - reconstructed)
    print(f"bins={n_bins:4d}  tokens={tokens}  error={error:.6f}")
```

2. 模拟动作分块与单步预测。生成平滑轨迹，对单步预测添加噪声，并与基于分块的预测进行比较。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

# Ground truth smooth trajectory (e.g., reaching motion)
t = jnp.linspace(0, 2 * jnp.pi, 100)
gt_x = jnp.sin(t)
gt_y = 1 - jnp.cos(t)

# Single-step: each prediction has independent noise
rng = jax.random.PRNGKey(42)
noise_ss = jax.random.normal(rng, (100, 2)) * 0.05
single_step = jnp.stack([gt_x, gt_y], axis=1) + noise_ss
# Cumulative drift from single-step errors
single_step_cumulative = jnp.cumsum(noise_ss, axis=0) * 0.3 + jnp.stack([gt_x, gt_y], axis=1)

# Chunked (chunk_size=10): noise is correlated within chunks, smoother
chunk_size = 10
rng2 = jax.random.PRNGKey(7)
chunks = []
for i in range(0, 100, chunk_size):
    chunk_noise = jax.random.normal(jax.random.fold_in(rng2, i), (2,)) * 0.05
    chunk = jnp.stack([gt_x[i:i+chunk_size], gt_y[i:i+chunk_size]], axis=1)
    chunks.append(chunk + chunk_noise)
chunked = jnp.concatenate(chunks, axis=0)

plt.figure(figsize=(8, 4))
plt.plot(gt_x, gt_y, "k-", linewidth=2, label="Ground truth")
plt.plot(single_step_cumulative[:, 0], single_step_cumulative[:, 1],
         "r-", alpha=0.7, label="Single-step (drifts)")
plt.plot(chunked[:, 0], chunked[:, 1], "b-", alpha=0.7, label="Chunked (stable)")
plt.legend(); plt.axis("equal"); plt.grid(True)
plt.title("Action Chunking vs Single-Step Prediction")
plt.show()
```

3. 可视化VLA的动作分布为何可以多模态。使用简单的二维高斯混合体来说明扩散/流匹配动作头优于回归的原因。
```python
import jax
import jax.numpy as jnp
import matplotlib.pyplot as plt

# Two valid ways to reach around an obstacle: left or right
rng = jax.random.PRNGKey(0)
k1, k2 = jax.random.split(rng)

mode1 = jax.random.normal(k1, (200, 2)) * 0.15 + jnp.array([-1.0, 0.5])
mode2 = jax.random.normal(k2, (200, 2)) * 0.15 + jnp.array([ 1.0, 0.5])
samples = jnp.concatenate([mode1, mode2])

# Regression predicts the mean = average of modes (invalid!)
mean_pred = samples.mean(axis=0)

plt.figure(figsize=(6, 5))
plt.scatter(samples[:, 0], samples[:, 1], s=5, alpha=0.5, label="True action distribution")
plt.plot(*mean_pred, "rx", markersize=15, markeredgewidth=3, label="Regression mean (invalid!)")
plt.plot(-1, 0.5, "g^", markersize=12, label="Mode 1 (go left)")
plt.plot(1, 0.5, "b^", markersize=12, label="Mode 2 (go right)")
plt.legend(); plt.grid(True)
plt.title("Multimodal Actions: Why Regression Fails")
plt.xlabel("Action dim 1"); plt.ylabel("Action dim 2")
plt.show()
```
