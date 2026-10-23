# 编译器惯用法：优化对你的代码做了什么，以及如何把它读回来：练习指南

- 课程路径：`phases/13-tools-and-protocols/39-compiler-idioms-and-optimization`
- 可运行 Python 文件：`main.py`

## 练习目标

构建并运行一个惯用法识别器，把优化编译器发出的指令形状读回源代码结构：用 Granlund-Montgomery 界从魔数恢复除数，把 switch 分类为五种降低方式之一，把向量化循环读作通道与累加器，并识别尾调用、内联、无分支选择、栈保护金丝雀和 CET 落地垫——在 x86-64 和 AArch64 上、从 `-O0` 到 `-O3`，每条声明都对照 C 源代码验证。

## 建议步骤

1. **推导并核对魔数（实验 A）：** 进入 `python3 -q`，调用 `magic_numbers(10)`、`magic_numbers(7)` 和 `divisor_from_magic(0x66666667, 34, signed=True)`，确认除数由乘数和总移位量共同决定（34 得 10，33 得 5）；用 `python3 main.py magic 7` 核对误差与边界恒等式。
2. **读查找表与比较树（实验 B）：** 用 `load_listing` / `load_elf` / `load_source` 加载 `idioms-x86_64-O2`，对 `table_switch` 和 `sparse_switch` 运行 `analyze_function`，并用 `elf.words(".rodata", 0x28, 7)` 确认表条目是 `[10, 20, 30, 40, 50, 60, 71]`。
3. **三种设置下的循环（实验 C）：** 对 `idioms-x86_64-O1`、`-O2`、`-novec-O2` 分别分析 `sum_n`，确认 `-O1` 无向量化、`-O2` 是 4 通道 × 2 累加器 = 每次迭代 8 个元素、`-novec-O2` 是展开 8 次的标量循环；手工画出 `-O2` 的控制流图并标出守护、掩码、向量体、归约和余数循环。
4. **共享的商（实验 D）：** 对 `idioms-x86_64-O1` 和 `idioms-arm64-O1` 分析 `digest`，确认同一个商同时被除法和模运算共享（`sharedQuotient`），并解释为什么 AArch64 只需一条指令结合符号修正。
5. **跨级别比较降低方式：** 用 `python3 main.py scan FILE.objdump.txt` 对 `digest` 比较 `-O0`/`-O1`/`-O2`/`-O3` 的 `switch` 降低（跳转表 → 查找表折叠因子 16 → 跳转表 / AArch64 比较树的范围测试 9–10）。
6. **实践实验（可选，扩展）：** 添加 `popcount`、`ctz`、`rotl` 位技巧测试夹具，扩展 `find_*` 识别人口计数常量序列，并把新 kind 加入 `parse_source()` 验证，使 `unverified` 列表保持为空。

## 运行与验证

在工作区目录执行：

```bash
python3 main.py
python3 -m unittest discover -s tests
```

`python3 main.py` 会输出 18 个构建的惯用法报告，并以空的 `unverified` 列表结尾（全部 373 份报告对照 C 源代码验证通过）。

在工作区中运行测试时，检查站点图示模块 `site/figures-re-39.js` 的那一项测试会显示 skipped，因为工作区不包含上游网站文件；其余测试应全部通过。如需连这一项一起运行，在 Learning Atlas 仓库根目录执行：

```bash
cd ai-engineering-from-scratch/phases/13-tools-and-protocols/39-compiler-idioms-and-optimization/code && python3 -m unittest discover -s tests
```

全部测试夹具（`.c`、`.s`、`.o`、`.objdump.txt`，以及 `.rizin.txt`、`.radare2.txt`、`.lldb.txt`、`.lifts.json`、`.angr.json` 等预捕获输出）均由上游预先编译并提交，不需要安装 clang；反编译器和提升工具（Ghidra/pypcode、angr、radare2、rizin、lldb）的输出都是预先捕获的文本，分析器只读取它们，因此本地不安装这些外部工具也能完成全部练习。
