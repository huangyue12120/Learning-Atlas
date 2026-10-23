---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/37-the-reverse-engineering-landscape/docs/en.md
  revision: f7aadc1d61a9fbbe2bdb107d1e2bf0a6caeea299
  sha256: f53c1e8602ebd64bf1a44c80bc08e2f48fc3bf1eb715bec68affc14602332a44
status: reviewed
---

# 逆向工程全景：历史、工具家族，以及反编译器是如何构建的

> 五个工具读同一个目标文件，给出四个地址、三个块计数，还为一个 switch 给出两个答案——本课构建的测试工具能看清哪个是哪个。

**类型：** 构建
**语言：** Python、C、x86-64 汇编、Java（一个 Ghidra 脚本）
**前置要求：** Phase 13 · 第 32 课（从零构建 ELF）、Phase 13 · 第 33 课（反汇编与控制流）、Phase 13 · 第 34 课（提升到伪代码）
**预计时间：** 约 150 分钟

## 学习目标

- 把这个领域的主要工具放到一条从 1973 到 2026 的注明日期的时间线上，并说出每个工具所属的家族。
- 说出反编译器的八个阶段，以及 Ghidra、Binary Ninja、Hex-Rays、radare2、rizin 和 angr 为每个阶段使用的术语。
- 把一条指令提升到 ESIL、RzIL、P-code 和 VEX，并解释其中哪些急切地写入标志位、哪些保存一个 thunk。
- 把五个工具的地址归约到一个 `.text` 偏移，并在一个函数上证明这个归约。
- 构建一个比较测试工具，它读取捕获下来的工具输出，并报告在指令起点、块、边和函数起点上的一致情况。
- 依据捕获下来的证据，说出每个工具在哪里凭空造出代码、漏掉代码或停在一次间接跳转处。

## 问题所在

你让一个智能体总结三个逆向工程工具对 `ledger-x86_64-O1.o` 中 `grade` 的说法。智能体运行每个工具、读三份清单，并报告说该函数在一个工具里位于 `0x08000050`、在另一个里位于 `0x400010`、在第三个里位于 `0x100010`。它得出结论说工具们对函数在哪里有分歧。

工具们是一致的。这个目标文件是可重定位的，没有加载地址，所以每个工具自己挑一个。减去每个工具给 `.text` 的地址，每个答案都是 `0x10`。智能体比较的是原始地址，因为没有任何东西告诉它在每个工具里这个地址意味着什么。

稍后同一个智能体读了 `-O0` 构建里的 `grade`，并报告来自四个工具的 3、8、8 和 9 个基本块。四个数字都是真的。一个工具停在了 `jmp rax`。两个工具通过重定位读了跳转表。一个工具在跳转处把一个块拆开以放置一个标签。一个没有背后理由的块计数，是一个没有声明的数字。

本课就是你信任那些数字之前所需的地图。第 32 到 36 课构建了一个解码器、一个提升器、一条证据记录和一次重建。本轨道的后半部分把它们放到人们实际使用的工具旁边。要做到这一点，你需要这个领域的历史、工具所属的家族、每个反编译器都要运行的流水线，以及一个在你自己编译的目标文件上比较各工具说法的测试工具。

```figure
re-37-field-map
```

## 五十三年，以注明日期的步骤呈现

这个领域比它大多数工具都要古老。下面每个日期在延伸阅读中都有一份一手来源。

### 1973 到 1991：先有调试器，再有反汇编器

最早的反编译博士论文出自 1973 年。斯坦福的 Hollander 和普渡的 Housel 写了它们，而今天两者都因被引用而为人所知。那个时期的实用工具是调试器。Maranzano 和 Bourne 于 1977 年在贝尔实验室写了 `adb` 教程，这个调试器于 1979 年随 UNIX V7 发布。Tim Paterson 的 `DEBUG`，带有一个 8086 反汇编器，于 1981 年 8 月随 PC-DOS 1.00 发布。Richard Stallman 的 GDB 于 1986 年进入分发。SoftICE 于 1987 年把一个内核调试器放到了 DOS 之下。

批处理反汇编器紧随其后。来自 V Communications 的 Sourcer（1988 年）对一个 DOS 程序多次扫描，并写出一份带注释的清单。GNU binutils 始于 1988 年未编号的快照，而 `objdump` 带有 1990 年的版权。Ilfak Guilfanov 于 1991 年 1 月写下 IDA 的第一行，并于 1991 年 5 月 20 日以共享软件形式发布 IDA 0.1。

### 1991 到 2009：交互式反汇编器与最早的反编译器

Cristina Cifuentes 于 1994 年 7 月在 QUT 完成了《Reverse Compilation Techniques》。她的反编译器 `dcc` 把 i80286 DOS 程序转成 C，而她 1995 年与 Gough 合写的论文确立了后来每个反编译器都保留的那些阶段。REC 于 1997 年出现，Boomerang 于 2002 年出现——后者是第一个开源反编译器，采用 BSD 许可证。

IDA 于 1996 年在 DataRescue 成为商业产品，于 1999 年获得插件 SDK，并转移到 2005 年成立的 Hex-Rays。Hex-Rays Decompiler 1.0 于 2007 年 9 月 17 日发布。同年，Mike Van Emmerik 提交了《Static Single Assignment for Decompilation》，这篇论文把静态单赋值（SSA）放到了反编译器数据流的中心。Halvar Flake 的《Structural Comparison of Executable Objects》（2004 年）开创了差异比对家族，而 BinDiff 于 2004 年 8 月开售。

radare 于 2006 年 2 月作为一个带 64 位偏移的取证十六进制编辑器起步。radare2，即采用 LGPL-3.0 的模块化重写版本，于 2009 年 3 月 7 日首次发布。

### 2009 到 2019：框架与中间表示

LLDB 于 2010 年 6 月 8 日被宣布为一个 LLVM 子项目。BAP，即带有其 BIL 中间语言的 Binary Analysis Platform，于 CAV 2011 亮相。Google 于 2011 年 3 月 1 日收购了 BinDiff 的制造者 zynamics。Hopper 于 2011 年底前后在 Mac App Store 出现。Matt Godbolt 于 2012 年创建了 Compiler Explorer，好让 C++ 程序员看到编译器产生的汇编。

angr 于 2013 年 8 月收到了它的第一行代码。Phoenix 论文（Schwartz、Lee、Woo、Brumley，USENIX Security 2013）展示了保持语义的结构化，在 8676 个函数上只用了 40 条 `goto` 语句。DREAM（Yakdan 等人，NDSS 2015）用与模式无关的结构化移除了那些 `goto` 语句。Vector 35 于 2015 年 1 月 14 日成立，Binary Ninja 于 2016 年 7 月 23 日开售，带有它的 Low Level IL 和一个 Python API。angr 于 2015 年公开发布，并于 2016 年 8 月在 DARPA Cyber Grand Challenge 中获得第三名。BinDiff 于 2016 年 3 月变为免费。Cutter 1.0 于 2017 年 12 月给了 radare2 一个 Qt GUI。2018 年，Guilfanov 在 Recon 上做了《Decompiler internals: microcode》报告，这是对 Hex-Rays IR 的首次公开描述。

