---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/39-compiler-idioms-and-optimization/docs/en.md
  revision: f7aadc1d61a9fbbe2bdb107d1e2bf0a6caeea299
  sha256: 9a128279f8aafc167912d8d82e11579d15a9af5fc6eac78c4ab076a759b4b245
status: reviewed
---

# 编译器惯用法：优化对你的代码做了什么，以及如何把它读回来

> 优化编译器把源代码结构替换成更廉价的指令形状。每种形状都有一条推导，而本课构建的识别器会把这条推导倒着跑一遍，并对照源代码检查它。

**类型：** 构建
**语言：** Python、C、x86-64 汇编、AArch64 汇编
**前置要求：** Phase 13 · 第 33 课（反汇编与控制流）、Phase 13 · 第 34 课（提升为伪代码）、Phase 13 · 第 38 课（调用约定）
**预计时间：** 约 150 分钟

## 学习目标

- 用 Granlund-Montgomery 界为除以任意常数推导魔数和移位量，并从 clang 发出的常量恢复出除数。
- 说出 LLVM 降低一个 `switch` 的五种方式，并从目标文件读出条目数、表的位置和条目内容。
- 把一个向量化循环读作通道、累加器、每次迭代的元素数、trip-count 掩码、归约和余数循环。
- 识别尾调用、内联的被调用者、无分支选择，以及变成了 `memset` 或 `memcpy` 的循环。
- 在 x86-64 和 AArch64 上、从 `-O0` 到 `-O3`，把每个惯用法连同它的证据指令和解码出的源代码形式一起报告。
- 把结果与 Ghidra、angr、radare2、rizin 和 lldb 对同样字节所显示的内容作比较。

## 问题所在

你把 `idioms.c` 编译为 `-O2`，并问一个智能体 `div7u` 做什么。智能体读到 `imulq $0x24924925, %rax, %rax`，回答说这个函数乘以 613566757、移位再相加。每个字都对。这个函数计算的是 `x / 7`。

同一个目标文件里还有：一个有七个 case 却完全没有跳转的 `switch`，一个有五个 case 的跳转表 `switch`，一个有两个 case、用 `sete` 和 `cmovne` 实现的 `switch`，以及一个对 `n` 个整数的循环——它每次迭代用两个 `xmm` 寄存器处理八个整数，然后在第二个循环里收尾剩下的部分。在 `-O0` 下同样的源代码产生了 `divl`、七条目跳转表和一个标量循环。在 `-O1` 下，七个 case 的 switch 变成了一张值表，而向量循环还不存在。

这些形状是惯用法。编译器根据你能在它源代码里读到的某条规则发出其中每一种，而每一种都能被解码回它所来自的那个结构。这个解码过程是算术，而算术是可以检查的。第 34 课证明了其中之一，即乘以 `0x66666667`。本课为所有这些形状构建识别器，在我们自己代码的 18 个构建上运行它，并把全部 373 份报告对照 C 源代码加以验证。

```figure
re-39-idioms-by-level
```

## 一个惯用法是一个带推导的形状

一个惯用法是编译器为某个源代码结构发出的一串指令。三样东西使它可识别。它有一个固定的形状，它的操作数携带着推导所预测的常量，而且这个形状不同于程序员会手写的样子。

`code/main.py` 中的识别器工作在 `llvm-objdump -d -r` 的文本上，第 33 课已把它确立为指令边界的判定基准。它把每个函数解析为带地址、字节、助记符、操作数以及其后那一行重定位的指令。它只为两样东西读取目标文件：`.rodata` 的字节（值表存放在那里），以及 `.rela.rodata` 条目（跳转表目标在链接之前存放在那里）。

每次检测都是一条 `Idiom` 记录，带一个 `kind`、一个解码出的 `source` 形式、一个 `evidence` 地址列表、一个 `detail` 字典和一个 `verified` 标志。该标志来自 C 源代码。`parse_source()` 读取 `idioms.c`，找到每个函数，并抽取 `/` 和 `%` 之后的除数、`*` 之后的乘数、`switch` 的 case 及其值、`? :` 运算符、`for` 循环和被调用者。当一个除法惯用法的除数在该函数的除法列表中时，它就被验证。当一张查找表的条目与 case 值（相差一个常数因子以内）匹配时，它就被验证。当被调用者在源代码中被调用时，一个尾调用就被验证。演示报告以一个 `unverified` 列表结尾，而测试套件断言该列表对全部 18 个构建都为空。

解码需要名称。识别器在每个函数的基本块上、按列表顺序运行一个小型符号求值器，并把源代码中的参数名放入第 38 课的 System V 和 AAPCS64 约定的参数寄存器中。栈槽按它们的操作数文本跟踪，这样 `-O0` 代码就能透过它的溢出读取。在每个块入口处，各前驱的状态被合并，而在它们不一致处，由某个更早的惯用法赋予的名称胜过一个常量。这就是 `digest` 中的 `cmovll %edx, %eax` 为何读回为 `sum % 10 < 5 ? sum % 10 : 5`：循环惯用法把累加器命名为 `sum`，除法惯用法把它的商命名为 `sum / 10`，模惯用法把它的结果命名为 `sum % 10`。源代码写的是 `rem > 5 ? 5 : rem`。两个表达式都给出 `rem` 和 5 中较小的那个，并且在 `rem == 5` 处一致。

## 除以一个常数

Granlund 和 Montgomery 在《Division by Invariant Integers using Multiplication》（PLDI 1994）中，把 `n / d` 替换为一次乘法和一次移位。选一个移位量 `s` 和一个乘数 `m = ceil(2^s / d)`。那么当误差 `e = m * d - 2^s` 足够小时，对范围内的每个 `n`，`floor(n * m / 2^s)` 都等于 `floor(n / d)`。对无符号 32 位 `n`，界是 `e <= 2^(s - 32)`。对满足 `|n| < 2^31` 的有符号 `n`，界是 `e <= 2^(s - 31)`，并且当 `n` 为负时，一个符号修正会加 1，因为对负商来说 floor 的舍入方向错了。

`main.py` 中的 `magic_numbers(d, bits, signed)` 从 32 开始向上搜索 `s`，并返回第一个满足该界的数对。这个搜索重现了 clang 在测试夹具中发出的每一个常量。

### 手工算无符号 10

`2^35 / 10 = 3435973836.8`。向上取整是 `3435973837 = 0xCCCCCCCD`。误差是 `0xCCCCCCCD * 10 - 2^35 = 2`，而 `s = 35` 处的界是 `2^3 = 8`。在 `s = 34` 处误差会是 6、而界是 4，所以 35 是最小的移位量。用 `n = 123` 检验：`123 * 3435973837 = 422624781951`，而 `422624781951 >> 35 = 12`。

clang 在 x86-64 上为 `-O2` 的 `div10u` 发出的正是这个：

```text
       0: 89 f9                        	movl	%edi, %ecx
       2: b8 cd cc cc cc               	movl	$0xcccccccd, %eax
       7: 48 0f af c1                  	imulq	%rcx, %rax
       b: 48 c1 e8 23                  	shrq	$0x23, %rax
```

