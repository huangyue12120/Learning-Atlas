# 长时间后台智能体：持久执行：练习指南

- 课程路径：phases/15-autonomous-systems/12-durable-execution
- 可运行 Python 文件：main.py

## 练习目标

用事件日志、活动缓存和稳定 thread_id 模拟崩溃恢复，验证已完成副作用不会因回放而重复。

## 动手练习

1. 运行 main.py，比较 naive retry 与 durable retry 的 activity starts。
2. 把工作流改为显式使用 thread_id，模拟两个会话并确认日志不碰撞。
3. 在工作流决策中加入时间戳，观察非确定性如何导致回放分歧。
4. 为一个 6 小时编程任务写出检查点频率、恢复动作和新 HITL 条件。
5. 指出一个持久执行反而会增加复杂度的短任务，并说明原因。

## 运行与验证

运行：python3 code/main.py

确认 durable retry 的回放命中已缓存结果，并记录崩溃点改变后的差异。
