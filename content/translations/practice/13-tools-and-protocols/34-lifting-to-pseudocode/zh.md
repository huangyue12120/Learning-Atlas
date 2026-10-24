---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/34-lifting-to-pseudocode/docs/en.md
  revision: f7aadc1d61a9fbbe2bdb107d1e2bf0a6caeea299
  sha256: 47e548c6de9b0f2138486cd0c4b7a81e36a9b73d2b5d68b31d2a87d5ea8d312c
status: reviewed
---

# 提升为伪代码：从零构建 IR、SSA 与结构化

> 反编译器的输出是一项带有隐藏推导过程的声明。当你亲手构建出这条推导链时，输出的每一行都变成了你可以核查的东西。

**类型：** 构建
**语言：** Python、C
**前置要求：** Phase 13 · 第 32 课（从零构建 ELF）、Phase 13 · 第 33 课（反汇编与控制流）
**预计时间：** 约 150 分钟

## 学习目标

- 把解码后的 x86-64 指令提升为一个小型 IR，其中显式包含标志位、加载、存储、分支、调用和返回。
- 把栈帧槽位变成局部变量，把 System V 参数寄存器变成形参。
- 在支配边界上用 phi 函数构建最小 SSA，然后做代入、化简并移除死代码。
- 借助后支配节点和回边，从控制流图中恢复 `if`、带 `else` 的 `if`、`while` 和 `do while`。
- 把乘以 `0x66666667` 解释为除以 10，并证明这个恒等式。
- 逐行阅读同样这些函数的 Ghidra 伪代码，为每一处差异指出背后的指令或猜测。

## 问题

你向 rea 请求 `ledger-x86_64-O1.o` 中 `percent_change` 的伪代码。Ghidra 12.1.4 在大约十秒内给出了答案：

```c
undefined1  [16] percent_change(int param_1,int param_2,ulong param_3)

{
  long lVar1;
  undefined1 auVar2 [16];
  undefined1 auVar3 [16];
  
  if (param_1 != 0) {
    lVar1 = (long)((param_2 - param_1) * 100);
    auVar3._0_8_ = lVar1 / (long)param_1 & 0xffffffff;
    auVar3._8_8_ = lVar1 % (long)param_1 & 0xffffffff;
    return auVar3;
  }
  auVar2._8_8_ = 0;
  auVar2._0_8_ = param_3;
  return auVar2 << 0x40;
}
```

源代码只有四行。它接收两个 `int` 值并返回一个 `int`。Ghidra 却报告了一个 16 字节的返回值，以及一个源代码里没有的第三个参数。那十六字节机器码是正确的，Ghidra 也把每一个字节都解码对了。签名是一个猜测，而文本里没有任何东西把它标记为猜测。

rea 以 `procedure_pseudo_code` 结果返回这段文本，并在记录上附加了一条限制。这条限制写着 "Pseudocode is Ghidra decompiler output, not original source and not text-equivalent to Hopper output"（伪代码是 Ghidra 反编译器的输出，不是原始源代码，也不与 Hopper 的输出文本等价）。`compare_functions` 工具把伪代码当作文本行来做差异比对。它自己的 dimension 记录写着 "Assembly is opaque provider text"（汇编是不透明的提供方文本），并且说明重定位归一化不可用。rea 无法看进文本内部，只读取文本的智能体同样做不到。

rea 的 DX-Ball 记录展示了代价。第一个反编译器结果是 `FUN_00406400(void)`，它调用了 `__ftol()`。指令视图显示了一个栈输入和一个 x87 表达式。智能体之所以继续推进，只是因为两个视图互相矛盾。

本课构建的正是反编译器所隐藏的那条推导链。你从第 33 课解码出的 56 条指令开始，把它们提升为 IR，重命名为 SSA，化简，再结构化。然后你把自己的伪代码摆在 Ghidra 对 `percent_change`、`grade` 和 `total` 的结果旁边，为每一处差异给出解释。测试会用 clang 编译你的输出，并在一组输入网格上与源代码对照运行。

```figure
lifting-stages-percent-change
```

## 测试夹具与判定基准

`code/fixtures/ledger.c` 是本课这一部分共用的测试夹具：

```c
int percent_change(int before, int after) {
    if (before == 0) return 0;
    return (after - before) * 100 / before;
}

int grade(int score) {
    switch (score / 10) {
    case 10:
    case 9: return 4;
    case 8: return 3;
    case 7: return 2;
    case 6: return 1;
    default: return 0;
    }
}

int total(const int *values, int count) {
    int sum = 0;
    for (int i = 0; i < count; i++) sum += values[i];
    return sum;
}
```

`grade_label` 也在这个文件里，也在目标文件里，演示程序同样会提升它。上面这三个函数才是本课要测试的对象。

该目标文件用 `clang -target x86_64-unknown-linux-gnu -O1 -fno-asynchronous-unwind-tables -c ledger.c` 构建。`-O0` 目标文件就放在它旁边，用于栈帧槽位那一节。`code/fixtures/README.md` 列出了两条命令、每个目标文件的 SHA-256，以及生成 Ghidra 夹具的 rea 命令。在锁定的工具链上，这次构建可以逐字节复现。

解码器的判定基准（oracle）是 `llvm-objdump -d -r`。它对两个目标文件的输出已作为 `ledger-x86_64-O1.objdump.txt` 和 `ledger-x86_64-O0.objdump.txt` 提交。一个测试会解析这两个文件，按地址、字节和 AT&T 文本逐条比较每一条指令，覆盖 `-O1` 的全部 56 条指令和 `-O0` 的每一条指令。如果 `llvm-objdump` 安装在锁定路径上，第二个测试会实时运行它并再比较一次。

下面是判定基准打印出的 `percent_change`：

```text
0000000000000000 <percent_change>:
       0: 85 ff                        	testl	%edi, %edi
       2: 74 09                        	je	0xd <percent_change+0xd>
       4: 29 fe                        	subl	%edi, %esi
       6: 6b c6 64                     	imull	$0x64, %esi, %eax
       9: 99                           	cltd
       a: f7 ff                        	idivl	%edi
       c: c3                           	retq
       d: 31 c0                        	xorl	%eax, %eax
       f: c3                           	retq
```

## 阶段 1：从字节到指令

第 33 课构建了解码器。本课保留了一份小型副本，使代码可以独立运行。这份副本恰好覆盖 clang 为 `ledger.c` 在 `-O0` 和 `-O1` 下发出的那些操作码。对于其他任何情况，它都会抛出带有地址和操作码字节的 `DecodeError`。

