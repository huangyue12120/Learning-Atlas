# 紧急停止开关、熔断器与金丝雀 token：练习指南

- 课程路径：phases/15-autonomous-systems/14-kill-switches-canaries
- 可运行 Python 文件：main.py

## 练习目标

区分外部 kill switch、重复调用 circuit breaker 和凭据金丝雀的检测范围，并设计可审计的恢复流程。

## 动手练习

1. 运行 main.py，确认第 5 轮熔断器和第 9 轮 canary 触发。
2. 加入 EWMA 工具调用率检测，再用硬上限比较慢速漂移轨迹。
3. 为浏览器智能体列出至少三个金丝雀及其对应告警。
4. 描述 eBPF egress 重定向到隔离区的策略选择、改写和告警。
5. 写出 re-enable 条件：授权人、证据、修复和再次演练分别是什么。

## 运行与验证

运行：python3 code/main.py

确认三类 detector 的触发原因不同，且 kill switch 位于智能体外部。