`0x23` 是 35。`movl %edi, %ecx` 把 32 位参数零扩展进一个 64 位寄存器，这是无符号的形式。识别器从喂给两操作数 `imulq` 的 `movl $imm` 读出乘数，读出移位量，并调用 `divisor_from_magic(0xCCCCCCCD, 35)`。那个函数尝试 `2^35 // m = 10` 和 11，并接受 10，因为 `magic_numbers(10)` 又给回了同样的乘数和移位量。

在 AArch64 上同一个函数是 `mov w8, #0xcccd; movk w8, #0xcccc, lsl #16; umull x8, w0, w8; lsr x0, x8, #35`。常量以两个 16 位半字到达，乘法是 `umull`，移位量用十进制书写。识别器拼装这两个半字并报告同样的除数。

### 手工算无符号 7，带加法修正

`2^35 / 7 = 4908534052.57`。向上取整是 `4908534053 = 0x124924925`，它需要 33 位。误差是 3、界是 8，所以移位量是 35，没有更小的移位量可用。一个 32 位乘法容不下这个乘数，所以编译器乘以低 32 位 `0x24924925`，并在一个固定序列中把被除数加回来：

```text
      32: 48 69 c0 25 49 92 24         	imulq	$0x24924925, %rax, %rax
      39: 48 c1 e8 20                  	shrq	$0x20, %rax
      3d: 29 c7                        	subl	%eax, %edi
      3f: d1 ef                        	shrl	%edi
      41: 01 f8                        	addl	%edi, %eax
      43: c1 e8 02                     	shrl	$0x2, %eax
```

把它读作 `t = (n * 0x24924925) >> 32`，然后 `q = (((n - t) >> 1) + t) >> 2`。总移位量是 `32 + 1 + 2 = 35`。用 `n = 100`：`t = 14`，`(100 - 14) >> 1 = 43`，`43 + 14 = 57`，`57 >> 2 = 14`。识别器在一次 32 位移位之后检测 `sub`、`shr`、`add`、`shr` 的尾部，把 `2^32` 加回乘数，并恢复出 7。`evaluate_division()` 运行这个确切的序列，而测试在 32 位边界值上对照 `n // 7` 检查它。AArch64 形式是 `sub w9, w0, w8; add w8, w8, w9, lsr #1; lsr w0, w8, #2`，少一条指令，因为带移位的加法是一条指令。

### 手工算有符号 3

`2^32 / 3 = 1431655765.33`，向上取整 `1431655766 = 0x55555556`，误差 2，而 `s = 32` 处的有符号界是 `2^1 = 2`。这个界恰好成立、毫无余地，所以移位量是 32，clang 使用 `shrq $0x20`。用 `n = -7`：乘积是 `-10021590362`，按 32 位做算术移位得到 `-3`，符号位被置位，所以修正加 1，结果是 `-2`，这正是 C 中的 `-7 / 3`。有符号测试夹具 `div10s` 和 `div3s` 都把修正携带为对乘积副本的 `shrq $0x3f`，其后跟着 `addl`。

### 这些常量不是什么

单凭乘数无法命名任何除数。`0x66666667` 配移位量 34 是 10。同一个乘数配移位量 33 是 5，正如第 34 课所示。因此识别器总是把乘数与总移位量配对，而 `clangMatchesAlgorithm` 字段记录这个数对就是搜索所产生的那个。2 的幂从不使用这个乘法。`magic_numbers()` 拒绝它们，因为编译器改为发出一个带符号偏置的移位，而下一节的 `mod8s` 展示了那种形状。

### 这个惯用法属于指令选择器

在 `-O0` 下，`div10u` 是 `movl $0xa, %ecx; xorl %edx, %edx; divl %ecx`。`div10s` 是 `cltd; idivl %ecx`。在同一个目标文件里，`digest` 用 `imulq $0x66666667` 把它的循环和除以 10。一个标志解释了这个差异。测试夹具 `idioms-x86_64-nofastisel-O0.o` 是用 `-O0 -mllvm -fast-isel=false` 构建的，在它里面每一次除法都是那个乘法，包括用 `movl $0xcccccccd, %ecx; imulq %rcx, %rax; shrq $0x23` 实现的 `div10u`。硬件除法是快速指令选择器在 `-O0` 下的选择。乘法是 SelectionDAG 的降低方式，也就是 LLVM 的 `UnsignedDivisionByConstantInfo` 和 `SignedDivisionByConstantInfo` 所产生的东西。持有那次除法的 `digest` 块同时也持有一个 `switch`，而那个块进了 SelectionDAG。识别器报告这两种形式，`hardware idivl` 和 `magic multiply`，而图展示了那个混合的 `-O0` 函数。

## 模运算跟随商

`x % d` 是 `x - (x / d) * d`。编译器用上面的惯用法算出商，再乘回去，然后相减。在 x86-64 上乘回 10 是 `addl %ecx, %ecx; leal (%rcx,%rcx,4), %ecx`，即 `2 * q * 5`。在 AArch64 上它是一条指令，`msub w0, w8, w9, w0`，在 `w9 = 10` 时计算 `w0 - w8 * w9`。识别器顺着商寄存器穿过各次复制，通过 `add`、`lea`、`shl` 和 `imul` 跟踪累积的因子，并在该因子等于除数时接受一条 `sub`。

当同一个商还喂给另一个表达式时，两个惯用法都留在报告里。在 `-O1` 下，编译器在 `digest` 中把 `sum / 10` 算一次，并把它用于 `switch` 的索引和模运算。在 x86-64 上它甚至把商合并了两次，`leal (%rax,%rsi), %edi` 用于模运算、`addl %esi, %eax` 用于 switch。识别器报告一次除法和一次模运算，并把商标记为共享。一份在这里丢掉了除法的报告，会让 `switch` 索引变得无法读懂。

有符号模以 2 的幂有它自己的形状，因为商从不被算出：

```text
      92: 8d 48 07                     	leal	0x7(%rax), %ecx
      95: 85 ff                        	testl	%edi, %edi
      97: 0f 49 cf                     	cmovnsl	%edi, %ecx
      9a: 83 e1 f8                     	andl	$-0x8, %ecx
      9d: 29 c8                        	subl	%ecx, %eax
```

对一个负的 `x`，代码在掩码之前偏置 7，这样截断就按 C 的要求向零舍入。掩码后的值是 `x` 向下舍入到 8 的倍数，而相减留下 `x % 8`。AArch64 用 `negs w8, w0; and w9, w0, #0x7; and w8, w8, #0x7; csneg w0, w9, w8, mi` 做这件事：对 `x` 和 `-x` 都做掩码，然后按符号挑选并取负。Ghidra 把它对应这种情况的规则命名为 `RuleSignMod2nOpt`，简述为 "Convert INT_SREM forms: `(V + (sign >> (64-n)) & (2^n-1)) - (sign >> (64-n)) => V s% 2^n`"。

