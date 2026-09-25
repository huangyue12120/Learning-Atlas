---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 17 - AI inference/01. quantisation.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: d4f8131dbcb120ce518005d0ba6814466873b4ae50d7e5228260cd0e95e1ef55
status: reviewed
---
# 量化（Quantisation）

*量化通过降低模型权重和激活值的表示精度，减少模型占用，并可能提高运行速度、降低成本。本文介绍数值格式、训练后量化、量化感知训练、仅权重量化方法（GPTQ、AWQ）、激活量化、混合精度和 KV cache 量化。*

- 70B 参数模型若以 FP16 保存权重，理论上需要约 140 GB（十进制）；仅按 4 bit/参数估算，INT4 权重约需 35 GB。实际模型还要存放缩放因子、量化元数据、KV cache 和运行时缓冲区，因此模型不一定能装进单张显卡。通过量化并配合足够显存、多卡或主机内存卸载，可以降低部署门槛。
- 核心取舍是：精度降低通常能减少存储和内存传输量，也可能提高吞吐量、降低能耗；但量化误差可能损害模型质量。效果取决于模型、量化方法、硬件和推理实现。

## 为什么要量化

- **减少内存占用**：不计缩放因子等开销，INT8 权重约占 FP16 的一半，INT4 约占四分之一。大语言模型（LLM）的权重通常占用大量内存，降低位宽可相应减少权重存储量。
- **提高吞吐量**：较低精度可能让硬件执行更多运算，但具体收益取决于芯片代际、数据格式、算子和内核实现。以 H100 的理论稠密峰值为例，FP8 约为 989 TFLOPS，FP32 约为 67 TFLOPS；这类峰值不能直接当作实际模型推理速度，且应确认比较时是否计入结构化稀疏加速。
- **减少内存传输**：LLM 推理常受显存带宽限制，瓶颈可能是从 GPU 内存读取权重，而非执行乘加运算。较小的权重减少传输字节数，因而可能提高每秒生成的词元数；实际加速幅度取决于计算、访存和反量化开销。
- **降低能耗**：低精度运算在一些硬件上能降低单次运算能耗。数据中心的整体节能幅度还取决于负载、利用率和硬件配置。

## 数值格式

- 第 13 章（计算机体系结构）介绍了 IEEE 754 浮点数。下表列出机器学习中常见的数值格式：

![FP32 到三值格式的位布局，展示符号位、指数位和尾数位，以及每个参数的内存占用](../images/precision_formats_memory.svg)

| 格式 | 存储位数 | 指数位 | 尾数位 | 范围 | 常见用途 |
|--------|------|----------|----------|-------|----------|
| FP32 | 32 | 8 | 23 | ±3.4×10³⁸ | 训练中的高精度基准 |
| TF32 运算 | FP32 输入 | 8 | 10 | 与 FP32 相同 | A100 及更新的 Tensor Core 运算 |
| FP16 | 16 | 5 | 10 | ±65504 | 混合精度训练 |
| BF16 | 16 | 8 | 7 | ±3.4×10³⁸ | 训练；范围与 FP32 相同 |
| FP8 E4M3 | 8 | 4 | 3 | 约 ±448 | 前向计算（Hopper 及更新架构） |
| FP8 E5M2 | 8 | 5 | 2 | 约 ±57344 | 梯度；范围更宽 |
| INT8 | 8 | — | — | -128 至 127 | 训练后量化推理 |
| INT4 | 4 | — | — | -8 至 7 | 仅权重量化 |
| INT2 / 三值 | 约 2 | — | — | {-1, 0, 1} | 极低位宽量化 |

- **TF32** 不是 19 位存储格式：输入通常仍以 FP32 存放；Tensor Core 运算使用 1 位符号、8 位指数和 10 位尾数的精度，并以 FP32 累加。
- **FP8** 常见两种编码：**E4M3** 有 4 位指数和 3 位尾数，范围较窄、精度较高；**E5M2** 有 5 位指数和 2 位尾数，范围较宽。训练流程可能将 E4M3 用于前向计算、E5M2 用于梯度，但具体分配由框架和训练配方决定。
- **BF16 与 FP16**：BF16 的指数范围与 FP32 相同，不容易因范围不足而溢出，但尾数精度较低。FP16 尾数精度更高，最大有限值为 65504，范围较窄；训练时是否需要损失缩放取决于数值范围与实现。两者都可用于推理。
- **整数格式**没有浮点指数，而是表示按比例缩放的定点值。浮点数与整数之间的转换需要**缩放因子**，也可能使用**零点**：$x_{\text{float}} = \text{scale} \times (x_{\text{int}} - \text{zero\_point})$。

