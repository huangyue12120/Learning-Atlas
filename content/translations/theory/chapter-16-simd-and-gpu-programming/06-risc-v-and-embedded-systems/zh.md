---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 16 - SIMD and GPU programming/06. RISC-V and embedded systems.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 8f2f66728ad0092a62bfd362e30f0249bae8f5defe4565c7cbb940293119a3c1
status: reviewed
---
# RISC-V 与嵌入式系统

*RISC-V 是正在重塑芯片行业的开放标准指令集架构。本文介绍 RISC-V 的理念、V 向量扩展、嵌入式机器学习推理、微控制器上的 TinyML、RISC-V 在 AI 加速器中的应用，以及边缘部署约束。*

- 此前介绍的 x86 和 ARM 都涉及 **许可**。原文称 Intel 和 AMD 为 x86 付费，Apple、Qualcomm 及所有智能手机厂商每年向 ARM 支付数十亿美元。**RISC-V** 则不同：它是开放标准，任何人都可以基于该 ISA 设计、制造和销售芯片，无需为 ISA 支付版税。这正在改变芯片设计的经济模式，尤其是在 AI 领域。

> **编者注**：这里对 x86 与 ARM 商业许可关系的概括过于绝对。x86 实现权来自专利、交叉许可等安排，不宜笼统表述为 Intel 和 AMD “为 x86 付费”；ARM 授权模式与费用也因厂商和协议而异。RISC-V ISA 规范可开放实现，但具体芯片仍可能涉及第三方 IP、专利、软件和商标许可。

## RISC-V 的哲学

- RISC-V（读作 “risk five”）于 2010 年诞生于加州大学伯克利分校，是一套简洁、现代的 RISC 指令集架构。其关键原则如下：

    - **开放标准**：ISA（指令集架构）规范可免费获取。你可以基于它构建 RISC-V CPU，无需为 ISA 签署许可费协议或保密协议。它类似操作系统领域的 Linux：任何人都可以使用规范并在其上构建实现。

    - **模块化设计**：基础 ISA（RV32I 或 RV64I）非常精简，原文概括为仅 47 条指令。其余能力通过可选**扩展**加入：M（乘法/除法）、A（原子操作）、F/D（浮点）、C（压缩指令）和 V（向量处理）。实现者只选择所需扩展，从而保持芯片小巧高效。

> **编者注**：“47 条指令”是对基础整数 ISA 的简化计数，具体数量会受规范版本以及是否把编码变体、伪指令计入等口径影响。

    - **没有历史包袱**：x86 背负 45 年的向后兼容性，ARM 也有 35 年。RISC-V 从零开始，吸收了两者积累的经验，不含那些仅为兼容 20 世纪 80 年代软件而保留的晦涩指令。

- **谁在使用 RISC-V**：SiFive（通用核心）、阿里巴巴（玄铁服务器核心）、Western Digital（存储控制器，出货数十亿颗）、Espressif（ESP32-C3，常见物联网芯片），以及数十家把 RISC-V 用作控制处理器、管理定制计算单元的 AI 加速器初创公司。

## RISC-V 基础架构

- RV64I（64 位）的基础整数指令集 (ISA) 有：
    - **32 个通用寄存器** (x0-x31，每个 64 位)。 x0 被硬写为零 (对于实现常见的模式，无需特殊指令非常有用)。
    - **固定 32 位指令宽度** (通过 C 扩展添加 16 位压缩指令以提高代码密度)。
    - **Load-Store 架构**：就像 ARM 一样，算术运算只在寄存器上进行。内存访问通过显式 Load/Store 指令完成。

```
# RISC-V assembly (for flavour — you will use C/C++)
add  x3, x1, x2      # x3 = x1 + x2
lw   x4, 0(x5)       # load word from address in x5
sw   x4, 8(x5)       # store word to address x5 + 8
beq  x1, x2, label   # branch if x1 == x2
```

