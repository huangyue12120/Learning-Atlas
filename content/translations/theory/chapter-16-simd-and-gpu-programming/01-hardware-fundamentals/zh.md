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

*现代硬件的性能不再自动免费增长。本篇介绍 CPU 执行、SIMD、Roofline 模型、延迟与吞吐、芯片架构、功耗约束，以及如何用 C++ 实测性能。*



*在写出SIMD或GPU代码之前,需要了解你正在编程的硬件. 此文件涵盖平行主义取代时钟速度的原因,现代CPU如何执行指令,SIMD是什么,关于性能推理的屋顶线模型,以及芯片架构的地貌*

- 数十年来,软件变得更快免费:购买一个时钟速度更高的新CPU,而您的程序运行得更快而无需更改一行代码. 这个时代大约在2005年结束。了解它为什么结束,以及什么取代它,对于任何想写快码的人来说都是至关重要的.

## 免费性能增长的终点



- ** Moore's Law**(1965年)指出,芯片上的晶体管数量大约每两年翻一番. 这件事持续了60年。更多的晶体管意味着更小的晶体管,这意味着更高的时钟速度,这意味着更快的程序.

- 但在2005年前后,时钟速度以~4GHz撞入一堵墙. 问题在于**力量**。芯片消耗的动力约为:

$$P \propto C \cdot V^2 \cdot f$$

- 地点$C$电容(与晶体管计数的比例),$V$是电压,和$f$是时钟频率。要增加频率,必须增加电压(以更快地切换晶体管). 但电量级$V^2 \cdot f$,因此频率小幅增加会导致功率(和热能)大增. 4 GHz时,芯片已经打出100+瓦特. 8千兆赫需要不切实际的冷却

- 溶液:不使一核更快,而是将**多核**放入同芯片上. 3GHz的4-核芯片使用与4.5GHz的单核相似的功率,但能做4x并行工作. 这就是为什么每一个现代CPU都有多个核心,为什么并行主义(SIMD,多线程,GPU计算)是获得更多性能的唯一路径.

- ** ML**的影响:一个核心需要10分钟的训练步骤不能通过购买更快的CPU来更快地完成. 它只能通过使用更多的核心(数据平行主义,第六章),更宽的SIMD单位(本章),或GPU(千个核心)来更快地被制取.

## 现代 CPU 如何执行指令



- 现代CPU核心远比第13章的简单取出-解码-执行模型复杂. 它使用几个技巧来执行每个周期更多的指令:

- **Superscalar执行**:CPU有多个执行单元(ALU,FPU,负载/存储单元),可以同时执行多个独立指令. 现代核心如果不互相依赖,每个周期可能执行4-6指令.

- **出令执行(OoO)**:CPU不按程序顺序执行指令. 它在指令流中向前看,找到其投入已经准备好的指令,并立即执行,不管其位置如何. 这隐藏了延迟性:当一个指令等待来自内存(100+周期)的数据时,CPU会执行其他已经准备好的指令.

- ** Branch 预测**: 有条件的分支(`if`语句,回路条件)产生不确定性:CPU在评估条件之前不知道要走哪条路径. CPU**预测结果, 如果预测是正确的(用现代预测器计算时的95%),则不会失去时间. 如果错误,则将投机性工作丢弃,并执行正确的路径(~15个周期处罚).

- ** 特定执行**:分支预测的延伸. CPU执行指令,即不需要 * might*,打赌它们将会是. 这填补了管道,使执行单位忙碌.

- 所有这些都是自动的，，CPU在没有任何程序员干预的情况下进行. 但它们只帮助**指令级并行主义**(ILP):单流内的独立指令. 对于**数据级并行论**(在许多数据元素上相同的操作),我们需要SIMD.

## SIMD：单指令多数据



- ** SIMD**是同时对多个数据元素应用一个指令的想法. 与其增加两个数字,不如在一个指令中增加两个由4个(或8个或16个)数字组成的向量.

- 没有SIMD(scalar) :

```cpp
// Add two arrays element by element: 4 add instructions
for (int i = 0; i < 4; i++) {
    c[i] = a[i] + b[i];  // one add per iteration
}
```

- 使用 SIMD(授权):

```cpp
// Add two arrays: 1 SIMD instruction does all 4 adds
#include <immintrin.h>  // x86 SIMD intrinsics

__m128 va = _mm_load_ps(a);    // load 4 floats into a 128-bit register
__m128 vb = _mm_load_ps(b);    // load 4 floats into another register
__m128 vc = _mm_add_ps(va, vb); // add all 4 pairs simultaneously
_mm_store_ps(c, vc);            // store 4 results
```

