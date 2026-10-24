---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/41-recovering-data-and-types/docs/en.md
  revision: f7aadc1d61a9fbbe2bdb107d1e2bf0a6caeea299
  sha256: f0f18a349d043439fda3162109319c8dc9ad40b2139809ae388d794001775797
status: reviewed
---

# 恢复数据与类型：结构体、数组、C++ 对象与 DWARF

> 当反编译器有一张类型表时，它打印 `a->balance`；没有时，它打印 `*(int *)(param_1 + 4)`。本课从那些访问中构建这张表，从 DWARF 5 中读取那张真实的表，并展示两者一致之处。

**类型：** 构建
**语言：** Python、C、C++、x86-64 汇编
**前置要求：** Phase 13 · 33（反汇编与控制流）、Phase 13 · 34（提升到伪代码）
**预计时间：** 约 140 分钟

## 学习目标

- 依据 Intel SDM 的寻址规则，把一次结构体成员访问读作基址寄存器加位移，把一次数组访问读作基址加索引乘步长。
- 手工把 System V 的对齐规则应用到 `struct account`，并解释每一个填充字节。
- 构建一个类型恢复 pass，把一段清单中的访问转成字段偏移、宽度、种类、一个步长和一个大小，并为每一项给出证据。
- 为一个可重定位目标文件的 `.debug_info`、`.debug_abbrev`、`.debug_str_offsets` 和 `.debug_addr` 写一个 DWARF 5 读取器，并用 `llvm-dwarfdump` 对照它。
- 把恢复出的布局与 DWARF 布局进行比较，并把每一处差异命名为缺失的证据、一次合并的访问，或一个无法证明的种类。
- 从重定位中读取一个 Itanium C++ 虚函数表（vtable）、它的 typeinfo 和它的修饰名，并把一次虚调用解析到一个槽。

## 问题

你没带 `-g` 编译了 `account.c`，并问一个智能体 `bump` 做什么。该智能体把目标文件送进 Ghidra 12.1.4，得到了这个结果：

```c
void bump(long param_1,int param_2)
{
  *(int *)(param_1 + 4) = param_2 + *(int *)(param_1 + 4);
  return;
}
```

带 `-g` 编译的同一份源码，在同一个反编译器上给出了这个：

```c
int bump(account *a,int by)
{
  a->balance = by + a->balance;
  return a->balance;
}
```

两个目标文件中的指令完全相同。差别在于一张类型表。有了这张表，反编译器就知道第一个参数指向一个 32 字节的结构体，其偏移 4 处的字段是一个名为 `balance` 的 4 字节 `int`。没有它，反编译器只知道有某个 8 字节宽的东西到了 `%rdi` 中，而 `+4` 处的 4 字节被读又被写了。

那张表里的每一样东西都有来源。偏移 4 来自 `addl 0x4(%rax), %ecx` 的位移字节。宽度 4 来自 `l` 后缀。名字来自 `.debug_info` 中的一个 `DW_TAG_member` 条目。本课构建两半：一个恢复指令所能证明的东西的 pass，以及一个解码编译器所记录的东西的读取器。两者之间的差距，就是一个类型名所花的代价。

```figure
re-41-struct-recovery
```

## 一次成员访问就是一个位移

Intel SDM 第 1 卷第 3.7.5 节把有效地址定义为 `Offset = Base + (Index * Scale) + Displacement`，其中缩放为 1、2、4 或 8，位移为 8、16 或 32 位。第 3.7.5.1 节补充了 64 位模式的形式 `RIP + Displacement`。一次结构体成员访问使用第一种形式、没有索引：基址寄存器保存对象的地址，位移是成员偏移。一次数组访问加上索引项，而缩放或一次单独的乘法承载元素大小。

以 `-O0` 下的 `bump` 为例。`llvm-objdump -d -r` 的清单读作：

```text
       4: 48 89 7d f8                  	movq	%rdi, -0x8(%rbp)
       e: 48 8b 45 f8                  	movq	-0x8(%rbp), %rax
      12: 03 48 04                     	addl	0x4(%rax), %ecx
      15: 89 48 04                     	movl	%ecx, 0x4(%rax)
```

用第 33 课的规则解码 `03 48 04`。`03` 是 `ADD r32, r/m32`。ModRM `48` 是 `01 001 000`：`mod = 01` 表示一个带 8 位位移的内存操作数，`reg = 001` 是 `%ecx`，`r/m = 000` 是 `%rax`。位移字节是 `04`。这条指令读取 `%rax + 4` 处的 4 字节，并把它们加进 `%ecx`。`llvm-objdump` 打印的 `l` 后缀是操作数大小，所以该字段宽 4 字节。`%rax` 来自 `-0x8(%rbp)` 处的帧槽，而那个槽接收了 `%rdi`，即 System V 调用约定下的第一个整数参数。三个事实随之而来：第一个参数是一个指针，它所指向的对象在偏移 4 处有一个 4 字节字段，而 `bump` 读写那个字段。

这些字节里没有任何东西说 `int`、`balance` 或 `struct account`。没有任何东西说这个对象有多大。该结构体其余的 28 个字节对 `bump` 是不可见的。

## System V 布局规则

x86-64 psABI 第 3.1.2 节给出聚合的三条规则。“结构体和联合体采用其对齐要求最严格的成员的对齐。每个成员被分配到满足相应对齐的最低可用偏移。任何对象的大小总是该对象对齐的倍数。”（"Structures and unions assume the alignment of their most strictly aligned component. Each member is assigned to the lowest available offset with the appropriate alignment. The size of any object is always a multiple of the object's alignment."）同一文档的图 3.1 给出标量的大小和对齐：`char` 为 1 和 1，`short` 为 2 和 2，`int` 为 4 和 4，`double` 为 8 和 8，任何指针为 8 和 8。

把规则应用到 `account.c` 中的结构体：

```c
struct account {
    char kind;
    int balance;
    short code;
    double rate;
    const char *label;
};
```

| 成员 | 大小 | 对齐 | 适合的最低偏移 | 之前的填充 |
|---|---|---|---|---|
| `kind` | 1 | 1 | 0 | 0 |
| `balance` | 4 | 4 | 4 | 3（字节 1 到 3） |
| `code` | 2 | 2 | 8 | 0 |
| `rate` | 8 | 8 | 16 | 6（字节 10 到 15） |
| `label` | 8 | 8 | 24 | 0 |

最后一个成员结束于 32。最严格的对齐是 8，而 32 是 8 的倍数，所以大小是 32，没有尾部填充。32 个字节中有 9 个是填充，而 psABI 说“任何填充的内容都是未定义的”（"The contents of any padding is undefined"）。

成员的顺序决定大小。同样这五个成员若排成 `double, pointer, int, short, char`，会填充偏移 0、8、16、20、22 并结束于 23，向上取整到 24。`code/main.py` 中的 `sysv_layout()` 应用这三条规则并产生两种结果。Python 的 `ctypes` 模块通过宿主编译器的约定应用同样的规则，而 `ctypes.sizeof`、`ctypes.alignment` 和每个字段的 `.offset` 对同一个结构体给出 32、8 和 `0, 4, 8, 16, 24`。当你在这台机器上构建并运行该程序时，程序本身打印第三份副本：

```text
sizeof 32 align 8
kind 0 balance 4 code 8 rate 16 label 24
sum 315 tag -3 projected 318.75 label_length 7
```

