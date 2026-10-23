# 二进制差异比对与符号执行：练习指南

- 课程路径：`phases/13-tools-and-protocols/44-binary-diffing-and-symbolic-execution`
- 可运行 Python 文件：`main.py`（本课没有评分实验 `lab.py`）

## 练习目标

构建并运行本课的两套方法——一个分阶段贪心函数匹配器和一个在小型 IR 上的符号执行器——并用 radiff2、Ghidra、angr 和 z3 的捕获结果作对照，学会把“两个函数匹配”和“某个输入满足某条路径”都当成带方法、带界限的主张来检验。

## 建议步骤

1. **跑通演示：** 在工作区目录运行 `python3 main.py`，确认输出是一份 JSON 报告，并找到其中的 `diffs`、`toolComparison`、`patch`、`radare2Ratios`、`gradeRelocationCase` 和 `symbolic` 字段。
2. **手工求五种签名（实验 A）：** `python3 -q` 进入解释器，`from main import *`，取 `fixture_records("ledger-x86_64-O1.o")` 中的 `grade`，依次查看 `grade.raw.hex(" ")`、`grade.masked_bytes() == grade.raw`、`grade.mnemonics`、`grade.cfg_shape()` 和 `grade.signatures()`；再对 `ledger-x86_64-O0.o` 的 `grade` 做同样操作并数出 `grade.edges` 中的 `table` 边数（应为 4）。
3. **看重定位破坏字节哈希（实验 B）：** 运行 `grade_relocation_case()`，在读 `displacements` 前先在纸上算 `0x100110 + 0x14 - 0x10003a`（应得 0xea = 234），确认 `objectBytesEqual` 为真而 `imageBytesEqual` 为假、`maskedImageBytesEqual` 为真。
4. **复现错误匹配与 BinDiff 顺序（实验 C）：** 用 `diff_fixtures("ledger-x86_64-O0.o", "ledger-x86_64-O1.o")` 观察 `percent_change` 被错配到 `grade_label`（阶段为流图形状），再用 `stages=BINDIFF_ORDER` 重跑，确认四个函数都按名称匹配。
5. **枚举路径并观察路径爆炸（实验 D）：** 运行 `grade_paths("O0")`，读出五个叶子的 `trace`、`condition` 和 `returns`，并用 `total_paths(2)`、`total_paths(4)`、`total_paths(8)` 确认得到 3、5、9 条路径，用 `total_paths(64, step_limit=24)["truncated"]` 观察上限截断。
6. **对照生产工具：** 在报告的 `toolComparison` 和 `radare2Ratios` 中核对本课阶段与 radiff2 判定/比率、Ghidra 关联器是否一致，特别是 `grade` 在 82 字节上的 0.426829 比率。

## 运行与验证

在工作区目录执行：

```bash
python3 main.py
python3 -m unittest discover -s tests
```

fixture（`ledger-x86_64-O0/O1/O2.o`、`grade_case10_wrong.o` 及各 `.objdump.txt`、radiff2/Ghidra/angr/z3 捕获文件）由上游预先编译并提交，`main.py` 只读取它们、不调用 clang、radare2、Ghidra、angr 或 z3，因此不需要安装这些外部工具。

在工作区中运行测试时，检查站点图示模块 `site/figures-re-44.js` 的那一项测试会显示 skipped，因为工作区不包含上游网站文件；其余测试应全部通过。如需连这一项一起运行，在 Learning Atlas 仓库根目录执行：

```bash
cd ai-engineering-from-scratch/phases/13-tools-and-protocols/44-binary-diffing-and-symbolic-execution/code && python3 -m unittest discover -s tests
```
