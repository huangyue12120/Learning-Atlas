---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 16 - SIMD and GPU programming/05. triton, TPUs and pallax.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 00c10d97716897e230e9254a75371024506e61be836fd5f3b8591e1a86a65b80
status: reviewed
---
# Triton、TPU 与 Pallas

*CUDA C 功能强大但较为冗长。Triton 让你能用 Python 编写 GPU 内核。TPU 则是另一类硬件选择，取舍与 GPU 不同。本文介绍 Triton 内核编程，以 Flash Attention 为案例说明内核优化，并讲解 TPU 架构、JAX/Pallas 以及如何选择合适的工具。Vulkan 与跨平台 GPU 计算见文件 07。*

- 上一篇介绍了 CUDA C GPU 编程。本文沿抽象层次向上一步：Triton 用 Python 和约 20% 的开发工作量即可获得约 80% 的 CUDA 性能。TPU 与 Vulkan 则为特定用例提供了其他硬件目标。

## Triton：GPU 内核的 Python

- **Triton**（OpenAI）是一种基于 Python 的 GPU 内核编程语言。不同于 CUDA 中逐个考虑线程，你在 Triton 中围绕数据**块**思考。Triton 编译器会自动处理线程映射、合并内存访问、共享内存管理和许多优化。

- **Triton 的意义**：CUDA C 要求开发者深入理解 warp 调度、共享内存 bank 冲突、寄存器压力和合并访问模式。Triton 抽象掉其中大部分细节，让熟悉 Python 但不熟悉系统编程的机器学习研究者也能开发 GPU 内核。

### 你第一个 Triton 内核

```python
import triton
import triton.language as tl
import torch

@triton.jit
def add_kernel(
    x_ptr, y_ptr, output_ptr,
    n_elements,
    BLOCK_SIZE: tl.constexpr,  # compile-time constant
):
    # Each program instance processes one block of BLOCK_SIZE elements
    pid = tl.program_id(axis=0)  # which block am I?
    block_start = pid * BLOCK_SIZE

    # Offsets for this block
    offsets = block_start + tl.arange(0, BLOCK_SIZE)

    # Mask to handle the case where n_elements is not a multiple of BLOCK_SIZE
    mask = offsets < n_elements

    # Load data (masked: out-of-bounds reads return 0)
    x = tl.load(x_ptr + offsets, mask=mask)
    y = tl.load(y_ptr + offsets, mask=mask)

    # Compute
    output = x + y

    # Store result
    tl.store(output_ptr + offsets, output, mask=mask)


def add(x: torch.Tensor, y: torch.Tensor) -> torch.Tensor:
    output = torch.empty_like(x)
    n_elements = output.numel()

    # Launch: one program per block
    grid = lambda meta: (triton.cdiv(n_elements, meta['BLOCK_SIZE']),)
    add_kernel[grid](x, y, output, n_elements, BLOCK_SIZE=1024)

    return output


# Usage
x = torch.randn(1000000, device='cuda')
y = torch.randn(1000000, device='cuda')
z = add(x, y)
```

- **与 CUDA 的关键区别**:
    - 没有显式线程管理。你思考的是 **块** (程序)，而不是线程。
    - `tl.arange(0, BLOCK_SIZE)` 创建一个偏移量向量，用于整个块。该向量上的所有操作都会自动向量化。
    - `mask` 处理边界条件（类似文件 03 的 AVX-512 掩码寄存器），无需单独的标量清理循环。
    - `tl.load` 和 `tl.store` 会自动处理合并访问。
    - `@triton.jit` 在首次调用时把函数编译为 PTX（GPU 汇编），然后缓存编译后的内核。

### Triton Softmax 内核

- Softmax 是很好的 Triton 示例，因为它需要多次遍历数据（求最大值、相减、取指数、求和、相除），而在这些遍历之间把数据保留在 SRAM（共享内存）中会带来明显收益：

