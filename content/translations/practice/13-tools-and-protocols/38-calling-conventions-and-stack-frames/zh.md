---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/38-calling-conventions-and-stack-frames/docs/en.md
  revision: f7aadc1d61a9fbbe2bdb107d1e2bf0a6caeea299
  sha256: 7de7231f86063ee8f2a9ecbd7bab20ae18a28863d5555437777a0de547983deb
status: reviewed
---

# 调用约定与栈帧：System V、Windows x64 与 AArch64

> 反汇编能显示一个函数读取了哪些寄存器，但只有 ABI 才说明这些寄存器的含义，而 ABI 由目标文件的头部选定。所以本课先读头部，再把每个寄存器对照到把它放在那里的那条规则。

**类型：** 构建
**语言：** Python、C、x86-64 和 AArch64 汇编
**前置要求：** Phase 13 · 第 32 课（从零构建 ELF）、Phase 13 · 第 33 课（反汇编与控制流）
**预计时间：** 约 140 分钟

## 学习目标

- 从目标文件头部选定调用约定：ELF x86-64 对应 System V psABI，COFF AMD64 对应 Microsoft x64，ELF AArch64 对应 AAPCS64，Mach-O arm64 对应 Apple 的变体。
- 为每个 ABI 逐字节解码某个函数的序言，并把每个被保存的寄存器、返回地址和帧指针放到它相对入口栈指针的偏移处。
- 从函数在写入前就读取的寄存器推断它的参数寄存器，从入口栈指针之上的加载推断栈参数槽。
- 区分 System V 的两条相互独立的寄存器序列、Microsoft x64 的按位置排列的槽，以及 AAPCS64 的 NGRN 与 NSRN 计数器。
- 把每条推断都对照源代码签名、规范中的规则，以及编译器自己写在 `.pdata`、`.xdata` 和 `.eh_frame` 中的栈回溯数据来验证。
- 比较 Ghidra、IDA、Binary Ninja、radare2、rizin 和 angr 如何命名并恢复同样的事实，并记录它们的输出与源代码不一致的地方。

## 问题

你把 `convention.c` 编译为 Linux x86-64 的 `-O2` 版本，并向 radare2 6.2.4 查询 `eight_args` 的参数。它回答了七个：`rdi`、`rsi`、`rdx`、`r8`、`r9`、`rsp+0x8` 和 `rsp+0x10`。C 源代码有八个参数。字节中 `%rcx` 只出现过一次，在 `leaq (%rdx,%rcx), %rax` 里，而该工具的变量恢复没有把一个只出现在地址内部的寄存器算进去。

然后你在 rizin 0.9.1 中打开同一个文件的 Windows 构建版。它把约定报告为 `amd64`，并找到了 `r8`、`rcx`、`rdx` 以及三个栈槽。该目标文件是 COFF，所以约定是 Microsoft x64，第四个寄存器参数是 `r9`，而且有四个栈槽。两个工具在同一份源代码上漏掉了不同的寄存器。

一份列表是一串指令。调用约定是一份存在于列表之外的契约：哪些寄存器携带参数、被调用者必须保留哪些、返回地址和栈参数位于何处，以及调用者必须在栈指针之上留下什么。四份文档定义了这里要用到的契约。System V AMD64 psABI（Version 1.0，构建日期 2025 年 3 月 12 日）的第 3.2.1 至 3.2.3 节。Microsoft x64 调用约定、栈使用以及序言和尾声的页面（页面日期从 2018-12-17 到 2025-03-19）。Arm AAPCS64 release 2025Q4（2026 年 1 月 23 日）的第 6.1 至 6.9 节。Apple 的 arm64 平台说明。本课研读这些规则，把它们应用到用三种方式编译的同一个 C 文件上，并构建一个分析器，把列表转化为一份经过校验的参数位置、被保存寄存器和帧偏移清单。

```figure
re-38-three-frames
```

## 一个头部选定规则手册

`convention.c` 有十二个函数：`leaf_add`、`eight_args`、`mixed`、`by_value`、`big_ret`、`sum_varargs`、`keeps`，以及五个调用同样形状的 `extern` 函数的调用者。这些结构体使用 `long long`，因为在 MSVC 目标上 `long` 是 4 字节，而在其他目标上是 8 字节，而一个改变大小的结构体会改变约定。Apple clang 17.0.0 从这台机器上编译了它七次：`-target x86_64-unknown-linux-gnu`、`x86_64-pc-windows-msvc` 和 `aarch64-unknown-linux-gnu` 的 `-O0` 与 `-O2`，以及 `arm64-apple-macos` 的 `-O2`。机器上没有安装 Linux 或 Windows 头文件，所以该文件声明了它需要的东西，并只包含 clang 自带的 `stdarg.h` 和 `stddef.h`。

`code/main.py` 中的 `describe_object()` 读取 4 字节的魔数和一个机器字段，并命名对应的契约：

| 头部 | 字段 | 值 | 规则手册 |
|---|---|---|---|
| `7f 45 4c 46` ELF | 偏移 0x12 处的 `e_machine` | 62 | System V AMD64 psABI |
| `64 86` COFF | 偏移 0 处的 `Machine` | 0x8664 | Microsoft x64 |
| `7f 45 4c 46` ELF | `e_machine` | 183 | AAPCS64 |
| `cf fa ed fe` Mach-O 64 | 偏移 4 处的 `cputype` | 0x0100000c | 带 Apple 差异的 AAPCS64 |

接下来这张表的几乎每一行，三份契约都各执一词。每个值都引自表头行中命名的文档，每个值都由一个针对测试夹具的测试加以校验。

| 规则 | System V psABI | Microsoft x64 | AAPCS64 |
|---|---|---|---|
| 整数参数 | `%rdi %rsi %rdx %rcx %r8 %r9`，取下一个空闲寄存器 | `RCX RDX R8 R9`，按位置 | `x0` 到 `x7`，按 NGRN |
| 浮点参数 | `%xmm0` 到 `%xmm7`，取下一个空闲寄存器 | `XMM0` 到 `XMM3`，按位置 | `v0` 到 `v7`，按 NSRN |
| 整数结果 | `%rax`，然后 `%rdx` | `RAX` | `x0`，然后 `x1` |
| 浮点结果 | `%xmm0`，然后 `%xmm1` | `XMM0` | `v0` |
| 结果过大无法放入寄存器 | 地址在 `%rdi` 中传入，"如同它是第一个参数"，在 `%rax` 中返回 | 指针放在 `RCX`，参数整体右移，在 `RAX` 中返回 | 地址放在 `x8`，`x0` 到 `x7` 不受影响 |
| 被调用者保存 | `%rbp %rbx %r12` 到 `%r15` | `RBX RBP RDI RSI RSP R12` 到 `R15`，`XMM6` 到 `XMM15` | `r19` 到 `r29`、`SP`、`v8` 到 `v15` 的低 64 位 |
| 入口处第一个栈参数 | `8(%rsp)` | `40(%rsp)`，位于 32 字节影子存储区之上 | `0(sp)` |
| 栈指针之下 | 128 字节红区 | "视为易变" | 无红区（Apple：128 字节） |
| 调用处的对齐 | 入口时 `(%rsp + 8)` 为 16 的倍数 | 在序言和尾声之外保持 16 字节对齐 | `SP mod 16 = 0` |
| 可变参数标记 | `%al` 保存所用向量寄存器数量的上界 | 浮点值在整数寄存器中复制一份 | 寄存器中无标记；Apple 使用 8 字节栈槽 |

