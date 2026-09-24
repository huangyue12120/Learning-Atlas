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

*编程语言是人类意图与机器执行之间的接口。本文件涵盖了编程范式、类型系统、内存管理策略、编译管道、解释和即时编译、关键语言特性、领域特定语言以及设计权衡*

- 任何软件、任何ML模型、任何操作系统都是通过编程语言编写而成的。但有数百种语言，每一种都有其独特的优势。为什么？因为语言设计涉及基本的权衡：性能 vs 安全、表达力 vs 简单性、控制 vs 抽象。理解这些权衡有助于你选择最适合当前任务的工具，并了解你在工作中的限制。

## 编程范式

- **范式**是编程的一种风格：一组原则，指导如何组织代码和思考问题。

- **命令式**编程描述计算为一系列命令，改变状态。“将x设置为5。向x添加3。如果x大于7，则打印它。”C、Python和Java等核心上是命令式的。思维模型是一个具有内存的机器，你逐步修改它。

- **面向对象（OOP）**编程将代码组织成**对象**：数据（属性）和行为（方法）。对象通过发送消息相互交互。关键思想是**封装**（隐藏内部状态背后一个公共接口）、**继承**（通过扩展现有类创建新类）和**多态性**（通过共享接口统一处理不同类型的对象）。Java、C++和Python支持面向对象编程。

- **函数式编程（FP）**将计算视为数学函数的评估。核心原则：**不可变性**（数据一旦创建就不会改变）、**纯函数**（输出仅依赖于输入，没有副作用）和**第一类函数**（函数是值，可以作为参数传递、从其他函数返回并存储在变量中）。Haskell纯粹是函数式编程。Python、JavaScript和Scala支持函数式风格。

- 纯函数易于推理、测试和并行化（没有共享可变状态意味着没有竞态条件）。因此，函数式思想在分布式系统和数据管道中越来越受欢迎。JAX（本书中的核心）是函数式的：`jax.grad`之所以有效是因为JAX函数是纯的。

- **逻辑编程**描述“应该是什么”而不是“如何计算”。你陈述事实和规则，运行时找到解决方案。Prolog的经典例子是给定"Socrates是男人"和"所有男人都是 mortal"，引擎推导出"Socrates是 mortal"。逻辑编程用于AI知识库和类型检查。

- 大多数现代语言都是多范式：Python支持命令式、面向对象和函数式编程风格。Rust支持命令式和函数式编程。范式是一种工具，而不是宗教。

## 类型系统

- **类型**分类了值并确定哪些操作是有效的。整数3和字符串"3"是不同的类型：你可以加整数但不能加字符串（虽然可以连接字符串，但这是一种不同的操作）。

- **静态类型**：在编译时检查类型，程序运行前捕获类型错误。C、Java、Rust和Go是静态类型的。你必须声明类型（或者编译器推断它们）：

```rust
let x: i32 = 5;     // Rust: x is a 32-bit integer
let y: f64 = 3.14;  // y is a 64-bit float
// let z = x + y;    // compile error: cannot add i32 and f64
```

- **动态类型**：在运行时检查类型，在实际执行操作时进行。更灵活，但类型错误只有在代码运行时才会显现。Python、JavaScript和Ruby是动态类型的：

```python
x = 5       # x is an int (for now)
x = "hello" # now x is a string -- no error
```

- **强类型**：语言阻止隐式类型转换。Python是强类型的：`"3" + 5`会引发TypeError。**弱类型**：语言默默地转换类型。JavaScript是弱类型的：`"3" + 5`会得到`"35"`（数字被强制转换为字符串）。C是弱类型的：你可以将指针转换为整数。

- **类型推断**允许编译器根据上下文自动推断类型，而不需要显式注释：

```rust
let x = 5;        // compiler infers: i32
let y = x + 3.0;  // compile error: mixed types, even with inference
```

- **泛型**（参数化多态）允许你编写可以处理任何类型的代码：

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

