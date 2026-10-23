---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/40-linking-loading-and-stripped-binaries/docs/en.md
  revision: f7aadc1d61a9fbbe2bdb107d1e2bf0a6caeea299
  sha256: f2d55ea6bcd09be875a881b60e9c644d484629dbed99f939ae3bbf91a4f0689e
status: reviewed
---

# 链接、加载与去除符号的二进制文件：PLT、GOT、导入、修正项与函数识别

> 一个链接后的程序会调用它本身并不包含的函数。本课在三种格式中读取链接编辑器为这些调用写下的表，沿一次调用追踪到加载器填充的槽位，并在一个构建的名字消失之后找出它的各个函数。

**类型：** 构建
**语言：** Python、C、x86-64 与 arm64 汇编
**前置要求：** Phase 13 · 32（从零构建 ELF）、33（反汇编与控制流）、38（调用约定）
**预计时间：** 约 160 分钟

## 学习目标

- 从一条重定位记录和符号表判断链接编辑器会把它处理成什么：一个固定距离、一个带 GOT 槽的 PLT 条目，还是一条动态重定位。
- 读取一个位置无关 ELF 可执行文件的动态节、PLT 和 GOT，并用 psABI 公式沿一次调用追踪它们。
- 读取一个 COFF 目标文件（20 字节文件头、40 字节节条目、18 字节符号、10 字节重定位），以及一个 PE32+ 映像的导入、导出和基址重定位目录。
- 逐个字地解码一条 Mach-O 链式修正链，并把每个字与 `dyld_info` 对照。
- 说清楚 `strip` 在每种格式中移除了什么、保留了什么，并运行去除符号后的程序来证明它仍能工作。
- 用 `LC_FUNCTION_STARTS`、序言扫描和调用目标，恢复一个去除符号的 arm64 构建的函数起点，用未去除符号的孪生文件的符号表给每种方法打分，并用一个 FLIRT 形状的签名为这些函数命名。

## 问题所在

你把 `main.c` 链接到了 `libledger.dylib`，并问一个智能体 `main` 在 `0x1000005a0` 调用的是哪个函数。该智能体反汇编了这条指令，读到 `bl 0x100000694`。那个地址处有十二个字节：`adrp x16`、`ldr x16, [x16, #0x38]`、`br x16`。该智能体沿这次加载追到 `0x100004038`，读到八个字节 `00 00 00 00 00 00 10 80`，并报告说这是一次通过指向内核空间的损坏指针发出的调用。

接着你去除了同一个程序静态构建的符号，并问它有多少个函数。该智能体运行了 `nm`，看到一个名字 `__mh_execute_header`，于是回答一个。

两个答案都把文件当成了正在运行的进程来读。`0x100004038` 处的那个字是一条链式修正项。第 63 位表示要绑定，十二位表示下一个修正项在哪里，低位表示要绑定哪个导入。在 `main` 运行之前，dyld 会用 `_puts` 的地址替换这个字。去除符号的文件丢失了它的符号表，但保留了 `LC_FUNCTION_STARTS`，它用九个字节列出了全部五个函数起点。

本课用标准库 Python 构建五个读取器。一个用于读我们自己的目标文件的 COFF 读取器，以及一个读取导入、导出和基址重定位目录的 PE32+ 读取器。一个 Mach-O 读取器，读取加载命令、桩、间接符号表、链式修正链和导出 trie，并逐字与 `dyld_info` 对照。一个 ELF 读取器，读取动态节、PLT 和 GOT，外加一个规划器，说明对我们的目标文件做一次 PIE 链接会创建什么。一个用于去除符号构建的函数查找器，带四种方法并为每种方法打分。一个 FLIRT 形状的签名构建器，带通配的重定位字节和一个对尾部计算的 CRC16。

这台机器上只有 Mach-O 能链接。arm64 可执行文件和 dylib 是被链接、去除符号并实际运行过的。ELF 和 COFF 目标文件是在这里用 `clang -target` 编译的，且没有安装任何 ELF 或 PE 链接编辑器，所以那两种格式的链接后映像是由 fixtures 文件夹中的两个 Python 脚本，按照规范逐字节写出来的。`llvm-objdump` 能读它们，库探针也能读。它们没有被运行过，正文在关键处会说明这一点。

```figure
re-40-call-through-three-formats
```

## 链接编辑器如何处理一条重定位

第 32 课读取过重定位记录，第 33 课把 `S + A - P` 应用到了一条 `lea` 上。一条记录命名了一个位置 `P`、一个类型、一个符号 `S` 和一个加数 `A`。x86-64 psABI 的表 4.9 给出每种类型一个公式，其中 `L` 表示符号 PLT 条目的位置，`G` 表示它的 GOT 偏移，`GOT` 表示 GOT 地址，`B` 表示映像的加载基址。三种结果涵盖了我们的目标文件。

链接编辑器把值写入字段，这条记录就消失了。针对一个在输入中定义的符号的 `R_X86_64_PC32` 就是这种情况。一个映像中两个字节之间的距离永远不变，无论加载地址为何。

链接编辑器制造一个 PLT 条目和一个 GOT 槽。针对一个未定义函数的 `R_X86_64_PLT32` 就是这种情况。调用得到 `L + A - P`，即到该条目的距离。该条目通过槽位跳转。`.rela.plt` 中的一条 `R_X86_64_JUMP_SLOT` 记录告诉动态链接器去填充这个槽。

链接编辑器为加载器保留一条重定位。`R_X86_64_64` 是一个八字节的绝对地址，而一个位置无关可执行文件在加载之前并不知道自己的地址。这条记录在 `.rela.dyn` 中变成公式为 `B + A` 的 `R_X86_64_RELATIVE`。

`main-x86_64-O1.o` 有 18 条记录：`.text` 中 14 条，`.data.rel.ro` 中 2 条，`.rodata` 中 2 条。`code/main.py` 中的 `plan_dynamic_link()` 把这三条规则连同 `ledger-x86_64-O1.o` 一起应用到它们上面：

| 记录 | 数量 | 决策 | 原因 |
|---|---|---|---|
| 指向 `.rodata`、`.L.str`、`fns`、`.rodata` 中表的 `R_X86_64_PC32` | 16 | 就地处理 | 该符号在输入中已定义 |
| 指向 `percent_change`、`grade`、`total`、`grade_label` 的 `R_X86_64_PLT32` | 4 | 直接调用，无 PLT | 在 `ledger-x86_64-O1.o` 中已定义，所以链接编辑器把 PLT32 降级为 PC32 |
| 两次指向 `puts`、两次指向 `printf` 的 `R_X86_64_PLT32` | 4 | PLT 条目和 GOT 槽 | 未定义，由一个共享库提供 |
| 指向 `fns[]` 中 `grade` 的 `R_X86_64_64` | 2 | `R_X86_64_RELATIVE` | PIE 中的一个绝对字段 |

两个导入给出一个 48 字节的 `.plt`（PLT0 加两个各 16 字节的条目），一个 40 字节的 `.got.plt`（三个保留槽加两个），以及一个 48 字节的 `.rela.plt`。那两条相对记录给出一个 48 字节的 `.rela.dyn`。这些数字来自把规范应用到我们的记录上。手工构建的 `tiny-dyn-x86_64` 为同样的两个导入实现了这个计划中的 PLT 部分，它的大小与计划一致。

编译器在每次调用上都写 `PLT32`，无论已定义还是未定义，这从 binutils 2.31（H.J. Lu，2018-02-13）和 LLVM 7.0.0（D43383，2018-02-20）开始如此。决策由链接编辑器做出。因此目标文件中的一个 `PLT32` 说的是“这是一次调用”，而对是否会存在 PLT 条目什么也没说。在其他构建中还会出现两种类型。`R_X86_64_GOTPCRELX` 和 `R_X86_64_REX_GOTPCRELX`（`G + GOT + A - P`）请求一个不带 PLT 的 GOT 槽，这是 `-fno-plt` 产生的，当符号是局部的时候链接编辑器可以把它松弛为一次直接的 `lea` 或 `call`（psABI 附录 B）。`R_X86_64_32` 和 `R_X86_64_32S` 在 PIE 中无法容纳一个地址，链接会失败。这两类都没有出现在我们的两个目标文件中。

## 动态节、PLT 与 GOT

gABI 第 5 章说，一个参与动态链接的可执行文件有一个 `PT_INTERP` 程序头，它必须排在任何可加载段之前，还有一个 `PT_DYNAMIC`，它覆盖 `.dynamic` 节。该节是一个 `Elf64_Dyn` 对的数组，每对是一个有符号标签和一个值，以 `DT_NULL` 结束。

`tiny-dyn-x86_64` 是 5,184 字节，由 `build_tiny_dyn_elf.py` 根据 gABI 和 psABI 写出。它的动态节在 `0x1000` 处有十二对：

