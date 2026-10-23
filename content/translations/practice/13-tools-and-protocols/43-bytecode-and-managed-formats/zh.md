---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/43-bytecode-and-managed-formats/docs/en.md
  revision: f7aadc1d61a9fbbe2bdb107d1e2bf0a6caeea299
  sha256: 243b7ceaa5937a57f2394c2d782665f269fea71ee77136a8d502eef38618b999
status: reviewed
---

# 超越原生代码：Python、JVM、.NET 与 WebAssembly 字节码

> 一个字节码文件是一个程序，再加上编译器关于它的笔记，本课构建的那些读取器正是用来显示每种容器保留了哪些笔记的。

**类型：** 构建
**语言：** Python、Java、C#、WebAssembly 文本
**前置要求：** Phase 13 · 第 32 课（从零构建 ELF）、第 33 课（反汇编与控制流）
**预计时间：** 约 150 分钟

## 学习目标

- 读取来自 PEP 552 的 16 字节 `.pyc` 头部，并在不使用 `marshal` 模块的情况下反序列化（unmarshal）代码对象，针对四个解释器版本写出的文件。
- 按 JVMS 第 4 章解析一个 JVM class 文件：常量池、字段、方法、`Code` 属性，以及 `javac -g` 添加的那些表。
- 反汇编 `Ledger.class` 中的 JVM 操作码，并对照同一份源代码四个构建上的 `javap -c` 来验证反汇编清单。
- 逐节读取一个 WebAssembly 模块，解码每个函数体，并对照 `wasm-objdump -d` 验证结果。
- 从 PE 数据目录走到 `MethodDef` 行、再走到每个方法的 CIL，遍历一个 .NET 程序集的 ECMA-335 元数据，并对照 ILSpy 所用的那个读取库来核对。
- 针对五种容器中的同一个函数，测量每种格式保留了哪些名称、类型和控制结构，又丢失了哪些。

## 问题所在

你构建了 `ledger.py`，并在 `__pycache__` 里发现了 `ledger.cpython-314.pyc`。你问一个智能体这个文件包含什么。该智能体运行了一个反编译器。工具打印了 `Unsupported opcode` 和一行写着 `# WARNING: Decompyle incomplete`。该智能体断定这个文件被混淆过了。

这个文件没有被混淆。它的前两个字节是 `2b 0e`，即小端序的字 3627。那是 CPython 3.14 写入的数，而反编译器的操作码表停在 3.13。工具过时了。该智能体没读头部，所以它分辨不出其中的差别。

第 33 课展示了原生代码丢失了什么：参数名、类型，以及那个变成跳转表的 `switch`。字节码容器丢失得更少，而且各自丢失的东西不同。一个 pyc 保留每个变量名，但不保留类型。一个 class 文件保留类型，并且只在你要求时才保留局部变量名。一个 Wasm 模块保留控制结构，除非某个自定义节携带名称，否则丢掉名称。一个 .NET 程序集在一张表里保留参数名，而把局部变量名留给一个单独的文件。在你知道容器一开始有哪些笔记之前，你无法评判一个反编译器在它们任何一个上的输出。

本课在 Python 标准库里构建四个读取器。每一个都从容器的第一个字节开始读取，列出一个函数，并对照你构建的 fixture 上该格式自己的工具来核对。最后一节把 `ledger` 里的 `grade` 并排放进全部五种容器。

```figure
re-43-five-containers
```

## pyc 头部是四个字

PEP 552 把头部定义为四个 32 位字。第一个是魔数（magic number）。第二个是一个位域。第 0 位被置位表示该文件是基于哈希的。第 1 位被置位表示 `check_source`：解释器在导入时对源代码做哈希并比较。当第 0 位清零时，第三和第四个字是源代码的 mtime 和源代码大小。当第 0 位被置位时，它们保存源代码的 64 位 SipHash。

魔数存在于 `Include/internal/pycore_magic_number.h`。自 3.11 起它的规则是：Python 3.n 从 2900 + 50n 开始，一个发行周期内每次字节码改动加一。存储的标记（token）是那个 16 位的数，后面跟着 `\r\n`，所以以文本模式打开一个 pyc 会得到错误的魔数。最终的值是：3.11 为 3495，3.12 为 3531，3.13 为 3571，3.14 为 3627，3.15 为 3666。Python 3.15.0 于 2026-10-09 发布，在构建这些 fixture 的机器上没有安装它，所以它的数来自头文件，而不是来自这里的某个文件。

fixture 为每个解释器保存两个 pyc 文件。`compile_pyc.py` 用 `py_compile.compile(..., dfile="ledger.py")` 写它们，使得存储的文件名是 `ledger.py`，而不是构建机器的路径。3.14 文件的前 16 字节：

```text
checked-hash   2b 0e 0d 0a  03 00 00 00  c7 16 c7 fc c5 1d 81 01
timestamp      2b 0e 0d 0a  00 00 00 00  8d 60 cf 6a  f1 01 00 00
```

逐字读那个 timestamp 头部。`03 00 00 00` 或 `00 00 00 00` 是标志字。`8d 60 cf 6a` 是 0x6acf608d = 1791975565，即文件构建时 `ledger.py` 的 mtime。`f1 01 00 00` 是 497，即源代码大小。checked-hash 文件携带的是标志 3 和八个哈希字节。四个解释器在头部的所有东西上都一致，只有魔数字不同：

| 解释器 | 魔数字节 | 字 | 文件字节数 | `grade.co_code` 字节数 | `grade` 指令数 |
|---|---|---|---|---|---|
| 3.11.14 | `a7 0d 0d 0a` | 3495 | 1054 | 80 | 31 |
| 3.12.12 | `cb 0d 0d 0a` | 3531 | 937 | 62 | 26 |
| 3.13.12 | `f3 0d 0d 0a` | 3571 | 943 | 70 | 26 |
| 3.14.6 | `2b 0e 0d 0a` | 3627 | 965 | 96 | 35 |

`code/main.py` 中的 `read_pyc_header()` 返回这些字段，并从那个字命名版本。`importlib.util.MAGIC_NUMBER` 为正在运行的解释器给出同样的四个字节。`python3 code/main.py compare` 用在 `PATH` 上找到的每一个 `python3.11` 到 `python3.15` 编译源代码。对每一个，它把我们的读取器看到的头部，打印在那个解释器报告的关于它自己的事实旁边。

## Marshal 逐字段地写代码对象