解码器遵循 Intel SDM 第 2 卷第 2.1 节的字节顺序。前缀在最前，然后是操作码，接着是 ModR/M、SIB、位移，最后是立即数。第 2.2.1 节加入了 REX 前缀，它是 `0x40` 到 `0x4F` 之间的一个字节，必须紧挨在操作码之前。REX.W 选择 64 位操作数，REX.R 扩展 `reg` 字段，REX.X 扩展 SIB 的 index，REX.B 扩展 `r/m` 或 SIB 的 base。第 2.1.3 节定义了 ModR/M 的三个字段 `mod`、`reg` 和 `r/m`，以及 SIB 的三个字段 `scale`、`index` 和 `base`。在 64 位模式下，`mod = 00` 且 `r/m = 101` 表示相对下一条指令的 32 位位移（第 2.2.1.6 节）。

| 操作码字节 | 形式 | 夹具示例 |
|---|---|---|
| `01 29 31 39 85 89` | `op Ev, Gv` | `29 fe` `subl %edi, %esi` |
| `03 2b 3b 8b 8d` | `op Gv, Ev` | `03 04 97` `addl (%rdi,%rdx,4), %eax` |
| `63` 带 REX.W | `movsxd Gv, Ev` | `48 63 c7` `movslq %edi, %rax` |
| `69` 和 `6b` | `imul Gv, Ev, imm` | `48 69 c0 67 66 66 66` |
| `83 /0 /5 /7` | `add sub cmp Ev, imm8` | `83 c1 fa` `addl $-0x6, %ecx` |
| `c1 /5 /7` | `shr sar Ev, imm8` | `48 c1 f9 22` `sarq $0x22, %rcx` |
| `f7 /7` | `idiv Ev` | `f7 ff` `idivl %edi` |
| `ff /0 /4` | `inc Ev`、`jmp Ev` | `48 ff c2` `incq %rdx` |
| `70` 到 `7f`、`eb`、`e8` | `jcc rel8`、`jmp rel8`、`call rel32` | `74 09` `je 0xd` |
| `99`、`c3`、`90`、`0f 1f` | `cltd`、`retq`、`nop` | `66 0f 1f 44 00 00` `nopw (%rax,%rax)` |

`grade+0x23` 处的 `leaq (%rip), %rcx` 是七个字节，位移为零。目标文件在偏移 `0x36`（即位移字段）处带有一条重定位 `R_X86_64_PC32.rodata+0x10`。提升器在阶段 3 解析它。

## 阶段 2：基本块与支配节点

基本块是一段语句序列，顶部只有一个入口、底部只有一个出口。这是 Allen（1970）给出的定义，之后每一篇反编译器论文都沿用它。`build_blocks()` 收集首领指令：函数入口、函数内每一个跳转目标，以及每一个位于跳转或返回之后的地址。每个块从它的最后一条指令获得后继。条件跳转有两个后继，`jmp` 有一个。`ret` 没有后继，而以普通指令结尾的块会向下落入下一个首领指令。

`total` 在 `-O1` 下有五个块：

| 块 | 指令 | 后继 |
|---|---|---|
| `0x40` | `testl %esi, %esi` 然后 `jle 0x5c` | `0x5c`、`0x44` |
| `0x44` | `movl %esi, %ecx`、`xorl %edx, %edx`、`xorl %eax, %eax`、`nopw` | `0x50` |
| `0x50` | `addl (%rdi,%rdx,4), %eax`、`incq %rdx`、`cmpq %rdx, %rcx`、`jne 0x50` | `0x50`、`0x5b` |
| `0x5b` | `retq` | 出口 |
| `0x5c` | `xorl %eax, %eax` 然后 `retq` | 出口 |

`immediate_dominators()` 是 Cooper、Harvey 和 Kennedy（2001）的迭代算法。它按逆后序遍历各个块，对已处理前驱的支配节点求交，直到不再变化。在这样小的图上，它两趟就收敛。对于 `total`，它给出 `0x44` 支配 `0x50`。它还给出 `0x50` 经由回边支配自身，阶段 8 正是据此找到循环。

同一个函数还会再运行两次。`dominance_frontiers()` 在阶段 5 用它构建 SSA。`post_dominators()` 在反向图上运行它，并加入一个虚拟出口节点，以在阶段 8 中找到汇合点。

## 阶段 3：提升为一个小型 IR

IR 有六种语句：`Assign`、`Store`、`Branch`、`Jump`、`IndirectJump` 和 `Return`。表达式包括常量、变量、带宽度的二元运算、类型转换（`sext`、`zext`、`trunc`）以及加载。另有五种形态只是为了稍后被化简掉而存在：`Flags`、`Cond`、`Concat`、`SignFill` 和 `Symbolic`。

寄存器是以其 64 位族命名的变量。对 `%eax` 的写入是对 `rax` 的一个宽度为 32 的 `Assign`，对 `%eax` 的读取是对 `rax` 在宽度 32 上的一次读取。在 64 位模式下，32 位写入会零扩展到整个寄存器，所以之后对同一个值的 64 位读取是一次 `zext`。提升器不知道可达定义，于是它记录读取宽度，并让 SSA 在阶段 5 插入类型转换。

| 指令 | IR 语句 |
|---|---|
| `subl %edi, %esi` | `flags = cmp(esi, edi)` 然后 `esi = esi - edi` |
| `testl %edi, %edi` | `flags = test(edi, edi)` |
| `je 0xd` | `if je(flags) goto 0xd else goto 0x4` |
| `xorl %eax, %eax` | `eax = 0` |
| `cltd` | `edx = signfill(eax)` |
| `idivl %edi` | `dividend = edx:eax`、`eax = dividend / edi`、`edx = dividend % edi` |
| `movslq %edi, %rax` | `rax = sext64(edi)` |
| `sarq $0x22, %rcx` | `rcx = rcx >>s 34` |
| `shrq $0x3f, %rax` | `rax = rax >>u 63` |
| `addl (%rdi,%rdx,4), %eax` | `flags = add(eax, load32(rdi + rdx * 4))` 然后 `eax = eax + load32(rdi + rdx * 4)` |
| `leaq (%rip), %rcx` 带其重定位 | `rcx = &.rodata+0x14` |
| `pushq %rbp`、`movq %rsp, %rbp`、`subq $0x10, %rsp`、`popq %rbp` | 无，栈帧记账 |
| `retq` | `return rax` |

### 标志位是一个变量

每一条设置条件码的指令都写入一个名为 `flags` 的变量，每一条条件跳转都读取它。`cmp a, b` 写入 `cmp(a, b)`，`test a, b` 写入 `test(a, b)`，而 `sub` 作为副作用写入同样的 `cmp` 形态。`jcc` 变成 `Branch(Cond(cc, flags), target, fallthrough)`。当这两者在阶段 6 相遇时，由条件码决定比较运算符：

| 条件码 | 在 `cmp(a, b)` 之后 | 在 `test(a, a)` 之后 |
|---|---|---|
| `je` | `a == b` | `a == 0` |
| `jne` | `a != b` | `a != 0` |
| `jl`、`jge`、`jle`、`jg` | 有符号 `<`、`>=`、`<=`、`>` | 与 0 做有符号比较 |
| `jb`、`jae`、`jbe`、`ja` | 无符号 `<`、`>=`、`<=`、`>` | 与 0 做无符号比较 |

