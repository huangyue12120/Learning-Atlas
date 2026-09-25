---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 16 - SIMD and GPU programming/01. hardware fundamentals.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 52a4be5d15da937eaa42892d49fa46ec78f76ce1d8a1e9741212b84e754e590f
status: reviewed
---
# 硬件基础

*编写 SIMD 或 GPU 代码前，先了解目标硬件。本文介绍时钟频率提升为何放缓、现代 CPU 怎样执行指令、SIMD 的工作方式、用屋顶线模型分析性能的方法，以及不同芯片架构的特点。*

- 几十年来，换一台时钟频率更高的 CPU，程序往往不用改代码就能跑得更快。约从 2005 年起，单纯提高时钟频率越来越难。理解原因，以及后来的性能提升方式，有助于你写出高效代码。

## 免费性能时代的结束

- **摩尔定律**：1965 年，戈登·摩尔观察到集成电路上的晶体管数量大约每两年翻一番。这个趋势延续了数十年。晶体管缩小让芯片能容纳更多元件，但更多晶体管并不会自动带来更高时钟频率；厂商也把晶体管用于增加缓存、核心和专用计算单元。

- 约在 2005 年，许多处理器的时钟频率提升遇到功耗和散热限制，常见频率在 4 GHz 左右。芯片的动态功耗可粗略表示为：

$$P \propto C \cdot V^2 \cdot f$$

- 这里的 $C$ 表示开关电容，$V$ 表示电压，$f$ 表示时钟频率。提高频率有时也需要提高电压；在其他条件不变时，动态功耗会随 $V^2$ 和 $f$ 增长。这个公式没有计算漏电功耗，也省略了开关活动比例等因素。约 4 GHz 的处理器可能已消耗 100 瓦以上；若沿用相同设计继续提频到 8 GHz，散热会变得很困难。这些数值取决于处理器和设计，不能当作固定上限。

- 厂商开始在同一芯片上增加**多个核心**，同时继续改进单核设计、缓存和指令并行。把 4 核 3 GHz 与单核 4.5 GHz 相比，可以说明多核如何提高并行吞吐量；功耗是否相近、性能能否达到 4 倍，都取决于芯片和任务。只有能有效并行的工作负载才可能接近线性提速。SIMD、多线程和 GPU 是提升并行性能的重要方式，单核性能和算法改进也会影响结果。

- **对机器学习的影响**：单核执行的训练步骤仍可能从更快的单核处理器、编译优化或算法改进中获益；但时钟频率的增长受功耗限制。要扩展大型训练任务，常见做法包括使用多核做数据并行（第 6 章）、利用更宽的 SIMD 指令，或把计算交给 GPU。

## 现代 CPU 怎样执行指令

- 现代 CPU 核心远比第 13 章介绍的简单“取指、译码、执行”模型复杂。处理器会用多种机制同时推进多条指令：

- **超标量执行**：CPU 配有多个执行单元，例如算术逻辑单元（ALU）、浮点运算单元（FPU）和加载/存储单元。只要指令之间没有数据依赖，核心就能在同一周期执行多条指令。原文举出的每周期 4 到 6 条只是某些核心的示例，实际数量取决于微架构和指令类型。

- **乱序执行（OoO）**：处理器可以先执行输入已准备好的指令，不必按程序中的先后顺序等待。若一条指令因内存访问停顿（可能超过 100 个周期），核心可先执行其他就绪指令来隐藏延迟。处理器仍会按程序规定的顺序提交结果，以保持程序可见的行为。

- **分支预测**：`if` 条件和循环会让后续执行路径取决于判断结果。CPU 会预测分支方向，并沿预测路径推测执行。预测正确时，流水线可以继续工作；预测错误时，处理器会丢弃错误路径上的工作并执行正确路径。准确率超过 95% 和误预测代价约 15 个周期都只是概略值，具体数字依分支模式和处理器而变。

- **推测执行**扩展了分支预测：处理器会先执行结果尚未确定的指令，尽量让流水线和执行单元保持忙碌。

- 这些机制大多由 CPU 自动处理，主要挖掘**指令级并行**（ILP），也就是同一条指令流中彼此独立的指令。若要对许多数据元素执行相同运算，则需要**数据级并行**，SIMD 正是常见做法之一。

## SIMD：单指令多数据

- **SIMD** 会让一条指令同时处理多个数据元素。例如，一条指令可把两个包含 4、8 或 16 个数的向量逐元素相加。

