---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/42-dynamic-analysis-of-your-own-program/docs/en.md
  revision: f7aadc1d61a9fbbe2bdb107d1e2bf0a6caeea299
  sha256: d769b2a28273558b3d1116c4f0ff0acb4017f0563a7cf80aa2a2c1c09f47298e
status: reviewed
---

# 动态分析你自己的程序：调试器、追踪与验证静态结论

> 命中一次断点，只是对某一个构建的某一次运行的一次观测。本课构建一套 harness，把这些观测变成对静态课程所做结论的“已确认”“已反驳”“未观测”三种判定。

**类型：** 构建
**语言：** Python、C、arm64 汇编、lldb 命令语言
**前置要求：** Phase 13 · 第 33 课（反汇编与控制流）、Phase 13 · 第 35 课（证据、置信度与未知项）
**预计时间：** 约 130 分钟

## 学习目标

- 说明调试器在 Linux 上（`ptrace`）和 macOS 上（Mach 任务端口和异常端口）分别需要操作系统提供什么，以及为什么受沙箱限制的 shell 无法启动被调试程序。
- 按函数名和按反汇编清单地址设置软件断点，设置一个硬件观察点，并读出处理器对两者施加的上限。
- 用 Python 以批处理模式驱动 lldb，通过一个 stop hook 在每次停下时记录寄存器、内存和栈帧变量，再把 transcript 解析回一条时间线。
- 用这条时间线核对第 32、33、34、41 课的静态结论：参数寄存器、结构体字段偏移、条件分支走了哪条边、发生了哪些调用。
- 对 `-O2` 构建运行同一套计划，读出能解析但从未命中的断点，并说清这能证明什么、不能证明什么。
- 保存并加载一个核心转储文件，并指出栈式核心转储遗漏了什么。
- 对照 gdb 与 lldb 的命令集，并把 `strace`、`ltrace`、`bpftrace`、`dtrace` 和 `rr` 放到正确的操作系统上，连同它们的版本和许可证。
- 陈述使 lldb 能调试你自己构建的二进制文件的那些 macOS 代码签名事实，以及它拒绝调试的两个条件。

## 问题

第 41 课从 DWARF 读出 `struct account`，说 `balance` 位于偏移 4。第 33 课构建了 `classify` 的控制流图，说当余额为负时第一个分支走向 `return -1` 块。第 32 课说前两个参数到达 `x0` 和 `x1`。这些句子里的每一句都是从字节推导出来的，没有一句是观测到的。

接着有一个智能体读了同一个程序，报告说“main 调用了 `bump`、`classify` 和 `sum_balances`”。符号表列出了这三个函数，所以这句话看起来没问题。你用 `-O2` 构建该程序，为每个函数设置断点并运行。进程打印了它的四行输出然后退出。每个断点都报告 `hit count = 0`。

这个智能体对源代码的判断没有错，它错在它被问到的是哪个构建。编译器把这三次调用全部内联，并把 `sum_balances(rows, 3)` 折叠成了常量 315。对于这台机器上的这个二进制文件，唯一能确知这一点的办法，是在调试器下运行它并亲眼去看。

本课构建一套专门去“看”的 harness。它编译 `account.c`，读取反汇编清单，规划一次 lldb 会话，运行它，并对照各次停下所显示的内容为每条静态结论评分。评分有三种结果。`confirmed`（已确认）表示某次停下显示该结论对这次运行为真。`refuted`（已反驳）表示某次停下显示它为假。`not-observed`（未观测）表示没有任何停下能测试它，并在记录中说明原因。然后第 35 课把每条判定作为权威等级为 `controlled-replay` 的 `observed`（观测）记录存下来。

```figure
re-42-run-timeline
```

## 调试器就是三项系统服务加一张表

调试器对一个它并不拥有其代码的进程做四件事。它让进程停下，读写进程的寄存器，读写进程的内存，并在进程再次停下时收到通知。内核把其中每一项作为一项服务提供，而这些服务因操作系统而异。

在 Linux 上，这项服务是 `ptrace(2)`。手册页说它“提供了一种手段，使一个进程（tracer）可以观测并控制另一个进程的执行”（"provides a means by which one process (the tracer) may observe and control the execution of another process"）。`PTRACE_TRACEME` 让子进程声明其父进程将追踪它，`PTRACE_ATTACH` 接管一个无关进程，`PTRACE_PEEKDATA` 读取“被追踪进程内存中地址 addr 处的一个字”（"a word at the address addr in the tracee's memory"），`PTRACE_GETREGS` 读取寄存器，`PTRACE_SINGLESTEP` 执行一条指令。Yama 模块限制 attach：`/proc/sys/kernel/yama/ptrace_scope` 的默认值 1 表示“目标进程必须是调用者的后代”（"the target process must be a descendant of the caller"），2 表示只有管理员才可以 attach，3 表示任何人都不可以。

在 macOS 上，`ptrace` 是一个更小的接口。Apple 的手册列出了 `PT_TRACE_ME`、`PT_ATTACHEXC`、`PT_STEP`、`PT_CONTINUE` 和 `PT_KILL`，并说使用 `PT_ATTACHEXC` 时“来自子进程的信号会作为 Mach 异常送到父进程”（"Signals from the child go to the parent as Mach exceptions"）。内存和寄存器完全不经过 `ptrace`。lldb 的 `debugserver` 调用 `task_for_pid()` 为进程取得一个 Mach 任务端口，再调用 `task_set_exception_ports()`，使断点以异常消息的形式到达。系统守护进程 `taskgated` 决定谁可以调用 `task_for_pid`。

你可以在本课保留的一份 transcript 中看到这种设计的代价。该会话的 shell 运行在一个 Seatbelt 沙箱下。同一套计划在沙箱外产生十一次停下，在沙箱内却产生这样的结果：

```text
(lldb) run
error: process exited with status -1 (attach failed ((os/kern) invalid address))
```

进程被创建了，随后却无法被接管。这个错误说的是调试器的权限，它对程序本身只字未提。harness 把它记为一次启动失败，零次停下，无任何判定。

那张表是断点表。调试器记住它在哪个地址替换了哪个指令字节，以便在你继续执行时把原字节放回去，并按位置统计命中次数。`breakpoint list` 打印这张表，harness 在每次运行结束时读取它。

## 断点：替换一个字节或一个字

软件断点是一条让处理器陷入的指令，它被写在你想停下的那条指令的最前面几个字节上。在 x86-64 上它是 `INT3`，操作码 `CC`，长一个字节，Intel 手册把它描述为“用于调用调试异常处理程序”（"intended for calling the debug exception handler"）。在 arm64 上它是 `BRK #imm16`，一条四字节指令，其异常“把异常记录在 ESR_ELx 中，使用 EC 值 0x3C”（"records the exception in ESR_ELx, using the EC value 0x3C"）。Arm 手册补充说首选返回地址就是 `BRK` 指令本身，这就是为什么一次停下报告的是被替换指令的地址，而不是它后面那条指令的地址。

lldb 可以按名称、按文件和行号，或按地址设置断点。按名称设置时它会跳过序言：

```text
(lldb) breakpoint set -n bump
Breakpoint 1: where = account-O0`bump + 12 at account.c:13:19, address = 0x00000001000004bc
```

`bump + 12` 是第四条指令。它前面的三条是 `sub sp, sp, #0x10`、`str x0, [sp, #0x8]` 和 `str w1, [sp, #0x4]`，也就是 DWARF 行号表归到该函数起始行的那段栈帧建立代码。停在这里时，`x0` 和 `x1` 仍然保存着参数，因为序言只是把它们复制走了。

按地址设置时，lldb 需要知道该地址属于哪个模块。在进程存在之前执行一条裸的 `breakpoint set -a 0x100000504`，给出的是一个背后没有节的加载地址；在一次初次测试中，它在整次运行里都保持 `unresolved`，`hit count = 0`。harness 采用的形式会指明模块：