| 标签 | 编号 | 值 | 含义 |
|---|---|---|---|
| `DT_NEEDED` | 1 | `libc.so.6` | 一个字符串表偏移 `0xb`，即要加载的库 |
| `DT_HASH` | 4 | `0x1a0` | SysV 哈希表 |
| `DT_STRTAB` | 5 | `0x188` | `.dynstr` |
| `DT_SYMTAB` | 6 | `0x140` | `.dynsym`，每条 24 字节 |
| `DT_STRSZ` | 10 | `0x15` | 21 字节的字符串 |
| `DT_SYMENT` | 11 | `0x18` | 24 |
| `DT_PLTGOT` | 3 | `0x10c0` | `.got.plt` |
| `DT_PLTRELSZ` | 2 | `0x30` | 两条 24 字节的记录 |
| `DT_PLTREL` | 20 | 7 | 这些记录是 `DT_RELA` |
| `DT_JMPREL` | 23 | `0x1b8` | `.rela.plt` |
| `DT_FLAGS_1` | `0x6ffffffb` | `0x08000000` | `DF_1_PIE`，一个 GNU 标签 |
| `DT_NULL` | 0 | 0 | 结束 |

gABI 说明了为什么 `DT_JMPREL` 要单列：它“保存仅与过程链接表关联的重定位条目的地址。把这些重定位条目分开，可以让动态链接器在启用延迟绑定时，于进程初始化期间忽略它们”（"holds the address of relocation entries associated solely with the procedure linkage table. Separating these relocation entries lets the dynamic linker ignore them during process initialization, if lazy binding is enabled."）。`DT_FLAGS` 中的 `DF_BIND_NOW`、`DT_FLAGS_1` 中的 `DF_1_NOW` 或环境中的 `LD_BIND_NOW` 会关闭延迟绑定，于是动态链接器在启动时就处理它们。

### PLT0 与 puts 的条目

psABI 第 5.2 节在图 5.2 中给出了这两种形状。以下是我们文件中的字节：

```text
     1f0: ff 35 d2 0e 00 00    pushq  0xed2(%rip)      # 0x10c8 = GOT+8
     1f6: ff 25 d4 0e 00 00    jmpq   *0xed4(%rip)     # 0x10d0 = GOT+16
     1fc: 0f 1f 40 00          nopl   (%rax)

     200: ff 25 d2 0e 00 00    jmpq   *0xed2(%rip)     # 0x10d8 = GOT+24, the slot for puts
     206: 68 00 00 00 00       pushq  $0x0             # index 0 into DT_JMPREL
     20b: e9 e0 ff ff ff       jmp    0x1f0            # PLT0
```

把算术做一遍。RIP 相对位移是相对于下一条指令的。`0x1f6 + 0xed2 = 0x10c8`，这是 `.got.plt + 8`。`0x1fc + 0xed4 = 0x10d0`，这是 `.got.plt + 16`。`0x206 + 0xed2 = 0x10d8`，即第四个槽。`0x210 - 0x20 = 0x1f0`，即 PLT0。每个条目都是 16 字节，所以 `exit` 的条目从 `0x210` 开始，压入 `$0x1`，并读取 `0x10e0`。

GOT 保留三个槽。psABI 5.2：第零项保存 `_DYNAMIC` 的地址，并且“全局偏移表中的第一项和第二项也是保留的”（"entries one and two in the global offset table also are reserved"）。我们的 `.got.plt` 读作 `0x1000, 0, 0, 0x206, 0x216`。glibc 在加载文件时用它的 `struct link_map` 填充槽一，用 `_dl_runtime_resolve` 填充槽二。文件中的槽三保存 `0x206`，即 `puts@plt` 内部的那条 `pushq`。psABI：该槽“最初……保存紧随其后的 pushq 指令的地址”（"initially ... holds the address of the following pushq instruction"）。

因此第一次调用运行 `call 0x200`，`jmpq *0x10d8` 落到 `pushq $0`，`jmp 0x1f0` 压入 GOT+8 并通过 GOT+16 跳进解析器，解析器读取 `DT_JMPREL` 的第 0 条记录 `R_X86_64_JUMP_SLOT puts`，在 `libc.so.6` 中查找 `puts`，把它的地址写进 `0x10d8`，并跳到那里。第二次调用运行 `call`、`jmpq *0x10d8`，然后抵达目标。Drepper 写道“因此除第一次之外，所有调用的开销‘仅仅’是一次间接跳转”（"the overhead for all but the first call is therefore 'only' one indirect jump"）。psABI 关于 `%r11` 的脚注解释了第 38 课中的一个寄存器选择：它是一个临时寄存器，所以“PLT 中的代码无需溢出任何寄存器”（"code in the PLT need not spill any registers"）。

`.text` 中的调用点在 `0x227` 处读作 `e8 d4 ff ff ff`，且 `0x22c - 0x2c = 0x200`。`llvm-objdump` 为它打印 `callq 0x200 <puts@plt>`，并从 `.rela.plt` 记录为该条目命名，`plt_entries()` 也是这样命名的。

### 文件所没有的东西

该文件没有 `PT_GNU_RELRO`。Jakub Jelinek 于 2004-01-06 在 binutils 邮件列表上提出了 RELRO：把仅在重定位期间写入的节移到可写段的开头，这样动态链接器之后可以用 `mprotect` 把它们设为只读。GNU ld 的默认脚本把 `.init_array`、`.fini_array`、`.data.rel.ro`、`.dynamic` 和 `.got` 放进里面，而只把 `.got.plt` 的三个保留槽放进里面，共 24 字节，因为其他槽是延迟写入的。这就是部分 RELRO。`-z now` 设置 `DF_BIND_NOW` 并把整个 `.got.plt` 移进里面，即完全 RELRO，因为启动之后不再写任何东西。glibc 的 `_dl_protect_relro` 对页对齐的范围调用 `mprotect(start, end - start, PROT_READ)`。`-fno-plt` 在编译器一侧更进一步：调用通过 `jmpq *name@GOTPCREL(%rip)` 进行，延迟绑定不可能发生，GCC 的手册说“所有外部符号都在加载时解析”（"all external symbols are resolved at load time"）。

该文件也没有版本节。一次针对 `libc.so.6` 的真实链接会添加 `.gnu.version`（`.dynsym` 每条一个 `Elfxx_Half`）和 `.gnu.version_r`（每个库一个 `Verneed`，每个版本名一条 `Vernaux` 记录）。`printf@GLIBC_2.2.5` 的意思是：`printf` 在 `.gnu.version` 中的条目保存一个索引，其 `vna_other` 等于该索引的那个 `Vernaux` 的 `vna_name` 是 "GLIBC_2.2.5"，它处在 `vn_file` 为 "libc.so.6" 的那个 `Verneed` 之下。索引 0 是局部，1 是全局，第 15 位（`VERSYM_HIDDEN`，`0x8000`）对链接编辑器隐藏一个版本。

哈希表是一个 SysV `DT_HASH`，带一个桶和一个三条目的链，24 字节。动态链接器需要 `DT_HASH` 或 `DT_GNU_HASH` 才能在文件中查找符号。这个文件什么都不导出，而且在这里没有被运行过，所以 glibc 是否接受一个单桶表尚未验证。

### .dynsym、.symtab 与 strip

gABI 把 `.dynsym` 和 `.dynstr` 设为已分配的节，把 `.symtab` 和 `.strtab` 设为未分配的节。动态链接器读取前一对，从不读后一对。Drepper：“普通符号表在运行时不被使用，因此没有必要把它从二进制文件中去除。它对性能没有影响。”（"The normal symbol table is not used at run-time and it is therefore not necessary to strip a binary of it. It has no impact on performance."）

GNU `strip --strip-all` 移除 `.symtab`、`.strtab`、`.debug_*` 和 `.comment`。每个已分配的节都保留：`.interp`、`.dynsym`、`.dynstr`、`.gnu.hash`、`.gnu.version*`、`.rela.dyn`、`.rela.plt`、`.plt`、`.text`、`.rodata`、`.eh_frame`、`.init_array`、`.dynamic`、`.got`、`.got.plt`、`.data`、`.bss` 以及各个 note。除非你加上 `--strip-section-headers`（binutils 2.41）或运行 `llvm-strip --strip-sections`，否则节头会保留。`--strip-debug` 保留符号。`--only-keep-debug` 写出那个由 `--add-gnu-debuglink` 从去除符号的文件中命名的调试文件，并在 `.gnu_debuglink` 中带一个 CRC32，而 `ld --build-id` 写出 `.note.gnu.build-id`，这样调试器可以把两者匹配起来。

## COFF 目标文件

`clang -target x86_64-pc-windows-msvc -O1 -fno-asynchronous-unwind-tables -c` 产生了 `main-x86_64.obj` 和 `ledger-x86_64.obj`。PE Format 页面定义了这种目标文件：一个 20 字节文件头，没有可选头，一个由 40 字节条目组成的节表，一个由 18 字节记录组成的符号表，以及每个节的 10 字节重定位记录。

