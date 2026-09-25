---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 16 - SIMD and GPU programming/00. why C++ and how ML frameworks work.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 5e21de55db77321c911bc322e9eb3f3fa88e692f8de803402ee44dfa6134156e
status: reviewed
---
# C++ 的作用与机器学习框架的实现

*本书中的 `jnp.matmul`、`torch.nn.Linear` 和 `np.dot` 最终都会调用底层实现。许多计算由 C、C++、Fortran 或 CUDA 代码执行。本文介绍机器学习框架为何采用这种分层方式、Python 开发者需要掌握哪些 C++ 基础、什么情况下值得编写自定义内核，以及怎样把 C++ 函数接入 Python。*

- 前 15 章里，你用 Python 导入 JAX、调用 `jax.grad`、编写训练循环并构建模型。代码看起来都在 Python 中运行；矩阵运算等密集计算通常由底层原生代码执行。

- 在 PyTorch 中写 `output = model(input)`，或在 JAX 中写 `output = jnp.matmul(W, x)` 时，Python 层负责调用框架接口和组织运算。具体工作随框架和执行模式而异：PyTorch 的即时执行会逐个分派运算；JAX 的 `jax.jit` 会先追踪函数，再交给 XLA 编译。C++、CUDA 等原生后端负责执行许多底层操作。

## Python 前端与 C++ 后端为何分工

- 许多机器学习库用 Python 提供易用的接口，用 C++ 等原生语言执行计算。这些语言在开发效率、运行方式和硬件控制上各有长处：

| 对比项 | Python | C++ |
| --- | --- | --- |
| 开发效率 | 高：动态类型、交互式环境，无需先编译 | 较低：静态类型、头文件和编译步骤增加了开发成本 |
| 执行速度 | CPython 中逐元素 Python 循环通常较慢；GIL 会限制 Python 字节码线程的并行执行。NumPy 等库会把运算交给原生实现；原文所说“比 C 慢约 100 倍”不是通用倍率 | 编译后的代码可直接执行，性能取决于算法、编译器和硬件 |
| 内存布局控制 | Python 对象通常由引用计数和垃圾回收管理；数组的底层布局由数组库控制 | 可直接控制数据结构与内存访问方式 |
| 硬件访问 | 通过库调用 SIMD、GPU 和专用内存功能 | 可使用硬件内在函数、CUDA 和内联汇编等接口 |
| 常见生态 | 机器学习实验、笔记本和数据分析工具丰富 | 系统软件、驱动和计算库丰富 |

- Python 常用于实验设计、超参数调整和数据分析；C++ 等原生代码常用于矩阵乘法、卷积和注意力计算。实际系统会在多层接口和库之间分工。

- 对两个 $4096 \times 4096$ 矩阵做乘法约需 1370 亿次浮点运算。原文把纯 Python 嵌套循环约 30 分钟与使用 AVX-512 和多线程的优化 C++ 约 10 毫秒作比较，并据此给出约 180,000 倍的差距。原文没有说明处理器、精度、编译器和线程设置；这些数字只能作为示例，不能视为通用基准。NumPy、PyTorch 等调用的原生库也会影响结果。

## 机器学习框架的组成

- 常见框架会组合 Python 接口、分派或编译机制、原生运算库和硬件后端。具体结构会因框架、运算和设备而变化：

```
User code (Python)
    ↓
Python API layer (torch.nn, jax.numpy, numpy)
    ↓
Dispatch / JIT compiler (torch.compile, XLA, NumPy dispatch)
    ↓
C++ kernel library (ATen/PyTorch, XLA, BLAS/LAPACK)
    ↓
Hardware-specific backends (CUDA, cuDNN, MKL, oneDNN, Metal)
    ↓
Hardware (CPU SIMD units, GPU cores, TPU MXUs)
```


### NumPy

- NumPy 的核心包含 C 代码。对适用的输入调用 `np.dot(A, B)` 时，NumPy 可能把矩阵乘法交给 BLAS（Basic Linear Algebra Subprograms，基础线性代数子程序），例如 Intel MKL 或 OpenBLAS。BLAS 的 C 和 Fortran 实现会针对 SIMD 指令、缓存访问和多线程做优化。实际调用哪个实现取决于 NumPy 的构建方式、输入形状和数据类型。