- 不使用 SIMD（标量运算）：

```cpp
// Add two arrays element by element: 4 add instructions
for (int i = 0; i < 4; i++) {
    c[i] = a[i] + b[i];  // one add per iteration
}
```


- 使用 SIMD（向量化运算）：

```cpp
// Add two arrays: 1 SIMD instruction does all 4 adds
#include <immintrin.h>  // x86 SIMD intrinsics

__m128 va = _mm_load_ps(a);    // load 4 floats into a 128-bit register
__m128 vb = _mm_load_ps(b);    // load 4 floats into another register
__m128 vc = _mm_add_ps(va, vb); // add all 4 pairs simultaneously
_mm_store_ps(c, vc);            // store 4 results
```


- 这段示例假设编译器没有自动向量化标量循环。用一条向量指令完成 4 组加法时，相关加法指令数从 4 条降到 1 条。按每条指令处理 4 个数计算，理论吞吐量可提高 4 倍；开启优化后，编译器也可能自动向量化循环。整段程序的实际提速还取决于加载、存储、循环和内存带宽。示例中的 `_mm_load_ps` 和 `_mm_store_ps` 要求 `a`、`b`、`c` 的地址满足 16 字节对齐，并且每个数组至少有 4 个可访问的 float。

### 向量寄存器

- SIMD 指令使用**向量寄存器**，每个寄存器可以容纳多个数据元素。

| 寄存器宽度 | 32 位浮点数 | 64 位浮点数 | 指令集 |
| --- | ---: | ---: | --- |
| 128 位 | 4 个 | 2 个 | x86 SSE、ARM NEON |
| 256 位 | 8 个 | 4 个 | x86 AVX/AVX2 |
| 512 位 | 16 个 | 8 个 | x86 AVX-512 |
| 可变（128–2048 位） | 随宽度变化 | 随宽度变化 | ARM SVE/SVE2 |

- 寄存器越宽，一条向量指令可处理的数据越多。512 位 AVX-512 寄存器能同时容纳 16 个单精度浮点数；这表示该运算的理论并行度可达标量版本的 16 倍，不代表整段程序会快 16 倍。实际提速常受内存带宽限制，处理器可能算得比内存供数更快。

- 机器学习中的 float32 矩阵乘法常能利用 SIMD。点积循环可映射到向量乘加指令。NumPy 会使用适用的 BLAS 实现；PyTorch 的部分矩阵运算也会调用 BLAS 或其他优化内核，它们会按处理器支持的指令集选择实现。

## 屋顶线模型

- **屋顶线模型**用两个硬件上限估算程序可能达到的性能：

1. **峰值计算吞吐量**（FLOPS）：每秒最多执行的浮点运算数。以单个 4 GHz CPU 核心、256 位 AVX、每条向量指令处理 8 个 float32，以及每周期可发出 2 条融合乘加（FMA）指令为例，每条 FMA 对每个元素执行乘法和加法，共计 2 次浮点运算。因此理论值是 $4 \times 10^9 \times 8 \times 2 \times 2 = 128$ GFLOPS。按两次浮点运算计算一次 FMA 时，若漏算乘法或加法，结果就会减半；实际峰值还取决于核心能否持续发出这些指令和实际时钟频率。

2. **峰值内存带宽**（字节/秒）：内存向 CPU 传输数据的速率。某些现代 CPU 的内存带宽约为 50 GB/s；实际带宽取决于内存类型、通道数和硬件配置。

- **算术强度**表示计算量与数据传输量之比：

$$\text{算术强度} = \frac{\text{浮点运算数}}{\text{传输字节数}}$$

- 如果算术强度低，也就是每读取一个字节只做少量运算，程序可能属于**内存带宽受限**：大部分时间都在等数据。此时单纯提高计算峰值（加宽 SIMD 或提高频率）帮助有限。

- 如果算术强度高，程序可能属于**计算能力受限**：大部分时间用于执行运算。此时提高内存带宽未必能继续加速。

- 屋顶线给出的可达 FLOPS 上限为：

$$\text{可达 FLOPS} = \min\left(\text{峰值 FLOPS}, \; \text{带宽} \times \text{算术强度}\right)$$

- **矩阵乘法**执行 $O(n^3)$ 次运算，输入和输出数据规模为 $O(n^2)$。若算法通过分块等方式重复利用缓存中的数据，算术强度可随 $n$ 增长，较大的矩阵乘法常属于计算能力受限。具体瓶颈仍取决于矩阵大小、算法和硬件，所以 GPU 不会在所有矩阵运算上都占优。

