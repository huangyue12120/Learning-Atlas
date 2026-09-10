# 主管 / 编排器—工作者模式：练习指南

- 课程路径：`phases/16-multi-agent-and-swarms/05-supervisor-orchestrator-pattern`
- 可运行 Python 文件：`main.py`

## 练习目标

观察主管如何拆分研究任务、并行调度工作者并汇总结果，同时量化新上下文带来的成本。

## 动手练习

1. 运行 `main.py`，记录每个 worker 的查询、摘要、token 和耗时。
2. 增加一个失败的检索结果，要求主管标记失败并决定重试或降级。
3. 把 worker 数量从 3 改为 2 和 5，比较并行收益与汇总负担。
4. 为结果加入来源 URL 和不确定性字段，防止主管只看到无证据的摘要。
5. 设计一个总 token 或总时长预算，并说明预算耗尽时的停止行为。

## 运行与验证

```bash
python3 code/main.py
```

确认程序退出码为 0，输出同时包含 worker 结果和 lead synthesis；将一次失败或预算控制实验写入记录。