每个 fixture 的第 16 个字节都是 `e3`。那是 `0x80 | ord('c')`：带 `FLAG_REF` 置位的代码对象的 marshal 类型码，它告诉读取器把这个对象记下来，供以后的 `r` 引用使用。marshal 文档说这个格式是有意不加文档的，而且代码对象在版本之间不兼容。两句话都是真的，而这个格式仍然小到可以读懂。`Python/marshal.c` 列出了这些类型码：`N` None，`i` 一个 32 位 int，`s` bytes，`z` 和 `Z` 短 ASCII 字符串，`(` 和 `)` 元组，`c` 一个代码对象，`r` 一个回引用。容器在它们的子对象之前保留它们的引用槽，所以读取器也这样做。

`w_complex_object()` 以固定顺序写一个代码对象。对于 3.11 到 3.15，它是 `argcount`、`posonlyargcount`、`kwonlyargcount`、`stacksize`、`flags` 作为 32 位 int，然后 `code`、`consts`、`names`、`localsplusnames`、`localspluskinds`、`filename`、`name`、`qualname` 作为对象，然后 `firstlineno`，再然后 `linetable` 和 `exceptiontable`。手工从第 17 个字节开始解码 3.14 文件的模块代码对象：

```text
00 00 00 00   argcount 0
00 00 00 00   posonlyargcount 0
00 00 00 00   kwonlyargcount 0
01 00 00 00   stacksize 1
00 00 00 00   flags 0
f3 22 00 00 00   type 's' with FLAG_REF, 34 bytes of co_code follow
80 00  52 06  74 00  52 01  17 00  74 01 ...
```

代码字节每两个对应一条指令：`80 00` 是 `RESUME 0`，`52 06` 是 `LOAD_CONST 6`，`74 00` 是 `STORE_NAME 0`，`17 00` 是 `MAKE_FUNCTION`。fixture 中的 3.14 反汇编清单打印出同样的五条模块级语句。`code` 之后是常量，它们保存着四个嵌套的代码对象，再之后是 `names`：`('LABELS', 'percent_change', 'grade', 'total', 'grade_label')`。

`code/main.py` 中的 `Unmarshaller` 读取这种布局，以及 3.9 和 3.10 用过的那种更老的布局，在那里 `nlocals`、`varnames`、`freevars` 和 `cellvars` 是分开的字段。它构建一个 `CodeObject`，其属性名与真实对象所拥有的相同。`varnames` 按 `localspluskinds` 的 `CO_FAST_LOCAL` 位过滤 `localsplusnames`。对于四个文件中每一个里的 `grade`，它都返回 `('score', 'bucket')`、`firstlineno` 10 和一个非空的 `linetable`。测试 `test_unmarshaller_agrees_with_the_running_interpreter` 把每个字段与正在运行的解释器所写文件上的 `marshal.loads()` 比较。另外三个文件可被我们的代码读取，而在这个解释器下无法被 `marshal` 读取。

## 四个解释器，grade 的四种字节码

dis 文档在每个版本上都带着一句告警：字节码是 CPython 的一个实现细节，不保证它保持不变。fixture 展示了这对十一行 Python 意味着什么。对每个解释器都捕获了 `python3.1N -m dis ledger.py`。

在 3.11 中 `grade` 这样开头：

```text
 11           2 LOAD_FAST                0 (score)
              4 LOAD_CONST               1 (10)
              6 BINARY_OP                2 (//)
             10 STORE_FAST               1 (bucket)
 12          12 LOAD_FAST                1 (bucket)
             14 LOAD_CONST               2 (9)
             16 COMPARE_OP               5 (>=)
             22 POP_JUMP_FORWARD_IF_FALSE     2 (to 28)
```

`BINARY_OP` 位于偏移 6，下一条指令在 10。它们之间的两个字节是来自 PEP 659（专门化自适应解释器）的一个内联缓存条目。偏移 16 处的 `COMPARE_OP` 后面跟着 22，所以它拥有两个缓存条目。除非你传 `show_caches=True`，否则这些缓存是隐藏的。3.12 用 `RETURN_CONST` 替换 `LOAD_CONST` 加 `RETURN_VALUE`，把那个跳转改名为 `POP_JUMP_IF_FALSE`，并把 `grade` 从 80 字节缩到 62 字节。3.13 打印标签 `L1` 到 `L4` 而不是偏移，并给 CLI 加上 `-C` 表示缓存、`-O` 表示偏移。3.14 又移除了 `RETURN_CONST`，加上 `LOAD_SMALL_INT` 和 `LOAD_FAST_BORROW`，并在每个条件跳转之后插入 `NOT_TAKEN`：

```text
 12         20       LOAD_FAST_BORROW         1 (bucket)
            22       LOAD_SMALL_INT           9
            24       COMPARE_OP             188 (bool(>=))
            26       CACHE                    0 (counter: 0)
            28       POP_JUMP_IF_FALSE        3 (to L1)
            30       CACHE                    0 (counter: 0)
            32       NOT_TAKEN
```

`-C -O` 清单显示 `grade` 内部有 13 个 `CACHE` 条目：五个在 `BINARY_OP` 之后，每个 `COMPARE_OP` 之后一个，每个 `POP_JUMP_IF_FALSE` 之后一个。adaptive fixture 展示了这些缓存是做什么用的。在 200 次调用之后，`dis.dis(grade, adaptive=True)` 在普通清单原本是 `RESUME` 和 `COMPARE_OP` 的地方打印 `RESUME_CHECK` 和 `COMPARE_OP_INT`，而 `total` 显示 `FOR_ITER_LIST`、`BINARY_OP_ADD_INT` 和 `JUMP_BACKWARD_NO_JIT`。这些专门化形式存在于同样的 `co_code` 字节里。一个 pyc 从不包含它们，因为专门化发生在内存中。

这就是为什么反编译器有版本上限。uncompyle6 3.9.3 声明它接受来自 Python 1.0 到 3.8 的字节码。decompyle3 3.9.3 读取 3.7 和 3.8。xdis 6.3.0——两者背后的跨版本反汇编器——读取到 3.13。pycdc 在它的构建文件里有到 `python_3_13.cpp` 的操作码表，并在遇到未知操作码时打印 `Unsupported opcode` 并把输出标记为不完整。PyLingual 声称支持自 3.6 以来发布的每个版本，并使用 3.8 到 3.15 的解释器来重新编译并核对它自己的输出。对于一个 3.14 文件，前三个拒绝或失败，只有后两个适用。在你挑工具之前，先读魔数字。

## class 文件保留一本关于它自己的字典