在 `-O0` 下 AArch64 把模运算写作 `sdiv w9, w8, w10; mul w9, w9, w10; subs w0, w8, w9`。识别器也接受那种形式，并报告 `hardware sdiv + mul + subs`。

## 降低一个 switch 的五种方式

LLVM 在两个地方决定 `switch` 的形状。`SimplifyCFG::simplifySwitchLookup` 在 `-O1` 及以上运行，当一个 switch 的各 case 都产生常量、且至少有三个 case、且目标能构建查找表时，它把这个 switch 变成一张值表。它的表种类有 `SingleValueKind`、`LinearMapKind`、`BitMapKind` 和 `ArrayKind`。`-O0` 流水线从不运行这个处理过程。其余的 switch 到达指令选择中的 `SwitchLowering::findJumpTables`，当簇至少有 `min-jump-table-entries` 个条目（默认 4）且足够稠密时，它构建一张跳转表：`NumCases * 100 >= Range * MinDensity`，普通函数的 `jump-table-density` 为 10，`-Os` 下为 40。剩下的变成对 case 常量的二分查找，由 `splitWorkItem` 选择枢轴。测试夹具为每种结果各保留了一个函数。

| 函数 | 源代码 | `-O0` x86-64 | `-O2` x86-64 | `-O2` AArch64 |
|---|---|---|---|---|
| `linear_switch` | case 0 到 6 返回 10 到 70 | 跳转表，7 条目 | 线性映射 `10*k + 10`，默认 -1 | `madd` 和 `csinv` |
| `table_switch` | case 0 到 6 返回 10 到 60 再到 71 | 跳转表，7 条目 | `.rodata+0x28` 处的查找表 | `.rodata+0x0` 处的查找表 |
| `call_switch` | case 0 到 4 调用五个指针之一 | 跳转表，5 条目 | 跳转表，5 条目 | 比较树，枢轴 1 |
| `sparse_switch` | case 1、100、10000、1000000、100000000 | 比较链 | 比较树，枢轴 9999 | 比较树，枢轴 9999 |
| `two_cases` | case 3 和 4 返回 7 和 9 | 比较链 | 选择链 `k != 3 ? (k == 4)*9 : 7` | 两个 `csel` |

### 查找表，从目标文件读出

`table_switch` 在 `-O2` 下：

```text
      d0: b8 ff ff ff ff               	movl	$0xffffffff, %eax
      d5: 83 ff 06                     	cmpl	$0x6, %edi
      d8: 77 0c                        	ja	0xe6 <table_switch+0x16>
      da: 89 f8                        	movl	%edi, %eax
      dc: 48 8d 0d 00 00 00 00         	leaq	(%rip), %rcx
		00000000000000df:  R_X86_64_PC32	.rodata+0x24
      e3: 8b 04 81                     	movl	(%rcx,%rax,4), %eax
      e6: c3                           	retq
```

边界检查 `cmpl $6; ja` 意味着 7 个有效条目。重定位加数 `0x24` 加上 RIP 相对字段的 4 字节，把表放在 `.rodata+0x28` 处，这就是第 33 课推导出的规则。那里的字节是 `0a 00 00 00 14 00 00 00 ...`，所以条目是 `[10, 20, 30, 40, 50, 60, 71]`，并且它们等于源代码的 case 值。汇编器在 `.s` 文件里把这张表命名为 `.Lswitch.table.table_switch`，带一个注释 `@switch.table.table_switch`。在目标文件里只剩下重定位和字节。这里没有跳转，所以控制流图有三个块。

AArch64 形式用 `adrp x8` 和 `add x8, x8, #0x0` 一起拼出表地址，每条各携带它自己到 `.rodata` 的重定位，并用 `ldr w0, [x8, w0, uxtw #2]` 加载。识别器从 `add` 的重定位读出加数。

### 线性映射，完全没有表

`linear_switch` 对 0 到 6 中的 `k` 返回 `10 * (k + 1)`。`simplifySwitchLookup` 检测到这个仿射关系并发出算术：

```text
      b0: 83 ff 07                     	cmpl	$0x7, %edi
      b3: 8d 04 bf                     	leal	(%rdi,%rdi,4), %eax
      b6: 8d 4c 00 0a                  	leal	0xa(%rax,%rax), %ecx
      ba: b8 ff ff ff ff               	movl	$0xffffffff, %eax
      bf: 0f 42 c1                     	cmovbl	%ecx, %eax
```

求值器把 `leal (%rdi,%rdi,4)` 读作 `5*k`，把 `leal 0xa(%rax,%rax)` 读作 `10*k + 10`，把 `cmpl $7` 之后的 `cmovb` 读作 `k < 7 ? 10*k + 10 : -1`。然后识别器对照每个源代码 case 检查这个公式，并把该惯用法标记为已验证。AArch64 用 `madd w8, w0, w8, w9` 和 `csinv w0, w8, wzr, lo` 到达同一个表达式，其中带 `wzr` 的 `csinv` 在默认路径上产出 `-1`。

### 跳转表，从重定位读出

`call_switch` 在 `-O2` 下是第 33 课在 `-O0` 的 `grade` 中恢复出的那个形状：`cmpl $4; ja`，一个到 `.rodata-0x4` 的 `leaq`，一个 4 字节条目的 `movslq`，一个 `addq`，再加一个 `jmpq *%rax`。这五个条目是 `.rela.rodata` 中的重定位，而 `target = addend - 4k` 给出 `0x10c, 0x107, 0x10e, 0x110, 0x109`，五个不同的块，每个都通过一个函数指针做尾跳转。`dispatch` 测试夹具把它放大到 16 个 case：x86-64 上 16 个重定位条目，而 AArch64 上是一张压缩的 16 字节单字节表，用 `ldrb w11, [x9, x8]` 读取、用 `add x10, x10, x11, lsl #2` 按 4 缩放，并以第一个 case 块的 `adr` 为基址。识别器从字节表解码出 `[0x24, 0x74, 0x54, ...]`，并报告 `compressed: true`。

### 同一个 switch 在四个级别

`digest` 持有一个对 `sum / 10` 的 switch，case 从 6 到 10、值为 1、2、4、8、8，然后把结果乘以 16。在 x86-64 上它在 `-O0` 下是跳转表，在 `-O1` 下是条目为 `[16, 32, 64, 128, 128]` 的查找表，而在 `-O2` 和 `-O3` 下又是跳转表，其四个 case 块分别存储 `0x10`、`0x20`、`0x40`、`0x80`。从 `-O1` 往上，乘以 16 的操作已经移进了各个 case。在 `-O0` 下，各 case 存储 1、2、4 和 8，而乘法留在 switch 之后。对 `-O1` 的查找表，识别器把条目与源代码值作比较，发现一个常数比例，并报告 `foldedFactor: 16`。在 AArch64 上 `-O2` 形式是一棵比较树，枢轴在 8，对 6、7、8 做相等测试，并用一个范围测试 `sub w9, w9, #9; cmp w9, #2; b.hs` 在两条指令中覆盖 case 9 和 10。识别器报告 `rangeTests: [[9, 10]]`。