`xorl %eax, %eax` 直接提升为 `eax = 0`。它设置的标志位被写成 `add` 风格的标志位，而夹具里没有任何跳转读取它们。`xor` 惯用法在 `grade` 中很重要，Ghidra 在那里丢掉了它。

### cltd 与 idiv

`cltd` 把 `%eax` 的符号位填满 `%edx`。`idivl %edi` 用 `%edi` 去除 64 位对 `%edx:%eax`，把商放进 `%eax`，把余数放进 `%edx`。提升器先把这个对写进一个名为 `dividend` 的临时变量。于是余数语句读取的是旧的 `%eax`，而不是新算出的商。在 SSA 中，高半部分表现为低半部分的 `signfill`。化简器把这个对归约为低半部分，除法就变成了 32 位的 `/`。

### -O0 下的栈帧槽位

在 `-O0` 下，clang 把每个局部变量都保留在栈帧里。`percent_change` 把 `%edi` 存到 `-0x8(%rbp)`，把 `%esi` 存到 `-0xc(%rbp)`，然后每次使用都把它们读回来。提升器会留意 `pushq %rbp` 后紧跟 `movq %rsp, %rbp`。在这段序言之后，一个以 `%rbp` 为基址、没有 index、带位移的内存操作数就变成一个名为 `local_<hex>` 的变量。`-0x8(%rbp)` 是 `local_8`，`-0xc(%rbp)` 是 `local_c`。

栈帧指令本身不产生 IR，对 `%rsp` 的 `subq` 和 `addq` 也不产生。任何其他内存操作数仍然是 `Load` 或 `Store`。

### 重定位

`grade` 中的 `leaq (%rip), %rcx` 在文件里位移为零。偏移 `0x36` 处的重定位写着 `R_X86_64_PC32.rodata+0x10`。链接器会把 `S + A - P` 写进该字段。`S` 是 `.rodata` 的地址，`A` 是加数 `0x10`，`P` 是该字段的地址。于是该指令计算出 `next_ip + disp = (P + 4) + S + A - P = S + A + 4`。

提升器在没有链接器的情况下做同样的算术。目标偏移是加数加上从字段到指令末尾的距离，即 `0x10 + 4 = 0x14`。IR 写作 `rcx = &.rodata+0x14`，那里的表存放着五个 `int` 值 `1, 2, 3, 4, 4`。

## 阶段 4：从调用约定得到形参

System V AMD64 psABI 第 3.2.3 节按 `%rdi`、`%rsi`、`%rdx`、`%rcx`、`%r8`、`%r9` 这个顺序传递 INTEGER 类参数。结果先在 `%rax` 返回，然后是 `%rdx`。第 3.2.1 节说明 `%rbp`、`%rbx` 以及 `%r12` 到 `%r15` 属于调用者，必须被保留。其余一切都属于被调用者。

`collect_params()` 应用一条规则：在函数中先被读取、后被写入的参数寄存器就是形参。这类寄存器中编号最高的那个决定了形参个数，所以一个读取 `%rsi` 却从不读取 `%rdi` 的函数仍然有两个形参。`percent_change` 读取 `%edi` 和 `%esi`，因此它有 `param_1` 和 `param_2`。`grade` 只读取 `%edi`。`total` 把 `%rdi` 读作 64 位基址，把 `%esi` 读作 32 位计数。

现在 Ghidra 的 `param_3` 有了解释。`idivl` 写入 `%rdx`，而 psABI 允许一个 128 位 INTEGER 返回值放在 `%rax:%rdx` 中。在一个目标文件里，没有调用者来说明返回值有多宽。Ghidra 把这两个寄存器都当成了返回值。

在为零的那条路径上，`xorl %eax, %eax` 只写入 `%eax`。Ghidra 在那里把 `%rdx` 读作函数的一个输入，这个输入就成了 `param_3`。指令是对的。签名是对指令留白之处的一个猜测。

## 阶段 5：SSA，每个定义一个名字

提升之后，`grade` 写入 `rax` 四次、`rcx` 三次。Cytron、Ferrante、Rosen、Wegman 和 Zadeck（1991）定义了静态单赋值（SSA）形式。每个变量恰好被赋值一次，连接点处的 phi 函数在到达该点的各个定义之间作选择。他们的构造分两步。第 5.1 节用支配边界放置 phi 函数，第 5.2 节通过在支配树上游走来重命名每一处定义和使用。`insert_phis()` 和 `rename()` 遵循这两节。

`total` 的 SSA 清单展示了这个构造产生的结果：

```text
block 0x44 -> 0x50
  ecx_1 = esi_0
  edx_1 = 0
  eax_1 = 0
block 0x50 -> 0x50, 0x5b
  eax_2 = phi(0x44: eax_1, 0x50: eax_3)
  rdx_2 = phi(0x44: edx_1, 0x50: rdx_3)
  flags_2 = phi(0x44: flags_1, 0x50: flags_5)
  flags_3 = add(eax_2, load32(rdi_0 + rdx_2 * 4))
  eax_3 = eax_2 + load32(rdi_0 + rdx_2 * 4)
  flags_4 = inc(rdx_2, 1)
  rdx_3 = rdx_2 + 1
  flags_5 = cmp(zext64(ecx_1), rdx_3)
  if jne(flags_5) goto 0x50 else goto 0x5b
```

一个寄存器的版本 0 是它在入口处的值。`esi_0` 和 `rdi_0` 是形参。循环头 `0x50` 有两个前驱——设置块和它自身——所以每个在循环中有定义的变量都会在那里得到一个 phi。`flags_2` 这个 phi 一出生就是死的。最小 SSA 之所以放置它，是因为 `flags` 在两个前驱中都有定义；阶段 6 会移除它，因为没有任何东西读取它。

重命名这一步还会修正宽度。`edx_1 = 0` 是一个 32 位定义，而 `rdx_3 = rdx_2 + 1` 是 64 位，所以 phi `rdx_2` 取较宽的宽度。`cmpq %rdx, %rcx` 中对 `%rcx` 的读取是 64 位，而它的定义 `ecx_1 = esi_0` 是 32 位，于是这处使用变成 `zext64(ecx_1)`。最终伪代码里的每一处类型转换都来自这一条规则。

“lite”之处在于退出 SSA 的方式。`coalesce_webs()` 把每个 phi 与其各个实参合并成一个变量——称为一张 web——并给这张 web 一个名字。对于编译器为这些函数发出的那些形态，这种做法是奏效的。它可能在并行复制上失效，也就是一个连接点处两个 phi 互换取值的情形，本课不处理这种情况。Cytron 的第 7 节描述了通过着色实现的通用退出方式。

## 阶段 6：化简、代入、移除死代码

`optimize()` 重复三趟，直到不再变化。化简器自底向上用以下规则改写表达式：