- ISA 的简洁性让 RISC-V 核心小巧而节能。最小的 RV32I 核心可用约 10,000 个逻辑门实现（ARM Cortex-M0 约为 12,000 个）。这对嵌入式系统很重要，因为每一毫瓦功耗和每一平方毫米硅面积都很宝贵。

## V 扩展：RISC-V 向量处理

- **V 扩展**（RVV）为 RISC-V 增加了类似 ARM SVE 的可伸缩向量处理能力。向量寄存器长度（VLEN）由硬件指定，可为 128 至 65,536 位。代码按**向量长度无关**方式编写，无需重新编译即可适配任意 VLEN。

```c
#include <riscv_vector.h>

// Vector addition using RVV intrinsics
void vadd_rvv(const float* a, const float* b, float* c, int n) {
    while (n > 0) {
        // vsetvl: set vector length — processes min(n, hardware_max) elements
        size_t vl = __riscv_vsetvl_e32m1(n);

        // Load vl elements
        vfloat32m1_t va = __riscv_vle32_v_f32m1(a, vl);
        vfloat32m1_t vb = __riscv_vle32_v_f32m1(b, vl);

        // Add
        vfloat32m1_t vc = __riscv_vfadd_vv_f32m1(va, vb, vl);

        // Store
        __riscv_vse32_v_f32m1(c, vc, vl);

        // Advance pointers
        a += vl; b += vl; c += vl; n -= vl;
    }
}
```

- **`vsetvl`** 是关键指令。它告诉硬件“我希望处理这么多元素”，硬件返回本轮实际能处理的数量（受 VLEN 等约束）。循环会自动适配不同向量宽度，无需额外的标量收尾循环；最后一次迭代只处理剩余元素。

- **LMUL** (长度乘法器)：RVV 可以将多个向量寄存器组合起来 (m1, m2, m4, m8) 以处理更多元素，同时减少可用寄存器数。`m1` 使用一个寄存器/向量操作数；`m8` 使用八个，处理 8 倍更多的元素，但仅剩 4 个寄存器组可用。

- 与 x86 AVX (固定 256/512 位) 和 ARM NEON (固定 128 位) 相比，RVV 的可扩展性是关键优势：相同的代码可以在小型嵌入式核心 (VLEN=128) 和高性能服务器核心 (VLEN=1024+) 上运行。

## 嵌入式机器学习：TinyML

- **TinyML** 是运行在微控制器上的机器学习——这类设备只有千字节级 RAM、兆赫级 CPU 和毫瓦级功耗预算。例如，检测唤醒词（“嘿 Siri”）的传感器、识别手势的加速度计或人数统计摄像头，都可以在一颗价格低至 0.50 美元且没有互联网连接的芯片上运行。

- 制约条件非常极端：

| 资源 | 服务器 GPU | 智能手机 | 微控制器 |
|---|---|---|---|
| RAM | 80 GB | 6 GB | 256 KB |
| 存储 | TB | 128 GB | 1 MB |
| 计算能力 | 1000 TFLOPS | 10 TFLOPS | 0.001 TFLOPS |
| 电力 | 700 W | 5 W | 0.001 W |
| 成本 | $30,000 | $500 | $1 |

- 一个可以在服务器 GPU 上运行的模型 ($O(10^{10})$ 个参数) 将无法在微控制器上运行。TinyML 模型拥有 $O(10^4)$–$O(10^6)$ 个参数，并使用 INT8 甚至 INT4 量化。

### TensorFlow Lite Micro (TFLM)

- **TFLM** 是 Google 面向微控制器的推理框架。它可以在没有动态内存分配和操作系统的环境中运行量化 TensorFlow Lite 模型，原文给出的二进制体积约为 20 KB。