- SIMD版本在指令的1/4中做同样的工作. 这是理论上的4x加速,通过每个指令处理4个浮点而不是1实现.

### 向量寄存器



- SIMD指令运行在**vector注册**:拥有多数据元素的宽注册.

|Register Width|Floats (32-bit)|Doubles (64-bit)|Name|
|----------------|-----------------|-------------------|------|
|128-bit| 4 | 2 |SSE (x86), NEON (ARM)|
|256-bit| 8 | 4 |AVX/AVX2 (x86)|
|512-bit| 16 | 8 |AVX-512 (x86)|
|Variable (128-2048)|varies|varies|SVE/SVE2 (ARM)|

- 更广泛的登记册=更加平行。512位AVX-512指令一次处理出16个浮点,一个理论上的16x加速超过scalar码. 实际操作中,由于内存带宽限制(可以比向CPU提供数据更快地计算出),速度降低.

- 就ML而言:浮标32值的矩阵乘法从SIMD中大有裨益。内环(两个向量的点出产)直接到SIMD乘积指令. 因此,BLAS库(NumPy和PyTorch称其为"活页")与SIMD非常地优化.

## Roofline 模型



- 你怎么知道你的密码是不是快? **roofline模型**通过对性能进行两个硬件限制的特性化提供了一个框架:

1. **Peak计算**(FLOPS):每秒最大浮点操作. 4GHz CPU,拥有256位AVX(每个指令可有8个浮点)和2个FMA单元:$4 \times 10^9 \times 8 \times 2 = 64$(原始内容存档于2018-03-21). GLOPS.

2. **Peak内存带宽**(字节/秒):数据从内存移动到CPU的速度如何. 现代CPU可能有50GB/s的内存带宽.

- 您代码的** 分子强度** 是计算与内存访问的比例:

$$\text{Arithmetic Intensity} = \frac{\text{FLOPS}}{\text{Bytes transferred}}$$

- 如果算术强度低(每装入字节的操作数),则您的代码为**memory-bound**:它花费了大部分时间等待数据. 更快的计算(宽度更大的SIMD,高钟)不会有什么帮助.

- 如果算术强度高(每个字节有许多操作),你的代码是**compute-bound**:它花费了大部分时间来计算. 更快的记忆不会帮助。

- 屋顶线:

$$\text{Achievable FLOPS} = \min\left(\text{Peak FLOPS}, \; \text{Bandwidth} \times \text{Arithmetic Intensity}\right)$$

- ** 马特里克斯乘法** 具有高计算强度:$O(n^3)$运行$O(n^2)$数据,所以强度$\approx O(n)$。。。对于大型矩阵来说,它是计算自带的。这就是为什么GPU(高计算)主导了矩阵-重的ML工作量.

- ** 元素偏导操作**(ReLU,加法,乘法)的算术强度较低:每装入元素1个操作. 这些都是有记忆的。使GPU更快无济于事;你需要更快的内存(或将这些操作与计算重的操作相接以避免单独的内存回转).

- 天花板模型解释了为什么**内核聚变**如此重要:将一个有偏差的matmul加成并再将ReLU合并为单个内核,避免将中间结果写入内存并读回,将三个内存捆绑的操作变成一个计算捆绑的操作.

## 延迟与吞吐



- ** 耐心** 是完成一项行动的时间。** 透出**是单位时间完成的作业次数。

- 类比:一班公交车有高的耐用性(每站候车),但吞吐量高(一次载50人). 出租车有低空(直接前往目的地),但吞吐量(1至4人)。

- GPU是客车:每次运行时间隔很长(每个指令需要许多周期才能完成),但吞吐量巨大(同时处理数千个核心). CPU是出租车:低延迟(出令执行,分行预测,深缓存能将延迟最小化)但吞吐量有限(4-64个核心).

- 这就是为什么GPU更适合ML训练(通量事项:处理上百万个实例),CPU更适合OS任务(关系事项:立即响应按键压).

- ** 管道** 将延迟转化为吞吐量。如果一项指令需要5个周期,但管道每个周期开始一个新的指令,则通过量是每个周期1个指令(尽管每个周期需要5个周期才能完成)。这与第13章的CPU管线一样原则,但适用于每个关口:SIMD单元,内存控制器,和GPU核心全部被管道.

## 芯片架构版图



- 您为确定哪些 SIMD 指令可用而写入的硬件 :

### x86(英特尔- AMD)



- 主导桌面,笔记本电脑,以及数据中心CPU. SIMD:SSE (128-bit), AVX/AVX2(256-bit), AVX-512 (512-bit). Intel AMX为AI工作量提供专用矩阵乘法单位.