```python
@triton.jit
def softmax_kernel(
    output_ptr, input_ptr, input_row_stride, output_row_stride, n_cols,
    BLOCK_SIZE: tl.constexpr,
):
    # Each program handles one row
    row_idx = tl.program_id(0)
    row_start = input_ptr + row_idx * input_row_stride

    # Load the row
    col_offsets = tl.arange(0, BLOCK_SIZE)
    mask = col_offsets < n_cols
    row = tl.load(row_start + col_offsets, mask=mask, other=-float('inf'))

    # Softmax: max for numerical stability, then exp, then normalise
    row_max = tl.max(row, axis=0)
    numerator = tl.exp(row - row_max)
    denominator = tl.sum(numerator, axis=0)
    softmax_output = numerator / denominator

    # Store result
    output_start = output_ptr + row_idx * output_row_stride
    tl.store(output_start + col_offsets, softmax_output, mask=mask)
```

- 在 PyTorch 中，`F.softmax(x, dim=-1)` 会启动 3 个独立内核（求最大值、取指数并求和、相除），每个内核都要读写全局内存。Triton 版本在一个内核中完成全部操作，把数据保留在寄存器/SRAM 中。正是这种**内核融合**，使自定义 Triton 内核可能比 PyTorch 内置操作快 2–4 倍。

> **编者注：** 这是源文用于说明融合收益的比较口径；不能把 `F.softmax` 固定理解为三次内核启动。实际实现可能已融合，性能差异需在指定版本、形状、数据类型和硬件上测量。前面加法示例的注释称掩码越界加载返回 0，但 `tl.load` 未指定 `other=0`；无效位置的返回值不应被使用，本例依靠写入掩码避免写出这些位置。

### Triton 自动调优

- Triton 支持**自动调优**：尝试多个配置并选择最快的配置：

```python
@triton.autotune(
    configs=[
        triton.Config({'BLOCK_SIZE_M': 128, 'BLOCK_SIZE_N': 128, 'BLOCK_SIZE_K': 32}),
        triton.Config({'BLOCK_SIZE_M': 64, 'BLOCK_SIZE_N': 256, 'BLOCK_SIZE_K': 32}),
        triton.Config({'BLOCK_SIZE_M': 256, 'BLOCK_SIZE_N': 64, 'BLOCK_SIZE_K': 64}),
    ],
    key=['M', 'N', 'K'],  # re-tune when these change
)
@triton.jit
def matmul_kernel(a_ptr, b_ptr, c_ptr, M, N, K, ...):
    ...
```

- Triton 会在实际硬件上对每个配置做基准测试并选择最快者。最佳分块大小取决于 GPU 架构、矩阵维度和内存布局；自动调优无需人工逐项实验即可找到它们。

### Triton vs CUDA：何时使用哪种

| | Triton | CUDA C |
|--|--------|--------|
| 语言 | Python | C/C++ |
| 抽象级别 | 块级 | 线程级 |
| 开发速度 | 快 (每个内核 10-50 行) | 慢 (100-500 行) |
| 性能上限 | ~80-95% 的手动调优 CUDA | 100% (完全硬件控制) |
| 共享内存 | 自动 | 手动 |
| 合并访问 | 自动 | 手动 |
| warp 级原语 | 有限 | 完整（shuffle、vote 等） |
| 硬件支持 | 仅 NVIDIA（AMD 为实验性支持） | 仅 NVIDIA |

- **使用 Triton** 用于：融合内核、自定义注意力模式、激活函数、大多数 ML 研究内核需求。
- **使用 CUDA C** 的场景：追求最高性能（最后 5%–20%）、需要 warp 级原语、存在复杂的数据依赖并行性，或 Triton 无法表达所需模式。

## 案例研究：Flash Attention

- **Flash Attention** (Dao et al., 2022) 是最近机器学习中最具影响力的自定义内核。它使用 $O(n)$ 的内存计算注意力，而不是 $O(n^2)$，从而使序列长度大大增加。

- **问题**: 标准注意力计算 $\text{softmax}(QK^T / \sqrt{d}) \cdot V$。其中，$QK^T$ 矩阵是 $n \times n$，其中 $n$ 是序列长度。当 $n = 128K$ 时，该矩阵为 $128K \times 128K \times 4$ 字节 = 64 GB。它无法放入 GPU 内存中。

