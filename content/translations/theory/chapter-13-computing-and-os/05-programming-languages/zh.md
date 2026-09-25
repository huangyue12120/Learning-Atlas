---
kind: theory-translation
source:
  repository: maths-cs-ai-compendium
  path: chapter 13 - computing and OS/05. programming languages.md
  branch: main
  revision: 9850ee574a370bc1cde59de98b394e953775b67d
  sha256: 266476a316398c34c35650b307c433b392db1b527fbb3567cfb13037cb81621b
status: reviewed
---
# 编程语言

*编程语言连接人类表达的意图与机器执行过程。本篇介绍编程范式、类型系统、内存管理、编译流程、解释执行与即时编译、常见语言特性、领域特定语言和设计权衡。*

- 软件、机器学习模型和操作系统都由编程语言描述。不同语言面向不同需求：性能与安全、表达力与简洁性、底层控制与高层抽象之间往往需要取舍。理解这些取舍，有助于选择合适的工具并看清其限制。

## 编程范式

- **范式**是组织代码和解决问题的一套原则。

- **命令式编程**把计算描述为一系列改变状态的指令，例如“将 x 设为 5；给 x 加 3；若 x 大于 7 就打印它”。C、Python 和 Java 都支持命令式编程。它把程序看作逐步修改内存状态的过程。

- **面向对象编程**（OOP）围绕**对象**组织代码。对象把数据（属性）与行为（方法）放在一起，并可通过接口交互。常见概念包括**封装**（通过公开接口隐藏内部状态）、**继承**（基于已有类定义新类）和**多态**（通过共同接口处理不同类型）。Java、C++ 和 Python 都支持面向对象编程。

- **函数式编程**（FP）把计算看作函数求值。常见原则包括：**不可变性**（创建后不再修改数据）、**纯函数**（输出只由输入决定且没有副作用）和**一等函数**（函数可以作为值传递、返回或存入变量）。Haskell 是纯函数式语言；Python、JavaScript 和 Scala 也支持函数式风格。

- 纯函数没有共享的可变状态，通常更容易推理、测试和并行化。这也是函数式思想常用于分布式系统和数据管线的原因之一。JAX 的自动微分函数要求用户函数符合其纯函数式变换模型，例如 jax.grad 所处理的函数不应依赖隐式可变状态。

- **逻辑编程**描述需要满足的事实与规则，而不逐步规定求解过程。运行时根据这些规则寻找解。Prolog 是典型例子：若事实包括“苏格拉底是人”和“所有人都会死”，系统便能推出“苏格拉底会死”。逻辑编程用于知识表示、规则系统等领域。

- 许多现代语言支持多种范式。例如，Python 同时支持命令式、面向对象和函数式风格；Rust 也支持命令式与函数式写法。范式是解决问题的工具，不必拘泥于单一范式。

## 类型系统

- **类型**用于分类值，并限定对这些值可执行的操作。整数 3 与字符串 "3" 是不同类型；整数可以相加，字符串也可以拼接，但两种操作的含义不同。

- **静态类型**：在运行程序前检查类型，通常由编译器或静态分析工具完成。C、Java、Rust 和 Go 都是静态类型语言。类型可以显式声明，也可以由编译器推断：

```rust
let x: i32 = 5;     // Rust: x is a 32-bit integer
let y: f64 = 3.14;  // y is a 64-bit float
// let z = x + y;    // compile error: cannot add i32 and f64
```

- **动态类型**：在程序运行时根据实际操作检查类型。它较灵活，但某些错误只有在相应代码执行时才会显现。Python、JavaScript 和 Ruby 都是动态类型语言：

```python
x = 5       # x is an int (for now)
x = "hello" # now x is a string -- no error
```

- “强类型”和“弱类型”并没有适用于所有语言的统一划分标准，通常用来描述隐式类型转换的规则。Python 通常被称为强动态类型语言：字符串和整数不能直接相加。JavaScript 会把字符串与整数相加的结果转换为字符串。C 允许较多显式转换和底层内存操作，但不能仅据此将静态类型等同于“弱类型”。

- **类型推断**让编译器在缺少显式类型标注时推导类型：

```rust
let x = 5;        // compiler infers: i32
let y = x + 3.0;  // compile error: mixed types, even with inference
```

- **泛型**（参数化多态）让一段代码可用于多种类型，同时保留类型约束：

```rust
fn largest<T: PartialOrd>(list: &[T]) -> &T {
    let mut max = &list[0];
    for item in &list[1..] {
        if item > max { max = item; }
    }
    max
}
// Works for integers, floats, strings -- any type that supports comparison
```