```cpp
// TinyML inference on a microcontroller (simplified)
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "tensorflow/lite/micro/micro_mutable_op_resolver.h"

// Model is compiled into a C array (const unsigned char model_data[])
const tflite::Model* model = tflite::GetModel(model_data);

// Allocate a fixed memory arena (no malloc!)
constexpr int kArenaSize = 10 * 1024;  // 10 KB
uint8_t tensor_arena[kArenaSize];

// Set up interpreter
tflite::MicroInterpreter interpreter(model, resolver, tensor_arena, kArenaSize);
interpreter.AllocateTensors();

// Set input
float* input = interpreter.input(0)->data.f;
input[0] = sensor_reading;

// Run inference
interpreter.Invoke();

// Read output
float* output = interpreter.output(0)->data.f;
if (output[0] > 0.8f) {
    trigger_alert();
}
```

- **代码中的关键约束**:
    - `tensor_arena` 是静态分配的 — 没有 `malloc`，没有堆。嵌入式系统通常没有动态内存分配器。
    - 模型的存储在 flash memory (ROM) 中，而不是从文件系统中加载，是一个 `const` byte array。
    - 整个框架 + 模型 + 运行时总共只有几十 KB 大小。

### 边缘模型优化

- 要使模型能够在微控制器上运行，需要进行积极的优化：

    - **量化**（第 18 章）：把 float32 权重转换为 INT8（体积缩小 4 倍，在纯整数硬件上快 2–4 倍）。训练后量化较简单；量化感知训练通常能保留更高精度。

    - **剪枝**: 删除接近于零的权重。结构化剪枝 (删除整个通道/头) 比非结构化剪枝 (随机零) 更具硬件友好性，因为它可以减少实际计算，而不是仅仅存储。

    - **知识蒸馏** (第 6 章)：训练一个小型 "学生" 模型来模仿大型 "教师" 模型。学生比从头开始训练时具有更高的准确率，因为它从教师的软预测中学习。

    - **神经网络架构搜索 (NAS)**：自动搜索满足硬件预算 (延迟、内存、电力) 的有效架构。**MicroNets** 和 **MCUNet** 找到针对特定微控制器优化的架构。

    - **算子融合**：将卷积、批归一化和 ReLU 合并为一个融合操作，消除中间结果的内存写入。这与 GPU 内核融合原理相同，但在只有 256 KB RAM 时更加关键。

## RISC-V 在 AI 加速器中的应用

- 许多 AI 加速器初创公司使用 RISC-V，而不是直接运行机器学习模型，而是将其用作 **控制处理器**，管理自定义计算单元：

```
┌─────────────────────────────────────────┐
│              AI Accelerator             │
│                                         │
│  ┌──────────┐    ┌──────────────────┐   │
│  │  RISC-V  │───→│  Custom Matrix   │   │
│  │  Control │    │  Multiply Unit   │   │
│  │  Core    │    │  (systolic array,│   │
│  │          │    │  custom dataflow)│   │
│  └──────────┘    └──────────────────┘   │
│       │                    │            │
│       ▼                    ▼            │
│  ┌──────────┐    ┌──────────────────┐   │
│  │  Memory  │    │  On-chip SRAM    │   │
│  │  Control │    │  (activation     │   │
│  │          │    │   buffer)        │   │
│  └──────────┘    └──────────────────┘   │
└─────────────────────────────────────────┘
```

- RISC-V 内核负责处理：从外部内存加载模型权重、安排层级执行、管理计算单元间的数据流以及通过 PCIe、USB 或 SPI 与主机进行通信。 繁重的计算（例如矩阵乘法和卷积）由自定义硬件完成，而不是 RISC-V 内核。

- **为什么 RISC-V 用于控制**： 没有许可费用（对于初创公司来说至关重要）、可定制性强（可以添加特定领域指令）、足迹小（控制核心不需要 x86 的复杂性），以及开放生态系统使其能够快速原型设计。

- **示例**：Esperanto Technologies（使用 1000 多个 RISC-V 核心执行机器学习）、Tenstorrent（RISC-V 控制器 + 定制 Tensix 核心）、SiFive（带向量扩展的 RISC-V 核心，用于边缘机器学习）。

