# 智能体状态机——图、节点与检查点：练习指南

- 课程路径：`phases/11-llm-engineering/16-langgraph-state-machines`
- 可运行 Python 文件：`main.py`

## 练习目标

理解本课核心概念，并能独立运行、修改和验证对应的 Python 实作。

## 建议步骤

1. **简单。** 用上面的四节点 ReAct 图实现一个计算器工具和一个网页搜索工具。验证两轮对话至少产生四个检查点：`list(app.get_state_history(config))` 应返回至少四项。
2. **中等。** 在 `agent` 之前增加一个 `planner` 节点，把结构化的 `plan: list[str]` 写入状态。让 `agent` 标记已完成的计划步骤。如果 checkpoint 恢复后 `plan` 丢失（归约器错误），测试必须失败。
3. **困难。** 构建一个 supervisor 图，使用 `Send` 在三个子图（`researcher`、`writer`、`reviewer`）之间路由。每个子图都有自己的状态和检查点器。在外层图增加 `interrupt_before=["writer"]`，让人类可以审批研究简报。确认从之前检查点进行时间旅行时只会重新运行分叉出的分支。

## 运行与验证

在课程目录下执行：

```bash
python3 main.py
```

逐个确认命令正常退出，并检查输出是否符合练习中的预期；若代码依赖额外包，按上游课程说明先完成环境安装。
