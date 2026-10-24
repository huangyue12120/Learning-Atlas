# 链接、加载与去除符号的二进制文件：练习指南

- 课程路径：`phases/13-tools-and-protocols/40-linking-loading-and-stripped-binaries`
- 可运行 Python 文件：`main.py`

## 练习目标

把你自己构建的一个程序，在三种目标格式（ELF、COFF/PE、Mach-O）中沿一次外部调用追踪到加载器所填充的槽，并在去除符号的构建上用 `LC_FUNCTION_STARTS`、序言扫描、调用目标和 FLIRT 形状的签名恢复函数起点和名字，再用未去除符号的孪生文件为每种方法打分。

## 建议步骤

1. **先读整份报告（实验前准备）：** 在 `code` 目录运行 `python3 main.py`，浏览 `elf`、`coff`、`pe`、`macho`、`identification` 五个部分，确认 `linkPlan` 找到 `puts` 和 `printf` 两个 PLT 符号、四次直接调用，以及 `.plt`/`.got.plt`/`.rela.plt`/`.rela.dyn` 各为 48/40/48/48 字节。
2. **手工看 PLT（实验 A）：** 用 `load_elf("tiny-dyn-x86_64")` 读取 `dynamic_entries()`、`plt0()`、`plt_entries()` 和 `got_plt_words()`。在查看结果之前，先从课文中的字节算出每个槽地址（`0x1f6 + 0xed2 = 0x10c8` 等），确认 `puts` 槽初值是它自己那条 `pushq` 的地址 `0x206`。
3. **解码一条链式修正项（实验 B）：** 用 `load_macho("ledger_main")` 取出 `_puts` 的桩，读取 `0x100004038` 处的原始 64 位字，在纸上拆出绑定位、以四字节为单位的 `next` 字段和序号，确认该字在加载时会被绑定为 `libSystem/_puts`。
4. **strip 与重新链接（实验 C）：** 在 `fixtures` 目录把一个全新的 `main.c` 链接到 `libledger.stripped`（其 `LC_SYMTAB` 为空），确认链接仍然成功——因为链接编辑器读取导出 trie；再运行 `python3 ../main.py macho libledger.stripped.dylib` 比较 `symtab`、`exports` 和 `functionStarts`。
5. **分析那次碰撞（实验 D）：** 用 `signatures_from_object(load_macho("ledger-arm64-O2.o"))` 构建签名并用 `match_signatures` 匹配，读两条碰撞记录，理解 `grade` 和 `grade_label` 为何共享前 36 字节，而字节 44（`0x20` 对 `0x28`）和长度（60 对 72）如何把它们分开。
6. **做实践实验：** 解码 `ledger_main_nochain` 的 `LC_DYLD_INFO_ONLY` 操作码流，使之等于 `dyld_info -fixups` 的 21 行；给微型 ELF 添加 `PT_GNU_RELRO`；再为 PE32+ 写一个 `.pdata` 读取器与基于 `RUNTIME_FUNCTION` 起始地址的函数查找器，并为每个读取器补一个与捕获工具文本比对的测试。

## 运行与验证

在工作区目录执行：

```bash
python3 main.py
python3 -m unittest discover -s tests
```

`main.py` 会打印一份完整的 JSON 报告，可据此核对链接计划、PLT/GOT、PE 目录、Mach-O 修正项和函数识别结果。

fixture（微型 ELF、PE 映像、arm64 可执行文件、dylib 及其去除符号的副本、各工具捕获文本）都由上游预先构建并提交，运行时不需要安装 `clang`、`ld` 或任何链接编辑器——只有实验 C 的重新链接步骤需要本机的 `clang` 和 macOS 工具链，在其他平台上可以跳过。

在工作区中运行测试时，检查站点图示模块 `site/figures-re-40.js` 的那一项测试会显示 skipped，因为工作区不包含上游网站文件；其余测试应全部通过。如需连这一项一起运行，在 Learning Atlas 仓库根目录执行：

```bash
cd ai-engineering-from-scratch/phases/13-tools-and-protocols/40-linking-loading-and-stripped-binaries/code && python3 -m unittest discover -s tests
```