那个原生构建是 arm64。Arm 的 AAPCS64 在它的第 5.10.1 节中陈述了同样的聚合规则，而 Apple 的 arm64 文档保留这五个标量大小，所以这些数字在两个目标上一致。本课的 x86-64 目标文件是用 `-target x86_64-unknown-linux-gnu` 编译的，以便第 33 课的 ELF 读取器和下面的 DWARF 读取器能在它们上面工作。

## 手工读出结构体的其余部分

`bump` 只看到一个字段。`account.c` 中其余四个函数看到其余的部分，而每一个都展示一种不同的指令形式。下面所有地址都来自 `account-x86_64-O0-g.objdump.txt`。

`sum_balances` 对该结构体的一个数组做索引：

```text
      51: 48 8b 45 f8                  	movq	-0x8(%rbp), %rax
      55: 48 63 4d ec                  	movslq	-0x14(%rbp), %rcx
      59: 48 c1 e1 05                  	shlq	$0x5, %rcx
      5d: 48 01 c8                     	addq	%rcx, %rax
      60: 8b 40 04                     	movl	0x4(%rax), %eax
```

`%rax` 是 `list`，`%rcx` 是符号扩展到 64 位的 `i`，而 `shlq $0x5` 把它乘以 32。在 `addq` 之后，`%rax` 是 `list + 32 * i`，而这次加载读取元素 `i` 偏移 4 处的 4 字节。移位计数是这个目标文件中唯一以数字形式出现结构体大小的地方。包含这些指令的循环从 `0x49` 运行到 `0x72` 处的 `jmp 0x49`。

`tag` 读两个窄字段：

```text
      8c: 0f be 00                     	movsbl	(%rax), %eax
      98: 0f bf 48 08                  	movswl	0x8(%rax), %ecx
```

`movsbl` 加载偏移 0 处的一个字节并符号扩展它，所以偏移 0 处的字段是一个有符号的 1 字节整数。`movswl` 带符号扩展加载偏移 8 处的两个字节，所以偏移 8 处的字段是一个有符号的 2 字节整数。在 `-O1` 下第一次访问变成 `cmpb $0x6c, (%rdi)`，它仍然说偏移 0 处有 1 字节，而对符号什么也没说。

`projected` 读一个浮点数：

```text
      cc: f2 0f 2a 40 04               	cvtsi2sdl	0x4(%rax), %xmm0
      d5: f2 0f 59 40 10               	mulsd	0x10(%rax), %xmm0
```

`cvtsi2sdl` 把一个来自内存的有符号 32 位整数转换成 double，这确认偏移 4 处保存一个有符号的 4 字节整数。`mulsd` 乘以一个来自内存的 double，所以偏移 16 处保存一个 8 字节的浮点值。

`label_length` 读一个指针然后跟随它：

```text
      f3: 48 8b 40 18                  	movq	0x18(%rax), %rax
      f7: 48 63 4d f4                  	movslq	-0xc(%rbp), %rcx
      fb: 80 3c 08 00                  	cmpb	$0x0, (%rax,%rcx)
```

`movq` 读取偏移 24 处的 8 字节。单看这一点，那是一个 8 字节整数或一个指针。`cmpb` 把加载到的值用作一个内存操作数的基址。一个被用作地址的值是一个指针。`cmpb` 从它那里读取索引 `%rcx` 处的 1 字节，而在 `-O1` 下该指针在循环内部用 `leaq 0x1(%rcx), %rcx` 前进，所以被指向的元素相隔 1 字节。

把这五个函数放在一起，该结构体就是 `{ i8 在 0, i32 在 4, i16 在 8, f64 在 16, pointer 在 24 }`，步长为 32。字节 1 到 3 以及 10 到 15 处的空隙，正是 psABI 规则所预测的填充。指令没有说出的是：成员名字、指针是 `const char *`、偏移 0 处那个有符号字节的声明类型（源码把它拼作 `char`），以及这五个函数接收同一个类型。最后一点来自 `main`，它把一个帧对象传给全部五个函数。在 `-O0` 下调用点让这一点可见：`leaq -0x70(%rbp), %rdi` 后跟 `addq $0x20, %rdi`（在 `callq bump` 之前），以及 `addq $0x40, %rdi`（在 `callq tag` 之前）。偏移 0、`0x20` 和 `0x40` 是一个数组的三个元素，而填充它的那次 `0x60` 字节的 `memcpy` 是 96 字节，即 32 的三个元素。

## 这个 pass

`code/main.py` 中的 `trace_function()` 按地址顺序遍历一个函数的指令，并保持一个小的抽象状态。一个 holder 是一个 64 位寄存器或一个像 `-0x8(%rbp)` 这样的帧槽。每个 holder 有三种值之一。一个 `Pointer` 是一个根加上一个常量偏移加上一组步长，其中每个步长记录某个未知倍数的那么多字节被加了上去。一个 `Index` 是一个未知值的整数，它是某个缩放的倍数。其他任何东西都是 nothing。

状态以六个 System V 参数寄存器开始，分别保存 `Pointer("param0", 0)` 到 `Pointer("param5", 0)`。然后每条指令应用一条规则：

- 一条在 64 位寄存器和帧槽之间的 `movq` 复制这个值。一次对寄存器的 32 位或更窄的写入，把它变成一个缩放为 1 的 `Index`。
- 一条带指针基址的 `leaq` 产生一个加上了位移的指针，而带一个索引寄存器时，它把 `scale * index_scale` 加到步长上。一条基址是 `%rbp` 或 `%rsp` 的 `leaq` 命名一个帧对象，这正是 `main` 传递 `rows` 的方式。
- 对一个 `Index` 的 `shlq $n` 把它的缩放乘以 `2^n`，而 `imulq $k` 乘以 `k`。
- 一个指针和一个索引的 `addq` 保留指针并把索引缩放加到步长上。对一个指针的 `addq $k` 移动它的偏移，并且也被记录为那个寄存器的一次自增。
- 一次调用把每个调用者保存寄存器变为未知，而保存指针的那些参数寄存器被记录为一个调用点。
- 任何基址寄存器保存一个指针的内存操作数，都成为一个 `Access`，带指针的根和偏移、来自助记符的宽度和种类，以及一个存储标志。

宽度和种类仅来自助记符。`access_width()` 把 `b`、`w`、`l` 和 `q` 后缀映射到 1、2、4 和 8 字节，把 `movsbl` 和 `movswl` 映射到有符号窄加载，把 `movzbl` 映射到无符号加载，把 `sd` 和 `ss` 标量 SSE 指令映射到 8 字节和 4 字节浮点，把 `cvtsi2sdl` 映射到一个有符号 4 字节整数源，把 16 字节的 `movaps` 家族映射到一个向量。`leaq` 和各种 `nop` 形式不是访问。

```python
if memory.base in FRAME_REGISTERS:
    return Pointer(f"frame({memory.base}{format_signed(memory.displacement) if memory.displacement else ''})", 0)
base = env.get(memory.base)
if not isinstance(base, Pointer):
    return Unknown
strides = set(base.strides)
if memory.index is not None:
    index_value = env.get(memory.index)
    strides.add((index_value.scale if isinstance(index_value, Index) else 1) * memory.scale)
return Pointer(base.root, base.offset + memory.displacement, frozenset(strides), base.origin)
```

一次通过指针的 8 字节加载产生一个新指针，其根命名它所来自的字段，例如 `param0->0x18`。当那个值之后被用作一个基址，或用 `leaq` 前进时，它所来自的那个字段被标记为一个已证明的指针。这就是把偏移 24 从“8 字节”变成“指针”的那条规则。

### 四种步长证据

`infer_layout()` 合并每个见证函数的访问，并从四个来源收集步长，每个来源都带着产生它的那条指令。

