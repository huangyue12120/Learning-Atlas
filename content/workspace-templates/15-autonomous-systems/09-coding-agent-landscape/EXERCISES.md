# 自主编程智能体全景：练习指南

- 课程路径：phases/15-autonomous-systems/09-coding-agent-landscape
- 可运行 Python 文件：main.py

## 练习目标

在同一个任务集上比较 JSON 工具调用与 CodeAct，量化轮次、通过数和单动作爆炸半径。

## 动手练习

1. 运行 main.py，记录每个脚手架的 turns、passed 和 blast radius。
2. 解释 CodeAct 在复杂任务上减少轮次的原因，以及它需要更强沙箱的原因。
3. 为一个跨两文件的 bug 估算两种脚手架的端到端成功率。
4. 设计一个排除单文件短任务的 SWE-bench 评分，并预测榜单如何变化。
5. 列出 CodeAct 进程需要的用户、目录、网络和资源配额。

## 运行与验证

运行：python3 code/main.py

确认比较使用同一 stub model 和同一任务集；把性能与安全取舍分开记录。
