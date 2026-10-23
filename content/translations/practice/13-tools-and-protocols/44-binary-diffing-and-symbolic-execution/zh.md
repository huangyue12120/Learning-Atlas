---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/44-binary-diffing-and-symbolic-execution/docs/en.md
  revision: f7aadc1d61a9fbbe2bdb107d1e2bf0a6caeea299
  sha256: 43f7d2f24296423d771d3ea04c052277bbce603115b759886207713b619714f6
status: reviewed
---

# 二进制差异比对与符号执行：匹配函数并求解输入

> 两个函数之间的一次匹配，是由一个签名以某种质量作出的一项主张；一个求解出的输入，是一条路径条件的一个模型。本课同时构建这两者，并用 radiff2、Ghidra、angr 和 z3 来检验它们。

**类型：** 构建
**语言：** Python、C、x86-64 汇编、Java（一个 Ghidra 脚本）
**前置要求：** Phase 13 · 第 33 课（反汇编与控制流）、第 34 课（提升为伪代码）、第 36 课（重建并证明等价）
**预计时间：** 约 150 分钟

## 学习目标

- 从一个目标文件及其反汇编列表构建五种函数签名：精确字节、将重定位字段掩码后的字节、助记符序列、流图形状，以及符号名。
- 以 BinDiff 的风格运行一个分阶段的贪心匹配器：只有当某个签名在两侧都唯一时才构成匹配，并记录每次匹配背后的阶段和质量。
- 复现这样一个案例：两个字节完全相同的函数在加载后的映像上被字节关联器判为不匹配，掩码之后却通过；并给出解释那四个变化字节的重定位算术。
- 从 Levenshtein 距离复现 radiff2 的相似度比率，并解释为什么某个比率只有在比较 radare2 实际触及的 82 字节时才会出现。
- 在一个小型 IR 上枚举一个函数的所有路径，为每条路径携带一个条件，并用有界搜索为每个叶子求解输入。
- 在一个带符号上界的循环上度量路径爆炸，并把路径数、分类和模型与 angr 10.0.3 和 z3 5.1.0 的结果作比较。

## 问题所在

你在 `-O2` 下重建了 `ledger.c`，并问一个智能体：相比 `-O1` 构建是否有任何改动。智能体运行了一个差异比对工具，报告说 `grade` 被修改了，因为它的字节在两个加载后的程序中不同。接着它花光预算去解释一个并不存在的改动。`grade` 的那 46 字节在两个目标文件中完全相同。差异比对工具比较的是重定位之后的映像，而 `.rodata` 在 `-O2` 程序中向后挪了 0x70 字节，于是 `grade` 中的一个位移值增大了 0x70。

同一个下午，你又问哪个分数会让 `grade` 返回 4。智能体读了伪代码，回答“90”。那是一个答案。该函数对 90 到 109 之间的每个分数都返回 4，而问题并没有给出界限，所以智能体的回答只是一个样本，而你需要的是一个集合。

两次失败都源自同一个缺口。一次匹配和一个求解出的输入，各自都是一项主张，背后都有一套方法。本课用标准库 Python 构建这两套方法，并把生产工具放在旁边一起运行。工具和代码一致的地方，你就有了两条推导。两者不一致的地方，你就有了一个要去看的地址、字节或界限。

```figure
re-44-matches-and-paths
```

## 函数签名是一项带质量的主张

Flake 在 2004 年把二进制差异比对框定为：在两个相似可执行文件的函数集合之间构造一个同构。Dullien 和 Rolles 在 2005 年把它扩展到基本块和指令。BinDiff 的概念页描述了由那项工作衍生出的策略：为两侧的每个函数计算一个属性。在每一侧都恰好出现一次的值即构成匹配。出现多于一次的值是有歧义的，要在该等价类内部用下一个属性继续细分。没有对应项的值保持未匹配。每一轮之后，新匹配的调用者和被调用者形成若干小集合，下一个属性在其中很可能唯一，于是这个过程用下一个属性重复进行。

每种匹配算法都带有一个质量。该页把原始函数字节的哈希匹配和名称哈希匹配评为“非常好”，把流图 MD 指数和素数签名匹配（每个助记符对应一个小素数，取整个函数的乘积）评为“好”，把字符串引用评为“中等”，把循环计数或地址序列评为“差”。一次匹配的置信度，是产生它的各算法质量的平均值，再用 sigmoid 加权。函数相似度大约由 25% 的匹配流图边、15% 的匹配基本块、10% 的匹配指令，以及 50% 的流图 MD 指数之差构成，再乘以置信度。

本课保留其中五个属性，以及那条真正重要的规则：在两侧都唯一，否则不匹配。它舍弃 MD 指数，因为概念页只给出了名字而没有公式，并用一个朴素的度序列来代替。质量标签保留下来，因为一次匹配的好坏，取决于产生它的那条最弱事实。

## 从一条函数记录得到五种签名

差异比对工具为每个目标读取两样东西。ELF 提供字节、符号大小和 `.rela.*` 记录。`llvm-objdump -d` 列表提供指令边界和助记符，而第 33 课已证明一个解码器在这些目标的每条指令上都与该列表相等。`function_record()` 检查每条列出的指令的字节都等于目标在该地址处的字节，否则抛出异常。过时的列表就是被改动过的 fixture。

以 `ledger-x86_64-O1.o` 中的 `grade` 为例。符号说偏移为 0x10、大小为 46，所以这条记录覆盖 0x10 到 0x3e，并排除对齐下一个函数的那个两字节 `nop`。

精确字节签名是这 46 字节的 SHA-256。掩码字节签名先把每个重定位字段清零。这里只有一个字段：记录 `R_X86_64_PC32 .rodata+0x10` 位于偏移 0x36，宽 4 字节，是位于 0x33 的 `leaq (%rip), %rcx` 的位移。在一个 RELA 目标中，这四个字节本就已经是零，所以两种签名在这里每个目标的每个函数上都一致。这个掩码是为下一节而存在的。

助记符签名哈希的是这 14 个助记符的序列：

```text
movslq imulq movq sarq shrq addl addl xorl cmpl ja movl leaq movl retq
```