| 种类 | 它来自哪里 | 展示它的构建 |
|---|---|---|
| `scale` | 一个缩放大于 1 的 `Index` 抵达了一个指针，来自 `shlq $0x5` 或 `imulq` | `-O0`，`0x59` 处的 `shlq $0x5, %rcx` |
| `loop-step` | 在同时包含该访问的一个循环内部，对基址或索引寄存器的一次 64 位自增 | `-O1`，`0x24` 处的 `addq $0x20, %rdx` |
| `offset-delta` | 一个循环内部通过一个基址寄存器的同宽度访问，其偏移相差一个常量 | `-O2`，八次相隔 32 的加载 |
| `call-site` | 一个帧对象被传给见证函数时所在的那些偏移 | `-O0`，`main` 传递 `rows`、`rows+0x20`、`rows+0x40` |

一个循环是一次向后的 `jmp` 或条件分支，而一次自增只有在循环范围同时包含该自增和该访问时才计数。那条规则排除了在 `-O0` 下推进 `i` 的 `addl $0x1, %eax`，因为它是一次 32 位加法，也因为访问不经过 `%eax`。最终步长是所找到每个值的最大公约数。当步长至少和最后一个字段的末尾一样大时，大小就是步长。

### -O2 下的向量化循环

在 `-O2` 下 clang 把 `sum_balances` 向量化。从 `0x50` 到 `0xaa` 的循环体每次读取八个元素：

```text
      3b: 48 8d 87 e4 00 00 00         	leaq	0xe4(%rdi), %rax
      50: 66 0f 6e 50 80               	movd	-0x80(%rax), %xmm2
      55: 66 0f 6e 98 60 ff ff ff      	movd	-0xa0(%rax), %xmm3
      61: 66 0f 6e 90 40 ff ff ff      	movd	-0xc0(%rax), %xmm2
      69: 66 0f 6e a0 20 ff ff ff      	movd	-0xe0(%rax), %xmm4
      7d: 66 0f 6e 10                  	movd	(%rax), %xmm2
      81: 66 0f 6e 58 e0               	movd	-0x20(%rax), %xmm3
      8a: 66 0f 6e 50 c0               	movd	-0x40(%rax), %xmm2
      8f: 66 0f 6e 60 a0               	movd	-0x60(%rax), %xmm4
      a0: 48 05 00 01 00 00            	addq	$0x100, %rax
      aa: 75 a4                        	jne	0x50 <sum_balances+0x40>
```

`%rax` 从 `list + 0xe4` 开始。那八个位移把加载放在相对 `list` 的偏移 `0x04, 0x24, 0x44, 0x64, 0x84, 0xa4, 0xc4, 0xe4` 处，即 `4, 36, 68, 100, 132, 164, 196, 228`。自增是 `0x100`，即 256。一个按看到的顺序记录偏移的 pass，会报告八个字段和一个至少 232 字节的结构体。清单是正确的，而结论是错的。

`fold_unrolled()` 应用一条规则。在一个循环内部，取通过一个基址寄存器的同宽度访问。它们的偏移相差 `d`，这里是 32。如果循环步长是 `k * d` 且恰好有 `k` 个不同的偏移，那么这个循环被展开了 `k` 次，而每次访问都是偏移 `(offset - lowest) mod d` 处的同一次元素访问。这里 `256 = 8 * 32`，带八个偏移，所以八次加载全部折叠到偏移 4，而步长证据记录 `offset-delta 32`、`unrolled 32` 和 `loop-step 256`。`0xe0` 处的标量余数循环从 `shlq $0x5, %rdx` 加入 `scale 32`，从 `addq $0x20, %rdx` 加入 `loop-step 32`。这五个值全部的最大公约数是 32。

figure 有一个把折叠关掉的按钮。关掉它后，`-O2` 构建显示字节 32 之后有七个字段、没有大小。那个状态就是一个相信位移而不理会循环的读取器所看到的东西。

## 从字节读 DWARF 5

`account.c` 的 `-g` 构建携带八个调试节。`.debug_info` 是 493 字节，`.debug_abbrev` 179，`.debug_str` 230，`.debug_str_offsets` 124，`.debug_addr` 112，`.debug_line` 312，`.debug_line_str` 12，`.debug_frame` 264。DWARF 5 标准的引言把 `.debug_str_offsets`、`.debug_addr` 和 `.debug_line_str` 列为版本 5 中新增的。`code/main.py` 中的读取器需要前五个。

### 单元头

标准第 7.5.1.1 节给出完整的编译单元头：`unit_length`、`version`、`unit_type`、`address_size` 和 `debug_abbrev_offset`。`.debug_info` 的头十二个字节是：

```text
e9 01 00 00   unit_length = 0x1e9 = 489
05 00         version = 5
01            unit_type = DW_UT_compile
08            address_size = 8
00 00 00 00   debug_abbrev_offset = 0
```

`unit_type` 字节在版本 5 中是新增的，标准在同一节中这样说。长度计数自身之后的字节，所以下一个单元会从 `4 + 489 = 493` 开始，即该节的末尾。`llvm-dwarfdump --debug-info` 在它的 `Compile Unit:` 行上打印同样这五个值，而第一个测试解析那一行并进行比较。

### 缩写

第 2.1 节说每个调试信息条目“由一个识别用的标签和一系列属性构成”（"consists of an identifying tag and a series of attributes"）。条目本身只存储一个缩写码。该码在 `.debug_abbrev` 中选出一个声明（第 7.5.3 节），该声明命名标签、说明是否有子条目跟随，并用各自的 form 列出每个属性。这个目标文件有 14 个声明。这里有两个要紧：

```text
[12] DW_TAG_structure_type  DW_CHILDREN_yes
     DW_AT_name              DW_FORM_strx1
     DW_AT_byte_size         DW_FORM_data1
     DW_AT_decl_file         DW_FORM_data1
     DW_AT_decl_line         DW_FORM_data1
[13] DW_TAG_member           DW_CHILDREN_no
     DW_AT_name              DW_FORM_strx1
     DW_AT_type              DW_FORM_ref4
     DW_AT_decl_file         DW_FORM_data1
     DW_AT_decl_line         DW_FORM_data1
     DW_AT_data_member_location  DW_FORM_data1
```

`parse_abbreviations()` 读取 ULEB128 码、ULEB128 标签、一个子条目字节，然后是属性与 form 对，直到一个 `0, 0` 对。第 7.5.6 节给出 form 编码：`data1` 是一字节，`ref4` 是相对单元的 4 字节偏移，`strx1` 是进入字符串偏移表的 1 字节索引，`sec_offset` 和 `data4` 是 4 字节，`addrx` 是进入地址表的 ULEB128 索引，`exprloc` 是一个 ULEB128 长度和那么多字节，而 `flag_present` 完全没有字节。

### 手工解码 balance 成员

`account` 的结构体条目从偏移 `0x195` 开始，字节为 `0c 15 20 00 03`。缩写码是 12，即结构体。`DW_AT_name` 是字符串索引 `0x15`，`DW_AT_byte_size` 是 `0x20` = 32，`DW_AT_decl_file` 是 0，`DW_AT_decl_line` 是 3，即源码中 `struct account {` 所在的行。

第二个成员条目从 `0x1a3` 开始，字节为 `0d 10 88 01 00 00 00 05 04`：

