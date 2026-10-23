---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/33-disassembly-and-control-flow/docs/en.md
  revision: f7aadc1d61a9fbbe2bdb107d1e2bf0a6caeea299
  sha256: b8b7a529b3047ed1e98dbe5fac83a0015a47ad12883fc55973bddcfc3c109c51
status: reviewed
---

# 反汇编与控制流：从字节到一张你能核对的图

> 一份反汇编清单是关于“哪些字节是指令”的断言，本课构建用来核验这个断言的解码器和图。

**类型：** 构建
**语言：** Python、C、x86-64 汇编
**前置要求：** Phase 13 · 第 32 课（从零实现 ELF）
**预计时间：** 约 150 分钟

## 学习目标

- 依据 Intel SDM 第 2 卷第 2 章的规则，解码 ledger 夹具中用到的那部分 x86-64 指令。
- 对每个夹具构建的每条指令，用 `llvm-objdump -d` 验证解码器。
- 在同一段字节上运行线性扫描和递归下降，并说明各自在哪里会出错。
- 把指令切分成基本块，并构建一张带类型边的控制流图。
- 用 Cooper、Harvey 和 Kennedy 的迭代算法计算直接支配节点，并从回边找出循环。
- 从指向其表格的重定位条目中恢复一个间接跳转的目标。

## 问题所在

你在 `-O0` 下编译了 `ledger.c`，并问一个智能体 `grade` 做了什么。该智能体调用了反汇编器，读了清单，回答说这个函数以 `jmpq *%rax` 结尾，没有已知目标。然后它写出了只有一句 `return 0` 的伪代码。

你在 `llvm-objdump -d` 中打开同一个目标文件，看到跳转之后有四个块，分别存入 4、3、2、1。这些块一直都在清单里。清单里没有任何内容说明执行如何到达它们，于是工具把它们当成了死代码。

一份清单只回答一个问题：哪些字节构成哪条指令。它不说明哪些指令会运行、以什么顺序运行、从哪里运行。要回答这些，你还需要三个结构：控制流能到达的字节、基本块，以及块之间的边。

rea 6.5.0 本身没有反汇编器。对于深度分析，它的 README 要求你自带 Ghidra、Hopper 或 IDA。对于离线检查，rea 也能调用你安装的 GNU objdump 或 Rizin。它的调用图止步于无法解析的目标：“调用者/被调用者只包含已解析的函数……无目标的计算流仍为未知。”（"Callers/callees contain only resolved functions.... Targetless computed flow remains unknown."）本课构建产生这些事实的那一部分，这样当工具报告它们时你能作出判断。

```figure
re-33-sweep-vs-descent
```

## 指令格式每个字段只有一条规则

Intel SDM 第 2 卷图 2-1 给出每条指令的字节顺序。先是可选前缀，然后是一到三个操作码字节，然后是一个可选的 ModRM 字节和一个可选的 SIB 字节。接着是 0、1、2 或 4 字节的位移，然后是 0、1、2 或 4 字节的立即数。整条指令最多 15 字节（SDM 2.3.11）。AMD APM 第 3 卷第 1 章第 1.1 到 1.7 节用更少的篇幅描述了相同的格式，是很好的交叉参照。

每个字段决定下一个字段的含义。因此解码器是一串小决策，而每个决策背后都有手册中的一句话。

### 前缀分四组

SDM 2.1.1 列出了传统前缀。第 1 组包含 `F0` lock 以及重复前缀 `F2` 和 `F3`。第 2 组包含六个段覆盖（`2E` 是 `%cs`）和分支提示。第 3 组是 `66`，操作数大小覆盖。第 4 组是 `67`，地址大小覆盖。

手册说每组可以使用一个前缀。编译器会多发。`ledger-x86_64-O0.o` 中偏移 `0xf2` 处的对齐填充读作 `66 66 66 66 66 2e 0f 1f 84 00 00 00 00 00`，连续五个 `66`。`llvm-objdump` 把它打印为 `nopw %cs:(%rax,%rax)`，你构建的解码器也一样。解码器收集它看到的每个前缀字节，稍后再问哪些起了作用。

`66` 还有第二项职责。对 SSE 指令它是一个强制前缀，用来选择操作码，所以 `66 0f ef c0` 是 `pxor %xmm0, %xmm0`，而不是任何 16 位的东西。`F3 0f 6f` 是 `movdqu`。解码器先查这对“强制前缀 + 第二操作码字节”。只有当这一对没有条目时，`66` 才表示 16 位操作数。

### REX 增加四个比特，且必须紧挨操作码

SDM 2.2.1 把 REX 定义为一个从 `40` 到 `4F`、形如 `0100WRXB` 的字节。`W` 选择 64 位操作数。`R` 扩展 ModRM 的 reg 字段。`X` 扩展 SIB 的 index 字段。`B` 扩展 ModRM 的 r/m 字段、SIB 的 base 字段，或操作码字节中的寄存器（表 2-4）。REX 必须紧挨在操作码或转义字节之前，而 REX 后面跟一个传统前缀会被忽略。

在 `48 89 e5` 中，字节 `48` 是设置了 `W` 的 REX。操作码 `89` 是 `MOV r/m, r`，ModRM `e5` 选择把 `%rsp` 送入 `%rbp`。去掉 REX，同样的字节就是 `movl %esp, %ebp`。

REX 也改变字节寄存器的名字。在存在任何 REX 时，编码 4 到 7 选择 `%spl`、`%bpl`、`%sil` 和 `%dil`，而不是 `%ah`、`%ch`、`%dh` 和 `%bh`。解码器正因如此保留了两张表。

### 操作码存在于两张映射表中