| 之前 | 之后 |
|---|---|
| `Cond(je, cmp(a, b))` | `a == b`，其余九个条件码同理 |
| `Cond(jle, test(a, a))` | `a <= 0` |
| `x + (-6)` | `x - 6` |
| `trunc32(zext64(x))`，其中 `x` 是 32 位 | `x` |
| 64 位操作数上的 `trunc32(a + b)` | `trunc32(a) + trunc32(b)` |
| `(signfill(x): x) / d` | 宽度为 32 的 `x / d` |
| `load32(base + idx * 4)` | `base[idx]` |
| `trunc32(p >>s 34) + trunc32(p >>u 63)`，其中 `p = sext64(x) * 0x66666667` | `x / 10` |

前向代入把一个定义挪进它唯一的使用处。这条规则有三个条件。使用在同一个块内。使用是一条语句而不是 phi。当定义中含有加载时，定义与使用之间没有存储或调用。常量或节地址可以代入除 phi 以外的任何地方，因为 phi 实参必须保持为变量，以便构成 web。

死代码移除会删除目标没有使用、表达式没有调用的赋值或 phi。各趟的顺序很重要。在 `percent_change` 中，余数 `edx_2 = dividend_1 % edi_0` 是死的，所以它先被删掉。这就使 `edx_1 = signfill(eax_1)` 只剩一处使用，于是它被代入 `dividend_1 = edx_1:eax_1`。

接着对的规则把 `signfill(eax_1):eax_1` 归约为 `eax_1`，除法变成 `eax_1 / edi_0`。现在 `eax_1 = esi_1 * 100` 只有一处使用，`esi_1 = esi_0 - edi_0` 也只有一处使用，两者都挪进返回语句。`flags` 的各个定义已被代入分支条件并消失。四条指令变成了一行：

```c
return (param_2 - param_1) * 100 / param_1;
```

### 0x66666667 乘法

`grade` 把分数除以 10，而 clang 没有发出 `idiv`。它发出 `imulq $0x66666667, %rax, %rax`，然后对一个副本做 `sarq $0x22, %rcx`，再做 `shrq $0x3f, %rax`，最后把两者相加。Granlund 和 Montgomery 的 "Division by Invariant Integers using Multiplication"（PLDI 1994）描述了这个方法。编译器挑选一个乘数 `m` 和一个移位量 `s`。对范围内的每一个 `x`，`(x * m) >> s` 都必须等于 `x / d`。

这里 `m = 0x66666667 = 1717986919`，`s = 34`。算术核对无误：`2^34 / 10 = 1717986918.4`，向上取整是 `1717986919`。误差是 `m * 10 - 2^34 = 6`。要使这个恒等式对每一个 32 位 `x` 都成立，误差乘以 `2^31` 必须低于 `2^34`，所以误差至多是 8。6 至多是 8，所以 `(x * m) >> 34` 对每一个非负 `int` 都等于 `floor(x / 10)`。

对于负的 `x`，向下取整会朝远离零的方向舍入，而 C 朝零舍入。`shrq $0x3f` 取出乘积的符号位，它恰好在 `x` 为负时为 1。把它加上去就修正了舍入方向。

`magic_divisor(m, s)` 检验一个候选对。它把 `d` 算作 `2^s` 除以 `m` 的整数商，并尝试 `d` 和 `d + 1`。只有当 `m` 等于 `2^s / d` 的向上取整且误差界成立时，它才接受一个 `d`。同样的乘数配上 `s = 33` 会给出 `d = 5`，这是正确的，因为 `0x66666667` 也是 `2^33 / 5` 的向上取整。有一个测试在 2,406 个值（包含 `int` 范围的两端）上对照 `c_div(x, 10)` 检验这个恒等式。

开启识别后，`grade` 读作 `ecx_1 = param_1 / 10 - 6;`。关闭识别后，演示程序打印原始形式：

```c
rax_1 = (long)param_1 * 0x66666667;
ecx_1 = (int)(rax_1 >> 34) + (int)((unsigned long)rax_1 >> 63) - 6;
```

两者都能编译，且计算出相同的值。保留这个开关。当你阅读来自一个你尚未研究过的编译器的代码时，原始形式才是诚实的那个。

## 阶段 7：从使用推断类型

机器码有宽度而没有类型。`infer_types()` 把三类证据转化为 C 类型。定义宽度为 32 位的 web 是 `int`，64 位的 web 是 `long`。作为元素访问 `base[idx]`（元素为 4 字节）基址的 web 是 `int *`。指针类型会沿着复制和 phi 传播，所以 `-O0` 下的 `local_8 = param_1` 会让两者都成为 `int *`。返回类型是 `return` 语句中值的宽度。

`total` 的结果是 `int total(int *param_1, int param_2)`。Ghidra 写的是 `int total(long param_1,uint param_2)`。两者都与指令一致。提升器把带比例因子的加载用作指针证据。Ghidra 保留了寄存器宽度，并把该访问写成 `*(int *)(param_1 + uVar2 * 4)`。两者都看不到 `const`，也都无法区分 `int *` 与 `unsigned *`。

Lee、Avgerinos 和 Brumley（TIE，NDSS 2011）把类型恢复表述为在一个格上的约束求解。结果是一个上界和一个下界，而不是单一的猜测。Noonan、Loginov 和 Cok（Retypd，PLDI 2016）加入了多态与递归。他们报告说，从编译器留下的惯用法中恢复 `const` 指针标注的召回率达到 98%。本课采用这一研究方向中最廉价的两条规则，并点明它们看不到的东西。

无符号算术保留在表达式中，而不体现在变量类型里。`cmpl $0x4, %ecx` 之后的 `ja` 打印为 `(unsigned int)ecx_1 > 4`，`shrq` 打印为 `(unsigned long)rax_1 >> 63`。变量保持有符号，这样读者就能看到寄存器的值，以及指令把它当作无符号来处理的那唯一一处。

## 阶段 8：从图做结构化

Cifuentes（1994）第 6 章把图的若干区域与高级语言的各种形态相匹配。先是循环（6.6.1），然后是双向条件（6.6.2），再是 n 向条件（6.6.3）。Yakdan、Eschweiler、Gerhards-Padilla 和 Smith（NDSS 2015）走了另一条路。他们推导出每个节点在何种条件下执行，并据这些条件构建结构，不用任何固定形态。他们的动机来自一次测量。Hex-Rays 在一个样本上于 49,514 行里产生了 1,571 条 `goto` 语句，平均每 32 行一条，而他们的结构化方法在 1,530 个 coreutils 函数上一条也没产生。

`structure()` 是第一个流派里的一个小成员。它需要阶段 2 给出的两个事实。以 `Branch` 结尾的块的直接后支配节点，就是该条件的汇合点。回边是指向一个支配其源头的块的边。自然循环是指不经过循环头就能到达回边源头的那组块。

对于汇合点为 `j` 的 `Branch`：