- **洞见**：不必实体化完整的 $n \times n$ 矩阵。可以按**分块（tile）**计算：加载一个 $Q$ 块和一个 $K$ 块，计算部分注意力分数、累积结果，再处理下一块。完整的 $n \times n$ 矩阵从未被实体化；SRAM 中每次只存在一个分块。

- **在线 softmax**: 关键在于 softmax，它需要知道整个行的最大值（为了数值稳定性）。Flash Attention 使用 **在线 softmax** 技术：维护一个滚动最大值，并在找到新的最大值时重新缩放先前计算的值。这样就可以逐步计算 softmax 了，一次一个 tile。

- 算法如下：

```
For each block of Q rows:
    For each block of K columns:
        1. Load Q_block from HBM to SRAM
        2. Load K_block from HBM to SRAM
        3. Compute S_block = Q_block @ K_block.T (in SRAM)
        4. Update running max, rescale previous results
        5. Compute exp(S_block - running_max)
        6. Update running sum and output accumulator
    Load V_block and compute final output
    Write output block back to HBM
```

- **为什么它很快**：内层循环完全在 SRAM（共享内存）中运行。只有从全局内存（HBM）加载 $Q$、$K$、$V$ 分块以及写回最终输出时才访问 HBM。数据复用系数与 SRAM 容量成正比，而 SRAM 的访问速度约为 HBM 的 100 倍。

> **编者注：** 上面的伪代码省略了关键细节：每轮处理 K 分块时，也需使用对应 V 分块更新输出累加器，并在最大值变化时重缩放；不能只在内层循环结束后加载一个 V 分块。这里保留源文示意供对照，不能直接据此实现完整算法。

- Flash Attention 同时有 Triton 和 CUDA C 实现。源文称 CUDA 版本效率约高 10%，而 Triton 版本更易阅读和修改，适合研究新的注意力变体。

## TPU 架构

- **TPU**（张量处理单元）是谷歌的自定义机器学习加速器。它在 GPU 的方法上采取了截然不同的方式：

- **脉动阵列**: TPU 的核心计算单元是一个 **矩阵乘法单元 (MXU)**，一个 128×128 或 256×256 的脉动阵列，通过流过网格中的乘加单元来计算矩阵乘法。数据从边缘进入并穿过阵列传播，每个单元执行一次乘加操作并将结果传递给下一个单元。

- GPU 会调度数千个独立线程，而脉动阵列是一条确定性的单一数据流：没有线程调度、warp 分歧或分支预测。这样的简洁结构使 MXU 执行矩阵乘法时极为节能。

- **HBM**: TPU 使用与 GPU 相同的 High Bandwidth Memory。TPU v5e 每片芯片有 16 GB HBM2e；TPU v5p 有 95 GB HBM2e。

- **ICI**（芯片间互连）：TPU pod 通过定制高速网络连接数百个 TPU。JAX 原生支持跨 TPU pod 的数据并行和模型并行（第 6 章）。

- **BFloat16**: TPU 是第一个使用 bfloat16 (第 13 章，文件 02) 的。BF16 与 float32 具有相同的指数范围（防止训练过程中溢出），但有更小的有效数字精度。 这对机器学习来说是一个理想的权衡，因为梯度值跨度大，但不需要 23 位精度。

### 通过 JAX 和 Pallas 进行 TPU 编程

- 通过 **JAX** 和 **XLA** 对 TPU 进行编程。 您编写 Python/JAX 代码、`jax.jit` 将其编译为 XLA HLO，然后 XLA 将 HLO 编译为 TPU 特定指令。 没有 CUDA、没有 C++。

```python
import jax
import jax.numpy as jnp

@jax.jit
def matmul(a, b):
    return jnp.dot(a, b)

# This runs on CPU, GPU, or TPU depending on the device
a = jnp.ones((1024, 1024))
b = jnp.ones((1024, 1024))
c = matmul(a, b)
```

- **Pallas** 是 JAX 的内核编写 API，相当于 JAX 生态中的 Triton。它允许你编写由 XLA 编译到 GPU 或 TPU 的低级内核：

