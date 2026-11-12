---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 16 - SIMD and GPU programming/03. x86 and AVX.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 493990827ceb9ded28ab07eddc120e6d3cf59355f0cf0c85b8075a22dc61f3c1
status: reviewed
---
# x86 与 AVX

*Intel 和 AMD 的 x86 处理器主导着大多数机器学习训练所在的数据中心服务器。本文介绍 x86 SIMD 的演进、AVX/AVX2 内在函数编程、AVX-512、用于矩阵运算的 Intel AMX、内存对齐、性能陷阱和性能剖析，帮助你充分发挥全球最常见服务器 CPU 的性能。*

- 如果你的训练运行在云 VM (AWS, GCP, Azure) 上，它很可能正在 x86 处理器上进行。 即便 GPU 密集型训练也有 CPU 瓶颈：数据加载、预处理、梯度聚合和检查点都由 CPU 完成。 通过使用 x86 SIMD 进行优化，可以显著减少端到端的训练时间。

## x86 SIMD 的演进

- x86 SIMD 通过不断增加的向量寄存器宽度而演进：

| 代数 | 年份 | 寄存器宽度 | 寄存器数 | 主要特性 |
|---|---|---|---|---|
| MMX | 1997 | 64 位 | 8 (mm0-7) | 只支持整数，与 FPU 共用 |
| SSE | 1999 | 128 位 | 8 (xmm0-7) | 4 个浮点数，有专用的寄存器 |
| SSE2 | 2001 | 128 位 | 8/16 | 2 个双精度浮点数，整数操作支持 |
| AVX | 2011 | 256 位 | 16 (ymm0-15) | 8 个浮点数，三操作数指令 |
| AVX2 | 2013 | 256 位 | 16 | 256 位整数运算、FMA、gather 操作 |
| AVX-512 | 2017 | 512 位 | 32 (zmm0-31) | 16 个浮点数，掩码寄存器，scatter 操作 |
| AMX | 2023 | Tile 寄存器 | 8 个 tile | 矩阵乘法 (BF16, INT8) |

- 每一代都让向量化代码的理论吞吐量翻倍。使用 SSE 内在函数编写的代码可以在 2001 年以来的 x86 CPU 上运行。AVX2 需要 2013 年或更新的 CPU。AVX-512 可用于 Intel Xeon 和部分消费级芯片。AMX 是最新一代扩展（Sapphire Rapids 及以后）。

- **向后兼容性**: x86 SSE 寄存器 (xmm) 是 AVX 寄存器的下半部分 (ymm)，而 ymm 又是 AVX-512 寄存器的下半部分 (zmm)。 旧的 SSE 代码可以在新的 CPU 上运行，无需修改。

## AVX2 编程

- AVX2 使用 256 位寄存器 (YMM)，同时处理 8 个浮点数或 4 个双精度数。 这是可移植高性能代码的“黄金标准”：几乎所有现代 x86 CPU（2013+）都支持它。

### 内在函数命名约定

- 所有 x86 内在函数遵循以下模式：`_mm[width]_[operation]_[type]`

    - `_mm` = MMX/SSE (128 位)，`_mm256` = AVX (256 位)，`_mm512` = AVX-512 (512 位)
    - Operation：`add`, `mul`, `fmadd`, `load`, `store`, `set`, 等等。
    - Type：`ps` = 打包单精度 (float32)，`pd` = 打包双精度 (float64)，`epi32` = 打包 32 位整数，`si256` = 256 位整数

```cpp
#include <immintrin.h>  // all x86 SIMD intrinsics

// Data types
__m256  a;   // 256-bit register holding 8 float32s
__m256d b;   // 256-bit register holding 4 float64s
__m256i c;   // 256-bit register holding integers (8x32, 16x16, or 32x8)
```

### 加载和存储数据