- **逐元素运算**（如 ReLU、加法和乘法）每个元素只需少量计算，却要读取输入并写出结果，算术强度通常较低，因此常属于内存带宽受限。ReLU 本身含比较操作，严格说不一定计作浮点运算。达到内存带宽上限后，提高 GPU 的峰值计算能力帮助有限；提高带宽或融合运算可以减少数据往返。

- **内核融合**可以把矩阵乘法、偏置加法和 ReLU 合并，减少中间结果写入内存再读回的开销，也能减少内核启动次数。融合后是否成为计算能力受限任务，要看运算量和数据传输量，不能只凭融合本身断定。

## 延迟与吞吐量

- **延迟**是完成一次操作所需的时间；**吞吐量**是单位时间内完成的操作数。

- 可以把两者粗略比作公交车和出租车：公交车在单个行程中停靠较多，但一次能载许多人；出租车点对点行驶较快，却一次只能载少数乘客。这个比喻只说明单次延迟与批量吞吐的区别。

- GPU 擅长同时处理大量并行工作，适合吞吐量要求高的任务；CPU 通常更擅长响应时间敏感或分支较多的任务。称 GPU 为“公交车”、CPU 为“出租车”只是简化类比，实际延迟和吞吐量取决于具体运算、数据规模和设备。

- 这也是 GPU 常用于大批量机器学习训练、CPU 常用于交互和操作系统任务的原因之一。操作系统也会使用并行计算，GPU 也能处理响应时间敏感的任务；选择取决于具体工作负载。

- **流水线**可以在等待一条指令完成时继续接收后续指令。若一条指令需要 5 个周期，而流水线每个周期都能启动一条新指令，稳态吞吐量可达到每周期 1 条，尽管每条指令仍需 5 个周期完成。这个原理适用于 CPU、SIMD 单元、内存控制器和 GPU 核心。

## 芯片架构概览

- 目标硬件决定可用的 SIMD 指令集。库和编译器也可能按设备能力选择不同实现。

### x86（Intel、AMD）

- x86 广泛用于台式机、笔记本和数据中心 CPU。常见 SIMD 指令集包括 128 位 SSE、256 位 AVX/AVX2 和 512 位 AVX-512；具体支持情况取决于处理器型号。部分 Intel 服务器处理器还提供用于 AI 矩阵计算的 AMX 单元。

- **优势**：许多型号有较强的单核性能、较宽的 SIMD 单元和成熟的软件生态，例如 MKL、oneDNN。
- **限制**：某些型号功耗较高；复杂指令集和芯片成本也会增加设计与部署成本。具体取舍因产品而异。

### ARM

- ARM 架构常见于手机，也用于服务器，例如 AWS Graviton、Ampere Altra，以及 Apple M 系列笔记本。SIMD 指令集包括 128 位 NEON 和向量长度可伸缩的 SVE/SVE2；可用向量宽度取决于芯片实现。

- **优势**：许多 ARM 芯片有较好的每瓦性能，厂商也能按产品调整核心设计。一些测试中，Apple M4 以较低功耗接近部分 Intel 处理器的单核性能；结论随具体芯片、测试和功耗设置而变。
- **限制**：NEON 的向量宽度为 128 位；SVE 可提供更宽向量。高性能计算（HPC）软件和工具在某些 ARM 环境中仍不如 x86 普及。

### Apple 芯片（M1/M2/M3/M4）

- Apple 芯片基于 ARM，并加入自有设计。原文把 **AMX** 展开为 Apple Matrix eXtensions，并指出其实现细节未公开；Apple 的 Accelerate 框架会在部分 BLAS 运算中使用专用矩阵单元。统一内存架构让 CPU 和 GPU 共享物理内存，可减少某些显式复制，但仍有带宽竞争、同步和数据布局成本。

- **机器学习用途**：M 系列芯片配有 Apple Neural Engine；不同代际的核心数量和能力不同，部分型号采用 16 核设计。统一内存与专用加速单元可支持本地推理和小规模训练，实际能力受模型大小及软件支持限制。M 系列不支持 CUDA，可通过 Metal 或 Apple 的 MLX 框架调用 GPU。

### RISC-V

- RISC-V 是开放指令集架构（ISA）。规范开放不代表所有芯片实现都免费。RISC-V 用于嵌入式系统、物联网和研究；其 “V” 向量扩展提供可伸缩向量运算，思路与 ARM SVE 类似。

