# 动态分析你自己的程序：调试器、追踪与验证静态结论：练习指南

- 课程路径：`phases/13-tools-and-protocols/42-dynamic-analysis-of-your-own-program`
- 可运行 Python 文件：`main.py`（本课没有评分实验 `lab.py`）

## 练习目标

学会把调试器的一次运行当作证据来用：从反汇编清单规划 lldb 的停下，用一个 stop hook 记录寄存器、内存和栈帧变量，再把 transcript 解析回时间线，并对照它为参数寄存器、结构体字段偏移、条件分支走向和调用关系等静态结论打出“已确认 / 已反驳 / 未观测”三种判定；同时理解为什么同一份源代码在 `-O0` 和 `-O2` 下会得到完全不同的停下结果。

## 建议步骤

1. **先跑演示，读懂报告：** 在工作区目录运行 `python3 main.py`，输出是针对 `fixtures/` 中保存的 transcript 的一份 JSON 报告。对照 `O0` 和 `O2` 两个变体，看每个断点的 `resolved` 与 `hits`、`hardwareWatchpoints`、每次停下的寄存器，以及每条结论的 `verdict`。记住 `O0` 全部八条结论应为 `confirmed`，而 `O2` 的 `stops` 为空、`calls` 为 `refuted`。
2. **手工读一次停下（对应实验 A）：** 在 `code` 目录用 `python3 -q` 打开解释器，运行 `from main import *`，`t = load_transcript("session-O0.lldb.txt")`，`s = t.stops[0]`。先写下你预期哪个字保存 250、哪两个字保存 1.25，再用 `struct.unpack("<d", struct.pack("<II", s.memory[4], s.memory[5]))` 核对；然后在 `fixtures/account-O0.objdump.txt` 中找到 `t.stops[1].pc`，确认它是那次存储之后的那条指令。
3. **把分支提升成谓词（对应实验 B）：** 用 `plan = make_plan("O0")`、`plan.branches()`，再对 `classify` 的每个分支调用 `lift_condition(classify, b, "a->balance")`，确认第一个分支提升为 `a->balance >= 0`、第二个为 `a->balance <= 200`；在看证据之前先判断每次边停下的后继，再用 `evaluate(...)` 过滤 `branch` 开头的结论来核对。
4. **理解零次停下的运行（对应实验 C）：** 加载 `session-O2.lldb.txt`，确认 `len(o2.stops)` 为 0、`o2.exit_status` 为 0；用 `rollup(evaluate(make_plan("O2"), o2, ...))` 查看判定，用自己的话解释每条 `not-observed`，再打开 `fixtures/account-O2.objdump.txt` 找到 `main` 中替换了调用的四个常量，并用 `count_tags()` 统计 `account-O2.dwarfdump.txt` 中的 `DW_TAG_inlined_subroutine`（应为 0）。
5. **弄坏证据，确认评分器会失败（对应实验 D）：** 把 `session-O0.lldb.txt` 文本里第一处 `x1 = 0x0000000000000005` 替换为 `...06`，用 `parse_transcript()` 重新解析，确认第一条 `arg-registers` 记录变成 `refuted` 而其余四个入口仍为 `confirmed`；再删掉观察点停下之前的 `old value: 250` 行，看 `store-once` 跌到 `not-observed`。
6. **可选：对自己的程序走一遍流程（对应“使用它”）：** 用 `-g` 和你将发布的优化级别构建一个小程序，先写下结论再运行，用 `python3 main.py plan O0` 查看生成的命令文件，并把 transcript 连同命令行和调试器版本一起保存。
7. **可选：实时运行：** 如果本机的 lldb 能在你的 shell 里启动进程，运行 `python3 main.py live O0` 和 `python3 main.py live O2`。栈地址会与 fixture 不同，但判定不应不同；在受沙箱限制的环境里，`live` 会报告 lldb 无法启动进程并以 1 退出。

## 运行与验证

在工作区目录执行：

```bash
python3 main.py
python3 -m unittest discover -s tests
```

`python3 main.py` 读取 `fixtures/` 中一次性捕获的 transcript，不需要安装或运行 lldb，应当正常输出 JSON 报告。

fixture（二进制、dSYM、objdump/dwarfdump/nm 文本和 lldb transcript）都由上游预先生成并提交，不需要安装 clang 或 lldb；若本机没有 `clang`/`lldb`，只是 `live` 模式无法实时编译和运行，确定性套件仍然通过。

在工作区中运行测试时，检查站点图示模块 `site/figures-re-42.js` 的那一项测试会显示 skipped，因为工作区不包含上游网站文件；其余测试应全部通过。如需连这一项一起运行，在 Learning Atlas 仓库根目录执行：

```bash
cd ai-engineering-from-scratch/phases/13-tools-and-protocols/42-dynamic-analysis-of-your-own-program/code && python3 -m unittest discover -s tests
```
