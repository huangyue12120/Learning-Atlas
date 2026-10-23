---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/36-rebuild-and-prove-equal/docs/en.md
  revision: f7aadc1d61a9fbbe2bdb107d1e2bf0a6caeea299
  sha256: 2b3afd9c4fa887b15bcd18626774da3d04f2fbc83d3d336d1a670fe9b232b3e7
status: reviewed
---

# 重建并证明等价：差分测试、字节比较与证据闭环

> 通过你的测试只证明了在你的测试上达成一致，所以证明等价需要一张覆盖每个边界的输入网格，以及在屏蔽重定位字段后仍然匹配的字节。

**类型：** 构建
**语言：** Python、C
**前置要求：** Phase 13 · 第 34 课（提升到伪代码）、Phase 13 · 第 35 课（证据、置信度与未知项）
**预计时间：** 约 110 分钟

## 学习目标

- 从指令清单写出重建实现，并指明它来自哪条证据记录。
- 构建一张输入网格，每种危险各占一类：零值防护、负值、截断除法、32 位溢出和一个除法陷阱。
- 在同一个程序里运行原始函数和重建实现，记录每个单元格，包括一次陷阱。
- 用原始的编译标志重新编译重建实现，并在屏蔽重定位字段后比较函数字节。
- 读取重定位指向的常量并逐一比较，使错误的字面量无法蒙混过关。
- 用一个小型 stdio 客户端驱动 rea 的 MCP 服务器，并为每一步记录它的证据 id。
- 铸造一份失败即关闭的证明记录，其 id 是对其声明和证据链接求出的哈希。

## 问题

你向 rea 请求了 `ledger-x86_64-O1.o` 测试夹具中 `percent_change` 函数的档案。Ghidra 12.1.4 返回了伪代码，智能体据此写出了这段 C：

```c
int percent_change(int before, int after) {
    if (before == 0) return 0;
    return (int)(((long)after - before) * 100 / before);
}
```

四个测试通过：`(100, 150)` 得到 50，`(200, 100)` 得到 -50，`(0, 5)` 得到 0，`(50, 100)` 得到 100。智能体还把 `grade` 重建成了四条针对 90、80、70 和 60 的 `if` 语句。又有六个测试通过。报告写着“verified”（已验证）。

那份报告没有回答下面这些问题：

- 当 `(after - before) * 100` 装不进 32 位时，原始函数返回什么？
- 对于 110 这个分数，原始函数返回什么？
- 重建实现是否编译成与原始函数相同的 16 个字节？
- 当两个编译后的函数持有相同字节时，它们的重定位是否指向相同的常量？
- 重建实现来自哪条证据记录，以及智能体读的是指令清单还是伪代码？
- 在没有 C 编译器的主机上，这份证明会得到什么状态？

本课中的每个目标都是我们自己编写并编译的程序。第 32 课的范围与法律规则在这里原样适用。

```figure
re-36-prove-equal
```

## 证据说了什么

`code/main.py` 中的智能体循环通过 stdio 向 rea 6.5.0 发起了六次调用。记录下来的这次运行是 `code/fixtures/runs/agent-run.json`。服务器用协议版本 `2025-11-25` 回应了 `initialize`。其中三次调用返回了 Evidence 记录：

| 步骤 | 工具 | 用时 | 证据 id |
|---|---|---|---|
| 2 | `analyze_function percent_change` | 6.31 s | `ev_e88b10dc0c6400e51bb6f7fdc3eaea8d2c97cc02463f0db3e6afeefc273197cd` |
| 3 | `analyze_function grade` | 0.02 s | `ev_67b6d3f992eaf49a2e16de084b6ebfdd9884e8c5c7f75e175b7bb20f4f748ce1` |
| 4 | `read_bytes 0x1000b4, 20` | 0.00 s | `ev_c26146cfedf4c1ee146d8ff00cfa9a5d3f5335bdd9c97ccf4e1af5f6ea3ed6bc` |

第一次调用付出的是 Ghidra 导入与自动分析的代价。每条记录都带有 `confidence: "observed"`、`authority: "shipped-artifact"`，以及目标文件的 SHA-256 `9a4a8082ba5e285a732552981a6935e0c5255725664f380e37c44ebfb04d803f`。Ghidra 把这个可重定位目标文件加载时让 `.text` 落在 `0x100000`，所以 `percent_change` 位于 `0x100000`，`grade` 位于 `0x100010`。

`percent_change` 的伪代码就是那个 `long` 的来源：

```c
undefined1  [16] percent_change(int param_1,int param_2,ulong param_3)
{
  long lVar1;
  undefined1 auVar3 [16];
  if (param_1 != 0) {
    lVar1 = (long)((param_2 - param_1) * 100);
    auVar3._0_8_ = lVar1 / (long)param_1 & 0xffffffff;
    auVar3._8_8_ = lVar1 % (long)param_1 & 0xffffffff;
    return auVar3;
  }
  ...
}
```

