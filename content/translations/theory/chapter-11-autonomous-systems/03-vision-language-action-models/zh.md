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

*视觉语言动作模型（VLA）把视觉感知、语言理解与动作执行整合进一个神经网络。本文介绍 VLA 架构、动作词元化、RT-2、Octo、OpenVLA、预训练方法、泛化、跨机器人形态模型和评测基准。*

- 前几篇介绍了感知和机器人学习。传统系统把它们拆成不同模块：感知模块检测物体，语言模块解释指令，控制模块生成动作。工程师分别设计、训练和调试这些模块。

- **视觉语言动作模型（VLA）**把整条处理流程合并到一个神经网络中。模型端到端地接收图像和自然语言指令，并输出运动控制命令。

- 这延续了第 10 章介绍的多模态整合趋势：多模态模型把视觉理解和语言理解放进同一架构，VLA 又把动作纳入其中。语言提供了灵活的任务接口，例如“拿起红色杯子，把它放到架子上”；大规模预训练的视觉语言模型已经能理解图像和指令。

## 从视觉语言到动作

- 第 10 章介绍过**视觉语言模型（VLM）**，例如 LLaVA 和 Flamingo。它们接收图像和文字，输出文字，可以理解场景、回答问题并遵循指令。

- VLA 把输出改为**机器人动作**。模型不再生成“红色杯子在桌子左边”这样的文字，而是生成一串运动指令，控制机械臂抓取杯子。

- 动作也可以像单词一样表示为词元。VLM 通过预测下一个词元逐步生成语言，VLA 也可以用同样的方式生成动作词元。对 Transformer 来说，输出词元表示“杯子”还是“夹爪向前移动 2 厘米”并无本质区别。

- 这样，机器人控制就能表述为 Transformer 擅长的序列建模问题（第 7 章）。模型学习以下映射：图像观测和语言指令 $\to$ 动作词元序列。

## VLA 架构

![VLA 架构：相机图像和语言指令编码为词元，经 LLM 主干处理后解码为机器人动作](../images/vla_architecture.svg)

- 典型的 VLA 包含三个组件：

    - **视觉编码器**：把相机图像转换成视觉词元。常用预训练 ViT（第 8 章）或 SigLIP 编码器（第 10 章）。编码器把图像切成图块，再将每个图块嵌入为一个词元，这与标准视觉 Transformer 的做法相同。

    - **语言模型主干**：使用预训练的大语言模型（LLM），例如 LLaMA 或 PaLM，处理视觉词元和语言词元交错组成的序列。模型同时关注指令与视觉特征，才能理解“拿起**红色**杯子”。

    - **动作头**：把 LLM 的输出映射为机器人动作。简单做法是用 MLP 把最后一个隐藏状态映射为连续动作值；也可以先把动作离散化，再让 LLM 从现有词表中预测动作词元。

- 架构流程可概括为：

$$\text{Image} \xrightarrow{\text{ViT}} \text{visual tokens} \quad + \quad \text{Instruction} \xrightarrow{\text{tokeniser}} \text{language tokens} \quad \xrightarrow{\text{LLM}} \quad \text{action tokens}$$


- 视觉词元和语言词元经过拼接或交错后输入 Transformer 主干，主干再自回归地生成动作词元。整体结构与第 10 章介绍的 VLM 相同，只是输出模态从文字换成了动作。

## 动作词元化

- 机器人动作是连续值，例如关节速度、末端执行器位置和夹爪宽度。要让 LLM 生成这些动作，需要先把连续值转换成离散词元。

![动作词元化：连续动作值分箱后变成离散索引，由 LLM 生成词元](../images/action_tokenisation.svg)

- 最简单的方法是**均匀离散化**：把每个动作维度的有效取值范围均匀划分为 $N$ 个分箱。例如，x 方向速度在 -0.1 到 0.1 m/s 之间，若分成 256 箱，每箱约为 $\frac{0.2}{256} \approx 0.8$ mm/s。动作值被映射到最近的分箱索引，索引再作为词元。

- 如果 7 个动作维度（6 个自由度加夹爪）各有 256 个分箱，原文按每个维度分别编码的方式计算词表，得到 $7 \times 256 = 1792$ 个动作词元。若各维度共享分箱对应的词元 ID，词表大小则会不同。LLM 会像生成单词一样，按维度自回归地生成动作词元。

