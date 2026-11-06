# 毕业课程 26：带拒绝列表和路径禁区的沙箱运行器：Python 练习指南

- 课程路径：`phases/19-capstone-projects/26-sandbox-runner-denylist`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

检查命令拒绝、路径禁区、超时与输出截断。

## 运行与验证

Python 标准库即可。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 记录 legal calls、denied by name/interpreter/shell/path 与 timeout/truncation 的判定。
2. 在临时目录创建指向根目录外的符号链接，验证被拒绝；在隔离测试中检查输出上限和超时后的返回状态。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

拒绝案例具有具体原因；denylist 与路径参数检查不是恶意程序的完整隔离边界，应另用操作系统沙箱。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