反编译器看到 `cltd` 和 `idivl` 同时写入 `edx` 和 `eax`，于是把返回值建模为一个带 64 位除法的 16 字节值。同一条记录里的指令清单说的则直白得多：

```
0x100000: TEST EDI, EDI
0x100002: JZ 0x0010000d
0x100004: SUB ESI, EDI
0x100006: IMUL EAX, ESI, 0x64
0x100009: CDQ
0x10000a: IDIV EDI
0x10000c: RET
0x10000d: XOR EAX, EAX
0x10000f: RET
```

每个运算都是 32 位宽。`IMUL EAX, ESI, 0x64` 以 32 位相乘并保留低半部分。`CDQ` 把 `eax` 符号扩展到 `edx`，`IDIV EDI` 用一个 32 位除数去除这个 64 位数对。遵循指令清单的重建实现就是以 `int` 计算的 `100 * (after - before) / before`。

`grade` 的记录具有相同的形状。伪代码点名了一张表 `*(uint *)(&DAT_001000b4 + (ulong)uVar2 * 4)`，以及一个由 `0x66666667` 构成、读不懂的默认表达式。指令清单把除以 10 显示为 `IMUL RAX, RAX, 0x66666667`、`SAR RCX, 0x22`、`SHR RAX, 0x3f`、`ADD ECX, EAX`。接着 `ADD ECX, -0x6`、`CMP ECX, 0x4` 和 `JA` 把十位数限制在 6 到 10。比较之前的 `XOR EAX, EAX` 是默认值 0。`LEA RCX, [0x1000b4]` 和 `MOV EAX, dword ptr [RCX + RAX*0x4]` 读取一张含五个 4 字节条目的表。

第 4 步读取了那 20 个字节：`01000000 02000000 03000000 04000000 04000000`。对于十位数 6、7、8、9、10，这张表是 `1, 2, 3, 4, 4`。这正是 `ledger.c` 中的 `switch`，其中 `case 10` 和 `case 9` 共享值 4。

rea 自己证据页中的两份证明都从指令清单以及对常量的 `read_bytes` 开始。DX-Ball 最初的伪代码是没有栈输入的 `FUN_00406400(void)`，指令视图纠正了它。先读指令清单。引用记录 id，然后写 C。

## 编写候选实现

文件夹 `code/fixtures/candidates/` 持有八个重建实现，每个文件一个函数。四个遵循指令清单或编译成相同代码。四个看似合理却是错的，或者错在一个手写测试就能发现的地方。

| 文件 | 来源 | 它做什么 |
|---|---|---|
| `percent_change_mul_first.c` | `100 * (after - before) / before` | 指令清单的 C 版本 |
| `percent_change_split.c` | `(after * 100 - before * 100) / before` | 文本不同，但在 clang 折叠后字节相同 |
| `percent_change_wide.c` | `(int)(((long)after - before) * 100 / before)` | 伪代码里的 `long`，在它回绕之前就相除 |
| `percent_change_div_first.c` | `(after - before) / before * 100` | 先相除，所以舍入不同 |
| `grade_switch.c` | 带五个 case 的 `switch (score / 10)` | 原始源码 |
| `grade_table.c` | `unsigned slot = score / 10 - 6; slot < 5 ? points[slot] : 0` | 指令清单的 C 版本 |
| `grade_thresholds.c` | `if (score >= 90) return 4; ...` | 最高档没有上界 |
| `grade_case10_wrong.c` | `case 10: return 3;` | 有一个表项是错的 |

每个文件都用测试夹具的命令编译：`clang -target x86_64-unknown-linux-gnu -O1 -fno-asynchronous-unwind-tables -c`。编译好的目标文件与源文件一起提交，使测试能在没有 clang 的主机上运行。

## 第一段：执行并比较

McKeeman 在 1998 年对差分测试的定义需要“两个或更多可比较的系统”（"two or more comparable systems"），输入“机械生成的测试用例”（"mechanically generated test cases"），并把结果不同、挂起或崩溃都视为缺陷候选。他点明了难点所在：“测试中最丑陋的问题是评估一次测试的结果。”（"The ugliest problem in testing is evaluating the result of a test."）这里的判定基准（oracle）就是原始函数。我们不需要知道正确答案。我们需要原始函数和重建实现在一张触及每种危险的网格上处处不发生分歧。

### 设计网格

`code/main.py` 中的 `input_grid()` 构建 92 个单元格。对 `percent_change`，它取十个 `before` 值和七个 `after` 值的每一个配对：

```
before: 0, 1, -1, 3, -3, 7, 100, -100, 2147483647, -2147483648
after:  0, 5, -5, 105, 536870911, 2147483647, -2147483648
```

对 `grade`，它取 22 个分数：每个档位边界的两侧、负值、0、110 以及两个 `int` 极限值。`classify()` 为每个单元格打标签。溢出有 32 个单元格，负值 17 个，边界 14 个，普通 12 个，零值防护 7 个。负值截断有 5 个，舍入 2 个，超出 switch 范围 2 个，陷阱 1 个。