- **Strengths**:最高单核性能,最宽的SIMD,成熟的软件生态系统(MKL, oneDNN).
- **微软**:高能耗,复杂指令集,昂贵.

### 亚美尼亚



- 主导移动(每部智能手机),在服务器(AWS Graviton,Ampere Altra)和笔记本电脑(Apple M-series)中成长. SIMD: NEONN (128-bit), SVE/SVE2(可缩放,128-2048 bit.

- **Strengths**:优秀的功率效率(每瓦功率),自定义芯(Apple M4与单核功率中英特尔在分量功率中的对手).
- **Weakneses**:更窄的SIMD(NEON只有128位,虽然SVE可以更宽),HPC的软件生态系统更小.

### 苹果硅(M1/ M2/ M3/ M4)



- 基于自定义添加的ARM. 包括**AMX** (Apple Matrix eXtension)，，无证的矩阵乘法单位,加速框架用于BLAS操作. 统一内存架构:CPU和GPU共享相同的物理内存,去除CPUQGPU复制瓶颈.

- ** 对于ML**:苹果的"神经引擎"(16-core,专用ML加速器)和统一的内存使得M系列芯片出人意料地能够进行本地ML推论和小规模训练. 但是没有 CUDA: 您必须使用Metal(Apple的GPU API)或MLX(Apple的ML框架).

### RISC-V 火箭发射场



- 开源ISA. 不收取许可证费(与ARM不同)。成长于嵌入式系统,IoT和研究. SIMD:"V"(vector)扩展提供类似于ARM SVE的可伸缩向向量处理.

- ** 对于ML**:对于ML工作量,尚未与x86/ARM竞争,但请注意这一空间。多个AI加速器启动公司使用RISC-V核心.

### GPU(NVIDIA; AMD; 英特尔)



- 已深入档案04-05. 数千个简单的芯片优化了,以达到吞吐量. NVIDIA以CUDA为主的ML;AMD与ROCm相竞争;Intel以Arc GPUs和Gaudi加速器入会.

### TPU(谷歌)



- 专门为ML设计的自定义ASIC. 为矩阵乘法优化了 Systolic 阵列. 档案05

## 温度与功耗约束



- 性能最终受到动力和冷却的限制:

- **TDP**(热能设计动力):芯片能消耗的最大持续功率. 一个笔记本电脑CPU可能拥有一个15W TDP;一个服务器CPU 250W;一个数据中心GPU 700W(NVIDIA B200).

- ** 暗硅**:在任何特定时刻,必须有相当一部分晶体管的电源才能保持在热能预算范围内。芯片理论上可以同时使用所有的晶体管,但会融化.

- ** 功率效率** (FLOPS/wat)越来越重要,而不是原始的FLOPS。这就是为什么:
    - ARM正在接管数据中心(比x86更好的FLOPS/wat).
    - TPU与GPU竞争,尽管峰值较低FLOPS(ML工作量的FLOPS/wat).
    - 量子化(INT8,FP8)不仅仅是关于内存:它也减少了每次操作的功率.

- 就大规模电力发电而言:培训边境液压电能耗为多兆瓦。电费可以超过硬件成本. 电能效率直接影响到AI研究的经济学.

## 实践：用 C++ 测量性能



- 为了说明表现的原因,你需要衡量它。以下是一个最小的 C++ 基准设置:

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

- ** 本代码中的关键C++概念**:
    - `#include <vector>`: 动态数组(3)`std::vector<float>`)，，同"活佛会".`list`但输入和连接在记忆中。
    - `a.data()`: 返回一个生指针(`float*`)到基础阵列，，SIMD内在需要.
    - `std::chrono`:用于基准的高分辨率定时器.
    - `-O3`: 最大编译器优化级别. 编译器可以自动编辑您的循环(自动使用 SIMD)。`-march=native`启用您的 CPU 支持的所有 SIMD 指令。

- **为什么取暖**:第一次运行会填充缓存并可能触发CPU频率缩放(turbo cap). 随后的竞选更具代表性.

- **为什么测量带宽**:对于内存绑定的操作(类似元素加法),有意义的度量是带宽(GB/s),而不是FLOPS. 如果测量到的带宽接近硬件限制(DDR5的~50 GB/s),那么你就是内存受限,而SIMD也不会帮助多少(瓶颈是内存,而不是计算).

## 编程任务（使用 Colab 或 notebook）



1. 计算常见的ML操作的算术强度,并归类为内存约束或计算约束.
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

2. 说明平行主义为何重要。随着数据大小的增长,比较相继对平行(NumPy)执行.
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