## System V：两条相互独立的寄存器序列和一个红区

psABI 3.2.3 把每个参数的每个 eightbyte 分类为 INTEGER、SSE 或 MEMORY，然后从两个互不交互的列表中分配寄存器。"INTEGER" 取 "序列 %rdi、%rsi、%rdx、%rcx、%r8 和 %r9 中下一个可用的寄存器"。SSE 取 `%xmm0` 到 `%xmm7`。"如果某个参数的任一 eightbyte 没有可用寄存器，则整个参数都在栈上传递"，并且内存参数 "以逆序（从右到左）压入栈中"。

`eight_args(a, b, c, d, e, f, g, h)` 在 `-O2` 下是 27 字节：

```text
      10: 48 01 fe                     	addq	%rdi, %rsi
      13: 48 8d 04 0a                  	leaq	(%rdx,%rcx), %rax
      17: 48 01 f0                     	addq	%rsi, %rax
      1a: 4c 01 c0                     	addq	%r8, %rax
      1d: 4c 01 c8                     	addq	%r9, %rax
      20: 48 03 44 24 08               	addq	0x8(%rsp), %rax
      25: 48 03 44 24 10               	addq	0x10(%rsp), %rax
      2a: c3                           	retq
```

六个寄存器，然后在 `8(%rsp)` 和 `16(%rsp)` 处有两次加载。psABI 的图 3.3 把 "内存参数 eightbyte 0" 放在 `16(%rbp)` 处（当 `%rbp` 是帧基址时），在任何压栈之前，这在入口处就是 `8(%rsp)`。`g` 在 8 处，`h` 在 16 处。

`mixed(int i, double d, long long l, float f)` 展示了这两个列表。两个 int 取 `%edi` 和 `%rsi`，即第一和第二个 INTEGER 寄存器。double 和 float 取 `%xmm0` 和 `%xmm1`，即第一和第二个 SSE 寄存器。第一条指令是 `cvtsi2sd %edi, %xmm2`，而 `%xmm2` 是一个暂存寄存器，函数在读它之前先写了它。一个把 `cvtsi2sd` 的目的操作数当作读取的分析器，会凭空造出第三个浮点参数。radare2 正是这样做的，它把 `mixed` 报告为 `(double arg1, double arg2, double arg3)`，分别在 `xmm0`、`xmm1`、`xmm2` 中。

`by_value(struct pair p)` 把一个 16 字节结构体作为两个 INTEGER eightbyte 通过 `%rdi` 和 `%rsi` 传递，并以同样方式返回：`leaq 0x1(%rdi), %rax; leaq -0x1(%rsi), %rdx; retq`。`big_ret(long long seed)` 返回 32 字节，属于 MEMORY 类，psABI 说 "调用者为返回值提供空间，并把这块存储的地址作为第一个参数传入 %rdi，如同它是第一个参数"。`seed` 移到 `%rsi`，函数以 `movq %rdi, %rax` 开始，因为 "返回时 %rax 将包含调用者在 %rdi 中传入的那个地址"。

红区是 System V 的另一个特征。psABI 3.2.2："由 %rsp 所指位置之外的 128 字节区域被视为保留，信号或中断处理程序不得修改它。"在 `-O0` 下，`eight_args` 是 `pushq %rbp; movq %rsp, %rbp`，随后对 `-0x8(%rbp)` 到 `-0x30(%rbp)` 做六次存储，而没有 `subq`。这些存储位于栈指针之下 48 字节处。`sum_varargs` 的 `-O2` 构建以 `subq $0x58, %rsp` 分配 88 字节，然后把寄存器保存区写到 `-0x58(%rsp)` 直到 `-0x80(%rsp)`：栈指针之下 128 字节，即整个红区。用 `-mno-red-zone` 构建同一个文件，`leaf_add` 会多出一条 `pushq %rax` 和一条 `addq $0x8, %rsp`，以便把它的 8 字节局部变量放在栈指针之上。

可变参数调用会多用一个寄存器。"%al 用作隐藏参数，用于指定所使用的向量寄存器数量"，一个 0 到 8 之间的上界。`call_varargs` 在 `-O2` 下用 `xorl %eax, %eax` 设置它，在 `-O0` 下用 `movb $0x0, %al`。`sum_varargs` 先读它：`testb %al, %al; je`，当没有使用向量寄存器时跳过八次 `movaps %xmmN` 保存。

## Microsoft x64：位置、一个影子存储区，以及没有红区

Microsoft 的规则是按位置的。"整数参数在寄存器 RCX、RDX、R8 和 R9 中传递。浮点参数在 XMM0L、XMM1L、XMM2L 和 XMM3L 中传递。"以及 "前四个参数中的任何浮点和双精度参数，都根据位置在 XMM0 - XMM3 中传递。"同一个 `mixed` 到达时是 `%ecx`、`%xmm1`、`%r8`、`%xmm3`：槽 0 是 int，所以用 `RCX`；槽 1 是 double，所以用 `XMM1`；槽 3 是 float，所以用 `XMM3`。`XMM0` 和 `XMM2` 保持空闲。

调用者还必须留出空间。"调用者必须始终分配足够的空间来存储四个寄存器参数，即使被调用者并不接收那么多参数。"这些页面把它称为影子存储区或 home 地址，这四个槽 "实际上归被调用函数所有"。在入口处 `0(%rsp)` 是返回地址，`8(%rsp)` 到 `39(%rsp)` 是四个 home，而第一个栈参数位于 `40(%rsp)`。`eight_args` 在 `-O2` 下读取 `0x28(%rsp)`、`0x30(%rsp)`、`0x38(%rsp)`、`0x40(%rsp)`：即 40、48、56、64。

调用者一侧展示了这套算术。`call8` 在 `-O2` 下是 `subq $0x48, %rsp`，然后在 `movl $1, %ecx` 等指令之前，把 5、6、7、8 存到 `0x20(%rsp)` 到 `0x38(%rsp)`。72 字节是 32 字节影子存储区，加 32 字节的四个栈参数，再加 8 字节使返回地址落在 16 字节边界上。`call_varargs` 只有寄存器参数，仍然分配 `subq $0x28, %rsp`：32 字节影子存储区加 8 字节对齐。`keeps` 压入三个非易变寄存器（24 字节），然后 `subq $0x20, %rsp`，以便 `ext` 在返回地址之下找到它的 32 字节影子存储区。

结构体遵循它们自己的规则。"任何放不进 8 字节、或大小不是 1、2、4 或 8 字节的参数，都必须按引用传递。"以及 "16 字节参数按引用传递。"因此 `by_value` 在 `%rcx` 中的一个隐藏结果指针之后，于 `%rdx` 中收到指向一份副本的指针："调用者必须为返回值分配内存，并把指向它的指针作为第一个参数传入。其余参数随之整体右移一个位置。"`call_pair` 用 `movaps` 在 `0x20(%rsp)` 处构建副本，传入 `leaq 0x20(%rsp), %rdx`，用 `leaq 0x38(%rsp), %rcx` 传入结果缓冲区，并从 `0x40(%rsp)` 读回 `.b`。