### 2019 到 2026：开源反编译器与研究转向

Ghidra 9.0 由 NSA 于 2019 年 3 月 5 日在 RSA 大会上以 Apache-2.0 发布，一个月后全部源码上了 GitHub。angr 8.19.2.4 在同年加入了一个初步的反编译器。Binary Ninja 2.0 于 2020 年 5 月 20 日发布了它的 High Level IL 反编译器。Rizin 于 2020 年 12 月 8 日被宣布为 radare2 的一个 fork，Cutter 团队转移到了它。IDA Freeware 7.6 于 2021 年 5 月加入了一个云端 x64 反编译器。

BinDiff 8 于 2023 年 9 月 25 日以 Apache-2.0 开源。SAILR（Basque 等人，USENIX Security 2024）成为 angr 的默认结构化器，并主张只应移除伪 `goto` 语句，因为 Linux 6.1 的源码里有 3754 条。Binary Ninja 4.0 于 2024 年 2 月加入了一个 Free 版，IDA 9.0 加入了用于无头运行的 `idalib`。学习式反编译器的论文从 SLaDe（2023）到 LLM4Decompile（2024）到 DecompileBench（2025），再到 2026 年关于智能体辅助可读性以及关于“重新编译更多、保留更少”的反编译器的两项研究。

本课运行的版本是 2026 年 10 月 14 日的当前版本：Ghidra 12.1.4（2026 年 9 月 21 日）、radare2 6.2.4（2026 年 10 月 5 日）、rizin 0.9.1（2026 年 6 月 29 日）和 angr 10.0.3（2026 年 10 月 10 日）。Binary Ninja 6.0“Krypton”（2026 年 9 月 3 日）和 IDA 9.4（2026 年 7 月 13 日）是当前的闭源工具。本课没有运行它们。

## 工具家族

一个工具凭它产出的东西归入某个家族。这些家族在一个程序里相互重叠，而大多数混淆正是从这种重叠开始。

### 反汇编器

线性扫描从一个代码节的第一个字节解码到最后一个字节。GNU `objdump -d` 和 `llvm-objdump -d` 就是这样工作的，两者都不构建控制流图。GNU `objdump` 把符号当作指令边界，并在它们之间扫描。binutils 2.47（2026 年 7 月 26 日）采用 GPL-3.0-or-later。LLVM 23.1.3 采用带 LLVM 例外的 Apache-2.0。Apple 的命令行工具把 `llvm-objdump` 作为“Apple LLVM version 17.0.0”发布，而那正是本课所捕获的那份。

交互式反汇编器从已知入口运行递归下降，为函数起点加上启发式方法，并维护一个数据库。IDA Pro（处理器模块、自动分析队列、FLIRT 签名）、Ghidra（`Disassembler` 加 Auto Analysis 分析器）、Binary Ninja（递归下降，然后对未知区域做线性扫描）、Hopper、radare2 和 rizin（`aa`、`aaa`、`af`，以 Cutter 和 iaito 作为 GUI），全都在这个家族里。Andriesse 等人（USENIX Security 2016）在编译器生成的二进制文件上测量了其中九个。指令准确率接近 100%，而最难的原语是函数起点，假阴性率达到 20% 或更高。

### 反编译器

商业反编译器：Hex-Rays Decompiler（从 x86 到 RISC-V 的十二个目标家族）、Binary Ninja 的 HLIL 及其 Pseudo C 渲染，以及 Hopper 的伪代码视图。开源反编译器：Ghidra 反编译器，一个采用 Apache-2.0 的 C++ 引擎，r2ghidra 和 rz-ghidra 把它作为插件复用，pypcode 把它作为提升器复用；基于 AIL、采用 BSD-2-Clause、带 SAILR 结构化的 angr 反编译器；用 JavaScript 写的 r2dec 和 jsdec；作为历史的 Boomerang 和 `dcc`。radare2 还有一个内建的 `pdc`，即“类 C 语法的伪反汇编输出”。rizin 没有内建反编译器。命令 `pdc` 在 rizin 0.9.1 中不存在，而 `pdg` 需要 rz-ghidra 插件。

### 调试器

GDB（1986）带有 GEF 和 pwndbg 前端、LLDB（2010）、带有时间旅行调试（Time Travel Debugging）的 WinDbg（2017）、OllyDbg（2014 年冻结）、x64dbg（GPL-3.0，2014）、带有其 Python 连接器的 Ghidra Debugger、Binary Ninja 调试器，以及 radare2 和 rizin 的内建调试器。第 42 课在你自己的构建上使用其中两个。

### 二进制分析框架

angr（VEX IR、符号执行、`CFGFast` 和 `CFGEmulated`、反编译器）、BAP（BIL，OCaml）、Dyninst、Jakstab 和 ByteWeight 是 Andriesse 点名的框架。Ghidra 通过 PyGhidra 作为一个库，Binary Ninja 通过 `import binaryninja`，而 IDA 通过 `idalib`。

### 格式与引擎库

LIEF 1.0.0（2026 年 7 月 12 日，Apache-2.0）解析 ELF、PE、Mach-O、COFF 和 Android 格式。CLE，即“CLE Loads Everything”，是 angr 的加载器。Capstone 5.0.9（2026 年 5 月 28 日，BSD-3-Clause）做解码；Keystone 0.9.2（GPL-2.0）做汇编；Unicorn 2.1.4（GPL-2.0）做仿真。radare2 6.2.4 捆绑了 Capstone 5，而 rizin 0.9.1 内置了 Capstone、Zydis 和 tree-sitter。

### 差异比对工具与编译器侧查看器

BinDiff 8（Apache-2.0）及其面向 IDA Pro、Binary Ninja 和 Ghidra 的 BinExport 12 插件；作为 IDA 插件的 Diaphora 3.4.3（2026 年 10 月 11 日，AGPL-3.0）；`radiff2` 和 `rz-diff`。Compiler Explorer（BSD-2-Clause）显示编译器为一段源码片段发出的汇编，这是这份清单里其他一切的正向方向。第 44 课使用差异比对家族。

### 版本、许可证，以及本课运行了什么

| 工具 | 2026-10-14 读取到的版本 | 许可证 | 无头入口 | 在此运行 |
|---|---|---|---|---|
| Ghidra | 12.1.4 | Apache-2.0 | `analyzeHeadless`、`pyghidra.start()` | 是，在全部四个目标文件上 |
| radare2 | 6.2.4 | LGPL-3.0 | `r2 -qc '<cmds>' file`、`rabin2` | 是 |
| rizin | 0.9.1 | LGPL-3.0 | `rizin -qc '<cmds>' file`、`rz-bin` | 是 |
| angr | 10.0.3 | BSD-2-Clause | Python 中的 `angr.Project` | 是 |
| llvm-objdump | Apple LLVM 17.0.0 | 带 LLVM 例外的 Apache-2.0 | `llvm-objdump -d -r` | 是 |
| Binary Ninja | 6.0 "Krypton" | 商业；非商业用途有 Free 版 | 带 Commercial、Ultimate 或无头许可证的 `binaryninja.load()` | 否，仅文档 |
| IDA Pro | 9.4 | 商业订阅；非商业 x86 和 x86-64 有 IDA Free | `idat`、`ida -A -S`、`idalib` | 否，仅文档 |
| Hopper | 6.6.0 | 商业，永久授权 | 无文档记录 | 否，仅文档 |
| Cutter | 2.5.0 | GPL-3.0 | rizin 之上的 GUI | 否 |