## 边缘部署约束

- 将机器学习部署到边缘（在设备上，而不是云端）时，会引入云端部署没有面临的约束：

- **功耗**：电池供电设备的总功耗预算可能只有 100 mW。若模型消耗 50 mW，传感器、无线电和显示器等其他系统便只剩 50 mW。功耗感知推理通过调度计算来避免热降频并延长电池续航时间。

- **延迟**: 边缘推理通常需要实时。一个唤醒词检测器 ("嘿 Siri") 必须在 ~200 ms 内响应。自动驾驶 Perception 系统（第 11 章）必须处理帧，使其在 ~30 ms 内完成。从云端往返的网络延迟 (50-200 ms) 对于这些用例来说太慢了。

- **隐私**：端侧处理可以让医学图像、录音、个人照片等敏感数据不离开设备。原文称这在某些司法辖区是法律要求（如 GDPR），并且在各地都关系到用户信任。

> **编者注**：GDPR 规定的是个人数据处理原则和合法性要求，并不普遍强制所有处理都在设备端完成；端侧处理只是减少数据外传和满足数据最小化等要求的一种技术方案。

- **连接性**: 边缘设备可能具有间歇性或无互联网连接。运行在火星车上的模型（第 11 章），潜艇，或农村农场传感器必须完全离线工作。

- **大规模成本**: 将机器学习部署到 10 亿部智能手机的成本为每台设备 0 美元 (硬件已经存在)。将部署到 10 亿个 IoT 传感器时，每个传感器的 ML 硬件预算只有几分钱。RISC-V 的零授权费用在规模化时非常重要。

## 编码任务 (使用 g++ 或 riscv64-gcc 交叉编译器进行编译)

1. 编写一个 C++ 程序，模拟 TinyML 推理流水线：静态分配模型缓冲区、运行模拟前向传播并测量资源使用量。这个练习用于理解无 `malloc`、固定内存区等嵌入式约束。
```cpp
// task1_tinyml_sim.cpp
// Compile: g++ -O2 -o task1 task1_tinyml_sim.cpp

#include <iostream>
#include <chrono>
#include <cmath>
#include <cstring>

// Simulate a microcontroller: fixed memory arena, no dynamic allocation
static constexpr int ARENA_SIZE = 32 * 1024;  // 32 KB total RAM budget
static uint8_t arena[ARENA_SIZE];

// Simple 2-layer MLP: 784 -> 64 -> 10 (MNIST-like, INT8 weights)
struct TinyModel {
    int8_t w1[784 * 64];      // layer 1 weights: 50,176 bytes
    int8_t b1[64];             // layer 1 biases
    int8_t w2[64 * 10];       // layer 2 weights: 640 bytes
    int8_t b2[10];             // layer 2 biases
    // Total: ~51 KB → must go in flash (ROM), not RAM
};

// Check if model fits in flash
void check_model_fit(int flash_kb) {
    int model_bytes = sizeof(TinyModel);
    std::cout << "Model size: " << model_bytes << " bytes ("
              << model_bytes / 1024 << " KB)\n";
    std::cout << "Flash: " << flash_kb << " KB → "
              << (model_bytes <= flash_kb * 1024 ? "FITS" : "TOO LARGE") << "\n";
}

// Mock inference using the fixed arena for activations
void mock_inference(const int8_t* input, int8_t* output) {
    // Activations go in the arena (RAM), not allocated dynamically
    int8_t* act1 = (int8_t*)arena;            // 64 bytes for layer 1 output
    int8_t* act2 = (int8_t*)(arena + 64);     // 10 bytes for layer 2 output

    // Layer 1: simplified matmul (not real quantised matmul, just structure demo)
    for (int j = 0; j < 64; j++) {
        int32_t sum = 0;  // accumulate in int32 to avoid overflow
        for (int i = 0; i < 784; i++) {
            sum += (int32_t)input[i] * 1;  // mock: weight = 1
        }
        act1[j] = (int8_t)std::max(-128, std::min(127, sum / 784));  // quantise back
        act1[j] = act1[j] > 0 ? act1[j] : 0;  // ReLU
    }

    // Layer 2
    for (int j = 0; j < 10; j++) {
        int32_t sum = 0;
        for (int i = 0; i < 64; i++) {
            sum += (int32_t)act1[i] * 1;
        }
        act2[j] = (int8_t)std::max(-128, std::min(127, sum / 64));
    }

    std::memcpy(output, act2, 10);
}

int main() {
    std::cout << "=== TinyML Resource Budget ===\n";
    std::cout << "Arena (RAM): " << ARENA_SIZE << " bytes ("
              << ARENA_SIZE / 1024 << " KB)\n";
    check_model_fit(256);  // typical MCU flash

    // Activation memory used
    int activation_bytes = 64 + 10;  // layer 1 + layer 2 outputs
    std::cout << "Activation memory: " << activation_bytes
              << " bytes / " << ARENA_SIZE << " available\n\n";

    // Benchmark inference
    int8_t input[784];
    int8_t output[10];
    std::memset(input, 1, 784);

    auto start = std::chrono::high_resolution_clock::now();
    for (int i = 0; i < 10000; i++) {
        mock_inference(input, output);
    }
    auto end = std::chrono::high_resolution_clock::now();
    double us = std::chrono::duration<double, std::micro>(end - start).count() / 10000;

    std::cout << "Inference latency: " << us << " us\n";
    std::cout << "At 160 MHz MCU (~6.25 ns/cycle): ~"
              << (int)(us * 160) << " cycles\n";

    std::cout << "Output logits: ";
    for (int i = 0; i < 10; i++) std::cout << (int)output[i] << " ";
    std::cout << "\n";

    return 0;
}
```