- **机器学习用途**：RISC-V 的处理器、加速器和软件生态仍在发展；它能否胜任机器学习任务取决于具体实现和应用场景。部分 AI 加速器初创公司采用 RISC-V 核心。

### GPU（NVIDIA、AMD、Intel）

- 文件 04–05 会详细介绍 GPU。GPU 含有大量并行计算单元，重点优化总体吞吐量，并通过调度其他线程来隐藏部分延迟。NVIDIA 提供 CUDA 生态；AMD 提供 ROCm；Intel 的产品线包括 Arc GPU 和 Gaudi 加速器。

### TPU（Google）

- TPU 是 Google 为机器学习设计的专用集成电路（ASIC）。其脉动阵列针对矩阵乘法等运算优化，第 16 章文件 05 会继续介绍。

## 功耗与散热限制

- 芯片性能受到功耗和散热预算限制：

- **热设计功耗（TDP）**是芯片或系统散热设计使用的额定指标，不等于芯片可消耗的最大持续功率。原文以笔记本 CPU 15 W、服务器 CPU 250 W 和 NVIDIA B200 700 W 举例；这些数字只能作量级示意，具体数值需按型号和功率配置核对。

- **暗硅（dark silicon）**描述受功耗和温度限制、无法同时以高负载运行的部分晶体管或计算单元。芯片会通过电源门控和动态调频等方式管理功耗；这不是晶体管真的会熔化。

- 选择硬件时，除了峰值 FLOPS，也要比较**能效**（FLOPS/瓦）：
    - ARM 服务器的市场份额正在增长；选择时还要比较具体工作负载的每瓦性能和软件支持。
    - TPU 即使峰值 FLOPS 较低，在某些机器学习任务上仍可能凭能效与 GPU 竞争。
    - INT8、FP8 等量化格式能减少存储量；若硬件支持相应运算，也可能降低每次运算的能耗。

- 前沿大模型训练集群可能以兆瓦级功率连续运行数周或数月。电费是否超过硬件成本取决于训练规模、电价、设备利用率和折旧方式；能效会直接影响项目成本。

## 实践：用 C++ 测量性能

- 分析性能要先做测量。下面的 C++ 程序演示如何计时并估算数组加法带宽：

```cpp
#include <iostream>
#include <chrono>
#include <vector>

// Scalar addition
void add_scalar(const float* a, const float* b, float* c, int n) {
    for (int i = 0; i < n; i++) {
        c[i] = a[i] + b[i];
    }
}

int main() {
    const int N = 1 << 24;  // ~16 million elements
    std::vector<float> a(N, 1.0f), b(N, 2.0f), c(N);

    // Warm up (fill caches, trigger frequency scaling)
    add_scalar(a.data(), b.data(), c.data(), N);

    // Benchmark
    auto start = std::chrono::high_resolution_clock::now();

    for (int trial = 0; trial < 100; trial++) {
        add_scalar(a.data(), b.data(), c.data(), N);
    }

    auto end = std::chrono::high_resolution_clock::now();
    double elapsed = std::chrono::duration<double>(end - start).count();

    double total_bytes = 3.0 * N * sizeof(float) * 100;  // read a, read b, write c
    double bandwidth = total_bytes / elapsed / 1e9;        // GB/s

    std::cout << "Time: " << elapsed << " s\n";
    std::cout << "Bandwidth: " << bandwidth << " GB/s\n";

    return 0;
}
```


```bash
# Compile with optimisations
g++ -O3 -march=native -o bench bench.cpp
./bench
```


- **代码中的 C++ 概念**：
    - `#include <vector>`：`std::vector<float>` 是动态数组，元素类型固定且连续存放，和 Python `list` 的用途相近，但存储方式不同。
    - `a.data()`：返回底层数组的 `float*` 指针，可用于 SIMD 内在函数。某些 SIMD 加载指令要求地址对齐，调用前要满足指令的对齐要求。
    - `std::chrono`：C++ 计时工具。`high_resolution_clock` 不保证所有平台都使用单调时钟；严格基准测试常选 `steady_clock`，并重复多轮后比较中位数。
    - `-O3`：常见的高等级优化选项，不代表所有编译器上的绝对最高优化。编译器可能自动向量化循环。`-march=native` 会启用编译主机支持的指令，生成的二进制文件可能无法在较旧或不同的 CPU 上运行。

