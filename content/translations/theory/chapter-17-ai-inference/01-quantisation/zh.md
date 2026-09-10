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

# 量化

*量化降低模型权重和激活的精度，让模型更小、更快、更省钱。本篇介绍数值格式、训练后量化、量化感知训练、仅权重量化方法（GPTQ、AWQ）、激活量化、混合精度以及 KV-cache 量化。*

- 一个 700 亿参数的模型使用 float16 时需要 140 GB 内存，超过任何单张 GPU 的容量。量化到 INT4 后只需 35 GB（可以放进一张 A100），甚至能在卸载后放进 20 GB 的消费级 RTX 4090。量化不是锦上添花的优化，而是让大型模型部署在经济上可行的关键。

- 基本权衡是：精度越低，内存越少、吞吐越高、功耗越低，但会引入可能降低模型质量的**量化误差**。量化的艺术就在于让这种降低尽可能小。

## 为什么要量化

- **减少内存**：INT8 比 FP16 小 2 倍，INT4 小 4 倍。对 LLM 来说，模型权重占据主要内存；精度减半，内存需求也减半。

- **提高吞吐**：低精度意味着每秒可执行更多操作。NVIDIA Tensor Core（第 16 章）中，FP16 相比 FP32 吞吐翻倍，INT8 相比 FP16 再翻倍，INT4 相比 INT8 又翻倍。H100 的 FP8 性能为 989 TFLOPS，而 FP32 为 67 TFLOPS，差距约 15 倍。

- **节省带宽**：LLM 推理通常受**内存带宽限制**（第 16 章的 roofline 模型）。瓶颈是从 GPU 显存加载权重，而不是对权重做计算。权重更小意味着需要传输的字节更少，token 每秒数直接提高。这就是量化常常能让 LLM 推理获得近似线性加速的原因。

- **节省能源**：低精度的每次操作能耗更低。在数据中心规模（数千张 GPU）上，这会转化为显著的电费降低。

## 数值格式

- 第 13 章（计算机体系结构）介绍过 IEEE 754 浮点数。下面是机器学习完整的精度版图：

![精度格式的位布局：从 FP32 到三值格式，展示符号位、指数位和尾数位在内存中的排列，以及每参数内存比较](../images/precision_formats_memory.svg)

| 格式 | 位数 | 指数 | 尾数 | 范围 | 用途 |
|--------|------|----------|----------|-------|----------|
| FP32 | 32 | 8 | 23 | ±3.4×10³⁸ | 训练（黄金标准） |
| TF32 | 19 | 8 | 10 | ±3.4×10³⁸ | Tensor Core 训练（A100+） |
| FP16 | 16 | 5 | 10 | ±65504 | 混合精度训练 |
| BF16 | 16 | 8 | 7 | ±3.4×10³⁸ | 训练（范围与 FP32 相同） |
| FP8 E4M3 | 8 | 4 | 3 | ±448 | 前向传播（Hopper+） |
| FP8 E5M2 | 8 | 5 | 2 | ±57344 | 梯度（范围更大） |
| INT8 | 8 | — | — | -128 到 127 | PTQ 推理 |
| INT4 | 4 | — | — | -8 到 7 | 仅权重量化 |
| INT2/三值 | 2 | — | — | {-1, 0, 1} | 极限压缩 |

- **FP8**有两种变体：**E4M3**（4 位指数、3 位尾数，范围较窄但精度更高）用于前向传播；**E5M2**（5 位指数、2 位尾数，范围较宽但精度较低）用于梯度。Transformer Engine（第 16 章）会为每个张量自动在二者之间切换。

- **BF16 与 FP16**：BF16 的指数范围与 FP32 相同（没有溢出风险），但尾数精度较低；FP16 精度更高，但范围较窄（最大 65504），训练时需要损失缩放。推理时二者都很好用；训练时 BF16 更安全。

- **整数格式**没有指数，只表示定点值。要在浮点数与整数之间转换，需要一个**缩放因子**，还可以选择一个**零点**：$x_{\text{float}} = \text{scale} \times (x_{\text{int}} - \text{zero\_point})$。

