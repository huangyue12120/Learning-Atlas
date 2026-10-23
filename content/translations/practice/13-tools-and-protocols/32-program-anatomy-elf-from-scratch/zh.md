---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/docs/en.md
  revision: f7aadc1d61a9fbbe2bdb107d1e2bf0a6caeea299
  sha256: d293757ec62c29c7168e5e48405a7b8724a95132fe2532a943f1e4de1748500e
status: reviewed
---

# 程序剖析：从零实现一个 ELF 读取器

> 一个编译后的程序是一组互相指向的表格。你自己写的读取器给出的输出，可以逐字节核对。

**类型：** 构建
**语言：** Python（标准库）、C（仅用于测试夹具）
**前置要求：** Phase 0 · 第 01 课（开发环境），已安装 clang，Python 3.10 或更高版本，十六进制运算
**预计时间：** 约 120 分钟

## 学习目标

- 说明本轨道中每个目标的授权规则，以及 17 U.S.C. 1201(f) 的四项限制。
- 用 `struct.unpack` 读取 ELF 头、节头表和两个字符串表。
- 用 gABI 和 x86-64 psABI 中的名称解码 `.symtab` 条目和 `.rela` 记录。
- 返回某个具名函数的精确字节，并把每个文件偏移映射到拥有它的结构。
- 读取程序头，并通过 `PT_LOAD` 把虚拟地址映射为文件偏移。
- 读取 Mach-O 目标文件的加载命令，并指出每条命令对应哪个 ELF 概念。

## 开始之前：授权与法律

第 32 到 36 课中的每个目标都是你自己编写并编译的程序。源码是 `code/fixtures/ledger.c`，四个简短的 C 函数。你拥有源码、编译命令以及由此生成的目标文件。没有需要获取的阅读许可，没有需要绕过的保护，也没有第三方的代码被你打开。本轨道从不涉及软件保护、许可证检查或你并不拥有的程序。

这条规则之所以存在，是因为法律把反汇编视为复制。在 *Sega Enterprises Ltd. v. Accolade, Inc.*, 977 F.2d 1510 (9th Cir. 1992) 一案中，法院认定反汇编过程中产生的中间副本属于《著作权法》意义下的复制件。法院随后认定：“当反汇编是获取受著作权保护的计算机程序所体现的思想和功能要素的唯一途径，且存在寻求此种获取的正当理由时，反汇编作为法律问题属于对受著作权作品的合理使用。”（"where disassembly is the only way to gain access to the ideas and functional elements embodied in a copyrighted computer program and where there is a legitimate reason for seeking such access, disassembly is a fair use of the copyrighted work, as a matter of law."）

第二个判例是 *Sony Computer Entertainment, Inc. v. Connectix Corp.*, 203 F.3d 596 (9th Cir. 2000)。Connectix 在构建模拟器的过程中复制了 PlayStation BIOS，法院认定这些副本属于合理使用。两个判例都保护了研究行为。但都没有保护最终产品中被复制的代码。

两部法律确立了限制。17 U.S.C. 1201(f) 允许“已合法取得使用计算机程序副本权利”（"has lawfully obtained the right to use a copy of a computer program"）的人规避访问控制，“其唯一目的是识别和分析该程序中为实现独立创建的计算机程序与其他程序之间互操作性所必需的那些要素”（"for the sole purpose of identifying and analyzing those elements of the program that are necessary to achieve interoperability of an independently created computer program with other programs"）。四项限制层层叠加：合法的副本、互操作目的、尚未“轻易获得”（"readily available"）的要素，以及在其他方面不构成侵权的分析。第 1201(f) 节仅是反规避规则的一项例外。复制问题仍归合理使用管辖。

在欧盟，Directive 2009/24/EC 第 5(3) 条涵盖研究。有权使用副本的人可以“观察、研究或测试程序的运行，以确定程序任何要素所依据的思想和原理”（"observe, study or test the functioning of the program in order to determine the ideas and principles which underlie any element of the program"）。该权利适用于加载、显示、运行、传输或存储程序的过程中。

第 6 条允许在未经权利人授权的情况下进行反编译，条件是它“对于获取实现独立创建的计算机程序之间互操作性所必需的信息是不可或缺的”（"indispensable to obtain the information necessary to achieve the interoperability of an independently created computer program"）。这些条件与 1201(f) 相对应。被许可人实施这些行为，信息尚未轻易获得，并且行为限于所需的部分。第 6(2) 条禁止将结果用于任何其他目标，或用于在表达上实质相似的程序。第 8 条使任何与第 6 条或第 5(3) 条相抵触的合同条款无效。

| 来源 | 允许什么 | 条件 |
|---|---|---|
| 17 U.S.C. 1201(f) | 规避访问控制以分析某个程序 | 合法副本、互操作目的、信息尚未轻易获得、不构成侵权 |
| Directive 2009/24/EC Art. 5(3) | 观察、研究和测试运行中的程序 | 拥有使用副本的权利，行为限于正常的加载和运行 |
| Directive 2009/24/EC Art. 6 | 反编译 | 被许可人、互操作目的、信息尚未轻易获得、限于所需部分 |
| *Sega v. Accolade* | 反汇编作为合理使用 | 是触及思想和功能要素的唯一途径，且有正当理由 |
| *Sony v. Connectix* | 逆向工程过程中的中间副本 | 最终产品不构成侵权 |

这些说明来自法律条文和判决意见，不构成法律建议。当未来某个目标不属于你时，在打开文件之前先取得书面授权，并把授权与你的证据保存在一起。Reverse Engineering 101 手册第 2.1 节给出完整的引用出处和欧盟法院（CJEU）判例。

## 问题所在

你编译了 `ledger.c`，并对目标文件运行了 `llvm-objdump -t`。输出把 `percent_change` 列在值 `0000000000000000`、大小 `0000000000000010` 处。这个 1,768 字节文件中的哪 16 个字节是这个函数？该列表还显示偏移 `0x36` 处有 `R_X86_64_PC32 .rodata+0x10`，而文件中该位置的四个字节是零。它们会变成什么，为什么表格从 `0x14` 开始时加数却是 `0x10`？

