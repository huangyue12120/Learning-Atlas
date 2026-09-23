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
# 为什么使用 C++，以及 ML 框架如何工作

*Python 提供易用的前端，而 C++ 承担高性能运行时。本篇解释 NumPy、PyTorch、JAX 的分层方式，介绍 C++ 基础、绑定机制和自定义内核的边界。*



*每个`jnp.matmul`,每个`torch.nn.Linear`,每个`np.dot`本书中已执行 C++ 和 CUDA 代码。这个文件拉回了窗帘:为什么ML框架是这样构建的,Python工程师的快 C++ 基本要素,何时写出自定义 C++ 内核,如何将它们绑入Python,即你写的代码和它运行的硬件之间的桥梁. *

- 你花了15个章节写Python。你进口了JAX,打电话`jax.grad`运行训练循环,并构建模型。都感觉像派斯. 但事实是:**几乎没有实际计算发生在Python。**

- 当你写的时候`output = model(input)`在 PyTorch 中或时`output = jnp.matmul(W, x)`在JAX,Python几乎什么都不做。它构造一个计算描述(一个操作图),然后把它交给一个C++/CUDA的后端来做真正的工作. Python是方向盘;C++是引擎.

## 为什么是 Python 前端、C++ 后端



- 这种两种语言的架构之所以存在,是因为Python和C++擅长于相反的事情:

| |Python|C++|
|--|--------|-----|
|Development speed|Fast (dynamic typing, REPL, no compilation)|Slow (static typing, headers, compile times)|
|Execution speed|~100x slower than C (interpreted, GIL)|Near-hardware speed (compiled, no overhead)|
|Memory control|Automatic (GC), no control over layout|Manual, precise control over every byte|
|Hardware access|None (no SIMD, no GPU, no custom memory)|Full (intrinsics, CUDA, inline assembly)|
|Ecosystem|Rich for ML (notebooks, visualisation, data)|Rich for systems (OS, drivers, engines)|

- 洞察力:**使用每种语言来表达它擅长的东西**. Python处理人类生产力重要的部分(实验设计,超参数调和,数据探索). C++处理机器性能重要的部分(矩阵乘法,卷积法,注意力内核).

- 单一矩阵乘法`jnp.matmul(A, B)`地点$A$实值$4096 \times 4096$执行~1,370亿起浮点操作. 在纯Python(已记回路)中,这需要~30分钟. 在以AVX-512 SIMD和多线程优化C++中,需要~10毫秒. 这是**18万x**的区别。无量活泼智慧能弥补这一缺口.

## ML 框架如何分层



- 每个主要的 ML 框架都遵循相同的架构:

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

### 数字



- NumPy的核心用C来书写. 当你打电话`np.dot(A, B)`, Python 调用一个C函数来调用 BLAS(基本线性代数分程序),典型的Intel MKL或OpenBLAS. BLAS是手取优化的C和Fortran代码,使用SIMD指令,缓存-知觉内存访问模式,并多条读取. 几十年的优化使矩阵乘法迅速。

- NumPy是只使用CPU的. 它不使用GPU. 但是,在CPU方面,它的速度非常快,因为它代表了最佳的BLAS执行.

### PyTorch 键盘



- PyTorch的计算引擎为**ATen ** (A Tensor Library),用C++来写作. ATen执行~2000个收发式操作(添加,matmul,conv2d,软max,.),每个收发式都有CPU和CUDA后端.

- 当你打电话`torch.matmul(A, B)`:
    1. Python 发送到 ATen C++ 函数.
    2. ATEN检查设备(CPU或CUDA)和 Dtype.
    3. CPU上:呼叫MKL/OpenBLAS. 在GPU上:呼叫cuBLAS(NVIDIA的GPU-优化了BLAS).
    4. 结果被包裹在一个 Python 张量对象中并返回。

- **torch.compile**(PyTorch 2.0+)进一步地推想:它会跟踪你的Python代码,构建一个计算图,并使用**Triton**(用于GPU)或**C++/OpenMP**(用于CPU)来编译. 所编译的代码引信操作,消除了Python上层,并且可以比急切模式快出2-5x.

### 日本



- JAX 将 Python 函数编译为 **XLA**（加速线性代数），这是 Google 面向机器学习工作负载的编译器。当你用 `jax.jit` 装饰一个函数时：
    1. JAX追踪函数,捕获操作为XLA计算图(HLO-高端操作).
    2. XLA选取图:引信操作,去除冗余计算,选取内存布局.
    3. XLA编译到目标后端:CPU(通过LLVM),GPU(通过CUDA/PTX)或TPU(通过TPU特定指令).
    4. 编译的代码直接运行在硬件上,零Python参与.