- 对于ML：Python的动态类型使得实验快速但隐藏了错误。生产中的ML系统越来越多地使用类型提示（`def train(model: nn.Module, lr: float) -> float`）和静态分析工具（mypy）在部署之前捕获错误。PyTorch和JAX使用Python以灵活性；TensorRT和ONNX Runtime使用C++进行性能优化。

## 内存管理

- 每个程序都分配和释放内存。如何管理这些内存是语言设计中最重要的一项决定。

![栈从高地址向低地址增长，堆从低地址向高地址增长，代码和数据位于底部。](../images/stack_vs_heap.svg)


- **栈**存储局部变量和函数调用帧。分配是简单的（移动堆栈指针），自动释放（弹出帧当函数返回）。栈访问速度快，因为它始终在缓存中。但栈有固定大小（通常1-8 MB）且只支持LIFO（后进先出）分配。

- **堆**存储动态分配的数据（对象、数组、字符串，其大小在编译时未知）。堆分配较慢（需要找到空块），需要显式或自动释放。堆可以增长到填满可用内存。

- **手动内存管理**（C、C++）：程序员显式分配（`malloc`）和释放（`free`）堆内存。拥有最大控制力和性能，但极其容易出错：
    - **使用后未释放**：访问已经被释放的内存。导致崩溃或安全漏洞。
    - **双释放**：两次释放同一块内存。破坏了分配器内部数据结构。
    - **内存泄漏**：分配内存但从未释放它。程序逐渐消耗所有可用的RAM。

- **垃圾回收（GC）**：运行时自动检测并释放不再可达的内存。程序员从未调用 `free`。

    - **跟踪垃圾回收**（Java、Go、Python的循环收集器）：定期遍历从“根”（栈变量、全局变量）开始的所有可达对象，并释放不可达的对象。简单但会导致**垃圾回收暂停**：程序在收集器运行时停止。现代收集器（Go的并发GC、Java的ZGC）将暂停时间减少到毫秒级。

    - **引用计数**（Python的主要机制，Swift、Objective-C）：每个对象跟踪指向它的引用数量。当计数降为0时，该对象立即释放。没有暂停，但无法处理**循环**（A引用B，B引用A，两者都具有计数> 0但都不可达）。Python使用单独的循环检测器来处理这种情况。

- **所有权**（Rust）：编译器在编译时强制执行内存安全规则，没有运行时开销。

    - 每个值都有一个 **拥有者**。当拥有者离开作用域时，该值会被丢弃（释放）。
    - 值可以被 **借用**（引用），但编译器会强制执行：要么有一个可变引用，要么有任意数量的不可变引用，但不能同时存在。
    - 这种机制防止了使用后未释放、重复释放、数据竞争和悬空指针等问题，所有这些在编译时都能得到保证。没有垃圾回收，也没有运行时开销。

- **借用检查器** 是 Rust 的杀手级特性，也是其最陡峭的学习曲线。它确保了内存安全和线程安全，而不需要垃圾回收，这就是为什么越来越多地使用 Rust 来开发性能关键系统（操作系统内核、游戏引擎、ML 推理运行时如 Candle 和 Burn）。

## 编译流程

- **编译器** 将源代码翻译成机器码（或其他目标语言）在程序运行之前。该管道有多个阶段：

![源代码 → 词法分析器 → 解析器 → 语义分析 → 优化器 → 代码生成 → 汇编语言](../images/compilation_pipeline.svg)


1. **词法分析**（标记化）：将源文本转换为一个令牌流。`x = 3 + y` 被转换为 `[IDENT("x"), EQUALS, INT(3), PLUS, IDENT("y")]`。词法分析器会去除空白和注释。

2. **解析**：从标记流构建抽象语法树（AST）。AST表示程序的层次结构。`3 + y * 2`解析为`Add(3, Mul(y, 2))`（乘法优先级更高）。解析器检查语法：括号不匹配和缺少分号在这里被捕获。

3. **语义分析**：检查类型、解析变量名称、验证函数是否正确调用参数。这是静态类型检查发生的地方。输出是一个带有类型的注释AST。