JVMS Java SE 25 第 4.1 节把布局给成一个结构：`magic`、`minor_version`、`major_version`、`constant_pool_count`、常量池、`access_flags`、`this_class`、`super_class`、接口、字段、方法、属性。魔数是 `0xCAFEBABE`。一个 Java SE 25 虚拟机接受主版本号 45 到 69，而 65535 的次版本号标记一个带预览特性的文件。`Ledger-g.class` 的前十个字节是 `ca fe ba be 00 00 00 41 00 5e`：主版本 65 是 Java 21，而 `0x5e` = 94 是常量池计数。`Ledger-jdk25.class` 由 javac 25.0.2 从同一份源代码构建，以 `ca fe ba be 00 00 00 45` 开头：主版本 69。

常量池是 class 文件保留它自己那本字典的地方。`-g` 构建里的条目 `#13` 是一个 `Methodref`，它指向类 `#8` 和名称-类型对（name-and-type）`#14`。顺着这些索引走下去得到 `Ledger.grade:(I)I`，这正是 `javap -v` 在 `//` 之后打印的。描述符 `(I)I` 是一个 `int` 参数和一个 `int` 结果。`total` 上的 `([I)I` 说那个参数是一个 `int` 数组。代码触及的每个方法、字段和类都有这样一个条目，而第 4.10 节里的验证器会拒绝一个指令与它们不一致的文件。`code/main.py` 中的 `ClassFile` 类读取表 4.4 中所有 17 个常量标签，并把一个 `Long` 或 `Double` 当作两个槽位。它在遇到未知标签以及最后一个属性之后还有字节时抛出异常。

属性挂在类、每个字段、每个方法，以及 `Code` 属性本身上。JVMS 说虚拟机必须忽略它不认识的属性，这就是为什么调试表可以被添加或丢弃而不改变方法体。javac 手册说 `-g` 生成全部调试信息，包括局部变量，默认生成行号和源文件，而 `-g:none` 什么都不生成。三个构建测量了这一点：

| 构建 | 字节数 | 常量池计数 | `LineNumberTable` | `LocalVariableTable` | `SourceFile` | `grade` 代码字节数 |
|---|---|---|---|---|---|---|
| `javac -g` | 1832 | 94 | 7 个方法 | 6 个方法 | 有 | 50 |
| `javac` | 1581 | 82 | 7 个方法 | 无 | 有 | 50 |
| `javac -g:none` | 1404 | 79 | 无 | 无 | 无 | 50 |

`grade` 的那 50 个代码字节在三个文件里完全相同，测试会核对这一点。`-g` 为 `grade` 添加的是一行 `LocalVariableTable`：起始 0，长度 50，槽位 0，名称 `score`，描述符 `I`。没有它，反编译器看到的是类型为 `int` 的槽位 0，只能自己编造一个名字。`StackMapTable` 在每个构建里都保留着，因为验证器需要它；而 `BootstrapMethods` 属性保留着，是因为 `main` 通过 `invokedynamic` 拼接字符串。

## 手工解码 tableswitch

JVMS 第 6 章把每条指令定义为一个操作码字节加上该操作码指名的那些操作数。分支偏移是相对于分支操作码地址的 16 位有符号值，这与 x86-64 不同——在 x86-64 上位移是相对于下一条指令的。`tableswitch` 和 `lookupswitch` 以零到三个填充字节开头，好让它们的 32 位操作数从一个是 4 的倍数的地址开始。

`Ledger-g.class` 中 `grade` 从 pc 4 开始的字节：

```text
aa                 tableswitch at pc 4
00 00 00           padding to pc 8
00 00 00 2c        default: 4 + 44 = 48
00 00 00 06        low 6
00 00 00 0a        high 10
00 00 00 2a        case 6:  4 + 42 = 46
00 00 00 28        case 7:  4 + 40 = 44
00 00 00 26        case 8:  4 + 38 = 42
00 00 00 24        case 9:  4 + 36 = 40
00 00 00 24        case 10: 4 + 36 = 40
```

三十六个字节，一条指令，就是整个 `switch (score / 10)`，连同它为 9 和 10 共享的那个 case。第 33 课里同一个 `switch` 的原生构建需要一次边界检查、一条 `lea`、一条 `movslq`、一条 `add`、一次间接跳转，以及在另一个节里的五条重定位。在这里，目标就在指令里，它们属于一起这个事实也在指令里。

`disassemble_jvm()` 覆盖全部 202 条已定义操作码及其操作数宽度，遵循填充规则，并像 `javap` 那样渲染操作数。`compare_with_javap()` 解析捕获下来的 `javap -c -p` 文本，包括多行的 `tableswitch` 块，并对每一条指令核对偏移、助记符和操作数。四个构建都在 108 条指令中的 108 条上一致。测试 `test_branch_offsets_are_relative_to_the_branch_instruction` 核对 pc 1 处的 `ifne` 落在 6、pc 13 处的 `if_icmpge` 落在 33、pc 30 处的 `goto` 落回 10。

radare2 6.2.4（为这些课程从源码构建）读取同一个文件。`rabin2 -I` 报告 `arch java`、`lang java 21`、`linenum true` 和 `lsyms true`，这是它对版本和那两张调试表的解读。`pd 14 @ sym.Ledger.grade` 打印 `tableswitch`，并带着指向它五个目标的箭头。它在这个文件上还打印 `Unable to parse code attribute: 2`，这是工具自己指出的一个局限，也是把 `javap` 保留为判定基准（oracle）的一个理由。相比 Python，这个格式的反编译器成熟得多。CFR 0.152 采用 MIT 许可证。Procyon 0.6.0 和 Vineflower 1.12.0 采用 Apache-2.0，而 Vineflower 是一个带 Java 21 支持的 Fernflower 分支。Fernflower 本身存在于 IntelliJ Community 仓库里。JADX 1.5.6 覆盖 Android 的 DEX 格式，而 JD-GUI 的最后一次发行在 2019 年。Harrand、Soto-Valero、Monperrus 和 Baudry 在 2020 年测量了其中八个。最好的一个为 84% 的类产出语法正确的输出，为 78% 的类产出语义等价的输出。他们的元反编译器（meta-decompiler）恢复了 37.6% 没有任何单一工具能处理的类。类型、名称和经过验证的栈使这个格式可被反编译。它们并不能使任何一个反编译器变得完备。

## 一个 Wasm 模块是一列节

核心规范把一个模块定义为前导码 `00 61 73 6d 01 00 00 00`——字符串 `\0asm` 和版本 1——后面跟着一些节。每个节是一个 id 字节、一个以 LEB128 表示的 `u32` 大小，以及它的内容。id 1 到 13 是已知的节，每个至多一次且按顺序出现。id 0 是一个带名称的自定义节，允许出现在任何地方。所有整数都是 LEB128，所以 `e4 00` 是 100，`80 08` 是 1024。`wasm-objdump -h` 在 `ledger.wasm` 上列出七个节，而 `WasmModule` 以同样的载荷偏移找到同样的七个：

