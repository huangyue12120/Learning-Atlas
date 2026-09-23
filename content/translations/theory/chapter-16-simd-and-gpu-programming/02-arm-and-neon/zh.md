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

*ARM 与 NEON 为移动端、边缘设备和 Apple Silicon 提供能效优先的向量计算。本篇介绍 NEON、I8MM、SME、SVE、自动向量化及实用的向量化示例。*



*ARM处理器为每个智能手机提供动力,大多数平板电脑,苹果的笔记本电脑,以及越来越多的数据中心服务器. 此文件涵盖ARM架构,带有C++内在的NEON SIMD编程,用于可伸缩向量处理的SVE/SVE2,苹果硅特异性,以及实用向量化内核实例*.

- 如果您拥有iPhone, macBook, 或者使用 AWS Graviton 实例, 您正在运行 ARM。ARM的功率效率使它在移动和嵌入中占据了主导地位,在服务器和ML推论中也越来越具有竞争力. 理解ARM SIMD可以让你写出在大多数人实际使用的硬件上运行快的代码.

- 关于ARM SIMD内核生产中的一个现实世界的例子,见**Cactus **，用于移动设备和可穿戴的低纬度AI引擎:[github.com/cactus-compute/cactus (中文(简体)).](https://github.com/cactus-compute/cactus)。。。Cactus执行自定义的ARM NON和NPU加速内核以引起注意,KV-cache分解并进行分块预填,实现对ARM CPU的推论最快,内存比其他引擎低10x. 它的三层架构(Engine → Graph → Kernels)是一个具体的例子,说明这个文件中的SIMD概念是如何用来构建生产ML基础设施的.

## ARM 架构基础



- ARM是一个**RISC**(减少指令集计算机)架构(第13章). 主要特点:

    - ** Load-store 架构**:算术指令只在注册处操作,从未直接在内存上操作. 要从内存中添加两个数字,必须:(1) 把它们装入登记册;(2) 添加登记册;(3) 将结果存储回内存. 这比x86简单(它可以在一个指令中添加一个寄存器和内存位置),但可以更清洁地进行管线化.

    - ** Fixed-width 指令**:每个ARMv8(AArch64)指令完全为32位. 这使得解码速度快而可预见(与x86的可变长指令不同,可作1-15字节).

    - **32 通用登记**(x0-x30,每64位)加上堆放指针(sp)和零登记器(xzr)。相较于x86的16个通用注册. 更多收件员=更少的内存访问量=更快代码.

    - **32 SIMD/浮点登记册**(v0-v31,每128位)用于近地天体和浮点作业。

```cpp
// ARM assembly (just to see the flavour -- you will use intrinsics, not assembly)
// Add two registers
add x0, x1, x2    // x0 = x1 + x2

// Load from memory
ldr x0, [x1]      // x0 = *x1 (load 64 bits from address in x1)

// NEON: add four floats
fadd v0.4s, v1.4s, v2.4s  // v0 = v1 + v2 (four 32-bit floats)
```

- 你不能写集合。您将使用 **intrinsics **: C/C++ 函数将 1:1 映射到特定指令。编译器处理寄存器分配,调度等低级细节.

## NEON：128 位 SIMD



- **NEON** 是 ARM 的 SIMD 扩展。每个 NEON 寄存器宽 128 位，可以容纳：

|Data type|Elements per register|Notation|
|-----------|-----------------------|----------|
|float32| 4 |`float32x4_t`|
|float16| 8 |`float16x8_t`|
|int32| 4 |`int32x4_t`|
|int16| 8 |`int16x8_t`|
|int8| 16 |`int8x16_t`|

- 128位比x86的AVX(256-bit)或AVX-512(512-bit)更窄. 但ARM以出色的功率效率和广泛的可用性来补偿.

### NEON intrinsic 基础



- NEON intrinsic 遵循命名约定：`v[operation][qualifier]_[type]`

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

- **`vfmaq_f32`** (fused m乘-add)是ML最重要的SIMD指令. 它计算$c = c + a \times b$在一个指令中,有一个四舍五入的步数(比单独的乘数更准确然后添加)。点产品,矩阵相乘,和相接由FMA所建.

### 实践示例：向量化点积



- 点产物是矩阵乘法的内环. 让我们用 C++ 来写,然后用 NEON 来向导它。

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

- ** C++关键概念**:
    - `const float*`: 指向只读浮点数据.`const`我们承诺不会通过这个指针修改数据
    - `a + i`:指针算术.`a + i`指向$i$- 数组的第1个元素(与`&a[i]`).
    - 尾端的"清理循环"处理案件$n$4的倍数。这是SIMD代码中的通用模式:用向量块处理散装,再用scalar代码处理所剩部分.

- ** 为什么4个累积器在`sum_vec`**:我们使用4个独立的积分器(每个SIMD道1个),而不是一个单平面积分器. 这避免了数据依赖性:每个迭代的FMA依赖于`sum_vec`,但是有了4个独立车道,CPU可以管道FMA. 最后,我们把4个部分金额减少到1个。

### 实践示例：向量化 ReLU



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

- `vmaxq_f32`计算两个向量的元素最大值。由于一个向量都是零,这恰恰是ReLU. 无分行相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相取相出相相取相取相

## I8MM：整数矩阵乘法



- **I8MM**(Int8 Matrix multiply)是一个ARMv8.6扩展,它用INT32累积法添加了INT8矩阵乘法的专用指令，，确切的量化了ML推论的需要.

- 关键指示是**`SMMLA`** (已签名的矩阵多相积分):它需要两个8×2个区块的INT8值并累积结果为INT32的2×2个区块:

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

- **I8MM 为什么重要**：没有 I8MM，NEON 上的 INT8 矩阵乘法需要先扩展乘法（`vmull`），再做成对求和，每个输出元素需要多条指令。有了 I8MM，硬件可以用一条指令完成 8 元素点积（$2\times8\times8\times2=2\times2$）。对于 INT8 推理工作负载，它比普通 NEON 快 4–8 倍。

- **可活性**:苹果M1+(全为苹果硅),ARM Cortex-A510/A710/X2+(ARMv9),AWS Graviton3+. 检查`#ifdef __ARM_FEATURE_MATMUL_INT8`.

- ML推论: INT8被量化的模型(第18章)运行在ARM服务器上(Graviton)或苹果硅从I8MM中获得了巨大的利益. 如ONNX跑道时间和lama.cpp等框架在跑道时间检测到I8MM,并自动使用优化内核.

## SME 与 SME2：可扩展矩阵扩展



- **SME**(可缩放矩阵扩展)是ARM对Intel AMX和NVIDIA Tensor Cores的回答:用于矩阵操作的专用硬件. SME2 (ARMv9.2) 进一步扩展.

- SME引入了**ZA平板登记器**:储存在硬件中的2D矩阵,最高可达SVL×SVL字节(其中SVL为流向量长度,一般为每维128-512位). 与NEON(1D向量)甚至SVE(1D可伸缩向量)不同,中小企业在**2D平板上作业**。

- 编程模式有两个模式:
    - ** 正常模式**:标准ARM执行(NEON,SVE照常工作).
    - ** SVE 模式**:通过`smstart`,使中小企业能够发出指示。SVE指令也在这个模式下工作,但可能使用不同的寄存宽.

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

- ** 关键概念**:
    - **`svmopa`** (产出累积):中小企业核心指导。它计算出两个向量的完全外出产物并被积累入ZA瓷砖. 对于SVL=512位(16个浮点),这是一款16×16外出产品，，一指令中256个FMA操作.
    - **ZA平瓦**:在流线模式下具有持久性。将多块外出产物(每克迭代一块)堆积成同一块瓷砖,形成完整的矩阵相乘瓦.
    - ** Streaming mode**:中小企业指令只在流出模式下工作. 进入/出海流模式的间接费用意味着中小企业最适于持续的矩阵计算,而不是短时间的暴发。

- **SME2加法**:多向量操作(进程2或4 SVE向量同时进行),多向量操作,多向量操作,并改进了与正态模式的结合.

- ** 可用性**:ARM Neoverse V2(AWS Graviton4),一些即将到来的移动芯片. 尚未在苹果硅上(截至2026年). 中小企业仍处于早期阶段,大多数多边交易框架还没有实现中小企业最佳内核。

- ** 进展**:近地天体N(128位向量,元素)-I8MM(INT8矩阵瓦)-SVE(可伸缩向量)-中小企业(可伸缩的2D矩阵瓦)。每一代在硬件中都更接近本土矩阵操作.

## SVE 与 SVE2：可扩展向量扩展



- NEON有一个固定的128位宽. **SVE**(可缩放向量扩展)引入了**vector-长可知性(VLA)**编程:您写过一次代码,它运行在任何向量宽度(128到2048位)的硬件上. 硬件在运行时决定宽度.

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

- ** 备注**(`svbool_t`)取代了平板清理循环. 每个车道有一个上游位:活道参与,活道被遮住. 该`svwhilelt_b32(i, n)`指令创建一条与`i, i+1, ..., n-1`正在活动。这可以自动处理尾部.

- **`svcntw()`** 返回运行时每个向量寄存器的32位元素数。在256位 SVE 的CPU上,此返回 8 个. 在512位 SVE上,它返回了16. 你的代码会自动调整

- SVE在ARM Neoverse V1/V2(AWS Graviton3/4,一些服务器芯片)上可以提供. 目前尚未在苹果硅上获得.

## Apple Silicon 细节



- 苹果公司的M系列芯片(M1,M2,M3,M4)基于ARM,并有自定义的微architecture:

- ** 业绩和效率核心**:P-分数(火花/雪崩/etc.) 用于重计算,E-分数(冰暴/Blizzard/etc.) 用于背景任务。调度器将线程分配到合适的核心类型.

- **AMX** (Apple Matrix eXtension):专用矩阵乘法单元,与近地天体网相分离. AMX是无证的(Apple不发布ISA),但"加速框架"在内部用于BLAS操作. 当你打电话`np.dot`在Mac上,它通过加速, 它使用AMX。您不能直接编程 AMX(没有逆向工程)。

- ** 统一内存**:CPU和GPU共享相同的物理内存. 在其他系统中,数据必须从CPU内存复制到GPU内存(over PCIe,~32 GB/s). 在Apple Silicon上,没有副本，，GPU读取CPU所写的同一种内存. 这消除了ML工作量的一大瓶颈。

- ** 神经引擎**:16分专用ML加速器。为INT8推论进行~30 TOPS(每秒三千个操作). 由Core ML用于对设备的推断.

- ** 对于苹果硅上ML**:使用为统一内存架构所设计的MLX(Apple's ML框架). PyTorch也有MPS(Metal Performance Shaders)后端支持,尽管它比CUDA更不成熟.

## 自动向量化



- 写SIMD内在是乏味的. ** 编译器** 能够自动向导您的代码吗 ?

- 是的,还有警告 现代编译器(GCC, Clang)可以自动编辑简单的循环:

```cpp
// The compiler CAN auto-vectorise this (with -O3 -march=native)
void add_auto(const float* a, const float* b, float* c, int n) {
    for (int i = 0; i < n; i++) {
        c[i] = a[i] + b[i];
    }
}
```

- ** 有助于自动核证的软件**:
    - 简单的循环,已知的行程数。
    - 迭代之间没有数据依赖关系(E)`c[i]`不依赖于`c[i-1]`).
    - 相接的内存访问(无散/gather).
    - `const`财务报告和已审计财务报表`restrict`指针(表示编译器阵列不相重叠).

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

- 无`restrict`,编译器必须假设`c`可能与`a`或 为`b`(写信给`c[i]`可能会改变`a[i+1]`),防止病媒传播.

- ** 防止自动核证的软件**:
    - 数据依赖性 :`a[i] = a[i-1] + b[i]`(每个迭接取决于之前).
    - 复杂控制流 :`if`循环内部的语句(除非编译器可以转换为预想).
    - 函数调用循环内部(除非该函数是内含的)。
    - 指向别名(阵列可能重叠,不包含`restrict`).

- ** 检查自动授权**:使用编译器旗来查看向量化的内容 :

```bash
# GCC: show vectorisation decisions
g++ -O3 -march=native -fopt-info-vec-optimized code.cpp

# Clang: show vectorisation report
clang++ -O3 -march=native -Rpass=loop-vectorize code.cpp
```

- ** 当使用内在对自動活化**:从干净 C++和编译器优化开始. 如果编译器将你的回路向上传,太好了。如果性能仍然不足,则检查编译器的向量化报告以了解原因,并只写关键内环所固有的. 早熟的内在成分使得代码无法被读取,而没有保证的好处.

## 编程任务（在 ARM 上使用 g++ 或 clang++ 编译，，Mac M 系列或 Linux aarch64）



1. 编写标量点积和 NEON 向量化点积，测量两者的运行时间和加速比。
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

2. 实现 NEON 版本的 ReLU 和 softmax 最大值搜索，用不同操作练习加载—计算—存储模式。
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

3. 将自动核证的代码与手写近地天体网络内在代码进行比较。编译为`-fopt-info-vec`(GCC)或 (缩写:`-Rpass=loop-vectorize`(Clang)来查看编译器的工作.
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
    // They should be very close ， the compiler auto-vectorises this simple loop well
    return 0;
}
```