```cpp
// Load 8 floats from memory
__m256 v = _mm256_loadu_ps(ptr);      // unaligned load (works with any address)
__m256 v = _mm256_load_ps(ptr);       // aligned load (ptr must be 32-byte aligned, faster)

// Store 8 floats to memory
_mm256_storeu_ps(out_ptr, v);          // unaligned store
_mm256_store_ps(out_ptr, v);           // aligned store

// Broadcast a single value to all 8 lanes
__m256 ones = _mm256_set1_ps(1.0f);    // [1, 1, 1, 1, 1, 1, 1, 1]

// Set individual values (rarely needed)
__m256 v = _mm256_set_ps(7,6,5,4,3,2,1,0);  // note: reverse order!

// Zero register
__m256 z = _mm256_setzero_ps();
```

### 算术

```cpp
__m256 c = _mm256_add_ps(a, b);        // c[i] = a[i] + b[i]
__m256 d = _mm256_mul_ps(a, b);        // d[i] = a[i] * b[i]
__m256 e = _mm256_sub_ps(a, b);        // e[i] = a[i] - b[i]
__m256 f = _mm256_div_ps(a, b);        // f[i] = a[i] / b[i] (slower than mul)

// Fused Multiply-Add: r = a * b + c (one instruction, one rounding)
__m256 r = _mm256_fmadd_ps(a, b, c);   // THE most important instruction for ML

// Min and max
__m256 mn = _mm256_min_ps(a, b);       // min(a[i], b[i]) — useful for clipping
__m256 mx = _mm256_max_ps(a, b);       // max(a[i], b[i]) — useful for ReLU
```

### 实际例子：AVX2 点积

```cpp
#include <immintrin.h>

float dot_avx2(const float* a, const float* b, int n) {
    __m256 sum = _mm256_setzero_ps();  // 8 accumulators initialised to 0

    int i = 0;
    for (; i + 8 <= n; i += 8) {
        __m256 va = _mm256_loadu_ps(a + i);
        __m256 vb = _mm256_loadu_ps(b + i);
        sum = _mm256_fmadd_ps(va, vb, sum);  // sum += va * vb
    }

    // Horizontal reduction: sum the 8 elements of sum
    // Step 1: add upper 128 bits to lower 128 bits
    __m128 hi = _mm256_extractf128_ps(sum, 1);
    __m128 lo = _mm256_castps256_ps128(sum);
    __m128 sum128 = _mm_add_ps(hi, lo);        // 4 partial sums

    // Step 2: horizontal add within 128-bit register
    sum128 = _mm_hadd_ps(sum128, sum128);       // [a+b, c+d, a+b, c+d]
    sum128 = _mm_hadd_ps(sum128, sum128);       // [a+b+c+d, ...]

    float result = _mm_cvtss_f32(sum128);       // extract scalar

    // Scalar cleanup
    for (; i < n; i++) {
        result += a[i] * b[i];
    }

    return result;
}
```

- **为什么横向归约如此笨拙**：SIMD 面向纵向操作（通道 0 对通道 0、通道 1 对通道 1）。横向操作（跨通道求和）并不契合这种硬件结构，因此点积结尾需要一段固定而笨拙的归约代码；向量化主循环本身则很简洁。
- **性能**：与 NEON 版本（文件 02）相比，AVX2 每轮处理 8 个浮点数，而 NEON 只有 4 个。 对于长向量，它比 NEON 快 2 倍 (忽略内存带宽限制)。

### 实际例子：AVX2 Softmax (简化)

- Softmax 需要：找到最大值、减去它、指数化、求和、除以。 这是找到最大值的步骤：

```cpp
float vector_max_avx2(const float* data, int n) {
    __m256 max_vec = _mm256_set1_ps(-INFINITY);

    int i = 0;
    for (; i + 8 <= n; i += 8) {
        __m256 v = _mm256_loadu_ps(data + i);
        max_vec = _mm256_max_ps(max_vec, v);
    }

    // Reduce 8 maxes to 1
    __m128 hi = _mm256_extractf128_ps(max_vec, 1);
    __m128 lo = _mm256_castps256_ps128(max_vec);
    __m128 max128 = _mm_max_ps(hi, lo);

    // Shuffle and max to find the single maximum
    max128 = _mm_max_ps(max128, _mm_shuffle_ps(max128, max128, 0b01001110));
    max128 = _mm_max_ps(max128, _mm_shuffle_ps(max128, max128, 0b10110001));

    float result = _mm_cvtss_f32(max128);

    for (; i < n; i++) {
        result = result > data[i] ? result : data[i];
    }

    return result;
}
```

