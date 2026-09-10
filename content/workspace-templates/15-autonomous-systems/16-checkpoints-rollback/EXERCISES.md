# 检查点与回滚：练习指南

- 课程路径：phases/15-autonomous-systems/16-checkpoints-rollback
- 可运行 Python 文件：main.py

## 练习目标

把每次状态转换持久化，并用幂等性、前置条件、验证与回滚覆盖崩溃和部分失败。

## 动手练习

1. 运行 main.py，确认 clean、commit-crash、precondition-fail 和 verify-fail 四种场景。
2. 把状态写入移到外部动作之后，测量崩溃重试产生的重复动作。
3. 为发送 Slack 消息设计 in-band、compensating 或 out-of-band 回滚之一。
4. 列出一个熟悉工作流的所有状态转换，标出哪些当前没有持久化。
5. 写一个真实端到端测试：运行、注入崩溃、恢复，并断言回滚只发生一次。

## 运行与验证

运行：python3 code/main.py

确认 commit-crash 重试只有一个副作用，verify-fail 能恢复余额或其他可观测状态。