这里没有红区。"RSP 当前地址之外的所有内存都被视为易变：操作系统或调试器可能在用户调试会话期间覆盖这块内存，中断处理程序也可能如此。"`-O0` 的 `leaf_add` 需要 8 字节局部变量，于入口处用 `pushq %rax`、在 `retq` 之前用 `popq %rcx` 得到它们，两条单字节指令代替了一条 `subq` 和一条 `addq`。栈使用页面定义了可以这样做的叶函数："叶函数是不需要函数表条目的函数。它不能修改任何非易变寄存器，包括 RSP"。

可变参数的被调用者会 home 它们的寄存器。"对于 vararg 或无原型函数，任何浮点值都必须在对应的通用寄存器中复制一份。"`sum_varargs` 在 `-O2` 下，在一条 `pushq %rax` 之后，把 `%rdx`、`%r8`、`%r9` 存到 `0x18(%rsp)`、`0x20(%rsp)`、`0x28(%rsp)`，即入口偏移 16、24、32：第二、第三、第四个寄存器参数的 home。它的 `va_list` 是 `leaq 0x18(%rsp), %rax`，即 `%rdx` 的 home，也就是第一个未命名参数。

## AAPCS64，以及 Apple 改了什么

AAPCS64 6.8.2 用两个计数器走过一系列规则。C.9：一个整数参数 "被复制到 x[NGRN] 的最低有效位"，然后 NGRN 自增。C.1 对浮点参数用 NSRN 做同样的事。C.12：一个至多 `8 - NGRN` 个双字的复合类型 "被复制到连续的通用寄存器中"。C.13 规定 "一旦某个参数进入栈，NGRN 便设为 8"，所以此后没有参数会回到寄存器。`eight_args` 使用 `x0` 到 `x7`，从不触及栈。`mixed` 是 `w0`、`d0`、`x1`、`s1`。`by_value` 进出都是 `x0` 和 `x1`。

6.9 说，本应在寄存器中传递的结果 "在同样的寄存器中返回"，否则 "该内存块的地址作为附加参数在 x8 中传给函数"。`big_ret` 写 `str x0, [x8]`、`stur q0, [x8, #0x8]`、`str x9, [x8, #0x18]`，从不写 `x0`。`call_big` 设置 `mov x8, sp`，而 `seed` 留在 `x0` 中，因为 6.9 补充道 "被调用者不需要保留 x8 中存储的值"，而且 `x8` 不是参数寄存器之一。

6.1.1："子例程调用必须保留寄存器 r19-r29 和 SP 的内容。"6.4.5.2：在公共接口处 "SP mod 16 = 0"。栈是满递减的，并且 "任何线程都不得访问（读或写）" 它之下的 "非活动区域"，所以 Linux 的 `-O0` `leaf_add` 发出 `sub sp, sp, #0x10` 来容纳 8 字节局部变量，而 System V 在同样情况下使用的是红区。

6.4.6 定义了帧记录："栈上的两个 64 位值组成的帧记录……最低地址的双字应指向上一个帧记录，最高地址的双字应包含进入当前函数时 LR 中传入的值。"以及 "帧记录在栈帧内的位置不作规定。"clang 在这一个文件里展示了两种位置。`keeps` 在 Linux 上 `-O2` 把记录放在底部，用 `stp x29, x30, [sp, #-0x30]!; mov x29, sp`。同一个函数在 `-O0` 下把记录放在顶部，用 `sub sp, sp, #0x20; stp x29, x30, [sp, #0x10]; add x29, sp, #0x10`。

Apple 的 arm64 说明保留了寄存器和对齐，但改变了帧、红区和可变参数调用。"帧指针寄存器（x29）必须始终指向一个有效的帧记录。某些函数，例如叶函数或尾调用，可以选择不在该链中创建条目。"Apple 构建的 `keeps` 先保存 `x22, x21, x20, x19`，并把记录放在顶部：`stp x29, x30, [sp, #0x20]; add x29, sp, #0x20`。"各平台保留寄存器 x18。不要使用这个寄存器。""ARM64 红区由栈指针正下方的 128 字节组成"，而 clang 仍然为 `-O0` 的叶函数发出了 `sub sp, sp, #0x10`，所以编译器默认并不使用它。可变参数 "被分配到相应数量的 8 字节栈槽"，并且 "类型 va_list 是 char* 的别名"。Apple 上的 `call_varargs` 把 10、20、30 存到 `[sp]`、`[sp, #8]`、`[sp, #0x10]`，并只传 `w0`；Linux 构建则传 `w1`、`w2`、`w3`，并用 `b extva` 做尾调用。Apple 的 `sum_varargs` 读取 `add x8, sp, #0x10`，即调用者的栈指针，作为它的 `va_list`；Linux 的 `sum_varargs` 把 `x1` 到 `x7` 和 `q0` 到 `q7` 保存到一个 224 字节的帧中，并用一条 `mov x8, #-0x38; movk x8, #0xff80, lsl #32` 把结构体字段 `__gr_offs` 初始化为 -56、`__vr_offs` 初始化为 -128。

符号也不同。Mach-O 给每个 C 符号都加上 `_` 前缀，所以列表显示 `_keeps`，而第一个函数出现在私有标签 `ltmp0` 之下。分析器通过符号表重命名这些标签。

## 逐条手工解码序言，做三遍

`keeps(int n)` 在循环中调用 `ext(i)`，并在调用前后保持 `n`、`i` 和 `acc`，所以每个 ABI 都必须保存寄存器。读取每个目标 `-O2` 构建的头几个字节。

System V，4 字节：

1. `55` 是 `push r64`，寄存器在低三位：`50 + 5`，即 `%rbp`。深度 8，`%rbp` 保存在入口偏移 -8 处。
2. `41 56`：`41` 是设置了 `B` 位的 REX，`56` 是 `50 + 6`。REX.B 把 6 扩展为 14：`pushq %r14`，在 -16 处。
3. `53` 是 `50 + 3`：`pushq %rbx`，在 -24 处。

三次压栈是 24 字节。返回地址再加 8，32 是 16 的倍数，所以循环内的 `callq ext` 无需 `subq` 即已对齐。这里没有 `movq %rsp, %rbp`，所以该构建没有帧指针。函数体把 `%rbp` 用作持有 `acc` 的被调用者保存寄存器（`xorl %ebp, %ebp`、`addl %eax, %ebp`）。尾声是镜像：`5b 41 5e 5d c3`。

Microsoft x64，7 字节：

1. `56` 是 `pushq %rsi`，在 -8 处。`57` 是 `pushq %rdi`，在 -16 处。`53` 是 `pushq %rbx`，在 -24 处。这三个在这里都是非易变的，而 `RDI` 和 `RSI` 在 System V 下曾是参数寄存器。
2. `48 83 ec 20`：REX.W，带 8 位立即数的操作码 `83 /5`，ModRM `ec` 是 `11 101 100`：`subq $0x20, %rsp`。深度 56。