Binary Ninja 的 Free 版只反编译 x86、x86-64、ARMv7 和 AArch64，并且没有 API。IDA Free 没有 IDAPython、没有 SDK、也没有 `idalib`，而且它的反编译器在云端运行。本课中关于那两个工具的每句话都来自它们的文档和发布说明，图示把它们标为未运行。

## 反编译器流水线，逐阶段剖析

Cifuentes 在 1994 年命名了这些阶段：语法分析、语义分析、中间代码生成、控制流图生成、数据流分析、控制流分析和代码生成。她把它们分成一个机器相关的前端、一个与机器和语言无关的中间部分，以及一个语言相关的后端。此后每个反编译器都保留了那个形状，并给各部分改了名。下表给出本课使用的八个阶段，以及每个工具对它们的称呼。图示展示的是同一张表，其中工具列可以选择。

| 阶段 | Ghidra | Binary Ninja | Hex-Rays / IDA | radare2 | rizin | angr |
|---|---|---|---|---|---|---|
| 加载器 | `ElfLoader`、`MachoLoader`、`PeLoader`；`.ldefs` 挑选语言 | `BinaryView`、`BinaryViewType` | 加载器模块（`LDSC`） | RBin（`rabin2`） | RzBin（`rz-bin`） | CLE（`cle.Loader`、`main_object`） |
| 反汇编 | `Disassembler`；SLEIGH `.slaspec` 编译为 `.sla`；分析器 "Disassemble Entry Points"、"Function Start Search" | 体系结构插件；递归下降，然后线性扫描各阶段 | 处理器模块（`ana.cpp`、`emu.cpp`、`out.cpp`）；自动分析队列；FLIRT | RArch 插件到 `RAnalOp`；`aa`、`aaa`、`af` | RzAnalysis 插件；`aa`、`aaa`、`af` | Capstone 块；`CFGFast` 函数起点搜索 |
| CFG 恢复 | "Generate Basic Blocks and the CFG"；`BlockGraph`；"Decompiler Switch Analysis" | `Function`、`BasicBlock`；"Control Flow Graph (CFG) Analysis" 阶段 | `mbl_graph_t`，在 `MMAT_LOCOPT` 就绪 | `afb`、`agf`、`aab` | `afb`、`agf`、`aab`（Nucleus） | `CFGFast`、`CFGEmulated`；`kb.functions`；IRSB |
| 提升 | "Generate Raw P-code"；`ram`、`register`、`const`、`unique` 空间中的 Varnode | Lifted IL、LLIL、Mapped MLIL、MLIL | microcode（`minsn_t`、`mop_t`）；`MMAT_GENERATED` | ESIL（`asm.esil`、`ae`） | RzIL（`aoi`、`aez`） | VEX（`pyvex.lift`、IRSB），然后 AIL |
| SSA | `Heritage`、`ActionHeritage`；`MULTIEQUAL`、`INDIRECT` | LLIL SSA、MLIL SSA、HLIL SSA；`HLIL_VAR_PHI` | 没有命名的 SSA；在 `MMAT_GLBOPT1` 到 `3` 做 use-def 数据流 | 无；ESIL 为仿真而建 | 无；RzIL 为仿真而建 | `_stage_transform_to_ssa_level0` 和 `level1`；`SeqNodeDephication` |
| 数据流与类型 | `ActionDeadCode`、`ActionInferTypes`、`Rule` 池；原型来自 `.cspec` | MLIL 常量传播、变量与类型；`analyzeReturns` | "Transform microcode"；`MMAT_CALLS`、`MMAT_GLBOPT`、`MMAT_LVARS`；TIL | `afv`、`afc`、`aaft`；ESIL 仿真 | `afv`、`afc`、`aft` | `CallingConventionAnalysis`、`VariableRecoveryFast`、`Typehoon` |
| 结构化 | `CollapseStructure`；`BlockIf`、`BlockWhileDo`、`BlockSwitch`、`BlockGoto` | `HLIL_IF`、`HLIL_WHILE`、`HLIL_SWITCH`；`root` 处的 AST | "Generate ctree"；结构分析；goto 区域 | `pdc`；`pdd`（r2dec）；`pdg`（r2ghidra） | `pdg`（rz-ghidra）；jsdec | `RegionIdentifier`；带 `SAILRStructurer` 的 `RecursiveStructurer` |
| 输出 | "Emit Final C Tokens"；`PrintC`、`ActionNameVars`、`ActionSetCasts` | HLIL 渲染；Pseudo C、Pseudo Rust、Pseudo Python | "Beautify ctree; Print ctree"；`cfunc_t` | `pdc`、`pdd`、`pdg` 的文本 | `pdg` 文本 | `CStructuredCodeGenerator`；`codegen.text` |

### 加载器

加载器解析容器、映射节、读取符号和重定位。在一个可重定位目标文件里还没有任何东西有地址，所以加载器挑一个。radare2 和 rizin 把文件映射到 `0x08000000`，这让 `.text` 落在 `0x08000040`，因为该节从文件偏移 `0x40` 开始。CLE 把 `.text` 放到 `0x400000`。Ghidra 的 `ElfLoader` 把它放到 `0x100000`。`llvm-objdump` 打印节偏移，而完全没有基准。

加载器们在重定位上也不同。Ghidra 在导入时处理它们，而 CLE 应用它们。radare2 在打开目标文件时打印一条提示：重定位未被应用，而 `bin.relocs.apply=true` 会改变这一点。加载器对重定位做了什么，决定了此后每个阶段能看到什么，你会在下面 `-O0` 的跳转表里遇到这个效应。

### 反汇编

第 33 课构建了这两种方法。表中除 `llvm-objdump` 外的每个工具都运行递归下降，然后加上一次对函数起点的搜索。Binary Ninja 的文档按顺序命名这些阶段：递归下降、调用目标分析、作为“对未知区域的线性反汇编”的 CFG 分析，以及尾调用分析。Ghidra 按优先级运行它的分析器，其中 "Disassemble Entry Points" 和 "Function Start Search" 较早。IDA 维护自动分析队列，每个都带一个优先级，并为库代码提供 FLIRT 签名。angr 的 `CFGFast` 记录了四种函数起点来源：符号、一次序言扫描、调用目标，以及对剩余字节的一次完整扫描。最后那个来源正是 angr 在填充处凭空造出函数的地方。

### CFG 恢复

每个工具都像第 33 课那样切分块，只有一处差别你会测量到。angr 在一个 `call` 处结束一个块，因为它的 IRSB 是单入口、多出口的块，而调用是一个出口。Ghidra、radare2 和 rizin 则穿过一个调用。在 `-O0` 下调用 `grade` 的 `grade_label` 上，angr 报告 2 个块，而其他三个报告 1 个。指令是一样的。

### 提升

