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

# 视觉，语言，动作模型

*本篇将视觉，语言，动作模型放回 AI 工程语境，保留源文中的定义、公式、代码、图示和实践边界，便于逐项核对。*

*Vision-Language-Action models(VLA)统一了视觉,理解语言,并作用于单一神经网络. 此文件涵盖VLA架构,动作符号化,RT-2,Octo,OpenVLA,预训策略,通俗化,可知模型和基准*

- 在之前的文档中,我们涵盖了感知(感知世界)和机器人学习(控制身体). 传统上,这些都是单独的管线:感知模块能探测出物体,语言模块能解释命令,控制模块能产生动作. 每个模块都是独立设计、培训和调试的。

- **Vision-Language-Action models (VLAs)** 将这条输油管坍塌为单一神经网络. 该模型采用图像(vision),自然语言教学(language),输出运动指令(action). 一种型号,端对端.

- 这遵循了我们在第十章中看到的同样的统一趋势:正如多式联运模式将愿景和语言理解合并为一个架构一样,VLA扩展至物理动作. 洞察力是语言为指定任务提供了自然而灵活的界面("取出红杯并放入架上"),大型预训的视觉语言模型已经理解了图像和指令.

## 从视觉，语言到动作


- 从第10章中回顾,**Vision-Langage Models(VLMs)** 像LLaVA和Flamingo一样,将图像和文本作为输入并生成文本作为输出. 他们理解场景,回答问题,并遵循指示,都用语言.

- VLAs问:如果输出不是文本而是**robot动作**呢? 模型不生成"红色杯子位于桌子的左侧",而是生成一系列运动命令来移动手臂来抓住那个杯子.

- 关键的建筑洞察力是,行动可以像文字一样作为象征来体现. 如果一个VLM使用下接键的预测以符号生成语言符号,一个VLA以同样的方式生成动作符号. 变压器根本上不关心输出符是"cup"还是"移动抓取器2cm向前".

- 这把机器人控制重新设定为一个序列建模问题,变压器在其中表现优异(第七章). 该模型学习了绘图:(图像观察,语言指导)$\to$(动作符序).

## VLA 架构


![图示](../images/vla_architecture.svg)

- 典型的VLA有三个组成部分:

    - **Vision编码器**:将相机图像处理成视觉符号. 通常为被预训的VIT(第8章)或SigLIP编码器(第10章). 图像被分解为补丁,每个被嵌入为符号,与标准视变器完全相同.

    - **语言模型主干**:一种预受训练的LLM(如LLaMA,PALM),处理视觉符号和语言符号的互出序列. 这就是推理发生之处:模型通过同时关注指令和视觉特征来理解"拾起**红**杯".

    - ** Action head**:将LLM的输出映射到机器人动作上. 这可以是将上一个隐藏状态映射到连续动作值的简单MLP,也可以是将动作转换成由LLM现有词汇预言的离散符号的表示式方案.

- 建筑外观是:

$$\text{Image} \xrightarrow{\text{ViT}} \text{visual tokens} \quad + \quad \text{Instruction} \xrightarrow{\text{tokeniser}} \text{language tokens} \quad \xrightarrow{\text{LLM}} \quad \text{action tokens}$$

- 视觉活字和语言活字符号由相接(或相接)并被收入变压器骨干中,自动生成动作活字符号. 这与VLM(第十章)的架构相同,但输出模式是动作而不是文字.

## 动作 token 化


- 机器人动作是连续的:联合速度,末端效应位置,抓取器宽度. 这些必须转换成离散的符号,供LLM生成.

![图示](../images/action_tokenisation.svg)

- 最简单的做法是**统一盘点**。每个行动层面分为:$N$横跨有效值范围的 Bins。例如,如果x速度从-0.1到0.1米/秒不等,我们使用256个垃圾桶,每个垃圾桶代表$\frac{0.2}{256} \approx 0.8$mm/s. (英语). 一个动作值被映射到最近的bin索引上,它成为了符号.

- 有7个动作维度(6 DOF + gripper)和256个个bins,动作词汇有$7 \times 256 = 1792$标志 这些被添加到LLM现有的文本词汇中. 该模型每个维度产生一个动作符,自相递减,就像生成词.