- 基准代码没有在计时后读取 `c`。如果编译器内联 `add_scalar` 并判断写入结果未被使用，就可能删除部分计算；稳妥的基准应在计时区间外校验或消费输出，并确认编译器保留了被测运算。

- **为什么预热**：第一次运行可能触发缓存填充或 CPU 动态调频。预热能减少部分启动影响，但不能保证后续每次运行都具代表性；代码还应多次计时并查看结果分布。

- **为什么测带宽**：对逐元素加法这类内存带宽受限运算，GB/s 往往比 FLOPS 更能说明性能。原文以 DDR5 约 50 GB/s 举例，实际峰值取决于内存通道和配置。示例按每个元素读取两个输入、写出一个结果计算传输字节数；缓存、写分配和编译器优化会让实际内存流量不同。测得的有效带宽接近设备上限时，继续提高 SIMD 计算能力的帮助通常有限。

## 编程练习（可使用 Google Colab 或笔记本）

1. 计算常见机器学习运算的算术强度，并判断它们更可能受内存带宽还是计算能力限制。

```python
import jax.numpy as jnp

def arithmetic_intensity(flops, bytes_transferred):
    return flops / bytes_transferred

# Element-wise ReLU: 1 comparison per element, read + write
n = 1024
relu_flops = n  # 1 op per element
relu_bytes = 2 * n * 4  # read input + write output (float32)
print(f"ReLU: {arithmetic_intensity(relu_flops, relu_bytes):.2f} FLOPS/byte → memory-bound")

# Matrix multiply: 2*n^3 ops, read 2*n^2 + write n^2 floats
matmul_flops = 2 * n**3
matmul_bytes = 3 * n**2 * 4  # read A + read B + write C
print(f"Matmul ({n}×{n}): {arithmetic_intensity(matmul_flops, matmul_bytes):.0f} FLOPS/byte → compute-bound")

# Layer norm: ~5n ops (mean, var, normalise), read + write
ln_flops = 5 * n
ln_bytes = 2 * n * 4
print(f"LayerNorm: {arithmetic_intensity(ln_flops, ln_bytes):.2f} FLOPS/byte → memory-bound")

# Convolution 3x3: 2*9*C_in*C_out*H*W, read kernel + feature map + write output
C_in, C_out, H, W = 64, 128, 32, 32
conv_flops = 2 * 9 * C_in * C_out * H * W
conv_bytes = (9 * C_in * C_out + C_in * H * W + C_out * H * W) * 4
print(f"Conv3x3: {arithmetic_intensity(conv_flops, conv_bytes):.0f} FLOPS/byte → compute-bound")
```


- 这段代码使用 float32，并对每个运算估算读取和写入的字节数。矩阵乘法和卷积的估算假定数据能充分复用；一次乘加按 2 FLOPs 计。实际传输量取决于分块、缓存、填充方式和输出形状。代码把 ReLU 的比较计作一次操作，严格的 FLOPS 统计通常不把比较算作浮点运算；LayerNorm 的 $5n$ 也只是粗略估计。

2. 展示数据规模增加时，逐元素 Python 循环与 NumPy 向量化运算的差异。

```python
import numpy as np
import time

for n in [1000, 10000, 100000, 1000000, 10000000]:
    a = np.random.randn(n).astype(np.float32)
    b = np.random.randn(n).astype(np.float32)

    # "Sequential" (Python loop)
    start = time.time()
    c = [a[i] * b[i] for i in range(min(n, 100000))]  # cap at 100K for sanity
    seq_time = time.time() - start
    if n > 100000:
        seq_time *= n / 100000  # extrapolate

    # "Parallel" (NumPy, uses SIMD + multithreading internally)
    start = time.time()
    c = a * b
    par_time = time.time() - start

    print(f"n={n:>10,}  sequential={seq_time:.4f}s  parallel={par_time:.6f}s  "
          f"speedup={seq_time/par_time:.0f}x")
```


- 这段程序对大于 100,000 个元素的循环只实测前 100,000 个，再按线性比例外推；外推不一定准确。NumPy 的乘法可能使用 SIMD，但这个逐元素运算不保证使用多线程，所以它比较的是 Python 逐元素循环与 NumPy 原生向量化实现，不能笼统称为“串行对并行”对照。结果还受列表分配、数组分配、计时分辨率和预热影响。若要比较实际性能，应使用 `time.perf_counter()`、多轮测量，并让两种实现处理相同数量的数据。