| 节 | 载荷 | 计数 | 它为 ledger 保存什么 |
|---|---|---|---|
| Type | 10 到 26 | 3 | `(i32) -> nil`、`(i32, i32) -> i32`、`(i32) -> i32` |
| Import | 28 到 39 | 1 | `env.log`，类型 0 |
| Function | 41 到 46 | 4 | 每个已定义函数的类型索引 |
| Memory | 48 到 51 | 1 | 一页，无上限 |
| Export | 53 到 110 | 5 | `memory` 和那四个函数名 |
| Code | 113 到 271 | 4 | 23、63、44 和 23 字节的函数体 |
| Data | 273 到 290 | 1 | 偏移 1024 处的 `F\0D\0C\0B\0A\0` |

Function 节和 Code 节之间的分离之所以存在，是为了让浏览器能在整个文件到达之前就开始编译。每个代码条目是一个大小、一个局部变量声明的向量，和一个表达式。对于 `grade`，局部变量向量是 `01 7f`：一组，一个 `i32`。那是 `bucket`，带着它的类型，不带它的名字。

控制流在构造上就是结构化的。规范说分支只能以外围的 `block`、`loop` 或 `if` 构造为目标。标签按嵌套深度索引。`br_table` 通过一个索引到标签列表的操作数执行一次间接分支。解码文件偏移 `0xa3` 处 `grade` 的那个 switch：

```text
0e                  br_table
0b                  11 labels follow
04 04 04 04 04 04   buckets 0 to 5: label 4, the outermost block, returns 0
03 02 01 00         buckets 6, 7, 8, 9: labels 3, 2, 1, 0
00                  bucket 10: label 0, shared with 9
04                  default label 4
```

每个标签是一个深度。标签 0 是最内层的 `block`，它的 `end` 之后的代码是 `i32.const 4`，后面跟着一个 `br 4`，跳出结果 block。表之前的六条 `block` 指令、那十一个标签，以及表之后的五条 `br` 指令，就是整个 `switch`，而验证器会拒绝任何离开这个结构的分支。`disassemble_wasm()` 跟踪深度，使清单像 `wasm-objdump` 那样缩进，覆盖从 `unreachable` 到 `i64.extend32_s` 的每一条单字节操作码，并在两个构建上都与捕获下来的 `wasm-objdump -d` 在 77 条指令中的 77 条上一致。

名称是一个普通模块丢掉的唯一东西。`wasm-objdump` 仍然打印 `<grade>`，是因为 Export 节把那个字符串映射到函数索引 2，而读取器也这样做。局部变量名在这个 290 字节的文件里哪儿都不存在。`wat2wasm --debug-names` 添加一个名为 `name` 的自定义节，带有模块名、函数名和局部变量名的子节。文件增长到 425 字节。读取器为函数 2 找到 `{0: 'score', 1: 'bucket'}`，为函数 3 找到 `{0: 'values', 1: 'count', 2: 'sum', 3: 'i'}`。`wasm-strip` 又把这个节移除。tool-conventions 仓库描述了另外两种载体。DWARF 可以作为 `.debug_*` 自定义节嵌入。一个 `sourceMappingURL` 自定义节可以指向一个 source map，其列号是进入二进制的字节偏移。

工具链在 2026 年期间发生了变动。2026-09-15 发布的 wabt 1.0.42 移除了 `wasm-decompile`，而这台机器上的 Homebrew 构建恰好有剩下的十一个工具。wasm-tools 1.261.0 提供 `print`、`objdump` 和 `demangle`。Binaryen version_133 提供 `wasm-dis`。radare2 6.2.4 也读取这个模块。它的 `rabin2 -I` 说 `arch wasm`。它为 `grade` 给出的符号从 `0x8e` 开始——那里是局部变量向量的开头——而 `wasm-objdump` 把该函数标在 `0x8b`，即它的大小字段开头处。它的清单使用更老的助记符 `get_local`、`set_local` 和打印出标签计数的 `brtable 11 4 4 ...`。三个工具里的字节都是一样的，拼写不同，所以一次比较必须指明它是用哪个工具捕获的。本课的研究在 Ghidra 的处理器目录里没有找到 WebAssembly 处理器模块，所以那份清单没有被完整读取。第三方的 ghidra-wasm-plugin v2.4.0 面向 Ghidra 12.0。规范本身是一份活文档（living document）。`wasm-core-2` 的 W3C 页面是一份 2026 年 10 月 13 日的候选推荐草案（Candidate Recommendation Draft），其摘要描述的是 3.0 发行版，而编辑草案也带着同一个日期。

## ECMA-335 元数据是程序自己的数据库

一个 .NET 程序集是一个 PE 文件。`LedgerNet.dll` 以 `MZ` 开头，有三个名为 `.text`、`.rsrc` 和 `.reloc` 的节，并声明机器类型 `0x14c`，因为编译器发射的是平台中立的代码。可选头部的数据目录 14（CLR 运行时头部）指向 RVA `0x2008`。ECMA-335 II.25.3.3 定义那里的 72 字节：

```text
48 00 00 00   Cb 72
02 00 05 00   MajorRuntimeVersion 2, MinorRuntimeVersion 5
78 21 00 00   MetaData RVA 0x2178
84 07 00 00   MetaData size 1924
01 00 00 00   Flags: COMIMAGE_FLAGS_ILONLY
05 00 00 06   EntryPointToken 0x06000005, MethodDef row 5, which is Main
```

RVA `0x2178` 处的元数据根以签名 `42 53 4a 42` 开头，它读作 `BSJB`，然后是版本 1.1 和字符串 `v4.0.30319`。随后是五个流头部：偏移 `0x6c` 处的 `#~`，然后是 `#Strings`、`#US`、`#GUID` 和 `#Blob`。II.24.2 说每种流至多出现一次。`#~` 流以一个 `HeapSizes` 字节开头，这里是零，所以每个字符串、GUID 和 blob 索引都是两字节宽，再加上一个命名了在场的表的 64 位 `Valid` 掩码。有十四个位被置位：