4. **优化**: 将程序转换为运行更快，但不改变其行为。常见的优化方法：
    - **常量折叠**: 在编译时计算 `3 + 5`，并将其替换为 `8`。
    - **死代码消除**: 删除永远不会执行的代码。
    - **循环展开**: 将循环替换为重复的内联代码，以减少分支开销。
    - **内联**: 替换函数调用为函数体，从而消除调用开销。

5. **代码生成**: 将优化后的表示翻译成目标机器码（x86、ARM）或中间表示。

- **LLVM** 是主流的编译基础设施。它提供了一个通用的中间表示 (LLVM IR)，许多语言都将其编译为该表示。LLVM 的优化器工作在这个 IR 上，其后端生成针对多种目标的机器码。Clang（C/C++）、Rust、Swift、Julia 和许多其他语言使用 LLVM。这意味着对 LLVM 优化器的改进将同时惠及这些语言。

## 解释与即时编译

- **解释器**逐行（或语句）执行程序，而不生成机器码。这使得启动速度快且开发过程交互性强，但执行速度较慢（每次运行时都需要重新分析每条语句）。

- 大多数解释性语言实际上编译为 **字节码**：一种比源代码更简单但不特定于机器的中间表示。字节码在 **虚拟机 (VM)** 上运行。

    - **CPython**（标准 Python 实现）将 Python 源码编译为字节码（`.pyc` 文件），然后由 CPython VM 执行。VM 逐条解释字节码。这就是为什么 Python 在计算密集型代码中比 C 快约 100 倍。

    - **JVM**（Java 虚拟机）：Java 编译为 JVM 字节码（`.class` 文件）。JVM 初始时解释字节码，然后 **即时编译**频繁执行的代码路径（“热点”）为 native 机器码。这就是为什么 Java 启动较慢（解释开销），但对长时间运行的程序接近 C 的速度（通过 JIT-优化的热点路径）。

- **JIT（即时编译）在运行时将代码编译为机器码，使用在执行期间可用的信息。一个JIT可以根据实际运行数据进行优化：如果一个函数总是被整数参数调用，JIT生成专门的整数-only机器码，跳过类型检查。**

- **PyPy** 是一个替代 Python 实现，带有 JIT 编译器。它运行大多数 Python 代码的速度比 CPython 快 5-10 倍，通过 JIT 编译热点循环为机器码。然而，它在与 C 扩展模块（如 NumPy、PyTorch）兼容性方面有限，这限制了其在 ML 中的应用。

- 解释到编译的谱系不是二进制的：
    - 纯解释：Bash shell脚本。
    - 字节码解释：CPython。
    - 字节码 + JIT：JVM、.NET CLR、LuaJIT和PyPy。
    - 提前编译（AOT）：C、C++、Rust和Go。
    - AOT + 运行时代码生成：JAX的`jax.jit`将Python函数编译为优化的XLA代码，第一次调用后缓存了编译版本。

## **闭包**：一个函数能够捕获其外部作用域的变量。这个函数“覆盖”了定义它的环境。

- 闭包是回调、装饰器和部分应用的基础，它们在函数式编程中至关重要。

```python
def make_adder(n):
    def add(x):
        return x + n  # n is captured from the enclosing scope
    return add

add5 = make_adder(5)
print(add5(3))  # 8
```

- 闭包是实现这些特性的重要机制。

- **模式匹配**：一种强大的控制流机制，基于数据的形状进行解构和分支。

```rust
match value {
    Some(x) if x > 0 => println!("Positive: {}", x),
    Some(0)           => println!("Zero"),
    Some(x)           => println!("Negative: {}", x),
    None              => println!("Nothing"),
}
```

- 模式匹配比 if-else 链更强大：它检查数据的结构（是 Some 还是 None？是否包含一个匹配条件的值？），而不是仅仅相等。Python 在 3.10 中添加了结构化模式匹配（`match`/`case`）。

- **代数数据类型（ADTs）**：可以是几种变体之一，每个变体携带不同的数据。一个 `Result` 类型要么是 `Ok(value)` 要么是 `Err(error)`。一个 `Tree` 是要么是 `Leaf(value)` 要么是 `Node(left, right)`。结合模式匹配，ADTs 可以处理所有情况，消除整个类别的错误（空指针异常、未处理的错误代码）。