Binary Ninja 把提升定义为“从一种较低级语言翻译到一种被认为更高级的中间语言”。这些 IR 在用途上不同。P-code 和 VEX 是为分析和反编译而建的。ESIL 和 RzIL 是为仿真而建的，两者都没有 SSA 阶段。Hex-Rays microcode 起初是一种带 72 个操作码的类 RISC 代码，并经过从 `MMAT_GENERATED` 到 `MMAT_LVARS` 的成熟度级别。Binary Ninja 提升到 Lifted IL，然后在 LLIL 中把标志折叠进条件，而 MLIL“把寄存器和内存访问翻译为变量”。下一节把其中四个 IR 并排放在一条指令上。

### SSA

Van Emmerik 的论文列出了 SSA 为反编译器带来的东西：表达式传播、不假设 ABI 的参数和返回识别、保留分析、作为稀疏数据流问题的类型分析，以及间接跳转和调用的分析。Ghidra 把它的 SSA 构造称为 `Heritage`，并加上两个只存在于图中的操作：用于 phi 的 `MULTIEQUAL`，以及用于副作用的 `INDIRECT`。Binary Ninja 在每个 IL 级别都暴露一种 SSA 形式。angr 在 `Clinic` 内部有两个 SSA 阶段。Hex-Rays 不命名 SSA 形式，而在它的全局优化遍里做 use-def 数据流。ESIL 和 RzIL 都没有。

### 数据流与类型

Ghidra 的主简化循环运行 "Eliminate Dead Code"、"Propagate Local Types" 和 "Perform Term Rewriting"，直到没有东西再变化，其中改写由一个 `Rule` 对象池完成。Hex-Rays 变换 microcode，在 `MMAT_CALLS` 检测调用参数，并在 `MMAT_LVARS` 分配局部变量。angr 运行 `CallingConventionAnalysis`、`VariableRecoveryFast` 和 `Typehoon`——后者是 Noonan、Loginov 和 Cok 的多态类型推断的一个实现。第 41 课讲的是这个阶段。

### 结构化

Ghidra 的 `CollapseStructure` 搜索匹配某个结构的子图，把它们折叠成一个节点，而当它卡住时就移除一条边并把它标为未结构化。Hex-Rays 把 CFG 归约为 `if`、`while`、`do` 和 `switch`，并把其余部分留作 goto 区域。angr 识别单入口、单出口的区域，并默认用 `SAILRStructurer` 结构化它们，而 `PhoenixStructurer` 和 `DreamStructurer` 作为备选。第 34 课手写了一个结构化器。

### 输出

Ghidra 在 `ActionNameVars` 和 `ActionSetCasts` 之后，通过 `PrintC` 用一个 Oppen 美观打印器发出 C 记号。Hex-Rays 美化并打印 ctree。Binary Ninja 把 HLIL 渲染为 Pseudo C、Pseudo Rust 或 Pseudo Python。angr 返回 `codegen.text`。radare2 打印 `pdc`、`pdd` 或 `pdg`。

## 一条指令，四种 IR

取 `48 83 ec 10`，即 `subq $0x10, %rsp`。用第 33 课的规则在纸上解码它。

1. `48` 是 `W = 1` 的 REX。操作数是 64 位。
2. `83` 是带 8 位立即数的 group-1 算术操作码。ModRM 的 reg 字段挑选运算。
3. `ec` 是 ModRM `11 101 100`。`mod = 11` 是寄存器形式。`reg = 101` 是 `/5`，即 `sub`。`r/m = 100` 是 `%rsp`。
4. `10` 是立即数，16。

那四个字节被交给了四个提升器。测试夹具里保存着确切的命令和完整的文本。

来自 radare2 6.2.4 的 ESIL 是一个含 30 个记号、用逗号分隔的字符串：

```text
16,0x8000000000000000,-,!,16,rsp,-=,63,$o,^,of,:=,63,$s,sf,:=,$z,zf,:=,$p,pf,:=,64,$b,cf,:=,4,$b,af,:=
```

它是一台栈机。`16,rsp,-=` 就地相减。然后每个标志都用一个内部运算符写入：`$o` 溢出、`$s` 符号、`$z` 零、`$p` 奇偶、`$b` 借位。

来自 rizin 0.9.1 的 RzIL 是一个带 14 个 `set` 效应的 S 表达式：

```text
(seq (set op1 (var rsp)) (set op2 (bv 64 0x10)) (set sub (- (var op1) (var op2))) (set rsp (var sub))
     (set _result (var sub)) (set pf (! (lsb (let _val (cast 8 false (var _result)) ...))))
     (set zf (is_zero (var _result))) (set sf (msb (var _result))) ... (set cf (|| ...)) (set of (|| ...)) (set af (|| ...)))
```

每个标志都是比特向量上的一个布尔表达式。单单奇偶标志就是一个四层的 `let`。

来自 SLEIGH 规格 `x86:LE:64:default`、经 pypcode 4.0.1 的 P-code，在 `IMARK` 之后是九个操作：

```text
CF = RSP < 0x10
OF = sborrow(RSP, 0x10)
RSP = RSP - 0x10
SF = RSP s< 0x0
ZF = RSP == 0x0
unique[58300:8] = RSP & 0xff
unique[58400:1] = popcount(unique[58300:8])
unique[58500:1] = unique[58400:1] & 0x1
PF = unique[58500:1] == 0x0
```

寄存器传送，临时量放在 `unique` 空间。这些标志在指令处急切地计算，而 `CF` 和 `OF` 在减法覆盖 `RSP` 之前就被算出。

来自 pyvex 10.0.3 的 VEX，在 `IMark` 之后是七个语句：

```text
t2 = GET:I64(offset=48)
t0 = Sub64(t2,0x0000000000000010)
PUT(offset=144) = 0x0000000000000008
PUT(offset=152) = t2
PUT(offset=160) = 0x0000000000000010
PUT(offset=168) = 0x0000000000000000
PUT(offset=48) = t0
```

没有任何标志出现。VEX 以寄存器在 guest 状态中的偏移来命名它们，而偏移 48 是 `rsp`。偏移 144 到 168 是 `cc_op`、`cc_dep1`、`cc_dep2` 和 `cc_ndep`。提升器存入操作码 8，即 64 位减法，以及那两个操作数。一个稍后读取某个标志的分支会从这个 thunk 计算它。这就是为什么测试工具报告里 `pcode.writesFlags` 为真而 `vex.computesFlags` 为假，也是为什么 VEX 是四者中最短的。

同样这四个提升器作用在 `48 63 c7`，即 `movslq %edi, %rax`——`-O1` 下 `grade` 的第一条指令——给出 5 个 ESIL 记号（`32,edi,~,rax,=`）、1 个 RzIL `set`、1 个 P-code 操作（`RAX = sext(EDI)`）和 4 个 VEX 语句。没有提升器写标志，因为这条指令没有标志。Ghidra 自己通过无头脚本捕获到的对那条指令的清单，把同一个操作打印为 `(register, 0x0, 8) INT_SEXT (register, 0x38, 4)`：寄存器偏移 0 是 `RAX`，偏移 `0x38` 是 `RDI`，而大小是 8 和 4 字节。