两个标志移动这些边界。`-fno-jump-tables` 在 x86-64 上把 `table_switch`、`call_switch` 和 `digest` 的 switch 变成比较树，七个 case 的函数用枢轴 2 和 4。在 AArch64 上，`-mllvm -min-jump-table-entries=4` 让 `call_switch` 保持为比较树，所以在那个目标上，条目数不是五个间接调用 case 的 switch 的决定性输入。测试夹具 `idioms-arm64-jt4-O2.o` 记录了那次运行。

GCC 把这两个决定都放在 `tree-switch-conversion.cc` 里，带有类 `jump_table_cluster`、`bit_test_cluster`、`switch_decision_tree` 和 `switch_conversion`。它的 `-ftree-switch-conversion` 在 `-O2` 开启，`-fjump-tables` 和 `-fbit-tests` 在 `-O1` 开启，而跳转表阈值来自 `case-values-threshold`，其默认值是机器的值。这台机器上没有安装 GCC，所以那些名称来自 GCC 的源代码和手册，而 Compiler Explorer 是你核对它们的地方。

## 循环：被向量化、被展开，或被替换

LLVM 的循环向量化器在 `-O2`、`-O3` 和 `-Os` 下开启，在 `-O0` 和 `-O1` 下关闭，这是一条可追溯到 2014 年 1 月 LLVM 3.4 的规则。`sum_n` 在 `-O2` 下展示了这个形状的每一部分：

```text
     1f6: 83 fe 07                     	cmpl	$0x7, %esi
     1f9: 77 09                        	ja	0x204 <sum_n+0x14>
     206: 81 e2 f8 ff ff 7f            	andl	$0x7ffffff8, %edx
     230: f3 0f 6f 14 37               	movdqu	(%rdi,%rsi), %xmm2
     235: 66 0f fe c2                  	paddd	%xmm2, %xmm0
     239: f3 0f 6f 54 37 10            	movdqu	0x10(%rdi,%rsi), %xmm2
     23f: 66 0f fe ca                  	paddd	%xmm2, %xmm1
     243: 48 83 c6 20                  	addq	$0x20, %rsi
     24a: 75 e4                        	jne	0x230 <sum_n+0x40>
     24c: 66 0f fe c8                  	paddd	%xmm0, %xmm1
     250: 66 0f 70 c1 ee               	pshufd	$0xee, %xmm1, %xmm0
     262: 66 0f 7e c8                  	movd	%xmm1, %eax
     270: 03 04 97                     	addl	(%rdi,%rdx,4), %eax
     279: 75 f5                        	jne	0x270 <sum_n+0x80>
```

守护 `cmpl $7; ja` 把小于 8 的 trip 计数送往标量循环。掩码 `andl $0x7ffffff8` 把 trip 计数向下取整到 8 的倍数。循环体每次迭代把 32 字节加载进两个 `xmm` 累加器，每个四个 32 位通道，所以向量化因子是 4、交错因子是 2。循环之后，`paddd`、两个 `pshufd`、再两个 `paddd` 和 `movd` 把八个通道归约为一个整数。`0x270` 处的循环是处理最后 0 到 7 个元素的标量余数。识别器从循环的回边找到循环，看到 SIMD 寄存器，从 `paddd` 读出通道数，数出不同的累加器，把步长 `0x20` 除以 4，并报告 `4 lanes x 2 accumulators = 8 elements per iteration`，并把掩码、守护、归约和余数循环作为字段。AArch64 用 `ldp q2, q3`、两个 `add v.4s`、`addv s0, v0.4s` 和 `fmov w8, s0` 做同样的事。

一个固定的 trip 计数会消除循环。`sum4` 是一个 `movdqu`、归约和 `movd`，没有回边。`poly8` 无法向量化，因为每次迭代都依赖上一个累加器，所以编译器把它展开八次：从 `%rdi` 偏移 0 到 `0x1c` 的八次加载，每次后面跟着一次移 5 位和一次减法，共同计算 `acc * 31`。识别器数出一个基址上连续偏移处的加载，并报告 `loop unrolled by 8, no back edge`。在 AArch64 上同样的加载以四个 `ldp` 对到达。

用 `-fno-vectorize -fno-slp-vectorize` 关掉向量化器，`sum_n` 就变成一个展开 8 次的标量循环，带八条 `addl k(%rdi,%rdx,4), %eax` 和 `addq $8`，外加一个余数循环。`sum4` 变成四次加法。识别器对第一个报告 `unrolled loop`，带 `copies: 8` 和 `indexStep: 8`，对第二个报告 `copies: 4`。

第 33 课在 `-O2` 的 `total` 中发现两条回边，并把它们称为两个循环。本课为它们命名：同一个源代码循环的一个向量体和一个标量余数。只有当一条回边的目标能再次到达它时，它才是一个循环。`is_loop()` 检查这一点，因为 `digest` 在 AArch64 上包含指向一个共享默认块的后向分支，而它们不是循环，第一版识别器把它们当成了向量循环。

### 变成库调用的循环

`LoopIdiomRecognize` 从 `-O1` 往上，把一个向每个字节写入零的循环变成一次 `memset` 调用。`fill` 在 `-O2` 下是 `testl %esi, %esi; jle; movl %esi, %edx; xorl %esi, %esi; jmp memset@PLT`。这次调用是一个带重定位 `R_X86_64_PLT32 memset-0x4` 的尾跳转，而函数的 `retq` 只在空路径上。识别器报告 `store loop recognized as memset(...)`，并对照源代码循环验证它，因为源代码从不命名 `memset`。

`copy16` 用常量 16 调用 `memcpy`，而 x86 后端把它内联展开为 `movups (%rsi), %xmm0; movups %xmm0, (%rdi)`，在它每次 `memcpy` 8 次存储的上限之内。在 `-O0` 下同样的调用是两对 8 字节 `movq`。用 `-fno-builtin`，这次调用保持为一次调用，`jmp memcpy@PLT` 带 `movl $0x10, %edx`，而 `fill` 保留它的循环，接着向量化器把它变成一个每次迭代两次 16 字节 `movups` 存储的循环。识别器对那个构建报告 `vectorized store loop: 2 x 16-byte stores = 32 bytes per iteration`。

## 消失的调用，或变成跳转的调用

`tail_caller` 返回 `tail_target(x + 1)`。在 `-O0` 下它是 `addl $0x1, %edi; callq tail_target@PLT; addq $0x10, %rsp; popq %rbp; retq`。在 `-O2` 下它是 `incl %edi; jmp tail_target@PLT`，别无其他。调用者的帧没了，而被调用者返回到调用者的调用者。在 AArch64 上这个跳转是 `b tail_target`，带 `R_AARCH64_JUMP26`。识别器把一个携带 call 重定位的 `jmp` 或 `b` 当作尾调用。第 33 课的递归下降必须把它当作一个函数出口，因为目标在函数之外。