- 对机器学习来说，Python 的动态类型便于快速试验，但也可能让错误延后暴露。生产系统可使用类型标注（例如为 train 函数标明 nn.Module 输入和浮点学习率）以及 mypy 等静态分析工具。PyTorch 和 JAX 使用 Python 提供灵活接口；TensorRT 和 ONNX Runtime 等组件常用 C++ 实现高性能运行时。

## 内存管理

- 程序需要申请和释放内存。如何管理内存是编程语言设计中的重要选择。

![内存布局示意：栈通常向低地址增长，堆可向高地址扩展，代码和静态数据位于另一段地址区域](../images/stack_vs_heap.svg)

- **栈**保存局部变量和函数调用帧。申请空间通常只需调整栈指针，函数返回时自动回收对应栈帧。栈访问常有较好的局部性，但容量有限（线程栈通常由系统配置），且以调用顺序管理，符合后进先出原则。

- **堆**存储动态分配的数据，例如对象、数组，以及大小在运行时才确定的字符串。分配器需要寻找可用空间，回收则由程序显式完成或由运行时自动管理。堆可扩展到进程允许使用的内存上限。

- **手动内存管理**常见于 C 和 C++：程序员用 malloc 申请堆内存，再用 free 释放。这提供了较强的控制能力，但也容易出错：
    - **释放后使用**：访问已经释放的内存，可能导致崩溃或安全漏洞。
    - **重复释放**：对同一块内存释放多次，可能破坏分配器的数据结构。
    - **内存泄漏**：申请后未及时释放仍可回收的内存，导致程序占用持续增长。

- **垃圾回收**（GC）由运行时识别并回收不再可达的对象，程序员通常不直接调用 free：

    - **跟踪式垃圾回收**（如 Java 和 Go 的收集器，以及 Python 的循环垃圾回收器）从栈、全局变量等根对象出发遍历可达对象，再回收不可达对象。某些收集阶段会暂停程序；并发式收集器可缩短停顿，但实际暂停时间取决于收集器、堆大小和工作负载。
    - **引用计数**是 Python 的主要内存回收机制之一，Swift 和 Objective-C 也使用引用计数。当对象的引用计数降为 0 时，通常可立即回收。引用计数本身无法回收互相引用的循环对象；Python 另有循环垃圾回收器处理这类情况。

- **所有权**是 Rust 用于管理资源的一套编译期规则，通常无需运行时垃圾回收：

    - 一般的拥有型值有一个所有者；所有者离开作用域时，值会被释放或执行相应的析构操作。
    - 值可以被借用。通常，同一时刻只能有一个可变引用，或有多个不可变引用；编译器会依据作用域和生命周期检查借用关系。
    - 安全 Rust 可在编译时防止常见的释放后使用、重复释放、悬空引用和数据竞争。使用 unsafe 代码或与外部代码交互时，仍需额外谨慎。

- **借用检查器**在编译时检查 Rust 的所有权与引用规则。这带来一定学习成本，也让许多性能敏感的系统软件能够在不使用垃圾回收的情况下获得内存安全和线程安全保证。Rust 已用于操作系统组件、游戏引擎和 Candle、Burn 等机器学习推理运行时。

## 编译流程

- **编译器**在程序运行前将源代码转换为机器码或其他目标表示。常见编译流程包括：

![编译流程：源代码 → 词法分析 → 解析 → 语义分析 → 优化 → 代码生成 → 机器码](../images/compilation_pipeline.svg)

1. **词法分析**（分词）：将源文本拆分为词法单元。例如，x = 3 + y 可转换为标识符 x、等号、整数 3、加号和标识符 y。词法分析器通常会跳过空白和注释。
2. **语法分析**：根据词法单元构建**抽象语法树**（AST），表示程序的层次结构。例如，3 + y * 2 会解析为 Add(3, Mul(y, 2))，因为乘法优先级更高。括号不匹配或缺少分号等语法错误通常在此阶段报告。
3. **语义分析**：检查名称是否已定义、调用参数是否符合要求，并在语言支持时检查类型。输出通常是带有类型或其他注释的语法树。
4. **优化**：在不改变程序可观察行为的前提下改写程序。常见方法包括：
    - **常量折叠**：在编译时计算 3 + 5，并替换为 8。
    - **死代码消除**：删除不会执行或结果不会影响程序行为的代码。
    - **循环展开**：将循环体展开，以减少分支和循环控制开销。
    - **内联**：用函数体替代函数调用，减少调用开销。
5. **代码生成**：将优化后的表示转换为目标机器码（如 x86、ARM）或中间表示。

