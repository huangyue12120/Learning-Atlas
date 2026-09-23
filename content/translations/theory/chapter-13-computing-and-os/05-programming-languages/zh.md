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

*编程语言通过范式、类型系统、内存管理、编译与解释机制定义程序的表达方式。本篇也讨论 JIT、领域特定语言和语言设计的工程权衡。*



* 编程语言是人类意图和机器执行的界面. 该文件涵盖了语言范式,类型系统,内存管理策略,编译管道,口译和JIT编译,关键语言特征,特定域语言,以及设计取舍*

- 每块软件,每个ML模型,每个操作系统都是用编程语言来写的. 但语言有上百种,每种都有不同的长处. 为什么? 因为语言设计涉及基本的取舍:性能与安全,表现与简单,控制与抽象. 理解这些权衡有助于你选择合适的工作工具,并了解你在其中工作的制约因素.

## 语言范式



- 一个**paradigm **是一种编程的风格:一套指导您如何构建代码和思考问题的原理.

- ** Imperative**编程描述计算是更改状态的命令序列. "排出X到5个. 将3加为x. 如果 x > 7,请打印". C,Python和Java是他们的核心 精神模型是一种有记忆的机器,你一步一步地修改.

- ** 面向对象(OOP)** 编程围绕**对象**组织代码:数据包(属性)和行为(方法). 对象通过向对方发送消息进行交互. 主要思想有:**封接**(公共界面背后的内在状态),**继承**(通过扩展已存在的类别创建出新类)和**polymorphism**(通过共享界面统一处理不同类型. Java,C++,和Python支持OOP.

- **功能编程(FP)** 将计算作为数学函数的评价. 核心原理:**不可变性**(数据一旦创建后不会改变),**纯函数**(输出只取决于输入,没有副作用),和**一等函数**(函数是可以作为参数传递的值,从其他函数返回,并被存储在变量中). 哈斯克尔是纯粹的功能。Python,JavaScript,和斯卡拉支持功能风格.

- 纯粹的函数很容易解释,测试,和平行(没有共享可变状态表示没有种族条件). 这就是为什么在分布式系统和数据管道中越来越多地使用功能性想法。JAX(在本书中使用)功能:`jax.grad`工作是因为JAX功能是纯的.

- **Logic编程** 描述的是"什么是应该真实的",而不是"怎样计算". 你讲事实和规则, 运行时间找到解决方案。普罗洛克是典型的例子:给"苏格拉底是人"和"所有的人都是凡人",引擎衍生出"苏格拉底是凡人". 逻辑编程被用于AI知识库和类型检查.

- 大多数现代语言为**多-paradigm**:Python支持必须,OOP,和功能风格. 鲁斯特支持必要和功能。范式是一种工具,而不是宗教.

## 类型系统



- **type** 分类值,并确定哪些操作是有效的. 整数3和字符串"3"是不同的类型:你可以添加整数,但不能添加字符串(嗯,你可以将字符串调和,但这是一种不同的操作).

- ** Statistic打字**:类型在编译时间**,程序运行前检查. 类型错误被及早发现. C,Java,Rust,和Go都是静态打字的. 您必须声明类型(或编译器推断它们):

```rust
let x: i32 = 5;     // Rust: x is a 32-bit integer
let y: f64 = 3.14;  // y is a 64-bit float
// let z = x + y;    // compile error: cannot add i32 and f64
```

- ** 动态打字**:类型在**运行时间**,实际执行时检查。更灵活但类型出错只当代码运行时会出面. Python, JavaScript, 和Ruby 被动态地输入:

```python
x = 5       # x is an int (for now)
x = "hello" # now x is a string -- no error
```

- ** Strong打字**:语言防止隐含类型强迫. Python 强烈的键入:`"3" + 5`升起类型错误。**微打字**:语言无声地转换类型. JavaScript 键入很弱 :`"3" + 5`给`"35"`(数字被胁迫为字符串). C被弱打出:可以将指针投向整数.

- ** Type 推论** 允许编译者在无明确说明的情况下推断类型:

```rust
let x = 5;        // compiler infers: i32
let y = x + 3.0;  // compile error: mixed types, even with inference
```

- ** Generics**(参数多态性)允许您写出与任意类型配合的代码:

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

- 对于ML:Python的活性打字使实验速度快而隐藏了bug. 生产ML系统越来越多地使用类型提示(`def train(model: nn.Module, lr: float) -> float`)和静态分析工具(mypy),在部署前捕获出错. PyTorch和JAX使用Python作为灵活性; TensorRT和ONNX 运行时使用C++作为性能.

## 内存管理



- 每个程序都会分配和释放内存. 如何管理这种能力是语文设计方面最有影响的决定之一。

![内存布局:栈从高地址向下生长,堆积由上而上,底部有代码和数据](../images/stack_vs_heap.svg)

- **stack**存储本地变量和函数调用帧. 分配是微不足道的(移动栈指针),处理位置是自动的(在函数返回时按下框架). 栈访问速度快,因为它总是在缓存中. 但栈有固定大小(典型的为1-8 MB),并只支持LIFO(最后先出)分配.

- **heap** 存储动态分配的数据(对象,数组,其大小在编译时未知). 高压分配速度较慢(需要找到自由块),需要明确或自动处理位置. 堆积可以生长以填补可用的内存.

- ** 手册内存管理**(C, C++):程序员明确分配(`malloc`)和免费(`free`堆积的记忆。最大控制和性能,但极易出错:
    - ** 无使用**:访问已释放的内存。造成碰撞或安全弱点。
    - **双自由**:释出同一种内存两次. 腐蚀了分配器的内部数据结构.
    - **记忆泄漏**:分配记忆但永远不释放. 程序会慢慢地消耗所有可用的RAM.

- **Garbage Collection(GC)**:运行时间自动检测并释放已无法到达的内存. 程序员从不打电话`free`.

    - ** 追踪GC**(Java,Go,Python的循环采集器):定期从"根"(stack变量,全局变量)中穿越出所有可到达的对象,并释放出无法到达的对象. 简单但原因 **GC暂停**:程序在收集器运行时停止. 现代收藏家(Go's并列GC,Java's ZGC)将暂停时间最小化到分毫秒.

    - **参考计数**(Python的主机斯威夫特,目标-C):每个对象跟踪有多少参考指向它. 当计数下降到0时,对象立即被放出. 没有暂停,但不能处理**周期**(A参考 B,B参考 A,两者都有 > 0的计数,但都无法达到). Python使用单独的循环探测器来处理这个.

- **Ownership** (Rust):编译器在编译时执行内存安全规则,运行时间为零高通.

    - 每个值都有一个**所有者**。当所有者脱离范围时,值被放弃(自由出).
    - 值可以被**borrowed ** (引用),但编译器执行:要么一个可变的引用,要么任何不可变的引用数量,从不同时同时使用.
    - 这可以防止在编译时间进行无后用,双自由取,数据竞相和牵引指针. 没有GC,没有运行时间成本。

- ** 浏览器** 是Rust的杀手特征及其最陡峭的学习曲线. 它保证了没有垃圾收集的记忆安全和线程安全,这就是为什么Rust越来越多地被用于性能关键系统(OS内核,游戏引擎,Candle和Burn等ML推论运行时间).

## 编译流水线



- 一个**编译器**在程序运行前将源代码翻译为机器代码(或另一种目标语言). 管道分为几个阶段:

![编译管道:出处-出处-词典-解说-语义分析-选取者-代码生成-机码.](../images/compilation_pipeline.svg)

1. ** Lexing** (tokenisation):将源文本转换为一串令牌.`x = 3 + y`变成`[IDENT("x"), EQUALS, INT(3), PLUS, IDENT("y")]`。。。词典会画出白空间和评论.

2. **Parsing**:从符号流中构建出**Abstract语法树(AST)**. AST代表了程序的分级结构.`3 + y * 2`解析为`Add(3, Mul(y, 2))`(乘法有更上等之先. 解析器检查语法:错配的括号和缺失的分号在此被捕获.

3. ** 语义分析**:检查类型,解析可变名称,验证函数与正确参数调用. 静态类型检查就是在这里发生的. 输出为已打出,注解的AST.

4. ** 优化**:转换程序以更快运行而不改变其行为. 常见优化 :
    - ** 连续折叠**:计算`3 + 5`在编译时,将其替换为`8`.
    - **去除已死代码**:去除永远无法执行的代码.
    - ** 循环解滚**:用重复的内线代码来替换一个回路来减少分支间接费用.
    - ** 插入**:用函数正文取代函数调用,去掉调用间接费用。

5. **Code生成**:将优化的表示式转换为目标机码(x86,ARM)或中间表示式.

- ** LLVM**是主要的编译基础设施。它提供了多种语言所编译的通用中间代表(LLVM IR). LLVM的Opimiser在这个IR上工作,它的后端为许多目标生成了机器代码. 克朗语(C/C++),鲁斯特语,斯威夫特语,茱莉亚语等多语言使用LLVM. 这意味着LLVM的Opimiser的改进同时有利于所有这些语言.

## 解释执行与 JIT 编译



- ** 解释** 执行程序行按行(或语句按语句),而无需生成机器代码. 这使得起动速度快,开发互动,但执行速度更慢(每行运行时都会重新分析).

- 大多数被解释语言实际上编译为**字节码**:一种中间代表,比出自源代码简单而并非机器特有. 字节码运行于**虚拟机上(VM)**.

    - ** CPython**(标准Python执行)将Python源编译为字节码(`.pyc`文件),由CPython VM执行. VM一次解释一个字节码指令. 这就是为什么Python在计算-重码方面比C慢~100x.

    - **JVM**(贾瓦虚拟机):Java编译为JVM字节码(`.class`文档). JVM最初将字节码解释为"活字节",后被**JIT-编译为"经常被执行的代码路径"("热点")来解释"本地机器代码". 这就是为什么Java开始比C(解释间接费用)慢,但接近C的速度用于长期运行的程序(JIT-优化热路).

- ** Just-In-Time)编译**在运行时将代码编译为机器代码,只使用执行期间可获得的信息. 一个JIT可以基于实际运行时间数据优化:如果一个函数总是被用整数参数调用,那么JIT生成专门的整数只使用机器代码,跳过类型检查.

- ** PyPy** 是具有JIT编译器的替代 Python 执行. 它运行的Python码多快于CPython由JIT-comply热回路到机器代码. 然而,它与C扩展模块(NumPy,PyTorch)的兼容性有限,限制了其在ML中的使用.

- 从解释到编译的频谱不是二进制 :
    - 纯正诠释:巴什外壳脚本.
    - 字节代码解释:CPython.
    - 字节码+JIT:JVM,.NET CLR,LuaJIT,PyPy.
    - 前期(AOT)汇编:C,C++,Rust,Go.
    - AOT + 运行时间代码生成:JAX's`jax.jit`编译 Python 函数,以便在第一次调用时优化 XLA 代码,然后缓存所编译的版本.

## 关键语言特性



- ** 关闭**:一个能捕捉其附件范围中的变量的函数。定义环境的函数“ 关闭” :

```python
def make_adder(n):
    def add(x):
        return x + n  # n is captured from the enclosing scope
    return add

add5 = make_adder(5)
print(add5(3))  # 8
```

- 关闭是召回,装饰,以及部分应用背后的机制. 它们对于职能性方案拟订至关重要。

- ** Pattern 匹配**:一个强大的控制流机制,根据它的形状来解析数据和分支:

```rust
match value {
    Some(x) if x > 0 => println!("Positive: {}", x),
    Some(0)           => println!("Zero"),
    Some(x)           => println!("Negative: {}", x),
    None              => println!("Nothing"),
}
```

- 模式匹配比如果- else 链条更具表达性: 它检查数据的结构(是 Some 还是 None ? 它是否包含匹配条件的值?),而不仅仅是平等. Python 在 3.10 中添加了结构图案匹配(P)`match`/`case`).

- **代数数据类型(ADTs)**:可以成为多个变体之一的类型,每个变体携带不同的数据. A 类`Result`类型是任意`Ok(value)`或 为`Err(error)`。。。A 类`Tree`要么是`Leaf(value)`或 为`Node(left, right)`。。。ADTs与模式匹配相结合,可以对所有的大小写进行详尽处理,去除全部的bug类(null指针例外,未处理出错代码).

- ** 运输和接口**:定义一个类型必须执行的一套方法,而未具体说明如何执行。这可以实现多态性:一个功能需要"任何执行显示特性的东西"与整数,字符串,自定义类型相配合. Rust使用特质,Java使用界面,Go使用隐含界面,Python使用鸭打字("如果走得像鸭子...").

## 领域特定语言



- 一个**域特有语言(DSL)**是针对特定问题域而设计的,在域内以通性交换表达.

- ** SQL**:关系数据库的语言。`SELECT name FROM users WHERE age > 30`远比同等的必修道更易读取和可选取。数据库引擎选择查询执行计划,自动选择加入策略和索引使用.

- ** 规范表达式**:用于文本中图案匹配的一种迷你语言.`\d{3}-\d{4}`和"555-1234"一样的电话号码匹配. Regex 引擎编译模式以限制自動相配.

- **shader 语言**(GLSL,HLSL,金属洗涤语言):运行在GPU核心上以计算像素颜色,顶点位置,或计算操作的程序. 阴影是巨大的平行的:每个引用过程都独立一个像素或一个元素. 这是CUDA在ML计算时使用的同一种执行模式.

- 在ML中,像PyTorch和JAX这样的框架本质上是用于拉诺计算的DSL,被嵌入到Python内部. 它们提供域特有抽象(ensors,自发分化,设备放置),同时能利用Python的生态系统.

## 语言设计权衡



- 无有语言最上一切相. 设计是要选择要做出哪些权衡:

- **Performance vs safety**:C给出了原始速度和硬件控制,但让你损坏了记忆. Rust 给出了与编译时存储器安全性相当的速度. Java提供内存安全, 并使用垃圾收集方式管理. Python给予最大安全和表达力,执行速度为100x更慢.

- ** Expressive vs simple**:Haskell的类型系统可以表达非常精确的制约,但具有陡峭的学习曲线. 去故意省略通则(直到最近),继承,和简单化的例外. Python)"应该有一个明显的方法来做"哲学使语言能够被学习.

- ** Control vs 抽象**:C/C++赋予您对内存布局,缓存行为,和硬件交互的控制. 彼菩萨所藏一切相. 对于ML训练(其中GPU计算为主),Python的起居费可以忽略不计. 对于ML推论(其中每微秒计数),C++或Rust可能是必要的.

- **汇编速度与运行时间速度**:去编译以秒计(简单类型系统,最小优化). rust编译分分钟(复杂类型系统,侵略性优化). 取舍是开发者迭代速度与部署的性能.

- ML生态系统反映了这些取舍:实验和培训的Python(表现胜出),内核和推论的C++/CUDA(表现胜出),基础设施的Rust和关键安全系统(安全胜出).

## 编程任务（使用 Colab 或 notebook）



1. 探索关闭和高序功能. 实施一个简单的功能工厂,并核实关闭会捕捉到它们的环境.
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

2. 比较动态与静态打字行为. 显示 Python 的动态打字如何允许灵活性,但可以隐藏错误.
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

3. 为计算繁重的任务衡量解释的Python和汇编/联合信息技术方法之间的性能差异。
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