rea 用 `inspect_binary_layout` 回答布局问题，而该工具只存在于装有 pwntools 4.15.0、通过 `REA_PWNTOOLS_PYTHON` 启用的 Linux x64 上。在这台 Mac 上它并不存在。`address_to_file_offset` 需要一个 Ghidra 会话和一份 SHA-256 匹配的原始文件字节完整副本。`inspect_artifact` 按路径和内容哈希列出容器中包含的内容。它从不打开目标文件内部的表格。于是你自己用 `struct.unpack` 写这个读取器，大约 950 行 Python，无任何依赖。测试把每个表格与一次性抓取到夹具中的 `llvm-objdump` 文本进行比较。

```figure
elf-byte-map
```

## 文件就是指向表格的表格

System V gABI 第 4 章图 4-1 描绘了同一文件的两种视图。链接视图包含一个 ELF 头、一个可选的程序头表、若干节，以及一个必需的节头表。执行视图包含一个 ELF 头、一个必需的程序头表、若干段，以及一个可选的节头表。gABI 加了一句话，它统领整个读取器：“只有 ELF 头在文件中有固定位置”（"Only the ELF header has a fixed position in the file"）。其他每个结构都要通过另一个结构中存储的偏移才能找到。

gABI 还固定了标量类型，并说明“ELF 不使用位域”（"ELF uses no bit-fields"）。`Elf64_Addr` 和 `Elf64_Off` 为 8 字节，`Elf64_Half` 为 2 字节，`Elf64_Word` 为 4 字节，`Elf64_Xword` 为 8 字节。x86-64 psABI 第 4.1.1 节要求 `ELFCLASS64`、`ELFDATA2LSB`、`e_machine` 为 `EM_X86_64`（62），以及 `e_flags` 为 0。小端序加上固定宽度意味着，带 `<` 前缀的 `struct.unpack` 一次调用就能读出每条记录。

`ledger-x86_64-O1.o` 的前 64 个字节：

```text
00000000: 7f45 4c46 0201 0100 0000 0000 0000 0000  .ELF............
00000010: 0100 3e00 0100 0000 0000 0000 0000 0000  ..>.............
00000020: 0000 0000 0000 0000 2804 0000 0000 0000  ........(.......
00000030: 0000 0000 4000 0000 0000 4000 0b00 0100  ....@.....@.....
```

对照 gABI 的“ELF Header”页来读。`e_ident` 是这 16 个字节：`7f 45 4c 46`（魔数）、类 2（64 位）、数据 1（小端序）、版本 1、OS ABI 0（System V）以及填充。

接着 `e_type` `0x0001` 是 `ET_REL`，一个可重定位目标文件。`e_machine` `0x003e` 是 62，即 `EM_X86_64`。`e_entry` 为零，因为目标文件没有入口点。`e_phoff` 为零，因为目标文件没有程序头。`e_shoff` 是 `0x428`，即节头表的文件偏移。最后一行保存 `e_ehsize` `0x40`、`e_phentsize` 0、`e_phnum` 0、`e_shentsize` `0x40`、`e_shnum` `0x0b`（11 个头）和 `e_shstrndx` `0x0001`。

读取器把这一行变成一次调用：

```python
fields = struct.unpack_from("<HHIQQQIHHHHHH", data, 16)
```

这个格式字符串就是从左到右读 gABI 图：两个半字、一个字、三个 8 字节值、一个字、六个半字。读取器会拒绝魔数、类或字节序不符的文件，也会拒绝 `e_shentsize` 或 `e_phentsize` 不是 64 和 56 的值。宽度错误会让后面每个偏移都算错，所以这项检查放在最前面。

## 节头与两个字符串表

每个节头是一个 64 字节的 `Elf64_Shdr`（gABI 图 4-8）：`sh_name`、`sh_type`、`sh_flags`、`sh_addr`、`sh_offset`、`sh_size`、`sh_link`、`sh_info`、`sh_addralign` 和 `sh_entsize`。格式字符串是 `<IIQQQQIIQQ`。`sh_name` 是进入下标为 `e_shstrndx` 的那个节的偏移，名称以第一个零字节结束。在这个目标文件中 `e_shstrndx` 是 1，而 clang 把那个节命名为 `.strtab`，因此一个表同时服务于节名和符号名。

读取器打印出 -O1 目标文件的 11 个节头：

```text
Idx Name             Type         Flags   Offset     Size       Addr Link Info Align
  0                  NULL                    0x0      0x0        0x0    0    0     0
  1 .strtab          STRTAB                0x368     0xbe        0x0    0    0     1
  2 .text            PROGBITS     AX        0x40     0x9f        0x0    0    0    16
  3 .rela.text       RELA         I        0x2a8     0x48        0x0   10    2     8
  4 .rodata          PROGBITS     A         0xe0     0x50        0x0    0    0     8
  5 .rela.rodata     RELA         I        0x2f0     0x78        0x0   10    4     8
  6 .rodata.str1.1   PROGBITS     AMS      0x130      0xa        0x0    0    0     1
  7 .comment         PROGBITS     MS       0x13a     0x2f        0x0    0    0     1
  8 .note.GNU-stack  PROGBITS              0x169      0x0        0x0    0    0     1
  9 .llvm_addrsig    LLVM_ADDRSIG E        0x368      0x0        0x0   10    0     1
 10 .symtab          SYMTAB                0x170    0x138        0x0    1    9     8
```

下标 0 是保留的空头。`.text` 在文件偏移 `0x40` 处保存 159 字节代码，紧跟在头之后，带标志 `A`（在内存中分配）和 `X`（可执行）。`.rodata` 保存 80 字节的只读数据。`.rodata.str1.1` 保存五个标签字符串 `F\0D\0C\0B\0A\0`，共 10 字节，带标志 `M`（可合并）和 `S`（字符串）。

