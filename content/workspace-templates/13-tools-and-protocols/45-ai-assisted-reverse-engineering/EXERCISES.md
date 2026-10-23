# AI 辅助逆向工程：练习指南

- 课程路径：`phases/13-tools-and-protocols/45-ai-assisted-reverse-engineering`
- 可运行 Python 文件：`main.py`（本课没有评分实验 `lab.py`）

## 练习目标

用标准库 Python 构建并运行一张六字段记分卡（字节、网格、模糊测试、名称、引用、来源记录），学会把一个模型的重建“代码”和它附带的“报告”分开评分：代码对照字节、网格和模糊语料，名称对照你自己调试构建的 DWARF，引用对照二进制，并把 harness 作为一个 MCP 服务器暴露、把来自二进制的字符串标记为不可信内容。

## 建议步骤

1. **跑通演示：** 在工作区目录运行 `python3 main.py`，确认输出是一份 JSON 报告，并找到 `host`、`compiler`、`target`、`groundTruth`、`candidates`、`failingEvidence`、`poisonedStrings` 和 `mcpTools` 字段。没有 clang 时 `grid`、`fuzz` 和每个 `verdict` 读作 `unknown`，这是正常的。
2. **手工读 DWARF（实验 A）：** `python3 -q` 进入解释器，`from main import *`，用 `ElfObject(TRUTH_OBJECT)` 查看 `.debug_info` 在 `0x9a:0xa4` 的十个字节，再用 `DwarfInfo(elf)` 看 `info.dies[0x9a].attributes`、`info.resolve(info.dies[0xae], DW_AT_NAME)` 和 `[signature(e) for e in info.subprograms()]`；对照缩写手工把那十个字节解析为参数 `before`（`int`，寄存器 RDI）。
3. **为候选评分并修复（实验 B）：** 运行 `score_candidate(load_candidate("f1_base_64"), Path("/tmp/re45"), run_programs=False)`，读 `bytes` 和 `citations` 的 `evidence`，理解报告把 `0x64` 误当成十进制 64（实为 100）；按指南所述修改 `.c` 和引用后重评。
4. **观察不可信字符串（实验 C）：** 确认 `POISONED_OBJECT` 的 `.text` 与 `TARGET_OBJECT` 相同、`strings()[0]` 就是那条喊话注记，而 `field_names(load_candidate("f1_mul_first"), target=POISONED_OBJECT)["status"]` 仍从 DWARF 取名、不受字符串影响。
5. **驱动 MCP 服务器（实验 D）：** 运行 `python3 main.py mcp-serve`，逐行粘贴 `initialize`、`read_strings`（观察 `_meta.provenance.untrusted_content`）和 `score_candidate`（`run_programs:false` 时 `grid`、`fuzz` 为 unknown、`citations` 为 fail）三个 JSON-RPC 请求，再发一个 `"object": "../ledger.c"` 的调用并读 `isError` 结果。
6. **核对六字段的判定逻辑：** 对照记分卡表确认 `f1_safe_div`（代码对、报告臆造被调用者，因 citations 而 fail）与 `f1_wide_long`（名称 partial、网格和模糊因溢出而 fail）两行，理解 aggregate 的失败即封闭顺序。

## 运行与验证

在工作区目录执行：

```bash
python3 main.py
python3 -m unittest discover -s tests
```

fixture（三个 ledger 目标、调试构建 `ledger-x86_64-O1-g.o`、被投毒目标、八个候选、捕获的 `llvm-objdump`/`llvm-dwarfdump` 文本和记录下来的运行）由上游预先编译并提交。`main.py` 读取它们、不调用任何模型。若主机没有 C 编译器（clang），演示会把 `grid`、`fuzz` 字段和每个判定置为 `unknown`，测试套件中依赖编译的用例会 skip，这都属于正常情况。

在工作区中运行测试时有两项与上游目录不同：检查站点图示模块 `site/figures-re-45.js` 的测试会显示 skipped；`test_three_fixture_objects_share_the_text_bytes_of_the_lesson_36_object` 会失败，因为它按上游目录结构读取第 36 课的 fixture，而工作区不包含相邻课程。这一项失败与你的修改无关。如需运行完整套件，在 Learning Atlas 仓库根目录执行：

```bash
cd ai-engineering-from-scratch/phases/13-tools-and-protocols/45-ai-assisted-reverse-engineering/code && python3 -m unittest discover -s tests
```
