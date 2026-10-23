---
kind: practice-translation
language: zh-CN
source:
  repository: ai-engineering-from-scratch
  path: phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns/docs/en.md
  revision: f7aadc1d61a9fbbe2bdb107d1e2bf0a6caeea299
  sha256: 16f3f007c9eb483fb9a3029b550acf1e36b9b6426572624038bfc79396cb9fe3
status: reviewed
---

# 二进制分析中的证据、置信度与未知项

> 关于一个编译程序的结论，是一条带有哈希、置信度、权威等级，以及一份“它无法展示什么”清单的记录。

**类型：** 构建
**语言：** Python、C
**前置要求：** Phase 13 · 第 32 课（从零构建 ELF）、Phase 13 · 第 33 课（反汇编与控制流）、Phase 13 · 第 34 课（提升为伪代码）
**预计时间：** 约 105 分钟

## 学习目标

- 构建一条以 rea 的 `Evidence` 为模型的证据记录，带有观测、推导和推断三种置信度。
- 计算当文件移动到另一个文件夹时仍保持不变的内容哈希 id。
- 把每个提供方无法展示的东西，记录为随记录一起流转的限制。
- 在一次对该函数的观测运行支持某个结果之前，拒绝陈述这个结果。
- 把残留的未知项作为由哈希链串联的、带版本的记录保留下来。
- 在一个精确的键下缓存提供方的回答，并拒绝一次过期的重放。

## 问题所在

你问一个智能体，`ledger-x86_64-O1.o` 中的 `grade` 对分数 55 返回什么。智能体调用 rea，读取 Ghidra 的伪代码，回答 0。一位审查者问智能体怎么知道的。智能体手上有一块 Ghidra 打印出的文本。对于默认路径，那段文本写着 `uVar1 = -(param_1 >> 0x1f) ^ (uint)((ulong)((long)param_1 * 0x66666667) >> 0x3f);`。而那个位置的字节说的是 `xor eax, eax`。