1. `0d` 是缩写 13，一个成员。
2. `10` 是作为 `strx1` 的 `DW_AT_name`：字符串索引 16。
3. `88 01 00 00` 是作为 `ref4` 的 `DW_AT_type`：相对单元起点的偏移 `0x188`，即那个名为 `int` 的 `DW_TAG_base_type` 条目。
4. `00` 是 `DW_AT_decl_file`，`05` 是 `DW_AT_decl_line`：`account.c` 的第 5 行。
5. `04` 是 `DW_AT_data_member_location`：偏移 4。

第 5.7.6 节说一个成员条目“可以有一个 DW_AT_data_member_location 属性，或一个 DW_AT_data_bit_offset 属性”（"may have either a DW_AT_data_member_location attribute or a DW_AT_data_bit_offset attribute"），而一个整数常量“是相对包含实体起点的字节偏移”（"is the offset in bytes from the beginning of the containing entity"）。那个字节和 `addl 0x4(%rax), %ecx` 中的位移是同一个数字，而 `compare_layouts()` 就是把两者并排放在一起的那个函数。

### 字符串和地址经过两张表

字符串索引 16 不是进入 `.debug_str` 的偏移。读取器从单元条目取 `DW_AT_str_offsets_base`，即 8，并读取 `.debug_str_offsets` 中 `8 + 4 * 16` 处的 4 字节条目。该条目保存 `"balance"` 在 `.debug_str` 中的偏移。同样的间接寻址适用于地址。`sum_balances` 的条目以字节 `07 07` 开头：缩写 7，一个 subprogram，然后是作为 `addrx` 索引 7 的 `DW_AT_low_pc`。`.debug_addr` 中 `8 + 8 * 7` 处的 8 字节条目是 `0x30`，即该函数在 `.text` 中的地址。那张表的前六个条目是六个字符串字面量的地址。

在一个可重定位目标文件中，两张表都不保存它们的最终值。`.debug_str_offsets` 的每个条目在文件里都是零，而 `.rela.debug_str_offsets` 保存 29 条针对 `.debug_str` 的 `R_X86_64_32` 重定位，真实偏移在加数中。`.debug_addr` 有 13 条针对 `.text` 和 `.rodata.str1.1` 的 `R_X86_64_64` 重定位。`.debug_info` 有它自己的四条重定位：缩写偏移、作为 `.debug_str_offsets+0x8` 的 `DW_AT_str_offsets_base`、`DW_AT_stmt_list`，以及作为 `.debug_addr+0x8` 的 `DW_AT_addr_base`。`ElfObject.relocated()` 在读取器解析一个节之前，对 32 位和 64 位类型应用 `S + A`。一个节符号在目标文件中值为 0，所以字段接收加数。`llvm-dwarfdump` 做同样的解析，这就是为什么它的输出在每个索引都解析好之后显示名字和地址。

### 类型、函数与位置

`DwarfInfo.type_name()` 跟随 `DW_AT_type` 引用。`label` 成员指向一个 `DW_TAG_pointer_type`，它指向一个 `DW_TAG_const_type`，它指向 `char` 基础类型，所以名字组合成 `const char *`。`type_size()` 为基础类型和结构体返回 `DW_AT_byte_size`，为指针返回 8，为数组返回计数乘元素大小。`type_kind()` 把一个基础类型的 `DW_AT_encoding` 归约为带符号的 `int`，或 `float`，并把一个指针类型归约为 `pointer`，这正是比较所用的词汇。

`DwarfInfo.functions()` 读取六个 `DW_TAG_subprogram` 条目。`bump` 从 `0x0` 运行到 `0x21`，即 `DW_AT_low_pc` 加上 `DW_AT_high_pc` 长度。它的帧基址是 `DW_OP_reg6 RBP`，而它的参数 `a` 有位置表达式 `91 78`：带 SLEB128 值 `0x78`（即 -8）的 `DW_OP_fbreg`。那就是清单在地址 `0x4` 处把 `%rdi` 存进去的帧槽 `-0x8(%rbp)`。调试信息和指令从两侧描述同一个槽。

## 比较两种布局

`compare_layouts()` 遍历 DWARF 成员，并在相同偏移处寻找一个推断出的字段。一个没有字段的成员是 `no-evidence`。一个大小不同的字段是 `size-mismatch`。一个从未被解引用过的指针成员是 `pointer-unproven`。一个不一致的种类，例如指令用了整数运算的地方却是一个浮点，是 `kind-mismatch`。起始于某个成员内部或填充内部的推断字段是 `unexpected`。大小把步长与 `DW_AT_byte_size` 进行比较。

三个构建的数字，来自 `python3 code/main.py`：

| 构建 | 通过第一个参数的访问 | 字段 | 步长证据 | 匹配的成员 | 大小 |
|---|---|---|---|---|---|
| `-O0` | 11 | 5 | `scale 32`、`call-site 32`、`call-site 64` | 5 中取 5 | 32，匹配 |
| `-O1` | 9 | 5 | `loop-step 32` | 5 中取 5 | 32，匹配 |
| `-O2` | 17 | 折叠后 5，折叠前 12 | `offset-delta 32`、`unrolled 32`、`loop-step 256`、`scale 32`、`loop-step 32` | 5 中取 5 | 32，匹配 |

每个构建中推断出的空隙都是字节 1 到 3 和 10 到 15，而那些正是 DWARF 布局的填充字节。每个推断字段都坐落在它自己大小的倍数处，这正是 psABI 规则所要求的，而 `natural_alignment_ok()` 记录了这一点。

一次加入一个函数，图景就会变化。只有 `bump` 时，布局是偏移 4 处一个字段，大小未知，下界是 8。`sum_balances` 加入步长。`tag` 加入偏移 0 和 8。`projected` 加入 16 处的浮点。`label_length` 加入 24 处的指针并证明它是指针。`main` 在 `-O0` 加入调用点，而在 `-O1` 和 `-O2` 什么也不加，因为编译器内联了每次调用。figure 为每个构建逐步走过这个顺序。

有三样东西够不着。名字不在指令中。限定符 `const` 不在指令中。`label` 的被指向类型，仅从字符串循环中的 `leaq 0x1(%rcx), %rcx` 得出“元素相隔 1 字节”，这与 `char`、与 `unsigned char` 和 `_Bool` 都一致。在 `-O1` 下偏移 0 处字节的符号未知，因为 `cmpb $0x6c, (%rdi)` 比较时不做扩展。该 pass 在那里报告 `int8`，在 `-O0` 报告 `i8`，那里 `movsbl` 做符号扩展。这些就是第 35 课记录为未知项的那些事实。

## C++ 对象

`shapes.cpp` 定义了 `Shape`，它带一个虚析构函数、一个纯虚 `area()` 和一个虚 `name()`，以及 `Rect`，它从 `Shape` 派生并添加两个 `int` 成员。Itanium C++ ABI 支配 clang 如何在 x86-64 Linux 上布局这些。

### 修饰名

该 ABI 的第 5.1.2 节说“一个名字通过给它的名字编码加前缀 `_Z` 来修饰”（"a name is mangled by prefixing `_Z` to an encoding of its name"）。这个目标文件有 19 个这样的符号。`_ZNK4Rect4areaEv` 读作：`_Z`，然后 `N` 表示一个嵌套名，`K` 表示一个 const 成员函数，`4Rect` 和 `4area` 是长度前缀的源码名，`E` 关闭嵌套名，`v` 表示一个空参数列表。`llvm-cxxfilt` 打印 `Rect::area() const`。`_Z8describeRK5Shapei` 是 `describe(Shape const&, int)`：`R` 是一个引用，`K` 是 const，`5Shape` 是类，`i` 是 `int`。第 5.1.4 节中的特殊名是：`_ZTV` 表示 vtable，`_ZTI` 表示 typeinfo，`_ZTS` 表示 typeinfo 名字字符串。构造函数和析构函数是 `C1`、`C2`、`D0`、`D1` 和 `D2`，所以 `_ZN4RectD0Ev` 和 `_ZN4RectD2Ev` 都打印为 `Rect::~Rect()`：删除析构函数和基对象析构函数共享一个源码名。