56 加返回地址是 64，已对齐。这 32 字节是欠 `ext` 的影子存储区。尾声页面只允许 "一条 add RSP,constant 或 lea RSP,constant[FPReg]，后跟零个或多个 8 字节寄存器出栈，再加一条 return 或 jmp"，对应的字节是 `48 83 c4 20 5b 5f 5e c3`。

AArch64，四个字共 16 字节，小端序：

1. `a9bd7bfd` 是带前变址的 `stp`。第 31:30 位 `10` 选择 64 位寄存器，第 25:23 位 `011` 选择前变址，第 22 位为 0 表示存储。第 21:15 位的 imm7 是 `1111010`，即 -6，按 8 缩放：-48。第 14:10 位的 Rt2 是 30，第 9:5 位的 Rn 是 31（`sp`），第 4:0 位的 Rt 是 29。`stp x29, x30, [sp, #-0x30]!`：栈指针下降 48，`x29` 到 -48，`x30` 到 -40。
2. `f9000bf5` 是带按 8 缩放的 12 位无符号偏移的 `str`：第 21:10 位的 imm12 是 2，Rn 是 `sp`，Rt 是 21。`str x21, [sp, #0x10]`，入口偏移 -32。
3. `910003fd` 是 `add` 立即数：imm12 是 0，Rn 是 `sp`，Rd 是 29。`mov x29, sp`：帧指针指向 -48 处的记录。
4. `a9024ff4` 是带有符号偏移的 `stp`：imm7 是 4，缩放为 32。Rt2 是 19，Rt 是 20。`stp x20, x19, [sp, #0x20]`：`x20` 到 -16，`x19` 到 -8。

该帧是 48 字节：`x29` 在 0，`x30` 在 8，`x21` 在 16，24 处有 8 字节填充，`x20` 在 32，`x19` 在 40。记录的最低字指向上一个记录，下一个字持有 LR，正如 6.4.6 所要求的。`cmp w0, #0x1` 夹在第一次和第二次存储之间；调度器把它移进了序言，而分析器容忍栈操作之间出现一条比较或算术指令。

## 编译器把同样的事实写了两遍

一次序言解析是一条推导。编译器为栈回溯器发出第二条，两者必须一致。

在 Windows 上，第二条推导是 `.pdata` 和 `.xdata`。构建 `-O2` 目标文件时不加 `-fno-asynchronous-unwind-tables`，`llvm-objdump -h` 会显示 0x34 字节的 `.xdata` 和 0x48 字节的 `.pdata`。0x48 是 72，即六个 12 字节的 `RUNTIME_FUNCTION` 条目，每个带三个 `IMAGE_REL_AMD64_ADDR32NB` 重定位。这六个是 `sum_varargs`、`keeps`、`call8`、`call_varargs`、`call_pair` 和 `call_big`。其余六个函数是叶函数，而异常处理页面说 "如果搜索没有找到函数表条目，就假定该代码属于叶函数，RSP 直接寻址返回指针。"

`keeps` 的 `.xdata` 字节是 `01 07 04 00 07 32 03 30 02 70 01 60`。`UNWIND_INFO` 以 3 位的 Version 和 5 位的 Flags 开头：版本 1，无标志。SizeOfProlog 是 7，CountOfCodes 是 4，FrameRegister 和 FrameOffset 是 0。每个 `UNWIND_CODE` 是序言中的一个偏移加一字节的操作码和信息。`07 32`：在偏移 7 处，操作 2 是 `UWOP_ALLOC_SMALL`，信息 3 表示 `3 * 8 + 8 = 32` 字节。`03 30`：操作 0 是 `UWOP_PUSH_NONVOL`，寄存器 3 是 `rbx`。`02 70`：`rdi`。`01 60`：`rsi`。这些代码按执行的逆序存储，它们命名的三次压栈和 32 字节分配，与字节 `56 57 53 48 83 ec 20` 所述相同。`sum_varargs` 的条目是 `01 01 01 00 01 02 00 00`：1 字节序言，一个代码，8 字节的 `UWOP_ALLOC_SMALL`。这就是栈回溯器看待 `pushq %rax` 的方式：一次分配，因为 `%rax` 是易变的，没有保存任何东西。

在 Linux 上，第二条推导是 `.eh_frame`，由 psABI 4.2.4 定义、DWARF 5 第 6.4 节编码。对可重定位目标文件执行 `llvm-dwarfdump --eh-frame` 会为每个函数打印一个 FDE，并解析 `R_X86_64_PC32` 重定位，使地址范围可用。对于 `keeps`：

```text
  DW_CFA_def_cfa_offset: +16
  DW_CFA_def_cfa_offset: +24
  DW_CFA_def_cfa_offset: +32
  DW_CFA_offset: RBX -32
  DW_CFA_offset: R14 -24
  DW_CFA_offset: RBP -16
```

CFA 是调用前的栈指针，即入口栈指针之上 8 字节，所以 `RBP -16` 是入口偏移 -8，`R14 -24` 是 -16，`RBX -32` 是 -24，而最深的 CFA 偏移 32 是 24 字节的帧加返回地址。`keeps` 的 AArch64 FDE 写 `DW_CFA_def_cfa: W29 +48`，并有 `W29 -48`、`W30 -40`、`W21 -32`、`W20 -16`、`W19 -8`。那里 CFA 就是入口栈指针本身，所以偏移就是无需换算的帧偏移，而且 CFA 是在帧记录存活期间从 `x29` 定义的。`eh_frame_cross_check()` 对两个目标文件的全部 12 个 FDE 运行这个比较。有一个条目需要留意：`call8` 在 System V 下于函数体中途压入两个传出参数，所以它最深的 CFA 偏移是 32，而它的序言帧是 8，于是该检查比较的是函数体到达的最深栈指针 24，再加 8。

## 这些工具怎么称呼它

这个领域的每个工具都有一个表示调用约定的数据结构，以及一个把约定分配给函数的处理过程。名称各异，缺口也各异。闭源工具依据其文档描述；开源工具则在测试夹具上实际运行，其输出被捕获并放在目标文件旁边。

**Ghidra 12.1.4（Apache-2.0）。** 规则存放在编译器规范文件 `.cspec` 中，与 SLEIGH 语言并列。`x86-64-gcc.cspec` 声明了一个名为 `__stdcall` 的 `<default_proto>`，"源自 System V Application Binary Interface AMD64 Architecture Processor Supplement April 2016"，带有从 `XMM0_Qa` 到 `XMM7_Qa` 以及 `RDI, RSI, RDX, RCX, R8, R9` 的 `<pentry>` 列表、一个偏移为 8 的栈条目、一个针对至多 16 字节类型的 `join_dual_class` 规则、输出 `XMM0_Qa, XMM1_Qa, RAX, RDX`，以及用于其余情况的 `hidden_return`。`x86-64-win.cspec` 声明了 `__fastcall`，带四个 `<group>` 元素，把 `XMM0_Qa` 与 `RCX` 配对、`XMM1_Qa` 与 `RDX` 配对，依此类推，这就是按位置的规则；一个偏移为 40 的栈条目；针对 3、5、6 或 7 字节结构体的 `convert_to_ptr`，注释为 "only structs of size 8,16,32,64 bits can be packed to register"；列出 `RBX RBP RDI RSI RSP R12` 到 `R15` 以及 `XMM6` 到 `XMM15` 的 `unaffected`；以及一个栈 8 到 39 的 `localrange`，也就是影子存储区。`AARCH64.cspec` 声明了 `__cdecl`，其第一个条目是带 `storage="hiddenret"` 的 `x8`，然后是 `q0` 到 `q7` 和 `x0` 到 `x7`，针对 17 字节及以上结构体的 `convert_to_ptr`，以及包含 `x8` 的 `killedbycall`，注释为 "indirect result location register, which is not reflected in the pentry list"。反编译器的最后一个阶段名为 "Establish Function's Prototype"；分析器是 "Call Convention ID" 和 "Decompiler Parameter ID"；程序选项 "Prototype Evaluation" 选择默认模型。