```text
(lldb) breakpoint set -a 0x100000504 -s account-O0
Breakpoint 4: address = 0x0000000100000504
```

有了 `-s`，这个数就是 `account-O0` 内部的一个文件地址，lldb 会加上加载偏移（load slide），运行结束后该位置读作 `resolved, hit count = 2`。第 33 课的反汇编清单给出的是文件地址，所以这正是把静态清单和动态停下连起来的那种形式。

### 手工解码分支

`classify` 在 `-O0` 下的第一个条件分支，是 `0x1000004f0` 处的字 `36f800a8`，`llvm-objdump` 把它打印为 `tbz w8, #0x1f, 0x100000504`。按 Arm A64 对 `TBZ` 的编码来解码它。

1. 第 31 位是 `b5`，即位号的高位。它是 0。
2. 第 30 到 25 位是 `011011`，即测试并分支（test-and-branch）组。第 24 位是 0，它选择 `TBZ` 而非 `TBNZ`。
3. 第 23 到 19 位是 `b40`，即位号的低五位：`11111` = 31。连同 `b5` = 0，被测试的位是第 31 位，即一个 32 位值的符号位。
4. 第 18 到 5 位是 `imm14`：`00000000000101` = 5。分支偏移是 `imm14 * 4` = 20 = `0x14`，所以目标是 `0x1000004f0 + 0x14 = 0x100000504`。
5. 第 4 到 0 位是 `Rt`：`01000` = 8，所以寄存器是 `w8`。

`w8` 在前一条指令 `ldr w8, [x8, #0x4]` 中被加载，这正是偏移 4 处的 `a->balance`。`TBZ` 在该位为零时分支。于是分支在符号位清零、即 `balance >= 0` 时被走。源代码写的是 `if (a->balance < 0) return -1;`，所以编译器把条件取反了：被走的那条边跳过了 `return -1` 块，而 `0x1000004f4` 处的落空边（fall-through）进入该块。因此 harness 携带的这条静态结论是一条带谓词的边结论：`a->balance >= 0` 时走分支，否则落空。第二个分支的提升（lift）方式相同。`subs w8, w8, #0xc8` 计算 `balance - 200`，`b.le 0x100000524` 在该结果至多为零、即 `balance <= 200` 时被走。

## 观察点属于硬件，而且数量很少

观察点在某个地址处的内存被访问时让进程停下。它不能是一条被替换的指令，因为任何地方的任何指令都可能做出那次访问。因此处理器自带一小组地址比较器。在 x86-64 上它们是调试寄存器：`DR0` 到 `DR3` 保存“至多 4 个断点的地址”（"the addresses of up to 4 breakpoints"），`DR7` 启用每一个并设置它的条件（执行、写或读写）和长度（1、2、4 或 8 字节）。在 arm64 上，这些成对寄存器是 `DBGWVR<n>_EL1`，它“保存用于观察点匹配的数据虚拟地址”（"holds the data virtual address used for watchpoint matching"），以及用于控制的 `DBGWCR<n>_EL1`；Arm 手册说“一种实现可以包含 2 到 64 个观察点”（"An implementation can include between 2-64 watchpoints"）。

lldb 报告它拿到的数量：

```text
(lldb) watchpoint set variable a->balance
Watchpoint created: Watchpoint 1: addr = 0x16fdfe00c size = 4 state = enabled type = m
(lldb) watchpoint list
Number of supported hardware watchpoints: 4
```

这台机器上是四个。被观察的地址 `0x16fdfe00c` 是 `x0 + 4`：`bump` 停下时的结构体指针，加上 DWARF 中 `balance` 的偏移。`size = 4` 是那个 `int`。`type = m` 表示 modify（修改）。当槽位用尽时 lldb 会拒绝下一个观察点；又因为一个不对齐或不是 2 的幂的区域可能占用两个槽位，你能设置的观察点数量可能少于四个。

数据观察点在访问发生之后才报告。Intel 手册说“写内存的指令会在数据断点产生的调试异常生成之前就覆盖原始数据”（"an instruction that writes memory overwrites the original data before the debug exception generated by a data breakpoint is generated"），而 lldb 把旧值保存在它自己的缓存里，以便把新旧值都打印出来：

```text
Watchpoint 1 hit:
old value: 250
new value: 255
* thread #1, queue = 'com.apple.main-thread', stop reason = watchpoint 1
    frame #0: 0x00000001000004d0 account-O0`bump(a=0x000000016fdfe008, by=5) at account.c:14:12