## 量化公式

- 量化把浮点值映射为整数，再映射回近似的浮点值：

$$x_q = \text{clamp}\left(\text{round}\left(\frac{x}{\text{scale}}\right) + \text{zero\_point}, \; q_{\min}, \; q_{\max}\right)$$

$$\hat{x} = \text{scale} \times (x_q - \text{zero\_point})$$

- **缩放因子**决定量化步长：$\text{scale} = \frac{x_{\max} - x_{\min}}{q_{\max} - q_{\min}}$。有符号 INT8 的整数范围通常取 $q_{\min}=-128$、$q_{\max}=127$；对称量化常用 $\max(|x|)/127$，因此通常不会用到 -128 这个码值。
- **对称量化**令 $\text{zero\_point}=0$，计算和实现较简单。
- **非对称量化**使用非零零点，可适配不以零为中心的分布。例如，对非负的 ReLU 输出，可将范围映射到无符号 INT8 的 $[0,255]$。

![量化粒度示意图：逐张量共用一个缩放因子，逐通道每个通道一个，逐组每个小块一个](../images/quantisation_granularity.svg)

- **量化粒度**指共用同一缩放因子的数值范围：
    - **逐张量**：整个张量共用一个缩放因子。实现简单，但极端值可能拉大量化范围，降低其他值的分辨率。
    - **逐通道**：每个输出通道单独缩放；在线性层中常按行或列计算，取决于权重矩阵的存储约定。开销较小，通常比逐张量更能保留精度。
    - **逐组**：每 $g$ 个元素共用一个缩放因子，例如 $g=128$。它在精度与元数据开销之间折中，常用于 GPTQ、AWQ 等权重量化方法。
    - **逐词元**：激活值按序列中的每个词元分别缩放，可适应不同词元的激活幅度差异。

## 训练后量化（PTQ）

- **训练后量化（PTQ）**直接量化已训练模型，不再训练模型参数。通常会用一小批有代表性的数据（校准集）运行模型、收集激活值统计量，再据此选择缩放因子。样本数量由模型和校准方法决定；128–512 个样本只是常见配置示例，并非通用要求。

### 校准方法

- **最小值–最大值法**：根据观测到的最小值和最大值设定范围。方法简单，但容易受极端值影响；少见的极端值可能占用大部分量化范围。
- **百分位数法**：用指定百分位数（例如 99.99 百分位）而非绝对最大值确定截断范围。被截断的值会饱和到 $q_{\min}$ 或 $q_{\max}$；效果取决于分布和所选百分位数。
- **均方误差（MSE）优化**：搜索截断值或缩放因子，使原张量与量化后张量之间的均方误差最小。这优化的是张量重建误差，不保证任务准确率一定最高。
- **基于熵的方法（KL 散度）**：寻找能降低原始值分布与量化后分布之间 KL 散度的范围。TensorRT 曾将此类方法用于 INT8 校准；具体算法随工具版本而异。

### PTQ 实践

```python
# Simplified PTQ with PyTorch (conceptual)
import torch

def quantise_tensor_symmetric(tensor, bits=8):
    qmax = 2 ** (bits - 1) - 1  # 127 for INT8
    scale = tensor.abs().max() / qmax
    quantised = torch.clamp(torch.round(tensor / scale), -qmax, qmax).to(torch.int8)
    return quantised, scale

def dequantise(quantised, scale):
    return quantised.float() * scale

# Quantise a weight matrix
weight = torch.randn(512, 512)  # pretrained weight
weight_q, scale = quantise_tensor_symmetric(weight, bits=8)
weight_reconstructed = dequantise(weight_q, scale)

# Quantisation error
error = (weight - weight_reconstructed).abs().mean()
print(f"Mean absolute error: {error:.6f}")
print(f"Compression: {weight.numel() * 4 / (weight_q.numel() * 1 + 4):.1f}x")  # +4 bytes for scale
```

- INT8 PTQ 在许多模型上可以保持接近原模型的效果，但准确率变化取决于模型、数据集、量化粒度和评估指标，不能保证低于 1%。INT4 的效果更依赖方法；仅权重量化通常比直接对权重和激活都做低位宽量化更稳妥。