`code/main.py` 中的 `CoffObject` 读取全部四样。文件头说机器为 `0x8664`，10 个节，37 条符号记录，`SizeOfOptionalHeader` 为 0。节表命名了 `.text`、`.data`、`.bss`、六个叫 `.rdata` 的节，以及 `/16`。以 `/` 开头的名字是进入字符串表的十进制偏移，该表以自己的四字节大小开头；`/16` 解析为 `.llvm_addrsig`，也就是 `llvm-objdump -h` 打印的那个名字。

这 37 条记录包含辅助记录。一个节符号（存储类 3）携带一条辅助记录，保存节长度、重定位计数、一个校验和以及一个 COMDAT 选择。五个 `.rdata` 节的选择为 2，即“any”，各自以一个 MSVC 修饰名保存一个字符串字面量：`??_C@_04JDDJEAHN@even?$AA@` 就是字符串 "even"。链接编辑器为每个各保留一份副本。最后一条记录是 `.file`，带辅助记录 "main.c"。`llvm-objdump -t` 把它们打印为 `[ 0]`、`AUX scnlen ...`、`[ 2]` 等等，跳过辅助索引，而测试把我们的索引与名字对和那段文本进行比较。

重定位：`.text` 中 14 条 `IMAGE_REL_AMD64_REL32`，`.rdata` 中 4 条 `IMAGE_REL_AMD64_ADDR64`。`REL32` 是“相对于紧随该重定位之后那个字节的 32 位相对地址”（"the 32-bit relative address from the byte following the relocation"）。这就是把 `-4` 内建进去的 `R_X86_64_PC32`：ELF 记录带加数 `-4`，因为记录有一个加数字段，而 COFF 记录没有。`ledger-x86_64.obj` 在 `0x36`、`0x84` 和 `0x93` 处有三条 `REL32`，而第 32 课的 `ledger-x86_64-O1.o` 在同样这三个偏移处有它的三条 `R_X86_64_PC32`。代码相同，两种格式的差别仅在于那个“4”写在哪里。`ADDR64` 是一个八字节绝对地址，即字符串指针的 `labels` 表，它在映像中变成一条基址重定位，正如 `R_X86_64_64` 变成 `R_X86_64_RELATIVE` 一样。

| | ELF `Elf64_Rela` | COFF 重定位 | Mach-O `relocation_info` |
|---|---|---|---|
| 记录大小 | 24 字节 | 10 字节 | 8 字节 |
| 字段 | 偏移、`r_info` 中的类型与符号、加数 | 偏移、符号索引、类型 | 地址，然后是一个 32 位字，带 symbolnum:24、pcrel:1、length:2、extern:1、type:4 |
| 加数 | 显式 | 无，存在于字段中 | 无，或在真正记录之前的一条 `ARM64_RELOC_ADDEND` 记录 |
| 对 `puts` 的调用 | `R_X86_64_PLT32 puts-0x4` | `IMAGE_REL_AMD64_REL32 puts` | `ARM64_RELOC_BRANCH26 _puts` |

## PE 映像：导入、导出与基址重定位

`tiny-x86_64.exe` 是 2,560 字节，由 `build_tiny_pe.py` 写出。它的任务和那个微型 ELF 相同：从 `msvcrt.dll` 调用 `puts` 和 `exit`。它还导出一个名字并携带一条基址重定位，所以本课需要的三个目录都在。`pefile` 2024.8.26 和 `llvm-objdump -p` 都能读它，两者的捕获都是 fixture。

走一遍各个头。MS-DOS 桩以 `MZ` 开头，在偏移 `0x3c` 处保存 `e_lfanew`，即 `0x40`。在 `0x40` 处是签名 `PE\0\0`。然后是 COFF 文件头：机器 `0x8664`，4 个节，`SizeOfOptionalHeader` 240，特征 `0x22`（可执行映像、大地址感知）。可选头以 `Magic` 字段 `0x20b` 开头，它表示 PE32+。`AddressOfEntryPoint` 是 `0x1000`，`ImageBase` 是 `0x140000000`，`SectionAlignment` 是 `0x1000`，`FileAlignment` 是 `0x200`，`SizeOfImage` 是 `0x5000`，`Subsystem` 是 3（控制台）。`DllCharacteristics` `0x8160` 解码为 `HIGH_ENTROPY_VA 0x0020`、`DYNAMIC_BASE 0x0040`、`NX_COMPAT 0x0100` 和 `TERMINAL_SERVER_AWARE 0x8000`。然后是 16 个由 RVA 和大小组成的数据目录。有四个被设置：Export 在 `0x2080` 大小 `0x4d`，Import 在 `0x2000` 大小 `0x28`，Base Relocation 在 `0x4000` 大小 `0xc`，IAT 在 `0x2040` 大小 `0x18`。

映像中的地址是 RVA，即相对于加载基址的偏移。节表把它们映射到文件偏移：`.text` RVA `0x1000` 在文件 `0x200`，`.rdata` RVA `0x2000` 在 `0x400`，`.data` RVA `0x3000` 在 `0x600`，`.reloc` RVA `0x4000` 在 `0x800`。`PeImage.rva_to_offset()` 就是这张表。

### 导入目录

在 RVA `0x2000` 处坐落着一个由 20 字节导入描述符组成的数组，以一个零描述符结束。我们的只有一个：Import Lookup Table `0x2028`，时间戳 0，forwarder chain 0，name `0x2068`，Import Address Table `0x2040`。name 的 RVA 指向 "msvcrt.dll"。查找表保存以零结束的 64 位条目。第 63 位置 1 表示按序号导入，序号在第 15 到 0 位。第 63 位清零表示第 30 到 0 位是一个 hint/name 条目的 RVA：一个 16 位的 hint（“进入导出名字指针表的索引”），然后是 ASCII 名字。我们的是 `0x2058`（hint 0，"puts"）和 `0x2060`（hint 0，"exit"）。

规范说 IAT“在映像被绑定之前与导入查找表的内容相同”（"identical to the contents of the import lookup table until the image is bound"）。我们在 `0x2040` 处的 IAT 保存着同样的两个 RVA，测试检查 `0x2028` 处的 24 字节等于 `0x2040` 处的 24 字节。“在绑定期间，导入地址表中的条目会被改写为正在导入的符号的 32 位（对于 PE32）或 64 位（对于 PE32+）地址。”（"During binding, the entries in the import address table are overwritten with the 32-bit (for PE32) or 64-bit (for PE32+) addresses of the symbols that are being imported."）Windows 加载器在入口点运行之前做这件事。没有延迟绑定，也没有桩。代码直接抵达槽位：

```text
    100b: ff 15 2f 10 00 00    call qword ptr [rip + 0x102f]   # 0x1011 + 0x102f = 0x2040, the IAT slot of puts
    1013: ff 15 2f 10 00 00    call qword ptr [rip + 0x102f]   # 0x1019 + 0x102f = 0x2048, the IAT slot of exit
```

`FF /2` 是间接近调用。这两条指令字节相同，因为每一条都坐落在另一条之后八个字节，并读取另一条之后八个字节处的一个槽。`iat_calls()` 在代码节中扫描 `ff 15`，加上六和位移，并从导入目录为该槽命名。

### 导出目录

在 RVA `0x2080` 处是 40 字节的导出目录表：flags、时间戳、版本、一个指向 "tiny-x86_64.exe" 的 name RVA、序号基准 1、1 个地址表条目、1 个名字指针。随后是三张表。Export Address Table 在 `0x20a8` 处保存一个 RVA `0x1000`。Export Name Pointer Table 在 `0x20ac` 处保存一个指向字符串 "tiny_entry" 的 RVA。Export Ordinal Table 在 `0x20b0` 处保存一个 16 位的无偏索引 0。名字 `k` 映射到地址条目 `ordinals[k]`，而导出的序号是 `ordinals[k] + 序号基准`。规范补充了一条我们没有用到的规则：一个指向导出节内部的地址条目是一个 forwarder 字符串，例如 `MYDLL.expfunc`，而名字指针表“按字典序排列以允许二分查找”（"ordered lexically to allow binary searches"）。

### 基址重定位

`.reloc` 保存一些块。每个块以一个页 RVA 和一个块大小开头，然后是一些 16 位条目，类型在高四位、页内偏移在低十二位。我们这一个块：页 `0x3000`，大小 12，条目 `0xa000`，类型 10，即 `IMAGE_REL_BASED_DIR64`，偏移 0，还有一个类型 0 的填充条目，即 `IMAGE_REL_BASED_ABSOLUTE`。RVA `0x3000` 处的八个字节保存 `0x1400020d0`，即映像基址加上字符串 "linked by hand" 的 RVA。如果加载器把映像放到别处，它会把差值加到那个字段上。规范：“映像文件不包含 COFF 重定位……映像以 .reloc 节中基址重定位的形式包含重定位信息（除非该映像带有 IMAGE_FILE_RELOCS_STRIPPED 属性）。”（"Image files do not contain COFF relocations ... An image contains relocation information in the form of base relocations in the .reloc section (unless the image has the IMAGE_FILE_RELOCS_STRIPPED attribute)."）在当前的 link.exe 中 `/DYNAMICBASE` 默认开启，所以映像携带 `.reloc` 和 `DYNAMIC_BASE`。