`.comment` 保存 47 字节的编译器印记 `\0Apple clang version 17.0.0 (clang-1700.6.3.2)\0`。`.llvm_addrsig` 的类型是 `0x6fff4c03`，位于 gABI 保留的 `SHT_LOOS` 到 `SHT_HIOS` 这个 OS 专用范围内，LLVM 的 `ELF.h` 为它命名。它的标志 `E` 是 `SHF_EXCLUDE`，因此链接器会丢弃它。

`sh_link` 和 `sh_info` 两列是表与表之间的指针。`.rela.text` 的 `sh_info` 为 2、`sh_link` 为 10：它修补第 2 节，并从第 10 节取符号。`.symtab` 的 `sh_link` 为 1，即符号名所用的字符串表，`sh_info` 为 9，即第一个非局部符号的下标。`sh_addr` 在每一行都是零，因为目标文件还没有地址。地址由链接器分配。

gABI 的两条规则让读取器可以画出文件的完整映射。节“是连续的且不重叠”（"are contiguous and do not overlap"），而文件“可能包含非活动空间”（"may contain inactive space"）。读取器把每个结构按偏移排序并填上空洞：

```text
     0x0 +64    header   ELF header
    0x40 +159   section  .text
    0xdf +1     gap      inactive space
    0xe0 +80    section  .rodata
   0x130 +10    section  .rodata.str1.1
   0x13a +47    section  .comment
   0x169 +7     gap      inactive space
   0x170 +312   section  .symtab
   0x2a8 +72    section  .rela.text
   0x2f0 +120   section  .rela.rodata
   0x368 +190   section  .strtab
   0x426 +2     gap      inactive space
   0x428 +704   table    section header table
```

三个空洞共 10 字节，每一个都是对齐造成的。`.rodata` 的 `sh_addralign` 为 8，所以它从 `0xe0` 而不是 `0xdf` 开始。`.symtab` 的对齐为 8，所以 `.comment` 之后有七个字节闲置。节头表本身对齐到 8。

类型为 `SHT_NOBITS` 的节完全不占用文件字节，所以映射会跳过它们。这个目标文件中没有这种类型。链接后程序中的 `.bss` 就是这种类型，而一个在那里信任 `sh_size` 的读取器会读到文件末尾之外。

## 符号：绑定、类型、节、值、大小

一个 `Elf64_Sym` 是 24 字节（gABI 图 4-18）：`st_name`、`st_info`、`st_other`、`st_shndx`、`st_value`、`st_size`，格式 `<IBBHQQ`。`st_info` 打包了两个字段：高四位是绑定，低四位是类型。gABI 把绑定命名为 `STB_LOCAL` 0、`STB_GLOBAL` 1、`STB_WEAK` 2，把类型命名为 `STT_NOTYPE` 0、`STT_OBJECT` 1、`STT_FUNC` 2、`STT_SECTION` 3、`STT_FILE` 4。`st_other` 的低两位保存可见性，这里通篇都是 `STV_DEFAULT` 0。

```text
Idx            Value   Size Bind   Type    Section          Name
  0              0x0      0 LOCAL  NOTYPE  *UND*
  1              0x0      0 LOCAL  FILE    *ABS*            ledger.c
  2              0x0     20 LOCAL  OBJECT  .rodata          labels.rel
  3              0x0      0 LOCAL  SECTION .rodata          .rodata
  4              0x2      2 LOCAL  OBJECT  .rodata.str1.1   .L.str.1
  5              0x4      2 LOCAL  OBJECT  .rodata.str1.1   .L.str.2
  6              0x6      2 LOCAL  OBJECT  .rodata.str1.1   .L.str.3
  7              0x8      2 LOCAL  OBJECT  .rodata.str1.1   .L.str.4
  8              0x0      0 LOCAL  SECTION .rodata.str1.1   .rodata.str1.1
  9              0x0     16 GLOBAL FUNC    .text            percent_change
 10             0x10     46 GLOBAL FUNC    .text            grade
 11             0x40     31 GLOBAL FUNC    .text            total
 12             0x60     63 GLOBAL FUNC    .text            grade_label
```

下标 0 是保留的未定义符号。`st_shndx` 指明定义该符号的节，并有三个保留值：`SHN_UNDEF` 0、用于文件名的 `SHN_ABS` `0xfff1`，以及 `SHN_COMMON` `0xfff2`。节符号的名称为空，所以 `llvm-objdump` 为它们打印该节自己的名称，读取器也照做。gABI 规则“所有具有 STB_LOCAL 绑定的符号排在弱符号和全局符号之前”（"all symbols with STB_LOCAL binding precede the weak and global symbols"）表现为前九行，`.symtab` 也正是出于这个原因在 `sh_info` 中记录了 9。

在可重定位目标文件中，`st_value` 是符号所在节内部的偏移，因为 `sh_addr` 为零。因此一个函数的文件偏移是 `sh_offset + st_value - sh_addr`，它的长度是 `st_size`：

```python
section = elf.sections[symbol.st_shndx]
file_offset = section.sh_offset + (symbol.st_value - section.sh_addr)
code = elf.data[file_offset : file_offset + symbol.st_size]
```

对于 `percent_change` 那就是 `0x40 + 0`，这 16 个字节是 `85 ff 74 09 29 fe 6b c6 64 99 f7 ff c3 31 c0 c3`。大小和起点同样重要。`grade` 在 `.text` 偏移 `0x3e` 处结束。紧随其后的两个字节 `66 90` 是编译器添加的一个 `nop`，为的是让 `total` 从 `0x40`（16 字节边界）开始。这两个字节不属于任何符号。第 33 课把 `st_size` 用作反汇编器的停止条件，第 36 课在比较重建结果之前把它们屏蔽掉。

## 重定位：那些零字节意味着什么

一个 `Elf64_Rela` 是 24 字节（gABI 图 4-23）：`r_offset`、`r_info` 和一个有符号的 `r_addend`，格式 `<QQq`。gABI 用两个宏拆分 `r_info`：`ELF64_R_SYM(i)` 是 `i >> 32`，`ELF64_R_TYPE(i)` 是 `i & 0xffffffff`。在可重定位文件中，`r_offset` 是该表 `sh_info` 所指节内部的偏移。类型名称和公式来自 x86-64 psABI 表 4.9。其中 `S` 是符号值，`A` 是加数，`P` 是被修补的位置，`L` 是 PLT 条目。`R_X86_64_64` 是 `S + A`，`R_X86_64_PC32` 是 `S + A - P`，`R_X86_64_PLT32` 是 `L + A - P`。