## 量化方程

- 所有量化方法都把浮点值映射到整数，再映射回来：

$$x_q = \text{clamp}\left(\text{round}\left(\frac{x}{\text{scale}}\right) + \text{zero\_point}, \; q_{\min}, \; q_{\max}\right)$$

$$\hat{x} = \text{scale} \times (x_q - \text{zero\_point})$$

- **scale** 决定分辨率：$\text{scale} = \frac{x_{\max} - x_{\min}}{q_{\max} - q_{\min}}$。对于 INT8，$q_{\min} = -128$，$q_{\max} = 127$。

- **对称量化**设置 $\text{zero\_point} = 0$，于是 $\text{scale} = \frac{\max(|x|)}{127}$。它更简单、更快（推理时不必减去零点）。

- **非对称量化**使用非零 $\text{zero\_point}$ 来处理非对称分布（例如 ReLU 输出全部非负），把 $[x_{\min}, x_{\max}]$ 映射到无符号 INT8 的 $[0, 255]$。

![量化粒度：逐张量为整个矩阵使用一个缩放因子，逐通道每列一个，逐组每个小块一个](../images/quantisation_granularity.svg)

- **量化粒度**表示有多少值共享同一个缩放因子：
    - **逐张量**：整个张量使用一个缩放因子。最简单但精度最低（一个离群值会扭曲整个张量的缩放范围）。
    - **逐通道**：卷积中每个输出通道一个缩放因子，或线性层中每行一个。精度好得多，而额外开销很小。
    - **逐组**：每 $g$ 个元素一组、每组一个缩放因子（例如 $g = 128$）。精度最好，现代仅权重量化（GPTQ、AWQ）都采用它。
    - **逐 token**：激活中每个 token 一个缩放因子，能处理不同 token 的激活幅度相差很大的情况。

## 训练后量化（PTQ）

- **PTQ** 在不重新训练的情况下量化预训练模型。让一个**校准集**（通常为 128–512 个样本的小型代表性数据集）通过模型，收集激活统计量，然后计算最优缩放因子。

### 校准方法

- **最小—最大**：根据观测到的最小值和最大值设置缩放因子。简单，但对离群值敏感（一个极端值就可能把大部分量化范围浪费在很少使用的值上）。

- **百分位数**：使用 99.99 百分位，而不是绝对最大值。它会裁剪极端离群值，为大多数值提供更好的分辨率；被裁剪的值会饱和到 $q_{\min}$ 或 $q_{\max}$。

- **MSE 最优**：寻找能让原始张量与量化张量均方误差最小的缩放因子。这是一维优化（搜索可能的裁剪值），通常带来最好的 PTQ 精度。

- **基于熵**（KL 散度）：寻找能让原始值分布与量化值分布之间 KL 散度最小的缩放因子。TensorRT 的 INT8 校准使用这种方法。

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

- 对大多数模型，INT8 的 PTQ 效果很好，精度下降不到 1%。对 INT4，PTQ 质量会显著下降；后面的仅权重方法能更好地处理 INT4。

## 量化感知训练（QAT）

- **QAT** 把伪量化操作插入训练图：前向传播期间对权重和激活做量化与反量化，但梯度传播时仿佛没有量化一样（使用**直通估计器**）。

$$\text{Forward: } \hat{W} = \text{dequant}(\text{quant}(W))$$
$$\text{Backward: } \frac{\partial L}{\partial W} \approx \frac{\partial L}{\partial \hat{W}}$$

- 模型会在训练过程中学会对量化噪声保持鲁棒。QAT 通常可以恢复 PTQ 丢失的大部分或全部精度，尤其是在低比特宽度（INT4、INT2）下。

- **成本**：QAT 要求重新训练（或微调）模型，对大模型很昂贵。一个 70B 参数模型的 QAT 计算成本可能为 10,000–100,000 美元，而 PTQ 基本没有成本（只需校准）。