**IDA Pro 和 IDA Free（Hex-Rays，商业；当前发布 9.4，构建 9.4.260714）。** 函数类型是一个通过 SetType 设置的 C 声明，并且 "IDA 会用类型信息在反汇编中注释函数参数信息。"任何标准约定都无法产生的位置，用 IDA 自己的约定书写：`int __usercall func@<ebx>(int x, int y@<esi>)` 把结果放在 `EBX`、把 `y` 放在 `ESI`，而 `@<^12.4>` 按偏移和大小命名一个栈位置。`__userpurge` 与之相同，但带被调用者的栈清理。同一页面列出了用于被破坏集合的 `__spoils`，以及本课手工恢复的隐式参数 `__hidden`、`__return_ptr` 和 `__struct_ptr`。反编译器的 "Decompile as call" 操作接受针对单条指令的 `__usercall` 原型。IDA Free 只支持 x86 和 x86-64。

**Binary Ninja 6.0 "Krypton"（Vector 35，商业，带一个可反编译 x86、x86_64、ARMv7 和 AArch64 的 Free 版本）。** 一个 `Platform` "包含与二进制执行环境相关的全部信息，主要是所用的调用约定、操作系统和架构"，该列表包括 `linux-x86_64`、`windows-x86_64`、`linux-aarch64` 和 `mac-aarch64`，每个都带一个 `default_calling_convention`。一个 `CallingConvention` 有 `int_arg_regs`、`float_arg_regs`、`callee_saved_regs`、`caller_saved_regs`、`int_return_reg`、`high_int_return_reg`、`float_return_reg`，以及两个直接编码了本课各差异的标志：`arg_regs_share_index`，"为 True 时，无论类型如何，第 N 个参数都消耗整数和浮点寄存器列表中的第 N 个槽"，以及 `stack_reserved_for_arg_regs`，"Windows x64 调用约定使用的 shadow/home 空间"。`eligible_for_heuristics`、`required_arg_regs` 和 `required_clobbered_regs` 驱动它的启发式约定检测。平台类型是 `types/platform/` 下的 C 头文件，每个平台名称一个。

**radare2 6.2.4（LGPL-3.0，在此实际运行）。** `afcl` 列出架构插件所知道的约定：x86-64 的 `amd64 amd64syscall dlang golang golang_abi0 ms p9 reg swift`，以及 AArch64 的 `arm64 dlang golang p9 reg swift`。`afc` 报告当前函数的约定，`afcr` 打印 `cc.amd64.arg0: rdi` 到 `arg5: r9` 以及 `ret0: rax`，这些配置文件是名为 `cc-ARCH-BITS.sdb` 的 SDB 文件。radare2 为 ELF 目标文件选了 `amd64`，为 COFF 目标文件选了 `ms`，这是正确的划分。`afv` 列出参数和变量，`afs` 打印签名。在 Linux `-O2` 目标文件上 `afv` 为 `eight_args` 找到七个参数并丢掉了 `rcx`；在 Windows 目标文件上它找到 `rcx, rdx, r8` 和四个栈槽并丢掉了 `r9`。两个缺失的寄存器都只出现在一条 `lea` 内部。对 `mixed`，它在 Linux 上报告 `double arg1 @ xmm0, arg2 @ xmm1, arg3 @ xmm2`，在 Windows 上则完全没有参数。在 AArch64 上它为 `eight_args` 找到 `x0` 到 `x7`，而对 `big_ret`，它在函数读取 `x8` 并把一个常量加载进 `q1` 的情况下，列出了 `x0` 和 `double arg2 @ d1`。每个 `afs` 签名都以 `void` 开头，因为返回类型没有被推断。在 `-O0` 下，每个参数都被存入帧中，`afv` 为 `eight_args` 找到了全部八个参数，栈上那一对用 `rbp+0x10` 和 `rbp+0x18`。

**rizin 0.9.1（LGPL-3.0，在此实际运行）和 Cutter 2.5.0。** `afcl` 列出 `amd64 amd64syscall ms reg swift`。`afc` 为 COFF 目标文件返回 `amd64`，所以 Microsoft 配置文件存在却没有从文件格式中被选出。`afi` 为 Linux 上的 `eight_args` 列出七个参数，同样没有 `rcx`，在 Windows 上则列出 `r8, rcx, rdx` 和三个栈槽，没有 `r9`，也没有 `0x40` 处的槽。`afv` 不存在；列表命令是 `afvl`。Cutter 是 rizin 之上的图形前端。

**angr 10.0.3（BSD-2，在此实际运行）。** `CFGFast` 之后跟 `CompleteCallingConventions(recover_variables=True)`，会按二进制格式把 `function.calling_convention` 设为 `SimCCSystemVAMD64`、`SimCCMicrosoftAMD64` 或 `SimCCAArch64`，并把 `function.prototype` 设为一个签名。它在全部三个目标上都恢复了 `eight_args` 的八个参数、x86-64 上 `big_ret` 的隐藏指针 `(BOT*, long long) -> BOT*`、Windows `by_value` 的按引用结构体 `(BOT*, BOT*) -> BOT*`，以及 System V 可变参数 `sum_varargs` 的 `(long long, ...)`。它的缺口与 radare2 不同：`mixed` 在 System V 和 AArch64 上回来时是 `(long long, long long, double, float)`，寄存器对但顺序错，因为整数列表打印在浮点列表之前；AArch64 的 `big_ret` 回来时是 `(long long) -> double`，所以 `x8` 约定被漏掉，向量存储被读成了结果；而 AArch64 的 `sum_varargs` 回来时有 16 个参数，即整个寄存器保存区。

**其他。** Hopper 6.6.0 是一个用于 macOS 和 Linux 的商业反汇编器和反编译器；本课没有运行或记录它的约定处理。lldb 1703 和 gdb 用 `frame info` 和 `register read` 显示活动帧，这是第 42 课对同样偏移的动态视角。Compiler Explorer 从源代码并排显示三种列表，这是在你到字节里去找某条规则之前，确认该规则最快的方式。