| 表 | Id | 行数 | 行大小 | 这些行说什么 |
|---|---|---|---|---|
| Module | 0x00 | 1 | 10 | 模块名及其 GUID |
| TypeRef | 0x01 | 21 | 6 | `System.Object`、`System.Console`，另外 19 个 |
| TypeDef | 0x02 | 4 | 14 | `<Module>`、`Ledger`，以及两个编译器辅助类 |
| Field | 0x04 | 2 | 6 | `Labels` 和一个静态数组初始化器 |
| MethodDef | 0x06 | 6 | 14 | 那五个方法和 `.cctor` |
| Param | 0x08 | 5 | 6 | `before`、`after`、`score`、`values`、`score` |
| MemberRef | 0x0a | 16 | 6 | 12 个特性构造函数和 `Main` 调用的那 4 个方法 |
| CustomAttribute | 0x0c | 12 | 6 | 编译器和 SDK 添加的特性 |
| StandAloneSig | 0x11 | 3 | 2 | 那三个局部变量签名 |
| Assembly、AssemblyRef、ClassLayout、FieldRva、NestedClass | | 1、2、1、1、1 | | 标识、引用、布局 |

行大小哪里都没存。II.22 给每一列一个种类，II.24.2.6 给出定大小的规则。一个堆索引按 `HeapSizes` 是两字节或四字节。一个简单表索引在该表少于 65536 行时是两字节。一个可指向 n 个表、带 b 个标签位的编码索引（coded index），在这 n 个表中每一个都少于 2^(16-b) 行时是两字节。`CliAssembly` 从这些规则和行计数计算出那 14 个行大小。fixture 中的 System.Reflection.Metadata 转储报告了同样的大小和同样的表偏移，这就是测试证明这套算术的方式。

III.1.9 定义了标记（token）：高字节是表，低三个字节是从 1 开始的行号。`0x06000002` 是 `MethodDef` 行 2。那一行的 RVA 为 `0x2060`，名称为 `Grade`，签名 blob 为 `00 01 08 08`：默认调用约定，一个参数，返回 `int32`，参数 `int32`。它的 `ParamList` 指向 `Param` 的第 3 行，其名称是 `score`。Param 表就是为什么 ILSpy 能从一个去除符号的 release 构建里打印出 `Grade(int score)`。在 RVA `0x2060` 处，方法体以一个胖头部（fat header）开头：

```text
13 30         flags 0x13: fat, init locals; size 3 dwords
02 00         MaxStack 2
2d 00 00 00   CodeSize 45
01 00 00 11   LocalVarSigTok 0x11000001
```

`StandAloneSig` 第 1 行保存 `07 01 08`：`LOCAL_SIG`，一个局部变量，`int32`。这个局部变量有类型，没有名字。ECMA-335 把局部变量名保留在 Partition V 的调试交换格式里，而 .NET SDK 把它们写进一个 PDB。这个 fixture 以 `DebugType` none 构建，所以没有任何表、也没有任何文件携带名字 `bucket`。`PercentChange` 则有一个小头部（tiny header）：它的第一个字节 `3a` 是 `0x0e << 2 | 2`，一个 14 字节的方法体，没有局部变量，默认栈为 8。

`Grade` 的那 45 个代码字节用 Partition III 的操作码表解码。`switch` 是操作码 `0x45`，后面跟着一个 `u32` 计数，以及那么多个相对于表之后那条指令的 `int32` 目标：

```text
IL_0000: 02           ldarg.0
IL_0001: 1f 0a        ldc.i4.s 10
IL_0003: 5b           div
IL_0004: 0a           stloc.0
IL_0005: 06           ldloc.0
IL_0006: 1c           ldc.i4.6
IL_0007: 59           sub
IL_0008: 45 05 00 00 00 08 00 00 00 06 00 00 00 04 00 00 00 02 00 00 00 02 00 00 00
                      switch (IL_0029, IL_0027, IL_0025, IL_0023, IL_0023)
IL_0021: 2b 08        br.s IL_002b
IL_0023: 1a 2a        ldc.i4.4, ret
```

编译器在 `switch` 之前减去了 6，所以 case 6 是第一个目标。`disassemble_cil()` 通过那些表渲染标记：`ldsfld Labels`、`call Grade`、`call System.Console::WriteLine`，以及来自 `#US` 堆的 `ldstr ' '`。这一切的判定基准（oracle）是 `MetaDump`，一个在 fixture 里、基于 `System.Reflection.Metadata`（ILSpy 内部那个库）构建的简短 C# 程序。它打印每张表的行计数、大小和偏移，每个方法的 RVA、签名、参数名和 IL 字节，以及 `System.Reflection.Emit.OpCodes` 的 226 个字段。`compare_with_metadump()` 在全部 246 项核对上一致。运行时表有 218 个操作码加上八个 `prefix` 占位符。本课的表有 219 个条目，因为它包含了来自 III.2.2 的 `no.`，而 Emit 表从来没有它。

这个格式的工具：ILSpy 11.0（MIT，2026-08-12 发布）通过它的 Avalonia 桌面构建在 macOS 上运行。`ilspycmd` 11.1.0.9782 用 `-il` 打印 IL，并用 `-m 0x06000002` 按标记选择一个方法。dnSpyEx 6.6.0 在 Windows 上延续 dnSpy。IL 反汇编器 `ildasm` 以 NuGet 包而非 SDK 内置的形式发布。radare2 6.2.4 也读取这份元数据：`rabin2 -I` 说 `arch cil` 和 `class PE32`，而 `is` 列出 `Ledger.Grade(int:score):int`，参数名和两个类型都取自 Param 表和签名。它在这个构建里没有 CIL 反汇编器。这个 fixture 以 .NET SDK 8.0.205 构建，因为那是构建机器上安装的 SDK。.NET 10 自 2025-11-11 起已是当前版本，它写出同样的 ECMA-335 结构。

## 每种容器保留什么

把全部五种容器里的 `grade` 放进一张表。每一行都来自 `python3 code/main.py keeps`，它在 fixture 上运行那些读取器：

| 容器 | 方法体字节数 | 函数名 | 参数名 | 参数与返回类型 | 局部变量名 | 行号 | 控制流 |
|---|---|---|---|---|---|---|---|
| ELF 目标文件，clang -O0 | 118 | `.symtab` 中的 `grade` | 无 | 无 | 无 | 无，没有 `.debug_*` 节 | 5 次跳转，加 1 次通过重定位表的间接跳转 |
| CPython 3.14 pyc | 96 | `co_qualname` | `score` | 无 | `bucket` | `co_linetable`，起始行 10 | 4 对 compare 和 `POP_JUMP_IF_FALSE` |
| JVM class，`javac -g` | 50 | 常量池 | `LocalVariableTable` 中的 `score` | `(I)I` | 除参数外无 | `LineNumberTable`，6 行 | 1 条 `tableswitch` |
| WebAssembly | 63 | Export 节 | 仅在有 name 节时 | `(i32) -> i32` | 仅在有 name 节时 | 无 | 6 个嵌套 block，1 条 `br_table`，4 条 `br` |
| .NET 程序集 | 45 | `MethodDef` | `Param` 中的 `score` | `static int32(int32)` | 无，只有 `StandAloneSig` 里的类型 | 无 PDB 则无 | 1 条 `switch`，1 条 `br.s` |