单字节操作码是常见情形。`0F` 转义到两字节映射表，而 `0F 38` 或 `0F 3A` 转义到三字节映射表，夹具从不用到它们（SDM 2.1.2）。有些操作码把 ModRM 的 reg 字段用作另外三个操作码比特，手册中写作 `/digit`。`83 /7` 是带 8 位立即数的 `cmp`，`83 /5` 是 `sub`，`FF /4` 是间接 `jmp`。

`code/main.py` 中的解码器覆盖四个夹具目标文件中的操作码外加少数邻近项。清单是：八种算术形式、`mov`、`lea`、`movslq`、`movzbl`、`imul`、各种移位、`test` 和 `idiv`。接着是 `push`、`pop`、`call`、`ret`、十六个条件跳转、多字节 `nop` 和五个 SSE2 操作码。任何其他操作码都会抛出带地址和原因的 `DecodeError`。会猜的解码器比会停的解码器更糟。

### ModRM 和 SIB 选择操作数

SDM 2.1.3 把 ModRM 拆成 `mod`（第 7:6 位）、`reg`（5:3）和 `r/m`（2:0）。`mod = 11` 表示 r/m 是寄存器。`mod = 00`、`01`、`10` 分别表示无位移、8 位位移或 32 位位移的内存。`r/m = 100` 表示后面跟一个 SIB 字节。SIB 拆成 `scale`（7:6）、`index`（5:3）和 `base`（2:0），而 index 为 `100` 表示没有索引寄存器。

表 2-2 中有两行特殊情形在 64 位模式下很重要。`mod = 00` 且 `r/m = 101` 不是 `(%rbp)`。它是相对于下一条指令的 32 位位移（SDM 2.2.1.6）。`mod = 00` 且 SIB 的 base 为 `101` 是一个没有基址寄存器的 32 位位移。

取 `grade` 在 `-O0` 下的 `8d 44 08 fa`。操作码 `8D` 是 `lea`。ModRM `44` 是 `01 000 100`：一个 8 位位移、reg `%eax`，且后面跟一个 SIB。SIB `08` 是 `00 001 000`：scale 1、index `%rcx`、base `%rax`。位移字节 `fa` 是 -6。AT&T 文本是 `leal -0x6(%rax,%rcx), %eax`，它计算 `score / 10 - 6`，即 switch 的索引。

### 位移就是链接编辑器写入的地方

`48 8d 0d 00 00 00 00` 是 `leaq (%rip), %rcx`。那四个零字节是一个 RIP 相对操作数的位移字段。在可重定位目标文件中它们是占位符。`.rela.text` 中偏移 `0x69` 处的条目说 `R_X86_64_PC32.rodata-0x4`。psABI（表 4.9）把 `R_X86_64_PC32` 定义为 `S + A - P`：符号地址加上加数减去该字段的地址。

处理器把该字段加到下一条指令的地址，所以最终目标是 `S + A + (end - P)`。对这条 `lea`，字段是最后四个字节，所以 `end - P` 是 4，目标是 `.rodata + (-4) + 4 = .rodata + 0x0`。-4 的加数预先补偿了那四个字节。夹具中每个 RIP 相对操作数都把这个 -4 带在它的加数里，所以 `-O1` 那条 `lea` 上的 `.rodata+0x10` 意味着 `.rodata+0x14`。

解码器记录每条指令内部位移字段的偏移。`resolve_reference()` 在重定位表中查这个偏移，并报告该操作数在链接后会指向哪里。正是这一个函数，把 `leaq (%rip), %rcx` 变成“位于 `.rodata+0x0` 的表格”。

### 立即数最多 32 位，有一个例外

SDM 2.2.1.5 说在 64 位模式下立即数最多保持 32 位，并作符号扩展。例外是 `MOV r64, imm64`（带 `REX.W` 的 `B8+r`），AT&T 语法称之为 `movabsq`。解码器把算术中的 8 位立即数读作有符号（`83 c1 fa` 是 `addl $-0x6, %ecx`），把移位计数和混洗选择子读作无符号（`pshufd $0xee`）。这个区分与 `llvm-objdump` 打印的一致。

近跳转、`push` 和 `pop` 默认 64 位操作数并忽略 `66`（SDM 2.2.1.7）。这正是解码器把它们命名为 `pushq`、`popq`、`callq` 和 `retq` 而不读取操作数大小前缀的原因。

## 手工解码一条指令

在你信任代码之前，先在纸上解码 `grade` 中的 `48 69 c0 67 66 66 66`。

1. `48` 在 `40` 到 `4F` 之间，所以它是 `W = 1` 的 REX。操作数大小为 64 位。
2. `69` 是 `IMUL r, r/m, imm32`。
3. `c0` 是 ModRM `11 000 000`：寄存器形式，reg `%rax`，r/m `%rax`。
4. 接下来四个字节是立即数，小端：`0x66666667`。
5. AT&T 顺序是立即数、源、目标：`imulq $0x66666667, %rax, %rax`。

那是七个字节，`llvm-objdump` 打印的是同样的文本。这个常量是那个倒数，它让 clang 用一次乘法加上随后的 `sarq $0x22`（移位 34）来除以 10。你会在第 34 课再见到这对，届时提升器（lifter）把它变回 `score / 10`。

解码器在 `Decoder.decode()`、`_State.modrm()` 和 `_State.finish()` 中做这五步。按这个顺序读它们，并把每个分支对应到其文档字符串中指明的 SDM 节。

## 线性扫描

Schwarz、Debray 和 Andrews 在《Disassembly of Executable Code Revisited》（WCRE 2002）第 3.1 节描述了线性扫描。从代码节的第一个字节开始，解码一条指令，在它之后的字节继续，直到末尾停止。`objdump` 这样工作，`llvm-objdump` 也一样。

