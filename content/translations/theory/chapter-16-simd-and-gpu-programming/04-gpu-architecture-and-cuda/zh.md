---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 16 - SIMD and GPU programming/04. GPU architecture and CUDA.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 743fc0eca70d66a19ea7630e5a4e7cca559f4f52283298a21b20c8a17737225f
status: reviewed
---

# GPU 架构与 CUDA

*本篇将GPU 架构与 CUDA放回 AI 工程语境，保留源文中的定义、公式、代码、图示和实践边界，便于逐项核对。*

*GPU通过提供上千个用于大规模平行主义的核心来改变AI. 这个文件涵盖了GPU vs CPU设计哲学,GPU内存分级,C++中的CUDA编程,SIMT执行模式,内存访问模式,同步,流,剖析,以及NVIDIA GPU世代,写作和理解GPU内核所需的知识. *

- 带有完整工作实例的手动 CUDA 教程请参见伴奏寄存器:[github.com/HenryNdubuaku/cuda-tutors (英语). 克格勃大学 克格勃大学](https://github.com/HenryNdubuaku/cuda-tutorials).

- 一个现代的NVIDIA GPU拥有超过一万个CUDA核心. 一个CPU有4-128个核心. 这个100-1000x的核心优势是GPU主导ML的原因:训练一个变压器需要数以万亿计的乘积操作,而GPU在规模CPU中并行处理它们不能相匹配.

- 即使你从不自己写 CUDA 内核,理解 GPU 架构解释: 批量大小为何重要(需要足够的活来饱和GPU), 为何内存通常为瓶颈(不是计算), 以及为什么某些操作(散出,有条件的分支)在GPU上缓慢.

## GPU 与 CPU：根本不同的设计


- 设计一个CPU的用途是**相关性**:尽量减少完成一项任务的时间。它将其大部分晶体管预算用于缓存,分支预测器,以及出道执行，，所有使一线快的花招.

- 一个GPU是为**通量**而设计的:将每秒完成的任务数最大化. 它将大部分晶体管用于执行单元(ALU). 个别的线程很慢,但有上千条.

| |CPU|GPU|
|--|-----|-----|
|Cores|4-128 (complex, fast)|1,000-20,000 (simple, slow)|
|Clock speed|3-5 GHz|1-2.5 GHz|
|Cache|Large (32 MB+ L3)|Small (per-SM shared memory)|
|Branch prediction|Sophisticated|None (all threads follow same path)|
|Best for|Low-延迟, complex control flow|High-吞吐量, data-parallel work|
|Typical FLOPS (FP32)|1-5 TFLOPS|30-80 TFLOPS|
|Memory bandwidth|50-100 GB/s|1-3 TB/s|

- GPU的内存带宽优势(10-30x)往往比其计算优势更重要. 许多ML操作都是内存受限的(元素-明智的操作,正常化,注意),而GPU的带宽使其能将数据足够快地输入其核心.

## GPU 内存层级


- 理解GPU内存至关重要,因为**元访问是主瓶颈**,而不是计算.

|Memory|Size|延迟|Bandwidth|Scope|
|--------|------|---------|-----------|-------|
|Registers|~256 KB per SM|0 cycles|Highest|Per thread|
|Shared memory|48-228 KB per SM|~5 cycles|~20 TB/s|Per thread block|
|L1 cache|128-256 KB per SM|~30 cycles| |Per SM|
|L2 cache|4-96 MB|~200 cycles|~6 TB/s|Global|
|Global memory (HBM)|24-192 GB|~400 cycles|1-3.3 TB/s|Global|

- ** 登记** 是最快但最有限的。每个线程都有一套私人的登记簿(一般为255个最大). 每个线程使用过多的张量可以减少**使用**(fewer 线程可以同时运行).

- ** 共享内存** 是程序员管理的缓存,在一个块中由所有线程共享. 它是快速写入 CUDA 内核的关键:从慢全球内存加载一瓦数据到快共享内存,再在上面计算. 这是主导GPU编程的**tilling**模式.

- **全球内存 (HBM)**:主GPU内存 (VRAM). 大而慢 (400个周期性间隔). 所有数据都在这里开始和结束. 内核优化的目标是尽量减少全球内存访问.

## CUDA 编程模型


- CUDA (Compute United Device Architecture)是NVIDIA为GPU的编程模式. 您写入**内核**:运行在GPU上的函数,由上千个线程同时执行.

### 层级结构：网格、线程块、线程


```
Grid (the entire launch)
├── Block (0,0)
│   ├── Thread (0,0)
│   ├── Thread (1,0)
│   ├── Thread (2,0)
│   └── ... (up to 1024 threads per block)
├── Block (1,0)
│   ├── Thread (0,0)
│   └── ...
└── ... (millions of blocks possible)
```

- ** Thread**:最小的单位. 每个线程都有一个独特的ID(`threadIdx.x`)在其块内.
- ** Block**:一组可以共享内存并同步的线程. 块编号 :`blockIdx.x`。。。块大小 :`blockDim.x`(可达1024线.
- **Grid**:由单个内核发射出的所有块. 可以是1D,2D,也可以是3D.

- 每个线程计算其全球指数:`int idx = blockIdx.x * blockDim.x + threadIdx.x;`

### 你的第一个 CUDA kernel


```cpp
// vector_add.cu ， CUDA source file (.cu extension)

#include <stdio.h>

// __global__ marks this as a GPU kernel (called from CPU, runs on GPU)
__global__ void vector_add(const float* a, const float* b, float* c, int n) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < n) {           // bounds check (grid may be larger than data)
        c[idx] = a[idx] + b[idx];
    }
}

int main() {
    int n = 1 << 20;  // ~1 million elements
    size_t bytes = n * sizeof(float);

    // Allocate host (CPU) memory
    float *h_a = new float[n];
    float *h_b = new float[n];
    float *h_c = new float[n];

    // Initialise
    for (int i = 0; i < n; i++) {
        h_a[i] = 1.0f;
        h_b[i] = 2.0f;
    }

    // Allocate device (GPU) memory
    float *d_a, *d_b, *d_c;
    cudaMalloc(&d_a, bytes);
    cudaMalloc(&d_b, bytes);
    cudaMalloc(&d_c, bytes);

    // Copy data from CPU to GPU
    cudaMemcpy(d_a, h_a, bytes, cudaMemcpyHostToDevice);
    cudaMemcpy(d_b, h_b, bytes, cudaMemcpyHostToDevice);

    // Launch kernel: 256 threads per block, enough blocks to cover n elements
    int block_size = 256;
    int grid_size = (n + block_size - 1) / block_size;  // ceiling division
    vector_add<<<grid_size, block_size>>>(d_a, d_b, d_c, n);

    // Copy result from GPU to CPU
    cudaMemcpy(h_c, d_a, bytes, cudaMemcpyDeviceToHost);

    // Verify
    printf("c[0] = %f (expected 3.0)\n", h_c[0]);

    // Free memory
    cudaFree(d_a); cudaFree(d_b); cudaFree(d_c);
    delete[] h_a; delete[] h_b; delete[] h_c;

    return 0;
}
```

```bash
# Compile with NVIDIA's compiler
nvcc -O3 -o vector_add vector_add.cu
./vector_add
```

- ** CUDA**中的关键C++概念:
    - `__global__`:一个CUDA关键字,标记内核函数. 从 CPU 调用(N)`host`),运行于 GPU (`device`).
    - `<<<grid_size, block_size>>>`:内核发射语法. 指定要使用多少个块和线程。
    - `cudaMalloc` / `cudaFree`: 分配/自由 GPU 内存(如`new`/`delete`但对于GPU).
    - `cudaMemcpy`:在CPU和GPU之间复制数据. 这往往是最大的瓶颈(PCIe带宽为~32 GB/s,而GPU内存带宽为~3 TB/s).

### Warp 与 SIMT


- GPU执行线程的组为32个,称为**warps**. 曲速中的所有32个线程同时执行**同名指令**(单行指令,多行线-SIMT). 这是GPU的等同SIMD,但在线程级别.

- ** 当同一曲面的线程取一个带子的不同分支时,就会发生Warp差分**`if`语句。GPU不能在一个曲面上同时执行两个不同的指令,因此它会相继执行两个分支,遮蔽出不应该参与的线程. 这可以将性能(或更糟)降低一半.

```cpp
// BAD: warp divergence (threads in same warp take different paths)
if (threadIdx.x % 2 == 0) {
    c[idx] = a[idx] + b[idx];    // even threads do this
} else {
    c[idx] = a[idx] - b[idx];    // odd threads do this (same warp, serialised)
}

// BETTER: branchless (no divergence)
float sign = (threadIdx.x % 2 == 0) ? 1.0f : -1.0f;
c[idx] = a[idx] + sign * b[idx];  // all threads execute the same instruction
```

### 内存合并访问


- ** 已协调访问**:当接连线程访问接连内存地址时,GPU将它们合并为一单内存交易. 这对业绩至关重要。

```cpp
// GOOD: coalesced ， thread 0 reads a[0], thread 1 reads a[1], ...
c[idx] = a[idx] + b[idx];

// BAD: strided ， thread 0 reads a[0], thread 1 reads a[stride], ...
c[idx] = a[idx * stride] + b[idx * stride];  // stride > 1 wastes bandwidth
```

- 对于由32个线程组成的曲速,一个交易中可连入128字节(32×4字节为浮点32). 被勒入需要多个交易,每次加载128字节但只使用分数. 步长为32是最坏的情况:每笔交易负载128字节,但只有一个线程使用4字节(3%的利用率).

### 共享内存与分块


- **tilling图案**是最重要的GPU优化技术. 想法:从慢全球内存装入一块数据到快共享内存,在上计算,再将结果写回.

```cpp
// Matrix multiply with shared memory tiling (simplified)
__global__ void matmul_tiled(const float* A, const float* B, float* C,
                              int M, int N, int K) {
    // Shared memory for one tile of A and one tile of B
    __shared__ float tile_A[TILE_SIZE][TILE_SIZE];
    __shared__ float tile_B[TILE_SIZE][TILE_SIZE];

    int row = blockIdx.y * TILE_SIZE + threadIdx.y;
    int col = blockIdx.x * TILE_SIZE + threadIdx.x;
    float sum = 0.0f;

    // Loop over tiles
    for (int t = 0; t < (K + TILE_SIZE - 1) / TILE_SIZE; t++) {
        // Load one tile of A and B into shared memory
        if (row < M && t * TILE_SIZE + threadIdx.x < K)
            tile_A[threadIdx.y][threadIdx.x] = A[row * K + t * TILE_SIZE + threadIdx.x];
        else
            tile_A[threadIdx.y][threadIdx.x] = 0.0f;

        if (col < N && t * TILE_SIZE + threadIdx.y < K)
            tile_B[threadIdx.y][threadIdx.x] = B[(t * TILE_SIZE + threadIdx.y) * N + col];
        else
            tile_B[threadIdx.y][threadIdx.x] = 0.0f;

        __syncthreads();  // wait for all threads to finish loading

        // Compute partial dot product from this tile
        for (int k = 0; k < TILE_SIZE; k++) {
            sum += tile_A[threadIdx.y][k] * tile_B[k][threadIdx.x];
        }

        __syncthreads();  // wait before loading the next tile
    }

    if (row < M && col < N)
        C[row * N + col] = sum;
}
```

- **`__shared__`**: 声明区块内所有线程(快取,接地)共享的内存.
- **`__syncthreads()`**:一个屏障,它等待到块中所有线程都达到这个点. 需要在写入共享内存和从中读取之间(否则一些线程会读取 stale 数据).
- **为什么平板工作**:没有它,每个线程从全球记忆中负载每乘. 使用平板,一个TILE_SIZE × TILE_SIZE块的数据被一次装入共享内存并被块中的所有线程再用. 复用因子为TILE_SIZE,通过该因子来减少全球内存流量.

## 流与并发


- 默认情况下,CUDA操作是相继进行的:CPU发射一个内核,等待它完成后再发射下个内核. ** 结构**造成重叠:

```cpp
cudaStream_t stream1, stream2;
cudaStreamCreate(&stream1);
cudaStreamCreate(&stream2);

// These operations can overlap: different streams execute concurrently
cudaMemcpyAsync(d_a, h_a, bytes, cudaMemcpyHostToDevice, stream1);
cudaMemcpyAsync(d_b, h_b, bytes, cudaMemcpyHostToDevice, stream2);

kernel1<<<grid, block, 0, stream1>>>(d_a, d_c);
kernel2<<<grid, block, 0, stream2>>>(d_b, d_d);
```

- 流与计算重叠数据传输:同时一个流的内核运行,另一个流复制数据. 这隐藏了PCIe的转会潜伏状态并让GPU忙碌.

## 分析 CUDA 代码


```bash
# NVIDIA Nsight Compute: kernel-level profiling
ncu --set full ./my_program

# NVIDIA Nsight Systems: system-level timeline
nsys profile ./my_program

# Quick metrics
ncu --metrics sm__throughput,dram__throughput ./my_program
```

- ** 寻找什么**:
    - ** 占用**:使用的SM容量的一小部分. 入住率低(< 50%)意味着线条太少,无法隐藏内存的延迟. 原因:每条线程的注册量过多,每块共享内存过多.
    - ** Memory吞吐量**:与峰值带宽比较. 如果您实现了 < 50%的峰值, 内存访问模式效率低下(非混凝土, 银行冲突)。
    - ** 计算吞吐量**:与峰值FLOPS比较。如果内存和计算吞吐量都很低,内核就具有耐久性(不够并行性).

## 高级优化技术


- 高性能的GPU(和CPU)代码除了集成和共享内存平板的基本原理外,还采用几种先进的技术:

### 数据布局：AoS 与 SoA


- ** 结构阵列(AoS)**:每个元素将其所有字段一起存储.`[{x,y,z}, {x,y,z}, {x,y,z}]`.
- ** 阵列结构(SoA)**:每个场被储存在自己相接的阵列中。`{[x,x,x], [y,y,y], [z,z,z]}`.

```cpp
// AoS: BAD for SIMD/GPU (accessing all x values touches non-contiguous memory)
struct Particle { float x, y, z, mass; };
Particle particles[N];
// particles[0].x, particles[1].x are 16 bytes apart

// SoA: GOOD for SIMD/GPU (all x values are contiguous)
struct Particles {
    float x[N], y[N], z[N], mass[N];
};
// x[0], x[1] are 4 bytes apart ， perfect for coalesced access and SIMD
```

- SoA几乎总是在数据并行工作量(SIMD,GPU)方面更快. 当您总是访问一个元素的所有字段时, AoS 效果更好(在数字代码中少有)。PyTorch loters 本质上是SoA:每个特性都是相接维度.

### 软件预取


- CPU可以被告知在需要之前开始加载数据,隐藏内存延迟:

```cpp
#include <xmmintrin.h>  // for _mm_prefetch

for (int i = 0; i < n; i += 4) {
    _mm_prefetch((char*)(a + i + 64), _MM_HINT_T0);  // prefetch 64 elements ahead
    // process a[i:i+4] with SIMD
    __m128 va = _mm_load_ps(a + i);
    // ...
}
```

- 预选指令是一个提示:如果数据已经处于缓存中,那就是一个不操作. 如果不是,CPU在执行其他指令的同时,开始从背景取来. 预切相距(本例中前面的64个元素)应被调谐来配合内存的延迟和循环迭接时间.

### kernel 融合


- ** 内核聚变** 将多个操作组合为一个内核,以避免将中间结果写入内存. 这是ML最有影响力的GPU优化:

```
// UNFUSED: 3 kernel launches, 3 global memory round-trips
y = matmul(x, W)     // write y to global memory
z = y + bias          // read y, write z
out = relu(z)         // read z, write out

// FUSED: 1 kernel launch, 1 global memory write
out = fused_matmul_bias_relu(x, W, bias)  // y and z never leave SRAM
```

- 对于内存绑定的操作(bias add,ReLU,层规范),内存流量主导了执行时间. 引信可以完全消除交通流量。皮托克的药`torch.compile`和Triton可以自动地或以最小的努力进行核聚变。

### 混合精度 kernel


- 使用更低的精度(FP16,BF16,INT8)来进行计算,并使用更高的精度(FP32)来进行积累使两个世界中最好的:

```cpp
// Tensor Core: multiply FP16 matrices, accumulate in FP32
// Each Tensor Core instruction: D (FP32) = A (FP16) × B (FP16) + C (FP32)
nvcuda::wmma::mma_sync(c_frag, a_frag, b_frag, c_frag);
```

- FP16比FP32小2x,因此可以将内存带宽(通常的瓶颈)翻倍并适合缓存中多出2x的数据. Tensor Cores以8-16x的速率为FP32 CUDA核心进行FP16. 这就是为什么混合精度训练(第6章)提供2-3x快取,而精度损失最小.

### 内存池分配器


- `cudaMalloc`慢(~每通呼叫1ms),因为它与GPU同步. 在分配每个迭代的临时缓冲器的训练循环中,这个加起来.

- **记忆池**(PyTorch's cacing accident, CUDA memory pool) 预分出一大块GPU内存并从中分出,没有系统调用:

```python
# PyTorch does this automatically ， but understanding why matters
# Each torch.empty() reuses memory from the pool, no cudaMalloc
temp = torch.empty(1024, 1024, device='cuda')  # microseconds, not milliseconds
```

- 这就是为什么PyTorch的`torch.cuda.memory_allocated()`财务报告和已审计财务报表`torch.cuda.max_memory_allocated()`不同:分配是当前使用的,最大是峰值(池可能持有多于当前使用的).

### 基于性能分析的优化


- 不要盲目地优化。** 标出瓶颈,优化,并重新定位。屋顶线模型(文件01)告诉你瓶颈是记忆还是计算:

    - ** Memory-bound** (低算强度):优化数据布局(SoA),引信内核,使用更低的精度,预取.
    - ** 计算约束**(高算术强度):使用Tensor Cores,增加并行性,使用更快的指令(FMA).
    - ** 有限耐受**(并行性不足):增加占用、减少登记使用、推出更多线程。

- 多数ML的工作量是**内含的**。令人惊讶的暗示:一个更快的GPU(更FLOPS)往往无济于事. 更快的内存(HBM3 vs HBM2e)帮助更多. 这就是为什么A100-H100升级不仅仅是关于FLOPS，，H100也有2x内存带宽.

## NVIDIA GPU 世代


|Generation|Year|Key Innovation|AI Relevance|
|------------|------|----------------|--------------|
|Pascal (P100)| 2016 |HBM2, NVLink|First serious deep learning GPU|
|Volta (V100)| 2017 |**Tensor Cores** (mixed-precision matmul)|Enabled FP16 training, 125 TFLOPS TF32|
|Ampere (A100)| 2020 |TF32, Sparsity, 3rd gen Tensor Cores|312 TFLOPS TF32, structural sparsity 2:4|
|Hopper (H100)| 2022 |**Transformer Engine** (FP8), HBM3|989 TFLOPS FP8, dynamic precision switching|
|Blackwell (B200)| 2024 |2nd gen Transformer Engine, NVLink 5|2.5 PFLOPS FP4, multi-die design|

- ** 传感器Cores**是专门的矩阵乘数单位。单倍分芯指令在一个周期内计算出4×4矩阵乘数(D=A×B+C). 常规CUDA核心需要64个FMA操作. Tensor Cores)是混合精度训练(float16 compute, flob32 building)的由来.

- ** 变压器引擎**(Hopper+)在单层内在FP8和FP16精度之间动态开关,仅在需要的情况下选择更精度. 这样可以最大限度地实现吞吐量,同时又不牺牲模型质量. 它专门设计用于变压器架构(ention + MLP),它主导了现代AI.

## 编程任务（使用 nvcc 编译）


1. 写入一个将 ReLU 应用到数组的 CUDA 内核。测量包括内存传输在内的时间。这教内核写作,cudaMalloc/cudaMemcpy, 和主机\%device 传输瓶颈。
```cpp
// task1_relu.cu
// Compile: nvcc -O3 -o task1_relu task1_relu.cu

#include <stdio.h>
#include <stdlib.h>
#include <cuda_runtime.h>

__global__ void relu_kernel(const float* input, float* output, int n) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < n) {
        output[idx] = input[idx] > 0.0f ? input[idx] : 0.0f;
    }
}

int main() {
    const int N = 1 << 24;  // ~16M elements
    size_t bytes = N * sizeof(float);

    // Allocate host memory
    float* h_input  = (float*)malloc(bytes);
    float* h_output = (float*)malloc(bytes);
    for (int i = 0; i < N; i++) {
        h_input[i] = (float)(i % 100) - 50.0f;  // mix of positive and negative
    }

    // Allocate device memory
    float *d_input, *d_output;
    cudaMalloc(&d_input, bytes);
    cudaMalloc(&d_output, bytes);

    // Time the full pipeline: copy to GPU, compute, copy back
    cudaEvent_t start, stop;
    cudaEventCreate(&start);
    cudaEventCreate(&stop);

    cudaEventRecord(start);
    cudaMemcpy(d_input, h_input, bytes, cudaMemcpyHostToDevice);

    int block_size = 256;
    int grid_size = (N + block_size - 1) / block_size;
    relu_kernel<<<grid_size, block_size>>>(d_input, d_output, N);

    cudaMemcpy(h_output, d_output, bytes, cudaMemcpyDeviceToHost);
    cudaEventRecord(stop);
    cudaEventSynchronize(stop);

    float ms = 0;
    cudaEventElapsedTime(&ms, start, stop);

    // Verify
    int errors = 0;
    for (int i = 0; i < N; i++) {
        float expected = h_input[i] > 0.0f ? h_input[i] : 0.0f;
        if (h_output[i] != expected) errors++;
    }

    printf("Time (including transfers): %.2f ms\n", ms);
    printf("Bandwidth: %.1f GB/s\n", 2.0 * bytes / ms / 1e6);  // read + write
    printf("Errors: %d / %d\n", errors, N);

    cudaFree(d_input); cudaFree(d_output);
    free(h_input); free(h_output);
    return 0;
}
```

2. 使用共享内存在 CUDA 中写入平面矩阵乘法。将性能与天真(非平板)版本相提并论. 这教会了共享记忆`__syncthreads`以及为什么板块很重要。
```cpp
// task2_matmul.cu
// Compile: nvcc -O3 -o task2_matmul task2_matmul.cu

#include <stdio.h>
#include <cuda_runtime.h>

#define TILE 16

// Naive matmul: each thread computes one element of C
__global__ void matmul_naive(const float* A, const float* B, float* C, int N) {
    int row = blockIdx.y * blockDim.y + threadIdx.y;
    int col = blockIdx.x * blockDim.x + threadIdx.x;
    if (row < N && col < N) {
        float sum = 0.0f;
        for (int k = 0; k < N; k++) {
            sum += A[row * N + k] * B[k * N + col];
        }
        C[row * N + col] = sum;
    }
}

// Tiled matmul: use shared memory to reduce global memory accesses
__global__ void matmul_tiled(const float* A, const float* B, float* C, int N) {
    __shared__ float sA[TILE][TILE];
    __shared__ float sB[TILE][TILE];

    int row = blockIdx.y * TILE + threadIdx.y;
    int col = blockIdx.x * TILE + threadIdx.x;
    float sum = 0.0f;

    for (int t = 0; t < (N + TILE - 1) / TILE; t++) {
        sA[threadIdx.y][threadIdx.x] = (row < N && t*TILE+threadIdx.x < N)
            ? A[row * N + t*TILE + threadIdx.x] : 0.0f;
        sB[threadIdx.y][threadIdx.x] = (t*TILE+threadIdx.y < N && col < N)
            ? B[(t*TILE + threadIdx.y) * N + col] : 0.0f;

        __syncthreads();
        for (int k = 0; k < TILE; k++)
            sum += sA[threadIdx.y][k] * sB[k][threadIdx.x];
        __syncthreads();
    }

    if (row < N && col < N)
        C[row * N + col] = sum;
}

int main() {
    const int N = 1024;
    size_t bytes = N * N * sizeof(float);

    float *d_A, *d_B, *d_C;
    cudaMalloc(&d_A, bytes); cudaMalloc(&d_B, bytes); cudaMalloc(&d_C, bytes);

    // Initialise with ones (easy to verify: C should be all N)
    float* h_A = new float[N*N];
    for (int i = 0; i < N*N; i++) h_A[i] = 1.0f;
    cudaMemcpy(d_A, h_A, bytes, cudaMemcpyHostToDevice);
    cudaMemcpy(d_B, h_A, bytes, cudaMemcpyHostToDevice);

    dim3 block(TILE, TILE);
    dim3 grid((N+TILE-1)/TILE, (N+TILE-1)/TILE);

    // Benchmark naive
    cudaEvent_t start, stop;
    cudaEventCreate(&start); cudaEventCreate(&stop);

    cudaEventRecord(start);
    for (int i = 0; i < 10; i++)
        matmul_naive<<<grid, block>>>(d_A, d_B, d_C, N);
    cudaEventRecord(stop);
    cudaEventSynchronize(stop);
    float naive_ms; cudaEventElapsedTime(&naive_ms, start, stop);

    // Benchmark tiled
    cudaEventRecord(start);
    for (int i = 0; i < 10; i++)
        matmul_tiled<<<grid, block>>>(d_A, d_B, d_C, N);
    cudaEventRecord(stop);
    cudaEventSynchronize(stop);
    float tiled_ms; cudaEventElapsedTime(&tiled_ms, start, stop);

    double gflops_naive = 2.0 * N * N * N * 10 / naive_ms / 1e6;
    double gflops_tiled = 2.0 * N * N * N * 10 / tiled_ms / 1e6;

    printf("Naive:  %.2f ms, %.1f GFLOPS\n", naive_ms/10, gflops_naive);
    printf("Tiled:  %.2f ms, %.1f GFLOPS\n", tiled_ms/10, gflops_tiled);
    printf("Speedup: %.1fx\n", naive_ms / tiled_ms);

    cudaFree(d_A); cudaFree(d_B); cudaFree(d_C);
    delete[] h_A;
    return 0;
}
```

3. 显示曲率差分。写一个内核,在同一曲面上线程取出不同的分枝,与无分枝版本进行比较.
```cpp
// task3_divergence.cu
// Compile: nvcc -O3 -o task3_diverge task3_divergence.cu

#include <stdio.h>
#include <cuda_runtime.h>

// BAD: warp divergence ， even/odd threads take different paths
__global__ void divergent_kernel(float* data, int n) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < n) {
        if (idx % 2 == 0) {
            data[idx] = data[idx] * 2.0f + 1.0f;
        } else {
            data[idx] = data[idx] * 0.5f - 1.0f;
        }
    }
}

// GOOD: branchless ， all threads execute the same instruction
__global__ void branchless_kernel(float* data, int n) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx < n) {
        float scale = (idx % 2 == 0) ? 2.0f : 0.5f;
        float offset = (idx % 2 == 0) ? 1.0f : -1.0f;
        data[idx] = data[idx] * scale + offset;
    }
}

int main() {
    const int N = 1 << 24;
    float* d_data;
    cudaMalloc(&d_data, N * sizeof(float));
    cudaMemset(d_data, 0, N * sizeof(float));

    int block = 256, grid = (N + block - 1) / block;

    cudaEvent_t start, stop;
    cudaEventCreate(&start); cudaEventCreate(&stop);

    // Divergent
    cudaEventRecord(start);
    for (int i = 0; i < 100; i++)
        divergent_kernel<<<grid, block>>>(d_data, N);
    cudaEventRecord(stop);
    cudaEventSynchronize(stop);
    float div_ms; cudaEventElapsedTime(&div_ms, start, stop);

    // Branchless
    cudaEventRecord(start);
    for (int i = 0; i < 100; i++)
        branchless_kernel<<<grid, block>>>(d_data, N);
    cudaEventRecord(stop);
    cudaEventSynchronize(stop);
    float nodiv_ms; cudaEventElapsedTime(&nodiv_ms, start, stop);

    printf("Divergent:  %.2f ms\n", div_ms / 100);
    printf("Branchless: %.2f ms\n", nodiv_ms / 100);
    printf("Speedup:    %.2fx\n", div_ms / nodiv_ms);

    cudaFree(d_data);
    return 0;
}
```