流图形状签名来自第 33 课的基本块和带类型的边，并限制在入口可达的那些块上。`grade` 在 `-O1` 下有三个块和三条边。块 0x10 以 `ja 0x3d` 结束，带一条跳转边和一条落空边，块 0x31 落空到 0x3d，而 0x3d 返回。度序列按排序顺序列出每个块的（入，出），所以该签名读作 `3b 3e [0/2,1/1,2/0]`。对 `-O0` 下的 `grade`，记录通过五条 `.rela.rodata` 项精确解析那个间接跳转，和第 33 课的做法一样，得到八个块、十一条边，其中四条是 `table` 边。

名称签名就是符号名。当它存在时是最强的事实，而当构建被去除符号时则什么都不是。

还有一个字段会一起带着，供后面的补丁案例使用。当一个函数带有指向 `.rodata` 的 `lea` 重定位、一个边界检查和一个带索引的加载时，`referenced_table()` 会像第 36 课那样读取这张表：`ja` 之前的 `cmpl $0x4` 给出五个条目，而加载指令 `movl (%rcx,%rax,4), %eax` 给出每个条目 4 字节。对 `-O1` 下的 `grade`，位于 `.rodata+0x14` 的表读出 `1, 2, 3, 4, 4`。

## 贪心匹配器

`match_functions()` 按顺序运行各阶段。对每个阶段，它把每一侧仍未匹配的函数按该阶段的签名分组，并接受在每一侧都恰好只有一个函数的每个值。匹配会记录该阶段、该阶段的质量、所有同样一致的其他签名，以及一个相似度比率。

```python
for stage in order:
    for signature, candidates in left_groups.items():
        partners = right_groups.get(signature, [])
        if len(candidates) != 1 or len(partners) != 1:
            continue
        a, b = candidates[0], partners[0]
        agreeing = [s.id for s in STAGES if a.signatures()[s.id] == b.signatures()[s.id]]
        matches.append(Match(a, b, stage, agreeing, radare2_ratio(a.raw, b.raw), data_equal))
```

本课的顺序先运行四个结构化阶段，名称放在最后，这样结构化阶段先受到检验，名称随后对它们评分。对 `-O1` 对 `-O2`：

| 函数 | 阶段 | 一致的签名 | 相似度 |
|---|---|---|---|
| `percent_change` | 精确字节 | 全部五种 | 1.000 |
| `grade` | 精确字节 | 全部五种 | 1.000 |
| `total` | 名称 | 仅名称 | 0.171 |
| `grade_label` | 精确字节 | 全部五种 | 1.000 |

`total` 从 31 字节、13 条指令增长到 140 字节、41 条指令，因为 clang 用 SSE2 把循环向量化了，并保留了一个标量余数循环。它的形状从五个块、五条边变成十个块、十三条边。没有任何结构化特征存活下来，只有符号把两者联系在一起。

对 `-O0` 对 `-O1`，同样的顺序产生了一个错误匹配：

| -O0 下的函数 | 在 -O1 匹配到 | 阶段 | 名称一致 |
|---|---|---|---|
| `percent_change` | `grade_label` | 流图形状 | 否 |
| `grade` | `grade` | 名称 | 是 |
| `total` | `total` | 名称 | 是 |
| `grade_label` | 未匹配 | | |

`-O0` 下的 `percent_change` 是一个四块菱形：一个在 `before == 0` 上分支的入口、两条分支臂，以及一个返回的汇合块。它的度序列是 `0/2, 1/1, 1/1, 2/0`。`-O1` 下的 `grade_label` 内联了 `grade`，并在边界检查周围有同样的菱形。该形状在两侧都唯一，规则于是接受了它。中等质量标签就是那个警告，而随后运行的名称阶段驳斥了它。这个错误匹配还在右侧占用了 `grade_label`，于是真正的 `percent_change` 和 `grade_label` 配对都保持未匹配。

BinDiff 的顺序在存在真实名称时把名称匹配作为第二阶段运行，代码中的 `BINDIFF_ORDER` 也这样做。采用那个顺序时，`-O0` 的全部四个函数都按名称匹配到它们的 `-O1` 版本，这正是下文 Ghidra 报告的结果。本课在演示中保留两种顺序，以便让这个失败可见。四节点的流图形状，是每一个在返回前汇合的 `if` 和 `else` 的形状。

## 字节相同，操作数被重定位

Ghidra 在导入一个目标时会应用重定位。因此它的字节关联器比较的是加载后的映像，这也是第 36 课为此掩码重定位字段的原因。`load_image()` 复现了这次导入。它按头部顺序遍历已分配的节，把每个节对齐到它的 `sh_addralign`，并从 0x100000 开始布置。然后它应用每条记录：`R_X86_64_PC32` 和 `R_X86_64_PLT32` 写成有符号 32 位值 `S + A - P`，`R_X86_64_64` 写成 64 位的 `S + A`。

这个布局在两个程序的每个节起始处都与 Ghidra 12.1.4 一致，测试套件会据此对照捕获到的 Version Tracking 输出来检查：

| 节 | `-O1` 程序 | `-O2` 程序 |
|---|---|---|
| `.text` | 0x100000，159 字节 | 0x100000，271 字节 |
| `.rodata` | 0x1000a0 | 0x100110 |
| `.rodata.str1.1` | 0x1000f0 | 0x100160 |

`.text` 在 `-O2` 下长了 112 字节，这是 `total` 的增长，于是 `.rodata` 向后挪了 0x70 字节。`grade` 在两个程序中都位于 0x100010。它位于偏移 0x33 的 `leaq` 的位移字段在 0x36，并在 0x3a 结束。重定位加数 0x10 再加上惯常的 4，把表定位到 `.rodata+0x14`。

在 `-O1` 映像中：`0x1000a0 + 0x14 - 0x10003a = 0x7a = 122`。在 `-O2` 映像中：`0x100110 + 0x14 - 0x10003a = 0xea = 234`。该字段字节在一个映像中是 `7a 00 00 00`，在另一个中是 `ea 00 00 00`。46 字节里有一字节不同，Levenshtein 比率是 0.978，精确字节阶段失败。掩码字节阶段把该字段清零后通过。`grade_label` 和它的表一起挪动了相同的 0x70，于是它的位移保持相等，它在两个视图下都通过精确字节匹配。