```python
def linear_sweep(code: bytes, start: int = 0, end: int | None = None) -> SweepResult:
    position = start
    while position < end:
        try:
            instruction = decode(code[:end], position)
        except DecodeError:
            undecodable.append((position, code[position]))
            position += 1
            continue
        instructions.append(instruction)
        position = instruction.end
```

该方法只有一种失败模式，论文的图 1 展示了它。本是数据的字节被解码成指令，解码器随后会有一段时间错过真正的指令边界。在 x86 上，解码器通常在几个字节内重新同步，正是这一点让错误难以察觉。只有遇到无效操作码时才会被检测到，论文的结论是这些算法“无声失败”（"fail silently"）。

这次扫描也是本课的判定基准（oracle）。解码器必须在每个夹具的每条指令上与 `llvm-objdump -d` 一致，而 `llvm-objdump` 本身就是一次线性扫描。抓取的文本存放在 `code/fixtures/*.objdump.txt`。测试把每一行解析为地址、字节和文本，丢弃 `#` 后的注释，然后比较。四个目标文件分别含 86、56、84 和 11 条指令，共 237 条，解码器全部匹配。

## 递归下降

同一篇论文的第 3.2 节把第二种方法称为递归遍历。从一个已知入口点开始，解码到一次控制转移为止。对直接跳转，在目标处继续。对条件分支，在目标和下一条指令两处都继续；对 call，在它之后继续，因为被调用者会返回。对返回，停止。保留一个已访问地址的集合，使遍历能结束。

```python
if instruction.flow == "branch":
    worklist.append(instruction.target)
    address = instruction.end
elif instruction.flow == "indirect-jump":
    table = resolver(instruction, instructions) if resolver else None
    if table is None:
        unresolved.append(instruction)
        break
```

失败模式是相反的一种。间接跳转的字节里没有目标。遍历在那里停下，所有只能通过该跳转到达的块都保持未知。论文的图 2 展示了第二个隐患：一个从重定位得出的目标集合指向某条指令的中间。`main.py` 中的下降把这种情形记录为冲突并停止那条路径，于是重叠会被看见，而不是被无声地解码两次。

Andriesse 等人在 981 个编译器生成的二进制文件上测量了九个反汇编器（USENIX Security 2016）。内联数据和重叠代码在真实编译器输出中比文献假设的更罕见，而真正困难的基本操作是函数边界恢复。记住这两个发现。下一节的陷阱在编译器输出中很罕见。`grade` 中的间接跳转则很常见。

## 一个扫描错而下降对的夹具

`code/fixtures/sweep-trap.s` 是 24 字节手写汇编，函数体内有一张四字节的表。该函数用 `movzbl (%rcx,%rax), %eax` 索引这张表，并跳过它。

```asm
lookup:
        movslq  %edi, %rax
        leaq    .Ltable(%rip), %rcx
        movzbl  (%rcx,%rax), %eax
        jmp     .Ldone
.Ltable:
        .byte   0x31, 0xc0, 0x90, 0x48
.Ldone:
        addl    $1, %eax
        retq
```

用 `clang -target x86_64-unknown-linux-gnu -c sweep-trap.s` 构建它。那四个表字节是精心挑选的，使它们解码成看似合理的指令。`31 c0` 是 `xorl %eax, %eax`。`90` 是 `nop`。`48` 是一个 REX 前缀，于是扫描把它和真正的 `addl $1, %eax` 的三个字节连在一起，打印出 `addq $0x1, %rax`。抓取的 `llvm-objdump` 输出正是如此：

```text
       e: eb 04                        	jmp	0x14 <lookup+0x14>
      10: 31 c0                        	xorl	%eax, %eax
      12: 90                           	nop
      13: 48 83 c0 01                  	addq	$0x1, %rax
      17: c3                           	retq
```

这份清单看起来没有任何问题。每个字节都解码了，每个助记符都是真的，`retq` 也在。然而这份清单在三处仍然是错的。`0xe` 处的跳转目标是 `0x14`，而清单中没有指令从 `0x14` 开始。真正在 `0x14` 运行的指令是一个 32 位的 `addl`，而清单却在早一个字节处显示了一个 64 位的 `addq`。那四个表字节表现为代码。

从 `lookup` 符号出发的递归下降解码六条指令，顺着跳转到 `0x14`，并报告 `addl $0x1, %eax`。它不认领那四个表字节中的任何一个，也不认领 `plus_one` 之前的八个填充字节。`main.py` 中的 `trap_report()` 打印这个比较：

```json
"linearSweep": {
  "instructions": 9,
  "atJumpTarget": {"starts": "0x13", "text": "addq\t$0x1, %rax", "startsAtTarget": false},
  "claimedDataBytes": 4,
  "claimedPaddingBytes": 8
},
"recursiveDescent": {
  "instructions": 6,
  "atJumpTarget": "addl\t$0x1, %eax",
  "claimedDataBytes": 0,
  "claimedPaddingBytes": 0
}
```

测试 `test_sweep_and_objdump_share_the_same_mistake` 断言 `llvm-objdump` 在 `0x13` 处打印了 `addq $0x1, %rax`。判定基准是一次线性扫描，继承了它的盲点。与判定基准一致检查的是解码器，而下降检查的是哪些指令会运行。

## 基本块

Allen 在《Control Flow Analysis》（1970）中定义了基本块。它是一段指令序列，只从第一条指令进入，只从最后一条指令离开。Yakdan 等人在《No More Gotos》（NDSS 2015）第 II.A.2 节为反编译重述了它，以函数入口作为头节点。