- **何时使用 QAT**：PTQ 质量不可接受（通常是 INT4 或更低）时；部署到延迟预算严格的边缘设备时；或模型将被量化数百万次时（一次 QAT 成本可以摊销）。

## 仅权重量化

- 对 LLM 推理，瓶颈是从内存加载权重，而不是使用权重做计算（内存带宽受限区间）。**仅权重量化**把权重量化到 INT4 或 INT3，同时保持激活为 FP16。计算在 FP16 中进行（即时反量化权重后），但内存占用和带宽需求降低 4–8 倍。

### GPTQ

- **GPTQ**（Frantar 等，2022）一次量化一列权重，并通过调整后续列来补偿该列误差。它使用**海森矩阵**（来自校准集的二阶信息）决定最优量化顺序和误差补偿：

$$\hat{W}_{:,j} = \text{quant}(W_{:,j}), \quad W_{:,j+1:} \mathrel{-}= \frac{(\hat{W}_{:,j} - W_{:,j}) \cdot H_{j,j+1:}}{H_{j,j}}$$

- 关键洞见是：量化第 $j$ 列会引入误差，GPTQ 立即调整所有剩余列，让层的整体输出（$XW$）尽可能少地改变。这是把**最优脑量化**（OBQ）应用到 Transformer 上。

- 使用 4 位逐组量化（组大小 128）的 GPTQ，在大多数 LLM 上带来的困惑度下降不到 1%。在单张 GPU 上量化一个 70B 模型大约需要 1 小时。

### AWQ

- **AWQ**（Activation-Aware Weight Quantisation，激活感知权重量化；Lin 等，2023）观察到，少数权重通道（1–3%）比其他通道重要得多，它们对应激活幅度较大的通道。保护这些显著通道能大幅减少量化误差。

- AWQ 在量化前把这些重要通道乘以因子 $s$（让它们变大，从而较少受舍入影响），再把对应激活乘以 $1/s$（保持输出不变）。它按组优化 $s$，以最小化总体量化误差。

- AWQ 比 GPTQ 简单（无需计算海森矩阵）、运行更快且质量相当，已经成为许多开源 LLM 量化流水线的默认选择。

### GGUF / llama.cpp 量化

- **GGUF**（GGML Universal Format）是 llama.cpp 用于 CPU 推理的格式，支持多种量化方案：
    - **Q4_0**：4 位、32 元素块、对称。
    - **Q4_K_M**：4 位，对重要通道采用混合精度（k-quant）。
    - **Q5_K_M**：5 位、k-quant（质量更高）。
    - **Q8_0**：8 位，简单快速。

- “K”变体（k-quant）给重要权重块分配更多比特，与 AWQ 的洞见类似，但在格式层面实现。Q4_K_M 是大多数模型的最佳折中：平均 4 位，质量损失极小。

### QuIP 与 QuIP#

- **QuIP**（Chee 等，2023）引入**非相干处理**：在量化前使用随机正交变换旋转权重矩阵，把信息分散到所有权重，避免少数离群权重主导量化误差。

- 直觉是：如果一个权重为 100、其余权重约为 1，用同一缩放因子量化全部权重会把大部分 INT4 范围浪费在离群值上。正交旋转保持矩阵的数学性质，同时让所有权重的幅度相近，均匀量化因此效果好得多。

- **QuIP#**进一步引入**格码本**：不再映射到均匀整数网格，而是映射到最优格（8 维 E8 格）的点。格码在相同比特数中打包更多量化点，比均匀量化有更好的率失真表现。QuIP# 在**2 位**精度下就能获得可用质量，只有典型 INT4 方法一半的比特数。

### SpQR

- **SpQR**（Dettmers 等，2023）发现极少数权重（0.1–1%）是对输出质量影响不成比例的**离群值**。SpQR 不把所有权重都量化到同一精度，而是：

    1. 使用敏感度分析识别离群权重（量化该权重会让层输出改变多少）。
    2. 在稀疏格式中以**全精度**（FP16）保存离群值。
    3. 把其余权重量化到 INT3 或 INT4。