- NumPy 本身在 CPU 上执行，不提供 GPU 后端；它可以调用当前安装中可用的 BLAS 实现。

### PyTorch

- PyTorch 的张量运算库 **ATen**（A Tensor Library）主要以 C++ 实现，为大量运算提供 CPU、CUDA 等后端。原文称 ATen 实现约 2,000 种张量运算；具体数量随版本变化，可用后端也取决于运算、设备和构建配置。

- 调用 `torch.matmul(A, B)` 时，PyTorch 会根据张量所在设备和数据类型选择相应实现。CPU 上可能调用 MKL、oneDNN 或 PyTorch 自带内核；NVIDIA GPU 上可能调用 cuBLAS。框架也会负责把运算结果包装成 Python 张量对象。

- **`torch.compile`**（PyTorch 2.0 起提供）可以追踪受支持的 Python 代码并编译计算图。常见的 GPU 路径会使用 TorchInductor 和 Triton；CPU 路径通常生成 C++ 代码。编译器可能融合运算、减少 Python 调用开销。原文给出的 2 到 5 倍提速只是示例，实际收益取决于模型、输入和硬件；某些工作负载也可能没有提速。

### JAX

- JAX 可以通过 **XLA**（Accelerated Linear Algebra，Google 的机器学习编译器）编译函数。调用 `jax.jit` 时，JAX 通常会执行以下步骤：
    1. 追踪函数，把支持的运算记录为 XLA 计算图（HLO，即 High Level Operations）。输入形状或静态参数变化时，JAX 可能需要重新编译。
    2. XLA 优化计算图，例如融合部分运算、消除冗余计算并调整内存布局。
    3. XLA 将计算编译到目标后端，例如通过 LLVM 为 CPU 生成代码，通过 CUDA/PTX 为 GPU 生成代码，或生成 TPU 指令。
    4. 编译结果在目标硬件上执行。执行期间仍可能有 Python 调度、设备同步或数据传输，具体取决于调用方式。

- `jax.jit` 会把一组受支持的运算交给 XLA 一起优化，减少逐运算分派的开销。XLA 不保证把整个函数编译成单个内核；生成的内核数量取决于运算和目标设备。普通 JAX 调用也不等同于每个操作都单独完成一次 Python 到 C++ 的往返。

## Python 开发者需要掌握的 C++ 基础

- 阅读内核代码、编写简单扩展和理解性能讨论，不要求你成为 C++ 专家。先熟悉类型、指针、函数、内存和模板即可。

### 类型与变量

```cpp
// C++ requires explicit types (unlike Python)
int count = 0;           // 32-bit integer
float loss = 0.5f;       // 32-bit float
double lr = 3e-4;        // 64-bit float
bool training = true;    // boolean

// Arrays (fixed size, stack-allocated)
float weights[1024];     // 1024 floats, contiguous in memory

// Pointers: a variable that holds a memory address
float* ptr = weights;    // ptr points to the first element of weights
float val = ptr[42];     // access element 42 via pointer arithmetic
// ptr[42] is equivalent to *(ptr + 42)
```


- **指针**保存对象或内存位置的地址。Python 变量也会引用对象，但 Python 通常不让你直接进行地址运算；C++ 指针允许直接访问内存，也带来悬空指针和缓冲区越界等风险。示例中的整数、浮点类型大小适用于常见平台，具体宽度仍取决于实现；需要固定宽度时可使用 `<cstdint>` 中的类型。

### 函数

```cpp
// Function declaration: return_type name(param_type param_name)
float relu(float x) {
    return x > 0.0f ? x : 0.0f;
}

// Passing by reference (avoids copying large objects)
void scale_vector(std::vector<float>& vec, float factor) {
    for (size_t i = 0; i < vec.size(); i++) {
        vec[i] *= factor;
    }
}

// const reference: read-only, no copy
float sum(const std::vector<float>& vec) {
    float total = 0.0f;
    for (float x : vec) {  // range-based for loop (like Python's for x in vec)
        total += x;
    }
    return total;
}
```