- `_mm_shuffle_ps` 内在函数重新排列寄存器内的元素。二进制常量 `0b01001110` 控制元素的去向。这称为**置换**，与第 2 章的置换矩阵直接相关：重排 SIMD 通道相当于在硬件中执行与置换矩阵相乘的操作。

## AVX-512

- AVX-512 再次将向量宽度翻倍：使用 512 位寄存器（ZMM），可同时处理 16 个浮点数。

```cpp
__m512 a = _mm512_loadu_ps(ptr);                // load 16 floats
__m512 c = _mm512_fmadd_ps(a, b, c);            // 16 FMAs at once
float sum = _mm512_reduce_add_ps(a);             // built-in horizontal sum (no manual reduction!)

// Mask operations: operate on a subset of lanes
__mmask16 mask = _mm512_cmpgt_ps_mask(a, zero);  // which lanes are > 0?
__m512 relu = _mm512_maskz_mov_ps(mask, a);       // zero out negative lanes = ReLU
```

- **掩码寄存器** (`__mmask16`) 是 AVX-512 最强大的功能。 每个位控制一个通道是否参与运算。 这取代了标量清理循环：最后一个迭代使用掩码，只有有效的通道处于活动状态，无需单独的标量循环处理任意长度的向量。

- **AVX-512 时钟频率限制**：在许多 Intel CPU 上，使用 AVX-512 指令会导致 CPU 临时降低时钟频率 (以便保持散热限制)。 这意味着 AVX-512 在短时间内并不总是比 AVX2 快 — 频率惩罚有时会大于更宽的通道。 对于持续工作负载 (如矩阵乘法)，AVX-512 胜出。 对于混合代码 (一些 SIMD，一些标量) ，时钟转换可能会造成影响。

## 英特尔 AMX：矩阵乘法硬件加速

- **AMX** (Advanced Matrix eXtensions) 增加了专用的矩阵乘法单元。它使用 **tile**（瓦片）进行操作，而不是 SIMD 向量，每个 tile 是一个 2D 数据块（最多 16 行 × 64 字节）。

```cpp
#include <immintrin.h>

// AMX tile multiply: C += A * B (in BF16)
// A is 16x32 BF16, B is 32x16 BF16, C is 16x16 FP32
_tile_loadd(0, a_ptr, stride_a);   // load tile 0 from A
_tile_loadd(1, b_ptr, stride_b);   // load tile 1 from B
_tile_dpbf16ps(2, 0, 1);           // tile 2 += tile 0 * tile 1 (BF16 matmul, FP32 accumulation)
_tile_stored(2, c_ptr, stride_c);  // store tile 2 to C
```

- AMX 可以用一条指令完成一个 16×32 × 32×16 的矩阵乘法。这相当于一次性执行数百个 FMA 操作，专门用于 Transformer 推理中的小矩阵乘法（注意力分数计算、MLP 层）。

- AMX 支持 BF16（bfloat16）和 INT8，与 ML 推理所用精度相符。结合 AVX-512 处理其他运算，配备 AMX 的 CPU（Intel Sapphire Rapids、Emerald Rapids）运行 Transformer 推理时可与入门级 GPU 竞争。

> **编者注：** 上面的 AMX 代码是指令示意，运行前还需完成操作系统权限、tile 配置、累加 tile 初始化以及 B 矩阵的数据布局准备；它不是可直接独立执行的完整示例。

## 内存对齐

- **对齐的内存访问** 是指数据地址是向量寄存器宽度（SSE 为 16 字节，AVX 为 32 字节，AVX-512 为 64 字节）的倍数。 对齐访问在某些 CPU 上更快，并且是 `_mm256_load_ps` (与 `_mm256_loadu_ps` 相比) 所需的。