`code/main.py` 中的 `Demangler` 涵盖那个子集，外加第 5.1.5.2 节的内建类型码和第 5.1.10 节的 `S_` 替换。测试在全部 19 个名字上运行它，并与捕获的 `llvm-cxxfilt --no-strip-underscore` 输出进行比较。这个标志在 macOS 上要紧，那里该工具默认去掉一个前导下划线，然后就无法识别 `Z8describe...` 了。

### 从重定位看 vtable

该 ABI 的第 2.5.2 节按顺序列出一个虚函数表的各个组成：虚调用偏移、虚基偏移、offset to top、typeinfo 指针，然后是各个虚函数指针。地址点，即一个对象的 vptr 所保存的值，是第一个函数指针的地址（第 2.6.2 节）。`Rect` 没有虚基，所以它的表是 offset to top、typeinfo 和各函数。

符号 `_ZTV4Rect` 是 0x30 字节，即六个 8 字节的槽。在目标文件中每个字节都是零。内容在 `.rela.data.rel.ro._ZTV4Rect` 中：

```text
0000000000000008 R_X86_64_64              _ZTI4Rect
0000000000000010 R_X86_64_64              _ZN4RectD2Ev
0000000000000018 R_X86_64_64              _ZN4RectD0Ev
0000000000000020 R_X86_64_64              _ZNK4Rect4areaEv
0000000000000028 R_X86_64_64              _ZNK4Rect4nameEv
```

槽 0 保存 offset to top，它是 0 且无需重定位。槽 1 是 typeinfo。地址点在 `+16` 处。从那里起，槽 0 是完整对象析构函数，槽 1 是删除析构函数，槽 2 是 `area`，槽 3 是 `name`。`read_vtable()` 读取符号大小、它范围内的重定位，以及偏移 0 处的那个零。`Shape` 的表有相同的形状，槽 2 是 `__cxa_pure_virtual`，即一次纯虚调用所抵达的运行时函数。

### RTTI

第 2.9.4 节把 `std::type_info` 描述为一个 vptr 后跟一个指向修饰类型名的指针，并列出派生类。`_ZTI4Rect` 有三条重定位：`_ZTVN10__cxxabiv120__si_class_type_infoE+0x10`、`_ZTS4Rect` 和 `_ZTI5Shape`。第一条是 `__si_class_type_info` 的 vtable，即 ABI 为一个带单个偏移为零的公有非虚基的类型所用的那个类，而 `+0x10` 是该 vtable 的地址点。第二条指向字符串 `4Rect`，即修饰类型名，而对一个 `type_info` 调用 `name()` 返回的正是这个字符串。第三条是基类。`_ZTI5Shape` 使用 `__class_type_info` 且没有基指针。`read_typeinfo()` 返回这三个事实。

### 虚调用

`-O0` 下的 `describe` 发出一次虚调用：

```text
       f: 48 8b 7d f8                  	movq	-0x8(%rbp), %rdi
      13: 48 8b 07                     	movq	(%rdi), %rax
      16: ff 50 10                     	callq	*0x10(%rax)
```

第一条 `movq` 加载对象指针。第二条读取对象偏移 0 处的 8 字节，即 vptr，因为 ABI 把它放在一个带虚函数的类的最前面。`callq` 走到 vptr 之后 `0x10` 处，而 `0x10 / 8` 是槽 2。`find_virtual_calls()` 匹配这个模式并报告两个候选：来自 `_ZTV4Rect` 的 `Rect::area() const` 和来自 `_ZTV5Shape` 的 `__cxa_pure_virtual`。哪一个运行取决于对象，这正是为什么该调用是间接的。

DWARF 记录同一个槽。两个类中 `area` 的 `DW_TAG_subprogram` 条目都带 `DW_AT_vtable_elem_location (DW_OP_constu 0x2)`，`name` 带槽 3，而各析构函数带槽 0。`Rect` 是一个 16 字节的 `DW_TAG_structure_type`，带一个针对 `Shape`、偏移 0 的 `DW_TAG_inheritance` 条目，以及成员 `w` 在 8、`h` 在 12。`Shape` 是 8 字节，带一个人造成员 `_vptr$Shape`。两个独立的推导都为 `area` 给出槽 2：重定位表和调试条目。

在 `-O1` 下目标文件完全没有 vtable。`main` 把 `Rect` 构造为一个局部变量，所以编译器在编译时解析了 `r.name()` 和 `describe(r, 2)` 并内联了它们。没有东西取该表的地址，所以该表没有被发出。`describe` 仍然包含 `movq (%rdi), %rax` 和 `callq *0x10(%rax)`，因为它的参数可以是任何 `Shape`。一个缺失的 vtable 是关于一个目标文件的事实，而测试 `test_the_optimised_object_keeps_the_call_pattern_but_drops_the_vtables` 检查两半。

Microsoft ABI 在这些细节的每一处都不同。修饰名以 `?` 开头并编码调用约定，所以作为 C++ `__cdecl` 编译的 `void test(void)` 是 `?test@@ZAXXZ`。RTTI locator 以一个 `_RTTICompleteObjectLocator` 坐落在 `vfptr[-1]` 处，而符号是表示 vftable 的 `??_7` 和表示 locator 的 `??_R4`。Microsoft 自己的文档说“在编译器厂商之间没有 C++ 命名的标准”（"no standards for C++ naming between compiler vendors"）。本课的 fixture 只用 Itanium。

## 工具如何呈现恢复出的类型

下面每一行只要命名了一个输出，那个输出就是在这台机器上产生并捕获进 `code/fixtures/tools/` 的。针对这里没有安装的工具的行，描述它们的文档并说明这一点。

| 工具 | 版本、许可证 | 类型存在于哪里 | 在我们的 fixture 上 |
|---|---|---|---|
| Ghidra | 12.1.4，2026-09-21，Apache-2.0 | 带内建、用户定义和派生类型的 Data Type Manager；`.gdt` 归档；一个程序用到的类型被复制进它 | 带 DWARF 时：`/DWARF/account.c/account size=32 align=8` 和 `a->balance = by + a->balance;`。不带时：带 `long param_1` 的 `*(int *)(param_1 + 4)`、`tag(char *param_1)` 和 `*(char **)(param_1 + 0x18)` |
| IDA Pro | 9.4，2026-07-13，商业；IDA Free 为非商业，带一个仅 x86 的云反编译器 | Local Types 窗口、`.til` 类型库、把 DWARF 和 PDB 导入一个 `dwarf` 或 `pdb` 文件夹 | 未安装。仅文档 |
| Binary Ninja | 6.0，2026-09-03，商业，带一个免费版 | 类型编辑、头导入与导出、类型归档、来自 DWARF 和 PDB 的调试信息、类型库、平台类型 | 未安装。仅文档 |
| radare2 | 6.2.4，2026-10-05，LGPLv3 | `ts`、`tsc`、`afvd` | 在 `bin.dbginfo=true` 下，`ts` 和 `tsc account` 对那个可重定位目标文件什么也没打印；`pdf` 显示带 DWARF 源码行注释的 `mov dword [rax + 4], ecx` |
| rizin | 0.9.1，2026-06-29，LGPL 核心 | `ts`、`tsc`、`afvd` | `tsc account` 从 DWARF 打印 `struct account { char kind; int balance; short code; double rate; const char *label; };`；不带 `-g` 的构建只列出它捆绑的头类型 |
| lldb | lldb-1703.0.236.21 | `image lookup -t` | 来自 ELF 目标文件的 `byte-size = 32` 和完整的 `compiler_type` 文本 |
| gdb | 这里未安装 | `ptype /o` 打印“结构体中各字段的偏移和大小”，并标出空洞 | 仅文档 |
| pyelftools | 0.33，公有领域 | 在 `.debug_info` 之上的 Python API | 一个 43 行的脚本打印同样的五个成员和 `unit version 5` |
| llvm-dwarfdump | Apple LLVM 17.0.0 | `--debug-info`、`--debug-abbrev`、`--debug-str-offsets` | 每个读取器测试的判定基准（oracle） |

