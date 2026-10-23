# 逆向工程全景：练习指南

- 课程路径：`phases/13-tools-and-protocols/37-the-reverse-engineering-landscape`
- 可运行 Python 文件：`main.py`（本课没有评分实验 `lab.py`）

## 练习目标

读懂 radare2、rizin、angr、Ghidra 和 llvm-objdump 在你自己编译的目标文件上给出的分歧：把五个工具的不同地址归约到同一个 `.text` 偏移，逐函数比较指令起点、块和边，并在每个工具的说明（`switch_op`、`COMPUTED_JUMP`、无法解析目标节点、填充处凭空造出的函数）的背景下解释块计数的差异；再把一条指令提升为 P-code 风格（急切写标志）和 VEX 风格（`cc_op` thunk）两种形式，理解两者为何都完整却长短不同。

## 建议步骤

1. **一个函数，四种基准：** 在 `code/` 目录打开 `python3 -q`，`from main import *`，运行 `views = load_views("ledger-x86_64-O1.o")`，先打印每个工具的 `view.base`，再打印 `view.functions["grade"].start + view.base`。确认去掉各自基准后 `grade` 在四个工具里都落在偏移 `0x10`。
2. **从四侧看跳转表：** 运行 `report = compare("ledger-x86_64-O0.o")`，查看 `report["functions"]["grade"]["blocks"]`（应为 radare2 3、rizin 8、angr 8、Ghidra 9）和对应的边；读 `report["notes"]["rizin"]` 与 `report["notes"]["ghidra"]`，再看 `report["bytes"]["radare2"]["misses"]`，把 radare2 漏掉的 36 个字节范围对应到第 33 课的 `-O0` 清单。
3. **急切标志对阵 thunk：** 运行 `translate("48 83 ec 10")["pcodeLike"]` 和 `["vexLike"]`，在两份输出里找到 `cc_op` 常量；再运行 `translate("83 f9 04")["vexLike"]`，解释为何一个 `cc_op` 是 8、另一个是 7（64 位减法对 32 位减法）。然后运行 `translate("48 01 c8")` 观察 `TranslateError`——翻译器会拒绝它不支持的编码。
4. **代码里的数据：** 运行 `report = compare("sweep-trap.o")`，查看 `report["functions"]["lookup"]["instructionStarts"]` 和 `report["bytes"]["dataInsideSymbols"]`，确认线性扫描在 `0x10`、`0x12`、`0x13` 多出起点而丢掉 `0x14`，并理解为何没有图构建器把 `0x10` 到 `0x14` 当作代码。
5. **通读整份报告：** 直接运行 `python3 main.py`，依次看 `captureTools`、各目标文件的 `bases`、`functions`、`findings` 和末尾的 `ir` 节，把每个数字和一条发现句子对上。
6. **用额外命令交叉验证：** 运行 `python3 main.py compare ledger-x86_64-O2.o`（确认 `total` 为 10 块 13 边）、`python3 main.py ir 4863c7`（`movslq`，无标志）和 `python3 main.py figure-data`（时间线从 1973 到 2026、八阶段流水线）。
7. **（可选进阶）加入第五份捕获：** 按课程“实践实验”的要求，为一个你能运行的工具（如 GNU `objdump`）写一个解析器，把它加入 `TOOLS`（若建图再加入 `DESCENT_TOOLS`），并补上两个测试。

## 运行与验证

在工作区目录执行：

```bash
python3 main.py
python3 -m unittest discover -s tests
```

全部捕获文件（21 个）已由上游预先用各工具生成并提交进 `fixtures/`，`main.py` 与测试从不启动任何外部工具，所以即使本机没有安装 radare2、rizin、angr 或 Ghidra 也能完整运行——`main.py` 开头会把缺失的工具列为 "absent"，属于正常现象。

在工作区中运行测试时，检查站点图示模块 `site/figures-re-37.js` 的那一项测试会显示 skipped，因为工作区不包含上游网站文件；其余测试应全部通过。如需连这一项一起运行，在 Learning Atlas 仓库根目录执行：

```bash
cd ai-engineering-from-scratch/phases/13-tools-and-protocols/37-the-reverse-engineering-landscape/code && python3 -m unittest discover -s tests
```
