# 恢复数据与类型：练习指南

- 课程路径：`phases/13-tools-and-protocols/41-recovering-data-and-types`
- 可运行 Python 文件：`main.py`

## 练习目标

把一段 `llvm-objdump` 清单中的内存访问转成 `struct account` 的字段偏移、宽度、种类、步长和大小，为每一项附上产生它的指令作为证据，再从 DWARF 5 的缩写和重定位后的表读出真实布局，并逐字段比较——同时记录名字、`const` 限定符和被指向类型这些指令无法提供的部分；最后读一个 Itanium C++ vtable 并把一次虚调用解析到它的槽。

## 建议步骤

1. **先读整份报告（实验前准备）：** 在 `code` 目录运行 `python3 main.py`，确认 `oracles.agree` 为 true、psABI/`ctypes`/DWARF/原生运行都给出偏移 `0, 4, 8, 16, 24` 和大小 32，并看 `builds` 中三个构建（O0/O1/O2）各自的 5 中取 5 匹配。
2. **手工解码成员条目（实验 A）：** 用 `load_object("account-x86_64-O0-g.o")` 和 `DwarfInfo`，读 `0x1a3` 处的九个字节 `0d 10 88 01 00 00 00 05 04`，先在纸上用缩写 13 拆出成员、`strx1` 名字索引、`ref4` 类型偏移和 `data1` 偏移（4），再对比 `.debug_str_offsets` 重定位前（全零）与重定位后（真实偏移）的差别。
3. **追踪一个函数（实验 B）：** 用 `trace_function("label_length", ...)` 查看各 `Access`，在运行前先判断哪次访问（`0xfb` 处把加载到的值用作基址的 `cmpb`）证明偏移 24 是指针；再在 `-O1` 清单上找到 `leaq 0x1(%rcx), %rcx`。
4. **折叠向量化循环（实验 C）：** 对 `-O2` 的 `sum_balances` 运行 `fold_unrolled`，确认八个相隔 32 的偏移折叠到偏移 4，步长证据为 `offset-delta 32`、`unrolled 32`、`loop-step 256`；再用 `analyze_build("O2", fold=False)["comparison"]` 数出关闭折叠时的 `unexpected` 行。
5. **读 vtable 与名字（实验 D）：** 用 `read_vtable(shapes, "_ZTV4Rect")` 和 `read_typeinfo`，从 `callq *0x10(%rax)` 在纸上算出 `0x10 / 8 = 2` 即槽 2，并用 `DwarfInfo(shapes).struct("Rect").virtual_methods` 确认；再对 `-O1` 目标文件试 `read_vtable`，理解为什么该符号缺失（编译器内联了调用，没有东西取表的地址）。
6. **做实践实验：** 扩展 `trace_function()` 使帧槽区域可作为根，从 `movaps` 存储为其播种，把 `main` 在 `-O1` 下的栈上结构体访问归属到该根，从 `0x120`–`0x12c` 的循环推导步长 32，与 DWARF 比较达到五处匹配，并补一个在帧根被误归属到参数时失败的测试。

## 运行与验证

在工作区目录执行：

```bash
python3 main.py
python3 -m unittest discover -s tests
```

`main.py` 打印一份完整 JSON 报告，可据此核对 DWARF 单元头、三个构建的推断布局与比较结果，以及 C++ 的 vtable、typeinfo 和虚调用解析。

fixture（三个优化级别的 `account` 目标文件及其 `llvm-objdump` 清单、`shapes` 的 C++ 目标文件、各工具捕获文本）都由上游预先编译并提交，运行时不需要安装 `clang`；若某些需要外部工具（如 Ghidra、rea、rizin）的交互步骤因工具缺失而无法复现，属于正常情况——本课的分析全部在已捕获的文本和已提交的目标文件上进行。

在工作区中运行测试时，检查站点图示模块 `site/figures-re-41.js` 的那一项测试会显示 skipped，因为工作区不包含上游网站文件；其余测试应全部通过。如需连这一项一起运行，在 Learning Atlas 仓库根目录执行：

```bash
cd ai-engineering-from-scratch/phases/13-tools-and-protocols/41-recovering-data-and-types/code && python3 -m unittest discover -s tests
```