PE 映像没有可去除的符号表。文件头的 `PointerToSymbolTable`“对于映像应为零，因为 COFF 调试信息已被废弃”（"should be zero for an image because COFF debugging information is deprecated"），名字存在于单独的 PDB 中。每个映像中存活下来的是导入目录、导出目录，以及对于 64 位代码的 `.pdata`，其 `RUNTIME_FUNCTION` 条目命名每个会分配栈或调用另一函数的函数的起止。叶函数不在其中。

## Mach-O 映像：加载命令、桩与间接符号表

`ledger_main` 是那个链接后的 arm64 可执行文件。`otool -h` 打印 19 条加载命令和标志 `0x00200085`。`MH_NOUNDEFS 0x1`、`MH_DYLDLINK 0x4`、`MH_TWOLEVEL 0x80` 和 `MH_PIE 0x200000` 相加得到那个值。这 19 条命令是四条 `LC_SEGMENT_64`（`__PAGEZERO`、`__TEXT`、`__DATA_CONST`、`__LINKEDIT`）、两条 `LC_LOAD_DYLIB`（先是 `@rpath/libledger.dylib` 然后是 `/usr/lib/libSystem.B.dylib`），以及 `LC_DYLD_CHAINED_FIXUPS`、`LC_DYLD_EXPORTS_TRIE`、`LC_SYMTAB`、`LC_DYSYMTAB`、`LC_LOAD_DYLINKER`、`LC_UUID`、`LC_BUILD_VERSION`、`LC_SOURCE_VERSION`、`LC_MAIN`、`LC_RPATH`、`LC_FUNCTION_STARTS`、`LC_DATA_IN_CODE` 和 `LC_CODE_SIGNATURE` 各一条。`MachoFile.command_names()` 以与 `otool -l` 相同的顺序返回相同的列表。

`__TEXT` 从 `0x100000000` 开始。`__text` 是 `0x100000558` 处的 256 字节，只有 `main` 而没有别的，因为那四个 ledger 函数住在 dylib 里。`__stubs` 是 `0x100000658` 处的 84 字节，即七个十二字节的桩。`__DATA_CONST` 从 `0x100004000` 开始，带 `__got`（64 字节，八个段类型为 `S_NON_LAZY_SYMBOL_POINTERS` 的指针槽）和 `__const`（32 字节，`main.c` 的 `fns[]` 和 `names[]` 表）。

### 手工看一个桩

`_puts` 的桩在 `0x100000694`：

```text
    30 00 00 90    adrp x16, 0x100004000
    10 1e 40 f9    ldr  x16, [x16, #0x38]
    00 02 1f d6    br   x16
```

`0x90000030` 是 `adrp`。寄存器是低五位，16。`immlo` 是第 30 到 29 位，0。`immhi` 是第 23 到 5 位，1。其值是 `immhi << 2 | immlo = 4`，以 4,096 字节的页为单位，所以目标页是该指令所在的页 `0x100000000` 加上 `0x4000`。`0xf9401e10` 是 `ldr`，带一个按 8 缩放的无符号 12 位偏移：第 21 到 10 位是 7，乘以 8 是 `0x38`，所以这次加载读取 `0x100004038`。`0xd61f0200` 是 `br x16`。ld64 源码中的 arm64 桩正是这三条指令的 `StubAtom`。

哪个名字属于该槽，来自间接符号表。`LC_DYSYMTAB` 指向进入符号表的 15 个索引。一个桩节在 `reserved1` 中说它这一串索引从哪里开始，在 `reserved2` 中说每个桩多大（12）。一个指针节使用 `reserved1`，每槽八字节。`__stubs` 从索引 0 开始，`__got` 从索引 7 开始，所以桩 5 映射到符号表条目 10，即 `_puts`，而 `__got` 的槽 7 映射到同一个条目。`otool -Iv` 打印这两串，`indirect_table()` 重现每一行。

### 两级命名空间

`nm -m` 打印 `(undefined) external _puts (from libSystem)` 和 `(undefined) external _grade (from libledger)`。库来自符号记录本身。`nlist.h` 把 `GET_LIBRARY_ORDINAL(n_desc)` 定义为 `n_desc` 的第 15 到 8 位，1 表示第一条 `LC_LOAD_DYLIB`，2 表示第二条，`0xfe` 表示动态查找，`0xff` 表示可执行文件。`ld(1)`：“在使用 -two_levelnamespace（默认）时，链接器只在命令行上的 dylib 中搜索符号，并记录它们是在哪个 dylib 中找到的。”（"With -two_levelnamespace (the default), the linker only searches dylibs on the command line for symbols, and records in which dylib they were found."）`nm_lines()` 从 `n_type`、`n_sect`、`n_desc` 和 `n_value` 渲染这十二条记录，测试把它的输出与捕获的 `nm -m` 逐行比较。用 `-Wl,-flat_namespace` 重新链接并读 `otool -h`，就能看到 `MH_TWOLEVEL` 位消失。

## 逐字看链式修正项

`LC_DYLD_CHAINED_FIXUPS` 是一条 `linkedit_data_command`：`dataoff 0x8000`，`datasize 208`。这 208 字节遵循 `fixup-chains.h`。

头部是七个 32 位字段：`fixups_version 0`、`starts_offset 32`、`imports_offset 80`、`symbols_offset 112`、`imports_count 8`、`imports_format 1`（`DYLD_CHAINED_IMPORT`）、`symbols_format 0`（未压缩）。`llvm-objdump --macho --chained-fixups` 打印这七个值，测试进行比较。

在偏移 32 处是 `dyld_chained_starts_in_image`：`seg_count 4` 和四个偏移，每段一个，没有修正项的段为零。只有 `__DATA_CONST` 有一个。它的 `dyld_chained_starts_in_segment` 读作 `size 24`、`page_size 0x4000`、`pointer_format 6`（`DYLD_CHAINED_PTR_64_OFFSET`，“目标是 vm 偏移”）、`segment_offset 0x4000`、`max_valid_pointer 0`、`page_count 1`，以及一个值为 0 的 `page_start`。`DYLD_CHAINED_PTR_START_NONE`，`0xffff`，会表示一个没有修正项的页。

链从文件偏移 `0x4000 + 0` 开始。每个 64 位字携带两样东西：要在那里写什么，以及下一个字在哪里。

```text
  dyld_chained_ptr_64_bind    ordinal:24  addend:8  reserved:19  next:12  bind:1 = 1
  dyld_chained_ptr_64_rebase  target:36   high8:8   reserved:7   next:12  bind:1 = 0
```

读取第一个字 `0x8010000000000000`。第 63 位置位，是一次绑定。`next` 是第 62 到 51 位 `0x002`，以 4 字节为单位，所以下一个修正项在 8 字节之后。序号是 0。读取 `0x4058` 处的第十二个字 `0x00000000000006db`。第 63 位清零，是一次重基。`next` 是 0，即链的末尾。目标是 `0x6db`，一个 vm 偏移，映像基址 `0x100000000` 使其成为 `0x1000006db`，即 `__cstring` 中的字符串 "odd"。它之前那个字 `0x00100000000006d6` 把 `names[0]` 重基到 "even"。

这次遍历访问十二个字：`__got` 中的八次绑定，序号 0 到 7；`__const` 中的两次绑定，序号 0（`fns[]` 的两个条目都指向 `_grade`）；以及 `names[]` 的两次重基。`chained_fixups()` 带着它们的文件偏移和原始字返回它们，测试把这十二个 `(offset, raw)` 对与 `dyld_info -fixup_chain_details` 进行比较，后者为第一个打印 `raw: 0x8010000000000000 bind: (next: 002, bindOrdinal: 0x000000)`。

偏移 80 处的导入表有八个 32 位条目：`lib_ordinal:8`、`weak_import:1`、`name_offset:23`，名字在偏移 112 处。序号 0 到 3 是来自库 1 的 `_grade`、`_grade_label`、`_percent_change`、`_total`，4 到 7 是来自库 2 的 `___stack_chk_fail`、`___stack_chk_guard`、`_printf`、`_puts`。`fixup_rows()` 把这两张表连接成 `dyld_info -fixups` 打印的那些行，例如 `__DATA_CONST __got 0x100004038 bind libSystem/_puts`，测试比较全部十二行。