- 结果是约 99% 的权重被激进压缩，而关键的 1% 保持全精度；稀疏离群值只增加很小开销（总大小不到 5%）。

### HQQ

- **HQQ**（Half-Quadratic Quantisation，半二次量化；Badri 与 Shaji，2023）是一种**零样本**权重量化方法，完全不需要校准数据。它把量化表述为半二次优化问题，通过迭代求解最优量化权重和缩放因子。

- 优点是没有校准集，因此没有数据依赖、可以立即量化，也没有校准数据不匹配的风险。当无法获得代表性校准数据或数据很敏感时，HQQ 特别有用。

### AQLM

- **AQLM**（Egiazarian 等，2024）把**加性量化**（多码本向量量化）应用于 LLM。它不独立量化每个权重，而是把权重分成向量，用多个学习到的码本条目之和表示每个向量：

$$\mathbf{w} \approx \mathbf{c}_1^{(1)} + \mathbf{c}_2^{(2)} + \cdots + \mathbf{c}_M^{(M)}$$

- 其中 $\mathbf{c}_i^{(m)}$ 是码本 $m$ 中的一个条目。使用两个各含 256 个条目的码本（$M = 2$）时，一个 8 元素向量由两个 8 位索引编码：8 个权重只需 2 字节，实际为**每权重 2 位**。AQLM 在 2 位精度下达到当前最先进质量，超过 GPTQ 和 AWQ 在这种极限压缩下的表现。

### BitNet 与 1 位 LLM

- **BitNet**（Wang 等，2023）把量化推向极端：权重为三值（$\{-1, 0, +1\}$），每个权重只需约 1.58 位。矩阵乘法变成**只做加法和减法**，不需要浮点乘法。

- **BitNet b1.58**（Ma 等，2024）把每个权重限制在 $\{-1, 0, +1\}$。所谓“1.58 位”来自 $\log_2(3) \approx 1.58$。在这种精度下，70B 模型约 15 GB，推理无需乘法，只需加法、减法和符号翻转。

- 矩阵乘法变为：

$$y_j = \sum_i W_{ij} \cdot x_i = \sum_{i: W_{ij}=+1} x_i - \sum_{i: W_{ij}=-1} x_i$$

- 这在任何硬件上都比 FP16 矩阵乘法便宜得多，甚至可能让没有浮点单元的设备运行 LLM。对当前模型而言质量权衡仍然明显，但随着模型规模扩大和训练时加入量化感知，这种方法会继续改善。

### 微缩放（MX）格式

- **微缩放（MX）**格式是新的行业标准（AMD、Arm、Intel、Meta、Microsoft、NVIDIA、Qualcomm 均支持），采用**块浮点**：一组元素共享一个指数，每个元素拥有自己的尾数。

| 格式 | 共享指数 | 元素位数 | 总计（每元素） | 等效 |
|--------|----------------|-------------|--------------------|----|
| MXFP8 | 每块 8 位 | 8（E4M3/E5M2） | 约 8 | 类似 FP8，但范围更好 |
| MXFP6 | 每块 8 位 | 6 | 约 6.5 | 位于 FP8 与 INT4 之间 |
| MXFP4 | 每块 8 位 | 4 | 约 4.5 | 类似 INT4，但行为像浮点数 |
| MXINT8 | 每块 8 位 | 8（整数） | 约 8.5 | 共享缩放的 INT8 |

- 共享指数把指数成本分摊到一个块（通常 16–32 个元素）上。每个元素比使用独立指数时保留更多尾数位，因此每比特的精度更高。预计未来硬件会用 MX 格式取代独立的 FP8 和 INT8 格式。

### FP8 训练

