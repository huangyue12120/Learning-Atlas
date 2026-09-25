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

*GPU 通过大规模并行计算推动了 AI 发展。本文介绍 CPU 与 GPU 的设计取舍、GPU 内存层级、用 C++ 编写 CUDA 程序、SIMT 执行、内存访问、同步、流、性能分析工具和 NVIDIA GPU 代际。*

- 需要 CUDA 实例和完整示例时，可查看配套教程仓库：[CUDA 教程仓库](https://github.com/HenryNdubuaku/cuda-tutorials)。

- 现代 NVIDIA GPU 可能有超过 10,000 个 CUDA 运算核心，CPU 通常有少得多、结构更复杂的核心。原文列出的 GPU 1,000–20,000、CPU 4–128 只是不同硬件的数量级示例；两种“核心”不能直接按数量比较。GPU 的优势来自大量并行执行单元、高内存带宽和调度方式，适合处理规模大、并行度高的矩阵运算。

- 即使你不亲自写 CUDA 内核，了解 GPU 架构也能解释批大小为何重要、哪些内核受带宽或计算能力限制，以及散布访问和同一 warp 内的分支差异为何可能拖慢程序。具体瓶颈要通过分析确认。

## GPU 与 CPU：设计目标不同

- CPU 重视**延迟**，会投入大量晶体管用于缓存、分支预测和乱序执行，尽量缩短单个任务的响应时间。

- GPU 重视**吞吐量**，把更多资源放在执行单元上，并通过调度其他 warp 来隐藏部分等待时间。单个线程不一定慢，但 GPU 更擅长同时推进大量可并行工作。

| 对比项 | CPU | GPU |
| --- | --- | --- |
| 核心/执行单元 | 少量结构复杂的核心；原文示例为 4–128 | 大量并行执行单元；原文示例为 1,000–20,000 个 CUDA 核心 |
| 时钟频率 | 原文示例为 3–5 GHz | 原文示例为 1–2.5 GHz |
| 缓存与片上存储 | 多级缓存，部分 CPU 的 L3 达 32 MB 以上 | 有每个 SM 的缓存和共享内存，也有全 GPU 共享的 L2 |
| 分支处理 | 通常有复杂的分支预测和乱序执行 | 同一 warp 的线程共享指令流；分支路径不同时会发生发散 |
| 适合的工作 | 响应时间敏感、控制流复杂的任务 | 吞吐量要求高、数据并行的任务 |
| FP32 峰值 | 原文示例为 1–5 TFLOPS | 原文示例为 30–80 TFLOPS |
| 内存带宽 | 原文示例为 50–100 GB/s | 原文示例为 1–3 TB/s |

- 表中的频率、核心数、缓存和峰值 FLOPS 随产品代际与配置变化，只能帮助比较数量级。GPU 的 HBM 带宽常高于 CPU 内存带宽；对逐元素运算等内存带宽受限内核，这个差异可能比峰值算力更重要。矩阵乘法等计算密集型运算则可能受计算能力限制。

## GPU 内存层级

- 分析 GPU 内核时要区分计算能力与数据传输。很多内核会受内存访问限制，但不能据此断定计算永远不是瓶颈。

| 存储层级 | 容量示例 | 延迟示例 | 带宽示例 | 作用范围 |
| --- | --- | --- | --- | --- |
| 寄存器 | 每个 SM 约 256 KB | 指令直接读取，不应理解为零周期 | 最高 | 每个线程私有 |
| 共享内存 | 每个 SM 约 48–228 KB | 约 5 个周期 | 约 20 TB/s | 同一线程块 |
| L1 缓存 | 每个 SM 约 128–256 KB | 约 30 个周期 | 原文未列 | 每个 SM |
| L2 缓存 | 约 4–96 MB | 约 200 个周期 | 约 6 TB/s | GPU 上多个 SM 共用 |
| 全局显存（HBM/VRAM） | 约 24–192 GB | 约 400 个周期 | 约 1–3.3 TB/s | 整个 GPU |

- 这些容量、延迟和带宽是不同代际硬件的近似值，不会同时适用于同一张卡。延迟也会随缓存命中、时钟频率和访问方式改变。寄存器操作没有独立的显存访问等待，但寄存器运算仍有指令延迟。

- **寄存器**速度快、容量有限。每个线程有自己的寄存器；某些 GPU 每线程最多可分配约 255 个 32 位寄存器。寄存器使用量增加可能减少同一 SM 上能同时驻留的 warp 数，也可能导致寄存器溢出到较慢的本地内存。

- **共享内存**是由程序显式管理、同一线程块共享的片上存储，不是硬件自动维护的缓存。CUDA 内核常先把全局显存中的数据块载入共享内存，再重复使用，这种方法称为**分块（tiling）**。

- **全局显存（HBM/VRAM）**容量大，访问延迟高。内核可以从全局显存读写数据；优化时通常要减少不必要的传输，并让线程按高效顺序访问。

## CUDA 编程模型

- CUDA（Compute Unified Device Architecture）是 NVIDIA 的 GPU 编程模型。你编写在 GPU 上运行的**内核**，CUDA 再把内核工作分配给大量线程。

### 层级：网格、线程块与线程

- CUDA 以网格（grid）、线程块（block）和线程（thread）组织工作：

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


- **线程**是最小执行单元。`threadIdx.x` 给出线程在当前块中的索引。
- **线程块**由一组线程组成，块内线程可以共享内存并通过块级屏障同步。`blockIdx.x` 是块索引，`blockDim.x` 是块宽度。每块最多 1024 个线程是许多 NVIDIA GPU 的常见上限，具体限制取决于架构和资源配置。
- **网格**包含一次内核启动的所有线程块，可以是一维、二维或三维。

- 每个线程可按索引计算自己负责的数据位置，例如 `int idx = blockIdx.x * blockDim.x + threadIdx.x;`。处理数组时还要检查 `idx` 是否超出长度。

### 第一个 CUDA 内核

- 下面的向量加法示例演示设备内存分配、主机与设备之间复制、启动内核和取回结果：

```cpp
// vector_add.cu — CUDA source file (.cu extension)

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


- **CUDA 中的 C++ 概念**：
    - `__global__` 标记可由 CPU（host）启动、并在 GPU（device）运行的内核。
    - `<<<grid_size, block_size>>>` 是内核启动语法，用于指定网格和线程块规模。
    - `cudaMalloc` / `cudaFree` 管理 GPU 设备内存，概念上类似 `new` / `delete`，但内存属于设备。
    - `cudaMemcpy` 在主机和设备之间复制数据。对于经 PCIe 连接的独立 GPU，链路带宽通常低于 GPU 显存带宽；约 32 GB/s 只适用于特定 PCIe 代际和配置。

### Warp 与 SIMT

- NVIDIA GPU 把 32 个线程组成一个 **warp**。同一 warp 中的活动线程按 SIMT（Single Instruction, Multiple Threads，单指令、多线程）模型执行同一条指令；这与 SIMD 的向量化思想相似，但程序员通常以线程为单位编写 CUDA 代码。

- **Warp 发散**发生在同一 warp 的线程走不同分支时。GPU 会按路径执行指令，并屏蔽当前不走该路径的线程。若两个分支工作量相近，warp 可能依次执行两条路径；性能影响由路径数量和工作量决定，不固定等于减半。

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

- **内存合并访问**：同一 warp 内相邻线程访问相邻地址时，硬件通常能把请求合并为较少的内存事务，减少传输开销。线程跨很大步长访问时，事务数量可能增加。

```cpp
// GOOD: coalesced — thread 0 reads a[0], thread 1 reads a[1], ...
c[idx] = a[idx] + b[idx];

// BAD: strided — thread 0 reads a[0], thread 1 reads a[stride], ...
c[idx] = a[idx * stride] + b[idx * stride];  // stride > 1 wastes bandwidth
```


- 以 32 个线程各读取一个 float32 为例，连续地址共计 128 字节。按 128 字节事务计算，这 32 次读取可由一次事务覆盖。实际事务会按 GPU 架构、缓存和扇区大小拆分；步长为 32 时常会触及许多缓存扇区，若按 128 字节事务估算，只用到每个扇区 4 字节约为 3%。因此 3% 是特定事务粒度下的示意值，不是所有 GPU 的固定利用率。

### 共享内存与分块

- **分块**是常用的 GPU 优化方法：把全局显存中的一个数据块载入共享内存，在块内重复使用，再写回结果。

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


- `__shared__` 声明同一线程块共享的片上内存。
- `__syncthreads()` 等待块内所有线程到达屏障。在线程写共享内存后、其他线程读取之前，需要同步；如果部分线程提前退出，却有其他线程到达屏障，程序可能出错或挂起。
- 分块可让同一块中的多个线程重用已载入的数据。矩阵乘法示例每轮载入 `TILE_SIZE × TILE_SIZE` 的数据块；在形状、边界和缓存等条件满足时，数据复用能减少全局显存流量。实际减少比例取决于矩阵尺寸和访问方式。

## CUDA 流与并发

- 同一 CUDA 流中的操作按提交顺序执行。内核启动通常对 CPU 异步返回，因此 CPU 可以继续提交工作。**CUDA 流**允许 GPU 在资源、依赖和传输条件合适时重叠不同操作：

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


- 跨流工作不保证自动并行。要让主机到设备复制异步且能与内核重叠，通常需要固定（pinned）主机内存、`cudaMemcpyAsync`、支持并发传输的硬件和正确的事件依赖。读取结果前应同步相应流或事件。示例仅演示提交方式，未创建固定内存、添加同步或销毁流。

## CUDA 性能分析

- NVIDIA 提供不同粒度的性能分析工具：

```bash
# NVIDIA Nsight Compute: kernel-level profiling
ncu --set full ./my_program

# NVIDIA Nsight Systems: system-level timeline
nsys profile ./my_program

# Quick metrics
ncu --metrics sm__throughput,dram__throughput ./my_program
```


- **查看的指标**：
    - **占用率（occupancy）**：SM 上活动 warp 数占可驻留 warp 上限的比例。占用率低可能减少隐藏内存延迟的机会；寄存器和共享内存占用只是影响因素之一。高占用率本身也不保证内核更快。
    - **内存吞吐量**：结合内核类型和峰值带宽看。带宽利用率较低可能来自内存合并访问不足或共享内存 bank 冲突，也可能是工作量太小、算术指令较多或并行度不足。
    - **计算吞吐量**：与相应精度和稀疏设置下的峰值相比。若计算和内存带宽利用率都低，可检查并行度、指令延迟和同步开销。

## 进阶优化方法

- 合并访问和共享内存分块之外，GPU 与 CPU 程序还会用到以下技术：

### 数据布局：AoS 与 SoA

- **结构体数组（AoS）**把每个元素的所有字段放在一起，例如 `[{x,y,z}, {x,y,z}, {x,y,z}]`。
- **数组结构（SoA）**把每个字段分别存入连续数组，例如 `{[x,x,x], [y,y,y], [z,z,z]}`。

```cpp
// AoS: BAD for SIMD/GPU (accessing all x values touches non-contiguous memory)
struct Particle { float x, y, z, mass; };
Particle particles[N];
// particles[0].x, particles[1].x are 16 bytes apart

// SoA: GOOD for SIMD/GPU (all x values are contiguous)
struct Particles {
    float x[N], y[N], z[N], mass[N];
};
// x[0], x[1] are 4 bytes apart — perfect for coalesced access and SIMD
```


- 如果相邻线程只处理同一字段，SoA 通常更利于 SIMD 和 GPU 内存合并访问；如果每个线程总要读取一个元素的全部字段，AoS 也可能合适。PyTorch 张量是否连续、字段是否分开存放取决于张量形状、步长和数据布局，不能一概称为 SoA。

### 软件预取

- CPU 可在数据真正使用前发出预取提示，尝试隐藏内存延迟：

```cpp
#include <xmmintrin.h>  // for _mm_prefetch

for (int i = 0; i < n; i += 4) {
    _mm_prefetch((char*)(a + i + 64), _MM_HINT_T0);  // prefetch 64 elements ahead
    // process a[i:i+4] with SIMD
    __m128 va = _mm_load_ps(a + i);
    // ...
}
```


- `_mm_prefetch` 是 x86 CPU 指令的预取提示，不是 CUDA GPU 内核指令。处理器可以忽略提示；数据已在缓存中时可能不需要从更远的内存层取回。示例提前 64 个元素预取，具体距离应结合缓存、循环步长和测量结果调整。示例中的 `_mm_load_ps` 要求 `a + i` 按 16 字节对齐；未对齐时应改用 `_mm_loadu_ps` 或保证分配对齐。

### 内核融合

- **内核融合**把多个运算合并到一次内核启动，减少中间结果写回全局显存再读回的次数：

```
// UNFUSED: 3 kernel launches, 3 global memory round-trips
y = matmul(x, W)     // write y to global memory
z = y + bias          // read y, write z
out = relu(z)         // read z, write out

// FUSED: 1 kernel launch, 1 global memory write
out = fused_matmul_bias_relu(x, W, bias)  // y and z never leave SRAM
```


- 对偏置加法、ReLU、LayerNorm 等带宽受限运算，融合可减少中间数据传输和启动开销。中间值可能留在寄存器或共享内存中，但不能概括为“完全没有内存流量”。`torch.compile` 和 Triton 可在支持的场景融合运算；能否融合取决于图结构、编译器和设备，融合也可能增加寄存器压力。

### 混合精度内核

- 混合精度常用较低精度做乘法，用较高精度累加，例如 FP16 输入、FP32 累加：

```cpp
// Tensor Core: multiply FP16 matrices, accumulate in FP32
// Each Tensor Core instruction: D (FP32) = A (FP16) × B (FP16) + C (FP32)
nvcuda::wmma::mma_sync(c_frag, a_frag, b_frag, c_frag);
```


- FP16 每个数占用的字节数是 FP32 的一半，可减少某些内核的数据传输量，也能让缓存容纳更多元素；这不等于硬件带宽本身翻倍。部分 Tensor Core 在特定精度下的理论吞吐量可达普通 CUDA 核心 FP32 吞吐量的 8 到 16 倍，具体取决于 GPU 代际、稀疏设置和比较基准。混合精度训练的加速与精度影响也依模型和训练方法而变；原文列出的 2–3 倍提速和较小精度损失只是示例。

### 内存池分配器

- `cudaMalloc` 在训练循环中反复调用可能带来明显开销，也可能触发同步；耗时取决于分配器、设备和调用情境，不能固定说每次需要 1 毫秒。

- PyTorch 缓存分配器和 CUDA 内存池可以预留设备内存，再从已预留的区块中分配临时缓冲区，以减少底层分配调用：

```python
# PyTorch does this automatically — but understanding why matters
# Each torch.empty() reuses memory from the pool, no cudaMalloc
temp = torch.empty(1024, 1024, device='cuda')  # microseconds, not milliseconds
```


- `torch.cuda.memory_allocated()` 表示当前张量占用的显存；`torch.cuda.max_memory_allocated()` 表示统计以来的峰值。缓存分配器保留但暂未由张量使用的内存应看 `torch.cuda.memory_reserved()` 等指标，不能从这两个函数的差值直接得出池中保留量。

### 基于性能分析的优化

- 不要凭猜测优化。先分析瓶颈，针对它修改，再重新测量。第 16 章文件 01 的屋顶线模型可帮助判断内核更受带宽还是计算能力限制：

    - **内存带宽受限**（算术强度低）：检查数据布局和内存合并访问，融合内核，评估较低精度。CPU 预取不适用于 CUDA GPU 内核。
    - **计算能力受限**（算术强度高）：在精度和数值结果允许时使用 Tensor Core，提高并行度或采用更合适的指令。
    - **延迟受限**（并行工作不足或等待时间难以隐藏）：评估活动 warp 数、寄存器使用、同步和任务规模，不要只为了提高占用率而增加线程。

- 不少逐元素和中间数据运算受内存带宽限制，大型矩阵乘法则常受计算能力限制。升级到更快的 GPU 是否有帮助，取决于内核瓶颈。A100 与 H100 的带宽确有差别，但精确比值受具体型号和配置影响。

## NVIDIA GPU 代际

| 代际 | 发布年份 | 主要变化 | AI 相关能力示例 |
| --- | ---: | --- | --- |
| Pascal（P100） | 2016 | HBM2、NVLink | 深度学习 GPU 的早期代表 |
| Volta（V100） | 2017 | 引入 Tensor Core | FP16 峰值约 125 TFLOPS；不是 TF32 |
| Ampere（A100） | 2020 | TF32、结构化稀疏、第三代 Tensor Core | TF32 峰值受 2:4 稀疏设置影响；稠密约 156 TFLOPS，稀疏峰值约 312 TFLOPS |
| Hopper（H100） | 2022 | Transformer Engine、HBM3 | FP8 峰值可达约 989 TFLOPS，具体依型号和稀疏设置 |
| Blackwell（B200） | 2024 | 第二代 Transformer Engine、NVLink 5、多芯片设计 | 原文列出 FP4 约 2.5 PFLOPS；峰值依配置和稀疏度而变 |

- **Tensor Core** 是矩阵乘加单元。它的指令形状取决于硬件代际、数据类型和 API；不能固定说一条指令只算 $4 \times 4$ 矩阵或一个周期完成。对于 $4 \times 4$ 的输出块，普通 CUDA 核心按标量方式计算会执行 64 次乘加，而 Tensor Core 可用矩阵指令处理一块数据。FP16 输入、FP32 累加是常见组合之一。

- **Transformer Engine** 随 Hopper 引入，可在支持的框架和模型中管理 FP8 量化、缩放和精度选择。实际精度策略并非对每层都自动在 FP8/FP16 间任意切换；吞吐量与模型质量取决于配方、硬件和工作负载。

## 编程练习（使用 nvcc 编译）

1. 编写 CUDA 内核对数组应用 ReLU，并测量包含主机与设备数据传输的总时间。练习编写内核、调用 `cudaMalloc` / `cudaMemcpy`，以及观察主机与设备之间的数据传输开销。

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


- 示例的计时包括复制和内核；打印的带宽却只按内核读取与写出两个数组的 `2 × bytes` 计算，没有把主机到设备、设备到主机的复制量计入分子。因此该数字不能当作纯内核显存带宽。要比较内核本身，可单独计时并重复启动；要比较端到端速度，则应明确统计传输字节数和同步方式。

2. 用共享内存编写分块矩阵乘法，并与朴素版本比较。练习共享内存、`__syncthreads()` 和分块复用。

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


- 示例用全 1 矩阵，理论上结果矩阵的每个元素都应为 $N$，但代码没有实际校验结果；比较性能前应先验证输出。首次启动、预热、设备频率和编译器优化也会影响计时。

3. 编写会产生 warp 发散的内核，并与无分支版本比较。让同一 warp 中的线程走不同路径，观察执行时间。

```cpp
// task3_divergence.cu
// Compile: nvcc -O3 -o task3_diverge task3_divergence.cu

#include <stdio.h>
#include <cuda_runtime.h>

// BAD: warp divergence — even/odd threads take different paths
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

// GOOD: branchless — all threads execute the same instruction
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


- 发散路径是否减速取决于每条路径的工作量；无分支版本也可能执行更多算术指令。计时前要确认编译器生成了预期分支，并校验两个内核的结果。