- 如果 `j` 是跳转目标，发出 `if (!cond) { fallthrough 区域 }` 并在 `j` 处继续。
- 如果 `j` 是直落目标，发出 `if (cond) { target 区域 }` 并在 `j` 处继续。
- 如果 `j` 是函数出口，则两条分支都返回。把较小的那条分支发出为 `if (cond) {... }`，另一条紧随其后，不带 `else`。这就是 `percent_change` 和 `total` 中的提前返回。
- 否则发出 `if (cond) { target } else { fallthrough }` 并在 `j` 处继续。这就是 `-O0` 下的 `percent_change`，那里两条分支都存储 `local_4`，并在尾声处汇合。

对于循环头：

- 如果循环头以一个带有一个循环外后继的 `Branch` 结尾，发出 `while (cond) { body }`。`-O0` 下的 `total` 是这种形态：循环头把 `local_14` 与 `local_c` 比较，并在 `jge` 时离开。
- 如果循环头同时也是带有回边的那个块，或者闩锁块反而是出口，则发出 `do { body } while (cond);`。`-O1` 下的 `total` 是这种形态：块 `0x50` 做加法、自增、比较并跳回自身。

`IndirectJump` 结束一个没有后继的块。`-O0` 下的 `grade` 是一张真正的跳转表，`jmpq *%rax` 经过 `.rodata+0x0` 处五个相对偏移跳转，第 33 课会解析这些目标。这里提升器改为打印一条说明。位于 `0x76`、`0x7f`、`0x88` 和 `0x91` 的四个块只能经由间接跳转到达，没有被提升。实践实验会补上这个 `switch`。

### -O1 对 switch 做了什么

在 `-O1` 下，clang 没有为 `grade` 保留跳转表。它计算 `score / 10 - 6`，并把结果当作无符号数与 4 比较。然后它从 `.rodata+0x14` 处一个含五个 `int` 条目的表里加载返回值。那次无符号比较是一条指令，同时覆盖了 `score / 10 < 6` 和 `score / 10 > 10`。负的差是一个很大的无符号值，所以它也无法通过同一个检查。

对于商 6 到 10，该表存放着 `1, 2, 3, 4, 4`。带五个 `return` 语句的 `switch` 变成了一个 `if` 加一次数组读取。提升器恰好发出这个结果，并按其节内偏移把该表命名为 `lookup_14`。

表的长度是一个启发式结果。`table_values()` 从表的起始处读到下一个被任何 `.text` 重定位引用的 `.rodata` 偏移，或读到节的末尾。在这个目标文件里，下一个被引用的偏移是 `0x28`，即 `grade_label` 的表，所以 `lookup_14` 有 `(0x28 - 0x14) / 4 = 5` 个条目。与 4 做的那次无符号比较与之吻合。Ghidra 同样不知道长度。它写的是 `*(uint *)(&DAT_001000b4 + (ulong)uVar2 * 4)`，一个字节地址加上一个偏移，把这五个值留给读者自己去查。

## 与 Ghidra 并排对照

演示程序打印出每一对。Ghidra 的文本来自 `code/fixtures/ghidra/*.json`，即 rea 在 2026-10-14 返回的 Evidence 记录。命令是 `npx -y rea-agents@6.5.0 decompile ledger-x86_64-O1.o <function> --provider ghidra --format json`。每条记录带有 `confidence: observed` 和 `authority: shipped-artifact`。文本是观测到的。文本内部的各项声明是推导出来的，而记录并没有说明哪些是推导的。

### percent_change

```text
lifter                                         | ghidra
-----------------------------------------------+-----------------------------------------------
int percent_change(int param_1, int param_2)   | undefined1  [16] percent_change(int param_1,int param_2,ulong param_3)
{                                              | {
  if (param_1 == 0) {                          |   long lVar1;
    return 0;                                  |   undefined1 auVar2 [16];
  }                                            |   undefined1 auVar3 [16];
  return (param_2 - param_1) * 100 / param_1;  |   if (param_1 != 0) {
}                                              |     lVar1 = (long)((param_2 - param_1) * 100);
                                               |     auVar3._0_8_ = lVar1 / (long)param_1 & 0xffffffff;
                                               |     auVar3._8_8_ = lVar1 % (long)param_1 & 0xffffffff;
                                               |     return auVar3;
                                               |   }
                                               |   auVar2._8_8_ = 0;
                                               |   auVar2._0_8_ = param_3;
                                               |   return auVar2 << 0x40;
                                               | }
```

| 差异 | 指令还是猜测 |
|---|---|
| 返回类型 `undefined1 [16]` 对 `int` | 猜测。`idivl` 写入 `%rax` 和 `%rdx`，没有调用者来固定返回宽度。两个寄存器都被保留了。 |
| `param_3` | 承接上一条而来的猜测。在为零的路径上只写入了 `%eax`，于是 `%rdx` 被读作一个输入。 |
| `lVar1 / (long)param_1 & 0xffffffff` 对 `/ param_1` | 指令。`cltd` 加 `idivl` 是对一个符号扩展后的 32 位值做 64 位除法，再截断为 32 位。两段文本都在描述它。我们这边用 `signfill` 规则把那个对归约掉了。 |
| 保留 `lVar1 % (long)param_1` | 承接返回类型而来。`%rdx` 里的余数在我们的分析中是死的，在 Ghidra 的分析中是活的。 |
| `if (param_1 != 0)` 并把为零的情况放在其后 | 指令顺序。`je 0xd` 跳到为零的返回。Ghidra 把计算的那条分支放在前面，我们把较小的那条分支放在前面。两者都对。 |
| `return auVar2 << 0x40` | 猜测。一个 16 字节的值，低半部分是 `param_3`，被移位到高半部分——这是反编译器表达“`%rax = 0` 且 `%rdx` 未知”的方式。 |

`code/fixtures/ghidra/ledger-x86_64-O1.ghidra-repaired.c` 里的修复版本只编辑了这一个函数，测试在 81 对输入上把它与源代码对照。

### grade

```text
lifter                                         | ghidra
-----------------------------------------------+-----------------------------------------------
static const int lookup_14[5] = {1, 2, 3, 4, 4}; | uint grade(int param_1)
int grade(int param_1)                         | {
{                                              |   uint uVar1;
  int eax_1;                                   |   uint uVar2;
  int ecx_1;                                   |   
                                               |   uVar2 = param_1 / 10 - 6;
  ecx_1 = param_1 / 10 - 6;                    |   uVar1 = -(param_1 >> 0x1f) ^ (uint)((ulong)((long)param_1 * 0x66666667) >> 0x3f);
  eax_1 = 0;                                   |   if (uVar2 < 5) {
  if ((unsigned int)ecx_1 <= 4) {              |     uVar1 = *(uint *)(&DAT_001000b4 + (ulong)uVar2 * 4);
    eax_1 = lookup_14[(unsigned long)(unsigned int)ecx_1]; |   }
  }                                            |   return uVar1;
  return eax_1;                                | }
}                                              |
```