-O1 目标文件有八条记录：

```text
  .rela.text       0x36 R_X86_64_PC32          .rodata+0x10
  .rela.text       0x84 R_X86_64_PC32          .rodata+0x24
  .rela.text       0x93 R_X86_64_PC32          .rodata-0x4
  .rela.rodata      0x0 R_X86_64_PC32          .rodata.str1.1
  .rela.rodata      0x4 R_X86_64_PC32          .L.str.1+0x4
  .rela.rodata      0x8 R_X86_64_PC32          .L.str.2+0x8
  .rela.rodata      0xc R_X86_64_PC32          .L.str.3+0xc
  .rela.rodata     0x10 R_X86_64_PC32          .L.str.4+0x10
```

把第一条拆开看。偏移 `0x36` 落在 `grade` 内部，`grade` 跨越 `0x10` 到 `0x3e`。`0x33` 处的指令是 `48 8d 0d 00 00 00 00`，一条 RIP 相对地址的 `lea`，它的四字节位移位于 `0x36`。处理器把这个位移加到下一条指令的地址 `0x3a` 上。

编译器希望结果是 `.rodata + 0x14`，那里是一张五个 32 位值 `1, 2, 3, 4, 4` 的表的起点。所以存储的值必须是 `(.rodata + 0x14) - 0x3a`。公式 `S + A - P` 在 `P = 0x36` 时给出 `.rodata + A - 0x36`。令两者相等得到 `A = 0x14 - 4 = 0x10`。加数带的是目标偏移减去位移与指令末尾之间的四个字节。

那张表就是 clang 在 -O1 下编译 `grade` 中 `switch` 的方式。代码用乘以 `0x66666667` 再两次移位来计算 `score / 10`，减去 6，与 4 比较，然后索引该表。-O1 的 ELF 目标文件没有为这张表保留符号。引用的是节符号 `.rodata` 加上一个加数，只有同一源码的 arm64 构建才把它命名为 `l_switch.table.grade`。第二条记录位于 `grade_label` 中的 `0x84`，指向 `.rodata + 0x28` 处一张 8 字节值的第二张表。第三条位于 `0x93`，指向 `.rodata + 0x0`，即 `labels.rel` 的起点。

五条 `.rela.rodata` 记录填充 `labels.rel`。每个条目位于偏移 `4i`，并得到加数 `4i`，于是 `S + A - P` 归约为字符串地址减去表的基址。`grade_label` 用 `movslq` 读取一个条目，加回表基址，就得到了指针。第一条记录命名节符号 `.rodata.str1.1`，加数为 0，因为字符串 `F` 是该节的第一个字节。其余各条命名 `.L.str.1` 到 `.L.str.4`，即编译器为 `D`、`C`、`B`、`A` 起的局部标签。

同一源码在三个优化级别下编译成三张不同的表。读取器无需反汇编器就能展示差异：

| 构建 | `labels` 位于何处 | `grade` 如何选择 | `grade_label` 如何到达 `grade` |
|---|---|---|---|
| -O0 | `.data`，五个 8 字节指针，五条 `R_X86_64_64` 记录 | `.rodata` 中的一张跳转表：五条指向 `.text` 的 `R_X86_64_PC32` 记录 | 一个带 `R_X86_64_PLT32 grade-0x4` 的 call |
| -O1 | `.rodata` 中的 `labels.rel`，五个 32 位相对条目 | `.rodata+0x14` 处的一张值表，一条 `R_X86_64_PC32` | 内联，无 call |
| -O2 | 与 -O1 相同 | 与 -O1 相同 | 内联，`total` 增长到 140 字节 |

在 -O0 下，`switch` 是一张真正的跳转表，其五个条目指回 `.text` 的 `+0x91`、`+0x8c`、`+0x87`、`+0x82` 和 `+0x86`。对 `grade` 的调用带着同样的 `-0x4` 加数，原因与那条 `lea` 相同。在 -O1 下，优化器发现每个 case 都返回一个常量，于是用一张结果表替换了跳转。第 33 课会解码这两种形态。

## 程序头：加载器的视图

可重定位目标文件没有程序头，所以 `e_phnum` 为 0。可执行文件或共享对象有程序头，加载器也只读它们。一个 `Elf64_Phdr` 是 56 字节（gABI 图 5-1）：`p_type`、`p_flags`、`p_offset`、`p_vaddr`、`p_paddr`、`p_filesz`、`p_memsz`、`p_align`，格式 `<IIQQQQQQ`。gABI 为 `PT_LOAD` 条目固定了三条规则。它们按 `p_vaddr` 升序出现；`p_memsz` 大于 `p_filesz` 意味着用零填充；`p_vaddr` 对 `p_align` 取模与 `p_offset` 同余。

本轨道中的每个目标都是你构建的程序，而这台 Mac 上没有任何链接器能从 `ledger.o` 生成 Linux 可执行文件。所以夹具 `tiny-x86_64` 来自 `code/fixtures/build_tiny_elf.py`，它用 `struct.pack` 写出 736 字节。该文件包含一个 ELF 头、两个程序头、一个 36 字节的 `_start`、一个 3 字节的 `.rodata`、一个符号表和六个节头。`_start` 向文件描述符 1 写入 `ok\n` 并以状态 42 退出。在 Linux x86-64 上它能运行。在这里它是程序头路径的一个夹具。

```text
Program headers:
  PT_LOAD          r-x offset=0x0 vaddr=0x400000 filesz=0x2e0 memsz=0x2e0 align=0x1000
  PT_GNU_STACK     rw- offset=0x0 vaddr=0x0 filesz=0x0 memsz=0x0 align=0x10

entry 0x4000b0 is file offset 0xb0 through PT_LOAD
```