构造过程是对按地址排序的已解码指令做两遍扫描。第一遍收集引导者（leader）。引导者是入口、某个分支或跳转的目标、某个表格目标，或任何控制转移之后的那条指令。第二遍在每个引导者处以及地址序列的每个间断处开启一个新块。

```python
for instruction in self.instructions:
    if instruction.address in leaders or current is None or current.end != instruction.address:
        current = Block(instruction.address, [])
        self.blocks[instruction.address] = current
    current.instructions.append(instruction)
```

边从每个块的最后一条指令得出。返回没有后继。跳转有一个，标记为 `jump`。条件分支有两个，标记为 `taken` 和 `fallthrough`。块末尾的一条普通指令会落入下一个块，这发生在下一条指令是分支目标时。间接跳转有其表格的目标，标记为 `table`，或者没有目标，此时该块被记录在 `unresolved` 中。

同一遍扫描还得出另外两个事实。入口无法到达的块是不可达的，而对 `grade` 在 `-O0` 下的扫描会产生五个这样的块。起始地址落在另一个方法清单的某条指令内部的块，就是陷阱中的那种重叠情形。

## total 的控制流图

`total` 在 `-O1` 下是 31 字节、13 条指令：

```text
      40: 85 f6                        	testl	%esi, %esi
      42: 7e 18                        	jle	0x5c <total+0x1c>
      44: 89 f1                        	movl	%esi, %ecx
      46: 31 d2                        	xorl	%edx, %edx
      48: 31 c0                        	xorl	%eax, %eax
      4a: 66 0f 1f 44 00 00            	nopw	(%rax,%rax)
      50: 03 04 97                     	addl	(%rdi,%rdx,4), %eax
      53: 48 ff c2                     	incq	%rdx
      56: 48 39 d1                     	cmpq	%rdx, %rcx
      59: 75 f5                        	jne	0x50 <total+0x10>
      5b: c3                           	retq
      5c: 31 c0                        	xorl	%eax, %eax
      5e: c3                           	retq
```

引导者是 `0x40`（入口）、`0x44`（`jle` 之后）、`0x50`（`jne` 的目标）、`0x5b`（`jne` 之后）和 `0x5c`（`jle` 的目标）。五个块，五条边：

| 从 | 到 | 种类 | 为什么 |
|---|---|---|---|
| `0x40` | `0x44` | fallthrough | `jle` 未取，计数为正 |
| `0x40` | `0x5c` | taken | 计数为零或负，返回 0 |
| `0x44` | `0x50` | fallthrough | `nopw` 是块内对齐，执行穿过它 |
| `0x50` | `0x50` | taken | `jne 0x50`，循环 |
| `0x50` | `0x5b` | fallthrough | 退出循环，返回总和 |

`0x4a` 处六字节的 `nopw` 是填充，使 `0x50` 处的循环头落在 16 字节边界上。它是可达的，所以属于块 `0x44`。最后一条 `retq` 之后 `0x5f` 处的一字节 `nop` 也是填充，没有东西到达它。对该函数的扫描为它造出第六个块，`unreachable()` 把它列出来。

在 `-O2` 下同一个函数是 140 字节、两个循环。`0x80` 处的 SSE2 主体用 `paddd` 每遍加八个值，标量余量在 `0xc0` 处运行。CFG 有两条回边，`0x80 -> 0x80` 和 `0xc0 -> 0xc0`，测试套件两者都检查。

## 用迭代算法求支配节点

当从入口到块 `b` 的每条路径都经过块 `d` 时，`d` 支配 `b`。`b` 的直接支配节点是离 `b` 最近的那个支配节点。这个概念经由 Allen（1970）上溯到 Prosser（1959），它正是第 34 课为正确放置 `if` 和 `while` 所需的结构。

Cooper、Harvey 和 Kennedy 写了《A Simple, Fast Dominance Algorithm》（2001）。他们论证，在约一千个节点以下的图上，以逆后序运行、采用紧凑表示的数据流形式胜过 Lengauer-Tarjan（1979）。他们的论文说其目的“不是提出一个新算法”（"not to present a new algorithm"）。它表明简单算法在实践中可以取胜，并且是很好的教学工具。一个函数的 CFG 几乎从不有一千个节点。

```python
def intersect(first: int, second: int) -> int:
    while first != second:
        while number[first] > number[second]:
            first = idom[first]
        while number[second] > number[first]:
            second = idom[second]
    return first

changed = True
while changed:
    changed = False
    for start in order[1:]:
        processed = [p for p in self.predecessors(start) if p in idom]
        candidate = processed[0]
        for other in processed[1:]:
            candidate = intersect(other, candidate)
        if idom.get(start) != candidate:
            idom[start] = candidate
            changed = True
```

`number` 保存每个块的逆后序位置，入口为 0。`intersect` 把两根手指沿当前支配树向上移动，直到相遇。论文用后序编号和 `<` 来写这个比较。这段代码用的是逆后序编号，所以比较是 `>`。其余一切都遵循论文的伪代码。

对 `total` 在 `-O1` 下，结果是 `idom(0x44) = 0x40`、`idom(0x50) = 0x44`、`idom(0x5b) = 0x50` 和 `idom(0x5c) = 0x40`。边 `0x50 -> 0x50` 是一条回边，因为它的目标支配它的源，而回边标记一个循环（Allen 1970）。`back_edges()` 返回它。测试 `test_dominators_on_a_hand_built_diamond_with_a_loop` 在一个带汇合点的 16 字节序列上运行同样的代码，于是 `intersect` 会遇到两个前驱。

## grade 在 -O0 下的跳转表

在 `-O0` 下，clang 把 `grade` 中的 `switch` 编译成位置无关的跳转表惯用法：