Ghidra 报告了相同的分裂。在 `-O1` 对 `-O2` 上，Exact Function Bytes Match 找到了 `percent_change` 和 `grade_label`，Exact Function Instructions Match 找到了这两个再加 `grade`，Exact Function Mnemonics Match 找到了相同的三个。指令关联器会掩码操作数，这涵盖了那个位移。本课的映像视图为 Ghidra 字节关联器找到的恰好那两个函数给出精确字节匹配，并为它的指令关联器找到的恰好那三个函数给出掩码字节一致。测试套件会断言这两处相等。

rea 6.5.0 的 `compare_functions` 对提供器文本做逐行差异。在汇编这个维度上，它附带了限制说明“重定位归一化不可用”（"relocation normalization is unavailable"）。本课中的加载器和掩码提供了这项归一化。

## radiff2 度量的是什么

radare2 6.2.4 自带 `radiff2`。用 `-AC` 时，它分析两个文件并为每个函数打印一行：左侧的大小和地址、MATCH 或 UNMATCH、一个比率，以及右侧的大小和地址。我们这些目标捕获到的行如下：

| 配对 | `percent_change` | `grade` | `total` | `grade_label` |
|---|---|---|---|---|
| `-O0` 对 `-O1` | UNMATCH 0.130435 | UNMATCH 0.426829 | UNMATCH 0.106061 | UNMATCH 0.269841 |
| `-O1` 对 `-O2` | MATCH 1.000000 | MATCH 1.000000 | UNMATCH 0.171429 | MATCH 1.000000 |
| `-O1` 对 `-O1` | MATCH 1.000000 | MATCH 1.000000 | MATCH 1.000000 | MATCH 1.000000 |

radare2 源码中的比率是 `1 - distance / max(len_a, len_b)`，其中 distance 是两个函数指纹之间的 Levenshtein 距离，而一个指纹是该函数的各基本块按地址顺序的拼接。匹配阈值是 0.7。`code/main.py` 中的 `radare2_ratio()` 在原始函数字节上实现了相同的公式，并把 0.130435、0.106061、0.269841 和 0.171429 复现到小数点后六位。

它没有复现 `-O0` 下 `grade` 的 0.426829。在该函数的 118 字节上，比率是 0.296610。radare2 在大小列打印 `118`。它的指纹更短。在没有应用重定位的情况下，它无法解析那张跳转表，所以它的分析触及的是入口块、以 `jmpq *%rax` 结束的那个块、默认情形和返回：82 字节，正是第 33 课那个朴素递归下降所主张的同样的 82 字节。这 82 字节与 `-O1` 下 46 字节之间的 Levenshtein 距离是 47，而 `1 - 47/82 = 0.426829`。加上 `-e bin.relocs.apply=true` 后，radare2 找到全部 118 字节并打印 0.288136，这等于本课在重定位后映像上得到的比率，在那里四个位移字节与目标的零字段不同。只有当两个工具比较相同的字节时，它们才会一致，而大小列并不说明到底送进去的是哪些字节。

`-O` 把指纹限制为操作码字节并把操作数清零。`-O0` 对 `-O1` 的各比率升到 0.239130、0.512195、0.303030 和 0.523810，`-O1` 对 `-O2` 下 `total` 升到 0.192857。也存在整文件距离：`-s`（Myers）在两个目标之间报告相似度 0.956、距离 162，`-ss`（Levenshtein）报告 0.927、距离 137。这些数字包含头部、符号表和重定位节，对函数本身什么都没说。

## Ghidra Version Tracking 关联器

Ghidra 的 Version Tracking 工具用关联器把一个源程序与一个目标程序匹配。函数关联器有 Exact Function Bytes Match、Exact Function Instructions Match（掩码操作数）、Exact Function Mnemonics Match，以及 Duplicate Function Instructions Match（1:N 和 N:M）。数据关联器有 Exact、Duplicate 和 Similar Data Match。符号关联器按精确、按重复或按相似匹配名称。引用关联器利用已接受的匹配去发现更多匹配。函数必须在目标程序中有定义，最小函数长度默认为 10 字节。Auto Version Tracking 依次运行 Exact Symbol Name、Exact Data、Exact Function Bytes、Exact Function Instructions、Exact Function Mnemonics、Duplicate Function Instructions，然后是一个引用关联器，并为已接受的匹配创建蕴含匹配。11.2 版本新增了一个 BSim 关联器。

本课以无界面方式捕获了这些关联器。`capture_ghidra_vt.sh` 把三个目标导入一个工程并运行 `ListVersionTrackingMatches.java`——一个继承 `AbstractGhidraVersionTrackingScript` 的简短脚本，它按路径打开源程序和目标程序，以 Auto Version Tracking 的顺序运行六个非引用关联器，并为每个块、函数、关联器和匹配打印一行。本节的每个数字都来自那两个文本文件。

| 关联器 | `-O0` 到 `-O1` | `-O1` 到 `-O2` |
|---|---|---|
| Exact Symbol Name Match | 4 个函数 | 4 个函数、5 个数据项（`labels.rel`、`.L.str.1` 到 `.L.str.4`） |
| Exact Data Match | 0 | 0 |
| Exact Function Bytes Match | 0 | 2（`percent_change`、`grade_label`） |
| Exact Function Instructions Match | 0 | 3（加上 `grade`） |
| Exact Function Mnemonics Match | 0 | 3 |
| Duplicate Function Instructions Match | 0 | 0 |

`-O0` 和 `-O1` 之间每个函数都变了，所以只有名称匹配，这正是本课匹配器在 BinDiff 顺序下给出的结果。每次匹配都打印相似度 1.000、置信度 10.000。帮助页把精确关联器描述为相似度 1.0、置信度 1.0，所以打印出的置信度的量纲是一个本课记录但不予解决的悬而未决的问题。