```cpp
// Allocate aligned memory
float* data = (float*)aligned_alloc(32, n * sizeof(float));  // 32-byte aligned for AVX

// C++ aligned allocation
#include <new>
float* data = new (std::align_val_t(32)) float[n];

// Alternatively, use the compiler attribute
alignas(32) float data[1024];
```

- **实际上**： 在现代 CPU（Haswell 及更新版本）上，非对齐加载 (`loadu`) 的速度几乎与对齐加载相同，当数据没有跨越缓存线边界时。 非对齐访问的性能惩罚已经很大程度上消失了，但如果数据跨度到两个 64 字节的缓存线（即缓存线分裂），则该加载操作的速度会慢大约 2 倍。 对齐分配可以完全避免这个问题。

## 性能陷阱

- **AVX-SSE 过渡惩罚**: 在较老的 Intel CPU (预 Skylake) 上，切换 AVX (256 位) 和 SSE (128 位) 指令会产生一个惩罚 (~70 个时钟周期)。这就是为什么你应该在从函数返回之前使用 `_mm256_zeroupper()` (或 `vzeroupper` 指示) 来清除 YMM 寄存器中上方的 128 位。现代 CPU (Skylake+) 没有这个惩罚。

- **寄存器压力**：AVX2 有 16 个 YMM 寄存器。如果内核使用过多变量，编译器会把寄存器溢出到栈内存，严重损害性能。应保持内层循环简单，减少同时存活的变量。

- **数据依赖性**: `sum = _mm256_fmadd_ps(a, b, sum)` 对 `sum` 存在依赖关系：每个迭代必须等待之前的 FMA 完成 (~4-5 个时钟周期延迟)。解决方法是使用多个独立的累加器，并在最后进行归约：

```cpp
// Single accumulator: limited by FMA latency (4-5 cycles)
__m256 sum = _mm256_setzero_ps();
for (...) {
    sum = _mm256_fmadd_ps(a, b, sum);  // each depends on previous
}

// Four accumulators: 4x throughput (hide latency)
__m256 sum0 = _mm256_setzero_ps();
__m256 sum1 = _mm256_setzero_ps();
__m256 sum2 = _mm256_setzero_ps();
__m256 sum3 = _mm256_setzero_ps();
for (...) {
    sum0 = _mm256_fmadd_ps(a0, b0, sum0);  // independent
    sum1 = _mm256_fmadd_ps(a1, b1, sum1);  // independent
    sum2 = _mm256_fmadd_ps(a2, b2, sum2);  // independent
    sum3 = _mm256_fmadd_ps(a3, b3, sum3);  // independent
}
sum0 = _mm256_add_ps(sum0, sum1);
sum2 = _mm256_add_ps(sum2, sum3);
sum0 = _mm256_add_ps(sum0, sum2);
```

- 这就是用**循环展开**隐藏延迟。因为这些 FMA 写入不同寄存器，CPU 可以连续发射它们。这是数值代码中影响最大的微优化之一。

## 性能分析

- **性能计数器** 提供硬件级别的测量：

```bash
# Linux perf (requires kernel support)
perf stat ./my_program                    # basic counters: cycles, instructions, IPC
perf stat -e cache-misses,cache-references ./my_program  # cache behaviour
perf record -g ./my_program && perf report              # call graph profiling

# Intel VTune (detailed x86 profiling)
vtune -collect hotspots -- ./my_program
vtune -collect memory-access -- ./my_program   # memory bandwidth analysis
```

- **需要关注的内容**:
    - **IPC**（每周期指令数）：衡量 CPU 的利用效率。IPC > 2 通常较好；IPC < 1 往往意味着内存停顿或分支预测错误。
    - **缓存未命中率**：较高的 L1/L2 未命中率说明数据局部性较差，应重新组织数据访问模式。
    - **分支预测错误率**：高于 5% 表明分支难以预测。如有可能，可改为无分支代码（SIMD 比较 + 混合）。
    - **实际 FLOPS 与 Roofline 的比值**: 将你的测量结果与 Roofline 模型 (文件 01) 进行比较。如果低于 Roofline，还有优化空间。