这张表解释了你将会看到的反编译器结果。第 34 课把 `int total(const int *, int)` 与 Ghidra 从原生代码推断出的 `int total(long param_1, uint param_2)` 作了比较，因为原生代码不保留这里的任何一列。一个 pyc 保留每个名字、不保留类型，而它的控制流是每次发行都改变形状的跳转，所以 Python 反编译器按版本坏掉，而名字则免费恢复。一个 class 文件保留类型和经过验证的栈，在 `-g` 打开时保留名字，并把 `switch` 表达为一条指令。一个 Wasm 模块在构造上就保留结构，所以 `wasm2wat` 是一次无损往返，唯一的损失是名字。一个 .NET 程序集保留最完整的描述，因为那些元数据表是规范性的，而它为一个局部变量的名字仍然需要一个 PDB。

这张表告诉你反编译器得以工作所凭借的是什么，以及它的哪些输出是在复制一个被存储的事实、哪些是在推断一个事实。ILSpy 输出里的一个参数名是复制。同一个输出里的一个局部变量名是推断，除非当时存在一个 PDB。第 35 课把这种差别记录为每条结论的权威等级。

## 构建它

运行演示：

```bash
cd phases/13-tools-and-protocols/43-bytecode-and-managed-formats
python3 code/main.py
```

输出是一份 JSON 报告。对每个 pyc，它给出两个头部、文件和 `grade` 的大小、来自捕获清单的指令数和操作码名称，以及正在运行的解释器是否能读它。对每个 class 构建，它给出版本、各种大小、调试表计数，以及 `javap` 的一致性。对每个 Wasm 构建，它给出各节、类型、函数、name 节内容，以及 `wasm-objdump` 的一致性。对程序集，它给出 CLI 头部、各流、表的行计数、方法，以及 System.Reflection.Metadata 的一致性。它以那张“保留”表和在 `PATH` 上找到的解释器列表结束。

按这个顺序阅读 `code/main.py`：

1. `Reader` 持有游标和各整数宽度。`uleb()` 和 `sleb()` 是 Wasm 和 .NET blob 堆所需的 LEB128 读取器。
2. `read_pyc_header()`、`Unmarshaller` 和 `PycFile` 读取一个 pyc。`parse_dis_text()` 读取捕获下来的 `dis` 清单，使跨版本比较在测试时不需要四个解释器。
3. `ClassFile` 读取 class 文件，`disassemble_jvm()` 解码它的代码。`parse_javap_code()` 和 `compare_with_javap()` 是判定基准核对。
4. `WasmModule` 读取各节，`disassemble_wasm()` 带着深度解码一个表达式。`compare_with_wasm_objdump()` 是判定基准核对。
5. `CliAssembly` 遍历 PE、CLI 头部、元数据根、各流和各表。`TABLE_SCHEMAS` 和 `CODED_INDEXES` 是作为数据的 II.22 和 II.24.2.6。`disassemble_cil()` 解码一个方法体，`compare_with_metadump()` 核对它。
6. `NativeObject` 读取足够的 ELF 以列出函数符号，并把第 33 课的清单作为它的文本。`what_each_keeps()` 和 `figure_data()` 构建那张对照表。

还存在另外五条命令。`python3 code/main.py pyc FILE`、`class FILE`、`wasm FILE` 和 `dll FILE` 打印你给它们的某个文件的结构和其中每个函数的清单。`python3 code/main.py compare` 用 `PATH` 上的每一个解释器编译 `ledger.py`，并打印每一个写了什么。

## 使用它

按这个顺序在你构建的一个容器上使用这些读取器。

1. 读前几个字节并命名格式。两个字节然后 `0d 0a` 是一个 pyc，`ca fe ba be` 是一个 class 文件，`00 61 73 6d` 是一个模块，`4d 5a` 加上数据目录 14 被设置是一个程序集。
2. 读头部并写下它指名的生产者版本。对一个 pyc 那是魔数字，对一个 class 文件是主版本号，对一个程序集是运行时和元数据的版本字符串。
3. 在运行之前，对照那个版本核对你打算运行的每一个反编译器。记下上限以及工具在哪里为它写了文档。
4. 在同一个文件上运行读取器和该格式自己的工具，并逐行比较它们。一处不匹配要么是读取器的 bug，要么是工具的一处变动，无论哪一个都必须在把清单当作证据之前先弄明白。
5. 为你关心的那个函数填那张“保留”表。把每个事实标为保留或丢失，并指名它出自哪张表、哪个属性或哪个节。
6. 只有到这时才去读反编译器的输出。把其中每一个名字和类型标为对一个被保留事实的复制，或是一次推断。

把判定基准文本文件与容器一起保留。当一个解释器、JDK、SDK 或 wabt 版本变动时，用 `build_fixtures.sh` 重新构建并重新捕获，因为一份变了的清单就是一个变了的 fixture。

## 交互实验

### 实验 A：先读头部，再读代码对象

从 `code` 目录打开 Python：

```bash
cd phases/13-tools-and-protocols/43-bytecode-and-managed-formats/code
python3 -q
```

运行：

```python
from main import *
pyc = load_pyc("ledger.cpython-311.pyc")
pyc.header.to_dict()
pyc.module.names
pyc.functions()["grade"].varnames
len(pyc.functions()["grade"].code)
```

在第一次调用之前写下魔数字。然后加载 `ledger.cpython-314.pyc` 并比较两个 `code` 的长度。接着在你的解释器下对 3.11 文件试一下 `import marshal; marshal.loads(pyc.data[16:])` 并读那个错误。

### 实验 B：常量池链

```python
cls = load_class("Ledger-g.class")
cls.constant(13)
cls.constant(14)
cls.describe_constant(13)
[row["text"] for row in jvm_listing(cls, "grade")]
```

在调用 `describe_constant` 之前，先手工从 `#13` 顺到 `#8` 和 `#14`，再顺到那些 `Utf8` 条目。然后加载 `Ledger-gnone.class`，并在两者上调用 `cls.method("grade").attribute_names()`。`Code` 数组相同，属性则不同。

### 实验 C：深度与标签

```python
module = load_wasm("ledger.wasm")
[(row["depth"], row["text"]) for row in wasm_listing(module, "grade")]
module.function_name(2)
load_wasm("ledger-names.wasm").names["locals"][2]
```