`83 f9 04`，即 `cmpl $0x4, %ecx`，来自 `grade` 中的边界检查，给出 30 个 ESIL 记号、13 个 RzIL `set` 效应、10 个 P-code 操作和 7 个带 `cc_op` 7（32 位减法）的 VEX 语句。没有任何东西写 `%ecx`。你会在 VEX 中遇到的两种减法宽度是：32 位为 7，64 位为 8，而你构建的那个翻译器带着那张表。

## 一个函数的四种地址基准

在测试工具能比较任何东西之前，它必须先对函数在哪里与自己达成一致。为 `ledger-x86_64-O1.o` 中的 `grade` 手动做一次这个算术。

| 工具 | `.text` 的地址 | `grade` 的地址 | 偏移 |
|---|---|---|---|
| `llvm-objdump` | `0x0` | `0x10` | `0x10 - 0x0 = 0x10` |
| radare2、rizin | `0x08000040` | `0x08000050` | `0x08000050 - 0x08000040 = 0x10` |
| angr | `0x400000` | `0x400010` | `0x400010 - 0x400000 = 0x10` |
| Ghidra | `0x100000` | `0x100010` | `0x100010 - 0x100000 = 0x10` |

符号表说 `grade` 位于 `.text + 0x10`，大小 46。一旦去掉基准，每个工具都一致。测试工具从每份捕获读取基准：radare2 和 rizin 用 `iSj`，angr 捕获里用 `.text` 节条目，Ghidra 捕获里用 `.text` 内存块，而线性扫描用零。测试 `test_every_tool_places_grade_at_offset_0x10_from_its_own_base` 固定了这个事实。

## 工具在哪里一致，在哪里分道扬镳

`code/main.py` 中的测试工具读取各份捕获、归约每个地址并比较。下面是它报告的数字，而各个测试断言其中每一个。

### 一致的情形：-O1 下的 ledger

四个函数，线性扫描里 56 条指令，符号内 54 条、填充里 2 条。每个工具在每个函数里都报告相同的指令起点：9、14、13 和 18。四个图构建器报告 3、3、5 和 4 个块以及 2、3、5 和 4 条边，而边集合在 radare2、rizin、angr 和 Ghidra 之间逐对完全相同。`total` 的五个块和五条边，正是第 33 课手绘的那些。

唯一的差别在填充处。函数之间的 3 个字节（`grade` 之后的 `66 90`，`total` 之后的 `90`）被线性扫描解码——它没有理由停下，也被 angr 解码——它造出了没有符号的 `sub_40003e` 和 `sub_40005f`。radare2、rizin 和 Ghidra 一个都不认领。

### 向量化的情形：-O2 下的 ledger

在四个图构建器中的每一个里，`total` 都是 41 条指令、10 个块、13 条边。来自第 33 课的 SSE2 循环和标量余数循环在每一处都被同样地切分。angr 再次在填充处加了两个函数。

### 跳转表：-O0 下的 grade

这里工具分道扬镳，而这个分叉正是本课要讲的。

| 工具 | 块 | 边 | 捕获说了什么 |
|---|---|---|---|
| radare2 | 3 | 2 | `0x62` 处的块没有后继；字节 `0x76` 到 `0x9a` 永远到不了；缺 8 个指令起点 |
| rizin | 8 | 11 | `0x62` 处的块带一个 `switch_op`，有 5 个 case 和 4 个不同目标 |
| angr | 8 | 7 | 这些 case 块存在，而 `0x62` 处的转移走向一个无法解析的目标节点 |
| Ghidra | 9 | 12 | `0x74` 处的 `switchD` 标签把块拆开；四个 `COMPUTED_JUMP` 流到 `0x76`、`0x7f`、`0x88`、`0x91` |

四个工具在到达时都解码了相同的 33 条指令。radare2 停在 `jmp rax`，留下 36 个字节未认领，而测试工具把那个范围命名为漏掉的代码。rizin 和 Ghidra 找到了第 33 课从 `.rela.rodata` 里五个重定位读出的那四个不同目标。angr 在 `grade` 内部列出了这些 case 块，却仍然没有从跳转块到它们的边；它的捕获把 `0x62` 处的转移记录为导向一个无法解析的目标节点，而它的反编译器打印了一个计算出的 `goto`。Ghidra 对同一套控制流比 rizin 多一个块、多一条边，因为它的 switch 分析在 `jmp rax` 上放了一个标签，而块模型在一个标签处开始一个新块。

第 33 课的图有 8 个块和 11 条边。rizin 与它完全相符。要点在于看清：9、11、7 和 2 并不是对“找到了多少代码”的四次测量。它们是对“一个工具把一次间接跳转跟踪到了多远、以及它选择在哪里切开”的四个答案。

### 代码中的数据：sweep-trap

`lookup` 是 24 个字节，在 `0x10` 处有 4 个表字节 `31 c0 90 48`。线性扫描在那个范围内报告 8 个指令起点。测试工具列出它与多数派的差别：在 `0x10`、`0x12` 和 `0x13` 处多出起点，而在 `0x14` 处缺一个起点。那是第 33 课的 `addq $0x1, %rax` 提前了一个字节。radare2、rizin 和 Ghidra 报告 6 个起点、2 个块、1 条边，并把 `0x10` 到 `0x14` 留作未认领。angr 为 `lookup` 报告相同的 2 个块和 1 条边，然后在那些表字节上凭空造出 `sub_400010`：在一个结束于 `0x14` 的 4 字节块里有 2 条指令，而 `lookup` 的第二个块正从 `0x14` 开始，所以 `0x13` 处的 REX 字节不属于任何指令。测试工具对这个目标文件的最后一条发现是：没有图构建器解码 `0x10` 到 `0x14`，所以那些字节位于一个函数之内，是数据。

### 逐工具的凭空造出与漏掉

在这四个目标文件上，测试工具点名了 angr 无符号地凭空造出的 9 个函数，每一个都在填充处或陷阱表上。它点名了 radare2 漏掉的一个范围，即 `-O0` 下 `grade` 的 36 个 case 字节。它点名了 9 个范围——线性扫描解码了它们而没有图构建器把它们当作代码：八处填充间隙加陷阱表。它没有在任何工具里点名一个漏掉的函数。

## 三个反编译器处理 grade

捕获到的工具里有三个为 `-O1` 下的 `grade` 发出类 C 文本。源码是带五个 case 的 `switch (score / 10)`，编译成一次边界检查和一张返回值表。

Ghidra 12.1.4：

```c
uint grade(int param_1)
{
  uint uVar1;
  uint uVar2;

  uVar2 = param_1 / 10 - 6;
  uVar1 = -(param_1 >> 0x1f) ^ (uint)((ulong)((long)param_1 * 0x66666667) >> 0x3f);
  if (uVar2 < 5) {
    uVar1 = *(uint *)(&DAT_001000b4 + (ulong)uVar2 * 4);
  }
  return uVar1;
}
```

angr 10.0.3：

```c
extern unsigned int g_4000b4[4];

unsigned int grade(int a0)
{
    unsigned int v1;  // ecx
    unsigned int v2;  // eax

    v1 = (unsigned int)((long long)(a0 * 1717986919) >> 0x22) + (unsigned int)(a0 * 1717986919 >> 63) - 6;
    v2 = 0;
    if (v1 <= 4)
        v2 = g_4000b4[v1];
    return v2;
}
```

