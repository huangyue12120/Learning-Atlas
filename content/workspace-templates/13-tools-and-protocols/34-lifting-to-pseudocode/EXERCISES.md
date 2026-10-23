# 提升为伪代码：从零构建 IR、SSA 与结构化：练习指南

- 课程路径：`phases/13-tools-and-protocols/34-lifting-to-pseudocode`
- 可运行 Python 文件：`main.py`；评分实验 `lab.py`，答案写入 `lab_answers.json`

## 练习目标

把第 33 课解码出的 x86-64 指令提升为小型 IR、构建 SSA、化简并结构化，最终为 `percent_change`、`grade` 和 `total` 产出伪代码，并逐行对照 Ghidra 的反编译文本，为每一处差异指出背后的指令或猜测。

## 建议步骤

1. **先看整体（实验 A）：** 运行 `python3 main.py`，确认摘要里 `objdumpDifferences` 为 0；随后在 `code` 目录打开 `python3 -q`，用 `read_object(FIXTURES / "ledger-x86_64-O1.o")` 和 `lift_function(obj, "percent_change")` 依次打印 `lifted.ir_text`、`lifted.ssa_text`、`lifted.pseudocode`，跟踪 `%esi` 从 `subl %edi, %esi` 一路变成 `(param_2 - param_1)`。
2. **理解除法惯用法（实验 B）：** 调用 `lift_function(obj, "grade", recognize_division=False).pseudocode` 看原始乘法与移位，再用 `magic_divisor(0x66666667, 34)`、`magic_divisor(0x66666667, 33)`、`magic_divisor(0x66666667, 31)` 验证它们分别得到 `10`、`5`、`None`，想清楚为何移位量 31 会被误差界拒绝。
3. **让解码器停住并扩展它（实验 C）：** 用 `clang -target x86_64-unknown-linux-gnu -O2 -fno-asynchronous-unwind-tables -c fixtures/ledger.c` 构建一个 `-O2` 目标文件再提升，观察解码器在操作码 `81`（`andl` 的 group 1 形式）处抛出 `DecodeError`，并在 `decode_one()` 里 `0x83` 旁边补上该条目。
4. **看穿 Ghidra 的默认值（实验 D）：** 运行 `ghidra_pseudocode("grade")`，再对若干分数手算 `-(score >> 31)` 与乘积符号位的异或，确认结果恒为 0，对应指令 `xorl %eax, %eax`。
5. **做实践实验：** 为 `-O0` 下的 `grade` 加上 `switch` 恢复——读取 `.rela.rodata` 的五条重定位、从 `.rodata+0x0` 处的表算出五个 case 目标、给 IR 加 `Switch` 终结符、让 switch 块每个目标各有一个后继，使 `-O0` 与 `-O1` 的 `grade` 在分数网格上输出一致，且不含 `goto`。
6. **完成评分实验：** 用你构建的代码求出 `t1`–`t5` 五个答案（percent_change 的形参、total 的 phi 数、`magic_divisor` 的除数、percent_change 伪代码最后一行、total 的 param_1 类型），写入 `lab_answers.json` 后运行 `python3 lab.py`，直到五项全部 `PASS`。

## 运行与验证

在工作区目录执行：

```bash
python3 main.py
python3 -m unittest discover -s tests
```

填写 `lab_answers.json` 后运行评分实验；全部 PASS 时退出码为 0：

```bash
python3 lab.py
```

`fixtures/` 里的 `ledger-x86_64-O1.o`、`ledger-x86_64-O0.o`、两份 `.objdump.txt` 和 Ghidra JSON 都由上游预先编译并提交，不需要安装 clang 即可运行演示与大部分测试。按上述命令发现并运行的测试共 29 个（`test_main.py` 的 25 个演示与提升器测试，加上 `test_lab.py` 的 4 个评分实验测试）；若未在锁定路径安装 `llvm-objdump` 或 clang，会有若干依赖实时工具的测试显示为 skip，这属于正常情况（本工作区实测为 3 个 skip，其余通过）。