- 在 NVIDIA Hopper 和 Blackwell GPU 上，使用 FP8 训练（不只是推理）已经可行。流程如下：

    - **前向传播**：权重和激活使用 E4M3（精度更高、范围更窄）。Transformer Engine 使用延迟缩放动态计算逐张量缩放因子（跟踪上一次迭代的统计量，把它应用到当前迭代）。
    - **反向传播**：梯度使用 E5M2（范围更宽、精度更低）。梯度的数值范围比权重/激活更宽，因此额外的指数位可以防止溢出。
    - **主权重**：为优化器状态保留 FP32（类似第 06 章的 FP16 混合精度训练）。FP8 只用于矩阵乘法，不用于权重更新。
    - **损失缩放**：FP8 仍然需要损失缩放，就像 FP16 一样。动态损失缩放器调整缩放因子，使梯度值落在 FP8 可表示范围内。

- 对大多数模型规模，FP8 训练质量可与 BF16 相当，同时吞吐提高约 2 倍；它是 H100 集群新大规模训练的默认选择。

## 激活量化

- 也可以量化激活（层与层之间流动的中间张量），从而实现完全 INT8 的计算（权重和激活都是 INT8，并用 INT32 累加）。

- **动态量化**：在运行时根据实际激活值计算缩放因子。更准确（适应每个输入），但会增加开销（每层都要计算最小/最大值或百分位数）。

- **静态量化**：在校准期间计算一次缩放因子并固定。推理更快（无需运行时统计），但校准数据不具代表性时精度较低。

- **逐 token 量化**：为序列中的每个 token 计算独立缩放因子。对 LLM 至关重要，因为不同 token 的激活幅度可能非常不同（有些 token 产生的激活比其他 token 大 100 倍）。

- 激活量化比权重量化更难，因为激活依赖数据（每次输入都会变化），而权重是固定的。“离群值”问题尤其严重：少数激活通道的值可能是均值的 100 倍，用与普通通道相同的缩放因子量化会浪费精度。

- **SmoothQuant**（Xiao 等，2022）通过数学方式把量化难点从激活（有离群值、难以量化）迁移到权重（容易量化）：把激活乘以 $1/s$、权重乘以 $s$，其中 $s$ 平衡两者的难度。输出 $XW = (X \cdot \text{diag}(s^{-1})) \cdot (\text{diag}(s) \cdot W)$ 不变。

## 混合精度量化

- 并非所有层对量化同样敏感。注意力层通常能接受 INT4，而嵌入层和最终分类器需要更高精度。

- **敏感度分析**：逐层量化并测量精度影响。敏感度高的层分配更多比特，不敏感的层使用更少比特。

- Transformer Engine（第 16 章，NVIDIA Hopper）在操作层面实现动态混合精度：每次矩阵乘法根据张量统计量选择 FP8 或 FP16，在保持质量的同时最大化吞吐。

## KV-cache 量化

- LLM 生成期间，**KV-cache** 保存此前所有 token 的 key 和 value 张量。对长序列，它会占据主要内存：

$$\text{KV-cache size} = 2 \times n_{\text{layers}} \times n_{\text{heads}} \times d_{\text{head}} \times \text{seq\_len} \times \text{bytes\_per\_element}$$

- 一个 70B 模型有 80 层、64 个头、每个头 128 维，在 FP16 和 128K 序列长度下需要 $2 \times 80 \times 64 \times 128 \times 131072 \times 2 = 330$ GB，超过 GPU 显存。

- **KV-cache 量化**把缓存的 key 和 value 从 FP16 改为 INT8 或 INT4，从而减少内存。误差会沿序列累积（每个新 token 都会关注所有缓存的 K/V），但逐通道或逐头量化可以把质量下降控制在可接受范围。

- **KV-cache 量化具有乘法级收益**：它支持更长序列（更多上下文）、更大 batch size（更多并发用户）以及更快推理（加载缓存所需内存带宽更少），是 LLM 服务中影响最大的优化之一。

## 编程任务（使用 Colab 或 notebook）

1. 从零实现对称 INT8 量化。量化一个权重矩阵、反量化它，并测量重构误差随数值分布的变化。
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

2. 演示离群值问题。创建带有少数极端通道的激活，展示逐张量量化为何失败、逐通道量化为何成功。
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

3. 计算不同模型规模和序列长度下的 KV-cache 内存，说明长上下文模型为何必须量化 KV-cache。
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