## 量化感知训练（QAT）

- **量化感知训练（QAT）**在训练计算图中插入伪量化操作：前向传播时对权重和激活值进行量化、再反量化；反向传播则用**直通估计器（STE）**近似绕过不可导的量化操作。

$$\text{前向传播： } \hat{W} = \text{dequant}(\text{quant}(W))$$
$$\text{反向传播： } \frac{\partial L}{\partial W} \approx \frac{\partial L}{\partial \hat{W}}$$

- 模型会在训练中适应量化噪声。QAT 有时能恢复 PTQ 损失的部分甚至大部分精度，低位宽时尤其有用；收益取决于训练配方和评估任务。
- **成本**：QAT 需要重新训练或微调，大模型的计算成本可能很高。具体费用随模型规模、训练步数、硬件和集群利用率变化，不能用单一金额概括。PTQ 不需更新模型参数，但仍有校准和量化处理成本。
- **适用情形**：PTQ 质量无法满足要求（例如某些 INT4 或更低位宽方案）、部署设备有严格延迟预算，或模型将处理大量推理请求、可以摊薄一次性训练成本时，可以评估 QAT 是否合适。

## 仅权重量化

- LLM 推理常处于内存带宽受限状态：读取权重可能比执行计算更耗时。**仅权重量化**把权重压到 INT4 或 INT3 左右，同时让激活值保持 FP16；计算时再按内核要求反量化。与 FP16 相比，INT4 原始权重数据约减少到四分之一，不计缩放因子等开销。实际显存和速度收益由格式与实现决定。

### GPTQ

- **GPTQ**（Frantar 等，2022）逐列量化权重，并调整尚未处理的列，以补偿已经引入的量化误差。它根据校准数据计算 Hessian（二阶信息），据此安排量化顺序和误差补偿：

$$\hat{W}_{:,j} = \text{quant}(W_{:,j}), \quad W_{:,j+1:} \mathrel{-}= \frac{(\hat{W}_{:,j} - W_{:,j}) \cdot H_{j,j+1:}}{H_{j,j}}$$

- 第 $j$ 列量化产生误差后，GPTQ 会调整后续列，尽量减少该层整体输出 $XW$ 的变化。这是将最优脑量化（OBQ）思路用于 Transformer 权重的一种方法。
- 论文报告中，分组大小为 128 的 4-bit GPTQ 在若干 LLM 基准上只造成较小的困惑度变化；结果取决于模型和评测集。对 70B 模型的量化时间也取决于 GPU、实现和参数，不能固定为一小时。

### AWQ

- **AWQ**（Activation-Aware Weight Quantisation，Lin 等，2023）利用校准激活值识别对输出较敏感的通道。论文发现，少量显著通道可能对模型质量影响较大；具体比例随模型和层而变化。
- AWQ 在量化前按缩放因子 $s$ 调整重要通道的权重，并将对应激活值按 $1/s$ 缩放，以保持层输出不变。它为每组选择缩放因子，降低量化误差。
- AWQ 无需 GPTQ 那类 Hessian 误差补偿流程，许多设置下实现较直接、量化速度较快，并能达到有竞争力的质量；具体表现取决于模型、位宽和推理工具。

### GGUF / llama.cpp 量化

- **GGUF** 是 llama.cpp 使用的模型文件格式，支持 CPU 和多种加速后端。常见量化类型包括：
    - **Q4_0**：以 4-bit 权重为主，按 32 个元素分块存储。
    - **Q4_K_M**：K 系列分块混合精度量化的一种变体。
    - **Q5_K_M**：K 系列的 5-bit 变体，通常以更大存储换取更低误差。
    - **Q8_0**：分块存储的 8-bit 量化。
- K 系列变体会结合块结构与元数据分配表示精度；名称中的位数不一定等于计入元数据后的平均位数。Q4_K_M 常被选作质量与体积的折中，但模型、版本和量化实现都会影响实际结果。

### QuIP 与 QuIP#