每一类的存在都有一个理由。零值防护单元格检查 `TEST EDI, EDI` 这条分支。负值单元格检查截断除法：C 和 `idiv` 都朝零舍入，所以 `-9 / 10` 是 0，而 `-10 / 10` 是 -1。舍入单元格检查乘法发生在除法之前，所以 `(105 - 100) * 100 / 100` 是 5 而不是 0。溢出单元格让 `(after - before) * 100` 超过 32 位。那个唯一的陷阱单元格让回绕后的乘积等于 `INT_MIN`，同时 `before` 等于 -1。

Yang、Chen、Eide 和 Regehr 构建了 Csmith 来生成没有未定义行为的程序。在未定义行为上出现判定基准分歧只是噪声，绝不是缺陷报告。有符号溢出在 C 中是未定义的。我们的判定基准是一个具有唯一固定行为的编译后目标文件，所以溢出单元格在范围之内。本课要教的是分清哪些单元格依赖标准，哪些依赖编译后的字节。

### 驱动程序与陷阱

`code/driver.c` 从标准输入每行读取一个单元格，并打印输入、原始函数的结果和重建实现的结果。`build_harness()` 用 `-Dpercent_change=cand_percent_change -Dgrade=cand_grade` 编译候选实现，使两个版本以不同的名字链接进同一个程序。在 x86-64 Linux 主机上，原始函数就是测试夹具目标文件本身。在任何其他主机上，它是本地编译的 `ledger.c`，报告会记下 `original_kind: fixture-source`。

驱动程序用 `sigsetjmp` 和 `siglongjmp` 安装了一个 `SIGFPE` 处理器。对于 `before = -1` 和 `after = 536870911`，差值是 536870912，而 32 位乘积回绕到 -2147483648。在 x86-64 上，用那个被除数和 -1 这个除数执行 `idiv` 会引发除法错误异常。商装不进 32 位（Intel SDM 第 2 卷，IDIV）。处理器把它转换为记录下来的值 `trap`。

在 AArch64 上，`sdiv` 不会陷入，对同样的操作数返回 -2147483648。我们在一台 arm64 Mac 上的运行记录到的正是这个值。判定基准依赖体系结构，而报告会说明运行的是哪一个。

### 结果

`prove_behaviour(PLAUSIBLE)` 构建那个 `long` 版重建实现和阈值版重建实现。十个朴素用例通过。网格在 28 个单元格上失败：

| 函数 | 输入 | 类别 | 原始 | 重建 |
|---|---|---|---|---|
| `percent_change` | 3, 2147483647 | 溢出 | -133 | -1431655899 |
| `percent_change` | 100, 2147483647 | 溢出 | -101 | 2147483547 |
| `percent_change` | 2147483647, 5 | 溢出 | 0 | -99 |
| `grade` | 110 | 超出 switch 范围 | 0 | 4 |
| `grade` | 2147483647 | 超出 switch 范围 | 0 | 4 |

全部 26 个 `percent_change` 失败都是 `|before| > 1` 的溢出单元格。当 `before` 等于 1 或 -1 时，64 位的商截断回那个回绕后的值，所以那些单元格碰巧一致。阈值版 `grade` 失败，是因为原始的 switch 没有针对十位数为 11 及以上的 case，而 `110 / 10` 是 11。

`prove_behaviour(EQUAL)` 构建 `percent_change_mul_first.c` 和 `grade_switch.c`。全部 92 个单元格一致。`percent_change_div_first.c` 在四个朴素用例里失败两个，这正是手写测试能发现的那一类。

`oracle_disagreements()` 检查第二件事。`percent_change_model()` 和 `grade_model()` 是指令清单的 Python 模型，用 `wrap32()` 处理 32 位乘法，用 `idiv32()` 处理体系结构规则。报告在每个单元格上比较模型与观测到的原始函数。零分歧意味着模型和二进制在每个单元格上一致。模型是推导证据，而运行是观测证据。报告把它们保存在不同的字段里。

## 第二段：重新编译并比较

网格上的行为是一段。第二段要问的是：用同样的编译器和同样的标志编译出的重建实现，是否产生相同的字节。DX-Ball 项目为它的辅助函数报告了“63 个匹配字节”。TH04 项目报告了一处 2139 字节的匹配。两者都用了各自那个年代的编译器。rea 自己做不到这件事。它的 `compare_functions` 对 provider 文本逐行做差异比较，并附上这条局限：“汇编是不透明的 provider 文本；无法做重定位归一化。”（"Assembly is opaque provider text; relocation normalization is unavailable."）

### 读取目标文件

`code/main.py` 中的 `ElfObject` 用 `struct.unpack_from` 读取一个 ELF64 可重定位目标文件。它检查幻数、64 位类别、小端序数据、`e_machine` 为 62、`e_type` 为 1。然后它遍历节头表、字符串表、`.symtab` 和每个 `.rela` 节。在测试夹具中，`percent_change` 从 `.text` 偏移 0 开始，大小 16；`grade` 从 `0x10` 开始，大小 46。`total` 从 `0x40` 开始，大小 31；`grade_label` 从 `0x60` 开始，大小 63。