找到那条 `br_table` 行并读它的深度。数它之后的 `end` 行，并把每一行与表里的一个标签号对上。然后打开 `ledger.wat`，找到标签 3 所命名的那个 `block $six`。

### 实验 D：从标记到字节

```python
asm = load_assembly("LedgerNet.dll")
asm.method("Grade")
body = asm.method_body(asm.method("Grade")["RVA"])
body.fat, body.max_stack, body.code_size, hex(body.local_signature_token)
asm.token_text(0x11000001)
[row["text"] for row in cil_listing(asm, "GradeLabel")]
```

手工从 `.text` 节头部算出 RVA `0x2060` 的文件偏移，并与 `asm.rva_to_offset(0x2060)` 比较。然后查 `asm.row(0x08, 3)`，找到名字 `score` 存在哪里。

## 实践实验

给这张对照表添加第五种源语言，或给表添加第六个事实。

要求：

- 用一门你有其编译器的语言，写一个带循环和局部变量的函数，例如 Kotlin 到一个 class 文件，或 Rust 到一个 Wasm 模块。把输出和判定基准清单连同 `build_fixtures.sh` 中的确切命令一起提交。
- 让相应的读取器在每一条指令上都与判定基准一致。只在 fixture 需要时才添加操作码。
- 用这个新容器扩展 `what_each_keeps()`，并为每种容器再加一个事实：方法体是否携带一张异常表或一个 `try` 区域。
- 把新容器加进 `figure_data()` 并重新生成 `site/figures-re-43.js`。
- 写一个测试：当一个读取器把某个事实报告为保留、却没有指名持有它的那张表、那个属性或那个节时，该测试失败。

成功意味着 `python3 code/main.py keeps` 显示出带有每个单元证据的新行，并且每一处判定基准比较仍然一致。

## 随课交付物

本课包含 `outputs/skill-bytecode-and-managed-formats.md`。用它把一个字节码容器变成一份头部报告、一份经过核对的单个函数清单，以及一张把每个名称、类型和结构标为保留或丢失的事实表。它要求用该格式自己的工具作为判定基准、在运行任何反编译器之前做一次版本核对，以及一份说明——每个丢失的事实原本会存在于何处。

## 验证它

运行演示和确定性测试套件：

```bash
cd phases/13-tools-and-protocols/43-bytecode-and-managed-formats
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

验证应当证明：

- 四个 pyc 头部携带魔数字 3495、3531、3571 和 3627、标志 3 和一个 8 字节哈希，而 timestamp 文件携带标志 0、mtime 1791975565 和大小 497
- 3.11 及之后的每个魔数字都落在 `2900 + 50n` 规则为其发行版给出的范围内
- 反序列化器返回的名称、常量、代码字节、变量名和行号表，与正在运行的解释器所写文件上的 `marshal.loads()` 相同
- 四个文件都保留模块名、`grade` 的 `('score', 'bucket')`、起始行 10，以及作为文件名的 `ledger.py`
- `grade.co_code` 在四个版本上是 80、62、70 和 96 字节，捕获清单有 31、26、26 和 35 条指令
- 3.11 清单有 `POP_JUMP_FORWARD_IF_FALSE`，3.12 和 3.13 有 `RETURN_CONST`，而 3.14 有 `LOAD_SMALL_INT`、`LOAD_FAST_BORROW` 和 `NOT_TAKEN`
- 3.14 的 `-C -O` 清单在 `grade` 里显示 13 个缓存条目，其中五个在 `BINARY_OP` 之后，而 adaptive 清单显示 `COMPARE_OP_INT`
- 一个没有 `0d 0a` 的头部、一个被截断的头部，以及一个不是代码对象的方法体，都抛出 `FormatError`
- 只对正在运行的解释器所写的那个 pyc 才存在指令清单，并与捕获的 `dis` 输出一致
- 那些 class 文件的主版本是 65 或 69，大小是 1581、1832、1404 和 1581，常量池计数是 82、94、79 和 82
- 常量 `#13` 解析为 `Method Ledger.grade:(I)I`，`#47` 解析为 `String F`
- JVM 反汇编器在四个构建里都与 `javap -c -p` 在 108 条指令中的 108 条上一致
- pc 4 处的 `tableswitch` 是 36 字节，low 6、high 10、default 48，目标 46、44、42、40、40
- 三个调试级别改变属性计数，而让 `grade` 的那 50 个代码字节保持完全相同
- `ifne`、`if_icmpge` 和 `goto` 的目标相对于分支操作码
- 一个错误的魔数、尾随字节，以及一个未定义的操作码，都抛出 `FormatError`
- 七个 Wasm 节有 `wasm-objdump -h` 打印的那些载荷偏移，而 names 构建在 293 到 425 处添加一个 `name` 自定义节
- 类型、`env.log` 导入、五个导出，以及 1024 处的数据段，都按 `ledger.wat` 里所写那样解码
- Wasm 反汇编器在两个构建里都与 `wasm-objdump -d` 在 77 条指令中的 77 条上一致
- `grade` 有 6 个嵌套 block、一个标签为 `4 4 4 4 4 4 3 2 1 0 0`、默认 4、深度 6 的 `br_table`，以及一个 `i32` 局部变量
- 函数名在没有 name 节时来自导出，而局部变量名只在有 name 节时才有
- LEB128 的 `e4 00` 是 100，`7f` 是 -1，`80 08` 是 1024，而块类型像 `wasm-objdump` 那样渲染
- 一个错误的前导码、版本 2，以及一个未知操作码，都抛出 `FormatError`
- 这个程序集是 PE32，机器类型 `0x14c`，CLI 头部在 RVA `0x2008`，运行时 2.5，`ILONLY`，入口点 `0x06000005`
- 元数据版本是 `v4.0.30319`，存在五个流，而那 14 张表有判定基准所报告的行计数和行大小
- .NET 读取器在 246 项核对中的 246 项上与 System.Reflection.Metadata 一致
- `Grade` 有参数 `score`、签名 `static int32(int32)`、一个 `MaxStack` 为 2、代码字节为 45 的胖头部，以及一个没有名字的 `int32` 局部变量
- CIL 的 `switch` 目标、`br.s`、`ldsfld`、`call` 和 `ldstr` 操作数，都通过那些表和堆解析
- CIL 操作码表覆盖每一个运行时操作码，只额外加上 `no.`
- “保留”表在四种容器中报告参数名、在原生代码中都不报告，而在三种容器中报告类型
- 演示里的每一行判定基准都读作 n of n
- 交互式 figure 嵌入 `figure_data()` 产出的同样数据