- **LLVM** 是广泛使用的编译器基础设施之一。它定义了 LLVM IR 中间表示，许多语言可编译到该表示，再由优化器和目标后端处理。Clang（C/C++）、Rust、Swift、Julia 等工具链使用 LLVM 生态，因此其优化器和后端改进可能惠及多个语言项目。

## 解释执行与即时编译

- **解释器**通过执行程序表示来运行程序，而不一定预先生成独立的机器码。这便于快速启动和交互开发；性能取决于解释器、程序表示及运行时优化方式。

- 许多语言会先将源代码编译为**字节码**，再由**虚拟机**（VM）解释或执行字节码。

    - **CPython**（标准 Python 实现）会把 Python 源码编译为字节码；导入模块时通常可缓存为 .pyc 文件。CPython 虚拟机解释执行字节码。纯 Python 的计算密集型循环通常比编译后的 C 慢很多，具体差距取决于任务和实现。
    - **JVM**（Java 虚拟机）：Java 编译为 JVM 字节码（.class 文件）。JVM 可先解释字节码，再将频繁执行的“热点”代码即时编译为本机代码。长时间运行的程序可能因此受益，但速度不一定能达到 C 的水平。

- **即时编译**（JIT）在运行时生成机器码，并利用执行时收集的信息进行优化。例如，若某个热点函数通常接收整数，JIT 可针对该类型生成专门代码，并在类型假设不成立时回退到通用路径。

- **PyPy** 是带有 JIT 编译器的另一种 Python 实现。它对某些程序可比 CPython 快，但具体加速幅度因工作负载而异；与 NumPy、PyTorch 等 C 扩展的兼容性也限制了它在机器学习中的适用范围。

- 解释和编译并不是非此即彼：
    - 纯解释执行：许多 shell 脚本。
    - 字节码解释执行：CPython 的常见执行路径。
    - 字节码与 JIT：JVM、.NET CLR、LuaJIT、PyPy。
    - **提前编译**（AOT）：C、C++、Rust、Go。
    - AOT 与运行时代码生成：JAX 的 jax.jit 会跟踪符合要求的 Python 函数并将其编译为 XLA 程序；通常首次调用会触发编译，后续调用可复用缓存，但具体行为取决于输入形状、静态参数和设备。

## 常见语言特性

- **闭包**是能够捕获外围作用域变量的函数。它保留了定义时可访问的环境：

```python
def make_adder(n):
    def add(x):
        return x + n  # n is captured from the enclosing scope
    return add

add5 = make_adder(5)
print(add5(3))  # 8
```

- 闭包是回调、装饰器和部分应用等功能的重要基础，也是函数式编程中的常见工具。

- **模式匹配**根据数据的结构进行解构并选择分支：

```rust
match value {
    Some(x) if x > 0 => println!("Positive: {}", x),
    Some(0)           => println!("Zero"),
    Some(x)           => println!("Negative: {}", x),
    None              => println!("Nothing"),
}
```

- 模式匹配可以检查数据形状，而不只是比较值，例如区分 Some 与 None，或检查其中的值是否满足条件。Python 从 3.10 起支持结构化模式匹配（match/case）。

- **代数数据类型**（ADT）可由多个带有不同数据的变体组成。例如，Result 可以是 Ok(value) 或 Err(error)，Tree 可以是 Leaf(value) 或 Node(left, right)。在支持穷尽性检查的语言中，结合模式匹配可帮助处理所有变体，减少遗漏错误分支的风险。

- **特征与接口**规定类型需要提供哪些操作，而不限定内部实现，从而支持多态。Rust 使用 trait，Java 使用 interface，Go 采用隐式接口实现，Python 常用鸭子类型：只要对象支持所需操作，代码便可使用它。

## 领域特定语言

- **领域特定语言**（DSL）针对特定问题领域设计，以通用性换取该领域内更直接的表达能力。

- **SQL**用于关系数据库查询。SELECT name FROM users WHERE age > 30 比手写循环更直接；数据库引擎会分析查询计划，并选择连接策略和索引。

- **正则表达式**是用于文本模式匹配的小型语言。例如，模式 \d{3}-\d{4} 可匹配 555-1234 这样的字符串。许多正则引擎会将模式编译为自动机或其他执行表示；高级特性的实现和性能因引擎而异。

- **着色器语言**（GLSL、HLSL、Metal Shading Language）用于编写在 GPU 上运行的程序，计算像素颜色、顶点位置或通用计算结果。许多着色器调用可并行处理不同像素或数据元素。这与 CUDA 中常见的数据并行计算有相似之处。

- 在机器学习中，PyTorch 和 JAX 可视为嵌入 Python 的张量计算 DSL。它们提供张量、自动微分和设备放置等领域抽象，同时利用 Python 生态系统。