- **QuIP**（Chee 等，2023）使用**非相干化处理**：量化前对权重应用随机正交变换，以分散少数极端权重的影响，降低它们主导量化误差的风险。
- 例如，一个权重值为 100、其余值约为 1 时，共用同一缩放因子会让大部分量化级别用于极端值。适当的正交变换可重新分布权重幅度；配合对输入或相邻线性变换的补偿后，整体线性运算关系得以保留，使均匀量化更有效。
- **QuIP#** 进一步使用**格码本**：将值映射到格点，而非均匀整数网格；论文采用了 8 维 E8 格。格编码可在相同位数下改变失真率表现。论文在特定基准上展示了 2-bit 量化的可用质量，不能据此推断所有模型都能达到相同效果。

### SpQR

- **SpQR**（Dettmers 等，2023）针对少数对输出影响较大的**离群权重**采用混合精度表示：
    1. 通过敏感度分析识别量化后会显著改变层输出的权重。
    2. 将离群权重以 FP16 存入稀疏结构。
    3. 将其余权重量化到 INT3 或 INT4。
- 这样大部分权重可以使用较低位宽，少数敏感值则保留较高精度。离群值比例和稀疏元数据开销取决于模型与设置；论文报告的开销不能视为所有模型的固定比例。

### HQQ

- **HQQ**（Half-Quadratic Quantisation，Badri 与 Shaji，2023）是一种不需要校准数据的权重量化方法。它将量化表示与缩放因子的选择写成半二次优化问题，并通过迭代求解。
- 不依赖校准样本，适用于缺少代表性数据或不能使用特定校准数据的场景；量化耗时仍取决于模型规模和实现。

### AQLM

- **AQLM**（Egiazarian 等，2024）把加性量化（多码本向量量化）用于 LLM。它不独立量化每个权重，而是将权重分组为向量，并用多个学习得到的码本条目之和表示：

$$\mathbf{w} \approx \mathbf{c}_1^{(1)} + \mathbf{c}_2^{(2)} + \cdots + \mathbf{c}_M^{(M)}$$

- 其中 $\mathbf{c}_i^{(m)}$ 是码本 $m$ 中的一个条目。若使用两个各有 256 个条目的码本，一个 8 元素向量可用两个 8-bit 索引编码：共 16 位表示 8 个权重，即平均 2 bit/权重，尚未计入元数据等开销。论文在特定基准上报告了 2-bit 质量优势；与 GPTQ、AWQ 的比较依赖评测条件。

### BitNet 与 1-bit LLM

- **BitNet**（Wang 等，2023）将权重限制为三值 $\{-1,0,+1\}$，理论上每个权重需要约 $\log_2(3)\approx1.58$ bit 的信息量。对三值权重做矩阵乘法时，可按权重为 $+1$ 的位置累加输入，并减去权重为 $-1$ 的位置之和。
- **BitNet b1.58**（Ma 等，2024）采用相同的三值集合。70B 个三值权重按 1.58 bit/权重估算，原始权重信息约为 13.8 GB（十进制，约 12.9 GiB）；这不是完整模型的实际内存占用，未包括打包方式、缩放因子、其他高精度参数、KV cache 和运行时开销。
- 矩阵乘法可写作：

$$y_j = \sum_i W_{ij} \cdot x_i = \sum_{i: W_{ij}=+1} x_i - \sum_{i: W_{ij}=-1} x_i$$

- 三值权重可减少权重乘法，但整体推理仍需要累加、缩放以及其他运算，速度取决于专用内核和硬件。低位宽训练也不保证质量与 FP16 相同；结果取决于模型规模、训练方法和任务。

### 微缩放（MX）格式

- **微缩放（MX）**格式采用分块缩放：一组元素共用缩放指数，每个元素使用较低位宽的数值表示。OCP 等组织已发布相关格式规范；AMD、Arm、Intel、Meta、Microsoft、NVIDIA 和 Qualcomm 等厂商及软件生态涉及相关支持，实际可用性依产品代际和实现而异。

| 格式 | 每块共享缩放值 | 元素位数 | 平均位数/元素（块含 32 个元素时） | 说明 |
|--------|----------------|-------------|--------------------|----|
| MXFP8 | 8-bit | 8（E4M3 或 E5M2） | 约 8.25 | FP8 元素加共享缩放值 |
| MXFP6 | 8-bit | 6 | 约 6.25 | 6-bit 浮点元素 |
| MXFP4 | 8-bit | 4 | 约 4.25 | 4-bit 浮点元素 |
| MXINT8 | 8-bit | 8（整数） | 约 8.25 | 共享缩放值的 INT8 |