Tools 菜单下的 Program Differences 是另一回事。它用相同的地址空间，在字节、标签、代码单元、引用、注释和等地址处的函数上比较两个程序。它是一种按地址对齐的差异，凡是挪动过的都匹配不上。

## 从文档看 Diaphora 和 Binary Ninja

Diaphora 是一个 IDA Pro 插件，2015 年首次发布，截至 2026-08-18 版本为 3.4.2。它自 2.0 起采用 AGPL-3.0，需要 IDAPython，因此运行在 IDA Home 或 IDA Pro 中，而不在 IDA Free 中。它把每个数据库导出为 SQLite，并以 SQL 查询的形式运行其启发式规则。每条启发式规则都有一个名字、一个类别（Best、Partial 或 Unreliable）、一个比率类型，以及诸如 SAME_CPU 或 SLOW 之类的可选标志。当前源码中的名字读起来就像本课的各个阶段，只是更多：Bytes hash、Same address and mnemonics、Same cleaned assembly、Mnemonics small-primes-product、Same nodes, edges, loops and strongly connected components、Topological sort hash，以及需要 Hex-Rays 反编译器的 pseudo-code fuzzy hashes。它的发布说明展示了调优历史：慢速启发式只在约 2000 个函数以下运行，而“Same graph”被移到了 unreliable 类别。那一次移动，正是本课那个四块菱形在规模上的体现。

Binary Ninja 6.0 于 2026-09-03 发布，新增了 Binary Similarity 这个带提供器和解析器的框架。它内置 BinDiff 作为结构化提供器，以及 WARP 用于能容忍可重定位操作数的精确函数匹配；其指南说，当函数除可重定位指令之外都匹配时用 WARP，当函数在重新编译后仍保持结构相关时用 BinDiff。该功能仅在 Ultimate 版中提供。Binary Ninja 在这里没有包管理器安装方式，也没有被运行，所以本段仅来自它的文档，别无其他来源。

BinDiff 本身自 2023-09-25 起以 Apache-2.0 开源，v8 是最新发布版。它需要一个反汇编器和 BinExport 插件，后者支持 IDA Pro 9.4 或更高版本、Binary Ninja 和 Ghidra。对学习者而言，免费的路径是 Ghidra 加 BinExport 加 BinDiff 命令行。本课没有运行它，它的实践实验要求你去运行。

## 代码相同，常量不同

第 36 课保留了一个 `grade` 的候选重建版本，它的表以 3 作为最后一个条目，而原版是 4。`grade_case10_wrong.o` 与 `-O1` 下的 `grade` 有相同的 46 个代码字节。匹配器在精确字节上把它们配成一对，所有签名都一致。被引用表检查通过一个重定位读出 `1, 2, 3, 4, 4`，通过另一个读出 `1, 2, 3, 4, 3`，并报告 `dataEqual: false`。另外三个 `-O1` 函数在左侧未匹配，因为候选目标里只有一个函数。

这就是补丁分析的形态。一个止步于字节的函数差异比对工具会说什么都没变。Ghidra 的 Exact Data Match 和 BinDiff 的字符串引用匹配，存在的原因是一样的。本课的版本很小：对每一对匹配，用边界检查给出的数量和加载给出的宽度，比较各函数的重定位所指向的字节。

## 符号执行：路径、条件、求解器

King 在 1976 年描述了符号执行。输入变成符号。每条语句更新一个符号存储。每个分支向路径添加一个条件，而求解器判定该路径是否可行，并产生一个沿该路径的具体输入。一个带分支的函数变成一棵路径树，而一个叶子是一个附带条件的返回。

Baldoni、Coppa、D'Elia、Demetrescu 和 Finocchi 在 2018 年对这个领域做了综述。他们的第 5 节把路径爆炸点名为核心代价：一个执行器可能在每个分支处分叉，所以状态数可随分支数呈指数增长，而一个上界依赖符号输入的循环会给出无界的路径集合。他们列出的缓解手段包括：在每个分支处求解以剪掉不可实现的路径、函数和循环的摘要、状态合并，以及欠近似。混合执行（concolic execution）同时以具体和符号两种方式运行程序，记录沿具体运行的各条件，取反其中一个，再向求解器要下一个输入。DART（2005）、CUTE（2005）和 SAGE（2008）是其中点名的系统。

KLEE（Cadar、Dunbar、Engler，OSDI 2008）是一个运行在 LLVM 位码之上的符号虚拟机，所以它的输入是 `clang -emit-llvm` 的输出而不是二进制文件。它自带一个 POSIX 环境模型和一个重放库。在 89 个 GNU coreutils 程序上，它达到 84.5% 的行覆盖率，而开发者自己的测试为 67.7%，并发现了 56 个严重缺陷。KLEE 3.2 于 2025-12-23 以 NCSA 许可证发布，推荐搭配 LLVM 16。

angr 工作在二进制上。`angr.Project` 持有一个 CLE 加载器（映射目标并应用重定位）、一个提升器（把一个块变成 VEX IR，即 `block.vex`，也可用 pypcode 作为替代）和一个状态工厂。一个 `SimState` 持有寄存器、内存和一个求解器。一个 `SimulationManager` 推进名为 `active`、`deadended`、`found`、`avoided` 和 `errored` 的状态暂存栈，而 `explore(find=..., avoid=...)` 对它作了封装。每一步各引擎按顺序运行：failure、syscall、hook、处理具体数据的 unicorn，以及作为兜底的 VEX。claripy 是 Z3 之上的求解器前端，在 angr 10.0 中它是一个内置的 Rust 实现，以 `from angr import claripy` 导入。angr 10.0.3 于 2026-10-10 上传，采用 BSD-2-Clause，需要 Python 3.12 或更高版本。Z3 5.1.0 于 2026-08-16 以 MIT 发布，是 angr、Triton 和 KLEE 可选后端背后的求解器。

## 一个运行在第 34 课 IR 上的微型执行器