这个唯一的 `PT_LOAD` 把整个 736 字节文件映射到 `0x400000`。读取器通过找到包含某地址的 `PT_LOAD` 并计算 `p_offset + (address - p_vaddr)` 来把地址映射为文件偏移。对入口点而言那就是 `0 + (0x4000b0 - 0x400000) = 0xb0`，即 `.text` 的起点。

这就是 rea 的 `address_to_file_offset` 背后的计算。对一个 Ghidra 目标，该工具返回 `{address, file_offset}`。Hopper 提供方还返回 `provider_file_offset` 和 `image_base_file_offset`。该工具需要一份文件的完整原始副本，且该副本的 SHA-256 必须与目标匹配。rea 的 `inspect_binary_layout` 文档加了一句值得记住的话：“一个链接地址不是运行时地址”（"A linked address is not a runtime address"）。位置无关可执行文件会加载到内核选定的基址，文件偏移是唯一稳定的坐标。

程序头还解释了为什么被去除符号的可执行文件仍能运行。链接器可以完全移除节头表，`e_shoff` 会变成零。于是遍历节的工具什么也看不到。加载器从不看它们。

## Mach-O 中的相同思想

Apple 没有为 Mach-O 发布任何散文式规范。XNU 源码中的头文件就是规范：`EXTERNAL_HEADERS/mach-o/loader.h`、`nlist.h` 和 `reloc.h`。夹具 `ledger-arm64-O1.o` 是用 `clang -target arm64-apple-macos -O1 -fno-asynchronous-unwind-tables -c` 构建的同一份 `ledger.c`。

一个 `mach_header_64` 是 32 字节：`magic`、`cputype`、`cpusubtype`、`filetype`、`ncmds`、`sizeofcmds`、`flags`、`reserved`。魔数是 `0xfeedfacf`，即 `MH_MAGIC_64`。`cputype` 是 `0x0100000c`，即 `CPU_TYPE_ARM64`。`filetype` 是 1，即 `MH_OBJECT`。`ncmds` 是 5，`sizeofcmds` 是 616：加载命令占据头之后的 616 字节，每一条都以 `{cmd, cmdsize}` 开头。标志 `0x2000` 是 `MH_SUBSECTIONS_VIA_SYMBOLS`。

```text
Load commands:
  0 LC_SEGMENT_64                cmdsize=472 at 0x20
  1 LC_BUILD_VERSION             cmdsize=24 at 0x1f8
  2 LC_LINKER_OPTIMIZATION_HINT  cmdsize=16 at 0x210
  3 LC_SYMTAB                    cmdsize=24 at 0x220
  4 LC_DYSYMTAB                  cmdsize=80 at 0x238
```

`LC_SEGMENT_64`（0x19）是 Mach-O 对两个 ELF 表的回答。它的 `segment_command_64` 有 `segname`、`vmaddr`、`vmsize`、`fileoff`、`filesize`、`maxprot`、`initprot`、`nsects` 和 `flags`。然后在同一条命令里跟着 `nsects` 条类型为 `section_64` 的记录，每条 80 字节。`loader.h` 关于 `MH_OBJECT` 的注释说，这些节位于“一个没有段填充的无名段中”（"in one unnamed segment with no segment padding"）。夹具展示了这一点：一个名称为空的段，`fileoff` 648，`filesize` 456，五个节。

```text
  Idx Section                    Addr   Size Offset Reloff Nreloc Type
    1 __TEXT,__text               0x0   0xd0    648   1104      6 S_REGULAR
    2 __DATA,__const             0xd0   0x28    856   1152      5 S_REGULAR
    3 __TEXT,__cstring           0xf8    0xa    896      0      0 S_CSTRING_LITERALS
    4 __TEXT,__const            0x108   0x40    912      0      0 S_REGULAR
    5 __LD,__compact_unwind     0x148   0x80    976   1192      4 S_REGULAR
```

每个节都在 `segname` 中指明它的父段，所以两个都叫 `__const` 的节是不同的，因为一个是 `__DATA,__const`，另一个是 `__TEXT,__const`。重定位通过 `reloff` 和 `nreloc` 按节组织，而 ELF 为每个目标各有一个单独的 `.rela.X` 节。

每个 `relocation_info` 是 8 字节。先是一个有符号的 `r_address`。接着是一个 32 位字段，打包为 `r_symbolnum`（24 位）、`r_pcrel`（1 位）、`r_length`（2 位）、`r_extern`（1 位）和 `r_type`（4 位）。六条 `__text` 记录是三对 `ARM64_RELOC_PAGE21` 和 `ARM64_RELOC_PAGEOFF12`，每一对对应一次表引用。arm64 的一个 `adrp` 加 `add` 做的事相当于一个 x86-64 的 `lea`，所以每次引用需要两条记录。五条 `__DATA,__const` 记录是 `r_length` 为 3 的 `ARM64_RELOC_UNSIGNED`，所以每一条修补一个 8 字节的绝对指针。

在 -O1 下，arm64 构建把 `labels` 保留为普通指针，而 x86-64 构建做成了一张相对表。

`LC_SYMTAB`（0x2）保存 `symoff` 1240、`nsyms` 17、`stroff` 1512、`strsize` 176，而 1512 加 176 是 1688，即文件大小。每个 `nlist_64` 是 16 字节：`n_strx`、`n_type`、`n_sect`、`n_desc`、`n_value`。`n_type` 是一个位域。`N_TYPE`（掩码 `0x0e`）等于 `N_SECT`（`0xe`）意味着定义在以 1 为起始序号 `n_sect` 所指的节中。`N_EXT`（`0x01`）标记外部符号。

`nlist_64` 没有大小字段。为了得到 `_percent_change` 的 24 个字节，读取器取同一节中下一个符号的地址，即 `0x18` 处的 `_grade`。C 符号在这里带前导 `_`，所以该函数是 `_percent_change`。

