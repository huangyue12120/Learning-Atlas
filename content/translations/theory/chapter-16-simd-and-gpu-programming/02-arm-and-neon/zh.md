---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 16 - SIMD and GPU programming/02. ARM and NEON.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 0d0cc7ff4b022afab6811c775c25b3c3c85039ab93b979bd16bc14e35335b535
status: reviewed
---
# ARM 与 NEON

*ARM 处理器广泛用于手机、平板电脑、Apple 笔记本和数据中心服务器。本文介绍 ARM 架构、用 C++ 内在函数编写 NEON SIMD、用 SVE/SVE2 处理可伸缩向量，以及 Apple 芯片的特点，并通过内核示例展示这些技术。*

- 如果你使用 iPhone、MacBook 或 AWS Graviton 云实例，就会接触 ARM 处理器。ARM 常用于移动和嵌入式设备，也逐渐进入服务器与机器学习推理场景。掌握 ARM SIMD，有助于你为这些设备编写高效代码。

- **Cactus** 是移动设备和可穿戴设备上的低延迟 AI 引擎。它的仓库展示了生产环境中的 ARM SIMD 内核：[Cactus 项目仓库](https://github.com/cactus-compute/cactus)。Cactus 称其使用 ARM NEON 和神经处理器（NPU）加速的自定义内核处理注意力、KV 缓存量化和分块预填充，并以 Engine → Graph → Kernels 三层组织代码。仓库还声称其 ARM CPU 推理速度领先、内存占用比其他引擎低 10 倍；这些比较受设备、模型、配置和测试方法影响，应视为项目方的性能主张。

## ARM 架构基础

- ARM 属于**精简指令集计算机（RISC）**架构（第 13 章），具有以下特点：

    - **加载/存储架构**：算术指令通常在寄存器间运算，数据通过加载和存储指令访问内存。要把内存中的两个数相加，需要先加载到寄存器，再执行加法，最后写回结果。部分 x86 指令可以把内存操作数与寄存器一起使用；ARM 的加载/存储形式较简单，也便于实现规整流水线。两种架构在指令编码和执行方式上还有其他差异。

    - **定长指令**：AArch64 的常规指令固定为 32 位，译码边界清晰。x86-64 指令采用可变长度编码，通常为 1 至 15 字节。ARM 其他执行状态（例如 Thumb）使用不同的编码长度。

    - **通用寄存器**：AArch64 有 31 个 64 位通用寄存器 `x0`–`x30`。编码 `x31` 会依指令语境表示栈指针 `sp` 或零寄存器 `xzr`，不能把两者都算作额外的通用寄存器。x86-64 有 16 个架构通用寄存器。寄存器较多能让编译器减少部分内存访问，但实际速度仍取决于代码和寄存器分配。

    - **SIMD/浮点寄存器**：AArch64 提供 32 个 128 位向量寄存器 `v0`–`v31`，供 NEON 和浮点运算使用。

```cpp
// ARM assembly (just to see the flavour -- you will use intrinsics, not assembly)
// Add two registers
add x0, x1, x2    // x0 = x1 + x2

// Load from memory
ldr x0, [x1]      // x0 = *x1 (load 64 bits from address in x1)

// NEON: add four floats
fadd v0.4s, v1.4s, v2.4s  // v0 = v1 + v2 (four 32-bit floats)
```


- 通常不必手写汇编。你可以使用**内在函数（intrinsics）**：带有硬件运算语义的 C/C++ 接口。编译器会安排寄存器和指令；一个内在函数不一定固定对应一条机器指令，编译器也可能改写或合并运算。

## NEON：128 位 SIMD

- **NEON** 是 ARM 的 SIMD 扩展。每个 NEON 向量寄存器宽 128 位，可以容纳：

| 数据类型 | 每个寄存器中的元素数 | C/C++ 类型 |
| --- | ---: | --- |
| float32 | 4 | `float32x4_t` |
| float16 | 8 | `float16x8_t` |
| int32 | 4 | `int32x4_t` |
| int16 | 8 | `int16x8_t` |
| int8 | 16 | `int8x16_t` |

- float16 向量类型的可用性取决于处理器和编译目标提供的半精度运算扩展；类型声明本身不代表所有 ARM CPU 都支持相同运算。

- 128 位比 x86 AVX 的 256 位和 AVX-512 的 512 位窄；不同处理器的能效、频率和指令吞吐量也不同，不能只按寄存器宽度判断性能。

### NEON 内在函数入门

- NEON 内在函数常按 `v[操作][限定符]_[类型]` 命名。例如 `vaddq_f32` 表示对 128 位向量中的 float32 元素执行加法：`q` 表示 128 位向量，`f32` 表示元素类型。以下代码展示加载、存储、算术、比较、选择和归约操作：

```cpp
#include <arm_neon.h>

// Load 4 floats from memory into a NEON register
float32x4_t a = vld1q_f32(ptr);        // vld1q = vector load 1, q = 128-bit (quad)

// Store 4 floats from a NEON register to memory
vst1q_f32(out_ptr, a);                   // vst1q = vector store 1, q = 128-bit

// Arithmetic
float32x4_t c = vaddq_f32(a, b);        // c = a + b (4 floats)
float32x4_t d = vmulq_f32(a, b);        // d = a * b (4 floats)
float32x4_t e = vfmaq_f32(c, a, b);     // e = c + a * b (fused multiply-add, 4 floats)

// Comparison (returns a mask: all 1s if true, all 0s if false)
uint32x4_t mask = vcgtq_f32(a, b);      // mask[i] = (a[i] > b[i]) ? 0xFFFFFFFF : 0

// Select elements based on mask (like numpy.where)
float32x4_t result = vbslq_f32(mask, a, b);  // result[i] = mask[i] ? a[i] : b[i]

// Reduce: sum all 4 elements to a scalar
float total = vaddvq_f32(a);             // total = a[0] + a[1] + a[2] + a[3]
```


- **`vfmaq_f32`** 表示融合乘加（FMA），计算 $c = c + a \times b$。它把乘法和加法合并，并只舍入一次；分开执行乘法与加法通常会产生不同的舍入误差。点积、矩阵乘法和卷积都可以使用 FMA。

### 实例：用向量指令计算点积

- 点积是矩阵乘法中的内层运算。下面先给出标量 C++ 写法，再给出 NEON 写法：

```cpp
#include <arm_neon.h>

// Scalar dot product
float dot_scalar(const float* a, const float* b, int n) {
    float sum = 0.0f;
    for (int i = 0; i < n; i++) {
        sum += a[i] * b[i];
    }
    return sum;
}

// NEON-vectorised dot product
float dot_neon(const float* a, const float* b, int n) {
    float32x4_t sum_vec = vdupq_n_f32(0.0f);  // initialise 4 accumulators to 0

    int i = 0;
    for (; i + 4 <= n; i += 4) {
        float32x4_t va = vld1q_f32(a + i);     // load 4 elements from a
        float32x4_t vb = vld1q_f32(b + i);     // load 4 elements from b
        sum_vec = vfmaq_f32(sum_vec, va, vb);   // sum_vec += va * vb
    }

    // Reduce the 4 accumulators to a single scalar
    float sum = vaddvq_f32(sum_vec);

    // Handle remaining elements (if n is not a multiple of 4)
    for (; i < n; i++) {
        sum += a[i] * b[i];
    }

    return sum;
}
```


- **相关 C++ 概念**：
    - `const float*` 指向只读的浮点数据；`const` 禁止通过这个指针修改数据。
    - `a + i` 是指针运算，指向数组的第 $i$ 个元素，也就是 `&a[i]`。
    - 末尾的标量清理循环处理 $n$ 不是 4 的倍数时剩下的元素。这是 SIMD 代码的常见写法：先用向量指令处理主体，再逐个处理尾数。

- `sum_vec` 是一个含 4 个 float32 通道的向量累加器，每个通道会累加对应位置的一组乘积。每轮循环仍需等待上一轮更新的 `sum_vec`，因此向量通道本身不等于 4 个互不依赖的向量累加器。若要进一步隐藏 FMA 延迟，可使用多个向量累加器，最后再归约。

- FMA 和不同的求和顺序可能产生与标量代码略有差异的浮点结果。比较两种实现时应使用容差，不能要求逐位相等。

### 实例：用 NEON 计算 ReLU

```cpp
#include <arm_neon.h>

void relu_neon(const float* input, float* output, int n) {
    float32x4_t zero = vdupq_n_f32(0.0f);

    int i = 0;
    for (; i + 4 <= n; i += 4) {
        float32x4_t x = vld1q_f32(input + i);
        float32x4_t result = vmaxq_f32(x, zero);  // max(x, 0) = ReLU
        vst1q_f32(output + i, result);
    }

    // Scalar cleanup
    for (; i < n; i++) {
        output[i] = input[i] > 0 ? input[i] : 0;
    }
}
```


- `vmaxq_f32` 对两个向量逐元素取最大值，其中一个向量全为零时，有限实数输入会得到 ReLU 结果。向量化实现使用最大值指令，无需逐元素分支；遇到 NaN 时，向量指令与标量 `>` 比较的行为可能不同。

## I8MM：整数矩阵乘法

- **I8MM** 是 ARMv8.6-A 引入的整数矩阵乘法扩展，提供 INT8 输入、INT32 累加的专用指令，适用于部分量化推理工作负载。处理器是否支持该扩展仍要按具体型号检查。

- 关键指令 **`SMMLA`**（有符号矩阵乘加）把 $2 \times 8$ 的 INT8 矩阵与 $8 \times 2$ 的 INT8 矩阵相乘，并累加到 $2 \times 2$ 的 INT32 结果块中：

```cpp
#include <arm_neon.h>

// I8MM: multiply two 8-element INT8 vectors, accumulate into 4 INT32 results
// This computes a 2x2 tile of the output matrix from 2x8 x 8x2 input tiles
void matmul_i8mm_tile(const int8_t* A, const int8_t* B, int32_t* C) {
    // Load 8 bytes from A (2 rows of 4 elements, packed)
    int8x16_t va = vld1q_s8(A);   // 16 bytes = 2 rows × 8 elements
    int8x16_t vb = vld1q_s8(B);   // 16 bytes = 2 rows × 8 elements

    // Load existing accumulator (2x2 = 4 int32 values)
    int32x4_t acc = vld1q_s32(C);

    // I8MM instruction: acc += A_tile × B_tile^T
    // Computes 2×2 output from 2×8 × 8×2 inputs
    acc = vmmlaq_s32(acc, va, vb);  // THE I8MM instruction

    vst1q_s32(C, acc);
}
```


- 上例假设输入按指令要求打包，并已在 `C` 中放好累加器。代码各自加载 16 字节；注释中的“8 个元素”指矩阵每行的长度。I8MM 不只是计算一个长度为 8 的点积，而是计算四个长度为 8 的点积，生成一个 $2 \times 2$ 输出块。

- 如果没有 I8MM，NEON 通常要先扩宽 INT8 乘法结果，再做成对累加；I8MM 可以用专用矩阵指令处理一组输出。原文给出的 4 到 8 倍提速受处理器、矩阵布局、量化和内存访问影响，不是通用保证。

- 原文列出 Apple M1 及更新型号、部分 ARM Cortex 核心和 AWS Graviton3 作为支持例子。具体支持情况取决于处理器实现和软件目标；`__ARM_FEATURE_MATMUL_INT8` 是编译时目标特性宏，不能单独证明通用二进制运行时所在 CPU 一定支持 I8MM。

- 第 17 章介绍的 INT8 量化模型可在 Graviton 或 Apple Silicon 上使用 I8MM，前提是硬件与软件都支持。ONNX Runtime、llama.cpp 等项目会按构建选项和设备特性选择优化内核，并非所有版本和安装都能自动使用它。

## SME 与 SME2：可伸缩矩阵扩展

- **SME**（Scalable Matrix Extension，可伸缩矩阵扩展）让 ARM 处理器执行二维矩阵运算。它与 Intel AMX、NVIDIA Tensor Cores 都面向矩阵计算，但指令集、编程模型和硬件结构并不相同。**SME2** 增加了更多运算能力。

- SME 提供 **ZA 矩阵寄存器**，可在硬件中累积二维矩阵。矩阵维度由流式向量长度（SVL）和元素类型决定。与一维向量式的 NEON、SVE 不同，SME 的运算可直接更新二维数据块。

- SME 使用两种执行模式：
    - **普通模式**：执行常规 ARM 指令；NEON 和 SVE 可按各自规则运行。
    - **流式 SVE 模式**：通过 `smstart` 等机制进入，可执行 SME 指令。该模式下的向量长度可能不同于普通 SVE 模式。

```cpp
#include <arm_sme.h>

// SME2: outer product accumulation for matrix multiply
// Accumulates A_col × B_row into the ZA tile register
void sme2_matmul_outer(const float* A_col, const float* B_row, int K) {
    // Enter streaming mode
    // smstart;  // (done via compiler intrinsic or inline asm)

    // Zero the ZA tile accumulator
    svzero_za();

    for (int k = 0; k < K; k++) {
        // Load a column of A and a row of B into SVE registers
        svfloat32_t a = svld1_f32(svptrue_b32(), &A_col[k * SVL]);
        svfloat32_t b = svld1_f32(svptrue_b32(), &B_row[k * SVL]);

        // Outer product: ZA += a × b^T
        // This accumulates an SVL×SVL tile in one instruction
        svmopa_za32_f32_m(0, svptrue_b32(), svptrue_b32(), a, b);
    }

    // Store the ZA tile to memory
    // svst1_za(...);

    // Exit streaming mode
    // smstop;
}
```


- 这段代码仅作示意：`smstart`、`smstop` 和 ZA 存储都留作注释，`SVL` 也只是占位符；代码不能直接编译运行。实际内核还需按目标工具链管理流式模式、向量长度和 ZA tile。

- **关键概念**：
    - **`svmopa`**（向量外积累加）把两个向量的外积累加到 ZA 矩阵寄存器。若 SVL 为 512 位，单精度向量含 16 个元素，外积会更新一个 $16 \times 16$ 数据块，即 256 个乘加结果。它仍是一条架构指令，执行延迟和吞吐量取决于硬件。
    - **ZA 矩阵寄存器**可在流式模式的多条指令间保留累加结果。内核可在多轮 $K$ 迭代中累加外积，组成矩阵乘法的数据块。
    - **流式模式**会带来进入和退出开销，持续的大型矩阵计算更容易摊薄这项开销。

- SME2 增加多向量运算，可同时处理 2 个或 4 个 SVE 向量，还扩展了矩阵块操作，并加强与普通模式的配合。

- SME 只在部分处理器上提供。原文列出 ARM Neoverse V2（AWS Graviton4）和部分后续移动芯片，并称截至 2026 年 Apple Silicon 尚不支持。应按目标处理器的特性表和编译器支持确认，不能只依据产品系列推断。多数机器学习框架当时尚未提供 SME 优化内核。

- 可以把 NEON、I8MM、SVE 和 SME 看作从固定宽度向量、整数矩阵块、可伸缩向量到二维矩阵块的不同编程工具；这不是所有 ARM 芯片都按顺序支持的硬件代际。

## SVE 与 SVE2：可伸缩向量扩展

- NEON 的向量宽度固定为 128 位。**SVE**（Scalable Vector Extension，可伸缩向量扩展）支持**向量长度无关（VLA）**编程：代码可以在不同向量宽度的处理器上运行，由硬件提供当前向量长度。架构支持的长度为 128 到 2048 位，具体芯片会实现其中一种长度。

```cpp
#include <arm_sve.h>

void add_sve(const float* a, const float* b, float* c, int n) {
    int i = 0;
    svbool_t pred = svwhilelt_b32(i, n);  // predicate: which lanes are active

    while (svptest_any(svptrue_b32(), pred)) {
        svfloat32_t va = svld1(pred, a + i);
        svfloat32_t vb = svld1(pred, b + i);
        svst1(pred, c + i, svadd_x(pred, va, vb));

        i += svcntw();  // advance by the hardware vector width (in 32-bit elements)
        pred = svwhilelt_b32(i, n);
    }
}
```


- **谓词寄存器**（`svbool_t`）可屏蔽不参与运算的通道，处理数组尾部，无需另写标量清理循环。`svwhilelt_b32(i, n)` 会激活当前向量组中索引小于 $n$ 的通道；通道数最多为当前向量宽度。

- **`svcntw()`**返回当前向量寄存器可容纳的 32 位元素数。例如，256 位 SVE 返回 8，512 位 SVE 返回 16。循环据此调整步长。

- SVE 可见于 ARM Neoverse V1/V2、AWS Graviton3/4 和部分服务器芯片；Apple Silicon 不提供 SVE。选用前仍要检查目标 CPU、操作系统和工具链支持。

## Apple 芯片的特点

- Apple M 系列（M1、M2、M3、M4）基于 ARM，并采用 Apple 自行设计的微架构：

- **性能核与能效核**：不同代际使用不同核心代号，例如 Firestorm/Avalanche 等性能核，以及 Icestorm/Blizzard 等能效核。操作系统调度器会按负载和系统策略分配线程，并不保证每个任务都固定落在某一种核心上。

- **AMX**（Apple Matrix eXtensions）是独立于 NEON 的矩阵计算单元。Apple 没有公开其指令集；部分 Accelerate BLAS 运算会使用 AMX。`np.dot` 是否经 Accelerate 执行，取决于 NumPy 的安装和构建方式。公开接口没有直接调用 AMX 的标准方法。

- **统一内存**让 CPU 和 GPU 共享物理内存，能减少许多显式的数据复制。采用独立显存的系统通常要经 PCIe 等互连传数据，链路带宽随代际和配置而变；Apple 芯片也仍受共享带宽、同步和数据布局影响，不能说完全没有数据传输瓶颈。

- **Neural Engine** 是专用机器学习加速器。核心数量和 INT8 峰值每秒万亿次运算（TOPS）随芯片代际而变；原文所列的 16 核、约 30 TOPS 不能套用到所有 M 系列。Core ML 可把受支持的模型运算交给 Neural Engine 执行。

- 在 Apple 芯片上，**MLX** 针对统一内存设计。PyTorch 也提供基于 Metal Performance Shaders（MPS）的后端；运算覆盖范围、性能和行为会随 PyTorch 版本而变，不能把“比 CUDA 不成熟”视作固定结论。

## 自动向量化

- 手写 SIMD 内在函数较繁琐。编译器能否替你向量化循环？

- GCC 和 Clang 都能自动向量化不少简单循环，但结果受代码结构、编译器和目标 CPU 影响：

```cpp
// The compiler CAN auto-vectorise this (with -O3 -march=native)
void add_auto(const float* a, const float* b, float* c, int n) {
    for (int i = 0; i < n; i++) {
        c[i] = a[i] + b[i];
    }
}
```


- **有助于自动向量化的写法**：
    - 循环结构简单，迭代次数可分析。
    - 迭代之间没有数据依赖，例如 `c[i]` 不依赖 `c[i-1]`。
    - 连续访问内存，避免不必要的散布/收集访问。
    - 使用 `const` 表明通过指针只读；使用 `__restrict__` 告知编译器指针指向互不重叠的区域。`const` 本身不表示无别名。`__restrict__` 是编译器扩展，不属于标准 C++，并且调用方必须保证内存确实不重叠。

```cpp
// restrict tells the compiler: a, b, c point to non-overlapping memory
void add_restrict(const float* __restrict__ a,
                  const float* __restrict__ b,
                  float* __restrict__ c, int n) {
    for (int i = 0; i < n; i++) {
        c[i] = a[i] + b[i];
    }
}
```


- 没有 `restrict` 时，编译器可能保守地认为 `a`、`b` 和 `c` 会指向重叠内存；写入 `c[i]` 可能改变稍后读取的 `a[i+1]`。编译器有时可以通过静态分析或运行时检查证明访问安全，因此缺少 `restrict` 不一定会阻止向量化。

- **可能阻碍自动向量化的代码结构**：
    - 迭代间存在依赖，例如 `a[i] = a[i-1] + b[i]`。
    - 循环内有复杂分支，且编译器无法把分支转换为谓词运算。
    - 循环中有未内联的函数调用。
    - 编译器无法证明指针之间没有别名。

- **查看自动向量化结果**：用编译器选项生成优化报告：

```bash
# GCC: show vectorisation decisions
g++ -O3 -march=native -fopt-info-vec-optimized code.cpp

# Clang: show vectorisation report
clang++ -O3 -march=native -Rpass=loop-vectorize code.cpp
```


- 先写清晰的 C++ 并开启优化，再查看报告和实际性能。确认编译器没有向量化关键循环、而且性能分析表明确有需要时，再为热点内层循环编写内在函数。手写 SIMD 会增加可读性和维护成本，也不保证提速。

## 编程练习（在 ARM 设备上使用 g++ 或 clang++ 编译）

1. 分别编写标量点积和 NEON 向量化点积，测量速度差异。

```cpp
// task1_neon_dot.cpp
// Compile (Mac/ARM Linux): clang++ -O3 -o task1 task1_neon_dot.cpp
// Note: NEON is enabled by default on AArch64, no special flags needed

#include <iostream>
#include <chrono>
#include <vector>
#include <arm_neon.h>

float dot_scalar(const float* a, const float* b, int n) {
    float sum = 0.0f;
    for (int i = 0; i < n; i++) {
        sum += a[i] * b[i];
    }
    return sum;
}

float dot_neon(const float* a, const float* b, int n) {
    float32x4_t sum_vec = vdupq_n_f32(0.0f);
    int i = 0;
    for (; i + 4 <= n; i += 4) {
        float32x4_t va = vld1q_f32(a + i);
        float32x4_t vb = vld1q_f32(b + i);
        sum_vec = vfmaq_f32(sum_vec, va, vb);
    }
    float sum = vaddvq_f32(sum_vec);
    for (; i < n; i++) sum += a[i] * b[i];
    return sum;
}

int main() {
    const int N = 10'000'000;
    std::vector<float> a(N, 1.0f), b(N, 2.0f);

    // Warm up
    volatile float s1 = dot_scalar(a.data(), b.data(), N);
    volatile float s2 = dot_neon(a.data(), b.data(), N);

    // Benchmark scalar
    auto start = std::chrono::high_resolution_clock::now();
    for (int t = 0; t < 100; t++) {
        s1 = dot_scalar(a.data(), b.data(), N);
    }
    auto end = std::chrono::high_resolution_clock::now();
    double scalar_ms = std::chrono::duration<double, std::milli>(end - start).count() / 100;

    // Benchmark NEON
    start = std::chrono::high_resolution_clock::now();
    for (int t = 0; t < 100; t++) {
        s2 = dot_neon(a.data(), b.data(), N);
    }
    end = std::chrono::high_resolution_clock::now();
    double neon_ms = std::chrono::duration<double, std::milli>(end - start).count() / 100;

    std::cout << "Scalar: " << scalar_ms << " ms (result: " << s1 << ")\n";
    std::cout << "NEON:   " << neon_ms << " ms (result: " << s2 << ")\n";
    std::cout << "Speedup: " << scalar_ms / neon_ms << "x\n";
    return 0;
}
```


- 标量版也可能被 `-O3` 自动向量化，因此这段代码比较的是编译后的标量写法与手写 NEON，不一定是“纯标量对 SIMD”。要区分两者，应查看编译器报告或单独控制自动向量化。FMA 和归约顺序也会让结果出现小幅浮点误差；两种计时都还受缓存、动态调频和高精度时钟实现影响。

2. 用 NEON 实现 ReLU 和 Softmax 前的最大值查找，练习加载、计算、存储这三个步骤。

```cpp
// task2_neon_ops.cpp
// Compile: clang++ -O3 -o task2 task2_neon_ops.cpp

#include <iostream>
#include <vector>
#include <cmath>
#include <arm_neon.h>

void relu_neon(const float* in, float* out, int n) {
    float32x4_t zero = vdupq_n_f32(0.0f);
    int i = 0;
    for (; i + 4 <= n; i += 4) {
        float32x4_t x = vld1q_f32(in + i);
        vst1q_f32(out + i, vmaxq_f32(x, zero));
    }
    for (; i < n; i++) out[i] = in[i] > 0 ? in[i] : 0;
}

float max_neon(const float* data, int n) {
    float32x4_t max_vec = vdupq_n_f32(-INFINITY);
    int i = 0;
    for (; i + 4 <= n; i += 4) {
        max_vec = vmaxq_f32(max_vec, vld1q_f32(data + i));
    }
    float result = vmaxvq_f32(max_vec);
    for (; i < n; i++) result = result > data[i] ? result : data[i];
    return result;
}

int main() {
    std::vector<float> data = {-3, 1, -1, 4, 2, -5, 0, 7, -2, 3};
    std::vector<float> out(data.size());

    relu_neon(data.data(), out.data(), data.size());
    std::cout << "ReLU: ";
    for (float x : out) std::cout << x << " ";
    std::cout << "\n";

    float mx = max_neon(data.data(), data.size());
    std::cout << "Max: " << mx << " (expected: 7)\n";
    return 0;
}
```


- 示例中的最大值函数假定数组非空。若处理 NaN、空数组或要求与标量代码严格一致，还需明确这些输入的语义，因为 NEON 最大值指令和标量比较的 NaN 行为可能不同。

3. 比较编译器自动向量化代码与手写 NEON 内在函数。使用 `-fopt-info-vec`（GCC）或 `-Rpass=loop-vectorize`（Clang）查看编译器做了什么。

```cpp
// task3_auto_vs_manual.cpp
// Compile: clang++ -O3 -Rpass=loop-vectorize -o task3 task3_auto_vs_manual.cpp
//    (or): g++ -O3 -fopt-info-vec-optimized -o task3 task3_auto_vs_manual.cpp

#include <iostream>
#include <chrono>
#include <vector>
#include <arm_neon.h>

// Let the compiler auto-vectorise
void add_auto(const float* __restrict__ a, const float* __restrict__ b,
              float* __restrict__ c, int n) {
    for (int i = 0; i < n; i++) {
        c[i] = a[i] + b[i];
    }
}

// Hand-written NEON
void add_neon(const float* a, const float* b, float* c, int n) {
    int i = 0;
    for (; i + 4 <= n; i += 4) {
        vst1q_f32(c + i, vaddq_f32(vld1q_f32(a + i), vld1q_f32(b + i)));
    }
    for (; i < n; i++) c[i] = a[i] + b[i];
}

int main() {
    const int N = 10'000'000;
    std::vector<float> a(N, 1.0f), b(N, 2.0f), c(N);

    auto bench = [&](auto fn, const char* name) {
        fn(a.data(), b.data(), c.data(), N);  // warm up
        auto start = std::chrono::high_resolution_clock::now();
        for (int t = 0; t < 100; t++) fn(a.data(), b.data(), c.data(), N);
        auto end = std::chrono::high_resolution_clock::now();
        double ms = std::chrono::duration<double, std::milli>(end - start).count() / 100;
        std::cout << name << ": " << ms << " ms\n";
    };

    bench(add_auto, "Auto-vectorised");
    bench(add_neon, "Hand-written NEON");
    // They should be very close — the compiler auto-vectorises this simple loop well
    return 0;
}
```


- 这个基准反复写入 `c`，却没有在计时后读取结果。若编译器能内联函数并证明结果未被使用，就可能删掉部分工作；应在计时区间外校验或消费输出，确认被测运算仍然存在。`std::chrono::high_resolution_clock` 也不保证所有平台都提供单调时钟，严谨比较应使用合适的单调计时器并重复多轮。