| 差异 | 指令还是猜测 |
|---|---|
| 两边都有 `param_1 / 10 - 6` | 指令。两边都识别出了 `0x66666667` 惯用法。 |
| `uVar1 = -(param_1 >> 0x1f) ^ (uint)(... >> 0x3f)` 对 `eax_1 = 0` | 指令 `grade+0x1a` 处的 `xorl %eax, %eax`。该寄存器为零。Ghidra 把这个 `xor` 表达成 `param_1` 的符号与乘积符号位的异或——同一个位的两种写法——并且没有把它们抵消掉。这个值对每个 `int` 都是 0，测试在 141 个分数上证明了这一点。一个相信文本的读者会以为默认值取决于分数。 |
| `uVar2 < 5` 对 `(unsigned int)ecx_1 <= 4` | 指令 `cmpl $0x4, %ecx` 然后 `ja`。同一个条件。Ghidra 把 `uVar2` 定为 `uint`，我们在使用处做类型转换。 |
| `*(uint *)(&DAT_001000b4 + (ulong)uVar2 * 4)` 对 `lookup_14[...]` | 指令加重定位。Ghidra 加载对象时把 `.rodata` 放在 `0x001000a0`，所以 `0x001000b4` 就是 `.rodata + 0x14`。它应用了重定位并保留了一个字节地址。我们给这张表起了名，并读出了它的五个值。 |
| `uint` 返回对 `int` | 两边都是猜测。指令只说明是 32 位。 |

### total

```text
lifter                                         | ghidra
-----------------------------------------------+-----------------------------------------------
int total(int *param_1, int param_2)           | int total(long param_1,uint param_2)
{                                              | {
  int eax_1;                                   |   int iVar1;
  int ecx_1;                                   |   ulong uVar2;
  long rdx_1;                                  |   
                                               |   if (0 < (int)param_2) {
  if (param_2 <= 0) {                          |     uVar2 = 0;
    return 0;                                  |     iVar1 = 0;
  }                                            |     do {
  ecx_1 = param_2;                             |       iVar1 = iVar1 + *(int *)(param_1 + uVar2 * 4);
  rdx_1 = 0;                                   |       uVar2 = uVar2 + 1;
  eax_1 = 0;                                   |     } while (param_2 != uVar2);
  do {                                         |     return iVar1;
    eax_1 = eax_1 + param_1[rdx_1];            |   }
    rdx_1 = rdx_1 + 1;                         |   return 0;
  } while ((unsigned long)(unsigned int)ecx_1 != rdx_1); | }
  return eax_1;                                |
}                                              |
```

| 差异 | 指令还是猜测 |
|---|---|
| `int *param_1` 对 `long param_1` | 我们这边由 `addl (%rdi,%rdx,4), %eax` 推断而来。Ghidra 保留了宽度。 |
| `uint param_2` 与 `(int)param_2` 对 `int param_2` | Ghidra 选了无符号，因为 `cmpq %rdx, %rcx` 比较的是零扩展后的计数。我们保留了 `int`，并在比较处做类型转换。 |
| 两边都有 `do { } while` | 指令 `jne 0x50` 从块跳回它自身。编译器旋转了循环。`-O0` 目标文件保留了 `while`。 |
| 保留 `ecx_1 = param_2` 对 `param_2 != uVar2` | 我们的代入规则只在一个块内生效。复制 `movl %esi, %ecx` 在设置块里，而比较在循环里，所以这个变量被保留了下来。Ghidra 把它传播了。 |
| `(unsigned long)(unsigned int)ecx_1` | 指令。`movl %esi, %ecx` 做零扩展，而 64 位比较读取整个寄存器。 |

行为测试原封不动地编译 `grade` 和 `total` 的 Ghidra 文本。它加上两行 `typedef`，以及用 `.rodata+0x14` 处二十个字节定义的 `DAT_001000b4`。两个函数在输入网格上都与源代码吻合。

## 研究对阅读伪代码怎么说

LLM4Decompile（EMNLP 2024）测得 Ghidra 单独使用时在 HumanEval-Decompile 上的可重新执行率为 20.12%。大约五个函数里有一个能重新编译并通过基准自带的断言。用他们的 6.7B 模型精修 Ghidra 的输出后，这个比例升到 52.74%。DecompileBench（Findings of ACL 2025）在来自 130 个程序的 23,400 个函数上运行了六个工业反编译器和六种 LLM 方法。LLM 的输出读起来更好，但功能正确性低了 52.2%。

Liu、Raff 和 Micinski（arXiv 2609.05370，2026 年 9 月）解释了这个差距。他们用了 300 个 GitHub 库函数和 287 个以 CVE 为依据的函数。最强的精修模型把 Ghidra 的构建通过率从 75% 提到 90%，而行为匹配率却从 74% 降到 62%。在基准里通过了每一个测试的候选，在模糊测试输入上仍然出现分歧。这种情况在八个系统里占 4.9%，在其中一个系统里高达 13%。多达十分之一的已披露漏洞从精修后的代码里消失了。

他们追溯到的成因很简单。被虚构的字段、类型、被调用者和守卫，替换掉了反编译器留在文本里的可见未知项。

这正是提升器打印 `(unsigned long)(unsigned int)ecx_1` 而不是一个更漂亮名字的原因。对于未解析的跳转，它打印一条说明而不是 `switch`；它打印 `lookup_14` 而不是一个模型会去虚构的标签。每一行都有一条你可以在 `code/main.py` 里读到的推导链。Ghidra 的 `undefined1 [16]` 丑陋而诚实。一个精修模型干净的 `int percent_change(int, int)` 是出于错误的理由而正确。同一个模型在下一个函数上会产出一个干净却错误的签名。

## 动手构建

运行演示程序：

```bash
cd phases/13-tools-and-protocols/34-lifting-to-pseudocode
python3 code/main.py
```

演示程序解码 `-O1` 目标文件的全部四个函数，并把每一条指令与已提交的 `llvm-objdump` 文本比对。对于 `percent_change`、`grade` 和 `total`，它打印出 SSA 之前的 IR、带 phi 函数的 SSA 清单，以及紧挨 Ghidra 文本的伪代码。随后它打印关闭除法识别后的 `grade`、`percent_change`、`total` 和 `grade_label` 的 `-O0` 版本，以及一份摘要：

```json
{
  "functions": ["grade", "grade_label", "percent_change", "total"],
  "instructions": 56,
  "blocks": {"percent_change": 3, "grade": 3, "total": 5, "grade_label": 4},
  "phis": {"percent_change": 0, "grade": 1, "total": 2, "grade_label": 1},
  "objdumpDifferences": 0
}
```

按这个顺序阅读 `code/main.py`：