`twice_sum` 调用 `leaf_add`。在 `-O0` 下调用就在那里，`callq leaf_add@PLT`。从 `-O1` 起，`leaf_add` 的函数体 `leal (%rdi,%rsi), %eax` 出现在 `twice_sum` 内部，不再有调用。在 `-O0` 下 clang 把每个函数标记为 `optnone` 和 `noinline`，只运行始终内联器。识别器从源代码知道 `twice_sum` 调用 `leaf_add`，发现没有对它的调用或尾跳转，然后在调用者中寻找被调用者的函数体形状：去掉目的操作数之后的助记符和源操作数，这样 AArch64 调用者中的 `add w8, w1, w0` 就匹配被调用者中的 `add w0, w1, w0`。一次匹配就是证据。

`dispatch` 把两者结合：一张 16 条目的跳转表，其每个 case 都是 `movl %esi, %edi; jmp fN@PLT`。识别器报告一个 switch 和 16 个尾调用，全部对照源代码中的 16 次调用验证通过。

## 变成数据移动的分支

`clamp_max` 是 `movl %esi, %eax; cmpl %esi, %edi; cmovgl %edi, %eax`。求值器把 `%edi` 命名为 `a`、把 `%esi` 命名为 `b`，记录比较，并把 `cmovg` 读作 `a > b ? a : b`，这正是源代码文本。`abs_int` 是 `movl %edi, %eax; negl %eax; cmovsl %edi, %eax`，读作 `-x < 0 ? x : -x`；AArch64 把它写作 `cmp w0, #0; cneg w0, w0, mi`，读作 `x < 0 ? -x : x`。`is_pos` 是 `xorl %eax, %eax; testl %edi, %edi; setg %al`，读作 `(x > 0)`。用 GCC 的话说这些是 `-fif-conversion`，用 LLVM 的话说是 `cmov` 选择。LLVM 的 `X86CmovConversion` 处理过程在判断有利可图时，能把一个 `cmov` 变回分支，这就是同样的源代码在循环中既可能显示这种形状又可能显示另一种的原因。

在 `-O0` 下这些都不存在。`clamp_max` 是一个比较、一个 `jle`、两次对同一个槽的存储和一次加载。识别器对它在 `-O0` 下什么都不报告，从 `-O1` 起报告 `branchless select`，这是图所呈现的事实之一。

`mul9` 是一个 `leal (%rdi,%rdi,8), %eax`，而识别器报告 `strength reduction`，带 `x * 9`，因为源代码乘以 9。它只有在源代码带有这个因子时才这么做；一个缩放表索引的 `lea` 不是乘法。

## 两个看起来像惯用法的加固特性

栈保护是一个编译器特性，它留下一个形状，而智能体不然就会把它读成程序逻辑。`canary.c` 用 `-fstack-protector-strong` 为 x86-64 Linux 编译得到：

```text
       7: 64 48 8b 04 25 28 00 00 00   	movq	%fs:0x28, %rax
      10: 48 89 44 24 40               	movq	%rax, 0x40(%rsp)
      26: 64 48 8b 0c 25 28 00 00 00   	movq	%fs:0x28, %rcx
      2f: 48 3b 4c 24 40               	cmpq	0x40(%rsp), %rcx
      34: 75 05                        	jne	0x3b <with_canary+0x3b>
      3b: e8 00 00 00 00               	callq	0x40 <plain_leaf>
		000000000000003c:  R_X86_64_PLT32	__stack_chk_fail-0x4
```

`%fs:0x28` 是 glibc `tcbhead_t` 中的 `stack_guard`，位于字节偏移 40 处，而 LLVM 的 `getIRStackGuard` 为 glibc、bionic 和 Fuchsia 命名那个槽。序言把守护值复制到缓冲区之上，尾声做比较，而失败路径调用 `__stack_chk_fail`。在 AArch64 Linux 上，守护值通过 GOT 用 `adrp` 和 `ldr` 来自全局的 `__stack_chk_guard`，而失败是 `bl __stack_chk_fail`。识别器报告守护值来源、槽、比较和失败调用。没有数组的 `plain_leaf` 在 `strong` 下没有金丝雀，因为 `strong` 保护带有数组、`alloca` 或地址被取的局部变量的函数。研究笔记还记录了 `/GS` 下的 MSVC 形式，一个与 `%rsp` 混合、由 `__security_check_cookie` 检查的 cookie；这台机器上没有 MSVC 链接器，所以那个形状只依据编译器的汇编输出描述。

`-fcf-protection=full` 把 `endbr64`（字节 `f3 0f 1e fa`）放在每个函数的第一条指令。它是支持控制流强制执行的处理器上间接分支的落地垫，在别处作为一条 `nop` 执行。Ghidra 的 x86-64 函数起始模式因此包含了 `push rbp; mov rbp, rsp` 的带 `endbr64` 前缀的变体。识别器把它报告为 `cet landing pad`，这样一个以四个不寻常字节开头的函数就不会被误当成数据。

## 各反编译器折叠了什么

第 37 课中的每个反编译器都把这些推导中的一部分作为重写规则来运行。Ghidra 的反编译器在 `ruleaction.cc` 中为它们命名。`RuleDivOpt` 是 "Convert INT_MULT and shift forms into INT_DIV or INT_SDIV"，其形式为 `sub( (zext(V)*c), d) >> e => V / (2^n/(c-1)) where n = d*8 + e`，以及带 `sext` 和 `s>>` 的有符号变体。`RuleModOpt` 是 "Simplify expressions that optimize INT_REM and INT_SREM"。`RuleDivTermAdd` 处理加法修正，`RuleSignDiv2` 把 `(V + -1*(V s>> 31)) s>> 1` 变成 `V s/ 2`，而 `RulePositiveDiv` 把符号位清零的值的有符号除法变成无符号除法。第 37 课捕获了 Ghidra 12.1.4 对第 33 课 `-O1` 的 `grade` 的处理，输出读作 `uVar2 = param_1 / 10 - 6;`。除法被折叠了。

那些规则的输入无需 Java 即可见。venv 中的 pypcode 4.0.1 用 Ghidra 所用的同一份 SLEIGH 规范做提升，而 `code/fixtures/idioms-x86_64-O2.lifts.json` 持有 `div10s` 的原始 P-code：七条指令的 112 个条目，其中 7 个是开启每条指令的 `IMARK` 标记，其间有 `RAX = RAX * unique[95a00:8]`（在 `unique[95a00:8] = sext(0x66666667)` 之后）、`RCX = RCX >> unique[d1a00:4]`，以及 `RAX = RAX s>> unique[c5c00:4]`。`shrq` 携带 41 个操作，`sarq` 携带 40 个，其中大多数在计算标志位。`RuleDivOpt` 匹配这个流中的乘法和两次移位，而死代码消除移除了没人读取的标志位。