```text
      5d: 83 e8 04                     	subl	$0x4, %eax
      60: 77 38                        	ja	0x9a <grade+0x6a>
      62: 48 8b 45 f0                  	movq	-0x10(%rbp), %rax
      66: 48 8d 0d 00 00 00 00         	leaq	(%rip), %rcx
		0000000000000069:  R_X86_64_PC32	.rodata-0x4
      6d: 48 63 04 81                  	movslq	(%rcx,%rax,4), %rax
      71: 48 01 c8                     	addq	%rcx, %rax
      74: ff e0                        	jmpq	*%rax
```

把它读作四个事实。`subl $0x4` 后跟 `ja` 是一次边界检查：大于 4 的索引走到 `0x9a` 处的默认 case，所以表有五个条目。带重定位的 `leaq` 把表地址放进 `%rcx`，上一节已说明该地址是 `.rodata+0x0`。`movslq` 加载一个按 4 缩放的有符号 32 位条目。`addq` 加上表基址，所以每个条目是从表到其 case 块的距离。

在目标文件中，每个表字节都是零。目标只以 `.rela.rodata` 中的重定位存在：

```text
RELOCATION RECORDS FOR [.rodata]:
OFFSET           TYPE                     VALUE
0000000000000000 R_X86_64_PC32            .text+0x91
0000000000000004 R_X86_64_PC32            .text+0x8c
0000000000000008 R_X86_64_PC32            .text+0x87
000000000000000c R_X86_64_PC32            .text+0x82
0000000000000010 R_X86_64_PC32            .text+0x86
```

对偏移 `4k` 处的条目 `k` 应用 `S + A - P`。存储的值是 `.text + A - (.rodata + 4k)`，而代码加上 `.rodata + 0`，所以目标是 `.text + A - 4k`。条目 0 是 `0x91 - 0 = 0x91`，条目 1 是 `0x8c - 4 = 0x88`，条目 2 是 `0x87 - 8 = 0x7f`。条目 3 和 4 是 `0x82 - 12 = 0x76` 和 `0x86 - 16 = 0x76`。`score / 10` 的 case 6、7、8、9、10 分别走到存入 1、2、3、4、4 的那些块。这与 C 源码逐行吻合，包括 9 和 10 共享的那个 case。

`recover_table()` 做这个算术。`jump_table_resolver()` 从 `jmpq` 开始反向匹配这个惯用法。它找到造出该寄存器的 `addq`、加载它的 `movslq`、造出基址的 `leaq`，以及作边界检查的 `ja`。随后下降推入四个不同的目标并继续。链接后的可执行文件在表中有最终值且没有重定位。于是同一个函数读取有符号的 32 位条目并加上表地址，而 `evidence` 记录是哪条路径产生了这些目标。

`grade` 在 `-O0` 下的数字，来自 `python3 code/main.py cfg code/fixtures/ledger-x86_64-O0.o grade`：

| 方法 | 指令 | 块 | 边 | 字节 | 哪里错了 |
|---|---|---|---|---|---|
| 线性扫描 | 34 | 9 | 7 | 118 代码 + 10 填充 | 5 个不可达块，没有边进入那四个 case 块，填充被解码为 `nopw` |
| 递归下降 | 25 | 3 | 2 | 82 代码 | 36 个代码字节从未到达，`0x74` 处的 `jmpq *%rax` 未解析 |
| 带表的下降 | 33 | 8 | 11 | 118 代码 | 没有错 |

有了表，支配树就是完整的。每个 case 块的 `idom` 是 `0x62`，即带跳转的那个块。`0xa1` 的 `idom` 是入口 `0x30`，因为从 `0x9a` 出发的默认路径不经过 `0x62` 就能到达 `0xa1`。

## 优化器对 grade 在 -O1 下做了什么

你会看到有人把 `grade` 描述成一个编译为跳转表的 switch。字节说的是更具体的东西。在 `-O1` 和 `-O2` 下，`grade` 里根本没有间接跳转：

```text
      2c: 83 f9 04                     	cmpl	$0x4, %ecx
      2f: 77 0c                        	ja	0x3d <grade+0x2d>
      31: 89 c8                        	movl	%ecx, %eax
      33: 48 8d 0d 00 00 00 00         	leaq	(%rip), %rcx
		0000000000000036:  R_X86_64_PC32	.rodata+0x10
      3a: 8b 04 81                     	movl	(%rcx,%rax,4), %eax
      3d: c3                           	retq
```

重定位加数 `0x10` 加上惯常的 4，把表放在 `.rodata+0x14`。这个加载是一个普通的 `movl`，那里的字节是 `01 00 00 00 02 00 00 00 03 00 00 00 04 00 00 00 04 00 00 00`。编译器用一张五个返回值的表替换了那五个 case 块。有一条重定位、一张表和一次边界检查。控制流是三个块、三条边，带一个条件分支。`find_value_tables()` 把它报告为一个条目为 `[1, 2, 3, 4, 4]`、`evidence: "bytes"` 的 `value-table`。

`grade_label` 在 `-O2` 下更进一步。那个五个字符串指针的 `labels` 数组变成了 `.rodata+0x0` 处一张五个 32 位偏移的表。每个条目带一条针对字符串节的 `R_X86_64_PC32` 重定位，函数把表地址加到它加载的条目上。`recover_table()` 读取这五条重定位，返回进入 `.rodata.str1.1` 的偏移 `0, 2, 4, 6, 8`，那里保存 `F`、`D`、`C`、`B` 和 `A`。恢复跳转表的同一个算术也恢复了一张相对数据表，因为两者都是在已知偏移上的 `S + A - P`。