## 生产失败模式

| 失败 | 弱工具报告什么 | 分析必须证明什么 |
|---|---|---|
| 反编译器比解释器旧 | `Unsupported opcode`、输出被标为不完整，或一句关于混淆的断言 | 魔数字、它指名的发行版，以及工具有文档记载的上限 |
| 用错误的解释器读 pyc | `marshal.loads` 抛出异常或返回垃圾 | 我们的反序列化器从任何 3.9 到 3.15 的文件读取名称、常量和大小，而指令来自匹配的 `dis` |
| 把专门化操作码当作文件的内容 | 清单里出现 `COMPARE_OP_INT` | 一个 pyc 保存的是未专门化形式，专门化发生在预热后的内存中 |
| 为一个默认的 javac 构建报告局部变量名 | 把 `var1`、`var2` 当作源代码名呈现 | `LocalVariableTable` 只在有 `-g` 时才在场，两种方式下那 50 个代码字节相同 |
| 分支目标偏了一条指令的长度 | 一份跳转落在指令中间的 JVM 清单 | 相对于分支操作码的偏移，对照 `javap` 核对 |
| 跳过了 switch 的填充 | 一条带有错误 default 和位移了的 case 的 `tableswitch` | 到一个 4 对齐 pc 的零到三个填充字节，五个 case 36 字节 |
| 假设 Wasm 名称被去除 | “没有符号” | 导出为每个被导出的函数命名，局部变量名需要 `name` 节，`wasm-strip` 只移除那个节 |
| 三个工具，三种拼写 | `get_local` 对 `local.get`，函数在 `0x8b` 对 `0x8e` | 同样的字节，以及比较是用哪个清单捕获的 |
| 猜测表的行大小 | 第一张表之后的每一行都被误读 | 来自 `HeapSizes`、行计数和编码索引宽度的行大小，与判定基准相等 |
| 在一个 release 程序集里期望局部变量名 | 把 `V_0` 当作源代码名呈现 | 局部变量在 `StandAloneSig` 中有类型，名字只在一个 `DebugType` none 没有写的 PDB 里 |
| 读取器猜测一个未知操作码或类型码 | 一个貌似合理的助记符 | 带偏移的 `FormatError`，而判定基准比较在那里停止 |
| 从另一个构建捕获判定基准 | 测试在陈旧文本上通过 | `build_fixtures.sh` 指名每个工具版本，并写出 `versions.txt` 和 `sha256.txt` |

## 操作规则

先读头部，并命名它指向的生产者。用一个会拒绝它不认识之物的读取器来读容器，并在同一个文件上对照该格式自己的工具核对它的清单。然后对一个反编译器输出里的每一个名字和类型，说清是容器存了它，还是工具推断了它。

## 延伸阅读

- [PEP 552: Deterministic pycs](https://peps.python.org/pep-0552/)
- [CPython `Include/internal/pycore_magic_number.h`](https://github.com/python/cpython/blob/main/Include/internal/pycore_magic_number.h)
- [Python `marshal` module documentation](https://docs.python.org/3/library/marshal.html)
- [CPython `Python/marshal.c`](https://github.com/python/cpython/blob/main/Python/marshal.c)
- [Python 3.14 `dis` module documentation](https://docs.python.org/3.14/library/dis.html)
- [PEP 659: Specializing Adaptive Interpreter](https://peps.python.org/pep-0659/)
- [PEP 626: Precise line numbers for debugging and other tools](https://peps.python.org/pep-0626/)
- [PEP 790: Python 3.15 Release Schedule](https://peps.python.org/pep-0790/)
- [uncompyle6 on PyPI](https://pypi.org/project/uncompyle6/), [decompyle3 on PyPI](https://pypi.org/project/decompyle3/), [xdis on PyPI](https://pypi.org/project/xdis/), [pycdc on GitHub](https://github.com/zrax/pycdc), [PyLingual on GitHub](https://github.com/syssec-utd/pylingual)
- [The Java Virtual Machine Specification, Java SE 25, Chapter 4: The class File Format](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-4.html)
- [The Java Virtual Machine Specification, Java SE 25, Chapter 6: The Java Virtual Machine Instruction Set](https://docs.oracle.com/javase/specs/jvms/se25/html/jvms-6.html)
- [javac manual, Java SE 25](https://docs.oracle.com/en/java/javase/25/docs/specs/man/javac.html) and [javap manual](https://docs.oracle.com/en/java/javase/25/docs/specs/man/javap.html)
- [CFR](https://www.benf.org/other/cfr/), [Procyon](https://github.com/mstrobel/procyon), [Vineflower](https://github.com/Vineflower/vineflower), [Fernflower in intellij-community](https://github.com/JetBrains/intellij-community/tree/master/plugins/java-decompiler/engine), [JADX](https://github.com/skylot/jadx)
- [Harrand, Soto-Valero, Monperrus, Baudry, "Java Decompiler Diversity and its Application to Meta-decompilation" (JSS 2020)](https://arxiv.org/abs/2005.11315)
- [ECMA-335, Common Language Infrastructure, 6th edition (June 2012)](https://ecma-international.org/publications-and-standards/standards/ecma-335/)
- [PE Format, Microsoft Learn](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format)
- [System.Reflection.Metadata.Ecma335.TableIndex](https://learn.microsoft.com/en-us/dotnet/api/system.reflection.metadata.ecma335.tableindex)
- [ILSpy on GitHub](https://github.com/icsharpcode/ILSpy), [ilspycmd on NuGet](https://www.nuget.org/packages/ilspycmd), [dnSpyEx on GitHub](https://github.com/dnSpyEx/dnSpy)
- [WebAssembly Core Specification: Binary Format, Modules](https://webassembly.github.io/spec/core/binary/modules.html) and [Values](https://webassembly.github.io/spec/core/binary/values.html)
- [WebAssembly Core Specification: Custom Sections (name section)](https://webassembly.github.io/spec/core/appendix/custom.html)
- [WebAssembly tool-conventions: Debugging](https://github.com/WebAssembly/tool-conventions/blob/main/Debugging.md)
- [wabt 1.0.42 release notes](https://github.com/WebAssembly/wabt/releases/tag/1.0.42), [wasm-tools](https://github.com/bytecodealliance/wasm-tools), [Binaryen](https://github.com/WebAssembly/binaryen), [ghidra-wasm-plugin](https://github.com/nneonneo/ghidra-wasm-plugin)
- [radare2 on GitHub](https://github.com/radareorg/radare2), version 6.2.4 built from source for this lesson