`percent_change` 的 16 个字节是 `85 ff 74 09 29 fe 6b c6 64 99 f7 ff c3 31 c0 c3`。该函数没有重定位。`grade` 有一个：函数内偏移 `0x26`，类型 `R_X86_64_PC32`，符号为 `.rodata`，加数 `0x10`。它属于偏移 `0x23` 处那条 7 字节的 `leaq`，其最后四个字节就是位移字段。

### 先屏蔽，再比较记录

在 RELA 目标文件中，加数存在重定位记录里，而那四个字段字节为零。候选实现 `grade_switch.o` 在那里也持有零。只要两处重定位指向不同的地方，普通的字节比较仍会通过。`mask_relocations()` 无论如何都把两侧的该字段清零，这样同一套方法对 REL 目标文件和 Mach-O 也成立——在 Mach-O 中该字段承载加数。

然后 `prove_bytes()` 按偏移、类型和目标节比较重定位记录。原始实现说的是 `.rodata+0x10`，候选实现说的是 `.rodata-0x4`。加数不同，是因为候选目标文件在它的 switch 表之前没有 `labels.rel` 表。不同的加数是不同的偏移，不是不同的函数。

### 读取重定位指向的常量

对于一条结束其指令的 PC 相对字段，CPU 会加上下一条指令的地址，所以目标是符号加加数再加 4。在原始实现里那是 `.rodata+0x14`，在候选实现里是 `.rodata+0x0`。`read_table()` 在那里读取五个 4 字节条目。两者都持有 `1, 2, 3, 4, 4`。

数目五来自指令清单：`CMP ECX, 0x4` 配合 `JA` 接受索引 0 到 4，而 `[RCX + RAX*0x4]` 每个索引读取 4 个字节。`code/main.py` 中的 `CLAIMS` 为 `grade` 记录了那个形状，并为 `percent_change` 记录了零个重定位。

这一步存在的理由是 TH08 项目记录在案的一个缺陷。它早先的比较“把目标地址回放进指令的重定位字段，然后比较指令字节，却不检查那个地址处的浮点字面数据。于是源端的 `0.0` 可能对着目标端的 `128.0` 显示为精确匹配。”（"replayed the target address into the instruction's relocation field, then compared instruction bytes without checking the floating-literal data at that address. Source `0.0` could therefore appear exact against target `128.0`."）修复审查了 1548 处浮点字面引用，又纠正了十二处。`grade_case10_wrong.c` 就是我们版本的那个缺陷。它的 46 个代码字节等于原始实现，它的重定位记录形状相同，它的表是 `1, 2, 3, 4, 3`。只有常量检查能让它失败。

### 结果

| 候选 | 大小 | 屏蔽后字节 | 重定位记录 | 表 | 状态 |
|---|---|---|---|---|---|
| `percent_change_mul_first` | 16 对 16 | 相等 | 无 | 无 | 通过 |
| `percent_change_split` | 16 对 16 | 相等 | 无 | 无 | 通过 |
| `percent_change_wide` | 16 对 26 | 大小不同 | 无 | 无 | 失败 |
| `percent_change_div_first` | 16 对 18 | 大小不同 | 无 | 无 | 失败 |
| `grade_switch` | 46 对 46 | 相等 | 形状相同 | 两者皆 `1,2,3,4,4` | 通过 |
| `grade_table` | 46 对 46 | 相等 | 形状相同 | 两者皆 `1,2,3,4,4` | 通过 |
| `grade_thresholds` | 46 对 39 | 大小不同 | 1 对 0 | 无 | 失败 |
| `grade_case10_wrong` | 46 对 46 | 相等 | 形状相同 | `1,2,3,4,4` 对 `1,2,3,4,3` | 失败 |

有两个结果值得再看一眼。`percent_change_split.c` 源文本不同而字节完全相同，因为 clang 把有符号溢出当作未定义，于是把 `after * 100 - before * 100` 折叠成一次乘法。`grade_table.c` 也逐字节匹配，所以编译器从数组索引和从 `switch` 都走到了同一张表。字节匹配证明的是：这个编译器、用这些标志，从候选实现产生了相同的代码。它并不证明候选实现就是原始源文本。

大小是一种诊断，不是一种验收。rea 的证据页记录过一个 1825 字节的候选，长度正确却有 467 个字节不同。那个 `wide` 版重建实现是 26 字节，因为 `movslq`、`imulq`、`cqto` 和 `idivq` 取代了 32 位形式。在任何一次编译之前，指令清单就已经告诉我们宽度了。

## 在 rea 之上的智能体循环