- 这就是为什么`jax.jit`如此重要:没有它,每个操作都是单独的Python-C++来回. 有了它,整个功能就是一个被编译为"内核"的单一.

## 面向 Python 工程师的 C++ 快速基础



- 你不需要成为C++专家. 你需要足够理解读取内核代码,写出简单的扩展,并理解性能讨论. 要点在这里。

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

- **Pointers**是和Python最大的概念区别. 在Python,一切都是参考,你从不考虑记忆地址. 在C++中,指针可以直接进入内存，，强大而危险的(夹指针,缓冲外溢).

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

- ** 密钥规则**:栈快而有限(典型为1-8 MB). 大型阵列(变速器,地物图)必须在堆积上进行. 在Python,一切在堆积上 GC处理清理。在 C++ 中,您自己管理(或使用智能指针).

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

- 模板是C++库(类似于ATen)如何写出与活浮16,活浮32,活浮64等共通的代码. 不重复执行。

### 标准库要点



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

## 何时编写自定义 C++ 内核



- 大多数ML工程师从不需要写出C++. 该框架的内置操作覆盖99%的使用案例. 您只应在下列情况下考虑自定义 C++ :

1. ** 您的操作在框架** 中不存在:一个新激活函数,自定义的注意模式,特殊的损失函数不能被表达为现有操作的构成.

2. ** 为性能配置操作**:您的模型确实如此`relu(layernorm(matmul(x, W) + b))`。。。每次操作都会发射一个单独的内核,读取并写入内存,并同步. 一个被熔化的内核在一次通过中全部完成,避免了内存回转. 这可以更快2 -5x。

3. ** 减少内存用量**:自定义内核可以计算出梯度而无需存储所有中间活化(在内核级别进行渐变检查).

4. ** 目标小说硬件**:一个新的加速器(如Cerebras,Groq)可能没有框架支持. 你直接写内核。

- 对于案件1-2,**Triton**(第16章,第05起案)往往比直接写CUDA C要多得多。只有在Triton不能表达你需要的东西时才降入CUDA C.

## 如何将 C++ 绑定到 Python



- 写入 C++ 是工作的一半。亦得从彼菩萨起名.

### pybind11（通用方案）



- pybind11为 C++ 函数创建了 Python 绑定,最小锅炉板:

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

### PyTorch C++ 扩展



- PyTorch 提供了添加自定义操作的简化方式:

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

- `torch.utils.cpp_extension.load`编译 C++ 代码,创建共享库,并装入为 Python 模块,全部为一调. 这是PyTorch中最简单的C++自定义操作实验方法.

### JAX 自定义调用



- JAX使用XLA自定义调用. 这个过程参与较多(您用 XLA 注册一个 C 函数),但概念相同:写出 C/C++,绑定它,从 Python 调用它.

- 对于大多数JAX用户来说,**Pallas**(被覆盖在文件05中)是更好的选择:它允许您将GPU内核写入一个类似Python的语法,由XLA编译,而不离开JAX生态系统.

## 全局图景



- 这个文件解释了Python和硬件之间的层. 本章所剩文件更深:
    - ** 第01页**:硬件本身(CPU架构,GPU架构,内存系统)
    - ** 第02-03页**:CPU(ARM N,x86 AVX)上的SIMD编程，，用CPU的向量单位来写 C++
    - ** File 04**:带有 CUDA 的 GPU 编程，，您在其中写入运行于上千个GPU核心的 C++ .
    - ** File 05**: Triton, Pallas, 和更高层次的 GPU 编程，，在那里您会写到编译到 GPU 内核的 Python

- 进取镜像抽象阶梯: C++ 内在(最低,最受控制) → CUDA (GPU特有) → Triton/Pallas (Pythonic,编译) → JAX/PyTorch (最高,自动). 每层交易控制方便. 了解下层的关卡,你就能更好地使用上层的关卡.

## 编程任务（使用 g++ 或 clang++ 编译）



1. 写出你的第一个C++程序. 分配数组,填充,计算和测量时间。这引入了编译,数组,指针和时间.
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

2. 写出一个C++函数,在数组上计算ReLU,然后用pybind11来构建Python绑定. 从Python调用,比较速度与NumPy.
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
# test_relu.py ， run after compiling the C++ module above
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

3. 写入一个C++程序,以显示内存布局为何重要. 比较行相干与行相干访问模式并衡量性能差异。
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