Ghidra 不带 DWARF 的输出展示了同样两条规则在起作用。它的反编译器给 `tag` 的参数赋了 `char *`，因为该函数通过它比较一个字节；给 `0x18` 处的字段赋了 `char **`，因为 `label_length` 解引用加载到的值并比较字节。这正是本课的 pass 所应用的那两条规则：宽度来自指令，指针来自解引用。Ghidra 的反编译器文档说 p-code varnode“不一定有一个与之关联的数据类型”（"do not necessarily have a data-type associated with them"），而反编译器“最终通过传播为其赋予一个正式的数据类型”（"ultimately assigns a formal data-type"）。选项 "Infer constant pointers" 把同样的传播扩展到常量。Ghidra 12.1 给反编译器添加了位域恢复，本课的 fixture 并不涉及这一点。

手工制作的那张表是故事的另一半。Ghidra 的 Data Type Manager、IDA 的 Local Types、Binary Ninja 的类型归档和 rizin 的 `td` 都让你从恢复出的布局为结构体定型，并看着反编译器重新渲染。该 pass 告诉你该定什么型，以及你在猜哪些字段。

带 Ghidra provider 的 rea 6.5.0 把反编译器文本作为一条记录返回。Ghidra 那一行的一切都适用于它，而那条记录携带类型名却没有产生它们的证据。在同一段清单上运行 `python3 code/main.py infer` 会给你那份证据。

## 类型推断研究

这里的 pass 是一个类型推断系统的约束生成那一半，限定在从一个参数抵达的一个结构体上。这个领域已经走得更远。

- TIE（Lee、Avgerinos、Brumley，NDSS 2011）把类型重建构造为在一个二进制 IR 上的约束生成与求解，度量了保守性和精度，并在 87 个 coreutils 程序上与一个商业反编译器进行比较。
- Retypd（Noonan、Loginov、Cok，PLDI 2016）加入了子类型、多态和递归类型，并报告以 98% 的召回率重建指针 `const` 标注。存在一个以 GrammaTech 名义发布的开源实现。
- OSPREY（Zhang 等人，IEEE S&P 2021）把每个内存位置当作一个随机变量，并推断最可能的类型。
- DIRTY（Chen 等人，USENIX Security 2022）和 ReSym（Xie 等人，CCS 2024）用学习到的模型对反编译器输出做后处理，而 ReSym 报告在完整结构体布局上达到 72.9% 的精确率。
- RecStruct（Chen 等人，USENIX Security 2026）在不借助反编译器的情况下恢复嵌套结构体，采用流不敏感的符号执行和对栈槽的并查集。

栈上结构体是本课的 pass 首先跳过的东西。在 `-O1` 下，`main` 把 `rows` 保留在栈上，而内联后的代码读取 `0x24(%rsp)`、`0x40(%rsp)`、`0x48(%rsp)`、`0x30(%rsp)` 和 `0x38(%rsp)`。那些偏移对 32 取模是 4、0、8、16 和 24：同一个结构体，但没有参数可以作为起点。实践实验要求你恢复它。

## 动手构建

运行演示：

```bash
cd phases/13-tools-and-protocols/41-recovering-data-and-types
python3 code/main.py
```

输出是一份带五个部分的 JSON 报告。`dwarf` 保存 `-O0` 目标文件的单元头、各结构体和各函数。`oracles` 保存 psABI 规则布局、`ctypes` 布局、DWARF 布局、原生运行结果和一个 `agree` 标志。`builds` 为三个目标文件各自保存访问、推断布局和比较结果。`cxx` 保存反修饰的名字、两个 vtable、两条 typeinfo 记录、那次虚调用和各 DWARF 槽。`tools` 列出捕获的工具输出。

预期形状：

```json
{
  "dwarf": {"unit": {"unitLength": 489, "version": 5, "unitType": "DW_UT_compile", "addressSize": 8, "abbrevOffset": 0}, "...": "..."},
  "oracles": {"agree": true, "psabiRules": {"size": 32, "align": 8, "...": "..."}, "...": "..."},
  "builds": {
    "O0": {"layout": {"stride": 32, "size": 32, "gaps": [1, 2, 3, 10, 11, 12, 13, 14, 15], "...": "..."}, "comparison": {"matches": 5, "members": 5, "...": "..."}},
    "O1": {"...": "..."},
    "O2": {"...": "..."}
  },
  "cxx": {"virtualCalls": [{"slot": 2, "candidates": {"Shape": "__cxa_pure_virtual", "Rect": "_ZNK4Rect4areaEv"}, "...": "..."}], "...": "..."}
}
```

按这个顺序读 `code/main.py`：

1. `ElfObject` 读取节、符号和重定位，而 `relocated()` 对一个调试节应用 `S + A`。
2. `parse_abbreviations()` 和 `DwarfInfo._parse_unit()` 读取头、缩写表和各条目，然后通过两张表解析 `strx` 和 `addrx`。
3. `DwarfInfo.struct_layouts()` 和 `functions()` 把条目变成 `StructLayout` 和 `FunctionInfo` 记录，并带 `type_name()`、`type_size()` 和 `type_kind()`。
4. `parse_listing()`、`parse_memory()` 和 `access_width()` 读取 `llvm-objdump` 文本。
5. `trace_function()` 是那个抽象状态机，而 `fold_unrolled()` 和 `infer_layout()` 把访问变成一个布局。
6. `compare_layouts()` 产生各状态行，而 `sysv_layout()` 和 `ctypes_layout()` 是另外两个判定基准。
7. `Demangler`、`read_vtable()`、`read_typeinfo()` 和 `find_virtual_calls()` 覆盖 C++ 对象。

还存在四个命令。`python3 code/main.py dwarf FILE.o` 打印任何 DWARF 5 可重定位目标文件的各结构体和各函数。`python3 code/main.py infer LISTING.txt [FILE.o]` 在一段清单上运行该 pass，并在给出目标文件时与它的 DWARF 进行比较。`python3 code/main.py demangle NAME...` 和 `python3 code/main.py vtable FILE.o` 覆盖 C++ 那一半。

## 使用

在你自己构建的一个新目标文件上：

1. 捕获该目标文件的 `llvm-objdump -d -r` 并把它放在目标文件旁边。该 pass 读取那段文本。
2. 在该清单上运行 `python3 code/main.py infer`。先读 witnesses 行：它命名那些第一个参数被用作内存基址的函数。如果某个函数缺失，说明它的参数从未抵达一个内存操作数，或它通过一条该 pass 不跟踪的路径抵达了一个。
3. 读每个字段及其访问计数。一次访问是一个见证。把只有单个见证的字段记为推断得到的。
4. 读步长证据。一个 `call-site` 或 `scale` 条目是强证据。一个单独的 `loop-step` 条目而没有其他种类是弱证据，因为一个被展开的循环报告的是若干元素的步长。如果 `unrolled` 出现，手工核对那次折叠。
5. 如果存在一个 `-g` 构建，运行比较并读每一行不是 `match` 的。一个 `no-evidence` 行命名一个没有函数触及的成员。一个 `unexpected` 行命名一个该 pass 无法安置的访问。
6. 把布局作为一个结构体定型进你工具的类型管理器，并记录哪些字段、名字和种类是猜测。