- 表中的平均位数计入每 32 个元素共用一个 8-bit 缩放值，不计其他对齐或容器开销。MX 格式能否提供更高精度或吞吐量，取决于元素格式、缩放策略和硬件支持；不能据此断言它会取代所有 FP8 或 INT8 格式。

### FP8 训练

- FP8 已可用于部分 NVIDIA Hopper 和 Blackwell GPU 的训练工作流。常见做法包括：
    - **前向传播**：权重和激活值可使用精度较高、范围较窄的 E4M3。Transformer Engine 等实现可使用延迟缩放，根据前一轮收集的统计量更新缩放因子。
    - **反向传播**：梯度可使用范围较宽、尾数精度较低的 E5M2，以降低溢出风险。
    - **主权重**：与第 6 章介绍的 FP16 混合精度训练类似，优化器状态或主权重可能保留 FP32；具体安排取决于训练框架和混合精度配方。FP8 通常用于矩阵乘法等计算，并不意味着所有权重更新都以 FP8 完成。
    - **损失缩放**：是否需要损失缩放取决于格式范围、缩放策略和框架实现；不同 FP8 训练方案并不完全相同。
- FP8 训练的模型质量和吞吐量取决于模型、配方、硬件和内核。部分基准报告了接近 BF16 的质量和更高吞吐量，但“约 2 倍”不是所有训练任务都能达到的固定加速，也不能称为所有 H100 集群的默认配置。

## 激活量化

- 激活值是层与层之间传递的中间张量，也可以量化。在受支持的实现中，权重和激活值可使用 INT8，并用 INT32 累加，从而执行整数矩阵运算。
- **动态量化**：运行时根据实际激活值计算缩放因子，能适应当前输入，但要额外计算统计量。
- **静态量化**：在校准阶段计算缩放因子，推理时固定使用。运行时开销较低；若校准数据不能代表实际输入，量化效果可能下降。
- **逐词元量化**：序列中的每个词元分别计算缩放因子。它可应对不同词元激活幅度的差异；是否必要、收益多大要按模型和内核评估。
- 激活值随输入变化，量化难度通常高于固定权重。少数通道的离群值可能拉大共享量化范围，降低其他通道的有效分辨率；离群值的幅度和分布因模型而异。
- **SmoothQuant**（Xiao 等，2022）通过通道缩放，将部分量化难度从离群值较多的激活值转移到较易处理的权重。将激活值乘以 $1/s$、权重乘以 $s$，适当选择 $s$ 后，层输出不变：$XW = (X \cdot \text{diag}(s^{-1})) \cdot (\text{diag}(s) \cdot W)$。

## 混合精度量化

- 不同层对量化的敏感度不同。有些模型的注意力层能容忍 INT4，嵌入层或最终分类器则可能需要更高精度；需要针对模型和任务验证。
- **敏感度分析**：逐层量化并测量对评估指标的影响。对精度敏感的层分配更多位，较不敏感的层分配较少位。
- 第 16 章介绍的 NVIDIA Transformer Engine 可在受支持的工作流中管理 FP8 等混合精度计算。具体算子使用的精度与缩放策略由硬件、框架和配置决定，并非每个矩阵乘法都必然根据张量统计量在 FP8 与 FP16 间自动切换。

## KV cache 量化

- LLM 生成时，**KV cache** 保存此前词元对应的键和值。对单个序列，若不考虑批量大小、分页和对齐开销，其大小可估算为：

$$\text{KV cache 大小} = 2 \times n_{\text{layers}} \times n_{\text{KV heads}} \times d_{\text{head}} \times \text{seq\_len} \times \text{bytes\_per\_element}$$

- 例如，假设模型有 80 层、64 个 KV 头、每个头 128 维，单序列长度为 128K，且 KV 使用 FP16，则需要 $2 \times 80 \times 64 \times 128 \times 131072 \times 2$ 字节，约 344 GB（十进制，约 320 GiB）。这是按 64 个 KV 头的示例估算，不代表所有 70B 模型；使用分组查询注意力（GQA）或多查询注意力（MQA）时，KV 头数通常少于查询头数，缓存也会更小。实际占用还会随批量大小和实现改变。
- **KV cache 量化**将缓存的键和值从 FP16 改为 INT8 或 INT4，以减少存储和传输量。量化误差会影响后续词元读取缓存时的注意力结果；退化程度取决于量化方法、粒度和模型。
- KV cache 量化可能带来多方面收益：在显存允许时支持更长序列或更大批量，并减少读取缓存的带宽需求。是否能提升生成速度取决于工作负载和内核实现。

