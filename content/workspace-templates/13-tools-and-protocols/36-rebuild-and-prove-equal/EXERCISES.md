# 重建并证明等价：练习指南

- 课程路径：`phases/13-tools-and-protocols/36-rebuild-and-prove-equal`
- 可运行 Python 文件：`main.py`；评分实验 `lab.py`，答案写入 `lab_answers.json`

## 练习目标

把反编译证据变成一份两段式证明：从指令清单（而不是伪代码）重建 `percent_change` 和 `grade`，在一张覆盖零值、负值、舍入、溢出和除法陷阱的 92 单元格网格上对着原始目标文件做差分测试，再用原始标志重新编译、屏蔽重定位字段、比较重定位记录，并读取它们指向的常量表，最后铸造一份失败即关闭的证明记录。

## 建议步骤

1. **先读模型，再跑第一段：** 在 `code/` 目录打开 `python3 -q`，`from main import *`，依次调用 `percent_change_model(3, INT_MAX)`（应得 -133）、`percent_change_model(-1, 536870911, "x86_64")`（应得 `'trap'`）和同样参数的 `"aarch64"`（应得 -2147483648）。确认你理解 `wrap32()` 和 `idiv32()` 为何让 x86_64 与 AArch64 的判定基准不同。
2. **检查网格类别：** 调用 `input_grid()`，确认返回 92 个单元格；用 `classify()` 核对每类的数量（溢出 32、负值 17、边界 14、普通 12、零值防护 7、负值截断 5、舍入 2、超出 switch 2、陷阱 1）。理解“那个唯一的陷阱单元格”为何是 `before = -1`、`after = 536870911`。
3. **跑行为段：** 运行 `prove_behaviour(PLAUSIBLE)`，确认十个朴素用例通过而 28 个网格单元格失败，且 `oracle_disagreements` 为空；再运行 `prove_behaviour(EQUAL)`，确认全部 92 单元格一致。
4. **读取 ELF 目标文件：** `obj = ElfObject(ORIGINAL_OBJECT)`，取 `obj.function("grade")`，查看它在偏移 `0x26` 处那个 `R_X86_64_PC32` 重定位，并用 `read_table(obj, grade.relocations[0], 5, 4)` 读出 `[1, 2, 3, 4, 4]`。
5. **破坏并修复一个常量：** 运行 `prove_bytes("grade", CANDIDATES / "grade_case10_wrong.o")`，观察字节与记录都匹配而表不同（`1,2,3,4,3`）。按练习要求把 `grade_case10_wrong.c` 的 `case 10` 改回返回 4，用测试夹具命令 `clang -target x86_64-unknown-linux-gnu -O1 -fno-asynchronous-unwind-tables -c` 重新编译，再看状态变为 `pass`。
6. **完成评分实验：** 用你在上面构建的调用，为 `lab_answers.json` 填入 `t1`–`t5` 五个答案（`t1` = `percent_change_model(3, 105)`、`t2` = `percent_change_model(0, 5)`、`t3` = `grade_model(100)`、`t4` = `input_grid()` 的单元格数、`t5` = x86_64 模型发生陷阱的网格单元格数），然后运行 `python3 lab.py` 直到五项全部 PASS。
7. **（可选进阶）扩展到 total 和 grade_label：** 按课程“实践实验”的要求，为这两个函数各加一张网格和每段一条声明，让证明记录列出四个函数并保持聚合失败即关闭。

## 运行与验证

在工作区目录执行：

```bash
python3 main.py
python3 -m unittest discover -s tests
```

填写 `lab_answers.json` 后运行：

```bash
python3 lab.py
```

五个任务全部 PASS 时 `lab.py` 退出码为 0。

测试夹具中的 `.o` 目标文件已由上游用 clang 预先编译并提交，所以 `main.py` 与测试在没有 clang 的主机上也能运行——这种情况下行为声明会报告为 `unknown`，属于正常现象。实验 D（`python3 main.py --live`）需要本地安装 rea 6.5.0 与 Ghidra 12.1.4；未安装时 `main.py` 会自动重放测试夹具并在标准错误上说明，不影响其余步骤。