把那三个判定基准放在手边。当规则、`ctypes` 和 DWARF 对你写的某个布局不一致时，你就发现了一个紧凑（packed）结构体、一个位域，或一个规则不同的目标。

## 交互实验

### 实验 A：解码成员条目

从 `code` 目录打开 Python：

```bash
cd phases/13-tools-and-protocols/41-recovering-data-and-types/code
python3 -q
```

运行：

```python
from main import *
elf = load_object("account-x86_64-O0-g.o")
dwarf = DwarfInfo(elf)
dwarf.header()
elf.section(".debug_info").data[0x1a3:0x1ac].hex(" ")
dwarf.dies[0x1a3].attributes
dwarf.type_name(dwarf.type_of(dwarf.dies[0x1a3]))
```

在你查看字典之前，先用缩写 13 在纸上解码这九个字节。然后读取不带重定位的原始节 `elf.section(".debug_str_offsets").data[8:16].hex()`，以及重定位后的 `elf.relocated(".debug_str_offsets")[8:16].hex()`，并解释其中的差别。

### 实验 B：追踪一个函数

```python
listing = load_listing("account-x86_64-O0-g.objdump.txt")
trace = trace_function("label_length", listing["label_length"])
[(hex(a.address), a.root, a.offset, a.width, a.kind) for a in trace.accesses]
trace.pointer_uses
trace_function("sum_balances", listing["sum_balances"]).loops
```

在运行之前先写下，哪次访问证明偏移 24 是一个指针。然后在 `-O1` 清单上运行同样的几行，并在 `trace.increments` 中找到 `leaq 0x1(%rcx), %rcx`。

### 实验 C：折叠向量化循环

```python
o2 = load_listing("account-x86_64-O2-g.objdump.txt")
trace = trace_function("sum_balances", o2["sum_balances"])
sorted({a.offset for a in trace.accesses})
folded, evidence = fold_unrolled(trace, trace.accesses)
sorted({a.offset for a in folded}), [(e.kind, e.value, e.text) for e in evidence]
```

然后运行 `analyze_build("O2", fold=False)["comparison"]` 并数一数 `unexpected` 行。修改折叠规则，使它要求循环步长恰好是 `k * d` 且 `k` 至少为 2，并确认 `-O1` 的循环（只有一次访问、步长 32）不受影响。

### 实验 D：vtable 与名字

```python
shapes = load_object("shapes-x86_64-O0-g.o")
read_vtable(shapes, "_ZTV4Rect")
read_typeinfo(shapes, "_ZTI4Rect")
demangle("_ZNK4Rect4areaEv"), demangle("_Z8describeRK5Shapei")
find_virtual_calls(load_listing("shapes-x86_64-O0-g.objdump.txt"), [read_vtable(shapes, "_ZTV5Shape"), read_vtable(shapes, "_ZTV4Rect")])
```

从 `callq *0x10(%rax)` 在纸上算出槽，然后用 `DwarfInfo(shapes).struct("Rect").virtual_methods` 确认它。然后加载 `shapes-x86_64-O1-g.o` 并在它上面试 `read_vtable`。读那个 `ElfError` 并解释为什么该符号缺失。

## 实践实验

恢复 `-O1` 下 `main` 中的栈上结构体。

要求：

- 扩展 `trace_function()`，使一个帧槽区域可以成为一个根。从那些把 `.data.rel.ro` 的内容填入 `0x0(%rsp)` 到 `0x5f(%rsp)` 的 `movaps` 存储中为它播种，那是 `rows` 的 96 字节初始化。
- 把内联后的访问 `0x24(%rsp)`、`0x40(%rsp)`、`0x48(%rsp)`、`0x30(%rsp)` 和 `0x38(%rsp)` 归属到那个根，并报告它们对一个候选步长取模后的偏移。
- 从 `0x120` 到 `0x12c` 的循环推导出步长 32，那里 `%r14` 从 4 开始、按 `0x20` 前进直到 `0x64`，并表明循环界限 `0x64` 是三个元素加上字段偏移。
- 把结果与 DWARF 布局进行比较并达到五处匹配，并记录哪些种类保持未证明。
- 添加一个测试，当帧根被归属到一个参数时它失败。

成功意味着在 `-O1` 清单上运行 `python3 code/main.py infer` 把 `main` 列为一个带帧根的见证，而比较单凭 `main` 就显示五处匹配。

## 随课交付物

本课包含 `outputs/skill-recovering-data-and-types.md`。用它把一段清单和一个可选的调试构建，变成一个带每字段证据的结构体布局、一个带来源的步长、一次与 DWARF 的比较，以及一份关于保持未知的东西的清单。它要求访问表、步长证据、折叠核对、存在时的 DWARF 判定基准，以及一份关于没有任何指令能提供的名字和限定符的陈述。

## 验证它

运行演示和确定性测试套件：