rea 的 MCP 工具里有六十五个没有对应的 CLI 命令，`verify_reconstruction` 就是其中之一。`code/main.py` 中的 `McpStdioClient` 是能够到达它们的最小客户端。它启动 `npx -y rea-agents@6.5.0 mcp`，向标准输入每行写一个 JSON-RPC 请求，并在一个线程里从标准输出每行读一个 JSON 对象。它用协议版本 `2025-11-25` 发送 `initialize`，然后 `notifications/initialized`，然后 `tools/call`。每次调用的默认截止期限是 330 s，与 rea 为一次 Ghidra 冷启动所允许的秒数相同。

`agent_loop()` 发起那六次调用并记录每一次：

```json
{
  "step": 2,
  "tool": "analyze_function",
  "arguments": {"procedure": "percent_change"},
  "seconds": 6.31,
  "is_error": false,
  "evidence_id": "ev_e88b10dc0c6400e51bb6f7fdc3eaea8d2c97cc02463f0db3e6afeefc273197cd",
  "confidence": "observed",
  "authority": "shipped-artifact",
  "limitations": ["Resolved reference metadata identifies computed, indirect, external, call, jump, and data edges; unresolved targetless flows remain unknown, and function classifications distinguish thunks and externals.", "..."],
  "result_sha256": "..."
}
```

完整的 Evidence 记录按其 id 存在同一个文件里。重建实现所依据的伪代码和指令清单都是测试夹具的一部分。`table_address()` 在 `grade` 的指令清单里找到 `LEA` 操作数，并把它喂给 `read_bytes`。`open_binary`、`get_evidence_bundle` 和 `close_binary` 不返回 Evidence 记录，以 null id 记录下来。

当 `npx` 在路径上且 `GHIDRA_INSTALL_DIR` 指向一个目录时，`run_agent(live=True)` 会驱动 rea。否则它重放测试夹具，并在标准错误上说明这一点。测试更进了一步。`code/tests/fake_rea_server.py` 是一个替身服务器，对每个 `tools/call` 用相同工具和参数所记录的那条记录来回应。客户端和循环在每次测试运行时都针对它运行，不需要安装 rea、Ghidra 或 Java。

### rea 的验证器能说什么、不能说什么

rea 的 `verify_reconstruction` 接收指向比较性 Evidence 的声明，并逐条声明返回 pass、fail 或 unknown。它那条固定的局限写着：“Pass 意味着每条声明的声明都通过了；它并不确立全局实现等价性。”（"Pass means every declared claim passed; it does not establish global implementation equivalence."）关于某个函数的声明比较来自 `compare_functions` 的 provider 文本。一个行为声明比较来自 `compare_process_captures` 的两份已记录进程捕获。当一条源记录的调用覆盖不完整时，关于调用的声明是 `unknown`。rea 内部没有任何东西会编译重建后的函数或在你的输入网格上运行它。本课的两段正是 rea 留给你的那部分。

rea 的义务账本期望一份带 `predicate_type: "rea.reconstruction-proof"`、`operation: "verify_reconstruction_obligations"`、`confidence: "observed"` 和 `normalized_result.passed === true` 的证明记录。没有任何公开的 rea 工具会发出这样一份记录。`code/main.py` 中的 `build_proof()` 铸造了它：

```json
{
  "predicate_type": "rea.reconstruction-proof",
  "operation": "verify_reconstruction_obligations",
  "confidence": "observed",
  "authority": "controlled-replay",
  "normalized_result": {
    "passed": true,
    "status": "pass",
    "claims": [
      {"claim_id": "percent_change.behaviour", "kind": "behavioral", "status": "pass", "evidence_ids": ["ev_e88b10dc..."]},
      {"claim_id": "grade.behaviour", "kind": "behavioral", "status": "pass", "evidence_ids": ["ev_67b6d3f9..."]},
      {"claim_id": "percent_change.bytes", "kind": "structural-function", "status": "pass", "evidence_ids": ["ev_e88b10dc..."]},
      {"claim_id": "grade.bytes", "kind": "structural-function", "status": "pass", "evidence_ids": ["ev_67b6d3f9..."]},
      {"claim_id": "grade.referenced-constants", "kind": "structural-function", "status": "pass", "evidence_ids": ["ev_67b6d3f9..."]}
    ]
  },
  "evidence_links": ["ev_e88b10dc...", "ev_67b6d3f9..."],
  "evidence_id": "ev_..."
}
```

这个 id 是 `ev_` 加上去掉 id 后、按排序键紧凑 JSON 对该记录求出的 SHA-256。`aggregate()` 是失败即关闭的：`fail` 优先，然后是 `unknown`，而空声明列表为 `unknown`。在没有 C 编译器的主机上，两个行为声明都是 `unknown`，所以即便两个字节声明都通过，记录仍然说 `unknown`。`authority` 是 `controlled-replay`，因为证明来自我们自己的测试工具，而不是仅凭目标文件。

## 研究怎么说

Liu、Raff 和 Micinski 在 2026 年测量了九种配置下的八个反编译系统。那些通过了基准所包含的每个测试的候选，在模糊输入上仍然出现分歧。总体比率为 4.9%，其中某一个系统高达 13%。在 300 个 GitHub 库函数和 287 个以 CVE 为依据的函数上，最强的精化模型把 Ghidra 的编译成功率从 75% 提升到 90%。在同一批函数上，行为匹配率从 74% 降到 62%。他们把原因追溯到被凭空编造的字段、类型、被调用函数和防护，这些东西取代了传统反编译器留下的可见未知项。