angr 10.0.3 在我们的 `-O2` 目标文件上运行，而 `idioms-x86_64-O2.angr.json` 持有它对 20 个函数的反编译器输出。它折叠无符号形式：`div10u` 是 `return a0 / 10;`。它不折叠有符号形式：`div10s` 是 `v1 = a0 * 1717986919; return ((long long)(v1) >> 0x22) + (v1 >> 63);`，而 `mod10s` 是 `a0 - (...) * 2 * 5`。对 `div7u` 它打印 `(a0 / 7 + ((a0 * 6 / 7 & 0xffffffff) >> 1 & 0xffffffff) & 0xffffffff) >> 2`，其中修正项以算术的形式存留下来。它把 `mul9` 折叠为 `a0 * 9`，把 `linear_switch` 折叠为 `(a0 < 7 ? a0 * 10 + 10 : 0xffffffff)`，把 `clamp_max` 折叠为 `((int)a1 < (int)a0 ? a0 : a1)`，把 `is_pos` 折叠为 `a0 > 0`，把 `fill` 折叠为 `return memset(a0, 0, a1);`。它把 `table_switch` 打印为一次加载 `*(int *)(4 * a0 + 4195400)` 而没有那些值，把 `sum_n` 打印为带 `_mm_add_epi32` 和 `_mm_shuffle_epi32` 内在函数，而把 `tail_caller` 打印为 `tail_target(); return;` 并丢失了参数。在 `digest` 中跳转表变成 `goto *((void *)(...))`，表的算术被写了出来。

radare2 6.2.4 和 rizin 0.9.1，从源代码构建进研究缓存，在同一个目标文件上运行。radare2 的 `pdc` 把 `div10s` 打印为 `rax = rax * 0x66666667; rcx >>>= 0x3f; rax >>= 0x22; eax += ecx`，寄存器级的伪 C、没有折叠，而把 `table_switch` 打印为 `eax = dword [rcx + rax*4]`，在 `lea` 上带一个 `RELOC 32 .rodata` 注释。rizin 没有内置反编译器；它的 `aoi` 把 `imul` 的 RzIL 打印为一个 128 位乘积。lldb-1703.0.236.21 加载这个 ELF 目标文件，它的 `disassemble -n div10s` 打印出与 `llvm-objdump` 相同的七条指令，因为两者都用 LLVM 的反汇编器。Capstone 5.0.7 解码同样的字节，并报告诸如 `ret` 和 `mode64` 这样的分组；它是一个解码器，而惯用法从不出现在解码器的输出里。IDA Pro 和 Binary Ninja 在这里没有运行。它们的文档描述了这种重写发生的阶段（微码优化以及 MLIL 到 HLIL 的处理过程），而本课对它们折叠哪些惯用法不作任何声明。

Compiler Explorer 是正向方向的工具。粘贴 `idioms.c`，挑一个编译器条目（例如 "x86-64 clang 18.1.0" 或 "ARM64 GCC 14.2.0"），并设置标志。该服务列出约 1,050 个 C 编译器条目，并有一个 API：`GET /api/compilers/c` 返回标识符，`POST /api/compiler/<id>/compile` 以 JSON 返回汇编。Matt Godbolt 2019 年的 ACM Queue 文章用这个工具走过了除法、人口计数、链式条件和求和等惯用法。用它来获取 GCC 输出（这台机器无法产生），并把 GCC 12 的 GCC 跳转表阈值和 `-O2` 向量化默认值与测试夹具中的 clang 输出作比较。

## 构建它

运行演示：

```bash
cd phases/13-tools-and-protocols/39-compiler-idioms-and-optimization
python3 code/main.py
```

输出是一份 JSON 报告。对于 18 个构建中的每一个，它列出每个函数及其惯用法，带 kind、源代码形式、证据地址、验证情况和 detail 字段。它以每个构建的 kind 矩阵、两种架构的 `-O2` 对 `-O3` 比较，以及 `unverified` 列表结尾。

期望形状：

```json
{
  "builds": {
    "idioms-x86_64-O2": {
      "arch": "x86_64", "level": "O2", "flags": "x86_64",
      "functions": {
        "div7u": [{"kind": "division", "source": "x / 7", "evidence": ["0x30", "0x32", "0x39", "0x3d", "0x3f", "0x41", "0x43"], "verified": true, "form": "magic multiply with add fix-up", "magic": "0x24924925", "effectiveMagic": "0x124924925", "shift": 35, "...": "..."}],
        "table_switch": [{"kind": "switch", "source": "switch (k) as lookup table", "table": ".rodata+0x28", "entries": 7, "values": [10, 20, 30, 40, 50, 60, 71], "...": "..."}],
        "sum_n": [{"kind": "vector loop", "lanes": 4, "accumulators": 2, "elementsPerIteration": 8, "...": "..."}]
      }
    }
  },
  "kindMatrix": {"idioms-x86_64-O2": {"division": 5, "modulo": 3, "switch": 6, "vector loop": 3, "...": "..."}},
  "sameCodeAtO2AndO3": {"x86_64": {"identical": true}, "arm64": {"identical": false, "differences": ["..."]}},
  "unverified": []
}
```

按此顺序阅读 `code/main.py`：

1. `parse_listing()` 把 `llvm-objdump -d -r` 文本转成两种架构的函数、指令和附带的重定位。
2. `ElfFile` 读取节、符号和 `.rela.*` 条目，`words()` 读取表条目。
3. `magic_numbers()`、`divisor_from_magic()` 和 `evaluate_division()` 分别是 Granlund-Montgomery 推导的正向、反向和指令序列形式。
4. `parse_source()` 从 C 文件中抽取验证所需的结构。
5. `Evaluator` 是逐块命名寄存器和栈槽的符号处理过程。
6. `find_divisions()` 和 `find_modulos()` 匹配乘法、移位、修正、乘回和 2 的幂等形式。
7. `find_switches()` 把跳转表、查找表、线性映射、选择链、比较树和比较链分类。
8. `find_vector_loops()`、`find_unrolled_loops()`、`find_tail_calls()`、`find_inlined_calls()`、`find_selects()`、`find_memory_builtins()`、`find_stack_protector()`、`find_cet()` 和 `find_strength_reduction()` 覆盖其余部分。
9. `analyze_function()` 按顺序运行它们，把每个惯用法的结果名称喂给下一遍求值。

还有三条命令。`python3 code/main.py scan FILE.objdump.txt [FUNCTION]` 在一份列表上运行识别器，目标文件和匹配的 C 文件在它旁边找到。`python3 code/main.py magic DIVISOR [signed]` 打印乘数、移位量、误差，以及恒等式是否在边界值上成立。`python3 code/main.py figure-data` 打印图所嵌入的数据。

## 使用它

在你构建的新目标文件上，按此顺序使用识别器。