- ** 动作块** 预测未来多个时间步,而不是单一行动。如果块大小是$H$,模型产出$H \times d$符号(在$d$是行动维度。这对于顺利、时间上一致的动议至关重要。预想一次一步就能产生"干"行为,因为每个预测都是独立的. 春起迫使模型规划出一个短轨,捕捉时间结构.

- 采用更复杂的方法,通过VQ-VAE(第10章)获取证明**。一个VQ-VAE编码器将一系列连续动作映射到一系列离散的代码本索引上,而解码器则从这些索引中重建出连续动作. LLM然后生成代码集索引,而不是统一化的宾入值. 这类似于图像符号(第十章)如何将视觉信息压缩成一个紧凑的离散代码.

## 关键 VLA 模型


- **RT-2** (Robotic Transformer 2, Google DeepMind)是第一个大规模VLA. 它需要预先训练的VLM(PALM-E或PALI-X,可达55B参数),并用机器人演示数据对其进行微调. 动作被作为文字字符串来表示:符号序列"1 128 91 241 5 101 127"编码出一个7维动作(每个数字都是个bin索引).

- RT-2展现出显著属性:从VLM骨干转移到机器人的**活性能**. 该模型可以遵循涉及它从未在机器人数据中看到的概念的指示(例如"将香蕉移到从A开始的国家"需要视觉对象识别+世界知识+动作). VLM的语言理解和视觉推理"来免费".

- RT-2的局限性在于,它接受过从单个机器人化身(有特定抓取器的特定臂)得到的数据培训. 它不向不同的机器人概括。

- **Octo** (UC Berkeley)是一个开源的,** 表现-可知性** VLA旨在跨不同机器人平台工作. 主要的革新是:

    - 一个**分流动作头** 而不是自旋信号预测。动作头取变压器的输出,并通过去诺分散过程产生动作(第8章). 这自然处理多式动作分布(见下文图),其中有多种有效的方法来完成某项任务.

![图示](../images/multimodal_action_distribution.svg)

    - **灵活观测和动作空间**:Octo为不同的机器人配置使用特定任务符号. 它在Open X-Embodiment数据集上被预先训练出,其中包含了来自22个不同机器人化身的演示.

    - ** 有效微调**:可以将Octo微调为一款新机器人,其演示次数可达100个之多,使得数据有限的实验室实用.

- ** OpenVLA**(斯坦福德,UC Berkeley)采取微调现有机器人开源VLM(Llama-based)的方法. 它使用7B参数主干线,统一动作符号化(每个维度为256个bins),并在Open X-Embodiment数据上使用列车. 它的优点是简单的:建筑是一个标准VLM,其动作符号附在词汇上,使得它容易与现有的LLM基础设施一起培训和部署.

- **$\pi_0$**(物理情报)代表了最新技术。它使用预训VLM主干线并配有**流匹配**动作头(第8章). 流相匹配通过学习能将噪声传送到动作分布的速率场来生成动作,产生平滑,时间上一致的动作轨迹.$\pi_0$展现出非凡的通俗性,在包括双人操控和自控手控在内的多个机器人化身中执行任务.

## 预训练配方


- VLA从经过预先训练的VLM主干线中获益巨大,这些主干已经能理解视觉场景和语言. 培训程序通常按阶段进行:

    1. ** VLM预训**:火车(或使用现成的)一个视觉语言模型,内容是数十亿对互联网图像文本(CLIP,SigLIP,LLaVA-型培训,如第10章所涵盖).

    2. ** Robot数据联合培训**:在互联网数据和机器人演示数据的混合上对VLM进行微调。互联网数据可以防止灾难性地忘记视觉和语言理解,而机器人数据则教动作生成. 混合比关系重大:机器人数据过多会降低语言理解,很少会学习到动作.

    3. **任务特定微调**:可选择对特定任务或机器人的演示进行微调,常与LORA(第十章)一起使可受训练参数数量保持小.

- 机器人数据的数量比互联网数据还小。VLM可能在数十亿个图像上预先被训练,但最大的机器人数据集(Open X-Embodiment)中只包含出跨越所有浮雕的上百万帧. 这种数据稀缺是为什么从一个经过预训的VLM开始至关重要:视觉和语言表现转移,只有动作映射需要从有限的机器人数据中学习.

## 泛化


- 志愿军的许诺是**通俗化**:执行训练期间未见的任务,在以前未见的环境下,按照以前未见的指令执行物体.

- 志愿军沿几个轴线进行概括:

    - ** 小说对象**:VLM主干线识别出互联网预训的对象。如果模型知道网络图像中的"螺丝刀"是什么样子的,即使没有机器人演示包括螺丝刀,它也可以操纵一个.

    - **小说说明**:组成语言理解允许模型遵循已知概念的新组合. "将蓝色块打入绿色块"即使训练只显示堆放出红色块,也可行,因为模型从语言预训中理解了颜色形容词.

    - **小说环境**:在某种程度上,VLA在视觉领域(不同的表格,照明,背景)之间进行传输,因为视觉编码器预先在多样的网络图像上训练. 但是这有限度:在实验室训练的机器人可能会在一团乱的厨房中挣扎.

    - ** 小说:这是最难的轴心。不同的机器人有不同的动作空间(联合角度对等. 终端效应快感),不同的传感器(相机对等. 和不同的物理能力。浮出水面的不可知论模型,如Octo和$\pi_0$以灵活的标志器和预先训练来解决这个问题。

- 通用性被评价为**控出任务**:机器人被要求执行从未受过训练的任务. 新任务的成功率为50-80%,这被认为是很强的成果,而分配任务的成功率则大于90%。随着模型规模和机器人数据集的增长,差距正在缩小.

## 与具身无关的模型


- 球场正朝着**1型,多机器人**. 单相VLA不为每个机器人单独训练一款政策,而是处理多件活化.

- 这需要解决**行动空间不匹配**的问题. 7-DOF臂相并握有7个动作维度. 双人设置有14个. 四分卫有12个 人形有30+个. 行动标志必须足够灵活,足以处理所有这些问题。

- 解决办法包括:
    - ** 添加动作向量**:使用最大动作空间并用零来垫起较小的动作空间。
    - ** Per-embodiment 动作头**:每个机器人类型都有单独的小型MLP的共享变压器骨干.
    - **正态动作表示**:在共同框架(如世界框架内的终端效应快克等)中表达出所有动作,使产生类似终端效应活性的不同机器人共享同一种动作符.

- 共享骨干学习一般视觉和语言理解,外加常见的操控策略(从上而下的方法,与对象相配合,收紧抓取. 特制的"化身"部分只需要将这些高层次的战略转化为特定的运动指令.

## 基准与评估


- 评估VLA具有独特的挑战性,因为它需要物理机器人实验(或高真实度模拟).

- **SIMPLER**(模拟机器人学习操纵政策评价)提供了标准化的模拟环境,用于在没有物理硬件的情况下比较VLA性能. 它与现实世界的成功率有着密切的联系,并能够制定可复制的基准。

- ** 真正的世界评价**仍然是金本位。典型的协议:
    1. 定义一组具有明确成功标准的任务(对象到达目标位置,正确的对象被选中,任务在时限内完成).
    2. 运行$N$每个任务(一般为10-50个)的审判。
    3. 报告成功率并保持信心间隔。
    4. 包括被搁置(从未受过训练)的任务,以衡量一般化。

- ** 开放X-Embodiment**数据集和基准来自多个机器人平台的22个机构的总机器人数据。它为分享演示提供了标准格式,并为交叉展示转让提供了一个共同评价套件。

## 编程任务（使用 Colab 或 notebook）


1. 执行动作标志化:将连续的动作盘成垃圾桶并重建. 以 bin 计数函数来观察量化错误。
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

2. 模拟动作块对单步预测. 产生平滑的轨迹,将噪音加入单步预测,并和以块为基础的预测进行比较.
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

3. 设想VLA的动作分布如何能成为多式. 使用一个简单的高斯函数2D混合来显示为什么扩散/流相匹配动作头比回归更可取.
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