`LC_DYSYMTAB`（0xb）记录了与 ELF `sh_info` 相同的局部符号在前规则：`ilocalsym` 0、`nlocalsym` 13、`iextdefsym` 13、`nextdefsym` 4。`LC_BUILD_VERSION`（0x32）把 `platform` 1（macOS）、`minos` 26.0 和 `sdk` 26.2 记录为打包的 `XXXX.YY.ZZ` 整数。这条命令正是 arm64 夹具以字节形式提交的原因。在装有另一个 SDK 的 Mac 上构建会产生不同的文件。

读取器的 `compare_formats` 把两个文件并排放在一起：

| 思想 | ELF, `ledger-x86_64-O1.o` | Mach-O, `ledger-arm64-O1.o` |
|---|---|---|
| 文件标识 | `e_ident` `7f 45 4c 46`，类 64，数据 LSB | `magic` `0xfeedfacf` |
| 机器 | `e_machine` 62，`EM_X86_64` | `cputype` `0x100000c`，`CPU_TYPE_ARM64` |
| 文件种类 | `e_type` 1，`ET_REL` | `filetype` 1，`MH_OBJECT` |
| 表格在哪里 | `e_shoff` `0x428`，11 个节头 | 5 条加载命令，头之后 616 字节 |
| 代码 | `.text` 在 `0x40`，大小 `0x9f`，标志 `AX` | `__TEXT,__text` 在 648，大小 `0xd0`，位于无名段中 |
| 符号名 | `.symtab`（第 10 节），名称通过 `sh_link` 1 在 `.strtab` 中 | `LC_SYMTAB` `symoff` 1240，`nsyms` 17，名称在 `stroff` 1512 |
| 符号大小 | `st_size`：`percent_change` 为 16 字节 | 无此字段：下一个符号减去本符号，24 字节 |
| 重定位 | `.rela.text`，3 条记录，`R_X86_64_PC32` | `__text` `reloff` 1104，6 条记录，`PAGE21` 和 `PAGEOFF12` |
| 函数字节 | `percent_change`：`0x40` 处 16 字节 | `_percent_change`：`0x288` 处 24 字节 |

rea 通过 `inspect_macho` 读取 Mach-O，它通过 `xcrun` 运行 `otool -h -l`、`nm -gjU`、`dyld_info -imports -exports` 和 `dwarfdump --uuid`。你的读取器一个都不需要，它读取的是和 `otool -l` 打印的相同的 `symoff` 和 `stroff`。rea 的 `open_binary` 工具从魔数字节检测 ELF、MZ、PE，以及瘦（thin）或通用（universal）Mach-O。它还自己读取偏移 18 处的 `e_machine`。那正是你在这里构建的前 20 个字节。对于没有头的文件，你给出 `format: raw-binary`、架构和入口地址。Ghidra 提供方拒绝通用二进制文件，并要求一个切片后的瘦文件。你的读取器在看到 `0xcafebabe` 时也这样做。

## 构建它

运行标准库读取器：

```bash
cd phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch
python3 code/main.py
```

演示程序读取 `ledger-x86_64-O1.o`，并打印它的头、节、符号、重定位和文件偏移映射。然后打印四个函数的字节串，读取 `ledger-arm64-O1.o`，并打印比较表。最后以 `tiny-x86_64` 的程序头结束。预期的行：

```text
percent_change: 16 bytes at file offset 0x40: 85 ff 74 09 29 fe 6b c6 64 99 f7 ff c3 31 c0 c3
grade: 46 bytes at file offset 0x50: 48 63 c7 48 69 c0 67 66 66 66 ...
entry 0x4000b0 is file offset 0xb0 through PT_LOAD
```

传入一个路径即可读取单个文件：`python3 code/main.py code/fixtures/ledger-x86_64-O0.o`。读取器从前四个字节判断是 ELF 还是 Mach-O。

按以下顺序阅读 `code/main.py`：

1. `ElfFile._read_header()` 检查魔数、类、字节序和条目大小，然后解包头。
2. `ElfFile._read_sections()` 和 `read_cstring()` 读取节头表，并通过 `e_shstrndx` 解析名称。
3. `ElfFile._read_symbols()` 拆分 `st_info`，通过 `sh_link` 解析名称，并保持保留节下标可读。
4. `ElfFile._read_relocations()` 遍历每个 `SHT_RELA` 节，拆分 `r_info`，并用表 4.9 命名类型。
5. `ElfFile.function_span()` 和 `function_bytes()` 把一个符号变成文件范围以及其中的字节。
6. `ElfFile.file_offset_map()` 把每个结构按偏移排序并填上非活动空间。
7. `ElfFile._read_program_headers()` 和 `address_to_file_offset()` 处理可执行文件。
8. `MachOFile` 读取头、加载命令、带各节的 `LC_SEGMENT_64`、`LC_SYMTAB`、`LC_BUILD_VERSION` 以及按节组织的重定位。
9. `compare_formats()` 用从各文件读取的值在两个文件中命名同一个思想。

## 使用它

在后续课程中，先把本课的 `code` 目录加入 `sys.path`，再用 `from main import ElfFile` 导入这个读取器。第 33 课向它请求 `function_bytes` 和 `relocations_for(".text")`。第 35 课把它的输出记录为观测证据。第 36 课向它请求重定位偏移，以便在字节比较前屏蔽掉它们。

用同样的 `clang -target x86_64-unknown-linux-gnu -c` 命令把你自己的 C 编译成目标文件，然后对它运行读取器。只有当 x86-64 psABI 表 4.9 列出某个重定位名称时才添加它。只有当 gABI 或产生该文件的工具链有文档说明时才添加某个节类型。当读取器遇到一个它没有名字的值时，它会打印十六进制的数字，而不是去猜。

## 交互实验

### 实验 A：手工读头

在 `code` 目录下打开 Python：

```bash
cd phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/code
python3 -q
```

运行：

```python
import struct
from main import ElfFile, FIXTURES
data = (FIXTURES / "ledger-x86_64-O1.o").read_bytes()
data[:4], data[4], data[5]
struct.unpack_from("<HHIQQQIHHHHHH", data, 16)
elf = ElfFile(data)
elf.header.e_shoff, elf.header.e_shnum, elf.sections[elf.header.e_shstrndx].name
```

