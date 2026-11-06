# 毕业课程 29：基于 harness 的端到端编码智能体：Python 练习指南

- 课程路径：`phases/19-capstone-projects/29-end-to-end-coding-task-demo`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

串联读写工具、验证门、沙箱、测试与 trace。

## 运行与验证

Python 标准库即可。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 确认 solved 为真、预算内完成，并将每个步骤对应到 span 和 scratch repo 的变更。
2. 缩小预算或让补丁保持错误，确认测试失败不会被宣布 solved；保留 code/fixture_repo 作为只读种子。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

演示只改临时副本，报告与实际测试结果一致，不写入上游源。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