从这两个构建得到的教训是：按字节所示去命名。跳转表改变控制流图。值表改变一次加载。把两者都叫“那个 switch”会掩盖第 34 课必须重建的那个差别。

## rea 和 Ghidra 在这里给你什么

rea 6.5.0 配 Ghidra 12.1.4 提供方，通过 `procedure_assembly` 以一个字符串返回一个函数的清单文本。`inspect_native_instruction` 返回一条指令的字节、长度、解码器文本、操作数标记（token）、带类型的引用和流信息，其返回由 p-code 分类得出。`xrefs` 从 Ghidra 的 `ReferenceManager.getReferencesTo` 返回排序且去重的源地址。`analyze_function` 携带该函数的 CFG 和 `body`。`procedure_info` 以闭区间形式给出函数体，并警告“间断和共享尾部不得被当作所拥有的字节”（"Gaps and shared tails must not be treated as owned bytes"）。

这些事实中的每一个都是 Ghidra 的递归下降加上它的分析器、序列化后的结果。rea 的分析配置为 `instruction_flow_evidence`、`function_references` 和 `jump_table_evidence` 锁定契约版本。因此一个结果会命名产生它的规则。它做不到的是展示其推演过程。当 Ghidra 找不到那张表时，流是“未知”，那些 case 块就从调用者、被调用者和 CFG 中缺失了。

现在你有了那份推演。在同一个目标文件上运行 `python3 code/main.py cfg`，把块的起点、边的数量和恢复出的表与提供方返回的结果比较。一致的地方，你就有了两个独立的推导。不一致的地方，你就有了一个具体的地址可看，而这正是第 35 课记录为未知项的东西。

关于解码器作为一个程序的说明。Capstone 6.0.0-Alpha10（2026-07-21）修复了 CVE-2026-55893 和 CVE-2026-55894 下的越界读写，5.0.9（2026-05-28）回移了若干 CVE 修复。解码器读取它并未写入的字节。15 字节上限、`_Cursor.byte()` 中的截断检查，以及拒绝猜测未知操作码，共同保护 `main.py` 免受它并非为之构建的输入之害。

## 构建它

运行演示程序：

```bash
cd phases/13-tools-and-protocols/33-disassembly-and-control-flow
python3 code/main.py
```

输出是一份 JSON 报告。对每个夹具目标文件，它给出判定基准的一致性。对每个函数，它给出三种方法下的指令、块和边的数量。它还列出不可达块、未解析的间接跳转、回边、直接支配节点和任何表格。最后以陷阱比较结束。

预期形态：

```json
{
  "fixtures": {
    "ledger-x86_64-O0.o": {
      "oracle": "86/86 instructions agree with llvm-objdump",
      "functions": {
        "grade": {
          "range": "0x30-0xa6",
          "paddingBytes": 10,
          "linearSweep": {"instructions": 34, "blocks": 9, "edges": 7, "unreachableBlocks": ["0x76", "0x7f", "0x88", "0x91", "0xa6"], "...": "..."},
          "recursiveDescent": {"instructions": 25, "blocks": 3, "edges": 2, "unresolvedIndirectJumps": ["0x74"], "...": "..."},
          "recursiveDescentWithTables": {"instructions": 33, "blocks": 8, "edges": 11, "...": "..."},
          "tables": [{"kind": "jump-table", "table": ".rodata+0x0", "count": 5, "entries": ["0x91", "0x88", "0x7f", "0x76", "0x76"], "evidence": "relocation", "...": "..."}]
        }
      }
    }
  },
  "sweepTrap": {"...": "..."}
}
```

按以下顺序阅读 `code/main.py`：

1. `ElfObject` 读取节头、符号和 `.rela.*` 条目，`symbolize()` 按 `llvm-objdump` 的方式为一个地址命名。
2. `Decoder.decode()` 读取前缀和 REX，然后在单字节或两字节操作码映射表上分派。
3. `_State.modrm()` 读取 ModRM、SIB 和位移，并记录位移字段的偏移。
4. `resolve_reference()` 对位移或立即数字段上的重定位应用 `S + A - P`。
5. `linear_sweep()` 和 `recursive_descent()` 是这两种方法，各自都记录了自己的失败。
6. `recover_table()` 和 `jump_table_resolver()` 通过表的重定位或字节来读取一张表。
7. `ControlFlowGraph` 构建引导者、块和带类型的边，而 `dominators()` 就是那个迭代算法。
8. `analyze_function()` 在一个函数上运行每种方法，`compare_with_oracle()` 检查解码器。

还有两条命令。`python3 code/main.py disasm FILE.o` 打印一份清单，并在每条有重定位的指令之后附上重定位目标。`python3 code/main.py cfg FILE.o FUNCTION` 打印一个函数的分析。

## 使用它

在一个新目标文件上按这个顺序使用三种方法。

1. 先运行判定基准比较。在一条普通指令上与 `llvm-objdump` 不一致的解码器有 bug，而其后的每个结构都会继承它。
2. 从每个函数符号出发运行递归下降，并读取 `unresolved`。每一项都是一个你没有目标的间接跳转或调用。
3. 对每个未解析的跳转，寻找表格惯用法以及指向它的重定位。如果惯用法不匹配，就读跳转之前的字节，把你看到的写下来。那条笔记就是第 35 课中的第一个未知项。
4. 把扫描和下降逐字节比较。只有扫描认领的字节是填充或数据。两者都不认领的字节要么不可达，要么属于一个你还没找到的函数。
5. 从带恢复表的下降构建 CFG，并读取回边。每一条都是一个循环，第 34 课会把它变成 `while` 或 `for`。