## 编码任务（使用 g++ 或 clang++ 在 x86 上进行编译 — Intel/AMD）

1.  编写标量点积和 AVX2 点积。对两者进行基准测试，并测量 8 路 SIMD 带来的加速。
```cpp
// task1_avx_dot.cpp
// Compile: g++ -O3 -mavx2 -mfma -o task1 task1_avx_dot.cpp

#include <iostream>
#include <chrono>
#include <vector>
#include <immintrin.h>

float dot_scalar(const float* a, const float* b, int n) {
    float sum = 0.0f;
    for (int i = 0; i < n; i++) sum += a[i] * b[i];
    return sum;
}

float dot_avx2(const float* a, const float* b, int n) {
    __m256 sum = _mm256_setzero_ps();
    int i = 0;
    for (; i + 8 <= n; i += 8) {
        __m256 va = _mm256_loadu_ps(a + i);
        __m256 vb = _mm256_loadu_ps(b + i);
        sum = _mm256_fmadd_ps(va, vb, sum);
    }
    // Reduce: add upper 128 to lower 128, then horizontal add
    __m128 hi = _mm256_extractf128_ps(sum, 1);
    __m128 lo = _mm256_castps256_ps128(sum);
    __m128 r = _mm_add_ps(hi, lo);
    r = _mm_hadd_ps(r, r);
    r = _mm_hadd_ps(r, r);
    float result = _mm_cvtss_f32(r);
    for (; i < n; i++) result += a[i] * b[i];
    return result;
}

int main() {
    const int N = 10'000'000;
    std::vector<float> a(N, 1.0f), b(N, 2.0f);

    volatile float s1 = dot_scalar(a.data(), b.data(), N);
    volatile float s2 = dot_avx2(a.data(), b.data(), N);

    auto bench = [&](auto fn, const char* name) {
        auto start = std::chrono::high_resolution_clock::now();
        volatile float s;
        for (int t = 0; t < 100; t++) s = fn(a.data(), b.data(), N);
        auto end = std::chrono::high_resolution_clock::now();
        double ms = std::chrono::duration<double, std::milli>(end - start).count() / 100;
        std::cout << name << ": " << ms << " ms (result: " << s << ")\n";
        return ms;
    };

    double t1 = bench(dot_scalar, "Scalar");
    double t2 = bench(dot_avx2,   "AVX2  ");
    std::cout << "Speedup: " << t1 / t2 << "x\n";
    return 0;
}
```

2.  使用 `_mm256_max_ps` 实现 AVX2 ReLU，并将其与标量循环进行比较。然后尝试使用多个累加器（循环展开）来隐藏 FMA 延迟。