| 概念 | Ghidra | IDA | Binary Ninja | radare2 / rizin | angr | 本课 |
|---|---|---|---|---|---|---|
| 约定对象 | `.cspec` 中的 `prototype` | 函数类型中的调用约定关键字 | `Platform` 上的 `CallingConvention` | `afc` 名称、`cc-ARCH-BITS.sdb` | `SimCC` 子类 | `expected_locations(abi, name)` |
| 每个目标的默认值 | 每个 cspec 的 `<default_proto>` | 编译器设置 | `Platform.default_calling_convention` | `afc=`、`anal.cc` | 按格式 | `describe_object()` |
| 参数寄存器 | `<pentry>` 列表、按位置的 `<group>` | `__usercall` 中的 `@<reg>` | `int_arg_regs`、`float_arg_regs`、`arg_regs_share_index` | `cc.NAME.argN` | `ARG_REGS`、`FP_ARG_REGS` | `INT_ARG_REGS`、`FLOAT_ARG_REGS` |
| 影子存储区 | `localrange` 栈 8 到 39 | 隐式 | `stack_reserved_for_arg_regs` | `cc.ms.argn=stack` | `STACKARG_SP_DIFF` | `STACK_ARG_BASE[WIN64] = 40` |
| 隐藏结果指针 | `hidden_return`、`storage="hiddenret"` | `__return_ptr`、`__hidden` | 返回类型过大无法放入 `int_return_reg` | 未建模 | `BOT*` 首参数 | `HIDDEN_RETURN_REG` |
| 被调用者保存 | `<unaffected>` | `__spoils` 列出相反的集合 | `callee_saved_regs` | 配置文件 | `CALLEE_CLEANUP` 和架构 | `CALLEE_SAVED` |
| 把约定分配给函数 | "Call Convention ID" 分析器、"Establish Function's Prototype" | 用户或类型库 | 带 `required_arg_regs` 的启发式检测 | `afc`、`afva`、`aaft` | `CallingConventionAnalysis` | 写前先读加上规则手册 |

## 动手构建

运行演示：

```bash
cd phases/13-tools-and-protocols/38-calling-conventions-and-stack-frames
python3 code/main.py
```

输出是一份 JSON 报告。对于七个目标文件中的每一个，它命名格式、机器和 ABI；对于十二个函数中的每一个，它给出序言字节、带入口偏移的被保存寄存器、帧大小、帧指针、参数寄存器、栈参数偏移、溢出、返回寄存器或隐藏指针、调用深度，以及调用者的传出寄存器和存储。每个函数都以它的检查结尾：规则、来自签名的期望值、来自字节的观测值，以及两者是否一致。报告以两项栈回溯交叉校验和工具捕获结尾。在这 84 次函数分析中，运行了 489 项检查，全部 489 项一致。

期望形状：

```json
{
  "objects": {
    "convention-x86_64-windows-O2": {
      "format": "COFF", "machine": "AMD64", "abi": "Microsoft x64", "checks": "73/73 agree",
      "functions": {
        "keeps": {
          "prologue": ["56  pushq %rsi", "57  pushq %rdi", "53  pushq %rbx", "48 83 ec 20  subq $0x20, %rsp"],
          "frameBytes": 56,
          "savedRegisters": [{"register": "rsi", "entryOffset": -8}, {"register": "rdi", "entryOffset": -16}, {"register": "rbx", "entryOffset": -24}],
          "parameterRegisters": ["rcx"],
          "returnRegisters": ["rax"],
          "calls": [{"callee": "ext", "depth": 56}],
          "checks": [{"rule": "Microsoft x64: the caller must always allocate ...", "expected": "at least 32 bytes ...", "observed": [56], "agree": true}, "..."]
        }
      }
    }
  },
  "sehCrossCheck": ["..."],
  "ehFrameCrossCheck": {"...": "..."}
}
```

按此顺序阅读 `code/main.py`：

1. `describe_object()` 读取 ELF、COFF 或 Mach-O 头部和符号表，返回 ABI 和函数列表。
2. `parse_listing()` 把 `llvm-objdump -d -r` 文本拆分为函数，保留每条 call 和 jump 的重定位目标，并用对应语法的标记去除注释：AT&T 用 `#`，AArch64 用 `//` 和 `;`，其中 `#` 引入一个立即数。
3. `effect_x86()` 和 `effect_arm()` 把一条指令转化为读取、地址读取、写入、加载、存储和一个栈指针增量。AT&T 的最后一个操作数是目的操作数；AArch64 的第一个操作数是目的操作数，但存储、比较和分支除外。`lea` 读一个地址但不加载任何东西。`mov`、`cvtsi2sd`、`setcc` 以及零惯用法 `xor r, r` 的目的操作数只是写入。一条 call 写入整个易变集合。前变址存储在访问之前移动 `sp`，后变址加载在之后移动。
4. `analyze_function()` 把函数体走一遍，直到第一条 `ret` 或尾跳转。它跟踪栈指针相对入口值的下降深度，所以内存操作数 `disp(%rsp)` 位于入口偏移 `disp - depth`，而 `disp(%rbp)` 位于 `frame_pointer + disp`。它记录写前先读的参数类寄存器、位于 ABI 第一个栈参数偏移处或之上的加载、把参数寄存器存入帧的存储、栈指针之下的访问，以及每次调用处的深度。
5. `_return_registers()` 当某个结果寄存器在退出前的最后一次访问是写入时，保留它。作为数据操作数的读取会杀死该候选；作为地址基址的读取则不会，这正是在 Microsoft x64 下让 `rax` 在 `big_ret` 中存活的原因，那里 `movq %rcx, %rax` 之后跟着通过 `(%rax)` 的存储。
6. `expected_locations()` 把三份规则手册应用到一个 C 签名上：带 eightbyte 类的两个 System V 列表、带按引用结构体的 Microsoft 位置槽，以及带用于超过 16 字节结果的 `x8` 的 AAPCS64 计数器。
7. `run_checks()` 比较二者并加入帧规则：写入的被调用者保存寄存器必须被保存，每次调用处 `(rsp + 8) % 16 == 0` 或 `sp % 16 == 0`，每次 Microsoft 调用处有 32 字节影子，Microsoft 和 AAPCS64 下栈指针之下无访问而 System V 下至多 128 字节，以及一个把栈指针恢复到入口值、镜像序言的尾声。
8. `seh_cross_check()` 和 `eh_frame_cross_check()` 读取不加 `-fno-asynchronous-unwind-tables` 构建的目标文件的栈回溯数据，并与序言解析比较。

还有三条命令。`python3 code/main.py analyze convention-x86_64-windows-O2 keeps` 打印单个函数。`python3 code/main.py object FILE` 打印头部的判定。`python3 code/main.py seh` 打印每个带有栈回溯信息的函数的解码后的 `UNWIND_INFO`。

## 使用

在你构建的新目标文件上，按此顺序使用分析器。

1. 运行 `python3 code/main.py object FILE.o` 并记下它命名的 ABI。如果头部与你的构建命令不一致，就停下来；其中之一是错的。
2. 在目标文件旁捕获 `llvm-objdump -d -r FILE.o` 并运行分析。先于一切读取序言字节和被保存寄存器，并把帧大小与压栈和 `sub` 作比较。
3. 对照你的源代码签名读取参数寄存器和栈偏移。签名无法解释的寄存器要么是隐藏指针、可变参数标记，要么是被分析器误当作参数的暂存寄存器。最后一种情况是效果表里的 bug。用针对该指令的通用规则修复它。
4. 读取不一致的检查（如果有的话）。每条检查都命名它所依据的规则，所以首先要检查的是规则，然后是字节，然后是分析器。
5. 当目标文件有栈回溯数据时，运行交叉校验。两条彼此一致的推导是本课能产出的最强证据。
6. 当安装了另一个工具时，用确切的命令捕获它的输出并比较。一致之处你就有了三条推导。不一致之处你就有了一个具体的寄存器和一条具体的指令可供查看，而这正是第 35 课的一个发现。