这个元组显示 `e_type` 1、`e_machine` 62 和 `e_shoff` 1064，即 `0x428`。最后一行显示第 1 节 `.strtab` 保存着节名。

### 实验 B：switch 背后的值表

```python
rodata = elf.section_bytes(elf.section(".rodata"))
[int.from_bytes(rodata[i : i + 4], "little") for i in range(0x14, 0x28, 4)]
[int.from_bytes(rodata[i : i + 8], "little") for i in range(0x28, 0x50, 8)]
[r for r in elf.relocations_for(".text") if r.symbol == ".rodata"]
```

两张表都读出 `1, 2, 3, 4, 4`。对照 `ledger.c` 核对：`grade(65)` 计算 `65 / 10 - 6 = 0`，读取条目 0，即 1，也就是 `case 6` 的值。`grade(100)` 读取条目 4，即 4，也就是 `case 10` 和 `case 9` 共享的值。

### 实验 C：同一源码的三种构建

```python
for level in ("O0", "O1", "O2"):
    obj = ElfFile.from_path(FIXTURES / f"ledger-x86_64-{level}.o")
    print(level, [s.name for s in obj.sections if s.name in (".data", ".rodata")])
    print(level, sorted({r.type_name for r in obj.relocations}))
    print(level, {s.name: s.st_size for s in obj.symbols if s.type == "FUNC"})
```

-O0 目标文件有一个 `.data` 节和三种重定位类型。-O1 和 -O2 目标文件没有 `.data`，只有一种类型。`total` 在 -O0 下是 66 字节，-O1 下 31 字节，-O2 下 140 字节。

### 实验 D：Mach-O 中的同一函数

```python
from main import MachOFile
macho = MachOFile.from_path(FIXTURES / "ledger-arm64-O1.o")
[(c.name, c.cmdsize) for c in macho.load_commands]
macho.function_span("_percent_change")
macho.function_bytes("_percent_change")[:4].hex()
```

这个跨度是文件偏移 648 处的 24 字节。前四个字节是 `a0000034`，即指令 `0x340000a0` 的小端形式，`llvm-objdump -d` 把它打印为 `cbz w0, 0x14`。那就是 `before == 0` 守卫，和 x86-64 构建编码为 `85 ff 74 09` 的是同一个测试。

## 实践实验

把读取器扩展到一个链接后的程序。在一台 Linux x86-64 机器上，构建 `clang -O1 -shared -fPIC code/fixtures/ledger.c -o libledger.so` 和 `clang -O1 code/fixtures/ledger.c -o ledger_main`（你再加一个 `main`），然后对两者都运行读取器。

要求：

- 用相同的 `Elf64_Sym` 布局读取 `.dynsym`，因为 `SHT_DYNSYM` 是 11，记录不变。
- 把 `.dynamic` 当作 `d_tag` 和 `d_val` 组成的 `Elf64_Dyn` 记录来读，并依据 gABI“Dynamic Section”页命名 `DT_NEEDED`、`DT_STRTAB`、`DT_SYMTAB`、`DT_RELA` 和 `DT_JMPREL`。
- 把 `st_shndx` 为 `SHN_UNDEF` 的未定义符号列为导入，把 `.rela.plt` 中的 `R_X86_64_JUMP_SLOT` 记录列为到达它们的调用点。
- 用 gABI 规则“一个目标文件段包含一个或多个节”（"an object file segment contains one or more sections"），把每个 `PT_LOAD` 段映射到它包含的节。
- 用 `address_to_file_offset` 证明共享对象中每个已定义函数的字节就是 `function_bytes` 返回的字节。
- 把两个文件的 `llvm-objdump -h -t -r -p` 和 `llvm-objdump -T` 文本抓取到 `code/fixtures/`，并在测试中把读取器与它们比较。

成功意味着导入列表、段映射和每个函数范围都与抓取到的工具输出一致，且测试过程中不运行任何工具。

## 评分实验

关于本课夹具的五个问题。用你构建的代码找出每个答案，然后把它写进 `code/lab_answers.json`。数字写成数字或写成如 `"0x40"` 的十六进制字符串，列表写成 JSON 列表。

1. `t1`：ledger-x86_64-O1.o 的 e_shoff，写成数字。
2. `t2`：ledger-x86_64-O1.o 中 percent_change 的 st_size。
3. `t3`：ledger-x86_64-O1.o 中 .text 的文件偏移，写成十六进制。
4. `t4`：ledger-x86_64-O0.o 中的重定位类型名称，排序后写成列表。
5. `t5`：ledger-x86_64-O1.o 中 .rodata+0x14 处的五个 int 值，写成列表。

检查你的答案：

```bash
cd phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch
python3 code/lab.py
```

检查器从 `code/main.py` 在已提交的夹具上计算出每个预期值。它为每个任务打印 `PASS`、`FAIL` 或 `TODO` 以及一个分数，只有五项全部通过时才以 0 退出。`python3 code/lab.py my-answers.json` 检查另一个文件。`code/tests/test_lab.py` 证明检查器接受正确答案并拒绝一个错误答案。

### 运行效果