radare2 6.2.4，`pdc`：

```c
void sym.grade (int64_t arg1) {
    rax = edi
    rax = rax * 0x66666667
    rcx = rax
    rcx >>= 0x22
    rax >>>= 0x3f
    ecx += eax
    ecx += 0xfffffffa
    eax = 0
    v = ecx - 4
    if (((unsigned) v) <= 0) {
        eax = ecx
        rcx = rip
        eax = dword [rcx + rax*4]
    }
    return
}
```

对照流水线来读这三个。Ghidra 的项重写把乘以 `0x66666667` 和移位 34 折叠回 `param_1 / 10`，也就是第 34 课的那个惯用法。angr 提升了相同的字节，却把算术留作 `a0 * 1717986919 >> 0x22`。radare2 的 `pdc` 是 ESIL 仿真加伪语法：寄存器名、没有变量、没有类型，而边界检查在一次无符号减法之后打印为 `<= 0`。Ghidra 通过 `DAT_001000b4` 给表加载定了类型；angr 声明了 `g_4000b4[4]`，四个元素，而源码里有五个。Ghidra 和 angr 都没有恢复出 case 的枚举，因为在 `-O1` 下字节里已经没有 switch 了。在 `-O0` 下，跳转表存在，Ghidra 打印了带 case 6 到 10 和一个 default 的 `switch(param_1 / 10)`，而 angr 打印了一个计算出的 `goto`。

rizin 没有自己的反编译器，捕获记录了 `pdc` 在那里不存在。Binary Ninja 的 HLIL 和 Hex-Rays 的 ctree 是本课无法捕获的两个输出。

## 构建它

运行演示：

```bash
cd phases/13-tools-and-protocols/37-the-reverse-engineering-landscape
python3 code/main.py
```

输出是一份 JSON 报告。它以捕获时记录的工具版本开头，并附上你机器上存在的工具，这些可能全都不存在。然后对四个目标文件中的每一个，它给出符号范围、填充间隙、每个工具使用的基准、每个工具找到或凭空造出的函数起点，以及对每个函数的指令起点一致情况、块计数、边计数和每个工具缺少的边。它以每个工具的字节核算、各工具自己的说明、一份用平白句子写成的发现列表，以及 IR 一节收尾——该节把翻译器对三条指令的输出，放在从捕获提升里测得的计数旁边。

预期形状：

```json
{
  "captureTools": {"llvm-objdump": "Apple LLVM version 17.0.0", "radare2": "radare2 6.2.4 ...", "rizin": "rizin 0.9.1 ...", "angr": "10.0.3", "ghidra": "12.1.4"},
  "localTools": {"radare2": "absent", "...": "..."},
  "fixtures": {
    "ledger-x86_64-O0.o": {
      "bases": {"llvm-objdump": "0x0", "radare2": "0x8000040", "angr": "0x400000", "ghidra": "0x100000", "...": "..."},
      "functions": {"grade": {"blocks": {"radare2": 3, "rizin": 8, "angr": 8, "ghidra": 9}, "edges": {"radare2": 2, "rizin": 11, "angr": 7, "ghidra": 12}, "...": "..."}},
      "findings": ["radare2 never reaches bytes 0x76-0x9a inside grade that the other graph builders decode", "..."]
    }
  },
  "ir": {"translator": [{"text": "subq $0x10, %rsp", "flags": {"pcodeLike": "eager", "vexLike": "thunk"}, "...": "..."}], "observed": {"...": "..."}}
}
```

按这个顺序阅读 `code/main.py`：

1. `read_text_symbols()` 读取节头和 `.text` 的 `STT_FUNC` 符号。符号表是测试工具拥有的唯一真值，而 `TextSection.gaps()` 从它推导出填充。
2. `parse_objdump()`、`parse_r2_family()`、`parse_angr()` 和 `parse_ghidra()` 各自把一份捕获变成一个 `ToolView`：一个基准、以偏移到长度表示的指令，以及每个函数一个带块、边和任何反编译文本的 `FunctionView`。每个解析器只懂一个工具的词汇，别的一概不懂。
3. `majority()` 和 `ranges()` 是每次比较都会用到的两个辅助函数。
4. `function_report()` 把指令起点与图构建器的多数派作比较，然后是块计数，然后是边集合，并列出每个工具缺少什么。
5. `byte_report()` 把每个字节核算为符号内的代码、填充、未认领、凭空造出或漏掉，并点名符号内没有图构建器解码的字节。
6. `findings()` 把这些变成句子，而 `compare()` 为每个目标文件组装一份报告。
7. `decode_small()`、`to_pcode_like()` 和 `to_vex_like()` 是翻译器：寄存器形式下的三种编码、一种急切风格、一种 thunk 风格。
8. `observed_ir()` 测量捕获下来的提升，而 `figure_data()` 组装图示所展示的时间线、阶段表和证据。

还有三个命令。`python3 code/main.py compare FIXTURE.o` 打印一个目标文件的报告。`python3 code/main.py ir 4883ec10` 为一条指令打印翻译器的两种形式。`python3 code/main.py figure-data` 打印图示中嵌入的数据。

这些捕获由 `code/fixtures/capture_tools.py` 一次性制作，它把每个命令和版本都记录在 `captures.json` 里。测试工具和测试从不启动一个工具。如果你有这些工具，运行捕获脚本来刷新这些文件，并阅读测试夹具 README 了解它所需的环境。

## 使用它

按这个顺序在一个新目标文件上使用这个测试工具。

1. 自己构建目标文件，并保留编译器命令。在打开任何工具之前先读它的符号表，这样你就知道有多少个函数以及填充在哪里。
2. 以无头模式把每个工具捕获一次。把原始输出和确切命令存在目标文件旁边。一个你无法重新读到的分歧不是一条发现。
3. 检查基准。挑一个函数，确认在你减去每个工具的 `.text` 地址后，每个工具都把它放到相同的偏移。如果有一个不是，就停下来弄清楚那个工具加载了什么。
4. 先比较指令起点。如果图构建器在这里就有分歧，那么其余比较关乎的是解码而不是分析。
5. 比较块和边，并在你评判一个计数之前先读每个工具的说明。一个 `switch_op`、一个 `COMPUTED_JUMP` 或一个无法解析的目标节点能解释大多数差异。
6. 核算字节。一个工具认领的填充是一种启发式方法在起作用。一个工具留下的符号字节是一次停住的行走。没有图构建器认领的符号字节是数据。
7. 写下你没有运行哪些工具。来自文档的描述是有用的，并且是与一份捕获不同的那种证据。

## 交互实验

### 实验 A：一个函数，四种基准

从 `code` 目录打开 Python：

```bash
cd phases/13-tools-and-protocols/37-the-reverse-engineering-landscape/code
python3 -q
```

运行：

```python
from main import *
views = load_views("ledger-x86_64-O1.o")
{tool: hex(view.base) for tool, view in views.items()}
{tool: hex(view.functions["grade"].start + view.base) for tool, view in views.items()}
```