1. 从目标文件捕获 `llvm-objdump -d -r`，并在它旁边保留确切的编译器命令。识别器从列表头部读取架构。
2. 在列表上运行 `scan`，先读 `unverified` 条目。每一个要么是源代码解析器没看到的结构、要么是识别器误读的形状，两者都值得去看证据地址。
3. 对每次除法，读 `algorithm` 字段。当 `clangMatchesAlgorithm` 为真时，编译器选了最小的有效移位量。当它为假时，编译器有一个你还不知道的理由；把常量写下来。
4. 对每个 switch，比较你所构建的各级别间的 `lowering`。一张表变成一棵树、或一棵树变成一张表，标记出一个你能从 LLVM 源代码命名的阈值。
5. 对每个循环，读 `elementsPerIteration` 和 `scalarRemainderLoop`，然后确认第 33 课报告的两条回边是一个源代码循环。
6. 在同一个目标文件上运行一个反编译器，把它的文本引在每个惯用法旁边，并记录它折叠了哪些。那份记录是第 45 课的基线。

## 交互实验

### 实验 A：推导一个魔数，然后找到它

在 `code` 目录中，打开 Python：

```bash
cd phases/13-tools-and-protocols/39-compiler-idioms-and-optimization/code
python3 -q
```

运行：

```python
from main import *
magic_numbers(10), magic_numbers(10, signed=True)
magic_numbers(7), magic_numbers(7, signed=True)
divisor_from_magic(0x66666667, 34, signed=True), divisor_from_magic(0x66666667, 33, signed=True)
```

在第一次调用之前在纸上算出 `ceil(2^35 / 10)`。然后向 `idioms.c` 的一个副本添加一个函数 `unsigned div13(unsigned x) { return x / 13; }`，用 `build_fixtures.sh` 中的命令在 `-O2` 下构建它，并把列表中的常量与 `magic_numbers(13)` 核对。

### 实验 B：表与树

```python
listing = load_listing("idioms-x86_64-O2.objdump.txt")
elf = load_elf("idioms-x86_64-O2.o")
sources = load_source("idioms.c")
[i.to_dict() for i in analyze_function(listing, "table_switch", elf, sources)]
[i.to_dict() for i in analyze_function(listing, "sparse_switch", elf, sources)]
elf.words(".rodata", 0x28, 7)
```

把 `table_switch` 的一个副本里的 `71` 改回 `70`，在 `-O2` 下重新构建，并观察查找表变成一个线性映射。然后把一个 case 值改成 1000，并观察它保持为一张 `ArrayKind` 表。

### 实验 C：三种设置下的循环

```python
for name in ("idioms-x86_64-O1", "idioms-x86_64-O2", "idioms-x86_64-novec-O2"):
    print(name, [i.source for i in analyze_function(load_listing(name + ".objdump.txt"), "sum_n", load_elf(name + ".o"), sources)])
```

手工画出 `sum_n` 在 `-O2` 下的控制流图，标出守护、掩码、向量体、归约和余数循环，并与 `detail` 字段作比较。

### 实验 D：共享的商

```python
for name in ("idioms-x86_64-O1", "idioms-arm64-O1"):
    print([(i.kind, i.source, i.detail.get("sharedQuotient")) for i in analyze_function(load_listing(name + ".objdump.txt"), "digest", load_elf(name + ".o"), sources)])
```

读 `digest` 的 `-O1` 列表，找出在 x86-64 上把商与它的符号修正结合起来的那两条指令。然后解释为什么 AArch64 构建只需要一条。

## 实践实验

向测试夹具添加位技巧，并扩展识别器。

要求：

- 用 GCC 内建函数以及一个移位或旋转写出 `popcount`、`ctz` 和 `rotl` 函数，在带和不带 `-mpopcnt -mbmi` 的情况下用 `-O2` 构建它们，并把目标文件连同它们的列表一起提交。
- 识别 `TargetLowering::expandCTPOP` 发出的 `0x55555555`、`0x33333333`、`0x0f0f0f0f`、`0x01010101` 人口计数序列，并把它报告为 `popcount`，以这四个常量为证据。
- 识别 `rep bsfl` 作为 `tzcnt`-或-`bsf` 编码、`roll %cl` 作为旋转，并把两者解码回内建函数。
- 把新的 kind 加入 `parse_source()` 的验证，使一个 `popcount` 惯用法只有在源代码调用 `__builtin_popcount` 时才被验证。
- 为每个惯用法添加一个从测试夹具列表读取常量的测试。

成功意味着 `python3 code/main.py` 在两个构建中都报告这三个新 kind 且 `verified: true`，而测试套件仍然报告一个空的 `unverified` 列表。

## 随课交付物

本课包含 `outputs/skill-compiler-idioms-and-optimization.md`。用它把一份列表、一个目标文件及其源代码，转化为一份带反编译器比较的、经过验证的惯用法报告。它要求每个声明都有证据地址，每次除法都有魔数推导，每个 switch 都有降低种类和条目来源，而每个惯用法都有一行引用的反编译器输出。

## 验证它

运行演示和确定性测试套件：

```bash
cd phases/13-tools-and-protocols/39-compiler-idioms-and-optimization
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

验证应证明：

- 列表解析器从 `-O2` 目标文件读出 25 个函数，保留字节，并把 `R_X86_64_PC32 .rodata+0x24` 附加到 `table_switch` 中的 `leaq`
- ELF 读取器从 `.rodata+0x28` 返回 `[10, 20, 30, 40, 50, 60, 71]`，并从 `.rela.rodata` 返回十个重定位
- `magic_numbers` 返回带移位量 35 的 `0xcccccccd`、带 34 的 `0x66666667`、带 35 和加法形式的 `0x124924925`、带 32 的 `0x55555556`，以及带 33 的 `0xaaaaaaab`
- 对从 2 到 64 的每个非 2 的幂的除数，恒等式在 32 位边界值上有符号和无符号都成立
- `divisor_from_magic` 从它们的数对恢复出 10、5、7 和 3，并拒绝一个错误的数对
- 加法修正序列精确计算 `n // 7`
- 四个 x86-64 除法报告正确的乘数、移位量、除数和形式，而四个 AArch64 除法解码 `mov` 和 `movk`
- `-O0` 使用 `divl` 和 `idivl`，`-O0 -fast-isel=false` 使用乘法，而 `digest` 在 `-O0` 下混用这两者
- 模运算被识别为乘回、`msub`、2 的幂、`sdiv` 加 `mul` 加 `subs`，以及硬件 `idivl`
- 一个共享的商在 `-O1` 下同时保留除法和模运算
- 这五种降低在两种架构上 `-O2` 时都被分类，带公式、值、目标、枢轴和选择表达式
- `-O0` 的 switch 在 x86-64 上是跳转表，在 AArch64 上是比较链
- `digest` 的 switch 是一张跳转表，然后是带折叠因子 16 的查找表，然后在 x86-64 上是带四个不同目标的跳转表，而在 AArch64 上是带范围测试 9 到 10 的比较树
- `-fno-jump-tables` 产生比较树，而 16 个 case 的 `dispatch` 在 x86-64 上从重定位读取它的目标、在 AArch64 上从一张压缩字节表读取
- 向量循环报告 4 个通道、2 个累加器、每次迭代 8 个元素、掩码、守护、归约和余数循环
- 固定 trip 的循环被完全向量化或完全展开，而 `-fno-vectorize` 展开 8 次
- `-O1` 没有向量化，`-O2` 和 `-O3` 在 x86-64 上相同，而在 AArch64 上它们只在 `call_switch` 上不同，那里 `-O3` 有 17 条指令、`-O2` 有 18 条
- `-fno-builtin` 把存储循环变成一个向量化存储循环，并让 `memcpy` 保持为一次调用
- 尾调用、`memset` 替换、内联的 16 字节复制和 `-O0` 的两次移动复制都被识别
- 内联的被调用者从 `-O1` 起按其函数体形状被找到
- 选择解码为 `a > b ? a : b`、`-x < 0 ? x : -x`、`(x > 0)` 和 `sum % 10 < 5 ? sum % 10 : 5`
- 栈保护报告 `%fs:0x28`、槽和 `__stack_chk_fail`，而 `endbr64` 在 CET 构建的每个函数上被报告
- 源代码解析器读取函数指针参数、switch 的 case、调用和累加器名称
- 每个构建中的每个惯用法都被验证，且 kind 矩阵相互匹配
- 交互式图嵌入了与分析所产生的相同数据

