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

# 边缘推理

*本篇将边缘推理放回 AI 工程语境，保留源文中的定义、公式、代码、图示和实践边界，便于逐项核对。*

*Edge推论在用户设备(手机,笔记本电脑,IOT传感器)上运行模型而未将数据发送到云中. 此文件涵盖边缘限制,模型压缩管道,在线设备运行时间,编译器栈,硬件目标(NPU,神经引擎),在线设备LLMs,联合学习,以及即时优化*

- 云推论需要网络连接,会增加耐用性(50-200ms回程),每个请求要花钱,并将用户数据发送给第三方服务器. ** Edge 推论** 消除了所有四个:模型在本地运行,即时响应,每推论不费一分钱,并保持数据保密.

- 取舍:边缘设备的计算和内存比数据中心GPU少100-1000x. 使模型在这些限制范围内运作,需要在各个层次积极优化。

- ** 仙人掌**([github.com/cactus-compute/cactus (中文(简体)).](https://github.com/cactus-compute/cactus))是一种低纬度的AI引擎,为移动和可穿戴设备而专门建造. 它证明了这个文件在生产中覆盖的许多技术:用于注意和矩阵操作的自定义ARM SIMD内核(第16章),KV-cache分数(第17章文件01),被块预填,苹果和Qualcomm芯片的NPU加速推论,为10x低RAM使用量的零复制内存映射,以及当上解码计算不足时自动回落云. Cactus支持跨iOS,Android,macOS和嵌入式Linux的多模式推论(LLMs,视觉,语音),并配有SDKs用于斯威夫特,克特林,Python,Flutter,React Introduct,和Rust. 它的基准显示在M4 Pro上100个令牌/s解码,在iPhone 17 Pro上48个令牌/s解码,用于INT4上一个1.2B模型,这是优化边缘推论看起来的具体例子.

## 边缘约束


|Resource|Cloud GPU (H100)|Laptop (M4)|Phone (Snapdragon 8 Gen 3)|IoT (ESP32)|
|----------|-----------------|-------------|---------------------------|-------------|
|RAM|80 GB HBM3|16-36 GB unified|8-12 GB LPDDR5|520 KB|
|Compute|989 TFLOPS (FP8)|38 TOPS (Neural Engine)|45 TOPS (NPU)|0.001 TOPS|
|Power|700 W|15-30 W|5-10 W|0.1 W|
|Storage|TB|256 GB-2 TB|128-512 GB|4 MB|

- 云GPU和手机NPU的计算间隔为~20x. 在GPU和微控制器之间,是~1,000,000x. 不同的设备需要不同程度的压缩和不同的模型架构.

## 模型压缩流水线


- 对于边缘部署来说,压缩不是一个单一的技术，，它是按顺序应用的补充技术的**接线**:

```
Full model (FP32, 70B params)
    ↓ Knowledge distillation → smaller model (7B params)
    ↓ Structured pruning → remove redundant heads/layers (4B effective)
    ↓ Quantisation (INT4) → 4x smaller (2 GB)
    ↓ Compiler optimisation → fused kernels, optimised memory layout
    ↓ Runtime → on-device execution
```

- 每一步都减少体积和耐久性. 顺序很重要:先是分解(减结构),再分解出prune(再移动结构),再分解出(减精度),再分解出(优化目标硬件). 量子化后的消沉会试图压缩一个已经很亏损的模型.

## 端侧运行时


- **运行时间** 加载一个模型,分配内存,并执行对目标硬件的推论. 每个平台都有其首选的运行时间:

- **ONNX Runtime**:跨平台(Windows,Linux,macOS,iOS,Android). 支持CPU,GPU(CUDA, DirectML, CoreML, NNAPI),以及许多加速器后端. 最便携的选择 模型从PyTorch/TensorFlow中导出为ONNX格式.

- **TensorFlow Lite (TFLite)**:谷歌的边缘跑步时间. 优化了ARMCPU和Android NPU. 微小二进制 (~1 MB). 支持INT8并被浮起16. 安卓部署标准.

- ** Core ML**:苹果公司运行时间为iOS/macOS. 根据模型特性自动使用神经引擎,GPU或CPU. 从 PyTorch / 传感器花转换模型`coremltools`。。。与Apple硬件(统一内存,神经引擎)的紧密整合.

- **ExecuTorch**:Meta的新运行时间为上接设备PyTorch. 为边缘部署而设计,采用提前编译,操作员一级授权硬件加速器. 继承人为PyTorch Mobile.

- ** TensorRT**:NVIDIA对GPU推论优化的运行时间(第15章). 花序分层,选择最佳内核,并自动进行定量. 在NVIDIA GPU上比PyTorch急切模式快2-5x.

- **llama.cpp**:用于LLMs的单文件 C++推论引擎. 支持GGUF量化(Q4,Q5,Q8),CPU(AVX/NEON),Metal(Apple GPU),CUDA和Vulkan. 在消费硬件上运行LLMs的游戏.

## 编译器栈


- 在高阶模型(PyTorch graph)和硬件(NPU指针)之间坐落了**编译器栈**,该栈选择了特定目标的模型:

```
PyTorch model
    ↓ Export (torch.export, ONNX, TorchScript)
Graph IR (intermediate representation)
    ↓ Graph optimisations
        - Constant folding (compute constant expressions at compile time)
        - Dead code elimination (remove unused operations)
        - Operator fusion (conv + bn + relu → single fused op)
        - Layout transformation (NCHW → NHWC for ARM, channels-last)
    ↓ Lowering
Hardware-specific IR
    ↓ Backend optimisations
        - Tiling and loop ordering (cache-friendly access patterns)
        - Vectorisation (SIMD, chapter 16)
        - Memory planning (reuse buffers to minimise peak memory)
        - Kernel selection (choose the best implementation per op)
    ↓ Code generation
Machine code / NPU instructions
```

- **操作器聚变**是最有影响的优化. 变压器块有~20个操作(matmul,加成,层诺姆,软max等). 没有核聚变,每个都将其输出写入内存并被下个读回. 通过聚变,多个操作被合并成一个将数据保存在登记册/缓存中的单一内核. 这可以更快地达到2-5x(第16章,屋顶线型号).

- ** Memory plansion**:编译器分析模型图,以确定哪些百分位数在一生中重叠,并可共享相同的内存缓冲. 一个具有100个中间式抗震器的模型可能只需要10个内存,因为大多数都是被消耗和释放后才能被创造出其他的. 这对内存有限的设备至关重要。

## 硬件目标


### 移动 GPU


- **Qualcomm Adreno**（Android）：支持 OpenCL、Vulkan Compute（第 16 章）和 Qualcomm 的专有 SNPE（Snapdragon Neural Processing Engine）。Adreno GPU 拥有 256–1024 个 ALU，并支持 FP16 与 INT8。

- **ARM马里** (Android):支持OpenCL和Vulkan. 马里GPU使用以平板为主的架构(不同于桌面GPU),这影响了最佳内存访问模式.

- **Apple GPU**(iOS/macOS):通过Metal(Apple's GPU API)访问. 统一内存架构意味着没有CPUQGPU的复制机在间接费用上. Metal Performance Shaders(MPS)提供最优化的ML原始.

### 神经处理单元（NPU）


- NPU是专门为ML推论而设计的固定功能加速器. 它们比GPU在标准ML操作(matmul, conv,活化)中更能高效.

- **Apple神经引擎**:16个核心,~38 TOPS (INT8). 通过Core ML访问. 对视觉模型和机能传播来说是很好的 无法运行任意代码，，只有Core ML支持的操作.

- XQualcomm Hixagon NPU**:被集成到Snapdragon SoCs. 支持INT8和INT4推论. 以QNN后端通过SNPE或ONNX运行时访问. 权力在设备上的功能如背景模糊,语音识别,以及实时翻译等.

- **"Google Edge TPU"**:一个小而低功率的版本云"TPU". (原始内容存档于2019-03-21). 4 TOPS, 2W. 用于珊瑚设备,用于探测推论。仅支持INT8四分数的TFLite模型.

- ** 授权模式**:运行时间将模式图从NPU(用于支持的操作)和CPU(用于不支持的操作)中分出. 将运行在NPU上的分数最大化是性能和功率效率的关键.

## 端侧 LLM


- 在手机和笔记本电脑上运行LLMS已变得可行,

|Model|Params|Quantised Size|Target Device|Performance|
|-------|--------|---------------|---------------|-------------|
|Phi-3 Mini|3.8B|~2 GB (Q4)|Phone/Laptop|~15 tokens/s on iPhone 15|
|Gemma 2B|2B|~1.5 GB (Q4)|Phone|~20 tokens/s on Pixel 8|
|Llama 3.2 1B|1B|~700 MB (Q4)|Phone|~30 tokens/s|
|Llama 3.2 3B|3B|~2 GB (Q4)|Phone/Laptop|~15 tokens/s|
|Llama 3.1 8B|8B|~4.5 GB (Q4)|Laptop|~20 tokens/s on M2|

- ** 挑战**:
    - ** Memory**:一个3B Q4型号能与2GB相匹配,但用于长对话的KV-cache会大大增加. 上下文长度一般限于手机上2-4K个令牌.
    - **热脉冲**:持续推论使电话加热. 经过30秒的连续生成后,SoC节奏时钟速度可以防止过热,将性能降低30%-50%.
    - **Batterry**:以15个令牌/s消耗~3-5W运行一款3B型. 30分钟的谈话排出~5%的典型电话电池. 偶尔可以使用,总是在应用中遇到问题。

- **lama.cpp**是在线电子设备的规范。它运行于CPU(AVX2,NEONN,I8MM),苹果GPU(Metal),NVIDIA GPU(CUDA),AMD GPU(ROCm/Vulkan)甚至手机上(通过Termux在Android上).

## 联邦学习


- ** 联邦学习** 跨越许多设备的火车模型,而不集中数据。每个设备都会在其本地数据上运行,计算出一个梯度更新,并且只将更新(而不是数据)发送到集成更新的中央服务器.

- **算法**(FedAvg):
    1. 服务器将当前模型发送到$K$选定的设备。
    2. 每个设备都对其局部数据上的模型进行微调,以进行几个步骤.
    3. 每个设备都会将其更新的模型(或差数)发回服务器.
    4. 服务器平均更新 :$W_{\text{new}} = \frac{1}{K} \sum_{k=1}^{K} W_k$.
    5. 复说.

- ** Privace**:原始数据从未离开设备。服务器只看到汇总模型更新. ** 差异性隐私** 为更新添加了噪音,这样单个数据点不能从梯度反向工程.

- **通信效率**:模型更新量大(与模型大小相同). 压缩技术减小了这个:**梯度分数**(送出INT8梯度而不是FP32),**分数**(只送出最大梯度),和**梯度积分**(做更多的局部步骤,发送较少).

- **应用**:谷歌的键盘预测(Gboard),苹果的语音识别,健康监测(在敏感健康数据上的培训而不集中).

## 延迟优化


- 除了压缩外,一些技术还减少了端到端的推断延迟:

- ** Early出道**:在中间地层中添加分类头. 如果模型在第6层(24层)有自信,则返回预测而不运行第7-24层. 方便输入提前退出,硬输入使用全模式. 对于容易和硬投入相结合的任务,平均延迟率大幅下降。

- ** 模式分出**:将模式分出NPU(高效用于matmul),GPU(高效用于不规则操作)和CPU(处理其他所有东西). 编译器根据剖面分析决定哪些操作到哪里去.

- ** Caching**:用于重复查询(自动完成,代码完成)的应用程序,缓存最近计算. 如果用户键入"How Do I"和模型最近为"How Do I"生成了完成,缓存的KV-cache可以被再用,完全跳过预填相.

- ** 预测性预取**:预测用户接下来会做什么,在询问前开始推论. 聊天应用程序可能在用户读取当前答案时开始生成对可能后续问题的响应.

## 编程任务（使用 Colab 或 notebook）


1. 模拟模型压缩管. 从浮点32模型起,应用蒸馏(mock),分流,并分解,并跟踪每个步骤的大小.
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

2. 估计空穴入洞 考虑到一个模型的操作计数和硬件规格,计算它是否满足了潜伏目标.
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