```

这次停在 `0x1000004d0`，即 `0x1000004cc` 处 `str w8, [x9, #0x4]` 之后的那条指令。在解析输出之前，有一个怪现象值得先知道。在 `watchpoint set` 之后紧接着，lldb 会打印 `Watchpoint 1 hit:`，旧值为空，`new value: 250`。那是一次初始读取，harness 会忽略没有旧值的命中。

## 单步、stop hook 与批处理模式

lldb 的命令语法是 `<名词> <动词> [-选项] [参数]`。单步相关的动词有 `thread step-in`（`s`）、`thread step-over`（`n`）、`thread step-inst`（`si`）、`thread step-inst-over`（`ni`）和 `thread step-out`（`finish`）。`thread until 12` 运行到某一行。`thread return <expr>` 带着一个值提前返回。harness 不做单步。它停在规划好的地址上，让一个 stop hook 去做读取：

```text
target stop-hook add -o "register read x0 x1 pc" -o "memory read -s4 -fx -c24 $x0" -o "frame variable -P 1"
```

`-o` 可以重复，这些命令在每次停下时按顺序运行。`register read` 指名读取两个参数寄存器和程序计数器。`memory read -s4 -fx -c24 $x0` 从 `x0` 中的地址起以十六进制打印 24 个四字节的字，也就是 96 字节，三行 `struct account`。`frame variable -P 1` 打印参数和局部变量，并把指针展开一层，所以 `a` 会显示它的五个字段。

批处理模式是 `lldb -b`。手册说 `--batch` 运行来自 `-s`、`-S`、`-o` 和 `-O` 的命令然后退出，并且如果某条命令“因信号或崩溃”而停下（"due to a signal or crash"），“调试器会返回到交互式提示符”（"the debugger will return to the interactive prompt"）。harness 把计划写到一个文件里，用 `-s` 传入。有一项设置很关键：`settings set interpreter.stop-command-source-on-error false`。没有它，进程退出后的第一条 `continue` 会结束整个文件，`breakpoint list` 就永远不会运行。有了它，lldb 会打印 `error: Process must be launched.` 然后继续往下走。

关于输出形状的两个事实决定了解析器如何工作。第一，hook 的输出是在 hook 运行时打印的，而带有 `frame #0` 行的 `Process N stopped` 块是随后才打印的。因此解析器把寄存器、内存和变量行收集进一个待定块，并把该块附到它接下来看到的 `frame #0` 行上。如果某个块的程序计数器落在 `dyld` 的 `_dyld_start` 处，那是程序运行之前的入口停下，不会有任何 `frame #0` 来认领它。第二，带 `--auto-continue` 的断点根本不报告它的停下，stop hook 也不会为它运行。本 harness 的第一个版本用了 auto-continue，结果什么都没记录到。现在的计划改用普通断点，加上一个固定预算的 `continue` 命令。

## 计划来自反汇编清单

`Plan.commands()` 从它将要运行的那个二进制文件的 `llvm-objdump -d` 文本构建命令文件。对于 `account-O0`：

```text
breakpoint set -n bump
breakpoint set -n classify
breakpoint set -n sum_balances
breakpoint set -a 0x100000504 -s account-O0
breakpoint set -a 0x1000004f4 -s account-O0
breakpoint set -a 0x100000524 -s account-O0
breakpoint set -a 0x100000514 -s account-O0
target stop-hook add -o "register read x0 x1 pc" -o "memory read -s4 -fx -c24 $x0" -o "frame variable -P 1"
run
watchpoint set variable a->balance
watchpoint list
continue
...
breakpoint list
watchpoint list -v
```

三个按名称设置的断点是函数入口。四个按地址设置的断点，是 `Listing.conditional_branches()` 在 `classify` 中找到的每个条件分支的目标和落空地址：`0x1000004f0` 处的 `tbz` 和 `0x100000510` 处的 `b.le`。观察点在第一次停下时设置，计划预期那次停下是 `bump`。随后是十六条 `continue` 命令，比任何运行所需的都多，多出来的那些在退出后无害地失败。这个预算不是关于程序的知识，它只是一个上限。

这些结论由 `claims_for()` 从相同的输入构建：

| Id | 种类 | 结论 | 来源 |
|---|---|---|---|
| `arg-registers` | argument-register | 在每个入口处，前几个参数都到达 `x0` 和 `x1` | 第 32 课与 AAPCS64 |
| `field-offsets` | field-offset | `struct account` 共 32 字节，`kind` 在 0，`balance` 在 4，`code` 在 8，`rate` 在 16，`label` 在 24 | 第 41 课与 DWARF 转储 |
| `branch-1` | branch-taken | `0x1000004f0` 处的 `tbz`，当 `a->balance >= 0` 时走向 `0x100000504`，否则走向 `0x1000004f4` | 第 33 课的边与第 34 课的提升 |
| `branch-2` | branch-taken | `0x100000510` 处的 `b.le`，当 `a->balance <= 200` 时走向 `0x100000524`，否则走向 `0x100000514` | 第 33 课的边与第 34 课的提升 |
| `calls` | call-edge | `main` 调用 `bump` 一次、`classify` 三次、`sum_balances` 一次 | 源代码文本与 `nm` |
| `store-once` | store | `bump` 写入 `a->balance` 一次，且新值等于旧值加 `by` | 第 34 课伪代码 |
| `stride` | struct-stride | `list[i].balance` 位于 `list + 32*i + 4` | 第 41 课与 psABI 聚合类型规则 |
| `output` | behaviour | 程序打印 `class 0 1 -1` 和 `sum 315` | 源代码算术 |

字段偏移来自 `struct_layout()`，它从 dSYM 转储中读取带有 `DW_AT_byte_size (0x20)` 的 `DW_TAG_structure_type`，以及带有各自 `DW_AT_data_member_location` 的五个 `DW_TAG_member` 条目。计划从不键入数字 4，它是读出来的。

## -O0 下的运行：十一次停下

第一次停下是 `bump` 断点。hook 在停下块之前打印了这些：

```text
      x0 = 0x000000016fdfe008
      x1 = 0x0000000000000005
      pc = 0x00000001000004bc  account-O0`bump + 12 at account.c:13:19
0x16fdfe008: 0x00000073 0x000000fa 0x00000009 0x00000000
0x16fdfe018: 0x00000000 0x3ff40000 0x00000719 0x00000001
0x16fdfe028: 0x0000006c 0xffffffd8 0x00000003 0x00000000
0x16fdfe038: 0x00000000 0x40000000 0x00000721 0x00000001
(account *) a = 0x000000016fdfe008 {
  kind = 's'
  balance = 250
  code = 9
  rate = 1.25
  label = 0x0000000100000719 "savings"
}
(int) by = 5
```

把第一行的八个字对照 DWARF 偏移来读。偏移 0 处的第 0 个字是 `0x73`，即 `'s'`，也就是 `kind` 字节，后面跟着三个填充字节。偏移 4 处的第 1 个字是 `0xfa` = 250，即 `balance`。偏移 8 处的第 2 个字是 `0x9`，即 `code`，一个占据低半部分的 `short`，上面有两个填充字节。偏移 12 处的第 3 个字是 8 字节对齐的 `double` 之前的填充。偏移 16 处的第 4、5 个字是 `0x3ff4000000000000`，即 1.25 的 IEEE-754 编码。偏移 24 处的第 6、7 个字是 `0x100000719`，即指向 `__TEXT` 的 `label` 指针。接下来的八个字以 `0x6c` = `'l'` 和 `0xffffffd8` = -40 开头：这是第三行 `loan`，在 32 字节之后。每个数都与 `frame variable` 一致，所以 `_check_layout()` 在这次停下把 `field-offsets` 记为 `confirmed`，并且在 `x0` 保存结构体指针的全部十一次停下上都再次这样做。

`x0` 等于 `a`，`x1` 等于 `by`，所以 `arg-registers` 在这个入口被确认。harness 只比较声明过的参数。在 `classify` 的停下处，`x1` 仍读作 `0x5`，是 `bump` 留下的残值，而 `classify` 只有一个参数，所以不会拿任何东西去和它比较。一个没有任何参数驻留的寄存器属于噪声，第 32 课的结论对它只字未提。

第二次停下是观察点，旧值 250，新值 255，`by` = 5。整次运行只命中一次，所以 `store-once` 被确认。接着是 `classify` 的三次激活，每次都有它的入口停下和一到两次边停下：

| 停下 | 地址 | 停下原因 | 它测试什么 |
|---|---|---|---|
| 2 | `0x1000004e8` | breakpoint 2.1 | 入口，`a->balance` = 100，`x0` = `a` |
| 3 | `0x100000504` | breakpoint 4.1 | `tbz` 被走，100 >= 0，`branch-1` 被确认 |
| 4 | `0x100000524` | breakpoint 6.1 | `b.le` 被走，100 <= 200，`branch-2` 被确认 |
| 5 | `0x1000004e8` | breakpoint 2.1 | 入口，`a->balance` = 255 |
| 6 | `0x100000504` | breakpoint 4.1 | `tbz` 被走，255 >= 0 |
| 7 | `0x100000514` | breakpoint 7.1 | `b.le` 落空，255 > 200 |
| 8 | `0x1000004e8` | breakpoint 2.1 | 入口，`a->balance` = -40 |
| 9 | `0x1000004f4` | breakpoint 5.1 | `tbz` 落空，-40 < 0 |
| 10 | `0x100000544` | breakpoint 3.1 | `sum_balances` 入口，`x1` = 3 |

`_check_branches()` 把这些停下按激活分组，读取入口处的余额，并为每次边停下计算提升出来的谓词所预测的后继。五次边停下，五处一致：`branch-1` 被确认三次，`branch-2` 两次。停下 5 显示余额为 255，这正是观察点看到被写入的那个值。整次运行是同一个程序，而证据彼此连接。

在停下 10 处，hook 从 `list` 读了 24 个字。`_check_stride()` 取第 1、第 9 和第 17 个字，也就是偏移 4、36 和 68 处：100、255 和 -40。它把每个与 `classify` 在同一地址看到的余额比较，把它们相加得到 315，再与程序打印出的 `sum 315` 行比较。然后进程以状态 0 退出，`breakpoint list` 显示三个名称断点的命中次数为 1、3、1，四个边断点为 2、1、1、1。全部八条结论都以 `confirmed` 结束，背后有 25 条记录，其中 23 条绑定到某次停下，2 条绑定到已完成的运行。

## -O2 下的运行：零次停下

同样的源代码在 `-O2` 下是一个不同的程序。`main` 的 `llvm-objdump -d` 有四条 `bl` 指令，全都指向 `printf`。在那些调用的位置上，它有 `mov w8, #-0x1`、`mov w8, #0x1`、一个经由 `xzr` 的零，以及 `mov w8, #0x13b`，也就是 315。编译器在编译期算出了每一个结果。`nm` 仍然列出 `_bump`、`_classify` 和 `_sum_balances`，因为它们是外部函数，离线（out-of-line）的副本必须存在，供其他目标文件调用。dSYM 对这四个函数都有 `DW_TAG_subprogram` 条目，并且有零个 `DW_TAG_inlined_subroutine` 条目，所以连调试信息都没有记录这次内联。

这个构建的计划有三个按名称设置的断点，没有边断点。`classify` 在 `-O2` 下是六条指令——`ldr`、`cmp`、`cset`、`cmp`、`csinv`、`ret`——里面没有条件分支。来自 `-O0` 清单的那些边结论在这个二进制里没有地址，harness 不会把它们带过来。关于某条边的结论，属于其清单里有那条边的那个构建。

这次运行：

```text
(lldb) breakpoint set -n bump
Breakpoint 1: where = account-O2`bump at account.c:13:16, address = 0x0000000100000460
(lldb) run
sizeof 32 align 8
offsets 0 4 8 16 24
class 0 1 -1
sum 315
Process 48444 exited with status = 0 (0x00000000)
(lldb) watchpoint set variable a->balance
error: Command requires a process which is currently stopped.
(lldb) breakpoint list
1: name = 'bump', locations = 1, resolved = 1, hit count = 0
```

每个断点都解析成功。地址存在，符号存在，lldb 在那里写了一个 `BRK`。命中次数为零，是因为没有任何取指到达过那个地址。各项判定：

| 结论 | 判定 | 记录 |
|---|---|---|
| `calls` | refuted | 在一次完整运行、退出状态 0 之后，入口停下 bump 0、classify 0、sum_balances 0 |
| `output` | confirmed | 那四行以及退出状态 0 |
| `arg-registers` | not-observed | 没有停下测试过它，命中次数全为 0 |
| `field-offsets` | not-observed | 没有停下测试过它 |
| `store-once` | not-observed | bump 里没有停下，所以观察点从未被设置 |
| `stride` | not-observed | sum_balances 里没有停下 |

要精确说清这次反驳说的是什么。那条结论是说 `main` 在这个程序里调用了那三个函数。对于这个构建和这次运行，它没有调用；而 harness 检查了运行是否已完成，因为退出前命中次数为零只可能意味着运行还没走到那次调用。那条结论没有说这些函数是死代码，这次运行也没有这样说：它们是导出的，另一个目标文件可以调用它们。另外四条结论既没被确认也没被反驳。在这个构建里，结构体的 `balance` 仍在偏移 4，`-O2` 的 DWARF 也这么说，但这次运行没有任何停下读取内存来显示这一点。`not-observed` 保留了这个区分，而第 35 课把这个未知项一直留着，直到某次运行确实观测到它。

## 核心转储

核心转储文件是进程的内存和寄存器写到磁盘上的结果，这样在程序消失之后，调试器仍能读取一个已停下的程序。Apple 的 `core(5)` 说“少数几个会导致进程异常终止的信号，也会导致把进程的内存中状态记录写到磁盘”（"A small number of signals which cause abnormal termination of a process also cause a record of the process's in-core state to be written to disk"），写到 `/cores/core.pid`，“前提是终止的进程在该目录中有写权限，且该目录存在”（"provided the terminated process had write permission in the directory, and the directory existed"）。在这台机器上，`sysctl` 报告 `kern.coredump: 1` 和 `kern.corefile: /cores/core.%P`，`/cores` 存在且模式为 `drwxrwxr-t root admin`，而 shell 的 `ulimit -c` 是 0。在你用 `ulimit -c unlimited` 抬高限制、或用 `launchctl limit core unlimited` 在系统范围内抬高之前，内核不会写出任何核心转储。

lldb 可以在不发生崩溃的情况下按需写出一个核心转储。在 `bump` 断点处：

```text
(lldb) process save-core --style stack account-O0-stack.core
Saving 49152 bytes of data for memory region at 0x16fdf4000

Modified-memory or stack-memory only corefile created.  This corefile may 
not show library/framework/app binaries on a different system, or when 
those binaries have been updated/modified. Copies are not included
in this corefile.  Use --style full to include all process memory.
```

文件是 53,248 字节。加载它需要把二进制文件放在它旁边：

```text
(lldb) target create "./account-O0" --core "account-O0-stack.core"
(lldb) bt
* thread #1, stop reason = ESR_EC_BRK_AARCH64 (fault address: 0x0)
  * frame #0: 0x00000001000004bc account-O0`bump(a=0x000000016fdfe008, by=5) at account.c:13:19
    frame #1: 0x0000000100000640 account-O0`main at account.c:40:5
    frame #2: 0x000000019a949d54 dyld`start + 7184
(lldb) frame variable *a
(account) *a = (kind = 's', balance = 250, code = 9, rate = 1.25, label = "")
(lldb) frame variable a->label
(const char *) a->label = 0x0000000100000719 ""
```

回溯和整数字段完好无损，因为它们存在于核心转储保存了的栈上。`label` 打印为一个空字符串，而它的指针完好。指针 `0x100000719` 是正确的；它所指向的字节是可执行文件 `__TEXT` 段中的字面量 `"savings"`，而栈式核心转储不包含那个段。指针是一个观测。字符串拿不到，而 lldb 不会凭空捏造它。`--style full` 包含全部进程内存，在研究用机器上，这个 34 KB 程序的一份完整核心转储是 2.1 GB，因为该进程映射了共享缓存。停下原因读作 `ESR_EC_BRK_AARCH64`：核心转储记录了断点引发的那次 `BRK` 异常。

在 Linux 上，内核按照 `/proc/sys/kernel/core_pattern` 写出核心转储，这是一个模板，`%p` 代表 PID，`%e` 代表命令名，`%s` 代表信号，`%t` 代表时间，开头的 `|` 把转储通过管道送给一个程序。采用 systemd 的发行版用这个管道交给 `systemd-coredump`，而 `coredumpctl list`、`info`、`dump` 和 `debug` 取回它所存储的内容。`gdb prog core` 和 `lldb -c core prog` 都能打开其结果。

## gdb 和 lldb 并排对照

这两个调试器用不同的词做同样的工作。harness 中的 `COMMAND_MAP` 有 35 行，由 `python3 code/main.py commands` 打印。本课用到的这些：

| 任务 | gdb | lldb | lldb 别名 |
|---|---|---|---|
| 在某个函数处设断点 | `break bump` | `breakpoint set -n bump` | `b bump` |
| 在某个模块内的某地址处设断点 | `break *0x1000004f0` | `breakpoint set -a 0x1000004f0 -s account-O0` | |
| 在每次停下时运行一些命令 | `define hook-stop` ... `end` | `target stop-hook add -o '...'` | |
| 列出断点及其命中次数 | `info breakpoints` | `breakpoint list` | `br l` |
| 对某变量的写进行观察 | `watch a->balance` | `watchpoint set variable a->balance` | `wa s v a->balance` |
| 列出观察点 | `info watchpoints` | `watchpoint list -v` | `wa l -v` |
| 读一个寄存器 | `p $x0` | `register read x0` | |
| 以字为单位读内存 | `x/8xw 0x16fdfe008` | `memory read -s4 -fx -c8 0x16fdfe008` | `x -s4 -fx -c8 0x16fdfe008` |
| 显示参数 | `info args` | `frame variable --no-locals` | |
| 单步执行一条指令 | `stepi` | `thread step-inst` | `si` |
| 运行到函数返回 | `finish` | `thread step-out` | `finish` |
| 写一个核心转储文件 | `gcore core` | `process save-core --style stack core` | |
| 打开一个核心转储文件 | `gdb account-O0 core` | `lldb -c core account-O0` | |

lldb 的 `p` 是 `dwim-print` 的别名，它通过 `frame variable` 路径打印一个普通变量，对其他任何东西则回退到 `expression`。`v` 是 `frame variable`。在 harness 中优先用 `frame variable`：它读取 DWARF 位置，从不在被调试程序里运行代码。

截至 2026-10-14 的版本与许可证。lldb 带着 LLVM 的版本号，当前 llvm.org 发行版是 2026-10-06 的 LLVM 23.1.3，许可证为带 LLVM 例外条款的 Apache License 2.0。Homebrew 以独立的 formula `lldb` 提供它。这台机器上的 Command Line Tools 提供 `lldb-1703.0.236.21`，这是 Apple 自己的编号，内嵌一个 Python 3.9.6，而且 Apple 的 lldb 已经签好名可以调试。GDB 18.1 于 2026-09-25 发布，许可证为 GPL-3.0-or-later。它的发行说明列出了 Windows、`.gdb_index`、AArch64 `FPMR` 和 Python `gdb.Corefile` 的改动，没有 Darwin 条目。GDB 直到 18.1 都不原生支持 Apple 芯片上的进程：2025 年 10 月发布了一个 15 个补丁的“Initial AArch64-Darwin support”系列，2026 年 2 月一位维护者给出了先通过版权转让和 BFD 补丁再落地它的路线。Homebrew 的 `gdb` formula 有 arm64 的 bottle，并以伪造的 `--target=x86_64-apple-darwin20` 构建，而添加它们的那个 pull request 说“不可能通过 GDB 调试 aarch64-darwin 二进制文件”（"it is not possible to debug aarch64-darwin binaries via GDB"）。macOS 上任何非 Apple 的调试器还需要一份自签名证书和 `com.apple.security.cs.debugger` 权利（entitlement），否则 `task_for_pid` 会以“(os/kern) failure (0x5)”失败。gdb 在本课程里的位置是 Linux，Debian stable 为 arm64 提供 gdb 16.3，而 `rr` 也存在于 Linux。

## 追踪：程序向内核请求了什么

调试器显示程序在某次停下时的状态。追踪器显示程序对系统的影响，而不长时间地让它停下。这些工具因操作系统而异。

| 工具 | 操作系统 | 版本 | 许可证 | 它记录什么 |
|---|---|---|---|---|
| `strace` | Linux | 7.2，2026-08-18 | LGPL-2.1-or-later | 带参数和返回值的系统调用 |
| `ltrace` | Linux | 最后一个 tarball 0.7.3，Debian 中有 git 快照 | GPL-2.0 | 动态库调用 |
| `bpftrace` | Linux | v0.27.0，2026-09-10 | Apache-2.0 | 通过 eBPF 的内核和用户探针 |
| `dtrace` 和 `dtruss` | macOS | macOS 26.2 中的 `Sun D 1.19` | CDDL，源自 Sun 的 OpenSolaris | D 探针；`dtruss` 打印系统调用 |

`dtruss` 在它的手册里说“由于它使用 DTrace，只有拥有 root 权限的用户才能运行此命令”（"Since this uses DTrace, only users with root privileges can run this command"）。Apple 的 `dtrace(1)` 补充说“在默认的系统完整性保护设置下，D 程序不被允许访问内核地址值或内核内存内容”（"With default System Integrity Protection settings, D programs are not permitted to access kernel address values or kernel memory contents"），并且在 SIP 下不允许破坏性动作。本课没有在这台机器上运行 `sudo dtruss ./account-O0`，因为 harness 不以 root 运行，本课把这记为未验证。追踪回答的问题和 harness 不同：“这次运行是否为每一行 `printf` 发出了一次 `write`”是追踪问题，“`x1` 在 `bump` 处是否保存 5”是调试器问题。两者都是针对每次运行的。

## 录制与重放

`rr` 把一次运行录制一次，并在 gdb 下确定性地重放它，还支持反向执行：在你关心的值上设一个观察点，`reverse-cont` 会向后运行到那次写入。该项目这样描述自己：“你把一次失败录制一次，然后随你想要多少次都确定性地调试这份录制”（"You record a failure once, then debug the recording, deterministically, as many times as you want"）。当前发行版是 2025-02-13 的 5.9.0，采用 MIT 许可证，含一段 BSD-2-Clause。它只支持 Linux。它需要硬件性能计数器来统计分支，所以它在 Linux 下运行于 Intel Nehalem 及以后、某些 AMD Zen 核心，以及“某些 AArch64 微架构（例如 ARM Neoverse N1 或 Apple 芯片 M 系列）”（"certain AArch64 microarchitectures (e.g. ARM Neoverse N1 or the Apple Silicon M-series)"）。在虚拟机内，这些计数器必须被虚拟化，而该项目的 wiki 说“Mac 上也没有其他虚拟化做到这一点”（"No other virtualization on Mac does either"），所以这台机器上的 Docker 和 Colima 都无法运行它。Pernosco 是建立在 rr 录制之上的商业服务。

gdb 自己有一个软件录制器。`record full` 录制“进程执行的日志”（"a log of the process execution"），默认上限是 200,000 条指令，`record btrace` 使用 Intel 的分支追踪，并且“不录制数据”（"does not record data"）。两者在 lldb 中都不可用。在这台 macOS 机器上，harness 保存的 transcript 就是那份录制：同样的计划在同样的二进制上产生同样顺序的同样的停下，而 fixture 测试把那个顺序钉死。

## 一次运行能证明什么

一次运行证明的是一个构建上的一个输入。C 标准把未定义行为定义为“在使用不可移植或错误的程序构造、或错误的数据时产生的行为，本文件对此不作任何要求”（"behavior, upon use of a nonportable or erroneous program construct or of erroneous data, for which this document imposes no requirements"），所以一个使有符号 `int` 溢出的程序，在 `-O0` 和 `-O2` 下合法地打印不同结果都是可以的。第 36 课用 `percent_change` 溢出单元迎接了这一点。UBSan 把这个问题变成一次停下：`-fsanitize=signed-integer-overflow -fsanitize-trap=undefined` 使溢出“执行一条 trap 指令”（"execute a trap instruction"），它作为一次带原因的停下落进 lldb。

优化后的代码还会移动你想观察的东西。GDB 的手册说“优化器重排了你的代码；调试器显示的是真正在那里的东西”（"the optimizer has rearranged your code; the debugger shows you what is really there"），并说一个被优化掉而不复存在的变量是“GDB 永远看不到的”（"GDB never sees"）。GDB 把这样的值打印为 `<optimized out>`，它的源码把这与 `<unavailable>` 区分开：optimized out 表示“在程序中实际并不存在”（"does not actually exist in the program"），unavailable 表示“在程序中（机器层面）存在，但 GDB 没有办法取到它”（"exists in the program (at the machine level), but GDB has no means to get to it"）。当程序计数器落在变量 DWARF 位置列表的每一个范围之外时，lldb 打印 `<variable not available>`。对一个驻留在寄存器里的局部变量设置的观察点永远不会触发，因为寄存器不是内存。上面的 `-O2` 运行展示了极端情况：整个函数被折叠掉了，而一个从未被设置的观察点的沉默什么也证明不了。

因此 harness 写三种记录，绝不写第四种。一次测试了结论并与之一致的停下是 `confirmed`。一次测试了结论并与之不一致的停下是 `refuted`。一条没有任何停下能测试的结论是 `not-observed`，连同原因，而断点命中次数是那个原因的一部分。第 35 课的账本把前两者作为权威等级 `controlled-replay` 的 `observed` 记录接受，把第三种作为一个开放的未知项保留。

## 在 macOS 上只调试你自己的构建

在 Apple 芯片上，链接器会替你签名。Apple 的 `ld(1)` 关于 `-adhoc_codesign` 说：“Apple 芯片二进制文件的默认情况是进行 ad-hoc 代码签名。”（"The default for Apple Silicon binaries is to be ad-hoc codesigned."）对 fixture 执行 `codesign -dvvv account-O0` 打印：

```text
Format=Mach-O thin (arm64)
CodeDirectory v=20400 size=387 flags=0x20002(adhoc,linker-signed) hashes=9+0 location=embedded
Signature=adhoc
TeamIdentifier=not set
```

`0x20002` 是 `CS_ADHOC`（`0x2`）加上 `CS_LINKER_SIGNED`（`0x20000`），在 Apple 代码签名头文件中是“由链接器自动签名”（"Automatically signed by the linker"）。`codesign -d --entitlements -` 在可执行文件名之后什么都不打印：这个二进制没有权利。lldb 启动了它，命中了每一个断点，设置了一个硬件观察点，并写出了一个核心转储，而此时 `DevToolsSecurity -status` 报告“开发者模式当前已禁用”（"Developer mode is currently disabled"），且系统完整性保护已启用。

有两个权利控制谁可以调试什么，它们分处对立的两侧。`com.apple.security.cs.debugger` 是给调试器的：“一个布尔值，指示该 app 是否是调试器、是否可以 attach 到其他进程或取得任务端口。”（"A Boolean value that indicates whether the app is a debugger and may attach to other processes or get task ports"）Apple 的 `debugserver` 带着它的私有形式，而对 Command Line Tools 那份副本执行 `codesign -d --entitlements -` 列出了 `com.apple.private.cs.debugger`、`com.apple.private.set-exception-port`、`com.apple.private.thread-set-state` 和 `com.apple.private.logging.diagnostic`。`com.apple.security.get-task-allow` 是给目标的。Xcode 把它注入 debug 构建，在导出时剥除它，而公证（notarization）会拒绝仍带着它的二进制。Apple 的工程师陈述了拒绝的规则：当目标启用了加固运行时（hardened runtime）且没有 `get-task-allow` 时，任务端口会被拒绝。一个普通的 `clang` 构建既不加固，也不触发这两个条件中的任何一个。如果你哪天用 `codesign --options runtime` 给一个 fixture 签名，在调试之前用 `codesign -s - -f --entitlements get-task-allow.plist` 重新给它签名。

还有三个事实收尾这一节。第一，你可能会在一个登录会话里第一次看到对话框“Developer Tools Access needs to take control of another process for debugging to continue”；`sudo DevToolsSecurity -enable` 为 `admin` 或 `_developer` 组的成员去掉那次额外的密码输入。第二，你不需要禁用 SIP 来调试你自己的代码。Apple 说“你不需要禁用 SIP 就能从 Xcode 运行和调试 app”（"You don't need to disable SIP to run and debug apps from Xcode"），而唯一触及调试的 SIP 组件，是 `csrutil enable --without debug` 为别人的进程放松的那个。第三，本会话中的 Seatbelt 沙箱完全阻止 `task_for_pid`，fixture `sandbox-O0.lldb.txt` 显示了其结果。一次无法启动的运行是一个环境事实，harness 就把它当作环境事实来报告。

本课中的一切都适用于你自己编译的程序。只有当某个进程的所有者主动选择允许时，同样的命令才会 attach 到那个进程，而这里没有任何内容教你如何去改变那一点。

## 动手构建

运行演示：

```bash
cd phases/13-tools-and-protocols/42-dynamic-analysis-of-your-own-program
python3 code/main.py
```

输出是针对那些保存的 transcript 的一份 JSON 报告。对每个构建，它列出断点及其解析情况和命中次数、硬件观察点数量、每一次停下及其寄存器和参数、退出状态、程序的输出、lldb 打印的错误，以及各条结论连同其判定和背后的证据记录。它还加上核心转储的往返、Python API 结果、沙箱失败，以及这台机器上缺少哪些外部工具。

预期形状：

```json
{
  "program": "account.c",
  "variants": {
    "O0": {
      "binary": "account-O0",
      "breakpoints": {"1": {"spec": "name=bump", "address": "0x1000004bc", "resolved": true, "hits": 1}, "...": "..."},
      "hardwareWatchpoints": 4,
      "watchpoints": {"1": {"address": "0x16fdfe00c", "size": 4, "type": "m", "hits": [[250, 255]], "hitCount": 1}},
      "stops": [{"index": 0, "pc": "0x1000004bc", "function": "bump", "kind": "entry", "registers": {"x0": "0x16fdfe008", "x1": "0x5"}, "...": "..."}],
      "exitStatus": 0,
      "claims": [{"id": "arg-registers", "verdict": "confirmed", "confirmed": 5, "refuted": 0, "not-observed": 0, "...": "..."}],
      "evidence": [{"claim": "arg-registers", "verdict": "confirmed", "stop": 0, "observation": "bump: x0 = 0x16fdfe008 and a = 0x000000016fdfe008, x1 = 0x5 and by = 5"}]
    },
    "O2": {"stops": [], "claims": [{"id": "calls", "verdict": "refuted", "...": "..."}], "...": "..."}
  },
  "core": {"savedAt": {"function": "bump", "pc": "0x1000004bc"}, "labelString": "", "...": "..."},
  "types": {"python": "3.9.6", "size": 32, "...": "..."},
  "sandbox": {"stops": 0, "errors": ["process exited with status -1 (attach failed ((os/kern) invalid address))"]},
  "absentTools": ["bpftrace", "gdb", "llvm-objdump", "ltrace", "rr", "strace"]
}
```

按这个顺序阅读 `code/main.py`：

1. `Listing` 把 `llvm-objdump -d` 的文本解析成函数和指令，`Function.conditional_branches()` 找出带有目标和落空地址的分支。
2. `struct_layout()` 从 `llvm-dwarfdump` 的文本中读取结构体和成员条目。
3. `lift_condition()` 把一个条件分支变成一个谓词，这是第 34 课针对 `tbz`、`cbz` 和比较并分支（compare-and-branch）形式的那一步。
4. `Plan.commands()` 从反汇编清单写出 lldb 命令文件，`Plan.lldb_command()` 是那条批处理调用。
5. `parse_transcript()` 按顺序遍历输出，构建带有寄存器、内存、变量和观察点值的 `Stop` 记录，外加断点表和退出状态。
6. `claims_for()` 陈述那八条结论，`evaluate()` 用各个 `_check_*` 函数逐次停下地为它们评分。
7. `rollup()` 把这些记录归并为每条结论一个判定，其中 refuted 优先于 confirmed。
8. `capture()` 和 `capture_extras()` 生成了那些 fixture，`live()` 在 `clang` 和 `lldb` 能运行时，对一个全新的构建重复整个循环。

还存在另外四条命令。`python3 code/main.py plan O0` 打印某个构建的命令文件。`python3 code/main.py commands` 打印 gdb 和 lldb 对照表。`python3 code/main.py tools` 报告哪些外部工具在 `PATH` 上。`python3 code/main.py live O0` 把 `account.c` 编译到一个临时目录，根据它全新的反汇编清单规划，运行 lldb，并对照那次运行为结论评分。在沙箱内，它报告 lldb 无法启动进程，连同错误，并以 1 退出。

## 使用

按这个顺序在你自己的程序上使用这套 harness。

1. 用 `-g` 和你将要发布的优化级别构建它。把二进制、它的 dSYM 或它的 DWARF，以及 `llvm-objdump -d` 文本放在一起。
2. 在运行之前写下结论。每条结论指名一个函数、一个寄存器或地址或偏移、一个预期值或边，以及它出自的那课或那份文档。一条你看过停下之后才写下的结论，只是在描述那次停下，什么也没测试。
3. 从反汇编清单生成计划并读一遍。里面每个地址都应能追溯到清单里的一行。如果某个断点没有这样的对应行，就把它删掉。
4. 以批处理模式运行一次，并把 transcript 连同命令行和调试器版本一起保存在它的头部。transcript 就是证据。判定是从它推导出来的，任何人都能重新推导出来。
5. 评分。在读那些确认之前，先读每一条 `not-observed` 记录及其原因。这些原因告诉你哪些结论需要另一个输入、另一个构建或另一个断点。
6. 用同样的结论运行优化后的构建。在编译器做了内联的地方，预期会看到解析成功但命中次数为零的断点，并把那些结论保持开放。
7. 把已确认和已反驳的记录作为 `observed`、权威等级 `controlled-replay`、每次停下一条记录，喂进第 35 课的账本。把未观测的那些作为未知项保留，并附上断点命中次数。

## 交互实验

### 实验 A：手工读一次停下

从 `code` 目录打开 Python：

```bash
cd phases/13-tools-and-protocols/42-dynamic-analysis-of-your-own-program/code
python3 -q
```

运行：

```python
from main import *
t = load_transcript("session-O0.lldb.txt")
s = t.stops[0]
hex(s.pc), s.function, s.reason, s.registers
[hex(w) for w in s.memory[:8]]
s.struct_pointer().fields
```

在运行第二行之前，写下你预期哪个字保存 250、哪两个字保存 1.25。然后运行 `struct.unpack("<d", struct.pack("<II", s.memory[4], s.memory[5]))` 并比较。接着看 `t.stops[1].watch_hit` 和 `t.stops[1].pc`，并在 `account-O0.objdump.txt` 中找到那个地址：它是那次存储之后的那条指令。

### 实验 B：分支及其后继

```python
plan = make_plan("O0")
plan.branches()
classify = plan.listing.function("classify")
[lift_condition(classify, b, "a->balance")[0] for b in plan.branches()]
[(hex(s.pc), s.struct_pointer().field_int("balance")) for s in t.stops_in("classify")]
```

把每一次边停下与它的入口停下配对，并在你看证据之前，先判断那个谓词预测哪个后继。然后运行 `[e.to_dict() for e in evaluate(plan, t, struct_layout(open("fixtures/account-O0.dwarfdump.txt").read(), "account")) if e.claim.startswith("branch")]` 并比较。

### 实验 C：从未停下的那次运行

```python
o2 = load_transcript("session-O2.lldb.txt")
len(o2.stops), o2.exit_status, o2.hits()
o2.errors[:3]
make_plan("O2").branches()
rollup(evaluate(make_plan("O2"), o2, struct_layout(open("fixtures/account-O2.dwarfdump.txt").read(), "account")))
```

用你自己的话解释每一条 `not-observed`，然后打开 `account-O2.objdump.txt`，找到 `main` 中替换了那些调用的四个常量。接着用 `count_tags()` 统计 `account-O2.dwarfdump.txt` 中的 `DW_TAG_inlined_subroutine`。

### 实验 D：弄坏证据

```python
text = open("fixtures/session-O0.lldb.txt").read().replace("x1 = 0x0000000000000005", "x1 = 0x0000000000000006", 1)
broken = parse_transcript(text)
[e.to_dict() for e in evaluate(plan, broken, struct_layout(open("fixtures/account-O0.dwarfdump.txt").read(), "account")) if e.claim == "arg-registers"][:2]
```

被编辑的一个寄存器，把第一条 `arg-registers` 记录变成 `refuted`，并连带归并结果也变成 refuted，而另外四个入口保持 `confirmed`。然后删掉观察点停下之前的 `old value: 250` 行，看 `store-once` 跌到 `not-observed`。一个无论如何都无法被弄到失败的评分器，根本不是在评分。

如果 lldb 能在你的 shell 里启动一个进程，就用 `python3 main.py live O0` 和 `python3 main.py live O2` 收尾。栈地址会和 fixture 不同，判定则不应不同。

## 实践实验

用一条关于 `sum_balances` 中循环的结论来扩展这套 harness。

要求：

- 用 `conditional_branches()` 在 `-O0` 清单里找出 `sum_balances` 的循环回边（back edge），并在循环头（loop header）处加一个断点。
- 加一条结论：对于 `count` = 3，循环头执行 `count + 1` 次，这是第 33 课的那条回边加上那次退出测试。
- 扩展 stop hook 或计划，使 hook 在每次循环头停下时读取循环计数器的栈槽，并写一个 `_check_loop()` 来记录计数器值的序列。
- 在 lldb 能启动进程的机器上用 `python3 main.py capture O0` 重新捕获 transcript，并重跑整套测试。在已提交的命令文件与新计划匹配之前，plan 测试会失败，这正是那个测试的意义所在。
- 加一个测试：它在 transcript 中编辑一个计数器值，并断言该结论变成 `refuted`。

成功意味着报告按顺序显示循环头停下及其计数器值，而 `-O2` 运行把这条新结论保持为 `not-observed`，原因是循环被向量化或折叠掉了。

## 随课交付物

本课包含 `outputs/skill-dynamic-analysis-of-your-own-program.md`。用它把你构建的一个程序、它的反汇编清单和一份静态结论列表，变成一份保存下来的调试器 transcript 和每条结论一个判定，连同产生每个判定的那次停下，以及每条保持未观测的结论的原因。它适用于 Claude、Cursor、Codex、OpenClaw、Hermes，或任何读取 SKILL.md 的智能体。

## 验证它

运行演示和确定性测试套件：

```bash
cd phases/13-tools-and-protocols/42-dynamic-analysis-of-your-own-program
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

这套测试在没有 lldb 的情况下运行。它读取一次性捕获进 `code/fixtures/` 的那些 transcript。验证应当证明：

- 清单解析器找出那四个函数及其范围，以及 `classify` 在 `-O0` 下的两个条件分支连同目标和落空地址
- `tbz w8, #0x1f` 的提升是 `a->balance >= 0`，`subs` 加 `b.le` 的提升是 `a->balance <= 200`
- `main` 在 `-O0` 下调用 `bump`、`classify` 三次和 `sum_balances`，而 `main` 在 `-O2` 下只调用 `printf`
- x86-64 的 `j<cc>` 助记符是条件的，而 `jmp` 和 `callq` 不是
- DWARF 转储得出一个 32 字节的结构体，成员在 0、4、8、16 和 24
- `-O2` 的 DWARF 有四个子程序、零个内联子例程（inlined-subroutine）条目，而 `nm` 仍然列出那三个函数
- 两个构建的计划都等于已提交的命令文件，并且 transcript 头部记录了运行它的那条 lldb 命令
- `-O0` 的 transcript 在预期的那些函数里有十一次停下、退出状态 0 和那四行输出
- hook 的输出被附到紧随其后的那次停下上，`x1` = 5，内存从 `x0` 开始，还有那个 label 字符串
- 断点表携带解析情况和命中次数 1、3、1、2、1、1、1
- 观察点是在 `x0 + 4` 处类型为 modify 的 4 字节，以旧值 250、新值 255 命中一次，并报告四个硬件槽位
- `-O2` 的 transcript 有零次停下、三个解析成功但命中次数为零的断点、无观察点，以及每条未使用的 `continue` 对应一条错误
- 沙箱内的启动在任何停下之前就带着那个 attach 错误失败
- 核心转储往返保留了回溯和 `balance` = 250，并丢失了 `label` 背后的字符串
- Python API 在没有进程的情况下读出那五个字段、大小 32 和各函数范围
- 一份手写的 x86-64 transcript 以 `rdi`、`rsi` 和 `rip` 解析
- 每条结论在 `-O0` 下都被确认，带有 5、11、3、2、1、1、1、1 条记录
- 分支证据指名那个值、那个条件和那条边
- 字段偏移证据通过 DWARF 布局解码那些字
- 存储与步长证据携带旧值、新值和那三行的余额
- `-O2` 运行反驳那些调用边，并把其他结论保持为未观测
- 一个被编辑的寄存器值是 refuted，一次被删除的观察点命中是 not-observed，而 refuted 在归并中胜出
- 命令映射对每一行都有 gdb 和 lldb 形式，硬件表指名四个 x86 调试寄存器
- 演示列出缺少的工具，而不是失败，并且 live 模式按名称报告缺少的工具
- figure 数据来自两次会话，而站点模块嵌入同样的数据

## 生产失败模式

| 失败 | 弱报告怎么说 | harness 必须证明什么 |
|---|---|---|
| 解析成功但命中次数为零的断点 | “这个函数在运行”或“这个函数是死的” | 一次带退出状态、命中次数的完整运行，以及仅针对调用边的 `refuted` 判定 |
| 在错误的停下处读寄存器 | “`x1` = 5 在 `classify` 内” | 只在入口停下处比较声明过的参数 |
| 不带偏移地读结构体 | 一列十六进制字 | 每个字都映射到一个 `DW_AT_data_member_location` 并与 `frame variable` 比较 |
| 从助记符就为分支评分 | “`tbz` 意思是在为负时被走” | 从编码提升出来的谓词，以及在后继处的那次停下 |
| 对驻留在寄存器里的局部变量设观察点 | “没有写发生” | 观察点设在一个地址上并且被命中，否则记录为 `not-observed` |
| auto-continue 断点 | 一份没有停下的干净 transcript | 普通断点、一个 stop hook 和一个 continue 预算 |
| 不带模块的地址断点 | `unresolved, hit count = 0` | 用 `-s MODULE` 让清单地址解析为一个加载地址 |
| 第一条命令错误结束批处理 | 末尾没有 `breakpoint list` | `interpreter.stop-command-source-on-error false` |
| 把栈式核心转储当作完整内存来读 | 把 `label = ""` 报告为程序的值 | 核心转储的样式、那个指针，以及它指向的那个段 |
| 受沙箱限制的 shell | “lldb 坏了” | `attach failed ((os/kern) invalid address)` 作为一个环境事实记录 |
| 加固的目标但没有 `get-task-allow` | “macOS 禁止调试” | 来自 Apple 规则的那两个条件，以及给你自己二进制的一次重新签名 |
| 评分后丢弃 transcript | 没有来源的判定 | transcript 文件、它的命令行和调试器版本 |

## 操作规则

从反汇编清单规划停下，以批处理模式运行一次，保留 transcript，并在每一次能测试某条静态结论的停下处都为它评分。只从一次停下写出 confirmed 或 refuted，写 not-observed 时带上命中次数和原因，绝不让一个解析成功的断点替代一次运行。只调试你自己做的那些构建。

## 延伸阅读

- [LLDB Tutorial: command grammar, breakpoints, watchpoints, stop hooks](https://lldb.llvm.org/use/tutorial.html)
- [lldb(1) manual page: --batch, --one-line, --source, --core](https://lldb.llvm.org/man/lldb.html)
- [GDB to LLDB Command Map](https://lldb.llvm.org/use/map.html)
- [LLDB Python Reference: SBTarget, SBFrame, SBValue, and the embedded interpreter](https://lldb.llvm.org/use/python-reference.html)
- [LLDB Caveats: the Python build lldb links against](https://lldb.llvm.org/resources/caveats.html)
- [LLVM 23.1.3 release](https://github.com/llvm/llvm-project/releases/tag/llvmorg-23.1.3)
- [GDB 18.1 release announcement, 2026-09-25](https://sourceware.org/pipermail/gdb-announce/2026/000150.html)
- [GDB manual: Process Record and Replay](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Process-Record-and-Replay.html)
- [GDB manual: Debugging Optimized Code](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Optimized-Code.html)
- [GDB wiki: Permissions on Darwin, code signing a debugger](https://sourceware.org/gdb/wiki/PermissionsDarwin)
- [gdb-patches: Initial AArch64-Darwin support series, October 2025](https://sourceware.org/pipermail/gdb-patches/2025-October/222196.html)
- [Homebrew gdb formula pull request adding arm64 bottles](https://github.com/Homebrew/homebrew-core/pull/209753)
- [ptrace(2), Linux manual page](https://man7.org/linux/man-pages/man2/ptrace.2.html)
- [lldb debugserver MachTask.mm: task_for_pid and task_set_exception_ports](https://github.com/llvm/llvm-project/blob/main/lldb/tools/debugserver/source/MacOSX/MachTask.mm)
- [Intel SDM Volume 2: INT n, INTO, INT3, INT1](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)
- [Intel SDM Volume 3: debug registers DR0 to DR7 (Debug, Branch Profile, TSC, and Resource Monitoring Features)](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)
- [Arm A64 ISA: BRK, Breakpoint instruction](https://developer.arm.com/documentation/ddi0602/latest/Base-Instructions/BRK--Breakpoint-instruction-)
- [Arm A64 ISA: TBZ, Test bit and branch if zero](https://developer.arm.com/documentation/ddi0602/latest/Base-Instructions/TBZ--Test-bit-and-branch-if-zero-)
- [Arm Architecture Reference Manual, D2.9 Watchpoint exceptions](https://developer.arm.com/documentation/ddi0487/latest/)
- [Apple ld(1): -adhoc_codesign](https://keith.github.io/xcode-man-pages/ld.1.html)
- [Apple ld64 LinkEdit.hpp: CS_LINKER_SIGNED](https://github.com/apple-oss-distributions/ld64/blob/59a99ab60399c5e6c49e6945a9e1049c42b71135/src/ld/LinkEdit.hpp)
- [Apple: Debugging Tool Entitlement, com.apple.security.cs.debugger](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.cs.debugger)
- [Apple: Hardened Runtime](https://developer.apple.com/documentation/security/hardened-runtime)
- [Apple: Resolving common notarization issues, the get-task-allow entitlement](https://developer.apple.com/documentation/security/resolving-common-notarization-issues)
- [Apple: Disabling and Enabling System Integrity Protection](https://developer.apple.com/documentation/security/disabling-and-enabling-system-integrity-protection)
- [Apple Developer Forums: debugserver may not get the taskport of a hardened process](https://developer.apple.com/forums/thread/127544)
- [Apple DevToolsSecurity(8)](https://keith.github.io/xcode-man-pages/DevToolsSecurity.8.html)
- [Apple core(5)](https://keith.github.io/xcode-man-pages/core.5.html)
- [Apple Technical Note TN2124: Mac OS X Debugging Magic, core dumps](https://developer.apple.com/library/archive/technotes/tn2124/_index.html)
- [lldb `process save-core` help text](https://github.com/llvm/llvm-project/pull/143126)
- [core(5), Linux manual page](https://man7.org/linux/man-pages/man5/core.5.html)
- [coredumpctl(1)](https://man7.org/linux/man-pages/man1/coredumpctl.1.html)
- [Apple dtrace(1)](https://keith.github.io/xcode-man-pages/dtrace.1.html)
- [Apple dtruss(1m)](https://keith.github.io/xcode-man-pages/dtruss.1m.html)
- [strace releases](https://github.com/strace/strace/releases)
- [ltrace](https://ltrace.org/)
- [bpftrace CHANGELOG](https://github.com/bpftrace/bpftrace/blob/master/CHANGELOG.md)
- [rr project](https://rr-project.org/)
- [rr 5.9.0 release](https://github.com/rr-debugger/rr/releases/tag/5.9.0)
- [rr wiki: Building And Installing, hardware and VM requirements](https://github.com/rr-debugger/rr/wiki/Building-And-Installing)
- [Clang UndefinedBehaviorSanitizer](https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html)
- [ISO/IEC 9899:2024 working draft N3220, clause 3.5 undefined behavior](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n3220.pdf)
- [DWARF Debugging Information Format Version 5](https://dwarfstd.org/doc/DWARF5.pdf)
- [Procedure Call Standard for the Arm 64-bit Architecture (AAPCS64)](https://github.com/ARM-software/abi-aa/blob/main/aapcs64/aapcs64.rst)
- [System V Application Binary Interface, AMD64 Architecture Processor Supplement](https://gitlab.com/x86-psABIs/x86-64-ABI)