`code/main.py` 中的执行器使用一个小型 IR，其语句形态来自第 34 课：`Assign`、`Branch`、`Jump`、`Return`，再加上第 34 课实践实验所要求的 `Switch` 终止子。表达式有 `Const`、`Var`、带宽度的 `Bin`、`Cast`、从一张命名的具体表中的 `Load`，以及 `Not`。四个 fixture 函数由人工按第 34 课化简后所达到的层次提升，其中 `0x66666667` 乘法已变成 `score / 10`，而每个 IR 块都列出它所来自的指令地址。`check_ir_against_listing()` 断言这些地址恰好覆盖该函数的列表一次。

`-O0` 下的 `grade` 在该 IR 中：

```text
0x30: local_8 = score; local_10 = score / 10 - 6; if (local_10 >u 4) goto 0x9a else 0x62
0x62: switch local_10 -> 0x91, 0x88, 0x7f, 0x76, 0x76
0x76: local_4 = 4; goto 0xa1        0x7f: local_4 = 3; goto 0xa1
0x88: local_4 = 2; goto 0xa1        0x91: local_4 = 1; goto 0xa1
0x9a: local_4 = 0                    0xa1: return local_4
```

switch 的目标来自 `jump_table_targets()`，与第 33 课同样的重定位算术，所以这段 IR 读取的是那个 fixture。

`execute()` 维护一个路径状态的工作列表。一个状态持有当前块、块的轨迹、条件列表，以及一个把每个变量映射到输入上某个表达式的环境。`Assign` 把环境代入源表达式并存储结果。`Branch` 代入条件，然后向求解器询问两次：一次加上该条件，一次加上它的否定。求解器无法满足的一侧被丢弃，这就是综述所描述的急切剪枝。`Switch` 把表条目按目标分组，并对每个不同目标分叉一次，携带各条目等式的析取，这也是 angr 处理符号跳转目标的方式。`Return` 代入返回值并闭合该叶子。长度超过步数上限的轨迹把该路径标记为截断并停止它。

手工跟随到 `return 4` 的那条路径。入口赋值 `local_10 = score / 10 - 6`。分支条件 `local_10 >u 4` 在这条路径上为假，所以条件列表持有 `!(score / 10 - 6 >u 4)`。switch 的条目 3 和 4 都指向 0x76，所以分叉到 0x76 时添加 `score / 10 - 6 == 3 || score / 10 - 6 == 4`。块 0x76 赋值 `local_4 = 4`、跳到 0xa1，返回代入得到 `4`。该叶子就是那个条件与那个值构成的配对。

求解器是 `BoundedSearch`。它为每个输入持有一个有限域，枚举各域的乘积，并以 C 语义对每个约束求值：32 位回绕、截断除法、有符号和无符号比较，以及算术或逻辑移位。除以零或表索引落在表外会让该次赋值违反约束。对 -200 到 1200 之间的 `score`，`grade` 的五条路径耗费 44460 次求值和几毫秒。为每个叶子求解输入集合给出：

| 叶子 | 返回 | 条件 | 界限内的分数 |
|---|---|---|---|
| 0x76 | 4 | `!(q >u 4) && (q == 3 \|\| q == 4)` | 90 到 109，20 个输入 |
| 0x7f | 3 | `!(q >u 4) && q == 2` | 80 到 89，10 个输入 |
| 0x88 | 2 | `!(q >u 4) && q == 1` | 70 到 79，10 个输入 |
| 0x91 | 1 | `!(q >u 4) && q == 0` | 60 到 69，10 个输入 |
| 0x9a | 0 | `q >u 4` | 1351 个输入，界限内的其余部分 |

`q` 代表 `score / 10 - 6`。`-O1` 下的 `grade` 给出相同的分类，那里 IR 有两条路径——返回 `lookup_14[q]` 的表路径和返回 0 的默认路径，而问题变成对返回值的一个约束，因为没有 case 块可达。表 `lookup_14` 从目标的 `.rodata` 的 0x14 处读取。

界限是该方法的限度。有界搜索在它的域内是完备的，在域外是沉默的。在 -200 到 1200 之内，60 到 109 的分数没有一个返回 0，110 或以上的分数没有一个返回非零值。z3 对全部 2^32 个分数都证明了这两点，而下一节展示两种方法在哪里返回不同的见证。

## 度量路径爆炸

`-O1` 下的 `total` 是第 33 课的那个循环：对 `count` 的一次测试、一个把 `values[rdx]` 相加并递增 `rdx` 的循环体，以及在 `rdx != rcx` 时跳回循环体的 `jne`。在 IR 中 `rcx` 是 `zext64(count)`，`rdx` 从 0 开始。每次穿过回边都在 `rdx != count` 上分叉，其中 `rdx` 是一个常量，所以 `count = c` 的路径把循环体运行 `c` 次然后退出。把 `count` 限制在 0 到 2，执行器找到 3 条路径。限制在 0 到 4 找到 5 条，0 到 8 找到 9 条。每条路径都返回其计数的三角和：(0, 0)、(1, 1)、(2, 3)，直到 (8, 36)。angr 报告 3、5、9 个 deadended 状态，并在所有三个优化级别（包括 `-O2`，其向量循环需要至少 8 的计数，因此在这个范围内从不改变路径数）上都给出同样的九对计数与和。

没有界限时，执行器永远不会结束，因为每个迭代计数都是多出来的一条可行路径。本课设定的每条路径 24 个块的上限，在 `count` 最高到 64 时运行，返回 22 条路径、截断 2 条，并且从不启动存在的 65 条中的另外 41 条。报告给出那三个数字。求解代价也随之增长：界限 2 时 33 次求值，界限 4 时 115 次，界限 8 时 531 次，而加了上限的那次运行是 6900 次。

## angr 和 z3 面对相同的问题

`capture_angr.py` 在三个目标上运行了 angr 10.0.3。CLE 用 ELF 后端在 0x400000 加载每个可重定位目标，为 `-O0` 应用 13 个重定位、为其余应用 8 个，并解析了那四个符号。对带一个符号 64 位参数的 `grade`，`run()` 在 `-O0` 下以 5 个 deadended 状态结束、在 `-O1` 和 `-O2` 下以 2 个结束，分别耗时 0.475、0.408 和 0.318 秒。向每个 deadended 状态添加 `eax == v` 并向求解器询问有符号的最小值和最大值，在每个级别上，对 `v` 从 1 到 4 分别得到 60 到 69、70 到 79、80 到 89 和 90 到 109，对 0 得到 -2147483648 到 2147483647。两次交叉检验都是 unsat。