## 交互实验

### 实验 A：一条指令，三种效果

在 `code` 目录中，打开 Python：

```bash
cd phases/13-tools-and-protocols/38-calling-conventions-and-stack-frames/code
python3 -q
```

运行：

```python
from main import *
effect(Instruction(0, "48 8d 04 0a", "leaq", "(%rdx,%rcx), %rax"), SYSV)
effect(Instruction(0, "f2 0f 2a d7", "cvtsi2sd", "%edi, %xmm2"), SYSV)
effect(Instruction(0, "a9bd7bfd", "stp", "x29, x30, [sp, #-0x30]!"), AAPCS64)
```

在每次调用前写下你预期的读取、地址读取、写入和栈增量。然后把 `[sp, #-0x30]!` 改成带 `ldp` 的 `[sp], #0x30`，观察增量从 `sp_delta` 移到 `post_sp_delta`。

### 实验 B：keeps 的帧

```python
info, listing = load_fixture("convention-aarch64-linux-O2")
keeps = analyze_function("keeps", listing["keeps"], info.abi)
keeps.saved
keeps.frame_pointer
[c.to_dict() for c in frame_cells(keeps)]
```

把偏移与上面的手工解码作比较。然后加载 `convention-arm64-macos-O2` 并运行同样三行；记录移到 -16，四个寄存器位于它之下。然后加载 `convention-x86_64-linux-O2-fp` 并读取 `keeps` 的 `saved`：帧指针回来了，还有一条 `pushq %rax`，它唯一的任务就是让调用处的 `(rsp + 8)` 成为 16 的倍数。

### 实验 C：mixed 上的写前先读

```python
info, listing = load_fixture("convention-x86_64-linux-O2")
mixed = analyze_function("mixed", listing["mixed"], info.abi)
mixed.param_registers
mixed.return_registers
expected_locations(SYSV, "mixed")["parameters"]
expected_locations(WIN64, "mixed")["parameters"]
```

System V 列表是 `rdi, xmm0, rsi, xmm1`，Microsoft 列表是 `rcx, xmm1, r8, xmm3`。现在加载 Windows 目标文件并再次运行前三行。然后打开 Linux 目标文件的 radare2 捕获，找到 `[afv mixed]`：三个 double。找出解释第三个的那条指令。

### 实验 D：栈回溯器的第二意见

```python
for row in seh_cross_check():
    print(row["function"], row["sizeOfProlog"], row["unwindPushes"], row["unwindAllocBytes"], row["agree"])
for row in eh_frame_cross_check("convention-x86_64-linux-O2-eh"):
    print(row["function"], row["cfiSaved"], row["cfiMaxOffset"], row["deepestStack"], row["agree"])
```

在 SEH 表中找到 `sum_varargs` 的 `pushq %rax`，并解释为什么栈回溯代码把它记录为一次分配。然后在 `.eh_frame` 表中找到 `call8`，并解释那个 32。

## 实践实验

添加第四个目标和第四份规则手册。

要求：

- 用 `-target x86_64-apple-macos -O2` 编译 `convention.c` 并捕获它的列表。扩展 `describe_object()` 以读取 Mach-O 的 `cputype` 0x01000007，并把它映射到 System V psABI（Apple 在 x86-64 上遵循它），带 `_` 符号前缀。
- 检查每个函数都与 System V 检查一致。记录你在序言中发现的那一处差异：Darwin 在每个优化级别都保留帧指针。
- 添加 Linux x86-64 目标文件的一个 `-fstack-protector-strong` 构建。扩展序言扫描，使从 `%fs:0x28` 的金丝雀加载和局部变量之下的存储被记录为一个 `canary` 单元，并把 `ret` 之前的比较记录为守护尾声的检查。
- 添加一个测试，当金丝雀存储被当作溢出参数计数时失败。
- 在运行分析器之前，手工画出 `with_canary` 式代码的帧，并把图留在测试旁边。

成功意味着 `python3 code/main.py` 报告新目标文件且每项检查都一致，而受保护函数的帧单元在局部变量和被保存寄存器之间显示出金丝雀。

## 随课交付物

本课包含 `outputs/skill-calling-conventions-and-stack-frames.md`。用它把一个你构建的目标文件、它的列表和 C 签名，转化为参数位置、帧布局、返回寄存器，以及把每条推断对照它所依据的规则和编译器栈回溯数据的检查。它要求先有头部的 ABI 判定，禁止把 `cvtsi2sd` 或 `xor r, r` 的目的操作数读为读取，并以第一处不一致结尾。

## 验证它

运行演示和确定性测试套件：

```bash
cd phases/13-tools-and-protocols/38-calling-conventions-and-stack-frames
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

验证应证明：

- 七个目标文件的 ELF、COFF 和 Mach-O 头部命名了 System V、Microsoft x64、AAPCS64 和 Apple arm64
- 每个目标文件的符号表都列出同样的十二个函数，且 Mach-O 的 `_` 前缀和 `ltmp0` 标签都已解析
- 列表解析器把 `ext` 保留为 call 目标，并保持 AArch64 立即数（如 `#-0x30`）完好
- `leaq (%rdx,%rcx), %rax` 读两个地址寄存器且不加载任何东西；`xorl %eax, %eax` 和 `cvtsi2sd` 只是写入；前变址的 `stp` 在存储之前移动 `sp`，后变址的 `ldp` 在加载之后移动
- `keeps` 在 `-O2` 下，System V 上是 `55 41 56 53`，带 24 字节帧、无帧指针；Microsoft x64 上是 `56 57 53 48 83 ec 20`，带 56 字节帧；AArch64 上以 `a9bd7bfd` 开头，记录在 -48 处
- Apple 构建把记录放在 -16 处，四个被保存寄存器之上
- 每个函数在 Linux 上 `-O0` 时有帧指针、`-O2` 时没有，而 `-fno-omit-frame-pointer` 用一次对齐压栈把它带回来
- `-O0` 的叶函数在 System V 下使用 8 字节红区，在 Microsoft x64 下用 `pushq %rax`，在 AAPCS64 下用 `sub sp, sp, #0x10`；`-mno-red-zone` 移除红区的使用
- 每个尾声都镜像它的序言，且栈指针回到入口值
- `eight_args` 在两个优化级别都读六个寄存器加槽 8 和 16、四个寄存器加槽 40 到 64，或 `x0` 到 `x7`
- `mixed` 在 System V 下是 `rdi, xmm0, rsi, xmm1`，在 Microsoft x64 下是 `rcx, xmm1, r8, xmm3`，两者的结果都在 `xmm0`
- 16 字节结构体在 System V 和 AAPCS64 下在两个寄存器中传递，在 Microsoft x64 下在一个隐藏指针之后按引用传递
- 32 字节结构体通过 `rdi`、`rcx` 或 `x8` 返回
- 可变参数被调用者读 `%al`，在 16、24、32 处 home `rdx, r8, r9`，保存 `x1` 到 `x7` 和 `q0` 到 `q7`，或在 Apple 上读调用者的栈指针
- 调用者设置期望的寄存器，在 0 和 8 处存储 7 和 8、或在 32 到 56 处存储 5 到 8，为可变参数调用把 `%al` 清零，并把结果缓冲区地址传入 `rdi`、`rcx` 或 `x8`
- 全部 489 项检查与它们的规则一致
- 六个 `UNWIND_INFO` 条目与序言解析匹配，而叶函数没有
- 24 个 FDE 与被保存寄存器偏移和最深栈指针匹配
- 工具捕获记录了 radare2 的 `amd64` 和 `ms`、rizin 在 COFF 目标文件上的 `amd64`、缺失的 `rcx`、三个 double，以及 angr 的原型
- 嵌入在站点模块中的图数据等于分析器的输出