2.  编写一个 C++ 程序，将 float32 权重量化为 INT8 并测量压缩比和量化误差。
```cpp
// task2_quantise.cpp
// Compile: g++ -O3 -o task2 task2_quantise.cpp

#include <iostream>
#include <vector>
#include <cmath>
#include <algorithm>
#include <numeric>

// Symmetric quantisation: map float range [-max, +max] to [-127, +127]
void quantise_symmetric(const float* input, int8_t* output, int n, float& scale) {
    float max_val = 0.0f;
    for (int i = 0; i < n; i++) {
        max_val = std::max(max_val, std::abs(input[i]));
    }
    scale = max_val / 127.0f;
    for (int i = 0; i < n; i++) {
        float scaled = input[i] / scale;
        output[i] = (int8_t)std::max(-127.0f, std::min(127.0f, std::round(scaled)));
    }
}

// Dequantise: INT8 back to float
void dequantise(const int8_t* input, float* output, int n, float scale) {
    for (int i = 0; i < n; i++) {
        output[i] = (float)input[i] * scale;
    }
}

int main() {
    const int N = 100000;

    // Simulate random weights (roughly normal distribution)
    std::vector<float> weights(N);
    for (int i = 0; i < N; i++) {
        // Simple pseudo-random normal-ish values
        float u1 = (float)(i * 7 % 997 + 1) / 998.0f;
        float u2 = (float)(i * 13 % 991 + 1) / 992.0f;
        weights[i] = std::sqrt(-2.0f * std::log(u1)) * std::cos(6.2832f * u2) * 0.1f;
    }

    // Quantise
    std::vector<int8_t> quantised(N);
    float scale;
    quantise_symmetric(weights.data(), quantised.data(), N, scale);

    // Dequantise and measure error
    std::vector<float> reconstructed(N);
    dequantise(quantised.data(), reconstructed.data(), N, scale);

    float max_error = 0.0f, total_error = 0.0f;
    for (int i = 0; i < N; i++) {
        float err = std::abs(weights[i] - reconstructed[i]);
        max_error = std::max(max_error, err);
        total_error += err;
    }

    std::cout << "=== Quantisation Results ===\n";
    std::cout << "Original:    " << N * 4 << " bytes (float32)\n";
    std::cout << "Quantised:   " << N * 1 << " bytes (int8) + 4 bytes (scale)\n";
    std::cout << "Compression: " << 4.0f << "x\n";
    std::cout << "Scale factor: " << scale << "\n";
    std::cout << "Mean abs error: " << total_error / N << "\n";
    std::cout << "Max abs error:  " << max_error << "\n";
    std::cout << "Max abs error / scale: " << max_error / scale
              << " (should be <= 0.5 quantisation levels)\n";

    return 0;
}
```