“到达某块”这种形式在 `-O0` 的 `grade` 上使用 CFGFast，它列出第 33 课找到的那八个块，然后对存储 4 的那个块用 `explore(find=0x400076)`。它在 0.47 秒内找到一个状态，还有三个仍处于 active，参数的最小值 90、最大值 109，样本为 91、93、94、97 和 101。

对 `percent_change`，有两个 deadended 状态，约束分别是 `before[31:0] != 0` 和 `before[31:0] == 0`。向那个非零状态询问 `eax == 50`，在 `-O0` 下得到 `before = 21055744, after = 332315210`，在 `-O1` 下得到 `40566804, 834296877`，在 `-O2` 下得到 `-24484867, 993934694`。-16 到 16 的有界搜索回答 `before = -10, after = -15`。z3 对第 34 课列表问同样的问题，回答 `before = -25092599, after = 305712160`。测试套件用 IR 求值器对全部五对求值，每一对都给出 50。一个模型证明某个输入存在。它不是那个输入，而三个正确的工具给出了三个不同的输入。

`capture_z3.py` 用带乘法、两次移位和那张表的 32 位位向量对 `grade` 的 `-O1` 列表建模，并多问了四个问题。该列表对某个 32 位分数是否与源 `switch` 不同：0.068 秒内 unsat，所以编译后的函数在全部 2^32 个输入上都等于源。该列表是否与第 36 课的阈值重建版本不同：在分数 706346536 处 sat，那里 `score / 10` 是 70634653，switch 落到默认情形而阈值版本返回 4。同样的差异限制在 0 到 109 之内：unsat，这就是第 36 课的网格看不到它的原因。对 `percent_change`，`before == 3` 且结果为 -133 在 `after = 1073741823` 处 sat，这是第 36 课的那个溢出格，而有界搜索在它的域内找到第二个见证 `after = -1`，在那里 `(-1 - 3) * 100 / 3` 截断为 -133，根本没有发生溢出。

## 构建它

运行演示：

```bash
cd phases/13-tools-and-protocols/44-binary-diffing-and-symbolic-execution
python3 code/main.py
```

输出是一份 JSON 报告。`diffs` 持有 `-O0` 对 `-O1`、`-O1` 对 `-O2` 的目标文件匹配和加载映像匹配，再加上 BinDiff 顺序下的 `-O0` 配对。`toolComparison` 把本课的阶段与 radiff2 的判定和比率、以及每个函数的 Ghidra 关联器并排放在一起。`patch` 是 `grade_case10_wrong.o` 这个案例。`radare2Ratios` 复现 radiff2 的数字，`gradeRelocationCase` 展示布局和那两个位移，`symbolic` 持有路径、分类和爆炸计数。

按这个顺序阅读 `code/main.py`：

1. `ElfObject` 读取节、符号和 `.rela.*` 记录。`parse_listing()` 读取 `llvm-objdump` 文本。
2. `jump_table_targets()` 和 `build_cfg()` 给出可达块和带类型的边。`FunctionRecord.signatures()` 构建五种签名。
3. `load_image()` 布置已分配的节并应用 `S + A - P` 和 `S + A`。
4. `match_functions()` 是分阶段匹配器。`levenshtein()` 和 `radare2_ratio()` 给出相似度。
5. `parse_radiff2()` 和 `parse_ghidra_vt()` 为比较读取捕获到的工具输出。
6. `evaluate()`、`substitute()` 和 `BoundedSearch` 是表达式语义和求解器。
7. `execute()` 枚举路径。`solve_returns()` 向每个叶子询问一个输入集合。
8. `grade_ir_o0()`、`grade_ir_o1()`、`percent_change_ir_o1()` 和 `total_ir_o1()` 是带各自指令地址的手工提升。

还有另外三个命令。`python3 code/main.py diff A.o B.o` 比对两个在旁边带有各自列表的目标，`--image` 比对它们加载后的映像。`python3 code/main.py paths grade O0` 打印一个函数的路径和分类，`paths total 8` 打印带界限的循环。`python3 code/main.py figure-data` 打印交互式图示所嵌入的数据。

## 使用它

在你自己程序的两个构建上，按这个顺序使用差异比对工具和执行器。

1. 为每个目标捕获一份列表，并让 `function_record()` 对照字节验证它。先把列表修对，然后再做别的。
2. 先比对目标文件。读每次匹配的阶段，并在第二个签名一致之前，把流图形状匹配当作建议对待。
3. 比对加载后的映像。一个从精确字节降到掩码字节的函数，相对它的数据挪动过，而位移算术能点出挪动的是哪个节。
4. 对每次匹配，比较被引用的表。代码相同而常量不同，就是一个被修改的函数。
5. 运行名称阶段并作比较。当构建带符号时，运行 BinDiff 顺序，并只用结构化结果去给各阶段评分。
6. 当一个工具报告一个比率时，先弄清是哪些字节送了进去，再把它与你自己的作比较。
7. 对你想要其输入的那个函数，写出每条语句一个地址的 IR，在每个符号循环计数器上带界限运行 `execute()`，并求解每个叶子。把界限连同结果一起报告。
8. 在 angr 或 z3 可用时，用它们跑同一个查询，并比较分类的界限。一个样本只是一个模型。

## 交互实验

### 实验 A：手工求出五种签名

从 `code` 目录打开 Python：

```bash
cd phases/13-tools-and-protocols/44-binary-diffing-and-symbolic-execution/code
python3 -q
```

运行：

```python
from main import *
grade = {r.name: r for r in fixture_records("ledger-x86_64-O1.o")}["grade"]
grade.raw.hex(" ")
grade.masked_bytes() == grade.raw
grade.mnemonics
grade.cfg_shape()
grade.signatures()
```

在打印 `grade.raw` 之前，先写下该函数偏移 0x26 处的四个字节。然后对来自 `ledger-x86_64-O0.o` 的 `grade` 运行同样这些行，并数一数 `grade.edges` 中的 `table` 边。