那个表达式和那条指令都对每一个输入产出 0。智能体并不知道这一点。它之所以相信那段文本，只是因为文本是一个工具产出的。2026 年的一项研究在 24 个逆向工程任务上运行了三个智能体（[NDSS BAR 2026](https://www.ndss-symposium.org/wp-content/uploads/bar2026-58.pdf)）。它点出了四种反复出现的弱点：训练偏置、对观测的过度信任、上下文限制，以及计划固着。另一项 2026 年的研究把文本植入二进制文件内部，发现模型在 40 个案例里有 35 个提出了被植入的不安全操作（[arXiv 2607.12507](https://arxiv.org/abs/2607.12507)）。

rea 6.5.0 为此给了智能体一套词汇。每一次成功的工具调用都产出一条 `Evidence` 记录，带有一个取 `observed`、`derived` 或 `inferred` 的 `confidence`、一个 `authority`，以及一份 `limitations` 清单。打包好的技能告诉智能体："Every conclusion must distinguish observations, inferences, and unknowns. Cite Evidence IDs, preserve limitations and incomplete coverage, and never imply that static analysis observed execution."（每一个结论都必须区分观测、推断和未知项。引用 Evidence ID，保留限制与不完整的覆盖，并且绝不暗示静态分析观测到了执行过程。）

rea 把三件事留给你自己。它的快照缓存的是精确的查询结果，而不是分析。它的验证在某个比较维度未变时让一项声明通过，而它自己的注释说，一次通过 "does not establish global implementation equivalence."（并不确立全局的实现等价）。它的义务账本只从 JavaScript 和托管图里接收候选，所以一个原生函数永远无法经由它达到 `verified`。

本课用纯 Python 构建那缺失的一块。你写一个账本，把关于夹具的每一个事实都存成一条带内容哈希的记录。你对 `percent_change` 和 `grade` 作出预测，把它们标记为推断，再对照你自己编译的测试程序的运行结果去核查。你导入两条真实的 rea 记录和它们所来自的快照，而你的账本会重新算出 rea 写下的每一个哈希。

```figure
re-evidence-ledger
```

## 置信度用三个词，权威等级用五个词

`confidence` 是一个带三个取值的枚举，绝不是一个数字。`authority` 有五个取值。当生产方什么都没说时，rea 使用带 `observed` 的 `shipped-artifact`。

| 取值 | 在夹具上的含义 | 本课中的记录 |
|---|---|---|
| `observed` | 一个从字节或从一次运行中读到的事实 | ELF 读取器的节与符号读取、两条 Ghidra 记录、17 次主机运行 |
| `derived` | 一个从观测记录计算出来的事实 | switch 表模型、除法模型、每一次未知项变更 |
| `inferred` | 一个尚无观测陈述的期望 | 18 个预测 |
| `shipped-artifact` | 磁盘上的文件就是来源 | 对 `ledger-x86_64-O1.o` 的每一次读取 |
| `controlled-replay` | 一次由你控制的运行产生了这个事实 | `harness.c` 的主机运行 |
| `analyst-inference` | 你自己的判断 | 预测与未知项变更 |
| `historical-reference` | 一棵较旧的源码树或一份较旧的文档 | 此处没有 |
| `external-service` | 文件与主机之外的某个服务 | 此处没有 |

两种混淆最费时间。第一种把伪代码当成对行为的观测。它其实是对 Ghidra 打印了什么的观测。第二种把一个空列表当成不存在的证明。rea 的设计说明很严格："Missing coverage is unknown, not absence."（覆盖缺失是未知，而不是不存在。）`code/main.py` 里的账本把这两条规则都编码进去了。

## 这条记录

一条记录恰好有十六个字段，rea 6.5.0 会拒绝任何其他字段。`code/main.py` 沿用与 rea 相同的名字，所以任意一边的记录在另一边都能通过校验。第十六个字段 `relationship_coverage` 说明一份调用者或被调用者列表有多完整。它的值是 `complete`、`partial` 或 `unknown`，当操作没有报告任何调用关系时则为 `null`。

| 字段 | 它存放什么 |
| --- | --- |
| `evidence_id` | `ev_` 加 64 位十六进制，是内容的一个哈希 |
| `subject` | `name`、`digest.sha256`、`format`、`architecture`、`local_path`，或 `null` |
| `provider` | `id`、`name`、`version` 或 `null` |
| `analysis_profile` | 提供方的设置及其摘要，或 `null`，始终存在 |
| `predicate_type` | 一个标签，默认 `rea.analysis` |
| `operation`、`parameters` | 工具及其输入 |
| `raw_result`、`normalized_result` | 提供方输出与规范结果 |
| `confidence`、`authority` | 上文的两个枚举 |
| `environment` | `id`、`platform`、`architecture`、`isolation`，或 `null` |
| `limitations` | 普通的句子 |
| `relationship_coverage` | 带诊断信息的 `status`（`complete`、`partial` 或 `unknown`），或 `null` |
| `locations` | `address`、`address-range`、`artifact-path`、`file-offset`、`file-offset-range` |
| `evidence_links` | 这条记录所依赖的那些 `ev_` id |

下面是 rea 为 `grade` 写下的真实记录，裁剪到此处要紧的字段。完整文件是 `code/fixtures/rea-evidence-grade.json`，大小 37,573 字节。

```json
{
  "evidence_id": "ev_67b6d3f992eaf49a2e16de084b6ebfdd9884e8c5c7f75e175b7bb20f4f748ce1",
  "subject": {
    "name": "ledger-x86_64-O1.o",
    "digest": { "sha256": "9a4a8082ba5e285a732552981a6935e0c5255725664f380e37c44ebfb04d803f" },
    "format": "elf",
    "architecture": "x86_64",
    "local_path": "/private/tmp/aiefs-re/phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns/code/fixtures/ledger-x86_64-O1.o"
  },
  "provider": { "id": "ghidra", "name": "Ghidra", "version": "12.1.4" },
  "analysis_profile": {
    "provider": { "id": "ghidra", "name": "Ghidra", "version": "12.1.4" },
    "parameters": { "jump_table_evidence": "typed-case-default-blocks-v1", "import_mode": "ephemeral-source-immutable" },
    "digest": "9c7f6b24be69294e61da046e4583e3856cb9e40433b149c1bf8bb534d2fe03ef"
  },
  "operation": "analyze_function",
  "parameters": { "procedure": "grade" },
  "confidence": "observed",
  "authority": "shipped-artifact",
  "environment": null,
  "limitations": [
    "Default-space addresses use lowercase 0x-prefixed hexadecimal; other address spaces use <percent-encoded-space>:0x<hex>.",
    "Resolved reference metadata identifies computed, indirect, external, call, jump, and data edges; unresolved targetless flows remain unknown, and function classifications distinguish thunks and externals."
  ],
  "relationship_coverage": {
    "status": "complete",
    "diagnostics": [
      "Only resolved Ghidra call references are returned; unresolved computed or indirect calls remain unknown, while function classifications distinguish thunks and externals."
    ]
  },
  "locations": [],
  "evidence_links": []
}
```

该 profile 真实的 `parameters` 对象有 25 个键。真实的 `limitations` 列表有十个句子。把它们都留着。一条限制是内容的一部分，所以丢掉一条就改变了 id，而你的账本随后就会拒绝这条记录。

注意这条记录没有说什么。`environment` 是 `null`，因为 Ghidra 读了一个文件、没有运行任何东西。`locations` 为空，因为这个操作把地址报告在 `normalized_result` 里。`relationship_coverage` 的状态是 `complete`。它的诊断说，只返回已解析的 Ghidra 调用引用，而未解析的计算调用或间接调用仍然未知。所以调用者和被调用者列表只在已解析的调用这一范围内是完整的。

## id 是内容的哈希，而路径不在其中

rea 把 `evidence_id` 算作 `ev_` 加上对记录某个投影的 RFC 8785 规范 JSON 做的 SHA-256。该投影保留 subject 的 `digest`、`format` 和 `architecture`，丢掉 `name` 和 `local_path`。当 `relationship_coverage` 的值为 `null` 时它会被丢掉，所以一条没有调用关系的记录，其 id 与该字段存在之前保持一致。其余一切，包括 `raw_result` 和每一条限制，都被纳入哈希。

RFC 8785 对对象的键排序，去除空白，并统一数字和字符串的形式。对于数字都是整数的记录，Python 的标准库会产出相同的字节：

```python
def canonical_json(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False)
```

`code/main.py` 在哈希之前拒绝浮点数，因为 RFC 8785 和 Python 对某些浮点数的打印方式不同。两条 rea 记录和那个快照里都没有浮点数，所以这套配方能复现每一个 rea 哈希：

| rea 的值 | `code/main.py` 重新算出的结果 |
|---|---|
| `grade` 的 `ev_67b6d3f992eaf49a…` | 相等 |
| `percent_change` 的 `ev_e88b10dc0c6400e5…` | 相等 |
| 对 `{provider, parameters}` 算出的 profile 摘要 `9c7f6b24be69294e…` | 相等 |
| `grade` 快照条目的 `query_26122aebe9d8abae…` | 相等 |
| `percent_change` 条目的 `query_0f95ef38038d3666…` | 相等 |

为什么要排除路径？对同一批字节的同一次观测，在任何机器、任何文件夹里都得到相同的 id。上面列表里的 `local_path` 指的是某台 Mac 上的一个文件夹。当你把夹具复制到 `/home/you/re` 时，id 不会改变。`rebind_subject_path()` 让你能在一个新路径下展示一条记录。当 `sha256`、`format` 或 `architecture` 不同时，它会拒绝。rea 6.5.0 在为一个处于新路径的目标重放快照记录时，用 `rebindEvidenceToTargetPath` 做同样的事。

`validate_evidence()` 重新算出 id，并以 rea 的那句话 "Evidence semantic identifier does not match its record"（证据语义标识符与它的记录不匹配）来拒绝一个不匹配。它还会拒绝一条 `analysis_profile.provider` 与其 `provider` 不同的记录。测试 `test_tampered_id_and_mismatched_profile_are_rejected` 会在真实的 `grade` 记录里编辑一行伪代码，并看着账本拒绝它。

## 亲自观测这个目标文件

在任何提供方之前，账本先读文件。`observe_object()` 用 `struct.unpack_from` 解析 ELF64 的节头、`.symtab`、`.strtab` 和 `.rela.text`。它为每个函数符号写一条 `inspect_object` 记录和一条 `read_function_bytes` 记录。这五条全都是带权威 `shipped-artifact` 的 `observed`，因为来源就是磁盘上的文件。

| 记录 | 内容 | id |
|---|---|---|
| `inspect_object` | 带偏移、大小和哈希的五个节，四个函数，三条重定位 | `ev_645e0a145f28bd5c…` |
| `read_function_bytes percent_change` | `.text+0x00` 处 16 字节 | `ev_2572a7d254ad15cb…` |
| `read_function_bytes grade` | `.text+0x10` 处 46 字节，SHA-256 `ffcb75c2a7bb1104…` | `ev_a467c2427bfc0c56…` |
| `read_function_bytes total` | `.text+0x40` 处 31 字节 | `ev_b1e845cea2543073…` |
| `read_function_bytes grade_label` | `.text+0x60` 处 63 字节 | `ev_c50041be26e6b7f4…` |

`llvm-objdump -t` 与之一致：`grade` 在 `0000000000000010`，大小 `2e`。`.rela.text` 里的三条重定位是针对 `.rodata` 的 `R_X86_64_PC32`，位于偏移 `0x36`、`0x84` 和 `0x93`，加数分别为 `0x10`、`0x24` 和 `-0x4`。每条记录都带一个 `file-offset-range` 位置和一条限制："Section bytes are read from the file on disk. The reader applies no relocation and runs no code."（节的字节是从磁盘上的文件读出的。读取器不应用任何重定位，也不运行任何代码。）

第 32 课完整构建了这个读取器。这里它只有 60 行，因为本课讲的是你对这次读取记录了什么。

## 推导出表，并说明你是推导出来的

`grade` 的这 46 字节包含第 33 课解码过的四种模式：

| 字节 | 指令 | 在 `grade` 中的偏移 |
|---|---|---|
| `48 69 c0 67 66 66 66` | `imul rax, rax, 0x66666667` | 3 |
| `48 c1 f9 22` | `sar rcx, 34` | 13 |
| `83 c1 fa` | `add ecx, -6` | 23 |
| `83 f9 04 77 0c` | `cmp ecx, 4` 然后 `ja` | 28 |

一次对 `0x66666667` 的乘法后接一次 34 的移位，是一次有符号除以 10。文件里并没有 10。`derive_grade_model()` 把这个事实写成一条限制："The divisor 10 is a derivation from the multiplier 0x66666667 and the shift 34. The file holds no 10."（除数 10 是从乘数 0x66666667 和移位量 34 推导出来的。文件里没有 10。）

`add ecx, -6` 把第一个 case 设为 6。带无符号跳转的 `cmp ecx, 4` 允许五个 case，即 6 到 10。

`.text+0x33` 处的 `lea` 带有加数为 `0x10` 的那条重定位。PC32 重定位从 4 字节位移字段的末尾起算，所以表从 `.rodata+0x14` 开始。那里五个小端序字读出 `1, 2, 3, 4, 4`。`ledger.c` 里的那个 switch 对 60 到 69 返回 1，对七十几返回 2，对八十几返回 3，对 90 到 100 返回 4。编译器把这个 switch 变成了一张返回值查找表。

由此产生的记录 `ev_605106bff2d9998f…` 的 `confidence` 是 `derived`，它的 `evidence_links` 指明了它所依赖的两条观测记录。把字节记录从账本里移除，那条推导记录就会有一条悬空链接。上面那张图展示了你关掉 `ev_a467c242…` 时的那个状态。

现在与 Ghidra 比较。它对同一批字节给出的伪代码：

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

Ghidra 应用了重定位，并把表命名为 `DAT_001000b4`，也就是它把 `.text` 放在 `0x100000` 之后的 `.rodata+0x14`。它恢复了除以 10 和那五个 case。至于默认值，它打印了一个恒为 0 却从不说 0 的表达式。`native_value_flow` 里的 p-code 把那些操作标记为 `is_dead: true`。这条记录是对 Ghidra 的一次忠实观测。你从中读出的含义是推导的，而你期望从一次运行中得到的值是推断的。

`percent_change` 的记录展示了另一种失败。Ghidra 的签名写作 `undefined1 [16] percent_change(int param_1,int param_2,ulong param_3)`。源代码说的是 `int percent_change(int before, int after)`。`idiv` 写入 `EDX:EAX`，而为零的路径没有动 `EDX`，于是反编译器推断出一个 16 字节的返回值和一个第三参数。它自己对 `grade` 的 `native_api.return_type.confidence` 是 `"low"`。把一个恢复出的签名当作提供方的推断，并照这样记录它。

## 预测是推断记录

一个预测是一项关于行为、尚无观测陈述过的声明。`claim_suite()` 从推导出的模型和源代码构建出其中十八个。`record_prediction()` 把每一个都存成一条 `confidence` 为 `inferred`、`authority` 为 `analyst-inference` 的记录，并链接到它所依赖的那些记录。

| 声明 | 预测值 | 所依赖 |
|---|---|---|
| `percent_change(12400, 15500)` | 25，来自 310000 / 12400 | 除法模型 `ev_076a9167…` |
| `percent_change(0, 5)` | 0，零值守卫 | 除法模型 |
| `percent_change(100, 50)` | -50 | 除法模型 |
| `percent_change(-7, 3)` | -142，因为 `idiv` 朝零截断 | 除法模型 |
| `grade(55)` | 0，索引 -1 无法通过无符号比较 | 表模型 `ev_605106bf…` |
| `grade(60)`、`grade(69)` | 1、1 | 表模型 |
| `grade(70)`、`grade(85)` | 2、3 | 表模型 |
| `grade(95)`、`grade(100)`、`grade(105)` | 4、4、4 | 表模型 |
| `grade(110)`、`grade(-5)` | 0、0 | 表模型 |
| `total(1, 2, 3)`、`total()` | 6、0 | 源记录 `ev_2f1e6d25…` |
| `grade_label(85)` | `"B"` | 源记录与表模型 |
| 对 90 到 100 的 `grade(score)` | 全部十一个输入都为 4 | 表模型 |

`predict()` 使用 C 语义，而不是 Python 语义。`c_div()` 朝零截断，`wrap32()` 把每一个中间值折叠到 32 位。Python 的 `//` 朝负无穷舍入，所以 `(3 - -7) * 100 // -7` 给出 -143，而 C 程序给出 -142。第 36 课会把这个网格做得大得多。

每个预测都开启一个残留未知项。该未知项要求带权威 `controlled-replay` 的 `observed` 证据，并推荐一个探针：在主机构建上 `execute_function`。下一节会产生那份证据。对第一个 grade 声明，那个问题写着 "Does grade(95) == 4 hold when the compiled function runs?"（当被编译的函数运行时，grade(95) == 4 是否成立？）

## 对照一次运行来核查它们

`code/fixtures/harness.c` 包含 `ledger.c`，每次调用打印一个结果。`observe_runs()` 用你 PATH 上 `clang`、`cc` 或 `gcc` 中的第一个把它编译出来，并把网格里的每一个输入各运行一次。每一次运行都变成一条记录：

```json
{
  "operation": "execute_function",
  "parameters": { "function": "grade", "args": [95] },
  "normalized_result": { "result": 4, "stdout": "4\n", "exit_code": 0 },
  "confidence": "observed",
  "authority": "controlled-replay",
  "environment": { "id": "host-process", "platform": "darwin", "architecture": "arm64", "isolation": "process" },
  "limitations": [
    "The run executed a host build of ledger.c, not the x86-64 object. The claim about the object rests on the shared source and on the compiler.",
    "One run observes one input. It proves nothing about other inputs."
  ]
}
```

一条运行记录的 subject 是那个 harness 二进制文件——在这台 Mac 上是一个 Mach-O arm64 文件，有它自己的 SHA-256。provider 是 `course-harness`，带有编译器的版本行，此处为 `Apple clang version 17.0.0 (clang-1700.6.3.2)`。`evidence_links` 指明了源记录 `ev_2f1e6d251543d017…`，因为这次运行和那个目标文件除了共享 `ledger.c` 以外再无其他共同之处。

把第一条限制读两遍。那个 x86-64 目标文件从未在这台机器上运行过。运行的是同一份源代码为另一种架构所做的第二次构建。那仍然是一次观测，而且是在没有模拟器的情况下可得的最强的一次，所以这项声明带着那句话通过了。一份省略了它的报告，丢失了读者所需要的信息。

那 17 次单输入运行全都与预测吻合。`code/fixtures/run-evidence.json` 存放这 17 条记录和那条源记录，于 2026-10-13 用 `--record` 导出。当没有编译器时，`build_ledger()` 会改为导入那个包，报告会在它的 `runs` 字段里说明这一点。

## 晋升规则

一项声明只有经由观测运行，才能从推断变为被支持。`check_claim()` 寻找函数名和实参都相同的 `execute_function` 记录，把每个结果与预测比较，并统计被覆盖的输入：

| 状态 | 条件 | rea 的完成账本 |
|---|---|---|
| `pass` | 每个输入都有一次吻合的运行，且没有任何一次不吻合 | `pass` |
| `fail` | 任何一次运行不吻合 | `fail` |
| `unknown` | 一些输入有运行，另一些没有 | `unknown` |
| `unsupported` | 没有任何输入有运行 | `unsupported` |

`promote_claim()` 是严格的形式。当任何一个 id 是 `inferred` 或 `derived` 时，它抛出 `ClaimError`。当某个 id 指向的是另一个函数或另一组实参的运行时，它抛出。当列表为空时，以及当这些运行覆盖的输入少于声明所需时，它都抛出。`grade(55)` 的 Ghidra 伪代码记录和表模型都存在，而两者都无法晋升它。在图里关掉 `ev_7be90c0c…`，看着这项声明跌到 `unsupported`，而两条关于 `grade` 的记录仍然在。

范围声明展示了部分覆盖的情形。它那十一个输入里只有 95 和 100 两个出现在运行网格里。`check_claim()` 返回 `unknown`，`covered` 为 11 中的 2，而 `promote_claim()` 以 "2 of 11 inputs have observed runs"（11 个输入里有 2 个有观测运行）拒绝。账本不会把它四舍五入上去。

`completion_ledger()` 对应 rea 的 `EvidenceCompletionLedger`。它的 id 是 `ecl_` 加上它那些记录的哈希，只有当 `pass` 等于 `total` 时 `complete` 才为真。演示程序打印 `ecl_da64933ea13befed…`，`complete: false`，就因为那一个范围声明。

## 未知项是带哈希链的记录

rea 把一个残留未知项存成一条严格的记录。`code/main.py` 沿用相同的字段和相同的不变量。

它的 id 是 `unk_` 加上对 `{domain, question, scope_digest}` 做的 SHA-256，其中问题的空白被折叠为单个空格。两个就同一个文件问同一个问题的分析者会得到相同的 id。`scope_digest` 是目标文件的 SHA-256。

每一次改动都是一个新的修订。修订 1 的 `previous_revision_digest` 是 `null`。之后的每个修订都指明它前一个的 `revision_digest`，而这个摘要覆盖除它自身以外的每一个字段。`verify_unknown_chain()` 遍历这份列表并重新算出每个摘要。它检查每条链接都指向前一个修订。它检查每个修订所指明的变更证据都在账本里。

每一次变更本身就是一条证据记录，就像 rea 用 provider `rea-unknown-registry` 所做的那样。我们这边的变更记录带 `confidence` `derived`、`authority` `analyst-inference`，且没有 subject。它的限制写着 "A registry mutation records what the analyst decided. It is not proof of the answer."（一次注册表变更记录的是分析者作出的决定。它不是答案的证明。）

这就是为什么演示程序的 81 条记录里包含 36 条推导型变更记录：18 次开启和 18 次更新。

每个修订都强制三条不变量：

- 只有 `resolved` 的未知项才带 `resolution`，也只有修订 1 没有前驱。
- 一个 `contradicted` 的未知项指明至少一个相矛盾的 id，且没有任何 id 同时出现在两份列表里。
- 一个 `verified` 的 resolution 指明至少一个带所需置信度和权威等级的证据 id。

第三条规则是账本最常拒绝的地方。rea 的工作流说明写着 "Only qualifying observed evidence can verify a resolution."（只有合格的观测证据才能验证一个 resolution。）因此 `resolve_unknown()` 会拒绝表模型，拒绝一条权威为 `shipped-artifact` 的 observed 记录，而接受运行记录 `ev_f4ffbe8f922ec7fe…`。`grade(95)` 的已解决修订是修订 2，它的 `previous_revision_digest` 是 `ffca840b55a8a188…`，即修订 1 的摘要。

`update_unknown()` 接收 `expected_revision`，当它过期时抛出 `revision-conflict`，就像 rea 的 `update_unknown` 工具一样。正确的反应就是 rea 说明里给出的那个：重新读取当前修订，再作决定。

演示程序跑完后有一个未知项仍然开着：`unk_f2eb0d7f84c80a19…`，"Does grade(score) == 4 for every score from 90 to 100 hold when the compiled function runs?"（当被编译的函数运行时，从 90 到 100 的每一个分数是否都有 grade(score) == 4？）它的状态是 `investigating`，支持它的 id 包含那两次运行，而它的探针仍然指明那九个还没有运行的输入。

## 一份答案缓存不是一个分析数据库

rea 有三样看起来像缓存的东西。Ghidra 的目标快照是输入的一份私有副本，用 `-readOnly -deleteProject` 导入并在关闭时删除。内存里的 `AnalysisSnapshotCache` 为一个二进制身份最多保存 10,000 个条目。快照文件保存 `target`、`binding`、`entries`、`workflow_entries` 和一个 `evidence_bundle`。

缓存键是 `query_` 加上对 `{target, binding, operation, parameters}` 做的 SHA-256。`target` 是 `{sha256, kind, format, architecture}`，一个 `raw-binary` 目标还带 `entry_point`。`binding` 是提供方和整个 analysis profile，包括摘要在内。改动那 25 个 profile 参数中的任何一个——比如把 `jump_table_evidence` 从 `typed-case-default-blocks-v1` 改成 `v2`——摘要就变了，于是每一个键都变了。

`code/fixtures/rea-snapshot.json` 是 rea 在那两次运行期间写下的文件，142,690 字节。rea 以仅所有者可读的权限写下它，而已提交的副本对所有人可读。它有两个条目和一个带相同两条记录的证据包。`AnswerCache.import_snapshot()` 重新算出每个 `query_id`，并在任何一个不同时拒绝该文件。它拒绝 `target` 或 `binding` 与活动绑定不同的快照，并沿用 rea 的措辞 `profile_mismatch`。它拒绝 `format_version` 不是 `course-answer-cache-1` 的快照。

来自这台机器的三次测量。第一次 `grade` 查询花了 8.6 秒，含一次全新的 Ghidra 导入。针对同一个快照的 `percent_change` 查询花了 8.5 秒，因为一个不同的查询就是一次缓存未命中。第三次 `grade` 查询花了 2.1 秒，返回了带有相同 `evidence_id` 的相同记录。rea 里的内存重放会加上限制 "Loaded from a local REA analysis snapshot; this call did not re-run the provider."（从本地 REA 分析快照加载；本次调用没有重新运行提供方。）我们的 `lookup()` 加上一句同类的话，这样读者就能把一次重放和一次全新回答区分开。

一次变更会终结缓存。在 rea 6.5.0 中，一次重命名或一条注释会在 rea 把调用发给提供方之前清空快照缓存。一次失败的回复无法证明那次写入已回滚，所以一次失败的写入同样会停止重放。一次改变数据库的元数据导入也会这么做。

## 为什么智能体需要这个

一个通过 MCP 驱动 rea 的智能体，在每一次调用上都看到完整的记录，并能在它的报告里引用 `evidence_id`。2026 年的研究指出了这会在哪里出错。在 NDSS BAR 的研究中，对工具输出的过度信任是四种弱点之一。在那项植入文本的研究里，把二进制内容仅当作数据来展示，仍然留下 40 个里有 15 个不安全的提议，而带工具授权的来源检查把它们消除了。第三项研究观察了一个通过 MCP 驱动 Ghidra 的智能体（[arXiv 2606.06838](https://arxiv.org/abs/2606.06838)）。在带有数百个函数的二进制文件里，只有 10% 到 15% 在智能体产出桩之前得到了真正的分析。

账本用一条记录回应上述每一种情况，而智能体只报告账本所持有的东西。一项没有观测运行的声明是 `unsupported`。一项有一些运行的声明是 `unknown`。一段提供方文本关于那个提供方是 `observed`，仅此而已。把 `outputs/` 里的技能文件交给智能体，并让账本成为它唯一写入结论的地方。这对 Claude、Cursor、Codex、OpenClaw、Hermes，或任何读取 SKILL.md 的智能体都成立。

## 构建它

运行标准库演示程序：

```bash
cd phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns
python3 code/main.py
```

演示程序读取目标文件，导入那两条 rea 记录，验证 rea 快照，并推导出那两个模型。随后它记录 18 个预测，开启 18 个未知项，编译并运行 harness，核查每一项声明，并解决 17 个未知项。期望的形状：

```json
{
  "records": 81,
  "by_confidence": { "observed": 25, "derived": 38, "inferred": 18 },
  "rea_snapshot": { "entries": 2, "replay_hit": true, "stale_profile_refused": true },
  "grade_table": [1, 2, 3, 4, 4],
  "runs": "live: Apple clang version 17.0.0 (clang-1700.6.3.2)",
  "claims": [ { "claim_id": "grade(95)", "status": "pass", "covered": "1/1" }, { "claim_id": "grade(90..100)", "status": "unknown", "covered": "2/11" } ],
  "completion_ledger_id": "ecl_da64933ea13befed9483f8b00447bb3f4ceb74324c01e2515eff03f3af3ca750",
  "complete": false,
  "unknowns": { "resolved": 17, "investigating": 1 }
}
```

没有 C 编译器时，`runs` 读作 `imported 17 recorded run records from run-evidence.json`，其余相同。

按这个顺序阅读 `code/main.py`：

1. `canonical_json()` 和 `compute_evidence_id()` 持有哈希配方和语义投影。
2. `create_evidence()` 和 `validate_evidence()` 构建并检查一条记录。
3. `EvidenceLedger.record()` 和 `import_bundle()` 存储记录并拒绝冲突。
4. `open_unknown()`、`update_unknown()` 和 `resolve_unknown()` 维护修订链。
5. `observe_object()` 读取 ELF，`derive_grade_model()` 读取表。
6. `claim_suite()`、`predict()` 和 `record_prediction()` 写入推断层。
7. `observe_runs()` 把每一次 harness 运行变成一条观测记录。
8. `check_claim()`、`promote_claim()` 和 `completion_ledger()` 应用晋升规则。
9. `AnswerCache` 像 rea 的快照那样为答案设键，并拒绝过期的那些。

## 使用它

每个目标、每项调查各保留一个账本。把目标的 SHA-256 放进每一个 subject，把问题的 scope 摘要放进每一个未知项。当你更换工具时，更改 `provider` 并让各个 id 分道扬镳。当你重新构建夹具时，subject 摘要就变了，每一条旧记录都变成关于另一个文件的证据。

在你知道限制的那一刻就把它写下来。不应用重定位的读取器就这么说。一次主机构建的运行就这么说。推断出一个除数的模型就这么说。一条写出来却没有带上限制的记录，看起来比事实所允许的更强，而后来的读者无法修复这一点。

把每一段提供方文本都当作数据。来自目标的字符串和伪代码是目标所控制的文本。它们永远不会变成指令，也永远不会变成对行为的观测。rea 6.5.0 用 `_meta.provenance.untrusted_content: true` 标记这类结果。它的服务器指示让模型把目标内容当作数据，并把其中任何要求运行、安装、下载或发送什么的请求，当作一次提示注入企图来报告。这个标记有帮助，但你的账本仍然必须把目标文本挡在指令之外。

## 交互实验

### 实验 A：重新算出一个 rea id

在 `code` 目录下，打开 Python：

```bash
cd phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns/code
python3 -q
```

运行：

```python
from main import *
record = load_evidence_file(FIXTURES / "rea-evidence-grade.json")
record["evidence_id"] == compute_evidence_id(record)
record["subject"]["local_path"] = "/home/you/re/ledger-x86_64-O1.o"
record["evidence_id"] == compute_evidence_id(record)
record["limitations"].pop()
record["evidence_id"] == compute_evidence_id(record)
```

前两个比较为真。路径不在哈希里。第三个为假，因为一条限制就是内容。

### 实验 B：拒绝一次晋升

```python
ledger, report = build_ledger(live_runs=False)
claim = [c for c in claim_suite(ledger.find(operation="derive_switch_model")[0], ledger.find(operation="derive_arithmetic_model")[0], ledger.find(operation="read_source")[0]) if c.claim_id == "grade(55)"][0]
promote_claim(ledger, claim, [ledger.find(operation="derive_switch_model")[0]["evidence_id"]])
```

这次调用抛出 `ClaimError` 并指出那个推导型 id。现在传入运行 id：

```python
run = run_records_for(ledger, "grade", [55])[0]
promote_claim(ledger, claim, [run["evidence_id"]])["status"]
```

状态是 `pass`，返回的 `limitations` 带着那句主机构建的话。

### 实验 C：拒绝一个过期快照

```python
import json
snapshot = json.loads(REA_SNAPSHOT_PATH.read_text())
target, binding = rea_snapshot_binding(snapshot)
AnswerCache(target, binding).import_snapshot(snapshot)
stale = dict(binding["analysis_profile"]["parameters"], jump_table_evidence="typed-case-default-blocks-v2")
AnswerCache(target, {"provider": binding["provider"], "analysis_profile": make_profile(binding["provider"], stale)}).import_snapshot(snapshot)
```

第一次导入返回 2。第二次以 `profile_mismatch` 抛出 `CacheError`。一个版本字符串变了，整个快照就被拒绝。

### 实验 D：破坏链

```python
unknown_id = [u for u, r in ledger.unknowns.items() if r[-1]["status"] == "investigating"][0]
ledger.verify_unknown_chain(unknown_id)
ledger.unknowns[unknown_id][0]["severity"] = "critical"
ledger.verify_unknown_chain(unknown_id)
```

第一次调用返回 2。第二次抛出 `EvidenceIntegrityError`，因为修订 1 不再与它自己的摘要匹配，而修订 2 指向的是一个不再存在的摘要。

## 实践实验

关闭那个开着的未知项，并加入第二个提供方。

要求：

- 扩展 `run_grid()`，让范围声明那九个缺失的输入都运行，然后确认该未知项在修订 3 处移动到 `resolved`。
- 把 `llvm-objdump -d` 作为第二个提供方加入，给它自己的 `provider` 对象，并把它对 `grade` 的列表记录为 `observed`。
- 写一条 `derived` 记录，陈述 Ghidra 的列表和 llvm-objdump 的列表这两份列表解码出相同的 14 条指令，并把两者都链接上。
- 为 `grade_label(105)` 开启一个 severity 为 `high` 的未知项，因为表索引 4 读取 `labels[4]`，并用一次运行来解决它。
- 用 `export_bundle()` 导出账本，把它导入一个全新的账本，并证明每一条链仍然通过验证。

成功意味着一份报告，其中每一句都引用了来自该包的一个 id，而那唯一一项 `unknown` 声明已经消失。

## 评分实验

关于本课夹具的五个问题。用你构建的代码找出每个答案，然后把它写进 `code/lab_answers.json`。数字就写成数字，或写成诸如 `"0x40"` 的十六进制字符串，列表写成 JSON 列表。

1. `t1`：compute_evidence_id 为 rea-evidence-grade.json 给出的证据 id。
2. `t2`：grade 记录中限制的数量。
3. `t3`：grade 记录的 relationship_coverage 状态。
4. `t4`：grade 记录的置信度和权威等级，作为一个含两个字符串的列表。
5. `t5`：grade 记录 subject 的 SHA-256。

检查你的答案：

```bash
cd phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns
python3 code/lab.py
```

检查器会在已提交的夹具上，用 `code/main.py` 计算出每一个期望值。它为每个任务打印 `PASS`、`FAIL` 或 `TODO` 以及一个得分，只有五项全部通过时才以退出码 0 退出。`python3 code/lab.py my-answers.json` 检查另一个文件。`code/tests/test_lab.py` 证明检查器会接受正确答案并拒绝一个错误答案。

### 运行效果

[Inside a Decompiler](https://aiengineeringfromscratch.com/inside-a-decompiler?symbols=off) 机器维护一个证据账本，带四个托盘：观测、推导、推断和未知。这个链接打开关闭了符号表的那次运行，于是函数的名字和末尾被归入未知项，而起始被归入推断。

## 交付物

本课产出 `outputs/skill-evidence-ledger.md`。它告诉智能体如何把每一个结论写成一条带有置信度、权威等级、限制和链接的记录。它告诉智能体如何把未知项保持为若干修订，以及一项声明何时是 `pass`、`fail`、`unknown` 或 `unsupported`。

## 验证它

运行演示程序与确定性测试套件：

```bash
cd phases/13-tools-and-protocols/35-evidence-confidence-and-unknowns
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

这 28 个测试证明：

- 两个 rea 的 `evidence_id` 值、profile 摘要和两个快照 `query_id` 值都从内容重新算出
- 改变路径会保持 id 不变，而改变一条限制会改变它
- 一条被篡改的记录、一个不匹配的 profile provider、一个浮点数和一个未知的枚举值都被拒绝
- 一条重复记录返回 `duplicate`，一条冲突记录抛出，而包导入是原子的
- 已记录的运行包以 18 条记录导入且没有悬空链接
- 一个未知项在修订 1 处开启，拒绝一个过期的 `expected_revision`，且只用带 `controlled-replay` 的观测证据解决
- 一个被编辑过的修订会破坏链
- 晋升拒绝推断、推导、空和不相关的证据，并在有一次吻合运行时通过
- 部分覆盖是 `unknown`，而一次不吻合的运行是 `fail`
- 缓存在精确的键上命中，在其他参数上未命中
- 缓存拒绝一个已升级的 profile 版本、一个错误的 target、一个错误的 format 版本和一个被篡改的键
- ELF 读取器在偏移、大小、字节和重定位上与 `llvm-objdump` 一致，且表读出 `1, 2, 3, 4, 4`
- 预测使用 C 除法，且已记录的运行与全部 17 个单输入声明吻合
- 当有编译器在场时，实时运行也吻合

## 生产失败模式

| 失败 | 弱报告说什么 | 账本要求什么 |
|---|---|---|
| 伪代码被读作行为 | “grade 对不及格分数返回 0” | 对那个输入的一条 `execute_function` 记录，否则就是 `unsupported` |
| 反编译器签名被信任 | “percent_change 返回 16 字节” | 把该签名标记为提供方的推断，带上它那个 `low` 置信度 |
| 空列表被读作不存在 | “该函数没有调用者” | 一个 `unknown` 状态，或在工具提供时给出一个覆盖字段 |
| 路径被哈希进 id | 一次复制之后“记录变了” | 不含 `name` 和 `local_path` 的语义投影 |
| 一条限制从副本里被丢掉 | 一条看起来比来源更强的记录 | 导入时的 id 不匹配并被拒绝 |
| 部分网格被四舍五入上去 | “从 90 起的所有分数都通过” | `unknown`，`covered` 为 11 中的 2 |
| 主机运行被当成目标文件的运行 | “x86-64 目标文件返回 25” | 声明上带着那句主机构建的限制 |
| 用一句话关闭一个未知项 | “已解决，见上文” | 一个带所需权威等级观测 id 的 `verified` resolution |
| 覆盖一个过期修订 | 两个分析者的编辑相撞 | `revision-conflict` 与一次重读 |
| 发布后重放一个旧快照 | 来自一个已变契约的答案 | 导入时的 `profile_mismatch` |
| 重命名后仍保留缓存 | 一次隐藏了元数据写入的重放 | 分派前失效，以及一次失败的导出 |

## 操作规则

把你读到的、你计算出的和你期望的，用三个词记成三类记录。用一个 id 关闭一个未知项，绝不用一句话。只在答案被存储时的那个精确键下重放它，并在有一个版本字符串不同时拒绝它。

## 延伸阅读

- [rea 6.5.0 source, `src/domain/evidence.ts` and `src/domain/residualUnknown.ts`](https://github.com/morluto/rea)
- [RFC 8785, JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785)
- [Ghidra 12.1.4 release](https://github.com/NationalSecurityAgency/ghidra/releases)
- [Agent Failure Patterns in CTF Reverse Engineering, NDSS BAR 2026](https://www.ndss-symposium.org/wp-content/uploads/bar2026-58.pdf)
- [When Binaries Talk Back: Representation-Confusion Attacks on LLM-Assisted Reverse Engineering, arXiv 2607.12507](https://arxiv.org/abs/2607.12507)
- [Agentic decompilation study, arXiv 2606.06838](https://arxiv.org/abs/2606.06838)
- [When LLM Decompilers Recompile More and Preserve Less, arXiv 2609.05370](https://arxiv.org/abs/2609.05370)
- rea 6.5.0 源码位于本课所描述的 tag `3b79af2`：`src/domain/evidence.ts`、`.agents/skills/reverse-engineer-anything/SKILL.md`、`docs/cli.md`、`src/domain/reconstructionVerification.ts`、`src/application/ReconstructionObligationCandidates.ts`、`docs/tool-design.md`、`src/domain/evidenceCompletionLedger.ts`、`src/domain/residualUnknown.ts`、`src/application/investigation/UnknownEvidence.ts`、`.agents/skills/reverse-engineer-anything/references/evidence-workflows.md`、`src/application/binary/AnalysisSnapshotCache.ts`、`src/domain/analysisSnapshot.ts`、`src/application/binary/BinarySession.ts`、`src/application/binary/BinarySessionRecords.ts`、`docs/mcp-contracts.md`。
