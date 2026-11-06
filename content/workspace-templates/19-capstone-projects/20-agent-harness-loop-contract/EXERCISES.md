# 智能体 Harness 循环契约：Python 练习指南

- 课程路径：`phases/19-capstone-projects/20-agent-harness-loop-contract`
- 运行位置：本课私人工作区根目录；保留 `code/`、测试和数据子目录。

## 练习目标

验证 harness 状态机、钩子和停止契约。

## 运行与验证

Python 标准库即可。

```bash
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

## 动手练习

1. 检查 JSON 报告中的状态、事件顺序、拉取点与预算，找出一次完整状态转移。
2. 在既有测试中增加一个 hook abort 或预算耗尽的情况，确认终态明确且不再执行后续工具。
3. 把改动、运行命令、关键输出与解释记录在私人工作区，保留一组可复现的默认/修改后对照。

## 完成判据

成功、失败与预算停止有独立证据，事件次序与契约一致。

输出写入本课工作区或程序创建的临时目录；不要在只读上游源目录中执行实验。重新准备工作区只补齐缺失文件，不覆盖你的改动。
