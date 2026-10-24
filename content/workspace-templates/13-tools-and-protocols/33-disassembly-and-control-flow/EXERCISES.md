# 反汇编与控制流：从字节到一张你能核对的图：练习指南

- 课程路径：`phases/13-tools-and-protocols/33-disassembly-and-control-flow`
- 可运行 Python 文件：`main.py`；评分实验 `lab.py`，答案写入 `lab_answers.json`

## 练习目标

为 ledger 夹具中的 x86-64 指令子集构建一个解码器，对照 `llvm-objdump -d` 验证它，再在同一段字节上运行线性扫描和递归下降，看清各自的盲点；然后把指令切成基本块、构建带类型边的控制流图、用迭代算法求支配节点，并从重定位恢复 `grade` 在 -O0 下的跳转表目标。

## 建议步骤

1. **跑通演示：** 运行 `python3 main.py`，确认 JSON 报告里 `ledger-x86_64-O0.o` 的 `oracle` 为 `86/86 instructions agree with llvm-objdump`，并以 `sweepTrap` 比较结束。
2. **纸上解码再核对（实验 A）：** 在 `python3 -q` 中 `from main import *`，对 `48 8d 0d 00 00 00 00`、`8d 44 08 fa` 和那条五个 `66` 的 `nopw` 调用 `decode(...)`，写下预期后比对；再用 `decode(bytes.fromhex("0f 0a"), 0)` 触发并阅读 `DecodeError`。
3. **解析 lea 上的重定位（实验 B）：** `load_fixture("ledger-x86_64-O0.o")`，对 `0x66` 处的 `lea` 调用 `resolve_reference`，确认它指向 `.rodata+0x0`；再解码 `0x10e` 处的 `callq`，确认其 `R_X86_64_PLT32 grade-0x4` 解析到 `0x30`。
4. **看两种方法分歧（实验 C）：** 对 `sweep-trap.o` 分别运行 `linear_sweep` 和 `recursive_descent`，数出各自的指令数，找出从 `0x13` 开始、吞掉真实 `addl` 的那条 `addq`，并确认下降在 `0x14` 处正确读出 `addl $0x1, %eax`。
5. **手工求支配节点（实验 D）：** 对 `total` 在 -O1 下用 `analyze_function` 取 `cfg.edges`、`reverse_postorder()`、`dominators()` 和 `back_edges()`，核对五个块、五条边、一条回边 `0x50 -> 0x50`；再在 `grade` 的 -O0 上解释为何 `idom(0xa1)` 是 `0x30`。
6. **填写评分实验：** 用 `main.py` 的接口求出 `t1`–`t5`（-O1 下 grade 的下降指令数、-O1 下 total 的块数、total 循环头地址、sweep-trap 中覆盖 `0x14` 的扫描指令起始地址、-O0 下 grade 跳转表的条目数），写入 `lab_answers.json`，运行 `python3 lab.py` 直到五项全 `PASS`。

## 运行与验证

在工作区目录执行：

```bash
python3 main.py
python3 -m unittest discover -s tests
```

填写 `lab_answers.json` 后运行 `python3 lab.py`，五项全部 PASS 时退出码为 0。课文中的 `python3 code/tests/test_main.py` 是在课程目录下运行同一套测试的写法。

夹具（`ledger-*.o`、`sweep-trap.o`、`sweep-trap.s`、各 `*.objdump.txt`）由上游预先编译并提交，不需要安装 clang 或 llvm-objdump；测试只读取这些已提交字节。

在工作区中运行测试时，检查站点图示模块 `site/figures-re-33.js` 的那一项测试会显示 skipped，因为工作区不包含上游网站文件；其余测试应全部通过。如需连这一项一起运行，在 Learning Atlas 仓库根目录执行：

```bash
cd ai-engineering-from-scratch/phases/13-tools-and-protocols/33-disassembly-and-control-flow/code && python3 -m unittest discover -s tests
```