### 实验 B：看重定位破坏字节哈希

```python
case = grade_relocation_case()
case["layout"]
case["displacements"], case["rodataShift"]
case["objectBytesEqual"], case["imageBytesEqual"], case["maskedImageBytesEqual"]
```

在读 `displacements` 之前，先在纸上算出 `0x100110 + 0x14 - 0x10003a`。然后把 `load_image()` 中的基址改成 0x400000，并确认各位移不变，因为两个操作数是一起挪动的。

### 实验 C：错误匹配，以及避开它的那个顺序

```python
report = diff_fixtures("ledger-x86_64-O1.o", "ledger-x86_64-O2.o")
[(m.left.name, m.right.name, m.stage) for m in report.matches]
report = diff_fixtures("ledger-x86_64-O0.o", "ledger-x86_64-O1.o")
[(m.left.name, m.right.name, m.stage, m.names_agree) for m in report.matches]
report = diff_fixtures("ledger-x86_64-O0.o", "ledger-x86_64-O1.o", stages=BINDIFF_ORDER)
[(m.left.name, m.right.name, m.stage) for m in report.matches]
```

为 `-O0` 打印 `records(...)["percent_change"].cfg_shape()`、为 `-O1` 打印 `grade_label` 的，并读那两个度序列。然后写一个第六阶段，对排序后的助记符作哈希，使顺序不再重要，看看它能否把它们区分开。

### 实验 D：路径与界限

```python
report = grade_paths("O0")
[(p["trace"], p["condition"], p["returns"]) for p in report["paths"]]
report["returns"]["4"]
total_paths(2), total_paths(4), total_paths(8)
total_paths(64, step_limit=24)["truncated"]
```

把 `SCORE_DOMAIN` 改成 `range(0, 110)` 并重新运行 `grade_paths("O0")`。返回 0 的分类缩小到 60 个输入，两次交叉检验仍然成立。然后把域设为 `range(90, 100)`，并读出哪些叶子根本没有模型。

## 实践实验

在这些 fixture 上运行 BinDiff，并把它与你已有的三份结果作比较。

要求：

- 在 Ghidra 12.1.4 中安装 BinExport 扩展并导出三个 ledger 程序。记录 BinExport 的发布 tag 和 Ghidra 的版本。
- 安装 BinDiff 8 命令行，并用仅相似度的选项产出 `-O0` 对 `-O1` 和 `-O1` 对 `-O2` 的结果。
- 用 `build_fixtures.sh` 中的确切命令把每个函数的相似度和置信度捕获到 `code/fixtures/` 中。
- 用一个 `bindiff` 列扩展 `tool_comparison()`，并添加一个测试，把 BinDiff 在 `-O1` 对 `-O2` 上匹配到的集合与本课的掩码字节集合作比较。
- 写一段话，说出 BinDiff 对 `grade` 用的是哪种算法，以及它比较的是否是加载后的映像。

成功意味着演示为每个函数打印四个工具列，且新测试陈述出一处相等或一处可解释的差异。

## 随课交付物

本课包含 `outputs/skill-binary-diffing-and-symbolic-execution.md`。用它把两个构建和一个函数变成一份分阶段差异（每次匹配都带有陈述清楚的质量）、对每个未匹配或变化函数的解释，以及一份路径报告（每个叶子带有求解出的输入集合和产生它的界限）。

## 验证它

运行演示和测试套件：