所以 `0x100004038` 处的那个“损坏指针”是导入 7。dyld 在加载时遍历这条链一次，把 `_puts` 的地址写进该槽。Apple 的 WWDC22 场次是这样讲的：“在 DATA 中的 64 位指针位置里，有一些位包含到下一个修正位置的偏移。打包在那里的还有一个位，说明该修正是一次绑定还是一次重基。”（"in the 64-bit pointer location in DATA, some of the bits contain the offset to the next fixup location. Also packed in there is a bit that says if the fixup is a bind or a rebase."）Xcode 13 把这种格式设为部署目标为 macOS 12 或 iOS 15 时的默认格式，Xcode 13.3 把它扩展到 macOS 11 和 iOS 13.4。这种格式中没有延迟绑定。每个槽都在 `main` 运行之前被绑定。

### 它取代的那种布局

`ledger_main_nochain` 是用 `-Wl,-no_fixup_chains` 做的同一次链接。它有 `LC_DYLD_INFO_ONLY` 而非链式修正，带四张字节编码的表：rebase 8 字节，bind 72，lazy bind 120，export 64。它还有三个链式文件所缺的节：`__TEXT,__stub_helper`（108 字节），一个只有 16 字节、保存 `___stack_chk_guard` 和 `dyld_stub_binder` 的 `__got`，以及 `__DATA,__la_symbol_ptr`（56 字节，七个槽）。`dyld_info -fixups` 列出七条 `lazy-bind` 行和七条重基，把每个延迟槽指向它在 `__stub_helper` 中自己的跳板。跳板压入一个索引并跳到 `dyld_stub_binder`，后者解析名字并写回该槽。这就是上一节的 PLT 和 GOT 换成 Mach-O 形状：`__la_symbol_ptr` 就是 `.got.plt`，`__stub_helper` 就是 PLT0 和 `pushq $index`，`dyld_stub_binder` 就是 `_dl_runtime_resolve`。`code/main.py` 报告这个文件的偏移和节，但不解码 bind 操作码；实践实验要求做那件事。

### 导出 trie

`LC_DYLD_EXPORTS_TRIE` 是一棵前缀树。每个节点是一个 uleb128 终端大小，然后，如果它非零，是一个 uleb128 flags 和一个 uleb128 offset，然后是一字节的子节点计数，并对每个子节点给出一条字符串边和一个 uleb128 节点偏移。`exports_trie()` 遍历它。在 `libledger.dylib` 上它返回 `_percent_change 0x410`、`_grade 0x428`、`_total 0x464`、`_grade_label 0x498`，即 `dyld_info -exports` 打印的那四个偏移。在可执行文件上它返回 `__mh_execute_header`、`_fns` 和 `_main`。

## strip 保留了什么

Apple 的 `strip(1)` 说，对一个动态链接的可执行文件不带任何选项时，它的行为就像 `-u -r`：保留未定义符号以及被动态引用的符号。`-x` 移除局部符号。`-N` 移除整个符号表和字符串表。“对于动态共享库，最大的去除级别通常是 -x”，因为“动态链接过程只使用全局符号”（"For dynamic shared libraries, the maximum level of stripping is usually -x" / "Only global symbols are used by the dynamic linking process"）。

在我们的 fixture 上观察到的情况。`strip ledger_main` 把 `LC_SYMTAB` 从 12 条记录减到 10 条，移除了 `_main`、`_fns` 和 `_names`。那八个未定义导入保留，因为 dyld 需要它们的名字来绑定，而 `__mh_execute_header` 保留，因为它是 `REFERENCED_DYNAMICALLY`。第十条记录是一个名为 `radr://5614542`、类型为 `N_OPT` 的 stab，Apple 的工具写入它以保证该表永不为空；`nm` 不打印它。去除符号的程序打印与原始程序相同的三行并以 0 退出。`LC_FUNCTION_STARTS` 仍有一个起点 `main`。

不带选项的 `strip libledger.dylib` 比手册页通常所说的 `-x` 走得更远：`LC_SYMTAB` 有 0 条记录，`nm` 打印 "no symbols"。导出 trie 仍在相同的偏移处列出那四个函数，因为 dyld 通过 trie 而从不通过 `LC_SYMTAB` 来绑定。`LC_FUNCTION_STARTS` 仍列出四个起点。实验 C 把一个全新的 `main.c` 链接到去除符号的 dylib，以表明链接编辑器同样由 trie 提供服务。

| 什么 | ELF 在 `--strip-all` 之后 | PE 映像 | Mach-O 在 `strip` 之后 |
|---|---|---|---|
| 静态符号表 | 没了 | 映像中从不存在 | 局部名和已定义名没了，未定义导入保留 |
| 加载器要绑定的名字 | `.dynsym` 和 `.dynstr` 保留 | 导入目录保留 | 导入保留在 `LC_SYMTAB` 和链式导入表中 |
| 导出的名字 | `.dynsym` 保留 | 导出目录保留 | 导出 trie 保留 |
| 函数起点 | `.eh_frame` 的 FDE，除非构建时不带展开表 | 非叶函数的 `.pdata` | `LC_FUNCTION_STARTS` 保留 |
| 调试信息 | `.debug_*` 没了 | 在 PDB 中，从不在映像里 | 在 dSYM 中，从不在映像里 |
| 节头或加载命令头 | 保留，除非 `--strip-section-headers` | 保留 | 保留 |

## 在没有符号的情况下找函数

`static-arm64-O2` 把 `main-arm64-O2.o` 和 `ledger-arm64-O2.o` 链接成一个在 `__text` 中有五个函数的可执行文件。未去除符号文件的 `nm -n` 是真值：`_main` 在 `0x100000500`（244 字节），`_percent_change` 在 `0x1000005f4`（24），`_grade` 在 `0x10000060c`（60），`_total` 在 `0x100000648`（248），`_grade_label` 在 `0x100000740`（72）。`static-arm64-O2.stripped` 在 `__text` 内部没有 `N_SECT` 符号。`FunctionFinder` 在它上面运行四种方法，`score()` 把每个列表与真值进行比较。

### LC_FUNCTION_STARTS

该命令指向 `__LINKEDIT` 中的九个字节：`80 0a f4 01 18 3c f8 01 00`。格式是 uleb128 的差值，第一个相对于 `__TEXT` 地址。`80 0a` 是 `0x500`，所以第一个起点是 `0x100000500`。`f4 01` 是 `0xf4`，所以 `0x1000005f4`。`18` 给出 `0x10000060c`，`3c` 给出 `0x100000648`，`f8 01` 给出 `0x100000740`，`00` 结束列表。五中取五，没有假阳性，在 `-O0` 和 `-O2` 都如此。链接编辑器为栈回溯器和崩溃报告器写这张表，`strip` 不碰它。Ghidra 在它的 "Mach-O Function Starts" 分析器中读取它，`dyld_info -function_starts` 打印它，LIEF 把它暴露为 `function_starts`。

### 序言扫描

Ghidra 的 AARCH64 起始模式以 `fd 7b bf a9` 开头，即 `stp x29, x30, [sp, #-0x10]!`。在我们的文件上它在两个级别都找到 0 中取 5。clang 先发出 `sub sp, sp, #N`，然后带一个正偏移发出 `stp x29, x30, [sp, #M]`，所以前变址形式从不出现。一个针对 `sub sp, sp, #imm` 的掩码 `(word & 0xff0003ff) == 0xd10003ff` 在 `-O0` 找到 5 中取 5，那里每个函数都有栈帧，而在 `-O2` 找到 1 中取 5，那里 `percent_change`、`grade`、`total` 和 `grade_label` 都是完全没有栈帧的叶函数。`percent_change` 以 `cbz w0, ...` 开头。一次序言扫描报告的是编译器选择发出的东西，而第 38 课表明那往往什么都不是。

这里两种扫描都没有产生假阳性，因为程序很小。像 `push rbp` 的 x86-64 `55` 那样的一字节模式会在其他指令内部命中，这就是为什么 Ghidra 的 x86-64 模式文件把一个像 `55 48 89 e5` 这样的后置模式与一个像 `ret` 或 `nop` 这样必须结束上一个函数的前置模式配成对。

### 调用目标

`__text` 中的每条 `bl` 都命名一个函数起点，因为一条跳进函数中部的 `bl` 不是 C 编译器会为之发出的东西。编码是 `0x94000000`，带一个有符号的 26 位字偏移。`0x1000005a0` 处的 `bl` 读作 `3d 00 00 94`：`0x3d` 是 61，乘以 4 是 `0xf4`，所以目标是 `0x100000694`。在 `ledger_main` 中那是 `_puts` 的桩。在静态构建中，`call_targets()` 收集 `__text` 内部的目标，丢弃落在 `__stubs` 中的那些，并加上 `LC_MAIN` 入口，因为没有东西调用 `main`。在两个级别都是五中取五。Nucleus（Andriesse、Slowinska、Bos，2017）把它的函数检测建立在这个思路之上，用于编译器生成的代码；Andriesse 等人在 2016 年测得，函数边界是反汇编中困难的部分，比指令边界更难。

## 一个 FLIRT 形状的签名