- **动作分块**让模型一次预测多个未来时间步，而不是只预测一个动作。若块大小为 $H$，模型会输出 $H \times d$ 个词元，其中 $d$ 是动作维度。这有助于生成平滑、连贯的动作。逐步预测容易产生抖动，因为每次预测都可能彼此独立；动作分块则要求模型规划一段短轨迹，保留其中的时间结构。

- 更复杂的方法使用 VQ-VAE（第 10 章）进行**学习式词元化**。VQ-VAE 编码器把连续动作序列映射为离散码本索引，解码器再从索引重建连续动作。LLM 生成码本索引，而不是均匀分箱的数值。这与图像词元化器（第 10 章）把视觉信息压缩为紧凑离散码的做法相似。

## 代表性 VLA 模型

- **RT-2**（Robotic Transformer 2，Google DeepMind）是首个大规模 VLA。它基于预训练 VLM（PaLM-E 或 PaLI-X，最多 550 亿参数），再用机器人示范数据微调。动作以文本字符串表示，例如词元序列“1 128 91 241 5 101 127”编码一个 7 维动作，每个数字都是一个分箱索引。

- RT-2 展示了 VLM 预训练能力向机器人任务迁移的现象。即使机器人数据中没有出现过相关概念，模型也能理解相应指令，例如“把香蕉移到名称以 A 开头的国家”。完成任务需要识别物体、运用世界知识并执行动作；模型可以直接利用 VLM 已有的语言理解和视觉推理能力。

- RT-2 的局限是训练数据只来自一种机器人形态，也就是特定机械臂和夹爪，因此它不能直接泛化到其他机器人。

- **Octo**（加州大学伯克利分校）是开源的跨机器人形态 VLA，目标是在不同机器人平台上运行。它的主要设计包括：

    - 使用**扩散动作头**，而不是自回归地预测动作词元。动作头读取 Transformer 的输出，再通过去噪扩散过程生成动作（第 8 章）。这种方法可以表示多模态动作分布，也就是完成同一任务可能有多种有效路径。

![多模态动作分布：回归会把两条有效路径平均成穿过障碍物的无效路径](../images/multimodal_action_distribution.svg)

    - **灵活的观测和动作空间**：Octo 为不同机器人配置使用相应的词元化器，并在 Open X-Embodiment 数据集上预训练。该数据集包含 22 种机器人形态的示范。

    - **高效微调**：Octo 用少至 100 条示范就能微调以适配新机器人，适合数据有限的实验室。

- **OpenVLA**（斯坦福大学、加州大学伯克利分校）从开源 VLM（基于 Llama）出发，用机器人数据进行微调。它采用 70 亿参数的主干网络、统一的动作词元化方案（每个维度 256 个分箱），并使用 Open X-Embodiment 数据集训练。它的架构接近标准 VLM，只需在词表中加入动作词元，因此更容易利用现有 LLM 基础设施进行训练和部署。

- **$\pi_0$**（Physical Intelligence）代表了原文撰写时的先进水平。它以预训练 VLM 为主干，并使用**流匹配**动作头（第 8 章）。流匹配通过学习速度场，把噪声逐步变换成动作分布，从而生成平滑、时间连贯的动作轨迹。$\pi_0$ 展现了跨机器人形态的通用性，能执行双臂操作和灵巧手控制等任务。

## 预训练流程

- VLA 能利用预训练 VLM 主干已有的视觉和语言能力。训练过程通常分为几个阶段：

    1. **VLM 预训练**：使用互联网上数十亿组图像—文字对训练视觉语言模型，也可以直接采用现成模型。CLIP、SigLIP 和 LLaVA 式训练都属于这类方法（第 10 章）。

    2. **机器人数据协同训练**：用互联网数据和机器人示范数据的混合数据微调 VLM。互联网数据有助于保留视觉和语言理解能力，避免灾难性遗忘；机器人数据则教会模型生成动作。混合比例很重要：机器人数据过多会损害语言理解，过少则学不会动作生成。

    3. **任务专用微调**：可选地针对特定任务或机器人继续微调示范数据，常用 LoRA（第 10 章）控制需要训练的参数数量。

- 机器人数据量比互联网数据少几个数量级。VLM 的预训练数据可能有数十亿张图像，而最大的机器人数据集 Open X-Embodiment 在所有机器人形态上也只有数百万帧。数据不足使预训练 VLM 尤其重要：视觉和语言表示可以迁移，机器人数据只需教会模型把这些表示映射为动作。