## 编程练习（使用 Colab 或 Notebook）

1. 从头实现对称 INT8 量化。量化一个权重矩阵、再将它反量化，并观察不同数值分布下的重建误差。

```python
import jax.numpy as jnp
import jax

def quantise_int8(tensor):
    scale = jnp.max(jnp.abs(tensor)) / 127.0
    quantised = jnp.clip(jnp.round(tensor / scale), -127, 127).astype(jnp.int8)
    return quantised, scale

def dequantise(quantised, scale):
    return quantised.astype(jnp.float32) * scale

# Normal weights (typical for trained models)
key = jax.random.PRNGKey(0)
weights = jax.random.normal(key, (1024, 1024)) * 0.02

q, s = quantise_int8(weights)
recon = dequantise(q, s)

print(f"Original:     {weights.nbytes / 1024:.0f} KB")
print(f"Quantised:    {q.nbytes / 1024:.0f} KB ({weights.nbytes / q.nbytes:.0f}x smaller)")
print(f"Mean abs err: {jnp.abs(weights - recon).mean():.6f}")
print(f"Max abs err:  {jnp.abs(weights - recon).max():.6f}")
print(f"Relative err: {jnp.abs(weights - recon).mean() / jnp.abs(weights).mean():.4%}")
```

2. 展示离群值问题：构造含少数极端通道的激活值，对比逐张量量化和逐通道量化的误差。

```python
import jax.numpy as jnp
import jax

key = jax.random.PRNGKey(42)

# Activations: most channels are normal, 2 channels have 100x outliers
activations = jax.random.normal(key, (32, 512)) * 0.1
activations = activations.at[:, 0].set(activations[:, 0] * 100)   # outlier channel
activations = activations.at[:, 1].set(activations[:, 1] * 50)    # outlier channel

# Per-tensor quantisation (one scale for entire tensor)
scale_tensor = jnp.max(jnp.abs(activations)) / 127.0
q_tensor = jnp.clip(jnp.round(activations / scale_tensor), -127, 127)
recon_tensor = q_tensor * scale_tensor

# Per-channel quantisation (one scale per channel)
scales_channel = jnp.max(jnp.abs(activations), axis=0) / 127.0
q_channel = jnp.clip(jnp.round(activations / scales_channel), -127, 127)
recon_channel = q_channel * scales_channel

err_tensor = jnp.abs(activations - recon_tensor).mean()
err_channel = jnp.abs(activations - recon_channel).mean()

print(f"Per-tensor error: {err_tensor:.6f}")
print(f"Per-channel error: {err_channel:.6f}")
print(f"Per-channel is {err_tensor / err_channel:.1f}x better")
print(f"\nOutlier channels waste {(activations.shape[1] - 2) / activations.shape[1]:.0%} "
      f"of the quantisation range for {2 / activations.shape[1]:.1%} of channels")
```

3. 计算不同模型规模和序列长度下的 KV cache 内存占用，观察长上下文时量化能带来的存储节省。示例模型参数仅用于估算，不代表实际产品配置。

```python
def kv_cache_gb(n_layers, n_heads, d_head, seq_len, bytes_per_elem):
    return 2 * n_layers * n_heads * d_head * seq_len * bytes_per_elem / 1e9

models = [
    ("Llama-7B",  32, 32, 128),
    ("Llama-70B", 80, 64, 128),
    ("GPT-4 (est)", 120, 96, 128),
]

print(f"{'Model':<15} {'SeqLen':>8} {'FP16 (GB)':>10} {'INT8 (GB)':>10} {'INT4 (GB)':>10}")
print("-" * 60)

for name, layers, heads, d_head in models:
    for seq_len in [4096, 32768, 131072]:
        fp16 = kv_cache_gb(layers, heads, d_head, seq_len, 2)
        int8 = kv_cache_gb(layers, heads, d_head, seq_len, 1)
        int4 = kv_cache_gb(layers, heads, d_head, seq_len, 0.5)
        print(f"{name:<15} {seq_len:>8} {fp16:>9.1f}  {int8:>9.1f}  {int4:>9.1f}")
    print()
```