Hex-Rays 在它的文档中描述 FLIRT：一个模式是“一个函数的前 32 个字节，其中所有可变字节都被标记”（"first 32 bytes of a function where all variant bytes are marked"），可变字节来自修正项和外部引用，模式存在于一棵树中，而在模式之外“我们从位置 33 开始、直到第一个可变字节为止计算这些字节的 CRC16”（"we calculate the CRC16 of the bytes starting from position 33 until the first variant byte"）并存储那个长度。两个模式和 CRC 相同的函数，靠它们不同处的一个尾部字节区分，然后靠它们引用的名字区分。一个没有任何东西能分开的碰撞“由自然智能解决”（"solved by natural intelligence"）。短于四字节且没有外部引用的函数被排除，而且“签名文件不包含原始库中的任何字节，函数名除外”（"the signature file contains no byte from the original libraries, except for the names of the functions"）。

`signatures_from_object()` 从 `ledger-arm64-O2.o` 和 `main-arm64-O2.o` 构建那个签名，就像 FLAIR 从一个库的目标文件构建它一样。每条 `relocation_info` 记录覆盖一个四字节的字，这些字节成为可变字节。`.pat` 行的布局（在 rizin 的解析器中有文档）是：模式、CRC 长度、CRC16、函数长度、`:0000` 和名字，以及每个被引用名字的 `^offset name`：

```text
A00000342800004B890C8052087D091B000DC01AC0035FD6 00 0000 0018 :0000 _percent_change
E8CC8C52C8CCAC72087C289B09FD7FD308FD62930801090B081900511F110071 04 9AAF 003C :0000 _grade ^0000 l_switch.table.grade ^0001 l_switch.table.grade
E8CC8C52C8CCAC72087C289B09FD7FD308FD62930801090B081900511F110071 04 9AAF 0048 :0000 _grade_label ^0000 l_switch.table.grade_label ^0001 l_switch.table.grade_label ^0002 _labels ^0003 _labels
```

`_percent_change` 是 24 字节，所以它的模式就是整个函数，CRC 长度为 0。`_grade` 是 60 字节，第一条重定位在字节 36，所以 CRC 覆盖四个字节。CRC16 就是公开的 `.pat` 解析器所用的那个：多项式 `0x8408`，初值 `0xffff`，取反，然后交换两个字节。它对 ASCII 字符串 "123456789" 的值是 `0x6e90`，测试把这个值钉死。

`match_signatures()` 在去除符号构建的每个函数起点处尝试每个签名，先比模式，再比 CRC。在 `-O0` 五个函数都得到它们的名字，没有碰撞。在 `-O2` 上面那两行碰撞。`grade_label` 内联了 `grade`，所以这两个函数共享它们的前 36 个字节和那四个 CRC 字节。两个签名在 `0x10000060c` 和 `0x100000740` 都匹配。尾部把它们分开：在字节 44 处，`_grade` 是 `20` 而 `_grade_label` 是 `28`，即 `ldr w0, [x9, w8, uxtw #2]` 对 `ldr x8, [x9, w8, uxtw #3]`，而长度是 60 对 72。报告记录了这两个碰撞以及决定它们的字节。在两个级别都是五中取五命名。

测试 `test_object_bytes_equal_linked_bytes_outside_relocated_words` 检查这个前提：每个目标文件函数的每个非可变字节都等于链接后可执行文件中同偏移处的字节，所以链接编辑器只改变了那些被重定位的字。`_total` 完全没有重定位，也完全没有可变字节。

### 工具用同一个思路做什么

IDA Pro 9.4 随每种处理器附带 FLIRT 签名，以及用于构建它们的 `sigmake` 工具；IDA Free 只涵盖 x86 和 x86-64，供非商业使用。Lumina 是一个服务器，用函数的 md5 为其元数据建索引，并跳过小于 32 字节的函数。Ghidra 12.1.4（Apache-2.0）有 Function ID：一个对助记符和寻址模式求的完整哈希，“对链接导致的改变是稳健的”（"robust against changes due to linking"），以及一个加入常量操作数的特定哈希，按每条匹配指令打分，以父函数和子函数作为并列打破项；它随附的数据库只涵盖 Visual Studio 库，你要从自己的二进制文件填充自己的数据库。Binary Ninja 6.0 Krypton（商业，带一个免费版）使用 WARP（Apache-2.0）：函数 GUID 是对各基本块 GUID 求的 UUIDv5，每个基本块 GUID 是在把“所有可重定位指令”清零并丢弃 NOP 之后对块字节求的 UUIDv5，以被调用、调用者和相邻函数作为约束。BinDiff 8（Apache-2.0）以一组固定顺序的步骤在两个二进制文件之间匹配函数，从哈希匹配经流图 MD 索引到调用序列匹配，并从匹配的边、块、指令和流图 MD 索引加权求相似度。Diaphora 3.4.3（AGPL-3.0，仅限 IDA）加入了小质数乘积，即每个助记符映射到一个质数、一个函数就是其乘积，这是一种无序的多重集指纹。radare2 6.2.4（LGPL-3.0）有 zignature（`zg`、`z/`、`zb`），并用 `zfs` 读取 FLIRT 的 `.sig` 文件；rizin 0.9.1（LGPL-3.0）用 `Fc` 从打开的二进制文件创建 `.pat` 或 `.sig`，并用 `Fs` 应用一个。

IDA 和 Binary Ninja 是闭源的，这里是根据它们的文档描述的。radare2 和 rizin 没有安装在这台机器上，它们的命令引自各自的书籍和源码。在这些 fixture 上实际运行过的工具是来自 Command Line Tools 的 `clang`、`ld`、`llvm-objdump`、`otool`、`nm`、`strip` 和 `dyld_info`，以及通过探针使用的 LIEF 1.0.0、pyelftools 0.33 和 pefile 2024.8.26。LIEF 读取了这里的每一种格式，包括它从 0.17.0 起支持的 COFF 目标文件，并在 `ledger_main` 上报告了十次绑定和两次重基，即同样的十二个修正项。pyelftools 只读取了 ELF 文件。pefile 以 `PEFormatError: 'DOS Header magic not found.'` 拒绝了 `main-x86_64.obj`，而读取了那个微型映像。

## 构建它

运行演示：

```bash
cd phases/13-tools-and-protocols/40-linking-loading-and-stripped-binaries
python3 code/main.py
```

输出是一份带五个部分的 JSON 报告。`elf` 保存两个目标文件的重定位计数、链接计划，以及 `tiny-dyn-x86_64` 的动态节、PLT 和 GOT。`coff` 保存两个目标文件的节、重定位、函数和未定义名字。`pe` 保存 `tiny-x86_64.exe` 的头、目录、导入、导出、基址重定位和 IAT 调用。`macho` 保存 `ledger_main` 及其桩、链式修正项、修正行和导出，`ledger_main_nochain` 的旧版布局，那个 dylib，以及两份 strip 报告。`identification` 保存真值、带分数的四种方法，以及带碰撞的签名，在 `-O0` 和 `-O2`。

预期形状：

```json
{
  "elf": {"linkPlan": {"pltSymbols": ["puts", "printf"], "sizes": {".plt": 48, ".got.plt": 40, ".rela.plt": 48, ".rela.dyn": 48}, "...": "..."}, "tiny-dyn-x86_64": {"...": "..."}},
  "coff": {"main-x86_64.obj": {"...": "..."}},
  "pe": {"imports": [{"dll": "msvcrt.dll", "iat": "0x2040", "...": "..."}], "...": "..."},
  "macho": {"ledger_main": {"flags": "0x200085", "fixupRows": ["__DATA_CONST __got 0x100004000 bind libledger/_grade", "..."], "...": "..."}, "strip": {"...": "..."}},
  "identification": {"O2": {"methods": {"functionStarts": {"recall": "5/5"}, "prologueSub": {"recall": "1/5"}, "...": "..."}, "correctNames": 5}}
}
```

按这个顺序读 `code/main.py`：

1. `ElfFile` 读取头、节、两张符号表和重定位，而 `dynamic_entries()`、`jump_slots()`、`plt_entries()` 和 `plt0()` 读取链接后的映像。
2. `plan_dynamic_link()` 把表 4.9 和第 5.2 节应用到可重定位目标文件的重定位记录上。
3. `CoffObject` 读取文件头、节表、带辅助记录的 18 字节符号，以及 10 字节重定位。
4. `PeImage` 读取 MS-DOS 桩、PE 签名、可选头、数据目录、节，以及导入、导出和基址重定位目录，而 `iat_calls()` 解码 `ff 15`。
5. `MachoFile` 读取加载命令、段、`nlist` 记录、间接符号表、桩、链式修正项、导出 trie 和目标文件重定位。
6. `FunctionFinder` 运行那四种起点查找器，而 `score()` 把每个与真值进行比较。
7. `signatures_from_object()` 和 `match_signatures()` 构建并应用 FLIRT 形状的签名。
8. 各个 `parse_*` 函数读取测试所比对的、已捕获的工具文本。