- 引用可避免复制大型对象；`const` 引用允许读取而不修改对象。示例中的函数使用 `std::vector`，实际编译时需包含相应头文件。

### 内存：栈与堆

```cpp
// Stack allocation: fast, automatic lifetime (freed when function returns)
float buffer[256];   // 256 floats on the stack

// Heap allocation: manual, survives beyond the function
float* data = new float[n];   // allocate n floats on the heap
// ... use data ...
delete[] data;                 // YOU must free it (no garbage collector)

// Modern C++: smart pointers (automatic cleanup, like Python references)
#include <memory>
auto data = std::make_unique<float[]>(n);  // freed automatically when out of scope
```


- 栈上对象通常随作用域结束而销毁，但栈空间有限。原文给出的典型值约为 1–8 MB，实际大小取决于操作系统、线程配置和运行环境，并非固定上限。大型数组通常放在动态分配的内存中；Python 对象通常存放在堆上，由引用计数和垃圾回收管理生命周期。现代 C++ 常用标准容器和智能指针管理对象。

### 模板（泛型）

```cpp
// A function that works with any numeric type
template <typename T>
T add(T a, T b) {
    return a + b;
}

add<float>(1.5f, 2.5f);   // returns 4.0f
add<int>(3, 4);             // returns 7
```


- 模板让 ATen 等库能为 `float16`、`float32`、`float64` 等类型生成代码，避免手工重复实现。示例中的 `T` 需要支持加法；模板本身不会让任何类型自动具备数值运算能力。

### 常用标准库组件

```cpp
#include <vector>      // dynamic array (like Python list)
#include <string>      // string type
#include <unordered_map>  // hash map (like Python dict)
#include <algorithm>   // sort, find, transform, etc.
#include <cmath>       // math functions

std::vector<float> vec = {1.0f, 2.0f, 3.0f};
vec.push_back(4.0f);            // append
float first = vec[0];           // index
size_t len = vec.size();        // length

std::unordered_map<std::string, int> counts;
counts["hello"] = 5;            // insert
if (counts.count("hello")) { }  // check existence
```


## 什么时候编写自定义 C++ 内核

- 框架内置运算通常足以完成常见任务。遇到以下情况时，可以评估是否编写自定义内核：

1. **框架没有所需运算**：例如新型激活函数、自定义注意力模式，或无法由现有运算组合表达的损失函数。

2. **融合运算以减少开销**：`relu(layernorm(matmul(x, W) + b))` 可能由多个内核分别执行，每个内核都要读写中间结果。融合内核可以减少中间数据传输和启动次数，但提速幅度取决于工作负载；2 到 5 倍不是保证值。

3. **减少中间数据占用**：自定义内核可在实现允许时重算部分值，避免保存全部中间激活。反向传播还需提供正确的梯度计算；这与框架层面的梯度检查点有关，但并非同一种实现。

4. **适配尚未得到框架支持的硬件**：例如 Cerebras、Groq 等新型加速器可能需要专用内核，或需要先为框架添加后端支持。

- 对前两类需求，**Triton**（第 16 章文件 05）通常比直接编写 CUDA C 容易。只有当 Triton 无法表达所需运算或无法满足约束时，再考虑 CUDA C。

## 把 C++ 接入 Python

- 编写 C++ 后，还要为 Python 提供调用接口。

### pybind11（通用绑定工具）

- pybind11 可以用较少的样板代码为 C++ 函数创建 Python 绑定：

```cpp
// my_ops.cpp
#include <pybind11/pybind11.h>
#include <pybind11/numpy.h>
namespace py = pybind11;

// A simple custom operation
py::array_t<float> custom_relu(py::array_t<float> input) {
    auto buf = input.request();
    float* ptr = static_cast<float*>(buf.ptr);
    size_t n = buf.size;

    auto result = py::array_t<float>(n);
    float* out = static_cast<float*>(result.request().ptr);

    for (size_t i = 0; i < n; i++) {
        out[i] = ptr[i] > 0 ? ptr[i] : 0;
    }
    return result;
}

PYBIND11_MODULE(my_ops, m) {
    m.def("custom_relu", &custom_relu, "Custom ReLU operation");
}
```