在你运行第二行之前先把那四个原始地址写下来，并对照本课的表格核对它们。然后把 `grade` 换成 `grade_label`，手动算出它在 Ghidra 里位于何处。

### 实验 B：从四侧看跳转表

```python
report = compare("ledger-x86_64-O0.o")
report["functions"]["grade"]["blocks"]
report["functions"]["grade"]["edgesMissingPerTool"]["radare2"]
report["notes"]["rizin"]
report["notes"]["ghidra"]
report["bytes"]["radare2"]["misses"]
```

数一数 radare2 缺少的边，并把每一条与第 33 课 `-O0` 清单的一行对应起来。然后读 Ghidra 的说明，并在 Ghidra 捕获里找到那个 `switchD` 标签。

### 实验 C：急切标志对阵一个 thunk

```python
translate("48 83 ec 10")["pcodeLike"]
translate("48 83 ec 10")["vexLike"]
translate("83 f9 04")["vexLike"]
{row["name"]: (row["pcode"]["ops"], row["vex"]["statements"]) for row in observed_ir()["instructions"]}
```

在两份输出里找到 `cc_op` 常量，并解释为什么一个是 8 而另一个是 7。然后试试 `translate("48 01 c8")` 并读那个 `TranslateError`。

### 实验 D：五个工具下的陷阱

```python
report = compare("sweep-trap.o")
report["functions"]["lookup"]["instructionStarts"]
report["bytes"]["dataInsideSymbols"]
report["functionStarts"]["angr"]
```

在纸上像线性扫描那样解码字节 `31 c0 90 48 83 c0 01`，然后像递归下降在 `jmp` 之后那样再解码一次。把你的两份清单对应到测试工具报告的那些多出和缺失的起点。

## 实践实验

加入第五份捕获并扩展测试工具。

要求：

- 挑一个本课没有捕获、而你能在自己机器上运行的工具：GNU `objdump`、带 Capstone 的 LIEF、手动导出的 Binary Ninja Free 会话，或者用不同分析器集合的 Ghidra。在全部四个目标文件上捕获它的输出，并把确切命令和版本写进 `captures.json`。
- 写一个解析器，把这份捕获变成一个带该工具基准、指令、函数，以及工具所具有的块和边的 `ToolView`。
- 把该工具加入 `TOOLS`，若它构建图则还加入 `DESCENT_TOOLS`。运行演示，并读一读多数派集合里有什么变化。
- 写一个测试，断言该工具在 `ledger-x86_64-O1.o` 上的块计数，再写一个测试，断言它对陷阱表做了什么。
- 为本课写一段话，用该工具自己的说法，说出它如何称呼加载器、反汇编器和 CFG。

成功意味着 `python3 code/main.py` 在 `captureTools` 里报告这个新工具，`ledger-x86_64-O1.o` 中的每个函数都保持 `allDescentToolsAgree` 为真，而 `sweep-trap.o` 的发现说明了这个新工具对字节 `0x10` 到 `0x14` 做了什么。

## 随课交付物

本课包含 `outputs/skill-the-reverse-engineering-landscape.md`。用它在你构建的一个目标文件上运行若干工具，把它们的地址归约到一个基准，并逐函数报告它们在指令起点、块和边上哪里一致，以及每个工具凭空造出或漏掉了哪些字节。它要求带记录在案命令和版本的捕获、一份从文件读出的符号表，以及一份关于哪些工具仅凭文档描述的声明。

## 验证它

运行演示和这个确定性套件：