[Inside a Decompiler](https://aiengineeringfromscratch.com/inside-a-decompiler) 这台机器把本课作为它的前两个工位来运行。卷轴读取保存 `percent_change` 的目标文件的头，机柜打开 `.text` 并读取该符号。把 Symbols 关掉，看看符号表携带了哪些事实。

## 随课交付物

本课产出 `outputs/skill-program-anatomy-elf-from-scratch.md`。可配合 Claude、Cursor、Codex、OpenClaw、Hermes 或任何读取 SKILL.md 的智能体使用。该技能把用户构建的一个编译目标文件或可执行文件变成一份布局报告。报告给出每个结构、符号和重定位的文件范围，并对照抓取到的工具输出进行核对。

## 验证它

运行演示程序和确定性测试套件：

```bash
cd phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

该套件证明：

- 每个节的下标、名称、大小、地址和种类都与为三个 x86-64 目标文件和微型可执行文件抓取的 `llvm-objdump -h` 文本相符
- 每个符号的值、绑定、类型、节、大小和名称都与抓取的 `llvm-objdump -t` 文本相符
- 每个重定位的偏移、类型名、符号和加数都与抓取的 `llvm-objdump -r` 文本相符，包括 -O0 下的 `R_X86_64_PLT32` 和 `R_X86_64_64`
- `tiny-x86_64` 的两个程序头都与抓取的 `llvm-objdump -p` 文本相符，而目标文件没有程序头
- `percent_change` 是文件偏移 `0x40` 处的 16 字节，带预期字节，且每个函数都落在 `.text` 内
- 文件偏移映射把每个夹具的每个字节恰好覆盖一次，-O1 目标文件的三个对齐空洞各就其位
- `tiny-x86_64` 的入口点通过 `PT_LOAD` 映射到文件偏移 `0xb0`，而可重定位目标文件拒绝地址映射
- Mach-O 头、每条加载命令、该段、五个节、`LC_SYMTAB` 和 `LC_BUILD_VERSION` 都与抓取的 `--private-headers` 文本相符
- Mach-O 符号和 15 条重定位都与抓取的 `llvm-objdump` 文本相符，且 `_percent_change` 是偏移 648 处的 24 字节
- 错误的魔数、32 位的类、大端文件、被截断的表、通用二进制文件以及 C 源文件都会抛出 `FormatError`
- `build_tiny_elf.py` 逐字节重现已提交的 `tiny-x86_64`
- 图示模块 `site/figures-re-32.js` 携带 `ledger-x86_64-O1.o` 的精确字节

## 生产失败模式

| 失败 | 薄弱的读法会报告什么 | 读取器必须证明什么 |
|---|---|---|
| 把 `st_value` 当作文件偏移 | “`percent_change` 在 0 处” | 偏移是 `sh_offset + st_value - sh_addr`，这里是 `0x40` |
| 把填充当作代码 | “`grade` 是 48 字节” | `st_size` 是 46，其后的 `66 90` 不属于任何符号 |
| 从错误的表读节名 | 乱码名称或一个异常 | `e_shstrndx` 指明该表，这里是第 1 节 |
| 对 `SHT_NOBITS` 信任 `sh_size` | 读到文件末尾之外 | `.bss` 没有文件字节，映射会跳过它 |
| 把零字节读作操作数 | “`lea 0(%rip)`” | `0x36` 处的 `.rela.text` 记录命名 `.rodata+0x10` |
| 把加数读作目标偏移 | “表格从 `0x10` 开始” | `S + A - P` 结合指令末尾给出 `0x14` |
| 在被去除符号的可执行文件上遍历节 | “文件没有代码” | `PT_LOAD` 映射加载器使用的每个地址 |
| 把链接地址当作运行时地址 | 在随机基址下得到错误偏移 | 来自 `PT_LOAD` 的文件偏移是稳定坐标 |
| 仅用 `sectname` 查找 Mach-O 节 | 两个 `__const` 节被合并为一个 | 名称是 `segname,sectname` |
| 期望 `nlist_64` 中有大小字段 | 一个异常或零字节 | 同一节中的下一个符号标记函数的结束 |
| 把通用二进制文件当作一个 Mach-O 读 | “魔数 `0xcafebabe` 未知” | 拒绝它并要求一个切片后的瘦文件 |
| 在另一台 Mac 上重建 arm64 目标文件 | “夹具变了” | `LC_BUILD_VERSION` 记录 SDK，所以已提交的字节就是夹具 |

## 操作规则

读取你能信任的头，沿着它保存的偏移走，并用定义每个字段的规范为其命名。把你用来比对的工具输出作为已提交的夹具保留下来，这样比对无需工具即可运行。当一个值在规范中没有名字时，打印这个数字。你能逐字节核对的读取器，正是后续每一课都在其上构建的那一个。

## 延伸阅读

- [System V gABI, chapter 4: Object Files](https://www.sco.com/developers/gabi/latest/ch4.intro.html) 以及 [ELF Header](https://www.sco.com/developers/gabi/latest/ch4.eheader.html)、[Sections](https://www.sco.com/developers/gabi/latest/ch4.sheader.html)、[Symbol Table](https://www.sco.com/developers/gabi/latest/ch4.symtab.html) 和 [Relocation](https://www.sco.com/developers/gabi/latest/ch4.reloc.html) 各页
- [System V gABI, chapter 5: Program Header](https://www.sco.com/developers/gabi/latest/ch5.pheader.html) 和 [Dynamic Linking](https://www.sco.com/developers/gabi/latest/ch5.dynamic.html)
- [System V ABI, AMD64 Architecture Processor Supplement](https://gitlab.com/x86-psABIs/x86-64-ABI)，表 4.9 Relocation Types
- [Apple XNU `loader.h`](https://github.com/apple-oss-distributions/xnu/blob/main/EXTERNAL_HEADERS/mach-o/loader.h)、[`nlist.h`](https://github.com/apple-oss-distributions/xnu/blob/main/EXTERNAL_HEADERS/mach-o/nlist.h) 和 [`reloc.h`](https://github.com/apple-oss-distributions/xnu/blob/main/EXTERNAL_HEADERS/mach-o/reloc.h)
- [17 U.S.C. 1201](https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title17-section1201&num=0&edition=prelim) 和 [Directive 2009/24/EC](https://eur-lex.europa.eu/eli/dir/2009/24/oj/eng)
- [Sega v. Accolade, 977 F.2d 1510](https://law.resource.org/pub/us/case/reporter/F2/977/977.F2d.1510.92-15655.html) 和 [Sony v. Connectix, 203 F.3d 596](https://law.resource.org/pub/us/case/reporter/F3/203/203.F3d.596.99-15852.html)
- [rea 6.5.0 `docs/binary-diagnostics.md`](https://github.com/morluto/rea/blob/rea-agents-6.5.0/docs/binary-diagnostics.md) 和 [`docs/ghidra-provider.md`](https://github.com/morluto/rea/blob/rea-agents-6.5.0/docs/ghidra-provider.md)