```bash
# Compile
pip install pybind11
c++ -O3 -shared -std=c++17 -fPIC $(python3 -m pybind11 --includes) my_ops.cpp -o my_ops$(python3-config --extension-suffix)
```


```python
# Use from Python
import my_ops
import numpy as np

x = np.array([-1.0, 2.0, -3.0, 4.0], dtype=np.float32)
y = my_ops.custom_relu(x)
print(y)  # [0. 2. 0. 4.]
```


- 这段 pybind11 示例假设输入是一维、连续的 `float32` 数组。对非连续数组，`buf.ptr` 后按元素递增并不等于按 NumPy 的步长访问；多维数组也会被输出为一维数组。面向更广泛的输入时，应检查维度、布局和数据类型，或按步长读写。

### PyTorch C++ 扩展

- PyTorch 提供了添加自定义运算的 C++ 扩展接口：

```cpp
// custom_op.cpp
#include <torch/extension.h>

torch::Tensor custom_gelu(torch::Tensor x) {
    return x * 0.5 * (1.0 + torch::erf(x / std::sqrt(2.0)));
}

PYBIND11_MODULE(TORCH_EXTENSION_NAME, m) {
    m.def("custom_gelu", &custom_gelu, "Custom GELU activation");
}
```


```python
# Load and compile on-the-fly
from torch.utils.cpp_extension import load

custom_ops = load(
    name="custom_ops",
    sources=["custom_op.cpp"],
    extra_cflags=["-O3"],
)

x = torch.randn(1000)
y = custom_ops.custom_gelu(x)
```


- `torch.utils.cpp_extension.load` 可以编译 C++ 源码、生成共享库并加载为 Python 模块，适合快速试验。部署时还需处理编译器、PyTorch 版本、ABI 和目标设备等兼容性问题。

### JAX 自定义调用

- JAX 可以通过 XLA custom call 接入 C/C++ 函数；你需要向 XLA 注册函数并处理数据约定，过程比 pybind11 更复杂。

- 多数 JAX 用户可以先考虑 **Pallas**（第 16 章文件 05）。它提供类似 Python 的内核编写方式，并由 JAX/XLA 编译，适合在 JAX 生态内编写 GPU 内核。

## 本章脉络

- 本文介绍了 Python 接口与底层硬件之间的执行层。后续文件依次讨论：
    - **文件 01**：CPU、GPU 架构和内存系统
    - **文件 02–03**：CPU SIMD 编程，包括 ARM NEON 和 x86 AVX
    - **文件 04**：用 CUDA 编写运行在 GPU 上的程序
    - **文件 05**：Triton、Pallas 等更高层的 GPU 内核编程工具

- 抽象层次大致从 C++ 内在函数、CUDA、Triton/Pallas 到 JAX/PyTorch 逐步升高。低层接口提供更多控制，也要求你处理更多实现细节；高层接口会替你管理更多步骤。

## 编程练习（使用 g++ 或 clang++ 编译）

1. 编写第一个 C++ 程序：分配数组、填入数据、求和并计时。练习编译、数组、指针和计时。

```cpp
// task1_basics.cpp
// Compile: g++ -O3 -o task1 task1_basics.cpp
// Run: ./task1

#include <iostream>
#include <chrono>
#include <vector>

int main() {
    const int N = 10'000'000;  // C++ allows ' as digit separator
    std::vector<float> data(N);

    // Fill the array
    for (int i = 0; i < N; i++) {
        data[i] = static_cast<float>(i) * 0.001f;
    }

    // Compute sum
    auto start = std::chrono::high_resolution_clock::now();
    float sum = 0.0f;
    for (int i = 0; i < N; i++) {
        sum += data[i];
    }
    auto end = std::chrono::high_resolution_clock::now();
    double elapsed = std::chrono::duration<double, std::milli>(end - start).count();

    std::cout << "Sum: " << sum << std::endl;
    std::cout << "Time: " << elapsed << " ms" << std::endl;
    std::cout << "Elements: " << N << std::endl;
    std::cout << "Throughput: " << (N * sizeof(float)) / elapsed / 1e6 << " GB/s" << std::endl;

    return 0;
}
```