更多命令：`python3 code/main.py elf FILE`、`coff FILE`、`pe FILE` 和 `macho FILE` 打印一份报告。`python3 code/main.py plan OBJECT...` 为任意一组 ELF 目标文件打印链接计划。`python3 code/main.py functions STRIPPED UNSTRIPPED OBJECT...` 在你自己另一对构建上为查找器和签名打分。

## 使用它

在你自己构建的程序上按这个顺序使用这些读取器。

1. 读取各个头，说出格式和种类：可重定位目标文件、可执行文件还是共享库。读取器会拒绝它不认识的东西，而那次拒绝就是信息。
2. 列出导入及其提供者：`DT_NEEDED` 和 `.dynsym`，导入目录，或链式导入表和 `LC_LOAD_DYLIB`。每次对该列表上某个名字的调用都会离开映像。
3. 手工沿一次调用追踪到它的槽。写下调用字节、桩或 PLT 字节、槽地址、文件中的那个字，以及加载器会在那里写什么。如果文件中的那个字看起来像垃圾，在你把它叫作垃圾之前先把它解码成一个修正项。
4. 把符号表与导出和函数起点进行比较。加载器需要的名字能挺过 `strip`。只有调试器需要的名字挺不过。说出一个缺失的名字曾属于哪一组。
5. 在一个去除符号的构建中，运行你能运行的查找器，并趁你还有未去除符号的孪生文件时用它为它们打分。优先用链接编辑器写下的表——`LC_FUNCTION_STARTS`、`.pdata` 或 `.eh_frame`——而不是字节模式，并用调用目标填补空缺。
6. 从你自己的目标文件构建签名并应用它们。记录每一次碰撞以及分开它的那个字节。两个签名都认领的名字是一个未知项，直到尾部或一个被引用的名字做出裁决。

把捕获的工具文本和文件放在一起。当工具链变化时，重新捕获，因为一份变化了的清单就是一个变化了的 fixture。

## 交互实验

### 实验 A：手工看 PLT

从 `code` 目录打开 Python：

```bash
cd phases/13-tools-and-protocols/40-linking-loading-and-stripped-binaries/code
python3 -q
```

运行：

```python
from main import *
elf = load_elf("tiny-dyn-x86_64")
[(e.tag_name, e.text) for e in elf.dynamic_entries()]
elf.plt0()
[(e.symbol, hex(e.address), hex(e.slot), hex(e.slot_initial)) for e in elf.plt_entries()]
[hex(w) for w in elf.got_plt_words()]
```

在每次调用之前，先从上面正文中的字节算出答案。然后把 `build_tiny_dyn_elf.py` 中的 `IMPORTS` 改成三个名字，重新构建，并在你读取之前先预测 `.plt`、`.got.plt` 和 `.rela.plt` 的新大小。

### 实验 B：一个链式修正项

```python
exe = load_macho("ledger_main")
stub = next(s for s in exe.stubs() if s.symbol == "_puts")
stub.lines()
raw = int.from_bytes(exe.read(stub.slot, 8), "little")
hex(raw), raw >> 63, (raw >> 51) & 0xfff, raw & 0xffffff
[(i.index, i.name, i.library) for i in exe.chained_fixups()["imports"]]
```

先在纸上解码那个绑定字：绑定位、以四字节为单位的 `next` 字段、序号。然后读取八字节之后的那个字，确认它是下一个修正项。然后读取 `0x100004058` 处链的最后一个字，并解释为什么它的 `next` 是零。

### 实验 C：strip 与重新链接

在 fixtures 目录中，把一个全新的程序链接到完全去除符号的 dylib：

```bash
cd phases/13-tools-and-protocols/40-linking-loading-and-stripped-binaries/code/fixtures
clang -target arm64-apple-macos -O1 main.c -L. -lledger.stripped -Wl,-rpath,@executable_path -o /tmp/relinked
nm /tmp/relinked | grep ' U '
dyld_info -exports libledger.stripped.dylib
```

链接在一个 `LC_SYMTAB` 为空的库上成功，因为链接编辑器读取导出 trie。然后运行 `python3 ../main.py macho libledger.stripped.dylib`，并比较 `symtab`、`exports` 和 `functionStarts`。然后改用 `-N` 去除静态构建的符号，看看 `dyld_info -function_starts` 仍然打印什么。

### 实验 D：那次碰撞

```python
from main import *
stripped = load_macho("static-arm64-O2.stripped")
sigs = signatures_from_object(load_macho("ledger-arm64-O2.o"))
[s.pat_line() for s in sigs]
starts = FunctionFinder(stripped).function_starts()
match_signatures(sigs, stripped, starts)
```

读那两条碰撞记录。然后从 `ledger-arm64-O0.o` 构建签名，把它们和 `static-arm64-O0.stripped` 匹配，并从那些 `.pat` 行解释为什么在 `-O0` 不发生碰撞。然后把 `PATTERN_LENGTH` 缩短到 16，数一数有多少个函数碰撞。

## 实践实验

解码旧版的绑定表，并添加 PE 查找器。

要求：

- 把 `ledger_main_nochain` 的 `LC_DYLD_INFO_ONLY` 的 rebase、bind 和 lazy bind 操作码流解码成带段、节、地址、类型和目标的行，并让它们等于捕获的 `dyld_info -fixups` 文本中的 21 行。
- 给 `build_tiny_dyn_elf.py` 添加一个 `PT_GNU_RELRO` 程序头和一个带 `DF_BIND_NOW` 的 `DT_FLAGS`，把 `.got.plt` 移进被覆盖的范围内，并让 `llvm-objdump -p` 显示这个新的头。在 fixtures 的 README 中说明这重现了完全 RELRO 的哪一部分，以及哪一部分只有 glibc 能完成。
- 为一个 PE32+ 映像写一个 `.pdata` 读取器，以及一个使用 `RUNTIME_FUNCTION` 起始地址的函数查找器。用 `clang -target x86_64-pc-windows-msvc -c`、不带 `-fno-asynchronous-unwind-tables` 构建一个目标文件，读取它的 `.pdata` 重定位，并说出它的哪些函数是该表所省略的叶函数。
- 为每个读取器写一个与捕获的工具文本进行比较的测试。

成功意味着 `python3 code/main.py macho ledger_main_nochain` 打印出 `dyld_info` 所打印的同样 21 条修正行，微型 ELF 携带一个 `llvm-objdump` 列出的 `PT_GNU_RELRO`，而 `.pdata` 查找器命名它能命名的函数并列出它不能命名的叶函数。

## 随课交付物

本课包含 `outputs/skill-linking-loading-and-stripped-binaries.md`。用它把你构建的一个程序变成一份清单：它的导入及其提供者、沿一次调用追踪到加载器所填充的槽、一份关于 `strip` 移除了什么和保留了什么的陈述，以及一个去除符号构建中函数起点和名字的带分数恢复。它要求把未去除符号的孪生文件作为真值、为每条论断提供一份捕获的工具清单，以及一份每次碰撞的记录。

## 验证它

运行演示和确定性测试套件：

```bash
cd phases/13-tools-and-protocols/40-linking-loading-and-stripped-binaries
python3 code/main.py
python3 code/tests/test_main.py
```

验证应当证明：

- `tiny-dyn-x86_64` 的动态节逐标签匹配 `llvm-objdump -p`，而 `DT_FLAGS_1` 携带 `DF_1_PIE`
- 那两条 `R_X86_64_JUMP_SLOT` 记录匹配 `llvm-objdump -R` 并命名 `puts` 和 `exit`
- PLT0 压入 GOT+8 并通过 GOT+16 跳转，每个条目读取它的槽并压入它的索引，而每个槽保存它自己那条 `pushq` 的地址
- 微型 ELF 的节和程序头匹配 `llvm-objdump -h -p`
- 两个 ELF 目标文件的重定位记录匹配 `llvm-objdump -r`
- 链接计划找到两个 PLT 符号、四次直接调用、两条相对重定位，以及微型映像的各个大小
- COFF 节表、带辅助记录的 37 条符号记录和重定位匹配 `llvm-objdump -h -t -r`，而 `/16` 解析为 `.llvm_addrsig`
- `ledger` 的三条 COFF `REL32` 记录坐落在那三个 ELF `PC32` 偏移处
- PE 的各个头、`DllCharacteristics` 和数据目录匹配 `llvm-objdump -p`
- 导入目录、hint/name 条目和 IAT 匹配 `llvm-objdump` 和 `pefile`，而 IAT 在绑定之前等于查找表
- 导出目录和那条 `DIR64` 基址重定位解码成功，而重定位后的指针命名字符串 "linked by hand"
- RVA `0x100b` 处的 `ff 15` 解析到 `puts` 的 IAT 槽
- Mach-O 的标志、19 个加载命令名和两个库匹配 `otool`
- 那七个桩解码到八个 `__got` 槽，而间接符号表匹配 `otool -Iv`
- 链式修正项的头匹配 `llvm-objdump --macho --chained-fixups`
- 链遍历重现了 `dyld_info -fixup_chain_details` 的全部十二个原始字
- 修正行和导入表匹配 `dyld_info -fixups` 和 `-imports`
- 导出 trie 对 dylib 及其去除符号的副本都匹配 `dyld_info -exports`
- `nm_lines()` 对可执行文件及其去除符号的副本都等于 `nm -m`
- `strip` 移除了 `_main`、`_fns` 和 `_names`，保留了九个名字和一个 `radr://5614542` stab，而去除符号的程序打印同样的输出
- 旧版布局有 `LC_DYLD_INFO_ONLY`、七个延迟指针和指向 `__stub_helper` 的重基
- arm64 目标文件重定位匹配 `llvm-objdump -r`
- `LC_FUNCTION_STARTS` 在两个级别都恢复五中取五，并等于 `nm` 和 `dyld_info -function_starts`
- `sub sp` 扫描在 `-O0` 找到五中取五，在 `-O2` 找到五中取一，而 `stp` 栈帧扫描一个也找不到
- `bl` 目标加上 `LC_MAIN` 入口恢复五中取五
- 签名在两个级别为全部五个函数命名，并记录由字节 44 分开的 `grade` 碰撞
- "123456789" 的 CRC16 是 `0x6e90`，而 `main` 的 GOT 加载指令对下的八个字节是可变字节
- 每个非可变的目标文件字节都等于链接后的字节
- 演示和 figure 数据报告相同的地址，而站点模块以 ES5 嵌入相同的数据