## 生产失败模式

| 失败 | 弱工具报告什么 | 分析必须证明什么 |
|---|---|---|
| 乘以一个大奇数常数 | "乘以 1717986919" | 该常量是某个 `d` 的 `ceil(2^s / d)`，误差满足界，且移位量是最小的有效值 |
| 32 位移位之后的加法修正 | 五条算术指令 | 乘数宽 33 位，而尾部是同一方法的加法形式 |
| 同样的乘数、不同的移位量 | 同样的除数 | 移位量选定除数：34 是 10，33 是 5 |
| 2 的幂有符号模 | "加 7，掩码，相减" | 偏置向零舍入，结果是 `x % 8` |
| 从 `.rodata` 做变址加载 | "一张跳转表" | 一张值的查找表，条目从加数加 4 处的字节读出 |
| 仿射算术和一个 `cmov` | "计算 10k + 10" | 一个降低为线性映射的 switch，对照每个源代码 case 验证 |
| 带有序分裂的比较链 | "一串 if" | 对 case 常量的二分查找，枢轴已命名 |
| 指向默认块的后向分支 | "一个循环" | 目标用一条无条件跳转离开该区域；它是一个共享尾部 |
| 一个函数中的两条回边 | "两个循环" | 一个源代码循环：向量体和它的标量余数 |
| 没有 `ret` 的 `jmp memset@PLT` | "该函数没有返回" | 一个通过被调用者返回的尾调用，替换了一个存储循环 |
| 被调用者从调用图中缺失 | "从不调用" | 已内联：被调用者的函数体形状出现在调用者中 |
| `%fs:0x28` 加载和比较 | "读取线程局部数据" | 栈保护金丝雀，失败路径指向 `__stack_chk_fail` |
| 函数起始处的四个奇怪字节 | "函数之前的数据" | `endbr64`，CET 落地垫 |
| 反编译器显示原始算术 | "工具错了" | 工具没有应用某个折叠；推导给出源代码形式，而引用的输出记录了这个差距 |

## 操作规则

匹配形状，把推导倒着跑一遍，并写下证明它的常量。把每个惯用法连同它的证据地址和解码出的源代码形式一起报告，对照你所编译的源代码验证每一个，并引用每个反编译器对同样字节打印出的内容。

## 延伸阅读

- [Granlund, Montgomery, "Division by Invariant Integers using Multiplication" (PLDI 1994)](https://gmplib.org/~tege/divcnst-pldi94.pdf)
- [Warren, Hacker's Delight, 2nd edition, Chapter 10: Integer Division By Constants](https://www.informit.com/store/hackers-delight-9780321842688)
- [Lemire, Kaser, Kurz, "Faster Remainder by Direct Computation" (2019)](https://arxiv.org/abs/1902.01961)
- [libdivide, header-only division by runtime constants](https://github.com/ridiculousfish/libdivide)
- [LLVM `DivisionByConstantInfo.cpp`](https://github.com/llvm/llvm-project/blob/main/llvm/lib/Support/DivisionByConstantInfo.cpp)
- [LLVM `SwitchLoweringUtils.cpp`](https://github.com/llvm/llvm-project/blob/main/llvm/lib/CodeGen/SwitchLoweringUtils.cpp) 和 [`TargetLoweringBase.cpp`](https://github.com/llvm/llvm-project/blob/main/llvm/lib/CodeGen/TargetLoweringBase.cpp)
- [LLVM `SimplifyCFG.cpp`, `simplifySwitchLookup`](https://github.com/llvm/llvm-project/blob/main/llvm/lib/Transforms/Utils/SimplifyCFG.cpp)
- [LLVM Auto-Vectorization documentation](https://llvm.org/docs/Vectorizers.html) 和 [LLVM 3.4 release notes](https://releases.llvm.org/3.4/docs/ReleaseNotes.html)
- [LLVM `LoopIdiomRecognize.cpp`](https://github.com/llvm/llvm-project/blob/main/llvm/lib/Transforms/Scalar/LoopIdiomRecognize.cpp)
- [LLVM `X86CmovConversion.cpp`](https://github.com/llvm/llvm-project/blob/release/20.x/llvm/lib/Target/X86/X86CmovConversion.cpp)
- [LLVM `StackProtector.cpp`](https://github.com/llvm/llvm-project/blob/main/llvm/lib/CodeGen/StackProtector.cpp) 和 [`X86ISelLoweringCall.cpp`, `getIRStackGuard`](https://github.com/llvm/llvm-project/blob/main/llvm/lib/Target/X86/X86ISelLoweringCall.cpp)
- [glibc `sysdeps/x86_64/nptl/tls.h`, `tcbhead_t`](https://sourceware.org/git/?p=glibc.git;a=blob;f=sysdeps/x86_64/nptl/tls.h)
- [GCC `tree-switch-conversion.cc`](https://github.com/gcc-mirror/gcc/blob/master/gcc/tree-switch-conversion.cc)、[GCC Optimize Options](https://gcc.gnu.org/onlinedocs/gcc/Optimize-Options.html) 和 [GCC 12 release notes](https://gcc.gnu.org/gcc-12/changes.html)
- [Ghidra decompiler `ruleaction.cc`](https://github.com/NationalSecurityAgency/ghidra/blob/master/Ghidra/Features/Decompiler/src/decompile/cpp/ruleaction.cc)
- [angr decompiler documentation](https://docs.angr.io/en/latest/analyses/decompiler.html)
- [radare2 book: decompilers](https://book.rada.re/arch/decompile.html)
- [Compiler Explorer API](https://github.com/compiler-explorer/compiler-explorer/blob/main/docs/API.md)
- [Godbolt, "Optimizations in C++ Compilers: A practical journey", ACM Queue 17(5), 2019](https://queue.acm.org/detail.cfm?id=3372264)
- [Microsoft, `/GS` (Buffer Security Check)](https://learn.microsoft.com/en-us/cpp/build/reference/gs-buffer-security-check)