```bash
cd phases/13-tools-and-protocols/41-recovering-data-and-types
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

验证应当证明：

- 单元头、14 个缩写和五个成员偏移与 `llvm-dwarfdump` 一致
- 名字通过重定位后的 `.debug_str_offsets` 表到达，而单元的 `str_offsets_base` 和 `addr_base` 都是 8
- 六个函数携带各个范围、`DW_OP_reg6 RBP` 和 `DW_OP_fbreg` 位置（正如 dump 所显示的），而它们的低地址等于清单的函数起点
- 一个没有 `.debug_info` 的目标文件会抛出异常，而 LEB128 解码器把 `0x78` 处理为 -8
- `pyelftools` 和 `lldb` 打印与读取器相同的布局
- psABI 规则、`ctypes`、DWARF 和原生运行给出偏移 `0, 4, 8, 16, 24` 和大小 32，而重排后的结构体是 24 字节
- 清单解析器读取 `bump` 中的 13 条指令，把 `R_X86_64_PLT32 bump-0x4` 附到 `0x194` 处的调用上，并找到 `0x72` 处的向后跳转
- 内存操作数、宽度、种类和符号从 AT&T 文本和助记符解码
- `-O0` 下的 `bump` 从帧槽读回它的指针，并在偏移 4 处做三次访问
- 步长在 `-O0` 来自 `shlq $0x5`，在 `-O1` 来自 `addq $0x20, %rdx`，在 `-O2` 来自由步长 256 折叠的八次加载
- `label_length` 通过解引用证明偏移 24 处的指针
- `main` 在 `-O0` 以偏移 0、`0x20` 和 `0x40` 传递一个帧对象，而在 `-O1` 除 `printf` 外什么也不调用
- 每个构建都匹配五中取五个成员，大小为 32，空隙等于 DWARF 填充
- 不折叠时，`-O2` 构建报告字节 32 之后七个字段、没有大小
- 反修饰器重现全部 19 个 `llvm-cxxfilt` 字符串
- 两个 vtable、两条 typeinfo 记录和 `0x16` 处的虚调用都解析到槽 2，而 DWARF 一致
- `-O1` 的 C++ 目标文件保留调用模式且没有 vtable
- Ghidra、rizin 和 radare2 的捕获在带 DWARF 时显示该结构体、不带时显示原始偏移
- 交互式 figure 嵌入分析所产生的相同数据

## 生产失败模式

| 失败 | 弱工具报告什么 | 分析必须证明什么 |
|---|---|---|
| 展开的循环 | 八个相隔 32 字节的字段和一个 232 字节的结构体 | 循环步长 256 等于 8 乘以偏移差 32，所以偏移 4 处一个字段 |
| 从一次自增读出步长 | 由 `addq $0x100` 得出 `sizeof` 256 | 每个步长来源的最大公约数，连同标量尾部的 `addq $0x20` |
| 把一个 8 字节字段叫作指针 | 偏移 24 处的 `void *` | 稍后一次访问把加载到的值用作一个基址，否则种类保持 `int64` |
| 把一个指针叫作整数 | 偏移 24 处的 `long` | `0xfb` 处的解引用，被记录为指针证明 |
| 窄比较 | 带符号的 `char` | `cmpb` 不携带符号；只有 `movsbl` 或 `movzbl` 才携带 |
| 假定五个函数共享一个类型 | 一个没有别名证据的结构体 | `main` 中传递一个帧对象的调用点，或一个明确的分析者断言 |
| 按索引从 `.debug_str` 读字符串 | 来自一个可重定位目标文件的乱码名字 | `str_offsets_base` 加上重定位后的 `.debug_str_offsets` 条目 |
| 把地址读作数字 | 每个函数的 `low_pc` 都是 0 | 通过重定位后的 `.debug_addr` 表的 `addrx` |
| DWARF 4 目标文件 | 一个误解析头的读取器 | 对第二个头字段做版本检查；4 没有 `unit_type` 字节 |
| 缺失的 vtable | “这个类没有虚函数” | `-O1` 目标文件内联了每次调用；`-O0` 目标文件有该表及其重定位 |
| 从错误的基址读 vtable 槽 | 差二的槽号 | 地址点在符号之后 16 字节，在 offset-to-top 和 typeinfo 之后 |
| 被去掉的修饰名 | `Z8describeRK5Shapei` 原样留下 | 在 macOS 上用 `--no-strip-underscore`，或一个检查 `_Z` 的反修饰器 |
| 从一个工具的猜测为结构体定型 | 把 `char *param_1` 当作字段类型 | 宽度和解引用，写成证据，而名字标记为猜测 |

## 操作规则

从一次访问恢复一个字段，从一个循环恢复一个步长，并把指令附到每一项上。在你信任一个超出步长的偏移之前，先折叠展开的循环。通过缩写及其重定位后的表读 DWARF，绝不按索引进入一个字符串节。逐字段进行比较，并把每个没有证据的成员、每个未证明的指针和每个名字都写成未知。在一个 C++ 对象中，从重定位读 vtable、从调用读槽，然后用 DWARF 确认你读到的那个槽。

## 延伸阅读

- [System V Application Binary Interface, AMD64 Architecture Processor Supplement, section 3.1.2: Data Representation](https://gitlab.com/x86-psABIs/x86-64-ABI)
- [Procedure Call Standard for the Arm 64-bit Architecture (AAPCS64), section 5.10: Composite Types](https://github.com/ARM-software/abi-aa/blob/main/aapcs64/aapcs64.rst)
- [Writing ARM64 code for Apple platforms](https://developer.apple.com/documentation/xcode/writing-arm64-code-for-apple-platforms)
- [Intel 64 and IA-32 Architectures Software Developer's Manual, Volume 1, section 3.7.5: Specifying an Offset](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)
- [DWARF Debugging Information Format Version 5, sections 2.1, 5.7.6, 7.5.1.1, 7.5.3, 7.5.6](https://dwarfstd.org/doc/DWARF5.pdf)
- [Itanium C++ ABI, sections 2.5 (Virtual Table Layout), 2.9 (Run-Time Type Information), 5.1 (External Names)](https://itanium-cxx-abi.github.io/cxx-abi/abi.html)
- [Microsoft Learn: Decorated names](https://learn.microsoft.com/en-us/cpp/build/reference/decorated-names?view=msvc-170) and [Name Decoration](https://learn.microsoft.com/en-us/cpp/error-messages/tool-errors/name-decoration?view=msvc-170)
- [llvm-dwarfdump command guide](https://llvm.org/docs/CommandGuide/llvm-dwarfdump.html) and [llvm-cxxfilt command guide](https://llvm.org/docs/CommandGuide/llvm-cxxfilt.html)
- [Python ctypes: Structure layout, sizeof, alignment](https://docs.python.org/3/library/ctypes.html)
- [Ghidra Data Type Manager](https://github.com/NationalSecurityAgency/ghidra/blob/master/Ghidra/Features/Base/src/main/help/help/topics/DataTypeManagerPlugin/data_type_manager_description.htm), [Decompiler Concepts](https://github.com/NationalSecurityAgency/ghidra/blob/master/Ghidra/Features/Decompiler/src/main/help/help/topics/DecompilePlugin/DecompilerConcepts.html), [Decompiler Options](https://github.com/NationalSecurityAgency/ghidra/blob/master/Ghidra/Features/Decompiler/src/main/help/help/topics/DecompilePlugin/DecompilerOptions.html), and [Ghidra 12.1.4 release](https://github.com/NationalSecurityAgency/ghidra/releases/tag/Ghidra_12.1.4_build)
- [IDA 9.1 user guide: Types](https://docs.hex-rays.com/9.1/user-guide/types), [IDA 9.4 release post](https://hex-rays.com/blog/ida-9.4-release-a-new-dyld-shared-cache-swift-analysis-new-teams-add-on-and-more-), and [IDA Free](https://hex-rays.com/ida-free)
- [Binary Ninja user guide: Types](https://docs.binary.ninja/guide/types/) and [Binary Ninja 6.0 Krypton](https://binary.ninja/2026/09/03/binary-ninja-6.0-krypton.html)
- [radare2 6.2.4 release](https://github.com/radareorg/radare2/releases/tag/6.2.4) and [rizin v0.9.1 release](https://github.com/rizinorg/rizin/releases/tag/v0.9.1)
- [GDB manual: Examining the Symbol Table, ptype /o](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Symbols.html)
- [pyelftools on PyPI](https://pypi.org/project/pyelftools/)
- [Lee, Avgerinos, Brumley, "TIE: Principled Reverse Engineering of Types in Binary Programs" (NDSS 2011)](https://www.ndss-symposium.org/ndss2011/tie-principled-reverse-engineering-of-types-in-binary-programs/)
- [Noonan, Loginov, Cok, "Polymorphic Type Inference for Machine Code" (PLDI 2016)](https://arxiv.org/abs/1603.05495) and [the retypd repository](https://github.com/GrammaTech/retypd)
- [Zhang et al., "OSPREY: Recovery of Variable and Data Structure via Probabilistic Analysis for Stripped Binary" (IEEE S&P 2021)](https://ieeexplore.ieee.org/document/9519451/)
- [Chen et al., "Augmenting Decompiler Output with Learned Variable Names and Types" (USENIX Security 2022)](https://www.usenix.org/conference/usenixsecurity22/presentation/chen-qibin)
- [Xie et al., "ReSym: Harnessing LLMs to Recover Variable and Data Structure Symbols from Stripped Binaries" (CCS 2024)](https://dl.acm.org/doi/10.1145/3658644.3670340)
- [Chen et al., "RecStruct" (USENIX Security 2026)](https://www.usenix.org/conference/usenixsecurity26/presentation/chen-yuxin)