```bash
cd phases/13-tools-and-protocols/37-the-reverse-engineering-landscape
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

验证应当证明：

- ELF 读取器在 `ledger-x86_64-O1.o` 中找到四个函数符号，大小为 16、46、31 和 63，以及两处填充间隙
- 四个目标文件的线性扫描捕获分别持有 86、56、84 和 11 条指令
- radare2 和 rizin 在 `ledger-x86_64-O1.o` 上报告相同的指令、块和边，而只有 radare2 有 `pdc` 文本
- angr 把 `sub_40003e` 和 `sub_40005f` 标记为没有符号的函数
- Ghidra 对 `total` 的块是第 33 课的那五个块，而它的调用流不是图的边
- 去掉基准后，每个工具都把 `grade` 放到偏移 `0x10`
- 每个工具在 `ledger-x86_64-O1.o` 的每个函数的每个指令起点上都一致
- 四个图构建器在那里报告 3、3、5、4 个块和 2、3、5、4 条边，且边集合完全相同
- `-O2` 下的 `total` 在每个图构建器里都是 10 个块、13 条边
- `-O0` 下的 `grade` 在 radare2、rizin、angr 和 Ghidra 里分别是 3、8、8、9 个块和 2、11、7、12 条边，原因在每个工具的说明里
- `-O0` 下的 `grade_label` 处处是一个块，只有 angr 例外——它在调用处结束一个块
- angr 每个填充间隙凭空造出一个函数，再加陷阱表上一个，而没有别的工具凭空造出或漏掉一个函数
- 线性扫描在陷阱上多出起点 `0x10`、`0x12`、`0x13` 而丢掉 `0x14`，并且没有图构建器解码 `0x10` 到 `0x14`
- 发现点名了 radare2 中漏掉的范围以及 angr 中每一个凭空造出的函数
- 清单为全部 21 个捕获文件记录了版本和命令
- 三个工具反编译 `grade`，而只有 Ghidra 折叠了那个除法惯用法
- 翻译器以一种风格急切地写 CF、OF、SF、ZF、PF，以另一种风格写一个 `cc_op` thunk，对 `cmp` 不写寄存器，对 `movslq` 不写标志
- 翻译器拒绝内存形式、其他操作码、多余的 REX 位和错误的长度
- 翻译器的 `cc_op` 数 8 和 7 等于捕获的 VEX 里的那些
- 对三条指令，捕获的提升给出 9、1、10 个 P-code 操作和 7、4、7 个 VEX 语句
- 时间线按顺序从 1973 跑到 2026，流水线有八个阶段和六个工具且每个单元格都有一个术语，而那两个闭源工具被标为未运行
- 交互式图示嵌入测试工具产出的同一份数据

## 生产失败模式

| 失败 | 薄弱报告说什么 | 测试工具必须证明什么 |
|---|---|---|
| 来自不同工具的原始地址 | “工具们对 grade 在哪里有分歧” | 去掉每个基准后得到一个偏移，在一个函数上核对过 |
| 把块计数当作找到代码的度量 | “Ghidra 找到的代码最多” | 相同的指令起点，多出的块由一个标签解释 |
| 把一个工具当作判定基准 | “objdump 显示那些表字节是指令” | 线性扫描是一次线性扫描；三个图构建器把这些字节留作未认领 |
| 把填充函数当作发现 | “angr 多找到七个函数” | 每一个都位于填充间隙或数据上，且没有一个有符号 |
| 把一次停住的行走报告为死代码 | “那四个 case 块不可达” | 36 个字节被一个工具漏掉而被三个工具到达 |
| 不带说明就比较边计数 | “rizin 和 Ghidra 在 grade 上有分歧” | 相同的四个计算目标，在一个标签处多出一次拆分 |
| 把一个反编译器的算术当作程序来读 | “这个函数乘以 1717986919” | 第 34 课的惯用法，被一个工具折叠而被另一个留下 |
| 把一个闭源工具当作运行过来描述 | “Binary Ninja 报告五个块” | 图示和表把它标为仅文档 |
| 没有命令的捕获 | “我们运行了 radare2” | 带每个文件版本、命令和日期的清单 |
| 把一个没有标志的 IR 当作有损提升来读 | “VEX 丢了标志” | thunk 在 `cc_op`、`cc_dep1`、`cc_dep2` 里，在分支处求值 |

## 操作规则

把每个工具连同它的命令和版本捕获一次，把每个地址归约到一个基准，并在块之前比较指令起点、在边之前比较块。把每个字节核算为认领的、填充、数据或漏掉。在你评判一个工具的计数之前先读它自己的说明，并说出你只是读到过哪些工具。

## 延伸阅读

- [Cifuentes, "Reverse Compilation Techniques", PhD thesis, QUT (1994)](https://eprints.qut.edu.au/36820/)
- [Cifuentes and Gough, "Decompilation of Binary Programs", Software: Practice and Experience (1995)](https://doi.org/10.1002/spe.4380250706)
- [Van Emmerik, "Static Single Assignment for Decompilation", PhD thesis, University of Queensland (2007)](https://espace.library.uq.edu.au/view/UQ:158682)
- [Schwartz, Lee, Woo, Brumley, "Native x86 Decompilation Using Semantics-Preserving Structural Analysis and Iterative Control-Flow Structuring" (USENIX Security 2013)](https://www.usenix.org/conference/usenixsecurity13/technical-sessions/presentation/schwartz)
- [Yakdan et al., "No More Gotos" (NDSS 2015)](https://www.ndss-symposium.org/ndss2015/ndss-2015-programme/no-more-gotos-decompilation-using-pattern-independent-control-flow-structuring-and-semantics/)
- [Basque et al., "Ahoy SAILR! There is No Need to DREAM of C" (USENIX Security 2024)](https://www.usenix.org/conference/usenixsecurity24/presentation/basque)
- [Andriesse et al., "An In-Depth Analysis of Disassembly on Full-Scale x86/x64 Binaries" (USENIX Security 2016)](https://www.usenix.org/conference/usenixsecurity16/technical-sessions/presentation/andriesse)
- [Flake, "Structural Comparison of Executable Objects" (DIMVA 2004)](https://dl.gi.de/items/7f573931-cb51-49ef-a12c-0452a9fb0ea4)
- [Maranzano and Bourne, "A Tutorial Introduction to ADB", Bell Labs (1977)](http://squoze.net/UNIX/v7/files/doc/18_adb.pdf)
- [Stallman, KTH lecture on GDB entering distribution (30 October 1986)](https://www.gnu.org/philosophy/stallman-kth.html)
- [Hex-Rays, "IDA: celebrating 30 years of binary analysis innovation"](https://hex-rays.com/blog/ida-celebrating-30-years-of-binary-analysis-innovation)
- [Guilfanov, "Decompiler internals: microcode", Recon Brussels 2018 (slides)](https://www.recon.cx/2018/brussels/resources/slides/RECON-BRX-2018-Decompiler-internals-microcode.pdf)
- [Hex-Rays, microcode view and maturity levels](https://docs.hex-rays.com/core/decompiler/how-tos/microcode-view)
- [Hex-Rays, IDA 9.4 release notes](https://docs.hex-rays.com/release-notes/9_4)
- [Hex-Rays, IDA Free](https://hex-rays.com/ida-free)
- [Ghidra releases (12.1.4)](https://github.com/NationalSecurityAgency/ghidra/releases)
- [Ghidra P-code reference](https://github.com/NationalSecurityAgency/ghidra/blob/master/GhidraDocs/languages/html/pcoderef.html)
- [Ghidra decompiler source, main work flow and Action classes](https://github.com/NationalSecurityAgency/ghidra/tree/master/Ghidra/Features/Decompiler/src/decompile/cpp)
- [Ghidra analyzeHeadless README](https://github.com/NationalSecurityAgency/ghidra/blob/master/Ghidra/RuntimeScripts/support/analyzeHeadlessREADME.md)
- [Binary Ninja, BNIL overview](https://docs.binary.ninja/dev/bnil-overview.html)
- [Binary Ninja, "Architecture Agnostic Function Detection in Binaries" (2017)](https://binary.ninja/2017/11/06/architecture-agnostic-function-detection-in-binaries.html)
- [Binary Ninja, batch processing and headless licences](https://docs.binary.ninja/dev/batch.html)
- [Binary Ninja 6.0 "Krypton" release post](https://binary.ninja/2026/09/03/binary-ninja-6.0-krypton.html)
- [Binary Ninja Free](https://binary.ninja/free/)
- [radare2 book, ESIL](https://book.rada.re/emulation/esil.html)
- [radare2 book, decompilers](https://book.rada.re/arch/decompile.html)
- [radare2 releases (6.2.4)](https://github.com/radareorg/radare2/releases)
- [rizin, RzIL design notes](https://github.com/rizinorg/rizin/blob/dev/doc/rzil.md)
- [rizin releases (0.9.1)](https://github.com/rizinorg/rizin/releases)
- [Announcing Rizin (8 December 2020)](https://rizin.re/posts/announcing-rizin/)
- [Cutter releases (2.5.0)](https://github.com/rizinorg/cutter/releases)
- [angr documentation, CFG recovery](https://docs.angr.io/en/latest/analyses/cfg.html)
- [angr documentation, the decompiler and its analysis passes](https://docs.angr.io/en/latest/analyses/decompiler.html)
- [angr documentation, intermediate representation (VEX)](https://docs.angr.io/en/latest/advanced-topics/ir.html)
- [angr on PyPI (10.0.3)](https://pypi.org/project/angr/)
- [pypcode on PyPI](https://pypi.org/project/pypcode/)
- [llvm-objdump command guide](https://llvm.org/docs/CommandGuide/llvm-objdump.html)
- [GNU objdump manual](https://sourceware.org/binutils/docs/binutils/objdump.html)
- [LIEF documentation](https://lief.re/doc/stable/index.html)
- [Capstone releases](https://github.com/capstone-engine/capstone/releases)
- [BinDiff releases (v8, open source)](https://github.com/google/bindiff/releases/tag/v8)
- [Diaphora](https://github.com/joxeankoret/diaphora)
- [Hopper Disassembler downloads](https://www.hopperapp.com/download.html)
- [Compiler Explorer](https://github.com/compiler-explorer/compiler-explorer)
- [LLDB announced as an LLVM subproject (2010)](https://blog.llvm.org/2010/06/new-lldb-debugger.html)
- [Boomerang decompiler](https://boomerang.sourceforge.net/)
- [Tan et al., "LLM4Decompile" (EMNLP 2024)](https://aclanthology.org/2024.emnlp-main.203/)
- [Gao et al., "DecompileBench" (Findings of ACL 2025)](https://aclanthology.org/2025.findings-acl.1194/)
- [Liu, Raff, Micinski, "When LLM Decompilers Recompile More and Preserve Less" (2026)](https://arxiv.org/abs/2609.05370)
