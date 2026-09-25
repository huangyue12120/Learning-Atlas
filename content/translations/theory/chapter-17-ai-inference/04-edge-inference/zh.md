---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 17 - AI inference/04. edge inference.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: f32813ef8142c3e5f8b99576ed24f1d8f4fb5e0626b4456f16e22d4a4cce37da
status: reviewed
---
# 端侧推理

*端侧推理是在用户设备（手机、笔记本或物联网传感器）上运行模型，而不把请求发送到云端。本文介绍端侧设备的约束、模型压缩流程、设备端运行时、编译器栈、硬件目标（NPU 和 Neural Engine）、设备端 LLM、联邦学习和延迟优化。*

- 云端推理需要网络连接，网络往返延迟在一些设置下约为 50–200 ms，也会产生服务费用，并可能把用户数据发送到第三方服务器。端侧推理可让请求在本地处理，减少网络往返和云端调用；是否完全离线、是否产生边际费用，以及是否保护隐私，取决于应用的数据流、设备能耗和云端回退设置。
- 端侧设备的计算能力、内存和功耗预算通常比数据中心 GPU 小得多。要在这些限制内运行模型，往往需要同时优化模型、编译过程和运行时。
- **Cactus**（[github.com/cactus-compute/cactus](https://github.com/cactus-compute/cactus)）是面向手机和可穿戴设备的 AI 引擎。项目介绍了 ARM SIMD 自定义内核（第 16 章）、KV cache 量化（第 17 章第 1 篇）、分块预填充、Apple 和 Qualcomm 芯片上的 NPU 推理、零拷贝内存映射，以及设备能力不足时回退到云端等做法。项目报告称，在特定配置下，零拷贝映射可将 RAM 占用降至约十分之一；实际结果取决于内存统计口径和工作负载。它支持多模态推理，并为 iOS、Android、macOS 和嵌入式 Linux 提供 Swift、Kotlin、Python、Flutter、React Native 和 Rust SDK。项目文档还报告，在特定配置下，1.2B INT4 模型可在 M4 Pro 上达到每秒约 100 个解码词元，在 iPhone 17 Pro 上达到约 48 个；这些数字取决于模型版本、上下文和测试方法，不代表普遍性能。

## 端侧设备约束

| 资源 | 云端 GPU（H100） | 笔记本（M4） | 手机（Snapdragon 8 Gen 3） | IoT（ESP32） |
|----------|-----------------|-------------|---------------------------|-------------|
| 内存 | 80 GB HBM3 | 16–36 GB 统一内存 | 8–12 GB LPDDR5 | 520 KB |
| 计算能力 | 989 TFLOPS（FP8） | 38 TOPS（Neural Engine） | 45 TOPS（NPU） | 0.001 TOPS |
| 功耗 | 700 W | 15–30 W | 5–10 W | 0.1 W |
| 存储空间 | TB 级 | 256 GB–2 TB | 128–512 GB | 4 MB |

- 表中峰值来自不同芯片和精度，数值相除可得到约 22 倍（989/45）和约 989,000 倍（989/0.001），但这只是表内峰值数字的比值。H100 的 FP8 TFLOPS 与手机、微控制器列出的 TOPS 在数值精度和运算口径上不同，不能据此推断实际推理性能。不同设备需要不同程度的压缩，也可能适合不同的模型架构。

## 模型压缩流程

- 端侧部署通常会按需求组合多种模型优化方法，而不是只用一种压缩技术。例如：

```
完整模型（FP32，70B 参数）
    ↓ 知识蒸馏 → 更小的模型（7B 参数）
    ↓ 结构化剪枝 → 删除冗余注意力头或层（约 4B 有效参数）
    ↓ 量化（INT4）→ 原始权重约缩小到四分之一（约 2 GB）
    ↓ 编译器优化 → 融合内核、优化内存布局
    ↓ 运行时 → 在设备上执行
```

- 每步都可能降低存储或延迟，但压缩比例及质量损失因模型而异。一个可行顺序是先蒸馏以缩小模型，再剪枝、量化，最后针对目标硬件编译；实际流程不一定固定按此顺序，量化后微调等组合也可能适用。

## 设备端运行时

- **运行时**负责加载模型、分配内存并在目标硬件上执行推理。不同平台支持的运行时和加速后端不同：
- **ONNX Runtime**：跨 Windows、Linux、macOS、iOS 和 Android 等平台，可通过执行提供程序使用 CPU、GPU（CUDA、DirectML、Core ML、NNAPI）及其他加速器。模型通常需从 PyTorch 或 TensorFlow 导出为 ONNX；支持的算子和后端随平台而异。
- **TensorFlow Lite（TFLite）**：Google 的端侧推理运行时，支持 ARM CPU 和部分 Android 加速后端，提供 INT8 和 FP16 等格式，常用于 Android 部署。精简构建的运行库可约为 1 MB；二进制大小、可用委托后端和算子覆盖范围取决于构建配置，部署时应确认设备和版本支持。
- **Core ML**：Apple 平台的模型运行时，可把受支持的算子分配给 Neural Engine、GPU 或 CPU。模型可使用 `coremltools` 转换；实际设备选择和性能依模型结构、系统版本及硬件而异。
- **ExecuTorch**：Meta 的设备端 PyTorch 运行时，支持提前编译和把算子委托给硬件加速器，是 PyTorch Mobile 后续发展的设备端方案之一。
- **TensorRT**：NVIDIA GPU 推理优化运行时（第 15 章），可融合层、选择内核并应用量化等优化。相对 PyTorch eager mode 的 2–5 倍加速是特定基准结果，不是所有模型和 GPU 的固定收益。
- **llama.cpp**：用于 LLM 推理的 C/C++ 项目，支持 GGUF 量化格式（如 Q4、Q5、Q8）以及 CPU（AVX/NEON）、Apple Metal、CUDA 和 Vulkan 等后端，常用于消费级硬件部署。

## 编译器栈

- 高层模型图（例如 PyTorch 图）与硬件指令（例如 NPU 指令）之间通常经过多个编译阶段，**编译器栈**会按目标设备优化模型：

```
PyTorch 模型
    ↓ 导出（torch.export、ONNX、TorchScript）
图 IR（中间表示）
    ↓ 图优化
        - 常量折叠（编译时计算常量表达式）
        - 死代码消除（移除未使用的操作）
        - 算子融合（conv + bn + relu → 单个融合算子）
        - 布局变换（NCHW → NHWC，适配 ARM 的 channels-last 布局）
    ↓ 降级
硬件专用 IR
    ↓ 后端优化
        - 分块与循环排序（改善缓存访问模式）
        - 向量化（SIMD，第 16 章）
        - 内存规划（复用缓冲区，降低峰值内存）
        - 内核选择（为每个算子选择实现）
    ↓ 代码生成
机器码 / NPU 指令
```

- **算子融合**可能带来显著收益。一个 Transformer 块通常包含矩阵乘法、加法、层归一化和 softmax 等操作。若每个操作都把结果写回内存、再由下个操作读入，会增加数据搬运；融合内核可以减少中间读写，在部分场景下提高速度。原文提到的 2–5 倍是依赖实现和硬件的示例，不是普遍加速比（见第 16 章的屋顶线模型）。
- **内存规划**：编译器分析张量的生命周期，让不同时存活的张量复用内存缓冲区。若许多中间张量的生命周期不重叠，峰值占用可远小于它们大小的总和；具体收益取决于计算图和运行时。

## 硬件目标

### 移动 GPU

- **Qualcomm Adreno**（Android）：支持 OpenCL、Vulkan Compute（第 16 章）及 Qualcomm 的 SNPE 等后端。不同型号可能有约 256–1024 个 ALU，并支持 FP16、INT8 等格式；具体数量和能力依芯片而异。
- **ARM Mali**（Android）：支持 OpenCL 和 Vulkan。其常见 GPU 架构采用基于图块的渲染与计算方式，最优内存访问模式不同于桌面 GPU；具体行为取决于型号和驱动。
- **Apple GPU**（iOS/macOS）：通过 Metal 使用。统一内存减少显式 CPU/GPU 数据复制，但不消除内存带宽、同步和布局转换成本。Metal Performance Shaders（MPS）提供优化后的机器学习算子。

### 神经处理器（NPU）

- **NPU** 是面向机器学习推理的专用加速器。对受支持的矩阵乘法、卷积和激活算子，它可能比通用 GPU 更节能；不受支持的算子可能回退到 CPU 或其他设备。
- **Apple Neural Engine**：Apple 芯片中的专用加速器。部分代际为 16 核，Apple 报告的峰值约为 38 TOPS（INT8）；可经由 Core ML 调度。它不能执行任意代码，只能运行硬件和 Core ML 支持的算子。
- **Qualcomm Hexagon NPU**：集成在部分 Snapdragon 系统芯片中，支持的精度、算子和访问方式因代际与 SDK 而异；可通过 SNPE 或带 QNN 后端的 ONNX Runtime 使用。它可用于背景模糊、语音识别和实时翻译等设备端功能。
- **Google Edge TPU**：面向低功耗推理的 Coral 加速器系列。特定 Edge TPU 提供约 4 TOPS、2 W 的标称规格，使用 Coral 工具链时通常要求受支持的 INT8 TensorFlow Lite 模型和算子。
- **算子委派模式**：运行时把计算图中的受支持算子分配给 NPU，其余算子留在 CPU 或其他后端执行。委派覆盖范围、设备间传输和同步成本共同影响性能与能耗。

## 设备端 LLM

- 小模型配合低位宽量化后，可在手机或笔记本上运行。下表是特定报告中的示例，性能会随设备、运行时、量化格式、提示长度和测试方法变化：

| 模型 | 参数量 | 量化后大小 | 目标设备 | 示例性能 |
|-------|--------|---------------|---------------|-------------|
| Phi-3 Mini | 3.8B | 约 2 GB（Q4） | 手机/笔记本 | iPhone 15 上约 15 词元/秒 |
| Gemma 2B | 2B | 约 1.5 GB（Q4） | 手机 | Pixel 8 上约 20 词元/秒 |
| Llama 3.2 1B | 1B | 约 700 MB（Q4） | 手机 | 约 30 词元/秒 |
| Llama 3.2 3B | 3B | 约 2 GB（Q4） | 手机/笔记本 | 约 15 词元/秒 |
| Llama 3.1 8B | 8B | 约 4.5 GB（Q4） | 笔记本 | M2 上约 20 词元/秒 |

- 主要挑战：
    - **内存**：3B Q4 模型的权重文件可能接近 2 GB；长对话的 KV cache、运行时和其他应用还要占内存。手机可用上下文长度取决于设备、模型和设置，不能统一限定为 2–4K 词元。
    - **热降频**：持续推理可能使手机升温并降低时钟频率。降频是否发生、何时发生以及性能下降幅度取决于芯片、机身散热、环境温度和负载。
    - **电池**：推理功耗随模型与设备变化。若设备持续消耗 3–5 W，30 分钟约耗电 1.5–2.5 Wh；实际电量百分比取决于电池容量和功耗轨迹，不能视为固定 5%。偶尔使用与常驻应用的电量影响不同。
- **llama.cpp** 可通过 CPU（AVX2、NEON、I8MM）、Apple GPU（Metal）、NVIDIA GPU（CUDA）、AMD GPU（ROCm/Vulkan）等后端运行，也可在 Android 的 Termux 等环境中使用；具体支持取决于设备构建和驱动。

## 联邦学习

- **联邦学习**让多个设备在本地数据上训练模型，而不把原始训练数据集中上传。设备计算模型更新，再发送给服务器聚合。
- **联邦平均（FedAvg）**的简化流程：
    1. 服务器把当前模型发送给选中的 $K$ 台设备。
    2. 每台设备用本地数据微调若干步。
    3. 每台设备将更新后的模型或参数差值发回服务器。
    4. 服务器聚合更新，例如等权平均：$W_{\text{new}} = \frac{1}{K} \sum_{k=1}^{K} W_k$。实际 FedAvg 也常按各设备的数据量加权。
    5. 重复上述过程。
- **隐私**：训练样本可以留在设备上，但梯度或模型更新本身仍可能泄漏信息，不能据此保证隐私。**差分隐私**通过对更新加入适当校准的噪声，限制单个数据点对输出结果的影响；其保护强度取决于隐私预算及机制设置。
- **通信效率**：模型更新可能与模型本身一样大。可用**梯度量化**（例如传 INT8 而非 FP32）、**稀疏化**（只传部分梯度）或**梯度累积**（本地多做几步再发送）减少通信量，但这些办法会带来精度、收敛或隐私上的取舍。
- **应用示例**：联邦学习曾用于研究键盘预测、语音识别和健康监测等场景；具体产品是否采用、采用何种隐私保护机制，应以相应系统文档为准。

## 延迟优化

- 除压缩模型外，也可从推理流程降低端到端延迟：
- **提前退出**：在中间层添加分类头。如果模型在第 6 层（共 24 层）已能可靠分类，就跳过后续层。对容易和困难输入混合的任务，提前退出可能降低平均延迟；需要训练或校准退出头并验证错误率。
- **模型分区**：把模型操作分配到更适合的 NPU、GPU 或 CPU 上。编译器可依据算子支持与性能分析作出分配；跨设备传输和同步开销可能抵消收益。
- **缓存**：对于重复前缀的自动补全或代码补全，可缓存已计算的 KV cache。只有请求前缀、模型和相关配置兼容时，才能复用并跳过对应的预填充计算。
- **推测式预取**：预测用户下一步可能的操作，并在用户发出请求前启动计算，例如在用户阅读当前回答时预先生成可能的后续回答。预测错误时会浪费计算，且应考虑何时会接触尚未明确请求的数据。

## 编程练习（使用 Colab 或 Notebook）

1. 模拟模型压缩流程：从 FP32 模型开始，模拟蒸馏、剪枝和量化，并记录每一步的模型大小。示例用固定比例代替真实训练和剪枝，不预测精度变化；70B × 0.15 得到 10.5B 参数，与上方流程图的 7B 示例不同，两者都是假设值。

```python
def compression_pipeline(original_params_M, original_bits=32):
    size_mb = original_params_M * 1e6 * original_bits / 8 / 1e6

    print(f"Original: {original_params_M}M params, {original_bits}-bit → {size_mb:.0f} MB")

    # Step 1: Knowledge distillation (reduce params)
    distilled_params = original_params_M * 0.15  # 70B → ~10B equivalent
    size_mb = distilled_params * 1e6 * original_bits / 8 / 1e6
    print(f"After distillation ({distilled_params:.0f}M params): {size_mb:.0f} MB")

    # Step 2: Structured pruning (remove 30% of remaining)
    pruned_params = distilled_params * 0.7
    size_mb = pruned_params * 1e6 * original_bits / 8 / 1e6
    print(f"After pruning ({pruned_params:.0f}M params): {size_mb:.0f} MB")

    # Step 3: INT4 quantisation
    size_mb = pruned_params * 1e6 * 4 / 8 / 1e6
    print(f"After INT4 quantisation: {size_mb:.0f} MB")

    print(f"Total compression: {original_params_M * 1e6 * original_bits / 8 / 1e6 / size_mb:.0f}x")

print("=== Starting from 70B model ===")
compression_pipeline(70000)

print("\n=== Starting from 7B model ===")
compression_pipeline(7000)
```

2. 估算设备端推理延迟：根据模型参数量、位宽和内存带宽估算解码时间，并与延迟目标比较。该示例只计算理想情况下每词元读取权重的时间，未计入计算瓶颈、KV cache、量化元数据、运行时开销或并行批处理；`compute_tops` 与 `seq_len` 参数在代码中未使用，因此结果只是带宽下界的粗略估算。

```python
def estimate_latency(model_name, params_M, bits, compute_tops, mem_bw_gbs, seq_len=256):
    """Estimate token generation latency for a memory-bandwidth-bound model."""
    # Model size in bytes
    model_bytes = params_M * 1e6 * bits / 8

    # Decode is memory-bound: must load entire model per token
    time_per_token_ms = model_bytes / (mem_bw_gbs * 1e9) * 1000

    # Tokens per second
    tokens_per_sec = 1000 / time_per_token_ms

    print(f"{model_name}: {params_M/1000:.1f}B params @ {bits}-bit = {model_bytes/1e9:.1f} GB")
    print(f"  Memory bandwidth: {mem_bw_gbs} GB/s")
    print(f"  Time per token: {time_per_token_ms:.1f} ms")
    print(f"  Tokens/sec: {tokens_per_sec:.0f}")
    print()

# Apple M2 Pro: 200 GB/s unified memory bandwidth
print("=== Apple M2 Pro (200 GB/s) ===")
estimate_latency("Llama-7B Q4", 7000, 4, 15.8, 200)
estimate_latency("Llama-7B Q8", 7000, 8, 15.8, 200)
estimate_latency("Llama-70B Q4", 70000, 4, 15.8, 200)

# Phone (Snapdragon 8 Gen 3): ~50 GB/s LPDDR5
print("=== Snapdragon 8 Gen 3 (50 GB/s) ===")
estimate_latency("Phi-3 Mini Q4", 3800, 4, 45, 50)
estimate_latency("Llama-3B Q4", 3000, 4, 45, 50)
```