把判定基准文本文件和目标文件保存在一起。当你换到新的编译器版本时，重新抓取它们，因为一份改变了的清单就是一个改变了的夹具。

## 交互实验

### 实验 A：先在纸上解码，再核对

在 `code` 目录下打开 Python：

```bash
cd phases/13-tools-and-protocols/33-disassembly-and-control-flow/code
python3 -q
```

运行：

```python
from main import *
decode(bytes.fromhex("48 8d 0d 00 00 00 00"), 0).text
decode(bytes.fromhex("8d 44 08 fa"), 0).text
decode(bytes.fromhex("66 66 66 66 66 2e 0f 1f 84 00 00 00 00 00"), 0).length
```

在每次调用之前写下你的预期。然后从第一条里去掉 `48`，看操作数大小变化。再试 `decode(bytes.fromhex("0f 0a"), 0)`，读那个 `DecodeError`。

### 实验 B：lea 上的重定位

```python
elf = load_fixture("ledger-x86_64-O0.o")
code = elf.section(".text").data
lea = decode(code, 0x66)
lea.displacement_offset
resolve_reference(elf, lea)
```

这个引用说 `.rodata+0x0`。把地址改成 `grade_label` 中的 `0x116`，读出进入 `.data` 的引用。然后解码 `0x10e` 处的 `callq` 并解析它。立即数字段带着 `R_X86_64_PLT32 grade-0x4`，解析出的目标是 `0x30`，即 `grade`。

### 实验 C：看两种方法分歧

```python
trap = load_fixture("sweep-trap.o")
text = trap.section(".text").data
[i.text for i in linear_sweep(text, 0, 0x20).instructions]
[i.text for i in recursive_descent(text, [0], 0x20).sorted_instructions()]
```

数一数每个列表中的指令，找出从 `0x13` 开始的那一条。然后把 `sweep-trap.s` 中最后一个表字节从 `0x48` 改成 `0xe8`，重建，再次运行两者。扫描现在把 `addl` 和 `retq` 吞进了一个目标在节外的 `callq`。这个函数看起来没有返回了。

### 实验 D：手工求支配节点

```python
analysis = analyze_function(load_fixture("ledger-x86_64-O1.o"), "total")
analysis.cfg.edges
analysis.cfg.reverse_postorder()
analysis.cfg.dominators()
analysis.cfg.back_edges()
```

在纸上画出这五个块，在你看结果之前先算出支配节点。然后在 `grade` 的 `-O0` 上运行同样的四行，并解释为什么 `idom(0xa1)` 是 `0x30` 而不是 `0x62`。

## 实践实验

给夹具添加一个间接调用点，并扩展分析。

要求：

- 写一个 C 函数，它通过从一个小数组中选出的函数指针进行调用。在 `-O0` 和 `-O1` 下构建，并把目标文件连同它们的 `llvm-objdump` 文本一起提交。
- 让解码器在两个目标文件上都与判定基准一致。只有当夹具中的某条指令需要时才添加操作码。
- 扩展 `recursive_descent()`，使一次间接调用把调用点以 `None` 作为目标记录到 `calls` 中并在其后继续。
- 写一个解析器，通过函数指针数组的重定位读取它，并报告可能的被调用者。
- 把被调用者集合作为 `indirectCalls` 加入函数报告，并为每个目标注明证据种类。
- 写一个测试，当解析器返回一个不是函数符号的目标时它失败。

成功意味着 `python3 code/main.py cfg` 用证明它的重定位命名每个可能的被调用者，且判定基准比较在每个目标文件上仍然通过。

## 评分实验

关于本课夹具的五个问题。用你构建的代码找出每个答案，然后把它写进 `code/lab_answers.json`。数字写成数字或写成如 `"0x40"` 的十六进制字符串，列表写成 JSON 列表。

1. `t1`：递归下降在 -O1 下的 grade 中解码出的指令数。
2. `t2`：-O1 下 total 中的基本块数。
3. `t3`：-O1 下 total 中循环头的地址，写成十六进制。
4. `t4`：在 sweep-trap.o 中，覆盖 0x14 的那条线性扫描指令的起始地址，写成十六进制。
5. `t5`：-O0 下 grade 的跳转表中的条目数。

检查你的答案：

```bash
cd phases/13-tools-and-protocols/33-disassembly-and-control-flow
python3 code/lab.py
```

检查器从 `code/main.py` 在已提交的夹具上计算出每个预期值。它为每个任务打印 `PASS`、`FAIL` 或 `TODO` 以及一个分数，只有五项全部通过时才以 0 退出。`python3 code/lab.py my-answers.json` 检查另一个文件。`code/tests/test_lab.py` 证明检查器接受正确答案并拒绝一个错误答案。

### 运行效果