- **特性与接口**：定义一个类型必须实现的方法集，但不指定如何实现。这使得多态性成为可能：一个函数可以接受“实现了Display特性的任何东西”，适用于整数、字符串和自定义类型。Rust使用特性，Java使用接口，Go使用隐式接口，Python使用鸭子类型（“如果它走路像鸭子...”）。

## 特定领域语言

- **特定领域语言 (DSL)** 是为特定问题域设计的，以在该领域内实现高表达力而牺牲通用性。

- **SQL**: 关系数据库的语言。 `SELECT name FROM users WHERE age > 30` 更易于阅读和优化，比等效的 imperative 循环更高效。数据库引擎自动选择连接策略和索引使用方式来优化查询执行计划。

- **正则表达式**（如 regex）：用于在文本中进行模式匹配的小语言。 `\d{3}-\d{4}` 匹配电话号码如 "555-1234." 正则表达式引擎将模式编译为有限状态自动机，以高效地进行匹配。

- **着色语言**（如 GLSL、HLSL 和 Metal Shading Language）：在 GPU 核心上运行的程序，用于计算像素颜色、顶点位置或执行计算操作。着色器是 massively并行的：每个调用独立地处理一个像素或一个元素。这种执行模型与 CUDA 用于 ML 计算时使用的相同。

- 在机器学习中，框架如PyTorch和JAX本质上是嵌入在Python中的DSL（领域特定语言），用于张量计算。它们提供了针对张量、自动微分和设备放置的领域特定抽象，同时利用了Python生态系统的优势。

## 语言设计权衡

- 没有语言是最好的。设计是关于选择哪些权衡：

- **性能 vs 安全**: C 语言提供了原始的速度和硬件控制，但允许你 corrupt 内存。Rust 提供了与 C 相同的性能，并且在编译时保证内存安全。Java 提供了内存安全，但伴随着垃圾回收的开销。Python 提供了最高的安全性与表达力，但执行速度比其他语言慢 100 倍左右。

- **表达力 vs 简单性**: Haskell 的类型系统可以精确地表达约束条件，但学习曲线陡峭。Go 目前刻意省略了泛型、继承和异常，以保持语言的简单性。Python 的“只有一个显而易见的方法来做到”哲学使得语言易于学习。

- **控制 vs 抽象**: C/C++ 语言提供了对内存布局、缓存行为和硬件交互的完全控制。Python 隐藏了所有这些细节。对于机器学习训练（其中 GPU 计算占主导地位），Python 的开销几乎可以忽略不计。对于机器学习推理（每微秒都至关重要），C++ 或 Rust 可能是必要的。

- 编译速度与运行速度：Go在秒级编译（简单类型系统，最小优化）。Rust在分钟级编译（复杂类型系统， aggressive优化）。折衷是开发迭代速度与部署性能。

- 机器学习生态系统反映了这些交易：Python用于实验和训练（表达性胜出），C++/CUDA用于核和推理（性能胜出），Rust用于基础设施和关键系统（安全性胜出）。

## 编程任务（使用 CoLab 或 笔记本）

1. 探索闭包和高阶函数。实现一个简单的函数工厂，并验证闭包能够捕获其环境。
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

2. 比较动态类型和静态类型的行为。展示Python的动态类型允许灵活性，但可能会隐藏错误。
```python
def add(a, b):
    return a + b

# Works with different types -- flexible!
print(add(3, 5))           # 8 (int + int)
print(add("hello ", "world"))  # "hello world" (str + str)
print(add([1, 2], [3, 4]))    # [1, 2, 3, 4](list + list)

# But type errors only surface at runtime:
try:
    print(add("hello", 5))  # TypeError! str + int
except TypeError as e:
    print(f"Runtime error: {e}")
    print("A static type checker would catch this before running")
```

3. 测量在计算密集型任务中解释型Python与编译/即时编译（JIT）方法之间的性能差异。
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