```python
from jax.experimental import pallas as pl
import jax.numpy as jnp

def add_kernel(x_ref, y_ref, o_ref):
    o_ref[...] = x_ref[...] + y_ref[...]

def add_pallas(x, y):
    return pl.pallas_call(
        add_kernel,
        out_shape=jax.ShapeDtypeStruct(x.shape, x.dtype),
        grid=(x.shape[0] // 128,),
        in_specs=[pl.BlockSpec((128,), lambda i: (i,)),
                  pl.BlockSpec((128,), lambda i: (i,))],
        out_specs=pl.BlockSpec((128,), lambda i: (i,)),
    )(x, y)
```

- Pallas 比 Triton 更新、成熟度也更低，但它是为 TPU 编写自定义内核的唯一方式（因为 TPU 不支持 CUDA）。

### GPU 与 TPU

| | GPU (NVIDIA) | TPU (Google) |
|--|-------------|--------------|
| 可用性 | 任何云、本地部署 | 仅限 Google Cloud |
| 编程语言 | CUDA C, Triton, PyTorch | JAX/XLA, Pallas |
| 灵活性 | 通用计算 | 针对矩阵密集型机器学习进行了优化 |
| 峰值矩阵乘法 FLOPS | 非常高（Tensor Core） | 非常高（MXU） |
| 非矩阵乘法运算 | 好 | 较慢（使用向量单元，而非 MXU） |
| 多芯片扩展 | NVLink（8 块 GPU）、InfiniBand | ICI（数千个 TPU，集成更紧密） |
| 成本效率 | 有竞争力 | 对于大型训练来说，通常更便宜 |
| 生态系统 | 最大 (PyTorch, TensorFlow, JAX) | JAX 集中型 |

- **使用 GPU** 进行：大多数机器学习工作负载、PyTorch 研究、推理服务和具有大量非乘法计算的场景。
- **使用 TPU** 进行：大型 JAX 训练（数千个芯片）、谷歌云上的成本敏感型训练以及由矩阵乘法主导的工作负载。

## 选择合适的工具

| 工作负载 | 最佳工具 | 原因 |
|---|---|---|
| ML 训练 (PyTorch) | NVIDIA GPU + CUDA/Triton | 生态系统最大，工具链最完善 |
| ML 训练 (JAX, 大规模) | TPU 或 NVIDIA GPU | Google 规模的训练可用 TPU 控制成本，GPU 更灵活 |
| 自定义融合内核 | Triton (Python) 或 CUDA C | Triton 用于开发速度快，CUDA 用于峰值性能 |
| JAX 自定义内核 | Pallas | TPU 的唯一选择，GPU 上也能运行 |
| 跨平台推理 | Vulkan (文件 07) 或 ONNX Runtime | 可在任何 GPU 供应商上运行 |
| 移动/边缘推理 | Metal (Apple), Vulkan (Android), NNAPI | 平台特定的加速器 |
| 浏览器推理 | WebGPU (文件 07) | 在浏览器中唯一的选择 |
| 纯 CPU 推理 | ONNX Runtime + AVX/NEON | 无需 GPU，使用 SIMD（文件 02–03） |
| 新型硬件 | 供应商特定的 SDK | 每个加速器都有自己的工具链 |

## 编码任务（使用带 GPU 运行时的 Colab）

1. 编写并运行一个 Triton 内核，用于向量加法。将其性能与 PyTorch 自带的加法进行比较。
```python
import triton
import triton.language as tl
import torch
import time

@triton.jit
def add_kernel(x_ptr, y_ptr, out_ptr, n, BLOCK: tl.constexpr):
    pid = tl.program_id(0)
    offs = pid * BLOCK + tl.arange(0, BLOCK)
    mask = offs < n
    x = tl.load(x_ptr + offs, mask=mask)
    y = tl.load(y_ptr + offs, mask=mask)
    tl.store(out_ptr + offs, x + y, mask=mask)

n = 10_000_000
x = torch.randn(n, device='cuda')
y = torch.randn(n, device='cuda')

# Triton
out_triton = torch.empty_like(x)
grid = lambda meta: (triton.cdiv(n, meta['BLOCK']),)
add_kernel[grid](x, y, out_triton, n, BLOCK=1024)

# PyTorch
out_torch = x + y

# Verify correctness
assert torch.allclose(out_triton, out_torch, atol=1e-5)

# Benchmark
torch.cuda.synchronize()
start = time.time()
for _ in range(1000):
    add_kernel[grid](x, y, out_triton, n, BLOCK=1024)
torch.cuda.synchronize()
triton_time = (time.time() - start) / 1000

start = time.time()
for _ in range(1000):
    out_torch = x + y
torch.cuda.synchronize()
torch_time = (time.time() - start) / 1000

print(f"Triton:  {triton_time*1000:.3f} ms")
print(f"PyTorch: {torch_time*1000:.3f} ms")
print(f"Ratio:   {torch_time/triton_time:.2f}x")
```