我们的 `percent_change_wide.c` 就是其中一个被编造的类型。伪代码提供了一个 `long`，重建实现保留了它，结果编译通过、通过了十个测试，却在 26 个溢出单元格上失败。阈值版 grade 重建实现则是一个被编造的防护。两者在 LLM4Decompile 的指标下都会被算作可重新执行——该指标重新编译输出并运行基准的断言。Ghidra 自己的伪 C 在 HumanEval-Decompile 上通过了那些断言的 20.12%。

DecompileBench 测量了来自 130 个真实程序的 23400 个函数。它发现 LLM 方法在功能正确性上比工业级反编译器低 52.2%，而可理解性得分更高。

这个领域用到的三种证明，正是你能构建的三段。Phoenix 和 DREAM 重新编译输出并运行原始程序的测试。McKeeman 和 Csmith 用生成的输入去跑原始函数，并把输入保持在已定义行为之内。Ramos 和 Engler 用有界符号执行检查两个 C 函数，这在所探索的全部路径上、直到某个输入规模为止证明等价。本课构建前两段。当一张网格小到不足以信任时，第三段就是第 35 课证据账本里的那个实践实验。

## 动手构建

运行这个标准库测试工具：

```bash
cd phases/13-tools-and-protocols/36-rebuild-and-prove-equal
python3 code/main.py
```

当 clang 在路径上时，演示会编译两对候选，并为每一对运行 92 个单元格。它重新编译八个候选，重放智能体运行，并铸造证明记录。没有 clang 时，它读取已提交的目标文件，并把行为声明报告为 `unknown`。

在一台 arm64 Mac 上的预期形状：

```json
{
  "host": "aarch64 Darwin",
  "originalKind": "fixture-source",
  "gridCells": 92,
  "plausible": {"naivePassed": true, "gridMismatches": 28, "oracleDisagreements": 0},
  "equal": {"naivePassed": true, "gridMismatches": 0, "oracleDisagreements": 0},
  "legTwo": {
    "percent_change_mul_first": {"status": "pass", "reasons": []},
    "percent_change_wide": {"status": "fail", "reasons": ["size 16 vs 26 bytes"]},
    "grade_case10_wrong": {"status": "fail", "reasons": ["referenced constants differ: [1, 2, 3, 4, 4] vs [1, 2, 3, 4, 3]"]}
  },
  "agentRun": {"mode": "replayed fixture", "server": {"name": "rea", "version": "6.5.0", "protocolVersion": "2025-11-25"}},
  "proof": {"status": "pass", "evidence_id": "ev_..."}
}
```

按这个顺序阅读 `code/main.py`：

1. `wrap32()`、`c_div()`、`idiv32()` 以及两个 `*_model()` 函数持有指令清单的整数语义。
2. `input_grid()` 和 `classify()` 构建并标注那 92 个单元格。
3. `build_harness()` 和 `execute()` 从原始函数、重命名后的候选和 `driver.c` 编译出一个程序，然后运行这些单元格。
4. `prove_behaviour()` 返回第一段报告，带有不匹配项和模型分歧。
5. `ElfObject` 读取头、符号和 `.rela` 记录。`mask_relocations()` 和 `read_table()` 为比较做准备。
6. `prove_bytes()` 返回第二段报告，带有大小、屏蔽范围、重定位形状和表。
7. `McpStdioClient` 和 `agent_loop()` 驱动 rea 并记录每一步。
8. `build_proof()` 和 `aggregate()` 铸造失败即关闭的记录。

## 使用

要证明一个新函数等价，重复这些步骤：

1. 为该函数取回 `analyze_function` 并记录证据 id。在伪代码之前先读指令清单。
2. 依据指令清单的运算宽度写出候选实现。保留原始函数名。
3. 列出指令清单中的每一次乘、加、减、除。添加让每一个运算在其宽度上回绕的网格输入。
4. 添加指令清单中每个比较常量的两侧。对 `grade` 来说，减法之后那是 6 和 4。
5. 添加每一个能在目标上触发陷阱的除数，并记录是哪种体系结构跑的这张网格。
6. 运行两段，并在看状态之前先读原因。
7. 把证明记录留在候选实现旁边。它的 `evidence_links` 告诉读者这条声明依据的是哪些记录。

任何编译器更新之后都重跑两段。字节匹配是一个关于“某一个编译器配某一组标志”的陈述。

## 交互实验

### 实验 A：模型与运行

从 `code` 目录打开 Python：

```bash
cd phases/13-tools-and-protocols/36-rebuild-and-prove-equal/code
python3 -q
```

运行：