## 生产失败模式

| 失败 | 弱工具报告什么 | 分析必须证明什么 |
|---|---|---|
| 一条 `bl` 或 `call` 落进一个桩 | “调用了 0x694 处一个未命名的函数” | 桩字节、它加载的槽，以及该槽绑定的导入 |
| 从文件中读出的一个 GOT 字 | “损坏指针 0x8010000000000007” | 第 63 位是绑定，`next` 是 2，序号 7 是来自库 2 的 `_puts` |
| 目标文件中的 `PLT32` | “每次调用都走 PLT” | 已定义符号被降级为一个直接距离，只有未定义符号才得到一个条目 |
| 把部分 RELRO 读成完全 RELRO | “GOT 是只读的” | 没有 `-z now` 时，三个保留槽之后的 `.got.plt` 槽坐落在 `PT_GNU_RELRO` 之外 |
| 把 COFF `REL32` 和 ELF `PC32` 对比 | “Windows 构建有不同的重定位” | 偏移相同，那个 `-4` 存在于 ELF 加数和 COFF 字段中 |
| 在加载前读 IAT | “导入指向字符串” | 在加载器绑定之前 IAT 等于查找表，而那些字符串是 hint/name 条目 |
| 一个去除符号的 dylib | “没有符号，什么都不导出” | 导出 trie 和 `LC_FUNCTION_STARTS` 列出每个函数 |
| 对一个去除符号的可执行文件用 `nm` | “一个函数” | `LC_FUNCTION_STARTS` 列出五个起点，长九个字节 |
| 在 `-O2` 做一次序言扫描 | “一个函数” | 四个叶函数没有栈帧，调用目标和起点表找到它们 |
| 两个函数共享 36 字节 | “grade_label 就是 grade” | 字节 44 处的尾部字节和长度 60 与 72 分开这次碰撞 |
| 在另一台机器的构建上运行一个工具 | 这段文本里的数字 | 从你自己的 fixture 重新捕获每一份清单 |

## 操作规则

从调用点沿每次外部调用追踪到加载器所填充的槽，并在你把那个槽中的字叫作地址之前，按格式所定义的那样把它解码。只有在你已经记录了加载器仍然需要什么之后才去除符号。在你扫描字节之前，先从链接编辑器写下的表恢复函数起点，用一个带符号的孪生文件为每个查找器打分，并把每次签名碰撞连同分开它的那个字节一起记录。

## 延伸阅读

- [System V gABI, chapter 5: Program Loading and Dynamic Linking](https://www.sco.com/developers/gabi/latest/ch5.dynamic.html)
- [System V Application Binary Interface, AMD64 Architecture Processor Supplement: section 5.2 and Table 4.9](https://gitlab.com/x86-psABIs/x86-64-ABI)
- [Drepper, "How To Write Shared Libraries", version 4.1.2](https://akkadia.org/drepper/dsohowto.pdf)
- [Drepper, "ELF Symbol Versioning"](https://akkadia.org/drepper/symbol-versioning)
- [Jelinek, "Little hardening DSOs/executables against exploits", binutils list, 2004-01-06](https://www.sourceware.org/ml/binutils/2004-01/msg00070.html)
- [Taylor, "Linker relro", 2008](https://www.airs.com/blog/archives/189)
- [binutils commit bd7ab16b: PLT32 for calls, 2018-02-13](https://gnu.googlesource.com/binutils-gdb/+/bd7ab16b4537788ad53521c45469a1bdae84ad4a) and [LLVM D43383](https://reviews.llvm.org/D43383)
- [GNU Binutils: strip](https://sourceware.org/binutils/docs/binutils/strip.html) and [llvm-objcopy](https://llvm.org/docs/CommandGuide/llvm-objcopy.html)
- [Microsoft, PE Format](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format)
- [CALL instruction reference, FF /2](https://www.felixcloutier.com/x86/call)
- [Apple, mach-o/loader.h](https://github.com/apple-oss-distributions/xnu/blob/main/EXTERNAL_HEADERS/mach-o/loader.h) and [mach-o/nlist.h](https://github.com/apple-oss-distributions/xnu/blob/main/EXTERNAL_HEADERS/mach-o/nlist.h)
- [Apple dyld, mach-o/fixup-chains.h](https://github.com/apple-oss-distributions/dyld/blob/main/include/mach-o/fixup-chains.h)
- [Apple ld64, stub_arm64.hpp](https://github.com/apple-oss-distributions/ld64/blob/main/src/ld/passes/stubs/stub_arm64.hpp)
- [Xcode 13 release notes: chained fixups](https://developer.apple.com/documentation/xcode-release-notes/xcode-13-release-notes) and [WWDC22 session 110362, "Link fast: Improve build and launch times"](https://developer.apple.com/videos/play/wwdc2022/110362/)
- [strip(1)](https://keith.github.io/xcode-man-pages/strip.1.html), [ld(1)](https://keith.github.io/xcode-man-pages/ld.1.html), and [dyld(1)](https://keith.github.io/xcode-man-pages/dyld.1.html)
- [Hex-Rays, IDA F.L.I.R.T. Technology: In-Depth](https://docs.hex-rays.com/core/flirt/concepts/ida-f.l.i.r.t.-technology-in-depth) and [Lumina overview](https://docs.hex-rays.com/add-ons/lumina/overview)
- [Ghidra Function ID help](https://github.com/NationalSecurityAgency/ghidra/blob/master/Ghidra/Features/FunctionID/src/main/help/help/topics/FunctionID/FunctionID.html) and [AARCH64 function start patterns](https://github.com/NationalSecurityAgency/ghidra/blob/master/Ghidra/Processors/AARCH64/data/patterns/AARCH64_LE_patterns.xml)
- [Vector 35, WARP](https://github.com/Vector35/warp) and [Binary Ninja WARP guide](https://docs.binary.ninja/guide/warp.html)
- [BinDiff manual](https://www.zynamics.com/bindiff/manual/) and [BinDiff source](https://github.com/google/bindiff)
- [Diaphora](https://github.com/joxeankoret/diaphora)
- [rizin pat.c, the .pat parser](https://github.com/rizinorg/rizin/blob/dev/librz/sign/pat.c), [radare2 flirt.c](https://github.com/radareorg/radare2/blob/master/libr/anal/flirt.c), and [radare2 book: Zignatures](https://book.rada.re/signatures/zignatures.html)
- [Andriesse et al., "An In-Depth Analysis of Disassembly on Full-Scale x86/x64 Binaries" (USENIX Security 2016)](https://www.usenix.org/conference/usenixsecurity16/technical-sessions/presentation/andriesse) and [Andriesse, Slowinska, Bos, "Compiler-Agnostic Function Detection in Binaries" (EuroS&P 2017)](https://danielandriesse.com/papers/eurosp-2017.pdf)
- [Bao et al., ByteWeight (USENIX Security 2014)](https://www.usenix.org/conference/usenixsecurity14/technical-sessions/presentation/bao) and [Shin, Song, Moazzezi, "Recognizing Functions in Binaries with Neural Networks" (USENIX Security 2015)](https://www.usenix.org/conference/usenixsecurity15/technical-sessions/presentation/shin)
- [LIEF changelog](https://lief.re/doc/latest/changelog.html), [pyelftools](https://github.com/eliben/pyelftools), and [pefile](https://github.com/erocarrera/pefile)