2. 编写一个 C++ 函数，对数组计算 ReLU；再用 pybind11 创建 Python 绑定，从 Python 调用并与 NumPy 版本比较运行时间。这个比较只适用于示例中的一维连续 `float32` 输入，也不能据此断定 C++ 包装函数普遍快于 NumPy。实际速度受编译选项、SIMD 向量化、线程数、内存分配和计时方法影响。

```cpp
// task2_relu.cpp
// Compile: c++ -O3 -shared -std=c++17 -fPIC $(python3 -m pybind11 --includes) \
//          task2_relu.cpp -o my_relu$(python3-config --extension-suffix)

#include <pybind11/pybind11.h>
#include <pybind11/numpy.h>
namespace py = pybind11;

py::array_t<float> cpp_relu(py::array_t<float> input) {
    auto buf = input.request();
    float* ptr = static_cast<float*>(buf.ptr);
    int n = buf.size;

    auto result = py::array_t<float>(n);
    float* out = static_cast<float*>(result.request().ptr);

    for (int i = 0; i < n; i++) {
        out[i] = ptr[i] > 0.0f ? ptr[i] : 0.0f;
    }
    return result;
}

PYBIND11_MODULE(my_relu, m) {
    m.def("relu", &cpp_relu, "C++ ReLU");
}
```

```python
# test_relu.py — run after compiling the C++ module above
import numpy as np
import time
import my_relu  # the compiled C++ module

x = np.random.randn(10_000_000).astype(np.float32)

# C++ ReLU
start = time.time()
for _ in range(100):
    y_cpp = my_relu.relu(x)
cpp_time = (time.time() - start) / 100

# NumPy ReLU
start = time.time()
for _ in range(100):
    y_np = np.maximum(x, 0)
np_time = (time.time() - start) / 100

print(f"C++ ReLU:   {cpp_time*1000:.2f} ms")
print(f"NumPy ReLU: {np_time*1000:.2f} ms")
print(f"Match: {np.allclose(y_cpp, y_np)}")
```


3. 在行优先存储的矩阵上，分别按行和按列遍历并比较速度。按行访问通常连续读取内存；按列访问会跨越较大的步长。这个示例比较的是访问顺序，不是行优先存储与列优先存储两种矩阵布局；实测差异还会受到缓存、编译器和处理器影响。

```cpp
// task3_layout.cpp
// Compile: g++ -O3 -o task3 task3_layout.cpp

#include <iostream>
#include <chrono>
#include <vector>

int main() {
    const int N = 4096;
    std::vector<float> matrix(N * N, 1.0f);

    // Row-major access: sequential memory addresses (cache-friendly)
    auto start = std::chrono::high_resolution_clock::now();
    float sum_row = 0.0f;
    for (int i = 0; i < N; i++) {
        for (int j = 0; j < N; j++) {
            sum_row += matrix[i * N + j];  // stride-1 access
        }
    }
    auto end = std::chrono::high_resolution_clock::now();
    double row_ms = std::chrono::duration<double, std::milli>(end - start).count();

    // Column-major access: stride-N access (cache-unfriendly)
    start = std::chrono::high_resolution_clock::now();
    float sum_col = 0.0f;
    for (int j = 0; j < N; j++) {
        for (int i = 0; i < N; i++) {
            sum_col += matrix[i * N + j];  // stride-N access (cache misses!)
        }
    }
    end = std::chrono::high_resolution_clock::now();
    double col_ms = std::chrono::duration<double, std::milli>(end - start).count();

    std::cout << "Row-major (cache-friendly): " << row_ms << " ms" << std::endl;
    std::cout << "Col-major (cache-hostile):  " << col_ms << " ms" << std::endl;
    std::cout << "Slowdown: " << col_ms / row_ms << "x" << std::endl;
    std::cout << "(Both sums: " << sum_row << ", " << sum_col << ")" << std::endl;

    return 0;
}
```