## 泛化能力

- VLA 的目标是泛化：执行训练时没见过的任务，操作没见过的物体，在没见过的环境中遵循新指令。

- VLA 可以沿多个方向泛化：

    - **新物体**：VLM 主干在互联网图像上预训练，能识别多种物体。如果模型从网页图片中认识螺丝刀，即使机器人示范里没出现过螺丝刀，也可能学会操作它。

    - **新指令**：组合式语言理解让模型能遵循已知概念的新组合。例如，训练数据只包含堆叠红色积木，模型仍可能理解“把蓝色积木叠在绿色积木上”，因为它通过语言预训练学会了颜色词的含义。

    - **新环境**：VLA 有时能适应不同的桌面、光照和背景，因为视觉编码器见过多样的网页图像。但这种能力有限：在实验室训练的机器人到了杂乱的厨房里仍可能表现不佳。

    - **新机器人形态**：这是最难的方向。不同机器人有不同的动作空间（关节角或末端执行器速度）、传感器（腕部相机或俯视相机）和物理能力。Octo、$\pi_0$ 等跨机器人形态模型通过灵活的词元化器和多机器人预训练来应对这些差异。

- 研究者会用**留出任务**评估泛化能力，也就是要求机器人完成训练时从未见过的任务。原文将新任务上 50%–80% 的成功率视为较强结果，并以分布内任务超过 90% 的成功率作比较。随着模型和机器人数据集扩大，这一差距正在缩小。

## 跨机器人形态模型

- 研究方向正朝着“一个模型适配多种机器人”发展。单个 VLA 可以处理多种机器人形态，无需为每台机器人单独训练一套策略。

- 这需要处理**动作空间不匹配**。原文称，7 自由度机械臂加平行夹爪有 7 个动作维度，双臂系统有 14 个，四足机器人有 12 个，人形机器人有 30 个以上。动作词元化必须能适配这些不同维数。需要注意，前文把 6 自由度加夹爪计为 7 维；7 自由度机械臂加独立夹爪通常还要另计夹爪动作，实际维数取决于动作定义。

- 常见做法包括：

    - **填充动作向量**：统一采用最大动作维数，较小的动作空间用零补齐。
    - **按机器人形态设置动作头**：共享 Transformer 主干，为每种机器人配置一个较小的独立 MLP。
    - **标准化动作表示**：把不同机器人的动作写在同一坐标系中，例如统一表示世界坐标系下的末端执行器速度。不同机器人执行相似的末端运动时，就能共享相同的动作词元。

- 共享主干学习通用的视觉和语言能力，以及常见操作策略，例如从上方接近物体、对准物体并闭合夹爪。机器人专用模块再把这些高层策略转换为各自的电机指令。

## 基准与评估

- 评估 VLA 很有挑战，因为它通常需要真实机器人实验或高保真仿真。

- **SIMPLER**（Simulated Manipulation Policy Evaluation for Robot learning）提供标准化仿真环境，让研究者无需真实硬件也能比较 VLA。该基准与真实环境中的成功率相关性较高，也便于复现实验。

- **真实环境评估**仍是金标准。常见流程如下：

    1. 设定一组成功标准明确的任务，例如物体到达目标位置、选中正确物体，或在时限内完成任务。
    2. 每个任务运行 $N$ 次试验，通常为 10–50 次。
    3. 报告成功率和置信区间。
    4. 加入留出任务，衡量模型对训练中未见任务的泛化能力。

- **Open X-Embodiment** 数据集和基准汇集了 22 家机构、多个机器人平台的数据，提供统一的示范数据格式和跨机器人形态迁移评测套件。

## 编程任务（使用 Colab 或 notebook）

1. 实现动作词元化：把连续动作分箱，再从分箱索引重建动作。观察分箱数如何影响量化误差。

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

2. 对比动作分块和单步预测。生成平滑轨迹，为单步预测加入噪声，再与分块预测比较。

代码同时计算了 single_step 和累计漂移轨迹，但图中绘制的是后者；它没有直接绘制带独立噪声的单步预测。

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

3. 用二维高斯混合分布展示 VLA 的动作可以呈多模态，并说明为什么回归可能给出无效的平均动作。

代码只绘制样本和回归均值，没有实际实现扩散或流匹配动作头。

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