```bash
cd phases/13-tools-and-protocols/44-binary-diffing-and-symbolic-execution
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

验证应当证明：

- 符号表给出四个函数，在 `-O0` 下大小为 46、118、66、39，在 `-O1` 下为 16、46、31、63，在 `-O2` 下为 16、46、140、63
- `-O1` 目标的 `.rela.text` 记录与 `llvm-objdump -r` 打印的一致
- 每条列出的指令都落在它的符号范围内、其字节都等于目标，而一个被改动的字节会抛出异常
- `-O1` 下的 `total` 有五个块、五条边和一个自环，且它的形状字符串是确定性的
- `-O0` 下的 `grade` 从 `.rela.rodata` 恢复出五个跳转表目标，并有八个块、十一条边
- 没有那张表时，`-O0` 下的 `grade` 在四个块中触及 82 字节
- `-O0` 下的 `percent_change` 和 `-O1` 下的 `grade_label` 有相同的四块形状
- 精确哈希和掩码哈希在一个可重定位目标的每个函数上都一致
- `-O1` 和 `-O2` 为三个函数共享字节，`-O0` 和 `-O1` 一个都不共享
- `grade` 被引用的表读出 `1, 2, 3, 4, 4`，而候选的读出 `1, 2, 3, 4, 3`
- 加载器把 `.text`、`.rodata` 和 `.rodata.str1.1` 放在 Ghidra 在两个程序中放置它们的位置
- `R_X86_64_PC32` 写成 `S + A - P` 并给出位移 122，而 `.data` 中的 `R_X86_64_64` 条目收到字符串地址
- `grade` 的字节在两个目标中一致，而在映像中因 0x70 的偏移而不同，掩码可恢复匹配
- `-O1` 对 `-O2` 在精确字节上匹配三个函数、按名称匹配 `total`；映像视图以相似度 1 - 1/46 按掩码字节匹配 `grade`
- 本课顺序在 `-O0` 对 `-O1` 上产生一个错误的流图形状匹配，而 BinDiff 顺序按名称匹配全部四个
- 补丁候选在字节上匹配，在被引用数据上失败
- Levenshtein 比率复现出 0.130435、0.106061、0.269841、0.171429、在 82 字节上的 0.426829，以及 radiff2 在应用重定位后打印的重定位字节比率
- radiff2 的 MATCH 集合等于精确字节阶段，而 Ghidra 的字节和指令关联器等于映像视图的精确集合和掩码集合
- Ghidra 在 `-O0` 对 `-O1` 上只找到名称，每次匹配的相似度为 1.0、置信度为 10.0
- 手工提升的 IR 覆盖每条列出的指令恰好一次，而求值器遵循 C 语义
- `grade` 在 `-O0` 下有五条带 switch 条件的路径，在 `-O1` 下有两条分类相同的路径
- 有界分类 60 到 69、70 到 79、80 到 89、90 到 109 等于 angr 在全部三个级别上的结果和 z3 的结果，带 5 个和 2 个 deadended 状态以及到达某块的范围 90 到 109
- 两次交叉检验在界限内、在 angr 中、在 z3 中都没有模型，而 z3 证明该列表等于源 switch
- 来自有界搜索、angr 和 z3 的每个 `percent_change` 模型都求值为所请求的值
- `total` 给出 3、5、9 条带三角和的路径，与 angr 相同，而步数上限返回 22 并截断 2
- 图示数据携带两个视图、重定位数字，以及五个带各自输入集合的叶子，而站点模块嵌入相同的数据

## 生产失败模式

| 失败 | 弱工具报告什么 | 分析必须证明什么 |
|---|---|---|
| 在加载后映像上做字节哈希 | 在两个代码相同的构建之间说“grade modified” | 字段偏移、两个位移和节偏移；掩码哈希匹配 |
| 在可重定位目标上做掩码哈希 | “掩码没有任何差别” | 字段本就已经是零；重定位记录和被引用常量承载了变化 |
| 仅凭流图形状 | 一对自信的无关函数 | 第二个签名一致，或名称驳斥且该匹配被丢弃 |
| 在去除符号的构建上名称先于结构 | 什么都匹配不上 | 带各自质量的结构化阶段，以及未匹配列表 |
| 跨工具比较一个比率 | “radiff2 说 0.43 而本课说 0.30” | 每一侧指纹化了哪些字节；不带重定位是 82 字节，带重定位是 118 字节 |
| 代码相同、常量不同 | “exact match” | 通过重定位读出的表和边界检查 |
| 把一个模型当成输入报告 | “分数是 90” | 分类 90 到 109 连同它的数量，以及它被找到时所在的界限 |
| 把有界搜索报告为 unsat | “没有输入给出 -133” | 仅在界限内 unsat；z3 在界限外找到 1073741823 |
| 没有界限的符号循环 | 一次超时 | 界限或上限、返回的路径、截断的路径和从未启动的路径 |
| 把闭源工具说成运行过 | 没有捕获的数字 | 带命令和版本的捕获文件，或一句说明仅来自文档 |

## 操作规则

一次匹配一个签名，只接受在两侧都唯一的值，并把阶段及其质量连同匹配一起保留。既比对目标也比对加载后的映像，并解释每个在两者之间变换阶段的函数。在每个分支处用求解器枚举路径，为每个符号循环加界限，并报告一个带界限的输入集合。一个没有界限的单一模型只是一个样本。

## 延伸阅读

- [BinDiff concepts: matching strategy, algorithms, and quality ratings](https://github.com/google/bindiff/blob/main/docs/concepts.md)
- [BinDiff repository and the v8 open-source release](https://github.com/google/bindiff/releases/tag/v8)
- [BinExport README: IDA Pro, Binary Ninja, and Ghidra exporters](https://github.com/google/binexport)
- [Flake, "Structural Comparison of Executable Objects" (DIMVA 2004) and Dullien, Rolles, "Graph-based comparison of Executable Objects" (SSTIC 2005), shipped in the BinDiff repository](https://github.com/google/bindiff/tree/main/docs/papers)
- [Diaphora README and heuristics source](https://github.com/joxeankoret/diaphora)
- [Ghidra Version Tracking correlators help page](https://github.com/NationalSecurityAgency/ghidra/blob/master/Ghidra/Features/VersionTracking/src/main/help/help/topics/VersionTrackingPlugin/VT_Correlators.html)
- [Ghidra Auto Version Tracking help page](https://www.ghidradocs.com/11.0_PUBLIC/help/VersionTracking/help/topics/VersionTrackingPlugin/VT_AutoVT.html)
- [Ghidra 12.1.4 release](https://github.com/NationalSecurityAgency/ghidra/releases)
- [Binary Ninja 6.0 "Krypton" release notes](https://binary.ninja/2026/09/03/binary-ninja-6.0-krypton.html) and [Binary Similarity user guide](https://docs.binary.ninja/guide/similarity.html)
- [radare2 book: radiff2](https://book.rada.re/tools/radiff2/intro.html) and [radare2 6.2.4 source](https://github.com/radareorg/radare2/releases/tag/6.2.4)
- [King, "Symbolic execution and program testing" (CACM 1976)](https://dl.acm.org/doi/10.1145/360248.360252)
- [Baldoni et al., "A Survey of Symbolic Execution Techniques" (ACM Computing Surveys 2018)](https://dl.acm.org/doi/10.1145/3182657)
- [Cadar, Sen, "Symbolic execution for software testing: three decades later" (CACM 2013)](https://dl.acm.org/doi/10.1145/2408776.2408795)
- [Cadar, Dunbar, Engler, "KLEE: Unassisted and Automatic Generation of High-Coverage Tests for Complex Systems Programs" (OSDI 2008)](https://www.usenix.org/legacy/events/osdi08/tech/full_papers/cadar/cadar.pdf) and [KLEE 3.2 release](https://github.com/klee/klee/releases/tag/v3.2)
- [Shoshitaishvili et al., "SoK: (State of) The Art of War: Offensive Techniques in Binary Analysis" (IEEE S&P 2016)](https://oaklandsok.github.io/papers/shoshitaishvili2016.pdf)
- [angr documentation: loading, simulation managers, and the simulation pipeline](https://docs.angr.io/en/latest/core-concepts/toplevel.html) and [angr 10.0.3 on PyPI](https://pypi.org/project/angr/)
- [Z3 5.1.0 release](https://github.com/Z3Prover/z3/releases/tag/z3-5.1.0)
- [Triton dynamic binary analysis library](https://github.com/JonathanSalwan/Triton)
- [System V Application Binary Interface, AMD64 Architecture Processor Supplement, Table 4.9: Relocation Types](https://gitlab.com/x86-psABIs/x86-64-ABI)