1. `read_object()` 读取一个 ELF64 可重定位目标文件的节头、符号表和 `.rela` 节。
2. `decode_one()` 和 `render_att()` 解码一条指令，并按 `llvm-objdump` 的方式打印它。
3. `build_blocks()`、`immediate_dominators()` 和 `dominance_frontiers()` 构建图的各项事实。
4. `lift_insn()` 把一条指令变成 IR 语句并解析重定位。
5. `insert_phis()` 和 `rename()` 构建 SSA 并插入宽度类型转换。
6. `make_simplifier()`、`substitute_once()` 和 `remove_dead_code()` 在 `optimize()` 内部运行。
7. `collect_params()`、`coalesce_webs()` 和 `infer_types()` 为各张 web 命名和定类型。
8. `structure()` 配合 `post_dominators()` 和 `natural_loops()` 发出 C 函数体。
9. `lift_function()` 把各阶段串起来，`lift_all()` 借助被调用者签名提升整个目标文件。

## 使用

要从你自己的目标文件里提升一个函数，用 `clang -target x86_64-unknown-linux-gnu -c` 构建它，然后调用 `lift_all(read_object(path))`。当解码器抛出 `DecodeError` 时，从消息里读出操作码字节，在 SDM 操作码映射表里找到它。然后在文件顶部的表里加一个条目。当提升器在某个助记符上抛出异常时，给 `lift_insn()` 加一条规则。当结构化器发出 `goto` 时，用 `IrPrinter` 打印图，并判断缺了哪条形态规则。每一次新增都很小，而且每一次都被现有测试对照 `llvm-objdump` 或 clang 检查过。

当安装了 Ghidra 时，对同一个函数运行 rea，把两段文本并排放置。在相信任何一段文本之前，先填好差异表。背后有指令支撑的差异是一种呈现选择。背后没有指令支撑的差异是一个猜测，而猜测可能出现在任何一边。

## 交互实验

### 实验 A：让一个函数走过五个阶段

在 `code` 目录下，打开 Python：

```bash
cd phases/13-tools-and-protocols/34-lifting-to-pseudocode/code
python3 -q
```

运行：

```python
from main import *
obj = read_object(FIXTURES / "ledger-x86_64-O1.o")
lifted = lift_function(obj, "percent_change")
for insn in lifted.decoded: print(f"0x{insn.address:x}: {insn.raw.hex(' ')}  {insn.att()}")
print(lifted.ir_text)
print(lifted.ssa_text)
print(lifted.pseudocode)
```

跟踪 `%esi`，从 `subl %edi, %esi` 到 `esi_1 = esi_0 - edi_0`，再到 `(param_2 - param_1)`。字节 `fe` 是那条 `subl` 的 ModR/M，其中 `mod = 11`、`reg = edi`、`r/m = esi`。

### 实验 B：除法惯用法

```python
print(lift_function(obj, "grade", recognize_division=False).pseudocode)
print(magic_divisor(0x66666667, 34), magic_divisor(0x66666667, 33), magic_divisor(0x66666667, 31))
```

第一行打印出原始的乘法与移位。第二行打印 `10 5 None`。想清楚为什么同一个乘数在少用一次移位时会除以 5，以及为什么移位量 31 无法通过误差界。

### 实验 C：一个新目标文件让解码器停住

在 `-O2` 下构建该夹具并提升它：

```bash
clang -target x86_64-unknown-linux-gnu -O2 -fno-asynchronous-unwind-tables -c fixtures/ledger.c -o "$TMPDIR/ledger-O2.o"
python3 -c 'from main import *; from pathlib import Path; import os; lift_all(read_object(Path(os.environ["TMPDIR"]) / "ledger-O2.o"))'
```

解码器在 `0x56` 处停住，提示 `opcode 81 is outside the fixture subset`。操作码 `81` 是带 32 位立即数的 group 1 形式。该指令是 `andl $0x7ffffff8, %edx`，clang 在 `total` 的向量化循环里用到了它。把它加在 `decode_one()` 里 `0x83` 旁边，重新运行，并记下下一个让你停住的操作码。这个子集一次增长一个条目，而每个条目都对照 `llvm-objdump` 做过检查。

### 实验 D：grade 中 Ghidra 的默认值

```python
print(ghidra_pseudocode("grade"))
for score in (-25, 0, 59, 60, 100, 115):
    sign = -(score >> 31)
    product_sign = ((score * 0x66666667) & ((1 << 64) - 1)) >> 63
    print(score, sign ^ product_sign)
```

每一行都打印 0。Ghidra 的 `uVar1` 表达式既正确又难以阅读，而指令 `xorl %eax, %eax` 用两个字节把这件事说清楚了。

## 实践实验

为 `-O0` 下的 `grade` 加上 `switch` 恢复。

要求：

- 读取 `ledger-x86_64-O0.o` 的 `.rela.rodata` 里五条重定位，每条都是 `R_X86_64_PC32.text+offset`，并从 `.rodata+0x0` 处的表计算出五个 case 目标。
- 给 IR 加一个 `Switch` 终结符，带有索引表达式、目标列表，以及来自表加载之前那条 `ja` 的默认目标。
- 让 switch 块对每个目标各有一个后继，使支配节点、后支配节点和 SSA 都继续正常工作。
- 发出 `switch (local_10) { case 0:... }`，每个目标一个 `case`，并在汇合点之后放置共用的尾声。
- 对任何你无法确定其表长度的间接跳转，保留那条说明。
- 用 clang 编译结果，并在测试中的分数网格上把它与源代码对照。

成功意味着 `-O0` 下的 `grade` 和 `-O1` 下的 `grade` 在网格上产生相同的输出，带一个 `switch` 且没有 `goto`。

## 评分实验

关于本课夹具的五个问题。用你构建的代码找出每个答案，然后把它写进 `code/lab_answers.json`。数字就写成数字，或写成诸如 `"0x40"` 的十六进制字符串，列表写成 JSON 列表。

1. `t1`：调用约定在 -O1 下给 percent_change 的形参。
2. `t2`：total 在 -O1 下 SSA 形式中的 phi 函数。
3. `t3`：magic_divisor 在移位量为 34 时为 0x66666667 找到的除数。
4. `t4`：percent_change 在 -O1 下伪代码的最后一条语句，作为一行文本。
5. `t5`：total 在 -O1 下 param_1 恢复出的 C 类型。

检查你的答案：

```bash
cd phases/13-tools-and-protocols/34-lifting-to-pseudocode
python3 code/lab.py
```

检查器会在已提交的夹具上，用 `code/main.py` 计算出每一个期望值。它为每个任务打印 `PASS`、`FAIL` 或 `TODO` 以及一个得分，只有五项全部通过时才以退出码 0 退出。`python3 code/lab.py my-answers.json` 检查另一个文件。`code/tests/test_lab.py` 证明检查器会接受正确答案并拒绝一个错误答案。

### 运行效果

