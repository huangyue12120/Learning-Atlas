# 超越原生代码：Python、JVM、.NET 与 WebAssembly 字节码：练习指南

- 课程路径：`phases/13-tools-and-protocols/43-bytecode-and-managed-formats`
- 可运行 Python 文件：`main.py`（本课没有评分实验 `lab.py`）

## 练习目标

学会在 Python 标准库里从第一个字节读取四种容器——CPython pyc、JVM class 文件、WebAssembly 模块和 .NET 程序集——的结构，解码同一个 `grade` 函数，并对照每种格式自己的工具（`marshal`/`dis`、`javap`、`wasm-objdump`、System.Reflection.Metadata）逐项核对；同时填出一张“保留 / 丢失”事实表，弄清每种容器保留了哪些名称、类型和控制结构，以及为什么必须先读头部、核对版本，再评判任何反编译器的输出。

## 建议步骤

1. **先跑演示，读懂报告：** 在工作区目录运行 `python3 main.py`，输出是一份 JSON 报告，涵盖四个 pyc 头部、class 构建、Wasm 构建和 .NET 程序集，以及最后那张“保留”表。确认每一行判定基准比较都读作 `n of n`（JVM 108/108、Wasm 77/77、.NET 246/246）。
2. **读 pyc 头部与代码对象（对应实验 A）：** 在 `code` 目录用 `python3 -q` 打开解释器，`from main import *`，`pyc = load_pyc("ledger.cpython-311.pyc")`。先写下魔数字，再看 `pyc.header.to_dict()`、`pyc.module.names` 和 `pyc.functions()["grade"].varnames`；然后加载 `ledger.cpython-314.pyc` 比较两个 `code` 的长度，并对 3.11 文件试 `marshal.loads(pyc.data[16:])` 观察错误。
3. **跟踪常量池链（对应实验 B）：** `cls = load_class("Ledger-g.class")`，在调用 `cls.describe_constant(13)` 之前，手工从 `#13` 顺到 `#8` 和 `#14` 再到 `Utf8` 条目，确认得到 `Ledger.grade:(I)I`；再加载 `Ledger-gnone.class`，对两者调用 `cls.method("grade").attribute_names()`，确认 `Code` 数组相同而属性不同。
4. **读 Wasm 的深度与标签（对应实验 C）：** `module = load_wasm("ledger.wasm")`，用 `wasm_listing(module, "grade")` 查看每行的 `depth` 与文本，找到 `br_table` 行并数它之后的 `end` 行，把每行对应到表里的标签号；再用 `load_wasm("ledger-names.wasm").names["locals"][2]` 确认有 name 节时才能拿到 `score`、`bucket` 等局部变量名。
5. **从标记走到字节（对应实验 D）：** `asm = load_assembly("LedgerNet.dll")`，取 `Grade` 方法的 `RVA`，用 `asm.method_body(...)` 查看 `fat`、`max_stack`、`code_size` 和 `local_signature_token`；手工从 `.text` 节头部算 RVA `0x2060` 的文件偏移并与 `asm.rva_to_offset(0x2060)` 比较，再用 `asm.row(0x08, 3)` 找到名字 `score` 的位置。
6. **填“保留”表：** 运行 `python3 code/main.py keeps`，对照五种容器逐列确认：每种容器是否保留函数名、参数名、类型、局部变量名、行号和控制流，并记住只有 .NET 的 Param 表和 JVM 的 `LocalVariableTable`（`-g`）保留参数名，局部变量名在 pyc 里免费、在 .NET 里需要 PDB。
7. **可选：对自己的容器走一遍流程（对应“使用它”）：** 用 `python3 code/main.py pyc FILE`、`class FILE`、`wasm FILE` 或 `dll FILE` 读一个你自己构建的容器，先读头部与生产者版本，再对照该格式自己的工具逐行比较，最后才读反编译器输出并区分“复制的事实”与“推断的事实”。

## 运行与验证

在工作区目录执行：

```bash
python3 main.py
python3 -m unittest discover -s tests
```

`python3 main.py` 读取 `fixtures/` 中一次性捕获的 class/wasm/.NET 判定基准文本和多版本 pyc，不需要安装 JDK、.NET SDK 或 wabt，应当正常输出 JSON 报告。

fixture（各版本 pyc、Java class、Wasm 模块、.NET dll 以及 javap/wasm-objdump/metadump 判定基准文本）都由上游预先构建并提交，不需要安装编译工具链；依赖具体解释器的指令清单测试会在缺少对应 `python3.11`–`python3.15` 时自动 skip，这属于正常情况。

在工作区中运行测试时，检查站点图示模块 `site/figures-re-43.js` 的那一项测试会显示 skipped，因为工作区不包含上游网站文件；其余测试应全部通过。如需连这一项一起运行，在 Learning Atlas 仓库根目录执行：

```bash
cd ai-engineering-from-scratch/phases/13-tools-and-protocols/43-bytecode-and-managed-formats/code && python3 -m unittest discover -s tests
```