```python
from main import *
percent_change_model(3, INT_MAX)
percent_change_model(-1, 536870911, "x86_64")
percent_change_model(-1, 536870911, "aarch64")
report = prove_behaviour(PLAUSIBLE)
report.naive_passed, len(report.mismatches), report.mismatches[0]
```

第一次调用给出 -133，即回绕后的乘积除以 3。第二次给出 `'trap'`，第三次给出 -2147483648。报告显示十个朴素用例通过，28 个网格单元格失败。把 `report.oracle_disagreements` 与一个空列表作比较。

### 实验 B：读取目标文件

```python
obj = ElfObject(ORIGINAL_OBJECT)
grade = obj.function("grade")
grade.size, grade.data[0x26:0x2a].hex(), grade.relocations
read_table(obj, grade.relocations[0], 5, 4)
```

字段字节是 `00000000`。重定位点名 `.rodata`，加数 `0x10`，而表读出 `[1, 2, 3, 4, 4]`。

### 实验 C：破坏一个常量

```python
report = prove_bytes("grade", CANDIDATES / "grade_case10_wrong.o")
report.masked_equal, report.relocations_match, report.tables_equal, report.reasons()
```

字节匹配、记录匹配、而表不匹配。现在编辑 `grade_case10_wrong.c`，让 `case 10` 重新返回 4，用测试夹具命令重新编译它，然后看着状态变为 `pass`。

### 实验 D：驱动 rea

在安装了 rea 6.5.0 和 Ghidra 12.1.4 的情况下：

```bash
GHIDRA_INSTALL_DIR=/opt/homebrew/Cellar/ghidra/12.1.4/libexec \
JAVA_HOME=/opt/homebrew/opt/openjdk@21 \
python3 code/main.py --live
```

第一次 `analyze_function` 会花几秒钟，因为 Ghidra 在导入目标文件。把新的证据 id 与已提交的运行作比较。在同一个分析配置下的相同字节给出相同的 id，因为这个 id 是一个排除文件路径的内容哈希。

## 实践实验

把两段都扩展到同一个目标文件中的 `total` 和 `grade_label`。

要求：

- 对 `total`，输入是一个数组和一个计数。构建计数为 0、负计数、一个元素以及在 32 位上回绕的和这些单元格。
- 对 `grade_label`，该函数内联调用 `grade` 并读取 `labels.rel`，这是一张含五个相对字符串偏移的表，它们在 `.rela.rodata` 里有自己的重定位。
- 为 `grade_label` 添加一个带两个重定位和一张五个 4 字节条目表的 `CLAIMS` 条目，并比较那些条目指向的字符串。
- 记录模型与运行在哪些单元格上分歧（若有），并依据指令清单解释每一处。
- 为每个函数的每一段向证明记录添加一条声明，并让聚合保持失败即关闭。

成功意味着证明记录列出四个函数，每条声明都带一个证据 id，而当有一个标签字符串不同时 `grade_label` 失败。

## 评分实验

关于本课测试夹具的五个问题。用你构建的代码找到每个答案，然后把它写进 `code/lab_answers.json`。把数字写成数字或十六进制字符串如 `"0x40"`，把列表写成 JSON 列表。

1. `t1`：percent_change_model(3, 105) 在 x86_64 上。
2. `t2`：percent_change_model(0, 5) 在 x86_64 上。
3. `t3`：grade_model(100)。
4. `t4`：input_grid() 中的单元格数量。
5. `t5`：x86_64 模型发生陷阱的网格单元格数量。

检查你的答案：

```bash
cd phases/13-tools-and-protocols/36-rebuild-and-prove-equal
python3 code/lab.py
```

检查器会在已提交的测试夹具上，从 `code/main.py` 计算每个预期值。它为每个任务打印 `PASS`、`FAIL` 或 `TODO` 以及一个分数，并且只有五个全部通过时才以退出码 0 退出。`python3 code/lab.py my-answers.json` 检查另一个文件。`code/tests/test_lab.py` 证明检查器接受正确答案并拒绝一个错误答案。

### 运行效果

