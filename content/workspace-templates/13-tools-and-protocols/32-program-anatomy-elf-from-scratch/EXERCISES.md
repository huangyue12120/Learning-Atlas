# 程序剖析：从零实现一个 ELF 读取器：练习指南

- 课程路径：`phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch`
- 可运行 Python 文件：`main.py`；评分实验 `lab.py`，答案写入 `lab_answers.json`

## 练习目标

用标准库 `struct.unpack` 从零读出 `ledger.c` 编译产物的 ELF 头、节头、符号、重定位和程序头，并把每个文件偏移映射到拥有它的结构；再在 Mach-O 的 `ledger-arm64-O1.o` 上指出每条加载命令对应的 ELF 概念。所有结果都要能对照抓取到的 `llvm-objdump` 文本逐字段核对。

## 建议步骤

1. **跑通演示：** 运行 `python3 main.py`，确认输出中出现 `percent_change: 16 bytes at file offset 0x40: ...`，并以 `entry 0x4000b0 is file offset 0xb0 through PT_LOAD` 结尾。再用 `python3 main.py fixtures/ledger-x86_64-O0.o` 读取单个文件。
2. **手工读头（实验 A）：** 在 `python3 -q` 中 `from main import ElfFile, FIXTURES`，对 `ledger-x86_64-O1.o` 执行 `struct.unpack_from("<HHIQQQIHHHHHH", data, 16)`，核对 `e_type` 为 1、`e_machine` 为 62、`e_shoff` 为 1064（即 `0x428`），并确认 `elf.sections[elf.header.e_shstrndx].name` 是 `.strtab`。
3. **读出 switch 背后的值表（实验 B）：** 用 `elf.section_bytes` 读 `.rodata`，把 `0x14` 到 `0x28` 的 32 位值和 `0x28` 到 `0x50` 的 64 位值列出来，两张表都应是 `1, 2, 3, 4, 4`；再用 `elf.relocations_for(".text")` 过滤出引用 `.rodata` 的重定位。
4. **对比三种构建（实验 C）：** 对 `O0`、`O1`、`O2` 三个目标文件分别打印是否存在 `.data`、重定位类型集合，以及各 `FUNC` 符号的 `st_size`，确认 `total` 依次为 66、31、140 字节。
5. **读 Mach-O 同一函数（实验 D）：** 用 `MachOFile.from_path` 打开 `ledger-arm64-O1.o`，调用 `function_span("_percent_change")` 得到文件偏移 648 处 24 字节，并确认 `function_bytes("_percent_change")[:4].hex()` 为 `a0000034`。
6. **填写评分实验：** 用 `main.py` 的接口求出 `t1`–`t5`（`e_shoff`、`percent_change` 的 `st_size`、`.text` 文件偏移、-O0 的重定位类型名列表、`.rodata+0x14` 处五个 int），写入 `lab_answers.json`，运行 `python3 lab.py` 直到五项全 `PASS`。

## 运行与验证

在工作区目录执行：

```bash
python3 main.py
python3 -m unittest discover -s tests
```

填写 `lab_answers.json` 后运行 `python3 lab.py`，五项全部 PASS 时退出码为 0。

夹具（`ledger-*.o`、`tiny-x86_64`、各 `*.objdump.txt`）由上游预先编译并提交，不需要安装 clang 或 llvm-objdump；测试只读取这些已提交字节。

在工作区中运行测试时，检查站点图示模块 `site/figures-re-32.js` 的那一项测试会显示 skipped，因为工作区不包含上游网站文件；其余测试应全部通过。如需连这一项一起运行，在 Learning Atlas 仓库根目录执行：

```bash
cd ai-engineering-from-scratch/phases/13-tools-and-protocols/32-program-anatomy-elf-from-scratch/code && python3 -m unittest discover -s tests
```