3.  编写一个 C++ 程序，执行采用 INT32 累加的 INT8 矩阵乘法——这正是嵌入式机器学习加速器实际运行的计算。
```cpp
// task3_int8_matmul.cpp
// Compile: g++ -O3 -o task3 task3_int8_matmul.cpp

#include <iostream>
#include <chrono>
#include <vector>
#include <cstdint>

// INT8 matmul with INT32 accumulation (what Tensor Cores and MCU accelerators do)
void matmul_int8(const int8_t* A, const int8_t* B, int32_t* C,
                 int M, int N, int K) {
    for (int i = 0; i < M; i++) {
        for (int j = 0; j < N; j++) {
            int32_t sum = 0;
            for (int k = 0; k < K; k++) {
                sum += (int32_t)A[i * K + k] * (int32_t)B[k * N + j];
            }
            C[i * N + j] = sum;
        }
    }
}

// Float32 matmul for comparison
void matmul_f32(const float* A, const float* B, float* C,
                int M, int N, int K) {
    for (int i = 0; i < M; i++) {
        for (int j = 0; j < N; j++) {
            float sum = 0.0f;
            for (int k = 0; k < K; k++) {
                sum += A[i * K + k] * B[k * N + j];
            }
            C[i * N + j] = sum;
        }
    }
}

int main() {
    const int M = 128, N = 128, K = 128;

    std::vector<int8_t> A_i8(M * K, 1), B_i8(K * N, 1);
    std::vector<int32_t> C_i32(M * N);

    std::vector<float> A_f32(M * K, 1.0f), B_f32(K * N, 1.0f);
    std::vector<float> C_f32(M * N);

    // Benchmark INT8
    auto start = std::chrono::high_resolution_clock::now();
    for (int t = 0; t < 100; t++) {
        matmul_int8(A_i8.data(), B_i8.data(), C_i32.data(), M, N, K);
    }
    auto end = std::chrono::high_resolution_clock::now();
    double i8_ms = std::chrono::duration<double, std::milli>(end - start).count() / 100;

    // Benchmark FP32
    start = std::chrono::high_resolution_clock::now();
    for (int t = 0; t < 100; t++) {
        matmul_f32(A_f32.data(), B_f32.data(), C_f32.data(), M, N, K);
    }
    end = std::chrono::high_resolution_clock::now();
    double f32_ms = std::chrono::duration<double, std::milli>(end - start).count() / 100;

    double gflops_i8 = 2.0 * M * N * K / i8_ms / 1e6;
    double gflops_f32 = 2.0 * M * N * K / f32_ms / 1e6;

    std::cout << "INT8 matmul:  " << i8_ms << " ms (" << gflops_i8 << " GOPS)\n";
    std::cout << "FP32 matmul:  " << f32_ms << " ms (" << gflops_f32 << " GFLOPS)\n";
    std::cout << "INT8 speedup: " << f32_ms / i8_ms << "x\n";
    std::cout << "Memory: INT8 = " << M*K + K*N << " bytes vs FP32 = "
              << (M*K + K*N) * 4 << " bytes (4x less)\n";

    return 0;
}
```