[Inside a Decompiler](https://aiengineeringfromscratch.com/inside-a-decompiler) 这台机器以伪代码收尾，并把它归档为推断：那个页面并不证明它。本课就是把那条声明变成一条经过检查的声明的那一步。

## 输出技能

本课产出 `outputs/skill-rebuild-and-prove-equal.md`。用它把函数证据和一个候选重建实现转化为一份两段式证明和一份证明记录。这个技能要求伪代码之前先有指令清单、一张覆盖每种危险类别的网格、重定位屏蔽加常量检查，以及一个失败即关闭的聚合。

## 验证它

运行演示和测试套件：

```bash
cd phases/13-tools-and-protocols/36-rebuild-and-prove-equal
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

这 35 个测试证明：

- `c_div()` 朝零截断，而 `wrap32()` 遵循二进制补码
- 对 `(3, INT_MAX)` 模型给出 -133，对 x86-64 上的陷阱单元格给出 `trap`，而在 AArch64 上给出 -2147483648
- 网格有 92 个单元格且包含每种危险类别，而朴素用例回避了每个难类别
- ELF 读取器在记录的偏移和大小处找到四个函数
- `percent_change` 是 16 字节且无重定位，而 `grade` 在 `0x26` 处有一个 `R_X86_64_PC32`
- 重定位字段字节为零，而在这个 RELA 目标文件中屏蔽不改变任何东西
- 全部八个已提交候选达到预期状态，并带有记录在案的原因
- `grade_case10_wrong` 通过屏蔽后字节，只在常量检查上失败
- 记录下来的第一段运行显示十个朴素用例通过、28 个不匹配、零个模型分歧
- 有编译器时，两对都以相同结果重建并重跑
- 智能体运行按 SHA-256 瞄准已提交目标文件，按顺序进行，每个 Evidence 步骤都带 `ev_` id
- `read_bytes` 记录等于 ELF 读取器找到的表
- 客户端驱动那个替身服务器，并记录与真实运行相同的证据 id
- 来自服务器的错误结果会进入运行记录
- `aggregate()` 失败即关闭，而证明 id 能从其内容重新计算出来

## 生产失败模式

| 失败 | 薄弱报告说什么 | 测试工具必须证明什么 |
|---|---|---|
| 重建实现保留了反编译器的 `long` | “十个测试通过” | 26 个溢出单元格与原始实现不同 |
| 阈值取代 switch | “每个分数档都通过” | 110 及更大在原始实现里返回 0 |
| 先除后乘 | “公式在代数上相等” | 舍入单元格不同，朴素用例失败 |
| 跳过陷阱单元格 | “没有崩溃” | x86-64 引发 `#DE`，AArch64 返回 `INT_MIN`，报告点名主机 |
| 不屏蔽就做字节比较 | “字节相等” | 重定位记录点名不同的偏移 |
| 屏蔽却不读常量 | “屏蔽后字节相等” | `1,2,3,4,3` 与 `1,2,3,4,4` 不同 |
| 把大小当作验收 | “长度相同” | 相同长度内字节不同 |
| 不同编译器或标志 | “字节不同，重建错了” | 相同源码给出不同字节，所以这次比较无效 |
| 把模型当作观测 | “模型一致” | 运行是观测，模型是推导，分歧要被列出 |
| 没有证据 id 的声明 | “已验证” | 每条声明都链接一条它所覆盖函数的 `ev_` 记录 |
| CI 主机上没有编译器 | “通过了” | 行为声明为 `unknown`，聚合为 `unknown` |
| 把伪代码当作源码读 | “反编译器说是 long” | 指令清单显示 `IMUL EAX`、`CDQ`、`IDIV EDI` |

## 操作规则

从指令清单写出重建实现，并指明它来自哪条记录。在一张能让每个中间结果回绕、跨越每个比较常量的网格上，让它对着原始函数运行。用原始标志重新编译它，屏蔽重定位字段，比较记录，并读取它们指向的常量。为每条声明记录它的证据 id，并让一条未经验证的声明保持为未知。

## 延伸阅读

- [McKeeman, Differential Testing for Software, Digital Technical Journal 10(1), 1998](https://www.cs.tufts.edu/comp/150FP/archive/bill-mckeeman/DifferentailTesting.pdf)
- [Yang, Chen, Eide, Regehr, Finding and Understanding Bugs in C Compilers, PLDI 2011](https://doi.org/10.1145/1993498.1993532)
- [Ramos, Engler, Practical, Low-Effort Equivalence Verification of Real Code, CAV 2011](https://doi.org/10.1007/978-3-642-22110-1_55)
- [Schwartz, Lee, Woo, Brumley, Native x86 Decompilation Using Semantics-Preserving Structural Analysis, USENIX Security 2013](https://www.usenix.org/conference/usenixsecurity13/technical-sessions/presentation/schwartz)
- [Liu, Raff, Micinski, When LLM Decompilers Recompile More and Preserve Less, arXiv 2609.05370, 2026](https://arxiv.org/abs/2609.05370)
- [Gao et al., DecompileBench, Findings of ACL 2025](https://aclanthology.org/2025.findings-acl.1194/)
- [Tan et al., LLM4Decompile, arXiv 2403.05286, 2024](https://arxiv.org/abs/2403.05286)
- [System V gABI, Chapter 4, Relocation](https://www.sco.com/developers/gabi/latest/ch4.reloc.html)
- [x86-64 psABI repository, relocation types](https://gitlab.com/x86-psABIs/x86-64-ABI)
- [Intel 64 and IA-32 Architectures Software Developer's Manual, Volume 2, IDIV](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)
- [Arm Architecture Reference Manual for A-profile, DDI 0487, SDIV](https://developer.arm.com/documentation/ddi0487/latest)
- [rea 6.5.0 MCP contracts](https://github.com/morluto/rea/blob/rea-agents-6.5.0/docs/mcp-contracts.md)
- [rea 6.5.0 reconstruction obligation ledgers](https://github.com/morluto/rea/blob/rea-agents-6.5.0/docs/reconstruction-obligation-ledgers.md)