[Inside a Decompiler](https://aiengineeringfromscratch.com/inside-a-decompiler?opt=O0) 机器把本课演绎为它的提升压机、类型定销、结构化夹具和打印机，配上 `code/main.py` 打印出的 IR、SSA 和伪代码。这个链接打开 `-O0` 目标文件：三个栈帧槽位变成局部变量，夹具为 if/else 合上了两边钳口。

## 交付物

本课产出 `outputs/skill-lifting-to-pseudocode.md`。用它来提升一个函数，为每一行给出推导，并对照反编译器的文本填好差异表。这份交付物需要参考反汇编、重定位、调用约定、编译检查、行为对照，以及对每一处差异行的裁定。

## 验证它

运行演示程序与确定性测试套件：

```bash
cd phases/13-tools-and-protocols/34-lifting-to-pseudocode
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

该套件有 25 个测试。验证证明：

- 解码器在两个目标文件的每一条指令上都与已提交的 `llvm-objdump` 文本一致，并在安装了实时 `llvm-objdump` 时也与之一致
- REX、ModR/M、SIB 以及 `leaq (%rip), %rcx` 的位移字段偏移，都按 SDM 的描述被解码
- 子集之外的操作码会抛出 `DecodeError` 而不是去猜测
- ELF 读取器列出四个函数和三条 `.text` 重定位
- `total` 有五个块，`0x44` 支配 `0x50`，且 `0x50` 是以自身为循环体的循环头
- `%rdi` 和 `%rsi` 成为 `param_1` 和 `param_2`，而 `total` 中的 `param_1` 是 `int *`
- 带 `je`、`jle`、`ja` 和 `jge` 的 `test` 和 `cmp` 成为 `==`、`<=`、无符号 `>` 和 `<`
- SSA 在 `total` 的循环头放置两个活的 phi 函数，在 `percent_change` 中一个也不放
- `percent_change`、`grade` 和 `total` 的伪代码等于期望文本
- 开启识别时 `grade` 读作 `param_1 / 10 - 6`，关闭识别时读作原始乘法
- `0x66666667` 配移位量 34 除以 10，配移位量 33 除以 5，且该恒等式在网格上成立
- `-O0` 下的栈帧槽位成为 `local_4`、`local_8`、`local_c`，且栈帧指针从不出现
- `.rodata+0x14` 处的表经由重定位读出 `1, 2, 3, 4, 4`
- `-O0` 下 `grade` 中的间接跳转连同其四个未提升的块一起被报告
- Ghidra 夹具包含那个 16 字节返回、那个 `param_3`、未化简的 `xor` 以及 `long param_1`
- 发出的六个单元在 `x86_64-unknown-linux-gnu` 下用 `clang -std=c11 -Wall -Werror` 编译通过
- 提升出的函数、修复后的 Ghidra 文本以及源代码，在输入网格上打印出相同的 232 行

## 生产失败模式

| 失败 | 弱读法报告的内容 | 推导过程必须展示的内容 |
|---|---|---|
| 反编译器加宽了返回值 | “返回一个 16 字节结构体” | `idivl` 写入 `%rdx`，而没有调用者来固定宽度 |
| 反编译器加了一个参数 | “接收三个参数” | 因为返回宽度是猜的，所以该寄存器只在一条路径上被读取 |
| 惯用法未被识别 | “乘以一个魔数常量” | 乘数是 `2^s / d` 的向上取整，且误差界成立 |
| 惯用法被识别但丢了一个 `xor` | “默认值取决于输入” | `xorl %eax, %eax` 写入零，一个位的两种写法互相抵消 |
| 指针被定为整数类型 | “接收一个 long” | 从该寄存器做的带比例因子的 4 字节加载就是指针证据 |
| 表长度未知 | “读到表外去了” | 下一个被引用的偏移或节末界定了它，且范围检查与之吻合 |
| 循环形态被误读 | “while 循环” | 循环头没有出口，闩锁块跳回去，所以它是 `do while` |
| 间接跳转被猜测 | “带五个 case 的 switch” | 目标来自 `.rela.rodata`，否则该跳转被报告为未解析 |
| 跨越一次存储的代入 | “一个表达式” | 一个被加载的值越过一次存储或一次调用会改变含义 |
| 精修模型编辑了文本 | “能编译而且看着对” | 构建通过率上升、行为匹配下降，被虚构的守卫替换了可见的未知项 |
| 解码器猜测了一个未知操作码 | “反汇编看着没问题” | 带地址和字节的 `DecodeError`，然后一个对照 `llvm-objdump` 检查过的表条目 |

## 操作规则

把伪代码当作一条你尚未见过的推导链。用一个你能读懂的提升器从指令里把它重现出来。把两段文本并排放置，为每一处有差异的行写清背后的指令或猜测。两者都编译，并在你有源代码时都对照源代码运行。一行若背后没有指令支撑，那么无论它读起来多干净，它都仍然是一个猜测。

## 延伸阅读

- [Intel SDM Volume 2, chapter 2, Instruction Format](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)
- [System V AMD64 psABI, section 3.2, Function Calling Sequence](https://gitlab.com/x86-psABIs/x86-64-ABI)
- [Cytron et al., Efficiently Computing Static Single Assignment Form and the Control Dependence Graph, TOPLAS 1991](https://doi.org/10.1145/115372.115320)
- [Cooper, Harvey, Kennedy, A Simple, Fast Dominance Algorithm, 2001](https://www.cs.tufts.edu/~nr/cs257/archive/keith-cooper/dom14.pdf)
- [Cifuentes, Reverse Compilation Techniques, PhD thesis, QUT 1994](https://eprints.qut.edu.au/36820/)
- [Yakdan et al., No More Gotos, NDSS 2015](https://www.ndss-symposium.org/ndss2015/ndss-2015-programme/no-more-gotos-decompilation-using-pattern-independent-control-flow-structuring-and-semantics/)
- [Granlund, Montgomery, Division by Invariant Integers using Multiplication, PLDI 1994](https://doi.org/10.1145/178243.178249)
- [Lee, Avgerinos, Brumley, TIE, NDSS 2011](https://www.ndss-symposium.org/ndss2011/tie-principled-reverse-engineering-of-types-in-binary-programs/)
- [Noonan, Loginov, Cok, Polymorphic Type Inference for Machine Code, PLDI 2016](https://arxiv.org/abs/1603.05495)
- [LLM4Decompile, EMNLP 2024](https://arxiv.org/abs/2403.05286)
- [DecompileBench, Findings of ACL 2025](https://aclanthology.org/2025.findings-acl.1194/)
- [Liu, Raff, Micinski, When LLM Decompilers Recompile More and Preserve Less, 2026](https://arxiv.org/abs/2609.05370)
- [rea 6.5.0 Ghidra provider notes](https://github.com/morluto/rea/blob/rea-agents-6.5.0/docs/ghidra-provider.md)
- rea 6.5.0 源码位于本课所描述的 tag `3b79af2`：`src/domain/functionComparisonDimensions.ts`、`website/evidence/dx-ball-sound-pan.md`。