[Inside a Decompiler](https://aiengineeringfromscratch.com/inside-a-decompiler?program=trap&sweep=linear) 这台机器把本课作为它的解码台和块面板来运行。这个链接以线性扫描打开 `sweep-trap.o`：解码台显示那四个数据字节被解码为代码，一枚针标出位于 `0x13` 处 `addq` 内部的跳转目标 `0x14`。把解码器切换到递归下降，就能看到跳转跳过数据。

## 随课交付物

本课包含 `outputs/skill-disassembly-and-control-flow.md`。用它把一个目标文件和一个函数名变成一份经核对的清单、块、带类型的边、支配节点和每一处未解析的转移。它要求判定基准比较、两种反汇编方法、字节核算、每张恢复表的重定位证据，以及一份关于仍属未知之物的陈述。

## 验证它

运行演示程序和确定性测试套件：

```bash
cd phases/13-tools-and-protocols/33-disassembly-and-control-flow
python3 code/main.py
python3 code/tests/test_main.py
```

验证应证明：

- 解码器在四个夹具目标文件的全部 237 条指令上都与 `llvm-objdump -d` 一致
- REX.W 选择 64 位操作数，REX.R 和 REX.B 扩展寄存器字段
- ModRM 和 SIB 渲染出 AT&T 内存操作数，包括 scale、index 和有符号位移
- 一个 RIP 相对位移连同它在指令内部的字段偏移一起被记录
- 重复的传统前缀和一个段覆盖的解码与判定基准一致
- 一个强制 `66` 前缀选择 SSE 操作码并使寄存器保持 32 位
- 8 位立即数在算术中作符号扩展，在移位计数中作无符号
- 超过 15 字节的指令、一条被截断的指令和一个未知操作码都抛出 `DecodeError`
- `lea` 上的 `R_X86_64_PC32` 解析到那张表，`call` 上的 `R_X86_64_PLT32` 解析到被调用者
- 扫描把陷阱表解码为代码，且在跳转目标处没有指令
- 下降从不认领那张表或填充，并在目标处读出 `addl $0x1, %eax`
- `llvm-objdump` 在陷阱上犯了和扫描相同的错误
- 一个落在指令内部的条目被记录为冲突
- 一个未解析的间接跳转会停止下降并被列出
- `total` 在 `-O1` 下有五个块、五条带类型的边、一条回边和预期的直接支配节点
- 一个手工构建的带循环菱形给出算法所定义的支配节点
- `total` 在 `-O2` 下有两个循环
- `grade` 在 `-O0` 下从 `.rela.rodata` 得出一张五条目跳转表，目标为 `0x91, 0x88, 0x7f, 0x76, 0x76`
- 不带表时 `grade` 在 `-O0` 下有三个块和一个未解析跳转
- `grade` 在 `-O1` 和 `-O2` 下是一张值表 `[1, 2, 3, 4, 4]`，没有间接跳转
- `grade_label` 在 `-O2` 下通过五条重定位读取一张相对字符串表
- 交互图示嵌入分析产生的同一份数据

## 生产失败模式

| 失败 | 薄弱的工具会报告什么 | 分析必须证明什么 |
|---|---|---|
| `.text` 内部的数据 | 一份每个字节都解码了的看似合理的清单 | 下降不认领任何数据字节，且跳转目标开启一条指令 |
| 最后一条返回之后的填充 | 函数末尾的一个 `nopw` 指令 | 这些字节从入口不可达 |
| 通过表格的间接跳转 | “jmp rax” 和四个死块 | 表地址来自 `lea` 重定位，条目数来自边界检查，目标来自 `.rela.rodata` |
| switch 变成了值表 | “一张带重定位的跳转表” | 从 `.rodata+0x14` 的一次 `movl` 加载，三个块，无间接转移 |
| 带零位移的 call | `callq 0x113`，即下一条指令 | `R_X86_64_PLT32 grade-0x4` 解析到 `0x30` |
| 解码器猜测一个未知操作码 | 一个看起来对的助记符 | 带地址的 `DecodeError`，且扫描记录该字节 |
| 比 15 字节更长的指令 | 一条很长的“指令” | 游标在读取第 16 字节之前抛出异常 |
| 分支进入某条指令的中间 | 两份重叠的清单 | 一条带两个地址的冲突记录 |
| 循环被报告为直线代码 | 伪代码里没有 `while` | 一条目标支配其源的回边 |
| 判定基准抓自另一个编译器 | 测试在陈旧文本上通过 | 夹具 README 命名确切的编译器和命令 |

## 操作规则

对照判定基准解码，从已知入口走控制流，并把每个字节核算为已认领、填充、数据或不可达之一。从你能指出的重定位或表格中恢复每个间接目标。把其余的记录为未知，连同地址。

## 延伸阅读

- [Intel 64 and IA-32 Architectures Software Developer's Manual, Volume 2, Chapter 2: Instruction Format](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)
- [AMD64 Architecture Programmer's Manual Volume 3, Chapter 1: Instruction Encoding](https://docs.amd.com/v/u/en-US/24594_3.38_APM_Vol3_PUB)
- [System V Application Binary Interface, AMD64 Architecture Processor Supplement, Table 4.9: Relocation Types](https://gitlab.com/x86-psABIs/x86-64-ABI)
- [Schwarz, Debray, Andrews, "Disassembly of Executable Code Revisited" (WCRE 2002)](https://www2.cs.arizona.edu/~debray/Publications/disasm.pdf)
- [Andriesse et al., "An In-Depth Analysis of Disassembly on Full-Scale x86/x64 Binaries" (USENIX Security 2016)](https://www.usenix.org/conference/usenixsecurity16/technical-sessions/presentation/andriesse)
- [Allen, "Control Flow Analysis" (1970)](https://doi.org/10.1145/800028.808479)
- [Cooper, Harvey, Kennedy, "A Simple, Fast Dominance Algorithm" (2001)](https://www.cs.tufts.edu/~nr/cs257/archive/keith-cooper/dom14.pdf)
- [Lengauer, Tarjan, "A fast algorithm for finding dominators in a flowgraph" (1979)](https://doi.org/10.1145/357062.357071)
- [Capstone 6.0.0-Alpha10 release notes](https://github.com/capstone-engine/capstone/releases/tag/6.0.0-Alpha10)
- 本课所描述的 rea 6.5.0 源码位于标签 `3b79af2`：`README.md`、`docs/ghidra-provider.md`、`docs/ghidra-dos.md`、`docs/reverse-engineering-tools.md`、`bridge/ghidra/ReaGhidraBridge.java`、`src/contracts/officialToolContracts.ts`、`src/ghidra/GhidraAnalysisProfile.ts`。