## 语言设计权衡

- 没有一种语言在所有方面都占优。语言设计需要在不同目标之间取舍：

- **性能与安全**：C 提供较强的硬件控制能力，但手动内存操作容易造成错误。Rust 旨在提供接近系统语言的性能，并通过编译期规则保障安全 Rust 的内存安全。Java 使用垃圾回收；Python 注重表达能力和开发效率，纯 Python 计算循环的速度通常较低。

- **表达力与简洁性**：Haskell 的类型系统能表达精细约束，但学习曲线较陡。Go 一直倾向于保持语言特性克制，已在 Go 1.18 引入泛型；它不采用类继承和传统异常机制。Python 强调代码可读性和直接表达。

- **控制与抽象**：C/C++ 允许控制内存布局、缓存行为和硬件交互；Python 隐藏了许多底层细节。机器学习训练常由 GPU 计算主导，Python 可负责高层编排；对延迟或资源要求严格的推理组件，C++ 或 Rust 可能更合适。

- **编译速度与运行速度**：项目规模、优化级别和工具链都会影响构建时间。Go 工具链常以较快构建为目标；Rust 可进行更复杂的类型检查和优化，某些项目构建时间较长。开发迭代速度与部署性能之间需要权衡。

- 机器学习生态系统体现了这些选择：Python 常用于实验和训练，C++/CUDA 常用于高性能内核和推理，Rust 则用于部分基础设施和对安全性要求较高的系统。

## 编程任务（使用 Colab 或笔记本）

1. 探索闭包和高阶函数。实现简单的函数工厂，验证闭包会保留外围环境。

```python
def make_multiplier(factor):
    """Returns a function that multiplies by factor."""
    def multiply(x):
        return x * factor
    return multiply

double = make_multiplier(2)
triple = make_multiplier(3)

print(f"double(5) = {double(5)}")  # 10
print(f"triple(5) = {triple(5)}")  # 15

# Closures capture by reference, not by value
def make_counter():
    count = [0]  # mutable container to allow modification
    def increment():
        count[0] += 1
        return count[0]
    return increment

counter = make_counter()
print(f"counter() = {counter()}")  # 1
print(f"counter() = {counter()}")  # 2
print(f"counter() = {counter()}")  # 3
```

Python 闭包捕获的是外围作用域中的变量绑定，而不是创建闭包时复制一份值。计数器示例捕获并修改同一个可变列表。

2. 比较动态类型与静态类型。观察 Python 的动态类型如何提供灵活性，同时也可能让错误延后暴露。

```python
def add(a, b):
    return a + b

# Works with different types -- flexible!
print(add(3, 5))           # 8 (int + int)
print(add("hello ", "world"))  # "hello world" (str + str)
print(add([1, 2], [3, 4]))    # [1, 2, 3, 4] (list + list)

# But type errors only surface at runtime:
try:
    print(add("hello", 5))  # TypeError! str + int
except TypeError as e:
    print(f"Runtime error: {e}")
    print("A static type checker would catch this before running")
```

该代码用不同类型展示了加法运算的多态行为，但 add 函数没有类型标注。许多静态类型检查器因此无法仅凭这段代码报告 str 与 int 相加的错误；若要演示静态检查，需要给参数和返回值补充类型注解，或使用能推断出具体调用类型的检查方式。

3. 测量解释型 Python 与编译/JIT 方法在计算密集任务上的性能差异。

```python
import time
import jax
import jax.numpy as jnp

n = 1_000_000

# Pure Python loop (interpreted)
start = time.time()
total = 0.0
for i in range(n):
    total += i * i
python_time = time.time() - start

# JAX (compiled via XLA)
@jax.jit
def sum_squares_jax(n):
    return jnp.sum(jnp.arange(n, dtype=jnp.float32) ** 2)

_ = sum_squares_jax(10)  # warm up JIT
start = time.time()
result = sum_squares_jax(n)
jax_time = time.time() - start

print(f"Python loop: {python_time:.4f}s")
print(f"JAX (JIT):   {jax_time:.6f}s")
print(f"Speedup:     {python_time / jax_time:.0f}x")
```

这段 JAX 示例按原样可能无法编译：jax.jit 默认会把 n 当作动态参数，但 jnp.arange(n) 需要静态确定数组长度。即使把 n 设为静态参数，10 的预热调用也不会预热长度为 1,000,000 的同一编译变体；首次编译时间会影响计时。GPU 上的执行通常还是异步的，需要等待结果完成后再停止计时。此外，Python 累加使用双精度浮点数，而 JAX 示例使用 float32，二者并非完全相同的计算。代码块保留原样，以上因素会影响其可运行性和速度比较。