2. 编写一个 Triton 融合内核，在一次遍历中执行乘法、加法和 ReLU。将其与三个独立的 PyTorch 操作比较。
```python
import triton
import triton.language as tl
import torch
import time

@triton.jit
def fused_mul_add_relu_kernel(x_ptr, w_ptr, b_ptr, out_ptr, n, BLOCK: tl.constexpr):
    pid = tl.program_id(0)
    offs = pid * BLOCK + tl.arange(0, BLOCK)
    mask = offs < n
    x = tl.load(x_ptr + offs, mask=mask)
    w = tl.load(w_ptr + offs, mask=mask)
    b = tl.load(b_ptr + offs, mask=mask)
    result = tl.maximum(x * w + b, 0.0)  # fused: mul + add + relu
    tl.store(out_ptr + offs, result, mask=mask)

n = 10_000_000
x = torch.randn(n, device='cuda')
w = torch.randn(n, device='cuda')
b = torch.randn(n, device='cuda')

# Fused (Triton)
out_fused = torch.empty_like(x)
grid = lambda meta: (triton.cdiv(n, meta['BLOCK']),)
fused_mul_add_relu_kernel[grid](x, w, b, out_fused, n, BLOCK=1024)

# Unfused (PyTorch)
out_unfused = torch.relu(x * w + b)

assert torch.allclose(out_fused, out_unfused, atol=1e-5)

# Benchmark
torch.cuda.synchronize()
start = time.time()
for _ in range(1000):
    fused_mul_add_relu_kernel[grid](x, w, b, out_fused, n, BLOCK=1024)
torch.cuda.synchronize()
fused_time = (time.time() - start) / 1000

start = time.time()
for _ in range(1000):
    out_unfused = torch.relu(x * w + b)
torch.cuda.synchronize()
unfused_time = (time.time() - start) / 1000

print(f"Fused (Triton):    {fused_time*1000:.3f} ms")
print(f"Unfused (PyTorch): {unfused_time*1000:.3f} ms")
print(f"Speedup:           {unfused_time/fused_time:.2f}x")
```

3. 测量 JAX 的 XLA 编译器如何自动融合操作。比较一串操作在使用和不使用 `jit` 时的表现。
```python
import jax
import jax.numpy as jnp
import time

def chain_ops(x):
    x = x * 2.0
    x = x + 1.0
    x = jnp.maximum(x, 0.0)  # ReLU
    x = x / jnp.sum(x)
    return x

chain_jit = jax.jit(chain_ops)
x = jax.random.normal(jax.random.PRNGKey(0), (10000, 1000))

# Warm up
_ = chain_jit(x)
jax.block_until_ready(_)

# Eager (each op is a separate kernel launch)
start = time.time()
for _ in range(100):
    y = chain_ops(x)
jax.block_until_ready(y)
eager_time = (time.time() - start) / 100

# JIT (XLA fuses operations)
start = time.time()
for _ in range(100):
    y = chain_jit(x)
jax.block_until_ready(y)
jit_time = (time.time() - start) / 100

print(f"Eager: {eager_time*1000:.2f} ms")
print(f"JIT:   {jit_time*1000:.2f} ms")
print(f"Speedup: {eager_time/jit_time:.1f}x (XLA fuses the 4 operations into 1 kernel)")
```