## 生产失败模式

| 失败 | 弱工具报告什么 | 分析必须证明什么 |
|---|---|---|
| 把 COFF 目标文件读成 System V | 把函数从不读取的 `rdi` 和 `rsi` 当作参数 | 头部说是 0x8664；约定是 Microsoft x64 |
| 只在 `lea` 内部出现的寄存器读取 | 为八参数函数报告七个参数 | 基址和变址寄存器都是读取 |
| 把 `cvtsi2sd` 目的操作数计为读取 | `xmm2` 中的第三个 double 参数 | 对 `xmm2` 的第一次访问是写入；`mixed` 有两个 SSE 参数 |
| 把位置槽读成序列 | 在 Windows 上把 `xmm0` 命名为 double 参数 | 槽 1 是 `XMM1`，槽 3 是 `XMM3` |
| 把 `push rbp` 当作帧指针 | 在把 `rbp` 用作累加器的 `-O2` 函数中出现帧指针 | 只有压栈之后的 `mov %rsp, %rbp` 才创建帧指针 |
| 从入口栈指针测量红区 | "栈指针之下" 216 字节 | 88 字节 `sub` 之后、当前栈指针之下 128 字节 |
| 把影子存储区当作局部变量 | 8 到 32 处的栈参数 | Microsoft 栈参数从 40 开始 |
| 把 `lea` 当作加载 | 可变参数被调用者中 `0x60(%rsp)` 处的栈参数 | `lea` 计算 `overflow_arg_area`；它不加载任何东西 |
| 把隐藏指针读成普通参数 | `big_ret(void *, long long)` | 该指针被存储并复制到 `rax`、`rax`，或留在 `x8` 中 |
| 拿最深的 CFA 与序言帧比较 | 在压入传出参数的调用者上出现不匹配 | 与函数体到达的最深栈指针比较 |
| 从 ISA 断言约定 | 为 COFF 目标文件断言 `amd64` | 格式选规则手册，然后 ISA 选寄存器 |
| 信任单个工具的原型 | 三个 double，或十六个可变参数 | 源代码签名或第二条推导必须一致 |

## 操作规则

在第一条指令之前先读头部，并命名规则手册。把每个被保存寄存器和每个参数放到相对入口栈指针的偏移处，并对照把它放在那里的规则、以及编译器为同一个帧写下的栈回溯数据来检查它。把工具的原型当作一个主张，直到字节或源代码确认它为止。

## 延伸阅读

- [System V Application Binary Interface, AMD64 Architecture Processor Supplement, Version 1.0（第 3.2.1 至 3.2.3、4.2.4 节）](https://gitlab.com/x86-psABIs/x86-64-ABI)
- [Microsoft x64 calling convention](https://learn.microsoft.com/en-us/cpp/build/x64-calling-convention)
- [Microsoft x64 stack usage](https://learn.microsoft.com/en-us/cpp/build/stack-usage)
- [Microsoft x64 prolog and epilog](https://learn.microsoft.com/en-us/cpp/build/prolog-and-epilog)
- [Microsoft x64 exception handling: RUNTIME_FUNCTION, UNWIND_INFO, UNWIND_CODE](https://learn.microsoft.com/en-us/cpp/build/exception-handling-x64)
- [Arm Procedure Call Standard for the Arm 64-bit Architecture (AAPCS64), release 2025Q4](https://github.com/ARM-software/abi-aa/blob/main/aapcs64/aapcs64.rst)
- [Apple: Writing ARM64 code for Apple platforms](https://developer.apple.com/documentation/xcode/writing-arm64-code-for-apple-platforms)
- [DWARF Debugging Information Format Version 5, section 6.4 Call Frame Information](https://dwarfstd.org/doc/DWARF5.pdf)
- [Clang driver frame-pointer defaults, `useFramePointerForTargetByDefault` in `CommonArgs.cpp`](https://github.com/llvm/llvm-project/blob/main/clang/lib/Driver/ToolChains/CommonArgs.cpp)
- [Clang command line reference: `-fomit-frame-pointer`, `-momit-leaf-frame-pointer`](https://clang.llvm.org/docs/ClangCommandLineReference.html)
- [Fedora 38 change: frame pointers by default](https://fedoraproject.org/wiki/Changes/fno-omit-frame-pointer)
- [Ubuntu 24.04: performance engineering with frame pointers by default](https://ubuntu.com/blog/ubuntu-performance-engineering-with-frame-pointers-by-default)
- [Ghidra compiler specification: `x86-64-gcc.cspec`](https://github.com/NationalSecurityAgency/ghidra/blob/master/Ghidra/Processors/x86/data/languages/x86-64-gcc.cspec)
- [Ghidra compiler specification: `x86-64-win.cspec`](https://github.com/NationalSecurityAgency/ghidra/blob/master/Ghidra/Processors/x86/data/languages/x86-64-win.cspec)
- [Ghidra compiler specification: `AARCH64.cspec`](https://github.com/NationalSecurityAgency/ghidra/blob/master/Ghidra/Processors/AARCH64/data/languages/AARCH64.cspec)
- [Hex-Rays: SetType and the `__usercall` convention](https://docs.hex-rays.com/ida-actions/settype)
- [Hex-Rays: Decompile as call](https://docs.hex-rays.com/ida-actions/hx_userdefinedcall)
- [Binary Ninja API 6.0: `callingconvention` module](https://api.binary.ninja/binaryninja.callingconvention-module.html)
- [Binary Ninja API 6.0: `platform` module](https://api.binary.ninja/binaryninja.platform-module.html)
- [Binary Ninja user documentation: platform types](https://docs.binary.ninja/guide/types/platformtypes.html)
- [官方 Radare2 Book：调用约定](https://book.rada.re/analysis/calling_conventions.html)
- [官方 Radare2 Book：代码分析](https://book.rada.re/analysis/code_analysis.html)
- [angr 文档：反编译器分析处理过程，含调用约定恢复](https://docs.angr.io/en/latest/analyses/decompiler.html)
- [radare2 6.2.4 release](https://github.com/radareorg/radare2/releases/tag/6.2.4)
- [rizin 0.9.1 release](https://github.com/rizinorg/rizin/releases/tag/v0.9.1)
