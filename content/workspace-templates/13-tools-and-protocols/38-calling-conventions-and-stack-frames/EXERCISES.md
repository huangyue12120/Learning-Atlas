# 调用约定与栈帧：System V、Windows x64 与 AArch64：练习指南

- 课程路径：`phases/13-tools-and-protocols/38-calling-conventions-and-stack-frames`
- 可运行 Python 文件：`main.py`

## 练习目标

读懂同一个 C 文件在三种 ABI（System V psABI、Microsoft x64、AAPCS64）下的栈帧：从目标文件头部选定规则手册，逐字节解码序言，把每个被保存寄存器、参数寄存器和栈参数放到相对入口栈指针的偏移处，并把每条推断对照规范规则与编译器的 `.pdata`/`.xdata`/`.eh_frame` 栈回溯数据加以验证。

## 建议步骤

1. **读头部，选规则手册：** 运行 `python3 main.py object fixtures/convention-x86_64-windows-O2.o`，确认它从 COFF 的 `Machine=0x8664` 判定出 `Microsoft x64`；再对 `convention-x86_64-linux-O2.o`（System V）和 `convention-aarch64-linux-O2.o`（AAPCS64）各做一次，核对头部与 ABI 的对应关系。
2. **一条指令，三种效果（实验 A）：** 进入 `python3 -q`，对 `leaq (%rdx,%rcx), %rax`、`cvtsi2sd %edi, %xmm2`、`stp x29, x30, [sp, #-0x30]!` 调用 `effect(...)`，确认 `lea` 只做地址读取、`cvtsi2sd` 目的操作数只是写入、前变址 `stp` 在存储前移动 `sp`。
3. **解码 keeps 的帧（实验 B）：** 用 `load_fixture("convention-aarch64-linux-O2")` 加载后 `analyze_function("keeps", ...)`，比对 `keeps.saved`、`keeps.frame_pointer` 和 `frame_cells(keeps)` 与课文中逐字节手工解码的帧（记录在 -48，`x29/x30/x21/x20/x19` 的偏移）。再加载 `convention-arm64-macos-O2` 看记录移到 -16。
4. **写前先读（实验 C）：** 对 `convention-x86_64-linux-O2` 的 `mixed` 读取 `param_registers` 与 `expected_locations(SYSV, "mixed")`，确认 System V 列表是 `rdi, xmm0, rsi, xmm1`、Microsoft 列表是 `rcx, xmm1, r8, xmm3`；再打开 radare2 捕获找出被误报为第三个 double 的指令。
5. **栈回溯器的第二意见（实验 D）：** 运行 `seh_cross_check()` 与 `eh_frame_cross_check("convention-x86_64-linux-O2-eh")`，解释 `sum_varargs` 的 `pushq %rax` 为何被记录为一次分配，以及 `call8` 的最深 CFA 偏移 32 的来源。
6. **实践实验（可选，扩展）：** 添加 `-fstack-protector-strong` 构建，扩展序言扫描把 `%fs:0x28` 的金丝雀加载记录为 `canary` 单元，并添加一个在金丝雀存储被误计为溢出参数时失败的测试。

## 运行与验证

在工作区目录执行：

```bash
python3 main.py
python3 -m unittest discover -s tests
```

`python3 main.py` 会输出七个目标文件、十二个函数的分析报告，并在结尾汇报 489 项检查全部一致。

测试夹具（`.o`、`.objdump.txt`、`.symbols.txt` 以及 `tools/` 下的 radare2、rizin、angr 捕获）均由上游预先编译并提交，不需要安装 clang。`tools/` 中的工具输出是预先捕获的文本，分析器只读取它们，因此本地没有安装 Ghidra、radare2、rizin、angr 也能完成全部练习。

在工作区中运行测试时，检查站点图示模块 `site/figures-re-38.js` 的那一项测试会显示 skipped，因为工作区不包含上游网站文件；其余测试应全部通过。如需连这一项一起运行，在 Learning Atlas 仓库根目录执行：

```bash
cd ai-engineering-from-scratch/phases/13-tools-and-protocols/38-calling-conventions-and-stack-frames/code && python3 -m unittest discover -s tests
```