> **编者注：** 本题源文把 ReLU 循环展开与前面的 FMA 累加示例混在了一起。下面的 ReLU 代码没有 FMA，也没有累加器；它通过每轮处理四个向量来展示循环展开。隐藏 FMA 依赖延迟请对照前面的点积示例。
```cpp
// task2_avx_relu.cpp
// Compile: g++ -O3 -mavx2 -o task2 task2_avx_relu.cpp

#include <iostream>
#include <chrono>
#include <vector>
#include <immintrin.h>

void relu_scalar(const float* in, float* out, int n) {
    for (int i = 0; i < n; i++) {
        out[i] = in[i] > 0.0f ? in[i] : 0.0f;
    }
}

void relu_avx2(const float* in, float* out, int n) {
    __m256 zero = _mm256_setzero_ps();
    int i = 0;
    for (; i + 8 <= n; i += 8) {
        __m256 x = _mm256_loadu_ps(in + i);
        _mm256_storeu_ps(out + i, _mm256_max_ps(x, zero));
    }
    for (; i < n; i++) out[i] = in[i] > 0.0f ? in[i] : 0.0f;
}

// Unrolled: process 32 floats per iteration (4 x 8)
void relu_avx2_unrolled(const float* in, float* out, int n) {
    __m256 zero = _mm256_setzero_ps();
    int i = 0;
    for (; i + 32 <= n; i += 32) {
        __m256 x0 = _mm256_loadu_ps(in + i);
        __m256 x1 = _mm256_loadu_ps(in + i + 8);
        __m256 x2 = _mm256_loadu_ps(in + i + 16);
        __m256 x3 = _mm256_loadu_ps(in + i + 24);
        _mm256_storeu_ps(out + i,      _mm256_max_ps(x0, zero));
        _mm256_storeu_ps(out + i + 8,  _mm256_max_ps(x1, zero));
        _mm256_storeu_ps(out + i + 16, _mm256_max_ps(x2, zero));
        _mm256_storeu_ps(out + i + 24, _mm256_max_ps(x3, zero));
    }
    for (; i + 8 <= n; i += 8) {
        _mm256_storeu_ps(out + i, _mm256_max_ps(_mm256_loadu_ps(in + i), zero));
    }
    for (; i < n; i++) out[i] = in[i] > 0.0f ? in[i] : 0.0f;
}

int main() {
    const int N = 16'000'000;
    std::vector<float> in(N), out(N);
    for (int i = 0; i < N; i++) in[i] = (float)(i % 200) - 100.0f;

    auto bench = [&](auto fn, const char* name) {
        fn(in.data(), out.data(), N);  // warm up
        auto start = std::chrono::high_resolution_clock::now();
        for (int t = 0; t < 100; t++) fn(in.data(), out.data(), N);
        auto end = std::chrono::high_resolution_clock::now();
        double ms = std::chrono::duration<double, std::milli>(end - start).count() / 100;
        double bw = 2.0 * N * sizeof(float) / ms / 1e6;  // read + write
        std::cout << name << ": " << ms << " ms (" << bw << " GB/s)\n";
    };

    bench(relu_scalar,        "Scalar        ");
    bench(relu_avx2,          "AVX2          ");
    bench(relu_avx2_unrolled, "AVX2 unrolled ");
    return 0;
}
```

3.  测量内存对齐的效果。将对齐和非对齐加载应用于大型数组，并比较两者。
```cpp
// task3_alignment.cpp
// Compile: g++ -O3 -mavx2 -o task3 task3_alignment.cpp

#include <iostream>
#include <chrono>
#include <cstdlib>
#include <immintrin.h>

int main() {
    const int N = 16'000'000;

    // Aligned allocation (32-byte for AVX2)
    float* aligned = (float*)aligned_alloc(32, N * sizeof(float));

    // Unaligned: offset by 4 bytes (1 float) from aligned boundary
    float* raw = (float*)malloc((N + 1) * sizeof(float));
    float* unaligned = raw + 1;  // guaranteed misaligned

    for (int i = 0; i < N; i++) {
        aligned[i] = 1.0f;
        unaligned[i] = 1.0f;
    }

    auto bench = [&](float* ptr, bool use_aligned, const char* name) {
        __m256 sum = _mm256_setzero_ps();
        // Warm up
        for (int i = 0; i + 8 <= N; i += 8) {
            __m256 v = use_aligned ? _mm256_load_ps(ptr + i) : _mm256_loadu_ps(ptr + i);
            sum = _mm256_add_ps(sum, v);
        }

        auto start = std::chrono::high_resolution_clock::now();
        for (int t = 0; t < 100; t++) {
            sum = _mm256_setzero_ps();
            for (int i = 0; i + 8 <= N; i += 8) {
                __m256 v = use_aligned ? _mm256_load_ps(ptr + i) : _mm256_loadu_ps(ptr + i);
                sum = _mm256_add_ps(sum, v);
            }
        }
        auto end = std::chrono::high_resolution_clock::now();
        double ms = std::chrono::duration<double, std::milli>(end - start).count() / 100;
        double bw = (double)N * sizeof(float) / ms / 1e6;
        std::cout << name << ": " << ms << " ms (" << bw << " GB/s)\n";
    };

    bench(aligned,   true,  "Aligned load  ");
    bench(unaligned, false, "Unaligned load");

    free(aligned);
    free(raw);
    return 0;
}
```

